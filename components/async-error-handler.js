/**
 * Justice 2 Async Error Handler
 * Sistema unificado de manejo de errores asíncronos
 */

// Importar sistema de protección XSS
// El sistema se carga automáticamente desde components/xss-protection.js

const AsyncErrorHandler = {
    // Configuración
    config: {
        enableLogging: true,
        enableRecovery: true,
        maxRecoveryAttempts: 3,
        recoveryDelay: 2000,
        enableUserNotification: true,
        enableTelemetry: true,
        errorCategories: {
            NETWORK: 'network',
            TIMEOUT: 'timeout',
            VALIDATION: 'validation',
            AUTHENTICATION: 'authentication',
            AUTHORIZATION: 'authorization',
            SERVER_ERROR: 'server_error',
            CLIENT_ERROR: 'client_error',
            UNKNOWN: 'unknown'
        },
        recoveryStrategies: {
            RETRY: 'retry',
            FALLBACK: 'fallback',
            DEGRADED_MODE: 'degraded_mode',
            USER_ACTION: 'user_action'
        }
    },

    // Estado
    state: {
        errorHistory: [],
        recoveryAttempts: new Map(),
        activeRecoveries: new Map(),
        errorCounts: new Map(),
        lastError: null,
        degradedMode: false,
        fallbackData: new Map()
    },

    // Inicialización
    init: function(customConfig = {}) {
        this.log('Inicializando Async Error Handler');
        
        // Fusionar configuración personalizada
        this.config = { ...this.config, ...customConfig };
        
        // Configurar manejadores globales
        this.setupGlobalHandlers();
        
        // Iniciar sistema de telemetría
        if (this.config.enableTelemetry) {
            this.setupTelemetry();
        }
        
        this.log('Async Error Handler inicializado correctamente');
    },

    // Configurar manejadores globales
    setupGlobalHandlers: function() {
        // Manejador global de promesas rechazadas
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (event) => {
                this.handleUnhandledRejection(event.reason, event.promise);
            });
        }

        // Manejador global de errores
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                if (event.error && event.error instanceof Error && event.error.promise) {
                    this.handleUnhandledRejection(event.error, event.error.promise);
                }
            });
        }

        // Mejorar Promise.prototype.catch
        this.enhancePromiseCatch();
    },

    // Mejorar Promise.prototype.catch
    enhancePromiseCatch: function() {
        if (typeof Promise !== 'undefined') {
            const originalCatch = Promise.prototype.catch;
            
            Promise.prototype.catch = function(onRejected) {
                const enhancedOnRejected = (reason) => {
                    // Clasificar error
                    const errorInfo = AsyncErrorHandler.classifyError(reason);
                    
                    // Registrar error
                    AsyncErrorHandler.logError(errorInfo);
                    
                    // Intentar recuperación
                    const recovery = AsyncErrorHandler.attemptRecovery(errorInfo);
                    if (recovery.handled) {
                        return recovery.result;
                    }
                    
                    // Llamar al manejador original
                    return onRejected(reason);
                };
                
                return originalCatch.call(this, enhancedOnRejected);
            };
        }
    },

    // Clasificar error
    classifyError: function(error) {
        const errorInfo = {
            originalError: error,
            timestamp: new Date().toISOString(),
            id: this.generateErrorId(),
            category: this.config.errorCategories.UNKNOWN,
            severity: 'medium',
            recoverable: false,
            userMessage: 'Ha ocurrido un error inesperado',
            technicalMessage: error.message || 'Error desconocido',
            stack: error.stack,
            context: this.getErrorContext(error)
        };

        // Clasificación por tipo de error
        if (error.name) {
            switch (error.name) {
                case 'NetworkError':
                case 'TypeError':
                    if (error.message && (
                        error.message.includes('fetch') ||
                        error.message.includes('network') ||
                        error.message.includes('connection')
                    )) {
                        errorInfo.category = this.config.errorCategories.NETWORK;
                        errorInfo.severity = 'high';
                        errorInfo.recoverable = true;
                        errorInfo.userMessage = 'Error de conexión. Verifique su conexión a internet.';
                    }
                    break;
                
                case 'TimeoutError':
                    errorInfo.category = this.config.errorCategories.TIMEOUT;
                    errorInfo.severity = 'medium';
                    errorInfo.recoverable = true;
                    errorInfo.userMessage = 'La operación ha tardado demasiado tiempo. Intente nuevamente.';
                    break;
                
                case 'ValidationError':
                    errorInfo.category = this.config.errorCategories.VALIDATION;
                    errorInfo.severity = 'low';
                    errorInfo.recoverable = false;
                    errorInfo.userMessage = 'Los datos proporcionados no son válidos.';
                    break;
            }
        }

        // Clasificación por código de estado HTTP
        if (error.status) {
            if (error.status === 401) {
                errorInfo.category = this.config.errorCategories.AUTHENTICATION;
                errorInfo.severity = 'high';
                errorInfo.recoverable = true;
                errorInfo.userMessage = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
            } else if (error.status === 403) {
                errorInfo.category = this.config.errorCategories.AUTHORIZATION;
                errorInfo.severity = 'high';
                errorInfo.recoverable = false;
                errorInfo.userMessage = 'No tiene permisos para realizar esta acción.';
            } else if (error.status >= 400 && error.status < 500) {
                errorInfo.category = this.config.errorCategories.CLIENT_ERROR;
                errorInfo.severity = 'medium';
                errorInfo.recoverable = false;
                errorInfo.userMessage = 'Error en la solicitud. Por favor, verifique los datos.';
            } else if (error.status >= 500) {
                errorInfo.category = this.config.errorCategories.SERVER_ERROR;
                errorInfo.severity = 'high';
                errorInfo.recoverable = true;
                errorInfo.userMessage = 'Error del servidor. Intente nuevamente en unos momentos.';
            }
        }

        // Clasificación por mensaje de error
        if (error.message) {
            const message = error.message.toLowerCase();
            
            if (message.includes('timeout')) {
                errorInfo.category = this.config.errorCategories.TIMEOUT;
                errorInfo.severity = 'medium';
                errorInfo.recoverable = true;
            } else if (message.includes('network') || message.includes('connection')) {
                errorInfo.category = this.config.errorCategories.NETWORK;
                errorInfo.severity = 'high';
                errorInfo.recoverable = true;
            } else if (message.includes('validation') || message.includes('invalid')) {
                errorInfo.category = this.config.errorCategories.VALIDATION;
                errorInfo.severity = 'low';
                errorInfo.recoverable = false;
            } else if (message.includes('unauthorized') || message.includes('forbidden')) {
                errorInfo.category = this.config.errorCategories.AUTHORIZATION;
                errorInfo.severity = 'high';
                errorInfo.recoverable = false;
            }
        }

        return errorInfo;
    },

    // Obtener contexto del error
    getErrorContext: function(error) {
        const context = {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            online: navigator.onLine
        };

        // Información de la aplicación si está disponible
        if (typeof window !== 'undefined' && window.Justice2) {
            context.appVersion = window.Justice2.config?.version;
            context.userId = window.Justice2Auth?.state?.user?.id;
            context.currentRoute = window.Justice2.state?.currentPage;
        }

        // Información de la promesa si está disponible
        if (error.promise && typeof error.promise === 'object') {
            context.promiseId = error.promise.id || 'unknown';
            context.promiseStatus = error.promise.status || 'unknown';
        }

        return context;
    },

    // Registrar error
    logError: function(errorInfo) {
        // Actualizar historial de errores
        this.state.errorHistory.unshift(errorInfo);
        if (this.state.errorHistory.length > 1000) {
            this.state.errorHistory = this.state.errorHistory.slice(0, 1000);
        }

        // Actualizar contador de errores
        const category = errorInfo.category;
        this.state.errorCounts.set(category, (this.state.errorCounts.get(category) || 0) + 1);

        // Guardar último error
        this.state.lastError = errorInfo;

        // Logging estructurado
        this.logStructured(errorInfo);

        // Notificar al usuario si es necesario
        if (this.config.enableUserNotification && errorInfo.severity === 'high') {
            this.notifyUser(errorInfo);
        }

        // Enviar telemetría si está habilitado
        if (this.config.enableTelemetry) {
            this.sendTelemetry(errorInfo);
        }
    },

    // Logging estructurado
    logStructured: function(errorInfo) {
        if (!this.config.enableLogging) return;

        const logEntry = {
            timestamp: errorInfo.timestamp,
            level: this.getLogLevel(errorInfo.severity),
            errorId: errorInfo.id,
            category: errorInfo.category,
            severity: errorInfo.severity,
            message: errorInfo.technicalMessage,
            userMessage: errorInfo.userMessage,
            recoverable: errorInfo.recoverable,
            context: errorInfo.context,
            stack: errorInfo.stack
        };

        console.error('[AsyncErrorHandler]', JSON.stringify(logEntry, null, 2));
    },

    // Obtener nivel de log
    getLogLevel: function(severity) {
        const levels = {
            low: 'info',
            medium: 'warn',
            high: 'error'
        };
        return levels[severity] || 'info';
    },

    // Notificar al usuario
    notifyUser: function(errorInfo) {
        // Usar sistema de notificaciones si está disponible
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(errorInfo.userMessage, 'error');
        } else {
            // Fallback a alert nativo
            alert(errorInfo.userMessage);
        }
    },

    // Enviar telemetría
    sendTelemetry: function(errorInfo) {
        if (typeof window !== 'undefined' && window.Justice2API) {
            const telemetryData = {
                errorId: errorInfo.id,
                category: errorInfo.category,
                severity: errorInfo.severity,
                message: errorInfo.technicalMessage,
                context: errorInfo.context,
                timestamp: errorInfo.timestamp
            };

            // Enviar de forma asíncrona para no bloquear
            window.Justice2API.post('/telemetry/errors', telemetryData)
                .catch(err => {
                    console.warn('Error enviando telemetría:', err);
                });
        }
    },

    // Intentar recuperación automática
    attemptRecovery: function(errorInfo) {
        if (!this.config.enableRecovery || !errorInfo.recoverable) {
            return { handled: false };
        }

        const errorId = errorInfo.id;
        const attempts = this.state.recoveryAttempts.get(errorId) || 0;

        // Verificar límite de intentos
        if (attempts >= this.config.maxRecoveryAttempts) {
            this.log(`Límite de recuperación alcanzado para error ${errorId}`);
            return { handled: false };
        }

        // Incrementar contador de intentos
        this.state.recoveryAttempts.set(errorId, attempts + 1);

        // Estrategia de recuperación según categoría
        let recoveryResult;
        switch (errorInfo.category) {
            case this.config.errorCategories.NETWORK:
                recoveryResult = this.recoverFromNetworkError(errorInfo);
                break;
            case this.config.errorCategories.TIMEOUT:
                recoveryResult = this.recoverFromTimeoutError(errorInfo);
                break;
            case this.config.errorCategories.AUTHENTICATION:
                recoveryResult = this.recoverFromAuthError(errorInfo);
                break;
            case this.config.errorCategories.SERVER_ERROR:
                recoveryResult = this.recoverFromServerError(errorInfo);
                break;
            default:
                recoveryResult = this.recoverFromGenericError(errorInfo);
                break;
        }

        if (recoveryResult.handled) {
            this.log(`Recuperación exitosa para error ${errorId}: ${recoveryResult.strategy}`);
            return recoveryResult;
        } else {
            this.log(`Recuperación fallida para error ${errorId}`);
            return { handled: false };
        }
    },

    // Recuperación de error de red
    recoverFromNetworkError: function(errorInfo) {
        const errorId = errorInfo.id;
        const attempts = this.state.recoveryAttempts.get(errorId) || 0;

        if (attempts === 1) {
            // Primer intento: esperar y reintentar
            return {
                handled: true,
                strategy: this.config.recoveryStrategies.RETRY,
                result: new Promise((resolve) => {
                    setTimeout(() => {
                        this.log(`Reintentando operación después de error de red: ${errorId}`);
                        resolve();
                    }, this.config.recoveryDelay);
                })
            };
        } else if (attempts === 2) {
            // Segundo intento: verificar conexión y reintentar
            return {
                handled: true,
                strategy: this.config.recoveryStrategies.RETRY,
                result: new Promise((resolve, reject) => {
                    if (navigator.onLine) {
                        setTimeout(() => {
                            this.log(`Reintentando operación con conexión verificada: ${errorId}`);
                            resolve();
                        }, this.config.recoveryDelay);
                    } else {
                        reject(new Error('Sin conexión a internet'));
                    }
                })
            };
        } else {
            // Tercer intento: activar modo degradado
            return this.activateDegradedMode(errorInfo);
        }
    },

    // Recuperación de error de timeout
    recoverFromTimeoutError: function(errorInfo) {
        const errorId = errorInfo.id;
        const attempts = this.state.recoveryAttempts.get(errorId) || 0;

        if (attempts === 1) {
            // Primer intento: reintentar con timeout extendido
            return {
                handled: true,
                strategy: this.config.recoveryStrategies.RETRY,
                result: new Promise((resolve) => {
                    setTimeout(() => {
                        this.log(`Reintentando operación con timeout extendido: ${errorId}`);
                        resolve();
                    }, this.config.recoveryDelay * 2);
                })
            };
        } else {
            // Segundo intento: activar modo degradado
            return this.activateDegradedMode(errorInfo);
        }
    },

    // Recuperación de error de autenticación
    recoverFromAuthError: function(errorInfo) {
        const errorId = errorInfo.id;
        const attempts = this.state.recoveryAttempts.get(errorId) || 0;

        if (attempts === 1) {
            // Primer intento: intentar refrescar token
            return {
                handled: true,
                strategy: this.config.recoveryStrategies.RETRY,
                result: new Promise((resolve, reject) => {
                    if (typeof window !== 'undefined' && window.Justice2Auth) {
                        this.log(`Intentando refrescar token para error de autenticación: ${errorId}`);
                        window.Justice2Auth.refreshToken()
                            .then(() => {
                                resolve();
                            })
                            .catch(err => {
                                reject(err);
                            });
                    } else {
                        reject(new Error('Sistema de autenticación no disponible'));
                    }
                })
            };
        } else {
            // Segundo intento: requerir acción del usuario
            return {
                handled: true,
                strategy: this.config.recoveryStrategies.USER_ACTION,
                result: new Promise((resolve, reject) => {
                    this.notifyUser({
                        ...errorInfo,
                        userMessage: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
                        requiresAction: true
                    });
                    reject(new Error('Requiere acción del usuario'));
                })
            };
        }
    },

    // Recuperación de error del servidor
    recoverFromServerError: function(errorInfo) {
        const errorId = errorInfo.id;
        const attempts = this.state.recoveryAttempts.get(errorId) || 0;

        if (attempts === 1) {
            // Primer intento: reintentar con backoff
            return {
                handled: true,
                strategy: this.config.recoveryStrategies.RETRY,
                result: new Promise((resolve) => {
                    const delay = this.config.recoveryDelay * Math.pow(2, attempts);
                    setTimeout(() => {
                        this.log(`Reintentando operación con backoff para error de servidor: ${errorId}`);
                        resolve();
                    }, delay);
                })
            };
        } else {
            // Segundo intento: activar modo degradado
            return this.activateDegradedMode(errorInfo);
        }
    },

    // Recuperación de error genérico
    recoverFromGenericError: function(errorInfo) {
        const errorId = errorInfo.id;
        const attempts = this.state.recoveryAttempts.get(errorId) || 0;

        if (attempts === 1) {
            // Primer intento: reintentar simple
            return {
                handled: true,
                strategy: this.config.recoveryStrategies.RETRY,
                result: new Promise((resolve) => {
                    setTimeout(() => {
                        this.log(`Reintentando operación genérica para error: ${errorId}`);
                        resolve();
                    }, this.config.recoveryDelay);
                })
            };
        } else {
            // Segundo intento: activar modo degradado
            return this.activateDegradedMode(errorInfo);
        }
    },

    // Activar modo degradado
    activateDegradedMode: function(errorInfo) {
        if (this.state.degradedMode) {
            return { handled: false };
        }

        this.state.degradedMode = true;
        this.log(`Activando modo degradado para error: ${errorInfo.id}`);

        // Emitir evento de modo degradado
        if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
            const event = new CustomEvent('async-error:degraded-mode', {
                detail: {
                    error: errorInfo,
                    timestamp: new Date().toISOString()
                }
            });
            window.dispatchEvent(event);
        }

        // Notificar al usuario
        this.notifyUser({
            ...errorInfo,
            userMessage: 'La aplicación está funcionando en modo limitado. Algunas funciones pueden no estar disponibles temporalmente.'
        });

        return {
            handled: true,
            strategy: this.config.recoveryStrategies.DEGRADED_MODE,
            result: Promise.resolve(null) // Valor nulo para indicar modo degradado
        };
    },

    // Desactivar modo degradado
    deactivateDegradedMode: function() {
        if (!this.state.degradedMode) {
            return;
        }

        this.state.degradedMode = false;
        this.log('Desactivando modo degradado');

        // Emitir evento de restauración
        if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
            const event = new CustomEvent('async-error:degraded-mode-restored', {
                detail: {
                    timestamp: new Date().toISOString()
                }
            });
            window.dispatchEvent(event);
        }

        // Notificar al usuario
        if (this.config.enableUserNotification) {
            this.notifyUser({
                userMessage: 'La aplicación ha vuelto a su funcionamiento normal.',
                severity: 'info'
            });
        }
    },

    // Generar ID único para error
    generateErrorId: function() {
        return 'error_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Limpiar estado de recuperación
    clearRecoveryState: function(errorId) {
        this.state.recoveryAttempts.delete(errorId);
        this.state.activeRecoveries.delete(errorId);
    },

    // Obtener estadísticas
    getStatistics: function() {
        const totalErrors = Array.from(this.state.errorCounts.values()).reduce((sum, count) => sum + count, 0);
        
        return {
            totalErrors,
            errorsByCategory: Object.fromEntries(this.state.errorCounts),
            errorHistory: this.state.errorHistory.slice(0, 10), // Últimos 10 errores
            degradedMode: this.state.degradedMode,
            activeRecoveries: this.state.activeRecoveries.size,
            recoveryAttempts: Object.fromEntries(this.state.recoveryAttempts)
        };
    },

    // Reiniciar estadísticas
    resetStatistics: function() {
        this.state.errorHistory = [];
        this.state.errorCounts.clear();
        this.state.recoveryAttempts.clear();
        this.state.activeRecoveries.clear();
        this.state.lastError = null;
        this.state.degradedMode = false;
        
        this.log('Estadísticas de Async Error Handler reiniciadas');
    },

    // Logging
    log: function(message, data = null) {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [AsyncErrorHandler] ${message}`;
            
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
        AsyncErrorHandler.init();
    });
} else if (typeof window !== 'undefined') {
    // Para Node.js o si ya está cargado
    AsyncErrorHandler.init();
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.AsyncErrorHandler = AsyncErrorHandler;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = AsyncErrorHandler;
}