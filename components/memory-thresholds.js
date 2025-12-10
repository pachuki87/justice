/**
 * Justice 2 Memory Thresholds
 * Sistema de gestión de umbrales de memoria y alertas automáticas
 * Proporciona configuración flexible y notificaciones inteligentes
 */

import { XSSProtection } from './xss-protection.js';

const MemoryThresholds = {
    // Configuración de umbrales
    config: {
        // Umbrales de memoria (porcentaje del heap total)
        memory: {
            // Umbrales de advertencia
            warning: {
                enabled: true,
                threshold: 0.7,              // 70% del heap
                consecutive: 3,              // 3 mediciones consecutivas
                cooldown: 60000,             // 1 minuto cooldown
                autoActions: ['log', 'notify', 'cleanup']
            },
            
            // Umbrales críticos
            critical: {
                enabled: true,
                threshold: 0.85,             // 85% del heap
                consecutive: 2,              // 2 mediciones consecutivas
                cooldown: 30000,             // 30 segundos cooldown
                autoActions: ['log', 'notify', 'cleanup', 'emergency_gc', 'alert']
            },
            
            // Umbrales de emergencia
            emergency: {
                enabled: true,
                threshold: 0.95,             // 95% del heap
                consecutive: 1,              // 1 medición
                cooldown: 10000,             // 10 segundos cooldown
                autoActions: ['log', 'notify', 'cleanup', 'emergency_gc', 'alert', 'force_cleanup']
            }
        },
        
        // Umbrales de recursos
        resources: {
            intervals: {
                enabled: true,
                threshold: 50,               // 50 intervals activos
                consecutive: 2,
                cooldown: 30000,
                autoActions: ['log', 'cleanup']
            },
            
            timeouts: {
                enabled: true,
                threshold: 100,              // 100 timeouts activos
                consecutive: 2,
                cooldown: 30000,
                autoActions: ['log', 'cleanup']
            },
            
            eventListeners: {
                enabled: true,
                threshold: 200,             // 200 event listeners
                consecutive: 2,
                cooldown: 30000,
                autoActions: ['log', 'cleanup']
            },
            
            observers: {
                enabled: true,
                threshold: 20,               // 20 observers
                consecutive: 2,
                cooldown: 30000,
                autoActions: ['log', 'cleanup']
            },
            
            promises: {
                enabled: true,
                threshold: 50,               // 50 promises pendientes
                consecutive: 2,
                cooldown: 30000,
                autoActions: ['log', 'cleanup']
            }
        },
        
        // Umbrales de DOM
        dom: {
            nodes: {
                enabled: true,
                threshold: 10000,            // 10,000 nodos
                consecutive: 2,
                cooldown: 30000,
                autoActions: ['log', 'cleanup']
            },
            
            eventListeners: {
                enabled: true,
                threshold: 500,              // 500 event listeners DOM
                consecutive: 2,
                cooldown: 30000,
                autoActions: ['log', 'cleanup']
            }
        },
        
        // Umbrales de rendimiento
        performance: {
            responseTime: {
                enabled: true,
                threshold: 1000,             // 1 segundo
                consecutive: 3,
                cooldown: 30000,
                autoActions: ['log', 'notify']
            },
            
            memoryGrowth: {
                enabled: true,
                threshold: 0.1,              // 10% crecimiento
                timeWindow: 60000,           // 1 minuto ventana
                cooldown: 60000,
                autoActions: ['log', 'notify', 'cleanup']
            }
        },
        
        // Configuración de acciones automáticas
        autoActions: {
            log: {
                enabled: true,
                level: 'warn',
                includeStackTrace: false
            },
            
            notify: {
                enabled: true,
                methods: ['console', 'event', 'notification'],
                persistent: false
            },
            
            cleanup: {
                enabled: true,
                aggressiveness: 'moderate',   // 'conservative', 'moderate', 'aggressive'
                excludeCritical: true
            },
            
            emergency_gc: {
                enabled: true,
                maxAttempts: 3,
                delay: 1000                  // 1 segundo entre intentos
            },
            
            alert: {
                enabled: true,
                methods: ['console', 'event', 'notification'],
                persistent: true
            },
            
            force_cleanup: {
                enabled: true,
                aggressiveness: 'aggressive',
                includeCritical: false
            }
        },
        
        // Configuración general
        monitoring: {
            enabled: true,
            interval: 5000,                  // 5 segundos
            historySize: 100,                // 100 mediciones históricas
            enableTrends: true,
            enablePredictions: false
        },
        
        // Configuración de logging
        logging: {
            enabled: true,
            level: 'info',
            includeMetrics: true,
            includeContext: true,
            maxLogSize: 1000                 // 1000 logs
        }
    },

    // Estado del sistema
    state: {
        initialized: false,
        monitoringActive: false,
        
        // Estado de umbrales
        thresholdState: {
            memory: {
                warning: { count: 0, lastTriggered: 0, active: false },
                critical: { count: 0, lastTriggered: 0, active: false },
                emergency: { count: 0, lastTriggered: 0, active: false }
            },
            resources: {},
            dom: {},
            performance: {}
        },
        
        // Historial de mediciones
        measurementHistory: {
            memory: [],
            resources: [],
            dom: [],
            performance: []
        },
        
        // Historial de alertas
        alertHistory: [],
        
        // Estadísticas
        stats: {
            totalMeasurements: 0,
            totalAlerts: 0,
            totalAutoCleanups: 0,
            totalEmergencyGC: 0,
            lastMeasurement: null,
            lastAlert: null,
            uptime: Date.now()
        },
        
        // Configuración de navegadores
        browserCapabilities: {
            hasMemoryAPI: false,
            hasPerformanceAPI: false,
            hasNotificationAPI: false
        }
    },

    // Inicialización del sistema
    init: function() {
        if (this.state.initialized) {
            this.log('MemoryThresholds ya está inicializado', 'warn');
            return;
        }

        try {
            this.log('Inicializando MemoryThresholds...');
            
            // Detectar capacidades del navegador
            this.detectBrowserCapabilities();
            
            // Inicializar estado de umbrales
            this.initializeThresholdState();
            
            // Solicitar permisos de notificación
            this.requestNotificationPermissions();
            
            // Configurar monitoreo
            this.setupMonitoring();
            
            // Configurar manejadores de eventos
            this.setupEventHandlers();
            
            this.state.initialized = true;
            this.state.monitoringActive = true;
            this.log('MemoryThresholds inicializado correctamente', 'success');
            
            // Emitir evento de inicialización
            this.emitEvent('memory:thresholds:initialized', {
                timestamp: Date.now(),
                capabilities: this.state.browserCapabilities,
                config: this.config
            });
            
        } catch (error) {
            this.log('Error inicializando MemoryThresholds: ' + error.message, 'error');
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
        
        if (typeof Notification !== 'undefined') {
            this.state.browserCapabilities.hasNotificationAPI = true;
        }
        
        this.log('Capacidades del navegador detectadas', 'info', this.state.browserCapabilities);
    },

    // Inicializar estado de umbrales
    initializeThresholdState: function() {
        // Inicializar umbrales de recursos
        for (const [resourceType, config] of Object.entries(this.config.resources)) {
            this.state.thresholdState.resources[resourceType] = {
                count: 0,
                lastTriggered: 0,
                active: false
            };
        }
        
        // Inicializar umbrales de DOM
        for (const [domType, config] of Object.entries(this.config.dom)) {
            this.state.thresholdState.dom[domType] = {
                count: 0,
                lastTriggered: 0,
                active: false
            };
        }
        
        // Inicializar umbrales de rendimiento
        for (const [perfType, config] of Object.entries(this.config.performance)) {
            this.state.thresholdState.performance[perfType] = {
                count: 0,
                lastTriggered: 0,
                active: false
            };
        }
        
        this.log('Estado de umbrales inicializado', 'info');
    },

    // Solicitar permisos de notificación
    requestNotificationPermissions: function() {
        if (this.state.browserCapabilities.hasNotificationAPI && 
            this.config.autoActions.notify.enabled && 
            this.config.autoActions.notify.methods.includes('notification')) {
            
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    this.log(`Permiso de notificación: ${permission}`, 'info');
                });
            }
        }
    },

    // Configurar monitoreo
    setupMonitoring: function() {
        if (!this.config.monitoring.enabled) return;
        
        this.monitoringInterval = setInterval(() => {
            this.performMeasurement();
        }, this.config.monitoring.interval);
        
        this.log('Monitoreo configurado', 'info');
    },

    // Configurar manejadores de eventos
    setupEventHandlers: function() {
        if (typeof window !== 'undefined') {
            // Pausar monitoreo cuando la página está oculta
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseMonitoring();
                } else {
                    this.resumeMonitoring();
                }
            });
            
            // Capturar medición final al cambiar de página
            window.addEventListener('beforeunload', () => {
                this.performFinalMeasurement();
            });
        }
    },

    // Realizar medición
    performMeasurement: function() {
        const measurement = {
            timestamp: Date.now(),
            memory: this.measureMemory(),
            resources: this.measureResources(),
            dom: this.measureDOM(),
            performance: this.measurePerformance()
        };
        
        // Agregar al historial
        this.addToHistory(measurement);
        
        // Verificar umbrales
        this.checkThresholds(measurement);
        
        // Actualizar estadísticas
        this.updateStatistics(measurement);
        
        // Emitir evento de medición
        this.emitEvent('memory:thresholds:measurement', measurement);
        
        return measurement;
    },

    // Medir memoria
    measureMemory: function() {
        if (!this.state.browserCapabilities.hasMemoryAPI) {
            return {
                available: false,
                message: 'Memory API no disponible'
            };
        }
        
        const memory = performance.memory;
        return {
            available: true,
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            percentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
            allocated: memory.totalJSHeapSize - memory.usedJSHeapSize,
            fragmentation: this.calculateFragmentation(memory)
        };
    },

    // Medir recursos
    measureResources: function() {
        const resources = {};
        
        // Obtener desde ResourceTracker si está disponible
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            for (const [type, resourceMap] of Object.entries(ResourceTracker.state.resources)) {
                resources[type] = resourceMap.size;
            }
        } else {
            // Estimación básica
            resources.intervals = this.estimateIntervals();
            resources.timeouts = this.estimateTimeouts();
            resources.eventListeners = this.estimateEventListeners();
            resources.observers = this.estimateObservers();
            resources.promises = this.estimatePromises();
        }
        
        resources.total = Object.values(resources).reduce((sum, count) => sum + count, 0);
        
        return resources;
    },

    // Medir DOM
    measureDOM: function() {
        if (typeof document === 'undefined') {
            return {
                available: false,
                message: 'DOM no disponible'
            };
        }
        
        return {
            available: true,
            nodes: document.getElementsByTagName('*').length,
            elements: document.querySelectorAll('*').length,
            eventListeners: this.estimateDOMEventListeners(),
            memoryUsage: this.estimateDOMMemoryUsage()
        };
    },

    // Medir rendimiento
    measurePerformance: function() {
        if (!this.state.browserCapabilities.hasPerformanceAPI) {
            return {
                available: false,
                message: 'Performance API no disponible'
            };
        }
        
        const now = performance.now();
        const navigation = performance.getEntriesByType('navigation')[0];
        
        return {
            available: true,
            now,
            responseTime: this.calculateResponseTime(),
            memoryGrowth: this.calculateMemoryGrowth(),
            loadTime: navigation ? navigation.loadEventEnd - navigation.navigationStart : null
        };
    },

    // Calcular fragmentación
    calculateFragmentation: function(memory) {
        const allocated = memory.totalJSHeapSize;
        const used = memory.usedJSHeapSize;
        
        if (allocated === 0) return 0;
        
        return (allocated - used) / allocated;
    },

    // Estimar intervals
    estimateIntervals: function() {
        // Estimación básica
        return 0;
    },

    // Estimar timeouts
    estimateTimeouts: function() {
        // Estimación básica
        return 0;
    },

    // Estimar event listeners
    estimateEventListeners: function() {
        // Estimación básica
        return 0;
    },

    // Estimar observers
    estimateObservers: function() {
        // Estimación básica
        return 0;
    },

    // Estimar promises
    estimatePromises: function() {
        // Estimación básica
        return 0;
    },

    // Estimar event listeners del DOM
    estimateDOMEventListeners: function() {
        if (typeof document === 'undefined') return 0;
        
        let count = 0;
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
        return nodes.length * 200; // ~200 bytes por nodo
    },

    // Calcular tiempo de respuesta
    calculateResponseTime: function() {
        // Estimación básica
        return 0;
    },

    // Calcular crecimiento de memoria
    calculateMemoryGrowth: function() {
        const memoryHistory = this.state.measurementHistory.memory;
        
        if (memoryHistory.length < 2) return 0;
        
        const recent = memoryHistory.slice(-10);
        const first = recent[0];
        const last = recent[recent.length - 1];
        
        if (!first.memory.available || !last.memory.available) return 0;
        
        const timeDiff = last.timestamp - first.timestamp;
        const memoryDiff = last.memory.percentage - first.memory.percentage;
        
        return memoryDiff / timeDiff * 1000; // Crecimiento por segundo
    },

    // Agregar al historial
    addToHistory: function(measurement) {
        // Agregar memoria
        this.state.measurementHistory.memory.push(measurement);
        
        // Limitar historial
        const maxSize = this.config.monitoring.historySize;
        if (this.state.measurementHistory.memory.length > maxSize) {
            this.state.measurementHistory.memory = this.state.measurementHistory.memory.slice(-maxSize);
        }
    },

    // Verificar umbrales
    checkThresholds: function(measurement) {
        // Verificar umbrales de memoria
        this.checkMemoryThresholds(measurement.memory);
        
        // Verificar umbrales de recursos
        this.checkResourceThresholds(measurement.resources);
        
        // Verificar umbrales de DOM
        this.checkDOMThresholds(measurement.dom);
        
        // Verificar umbrales de rendimiento
        this.checkPerformanceThresholds(measurement.performance);
    },

    // Verificar umbrales de memoria
    checkMemoryThresholds: function(memory) {
        if (!memory.available) return;
        
        const percentage = memory.percentage;
        
        // Verificar emergencia
        this.checkSingleThreshold('memory', 'emergency', percentage, this.config.memory.emergency);
        
        // Verificar crítico
        this.checkSingleThreshold('memory', 'critical', percentage, this.config.memory.critical);
        
        // Verificar advertencia
        this.checkSingleThreshold('memory', 'warning', percentage, this.config.memory.warning);
    },

    // Verificar umbrales de recursos
    checkResourceThresholds: function(resources) {
        for (const [resourceType, count] of Object.entries(resources)) {
            if (resourceType === 'total') continue;
            
            const config = this.config.resources[resourceType];
            if (!config || !config.enabled) continue;
            
            this.checkSingleThreshold('resources', resourceType, count, config);
        }
    },

    // Verificar umbrales de DOM
    checkDOMThresholds: function(dom) {
        if (!dom.available) return;
        
        // Verificar nodos
        this.checkSingleThreshold('dom', 'nodes', dom.nodes, this.config.dom.nodes);
        
        // Verificar event listeners
        this.checkSingleThreshold('dom', 'eventListeners', dom.eventListeners, this.config.dom.eventListeners);
    },

    // Verificar umbrales de rendimiento
    checkPerformanceThresholds: function(performance) {
        if (!performance.available) return;
        
        // Verificar tiempo de respuesta
        this.checkSingleThreshold('performance', 'responseTime', performance.responseTime, this.config.performance.responseTime);
        
        // Verificar crecimiento de memoria
        this.checkSingleThreshold('performance', 'memoryGrowth', performance.memoryGrowth, this.config.performance.memoryGrowth);
    },

    // Verificar umbral individual
    checkSingleThreshold: function(category, type, value, config) {
        if (!config.enabled) return;
        
        const now = Date.now();
        const thresholdState = this.state.thresholdState[category][type];
        
        // Verificar cooldown
        if (thresholdState.lastTriggered && (now - thresholdState.lastTriggered) < config.cooldown) {
            return;
        }
        
        // Verificar si se supera el umbral
        const thresholdExceeded = this.isThresholdExceeded(type, value, config);
        
        if (thresholdExceeded) {
            // Incrementar contador
            thresholdState.count++;
            
            // Verificar si se alcanzó el consecutivo requerido
            if (thresholdState.count >= config.consecutive) {
                // Disparar alerta
                this.triggerThresholdAlert(category, type, value, config);
                
                // Reiniciar contador
                thresholdState.count = 0;
                thresholdState.lastTriggered = now;
                thresholdState.active = true;
            }
        } else {
            // Reiniciar contador si no se supera
            thresholdState.count = 0;
            thresholdState.active = false;
        }
    },

    // Verificar si se supera el umbral
    isThresholdExceeded: function(type, value, config) {
        // Para umbrales de porcentaje
        if (typeof config.threshold === 'number' && config.threshold < 1) {
            return value >= config.threshold;
        }
        
        // Para umbrales absolutos
        if (typeof config.threshold === 'number' && config.threshold >= 1) {
            return value >= config.threshold;
        }
        
        // Para umbrales de tiempo
        if (type.includes('Time') || type.includes('Growth')) {
            return value >= config.threshold;
        }
        
        return false;
    },

    // Disparar alerta de umbral
    triggerThresholdAlert: function(category, type, value, config) {
        const alert = {
            id: `${category}-${type}-${Date.now()}`,
            category,
            type,
            value,
            threshold: config.threshold,
            severity: this.getAlertSeverity(category, type),
            timestamp: Date.now(),
            autoActions: config.autoActions
        };
        
        // Ejecutar acciones automáticas
        this.executeAutoActions(alert);
        
        // Agregar al historial
        this.state.alertHistory.push(alert);
        
        // Limitar historial
        if (this.state.alertHistory.length > 100) {
            this.state.alertHistory = this.state.alertHistory.slice(-50);
        }
        
        // Actualizar estadísticas
        this.state.stats.totalAlerts++;
        this.state.stats.lastAlert = alert.timestamp;
        
        // Emitir evento de alerta
        this.emitEvent('memory:thresholds:alert', alert);
        
        this.log(`ALERTA: Umbral superado - ${category}.${type}`, 'warn', alert);
    },

    // Obtener severidad de alerta
    getAlertSeverity: function(category, type) {
        if (category === 'memory') {
            if (type === 'emergency') return 'critical';
            if (type === 'critical') return 'high';
            if (type === 'warning') return 'medium';
        }
        
        if (category === 'performance') {
            return 'medium';
        }
        
        return 'low';
    },

    // Ejecutar acciones automáticas
    executeAutoActions: function(alert) {
        const actions = alert.autoActions || [];
        
        for (const action of actions) {
            try {
                this.executeAutoAction(action, alert);
            } catch (error) {
                this.log(`Error ejecutando acción automática ${action}: ${error.message}`, 'error');
            }
        }
    },

    // Ejecutar acción automática individual
    executeAutoAction: function(action, alert) {
        const actionConfig = this.config.autoActions[action];
        if (!actionConfig || !actionConfig.enabled) return;
        
        switch (action) {
            case 'log':
                this.executeLogAction(alert, actionConfig);
                break;
                
            case 'notify':
                this.executeNotifyAction(alert, actionConfig);
                break;
                
            case 'cleanup':
                this.executeCleanupAction(alert, actionConfig);
                break;
                
            case 'emergency_gc':
                this.executeEmergencyGCAction(alert, actionConfig);
                break;
                
            case 'alert':
                this.executeAlertAction(alert, actionConfig);
                break;
                
            case 'force_cleanup':
                this.executeForceCleanupAction(alert, actionConfig);
                break;
        }
    },

    // Ejecutar acción de log
    executeLogAction: function(alert, config) {
        const message = `UMBRAL SUPERADO: ${alert.category}.${alert.type} = ${alert.value} (umbral: ${alert.threshold})`;
        const level = config.level || 'warn';
        
        this.log(message, level, {
            alert,
            stackTrace: config.includeStackTrace ? new Error().stack : null
        });
    },

    // Ejecutar acción de notificación
    executeNotifyAction: function(alert, config) {
        const methods = config.methods || ['console'];
        
        for (const method of methods) {
            switch (method) {
                case 'console':
                    console.log(`NOTIFICACIÓN: ${alert.category}.${alert.type} superado`, alert);
                    break;
                    
                case 'event':
                    this.emitEvent('memory:thresholds:notification', alert);
                    break;
                    
                case 'notification':
                    this.sendBrowserNotification(alert);
                    break;
            }
        }
    },

    // Enviar notificación del navegador
    sendBrowserNotification: function(alert) {
        if (!this.state.browserCapabilities.hasNotificationAPI) return;
        
        if (Notification.permission === 'granted') {
            new Notification(`Alerta de Memoria: ${alert.type}`, {
                body: `Valor: ${alert.value}, Umbral: ${alert.threshold}`,
                icon: '/images/alert-icon.png',
                tag: `memory-${alert.category}-${alert.type}`
            });
        }
    },

    // Ejecutar acción de limpieza
    executeCleanupAction: function(alert, config) {
        this.log('Ejecutando limpieza automática', 'info');
        
        // Usar MemoryManager si está disponible
        if (typeof MemoryManager !== 'undefined' && MemoryManager.cleanup) {
            MemoryManager.cleanup({
                aggressiveness: config.aggressiveness || 'moderate',
                excludeCritical: config.excludeCritical !== false
            });
        }
        
        this.state.stats.totalAutoCleanups++;
    },

    // Ejecutar acción de GC de emergencia
    executeEmergencyGCAction: function(alert, config) {
        this.log('Ejecutando GC de emergencia', 'warn');
        
        // Usar GarbageCollectorHelper si está disponible
        if (typeof GarbageCollectorHelper !== 'undefined' && GarbageCollectorHelper.forceGarbageCollection) {
            const maxAttempts = config.maxAttempts || 3;
            const delay = config.delay || 1000;
            
            let attempts = 0;
            const attemptGC = () => {
                if (attempts < maxAttempts) {
                    GarbageCollectorHelper.forceGarbageCollection();
                    attempts++;
                    
                    if (attempts < maxAttempts) {
                        setTimeout(attemptGC, delay);
                    }
                }
            };
            
            attemptGC();
        }
        
        this.state.stats.totalEmergencyGC++;
    },

    // Ejecutar acción de alerta
    executeAlertAction: function(alert, config) {
        const message = `ALERTA CRÍTICA: ${alert.category}.${alert.type} = ${alert.value} (umbral: ${alert.threshold})`;
        
        // Métodos de alerta
        const methods = config.methods || ['console'];
        
        for (const method of methods) {
            switch (method) {
                case 'console':
                    console.error(`%c${message}`, 'color: red; font-weight: bold;', alert);
                    break;
                    
                case 'event':
                    this.emitEvent('memory:thresholds:critical-alert', alert);
                    break;
                    
                case 'notification':
                    this.sendBrowserNotification({
                        ...alert,
                        type: 'critical',
                        message: 'ALERTA CRÍTICA DE MEMORIA'
                    });
                    break;
            }
        }
    },

    // Ejecutar acción de limpieza forzada
    executeForceCleanupAction: function(alert, config) {
        this.log('Ejecutando limpieza forzada', 'error');
        
        // Limpieza agresiva
        if (typeof MemoryManager !== 'undefined' && MemoryManager.emergencyCleanup) {
            MemoryManager.emergencyCleanup({
                aggressiveness: config.aggressiveness || 'aggressive',
                includeCritical: !config.includeCritical
            });
        }
        
        // Limpiar cachés
        if (typeof CacheManager !== 'undefined' && CacheManager.clearAll) {
            CacheManager.clearAll();
        }
        
        // Limpiar pools
        if (typeof ResourcePool !== 'undefined' && ResourcePool.clearAll) {
            ResourcePool.clearAll();
        }
    },

    // Actualizar estadísticas
    updateStatistics: function(measurement) {
        this.state.stats.totalMeasurements++;
        this.state.stats.lastMeasurement = measurement.timestamp;
    },

    // Realizar medición final
    performFinalMeasurement: function() {
        this.log('Realizando medición final de umbrales', 'info');
        
        const finalMeasurement = {
            timestamp: Date.now(),
            type: 'final',
            summary: {
                totalMeasurements: this.state.stats.totalMeasurements,
                totalAlerts: this.state.stats.totalAlerts,
                totalAutoCleanups: this.state.stats.totalAutoCleanups,
                totalEmergencyGC: this.state.stats.totalEmergencyGC,
                uptime: Date.now() - this.state.stats.uptime
            },
            thresholdState: this.state.thresholdState,
            alertHistory: this.state.alertHistory.slice(-10),
            recommendations: this.generateRecommendations()
        };
        
        // Emitir evento de medición final
        this.emitEvent('memory:thresholds:final-measurement', finalMeasurement);
    },

    // Generar recomendaciones
    generateRecommendations: function() {
        const recommendations = [];
        const thresholdState = this.state.thresholdState;
        
        // Recomendaciones basadas en umbrales activos
        if (thresholdState.memory.warning.active) {
            recommendations.push({
                priority: 'medium',
                type: 'memory-warning',
                message: 'Uso de memoria elevado detectado consistentemente',
                actions: ['Optimizar uso de memoria', 'Liberar recursos no utilizados', 'Revisar cachés']
            });
        }
        
        if (thresholdState.memory.critical.active) {
            recommendations.push({
                priority: 'high',
                type: 'memory-critical',
                message: 'Uso de memoria crítico detectado',
                actions: ['Liberar memoria inmediatamente', 'Cerrar procesos no esenciales', 'Considerar reinicio']
            });
        }
        
        if (thresholdState.memory.emergency.active) {
            recommendations.push({
                priority: 'critical',
                type: 'memory-emergency',
                message: 'Nivel de memoria de emergencia',
                actions: ['ACCION INMEDIATA REQUERIDA', 'Forzar liberación de memoria', 'Reiniciar aplicación']
            });
        }
        
        // Recomendaciones de recursos
        for (const [resourceType, state] of Object.entries(thresholdState.resources)) {
            if (state.active) {
                recommendations.push({
                    priority: 'medium',
                    type: 'resource-leak',
                    message: `Acumulación de ${resourceType} detectada`,
                    actions: [`Limpiar ${resourceType} no utilizados`, 'Revisar ciclo de vida', 'Implementar limpieza automática']
                });
            }
        }
        
        return recommendations;
    },

    // Pausar monitoreo
    pauseMonitoring: function() {
        if (this.monitoringInterval) clearInterval(this.monitoringInterval);
        
        this.state.monitoringActive = false;
        this.log('Monitoreo de umbrales pausado', 'info');
    },

    // Reanudar monitoreo
    resumeMonitoring: function() {
        if (this.config.monitoring.enabled) {
            this.setupMonitoring();
        }
        
        this.state.monitoringActive = true;
        this.log('Monitoreo de umbrales reanudado', 'info');
    },

    // Emitir evento
    emitEvent: function(eventType, data) {
        if (typeof document !== 'undefined') {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    },

    // Obtener reporte de umbrales
    getThresholdsReport: function() {
        return {
            timestamp: Date.now(),
            stats: this.state.stats,
            thresholdState: this.state.thresholdState,
            alertHistory: this.state.alertHistory.slice(-20),
            measurementHistory: {
                memory: this.state.measurementHistory.memory.slice(-20)
            },
            recommendations: this.generateRecommendations(),
            config: this.config
        };
    },

    // Obtener métricas actuales
    getCurrentMetrics: function() {
        return {
            ...this.state.stats,
            monitoringActive: this.state.monitoringActive,
            activeThresholds: this.getActiveThresholds(),
            alertHistory: this.state.alertHistory.length,
            uptime: Date.now() - this.state.stats.uptime
        };
    },

    // Obtener umbrales activos
    getActiveThresholds: function() {
        const active = {};
        
        for (const [category, types] of Object.entries(this.state.thresholdState)) {
            active[category] = {};
            
            for (const [type, state] of Object.entries(types)) {
                if (state.active) {
                    active[category][type] = state;
                }
            }
        }
        
        return active;
    },

    // Reiniciar sistema
    reset: function() {
        this.log('Reiniciando MemoryThresholds...');
        
        // Pausar monitoreo
        this.pauseMonitoring();
        
        // Reiniciar estado
        this.initializeThresholdState();
        this.state.measurementHistory = {
            memory: [],
            resources: [],
            dom: [],
            performance: []
        };
        this.state.alertHistory = [];
        
        // Reiniciar estadísticas
        this.state.stats = {
            totalMeasurements: 0,
            totalAlerts: 0,
            totalAutoCleanups: 0,
            totalEmergencyGC: 0,
            lastMeasurement: null,
            lastAlert: null,
            uptime: Date.now()
        };
        
        // Reanudar monitoreo
        this.resumeMonitoring();
        
        this.log('MemoryThresholds reiniciado', 'success');
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
            const logMessage = `[${timestamp}] [MemoryThresholds] [${level.toUpperCase()}] ${message}`;
            
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

// Exportar el MemoryThresholds
export default MemoryThresholds;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.MemoryThresholds = MemoryThresholds;
}