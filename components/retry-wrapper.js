/**
 * Justice 2 Retry Wrapper
 * Sistema avanzado de reintentos con backoff exponencial y jitter
 */

const RetryWrapper = {
    // Configuración
    config: {
        maxRetries: 3,
        baseDelay: 1000, // 1 segundo
        maxDelay: 30000, // 30 segundos
        backoffMultiplier: 2,
        jitterEnabled: true,
        jitterRange: 0.1, // 10% de jitter
        enableLogging: true,
        enableTelemetry: true,
        retryableErrors: [
            'NetworkError',
            'TimeoutError',
            'ConnectionError',
            'ECONNRESET',
            'ETIMEDOUT',
            'ENOTFOUND'
        ],
        retryableStatusCodes: [
            408, // Request Timeout
            429, // Too Many Requests
            500, // Internal Server Error
            502, // Bad Gateway
            503, // Service Unavailable
            504  // Gateway Timeout
        ],
        nonRetryableErrors: [
            'ValidationError',
            'AuthenticationError',
            'AuthorizationError',
            'NotFoundError'
        ],
        nonRetryableStatusCodes: [
            400, // Bad Request
            401, // Unauthorized
            403, // Forbidden
            404, // Not Found
            405, // Method Not Allowed
            409, // Conflict
            422  // Unprocessable Entity
        ]
    },

    // Estado
    state: {
        activeRetries: new Map(),
        retryHistory: [],
        statistics: {
            totalRetries: 0,
            successfulRetries: 0,
            failedRetries: 0,
            averageRetries: 0
        }
    },

    // Inicialización
    init: function(customConfig = {}) {
        this.log('Inicializando Retry Wrapper');
        
        // Fusionar configuración personalizada
        this.config = { ...this.config, ...customConfig };
        
        // Limpiar historial de reintentos
        this.cleanupHistory();
        
        this.log('Retry Wrapper inicializado correctamente');
    },

    // Función principal de retry
    retry: function(promiseFunction, options = {}) {
        const retryId = this.generateRetryId();
        const startTime = Date.now();
        
        // Fusionar opciones con configuración por defecto
        const retryOptions = {
            maxRetries: options.maxRetries || this.config.maxRetries,
            baseDelay: options.baseDelay || this.config.baseDelay,
            maxDelay: options.maxDelay || this.config.maxDelay,
            backoffMultiplier: options.backoffMultiplier || this.config.backoffMultiplier,
            jitterEnabled: options.jitterEnabled !== undefined ? options.jitterEnabled : this.config.jitterEnabled,
            onRetry: options.onRetry || null,
            onSuccess: options.onSuccess || null,
            onFailure: options.onFailure || null,
            context: options.context || {},
            ...options
        };

        // Registrar intento de retry
        this.state.activeRetries.set(retryId, {
            startTime,
            attempts: 0,
            lastAttempt: null,
            options: retryOptions
        });

        // Ejecutar con retry
        return this.executeWithRetry(promiseFunction, retryId, retryOptions)
            .finally(() => {
                // Limpiar estado
                this.state.activeRetries.delete(retryId);
            });
    },

    // Ejecutar función con lógica de retry
    executeWithRetry: async function(promiseFunction, retryId, options) {
        let lastError = null;
        let attempt = 0;
        const maxAttempts = options.maxRetries + 1; // +1 por el intento inicial

        while (attempt < maxAttempts) {
            attempt++;
            
            try {
                // Actualizar estado del intento
                const retryState = this.state.activeRetries.get(retryId);
                if (retryState) {
                    retryState.attempts = attempt;
                    retryState.lastAttempt = Date.now();
                }

                this.log(`Ejecutando intento ${attempt}/${maxAttempts} para retry ${retryId}`);

                // Ejecutar la función
                const result = await promiseFunction();

                // Éxito - registrar y devolver resultado
                this.logSuccess(retryId, attempt, Date.now() - retryState.startTime);
                
                if (options.onSuccess) {
                    options.onSuccess(result, attempt, retryId);
                }

                return result;

            } catch (error) {
                lastError = error;
                
                // Verificar si el error es retryable
                const isRetryable = this.isRetryableError(error, attempt, maxAttempts);
                
                this.logError(retryId, attempt, error, isRetryable);

                if (!isRetryable || attempt >= maxAttempts) {
                    // No se puede reintentar más
                    this.logFailure(retryId, attempt, lastError, Date.now() - retryState.startTime);
                    
                    if (options.onFailure) {
                        options.onFailure(lastError, attempt, retryId);
                    }

                    throw lastError;
                }

                // Calcular delay para el próximo intento
                const delay = this.calculateDelay(attempt - 1, options);
                
                // Notificar retry
                if (options.onRetry) {
                    options.onRetry(error, attempt, retryId, delay);
                }

                // Esperar antes del próximo intento
                await this.delay(delay);
            }
        }

        // No debería llegar aquí, pero por si acaso
        throw lastError;
    },

    // Verificar si el error es retryable
    isRetryableError: function(error, attempt, maxAttempts) {
        // Si es el último intento, no es retryable
        if (attempt >= maxAttempts) {
            return false;
        }

        // Verificar errores no retryables por nombre
        if (error.name && this.config.nonRetryableErrors.includes(error.name)) {
            return false;
        }

        // Verificar errores retryables por nombre
        if (error.name && this.config.retryableErrors.includes(error.name)) {
            return true;
        }

        // Verificar códigos de estado HTTP
        if (error.status) {
            if (this.config.nonRetryableStatusCodes.includes(error.status)) {
                return false;
            }
            if (this.config.retryableStatusCodes.includes(error.status)) {
                return true;
            }
        }

        // Verificar patrones en el mensaje de error
        if (error.message) {
            const message = error.message.toLowerCase();
            
            // Patrones no retryables
            const nonRetryablePatterns = [
                'validation',
                'invalid',
                'unauthorized',
                'forbidden',
                'not found',
                'conflict'
            ];
            
            for (const pattern of nonRetryablePatterns) {
                if (message.includes(pattern)) {
                    return false;
                }
            }

            // Patrones retryables
            const retryablePatterns = [
                'timeout',
                'network',
                'connection',
                'rate limit',
                'server error'
            ];
            
            for (const pattern of retryablePatterns) {
                if (message.includes(pattern)) {
                    return true;
                }
            }
        }

        // Por defecto, considerar retryable si no es el último intento
        return true;
    },

    // Calcular delay con backoff exponencial y jitter
    calculateDelay: function(attempt, options) {
        // Calcular delay base con backoff exponencial
        let delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt);
        
        // Limitar al máximo
        delay = Math.min(delay, options.maxDelay);
        
        // Aplicar jitter si está habilitado
        if (options.jitterEnabled) {
            delay = this.applyJitter(delay);
        }
        
        return Math.floor(delay);
    },

    // Aplicar jitter para evitar thundering herd
    applyJitter: function(delay) {
        const jitterRange = delay * this.config.jitterRange;
        const jitter = (Math.random() - 0.5) * 2 * jitterRange; // ±jitterRange
        return Math.max(0, delay + jitter);
    },

    // Función de delay
    delay: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Registrar éxito
    logSuccess: function(retryId, attempt, duration) {
        this.state.statistics.totalRetries++;
        this.state.statistics.successfulRetries++;
        
        const retryEntry = {
            id: retryId,
            status: 'success',
            attempts: attempt,
            duration,
            timestamp: new Date().toISOString()
        };
        
        this.state.retryHistory.unshift(retryEntry);
        this.cleanupHistory();
        
        this.log(`Retry ${retryId} exitoso después de ${attempt} intentos (${duration}ms)`);
    },

    // Registrar error
    logError: function(retryId, attempt, error, isRetryable) {
        this.log(`Retry ${retryId} intento ${attempt} fallido: ${error.message} (${isRetryable ? 'retryable' : 'non-retryable'})`);
    },

    // Registrar fallo final
    logFailure: function(retryId, attempt, error, duration) {
        this.state.statistics.totalRetries++;
        this.state.statistics.failedRetries++;
        
        const retryEntry = {
            id: retryId,
            status: 'failed',
            attempts: attempt,
            duration,
            error: error.message,
            timestamp: new Date().toISOString()
        };
        
        this.state.retryHistory.unshift(retryEntry);
        this.cleanupHistory();
        
        this.log(`Retry ${retryId} falló definitivamente después de ${attempt} intentos (${duration}ms): ${error.message}`);
    },

    // Limpiar historial (mantener últimos 1000)
    cleanupHistory: function() {
        if (this.state.retryHistory.length > 1000) {
            this.state.retryHistory = this.state.retryHistory.slice(0, 1000);
        }
        
        // Actualizar promedio de reintentos
        this.updateAverageRetries();
    },

    // Actualizar promedio de reintentos
    updateAverageRetries: function() {
        if (this.state.statistics.totalRetries === 0) {
            this.state.statistics.averageRetries = 0;
            return;
        }
        
        const totalAttempts = this.state.retryHistory.reduce((sum, entry) => sum + entry.attempts, 0);
        this.state.statistics.averageRetries = totalAttempts / this.state.retryHistory.length;
    },

    // Cancelar retry activo
    cancelRetry: function(retryId) {
        const retryState = this.state.activeRetries.get(retryId);
        if (retryState) {
            this.state.activeRetries.delete(retryId);
            this.log(`Retry ${retryId} cancelado`);
            return true;
        }
        return false;
    },

    // Cancelar todos los reintentos activos
    cancelAllRetries: function() {
        const activeCount = this.state.activeRetries.size;
        this.state.activeRetries.clear();
        this.log(`${activeCount} reintentos activos cancelados`);
        return activeCount;
    },

    // Obtener retry activo
    getActiveRetry: function(retryId) {
        return this.state.activeRetries.get(retryId);
    },

    // Obtener todos los reintentos activos
    getAllActiveRetries: function() {
        return Array.from(this.state.activeRetries.entries()).map(([id, state]) => ({
            id,
            ...state
        }));
    },

    // Obtener estadísticas
    getStatistics: function() {
        return {
            ...this.state.statistics,
            activeRetries: this.state.activeRetries.size,
            recentHistory: this.state.retryHistory.slice(0, 10)
        };
    },

    // Reiniciar estadísticas
    resetStatistics: function() {
        this.state.statistics = {
            totalRetries: 0,
            successfulRetries: 0,
            failedRetries: 0,
            averageRetries: 0
        };
        this.state.retryHistory = [];
        this.log('Estadísticas de Retry Wrapper reiniciadas');
    },

    // Generar ID único para retry
    generateRetryId: function() {
        return 'retry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Funciones de conveniencia para patrones comunes

    // Retry con backoff exponencial estándar
    exponentialBackoff: function(promiseFunction, options = {}) {
        return this.retry(promiseFunction, {
            backoffMultiplier: 2,
            jitterEnabled: true,
            ...options
        });
    },

    // Retry lineal
    linearBackoff: function(promiseFunction, options = {}) {
        return this.retry(promiseFunction, {
            backoffMultiplier: 1,
            jitterEnabled: false,
            ...options
        });
    },

    // Retry con delay fijo
    fixedDelay: function(promiseFunction, delay, options = {}) {
        return this.retry(promiseFunction, {
            baseDelay: delay,
            backoffMultiplier: 1,
            jitterEnabled: false,
            ...options
        });
    },

    // Retry inmediato (sin delay)
    immediate: function(promiseFunction, options = {}) {
        return this.retry(promiseFunction, {
            baseDelay: 0,
            jitterEnabled: false,
            ...options
        });
    },

    // Retry para operaciones de red
    networkRetry: function(promiseFunction, options = {}) {
        return this.retry(promiseFunction, {
            maxRetries: 5,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 1.5,
            jitterEnabled: true,
            ...options
        });
    },

    // Retry para operaciones críticas
    criticalRetry: function(promiseFunction, options = {}) {
        return this.retry(promiseFunction, {
            maxRetries: 10,
            baseDelay: 500,
            maxDelay: 60000,
            backoffMultiplier: 1.2,
            jitterEnabled: true,
            ...options
        });
    },

    // Retry con timeout
    retryWithTimeout: function(promiseFunction, timeout, options = {}) {
        return this.retry(async () => {
            return Promise.race([
                promiseFunction(),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Timeout')), timeout);
                })
            ]);
        }, options);
    },

    // Logging
    log: function(message, data = null) {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [RetryWrapper] ${message}`;
            
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
        RetryWrapper.init();
    });
} else if (typeof window !== 'undefined') {
    // Para Node.js o si ya está cargado
    RetryWrapper.init();
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.RetryWrapper = RetryWrapper;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = RetryWrapper;
}