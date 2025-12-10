/**
 * Justice 2 Query Cache
 * Sistema de caché inteligente para resultados de consultas de base de datos
 */

const QueryCache = {
    // Configuración del caché
    config: {
        // Configuración de caché
        enabled: true,
        maxSize: 1000,
        defaultTTL: 300000, // 5 minutos en milisegundos
        
        // Configuración de limpieza
        cleanupInterval: 60000, // 1 minuto
        maxAge: 1800000, // 30 minutos
        
        // Configuración de estrategias
        evictionPolicy: 'LRU', // LRU, LFU, FIFO
        compressionEnabled: true,
        compressionThreshold: 1024, // 1KB
        
        // Configuración de validación
        validateOnGet: true,
        validateOnSet: true,
        enableMetrics: true,
        
        // Configuración de persistencia
        enablePersistence: false,
        persistenceKey: 'justice2_query_cache',
        
        // Configuración de inteligencia
        enableSmartCaching: true,
        adaptiveTTL: true,
        predictionEnabled: true
    },

    // Estado del caché
    state: {
        initialized: false,
        cache: new Map(),
        accessOrder: [],
        accessFrequency: new Map(),
        compressionStats: {
            compressed: 0,
            uncompressed: 0,
            compressionRatio: 0
        },
        metrics: {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            totalSize: 0,
            averageAccessTime: 0,
            lastCleanupTime: null
        }
    },

    // Predicciones de acceso
    predictions: {
        accessPatterns: new Map(),
        hotKeys: new Set(),
        coldKeys: new Set()
    },

    /**
     * Inicializar el caché de consultas
     */
    init: function() {
        if (this.state.initialized) {
            console.log('⚠️ Query Cache ya está inicializado');
            return;
        }
        
        console.log('💾 Inicializando Query Cache...');
        
        // Cargar datos persistentes si está habilitado
        if (this.config.enablePersistence) {
            this.loadFromPersistence();
        }
        
        // Configurar limpieza periódica
        this.setupPeriodicCleanup();
        
        // Configurar análisis de patrones si está habilitado
        if (this.config.enableSmartCaching) {
            this.setupPatternAnalysis();
        }
        
        this.state.initialized = true;
        console.log('✅ Query Cache inicializado');
    },

    /**
     * Obtener valor del caché
     * @param {string} key - Clave del caché
     * @returns {Object|null} Valor cacheado o null
     */
    get: function(key) {
        if (!this.config.enabled) {
            return null;
        }
        
        const startTime = Date.now();
        
        try {
            const entry = this.state.cache.get(key);
            
            if (!entry) {
                this.recordMiss();
                return null;
            }
            
            // Verificar si ha expirado
            if (this.isExpired(entry)) {
                this.delete(key);
                this.recordMiss();
                return null;
            }
            
            // Validar datos si está configurado
            if (this.config.validateOnGet && !this.validateEntry(entry)) {
                this.delete(key);
                this.recordMiss();
                return null;
            }
            
            // Actualizar estadísticas de acceso
            this.updateAccessStats(key);
            
            // Descomprimir si es necesario
            const value = this.decompressIfNeeded(entry);
            
            // Registrar métricas
            this.recordHit();
            this.recordAccessTime(Date.now() - startTime);
            
            // Actualizar patrones de acceso
            if (this.config.enableSmartCaching) {
                this.updateAccessPattern(key, 'hit');
            }
            
            console.log(`🎯 Cache hit para clave: ${key}`);
            
            return value;
            
        } catch (error) {
            console.error('❌ Error obteniendo del caché:', error);
            this.recordMiss();
            return null;
        }
    },

    /**
     * Almacenar valor en el caché
     * @param {string} key - Clave del caché
     * @param {*} value - Valor a almacenar
     * @param {Object} options - Opciones de almacenamiento
     * @returns {boolean} True si se almacenó correctamente
     */
    set: function(key, value, options = {}) {
        if (!this.config.enabled) {
            return false;
        }
        
        try {
            // Calcular TTL
            const ttl = this.calculateTTL(key, value, options);
            
            // Validar datos si está configurado
            if (this.config.validateOnSet && !this.validateValue(value)) {
                console.warn('⚠️ Validación fallida para valor del caché');
                return false;
            }
            
            // Comprimir si es necesario
            const compressedValue = this.compressIfNeeded(value);
            
            // Crear entrada
            const entry = {
                key: key,
                value: compressedValue.data,
                compressed: compressedValue.compressed,
                originalSize: compressedValue.originalSize,
                compressedSize: compressedValue.compressedSize,
                timestamp: Date.now(),
                ttl: ttl,
                accessCount: 0,
                lastAccess: Date.now(),
                metadata: options.metadata || {}
            };
            
            // Verificar tamaño máximo
            if (this.state.cache.size >= this.config.maxSize) {
                this.evictEntries();
            }
            
            // Almacenar entrada
            this.state.cache.set(key, entry);
            
            // Actualizar orden de acceso
            this.updateAccessOrder(key);
            
            // Actualizar patrones de acceso
            if (this.config.enableSmartCaching) {
                this.updateAccessPattern(key, 'set');
            }
            
            // Registrar métricas
            this.recordSet();
            this.updateTotalSize();
            
            // Persistir si está habilitado
            if (this.config.enablePersistence) {
                this.saveToPersistence();
            }
            
            console.log(`💾 Valor cacheado con clave: ${key} (TTL: ${ttl}ms)`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error almacenando en caché:', error);
            return false;
        }
    },

    /**
     * Eliminar entrada del caché
     * @param {string} key - Clave a eliminar
     * @returns {boolean} True si se eliminó correctamente
     */
    delete: function(key) {
        if (!this.config.enabled) {
            return false;
        }
        
        const deleted = this.state.cache.delete(key);
        
        if (deleted) {
            // Actualizar orden de acceso
            this.removeFromAccessOrder(key);
            
            // Limpiar estadísticas de frecuencia
            this.state.accessFrequency.delete(key);
            
            // Actualizar patrones
            if (this.config.enableSmartCaching) {
                this.removeFromAccessPatterns(key);
            }
            
            // Registrar métricas
            this.recordDelete();
            this.updateTotalSize();
            
            // Persistir si está habilitado
            if (this.config.enablePersistence) {
                this.saveToPersistence();
            }
            
            console.log(`🗑️ Entrada eliminada del caché: ${key}`);
        }
        
        return deleted;
    },

    /**
     * Verificar si una clave existe en el caché
     * @param {string} key - Clave a verificar
     * @returns {boolean} True si existe y no ha expirado
     */
    has: function(key) {
        if (!this.config.enabled) {
            return false;
        }
        
        const entry = this.state.cache.get(key);
        
        if (!entry) {
            return false;
        }
        
        // Verificar si ha expirado
        if (this.isExpired(entry)) {
            this.delete(key);
            return false;
        }
        
        return true;
    },

    /**
     * Limpiar todo el caché
     */
    clear: function() {
        if (!this.config.enabled) {
            return;
        }
        
        const size = this.state.cache.size;
        
        this.state.cache.clear();
        this.state.accessOrder = [];
        this.state.accessFrequency.clear();
        
        // Reiniciar métricas
        this.state.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            totalSize: 0,
            averageAccessTime: 0,
            lastCleanupTime: null
        };
        
        // Reiniciar predicciones
        this.predictions.accessPatterns.clear();
        this.predictions.hotKeys.clear();
        this.predictions.coldKeys.clear();
        
        // Persistir si está habilitado
        if (this.config.enablePersistence) {
            this.saveToPersistence();
        }
        
        console.log(`🧹 Caché limpiado (${size} entradas eliminadas)`);
    },

    /**
     * Calcular TTL para una entrada
     * @param {string} key - Clave
     * @param {*} value - Valor
     * @param {Object} options - Opciones
     * @returns {number} TTL en milisegundos
     */
    calculateTTL: function(key, value, options) {
        // TTL explícito tiene prioridad
        if (options.ttl) {
            return options.ttl;
        }
        
        // TTL adaptativo si está habilitado
        if (this.config.adaptiveTTL) {
            return this.calculateAdaptiveTTL(key, value);
        }
        
        // TTL por defecto
        return this.config.defaultTTL;
    },

    /**
     * Calcular TTL adaptativo basado en patrones de acceso
     * @param {string} key - Clave
     * @param {*} value - Valor
     * @returns {number} TTL adaptativo
     */
    calculateAdaptiveTTL: function(key, value) {
        const pattern = this.predictions.accessPatterns.get(key);
        
        if (!pattern) {
            return this.config.defaultTTL;
        }
        
        // Ajustar TTL basado en frecuencia de acceso
        const accessRate = pattern.accessCount / (Date.now() - pattern.firstAccess);
        
        let ttlMultiplier = 1.0;
        
        if (accessRate > 0.01) { // Acceso frecuente
            ttlMultiplier = 2.0; // TTL más largo
        } else if (accessRate < 0.001) { // Acceso infrecuente
            ttlMultiplier = 0.5; // TTL más corto
        }
        
        // Ajustar basado en tamaño del valor
        const valueSize = this.getValueSize(value);
        if (valueSize > 10000) { // Valor grande
            ttlMultiplier *= 0.7; // TTL más corto para valores grandes
        }
        
        return Math.round(this.config.defaultTTL * ttlMultiplier);
    },

    /**
     * Comprimir valor si es necesario
     * @param {*} value - Valor a comprimir
     * @returns {Object} Valor comprimido y metadatos
     */
    compressIfNeeded: function(value) {
        const originalSize = this.getValueSize(value);
        
        // No comprimir si está deshabilitado o el valor es pequeño
        if (!this.config.compressionEnabled || originalSize < this.config.compressionThreshold) {
            return {
                data: value,
                compressed: false,
                originalSize: originalSize,
                compressedSize: originalSize
            };
        }
        
        try {
            // Simulación de compresión (en producción usar algoritmo real)
            const compressedData = this.simulateCompression(value);
            const compressedSize = this.getValueSize(compressedData);
            
            // Usar comprimido solo si reduce el tamaño
            if (compressedSize < originalSize * 0.8) {
                this.state.compressionStats.compressed++;
                
                return {
                    data: compressedData,
                    compressed: true,
                    originalSize: originalSize,
                    compressedSize: compressedSize
                };
            }
        } catch (error) {
            console.warn('⚠️ Error en compresión:', error);
        }
        
        this.state.compressionStats.uncompressed++;
        
        return {
            data: value,
            compressed: false,
            originalSize: originalSize,
            compressedSize: originalSize
        };
    },

    /**
     * Descomprimir valor si es necesario
     * @param {Object} entry - Entrada del caché
     * @returns {*} Valor descomprimido
     */
    decompressIfNeeded: function(entry) {
        if (!entry.compressed) {
            return entry.value;
        }
        
        try {
            // Simulación de descompresión (en producción usar algoritmo real)
            return this.simulateDecompression(entry.value);
        } catch (error) {
            console.error('❌ Error en descompresión:', error);
            return entry.value;
        }
    },

    /**
     * Simulación de compresión (placeholder)
     * @param {*} data - Datos a comprimir
     * @returns {*} Datos "comprimidos"
     */
    simulateCompression: function(data) {
        // En producción, usar algoritmo real como gzip, deflate, etc.
        return JSON.stringify(data);
    },

    /**
     * Simulación de descompresión (placeholder)
     * @param {*} data - Datos a descomprimir
     * @returns {*} Datos descomprimidos
     */
    simulateDecompression: function(data) {
        // En producción, usar algoritmo real
        return JSON.parse(data);
    },

    /**
     * Verificar si una entrada ha expirado
     * @param {Object} entry - Entrada del caché
     * @returns {boolean} True si ha expirado
     */
    isExpired: function(entry) {
        if (entry.ttl === 0) { // TTL = 0 significa sin expiración
            return false;
        }
        
        return Date.now() - entry.timestamp > entry.ttl;
    },

    /**
     * Validar entrada del caché
     * @param {Object} entry - Entrada a validar
     * @returns {boolean} True si es válida
     */
    validateEntry: function(entry) {
        // Validar estructura básica
        if (!entry || typeof entry !== 'object') {
            return false;
        }
        
        // Validar campos requeridos
        const requiredFields = ['key', 'value', 'timestamp', 'ttl'];
        for (const field of requiredFields) {
            if (!(field in entry)) {
                return false;
            }
        }
        
        // Validar tipos
        if (typeof entry.key !== 'string' || typeof entry.timestamp !== 'number' || typeof entry.ttl !== 'number') {
            return false;
        }
        
        return true;
    },

    /**
     * Validar valor
     * @param {*} value - Valor a validar
     * @returns {boolean} True si es válido
     */
    validateValue: function(value) {
        // Rechazar valores undefined
        if (value === undefined) {
            return false;
        }
        
        // Rechazar funciones
        if (typeof value === 'function') {
            return false;
        }
        
        // Validar tamaño máximo (1MB)
        const size = this.getValueSize(value);
        if (size > 1024 * 1024) {
            return false;
        }
        
        return true;
    },

    /**
     * Obtener tamaño de un valor
     * @param {*} value - Valor
     * @returns {number} Tamaño en bytes
     */
    getValueSize: function(value) {
        if (value === null || value === undefined) {
            return 0;
        }
        
        if (typeof value === 'string') {
            return new Blob([value]).size;
        }
        
        if (typeof value === 'object') {
            return new Blob([JSON.stringify(value)]).size;
        }
        
        return 8; // Tamaño aproximado para números y booleanos
    },

    /**
     * Actualizar estadísticas de acceso
     * @param {string} key - Clave accedida
     */
    updateAccessStats: function(key) {
        const entry = this.state.cache.get(key);
        if (entry) {
            entry.accessCount++;
            entry.lastAccess = Date.now();
        }
        
        // Actualizar frecuencia
        const currentFreq = this.state.accessFrequency.get(key) || 0;
        this.state.accessFrequency.set(key, currentFreq + 1);
        
        // Actualizar orden de acceso
        this.updateAccessOrder(key);
    },

    /**
     * Actualizar orden de acceso
     * @param {string} key - Clave accedida
     */
    updateAccessOrder: function(key) {
        // Eliminar de posición actual
        const index = this.state.accessOrder.indexOf(key);
        if (index > -1) {
            this.state.accessOrder.splice(index, 1);
        }
        
        // Agregar al final (más reciente)
        this.state.accessOrder.push(key);
    },

    /**
     * Eliminar del orden de acceso
     * @param {string} key - Clave a eliminar
     */
    removeFromAccessOrder: function(key) {
        const index = this.state.accessOrder.indexOf(key);
        if (index > -1) {
            this.state.accessOrder.splice(index, 1);
        }
    },

    /**
     * Evictar entradas según la política configurada
     */
    evictEntries: function() {
        const entriesToEvict = Math.ceil(this.config.maxSize * 0.1); // Evictar 10%
        
        switch (this.config.evictionPolicy) {
            case 'LRU':
                this.evictLRU(entriesToEvict);
                break;
            case 'LFU':
                this.evictLFU(entriesToEvict);
                break;
            case 'FIFO':
                this.evictFIFO(entriesToEvict);
                break;
            default:
                this.evictLRU(entriesToEvict);
        }
    },

    /**
     * Evictar usando política LRU (Least Recently Used)
     * @param {number} count - Número de entradas a evictar
     */
    evictLRU: function(count) {
        for (let i = 0; i < count && this.state.accessOrder.length > 0; i++) {
            const key = this.state.accessOrder.shift();
            this.state.cache.delete(key);
            this.state.accessFrequency.delete(key);
            this.recordEviction();
        }
    },

    /**
     * Evictar usando política LFU (Least Frequently Used)
     * @param {number} count - Número de entradas a evictar
     */
    evictLFU: function(count) {
        const sortedEntries = Array.from(this.state.accessFrequency.entries())
            .sort((a, b) => a[1] - b[1]);
        
        for (let i = 0; i < count && i < sortedEntries.length; i++) {
            const key = sortedEntries[i][0];
            this.state.cache.delete(key);
            this.state.accessFrequency.delete(key);
            this.removeFromAccessOrder(key);
            this.recordEviction();
        }
    },

    /**
     * Evictar usando política FIFO (First In First Out)
     * @param {number} count - Número de entradas a evictar
     */
    evictFIFO: function(count) {
        const entries = Array.from(this.state.cache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        for (let i = 0; i < count && i < entries.length; i++) {
            const key = entries[i][0];
            this.state.cache.delete(key);
            this.state.accessFrequency.delete(key);
            this.removeFromAccessOrder(key);
            this.recordEviction();
        }
    },

    /**
     * Actualizar patrones de acceso
     * @param {string} key - Clave
     * @param {string} action - Acción (hit/set)
     */
    updateAccessPattern: function(key, action) {
        let pattern = this.predictions.accessPatterns.get(key);
        
        if (!pattern) {
            pattern = {
                firstAccess: Date.now(),
                lastAccess: Date.now(),
                accessCount: 0,
                hitCount: 0,
                setCount: 0
            };
            this.predictions.accessPatterns.set(key, pattern);
        }
        
        pattern.lastAccess = Date.now();
        pattern.accessCount++;
        
        if (action === 'hit') {
            pattern.hitCount++;
        } else if (action === 'set') {
            pattern.setCount++;
        }
        
        // Actualizar claves hot/cold
        this.updateHotColdKeys(key, pattern);
    },

    /**
     * Actualizar claves hot/cold basado en patrones
     * @param {string} key - Clave
     * @param {Object} pattern - Patrón de acceso
     */
    updateHotColdKeys: function(key, pattern) {
        const accessRate = pattern.accessCount / (Date.now() - pattern.firstAccess);
        
        // Clave hot si tiene alta tasa de acceso
        if (accessRate > 0.01) {
            this.predictions.hotKeys.add(key);
            this.predictions.coldKeys.delete(key);
        }
        // Clave cold si tiene baja tasa de acceso
        else if (accessRate < 0.001 && pattern.accessCount > 5) {
            this.predictions.coldKeys.add(key);
            this.predictions.hotKeys.delete(key);
        }
    },

    /**
     * Eliminar de patrones de acceso
     * @param {string} key - Clave a eliminar
     */
    removeFromAccessPatterns: function(key) {
        this.predictions.accessPatterns.delete(key);
        this.predictions.hotKeys.delete(key);
        this.predictions.coldKeys.delete(key);
    },

    /**
     * Configurar limpieza periódica
     */
    setupPeriodicCleanup: function() {
        setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    },

    /**
     * Configurar análisis de patrones
     */
    setupPatternAnalysis: function() {
        setInterval(() => {
            this.analyzePatterns();
        }, 5 * 60 * 1000); // Cada 5 minutos
    },

    /**
     * Limpiar entradas expiradas
     */
    cleanup: function() {
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, entry] of this.state.cache.entries()) {
            if (now - entry.timestamp > this.config.maxAge) {
                keysToDelete.push(key);
            } else if (this.isExpired(entry)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            this.delete(key);
        });
        
        this.state.metrics.lastCleanupTime = new Date().toISOString();
        
        if (keysToDelete.length > 0) {
            console.log(`🧹 Cleanup: ${keysToDelete.length} entradas eliminadas`);
        }
    },

    /**
     * Analizar patrones de acceso
     */
    analyzePatterns: function() {
        // Actualizar estadísticas de compresión
        const total = this.state.compressionStats.compressed + this.state.compressionStats.uncompressed;
        if (total > 0) {
            this.state.compressionStats.compressionRatio = 
                this.state.compressionStats.compressed / total;
        }
        
        // Predecir próximas claves hot
        if (this.config.predictionEnabled) {
            this.predictHotKeys();
        }
        
        console.log('📊 Análisis de patrones completado');
    },

    /**
     * Predecir próximas claves hot
     */
    predictHotKeys: function() {
        // Implementar algoritmo de predicción basado en patrones históricos
        const patterns = Array.from(this.predictions.accessPatterns.entries())
            .sort((a, b) => b[1].accessCount - a[1].accessCount)
            .slice(0, 10); // Top 10
        
        // Actualizar predicciones
        patterns.forEach(([key, pattern]) => {
            const trend = this.calculateAccessTrend(pattern);
            if (trend > 0.5) { // Tendencia creciente
                this.predictions.hotKeys.add(key);
            }
        });
    },

    /**
     * Calcular tendencia de acceso
     * @param {Object} pattern - Patrón de acceso
     * @returns {number} Tendencia (0-1)
     */
    calculateAccessTrend: function(pattern) {
        const timeSpan = pattern.lastAccess - pattern.firstAccess;
        const accessRate = pattern.accessCount / timeSpan;
        
        // Normalizar a 0-1
        return Math.min(1, accessRate * 1000);
    },

    /**
     * Cargar datos desde persistencia
     */
    loadFromPersistence: function() {
        try {
            if (typeof localStorage !== 'undefined') {
                const data = localStorage.getItem(this.config.persistenceKey);
                if (data) {
                    const parsed = JSON.parse(data);
                    this.state.cache = new Map(parsed.cache || []);
                    this.state.accessOrder = parsed.accessOrder || [];
                    this.state.accessFrequency = new Map(parsed.accessFrequency || []);
                    
                    console.log('📂 Datos cargados desde persistencia');
                }
            }
        } catch (error) {
            console.warn('⚠️ Error cargando desde persistencia:', error);
        }
    },

    /**
     * Guardar datos a persistencia
     */
    saveToPersistence: function() {
        try {
            if (typeof localStorage !== 'undefined') {
                const data = {
                    cache: Array.from(this.state.cache.entries()),
                    accessOrder: this.state.accessOrder,
                    accessFrequency: Array.from(this.state.accessFrequency.entries())
                };
                
                localStorage.setItem(this.config.persistenceKey, JSON.stringify(data));
            }
        } catch (error) {
            console.warn('⚠️ Error guardando a persistencia:', error);
        }
    },

    /**
     * Registrar hit en métricas
     */
    recordHit: function() {
        if (this.config.enableMetrics) {
            this.state.metrics.hits++;
        }
    },

    /**
     * Registrar miss en métricas
     */
    recordMiss: function() {
        if (this.config.enableMetrics) {
            this.state.metrics.misses++;
        }
    },

    /**
     * Registro de set en métricas
     */
    recordSet: function() {
        if (this.config.enableMetrics) {
            this.state.metrics.sets++;
        }
    },

    /**
     * Registro de delete en métricas
     */
    recordDelete: function() {
        if (this.config.enableMetrics) {
            this.state.metrics.deletes++;
        }
    },

    /**
     * Registro de evicción en métricas
     */
    recordEviction: function() {
        if (this.config.enableMetrics) {
            this.state.metrics.evictions++;
        }
    },

    /**
     * Registro de tiempo de acceso
     * @param {number} accessTime - Tiempo de acceso en ms
     */
    recordAccessTime: function(accessTime) {
        if (this.config.enableMetrics) {
            const total = this.state.metrics.hits + this.state.metrics.misses;
            this.state.metrics.averageAccessTime = 
                (this.state.metrics.averageAccessTime * (total - 1) + accessTime) / total;
        }
    },

    /**
     * Actualizar tamaño total del caché
     */
    updateTotalSize: function() {
        if (this.config.enableMetrics) {
            let totalSize = 0;
            for (const entry of this.state.cache.values()) {
                totalSize += entry.compressedSize || entry.originalSize || 0;
            }
            this.state.metrics.totalSize = totalSize;
        }
    },

    /**
     * Obtener estadísticas del caché
     * @returns {Object} Estadísticas completas
     */
    getStatistics: function() {
        const totalRequests = this.state.metrics.hits + this.state.metrics.misses;
        const hitRate = totalRequests > 0 ? (this.state.metrics.hits / totalRequests) * 100 : 0;
        
        return {
            config: this.config,
            metrics: {
                ...this.state.metrics,
                hitRate: Math.round(hitRate * 100) / 100,
                totalRequests: totalRequests,
                cacheSize: this.state.cache.size,
                maxSize: this.config.maxSize,
                utilizationRate: (this.state.cache.size / this.config.maxSize) * 100
            },
            compression: this.state.compressionStats,
            predictions: {
                hotKeysCount: this.predictions.hotKeys.size,
                coldKeysCount: this.predictions.coldKeys.size,
                patternsCount: this.predictions.accessPatterns.size
            },
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Obtener claves hot
     * @returns {Array} Lista de claves hot
     */
    getHotKeys: function() {
        return Array.from(this.predictions.hotKeys);
    },

    /**
     * Obtener claves cold
     * @returns {Array} Lista de claves cold
     */
    getColdKeys: function() {
        return Array.from(this.predictions.coldKeys);
    },

    /**
     * Generar informe de rendimiento
     * @returns {Object} Informe completo
     */
    generatePerformanceReport: function() {
        const stats = this.getStatistics();
        
        return {
            summary: {
                hitRate: stats.metrics.hitRate,
                cacheSize: stats.metrics.cacheSize,
                utilizationRate: stats.metrics.utilizationRate,
                averageAccessTime: stats.metrics.averageAccessTime,
                compressionRatio: stats.compression.compressionRatio
            },
            performance: {
                hits: stats.metrics.hits,
                misses: stats.metrics.misses,
                sets: stats.metrics.sets,
                evictions: stats.metrics.evictions,
                totalSize: stats.metrics.totalSize
            },
            predictions: {
                hotKeys: this.getHotKeys().slice(0, 10),
                coldKeys: this.getColdKeys().slice(0, 10)
            },
            recommendations: this.generateRecommendations(stats),
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Generar recomendaciones basadas en estadísticas
     * @param {Object} stats - Estadísticas del caché
     * @returns {Array} Lista de recomendaciones
     */
    generateRecommendations: function(stats) {
        const recommendations = [];
        
        // Recomendaciones de hit rate
        if (stats.metrics.hitRate < 50) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                title: 'Baja tasa de aciertos',
                description: 'Considerar ajustar TTL o estrategia de caché',
                action: 'adjust_cache_strategy'
            });
        }
        
        // Recomendaciones de utilización
        if (stats.metrics.utilizationRate > 90) {
            recommendations.push({
                type: 'capacity',
                priority: 'medium',
                title: 'Alta utilización del caché',
                description: 'Considerar aumentar el tamaño máximo',
                action: 'increase_cache_size'
            });
        }
        
        // Recomendaciones de compresión
        if (stats.compression.compressionRatio < 0.3) {
            recommendations.push({
                type: 'compression',
                priority: 'low',
                title: 'Baja eficiencia de compresión',
                description: 'Considerar ajustar umbral de compresión',
                action: 'adjust_compression_threshold'
            });
        }
        
        return recommendations;
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.QueryCache = QueryCache;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = QueryCache;
}