/**
 * Justice 2 Core JavaScript
 * Funcionalidades principales y utilidades para Justice 2
 * Versión con sincronización robusta integrada
 */

// Importar sistema de protección XSS centralizado
// El sistema se carga automáticamente desde components/xss-protection.js

// Importar sistema de sincronización robusto
import SyncManager from './components/sync-manager.js';
import ConcurrencyController from './components/concurrency-controller.js';
import SyncDiagnostics from './components/sync-diagnostics.js';

// Importar sistema de renderizado optimizado
import RenderOptimizer from './components/render-optimizer.js';
import VirtualDOM from './components/virtual-dom.js';
import ComponentMemoizer from './components/component-memoizer.js';
import BatchRenderer from './components/batch-renderer.js';
import LazyRenderer from './components/lazy-renderer.js';
import SmartComponent from './components/smart-component.js';
import OptimizedRenderer from './components/optimized-renderer.js';
import RenderScheduler from './components/render-scheduler.js';
import PerformanceProfiler from './components/performance-profiler.js';

// Configuración global (Core implementation)
const Justice2Core = {
    config: {
        apiBaseUrl: '/api',
        version: '2.0.0',
        debug: true,
        animations: true,
        autoRefresh: true,
        refreshInterval: 30000, // 30 segundos
        syncEnabled: true, // Sincronización habilitada
        syncTimeout: 10000, // Timeout para operaciones de sincronización
        maxConcurrentOperations: 5 // Máximo de operaciones concurrentes
    },
    
    // Estado de la aplicación
    state: {
        user: null,
        isAuthenticated: false,
        currentPage: 'index',
        theme: 'light',
        language: 'es',
        coreCache: null, // CacheManager para datos principales
        syncManager: null, // Instancia de SyncManager
        concurrencyController: null, // Instancia de ConcurrencyController
        syncDiagnostics: null, // Instancia de SyncDiagnostics
        syncInitialized: false, // Estado de inicialización de sincronización
        // Sistema de renderizado optimizado
        renderOptimizer: null, // Instancia de RenderOptimizer
        virtualDOM: null, // Instancia de VirtualDOM
        componentMemoizer: null, // Instancia de ComponentMemoizer
        batchRenderer: null, // Instancia de BatchRenderer
        lazyRenderer: null, // Instancia de LazyRenderer
        smartComponent: null, // Instancia de SmartComponent
        optimizedRenderer: null, // Instancia de OptimizedRenderer
        renderScheduler: null, // Instancia de RenderScheduler
        performanceProfiler: null, // Instancia de PerformanceProfiler
        renderSystemInitialized: false // Estado de inicialización de renderizado
    },
    
    // Gestión de intervalos y event listeners para prevenir memory leaks
    intervals: [],
    eventListeners: [],
    syncOperations: new Map(), // Operaciones de sincronización activas
    
    // Utilidades
    utils: {
        // Formatear fecha
        formatDate: function(date) {
            return new Date(date).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },
        
        // Formatear número
        formatNumber: function(num) {
            return new Intl.NumberFormat('es-ES').format(num);
        },
        
        // Generar ID único
        generateId: function() {
            return 'j2_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        // Validar email
        validateEmail: function(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },
        
        // Mostrar notificación optimizada
        showNotification: function(message, type = 'info', duration = 5000) {
            // Usar sistema de renderizado optimizado si está disponible
            if (this.state.renderSystemInitialized && this.state.optimizedRenderer) {
                return this.renderNotificationOptimized(message, type, duration);
            }
            
            // Fallback al método original
            return this.renderNotificationLegacy(message, type, duration);
        },
        
        // Renderizado de notificación optimizado
        renderNotificationOptimized: function(message, type, duration) {
            const notificationComponent = {
                id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'notification',
                props: {
                    message,
                    type,
                    duration
                },
                render: function(props) {
                    // Validar y sanitizar mensaje usando XSSProtection
                    const validation = XSSProtection.validateInput(props.message, {
                        type: 'text',
                        maxLength: 500,
                        allowEmpty: false
                    });
                    
                    if (!validation.valid) {
                        console.error('Mensaje de notificación no seguro:', props.message);
                        return null;
                    }
                    
                    const sanitizedMessage = validation.sanitized;
                    
                    return {
                        tag: 'div',
                        attributes: {
                            class: `notification notification-${props.type} fade-in`
                        },
                        children: [{
                            tag: 'div',
                            attributes: {
                                class: 'd-flex justify-content-between align-items-center'
                            },
                            children: [
                                {
                                    tag: 'span',
                                    children: [XSSProtection.escapeHtml(sanitizedMessage)]
                                },
                                {
                                    tag: 'button',
                                    attributes: {
                                        type: 'button',
                                        class: 'close ml-2',
                                        onclick: 'this.parentElement.parentElement.remove()'
                                    },
                                    children: [{
                                        tag: 'span',
                                        children: ['×']
                                    }]
                                }
                            ]
                        }]
                    };
                }
            };
            
            // Renderizar usando el sistema optimizado
            return this.state.optimizedRenderer.render(notificationComponent);
        },
        
        // Renderizado de notificación legacy (fallback)
        renderNotificationLegacy: function(message, type, duration) {
            // Validar y sanitizar mensaje usando XSSProtection
            const validation = XSSProtection.validateInput(message, {
                type: 'text',
                maxLength: 500,
                allowEmpty: false
            });
            
            if (!validation.valid) {
                console.error('Mensaje de notificación no seguro:', message);
                return;
            }
            
            const sanitizedMessage = validation.sanitized;
            
            const notification = XSSProtection.createElementSafe('div', {
                class: `notification notification-${type} fade-in`
            });
            
            XSSProtection.setInnerHTMLSafe(notification, `
                <div class="d-flex justify-content-between align-items-center">
                    <span>${XSSProtection.escapeHtml(sanitizedMessage)}</span>
                    <button type="button" class="close ml-2" onclick="this.parentElement.parentElement.remove()">
                        <span>&times;</span>
                    </button>
                </div>
            `);
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        },
        
        // Mostrar loading
        showLoading: function(element, text = 'Cargando...') {
            // Validar y sanitizar texto usando XSSProtection
            const validation = XSSProtection.validateInput(text, {
                type: 'text',
                maxLength: 100,
                allowEmpty: true
            });
            
            const sanitizedText = validation.valid ? validation.sanitized : 'Cargando...';
            
            element.classList.add('loading');
            XSSProtection.setInnerHTMLSafe(element, `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">${XSSProtection.escapeHtml(sanitizedText)}</span>
                    </div>
                    <p class="mt-2">${XSSProtection.escapeHtml(sanitizedText)}</p>
                </div>
            `);
        },
        
        // Ocultar loading
        hideLoading: function(element) {
            element.classList.remove('loading');
        },
        
        // Animar contador
        animateCounter: function(element, target, duration = 2000) {
            let start = 0;
            const increment = target / (duration / 16);
            const timer = setInterval(() => {
                start += increment;
                if (start >= target) {
                    element.textContent = this.formatNumber(Math.round(target));
                    clearInterval(timer);
                    // Limpiar referencia del array de intervalos
                    const index = Justice2.intervals.indexOf(timer);
                    if (index > -1) {
                        Justice2.intervals.splice(index, 1);
                    }
                } else {
                    element.textContent = this.formatNumber(Math.round(start));
                }
            }, 16);
            
            // Guardar referencia del intervalo para limpieza posterior
            Justice2.intervals.push(timer);
            
            return timer; // Retornar ID para posible cancelación manual
        },
        
        // Limpiar todos los intervalos activos
        clearAllIntervals: function() {
            Justice2.intervals.forEach(intervalId => {
                clearInterval(intervalId);
            });
            Justice2.intervals = [];
            this.log('Todos los intervalos han sido limpiados');
        },
        
        // Limpiar todos los event listeners
        removeAllEventListeners: function() {
            Justice2.eventListeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            Justice2.eventListeners = [];
            this.log('Todos los event listeners han sido removidos');
        },
        
        // Agregar event listener con seguimiento
        addTrackedEventListener: function(element, event, handler, options) {
            element.addEventListener(event, handler, options);
            Justice2.eventListeners.push({ element, event, handler, options });
        }
    },
    
    // Inicialización
    init: function() {
        this.log('Inicializando Justice 2 v' + this.config.version + ' con renderizado optimizado y sincronización robusta');
        
        // Inicializar sistema de renderizado optimizado primero
        this.initializeRenderSystem();
        
        // Inicializar sistema de sincronización
        this.initializeSynchronization();
        
        // Inicializar caché principal
        this.initializeCoreCache();
        
        // Inicializar componentes
        this.initComponents();
        
        // Inicializar eventos
        this.initEvents();
        
        // Cargar estado guardado
        this.loadState();
        
        // Inicializar actualización automática
        if (this.config.autoRefresh) {
            this.initAutoRefresh();
        }
        
        this.log('Justice 2 inicializado correctamente con renderizado optimizado y sincronización');
    },
    
    // Inicializar sistema de renderizado optimizado
    initializeRenderSystem: function() {
        try {
            this.log('Inicializando sistema de renderizado optimizado...');
            
            // Inicializar PerformanceProfiler primero para monitorear todo
            if (typeof PerformanceProfiler !== 'undefined') {
                this.state.performanceProfiler = new PerformanceProfiler({
                    enableDetailedTracing: true,
                    enableMemoryProfiling: true,
                    enableFrameAnalysis: true,
                    enableComponentAnalysis: true,
                    reportInterval: 10000 // 10 segundos
                });
                
                this.state.performanceProfiler.start();
                this.log('PerformanceProfiler inicializado');
            }
            
            // Inicializar RenderScheduler
            if (typeof RenderScheduler !== 'undefined') {
                this.state.renderScheduler = new RenderScheduler({
                    targetFPS: 60,
                    frameBudget: 16.67,
                    maxConcurrentRenders: 3,
                    enablePreloading: true,
                    enablePredictiveScheduling: true,
                    adaptiveFrameBudget: true
                });
                
                this.state.renderScheduler.startScheduler();
                this.log('RenderScheduler inicializado');
            }
            
            // Inicializar ComponentMemoizer
            if (typeof ComponentMemoizer !== 'undefined') {
                this.state.componentMemoizer = new ComponentMemoizer({
                    maxCacheSize: 100,
                    defaultTTL: 30000, // 30 segundos
                    enableAdaptiveTTL: true,
                    enablePatternAnalysis: true
                });
                
                this.log('ComponentMemoizer inicializado');
            }
            
            // Inicializar VirtualDOM
            if (typeof VirtualDOM !== 'undefined') {
                this.state.virtualDOM = new VirtualDOM({
                    enableDiffingOptimization: true,
                    enableBatchPatches: true,
                    maxNodesPerBatch: 50
                });
                
                this.log('VirtualDOM inicializado');
            }
            
            // Inicializar BatchRenderer
            if (typeof BatchRenderer !== 'undefined') {
                this.state.batchRenderer = new BatchRenderer({
                    maxBatchSize: 20,
                    batchTimeout: 16, // 1 frame
                    enablePriorityQueue: true
                });
                
                this.log('BatchRenderer inicializado');
            }
            
            // Inicializar LazyRenderer
            if (typeof LazyRenderer !== 'undefined') {
                this.state.lazyRenderer = new LazyRenderer({
                    rootMargin: '50px',
                    threshold: 0.1,
                    enablePlaceholders: true,
                    enableSkeletons: true
                });
                
                this.log('LazyRenderer inicializado');
            }
            
            // Inicializar SmartComponent
            if (typeof SmartComponent !== 'undefined') {
                this.state.smartComponent = new SmartComponent({
                    enableAutoOptimization: true,
                    enableErrorBoundaries: true,
                    enableLifecycleHooks: true
                });
                
                this.log('SmartComponent inicializado');
            }
            
            // Inicializar OptimizedRenderer
            if (typeof OptimizedRenderer !== 'undefined') {
                this.state.optimizedRenderer = new OptimizedRenderer({
                    enableVirtualDOM: true,
                    enableMemoization: true,
                    enableBatching: true,
                    enableLazyLoading: true,
                    enableSmartComponents: true
                });
                
                // Conectar con los sistemas individuales
                this.state.optimizedRenderer.connectSystems({
                    virtualDOM: this.state.virtualDOM,
                    componentMemoizer: this.state.componentMemoizer,
                    batchRenderer: this.state.batchRenderer,
                    lazyRenderer: this.state.lazyRenderer,
                    smartComponent: this.state.smartComponent,
                    renderScheduler: this.state.renderScheduler,
                    performanceProfiler: this.state.performanceProfiler
                });
                
                this.log('OptimizedRenderer inicializado y conectado');
            }
            
            // Inicializar RenderOptimizer
            if (typeof RenderOptimizer !== 'undefined') {
                this.state.renderOptimizer = new RenderOptimizer({
                    enableAutoOptimization: true,
                    enablePerformanceMonitoring: true,
                    enableAdaptiveRendering: true,
                    optimizationThreshold: 16.67 // 60 FPS
                });
                
                // Conectar con el motor de renderizado
                this.state.renderOptimizer.connectRenderer(this.state.optimizedRenderer);
                
                this.log('RenderOptimizer inicializado y conectado');
            }
            
            this.state.renderSystemInitialized = true;
            this.log('Sistema de renderizado optimizado inicializado correctamente');
            
        } catch (error) {
            this.log('Error inicializando sistema de renderizado optimizado:', error);
            // Continuar sin renderizado optimizado en caso de error
        }
    },
    
    // Inicializar sistema de sincronización
    initializeSynchronization: async function() {
        if (!this.config.syncEnabled) {
            this.log('Sincronización deshabilitada en configuración');
            return;
        }
        
        try {
            this.log('Inicializando sistema de sincronización...');
            
            // Inicializar SyncManager
            if (typeof SyncManager !== 'undefined') {
                SyncManager.init({
                    maxConcurrentOperations: this.config.maxConcurrentOperations,
                    defaultTimeout: this.config.syncTimeout,
                    enableDeadlockDetection: true,
                    enableRaceConditionDetection: true,
                    enableMetrics: true
                });
                
                this.state.syncManager = SyncManager;
                this.log('SyncManager inicializado');
            }
            
            // Inicializar ConcurrencyController
            if (typeof ConcurrencyController !== 'undefined') {
                ConcurrencyController.init({
                    maxThreads: this.config.maxConcurrentOperations,
                    enableAtomicOperations: true,
                    enableRaceDetection: true,
                    enableMetrics: true
                });
                
                this.state.concurrencyController = ConcurrencyController;
                this.log('ConcurrencyController inicializado');
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
                this.log('SyncDiagnostics inicializado');
            }
            
            // Configurar eventos de sincronización
            this.setupSyncEvents();
            
            this.state.syncInitialized = true;
            this.log('Sistema de sincronización inicializado correctamente');
            
        } catch (error) {
            this.log('Error inicializando sistema de sincronización:', error);
            // Continuar sin sincronización en caso de error
        }
    },
    
    // Configurar eventos de sincronización
    setupSyncEvents: function() {
        if (!this.state.syncManager) return;
        
        // Escuchar eventos de deadlock
        if (typeof document !== 'undefined') {
            document.addEventListener('sync:deadlock:detected', (event) => {
                this.log('Deadlock detectado:', event.detail);
                this.utils.showNotification('Se detectó un conflicto de sincronización, resolviendo...', 'warning');
            });
            
            document.addEventListener('sync:deadlock:resolved', (event) => {
                this.log('Deadlock resuelto:', event.detail);
                this.utils.showNotification('Conflicto de sincronización resuelto', 'success');
            });
            
            document.addEventListener('sync:race:detected', (event) => {
                this.log('Race condition detectada:', event.detail);
                this.utils.showNotification('Se detectó una condición de competencia, aplicando corrección...', 'warning');
            });
            
            document.addEventListener('sync:recovery:completed', (event) => {
                this.log('Recuperación de sincronización completada:', event.detail);
                this.utils.showNotification('Sistema de sincronización recuperado', 'success');
            });
            
            document.addEventListener('sync:performance:degraded', (event) => {
                this.log('Rendimiento de sincronización degradado:', event.detail);
                this.utils.showNotification('Rendimiento del sistema degradado, optimizando...', 'info');
            });
        }
    },
    
    // Ejecutar operación con sincronización
    executeWithSync: async function(operationId, operationFn, options = {}) {
        if (!this.state.syncInitialized) {
            // Fallback sin sincronización
            return await operationFn();
        }
        
        const syncOptions = {
            timeout: this.config.syncTimeout,
            priority: 1,
            retries: 3,
            ...options
        };
        
        try {
            // Registrar operación de sincronización
            this.syncOperations.set(operationId, {
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
                        
                        try {
                            return await operationFn();
                        } finally {
                            // Liberar bloqueo
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
            const operation = this.syncOperations.get(operationId);
            if (operation) {
                operation.status = 'completed';
                operation.endTime = Date.now();
                operation.duration = operation.endTime - operation.startTime;
                operation.result = result;
            }
            
            return result;
            
        } catch (error) {
            // Actualizar estado de operación con error
            const operation = this.syncOperations.get(operationId);
            if (operation) {
                operation.status = 'failed';
                operation.endTime = Date.now();
                operation.duration = operation.endTime - operation.startTime;
                operation.error = error.message;
            }
            
            this.log(`Error en operación sincronizada ${operationId}:`, error);
            throw error;
            
        } finally {
            // Limpiar operación después de un tiempo
            setTimeout(() => {
                this.syncOperations.delete(operationId);
            }, 5000);
        }
    },
    
    // Ejecutar múltiples operaciones con barrera de sincronización
    executeWithBarrier: async function(operations, options = {}) {
        if (!this.state.syncInitialized) {
            // Fallback sin barrera
            return await Promise.all(operations.map(op => op()));
        }
        
        const barrierOptions = {
            timeout: this.config.syncTimeout,
            ...options
        };
        
        try {
            // Crear barrera para sincronizar operaciones
            const barrier = new this.state.concurrencyController.Barrier(
                operations.length,
                barrierOptions
            );
            
            // Ejecutar operaciones concurrentemente
            const promises = operations.map(async (operation, index) => {
                try {
                    const result = await this.executeWithSync(
                        `barrier-op-${index}`,
                        operation,
                        barrierOptions
                    );
                    
                    // Señalizar completion en barrera
                    barrier.await();
                    
                    return { index, result, success: true };
                } catch (error) {
                    barrier.await(); // Aun así señalar para no bloquear
                    return { index, error: error.message, success: false };
                }
            });
            
            // Esperar a que todas las operaciones completen
            const results = await Promise.all(promises);
            
            // Destruir barrera
            barrier.destroy();
            
            return results;
            
        } catch (error) {
            this.log('Error en ejecución con barrera:', error);
            throw error;
        }
    },
    
    // Obtener estado de sincronización
    getSyncStatus: function() {
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
            activeOperations: this.syncOperations.size,
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
    
    // Realizar mantenimiento de sincronización
    performSyncMaintenance: async function() {
        if (!this.state.syncInitialized) return;
        
        try {
            this.log('Realizando mantenimiento de sincronización...');
            
            // Limpiar operaciones expiradas
            const now = Date.now();
            for (const [operationId, operation] of this.syncOperations.entries()) {
                if (now - operation.startTime > this.config.syncTimeout * 2) {
                    this.syncOperations.delete(operationId);
                    this.log(`Operación expirada eliminada: ${operationId}`);
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
            
            this.log('Mantenimiento de sincronización completado');
            
        } catch (error) {
            this.log('Error en mantenimiento de sincronización:', error);
        }
    },
    
    // Inicializar caché principal
    initializeCoreCache: function() {
        // Esperar a que CacheManager esté disponible
        const initializeCache = () => {
            if (typeof window !== 'undefined' && window.CacheManager) {
                try {
                    // Crear instancia de caché para datos principales con sincronización
                    this.state.coreCache = new window.CacheManager({
                        name: 'justice2-core-cache',
                        strategy: 'multi-level',
                        ttl: 60 * 60 * 1000, // 1 hora por defecto
                        maxSize: 100, // 100 items
                        compression: true,
                        metrics: true,
                        cacheLevels: ['memory', 'localStorage', 'indexedDB'],
                        syncEnabled: this.config.syncEnabled,
                        syncManager: this.state.syncManager
                    });
                    
                    // Configurar estrategias específicas para datos principales
                    this.state.coreCache.configureStrategy('app-config', {
                        ttl: 24 * 60 * 60 * 1000, // 24 horas
                        strategy: 'persistent',
                        compression: true,
                        encryption: false // Config no es sensible
                    });
                    
                    this.state.coreCache.configureStrategy('user-preferences', {
                        ttl: 7 * 24 * 60 * 60 * 1000, // 7 días
                        strategy: 'persistent',
                        compression: true
                    });
                    
                    this.state.coreCache.configureStrategy('ui-state', {
                        ttl: 30 * 60 * 1000, // 30 minutos
                        strategy: 'lru',
                        maxSize: 50,
                        compression: true
                    });
                    
                    this.state.coreCache.configureStrategy('dynamic-content', {
                        ttl: 10 * 60 * 1000, // 10 minutos
                        strategy: 'multi-level',
                        compression: true,
                        refreshAhead: true,
                        refreshAheadThreshold: 0.8
                    });
                    
                    this.state.coreCache.configureStrategy('statistics', {
                        ttl: 15 * 60 * 1000, // 15 minutos
                        strategy: 'multi-level',
                        compression: true
                    });
                    
                    this.state.coreCache.configureStrategy('theme-assets', {
                        ttl: 24 * 60 * 60 * 1000, // 24 horas
                        strategy: 'persistent',
                        compression: true
                    });
                    
                    // Precargar datos críticos
                    this.preloadCriticalData();
                    
                    this.log('Sistema de caché principal inicializado');
                } catch (error) {
                    console.error('Error inicializando caché principal:', error);
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
        if (!this.state.coreCache) return;
        
        try {
            // Precargar configuración de la aplicación
            const appConfig = {
                version: this.config.version,
                debug: this.config.debug,
                animations: this.config.animations,
                autoRefresh: this.config.autoRefresh,
                refreshInterval: this.config.refreshInterval,
                apiBaseUrl: this.config.apiBaseUrl
            };
            
            await this.state.coreCache.set('app-config', appConfig, {
                strategy: 'app-config',
                tags: ['core', 'config'],
                priority: 1
            });
            
            // Precargar preferencias de usuario
            const userPreferences = {
                theme: localStorage.getItem('justice2-theme') || 'light',
                language: localStorage.getItem('justice2-language') || 'es',
                autoRefresh: localStorage.getItem('justice2-auto-refresh') !== 'false'
            };
            
            await this.state.coreCache.set('user-preferences', userPreferences, {
                strategy: 'user-preferences',
                tags: ['core', 'preferences'],
                priority: 2
            });
            
            this.log('Datos críticos precargados en caché principal');
        } catch (error) {
            this.log('Error en precarga de datos críticos:', error);
        }
    },
    
    // Obtener caché para una estrategia específica
    getCoreCacheForStrategy: function(strategy) {
        if (!this.state.coreCache) return null;
        
        try {
            return this.state.coreCache.getCache(strategy);
        } catch (error) {
            this.log('Error obteniendo caché principal para estrategia:', strategy, error);
            return null;
        }
    },
    
    // Cachear configuración de la aplicación
    cacheAppConfig: async function(config) {
        if (!this.state.coreCache) return;
        
        try {
            await this.executeWithSync('cache-app-config', async () => {
                await this.state.coreCache.set('app-config', config, {
                    strategy: 'app-config',
                    tags: ['core', 'config'],
                    priority: 1
                });
                
                this.log('Configuración de aplicación almacenada en caché con sincronización');
            }, {
                resource: 'core-cache-config',
                timeout: 5000
            });
        } catch (error) {
            this.log('Error almacenando configuración en caché:', error);
        }
    },
    
    // Obtener configuración de aplicación desde caché
    getCachedAppConfig: async function() {
        if (!this.state.coreCache) return null;
        
        try {
            return await this.executeWithSync('get-cached-app-config', async () => {
                const config = await this.state.coreCache.get('app-config', 'app-config');
                
                if (config) {
                    this.log('Configuración de aplicación obtenida desde caché con sincronización');
                    return config;
                }
                
                return null;
            }, {
                resource: 'core-cache-config',
                timeout: 3000
            });
        } catch (error) {
            this.log('Error obteniendo configuración desde caché:', error);
            return null;
        }
    },
    
    // Cachear preferencias de usuario
    cacheUserPreferences: async function(preferences) {
        if (!this.state.coreCache) return;
        
        try {
            await this.state.coreCache.set('user-preferences', preferences, {
                strategy: 'user-preferences',
                tags: ['core', 'preferences'],
                priority: 2
            });
            
            this.log('Preferencias de usuario almacenadas en caché');
        } catch (error) {
            this.log('Error almacenando preferencias en caché:', error);
        }
    },
    
    // Obtener preferencias de usuario desde caché
    getCachedUserPreferences: async function() {
        if (!this.state.coreCache) return null;
        
        try {
            const preferences = await this.state.coreCache.get('user-preferences', 'user-preferences');
            
            if (preferences) {
                this.log('Preferencias de usuario obtenidas desde caché');
                return preferences;
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo preferencias desde caché:', error);
            return null;
        }
    },
    
    // Cachear estado de UI
    cacheUIState: async function(state) {
        if (!this.state.coreCache) return;
        
        try {
            await this.state.coreCache.set('ui-state', state, {
                strategy: 'ui-state',
                ttl: 30 * 60 * 1000, // 30 minutos
                tags: ['core', 'ui', 'state'],
                priority: 3
            });
            
            this.log('Estado de UI almacenado en caché');
        } catch (error) {
            this.log('Error almacenando estado de UI en caché:', error);
        }
    },
    
    // Obtener estado de UI desde caché
    getCachedUIState: async function() {
        if (!this.state.coreCache) return null;
        
        try {
            const state = await this.state.coreCache.get('ui-state', 'ui-state');
            
            if (state) {
                this.log('Estado de UI obtenido desde caché');
                return state;
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo estado de UI desde caché:', error);
            return null;
        }
    },
    
    // Cachear contenido dinámico
    cacheDynamicContent: async function(key, content) {
        if (!this.state.coreCache) return;
        
        try {
            const cacheKey = `dynamic-content:${key}`;
            
            await this.state.coreCache.set(cacheKey, content, {
                strategy: 'dynamic-content',
                tags: ['core', 'dynamic', 'content'],
                priority: 4
            });
            
            this.log(`Contenido dinámico almacenado en caché: ${key}`);
        } catch (error) {
            this.log('Error almacenando contenido dinámico en caché:', error);
        }
    },
    
    // Obtener contenido dinámico desde caché
    getCachedDynamicContent: async function(key) {
        if (!this.state.coreCache) return null;
        
        try {
            const cacheKey = `dynamic-content:${key}`;
            const content = await this.state.coreCache.get(cacheKey, 'dynamic-content');
            
            if (content) {
                this.log(`Contenido dinámico obtenido desde caché: ${key}`);
                return content;
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo contenido dinámico desde caché:', error);
            return null;
        }
    },
    
    // Cachear estadísticas
    cacheStatistics: async function(statistics) {
        if (!this.state.coreCache) return;
        
        try {
            await this.state.coreCache.set('statistics', statistics, {
                strategy: 'statistics',
                tags: ['core', 'statistics'],
                priority: 5
            });
            
            this.log('Estadísticas almacenadas en caché');
        } catch (error) {
            this.log('Error almacenando estadísticas en caché:', error);
        }
    },
    
    // Obtener estadísticas desde caché
    getCachedStatistics: async function() {
        if (!this.state.coreCache) return null;
        
        try {
            const statistics = await this.state.coreCache.get('statistics', 'statistics');
            
            if (statistics) {
                this.log('Estadísticas obtenidas desde caché');
                return statistics;
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo estadísticas desde caché:', error);
            return null;
        }
    },
    
    // Invalidar caché principal por patrón
    invalidateCoreCacheByPattern: async function(pattern) {
        if (!this.state.coreCache) return;
        
        try {
            await this.state.coreCache.invalidateByPattern(pattern);
            this.log(`Caché principal invalidada por patrón: ${pattern}`);
        } catch (error) {
            this.log('Error invalidando caché principal por patrón:', error);
        }
    },
    
    // Limpiar toda la caché principal
    clearCoreCache: async function() {
        if (!this.state.coreCache) return;
        
        try {
            await this.state.coreCache.clear();
            this.log('Caché principal limpiada completamente');
        } catch (error) {
            this.log('Error limpiando caché principal:', error);
        }
    },
    
    // Obtener estadísticas de caché principal
    getCoreCacheStatistics: function() {
        if (!this.state.coreCache) return null;
        
        try {
            const metrics = this.state.coreCache.getMetrics();
            const health = this.state.coreCache.getHealth();
            
            return {
                metrics,
                health,
                strategies: this.state.coreCache.getStrategies(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.log('Error obteniendo estadísticas de caché principal:', error);
            return null;
        }
    },
    
    // Inicializar componentes
    initComponents: function() {
        // Inicializar tooltips
        if (typeof $ !== 'undefined' && $.fn.tooltip) {
            $('[data-toggle="tooltip"]').tooltip();
        }
        
        // Inicializar popovers
        if (typeof $ !== 'undefined' && $.fn.popover) {
            $('[data-toggle="popover"]').popover();
        }
        
        // Inicializar carousels
        this.initCarousels();
        
        // Inicializar navegación
        this.initNavigation();
    },
    
    // Inicializar eventos
    initEvents: function() {
        // Eventos de navegación
        document.addEventListener('DOMContentLoaded', () => {
            this.handlePageLoad();
        });
        
        // Eventos de scroll
        window.addEventListener('scroll', () => {
            this.handleScroll();
        });
        
        // Eventos de resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Eventos de error
        window.addEventListener('error', (e) => {
            this.handleError(e);
        });
        
        // Eventos de conexión
        window.addEventListener('online', () => {
            this.utils.showNotification('Conexión restaurada', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.utils.showNotification('Sin conexión a internet', 'error');
        });
    },
    
    // Inicializar carousels
    initCarousels: function() {
        // Carousel principal
        const headerCarousel = document.getElementById('header-carousel');
        if (headerCarousel) {
            // Configuración personalizada del carousel
            if (typeof $ !== 'undefined' && $(headerCarousel).carousel) {
                $(headerCarousel).carousel({
                    interval: 5000,
                    pause: 'hover',
                    wrap: true
                });
            }
        }
        
        // Carousel de servicios
        const serviceCarousel = document.querySelector('.service-carousel');
        if (serviceCarousel && typeof $ !== 'undefined' && $(serviceCarousel).owlCarousel) {
            $(serviceCarousel).owlCarousel({
                loop: true,
                margin: 30,
                nav: false,
                dots: true,
                autoplay: true,
                autoplayTimeout: 3000,
                autoplayHoverPause: true,
                responsive: {
                    0: { items: 1 },
                    768: { items: 2 },
                    992: { items: 3 },
                    1200: { items: 4 }
                }
            });
        }
        
        // Carousel de equipo
        const teamCarousel = document.querySelector('.team-carousel');
        if (teamCarousel && typeof $ !== 'undefined' && $(teamCarousel).owlCarousel) {
            $(teamCarousel).owlCarousel({
                loop: true,
                margin: 30,
                nav: false,
                dots: true,
                autoplay: true,
                autoplayTimeout: 4000,
                autoplayHoverPause: true,
                responsive: {
                    0: { items: 1 },
                    768: { items: 2 },
                    992: { items: 3 },
                    1200: { items: 5 }
                }
            });
        }
        
        // Carousel de testimonios
        const testimonialCarousel = document.querySelector('.testimonial-carousel');
        if (testimonialCarousel && typeof $ !== 'undefined' && $(testimonialCarousel).owlCarousel) {
            $(testimonialCarousel).owlCarousel({
                loop: true,
                margin: 30,
                nav: false,
                dots: true,
                autoplay: true,
                autoplayTimeout: 6000,
                autoplayHoverPause: true,
                responsive: {
                    0: { items: 1 },
                    768: { items: 2 },
                    992: { items: 3 }
                }
            });
        }
    },
    
    // Inicializar navegación
    initNavigation: function() {
        // Marcar enlace activo
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
        
        // Smooth scroll para anclas
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const href = this.getAttribute('href');
                
                // Ignorar enlaces vacíos o que solo son '#'
                if (!href || href === '#') return;
                
                try {
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                } catch (err) {
                    // Silenciar errores de selectores inválidos
                    console.debug('Selector inválido para scroll suave:', href);
                }
            });
        });
    },
    
    // Manejar carga de página
    handlePageLoad: function() {
        // Animar elementos al cargar
        const animatedElements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right');
        animatedElements.forEach((element, index) => {
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 100);
        });
        
        // Cargar contenido dinámico
        this.loadDynamicContent();
    },
    
    // Manejar scroll
    handleScroll: function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Back to top button
        const backToTop = document.querySelector('.back-to-top');
        if (backToTop) {
            if (scrollTop > 300) {
                backToTop.style.display = 'block';
            } else {
                backToTop.style.display = 'none';
            }
        }
        
        // Header sticky
        const header = document.querySelector('.navbar');
        if (header && scrollTop > 100) {
            header.classList.add('sticky-top');
        } else if (header) {
            header.classList.remove('sticky-top');
        }
    },
    
    // Manejar resize
    handleResize: function() {
        // Recalcular layouts si es necesario
        this.log('Window resized');
    },
    
    // Manejar errores
    handleError: function(error) {
        this.log('Error:', error);
        this.utils.showNotification('Ha ocurrido un error inesperado', 'error');
    },
    
    // Cargar contenido dinámico
    loadDynamicContent: async function() {
        if (this.state.syncInitialized) {
            // Cargar con sincronización
            await this.executeWithSync('load-dynamic-content', async () => {
                await this.executeWithBarrier([
                    () => this.loadRecentCases(),
                    () => this.loadActiveDocuments(),
                    () => this.loadStatistics()
                ]);
            }, {
                timeout: 15000
            });
        } else {
            // Fallback sin sincronización
            // Cargar casos recientes
            this.loadRecentCases();
            
            // Cargar documentos activos
            this.loadActiveDocuments();
            
            // Cargar estadísticas
            await this.loadStatistics();
        }
    },
    
    // Cargar casos recientes
    loadRecentCases: async function() {
        const container = document.getElementById('recent-cases');
        if (!container) return;
        
        this.utils.showLoading(container, 'Cargando casos recientes...');
        
        try {
            // Intentar obtener desde caché primero con sincronización
            if (this.state.coreCache) {
                const cachedCases = await this.getCachedDynamicContent('recent-cases');
                if (cachedCases) {
                    this.renderRecentCases(container, cachedCases);
                    this.utils.hideLoading(container);
                    this.log('Casos recientes cargados desde caché con sincronización');
                    return;
                }
            }
            
            // Simular carga de datos con sincronización
            await this.executeWithSync('load-recent-cases', async () => {
                return new Promise((resolve) => {
                    setTimeout(async () => {
                        const cases = [
                            { id: 1, title: 'Caso Laboral - Despido Improcedente', status: 'active', date: '2024-01-15' },
                            { id: 2, title: 'Caso Civil - Incumplimiento de Contrato', status: 'pending', date: '2024-01-14' },
                            { id: 3, title: 'Caso Familiar - Custodia Compartida', status: 'active', date: '2024-01-13' }
                        ];
                        
                        // Almacenar en caché con sincronización
                        if (this.state.coreCache) {
                            await this.cacheDynamicContent('recent-cases', cases);
                        }
                        
                        this.renderRecentCases(container, cases);
                        this.utils.hideLoading(container);
                        resolve(cases);
                    }, 1000);
                });
            }, {
                resource: 'recent-cases-data',
                timeout: 5000
            });
            
        } catch (error) {
            this.log('Error cargando casos recientes:', error);
            this.utils.hideLoading(container);
            this.utils.showNotification('Error cargando casos recientes', 'error');
        }
    },
    
    // Renderizar casos recientes (optimizado)
    renderRecentCases: function(container, cases) {
        // Usar sistema de renderizado optimizado si está disponible
        if (this.state.renderSystemInitialized && this.state.optimizedRenderer) {
            return this.renderRecentCasesOptimized(container, cases);
        }
        
        // Fallback al método original
        return this.renderRecentCasesLegacy(container, cases);
    },
    
    // Renderizado de casos recientes optimizado
    renderRecentCasesOptimized: function(container, cases) {
        const casesComponent = {
            id: `recent-cases_${Date.now()}`,
            type: 'cases-list',
            props: { cases },
            render: function(props) {
                if (!props.cases || props.cases.length === 0) {
                    return {
                        tag: 'div',
                        attributes: {
                            class: 'text-center py-3'
                        },
                        children: [
                            {
                                tag: 'i',
                                attributes: {
                                    class: 'fas fa-briefcase fa-2x text-muted mb-2'
                                }
                            },
                            {
                                tag: 'p',
                                attributes: {
                                    class: 'text-muted'
                                },
                                children: ['No hay casos recientes']
                            }
                        ]
                    };
                }
                
                const children = props.cases.map(caseItem => {
                    const statusClass = caseItem.status === 'active' ? 'status-active' : 'status-pending';
                    const statusText = caseItem.status === 'active' ? 'Activo' : 'Pendiente';
                    
                    // Validar y sanitizar datos del caso
                    const titleValidation = XSSProtection.validateInput(caseItem.title, {
                        type: 'text',
                        maxLength: 200,
                        allowEmpty: true
                    });
                    
                    return {
                        tag: 'div',
                        attributes: {
                            class: 'case-item'
                        },
                        children: [
                            {
                                tag: 'div',
                                attributes: {
                                    class: 'case-title'
                                },
                                children: [titleValidation.valid ? XSSProtection.escapeHtml(titleValidation.sanitized) : '']
                            },
                            {
                                tag: 'small',
                                attributes: {
                                    class: 'text-muted'
                                },
                                children: [XSSProtection.escapeHtml(Justice2.utils.formatDate(caseItem.date))]
                            },
                            {
                                tag: 'span',
                                attributes: {
                                    class: `case-status ${statusClass}`
                                },
                                children: [XSSProtection.escapeHtml(statusText)]
                            }
                        ]
                    };
                });
                
                return {
                    tag: 'div',
                    children: children
                };
            }
        };
        
        // Renderizar usando el sistema optimizado
        return this.state.optimizedRenderer.render(casesComponent, container);
    },
    
    // Renderizado de casos recientes legacy (fallback)
    renderRecentCasesLegacy: function(container, cases) {
        let html = '';
        cases.forEach(caseItem => {
            const statusClass = caseItem.status === 'active' ? 'status-active' : 'status-pending';
            const statusText = caseItem.status === 'active' ? 'Activo' : 'Pendiente';
            
            // Validar y sanitizar datos del caso
            const titleValidation = XSSProtection.validateInput(caseItem.title, {
                type: 'text',
                maxLength: 200,
                allowEmpty: true
            });
            
            html += `
                <div class="case-item">
                    <div class="case-title">${titleValidation.valid ? XSSProtection.escapeHtml(titleValidation.sanitized) : ''}</div>
                    <small class="text-muted">${XSSProtection.escapeHtml(this.utils.formatDate(caseItem.date))}</small>
                    <span class="case-status ${statusClass}">${XSSProtection.escapeHtml(statusText)}</span>
                </div>
            `;
        });
        
        XSSProtection.setInnerHTMLSafe(container, html);
    },
    
    // Cargar documentos activos
    loadActiveDocuments: async function() {
        const container = document.getElementById('active-documents');
        if (!container) return;
        
        this.utils.showLoading(container, 'Cargando documentos activos...');
        
        try {
            // Intentar obtener desde caché primero con sincronización
            if (this.state.coreCache) {
                const cachedDocuments = await this.getCachedDynamicContent('active-documents');
                if (cachedDocuments) {
                    this.renderActiveDocuments(container, cachedDocuments);
                    this.utils.hideLoading(container);
                    this.log('Documentos activos cargados desde caché con sincronización');
                    return;
                }
            }
            
            // Simular carga de datos con sincronización
            await this.executeWithSync('load-active-documents', async () => {
                return new Promise((resolve) => {
                    setTimeout(async () => {
                        const documents = [
                            { id: 1, title: 'Demanda Laboral', type: 'PDF', size: '2.5 MB', date: '2024-01-15' },
                            { id: 2, title: 'Contrato de Arrendamiento', type: 'DOCX', size: '1.2 MB', date: '2024-01-14' },
                            { id: 3, title: 'Escritura de Propiedad', type: 'PDF', size: '3.8 MB', date: '2024-01-13' }
                        ];
                        
                        // Almacenar en caché con sincronización
                        if (this.state.coreCache) {
                            await this.cacheDynamicContent('active-documents', documents);
                        }
                        
                        this.renderActiveDocuments(container, documents);
                        this.utils.hideLoading(container);
                        resolve(documents);
                    }, 1200);
                });
            }, {
                resource: 'active-documents-data',
                timeout: 6000
            });
            
        } catch (error) {
            this.log('Error cargando documentos activos:', error);
            this.utils.hideLoading(container);
            this.utils.showNotification('Error cargando documentos activos', 'error');
        }
    },
    
    // Renderizar documentos activos
    renderActiveDocuments: function(container, documents) {
        let html = '';
        documents.forEach(doc => {
            // Validar y sanitizar datos del documento
            const titleValidation = XSSProtection.validateInput(doc.title, {
                type: 'text',
                maxLength: 200,
                allowEmpty: true
            });
            
            const typeValidation = XSSProtection.validateInput(doc.type, {
                type: 'text',
                maxLength: 20,
                allowEmpty: true
            });
            
            const sizeValidation = XSSProtection.validateInput(doc.size, {
                type: 'text',
                maxLength: 20,
                allowEmpty: true
            });
            
            html += `
                <div class="document-item">
                    <div class="document-info">
                        <div class="document-title">${titleValidation.valid ? XSSProtection.escapeHtml(titleValidation.sanitized) : ''}</div>
                        <div class="document-meta">
                            <span class="badge badge-secondary">${typeValidation.valid ? XSSProtection.escapeHtml(typeValidation.sanitized) : ''}</span>
                            <span class="ml-2">${sizeValidation.valid ? XSSProtection.escapeHtml(sizeValidation.sanitized) : ''}</span>
                            <span class="ml-2">${XSSProtection.escapeHtml(this.utils.formatDate(doc.date))}</span>
                        </div>
                    </div>
                    <div class="document-actions">
                        <button class="btn btn-sm btn-outline-primary btn-sm-square" title="Ver">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary btn-sm-square" title="Descargar">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        XSSProtection.setInnerHTMLSafe(container, html);
    },
    
    // Cargar estadísticas
    loadStatistics: async function() {
        const container = document.getElementById('statistics');
        if (!container) return;
        
        this.utils.showLoading(container, 'Cargando estadísticas...');
        
        try {
            // Intentar obtener desde caché primero con sincronización
            if (this.state.coreCache) {
                const cachedStats = await this.getCachedStatistics();
                if (cachedStats) {
                    this.renderStatistics(container, cachedStats);
                    this.utils.hideLoading(container);
                    this.log('Estadísticas cargadas desde caché con sincronización');
                    return;
                }
            }
            
            // Simular carga de datos con sincronización
            await this.executeWithSync('load-statistics', async () => {
                return new Promise((resolve) => {
                    setTimeout(async () => {
                        const stats = [
                            { label: 'Casos Activos', value: 47, icon: 'fa-briefcase' },
                            { label: 'Documentos', value: 234, icon: 'fa-file-alt' },
                            { label: 'Clientes', value: 89, icon: 'fa-users' }
                        ];
                        
                        // Almacenar en caché con sincronización
                        if (this.state.coreCache) {
                            await this.cacheStatistics(stats);
                        }
                        
                        this.renderStatistics(container, stats);
                        this.utils.hideLoading(container);
                        resolve(stats);
                    }, 800);
                });
            }, {
                resource: 'statistics-data',
                timeout: 4000
            });
            
        } catch (error) {
            this.log('Error cargando estadísticas:', error);
            this.utils.hideLoading(container);
            this.utils.showNotification('Error cargando estadísticas', 'error');
        }
    },
    
    // Renderizar estadísticas
    renderStatistics: function(container, stats) {
        let html = '';
        stats.forEach(stat => {
                // Validar y sanitizar datos de estadísticas
                const labelValidation = XSSProtection.validateInput(stat.label, {
                    type: 'text',
                    maxLength: 50,
                    allowEmpty: true
                });
                
                html += `
                    <div class="stat-item">
                        <i class="fas ${XSSProtection.escapeHtml(stat.icon)} fa-2x text-primary mb-2"></i>
                        <span class="stat-number" data-target="${stat.value}">0</span>
                        <div class="stat-label">${labelValidation.valid ? XSSProtection.escapeHtml(labelValidation.sanitized) : ''}</div>
                    </div>
                `;
        });
        
        XSSProtection.setInnerHTMLSafe(container, html);
        
        // Animar contadores
        container.querySelectorAll('.stat-number').forEach(element => {
            const target = parseInt(element.dataset.target);
            this.utils.animateCounter(element, target);
        });
    },
    
    // Inicializar actualización automática
    initAutoRefresh: function() {
        const refreshInterval = setInterval(async () => {
            this.log('Actualizando contenido automáticamente...');
            
            try {
                // Realizar mantenimiento de sincronización periódico
                if (this.state.syncInitialized) {
                    await this.performSyncMaintenance();
                }
                
                // Cargar contenido dinámico
                await this.loadDynamicContent();
                
            } catch (error) {
                this.log('Error en actualización automática:', error);
            }
        }, this.config.refreshInterval);
        
        // Guardar referencia para limpieza
        this.intervals.push(refreshInterval);
    },
    
    // Cargar estado guardado
    loadState: async function() {
        // Intentar obtener desde caché primero
        if (this.state.coreCache) {
            try {
                const cachedPreferences = await this.getCachedUserPreferences();
                if (cachedPreferences) {
                    // Aplicar preferencias desde caché
                    this.state.theme = cachedPreferences.theme || 'light';
                    this.state.language = cachedPreferences.language || 'es';
                    this.config.autoRefresh = cachedPreferences.autoRefresh !== false;
                    
                    this.log('Estado cargado desde caché principal');
                }
            } catch (error) {
                this.log('Error cargando estado desde caché:', error);
            }
        }
        
        // Fallback a localStorage
        const savedState = localStorage.getItem('justice2_state');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                this.state = { ...this.state, ...state };
            } catch (e) {
                this.log('Error al cargar estado:', e);
            }
        }
    },
    
    // Guardar estado
    saveState: async function() {
        // Guardar en localStorage (fallback)
        localStorage.setItem('justice2_state', JSON.stringify(this.state));
        
        // Guardar preferencias en caché
        if (this.state.coreCache) {
            try {
                const preferences = {
                    theme: this.state.theme,
                    language: this.state.language,
                    autoRefresh: this.config.autoRefresh
                };
                
                await this.cacheUserPreferences(preferences);
                this.log('Estado guardado en caché principal');
            } catch (error) {
                this.log('Error guardando estado en caché:', error);
            }
        }
    },
    
    // Función de limpieza para prevenir memory leaks
    cleanup: async function() {
        this.log('Iniciando limpieza de recursos...');
        
        try {
            // Limpiar operaciones de sincronización activas
            for (const [operationId, operation] of this.syncOperations.entries()) {
                if (operation.status === 'running') {
                    this.log(`Cancelando operación activa: ${operationId}`);
                    // Marcar como cancelada
                    operation.status = 'cancelled';
                    operation.endTime = Date.now();
                }
            }
            this.syncOperations.clear();
            
            // Limpiar sistema de sincronización
            if (this.state.syncInitialized) {
                if (this.state.syncManager) {
                    await this.state.syncManager.cleanup();
                }
                
                if (this.state.concurrencyController) {
                    await this.state.concurrencyController.cleanup();
                }
                
                if (this.state.syncDiagnostics) {
                    await this.state.syncDiagnostics.cleanup();
                }
            }
            
            // Limpiar todos los intervalos
            this.utils.clearAllIntervals();
            
            // Limpiar todos los event listeners
            this.utils.removeAllEventListeners();
            
            // Limpiar estado
            this.state = {
                user: null,
                isAuthenticated: false,
                currentPage: null,
                theme: 'light',
                language: 'es',
                coreCache: null,
                syncManager: null,
                concurrencyController: null,
                syncDiagnostics: null,
                syncInitialized: false
            };
            
            this.log('Limpieza de recursos completada con sincronización');
            
        } catch (error) {
            this.log('Error en limpieza de recursos:', error);
        }
    },
    
    // Logging
    log: function(...args) {
        if (this.config.debug) {
            console.log('[Justice2]', ...args);
        }
    },
    
    // Método para optimizar caché principal automáticamente
    optimizeCoreCache: async function() {
        if (!this.state.coreCache) return;
        
        try {
            await this.state.coreCache.optimize();
            this.log('Caché principal optimizada automáticamente');
        } catch (error) {
            this.log('Error optimizando caché principal:', error);
        }
    },
    
    // Método para obtener estadísticas detalladas de uso de caché principal
    getDetailedCoreCacheStatistics: function() {
        if (!this.state.coreCache) return null;
        
        try {
            const baseStats = this.getCoreCacheStatistics();
            
            // Agregar estadísticas específicas del core
            const coreStats = {
                cacheHitRate: this.calculateCoreCacheHitRate(),
                mostAccessedContent: this.getMostAccessedContent(),
                cacheSizeByType: this.getCoreCacheSizeByType(),
                lastCacheUpdate: new Date().toISOString()
            };
            
            return {
                ...baseStats,
                core: coreStats
            };
        } catch (error) {
            this.log('Error obteniendo estadísticas detalladas de caché principal:', error);
            return null;
        }
    },
    
    // Calcular tasa de aciertos de caché principal (simulado para demostración)
    calculateCoreCacheHitRate: function() {
        if (!this.state.coreCache) return 0;
        
        try {
            const metrics = this.state.coreCache.getMetrics();
            return metrics.hitRate || 0;
        } catch (error) {
            return 0;
        }
    },
    
    // Obtener contenido más accedido (simulado para demostración)
    getMostAccessedContent: function() {
        // En una implementación real, esto se basaría en métricas de acceso
        return [
            { key: 'recent-cases', accessCount: 45 },
            { key: 'active-documents', accessCount: 32 },
            { key: 'statistics', accessCount: 28 }
        ];
    },
    
    // Obtener tamaño de caché principal por tipo (simulado para demostración)
    getCoreCacheSizeByType: function() {
        // En una implementación real, esto se basaría en métricas reales
        return {
            'app-config': 1024,
            'user-preferences': 512,
            'ui-state': 2048,
            'dynamic-content': 4096,
            'statistics': 1536
        };
    },
    
    // Obtener estadísticas de sincronización
    getSyncStatistics: function() {
        if (!this.state.syncInitialized) {
            return null;
        }
        
        const stats = {
            operations: {
                total: this.syncOperations.size,
                running: Array.from(this.syncOperations.values()).filter(op => op.status === 'running').length,
                completed: Array.from(this.syncOperations.values()).filter(op => op.status === 'completed').length,
                failed: Array.from(this.syncOperations.values()).filter(op => op.status === 'failed').length
            },
            syncManager: this.state.syncManager ? this.state.syncManager.getMetrics() : null,
            concurrencyController: this.state.concurrencyController ? this.state.concurrencyController.getMetrics() : null,
            syncDiagnostics: this.state.syncDiagnostics ? this.state.syncDiagnostics.getHealth() : null
        };
        
        return stats;
    }
};

// Integración con el sistema principal
if (window.Justice2) {
    // Preservar la configuración global existente (que es más completa)
    const globalConfig = window.Justice2.config;
    
    // Fusionar todo el Core en el objeto global Justice2
    // Esto asegura que init(), loadDynamicContent(), etc. estén disponibles
    Object.assign(window.Justice2, Justice2Core);
    
    // Restaurar la configuración global (para no sobrescribirla con la básica del Core)
    window.Justice2.config = globalConfig;
    
    // Exponer Core explícitamente también
    window.Justice2Core = Justice2Core;
    
    // Integrar utilidades (redundante si hicimos Object.assign, pero seguro)
    window.Justice2.utils = Justice2Core.utils;
    
    // Inicializar arrays globales para que las utilidades funcionen
    window.Justice2.intervals = window.Justice2.intervals || [];
    window.Justice2.eventListeners = window.Justice2.eventListeners || [];
    
    // Integrar métodos para compatibilidad con Justice2Auth
    window.Justice2.saveState = function() {
        const mergedState = { ...Justice2Core.state, ...window.Justice2.state };
        localStorage.setItem('justice2_state', JSON.stringify(mergedState));
    };
    
    // Exponer métodos de sincronización
    window.Justice2.getSyncStatus = Justice2Core.getSyncStatus;
    window.Justice2.getSyncStatistics = Justice2Core.getSyncStatistics;
    window.Justice2.executeWithSync = Justice2Core.executeWithSync;
    window.Justice2.performSyncMaintenance = Justice2Core.performSyncMaintenance;
    
    // Inicializar Justice 2 (Config) cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.Justice2.init();
        });
    } else {
        window.Justice2.init();
    }
} else {
    // Fallback: Si no existe Justice2 global (config), usamos este como principal
    window.Justice2 = Justice2Core;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            Justice2Core.init();
        });
    } else {
        Justice2Core.init();
    }
}

// Exportar para uso global
window.Justice2 = Justice2;