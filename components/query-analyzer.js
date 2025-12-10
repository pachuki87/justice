/**
 * Justice 2 Query Analyzer
 * Analizador de rendimiento y optimización de consultas de base de datos
 */

const QueryAnalyzer = {
    // Configuración del analizador
    config: {
        // Umbrales de rendimiento
        slowQueryThreshold: 1000, // ms
        verySlowQueryThreshold: 5000, // ms
        criticalQueryThreshold: 10000, // ms
        
        // Configuración de análisis
        enableExplainAnalyze: true,
        enableIndexAnalysis: true,
        enableQueryPlanCache: true,
        enablePerformanceProfiling: true,
        
        // Configuración de alertas
        enableAlerts: true,
        alertThresholds: {
            slowQueries: 10, // porcentaje
            errorRate: 5, // porcentaje
            connectionPoolUsage: 80 // porcentaje
        },
        
        // Configuración de almacenamiento
        maxQueryHistory: 10000,
        maxAnalysisResults: 1000,
        retentionPeriod: 7 * 24 * 60 * 60 * 1000 // 7 días
    },

    // Estado del analizador
    state: {
        initialized: false,
        analysisResults: new Map(),
        queryPlans: new Map(),
        performanceProfile: new Map(),
        alerts: [],
        recommendations: []
    },

    // Métricas del analizador
    metrics: {
        totalQueries: 0,
        analyzedQueries: 0,
        slowQueries: 0,
        verySlowQueries: 0,
        criticalQueries: 0,
        averageExecutionTime: 0,
        queriesPerSecond: 0,
        errorQueries: 0,
        lastAnalysisTime: null,
        analysisStartTime: Date.now()
    },

    /**
     * Inicializar el analizador de consultas
     */
    init: function() {
        if (this.state.initialized) {
            console.log('⚠️ Query Analyzer ya está inicializado');
            return;
        }
        
        console.log('🔍 Inicializando Query Analyzer...');
        
        // Configurar limpieza periódica
        this.setupPeriodicCleanup();
        
        // Configurar monitoreo continuo
        this.setupContinuousMonitoring();
        
        this.state.initialized = true;
        console.log('✅ Query Analyzer inicializado');
    },

    /**
     * Analizar una consulta
     * @param {string} sql - Consulta SQL
     * @param {Array} params - Parámetros
     * @param {number} executionTime - Tiempo de ejecución
     * @param {Object} result - Resultado de la consulta
     * @returns {Object} Análisis completo
     */
    analyzeQuery: async function(sql, params, executionTime, result) {
        const analysisId = this.generateAnalysisId();
        const startTime = Date.now();
        
        try {
            this.metrics.totalQueries++;
            this.metrics.analyzedQueries++;
            
            // Análisis básico de rendimiento
            const performanceAnalysis = this.analyzePerformance(sql, executionTime, result);
            
            // Análisis de estructura de consulta
            const structureAnalysis = this.analyzeStructure(sql);
            
            // Análisis de parámetros
            const parameterAnalysis = this.analyzeParameters(params);
            
            // Análisis de índices (si está habilitado)
            let indexAnalysis = null;
            if (this.config.enableIndexAnalysis) {
                indexAnalysis = this.analyzeIndexes(sql);
            }
            
            // Generar recomendaciones
            const recommendations = this.generateRecommendations(
                performanceAnalysis,
                structureAnalysis,
                parameterAnalysis,
                indexAnalysis
            );
            
            // Análisis de plan de ejecución (si está habilitado)
            let planAnalysis = null;
            if (this.config.enableExplainAnalyze) {
                planAnalysis = await this.analyzeQueryPlan(sql, params);
            }
            
            const analysis = {
                id: analysisId,
                sql: sql,
                params: params,
                executionTime: executionTime,
                result: result,
                performance: performanceAnalysis,
                structure: structureAnalysis,
                parameters: parameterAnalysis,
                indexes: indexAnalysis,
                plan: planAnalysis,
                recommendations: recommendations,
                timestamp: new Date().toISOString(),
                analysisTime: Date.now() - startTime
            };
            
            // Almacenar análisis
            this.storeAnalysis(analysisId, analysis);
            
            // Actualizar métricas
            this.updateMetrics(analysis);
            
            // Generar alertas si es necesario
            if (this.config.enableAlerts) {
                this.checkAlerts(analysis);
            }
            
            return analysis;
            
        } catch (error) {
            console.error('❌ Error analizando consulta:', error);
            throw error;
        }
    },

    /**
     * Analizar rendimiento de la consulta
     * @param {string} sql - Consulta SQL
     * @param {number} executionTime - Tiempo de ejecución
     * @param {Object} result - Resultado
     * @returns {Object} Análisis de rendimiento
     */
    analyzePerformance: function(sql, executionTime, result) {
        const performance = {
            executionTime: executionTime,
            rowCount: result.rowCount || 0,
            rowsPerSecond: executionTime > 0 ? (result.rowCount || 0) / (executionTime / 1000) : 0,
            complexity: this.calculateComplexity(sql),
            performanceLevel: this.getPerformanceLevel(executionTime),
            bottlenecks: [],
            efficiency: this.calculateEfficiency(executionTime, result.rowCount || 0)
        };
        
        // Identificar cuellos de botella
        if (executionTime > this.config.criticalQueryThreshold) {
            performance.bottlenecks.push('CRITICAL_PERFORMANCE');
        } else if (executionTime > this.config.verySlowQueryThreshold) {
            performance.bottlenecks.push('VERY_SLOW_PERFORMANCE');
        } else if (executionTime > this.config.slowQueryThreshold) {
            performance.bottlenecks.push('SLOW_PERFORMANCE');
        }
        
        if (performance.rowCount > 10000 && executionTime > 1000) {
            performance.bottlenecks.push('LARGE_RESULT_SET');
        }
        
        if (sql.includes('SELECT *')) {
            performance.bottlenecks.push('SELECT_ALL_COLUMNS');
        }
        
        return performance;
    },

    /**
     * Analizar estructura de la consulta
     * @param {string} sql - Consulta SQL
     * @returns {Object} Análisis de estructura
     */
    analyzeStructure: function(sql) {
        const structure = {
            type: this.getQueryType(sql),
            tables: this.extractTables(sql),
            columns: this.extractColumns(sql),
            joins: this.extractJoins(sql),
            whereClauses: this.extractWhereClauses(sql),
            groupByClauses: this.extractGroupByClauses(sql),
            orderByClauses: this.extractOrderByClauses(sql),
            subqueries: this.extractSubqueries(sql),
            functions: this.extractFunctions(sql),
            aggregations: this.extractAggregations(sql),
            hasSelectAll: sql.includes('SELECT *'),
            hasLimit: sql.includes('LIMIT'),
            hasOffset: sql.includes('OFFSET')
        };
        
        // Calcular complejidad estructural
        structure.complexity = this.calculateStructuralComplexity(structure);
        
        return structure;
    },

    /**
     * Analizar parámetros de la consulta
     * @param {Array} params - Parámetros
     * @returns {Object} Análisis de parámetros
     */
    analyzeParameters: function(params) {
        const analysis = {
            count: params.length,
            types: [],
            sizes: [],
            hasLargeObjects: false,
            hasNulls: false,
            potentialIssues: []
        };
        
        params.forEach((param, index) => {
            const type = typeof param;
            const size = this.getParameterSize(param);
            
            analysis.types.push({ index, type });
            analysis.sizes.push({ index, size });
            
            if (size > 1024 * 1024) { // 1MB
                analysis.hasLargeObjects = true;
                analysis.potentialIssues.push(`Parámetro ${index} es grande (${size} bytes)`);
            }
            
            if (param === null) {
                analysis.hasNulls = true;
            }
        });
        
        if (params.length > 20) {
            analysis.potentialIssues.push('Muchos parámetros podrían afectar el rendimiento');
        }
        
        return analysis;
    },

    /**
     * Analizar uso de índices
     * @param {string} sql - Consulta SQL
     * @returns {Object} Análisis de índices
     */
    analyzeIndexes: function(sql) {
        const analysis = {
            recommendedIndexes: [],
            existingIndexes: [],
            missingIndexes: [],
            indexUsage: 'unknown'
        };
        
        // Extraer columnas en WHERE
        const whereColumns = this.extractWhereColumns(sql);
        whereColumns.forEach(column => {
            analysis.recommendedIndexes.push({
                table: column.table || 'unknown',
                column: column.name,
                reason: 'Used in WHERE clause',
                priority: 'high'
            });
        });
        
        // Extraer columnas en JOIN
        const joinColumns = this.extractJoinColumns(sql);
        joinColumns.forEach(column => {
            analysis.recommendedIndexes.push({
                table: column.table || 'unknown',
                column: column.name,
                reason: 'Used in JOIN condition',
                priority: 'high'
            });
        });
        
        // Extraer columnas en ORDER BY
        const orderColumns = this.extractOrderColumns(sql);
        orderColumns.forEach(column => {
            analysis.recommendedIndexes.push({
                table: column.table || 'unknown',
                column: column.name,
                reason: 'Used in ORDER BY',
                priority: 'medium'
            });
        });
        
        return analysis;
    },

    /**
     * Analizar plan de ejecución de la consulta
     * @param {string} sql - Consulta SQL
     * @param {Array} params - Parámetros
     * @returns {Object} Análisis del plan
     */
    analyzeQueryPlan: async function(sql, params) {
        try {
            // Generar EXPLAIN ANALYZE
            const explainSQL = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
            
            // Ejecutar consulta de análisis (requiere DatabaseManager)
            if (typeof DatabaseManager !== 'undefined') {
                const result = await DatabaseManager.query(explainSQL, params);
                const plan = result.rows[0]['QUERY PLAN'][0];
                
                return {
                    plan: plan,
                    totalCost: plan['Total Cost'],
                    planningTime: plan['Planning Time'],
                    executionTime: plan['Execution Time'],
                    actualRows: plan['Actual Rows'],
                    actualLoops: plan['Actual Loops'],
                    bufferUsage: {
                        sharedReadBlocks: plan['Shared Read Blocks'],
                        sharedHitBlocks: plan['Shared Hit Blocks'],
                        sharedDirtiedBlocks: plan['Shared Dirtied Blocks'],
                        sharedWrittenBlocks: plan['Shared Written Blocks']
                    },
                    issues: this.identifyPlanIssues(plan)
                };
            }
            
            return null;
            
        } catch (error) {
            console.warn('⚠️ No se pudo analizar el plan de ejecución:', error.message);
            return null;
        }
    },

    /**
     * Identificar problemas en el plan de ejecución
     * @param {Object} plan - Plan de ejecución
     * @returns {Array} Lista de problemas
     */
    identifyPlanIssues: function(plan) {
        const issues = [];
        
        // Verificar escaneos secuenciales
        if (plan['Node Type'] === 'Seq Scan') {
            issues.push('Sequential scan detected - consider adding index');
        }
        
        // Verificar coste elevado
        if (plan['Total Cost'] > 10000) {
            issues.push('High total cost - query may be inefficient');
        }
        
        // Verificar tiempo de ejecución elevado
        if (plan['Execution Time'] > 5000) {
            issues.push('High execution time - consider optimization');
        }
        
        // Verificar uso de buffers
        if (plan['Shared Read Blocks'] > 1000) {
            issues.push('High disk I/O - consider adding more memory or indexes');
        }
        
        return issues;
    },

    /**
     * Generar recomendaciones de optimización
     * @param {Object} performance - Análisis de rendimiento
     * @param {Object} structure - Análisis de estructura
     * @param {Object} parameters - Análisis de parámetros
     * @param {Object} indexes - Análisis de índices
     * @returns {Array} Lista de recomendaciones
     */
    generateRecommendations: function(performance, structure, parameters, indexes) {
        const recommendations = [];
        
        // Recomendaciones de rendimiento
        if (performance.performanceLevel === 'critical') {
            recommendations.push({
                type: 'performance',
                priority: 'critical',
                title: 'Consulta extremadamente lenta',
                description: 'La consulta tarda más de 10 segundos en ejecutarse',
                action: 'review_query_structure'
            });
        }
        
        if (performance.bottlenecks.includes('SELECT_ALL_COLUMNS')) {
            recommendations.push({
                type: 'structure',
                priority: 'high',
                title: 'Evitar SELECT *',
                description: 'Especificar solo las columnas necesarias mejora el rendimiento',
                action: 'specify_columns'
            });
        }
        
        if (performance.bottlenecks.includes('LARGE_RESULT_SET')) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                title: 'Conjunto de resultados grande',
                description: 'Considerar paginación o filtrar resultados',
                action: 'add_pagination'
            });
        }
        
        // Recomendaciones de estructura
        if (structure.complexity > 7) {
            recommendations.push({
                type: 'structure',
                priority: 'medium',
                title: 'Consulta muy compleja',
                description: 'Considerar simplificar la consulta o dividirla en partes',
                action: 'simplify_query'
            });
        }
        
        if (structure.joins.length > 3) {
            recommendations.push({
                type: 'structure',
                priority: 'medium',
                title: 'Muchos JOINs',
                description: 'Considerar optimizar los JOINs o usar subconsultas',
                action: 'optimize_joins'
            });
        }
        
        // Recomendaciones de índices
        if (indexes && indexes.recommendedIndexes.length > 0) {
            indexes.recommendedIndexes.forEach(index => {
                if (index.priority === 'high') {
                    recommendations.push({
                        type: 'index',
                        priority: 'high',
                        title: 'Índice recomendado',
                        description: `Crear índice en ${index.table}.${index.column}`,
                        action: 'create_index',
                        details: index
                    });
                }
            });
        }
        
        // Recomendaciones de parámetros
        if (parameters.potentialIssues.length > 0) {
            parameters.potentialIssues.forEach(issue => {
                recommendations.push({
                    type: 'parameter',
                    priority: 'low',
                    title: 'Problema con parámetros',
                    description: issue,
                    action: 'review_parameters'
                });
            });
        }
        
        return recommendations;
    },

    /**
     * Calcular complejidad de la consulta
     * @param {string} sql - Consulta SQL
     * @returns {number} Nivel de complejidad
     */
    calculateComplexity: function(sql) {
        let complexity = 1;
        
        // Factores de complejidad
        const factors = {
            'JOIN': 2,
            'LEFT JOIN': 2,
            'RIGHT JOIN': 2,
            'FULL OUTER JOIN': 3,
            'SUBQUERY': 3,
            'UNION': 2,
            'GROUP BY': 1.5,
            'HAVING': 1.5,
            'WINDOW': 2,
            'CTE': 1.5
        };
        
        Object.entries(factors).forEach(([pattern, weight]) => {
            const regex = new RegExp(pattern, 'gi');
            const matches = sql.match(regex);
            if (matches) {
                complexity += matches.length * weight;
            }
        });
        
        return Math.round(complexity * 10) / 10;
    },

    /**
     * Calcular complejidad estructural
     * @param {Object} structure - Análisis de estructura
     * @returns {number} Nivel de complejidad estructural
     */
    calculateStructuralComplexity: function(structure) {
        let complexity = 0;
        
        complexity += structure.tables.length * 0.5;
        complexity += structure.joins.length * 1.5;
        complexity += structure.whereClauses.length * 1;
        complexity += structure.groupByClauses.length * 1.2;
        complexity += structure.orderByClauses.length * 0.8;
        complexity += structure.subqueries.length * 2;
        complexity += structure.functions.length * 0.5;
        complexity += structure.aggregations.length * 1;
        
        return Math.round(complexity * 10) / 10;
    },

    /**
     * Obtener nivel de rendimiento
     * @param {number} executionTime - Tiempo de ejecución
     * @returns {string} Nivel de rendimiento
     */
    getPerformanceLevel: function(executionTime) {
        if (executionTime > this.config.criticalQueryThreshold) return 'critical';
        if (executionTime > this.config.verySlowQueryThreshold) return 'very_slow';
        if (executionTime > this.config.slowQueryThreshold) return 'slow';
        if (executionTime > 100) return 'normal';
        return 'fast';
    },

    /**
     * Calcular eficiencia de la consulta
     * @param {number} executionTime - Tiempo de ejecución
     * @param {number} rowCount - Número de filas
     * @returns {number} Eficiencia (0-100)
     */
    calculateEfficiency: function(executionTime, rowCount) {
        if (executionTime === 0) return 100;
        
        const rowsPerSecond = rowCount / (executionTime / 1000);
        
        // Escalar a 0-100 (más alto es mejor)
        let efficiency = Math.min(100, rowsPerSecond / 10 * 100);
        
        // Penalizar tiempos muy largos
        if (executionTime > 5000) {
            efficiency *= 0.5;
        }
        
        return Math.round(efficiency);
    },

    /**
     * Obtener tipo de consulta
     * @param {string} sql - Consulta SQL
     * @returns {string} Tipo de consulta
     */
    getQueryType: function(sql) {
        const trimmed = sql.trim().toUpperCase();
        if (trimmed.startsWith('SELECT')) return 'SELECT';
        if (trimmed.startsWith('INSERT')) return 'INSERT';
        if (trimmed.startsWith('UPDATE')) return 'UPDATE';
        if (trimmed.startsWith('DELETE')) return 'DELETE';
        if (trimmed.startsWith('CREATE')) return 'CREATE';
        if (trimmed.startsWith('ALTER')) return 'ALTER';
        if (trimmed.startsWith('DROP')) return 'DROP';
        return 'UNKNOWN';
    },

    /**
     * Extraer tablas de la consulta
     * @param {string} sql - Consulta SQL
     * @returns {Array} Lista de tablas
     */
    extractTables: function(sql) {
        const tables = [];
        const patterns = [
            /FROM\s+(\w+)/gi,
            /JOIN\s+(\w+)/gi,
            /UPDATE\s+(\w+)/gi,
            /INSERT\s+INTO\s+(\w+)/gi,
            /DELETE\s+FROM\s+(\w+)/gi
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(sql)) !== null) {
                const table = match[1];
                if (!tables.includes(table)) {
                    tables.push(table);
                }
            }
        });
        
        return tables;
    },

    /**
     * Extraer columnas de la consulta
     * @param {string} sql - Consulta SQL
     * @returns {Array} Lista de columnas
     */
    extractColumns: function(sql) {
        const columns = [];
        
        // Extraer columnas SELECT
        const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
        if (selectMatch) {
            const selectClause = selectMatch[1];
            const columnList = selectClause.split(',');
            
            columnList.forEach(col => {
                const cleanCol = col.trim().split(' ')[0]; // Eliminar alias
                if (cleanCol !== '*' && !columns.includes(cleanCol)) {
                    columns.push(cleanCol);
                }
            });
        }
        
        return columns;
    },

    /**
     * Extraer JOINs de la consulta
     * @param {string} sql - Consulta SQL
     * @returns {Array} Lista de JOINs
     */
    extractJoins: function(sql) {
        const joins = [];
        const joinPattern = /(INNER|LEFT|RIGHT|FULL OUTER)?\s*JOIN\s+(\w+)\s+ON\s+([^;]+)/gi;
        
        let match;
        while ((match = joinPattern.exec(sql)) !== null) {
            joins.push({
                type: match[1] || 'INNER',
                table: match[2],
                condition: match[3].trim()
            });
        }
        
        return joins;
    },

    /**
     * Extraer cláusulas WHERE
     * @param {string} sql - Consulta SQL
     * @returns {Array} Lista de cláusulas WHERE
     */
    extractWhereClauses: function(sql) {
        const clauses = [];
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|\s+OFFSET|$)/i);
        
        if (whereMatch) {
            const whereClause = whereMatch[1];
            const conditions = whereClause.split(/\s+(AND|OR)\s+/i);
            
            conditions.forEach(condition => {
                clauses.push(condition.trim());
            });
        }
        
        return clauses;
    },

    /**
     * Extraer cláusulas GROUP BY
     * @param {string} sql - Consulta SQL
     * @returns {Array} Lista de cláusulas GROUP BY
     */
    extractGroupByClauses: function(sql) {
        const groupByMatch = sql.match(/GROUP\s+BY\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s+OFFSET|$)/i);
        
        if (groupByMatch) {
            return groupByMatch[1].split(',').map(col => col.trim());
        }
        
        return [];
    },

    /**
     * Extraer cláusulas ORDER BY
     * @param {string} sql - Consulta SQL
     * @returns {Array} Lista de cláusulas ORDER BY
     */
    extractOrderByClauses: function(sql) {
        const orderByMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|\s+OFFSET|$)/i);
        
        if (orderByMatch) {
            return orderByMatch[1].split(',').map(col => col.trim());
        }
        
        return [];
    },

    /**
     * Extraer subconsultas
     * @param {string} sql - Consulta SQL
     * @returns {Array} Lista de subconsultas
     */
    extractSubqueries: function(sql) {
        const subqueries = [];
        const subqueryPattern = /\((SELECT\s+[^)]+)\)/gi;
        
        let match;
        while ((match = subqueryPattern.exec(sql)) !== null) {
            subqueries.push(match[1]);
        }
        
        return subqueries;
    },

    /**
     * Extraer funciones de la consulta
     * @param {string} sql - Consulta SQL
     * @returns {Array} Lista de funciones
     */
    extractFunctions: function(sql) {
        const functions = [];
        const functionPattern = /(\w+)\s*\(/gi;
        
        let match;
        while ((match = functionPattern.exec(sql)) !== null) {
            const func = match[1].toUpperCase();
            if (!functions.includes(func)) {
                functions.push(func);
            }
        }
        
        return functions;
    },

    /**
     * Extraer agregaciones de la consulta
     * @param {string} sql - Consulta SQL
     * @returns {Array} Lista de agregaciones
     */
    extractAggregations: function(sql) {
        const aggregations = [];
        const aggPattern = /(COUNT|SUM|AVG|MIN|MAX|STDDEV|VARIANCE)\s*\(/gi;
        
        let match;
        while ((match = aggPattern.exec(sql)) !== null) {
            const agg = match[1].toUpperCase();
            if (!aggregations.includes(agg)) {
                aggregations.push(agg);
            }
        }
        
        return aggregations;
    },

    /**
     * Extraer columnas WHERE
     * @param {string} sql - Consulta SQL
     * @returns {Array} Lista de columnas WHERE
     */
    extractWhereColumns: function(sql) {
        const columns = [];
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|\s+OFFSET|$)/i);
        
        if (whereMatch) {
            const whereClause = whereMatch[1];
            const columnPattern = /(\w+)\s*[=<>!]/gi;
            
            let match;
            while ((match = columnPattern.exec(whereClause)) !== null) {
                columns.push({
                    table: 'unknown',
                    name: match[1]
                });
            }
        }
        
        return columns;
    },

    /**
     * Extraer columnas JOIN
     * @param {string} sql - Consulta SQL
     * @returns {Array} Lista de columnas JOIN
     */
    extractJoinColumns: function(sql) {
        const columns = [];
        const joinPattern = /ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi;
        
        let match;
        while ((match = joinPattern.exec(sql)) !== null) {
            columns.push({
                table: match[1],
                name: match[2]
            });
            columns.push({
                table: match[3],
                name: match[4]
            });
        }
        
        return columns;
    },

    /**
     * Extraer columnas ORDER BY
     * @param {string} sql - Consulta SQL
     * @returns {Array} Lista de columnas ORDER BY
     */
    extractOrderColumns: function(sql) {
        const columns = [];
        const orderByMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|\s+OFFSET|$)/i);
        
        if (orderByMatch) {
            const orderByClause = orderByMatch[1];
            const columnList = orderByClause.split(',');
            
            columnList.forEach(col => {
                const cleanCol = col.trim().split(' ')[0];
                columns.push({
                    table: 'unknown',
                    name: cleanCol
                });
            });
        }
        
        return columns;
    },

    /**
     * Obtener tamaño del parámetro
     * @param {*} param - Parámetro
     * @returns {number} Tamaño en bytes
     */
    getParameterSize: function(param) {
        if (param === null) return 0;
        if (typeof param === 'string') return new Blob([param]).size;
        if (typeof param === 'object') return JSON.stringify(param).length;
        return 8; // Tamaño aproximado para números y booleanos
    },

    /**
     * Generar ID único para análisis
     * @returns {string} ID único
     */
    generateAnalysisId: function() {
        return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Almacenar análisis
     * @param {string} id - ID del análisis
     * @param {Object} analysis - Análisis
     */
    storeAnalysis: function(id, analysis) {
        // Limitar tamaño del almacenamiento
        if (this.state.analysisResults.size >= this.config.maxAnalysisResults) {
            const firstKey = this.state.analysisResults.keys().next().value;
            this.state.analysisResults.delete(firstKey);
        }
        
        this.state.analysisResults.set(id, analysis);
    },

    /**
     * Actualizar métricas
     * @param {Object} analysis - Análisis
     */
    updateMetrics: function(analysis) {
        // Actualizar métricas de rendimiento
        if (analysis.performance.executionTime > this.config.slowQueryThreshold) {
            this.metrics.slowQueries++;
        }
        
        if (analysis.performance.executionTime > this.config.verySlowQueryThreshold) {
            this.metrics.verySlowQueries++;
        }
        
        if (analysis.performance.executionTime > this.config.criticalQueryThreshold) {
            this.metrics.criticalQueries++;
        }
        
        // Actualizar tiempo promedio
        this.metrics.averageExecutionTime = 
            (this.metrics.averageExecutionTime * (this.metrics.analyzedQueries - 1) + analysis.performance.executionTime) / 
            this.metrics.analyzedQueries;
        
        // Calcular consultas por segundo
        const elapsed = Date.now() - this.metrics.analysisStartTime;
        this.metrics.queriesPerSecond = (this.metrics.totalQueries / elapsed) * 1000;
        
        this.metrics.lastAnalysisTime = new Date().toISOString();
    },

    /**
     * Verificar y generar alertas
     * @param {Object} analysis - Análisis
     */
    checkAlerts: function(analysis) {
        const alerts = [];
        
        // Alerta de consulta crítica
        if (analysis.performance.performanceLevel === 'critical') {
            alerts.push({
                type: 'critical_query',
                severity: 'critical',
                message: 'Consulta con rendimiento crítico detectada',
                details: {
                    executionTime: analysis.performance.executionTime,
                    sql: analysis.sql.substring(0, 200)
                }
            });
        }
        
        // Alerta de alta complejidad
        if (analysis.structure.complexity > 8) {
            alerts.push({
                type: 'high_complexity',
                severity: 'warning',
                message: 'Consulta con alta complejidad detectada',
                details: {
                    complexity: analysis.structure.complexity,
                    sql: analysis.sql.substring(0, 200)
                }
            });
        }
        
        // Agregar alertas al estado
        this.state.alerts.push(...alerts);
        
        // Limitar tamaño de alertas
        if (this.state.alerts.length > 1000) {
            this.state.alerts = this.state.alerts.slice(-1000);
        }
    },

    /**
     * Configurar limpieza periódica
     */
    setupPeriodicCleanup: function() {
        setInterval(() => {
            this.cleanup();
        }, 60 * 60 * 1000); // Cada hora
    },

    /**
     * Configurar monitoreo continuo
     */
    setupContinuousMonitoring: function() {
        setInterval(() => {
            this.generatePerformanceReport();
        }, 5 * 60 * 1000); // Cada 5 minutos
    },

    /**
     * Limpiar datos antiguos
     */
    cleanup: function() {
        const now = Date.now();
        const cutoff = now - this.config.retentionPeriod;
        
        // Limpiar análisis antiguos
        for (const [id, analysis] of this.state.analysisResults.entries()) {
            const analysisTime = new Date(analysis.timestamp).getTime();
            if (analysisTime < cutoff) {
                this.state.analysisResults.delete(id);
            }
        }
        
        // Limpiar planes antiguos
        for (const [id, plan] of this.state.queryPlans.entries()) {
            const planTime = new Date(plan.timestamp).getTime();
            if (planTime < cutoff) {
                this.state.queryPlans.delete(id);
            }
        }
        
        console.log('🧹 Query Analyzer cleanup completed');
    },

    /**
     * Generar informe de rendimiento
     * @returns {Object} Informe completo
     */
    generatePerformanceReport: function() {
        const report = {
            summary: {
                totalQueries: this.metrics.totalQueries,
                analyzedQueries: this.metrics.analyzedQueries,
                slowQueries: this.metrics.slowQueries,
                verySlowQueries: this.metrics.verySlowQueries,
                criticalQueries: this.metrics.criticalQueries,
                averageExecutionTime: Math.round(this.metrics.averageExecutionTime * 100) / 100,
                queriesPerSecond: Math.round(this.metrics.queriesPerSecond * 100) / 100
            },
            performance: {
                slowQueryRate: this.metrics.analyzedQueries > 0 ? 
                    (this.metrics.slowQueries / this.metrics.analyzedQueries * 100) : 0,
                criticalQueryRate: this.metrics.analyzedQueries > 0 ? 
                    (this.metrics.criticalQueries / this.metrics.analyzedQueries * 100) : 0
            },
            alerts: this.state.alerts.slice(-10),
            recommendations: this.state.recommendations.slice(-20),
            timestamp: new Date().toISOString()
        };
        
        return report;
    },

    /**
     * Obtener estadísticas del analizador
     * @returns {Object} Estadísticas completas
     */
    getStatistics: function() {
        return {
            metrics: this.metrics,
            state: {
                analysisCount: this.state.analysisResults.size,
                planCount: this.state.queryPlans.size,
                alertCount: this.state.alerts.length,
                recommendationCount: this.state.recommendations.length
            },
            config: this.config,
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Reiniciar analizador
     */
    reset: function() {
        this.state.analysisResults.clear();
        this.state.queryPlans.clear();
        this.state.performanceProfile.clear();
        this.state.alerts = [];
        this.state.recommendations = [];
        
        this.metrics = {
            totalQueries: 0,
            analyzedQueries: 0,
            slowQueries: 0,
            verySlowQueries: 0,
            criticalQueries: 0,
            averageExecutionTime: 0,
            queriesPerSecond: 0,
            errorQueries: 0,
            lastAnalysisTime: null,
            analysisStartTime: Date.now()
        };
        
        console.log('🔄 Query Analyzer reiniciado');
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.QueryAnalyzer = QueryAnalyzer;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = QueryAnalyzer;
}