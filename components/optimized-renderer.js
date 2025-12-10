/**
 * Justice 2 Optimized Renderer
 * Motor de renderizado optimizado que integra todos los sistemas de optimización
 * Proporciona renderizado de alto rendimiento con múltiples estrategias
 */

const OptimizedRenderer = {
    // Configuración
    config: {
        enableOptimization: true,
        enableVirtualDOM: true,
        enableBatching: true,
        enableLazyLoading: true,
        enableMemoization: true,
        enableSmartComponents: true,
        enablePerformanceMonitoring: true,
        enableAdaptiveRendering: true,
        enableErrorRecovery: true,
        targetFPS: 60,
        maxRenderTime: 16.67, // ms para 60fps
        enableMetrics: true,
        enableProfiling: false,
        enableDebugMode: false,
        maxConcurrentRenders: 3,
        enableRenderQueue: true,
        enablePrioritization: true,
        enableDependencyResolution: true
    },

    // Estado
    state: {
        isInitialized: false,
        renderQueue: [],
        processingQueue: [],
        completedRenders: [],
        failedRenders: [],
        renderStrategies: new Map(),
        componentRegistry: new Map(),
        renderCache: new Map(),
        performanceMetrics: {
            totalRenders: 0,
            totalRenderTime: 0,
            averageRenderTime: 0,
            maxRenderTime: 0,
            minRenderTime: Infinity,
            fps: 0,
            droppedFrames: 0,
            cacheHitRate: 0,
            optimizationRate: 0,
            errorRate: 0
        },
        adaptiveSettings: {
            batchSize: 10,
            batchTimeout: 16,
            enableVirtualDOM: true,
            enableMemoization: true,
            enableBatching: true
        },
        renderScheduler: {
            currentFrame: 0,
            frameStartTime: 0,
            renderOperations: [],
            isProcessing: false
        },
        errorRecovery: {
            retryCount: new Map(),
            lastError: new Map(),
            backoffMultiplier: 1.5
        },
        optimizationHistory: [],
        renderProfiles: new Map()
    },

    /**
     * Inicializar Optimized Renderer
     */
    init: async function(customConfig = {}) {
        if (this.state.isInitialized) return;

        this.config = { ...this.config, ...customConfig };
        
        // Inicializar subsistemas
        await this.initializeRenderStrategies();
        await this.initializeComponentRegistry();
        await this.initializeRenderCache();
        await this.initializeRenderQueue();
        await this.initializePerformanceMonitoring();
        await this.initializeErrorRecovery();
        
        // Iniciar scheduler de renderizado
        this.startRenderScheduler();
        
        this.state.isInitialized = true;
        this.log('Optimized Renderer inicializado con motor de renderizado optimizado');
    },

    /**
     * Inicializar estrategias de renderizado
     */
    initializeRenderStrategies: async function() {
        // Estrategia de renderizado rápido
        this.state.renderStrategies.set('fast', {
            priority: 1,
            shouldUse: this.shouldUseFastStrategy.bind(this),
            render: this.renderWithFastStrategy.bind(this)
        });

        // Estrategia de renderizado optimizado
        this.state.renderStrategies.set('optimized', {
            priority: 2,
            shouldUse: this.shouldUseOptimizedStrategy.bind(this),
            render: this.renderWithOptimizedStrategy.bind(this)
        });

        // Estrategia de renderizado con caché
        this.state.renderStrategies.set('cached', {
            priority: 3,
            shouldUse: this.shouldUseCachedStrategy.bind(this),
            render: this.renderWithCachedStrategy.bind(this)
        });

        // Estrategia de renderizado lazy
        this.state.renderStrategies.set('lazy', {
            priority: 4,
            shouldUse: this.shouldUseLazyStrategy.bind(this),
            render: this.renderWithLazyStrategy.bind(this)
        });

        this.log('Estrategias de renderizado inicializadas');
    },

    /**
     * Inicializar registro de componentes
     */
    initializeComponentRegistry: async function() {
        this.state.componentRegistry = new Map();
        this.log('Registro de componentes inicializado');
    },

    /**
     * Inicializar caché de renderizado
     */
    initializeRenderCache: async function() {
        this.state.renderCache = new Map();
        this.log('Caché de renderizado inicializada');
    },

    /**
     * Inicializar cola de renderizado
     */
    initializeRenderQueue: async function() {
        this.state.renderQueue = [];
        this.state.processingQueue = [];
        this.state.completedRenders = [];
        this.state.failedRenders = [];
        this.log('Cola de renderizado inicializada');
    },

    /**
     * Inicializar monitoreo de rendimiento
     */
    initializePerformanceMonitoring: async function() {
        if (!this.config.enablePerformanceMonitoring) return;

        // Iniciar monitoreo de FPS
        this.startFPSMonitoring();
        
        // Iniciar recolección de métricas
        this.startMetricsCollection();
        
        this.log('Monitoreo de rendimiento inicializado');
    },

    /**
     * Inicializar recuperación de errores
     */
    initializeErrorRecovery: async function() {
        if (!this.config.enableErrorRecovery) return;

        this.state.errorRecovery.retryCount = new Map();
        this.state.errorRecovery.lastError = new Map();
        
        this.log('Recuperación de errores inicializada');
    },

    /**
     * Renderizar componente
     */
    render: async function(componentType, props = {}, options = {}) {
        if (!this.state.isInitialized) {
            await this.init();
        }

        const renderId = this.generateRenderId();
        const startTime = performance.now();

        const renderRequest = {
            id: renderId,
            componentType,
            props,
            options,
            startTime,
            status: 'queued',
            priority: options.priority || 'normal',
            strategy: null,
            result: null,
            error: null,
            renderTime: 0
        };

        try {
            // Determinar estrategia de renderizado
            const strategy = this.determineRenderStrategy(renderRequest);
            renderRequest.strategy = strategy;

            // Agregar a cola apropiada
            if (options.immediate) {
                return await this.executeRender(renderRequest);
            } else {
                this.state.renderQueue.push(renderRequest);
                this.processRenderQueue();
            }

        } catch (error) {
            renderRequest.status = 'failed';
            renderRequest.error = error;
            this.state.failedRenders.push(renderRequest);
            
            // Intentar recuperación si está habilitada
            if (this.config.enableErrorRecovery) {
                await this.attemptErrorRecovery(renderRequest, error);
            }
            
            throw error;
        }

        return renderId;
    },

    /**
     * Generar ID único de renderizado
     */
    generateRenderId: function() {
        return `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Determinar estrategia de renderizado
     */
    determineRenderStrategy: function(renderRequest) {
        // Evaluar estrategias en orden de prioridad
        for (const [strategyName, strategy] of this.state.renderStrategies.entries()) {
            if (strategy.shouldUse(renderRequest)) {
                return strategyName;
            }
        }

        return 'fast'; // Estrategia por defecto
    },

    /**
     * Verificar si se debe usar estrategia rápida
     */
    shouldUseFastStrategy: function(renderRequest) {
        // Usar estrategia rápida para componentes simples o renderizados inmediatos
        return renderRequest.options.immediate || 
               renderRequest.options.priority === 'high' ||
               this.isSimpleComponent(renderRequest.componentType);
    },

    /**
     * Verificar si se debe usar estrategia optimizada
     */
    shouldUseOptimizedStrategy: function(renderRequest) {
        // Usar estrategia optimizada para componentes complejos
        return this.isComplexComponent(renderRequest.componentType) ||
               renderRequest.options.optimize === true;
    },

    /**
     * Verificar si se debe usar estrategia con caché
     */
    shouldUseCachedStrategy: function(renderRequest) {
        // Usar estrategia con caché si está disponible y es apropiado
        const cacheKey = this.generateCacheKey(renderRequest.componentType, renderRequest.props);
        return this.state.renderCache.has(cacheKey) && 
               !renderRequest.options.forceRender;
    },

    /**
     * Verificar si se debe usar estrategia lazy
     */
    shouldUseLazyStrategy: function(renderRequest) {
        // Usar estrategia lazy si está habilitado y es apropiado
        return this.config.enableLazyLoading && 
               renderRequest.options.lazy === true &&
               !this.isCriticalComponent(renderRequest.componentType);
    },

    /**
     * Verificar si es un componente simple
     */
    isSimpleComponent: function(componentType) {
        // Componentes simples tienen menos props y estructura simple
        const simpleComponents = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'img', 'button'];
        return simpleComponents.includes(componentType);
    },

    /**
     * Verificar si es un componente complejo
     */
    isComplexComponent: function(componentType) {
        // Componentes complejos tienen muchos hijos o lógica compleja
        const complexComponents = ['table', 'form', 'list', 'grid', 'chart', 'dashboard'];
        return complexComponents.includes(componentType);
    },

    /**
     * Verificar si es un componente crítico
     */
    isCriticalComponent: function(componentType) {
        // Componentes críticos deben renderizarse inmediatamente
        const criticalComponents = ['navbar', 'sidebar', 'header', 'footer'];
        return criticalComponents.includes(componentType);
    },

    /**
     * Ejecutar renderizado
     */
    executeRender: async function(renderRequest) {
        const strategy = this.state.renderStrategies.get(renderRequest.strategy);
        
        if (!strategy) {
            throw new Error(`Estrategia de renderizado no encontrada: ${renderRequest.strategy}`);
        }

        renderRequest.status = 'processing';
        renderRequest.startTime = performance.now();

        try {
            // Ejecutar renderizado con estrategia específica
            const result = await strategy.render(renderRequest);
            
            renderRequest.status = 'completed';
            renderRequest.result = result;
            renderRequest.renderTime = performance.now() - renderRequest.startTime;

            // Actualizar métricas
            this.updateRenderMetrics(renderRequest);

            // Mover a cola de completados
            this.state.completedRenders.push(renderRequest);

            return result;

        } catch (error) {
            renderRequest.status = 'failed';
            renderRequest.error = error;
            renderRequest.renderTime = performance.now() - renderRequest.startTime;

            // Mover a cola de fallidos
            this.state.failedRenders.push(renderRequest);

            // Actualizar métricas de error
            this.updateErrorMetrics();

            throw error;
        }
    },

    /**
     * Renderizar con estrategia rápida
     */
    renderWithFastStrategy: async function(renderRequest) {
        // Renderizado directo sin optimizaciones
        const component = this.createComponent(renderRequest.componentType, renderRequest.props);
        return this.renderToDOM(component);
    },

    /**
     * Renderizar con estrategia optimizada
     */
    renderWithOptimizedStrategy: async function(renderRequest) {
        // Usar Virtual DOM si está disponible
        if (this.config.enableVirtualDOM && typeof window !== 'undefined' && window.VirtualDOM) {
            const component = this.createComponent(renderRequest.componentType, renderRequest.props);
            const container = this.getOrCreateContainer(renderRequest);
            return await window.VirtualDOM.render(component, container);
        }

        // Fallback a renderizado rápido
        return await this.renderWithFastStrategy(renderRequest);
    },

    /**
     * Renderizar con estrategia con caché
     */
    renderWithCachedStrategy: async function(renderRequest) {
        const cacheKey = this.generateCacheKey(renderRequest.componentType, renderRequest.props);
        const cached = this.state.renderCache.get(cacheKey);

        if (cached && !this.isCacheExpired(cached)) {
            // Actualizar último acceso
            cached.lastAccess = Date.now();
            cached.accessCount++;
            
            return cached.result;
        }

        // Renderizar y almacenar en caché
        const result = await this.renderWithOptimizedStrategy(renderRequest);
        
        this.state.renderCache.set(cacheKey, {
            result,
            timestamp: Date.now(),
            lastAccess: Date.now(),
            accessCount: 1,
            expiresAt: Date.now() + this.calculateCacheTTL(renderRequest)
        });

        return result;
    },

    /**
     * Renderizar con estrategia lazy
     */
    renderWithLazyStrategy: async function(renderRequest) {
        // Usar LazyRenderer si está disponible
        if (this.config.enableLazyLoading && typeof window !== 'undefined' && window.LazyRenderer) {
            const element = this.getOrCreateContainer(renderRequest);
            const lazyId = window.LazyRenderer.register(
                renderRequest.id,
                element,
                () => this.createComponent(renderRequest.componentType, renderRequest.props),
                renderRequest.options
            );
            
            return { lazyId, element };
        }

        // Fallback a renderizado optimizado
        return await this.renderWithOptimizedStrategy(renderRequest);
    },

    /**
     * Crear componente
     */
    createComponent: function(componentType, props) {
        // Si es un componente de SmartComponent
        if (this.config.enableSmartComponents && typeof window !== 'undefined' && window.SmartComponent) {
            const smartComponent = window.SmartComponent.create({ 
                type: componentType, 
                props 
            });
            return smartComponent;
        }

        // Componente genérico
        return {
            type: componentType,
            props: props,
            children: this.generateChildren(componentType, props)
        };
    },

    /**
     * Generar hijos para componente
     */
    generateChildren: function(componentType, props) {
        if (props.children) {
            return props.children;
        }

        // Generar hijos por defecto según tipo
        switch (componentType) {
            case 'ul':
            case 'ol':
                return (props.items || []).map((item, index) => ({
                    type: 'li',
                    props: { key: index },
                    children: typeof item === 'string' ? item : item.toString()
                }));
            
            case 'table':
                return [
                    {
                        type: 'thead',
                        children: [
                            {
                                type: 'tr',
                                children: (props.headers || []).map((header, index) => ({
                                    type: 'th',
                                    props: { key: index },
                                    children: header
                                }))
                            }
                        ]
                    },
                    {
                        type: 'tbody',
                        children: (props.rows || []).map((row, rowIndex) => ({
                            type: 'tr',
                            props: { key: rowIndex },
                            children: row.map((cell, cellIndex) => ({
                                type: 'td',
                                props: { key: cellIndex },
                                children: cell
                            }))
                        }))
                    }
                ];
            
            default:
                return [];
        }
    },

    /**
     * Renderizar a DOM
     */
    renderToDOM: function(component) {
        // Si es un nodo del DOM real
        if (component instanceof Node) {
            return component;
        }

        // Crear elemento DOM
        const element = document.createElement(component.type);
        
        // Aplicar props
        if (component.props) {
            for (const [prop, value] of Object.entries(component.props)) {
                if (prop.startsWith('on') && typeof value === 'function') {
                    const eventName = prop.toLowerCase().substring(2);
                    element.addEventListener(eventName, value);
                } else if (prop === 'className') {
                    element.className = value;
                } else if (prop === 'style' && typeof value === 'object') {
                    Object.assign(element.style, value);
                } else {
                    element.setAttribute(prop, value);
                }
            }
        }

        // Agregar hijos
        if (component.children) {
            const children = Array.isArray(component.children) 
                ? component.children 
                : [component.children];

            for (const child of children) {
                if (typeof child === 'string' || typeof child === 'number') {
                    element.appendChild(document.createTextNode(child));
                } else if (child && child.type) {
                    element.appendChild(this.renderToDOM(child));
                }
            }
        }

        return element;
    },

    /**
     * Obtener o crear contenedor
     */
    getOrCreateContainer: function(renderRequest) {
        if (renderRequest.options.container) {
            return renderRequest.options.container;
        }

        // Crear contenedor temporal
        const container = document.createElement('div');
        container.id = `render-container-${renderRequest.id}`;
        container.style.display = 'none';
        document.body.appendChild(container);
        
        return container;
    },

    /**
     * Generar clave de caché
     */
    generateCacheKey: function(componentType, props) {
        const propsHash = this.hashObject(props);
        return `${componentType}:${propsHash}`;
    },

    /**
     * Hashear objeto
     */
    hashObject: function(obj) {
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        let hash = 0;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString(36);
    },

    /**
     * Verificar si caché ha expirado
     */
    isCacheExpired: function(cached) {
        return Date.now() > cached.expiresAt;
    },

    /**
     * Calcular TTL de caché
     */
    calculateCacheTTL: function(renderRequest) {
        // TTL basado en tipo de componente y prioridad
        let ttl = 60000; // 1 minuto por defecto

        if (renderRequest.options.priority === 'high') {
            ttl = 30000; // 30 segundos para alta prioridad
        } else if (renderRequest.options.priority === 'low') {
            ttl = 300000; // 5 minutos para baja prioridad
        }

        return ttl;
    },

    /**
     * Procesar cola de renderizado
     */
    processRenderQueue: function() {
        if (this.state.renderScheduler.isProcessing) return;

        const processingCount = this.state.processingQueue.length;
        const maxConcurrent = this.config.maxConcurrentRenders;

        if (processingCount >= maxConcurrent) return;

        // Tomar renders de la cola
        const availableSlots = maxConcurrent - processingCount;
        const toProcess = this.state.renderQueue.splice(0, availableSlots);

        if (toProcess.length === 0) return;

        // Agregar a cola de procesamiento
        this.state.processingQueue.push(...toProcess);

        // Procesar en paralelo
        const promises = toProcess.map(renderRequest => 
            this.executeRender(renderRequest)
        );

        Promise.allSettled(promises).then(results => {
            // Mover de cola de procesamiento
            for (const renderRequest of toProcess) {
                const index = this.state.processingQueue.indexOf(renderRequest);
                if (index > -1) {
                    this.state.processingQueue.splice(index, 1);
                }
            }
        });
    },

    /**
     * Iniciar scheduler de renderizado
     */
    startRenderScheduler: function() {
        if (!this.config.enableRenderQueue) return;

        setInterval(() => {
            this.processRenderQueue();
        }, this.state.adaptiveSettings.batchTimeout);
    },

    /**
     * Iniciar monitoreo de FPS
     */
    startFPSMonitoring: function() {
        let lastTime = performance.now();
        let frameCount = 0;

        const measureFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;

            if (deltaTime >= 1000) {
                this.state.performanceMetrics.fps = Math.round((frameCount * 1000) / deltaTime);
                frameCount = 0;
                lastTime = currentTime;

                // Detectar frames dropped
                if (this.state.performanceMetrics.fps < this.config.targetFPS * 0.8) {
                    this.state.performanceMetrics.droppedFrames++;
                }
            }

            requestAnimationFrame(measureFPS);
        };

        requestAnimationFrame(measureFPS);
    },

    /**
     * Iniciar recolección de métricas
     */
    startMetricsCollection: function() {
        setInterval(() => {
            this.collectMetrics();
        }, 5000); // Cada 5 segundos
    },

    /**
     * Recolectar métricas
     */
    collectMetrics: function() {
        const totalRenders = this.state.completedRenders.length + this.state.failedRenders.length;
        
        if (totalRenders > 0) {
            const successfulRenders = this.state.completedRenders.length;
            const failedRenders = this.state.failedRenders.length;
            
            // Calcular tasas
            this.state.performanceMetrics.errorRate = (failedRenders / totalRenders) * 100;
            this.state.performanceMetrics.cacheHitRate = this.calculateCacheHitRate();
            this.state.performanceMetrics.optimizationRate = this.calculateOptimizationRate();
        }
    },

    /**
     * Calcular tasa de aciertos de caché
     */
    calculateCacheHitRate: function() {
        const totalRenders = this.state.completedRenders.length;
        if (totalRenders === 0) return 0;

        let cacheHits = 0;
        for (const render of this.state.completedRenders) {
            if (render.strategy === 'cached') {
                cacheHits++;
            }
        }

        return (cacheHits / totalRenders) * 100;
    },

    /**
     * Calcular tasa de optimización
     */
    calculateOptimizationRate: function() {
        const totalRenders = this.state.completedRenders.length;
        if (totalRenders === 0) return 0;

        let optimizedRenders = 0;
        for (const render of this.state.completedRenders) {
            if (render.strategy !== 'fast') {
                optimizedRenders++;
            }
        }

        return (optimizedRenders / totalRenders) * 100;
    },

    /**
     * Actualizar métricas de renderizado
     */
    updateRenderMetrics: function(renderRequest) {
        const metrics = this.state.performanceMetrics;
        
        metrics.totalRenders++;
        metrics.totalRenderTime += renderRequest.renderTime;
        metrics.averageRenderTime = metrics.totalRenderTime / metrics.totalRenders;
        metrics.maxRenderTime = Math.max(metrics.maxRenderTime, renderRequest.renderTime);
        metrics.minRenderTime = Math.min(metrics.minRenderTime, renderRequest.renderTime);
    },

    /**
     * Actualizar métricas de error
     */
    updateErrorMetrics: function() {
        // Las métricas de error se actualizan en collectMetrics
    },

    /**
     * Intentar recuperación de error
     */
    attemptErrorRecovery: async function(renderRequest, error) {
        const retryCount = this.state.errorRecovery.retryCount.get(renderRequest.id) || 0;
        
        if (retryCount >= 3) {
            return; // Máximo de reintentos alcanzado
        }

        // Incrementar contador de reintentos
        this.state.errorRecovery.retryCount.set(renderRequest.id, retryCount + 1);
        
        // Calcular delay con backoff exponencial
        const delay = 1000 * Math.pow(this.state.errorRecovery.backoffMultiplier, retryCount);
        
        // Programar reintento
        setTimeout(async () => {
            try {
                renderRequest.status = 'retrying';
                await this.executeRender(renderRequest);
            } catch (retryError) {
                this.state.errorRecovery.lastError.set(renderRequest.id, retryError);
            }
        }, delay);
    },

    /**
     * Registrar componente
     */
    registerComponent: function(componentType, componentDefinition) {
        this.state.componentRegistry.set(componentType, componentDefinition);
    },

    /**
     * Invalidar caché de componente
     */
    invalidateCache: function(componentType = null) {
        if (componentType) {
            // Invalidar caché para tipo específico
            for (const [key, cached] of this.state.renderCache.entries()) {
                if (key.startsWith(`${componentType}:`)) {
                    this.state.renderCache.delete(key);
                }
            }
        } else {
            // Invalidar toda la caché
            this.state.renderCache.clear();
        }
    },

    /**
     * Obtener estadísticas
     */
    getStatistics: function() {
        return {
            performanceMetrics: this.state.performanceMetrics,
            queueSizes: {
                render: this.state.renderQueue.length,
                processing: this.state.processingQueue.length,
                completed: this.state.completedRenders.length,
                failed: this.state.failedRenders.length
            },
            cacheSize: this.state.renderCache.size,
            componentRegistrySize: this.state.componentRegistry.size,
            adaptiveSettings: this.state.adaptiveSettings,
            optimizationHistory: this.state.optimizationHistory.slice(-10)
        };
    },

    /**
     * Optimizar configuración adaptativa
     */
    optimizeAdaptiveSettings: function() {
        const metrics = this.state.performanceMetrics;
        
        // Ajustar según FPS
        if (metrics.fps < 30) {
            // Bajo FPS: reducir calidad para mejorar rendimiento
            this.state.adaptiveSettings.batchSize = Math.max(5, this.state.adaptiveSettings.batchSize - 2);
            this.state.adaptiveSettings.enableVirtualDOM = false;
            this.state.adaptiveSettings.enableMemoization = false;
        } else if (metrics.fps > 50) {
            // Alto FPS: aumentar calidad
            this.state.adaptiveSettings.batchSize = Math.min(20, this.state.adaptiveSettings.batchSize + 2);
            this.state.adaptiveSettings.enableVirtualDOM = true;
            this.state.adaptiveSettings.enableMemoization = true;
        }
        
        // Ajustar según tiempo de renderizado
        if (metrics.averageRenderTime > this.config.maxRenderTime) {
            this.state.adaptiveSettings.batchTimeout = Math.max(8, this.state.adaptiveSettings.batchTimeout - 2);
        } else if (metrics.averageRenderTime < this.config.maxRenderTime * 0.5) {
            this.state.adaptiveSettings.batchTimeout = Math.min(32, this.state.adaptiveSettings.batchTimeout + 2);
        }
    },

    /**
     * Limpiar recursos
     */
    cleanup: function() {
        // Limpiar colas
        this.state.renderQueue = [];
        this.state.processingQueue = [];
        this.state.completedRenders = [];
        this.state.failedRenders = [];

        // Limpiar cachés
        this.state.renderCache.clear();
        this.state.componentRegistry.clear();

        // Limpiar contenedores temporales
        const containers = document.querySelectorAll('[id^="render-container-"]');
        containers.forEach(container => container.remove());

        // Resetear estado
        this.state.isInitialized = false;

        this.log('Optimized Renderer limpiado');
    },

    /**
     * Logging
     */
    log: function(...args) {
        if (this.config.enableDebugMode || this.config.enableMetrics) {
            console.log('[OptimizedRenderer]', ...args);
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.OptimizedRenderer = OptimizedRenderer;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptimizedRenderer;
}