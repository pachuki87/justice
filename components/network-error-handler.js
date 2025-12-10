/**
 * Justice 2 Network Error Handler
 * Sistema centralizado de manejo de errores de red con patrones de resiliencia
 */

const NetworkErrorHandler = {
    // Configuración
    config: {
        // Configuración de reintentos
        retry: {
            maxAttempts: 3,
            baseDelay: 1000, // 1 segundo
            maxDelay: 30000, // 30 segundos
            backoffMultiplier: 2,
            jitter: true, // Aleatorización para evitar thundering herd
            retryableErrors: [
                'NETWORK_ERROR',
                'TIMEOUT_ERROR',
                'CONNECTION_REFUSED',
                'SERVER_ERROR',
                'SERVICE_UNAVAILABLE',
                'BAD_GATEWAY',
                'GATEWAY_TIMEOUT',
                'SSL_ERROR',
                'DNS_ERROR'
            ]
        },
        
        // Configuración de circuit breaker
        circuitBreaker: {
            failureThreshold: 5, // Número de fallos antes de abrir el circuito
            recoveryTimeout: 60000, // Tiempo para intentar recuperación (60 segundos)
            monitoringPeriod: 10000, // Período de monitoreo (10 segundos)
            halfOpenMaxCalls: 3, // Máximo de llamadas en estado half-open
            autoReset: true // Reset automático después del período de recuperación
        },
        
        // Configuración de timeouts
        timeouts: {
            connect: 10000, // 10 segundos para conexión
            read: 30000, // 30 segundos para lectura
            write: 30000, // 30 segundos para escritura
            total: 60000 // 60 segundos total
        },
        
        // Configuración de detección de conexión
        connection: {
            checkInterval: 30000, // 30 segundos
            checkTimeout: 5000, // 5 segundos para check de conexión
            retryCheckAttempts: 3,
            onlineThreshold: 2, // Número de checks exitosos para considerar online
            offlineThreshold: 3 // Número de checks fallidos para considerar offline
        },
        
        // Configuración de notificaciones
        notifications: {
            showUserNotifications: true,
            debounceTime: 5000, // 5 segundos entre notificaciones similares
            maxNotificationsPerMinute: 5,
            persistCriticalErrors: true,
            logLevel: 'warn' // 'debug', 'info', 'warn', 'error'
        }
    },
    
    // Estado del manejador
    state: {
        isOnline: navigator.onLine,
        connectionStatus: 'unknown', // 'online', 'offline', 'degraded', 'unknown'
        lastConnectionCheck: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        
        // Estado del circuit breaker por endpoint
        circuitBreakers: new Map(),
        
        // Estadísticas
        stats: {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            retriedRequests: 0,
            circuitBreakerTrips: 0,
            averageResponseTime: 0,
            lastError: null,
            lastSuccessTime: null
        },
        
        // Cola de solicitudes pendientes
        pendingRequests: new Map(),
        
        // Historial de errores reciente
        errorHistory: [],
        
        // Notificaciones recientes para evitar spam
        recentNotifications: []
    },
    
    // Inicialización
    init: function() {
        this.log('Inicializando Network Error Handler');
        
        // Configurar eventos de conexión
        this.setupConnectionEvents();
        
        // Iniciar monitoreo de conexión
        this.startConnectionMonitoring();
        
        // Configurar interceptores globales
        this.setupGlobalInterceptors();
        
        // Limpiar estado periódicamente
        this.startPeriodicCleanup();
        
        this.log('Network Error Handler inicializado');
    },
    
    // Configurar eventos de conexión
    setupConnectionEvents: function() {
        // Eventos del navegador
        window.addEventListener('online', () => {
            this.handleConnectionRestored();
        });
        
        window.addEventListener('offline', () => {
            this.handleConnectionLost();
        });
        
        // Eventos de visibilidad de página
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Cuando la página se vuelve visible, verificar conexión
                this.checkConnection();
            }
        });
        
        // Eventos de foco de ventana
        window.addEventListener('focus', () => {
            this.checkConnection();
        });
    },
    
    // Iniciar monitoreo de conexión
    startConnectionMonitoring: function() {
        setInterval(() => {
            this.checkConnection();
        }, this.config.connection.checkInterval);
        
        // Verificación inicial
        this.checkConnection();
    },
    
    // Verificar estado de conexión
    checkConnection: async function() {
        const now = Date.now();
        
        // Evitar verificaciones muy frecuentes
        if (this.state.lastConnectionCheck && 
            now - this.state.lastConnectionCheck < 5000) {
            return this.state.isOnline;
        }
        
        this.state.lastConnectionCheck = now;
        
        try {
            // Intentar conectar a un endpoint confiable
            const isOnline = await this.performConnectionCheck();
            
            if (isOnline) {
                this.state.consecutiveSuccesses++;
                this.state.consecutiveFailures = 0;
                
                // Cambiar a online si alcanza el umbral
                if (this.state.consecutiveSuccesses >= this.config.connection.onlineThreshold) {
                    if (this.state.connectionStatus !== 'online') {
                        this.handleConnectionRestored();
                    }
                }
            } else {
                this.state.consecutiveFailures++;
                this.state.consecutiveSuccesses = 0;
                
                // Cambiar a offline si alcanza el umbral
                if (this.state.consecutiveFailures >= this.config.connection.offlineThreshold) {
                    if (this.state.connectionStatus !== 'offline') {
                        this.handleConnectionLost();
                    }
                }
            }
            
            return isOnline;
            
        } catch (error) {
            this.state.consecutiveFailures++;
            this.state.consecutiveSuccesses = 0;
            
            if (this.state.consecutiveFailures >= this.config.connection.offlineThreshold) {
                this.handleConnectionLost();
            }
            
            return false;
        }
    },
    
    // Realizar verificación de conexión
    performConnectionCheck: async function() {
        const checkUrls = [
            '/api/health',
            '/api/ping',
            '/favicon.ico',
            'https://www.google.com/favicon.ico'
        ];
        
        for (const url of checkUrls) {
            try {
                const response = await fetch(url, {
                    method: 'HEAD',
                    cache: 'no-cache',
                    signal: AbortSignal.timeout(this.config.connection.checkTimeout)
                });
                
                if (response.ok) {
                    return true;
                }
            } catch (error) {
                // Continuar con el siguiente URL
                continue;
            }
        }
        
        return false;
    },
    
    // Manejar restauración de conexión
    handleConnectionRestored: function() {
        if (this.state.connectionStatus === 'online') {
            return; // Ya estaba online
        }
        
        this.state.isOnline = true;
        this.state.connectionStatus = 'online';
        this.state.consecutiveFailures = 0;
        
        // Resetear circuit breakers
        this.resetAllCircuitBreakers();
        
        // Procesar solicitudes pendientes
        this.processPendingRequests();
        
        // Notificar al usuario
        this.showConnectionNotification('Conexión restaurada', 'success');
        
        // Emitir evento
        this.emitConnectionEvent('connection:restored', {
            timestamp: Date.now(),
            previousStatus: this.state.connectionStatus
        });
        
        this.log('Conexión restaurada');
    },
    
    // Manejar pérdida de conexión
    handleConnectionLost: function() {
        if (this.state.connectionStatus === 'offline') {
            return; // Ya estaba offline
        }
        
        this.state.isOnline = false;
        this.state.connectionStatus = 'offline';
        this.state.consecutiveSuccesses = 0;
        
        // Abrir todos los circuit breakers
        this.tripAllCircuitBreakers();
        
        // Notificar al usuario
        this.showConnectionNotification('Conexión perdida', 'error');
        
        // Emitir evento
        this.emitConnectionEvent('connection:lost', {
            timestamp: Date.now(),
            previousStatus: this.state.connectionStatus
        });
        
        this.log('Conexión perdida');
    },
    
    // Manejar error de red
    handleNetworkError: function(error, context = {}) {
        const errorInfo = this.classifyError(error);
        
        // Actualizar estadísticas
        this.updateStats(errorInfo);
        
        // Registrar error
        this.logError(errorInfo, context);
        
        // Actualizar circuit breaker si aplica
        this.updateCircuitBreaker(errorInfo, context);
        
        // Determinar si se debe reintentar
        const shouldRetry = this.shouldRetry(errorInfo, context);
        
        // Mostrar notificación al usuario si es apropiado
        this.showErrorNotification(errorInfo, context);
        
        // Emitir evento de error
        this.emitErrorEvent(errorInfo, context);
        
        return {
            errorInfo,
            shouldRetry,
            retryDelay: shouldRetry ? this.calculateRetryDelay(context.retryCount || 0) : null
        };
    },
    
    // Clasificar error
    classifyError: function(error) {
        const errorInfo = {
            type: 'UNKNOWN_ERROR',
            severity: 'medium',
            retryable: false,
            userMessage: 'Error de conexión desconocido',
            technicalMessage: error.message || 'Error desconocido',
            timestamp: Date.now(),
            originalError: error
        };
        
        // Error de red
        if (!navigator.onLine) {
            errorInfo.type = 'OFFLINE_ERROR';
            errorInfo.severity = 'high';
            errorInfo.userMessage = 'Sin conexión a internet';
            errorInfo.retryable = false;
            return errorInfo;
        }
        
        // Timeout
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
            errorInfo.type = 'TIMEOUT_ERROR';
            errorInfo.severity = 'medium';
            errorInfo.userMessage = 'Tiempo de espera agotado';
            errorInfo.retryable = true;
            return errorInfo;
        }
        
        // Conexión rechazada
        if (error.message.includes('ERR_CONNECTION_REFUSED') || 
            error.message.includes('Connection refused')) {
            errorInfo.type = 'CONNECTION_REFUSED';
            errorInfo.severity = 'high';
            errorInfo.userMessage = 'Servidor no disponible';
            errorInfo.retryable = true;
            return errorInfo;
        }
        
        // Error SSL
        if (this.isSSLError(error)) {
            errorInfo.type = 'SSL_ERROR';
            errorInfo.severity = 'high';
            errorInfo.userMessage = 'Error de seguridad en la conexión';
            errorInfo.retryable = false;
            return errorInfo;
        }
        
        // Error DNS
        if (error.message.includes('ERR_NAME_NOT_RESOLVED') || 
            error.message.includes('DNS_ERROR')) {
            errorInfo.type = 'DNS_ERROR';
            errorInfo.severity = 'high';
            errorInfo.userMessage = 'No se puede resolver el servidor';
            errorInfo.retryable = true;
            return errorInfo;
        }
        
        // Error de red genérico
        if (error.message.includes('NETWORK_ERROR') || 
            error.message.includes('fetch')) {
            errorInfo.type = 'NETWORK_ERROR';
            errorInfo.severity = 'medium';
            errorInfo.userMessage = 'Error de conexión';
            errorInfo.retryable = true;
            return errorInfo;
        }
        
        // Error de servidor (5xx)
        if (error.response && error.response.status >= 500) {
            errorInfo.type = 'SERVER_ERROR';
            errorInfo.severity = 'medium';
            errorInfo.userMessage = 'Error del servidor';
            errorInfo.retryable = true;
            return errorInfo;
        }
        
        // Servicio no disponible
        if (error.response && error.response.status === 503) {
            errorInfo.type = 'SERVICE_UNAVAILABLE';
            errorInfo.severity = 'high';
            errorInfo.userMessage = 'Servicio no disponible';
            errorInfo.retryable = true;
            return errorInfo;
        }
        
        // Bad Gateway
        if (error.response && error.response.status === 502) {
            errorInfo.type = 'BAD_GATEWAY';
            errorInfo.severity = 'medium';
            errorInfo.userMessage = 'Error de puerta de enlace';
            errorInfo.retryable = true;
            return errorInfo;
        }
        
        // Gateway Timeout
        if (error.response && error.response.status === 504) {
            errorInfo.type = 'GATEWAY_TIMEOUT';
            errorInfo.severity = 'medium';
            errorInfo.userMessage = 'Tiempo de espera del servidor agotado';
            errorInfo.retryable = true;
            return errorInfo;
        }
        
        return errorInfo;
    },
    
    // Verificar si es error SSL
    isSSLError: function(error) {
        const sslPatterns = [
            'ERR_CERT_AUTHORITY_INVALID',
            'ERR_CERT_COMMON_NAME_INVALID',
            'ERR_CERT_DATE_INVALID',
            'ERR_CERT_INVALID',
            'SSL_ERROR',
            'certificate',
            'SSL handshake failed',
            'self-signed certificate'
        ];
        
        const errorMessage = error.message || '';
        return sslPatterns.some(pattern => 
            errorMessage.toLowerCase().includes(pattern.toLowerCase())
        );
    },
    
    // Determinar si se debe reintentar
    shouldRetry: function(errorInfo, context) {
        const retryCount = context.retryCount || 0;
        
        // No reintentar si alcanzó el máximo
        if (retryCount >= this.config.retry.maxAttempts) {
            return false;
        }
        
        // No reintentar si está offline
        if (!this.state.isOnline) {
            return false;
        }
        
        // No reintentar si el circuit breaker está abierto
        if (this.isCircuitBreakerOpen(context.endpoint)) {
            return false;
        }
        
        // Reintentar si el error es reintentable
        return this.config.retry.retryableErrors.includes(errorInfo.type);
    },
    
    // Calcular delay de reintento con backoff exponencial
    calculateRetryDelay: function(retryCount) {
        const { baseDelay, maxDelay, backoffMultiplier, jitter } = this.config.retry;
        
        // Calcular delay exponencial
        let delay = baseDelay * Math.pow(backoffMultiplier, retryCount);
        
        // Aplicar jitter para evitar thundering herd
        if (jitter) {
            delay = delay * (0.5 + Math.random() * 0.5);
        }
        
        // Limitar al máximo
        return Math.min(delay, maxDelay);
    },
    
    // Obtener o crear circuit breaker para endpoint
    getCircuitBreaker: function(endpoint) {
        if (!this.state.circuitBreakers.has(endpoint)) {
            this.state.circuitBreakers.set(endpoint, {
                state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
                failureCount: 0,
                lastFailureTime: null,
                successCount: 0,
                halfOpenCalls: 0,
                nextAttempt: null,
                totalCalls: 0,
                totalFailures: 0,
                totalSuccesses: 0
            });
        }
        
        return this.state.circuitBreakers.get(endpoint);
    },
    
    // Verificar si el circuit breaker está abierto
    isCircuitBreakerOpen: function(endpoint) {
        const circuitBreaker = this.getCircuitBreaker(endpoint);
        
        if (circuitBreaker.state === 'OPEN') {
            // Verificar si es tiempo para intentar recuperación
            if (Date.now() >= circuitBreaker.nextAttempt) {
                circuitBreaker.state = 'HALF_OPEN';
                circuitBreaker.halfOpenCalls = 0;
                return false;
            }
            return true;
        }
        
        return false;
    },
    
    // Actualizar circuit breaker
    updateCircuitBreaker: function(errorInfo, context) {
        const endpoint = context.endpoint || 'default';
        const circuitBreaker = this.getCircuitBreaker(endpoint);
        
        circuitBreaker.totalCalls++;
        
        if (errorInfo.severity === 'high' || errorInfo.type === 'SERVER_ERROR') {
            circuitBreaker.failureCount++;
            circuitBreaker.totalFailures++;
            circuitBreaker.lastFailureTime = Date.now();
            
            // Abrir circuito si alcanza el umbral
            if (circuitBreaker.failureCount >= this.config.circuitBreaker.failureThreshold) {
                this.tripCircuitBreaker(endpoint);
            }
        } else {
            circuitBreaker.successCount++;
            circuitBreaker.totalSuccesses++;
            
            // Resetear contador de fallos en estado HALF_OPEN
            if (circuitBreaker.state === 'HALF_OPEN') {
                circuitBreaker.failureCount = 0;
                circuitBreaker.state = 'CLOSED';
            }
        }
    },
    
    // Abrir circuit breaker
    tripCircuitBreaker: function(endpoint) {
        const circuitBreaker = this.getCircuitBreaker(endpoint);
        
        if (circuitBreaker.state !== 'OPEN') {
            circuitBreaker.state = 'OPEN';
            circuitBreaker.nextAttempt = Date.now() + this.config.circuitBreaker.recoveryTimeout;
            
            this.state.stats.circuitBreakerTrips++;
            
            this.log(`Circuit breaker abierto para endpoint: ${endpoint}`);
            
            // Emitir evento
            this.emitCircuitBreakerEvent('circuit-breaker:tripped', {
                endpoint,
                failureCount: circuitBreaker.failureCount,
                nextAttempt: circuitBreaker.nextAttempt
            });
        }
    },
    
    // Resetear circuit breaker
    resetCircuitBreaker: function(endpoint) {
        const circuitBreaker = this.getCircuitBreaker(endpoint);
        
        circuitBreaker.state = 'CLOSED';
        circuitBreaker.failureCount = 0;
        circuitBreaker.successCount = 0;
        circuitBreaker.halfOpenCalls = 0;
        circuitBreaker.nextAttempt = null;
        
        this.log(`Circuit breaker reseteado para endpoint: ${endpoint}`);
    },
    
    // Resetear todos los circuit breakers
    resetAllCircuitBreakers: function() {
        for (const [endpoint] of this.state.circuitBreakers) {
            this.resetCircuitBreaker(endpoint);
        }
    },
    
    // Abrir todos los circuit breakers
    tripAllCircuitBreakers: function() {
        for (const [endpoint] of this.state.circuitBreakers) {
            this.tripCircuitBreaker(endpoint);
        }
    },
    
    // Actualizar estadísticas
    updateStats: function(errorInfo) {
        this.state.stats.totalRequests++;
        
        if (errorInfo.severity === 'low') {
            this.state.stats.successfulRequests++;
            this.state.stats.lastSuccessTime = Date.now();
        } else {
            this.state.stats.failedRequests++;
            this.state.stats.lastError = errorInfo;
        }
        
        // Agregar al historial
        this.state.errorHistory.push({
            ...errorInfo,
            timestamp: Date.now()
        });
        
        // Mantener solo los últimos 100 errores
        if (this.state.errorHistory.length > 100) {
            this.state.errorHistory = this.state.errorHistory.slice(-100);
        }
    },
    
    // Mostrar notificación de conexión
    showConnectionNotification: function(message, type) {
        if (!this.config.notifications.showUserNotifications) {
            return;
        }
        
        // Evitar spam de notificaciones
        if (this.isNotificationDuplicate(message, type)) {
            return;
        }
        
        // Usar sistema de notificaciones global si está disponible
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils && window.Justice2.utils.showNotification) {
            window.Justice2.utils.showNotification(message, type);
        } else if (typeof window !== 'undefined' && window.NotificationSystem) {
            window.NotificationSystem.show(message, type);
        } else {
            // Fallback a console
            console.log(`[NetworkErrorHandler] ${message}`);
        }
        
        // Registrar notificación
        this.state.recentNotifications.push({
            message,
            type,
            timestamp: Date.now()
        });
        
        // Limpiar notificaciones antiguas
        this.cleanupOldNotifications();
    },
    
    // Mostrar notificación de error
    showErrorNotification: function(errorInfo, context) {
        if (!this.config.notifications.showUserNotifications) {
            return;
        }
        
        // No mostrar notificaciones para errores de baja severidad
        if (errorInfo.severity === 'low') {
            return;
        }
        
        // Evitar spam de notificaciones similares
        if (this.isNotificationDuplicate(errorInfo.userMessage, 'error')) {
            return;
        }
        
        // Usar sistema de notificaciones global
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils && window.Justice2.utils.showNotification) {
            window.Justice2.utils.showNotification(errorInfo.userMessage, 'error');
        } else if (typeof window !== 'undefined' && window.NotificationSystem) {
            window.NotificationSystem.show(errorInfo.userMessage, 'error');
        }
        
        // Registrar notificación
        this.state.recentNotifications.push({
            message: errorInfo.userMessage,
            type: 'error',
            timestamp: Date.now()
        });
        
        // Limpiar notificaciones antiguas
        this.cleanupOldNotifications();
    },
    
    // Verificar si es notificación duplicada
    isNotificationDuplicate: function(message, type) {
        const now = Date.now();
        const recentNotifications = this.state.recentNotifications.filter(
            notification => now - notification.timestamp < this.config.notifications.debounceTime
        );
        
        return recentNotifications.some(
            notification => notification.message === message && notification.type === type
        );
    },
    
    // Limpiar notificaciones antiguas
    cleanupOldNotifications: function() {
        const now = Date.now();
        this.state.recentNotifications = this.state.recentNotifications.filter(
            notification => now - notification.timestamp < 60000 // Mantener solo del último minuto
        );
    },
    
    // Procesar solicitudes pendientes
    processPendingRequests: async function() {
        const pendingRequests = Array.from(this.state.pendingRequests.entries());
        
        for (const [requestId, requestInfo] of pendingRequests) {
            try {
                // Reintentar solicitud
                const result = await requestInfo.retryFunction();
                
                // Resolver promesa original
                requestInfo.resolve(result);
                
                // Remover de pendientes
                this.state.pendingRequests.delete(requestId);
                
            } catch (error) {
                // Si sigue fallando, mantener en pendientes
                // o rechazar después de varios intentos
                if (requestInfo.retryCount >= this.config.retry.maxAttempts) {
                    requestInfo.reject(error);
                    this.state.pendingRequests.delete(requestId);
                } else {
                    requestInfo.retryCount++;
                }
            }
        }
    },
    
    // Agregar solicitud a cola de pendientes
    addPendingRequest: function(requestId, retryFunction, resolve, reject) {
        this.state.pendingRequests.set(requestId, {
            retryFunction,
            resolve,
            reject,
            retryCount: 0,
            timestamp: Date.now()
        });
    },
    
    // Configurar interceptores globales
    setupGlobalInterceptors: function() {
        // Interceptar fetch si está disponible
        if (typeof window !== 'undefined' && window.fetch) {
            const originalFetch = window.fetch;
            
            window.fetch = async (...args) => {
                return this.wrapFetch(originalFetch, ...args);
            };
        }
        
        // Interceptar XMLHttpRequest si está disponible
        if (typeof window !== 'undefined' && window.XMLHttpRequest) {
            this.wrapXMLHttpRequest();
        }
    },
    
    // Envolver fetch con manejo de errores
    wrapFetch: function(originalFetch, ...args) {
        const [url, options = {}] = args;
        const requestId = this.generateRequestId();
        
        // Verificar circuit breaker
        const endpoint = new URL(url, window.location.origin).pathname;
        if (this.isCircuitBreakerOpen(endpoint)) {
            return Promise.reject(new Error('Circuit breaker abierto'));
        }
        
        // Agregar timeout si no está especificado
        if (!options.signal) {
            options.signal = AbortSignal.timeout(this.config.timeouts.total);
        }
        
        return originalFetch(...args)
            .then(response => {
                // Actualizar circuit breaker con éxito
                this.updateCircuitBreaker({
                    type: 'SUCCESS',
                    severity: 'low'
                }, { endpoint });
                
                return response;
            })
            .catch(error => {
                // Manejar error de red
                const errorInfo = this.handleNetworkError(error, {
                    url,
                    method: options.method || 'GET',
                    endpoint,
                    requestId
                });
                
                // Reintentar si es apropiado
                if (errorInfo.shouldRetry) {
                    return this.retryFetch(originalFetch, url, options, errorInfo.retryDelay);
                }
                
                throw error;
            });
    },
    
    // Reintentar fetch
    retryFetch: async function(originalFetch, url, options, delay) {
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const newOptions = { ...options };
        
        // Crear nuevo AbortSignal para el reintento
        if (newOptions.signal) {
            newOptions.signal = AbortSignal.timeout(this.config.timeouts.total);
        }
        
        return originalFetch(url, newOptions);
    },
    
    // Envolver XMLHttpRequest
    wrapXMLHttpRequest: function() {
        const OriginalXHR = window.XMLHttpRequest;
        const self = this;
        
        window.XMLHttpRequest = function() {
            const xhr = new OriginalXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;
            
            let requestInfo = {
                method: 'GET',
                url: '',
                endpoint: '',
                requestId: self.generateRequestId()
            };
            
            xhr.open = function(method, url, async, user, password) {
                requestInfo.method = method;
                requestInfo.url = url;
                requestInfo.endpoint = new URL(url, window.location.origin).pathname;
                
                // Verificar circuit breaker
                if (self.isCircuitBreakerOpen(requestInfo.endpoint)) {
                    throw new Error('Circuit breaker abierto');
                }
                
                return originalOpen.call(this, method, url, async, user, password);
            };
            
            xhr.send = function(body) {
                // Configurar timeout
                if (xhr.timeout === 0) {
                    xhr.timeout = self.config.timeouts.total;
                }
                
                // Manejar eventos
                xhr.addEventListener('load', function() {
                    // Actualizar circuit breaker con éxito
                    self.updateCircuitBreaker({
                        type: 'SUCCESS',
                        severity: 'low'
                    }, requestInfo);
                });
                
                xhr.addEventListener('error', function(error) {
                    // Manejar error de red
                    const errorInfo = self.handleNetworkError(error, requestInfo);
                    
                    // Reintentar si es apropiado
                    if (errorInfo.shouldRetry) {
                        setTimeout(() => {
                            originalSend.call(xhr, body);
                        }, errorInfo.retryDelay);
                    }
                });
                
                xhr.addEventListener('timeout', function() {
                    // Manejar timeout
                    const errorInfo = self.handleNetworkError(
                        new Error('Timeout'), 
                        { ...requestInfo, type: 'TIMEOUT_ERROR' }
                    );
                    
                    // Reintentar si es apropiado
                    if (errorInfo.shouldRetry) {
                        setTimeout(() => {
                            originalSend.call(xhr, body);
                        }, errorInfo.retryDelay);
                    }
                });
                
                return originalSend.call(this, body);
            };
            
            return xhr;
        };
    },
    
    // Iniciar limpieza periódica
    startPeriodicCleanup: function() {
        setInterval(() => {
            this.cleanupOldNotifications();
            this.cleanupOldPendingRequests();
        }, 60000); // Cada minuto
    },
    
    // Limpiar solicitudes pendientes antiguas
    cleanupOldPendingRequests: function() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutos
        
        for (const [requestId, requestInfo] of this.state.pendingRequests) {
            if (now - requestInfo.timestamp > maxAge) {
                requestInfo.reject(new Error('Solicitud expirada'));
                this.state.pendingRequests.delete(requestId);
            }
        }
    },
    
    // Generar ID de solicitud único
    generateRequestId: function() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    // Emitir evento de conexión
    emitConnectionEvent: function(eventType, data) {
        if (typeof window !== 'undefined' && window.CustomEvent) {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    },
    
    // Emitir evento de error
    emitErrorEvent: function(errorInfo, context) {
        if (typeof window !== 'undefined' && window.CustomEvent) {
            const event = new CustomEvent('network:error', {
                detail: { errorInfo, context }
            });
            document.dispatchEvent(event);
        }
    },
    
    // Emitir evento de circuit breaker
    emitCircuitBreakerEvent: function(eventType, data) {
        if (typeof window !== 'undefined' && window.CustomEvent) {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    },
    
    // Obtener estadísticas
    getStats: function() {
        return {
            ...this.state.stats,
            connectionStatus: this.state.connectionStatus,
            isOnline: this.state.isOnline,
            circuitBreakers: Array.from(this.state.circuitBreakers.entries()).map(([endpoint, cb]) => ({
                endpoint,
                state: cb.state,
                failureCount: cb.failureCount,
                totalCalls: cb.totalCalls,
                successRate: cb.totalCalls > 0 ? (cb.totalSuccesses / cb.totalCalls * 100).toFixed(2) + '%' : '0%'
            })),
            pendingRequests: this.state.pendingRequests.size,
            errorHistory: this.state.errorHistory.slice(-10) // Últimos 10 errores
        };
    },
    
    // Resetear estadísticas
    resetStats: function() {
        this.state.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            retriedRequests: 0,
            circuitBreakerTrips: 0,
            averageResponseTime: 0,
            lastError: null,
            lastSuccessTime: null
        };
        
        this.state.errorHistory = [];
        this.state.recentNotifications = [];
    },
    
    // Logging
    log: function(message, level = 'info') {
        if (this.config.notifications.logLevel === 'debug' || 
            (this.config.notifications.logLevel === 'info' && level !== 'debug')) {
            console.log(`[NetworkErrorHandler] ${message}`);
        }
    },
    
    logError: function(errorInfo, context) {
        if (this.config.notifications.logLevel !== 'debug') {
            console.warn(`[NetworkErrorHandler] ${errorInfo.userMessage}`, {
                type: errorInfo.type,
                severity: errorInfo.severity,
                context
            });
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            NetworkErrorHandler.init();
        });
    } else {
        NetworkErrorHandler.init();
    }
    
    // Exportar para uso global
    window.NetworkErrorHandler = NetworkErrorHandler;
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkErrorHandler;
}