/**
 * Justice 2 Resource Monitor
 * Sistema de monitoreo en tiempo real de recursos y memoria
 * Proporciona seguimiento continuo y alertas de recursos
 */

import { XSSProtection } from './xss-protection.js';

const ResourceMonitor = {
    // Configuración del monitor
    config: {
        // Configuración de monitoreo
        monitoringInterval: 2000,             // 2 segundos
        deepMonitoringInterval: 15000,        // 15 segundos
        maxDataPoints: 100,                  // Máximo puntos de datos a mantener
        
        // Configuración de umbrales
        memoryWarningThreshold: 0.7,         // 70% de uso
        memoryCriticalThreshold: 0.85,      // 85% de uso
        cpuWarningThreshold: 0.8,            // 80% de uso
        cpuCriticalThreshold: 0.9,           // 90% de uso
        resourceGrowthThreshold: 0.15,        // 15% de crecimiento
        
        // Configuración de alertas
        enableAlerts: true,
        alertCooldown: 60000,                // 1 minuto cooldown
        enableNotifications: true,
        
        // Configuración de métricas
        enableMemoryMetrics: true,
        enableCPUMetrics: true,
        enableDOMMetrics: true,
        enableNetworkMetrics: true,
        enableResourceMetrics: true,
        
        // Configuración de visualización
        enableRealTimeDisplay: true,
        updateDisplayInterval: 5000,         // 5 segundos
        enableCharts: true,
        enableHeatmap: true,
        
        // Configuración de logging
        enableLogging: true,
        logLevel: 'info',
        enableDetailedTraces: false
    },

    // Estado del monitor
    state: {
        initialized: false,
        monitoringActive: false,
        
        // Datos en tiempo real
        currentMetrics: {},
        historicalData: {
            memory: [],
            cpu: [],
            dom: [],
            network: [],
            resources: []
        },
        
        // Estado de alertas
        alertState: {
            activeAlerts: new Map(),
            alertHistory: [],
            lastAlerts: new Map(),
            cooldownActive: false
        },
        
        // Estado de recursos
        resourceState: {
            intervals: new Map(),
            timeouts: new Map(),
            eventListeners: new Map(),
            observers: new Map(),
            promises: new Map(),
            domReferences: new Map(),
            webWorkers: new Map(),
            webSockets: new Map()
        },
        
        // Estadísticas
        stats: {
            totalMeasurements: 0,
            totalAlerts: 0,
            averageMemoryUsage: 0,
            peakMemoryUsage: 0,
            averageCPUUsage: 0,
            peakCPUUsage: 0,
            lastMeasurement: null,
            lastAlert: null,
            uptime: 0
        },
        
        // Configuración de navegadores
        browserCapabilities: {
            hasMemoryAPI: false,
            hasPerformanceAPI: false,
            hasNavigationTiming: false,
            hasResourceTiming: false,
            hasUserTiming: false,
            hasIntersectionObserver: false,
            hasMutationObserver: false
        },
        
        // Estado de visualización
        visualization: {
            displayElement: null,
            charts: {
                memory: null,
                cpu: null,
                dom: null,
                resources: null
            },
            heatmap: null,
            metrics: {}
        }
    },

    // Inicialización del ResourceMonitor
    init: function() {
        if (this.state.initialized) {
            this.log('ResourceMonitor ya está inicializado', 'warn');
            return;
        }

        try {
            this.log('Inicializando ResourceMonitor...');
            
            // Detectar capacidades del navegador
            this.detectBrowserCapabilities();
            
            // Inicializar estado de recursos
            this.initializeResourceState();
            
            // Configurar monitoreo
            this.setupMonitoring();
            
            // Configurar visualización
            if (this.config.enableRealTimeDisplay) {
                this.setupVisualization();
            }
            
            // Configurar manejadores de eventos
            this.setupEventHandlers();
            
            // Inicializar tiempo de actividad
            this.state.stats.uptime = Date.now();
            
            this.state.initialized = true;
            this.state.monitoringActive = true;
            this.log('ResourceMonitor inicializado correctamente', 'success');
            
            // Emitir evento de inicialización
            this.emitEvent('resource:monitor:initialized', {
                timestamp: Date.now(),
                capabilities: this.state.browserCapabilities,
                config: this.config
            });
            
        } catch (error) {
            this.log('Error inicializando ResourceMonitor: ' + error.message, 'error');
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
            
            if (performance.getEntriesByType) {
                this.state.browserCapabilities.hasNavigationTiming = true;
                this.state.browserCapabilities.hasResourceTiming = true;
                this.state.browserCapabilities.hasUserTiming = true;
            }
        }
        
        if (typeof IntersectionObserver !== 'undefined') {
            this.state.browserCapabilities.hasIntersectionObserver = true;
        }
        
        if (typeof MutationObserver !== 'undefined') {
            this.state.browserCapabilities.hasMutationObserver = true;
        }
        
        this.log('Capacidades del navegador detectadas', 'info', this.state.browserCapabilities);
    },

    // Inicializar estado de recursos
    initializeResourceState: function() {
        // Sincronizar con ResourceTracker si está disponible
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            for (const [type, resourceMap] of Object.entries(ResourceTracker.state.resources)) {
                if (this.state.resourceState[type]) {
                    this.state.resourceState[type] = new Map(resourceMap);
                }
            }
        }
        
        this.log('Estado de recursos inicializado', 'info');
    },

    // Configurar monitoreo
    setupMonitoring: function() {
        // Monitoreo rápido
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, this.config.monitoringInterval);
        
        // Monitoreo profundo
        this.deepMonitoringInterval = setInterval(() => {
            this.collectDeepMetrics();
        }, this.config.deepMonitoringInterval);
        
        this.log('Monitoreo configurado', 'info');
    },

    // Configurar visualización
    setupVisualization: function() {
        // Crear elemento de visualización si no existe
        if (!this.state.visualization.displayElement) {
            this.createDisplayElement();
        }
        
        // Configurar actualización de visualización
        this.displayUpdateInterval = setInterval(() => {
            this.updateVisualization();
        }, this.config.updateDisplayInterval);
        
        this.log('Visualización configurada', 'info');
    },

    // Crear elemento de visualización
    createDisplayElement: function() {
        if (typeof document === 'undefined') return;
        
        const displayElement = document.createElement('div');
        displayElement.id = 'resource-monitor-display';
        displayElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-height: 400px;
            overflow-y: auto;
        `;
        
        document.body.appendChild(displayElement);
        this.state.visualization.displayElement = displayElement;
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
                this.collectFinalMetrics();
            });
            
            // Monitorear cambios en el DOM
            if (this.state.browserCapabilities.hasMutationObserver) {
                this.setupDOMMonitoring();
            }
        }
    },

    // Configurar monitoreo del DOM
    setupDOMMonitoring: function() {
        const observer = new MutationObserver((mutations) => {
            this.processDOMMutations(mutations);
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeOldValue: true
        });
        
        this.state.resourceState.observers.set('dom-monitor', observer);
    },

    // Procesar mutaciones del DOM
    processDOMMutations: function(mutations) {
        let addedNodes = 0;
        let removedNodes = 0;
        let attributeChanges = 0;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                addedNodes += mutation.addedNodes.length;
                removedNodes += mutation.removedNodes.length;
            } else if (mutation.type === 'attributes') {
                attributeChanges++;
            }
        });
        
        // Actualizar métricas de DOM
        if (this.state.currentMetrics.dom) {
            this.state.currentMetrics.dom.mutations = {
                addedNodes,
                removedNodes,
                attributeChanges,
                timestamp: Date.now()
            };
        }
    },

    // Colectar métricas
    collectMetrics: function() {
        const metrics = {
            timestamp: Date.now(),
            memory: this.config.enableMemoryMetrics ? this.getMemoryMetrics() : null,
            cpu: this.config.enableCPUMetrics ? this.getCPUMetrics() : null,
            dom: this.config.enableDOMMetrics ? this.getDOMMetrics() : null,
            network: this.config.enableNetworkMetrics ? this.getNetworkMetrics() : null,
            resources: this.config.enableResourceMetrics ? this.getResourceMetrics() : null
        };
        
        // Actualizar métricas actuales
        this.state.currentMetrics = metrics;
        
        // Agregar a datos históricos
        this.addToHistoricalData(metrics);
        
        // Actualizar estadísticas
        this.updateStatistics(metrics);
        
        // Verificar umbrales y alertas
        this.checkThresholds(metrics);
        
        // Emitir evento de métricas
        this.emitEvent('resource:metrics', metrics);
        
        return metrics;
    },

    // Colectar métricas profundas
    collectDeepMetrics: function() {
        const metrics = {
            timestamp: Date.now(),
            type: 'deep',
            memory: this.getDetailedMemoryMetrics(),
            resources: this.getDetailedResourceMetrics(),
            performance: this.getPerformanceMetrics(),
            analysis: this.performResourceAnalysis()
        };
        
        // Emitir evento de métricas profundas
        this.emitEvent('resource:deep-metrics', metrics);
        
        return metrics;
    },

    // Obtener métricas de memoria
    getMemoryMetrics: function() {
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
            allocationRate: (memory.totalJSHeapSize - memory.usedJSHeapSize) / memory.jsHeapSizeLimit
        };
    },

    // Obtener métricas de CPU
    getCPUMetrics: function() {
        if (!this.state.browserCapabilities.hasPerformanceAPI) {
            return {
                available: false,
                message: 'Performance API no disponible'
            };
        }
        
        const now = performance.now();
        const previousNow = this.state.currentMetrics.cpu?.now || now;
        const timeDelta = now - previousNow;
        
        // Estimación básica de uso de CPU
        let cpuUsage = 0;
        
        // Calcular basado en tiempo de ejecución
        if (timeDelta > 0) {
            // Esta es una estimación muy básica
            cpuUsage = Math.min(1, (timeDelta / this.config.monitoringInterval) * 0.5);
        }
        
        return {
            available: true,
            now,
            usage: cpuUsage,
            timeDelta,
            timestamp: Date.now()
        };
    },

    // Obtener métricas del DOM
    getDOMMetrics: function() {
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
            textNodes: document.querySelectorAll('*').length,
            comments: document.querySelectorAll('comment').length,
            eventListeners: this.estimateDOMEventListeners(),
            memoryUsage: this.estimateDOMMemoryUsage(),
            mutations: this.state.currentMetrics.dom?.mutations || null
        };
    },

    // Obtener métricas de red
    getNetworkMetrics: function() {
        if (!this.state.browserCapabilities.hasResourceTiming) {
            return {
                available: false,
                message: 'Resource Timing API no disponible'
            };
        }
        
        const resources = performance.getEntriesByType('resource');
        const now = performance.now();
        
        // Calcular métricas de red
        let totalRequests = resources.length;
        let totalSize = 0;
        let totalDuration = 0;
        let activeRequests = 0;
        
        resources.forEach(resource => {
            totalSize += resource.transferSize || 0;
            totalDuration += resource.duration || 0;
            
            // Contar solicitudes activas (últimos 5 segundos)
            if (now - (resource.startTime || 0) < 5000) {
                activeRequests++;
            }
        });
        
        return {
            available: true,
            totalRequests,
            totalSize,
            totalDuration,
            averageDuration: totalRequests > 0 ? totalDuration / totalRequests : 0,
            activeRequests,
            timestamp: Date.now()
        };
    },

    // Obtener métricas de recursos
    getResourceMetrics: function() {
        const metrics = {
            intervals: this.state.resourceState.intervals.size,
            timeouts: this.state.resourceState.timeouts.size,
            eventListeners: this.state.resourceState.eventListeners.size,
            observers: this.state.resourceState.observers.size,
            promises: this.state.resourceState.promises.size,
            domReferences: this.state.resourceState.domReferences.size,
            webWorkers: this.state.resourceState.webWorkers.size,
            webSockets: this.state.resourceState.webSockets.size
        };
        
        metrics.total = Object.values(metrics).reduce((sum, count) => sum + count, 0);
        
        return metrics;
    },

    // Obtener métricas detalladas de memoria
    getDetailedMemoryMetrics: function() {
        const basicMetrics = this.getMemoryMetrics();
        
        if (!basicMetrics.available) {
            return basicMetrics;
        }
        
        return {
            ...basicMetrics,
            breakdown: {
                code: this.estimateCodeMemory(),
                data: this.estimateDataMemory(),
                dom: this.estimateDOMMemoryUsage(),
                other: this.estimateOtherMemory()
            },
            fragmentation: this.calculateMemoryFragmentation(),
            pressure: this.estimateMemoryPressure()
        };
    },

    // Obtener métricas detalladas de recursos
    getDetailedResourceMetrics: function() {
        const basicMetrics = this.getResourceMetrics();
        
        return {
            ...basicMetrics,
            details: {
                intervals: this.getResourceDetails('intervals'),
                timeouts: this.getResourceDetails('timeouts'),
                eventListeners: this.getResourceDetails('eventListeners'),
                observers: this.getResourceDetails('observers'),
                promises: this.getResourceDetails('promises')
            },
            growth: this.calculateResourceGrowth()
        };
    },

    // Obtener detalles de recursos específicos
    getResourceDetails: function(resourceType) {
        const resourceMap = this.state.resourceState[resourceType];
        if (!resourceMap) return null;
        
        const details = {
            total: resourceMap.size,
            byType: {},
            oldest: null,
            newest: null
        };
        
        let oldestTime = Date.now();
        let newestTime = 0;
        
        resourceMap.forEach((resource, id) => {
            const type = resource.type || 'unknown';
            details.byType[type] = (details.byType[type] || 0) + 1;
            
            if (resource.created) {
                if (resource.created < oldestTime) {
                    oldestTime = resource.created;
                    details.oldest = { id, created: resource.created };
                }
                
                if (resource.created > newestTime) {
                    newestTime = resource.created;
                    details.newest = { id, created: resource.created };
                }
            }
        });
        
        return details;
    },

    // Obtener métricas de rendimiento
    getPerformanceMetrics: function() {
        if (!this.state.browserCapabilities.hasPerformanceAPI) {
            return {
                available: false,
                message: 'Performance API no disponible'
            };
        }
        
        const navigation = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');
        const measures = performance.getEntriesByType('measure');
        
        return {
            available: true,
            navigation: navigation ? {
                loadTime: navigation.loadEventEnd - navigation.navigationStart,
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
                domInteractive: navigation.domInteractive - navigation.navigationStart
            } : null,
            resources: {
                count: resources.length,
                totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
                totalDuration: resources.reduce((sum, r) => sum + (r.duration || 0), 0)
            },
            measures: measures.map(m => ({
                name: m.name,
                duration: m.duration,
                startTime: m.startTime
            }))
        };
    },

    // Realizar análisis de recursos
    performResourceAnalysis: function() {
        const analysis = {
            memory: this.analyzeMemoryUsage(),
            resources: this.analyzeResourceUsage(),
            performance: this.analyzePerformance(),
            trends: this.analyzeTrends(),
            recommendations: this.generateRecommendations()
        };
        
        return analysis;
    },

    // Analizar uso de memoria
    analyzeMemoryUsage: function() {
        const recentMemory = this.state.historicalData.memory.slice(-10);
        
        if (recentMemory.length < 3) {
            return { status: 'insufficient_data' };
        }
        
        const usages = recentMemory.map(m => m.percentage);
        const average = usages.reduce((sum, usage) => sum + usage, 0) / usages.length;
        const max = Math.max(...usages);
        const trend = this.calculateTrend(usages);
        
        let status = 'normal';
        if (average > this.config.memoryCriticalThreshold) {
            status = 'critical';
        } else if (average > this.config.memoryWarningThreshold) {
            status = 'warning';
        } else if (trend > 0.1) {
            status = 'growing';
        }
        
        return {
            status,
            average,
            max,
            trend,
            samples: usages.length
        };
    },

    // Analizar uso de recursos
    analyzeResourceUsage: function() {
        const recentResources = this.state.historicalData.resources.slice(-10);
        
        if (recentResources.length < 3) {
            return { status: 'insufficient_data' };
        }
        
        const totals = recentResources.map(r => r.total);
        const average = totals.reduce((sum, total) => sum + total, 0) / totals.length;
        const max = Math.max(...totals);
        const trend = this.calculateTrend(totals);
        
        let status = 'normal';
        if (trend > this.config.resourceGrowthThreshold) {
            status = 'growing';
        } else if (average > 100) { // Umbral arbitrario
            status = 'high';
        }
        
        return {
            status,
            average,
            max,
            trend,
            samples: totals.length
        };
    },

    // Analizar rendimiento
    analyzePerformance: function() {
        const recentPerformance = this.state.currentMetrics.performance;
        
        if (!recentPerformance || !recentPerformance.available) {
            return { status: 'unavailable' };
        }
        
        let status = 'normal';
        const issues = [];
        
        if (recentPerformance.navigation) {
            const loadTime = recentPerformance.navigation.loadTime;
            if (loadTime > 3000) { // 3 segundos
                status = 'slow';
                issues.push('Tiempo de carga elevado');
            }
        }
        
        if (recentPerformance.resources) {
            const avgDuration = recentPerformance.resources.totalDuration / recentPerformance.resources.count;
            if (avgDuration > 1000) { // 1 segundo
                status = 'slow';
                issues.push('Recursos lentos');
            }
        }
        
        return {
            status,
            issues,
            loadTime: recentPerformance.navigation?.loadTime || null,
            resourceCount: recentPerformance.resources?.count || 0,
            averageResourceDuration: recentPerformance.resources ? 
                recentPerformance.resources.totalDuration / recentPerformance.resources.count : 0
        };
    },

    // Analizar tendencias
    analyzeTrends: function() {
        const trends = {};
        
        // Tendencia de memoria
        if (this.state.historicalData.memory.length >= 5) {
            const memoryUsages = this.state.historicalData.memory.slice(-10).map(m => m.percentage);
            trends.memory = this.calculateTrend(memoryUsages);
        }
        
        // Tendencia de recursos
        if (this.state.historicalData.resources.length >= 5) {
            const resourceTotals = this.state.historicalData.resources.slice(-10).map(r => r.total);
            trends.resources = this.calculateTrend(resourceTotals);
        }
        
        // Tendencia de DOM
        if (this.state.historicalData.dom.length >= 5) {
            const domNodes = this.state.historicalData.dom.slice(-10).map(d => d.nodes);
            trends.dom = this.calculateTrend(domNodes);
        }
        
        return trends;
    },

    // Calcular tendencia
    calculateTrend: function(values) {
        if (values.length < 2) return 0;
        
        const first = values[0];
        const last = values[values.length - 1];
        
        if (first === 0) return 0;
        
        return (last - first) / first;
    },

    // Generar recomendaciones
    generateRecommendations: function() {
        const recommendations = [];
        const currentMetrics = this.state.currentMetrics;
        
        // Recomendaciones de memoria
        if (currentMetrics.memory && currentMetrics.memory.available) {
            const usage = currentMetrics.memory.percentage;
            
            if (usage > this.config.memoryCriticalThreshold) {
                recommendations.push({
                    priority: 'critical',
                    type: 'memory',
                    message: 'Uso de memoria crítico detectado',
                    actions: ['Liberar memoria inmediatamente', 'Cerrar recursos no utilizados', 'Considerar reiniciar aplicación']
                });
            } else if (usage > this.config.memoryWarningThreshold) {
                recommendations.push({
                    priority: 'high',
                    type: 'memory',
                    message: 'Uso de memoria elevado',
                    actions: ['Optimizar uso de memoria', 'Liberar cachés no necesarias', 'Revisar memory leaks']
                });
            }
        }
        
        // Recomendaciones de recursos
        if (currentMetrics.resources) {
            const total = currentMetrics.resources.total;
            
            if (total > 200) { // Umbral arbitrario
                recommendations.push({
                    priority: 'medium',
                    type: 'resources',
                    message: 'Alto número de recursos activos',
                    actions: ['Limpiar timers no utilizados', 'Remover event listeners', 'Desconectar observers']
                });
            }
        }
        
        // Recomendaciones de rendimiento
        const performanceAnalysis = this.analyzePerformance();
        if (performanceAnalysis.status === 'slow') {
            recommendations.push({
                priority: 'medium',
                type: 'performance',
                message: 'Rendimiento degradado',
                actions: ['Optimizar operaciones críticas', 'Reducir tamaño de recursos', 'Implementar lazy loading']
            });
        }
        
        return recommendations;
    },

    // Agregar a datos históricos
    addToHistoricalData: function(metrics) {
        // Agregar memoria
        if (metrics.memory && metrics.memory.available) {
            this.state.historicalData.memory.push({
                timestamp: metrics.timestamp,
                used: metrics.memory.used,
                percentage: metrics.memory.percentage
            });
        }
        
        // Agregar CPU
        if (metrics.cpu && metrics.cpu.available) {
            this.state.historicalData.cpu.push({
                timestamp: metrics.timestamp,
                usage: metrics.cpu.usage
            });
        }
        
        // Agregar DOM
        if (metrics.dom && metrics.dom.available) {
            this.state.historicalData.dom.push({
                timestamp: metrics.timestamp,
                nodes: metrics.dom.nodes,
                elements: metrics.dom.elements
            });
        }
        
        // Agregar red
        if (metrics.network && metrics.network.available) {
            this.state.historicalData.network.push({
                timestamp: metrics.timestamp,
                requests: metrics.network.totalRequests,
                size: metrics.network.totalSize
            });
        }
        
        // Agregar recursos
        if (metrics.resources) {
            this.state.historicalData.resources.push({
                timestamp: metrics.timestamp,
                ...metrics.resources
            });
        }
        
        // Limitar datos históricos
        this.limitHistoricalData();
    },

    // Limitar datos históricos
    limitHistoricalData: function() {
        const maxPoints = this.config.maxDataPoints;
        
        for (const [key, data] of Object.entries(this.state.historicalData)) {
            if (data.length > maxPoints) {
                this.state.historicalData[key] = data.slice(-maxPoints);
            }
        }
    },

    // Actualizar estadísticas
    updateStatistics: function(metrics) {
        this.state.stats.totalMeasurements++;
        this.state.stats.lastMeasurement = metrics.timestamp;
        
        // Actualizar estadísticas de memoria
        if (metrics.memory && metrics.memory.available) {
            const usage = metrics.memory.percentage;
            
            // Actualizar promedio
            const totalMeasurements = this.state.stats.totalMeasurements;
            this.state.stats.averageMemoryUsage = 
                ((this.state.stats.averageMemoryUsage * (totalMeasurements - 1)) + usage) / totalMeasurements;
            
            // Actualizar pico
            this.state.stats.peakMemoryUsage = Math.max(this.state.stats.peakMemoryUsage, usage);
        }
        
        // Actualizar estadísticas de CPU
        if (metrics.cpu && metrics.cpu.available) {
            const usage = metrics.cpu.usage;
            
            // Actualizar promedio
            const totalMeasurements = this.state.stats.totalMeasurements;
            this.state.stats.averageCPUUsage = 
                ((this.state.stats.averageCPUUsage * (totalMeasurements - 1)) + usage) / totalMeasurements;
            
            // Actualizar pico
            this.state.stats.peakCPUUsage = Math.max(this.state.stats.peakCPUUsage, usage);
        }
    },

    // Verificar umbrales y alertas
    checkThresholds: function(metrics) {
        if (!this.config.enableAlerts) return;
        
        // Verificar memoria
        if (metrics.memory && metrics.memory.available) {
            const usage = metrics.memory.percentage;
            
            if (usage >= this.config.memoryCriticalThreshold) {
                this.raiseAlert('memory-critical', {
                    usage,
                    threshold: this.config.memoryCriticalThreshold,
                    type: 'critical'
                });
            } else if (usage >= this.config.memoryWarningThreshold) {
                this.raiseAlert('memory-warning', {
                    usage,
                    threshold: this.config.memoryWarningThreshold,
                    type: 'warning'
                });
            }
        }
        
        // Verificar CPU
        if (metrics.cpu && metrics.cpu.available) {
            const usage = metrics.cpu.usage;
            
            if (usage >= this.config.cpuCriticalThreshold) {
                this.raiseAlert('cpu-critical', {
                    usage,
                    threshold: this.config.cpuCriticalThreshold,
                    type: 'critical'
                });
            } else if (usage >= this.config.cpuWarningThreshold) {
                this.raiseAlert('cpu-warning', {
                    usage,
                    threshold: this.config.cpuWarningThreshold,
                    type: 'warning'
                });
            }
        }
    },

    // Emitir alerta
    raiseAlert: function(alertType, data) {
        const now = Date.now();
        const alertId = `${alertType}-${now}`;
        
        // Verificar cooldown
        const lastAlert = this.state.alertState.lastAlerts.get(alertType);
        if (lastAlert && (now - lastAlert) < this.config.alertCooldown) {
            return;
        }
        
        // Crear alerta
        const alert = {
            id: alertId,
            type: alertType,
            timestamp: now,
            ...data
        };
        
        // Agregar a alertas activas
        this.state.alertState.activeAlerts.set(alertId, alert);
        
        // Agregar a historial
        this.state.alertState.alertHistory.push(alert);
        
        // Limitar historial
        if (this.state.alertState.alertHistory.length > 100) {
            this.state.alertState.alertHistory = this.state.alertState.alertHistory.slice(-50);
        }
        
        // Actualizar último alerta
        this.state.alertState.lastAlerts.set(alertType, now);
        this.state.stats.lastAlert = now;
        this.state.stats.totalAlerts++;
        
        // Log de alerta
        this.log(`ALERTA: ${alertType}`, data.type === 'critical' ? 'error' : 'warn', data);
        
        // Emitir evento de alerta
        this.emitEvent('resource:alert', alert);
        
        // Enviar notificación si está habilitado
        if (this.config.enableNotifications) {
            this.sendNotification(alert);
        }
    },

    // Enviar notificación
    sendNotification: function(alert) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`Alerta de Recursos: ${alert.type}`, {
                body: `Tipo: ${alert.type}, Nivel: ${alert.severity || 'warning'}`,
                icon: '/images/alert-icon.png'
            });
        }
    },

    // Actualizar visualización
    updateVisualization: function() {
        if (!this.config.enableRealTimeDisplay || !this.state.visualization.displayElement) {
            return;
        }
        
        const display = this.state.visualization.displayElement;
        const metrics = this.state.currentMetrics;
        
        let html = '<h3>Resource Monitor</h3>';
        
        // Métricas de memoria
        if (metrics.memory && metrics.memory.available) {
            const memoryPercent = (metrics.memory.percentage * 100).toFixed(1);
            const memoryColor = metrics.memory.percentage > 0.8 ? 'red' : 
                              metrics.memory.percentage > 0.6 ? 'orange' : 'green';
            
            html += `<div style="margin: 5px 0;">
                <strong>Memoria:</strong> 
                <span style="color: ${memoryColor}">${memoryPercent}%</span>
                (${(metrics.memory.used / 1024 / 1024).toFixed(1)}MB)
            </div>`;
        }
        
        // Métricas de recursos
        if (metrics.resources) {
            html += `<div style="margin: 5px 0;">
                <strong>Recursos:</strong> ${metrics.resources.total}
                <small>(Int: ${metrics.resources.intervals}, TO: ${metrics.resources.timeouts}, EL: ${metrics.resources.eventListeners})</small>
            </div>`;
        }
        
        // Métricas del DOM
        if (metrics.dom && metrics.dom.available) {
            html += `<div style="margin: 5px 0;">
                <strong>DOM:</strong> ${metrics.dom.nodes} nodos
            </div>`;
        }
        
        // Alertas activas
        if (this.state.alertState.activeAlerts.size > 0) {
            html += '<div style="margin: 5px 0; color: red;"><strong>Alertas:</strong></div>';
            this.state.alertState.activeAlerts.forEach(alert => {
                html += `<div style="margin-left: 10px; font-size: 11px;">
                    ${alert.type}: ${(alert.usage * 100).toFixed(1)}%
                </div>`;
            });
        }
        
        // Timestamp
        html += `<div style="margin-top: 10px; font-size: 10px; color: #888;">
            Última actualización: ${new Date().toLocaleTimeString()}
        </div>`;
        
        display.innerHTML = html;
    },

    // Colectar métricas finales
    collectFinalMetrics: function() {
        this.log('Colectando métricas finales de recursos', 'info');
        
        const finalMetrics = {
            timestamp: Date.now(),
            type: 'final',
            summary: {
                totalMeasurements: this.state.stats.totalMeasurements,
                totalAlerts: this.state.stats.totalAlerts,
                averageMemoryUsage: this.state.stats.averageMemoryUsage,
                peakMemoryUsage: this.state.stats.peakMemoryUsage,
                uptime: Date.now() - this.state.stats.uptime
            },
            currentMetrics: this.state.currentMetrics,
            alertHistory: this.state.alertState.alertHistory.slice(-10),
            recommendations: this.generateRecommendations()
        };
        
        // Emitir evento de métricas finales
        this.emitEvent('resource:final-metrics', finalMetrics);
    },

    // Estimar memoria de código
    estimateCodeMemory: function() {
        if (typeof window === 'undefined') return 0;
        
        const scriptCount = document.getElementsByTagName('script').length;
        return scriptCount * 50000; // ~50KB por script
    },

    // Estimar memoria de datos
    estimateDataMemory: function() {
        if (typeof window === 'undefined') return 0;
        
        let dataCount = 0;
        for (const prop in window) {
            if (typeof window[prop] === 'object' || typeof window[prop] === 'function') {
                dataCount++;
            }
        }
        return dataCount * 1000; // ~1KB por objeto/función
    },

    // Estimar otra memoria
    estimateOtherMemory: function() {
        return 0;
    },

    // Calcular fragmentación de memoria
    calculateMemoryFragmentation: function() {
        if (!this.state.browserCapabilities.hasMemoryAPI) return 0;
        
        const memory = performance.memory;
        const allocated = memory.totalJSHeapSize;
        const used = memory.usedJSHeapSize;
        
        if (allocated === 0) return 0;
        
        return (allocated - used) / allocated;
    },

    // Estimar presión de memoria
    estimateMemoryPressure: function() {
        if (!this.state.browserCapabilities.hasMemoryAPI) return 0;
        
        const memory = performance.memory;
        return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    },

    // Calcular crecimiento de recursos
    calculateResourceGrowth: function() {
        if (this.state.historicalData.resources.length < 2) return 0;
        
        const recent = this.state.historicalData.resources.slice(-10);
        const totals = recent.map(r => r.total);
        
        return this.calculateTrend(totals);
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
        let estimatedMemory = 0;
        
        estimatedMemory = nodes.length * 200; // ~200 bytes por nodo
        
        return estimatedMemory;
    },

    // Pausar monitoreo
    pauseMonitoring: function() {
        if (this.monitoringInterval) clearInterval(this.monitoringInterval);
        if (this.deepMonitoringInterval) clearInterval(this.deepMonitoringInterval);
        if (this.displayUpdateInterval) clearInterval(this.displayUpdateInterval);
        
        this.state.monitoringActive = false;
        this.log('Monitoreo de recursos pausado', 'info');
    },

    // Reanudar monitoreo
    resumeMonitoring: function() {
        this.setupMonitoring();
        
        if (this.config.enableRealTimeDisplay) {
            this.setupVisualization();
        }
        
        this.state.monitoringActive = true;
        this.log('Monitoreo de recursos reanudado', 'info');
    },

    // Emitir evento
    emitEvent: function(eventType, data) {
        if (typeof document !== 'undefined') {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    },

    // Obtener reporte del monitor
    getMonitorReport: function() {
        return {
            timestamp: Date.now(),
            stats: this.state.stats,
            currentMetrics: this.state.currentMetrics,
            historicalData: {
                memory: this.state.historicalData.memory.slice(-20),
                cpu: this.state.historicalData.cpu.slice(-20),
                dom: this.state.historicalData.dom.slice(-20),
                network: this.state.historicalData.network.slice(-20),
                resources: this.state.historicalData.resources.slice(-20)
            },
            alertState: {
                activeAlerts: Array.from(this.state.alertState.activeAlerts.values()),
                alertHistory: this.state.alertState.alertHistory.slice(-10),
                totalAlerts: this.state.stats.totalAlerts
            },
            resourceState: this.getResourceMetrics(),
            analysis: this.performResourceAnalysis(),
            config: this.config
        };
    },

    // Obtener métricas actuales
    getCurrentMetrics: function() {
        return {
            ...this.state.stats,
            monitoringActive: this.state.monitoringActive,
            currentMetrics: this.state.currentMetrics,
            activeAlerts: this.state.alertState.activeAlerts.size,
            alertHistory: this.state.alertState.alertHistory.length,
            resourceState: this.getResourceMetrics(),
            uptime: Date.now() - this.state.stats.uptime
        };
    },

    // Reiniciar monitor
    reset: function() {
        this.log('Reiniciando ResourceMonitor...');
        
        // Pausar monitoreo
        this.pauseMonitoring();
        
        // Limpiar estado
        this.state.currentMetrics = {};
        this.state.historicalData = {
            memory: [],
            cpu: [],
            dom: [],
            network: [],
            resources: []
        };
        this.state.alertState.activeAlerts.clear();
        this.state.alertState.alertHistory = [];
        this.state.alertState.lastAlerts.clear();
        
        // Reiniciar estadísticas
        this.state.stats = {
            totalMeasurements: 0,
            totalAlerts: 0,
            averageMemoryUsage: 0,
            peakMemoryUsage: 0,
            averageCPUUsage: 0,
            peakCPUUsage: 0,
            lastMeasurement: null,
            lastAlert: null,
            uptime: Date.now()
        };
        
        // Reanudar monitoreo
        this.resumeMonitoring();
        
        this.log('ResourceMonitor reiniciado', 'success');
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
            const logMessage = `[${timestamp}] [ResourceMonitor] [${level.toUpperCase()}] ${message}`;
            
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

// Exportar el ResourceMonitor
export default ResourceMonitor;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.ResourceMonitor = ResourceMonitor;
}