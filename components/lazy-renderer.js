/**
 * Justice 2 Lazy Renderer
 * Sistema de renderizado diferido para optimizar rendimiento
 * Renderiza componentes solo cuando son necesarios o visibles
 */

const LazyRenderer = {
    // Configuración
    config: {
        enableLazyLoading: true,
        enableIntersectionObserver: true,
        enableViewportDetection: true,
        enablePreloading: true,
        enablePriorityLoading: true,
        enableProgressiveLoading: true,
        rootMargin: '50px',
        threshold: 0.1,
        preloadDistance: 200, // píxeles
        maxConcurrentLoads: 3,
        enableMetrics: true,
        enableProfiling: false,
        enableAdaptiveLoading: true,
        enableErrorRecovery: true,
        maxRetries: 3,
        retryDelay: 1000,
        enablePlaceholders: true,
        enableSkeletons: true,
        enableVirtualScrolling: false
    },

    // Estado
    state: {
        isInitialized: false,
        observer: null,
        lazyComponents: new Map(),
        loadingQueue: [],
        loadedComponents: new Map(),
        failedComponents: new Map(),
        preloadQueue: [],
        viewport: {
            width: 0,
            height: 0,
            scrollTop: 0,
            scrollLeft: 0
        },
        metrics: {
            totalLazy: 0,
            totalLoaded: 0,
            totalFailed: 0,
            averageLoadTime: 0,
            cacheHitRate: 0,
            preloadedCount: 0,
            skippedLoads: 0,
            memoryUsage: 0
        },
        performanceMetrics: {
            loadStartTime: 0,
            totalLoadTime: 0,
            componentLoadTimes: new Map(),
            bottleneckComponents: new Map()
        },
        adaptiveSettings: {
            rootMargin: '50px',
            threshold: 0.1,
            maxConcurrentLoads: 3,
            preloadDistance: 200
        },
        errorRecovery: {
            retryCount: new Map(),
            lastError: new Map(),
            backoffMultiplier: 1.5
        },
        placeholders: {
            skeletons: new Map(),
            placeholders: new Map(),
            templates: new Map()
        }
    },

    /**
     * Inicializar Lazy Renderer
     */
    init: async function(customConfig = {}) {
        if (this.state.isInitialized) return;

        this.config = { ...this.config, ...customConfig };
        
        // Inicializar subsistemas
        await this.initializeIntersectionObserver();
        await this.initializeViewportDetection();
        await this.initializePreloading();
        await this.initializePlaceholders();
        await this.initializeErrorRecovery();
        
        // Iniciar monitoreo de viewport
        this.startViewportMonitoring();
        
        // Iniciar procesamiento de colas
        this.startQueueProcessor();
        
        this.state.isInitialized = true;
        this.log('Lazy Renderer inicializado con renderizado diferido optimizado');
    },

    /**
     * Inicializar Intersection Observer
     */
    initializeIntersectionObserver: async function() {
        if (!this.config.enableIntersectionObserver || typeof IntersectionObserver === 'undefined') {
            this.log('Intersection Observer no disponible');
            return;
        }

        this.state.observer = new IntersectionObserver((entries) => {
            this.handleIntersection(entries);
        }, {
            rootMargin: this.config.rootMargin,
            threshold: this.config.threshold
        });

        this.log('Intersection Observer inicializado');
    },

    /**
     * Inicializar detección de viewport
     */
    initializeViewportDetection: async function() {
        if (!this.config.enableViewportDetection) return;

        this.updateViewport();
        this.log('Detección de viewport inicializada');
    },

    /**
     * Inicializar sistema de preloading
     */
    initializePreloading: async function() {
        if (!this.config.enablePreloading) return;

        this.state.preloadQueue = [];
        this.log('Sistema de preloading inicializado');
    },

    /**
     * Inicializar placeholders
     */
    initializePlaceholders: async function() {
        if (!this.config.enablePlaceholders) return;

        // Crear plantillas de placeholders
        this.createPlaceholderTemplates();
        this.log('Placeholders inicializados');
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
     * Registrar componente lazy
     */
    register: function(componentId, element, renderFunction, options = {}) {
        if (!this.state.isInitialized) {
            this.init();
        }

        const lazyComponent = {
            id: componentId,
            element,
            renderFunction,
            options: {
                priority: options.priority || 'normal',
                preload: options.preload || false,
                placeholder: options.placeholder || null,
                skeleton: options.skeleton || null,
                retry: options.retry !== false,
                ...options
            },
            status: 'registered',
            loaded: false,
            loading: false,
            failed: false,
            retryCount: 0,
            registeredAt: Date.now(),
            loadStartTime: null,
            loadEndTime: null
        };

        // Almacenar componente
        this.state.lazyComponents.set(componentId, lazyComponent);

        // Mostrar placeholder si está habilitado
        if (this.config.enablePlaceholders) {
            this.showPlaceholder(componentId, lazyComponent);
        }

        // Agregar al observer si está disponible
        if (this.state.observer) {
            this.state.observer.observe(element);
        } else {
            // Fallback: verificar visibilidad manualmente
            this.checkVisibility(componentId);
        }

        // Preload si está habilitado
        if (options.preload && this.config.enablePreloading) {
            this.schedulePreload(componentId);
        }

        this.state.metrics.totalLazy++;
        
        return componentId;
    },

    /**
     * Manejar intersección de elementos
     */
    handleIntersection: function(entries) {
        for (const entry of entries) {
            const componentId = this.findComponentIdByElement(entry.target);
            
            if (!componentId) continue;

            const component = this.state.lazyComponents.get(componentId);
            if (!component) continue;

            if (entry.isIntersecting) {
                // Elemento es visible, cargarlo
                this.loadComponent(componentId);
            } else {
                // Elemento no es visible, considerar descargar si está configurado
                if (component.options.unloadOnHidden) {
                    this.unloadComponent(componentId);
                }
            }
        }
    },

    /**
     * Encontrar ID de componente por elemento
     */
    findComponentIdByElement: function(element) {
        for (const [componentId, component] of this.state.lazyComponents.entries()) {
            if (component.element === element) {
                return componentId;
            }
        }
        return null;
    },

    /**
     * Verificar visibilidad manualmente (fallback)
     */
    checkVisibility: function(componentId) {
        const component = this.state.lazyComponents.get(componentId);
        if (!component) return;

        const rect = component.element.getBoundingClientRect();
        const isVisible = this.isElementInViewport(rect);

        if (isVisible && !component.loaded) {
            this.loadComponent(componentId);
        } else if (!isVisible && component.options.unloadOnHidden && component.loaded) {
            this.unloadComponent(componentId);
        }
    },

    /**
     * Verificar si elemento está en viewport
     */
    isElementInViewport: function(rect) {
        const viewport = this.state.viewport;
        
        return (
            rect.bottom >= 0 &&
            rect.right >= 0 &&
            rect.top <= viewport.height &&
            rect.left <= viewport.width
        );
    },

    /**
     * Cargar componente
     */
    loadComponent: async function(componentId) {
        const component = this.state.lazyComponents.get(componentId);
        if (!component || component.loading || component.loaded) {
            return;
        }

        // Verificar límite concurrente
        const loadingCount = Array.from(this.state.lazyComponents.values())
            .filter(c => c.loading).length;
        
        if (loadingCount >= this.config.maxConcurrentLoads) {
            // Agregar a cola de carga
            this.state.loadingQueue.push(componentId);
            return;
        }

        component.loading = true;
        component.loadStartTime = performance.now();
        component.status = 'loading';

        try {
            // Ocultar placeholder
            if (this.config.enablePlaceholders) {
                this.hidePlaceholder(componentId);
            }

            // Ejecutar función de renderizado
            const renderStartTime = performance.now();
            const renderedContent = await component.renderFunction();
            const renderTime = performance.now() - renderStartTime;

            // Aplicar contenido renderizado
            await this.applyRenderedContent(component.element, renderedContent);

            // Actualizar estado
            component.loaded = true;
            component.loading = false;
            component.loadEndTime = performance.now();
            component.status = 'loaded';
            component.loadTime = component.loadEndTime - component.loadStartTime;

            // Almacenar componente cargado
            this.state.loadedComponents.set(componentId, {
                component,
                renderedContent,
                loadedAt: Date.now(),
                loadTime: component.loadTime
            });

            // Actualizar métricas
            this.updateMetrics('loaded', component.loadTime);

            // Procesar siguiente en cola
            this.processLoadingQueue();

        } catch (error) {
            component.loading = false;
            component.failed = true;
            component.status = 'failed';
            component.error = error;

            // Intentar recuperación si está habilitada
            if (this.config.enableErrorRecovery && component.options.retry) {
                await this.attemptErrorRecovery(componentId, error);
            } else {
                // Mostrar error
                this.showLoadError(componentId, error);
                this.updateMetrics('failed');
            }
        }
    },

    /**
     * Aplicar contenido renderizado
     */
    applyRenderedContent: async function(element, content) {
        if (typeof content === 'string') {
            element.innerHTML = content;
        } else if (content instanceof Node) {
            element.innerHTML = '';
            element.appendChild(content);
        } else if (content && typeof content.render === 'function') {
            // Si es un componente de Virtual DOM
            if (typeof window !== 'undefined' && window.VirtualDOM) {
                await window.VirtualDOM.render(content, element);
            } else {
                // Fallback
                element.innerHTML = content.toString();
            }
        }
    },

    /**
     * Descargar componente
     */
    unloadComponent: function(componentId) {
        const component = this.state.lazyComponents.get(componentId);
        if (!component || !component.loaded) return;

        // Limpiar contenido
        component.element.innerHTML = '';

        // Mostrar placeholder
        if (this.config.enablePlaceholders) {
            this.showPlaceholder(componentId, component);
        }

        // Actualizar estado
        component.loaded = false;
        component.status = 'unloaded';

        // Remover de componentes cargados
        this.state.loadedComponents.delete(componentId);
    },

    /**
     * Mostrar placeholder
     */
    showPlaceholder: function(componentId, component) {
        if (!this.config.enablePlaceholders) return;

        const element = component.element;
        
        if (component.options.skeleton && this.config.enableSkeletons) {
            this.showSkeleton(element, component.options.skeleton);
        } else if (component.options.placeholder) {
            this.showCustomPlaceholder(element, component.options.placeholder);
        } else {
            this.showDefaultPlaceholder(element);
        }
    },

    /**
     * Mostrar skeleton
     */
    showSkeleton: function(element, skeletonType) {
        const skeleton = this.createSkeleton(skeletonType);
        element.innerHTML = '';
        element.appendChild(skeleton);
    },

    /**
     * Crear skeleton
     */
    createSkeleton: function(type) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-loader';
        
        switch (type) {
            case 'text':
                skeleton.innerHTML = `
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line"></div>
                `;
                break;
            case 'image':
                skeleton.innerHTML = `
                    <div class="skeleton-image"></div>
                    <div class="skeleton-text">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                `;
                break;
            case 'card':
                skeleton.innerHTML = `
                    <div class="skeleton-card">
                        <div class="skeleton-header">
                            <div class="skeleton-avatar"></div>
                            <div class="skeleton-title"></div>
                        </div>
                        <div class="skeleton-content">
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line short"></div>
                        </div>
                    </div>
                `;
                break;
            default:
                skeleton.innerHTML = `
                    <div class="skeleton-default">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                `;
        }

        // Agregar estilos si no existen
        this.ensureSkeletonStyles();

        return skeleton;
    },

    /**
     * Asegurar estilos de skeleton
     */
    ensureSkeletonStyles: function() {
        if (document.getElementById('skeleton-styles')) return;

        const styles = `
            .skeleton-loader {
                padding: 16px;
            }
            
            .skeleton-line {
                height: 12px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                border-radius: 4px;
                margin-bottom: 8px;
            }
            
            .skeleton-line.short {
                width: 60%;
            }
            
            .skeleton-image {
                width: 100%;
                height: 200px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                border-radius: 8px;
                margin-bottom: 12px;
            }
            
            .skeleton-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                margin-right: 12px;
            }
            
            .skeleton-title {
                height: 16px;
                width: 120px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                border-radius: 4px;
            }
            
            .skeleton-header {
                display: flex;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .skeleton-content {
                margin-top: 12px;
            }
            
            @keyframes skeleton-loading {
                0% {
                    background-position: 200% 0;
                }
                100% {
                    background-position: -200% 0;
                }
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.id = 'skeleton-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    },

    /**
     * Mostrar placeholder personalizado
     */
    showCustomPlaceholder: function(element, placeholder) {
        if (typeof placeholder === 'string') {
            element.innerHTML = placeholder;
        } else if (placeholder instanceof Node) {
            element.innerHTML = '';
            element.appendChild(placeholder);
        }
    },

    /**
     * Mostrar placeholder por defecto
     */
    showDefaultPlaceholder: function(element) {
        element.innerHTML = `
            <div class="lazy-placeholder">
                <div class="placeholder-content">
                    <div class="placeholder-spinner"></div>
                    <p>Cargando contenido...</p>
                </div>
            </div>
        `;

        // Agregar estilos si no existen
        this.ensurePlaceholderStyles();
    },

    /**
     * Asegurar estilos de placeholder
     */
    ensurePlaceholderStyles: function() {
        if (document.getElementById('placeholder-styles')) return;

        const styles = `
            .lazy-placeholder {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 200px;
                background-color: #f8f9fa;
                border: 1px dashed #dee2e6;
                border-radius: 4px;
                color: #6c757d;
            }
            
            .placeholder-content {
                text-align: center;
            }
            
            .placeholder-spinner {
                width: 32px;
                height: 32px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #007bff;
                border-radius: 50%;
                animation: placeholder-spin 1s linear infinite;
                margin: 0 auto 12px;
            }
            
            @keyframes placeholder-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.id = 'placeholder-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    },

    /**
     * Ocultar placeholder
     */
    hidePlaceholder: function(componentId) {
        const component = this.state.lazyComponents.get(componentId);
        if (!component) return;

        // Ocultar con animación
        const element = component.element;
        element.style.opacity = '0';
        element.style.transition = 'opacity 0.3s ease';

        setTimeout(() => {
            element.innerHTML = '';
            element.style.opacity = '1';
        }, 300);
    },

    /**
     * Mostrar error de carga
     */
    showLoadError: function(componentId, error) {
        const component = this.state.lazyComponents.get(componentId);
        if (!component) return;

        component.element.innerHTML = `
            <div class="lazy-error">
                <div class="error-content">
                    <div class="error-icon">⚠️</div>
                    <h4>Error al cargar contenido</h4>
                    <p>${error.message || 'Error desconocido'}</p>
                    <button class="retry-button" onclick="LazyRenderer.retryLoad('${componentId}')">
                        Reintentar
                    </button>
                </div>
            </div>
        `;

        // Agregar estilos si no existen
        this.ensureErrorStyles();
    },

    /**
     * Asegurar estilos de error
     */
    ensureErrorStyles: function() {
        if (document.getElementById('error-styles')) return;

        const styles = `
            .lazy-error {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 200px;
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                color: #721c24;
            }
            
            .error-content {
                text-align: center;
                padding: 20px;
            }
            
            .error-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
            
            .error-content h4 {
                margin: 0 0 8px 0;
            }
            
            .error-content p {
                margin: 0 0 16px 0;
                font-size: 14px;
            }
            
            .retry-button {
                background-color: #dc3545;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .retry-button:hover {
                background-color: #c82333;
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.id = 'error-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    },

    /**
     * Programar preload
     */
    schedulePreload: function(componentId) {
        if (!this.config.enablePreloading) return;

        this.state.preloadQueue.push(componentId);
        this.processPreloadQueue();
    },

    /**
     * Procesar cola de preload
     */
    processPreloadQueue: function() {
        if (this.state.preloadQueue.length === 0) return;

        const componentId = this.state.preloadQueue.shift();
        const component = this.state.lazyComponents.get(componentId);
        
        if (!component || component.loaded) return;

        // Verificar si está cerca del viewport
        const rect = component.element.getBoundingClientRect();
        const preloadDistance = this.config.preloadDistance;
        
        if (this.isElementNearViewport(rect, preloadDistance)) {
            this.loadComponent(componentId);
            this.state.metrics.preloadedCount++;
        }
    },

    /**
     * Verificar si elemento está cerca del viewport
     */
    isElementNearViewport: function(rect, distance) {
        const viewport = this.state.viewport;
        
        return (
            rect.bottom >= -distance &&
            rect.right >= -distance &&
            rect.top <= viewport.height + distance &&
            rect.left <= viewport.width + distance
        );
    },

    /**
     * Intentar recuperación de error
     */
    attemptErrorRecovery: async function(componentId, error) {
        const component = this.state.lazyComponents.get(componentId);
        if (!component) return;

        const retryCount = this.state.errorRecovery.retryCount.get(componentId) || 0;
        
        if (retryCount >= this.config.maxRetries) {
            // Máximo de reintentos alcanzado
            this.showLoadError(componentId, error);
            this.updateMetrics('failed');
            return;
        }

        // Incrementar contador de reintentos
        this.state.errorRecovery.retryCount.set(componentId, retryCount + 1);
        
        // Calcular delay con backoff exponencial
        const delay = this.config.retryDelay * 
                     Math.pow(this.state.errorRecovery.backoffMultiplier, retryCount);
        
        // Programar reintento
        setTimeout(async () => {
            component.status = 'retrying';
            await this.loadComponent(componentId);
        }, delay);

        this.state.metrics.retries++;
    },

    /**
     * Reintentar carga
     */
    retryLoad: function(componentId) {
        const component = this.state.lazyComponents.get(componentId);
        if (!component) return;

        // Resetear estado de error
        component.failed = false;
        component.error = null;
        component.retryCount = 0;

        // Cargar componente
        this.loadComponent(componentId);
    },

    /**
     * Procesar cola de carga
     */
    processLoadingQueue: function() {
        if (this.state.loadingQueue.length === 0) return;

        const loadingCount = Array.from(this.state.lazyComponents.values())
            .filter(c => c.loading).length;
        
        if (loadingCount < this.config.maxConcurrentLoads) {
            const componentId = this.state.loadingQueue.shift();
            this.loadComponent(componentId);
        }
    },

    /**
     * Iniciar monitoreo de viewport
     */
    startViewportMonitoring: function() {
        if (!this.config.enableViewportDetection) return;

        // Actualizar viewport en scroll
        window.addEventListener('scroll', () => {
            this.updateViewport();
            this.processPreloadQueue();
        });

        // Actualizar viewport en resize
        window.addEventListener('resize', () => {
            this.updateViewport();
        });

        // Iniciar verificación periódica
        setInterval(() => {
            this.checkAllComponentsVisibility();
        }, 1000);
    },

    /**
     * Actualizar viewport
     */
    updateViewport: function() {
        this.state.viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollTop: window.pageYOffset || document.documentElement.scrollTop,
            scrollLeft: window.pageXOffset || document.documentElement.scrollLeft
        };
    },

    /**
     * Verificar visibilidad de todos los componentes
     */
    checkAllComponentsVisibility: function() {
        if (this.state.observer) return; // Observer maneja esto automáticamente

        for (const [componentId, component] of this.state.lazyComponents.entries()) {
            this.checkVisibility(componentId);
        }
    },

    /**
     * Iniciar procesador de colas
     */
    startQueueProcessor: function() {
        setInterval(() => {
            this.processPreloadQueue();
            this.processLoadingQueue();
        }, 100);
    },

    /**
     * Crear plantillas de placeholders
     */
    createPlaceholderTemplates: function() {
        // Plantilla para texto
        this.state.placeholders.templates.set('text', `
            <div class="placeholder-text">
                <div class="placeholder-line"></div>
                <div class="placeholder-line short"></div>
            </div>
        `);

        // Plantilla para imagen
        this.state.placeholders.templates.set('image', `
            <div class="placeholder-image">
                <div class="placeholder-img"></div>
                <div class="placeholder-caption"></div>
            </div>
        `);

        // Plantilla para lista
        this.state.placeholders.templates.set('list', `
            <div class="placeholder-list">
                <div class="placeholder-item"></div>
                <div class="placeholder-item"></div>
                <div class="placeholder-item short"></div>
            </div>
        `);
    },

    /**
     * Actualizar métricas
     */
    updateMetrics: function(type, loadTime = 0) {
        switch (type) {
            case 'loaded':
                this.state.metrics.totalLoaded++;
                this.state.metrics.averageLoadTime = 
                    (this.state.metrics.averageLoadTime * (this.state.metrics.totalLoaded - 1) + loadTime) / 
                    this.state.metrics.totalLoaded;
                break;
            case 'failed':
                this.state.metrics.totalFailed++;
                break;
            case 'skipped':
                this.state.metrics.skippedLoads++;
                break;
        }

        // Calcular tasa de aciertos de caché
        const total = this.state.metrics.totalLoaded + this.state.metrics.totalFailed;
        if (total > 0) {
            this.state.metrics.cacheHitRate = (this.state.metrics.totalLoaded / total) * 100;
        }
    },

    /**
     * Invalidar componente
     */
    invalidate: function(componentId) {
        const component = this.state.lazyComponents.get(componentId);
        if (!component) return;

        // Descargar si está cargado
        if (component.loaded) {
            this.unloadComponent(componentId);
        }

        // Resetear estado
        component.loaded = false;
        component.loading = false;
        component.failed = false;
        component.status = 'registered';
        component.retryCount = 0;

        // Mostrar placeholder
        if (this.config.enablePlaceholders) {
            this.showPlaceholder(componentId, component);
        }
    },

    /**
     * Limpiar recursos
     */
    cleanup: function() {
        // Desconectar observer
        if (this.state.observer) {
            this.state.observer.disconnect();
        }

        // Limpiar componentes
        this.state.lazyComponents.clear();
        this.state.loadedComponents.clear();
        this.state.failedComponents.clear();

        // Limpiar colas
        this.state.loadingQueue = [];
        this.state.preloadQueue = [];

        // Resetear estado
        this.state.isInitialized = false;

        this.log('Lazy Renderer limpiado');
    },

    /**
     * Obtener estadísticas
     */
    getStatistics: function() {
        return {
            metrics: this.state.metrics,
            performanceMetrics: {
                ...this.state.performanceMetrics,
                componentLoadTimes: Object.fromEntries(this.state.performanceMetrics.componentLoadTimes)
            },
            queueSizes: {
                loading: this.state.loadingQueue.length,
                preload: this.state.preloadQueue.length
            },
            componentCounts: {
                registered: this.state.lazyComponents.size,
                loaded: this.state.loadedComponents.size,
                failed: this.state.failedComponents.size
            },
            adaptiveSettings: this.state.adaptiveSettings
        };
    },

    /**
     * Logging
     */
    log: function(...args) {
        if (this.config.enableMetrics) {
            console.log('[LazyRenderer]', ...args);
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.LazyRenderer = LazyRenderer;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = LazyRenderer;
}