/**
 * Justice 2 Memory Leak Detector
 * Sistema avanzado de detección automática de memory leaks
 * Proporciona análisis heurístico y detección de patrones sospechosos
 */

import { XSSProtection } from './xss-protection.js';

const MemoryLeakDetector = {
    // Configuración del detector
    config: {
        // Configuración de análisis
        analysisInterval: 60000,          // 1 minuto
        deepAnalysisInterval: 300000,     // 5 minutos
        memorySnapshotInterval: 30000,    // 30 segundos
        
        // Umbrales de detección
        memoryGrowthThreshold: 0.1,     // 10% de crecimiento
        resourceGrowthThreshold: 0.2,    // 20% de crecimiento de recursos
        maxResourceAge: 600000,          // 10 minutos máximo para recursos
        suspiciousPatternThreshold: 3,     // 3 ocurrencias para patrón sospechoso
        
        // Configuración de heurística
        enableHeuristics: true,
        enablePatternDetection: true,
        enableStackTraceAnalysis: true,
        enableObjectGraphAnalysis: true,
        
        // Configuración de alertas
        enableAlerts: true,
        alertCooldown: 300000,           // 5 minutos entre alertas del mismo tipo
        maxAlertsPerType: 5,            // Máximo alertas por tipo
        
        // Configuración de logging
        enableLogging: true,
        logLevel: 'info',
        enableDetailedTraces: false
    },

    // Estado del detector
    state: {
        initialized: false,
        analysisActive: false,
        
        // Snapshots de memoria
        memorySnapshots: [],
        resourceSnapshots: [],
        
        // Patrones detectados
        detectedPatterns: new Map(),
        suspiciousObjects: new Map(),
        leakCandidates: new Map(),
        
        // Estadísticas
        stats: {
            totalAnalyses: 0,
            leaksDetected: 0,
            falsePositives: 0,
            patternsDetected: 0,
            lastAnalysis: null,
            averageAnalysisTime: 0
        },
        
        // Estado de alertas
        alertState: {
            lastAlerts: new Map(),
            alertCounts: new Map(),
            cooldownTimers: new Map()
        },
        
        // Heurísticas configuradas
        heuristics: {
            memoryGrowth: true,
            resourceAccumulation: true,
            circularReferences: true,
            eventListenerLeaks: true,
            timerLeaks: true,
            domLeaks: true,
            closureLeaks: true
        }
    },

    // Inicialización del detector
    init: function() {
        if (this.state.initialized) {
            this.log('MemoryLeakDetector ya está inicializado', 'warn');
            return;
        }

        try {
            this.log('Inicializando MemoryLeakDetector...');
            
            // Configurar análisis periódico
            this.setupPeriodicAnalysis();
            
            // Configurar heurísticas
            if (this.config.enableHeuristics) {
                this.setupHeuristics();
            }
            
            // Configurar detección de patrones
            if (this.config.enablePatternDetection) {
                this.setupPatternDetection();
            }
            
            // Configurar manejadores de eventos
            this.setupEventHandlers();
            
            this.state.initialized = true;
            this.state.analysisActive = true;
            this.log('MemoryLeakDetector inicializado correctamente', 'success');
            
            // Emitir evento de inicialización
            this.emitEvent('memory:leak-detector:initialized', {
                timestamp: Date.now(),
                config: this.config
            });
            
        } catch (error) {
            this.log('Error inicializando MemoryLeakDetector: ' + error.message, 'error');
            throw error;
        }
    },

    // Configurar análisis periódico
    setupPeriodicAnalysis: function() {
        // Análisis rápido
        this.analysisInterval = setInterval(() => {
            this.performQuickAnalysis();
        }, this.config.analysisInterval);
        
        // Análisis profundo
        this.deepAnalysisInterval = setInterval(() => {
            this.performDeepAnalysis();
        }, this.config.deepAnalysisInterval);
        
        // Snapshots de memoria
        this.memorySnapshotInterval = setInterval(() => {
            this.captureMemorySnapshot();
        }, this.config.memorySnapshotInterval);
        
        this.log('Análisis periódico configurado', 'info');
    },

    // Configurar heurísticas
    setupHeuristics: function() {
        // Configurar heurística de crecimiento de memoria
        if (this.state.heuristics.memoryGrowth) {
            this.setupMemoryGrowthHeuristic();
        }
        
        // Configurar heurística de acumulación de recursos
        if (this.state.heuristics.resourceAccumulation) {
            this.setupResourceAccumulationHeuristic();
        }
        
        // Configurar heurística de referencias circulares
        if (this.state.heuristics.circularReferences) {
            this.setupCircularReferenceHeuristic();
        }
        
        this.log('Heurísticas configuradas', 'info');
    },

    // Configurar detección de patrones
    setupPatternDetection: function() {
        // Patrones de memory leaks comunes
        this.patterns = {
            // Event listeners no removidos
            eventListenerLeaks: {
                name: 'Event Listener Leaks',
                description: 'Event listeners no removidos correctamente',
                detect: () => this.detectEventListenerLeaks()
            },
            
            // Timers no limpiados
            timerLeaks: {
                name: 'Timer Leaks',
                description: 'Timers (setTimeout/setInterval) no limpiados',
                detect: () => this.detectTimerLeaks()
            },
            
            // Referencias DOM
            domLeaks: {
                name: 'DOM Reference Leaks',
                description: 'Referencias a elementos DOM eliminados',
                detect: () => this.detectDOMLeaks()
            },
            
            // Closures
            closureLeaks: {
                name: 'Closure Leaks',
                description: 'Closures que mantienen referencias innecesarias',
                detect: () => this.detectClosureLeaks()
            },
            
            // Promesas no resueltas
            promiseLeaks: {
                name: 'Promise Leaks',
                description: 'Promesas que nunca se resuelven o rechazan',
                detect: () => this.detectPromiseLeaks()
            }
        };
        
        this.log('Detección de patrones configurada', 'info');
    },

    // Configurar manejadores de eventos
    setupEventHandlers: function() {
        if (typeof window !== 'undefined') {
            // Detectar cambios de página
            window.addEventListener('beforeunload', () => {
                this.performFinalAnalysis();
            });
            
            // Pausar análisis cuando la página está oculta
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseAnalysis();
                } else {
                    this.resumeAnalysis();
                }
            });
        }
    },

    // Capturar snapshot de memoria
    captureMemorySnapshot: function() {
        const snapshot = {
            timestamp: Date.now(),
            memory: this.getMemoryInfo(),
            resources: this.getResourceInfo(),
            domNodes: this.getDOMNodeCount(),
            eventListeners: this.getEventListenerCount()
        };
        
        this.state.memorySnapshots.push(snapshot);
        
        // Limitar snapshots a mantener
        if (this.state.memorySnapshots.length > 100) {
            this.state.memorySnapshots = this.state.memorySnapshots.slice(-50);
        }
        
        return snapshot;
    },

    // Obtener información de memoria
    getMemoryInfo: function() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                percentage: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
            };
        }
        return null;
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

    // Obtener conteo de nodos DOM
    getDOMNodeCount: function() {
        if (typeof document !== 'undefined') {
            return document.getElementsByTagName('*').length;
        }
        return 0;
    },

    // Obtener conteo de event listeners
    getEventListenerCount: function() {
        let count = 0;
        
        if (typeof ResourceTracker !== 'undefined' && ResourceTracker.state) {
            count = ResourceTracker.state.resources.eventListeners.size;
        }
        
        return count;
    },

    // Realizar análisis rápido
    performQuickAnalysis: function() {
        const startTime = Date.now();
        
        try {
            this.log('Iniciando análisis rápido de memory leaks', 'debug');
            
            // Capturar snapshot actual
            const currentSnapshot = this.captureMemorySnapshot();
            
            // Análisis heurístico rápido
            const quickResults = this.performQuickHeuristics(currentSnapshot);
            
            // Verificar umbrales críticos
            this.checkCriticalThresholds(currentSnapshot);
            
            // Actualizar estadísticas
            this.updateAnalysisStats(startTime);
            
            // Emitir evento de análisis
            this.emitEvent('memory:quick-analysis', {
                timestamp: Date.now(),
                results: quickResults,
                snapshot: currentSnapshot
            });
            
        } catch (error) {
            this.log('Error en análisis rápido: ' + error.message, 'error');
        }
    },

    // Realizar análisis profundo
    performDeepAnalysis: function() {
        const startTime = Date.now();
        
        try {
            this.log('Iniciando análisis profundo de memory leaks', 'debug');
            
            // Capturar snapshot detallado
            const detailedSnapshot = this.captureDetailedSnapshot();
            
            // Análisis heurístico completo
            const heuristicsResults = this.performCompleteHeuristics(detailedSnapshot);
            
            // Detección de patrones
            const patternResults = this.detectAllPatterns();
            
            // Análisis de grafos de objetos
            const objectGraphResults = this.analyzeObjectGraph();
            
            // Identificar candidatos a leaks
            const leakCandidates = this.identifyLeakCandidates(detailedSnapshot, heuristicsResults, patternResults);
            
            // Generar reporte
            const analysisReport = this.generateAnalysisReport(detailedSnapshot, heuristicsResults, patternResults, objectGraphResults, leakCandidates);
            
            // Actualizar estadísticas
            this.updateAnalysisStats(startTime);
            
            // Emitir alertas si es necesario
            this.processAnalysisResults(analysisReport);
            
            // Emitir evento de análisis profundo
            this.emitEvent('memory:deep-analysis', {
                timestamp: Date.now(),
                report: analysisReport
            });
            
        } catch (error) {
            this.log('Error en análisis profundo: ' + error.message, 'error');
        }
    },

    // Capturar snapshot detallado
    captureDetailedSnapshot: function() {
        const snapshot = this.captureMemorySnapshot();
        
        // Agregar información detallada
        snapshot.detailed = {
            stackTraces: this.captureStackTraces(),
            objectCounts: this.countObjectsByType(),
            windowProperties: this.getWindowProperties(),
            globalVariables: this.getGlobalVariables()
        };
        
        return snapshot;
    },

    // Capturar stack traces
    captureStackTraces: function() {
        const traces = [];
        
        try {
            // Capturar stack trace actual
            throw new Error();
        } catch (e) {
            traces.push({
                timestamp: Date.now(),
                stack: e.stack
            });
        }
        
        return traces;
    },

    // Contar objetos por tipo
    countObjectsByType: function() {
        const counts = {};
        
        // Contar objetos comunes en window
        if (typeof window !== 'undefined') {
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

    // Obtener propiedades de window
    getWindowProperties: function() {
        if (typeof window === 'undefined') return {};
        
        const properties = {};
        let count = 0;
        
        for (const prop in window) {
            if (count++ < 100) { // Limitar a primeras 100 propiedades
                try {
                    properties[prop] = typeof window[prop];
                } catch (e) {
                    properties[prop] = 'inaccessible';
                }
            }
        }
        
        return properties;
    },

    // Obtener variables globales
    getGlobalVariables: function() {
        if (typeof window === 'undefined') return {};
        
        const globals = {};
        
        // Variables que podrían causar leaks
        const suspiciousGlobals = [
            'temp', 'tmp', 'cache', 'data', 'store',
            'interval', 'timeout', 'timer', 'listener'
        ];
        
        for (const global of suspiciousGlobals) {
            if (window[global] !== undefined) {
                globals[global] = {
                    type: typeof window[global],
                    value: this.sanitizeValue(window[global])
                };
            }
        }
        
        return globals;
    },

    // Sanitizar valor para logging
    sanitizeValue: function(value) {
        if (value === null) return null;
        if (value === undefined) return undefined;
        
        const type = typeof value;
        
        if (type === 'string') {
            return value.length > 100 ? value.substring(0, 100) + '...' : value;
        }
        
        if (type === 'object') {
            if (Array.isArray(value)) {
                return `Array(${value.length})`;
            }
            return value.constructor ? value.constructor.name : 'Object';
        }
        
        return value;
    },

    // Realizar heurísticas rápidas
    performQuickHeuristics: function(snapshot) {
        const results = {
            memoryGrowth: this.checkMemoryGrowth(snapshot),
            resourceGrowth: this.checkResourceGrowth(snapshot),
            suspiciousPatterns: this.checkSuspiciousPatterns(snapshot)
        };
        
        return results;
    },

    // Realizar heurísticas completas
    performCompleteHeuristics: function(snapshot) {
        const results = {
            memoryGrowth: this.checkMemoryGrowth(snapshot),
            resourceGrowth: this.checkResourceGrowth(snapshot),
            suspiciousPatterns: this.checkSuspiciousPatterns(snapshot),
            objectGraphAnalysis: this.analyzeObjectGraph(snapshot),
            stackTraceAnalysis: this.analyzeStackTraces(snapshot)
        };
        
        return results;
    },

    // Verificar crecimiento de memoria
    checkMemoryGrowth: function(snapshot) {
        if (this.state.memorySnapshots.length < 3) {
            return { detected: false, reason: 'Insufficient data' };
        }
        
        const recentSnapshots = this.state.memorySnapshots.slice(-5);
        const memoryUsages = recentSnapshots.map(s => s.memory?.percentage || 0);
        
        // Calcular tendencia
        const growth = this.calculateGrowthTrend(memoryUsages);
        
        if (growth > this.config.memoryGrowthThreshold) {
            return {
                detected: true,
                growth,
                threshold: this.config.memoryGrowthThreshold,
                samples: memoryUsages.length,
                recommendation: 'Possible memory leak detected - memory usage growing consistently'
            };
        }
        
        return { detected: false, growth };
    },

    // Verificar crecimiento de recursos
    checkResourceGrowth: function(snapshot) {
        if (this.state.memorySnapshots.length < 3) {
            return { detected: false, reason: 'Insufficient data' };
        }
        
        const recentSnapshots = this.state.memorySnapshots.slice(-5);
        const resourceCounts = recentSnapshots.map(s => {
            const total = Object.values(s.resources || {}).reduce((sum, count) => sum + count, 0);
            return total;
        });
        
        // Calcular tendencia
        const growth = this.calculateGrowthTrend(resourceCounts);
        
        if (growth > this.config.resourceGrowthThreshold) {
            return {
                detected: true,
                growth,
                threshold: this.config.resourceGrowthThreshold,
                samples: resourceCounts.length,
                recommendation: 'Resource accumulation detected - possible leak'
            };
        }
        
        return { detected: false, growth };
    },

    // Calcular tendencia de crecimiento
    calculateGrowthTrend: function(values) {
        if (values.length < 2) return 0;
        
        const first = values[0];
        const last = values[values.length - 1];
        
        if (first === 0) return 0;
        
        return (last - first) / first;
    },

    // Verificar patrones sospechosos
    checkSuspiciousPatterns: function(snapshot) {
        const patterns = [];
        
        // Verificar demasiados event listeners
        if (snapshot.resources?.eventListeners > 100) {
            patterns.push({
                type: 'too-many-listeners',
                count: snapshot.resources.eventListeners,
                threshold: 100,
                severity: 'medium'
            });
        }
        
        // Verificar demasiados timers
        const totalTimers = (snapshot.resources?.intervals || 0) + (snapshot.resources?.timeouts || 0);
        if (totalTimers > 50) {
            patterns.push({
                type: 'too-many-timers',
                count: totalTimers,
                threshold: 50,
                severity: 'medium'
            });
        }
        
        // Verificar demasiados nodos DOM
        if (snapshot.domNodes > 5000) {
            patterns.push({
                type: 'too-many-dom-nodes',
                count: snapshot.domNodes,
                threshold: 5000,
                severity: 'low'
            });
        }
        
        return {
            detected: patterns.length > 0,
            patterns
        };
    },

    // Analizar grafos de objetos
    analyzeObjectGraph: function(snapshot) {
        const analysis = {
            circularReferences: [],
            orphanedObjects: [],
            largeObjects: []
        };
        
        // Esta es una implementación simplificada
        // En un entorno real se necesitaría un análisis más profundo
        
        return analysis;
    },

    // Analizar stack traces
    analyzeStackTraces: function(snapshot) {
        const analysis = {
            suspiciousFrames: [],
            commonPatterns: [],
            leakIndicators: []
        };
        
        if (!snapshot.detailed?.stackTraces) {
            return analysis;
        }
        
        // Analizar stack traces en busca de patrones sospechosos
        for (const trace of snapshot.detailed.stackTraces) {
            const suspicious = this.analyzeStackTrace(trace.stack);
            if (suspicious.length > 0) {
                analysis.suspiciousFrames.push(...suspicious);
            }
        }
        
        return analysis;
    },

    // Analizar stack trace individual
    analyzeStackTrace: function(stack) {
        const suspicious = [];
        
        if (!stack) return suspicious;
        
        const lines = stack.split('\n');
        
        for (const line of lines) {
            // Buscar patrones sospechosos
            if (line.includes('setInterval') || line.includes('setTimeout')) {
                suspicious.push({
                    type: 'timer',
                    line: line.trim(),
                    severity: 'medium'
                });
            }
            
            if (line.includes('addEventListener')) {
                suspicious.push({
                    type: 'event-listener',
                    line: line.trim(),
                    severity: 'low'
                });
            }
            
            if (line.includes('closure') || line.includes('anonymous')) {
                suspicious.push({
                    type: 'closure',
                    line: line.trim(),
                    severity: 'low'
                });
            }
        }
        
        return suspicious;
    },

    // Detectar todos los patrones
    detectAllPatterns: function() {
        const results = {};
        
        for (const [patternName, pattern] of Object.entries(this.patterns)) {
            try {
                results[patternName] = pattern.detect();
            } catch (error) {
                this.log(`Error detectando patrón ${patternName}: ${error.message}`, 'error');
                results[patternName] = {
                    detected: false,
                    error: error.message
                };
            }
        }
        
        return results;
    },

    // Detectar leaks de event listeners
    detectEventListenerLeaks: function() {
        if (typeof ResourceTracker === 'undefined') {
            return { detected: false, reason: 'ResourceTracker not available' };
        }
        
        const listeners = ResourceTracker.state.resources.eventListeners;
        const leaks = [];
        
        for (const [id, listener] of listeners) {
            const age = Date.now() - listener.timestamp;
            
            // Verificar listeners muy antiguos
            if (age > this.config.maxResourceAge) {
                leaks.push({
                    id,
                    age,
                    element: listener.element,
                    event: listener.event,
                    stackTrace: listener.stackTrace
                });
            }
            
            // Verificar listeners en elementos eliminados
            if (listener.element && !document.contains(listener.element)) {
                leaks.push({
                    id,
                    type: 'orphaned-element',
                    element: listener.element,
                    event: listener.event
                });
            }
        }
        
        return {
            detected: leaks.length > 0,
            leaks,
            totalListeners: listeners.size
        };
    },

    // Detectar leaks de timers
    detectTimerLeaks: function() {
        if (typeof ResourceTracker === 'undefined') {
            return { detected: false, reason: 'ResourceTracker not available' };
        }
        
        const intervals = ResourceTracker.state.resources.intervals;
        const timeouts = ResourceTracker.state.resources.timeouts;
        const leaks = [];
        
        // Verificar intervals
        for (const [id, interval] of intervals) {
            const age = Date.now() - interval.timestamp;
            
            if (age > this.config.maxResourceAge) {
                leaks.push({
                    id,
                    type: 'interval',
                    age,
                    delay: interval.delay,
                    stackTrace: interval.stackTrace
                });
            }
        }
        
        // Verificar timeouts
        for (const [id, timeout] of timeouts) {
            const age = Date.now() - timeout.timestamp;
            
            if (age > this.config.maxResourceAge) {
                leaks.push({
                    id,
                    type: 'timeout',
                    age,
                    delay: timeout.delay,
                    stackTrace: timeout.stackTrace
                });
            }
        }
        
        return {
            detected: leaks.length > 0,
            leaks,
            totalIntervals: intervals.size,
            totalTimeouts: timeouts.size
        };
    },

    // Detectar leaks de DOM
    detectDOMLeaks: function() {
        const leaks = [];
        
        // Buscar referencias a elementos eliminados
        if (typeof ResourceTracker !== 'undefined') {
            for (const [id, ref] of ResourceTracker.state.resources.domReferences) {
                if (ref.element && !document.contains(ref.element)) {
                    leaks.push({
                        id,
                        element: ref.element,
                        metadata: ref.metadata,
                        stackTrace: ref.stackTrace
                    });
                }
            }
        }
        
        return {
            detected: leaks.length > 0,
            leaks
        };
    },

    // Detectar leaks de closures
    detectClosureLeaks: function() {
        // Implementación simplificada - detección de closures requiere análisis más complejo
        return {
            detected: false,
            reason: 'Closure leak detection requires deeper analysis'
        };
    },

    // Detectar leaks de promesas
    detectPromiseLeaks: function() {
        if (typeof ResourceTracker === 'undefined') {
            return { detected: false, reason: 'ResourceTracker not available' };
        }
        
        const promises = ResourceTracker.state.resources.promises;
        const leaks = [];
        
        for (const [id, promise] of promises) {
            const age = Date.now() - promise.timestamp;
            
            // Verificar promesas muy antiguas
            if (age > this.config.maxResourceAge) {
                leaks.push({
                    id,
                    age,
                    metadata: promise.metadata,
                    stackTrace: promise.stackTrace
                });
            }
        }
        
        return {
            detected: leaks.length > 0,
            leaks,
            totalPromises: promises.size
        };
    },

    // Identificar candidatos a leaks
    identifyLeakCandidates: function(snapshot, heuristicsResults, patternResults) {
        const candidates = [];
        
        // Candidatos basados en heurísticas
        if (heuristicsResults.memoryGrowth.detected) {
            candidates.push({
                type: 'memory-growth',
                severity: 'high',
                data: heuristicsResults.memoryGrowth
            });
        }
        
        if (heuristicsResults.resourceGrowth.detected) {
            candidates.push({
                type: 'resource-growth',
                severity: 'medium',
                data: heuristicsResults.resourceGrowth
            });
        }
        
        // Candidatos basados en patrones
        for (const [patternName, result] of Object.entries(patternResults)) {
            if (result.detected) {
                candidates.push({
                    type: 'pattern',
                    patternName,
                    severity: this.getPatternSeverity(patternName),
                    data: result
                });
            }
        }
        
        return candidates;
    },

    // Obtener severidad de patrón
    getPatternSeverity: function(patternName) {
        const severities = {
            'eventListenerLeaks': 'high',
            'timerLeaks': 'high',
            'domLeaks': 'medium',
            'closureLeaks': 'high',
            'promiseLeaks': 'medium'
        };
        
        return severities[patternName] || 'medium';
    },

    // Generar reporte de análisis
    generateAnalysisReport: function(snapshot, heuristicsResults, patternResults, objectGraphResults, leakCandidates) {
        const report = {
            timestamp: Date.now(),
            snapshot: {
                memory: snapshot.memory,
                resources: snapshot.resources,
                domNodes: snapshot.domNodes
            },
            heuristics: heuristicsResults,
            patterns: patternResults,
            objectGraph: objectGraphResults,
            leakCandidates,
            summary: {
                totalCandidates: leakCandidates.length,
                highSeverityCandidates: leakCandidates.filter(c => c.severity === 'high').length,
                mediumSeverityCandidates: leakCandidates.filter(c => c.severity === 'medium').length,
                lowSeverityCandidates: leakCandidates.filter(c => c.severity === 'low').length
            },
            recommendations: this.generateRecommendations(leakCandidates)
        };
        
        return report;
    },

    // Generar recomendaciones
    generateRecommendations: function(leakCandidates) {
        const recommendations = [];
        
        for (const candidate of leakCandidates) {
            switch (candidate.type) {
                case 'memory-growth':
                    recommendations.push({
                        priority: 'high',
                        message: 'Memory usage growing consistently. Review object lifecycle and ensure proper cleanup.',
                        actions: ['Implement proper cleanup in component lifecycle', 'Use WeakMap/WeakSet for temporary references', 'Review closure usage']
                    });
                    break;
                    
                case 'resource-growth':
                    recommendations.push({
                        priority: 'medium',
                        message: 'Resource accumulation detected. Ensure proper resource management.',
                        actions: ['Clear timers and intervals when not needed', 'Remove event listeners properly', 'Clean up DOM references']
                    });
                    break;
                    
                case 'pattern':
                    if (candidate.patternName === 'eventListenerLeaks') {
                        recommendations.push({
                            priority: 'high',
                            message: 'Event listener leaks detected. Remove listeners when elements are removed.',
                            actions: ['Use event delegation', 'Implement proper cleanup in component lifecycle', 'Use WeakMap for element references']
                        });
                    }
                    break;
            }
        }
        
        return recommendations;
    },

    // Procesar resultados del análisis
    processAnalysisResults: function(analysisReport) {
        // Actualizar estadísticas
        if (analysisReport.leakCandidates.length > 0) {
            this.state.stats.leaksDetected += analysisReport.leakCandidates.length;
        }
        
        // Emitir alertas para candidatos de alta severidad
        const highSeverityCandidates = analysisReport.leakCandidates.filter(c => c.severity === 'high');
        
        for (const candidate of highSeverityCandidates) {
            this.raiseAlert('memory-leak-detected', {
                candidate,
                report: analysisReport
            }, 'high');
        }
        
        // Guardar candidatos para seguimiento
        for (const candidate of analysisReport.leakCandidates) {
            this.state.leakCandidates.set(Date.now(), candidate);
        }
        
        // Limitar candidatos guardados
        if (this.state.leakCandidates.size > 100) {
            const oldestKeys = Array.from(this.state.leakCandidates.keys()).slice(0, 50);
            for (const key of oldestKeys) {
                this.state.leakCandidates.delete(key);
            }
        }
    },

    // Verificar umbrales críticos
    checkCriticalThresholds: function(snapshot) {
        if (snapshot.memory && snapshot.memory.percentage > 0.9) {
            this.raiseAlert('critical-memory-usage', {
                usage: snapshot.memory.percentage,
                snapshot
            }, 'critical');
        }
        
        if (snapshot.resources) {
            const totalResources = Object.values(snapshot.resources).reduce((sum, count) => sum + count, 0);
            if (totalResources > 1000) {
                this.raiseAlert('excessive-resources', {
                    total: totalResources,
                    resources: snapshot.resources
                }, 'high');
            }
        }
    },

    // Realizar análisis final
    performFinalAnalysis: function() {
        this.log('Realizando análisis final de memory leaks', 'info');
        
        const finalReport = this.performDeepAnalysis();
        
        // Emitir evento de análisis final
        this.emitEvent('memory:final-analysis', {
            timestamp: Date.now(),
            report: finalReport
        });
    },

    // Emitir alerta
    raiseAlert: function(type, data, severity = 'warning') {
        if (!this.config.enableAlerts) return;
        
        // Verificar cooldown
        const lastAlert = this.state.alertState.lastAlerts.get(type);
        if (lastAlert && (Date.now() - lastAlert) < this.config.alertCooldown) {
            return;
        }
        
        // Verificar límite de alertas por tipo
        const alertCount = this.state.alertState.alertCounts.get(type) || 0;
        if (alertCount >= this.config.maxAlertsPerType) {
            return;
        }
        
        // Actualizar estado de alertas
        this.state.alertState.lastAlerts.set(type, Date.now());
        this.state.alertState.alertCounts.set(type, alertCount + 1);
        
        this.log(`Alerta de memory leak: ${type}`, severity, data);
        
        // Emitir evento de alerta
        this.emitEvent('memory:leak-alert', {
            type,
            severity,
            data,
            timestamp: Date.now()
        });
    },

    // Actualizar estadísticas de análisis
    updateAnalysisStats: function(startTime) {
        const analysisTime = Date.now() - startTime;
        
        this.state.stats.totalAnalyses++;
        this.state.stats.lastAnalysis = Date.now();
        
        // Actualizar tiempo promedio
        const totalAnalyses = this.state.stats.totalAnalyses;
        this.state.stats.averageAnalysisTime = 
            ((this.state.stats.averageAnalysisTime * (totalAnalyses - 1)) + analysisTime) / totalAnalyses;
    },

    // Pausar análisis
    pauseAnalysis: function() {
        if (this.analysisInterval) clearInterval(this.analysisInterval);
        if (this.deepAnalysisInterval) clearInterval(this.deepAnalysisInterval);
        if (this.memorySnapshotInterval) clearInterval(this.memorySnapshotInterval);
        
        this.state.analysisActive = false;
        this.log('Análisis de memory leaks pausado', 'info');
    },

    // Reanudar análisis
    resumeAnalysis: function() {
        this.setupPeriodicAnalysis();
        this.state.analysisActive = true;
        this.log('Análisis de memory leaks reanudado', 'info');
    },

    // Emitir evento
    emitEvent: function(eventType, data) {
        if (typeof document !== 'undefined') {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    },

    // Obtener reporte de detección
    getDetectionReport: function() {
        return {
            timestamp: Date.now(),
            stats: this.state.stats,
            leakCandidates: Array.from(this.state.leakCandidates.entries()).map(([timestamp, candidate]) => ({
                timestamp,
                ...candidate
            })),
            alertState: {
                lastAlerts: Object.fromEntries(this.state.alertState.lastAlerts),
                alertCounts: Object.fromEntries(this.state.alertState.alertCounts)
            },
            recentSnapshots: this.state.memorySnapshots.slice(-10),
            config: this.config
        };
    },

    // Reiniciar detector
    reset: function() {
        this.log('Reiniciando MemoryLeakDetector...');
        
        // Pausar análisis
        this.pauseAnalysis();
        
        // Limpiar estado
        this.state.memorySnapshots = [];
        this.state.resourceSnapshots = [];
        this.state.detectedPatterns.clear();
        this.state.suspiciousObjects.clear();
        this.state.leakCandidates.clear();
        
        // Reiniciar estadísticas
        this.state.stats = {
            totalAnalyses: 0,
            leaksDetected: 0,
            falsePositives: 0,
            patternsDetected: 0,
            lastAnalysis: null,
            averageAnalysisTime: 0
        };
        
        // Reiniciar estado de alertas
        this.state.alertState = {
            lastAlerts: new Map(),
            alertCounts: new Map(),
            cooldownTimers: new Map()
        };
        
        // Reanudar análisis
        this.resumeAnalysis();
        
        this.log('MemoryLeakDetector reiniciado', 'success');
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
            const logMessage = `[${timestamp}] [MemoryLeakDetector] [${level.toUpperCase()}] ${message}`;
            
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

// Exportar el MemoryLeakDetector
export default MemoryLeakDetector;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.MemoryLeakDetector = MemoryLeakDetector;
}