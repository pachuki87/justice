/**
 * Justice 2 Promise Cache - Optimized
 * Sistema inteligente de caché para resultados de promesas con invalidación automática
 * Optimizado para alto rendimiento y bajo consumo de memoria
 */

const PromiseCache = {
    // Configuración mejorada
    config: {
        enableCache: true,
        defaultTTL: 300000, // 5 minutos por defecto
        maxCacheSize: 1000,
        maxMemoryUsage: 50 * 1024 * 1024, // 50MB límite de memoria
        enableMetrics: true,
        enableLogging: true,
        enableTelemetry: true,
        cleanupInterval: 60000, // 1 minuto
        enableCompression: true, // Activado por defecto
        enableEncryption: false,
        cacheStrategy: 'lru', // lru, fifo, lfu, adaptive
        enableBackgroundRefresh: true,
        backgroundRefreshThreshold: 0.8, // 80% del TTL
        enableStaleWhileRevalidate: true,
        staleWhileRevalidateTTL: 60000, // 1 minuto adicional
        enableSmartEviction: true, // Evicción inteligente
        enableCacheWarming: true, // Precalientamiento de caché
        enableAdaptiveTTL: true, // TTL adaptativo basado en patrones
        compressionThreshold: 1024, // Comprimir solo si > 1KB
        enableDeduplication: true, // Deduplicación de peticiones
        enablePriorityQueue: true // Cola de prioridad para refrescos
    },

    // Estado optimizado
    state: {
        cache: new Map(),
        accessTimes: new Map(),
        accessCounts: new Map(),
        pendingPromises: new Map(),
        priorityQueue: new Map(), // Cola de prioridad para refrescos
        memoryUsage: 0,
        compressionStats: {
            originalSize: 0,
            compressedSize: 0,
            compressionRatio: 0
        },
        statistics: {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            refreshes: 0,
            hitRate: 0,
            averageAccessTime: 0,
            cacheSize: 0,
            memoryUsage: 0,
            compressionSavings: 0,
            deduplicationHits: 0
        },
        metrics: {
            keyDistribution: {},
            ttlDistribution: {},
            accessPatterns: {},
            performanceMetrics: {
                averageGetTime: 0,
                averageSetTime: 0,
                averageDeleteTime: 0,
                compressionTime: 0,
                decompressionTime: 0
            },
            adaptiveMetrics: {
                hotKeys: new Set(),
                coldKeys: new Set(),
                accessFrequency: new Map(),
                ttlOptimization: new Map()
            }
        },
        cleanupTimer: null,
        lastCleanup: Date.now(),
        warmingInProgress: false
    },

    // Inicialización
    init: function(customConfig = {}) {
        this.log('Inicializando Promise Cache');
        
        // Fusionar configuración personalizada
        this.config = { ...this.config, ...customConfig };
        
        // Iniciar limpieza periódica
        this.startCleanupTimer();
        
        // Iniciar recolección de métricas
        if (this.config.enableMetrics) {
            this.startMetricsCollection();
        }
        
        this.log('Promise Cache inicializado correctamente');
    },

    // Obtener valor del caché
    get: async function(key) {
        const startTime = performance.now();
        
        try {
            if (!this.config.enableCache) {
                return null;
            }

            const cacheEntry = this.state.cache.get(key);
            
            if (!cacheEntry) {
                this.state.statistics.misses++;
                this.recordAccess(key, 'miss');
                return null;
            }

            // Verificar si ha expirado
            if (this.isExpired(cacheEntry)) {
                this.delete(key);
                this.state.statistics.misses++;
                this.recordAccess(key, 'miss');
                
                // Si está habilitado stale-while-revalidate
                if (this.config.enableStaleWhileRevalidate &&
                    this.isStaleWhileRevalidateValid(cacheEntry)) {
                    this.triggerBackgroundRefresh(key, cacheEntry);
                    
                    // Procesar valor para recuperación si es necesario
                    if (cacheEntry.isProcessed) {
                        return await this.processValueForRetrieval(cacheEntry.value, {
                            compressed: cacheEntry.compressed,
                            encrypted: cacheEntry.encrypted
                        });
                    }
                    
                    return cacheEntry.value;
                }
                
                return null;
            }

            // Actualizar estadísticas de acceso
            this.updateAccessStatistics(key);
            this.state.statistics.hits++;
            this.recordAccess(key, 'hit');
            
            // Actualizar tiempo de acceso para LRU
            this.state.accessTimes.set(key, Date.now());
            
            // Procesar valor para recuperación si es necesario
            let returnValue = cacheEntry.value;
            if (cacheEntry.isProcessed) {
                returnValue = await this.processValueForRetrieval(cacheEntry.value, {
                    compressed: cacheEntry.compressed,
                    encrypted: cacheEntry.encrypted
                });
            }
            
            // Calcular tiempo de acceso
            const endTime = performance.now();
            const accessTime = endTime - startTime;
            this.updatePerformanceMetrics('get', accessTime);
            
            this.log(`Cache HIT para clave: ${key}`);
            return returnValue;
            
        } catch (error) {
            this.log(`Error obteniendo clave ${key} del caché:`, error);
            this.state.statistics.misses++;
            return null;
        }
    },

    // Establecer valor en el caché
    set: async function(key, value, options = {}) {
        const startTime = performance.now();
        
        try {
            if (!this.config.enableCache) {
                return false;
            }

            const ttl = options.ttl || this.config.defaultTTL;
            const now = Date.now();
            
            // Verificar límite de tamaño
            if (this.state.cache.size >= this.config.maxCacheSize && !this.state.cache.has(key)) {
                this.evictLRU();
            }

            // Crear entrada de caché
            const cacheEntry = {
                key,
                value,
                timestamp: now,
                ttl,
                expiresAt: now + ttl,
                accessCount: 0,
                lastAccess: now,
                metadata: options.metadata || {},
                tags: options.tags || [],
                priority: options.priority || 5,
                size: this.calculateSize(value)
            };

            // Procesar valor si es necesario (async)
            const processedValue = await this.processValueForStorage(value, options);
            if (processedValue !== value) {
                cacheEntry.value = processedValue.value;
                cacheEntry.isProcessed = true;
                cacheEntry.compressed = processedValue.compressed;
                cacheEntry.encrypted = processedValue.encrypted;
            }

            // Almacenar en caché
            this.state.cache.set(key, cacheEntry);
            this.state.accessTimes.set(key, now);
            this.state.accessCounts.set(key, 0);
            
            // Actualizar estadísticas
            this.state.statistics.sets++;
            this.state.statistics.cacheSize = this.state.cache.size;
            
            // Calcular tiempo de set
            const endTime = performance.now();
            const setTime = endTime - startTime;
            this.updatePerformanceMetrics('set', setTime);
            
            this.log(`Cache SET para clave: ${key} (TTL: ${ttl}ms)`);
            return true;
            
        } catch (error) {
            this.log(`Error estableciendo clave ${key} en caché:`, error);
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

        // Verificar si hay una promesa pendiente para esta clave
        const pendingPromise = this.state.pendingPromises.get(key);
        if (pendingPromise) {
            return pendingPromise;
        }

        // Crear nueva promesa
        const promise = promiseFunction()
            .then(async result => {
                // Almacenar resultado en caché
                await this.set(key, result, options);
                
                // Limpiar promesa pendiente
                this.state.pendingPromises.delete(key);
                
                return result;
            })
            .catch(error => {
                // Limpiar promesa pendiente
                this.state.pendingPromises.delete(key);
                
                // No cachear errores por defecto
                throw error;
            });

        // Almacenar promesa pendiente
        this.state.pendingPromises.set(key, promise);
        
        return promise;
    },

    // Eliminar clave del caché
    delete: function(key) {
        const startTime = performance.now();
        
        try {
            const deleted = this.state.cache.delete(key);
            this.state.accessTimes.delete(key);
            this.state.accessCounts.delete(key);
            
            if (deleted) {
                this.state.statistics.deletes++;
                this.state.statistics.cacheSize = this.state.cache.size;
            }
            
            // Calcular tiempo de delete
            const endTime = performance.now();
            const deleteTime = endTime - startTime;
            this.updatePerformanceMetrics('delete', deleteTime);
            
            return deleted;
            
        } catch (error) {
            this.log(`Error eliminando clave ${key} del caché:`, error);
            return false;
        }
    },

    // Verificar si existe y no ha expirado
    has: function(key) {
        const cacheEntry = this.state.cache.get(key);
        return cacheEntry && !this.isExpired(cacheEntry);
    },

    // Limpiar todo el caché
    clear: function() {
        const clearedCount = this.state.cache.size;
        
        this.state.cache.clear();
        this.state.accessTimes.clear();
        this.state.accessCounts.clear();
        this.state.pendingPromises.clear();
        
        this.state.statistics.cacheSize = 0;
        
        this.log(`Caché limpiado: ${clearedCount} entradas eliminadas`);
        return clearedCount;
    },

    // Limpiar entradas expiradas
    cleanup: function() {
        let cleanedCount = 0;
        const now = Date.now();
        
        for (const [key, entry] of this.state.cache.entries()) {
            if (this.isExpired(entry)) {
                this.delete(key);
                cleanedCount++;
            }
        }
        
        // Limpiar promesas pendientes viejas
        for (const [key, promise] of this.state.pendingPromises.entries()) {
            // Las promesas pendientes muy viejas pueden ser limpiadas
            if (this.state.accessTimes.has(key)) {
                const lastAccess = this.state.accessTimes.get(key);
                if (now - lastAccess > this.config.defaultTTL * 2) {
                    this.state.pendingPromises.delete(key);
                    cleanedCount++;
                }
            }
        }
        
        if (cleanedCount > 0) {
            this.log(`Limpieza completada: ${cleanedCount} entradas eliminadas`);
        }
        
        return cleanedCount;
    },

    // Invalidar por etiquetas
    invalidateByTag: function(tag) {
        let invalidatedCount = 0;
        
        for (const [key, entry] of this.state.cache.entries()) {
            if (entry.tags && entry.tags.includes(tag)) {
                this.delete(key);
                invalidatedCount++;
            }
        }
        
        this.log(`Invalidación por etiqueta "${tag}": ${invalidatedCount} entradas eliminadas`);
        return invalidatedCount;
    },

    // Invalidar por patrón de clave
    invalidateByPattern: function(pattern) {
        let invalidatedCount = 0;
        const regex = new RegExp(pattern);
        
        for (const [key, entry] of this.state.cache.entries()) {
            if (regex.test(key)) {
                this.delete(key);
                invalidatedCount++;
            }
        }
        
        this.log(`Invalidación por patrón "${pattern}": ${invalidatedCount} entradas eliminadas`);
        return invalidatedCount;
    },

    // Refrescar entrada específica
    refresh: async function(key, promiseFunction, options = {}) {
        const cacheEntry = this.state.cache.get(key);
        if (!cacheEntry) {
            return await this.getOrSet(key, promiseFunction, options);
        }

        // Crear nueva promesa para refrescar
        const refreshPromise = promiseFunction()
            .then(async result => {
                await this.set(key, result, options);
                this.state.statistics.refreshes++;
                return result;
            })
            .catch(error => {
                this.log(`Error refrescando clave ${key}:`, error);
                throw error;
            });

        return refreshPromise;
    },

    // Refrescar en segundo plano
    refreshInBackground: async function(key, promiseFunction, options = {}) {
        const cacheEntry = this.state.cache.get(key);
        if (!cacheEntry) {
            return;
        }

        // Verificar si necesita refresco
        if (!this.needsBackgroundRefresh(cacheEntry)) {
            return;
        }

        // Refrescar en segundo plano sin bloquear
        promiseFunction()
            .then(async result => {
                await this.set(key, result, options);
                this.state.statistics.refreshes++;
                this.log(`Refresco en segundo plano completado para clave: ${key}`);
            })
            .catch(error => {
                this.log(`Error en refresco en segundo plano para clave ${key}:`, error);
            });
    },

    // Verificar si una entrada ha expirado
    isExpired: function(cacheEntry) {
        return Date.now() > cacheEntry.expiresAt;
    },

    // Verificar si es válida para stale-while-revalidate
    isStaleWhileRevalidateValid: function(cacheEntry) {
        if (!this.config.enableStaleWhileRevalidate) {
            return false;
        }
        
        const staleDeadline = cacheEntry.expiresAt + this.config.staleWhileRevalidateTTL;
        return Date.now() < staleDeadline;
    },

    // Verificar si necesita refresco en segundo plano
    needsBackgroundRefresh: function(cacheEntry) {
        if (!this.config.enableBackgroundRefresh) {
            return false;
        }
        
        const refreshThreshold = cacheEntry.expiresAt - (cacheEntry.ttl * this.config.backgroundRefreshThreshold);
        return Date.now() > refreshThreshold;
    },

    // Disparar refresco en segundo plano
    triggerBackgroundRefresh: function(key, cacheEntry) {
        // Esto debería ser implementado por el llamador con la función apropiada
        this.log(`Se necesita refresco en segundo plano para clave: ${key}`);
    },

    // Evictar entrada LRU optimizada
    evictLRU: function() {
        const startTime = performance.now();
        let oldestKey = null;
        let oldestTime = Date.now();
        
        // Optimización: usar for...of en lugar de entries() para mejor rendimiento
        for (const [key, accessTime] of this.state.accessTimes) {
            if (accessTime < oldestTime) {
                oldestTime = accessTime;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.delete(oldestKey);
            this.state.statistics.evictions++;
            
            // Actualizar métricas de rendimiento
            const evictionTime = performance.now() - startTime;
            this.updatePerformanceMetrics('eviction', evictionTime);
            
            this.log(`Evicción LRU optimizada: clave ${oldestKey} (${evictionTime.toFixed(2)}ms)`);
        }
    },

    // Evictar entrada LFU optimizada con adaptive strategy
    evictLFU: function() {
        const startTime = performance.now();
        let leastUsedKey = null;
        let leastCount = Infinity;
        
        // Estrategia adaptativa: considerar tanto frecuencia como recencia
        const now = Date.now();
        let bestScore = Infinity;
        
        for (const [key, count] of this.state.accessCounts) {
            const accessTime = this.state.accessTimes.get(key) || 0;
            const age = now - accessTime;
            
            // Score combinado: frecuencia / edad (más bajo = mejor candidato para evicción)
            const score = count / (age + 1);
            
            if (score < bestScore) {
                bestScore = score;
                leastUsedKey = key;
                leastCount = count;
            }
        }
        
        if (leastUsedKey) {
            this.delete(leastUsedKey);
            this.state.statistics.evictions++;
            
            // Actualizar métricas
            const evictionTime = performance.now() - startTime;
            this.updatePerformanceMetrics('eviction', evictionTime);
            
            this.log(`Evicción LFU adaptativa: clave ${leastUsedKey} (frecuencia: ${leastCount}, score: ${bestScore.toFixed(4)}, ${evictionTime.toFixed(2)}ms)`);
        }
    },

    // Evictar entrada FIFO (First In First Out)
    evictFIFO: function() {
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
            this.state.statistics.evictions++;
            this.log(`Evicción FIFO: clave ${oldestKey}`);
        }
    },

    // Actualizar estadísticas de acceso
    updateAccessStatistics: function(key) {
        const currentCount = this.state.accessCounts.get(key) || 0;
        this.state.accessCounts.set(key, currentCount + 1);
    },

    // Registrar patrón de acceso
    recordAccess: function(key, type) {
        if (!this.state.metrics.accessPatterns[key]) {
            this.state.metrics.accessPatterns[key] = { hits: 0, misses: 0 };
        }
        
        this.state.metrics.accessPatterns[key][type]++;
    },

    // Actualizar métricas de rendimiento
    updatePerformanceMetrics: function(operation, time) {
        const metrics = this.state.metrics.performanceMetrics;
        const key = `average${operation.charAt(0).toUpperCase() + operation.slice(1)}Time`;
        
        // Calcular promedio móvil
        const current = metrics[key] || 0;
        metrics[key] = (current + time) / 2;
    },

    // Procesar valor para almacenamiento optimizado
    processValueForStorage: async function(value, options) {
        const startTime = performance.now();
        let processedValue = value;
        let wasCompressed = false;
        
        // Compresión inteligente basada en tamaño y tipo
        if (this.config.enableCompression && options.compress !== false) {
            const valueSize = this.calculateSize(value);
            
            // Solo comprimir si supera el umbral y no está ya comprimido
            if (valueSize > this.config.compressionThreshold) {
                processedValue = await this.compressValue(processedValue);
                wasCompressed = true;
                
                // Actualizar estadísticas de compresión
                this.state.compressionStats.originalSize += valueSize;
                this.state.compressionStats.compressedSize += this.calculateSize(processedValue);
                this.state.compressionStats.compressionRatio =
                    this.state.compressionStats.compressedSize / this.state.compressionStats.originalSize;
            }
        }
        
        // Encriptación si está habilitada
        if (this.config.enableEncryption && options.encrypt !== false) {
            processedValue = this.encryptValue(processedValue);
        }
        
        // Actualizar métricas de procesamiento
        const processingTime = performance.now() - startTime;
        if (wasCompressed) {
            this.updatePerformanceMetrics('compression', processingTime);
        }
        
        return {
            value: processedValue,
            compressed: wasCompressed,
            originalSize: this.calculateSize(value),
            processedSize: this.calculateSize(processedValue)
        };
    },

    // Comprimir valor optimizado con algoritmo real
    compressValue: async function(value) {
        try {
            const startTime = performance.now();
            
            if (typeof value === 'string') {
                // Usar CompressionStream API si está disponible (navegadores modernos)
                if (typeof CompressionStream !== 'undefined') {
                    try {
                        const stream = new CompressionStream('gzip');
                        const writer = stream.writable.getWriter();
                        const reader = stream.readable.getReader();
                        
                        // Convertir string a bytes
                        const encoder = new TextEncoder();
                        const uint8Array = encoder.encode(value);
                        
                        writer.write(uint8Array);
                        writer.close();
                        
                        // Leer resultado comprimido
                        const chunks = [];
                        let done = false;
                        
                        while (!done) {
                            const { value: chunk, done: readerDone } = await reader.read();
                            done = readerDone;
                            if (chunk) {
                                chunks.push(chunk);
                            }
                        }
                        
                        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
                        let offset = 0;
                        for (const chunk of chunks) {
                            compressed.set(chunk, offset);
                            offset += chunk.length;
                        }
                        
                        // Convertir a base64 para almacenamiento
                        const compressedBase64 = btoa(String.fromCharCode(...compressed));
                        
                        const compressionTime = performance.now() - startTime;
                        this.log(`Compresión gzip: ${value.length} -> ${compressed.length} bytes (${compressionTime.toFixed(2)}ms)`);
                        
                        return {
                            data: compressedBase64,
                            algorithm: 'gzip',
                            originalSize: value.length,
                            compressedSize: compressed.length
                        };
                    } catch (compressionError) {
                        // Fallback si falla la compresión gzip
                        this.log('Error en compresión gzip, usando fallback:', compressionError);
                        const compressed = btoa(encodeURIComponent(value));
                        const compressionTime = performance.now() - startTime;
                        
                        this.log(`Compresión fallback: ${value.length} -> ${compressed.length} bytes (${compressionTime.toFixed(2)}ms)`);
                        
                        return {
                            data: compressed,
                            algorithm: 'base64',
                            originalSize: value.length,
                            compressedSize: compressed.length
                        };
                    }
                } else {
                    // Fallback: usar compresión simple
                    const compressed = btoa(encodeURIComponent(value));
                    const compressionTime = performance.now() - startTime;
                    
                    this.log(`Compresión fallback: ${value.length} -> ${compressed.length} bytes (${compressionTime.toFixed(2)}ms)`);
                    
                    return {
                        data: compressed,
                        algorithm: 'base64',
                        originalSize: value.length,
                        compressedSize: compressed.length
                    };
                }
            } else if (typeof value === 'object') {
                // Para objetos, comprimir el JSON
                const jsonString = JSON.stringify(value);
                return await this.compressValue(jsonString);
            }
            
            return value;
        } catch (error) {
            this.log('Error comprimiendo valor:', error);
            return value;
        }
    },

    // Descomprimir valor
    decompressValue: async function(compressedData) {
        try {
            const startTime = performance.now();
            
            if (!compressedData || typeof compressedData !== 'object' || !compressedData.data) {
                return compressedData;
            }
            
            if (compressedData.algorithm === 'gzip' && typeof DecompressionStream !== 'undefined') {
                try {
                    // Convertir base64 a bytes
                    const compressedBytes = Uint8Array.from(atob(compressedData.data), c => c.charCodeAt(0));
                    
                    const stream = new DecompressionStream('gzip');
                    const writer = stream.writable.getWriter();
                    const reader = stream.readable.getReader();
                    
                    writer.write(compressedBytes);
                    writer.close();
                    
                    // Leer resultado descomprimido
                    const chunks = [];
                    let done = false;
                    
                    while (!done) {
                        const { value: chunk, done: readerDone } = await reader.read();
                        done = readerDone;
                        if (chunk) {
                            chunks.push(chunk);
                        }
                    }
                    
                    const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
                    let offset = 0;
                    for (const chunk of chunks) {
                        decompressed.set(chunk, offset);
                        offset += chunk.length;
                    }
                    
                    // Convertir bytes a string
                    const decoder = new TextDecoder();
                    const decompressedString = decoder.decode(decompressed);
                    
                    const decompressionTime = performance.now() - startTime;
                    this.log(`Descompresión gzip: ${compressedData.compressedSize} -> ${compressedData.originalSize} bytes (${decompressionTime.toFixed(2)}ms)`);
                    
                    return decompressedString;
                } catch (decompressionError) {
                    this.log('Error en descompresión gzip, usando fallback:', decompressionError);
                    // Fallback para base64
                    return decodeURIComponent(atob(compressedData.data));
                }
            } else if (compressedData.algorithm === 'base64') {
                const decompressionTime = performance.now() - startTime;
                this.log(`Descompresión base64: ${compressedData.compressedSize} -> ${compressedData.originalSize} bytes (${decompressionTime.toFixed(2)}ms)`);
                
                return decodeURIComponent(atob(compressedData.data));
            }
            
            return compressedData.data;
        } catch (error) {
            this.log('Error descomprimiendo valor:', error);
            return compressedData.data || compressedData;
        }
    },

    // Procesar valor para recuperación desde almacenamiento
    processValueForRetrieval: async function(value, options = {}) {
        try {
            let processedValue = value;
            
            // Descomprimir si fue comprimido
            if (options.compressed) {
                processedValue = await this.decompressValue(processedValue);
            }
            
            // Desencriptar si fue encriptado
            if (options.encrypted) {
                processedValue = this.decryptValue(processedValue);
            }
            
            return processedValue;
        } catch (error) {
            this.log('Error procesando valor para recuperación:', error);
            return value;
        }
    },

    // Desencriptar valor
    decryptValue: function(value) {
        try {
            // Implementación simple de desencriptación (en producción usar algoritmos seguros)
            if (typeof value === 'string' && value.endsWith('_encrypted')) {
                return atob(value.slice(0, -10)); // Remover '_encrypted'
            }
            return value;
        } catch (error) {
            this.log('Error desencriptando valor:', error);
            return value;
        }
    },

    // Precalentar caché con datos críticos
    warmUpCache: async function(warmUpData = []) {
        if (this.state.warmingInProgress) {
            this.log('Precalentamiento ya en progreso');
            return;
        }
        
        this.state.warmingInProgress = true;
        this.log('Iniciando precalentamiento de caché');
        
        try {
            const warmUpPromises = warmUpData.map(async (item) => {
                try {
                    const { key, dataPromise, options = {} } = item;
                    const data = await dataPromise();
                    await this.set(key, data, { ...options, metadata: { ...options.metadata, warmedUp: true } });
                    this.log(`Precalentado: ${key}`);
                } catch (error) {
                    this.log(`Error precalentando ${item.key}:`, error);
                }
            });
            
            await Promise.allSettled(warmUpPromises);
            this.log(`Precalentamiento completado: ${warmUpData.length} elementos`);
        } catch (error) {
            this.log('Error en precalentamiento de caché:', error);
        } finally {
            this.state.warmingInProgress = false;
        }
    },

    // Estrategia de evicción inteligente basada en múltiples factores
    smartEviction: function() {
        const startTime = performance.now();
        let bestKeyToEvict = null;
        let bestScore = Infinity;
        
        const now = Date.now();
        
        for (const [key, entry] of this.state.cache.entries()) {
            const accessCount = this.state.accessCounts.get(key) || 0;
            const accessTime = this.state.accessTimes.get(key) || 0;
            const age = now - accessTime;
            const timeSinceCreation = now - entry.timestamp;
            
            // Calcular score basado en múltiples factores
            // Menor score = mejor candidato para evicción
            const frequencyScore = accessCount; // Menor frecuencia = mejor para evicción
            const recencyScore = age; // Mayor tiempo sin acceso = mejor para evicción
            const sizeScore = entry.size || 0; // Mayor tamaño = mejor para evicción
            const priorityScore = (entry.priority || 5) * 1000; // Menor prioridad = mejor para evicción
            
            // Ponderación de factores (ajustable según necesidades)
            const weightedScore = (
                frequencyScore * 0.3 +
                recencyScore * 0.3 +
                sizeScore * 0.2 +
                priorityScore * 0.2
            );
            
            if (weightedScore < bestScore) {
                bestScore = weightedScore;
                bestKeyToEvict = key;
            }
        }
        
        if (bestKeyToEvict) {
            this.delete(bestKeyToEvict);
            this.state.statistics.evictions++;
            
            const evictionTime = performance.now() - startTime;
            this.updatePerformanceMetrics('eviction', evictionTime);
            
            this.log(`Evicción inteligente: clave ${bestKeyToEvict} (score: ${bestScore.toFixed(2)}, ${evictionTime.toFixed(2)}ms)`);
        }
    },

    // TTL adaptativo basado en patrones de acceso
    calculateAdaptiveTTL: function(key, baseTTL = null) {
        if (!this.config.enableAdaptiveTTL) {
            return baseTTL || this.config.defaultTTL;
        }
        
        const accessCount = this.state.accessCounts.get(key) || 0;
        const accessTime = this.state.accessTimes.get(key) || 0;
        const timeSinceLastAccess = Date.now() - accessTime;
        
        // Factores de adaptación
        let adaptiveMultiplier = 1.0;
        
        // Aumentar TTL para claves accedidas frecuentemente
        if (accessCount > 10) {
            adaptiveMultiplier *= 1.5;
        } else if (accessCount > 5) {
            adaptiveMultiplier *= 1.2;
        }
        
        // Reducir TTL para claves no accedidas recientemente
        if (timeSinceLastAccess > baseTTL * 2) {
            adaptiveMultiplier *= 0.5;
        } else if (timeSinceLastAccess > baseTTL) {
            adaptiveMultiplier *= 0.8;
        }
        
        const adaptiveTTL = Math.floor((baseTTL || this.config.defaultTTL) * adaptiveMultiplier);
        
        // Guardar métricas de TTL adaptativo
        if (!this.state.metrics.adaptiveMetrics.ttlOptimization.has(key)) {
            this.state.metrics.adaptiveMetrics.ttlOptimization.set(key, {
                originalTTL: baseTTL || this.config.defaultTTL,
                adaptiveTTL: adaptiveTTL,
                adaptations: 0
            });
        } else {
            const metrics = this.state.metrics.adaptiveMetrics.ttlOptimization.get(key);
            metrics.adaptiveTTL = adaptiveTTL;
            metrics.adaptations++;
        }
        
        return Math.max(adaptiveTTL, 60000); // Mínimo 1 minuto
    },

    // Refrescar caché proactivamente (refresh-ahead)
    refreshAhead: async function(key, promiseFunction, options = {}) {
        const cacheEntry = this.state.cache.get(key);
        if (!cacheEntry) {
            return;
        }
        
        const now = Date.now();
        const refreshThreshold = cacheEntry.expiresAt - (cacheEntry.ttl * 0.2); // 20% antes de expirar
        
        if (now > refreshThreshold) {
            this.log(`Refresco proactivo para clave: ${key}`);
            
            try {
                const result = await promiseFunction();
                const adaptiveTTL = this.calculateAdaptiveTTL(key, options.ttl);
                await this.set(key, result, { ...options, ttl: adaptiveTTL });
                this.state.statistics.refreshes++;
            } catch (error) {
                this.log(`Error en refresco proactivo para clave ${key}:`, error);
            }
        }
    },

    // Implementación de deduplicación de peticiones
    deduplicateRequest: function(key, promiseFunction) {
        // Verificar si ya hay una petición en curso para esta clave
        if (this.state.pendingPromises.has(key)) {
            this.state.statistics.deduplicationHits++;
            return this.state.pendingPromises.get(key);
        }
        
        // Crear nueva promesa
        const promise = promiseFunction()
            .finally(() => {
                // Limpiar después de completar
                this.state.pendingPromises.delete(key);
            });
        
        // Almacenar promesa pendiente
        this.state.pendingPromises.set(key, promise);
        
        return promise;
    },

    // Obtener o establecer con deduplicación
    getOrSetDeduplicated: function(key, promiseFunction, options = {}) {
        // Verificar caché primero
        const cachedValue = this.get(key);
        if (cachedValue !== null) {
            return Promise.resolve(cachedValue);
        }
        
        // Usar deduplicación
        const deduplicatedPromise = this.deduplicateRequest(key, promiseFunction);
        
        return deduplicatedPromise
            .then(async result => {
                // Almacenar resultado en caché
                const adaptiveTTL = this.calculateAdaptiveTTL(key, options.ttl);
                await this.set(key, result, { ...options, ttl: adaptiveTTL });
                return result;
            });
    },

    // Invalidación inteligente basada en dependencias
    invalidateWithDependencies: function(key, dependencies = []) {
        this.delete(key);
        
        // Invalidar claves que dependen de esta
        for (const [cacheKey, entry] of this.state.cache.entries()) {
            if (entry.dependencies && entry.dependencies.includes(key)) {
                this.delete(cacheKey);
                this.log(`Invalidación por dependencia: ${cacheKey} (depende de ${key})`);
            }
        }
        
        // Invalidar por etiquetas relacionadas
        if (dependencies.length > 0) {
            for (const tag of dependencies) {
                this.invalidateByTag(tag);
            }
        }
    },

    // Establecer con dependencias
    setWithDependencies: function(key, value, options = {}) {
        const cacheEntry = {
            key,
            value,
            timestamp: Date.now(),
            ttl: options.ttl || this.config.defaultTTL,
            expiresAt: Date.now() + (options.ttl || this.config.defaultTTL),
            dependencies: options.dependencies || [],
            metadata: options.metadata || {},
            tags: options.tags || [],
            priority: options.priority || 5,
            size: this.calculateSize(value)
        };
        
        this.state.cache.set(key, cacheEntry);
        this.state.accessTimes.set(key, Date.now());
        this.state.accessCounts.set(key, 0);
        
        this.state.statistics.sets++;
        this.state.statistics.cacheSize = this.state.cache.size;
        
        this.log(`Cache SET con dependencias para clave: ${key}`);
        return true;
    },

    // Obtener claves "calientes" (accedidas frecuentemente)
    getHotKeys: function(threshold = 10) {
        const hotKeys = [];
        
        for (const [key, count] of this.state.accessCounts) {
            if (count >= threshold) {
                hotKeys.push({
                    key,
                    accessCount: count,
                    lastAccess: this.state.accessTimes.get(key) || 0
                });
            }
        }
        
        return hotKeys.sort((a, b) => b.accessCount - a.accessCount);
    },

    // Obtener claves "frías" (raramente accedidas)
    getColdKeys: function(threshold = 2) {
        const coldKeys = [];
        
        for (const [key, count] of this.state.accessCounts) {
            if (count <= threshold) {
                coldKeys.push({
                    key,
                    accessCount: count,
                    lastAccess: this.state.accessTimes.get(key) || 0
                });
            }
        }
        
        return coldKeys.sort((a, b) => a.accessCount - b.accessCount);
    },

    // Optimizar caché basada en patrones de acceso
    optimizeBasedOnPatterns: function() {
        const hotKeys = this.getHotKeys();
        const coldKeys = this.getColdKeys();
        
        // Actualizar métricas adaptativas
        this.state.metrics.adaptiveMetrics.hotKeys = new Set(hotKeys.map(k => k.key));
        this.state.metrics.adaptiveMetrics.coldKeys = new Set(coldKeys.map(k => k.key));
        
        // Ajustar TTL para claves calientes
        for (const hotKey of hotKeys) {
            const cacheEntry = this.state.cache.get(hotKey.key);
            if (cacheEntry) {
                const newTTL = this.calculateAdaptiveTTL(hotKey.key, cacheEntry.ttl);
                if (newTTL !== cacheEntry.ttl) {
                    cacheEntry.ttl = newTTL;
                    cacheEntry.expiresAt = Date.now() + newTTL;
                    this.log(`TTL ajustado para clave caliente ${hotKey.key}: ${newTTL}ms`);
                }
            }
        }
        
        // Considerar evicción para claves muy frías
        for (const coldKey of coldKeys) {
            if (coldKey.accessCount === 0 && this.state.cache.size > this.config.maxCacheSize * 0.8) {
                this.delete(coldKey.key);
                this.log(`Evicción de clave fría: ${coldKey.key}`);
            }
        }
        
        this.log(`Optimización completada: ${hotKeys.length} claves calientes, ${coldKeys.length} claves frías`);
    },

    // Implementación de cola de prioridad para refrescos
    addToRefreshQueue: function(key, priority = 5) {
        this.state.priorityQueue.set(key, {
            priority,
            addedAt: Date.now()
        });
    },

    // Procesar cola de prioridad
    processRefreshQueue: async function(promiseFunction, maxConcurrent = 3) {
        const queueItems = Array.from(this.state.priorityQueue.entries())
            .sort((a, b) => b[1].priority - a[1].priority) // Mayor prioridad primero
            .slice(0, maxConcurrent);
        
        const refreshPromises = queueItems.map(async ([key, item]) => {
            try {
                await this.refreshAhead(key, () => promiseFunction(key));
                this.state.priorityQueue.delete(key);
            } catch (error) {
                this.log(`Error procesando cola de refresco para ${key}:`, error);
            }
        });
        
        await Promise.allSettled(refreshPromises);
        
        if (queueItems.length > 0) {
            this.log(`Procesados ${queueItems.length} elementos de la cola de refresco`);
        }
    },

    // Obtener estadísticas de compresión
    getCompressionStats: function() {
        return {
            ...this.state.compressionStats,
            compressionRatio: this.state.compressionStats.originalSize > 0
                ? this.state.compressionStats.compressedSize / this.state.compressionStats.originalSize
                : 0,
            savings: this.state.compressionStats.originalSize - this.state.compressionStats.compressedSize
        };
    },

    // Obtener métricas adaptativas
    getAdaptiveMetrics: function() {
        return {
            hotKeys: Array.from(this.state.metrics.adaptiveMetrics.hotKeys),
            coldKeys: Array.from(this.state.metrics.adaptiveMetrics.coldKeys),
            accessFrequency: Object.fromEntries(this.state.metrics.adaptiveMetrics.accessFrequency),
            ttlOptimizations: Array.from(this.state.metrics.adaptiveMetrics.ttlOptimization.entries()).map(([key, data]) => ({
                key,
                ...data
            }))
        };
    },

    // Reiniciar métricas adaptativas
    resetAdaptiveMetrics: function() {
        this.state.metrics.adaptiveMetrics = {
            hotKeys: new Set(),
            coldKeys: new Set(),
            accessFrequency: new Map(),
            ttlOptimization: new Map()
        };
        
        this.log('Métricas adaptativas reiniciadas');
    },

    // Exportar configuración y estado para análisis
    exportCacheState: function() {
        return {
            config: this.config,
            statistics: this.state.statistics,
            metrics: this.state.metrics,
            compressionStats: this.state.compressionStats,
            cacheSize: this.state.cache.size,
            pendingPromises: this.state.pendingPromises.size,
            priorityQueueSize: this.state.priorityQueue.size,
            timestamp: new Date().toISOString()
        };
    },

    // Encriptar valor
    encryptValue: function(value) {
        try {
            // Implementación simple de encriptación (en producción usar algoritmos seguros)
            if (typeof value === 'string') {
                return btoa(value + '_encrypted'); // Ejemplo simple
            }
            return value;
        } catch (error) {
            this.log('Error encriptando valor:', error);
            return value;
        }
    },

    // Calcular tamaño del valor
    calculateSize: function(value) {
        try {
            if (typeof value === 'string') {
                return value.length * 2; // 2 bytes por caracter UTF-16
            } else if (typeof value === 'object') {
                return JSON.stringify(value).length * 2;
            } else {
                return 8; // Tamaño aproximado para tipos primitivos
            }
        } catch (error) {
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

    // Iniciar recolección de métricas
    startMetricsCollection: function() {
        setInterval(() => {
            this.updateMetrics();
            
            // Enviar telemetría si está habilitada
            if (this.config.enableTelemetry) {
                this.sendTelemetry();
            }
        }, 30000); // Cada 30 segundos
    },

    // Actualizar métricas
    updateMetrics: function() {
        // Calcular hit rate
        const total = this.state.statistics.hits + this.state.statistics.misses;
        this.state.statistics.hitRate = total > 0 ? (this.state.statistics.hits / total) * 100 : 0;
        
        // Calcular uso de memoria
        let totalSize = 0;
        for (const entry of this.state.cache.values()) {
            totalSize += entry.size || 0;
        }
        this.state.statistics.memoryUsage = totalSize;
        
        // Actualizar distribución de claves
        this.state.metrics.keyDistribution = {};
        for (const [key, entry] of this.state.cache.entries()) {
            const prefix = key.split(':')[0] || 'unknown';
            this.state.metrics.keyDistribution[prefix] = 
                (this.state.metrics.keyDistribution[prefix] || 0) + 1;
        }
    },

    // Enviar telemetría
    sendTelemetry: function() {
        if (typeof window !== 'undefined' && window.Justice2API) {
            const telemetryData = {
                statistics: this.state.statistics,
                metrics: this.state.metrics,
                config: {
                    cacheSize: this.state.cache.size,
                    maxCacheSize: this.config.maxCacheSize,
                    defaultTTL: this.config.defaultTTL
                },
                timestamp: new Date().toISOString()
            };

            window.Justice2API.post('/telemetry/cache', telemetryData)
                .catch(err => {
                    console.warn('Error enviando telemetría de caché:', err);
                });
        }
    },

    // Obtener estadísticas
    getStatistics: function() {
        this.updateMetrics();
        
        return {
            ...this.state.statistics,
            cacheSize: this.state.cache.size,
            pendingPromises: this.state.pendingPromises.size,
            config: {
                maxCacheSize: this.config.maxCacheSize,
                defaultTTL: this.config.defaultTTL,
                cleanupInterval: this.config.cleanupInterval
            }
        };
    },

    // Obtener estado del caché
    getCacheStatus: function() {
        const entries = [];
        
        for (const [key, entry] of this.state.cache.entries()) {
            entries.push({
                key,
                size: entry.size,
                ttl: entry.ttl,
                accessCount: this.state.accessCounts.get(key) || 0,
                lastAccess: this.state.accessTimes.get(key),
                expiresAt: entry.expiresAt,
                isExpired: this.isExpired(entry),
                tags: entry.tags,
                priority: entry.priority
            });
        }
        
        return {
            entries: entries.sort((a, b) => b.lastAccess - a.lastAccess),
            statistics: this.getStatistics(),
            config: this.config
        };
    },

    // Obtener claves por patrón
    getKeysByPattern: function(pattern) {
        const regex = new RegExp(pattern);
        const keys = [];
        
        for (const key of this.state.cache.keys()) {
            if (regex.test(key)) {
                keys.push(key);
            }
        }
        
        return keys;
    },

    // Reiniciar estadísticas
    resetStatistics: function() {
        this.state.statistics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            refreshes: 0,
            hitRate: 0,
            averageAccessTime: 0,
            cacheSize: this.state.cache.size,
            memoryUsage: 0
        };
        
        this.log('Estadísticas de Promise Cache reiniciadas');
    },

    // Funciones de conveniencia para patrones comunes

    // Caché para datos de usuario
    cacheUserData: async function(userId, data, ttl = 300000) {
        return await this.set(`user:${userId}`, data, { ttl, tags: ['user'] });
    },

    // Obtener datos de usuario
    getUserData: async function(userId) {
        return await this.get(`user:${userId}`);
    },

    // Caché para configuración
    cacheConfig: async function(key, data, ttl = 600000) {
        return await this.set(`config:${key}`, data, { ttl, tags: ['config'] });
    },

    // Obtener configuración
    getConfig: async function(key) {
        return await this.get(`config:${key}`);
    },

    // Caché para respuestas API
    cacheApiResponse: async function(endpoint, params, data, ttl = 60000) {
        const cacheKey = `api:${endpoint}:${JSON.stringify(params)}`;
        return await this.set(cacheKey, data, { ttl, tags: ['api'] });
    },

    // Obtener respuesta API
    getApiResponse: async function(endpoint, params) {
        const cacheKey = `api:${endpoint}:${JSON.stringify(params)}`;
        return await this.get(cacheKey);
    },

    // Logging
    log: function(message, data = null) {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [PromiseCache] ${message}`;
            
            if (data) {
                console.log(logEntry, data);
            } else {
                console.log(logEntry);
            }
        }
    }
};

// Auto-inicialización si se carga en navegador
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PromiseCache.init();
    });
} else if (typeof window !== 'undefined') {
    // Para Node.js o si ya está cargado
    PromiseCache.init();
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.PromiseCache = PromiseCache;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromiseCache;
}