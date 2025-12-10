/**
 * Justice 2 Query Optimizer
 * Sistema completo de optimización de consultas de base de datos
 */

const QueryOptimizer = {
    // Configuración del optimizador
    config: {
        // Límites de consulta
        defaultLimit: 50,
        maxLimit: 1000,
        
        // Umbrales de rendimiento
        slowQueryThreshold: 1000, // ms
        verySlowQueryThreshold: 5000, // ms
        
        // Configuración de caché
        cacheEnabled: true,
        cacheTTL: 300000, // 5 minutos
        
        // Configuración de monitoreo
        monitoringEnabled: true,
        logSlowQueries: true,
        logAllQueries: false,
        
        // Configuración de seguridad
        validateQueries: true,
        preventSQLInjection: true,
        
        // Configuración de índices
        autoIndexSuggestions: true,
        analyzeQueryPlans: true
    },

    // Métricas de consultas
    metrics: {
        totalQueries: 0,
        slowQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageQueryTime: 0,
        queryHistory: []
    },

    // Cache de consultas
    queryCache: new Map(),
    
    // Índices recomendados
    recommendedIndexes: new Map(),

    /**
     * Inicializar el optimizador de consultas
     */
    init: function() {
        console.log('🚀 Inicializando Query Optimizer...');
        
        // Configurar limpieza periódica de caché
        if (this.config.cacheEnabled) {
            setInterval(() => {
                this.cleanCache();
            }, this.config.cacheTTL);
        }
        
        // Configurar recolección de métricas
        if (this.config.monitoringEnabled) {
            setInterval(() => {
                this.collectMetrics();
            }, 60000); // Cada minuto
        }
        
        console.log('✅ Query Optimizer inicializado');
    },

    /**
     * Optimizar una consulta SQL
     * @param {string} sql - Consulta SQL a optimizar
     * @param {Array} params - Parámetros de la consulta
     * @param {Object} options - Opciones de optimización
     * @returns {Object} Consulta optimizada con metadatos
     */
    optimizeQuery: function(sql, params = [], options = {}) {
        const startTime = Date.now();
        
        try {
            // Validar seguridad de la consulta
            if (this.config.validateQueries) {
                this.validateQuery(sql, params);
            }
            
            // Generar clave de caché
            const cacheKey = this.generateCacheKey(sql, params);
            
            // Verificar caché
            if (this.config.cacheEnabled && this.queryCache.has(cacheKey)) {
                this.metrics.cacheHits++;
                const cachedResult = this.queryCache.get(cacheKey);
                
                return {
                    ...cachedResult,
                    fromCache: true,
                    optimizationTime: Date.now() - startTime
                };
            }
            
            this.metrics.cacheMisses++;
            
            // Optimizar consulta
            const optimizedSQL = this.optimizeSQL(sql, options);
            const optimizedParams = this.optimizeParams(params, options);
            
            // Aplicar paginación si es necesario
            const paginatedQuery = this.applyPagination(optimizedSQL, optimizedParams, options);
            
            // Sugerir índices si está habilitado
            if (this.config.autoIndexSuggestions) {
                this.suggestIndexes(paginatedQuery.sql);
            }
            
            const result = {
                sql: paginatedQuery.sql,
                params: paginatedQuery.params,
                cacheKey: cacheKey,
                optimizationTime: Date.now() - startTime,
                optimizations: this.getAppliedOptimizations(sql, paginatedQuery.sql),
                estimatedCost: this.estimateQueryCost(paginatedQuery.sql),
                fromCache: false
            };
            
            return result;
            
        } catch (error) {
            console.error('❌ Error optimizando consulta:', error);
            throw new Error(`Error en optimización de consulta: ${error.message}`);
        }
    },

    /**
     * Validar seguridad de una consulta
     * @param {string} sql - Consulta SQL
     * @param {Array} params - Parámetros
     */
    validateQuery: function(sql, params) {
        // Patrones peligrosos a detectar
        const dangerousPatterns = [
            /DROP\s+TABLE/i,
            /DELETE\s+FROM/i,
            /TRUNCATE/i,
            /ALTER\s+TABLE/i,
            /EXEC\s*\(/i,
            /XP_/i,
            /SP_/i,
            /--/,
            /\/\*/,
            /\*\//
        ];
        
        // Verificar patrones peligrosos
        for (const pattern of dangerousPatterns) {
            if (pattern.test(sql)) {
                throw new Error(`Consulta contiene patrón peligroso: ${pattern}`);
            }
        }
        
        // Verificar inyección SQL en parámetros
        if (this.config.preventSQLInjection) {
            params.forEach((param, index) => {
                if (typeof param === 'string') {
                    const injectionPatterns = [
                        /['"]/,
                        /;/,
                        /--/,
                        /\/\*/,
                        /\*\//
                    ];
                    
                    for (const pattern of injectionPatterns) {
                        if (pattern.test(param)) {
                            throw new Error(`Parámetro ${index} potencialmente inyectado: ${param}`);
                        }
                    }
                }
            });
        }
        
        return true;
    },

    /**
     * Optimizar SQL
     * @param {string} sql - Consulta SQL original
     * @param {Object} options - Opciones de optimización
     * @returns {string} SQL optimizado
     */
    optimizeSQL: function(sql, options = {}) {
        let optimizedSQL = sql;
        
        // Normalizar SQL
        optimizedSQL = optimizedSQL.replace(/\s+/g, ' ').trim();
        
        // Optimizar SELECT
        if (optimizedSQL.toUpperCase().startsWith('SELECT')) {
            optimizedSQL = this.optimizeSelect(optimizedSQL, options);
        }
        
        // Optimizar JOINs
        optimizedSQL = this.optimizeJoins(optimizedSQL, options);
        
        // Optimizar WHERE
        optimizedSQL = this.optimizeWhere(optimizedSQL, options);
        
        // Optimizar ORDER BY
        optimizedSQL = this.optimizeOrderBy(optimizedSQL, options);
        
        return optimizedSQL;
    },

    /**
     * Optimizar consulta SELECT
     * @param {string} sql - Consulta SELECT
     * @param {Object} options - Opciones
     * @returns {string} SELECT optimizado
     */
    optimizeSelect: function(sql, options) {
        // Evitar SELECT *
        if (sql.includes('SELECT *')) {
            console.warn('⚠️ Se detectó SELECT *. Considere especificar columnas explícitas.');
        }
        
        // Agregar hints de optimización si están disponibles
        if (options.forceIndex) {
            sql = sql.replace(/SELECT/i, `SELECT /*+ INDEX(${options.forceIndex}) */`);
        }
        
        return sql;
    },

    /**
     * Optimizar JOINs
     * @param {string} sql - Consulta SQL
     * @param {Object} options - Opciones
     * @returns {string} SQL con JOINs optimizados
     */
    optimizeJoins: function(sql, options) {
        // Detectar JOINs sin condiciones adecuadas
        const joinPattern = /JOIN\s+(\w+)\s+ON/i;
        const matches = sql.match(joinPattern);
        
        if (matches) {
            // Verificar que los JOINs tengan índices
            const tableName = matches[1];
            this.suggestIndex(tableName, 'id');
        }
        
        return sql;
    },

    /**
     * Optimizar cláusula WHERE
     * @param {string} sql - Consulta SQL
     * @param {Object} options - Opciones
     * @returns {string} SQL con WHERE optimizado
     */
    optimizeWhere: function(sql, options) {
        // Optimizar condiciones IN con muchos valores
        const inPattern = /IN\s*\(([^)]+)\)/i;
        const matches = sql.match(inPattern);
        
        if (matches && matches[1].split(',').length > 100) {
            console.warn('⚠️ Cláusula IN con muchos valores detectada. Considere usar tabla temporal.');
        }
        
        // Sugerir índices para columnas en WHERE
        const wherePattern = /WHERE\s+([^;]+)/i;
        const whereMatch = sql.match(wherePattern);
        
        if (whereMatch) {
            const whereClause = whereMatch[1];
            const columnPattern = /(\w+)\s*=/g;
            let columnMatch;
            
            while ((columnMatch = columnPattern.exec(whereClause)) !== null) {
                this.suggestIndex('table', columnMatch[1]);
            }
        }
        
        return sql;
    },

    /**
     * Optimizar ORDER BY
     * @param {string} sql - Consulta SQL
     * @param {Object} options - Opciones
     * @returns {string} SQL con ORDER BY optimizado
     */
    optimizeOrderBy: function(sql, options) {
        // Verificar ORDER BY sin índice adecuado
        const orderByPattern = /ORDER\s+BY\s+([^;]+)/i;
        const matches = sql.match(orderByPattern);
        
        if (matches) {
            const columns = matches[1].split(',');
            columns.forEach(column => {
                const cleanColumn = column.trim().split(' ')[0];
                this.suggestIndex('table', cleanColumn);
            });
        }
        
        return sql;
    },

    /**
     * Optimizar parámetros
     * @param {Array} params - Parámetros originales
     * @param {Object} options - Opciones
     * @returns {Array} Parámetros optimizados
     */
    optimizeParams: function(params, options = {}) {
        return params.map(param => {
            // Sanitizar parámetros de tipo string
            if (typeof param === 'string') {
                return param.trim();
            }
            return param;
        });
    },

    /**
     * Aplicar paginación a una consulta
     * @param {string} sql - Consulta SQL
     * @param {Array} params - Parámetros
     * @param {Object} options - Opciones de paginación
     * @returns {Object} Consulta con paginación aplicada
     */
    applyPagination: function(sql, params, options = {}) {
        const limit = options.limit || this.config.defaultLimit;
        const offset = options.offset || 0;
        
        // Verificar que no exceda el límite máximo
        const finalLimit = Math.min(limit, this.config.maxLimit);
        
        // Si la consulta ya tiene LIMIT/OFFSET, respetarlos
        if (sql.toLowerCase().includes('limit')) {
            return { sql, params };
        }
        
        // Aplicar paginación
        const paginatedSQL = `${sql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const paginatedParams = [...params, finalLimit, offset];
        
        return {
            sql: paginatedSQL,
            params: paginatedParams
        };
    },

    /**
     * Generar clave de caché para consulta
     * @param {string} sql - Consulta SQL
     * @param {Array} params - Parámetros
     * @returns {string} Clave de caché
     */
    generateCacheKey: function(sql, params) {
        const normalizedSQL = sql.toLowerCase().replace(/\s+/g, ' ').trim();
        const paramsHash = params.map(p => JSON.stringify(p)).join('|');
        return `${normalizedSQL}:${paramsHash}`;
    },

    /**
     * Sugerir índice para una tabla y columna
     * @param {string} table - Nombre de la tabla
     * @param {string} column - Nombre de la columna
     */
    suggestIndex: function(table, column) {
        const key = `${table}_${column}`;
        if (!this.recommendedIndexes.has(key)) {
            this.recommendedIndexes.set(key, {
                table,
                column,
                indexName: `idx_${table}_${column}`,
                reason: 'Frecuentemente usado en WHERE/JOIN/ORDER BY',
                priority: 'medium'
            });
        }
    },

    /**
     * Sugerir índices basados en análisis de consulta
     * @param {string} sql - Consulta SQL
     */
    suggestIndexes: function(sql) {
        // Análisis básico de la consulta para sugerencias
        const upperSQL = sql.toUpperCase();
        
        // Detectar columnas en WHERE
        const whereMatch = upperSQL.match(/WHERE\s+([^;]+)/i);
        if (whereMatch) {
            const whereClause = whereMatch[1];
            const columns = this.extractColumns(whereClause);
            columns.forEach(col => {
                this.suggestIndex('table', col);
            });
        }
        
        // Detectar columnas en JOIN
        const joinMatches = upperSQL.match(/JOIN\s+(\w+)\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi);
        if (joinMatches) {
            joinMatches.forEach(join => {
                const cols = join.match(/ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/i);
                if (cols) {
                    this.suggestIndex(cols[1], cols[2]);
                    this.suggestIndex(cols[3], cols[4]);
                }
            });
        }
        
        // Detectar columnas en ORDER BY
        const orderByMatch = upperSQL.match(/ORDER\s+BY\s+([^;]+)/i);
        if (orderByMatch) {
            const orderByClause = orderByMatch[1];
            const columns = this.extractColumns(orderByClause);
            columns.forEach(col => {
                this.suggestIndex('table', col);
            });
        }
    },

    /**
     * Extraer nombres de columnas de una cláusula SQL
     * @param {string} clause - Cláusula SQL
     * @returns {Array} Lista de columnas
     */
    extractColumns: function(clause) {
        const columns = [];
        const patterns = [
            /(\w+)\s*=/g,
            /(\w+)\s*<</g,
            /(\w+)\s*>>/g,
            /(\w+)\s*LIKE/g,
            /(\w+)\s*IN/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(clause)) !== null) {
                if (!columns.includes(match[1])) {
                    columns.push(match[1]);
                }
            }
        });
        
        return columns;
    },

    /**
     * Estimar coste de una consulta
     * @param {string} sql - Consulta SQL
     * @returns {Object} Estimación de coste
     */
    estimateQueryCost: function(sql) {
        let cost = 1;
        let factors = [];
        
        // Analizar complejidad de la consulta
        if (sql.includes('JOIN')) {
            cost *= 2;
            factors.push('JOIN');
        }
        
        if (sql.includes('GROUP BY')) {
            cost *= 1.5;
            factors.push('GROUP BY');
        }
        
        if (sql.includes('ORDER BY')) {
            cost *= 1.3;
            factors.push('ORDER BY');
        }
        
        if (sql.includes('DISTINCT')) {
            cost *= 1.2;
            factors.push('DISTINCT');
        }
        
        if (sql.includes('SUBQUERY') || sql.includes('(SELECT')) {
            cost *= 1.8;
            factors.push('SUBQUERY');
        }
        
        return {
            cost: cost,
            level: cost < 2 ? 'low' : cost < 4 ? 'medium' : 'high',
            factors: factors
        };
    },

    /**
     * Obtener optimizaciones aplicadas
     * @param {string} originalSQL - SQL original
     * @param {string} optimizedSQL - SQL optimizado
     * @returns {Array} Lista de optimizaciones
     */
    getAppliedOptimizations: function(originalSQL, optimizedSQL) {
        const optimizations = [];
        
        if (originalSQL !== optimizedSQL) {
            optimizations.push('SQL normalization');
        }
        
        if (optimizedSQL.includes('LIMIT') && !originalSQL.includes('LIMIT')) {
            optimizations.push('Pagination added');
        }
        
        if (optimizedSQL.includes('/*+ INDEX')) {
            optimizations.push('Index hint added');
        }
        
        return optimizations;
    },

    /**
     * Almacenar resultado en caché
     * @param {string} cacheKey - Clave de caché
     * @param {Object} result - Resultado a almacenar
     */
    setCache: function(cacheKey, result) {
        if (!this.config.cacheEnabled) return;
        
        this.queryCache.set(cacheKey, {
            ...result,
            cachedAt: Date.now()
        });
    },

    /**
     * Limpiar caché expirado
     */
    cleanCache: function() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, value] of this.queryCache.entries()) {
            if (now - value.cachedAt > this.config.cacheTTL) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => {
            this.queryCache.delete(key);
        });
        
        if (expiredKeys.length > 0) {
            console.log(`🧹 Limpiados ${expiredKeys.length} elementos expirados del caché de consultas`);
        }
    },

    /**
     * Recopilar métricas de rendimiento
     */
    collectMetrics: function() {
        const metrics = {
            ...this.metrics,
            cacheHitRate: this.metrics.totalQueries > 0 ? 
                (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0,
            slowQueryRate: this.metrics.totalQueries > 0 ? 
                (this.metrics.slowQueries / this.metrics.totalQueries) * 100 : 0,
            recommendedIndexes: Array.from(this.recommendedIndexes.values()),
            timestamp: new Date().toISOString()
        };
        
        // Enviar métricas a sistema de monitoreo
        if (window.Justice2 && window.Justice2.config.logging.remote) {
            this.sendMetrics(metrics);
        }
        
        return metrics;
    },

    /**
     * Enviar métricas a sistema de monitoreo
     * @param {Object} metrics - Métricas a enviar
     */
    sendMetrics: function(metrics) {
        fetch('/api/metrics/query-optimizer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metrics)
        }).catch(() => {
            // Ignorar errores de envío de métricas
        });
    },

    /**
     * Registrar ejecución de consulta
     * @param {string} sql - Consulta ejecutada
     * @param {number} executionTime - Tiempo de ejecución
     * @param {Object} result - Resultado de la consulta
     */
    recordQueryExecution: function(sql, executionTime, result) {
        this.metrics.totalQueries++;
        
        if (executionTime > this.config.slowQueryThreshold) {
            this.metrics.slowQueries++;
            
            if (this.config.logSlowQueries) {
                console.warn(`🐌 Consulta lenta (${executionTime}ms):`, sql);
            }
        }
        
        // Actualizar tiempo promedio
        this.metrics.averageQueryTime = 
            (this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + executionTime) / 
            this.metrics.totalQueries;
        
        // Almacenar en historial
        this.metrics.queryHistory.push({
            sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
            executionTime,
            timestamp: new Date().toISOString(),
            rowCount: result.rowCount || 0
        });
        
        // Mantener solo las últimas 1000 consultas en el historial
        if (this.metrics.queryHistory.length > 1000) {
            this.metrics.queryHistory = this.metrics.queryHistory.slice(-1000);
        }
    },

    /**
     * Obtener recomendaciones de optimización
     * @returns {Array} Lista de recomendaciones
     */
    getOptimizationRecommendations: function() {
        const recommendations = [];
        
        // Recomendaciones basadas en métricas
        if (this.metrics.slowQueryRate > 10) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'Alta tasa de consultas lentas detectada. Considere revisar índices y optimizar consultas.',
                action: 'review_slow_queries'
            });
        }
        
        if (this.metrics.cacheHitRate < 50) {
            recommendations.push({
                type: 'cache',
                priority: 'medium',
                message: 'Baja tasa de aciertos de caché. Considere ajustar la configuración de caché.',
                action: 'optimize_cache'
            });
        }
        
        // Recomendaciones de índices
        const highPriorityIndexes = Array.from(this.recommendedIndexes.values())
            .filter(index => index.priority === 'high');
        
        if (highPriorityIndexes.length > 0) {
            recommendations.push({
                type: 'index',
                priority: 'high',
                message: `Se detectaron ${highPriorityIndexes.length} índices recomendados de alta prioridad.`,
                action: 'create_indexes',
                indexes: highPriorityIndexes
            });
        }
        
        return recommendations;
    },

    /**
     * Generar informe de rendimiento
     * @returns {Object} Informe completo de rendimiento
     */
    generatePerformanceReport: function() {
        const metrics = this.collectMetrics();
        const recommendations = this.getOptimizationRecommendations();
        
        return {
            summary: {
                totalQueries: metrics.totalQueries,
                averageQueryTime: Math.round(metrics.averageQueryTime),
                slowQueryRate: Math.round(metrics.slowQueryRate * 100) / 100,
                cacheHitRate: Math.round(metrics.cacheHitRate * 100) / 100
            },
            metrics: metrics,
            recommendations: recommendations,
            topSlowQueries: metrics.queryHistory
                .filter(q => q.executionTime > this.config.slowQueryThreshold)
                .sort((a, b) => b.executionTime - a.executionTime)
                .slice(0, 10),
            recommendedIndexes: metrics.recommendedIndexes,
            generatedAt: new Date().toISOString()
        };
    },

    /**
     * Limpiar todas las métricas y caché
     */
    reset: function() {
        this.metrics = {
            totalQueries: 0,
            slowQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageQueryTime: 0,
            queryHistory: []
        };
        
        this.queryCache.clear();
        this.recommendedIndexes.clear();
        
        console.log('🔄 Query Optimizer reiniciado');
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.QueryOptimizer = QueryOptimizer;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = QueryOptimizer;
}