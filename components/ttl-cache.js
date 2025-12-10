/**
 * Justice 2 TTL Cache - Time To Live
 * Implementación de caché con expiración automática basada en tiempo
 * Ideal para datos con ciclo de vida definido y actualizaciones periódicas
 */

const TTLCache = {
    // Configuración
    config: {
        maxSize: 500, // Tamaño máximo de la caché
        defaultTTL: 300000, // 5 minutos por defecto
        enableMetrics: true,
        enableLogging: true,
        enableBackgroundCleanup: true,
        cleanupInterval: 30000, // 30 segundos
        enableAutoRefresh: false, // Refresco automático antes de expirar
        refreshThreshold: 0.8 // 80% del TTL para refresco
    },

    // Estado
    state: {
        cache: new Map(), // Almacenamiento principal
        timers: new Map(), // Timers de expiración por clave
        statistics: {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            expirations: 0,
            refreshes: 0,
            hitRate: 0,
            totalAccesses: 0,
            averageTTL: 0
        },
        cleanupTimer: null,
        refreshCallbacks: new Map() // Callbacks de refresco por clave
    },

    // Inicialización
    init: function(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        
        if (this.config.enableBackgroundCleanup) {
            this.startCleanupTimer();
        }
        
        this.log('TTL Cache inicializado');
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
            const now = Date.now();
            
            // Verificar si ha expirado
            if (now > entry.expiresAt) {
                this.delete(key);
                this.state.statistics.misses++;
                this.state.statistics.totalAccesses++;
                this.updateHitRate();
                return null;
            }

            // Verificar si necesita refresco automático
            if (this.config.enableAutoRefresh && this.needsRefresh(entry)) {
                this.triggerAutoRefresh(key, entry);
            }
            
            this.state.statistics.hits++;
            this.state.statistics.totalAccesses++;
            this.updateHitRate();
            
            const endTime = performance.now();
            this.log(`TTL Cache HIT: ${key} (TTL restante: ${entry.expiresAt - now}ms, ${(endTime - startTime).toFixed(2)}ms)`);
            
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
            
            // Limpiar timer existente si la clave ya existe
            if (this.state.timers.has(key)) {
                clearTimeout(this.state.timers.get(key));
                this.state.timers.delete(key);
            }
            
            // Verificar límite de tamaño
            if (this.state.cache.size >= this.config.maxSize && !this.state.cache.has(key)) {
                this.evictOldest();
            }
            
            // Crear entrada
            const entry = {
                value,
                timestamp: now,
                ttl,
                expiresAt: now + ttl,
                metadata: options.metadata || {},
                accessCount: 0,
                lastAccess: now
            };
            
            // Almacenar entrada
            this.state.cache.set(key, entry);
            
            // Configurar timer de expiración
            if (ttl > 0) {
                const timer = setTimeout(() => {
                    this.expireKey(key);
                }, ttl);
                this.state.timers.set(key, timer);
            }
            
            // Guardar callback de refresco si se proporciona
            if (options.refreshCallback) {
                this.state.refreshCallbacks.set(key, options.refreshCallback);
            }
            
            this.state.statistics.sets++;
            this.updateAverageTTL();
            
            const endTime = performance.now();
            this.log(`TTL Cache SET: ${key} (TTL: ${ttl}ms, ${(endTime - startTime).toFixed(2)}ms)`);
            
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
            
            // Limpiar timer
            if (this.state.timers.has(key)) {
                clearTimeout(this.state.timers.get(key));
                this.state.timers.delete(key);
            }
            
            // Limpiar callback de refresco
            if (this.state.refreshCallbacks.has(key)) {
                this.state.refreshCallbacks.delete(key);
            }
            
            if (deleted) {
                this.state.statistics.deletes++;
                this.log(`TTL Cache DELETE: ${key}`);
            }
            
            return deleted;
            
        } catch (error) {
            this.log(`Error eliminando clave ${key}:`, error);
            return false;
        }
    },

    // Verificar si existe y no ha expirado
    has: function(key) {
        if (!this.state.cache.has(key)) {
            return false;
        }
        
        const entry = this.state.cache.get(key);
        const now = Date.now();
        
        if (now > entry.expiresAt) {
            this.expireKey(key);
            return false;
        }
        
        return true;
    },

    // Limpiar caché
    clear: function() {
        const clearedCount = this.state.cache.size;
        
        // Limpiar todos los timers
        for (const timer of this.state.timers.values()) {
            clearTimeout(timer);
        }
        
        this.state.cache.clear();
        this.state.timers.clear();
        this.state.refreshCallbacks.clear();
        
        this.log(`TTL Cache CLEAR: ${clearedCount} entradas eliminadas`);
        return clearedCount;
    },

    // Expirar clave específica
    expireKey: function(key) {
        if (this.state.cache.has(key)) {
            this.state.cache.delete(key);
            this.state.timers.delete(key);
            this.state.refreshCallbacks.delete(key);
            
            this.state.statistics.expirations++;
            this.log(`TTL Cache EXPIRED: ${key}`);
        }
    },

    // Verificar si necesita refresco
    needsRefresh: function(entry) {
        const now = Date.now();
        const threshold = entry.expiresAt - (entry.ttl * this.config.refreshThreshold);
        return now > threshold;
    },

    // Disparar refresco automático
    triggerAutoRefresh: function(key, entry) {
        const refreshCallback = this.state.refreshCallbacks.get(key);
        if (refreshCallback && typeof refreshCallback === 'function') {
            // Ejecutar en segundo plano para no bloquear
            setTimeout(async () => {
                try {
                    const newValue = await refreshCallback(key, entry.value);
                    this.set(key, newValue, {
                        ttl: entry.ttl,
                        refreshCallback,
                        metadata: entry.metadata
                    });
                    this.state.statistics.refreshes++;
                    this.log(`TTL Cache AUTO REFRESH: ${key}`);
                } catch (error) {
                    this.log(`Error en refresco automático para ${key}:`, error);
                }
            }, 0);
        }
    },

    // Evictar entrada más antigua
    evictOldest: function() {
        let oldestKey = null;
        let oldestTimestamp = Date.now();
        
        for (const [key, entry] of this.state.cache.entries()) {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.delete(oldestKey);
            this.log(`TTL Cache EVICTION: ${oldestKey} (más antigua)`);
        }
    },

    // Limpiar entradas expiradas manualmente
    cleanup: function() {
        let cleanedCount = 0;
        const now = Date.now();
        
        for (const [key, entry] of this.state.cache.entries()) {
            if (now > entry.expiresAt) {
                this.expireKey(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.log(`TTL Cache CLEANUP: ${cleanedCount} entradas expiradas eliminadas`);
        }
        
        return cleanedCount;
    },

    // Obtener TTL restante de una clave
    getTTL: function(key) {
        if (!this.state.cache.has(key)) {
            return -1;
        }
        
        const entry = this.state.cache.get(key);
        const now = Date.now();
        const remaining = entry.expiresAt - now;
        
        return Math.max(0, remaining);
    },

    // Obtener todas las claves con su TTL
    getKeysWithTTL: function() {
        const now = Date.now();
        const keysWithTTL = [];
        
        for (const [key, entry] of this.state.cache.entries()) {
            keysWithTTL.push({
                key,
                ttl: entry.ttl,
                remainingTTL: Math.max(0, entry.expiresAt - now),
                expiresAt: entry.expiresAt,
                isExpired: now > entry.expiresAt
            });
        }
        
        return keysWithTTL.sort((a, b) => a.remainingTTL - b.remainingTTL);
    },

    // Obtener claves que expirarán pronto
    getExpiringSoon: function(thresholdMs = 60000) { // 1 minuto por defecto
        const now = Date.now();
        const expiringSoon = [];
        
        for (const [key, entry] of this.state.cache.entries()) {
            const timeToExpiry = entry.expiresAt - now;
            if (timeToExpiry > 0 && timeToExpiry <= thresholdMs) {
                expiringSoon.push({
                    key,
                    timeToExpiry,
                    expiresAt: entry.expiresAt
                });
            }
        }
        
        return expiringSoon.sort((a, b) => a.timeToExpiry - b.timeToExpiry);
    },

    // Extender TTL de una clave
    extendTTL: function(key, additionalTTL) {
        if (!this.state.cache.has(key)) {
            return false;
        }
        
        const entry = this.state.cache.get(key);
        const oldExpiresAt = entry.expiresAt;
        
        // Limpiar timer antiguo
        if (this.state.timers.has(key)) {
            clearTimeout(this.state.timers.get(key));
        }
        
        // Actualizar expiración
        entry.expiresAt += additionalTTL;
        entry.ttl += additionalTTL;
        
        // Crear nuevo timer
        const newTimer = setTimeout(() => {
            this.expireKey(key);
        }, entry.expiresAt - Date.now());
        this.state.timers.set(key, newTimer);
        
        this.log(`TTL Cache EXTENDED: ${key} (+${additionalTTL}ms, nueva expiración: ${entry.expiresAt})`);
        
        return true;
    },

    // Actualizar hit rate
    updateHitRate: function() {
        const total = this.state.statistics.hits + this.state.statistics.misses;
        this.state.statistics.hitRate = total > 0 ? (this.state.statistics.hits / total) * 100 : 0;
    },

    // Actualizar TTL promedio
    updateAverageTTL: function() {
        if (this.state.cache.size === 0) {
            this.state.statistics.averageTTL = 0;
            return;
        }
        
        let totalTTL = 0;
        for (const entry of this.state.cache.values()) {
            totalTTL += entry.ttl;
        }
        
        this.state.statistics.averageTTL = totalTTL / this.state.cache.size;
    },

    // Obtener estadísticas
    getStatistics: function() {
        this.updateAverageTTL();
        
        return {
            ...this.state.statistics,
            size: this.state.cache.size,
            maxSize: this.config.maxSize,
            memoryUsage: this.estimateMemoryUsage(),
            activeTimers: this.state.timers.size,
            refreshCallbacks: this.state.refreshCallbacks.size
        };
    },

    // Estimar uso de memoria
    estimateMemoryUsage: function() {
        let totalSize = 0;
        
        for (const [key, entry] of this.state.cache.entries()) {
            totalSize += key.length * 2; // UTF-16
            totalSize += JSON.stringify(entry.value).length * 2;
            totalSize += 200; // Metadatos y timestamps
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
            expirations: 0,
            refreshes: 0,
            hitRate: 0,
            totalAccesses: 0,
            averageTTL: 0
        };
        
        this.log('TTL Cache estadísticas reiniciadas');
    },

    // Exportar estado
    exportState: function() {
        return {
            config: this.config,
            statistics: this.state.statistics,
            size: this.state.cache.size,
            keysWithTTL: this.getKeysWithTTL(),
            expiringSoon: this.getExpiringSoon(),
            timestamp: new Date().toISOString()
        };
    },

    // Logging
    log: function(message, data = null) {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [TTLCache] ${message}`;
            
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
    window.TTLCache = TTLCache;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = TTLCache;
}