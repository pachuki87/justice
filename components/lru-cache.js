/**
 * Justice 2 LRU Cache - Least Recently Used
 * Implementación optimizada de caché LRU con evicción automática
 * Ideal para datos accedidos recientemente con alta frecuencia
 */

const LRUCache = {
    // Configuración
    config: {
        maxSize: 100, // Tamaño máximo de la caché
        enableMetrics: true,
        enableLogging: true,
        defaultTTL: 300000, // 5 minutos por defecto
        cleanupInterval: 60000 // 1 minuto
    },

    // Estado
    state: {
        cache: new Map(), // Almacenamiento principal
        accessOrder: [], // Orden de acceso (para LRU)
        accessTimes: new Map(), // Tiempos de acceso por clave
        statistics: {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            hitRate: 0,
            totalAccesses: 0
        },
        cleanupTimer: null
    },

    // Inicialización
    init: function(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        this.startCleanupTimer();
        this.log('LRU Cache inicializado');
    },

    // Obtener valor
    get: function(key) {
        const startTime = performance.now();
        
        try {
            if (!this.state.cache.has(key)) {
                this.state.statistics.misses++;
                this.state.statistics.totalAccesses++;
                this.updateHitRate();
                return null;
            }

            const entry = this.state.cache.get(key);
            
            // Verificar TTL si existe
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                this.delete(key);
                this.state.statistics.misses++;
                this.state.statistics.totalAccesses++;
                this.updateHitRate();
                return null;
            }

            // Mover al final (más recientemente usado)
            this.moveToEnd(key);
            
            // Actualizar tiempo de acceso
            this.state.accessTimes.set(key, Date.now());
            
            this.state.statistics.hits++;
            this.state.statistics.totalAccesses++;
            this.updateHitRate();
            
            const endTime = performance.now();
            this.log(`LRU Cache HIT: ${key} (${(endTime - startTime).toFixed(2)}ms)`);
            
            return entry.value;
            
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
            
            // Si la clave ya existe, actualizar y mover al final
            if (this.state.cache.has(key)) {
                this.state.cache.set(key, {
                    value,
                    timestamp: now,
                    expiresAt: ttl > 0 ? now + ttl : null,
                    metadata: options.metadata || {}
                });
                this.moveToEnd(key);
            } else {
                // Verificar límite de tamaño
                if (this.state.cache.size >= this.config.maxSize) {
                    this.evictLRU();
                }
                
                // Agregar nueva entrada
                this.state.cache.set(key, {
                    value,
                    timestamp: now,
                    expiresAt: ttl > 0 ? now + ttl : null,
                    metadata: options.metadata || {}
                });
                this.state.accessOrder.push(key);
            }
            
            // Actualizar tiempo de acceso
            this.state.accessTimes.set(key, now);
            
            this.state.statistics.sets++;
            
            const endTime = performance.now();
            this.log(`LRU Cache SET: ${key} (${(endTime - startTime).toFixed(2)}ms)`);
            
            return true;
            
        } catch (error) {
            this.log(`Error estableciendo clave ${key}:`, error);
            return false;
        }
    },

    // Eliminar clave
    delete: function(key) {
        try {
            const deleted = this.state.cache.delete(key);
            this.state.accessTimes.delete(key);
            
            // Remover del orden de acceso
            const index = this.state.accessOrder.indexOf(key);
            if (index > -1) {
                this.state.accessOrder.splice(index, 1);
            }
            
            if (deleted) {
                this.state.statistics.deletes++;
                this.log(`LRU Cache DELETE: ${key}`);
            }
            
            return deleted;
            
        } catch (error) {
            this.log(`Error eliminando clave ${key}:`, error);
            return false;
        }
    },

    // Verificar si existe
    has: function(key) {
        if (!this.state.cache.has(key)) {
            return false;
        }
        
        const entry = this.state.cache.get(key);
        
        // Verificar TTL si existe
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.delete(key);
            return false;
        }
        
        return true;
    },

    // Limpiar caché
    clear: function() {
        const clearedCount = this.state.cache.size;
        
        this.state.cache.clear();
        this.state.accessOrder = [];
        this.state.accessTimes.clear();
        
        this.log(`LRU Cache CLEAR: ${clearedCount} entradas eliminadas`);
        return clearedCount;
    },

    // Mover clave al final del orden de acceso
    moveToEnd: function(key) {
        const index = this.state.accessOrder.indexOf(key);
        if (index > -1) {
            this.state.accessOrder.splice(index, 1);
            this.state.accessOrder.push(key);
        }
    },

    // Evictar LRU (Least Recently Used)
    evictLRU: function() {
        if (this.state.accessOrder.length === 0) {
            return;
        }
        
        // La primera clave en el array es la menos recientemente usada
        const lruKey = this.state.accessOrder[0];
        
        this.delete(lruKey);
        this.state.statistics.evictions++;
        
        this.log(`LRU Evicción: ${lruKey}`);
    },

    // Limpiar entradas expiradas
    cleanup: function() {
        let cleanedCount = 0;
        const now = Date.now();
        
        for (const [key, entry] of this.state.cache.entries()) {
            if (entry.expiresAt && now > entry.expiresAt) {
                this.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.log(`LRU Cleanup: ${cleanedCount} entradas expiradas eliminadas`);
        }
        
        return cleanedCount;
    },

    // Obtener tamaño actual
    size: function() {
        return this.state.cache.size;
    },

    // Obtener claves en orden LRU
    getKeys: function() {
        return [...this.state.accessOrder];
    },

    // Obtener claves más recientes
    getRecentKeys: function(count = 10) {
        return this.state.accessOrder.slice(-count).reverse();
    },

    // Obtener claves más antiguas
    getOldKeys: function(count = 10) {
        return this.state.accessOrder.slice(0, count);
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
            maxSize: this.config.maxSize,
            memoryUsage: this.estimateMemoryUsage()
        };
    },

    // Estimar uso de memoria
    estimateMemoryUsage: function() {
        let totalSize = 0;
        
        for (const [key, entry] of this.state.cache.entries()) {
            // Estimación simple: clave + valor + metadatos
            totalSize += key.length * 2; // UTF-16
            totalSize += JSON.stringify(entry.value).length * 2;
            totalSize += 100; // Metadatos aproximados
        }
        
        return totalSize;
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
            evictions: 0,
            hitRate: 0,
            totalAccesses: 0
        };
        
        this.log('LRU Cache estadísticas reiniciadas');
    },

    // Exportar estado
    exportState: function() {
        return {
            config: this.config,
            statistics: this.state.statistics,
            size: this.state.cache.size,
            keys: this.getKeys(),
            recentKeys: this.getRecentKeys(),
            oldKeys: this.getOldKeys(),
            timestamp: new Date().toISOString()
        };
    },

    // Logging
    log: function(message, data = null) {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [LRUCache] ${message}`;
            
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
    window.LRUCache = LRUCache;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = LRUCache;
}