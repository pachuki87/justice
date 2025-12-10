/**
 * PerformanceProfiler - Perfilador detallado de rendimiento de renderizado
 * 
 * Este sistema proporciona análisis profundo del rendimiento de renderizado
 * con métricas detalladas, visualización de datos y recomendaciones de optimización.
 */

class PerformanceProfiler {
    constructor(options = {}) {
        this.options = {
            enableDetailedTracing: options.enableDetailedTracing !== false,
            enableMemoryProfiling: options.enableMemoryProfiling !== false,
            enableFrameAnalysis: options.enableFrameAnalysis !== false,
            enableComponentAnalysis: options.enableComponentAnalysis !== false,
            maxHistorySize: options.maxHistorySize || 1000,
            sampleRate: options.sampleRate || 1.0, // 100% por defecto
            reportInterval: options.reportInterval || 5000, // 5 segundos
            ...options
        };

        // Estado del profiler
        this.isRunning = false;
        this.startTime = 0;
        this.currentSession = null;

        // Datos de rendimiento
        this.frameData = [];
        this.componentData = new Map();
        this.memoryData = [];
        this.renderOperations = [];
        this.performanceMarks = new Map();
        this.performanceMeasures = new Map();

        // Análisis y métricas
        this.metrics = {
            totalFrames: 0,
            droppedFrames: 0,
            averageFPS: 0,
            averageFrameTime: 0,
            worstFrameTime: 0,
            bestFrameTime: Infinity,
            memoryUsage: {
                current: 0,
                peak: 0,
                average: 0
            },
            componentMetrics: new Map(),
            bottlenecks: [],
            recommendations: []
        };

        // Configuración de muestreo
        this.sampleCounter = 0;
        this.lastSampleTime = 0;

        // Observadores
        this.performanceObserver = null;
        this.memoryObserver = null;
        this.frameObserver = null;

        // Callbacks
        this.callbacks = {
            onFrameData: [],
            onMemoryData: [],
            onComponentData: [],
            onBottleneckDetected: [],
            onRecommendationGenerated: [],
            onReportGenerated: []
        };

        // Inicialización
        this.initialize();
    }

    /**
     * Inicializa el profiler
     */
    initialize() {
        this.setupPerformanceObservers();
        this.initializeMetrics();
        
        console.log('PerformanceProfiler inicializado');
    }

    /**
     * Inicia el perfilado
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.startTime = performance.now();
        this.currentSession = {
            id: this.generateSessionId(),
            startTime: this.startTime,
            frames: [],
            components: new Map(),
            memory: []
        };

        this.startPerformanceObservers();
        this.startPeriodicReporting();

        console.log('PerformanceProfiler iniciado');
    }

    /**
     * Detiene el perfilado
     */
    stop() {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.stopPerformanceObservers();
        this.stopPeriodicReporting();

        const endTime = performance.now();
        const sessionDuration = endTime - this.startTime;

        // Generar reporte final
        this.generateFinalReport(sessionDuration);

        console.log('PerformanceProfiler detenido');
    }

    /**
     * Configura los observadores de rendimiento
     */
    setupPerformanceObservers() {
        // Observer para medidas de rendimiento
        if (window.PerformanceObserver) {
            this.performanceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                this.processPerformanceEntries(entries);
            });

            // Observer para memoria (si está disponible)
            if (performance.memory) {
                this.memoryObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    this.processMemoryEntries(entries);
                });
            }
        }
    }

    /**
     * Inicia los observadores de rendimiento
     */
    startPerformanceObservers() {
        if (this.performanceObserver) {
            this.performanceObserver.observe({
                entryTypes: ['measure', 'navigation', 'paint', 'layout-shift']
            });
        }

        if (this.memoryObserver && performance.memory) {
            this.memoryObserver.observe({
                entryTypes: ['memory']
            });
        }

        // Iniciar observación de frames
        this.startFrameObservation();
    }

    /**
     * Detiene los observadores de rendimiento
     */
    stopPerformanceObservers() {
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }

        if (this.memoryObserver) {
            this.memoryObserver.disconnect();
        }

        this.stopFrameObservation();
    }

    /**
     * Inicia la observación de frames
     */
    startFrameObservation() {
        let lastFrameTime = performance.now();

        const measureFrame = () => {
            if (!this.isRunning) return;

            const currentTime = performance.now();
            const frameTime = currentTime - lastFrameTime;
            
            this.recordFrameData(frameTime, currentTime);
            
            lastFrameTime = currentTime;
            requestAnimationFrame(measureFrame);
        };

        requestAnimationFrame(measureFrame);
    }

    /**
     * Detiene la observación de frames
     */
    stopFrameObservation() {
        // Se detiene automáticamente cuando isRunning = false
    }

    /**
     * Registra datos de un frame
     */
    recordFrameData(frameTime, timestamp) {
        if (!this.shouldSample()) return;

        const frameData = {
            timestamp,
            frameTime,
            fps: 1000 / frameTime,
            dropped: frameTime > 16.67, // Más de 60 FPS
            memory: this.getCurrentMemoryUsage()
        };

        this.frameData.push(frameData);
        this.currentSession.frames.push(frameData);

        // Mantener tamaño del historial
        if (this.frameData.length > this.options.maxHistorySize) {
            this.frameData.shift();
        }

        // Actualizar métricas
        this.updateFrameMetrics(frameData);

        // Notificar
        this.notifyFrameData(frameData);
    }

    /**
     * Determina si se debe muestrear este frame
     */
    shouldSample() {
        this.sampleCounter++;
        
        if (this.options.sampleRate < 1.0) {
            return Math.random() < this.options.sampleRate;
        }
        
        return true;
    }

    /**
     * Obtiene el uso actual de memoria
     */
    getCurrentMemoryUsage() {
        if (!performance.memory) return null;

        return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
            usageRatio: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
        };
    }

    /**
     * Actualiza métricas de frames
     */
    updateFrameMetrics(frameData) {
        this.metrics.totalFrames++;
        
        if (frameData.dropped) {
            this.metrics.droppedFrames++;
        }

        // Actualizar tiempo de frame promedio
        this.metrics.averageFrameTime = 
            (this.metrics.averageFrameTime * (this.metrics.totalFrames - 1) + frameData.frameTime) / this.metrics.totalFrames;

        // Actualizar FPS promedio
        this.metrics.averageFPS = 1000 / this.metrics.averageFrameTime;

        // Actualizar peor y mejor tiempo de frame
        this.metrics.worstFrameTime = Math.max(this.metrics.worstFrameTime, frameData.frameTime);
        this.metrics.bestFrameTime = Math.min(this.metrics.bestFrameTime, frameData.frameTime);

        // Actualizar métricas de memoria
        if (frameData.memory) {
            this.updateMemoryMetrics(frameData.memory);
        }
    }

    /**
     * Actualiza métricas de memoria
     */
    updateMemoryMetrics(memoryData) {
        this.metrics.memoryUsage.current = memoryData.used;
        this.metrics.memoryUsage.peak = Math.max(this.metrics.memoryUsage.peak, memoryData.used);
        
        // Calcular promedio móvil
        const alpha = 0.1; // Factor de suavizado
        this.metrics.memoryUsage.average = 
            this.metrics.memoryUsage.average * (1 - alpha) + memoryData.used * alpha;
    }

    /**
     * Registra métricas de un componente
     */
    recordComponentMetrics(componentId, metrics) {
        if (!this.shouldSample()) return;

        const componentData = {
            componentId,
            timestamp: performance.now(),
            renderTime: metrics.renderTime || 0,
            renderCount: metrics.renderCount || 0,
            memoryUsage: metrics.memoryUsage || 0,
            reflowCount: metrics.reflowCount || 0,
            repaintCount: metrics.repaintCount || 0,
            cacheHitRate: metrics.cacheHitRate || 0
        };

        // Almacenar en mapa de componentes
        if (!this.componentData.has(componentId)) {
            this.componentData.set(componentId, []);
        }
        
        this.componentData.get(componentId).push(componentData);

        // Actualizar métricas agregadas del componente
        this.updateComponentMetrics(componentId, componentData);

        // Notificar
        this.notifyComponentData(componentData);
    }

    /**
     * Actualiza métricas agregadas de un componente
     */
    updateComponentMetrics(componentId, componentData) {
        if (!this.metrics.componentMetrics.has(componentId)) {
            this.metrics.componentMetrics.set(componentId, {
                totalRenders: 0,
                averageRenderTime: 0,
                totalRenderTime: 0,
                averageMemoryUsage: 0,
                totalMemoryUsage: 0,
                reflowCount: 0,
                repaintCount: 0,
                cacheHitRate: 0
            });
        }

        const metrics = this.metrics.componentMetrics.get(componentId);
        
        metrics.totalRenders++;
        metrics.totalRenderTime += componentData.renderTime;
        metrics.averageRenderTime = metrics.totalRenderTime / metrics.totalRenders;
        
        if (componentData.memoryUsage) {
            metrics.totalMemoryUsage += componentData.memoryUsage;
            metrics.averageMemoryUsage = metrics.totalMemoryUsage / metrics.totalRenders;
        }
        
        metrics.reflowCount += componentData.reflowCount;
        metrics.repaintCount += componentData.repaintCount;
        
        // Actualizar cache hit rate (promedio móvil)
        metrics.cacheHitRate = (metrics.cacheHitRate * 0.9) + (componentData.cacheHitRate * 0.1);
    }

    /**
     * Registra una operación de renderizado
     */
    recordRenderOperation(operation) {
        if (!this.shouldSample()) return;

        const renderOperation = {
            id: this.generateOperationId(),
            timestamp: performance.now(),
            type: operation.type,
            componentId: operation.componentId,
            duration: operation.duration,
            memoryDelta: operation.memoryDelta || 0,
            nodesAffected: operation.nodesAffected || 0,
            priority: operation.priority || 'normal'
        };

        this.renderOperations.push(renderOperation);

        // Mantener tamaño del historial
        if (this.renderOperations.length > this.options.maxHistorySize) {
            this.renderOperations.shift();
        }

        // Analizar para detectar cuellos de botella
        this.analyzeForBottlenecks(renderOperation);
    }

    /**
     * Analiza operaciones para detectar cuellos de botella
     */
    analyzeForBottlenecks(operation) {
        const bottlenecks = [];

        // Operaciones lentas
        if (operation.duration > 16.67) {
            bottlenecks.push({
                type: 'slow_operation',
                severity: 'high',
                description: `Operación de renderizado lenta: ${operation.duration.toFixed(2)}ms`,
                componentId: operation.componentId,
                operationType: operation.type,
                recommendation: 'Considerar optimización o memoización'
            });
        }

        // Alto uso de memoria
        if (operation.memoryDelta > 1024 * 1024) { // 1MB
            bottlenecks.push({
                type: 'memory_intensive',
                severity: 'medium',
                description: `Operación intensiva en memoria: ${(operation.memoryDelta / 1024 / 1024).toFixed(2)}MB`,
                componentId: operation.componentId,
                operationType: operation.type,
                recommendation: 'Revisar fugas de memoria o optimizar estructuras de datos'
            });
        }

        // Muchos nodos afectados
        if (operation.nodesAffected > 100) {
            bottlenecks.push({
                type: 'dom_heavy',
                severity: 'medium',
                description: `Operación afecta muchos nodos DOM: ${operation.nodesAffected}`,
                componentId: operation.componentId,
                operationType: operation.type,
                recommendation: 'Considerar virtual DOM o renderizado por lotes'
            });
        }

        // Agregar a métricas y notificar
        if (bottlenecks.length > 0) {
            this.metrics.bottlenecks.push(...bottlenecks);
            this.notifyBottlenecksDetected(bottlenecks);
        }
    }

    /**
     * Genera recomendaciones de optimización
     */
    generateRecommendations() {
        const recommendations = [];

        // Análisis de FPS
        if (this.metrics.averageFPS < 55) {
            recommendations.push({
                type: 'fps_low',
                severity: 'high',
                title: 'FPS bajo detectado',
                description: `FPS promedio: ${this.metrics.averageFPS.toFixed(1)}`,
                recommendation: 'Optimizar renderizado, reducir operaciones síncronas',
                impact: 'high'
            });
        }

        // Análisis de frames caídos
        const droppedFrameRate = (this.metrics.droppedFrames / this.metrics.totalFrames) * 100;
        if (droppedFrameRate > 10) {
            recommendations.push({
                type: 'dropped_frames',
                severity: 'medium',
                title: 'Alta tasa de frames caídos',
                description: `${droppedFrameRate.toFixed(1)}% de frames caídos`,
                recommendation: 'Implementar renderizado por lotes o reducir complejidad',
                impact: 'medium'
            });
        }

        // Análisis de memoria
        if (this.metrics.memoryUsage.current > this.metrics.memoryUsage.limit * 0.8) {
            recommendations.push({
                type: 'memory_high',
                severity: 'high',
                title: 'Alto uso de memoria',
                description: `${(this.metrics.memoryUsage.current / 1024 / 1024).toFixed(1)}MB utilizados`,
                recommendation: 'Revisar fugas de memoria y optimizar estructuras de datos',
                impact: 'high'
            });
        }

        // Análisis de componentes problemáticos
        for (const [componentId, metrics] of this.metrics.componentMetrics) {
            if (metrics.averageRenderTime > 10) {
                recommendations.push({
                    type: 'component_slow',
                    severity: 'medium',
                    title: `Componente lento: ${componentId}`,
                    description: `Tiempo promedio de renderizado: ${metrics.averageRenderTime.toFixed(2)}ms`,
                    recommendation: 'Implementar memoización o optimizar lógica del componente',
                    componentId,
                    impact: 'medium'
                });
            }

            if (metrics.cacheHitRate < 0.5 && metrics.totalRenders > 10) {
                recommendations.push({
                    type: 'cache_misses',
                    severity: 'low',
                    title: `Baja tasa de cache: ${componentId}`,
                    description: `Tasa de cache hits: ${(metrics.cacheHitRate * 100).toFixed(1)}%`,
                    recommendation: 'Revisar estrategia de caché o implementar memoización',
                    componentId,
                    impact: 'low'
                });
            }
        }

        this.metrics.recommendations = recommendations;
        this.notifyRecommendationsGenerated(recommendations);

        return recommendations;
    }

    /**
     * Procesa entradas de rendimiento
     */
    processPerformanceEntries(entries) {
        for (const entry of entries) {
            switch (entry.entryType) {
                case 'measure':
                    this.processMeasureEntry(entry);
                    break;
                case 'navigation':
                    this.processNavigationEntry(entry);
                    break;
                case 'paint':
                    this.processPaintEntry(entry);
                    break;
                case 'layout-shift':
                    this.processLayoutShiftEntry(entry);
                    break;
            }
        }
    }

    /**
     * Procesa entrada de medida
     */
    processMeasureEntry(entry) {
        this.performanceMeasures.set(entry.name, {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime
        });
    }

    /**
     * Procesa entrada de navegación
     */
    processNavigationEntry(entry) {
        // Analizar métricas de navegación
        const navigationMetrics = {
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            loadComplete: entry.loadEventEnd - entry.loadEventStart,
            domInteractive: entry.domInteractive - entry.navigationStart,
            firstPaint: 0,
            firstContentfulPaint: 0
        };

        // Buscar métricas de paint
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(paintEntry => {
            if (paintEntry.name === 'first-paint') {
                navigationMetrics.firstPaint = paintEntry.startTime;
            } else if (paintEntry.name === 'first-contentful-paint') {
                navigationMetrics.firstContentfulPaint = paintEntry.startTime;
            }
        });

        this.navigationMetrics = navigationMetrics;
    }

    /**
     * Procesa entrada de paint
     */
    processPaintEntry(entry) {
        // Almacenar métricas de paint
        this.performanceMarks.set(entry.name, {
            name: entry.name,
            startTime: entry.startTime
        });
    }

    /**
     * Procesa entrada de layout shift
     */
    processLayoutShiftEntry(entry) {
        // Acumular CLS (Cumulative Layout Shift)
        if (!this.cumulativeLayoutShift) {
            this.cumulativeLayoutShift = 0;
        }
        this.cumulativeLayoutShift += entry.value;
    }

    /**
     * Inicia reportes periódicos
     */
    startPeriodicReporting() {
        this.reportingInterval = setInterval(() => {
            this.generatePeriodicReport();
        }, this.options.reportInterval);
    }

    /**
     * Detiene reportes periódicos
     */
    stopPeriodicReporting() {
        if (this.reportingInterval) {
            clearInterval(this.reportingInterval);
            this.reportingInterval = null;
        }
    }

    /**
     * Genera reporte periódico
     */
    generatePeriodicReport() {
        const report = this.generateReport();
        this.notifyReportGenerated(report, 'periodic');
    }

    /**
     * Genera reporte final
     */
    generateFinalReport(sessionDuration) {
        const report = this.generateReport();
        report.sessionDuration = sessionDuration;
        report.sessionId = this.currentSession.id;
        
        this.notifyReportGenerated(report, 'final');
        
        return report;
    }

    /**
     * Genera reporte completo
     */
    generateReport() {
        const recommendations = this.generateRecommendations();

        return {
            timestamp: performance.now(),
            summary: {
                totalFrames: this.metrics.totalFrames,
                averageFPS: this.metrics.averageFPS,
                droppedFrames: this.metrics.droppedFrames,
                droppedFrameRate: (this.metrics.droppedFrames / this.metrics.totalFrames) * 100,
                averageFrameTime: this.metrics.averageFrameTime,
                worstFrameTime: this.metrics.worstFrameTime,
                bestFrameTime: this.metrics.bestFrameTime === Infinity ? 0 : this.metrics.bestFrameTime
            },
            memory: {
                current: this.metrics.memoryUsage.current,
                peak: this.metrics.memoryUsage.peak,
                average: this.metrics.memoryUsage.average,
                limit: performance.memory ? performance.memory.jsHeapSizeLimit : 0
            },
            components: this.getComponentReport(),
            bottlenecks: this.metrics.bottlenecks.slice(-10), // Últimos 10
            recommendations: recommendations,
            webVitals: this.getWebVitals()
        };
    }

    /**
     * Obtiene reporte de componentes
     */
    getComponentReport() {
        const componentReport = {};

        for (const [componentId, metrics] of this.metrics.componentMetrics) {
            componentReport[componentId] = {
                totalRenders: metrics.totalRenders,
                averageRenderTime: metrics.averageRenderTime,
                totalRenderTime: metrics.totalRenderTime,
                averageMemoryUsage: metrics.averageMemoryUsage,
                reflowCount: metrics.reflowCount,
                repaintCount: metrics.repaintCount,
                cacheHitRate: metrics.cacheHitRate,
                efficiency: this.calculateComponentEfficiency(metrics)
            };
        }

        return componentReport;
    }

    /**
     * Calcula eficiencia de un componente
     */
    calculateComponentEfficiency(metrics) {
        const renderEfficiency = Math.max(0, 100 - (metrics.averageRenderTime / 16.67) * 100);
        const memoryEfficiency = Math.max(0, 100 - (metrics.averageMemoryUsage / (1024 * 1024)) * 10);
        const cacheEfficiency = metrics.cacheHitRate * 100;
        
        return (renderEfficiency * 0.5 + memoryEfficiency * 0.3 + cacheEfficiency * 0.2);
    }

    /**
     * Obtiene Web Vitals
     */
    getWebVitals() {
        return {
            LCP: this.getLargestContentfulPaint(),
            FID: this.getFirstInputDelay(),
            CLS: this.cumulativeLayoutShift || 0,
            FCP: this.getFirstContentfulPaint(),
            TTFB: this.getTimeToFirstByte()
        };
    }

    /**
     * Obtiene Largest Contentful Paint
     */
    getLargestContentfulPaint() {
        const entries = performance.getEntriesByType('largest-contentful-paint');
        return entries.length > 0 ? entries[entries.length - 1].startTime : 0;
    }

    /**
     * Obtiene First Input Delay
     */
    getFirstInputDelay() {
        const entries = performance.getEntriesByType('first-input');
        return entries.length > 0 ? entries[0].processingStart - entries[0].startTime : 0;
    }

    /**
     * Obtiene First Contentful Paint
     */
    getFirstContentfulPaint() {
        const entries = performance.getEntriesByType('paint');
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        return fcpEntry ? fcpEntry.startTime : 0;
    }

    /**
     * Obtiene Time to First Byte
     */
    getTimeToFirstByte() {
        const navigation = performance.getEntriesByType('navigation')[0];
        return navigation ? navigation.responseStart - navigation.requestStart : 0;
    }

    /**
     * Inicializa métricas
     */
    initializeMetrics() {
        this.metrics = {
            totalFrames: 0,
            droppedFrames: 0,
            averageFPS: 0,
            averageFrameTime: 0,
            worstFrameTime: 0,
            bestFrameTime: Infinity,
            memoryUsage: {
                current: 0,
                peak: 0,
                average: 0
            },
            componentMetrics: new Map(),
            bottlenecks: [],
            recommendations: []
        };
    }

    /**
     * Genera ID de sesión
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Genera ID de operación
     */
    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Registra callbacks
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    /**
     * Elimina callbacks
     */
    off(event, callback) {
        if (this.callbacks[event]) {
            const index = this.callbacks[event].indexOf(callback);
            if (index !== -1) {
                this.callbacks[event].splice(index, 1);
            }
        }
    }

    /**
     * Notifica datos de frame
     */
    notifyFrameData(frameData) {
        this.callbacks.onFrameData.forEach(callback => {
            try {
                callback(frameData);
            } catch (e) {
                console.error('Error en callback de frame data:', e);
            }
        });
    }

    /**
     * Notifica datos de componente
     */
    notifyComponentData(componentData) {
        this.callbacks.onComponentData.forEach(callback => {
            try {
                callback(componentData);
            } catch (e) {
                console.error('Error en callback de component data:', e);
            }
        });
    }

    /**
     * Notifica cuellos de botella detectados
     */
    notifyBottlenecksDetected(bottlenecks) {
        this.callbacks.onBottleneckDetected.forEach(callback => {
            try {
                callback(bottlenecks);
            } catch (e) {
                console.error('Error en callback de bottleneck detected:', e);
            }
        });
    }

    /**
     * Notifica recomendaciones generadas
     */
    notifyRecommendationsGenerated(recommendations) {
        this.callbacks.onRecommendationGenerated.forEach(callback => {
            try {
                callback(recommendations);
            } catch (e) {
                console.error('Error en callback de recommendations generated:', e);
            }
        });
    }

    /**
     * Notifica reporte generado
     */
    notifyReportGenerated(report, type) {
        this.callbacks.onReportGenerated.forEach(callback => {
            try {
                callback(report, type);
            } catch (e) {
                console.error('Error en callback de report generated:', e);
            }
        });
    }

    /**
     * Obtiene métricas actuales
     */
    getMetrics() {
        return {
            ...this.metrics,
            isRunning: this.isRunning,
            sessionDuration: this.isRunning ? performance.now() - this.startTime : 0,
            frameDataCount: this.frameData.length,
            componentDataCount: this.componentData.size,
            renderOperationsCount: this.renderOperations.length
        };
    }

    /**
     * Obtiene datos detallados
     */
    getDetailedData() {
        return {
            frameData: this.frameData.slice(-100), // Últimos 100 frames
            componentData: Object.fromEntries(this.componentData),
            renderOperations: this.renderOperations.slice(-50), // Últimas 50 operaciones
            performanceMeasures: Object.fromEntries(this.performanceMeasures),
            performanceMarks: Object.fromEntries(this.performanceMarks)
        };
    }

    /**
     * Exporta datos en formato JSON
     */
    exportData() {
        return {
            session: this.currentSession,
            metrics: this.getMetrics(),
            detailedData: this.getDetailedData(),
            report: this.generateReport(),
            exportTimestamp: performance.now()
        };
    }

    /**
     * Limpia recursos
     */
    cleanup() {
        this.stop();
        
        // Limpiar datos
        this.frameData = [];
        this.componentData.clear();
        this.memoryData = [];
        this.renderOperations = [];
        this.performanceMarks.clear();
        this.performanceMeasures.clear();
        
        // Limpiar callbacks
        for (const event of Object.keys(this.callbacks)) {
            this.callbacks[event] = [];
        }
        
        console.log('PerformanceProfiler limpiado');
    }
}

// Exportar el profiler
window.PerformanceProfiler = PerformanceProfiler;