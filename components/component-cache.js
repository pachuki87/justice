/**
 * Justice 2 Component Cache - Caché Especializada para Componentes
 * Optimiza el renderizado y almacenamiento de componentes UI
 */

const ComponentCache = {
    // Configuración
    config: {
        maxComponents: 500,
        defaultTTL: 600000, // 10 minutos
        enableVirtualDOM: true,
        enableDiffing: true,
        enableCompression: true,
        enableLazyLoading: true,
        enablePreloading: true,
        enableIncrementalRendering: true,
        enableComponentSplitting: true,
        enableDependencyTracking: true,
        enableVersioning: true,
        enableHotReload: false,
        enableSSR: true, // Server-Side Rendering
        enableCSR: true, // Client-Side Rendering
        enableHydration: true,
        enableMemoization: true,
        enableBatching: true,
        enablePrioritization: true,
        enableMemoryOptimization: true,
        compressionThreshold: 1024, // 1KB
        batchSize: 10,
        priorityLevels: ['critical', 'high', 'normal', 'low'],
        maxMemoryUsage: 50 * 1024 * 1024, // 50MB
        enableGarbageCollection: true,
        gcInterval: 300000, // 5 minutos
        enableMetrics: true,
        enableProfiling: false
    },

    // Estado
    state: {
        cache: new Map(),
        virtualDOM: new Map(),
        componentRegistry: new Map(),
        dependencyGraph: new Map(),
        renderQueue: [],
        renderStats: {
            totalRenders: 0,
            cachedRenders: 0,
            skippedRenders: 0,
            averageRenderTime: 0,
            memoryUsage: 0,
            cacheHitRate: 0
        },
        componentMetrics: new Map(),
        batchQueue: [],
        isInitialized: false,
        lastGC: Date.now(),
        memoryTracker: {
            allocated: 0,
            freed: 0,
            peak: 0
        },
        versionMap: new Map(),
        hotReloadSubscribers: new Set(),
        ssrCache: new Map(),
        hydrationCache: new Map()
    },

    /**
     * Inicializar Component Cache
     */
    init: async function(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        
        // Inicializar registro de componentes
        await this.initializeComponentRegistry();
        
        // Inicializar grafo de dependencias
        await this.initializeDependencyGraph();
        
        // Iniciar garbage collection si está habilitado
        if (this.config.enableGarbageCollection) {
            this.startGarbageCollection();
        }
        
        // Iniciar procesamiento por lotes si está habilitado
        if (this.config.enableBatching) {
            this.startBatchProcessor();
        }
        
        // Iniciar monitoreo de memoria
        if (this.config.enableMemoryOptimization) {
            this.startMemoryMonitoring();
        }
        
        this.state.isInitialized = true;
        this.log('Component Cache inicializado con capacidades de renderizado optimizado');
    },

    /**
     * Inicializar registro de componentes
     */
    initializeComponentRegistry: async function() {
        // Registrar componentes conocidos de Justice 2
        const knownComponents = [
            'navbar', 'sidebar', 'main-content', 'case-list', 'case-detail',
            'document-viewer', 'analytics-dashboard', 'user-profile', 'settings-panel',
            'notification-system', 'modal', 'dropdown', 'form', 'table', 'chart'
        ];
        
        for (const componentName of knownComponents) {
            this.state.componentRegistry.set(componentName, {
                name: componentName,
                version: '1.0.0',
                dependencies: [],
                renderCount: 0,
                lastRendered: null,
                averageRenderTime: 0,
                priority: 'normal',
                lazy: false,
                ssr: true
            });
        }
    },

    /**
     * Inicializar grafo de dependencias
     */
    initializeDependencyGraph: async function() {
        // Definir dependencias entre componentes
        const dependencies = {
            'navbar': [],
            'sidebar': ['navbar'],
            'main-content': ['navbar', 'sidebar'],
            'case-list': ['main-content'],
            'case-detail': ['main-content', 'case-list'],
            'document-viewer': ['case-detail'],
            'analytics-dashboard': ['main-content'],
            'user-profile': ['main-content'],
            'settings-panel': ['main-content'],
            'notification-system': [],
            'modal': [],
            'dropdown': [],
            'form': [],
            'table': [],
            'chart': []
        };
        
        for (const [component, deps] of Object.entries(dependencies)) {
            this.state.dependencyGraph.set(component, deps);
        }
    },

    /**
     * Renderizar componente con caché
     */
    renderComponent: async function(componentName, props = {}, options = {}) {
        const startTime = performance.now();
        
        try {
            // Generar clave de caché
            const cacheKey = this.generateComponentKey(componentName, props, options);
            
            // Verificar si está en caché
            const cachedComponent = await this.getFromCache(cacheKey);
            if (cachedComponent && !options.forceRender) {
                this.state.renderStats.cachedRenders++;
                this.updateComponentMetrics(componentName, 'cache_hit', performance.now() - startTime);
                
                this.log(`Component Cache HIT: ${componentName}`);
                return cachedComponent;
            }
            
            // Verificar si se puede saltar el renderizado
            if (this.config.enableDiffing && await this.canSkipRender(componentName, props, options)) {
                this.state.renderStats.skippedRenders++;
                this.updateComponentMetrics(componentName, 'skipped_render', performance.now() - startTime);
                
                return await this.getFromCache(cacheKey);
            }
            
            // Renderizar componente
            const renderedComponent = await this.performRender(componentName, props, options);
            
            // Almacenar en caché
            await this.storeInCache(cacheKey, renderedComponent, componentName);
            
            // Actualizar Virtual DOM si está habilitado
            if (this.config.enableVirtualDOM) {
                await this.updateVirtualDOM(cacheKey, renderedComponent);
            }
            
            // Actualizar estadísticas
            this.state.renderStats.totalRenders++;
            const endTime = performance.now();
            this.updateRenderStats(endTime - startTime);
            this.updateComponentMetrics(componentName, 'render', endTime - startTime);
            
            this.log(`Component rendered: ${componentName} (${(endTime - startTime).toFixed(2)}ms)`);
            
            return renderedComponent;
            
        } catch (error) {
            this.log(`Error renderizando componente ${componentName}:`, error);
            throw error;
        }
    },

    /**
     * Generar clave de caché para componente
     */
    generateComponentKey: function(componentName, props, options) {
        const propsHash = this.hashObject(props);
        const optionsHash = this.hashObject(options);
        const version = this.getComponentVersion(componentName);
        
        return `${componentName}:${version}:${propsHash}:${optionsHash}`;
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
            hash = hash & hash; // Convertir a 32-bit integer
        }
        
        return hash.toString(36);
    },

    /**
     * Obtener versión del componente
     */
    getComponentVersion: function(componentName) {
        const component = this.state.componentRegistry.get(componentName);
        return component ? component.version : '1.0.0';
    },

    /**
     * Obtener de caché
     */
    getFromCache: async function(cacheKey) {
        const cached = this.state.cache.get(cacheKey);
        
        if (!cached) {
            return null;
        }
        
        // Verificar si ha expirado
        if (Date.now() > cached.expiresAt) {
            this.state.cache.delete(cacheKey);
            return null;
        }
        
        // Descomprimir si es necesario
        let component = cached.component;
        if (cached.compressed) {
            component = await this.decompressComponent(component);
        }
        
        // Actualizar último acceso
        cached.lastAccess = Date.now();
        cached.accessCount++;
        
        return component;
    },

    /**
     * Verificar si se puede saltar el renderizado
     */
    canSkipRender: async function(componentName, props, options) {
        const cacheKey = this.generateComponentKey(componentName, props, options);
        const cached = this.state.cache.get(cacheKey);
        
        if (!cached) {
            return false;
        }
        
        // Comparar con Virtual DOM si está habilitado
        if (this.config.enableVirtualDOM && this.state.virtualDOM.has(cacheKey)) {
            const virtualComponent = this.state.virtualDOM.get(cacheKey);
            return await this.areComponentsEqual(cached.component, virtualComponent);
        }
        
        return false;
    },

    /**
     * Comparar componentes para diffing
     */
    areComponentsEqual: async function(comp1, comp2) {
        // Comparación simplificada - en producción usar algoritmo más sofisticado
        if (typeof comp1 !== typeof comp2) {
            return false;
        }
        
        if (typeof comp1 === 'object' && comp1 !== null && comp2 !== null) {
            const keys1 = Object.keys(comp1);
            const keys2 = Object.keys(comp2);
            
            if (keys1.length !== keys2.length) {
                return false;
            }
            
            for (const key of keys1) {
                if (!keys2.includes(key) || comp1[key] !== comp2[key]) {
                    return false;
                }
            }
            
            return true;
        }
        
        return comp1 === comp2;
    },

    /**
     * Realizar renderizado del componente
     */
    performRender: async function(componentName, props, options) {
        const component = this.state.componentRegistry.get(componentName);
        
        if (!component) {
            throw new Error(`Componente no encontrado: ${componentName}`);
        }
        
        // Renderizado Server-Side si está habilitado y es apropiado
        if (this.config.enableSSR && options.ssr && !this.state.ssrCache.has(componentName)) {
            const ssrResult = await this.renderSSR(componentName, props);
            this.state.ssrCache.set(componentName, ssrResult);
        }
        
        // Renderizado Client-Side
        let renderedComponent;
        
        if (options.hydration && this.config.enableHydration && this.state.hydrationCache.has(componentName)) {
            renderedComponent = await this.hydrateComponent(componentName, props);
        } else {
            renderedComponent = await this.renderCSR(componentName, props);
        }
        
        // Aplicar optimizaciones si están habilitadas
        if (this.config.enableMemoization) {
            renderedComponent = await this.memoizeComponent(renderedComponent);
        }
        
        return renderedComponent;
    },

    /**
     * Renderizado Server-Side
     */
    renderSSR: async function(componentName, props) {
        // Simulación de renderizado SSR
        const startTime = performance.now();
        
        // En producción, esto usaría un motor de renderizado real
        const ssrHTML = `
            <div class="component-${componentName}" data-ssr="true">
                <h1>${componentName}</h1>
                <div class="ssr-content">
                    ${JSON.stringify(props)}
                </div>
            </div>
        `;
        
        const endTime = performance.now();
        
        return {
            html: ssrHTML,
            renderTime: endTime - startTime,
            timestamp: Date.now(),
            props
        };
    },

    /**
     * Renderizado Client-Side
     */
    renderCSR: async function(componentName, props) {
        const startTime = performance.now();
        
        // Simulación de renderizado CSR
        const component = {
            type: componentName,
            props: props,
            children: this.generateComponentChildren(componentName, props),
            metadata: {
                renderTime: 0,
                timestamp: Date.now(),
                renderMethod: 'csr'
            }
        };
        
        const endTime = performance.now();
        component.metadata.renderTime = endTime - startTime;
        
        return component;
    },

    /**
     * Generar hijos del componente
     */
    generateComponentChildren: function(componentName, props) {
        // Generación simplificada de hijos basada en el tipo de componente
        const children = [];
        
        switch (componentName) {
            case 'navbar':
                children.push({ type: 'nav', props: {}, children: ['Home', 'Cases', 'Documents', 'Analytics'] });
                break;
            case 'sidebar':
                children.push({ type: 'ul', props: {}, children: ['Dashboard', 'Profile', 'Settings'] });
                break;
            case 'case-list':
                children.push({ type: 'div', props: { className: 'case-list' }, children: ['Case 1', 'Case 2', 'Case 3'] });
                break;
            default:
                children.push({ type: 'div', props: {}, children: [`Content for ${componentName}`] });
        }
        
        return children;
    },

    /**
     * Hidratar componente
     */
    hydrateComponent: async function(componentName, props) {
        const ssrData = this.state.hydrationCache.get(componentName);
        
        if (!ssrData) {
            return await this.renderCSR(componentName, props);
        }
        
        // Combinar datos SSR con nuevos props
        const hydratedComponent = {
            ...ssrData.component,
            props: { ...ssrData.props, ...props },
            metadata: {
                ...ssrData.component.metadata,
                hydrated: true,
                hydrationTime: Date.now()
            }
        };
        
        return hydratedComponent;
    },

    /**
     * Memorizar componente
     */
    memoizeComponent: async function(component) {
        // Implementación simple de memoización
        const memoKey = this.generateMemoKey(component);
        
        if (!this.state.componentMetrics.has(memoKey)) {
            this.state.componentMetrics.set(memoKey, {
                component,
                memoizedAt: Date.now(),
                accessCount: 0
            });
        }
        
        return component;
    },

    /**
     * Generar clave de memoización
     */
    generateMemoKey: function(component) {
        return `${component.type}:${this.hashObject(component.props)}`;
    },

    /**
     * Almacenar en caché
     */
    storeInCache: async function(cacheKey, component, componentName) {
        const now = Date.now();
        const ttl = this.getComponentTTL(componentName);
        
        // Procesar componente para almacenamiento
        let processedComponent = component;
        let compressed = false;
        let originalSize = this.calculateComponentSize(component);
        
        // Compresión si está habilitada y el componente es grande
        if (this.config.enableCompression && originalSize > this.config.compressionThreshold) {
            const compressionResult = await this.compressComponent(component);
            if (compressionResult.compressed) {
                processedComponent = compressionResult.data;
                compressed = true;
            }
        }
        
        // Crear entrada de caché
        const cacheEntry = {
            key: cacheKey,
            component: processedComponent,
            componentName,
            timestamp: now,
            ttl,
            expiresAt: now + ttl,
            compressed,
            originalSize,
            compressedSize: compressed ? this.calculateComponentSize(processedComponent) : originalSize,
            accessCount: 0,
            lastAccess: now,
            priority: this.getComponentPriority(componentName),
            version: this.getComponentVersion(componentName),
            checksum: this.calculateComponentChecksum(component)
        };
        
        // Verificar límite de memoria
        await this.checkMemoryLimit();
        
        // Almacenar en caché
        this.state.cache.set(cacheKey, cacheEntry);
        
        // Actualizar métricas de memoria
        this.updateMemoryMetrics(originalSize);
    },

    /**
     * Obtener TTL del componente
     */
    getComponentTTL: function(componentName) {
        const component = this.state.componentRegistry.get(componentName);
        
        if (!component) {
            return this.config.defaultTTL;
        }
        
        // TTL basado en prioridad y frecuencia de uso
        let ttl = this.config.defaultTTL;
        
        switch (component.priority) {
            case 'critical':
                ttl *= 2; // Doble TTL para componentes críticos
                break;
            case 'high':
                ttl *= 1.5;
                break;
            case 'low':
                ttl *= 0.5; // Mitad TTL para componentes de baja prioridad
                break;
        }
        
        // Ajustar por frecuencia de renderizado
        if (component.renderCount > 10) {
            ttl *= 1.2; // 20% más TTL para componentes usados frecuentemente
        }
        
        return ttl;
    },

    /**
     * Obtener prioridad del componente
     */
    getComponentPriority: function(componentName) {
        const component = this.state.componentRegistry.get(componentName);
        return component ? component.priority : 'normal';
    },

    /**
     * Calcular tamaño del componente
     */
    calculateComponentSize: function(component) {
        if (!component) return 0;
        
        const jsonString = JSON.stringify(component);
        return new Blob([jsonString]).size;
    },

    /**
     * Calcular checksum del componente
     */
    calculateComponentChecksum: function(component) {
        const jsonString = JSON.stringify(component);
        let hash = 0;
        
        for (let i = 0; i < jsonString.length; i++) {
            const char = jsonString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString(36);
    },

    /**
     * Comprimir componente
     */
    compressComponent: async function(component) {
        try {
            const jsonString = JSON.stringify(component);
            
            if (typeof CompressionStream !== 'undefined') {
                const stream = new CompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                const encoder = new TextEncoder();
                const uint8Array = encoder.encode(jsonString);
                
                writer.write(uint8Array);
                writer.close();
                
                const chunks = [];
                let done = false;
                
                while (!done) {
                    const { value: chunk, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (chunk) {
                        chunks.push(chunk);
                    }
                }
                
                const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
                let offset = 0;
                for (const chunk of chunks) {
                    compressed.set(chunk, offset);
                    offset += chunk.length;
                }
                
                return {
                    compressed: true,
                    data: compressed,
                    originalSize: jsonString.length,
                    compressedSize: compressed.length
                };
            }
            
            return { compressed: false, data: component };
            
        } catch (error) {
            this.log('Error comprimiendo componente:', error);
            return { compressed: false, data: component };
        }
    },

    /**
     * Descomprimir componente
     */
    decompressComponent: async function(compressedData) {
        try {
            if (typeof DecompressionStream !== 'undefined' && compressedData instanceof Uint8Array) {
                const stream = new DecompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                writer.write(compressedData);
                writer.close();
                
                const chunks = [];
                let done = false;
                
                while (!done) {
                    const { value: chunk, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (chunk) {
                        chunks.push(chunk);
                    }
                }
                
                const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
                let offset = 0;
                for (const chunk of chunks) {
                    decompressed.set(chunk, offset);
                    offset += chunk.length;
                }
                
                const decoder = new TextDecoder();
                return JSON.parse(decoder.decode(decompressed));
            }
            
            return compressedData;
            
        } catch (error) {
            this.log('Error descomprimiendo componente:', error);
            return compressedData;
        }
    },

    /**
     * Actualizar Virtual DOM
     */
    updateVirtualDOM: async function(cacheKey, component) {
        if (!this.config.enableVirtualDOM) {
            return;
        }
        
        // Crear representación virtual del componente
        const virtualComponent = {
            key: cacheKey,
            type: component.type,
            props: component.props,
            children: component.children,
            checksum: this.calculateComponentChecksum(component),
            timestamp: Date.now()
        };
        
        this.state.virtualDOM.set(cacheKey, virtualComponent);
    },

    /**
     * Verificar límite de memoria
     */
    checkMemoryLimit: async function() {
        const currentUsage = this.calculateMemoryUsage();
        
        if (currentUsage > this.config.maxMemoryUsage) {
            await this.performGarbageCollection();
        }
    },

    /**
     * Calcular uso de memoria
     */
    calculateMemoryUsage: function() {
        let totalSize = 0;
        
        for (const [key, entry] of this.state.cache.entries()) {
            totalSize += entry.compressed ? entry.compressedSize : entry.originalSize;
        }
        
        return totalSize;
    },

    /**
     * Actualizar métricas de memoria
     */
    updateMemoryMetrics: function(size) {
        this.state.memoryTracker.allocated += size;
        
        if (this.state.memoryTracker.allocated > this.state.memoryTracker.peak) {
            this.state.memoryTracker.peak = this.state.memoryTracker.allocated;
        }
        
        this.state.renderStats.memoryUsage = this.calculateMemoryUsage();
    },

    /**
     * Actualizar estadísticas de renderizado
     */
    updateRenderStats: function(renderTime) {
        const stats = this.state.renderStats;
        const totalRenders = stats.totalRenders;
        
        // Calcular tiempo promedio de renderizado
        stats.averageRenderTime = 
            (stats.averageRenderTime * (totalRenders - 1) + renderTime) / totalRenders;
        
        // Calcular hit rate
        const totalAccesses = stats.cachedRenders + stats.totalRenders;
        stats.cacheHitRate = totalAccesses > 0 ? 
            (stats.cachedRenders / totalAccesses) * 100 : 0;
    },

    /**
     * Actualizar métricas del componente
     */
    updateComponentMetrics: function(componentName, action, duration) {
        if (!this.state.componentMetrics.has(componentName)) {
            this.state.componentMetrics.set(componentName, {
                renderCount: 0,
                cacheHits: 0,
                skippedRenders: 0,
                totalRenderTime: 0,
                averageRenderTime: 0,
                lastRendered: null
            });
        }
        
        const metrics = this.state.componentMetrics.get(componentName);
        
        switch (action) {
            case 'render':
                metrics.renderCount++;
                metrics.totalRenderTime += duration;
                metrics.averageRenderTime = metrics.totalRenderTime / metrics.renderCount;
                metrics.lastRendered = Date.now();
                break;
            case 'cache_hit':
                metrics.cacheHits++;
                break;
            case 'skipped_render':
                metrics.skippedRenders++;
                break;
        }
        
        // Actualizar registro del componente
        const component = this.state.componentRegistry.get(componentName);
        if (component) {
            component.renderCount = metrics.renderCount;
            component.averageRenderTime = metrics.averageRenderTime;
            component.lastRendered = metrics.lastRendered;
        }
    },

    /**
     * Iniciar garbage collection
     */
    startGarbageCollection: function() {
        setInterval(async () => {
            await this.performGarbageCollection();
        }, this.config.gcInterval);
    },

    /**
     * Realizar garbage collection
     */
    performGarbageCollection: async function() {
        const now = Date.now();
        const keysToDelete = [];
        
        // Identificar componentes expirados
        for (const [key, entry] of this.state.cache.entries()) {
            if (now > entry.expiresAt) {
                keysToDelete.push(key);
            }
        }
        
        // Identificar componentes de baja prioridad si la memoria es alta
        const memoryUsage = this.calculateMemoryUsage();
        if (memoryUsage > this.config.maxMemoryUsage * 0.8) {
            const lowPriorityEntries = Array.from(this.state.cache.entries())
                .filter(([_, entry]) => entry.priority === 'low')
                .sort(([_, a], [__, b]) => a.lastAccess - b.lastAccess)
                .slice(0, Math.floor(keysToDelete.length / 2));
            
            lowPriorityEntries.forEach(([key]) => keysToDelete.push(key));
        }
        
        // Eliminar componentes
        let freedMemory = 0;
        for (const key of keysToDelete) {
            const entry = this.state.cache.get(key);
            if (entry) {
                freedMemory += entry.compressed ? entry.compressedSize : entry.originalSize;
                this.state.cache.delete(key);
                this.state.virtualDOM.delete(key);
            }
        }
        
        // Actualizar métricas
        this.state.memoryTracker.freed += freedMemory;
        this.state.lastGC = now;
        
        if (keysToDelete.length > 0) {
            this.log(`Garbage collection: ${keysToDelete.length} componentes eliminados, ${freedMemory} bytes liberados`);
        }
    },

    /**
     * Iniciar procesamiento por lotes
     */
    startBatchProcessor: function() {
        setInterval(async () => {
            await this.processBatchQueue();
        }, 16); // ~60fps
    },

    /**
     * Procesar cola de lotes
     */
    processBatchQueue: async function() {
        if (this.state.batchQueue.length === 0) {
            return;
        }
        
        const batch = this.state.batchQueue.splice(0, this.config.batchSize);
        
        try {
            await Promise.all(batch.map(item => this.processBatchItem(item)));
        } catch (error) {
            this.log('Error procesando lote:', error);
        }
    },

    /**
     * Procesar item de lote
     */
    processBatchItem: async function(item) {
        switch (item.type) {
            case 'render':
                return await this.renderComponent(item.componentName, item.props, item.options);
            case 'update':
                return await this.updateComponent(item.componentName, item.props, item.options);
            case 'invalidate':
                return await this.invalidateComponent(item.componentName);
            default:
                this.log(`Tipo de item de lote desconocido: ${item.type}`);
        }
    },

    /**
     * Iniciar monitoreo de memoria
     */
    startMemoryMonitoring: function() {
        setInterval(async () => {
            const usage = this.calculateMemoryUsage();
            this.state.renderStats.memoryUsage = usage;
            
            if (usage > this.config.maxMemoryUsage * 0.9) {
                this.log(`Alto uso de memoria detectado: ${usage} bytes`);
                await this.performGarbageCollection();
            }
        }, 30000); // Cada 30 segundos
    },

    /**
     * Invalidar componente
     */
    invalidateComponent: async function(componentName) {
        const keysToDelete = [];
        
        for (const [key, entry] of this.state.cache.entries()) {
            if (entry.componentName === componentName) {
                keysToDelete.push(key);
            }
        }
        
        for (const key of keysToDelete) {
            this.state.cache.delete(key);
            this.state.virtualDOM.delete(key);
        }
        
        this.log(`Componente invalidado: ${componentName} (${keysToDelete.length} entradas eliminadas)`);
    },

    /**
     * Actualizar componente
     */
    updateComponent: async function(componentName, props, options = {}) {
        // Invalidar caché existente
        await this.invalidateComponent(componentName);
        
        // Renderizar con nuevos props
        return await this.renderComponent(componentName, props, { ...options, forceRender: true });
    },

    /**
     * Precargar componente
     */
    preloadComponent: async function(componentName, props = {}) {
        if (!this.config.enablePreloading) {
            return;
        }
        
        const cacheKey = this.generateComponentKey(componentName, props, { preload: true });
        
        if (!this.state.cache.has(cacheKey)) {
            // Agregar a cola de renderizado con prioridad baja
            this.state.renderQueue.push({
                type: 'render',
                componentName,
                props,
                options: { preload: true, priority: 'low' }
            });
        }
    },

    /**
     * Obtener componente lazy
     */
    getLazyComponent: async function(componentName, props = {}) {
        if (!this.config.enableLazyLoading) {
            return await this.renderComponent(componentName, props);
        }
        
        const component = this.state.componentRegistry.get(componentName);
        
        if (!component || !component.lazy) {
            return await this.renderComponent(componentName, props);
        }
        
        // Cargar componente solo cuando se necesite
        return await this.renderComponent(componentName, props, { lazy: true });
    },

    /**
     * Suscribirse a hot reload
     */
    subscribeToHotReload: function(callback) {
        if (!this.config.enableHotReload) {
            return;
        }
        
        this.state.hotReloadSubscribers.add(callback);
        
        return () => {
            this.state.hotReloadSubscribers.delete(callback);
        };
    },

    /**
     * Disparar hot reload
     */
    triggerHotReload: async function(componentName) {
        if (!this.config.enableHotReload) {
            return;
        }
        
        // Invalidar componente
        await this.invalidateComponent(componentName);
        
        // Notificar suscriptores
        for (const callback of this.state.hotReloadSubscribers) {
            try {
                await callback(componentName);
            } catch (error) {
                this.log('Error en callback de hot reload:', error);
            }
        }
        
        this.log(`Hot reload triggered: ${componentName}`);
    },

    /**
     * Limpiar caché
     */
    clear: async function() {
        const clearedCount = this.state.cache.size;
        
        this.state.cache.clear();
        this.state.virtualDOM.clear();
        this.state.ssrCache.clear();
        this.state.hydrationCache.clear();
        this.state.renderQueue = [];
        this.state.batchQueue = [];
        
        // Reiniciar estadísticas
        this.state.renderStats = {
            totalRenders: 0,
            cachedRenders: 0,
            skippedRenders: 0,
            averageRenderTime: 0,
            memoryUsage: 0,
            cacheHitRate: 0
        };
        
        this.state.memoryTracker = {
            allocated: 0,
            freed: 0,
            peak: 0
        };
        
        this.log(`Component Cache CLEAR: ${clearedCount} componentes eliminados`);
        return clearedCount;
    },

    /**
     * Obtener estadísticas
     */
    getStatistics: function() {
        return {
            cacheSize: this.state.cache.size,
            virtualDOMSize: this.state.virtualDOM.size,
            renderStats: this.state.renderStats,
            memoryTracker: this.state.memoryTracker,
            componentMetrics: Object.fromEntries(this.state.componentMetrics),
            registrySize: this.state.componentRegistry.size,
            queueSizes: {
                render: this.state.renderQueue.length,
                batch: this.state.batchQueue.length
            }
        };
    },

    /**
     * Obtener estado detallado
     */
    getDetailedStatus: function() {
        return {
            statistics: this.getStatistics(),
            config: this.config,
            componentRegistry: Object.fromEntries(this.state.componentRegistry),
            dependencyGraph: Object.fromEntries(this.state.dependencyGraph),
            cacheEntries: Array.from(this.state.cache.entries()).slice(-10),
            isInitialized: this.state.isInitialized,
            lastGC: this.state.lastGC
        };
    },

    /**
     * Exportar configuración de componentes
     */
    exportComponentConfig: function() {
        return {
            registry: Object.fromEntries(this.state.componentRegistry),
            dependencyGraph: Object.fromEntries(this.state.dependencyGraph),
            metrics: Object.fromEntries(this.state.componentMetrics),
            versionMap: Object.fromEntries(this.state.versionMap),
            timestamp: Date.now()
        };
    },

    /**
     * Importar configuración de componentes
     */
    importComponentConfig: function(config) {
        if (config.registry) {
            this.state.componentRegistry = new Map(Object.entries(config.registry));
        }
        
        if (config.dependencyGraph) {
            this.state.dependencyGraph = new Map(Object.entries(config.dependencyGraph));
        }
        
        if (config.metrics) {
            this.state.componentMetrics = new Map(Object.entries(config.metrics));
        }
        
        if (config.versionMap) {
            this.state.versionMap = new Map(Object.entries(config.versionMap));
        }
        
        this.log('Configuración de componentes importada');
    },

    /**
     * Logging
     */
    log: function(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [ComponentCache] ${message}`;
        
        if (data) {
            console.log(logEntry, data);
        } else {
            console.log(logEntry);
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.ComponentCache = ComponentCache;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentCache;
}