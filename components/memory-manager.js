/**
 * Justice 2 Memory Manager
 * Sistema centralizado de gestión de memoria para eliminar memory leaks
 * Proporciona seguimiento de recursos, limpieza automática y detección de fugas
 */

import { XSSProtection } from './xss-protection.js';

const MemoryManager = {
    // Configuración del gestor de memoria
    config: {
        // Configuración de monitoreo
        monitoringInterval: 10000,        // 10 segundos
        memoryCheckInterval: 30000,       // 30 segundos
        leakDetectionInterval: 60000,     // 1 minuto
        
        // Umbrales de memoria
        memoryWarningThreshold: 0.7,      // 70% de uso
        memoryCriticalThreshold: 0.85,    // 85% de uso
        maxObjectAge: 300000,             // 5 minutos máximo para objetos
        
        // Configuración de limpieza
        enableAutoCleanup: true,
        cleanupInterval: 60000,           // 1 minuto
        maxRetainedObjects: 1000,         // Máximo objetos retenidos
        
        // Configuración de alertas
        enableAlerts: true,
        alertThreshold: 3,               // 3 alertas antes de acción
        
        // Configuración de logging
        enableLogging: true,
        logLevel: 'info',
        enableDetailedTraces: false
    },

    // Estado del gestor de memoria
    state: {
        initialized: false,
        monitoringActive: false,
        
        // Registros de recursos
        resources: {
            intervals: new Map(),
            timeouts: new Map(),
            eventListeners: new Map(),
            observers: new Map(),
            domReferences: new Map(),
            promises: new Map(),
            workers: new Map(),
            webSockets: new Map(),
            blobs: new Map(),
            urls: new Map()
        },
        
        // Pools de objetos
        pools: {
            dom: new Map(),
            data: new Map(),
            callbacks: new Map()
        },
        
        // Métricas
        metrics: {
            totalAllocated: 0,
            totalFreed: 0,
            currentUsage: 0,
            peakUsage: 0,
            leaksDetected: 0,
            cleanupOperations: 0,
            lastCleanup: Date.now(),
            memorySnapshots: []
        },
        
        // Sistema de alertas
        alerts: {
            active: new Map(),
            history: [],
            counters: new Map()
        },
        
        // Referencias débiles para GC
        weakRefs: {
            objects: new WeakMap(),
            callbacks: new WeakMap(),
            elements: new WeakMap()
        }
    },

    // Inicialización del MemoryManager
    init: function() {
        if (this.state.initialized) {
            this.log('MemoryManager ya está inicializado', 'warn');
            return;
        }

        try {
            this.log('Inicializando MemoryManager...');
            
            // Configurar monitoreo
            this.setupMonitoring();
            
            // Configurar limpieza automática
            this.setupAutoCleanup();
            
            // Configurar detección de leaks
            this.setupLeakDetection();
            
            // Configurar manejo de eventos de página
            this.setupPageEventHandlers();
            
            // Configurar captura de errores globales
            this.setupGlobalErrorCapture();
            
            this.state.initialized = true;
            this.log('MemoryManager inicializado correctamente', 'success');
            
            // Emitir evento de inicialización
            this.emitEvent('memory:manager:initialized', {
                timestamp: Date.now(),
                config: this.config
            });
            
        } catch (error) {
            this.log('Error inicializando MemoryManager: ' + error.message, 'error');
            throw error;
        }
    },

    // Configurar monitoreo de memoria
    setupMonitoring: function() {
        if (this.state.monitoringActive) return;
        
        this.state.monitoringActive = true;
        
        // Monitorear uso de memoria
        this.monitoringInterval = setInterval(() => {
            this.collectMemoryMetrics();
            this.analyzeMemoryUsage();
        }, this.config.monitoringInterval);
        
        // Chequeos profundos de memoria
        this.memoryCheckInterval = setInterval(() => {
            this.performMemoryCheck();
        }, this.config.memoryCheckInterval);
        
        this.log('Monitoreo de memoria configurado', 'info');
    },

    // Configurar limpieza automática
    setupAutoCleanup: function() {
        if (!this.config.enableAutoCleanup) return;
        
        this.cleanupInterval = setInterval(() => {
            this.performAutoCleanup();
        }, this.config.cleanupInterval);
        
        this.log('Limpieza automática configurada', 'info');
    },

    // Configurar detección de memory leaks
    setupLeakDetection: function() {
        this.leakDetectionInterval = setInterval(() => {
            this.detectMemoryLeaks();
        }, this.config.leakDetectionInterval);
        
        this.log('Detección de memory leaks configurada', 'info');
    },

    // Configurar manejadores de eventos de página
    setupPageEventHandlers: function() {
        if (typeof window !== 'undefined') {
            // Limpiar recursos al cambiar de página
            window.addEventListener('beforeunload', () => {
                this.cleanupAllResources();
            });
            
            // Pausar monitoreo cuando la página está oculta
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseMonitoring();
                } else {
                    this.resumeMonitoring();
                }
            });
            
            // Limpiar al descargar la página
            window.addEventListener('unload', () => {
                this.cleanupAllResources();
            });
        }
    },

    // Configurar captura de errores globales
    setupGlobalErrorCapture: function() {
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.handleGlobalError(event.error);
            });
            
            window.addEventListener('unhandledrejection', (event) => {
                this.handleGlobalError(event.reason);
            });
        }
    },

    // Registrar un interval
    registerInterval: function(id, intervalId, metadata = {}) {
        this.state.resources.intervals.set(id, {
            id: intervalId,
            timestamp: Date.now(),
            metadata,
            type: 'interval'
        });
        
        this.state.metrics.totalAllocated++;
        this.updateCurrentUsage();
        
        return id;
    },

    // Liberar un interval
    releaseInterval: function(id) {
        const interval = this.state.resources.intervals.get(id);
        if (interval) {
            clearInterval(interval.id);
            this.state.resources.intervals.delete(id);
            this.state.metrics.totalFreed++;
            this.updateCurrentUsage();
            return true;
        }
        return false;
    },

    // Registrar un timeout
    registerTimeout: function(id, timeoutId, metadata = {}) {
        this.state.resources.timeouts.set(id, {
            id: timeoutId,
            timestamp: Date.now(),
            metadata,
            type: 'timeout'
        });
        
        this.state.metrics.totalAllocated++;
        this.updateCurrentUsage();
        
        return id;
    },

    // Liberar un timeout
    releaseTimeout: function(id) {
        const timeout = this.state.resources.timeouts.get(id);
        if (timeout) {
            clearTimeout(timeout.id);
            this.state.resources.timeouts.delete(id);
            this.state.metrics.totalFreed++;
            this.updateCurrentUsage();
            return true;
        }
        return false;
    },

    // Registrar un event listener
    registerEventListener: function(id, element, event, handler, options = {}) {
        const listenerId = this.generateId();
        
        this.state.resources.eventListeners.set(id, {
            id: listenerId,
            element,
            event,
            handler,
            options,
            timestamp: Date.now(),
            type: 'eventListener'
        });
        
        element.addEventListener(event, handler, options);
        this.state.metrics.totalAllocated++;
        this.updateCurrentUsage();
        
        return id;
    },

    // Liberar un event listener
    releaseEventListener: function(id) {
        const listener = this.state.resources.eventListeners.get(id);
        if (listener) {
            listener.element.removeEventListener(listener.event, listener.handler, listener.options);
            this.state.resources.eventListeners.delete(id);
            this.state.metrics.totalFreed++;
            this.updateCurrentUsage();
            return true;
        }
        return false;
    },

    // Registrar un observer
    registerObserver: function(id, observer, metadata = {}) {
        this.state.resources.observers.set(id, {
            observer,
            timestamp: Date.now(),
            metadata,
            type: 'observer'
        });
        
        this.state.metrics.totalAllocated++;
        this.updateCurrentUsage();
        
        return id;
    },

    // Liberar un observer
    releaseObserver: function(id) {
        const observerData = this.state.resources.observers.get(id);
        if (observerData) {
            if (observerData.observer && typeof observerData.observer.disconnect === 'function') {
                observerData.observer.disconnect();
            }
            this.state.resources.observers.delete(id);
            this.state.metrics.totalFreed++;
            this.updateCurrentUsage();
            return true;
        }
        return false;
    },

    // Registrar una referencia DOM
    registerDOMReference: function(id, element, metadata = {}) {
        this.state.resources.domReferences.set(id, {
            element,
            timestamp: Date.now(),
            metadata,
            type: 'domReference'
        });
        
        // Crear referencia débil también
        this.state.weakRefs.elements.set(element, id);
        
        this.state.metrics.totalAllocated++;
        this.updateCurrentUsage();
        
        return id;
    },

    // Liberar una referencia DOM
    releaseDOMReference: function(id) {
        const ref = this.state.resources.domReferences.get(id);
        if (ref) {
            this.state.resources.domReferences.delete(id);
            this.state.metrics.totalFreed++;
            this.updateCurrentUsage();
            return true;
        }
        return false;
    },

    // Registrar una promesa
    registerPromise: function(id, promise, metadata = {}) {
        this.state.resources.promises.set(id, {
            promise,
            timestamp: Date.now(),
            metadata,
            type: 'promise'
        });
        
        this.state.metrics.totalAllocated++;
        this.updateCurrentUsage();
        
        // Limpiar automáticamente cuando se resuelva
        promise.finally(() => {
            this.releasePromise(id);
        });
        
        return id;
    },

    // Liberar una promesa
    releasePromise: function(id) {
        const promiseData = this.state.resources.promises.get(id);
        if (promiseData) {
            this.state.resources.promises.delete(id);
            this.state.metrics.totalFreed++;
            this.updateCurrentUsage();
            return true;
        }
        return false;
    },

    // Registrar un blob
    registerBlob: function(id, blob, metadata = {}) {
        this.state.resources.blobs.set(id, {
            blob,
            timestamp: Date.now(),
            size: blob.size,
            metadata,
            type: 'blob'
        });
        
        this.state.metrics.totalAllocated++;
        this.updateCurrentUsage();
        
        return id;
    },

    // Liberar un blob
    releaseBlob: function(id) {
        const blobData = this.state.resources.blobs.get(id);
        if (blobData) {
            // Revocar URL si existe
            if (blobData.url) {
                URL.revokeObjectURL(blobData.url);
            }
            this.state.resources.blobs.delete(id);
            this.state.metrics.totalFreed++;
            this.updateCurrentUsage();
            return true;
        }
        return false;
    },

    // Crear un pool de objetos
    createObjectPool: function(type, factory, resetFn, maxSize = 50) {
        const pool = {
            factory,
            resetFn,
            maxSize,
            available: [],
            inUse: new Set(),
            created: 0,
            reused: 0
        };
        
        this.state.pools[type] = pool;
        
        return {
            acquire: () => this.acquireFromPool(type),
            release: (obj) => this.releaseToPool(type, obj),
            getStats: () => this.getPoolStats(type)
        };
    },

    // Adquirir objeto del pool
    acquireFromPool: function(type) {
        const pool = this.state.pools[type];
        if (!pool) return null;
        
        let obj;
        if (pool.available.length > 0) {
            obj = pool.available.pop();
            pool.reused++;
        } else if (pool.created < pool.maxSize) {
            obj = pool.factory();
            pool.created++;
        } else {
            // Pool lleno, crear objeto temporal
            obj = pool.factory();
        }
        
        pool.inUse.add(obj);
        return obj;
    },

    // Liberar objeto al pool
    releaseToPool: function(type, obj) {
        const pool = this.state.pools[type];
        if (!pool || !pool.inUse.has(obj)) return false;
        
        pool.inUse.delete(obj);
        
        if (pool.resetFn) {
            pool.resetFn(obj);
        }
        
        if (pool.available.length < pool.maxSize) {
            pool.available.push(obj);
        }
        
        return true;
    },

    // Obtener estadísticas del pool
    getPoolStats: function(type) {
        const pool = this.state.pools[type];
        if (!pool) return null;
        
        return {
            created: pool.created,
            reused: pool.reused,
            available: pool.available.length,
            inUse: pool.inUse.size,
            efficiency: pool.reused / (pool.created + pool.reused) || 0
        };
    },

    // Colectar métricas de memoria
    collectMemoryMetrics: function() {
        const timestamp = Date.now();
        let memoryInfo = {};
        
        if (typeof performance !== 'undefined' && performance.memory) {
            memoryInfo = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                percentage: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
            };
        }
        
        const snapshot = {
            timestamp,
            memory: memoryInfo,
            resources: {
                intervals: this.state.resources.intervals.size,
                timeouts: this.state.resources.timeouts.size,
                eventListeners: this.state.resources.eventListeners.size,
                observers: this.state.resources.observers.size,
                domReferences: this.state.resources.domReferences.size,
                promises: this.state.resources.promises.size,
                blobs: this.state.resources.blobs.size
            },
            metrics: { ...this.state.metrics }
        };
        
        this.state.metrics.memorySnapshots.push(snapshot);
        
        // Limitar snapshots a mantener
        if (this.state.metrics.memorySnapshots.length > 100) {
            this.state.metrics.memorySnapshots = this.state.metrics.memorySnapshots.slice(-50);
        }
    },

    // Analizar uso de memoria
    analyzeMemoryUsage: function() {
        if (typeof performance === 'undefined' || !performance.memory) return;
        
        const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
        
        // Actualizar métricas
        this.state.metrics.currentUsage = memoryUsage;
        this.state.metrics.peakUsage = Math.max(this.state.metrics.peakUsage, memoryUsage);
        
        // Verificar umbrales
        if (memoryUsage > this.config.memoryCriticalThreshold) {
            this.raiseAlert('critical-memory-usage', {
                usage: memoryUsage,
                threshold: this.config.memoryCriticalThreshold,
                used: performance.memory.usedJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            }, 'critical');
            
            // Forzar limpieza inmediata
            this.performAutoCleanup(true);
            
        } else if (memoryUsage > this.config.memoryWarningThreshold) {
            this.raiseAlert('high-memory-usage', {
                usage: memoryUsage,
                threshold: this.config.memoryWarningThreshold,
                used: performance.memory.usedJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            }, 'warning');
        }
    },

    // Realizar chequeo de memoria
    performMemoryCheck: function() {
        const now = Date.now();
        let expiredResources = 0;
        
        // Chequear recursos expirados
        for (const [type, resources] of Object.entries(this.state.resources)) {
            for (const [id, resource] of resources) {
                if (now - resource.timestamp > this.config.maxObjectAge) {
                    this.releaseResource(type, id);
                    expiredResources++;
                }
            }
        }
        
        if (expiredResources > 0) {
            this.log(`Limpiados ${expiredResources} recursos expirados`, 'info');
            this.state.metrics.cleanupOperations += expiredResources;
        }
        
        // Forzar garbage collection si está disponible
        if (typeof window !== 'undefined' && window.gc) {
            window.gc();
        }
    },

    // Detectar memory leaks
    detectMemoryLeaks: function() {
        const now = Date.now();
        const leaks = [];
        
        // Detectar crecimiento anormal de recursos
        const recentSnapshots = this.state.metrics.memorySnapshots.slice(-5);
        if (recentSnapshots.length >= 3) {
            const growth = this.analyzeGrowthPattern(recentSnapshots);
            if (growth.isAbnormal) {
                leaks.push({
                    type: 'abnormal-growth',
                    details: growth,
                    timestamp: now
                });
            }
        }
        
        // Detectar recursos antiguos
        for (const [type, resources] of Object.entries(this.state.resources)) {
            for (const [id, resource] of resources) {
                if (now - resource.timestamp > this.config.maxObjectAge * 2) {
                    leaks.push({
                        type: 'old-resource',
                        resourceType: type,
                        resourceId: id,
                        age: now - resource.timestamp,
                        timestamp: now
                    });
                }
            }
        }
        
        // Detectar patrones sospechosos
        const suspiciousPatterns = this.detectSuspiciousPatterns();
        leaks.push(...suspiciousPatterns);
        
        if (leaks.length > 0) {
            this.state.metrics.leaksDetected += leaks.length;
            this.raiseAlert('memory-leak-detected', {
                leaks,
                totalLeaks: this.state.metrics.leaksDetected,
                timestamp: now
            }, 'warning');
        }
    },

    // Analizar patrón de crecimiento
    analyzeGrowthPattern: function(snapshots) {
        const resourceCounts = snapshots.map(s => s.resources);
        const memoryUsages = snapshots.map(s => s.memory.percentage || 0);
        
        // Calcular tasas de crecimiento
        const resourceGrowth = this.calculateGrowthRate(resourceCounts);
        const memoryGrowth = this.calculateGrowthRate(memoryUsages);
        
        return {
            isAbnormal: resourceGrowth > 0.5 || memoryGrowth > 0.3,
            resourceGrowth,
            memoryGrowth,
            samples: snapshots.length
        };
    },

    // Calcular tasa de crecimiento
    calculateGrowthRate: function(values) {
        if (values.length < 2) return 0;
        
        const first = values[0];
        const last = values[values.length - 1];
        
        if (typeof first === 'object') {
            // Para objetos, sumar todas las propiedades
            const firstSum = Object.values(first).reduce((a, b) => a + b, 0);
            const lastSum = Object.values(last).reduce((a, b) => a + b, 0);
            return (lastSum - firstSum) / firstSum;
        } else {
            return (last - first) / first;
        }
    },

    // Detectar patrones sospechosos
    detectSuspiciousPatterns: function() {
        const patterns = [];
        
        // Demasiados event listeners
        if (this.state.resources.eventListeners.size > 100) {
            patterns.push({
                type: 'too-many-listeners',
                count: this.state.resources.eventListeners.size,
                threshold: 100
            });
        }
        
        // Demasiados intervals/timeouts
        const totalTimers = this.state.resources.intervals.size + this.state.resources.timeouts.size;
        if (totalTimers > 50) {
            patterns.push({
                type: 'too-many-timers',
                count: totalTimers,
                threshold: 50
            });
        }
        
        // Demasiadas promesas pendientes
        if (this.state.resources.promises.size > 200) {
            patterns.push({
                type: 'too-many-promises',
                count: this.state.resources.promises.size,
                threshold: 200
            });
        }
        
        return patterns;
    },

    // Realizar limpieza automática
    performAutoCleanup: function(force = false) {
        const now = Date.now();
        let cleaned = 0;
        
        // Limpiar recursos expirados
        for (const [type, resources] of Object.entries(this.state.resources)) {
            for (const [id, resource] of resources) {
                const shouldClean = force || 
                    (now - resource.timestamp > this.config.maxObjectAge);
                
                if (shouldClean) {
                    this.releaseResource(type, id);
                    cleaned++;
                }
            }
        }
        
        // Limpiar pools si es necesario
        if (force || this.state.metrics.currentUsage > this.config.memoryWarningThreshold) {
            cleaned += this.cleanupPools();
        }
        
        // Limpiar snapshots antiguas
        const cutoff = now - this.config.memoryCheckInterval * 10;
        this.state.metrics.memorySnapshots = 
            this.state.metrics.memorySnapshots.filter(s => s.timestamp > cutoff);
        
        this.state.metrics.cleanupOperations += cleaned;
        this.state.metrics.lastCleanup = now;
        
        if (cleaned > 0) {
            this.log(`Limpieza automática: ${cleaned} recursos liberados`, 'info');
        }
        
        return cleaned;
    },

    // Limpiar pools
    cleanupPools: function() {
        let cleaned = 0;
        
        for (const [type, pool] of Object.entries(this.state.pools)) {
            // Reducir tamaño de pools disponibles
            const excess = pool.available.length - Math.floor(pool.maxSize * 0.5);
            if (excess > 0) {
                pool.available.splice(0, excess);
                cleaned += excess;
            }
        }
        
        return cleaned;
    },

    // Liberar recurso por tipo
    releaseResource: function(type, id) {
        switch (type) {
            case 'intervals':
                return this.releaseInterval(id);
            case 'timeouts':
                return this.releaseTimeout(id);
            case 'eventListeners':
                return this.releaseEventListener(id);
            case 'observers':
                return this.releaseObserver(id);
            case 'domReferences':
                return this.releaseDOMReference(id);
            case 'promises':
                return this.releasePromise(id);
            case 'blobs':
                return this.releaseBlob(id);
            default:
                return false;
        }
    },

    // Limpiar todos los recursos
    cleanupAllResources: function() {
        let totalCleaned = 0;
        
        // Limpiar todos los tipos de recursos
        for (const [type, resources] of Object.entries(this.state.resources)) {
            for (const id of resources.keys()) {
                if (this.releaseResource(type, id)) {
                    totalCleaned++;
                }
            }
        }
        
        // Limpiar pools
        for (const pool of Object.values(this.state.pools)) {
            pool.available = [];
            pool.inUse.clear();
        }
        
        // Limpiar métricas
        this.state.metrics.memorySnapshots = [];
        
        this.log(`Limpieza total: ${totalCleaned} recursos liberados`, 'info');
        
        return totalCleaned;
    },

    // Pausar monitoreo
    pauseMonitoring: function() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
        }
        if (this.leakDetectionInterval) {
            clearInterval(this.leakDetectionInterval);
        }
        
        this.log('Monitoreo de memoria pausado', 'info');
    },

    // Reanudar monitoreo
    resumeMonitoring: function() {
        this.setupMonitoring();
        this.setupLeakDetection();
        
        this.log('Monitoreo de memoria reanudado', 'info');
    },

    // Actualizar uso actual
    updateCurrentUsage: function() {
        const totalResources = Object.values(this.state.resources)
            .reduce((total, resources) => total + resources.size, 0);
        
        this.state.metrics.currentUsage = totalResources;
    },

    // Emitir alerta
    raiseAlert: function(type, data, severity = 'warning') {
        if (!this.config.enableAlerts) return;
        
        const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const alert = {
            id: alertId,
            type,
            severity,
            data,
            timestamp: Date.now()
        };
        
        // Contar alertas por tipo
        const counter = this.state.alerts.counters.get(type) || 0;
        this.state.alerts.counters.set(type, counter + 1);
        
        // Verificar si se debe emitir alerta
        if (counter >= this.config.alertThreshold) {
            this.state.alerts.active.set(alertId, alert);
            this.state.alerts.history.push(alert);
            
            // Limitar historial
            if (this.state.alerts.history.length > 100) {
                this.state.alerts.history = this.state.alerts.history.slice(-50);
            }
            
            // Emitir evento de alerta
            this.emitEvent('memory:alert', alert);
            
            this.log(`Alerta de memoria: ${type} - ${JSON.stringify(data)}`, severity);
        }
    },

    // Manejar error global
    handleGlobalError: function(error) {
        this.log(`Error global capturado: ${error.message || error}`, 'error');
        
        // Si el error está relacionado con memoria, limpiar
        if (error.message && (
            error.message.includes('memory') ||
            error.message.includes('out of memory') ||
            error.message.includes('allocation')
        )) {
            this.performAutoCleanup(true);
        }
    },

    // Emitir evento
    emitEvent: function(eventType, data) {
        if (typeof document !== 'undefined') {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    },

    // Generar ID único
    generateId: function() {
        return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Obtener reporte de memoria
    getMemoryReport: function() {
        return {
            timestamp: Date.now(),
            metrics: this.state.metrics,
            resources: Object.fromEntries(
                Object.entries(this.state.resources).map(([type, resources]) => [
                    type, resources.size
                ])
            ),
            pools: Object.fromEntries(
                Object.entries(this.state.pools).map(([type, pool]) => [
                    type, this.getPoolStats(type)
                ])
            ),
            alerts: {
                active: Array.from(this.state.alerts.active.values()),
                history: this.state.alerts.history.slice(-20),
                counters: Object.fromEntries(this.state.alerts.counters)
            },
            config: this.config
        };
    },

    // Obtener métricas actuales
    getCurrentMetrics: function() {
        return {
            ...this.state.metrics,
            resourceCounts: Object.fromEntries(
                Object.entries(this.state.resources).map(([type, resources]) => [
                    type, resources.size
                ])
            ),
            memoryInfo: typeof performance !== 'undefined' && performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                percentage: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
            } : null
        };
    },

    // Reiniciar gestor de memoria
    reset: function() {
        this.log('Reiniciando MemoryManager...');
        
        // Detener monitoreo
        this.pauseMonitoring();
        
        // Limpiar todos los recursos
        this.cleanupAllResources();
        
        // Reiniciar estado
        this.state.metrics = {
            totalAllocated: 0,
            totalFreed: 0,
            currentUsage: 0,
            peakUsage: 0,
            leaksDetected: 0,
            cleanupOperations: 0,
            lastCleanup: Date.now(),
            memorySnapshots: []
        };
        
        this.state.alerts = {
            active: new Map(),
            history: [],
            counters: new Map()
        };
        
        // Reiniciar monitoreo
        this.setupMonitoring();
        this.setupLeakDetection();
        
        this.log('MemoryManager reiniciado', 'success');
    },

    // Logging
    log: function(message, level = 'info') {
        if (!this.config.enableLogging) return;
        
        const shouldLog = this.config.logLevel === 'debug' || 
                          (this.config.logLevel === 'info' && ['info', 'warn', 'error'].includes(level)) ||
                          (this.config.logLevel === 'warn' && ['warn', 'error'].includes(level)) ||
                          (this.config.logLevel === 'error' && level === 'error');
        
        if (shouldLog) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [MemoryManager] [${level.toUpperCase()}] ${message}`;
            
            if (level === 'error') {
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

// Exportar el MemoryManager
export default MemoryManager;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.MemoryManager = MemoryManager;
}