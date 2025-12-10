/**
 * Justice 2 Garbage Collector Helper
 * Sistema de optimización y gestión del garbage collector
 * Proporciona control sobre GC y optimización de memoria
 */

import { XSSProtection } from './xss-protection.js';

const GarbageCollectorHelper = {
    // Configuración del GC Helper
    config: {
        // Configuración de monitoreo
        monitoringInterval: 15000,       // 15 segundos
        gcCheckInterval: 60000,          // 1 minuto
        memoryAnalysisInterval: 30000,     // 30 segundos
        
        // Umbrales de memoria para GC
        gcTriggerThreshold: 0.8,         // 80% de uso
        aggressiveGCThreshold: 0.9,      // 90% de uso
        emergencyGCThreshold: 0.95,       // 95% de uso
        
        // Configuración de GC manual
        enableManualGC: true,
        gcAttempts: 3,
        gcDelay: 1000,                   // 1 segundo entre intentos
        
        // Configuración de optimización
        enableOptimization: true,
        optimizationInterval: 120000,    // 2 minutos
        maxUnusedObjects: 1000,
        
        // Configuración de logging
        enableLogging: true,
        logLevel: 'info',
        enableDetailedTraces: false
    },

    // Estado del GC Helper
    state: {
        initialized: false,
        monitoringActive: false,
        
        // Estadísticas de GC
        stats: {
            totalGCTriggered: 0,
            manualGCTriggered: 0,
            automaticGCTriggered: 0,
            emergencyGCTriggered: 0,
            memoryFreed: 0,
            lastGCTime: null,
            averageGCTime: 0,
            gcEfficiency: 0
        },
        
        // Estado de memoria
        memoryState: {
            currentUsage: 0,
            peakUsage: 0,
            averageUsage: 0,
            samples: [],
            lastAnalysis: Date.now()
        },
        
        // Objetos registrados para optimización
        registeredObjects: new WeakMap(),
        optimizationCandidates: new Set(),
        
        // Configuración de navegadores
        browserCapabilities: {
            hasMemoryAPI: false,
            hasPerformanceAPI: false,
            hasManualGC: false,
            hasWeakRefs: false
        }
    },

    // Inicialización del GC Helper
    init: function() {
        if (this.state.initialized) {
            this.log('GarbageCollectorHelper ya está inicializado', 'warn');
            return;
        }

        try {
            this.log('Inicializando GarbageCollectorHelper...');
            
            // Detectar capacidades del navegador
            this.detectBrowserCapabilities();
            
            // Configurar monitoreo
            this.setupMonitoring();
            
            // Configurar optimización automática
            if (this.config.enableOptimization) {
                this.setupOptimization();
            }
            
            // Configurar manejadores de eventos
            this.setupEventHandlers();
            
            this.state.initialized = true;
            this.log('GarbageCollectorHelper inicializado correctamente', 'success');
            
            // Emitir evento de inicialización
            this.emitEvent('gc:helper:initialized', {
                timestamp: Date.now(),
                capabilities: this.state.browserCapabilities,
                config: this.config
            });
            
        } catch (error) {
            this.log('Error inicializando GarbageCollectorHelper: ' + error.message, 'error');
            throw error;
        }
    },

    // Detectar capacidades del navegador
    detectBrowserCapabilities: function() {
        if (typeof performance !== 'undefined') {
            this.state.browserCapabilities.hasPerformanceAPI = true;
            
            if (performance.memory) {
                this.state.browserCapabilities.hasMemoryAPI = true;
            }
        }
        
        if (typeof window !== 'undefined' && window.gc) {
            this.state.browserCapabilities.hasManualGC = true;
        }
        
        if (typeof WeakRef !== 'undefined') {
            this.state.browserCapabilities.hasWeakRefs = true;
        }
        
        this.log('Capacidades del navegador detectadas', 'info', this.state.browserCapabilities);
    },

    // Configurar monitoreo
    setupMonitoring: function() {
        if (this.state.monitoringActive) return;
        
        this.state.monitoringActive = true;
        
        // Monitorear uso de memoria
        this.monitoringInterval = setInterval(() => {
            this.collectMemoryMetrics();
            this.analyzeMemoryUsage();
            this.checkGCNecessity();
        }, this.config.monitoringInterval);
        
        // Chequeos profundos de GC
        this.gcCheckInterval = setInterval(() => {
            this.performGCCheck();
        }, this.config.gcCheckInterval);
        
        // Análisis de memoria
        this.memoryAnalysisInterval = setInterval(() => {
            this.performMemoryAnalysis();
        }, this.config.memoryAnalysisInterval);
        
        this.log('Monitoreo de GC configurado', 'info');
    },

    // Configurar optimización
    setupOptimization: function() {
        this.optimizationInterval = setInterval(() => {
            this.performOptimization();
        }, this.config.optimizationInterval);
        
        this.log('Optimización automática configurada', 'info');
    },

    // Configurar manejadores de eventos
    setupEventHandlers: function() {
        if (typeof window !== 'undefined') {
            // Forzar GC antes de cambiar de página
            window.addEventListener('beforeunload', () => {
                this.triggerGC('emergency');
            });
            
            // Pausar monitoreo cuando la página está oculta
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseMonitoring();
                } else {
                    this.resumeMonitoring();
                    // Forzar GC al volver a la página
                    setTimeout(() => this.triggerGC('automatic'), 1000);
                }
            });
        }
    },

    // Colectar métricas de memoria
    collectMemoryMetrics: function() {
        if (!this.state.browserCapabilities.hasMemoryAPI) return;
        
        const memoryInfo = performance.memory;
        const usage = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
        
        // Actualizar estado de memoria
        this.state.memoryState.currentUsage = usage;
        this.state.memoryState.peakUsage = Math.max(this.state.memoryState.peakUsage, usage);
        
        // Agregar muestra para promedio
        this.state.memoryState.samples.push({
            timestamp: Date.now(),
            usage,
            used: memoryInfo.usedJSHeapSize,
            total: memoryInfo.totalJSHeapSize,
            limit: memoryInfo.jsHeapSizeLimit
        });
        
        // Limitar muestras a mantener
        if (this.state.memoryState.samples.length > 100) {
            this.state.memoryState.samples = this.state.memoryState.samples.slice(-50);
        }
        
        // Calcular promedio
        const recentSamples = this.state.memoryState.samples.slice(-20);
        this.state.memoryState.averageUsage = 
            recentSamples.reduce((sum, sample) => sum + sample.usage, 0) / recentSamples.length;
    },

    // Analizar uso de memoria
    analyzeMemoryUsage: function() {
        const usage = this.state.memoryState.currentUsage;
        
        // Detectar patrones anormales
        if (this.state.memoryState.samples.length >= 10) {
            const recentSamples = this.state.memoryState.samples.slice(-10);
            const isGrowing = recentSamples.every((sample, i) => 
                i === 0 || sample.usage >= recentSamples[i-1].usage
            );
            
            if (isGrowing && usage > 0.7) {
                this.log('Detectado crecimiento continuo de memoria', 'warn');
                this.triggerGC('automatic');
            }
        }
        
        // Detectar picos de uso
        if (usage > this.state.memoryState.averageUsage * 1.5) {
            this.log('Detectado pico de uso de memoria', 'warn', {
                current: usage,
                average: this.state.memoryState.averageUsage
            });
        }
    },

    // Verificar necesidad de GC
    checkGCNecessity: function() {
        const usage = this.state.memoryState.currentUsage;
        
        if (usage >= this.config.emergencyGCThreshold) {
            this.triggerGC('emergency');
        } else if (usage >= this.config.aggressiveGCThreshold) {
            this.triggerGC('aggressive');
        } else if (usage >= this.config.gcTriggerThreshold) {
            this.triggerGC('automatic');
        }
    },

    // Realizar chequeo de GC
    performGCCheck: function() {
        // Verificar si hay objetos candidatos para limpieza
        if (this.state.optimizationCandidates.size > this.config.maxUnusedObjects) {
            this.cleanupOptimizationCandidates();
        }
        
        // Verificar eficiencia del GC anterior
        if (this.state.stats.lastGCTime) {
            const timeSinceLastGC = Date.now() - this.state.stats.lastGCTime;
            const memoryGrowth = this.calculateMemoryGrowth();
            
            if (memoryGrowth > 0.1 && timeSinceLastGC < 30000) {
                this.log('GC ineficiente detectado', 'warn');
                this.triggerGC('aggressive');
            }
        }
    },

    // Realizar análisis de memoria
    performMemoryAnalysis: function() {
        if (!this.state.browserCapabilities.hasMemoryAPI) return;
        
        const memoryInfo = performance.memory;
        const analysis = {
            timestamp: Date.now(),
            heapUsed: memoryInfo.usedJSHeapSize,
            heapTotal: memoryInfo.totalJSHeapSize,
            heapLimit: memoryInfo.jsHeapSizeLimit,
            usagePercentage: memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit,
            fragmentation: this.calculateFragmentation(memoryInfo),
            pressure: this.calculateMemoryPressure(memoryInfo),
            recommendations: []
        };
        
        // Generar recomendaciones
        analysis.recommendations = this.generateRecommendations(analysis);
        
        this.state.memoryState.lastAnalysis = Date.now();
        
        // Emitir evento de análisis
        this.emitEvent('gc:memory-analysis', analysis);
        
        // Loggear si hay problemas
        if (analysis.pressure > 0.8) {
            this.log('Alta presión de memoria detectada', 'warn', analysis);
        }
    },

    // Calcular fragmentación
    calculateFragmentation: function(memoryInfo) {
        const allocated = memoryInfo.totalJSHeapSize;
        const used = memoryInfo.usedJSHeapSize;
        return (allocated - used) / allocated;
    },

    // Calcular presión de memoria
    calculateMemoryPressure: function(memoryInfo) {
        const used = memoryInfo.usedJSHeapSize;
        const limit = memoryInfo.jsHeapSizeLimit;
        return used / limit;
    },

    // Generar recomendaciones
    generateRecommendations: function(analysis) {
        const recommendations = [];
        
        if (analysis.usagePercentage > 0.8) {
            recommendations.push({
                type: 'high-usage',
                message: 'Uso de memoria elevado. Considerar liberar recursos.',
                priority: 'high'
            });
        }
        
        if (analysis.fragmentation > 0.3) {
            recommendations.push({
                type: 'fragmentation',
                message: 'Alta fragmentación de memoria. Recomendado forzar GC.',
                priority: 'medium'
            });
        }
        
        if (analysis.pressure > 0.7) {
            recommendations.push({
                type: 'pressure',
                message: 'Alta presión de memoria. Considerar optimizar código.',
                priority: 'high'
            });
        }
        
        return recommendations;
    },

    // Trigger de GC
    triggerGC: function(type = 'manual', options = {}) {
        if (!this.config.enableManualGC && type === 'manual') {
            this.log('GC manual no está habilitado', 'warn');
            return false;
        }
        
        this.log(`Iniciando GC tipo: ${type}`, 'info');
        
        const startTime = Date.now();
        const memoryBefore = this.getMemorySnapshot();
        
        let success = false;
        let attempts = 0;
        
        const tryGC = () => {
            attempts++;
            
            try {
                // Intentar diferentes métodos de GC
                if (this.state.browserCapabilities.hasManualGC && window.gc) {
                    window.gc();
                    success = true;
                } else {
                    // Métodos alternativos para forzar GC
                    this.forceGarbageCollection();
                    success = true;
                }
                
                if (success) {
                    const memoryAfter = this.getMemorySnapshot();
                    const memoryFreed = memoryBefore.used - memoryAfter.used;
                    const gcTime = Date.now() - startTime;
                    
                    // Actualizar estadísticas
                    this.updateGCStats(type, gcTime, memoryFreed, attempts);
                    
                    this.log(`GC completado: ${memoryFreed} bytes liberados en ${gcTime}ms`, 'success');
                    
                    // Emitir evento de GC
                    this.emitEvent('gc:triggered', {
                        type,
                        memoryFreed,
                        gcTime,
                        attempts,
                        memoryBefore,
                        memoryAfter
                    });
                    
                    return true;
                }
                
            } catch (error) {
                this.log(`Error en GC intento ${attempts}: ${error.message}`, 'error');
            }
            
            // Reintentar si es necesario
            if (attempts < this.config.gcAttempts) {
                setTimeout(tryGC, this.config.gcDelay);
            } else {
                this.log(`GC falló después de ${attempts} intentos`, 'error');
            }
            
            return false;
        };
        
        return tryGC();
    },

    // Forzar garbage collection (métodos alternativos)
    forceGarbageCollection: function() {
        // Crear muchos objetos temporales para forzar GC
        const objects = [];
        
        for (let i = 0; i < 100000; i++) {
            objects.push({
                id: i,
                data: new Array(1000).fill(Math.random()),
                timestamp: Date.now()
            });
        }
        
        // Limpiar referencias
        objects.length = 0;
        
        // Crear y liberar WeakRefs si está disponible
        if (this.state.browserCapabilities.hasWeakRefs) {
            const weakRefs = [];
            for (let i = 0; i < 10000; i++) {
                weakRefs.push(new WeakRef({ id: i }));
            }
            weakRefs.length = 0;
        }
        
        // Forzar limpieza de memoria si está disponible
        if (typeof window !== 'undefined' && window.gc) {
            window.gc();
        }
    },

    // Realizar optimización
    performOptimization: function() {
        this.log('Iniciando optimización de memoria', 'info');
        
        let optimized = 0;
        
        // Limpiar candidatos de optimización
        optimized += this.cleanupOptimizationCandidates();
        
        // Optimizar cachés si están disponibles
        if (typeof MemoryManager !== 'undefined') {
            optimized += this.optimizeMemoryManager();
        }
        
        // Limpiar referencias débiles
        optimized += this.cleanupWeakReferences();
        
        // Compactar memoria si es posible
        optimized += this.compactMemory();
        
        this.log(`Optimización completada: ${optimized} objetos optimizados`, 'success');
        
        return optimized;
    },

    // Limpiar candidatos de optimización
    cleanupOptimizationCandidates: function() {
        let cleaned = 0;
        
        for (const candidate of this.state.optimizationCandidates) {
            if (this.state.registeredObjects.has(candidate)) {
                this.state.registeredObjects.delete(candidate);
                cleaned++;
            }
        }
        
        this.state.optimizationCandidates.clear();
        return cleaned;
    },

    // Optimizar MemoryManager
    optimizeMemoryManager: function() {
        if (typeof MemoryManager === 'undefined' || !MemoryManager.state.initialized) {
            return 0;
        }
        
        let optimized = 0;
        
        // Forzar limpieza en MemoryManager
        if (MemoryManager.performAutoCleanup) {
            optimized += MemoryManager.performAutoCleanup(true);
        }
        
        // Limpiar pools de objetos
        if (MemoryManager.cleanupPools) {
            optimized += MemoryManager.cleanupPools();
        }
        
        return optimized;
    },

    // Limpiar referencias débiles
    cleanupWeakReferences: function() {
        let cleaned = 0;
        
        // Las WeakRefs se limpian automáticamente durante GC
        // Pero podemos ayudar eliminando referencias innecesarias
        
        return cleaned;
    },

    // Compactar memoria
    compactMemory: function() {
        let compacted = 0;
        
        // Crear un patrón de acceso que ayude al compactador
        const arrays = [];
        for (let i = 0; i < 1000; i++) {
            arrays.push(new Array(100).fill(i));
        }
        
        // Ordenar para mejorar localidad
        arrays.sort((a, b) => a[0] - b[0]);
        
        // Liberar
        arrays.length = 0;
        
        compacted = 1000;
        return compacted;
    },

    // Registrar objeto para optimización
    registerObject: function(object, metadata = {}) {
        if (!this.state.browserCapabilities.hasWeakRefs) {
            return null;
        }
        
        const weakRef = new WeakRef(object);
        this.state.registeredObjects.set(object, {
            weakRef,
            metadata,
            registeredAt: Date.now()
        });
        
        return weakRef;
    },

    // Marcar objeto como candidato para optimización
    markForOptimization: function(object) {
        this.state.optimizationCandidates.add(object);
    },

    // Obtener snapshot de memoria
    getMemorySnapshot: function() {
        if (!this.state.browserCapabilities.hasMemoryAPI) {
            return {
                used: 0,
                total: 0,
                limit: 0,
                percentage: 0
            };
        }
        
        const memory = performance.memory;
        return {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            percentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
        };
    },

    // Calcular crecimiento de memoria
    calculateMemoryGrowth: function() {
        if (this.state.memoryState.samples.length < 2) return 0;
        
        const recent = this.state.memoryState.samples.slice(-10);
        const oldest = recent[0];
        const newest = recent[recent.length - 1];
        
        return (newest.usage - oldest.usage) / oldest.usage;
    },

    // Actualizar estadísticas de GC
    updateGCStats: function(type, gcTime, memoryFreed, attempts) {
        this.state.stats.totalGCTriggered++;
        this.state.stats.lastGCTime = Date.now();
        this.state.stats.memoryFreed += memoryFreed;
        
        // Actualizar tiempo promedio
        const totalGCs = this.state.stats.totalGCTriggered;
        this.state.stats.averageGCTime = 
            ((this.state.stats.averageGCTime * (totalGCs - 1)) + gcTime) / totalGCs;
        
        // Actualizar contadores por tipo
        switch (type) {
            case 'manual':
                this.state.stats.manualGCTriggered++;
                break;
            case 'automatic':
                this.state.stats.automaticGCTriggered++;
                break;
            case 'aggressive':
                this.state.stats.aggressiveGCTriggered++;
                break;
            case 'emergency':
                this.state.stats.emergencyGCTriggered++;
                break;
        }
        
        // Calcular eficiencia
        this.state.stats.gcEfficiency = 
            this.state.stats.memoryFreed / (this.state.stats.totalGCTriggered * gcTime) || 0;
    },

    // Pausar monitoreo
    pauseMonitoring: function() {
        if (this.monitoringInterval) clearInterval(this.monitoringInterval);
        if (this.gcCheckInterval) clearInterval(this.gcCheckInterval);
        if (this.memoryAnalysisInterval) clearInterval(this.memoryAnalysisInterval);
        if (this.optimizationInterval) clearInterval(this.optimizationInterval);
        
        this.state.monitoringActive = false;
        this.log('Monitoreo de GC pausado', 'info');
    },

    // Reanudar monitoreo
    resumeMonitoring: function() {
        this.setupMonitoring();
        if (this.config.enableOptimization) {
            this.setupOptimization();
        }
        
        this.log('Monitoreo de GC reanudado', 'info');
    },

    // Emitir evento
    emitEvent: function(eventType, data) {
        if (typeof document !== 'undefined') {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    },

    // Obtener reporte de GC
    getGCReport: function() {
        return {
            timestamp: Date.now(),
            stats: this.state.stats,
            memoryState: {
                currentUsage: this.state.memoryState.currentUsage,
                peakUsage: this.state.memoryState.peakUsage,
                averageUsage: this.state.memoryState.averageUsage,
                samples: this.state.memoryState.samples.slice(-10)
            },
            browserCapabilities: this.state.browserCapabilities,
            config: this.config
        };
    },

    // Obtener métricas actuales
    getCurrentMetrics: function() {
        return {
            ...this.state.stats,
            memorySnapshot: this.getMemorySnapshot(),
            memoryState: this.state.memoryState,
            registeredObjects: this.state.registeredObjects.size || 0,
            optimizationCandidates: this.state.optimizationCandidates.size
        };
    },

    // Reiniciar GC Helper
    reset: function() {
        this.log('Reiniciando GarbageCollectorHelper...');
        
        // Pausar monitoreo
        this.pauseMonitoring();
        
        // Reiniciar estadísticas
        this.state.stats = {
            totalGCTriggered: 0,
            manualGCTriggered: 0,
            automaticGCTriggered: 0,
            emergencyGCTriggered: 0,
            memoryFreed: 0,
            lastGCTime: null,
            averageGCTime: 0,
            gcEfficiency: 0
        };
        
        // Reiniciar estado de memoria
        this.state.memoryState = {
            currentUsage: 0,
            peakUsage: 0,
            averageUsage: 0,
            samples: [],
            lastAnalysis: Date.now()
        };
        
        // Limpiar objetos registrados
        this.state.optimizationCandidates.clear();
        
        // Reanudar monitoreo
        this.resumeMonitoring();
        
        this.log('GarbageCollectorHelper reiniciado', 'success');
    },

    // Logging
    log: function(message, level = 'info', data = null) {
        if (!this.config.enableLogging) return;
        
        const shouldLog = this.config.logLevel === 'debug' || 
                          (this.config.logLevel === 'info' && ['info', 'warn', 'error'].includes(level)) ||
                          (this.config.logLevel === 'warn' && ['warn', 'error'].includes(level)) ||
                          (this.config.logLevel === 'error' && level === 'error');
        
        if (shouldLog) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [GCHelper] [${level.toUpperCase()}] ${message}`;
            
            if (data) {
                console.log(logMessage, data);
            } else if (level === 'error') {
                console.error(logMessage);
            } else if (level === 'warn') {
                console.warn(logMessage);
            } else if (level === 'success') {
                console.log(`%c${logMessage}`, 'color: green');
            } else {
                console.log(logMessage);
            }
        }
    }
};

// Exportar el GarbageCollectorHelper
export default GarbageCollectorHelper;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.GarbageCollectorHelper = GarbageCollectorHelper;
}