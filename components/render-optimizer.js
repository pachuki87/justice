/**
 * Justice 2 Render Optimizer
 * Sistema centralizado de optimización de renderizado para componentes
 * Optimiza el rendimiento de renderizado mediante técnicas avanzadas
 */

const RenderOptimizer = {
    // Configuración
    config: {
        enableVirtualDOM: true,
        enableDiffing: true,
        enableMemoization: true,
        enableBatching: true,
        enableLazyLoading: true,
        enablePrioritization: true,
        enableProfiling: true,
        maxBatchSize: 50,
        batchTimeout: 16, // ~60fps
        debounceDelay: 10,
        throttleDelay: 8,
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        gcInterval: 60000, // 1 minuto
        enableMetrics: true,
        enablePerformanceMonitoring: true,
        targetFPS: 60,
        maxRenderTime: 16.67, // ms para 60fps
        criticalRenderTime: 8.33, // ms para 120fps
        enableAdaptiveOptimization: true,
        enablePredictiveRendering: true
    },

    // Estado
    state: {
        isInitialized: false,
        renderQueue: [],
        batchQueue: [],
        priorityQueue: [],
        lazyQueue: [],
        virtualDOM: new Map(),
        componentCache: new Map(),
        memoizedComponents: new Map(),
        renderMetrics: {
            totalRenders: 0,
            skippedRenders: 0,
            cachedRenders: 0,
            averageRenderTime: 0,
            maxRenderTime: 0,
            minRenderTime: Infinity,
            renderTimes: [],
            memoryUsage: 0,
            fps: 0,
            droppedFrames: 0,
            layoutThrashing: 0,
            forcedReflows: 0
        },
        performanceMetrics: {
            renderStartTime: 0,
            lastFrameTime: 0,
            frameCount: 0,
            animationFrameId: null,
            isMonitoring: false
        },
        optimizationStrategies: new Map(),
        adaptiveSettings: {
            batchSize: 50,
            batchTimeout: 16,
            debounceDelay: 10,
            throttleDelay: 8,
            enableVirtualDOM: true,
            enableDiffing: true,
            enableMemoization: true
        },
        predictiveCache: new Map(),
        bottleneckDetector: {
            slowComponents: new Map(),
            frequentRerenders: new Map(),
            memoryLeaks: new Map()
        }
    },

    /**
     * Inicializar Render Optimizer
     */
    init: async function(customConfig = {}) {
        if (this.state.isInitialized) return;

        this.config = { ...this.config, ...customConfig };
        
        // Inicializar subsistemas
        await this.initializeVirtualDOM();
        await this.initializeMemoization();
        await this.initializeBatching();
        await this.initializeLazyLoading();
        await this.initializeProfiling();
        await this.initializeAdaptiveOptimization();
        
        // Iniciar monitoreo de rendimiento
        if (this.config.enablePerformanceMonitoring) {
            this.startPerformanceMonitoring();
        }
        
        // Iniciar garbage collection
        this.startGarbageCollection();
        
        // Iniciar detector de cuellos de botella
        this.startBottleneckDetection();
        
        this.state.isInitialized = true;
        this.log('Render Optimizer inicializado con capacidades avanzadas');
    },

    /**
     * Inicializar Virtual DOM
     */
    initializeVirtualDOM: async function() {
        if (!this.config.enableVirtualDOM) return;

        this.state.virtualDOM = new Map();
        this.log('Virtual DOM inicializado');
    },

    /**
     * Inicializar sistema de memoización
     */
    initializeMemoization: async function() {
        if (!this.config.enableMemoization) return;

        this.state.memoizedComponents = new Map();
        this.log('Sistema de memoización inicializado');
    },

    /**
     * Inicializar sistema de batching
     */
    initializeBatching: async function() {
        if (!this.config.enableBatching) return;

        this.state.batchQueue = [];
        this.startBatchProcessor();
        this.log('Sistema de batching inicializado');
    },

    /**
     * Inicializar sistema de lazy loading
     */
    initializeLazyLoading: async function() {
        if (!this.config.enableLazyLoading) return;

        this.state.lazyQueue = [];
        this.setupIntersectionObserver();
        this.log('Sistema de lazy loading inicializado');
    },

    /**
     * Inicializar sistema de profiling
     */
    initializeProfiling: async function() {
        if (!this.config.enableProfiling) return;

        this.state.performanceMetrics.isMonitoring = false;
        this.log('Sistema de profiling inicializado');
    },

    /**
     * Inicializar optimización adaptativa
     */
    initializeAdaptiveOptimization: async function() {
        if (!this.config.enableAdaptiveOptimization) return;

        this.state.optimizationStrategies.set('default', {
            virtualDOM: true,
            diffing: true,
            memoization: true,
            batching: true,
            lazyLoading: true
        });

        this.log('Optimización adaptativa inicializada');
    },

    /**
     * Renderizar componente optimizado
     */
    renderComponent: async function(componentName, props = {}, options = {}) {
        const startTime = performance.now();
        
        try {
            // Generar clave única para el componente
            const componentKey = this.generateComponentKey(componentName, props, options);
            
            // Verificar si está en caché de memoización
            if (this.config.enableMemoization) {
                const memoized = await this.getMemoizedComponent(componentKey);
                if (memoized && !options.forceRender) {
                    this.updateRenderMetrics('cache_hit', performance.now() - startTime);
                    return memoized;
                }
            }
            
            // Verificar si se puede saltar el renderizado con Virtual DOM
            if (this.config.enableVirtualDOM && this.config.enableDiffing) {
                const shouldSkip = await this.shouldSkipRender(componentKey, props);
                if (shouldSkip && !options.forceRender) {
                    this.updateRenderMetrics('skipped', performance.now() - startTime);
                    return await this.getFromVirtualDOM(componentKey);
                }
            }
            
            // Determinar estrategia de renderizado
            const strategy = this.determineRenderStrategy(componentName, props, options);
            
            // Ejecutar renderizado con estrategia optimizada
            const renderedComponent = await this.executeRenderStrategy(
                componentName, 
                props, 
                options, 
                strategy
            );
            
            // Actualizar Virtual DOM
            if (this.config.enableVirtualDOM) {
                await this.updateVirtualDOM(componentKey, renderedComponent);
            }
            
            // Memoizar resultado
            if (this.config.enableMemoization) {
                await this.memoizeComponent(componentKey, renderedComponent);
            }
            
            // Actualizar métricas
            const renderTime = performance.now() - startTime;
            this.updateRenderMetrics('render', renderTime);
            
            // Detectar cuellos de botella
            this.detectBottlenecks(componentName, renderTime);
            
            return renderedComponent;
            
        } catch (error) {
            this.log(`Error renderizando componente ${componentName}:`, error);
            throw error;
        }
    },

    /**
     * Generar clave única para componente
     */
    generateComponentKey: function(componentName, props, options) {
        const propsHash = this.hashObject(props);
        const optionsHash = this.hashObject(options);
        return `${componentName}:${propsHash}:${optionsHash}`;
    },

    /**
     * Hashear objeto para generar clave
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
     * Obtener componente memoizado
     */
    getMemoizedComponent: async function(componentKey) {
        const memoized = this.state.memoizedComponents.get(componentKey);
        
        if (!memoized) return null;
        
        // Verificar si ha expirado
        if (Date.now() > memoized.expiresAt) {
            this.state.memoizedComponents.delete(componentKey);
            return null;
        }
        
        // Actualizar último acceso
        memoized.lastAccess = Date.now();
        memoized.accessCount++;
        
        return memoized.component;
    },

    /**
     * Verificar si se debe saltar el renderizado
     */
    shouldSkipRender: async function(componentKey, props) {
        const virtualComponent = this.state.virtualDOM.get(componentKey);
        
        if (!virtualComponent) return false;
        
        // Comparar props para determinar si hay cambios
        const propsChanged = !this.deepEqual(virtualComponent.props, props);
        
        return !propsChanged;
    },

    /**
     * Comparación profunda de objetos
     */
    deepEqual: function(obj1, obj2) {
        if (obj1 === obj2) return true;
        
        if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || 
            obj1 == null || obj2 == null) {
            return false;
        }
        
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) return false;
        
        for (const key of keys1) {
            if (!keys2.includes(key) || !this.deepEqual(obj1[key], obj2[key])) {
                return false;
            }
        }
        
        return true;
    },

    /**
     * Obtener desde Virtual DOM
     */
    getFromVirtualDOM: async function(componentKey) {
        const virtualComponent = this.state.virtualDOM.get(componentKey);
        return virtualComponent ? virtualComponent.component : null;
    },

    /**
     * Determinar estrategia de renderizado
     */
    determineRenderStrategy: function(componentName, props, options) {
        const strategies = {
            immediate: {
                batching: false,
                lazy: false,
                priority: 'high'
            },
            batched: {
                batching: true,
                lazy: false,
                priority: 'normal'
            },
            lazy: {
                batching: false,
                lazy: true,
                priority: 'low'
            },
            adaptive: {
                batching: this.state.adaptiveSettings.enableBatching,
                lazy: this.state.adaptiveSettings.enableLazyLoading,
                priority: this.determinePriority(componentName, props)
            }
        };
        
        // Determinar estrategia basada en opciones y estado del sistema
        if (options.immediate) return strategies.immediate;
        if (options.lazy) return strategies.lazy;
        if (options.batched) return strategies.batched;
        
        // Estrategia adaptativa por defecto
        return strategies.adaptive;
    },

    /**
     * Determinar prioridad de componente
     */
    determinePriority: function(componentName, props) {
        // Componentes críticos tienen alta prioridad
        const criticalComponents = ['navbar', 'sidebar', 'main-content'];
        if (criticalComponents.includes(componentName)) {
            return 'high';
        }
        
        // Componentes visibles tienen prioridad normal
        if (props.visible !== false) {
            return 'normal';
        }
        
        // Componentes no visibles tienen baja prioridad
        return 'low';
    },

    /**
     * Ejecutar estrategia de renderizado
     */
    executeRenderStrategy: async function(componentName, props, options, strategy) {
        if (strategy.batching) {
            return await this.batchRender(componentName, props, options, strategy);
        }
        
        if (strategy.lazy) {
            return await this.lazyRender(componentName, props, options, strategy);
        }
        
        // Renderizado inmediato
        return await this.immediateRender(componentName, props, options, strategy);
    },

    /**
     * Renderizado inmediato
     */
    immediateRender: async function(componentName, props, options, strategy) {
        const renderId = `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return new Promise((resolve, reject) => {
            try {
                // Obtener función de renderizado del componente
                const renderFunction = this.getComponentRenderFunction(componentName);
                
                // Ejecutar renderizado
                const renderedComponent = renderFunction(props, options);
                
                resolve(renderedComponent);
            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Renderizado por lotes
     */
    batchRender: async function(componentName, props, options, strategy) {
        return new Promise((resolve, reject) => {
            const renderJob = {
                id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                componentName,
                props,
                options,
                strategy,
                resolve,
                reject,
                timestamp: Date.now()
            };
            
            // Agregar a cola de lotes
            this.state.batchQueue.push(renderJob);
            
            // Si la cola está llena, procesar inmediatamente
            if (this.state.batchQueue.length >= this.config.maxBatchSize) {
                this.processBatchQueue();
            }
        });
    },

    /**
     * Renderizado diferido
     */
    lazyRender: async function(componentName, props, options, strategy) {
        return new Promise((resolve, reject) => {
            const lazyJob = {
                id: `lazy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                componentName,
                props,
                options,
                strategy,
                resolve,
                reject,
                timestamp: Date.now(),
                rendered: false
            };
            
            // Agregar a cola de lazy loading
            this.state.lazyQueue.push(lazyJob);
            
            // Configurar observador de intersección si no existe
            this.scheduleLazyRender(lazyJob);
        });
    },

    /**
     * Obtener función de renderizado de componente
     */
    getComponentRenderFunction: function(componentName) {
        // Intentar obtener desde ComponentCache primero
        if (typeof window !== 'undefined' && window.ComponentCache) {
            const component = window.ComponentCache.state.componentRegistry.get(componentName);
            if (component && component.renderFunction) {
                return component.renderFunction;
            }
        }
        
        // Fallback a función genérica de renderizado
        return (props, options) => ({
            type: componentName,
            props,
            children: this.generateDefaultChildren(componentName, props),
            metadata: {
                renderTime: Date.now(),
                strategy: options.strategy || 'default'
            }
        });
    },

    /**
     * Generar hijos por defecto
     */
    generateDefaultChildren: function(componentName, props) {
        // Generación simplificada basada en el tipo de componente
        switch (componentName) {
            case 'navbar':
                return [{ type: 'nav', props: {}, children: ['Home', 'Cases', 'Documents'] }];
            case 'sidebar':
                return [{ type: 'ul', props: {}, children: ['Dashboard', 'Profile', 'Settings'] }];
            case 'case-list':
                return [{ type: 'div', props: { className: 'case-list' }, children: ['Case 1', 'Case 2'] }];
            default:
                return [{ type: 'div', props: {}, children: [`Content for ${componentName}`] }];
        }
    },

    /**
     * Actualizar Virtual DOM
     */
    updateVirtualDOM: async function(componentKey, component) {
        this.state.virtualDOM.set(componentKey, {
            component,
            props: component.props,
            timestamp: Date.now(),
            checksum: this.calculateChecksum(component)
        });
    },

    /**
     * Calcular checksum de componente
     */
    calculateChecksum: function(component) {
        const str = JSON.stringify(component);
        let hash = 0;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString(36);
    },

    /**
     * Memoizar componente
     */
    memoizeComponent: async function(componentKey, component) {
        const ttl = this.calculateMemoizationTTL(component);
        
        this.state.memoizedComponents.set(componentKey, {
            component,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
            accessCount: 1,
            lastAccess: Date.now(),
            size: this.calculateComponentSize(component)
        });
    },

    /**
     * Calcular TTL de memoización
     */
    calculateMemoizationTTL: function(component) {
        // TTL basado en el tipo y complejidad del componente
        const baseTTL = 60000; // 1 minuto
        
        // Componentes más complejos tienen TTL más largo
        const complexityMultiplier = this.calculateComponentComplexity(component);
        
        return baseTTL * complexityMultiplier;
    },

    /**
     * Calcular complejidad del componente
     */
    calculateComponentComplexity: function(component) {
        let complexity = 1;
        
        // Más hijos = más complejidad
        if (component.children && Array.isArray(component.children)) {
            complexity += component.children.length * 0.1;
        }
        
        // Más props = más complejidad
        if (component.props && typeof component.props === 'object') {
            complexity += Object.keys(component.props).length * 0.05;
        }
        
        return Math.min(complexity, 3); // Máximo 3x
    },

    /**
     * Calcular tamaño del componente
     */
    calculateComponentSize: function(component) {
        return JSON.stringify(component).length;
    },

    /**
     * Iniciar procesador de lotes
     */
    startBatchProcessor: function() {
        setInterval(() => {
            this.processBatchQueue();
        }, this.config.batchTimeout);
    },

    /**
     * Procesar cola de lotes
     */
    processBatchQueue: function() {
        if (this.state.batchQueue.length === 0) return;
        
        const batch = this.state.batchQueue.splice(0, this.config.maxBatchSize);
        
        // Procesar lote en paralelo
        Promise.allSettled(
            batch.map(job => this.processBatchJob(job))
        ).then(results => {
            // Actualizar métricas del lote
            this.updateBatchMetrics(batch, results);
        });
    },

    /**
     * Procesar trabajo de lote
     */
    processBatchJob: async function(job) {
        try {
            const renderFunction = this.getComponentRenderFunction(job.componentName);
            const renderedComponent = renderFunction(job.props, job.options);
            
            // Actualizar Virtual DOM
            if (this.config.enableVirtualDOM) {
                const componentKey = this.generateComponentKey(job.componentName, job.props, job.options);
                await this.updateVirtualDOM(componentKey, renderedComponent);
            }
            
            // Memoizar resultado
            if (this.config.enableMemoization) {
                const componentKey = this.generateComponentKey(job.componentName, job.props, job.options);
                await this.memoizeComponent(componentKey, renderedComponent);
            }
            
            job.resolve(renderedComponent);
            
        } catch (error) {
            job.reject(error);
        }
    },

    /**
     * Configurar observador de intersección
     */
    setupIntersectionObserver: function() {
        if (typeof IntersectionObserver === 'undefined') return;
        
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.processLazyJobsForElement(entry.target);
                }
            });
        }, {
            rootMargin: '50px'
        });
    },

    /**
     * Programar renderizado diferido
     */
    scheduleLazyRender: function(lazyJob) {
        // Si el elemento ya está visible, renderizar inmediatamente
        if (this.isElementVisible(lazyJob.props.element)) {
            this.processLazyJob(lazyJob);
            return;
        }
        
        // Agregar al observador de intersección
        if (lazyJob.props.element && this.intersectionObserver) {
            this.intersectionObserver.observe(lazyJob.props.element);
        }
    },

    /**
     * Verificar si elemento es visible
     */
    isElementVisible: function(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
        );
    },

    /**
     * Procesar trabajos diferidos para elemento
     */
    processLazyJobsForElement: function(element) {
        const jobsToProcess = this.state.lazyQueue.filter(job => 
            job.props.element === element && !job.rendered
        );
        
        jobsToProcess.forEach(job => {
            this.processLazyJob(job);
        });
    },

    /**
     * Procesar trabajo diferido
     */
    processLazyJob: async function(lazyJob) {
        if (lazyJob.rendered) return;
        
        try {
            const renderFunction = this.getComponentRenderFunction(lazyJob.componentName);
            const renderedComponent = renderFunction(lazyJob.props, lazyJob.options);
            
            lazyJob.rendered = true;
            lazyJob.resolve(renderedComponent);
            
            // Remover de la cola
            const index = this.state.lazyQueue.indexOf(lazyJob);
            if (index > -1) {
                this.state.lazyQueue.splice(index, 1);
            }
            
        } catch (error) {
            lazyJob.reject(error);
        }
    },

    /**
     * Iniciar monitoreo de rendimiento
     */
    startPerformanceMonitoring: function() {
        if (this.state.performanceMetrics.isMonitoring) return;
        
        this.state.performanceMetrics.isMonitoring = true;
        this.state.performanceMetrics.lastFrameTime = performance.now();
        
        this.monitorFrame();
    },

    /**
     * Monitorear frame
     */
    monitorFrame: function() {
        if (!this.state.performanceMetrics.isMonitoring) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.state.performanceMetrics.lastFrameTime;
        
        // Calcular FPS
        const fps = 1000 / deltaTime;
        this.state.renderMetrics.fps = Math.round(fps);
        
        // Detectar frames dropping
        if (deltaTime > this.config.maxRenderTime) {
            this.state.renderMetrics.droppedFrames++;
        }
        
        // Actualizar métricas
        this.state.performanceMetrics.lastFrameTime = currentTime;
        this.state.performanceMetrics.frameCount++;
        
        // Continuar monitoreo
        this.state.performanceMetrics.animationFrameId = 
            requestAnimationFrame(() => this.monitorFrame());
    },

    /**
     * Actualizar métricas de renderizado
     */
    updateRenderMetrics: function(type, renderTime) {
        const metrics = this.state.renderMetrics;
        
        switch (type) {
            case 'render':
                metrics.totalRenders++;
                metrics.renderTimes.push(renderTime);
                metrics.maxRenderTime = Math.max(metrics.maxRenderTime, renderTime);
                metrics.minRenderTime = Math.min(metrics.minRenderTime, renderTime);
                
                // Calcular tiempo promedio
                const sum = metrics.renderTimes.reduce((a, b) => a + b, 0);
                metrics.averageRenderTime = sum / metrics.renderTimes.length;
                
                // Mantener solo últimos 100 tiempos
                if (metrics.renderTimes.length > 100) {
                    metrics.renderTimes = metrics.renderTimes.slice(-100);
                }
                break;
                
            case 'skipped':
                metrics.skippedRenders++;
                break;
                
            case 'cache_hit':
                metrics.cachedRenders++;
                break;
        }
        
        // Actualizar uso de memoria
        metrics.memoryUsage = this.calculateMemoryUsage();
    },

    /**
     * Calcular uso de memoria
     */
    calculateMemoryUsage: function() {
        let totalSize = 0;
        
        // Tamaño de Virtual DOM
        this.state.virtualDOM.forEach(entry => {
            totalSize += this.calculateComponentSize(entry.component);
        });
        
        // Tamaño de componentes memoizados
        this.state.memoizedComponents.forEach(entry => {
            totalSize += entry.size;
        });
        
        return totalSize;
    },

    /**
     * Actualizar métricas de lote
     */
    updateBatchMetrics: function(batch, results) {
        // Actualizar estadísticas de procesamiento de lotes
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        this.log(`Batch procesado: ${batch.length} trabajos, ${successful} exitosos, ${failed} fallidos`);
    },

    /**
     * Detectar cuellos de botella
     */
    detectBottlenecks: function(componentName, renderTime) {
        // Componentes lentos
        if (renderTime > this.config.criticalRenderTime) {
            const current = this.state.bottleneckDetector.slowComponents.get(componentName) || 0;
            this.state.bottleneckDetector.slowComponents.set(componentName, current + 1);
        }
        
        // Renderizados frecuentes
        const current = this.state.bottleneckDetector.frequentRerenders.get(componentName) || 0;
        this.state.bottleneckDetector.frequentRerenders.set(componentName, current + 1);
    },

    /**
     * Iniciar detección de cuellos de botella
     */
    startBottleneckDetection: function() {
        setInterval(() => {
            this.analyzeBottlenecks();
        }, 30000); // Cada 30 segundos
    },

    /**
     * Analizar cuellos de botella
     */
    analyzeBottlenecks: function() {
        // Analizar componentes lentos
        this.state.bottleneckDetector.slowComponents.forEach((count, componentName) => {
            if (count > 5) {
                this.log(`Componente lento detectado: ${componentName} (${count} renderizados lentos)`);
                this.suggestOptimization(componentName, 'slow');
            }
        });
        
        // Analizar renderizados frecuentes
        this.state.bottleneckDetector.frequentRerenders.forEach((count, componentName) => {
            if (count > 20) {
                this.log(`Renderizados frecuentes detectados: ${componentName} (${count} renderizados)`);
                this.suggestOptimization(componentName, 'frequent');
            }
        });
    },

    /**
     * Sugerir optimización
     */
    suggestOptimization: function(componentName, issue) {
        const suggestions = {
            slow: [
                'Considerar memoización agresiva',
                'Optimizar lógica de renderizado',
                'Dividir componente en subcomponentes',
                'Usar renderizado virtual'
            ],
            frequent: [
                'Implementar shouldComponentUpdate',
                'Usar memoización selectiva',
                'Reducir dependencias de props',
                'Optimizar detección de cambios'
            ]
        };
        
        const componentSuggestions = suggestions[issue] || [];
        this.log(`Sugerencias para ${componentName}:`, componentSuggestions);
    },

    /**
     * Iniciar garbage collection
     */
    startGarbageCollection: function() {
        setInterval(() => {
            this.performGarbageCollection();
        }, this.config.gcInterval);
    },

    /**
     * Realizar garbage collection
     */
    performGarbageCollection: function() {
        const now = Date.now();
        let cleanedCount = 0;
        
        // Limpiar componentes memoizados expirados
        this.state.memoizedComponents.forEach((entry, key) => {
            if (now > entry.expiresAt) {
                this.state.memoizedComponents.delete(key);
                cleanedCount++;
            }
        });
        
        // Limpiar Virtual DOM antiguo
        this.state.virtualDOM.forEach((entry, key) => {
            if (now - entry.timestamp > 300000) { // 5 minutos
                this.state.virtualDOM.delete(key);
                cleanedCount++;
            }
        });
        
        if (cleanedCount > 0) {
            this.log(`Garbage collection: ${cleanedCount} entradas limpiadas`);
        }
    },

    /**
     * Obtener estadísticas de renderizado
     */
    getRenderStatistics: function() {
        return {
            ...this.state.renderMetrics,
            queueSizes: {
                render: this.state.renderQueue.length,
                batch: this.state.batchQueue.length,
                lazy: this.state.lazyQueue.length
            },
            cacheSizes: {
                virtualDOM: this.state.virtualDOM.size,
                memoized: this.state.memoizedComponents.size
            },
            bottlenecks: {
                slowComponents: Object.fromEntries(this.state.bottleneckDetector.slowComponents),
                frequentRerenders: Object.fromEntries(this.state.bottleneckDetector.frequentRerenders)
            },
            adaptiveSettings: this.state.adaptiveSettings
        };
    },

    /**
     * Optimizar configuración adaptativa
     */
    optimizeAdaptiveSettings: function() {
        const metrics = this.state.renderMetrics;
        
        // Si el FPS es bajo, reducir calidad
        if (metrics.fps < 30) {
            this.state.adaptiveSettings.batchSize = Math.max(10, this.state.adaptiveSettings.batchSize - 10);
            this.state.adaptiveSettings.enableVirtualDOM = false;
            this.state.adaptiveSettings.enableDiffing = false;
        }
        
        // Si el tiempo de renderizado es alto, aumentar batching
        if (metrics.averageRenderTime > this.config.criticalRenderTime) {
            this.state.adaptiveSettings.batchSize = Math.min(100, this.state.adaptiveSettings.batchSize + 10);
            this.state.adaptiveSettings.batchTimeout = Math.min(50, this.state.adaptiveSettings.batchTimeout + 5);
        }
        
        // Si hay mucha memoria usada, limpiar cachés
        if (metrics.memoryUsage > this.config.maxMemoryUsage * 0.8) {
            this.performGarbageCollection();
        }
    },

    /**
     * Limpiar recursos
     */
    cleanup: function() {
        // Detener monitoreo
        if (this.state.performanceMetrics.animationFrameId) {
            cancelAnimationFrame(this.state.performanceMetrics.animationFrameId);
        }
        
        // Limpiar observador de intersección
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        // Limpiar cachés
        this.state.virtualDOM.clear();
        this.state.memoizedComponents.clear();
        this.state.renderQueue = [];
        this.state.batchQueue = [];
        this.state.lazyQueue = [];
        
        this.state.isInitialized = false;
        this.log('Render Optimizer limpiado');
    },

    /**
     * Logging
     */
    log: function(...args) {
        if (this.config.enableMetrics) {
            console.log('[RenderOptimizer]', ...args);
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.RenderOptimizer = RenderOptimizer;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = RenderOptimizer;
}