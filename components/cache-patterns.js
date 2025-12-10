/**
 * Justice 2 Cache Patterns
 * Implementación de patrones avanzados de caché para Justice 2
 */

const CachePatterns = {
    // Cache-Aside Pattern (Lazy Loading)
    cacheAside: {
        /**
         * Implementación del patrón Cache-Aside
         * La aplicación maneja la caché explícitamente
         */
        get: async function(cache, key, fetchFunction, options = {}) {
            const {
                ttl = 300000, // 5 minutos por defecto
                strategy = 'default',
                tags = [],
                priority = 5
            } = options;
            
            try {
                // 1. Intentar obtener desde caché
                const cached = await cache.get(key, strategy);
                if (cached !== null) {
                    return {
                        data: cached,
                        fromCache: true,
                        hit: true
                    };
                }
                
                // 2. Si no está en caché, obtener de la fuente
                const data = await fetchFunction();
                
                // 3. Almacenar en caché para futuras solicitudes
                if (data !== null && data !== undefined) {
                    await cache.set(key, data, {
                        strategy,
                        ttl,
                        tags: ['cache-aside', ...tags],
                        priority
                    });
                }
                
                return {
                    data: data,
                    fromCache: false,
                    hit: false
                };
            } catch (error) {
                console.error('Error en Cache-Aside pattern:', error);
                throw error;
            }
        },
        
        /**
         * Invalidación específica para Cache-Aside
         */
        invalidate: async function(cache, key, strategy = 'default') {
            try {
                await cache.delete(key, strategy);
            } catch (error) {
                console.error('Error invalidando caché en Cache-Aside:', error);
                throw error;
            }
        }
    },
    
    // Read-Through Pattern
    readThrough: {
        /**
         * Implementación del patrón Read-Through
         * La caché se encarga de obtener los datos si no están disponibles
         */
        get: async function(cache, key, fetchFunction, options = {}) {
            const {
                ttl = 300000,
                strategy = 'default',
                tags = [],
                priority = 5
            } = options;
            
            try {
                // 1. Intentar obtener desde caché
                const cached = await cache.get(key, strategy);
                if (cached !== null) {
                    return {
                        data: cached,
                        fromCache: true,
                        hit: true
                    };
                }
                
                // 2. Si no está en caché, obtener y cachear automáticamente
                const data = await fetchFunction();
                
                // 3. Almacenar en caché
                if (data !== null && data !== undefined) {
                    await cache.set(key, data, {
                        strategy,
                        ttl,
                        tags: ['read-through', ...tags],
                        priority
                    });
                }
                
                return {
                    data: data,
                    fromCache: false,
                    hit: false
                };
            } catch (error) {
                console.error('Error en Read-Through pattern:', error);
                throw error;
            }
        },
        
        /**
         * Precarga de datos para Read-Through
         */
        preload: async function(cache, items, fetchFunction, options = {}) {
            const {
                ttl = 300000,
                strategy = 'default',
                tags = [],
                priority = 3
            } = options;
            
            try {
                const promises = items.map(async (item) => {
                    const key = typeof item === 'string' ? item : item.key;
                    const data = await fetchFunction(item);
                    
                    if (data !== null && data !== undefined) {
                        await cache.set(key, data, {
                            strategy,
                            ttl,
                            tags: ['read-through-preload', ...tags],
                            priority
                        });
                    }
                    
                    return { key, data };
                });
                
                return await Promise.all(promises);
            } catch (error) {
                console.error('Error en precarga Read-Through:', error);
                throw error;
            }
        }
    },
    
    // Write-Through Pattern
    writeThrough: {
        /**
         * Implementación del patrón Write-Through
         * Escribe en caché y en la fuente de datos simultáneamente
         */
        set: async function(cache, key, data, writeFunction, options = {}) {
            const {
                ttl = 300000,
                strategy = 'default',
                tags = [],
                priority = 5
            } = options;
            
            try {
                // 1. Escribir en la fuente de datos
                const writeResult = await writeFunction(key, data);
                
                // 2. Escribir en caché (independientemente del resultado)
                await cache.set(key, data, {
                    strategy,
                    ttl,
                    tags: ['write-through', ...tags],
                    priority
                });
                
                return {
                    data: data,
                    writeResult: writeResult,
                    cached: true
                };
            } catch (error) {
                console.error('Error en Write-Through pattern:', error);
                throw error;
            }
        },
        
        /**
         * Eliminación en Write-Through
         */
        deleteItem: async function(cache, key, deleteFunction, options = {}) {
            const {
                strategy = 'default'
            } = options;
            
            try {
                // 1. Eliminar de la fuente de datos
                const deleteResult = await deleteFunction(key);
                
                // 2. Eliminar de caché
                await cache.delete(key, strategy);
                
                return {
                    deleteResult: deleteResult,
                    deleted: true
                };
            } catch (error) {
                console.error('Error en eliminación Write-Through:', error);
                throw error;
            }
        }
    },
    
    // Write-Behind Pattern
    writeBehind: {
        /**
         * Implementación del patrón Write-Behind
         * Escribe en caché inmediatamente y en la fuente de datos de forma asíncrona
         */
        set: async function(cache, key, data, writeFunction, options = {}) {
            const {
                ttl = 300000,
                strategy = 'default',
                tags = [],
                priority = 5,
                batchDelay = 100 // ms para agrupar escrituras
            } = options;
            
            try {
                // 1. Escribir en caché inmediatamente
                await cache.set(key, data, {
                    strategy,
                    ttl,
                    tags: ['write-behind', ...tags],
                    priority
                });
                
                // 2. Escribir en la fuente de datos de forma asíncrona
                setTimeout(async () => {
                    try {
                        await writeFunction(key, data);
                    } catch (error) {
                        console.error('Error en escritura asíncrona Write-Behind:', error);
                        // Opcional: marcar como dirty para reintentar después
                        await cache.set(`${key}:dirty`, true, {
                            strategy: 'write-behind-dirty',
                            ttl: 60000 // 1 minuto para reintentar
                        });
                    }
                }, batchDelay);
                
                return {
                    data: data,
                    cached: true,
                    asyncWrite: true
                };
            } catch (error) {
                console.error('Error en Write-Behind pattern:', error);
                throw error;
            }
        },
        
        /**
         * Procesamiento por lotes para Write-Behind
         */
        batchProcess: async function(cache, writeFunction, options = {}) {
            const {
                strategy = 'write-behind',
                maxBatchSize = 10,
                batchTimeout = 1000 // ms
            } = options;
            
            try {
                // Obtener todas las claves dirty
                const dirtyKeys = await cache.getKeysByPattern(':dirty');
                
                if (dirtyKeys.length === 0) {
                    return { processed: 0, batch: [] };
                }
                
                // Procesar en lotes
                const batches = [];
                for (let i = 0; i < dirtyKeys.length; i += maxBatchSize) {
                    batches.push(dirtyKeys.slice(i, i + maxBatchSize));
                }
                
                let totalProcessed = 0;
                
                for (const batch of batches) {
                    const batchPromises = batch.map(async (dirtyKey) => {
                        const originalKey = dirtyKey.replace(':dirty', '');
                        const data = await cache.get(originalKey);
                        
                        if (data) {
                            try {
                                await writeFunction(originalKey, data);
                                await cache.delete(dirtyKey, strategy);
                                return { key: originalKey, success: true };
                            } catch (error) {
                                return { key: originalKey, success: false, error };
                            }
                        }
                        
                        return { key: originalKey, success: false, reason: 'no_data' };
                    });
                    
                    const batchResults = await Promise.all(batchPromises);
                    totalProcessed += batchResults.filter(r => r.success).length;
                    
                    // Esperar entre lotes para no sobrecargar
                    if (batches.indexOf(batch) < batches.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, batchTimeout));
                    }
                }
                
                return { processed: totalProcessed, batches };
            } catch (error) {
                console.error('Error en procesamiento por lotes Write-Behind:', error);
                throw error;
            }
        }
    },
    
    // Refresh-Ahead Pattern
    refreshAhead: {
        /**
         * Implementación del patrón Refresh-Ahead
         * Refresca los datos antes de que expiren
         */
        get: async function(cache, key, fetchFunction, options = {}) {
            const {
                ttl = 300000,
                strategy = 'default',
                refreshThreshold = 0.8, // 80% del TTL
                tags = [],
                priority = 5
            } = options;
            
            try {
                // 1. Intentar obtener desde caché
                const cached = await cache.get(key, strategy);
                
                if (cached !== null) {
                    // 2. Verificar si necesita refresco anticipado
                    const metadata = await cache.getMetadata(key, strategy);
                    
                    if (metadata && this.shouldRefresh(metadata, ttl, refreshThreshold)) {
                        // Refrescar en segundo plano
                        this.backgroundRefresh(cache, key, fetchFunction, {
                            ttl,
                            strategy,
                            tags: ['refresh-ahead-background', ...tags],
                            priority: priority - 1 // Menor prioridad para background
                        });
                    }
                    
                    return {
                        data: cached,
                        fromCache: true,
                        hit: true,
                        refreshed: false
                    };
                }
                
                // 3. Si no está en caché, obtener y cachear
                const data = await fetchFunction();
                
                if (data !== null && data !== undefined) {
                    await cache.set(key, data, {
                        strategy,
                        ttl,
                        tags: ['refresh-ahead', ...tags],
                        priority
                    });
                }
                
                return {
                    data: data,
                    fromCache: false,
                    hit: false,
                    refreshed: false
                };
            } catch (error) {
                console.error('Error en Refresh-Ahead pattern:', error);
                throw error;
            }
        },
        
        /**
         * Verificar si los datos necesitan refresco
         */
        shouldRefresh: function(metadata, ttl, threshold) {
            if (!metadata || !metadata.timestamp) {
                return false;
            }
            
            const age = Date.now() - metadata.timestamp;
            const refreshTime = ttl * threshold;
            
            return age >= refreshTime;
        },
        
        /**
         * Refresco en segundo plano
         */
        backgroundRefresh: async function(cache, key, fetchFunction, options = {}) {
            try {
                const data = await fetchFunction();
                
                if (data !== null && data !== undefined) {
                    await cache.set(key, data, options);
                }
            } catch (error) {
                console.error('Error en refresco en segundo plano:', error);
                // No lanzar el error para no afectar la solicitud principal
            }
        },
        
        /**
         * Precarga programada
         */
        scheduleRefresh: async function(cache, keys, fetchFunction, options = {}) {
            const {
                interval = 60000, // 1 minuto por defecto
                ttl = 300000,
                strategy = 'default',
                tags = [],
                priority = 3
            } = options;
            
            try {
                const refreshPromises = keys.map(async (key) => {
                    const metadata = await cache.getMetadata(key, strategy);
                    
                    if (this.shouldRefresh(metadata, ttl, 0.9)) {
                        await this.backgroundRefresh(cache, key, () => fetchFunction(key), {
                            ttl,
                            strategy,
                            tags: ['refresh-ahead-scheduled', ...tags],
                            priority
                        });
                    }
                });
                
                await Promise.all(refreshPromises);
                
                // Programar siguiente refresco
                setTimeout(() => {
                    this.scheduleRefresh(cache, keys, fetchFunction, options);
                }, interval);
                
            } catch (error) {
                console.error('Error en refresco programado:', error);
            }
        }
    },
    
    // Multi-Level Cache Pattern
    multiLevel: {
        /**
         * Implementación de caché multinivel
         * L1: Memory (más rápido)
         * L2: localStorage (persistente)
         * L3: IndexedDB (gran capacidad)
         */
        get: async function(caches, key, fetchFunction, options = {}) {
            const {
                l1Ttl = 60000,      // 1 minuto
                l2Ttl = 300000,     // 5 minutos
                l3Ttl = 3600000,    // 1 hora
                tags = [],
                priority = 5
            } = options;
            
            try {
                // L1: Intentar desde memoria
                if (caches.l1) {
                    const l1Data = await caches.l1.get(key);
                    if (l1Data !== null) {
                        // Promover a niveles superiores si es necesario
                        this.promoteData(caches, key, l1Data, { l2Ttl, l3Ttl, tags, priority });
                        
                        return {
                            data: l1Data,
                            fromCache: 'l1',
                            hit: true,
                            level: 1
                        };
                    }
                }
                
                // L2: Intentar desde localStorage
                if (caches.l2) {
                    const l2Data = await caches.l2.get(key);
                    if (l2Data !== null) {
                        // Promover a L1 y L3
                        if (caches.l1) {
                            await caches.l1.set(key, l2Data, { ttl: l1Ttl, tags, priority });
                        }
                        if (caches.l3) {
                            await caches.l3.set(key, l2Data, { ttl: l3Ttl, tags, priority });
                        }
                        
                        return {
                            data: l2Data,
                            fromCache: 'l2',
                            hit: true,
                            level: 2
                        };
                    }
                }
                
                // L3: Intentar desde IndexedDB
                if (caches.l3) {
                    const l3Data = await caches.l3.get(key);
                    if (l3Data !== null) {
                        // Promover a L1 y L2
                        if (caches.l1) {
                            await caches.l1.set(key, l3Data, { ttl: l1Ttl, tags, priority });
                        }
                        if (caches.l2) {
                            await caches.l2.set(key, l3Data, { ttl: l2Ttl, tags, priority });
                        }
                        
                        return {
                            data: l3Data,
                            fromCache: 'l3',
                            hit: true,
                            level: 3
                        };
                    }
                }
                
                // Cache miss: obtener de la fuente
                const data = await fetchFunction();
                
                if (data !== null && data !== undefined) {
                    // Almacenar en todos los niveles
                    if (caches.l1) {
                        await caches.l1.set(key, data, { ttl: l1Ttl, tags, priority });
                    }
                    if (caches.l2) {
                        await caches.l2.set(key, data, { ttl: l2Ttl, tags, priority });
                    }
                    if (caches.l3) {
                        await caches.l3.set(key, data, { ttl: l3Ttl, tags, priority });
                    }
                }
                
                return {
                    data: data,
                    fromCache: false,
                    hit: false,
                    level: 0
                };
            } catch (error) {
                console.error('Error en Multi-Level cache pattern:', error);
                throw error;
            }
        },
        
        /**
         * Promover datos entre niveles
         */
        promoteData: async function(caches, key, data, options = {}) {
            const { l2Ttl, l3Ttl, tags, priority } = options;
            
            try {
                // Promover a L2 si no está allí
                if (caches.l2) {
                    const l2Data = await caches.l2.get(key);
                    if (l2Data === null) {
                        await caches.l2.set(key, data, { ttl: l2Ttl, tags, priority });
                    }
                }
                
                // Promover a L3 si no está allí
                if (caches.l3) {
                    const l3Data = await caches.l3.get(key);
                    if (l3Data === null) {
                        await caches.l3.set(key, data, { ttl: l3Ttl, tags, priority });
                    }
                }
            } catch (error) {
                console.error('Error en promoción de datos:', error);
            }
        },
        
        /**
         * Invalidación en cascada
         */
        invalidate: async function(caches, key, options = {}) {
            const { pattern = false, levels = ['l1', 'l2', 'l3'] } = options;
            
            try {
                const promises = [];
                
                if (levels.includes('l1') && caches.l1) {
                    if (pattern) {
                        promises.push(caches.l1.invalidateByPattern(key));
                    } else {
                        promises.push(caches.l1.delete(key));
                    }
                }
                
                if (levels.includes('l2') && caches.l2) {
                    if (pattern) {
                        promises.push(caches.l2.invalidateByPattern(key));
                    } else {
                        promises.push(caches.l2.delete(key));
                    }
                }
                
                if (levels.includes('l3') && caches.l3) {
                    if (pattern) {
                        promises.push(caches.l3.invalidateByPattern(key));
                    } else {
                        promises.push(caches.l3.delete(key));
                    }
                }
                
                await Promise.all(promises);
            } catch (error) {
                console.error('Error en invalidación multinivel:', error);
                throw error;
            }
        },
        
        /**
         * Obtener estadísticas por nivel
         */
        getLevelStats: async function(caches) {
            const stats = {};
            
            if (caches.l1) {
                try {
                    stats.l1 = await caches.l1.getMetrics();
                } catch (error) {
                    stats.l1 = { error: error.message };
                }
            }
            
            if (caches.l2) {
                try {
                    stats.l2 = await caches.l2.getMetrics();
                } catch (error) {
                    stats.l2 = { error: error.message };
                }
            }
            
            if (caches.l3) {
                try {
                    stats.l3 = await caches.l3.getMetrics();
                } catch (error) {
                    stats.l3 = { error: error.message };
                }
            }
            
            return stats;
        }
    },
    
    // Cache Warming Pattern
    cacheWarming: {
        /**
         * Precalienta la caché con datos críticos
         */
        warmUp: async function(cache, warmUpData, options = {}) {
            const {
                concurrency = 3, // Número de precargas simultáneas
                delay = 100, // Delay entre grupos de precargas
                ttl = 300000,
                strategy = 'default',
                tags = ['cache-warming'],
                priority = 1 // Máxima prioridad para warming
            } = options;
            
            try {
                console.log('Iniciando cache warming...');
                const startTime = Date.now();
                
                // Agrupar datos para procesamiento por lotes
                const chunks = [];
                for (let i = 0; i < warmUpData.length; i += concurrency) {
                    chunks.push(warmUpData.slice(i, i + concurrency));
                }
                
                let totalProcessed = 0;
                let totalErrors = 0;
                
                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i];
                    
                    const promises = chunk.map(async (item) => {
                        try {
                            const key = item.key || item.id || JSON.stringify(item);
                            const data = item.data || await item.fetch();
                            
                            if (data !== null && data !== undefined) {
                                await cache.set(key, data, {
                                    strategy,
                                    ttl,
                                    tags: [...tags, ...(item.tags || [])],
                                    priority
                                });
                                
                                return { key, success: true };
                            }
                            
                            return { key, success: false, reason: 'no_data' };
                        } catch (error) {
                            return { key: item.key || item.id, success: false, error };
                        }
                    });
                    
                    const results = await Promise.all(promises);
                    
                    totalProcessed += results.filter(r => r.success).length;
                    totalErrors += results.filter(r => !r.success).length;
                    
                    // Delay entre grupos para no sobrecargar
                    if (i < chunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
                
                const duration = Date.now() - startTime;
                
                console.log(`Cache warming completado: ${totalProcessed} items, ${totalErrors} errores, ${duration}ms`);
                
                return {
                    processed: totalProcessed,
                    errors: totalErrors,
                    duration: duration,
                    items: warmUpData.length
                };
            } catch (error) {
                console.error('Error en cache warming:', error);
                throw error;
            }
        },
        
        /**
         * Warming inteligente basado en patrones de uso
         */
        intelligentWarmUp: async function(cache, usagePatterns, options = {}) {
            const {
                minAccessCount = 5,
                minFrequency = 0.1, // 10% de acceso
                maxItems = 50,
                ttl = 300000
            } = options;
            
            try {
                // Analizar patrones de uso
                const candidates = usagePatterns
                    .filter(pattern => pattern.accessCount >= minAccessCount)
                    .filter(pattern => pattern.frequency >= minFrequency)
                    .sort((a, b) => b.frequency - a.frequency)
                    .slice(0, maxItems);
                
                if (candidates.length === 0) {
                    return { warmed: 0, candidates: 0 };
                }
                
                console.log(`Iniciando intelligent cache warming con ${candidates.length} candidatos`);
                
                // Precargar candidatos más frecuentes
                const warmUpData = candidates.map(pattern => ({
                    key: pattern.key,
                    fetch: pattern.fetch || (() => Promise.resolve(pattern.data)),
                    tags: ['intelligent-warming', pattern.category || 'default']
                }));
                
                const result = await this.warmUp(cache, warmUpData, {
                    ttl,
                    tags: ['intelligent-cache-warming'],
                    concurrency: 2, // Menor concurrencia para warming inteligente
                    delay: 200
                });
                
                return {
                    ...result,
                    candidates: candidates.length,
                    intelligent: true
                };
            } catch (error) {
                console.error('Error en intelligent cache warming:', error);
                throw error;
            }
        }
    },
    
    // Cache Invalidation Pattern
    cacheInvalidation: {
        /**
         * Invalidación por etiquetas
         */
        invalidateByTags: async function(cache, tags, options = {}) {
            const {
                strategy = 'default',
                dryRun = false
            } = options;
            
            try {
                if (dryRun) {
                    // Solo simular invalidación
                    const keys = await cache.getKeysByTags(tags, strategy);
                    return { keys, invalidated: keys.length, dryRun: true };
                }
                
                const keys = await cache.getKeysByTags(tags, strategy);
                const promises = keys.map(key => cache.delete(key, strategy));
                
                await Promise.all(promises);
                
                return { keys, invalidated: keys.length };
            } catch (error) {
                console.error('Error en invalidación por etiquetas:', error);
                throw error;
            }
        },
        
        /**
         * Invalidación por patrón
         */
        invalidateByPattern: async function(cache, pattern, options = {}) {
            const {
                strategy = 'default',
                dryRun = false
            } = options;
            
            try {
                if (dryRun) {
                    const keys = await cache.getKeysByPattern(pattern, strategy);
                    return { keys, invalidated: keys.length, pattern, dryRun: true };
                }
                
                const keys = await cache.getKeysByPattern(pattern, strategy);
                const promises = keys.map(key => cache.delete(key, strategy));
                
                await Promise.all(promises);
                
                return { keys, invalidated: keys.length, pattern };
            } catch (error) {
                console.error('Error en invalidación por patrón:', error);
                throw error;
            }
        },
        
        /**
         * Invalidación por tiempo
         */
        invalidateByTime: async function(cache, maxAge, options = {}) {
            const {
                strategy = 'default',
                dryRun = false
            } = options;
            
            try {
                const cutoffTime = Date.now() - maxAge;
                const allKeys = await cache.getAllKeys(strategy);
                
                const keysToInvalidate = [];
                
                for (const key of allKeys) {
                    const metadata = await cache.getMetadata(key, strategy);
                    if (metadata && metadata.timestamp && metadata.timestamp < cutoffTime) {
                        keysToInvalidate.push(key);
                    }
                }
                
                if (dryRun) {
                    return { keys: keysToInvalidate, invalidated: keysToInvalidate.length, maxAge, dryRun: true };
                }
                
                const promises = keysToInvalidate.map(key => cache.delete(key, strategy));
                await Promise.all(promises);
                
                return { keys: keysToInvalidate, invalidated: keysToInvalidate.length, maxAge };
            } catch (error) {
                console.error('Error en invalidación por tiempo:', error);
                throw error;
            }
        },
        
        /**
         * Invalidación en cascada (dependencias)
         */
        cascadeInvalidate: async function(cache, rootKey, dependencies, options = {}) {
            const {
                strategy = 'default',
                maxDepth = 3,
                dryRun = false
            } = options;
            
            try {
                const invalidated = new Set([rootKey]);
                const toProcess = [rootKey];
                let currentDepth = 0;
                
                while (toProcess.length > 0 && currentDepth < maxDepth) {
                    const currentKey = toProcess.shift();
                    const deps = dependencies[currentKey] || [];
                    
                    for (const dep of deps) {
                        if (!invalidated.has(dep)) {
                            invalidated.add(dep);
                            toProcess.push(dep);
                        }
                    }
                    
                    currentDepth++;
                }
                
                const keysToInvalidate = Array.from(invalidated);
                
                if (dryRun) {
                    return { keys: keysToInvalidate, invalidated: keysToInvalidate.length, rootKey, maxDepth, dryRun: true };
                }
                
                const promises = keysToInvalidate.map(key => cache.delete(key, strategy));
                await Promise.all(promises);
                
                return { keys: keysToInvalidate, invalidated: keysToInvalidate.length, rootKey, maxDepth };
            } catch (error) {
                console.error('Error en invalidación en cascada:', error);
                throw error;
            }
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.CachePatterns = CachePatterns;
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CachePatterns;
}