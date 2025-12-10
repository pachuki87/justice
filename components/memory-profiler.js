/**
 * Justice 2 Memory Profiler
 * Sistema avanzado de análisis y perfilado de memoria
 * Proporciona métricas detalladas y visualización de uso de memoria
 */

import { XSSProtection } from './xss-protection.js';

const MemoryProfiler = {
    // Configuración del profiler
    config: {
        // Configuración de muestreo
        samplingInterval: 5000,           // 5 segundos
        deepSamplingInterval: 30000,      // 30 segundos
        maxSamples: 200,                  // Máximo muestras a mantener
        
        // Configuración de análisis
        enableHeapAnalysis: true,
        enableObjectTracking: true,
        enableMemoryMapping: true,
        enablePerformanceAnalysis: true,
        
        // Configuración de umbrales
        memoryWarningThreshold: 0.7,      // 70% de uso
        memoryCriticalThreshold: 0.85,    // 85% de uso
        performanceThreshold: 100,         // 100ms para operaciones
        
        // Configuración de visualización
        enableVisualization: true,
        chartUpdateInterval: 10000,       // 10 segundos
        maxDataPoints: 50,               // Máximo puntos en gráficos
        
        // Configuración de logging
        enableLogging: true,
        logLevel: 'info',
        enableDetailedTraces: false
    },

    // Estado del profiler
    state: {
        initialized: false,
        profilingActive: false,
        
        // Muestras de memoria
        memorySamples: [],
        performanceSamples: [],
        heapSnapshots: [],
        
        // Análisis en curso
        currentAnalysis: null,
        analysisQueue: [],
        
        // Estadísticas
        stats: {
            totalSamples: 0,
            totalAnalyses: 0,
            averageMemoryUsage: 0,
            peakMemoryUsage: 0,
            averagePerformance: 0,
            memoryLeaksDetected: 0,
            lastSample: null,
            lastAnalysis: null
        },
        
        // Configuración de navegadores
        browserCapabilities: {
            hasMemoryAPI: false,
            hasPerformanceAPI: false,
            hasHeapSnapshot: false,
            hasWeakRefs: false
        },
        
        // Datos de visualización
        visualization: {
            memoryChart: null,
            performanceChart: null,
            heatmap: null,
            timeline: []
        }
    },

    // Inicialización del MemoryProfiler
    init: function() {
        if (this.state.initialized) {
            this.log('MemoryProfiler ya está inicializado', 'warn');
            return;
        }

        try {
            this.log('Inicializando MemoryProfiler...');
            
            // Detectar capacidades del navegador
            this.detectBrowserCapabilities();
            
            // Configurar muestreo
            this.setupSampling();
            
            // Configurar análisis
            if (this.config.enableHeapAnalysis) {
                this.setupHeapAnalysis();
            }
            
            // Configurar visualización
            if (this.config.enableVisualization) {
                this.setupVisualization();
            }
            
            // Configurar manejadores de eventos
            this.setupEventHandlers();
            
            this.state.initialized = true;
            this.state.profilingActive = true;
            this.log('MemoryProfiler inicializado correctamente', 'success');
            
            // Emitir evento de inicialización
            this.emitEvent('memory:profiler:initialized', {
                timestamp: Date.now(),
                capabilities: this.state.browserCapabilities,
                config: this.config
            });
            
        } catch (error) {
            this.log('Error inicializando MemoryProfiler: ' + error.message, 'error');
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
            
            if (typeof performance.measureUserAgentSpecificMemory !== 'undefined') {
                this.state.browserCapabilities.hasHeapSnapshot = true;
            }
        }
        
        if (typeof WeakRef !== 'undefined') {
            this.state.browserCapabilities.hasWeakRefs = true;
        }
        
        this.log('Capacidades del navegador detectadas', 'info', this.state.browserCapabilities);
    },

    // Configurar muestreo
    setupSampling: function() {
        // Muestreo rápido
        this.samplingInterval = setInterval(() => {
            this.collectMemorySample();
        }, this.config.samplingInterval);
        
        // Muestreo profundo
        this.deepSamplingInterval = setInterval(() => {
            this.collectDeepSample();
        }, this.config.deepSamplingInterval);
        
        this.log('Muestreo configurado', 'info');
    },

    // Configurar análisis de heap
    setupHeapAnalysis: function() {
        if (!this.state.browserCapabilities.hasHeapSnapshot) {
            this.log('Heap snapshot no disponible en este navegador', 'warn');
            return;
        }
        
        // Configurar análisis periódico del heap
        this.heapAnalysisInterval = setInterval(() => {
            this.performHeapAnalysis();
        }, 60000); // Cada minuto
        
        this.log('Análisis de heap configurado', 'info');
    },

    // Configurar visualización
    setupVisualization: function() {
        // Configurar actualización de gráficos
        this.chartUpdateInterval = setInterval(() => {
            this.updateVisualization();
        }, this.config.chartUpdateInterval);
        
        this.log('Visualización configurada', 'info');
    },

    // Configurar manejadores de eventos
    setupEventHandlers: function() {
        if (typeof window !== 'undefined') {
            // Pausar profiling cuando la página está oculta
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseProfiling();
                } else {
                    this.resumeProfiling();
                }
            });
            
            // Capturar muestra final al cambiar de página
            window.addEventListener('beforeunload', () => {
                this.collectFinalSample();
            });
        }
    },

    // Colectar muestra de memoria
    collectMemorySample: function() {
        const sample = {
            timestamp: Date.now(),
            memory: this.getMemoryInfo(),
            performance: this.getPerformanceInfo(),
            resources: this.getResourceInfo(),
            dom: this.getDOMInfo()
        };
        
        // Agregar a muestras
        this.state.memorySamples.push(sample);
        this.state.stats.totalSamples++;
        this.state.stats.lastSample = sample.timestamp;
        
        // Limitar muestras a mantener
        if (this.state.memorySamples.length > this.config.maxSamples) {
            this.state.memorySamples = this.state.memorySamples.slice(-this.config.maxSamples);
        }
        
        // Actualizar estadísticas
        this.updateMemoryStats(sample);
        
        // Verificar umbrales
        this.checkThresholds(sample);
        
        // Emitir evento de muestra
        this.emitEvent('memory:sample', sample);
    },

    // Colectar muestra profunda
    collectDeepSample: function() {
        const sample = {
            timestamp: Date.now(),
            memory: this.getMemoryInfo(),
            performance: this.getPerformanceInfo(),
            resources: this.getResourceInfo(),
            dom: this.getDOMInfo(),
            detailed: {
                objectCounts: this.countObjectsByType(),
                memoryBreakdown: this.getMemoryBreakdown(),
                performanceMetrics: this.getDetailedPerformanceMetrics(),
                heapInfo: this.getHeapInfo()
            }
        };
        
        // Agregar a muestras profundas
        this.state.heapSnapshots.push(sample);
        
        // Limitar snapshots a mantener
        if (this.state.heapSnapshots.length > 50) {
            this.state.heapSnapshots = this.state.heapSnapshots.slice(-25);
        }
        
        // Emitir evento de muestra profunda
        this.emitEvent('memory:deep-sample', sample);
    },

    // Obtener información de memoria
    getMemoryInfo: function() {
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
            details: {
                allocated: memory.totalJSHeapSize - memory.usedJSHeapSize,
                allocationRate: (memory.totalJSHeapSize - memory.usedJSHeapSize) / memory.jsHeapSizeLimit
            }
        };
    },

    // Obtener información de rendimiento
    getPerformanceInfo: function() {
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
            timestamp: now,
            navigation: navigation ? {
                loadTime: navigation.loadEventEnd - navigation.navigationStart,
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
                domInteractive: navigation.domInteractive - navigation.navigationStart
            } : null,
            timing: {
                now,
                pageLoadTime: navigation ? now - navigation.navigationStart : 0
            }
        };
    },

    // Obtener información de recursos
    getResourceInfo: function() {
        const resources = {
            intervals: 0,
            timeouts: 0,
            eventListeners: 0,
            observers: 0,
            domReferences: 0,
            promises: 0,
            workers: 0,
            webSockets: 0,
            blobs: 0,
            urls: 0
        };
        
        // Contar recursos desde ResourceTracker si está disponible
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            for (const [type, resourceMap] of Object.entries(ResourceTracker.state.resources)) {
                if (resources.hasOwnProperty(type)) {
                    resources[type] = resourceMap.size;
                }
            }
        }
        
        return resources;
    },

    // Obtener información del DOM
    getDOMInfo: function() {
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
            memoryUsage: this.estimateDOMMemoryUsage(),
            eventListeners: this.estimateDOMEventListeners()
        };
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

    // Contar objetos por tipo
    countObjectsByType: function() {
        const counts = {};
        
        if (typeof window !== 'undefined') {
            // Contar objetos en window
            for (const prop in window) {
                try {
                    const value = window[prop];
                    if (value && typeof value === 'object') {
                        const type = this.getObjectType(value);
                        counts[type] = (counts[type] || 0) + 1;
                    }
                } catch (e) {
                    // Ignorar propiedades que no se pueden acceder
                }
            }
        }
        
        return counts;
    },

    // Obtener tipo de objeto
    getObjectType: function(obj) {
        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        
        const constructor = obj.constructor;
        if (constructor) {
            return constructor.name || 'Object';
        }
        
        return typeof obj;
    },

    // Obtener desglose de memoria
    getMemoryBreakdown: function() {
        if (!this.state.browserCapabilities.hasMemoryAPI) {
            return { available: false };
        }
        
        const memory = performance.memory;
        return {
            available: true,
            heap: {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                percentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
            },
            breakdown: {
                code: this.estimateCodeMemory(),
                data: this.estimateDataMemory(),
                dom: this.estimateDOMMemoryUsage(),
                other: this.estimateOtherMemory()
            }
        };
    },

    // Estimar memoria de código
    estimateCodeMemory: function() {
        // Estimación muy básica
        if (typeof window !== 'undefined') {
            const scriptCount = document.getElementsByTagName('script').length;
            return scriptCount * 50000; // ~50KB por script
        }
        return 0;
    },

    // Estimar memoria de datos
    estimateDataMemory: function() {
        // Estimación básica basada en variables globales
        if (typeof window !== 'undefined') {
            let dataCount = 0;
            for (const prop in window) {
                if (typeof window[prop] === 'object' || typeof window[prop] === 'function') {
                    dataCount++;
                }
            }
            return dataCount * 1000; // ~1KB por objeto/función
        }
        return 0;
    },

    // Estimar otra memoria
    estimateOtherMemory: function() {
        // Memoria no categorizada
        return 0;
    },

    // Obtener métricas de rendimiento detalladas
    getDetailedPerformanceMetrics: function() {
        if (!this.state.browserCapabilities.hasPerformanceAPI) {
            return { available: false };
        }
        
        const metrics = {
            available: true,
            timing: performance.getEntriesByType('navigation')[0],
            resources: performance.getEntriesByType('resource'),
            paint: performance.getEntriesByType('paint'),
            measure: performance.getEntriesByType('measure')
        };
        
        // Calcular métricas derivadas
        if (metrics.timing) {
            metrics.derived = {
                firstPaint: this.getFirstPaintTime(metrics.paint),
                firstContentfulPaint: this.getFirstContentfulPaintTime(metrics.paint),
                timeToInteractive: metrics.timing.domInteractive - metrics.timing.navigationStart,
                loadComplete: metrics.timing.loadEventEnd - metrics.timing.navigationStart
            };
        }
        
        return metrics;
    },

    // Obtener tiempo de primer paint
    getFirstPaintTime: function(paintEntries) {
        if (!paintEntries || paintEntries.length === 0) return 0;
        
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : 0;
    },

    // Obtener tiempo de primer contentful paint
    getFirstContentfulPaintTime: function(paintEntries) {
        if (!paintEntries || paintEntries.length === 0) return 0;
        
        const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        return firstContentfulPaint ? firstContentfulPaint.startTime : 0;
    },

    // Obtener información del heap
    getHeapInfo: function() {
        if (!this.state.browserCapabilities.hasHeapSnapshot) {
            return { available: false };
        }
        
        try {
            // Intentar tomar snapshot del heap
            const snapshot = performance.measureUserAgentSpecificMemory();
            
            return {
                available: true,
                snapshot,
                analysis: this.analyzeHeapSnapshot(snapshot)
            };
        } catch (error) {
            return {
                available: true,
                error: error.message
            };
        }
    },

    // Analizar snapshot del heap
    analyzeHeapSnapshot: function(snapshot) {
        if (!snapshot) return null;
        
        return {
            totalSize: snapshot.totalJSHeapSize || 0,
            usedSize: snapshot.usedJSHeapSize || 0,
            limit: snapshot.jsHeapSizeLimit || 0,
            usagePercentage: snapshot.usedJSHeapSize / snapshot.jsHeapSizeLimit,
            fragmentation: this.calculateFragmentation(snapshot)
        };
    },

    // Calcular fragmentación
    calculateFragmentation: function(snapshot) {
        if (!snapshot) return 0;
        
        const allocated = snapshot.totalJSHeapSize || 0;
        const used = snapshot.usedJSHeapSize || 0;
        
        if (allocated === 0) return 0;
        
        return (allocated - used) / allocated;
    },

    // Realizar análisis de heap
    performHeapAnalysis: function() {
        this.log('Iniciando análisis de heap', 'debug');
        
        const analysis = {
            timestamp: Date.now(),
            memoryInfo: this.getMemoryInfo(),
            objectCounts: this.countObjectsByType(),
            memoryBreakdown: this.getMemoryBreakdown(),
            performanceMetrics: this.getDetailedPerformanceMetrics(),
            heapInfo: this.getHeapInfo(),
            patterns: this.analyzeMemoryPatterns(),
            recommendations: this.generateMemoryRecommendations()
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
        
        // Detectar memory leaks
        if (analysis.patterns.memoryLeaks) {
            this.state.stats.memoryLeaksDetected++;
        }
        
        // Emitir evento de análisis
        this.emitEvent('memory:heap-analysis', analysis);
        
        return analysis;
    },

    // Analizar patrones de memoria
    analyzeMemoryPatterns: function() {
        if (this.state.memorySamples.length < 5) {
            return {
                memoryGrowth: false,
                resourceLeaks: false,
                performanceDegradation: false,
                memoryLeaks: false
            };
        }
        
        const recentSamples = this.state.memorySamples.slice(-10);
        const patterns = {
            memoryGrowth: this.detectMemoryGrowth(recentSamples),
            resourceLeaks: this.detectResourceLeaks(recentSamples),
            performanceDegradation: this.detectPerformanceDegradation(recentSamples),
            memoryLeaks: this.detectMemoryLeaks(recentSamples)
        };
        
        return patterns;
    },

    // Detectar crecimiento de memoria
    detectMemoryGrowth: function(samples) {
        if (!samples || samples.length < 3) return false;
        
        const memoryUsages = samples
            .filter(s => s.memory && s.memory.available)
            .map(s => s.memory.percentage);
        
        if (memoryUsages.length < 3) return false;
        
        // Calcular tendencia
        const first = memoryUsages[0];
        const last = memoryUsages[memoryUsages.length - 1];
        const growth = (last - first) / first;
        
        return growth > 0.1; // 10% de crecimiento
    },

    // Detectar leaks de recursos
    detectResourceLeaks: function(samples) {
        if (!samples || samples.length < 3) return false;
        
        const resourceCounts = samples
            .filter(s => s.resources)
            .map(s => {
                const total = Object.values(s.resources).reduce((sum, count) => sum + count, 0);
                return total;
            });
        
        if (resourceCounts.length < 3) return false;
        
        // Calcular tendencia
        const first = resourceCounts[0];
        const last = resourceCounts[resourceCounts.length - 1];
        const growth = (last - first) / first;
        
        return growth > 0.2; // 20% de crecimiento
    },

    // Detectar degradación de rendimiento
    detectPerformanceDegradation: function(samples) {
        if (!samples || samples.length < 3) return false;
        
        const performanceMetrics = samples
            .filter(s => s.performance && s.performance.available)
            .map(s => s.performance.timing ? s.performance.timing.pageLoadTime : 0);
        
        if (performanceMetrics.length < 3) return false;
        
        // Calcular tendencia
        const first = performanceMetrics[0];
        const last = performanceMetrics[performanceMetrics.length - 1];
        const degradation = (last - first) / first;
        
        return degradation > 0.3; // 30% de degradación
    },

    // Detectar memory leaks
    detectMemoryLeaks: function(samples) {
        if (!samples || samples.length < 5) return false;
        
        // Combinar múltiples indicadores
        const memoryGrowth = this.detectMemoryGrowth(samples);
        const resourceLeaks = this.detectResourceLeaks(samples);
        const performanceDegradation = this.detectPerformanceDegradation(samples);
        
        // Memory leak probable si múltiples indicadores están presentes
        const indicators = [memoryGrowth, resourceLeaks, performanceDegradation].filter(Boolean).length;
        
        return indicators >= 2;
    },

    // Generar recomendaciones de memoria
    generateMemoryRecommendations: function() {
        const recommendations = [];
        
        // Recomendaciones basadas en uso actual
        if (this.state.memorySamples.length > 0) {
            const latestSample = this.state.memorySamples[this.state.memorySamples.length - 1];
            
            if (latestSample.memory && latestSample.memory.percentage > 0.8) {
                recommendations.push({
                    priority: 'high',
                    type: 'memory-usage',
                    message: 'Uso de memoria elevado. Considere optimizar o liberar recursos.',
                    actions: ['Liberar objetos no utilizados', 'Reducir tamaño de cachés', 'Implementar garbage collection manual']
                });
            }
        }
        
        // Recomendaciones basadas en patrones
        const patterns = this.analyzeMemoryPatterns();
        
        if (patterns.memoryGrowth) {
            recommendations.push({
                priority: 'high',
                type: 'memory-growth',
                message: 'Crecimiento continuo de memoria detectado. Posible memory leak.',
                actions: ['Revisar ciclo de vida de objetos', 'Implementar limpieza automática', 'Usar WeakMap/WeakSet']
            });
        }
        
        if (patterns.resourceLeaks) {
            recommendations.push({
                priority: 'medium',
                type: 'resource-leaks',
                message: 'Acumulación de recursos detectada. Verifique limpieza de timers y listeners.',
                actions: ['Limpiar intervals/timeouts', 'Remover event listeners no utilizados', 'Revisar referencias DOM']
            });
        }
        
        if (patterns.performanceDegradation) {
            recommendations.push({
                priority: 'medium',
                type: 'performance',
                message: 'Degradación de rendimiento detectada. Optimice operaciones críticas.',
                actions: ['Optimizar bucles', 'Reducir operaciones síncronas', 'Implementar lazy loading']
            });
        }
        
        return recommendations;
    },

    // Verificar umbrales
    checkThresholds: function(sample) {
        if (!sample.memory || !sample.memory.available) return;
        
        const usage = sample.memory.percentage;
        
        if (usage >= this.config.memoryCriticalThreshold) {
            this.raiseAlert('critical-memory-usage', {
                usage,
                threshold: this.config.memoryCriticalThreshold,
                sample
            }, 'critical');
        } else if (usage >= this.config.memoryWarningThreshold) {
            this.raiseAlert('high-memory-usage', {
                usage,
                threshold: this.config.memoryWarningThreshold,
                sample
            }, 'warning');
        }
    },

    // Actualizar estadísticas de memoria
    updateMemoryStats: function(sample) {
        if (!sample.memory || !sample.memory.available) return;
        
        const usage = sample.memory.percentage;
        
        // Actualizar promedio
        const totalSamples = this.state.stats.totalSamples;
        this.state.stats.averageMemoryUsage = 
            ((this.state.stats.averageMemoryUsage * (totalSamples - 1)) + usage) / totalSamples;
        
        // Actualizar pico
        this.state.stats.peakMemoryUsage = Math.max(this.state.stats.peakMemoryUsage, usage);
    },

    // Actualizar visualización
    updateVisualization: function() {
        if (!this.config.enableVisualization) return;
        
        // Actualizar datos de timeline
        this.updateTimeline();
        
        // Actualizar gráficos si existen
        if (this.state.visualization.memoryChart) {
            this.updateMemoryChart();
        }
        
        if (this.state.visualization.performanceChart) {
            this.updatePerformanceChart();
        }
        
        // Emitir evento de actualización
        this.emitEvent('memory:visualization-updated', {
            timestamp: Date.now(),
            timeline: this.state.visualization.timeline
        });
    },

    // Actualizar timeline
    updateTimeline: function() {
        const recentSamples = this.state.memorySamples.slice(-this.config.maxDataPoints);
        
        this.state.visualization.timeline = recentSamples.map(sample => ({
            timestamp: sample.timestamp,
            memory: sample.memory ? sample.memory.percentage : 0,
            resources: sample.resources ? 
                Object.values(sample.resources).reduce((sum, count) => sum + count, 0) : 0,
            performance: sample.performance && sample.performance.timing ? 
                sample.performance.timing.pageLoadTime : 0
        }));
    },

    // Actualizar gráfico de memoria
    updateMemoryChart: function() {
        // Implementación depende de la librería de gráficos utilizada
        // Aquí se actualizarían los datos del gráfico
    },

    // Actualizar gráfico de rendimiento
    updatePerformanceChart: function() {
        // Implementación depende de la librería de gráficos utilizada
        // Aquí se actualizarían los datos del gráfico
    },

    // Colectar muestra final
    collectFinalSample: function() {
        this.log('Colectando muestra final de memoria', 'info');
        
        const finalSample = {
            timestamp: Date.now(),
            type: 'final',
            memory: this.getMemoryInfo(),
            performance: this.getPerformanceInfo(),
            resources: this.getResourceInfo(),
            dom: this.getDOMInfo(),
            detailed: {
                objectCounts: this.countObjectsByType(),
                memoryBreakdown: this.getMemoryBreakdown(),
                performanceMetrics: this.getDetailedPerformanceMetrics(),
                heapInfo: this.getHeapInfo(),
                summary: this.generateFinalSummary()
            }
        };
        
        this.state.memorySamples.push(finalSample);
        
        // Emitir evento de muestra final
        this.emitEvent('memory:final-sample', finalSample);
    },

    // Generar resumen final
    generateFinalSummary: function() {
        return {
            totalSamples: this.state.stats.totalSamples,
            totalAnalyses: this.state.stats.totalAnalyses,
            averageMemoryUsage: this.state.stats.averageMemoryUsage,
            peakMemoryUsage: this.state.stats.peakMemoryUsage,
            memoryLeaksDetected: this.state.stats.memoryLeaksDetected,
            sessionDuration: Date.now() - (this.state.memorySamples[0]?.timestamp || Date.now()),
            browserCapabilities: this.state.browserCapabilities
        };
    },

    // Emitir alerta
    raiseAlert: function(type, data, severity = 'warning') {
        this.log(`Alerta de memoria: ${type}`, severity, data);
        
        // Emitir evento de alerta
        this.emitEvent('memory:alert', {
            type,
            severity,
            data,
            timestamp: Date.now()
        });
    },

    // Pausar profiling
    pauseProfiling: function() {
        if (this.samplingInterval) clearInterval(this.samplingInterval);
        if (this.deepSamplingInterval) clearInterval(this.deepSamplingInterval);
        if (this.heapAnalysisInterval) clearInterval(this.heapAnalysisInterval);
        if (this.chartUpdateInterval) clearInterval(this.chartUpdateInterval);
        
        this.state.profilingActive = false;
        this.log('Profiling de memoria pausado', 'info');
    },

    // Reanudar profiling
    resumeProfiling: function() {
        this.setupSampling();
        
        if (this.config.enableHeapAnalysis) {
            this.setupHeapAnalysis();
        }
        
        if (this.config.enableVisualization) {
            this.setupVisualization();
        }
        
        this.state.profilingActive = true;
        this.log('Profiling de memoria reanudado', 'info');
    },

    // Emitir evento
    emitEvent: function(eventType, data) {
        if (typeof document !== 'undefined') {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    },

    // Obtener reporte del profiler
    getProfilerReport: function() {
        return {
            timestamp: Date.now(),
            stats: this.state.stats,
            currentMemory: this.getMemoryInfo(),
            currentPerformance: this.getPerformanceInfo(),
            currentResources: this.getResourceInfo(),
            currentDOM: this.getDOMInfo(),
            recentSamples: this.state.memorySamples.slice(-10),
            recentAnalyses: this.state.analysisQueue.slice(-5),
            visualization: this.state.visualization,
            browserCapabilities: this.state.browserCapabilities,
            config: this.config
        };
    },

    // Obtener métricas actuales
    getCurrentMetrics: function() {
        return {
            ...this.state.stats,
            profilingActive: this.state.profilingActive,
            sampleCount: this.state.memorySamples.length,
            analysisCount: this.state.analysisQueue.length,
            memoryInfo: this.getMemoryInfo(),
            performanceInfo: this.getPerformanceInfo(),
            resourceInfo: this.getResourceInfo(),
            domInfo: this.getDOMInfo()
        };
    },

    // Reiniciar profiler
    reset: function() {
        this.log('Reiniciando MemoryProfiler...');
        
        // Pausar profiling
        this.pauseProfiling();
        
        // Limpiar estado
        this.state.memorySamples = [];
        this.state.performanceSamples = [];
        this.state.heapSnapshots = [];
        this.state.currentAnalysis = null;
        this.state.analysisQueue = [];
        
        // Reiniciar estadísticas
        this.state.stats = {
            totalSamples: 0,
            totalAnalyses: 0,
            averageMemoryUsage: 0,
            peakMemoryUsage: 0,
            averagePerformance: 0,
            memoryLeaksDetected: 0,
            lastSample: null,
            lastAnalysis: null
        };
        
        // Reiniciar visualización
        this.state.visualization.timeline = [];
        
        // Reanudar profiling
        this.resumeProfiling();
        
        this.log('MemoryProfiler reiniciado', 'success');
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
            const logMessage = `[${timestamp}] [MemoryProfiler] [${level.toUpperCase()}] ${message}`;
            
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

// Exportar el MemoryProfiler
export default MemoryProfiler;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.MemoryProfiler = MemoryProfiler;
}