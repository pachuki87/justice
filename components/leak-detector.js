/**
 * Justice 2 Leak Detector
 * Sistema especializado en detección de memory leaks
 * Identifica fugas específicas y proporciona soluciones
 */

import { XSSProtection } from './xss-protection.js';

const LeakDetector = {
    // Configuración del detector
    config: {
        // Configuración de detección
        detectionInterval: 10000,           // 10 segundos
        deepAnalysisInterval: 60000,        // 1 minuto
        maxSnapshots: 50,                    // Máximo snapshots a mantener
        
        // Configuración de umbrales
        memoryGrowthThreshold: 0.05,         // 5% de crecimiento
        resourceGrowthThreshold: 0.1,        // 10% de crecimiento
        domGrowthThreshold: 0.15,            // 15% de crecimiento
        performanceThreshold: 0.2,           // 20% de degradación
        
        // Configuración de análisis
        enableObjectTracking: true,
        enableReferenceAnalysis: true,
        enableDOMAnalysis: true,
        enableEventAnalysis: true,
        enableAsyncAnalysis: true,
        
        // Configuración de patrones
        enablePatternDetection: true,
        enableHeuristicAnalysis: true,
        enableStackTraceAnalysis: true,
        
        // Configuración de alertas
        enableAlerts: true,
        alertThreshold: 3,                   // 3 detecciones para alertar
        alertCooldown: 300000,               // 5 minutos cooldown
        
        // Configuración de logging
        enableLogging: true,
        logLevel: 'info',
        enableDetailedTraces: false
    },

    // Estado del detector
    state: {
        initialized: false,
        detectionActive: false,
        
        // Snapshots para análisis
        memorySnapshots: [],
        resourceSnapshots: [],
        domSnapshots: [],
        performanceSnapshots: [],
        
        // Detecciones activas
        activeLeaks: new Map(),
        leakHistory: [],
        
        // Análisis en curso
        currentAnalysis: null,
        analysisQueue: [],
        
        // Patrones detectados
        detectedPatterns: new Map(),
        patternHistory: [],
        
        // Estadísticas
        stats: {
            totalDetections: 0,
            totalLeaks: 0,
            totalPatterns: 0,
            totalAnalyses: 0,
            lastDetection: null,
            lastAnalysis: null,
            lastAlert: null
        },
        
        // Configuración de navegadores
        browserCapabilities: {
            hasMemoryAPI: false,
            hasPerformanceAPI: false,
            hasWeakRefs: false,
            hasFinalizationRegistry: false
        },
        
        // Estado de alertas
        alertState: {
            lastAlerts: new Map(),
            alertCounts: new Map(),
            cooldownActive: false
        }
    },

    // Patrones de memory leaks conocidos
    leakPatterns: {
        // Event listeners no removidos
        eventListenerLeaks: {
            name: 'Event Listener Leaks',
            description: 'Event listeners que no son removidos correctamente',
            detection: this.detectEventListenerLeaks.bind(this),
            severity: 'high',
            solution: 'Remover event listeners cuando los elementos son eliminados'
        },
        
        // DOM references persistentes
        domReferenceLeaks: {
            name: 'DOM Reference Leaks',
            description: 'Referencias a elementos DOM que persisten después de eliminación',
            detection: this.detectDOMReferenceLeaks.bind(this),
            severity: 'high',
            solution: 'Limpiar referencias DOM cuando los elementos son eliminados'
        },
        
        // Closures con referencias externas
        closureLeaks: {
            name: 'Closure Leaks',
            description: 'Closures que mantienen referencias a variables externas',
            detection: this.detectClosureLeaks.bind(this),
            severity: 'medium',
            solution: 'Evitar closures con referencias a objetos de larga vida'
        },
        
        // Timers no limpiados
        timerLeaks: {
            name: 'Timer Leaks',
            description: 'setTimeout/setInterval que nunca son cancelados',
            detection: this.detectTimerLeaks.bind(this),
            severity: 'medium',
            solution: 'Siempre cancelar timers cuando ya no son necesarios'
        },
        
        // Promises pendientes
        promiseLeaks: {
            name: 'Promise Leaks',
            description: 'Promises que nunca son resueltas o rechazadas',
            detection: this.detectPromiseLeaks.bind(this),
            severity: 'medium',
            solution: 'Manejar siempre la resolución o rechazo de promises'
        },
        
        // Cachés ilimitadas
        cacheLeaks: {
            name: 'Cache Leaks',
            description: 'Cachés que crecen indefinidamente sin límite',
            detection: this.detectCacheLeaks.bind(this),
            severity: 'medium',
            solution: 'Implementar límites de tamaño y políticas de evicción'
        },
        
        // Referencias circulares
        circularReferenceLeaks: {
            name: 'Circular Reference Leaks',
            description: 'Objetos con referencias circulares que impiden GC',
            detection: this.detectCircularReferenceLeaks.bind(this),
            severity: 'low',
            solution: 'Evitar referencias circulares o usar WeakMap/WeakSet'
        },
        
        // Observadores no desconectados
        observerLeaks: {
            name: 'Observer Leaks',
            description: 'Observers (MutationObserver, IntersectionObserver) no desconectados',
            detection: this.detectObserverLeaks.bind(this),
            severity: 'medium',
            solution: 'Siempre desconectar observers cuando ya no son necesarios'
        }
    },

    // Inicialización del LeakDetector
    init: function() {
        if (this.state.initialized) {
            this.log('LeakDetector ya está inicializado', 'warn');
            return;
        }

        try {
            this.log('Inicializando LeakDetector...');
            
            // Detectar capacidades del navegador
            this.detectBrowserCapabilities();
            
            // Configurar detección
            this.setupDetection();
            
            // Configurar análisis profundo
            this.setupDeepAnalysis();
            
            // Configurar manejadores de eventos
            this.setupEventHandlers();
            
            this.state.initialized = true;
            this.state.detectionActive = true;
            this.log('LeakDetector inicializado correctamente', 'success');
            
            // Emitir evento de inicialización
            this.emitEvent('leak:detector:initialized', {
                timestamp: Date.now(),
                capabilities: this.state.browserCapabilities,
                config: this.config
            });
            
        } catch (error) {
            this.log('Error inicializando LeakDetector: ' + error.message, 'error');
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
        
        if (typeof WeakRef !== 'undefined') {
            this.state.browserCapabilities.hasWeakRefs = true;
        }
        
        if (typeof FinalizationRegistry !== 'undefined') {
            this.state.browserCapabilities.hasFinalizationRegistry = true;
        }
        
        this.log('Capacidades del navegador detectadas', 'info', this.state.browserCapabilities);
    },

    // Configurar detección
    setupDetection: function() {
        // Detección periódica
        this.detectionInterval = setInterval(() => {
            this.performDetection();
        }, this.config.detectionInterval);
        
        this.log('Detección configurada', 'info');
    },

    // Configurar análisis profundo
    setupDeepAnalysis: function() {
        // Análisis profundo periódico
        this.deepAnalysisInterval = setInterval(() => {
            this.performDeepAnalysis();
        }, this.config.deepAnalysisInterval);
        
        this.log('Análisis profundo configurado', 'info');
    },

    // Configurar manejadores de eventos
    setupEventHandlers: function() {
        if (typeof window !== 'undefined') {
            // Pausar detección cuando la página está oculta
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseDetection();
                } else {
                    this.resumeDetection();
                }
            });
            
            // Capturar detección final al cambiar de página
            window.addEventListener('beforeunload', () => {
                this.performFinalDetection();
            });
        }
    },

    // Realizar detección
    performDetection: function() {
        this.log('Iniciando detección de memory leaks', 'debug');
        
        const detection = {
            timestamp: Date.now(),
            memorySnapshot: this.captureMemorySnapshot(),
            resourceSnapshot: this.captureResourceSnapshot(),
            domSnapshot: this.captureDOMSnapshot(),
            performanceSnapshot: this.capturePerformanceSnapshot(),
            detectedLeaks: [],
            patterns: []
        };
        
        // Ejecutar patrones de detección
        for (const [patternName, pattern] of Object.entries(this.leakPatterns)) {
            try {
                const result = pattern.detection();
                if (result && result.detected) {
                    detection.detectedLeaks.push({
                        pattern: patternName,
                        ...result
                    });
                    
                    // Procesar detección
                    this.processDetection(patternName, result);
                }
            } catch (error) {
                this.log(`Error en patrón ${patternName}: ${error.message}`, 'error');
            }
        }
        
        // Agregar a snapshots
        this.state.memorySnapshots.push(detection.memorySnapshot);
        this.state.resourceSnapshots.push(detection.resourceSnapshot);
        this.state.domSnapshots.push(detection.domSnapshot);
        this.state.performanceSnapshots.push(detection.performanceSnapshot);
        
        // Limitar snapshots
        this.limitSnapshots();
        
        // Actualizar estadísticas
        this.state.stats.totalDetections++;
        this.state.stats.lastDetection = detection.timestamp;
        
        // Emitir evento de detección
        this.emitEvent('leak:detection', detection);
        
        return detection;
    },

    // Realizar análisis profundo
    performDeepAnalysis: function() {
        this.log('Iniciando análisis profundo de memory leaks', 'debug');
        
        const analysis = {
            timestamp: Date.now(),
            memoryTrends: this.analyzeMemoryTrends(),
            resourceTrends: this.analyzeResourceTrends(),
            domTrends: this.analyzeDOMTrends(),
            performanceTrends: this.analyzePerformanceTrends(),
            patternAnalysis: this.analyzeDetectedPatterns(),
            leakAnalysis: this.analyzeActiveLeaks(),
            recommendations: this.generateLeakRecommendations()
        };
        
        // Agregar a cola de análisis
        this.state.analysisQueue.push(analysis);
        
        // Limitar cola de análisis
        if (this.state.analysisQueue.length > 20) {
            this.state.analysisQueue = this.state.analysisQueue.slice(-10);
        }
        
        // Actualizar estadísticas
        this.state.stats.totalAnalyses++;
        this.state.stats.lastAnalysis = analysis.timestamp;
        
        // Emitir evento de análisis
        this.emitEvent('leak:deep-analysis', analysis);
        
        return analysis;
    },

    // Capturar snapshot de memoria
    captureMemorySnapshot: function() {
        const snapshot = {
            timestamp: Date.now()
        };
        
        if (this.state.browserCapabilities.hasMemoryAPI) {
            const memory = performance.memory;
            snapshot.memory = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                percentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
            };
        }
        
        return snapshot;
    },

    // Capturar snapshot de recursos
    captureResourceSnapshot: function() {
        const snapshot = {
            timestamp: Date.now(),
            resources: {}
        };
        
        // Contar recursos desde ResourceTracker si está disponible
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            for (const [type, resourceMap] of Object.entries(ResourceTracker.state.resources)) {
                snapshot.resources[type] = resourceMap.size;
            }
        }
        
        // Contar otros recursos
        snapshot.resources.custom = this.countCustomResources();
        
        return snapshot;
    },

    // Capturar snapshot de DOM
    captureDOMSnapshot: function() {
        const snapshot = {
            timestamp: Date.now()
        };
        
        if (typeof document !== 'undefined') {
            snapshot.dom = {
                nodes: document.getElementsByTagName('*').length,
                elements: document.querySelectorAll('*').length,
                eventListeners: this.estimateDOMEventListeners(),
                memoryUsage: this.estimateDOMMemoryUsage()
            };
        }
        
        return snapshot;
    },

    // Capturar snapshot de rendimiento
    capturePerformanceSnapshot: function() {
        const snapshot = {
            timestamp: Date.now()
        };
        
        if (this.state.browserCapabilities.hasPerformanceAPI) {
            snapshot.performance = {
                now: performance.now(),
                timing: performance.getEntriesByType('navigation')[0],
                resources: performance.getEntriesByType('resource').length
            };
        }
        
        return snapshot;
    },

    // Contar recursos personalizados
    countCustomResources: function() {
        let count = 0;
        
        // Contar recursos específicos de la aplicación
        if (typeof window !== 'undefined') {
            // Contar variables globales que puedan ser recursos
            for (const prop in window) {
                if (prop.startsWith('_') || prop.includes('Resource') || prop.includes('Pool')) {
                    count++;
                }
            }
        }
        
        return count;
    },

    // Estimar event listeners del DOM
    estimateDOMEventListeners: function() {
        if (typeof document === 'undefined') return 0;
        
        let count = 0;
        
        // Contar event listeners conocidos
        const commonEvents = ['click', 'change', 'submit', 'load', 'unload', 'resize', 'scroll'];
        
        for (const event of commonEvents) {
            const elements = document.querySelectorAll(`[${event}]`);
            count += elements.length;
        }
        
        return count;
    },

    // Estimar uso de memoria del DOM
    estimateDOMMemoryUsage: function() {
        if (typeof document === 'undefined') return 0;
        
        const nodes = document.getElementsByTagName('*');
        let estimatedMemory = 0;
        
        // Estimación básica: cada nodo ~200 bytes
        estimatedMemory = nodes.length * 200;
        
        return estimatedMemory;
    },

    // Limitar snapshots
    limitSnapshots: function() {
        const maxSnapshots = this.config.maxSnapshots;
        
        if (this.state.memorySnapshots.length > maxSnapshots) {
            this.state.memorySnapshots = this.state.memorySnapshots.slice(-maxSnapshots);
        }
        
        if (this.state.resourceSnapshots.length > maxSnapshots) {
            this.state.resourceSnapshots = this.state.resourceSnapshots.slice(-maxSnapshots);
        }
        
        if (this.state.domSnapshots.length > maxSnapshots) {
            this.state.domSnapshots = this.state.domSnapshots.slice(-maxSnapshots);
        }
        
        if (this.state.performanceSnapshots.length > maxSnapshots) {
            this.state.performanceSnapshots = this.state.performanceSnapshots.slice(-maxSnapshots);
        }
    },

    // Procesar detección
    processDetection: function(patternName, result) {
        const leakId = `${patternName}-${Date.now()}`;
        
        // Agregar a leaks activos
        this.state.activeLeaks.set(leakId, {
            id: leakId,
            pattern: patternName,
            detected: Date.now(),
            lastSeen: Date.now(),
            count: 1,
            severity: this.leakPatterns[patternName]?.severity || 'medium',
            details: result
        });
        
        // Actualizar historial
        this.state.leakHistory.push({
            id: leakId,
            pattern: patternName,
            timestamp: Date.now(),
            details: result
        });
        
        // Limitar historial
        if (this.state.leakHistory.length > 100) {
            this.state.leakHistory = this.state.leakHistory.slice(-50);
        }
        
        // Actualizar estadísticas
        this.state.stats.totalLeaks++;
        
        // Verificar alertas
        this.checkAlerts(patternName);
        
        // Emitir evento de leak detectado
        this.emitEvent('leak:detected', {
            id: leakId,
            pattern: patternName,
            details: result
        });
    },

    // Verificar alertas
    checkAlerts: function(patternName) {
        if (!this.config.enableAlerts) return;
        
        const alertKey = patternName;
        const now = Date.now();
        
        // Verificar cooldown
        if (this.state.alertState.cooldownActive) {
            const lastAlert = this.state.alertState.lastAlerts.get(alertKey);
            if (lastAlert && (now - lastAlert) < this.config.alertCooldown) {
                return;
            }
        }
        
        // Incrementar contador
        const currentCount = this.state.alertState.alertCounts.get(alertKey) || 0;
        const newCount = currentCount + 1;
        this.state.alertState.alertCounts.set(alertKey, newCount);
        
        // Verificar umbral
        if (newCount >= this.config.alertThreshold) {
            this.raiseLeakAlert(patternName, newCount);
            this.state.alertState.lastAlerts.set(alertKey, now);
            this.state.alertState.alertCounts.set(alertKey, 0);
        }
    },

    // Emitir alerta de leak
    raiseLeakAlert: function(patternName, count) {
        const pattern = this.leakPatterns[patternName];
        
        this.log(`ALERTA: Memory leak detectado - ${pattern?.name || patternName}`, 'warn', {
            pattern: patternName,
            count,
            severity: pattern?.severity
        });
        
        // Emitir evento de alerta
        this.emitEvent('leak:alert', {
            pattern: patternName,
            count,
            severity: pattern?.severity,
            timestamp: Date.now()
        });
    },

    // Detectar event listener leaks
    detectEventListenerLeaks: function() {
        const result = {
            detected: false,
            details: {}
        };
        
        if (typeof document === 'undefined') return result;
        
        // Buscar elementos con muchos event listeners
        const elements = document.querySelectorAll('*');
        const suspiciousElements = [];
        
        for (const element of elements) {
            const listenerCount = this.estimateElementListeners(element);
            if (listenerCount > 5) { // Umbral arbitrario
                suspiciousElements.push({
                    element: element.tagName,
                    id: element.id,
                    className: element.className,
                    listenerCount
                });
            }
        }
        
        if (suspiciousElements.length > 0) {
            result.detected = true;
            result.details.suspiciousElements = suspiciousElements;
            result.details.totalElements = elements.length;
            result.details.suspiciousCount = suspiciousElements.length;
        }
        
        return result;
    },

    // Estimar listeners de un elemento
    estimateElementListeners: function(element) {
        let count = 0;
        
        // Contar atributos de eventos
        const commonEvents = ['onclick', 'onchange', 'onsubmit', 'onload', 'onunload', 'onresize', 'onscroll'];
        
        for (const event of commonEvents) {
            if (element[event]) count++;
        }
        
        return count;
    },

    // Detectar DOM reference leaks
    detectDOMReferenceLeaks: function() {
        const result = {
            detected: false,
            details: {}
        };
        
        if (typeof document === 'undefined') return result;
        
        // Buscar referencias DOM en variables globales
        const domReferences = [];
        
        if (typeof window !== 'undefined') {
            for (const prop in window) {
                try {
                    const value = window[prop];
                    if (value && typeof value === 'object' && value.nodeType) {
                        domReferences.push({
                            property: prop,
                            type: value.tagName,
                            id: value.id,
                            className: value.className
                        });
                    }
                } catch (e) {
                    // Ignorar propiedades que no se pueden acceder
                }
            }
        }
        
        if (domReferences.length > 10) { // Umbral arbitrario
            result.detected = true;
            result.details.domReferences = domReferences;
            result.details.totalReferences = domReferences.length;
        }
        
        return result;
    },

    // Detectar closure leaks
    detectClosureLeaks: function() {
        const result = {
            detected: false,
            details: {}
        };
        
        // Esta detección es compleja y requiere análisis estático
        // Por ahora, implementamos una detección básica
        
        // Buscar funciones con muchas variables capturadas
        const suspiciousFunctions = [];
        
        if (typeof window !== 'undefined') {
            for (const prop in window) {
                try {
                    const value = window[prop];
                    if (typeof value === 'function') {
                        const funcString = value.toString();
                        
                        // Buscar patrones sospechosos
                        if (funcString.includes('function') && funcString.includes('var') && funcString.length > 1000) {
                            suspiciousFunctions.push({
                                property: prop,
                                size: funcString.length,
                                hasVars: funcString.includes('var ') || funcString.includes('let ') || funcString.includes('const ')
                            });
                        }
                    }
                } catch (e) {
                    // Ignorar propiedades que no se pueden acceder
                }
            }
        }
        
        if (suspiciousFunctions.length > 5) { // Umbral arbitrario
            result.detected = true;
            result.details.suspiciousFunctions = suspiciousFunctions;
            result.details.totalFunctions = suspiciousFunctions.length;
        }
        
        return result;
    },

    // Detectar timer leaks
    detectTimerLeaks: function() {
        const result = {
            detected: false,
            details: {}
        };
        
        // Contar timers activos desde ResourceTracker
        let activeTimers = 0;
        
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            activeTimers = (ResourceTracker.state.resources.intervals?.size || 0) + 
                          (ResourceTracker.state.resources.timeouts?.size || 0);
        }
        
        // Si hay muchos timers activos, podría ser un leak
        if (activeTimers > 10) { // Umbral arbitrario
            result.detected = true;
            result.details.activeTimers = activeTimers;
            result.details.intervals = ResourceTracker?.state?.resources?.intervals?.size || 0;
            result.details.timeouts = ResourceTracker?.state?.resources?.timeouts?.size || 0;
        }
        
        return result;
    },

    // Detectar promise leaks
    detectPromiseLeaks: function() {
        const result = {
            detected: false,
            details: {}
        };
        
        // Contar promises pendientes desde ResourceTracker
        let pendingPromises = 0;
        
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            pendingPromises = ResourceTracker.state.resources.promises?.size || 0;
        }
        
        // Si hay muchas promises pendientes, podría ser un leak
        if (pendingPromises > 20) { // Umbral arbitrario
            result.detected = true;
            result.details.pendingPromises = pendingPromises;
        }
        
        return result;
    },

    // Detectar cache leaks
    detectCacheLeaks: function() {
        const result = {
            detected: false,
            details: {}
        };
        
        // Buscar cachés grandes
        const largeCaches = [];
        
        if (typeof window !== 'undefined') {
            for (const prop in window) {
                try {
                    const value = window[prop];
                    if (value && typeof value === 'object' && 
                        (prop.includes('cache') || prop.includes('Cache'))) {
                        
                        const size = this.estimateObjectSize(value);
                        if (size > 1000000) { // 1MB
                            largeCaches.push({
                                property: prop,
                                size,
                                type: value.constructor.name
                            });
                        }
                    }
                } catch (e) {
                    // Ignorar propiedades que no se pueden acceder
                }
            }
        }
        
        if (largeCaches.length > 0) {
            result.detected = true;
            result.details.largeCaches = largeCaches;
            result.details.totalCaches = largeCaches.length;
        }
        
        return result;
    },

    // Detectar circular reference leaks
    detectCircularReferenceLeaks: function() {
        const result = {
            detected: false,
            details: {}
        };
        
        // Esta detección es compleja y requiere análisis profundo
        // Por ahora, implementamos una detección básica
        
        const circularReferences = [];
        
        if (typeof window !== 'undefined') {
            const visited = new Set();
            
            for (const prop in window) {
                try {
                    const value = window[prop];
                    if (value && typeof value === 'object') {
                        if (this.hasCircularReference(value, visited)) {
                            circularReferences.push({
                                property: prop,
                                type: value.constructor.name
                            });
                        }
                    }
                } catch (e) {
                    // Ignorar propiedades que no se pueden acceder
                }
            }
        }
        
        if (circularReferences.length > 5) { // Umbral arbitrario
            result.detected = true;
            result.details.circularReferences = circularReferences;
            result.details.totalReferences = circularReferences.length;
        }
        
        return result;
    },

    // Verificar si un objeto tiene referencias circulares
    hasCircularReference: function(obj, visited, path = '') {
        if (!obj || typeof obj !== 'object') return false;
        
        const objId = this.getObjectId(obj);
        if (visited.has(objId)) return true;
        
        visited.add(objId);
        
        try {
            for (const prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    if (this.hasCircularReference(obj[prop], new Set(visited), path + '.' + prop)) {
                        return true;
                    }
                }
            }
        } catch (e) {
            // Ignorar errores de acceso
        }
        
        return false;
    },

    // Obtener ID único de objeto
    getObjectId: function(obj) {
        return Object.prototype.toString.call(obj) + '-' + (obj.id || '');
    },

    // Detectar observer leaks
    detectObserverLeaks: function() {
        const result = {
            detected: false,
            details: {}
        };
        
        // Contar observers activos desde ResourceTracker
        let activeObservers = 0;
        
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            activeObservers = ResourceTracker.state.resources.observers?.size || 0;
        }
        
        // Si hay muchos observers activos, podría ser un leak
        if (activeObservers > 5) { // Umbral arbitrario
            result.detected = true;
            result.details.activeObservers = activeObservers;
        }
        
        return result;
    },

    // Estimar tamaño de objeto
    estimateObjectSize: function(obj) {
        try {
            return JSON.stringify(obj).length * 2; // Estimación básica
        } catch (e) {
            return 0;
        }
    },

    // Analizar tendencias de memoria
    analyzeMemoryTrends: function() {
        if (this.state.memorySnapshots.length < 3) {
            return { trend: 'insufficient_data' };
        }
        
        const recent = this.state.memorySnapshots.slice(-10);
        const memoryUsages = recent
            .filter(s => s.memory && s.memory.percentage)
            .map(s => s.memory.percentage);
        
        if (memoryUsages.length < 3) {
            return { trend: 'insufficient_data' };
        }
        
        // Calcular tendencia
        const first = memoryUsages[0];
        const last = memoryUsages[memoryUsages.length - 1];
        const growth = (last - first) / first;
        
        return {
            trend: growth > this.config.memoryGrowthThreshold ? 'growing' : 'stable',
            growth,
            first,
            last,
            samples: memoryUsages.length
        };
    },

    // Analizar tendencias de recursos
    analyzeResourceTrends: function() {
        if (this.state.resourceSnapshots.length < 3) {
            return { trend: 'insufficient_data' };
        }
        
        const recent = this.state.resourceSnapshots.slice(-10);
        const resourceCounts = recent
            .filter(s => s.resources)
            .map(s => Object.values(s.resources).reduce((sum, count) => sum + count, 0));
        
        if (resourceCounts.length < 3) {
            return { trend: 'insufficient_data' };
        }
        
        // Calcular tendencia
        const first = resourceCounts[0];
        const last = resourceCounts[resourceCounts.length - 1];
        const growth = (last - first) / first;
        
        return {
            trend: growth > this.config.resourceGrowthThreshold ? 'growing' : 'stable',
            growth,
            first,
            last,
            samples: resourceCounts.length
        };
    },

    // Analizar tendencias de DOM
    analyzeDOMTrends: function() {
        if (this.state.domSnapshots.length < 3) {
            return { trend: 'insufficient_data' };
        }
        
        const recent = this.state.domSnapshots.slice(-10);
        const nodeCounts = recent
            .filter(s => s.dom && s.dom.nodes)
            .map(s => s.dom.nodes);
        
        if (nodeCounts.length < 3) {
            return { trend: 'insufficient_data' };
        }
        
        // Calcular tendencia
        const first = nodeCounts[0];
        const last = nodeCounts[nodeCounts.length - 1];
        const growth = (last - first) / first;
        
        return {
            trend: growth > this.config.domGrowthThreshold ? 'growing' : 'stable',
            growth,
            first,
            last,
            samples: nodeCounts.length
        };
    },

    // Analizar tendencias de rendimiento
    analyzePerformanceTrends: function() {
        if (this.state.performanceSnapshots.length < 3) {
            return { trend: 'insufficient_data' };
        }
        
        const recent = this.state.performanceSnapshots.slice(-10);
        const performanceMetrics = recent
            .filter(s => s.performance && s.performance.now)
            .map(s => s.performance.now);
        
        if (performanceMetrics.length < 3) {
            return { trend: 'insufficient_data' };
        }
        
        // Calcular tendencia (simplificado)
        const first = performanceMetrics[0];
        const last = performanceMetrics[performanceMetrics.length - 1];
        const degradation = (last - first) / first;
        
        return {
            trend: degradation > this.config.performanceThreshold ? 'degrading' : 'stable',
            degradation,
            first,
            last,
            samples: performanceMetrics.length
        };
    },

    // Analizar patrones detectados
    analyzeDetectedPatterns: function() {
        const patterns = {};
        
        for (const [leakId, leak] of this.state.activeLeaks) {
            const pattern = leak.pattern;
            if (!patterns[pattern]) {
                patterns[pattern] = {
                    count: 0,
                    severity: leak.severity,
                    lastSeen: 0,
                    details: []
                };
            }
            
            patterns[pattern].count++;
            patterns[pattern].lastSeen = Math.max(patterns[pattern].lastSeen, leak.lastSeen);
            patterns[pattern].details.push(leak.details);
        }
        
        return patterns;
    },

    // Analizar leaks activos
    analyzeActiveLeaks: function() {
        const analysis = {
            totalLeaks: this.state.activeLeaks.size,
            bySeverity: {
                high: 0,
                medium: 0,
                low: 0
            },
            byPattern: {},
            recentLeaks: []
        };
        
        for (const [leakId, leak] of this.state.activeLeaks) {
            // Contar por severidad
            analysis.bySeverity[leak.severity]++;
            
            // Contar por patrón
            if (!analysis.byPattern[leak.pattern]) {
                analysis.byPattern[leak.pattern] = 0;
            }
            analysis.byPattern[leak.pattern]++;
            
            // Agregar leaks recientes
            if (Date.now() - leak.lastSeen < 300000) { // 5 minutos
                analysis.recentLeaks.push(leak);
            }
        }
        
        return analysis;
    },

    // Generar recomendaciones de leaks
    generateLeakRecommendations: function() {
        const recommendations = [];
        const activeLeaks = this.analyzeActiveLeaks();
        
        // Recomendaciones basadas en leaks activos
        if (activeLeaks.totalLeaks > 0) {
            recommendations.push({
                priority: 'high',
                type: 'active-leaks',
                message: `Se detectaron ${activeLeaks.totalLeaks} memory leaks activos.`,
                actions: ['Revisar y corregir los leaks detectados', 'Implementar limpieza automática', 'Monitorear continuamente']
            });
        }
        
        // Recomendaciones basadas en severidad
        if (activeLeaks.bySeverity.high > 0) {
            recommendations.push({
                priority: 'critical',
                type: 'high-severity-leaks',
                message: `Se detectaron ${activeLeaks.bySeverity.high} leaks de alta severidad.`,
                actions: ['Atender inmediatamente', 'Revisar implementación crítica', 'Considerar refactorización']
            });
        }
        
        // Recomendaciones basadas en patrones
        for (const [pattern, count] of Object.entries(activeLeaks.byPattern)) {
            if (count > 2) {
                const patternInfo = this.leakPatterns[pattern];
                recommendations.push({
                    priority: 'medium',
                    type: 'pattern-leaks',
                    message: `Patrón "${patternInfo?.name || pattern}" detectado ${count} veces.`,
                    actions: [patternInfo?.solution || 'Revisar implementación del patrón']
                });
            }
        }
        
        // Recomendaciones basadas en tendencias
        const memoryTrends = this.analyzeMemoryTrends();
        if (memoryTrends.trend === 'growing') {
            recommendations.push({
                priority: 'medium',
                type: 'memory-growth',
                message: 'Tendencia de crecimiento de memoria detectada.',
                actions: ['Investigar causa del crecimiento', 'Optimizar uso de memoria', 'Implementar límites']
            });
        }
        
        return recommendations;
    },

    // Realizar detección final
    performFinalDetection: function() {
        this.log('Realizando detección final de memory leaks', 'info');
        
        const finalDetection = {
            timestamp: Date.now(),
            type: 'final',
            summary: {
                totalDetections: this.state.stats.totalDetections,
                totalLeaks: this.state.stats.totalLeaks,
                activeLeaks: this.state.activeLeaks.size,
                patterns: this.analyzeDetectedPatterns()
            },
            recommendations: this.generateLeakRecommendations()
        };
        
        // Emitir evento de detección final
        this.emitEvent('leak:final-detection', finalDetection);
    },

    // Pausar detección
    pauseDetection: function() {
        if (this.detectionInterval) clearInterval(this.detectionInterval);
        if (this.deepAnalysisInterval) clearInterval(this.deepAnalysisInterval);
        
        this.state.detectionActive = false;
        this.log('Detección de memory leaks pausada', 'info');
    },

    // Reanudar detección
    resumeDetection: function() {
        this.setupDetection();
        this.setupDeepAnalysis();
        
        this.state.detectionActive = true;
        this.log('Detección de memory leaks reanudada', 'info');
    },

    // Emitir evento
    emitEvent: function(eventType, data) {
        if (typeof document !== 'undefined') {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    },

    // Obtener reporte del detector
    getDetectorReport: function() {
        return {
            timestamp: Date.now(),
            stats: this.state.stats,
            activeLeaks: Array.from(this.state.activeLeaks.values()),
            leakHistory: this.state.leakHistory.slice(-20),
            detectedPatterns: this.analyzeDetectedPatterns(),
            recentAnalyses: this.state.analysisQueue.slice(-5),
            trends: {
                memory: this.analyzeMemoryTrends(),
                resources: this.analyzeResourceTrends(),
                dom: this.analyzeDOMTrends(),
                performance: this.analyzePerformanceTrends()
            },
            recommendations: this.generateLeakRecommendations(),
            config: this.config
        };
    },

    // Obtener métricas actuales
    getCurrentMetrics: function() {
        return {
            ...this.state.stats,
            detectionActive: this.state.detectionActive,
            activeLeaks: this.state.activeLeaks.size,
            leakHistory: this.state.leakHistory.length,
            analysisQueue: this.state.analysisQueue.length,
            memorySnapshots: this.state.memorySnapshots.length,
            resourceSnapshots: this.state.resourceSnapshots.length,
            domSnapshots: this.state.domSnapshots.length,
            performanceSnapshots: this.state.performanceSnapshots.length
        };
    },

    // Reiniciar detector
    reset: function() {
        this.log('Reiniciando LeakDetector...');
        
        // Pausar detección
        this.pauseDetection();
        
        // Limpiar estado
        this.state.memorySnapshots = [];
        this.state.resourceSnapshots = [];
        this.state.domSnapshots = [];
        this.state.performanceSnapshots = [];
        this.state.activeLeaks.clear();
        this.state.leakHistory = [];
        this.state.currentAnalysis = null;
        this.state.analysisQueue = [];
        this.state.detectedPatterns.clear();
        this.state.patternHistory = [];
        
        // Reiniciar estadísticas
        this.state.stats = {
            totalDetections: 0,
            totalLeaks: 0,
            totalPatterns: 0,
            totalAnalyses: 0,
            lastDetection: null,
            lastAnalysis: null,
            lastAlert: null
        };
        
        // Reiniciar estado de alertas
        this.state.alertState = {
            lastAlerts: new Map(),
            alertCounts: new Map(),
            cooldownActive: false
        };
        
        // Reanudar detección
        this.resumeDetection();
        
        this.log('LeakDetector reiniciado', 'success');
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
            const logMessage = `[${timestamp}] [LeakDetector] [${level.toUpperCase()}] ${message}`;
            
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

// Exportar el LeakDetector
export default LeakDetector;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.LeakDetector = LeakDetector;
}