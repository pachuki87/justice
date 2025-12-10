/**
 * Justice 2 Database Configuration
 * Configuración específica para conexión con la base de datos existente
 */

const Justice2Database = {
    // Configuración de conexión
    connection: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'justice2_db',
        ssl: process.env.DB_SSL === 'true' || true,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 20,
        min: 5,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
    },
    
    // Configuración de autenticación
    auth: {
        type: 'postgres',
        username: process.env.DB_USER || 'justice2_user',
        password: process.env.DB_PASSWORD || '', // Se obtiene de variables de entorno
        encryptPassword: true,
        useSSL: process.env.DB_SSL === 'true' || true,
        sslMode: process.env.DB_SSL_MODE || 'require'
    },
    
    // Pool de conexiones
    pool: {
        name: 'justice2-pool',
        max: 20,
        min: 5,
        idle: 10000,
        acquire: 60000,
        evict: 1000,
        handleDisconnects: true
    },
    
    // Configuración de consultas
    query: {
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        logQueries: false,
        logSlowQueries: true,
        slowQueryThreshold: 5000
    },
    
    // Tablas principales
    tables: {
        users: 'users',
        clients: 'clients',
        cases: 'cases',
        documents: 'documents',
        conversations: 'conversations',
        messages: 'messages',
        analytics: 'analytics',
        sessions: 'user_sessions',
        logs: 'system_logs'
    },
    
    // Configuración de caché
    cache: {
        enabled: true,
        ttl: 300000, // 5 minutos
        maxSize: 1000,
        keyPrefix: 'justice2_db_',
        compression: true
    },
    
    // Configuración de transacciones
    transactions: {
        isolationLevel: 'READ_COMMITTED',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
    },
    
    // Configuración de migraciones
    migrations: {
        tableName: 'migrations',
        directory: './migrations',
        autoRun: false,
        logMigrations: true
    },
    
    // Configuración de backups
    backups: {
        enabled: true,
        schedule: '0 2 * * *', // Todos los días a las 2 AM
        retention: 30, // días
        compression: true,
        encryption: true
    },
    
    // Configuración de monitoreo
    monitoring: {
        enabled: true,
        metricsInterval: 60000, // 1 minuto
        slowQueryThreshold: 5000,
        connectionPoolMetrics: true,
        queryPerformance: true
    },
    
    // Configuración de seguridad
    security: {
        encryptSensitiveData: true,
        auditQueries: false,
        auditInserts: true,
        auditUpdates: true,
        auditDeletes: true,
        maskSensitiveLogs: true
    },
    
    // Estado de la conexión
    state: {
        connected: false,
        connecting: false,
        error: null,
        lastConnected: null,
        connectionAttempts: 0,
        maxConnectionAttempts: 5
    },
    
    // Pool de conexiones activo
    poolInstance: null,
    
    // Inicializar conexión
    init: async function() {
        try {
            console.log('Iniciando conexión a base de datos...');
            
            // Crear pool de conexiones
            await this.createPool();
            
            // Probar conexión
            await this.testConnection();
            
            // Configurar eventos del pool
            this.setupPoolEvents();
            
            // Inicializar caché
            if (this.cache.enabled) {
                this.initCache();
            }
            
            // Iniciar monitoreo
            if (this.monitoring.enabled) {
                this.startMonitoring();
            }
            
            this.state.connected = true;
            this.state.lastConnected = new Date();
            
            console.log('Conexión a base de datos establecida correctamente');
            
        } catch (error) {
            console.error('Error conectando a base de datos:', error);
            this.state.error = error;
            throw error;
        }
    },
    
    // Crear pool de conexiones
    createPool: async function() {
        const Pool = require('pg').Pool;
        
        const poolConfig = {
            host: this.connection.host,
            port: this.connection.port,
            database: this.connection.database,
            user: this.auth.username,
            password: this.auth.password,
            ssl: this.auth.useSSL ? {
                rejectUnauthorized: false
            } : false,
            max: this.connection.max,
            min: this.connection.min,
            idleTimeoutMillis: this.connection.idleTimeoutMillis,
            connectionTimeoutMillis: this.connection.connectionTimeoutMillis,
            acquireTimeoutMillis: this.connection.acquireTimeoutMillis,
            createTimeoutMillis: this.connection.createTimeoutMillis,
            destroyTimeoutMillis: this.connection.destroyTimeoutMillis,
            reapIntervalMillis: this.connection.reapIntervalMillis,
            createRetryIntervalMillis: this.connection.createRetryIntervalMillis
        };
        
        this.poolInstance = new Pool(poolConfig);
    },
    
    // Probar conexión
    testConnection: async function() {
        const client = await this.poolInstance.connect();
        try {
            const result = await client.query('SELECT NOW()');
            console.log('Test de conexión exitoso:', result.rows[0]);
        } finally {
            client.release();
        }
    },
    
    // Configurar eventos del pool
    setupPoolEvents: function() {
        this.poolInstance.on('connect', (client) => {
            console.log('Nueva conexión establecida');
        });
        
        this.poolInstance.on('acquire', (client) => {
            console.log('Conexión adquirida del pool');
        });
        
        this.poolInstance.on('remove', (client) => {
            console.log('Conexión removida del pool');
        });
        
        this.poolInstance.on('error', (err, client) => {
            console.error('Error en pool de conexiones:', err);
            this.state.error = err;
        });
    },
    
    // Ejecutar consulta
    query: async function(sql, params = [], options = {}) {
        const startTime = Date.now();
        
        try {
            const client = await this.poolInstance.connect();
            
            try {
                const result = await client.query(sql, params);
                const duration = Date.now() - startTime;
                
                // Log de consulta lenta
                if (this.query.logSlowQueries && duration > this.query.slowQueryThreshold) {
                    console.warn(`Consulta lenta (${duration}ms):`, sql);
                }
                
                // Log de consulta si está habilitado
                if (this.query.logQueries) {
                    console.log(`Consulta ejecutada (${duration}ms):`, sql);
                }
                
                return result;
                
            } finally {
                client.release();
            }
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`Error en consulta (${duration}ms):`, sql, error);
            
            // Reintentar si está configurado
            if (options.retries !== false && this.query.retries > 0) {
                return this.retryQuery(sql, params, options);
            }
            
            throw error;
        }
    },
    
    // Reintentar consulta
    retryQuery: async function(sql, params, options) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.query.retries; attempt++) {
            try {
                await new Promise(resolve => setTimeout(resolve, this.query.retryDelay * attempt));
                return await this.query(sql, params, { ...options, retries: false });
            } catch (error) {
                lastError = error;
                console.warn(`Intento ${attempt} fallido:`, error.message);
            }
        }
        
        throw lastError;
    },
    
    // Ejecutar transacción
    transaction: async function(callback) {
        const client = await this.poolInstance.connect();
        
        try {
            await client.query('BEGIN');
            
            const result = await callback(client);
            
            await client.query('COMMIT');
            
            return result;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    
    // Obtener cliente individual
    getClient: async function() {
        return await this.poolInstance.connect();
    },
    
    // Liberar cliente
    releaseClient: function(client) {
        client.release();
    },
    
    // Inicializar caché
    initCache: function() {
        this.cache.store = new Map();
        this.cache.timestamps = new Map();
        
        // Limpiar caché periódicamente
        setInterval(() => {
            this.cleanCache();
        }, this.cache.ttl);
    },
    
    // Obtener de caché
    getFromCache: function(key) {
        if (!this.cache.enabled) return null;
        
        const cacheKey = this.cache.keyPrefix + key;
        const timestamp = this.cache.timestamps.get(cacheKey);
        
        if (!timestamp || Date.now() - timestamp > this.cache.ttl) {
            this.cache.store.delete(cacheKey);
            this.cache.timestamps.delete(cacheKey);
            return null;
        }
        
        return this.cache.store.get(cacheKey);
    },
    
    // Guardar en caché
    setCache: function(key, value) {
        if (!this.cache.enabled) return;
        
        const cacheKey = this.cache.keyPrefix + key;
        
        // Verificar tamaño máximo
        if (this.cache.store.size >= this.cache.maxSize) {
            // Eliminar el elemento más antiguo
            const oldestKey = this.cache.store.keys().next().value;
            this.cache.store.delete(oldestKey);
            this.cache.timestamps.delete(oldestKey);
        }
        
        this.cache.store.set(cacheKey, value);
        this.cache.timestamps.set(cacheKey, Date.now());
    },
    
    // Limpiar caché
    cleanCache: function() {
        const now = Date.now();
        
        for (const [key, timestamp] of this.cache.timestamps.entries()) {
            if (now - timestamp > this.cache.ttl) {
                this.cache.store.delete(key);
                this.cache.timestamps.delete(key);
            }
        }
    },
    
    // Iniciar monitoreo
    startMonitoring: function() {
        setInterval(() => {
            this.collectMetrics();
        }, this.monitoring.metricsInterval);
    },
    
    // Recopilar métricas
    collectMetrics: function() {
        if (!this.poolInstance) return;
        
        const metrics = {
            totalCount: this.poolInstance.totalCount,
            idleCount: this.poolInstance.idleCount,
            waitingCount: this.poolInstance.waitingCount,
            timestamp: new Date().toISOString()
        };
        
        console.log('Métricas del pool:', metrics);
        
        // Enviar métricas a sistema de monitoreo si está configurado
        if (window.Justice2 && window.Justice2.config.logging.remote) {
            this.sendMetrics(metrics);
        }
    },
    
    // Enviar métricas
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
    
    // Obtener estado de la conexión
    getConnectionState: function() {
        return {
            ...this.state,
            poolMetrics: this.poolInstance ? {
                totalCount: this.poolInstance.totalCount,
                idleCount: this.poolInstance.idleCount,
                waitingCount: this.poolInstance.waitingCount
            } : null
        };
    },
    
    // Verificar conexión
    checkConnection: async function() {
        try {
            await this.query('SELECT 1');
            return true;
        } catch (error) {
            console.error('Error verificando conexión:', error);
            return false;
        }
    },
    
    // Reconnectar
    reconnect: async function() {
        if (this.state.connectionAttempts >= this.state.maxConnectionAttempts) {
            throw new Error('Máximo número de intentos de reconexión alcanzado');
        }
        
        this.state.connectionAttempts++;
        this.state.connecting = true;
        
        try {
            // Cerrar pool existente
            if (this.poolInstance) {
                await this.poolInstance.end();
            }
            
            // Reinicializar
            await this.init();
            
            this.state.connectionAttempts = 0;
            this.state.connecting = false;
            
        } catch (error) {
            this.state.connecting = false;
            throw error;
        }
    },
    
    // Cerrar conexión
    close: async function() {
        if (this.poolInstance) {
            await this.poolInstance.end();
            this.poolInstance = null;
        }
        
        this.state.connected = false;
        console.log('Conexión a base de datos cerrada');
    },
    
    // Utilidades para consultas específicas
    users: {
        // Obtener usuario por ID
        getById: async function(id) {
            const cacheKey = `user_${id}`;
            let user = Justice2Database.getFromCache(cacheKey);
            
            if (!user) {
                const result = await Justice2Database.query(
                    'SELECT * FROM ' + Justice2Database.tables.users + ' WHERE id = $1',
                    [id]
                );
                user = result.rows[0];
                Justice2Database.setCache(cacheKey, user);
            }
            
            return user;
        },
        
        // Obtener usuario por email
        getByEmail: async function(email) {
            const result = await Justice2Database.query(
                'SELECT * FROM ' + Justice2Database.tables.users + ' WHERE email = $1',
                [email]
            );
            return result.rows[0];
        },
        
        // Crear usuario
        create: async function(userData) {
            const result = await Justice2Database.query(
                'INSERT INTO ' + Justice2Database.tables.users + ' (name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
                [userData.name, userData.email, userData.passwordHash, userData.role]
            );
            return result.rows[0];
        }
    },
    
    cases: {
        // Obtener casos del usuario
        getByUser: async function(userId, limit = 50, offset = 0) {
            const result = await Justice2Database.query(
                'SELECT * FROM ' + Justice2Database.tables.cases + ' WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
                [userId, limit, offset]
            );
            return result.rows;
        },
        
        // Crear caso
        create: async function(caseData) {
            const result = await Justice2Database.query(
                'INSERT INTO ' + Justice2Database.tables.cases + ' (user_id, title, description, status, priority, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
                [caseData.userId, caseData.title, caseData.description, caseData.status, caseData.priority]
            );
            return result.rows[0];
        }
    },
    
    documents: {
        // Obtener documentos del usuario
        getByUser: async function(userId, limit = 50, offset = 0) {
            const result = await Justice2Database.query(
                'SELECT * FROM ' + Justice2Database.tables.documents + ' WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
                [userId, limit, offset]
            );
            return result.rows;
        },
        
        // Crear documento
        create: async function(documentData) {
            const result = await Justice2Database.query(
                'INSERT INTO ' + Justice2Database.tables.documents + ' (user_id, filename, file_path, file_size, mime_type, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
                [documentData.userId, documentData.filename, documentData.filePath, documentData.fileSize, documentData.mimeType]
            );
            return result.rows[0];
        }
    }
};

// Exportar para uso global
window.Justice2Database = Justice2Database;