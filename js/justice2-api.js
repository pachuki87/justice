/**
 * Justice 2 API Client
 * Cliente API para comunicación con el backend existente en srv1024767.hstgr.cloud
 * Versión con sincronización robusta integrada
 */

// Importar sistema de protección XSS centralizado
// El sistema se carga automáticamente desde components/xss-protection.js

// Nota: Los sistemas de sincronización robusta se cargarán dinámicamente
// si están disponibles en window.Justice2.syncComponents

// Importar sistema de manejo robusto de promesas
if (typeof window !== 'undefined') {
    // Cargar NetworkErrorHandler primero (dependencia crítica)
    const networkErrorHandlerScript = document.createElement('script');
    networkErrorHandlerScript.src = './components/network-error-handler.js';
    networkErrorHandlerScript.async = true;
    networkErrorHandlerScript.onload = () => {
        console.log('[Justice2API] NetworkErrorHandler cargado');
    };
    document.head.appendChild(networkErrorHandlerScript);
    
    // Cargar PromiseManager
    const promiseManagerScript = document.createElement('script');
    promiseManagerScript.src = './components/promise-manager.js';
    promiseManagerScript.async = true;
    document.head.appendChild(promiseManagerScript);
    
    // Cargar AsyncErrorHandler
    const asyncErrorHandlerScript = document.createElement('script');
    asyncErrorHandlerScript.src = './components/async-error-handler.js';
    asyncErrorHandlerScript.async = true;
    document.head.appendChild(asyncErrorHandlerScript);
    
    // Cargar RetryWrapper
    const retryWrapperScript = document.createElement('script');
    retryWrapperScript.src = './components/retry-wrapper.js';
    retryWrapperScript.async = true;
    document.head.appendChild(retryWrapperScript);
    
    // Cargar PromiseQueue
    const promiseQueueScript = document.createElement('script');
    promiseQueueScript.src = './components/promise-queue.js';
    promiseQueueScript.async = true;
    document.head.appendChild(promiseQueueScript);
    
    // Cargar PromiseCache
    const promiseCacheScript = document.createElement('script');
    promiseCacheScript.src = './components/promise-cache.js';
    promiseCacheScript.async = true;
    document.head.appendChild(promiseCacheScript);
    
    // Cargar CacheManager
    const cacheManagerScript = document.createElement('script');
    cacheManagerScript.src = './components/cache-manager.js';
    cacheManagerScript.async = true;
    document.head.appendChild(cacheManagerScript);
    
    // Cargar RateLimiter si está disponible
    const rateLimiterScript = document.createElement('script');
    rateLimiterScript.src = './components/rate-limiter.js';
    rateLimiterScript.async = true;
    document.head.appendChild(rateLimiterScript);
    
    // Cargar sistema de protección CSRF
    const csrfScript = document.createElement('script');
    csrfScript.src = './components/csrf-protection.js';
    csrfScript.async = true;
    document.head.appendChild(csrfScript);
}

const Justice2API = {
    // Configuración
    config: {
        baseUrl: '/api',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        // Configuración de sincronización
        syncEnabled: true,
        syncTimeout: 15000,
        maxConcurrentRequests: 10,
        enableDeadlockDetection: true,
        enableRaceConditionDetection: true,
        // Configuración de SSL y entorno
        ssl: {
            allowInsecure: false, // Permitir certificados no confiables en desarrollo
            ignoreErrors: false   // Ignorar errores SSL en desarrollo
        },
        environment: 'production', // 'development' o 'production'
        // Estrategia de backoff exponencial
        backoffStrategy: {
            initialDelay: 1000,
            maxDelay: 30000,
            multiplier: 2,
            jitter: true
        },
        endpoints: {
            // Autenticación
            auth: {
                login: '/auth/login',
                register: '/auth/register',
                refresh: '/auth/refresh',
                logout: '/auth/logout',
                profile: '/auth/profile'
            },
            // Casos
            cases: {
                list: '/cases',
                create: '/cases',
                update: '/cases/:id',
                delete: '/cases/:id',
                get: '/cases/:id',
                search: '/cases/search'
            },
            // Documentos
            documents: {
                list: '/documents',
                upload: '/documents/upload',
                download: '/documents/:id/download',
                delete: '/documents/:id',
                analyze: '/documents/:id/analyze',
                search: '/documents/search'
            },
            // Asistente IA
            ai: {
                chat: '/ai/chat',
                analyze: '/ai/analyze',
                suggest: '/ai/suggest',
                research: '/ai/research',
                translate: '/ai/translate'
            },
            // Analytics
            analytics: {
                dashboard: '/analytics/dashboard',
                cases: '/analytics/cases',
                documents: '/analytics/documents',
                performance: '/analytics/performance',
                reports: '/analytics/reports'
            },
            // Usuarios
            users: {
                profile: '/users/profile',
                update: '/users/profile',
                preferences: '/users/preferences'
            }
        }
    },
    
    // Estado del cliente API
    state: {
        lastRequest: null,
        requestQueue: [],
        isOnline: navigator.onLine,
        cache: new Map(),
        apiCache: null, // CacheManager para respuestas API
        rateLimit: {
            requests: 0,
            resetTime: Date.now() + 60000, // 1 minuto
            // Nuevo sistema de rate limiting
            enabled: true,
            clientSide: true,
            serverSide: true,
            buckets: new Map(),
            violations: 0,
            lastViolation: null
        },
        csrf: {
            enabled: true,
            token: null,
            tokenExpiry: null,
            initialized: false
        },
        degradedMode: false,
        degradedReason: null,
        sslBypassEnabled: false,
        // Estado de sincronización
        syncManager: null,
        concurrencyController: null,
        syncDiagnostics: null,
        syncInitialized: false,
        activeRequests: new Map(), // Solicitudes activas con sincronización
        requestLocks: new Map() // Bloqueos de recursos
    },
    
    // Inicialización
    init: function() {
        this.log('Inicializando cliente API con NetworkErrorHandler y sincronización robusta');
        
        // Inicializar sistema de sincronización primero
        this.initializeSynchronization();
        
        // Esperar a que NetworkErrorHandler esté disponible antes de continuar
        const waitForNetworkErrorHandler = () => {
            if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
                // NetworkErrorHandler está disponible, continuar con inicialización
                this.setupInterceptors();
                this.setupErrorHandling();
                this.setupCache();
                this.setupConnectionEvents();
                this.setupCSRFProtection();
                this.initializeAdvancedCache();
                
                // Configurar eventos de NetworkErrorHandler
                this.setupNetworkErrorHandlerEvents();
                
                // Configurar eventos de sincronización
                this.setupSyncEvents();
                
                this.log('Cliente API inicializado con NetworkErrorHandler y sincronización');
            } else {
                // NetworkErrorHandler no está disponible aún, esperar y reintentar
                this.log('Esperando a NetworkErrorHandler...');
                setTimeout(waitForNetworkErrorHandler, 100);
            }
        };
        
        waitForNetworkErrorHandler();
    },
    
    // Inicializar sistema de sincronización
    initializeSynchronization: async function() {
        if (!this.config.syncEnabled) {
            this.log('Sincronización deshabilitada en configuración de API');
            return;
        }
        
        try {
            this.log('Inicializando sistema de sincronización para API...');
            
            // Inicializar SyncManager
            if (typeof SyncManager !== 'undefined') {
                SyncManager.init({
                    maxConcurrentOperations: this.config.maxConcurrentRequests,
                    defaultTimeout: this.config.syncTimeout,
                    enableDeadlockDetection: this.config.enableDeadlockDetection,
                    enableRaceConditionDetection: this.config.enableRaceConditionDetection,
                    enableMetrics: true
                });
                
                this.state.syncManager = SyncManager;
                this.log('SyncManager inicializado para API');
            }
            
            // Inicializar ConcurrencyController
            if (typeof ConcurrencyController !== 'undefined') {
                ConcurrencyController.init({
                    maxThreads: this.config.maxConcurrentRequests,
                    enableAtomicOperations: true,
                    enableRaceDetection: this.config.enableRaceConditionDetection,
                    enableMetrics: true
                });
                
                this.state.concurrencyController = ConcurrencyController;
                this.log('ConcurrencyController inicializado para API');
            }
            
            // Inicializar SyncDiagnostics
            if (typeof SyncDiagnostics !== 'undefined') {
                SyncDiagnostics.init({
                    enableMonitoring: true,
                    enableHealthChecks: true,
                    enableRecovery: true,
                    checkInterval: 30000 // 30 segundos
                });
                
                this.state.syncDiagnostics = SyncDiagnostics;
                this.log('SyncDiagnostics inicializado para API');
            }
            
            this.state.syncInitialized = true;
            this.log('Sistema de sincronización para API inicializado correctamente');
            
        } catch (error) {
            this.log('Error inicializando sistema de sincronización para API:', error);
            // Continuar sin sincronización en caso de error
        }
    },
    
    // Configurar eventos de sincronización
    setupSyncEvents: function() {
        if (!this.state.syncManager) return;
        
        // Escuchar eventos de deadlock
        if (typeof document !== 'undefined') {
            document.addEventListener('sync:deadlock:detected', (event) => {
                this.log('Deadlock detectado en API:', event.detail);
                this.handleSyncDeadlock(event.detail);
            });
            
            document.addEventListener('sync:deadlock:resolved', (event) => {
                this.log('Deadlock resuelto en API:', event.detail);
                this.handleSyncRecovery(event.detail);
            });
            
            document.addEventListener('sync:race:detected', (event) => {
                this.log('Race condition detectada en API:', event.detail);
                this.handleSyncRaceCondition(event.detail);
            });
            
            document.addEventListener('sync:recovery:completed', (event) => {
                this.log('Recuperación de sincronización completada en API:', event.detail);
                this.handleSyncRecovery(event.detail);
            });
            
            document.addEventListener('sync:performance:degraded', (event) => {
                this.log('Rendimiento de sincronización degradado en API:', event.detail);
                this.handleSyncPerformanceDegraded(event.detail);
            });
        }
    },
    
    // Manejar deadlock en sincronización
    handleSyncDeadlock: function(detail) {
        // Liberar bloqueos relacionados con la solicitud afectada
        if (detail.resource) {
            const locks = this.state.requestLocks.get(detail.resource);
            if (locks) {
                locks.forEach(lockId => {
                    this.state.syncManager.releaseLock(detail.resource, lockId);
                });
                this.state.requestLocks.delete(detail.resource);
            }
        }
        
        // Notificar al usuario
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(
                'Conflicto de sincronización detectado, resolviendo...',
                'warning'
            );
        }
    },
    
    // Manejar race condition en sincronización
    handleSyncRaceCondition: function(detail) {
        // Invalidar caché relacionada si aplica
        if (detail.resource && this.state.apiCache) {
            const pattern = `*${detail.resource}*`;
            this.state.apiCache.invalidateByPattern(pattern);
        }
        
        // Notificar al usuario
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(
                'Condición de competencia detectada, aplicando corrección...',
                'warning'
            );
        }
    },
    
    // Manejar recuperación de sincronización
    handleSyncRecovery: function(detail) {
        // Reintentar solicitudes fallidas si aplica
        if (detail.retryRequests && this.state.requestQueue.length > 0) {
            this.processQueue();
        }
        
        // Notificar al usuario
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(
                'Sistema de sincronización recuperado',
                'success'
            );
        }
    },
    
    // Manejar degradación de rendimiento de sincronización
    handleSyncPerformanceDegraded: function(detail) {
        // Reducir concurrencia temporalmente
        if (this.config.maxConcurrentRequests > 5) {
            this.config.maxConcurrentRequests = Math.max(5, this.config.maxConcurrentRequests / 2);
            this.log(`Concurrencia reducida a ${this.config.maxConcurrentRequests} por degradación de rendimiento`);
        }
        
        // Notificar al usuario
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(
                'Rendimiento del sistema degradado, optimizando...',
                'info'
            );
        }
    },
    
    // Ejecutar solicitud con sincronización
    executeWithSync: async function(requestId, requestFn, options = {}) {
        if (!this.state.syncInitialized) {
            // Fallback sin sincronización
            return await requestFn();
        }
        
        const syncOptions = {
            timeout: this.config.syncTimeout,
            priority: options.priority || 5,
            retries: options.retries || this.config.retryAttempts,
            resource: options.resource,
            ...options
        };
        
        try {
            // Registrar solicitud activa
            this.state.activeRequests.set(requestId, {
                startTime: Date.now(),
                status: 'running',
                options: syncOptions
            });
            
            // Ejecutar con control de concurrencia
            const result = await this.state.concurrencyController.execute(
                requestId,
                async () => {
                    // Adquirir bloqueo si se especifica recurso
                    if (syncOptions.resource) {
                        const lockResult = await this.state.syncManager.acquireLock(
                            syncOptions.resource,
                            {
                                timeout: syncOptions.timeout,
                                priority: syncOptions.priority
                            }
                        );
                        
                        if (!lockResult.success) {
                            throw new Error(`No se pudo adquirir bloqueo para ${syncOptions.resource}`);
                        }
                        
                        // Registrar bloqueo
                        if (!this.state.requestLocks.has(syncOptions.resource)) {
                            this.state.requestLocks.set(syncOptions.resource, []);
                        }
                        this.state.requestLocks.get(syncOptions.resource).push(lockResult.lockId);
                        
                        try {
                            return await requestFn();
                        } finally {
                            // Liberar bloqueo
                            const locks = this.state.requestLocks.get(syncOptions.resource);
                            if (locks) {
                                const index = locks.indexOf(lockResult.lockId);
                                if (index > -1) {
                                    locks.splice(index, 1);
                                }
                                if (locks.length === 0) {
                                    this.state.requestLocks.delete(syncOptions.resource);
                                }
                            }
                            
                            await this.state.syncManager.releaseLock(
                                syncOptions.resource,
                                lockResult.lockId
                            );
                        }
                    } else {
                        return await requestFn();
                    }
                },
                syncOptions
            );
            
            // Actualizar estado de solicitud
            const request = this.state.activeRequests.get(requestId);
            if (request) {
                request.status = 'completed';
                request.endTime = Date.now();
                request.duration = request.endTime - request.startTime;
                request.result = result;
            }
            
            return result;
            
        } catch (error) {
            // Actualizar estado de solicitud con error
            const request = this.state.activeRequests.get(requestId);
            if (request) {
                request.status = 'failed';
                request.endTime = Date.now();
                request.duration = request.endTime - request.startTime;
                request.error = error.message;
            }
            
            this.log(`Error en solicitud sincronizada ${requestId}:`, error);
            throw error;
            
        } finally {
            // Limpiar solicitud después de un tiempo
            setTimeout(() => {
                this.state.activeRequests.delete(requestId);
            }, 5000);
        }
    },
    
    // Obtener estado de sincronización de API
    getApiSyncStatus: function() {
        if (!this.state.syncInitialized) {
            return {
                initialized: false,
                enabled: false,
                status: 'disabled'
            };
        }
        
        const status = {
            initialized: true,
            enabled: this.config.syncEnabled,
            activeRequests: this.state.activeRequests.size,
            activeLocks: this.state.requestLocks.size,
            maxConcurrentRequests: this.config.maxConcurrentRequests,
            syncManager: this.state.syncManager ? this.state.syncManager.getStatus() : null,
            concurrencyController: this.state.concurrencyController ? this.state.concurrencyController.getStatus() : null,
            syncDiagnostics: this.state.syncDiagnostics ? this.state.syncDiagnostics.getHealth() : null
        };
        
        // Determinar estado general
        if (status.syncManager && status.syncManager.healthy &&
            status.concurrencyController && status.concurrencyController.healthy) {
            status.status = 'healthy';
        } else if (status.activeRequests > 0) {
            status.status = 'active';
        } else {
            status.status = 'degraded';
        }
        
        return status;
    },
    
    // Configurar eventos de NetworkErrorHandler
    setupNetworkErrorHandlerEvents: function() {
        if (typeof window === 'undefined' || !window.NetworkErrorHandler) {
            return;
        }
        
        // Escuchar eventos de conexión
        document.addEventListener('connection:restored', (event) => {
            this.log('Conexión restaurada detectada por NetworkErrorHandler');
            this.handleConnectionRestored(event.detail);
        });
        
        document.addEventListener('connection:lost', (event) => {
            this.log('Pérdida de conexión detectada por NetworkErrorHandler');
            this.handleConnectionLost(event.detail);
        });
        
        // Escuchar eventos de circuit breaker
        document.addEventListener('circuit-breaker:tripped', (event) => {
            this.log(`Circuit breaker activado para: ${event.detail.endpoint}`);
            this.handleCircuitBreakerTripped(event.detail);
        });
        
        // Escuchar eventos de error de red
        document.addEventListener('network:error', (event) => {
            this.log(`Error de red detectado: ${event.detail.errorInfo.type}`);
            this.handleNetworkErrorEvent(event.detail);
        });
    },
    
    // Manejar restauración de conexión
    handleConnectionRestored: function(detail) {
        // Procesar solicitudes pendientes cuando la conexión se restaura
        this.processQueue();
        
        // Notificar a otros componentes
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.events) {
            window.Justice2.events.emit('api:connection-restored', detail);
        }
    },
    
    // Manejar pérdida de conexión
    handleConnectionLost: function(detail) {
        // Activar modo degradado si está configurado
        if (!this.state.degradedMode) {
            this.activateDegradedMode('connection_lost');
        }
        
        // Notificar a otros componentes
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.events) {
            window.Justice2.events.emit('api:connection-lost', detail);
        }
    },
    
    // Manejar activación de circuit breaker
    handleCircuitBreakerTripped: function(detail) {
        // Notificar al usuario sobre el problema
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(
                `Servicio temporalmente no disponible: ${detail.endpoint}`,
                'warning'
            );
        }
        
        // Notificar a otros componentes
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.events) {
            window.Justice2.events.emit('api:circuit-breaker-tripped', detail);
        }
    },
    
    // Manejar evento de error de red
    handleNetworkErrorEvent: function(detail) {
        const { errorInfo, context } = detail;
        
        // Actualizar estado del API basado en el error
        if (errorInfo.severity === 'high') {
            this.state.lastError = errorInfo;
        }
        
        // Notificar a otros componentes si es un error crítico
        if (errorInfo.severity === 'high' && typeof window !== 'undefined' && window.Justice2 && window.Justice2.events) {
            window.Justice2.events.emit('api:critical-error', { errorInfo, context });
        }
    },
    
    // Obtener estadísticas combinadas del API y NetworkErrorHandler
    getCombinedStats: function() {
        const apiStats = {
            totalRequests: this.state.requestQueue.length,
            lastError: this.state.lastError,
            degradedMode: this.state.degradedMode,
            sslBypassEnabled: this.state.sslBypassEnabled
        };
        
        // Agregar estadísticas de NetworkErrorHandler si está disponible
        if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
            const networkStats = window.NetworkErrorHandler.getStats();
            return {
                ...apiStats,
                ...networkStats,
                networkHandlerEnabled: true
            };
        }
        
        return {
            ...apiStats,
            networkHandlerEnabled: false
        };
    },
    
    // Configurar interceptores
    setupInterceptors: function() {
        // Interceptor de solicitud
        this.requestInterceptor = (config) => {
            // Agregar token de autenticación
            const token = Justice2Auth?.getToken();
            if (token) {
                config.headers = {
                    ...config.headers,
                    'Authorization': `Bearer ${token}`
                };
            }
            
            // Agregar token CSRF para métodos sensibles
            if (this.shouldRequireCSRF(config)) {
                const csrfToken = this.getCSRFToken();
                if (csrfToken) {
                    config.headers = {
                        ...config.headers,
                        'X-CSRF-Token': csrfToken
                    };
                } else {
                    console.warn('Token CSRF no disponible para solicitud sensible');
                }
            }
            
            // Agregar headers por defecto
            config.headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Client-Version': Justice2?.config.version || '2.0.0',
                ...config.headers
            };
            
            // Agregar timestamp
            config.timestamp = Date.now();
            
            this.state.lastRequest = config;
            
            return config;
        };
        
        // Interceptor de respuesta
        this.responseInterceptor = (response) => {
            // Actualizar cache si es una solicitud GET exitosa
            if (response.config.method === 'get' && response.status === 200) {
                this.updateCache(response.config.url, response.data);
            }
            
            // Manejar errores CSRF
            if (response.status === 403 && response.data && response.data.code === 'CSRF_TOKEN_INVALID') {
                this.handleCSRFError(response);
            }
            
            return response;
        };
    },
    
    // Configurar manejo de errores
    setupErrorHandling: function() {
        this.errorHandler = (error) => {
            const response = error.response;
            
            if (response) {
                // Error del servidor
                switch (response.status) {
                    case 401:
                        this.handleUnauthorized(response);
                        break;
                    case 403:
                        if (response.data && response.data.code === 'CSRF_TOKEN_INVALID') {
                            this.handleCSRFError(response);
                        } else {
                            this.handleForbidden(response);
                        }
                        break;
                    case 404:
                        this.handleNotFound(response);
                        break;
                    case 429:
                        this.handleRateLimit(response);
                        break;
                    case 500:
                        this.handleServerError(response);
                        break;
                    default:
                        this.handleGenericError(response);
                }
            } else if (error.request) {
                // Error de red
                this.handleNetworkError(error);
            } else {
                // Error de configuración
                this.handleConfigError(error);
            }
            
            return Promise.reject(error);
        };
    },
    
    // Configurar cache
    setupCache: function() {
        // Limpiar cache cada 30 minutos
        setInterval(() => {
            this.clearCache();
        }, 30 * 60 * 1000);
    },
    
    // Inicializar caché avanzada
    initializeAdvancedCache: function() {
        // Esperar a que CacheManager esté disponible
        const initializeCache = () => {
            if (typeof window !== 'undefined' && window.CacheManager) {
                try {
                    // Crear instancia de caché para API
                    this.state.apiCache = new window.CacheManager({
                        name: 'justice2-api-cache',
                        strategy: 'multi-level',
                        ttl: 300000, // 5 minutos por defecto
                        maxSize: 100, // 100 items
                        compression: true,
                        metrics: true,
                        cacheLevels: ['memory', 'localStorage', 'indexedDB']
                    });
                    
                    // Configurar estrategias específicas por tipo de dato
                    this.state.apiCache.configureStrategy('api-response', {
                        ttl: 300000, // 5 minutos
                        strategy: 'multi-level',
                        compression: true,
                        refreshAhead: true,
                        refreshAheadThreshold: 0.8
                    });
                    
                    this.state.apiCache.configureStrategy('user-data', {
                        ttl: 600000, // 10 minutos
                        strategy: 'persistent',
                        compression: true
                    });
                    
                    this.state.apiCache.configureStrategy('analytics', {
                        ttl: 900000, // 15 minutos
                        strategy: 'multi-level',
                        compression: true
                    });
                    
                    this.state.apiCache.configureStrategy('documents', {
                        ttl: 600000, // 10 minutos
                        strategy: 'multi-level',
                        compression: true
                    });
                    
                    this.state.apiCache.configureStrategy('ai-chat', {
                        ttl: 300000, // 5 minutos
                        strategy: 'lru',
                        maxSize: 50,
                        compression: true
                    });
                    
                    // Precargar datos críticos
                    this.preloadCriticalData();
                    
                    this.log('Sistema de caché avanzada inicializado');
                } catch (error) {
                    console.error('Error inicializando caché avanzada:', error);
                }
            } else {
                // Reintentar en 100ms
                setTimeout(initializeCache, 100);
            }
        };
        
        initializeCache();
    },
    
    // Precargar datos críticos
    preloadCriticalData: async function() {
        if (!this.state.apiCache) return;
        
        try {
            // Precargar configuración del usuario
            const userConfigPromise = this.get('/user/config', {
                cache: true,
                cacheStrategy: 'user-data',
                priority: 1
            }).catch(() => null);
            
            // Precargar estadísticas básicas
            const statsPromise = this.get('/analytics/summary', {
                cache: true,
                cacheStrategy: 'analytics',
                priority: 2
            }).catch(() => null);
            
            // Esperar a que se completen las precargas
            await Promise.allSettled([userConfigPromise, statsPromise]);
            
            this.log('Precarga de datos críticos completada');
        } catch (error) {
            this.log('Error en precarga de datos críticos:', error);
        }
    },
    
    // Obtener caché para una estrategia específica
    getCacheForStrategy: function(strategy) {
        if (!this.state.apiCache) return null;
        
        try {
            return this.state.apiCache.getCache(strategy);
        } catch (error) {
            this.log('Error obteniendo caché para estrategia:', strategy, error);
            return null;
        }
    },
    
    // Invalidar caché por patrón
    invalidateCacheByPattern: function(pattern) {
        if (!this.state.apiCache) return;
        
        try {
            this.state.apiCache.invalidateByPattern(pattern);
            this.log(`Caché invalidada por patrón: ${pattern}`);
        } catch (error) {
            this.log('Error invalidando caché por patrón:', pattern, error);
        }
    },
    
    // Obtener métricas de caché
    getCacheMetrics: function() {
        if (!this.state.apiCache) return null;
        
        try {
            return this.state.apiCache.getMetrics();
        } catch (error) {
            this.log('Error obteniendo métricas de caché:', error);
            return null;
        }
    },
    
    // Configurar eventos de conexión
    setupConnectionEvents: function() {
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            this.processQueue();
            Justice2?.utils?.showNotification('Conexión restaurada', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            Justice2?.utils?.showNotification('Sin conexión a internet', 'error');
        });
    },
    
    // Configurar protección CSRF
    setupCSRFProtection: function() {
        if (!this.state.csrf.enabled) {
            this.log('Protección CSRF desactivada');
            return;
        }
        
        // Esperar a que el sistema CSRF esté disponible
        const initializeCSRF = () => {
            if (typeof window !== 'undefined' && window.CSRFProtection) {
                try {
                    // Inicializar sistema CSRF
                    window.CSRFProtection.init();
                    this.state.csrf.initialized = true;
                    this.log('Sistema CSRF inicializado');
                    
                    // Obtener token inicial
                    this.refreshCSRFToken();
                } catch (error) {
                    console.error('Error inicializando CSRF:', error);
                }
            } else {
                // Reintentar en 100ms
                setTimeout(initializeCSRF, 100);
            }
        };
        
        initializeCSRF();
    },
    
    // Obtener token CSRF del servidor
    refreshCSRFToken: async function() {
        try {
            const response = await this.get('/csrf/token', { cache: false });
            
            if (response.data && response.data.token) {
                this.state.csrf.token = response.data.token;
                this.state.csrf.tokenExpiry = new Date(response.data.expiresAt);
                
                // Almacenar en sistema CSRF si está disponible
                if (window.CSRFProtection) {
                    window.CSRFProtection.setToken(response.data.token);
                }
                
                this.log('Token CSRF actualizado');
            }
        } catch (error) {
            console.error('Error obteniendo token CSRF:', error);
        }
    },
    
    // Verificar si el token CSRF está expirado
    isCSRFTokenExpired: function() {
        if (!this.state.csrf.tokenExpiry) {
            return true;
        }
        
        return Date.now() >= this.state.csrf.tokenExpiry.getTime();
    },
    
    // Obtener token CSRF actual
    getCSRFToken: function() {
        // Si el token está expirado, intentar refresh
        if (this.isCSRFTokenExpired()) {
            this.refreshCSRFToken();
        }
        
        // Intentar obtener del sistema CSRF primero
        if (window.CSRFProtection) {
            const token = window.CSRFProtection.getToken();
            if (token) {
                return token;
            }
        }
        
        // Fallback al estado local
        return this.state.csrf.token;
    },
    
    // Realizar solicitud HTTP con manejo robusto de promesas, NetworkErrorHandler y sincronización
    request: async function(config) {
        const requestId = `api-request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Determinar recurso para sincronización basado en URL y método
        const resource = this.determineSyncResource(config);
        
        // Ejecutar con sincronización si está habilitada
        if (this.state.syncInitialized && this.config.syncEnabled) {
            return await this.executeWithSync(requestId, async () => {
                // Verificar si NetworkErrorHandler está disponible
                if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
                    return await this.requestWithNetworkErrorHandler(config);
                } else {
                    // Fallback al sistema original sin NetworkErrorHandler
                    return await this.requestOriginal(config);
                }
            }, {
                resource,
                priority: this.getPriorityForEndpoint(config.url),
                timeout: config.timeout || this.config.timeout
            });
        } else {
            // Fallback sin sincronización
            if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
                return await this.requestWithNetworkErrorHandler(config);
            } else {
                return await this.requestOriginal(config);
            }
        }
    },
    
    // Determinar recurso de sincronización basado en configuración
    determineSyncResource: function(config) {
        const url = config.url || '';
        const method = (config.method || 'GET').toUpperCase();
        
        // Para operaciones que modifican datos, usar el recurso base
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            // Extraer recurso base de la URL
            const resourceMatch = url.match(/^\/([^\/]+)/);
            if (resourceMatch) {
                const resource = resourceMatch[1];
                
                // Para recursos específicos con ID, incluir el ID
                const idMatch = url.match(/\/([^\/]+)\/([^\/]+)/);
                if (idMatch) {
                    return `${resource}:${idMatch[2]}`;
                }
                
                return resource;
            }
        }
        
        // Para operaciones GET, no bloquear por defecto
        return null;
    },
    
    // Obtener prioridad para endpoint específico
    getPriorityForEndpoint: function(url) {
        if (!url) return 5;
        
        // Endpoints críticos tienen prioridad alta
        if (url.includes('/auth/')) return 1;
        if (url.includes('/upload')) return 1;
        if (url.includes('/ai/')) return 2;
        if (url.includes('/cases/') && url.includes('/:id')) return 2;
        if (url.includes('/documents/') && url.includes('/:id')) return 2;
        
        // Endpoints de datos tienen prioridad media
        if (url.includes('/cases')) return 3;
        if (url.includes('/documents')) return 3;
        if (url.includes('/analytics')) return 4;
        
        // Default
        return 5;
    },
    
    // Solicitud con NetworkErrorHandler integrado
    requestWithNetworkErrorHandler: async function(config) {
        const requestId = NetworkErrorHandler.generateRequestId();
        const endpoint = new URL(config.url, window.location.origin).pathname;
        
        // Crear contexto para el manejador de errores
        const context = {
            url: config.url,
            method: config.method || 'GET',
            endpoint,
            requestId,
            retryCount: 0,
            config
        };
        
        // Verificar circuit breaker antes de hacer la solicitud
        if (NetworkErrorHandler.isCircuitBreakerOpen(endpoint)) {
            const error = new Error('Circuit breaker abierto - servicio temporalmente no disponible');
            error.circuitBreakerOpen = true;
            error.endpoint = endpoint;
            throw error;
        }
        
        // Verificar conexión
        if (!NetworkErrorHandler.state.isOnline) {
            const error = new Error('Sin conexión a internet');
            error.offline = true;
            throw error;
        }
        
        // Función de solicitud principal con manejo de errores de red
        const requestFunction = async () => {
            // Verificar rate limiting mejorado
            const rateLimitCheck = this.checkRateLimitEnhanced(config);
            if (!rateLimitCheck.allowed) {
                const error = new Error(rateLimitCheck.reason || 'Límite de solicitudes excedido');
                error.rateLimitInfo = rateLimitCheck;
                error.rateLimit = true;
                throw error;
            }
            
            // Aplicar interceptor de solicitud
            config = this.requestInterceptor(config);
            
            // Verificar cache para solicitudes GET (usando CacheManager si está disponible)
            if (config.method === 'get' && config.cache !== false) {
                if (this.state.apiCache) {
                    const cacheKey = `api:${config.url}:${JSON.stringify(config.params || {})}`;
                    const strategy = config.cacheStrategy || 'api-response';
                    
                    try {
                        const cached = await this.state.apiCache.get(cacheKey, strategy);
                        if (cached !== null) {
                            this.log(`Cache hit para: ${cacheKey} (estrategia: ${strategy})`);
                            return { data: cached, cached: true, fromCache: true };
                        }
                    } catch (error) {
                        this.log('Error obteniendo datos de caché:', error);
                    }
                } else if (typeof window !== 'undefined' && window.PromiseCache) {
                    // Fallback a PromiseCache
                    const cacheKey = `api:${config.url}:${JSON.stringify(config.params || {})}`;
                    const cached = window.PromiseCache.get(cacheKey);
                    if (cached) {
                        return { data: cached, cached: true };
                    }
                } else {
                    // Fallback al cache local
                    const cached = this.getFromCache(config.url);
                    if (cached) {
                        return { data: cached, cached: true };
                    }
                }
            }
            
            // Realizar solicitud con manejo mejorado de errores
            const response = await this.makeRequestWithNetworkHandling(config, context);
            
            // Aplicar interceptor de respuesta
            const processedResponse = this.responseInterceptor(response);
            
            // Almacenar en cache si es exitoso (usando CacheManager si está disponible)
            if (config.method === 'get' && response.status === 200) {
                const cacheKey = `api:${config.url}:${JSON.stringify(config.params || {})}`;
                const strategy = config.cacheStrategy || 'api-response';
                const ttl = config.cacheTTL || 300000; // 5 minutos por defecto
                
                if (this.state.apiCache) {
                    try {
                        await this.state.apiCache.set(cacheKey, response.data, {
                            strategy,
                            ttl,
                            tags: ['api', strategy],
                            priority: config.priority || 5
                        });
                        this.log(`Datos almacenados en caché: ${cacheKey} (estrategia: ${strategy})`);
                    } catch (error) {
                        this.log('Error almacenando en caché:', error);
                    }
                } else if (typeof window !== 'undefined' && window.PromiseCache) {
                    // Fallback a PromiseCache
                    window.PromiseCache.set(cacheKey, response.data, { ttl, tags: ['api'] });
                }
            }
            
            return processedResponse;
        };

        try {
            // Usar PromiseManager si está disponible con integración de NetworkErrorHandler
            if (typeof window !== 'undefined' && window.PromiseManager) {
                // Configurar opciones para PromiseManager
                const promiseOptions = {
                    timeout: config.timeout || this.config.timeout,
                    maxRetries: config.retryAttempts || this.config.retryAttempts,
                    retryDelay: config.retryDelay || this.config.retryDelay,
                    priority: config.priority || 5,
                    metadata: {
                        type: 'api_request',
                        url: config.url,
                        method: config.method || 'GET',
                        requestId
                    }
                };

                // Usar cola de promesas si está disponible y la solicitud lo requiere
                if (typeof window !== 'undefined' && window.PromiseQueue && (config.useQueue !== false)) {
                    const task = window.PromiseQueue.enqueue(requestFunction, {
                        priority: config.priority || 5,
                        timeout: promiseOptions.timeout,
                        metadata: promiseOptions.metadata,
                        onSuccess: (result) => {
                            this.log(`Solicitud API completada: ${config.method || 'GET'} ${config.url}`);
                            // Actualizar circuit breaker con éxito
                            NetworkErrorHandler.updateCircuitBreaker({
                                type: 'SUCCESS',
                                severity: 'low'
                            }, context);
                        },
                        onFailure: (error) => {
                            this.log(`Error en solicitud API: ${config.method || 'GET'} ${config.url}`, error);
                        }
                    });
                    
                    return await task.promise;
                }

                // Usar RetryWrapper con NetworkErrorHandler si está disponible
                if (typeof window !== 'undefined' && window.RetryWrapper) {
                    return await window.RetryWrapper.networkRetry(requestFunction, {
                        maxRetries: promiseOptions.maxRetries,
                        baseDelay: promiseOptions.retryDelay,
                        onRetry: (error, attempt, retryId, delay) => {
                            context.retryCount = attempt;
                            this.log(`Reintentando solicitud API (intento ${attempt}): ${config.method || 'GET'} ${config.url} en ${delay}ms`);
                            
                            // Notificar a NetworkErrorHandler sobre el reintento
                            const errorInfo = NetworkErrorHandler.handleNetworkError(error, context);
                            if (errorInfo.shouldRetry) {
                                this.log(`NetworkErrorHandler autoriza reintento: ${errorInfo.retryDelay}ms`);
                            }
                        },
                        onSuccess: (result, attempt, retryId) => {
                            this.log(`Solicitud API exitosa después de ${attempt} intentos: ${config.method || 'GET'} ${config.url}`);
                            
                            // Actualizar circuit breaker con éxito
                            NetworkErrorHandler.updateCircuitBreaker({
                                type: 'SUCCESS',
                                severity: 'low'
                            }, context);
                        },
                        onFailure: (error, attempt, retryId) => {
                            this.log(`Solicitud API falló definitivamente después de ${attempt} intentos: ${config.method || 'GET'} ${config.url}`, error);
                            
                            // Notificar error final a NetworkErrorHandler
                            NetworkErrorHandler.handleNetworkError(error, { ...context, finalFailure: true });
                        }
                    });
                }

                // Usar timeout de PromiseManager
                return await window.PromiseManager.withTimeout(requestFunction(), promiseOptions.timeout);
            }

            // Fallback al sistema original con NetworkErrorHandler
            return await requestFunction();
            
        } catch (error) {
            // Manejar error con NetworkErrorHandler
            const errorInfo = NetworkErrorHandler.handleNetworkError(error, context);
            
            // Manejar error con AsyncErrorHandler si está disponible
            if (typeof window !== 'undefined' && window.AsyncErrorHandler) {
                const asyncErrorInfo = window.AsyncErrorHandler.classifyError(error);
                window.AsyncErrorHandler.logError(asyncErrorInfo);
                
                // Intentar recuperación automática
                const recovery = window.AsyncErrorHandler.attemptRecovery(asyncErrorInfo);
                if (recovery.handled) {
                    return recovery.result;
                }
            }
            
            // Reintentar si NetworkErrorHandler lo recomienda
            if (errorInfo.shouldRetry) {
                return this.retryRequestWithNetworkHandler(config, context, errorInfo.retryDelay);
            }
            
            throw error;
        }
    },
    
    // Solicitud original (fallback sin NetworkErrorHandler)
    requestOriginal: async function(config) {
        // Crear función de solicitud para el sistema de promesas
        const requestFunction = async () => {
            // Verificar conexión
            if (!this.state.isOnline) {
                throw new Error('Sin conexión a internet');
            }
            
            // Verificar rate limiting mejorado
            const rateLimitCheck = this.checkRateLimitEnhanced(config);
            if (!rateLimitCheck.allowed) {
                const error = new Error(rateLimitCheck.reason || 'Límite de solicitudes excedido');
                error.rateLimitInfo = rateLimitCheck;
                throw error;
            }
            
            // Aplicar interceptor de solicitud
            config = this.requestInterceptor(config);
            
            // Verificar cache para solicitudes GET (usando CacheManager si está disponible)
            if (config.method === 'get' && config.cache !== false) {
                if (this.state.apiCache) {
                    const cacheKey = `api:${config.url}:${JSON.stringify(config.params || {})}`;
                    const strategy = config.cacheStrategy || 'api-response';
                    
                    try {
                        const cached = await this.state.apiCache.get(cacheKey, strategy);
                        if (cached !== null) {
                            this.log(`Cache hit para: ${cacheKey} (estrategia: ${strategy})`);
                            return { data: cached, cached: true, fromCache: true };
                        }
                    } catch (error) {
                        this.log('Error obteniendo datos de caché:', error);
                    }
                } else if (typeof window !== 'undefined' && window.PromiseCache) {
                    // Fallback a PromiseCache
                    const cacheKey = `api:${config.url}:${JSON.stringify(config.params || {})}`;
                    const cached = window.PromiseCache.get(cacheKey);
                    if (cached) {
                        return { data: cached, cached: true };
                    }
                } else {
                    // Fallback al cache local
                    const cached = this.getFromCache(config.url);
                    if (cached) {
                        return { data: cached, cached: true };
                    }
                }
            }
            
            // Realizar solicitud
            const response = await this.makeRequest(config);
            
            // Aplicar interceptor de respuesta
            const processedResponse = this.responseInterceptor(response);
            
            // Almacenar en cache si es exitoso (usando CacheManager si está disponible)
            if (config.method === 'get' && response.status === 200) {
                const cacheKey = `api:${config.url}:${JSON.stringify(config.params || {})}`;
                const strategy = config.cacheStrategy || 'api-response';
                const ttl = config.cacheTTL || 300000; // 5 minutos por defecto
                
                if (this.state.apiCache) {
                    try {
                        await this.state.apiCache.set(cacheKey, response.data, {
                            strategy,
                            ttl,
                            tags: ['api', strategy],
                            priority: config.priority || 5
                        });
                        this.log(`Datos almacenados en caché: ${cacheKey} (estrategia: ${strategy})`);
                    } catch (error) {
                        this.log('Error almacenando en caché:', error);
                    }
                } else if (typeof window !== 'undefined' && window.PromiseCache) {
                    // Fallback a PromiseCache
                    window.PromiseCache.set(cacheKey, response.data, { ttl, tags: ['api'] });
                }
            }
            
            return processedResponse;
        };

        try {
            // Usar PromiseManager si está disponible
            if (typeof window !== 'undefined' && window.PromiseManager) {
                // Configurar opciones para PromiseManager
                const promiseOptions = {
                    timeout: config.timeout || this.config.timeout,
                    maxRetries: config.retryAttempts || this.config.retryAttempts,
                    retryDelay: config.retryDelay || this.config.retryDelay,
                    priority: config.priority || 5,
                    metadata: {
                        type: 'api_request',
                        url: config.url,
                        method: config.method || 'GET'
                    }
                };

                // Usar cola de promesas si está disponible y la solicitud lo requiere
                if (typeof window !== 'undefined' && window.PromiseQueue && (config.useQueue !== false)) {
                    const task = window.PromiseQueue.enqueue(requestFunction, {
                        priority: config.priority || 5,
                        timeout: promiseOptions.timeout,
                        metadata: promiseOptions.metadata,
                        onSuccess: (result) => {
                            this.log(`Solicitud API completada: ${config.method || 'GET'} ${config.url}`);
                        },
                        onFailure: (error) => {
                            this.log(`Error en solicitud API: ${config.method || 'GET'} ${config.url}`, error);
                        }
                    });
                    
                    return await task.promise;
                }

                // Usar RetryWrapper si está disponible
                if (typeof window !== 'undefined' && window.RetryWrapper) {
                    return await window.RetryWrapper.networkRetry(requestFunction, {
                        maxRetries: promiseOptions.maxRetries,
                        baseDelay: promiseOptions.retryDelay,
                        onRetry: (error, attempt, retryId, delay) => {
                            this.log(`Reintentando solicitud API (intento ${attempt}): ${config.method || 'GET'} ${config.url} en ${delay}ms`);
                        },
                        onSuccess: (result, attempt, retryId) => {
                            this.log(`Solicitud API exitosa después de ${attempt} intentos: ${config.method || 'GET'} ${config.url}`);
                        },
                        onFailure: (error, attempt, retryId) => {
                            this.log(`Solicitud API falló definitivamente después de ${attempt} intentos: ${config.method || 'GET'} ${config.url}`, error);
                        }
                    });
                }

                // Usar timeout de PromiseManager
                return await window.PromiseManager.withTimeout(requestFunction(), promiseOptions.timeout);
            }

            // Fallback al sistema original
            return await requestFunction();
            
        } catch (error) {
            // Manejar error con AsyncErrorHandler si está disponible
            if (typeof window !== 'undefined' && window.AsyncErrorHandler) {
                const errorInfo = window.AsyncErrorHandler.classifyError(error);
                window.AsyncErrorHandler.logError(errorInfo);
                
                // Intentar recuperación automática
                const recovery = window.AsyncErrorHandler.attemptRecovery(errorInfo);
                if (recovery.handled) {
                    return recovery.result;
                }
            }
            
            // Manejo de error original
            this.errorHandler(error);
            
            // Reintentar si es apropiado (usando sistema original como fallback)
            if (this.shouldRetry(config, error)) {
                return this.retryRequest(config);
            }
            
            throw error;
        }
    },
    
    // Realizar solicitud HTTP real con manejo robusto de errores y NetworkErrorHandler
    makeRequest: function(config) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const url = this.config.baseUrl + config.url;
            const startTime = Date.now();
            
            // Configurar XMLHttpRequest con manejo mejorado de errores
            try {
                xhr.open(config.method || 'GET', url, true);
            } catch (error) {
                // Capturar errores de configuración (URL inválida, etc.)
                reject({
                    response: {
                        status: 0,
                        statusText: 'Invalid Configuration',
                        error: error.message
                    },
                    config
                });
                return;
            }
            
            // Configurar headers
            try {
                Object.keys(config.headers || {}).forEach(key => {
                    xhr.setRequestHeader(key, config.headers[key]);
                });
            } catch (error) {
                reject({
                    response: {
                        status: 0,
                        statusText: 'Header Configuration Error',
                        error: error.message
                    },
                    config
                });
                return;
            }
            
            // Configurar timeout con validación
            const timeout = config.timeout || this.config.timeout;
            if (timeout > 0) {
                xhr.timeout = timeout;
            }
            
            // Manejar respuesta con procesamiento robusto
            xhr.onload = () => {
                try {
                    const response = {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        headers: this.parseHeaders(xhr.getAllResponseHeaders()),
                        config: config,
                        data: null,
                        duration: Date.now() - startTime
                    };
                    
                    // Procesar respuesta con manejo de errores
                    try {
                        const responseText = xhr.responseText;
                        if (typeof responseText === 'string' && responseText.trim()) {
                            response.data = JSON.parse(responseText);
                            
                            // Sanitizar datos de respuesta si contienen strings
                            response.data = this.sanitizeResponseData(response.data);
                        } else {
                            response.data = responseText;
                        }
                    } catch (e) {
                        // Si hay error parseando JSON, manejar apropiadamente
                        if (typeof XSSProtection !== 'undefined' && XSSProtection.sanitizeText) {
                            response.data = XSSProtection.sanitizeText(xhr.responseText);
                        } else {
                            response.data = xhr.responseText;
                        }
                        
                        // No rechazar la promesa por error de parseo, solo registrar
                        console.warn('Error parseando respuesta JSON:', e);
                    }
                    
                    // Validar respuesta de API
                    if (!this.validateApiResponse(response)) {
                        console.warn('Respuesta de API no válida:', response);
                    }
                    
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(response);
                    } else {
                        reject({ response, config });
                    }
                } catch (error) {
                    reject({
                        response: {
                            status: 0,
                            statusText: 'Response Processing Error',
                            error: error.message
                        },
                        config
                    });
                }
            };
            
            // Manejar errores de red con mejor clasificación
            xhr.onerror = () => {
                const error = new Error('Network Error');
                error.name = 'NetworkError';
                error.url = url;
                error.method = config.method || 'GET';
                error.timestamp = Date.now();
                
                reject({
                    response: {
                        status: 0,
                        statusText: 'Network Error',
                        error: error
                    },
                    config
                });
            };
            
            // Manejar timeout con error específico
            xhr.ontimeout = () => {
                const error = new Error(`Request Timeout after ${timeout}ms`);
                error.name = 'TimeoutError';
                error.url = url;
                error.method = config.method || 'GET';
                error.timeout = timeout;
                error.timestamp = Date.now();
                
                reject({
                    response: {
                        status: 408,
                        statusText: 'Request Timeout',
                        error: error
                    },
                    config
                });
            };
            
            // Manejar progreso de uploads si está disponible
            if (config.onProgress && xhr.upload) {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        config.onProgress({
                            loaded: event.loaded,
                            total: event.total,
                            percentage: (event.loaded / event.total) * 100
                        });
                    }
                };
            }
            
            // Enviar solicitud con manejo de errores
            try {
                if (config.data) {
                    // Sanitizar datos de solicitud antes de enviar
                    const sanitizedData = this.sanitizeRequestData(config.data);
                    
                    // Validar que los datos sean serializables
                    try {
                        JSON.stringify(sanitizedData);
                        xhr.send(JSON.stringify(sanitizedData));
                    } catch (error) {
                        console.error('Error: Los datos de solicitud no son serializables:', error);
                        reject({
                            response: {
                                status: 400,
                                statusText: 'Invalid Request Data',
                                error: error.message
                            },
                            config
                        });
                    }
                } else {
                    xhr.send();
                }
            } catch (error) {
                reject({
                    response: {
                        status: 0,
                        statusText: 'Request Send Error',
                        error: error.message
                    },
                    config
                });
            }
        });
    },
    
    // Realizar solicitud HTTP con manejo de NetworkErrorHandler
    makeRequestWithNetworkHandling: function(config, context) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const url = this.config.baseUrl + config.url;
            const startTime = Date.now();
            
            // Configurar XMLHttpRequest con manejo mejorado de errores
            try {
                xhr.open(config.method || 'GET', url, true);
            } catch (error) {
                // Capturar errores de configuración (URL inválida, etc.) y notificar a NetworkErrorHandler
                const networkError = new Error(error.message);
                networkError.name = 'ConfigurationError';
                NetworkErrorHandler.handleNetworkError(networkError, { ...context, phase: 'open' });
                
                reject({
                    response: {
                        status: 0,
                        statusText: 'Invalid Configuration',
                        error: error.message
                    },
                    config
                });
                return;
            }
            
            // Configurar headers
            try {
                Object.keys(config.headers || {}).forEach(key => {
                    xhr.setRequestHeader(key, config.headers[key]);
                });
            } catch (error) {
                // Notificar error de configuración de headers a NetworkErrorHandler
                const networkError = new Error(error.message);
                networkError.name = 'HeaderConfigurationError';
                NetworkErrorHandler.handleNetworkError(networkError, { ...context, phase: 'headers' });
                
                reject({
                    response: {
                        status: 0,
                        statusText: 'Header Configuration Error',
                        error: error.message
                    },
                    config
                });
                return;
            }
            
            // Configurar timeout con validación y notificación a NetworkErrorHandler
            const timeout = config.timeout || this.config.timeout;
            if (timeout > 0) {
                xhr.timeout = timeout;
            }
            
            // Manejar respuesta con procesamiento robusto
            xhr.onload = () => {
                try {
                    const response = {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        headers: this.parseHeaders(xhr.getAllResponseHeaders()),
                        config: config,
                        data: null,
                        duration: Date.now() - startTime
                    };
                    
                    // Procesar respuesta con manejo de errores
                    try {
                        const responseText = xhr.responseText;
                        if (typeof responseText === 'string' && responseText.trim()) {
                            response.data = JSON.parse(responseText);
                            
                            // Sanitizar datos de respuesta si contienen strings
                            response.data = this.sanitizeResponseData(response.data);
                        } else {
                            response.data = responseText;
                        }
                    } catch (e) {
                        // Si hay error parseando JSON, manejar apropiadamente
                        if (typeof XSSProtection !== 'undefined' && XSSProtection.sanitizeText) {
                            response.data = XSSProtection.sanitizeText(xhr.responseText);
                        } else {
                            response.data = xhr.responseText;
                        }
                        
                        // No rechazar la promesa por error de parseo, solo registrar
                        console.warn('Error parseando respuesta JSON:', e);
                    }
                    
                    // Validar respuesta de API
                    if (!this.validateApiResponse(response)) {
                        console.warn('Respuesta de API no válida:', response);
                    }
                    
                    if (xhr.status >= 200 && xhr.status < 300) {
                        // Actualizar circuit breaker con éxito
                        NetworkErrorHandler.updateCircuitBreaker({
                            type: 'SUCCESS',
                            severity: 'low'
                        }, context);
                        
                        resolve(response);
                    } else {
                        // Notificar error de servidor a NetworkErrorHandler
                        const serverError = new Error(`Server Error: ${xhr.status} ${xhr.statusText}`);
                        serverError.name = 'ServerError';
                        serverError.status = xhr.status;
                        serverError.statusText = xhr.statusText;
                        
                        NetworkErrorHandler.handleNetworkError(serverError, { ...context, phase: 'response', status: xhr.status });
                        
                        reject({ response, config });
                    }
                } catch (error) {
                    // Notificar error de procesamiento a NetworkErrorHandler
                    const processingError = new Error(error.message);
                    processingError.name = 'ResponseProcessingError';
                    NetworkErrorHandler.handleNetworkError(processingError, { ...context, phase: 'processing' });
                    
                    reject({
                        response: {
                            status: 0,
                            statusText: 'Response Processing Error',
                            error: error.message
                        },
                        config
                    });
                }
            };
            
            // Manejar errores de red con mejor clasificación y notificación a NetworkErrorHandler
            xhr.onerror = () => {
                const error = new Error('Network Error');
                error.name = 'NetworkError';
                error.url = url;
                error.method = config.method || 'GET';
                error.timestamp = Date.now();
                
                // Notificar a NetworkErrorHandler
                NetworkErrorHandler.handleNetworkError(error, { ...context, phase: 'network_error' });
                
                reject({
                    response: {
                        status: 0,
                        statusText: 'Network Error',
                        error: error
                    },
                    config
                });
            };
            
            // Manejar timeout con error específico y notificación a NetworkErrorHandler
            xhr.ontimeout = () => {
                const error = new Error(`Request Timeout after ${timeout}ms`);
                error.name = 'TimeoutError';
                error.url = url;
                error.method = config.method || 'GET';
                error.timeout = timeout;
                error.timestamp = Date.now();
                
                // Notificar a NetworkErrorHandler
                NetworkErrorHandler.handleNetworkError(error, { ...context, phase: 'timeout', timeout });
                
                reject({
                    response: {
                        status: 408,
                        statusText: 'Request Timeout',
                        error: error
                    },
                    config
                });
            };
            
            // Manejar progreso de uploads si está disponible
            if (config.onProgress && xhr.upload) {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        config.onProgress({
                            loaded: event.loaded,
                            total: event.total,
                            percentage: (event.loaded / event.total) * 100
                        });
                    }
                };
            }
            
            // Enviar solicitud con manejo de errores y notificación a NetworkErrorHandler
            try {
                if (config.data) {
                    // Sanitizar datos de solicitud antes de enviar
                    const sanitizedData = this.sanitizeRequestData(config.data);
                    
                    // Validar que los datos sean serializables
                    try {
                        JSON.stringify(sanitizedData);
                        xhr.send(JSON.stringify(sanitizedData));
                    } catch (error) {
                        console.error('Error: Los datos de solicitud no son serializables:', error);
                        
                        // Notificar error a NetworkErrorHandler
                        const serializationError = new Error(error.message);
                        serializationError.name = 'SerializationError';
                        NetworkErrorHandler.handleNetworkError(serializationError, { ...context, phase: 'serialization' });
                        
                        reject({
                            response: {
                                status: 400,
                                statusText: 'Invalid Request Data',
                                error: error.message
                            },
                            config
                        });
                    }
                } else {
                    xhr.send();
                }
            } catch (error) {
                // Notificar error de envío a NetworkErrorHandler
                const sendError = new Error(error.message);
                sendError.name = 'RequestSendError';
                NetworkErrorHandler.handleNetworkError(sendError, { ...context, phase: 'send' });
                
                reject({
                    response: {
                        status: 0,
                        statusText: 'Request Send Error',
                        error: error.message
                    },
                    config
                });
            }
        });
    },
    
    // Reintentar solicitud con NetworkErrorHandler
    retryRequestWithNetworkHandler: async function(config, context, delay) {
        // Esperar el delay calculado por NetworkErrorHandler
        if (delay && delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Incrementar contador de reintentos
        context.retryCount = (context.retryCount || 0) + 1;
        
        // Log del reintento
        this.log(`Reintentando solicitud ${context.method} ${context.url} (intento ${context.retryCount})`);
        
        try {
            // Realizar la solicitud nuevamente
            return await this.requestWithNetworkErrorHandler(config);
        } catch (error) {
            // Si sigue fallando, NetworkErrorHandler decidirá si se debe reintentar nuevamente
            const errorInfo = NetworkErrorHandler.handleNetworkError(error, { ...context, retryPhase: true });
            
            if (errorInfo.shouldRetry && context.retryCount < this.config.retryAttempts) {
                return this.retryRequestWithNetworkHandler(config, context, errorInfo.retryDelay);
            }
            
            throw error;
        }
    },
    
    // Métodos HTTP convenientes con manejo robusto de promesas y sincronización
    get: function(url, config = {}) {
        return this.request({
            ...config,
            method: 'GET',
            url,
            priority: config.priority || 3, // Prioridad media para GET
            useQueue: config.useQueue !== false, // Usar cola por defecto para GET
            syncResource: config.syncResource || this.determineSyncResource({ ...config, method: 'GET', url })
        });
    },
    
    post: function(url, data, config = {}) {
        return this.request({
            ...config,
            method: 'POST',
            url,
            data,
            priority: config.priority || 2, // Prioridad alta para POST
            useQueue: config.useQueue !== false, // Usar cola por defecto para POST
            syncResource: config.syncResource || this.determineSyncResource({ ...config, method: 'POST', url })
        });
    },
    
    put: function(url, data, config = {}) {
        return this.request({
            ...config,
            method: 'PUT',
            url,
            data,
            priority: config.priority || 2, // Prioridad alta para PUT
            useQueue: config.useQueue !== false, // Usar cola por defecto para PUT
            syncResource: config.syncResource || this.determineSyncResource({ ...config, method: 'PUT', url })
        });
    },
    
    patch: function(url, data, config = {}) {
        return this.request({
            ...config,
            method: 'PATCH',
            url,
            data,
            priority: config.priority || 2, // Prioridad alta para PATCH
            useQueue: config.useQueue !== false, // Usar cola por defecto para PATCH
            syncResource: config.syncResource || this.determineSyncResource({ ...config, method: 'PATCH', url })
        });
    },
    
    delete: function(url, config = {}) {
        return this.request({
            ...config,
            method: 'DELETE',
            url,
            priority: config.priority || 1, // Prioridad máxima para DELETE
            useQueue: config.useQueue !== false, // Usar cola por defecto para DELETE
            syncResource: config.syncResource || this.determineSyncResource({ ...config, method: 'DELETE', url })
        });
    },
    
    // Métodos específicos para la API
    // Casos
    getCases: function(params = {}) {
        return this.get(this.config.endpoints.cases.list, { params });
    },
    
    createCase: function(caseData) {
        return this.post(this.config.endpoints.cases.create, caseData);
    },
    
    updateCase: function(id, caseData) {
        return this.put(this.config.endpoints.cases.update.replace(':id', id), caseData);
    },
    
    deleteCase: function(id) {
        return this.delete(this.config.endpoints.cases.delete.replace(':id', id));
    },
    
    getCase: function(id) {
        return this.get(this.config.endpoints.cases.get.replace(':id', id));
    },
    
    searchCases: function(query) {
        return this.get(this.config.endpoints.cases.search, { params: { q: query } });
    },
    
    // Documentos
    getDocuments: function(params = {}) {
        return this.get(this.config.endpoints.documents.list, { params });
    },
    
    uploadDocument: function(file, metadata = {}, onProgress = null) {
        const uploadFunction = async () => {
            const formData = new FormData();
            formData.append('file', file);
            Object.keys(metadata).forEach(key => {
                formData.append(key, metadata[key]);
            });
            
            return this.request({
                method: 'POST',
                url: this.config.endpoints.documents.upload,
                data: formData,
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 60000, // 1 minuto para uploads
                onProgress: onProgress,
                priority: 1, // Prioridad máxima para uploads
                useQueue: true // Siempre usar cola para uploads
            });
        };

        // Usar PromiseManager si está disponible para uploads críticos
        if (typeof window !== 'undefined' && window.PromiseManager) {
            return window.PromiseManager.withRetry(uploadFunction, {
                maxRetries: 5, // Más reintentos para uploads
                retryDelay: 2000,
                timeout: 120000 // 2 minutos total con reintentos
            });
        }

        return uploadFunction();
    },
    
    downloadDocument: function(id) {
        return this.get(this.config.endpoints.documents.download.replace(':id', id), {
            responseType: 'blob'
        });
    },
    
    deleteDocument: function(id) {
        return this.delete(this.config.endpoints.documents.delete.replace(':id', id));
    },
    
    analyzeDocument: function(id) {
        return this.post(this.config.endpoints.documents.analyze.replace(':id', id));
    },
    
    searchDocuments: function(query) {
        return this.get(this.config.endpoints.documents.search, { params: { q: query } });
    },
    
    // Asistente IA con manejo robusto de promesas
    chatWithAI: function(message, context = {}) {
        const chatFunction = () => this.post(this.config.endpoints.ai.chat, {
            message,
            context,
            timestamp: Date.now()
        });

        // Usar CacheManager para cachear respuestas de chat similares
        if (this.state.apiCache) {
            const cacheKey = `ai:chat:${JSON.stringify({ message: message.substring(0, 100), context })}`;
            return this.state.apiCache.getOrSet(cacheKey, chatFunction, {
                strategy: 'ai-chat',
                ttl: 300000, // 5 minutos para caché de chat
                tags: ['ai', 'chat'],
                compression: true
            });
        } else if (typeof window !== 'undefined' && window.PromiseCache) {
            // Fallback a PromiseCache
            const cacheKey = `ai:chat:${JSON.stringify({ message: message.substring(0, 100), context })}`;
            return window.PromiseCache.getOrSet(cacheKey, chatFunction, {
                ttl: 300000, // 5 minutos para caché de chat
                tags: ['ai', 'chat']
            });
        }

        return chatFunction();
    },
    
    analyzeWithAI: function(content, type = 'text') {
        return this.post(this.config.endpoints.ai.analyze, {
            content,
            type,
            timestamp: Date.now()
        }, {
            priority: 3, // Prioridad media para análisis
            timeout: 60000 // 1 minuto para análisis
        });
    },
    
    getSuggestions: function(query, category = 'general') {
        // Usar CacheManager para sugerencias
        if (this.state.apiCache) {
            const cacheKey = `ai:suggestions:${category}:${query}`;
            return this.state.apiCache.getOrSet(cacheKey, () => {
                return this.get(this.config.endpoints.ai.suggest, {
                    params: { q: query, category }
                });
            }, {
                strategy: 'api-response',
                ttl: 600000, // 10 minutos para sugerencias
                tags: ['ai', 'suggestions'],
                compression: true
            });
        } else if (typeof window !== 'undefined' && window.PromiseCache) {
            // Fallback a PromiseCache
            const cacheKey = `ai:suggestions:${category}:${query}`;
            return window.PromiseCache.getOrSet(cacheKey, () => {
                return this.get(this.config.endpoints.ai.suggest, {
                    params: { q: query, category }
                });
            }, {
                ttl: 600000, // 10 minutos para sugerencias
                tags: ['ai', 'suggestions']
            });
        }

        return this.get(this.config.endpoints.ai.suggest, {
            params: { q: query, category }
        });
    },
    
    legalResearch: function(query, jurisdiction = 'es') {
        return this.post(this.config.endpoints.ai.research, {
            query,
            jurisdiction,
            timestamp: Date.now()
        }, {
            priority: 2, // Prioridad alta para investigación legal
            timeout: 120000 // 2 minutos para investigación
        });
    },
    
    // Analytics con manejo robusto de promesas y caché
    getDashboard: function() {
        if (this.state.apiCache) {
            return this.state.apiCache.getOrSet('analytics:dashboard', () => {
                return this.get(this.config.endpoints.analytics.dashboard);
            }, {
                strategy: 'analytics',
                ttl: 300000, // 5 minutos para dashboard
                tags: ['analytics', 'dashboard'],
                compression: true
            });
        } else if (typeof window !== 'undefined' && window.PromiseCache) {
            // Fallback a PromiseCache
            return window.PromiseCache.getOrSet('analytics:dashboard', () => {
                return this.get(this.config.endpoints.analytics.dashboard);
            }, {
                ttl: 300000, // 5 minutos para dashboard
                tags: ['analytics', 'dashboard']
            });
        }

        return this.get(this.config.endpoints.analytics.dashboard);
    },
    
    getCasesAnalytics: function(period = '30d') {
        if (this.state.apiCache) {
            const cacheKey = `analytics:cases:${period}`;
            return this.state.apiCache.getOrSet(cacheKey, () => {
                return this.get(this.config.endpoints.analytics.cases, {
                    params: { period }
                });
            }, {
                strategy: 'analytics',
                ttl: 600000, // 10 minutos para analytics de casos
                tags: ['analytics', 'cases'],
                compression: true
            });
        } else if (typeof window !== 'undefined' && window.PromiseCache) {
            // Fallback a PromiseCache
            const cacheKey = `analytics:cases:${period}`;
            return window.PromiseCache.getOrSet(cacheKey, () => {
                return this.get(this.config.endpoints.analytics.cases, {
                    params: { period }
                });
            }, {
                ttl: 600000, // 10 minutos para analytics de casos
                tags: ['analytics', 'cases']
            });
        }

        return this.get(this.config.endpoints.analytics.cases, {
            params: { period }
        });
    },
    
    getDocumentsAnalytics: function(period = '30d') {
        if (this.state.apiCache) {
            const cacheKey = `analytics:documents:${period}`;
            return this.state.apiCache.getOrSet(cacheKey, () => {
                return this.get(this.config.endpoints.analytics.documents, {
                    params: { period }
                });
            }, {
                strategy: 'documents',
                ttl: 600000, // 10 minutos para analytics de documentos
                tags: ['analytics', 'documents'],
                compression: true
            });
        } else if (typeof window !== 'undefined' && window.PromiseCache) {
            // Fallback a PromiseCache
            const cacheKey = `analytics:documents:${period}`;
            return window.PromiseCache.getOrSet(cacheKey, () => {
                return this.get(this.config.endpoints.analytics.documents, {
                    params: { period }
                });
            }, {
                ttl: 600000, // 10 minutos para analytics de documentos
                tags: ['analytics', 'documents']
            });
        }

        return this.get(this.config.endpoints.analytics.documents, {
            params: { period }
        });
    },
    
    getPerformanceAnalytics: function(period = '30d') {
        if (this.state.apiCache) {
            const cacheKey = `analytics:performance:${period}`;
            return this.state.apiCache.getOrSet(cacheKey, () => {
                return this.get(this.config.endpoints.analytics.performance, {
                    params: { period }
                });
            }, {
                strategy: 'analytics',
                ttl: 900000, // 15 minutos para analytics de rendimiento
                tags: ['analytics', 'performance'],
                compression: true
            });
        } else if (typeof window !== 'undefined' && window.PromiseCache) {
            // Fallback a PromiseCache
            const cacheKey = `analytics:performance:${period}`;
            return window.PromiseCache.getOrSet(cacheKey, () => {
                return this.get(this.config.endpoints.analytics.performance, {
                    params: { period }
                });
            }, {
                ttl: 900000, // 15 minutos para analytics de rendimiento
                tags: ['analytics', 'performance']
            });
        }

        return this.get(this.config.endpoints.analytics.performance, {
            params: { period }
        });
    },
    
    generateReport: function(type, params = {}) {
        return this.post(this.config.endpoints.analytics.reports, {
            type,
            params,
            timestamp: Date.now()
        }, {
            priority: 3, // Prioridad media para reportes
            timeout: 180000 // 3 minutos para generación de reportes
        });
    },
    
    // Manejadores de error
    handleUnauthorized: function(response) {
        // Silently logout or refresh token instead of showing error
        if (Justice2Auth) {
             // Solo mostrar notificación si el usuario estaba activo recientemente
             // Para cargas iniciales, mejor ser silencioso
             Justice2Auth.logout(true);
        }
    },
    
    handleForbidden: function(response) {
        Justice2?.utils?.showNotification('No tiene permisos para realizar esta acción.', 'warning');
    },
    
    handleNotFound: function(response) {
        console.warn('Recurso no encontrado:', response.config.url);
        // No mostrar notificación al usuario para 404s, ya que puede ser ruido
    },
    
    handleRateLimit: function(response) {
        const retryAfter = response.headers['retry-after'] || 60;
        const rateLimitInfo = {
            limit: response.headers['x-ratelimit-limit'],
            remaining: response.headers['x-ratelimit-remaining'],
            reset: response.headers['x-ratelimit-reset'],
            retryAfter: retryAfter
        };
        
        console.warn(`Rate limit excedido. Retry after: ${retryAfter}`, rateLimitInfo);
        
        // Actualizar estado del rate limiting
        this.state.rateLimit.violations++;
        this.state.rateLimit.lastViolation = Date.now();
        
        // Mostrar notificación al usuario
        Justice2?.utils?.showNotification(
            `Límite de solicitudes excedido. Espere ${retryAfter} segundos.`,
            'warning'
        );
        
        // Emitir evento para monitoreo
        this.emitRateLimitEvent('rate-limit:exceeded', rateLimitInfo);
    },
    
    handleServerError: function(response) {
        console.error('Error del servidor:', response);
        // Solo mostrar error crítico si es una acción explícita del usuario, no en background fetch
    },
    
    handleGenericError: function(response) {
        const message = response.data?.message || 'Error desconocido';
        console.error(message);
    },
    
    handleNetworkError: function(error) {
        console.error('Error de red:', error);
        // Silenciar notificaciones de red constantes
    },

    // Detectar errores de certificado SSL
    isSSLCertificateError: function(error) {
        const errorMessage = error.message || error.toString();
        const sslErrorPatterns = [
            'ERR_CERT_AUTHORITY_INVALID',
            'ERR_CERT_COMMON_NAME_INVALID',
            'ERR_CERT_DATE_INVALID',
            'ERR_CERT_INVALID',
            'SSL_ERROR',
            'certificate',
            'SSL handshake failed',
            'self-signed certificate'
        ];
        
        return sslErrorPatterns.some(pattern =>
            errorMessage.toLowerCase().includes(pattern.toLowerCase())
        );
    },

    // Detectar errores de conexión rechazada
    isConnectionRefused: function(error) {
        const errorMessage = error.message || error.toString();
        return errorMessage.includes('ERR_CONNECTION_REFUSED') ||
               errorMessage.includes('Connection refused') ||
               errorMessage.includes('ECONNREFUSED');
    },

    // Manejar errores de certificado SSL
    handleSSLCertificateError: function(error) {
        const isDevelopment = this.config.environment === 'development';
        
        // Log detallado en consola pero SIN notificación visual intrusiva
        console.error('Error de Certificado SSL:', error);
        
        if (isDevelopment && this.config.ssl.allowInsecure) {
             console.warn('Advertencia: Conexión SSL insegura en modo desarrollo.');
        }
        
        // Activar modo degradado silenciosamente
        this.activateDegradedMode('ssl_error');
    },

    // Manejar errores de conexión rechazada
    handleConnectionRefusedError: function(error) {
        // Log en consola pero SIN notificación visual intrusiva
        console.error('Servidor No Disponible (Connection Refused):', error);
        
        // Activar modo degradado
        this.activateDegradedMode('connection_refused');
    },

    // Activar modo degradado
    activateDegradedMode: function(reason) {
        this.state.degradedMode = true;
        this.state.degradedReason = reason;
        
        // Emitir evento para que otros componentes sepan que estamos en modo degradado
        if (typeof CustomEvent !== 'undefined') {
            const event = new CustomEvent('justice2:degraded-mode', {
                detail: { reason, timestamp: Date.now() }
            });
            document.dispatchEvent(event);
        }
        
        // Notificación visual SILENCIADA (Context7 MCP)
        console.info('Modo degradado activado: Usando datos locales mientras se restaura la conexión.');
    },

    // Obtener el último request para reintentar
    retryLastRequest: function() {
        if (this.state.lastRequest) {
            return this.request({
                ...this.state.lastRequest,
                currentRetry: 0 // Resetear contador de reintentos
            });
        }
        return Promise.reject(new Error('No hay solicitud anterior para reintentar'));
    },
    
    handleConfigError: function(error) {
        this.log('Error de configuración:', error);
        Justice2?.utils?.showNotification('Error de configuración de la solicitud.', 'error');
    },
    
    // Utilidades
    parseHeaders: function(headersString) {
        const headers = {};
        headersString.split('\r\n').forEach(line => {
            const [key, value] = line.split(': ');
            if (key && value) {
                headers[key.toLowerCase()] = value;
            }
        });
        return headers;
    },
    
    // Verificación mejorada de rate limiting (cliente y servidor)
    checkRateLimitEnhanced: function(config) {
        if (!this.state.rateLimit.enabled) {
            return { allowed: true };
        }
        
        // Rate limiting del lado del cliente (adicional al del servidor)
        if (this.state.rateLimit.clientSide) {
            const clientCheck = this.checkClientSideRateLimit(config);
            if (!clientCheck.allowed) {
                return clientCheck;
            }
        }
        
        return { allowed: true };
    },
    
    // Rate limiting del lado del cliente
    checkClientSideRateLimit: function(config) {
        const now = Date.now();
        const endpoint = config.url || 'unknown';
        const method = config.method || 'GET';
        
        // Crear clave para el bucket
        const bucketKey = `client:${endpoint}:${method}`;
        
        // Obtener o crear bucket
        let bucket = this.state.rateLimit.buckets.get(bucketKey);
        if (!bucket) {
            bucket = {
                tokens: 50, // Tokens iniciales
                maxTokens: 50,
                refillRate: 0.83, // ~50 tokens por minuto
                lastRefill: now,
                requests: 0
            };
            this.state.rateLimit.buckets.set(bucketKey, bucket);
        }
        
        // Refill tokens
        const timePassed = (now - bucket.lastRefill) / 1000;
        const tokensToAdd = Math.floor(timePassed * bucket.refillRate);
        if (tokensToAdd > 0) {
            bucket.tokens = Math.min(bucket.tokens + tokensToAdd, bucket.maxTokens);
            bucket.lastRefill = now;
        }
        
        // Consumir token
        const tokensNeeded = this.getTokensForEndpoint(endpoint, method);
        if (bucket.tokens >= tokensNeeded) {
            bucket.tokens -= tokensNeeded;
            bucket.requests++;
            
            return {
                allowed: true,
                remaining: bucket.tokens,
                limit: bucket.maxTokens
            };
        }
        
        return {
            allowed: false,
            reason: 'Client-side rate limit exceeded',
            retryAfter: Math.ceil(tokensNeeded / bucket.refillRate),
            remaining: bucket.tokens,
            limit: bucket.maxTokens
        };
    },
    
    // Determinar tokens necesarios por endpoint
    getTokensForEndpoint: function(endpoint, method) {
        // Endpoints de autenticación son más costosos
        if (endpoint.includes('/auth/')) {
            return method === 'POST' ? 2 : 1;
        }
        
        // Uploads son muy costosos
        if (endpoint.includes('/upload')) {
            return 5;
        }
        
        // AI endpoints son costosos
        if (endpoint.includes('/ai/')) {
            return 3;
        }
        
        // Endpoints estándar
        return 1;
    },
    
    // Método legacy para compatibilidad
    isRateLimited: function() {
        const now = Date.now();
        if (now > this.state.rateLimit.resetTime) {
            this.state.rateLimit.requests = 0;
            this.state.rateLimit.resetTime = now + 60000;
        }
        
        return this.state.rateLimit.requests >= 100; // Límite de 100 solicitudes por minuto
    },
    
    shouldRetry: function(config, error) {
        // Si NetworkErrorHandler está disponible, delegar la decisión
        if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
            const context = {
                url: config.url,
                method: config.method || 'GET',
                retryCount: config.currentRetry || 0,
                config
            };
            
            return window.NetworkErrorHandler.shouldRetry(
                window.NetworkErrorHandler.classifyError(error),
                context
            );
        }
        
        // Fallback a la lógica original
        const maxRetries = config.retryAttempts || this.config.retryAttempts;
        const currentRetry = config.currentRetry || 0;
        
        // No reintentar en modo degradado
        if (this.state.degradedMode) {
            return false;
        }
        
        // Reintentar para errores de red y ciertos códigos de estado
        const shouldRetryNetworkError = !error.response && (
            this.isSSLCertificateError(error) ||
            this.isConnectionRefused(error)
        );
        
        const shouldRetryStatusError = error.response &&
            [408, 429, 500, 502, 503, 504].includes(error.response.status);
        
        return currentRetry < maxRetries &&
               (shouldRetryNetworkError || shouldRetryStatusError);
    },
    
    retryRequest: async function(config) {
        config.currentRetry = (config.currentRetry || 0) + 1;
        
        // Usar estrategia de backoff exponencial
        const delay = this.calculateBackoffDelay(config.currentRetry);
        
        // Mostrar notificación de reintento (SILENCIADA POR CONTEXT7 MCP PARA MEJOR UX)
        // Solo log en consola para debugging, sin molestar al usuario visualmente
        console.warn(`[Justice2API] Reintentando conexión (Intento ${config.currentRetry}) en ${Math.round(delay / 1000)}s...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
            return await this.request(config);
        } catch (error) {
            // Si después de todos los reintentos sigue fallando, activar modo degradado
            if (config.currentRetry >= (config.retryAttempts || this.config.retryAttempts)) {
                this.activateDegradedMode('max_retries_exceeded');
            }
            throw error;
        }
    },

    // Calcular delay con backoff exponencial y jitter
    calculateBackoffDelay: function(retryAttempt) {
        const { initialDelay, maxDelay, multiplier, jitter } = this.config.backoffStrategy;
        
        // Calcular delay exponencial
        let delay = initialDelay * Math.pow(multiplier, retryAttempt - 1);
        
        // Aplicar jitter aleatorio para evitar thundering herd
        if (jitter) {
            delay = delay * (0.5 + Math.random() * 0.5);
        }
        
        // Limitar al máximo
        return Math.min(delay, maxDelay);
    },
    
    // Cache
    getFromCache: function(key) {
        const cached = this.state.cache.get(key);
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutos
            return cached.data;
        }
        return null;
    },
    
    updateCache: function(key, data) {
        this.state.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    },
    
    clearCache: function() {
        this.state.cache.clear();
    },
    
    // Cola de solicitudes offline
    addToQueue: function(config) {
        this.state.requestQueue.push(config);
    },
    
    processQueue: function() {
        while (this.state.requestQueue.length > 0 && this.state.isOnline) {
            const config = this.state.requestQueue.shift();
            this.request(config).catch(error => {
                this.log('Error procesando solicitud en cola:', error);
            });
        }
    },
    
    // Sanitizar datos de respuesta
    sanitizeResponseData: function(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        
        // Función recursiva para sanitizar todos los strings en el objeto
        const sanitizeObject = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(item => sanitizeObject(item));
            } else if (obj && typeof obj === 'object') {
                const sanitized = {};
                Object.keys(obj).forEach(key => {
                    // Sanitizar nombres de clave solo si XSSProtection está disponible
                    const sanitizedKey = (typeof XSSProtection !== 'undefined' && XSSProtection.escapeHtml) ?
                                       XSSProtection.escapeHtml(key) : key;
                    sanitized[sanitizedKey] = sanitizeObject(obj[key]);
                });
                return sanitized;
            } else if (typeof obj === 'string') {
                // Sanitizar texto solo si XSSProtection está disponible
                return (typeof XSSProtection !== 'undefined' && XSSProtection.sanitizeText) ?
                       XSSProtection.sanitizeText(obj) : obj;
            }
            return obj;
        };
        
        return sanitizeObject(data);
    },

    // Sanitizar datos de solicitud
    sanitizeRequestData: function(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        
        // Función recursiva para sanitizar todos los strings en el objeto
        const sanitizeObject = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(item => sanitizeObject(item));
            } else if (obj && typeof obj === 'object') {
                const sanitized = {};
                Object.keys(obj).forEach(key => {
                    // No sanitizar nombres de clave en solicitudes (podrían ser requeridos por la API)
                    sanitized[key] = sanitizeObject(obj[key]);
                });
                return sanitized;
            } else if (typeof obj === 'string') {
                // Sanitizar texto solo si XSSProtection está disponible
                return (typeof XSSProtection !== 'undefined' && XSSProtection.sanitizeText) ?
                       XSSProtection.sanitizeText(obj) : obj;
            }
            return obj;
        };
        
        return sanitizeObject(data);
    },

    // Validar respuesta de API
    validateApiResponse: function(response) {
        if (!response || typeof response !== 'object') {
            return false;
        }
        
        // Verificar estructura básica de respuesta
        if (response.data && typeof response.data === 'object') {
            // Verificar que no contenga patrones XSS peligrosos
            const responseString = JSON.stringify(response.data);
            
            // Validar que XSSProtection esté disponible antes de usarlo
            if (typeof XSSProtection !== 'undefined' && XSSProtection.validateInput) {
                const validation = XSSProtection.validateInput(responseString, {
                    type: 'text',
                    maxLength: 100000, // Límite más grande para respuestas
                    allowEmpty: true
                });
                
                return validation.valid;
            } else {
                // Validación fallback si XSSProtection no está disponible
                const dangerousPatterns = [
                    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                    /javascript:/gi,
                    /vbscript:/gi,
                    /on\w+\s*=/gi,
                    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
                ];
                
                return !dangerousPatterns.some(pattern => pattern.test(responseString));
            }
        }
        
        return true;
    },

    // Emitir eventos de rate limiting
    emitRateLimitEvent: function(eventType, data) {
        if (typeof CustomEvent !== 'undefined') {
            const event = new CustomEvent(eventType, {
                detail: data
            });
            document.dispatchEvent(event);
        }
        
        // También emitir a través de Justice2 si está disponible
        if (Justice2?.events) {
            Justice2.events.emit(eventType, data);
        }
    },
    
    // Obtener estadísticas de rate limiting
    getRateLimitStats: function() {
        return {
            enabled: this.state.rateLimit.enabled,
            clientSide: this.state.rateLimit.clientSide,
            serverSide: this.state.rateLimit.serverSide,
            violations: this.state.rateLimit.violations,
            lastViolation: this.state.rateLimit.lastViolation,
            buckets: this.state.rateLimit.buckets.size,
            requests: this.state.rateLimit.requests,
            resetTime: this.state.rateLimit.resetTime
        };
    },
    
    // Reiniciar estadísticas de rate limiting
    resetRateLimitStats: function() {
        this.state.rateLimit.violations = 0;
        this.state.rateLimit.lastViolation = null;
        this.state.rateLimit.requests = 0;
        this.state.rateLimit.buckets.clear();
        this.state.rateLimit.resetTime = Date.now() + 60000;
        
        this.log('Estadísticas de rate limiting reiniciadas');
    },
    
    // Determinar si una solicitud requiere protección CSRF
    shouldRequireCSRF: function(config) {
        if (!this.state.csrf.enabled || !this.state.csrf.initialized) {
            return false;
        }
        
        // Métodos que modifican datos
        const sensitiveMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
        const method = (config.method || 'GET').toUpperCase();
        
        if (!sensitiveMethods.includes(method)) {
            return false;
        }
        
        // Excluir endpoints que no requieren CSRF
        const excludedEndpoints = [
            '/csrf/token',
            '/csrf/validate',
            '/auth/login',
            '/auth/register'
        ];
        
        const url = config.url || '';
        return !excludedEndpoints.some(endpoint => url.includes(endpoint));
    },
    
    // Manejar errores CSRF
    handleCSRFError: function(response) {
        console.error('Error CSRF detectado:', response.data);
        
        // Limpiar token actual
        this.state.csrf.token = null;
        this.state.csrf.tokenExpiry = null;
        
        if (window.CSRFProtection) {
            window.CSRFProtection.clearToken();
        }
        
        // Mostrar notificación al usuario
        Justice2?.utils?.showNotification(
            'Error de seguridad: La solicitud fue rechazada. Por favor, recargue la página.',
            'error'
        );
        
        // Intentar obtener nuevo token
        this.refreshCSRFToken();
    },
    
    // Validar token CSRF con el servidor
    validateCSRFToken: async function(token) {
        try {
            const response = await this.post('/csrf/validate', { token });
            return response.data && response.data.valid;
        } catch (error) {
            console.error('Error validando token CSRF:', error);
            return false;
        }
    },
    
    // Obtener estado del sistema CSRF
    getCSRFStatus: function() {
        return {
            enabled: this.state.csrf.enabled,
            initialized: this.state.csrf.initialized,
            hasToken: !!this.state.csrf.token,
            tokenExpiry: this.state.csrf.tokenExpiry,
            isExpired: this.isCSRFTokenExpired()
        };
    },
    
    // Logging
    log: function(...args) {
        Justice2?.log('[Justice2API]', ...args);
    },
    
    // Método para limpiar toda la caché API
    clearApiCache: function() {
        if (this.state.apiCache) {
            try {
                this.state.apiCache.clear();
                this.log('Caché API limpiada completamente');
            } catch (error) {
                this.log('Error limpiando caché API:', error);
            }
        }
    },
    
    // Método para optimizar caché automáticamente
    optimizeCache: function() {
        if (this.state.apiCache) {
            try {
                this.state.apiCache.optimize();
                this.log('Caché API optimizada automáticamente');
            } catch (error) {
                this.log('Error optimizando caché API:', error);
            }
        }
    },
    
    // Método para obtener estadísticas de uso de caché
    getCacheStatistics: function() {
        if (!this.state.apiCache) return null;
        
        try {
            const metrics = this.state.apiCache.getMetrics();
            const health = this.state.apiCache.getHealth();
            
            return {
                metrics,
                health,
                strategies: this.state.apiCache.getStrategies(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.log('Error obteniendo estadísticas de caché:', error);
            return null;
        }
    },
    
    // Realizar mantenimiento de sincronización de API
    performApiSyncMaintenance: async function() {
        if (!this.state.syncInitialized) return;
        
        try {
            this.log('Realizando mantenimiento de sincronización de API...');
            
            // Limpiar solicitudes expiradas
            const now = Date.now();
            for (const [requestId, request] of this.state.activeRequests.entries()) {
                if (now - request.startTime > this.config.syncTimeout * 2) {
                    this.state.activeRequests.delete(requestId);
                    this.log(`Solicitud API expirada eliminada: ${requestId}`);
                }
            }
            
            // Optimizar SyncManager
            if (this.state.syncManager) {
                await this.state.syncManager.optimize();
            }
            
            // Optimizar ConcurrencyController
            if (this.state.concurrencyController) {
                await this.state.concurrencyController.optimize();
            }
            
            // Ejecutar diagnóstico si está disponible
            if (this.state.syncDiagnostics) {
                await this.state.syncDiagnostics.performHealthCheck();
            }
            
            this.log('Mantenimiento de sincronización de API completado');
            
        } catch (error) {
            this.log('Error en mantenimiento de sincronización de API:', error);
        }
    },
    
    // Obtener estadísticas de sincronización de API
    getApiSyncStatistics: function() {
        if (!this.state.syncInitialized) {
            return null;
        }
        
        const stats = {
            requests: {
                total: this.state.activeRequests.size,
                running: Array.from(this.state.activeRequests.values()).filter(req => req.status === 'running').length,
                completed: Array.from(this.state.activeRequests.values()).filter(req => req.status === 'completed').length,
                failed: Array.from(this.state.activeRequests.values()).filter(req => req.status === 'failed').length
            },
            locks: {
                active: this.state.requestLocks.size,
                resources: Array.from(this.state.requestLocks.keys())
            },
            syncManager: this.state.syncManager ? this.state.syncManager.getMetrics() : null,
            concurrencyController: this.state.concurrencyController ? this.state.concurrencyController.getMetrics() : null,
            syncDiagnostics: this.state.syncDiagnostics ? this.state.syncDiagnostics.getHealth() : null
        };
        
        return stats;
    },
    
    // Limpiar recursos de sincronización de API
    cleanupApiSync: async function() {
        if (!this.state.syncInitialized) return;
        
        try {
            this.log('Limpiando recursos de sincronización de API...');
            
            // Cancelar solicitudes activas
            for (const [requestId, request] of this.state.activeRequests.entries()) {
                if (request.status === 'running') {
                    this.log(`Cancelando solicitud activa: ${requestId}`);
                    request.status = 'cancelled';
                    request.endTime = Date.now();
                }
            }
            this.state.activeRequests.clear();
            
            // Liberar todos los bloqueos
            for (const [resource, locks] of this.state.requestLocks.entries()) {
                for (const lockId of locks) {
                    try {
                        await this.state.syncManager.releaseLock(resource, lockId);
                    } catch (error) {
                        this.log(`Error liberando bloqueo ${lockId} para ${resource}:`, error);
                    }
                }
            }
            this.state.requestLocks.clear();
            
            // Limpiar sistemas de sincronización
            if (this.state.syncManager) {
                await this.state.syncManager.cleanup();
            }
            
            if (this.state.concurrencyController) {
                await this.state.concurrencyController.cleanup();
            }
            
            if (this.state.syncDiagnostics) {
                await this.state.syncDiagnostics.cleanup();
            }
            
            this.log('Recursos de sincronización de API limpiados');
            
        } catch (error) {
            this.log('Error limpiando recursos de sincronización de API:', error);
        }
    }
};

// Inicializar cliente API
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Justice2API.init();
    });
} else {
    Justice2API.init();
}

// Exportar para uso global
window.Justice2API = Justice2API;

// Exponer métodos de sincronización
window.Justice2API.getApiSyncStatus = Justice2API.getApiSyncStatus;
window.Justice2API.getApiSyncStatistics = Justice2API.getApiSyncStatistics;
window.Justice2API.performApiSyncMaintenance = Justice2API.performApiSyncMaintenance;
window.Justice2API.cleanupApiSync = Justice2API.cleanupApiSync;