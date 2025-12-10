/**
 * Justice 2 Multi-Level Cache
 * Implementación de caché multinivel con diferentes estrategias por nivel
 * Niveles: L1 (memoria), L2 (localStorage), L3 (IndexedDB)
 */

const MultiLevelCache = {
    // Configuración
    config: {
        levels: {
            l1: {
                type: 'memory',
                maxSize: 100, // Número máximo de entradas
                ttl: 300000, // 5 minutos
                strategy: 'lru' // lru, lfu, fifo
            },
            l2: {
                type: 'localStorage',
                maxSize: 5 * 1024 * 1024, // 5MB
                ttl: 3600000, // 1 hora
                enableCompression: true,
                compressionThreshold: 1024 // 1KB
            },
            l3: {
                type: 'indexedDB',
                maxSize: 50 * 1024 * 1024, // 50MB
                ttl: 86400000, // 24 horas
                enableCompression: true,
                dbName: 'Justice2Cache',
                version: 1,
                storeName: 'cache'
            }
        },
        enableMetrics: true,
        enableLogging: true,
        enablePromotion: true, // Promover datos entre niveles
        enableDemotion: true, // Degradar datos entre niveles
        promotionThreshold: 3, // Accesos para promover
        demotionThreshold: 1, // Accesos para degradar
        syncInterval: 60000, // 1 minuto para sincronización
        enableBackgroundSync: true
    },

    // Estado
    state: {
        l1Cache: null, // Caché de memoria
        l2Cache: null, // Caché localStorage
        l3Cache: null, // Caché IndexedDB
        accessCounts: new Map(), // Contadores de acceso por clave
        lastAccess: new Map(), // Último acceso por clave
        statistics: {
            l1: { hits: 0, misses: 0, sets: 0, evictions: 0 },
            l2: { hits: 0, misses: 0, sets: 0, evictions: 0 },
            l3: { hits: 0, misses: 0, sets: 0, evictions: 0 },
            total: { hits: 0, misses: 0, promotions: 0, demotions: 0 },
            hitRate: 0
        },
        syncTimer: null,
        isInitialized: false
    },

    // Inicialización
    init: async function(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        
        try {
            // Inicializar niveles de caché
            await this.initializeLevels();
            
            // Iniciar sincronización en segundo plano
            if (this.config.enableBackgroundSync) {
                this.startSyncTimer();
            }
            
            this.state.isInitialized = true;
            this.log('Multi-Level Cache inicializado correctamente');
            
        } catch (error) {
            this.log('Error inicializando Multi-Level Cache:', error);
        }
    },

    // Inicializar niveles de caché
    initializeLevels: async function() {
        // Inicializar L1 (memoria)
        this.state.l1Cache = this.createMemoryCache(this.config.levels.l1);
        
        // Inicializar L2 (localStorage)
        this.state.l2Cache = this.createLocalStorageCache(this.config.levels.l2);
        
        // Inicializar L3 (IndexedDB)
        this.state.l3Cache = await this.createIndexedDBCache(this.config.levels.l3);
    },

    // Crear caché de memoria (L1)
    createMemoryCache: function(config) {
        return {
            cache: new Map(),
            accessOrder: [],
            
            get: function(key) {
                if (!this.cache.has(key)) {
                    return null;
                }
                
                const entry = this.cache.get(key);
                
                // Verificar TTL
                if (entry.expiresAt && Date.now() > entry.expiresAt) {
                    this.delete(key);
                    return null;
                }
                
                // Mover al final para LRU
                this.moveToEnd(key);
                
                return entry.value;
            },
            
            set: function(key, value, ttl = config.ttl) {
                // Verificar límite de tamaño
                if (this.cache.size >= config.maxSize && !this.cache.has(key)) {
                    this.evictLRU();
                }
                
                const entry = {
                    value,
                    timestamp: Date.now(),
                    expiresAt: ttl > 0 ? Date.now() + ttl : null
                };
                
                this.cache.set(key, entry);
                this.moveToEnd(key);
                
                return true;
            },
            
            delete: function(key) {
                const deleted = this.cache.delete(key);
                const index = this.accessOrder.indexOf(key);
                if (index > -1) {
                    this.accessOrder.splice(index, 1);
                }
                return deleted;
            },
            
            has: function(key) {
                if (!this.cache.has(key)) {
                    return false;
                }
                
                const entry = this.cache.get(key);
                if (entry.expiresAt && Date.now() > entry.expiresAt) {
                    this.delete(key);
                    return false;
                }
                
                return true;
            },
            
            clear: function() {
                this.cache.clear();
                this.accessOrder = [];
            },
            
            moveToEnd: function(key) {
                const index = this.accessOrder.indexOf(key);
                if (index > -1) {
                    this.accessOrder.splice(index, 1);
                    this.accessOrder.push(key);
                }
            },
            
            evictLRU: function() {
                if (this.accessOrder.length === 0) {
                    return;
                }
                
                const lruKey = this.accessOrder[0];
                this.delete(lruKey);
            },
            
            size: function() {
                return this.cache.size;
            },
            
            keys: function() {
                return [...this.accessOrder];
            }
        };
    },

    // Crear caché localStorage (L2)
    createLocalStorageCache: function(config) {
        return {
            storageKey: 'justice2_l2_cache',
            
            get: function(key) {
                try {
                    const data = localStorage.getItem(this.storageKey);
                    if (!data) {
                        return null;
                    }
                    
                    const cacheData = JSON.parse(data);
                    const entry = cacheData[key];
                    
                    if (!entry) {
                        return null;
                    }
                    
                    // Verificar TTL
                    if (entry.expiresAt && Date.now() > entry.expiresAt) {
                        this.delete(key);
                        return null;
                    }
                    
                    return entry.value;
                    
                } catch (error) {
                    console.error('Error en L2 get:', error);
                    return null;
                }
            },
            
            set: function(key, value, ttl = config.ttl) {
                try {
                    const data = localStorage.getItem(this.storageKey);
                    const cacheData = data ? JSON.parse(data) : {};
                    
                    const entry = {
                        value,
                        timestamp: Date.now(),
                        expiresAt: ttl > 0 ? Date.now() + ttl : null
                    };
                    
                    cacheData[key] = entry;
                    
                    // Verificar límite de tamaño
                    const serializedData = JSON.stringify(cacheData);
                    if (serializedData.length > config.maxSize) {
                        this.evictOldest(cacheData);
                    }
                    
                    localStorage.setItem(this.storageKey, JSON.stringify(cacheData));
                    return true;
                    
                } catch (error) {
                    console.error('Error en L2 set:', error);
                    return false;
                }
            },
            
            delete: function(key) {
                try {
                    const data = localStorage.getItem(this.storageKey);
                    if (!data) {
                        return false;
                    }
                    
                    const cacheData = JSON.parse(data);
                    if (!cacheData[key]) {
                        return false;
                    }
                    
                    delete cacheData[key];
                    
                    if (Object.keys(cacheData).length === 0) {
                        localStorage.removeItem(this.storageKey);
                    } else {
                        localStorage.setItem(this.storageKey, JSON.stringify(cacheData));
                    }
                    
                    return true;
                    
                } catch (error) {
                    console.error('Error en L2 delete:', error);
                    return false;
                }
            },
            
            has: function(key) {
                const value = this.get(key);
                return value !== null;
            },
            
            clear: function() {
                try {
                    localStorage.removeItem(this.storageKey);
                    return true;
                } catch (error) {
                    console.error('Error en L2 clear:', error);
                    return false;
                }
            },
            
            evictOldest: function(cacheData) {
                let oldestKey = null;
                let oldestTimestamp = Date.now();
                
                for (const [key, entry] of Object.entries(cacheData)) {
                    if (entry.timestamp < oldestTimestamp) {
                        oldestTimestamp = entry.timestamp;
                        oldestKey = key;
                    }
                }
                
                if (oldestKey) {
                    delete cacheData[oldestKey];
                }
            }
        };
    },

    // Crear caché IndexedDB (L3)
    createIndexedDBCache: async function(config) {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB no soportado'));
                return;
            }
            
            const request = indexedDB.open(config.dbName, config.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                
                resolve({
                    db,
                    storeName: config.storeName,
                    
                    get: async function(key) {
                        return new Promise((resolve, reject) => {
                            const transaction = db.transaction([this.storeName], 'readonly');
                            const store = transaction.objectStore(this.storeName);
                            const request = store.get(key);
                            
                            request.onerror = () => reject(request.error);
                            request.onsuccess = () => {
                                const result = request.result;
                                
                                if (!result) {
                                    resolve(null);
                                    return;
                                }
                                
                                // Verificar TTL
                                if (result.expiresAt && Date.now() > result.expiresAt) {
                                    this.delete(key);
                                    resolve(null);
                                    return;
                                }
                                
                                resolve(result.value);
                            };
                        });
                    },
                    
                    set: async function(key, value, ttl = config.ttl) {
                        return new Promise((resolve, reject) => {
                            const transaction = db.transaction([this.storeName], 'readwrite');
                            const store = transaction.objectStore(this.storeName);
                            
                            const entry = {
                                key,
                                value,
                                timestamp: Date.now(),
                                expiresAt: ttl > 0 ? Date.now() + ttl : null
                            };
                            
                            const request = store.put(entry);
                            
                            request.onerror = () => reject(request.error);
                            request.onsuccess = () => resolve(true);
                        });
                    },
                    
                    delete: async function(key) {
                        return new Promise((resolve, reject) => {
                            const transaction = db.transaction([this.storeName], 'readwrite');
                            const store = transaction.objectStore(this.storeName);
                            const request = store.delete(key);
                            
                            request.onerror = () => reject(request.error);
                            request.onsuccess = () => resolve(true);
                        });
                    },
                    
                    has: async function(key) {
                        const value = await this.get(key);
                        return value !== null;
                    },
                    
                    clear: async function() {
                        return new Promise((resolve, reject) => {
                            const transaction = db.transaction([this.storeName], 'readwrite');
                            const store = transaction.objectStore(this.storeName);
                            const request = store.clear();
                            
                            request.onerror = () => reject(request.error);
                            request.onsuccess = () => resolve(true);
                        });
                    }
                });
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(config.storeName)) {
                    const store = db.createObjectStore(config.storeName, { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('expiresAt', 'expiresAt', { unique: false });
                }
            };
        });
    },

    // Obtener valor (búsqueda multinivel)
    get: async function(key) {
        if (!this.state.isInitialized) {
            await this.init();
        }
        
        const startTime = performance.now();
        
        try {
            // Actualizar contador de acceso
            this.updateAccessCount(key);
            
            // Nivel 1: Memoria
            let value = this.state.l1Cache.get(key);
            if (value !== null) {
                this.state.statistics.l1.hits++;
                this.state.statistics.total.hits++;
                this.updateHitRate();
                
                const endTime = performance.now();
                this.log(`Multi-Level Cache L1 HIT: ${key} (${(endTime - startTime).toFixed(2)}ms)`);
                
                return value;
            }
            this.state.statistics.l1.misses++;
            
            // Nivel 2: localStorage
            value = this.state.l2Cache.get(key);
            if (value !== null) {
                this.state.statistics.l2.hits++;
                this.state.statistics.total.hits++;
                this.updateHitRate();
                
                // Promover a L1 si cumple criterios
                if (this.config.enablePromotion && this.shouldPromote(key)) {
                    this.state.l1Cache.set(key, value, this.config.levels.l1.ttl);
                    this.state.statistics.total.promotions++;
                    this.log(`Promovido a L1: ${key}`);
                }
                
                const endTime = performance.now();
                this.log(`Multi-Level Cache L2 HIT: ${key} (${(endTime - startTime).toFixed(2)}ms)`);
                
                return value;
            }
            this.state.statistics.l2.misses++;
            
            // Nivel 3: IndexedDB
            value = await this.state.l3Cache.get(key);
            if (value !== null) {
                this.state.statistics.l3.hits++;
                this.state.statistics.total.hits++;
                this.updateHitRate();
                
                // Promover a niveles superiores si cumple criterios
                if (this.config.enablePromotion && this.shouldPromote(key)) {
                    this.state.l2Cache.set(key, value, this.config.levels.l2.ttl);
                    this.state.l1Cache.set(key, value, this.config.levels.l1.ttl);
                    this.state.statistics.total.promotions++;
                    this.log(`Promovido a L1 y L2: ${key}`);
                }
                
                const endTime = performance.now();
                this.log(`Multi-Level Cache L3 HIT: ${key} (${(endTime - startTime).toFixed(2)}ms)`);
                
                return value;
            }
            this.state.statistics.l3.misses++;
            
            // Miss en todos los niveles
            this.state.statistics.total.misses++;
            this.updateHitRate();
            
            const endTime = performance.now();
            this.log(`Multi-Level Cache MISS: ${key} (${(endTime - startTime).toFixed(2)}ms)`);
            
            return null;
            
        } catch (error) {
            this.log(`Error obteniendo clave ${key}:`, error);
            this.state.statistics.total.misses++;
            this.updateHitRate();
            return null;
        }
    },

    // Establecer valor
    set: async function(key, value, options = {}) {
        if (!this.state.isInitialized) {
            await this.init();
        }
        
        const startTime = performance.now();
        
        try {
            const ttl = options.ttl || this.config.levels.l1.ttl;
            
            // Siempre almacenar en L1
            this.state.l1Cache.set(key, value, ttl);
            this.state.statistics.l1.sets++;
            
            // Almacenar en L2 si está habilitado
            if (options.l2 !== false) {
                this.state.l2Cache.set(key, value, this.config.levels.l2.ttl);
                this.state.statistics.l2.sets++;
            }
            
            // Almacenar en L3 si está habilitado
            if (options.l3 !== false) {
                await this.state.l3Cache.set(key, value, this.config.levels.l3.ttl);
                this.state.statistics.l3.sets++;
            }
            
            // Actualizar contador de acceso
            this.updateAccessCount(key);
            
            const endTime = performance.now();
            this.log(`Multi-Level Cache SET: ${key} (${(endTime - startTime).toFixed(2)}ms)`);
            
            return true;
            
        } catch (error) {
            this.log(`Error estableciendo clave ${key}:`, error);
            return false;
        }
    },

    // Eliminar clave
    delete: async function(key) {
        if (!this.state.isInitialized) {
            await this.init();
        }
        
        try {
            // Eliminar de todos los niveles
            const l1Deleted = this.state.l1Cache.delete(key);
            const l2Deleted = this.state.l2Cache.delete(key);
            const l3Deleted = await this.state.l3Cache.delete(key);
            
            // Limpiar contadores
            this.state.accessCounts.delete(key);
            this.state.lastAccess.delete(key);
            
            const deleted = l1Deleted || l2Deleted || l3Deleted;
            
            if (deleted) {
                this.log(`Multi-Level Cache DELETE: ${key}`);
            }
            
            return deleted;
            
        } catch (error) {
            this.log(`Error eliminando clave ${key}:`, error);
            return false;
        }
    },

    // Verificar si existe
    has: async function(key) {
        const value = await this.get(key);
        return value !== null;
    },

    // Limpiar todos los niveles
    clear: async function() {
        if (!this.state.isInitialized) {
            await this.init();
        }
        
        try {
            this.state.l1Cache.clear();
            this.state.l2Cache.clear();
            await this.state.l3Cache.clear();
            
            // Limpiar contadores
            this.state.accessCounts.clear();
            this.state.lastAccess.clear();
            
            this.log('Multi-Level Cache CLEAR: todos los niveles');
            return true;
            
        } catch (error) {
            this.log('Error limpiando Multi-Level Cache:', error);
            return false;
        }
    },

    // Actualizar contador de acceso
    updateAccessCount: function(key) {
        const currentCount = this.state.accessCounts.get(key) || 0;
        this.state.accessCounts.set(key, currentCount + 1);
        this.state.lastAccess.set(key, Date.now());
    },

    // Verificar si debe promover a nivel superior
    shouldPromote: function(key) {
        const accessCount = this.state.accessCounts.get(key) || 0;
        return accessCount >= this.config.promotionThreshold;
    },

    // Verificar si debe degradar a nivel inferior
    shouldDemote: function(key) {
        const accessCount = this.state.accessCounts.get(key) || 0;
        return accessCount <= this.config.demotionThreshold;
    },

    // Sincronizar niveles
    syncLevels: async function() {
        if (!this.state.isInitialized) {
            return;
        }
        
        try {
            // Degradar entradas poco accedidas
            if (this.config.enableDemotion) {
                await this.demoteEntries();
            }
            
            // Limpiar entradas expiradas
            await this.cleanupExpiredEntries();
            
            this.log('Multi-Level Cache sincronización completada');
            
        } catch (error) {
            this.log('Error en sincronización de niveles:', error);
        }
    },

    // Degradar entradas a niveles inferiores
    demoteEntries: async function() {
        // Revisar entradas en L1 para degradar
        const l1Keys = this.state.l1Cache.keys();
        
        for (const key of l1Keys) {
            if (this.shouldDemote(key)) {
                const value = this.state.l1Cache.get(key);
                if (value !== null) {
                    // Mover a L2
                    this.state.l2Cache.set(key, value, this.config.levels.l2.ttl);
                    this.state.l1Cache.delete(key);
                    this.state.statistics.total.demotions++;
                    this.log(`Degradado de L1 a L2: ${key}`);
                }
            }
        }
    },

    // Limpiar entradas expiradas
    cleanupExpiredEntries: async function() {
        let cleanedCount = 0;
        
        // Limpiar L1 (ya se hace automáticamente en get)
        // Limpiar L2 (ya se hace automáticamente en get)
        
        // Limpiar L3
        // Nota: IndexedDB no tiene una forma eficiente de limpiar todas las entradas expiradas
        // Esto requeriría una implementación más compleja con índices
        
        if (cleanedCount > 0) {
            this.log(`Multi-Level Cache cleanup: ${cleanedCount} entradas expiradas eliminadas`);
        }
    },

    // Actualizar hit rate
    updateHitRate: function() {
        const total = this.state.statistics.total.hits + this.state.statistics.total.misses;
        this.state.statistics.hitRate = total > 0 ? (this.state.statistics.total.hits / total) * 100 : 0;
    },

    // Obtener estadísticas
    getStatistics: async function() {
        return {
            ...this.state.statistics,
            l1: {
                ...this.state.statistics.l1,
                size: this.state.l1Cache.size()
            },
            l2: {
                ...this.state.statistics.l2,
                size: this.getL2Size()
            },
            l3: {
                ...this.state.statistics.l3,
                size: await this.getL3Size()
            },
            accessCounts: Object.fromEntries(this.state.accessCounts),
            isInitialized: this.state.isInitialized
        };
    },

    // Obtener tamaño de L2
    getL2Size: function() {
        try {
            const data = localStorage.getItem(this.state.l2Cache.storageKey);
            if (!data) {
                return 0;
            }
            
            const cacheData = JSON.parse(data);
            return Object.keys(cacheData).length;
            
        } catch (error) {
            return 0;
        }
    },

    // Obtener tamaño de L3
    getL3Size: async function() {
        try {
            if (!this.state.l3Cache || !this.state.l3Cache.db) {
                return 0;
            }
            
            return new Promise((resolve, reject) => {
                const transaction = this.state.l3Cache.db.transaction([this.state.l3Cache.storeName], 'readonly');
                const store = transaction.objectStore(this.state.l3Cache.storeName);
                const request = store.count();
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            });
            
        } catch (error) {
            return 0;
        }
    },

    // Iniciar timer de sincronización
    startSyncTimer: function() {
        if (this.state.syncTimer) {
            clearInterval(this.state.syncTimer);
        }
        
        this.state.syncTimer = setInterval(() => {
            this.syncLevels();
        }, this.config.syncInterval);
    },

    // Detener timer de sincronización
    stopSyncTimer: function() {
        if (this.state.syncTimer) {
            clearInterval(this.state.syncTimer);
            this.state.syncTimer = null;
        }
    },

    // Reiniciar estadísticas
    resetStatistics: function() {
        this.state.statistics = {
            l1: { hits: 0, misses: 0, sets: 0, evictions: 0 },
            l2: { hits: 0, misses: 0, sets: 0, evictions: 0 },
            l3: { hits: 0, misses: 0, sets: 0, evictions: 0 },
            total: { hits: 0, misses: 0, promotions: 0, demotions: 0 },
            hitRate: 0
        };
        
        this.state.accessCounts.clear();
        this.state.lastAccess.clear();
        
        this.log('Multi-Level Cache estadísticas reiniciadas');
    },

    // Exportar estado
    exportState: async function() {
        return {
            config: this.config,
            statistics: await this.getStatistics(),
            accessCounts: Object.fromEntries(this.state.accessCounts),
            isInitialized: this.state.isInitialized,
            timestamp: new Date().toISOString()
        };
    },

    // Logging
    log: function(message, data = null) {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [MultiLevelCache] ${message}`;
            
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
    window.MultiLevelCache = MultiLevelCache;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiLevelCache;
}