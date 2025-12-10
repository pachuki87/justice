/**
 * Justice 2 Promise Manager
 * Sistema centralizado de manejo robusto de promesas
 */

// Importar sistema de protección XSS
// El sistema se carga automáticamente desde components/xss-protection.js

const PromiseManager = {
    // Configuración global
    config: {
        timeout: 30000, // 30 segundos por defecto
        maxRetries: 3,
        retryDelay: 1000, // 1 segundo
        maxConcurrency: 10,
        enableCache: true,
        cacheTimeout: 300000, // 5 minutos
        enableLogging: true,
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        backoffMultiplier: 2,
        maxBackoffDelay: 30000, // 30 segundos máximo
        jitterEnabled: true // Para evitar thundering herd
    },

    // Estado del gestor
    state: {
        activePromises: new Map(),
        promiseCache: new Map(),
        retryQueue: new Map(),
        concurrencyCount: 0,
        statistics: {
            totalPromises: 0,
            successfulPromises: 0,
            failedPromises: 0,
            retriedPromises: 0,
            cachedPromises: 0,
            timeouts: 0
        },
        performanceMetrics: {
            averageResponseTime: 0,
            slowestPromise: 0,
            fastestPromise: Infinity
        }
    },

    // Inicialización
    init: function(customConfig = {}) {
        this.log('Inicializando Promise Manager');
        
        // Fusionar configuración personalizada
        this.config = { ...this.config, ...customConfig };
        
        // Configurar manejo global de promesas no controladas
        this.setupGlobalPromiseHandlers();
        
        // Iniciar limpieza periódica de caché
        this.startCacheCleanup();
        
        // Configurar manejo de errores no capturados
        this.setupUnhandledRejectionHandler();
        
        this.log('Promise Manager inicializado correctamente');
    },

    // Configurar manejadores globales de promesas
    setupGlobalPromiseHandlers: function() {
        // Sobrescribir Promise global para añadir logging
        if (typeof Promise !== 'undefined') {
            const originalThen = Promise.prototype.then;
            const originalCatch = Promise.prototype.catch;
            const originalFinally = Promise.prototype.finally;

            Promise.prototype.then = function(onFulfilled, onRejected) {
                const promiseId = PromiseManager.generatePromiseId();
                const startTime = Date.now();
                
                PromiseManager.state.activePromises.set(promiseId, {
                    startTime,
                    status: 'pending'
                });

                const wrappedOnFulfilled = (value) => {
                    const endTime = Date.now();
                    const duration = endTime - startTime;
                    PromiseManager.updatePromiseMetrics(promiseId, 'fulfilled', duration, value);
                    if (onFulfilled) return onFulfilled(value);
                };

                const wrappedOnRejected = (reason) => {
                    const endTime = Date.now();
                    const duration = endTime - startTime;
                    PromiseManager.updatePromiseMetrics(promiseId, 'rejected', duration, reason);
                    if (onRejected) return onRejected(reason);
                };

                return originalThen.call(this, wrappedOnFulfilled, wrappedOnRejected);
            };

            Promise.prototype.catch = function(onRejected) {
                const wrappedOnRejected = (reason) => {
                    PromiseManager.log('Promise rechazada en catch:', reason, 'warn');
                    if (onRejected) return onRejected(reason);
                };
                return originalCatch.call(this, wrappedOnRejected);
            };

            Promise.prototype.finally = function(onFinally) {
                const wrappedOnFinally = () => {
                    PromiseManager.log('Promise finalizada en finally');
                    if (onFinally) return onFinally();
                };
                return originalFinally.call(this, wrappedOnFinally);
            };
        }
    },

    // Configurar manejo de rechazos no capturados
    setupUnhandledRejectionHandler: function() {
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (event) => {
                this.log('Rechazo de promesa no manejado:', event.reason, 'error');
                this.state.statistics.failedPromises++;
                
                // Intentar recuperación automática si es un error recuperable
                if (this.isRecoverableError(event.reason)) {
                    this.attemptErrorRecovery(event.reason);
                }
            });
        }
    },

    // Generar ID único para promesa
    generatePromiseId: function() {
        return 'promise_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Actualizar métricas de promesa
    updatePromiseMetrics: function(promiseId, status, duration, value) {
        const promiseInfo = this.state.activePromises.get(promiseId);
        if (promiseInfo) {
            promiseInfo.status = status;
            promiseInfo.duration = duration;
            promiseInfo.value = value;

            // Actualizar estadísticas globales
            this.state.statistics.totalPromises++;
            
            if (status === 'fulfilled') {
                this.state.statistics.successfulPromises++;
            } else if (status === 'rejected') {
                this.state.statistics.failedPromises++;
            }

            // Actualizar métricas de rendimiento
            this.updatePerformanceMetrics(duration);

            // Limpiar promesas completadas
            if (status !== 'pending') {
                this.state.activePromises.delete(promiseId);
            }
        }
    },

    // Actualizar métricas de rendimiento
    updatePerformanceMetrics: function(duration) {
        const metrics = this.state.performanceMetrics;
        
        // Actualizar promedio
        const totalPromises = this.state.statistics.totalPromises;
        metrics.averageResponseTime = ((metrics.averageResponseTime * (totalPromises - 1)) + duration) / totalPromises;
        
        // Actualizar más lenta y rápida
        if (duration > metrics.slowestPromise) {
            metrics.slowestPromise = duration;
        }
        if (duration < metrics.fastestPromise) {
            metrics.fastestPromise = duration;
        }
    },

    // Ejecutar promesa con timeout
    withTimeout: function(promise, timeout = this.config.timeout) {
        const promiseId = this.generatePromiseId();
        
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.state.statistics.timeouts++;
                this.state.activePromises.delete(promiseId);
                reject(new Error(`Promise timeout después de ${timeout}ms`));
            }, timeout);

            promise
                .then(value => {
                    clearTimeout(timeoutId);
                    resolve(value);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    },

    // Ejecutar promesa con retry
    withRetry: function(promiseFunction, options = {}) {
        const config = { ...this.config, ...options };
        const promiseId = this.generatePromiseId();
        
        return new Promise((resolve, reject) => {
            let attempt = 0;
            const maxAttempts = config.maxRetries || this.config.maxRetries;
            
            const executeAttempt = () => {
                attempt++;
                this.log(`Intento ${attempt}/${maxAttempts} para promesa ${promiseId}`);
                
                if (attempt > 1) {
                    this.state.statistics.retriedPromises++;
                }

                const promise = promiseFunction();
                
                this.withTimeout(promise, config.timeout)
                    .then(result => {
                        this.log(`Promesa ${promiseId} completada exitosamente en intento ${attempt}`);
                        resolve(result);
                    })
                    .catch(error => {
                        this.log(`Error en intento ${attempt} para promesa ${promiseId}:`, error, 'warn');
                        
                        // Verificar si se debe reintentar
                        if (attempt < maxAttempts && this.shouldRetry(error, config)) {
                            const delay = this.calculateRetryDelay(attempt, config);
                            this.log(`Reintentando promesa ${promiseId} en ${delay}ms`);
                            
                            setTimeout(executeAttempt, delay);
                        } else {
                            this.log(`Promesa ${promiseId} falló definitivamente después de ${attempt} intentos`, error, 'error');
                            reject(error);
                        }
                    });
            };
            
            executeAttempt();
        });
    },

    // Determinar si se debe reintentar
    shouldRetry: function(error, config) {
        // No reintentar errores de cancelación
        if (error.name === 'AbortError') {
            return false;
        }
        
        // No reintentar timeouts
        if (error.message && error.message.includes('timeout')) {
            return false;
        }
        
        // Reintentar errores de red
        if (this.isNetworkError(error)) {
            return true;
        }
        
        // Reintentar errores 5xx del servidor
        if (error.status && error.status >= 500 && error.status < 600) {
            return true;
        }
        
        // Aplicar filtro de errores personalizado
        if (config.errorFilter && typeof config.errorFilter === 'function') {
            return config.errorFilter(error);
        }
        
        return false;
    },

    // Calcular delay de retry con backoff exponencial
    calculateRetryDelay: function(attempt, config) {
        const baseDelay = config.retryDelay || this.config.retryDelay;
        const multiplier = config.backoffMultiplier || this.config.backoffMultiplier;
        const maxDelay = config.maxBackoffDelay || this.config.maxBackoffDelay;
        
        let delay = baseDelay * Math.pow(multiplier, attempt - 1);
        
        // Aplicar jitter para evitar thundering herd
        if (config.jitterEnabled || this.config.jitterEnabled) {
            delay = delay * (0.5 + Math.random() * 0.5);
        }
        
        return Math.min(delay, maxDelay);
    },

    // Verificar si es un error de red
    isNetworkError: function(error) {
        return error.code === 'ECONNRESET' ||
               error.code === 'ETIMEDOUT' ||
               error.code === 'ENOTFOUND' ||
               error.message && (
                   error.message.includes('Network Error') ||
                   error.message.includes('fetch failed') ||
                   error.message.includes('connection refused')
               );
    },

    // Verificar si es un error recuperable
    isRecoverableError: function(error) {
        return this.isNetworkError(error) ||
               (error.status && error.status >= 500 && error.status < 600);
    },

    // Intentar recuperación automática de error
    attemptErrorRecovery: function(error) {
        this.log('Intentando recuperación automática de error:', error, 'warn');
        
        // Estrategias de recuperación según tipo de error
        if (this.isNetworkError(error)) {
            // Esperar a que la conexión se restaure
            setTimeout(() => {
                this.log('Verificando conexión para recuperación automática');
                if (navigator.onLine) {
                    this.log('Conexión restaurada, limpiando caché de promesas fallidas');
                    this.clearFailedPromises();
                }
            }, 5000);
        }
    },

    // Ejecutar múltiples promesas con control de concurrencia
    withConcurrencyLimit: function(promiseFunctions, limit = this.config.maxConcurrency) {
        return new Promise((resolve, reject) => {
            const results = [];
            let completed = 0;
            let started = 0;
            
            const executeNext = () => {
                if (started >= promiseFunctions.length) {
                    return;
                }
                
                while (started < promiseFunctions.length && this.state.concurrencyCount < limit) {
                    const index = started++;
                    this.state.concurrencyCount++;
                    
                    const promiseFunction = promiseFunctions[index];
                    
                    promiseFunction()
                        .then(result => {
                            results[index] = { status: 'fulfilled', value: result };
                        })
                        .catch(error => {
                            results[index] = { status: 'rejected', error: error };
                        })
                        .finally(() => {
                            completed++;
                            this.state.concurrencyCount--;
                            
                            if (completed === promiseFunctions.length) {
                                resolve(results);
                            } else {
                                executeNext();
                            }
                        });
                }
            };
            
            executeNext();
        });
    },

    // Ejecutar promesas en paralelo con manejo robusto
    parallel: function(promiseFunctions, options = {}) {
        const config = { ...this.config, ...options };
        
        return Promise.allSettled(promiseFunctions.map(fn => {
            const promise = fn();
            return config.timeout ? this.withTimeout(promise, config.timeout) : promise;
        }));
    },

    // Ejecutar promesas en secuencia con manejo de errores
    sequence: function(promiseFunctions, options = {}) {
        const config = { ...this.config, ...options };
        
        return promiseFunctions.reduce((previousPromise, currentFunction) => {
            return previousPromise.then(result => {
                return currentFunction(result);
            }).catch(error => {
                this.log('Error en secuencia de promesas:', error, 'error');
                
                if (config.stopOnError) {
                    throw error;
                }
                
                // Continuar con valor por defecto o error
                return currentFunction(null);
            });
        }, Promise.resolve());
    },

    // Ejecutar la primera promesa que se complete
    race: function(promiseFunctions, options = {}) {
        const config = { ...this.config, ...options };
        
        const promises = promiseFunctions.map(fn => {
            const promise = fn();
            return config.timeout ? this.withTimeout(promise, config.timeout) : promise;
        });
        
        return Promise.race(promises);
    },

    // Ejecutar la primera promesa que se complete exitosamente
    any: function(promiseFunctions, options = {}) {
        const config = { ...this.config, ...options };
        
        const promises = promiseFunctions.map(fn => {
            const promise = fn();
            return config.timeout ? this.withTimeout(promise, config.timeout) : promise;
        });
        
        return Promise.any(promises);
    },

    // Cache de promesas
    cache: {
        get: function(key) {
            if (!PromiseManager.config.enableCache) return null;
            
            const cached = PromiseManager.state.promiseCache.get(key);
            if (!cached) return null;
            
            // Verificar si ha expirado
            if (Date.now() - cached.timestamp > PromiseManager.config.cacheTimeout) {
                PromiseManager.state.promiseCache.delete(key);
                return null;
            }
            
            PromiseManager.state.statistics.cachedPromises++;
            PromiseManager.log(`Usando caché para clave: ${key}`);
            return cached.promise;
        },
        
        set: function(key, promise, ttl = PromiseManager.config.cacheTimeout) {
            if (!PromiseManager.config.enableCache) return;
            
            PromiseManager.state.promiseCache.set(key, {
                promise,
                timestamp: Date.now(),
                ttl
            });
            
            PromiseManager.log(`Guardando en caché clave: ${key}`);
        },
        
        clear: function(key) {
            if (key) {
                PromiseManager.state.promiseCache.delete(key);
                PromiseManager.log(`Limpiando caché para clave: ${key}`);
            } else {
                PromiseManager.state.promiseCache.clear();
                PromiseManager.log('Limpiando todo el caché de promesas');
            }
        },
        
        // Limpiar caché expirado
        cleanup: function() {
            const now = Date.now();
            const cache = PromiseManager.state.promiseCache;
            
            for (const [key, value] of cache.entries()) {
                if (now - value.timestamp > value.ttl) {
                    cache.delete(key);
                }
            }
        }
    },

    // Iniciar limpieza periódica de caché
    startCacheCleanup: function() {
        if (!this.config.enableCache) return;
        
        setInterval(() => {
            this.cache.cleanup();
        }, this.config.cacheTimeout / 2); // Limpiar cada mitad del TTL
    },

    // Limpiar promesas fallidas
    clearFailedPromises: function() {
        for (const [key, promiseInfo] of this.state.activePromises.entries()) {
            if (promiseInfo.status === 'rejected') {
                this.state.activePromises.delete(key);
            }
        }
    },

    // Obtener estadísticas
    getStatistics: function() {
        return {
            ...this.state.statistics,
            activePromises: this.state.activePromises.size,
            concurrencyCount: this.state.concurrencyCount,
            cacheSize: this.state.promiseCache.size,
            performance: this.state.performanceMetrics
        };
    },

    // Reiniciar estadísticas
    resetStatistics: function() {
        this.state.statistics = {
            totalPromises: 0,
            successfulPromises: 0,
            failedPromises: 0,
            retriedPromises: 0,
            cachedPromises: 0,
            timeouts: 0
        };
        
        this.state.performanceMetrics = {
            averageResponseTime: 0,
            slowestPromise: 0,
            fastestPromise: Infinity
        };
        
        this.log('Estadísticas de Promise Manager reiniciadas');
    },

    // Obtener promesas activas
    getActivePromises: function() {
        const active = [];
        for (const [id, info] of this.state.activePromises.entries()) {
            active.push({
                id,
                ...info,
                duration: Date.now() - info.startTime
            });
        }
        return active;
    },

    // Cancelar promesa activa
    cancelPromise: function(promiseId) {
        const promiseInfo = this.state.activePromises.get(promiseId);
        if (promiseInfo) {
            this.log(`Cancelando promesa: ${promiseId}`);
            this.state.activePromises.delete(promiseId);
            
            // Marcar como cancelada
            promiseInfo.status = 'cancelled';
            promiseInfo.cancelled = true;
        }
    },

    // Cancelar todas las promesas activas
    cancelAllPromises: function() {
        const activePromises = Array.from(this.state.activePromises.keys());
        activePromises.forEach(id => {
            this.cancelPromise(id);
        });
        
        this.log(`Canceladas ${activePromises.length} promesas activas`);
    },

    // Logging
    log: function(message, data = null, level = 'info') {
        if (!this.config.enableLogging) return;
        
        const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
        const currentLevel = logLevels[this.config.logLevel] || 1;
        const messageLevel = logLevels[level] || 1;
        
        if (messageLevel >= currentLevel) {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [PromiseManager:${level.toUpperCase()}] ${message}`;
            
            if (data) {
                console.log(logEntry, data);
            } else {
                console.log(logEntry);
            }
        }
    },

    // Exportar configuración para depuración
    exportConfig: function() {
        return {
            config: this.config,
            state: {
                activePromises: this.state.activePromises.size,
                cacheSize: this.state.promiseCache.size,
                concurrencyCount: this.state.concurrencyCount,
                statistics: this.state.statistics,
                performance: this.state.performanceMetrics
            }
        };
    }
};

// Auto-inicialización si se carga en navegador
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PromiseManager.init();
    });
} else if (typeof window !== 'undefined') {
    // Para Node.js o si ya está cargado
    PromiseManager.init();
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.PromiseManager = PromiseManager;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromiseManager;
}