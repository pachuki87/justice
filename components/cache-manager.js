/**
 * Justice 2 Cache Manager
 * Orquestador central de todos los tipos de caché del sistema
 * Proporciona una interfaz unificada y estrategias inteligentes
 */

const CacheManager = {
    // Configuración
    config: {
        defaultStrategy: 'multi-level', // promise, lru, ttl, persistent, multi-level
        enableMetrics: true,
        enableLogging: true,
        enableTelemetry: true,
        enableAutoOptimization: true,
        optimizationInterval: 300000, // 5 minutos
        enableHealthCheck: true,
        healthCheckInterval: 60000, // 1 minuto
        enableWarmup: true,
        warmupData: [],
        strategies: {
            'promise': {
                component: 'PromiseCache',
                config: {
                    defaultTTL: 300000,
                    maxCacheSize: 1000,
                    enableCompression: true,
                    enableSmartEviction: true
                }
            },
            'lru': {
                component: 'LRUCache',
                config: {
                    maxSize: 100,
                    defaultTTL: 300000
                }
            },
            'ttl': {
                component: 'TTLCache',
                config: {
                    maxSize: 500,
                    defaultTTL: 300000,
                    enableAutoRefresh: true
                }
            },
            'persistent': {
                component: 'PersistentCache',
                config: {
                    defaultTTL: 86400000,
                    maxSize: 10 * 1024 * 1024,
                    enableCompression: true
                }
            },
            'multi-level': {
                component: 'MultiLevelCache',
                config: {
                    levels: {
                        l1: { maxSize: 100, ttl: 300000 },
                        l2: { maxSize: 5 * 1024 * 1024, ttl: 3600000 },
                        l3: { maxSize: 50 * 1024 * 1024, ttl: 86400000 }
                    }
                }
            }
        }
    },

    // Estado
    state: {
        caches: new Map(), // Instancias de caché por estrategia
        strategies: new Map(), // Estrategias por tipo de dato
        statistics: {
            global: {
                totalHits: 0,
                totalMisses: 0,
                totalSets: 0,
                totalDeletes: 0,
                globalHitRate: 0,
                activeStrategies: 0,
                totalMemoryUsage: 0
            },
            byStrategy: {},
            healthChecks: new Map() // Resultados de health checks por estrategia
        },
        optimizationTimer: null,
        healthCheckTimer: null,
        isInitialized: false
    },

    // Inicialización
    init: async function(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        
        try {
            // Inicializar todas las estrategias de caché
            await this.initializeStrategies();
            
            // Configurar estrategias por tipo de dato
            this.setupDataStrategies();
            
            // Iniciar optimización automática
            if (this.config.enableAutoOptimization) {
                this.startOptimizationTimer();
            }
            
            // Iniciar health checks
            if (this.config.enableHealthCheck) {
                this.startHealthCheckTimer();
            }
            
            // Precalentar caché si está habilitado
            if (this.config.enableWarmup && this.config.warmupData.length > 0) {
                await this.warmupCache();
            }
            
            this.state.isInitialized = true;
            this.log('Cache Manager inicializado correctamente');
            
        } catch (error) {
            this.log('Error inicializando Cache Manager:', error);
        }
    },

    // Inicializar estrategias de caché
    initializeStrategies: async function() {
        for (const [strategyName, strategyConfig] of Object.entries(this.config.strategies)) {
            try {
                // Obtener componente de caché
                const CacheComponent = this.getCacheComponent(strategyConfig.component);
                
                if (!CacheComponent) {
                    this.log(`Componente de caché no encontrado: ${strategyConfig.component}`);
                    continue;
                }
                
                // Inicializar caché
                const cacheInstance = Object.create(CacheComponent);
                await cacheInstance.init(strategyConfig.config);
                
                // Almacenar instancia
                this.state.caches.set(strategyName, cacheInstance);
                
                // Inicializar estadísticas
                this.state.statistics.byStrategy[strategyName] = {
                    hits: 0,
                    misses: 0,
                    sets: 0,
                    deletes: 0,
                    hitRate: 0,
                    memoryUsage: 0,
                    lastHealthCheck: null,
                    healthStatus: 'unknown'
                };
                
                this.log(`Estrategia de caché inicializada: ${strategyName}`);
                
            } catch (error) {
                this.log(`Error inicializando estrategia ${strategyName}:`, error);
            }
        }
        
        this.state.statistics.global.activeStrategies = this.state.caches.size;
    },

    // Obtener componente de caché
    getCacheComponent: function(componentName) {
        if (typeof window !== 'undefined') {
            return window[componentName];
        } else if (typeof module !== 'undefined') {
            try {
                return require(`./${componentName.toLowerCase().replace('cache', '-cache')}`);
            } catch (error) {
                return null;
            }
        }
        return null;
    },

    // Configurar estrategias por tipo de dato
    setupDataStrategies: function() {
        // Configurar estrategias predeterminadas por tipo de dato
        this.state.strategies.set('user', 'persistent'); // Datos de usuario persisten
        this.state.strategies.set('session', 'ttl'); // Datos de sesión con TTL
        this.state.strategies.set('api', 'promise'); // Respuestas API con promesas
        this.state.strategies.set('config', 'persistent'); // Configuración persistente
        this.state.strategies.set('temp', 'lru'); // Datos temporales con LRU
        this.state.strategies.set('critical', 'multi-level'); // Datos críticos multinivel
        this.state.strategies.set('default', this.config.defaultStrategy);
    },

    // Obtener estrategia para una clave
    getStrategyForData: function(key) {
        // Extraer tipo de dato de la clave (formato: tipo:subtipo:id)
        const parts = key.split(':');
        const dataType = parts[0] || 'default';
        
        return this.state.strategies.get(dataType) || this.config.defaultStrategy;
    },

    // Obtener valor (con estrategia automática)
    get: async function(key) {
        if (!this.state.isInitialized) {
            await this.init();
        }
        
        const startTime = performance.now();
        
        try {
            // Determinar estrategia
            const strategy = this.getStrategyForData(key);
            const cache = this.state.caches.get(strategy);
            
            if (!cache) {
                this.log(`Estrategia de caché no encontrada: ${strategy}`);
                this.state.statistics.global.totalMisses++;
                this.updateGlobalHitRate();
                return null;
            }
            
            // Obtener valor de la caché específica
            let value;
            if (typeof cache.get === 'function') {
                if (cache.constructor.name === 'PromiseCache' || 
                    cache.constructor.name === 'MultiLevelCache') {
                    value = await cache.get(key);
                } else {
                    value = cache.get(key);
                }
            }
            
            // Actualizar estadísticas
            if (value !== null) {
                this.state.statistics.global.totalHits++;
                this.state.statistics.byStrategy[strategy].hits++;
                this.log(`Cache Manager HIT: ${key} (estrategia: ${strategy})`);
            } else {
                this.state.statistics.global.totalMisses++;
                this.state.statistics.byStrategy[strategy].misses++;
                this.log(`Cache Manager MISS: ${key} (estrategia: ${strategy})`);
            }
            
            this.updateGlobalHitRate();
            this.updateStrategyHitRate(strategy);
            
            const endTime = performance.now();
            this.log(`Cache Manager GET: ${key} (${(endTime - startTime).toFixed(2)}ms, estrategia: ${strategy})`);
            
            return value;
            
        } catch (error) {
            this.log(`Error obteniendo clave ${key}:`, error);
            this.state.statistics.global.totalMisses++;
            this.updateGlobalHitRate();
            return null;
        }
    },

    // Establecer valor (con estrategia automática)
    set: async function(key, value, options = {}) {
        if (!this.state.isInitialized) {
            await this.init();
        }
        
        const startTime = performance.now();
        
        try {
            // Determinar estrategia
            const strategy = options.strategy || this.getStrategyForData(key);
            const cache = this.state.caches.get(strategy);
            
            if (!cache) {
                this.log(`Estrategia de caché no encontrada: ${strategy}`);
                return false;
            }
            
            // Establecer valor en la caché específica
            let result;
            if (typeof cache.set === 'function') {
                if (cache.constructor.name === 'PromiseCache' || 
                    cache.constructor.name === 'MultiLevelCache' ||
                    cache.constructor.name === 'PersistentCache') {
                    result = await cache.set(key, value, options);
                } else {
                    result = cache.set(key, value, options);
                }
            }
            
            // Actualizar estadísticas
            if (result) {
                this.state.statistics.global.totalSets++;
                this.state.statistics.byStrategy[strategy].sets++;
                this.log(`Cache Manager SET: ${key} (estrategia: ${strategy})`);
            }
            
            const endTime = performance.now();
            this.log(`Cache Manager SET operation: ${key} (${(endTime - startTime).toFixed(2)}ms, estrategia: ${strategy})`);
            
            return result;
            
        } catch (error) {
            this.log(`Error estableciendo clave ${key}:`, error);
            return false;
        }
    },

    // Eliminar clave
    delete: async function(key, options = {}) {
        if (!this.state.isInitialized) {
            await this.init();
        }
        
        try {
            // Determinar estrategia
            const strategy = options.strategy || this.getStrategyForData(key);
            const cache = this.state.caches.get(strategy);
            
            if (!cache) {
                this.log(`Estrategia de caché no encontrada: ${strategy}`);
                return false;
            }
            
            // Eliminar de la caché específica
            let result;
            if (typeof cache.delete === 'function') {
                if (cache.constructor.name === 'PromiseCache' || 
                    cache.constructor.name === 'MultiLevelCache' ||
                    cache.constructor.name === 'PersistentCache') {
                    result = await cache.delete(key);
                } else {
                    result = cache.delete(key);
                }
            }
            
            // Actualizar estadísticas
            if (result) {
                this.state.statistics.global.totalDeletes++;
                this.state.statistics.byStrategy[strategy].deletes++;
                this.log(`Cache Manager DELETE: ${key} (estrategia: ${strategy})`);
            }
            
            return result;
            
        } catch (error) {
            this.log(`Error eliminando clave ${key}:`, error);
            return false;
        }
    },

    // Verificar si existe
    has: async function(key, options = {}) {
        const value = await this.get(key, options);
        return value !== null;
    },

    // Limpiar todas las cachés
    clear: async function() {
        if (!this.state.isInitialized) {
            await this.init();
        }
        
        try {
            const clearPromises = [];
            
            for (const [strategyName, cache] of this.state.caches.entries()) {
                if (typeof cache.clear === 'function') {
                    if (cache.constructor.name === 'PromiseCache' || 
                        cache.constructor.name === 'MultiLevelCache' ||
                        cache.constructor.name === 'PersistentCache') {
                        clearPromises.push(cache.clear());
                    } else {
                        clearPromises.push(Promise.resolve(cache.clear()));
                    }
                }
            }
            
            await Promise.allSettled(clearPromises);
            
            this.log('Cache Manager CLEAR: todas las estrategias');
            return true;
            
        } catch (error) {
            this.log('Error limpiando cachés:', error);
            return false;
        }
    },

    // Obtener o establecer (get-or-set pattern)
    getOrSet: async function(key, promiseFunction, options = {}) {
        // Verificar si ya existe en caché
        const cachedValue = await this.get(key);
        if (cachedValue !== null) {
            return cachedValue;
        }
        
        try {
            // Ejecutar función para obtener valor
            const value = await promiseFunction();
            
            // Almacenar en caché
            await this.set(key, value, options);
            
            return value;
            
        } catch (error) {
            this.log(`Error en getOrSet para clave ${key}:`, error);
            throw error;
        }
    },

    // Precalentar caché
    warmupCache: async function() {
        this.log('Iniciando precalentamiento de caché');
        
        try {
            const warmupPromises = this.config.warmupData.map(async (item) => {
                try {
                    const { key, dataPromise, options = {} } = item;
                    const data = await dataPromise();
                    await this.set(key, data, { ...options, metadata: { ...options.metadata, warmedUp: true } });
                    this.log(`Precalentado: ${key}`);
                } catch (error) {
                    this.log(`Error precalentando ${item.key}:`, error);
                }
            });
            
            await Promise.allSettled(warmupPromises);
            this.log(`Precalentamiento completado: ${this.config.warmupData.length} elementos`);
            
        } catch (error) {
            this.log('Error en precalentamiento de caché:', error);
        }
    },

    // Optimizar cachés automáticamente
    optimizeCaches: async function() {
        this.log('Iniciando optimización automática de cachés');
        
        try {
            for (const [strategyName, cache] of this.state.caches.entries()) {
                try {
                    // Ejecutar optimización específica de cada caché
                    if (typeof cache.optimizeBasedOnPatterns === 'function') {
                        cache.optimizeBasedOnPatterns();
                    }
                    
                    // Limpiar entradas expiradas
                    if (typeof cache.cleanup === 'function') {
                        if (cache.constructor.name === 'PromiseCache' || 
                            cache.constructor.name === 'MultiLevelCache' ||
                            cache.constructor.name === 'PersistentCache') {
                            await cache.cleanup();
                        } else {
                            cache.cleanup();
                        }
                    }
                    
                    this.log(`Optimización completada para estrategia: ${strategyName}`);
                    
                } catch (error) {
                    this.log(`Error optimizando estrategia ${strategyName}:`, error);
                }
            }
            
            // Actualizar uso de memoria
            await this.updateMemoryUsage();
            
            this.log('Optimización automática completada');
            
        } catch (error) {
            this.log('Error en optimización automática:', error);
        }
    },

    // Health check de todas las cachés
    healthCheck: async function() {
        this.log('Iniciando health check de cachés');
        
        try {
            const healthResults = new Map();
            
            for (const [strategyName, cache] of this.state.caches.entries()) {
                try {
                    const startTime = performance.now();
                    
                    // Realizar prueba básica de funcionamiento
                    const testKey = `health_check_${Date.now()}`;
                    const testValue = { test: true, timestamp: Date.now() };
                    
                    // Probar set
                    let setResult = false;
                    if (typeof cache.set === 'function') {
                        if (cache.constructor.name === 'PromiseCache' || 
                            cache.constructor.name === 'MultiLevelCache' ||
                            cache.constructor.name === 'PersistentCache') {
                            setResult = await cache.set(testKey, testValue, { ttl: 10000 });
                        } else {
                            setResult = cache.set(testKey, testValue, { ttl: 10000 });
                        }
                    }
                    
                    // Probar get
                    let getValue = null;
                    if (setResult && typeof cache.get === 'function') {
                        if (cache.constructor.name === 'PromiseCache' || 
                            cache.constructor.name === 'MultiLevelCache' ||
                            cache.constructor.name === 'PersistentCache') {
                            getValue = await cache.get(testKey);
                        } else {
                            getValue = cache.get(testKey);
                        }
                    }
                    
                    // Probar delete
                    if (getValue !== null && typeof cache.delete === 'function') {
                        if (cache.constructor.name === 'PromiseCache' || 
                            cache.constructor.name === 'MultiLevelCache' ||
                            cache.constructor.name === 'PersistentCache') {
                            await cache.delete(testKey);
                        } else {
                            cache.delete(testKey);
                        }
                    }
                    
                    const endTime = performance.now();
                    const responseTime = endTime - startTime;
                    
                    // Evaluar salud
                    const isHealthy = setResult && getValue !== null && 
                                    JSON.stringify(getValue) === JSON.stringify(testValue);
                    
                    const healthResult = {
                        status: isHealthy ? 'healthy' : 'unhealthy',
                        responseTime,
                        lastCheck: new Date().toISOString(),
                        error: isHealthy ? null : 'Basic operations failed'
                    };
                    
                    healthResults.set(strategyName, healthResult);
                    this.state.statistics.healthChecks.set(strategyName, healthResult);
                    
                    // Actualizar estadísticas
                    this.state.statistics.byStrategy[strategyName].lastHealthCheck = healthResult.lastCheck;
                    this.state.statistics.byStrategy[strategyName].healthStatus = healthResult.status;
                    
                    this.log(`Health check ${strategyName}: ${healthResult.status} (${responseTime.toFixed(2)}ms)`);
                    
                } catch (error) {
                    const healthResult = {
                        status: 'error',
                        responseTime: -1,
                        lastCheck: new Date().toISOString(),
                        error: error.message
                    };
                    
                    healthResults.set(strategyName, healthResult);
                    this.state.statistics.healthChecks.set(strategyName, healthResult);
                    
                    this.log(`Health check ${strategyName}: error - ${error.message}`);
                }
            }
            
            return healthResults;
            
        } catch (error) {
            this.log('Error en health check:', error);
            return new Map();
        }
    },

    // Actualizar hit rate global
    updateGlobalHitRate: function() {
        const total = this.state.statistics.global.totalHits + this.state.statistics.global.totalMisses;
        this.state.statistics.global.globalHitRate = total > 0 ? 
            (this.state.statistics.global.totalHits / total) * 100 : 0;
    },

    // Actualizar hit rate por estrategia
    updateStrategyHitRate: function(strategy) {
        const stats = this.state.statistics.byStrategy[strategy];
        if (!stats) return;
        
        const total = stats.hits + stats.misses;
        stats.hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
    },

    // Actualizar uso de memoria
    updateMemoryUsage: async function() {
        let totalMemory = 0;
        
        for (const [strategyName, cache] of this.state.caches.entries()) {
            try {
                let memoryUsage = 0;
                
                if (typeof cache.getStatistics === 'function') {
                    const stats = cache.constructor.name === 'MultiLevelCache' ? 
                        await cache.getStatistics() : cache.getStatistics();
                    
                    memoryUsage = stats.memoryUsage || 0;
                } else if (typeof cache.estimateMemoryUsage === 'function') {
                    memoryUsage = cache.estimateMemoryUsage();
                }
                
                this.state.statistics.byStrategy[strategyName].memoryUsage = memoryUsage;
                totalMemory += memoryUsage;
                
            } catch (error) {
                this.log(`Error obteniendo uso de memoria para ${strategyName}:`, error);
            }
        }
        
        this.state.statistics.global.totalMemoryUsage = totalMemory;
    },

    // Obtener estadísticas completas
    getStatistics: async function() {
        await this.updateMemoryUsage();
        
        return {
            global: this.state.statistics.global,
            byStrategy: this.state.statistics.byStrategy,
            healthChecks: Object.fromEntries(this.state.statistics.healthChecks),
            strategies: Object.fromEntries(this.state.strategies),
            isInitialized: this.state.isInitialized
        };
    },

    // Configurar estrategia para tipo de dato
    setStrategy: function(dataType, strategy) {
        if (!this.state.caches.has(strategy)) {
            this.log(`Estrategia no válida para ${dataType}: ${strategy}`);
            return false;
        }
        
        this.state.strategies.set(dataType, strategy);
        this.log(`Estrategia configurada: ${dataType} -> ${strategy}`);
        return true;
    },

    // Iniciar timer de optimización
    startOptimizationTimer: function() {
        if (this.state.optimizationTimer) {
            clearInterval(this.state.optimizationTimer);
        }
        
        this.state.optimizationTimer = setInterval(() => {
            this.optimizeCaches();
        }, this.config.optimizationInterval);
    },

    // Detener timer de optimización
    stopOptimizationTimer: function() {
        if (this.state.optimizationTimer) {
            clearInterval(this.state.optimizationTimer);
            this.state.optimizationTimer = null;
        }
    },

    // Iniciar timer de health check
    startHealthCheckTimer: function() {
        if (this.state.healthCheckTimer) {
            clearInterval(this.state.healthCheckTimer);
        }
        
        this.state.healthCheckTimer = setInterval(() => {
            this.healthCheck();
        }, this.config.healthCheckInterval);
    },

    // Detener timer de health check
    stopHealthCheckTimer: function() {
        if (this.state.healthCheckTimer) {
            clearInterval(this.state.healthCheckTimer);
            this.state.healthCheckTimer = null;
        }
    },

    // Reiniciar estadísticas
    resetStatistics: function() {
        this.state.statistics = {
            global: {
                totalHits: 0,
                totalMisses: 0,
                totalSets: 0,
                totalDeletes: 0,
                globalHitRate: 0,
                activeStrategies: this.state.caches.size,
                totalMemoryUsage: 0
            },
            byStrategy: {},
            healthChecks: new Map()
        };
        
        // Reinicializar estadísticas por estrategia
        for (const strategyName of this.state.caches.keys()) {
            this.state.statistics.byStrategy[strategyName] = {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                hitRate: 0,
                memoryUsage: 0,
                lastHealthCheck: null,
                healthStatus: 'unknown'
            };
        }
        
        this.log('Cache Manager estadísticas reiniciadas');
    },

    // Exportar estado completo
    exportState: async function() {
        return {
            config: this.config,
            statistics: await this.getStatistics(),
            strategies: Object.fromEntries(this.state.strategies),
            isInitialized: this.state.isInitialized,
            timestamp: new Date().toISOString()
        };
    },

    // Logging
    log: function(message, data = null) {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [CacheManager] ${message}`;
            
            if (data) {
                console.log(logEntry, data);
            } else {
                console.log(logEntry);
            }
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.CacheManager = CacheManager;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheManager;
}