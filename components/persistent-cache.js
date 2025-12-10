/**
 * Justice 2 Persistent Cache
 * Implementación de caché que persiste entre sesiones del navegador
 * Utiliza localStorage como almacenamiento principal con fallback a sessionStorage
 */

const PersistentCache = {
    // Configuración
    config: {
        storageKey: 'justice2_persistent_cache',
        useSessionStorage: false, // false para localStorage, true para sessionStorage
        enableCompression: true,
        compressionThreshold: 1024, // Comprimir si > 1KB
        enableEncryption: false,
        enableMetrics: true,
        enableLogging: true,
        defaultTTL: 86400000, // 24 horas por defecto
        maxSize: 10 * 1024 * 1024, // 10MB límite de almacenamiento
        enableAutoCleanup: true,
        cleanupInterval: 300000 // 5 minutos
    },

    // Estado
    state: {
        cache: new Map(), // Caché en memoria para acceso rápido
        statistics: {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            expirations: 0,
            hitRate: 0,
            totalAccesses: 0,
            storageHits: 0,
            storageMisses: 0,
            compressionSavings: 0
        },
        cleanupTimer: null,
        isLoaded: false
    },

    // Inicialización
    init: function(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        
        // Cargar datos desde almacenamiento persistente
        this.loadFromStorage();
        
        // Iniciar limpieza periódica
        if (this.config.enableAutoCleanup) {
            this.startCleanupTimer();
        }
        
        // Escuchar eventos de almacenamiento para sincronización entre pestañas
        this.setupStorageListener();
        
        this.log('Persistent Cache inicializado');
    },

    // Obtener valor
    get: function(key) {
        const startTime = performance.now();
        
        try {
            // Primero buscar en caché de memoria
            if (this.state.cache.has(key)) {
                const entry = this.state.cache.get(key);
                
                // Verificar si ha expirado
                if (this.isExpired(entry)) {
                    this.delete(key);
                    this.state.statistics.misses++;
                    this.state.statistics.totalAccesses++;
                    this.updateHitRate();
                    return null;
                }
                
                this.state.statistics.hits++;
                this.state.statistics.totalAccesses++;
                this.updateHitRate();
                
                const endTime = performance.now();
                this.log(`Persistent Cache MEMORY HIT: ${key} (${(endTime - startTime).toFixed(2)}ms)`);
                
                return entry.value;
            }
            
            // Si no está en memoria, buscar en almacenamiento persistente
            const storedValue = this.getFromStorage(key);
            if (storedValue !== null) {
                // Cargar en caché de memoria
                this.state.cache.set(key, storedValue);
                
                this.state.statistics.hits++;
                this.state.statistics.storageHits++;
                this.state.statistics.totalAccesses++;
                this.updateHitRate();
                
                const endTime = performance.now();
                this.log(`Persistent Cache STORAGE HIT: ${key} (${(endTime - startTime).toFixed(2)}ms)`);
                
                return storedValue.value;
            }
            
            this.state.statistics.misses++;
            this.state.statistics.storageMisses++;
            this.state.statistics.totalAccesses++;
            this.updateHitRate();
            
            return null;
            
        } catch (error) {
            this.log(`Error obteniendo clave ${key}:`, error);
            this.state.statistics.misses++;
            this.state.statistics.totalAccesses++;
            this.updateHitRate();
            return null;
        }
    },

    // Establecer valor
    set: function(key, value, options = {}) {
        const startTime = performance.now();
        
        try {
            const ttl = options.ttl || this.config.defaultTTL;
            const now = Date.now();
            
            // Crear entrada
            const entry = {
                key,
                value,
                timestamp: now,
                ttl,
                expiresAt: ttl > 0 ? now + ttl : null,
                metadata: options.metadata || {},
                tags: options.tags || []
            };
            
            // Almacenar en caché de memoria
            this.state.cache.set(key, entry);
            
            // Almacenar en almacenamiento persistente
            this.setToStorage(key, entry);
            
            this.state.statistics.sets++;
            
            // Verificar límite de almacenamiento
            this.checkStorageLimit();
            
            const endTime = performance.now();
            this.log(`Persistent Cache SET: ${key} (TTL: ${ttl}ms, ${(endTime - startTime).toFixed(2)}ms)`);
            
            return true;
            
        } catch (error) {
            this.log(`Error estableciendo clave ${key}:`, error);
            return false;
        }
    },

    // Eliminar clave
    delete: function(key) {
        try {
            // Eliminar de caché de memoria
            const memoryDeleted = this.state.cache.delete(key);
            
            // Eliminar de almacenamiento persistente
            const storageDeleted = this.deleteFromStorage(key);
            
            if (memoryDeleted || storageDeleted) {
                this.state.statistics.deletes++;
                this.log(`Persistent Cache DELETE: ${key}`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            this.log(`Error eliminando clave ${key}:`, error);
            return false;
        }
    },

    // Verificar si existe y no ha expirado
    has: function(key) {
        // Primero verificar en caché de memoria
        if (this.state.cache.has(key)) {
            const entry = this.state.cache.get(key);
            return !this.isExpired(entry);
        }
        
        // Si no está en memoria, verificar en almacenamiento persistente
        const storedValue = this.getFromStorage(key);
        if (storedValue !== null) {
            // Cargar en caché de memoria
            this.state.cache.set(key, storedValue);
            return !this.isExpired(storedValue);
        }
        
        return false;
    },

    // Limpiar caché
    clear: function() {
        const clearedCount = this.state.cache.size;
        
        // Limpiar caché de memoria
        this.state.cache.clear();
        
        // Limpiar almacenamiento persistente
        this.clearStorage();
        
        this.log(`Persistent Cache CLEAR: ${clearedCount} entradas eliminadas`);
        return clearedCount;
    },

    // Obtener desde almacenamiento persistente
    getFromStorage: function(key) {
        try {
            const storage = this.getStorage();
            const data = storage.getItem(this.config.storageKey);
            
            if (!data) {
                return null;
            }
            
            const cacheData = this.deserializeData(data);
            if (!cacheData || !cacheData[key]) {
                return null;
            }
            
            const entry = cacheData[key];
            
            // Verificar si ha expirado
            if (this.isExpired(entry)) {
                this.deleteFromStorage(key);
                return null;
            }
            
            return entry;
            
        } catch (error) {
            this.log(`Error obteniendo ${key} desde almacenamiento:`, error);
            return null;
        }
    },

    // Establecer en almacenamiento persistente
    setToStorage: function(key, entry) {
        try {
            const storage = this.getStorage();
            const data = storage.getItem(this.config.storageKey);
            
            let cacheData = data ? this.deserializeData(data) : {};
            
            // Procesar entrada para almacenamiento
            const processedEntry = this.processEntryForStorage(entry);
            cacheData[key] = processedEntry;
            
            // Serializar y guardar
            const serializedData = this.serializeData(cacheData);
            storage.setItem(this.config.storageKey, serializedData);
            
            return true;
            
        } catch (error) {
            this.log(`Error estableciendo ${key} en almacenamiento:`, error);
            return false;
        }
    },

    // Eliminar desde almacenamiento persistente
    deleteFromStorage: function(key) {
        try {
            const storage = this.getStorage();
            const data = storage.getItem(this.config.storageKey);
            
            if (!data) {
                return false;
            }
            
            const cacheData = this.deserializeData(data);
            if (!cacheData || !cacheData[key]) {
                return false;
            }
            
            delete cacheData[key];
            
            if (Object.keys(cacheData).length === 0) {
                storage.removeItem(this.config.storageKey);
            } else {
                const serializedData = this.serializeData(cacheData);
                storage.setItem(this.config.storageKey, serializedData);
            }
            
            return true;
            
        } catch (error) {
            this.log(`Error eliminando ${key} desde almacenamiento:`, error);
            return false;
        }
    },

    // Limpiar almacenamiento persistente
    clearStorage: function() {
        try {
            const storage = this.getStorage();
            storage.removeItem(this.config.storageKey);
            return true;
        } catch (error) {
            this.log('Error limpiando almacenamiento:', error);
            return false;
        }
    },

    // Obtener instancia de almacenamiento
    getStorage: function() {
        if (this.config.useSessionStorage) {
            return window.sessionStorage;
        } else {
            return window.localStorage;
        }
    },

    // Serializar datos para almacenamiento
    serializeData: function(data) {
        try {
            const jsonString = JSON.stringify(data);
            
            if (this.config.enableCompression && jsonString.length > this.config.compressionThreshold) {
                return this.compress(jsonString);
            }
            
            return jsonString;
            
        } catch (error) {
            this.log('Error serializando datos:', error);
            return null;
        }
    },

    // Deserializar datos desde almacenamiento
    deserializeData: function(data) {
        try {
            let jsonString = data;
            
            // Verificar si está comprimido
            if (this.config.enableCompression && this.isCompressed(data)) {
                jsonString = this.decompress(data);
            }
            
            return JSON.parse(jsonString);
            
        } catch (error) {
            this.log('Error deserializando datos:', error);
            return null;
        }
    },

    // Procesar entrada para almacenamiento
    processEntryForStorage: function(entry) {
        const processedEntry = { ...entry };
        
        // Eliminar propiedades que no necesitan persistencia
        delete processedEntry.key;
        
        return processedEntry;
    },

    // Comprimir datos
    compress: function(data) {
        try {
            // Implementación simple de compresión usando base64
            // En producción usar algoritmos más eficientes
            const compressed = btoa(encodeURIComponent(data));
            return 'compressed:' + compressed;
        } catch (error) {
            this.log('Error comprimiendo datos:', error);
            return data;
        }
    },

    // Descomprimir datos
    decompress: function(data) {
        try {
            if (typeof data === 'string' && data.startsWith('compressed:')) {
                const compressed = data.substring(11); // Remover 'compressed:'
                return decodeURIComponent(atob(compressed));
            }
            return data;
        } catch (error) {
            this.log('Error descomprimiendo datos:', error);
            return data;
        }
    },

    // Verificar si los datos están comprimidos
    isCompressed: function(data) {
        return typeof data === 'string' && data.startsWith('compressed:');
    },

    // Verificar si una entrada ha expirado
    isExpired: function(entry) {
        return entry.expiresAt && Date.now() > entry.expiresAt;
    },

    // Cargar datos desde almacenamiento
    loadFromStorage: function() {
        try {
            const storage = this.getStorage();
            const data = storage.getItem(this.config.storageKey);
            
            if (!data) {
                this.state.isLoaded = true;
                return;
            }
            
            const cacheData = this.deserializeData(data);
            if (!cacheData) {
                this.state.isLoaded = true;
                return;
            }
            
            // Cargar entradas válidas en caché de memoria
            let loadedCount = 0;
            let expiredCount = 0;
            
            for (const [key, entry] of Object.entries(cacheData)) {
                if (this.isExpired(entry)) {
                    expiredCount++;
                    this.deleteFromStorage(key);
                } else {
                    this.state.cache.set(key, entry);
                    loadedCount++;
                }
            }
            
            this.state.isLoaded = true;
            this.log(`Persistent Cache cargado: ${loadedCount} entradas, ${expiredCount} expiradas eliminadas`);
            
        } catch (error) {
            this.log('Error cargando datos desde almacenamiento:', error);
            this.state.isLoaded = true;
        }
    },

    // Verificar límite de almacenamiento
    checkStorageLimit: function() {
        try {
            const storage = this.getStorage();
            const data = storage.getItem(this.config.storageKey);
            
            if (!data) {
                return;
            }
            
            const dataSize = this.getDataSize(data);
            
            if (dataSize > this.config.maxSize) {
                this.log(`Límite de almacenamiento excedido: ${dataSize} bytes > ${this.config.maxSize} bytes`);
                this.evictOldestEntries();
            }
            
        } catch (error) {
            this.log('Error verificando límite de almacenamiento:', error);
        }
    },

    // Obtener tamaño de los datos
    getDataSize: function(data) {
        return new Blob([data]).size;
    },

    // Evictar entradas más antiguas
    evictOldestEntries: function() {
        try {
            const entries = Array.from(this.state.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toEvict = Math.floor(entries.length * 0.2); // Evictar 20% más antiguas
            
            for (let i = 0; i < toEvict; i++) {
                const [key] = entries[i];
                this.delete(key);
            }
            
            this.log(`Evictadas ${toEvict} entradas más antiguas por límite de almacenamiento`);
            
        } catch (error) {
            this.log('Error evictando entradas antiguas:', error);
        }
    },

    // Limpiar entradas expiradas
    cleanup: function() {
        let cleanedCount = 0;
        
        // Limpiar caché de memoria
        for (const [key, entry] of this.state.cache.entries()) {
            if (this.isExpired(entry)) {
                this.delete(key);
                cleanedCount++;
            }
        }
        
        // Limpiar almacenamiento persistente
        const storage = this.getStorage();
        const data = storage.getItem(this.config.storageKey);
        
        if (data) {
            const cacheData = this.deserializeData(data);
            if (cacheData) {
                for (const [key, entry] of Object.entries(cacheData)) {
                    if (this.isExpired(entry)) {
                        this.deleteFromStorage(key);
                        cleanedCount++;
                    }
                }
            }
        }
        
        if (cleanedCount > 0) {
            this.log(`Persistent Cache cleanup: ${cleanedCount} entradas expiradas eliminadas`);
        }
        
        return cleanedCount;
    },

    // Configurar listener de almacenamiento para sincronización entre pestañas
    setupStorageListener: function() {
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (event) => {
                if (event.key === this.config.storageKey) {
                    // Sincronizar con cambios en otras pestañas
                    this.loadFromStorage();
                }
            });
        }
    },

    // Actualizar hit rate
    updateHitRate: function() {
        const total = this.state.statistics.hits + this.state.statistics.misses;
        this.state.statistics.hitRate = total > 0 ? (this.state.statistics.hits / total) * 100 : 0;
    },

    // Obtener estadísticas
    getStatistics: function() {
        return {
            ...this.state.statistics,
            size: this.state.cache.size,
            storageSize: this.getStorageSize(),
            isLoaded: this.state.isLoaded
        };
    },

    // Obtener tamaño del almacenamiento
    getStorageSize: function() {
        try {
            const storage = this.getStorage();
            const data = storage.getItem(this.config.storageKey);
            return data ? this.getDataSize(data) : 0;
        } catch (error) {
            this.log('Error obteniendo tamaño de almacenamiento:', error);
            return 0;
        }
    },

    // Iniciar timer de limpieza
    startCleanupTimer: function() {
        if (this.state.cleanupTimer) {
            clearInterval(this.state.cleanupTimer);
        }
        
        this.state.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    },

    // Detener timer de limpieza
    stopCleanupTimer: function() {
        if (this.state.cleanupTimer) {
            clearInterval(this.state.cleanupTimer);
            this.state.cleanupTimer = null;
        }
    },

    // Reiniciar estadísticas
    resetStatistics: function() {
        this.state.statistics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            expirations: 0,
            hitRate: 0,
            totalAccesses: 0,
            storageHits: 0,
            storageMisses: 0,
            compressionSavings: 0
        };
        
        this.log('Persistent Cache estadísticas reiniciadas');
    },

    // Exportar estado
    exportState: function() {
        return {
            config: this.config,
            statistics: this.state.statistics,
            size: this.state.cache.size,
            storageSize: this.getStorageSize(),
            isLoaded: this.state.isLoaded,
            timestamp: new Date().toISOString()
        };
    },

    // Logging
    log: function(message, data = null) {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [PersistentCache] ${message}`;
            
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
    window.PersistentCache = PersistentCache;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = PersistentCache;
}