/**
 * Justice 2 Authentication System
 * Sistema de autenticación no intrusivo para Justice 2 con NetworkErrorHandler y sincronización robusta integrados
 */

// Importar sistema de sincronización robusto
import SyncManager from './components/sync-manager.js';
import ConcurrencyController from './components/concurrency-controller.js';
import SyncDiagnostics from './components/sync-diagnostics.js';

// Importar sistema de protección XSS centralizado
// El sistema se carga automáticamente desde components/xss-protection.js

// Importar sistema de manejo robusto de promesas y NetworkErrorHandler
if (typeof window !== 'undefined') {
    // Cargar NetworkErrorHandler primero (dependencia crítica)
    const networkErrorHandlerScript = document.createElement('script');
    networkErrorHandlerScript.src = './components/network-error-handler.js';
    networkErrorHandlerScript.async = true;
    networkErrorHandlerScript.onload = () => {
        console.log('[Justice2Auth] NetworkErrorHandler cargado');
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
}

const Justice2Auth = {
    // Configuración
    config: {
        tokenKey: 'justice2_token',
        userKey: 'justice2_user',
        tokenExpiry: 24 * 60 * 60 * 1000, // 24 horas
        refreshThreshold: 5 * 60 * 1000, // 5 minutos antes de expirar
        apiEndpoints: {
            login: '/auth/login',
            register: '/auth/register',
            refresh: '/auth/refresh',
            logout: '/auth/logout',
            profile: '/auth/profile'
        }
    },
    
    // Estado de autenticación
    state: {
        token: null,
        user: null,
        isAuthenticated: false,
        refreshTimer: null,
        loginAttempts: 0,
        maxLoginAttempts: 5,
        lockoutTime: 15 * 60 * 1000, // 15 minutos
        authCache: null // CacheManager para datos de autenticación
    },
    
    // Inicialización
    init: function() {
        this.log('Inicializando sistema de autenticación con NetworkErrorHandler y sincronización robusta');
        
        // Inicializar sistema de sincronización primero
        this.initializeSynchronization();
        
        // Esperar a que NetworkErrorHandler esté disponible antes de continuar
        const waitForNetworkErrorHandler = () => {
            if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
                // NetworkErrorHandler está disponible, continuar con inicialización
                this.initializeAuthCache();
                this.checkExistingSession();
                this.initAuthEvents();
                this.initUIEvents();
                this.setupTokenRefresh();
                
                // Configurar eventos de NetworkErrorHandler para autenticación
                this.setupNetworkErrorHandlerEvents();
                
                // Configurar eventos de sincronización
                this.setupSyncEvents();
                
                this.log('Sistema de autenticación inicializado con NetworkErrorHandler y sincronización');
            } else {
                // NetworkErrorHandler no está disponible aún, esperar y reintentar
                this.log('Esperando a NetworkErrorHandler para autenticación...');
                setTimeout(waitForNetworkErrorHandler, 100);
            }
        };
        
        waitForNetworkErrorHandler();
    },
    
    // Inicializar sistema de sincronización
    initializeSynchronization: async function() {
        if (!this.config.syncEnabled) {
            this.log('Sincronización deshabilitada en configuración de autenticación');
            return;
        }
        
        try {
            this.log('Inicializando sistema de sincronización para autenticación...');
            
            // Inicializar SyncManager
            if (typeof SyncManager !== 'undefined') {
                SyncManager.init({
                    maxConcurrentOperations: this.config.maxConcurrentAuthOperations,
                    defaultTimeout: this.config.syncTimeout,
                    enableDeadlockDetection: this.config.enableDeadlockDetection,
                    enableRaceConditionDetection: this.config.enableRaceConditionDetection,
                    enableMetrics: true
                });
                
                this.state.syncManager = SyncManager;
                this.log('SyncManager inicializado para autenticación');
            }
            
            // Inicializar ConcurrencyController
            if (typeof ConcurrencyController !== 'undefined') {
                ConcurrencyController.init({
                    maxThreads: this.config.maxConcurrentAuthOperations,
                    enableAtomicOperations: true,
                    enableRaceDetection: this.config.enableRaceConditionDetection,
                    enableMetrics: true
                });
                
                this.state.concurrencyController = ConcurrencyController;
                this.log('ConcurrencyController inicializado para autenticación');
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
                this.log('SyncDiagnostics inicializado para autenticación');
            }
            
            this.state.syncInitialized = true;
            this.log('Sistema de sincronización para autenticación inicializado correctamente');
            
        } catch (error) {
            this.log('Error inicializando sistema de sincronización para autenticación:', error);
            // Continuar sin sincronización en caso de error
        }
    },
    
    // Configurar eventos de sincronización
    setupSyncEvents: function() {
        if (!this.state.syncManager) return;
        
        // Escuchar eventos de deadlock
        if (typeof document !== 'undefined') {
            document.addEventListener('sync:deadlock:detected', (event) => {
                this.log('Deadlock detectado en autenticación:', event.detail);
                this.handleAuthSyncDeadlock(event.detail);
            });
            
            document.addEventListener('sync:deadlock:resolved', (event) => {
                this.log('Deadlock resuelto en autenticación:', event.detail);
                this.handleAuthSyncRecovery(event.detail);
            });
            
            document.addEventListener('sync:race:detected', (event) => {
                this.log('Race condition detectada en autenticación:', event.detail);
                this.handleAuthSyncRaceCondition(event.detail);
            });
            
            document.addEventListener('sync:recovery:completed', (event) => {
                this.log('Recuperación de sincronización completada en autenticación:', event.detail);
                this.handleAuthSyncRecovery(event.detail);
            });
            
            document.addEventListener('sync:performance:degraded', (event) => {
                this.log('Rendimiento de sincronización degradado en autenticación:', event.detail);
                this.handleAuthSyncPerformanceDegraded(event.detail);
            });
        }
    },
    
    // Manejar deadlock en sincronización de autenticación
    handleAuthSyncDeadlock: function(detail) {
        // Liberar bloqueos relacionados con la operación de autenticación afectada
        if (detail.resource && detail.resource.includes('auth')) {
            const locks = this.state.authLocks.get(detail.resource);
            if (locks) {
                locks.forEach(lockId => {
                    this.state.syncManager.releaseLock(detail.resource, lockId);
                });
                this.state.authLocks.delete(detail.resource);
            }
        }
        
        // Invalidar caché de autenticación si aplica
        if (this.state.authCache) {
            this.state.authCache.invalidateByPattern('auth*');
        }
        
        // Notificar al usuario
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(
                'Conflicto de sincronización detectado en autenticación, resolviendo...',
                'warning'
            );
        }
    },
    
    // Manejar race condition en sincronización de autenticación
    handleAuthSyncRaceCondition: function(detail) {
        // Invalidar caché de autenticación relacionada
        if (this.state.authCache && detail.resource && detail.resource.includes('auth')) {
            const pattern = `*${detail.resource}*`;
            this.state.authCache.invalidateByPattern(pattern);
        }
        
        // Notificar al usuario
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(
                'Condición de competencia detectada en autenticación, aplicando corrección...',
                'warning'
            );
        }
    },
    
    // Manejar recuperación de sincronización de autenticación
    handleAuthSyncRecovery: function(detail) {
        // Reintentar operaciones de autenticación fallidas si aplica
        if (detail.retryAuth && this.state.loginAttempts > 0) {
            this.state.loginAttempts = 0;
            this.log('Contador de intentos de login reiniciado por recuperación de sincronización');
        }
        
        // Notificar al usuario
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(
                'Sistema de autenticación recuperado',
                'success'
            );
        }
    },
    
    // Manejar degradación de rendimiento de sincronización de autenticación
    handleAuthSyncPerformanceDegraded: function(detail) {
        // Reducir concurrencia de autenticación temporalmente
        if (this.config.maxConcurrentAuthOperations > 3) {
            this.config.maxConcurrentAuthOperations = Math.max(3, this.config.maxConcurrentAuthOperations / 2);
            this.log(`Concurrencia de autenticación reducida a ${this.config.maxConcurrentAuthOperations} por degradación de rendimiento`);
        }
        
        // Notificar al usuario
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(
                'Rendimiento del sistema de autenticación degradado, optimizando...',
                'info'
            );
        }
    },
    
    // Ejecutar operación de autenticación con sincronización
    executeWithSync: async function(operationId, operationFn, options = {}) {
        if (!this.state.syncInitialized) {
            // Fallback sin sincronización
            return await operationFn();
        }
        
        const syncOptions = {
            timeout: this.config.syncTimeout,
            priority: options.priority || 1, // Alta prioridad para autenticación
            retries: options.retries || 3,
            resource: options.resource,
            ...options
        };
        
        try {
            // Registrar operación de autenticación activa
            this.state.activeAuthOperations.set(operationId, {
                startTime: Date.now(),
                status: 'running',
                options: syncOptions
            });
            
            // Ejecutar con control de concurrencia
            const result = await this.state.concurrencyController.execute(
                operationId,
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
                        if (!this.state.authLocks.has(syncOptions.resource)) {
                            this.state.authLocks.set(syncOptions.resource, []);
                        }
                        this.state.authLocks.get(syncOptions.resource).push(lockResult.lockId);
                        
                        try {
                            return await operationFn();
                        } finally {
                            // Liberar bloqueo
                            const locks = this.state.authLocks.get(syncOptions.resource);
                            if (locks) {
                                const index = locks.indexOf(lockResult.lockId);
                                if (index > -1) {
                                    locks.splice(index, 1);
                                }
                                if (locks.length === 0) {
                                    this.state.authLocks.delete(syncOptions.resource);
                                }
                            }
                            
                            await this.state.syncManager.releaseLock(
                                syncOptions.resource,
                                lockResult.lockId
                            );
                        }
                    } else {
                        return await operationFn();
                    }
                },
                syncOptions
            );
            
            // Actualizar estado de operación
            const operation = this.state.activeAuthOperations.get(operationId);
            if (operation) {
                operation.status = 'completed';
                operation.endTime = Date.now();
                operation.duration = operation.endTime - operation.startTime;
                operation.result = result;
            }
            
            return result;
            
        } catch (error) {
            // Actualizar estado de operación con error
            const operation = this.state.activeAuthOperations.get(operationId);
            if (operation) {
                operation.status = 'failed';
                operation.endTime = Date.now();
                operation.duration = operation.endTime - operation.startTime;
                operation.error = error.message;
            }
            
            this.log(`Error en operación de autenticación sincronizada ${operationId}:`, error);
            throw error;
            
        } finally {
            // Limpiar operación después de un tiempo
            setTimeout(() => {
                this.state.activeAuthOperations.delete(operationId);
            }, 5000);
        }
    },
    
    // Obtener estado de sincronización de autenticación
    getAuthSyncStatus: function() {
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
            activeOperations: this.state.activeAuthOperations.size,
            activeLocks: this.state.authLocks.size,
            maxConcurrentOperations: this.config.maxConcurrentAuthOperations,
            syncManager: this.state.syncManager ? this.state.syncManager.getStatus() : null,
            concurrencyController: this.state.concurrencyController ? this.state.concurrencyController.getStatus() : null,
            syncDiagnostics: this.state.syncDiagnostics ? this.state.syncDiagnostics.getHealth() : null
        };
        
        // Determinar estado general
        if (status.syncManager && status.syncManager.healthy &&
            status.concurrencyController && status.concurrencyController.healthy) {
            status.status = 'healthy';
        } else if (status.activeOperations > 0) {
            status.status = 'active';
        } else {
            status.status = 'degraded';
        }
        
        return status;
    },
    
    // Configurar eventos de NetworkErrorHandler para autenticación
    setupNetworkErrorHandlerEvents: function() {
        if (typeof window === 'undefined' || !window.NetworkErrorHandler) {
            return;
        }
        
        // Escuchar eventos de conexión relevantes para autenticación
        document.addEventListener('connection:restored', (event) => {
            this.log('Conexión restaurada - verificando estado de autenticación');
            this.handleConnectionRestored(event.detail);
        });
        
        document.addEventListener('connection:lost', (event) => {
            this.log('Pérdida de conexión - protegiendo sesión de autenticación');
            this.handleConnectionLost(event.detail);
        });
        
        // Escuchar eventos de circuit breaker para autenticación
        document.addEventListener('circuit-breaker:tripped', (event) => {
            if (event.detail.endpoint.includes('/auth') || event.detail.endpoint.includes('/login')) {
                this.log(`Circuit breaker activado para servicio de autenticación: ${event.detail.endpoint}`);
                this.handleAuthCircuitBreakerTripped(event.detail);
            }
        });
        
        // Escuchar eventos de error de red para autenticación
        document.addEventListener('network:error', (event) => {
            const { errorInfo, context } = event.detail;
            
            if (context.type === 'auth') {
                this.log(`Error de red de autenticación detectado: ${errorInfo.type}`);
                this.handleAuthNetworkError(errorInfo, context);
            }
        });
    },
    
    // Manejar restauración de conexión para autenticación
    handleConnectionRestored: function(detail) {
        // Verificar si el token sigue siendo válido
        this.validateToken(true).catch(error => {
            this.log('Token inválido después de restauración de conexión', error);
            this.logout(false); // Logout silencioso
        });
        
        // Notificar a otros componentes
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.events) {
            window.Justice2.events.emit('auth:connection-restored', detail);
        }
    },
    
    // Manejar pérdida de conexión para autenticación
    handleConnectionLost: function(detail) {
        // Proteger la sesión actual pero no cerrarla automáticamente
        this.state.connectionLost = true;
        this.state.connectionLostTime = Date.now();
        
        // Notificar al usuario que la sesión está protegida pero puede necesitar verificación
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(
                'Conexión perdida. Tu sesión está protegida y se verificará cuando se restaure.',
                'info'
            );
        }
        
        // Notificar a otros componentes
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.events) {
            window.Justice2.events.emit('auth:connection-lost', detail);
        }
    },
    
    // Manejar activación de circuit breaker para autenticación
    handleAuthCircuitBreakerTripped: function(detail) {
        // Notificar al usuario sobre problemas con el servicio de autenticación
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(
                'Servicio de autenticación temporalmente no disponible. Tu sesión actual permanece activa.',
                'warning'
            );
        }
        
        // Notificar a otros componentes
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.events) {
            window.Justice2.events.emit('auth:circuit-breaker-tripped', detail);
        }
    },
    
    // Manejar error de red de autenticación
    handleAuthNetworkError: function(errorInfo, context) {
        // Actualizar estado de autenticación basado en el error
        if (errorInfo.severity === 'high') {
            this.state.lastError = errorInfo;
            
            // Si es un error crítico de autenticación, considerar logout forzado
            if (errorInfo.type === 'AUTHENTICATION_ERROR' && errorInfo.code === 401) {
                this.logout(false); // Logout silencioso
            }
        }
        
        // Notificar a otros componentes si es un error crítico
        if (errorInfo.severity === 'high' && typeof window !== 'undefined' && window.Justice2 && window.Justice2.events) {
            window.Justice2.events.emit('auth:critical-error', { errorInfo, context });
        }
    },
    
    // Obtener estadísticas combinadas de autenticación y NetworkErrorHandler
    getAuthStats: function() {
        const authStats = {
            isAuthenticated: this.state.isAuthenticated,
            tokenExpires: this.state.tokenExpires,
            lastError: this.state.lastError,
            connectionLost: this.state.connectionLost,
            connectionLostTime: this.state.connectionLostTime
        };
        
        // Agregar estadísticas de NetworkErrorHandler si está disponible
        if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
            const networkStats = window.NetworkErrorHandler.getStats();
            return {
                ...authStats,
                ...networkStats,
                networkHandlerEnabled: true
            };
        }
        
        return {
            ...authStats,
            networkHandlerEnabled: false
        };
    },
    
    // Inicializar caché de autenticación
    initializeAuthCache: function() {
        // Esperar a que CacheManager esté disponible
        const initializeCache = () => {
            if (typeof window !== 'undefined' && window.CacheManager) {
                try {
                    // Crear instancia de caché para autenticación
                    this.state.authCache = new window.CacheManager({
                        name: 'justice2-auth-cache',
                        strategy: 'persistent',
                        ttl: 24 * 60 * 60 * 1000, // 24 horas
                        maxSize: 50,
                        compression: true,
                        metrics: true,
                        cacheLevels: ['memory', 'localStorage']
                    });
                    
                    // Configurar estrategias específicas para autenticación
                    this.state.authCache.configureStrategy('user-session', {
                        ttl: 24 * 60 * 60 * 1000, // 24 horas
                        strategy: 'persistent',
                        compression: true,
                        encryption: true // Datos sensibles
                    });
                    
                    this.state.authCache.configureStrategy('token-validation', {
                        ttl: 5 * 60 * 1000, // 5 minutos
                        strategy: 'lru',
                        maxSize: 100,
                        compression: true
                    });
                    
                    this.state.authCache.configureStrategy('user-profile', {
                        ttl: 60 * 60 * 1000, // 1 hora
                        strategy: 'multi-level',
                        compression: true,
                        refreshAhead: true,
                        refreshAheadThreshold: 0.8
                    });
                    
                    this.state.authCache.configureStrategy('auth-attempts', {
                        ttl: 15 * 60 * 1000, // 15 minutos
                        strategy: 'ttl',
                        compression: false
                    });
                    
                    this.log('Sistema de caché de autenticación inicializado');
                } catch (error) {
                    console.error('Error inicializando caché de autenticación:', error);
                }
            } else {
                // Reintentar en 100ms
                setTimeout(initializeCache, 100);
            }
        };
        
        initializeCache();
    },
    
    // Obtener caché para una estrategia específica
    getAuthCacheForStrategy: function(strategy) {
        if (!this.state.authCache) return null;
        
        try {
            return this.state.authCache.getCache(strategy);
        } catch (error) {
            this.log('Error obteniendo caché de autenticación para estrategia:', strategy, error);
            return null;
        }
    },
    
    // Almacenar sesión de usuario en caché
    cacheUserSession: async function(userData, token) {
        if (!this.state.authCache) return;
        
        try {
            const sessionData = {
                user: userData,
                token: token,
                timestamp: Date.now(),
                isAuthenticated: true
            };
            
            await this.state.authCache.set('user-session', sessionData, {
                strategy: 'user-session',
                tags: ['auth', 'session', 'user'],
                priority: 1 // Máxima prioridad
            });
            
            this.log('Sesión de usuario almacenada en caché');
        } catch (error) {
            this.log('Error almacenando sesión en caché:', error);
        }
    },
    
    // Obtener sesión de usuario desde caché
    getCachedUserSession: async function() {
        if (!this.state.authCache) return null;
        
        try {
            const sessionData = await this.state.authCache.get('user-session', 'user-session');
            
            if (sessionData && sessionData.isAuthenticated) {
                // Verificar que la sesión no esté expirada
                const sessionAge = Date.now() - sessionData.timestamp;
                const maxSessionAge = 24 * 60 * 60 * 1000; // 24 horas
                
                if (sessionAge < maxSessionAge) {
                    return sessionData;
                } else {
                    // Sesión expirada, limpiar caché
                    await this.state.authCache.delete('user-session');
                    this.log('Sesión de usuario expirada, eliminada de caché');
                }
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo sesión de usuario desde caché:', error);
            return null;
        }
    },
    
    // Cachear resultado de validación de token
    cacheTokenValidation: async function(token, isValid, userId = null) {
        if (!this.state.authCache) return;
        
        try {
            const validationData = {
                token: this.hashToken(token), // Solo almacenar hash del token
                isValid: isValid,
                userId: userId,
                timestamp: Date.now()
            };
            
            const cacheKey = `token-validation:${this.hashToken(token)}`;
            
            await this.state.authCache.set(cacheKey, validationData, {
                strategy: 'token-validation',
                tags: ['auth', 'token', 'validation'],
                priority: 2
            });
            
            this.log('Validación de token almacenada en caché');
        } catch (error) {
            this.log('Error almacenando validación de token en caché:', error);
        }
    },
    
    // Obtener validación de token desde caché
    getCachedTokenValidation: async function(token) {
        if (!this.state.authCache) return null;
        
        try {
            const cacheKey = `token-validation:${this.hashToken(token)}`;
            const validationData = await this.state.authCache.get(cacheKey, 'token-validation');
            
            if (validationData) {
                // Verificar que la validación no esté expirada
                const validationAge = Date.now() - validationData.timestamp;
                const maxValidationAge = 5 * 60 * 1000; // 5 minutos
                
                if (validationAge < maxValidationAge) {
                    return validationData;
                } else {
                    // Validación expirada, limpiar caché
                    await this.state.authCache.delete(cacheKey);
                    this.log('Validación de token expirada, eliminada de caché');
                }
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo validación de token desde caché:', error);
            return null;
        }
    },
    
    // Cachear perfil de usuario
    cacheUserProfile: async function(userId, profileData) {
        if (!this.state.authCache) return;
        
        try {
            const cacheKey = `user-profile:${userId}`;
            
            await this.state.authCache.set(cacheKey, profileData, {
                strategy: 'user-profile',
                ttl: 60 * 60 * 1000, // 1 hora
                tags: ['auth', 'user', 'profile'],
                priority: 3
            });
            
            this.log('Perfil de usuario almacenado en caché');
        } catch (error) {
            this.log('Error almacenando perfil de usuario en caché:', error);
        }
    },
    
    // Obtener perfil de usuario desde caché
    getCachedUserProfile: async function(userId) {
        if (!this.state.authCache) return null;
        
        try {
            const cacheKey = `user-profile:${userId}`;
            const profileData = await this.state.authCache.get(cacheKey, 'user-profile');
            
            return profileData;
        } catch (error) {
            this.log('Error obteniendo perfil de usuario desde caché:', error);
            return null;
        }
    },
    
    // Registrar intento de autenticación
    cacheAuthAttempt: async function(identifier, success, ip = null) {
        if (!this.state.authCache) return;
        
        try {
            const attemptData = {
                identifier: this.hashIdentifier(identifier), // Hash para privacidad
                success: success,
                ip: ip || 'client-side',
                timestamp: Date.now()
            };
            
            const cacheKey = `auth-attempt:${this.hashIdentifier(identifier)}`;
            
            await this.state.authCache.set(cacheKey, attemptData, {
                strategy: 'auth-attempts',
                tags: ['auth', 'attempt', 'security'],
                priority: 4
            });
            
            this.log('Intento de autenticación registrado en caché');
        } catch (error) {
            this.log('Error registrando intento de autenticación en caché:', error);
        }
    },
    
    // Obtener intentos de autenticación
    getCachedAuthAttempts: async function(identifier) {
        if (!this.state.authCache) return [];
        
        try {
            const cacheKey = `auth-attempt:${this.hashIdentifier(identifier)}`;
            const attemptData = await this.state.authCache.get(cacheKey, 'auth-attempts');
            
            return attemptData ? [attemptData] : [];
        } catch (error) {
            this.log('Error obteniendo intentos de autenticación desde caché:', error);
            return [];
        }
    },
    
    // Limpiar caché de autenticación
    clearAuthCache: async function() {
        if (!this.state.authCache) return;
        
        try {
            // Invalidar todos los datos de autenticación
            await this.state.authCache.invalidateByPattern('auth');
            
            this.log('Caché de autenticación limpiada');
        } catch (error) {
            this.log('Error limpiando caché de autenticación:', error);
        }
    },
    
    // Hash de token para almacenamiento seguro
    hashToken: function(token) {
        // Simple hash para demostración (en producción usar algoritmo criptográfico)
        let hash = 0;
        for (let i = 0; i < token.length; i++) {
            const char = token.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32-bit integer
        }
        return hash.toString(36);
    },
    
    // Hash de identificador para privacidad
    hashIdentifier: function(identifier) {
        // Simple hash para demostración (en producción usar algoritmo criptográfico)
        return btoa(identifier).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    },
    
    // Verificar sesión existente
    checkExistingSession: async function() {
        // Primero intentar obtener desde caché
        const cachedSession = await this.getCachedUserSession();
        
        if (cachedSession) {
            try {
                // Validar token en caché primero
                const cachedValidation = await this.getCachedTokenValidation(cachedSession.token);
                
                if (cachedValidation && cachedValidation.isValid) {
                    // Usar datos de caché si son válidos
                    this.state.token = cachedSession.token;
                    this.state.user = cachedSession.user;
                    this.state.isAuthenticated = true;
                    
                    // Sincronizar con localStorage
                    localStorage.setItem(this.config.tokenKey, cachedSession.token);
                    localStorage.setItem(this.config.userKey, JSON.stringify(cachedSession.user));
                    
                    this.updateUI();
                    this.startTokenRefresh();
                    
                    this.log('Sesión restaurada desde caché correctamente');
                    return;
                }
            } catch (error) {
                this.log('Error verificando sesión en caché:', error);
            }
        }
        
        // Fallback a localStorage
        const token = localStorage.getItem(this.config.tokenKey);
        const user = localStorage.getItem(this.config.userKey);
        
        if (token && user) {
            try {
                const userData = JSON.parse(user);
                
                // Usar el nuevo método validateToken() para validación robusta con manejo de promesas
                this.validateTokenWithRetry(token)
                    .then(async isValid => {
                        if (isValid) {
                            this.state.token = token;
                            this.state.user = userData;
                            this.state.isAuthenticated = true;
                            
                            // Almacenar en caché para futuras visitas
                            await this.cacheUserSession(userData, token);
                            await this.cacheTokenValidation(token, true, userData.id);
                            
                            this.updateUI();
                            this.startTokenRefresh();
                            
                            this.log('Sesión restaurada correctamente con validación robusta');
                        } else {
                            // Limpiar sesión silenciosamente sin notificar al usuario
                            this.log('Token inválido durante verificación de sesión existente');
                            this.logout(true);
                        }
                    })
                    .catch(error => {
                        this.log('Error en validación de token durante verificación de sesión:', error);
                        
                        // Usar AsyncErrorHandler si está disponible
                        if (typeof window !== 'undefined' && window.AsyncErrorHandler) {
                            const errorInfo = window.AsyncErrorHandler.classifyError(error);
                            window.AsyncErrorHandler.logError(errorInfo);
                            
                            // Intentar recuperación automática
                            const recovery = window.AsyncErrorHandler.attemptRecovery(errorInfo);
                            if (recovery.handled) {
                                this.log('Recuperación automática exitosa en validación de token');
                                return;
                            }
                        }
                        
                        this.logout(true);
                    });
            } catch (error) {
                this.log('Error al verificar sesión existente:', error);
                this.logout(true);
            }
        }
    },
    
    // Inicializar eventos del formulario de autenticación
    initAuthEvents: function() {
        const authForm = document.getElementById('auth-form');
        const toggleAuth = document.getElementById('toggle-auth');
        
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuthSubmit();
            });
        }
        
        if (toggleAuth) {
            toggleAuth.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthMode();
            });
        }
    },
    
    // Inicializar eventos de la UI
    initUIEvents: function() {
        // Botones de login/register
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.showAuthModal('login');
            });
        }
        
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                this.showAuthModal('register');
            });
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
        
        // Cerrar modal
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.addEventListener('hidden.bs.modal', () => {
                this.resetAuthForm();
            });
        }
    },
    
    // Manejar envío del formulario de autenticación
    handleAuthSubmit: function() {
        const authModalTitle = document.getElementById('authModalTitle');
        const isLogin = authModalTitle ? authModalTitle.textContent === 'Iniciar Sesión' : true;
        const formData = this.getFormData();
        
        // Validar formulario
        if (!this.validateForm(formData, isLogin)) {
            return;
        }
        
        // Verificar bloqueo por intentos fallidos
        if (this.isLockedOut()) {
            Justice2.utils.showNotification('Demasiados intentos fallidos. Espere 15 minutos.', 'error');
            return;
        }
        
        // Deshabilitar botón y mostrar loading
        const submitBtn = document.getElementById('auth-submit');
        const originalText = submitBtn ? submitBtn.textContent : '';
        
        if (submitBtn) {
            submitBtn.disabled = true;
            XSSProtection.setInnerHTMLSafe(submitBtn, '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...');
        }
        
        // Realizar solicitud de autenticación con manejo robusto de promesas
        const endpoint = isLogin ? this.config.apiEndpoints.login : this.config.apiEndpoints.register;
        
        this.makeAuthRequestWithRetry(endpoint, formData)
            .then(response => {
                if (response.success) {
                    this.handleAuthSuccess(response.data, isLogin);
                } else {
                    this.handleAuthError(response.message, isLogin);
                }
            })
            .catch(error => {
                // Usar AsyncErrorHandler si está disponible
                if (typeof window !== 'undefined' && window.AsyncErrorHandler) {
                    const errorInfo = window.AsyncErrorHandler.classifyError(error);
                    window.AsyncErrorHandler.logError(errorInfo);
                    
                    // Intentar recuperación automática
                    const recovery = window.AsyncErrorHandler.attemptRecovery(errorInfo);
                    if (recovery.handled) {
                        this.handleAuthSuccess(recovery.result, isLogin);
                        return;
                    }
                }
                
                this.handleAuthError('Error de conexión. Intente nuevamente.', isLogin);
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            });
    },
    
    // Obtener datos del formulario
    getFormData: function() {
        const emailElement = document.getElementById('email');
        const passwordElement = document.getElementById('password');
        const nameElement = document.getElementById('name');
        const confirmPasswordElement = document.getElementById('confirm-password');
        
        return {
            email: emailElement ? emailElement.value : '',
            password: passwordElement ? passwordElement.value : '',
            name: nameElement ? nameElement.value : '',
            confirmPassword: confirmPasswordElement ? confirmPasswordElement.value : ''
        };
    },
    
    // Validar formulario
    validateForm: function(data, isLogin) {
        // Validar y sanitizar email
        const emailValidation = XSSProtection.validateInput(data.email, {
            type: 'email',
            maxLength: 255,
            allowEmpty: false
        });
        
        // Usar AND lógico: ambas condiciones deben ser verdaderas
        if (!emailValidation.valid) {
            Justice2.utils.showNotification('Email inválido: ' + (emailValidation.error || 'formato incorrecto'), 'error');
            return false;
        }
        
        // Validación adicional con regex robusto
        const robustEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!robustEmailRegex.test(emailValidation.sanitized)) {
            Justice2.utils.showNotification('Email inválido: formato incorrecto', 'error');
            return false;
        }
        
        // Validar y sanitizar contraseña
        const passwordValidation = XSSProtection.validateInput(data.password, {
            type: 'password',
            maxLength: 128,
            allowEmpty: false
        });
        
        // Usar AND lógico: ambas condiciones deben ser verdaderas
        if (!passwordValidation.valid) {
            Justice2.utils.showNotification('Contraseña inválida: ' + (passwordValidation.error || 'formato incorrecto'), 'error');
            return false;
        }
        
        if (passwordValidation.sanitized.length < 8) {
            Justice2.utils.showNotification('La contraseña debe tener al menos 8 caracteres', 'error');
            return false;
        }
        
        // Validar fortaleza de contraseña
        const hasUppercase = /[A-Z]/.test(passwordValidation.sanitized);
        const hasLowercase = /[a-z]/.test(passwordValidation.sanitized);
        const hasNumbers = /\d/.test(passwordValidation.sanitized);
        const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(passwordValidation.sanitized);
        
        if (!hasUppercase || !hasLowercase || !hasNumbers) {
            Justice2.utils.showNotification('La contraseña debe incluir mayúsculas, minúsculas y números', 'error');
            return false;
        }
        
        // Validaciones específicas para registro
        if (!isLogin) {
            // Validar y sanitizar nombre
            const nameValidation = XSSProtection.validateInput(data.name, {
                type: 'text',
                maxLength: 100,
                allowEmpty: false
            });
            
            // Usar AND lógico: ambas condiciones deben ser verdaderas
            if (!nameValidation.valid) {
                Justice2.utils.showNotification('Nombre inválido: ' + (nameValidation.error || 'formato incorrecto'), 'error');
                return false;
            }
            
            if (nameValidation.sanitized.trim().length < 2) {
                Justice2.utils.showNotification('El nombre debe tener al menos 2 caracteres', 'error');
                return false;
            }
            
            // Validar que el nombre solo contenga caracteres válidos
            const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/;
            if (!nameRegex.test(nameValidation.sanitized)) {
                Justice2.utils.showNotification('El nombre solo puede contener letras, espacios, apóstrofes y guiones', 'error');
                return false;
            }
           
            // Validar y sanitizar confirmación de contraseña
            const confirmPasswordValidation = XSSProtection.validateInput(data.confirmPassword, {
                type: 'password',
                maxLength: 128,
                allowEmpty: false
            });
            
            if (!confirmPasswordValidation.valid) {
                Justice2.utils.showNotification('Confirmación de contraseña inválida: ' + (confirmPasswordValidation.error || 'formato incorrecto'), 'error');
                return false;
            }
            
            // Comparación segura de contraseñas
            if (passwordValidation.sanitized !== confirmPasswordValidation.sanitized) {
                Justice2.utils.showNotification('Las contraseñas no coinciden', 'error');
                return false;
            }
        }
        
        // Actualizar datos con valores sanitizados
        data.email = emailValidation.sanitized;
        data.password = passwordValidation.sanitized;
        if (!isLogin) {
            data.name = XSSProtection.validateInput(data.name, {
                type: 'text',
                maxLength: 100,
                allowEmpty: false
            }).sanitized;
            data.confirmPassword = XSSProtection.validateInput(data.confirmPassword, {
                type: 'password',
                maxLength: 128,
                allowEmpty: false
            }).sanitized;
        }
        
        return true;
    },
    
    // Realizar solicitud de autenticación con manejo robusto, NetworkErrorHandler y sincronización
    makeAuthRequest: function(endpoint, data) {
        const requestId = `auth-request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Determinar recurso de sincronización para autenticación
        const resource = this.determineAuthSyncResource(endpoint, data);
        
        // Ejecutar con sincronización si está habilitada
        if (this.state.syncInitialized && this.config.syncEnabled) {
            return this.executeWithSync(requestId, async () => {
                // Verificar si NetworkErrorHandler está disponible
                if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
                    return await this.makeAuthRequestWithNetworkHandler(endpoint, data);
                } else {
                    // Fallback al sistema original sin NetworkErrorHandler
                    return await this.makeAuthRequestOriginal(endpoint, data);
                }
            }, {
                resource,
                priority: 1, // Máxima prioridad para autenticación
                timeout: this.config.syncTimeout
            });
        } else {
            // Fallback sin sincronización
            if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
                return this.makeAuthRequestWithNetworkHandler(endpoint, data);
            } else {
                return this.makeAuthRequestOriginal(endpoint, data);
            }
        }
    },
    
    // Determinar recurso de sincronización para autenticación
    determineAuthSyncResource: function(endpoint, data) {
        // Para operaciones de autenticación, usar el endpoint como recurso
        const endpointMap = {
            '/auth/login': 'auth-login',
            '/auth/register': 'auth-register',
            '/auth/refresh': 'auth-refresh',
            '/auth/logout': 'auth-logout',
            '/auth/profile': 'auth-profile'
        };
        
        return endpointMap[endpoint] || `auth-${endpoint.replace('/auth/', '')}`;
    },
    
    // Solicitud de autenticación con NetworkErrorHandler integrado
    makeAuthRequestWithNetworkHandler: function(endpoint, data) {
        return new Promise((resolve, reject) => {
            const requestId = NetworkErrorHandler.generateRequestId();
            const endpointPath = new URL(endpoint, window.location.origin).pathname;
            
            // Crear contexto para el manejador de errores
            const context = {
                url: endpoint,
                method: 'POST',
                endpoint: endpointPath,
                requestId,
                retryCount: 0,
                data,
                type: 'auth'
            };
            
            // Verificar circuit breaker antes de hacer la solicitud
            if (NetworkErrorHandler.isCircuitBreakerOpen(endpointPath)) {
                const error = new Error('Circuit breaker abierto - servicio de autenticación temporalmente no disponible');
                error.circuitBreakerOpen = true;
                error.endpoint = endpointPath;
                error.auth = true;
                reject(error);
                return;
            }
            
            // Verificar conexión
            if (!NetworkErrorHandler.state.isOnline) {
                const error = new Error('Sin conexión a internet');
                error.offline = true;
                error.auth = true;
                reject(error);
                return;
            }
            
            // Validar y sanitizar el endpoint
            const endpointValidation = XSSProtection.validateInput(endpoint, {
                type: 'url',
                maxLength: 200,
                allowEmpty: false
            });
            
            if (!endpointValidation.valid) {
                const error = new Error('Endpoint no válido');
                error.auth = true;
                NetworkErrorHandler.handleNetworkError(error, { ...context, phase: 'validation' });
                reject(error);
                return;
            }
            
            // Sanitizar datos antes de enviarlos
            const sanitizedData = this.sanitizeAuthData(data);
            
            // Realizar solicitud fetch con manejo de errores de red
            const fetchPromise = fetch(Justice2.config.apiBaseUrl + endpointValidation.sanitized, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sanitizedData)
            });
            
            // Manejar la respuesta con NetworkErrorHandler
            fetchPromise
                .then(async response => {
                    if (response.ok) {
                        const responseData = await response.json();
                        
                        // Actualizar circuit breaker con éxito
                        NetworkErrorHandler.updateCircuitBreaker({
                            type: 'SUCCESS',
                            severity: 'low'
                        }, context);
                        
                        resolve({
                            success: true,
                            data: responseData
                        });
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        
                        // Notificar error de servidor a NetworkErrorHandler
                        const serverError = new Error(`Auth Server Error: ${response.status} ${response.statusText}`);
                        serverError.name = 'AuthServerError';
                        serverError.status = response.status;
                        serverError.statusText = response.statusText;
                        serverError.auth = true;
                        
                        NetworkErrorHandler.handleNetworkError(serverError, {
                            ...context,
                            phase: 'response',
                            status: response.status
                        });
                        
                        resolve({
                            success: false,
                            message: errorData.error || 'Credenciales inválidas'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error de autenticación:', error);
                    
                    // Notificar error de red a NetworkErrorHandler
                    const networkError = new Error('Auth Network Error');
                    networkError.name = 'NetworkError';
                    networkError.originalError = error;
                    networkError.auth = true;
                    
                    NetworkErrorHandler.handleNetworkError(networkError, { ...context, phase: 'network_error' });
                    
                    resolve({
                        success: false,
                        message: 'Error de conexión con el servidor'
                    });
                });
        });
    },
    
    // Solicitud de autenticación original (fallback sin NetworkErrorHandler)
    makeAuthRequestOriginal: function(endpoint, data) {
        return new Promise((resolve, reject) => {
            // Validar y sanitizar el endpoint
            const endpointValidation = XSSProtection.validateInput(endpoint, {
                type: 'url',
                maxLength: 200,
                allowEmpty: false
            });
            
            if (!endpointValidation.valid) {
                reject(new Error('Endpoint no válido'));
                return;
            }
            
            // Sanitizar datos antes de enviarlos
            const sanitizedData = this.sanitizeAuthData(data);
            
            // Usar fetch real en lugar de simulación
            fetch(Justice2.config.apiBaseUrl + endpointValidation.sanitized, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sanitizedData)
            })
            .then(async response => {
                if (response.ok) {
                    const responseData = await response.json();
                    resolve({
                        success: true,
                        data: responseData
                    });
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    resolve({
                        success: false,
                        message: errorData.error || 'Credenciales inválidas'
                    });
                }
            })
            .catch(error => {
                console.error('Error de autenticación:', error);
                // Si hay error de red pero el usuario fue redirigido o la acción completada, podríamos querer silenciarlo
                // Pero lo correcto es manejarlo.
                resolve({
                     success: false,
                     message: 'Error de conexión con el servidor'
                });
            });
        });
    },

    // Realizar solicitud de autenticación con retry, manejo robusto y sincronización
    makeAuthRequestWithRetry: function(endpoint, data) {
        const requestId = `auth-retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const resource = this.determineAuthSyncResource(endpoint, data);
        
        const authRequestFunction = () => this.makeAuthRequest(endpoint, data);
 
        // Ejecutar con sincronización si está habilitada
        if (this.state.syncInitialized && this.config.syncEnabled) {
            return this.executeWithSync(requestId, async () => {
                // Usar PromiseManager si está disponible
                if (typeof window !== 'undefined' && window.PromiseManager) {
                    return await window.PromiseManager.withRetry(authRequestFunction, {
                        maxRetries: 3,
                        retryDelay: 2000,
                        timeout: 30000, // 30 segundos para autenticación
                        priority: 1, // Máxima prioridad para autenticación
                        metadata: {
                            type: 'auth_request',
                            endpoint: endpoint
                        }
                    });
                }
        
                // Usar RetryWrapper con NetworkErrorHandler si está disponible
                if (typeof window !== 'undefined' && window.RetryWrapper) {
                    return await window.RetryWrapper.criticalRetry(authRequestFunction, {
                        maxRetries: 3,
                        baseDelay: 2000,
                        onRetry: (error, attempt, retryId, delay) => {
                            this.log(`Reintentando solicitud de autenticación (intento ${attempt}) en ${delay}ms`);
                            
                            // Notificar a NetworkErrorHandler sobre el reintento si está disponible
                            if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
                                const context = {
                                    url: endpoint,
                                    method: 'POST',
                                    retryCount: attempt,
                                    data,
                                    type: 'auth'
                                };
                                
                                const errorInfo = window.NetworkErrorHandler.handleNetworkError(error, context);
                                if (errorInfo.shouldRetry) {
                                    this.log(`NetworkErrorHandler autoriza reintento de autenticación: ${errorInfo.retryDelay}ms`);
                                }
                            }
                        },
                        onSuccess: (result, attempt, retryId) => {
                            this.log(`Solicitud de autenticación exitosa después de ${attempt} intentos`);
                            
                            // Actualizar circuit breaker con éxito si NetworkErrorHandler está disponible
                            if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
                                window.NetworkErrorHandler.updateCircuitBreaker({
                                    type: 'SUCCESS',
                                    severity: 'low'
                                }, {
                                    url: endpoint,
                                    method: 'POST',
                                    type: 'auth'
                                });
                            }
                        },
                        onFailure: (error, attempt, retryId) => {
                            this.log(`Solicitud de autenticación falló después de ${attempt} intentos:`, error);
                            
                            // Notificar error final a NetworkErrorHandler si está disponible
                            if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
                                const context = {
                                    url: endpoint,
                                    method: 'POST',
                                    retryCount: attempt,
                                    data,
                                    type: 'auth',
                                    finalFailure: true
                                };
                                
                                window.NetworkErrorHandler.handleNetworkError(error, context);
                            }
                        }
                    });
                }
        
                // Fallback a la solicitud original
                return await authRequestFunction();
            }, {
                resource,
                priority: 1, // Máxima prioridad para autenticación
                timeout: this.config.syncTimeout
            });
        } else {
            // Fallback sin sincronización
            // Usar PromiseManager si está disponible
            if (typeof window !== 'undefined' && window.PromiseManager) {
                return window.PromiseManager.withRetry(authRequestFunction, {
                    maxRetries: 3,
                    retryDelay: 2000,
                    timeout: 30000, // 30 segundos para autenticación
                    priority: 1, // Máxima prioridad para autenticación
                    metadata: {
                        type: 'auth_request',
                        endpoint: endpoint
                    }
                });
            }
    
            // Usar RetryWrapper con NetworkErrorHandler si está disponible
            if (typeof window !== 'undefined' && window.RetryWrapper) {
                return window.RetryWrapper.criticalRetry(authRequestFunction, {
                    maxRetries: 3,
                    baseDelay: 2000,
                    onRetry: (error, attempt, retryId, delay) => {
                        this.log(`Reintentando solicitud de autenticación (intento ${attempt}) en ${delay}ms`);
                        
                        // Notificar a NetworkErrorHandler sobre el reintento si está disponible
                        if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
                            const context = {
                                url: endpoint,
                                method: 'POST',
                                retryCount: attempt,
                                data,
                                type: 'auth'
                            };
                            
                            const errorInfo = window.NetworkErrorHandler.handleNetworkError(error, context);
                            if (errorInfo.shouldRetry) {
                                this.log(`NetworkErrorHandler autoriza reintento de autenticación: ${errorInfo.retryDelay}ms`);
                            }
                        }
                    },
                    onSuccess: (result, attempt, retryId) => {
                        this.log(`Solicitud de autenticación exitosa después de ${attempt} intentos`);
                        
                        // Actualizar circuit breaker con éxito si NetworkErrorHandler está disponible
                        if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
                            window.NetworkErrorHandler.updateCircuitBreaker({
                                type: 'SUCCESS',
                                severity: 'low'
                            }, {
                                url: endpoint,
                                method: 'POST',
                                type: 'auth'
                            });
                        }
                    },
                    onFailure: (error, attempt, retryId) => {
                        this.log(`Solicitud de autenticación falló después de ${attempt} intentos:`, error);
                        
                        // Notificar error final a NetworkErrorHandler si está disponible
                        if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
                            const context = {
                                url: endpoint,
                                method: 'POST',
                                retryCount: attempt,
                                data,
                                type: 'auth',
                                finalFailure: true
                            };
                            
                            window.NetworkErrorHandler.handleNetworkError(error, context);
                        }
                    }
                });
            }
    
            // Fallback a la solicitud original
            return authRequestFunction();
        }
    },
    
    // Generar token mock para demostración
    generateMockToken: function() {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: 'user123',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
        }));
        const signature = btoa('mock-signature');
        
        return `${header}.${payload}.${signature}`;
    },
    
    // Parsear JWT
    parseJWT: function(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            const payload = JSON.parse(atob(parts[1]));
            return payload;
        } catch (error) {
            return null;
        }
    },
    
    // Manejar éxito en autenticación
    handleAuthSuccess: async function(data, isLogin) {
        // Validar y sanitizar token
        const tokenValidation = XSSProtection.validateInput(data.token, {
            type: 'text',
            maxLength: 1000,
            allowEmpty: false
        });
        
        if (!tokenValidation.valid) {
            Justice2.utils.showNotification('Error de seguridad: Token no válido', 'error');
            return;
        }
        
        // Validar y sanitizar datos del usuario
        const sanitizedUser = this.sanitizeUserData(data.user);
        
        // Guardar token y usuario
        localStorage.setItem(this.config.tokenKey, tokenValidation.sanitized);
        localStorage.setItem(this.config.userKey, JSON.stringify(sanitizedUser));
        
        // Actualizar estado
        this.state.token = tokenValidation.sanitized;
        this.state.user = sanitizedUser;
        this.state.isAuthenticated = true;
        this.state.loginAttempts = 0;
        
        // Almacenar en caché para recuperación rápida
        await this.cacheUserSession(sanitizedUser, tokenValidation.sanitized);
        await this.cacheTokenValidation(tokenValidation.sanitized, true, sanitizedUser.id);
        await this.cacheUserProfile(sanitizedUser.id, sanitizedUser);
        
        // Registrar intento exitoso
        await this.cacheAuthAttempt(sanitizedUser.email, true);
        
        // Actualizar UI
        this.updateUI();
        
        // Cerrar modal
        const modalElement = document.getElementById('authModal');
        if (modalElement) {
            // Intentar usar la API de Bootstrap si está disponible
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                } else {
                    // Si no hay instancia, intentar crear una nueva y ocultarla
                    // O usar jQuery fallback si Bootstrap nativo falla
                    try {
                        const newModal = new bootstrap.Modal(modalElement);
                        newModal.hide();
                    } catch (e) {
                         // Fallback a jQuery si está disponible
                         if (typeof $ !== 'undefined' && $(modalElement).modal) {
                             $(modalElement).modal('hide');
                         }
                    }
                }
            } else if (typeof $ !== 'undefined' && $(modalElement).modal) {
                // Fallback a jQuery
                $(modalElement).modal('hide');
            } else {
                // Fallback manual (no recomendado pero funcional)
                modalElement.classList.remove('show');
                modalElement.style.display = 'none';
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) backdrop.remove();
            }
        }
        
        // Mostrar notificación
        const message = isLogin ? 'Sesión iniciada correctamente' : 'Registro exitoso';
        Justice2.utils.showNotification(message, 'success');
        
        // Iniciar refresh de token
        this.startTokenRefresh();
        
        // Guardar estado en Justice2
        Justice2.state.user = data.user;
        Justice2.state.isAuthenticated = true;
        Justice2.saveState();
        
        this.log('Autenticación exitosa:', data.user);
    },
    
    // Manejar error en autenticación
    handleAuthError: async function(message, isLogin) {
        this.state.loginAttempts++;
        
        // Registrar intento fallido
        const formData = this.getFormData();
        await this.cacheAuthAttempt(formData.email, false);
        
        Justice2.utils.showNotification(message, 'error');
        
        // Si es login y hay muchos intentos, verificar bloqueo
        if (isLogin && this.state.loginAttempts >= this.config.maxLoginAttempts) {
            this.lockoutLogin();
        }
    },
    
    // Bloquear login por intentos fallidos
    lockoutLogin: function() {
        const lockoutEnd = Date.now() + this.config.lockoutTime;
        localStorage.setItem('justice2_lockout', lockoutEnd.toString());
        
        Justice2.utils.showNotification('Demasiados intentos fallidos. Espere 15 minutos.', 'error');
    },
    
    // Verificar si está bloqueado
    isLockedOut: function() {
        const lockoutEnd = localStorage.getItem('justice2_lockout');
        if (!lockoutEnd) return false;
        
        if (Date.now() < parseInt(lockoutEnd)) {
            return true;
        } else {
            localStorage.removeItem('justice2_lockout');
            return false;
        }
    },
    
    // Cerrar sesión
    logout: async function(showNotification = true) {
        // Limpiar estado
        this.state.token = null;
        this.state.user = null;
        this.state.isAuthenticated = false;
        
        // Limpiar localStorage
        localStorage.removeItem(this.config.tokenKey);
        localStorage.removeItem(this.config.userKey);
        
        // Limpiar caché de autenticación
        await this.clearAuthCache();
        
        // Detener refresh de token
        if (this.state.refreshTimer) {
            clearInterval(this.state.refreshTimer);
            this.state.refreshTimer = null;
        }
        
        // Actualizar UI
        this.updateUI();
        
        // Actualizar estado en Justice2
        Justice2.state.user = null;
        Justice2.state.isAuthenticated = false;
        Justice2.saveState();
        
        if (showNotification) {
            Justice2.utils.showNotification('Sesión cerrada correctamente', 'info');
        }
        
        this.log('Sesión cerrada');
    },
    
    // Actualizar UI según estado de autenticación
    updateUI: function() {
        const userInfo = document.getElementById('user-info');
        const loginButtons = document.getElementById('login-buttons');
        const userName = document.getElementById('user-name');
        
        if (this.state.isAuthenticated && this.state.user) {
            // Mostrar información del usuario
            if (userInfo) {
                userInfo.classList.remove('d-none');
            }
            if (loginButtons) {
                loginButtons.classList.add('d-none');
            }
            if (userName) {
                const nameValidation = XSSProtection.validateInput(this.state.user.name, {
                    type: 'text',
                    maxLength: 100,
                    allowEmpty: true
                });
                XSSProtection.setElementTextSafe(userName, nameValidation.valid ? nameValidation.sanitized : '');
            }
        } else {
            // Mostrar botones de login
            if (userInfo) {
                userInfo.classList.add('d-none');
            }
            if (loginButtons) {
                loginButtons.classList.remove('d-none');
            }
        }
    },
    
    // Mostrar modal de autenticación
    showAuthModal: function(mode = 'login') {
        const modal = document.getElementById('authModal');
        const title = document.getElementById('authModalTitle');
        const submitBtn = document.getElementById('auth-submit');
        const toggleAuth = document.getElementById('toggle-auth');
        const registerFields = document.getElementById('register-fields');
        
        if (modal && title && submitBtn && toggleAuth) {
            if (mode === 'login') {
                XSSProtection.setElementTextSafe(title, 'Iniciar Sesión');
                XSSProtection.setElementTextSafe(submitBtn, 'Iniciar Sesión');
                XSSProtection.setElementTextSafe(toggleAuth, '¿No tienes cuenta? Regístrate');
                registerFields.classList.add('d-none');
            } else {
                XSSProtection.setElementTextSafe(title, 'Registrarse');
                XSSProtection.setElementTextSafe(submitBtn, 'Registrarse');
                XSSProtection.setElementTextSafe(toggleAuth, '¿Ya tienes cuenta? Inicia Sesión');
                registerFields.classList.remove('d-none');
            }
           
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }
    },
    
    // Alternar modo de autenticación
    toggleAuthMode: function() {
        const title = document.getElementById('authModalTitle');
        const submitBtn = document.getElementById('auth-submit');
        const toggleAuth = document.getElementById('toggle-auth');
        const registerFields = document.getElementById('register-fields');
        
        const currentTitle = title ? title.textContent : '';
        
        if (currentTitle === 'Iniciar Sesión') {
            XSSProtection.setElementTextSafe(title, 'Registrarse');
            XSSProtection.setElementTextSafe(submitBtn, 'Registrarse');
            XSSProtection.setElementTextSafe(toggleAuth, '¿Ya tienes cuenta? Inicia Sesión');
            registerFields.classList.remove('d-none');
        } else {
            XSSProtection.setElementTextSafe(title, 'Iniciar Sesión');
            XSSProtection.setElementTextSafe(submitBtn, 'Iniciar Sesión');
            XSSProtection.setElementTextSafe(toggleAuth, '¿No tienes cuenta? Regístrate');
            registerFields.classList.add('d-none');
        }
    },
    
    // Resetear formulario de autenticación
    resetAuthForm: function() {
        const form = document.getElementById('auth-form');
        if (form) {
            form.reset();
        }
        
        const registerFields = document.getElementById('register-fields');
        const title = document.getElementById('authModalTitle');
        const submitBtn = document.getElementById('auth-submit');
        const toggleAuth = document.getElementById('toggle-auth');
        
        if (registerFields) {
            registerFields.classList.add('d-none');
        }
        if (title) {
            XSSProtection.setElementTextSafe(title, 'Iniciar Sesión');
        }
        if (submitBtn) {
            XSSProtection.setElementTextSafe(submitBtn, 'Iniciar Sesión');
        }
        if (toggleAuth) {
            XSSProtection.setElementTextSafe(toggleAuth, '¿No tienes cuenta? Regístrate');
        }
    },
    
    // Configurar refresh automático de token
    setupTokenRefresh: function() {
        // Verificar cada 5 minutos si el token necesita refresh
        // Usar PromiseManager para el intervalo de validación
        const validationFunction = async () => {
            if (this.state.isAuthenticated && this.state.token) {
                try {
                    // Usar validateToken() en lugar de parseJWT() para validación robusta
                    const isValid = await this.validateTokenWithTimeout(this.state.token, 10000); // 10 segundos timeout
                    
                    if (isValid) {
                        // Si el token es válido, verificar si necesita refresh
                        const tokenData = this.parseJWT(this.state.token);
                        if (tokenData) {
                            const timeToExpiry = (tokenData.exp * 1000) - Date.now();
                                 
                            if (timeToExpiry <= this.config.refreshThreshold) {
                                await this.refreshTokenWithRetry();
                            }
                        }
                    } else {
                        // Token inválido, cerrar sesión
                        this.log('Token inválido durante verificación de refresh automático');
                        this.logout();
                    }
                } catch (error) {
                    this.log('Error en validación de token durante refresh automático:', error);
                    
                    // Usar AsyncErrorHandler si está disponible
                    if (typeof window !== 'undefined' && window.AsyncErrorHandler) {
                        const errorInfo = window.AsyncErrorHandler.classifyError(error);
                        window.AsyncErrorHandler.logError(errorInfo);
                        
                        // Intentar recuperación automática
                        const recovery = window.AsyncErrorHandler.attemptRecovery(errorInfo);
                        if (recovery.handled) {
                            this.log('Recuperación automática exitosa en refresh automático');
                            return;
                        }
                    }
                    
                    this.logout();
                }
            }
        };

        // Usar setInterval con PromiseManager si está disponible
        if (typeof window !== 'undefined' && window.PromiseManager) {
            // Ejecutar inmediatamente y luego cada 5 minutos
            validationFunction();
            setInterval(validationFunction, 5 * 60 * 1000);
        } else {
            // Fallback al setInterval original
            setInterval(validationFunction, 5 * 60 * 1000);
        }
    },
    
    // Iniciar refresh de token
    startTokenRefresh: function() {
        if (this.state.refreshTimer) {
            clearInterval(this.state.refreshTimer);
        }
        
        this.state.refreshTimer = setInterval(() => {
            this.refreshToken();
        }, this.config.tokenExpiry - this.config.refreshThreshold);
    },
    
    // Refrescar token con manejo robusto
    refreshToken: function() {
        return this.refreshTokenWithRetry();
    },

    // Refrescar token con retry y manejo robusto
    refreshTokenWithRetry: function() {
        if (!this.state.token) return Promise.reject(new Error('No hay token para refrescar'));
        
        const refreshFunction = () => this.makeAuthRequest(this.config.apiEndpoints.refresh, {
            token: this.state.token
        });

        // Usar PromiseManager si está disponible
        if (typeof window !== 'undefined' && window.PromiseManager) {
            return window.PromiseManager.withRetry(refreshFunction, {
                maxRetries: 5, // Más reintentos para refresh crítico
                retryDelay: 1000,
                timeout: 15000, // 15 segundos para refresh
                priority: 1, // Máxima prioridad para refresh
                metadata: {
                    type: 'token_refresh',
                    userId: this.state.user?.id
                }
            })
            .then(response => {
                if (response.success) {
                    localStorage.setItem(this.config.tokenKey, response.data.token);
                    this.state.token = response.data.token;
                    this.log('Token refrescado correctamente');
                } else {
                    this.log('Error al refrescar token:', response.message);
                    this.logout();
                }
            })
            .catch(error => {
                this.log('Error de conexión al refrescar token:', error);
                
                // Usar AsyncErrorHandler si está disponible
                if (typeof window !== 'undefined' && window.AsyncErrorHandler) {
                    const errorInfo = window.AsyncErrorHandler.classifyError(error);
                    window.AsyncErrorHandler.logError(errorInfo);
                    
                    // Intentar recuperación automática
                    const recovery = window.AsyncErrorHandler.attemptRecovery(errorInfo);
                    if (recovery.handled) {
                        this.log('Recuperación automática exitosa en refresh de token');
                        return recovery.result;
                    }
                }
                
                this.logout();
                throw error;
            });
        }

        // Fallback al método original
        return refreshFunction()
            .then(response => {
                if (response.success) {
                    localStorage.setItem(this.config.tokenKey, response.data.token);
                    this.state.token = response.data.token;
                    this.log('Token refrescado correctamente');
                } else {
                    this.log('Error al refrescar token:', response.message);
                    this.logout();
                }
            })
            .catch(error => {
                this.log('Error de conexión al refrescar token:', error);
                this.logout();
                throw error;
            });
    },
    
    // Verificar si el usuario está autenticado
    isAuthenticated: function() {
        return this.state.isAuthenticated && this.state.token;
    },
    
    // Obtener usuario actual
    getCurrentUser: function() {
        return this.state.user;
    },
    
    // Obtener token actual
    getToken: function() {
        return this.state.token;
    },
    
    // Validar token JWT con manejo robusto - MÉTODO CRÍTICO IMPLEMENTADO
    validateToken: function(token = null) {
        return this.validateTokenWithTimeout(token, 10000); // 10 segundos timeout por defecto
    },

    // Validar token con retry y manejo robusto
    validateTokenWithRetry: async function(token = null) {
        const tokenToValidate = token || this.state.token;
        
        if (!tokenToValidate) {
            return false;
        }
        
        // Primero verificar en caché
        const cachedValidation = await this.getCachedTokenValidation(tokenToValidate);
        if (cachedValidation !== null) {
            this.log('Token validado desde caché');
            return cachedValidation.isValid;
        }
        
        const validationFunction = async () => {
            const isValid = await this.validateTokenInternal(tokenToValidate);
            
            // Almacenar resultado en caché
            await this.cacheTokenValidation(tokenToValidate, isValid, this.state.user?.id);
            
            return isValid;
        };

        // Usar PromiseManager si está disponible
        if (typeof window !== 'undefined' && window.PromiseManager) {
            return window.PromiseManager.withRetry(validationFunction, {
                maxRetries: 2,
                retryDelay: 500,
                timeout: 10000,
                priority: 2, // Alta prioridad para validación
                metadata: {
                    type: 'token_validation',
                    userId: this.state.user?.id
                }
            });
        }

        // Fallback a la validación original
        return validationFunction();
    },

    // Validar token con timeout
    validateTokenWithTimeout: function(token = null, timeout = 10000) {
        if (typeof window !== 'undefined' && window.PromiseManager) {
            return window.PromiseManager.withTimeout(this.validateTokenInternal(token), timeout);
        }

        // Fallback simple con Promise.race
        return Promise.race([
            this.validateTokenInternal(token),
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout en validación de token')), timeout);
            })
        ]);
    },

    // Validación interna del token
    validateTokenInternal: function(token = null) {
        return new Promise((resolve, reject) => {
            try {
                // Usar token del estado si no se proporciona uno
                const tokenToValidate = token || this.state.token;
                
                // Verificar que exista un token
                if (!tokenToValidate) {
                    this.logSecurityEvent('VALIDATE_TOKEN_NO_TOKEN', 'No se proporcionó token para validar');
                    resolve(false);
                    return;
                }
                
                // Validar formato básico del token (debe tener 3 partes separadas por .)
                const parts = tokenToValidate.split('.');
                if (parts.length !== 3) {
                    this.logSecurityEvent('VALIDATE_TOKEN_INVALID_FORMAT', 'Token con formato inválido');
                    resolve(false);
                    return;
                }
                
                // Intentar parsear el payload
                let payload;
                try {
                    payload = JSON.parse(atob(parts[1]));
                } catch (error) {
                    this.logSecurityEvent('VALIDATE_TOKEN_PAYLOAD_ERROR', 'Error al parsear payload del token');
                    resolve(false);
                    return;
                }
                
                // Validar estructura mínima del payload
                if (!payload.sub || !payload.iat || !payload.exp) {
                    this.logSecurityEvent('VALIDATE_TOKEN_INVALID_STRUCTURE', 'Token con estructura inválida');
                    resolve(false);
                    return;
                }
                
                // Verificar expiración del token
                const currentTime = Math.floor(Date.now() / 1000);
                if (payload.exp < currentTime) {
                    this.logSecurityEvent('VALIDATE_TOKEN_EXPIRED', `Token expirado. Exp: ${payload.exp}, Current: ${currentTime}`);
                    resolve(false);
                    return;
                }
                
                // Verificar que el token no fue emitido en el futuro
                if (payload.iat > currentTime) {
                    this.logSecurityEvent('VALIDATE_TOKEN_FUTURE_ISSUED', `Token emitido en el futuro. IAT: ${payload.iat}, Current: ${currentTime}`);
                    resolve(false);
                    return;
                }
                
                // Validar tiempo de emisión razonable (no más de 24 horas en el pasado)
                const maxAge = 24 * 60 * 60; // 24 horas en segundos
                if (currentTime - payload.iat > maxAge) {
                    this.logSecurityEvent('VALIDATE_TOKEN_TOO_OLD', `Token demasiado antiguo. IAT: ${payload.iat}, Current: ${currentTime}`);
                    resolve(false);
                    return;
                }
                
                // Si el token es para un usuario específico, verificar que coincida con el usuario actual
                if (this.state.user && payload.sub !== this.state.user.id.toString()) {
                    this.logSecurityEvent('VALIDATE_TOKEN_USER_MISMATCH', `Token no corresponde al usuario actual. Token sub: ${payload.sub}, User ID: ${this.state.user.id}`);
                    resolve(false);
                    return;
                }
                
                // Validaciones adicionales de seguridad
                this.performAdditionalTokenValidations(payload)
                    .then(additionalValid => {
                        if (additionalValid) {
                            this.logSecurityEvent('VALIDATE_TOKEN_SUCCESS', 'Token validado correctamente');
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    })
                    .catch(error => {
                        this.logSecurityEvent('VALIDATE_TOKEN_ADDITIONAL_ERROR', `Error en validaciones adicionales: ${error.message}`);
                        resolve(false);
                    });
                    
            } catch (error) {
                this.logSecurityEvent('VALIDATE_TOKEN_CRITICAL_ERROR', `Error crítico en validación: ${error.message}`);
                resolve(false);
            }
        });
    },
    
    // Validaciones adicionales de seguridad para el token
    performAdditionalTokenValidations: function(payload) {
        return new Promise((resolve, reject) => {
            try {
                // Rate limiting para validaciones
                if (!this.checkTokenValidationRateLimit()) {
                    this.logSecurityEvent('TOKEN_VALIDATION_RATE_LIMIT', 'Límite de validaciones de token excedido');
                    reject(new Error('Rate limit excedido'));
                    return;
                }
                
                // Verificar que el token no esté en una lista de revocación (localStorage para demo)
                const revokedTokens = JSON.parse(localStorage.getItem('justice2_revoked_tokens') || '[]');
                if (revokedTokens.includes(payload.jti)) {
                    this.logSecurityEvent('TOKEN_REVOKED', `Token revocado. JTI: ${payload.jti}`);
                    resolve(false);
                    return;
                }
                
                // Validar campos adicionales si existen
                if (payload.iss && !this.validateIssuer(payload.iss)) {
                    this.logSecurityEvent('TOKEN_INVALID_ISSUER', `Issuer inválido: ${payload.iss}`);
                    resolve(false);
                    return;
                }
                
                if (payload.aud && !this.validateAudience(payload.aud)) {
                    this.logSecurityEvent('TOKEN_INVALID_AUDIENCE', `Audience inválido: ${payload.aud}`);
                    resolve(false);
                    return;
                }
                
                // Verificar que no haya manipulación en campos críticos
                if (payload.admin === true && !this.validateAdminClaim(payload)) {
                    this.logSecurityEvent('TOKEN_ADMIN_CLAIM_INVALID', 'Claim de administrador inválido');
                    resolve(false);
                    return;
                }
                
                resolve(true);
                
            } catch (error) {
                reject(error);
            }
        });
    },
    
    // Verificar rate limiting para validaciones de token
    checkTokenValidationRateLimit: function() {
        const maxValidationsPerMinute = 30;
        const now = Date.now();
        const windowStart = now - 60000; // 1 minuto
        
        // Obtener validaciones anteriores
        const validations = JSON.parse(localStorage.getItem('justice2_token_validations') || '[]');
        
        // Filtrar validaciones dentro de la ventana de tiempo
        const recentValidations = validations.filter(timestamp => timestamp > windowStart);
        
        // Verificar límite
        if (recentValidations.length >= maxValidationsPerMinute) {
            return false;
        }
        
        // Agregar validación actual
        recentValidations.push(now);
        localStorage.setItem('justice2_token_validations', JSON.stringify(recentValidations));
        
        return true;
    },
    
    // Validar issuer del token usando configuración segura
    validateIssuer: function(issuer) {
        // Usar el sistema de configuración seguro si está disponible
        if (typeof EnvConfig !== 'undefined' && EnvConfig.getValidJwtIssuers) {
            const validIssuers = EnvConfig.getValidJwtIssuers();
            return validIssuers.includes(issuer);
        }
        
        // Fallback seguro con valores por defecto
        console.warn('EnvConfig no disponible, usando fallback para validación de issuer');
        const fallbackIssuers = [
            'justice2-system',
            'http://localhost:8000'
        ];
        return fallbackIssuers.includes(issuer);
    },
    
    // Validar audience del token
    validateAudience: function(audience) {
        const validAudiences = [
            'justice2-frontend',
            'justice2-web',
            'justice2-app'
        ];
        
        // audience puede ser string o array
        if (typeof audience === 'string') {
            return validAudiences.includes(audience);
        } else if (Array.isArray(audience)) {
            return audience.some(aud => validAudiences.includes(aud));
        }
        
        return false;
    },
    
    // Validar claim de administrador
    validateAdminClaim: function(payload) {
        // Validación adicional para claims de administrador
        // En una implementación real, esto podría verificar contra una base de datos
        return payload.sub && payload.iat && payload.exp;
    },
    
    // Logging de eventos de seguridad
    logSecurityEvent: function(eventType, details) {
        // Validar y sanitizar el tipo de evento
        const eventTypeValidation = XSSProtection.validateInput(eventType, {
            type: 'text',
            maxLength: 100,
            allowEmpty: false
        });
        
        // Validar y sanitizar los detalles
        const detailsValidation = XSSProtection.validateInput(details, {
            type: 'text',
            maxLength: 500,
            allowEmpty: true
        });
        
        const securityEvent = {
            type: eventTypeValidation.valid ? eventTypeValidation.sanitized : 'UNKNOWN',
            details: detailsValidation.valid ? detailsValidation.sanitized : '',
            timestamp: new Date().toISOString(),
            userId: this.state.user ? this.state.user.id : null,
            userAgent: XSSProtection.escapeHtml(navigator.userAgent),
            ip: 'client-side' // En cliente no podemos obtener IP real
        };
        
        // En desarrollo, mostrar en consola
        if (Justice2.config.debug()) {
            console.warn('[Justice2Auth Security Event]', securityEvent);
        }
        
        // Guardar en localStorage para auditoría local
        const securityLog = JSON.parse(localStorage.getItem('justice2_security_log') || '[]');
        securityLog.push(securityEvent);
        
        // Mantener solo los últimos 100 eventos para no sobrecargar localStorage
        if (securityLog.length > 100) {
            securityLog.splice(0, securityLog.length - 100);
        }
        
        localStorage.setItem('justice2_security_log', JSON.stringify(securityLog));
        
        // En producción, enviar al servidor para auditoría centralizada
        if (Justice2.config.environment.type === 'production') {
            this.sendSecurityEventToServer(securityEvent);
        }
    },
    
    // Enviar evento de seguridad al servidor
    sendSecurityEventToServer: function(securityEvent) {
        // Solo enviar eventos críticos para no sobrecargar el servidor
        const criticalEvents = [
            'VALIDATE_TOKEN_INVALID_FORMAT',
            'VALIDATE_TOKEN_EXPIRED',
            'VALIDATE_TOKEN_USER_MISMATCH',
            'TOKEN_REVOKED',
            'TOKEN_ADMIN_CLAIM_INVALID'
        ];
        
        if (criticalEvents.includes(securityEvent.type)) {
            fetch(Justice2.config.api.baseURL + '/security/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.state.token}`
                },
                body: JSON.stringify(securityEvent)
            }).catch(error => {
                // Silenciar errores de logging de seguridad para no afectar la UX
                if (Justice2.config.debug()) {
                    console.warn('Error al enviar evento de seguridad:', error);
                }
            });
        }
    },
    
    // Sanitizar datos de autenticación
    sanitizeAuthData: function(data) {
        if (!data || typeof data !== 'object') {
            return {};
        }
        
        const sanitized = {};
        
        // Sanitizar email
        if (data.email) {
            const emailValidation = XSSProtection.validateInput(data.email, {
                type: 'email',
                maxLength: 255,
                allowEmpty: false
            });
            sanitized.email = emailValidation.valid ? emailValidation.sanitized : '';
        }
        
        // Sanitizar contraseña (sin escape para mantener caracteres válidos)
        if (data.password) {
            const passwordValidation = XSSProtection.validateInput(data.password, {
                type: 'password',
                maxLength: 128,
                allowEmpty: false
            });
            sanitized.password = passwordValidation.valid ? passwordValidation.sanitized : '';
        }
        
        // Sanitizar nombre
        if (data.name) {
            const nameValidation = XSSProtection.validateInput(data.name, {
                type: 'text',
                maxLength: 100,
                allowEmpty: true
            });
            sanitized.name = nameValidation.valid ? nameValidation.sanitized : '';
        }
        
        // Sanitizar confirmación de contraseña
        if (data.confirmPassword) {
            const confirmPasswordValidation = XSSProtection.validateInput(data.confirmPassword, {
                type: 'password',
                maxLength: 128,
                allowEmpty: true
            });
            sanitized.confirmPassword = confirmPasswordValidation.valid ? confirmPasswordValidation.sanitized : '';
        }
        
        // Sanitizar token
        if (data.token) {
            const tokenValidation = XSSProtection.validateInput(data.token, {
                type: 'text',
                maxLength: 1000,
                allowEmpty: true
            });
            sanitized.token = tokenValidation.valid ? tokenValidation.sanitized : '';
        }
        
        return sanitized;
    },
    
    // Sanitizar datos de usuario
    sanitizeUserData: function(user) {
        if (!user || typeof user !== 'object') {
            return {};
        }
        
        const sanitized = {};
        
        // Sanitizar campos de texto
        ['id', 'name', 'email', 'role', 'avatar', 'phone'].forEach(field => {
            if (user[field]) {
                const validation = XSSProtection.validateInput(user[field], {
                    type: 'text',
                    maxLength: field === 'id' ? 50 : 255,
                    allowEmpty: true
                });
                sanitized[field] = validation.valid ? validation.sanitized : '';
            }
        });
        
        // Copiar campos seguros sin sanitización
        ['created_at', 'updated_at', 'last_login', 'is_active'].forEach(field => {
            if (user[field] !== undefined) {
                sanitized[field] = user[field];
            }
        });
        
        return sanitized;
    },
    
    // Logging
    log: function(...args) {
        Justice2?.log('[Justice2Auth]', ...args);
    },
    
    // Método para obtener estadísticas de caché de autenticación
    getAuthCacheStatistics: function() {
        if (!this.state.authCache) return null;
        
        try {
            const metrics = this.state.authCache.getMetrics();
            const health = this.state.authCache.getHealth();
            
            return {
                metrics,
                health,
                strategies: this.state.authCache.getStrategies(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.log('Error obteniendo estadísticas de caché de autenticación:', error);
            return null;
        }
    },
    
    // Método para limpiar caché específica
    clearSpecificAuthCache: async function(strategy) {
        if (!this.state.authCache) return;
        
        try {
            await this.state.authCache.clear(strategy);
            this.log(`Caché de autenticación limpiada para estrategia: ${strategy}`);
        } catch (error) {
            this.log('Error limpiando caché específica de autenticación:', error);
        }
    },
    
    // Realizar mantenimiento de sincronización de autenticación
    performAuthSyncMaintenance: async function() {
        if (!this.state.syncInitialized) return;
        
        try {
            this.log('Realizando mantenimiento de sincronización de autenticación...');
            
            // Limpiar operaciones expiradas
            const now = Date.now();
            for (const [operationId, operation] of this.state.activeAuthOperations.entries()) {
                if (now - operation.startTime > this.config.syncTimeout * 2) {
                    this.state.activeAuthOperations.delete(operationId);
                    this.log(`Operación de autenticación expirada eliminada: ${operationId}`);
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
            
            this.log('Mantenimiento de sincronización de autenticación completado');
            
        } catch (error) {
            this.log('Error en mantenimiento de sincronización de autenticación:', error);
        }
    },
    
    // Obtener estadísticas de sincronización de autenticación
    getAuthSyncStatistics: function() {
        if (!this.state.syncInitialized) {
            return null;
        }
        
        const stats = {
            operations: {
                total: this.state.activeAuthOperations.size,
                running: Array.from(this.state.activeAuthOperations.values()).filter(op => op.status === 'running').length,
                completed: Array.from(this.state.activeAuthOperations.values()).filter(op => op.status === 'completed').length,
                failed: Array.from(this.state.activeAuthOperations.values()).filter(op => op.status === 'failed').length
            },
            locks: {
                active: this.state.authLocks.size,
                resources: Array.from(this.state.authLocks.keys())
            },
            syncManager: this.state.syncManager ? this.state.syncManager.getMetrics() : null,
            concurrencyController: this.state.concurrencyController ? this.state.concurrencyController.getMetrics() : null,
            syncDiagnostics: this.state.syncDiagnostics ? this.state.syncDiagnostics.getHealth() : null
        };
        
        return stats;
    },
    
    // Limpiar recursos de sincronización de autenticación
    cleanupAuthSync: async function() {
        if (!this.state.syncInitialized) return;
        
        try {
            this.log('Limpiando recursos de sincronización de autenticación...');
            
            // Cancelar operaciones activas
            for (const [operationId, operation] of this.state.activeAuthOperations.entries()) {
                if (operation.status === 'running') {
                    this.log(`Cancelando operación activa de autenticación: ${operationId}`);
                    operation.status = 'cancelled';
                    operation.endTime = Date.now();
                }
            }
            this.state.activeAuthOperations.clear();
            
            // Liberar todos los bloqueos
            for (const [resource, locks] of this.state.authLocks.entries()) {
                for (const lockId of locks) {
                    try {
                        await this.state.syncManager.releaseLock(resource, lockId);
                    } catch (error) {
                        this.log(`Error liberando bloqueo ${lockId} para ${resource}:`, error);
                    }
                }
            }
            this.state.authLocks.clear();
            
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
            
            this.log('Recursos de sincronización de autenticación limpiados');
            
        } catch (error) {
            this.log('Error limpiando recursos de sincronización de autenticación:', error);
        }
    }
};

// Inicializar sistema de autenticación
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Justice2Auth.init();
    });
} else {
    Justice2Auth.init();
}

// Exportar para uso global
window.Justice2Auth = Justice2Auth;

// Exponer métodos de sincronización
window.Justice2Auth.getAuthSyncStatus = Justice2Auth.getAuthSyncStatus;
window.Justice2Auth.getAuthSyncStatistics = Justice2Auth.getAuthSyncStatistics;
window.Justice2Auth.performAuthSyncMaintenance = Justice2Auth.performAuthSyncMaintenance;
window.Justice2Auth.cleanupAuthSync = Justice2Auth.cleanupAuthSync;