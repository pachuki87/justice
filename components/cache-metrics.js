/**
 * Justice 2 Cache Metrics - Sistema de Monitoreo de Caché Eficiente
 * Proporciona métricas detalladas y análisis de rendimiento del sistema de caché
 */

const CacheMetrics = {
    // Configuración
    config: {
        enableRealTimeMonitoring: true,
        enableHistoricalTracking: true,
        enablePerformanceAnalysis: true,
        enableHealthMonitoring: true,
        enableAlerts: true,
        enableReporting: true,
        enableOptimization: true,
        metricsRetentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 días
        aggregationInterval: 60000, // 1 minuto
        healthCheckInterval: 30000, // 30 segundos
        alertThresholds: {
            hitRate: 70, // %
            memoryUsage: 80, // %
            responseTime: 500, // ms
            errorRate: 5, // %
            cacheSize: 90 // %
        },
        enablePredictiveAnalysis: true,
        enableAnomalyDetection: true,
        enableTrendAnalysis: true,
        enableCapacityPlanning: true,
        enableBenchmarking: true,
        maxMetricsHistory: 10000,
        enableDetailedProfiling: false,
        enableResourceTracking: true
    },

    // Estado
    state: {
        metrics: new Map(),
        historicalData: new Map(),
        realTimeData: new Map(),
        healthStatus: {
            overall: 'healthy',
            components: new Map(),
            lastCheck: Date.now(),
            issues: []
        },
        alerts: new Map(),
        benchmarks: new Map(),
        trends: new Map(),
        anomalies: new Map(),
        predictions: new Map(),
        performanceBaseline: {
            hitRate: 0,
            averageResponseTime: 0,
            memoryUsage: 0,
            throughput: 0,
            errorRate: 0
        },
        aggregationTimers: new Map(),
        isInitialized: false,
        lastAggregation: Date.now(),
        lastHealthCheck: Date.now(),
        componentMetrics: new Map(),
        globalMetrics: {
            totalHits: 0,
            totalMisses: 0,
            totalSets: 0,
            totalDeletes: 0,
            totalErrors: 0,
            totalMemoryUsage: 0,
            totalResponseTime: 0,
            uptime: Date.now()
        }
    },

    /**
     * Inicializar Cache Metrics
     */
    init: async function(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        
        // Inicializar componentes de caché a monitorear
        await this.initializeCacheComponents();
        
        // Inicializar benchmarks
        await this.initializeBenchmarks();
        
        // Iniciar monitoreo en tiempo real si está habilitado
        if (this.config.enableRealTimeMonitoring) {
            this.startRealTimeMonitoring();
        }
        
        // Iniciar agregación periódica
        this.startAggregationTimer();
        
        // Iniciar health checks si está habilitado
        if (this.config.enableHealthMonitoring) {
            this.startHealthChecks();
        }
        
        // Iniciar análisis predictivo si está habilitado
        if (this.config.enablePredictiveAnalysis) {
            this.startPredictiveAnalysis();
        }
        
        this.state.isInitialized = true;
        this.log('Cache Metrics inicializado con monitoreo avanzado');
    },

    /**
     * Inicializar componentes de caché a monitorear
     */
    initializeCacheComponents: async function() {
        const cacheComponents = [
            'SmartCache',
            'AdaptiveCache', 
            'PredictiveCache',
            'DistributedCache',
            'ComponentCache',
            'TemplateCache',
            'AssetCache',
            'PromiseCache',
            'LRUCache',
            'TTLCache',
            'PersistentCache',
            'MultiLevelCache',
            'CacheManager',
            'QueryCache'
        ];
        
        for (const componentName of cacheComponents) {
            this.state.componentMetrics.set(componentName, {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                errors: 0,
                memoryUsage: 0,
                responseTime: 0,
                hitRate: 0,
                lastUpdate: Date.now(),
                status: 'unknown'
            });
        }
    },

    /**
     * Inicializar benchmarks
     */
    initializeBenchmarks: async function() {
        const defaultBenchmarks = {
            hitRate: { excellent: 95, good: 85, acceptable: 70, poor: 50 },
            responseTime: { excellent: 50, good: 100, acceptable: 300, poor: 500 },
            memoryUsage: { excellent: 50, good: 70, acceptable: 85, poor: 95 },
            throughput: { excellent: 1000, good: 500, acceptable: 200, poor: 100 },
            errorRate: { excellent: 0, good: 1, acceptable: 3, poor: 5 }
        };
        
        for (const [metric, thresholds] of Object.entries(defaultBenchmarks)) {
            this.state.benchmarks.set(metric, thresholds);
        }
    },

    /**
     * Registrar métrica
     */
    recordMetric: function(componentName, metricType, value, metadata = {}) {
        const timestamp = Date.now();
        
        // Actualizar métricas del componente
        this.updateComponentMetrics(componentName, metricType, value);
        
        // Actualizar métricas globales
        this.updateGlobalMetrics(metricType, value);
        
        // Almacenar métrica en tiempo real
        if (this.config.enableRealTimeMonitoring) {
            this.storeRealTimeMetric(componentName, metricType, value, timestamp, metadata);
        }
        
        // Almacenar métrica histórica
        if (this.config.enableHistoricalTracking) {
            this.storeHistoricalMetric(componentName, metricType, value, timestamp, metadata);
        }
        
        // Detectar anomalías si está habilitado
        if (this.config.enableAnomalyDetection) {
            this.detectAnomaly(componentName, metricType, value, timestamp);
        }
        
        // Verificar alertas si está habilitado
        if (this.config.enableAlerts) {
            this.checkAlerts(componentName, metricType, value);
        }
    },

    /**
     * Actualizar métricas del componente
     */
    updateComponentMetrics: function(componentName, metricType, value) {
        if (!this.state.componentMetrics.has(componentName)) {
            return;
        }
        
        const metrics = this.state.componentMetrics.get(componentName);
        
        switch (metricType) {
            case 'hit':
                metrics.hits++;
                break;
            case 'miss':
                metrics.misses++;
                break;
            case 'set':
                metrics.sets++;
                break;
            case 'delete':
                metrics.deletes++;
                break;
            case 'error':
                metrics.errors++;
                break;
            case 'memoryUsage':
                metrics.memoryUsage = value;
                break;
            case 'responseTime':
                // Calcular promedio móvil
                metrics.responseTime = (metrics.responseTime + value) / 2;
                break;
        }
        
        // Calcular hit rate
        const totalAccesses = metrics.hits + metrics.misses;
        metrics.hitRate = totalAccesses > 0 ? (metrics.hits / totalAccesses) * 100 : 0;
        
        metrics.lastUpdate = Date.now();
    },

    /**
     * Actualizar métricas globales
     */
    updateGlobalMetrics: function(metricType, value) {
        const global = this.state.globalMetrics;
        
        switch (metricType) {
            case 'hit':
                global.totalHits++;
                break;
            case 'miss':
                global.totalMisses++;
                break;
            case 'set':
                global.totalSets++;
                break;
            case 'delete':
                global.totalDeletes++;
                break;
            case 'error':
                global.totalErrors++;
                break;
            case 'memoryUsage':
                global.totalMemoryUsage = value;
                break;
            case 'responseTime':
                global.totalResponseTime = (global.totalResponseTime + value) / 2;
                break;
        }
    },

    /**
     * Almacenar métrica en tiempo real
     */
    storeRealTimeMetric: function(componentName, metricType, value, timestamp, metadata) {
        const key = `${componentName}:${metricType}`;
        
        if (!this.state.realTimeData.has(key)) {
            this.state.realTimeData.set(key, []);
        }
        
        const metricData = {
            value,
            timestamp,
            metadata
        };
        
        const realTimeMetrics = this.state.realTimeData.get(key);
        realTimeMetrics.push(metricData);
        
        // Limitar tamaño de datos en tiempo real
        if (realTimeMetrics.length > 1000) {
            realTimeMetrics.splice(0, 500); // Mantener últimos 500
        }
    },

    /**
     * Almacenar métrica histórica
     */
    storeHistoricalMetric: function(componentName, metricType, value, timestamp, metadata) {
        const key = `${componentName}:${metricType}`;
        
        if (!this.state.historicalData.has(key)) {
            this.state.historicalData.set(key, []);
        }
        
        const metricData = {
            value,
            timestamp,
            metadata
        };
        
        const historicalMetrics = this.state.historicalData.get(key);
        historicalMetrics.push(metricData);
        
        // Limitar tamaño de datos históricos
        if (historicalMetrics.length > this.config.maxMetricsHistory) {
            historicalMetrics.splice(0, historicalMetrics.length - this.config.maxMetricsHistory);
        }
        
        // Limpiar datos antiguos
        this.cleanupOldData();
    },

    /**
     * Detectar anomalía
     */
    detectAnomaly: function(componentName, metricType, value, timestamp) {
        const key = `${componentName}:${metricType}`;
        const historicalData = this.state.historicalData.get(key);
        
        if (!historicalData || historicalData.length < 10) {
            return; // Datos insuficientes para detección
        }
        
        // Calcular estadísticas históricas
        const recentValues = historicalData.slice(-50).map(d => d.value);
        const mean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
        const variance = recentValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentValues.length;
        const stdDev = Math.sqrt(variance);
        
        // Detectar anomalía (más de 2 desviaciones estándar)
        const threshold = 2 * stdDev;
        const isAnomaly = Math.abs(value - mean) > threshold;
        
        if (isAnomaly) {
            const anomaly = {
                componentName,
                metricType,
                value,
                expectedMean: mean,
                deviation: Math.abs(value - mean),
                threshold,
                timestamp,
                severity: this.calculateAnomalySeverity(Math.abs(value - mean), threshold)
            };
            
            this.state.anomalies.set(`${key}:${timestamp}`, anomaly);
            
            this.log(`Anomaly detected: ${componentName}.${metricType} = ${value} (expected: ${mean.toFixed(2)})`);
        }
    },

    /**
     * Calcular severidad de anomalía
     */
    calculateAnomalySeverity: function(deviation, threshold) {
        const ratio = deviation / threshold;
        
        if (ratio > 3) return 'critical';
        if (ratio > 2) return 'high';
        if (ratio > 1.5) return 'medium';
        return 'low';
    },

    /**
     * Verificar alertas
     */
    checkAlerts: function(componentName, metricType, value) {
        const threshold = this.config.alertThresholds[metricType];
        
        if (!threshold) {
            return;
        }
        
        let isAlert = false;
        let severity = 'warning';
        
        switch (metricType) {
            case 'hitRate':
                isAlert = value < threshold;
                severity = value < threshold * 0.5 ? 'critical' : 'warning';
                break;
            case 'memoryUsage':
            case 'cacheSize':
                isAlert = value > threshold;
                severity = value > threshold * 1.1 ? 'critical' : 'warning';
                break;
            case 'responseTime':
                isAlert = value > threshold;
                severity = value > threshold * 2 ? 'critical' : 'warning';
                break;
            case 'errorRate':
                isAlert = value > threshold;
                severity = value > threshold * 2 ? 'critical' : 'warning';
                break;
        }
        
        if (isAlert) {
            const alert = {
                componentName,
                metricType,
                value,
                threshold,
                severity,
                timestamp: Date.now(),
                resolved: false
            };
            
            const alertKey = `${componentName}:${metricType}:${Date.now()}`;
            this.state.alerts.set(alertKey, alert);
            
            this.log(`Alert triggered: ${componentName}.${metricType} = ${value} (threshold: ${threshold})`, alert);
        }
    },

    /**
     * Iniciar monitoreo en tiempo real
     */
    startRealTimeMonitoring: function() {
        setInterval(async () => {
            await this.collectRealTimeMetrics();
        }, 5000); // Cada 5 segundos
    },

    /**
     * Colectar métricas en tiempo real
     */
    collectRealTimeMetrics: async function() {
        try {
            // Colectar métricas de cada componente de caché
            for (const [componentName] of this.state.componentMetrics.entries()) {
                await this.collectComponentMetrics(componentName);
            }
            
            // Actualizar baseline de rendimiento
            this.updatePerformanceBaseline();
            
        } catch (error) {
            this.log('Error collecting real-time metrics:', error);
        }
    },

    /**
     * Colectar métricas de componente
     */
    collectComponentMetrics: async function(componentName) {
        try {
            // Obtener instancia del componente
            const component = this.getComponentInstance(componentName);
            
            if (!component || typeof component.getStatistics !== 'function') {
                return;
            }
            
            const stats = component.getStatistics();
            
            // Registrar métricas
            if (stats.hits !== undefined) {
                this.recordMetric(componentName, 'hit', stats.hits);
            }
            
            if (stats.misses !== undefined) {
                this.recordMetric(componentName, 'miss', stats.misses);
            }
            
            if (stats.cacheSize !== undefined) {
                this.recordMetric(componentName, 'memoryUsage', stats.cacheSize);
            }
            
            if (stats.averageResponseTime !== undefined) {
                this.recordMetric(componentName, 'responseTime', stats.averageResponseTime);
            }
            
            if (stats.hitRate !== undefined) {
                this.recordMetric(componentName, 'hitRate', stats.hitRate);
            }
            
        } catch (error) {
            this.log(`Error collecting metrics for ${componentName}:`, error);
            this.recordMetric(componentName, 'error', 1);
        }
    },

    /**
     * Obtener instancia del componente
     */
    getComponentInstance: function(componentName) {
        // Intentar obtener del objeto global window
        if (typeof window !== 'undefined' && window[componentName]) {
            return window[componentName];
        }
        
        // Intentar obtener de require (Node.js)
        if (typeof require !== 'undefined') {
            try {
                return require(`./${componentName.toLowerCase().replace('cache', '-cache')}`);
            } catch (error) {
                // Ignorar error
            }
        }
        
        return null;
    },

    /**
     * Actualizar baseline de rendimiento
     */
    updatePerformanceBaseline: function() {
        const global = this.state.globalMetrics;
        
        // Calcular hit rate global
        const totalAccesses = global.totalHits + global.totalMisses;
        global.hitRate = totalAccesses > 0 ? (global.totalHits / totalAccesses) * 100 : 0;
        
        // Calcular error rate
        const totalOperations = global.totalHits + global.totalMisses + global.totalSets + global.totalDeletes;
        global.errorRate = totalOperations > 0 ? (global.totalErrors / totalOperations) * 100 : 0;
        
        // Actualizar baseline
        this.state.performanceBaseline = {
            hitRate: global.hitRate,
            averageResponseTime: global.totalResponseTime,
            memoryUsage: global.totalMemoryUsage,
            throughput: totalOperations / ((Date.now() - global.uptime) / 1000),
            errorRate: global.errorRate
        };
    },

    /**
     * Iniciar timer de agregación
     */
    startAggregationTimer: function() {
        setInterval(async () => {
            await this.performAggregation();
        }, this.config.aggregationInterval);
    },

    /**
     * Realizar agregación
     */
    performAggregation: async function() {
        const now = Date.now();
        
        try {
            // Agregar métricas por componente
            for (const [componentName] of this.state.componentMetrics.entries()) {
                await this.aggregateComponentMetrics(componentName, now);
            }
            
            // Agregar métricas globales
            await this.aggregateGlobalMetrics(now);
            
            // Limpiar datos antiguos
            this.cleanupOldData();
            
            this.state.lastAggregation = now;
            
        } catch (error) {
            this.log('Error performing aggregation:', error);
        }
    },

    /**
     * Agregar métricas de componente
     */
    aggregateComponentMetrics: async function(componentName, timestamp) {
        const metrics = this.state.componentMetrics.get(componentName);
        if (!metrics) return;
        
        const aggregatedData = {
            componentName,
            timestamp,
            hits: metrics.hits,
            misses: metrics.misses,
            sets: metrics.sets,
            deletes: metrics.deletes,
            errors: metrics.errors,
            memoryUsage: metrics.memoryUsage,
            responseTime: metrics.responseTime,
            hitRate: metrics.hitRate,
            status: this.calculateComponentStatus(metrics)
        };
        
        // Almacenar datos agregados
        const key = `aggregated:${componentName}`;
        if (!this.state.metrics.has(key)) {
            this.state.metrics.set(key, []);
        }
        
        this.state.metrics.get(key).push(aggregatedData);
        
        // Limitar tamaño
        const aggregatedMetrics = this.state.metrics.get(key);
        if (aggregatedMetrics.length > 1440) { // 24 horas de datos por minuto
            aggregatedMetrics.splice(0, aggregatedMetrics.length - 1440);
        }
    },

    /**
     * Agregar métricas globales
     */
    aggregateGlobalMetrics: async function(timestamp) {
        const global = this.state.globalMetrics;
        
        const aggregatedData = {
            componentName: 'global',
            timestamp,
            totalHits: global.totalHits,
            totalMisses: global.totalMisses,
            totalSets: global.totalSets,
            totalDeletes: global.totalDeletes,
            totalErrors: global.totalErrors,
            memoryUsage: global.totalMemoryUsage,
            responseTime: global.totalResponseTime,
            hitRate: global.hitRate,
            errorRate: global.errorRate,
            throughput: this.calculateThroughput()
        };
        
        const key = 'aggregated:global';
        if (!this.state.metrics.has(key)) {
            this.state.metrics.set(key, []);
        }
        
        this.state.metrics.get(key).push(aggregatedData);
        
        // Limitar tamaño
        const aggregatedMetrics = this.state.metrics.get(key);
        if (aggregatedMetrics.length > 1440) {
            aggregatedMetrics.splice(0, aggregatedMetrics.length - 1440);
        }
    },

    /**
     * Calcular estado del componente
     */
    calculateComponentStatus: function(metrics) {
        const benchmarks = this.state.benchmarks;
        
        let score = 0;
        let factors = 0;
        
        // Evaluar hit rate
        if (metrics.hitRate !== undefined && benchmarks.has('hitRate')) {
            const hitRateBenchmark = benchmarks.get('hitRate');
            if (metrics.hitRate >= hitRateBenchmark.excellent) score += 4;
            else if (metrics.hitRate >= hitRateBenchmark.good) score += 3;
            else if (metrics.hitRate >= hitRateBenchmark.acceptable) score += 2;
            else if (metrics.hitRate >= hitRateBenchmark.poor) score += 1;
            factors++;
        }
        
        // Evaluar tiempo de respuesta
        if (metrics.responseTime !== undefined && benchmarks.has('responseTime')) {
            const responseBenchmark = benchmarks.get('responseTime');
            if (metrics.responseTime <= responseBenchmark.excellent) score += 4;
            else if (metrics.responseTime <= responseBenchmark.good) score += 3;
            else if (metrics.responseTime <= responseBenchmark.acceptable) score += 2;
            else if (metrics.responseTime <= responseBenchmark.poor) score += 1;
            factors++;
        }
        
        // Evaluar uso de memoria
        if (metrics.memoryUsage !== undefined && benchmarks.has('memoryUsage')) {
            const memoryBenchmark = benchmarks.get('memoryUsage');
            if (metrics.memoryUsage <= memoryBenchmark.excellent) score += 4;
            else if (metrics.memoryUsage <= memoryBenchmark.good) score += 3;
            else if (metrics.memoryUsage <= memoryBenchmark.acceptable) score += 2;
            else if (metrics.memoryUsage <= memoryBenchmark.poor) score += 1;
            factors++;
        }
        
        const averageScore = factors > 0 ? score / factors : 0;
        
        if (averageScore >= 3.5) return 'excellent';
        if (averageScore >= 2.5) return 'good';
        if (averageScore >= 1.5) return 'acceptable';
        if (averageScore >= 0.5) return 'poor';
        return 'critical';
    },

    /**
     * Calcular throughput
     */
    calculateThroughput: function() {
        const global = this.state.globalMetrics;
        const totalOperations = global.totalHits + global.totalMisses + global.totalSets + global.totalDeletes;
        const uptime = (Date.now() - global.uptime) / 1000; // segundos
        
        return uptime > 0 ? totalOperations / uptime : 0;
    },

    /**
     * Iniciar health checks
     */
    startHealthChecks: function() {
        setInterval(async () => {
            await this.performHealthCheck();
        }, this.config.healthCheckInterval);
    },

    /**
     * Realizar health check
     */
    performHealthCheck: async function() {
        const now = Date.now();
        const issues = [];
        let overallStatus = 'healthy';
        
        try {
            // Verificar salud de cada componente
            for (const [componentName, metrics] of this.state.componentMetrics.entries()) {
                const componentHealth = await this.checkComponentHealth(componentName, metrics);
                this.state.healthStatus.components.set(componentName, componentHealth);
                
                if (componentHealth.status !== 'healthy') {
                    issues.push({
                        component: componentName,
                        issue: componentHealth.issue,
                        severity: componentHealth.severity
                    });
                    
                    if (componentHealth.severity === 'critical') {
                        overallStatus = 'critical';
                    } else if (overallStatus === 'healthy' && componentHealth.severity === 'warning') {
                        overallStatus = 'warning';
                    }
                }
            }
            
            // Verificar salud global
            const globalHealth = await this.checkGlobalHealth();
            if (globalHealth.status !== 'healthy') {
                issues.push({
                    component: 'global',
                    issue: globalHealth.issue,
                    severity: globalHealth.severity
                });
                
                if (globalHealth.severity === 'critical') {
                    overallStatus = 'critical';
                } else if (overallStatus === 'healthy' && globalHealth.severity === 'warning') {
                    overallStatus = 'warning';
                }
            }
            
            // Actualizar estado de salud
            this.state.healthStatus = {
                overall: overallStatus,
                components: this.state.healthStatus.components,
                lastCheck: now,
                issues
            };
            
        } catch (error) {
            this.log('Error performing health check:', error);
            this.state.healthStatus.overall = 'error';
            this.state.healthStatus.issues.push({
                component: 'system',
                issue: 'Health check failed',
                severity: 'error',
                error: error.message
            });
        }
    },

    /**
     * Verificar salud de componente
     */
    checkComponentHealth: async function(componentName, metrics) {
        const issues = [];
        let severity = 'healthy';
        
        // Verificar hit rate
        if (metrics.hitRate < this.config.alertThresholds.hitRate) {
            issues.push(`Low hit rate: ${metrics.hitRate.toFixed(2)}%`);
            severity = metrics.hitRate < this.config.alertThresholds.hitRate * 0.5 ? 'critical' : 'warning';
        }
        
        // Verificar tiempo de respuesta
        if (metrics.responseTime > this.config.alertThresholds.responseTime) {
            issues.push(`High response time: ${metrics.responseTime.toFixed(2)}ms`);
            if (severity === 'healthy') {
                severity = metrics.responseTime > this.config.alertThresholds.responseTime * 2 ? 'critical' : 'warning';
            }
        }
        
        // Verificar errores
        if (metrics.errors > 0) {
            issues.push(`Errors detected: ${metrics.errors}`);
            severity = 'warning';
        }
        
        return {
            status: severity,
            issues: issues.length > 0 ? issues.join(', ') : null,
            severity,
            lastUpdate: metrics.lastUpdate
        };
    },

    /**
     * Verificar salud global
     */
    checkGlobalHealth: async function() {
        const global = this.state.globalMetrics;
        const issues = [];
        let severity = 'healthy';
        
        // Verificar hit rate global
        if (global.hitRate < this.config.alertThresholds.hitRate) {
            issues.push(`Low global hit rate: ${global.hitRate.toFixed(2)}%`);
            severity = global.hitRate < this.config.alertThresholds.hitRate * 0.5 ? 'critical' : 'warning';
        }
        
        // Verificar error rate global
        if (global.errorRate > this.config.alertThresholds.errorRate) {
            issues.push(`High error rate: ${global.errorRate.toFixed(2)}%`);
            if (severity === 'healthy') {
                severity = global.errorRate > this.config.alertThresholds.errorRate * 2 ? 'critical' : 'warning';
            }
        }
        
        return {
            status: severity,
            issues: issues.length > 0 ? issues.join(', ') : null,
            severity
        };
    },

    /**
     * Iniciar análisis predictivo
     */
    startPredictiveAnalysis: function() {
        setInterval(async () => {
            await this.performPredictiveAnalysis();
        }, 300000); // Cada 5 minutos
    },

    /**
     * Realizar análisis predictivo
     */
    performPredictiveAnalysis: async function() {
        try {
            // Analizar tendencias
            await this.analyzeTrends();
            
            // Predecir capacidades
            await this.predictCapacity();
            
            // Detectar patrones
            await this.detectPatterns();
            
        } catch (error) {
            this.log('Error performing predictive analysis:', error);
        }
    },

    /**
     * Analizar tendencias
     */
    analyzeTrends: async function() {
        for (const [componentName] of this.state.componentMetrics.entries()) {
            const hitRateTrend = this.calculateTrend(componentName, 'hitRate');
            const memoryTrend = this.calculateTrend(componentName, 'memoryUsage');
            const responseTrend = this.calculateTrend(componentName, 'responseTime');
            
            this.state.trends.set(componentName, {
                hitRate: hitRateTrend,
                memoryUsage: memoryTrend,
                responseTime: responseTrend,
                timestamp: Date.now()
            });
        }
    },

    /**
     * Calcular tendencia
     */
    calculateTrend: function(componentName, metricType) {
        const key = `${componentName}:${metricType}`;
        const historicalData = this.state.historicalData.get(key);
        
        if (!historicalData || historicalData.length < 10) {
            return 'insufficient_data';
        }
        
        // Calcular tendencia simple (comparar primer vs último valor)
        const recentData = historicalData.slice(-20);
        const firstValue = recentData[0].value;
        const lastValue = recentData[recentData.length - 1].value;
        
        const change = ((lastValue - firstValue) / firstValue) * 100;
        
        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    },

    /**
     * Predecir capacidades
     */
    predictCapacity: async function() {
        for (const [componentName] of this.state.componentMetrics.entries()) {
            const prediction = this.predictComponentCapacity(componentName);
            this.state.predictions.set(componentName, prediction);
        }
    },

    /**
     * Predecir capacidad de componente
     */
    predictComponentCapacity: function(componentName) {
        const key = `aggregated:${componentName}`;
        const aggregatedData = this.state.metrics.get(key);
        
        if (!aggregatedData || aggregatedData.length < 10) {
            return {
                status: 'insufficient_data',
                prediction: null,
                confidence: 0
            };
        }
        
        // Predicción simple basada en tendencia lineal
        const recentData = aggregatedData.slice(-10);
        const memoryValues = recentData.map(d => d.memoryUsage).filter(v => v > 0);
        
        if (memoryValues.length < 5) {
            return {
                status: 'insufficient_data',
                prediction: null,
                confidence: 0
            };
        }
        
        // Calcular tendencia de memoria
        const trend = this.calculateLinearTrend(memoryValues);
        
        // Predecir uso en 1 hora
        const predictedUsage = memoryValues[memoryValues.length - 1] + (trend * 60);
        
        // Calcular confianza basada en consistencia de datos
        const variance = this.calculateVariance(memoryValues);
        const confidence = Math.max(0, 100 - (variance / predictedUsage) * 100);
        
        return {
            status: 'success',
            prediction: {
                memoryUsage: predictedUsage,
                timeHorizon: '1 hour',
                trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable'
            },
            confidence: Math.round(confidence)
        };
    },

    /**
     * Calcular tendencia lineal
     */
    calculateLinearTrend: function(values) {
        const n = values.length;
        if (n < 2) return 0;
        
        const sumX = (n * (n - 1)) / 2; // Suma de 0 a n-1
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // Suma de x^2
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        
        return slope;
    },

    /**
     * Calcular varianza
     */
    calculateVariance: function(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
        return variance;
    },

    /**
     * Detectar patrones
     */
    detectPatterns: async function() {
        // Detectar patrones de uso horario
        await this.detectHourlyPatterns();
        
        // Detectar patrones de uso diario
        await this.detectDailyPatterns();
    },

    /**
     * Detectar patrones horarios
     */
    detectHourlyPatterns: async function() {
        for (const [componentName] of this.state.componentMetrics.entries()) {
            const hourlyPattern = this.analyzeHourlyPattern(componentName);
            // Almacenar patrón detectado
        }
    },

    /**
     * Analizar patrón horario
     */
    analyzeHourlyPattern: function(componentName) {
        const key = `aggregated:${componentName}`;
        const aggregatedData = this.state.metrics.get(key);
        
        if (!aggregatedData || aggregatedData.length < 24) {
            return null;
        }
        
        // Agrupar por hora del día
        const hourlyData = new Array(24).fill(0);
        
        for (const data of aggregatedData) {
            const hour = new Date(data.timestamp).getHours();
            hourlyData[hour] += data.hits + data.misses;
        }
        
        // Encontrar horas pico
        const maxActivity = Math.max(...hourlyData);
        const peakHours = hourlyData
            .map((activity, hour) => ({ hour, activity }))
            .filter(item => item.activity >= maxActivity * 0.8)
            .map(item => item.hour);
        
        return {
            hourlyData,
            peakHours,
            averageActivity: hourlyData.reduce((a, b) => a + b, 0) / 24
        };
    },

    /**
     * Detectar patrones diarios
     */
    detectDailyPatterns: async function() {
        // Implementación similar a detección de patrones horarios pero por día de la semana
    },

    /**
     * Limpiar datos antiguos
     */
    cleanupOldData: function() {
        const cutoffTime = Date.now() - this.config.metricsRetentionPeriod;
        
        // Limpiar datos históricos
        for (const [key, data] of this.state.historicalData.entries()) {
            const filteredData = data.filter(item => item.timestamp > cutoffTime);
            this.state.historicalData.set(key, filteredData);
        }
        
        // Limpiar métricas agregadas
        for (const [key, data] of this.state.metrics.entries()) {
            const filteredData = data.filter(item => item.timestamp > cutoffTime);
            this.state.metrics.set(key, filteredData);
        }
        
        // Limpiar alertas resueltas antiguas
        for (const [key, alert] of this.state.alerts.entries()) {
            if (alert.resolved && (Date.now() - alert.timestamp) > this.config.metricsRetentionPeriod) {
                this.state.alerts.delete(key);
            }
        }
    },

    /**
     * Generar reporte
     */
    generateReport: function(timeRange = '24h', format = 'json') {
        const report = {
            timestamp: Date.now(),
            timeRange,
            summary: this.generateSummary(),
            components: this.generateComponentReport(),
            global: this.generateGlobalReport(),
            health: this.state.healthStatus,
            alerts: this.generateAlertsReport(),
            trends: this.generateTrendsReport(),
            predictions: this.generatePredictionsReport(),
            recommendations: this.generateRecommendations()
        };
        
        if (format === 'json') {
            return JSON.stringify(report, null, 2);
        } else if (format === 'html') {
            return this.generateHTMLReport(report);
        }
        
        return report;
    },

    /**
     * Generar resumen
     */
    generateSummary: function() {
        const global = this.state.globalMetrics;
        const baseline = this.state.performanceBaseline;
        
        return {
            overallStatus: this.state.healthStatus.overall,
            totalHits: global.totalHits,
            totalMisses: global.totalMisses,
            hitRate: global.hitRate,
            averageResponseTime: global.totalResponseTime,
            errorRate: global.errorRate,
            throughput: this.calculateThroughput(),
            uptime: Date.now() - global.uptime,
            activeComponents: this.state.componentMetrics.size,
            totalAlerts: this.state.alerts.size,
            unresolvedAlerts: Array.from(this.state.alerts.values()).filter(a => !a.resolved).length
        };
    },

    /**
     * Generar reporte de componentes
     */
    generateComponentReport: function() {
        const components = {};
        
        for (const [componentName, metrics] of this.state.componentMetrics.entries()) {
            components[componentName] = {
                hits: metrics.hits,
                misses: metrics.misses,
                hitRate: metrics.hitRate,
                sets: metrics.sets,
                deletes: metrics.deletes,
                errors: metrics.errors,
                memoryUsage: metrics.memoryUsage,
                responseTime: metrics.responseTime,
                status: this.calculateComponentStatus(metrics),
                lastUpdate: metrics.lastUpdate
            };
        }
        
        return components;
    },

    /**
     * Generar reporte global
     */
    generateGlobalReport: function() {
        return {
            baseline: this.state.performanceBaseline,
            trends: Object.fromEntries(this.state.trends),
            benchmarks: Object.fromEntries(this.state.benchmarks)
        };
    },

    /**
     * Generar reporte de alertas
     */
    generateAlertsReport: function() {
        const alerts = Array.from(this.state.alerts.values());
        
        return {
            total: alerts.length,
            unresolved: alerts.filter(a => !a.resolved).length,
            bySeverity: {
                critical: alerts.filter(a => a.severity === 'critical').length,
                warning: alerts.filter(a => a.severity === 'warning').length,
                info: alerts.filter(a => a.severity === 'info').length
            },
            recent: alerts
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 10)
        };
    },

    /**
     * Generar reporte de tendencias
     */
    generateTrendsReport: function() {
        return Object.fromEntries(this.state.trends);
    },

    /**
     * Generar reporte de predicciones
     */
    generatePredictionsReport: function() {
        return Object.fromEntries(this.state.predictions);
    },

    /**
     * Generar recomendaciones
     */
    generateRecommendations: function() {
        const recommendations = [];
        
        // Analizar hit rates
        for (const [componentName, metrics] of this.state.componentMetrics.entries()) {
            if (metrics.hitRate < this.config.alertThresholds.hitRate) {
                recommendations.push({
                    type: 'performance',
                    component: componentName,
                    issue: 'Low hit rate',
                    recommendation: 'Consider increasing cache size or adjusting TTL',
                    priority: metrics.hitRate < this.config.alertThresholds.hitRate * 0.5 ? 'high' : 'medium'
                });
            }
        }
        
        // Analizar tendencias
        for (const [componentName, trend] of this.state.trends.entries()) {
            if (trend.memoryUsage === 'increasing') {
                recommendations.push({
                    type: 'capacity',
                    component: componentName,
                    issue: 'Memory usage increasing',
                    recommendation: 'Monitor memory usage and consider cleanup strategies',
                    priority: 'medium'
                });
            }
        }
        
        // Analizar predicciones
        for (const [componentName, prediction] of this.state.predictions.entries()) {
            if (prediction.status === 'success' && prediction.prediction.memoryUsage > 1000000) { // 1MB
                recommendations.push({
                    type: 'capacity',
                    component: componentName,
                    issue: 'Predicted high memory usage',
                    recommendation: 'Consider increasing memory allocation or implementing eviction policies',
                    priority: 'high'
                });
            }
        }
        
        return recommendations;
    },

    /**
     * Generar reporte HTML
     */
    generateHTMLReport: function(report) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Cache Metrics Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #e9ecef; border-radius: 3px; }
        .alert { padding: 10px; margin: 5px 0; border-radius: 3px; }
        .alert.critical { background: #f8d7da; border: 1px solid #f5c6cb; }
        .alert.warning { background: #fff3cd; border: 1px solid #ffeaa7; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Cache Metrics Report</h1>
        <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        <p>Time Range: ${report.timeRange}</p>
        <p>Overall Status: <strong>${report.summary.overallStatus}</strong></p>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <div class="metric">Total Hits: ${report.summary.totalHits}</div>
        <div class="metric">Total Misses: ${report.summary.totalMisses}</div>
        <div class="metric">Hit Rate: ${report.summary.hitRate.toFixed(2)}%</div>
        <div class="metric">Avg Response Time: ${report.summary.averageResponseTime.toFixed(2)}ms</div>
        <div class="metric">Error Rate: ${report.summary.errorRate.toFixed(2)}%</div>
        <div class="metric">Throughput: ${report.summary.throughput.toFixed(2)} ops/sec</div>
    </div>
    
    <div class="section">
        <h2>Components</h2>
        <table>
            <tr><th>Component</th><th>Hits</th><th>Misses</th><th>Hit Rate</th><th>Response Time</th><th>Status</th></tr>
            ${Object.entries(report.components).map(([name, metrics]) => 
                `<tr>
                    <td>${name}</td>
                    <td>${metrics.hits}</td>
                    <td>${metrics.misses}</td>
                    <td>${metrics.hitRate.toFixed(2)}%</td>
                    <td>${metrics.responseTime.toFixed(2)}ms</td>
                    <td>${metrics.status}</td>
                </tr>`
            ).join('')}
        </table>
    </div>
    
    <div class="section">
        <h2>Recent Alerts</h2>
        ${report.alerts.recent.map(alert => 
            `<div class="alert ${alert.severity}">
                <strong>${alert.component}.${alert.metricType}</strong>: ${alert.value} (threshold: ${alert.threshold})
                <br><small>${new Date(alert.timestamp).toLocaleString()}</small>
            </div>`
        ).join('')}
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => 
            `<div class="alert ${rec.priority === 'high' ? 'critical' : 'warning'}">
                <strong>${rec.component}</strong> - ${rec.issue}
                <br>${rec.recommendation}
            </div>`
        ).join('')}
    </div>
</body>
</html>`;
    },

    /**
     * Obtener estadísticas
     */
    getStatistics: function() {
        return {
            componentCount: this.state.componentMetrics.size,
            alertCount: this.state.alerts.size,
            anomalyCount: this.state.anomalies.size,
            healthStatus: this.state.healthStatus.overall,
            lastAggregation: this.state.lastAggregation,
            lastHealthCheck: this.state.lastHealthCheck,
            uptime: Date.now() - this.state.globalMetrics.uptime
        };
    },

    /**
     * Obtener estado detallado
     */
    getDetailedStatus: function() {
        return {
            statistics: this.getStatistics(),
            config: this.config,
            componentMetrics: Object.fromEntries(this.state.componentMetrics),
            globalMetrics: this.state.globalMetrics,
            performanceBaseline: this.state.performanceBaseline,
            healthStatus: this.state.healthStatus,
            alerts: Object.fromEntries(this.state.alerts),
            anomalies: Object.fromEntries(this.state.anomalies),
            trends: Object.fromEntries(this.state.trends),
            predictions: Object.fromEntries(this.state.predictions),
            benchmarks: Object.fromEntries(this.state.benchmarks),
            isInitialized: this.state.isInitialized
        };
    },

    /**
     * Exportar configuración de métricas
     */
    exportMetricsConfig: function() {
        return {
            config: this.config,
            benchmarks: Object.fromEntries(this.state.benchmarks),
            componentMetrics: Object.fromEntries(this.state.componentMetrics),
            globalMetrics: this.state.globalMetrics,
            performanceBaseline: this.state.performanceBaseline,
            timestamp: Date.now()
        };
    },

    /**
     * Importar configuración de métricas
     */
    importMetricsConfig: function(config) {
        if (config.config) {
            Object.assign(this.config, config.config);
        }
        
        if (config.benchmarks) {
            this.state.benchmarks = new Map(Object.entries(config.benchmarks));
        }
        
        if (config.componentMetrics) {
            this.state.componentMetrics = new Map(Object.entries(config.componentMetrics));
        }
        
        if (config.globalMetrics) {
            Object.assign(this.state.globalMetrics, config.globalMetrics);
        }
        
        if (config.performanceBaseline) {
            this.state.performanceBaseline = config.performanceBaseline;
        }
        
        this.log('Metrics configuration imported');
    },

    /**
     * Logging
     */
    log: function(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [CacheMetrics] ${message}`;
        
        if (data) {
            console.log(logEntry, data);
        } else {
            console.log(logEntry);
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.CacheMetrics = CacheMetrics;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheMetrics;
}