/**
 * Justice 2 Resource Tracker
 * Sistema de seguimiento de recursos para prevenir memory leaks
 * Proporciona tracking automático y liberación de recursos
 */

import { XSSProtection } from './xss-protection.js';

const ResourceTracker = {
    // Configuración del tracker
    config: {
        // Configuración de seguimiento
        enableAutoTracking: true,
        trackIntervals: true,
        trackTimeouts: true,
        trackEventListeners: true,
        trackObservers: true,
        trackDOMReferences: true,
        trackPromises: true,
        trackWorkers: true,
        trackWebSockets: true,
        trackBlobs: true,
        trackURLs: true,
        
        // Configuración de limpieza
        enableAutoCleanup: true,
        cleanupInterval: 30000,           // 30 segundos
        maxResourceAge: 300000,            // 5 minutos
        maxResourcesPerType: 1000,        // Máximo recursos por tipo
        
        // Configuración de alertas
        enableAlerts: true,
        alertThreshold: 50,               // Alertar si hay más de 50 recursos del mismo tipo
        
        // Configuración de logging
        enableLogging: true,
        logLevel: 'info'
    },

    // Estado del tracker
    state: {
        initialized: false,
        trackingActive: false,
        
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
        
        // Estadísticas
        stats: {
            totalCreated: 0,
            totalDestroyed: 0,
            currentActive: 0,
            peakActive: 0,
            byType: {},
            lastCleanup: Date.now()
        },
        
        // Configuración automática
        autoConfig: {
            originalSetInterval: null,
            originalSetTimeout: null,
            originalAddEventListener: null,
            originalRemoveEventListener: null,
            originalCreateObjectURL: null,
            originalRevokeObjectURL: null
        }
    },

    // Inicialización del ResourceTracker
    init: function() {
        if (this.state.initialized) {
            this.log('ResourceTracker ya está inicializado', 'warn');
            return;
        }

        try {
            this.log('Inicializando ResourceTracker...');
            
            // Configurar seguimiento automático
            if (this.config.enableAutoTracking) {
                this.setupAutoTracking();
            }
            
            // Configurar limpieza automática
            if (this.config.enableAutoCleanup) {
                this.setupAutoCleanup();
            }
            
            // Configurar manejadores de eventos de página
            this.setupPageEventHandlers();
            
            this.state.initialized = true;
            this.state.trackingActive = true;
            this.log('ResourceTracker inicializado correctamente', 'success');
            
            // Emitir evento de inicialización
            this.emitEvent('resource:tracker:initialized', {
                timestamp: Date.now(),
                config: this.config
            });
            
        } catch (error) {
            this.log('Error inicializando ResourceTracker: ' + error.message, 'error');
            throw error;
        }
    },

    // Configurar seguimiento automático
    setupAutoTracking: function() {
        if (typeof window === 'undefined') return;
        
        // Guardar funciones originales
        this.state.autoConfig.originalSetInterval = window.setInterval;
        this.state.autoConfig.originalSetTimeout = window.setTimeout;
        this.state.autoConfig.originalAddEventListener = EventTarget.prototype.addEventListener;
        this.state.autoConfig.originalRemoveEventListener = EventTarget.prototype.removeEventListener;
        
        // Sobrescribir funciones para tracking
        this.overrideSetInterval();
        this.overrideSetTimeout();
        this.overrideEventListeners();
        
        if (typeof URL !== 'undefined' && URL.createObjectURL) {
            this.state.autoConfig.originalCreateObjectURL = URL.createObjectURL;
            this.state.autoConfig.originalRevokeObjectURL = URL.revokeObjectURL;
            this.overrideURLAPI();
        }
        
        this.log('Seguimiento automático configurado', 'info');
    },

    // Sobrescribir setInterval
    overrideSetInterval: function() {
        const self = this;
        
        window.setInterval = function(callback, delay, ...args) {
            const intervalId = self.state.autoConfig.originalSetInterval.call(this, callback, delay, ...args);
            
            if (self.config.trackIntervals) {
                const resourceId = self.generateId();
                self.trackInterval(resourceId, intervalId, callback, delay, args);
            }
            
            return intervalId;
        };
    },

    // Sobrescribir setTimeout
    overrideSetTimeout: function() {
        const self = this;
        
        window.setTimeout = function(callback, delay, ...args) {
            const timeoutId = self.state.autoConfig.originalSetTimeout.call(this, callback, delay, ...args);
            
            if (self.config.trackTimeouts) {
                const resourceId = self.generateId();
                self.trackTimeout(resourceId, timeoutId, callback, delay, args);
            }
            
            return timeoutId;
        };
    },

    // Sobrescribir event listeners
    overrideEventListeners: function() {
        const self = this;
        
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            const result = self.state.autoConfig.originalAddEventListener.call(this, type, listener, options);
            
            if (self.config.trackEventListeners) {
                const resourceId = self.generateId();
                self.trackEventListener(resourceId, this, type, listener, options);
            }
            
            return result;
        };
        
        EventTarget.prototype.removeEventListener = function(type, listener, options) {
            const result = self.state.autoConfig.originalRemoveEventListener.call(this, type, listener, options);
            
            if (self.config.trackEventListeners) {
                self.untrackEventListener(this, type, listener);
            }
            
            return result;
        };
    },

    // Sobrescribir URL API
    overrideURLAPI: function() {
        const self = this;
        
        URL.createObjectURL = function(object) {
            const url = self.state.autoConfig.originalCreateObjectURL.call(this, object);
            
            if (self.config.trackURLs) {
                const resourceId = self.generateId();
                self.trackURL(resourceId, url, object);
            }
            
            return url;
        };
        
        URL.revokeObjectURL = function(url) {
            const result = self.state.autoConfig.originalRevokeObjectURL.call(this, url);
            
            if (self.config.trackURLs) {
                self.untrackURL(url);
            }
            
            return result;
        };
    },

    // Configurar limpieza automática
    setupAutoCleanup: function() {
        this.cleanupInterval = setInterval(() => {
            this.performAutoCleanup();
        }, this.config.cleanupInterval);
        
        this.log('Limpieza automática configurada', 'info');
    },

    // Configurar manejadores de eventos de página
    setupPageEventHandlers: function() {
        if (typeof window === 'undefined') return;
        
        // Limpiar al cambiar de página
        window.addEventListener('beforeunload', () => {
            this.cleanupAllResources();
        });
        
        // Limpiar al descargar la página
        window.addEventListener('unload', () => {
            this.cleanupAllResources();
        });
    },

    // Rastrear un interval
    trackInterval: function(resourceId, intervalId, callback, delay, args) {
        const resource = {
            id: resourceId,
            nativeId: intervalId,
            type: 'interval',
            callback,
            delay,
            args,
            timestamp: Date.now(),
            stackTrace: this.getStackTrace()
        };
        
        this.state.resources.intervals.set(resourceId, resource);
        this.updateStats('interval', 'created');
        
        return resourceId;
    },

    // Rastrear un timeout
    trackTimeout: function(resourceId, timeoutId, callback, delay, args) {
        const resource = {
            id: resourceId,
            nativeId: timeoutId,
            type: 'timeout',
            callback,
            delay,
            args,
            timestamp: Date.now(),
            stackTrace: this.getStackTrace()
        };
        
        this.state.resources.timeouts.set(resourceId, resource);
        this.updateStats('timeout', 'created');
        
        return resourceId;
    },

    // Rastrear un event listener
    trackEventListener: function(resourceId, element, event, handler, options) {
        const resource = {
            id: resourceId,
            type: 'eventListener',
            element,
            event,
            handler,
            options,
            timestamp: Date.now(),
            stackTrace: this.getStackTrace()
        };
        
        this.state.resources.eventListeners.set(resourceId, resource);
        this.updateStats('eventListener', 'created');
        
        return resourceId;
    },

    // Dejar de rastrear un event listener
    untrackEventListener: function(element, event, handler) {
        for (const [id, resource] of this.state.resources.eventListeners) {
            if (resource.element === element && 
                resource.event === event && 
                resource.handler === handler) {
                this.state.resources.eventListeners.delete(id);
                this.updateStats('eventListener', 'destroyed');
                return true;
            }
        }
        return false;
    },

    // Rastrear un observer
    trackObserver: function(resourceId, observer, type, target, options) {
        const resource = {
            id: resourceId,
            type: 'observer',
            observer,
            observerType: type,
            target,
            options,
            timestamp: Date.now(),
            stackTrace: this.getStackTrace()
        };
        
        this.state.resources.observers.set(resourceId, resource);
        this.updateStats('observer', 'created');
        
        return resourceId;
    },

    // Rastrear una referencia DOM
    trackDOMReference: function(resourceId, element, metadata = {}) {
        const resource = {
            id: resourceId,
            type: 'domReference',
            element,
            metadata,
            timestamp: Date.now(),
            stackTrace: this.getStackTrace()
        };
        
        this.state.resources.domReferences.set(resourceId, resource);
        this.updateStats('domReference', 'created');
        
        return resourceId;
    },

    // Rastrear una promesa
    trackPromise: function(resourceId, promise, metadata = {}) {
        const resource = {
            id: resourceId,
            type: 'promise',
            promise,
            metadata,
            timestamp: Date.now(),
            stackTrace: this.getStackTrace()
        };
        
        this.state.resources.promises.set(resourceId, resource);
        this.updateStats('promise', 'created');
        
        // Limpiar automáticamente cuando se resuelva
        promise.finally(() => {
            this.untrackPromise(resourceId);
        });
        
        return resourceId;
    },

    // Dejar de rastrear una promesa
    untrackPromise: function(resourceId) {
        if (this.state.resources.promises.has(resourceId)) {
            this.state.resources.promises.delete(resourceId);
            this.updateStats('promise', 'destroyed');
            return true;
        }
        return false;
    },

    // Rastrear un worker
    trackWorker: function(resourceId, worker, type = 'web') {
        const resource = {
            id: resourceId,
            type: 'worker',
            workerType: type,
            worker,
            timestamp: Date.now(),
            stackTrace: this.getStackTrace()
        };
        
        this.state.resources.workers.set(resourceId, resource);
        this.updateStats('worker', 'created');
        
        return resourceId;
    },

    // Rastrear un WebSocket
    trackWebSocket: function(resourceId, webSocket, url) {
        const resource = {
            id: resourceId,
            type: 'webSocket',
            webSocket,
            url,
            timestamp: Date.now(),
            stackTrace: this.getStackTrace()
        };
        
        this.state.resources.webSockets.set(resourceId, resource);
        this.updateStats('webSocket', 'created');
        
        return resourceId;
    },

    // Rastrear un blob
    trackBlob: function(resourceId, blob, metadata = {}) {
        const resource = {
            id: resourceId,
            type: 'blob',
            blob,
            size: blob.size,
            metadata,
            timestamp: Date.now(),
            stackTrace: this.getStackTrace()
        };
        
        this.state.resources.blobs.set(resourceId, resource);
        this.updateStats('blob', 'created');
        
        return resourceId;
    },

    // Rastrear una URL
    trackURL: function(resourceId, url, object) {
        const resource = {
            id: resourceId,
            type: 'url',
            url,
            object,
            timestamp: Date.now(),
            stackTrace: this.getStackTrace()
        };
        
        this.state.resources.urls.set(resourceId, resource);
        this.updateStats('url', 'created');
        
        return resourceId;
    },

    // Dejar de rastrear una URL
    untrackURL: function(url) {
        for (const [id, resource] of this.state.resources.urls) {
            if (resource.url === url) {
                this.state.resources.urls.delete(id);
                this.updateStats('url', 'destroyed');
                return true;
            }
        }
        return false;
    },

    // Realizar limpieza automática
    performAutoCleanup: function() {
        const now = Date.now();
        let cleaned = 0;
        
        // Limpiar recursos antiguos
        for (const [type, resources] of Object.entries(this.state.resources)) {
            for (const [id, resource] of resources) {
                if (now - resource.timestamp > this.config.maxResourceAge) {
                    this.destroyResource(type, id);
                    cleaned++;
                }
            }
        }
        
        // Verificar límites por tipo
        for (const [type, resources] of Object.entries(this.state.resources)) {
            if (resources.size > this.config.maxResourcesPerType) {
                const excess = resources.size - this.config.maxResourcesPerType;
                const oldestResources = Array.from(resources.entries())
                    .sort((a, b) => a[1].timestamp - b[1].timestamp)
                    .slice(0, excess);
                
                for (const [id] of oldestResources) {
                    this.destroyResource(type, id);
                    cleaned++;
                }
            }
        }
        
        this.state.stats.lastCleanup = now;
        
        if (cleaned > 0) {
            this.log(`Limpieza automática: ${cleaned} recursos eliminados`, 'info');
            
            // Emitir alerta si se limpiaron muchos recursos
            if (cleaned > 10) {
                this.raiseAlert('mass-cleanup', {
                    cleaned,
                    timestamp: now
                }, 'warning');
            }
        }
        
        return cleaned;
    },

    // Destruir un recurso
    destroyResource: function(type, id) {
        const resources = this.state.resources[type];
        if (!resources || !resources.has(id)) return false;
        
        const resource = resources.get(id);
        
        try {
            switch (type) {
                case 'intervals':
                    clearInterval(resource.nativeId);
                    break;
                case 'timeouts':
                    clearTimeout(resource.nativeId);
                    break;
                case 'eventListeners':
                    resource.element.removeEventListener(
                        resource.event, 
                        resource.handler, 
                        resource.options
                    );
                    break;
                case 'observers':
                    if (resource.observer && typeof resource.observer.disconnect === 'function') {
                        resource.observer.disconnect();
                    }
                    break;
                case 'workers':
                    if (resource.worker && typeof resource.worker.terminate === 'function') {
                        resource.worker.terminate();
                    }
                    break;
                case 'webSockets':
                    if (resource.webSocket && resource.webSocket.readyState === WebSocket.OPEN) {
                        resource.webSocket.close();
                    }
                    break;
                case 'urls':
                    if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
                        URL.revokeObjectURL(resource.url);
                    }
                    break;
            }
            
            resources.delete(id);
            this.updateStats(type, 'destroyed');
            return true;
            
        } catch (error) {
            this.log(`Error destruyendo recurso ${type}:${id}: ${error.message}`, 'error');
            return false;
        }
    },

    // Limpiar todos los recursos
    cleanupAllResources: function() {
        let totalCleaned = 0;
        
        for (const [type, resources] of Object.entries(this.state.resources)) {
            for (const id of resources.keys()) {
                if (this.destroyResource(type, id)) {
                    totalCleaned++;
                }
            }
        }
        
        this.log(`Limpieza total: ${totalCleaned} recursos eliminados`, 'info');
        return totalCleaned;
    },

    // Actualizar estadísticas
    updateStats: function(type, action) {
        if (!this.state.stats.byType[type]) {
            this.state.stats.byType[type] = {
                created: 0,
                destroyed: 0,
                active: 0
            };
        }
        
        if (action === 'created') {
            this.state.stats.totalCreated++;
            this.state.stats.byType[type].created++;
            this.state.stats.byType[type].active++;
            this.state.stats.currentActive++;
            this.state.stats.peakActive = Math.max(
                this.state.stats.peakActive, 
                this.state.stats.currentActive
            );
            
            // Verificar umbral de alerta
            if (this.config.enableAlerts && 
                this.state.stats.byType[type].active > this.config.alertThreshold) {
                this.raiseAlert('resource-threshold', {
                    type,
                    count: this.state.stats.byType[type].active,
                    threshold: this.config.alertThreshold
                }, 'warning');
            }
            
        } else if (action === 'destroyed') {
            this.state.stats.totalDestroyed++;
            this.state.stats.byType[type].destroyed++;
            this.state.stats.byType[type].active--;
            this.state.stats.currentActive--;
        }
    },

    // Obtener stack trace
    getStackTrace: function() {
        try {
            throw new Error();
        } catch (e) {
            return e.stack || '';
        }
    },

    // Emitir alerta
    raiseAlert: function(type, data, severity = 'warning') {
        if (!this.config.enableAlerts) return;
        
        this.log(`Alerta de recursos: ${type} - ${JSON.stringify(data)}`, severity);
        
        // Emitir evento de alerta
        this.emitEvent('resource:alert', {
            type,
            severity,
            data,
            timestamp: Date.now()
        });
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
        return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Obtener reporte de recursos
    getResourceReport: function() {
        const resources = {};
        
        for (const [type, resourceMap] of Object.entries(this.state.resources)) {
            resources[type] = {
                count: resourceMap.size,
                items: Array.from(resourceMap.values()).map(resource => ({
                    id: resource.id,
                    timestamp: resource.timestamp,
                    age: Date.now() - resource.timestamp,
                    stackTrace: resource.stackTrace ? resource.stackTrace.split('\n')[1] : null
                }))
            };
        }
        
        return {
            timestamp: Date.now(),
            stats: this.state.stats,
            resources,
            config: this.config
        };
    },

    // Obtener estadísticas actuales
    getCurrentStats: function() {
        return {
            ...this.state.stats,
            resourceCounts: Object.fromEntries(
                Object.entries(this.state.resources).map(([type, resources]) => [
                    type, resources.size
                ])
            )
        };
    },

    // Pausar seguimiento
    pauseTracking: function() {
        this.state.trackingActive = false;
        this.log('Seguimiento de recursos pausado', 'info');
    },

    // Reanudar seguimiento
    resumeTracking: function() {
        this.state.trackingActive = true;
        this.log('Seguimiento de recursos reanudado', 'info');
    },

    // Reiniciar tracker
    reset: function() {
        this.log('Reiniciando ResourceTracker...');
        
        // Limpiar todos los recursos
        this.cleanupAllResources();
        
        // Reiniciar estadísticas
        this.state.stats = {
            totalCreated: 0,
            totalDestroyed: 0,
            currentActive: 0,
            peakActive: 0,
            byType: {},
            lastCleanup: Date.now()
        };
        
        this.log('ResourceTracker reiniciado', 'success');
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
            const logMessage = `[${timestamp}] [ResourceTracker] [${level.toUpperCase()}] ${message}`;
            
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

// Exportar el ResourceTracker
export default ResourceTracker;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.ResourceTracker = ResourceTracker;
}