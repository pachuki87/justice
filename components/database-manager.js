/**
 * Justice 2 Database Manager
 * Gestor centralizado de conexión a base de datos con optimización de consultas
 */

const DatabaseManager = {
    // Configuración del gestor
    config: {
        // Configuración de conexión
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'justice2_db',
        user: process.env.DB_USER || 'justice2_user',
        password: process.env.DB_PASSWORD || '',
        
        // Configuración SSL
        ssl: process.env.DB_SSL === 'true' || true,
        sslMode: process.env.DB_SSL_MODE || 'require',
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        
        // Configuración de pool
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        acquireTimeoutMillis: 60000,
        
        // Configuración de consultas
        queryTimeout: 30000,
        enableQueryOptimization: true,
        enableQueryCache: true,
        enableQueryLogging: true,
        
        // Configuración de monitoreo
        enableMetrics: true,
        metricsInterval: 60000,
        slowQueryThreshold: 1000,
        
        // Configuración de reintentos
        maxRetries: 3,
        retryDelay: 1000,
        enableRetry: true
    },

    // Estado del gestor
    state: {
        initialized: false,
        connected: false,
        connecting: false,
        error: null,
        connectionAttempts: 0,
        lastConnected: null,
        metrics: {
            totalQueries: 0,
            successfulQueries: 0,
            failedQueries: 0,
            slowQueries: 0,
            averageQueryTime: 0,
            connectionErrors: 0,
            queryHistory: []
        }
    },

    // Pool de conexiones
    pool: null,
    
    // Cache de consultas
    queryCache: new Map(),
    
    // Prepared statements cache
    preparedStatements: new Map(),
    
    // Query analyzer
    queryAnalyzer: null,

    /**
     * Inicializar el gestor de base de datos
     */
    init: async function() {
        if (this.state.initialized) {
            console.log('⚠️ Database Manager ya está inicializado');
            return;
        }
        
        try {
            console.log('🚀 Inicializando Database Manager...');
            
            // Inicializar componentes
            await this.initializeComponents();
            
            // Crear pool de conexiones
            await this.createPool();
            
            // Probar conexión
            await this.testConnection();
            
            // Configurar eventos del pool
            this.setupPoolEvents();
            
            // Iniciar monitoreo
            if (this.config.enableMetrics) {
                this.startMonitoring();
            }
            
            this.state.initialized = true;
            this.state.connected = true;
            this.state.lastConnected = new Date();
            
            console.log('✅ Database Manager inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Database Manager:', error);
            this.state.error = error;
            throw error;
        }
    },

    /**
     * Inicializar componentes adicionales
     */
    initializeComponents: async function() {
        // Inicializar Query Optimizer si está disponible
        if (typeof QueryOptimizer !== 'undefined' && this.config.enableQueryOptimization) {
            QueryOptimizer.init();
            this.queryAnalyzer = QueryOptimizer;
        }
        
        // Inicializar Query Builder si está disponible
        if (typeof QueryBuilder !== 'undefined') {
            console.log('✅ Query Builder disponible');
        }
    },

    /**
     * Crear pool de conexiones
     */
    createPool: async function() {
        const { Pool } = require('pg');
        
        const poolConfig = {
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            max: this.config.max,
            min: this.config.min,
            idleTimeoutMillis: this.config.idleTimeoutMillis,
            connectionTimeoutMillis: this.config.connectionTimeoutMillis,
            acquireTimeoutMillis: this.config.acquireTimeoutMillis,
            statement_timeout: this.config.queryTimeout,
            query_timeout: this.config.queryTimeout
        };
        
        // Configurar SSL
        if (this.config.ssl) {
            poolConfig.ssl = {
                rejectUnauthorized: this.config.rejectUnauthorized
            };
        }
        
        this.pool = new Pool(poolConfig);
        
        console.log(`🔗 Pool de conexiones creado (${this.config.min}-${this.config.max} conexiones)`);
    },

    /**
     * Probar conexión a la base de datos
     */
    testConnection: async function() {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT NOW() as current_time, version() as version');
            console.log('✅ Conexión a base de datos exitosa');
            console.log(`📊 Versión: ${result.rows[0].version.split(' ')[0]}`);
            console.log(`⏰ Hora actual: ${result.rows[0].current_time}`);
        } finally {
            client.release();
        }
    },

    /**
     * Configurar eventos del pool
     */
    setupPoolEvents: function() {
        this.pool.on('connect', (client) => {
            console.log('🔌 Nueva conexión establecida');
        });
        
        this.pool.on('acquire', (client) => {
            console.log('🎯 Conexión adquirida del pool');
        });
        
        this.pool.on('remove', (client) => {
            console.log('❌ Conexión removida del pool');
        });
        
        this.pool.on('error', (err, client) => {
            console.error('💥 Error en pool de conexiones:', err);
            this.state.connectionErrors++;
            this.state.error = err;
        });
    },

    /**
     * Ejecutar consulta con optimización
     * @param {string} sql - Consulta SQL
     * @param {Array} params - Parámetros
     * @param {Object} options - Opciones de ejecución
     * @returns {Object} Resultado de la consulta
     */
    query: async function(sql, params = [], options = {}) {
        const startTime = Date.now();
        let queryId = this.generateQueryId();
        
        try {
            // Optimizar consulta si está habilitado
            let optimizedQuery = { sql, params };
            if (this.config.enableQueryOptimization && this.queryAnalyzer) {
                optimizedQuery = this.queryAnalyzer.optimizeQuery(sql, params, options);
            }
            
            // Verificar caché si está habilitado
            if (this.config.enableQueryCache && !optimizedQuery.fromCache) {
                const cachedResult = this.getFromCache(optimizedQuery.cacheKey);
                if (cachedResult) {
                    this.recordQueryExecution(sql, Date.now() - startTime, cachedResult, true);
                    return cachedResult;
                }
            }
            
            // Ejecutar consulta
            const result = await this.executeQuery(optimizedQuery.sql, optimizedQuery.params, options);
            
            // Almacenar en caché si está habilitado
            if (this.config.enableQueryCache && optimizedQuery.cacheKey) {
                this.setCache(optimizedQuery.cacheKey, result);
            }
            
            // Registrar métricas
            const executionTime = Date.now() - startTime;
            this.recordQueryExecution(sql, executionTime, result, false);
            
            // Registrar en el optimizador
            if (this.queryAnalyzer) {
                this.queryAnalyzer.recordQueryExecution(sql, executionTime, result);
            }
            
            return result;
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.state.failedQueries++;
            
            console.error(`❌ Error en consulta (${executionTime}ms):`, {
                queryId: queryId,
                sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
                error: error.message,
                params: params.length > 0 ? '[PARAMS_HIDDEN]' : '[]'
            });
            
            // Reintentar si está configurado
            if (this.config.enableRetry && options.retries !== false) {
                return this.retryQuery(sql, params, options, queryId);
            }
            
            throw error;
        }
    },

    /**
     * Ejecutar consulta en la base de datos
     * @param {string} sql - Consulta SQL
     * @param {Array} params - Parámetros
     * @param {Object} options - Opciones
     * @returns {Object} Resultado de la consulta
     */
    executeQuery: async function(sql, params, options = {}) {
        const client = await this.pool.connect();
        
        try {
            // Configurar timeout si es necesario
            if (options.timeout) {
                await client.query(`SET statement_timeout = ${options.timeout}`);
            }
            
            // Ejecutar consulta
            const result = await client.query(sql, params);
            
            // Restaurar timeout
            if (options.timeout) {
                await client.query(`SET statement_timeout = ${this.config.queryTimeout}`);
            }
            
            return result;
            
        } finally {
            client.release();
        }
    },

    /**
     * Reintentar consulta fallida
     * @param {string} sql - Consulta SQL
     * @param {Array} params - Parámetros
     * @param {Object} options - Opciones
     * @param {string} queryId - ID de la consulta
     * @returns {Object} Resultado de la consulta
     */
    retryQuery: async function(sql, params, options, queryId) {
        let lastError;
        const maxRetries = options.maxRetries || this.config.maxRetries;
        const retryDelay = options.retryDelay || this.config.retryDelay;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Reintentando consulta ${queryId} (intento ${attempt}/${maxRetries})`);
                
                // Esperar antes de reintentar
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                
                return await this.executeQuery(sql, params, { ...options, retries: false });
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Intento ${attempt} fallido para consulta ${queryId}:`, error.message);
            }
        }
        
        console.error(`❌ Todos los reintentos fallidos para consulta ${queryId}`);
        throw lastError;
    },

    /**
     * Ejecutar transacción
     * @param {Function} callback - Función de transacción
     * @param {Object} options - Opciones de transacción
     * @returns {Object} Resultado de la transacción
     */
    transaction: async function(callback, options = {}) {
        const client = await this.pool.connect();
        const transactionId = this.generateQueryId();
        
        try {
            console.log(`🔄 Iniciando transacción ${transactionId}`);
            
            await client.query('BEGIN');
            
            // Configurar opciones de transacción si se proporcionan
            if (options.isolationLevel) {
                await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
            }
            
            // Ejecutar callback con el cliente
            const result = await callback(client, transactionId);
            
            await client.query('COMMIT');
            
            console.log(`✅ Transacción ${transactionId} completada exitosamente`);
            
            return result;
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`❌ Transacción ${transactionId} fallida:`, error.message);
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Ejecutar batch de operaciones
     * @param {Array} operations - Array de operaciones
     * @param {Object} options - Opciones del batch
     * @returns {Array} Resultados de las operaciones
     */
    batch: async function(operations, options = {}) {
        const batchId = this.generateQueryId();
        console.log(`📦 Ejecutando batch ${batchId} con ${operations.length} operaciones`);
        
        return await this.transaction(async (client) => {
            const results = [];
            
            for (let i = 0; i < operations.length; i++) {
                const operation = operations[i];
                
                try {
                    const result = await client.query(operation.sql, operation.params);
                    results.push({
                        success: true,
                        result: result,
                        operation: operation
                    });
                } catch (error) {
                    if (options.continueOnError) {
                        results.push({
                            success: false,
                            error: error,
                            operation: operation
                        });
                    } else {
                        throw error;
                    }
                }
            }
            
            console.log(`✅ Batch ${batchId} completado: ${results.filter(r => r.success).length}/${results.length} exitosas`);
            
            return results;
        }, options);
    },

    /**
     * Generar ID único para consulta
     * @returns {string} ID único
     */
    generateQueryId: function() {
        return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Obtener resultado del caché
     * @param {string} key - Clave de caché
     * @returns {Object|null} Resultado cacheado
     */
    getFromCache: function(key) {
        if (!this.config.enableQueryCache) return null;
        
        const cached = this.queryCache.get(key);
        if (!cached) return null;
        
        // Verificar si ha expirado (TTL de 5 minutos por defecto)
        const ttl = 300000; // 5 minutos
        if (Date.now() - cached.timestamp > ttl) {
            this.queryCache.delete(key);
            return null;
        }
        
        console.log(`🎯 Cache hit para clave: ${key}`);
        return cached.result;
    },

    /**
     * Almacenar resultado en caché
     * @param {string} key - Clave de caché
     * @param {Object} result - Resultado a almacenar
     */
    setCache: function(key, result) {
        if (!this.config.enableQueryCache) return;
        
        // Limitar tamaño del caché
        const maxCacheSize = 1000;
        if (this.queryCache.size >= maxCacheSize) {
            // Eliminar el elemento más antiguo
            const firstKey = this.queryCache.keys().next().value;
            this.queryCache.delete(firstKey);
        }
        
        this.queryCache.set(key, {
            result: result,
            timestamp: Date.now()
        });
        
        console.log(`💾 Resultado cacheado con clave: ${key}`);
    },

    /**
     * Limpiar caché expirado
     */
    cleanCache: function() {
        if (!this.config.enableQueryCache) return;
        
        const now = Date.now();
        const ttl = 300000; // 5 minutos
        const expiredKeys = [];
        
        for (const [key, value] of this.queryCache.entries()) {
            if (now - value.timestamp > ttl) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => {
            this.queryCache.delete(key);
        });
        
        if (expiredKeys.length > 0) {
            console.log(`🧹 Limpiados ${expiredKeys.length} elementos expirados del caché`);
        }
    },

    /**
     * Registrar ejecución de consulta
     * @param {string} sql - Consulta SQL
     * @param {number} executionTime - Tiempo de ejecución
     * @param {Object} result - Resultado
     * @param {boolean} fromCache - Si vino del caché
     */
    recordQueryExecution: function(sql, executionTime, result, fromCache = false) {
        this.state.metrics.totalQueries++;
        
        if (!fromCache) {
            this.state.metrics.successfulQueries++;
            
            if (executionTime > this.config.slowQueryThreshold) {
                this.state.metrics.slowQueries++;
                
                if (this.config.enableQueryLogging) {
                    console.warn(`🐌 Consulta lenta (${executionTime}ms):`, sql.substring(0, 200));
                }
            }
            
            // Actualizar tiempo promedio
            this.state.metrics.averageQueryTime = 
                (this.state.metrics.averageQueryTime * (this.state.metrics.successfulQueries - 1) + executionTime) / 
                this.state.metrics.successfulQueries;
        }
        
        // Agregar al historial
        this.state.metrics.queryHistory.push({
            sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
            executionTime: executionTime,
            rowCount: result.rowCount || 0,
            fromCache: fromCache,
            timestamp: new Date().toISOString()
        });
        
        // Mantener solo las últimas 1000 consultas
        if (this.state.metrics.queryHistory.length > 1000) {
            this.state.metrics.queryHistory = this.state.metrics.queryHistory.slice(-1000);
        }
    },

    /**
     * Iniciar monitoreo
     */
    startMonitoring: function() {
        setInterval(() => {
            this.collectMetrics();
            this.cleanCache();
        }, this.config.metricsInterval);
    },

    /**
     * Recopilar métricas del pool
     */
    collectMetrics: function() {
        if (!this.pool) return;
        
        const poolMetrics = {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
            timestamp: new Date().toISOString()
        };
        
        const metrics = {
            ...this.state.metrics,
            pool: poolMetrics,
            cacheSize: this.queryCache.size,
            connected: this.state.connected,
            timestamp: new Date().toISOString()
        };
        
        // Enviar métricas a sistema de monitoreo
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.config.logging.remote) {
            this.sendMetrics(metrics);
        }
        
        return metrics;
    },

    /**
     * Enviar métricas a sistema de monitoreo
     * @param {Object} metrics - Métricas a enviar
     */
    sendMetrics: function(metrics) {
        fetch('/api/metrics/database', {
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
     * Obtener estado del gestor
     * @returns {Object} Estado completo
     */
    getState: function() {
        return {
            ...this.state,
            config: this.config,
            poolMetrics: this.pool ? {
                totalCount: this.pool.totalCount,
                idleCount: this.pool.idleCount,
                waitingCount: this.pool.waitingCount
            } : null,
            cacheSize: this.queryCache.size,
            preparedStatementsSize: this.preparedStatements.size
        };
    },

    /**
     * Verificar conexión
     * @returns {boolean} Estado de la conexión
     */
    checkConnection: async function() {
        try {
            await this.query('SELECT 1');
            return true;
        } catch (error) {
            console.error('❌ Error verificando conexión:', error.message);
            return false;
        }
    },

    /**
     * Reiniciar conexión
     */
    reconnect: async function() {
        if (this.state.connectionAttempts >= 5) {
            throw new Error('Máximo número de intentos de reconexión alcanzado');
        }
        
        this.state.connectionAttempts++;
        this.state.connecting = true;
        
        try {
            // Cerrar pool existente
            if (this.pool) {
                await this.pool.end();
            }
            
            // Reinicializar
            await this.init();
            
            this.state.connectionAttempts = 0;
            this.state.connecting = false;
            
            console.log('✅ Reconexión exitosa');
            
        } catch (error) {
            this.state.connecting = false;
            throw error;
        }
    },

    /**
     * Cerrar gestor de base de datos
     */
    close: async function() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
        
        this.state.connected = false;
        this.state.initialized = false;
        
        console.log('🔌 Database Manager cerrado');
    },

    /**
     * Limpiar todos los cachés
     */
    clearCache: function() {
        this.queryCache.clear();
        this.preparedStatements.clear();
        console.log('🧹 Todos los cachés limpiados');
    },

    /**
     * Obtener estadísticas detalladas
     * @returns {Object} Estadísticas completas
     */
    getStatistics: function() {
        const metrics = this.collectMetrics();
        const slowQueries = metrics.queryHistory
            .filter(q => q.executionTime > this.config.slowQueryThreshold)
            .sort((a, b) => b.executionTime - a.executionTime)
            .slice(0, 10);
        
        return {
            summary: {
                totalQueries: metrics.totalQueries,
                successfulQueries: metrics.successfulQueries,
                failedQueries: metrics.failedQueries,
                slowQueries: metrics.slowQueries,
                averageQueryTime: Math.round(metrics.averageQueryTime * 100) / 100,
                cacheHitRate: metrics.totalQueries > 0 ? 
                    Math.round((metrics.totalQueries - metrics.successfulQueries) / metrics.totalQueries * 100) : 0
            },
            pool: metrics.pool,
            cache: {
                size: metrics.cacheSize,
                hitRate: metrics.cacheHitRate || 0
            },
            topSlowQueries: slowQueries,
            recentQueries: metrics.queryHistory.slice(-20),
            timestamp: new Date().toISOString()
        };
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DatabaseManager = DatabaseManager;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseManager;
}