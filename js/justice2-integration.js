/**
 * Justice 2 Integration
 * Archivo de integración final que conecta todas las funcionalidades dinámicas
 * Con sistema de sincronización robusto integrado
 */

// Importar sistema de sincronización
import SyncManager from './components/sync-manager.js';
import ConcurrencyController from './components/concurrency-controller.js';

const Justice2Integration = {
    // Estado de la integración
    state: {
        initialized: false,
        componentsLoaded: false,
        databaseConnected: false,
        apiConnected: false,
        authReady: false,
        lastSync: null,
        syncInterval: null,
        cleanupComplete: false
    },
    
    // Sistema de gestión de recursos para prevenir memory leaks
    resourceManager: {
        intervals: new Set(),
        timeouts: new Set(),
        eventListeners: new Map(),
        observers: new Set(),
        
        // Registrar interval para limpieza posterior
        registerInterval: function(intervalId) {
            this.intervals.add(intervalId);
            return intervalId;
        },
        
        // Registrar timeout para limpieza posterior
        registerTimeout: function(timeoutId) {
            this.timeouts.add(timeoutId);
            return timeoutId;
        },
        
        // Registrar event listener para limpieza posterior
        registerEventListener: function(target, event, handler, options = {}) {
            const key = `${target.constructor.name}-${event}`;
            if (!this.eventListeners.has(key)) {
                this.eventListeners.set(key, []);
            }
            this.eventListeners.get(key).push({ target, event, handler, options });
            target.addEventListener(event, handler, options);
        },
        
        // Registrar observer para limpieza posterior
        registerObserver: function(observer) {
            this.observers.add(observer);
            return observer;
        },
        
        // Limpiar todos los recursos
        cleanup: function() {
            console.log('🧹 Limpiando recursos para prevenir memory leaks...');
            
            // Limpiar intervals
            this.intervals.forEach(intervalId => {
                clearInterval(intervalId);
            });
            this.intervals.clear();
            
            // Limpiar timeouts
            this.timeouts.forEach(timeoutId => {
                clearTimeout(timeoutId);
            });
            this.timeouts.clear();
            
            // Limpiar event listeners
            this.eventListeners.forEach((listeners) => {
                listeners.forEach(({ target, event, handler, options }) => {
                    target.removeEventListener(event, handler, options);
                });
            });
            this.eventListeners.clear();
            
            // Limpiar observers
            this.observers.forEach(observer => {
                if (observer && typeof observer.disconnect === 'function') {
                    observer.disconnect();
                } else if (observer && typeof observer.disconnect === 'function') {
                    observer.disconnect();
                }
            });
            this.observers.clear();
            
            console.log('✅ Recursos limpiados exitosamente');
        }
    },
    
    // Sistema de monitoreo de memoria
    memoryMonitor: {
        enabled: true,
        interval: 60000, // 1 minuto
        monitorInterval: null,
        memoryHistory: [],
        maxHistorySize: 100,
        
        start: function() {
            if (!this.enabled || this.monitorInterval) return;
            
            this.monitorInterval = Justice2Integration.resourceManager.registerInterval(
                setInterval(() => this.checkMemory(), this.interval)
            );
            console.log('🔍 Monitoreo de memoria iniciado');
        },
        
        stop: function() {
            if (this.monitorInterval) {
                clearInterval(this.monitorInterval);
                this.monitorInterval = null;
            }
        },
        
        checkMemory: function() {
            if (performance.memory) {
                const memory = {
                    timestamp: Date.now(),
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                };
                
                this.memoryHistory.push(memory);
                
                // Mantener historial limitado
                if (this.memoryHistory.length > this.maxHistorySize) {
                    this.memoryHistory.shift();
                }
                
                // Detectar memory leak
                this.detectMemoryLeak(memory);
            }
        },
        
        detectMemoryLeak: function(currentMemory) {
            if (this.memoryHistory.length < 5) return;
            
            const recent = this.memoryHistory.slice(-5);
            const trend = recent[recent.length - 1].used - recent[0].used;
            const avgIncrease = trend / recent.length;
            
            // Si el aumento promedio es mayor a 10MB por minuto
            if (avgIncrease > 10 * 1024 * 1024) {
                console.warn('⚠️ Posible memory leak detectado:', {
                    increase: `${(avgIncrease / 1024 / 1024).toFixed(2)}MB/min`,
                    current: `${(currentMemory.used / 1024 / 1024).toFixed(2)}MB`
                });
                
                // Emitir alerta
                Justice2Integration.emitEvent('justice2:memory:leak', {
                    increase: avgIncrease,
                    current: currentMemory.used,
                    history: this.memoryHistory
                });
            }
        },
        
        getMemoryReport: function() {
            if (this.memoryHistory.length === 0) return null;
            
            const latest = this.memoryHistory[this.memoryHistory.length - 1];
            const oldest = this.memoryHistory[0];
            
            return {
                current: latest.used,
                total: latest.total,
                limit: latest.limit,
                increase: latest.used - oldest.used,
                samples: this.memoryHistory.length,
                trend: this.memoryHistory.length > 1 ?
                    (latest.used - oldest.used) / (this.memoryHistory.length - 1) : 0
            };
        }
    },
    
    // Configuración de integración
    config: {
        autoSync: true,
        syncInterval: 30000, // 30 segundos
        retryAttempts: 3,
        retryDelay: 2000,
        enableRealTime: true,
        enableOfflineMode: false,
        cacheEnabled: true,
        debugMode: false
    },
    
    // Componentes a integrar
    components: {
        core: null,
        auth: null,
        api: null,
        database: null,
        dynamic: null,
        notifications: null,
        loading: null,
        modals: null,
        validation: null,
        utils: null
    },
    
    // Inicializar integración
    init: async function() {
        if (this.state.initialized) {
            console.warn('Justice 2 Integration ya está inicializado');
            return;
        }
        
        try {
            console.log('Iniciando integración de Justice 2...');
            
            // Mostrar carga de integración
            this.showIntegrationLoading();
            
            // Esperar a que los componentes estén disponibles
            await this.waitForComponents();
            
            // Inicializar componentes
            await this.initializeComponents();
            
            // Configurar eventos globales
            this.setupGlobalEvents();
            
            // Configurar sincronización automática
            this.setupAutoSync();
            
            // Configurar manejo de errores
            this.setupErrorHandling();
            
            // Configurar modo offline si está habilitado
            if (this.config.enableOfflineMode) {
                this.setupOfflineMode();
            }
            
            // Iniciar monitoreo de memoria
            this.startMemoryMonitoring();
            
            // Marcar como inicializado
            this.state.initialized = true;
            
            // Ocultar carga de integración
            this.hideIntegrationLoading();
            
            // Emitir evento de integración completa
            this.emitIntegrationComplete();
            
            console.log('Integración de Justice 2 completada exitosamente');
            
        } catch (error) {
            console.error('Error en integración de Justice 2:', error);
            this.handleIntegrationError(error);
        }
    },
    
    // Esperar a que los componentes estén disponibles
    waitForComponents: function() {
        return new Promise((resolve, reject) => {
            const components = [
                'Justice2Core',
                'Justice2Auth',
                'Justice2API',
                'Justice2Database',
                'Justice2Dynamic',
                'Justice2Notifications',
                'Justice2Loading',
                'Justice2Modal',
                'Justice2Validation',
                'Justice2Utils'
            ];
            
            let attempts = 0;
            const maxAttempts = 50; // 5 segundos máximo
            
            const checkComponents = () => {
                attempts++;
                
                const allAvailable = components.every(comp => window[comp] !== undefined);
                
                if (allAvailable) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error(`Timeout esperando componentes. Faltan: ${
                        components.filter(comp => window[comp] === undefined).join(', ')
                    }`));
                } else {
                    // Usar el sistema de gestión de recursos
                    this.resourceManager.registerTimeout(
                        setTimeout(checkComponents, 100)
                    );
                }
            };
            
            checkComponents();
        });
    },
    
    // Inicializar componentes
    initializeComponents: async function() {
        console.log('Inicializando componentes...');
        
        // Referenciar componentes
        this.components.core = window.Justice2Core;
        this.components.auth = window.Justice2Auth;
        this.components.api = window.Justice2API;
        this.components.database = window.Justice2Database;
        this.components.dynamic = window.Justice2Dynamic;
        this.components.notifications = window.Justice2Notifications;
        this.components.loading = window.Justice2Loading;
        this.components.modals = window.Justice2Modal;
        this.components.validation = window.Justice2Validation;
        this.components.utils = window.Justice2Utils;
        
        // Inicializar componentes si es necesario
        if (this.components.database && !this.state.databaseConnected) {
            try {
                await this.components.database.init();
                this.state.databaseConnected = true;
                console.log('Base de datos conectada');
            } catch (error) {
                console.warn('Error conectando base de datos:', error);
            }
        }
        
        if (this.components.auth && !this.state.authReady) {
            this.state.authReady = true;
            console.log('Sistema de autenticación listo');
        }
        
        if (this.components.api && !this.state.apiConnected) {
            this.state.apiConnected = true;
            console.log('Cliente API listo');
        }
        
        this.state.componentsLoaded = true;
    },
    
    // Configurar eventos globales
    setupGlobalEvents: function() {
        console.log('Configurando eventos globales...');
        
        // Eventos de autenticación
        if (this.components.auth) {
            this.resourceManager.registerEventListener(
                document,
                'justice2:auth:login',
                (e) => this.handleUserLogin(e.detail)
            );
            
            this.resourceManager.registerEventListener(
                document,
                'justice2:auth:logout',
                () => this.handleUserLogout()
            );
            
            this.resourceManager.registerEventListener(
                document,
                'justice2:auth:refresh',
                (e) => this.handleTokenRefresh(e.detail)
            );
        }
        
        // Eventos de API
        if (this.components.api) {
            this.resourceManager.registerEventListener(
                document,
                'justice2:api:error',
                (e) => this.handleApiError(e.detail)
            );
            
            this.resourceManager.registerEventListener(
                document,
                'justice2:api:success',
                (e) => this.handleApiSuccess(e.detail)
            );
        }
        
        // Eventos de base de datos
        if (this.components.database) {
            this.resourceManager.registerEventListener(
                document,
                'justice2:database:error',
                (e) => this.handleDatabaseError(e.detail)
            );
        }
        
        // Eventos de navegación
        this.resourceManager.registerEventListener(
            document,
            'justice2:navigate',
            (e) => this.handleNavigation(e.detail)
        );
        
        // Eventos de sincronización
        this.resourceManager.registerEventListener(
            document,
            'justice2:sync:start',
            () => this.handleSyncStart()
        );
        
        this.resourceManager.registerEventListener(
            document,
            'justice2:sync:complete',
            (e) => this.handleSyncComplete(e.detail)
        );
        
        // Eventos de notificaciones
        if (this.components.notifications) {
            this.resourceManager.registerEventListener(
                document,
                'justice2:notification',
                (e) => this.handleNotification(e.detail)
            );
        }
        
        // Eventos del sistema
        this.resourceManager.registerEventListener(
            window,
            'online',
            () => this.handleOnlineStatus(true)
        );
        
        this.resourceManager.registerEventListener(
            window,
            'offline',
            () => this.handleOnlineStatus(false)
        );
        
        this.resourceManager.registerEventListener(
            window,
            'beforeunload',
            () => this.handlePageUnload()
        );
        
        // Eventos de memoria
        this.resourceManager.registerEventListener(
            window,
            'justice2:memory:leak',
            (e) => this.handleMemoryLeak(e.detail)
        );
    },
    
    // Configurar sincronización automática
    setupAutoSync: function() {
        if (!this.config.autoSync) return;
        
        console.log('Configurando sincronización automática...');
        
        // Sincronización inicial
        this.performSync();
        
        // Configurar intervalo de sincronización usando el sistema de gestión de recursos
        this.state.syncInterval = this.resourceManager.registerInterval(
            setInterval(() => {
                this.performSync();
            }, this.config.syncInterval)
        );
    },
    
    // Realizar sincronización con sistema robusto de sincronización
    performSync: async function() {
        // Inicializar SyncManager si no está inicializado
        if (!SyncManager.state.initialized) {
            SyncManager.init();
        }

        // Inicializar ConcurrencyController si no está inicializado
        if (!ConcurrencyController.state.initialized) {
            ConcurrencyController.init();
        }

        try {
            console.log('Iniciando sincronización con control de concurrencia...');
            
            // Emitir evento de inicio de sincronización
            this.emitEvent('justice2:sync:start');
            
            // Usar SyncManager para ejecutar sincronización atómicamente
            const syncResult = await SyncManager.executeWithSync(async (context) => {
                const syncData = {
                    timestamp: new Date().toISOString(),
                    user: this.components.auth ? this.components.auth.getCurrentUser() : null,
                    data: {}
                };
                
                // Crear barrera para sincronización paralela de componentes
                const barrier = new ConcurrencyController.Barrier(4, {
                    timeout: 30000,
                    action: () => {
                        console.log('Todos los componentes sincronizados');
                    }
                });
                
                // Sincronizar datos del usuario en paralelo
                const userPromise = this.syncUserDataWithSync(context).then(result => {
                    syncData.data.user = result;
                    return barrier.await();
                });
                
                // Sincronizar casos en paralelo
                const casesPromise = this.syncCasesWithSync(context).then(result => {
                    syncData.data.cases = result;
                    return barrier.await();
                });
                
                // Sincronizar documentos en paralelo
                const documentsPromise = this.syncDocumentsWithSync(context).then(result => {
                    syncData.data.documents = result;
                    return barrier.await();
                });
                
                // Sincronizar analytics en paralelo
                const analyticsPromise = this.syncAnalyticsWithSync(context).then(result => {
                    syncData.data.analytics = result;
                    return barrier.await();
                });
                
                // Esperar a que todas las sincronizaciones completen
                await Promise.allSettled([
                    userPromise,
                    casesPromise,
                    documentsPromise,
                    analyticsPromise
                ]);
                
                return syncData;
            }, {
                resource: 'justice2-sync',
                lockTimeout: 60000, // 1 minuto máximo para sincronización
                priority: 1, // Máxima prioridad para sincronización
                metadata: {
                    type: 'sync-operation',
                    timestamp: Date.now()
                }
            });
            
            if (syncResult.success) {
                this.state.lastSync = new Date();
                
                // Emitir evento de sincronización completa
                this.emitEvent('justice2:sync:complete', syncResult.result);
                
                console.log('Sincronización completada exitosamente');
                return syncResult.result;
            } else {
                throw new Error('Falló la sincronización atómica');
            }
            
        } catch (error) {
            console.error('Error en sincronización:', error);
            this.handleSyncError(error);
            
            // Intentar recuperación automática con SyncManager
            if (SyncManager.config.enableAutoRecovery) {
                await this.attemptSyncRecovery(error);
            }
            
            throw error;
        }
    },

    // Sincronizar datos del usuario con control de concurrencia
    syncUserDataWithSync: async function(context) {
        if (!this.components.auth || !this.state.authReady) {
            return null;
        }

        // Crear detector de race conditions para datos de usuario
        const raceDetector = ConcurrencyController.RaceDetector.create('user-data-sync', {
            maxConcurrent: 1,
            window: 5000
        });

        try {
            // Rastrear operación
            raceDetector.track(context.operationId);
            
            // Ejecutar sincronización de usuario con bloqueo
            return await SyncManager.executeWithSync(async () => {
                const user = this.components.auth.getCurrentUser();
                if (!user) return null;
                
                // Actualizar datos del usuario desde la base de datos
                if (this.components.database) {
                    const updatedUser = await this.components.database.users.getById(user.id);
                    if (updatedUser) {
                        // Usar operación atómica para actualizar usuario
                        await ConcurrencyController.Atomic.update(
                            () => this.components.auth.state.user,
                            (currentUser) => updatedUser
                        );
                        
                        return updatedUser;
                    }
                }
                
                return user;
            }, {
                resource: 'user-data',
                lockTimeout: 15000,
                priority: 2,
                metadata: {
                    type: 'user-sync',
                    userId: user.id
                }
            });
            
        } finally {
            // Completar rastreo y limpiar detector
            raceDetector.complete(context.operationId);
            raceDetector.destroy();
        }
    },

    // Sincronizar casos con control de concurrencia
    syncCasesWithSync: async function(context) {
        if (!this.components.database || !this.state.databaseConnected) {
            return [];
        }

        // Crear semáforo para limitar concurrencia de casos
        const semaphore = new ConcurrencyController.Semaphore(3, {
            timeout: 20000
        });

        try {
            // Adquirir permiso del semáforo
            await semaphore.acquire();
            
            return await SyncManager.executeWithSync(async () => {
                const user = this.components.auth ? this.components.auth.getCurrentUser() : null;
                if (!user) return [];
                
                const cases = await this.components.database.cases.getByUser(user.id);
                
                // Actualizar contenido dinámico si está disponible
                if (this.components.dynamic) {
                    // Usar thread pool para actualización dinámica
                    const threadPool = new ConcurrencyController.ThreadPool({
                        maxSize: 2,
                        minSize: 1
                    });
                    
                    await threadPool.execute(async () => {
                        this.components.dynamic.updateCasesData(cases);
                    });
                    
                    // Destruir thread pool temporal
                    await threadPool.destroy();
                }
                
                return cases;
            }, {
                resource: 'cases-data',
                lockTimeout: 20000,
                priority: 3,
                metadata: {
                    type: 'cases-sync',
                    userId: user?.id
                }
            });
            
        } finally {
            // Liberar permiso del semáforo
            semaphore.release();
            semaphore.destroy();
        }
    },

    // Sincronizar documentos con control de concurrencia
    syncDocumentsWithSync: async function(context) {
        if (!this.components.database || !this.state.databaseConnected) {
            return [];
        }

        // Crear latch para coordinación
        const latch = new ConcurrencyController.CountDownLatch(1, {
            timeout: 25000
        });

        try {
            return await SyncManager.executeWithSync(async () => {
                const user = this.components.auth ? this.components.auth.getCurrentUser() : null;
                if (!user) return [];
                
                const documents = await this.components.database.documents.getByUser(user.id);
                
                // Actualizar contenido dinámico si está disponible
                if (this.components.dynamic) {
                    // Usar operación atómica para actualizar documentos
                    await ConcurrencyController.Atomic.update(
                        () => this.components.dynamic.state.documents,
                        (currentDocs) => documents
                    );
                    
                    this.components.dynamic.updateDocumentsData(documents);
                }
                
                // Señalizar completado del latch
                latch.countDown();
                
                return documents;
            }, {
                resource: 'documents-data',
                lockTimeout: 25000,
                priority: 3,
                metadata: {
                    type: 'documents-sync',
                    userId: user?.id
                }
            });
            
        } finally {
            // Esperar a que el latch se complete
            await latch.await();
            latch.destroy();
        }
    },

    // Sincronizar analytics con control de concurrencia
    syncAnalyticsWithSync: async function(context) {
        if (!this.components.database || !this.state.databaseConnected) {
            return {};
        }

        try {
            return await SyncManager.executeWithSync(async () => {
                const user = this.components.auth ? this.components.auth.getCurrentUser() : null;
                if (!user) return {};
                
                // Obtener datos de analytics
                const analytics = {
                    totalCases: 0,
                    totalDocuments: 0,
                    recentActivity: [],
                    performance: {}
                };
                
                // Usar operaciones atómicas para contadores
                analytics.totalCases = await ConcurrencyController.Atomic.increment(
                    () => this.state.analyticsCount?.cases || 0,
                    0
                );
                
                analytics.totalDocuments = await ConcurrencyController.Atomic.increment(
                    () => this.state.analyticsCount?.documents || 0,
                    0
                );
                
                // Actualizar contenido dinámico si está disponible
                if (this.components.dynamic) {
                    this.components.dynamic.updateAnalyticsData(analytics);
                }
                
                return analytics;
            }, {
                resource: 'analytics-data',
                lockTimeout: 15000,
                priority: 4,
                metadata: {
                    type: 'analytics-sync',
                    userId: user?.id
                }
            });
            
        } catch (error) {
            console.error('Error en sincronización de analytics:', error);
            return {};
        }
    },

    // Intentar recuperación de sincronización
    attemptSyncRecovery: async function(error) {
        console.log('Intentando recuperación de sincronización...');
        
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                // Esperar antes de reintentar
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                
                // Verificar salud del sistema de sincronización
                const healthCheck = await SyncManager.healthCheck();
                
                if (healthCheck.status === 'healthy') {
                    console.log(`Recuperación exitosa en intento ${attempt}`);
                    
                    // Emitir evento de recuperación
                    this.emitEvent('justice2:sync:recovered', {
                        attempt,
                        error: error.message,
                        timestamp: Date.now()
                    });
                    
                    return true;
                }
                
            } catch (recoveryError) {
                console.error(`Error en recuperación intento ${attempt}:`, recoveryError);
            }
        }
        
        console.error('Recuperación de sincronización fallida');
        return false;
    },
    
    // Sincronizar datos del usuario
    syncUserData: async function() {
        if (!this.components.auth) return null;
        
        try {
            const user = this.components.auth.getCurrentUser();
            if (!user) return null;
            
            // Actualizar datos del usuario desde la base de datos
            if (this.components.database) {
                const updatedUser = await this.components.database.users.getById(user.id);
                if (updatedUser) {
                    this.components.auth.updateUser(updatedUser);
                    return updatedUser;
                }
            }
            
            return user;
        } catch (error) {
            console.error('Error sincronizando datos del usuario:', error);
            return null;
        }
    },
    
    // Sincronizar casos
    syncCases: async function() {
        if (!this.components.database) return [];
        
        try {
            const user = this.components.auth ? this.components.auth.getCurrentUser() : null;
            if (!user) return [];
            
            const cases = await this.components.database.cases.getByUser(user.id);
            
            // Actualizar contenido dinámico si está disponible
            if (this.components.dynamic) {
                this.components.dynamic.updateCasesData(cases);
            }
            
            return cases;
        } catch (error) {
            console.error('Error sincronizando casos:', error);
            return [];
        }
    },
    
    // Sincronizar documentos
    syncDocuments: async function() {
        if (!this.components.database) return [];
        
        try {
            const user = this.components.auth ? this.components.auth.getCurrentUser() : null;
            if (!user) return [];
            
            const documents = await this.components.database.documents.getByUser(user.id);
            
            // Actualizar contenido dinámico si está disponible
            if (this.components.dynamic) {
                this.components.dynamic.updateDocumentsData(documents);
            }
            
            return documents;
        } catch (error) {
            console.error('Error sincronizando documentos:', error);
            return [];
        }
    },
    
    // Sincronizar analytics
    syncAnalytics: async function() {
        if (!this.components.database) return {};
        
        try {
            const user = this.components.auth ? this.components.auth.getCurrentUser() : null;
            if (!user) return {};
            
            // Obtener datos de analytics
            const analytics = {
                totalCases: 0,
                totalDocuments: 0,
                recentActivity: [],
                performance: {}
            };
            
            // Actualizar contenido dinámico si está disponible
            if (this.components.dynamic) {
                this.components.dynamic.updateAnalyticsData(analytics);
            }
            
            return analytics;
        } catch (error) {
            console.error('Error sincronizando analytics:', error);
            return {};
        }
    },
    
    // Configurar manejo de errores
    setupErrorHandling: function() {
        console.log('Configurando manejo de errores...');
        
        // Capturar errores no manejados usando el sistema de gestión de recursos
        this.resourceManager.registerEventListener(
            window,
            'error',
            (e) => this.handleGlobalError(e.error)
        );
        
        this.resourceManager.registerEventListener(
            window,
            'unhandledrejection',
            (e) => this.handleGlobalError(e.reason)
        );
    },
    
    // Configurar modo offline
    setupOfflineMode: function() {
        console.log('Configurando modo offline...');
        
        // Implementar caché offline
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('Service Worker registrado'))
                .catch(error => console.error('Error registrando Service Worker:', error));
        }
    },
    
    // Manejar login de usuario
    handleUserLogin: function(userData) {
        console.log('Usuario autenticado:', userData);
        
        // Realizar sincronización inicial
        this.performSync();
        
        // Mostrar notificación de bienvenida
        if (this.components.notifications) {
            this.components.notifications.success(
                `Bienvenido, ${userData.name || userData.email}!`,
                { duration: 3000 }
            );
        }
        
        // Actualizar UI
        this.updateUIForAuth();
    },
    
    // Manejar logout de usuario
    handleUserLogout: function() {
        console.log('Usuario cerró sesión');
        
        // Limpiar datos
        if (this.components.dynamic) {
            this.components.dynamic.clearData();
        }
        
        // Mostrar notificación
        if (this.components.notifications) {
            this.components.notifications.info(
                'Has cerrado sesión correctamente',
                { duration: 3000 }
            );
        }
        
        // Actualizar UI
        this.updateUIForLogout();
    },
    
    // Manejar refresh de token
    handleTokenRefresh: function(tokenData) {
        console.log('Token actualizado');
        
        // Actualizar configuración de API
        if (this.components.api) {
            this.components.api.updateToken(tokenData.token);
        }
    },
    
    // Manejar error de API
    handleApiError: function(errorData) {
        console.error('Error de API:', errorData);
        
        // Mostrar notificación de error
        if (this.components.notifications && errorData.showMessage !== false) {
            this.components.notifications.error(
                errorData.message || 'Error en la comunicación con el servidor',
                { duration: 5000 }
            );
        }
        
        // Manejar errores de autenticación
        if (errorData.status === 401) {
            if (this.components.auth) {
                this.components.auth.handleAuthError();
            }
        }
    },
    
    // Manejar éxito de API
    handleApiSuccess: function(successData) {
        console.log('Operación de API exitosa:', successData);
        
        // Mostrar notificación de éxito si está configurado
        if (this.components.notifications && successData.showMessage) {
            this.components.notifications.success(
                successData.message || 'Operación completada exitosamente',
                { duration: 3000 }
            );
        }
    },
    
    // Manejar error de base de datos
    handleDatabaseError: function(errorData) {
        console.error('Error de base de datos:', errorData);
        
        // Mostrar notificación de error
        if (this.components.notifications) {
            this.components.notifications.error(
                'Error en la base de datos. Intente nuevamente.',
                { duration: 5000 }
            );
        }
    },
    
    // Manejar navegación
    handleNavigation: function(navigationData) {
        console.log('Navegación:', navigationData);
        
        // Actualizar contenido dinámico según la página
        if (this.components.dynamic) {
            this.components.dynamic.loadPageContent(navigationData.page);
        }
        
        // Actualizar título de página
        document.title = `${navigationData.title || navigationData.page} - Justice 2`;
    },
    
    // Manejar inicio de sincronización
    handleSyncStart: function() {
        console.log('Inicio de sincronización');
        
        // Mostrar indicador de sincronización
        const syncIndicator = document.getElementById('sync-indicator');
        if (syncIndicator) {
            syncIndicator.classList.add('syncing');
        }
    },
    
    // Manejar sincronización completa
    handleSyncComplete: function(syncData) {
        console.log('Sincronización completa:', syncData);
        
        // Ocultar indicador de sincronización
        const syncIndicator = document.getElementById('sync-indicator');
        if (syncIndicator) {
            syncIndicator.classList.remove('syncing');
        }
        
        // Actualizar última sincronización
        const lastSyncElement = document.getElementById('last-sync');
        if (lastSyncElement) {
            lastSyncElement.textContent = this.components.utils.formatDateTime(this.state.lastSync);
        }
    },
    
    // Manejar error de sincronización
    handleSyncError: function(error) {
        console.error('Error en sincronización:', error);
        
        // Mostrar notificación de error
        if (this.components.notifications) {
            this.components.notifications.warning(
                'Error en sincronización automática',
                { duration: 3000 }
            );
        }
    },
    
    // Manejar notificación
    handleNotification: function(notificationData) {
        console.log('Notificación:', notificationData);
        
        // Mostrar notificación si el sistema está disponible
        if (this.components.notifications) {
            this.components.notifications[notificationData.type || 'info'](
                notificationData.message,
                notificationData.options
            );
        }
    },
    
    // Manejar estado de conexión
    handleOnlineStatus: function(isOnline) {
        console.log('Estado de conexión:', isOnline ? 'Online' : 'Offline');
        
        if (isOnline) {
            // Reconectar y sincronizar
            if (this.components.api) {
                this.components.api.reconnect();
            }
            this.performSync();
            
            // Mostrar notificación
            if (this.components.notifications) {
                this.components.notifications.success(
                    'Conexión restablecida',
                    { duration: 3000 }
                );
            }
        } else {
            // Mostrar notificación
            if (this.components.notifications) {
                this.components.notifications.warning(
                    'Sin conexión a internet. Modo offline activado.',
                    { duration: 5000 }
                );
            }
        }
    },
    
    // Manejar descarga de página
    handlePageUnload: function() {
        console.log('Descargando página...');
        
        // Realizar cleanup completo de recursos
        this.cleanup();
        
        // Guardar estado si es necesario
        if (this.config.cacheEnabled) {
            this.saveState();
        }
    },
    
    // Manejar memory leak detectado
    handleMemoryLeak: function(leakData) {
        console.error('🚨 Memory leak detectado:', leakData);
        
        // Mostrar notificación crítica
        if (this.components.notifications) {
            this.components.notifications.error(
                'Se ha detectado un consumo excesivo de memoria. Recomendamos recargar la página.',
                { duration: 15000 }
            );
        }
        
        // Intentar limpieza automática
        this.performEmergencyCleanup();
        
        // Registrar el incidente
        if (this.components.api) {
            this.components.api.logError({
                type: 'memory_leak',
                data: leakData,
                timestamp: new Date().toISOString()
            });
        }
    },
    
    // Realizar cleanup completo de recursos
    cleanup: function() {
        if (this.state.cleanupComplete) {
            console.warn('Cleanup ya fue realizado');
            return;
        }
        
        console.log('🧹 Iniciando cleanup completo de Justice2Integration...');
        
        try {
            // Detener monitoreo de memoria
            this.memoryMonitor.stop();
            
            // Limpiar todos los recursos registrados
            this.resourceManager.cleanup();
            
            // Limpiar referencias a componentes
            Object.keys(this.components).forEach(key => {
                this.components[key] = null;
            });
            
            // Limpiar estado
            this.state.componentsLoaded = false;
            this.state.databaseConnected = false;
            this.state.apiConnected = false;
            this.state.authReady = false;
            this.state.cleanupComplete = true;
            
            // Limpiar localStorage si es necesario
            if (!this.config.cacheEnabled) {
                localStorage.removeItem('justice2_integration_state');
            }
            
            console.log('✅ Cleanup completado exitosamente');
            
        } catch (error) {
            console.error('Error durante cleanup:', error);
        }
    },
    
    // Realizar cleanup de emergencia
    performEmergencyCleanup: function() {
        console.log('🚨 Realizando cleanup de emergencia...');
        
        try {
            // Forzar garbage collection si está disponible
            if (window.gc) {
                window.gc();
            }
            
            // Limpiar intervals críticos
            if (this.state.syncInterval) {
                clearInterval(this.state.syncInterval);
                this.state.syncInterval = null;
            }
            
            // Limpiar caché de componentes si es posible
            if (this.components.dynamic && typeof this.components.dynamic.clearCache === 'function') {
                this.components.dynamic.clearCache();
            }
            
            console.log('✅ Cleanup de emergencia completado');
            
        } catch (error) {
            console.error('Error en cleanup de emergencia:', error);
        }
    },
    
    // Iniciar monitoreo de memoria
    startMemoryMonitoring: function() {
        this.memoryMonitor.start();
    },
    
    // Detener monitoreo de memoria
    stopMemoryMonitoring: function() {
        this.memoryMonitor.stop();
    },
    
    // Obtener reporte de memoria
    getMemoryReport: function() {
        return this.memoryMonitor.getMemoryReport();
    },
    
    // Forzar recolección de basura
    forceGarbageCollection: function() {
        if (window.gc) {
            window.gc();
            console.log('🗑️ Garbage collection forzada');
        } else {
            console.warn('⚠️ Garbage collection no disponible en este navegador');
        }
    },
    
    // Manejar error global
    handleGlobalError: function(error) {
        console.error('Error global:', error);
        
        // Registrar error
        if (this.components.api) {
            this.components.api.logError(error);
        }
        
        // Mostrar notificación si es un error crítico
        if (this.components.notifications && error.critical) {
            this.components.notifications.error(
                'Ha ocurrido un error crítico. Por favor, recargue la página.',
                { duration: 10000 }
            );
        }
    },
    
    // Manejar error de integración
    handleIntegrationError: function(error) {
        console.error('Error crítico en integración:', error);
        
        // Mostrar pantalla de error
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background: linear-gradient(135deg, #B49C73, #37373F);
                color: white;
                font-family: Arial, sans-serif;
                text-align: center;
            ">
                <div>
                    <h1 style="font-size: 48px; margin: 0 0 20px;">⚠️</h1>
                    <h2 style="margin: 0 0 10px;">Error de Integración</h2>
                    <p style="margin: 0 0 20px; opacity: 0.8;">
                        No se pudo inicializar correctamente la aplicación.
                    </p>
                    <button onclick="location.reload()" style="
                        background: white;
                        color: #37373F;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 16px;
                    ">
                        Reintentar
                    </button>
                </div>
            </div>
        `;
    },
    
    // Actualizar UI para usuario autenticado
    updateUIForAuth: function() {
        // Actualizar elementos de navegación
        const authElements = document.querySelectorAll('.auth-required');
        authElements.forEach(el => el.style.display = 'block');
        
        const noAuthElements = document.querySelectorAll('.auth-guest');
        noAuthElements.forEach(el => el.style.display = 'none');
    },
    
    // Actualizar UI para usuario no autenticado
    updateUIForLogout: function() {
        // Actualizar elementos de navegación
        const authElements = document.querySelectorAll('.auth-required');
        authElements.forEach(el => el.style.display = 'none');
        
        const noAuthElements = document.querySelectorAll('.auth-guest');
        noAuthElements.forEach(el => el.style.display = 'block');
    },
    
    // Mostrar carga de integración
    showIntegrationLoading: function() {
        const loadingHtml = `
            <div id="justice2-integration-loading" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.95);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 99998;
                font-family: Arial, sans-serif;
            ">
                <div style="text-align: center;">
                    <div style="
                        width: 50px;
                        height: 50px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #B49C73;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    "></div>
                    <h3 style="margin: 0; color: #37373F;">Integrando componentes...</h3>
                    <p style="margin: 10px 0 0; color: #6c757d;">Por favor, espere un momento.</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loadingHtml);
    },
    
    // Ocultar carga de integración
    hideIntegrationLoading: function() {
        const loading = document.getElementById('justice2-integration-loading');
        if (loading) {
            loading.style.opacity = '0';
            loading.style.transition = 'opacity 0.5s ease';
            setTimeout(() => loading.remove(), 500);
        }
    },
    
    // Emitir evento de integración completa
    emitIntegrationComplete: function() {
        const event = new CustomEvent('justice2:integration:complete', {
            detail: {
                timestamp: new Date().toISOString(),
                components: Object.keys(this.components).filter(key => this.components[key] !== null),
                databaseConnected: this.state.databaseConnected,
                apiConnected: this.state.apiConnected,
                authReady: this.state.authReady
            }
        });
        
        document.dispatchEvent(event);
    },
    
    // Emitir evento genérico
    emitEvent: function(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    },
    
    // Guardar estado
    saveState: function() {
        const state = {
            lastSync: this.state.lastSync,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('justice2_integration_state', JSON.stringify(state));
    },
    
    // Cargar estado
    loadState: function() {
        try {
            const savedState = localStorage.getItem('justice2_integration_state');
            if (savedState) {
                return JSON.parse(savedState);
            }
        } catch (error) {
            console.error('Error cargando estado:', error);
        }
        return null;
    },
    
    // Obtener estado de la integración
    getState: function() {
        return {
            ...this.state,
            components: Object.keys(this.components).filter(key => this.components[key] !== null)
        };
    },
    
    // Verificar salud del sistema
    healthCheck: async function() {
        const health = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            components: {},
            issues: []
        };
        
        // Verificar componentes
        Object.keys(this.components).forEach(key => {
            const component = this.components[key];
            health.components[key] = {
                loaded: component !== null,
                healthy: component && typeof component.healthCheck === 'function' ? 
                    component.healthCheck() : true
            };
            
            if (!health.components[key].loaded) {
                health.issues.push(`Componente ${key} no cargado`);
                health.status = 'degraded';
            }
        });
        
        // Verificar conexiones
        if (!this.state.databaseConnected) {
            health.issues.push('Base de datos no conectada');
            health.status = 'degraded';
        }
        
        if (!this.state.apiConnected) {
            health.issues.push('API no conectada');
            health.status = 'degraded';
        }
        
        return health;
    }
};

// Inicializar cuando el DOM esté listo y los componentes estén cargados
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que todos los componentes se carguen
    setTimeout(() => {
        Justice2Integration.init();
    }, 500);
});

// Exportar para uso global
window.Justice2Integration = Justice2Integration;