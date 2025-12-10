/**
 * Justice 2 Auto Cleanup
 * Sistema automático de limpieza de recursos y memoria
 * Proporciona limpieza inteligente y programada de recursos
 */

import { XSSProtection } from './xss-protection.js';

const AutoCleanup = {
    // Configuración del sistema
    config: {
        // Configuración de limpieza automática
        autoCleanup: {
            enabled: true,
            interval: 30000,                 // 30 segundos
            aggressiveness: 'moderate',       // 'conservative', 'moderate', 'aggressive'
            maxCleanupTime: 5000,            // 5 segundos máximo por limpieza
            enableScheduledCleanup: true,
            enableEventDrivenCleanup: true
        },
        
        // Configuración de limpieza programada
        scheduledCleanup: {
            enabled: true,
            intervals: [
                { type: 'light', interval: 60000, aggressiveness: 'conservative' },    // 1 minuto
                { type: 'medium', interval: 300000, aggressiveness: 'moderate' },     // 5 minutos
                { type: 'heavy', interval: 900000, aggressiveness: 'aggressive' }      // 15 minutos
            ]
        },
        
        // Configuración de limpieza por eventos
        eventDrivenCleanup: {
            enabled: true,
            events: [
                { type: 'memory-pressure', threshold: 0.8, aggressiveness: 'moderate' },
                { type: 'resource-overload', threshold: 100, aggressiveness: 'aggressive' },
                { type: 'dom-growth', threshold: 0.2, aggressiveness: 'moderate' },
                { type: 'page-hidden', aggressiveness: 'conservative' },
                { type: 'user-inactive', threshold: 300000, aggressiveness: 'moderate' }  // 5 minutos
            ]
        },
        
        // Configuración de estrategias de limpieza
        cleanupStrategies: {
            // Estrategia conservadora
            conservative: {
                intervals: { maxAge: 600000, maxCount: 50 },           // 10 minutos, 50 max
                timeouts: { maxAge: 300000, maxCount: 100 },           // 5 minutos, 100 max
                eventListeners: { maxAge: 0, maxCount: 200 },          // Sin límite de edad, 200 max
                observers: { maxAge: 0, maxCount: 10 },                // Sin límite de edad, 10 max
                promises: { maxAge: 60000, maxCount: 50 },             // 1 minuto, 50 max
                domReferences: { maxAge: 0, maxCount: 100 },           // Sin límite de edad, 100 max
                cache: { maxAge: 1800000, maxPercentage: 0.5 },       // 30 minutos, 50%
                memory: { threshold: 0.7, forceGC: false }             // 70% umbral, sin forzar GC
            },
            
            // Estrategia moderada
            moderate: {
                intervals: { maxAge: 300000, maxCount: 30 },           // 5 minutos, 30 max
                timeouts: { maxAge: 180000, maxCount: 50 },            // 3 minutos, 50 max
                eventListeners: { maxAge: 0, maxCount: 100 },          // Sin límite de edad, 100 max
                observers: { maxAge: 0, maxCount: 5 },                 // Sin límite de edad, 5 max
                promises: { maxAge: 30000, maxCount: 25 },             // 30 segundos, 25 max
                domReferences: { maxAge: 0, maxCount: 50 },            // Sin límite de edad, 50 max
                cache: { maxAge: 900000, maxPercentage: 0.3 },         // 15 minutos, 30%
                memory: { threshold: 0.6, forceGC: true }              // 60% umbral, forzar GC
            },
            
            // Estrategia agresiva
            aggressive: {
                intervals: { maxAge: 120000, maxCount: 20 },           // 2 minutos, 20 max
                timeouts: { maxAge: 60000, maxCount: 25 },             // 1 minuto, 25 max
                eventListeners: { maxAge: 0, maxCount: 50 },           // Sin límite de edad, 50 max
                observers: { maxAge: 0, maxCount: 3 },                 // Sin límite de edad, 3 max
                promises: { maxAge: 15000, maxCount: 10 },             // 15 segundos, 10 max
                domReferences: { maxAge: 0, maxCount: 25 },           // Sin límite de edad, 25 max
                cache: { maxAge: 300000, maxPercentage: 0.1 },         // 5 minutos, 10%
                memory: { threshold: 0.5, forceGC: true }              // 50% umbral, forzar GC
            }
        },
        
        // Configuración de recursos específicos
        resourceCleanup: {
            intervals: { enabled: true, priority: 'high' },
            timeouts: { enabled: true, priority: 'high' },
            eventListeners: { enabled: true, priority: 'medium' },
            observers: { enabled: true, priority: 'medium' },
            promises: { enabled: true, priority: 'medium' },
            domReferences: { enabled: true, priority: 'low' },
            cache: { enabled: true, priority: 'medium' },
            memory: { enabled: true, priority: 'high' }
        },
        
        // Configuración de seguridad
        safety: {
            excludeCritical: true,
            maxCleanupPercentage: 0.8,          // Máximo 80% de recursos por limpieza
            minTimeBetweenCleanups: 5000,       // Mínimo 5 segundos entre limpiezas
            enableRollback: true,
            maxRetries: 3
        },
        
        // Configuración de logging
        logging: {
            enabled: true,
            level: 'info',
            includeDetails: true,
            includeStats: true,
            maxLogSize: 500
        }
    },

    // Estado del sistema
    state: {
        initialized: false,
        cleanupActive: false,
        
        // Estado de limpieza
        cleanupState: {
            lastCleanup: null,
            lastScheduledCleanup: null,
            lastEventCleanup: null,
            cleanupInProgress: false,
            cleanupCount: 0,
            scheduledCleanupCount: 0,
            eventCleanupCount: 0
        },
        
        // Historial de limpiezas
        cleanupHistory: [],
        
        // Temporizadores de limpieza
        cleanupTimers: {
            auto: null,
            scheduled: [],
            event: null
        },
        
        // Estado de eventos
        eventState: {
            userActive: true,
            lastUserActivity: Date.now(),
            pageVisible: true,
            memoryPressure: false,
            resourceOverload: false,
            domGrowth: false
        },
        
        // Estadísticas
        stats: {
            totalCleanups: 0,
            totalResourcesCleaned: 0,
            totalMemoryFreed: 0,
            averageCleanupTime: 0,
            lastCleanupTime: null,
            lastCleanupDuration: 0,
            cleanupErrors: 0,
            rollbackCount: 0
        },
        
        // Configuración de navegadores
        browserCapabilities: {
            hasMemoryAPI: false,
            hasPerformanceAPI: false,
            hasRequestIdleCallback: false
        }
    },

    // Inicialización del sistema
    init: function() {
        if (this.state.initialized) {
            this.log('AutoCleanup ya está inicializado', 'warn');
            return;
        }

        try {
            this.log('Inicializando AutoCleanup...');
            
            // Detectar capacidades del navegador
            this.detectBrowserCapabilities();
            
            // Configurar limpieza automática
            if (this.config.autoCleanup.enabled) {
                this.setupAutoCleanup();
            }
            
            // Configurar limpieza programada
            if (this.config.scheduledCleanup.enabled) {
                this.setupScheduledCleanup();
            }
            
            // Configurar limpieza por eventos
            if (this.config.eventDrivenCleanup.enabled) {
                this.setupEventDrivenCleanup();
            }
            
            // Configurar manejadores de eventos
            this.setupEventHandlers();
            
            this.state.initialized = true;
            this.state.cleanupActive = true;
            this.log('AutoCleanup inicializado correctamente', 'success');
            
            // Emitir evento de inicialización
            this.emitEvent('auto-cleanup:initialized', {
                timestamp: Date.now(),
                capabilities: this.state.browserCapabilities,
                config: this.config
            });
            
        } catch (error) {
            this.log('Error inicializando AutoCleanup: ' + error.message, 'error');
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
        
        if (typeof requestIdleCallback !== 'undefined') {
            this.state.browserCapabilities.hasRequestIdleCallback = true;
        }
        
        this.log('Capacidades del navegador detectadas', 'info', this.state.browserCapabilities);
    },

    // Configurar limpieza automática
    setupAutoCleanup: function() {
        this.state.cleanupTimers.auto = setInterval(() => {
            this.performAutoCleanup();
        }, this.config.autoCleanup.interval);
        
        this.log('Limpieza automática configurada', 'info');
    },

    // Configurar limpieza programada
    setupScheduledCleanup: function() {
        this.config.scheduledCleanup.intervals.forEach(schedule => {
            const timer = setInterval(() => {
                this.performScheduledCleanup(schedule.type, schedule.aggressiveness);
            }, schedule.interval);
            
            this.state.cleanupTimers.scheduled.push({
                type: schedule.type,
                timer,
                aggressiveness: schedule.aggressiveness
            });
        });
        
        this.log('Limpieza programada configurada', 'info');
    },

    // Configurar limpieza por eventos
    setupEventDrivenCleanup: function() {
        // Monitorear eventos de memoria
        if (this.state.browserCapabilities.hasMemoryAPI) {
            this.memoryCheckInterval = setInterval(() => {
                this.checkMemoryPressure();
            }, 10000); // 10 segundos
        }
        
        // Monitorear recursos
        this.resourceCheckInterval = setInterval(() => {
            this.checkResourceOverload();
        }, 15000); // 15 segundos
        
        // Monitorear DOM
        this.domCheckInterval = setInterval(() => {
            this.checkDOMGrowth();
        }, 20000); // 20 segundos
        
        this.log('Limpieza por eventos configurada', 'info');
    },

    // Configurar manejadores de eventos
    setupEventHandlers: function() {
        if (typeof window !== 'undefined') {
            // Eventos de visibilidad de página
            document.addEventListener('visibilitychange', () => {
                this.state.eventState.pageVisible = !document.hidden;
                
                if (document.hidden) {
                    this.triggerEventCleanup('page-hidden');
                }
            });
            
            // Eventos de actividad del usuario
            const userActivityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
            userActivityEvents.forEach(event => {
                document.addEventListener(event, () => {
                    this.state.eventState.userActive = true;
                    this.state.eventState.lastUserActivity = Date.now();
                });
            });
            
            // Verificar inactividad del usuario
            setInterval(() => {
                const inactiveTime = Date.now() - this.state.eventState.lastUserActivity;
                if (inactiveTime > 300000) { // 5 minutos
                    this.state.eventState.userActive = false;
                    this.triggerEventCleanup('user-inactive');
                }
            }, 60000); // 1 minuto
            
            // Evento beforeunload
            window.addEventListener('beforeunload', () => {
                this.performFinalCleanup();
            });
        }
    },

    // Realizar limpieza automática
    performAutoCleanup: function() {
        if (this.state.cleanupState.cleanupInProgress) {
            this.log('Limpieza en progreso, omitiendo', 'debug');
            return;
        }
        
        const aggressiveness = this.config.autoCleanup.aggressiveness;
        this.performCleanup('auto', aggressiveness);
    },

    // Realizar limpieza programada
    performScheduledCleanup: function(type, aggressiveness) {
        if (this.state.cleanupState.cleanupInProgress) {
            this.log('Limpieza en progreso, omitiendo limpieza programada', 'debug');
            return;
        }
        
        this.performCleanup('scheduled', aggressiveness, { type });
    },

    // Realizar limpieza por eventos
    triggerEventCleanup: function(eventType) {
        const eventConfig = this.config.eventDrivenCleanup.events.find(e => e.type === eventType);
        if (!eventConfig) return;
        
        if (this.state.cleanupState.cleanupInProgress) {
            this.log('Limpieza en progreso, omitiendo limpieza por evento', 'debug');
            return;
        }
        
        this.performCleanup('event', eventConfig.aggressiveness, { eventType });
    },

    // Realizar limpieza principal
    performCleanup: function(triggerType, aggressiveness, options = {}) {
        const startTime = performance.now();
        
        this.log(`Iniciando limpieza: ${triggerType} (${aggressiveness})`, 'info');
        
        this.state.cleanupState.cleanupInProgress = true;
        
        try {
            const strategy = this.config.cleanupStrategies[aggressiveness];
            const cleanupResults = {
                triggerType,
                aggressiveness,
                startTime,
                resources: {},
                memory: {},
                errors: []
            };
            
            // Limpiar diferentes tipos de recursos
            for (const [resourceType, config] of Object.entries(this.config.resourceCleanup)) {
                if (!config.enabled) continue;
                
                try {
                    const result = this.cleanupResourceType(resourceType, strategy[resourceType], options);
                    cleanupResults.resources[resourceType] = result;
                } catch (error) {
                    cleanupResults.errors.push({
                        resourceType,
                        error: error.message
                    });
                    this.log(`Error limpiando ${resourceType}: ${error.message}`, 'error');
                }
            }
            
            // Limpiar memoria si es necesario
            if (strategy.memory && strategy.memory.forceGC) {
                try {
                    const memoryResult = this.cleanupMemory(strategy.memory);
                    cleanupResults.memory = memoryResult;
                } catch (error) {
                    cleanupResults.errors.push({
                        resourceType: 'memory',
                        error: error.message
                    });
                    this.log(`Error limpiando memoria: ${error.message}`, 'error');
                }
            }
            
            // Finalizar limpieza
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            cleanupResults.endTime = endTime;
            cleanupResults.duration = duration;
            cleanupResults.success = cleanupResults.errors.length === 0;
            
            // Actualizar estado
            this.updateCleanupState(cleanupResults);
            
            // Agregar al historial
            this.addToCleanupHistory(cleanupResults);
            
            // Emitir evento
            this.emitEvent('auto-cleanup:completed', cleanupResults);
            
            this.log(`Limpieza completada en ${duration.toFixed(2)}ms`, 'success', cleanupResults);
            
            return cleanupResults;
            
        } catch (error) {
            this.log(`Error en limpieza: ${error.message}`, 'error');
            
            // Realizar rollback si está habilitado
            if (this.config.safety.enableRollback) {
                this.performRollback();
            }
            
            throw error;
        } finally {
            this.state.cleanupState.cleanupInProgress = false;
        }
    },

    // Limpiar tipo de recurso específico
    cleanupResourceType: function(resourceType, strategy, options) {
        const result = {
            before: this.getResourceCount(resourceType),
            cleaned: 0,
            after: 0,
            details: []
        };
        
        if (!strategy) {
            result.skipped = true;
            result.reason = 'No strategy defined';
            return result;
        }
        
        switch (resourceType) {
            case 'intervals':
                result.cleaned = this.cleanupIntervals(strategy);
                break;
                
            case 'timeouts':
                result.cleaned = this.cleanupTimeouts(strategy);
                break;
                
            case 'eventListeners':
                result.cleaned = this.cleanupEventListeners(strategy);
                break;
                
            case 'observers':
                result.cleaned = this.cleanupObservers(strategy);
                break;
                
            case 'promises':
                result.cleaned = this.cleanupPromises(strategy);
                break;
                
            case 'domReferences':
                result.cleaned = this.cleanupDOMReferences(strategy);
                break;
                
            case 'cache':
                result.cleaned = this.cleanupCache(strategy);
                break;
                
            default:
                result.skipped = true;
                result.reason = `Unknown resource type: ${resourceType}`;
                break;
        }
        
        result.after = this.getResourceCount(resourceType);
        result.efficiency = result.before > 0 ? result.cleaned / result.before : 0;
        
        return result;
    },

    // Limpiar intervals
    cleanupIntervals: function(strategy) {
        let cleaned = 0;
        const now = Date.now();
        
        // Usar ResourceTracker si está disponible
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            const intervals = ResourceTracker.state.resources.intervals;
            
            intervals.forEach((interval, id) => {
                const shouldClean = this.shouldCleanResource(interval, strategy, now);
                
                if (shouldClean) {
                    clearInterval(interval.id);
                    intervals.delete(id);
                    cleaned++;
                }
            });
        }
        
        return cleaned;
    },

    // Limpiar timeouts
    cleanupTimeouts: function(strategy) {
        let cleaned = 0;
        const now = Date.now();
        
        // Usar ResourceTracker si está disponible
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            const timeouts = ResourceTracker.state.resources.timeouts;
            
            timeouts.forEach((timeout, id) => {
                const shouldClean = this.shouldCleanResource(timeout, strategy, now);
                
                if (shouldClean) {
                    clearTimeout(timeout.id);
                    timeouts.delete(id);
                    cleaned++;
                }
            });
        }
        
        return cleaned;
    },

    // Limpiar event listeners
    cleanupEventListeners: function(strategy) {
        let cleaned = 0;
        const now = Date.now();
        
        // Usar ResourceTracker si está disponible
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            const listeners = ResourceTracker.state.resources.eventListeners;
            
            listeners.forEach((listener, id) => {
                const shouldClean = this.shouldCleanResource(listener, strategy, now);
                
                if (shouldClean) {
                    try {
                        listener.element.removeEventListener(listener.type, listener.handler);
                        listeners.delete(id);
                        cleaned++;
                    } catch (error) {
                        this.log(`Error removiendo event listener: ${error.message}`, 'warn');
                    }
                }
            });
        }
        
        return cleaned;
    },

    // Limpiar observers
    cleanupObservers: function(strategy) {
        let cleaned = 0;
        const now = Date.now();
        
        // Usar ResourceTracker si está disponible
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            const observers = ResourceTracker.state.resources.observers;
            
            observers.forEach((observer, id) => {
                const shouldClean = this.shouldCleanResource(observer, strategy, now);
                
                if (shouldClean) {
                    try {
                        observer.observer.disconnect();
                        observers.delete(id);
                        cleaned++;
                    } catch (error) {
                        this.log(`Error desconectando observer: ${error.message}`, 'warn');
                    }
                }
            });
        }
        
        return cleaned;
    },

    // Limpiar promises
    cleanupPromises: function(strategy) {
        let cleaned = 0;
        const now = Date.now();
        
        // Usar ResourceTracker si está disponible
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            const promises = ResourceTracker.state.resources.promises;
            
            promises.forEach((promise, id) => {
                const shouldClean = this.shouldCleanResource(promise, strategy, now);
                
                if (shouldClean) {
                    promises.delete(id);
                    cleaned++;
                }
            });
        }
        
        return cleaned;
    },

    // Limpiar referencias DOM
    cleanupDOMReferences: function(strategy) {
        let cleaned = 0;
        const now = Date.now();
        
        // Usar ResourceTracker si está disponible
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            const domRefs = ResourceTracker.state.resources.domReferences;
            
            domRefs.forEach((ref, id) => {
                const shouldClean = this.shouldCleanResource(ref, strategy, now);
                
                if (shouldClean) {
                    domRefs.delete(id);
                    cleaned++;
                }
            });
        }
        
        return cleaned;
    },

    // Limpiar caché
    cleanupCache: function(strategy) {
        let cleaned = 0;
        
        // Limpiar CacheManager si está disponible
        if (typeof CacheManager !== 'undefined' && CacheManager.cleanup) {
            const result = CacheManager.cleanup({
                maxAge: strategy.maxAge,
                maxPercentage: strategy.maxPercentage
            });
            cleaned = result.cleaned || 0;
        }
        
        // Limpiar ResourcePool si está disponible
        if (typeof ResourcePool !== 'undefined' && ResourcePool.cleanup) {
            const result = ResourcePool.cleanup({
                maxAge: strategy.maxAge,
                maxPercentage: strategy.maxPercentage
            });
            cleaned += result.cleaned || 0;
        }
        
        return cleaned;
    },

    // Limpiar memoria
    cleanupMemory: function(strategy) {
        const result = {
            before: this.getMemoryUsage(),
            gcTriggered: false,
            after: 0,
            freed: 0
        };
        
        // Verificar si se debe forzar GC
        if (strategy.forceGC && this.shouldTriggerGC(strategy)) {
            if (typeof GarbageCollectorHelper !== 'undefined' && GarbageCollectorHelper.forceGarbageCollection) {
                GarbageCollectorHelper.forceGarbageCollection();
                result.gcTriggered = true;
            }
        }
        
        // Medir memoria después del GC
        setTimeout(() => {
            result.after = this.getMemoryUsage();
            result.freed = result.before - result.after;
        }, 100);
        
        return result;
    },

    // Determinar si se debe limpiar un recurso
    shouldCleanResource: function(resource, strategy, now) {
        // Verificar edad máxima
        if (strategy.maxAge > 0) {
            const age = now - (resource.created || now);
            if (age > strategy.maxAge) {
                return true;
            }
        }
        
        // Verificar si es crítico
        if (this.config.safety.excludeCritical && resource.critical) {
            return false;
        }
        
        return false;
    },

    // Determinar si se debe forzar GC
    shouldTriggerGC: function(strategy) {
        if (!this.state.browserCapabilities.hasMemoryAPI) return false;
        
        const memory = performance.memory;
        const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        return usage >= strategy.threshold;
    },

    // Obtener conteo de recursos
    getResourceCount: function(resourceType) {
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            return ResourceTracker.state.resources[resourceType]?.size || 0;
        }
        
        return 0;
    },

    // Obtener uso de memoria
    getMemoryUsage: function() {
        if (this.state.browserCapabilities.hasMemoryAPI) {
            return performance.memory.usedJSHeapSize;
        }
        
        return 0;
    },

    // Verificar presión de memoria
    checkMemoryPressure: function() {
        if (!this.state.browserCapabilities.hasMemoryAPI) return;
        
        const memory = performance.memory;
        const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        const wasPressure = this.state.eventState.memoryPressure;
        this.state.eventState.memoryPressure = usage > 0.8;
        
        if (!wasPressure && this.state.eventState.memoryPressure) {
            this.triggerEventCleanup('memory-pressure');
        }
    },

    // Verificar sobrecarga de recursos
    checkResourceOverload: function() {
        const totalResources = this.getTotalResourceCount();
        const wasOverload = this.state.eventState.resourceOverload;
        this.state.eventState.resourceOverload = totalResources > 100;
        
        if (!wasOverload && this.state.eventState.resourceOverload) {
            this.triggerEventCleanup('resource-overload');
        }
    },

    // Verificar crecimiento del DOM
    checkDOMGrowth: function() {
        if (typeof document === 'undefined') return;
        
        const nodeCount = document.getElementsByTagName('*').length;
        // Esta es una verificación simplificada
        // Una implementación real necesitaría historial para detectar crecimiento
        
        this.state.eventState.domGrowth = nodeCount > 10000;
        
        if (this.state.eventState.domGrowth) {
            this.triggerEventCleanup('dom-growth');
        }
    },

    // Obtener conteo total de recursos
    getTotalResourceCount: function() {
        let total = 0;
        
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            for (const [type, resourceMap] of Object.entries(ResourceTracker.state.resources)) {
                total += resourceMap.size;
            }
        }
        
        return total;
    },

    // Actualizar estado de limpieza
    updateCleanupState: function(cleanupResults) {
        const now = Date.now();
        
        this.state.cleanupState.lastCleanup = now;
        this.state.cleanupState.cleanupCount++;
        
        if (cleanupResults.triggerType === 'scheduled') {
            this.state.cleanupState.lastScheduledCleanup = now;
            this.state.cleanupState.scheduledCleanupCount++;
        } else if (cleanupResults.triggerType === 'event') {
            this.state.cleanupState.lastEventCleanup = now;
            this.state.cleanupState.eventCleanupCount++;
        }
        
        // Actualizar estadísticas
        this.state.stats.totalCleanups++;
        this.state.stats.lastCleanupTime = now;
        this.state.stats.lastCleanupDuration = cleanupResults.duration;
        
        // Calcular recursos limpiados
        let totalResourcesCleaned = 0;
        for (const [resourceType, result] of Object.entries(cleanupResults.resources)) {
            totalResourcesCleaned += result.cleaned || 0;
        }
        this.state.stats.totalResourcesCleaned += totalResourcesCleaned;
        
        // Actualizar tiempo promedio
        const totalCleanups = this.state.stats.totalCleanups;
        this.state.stats.averageCleanupTime = 
            ((this.state.stats.averageCleanupTime * (totalCleanups - 1)) + cleanupResults.duration) / totalCleanups;
    },

    // Agregar al historial de limpieza
    addToCleanupHistory: function(cleanupResults) {
        this.state.cleanupHistory.push(cleanupResults);
        
        // Limitar historial
        if (this.state.cleanupHistory.length > 100) {
            this.state.cleanupHistory = this.state.cleanupHistory.slice(-50);
        }
    },

    // Realizar rollback
    performRollback: function() {
        this.log('Realizando rollback de limpieza', 'warn');
        
        // Implementación básica de rollback
        // En una implementación real, se restaurarían los recursos eliminados
        
        this.state.stats.rollbackCount++;
    },

    // Realizar limpieza final
    performFinalCleanup: function() {
        this.log('Realizando limpieza final', 'info');
        
        // Limpieza agresiva final
        this.performCleanup('final', 'aggressive');
        
        // Emitir evento de limpieza final
        this.emitEvent('auto-cleanup:final', {
            timestamp: Date.now(),
            stats: this.state.stats,
            history: this.state.cleanupHistory.slice(-10)
        });
    },

    // Pausar limpieza
    pauseCleanup: function() {
        // Limpiar todos los temporizadores
        if (this.state.cleanupTimers.auto) {
            clearInterval(this.state.cleanupTimers.auto);
            this.state.cleanupTimers.auto = null;
        }
        
        this.state.cleanupTimers.scheduled.forEach(timer => {
            clearInterval(timer.timer);
        });
        this.state.cleanupTimers.scheduled = [];
        
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
            this.memoryCheckInterval = null;
        }
        
        if (this.resourceCheckInterval) {
            clearInterval(this.resourceCheckInterval);
            this.resourceCheckInterval = null;
        }
        
        if (this.domCheckInterval) {
            clearInterval(this.domCheckInterval);
            this.domCheckInterval = null;
        }
        
        this.state.cleanupActive = false;
        this.log('Limpieza automática pausada', 'info');
    },

    // Reanudar limpieza
    resumeCleanup: function() {
        if (this.config.autoCleanup.enabled) {
            this.setupAutoCleanup();
        }
        
        if (this.config.scheduledCleanup.enabled) {
            this.setupScheduledCleanup();
        }
        
        if (this.config.eventDrivenCleanup.enabled) {
            this.setupEventDrivenCleanup();
        }
        
        this.state.cleanupActive = true;
        this.log('Limpieza automática reanudada', 'info');
    },

    // Emitir evento
    emitEvent: function(eventType, data) {
        if (typeof document !== 'undefined') {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    },

    // Obtener reporte de limpieza
    getCleanupReport: function() {
        return {
            timestamp: Date.now(),
            stats: this.state.stats,
            cleanupState: this.state.cleanupState,
            eventState: this.state.eventState,
            cleanupHistory: this.state.cleanupHistory.slice(-20),
            currentResources: this.getCurrentResourceCounts(),
            recommendations: this.generateCleanupRecommendations(),
            config: this.config
        };
    },

    // Obtener conteos actuales de recursos
    getCurrentResourceCounts: function() {
        const counts = {};
        
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            for (const [type, resourceMap] of Object.entries(ResourceTracker.state.resources)) {
                counts[type] = resourceMap.size;
            }
        }
        
        counts.total = Object.values(counts).reduce((sum, count) => sum + count, 0);
        
        if (this.state.browserCapabilities.hasMemoryAPI) {
            counts.memory = {
                used: performance.memory.usedJSHeapSize,
                percentage: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
            };
        }
        
        return counts;
    },

    // Generar recomendaciones de limpieza
    generateCleanupRecommendations: function() {
        const recommendations = [];
        const currentResources = this.getCurrentResourceCounts();
        
        // Recomendaciones basadas en recursos actuales
        if (currentResources.intervals > 30) {
            recommendations.push({
                priority: 'medium',
                type: 'intervals',
                message: 'Alto número de intervals activos',
                action: 'Considerar reducir intervals o limpiarlos más frecuentemente'
            });
        }
        
        if (currentResources.timeouts > 50) {
            recommendations.push({
                priority: 'medium',
                type: 'timeouts',
                message: 'Alto número de timeouts activos',
                action: 'Revisar timeouts pendientes y limpiar los no necesarios'
            });
        }
        
        if (currentResources.memory && currentResources.memory.percentage > 0.7) {
            recommendations.push({
                priority: 'high',
                type: 'memory',
                message: 'Uso de memoria elevado',
                action: 'Considerar limpieza agresiva o forzar garbage collection'
            });
        }
        
        // Recomendaciones basadas en estadísticas
        if (this.state.stats.averageCleanupTime > 3000) { // 3 segundos
            recommendations.push({
                priority: 'medium',
                type: 'performance',
                message: 'Tiempo de limpieza elevado',
                action: 'Optimizar estrategias de limpieza o reducir frecuencia'
            });
        }
        
        return recommendations;
    },

    // Obtener métricas actuales
    getCurrentMetrics: function() {
        return {
            ...this.state.stats,
            cleanupActive: this.state.cleanupActive,
            cleanupInProgress: this.state.cleanupState.cleanupInProgress,
            currentResources: this.getCurrentResourceCounts(),
            eventState: this.state.eventState,
            cleanupHistory: this.state.cleanupHistory.length
        };
    },

    // Reiniciar sistema
    reset: function() {
        this.log('Reiniciando AutoCleanup...');
        
        // Pausar limpieza
        this.pauseCleanup();
        
        // Reiniciar estado
        this.state.cleanupState = {
            lastCleanup: null,
            lastScheduledCleanup: null,
            lastEventCleanup: null,
            cleanupInProgress: false,
            cleanupCount: 0,
            scheduledCleanupCount: 0,
            eventCleanupCount: 0
        };
        
        this.state.cleanupHistory = [];
        this.state.eventState = {
            userActive: true,
            lastUserActivity: Date.now(),
            pageVisible: true,
            memoryPressure: false,
            resourceOverload: false,
            domGrowth: false
        };
        
        // Reiniciar estadísticas
        this.state.stats = {
            totalCleanups: 0,
            totalResourcesCleaned: 0,
            totalMemoryFreed: 0,
            averageCleanupTime: 0,
            lastCleanupTime: null,
            lastCleanupDuration: 0,
            cleanupErrors: 0,
            rollbackCount: 0
        };
        
        // Reanudar limpieza
        this.resumeCleanup();
        
        this.log('AutoCleanup reiniciado', 'success');
    },

    // Logging
    log: function(message, level = 'info', data = null) {
        if (!this.config.logging.enabled) return;
        
        const shouldLog = this.config.logging.level === 'debug' || 
                          (this.config.logging.level === 'info' && ['info', 'warn', 'error'].includes(level)) ||
                          (this.config.logging.level === 'warn' && ['warn', 'error'].includes(level)) ||
                          (this.config.logging.level === 'error' && level === 'error');
        
        if (shouldLog) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [AutoCleanup] [${level.toUpperCase()}] ${message}`;
            
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

// Exportar el AutoCleanup
export default AutoCleanup;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.AutoCleanup = AutoCleanup;
}