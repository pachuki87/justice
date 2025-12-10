/**
 * Justice 2 Asset Cache - Caché Especializada para Recursos Estáticos
 * Optimiza el almacenamiento y entrega de CSS, JS, imágenes y otros assets
 */

const AssetCache = {
    // Configuración
    config: {
        maxAssets: 1000,
        defaultTTL: 86400000, // 24 horas
        enableCompression: true,
        enableMinification: true,
        enableOptimization: true,
        enableVersioning: true,
        enableLazyLoading: true,
        enablePreloading: true,
        enableCDNIntegration: false,
        enableServiceWorker: false,
        enableImageOptimization: true,
        enableBundleOptimization: true,
        enableCacheBusting: true,
        enableIntegrityHashes: true,
        enableCriticalCSS: true,
        enableFontOptimization: true,
        enableIconOptimization: true,
        compressionLevel: 6, // 1-9 para gzip
        imageQuality: 85, // 1-100 para imágenes
        maxAssetSize: 10 * 1024 * 1024, // 10MB
        supportedFormats: ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'woff', 'woff2', 'ttf', 'eot'],
        cdnEndpoints: [],
        preloadCriticalAssets: true,
        enableMetrics: true,
        enableProfiling: false
    },

    // Estado
    state: {
        cache: new Map(),
        assetRegistry: new Map(),
        bundleRegistry: new Map(),
        optimizationQueue: [],
        preloadQueue: [],
        assetStats: {
            totalAssets: 0,
            cachedAssets: 0,
            optimizedAssets: 0,
            compressedAssets: 0,
            totalSize: 0,
            compressedSize: 0,
            cacheHitRate: 0,
            averageLoadTime: 0,
            bandwidthSaved: 0
        },
        assetMetrics: new Map(),
        versionMap: new Map(),
        integrityMap: new Map(),
        criticalAssets: new Set(),
        preloadRegistry: new Map(),
        bundleDependencies: new Map(),
        isInitialized: false,
        lastOptimization: Date.now()
    },

    /**
     * Inicializar Asset Cache
     */
    init: async function(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        
        // Inicializar registro de assets
        await this.initializeAssetRegistry();
        
        // Inicializar registro de bundles
        await this.initializeBundleRegistry();
        
        // Identificar assets críticos
        await this.identifyCriticalAssets();
        
        // Iniciar optimización periódica
        if (this.config.enableOptimization) {
            this.startOptimizationTimer();
        }
        
        // Iniciar preloading si está habilitado
        if (this.config.enablePreloading) {
            this.startPreloading();
        }
        
        // Iniciar Service Worker si está habilitado
        if (this.config.enableServiceWorker) {
            await this.initializeServiceWorker();
        }
        
        this.state.isInitialized = true;
        this.log('Asset Cache inicializado con capacidades de optimización de recursos estáticos');
    },

    /**
     * Inicializar registro de assets
     */
    initializeAssetRegistry: async function() {
        // Assets conocidos de Justice 2
        const knownAssets = [
            // CSS
            { name: 'main.css', type: 'css', path: '/css/main.css', critical: true },
            { name: 'justice2-dynamic.css', type: 'css', path: '/css/justice2-dynamic.css', critical: true },
            { name: 'ai-assistant.css', type: 'css', path: '/css/ai-assistant.css', critical: false },
            { name: 'analytics.css', type: 'css', path: '/css/analytics.css', critical: false },
            { name: 'cases.css', type: 'css', path: '/css/cases.css', critical: false },
            { name: 'documents.css', type: 'css', path: '/css/documents.css', critical: false },
            
            // JavaScript
            { name: 'main.js', type: 'js', path: '/js/main.js', critical: true },
            { name: 'justice2-core.js', type: 'js', path: '/js/justice2-core.js', critical: true },
            { name: 'justice2-api.js', type: 'js', path: '/js/justice2-api.js', critical: true },
            { name: 'justice2-auth.js', type: 'js', path: '/js/justice2-auth.js', critical: true },
            { name: 'ai-assistant.js', type: 'js', path: '/js/ai-assistant.js', critical: false },
            { name: 'analytics.js', type: 'js', path: '/js/analytics.js', critical: false },
            { name: 'cases.js', type: 'js', path: '/js/cases.js', critical: false },
            { name: 'documents.js', type: 'js', path: '/js/documents.js', critical: false },
            
            // Imágenes
            { name: 'carousel-1.jpg', type: 'jpg', path: '/images/carousel-1.jpg', critical: false },
            { name: 'carousel-2.jpg', type: 'jpg', path: '/images/carousel-2.jpg', critical: false },
            { name: 'feature.jpg', type: 'jpg', path: '/images/feature.jpg', critical: false },
            { name: 'team-1.jpg', type: 'jpg', path: '/images/team-1.jpg', critical: false },
            { name: 'team-2.jpg', type: 'jpg', path: '/images/team-2.jpg', critical: false },
            
            // Fuentes
            { name: 'main-font.woff2', type: 'woff2', path: '/fonts/main.woff2', critical: true },
            { name: 'icon-font.woff2', type: 'woff2', path: '/fonts/icon.woff2', critical: false }
        ];
        
        for (const asset of knownAssets) {
            this.state.assetRegistry.set(asset.name, {
                ...asset,
                version: '1.0.0',
                size: 0,
                compressedSize: 0,
                optimized: false,
                compressed: false,
                lastModified: Date.now(),
                hash: null,
                integrity: null,
                cdnUrl: null,
                priority: asset.critical ? 'high' : 'normal'
            });
        }
    },

    /**
     * Inicializar registro de bundles
     */
    initializeBundleRegistry: async function() {
        const knownBundles = [
            {
                name: 'vendor',
                type: 'js',
                assets: ['justice2-core.js', 'justice2-api.js', 'justice2-auth.js'],
                critical: true
            },
            {
                name: 'common',
                type: 'css',
                assets: ['main.css', 'justice2-dynamic.css'],
                critical: true
            },
            {
                name: 'pages',
                type: 'js',
                assets: ['ai-assistant.js', 'analytics.js', 'cases.js', 'documents.js'],
                critical: false
            }
        ];
        
        for (const bundle of knownBundles) {
            this.state.bundleRegistry.set(bundle.name, {
                ...bundle,
                version: '1.0.0',
                size: 0,
                compressedSize: 0,
                optimized: false,
                generated: false,
                lastGenerated: null
            });
            
            // Registrar dependencias
            this.state.bundleDependencies.set(bundle.name, bundle.assets);
        }
    },

    /**
     * Identificar assets críticos
     */
    identifyCriticalAssets: async function() {
        for (const [name, asset] of this.state.assetRegistry.entries()) {
            if (asset.critical) {
                this.state.criticalAssets.add(name);
            }
        }
        
        // Assets críticos adicionales basados en análisis
        const additionalCritical = ['main.js', 'justice2-core.js', 'main.css'];
        additionalCritical.forEach(name => this.state.criticalAssets.add(name));
    },

    /**
     * Obtener asset
     */
    getAsset: async function(assetName, options = {}) {
        const startTime = performance.now();
        
        try {
            // Generar clave de caché
            const cacheKey = this.generateAssetKey(assetName, options);
            
            // Verificar si está en caché
            const cachedAsset = await this.getFromCache(cacheKey);
            if (cachedAsset && !options.forceReload) {
                this.state.assetStats.cachedAssets++;
                this.updateAssetMetrics(assetName, 'cache_hit', performance.now() - startTime);
                
                this.log(`Asset Cache HIT: ${assetName}`);
                return cachedAsset;
            }
            
            // Obtener asset del registro
            const asset = this.state.assetRegistry.get(assetName);
            if (!asset) {
                throw new Error(`Asset no encontrado: ${assetName}`);
            }
            
            // Cargar y procesar asset
            const processedAsset = await this.loadAndProcessAsset(asset, options);
            
            // Almacenar en caché
            await this.storeInCache(cacheKey, processedAsset, assetName);
            
            // Actualizar estadísticas
            this.state.assetStats.totalAssets++;
            const endTime = performance.now();
            this.updateAssetStats(endTime - startTime, processedAsset);
            this.updateAssetMetrics(assetName, 'load', endTime - startTime);
            
            this.log(`Asset loaded: ${assetName} (${(endTime - startTime).toFixed(2)}ms)`);
            
            return processedAsset;
            
        } catch (error) {
            this.log(`Error obteniendo asset ${assetName}:`, error);
            throw error;
        }
    },

    /**
     * Generar clave de caché para asset
     */
    generateAssetKey: function(assetName, options) {
        const optionsHash = this.hashObject(options);
        const version = this.getAssetVersion(assetName);
        
        return `${assetName}:${version}:${optionsHash}`;
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
     * Obtener versión del asset
     */
    getAssetVersion: function(assetName) {
        const asset = this.state.assetRegistry.get(assetName);
        return asset ? asset.version : '1.0.0';
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
        let asset = cached.asset;
        if (cached.compressed) {
            asset = await this.decompressAsset(asset);
        }
        
        // Actualizar último acceso
        cached.lastAccess = Date.now();
        cached.accessCount++;
        
        return asset;
    },

    /**
     * Cargar y procesar asset
     */
    loadAndProcessAsset: async function(asset, options = {}) {
        // Cargar asset
        let assetContent = await this.loadAssetContent(asset);
        
        // Optimizar si está habilitado
        if (this.config.enableOptimization && !asset.optimized) {
            assetContent = await this.optimizeAsset(asset, assetContent);
            asset.optimized = true;
        }
        
        // Minificar si está habilitado
        if (this.config.enableMinification) {
            assetContent = await this.minifyAsset(asset, assetContent);
        }
        
        // Comprimir si está habilitado
        let compressed = false;
        let originalSize = this.calculateAssetSize(assetContent);
        
        if (this.config.enableCompression && originalSize > 1024) {
            const compressionResult = await this.compressAsset(assetContent, asset.type);
            if (compressionResult.compressed) {
                assetContent = compressionResult.data;
                compressed = true;
            }
        }
        
        // Generar hash de integridad si está habilitado
        let integrity = null;
        if (this.config.enableIntegrityHashes) {
            integrity = await this.generateIntegrityHash(assetContent);
        }
        
        // Actualizar asset en registro
        asset.size = originalSize;
        asset.compressedSize = compressed ? this.calculateAssetSize(assetContent) : originalSize;
        asset.compressed = compressed;
        asset.hash = this.generateAssetHash(assetContent);
        asset.integrity = integrity;
        asset.lastModified = Date.now();
        
        // Actualizar versión si está habilitado
        if (this.config.enableVersioning) {
            asset.version = this.incrementVersion(asset.version);
            this.state.versionMap.set(asset.name, asset.version);
        }
        
        return {
            content: assetContent,
            type: asset.type,
            name: asset.name,
            path: asset.path,
            compressed,
            originalSize,
            compressedSize: asset.compressedSize,
            integrity,
            version: asset.version,
            cdnUrl: asset.cdnUrl
        };
    },

    /**
     * Cargar contenido del asset
     */
    loadAssetContent: async function(asset) {
        // Simulación de carga de archivo
        // En producción, esto cargaría el archivo real del sistema de archivos o CDN
        
        const mockContents = {
            'main.css': `body { font-family: Arial, sans-serif; margin: 0; padding: 0; } .container { max-width: 1200px; margin: 0 auto; }`,
            'justice2-dynamic.css': `.dynamic { transition: all 0.3s ease; } .animated { animation: fadeIn 0.5s; }`,
            'ai-assistant.css': `.ai-assistant { position: fixed; right: 20px; bottom: 20px; background: #007bff; }`,
            'main.js': `console.log('Justice 2 Main Module'); const app = { init() { console.log('App initialized'); } };`,
            'justice2-core.js': `const Justice2Core = { version: '2.0.0', init() { console.log('Core initialized'); } };`,
            'justice2-api.js': `const API = { baseUrl: '/api', async request(endpoint) { return fetch(this.baseUrl + endpoint); } };`,
            'justice2-auth.js': `const Auth = { login(user, pass) { /* login logic */ }, logout() { /* logout logic */ } };`,
            'carousel-1.jpg': 'mock-image-data-carousel-1',
            'carousel-2.jpg': 'mock-image-data-carousel-2',
            'feature.jpg': 'mock-image-data-feature',
            'main-font.woff2': 'mock-font-data-main'
        };
        
        return mockContents[asset.name] || `Mock content for ${asset.name}`;
    },

    /**
     * Optimizar asset
     */
    optimizeAsset: async function(asset, content) {
        let optimizedContent = content;
        
        switch (asset.type) {
            case 'css':
                optimizedContent = await this.optimizeCSS(content);
                break;
            case 'js':
                optimizedContent = await this.optimizeJS(content);
                break;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'webp':
                optimizedContent = await this.optimizeImage(content, asset.type);
                break;
            case 'svg':
                optimizedContent = await this.optimizeSVG(content);
                break;
            case 'woff':
            case 'woff2':
            case 'ttf':
                optimizedContent = await this.optimizeFont(content, asset.type);
                break;
        }
        
        return optimizedContent;
    },

    /**
     * Optimizar CSS
     */
    optimizeCSS: async function(css) {
        // Optimización CSS básica
        return css
            .replace(/\/\*[\s\S]*?\*\//g, '') // Eliminar comentarios
            .replace(/\s+/g, ' ') // Reducir espacios
            .replace(/;\s*}/g, '}') // Eliminar punto y coma final
            .replace(/\s*{\s*/g, '{') // Reducir espacios alrededor de llaves
            .replace(/;\s*/g, ';') // Reducir espacios después de punto y coma
            .trim();
    },

    /**
     * Optimizar JavaScript
     */
    optimizeJS: async function(js) {
        // Optimización JS básica
        return js
            .replace(/\/\*[\s\S]*?\*\//g, '') // Eliminar comentarios bloque
            .replace(/\/\/.*$/gm, '') // Eliminar comentarios línea
            .replace(/\s+/g, ' ') // Reducir espacios
            .replace(/;\s*}/g, '}') // Eliminar punto y coma final
            .trim();
    },

    /**
     * Optimizar imagen
     */
    optimizeImage: async function(imageData, format) {
        // Simulación de optimización de imagen
        // En producción, usar librerías como sharp, imagemin, etc.
        
        if (this.config.enableImageOptimization) {
            // Simular compresión de imagen
            const compressionRatio = 0.8; // 20% de reducción
            return `optimized-${format}-image-data-${compressionRatio}`;
        }
        
        return imageData;
    },

    /**
     * Optimizar SVG
     */
    optimizeSVG: async function(svg) {
        // Optimización SVG básica
        return svg
            .replace(/<!--[\s\S]*?-->/g, '') // Eliminar comentarios
            .replace(/\s+/g, ' ') // Reducir espacios
            .replace(/\s+=/g, '=') // Eliminar espacios antes de =
            .replace(/=\s+/g, '=') // Eliminar espacios después de =
            .trim();
    },

    /**
     * Optimizar fuente
     */
    optimizeFont: async function(fontData, format) {
        // Simulación de optimización de fuente
        // En producción, usar herramientas específicas para fuentes
        return fontData;
    },

    /**
     * Minificar asset
     */
    minifyAsset: async function(asset, content) {
        // La minificación ya se incluye en la optimización básica
        // En producción, usar minificadores específicos como terser, cssnano, etc.
        return content;
    },

    /**
     * Comprimir asset
     */
    compressAsset: async function(content, type) {
        try {
            const contentString = typeof content === 'string' ? content : JSON.stringify(content);
            
            if (typeof CompressionStream !== 'undefined') {
                const stream = new CompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                const encoder = new TextEncoder();
                const uint8Array = encoder.encode(contentString);
                
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
                    originalSize: contentString.length,
                    compressedSize: compressed.length
                };
            }
            
            return { compressed: false, data: content };
            
        } catch (error) {
            this.log('Error comprimiendo asset:', error);
            return { compressed: false, data: content };
        }
    },

    /**
     * Generar hash de integridad
     */
    generateIntegrityHash: async function(content) {
        try {
            const contentString = typeof content === 'string' ? content : JSON.stringify(content);
            const encoder = new TextEncoder();
            const data = encoder.encode(contentString);
            
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                return `sha256-${hashHex}`;
            }
            
            // Fallback para navegadores sin crypto.subtle
            return 'mock-integrity-hash';
            
        } catch (error) {
            this.log('Error generando hash de integridad:', error);
            return null;
        }
    },

    /**
     * Generar hash del asset
     */
    generateAssetHash: function(content) {
        const contentString = typeof content === 'string' ? content : JSON.stringify(content);
        let hash = 0;
        
        for (let i = 0; i < contentString.length; i++) {
            const char = contentString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString(36);
    },

    /**
     * Calcular tamaño del asset
     */
    calculateAssetSize: function(asset) {
        if (!asset) return 0;
        
        if (typeof asset === 'string') {
            return new Blob([asset]).size;
        }
        
        if (asset instanceof Uint8Array) {
            return asset.length;
        }
        
        const jsonString = JSON.stringify(asset);
        return new Blob([jsonString]).size;
    },

    /**
     * Incrementar versión
     */
    incrementVersion: function(version) {
        const parts = version.split('.');
        const patch = parseInt(parts[2] || 0) + 1;
        return `${parts[0]}.${parts[1]}.${patch}`;
    },

    /**
     * Almacenar en caché
     */
    storeInCache: async function(cacheKey, asset, assetName) {
        const now = Date.now();
        const ttl = this.getAssetTTL(assetName);
        
        // Procesar asset para almacenamiento
        let processedAsset = asset;
        let compressed = asset.compressed;
        let originalSize = asset.originalSize;
        let compressedSize = asset.compressedSize || originalSize;
        
        // Crear entrada de caché
        const cacheEntry = {
            key: cacheKey,
            asset: processedAsset,
            assetName,
            timestamp: now,
            ttl,
            expiresAt: now + ttl,
            compressed,
            originalSize,
            compressedSize,
            accessCount: 0,
            lastAccess: now,
            version: asset.version,
            integrity: asset.integrity,
            checksum: this.calculateAssetChecksum(asset.content)
        };
        
        // Verificar límite de caché
        await this.checkCacheLimit();
        
        // Almacenar en caché
        this.state.cache.set(cacheKey, cacheEntry);
        
        // Actualizar estadísticas
        this.updateAssetStats(0, asset);
    },

    /**
     * Obtener TTL del asset
     */
    getAssetTTL: function(assetName) {
        const asset = this.state.assetRegistry.get(assetName);
        
        if (!asset) {
            return this.config.defaultTTL;
        }
        
        // TTL basado en tipo y prioridad
        let ttl = this.config.defaultTTL;
        
        switch (asset.type) {
            case 'css':
            case 'js':
                ttl *= 1.5; // Mayor TTL para assets de construcción
                break;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'webp':
                ttl *= 2; // Mayor TTL para imágenes
                break;
            case 'woff':
            case 'woff2':
            case 'ttf':
                ttl *= 3; // Mayor TTL para fuentes
                break;
        }
        
        // Ajustar por prioridad
        if (asset.priority === 'high') {
            ttl *= 1.5;
        } else if (asset.priority === 'low') {
            ttl *= 0.5;
        }
        
        return ttl;
    },

    /**
     * Calcular checksum del asset
     */
    calculateAssetChecksum: function(content) {
        const contentString = typeof content === 'string' ? content : JSON.stringify(content);
        let hash = 0;
        
        for (let i = 0; i < contentString.length; i++) {
            const char = contentString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString(36);
    },

    /**
     * Verificar límite de caché
     */
    checkCacheLimit: async function() {
        if (this.state.cache.size <= this.config.maxAssets) {
            return;
        }
        
        // Ordenar por último acceso
        const entries = Array.from(this.state.cache.entries())
            .sort(([_, a], [__, b]) => a.lastAccess - b.lastAccess);
        
        // Eliminar las más antiguas
        const toDelete = entries.slice(0, this.state.cache.size - this.config.maxAssets + 10);
        
        for (const [key] of toDelete) {
            this.state.cache.delete(key);
        }
        
        this.log(`Cache limit reached: ${toDelete.length} assets evicted`);
    },

    /**
     * Actualizar estadísticas de assets
     */
    updateAssetStats: function(loadTime, asset) {
        const stats = this.state.assetStats;
        
        // Actualizar tiempos
        if (loadTime > 0) {
            stats.averageLoadTime = 
                (stats.averageLoadTime + loadTime) / 2;
        }
        
        // Actualizar tamaños
        if (asset) {
            stats.totalSize += asset.originalSize;
            stats.compressedSize += asset.compressedSize;
            
            if (asset.compressed) {
                stats.compressedAssets++;
                stats.bandwidthSaved += (asset.originalSize - asset.compressedSize);
            }
            
            if (asset.optimized) {
                stats.optimizedAssets++;
            }
        }
        
        // Calcular hit rate
        const totalAccesses = stats.cachedAssets + stats.totalAssets;
        stats.cacheHitRate = totalAccesses > 0 ? 
            (stats.cachedAssets / totalAccesses) * 100 : 0;
    },

    /**
     * Actualizar métricas del asset
     */
    updateAssetMetrics: function(assetName, action, duration) {
        if (!this.state.assetMetrics.has(assetName)) {
            this.state.assetMetrics.set(assetName, {
                loadCount: 0,
                cacheHits: 0,
                totalLoadTime: 0,
                averageLoadTime: 0,
                lastLoaded: null
            });
        }
        
        const metrics = this.state.assetMetrics.get(assetName);
        
        switch (action) {
            case 'load':
                metrics.loadCount++;
                metrics.totalLoadTime += duration;
                metrics.averageLoadTime = metrics.totalLoadTime / metrics.loadCount;
                metrics.lastLoaded = Date.now();
                break;
            case 'cache_hit':
                metrics.cacheHits++;
                break;
        }
        
        // Actualizar registro del asset
        const asset = this.state.assetRegistry.get(assetName);
        if (asset) {
            asset.lastModified = Date.now();
        }
    },

    /**
     * Obtener bundle
     */
    getBundle: async function(bundleName, options = {}) {
        const bundle = this.state.bundleRegistry.get(bundleName);
        
        if (!bundle) {
            throw new Error(`Bundle no encontrado: ${bundleName}`);
        }
        
        // Si ya está generado, devolverlo
        if (bundle.generated && !options.forceRegenerate) {
            return await this.getAsset(`${bundle.name}.${bundle.type}`, options);
        }
        
        // Generar bundle
        return await this.generateBundle(bundle, options);
    },

    /**
     * Generar bundle
     */
    generateBundle: async function(bundle, options = {}) {
        const startTime = performance.now();
        
        try {
            const assets = this.state.bundleDependencies.get(bundle.name) || [];
            let bundleContent = '';
            let totalSize = 0;
            
            // Concatenar assets
            for (const assetName of assets) {
                const asset = await this.getAsset(assetName, options);
                bundleContent += asset.content;
                bundleContent += '\n'; // Separador
                totalSize += asset.originalSize;
            }
            
            // Optimizar bundle si está habilitado
            if (this.config.enableBundleOptimization) {
                bundleContent = await this.optimizeBundle(bundleContent, bundle.type);
            }
            
            // Comprimir bundle si está habilitado
            let compressed = false;
            let compressedContent = bundleContent;
            let compressedSize = totalSize;
            
            if (this.config.enableCompression && totalSize > 2048) {
                const compressionResult = await this.compressAsset(bundleContent, bundle.type);
                if (compressionResult.compressed) {
                    compressedContent = compressionResult.data;
                    compressed = true;
                    compressedSize = compressionResult.compressedSize;
                }
            }
            
            // Generar integridad
            const integrity = this.config.enableIntegrityHashes ? 
                await this.generateIntegrityHash(compressedContent) : null;
            
            // Actualizar bundle
            bundle.generated = true;
            bundle.lastGenerated = Date.now();
            bundle.size = totalSize;
            bundle.compressedSize = compressedSize;
            bundle.compressed = compressed;
            bundle.integrity = integrity;
            
            // Almacenar bundle como asset
            const bundleAsset = {
                name: `${bundle.name}.${bundle.type}`,
                type: bundle.type,
                path: `/bundles/${bundle.name}.${bundle.type}`,
                content: compressedContent,
                compressed,
                originalSize: totalSize,
                compressedSize,
                integrity,
                version: bundle.version
            };
            
            const cacheKey = this.generateAssetKey(bundleAsset.name, options);
            await this.storeInCache(cacheKey, bundleAsset, bundleAsset.name);
            
            const endTime = performance.now();
            this.log(`Bundle generated: ${bundle.name} (${(endTime - startTime).toFixed(2)}ms)`);
            
            return bundleAsset;
            
        } catch (error) {
            this.log(`Error generando bundle ${bundle.name}:`, error);
            throw error;
        }
    },

    /**
     * Optimizar bundle
     */
    optimizeBundle: async function(content, type) {
        switch (type) {
            case 'js':
                return await this.optimizeJS(content);
            case 'css':
                return await this.optimizeCSS(content);
            default:
                return content;
        }
    },

    /**
     * Iniciar timer de optimización
     */
    startOptimizationTimer: function() {
        setInterval(async () => {
            await this.performOptimization();
        }, 600000); // Cada 10 minutos
    },

    /**
     * Realizar optimización
     */
    performOptimization: async function() {
        const now = Date.now();
        
        // Limpiar caché expirada
        await this.cleanupExpiredCache();
        
        // Optimizar assets frecuentes
        await this.optimizeFrequentAssets();
        
        // Generar bundles críticos
        await this.generateCriticalBundles();
        
        // Liberar memoria si es necesario
        await this.optimizeMemoryUsage();
        
        this.state.lastOptimization = now;
        this.log('Asset optimization completed');
    },

    /**
     * Limpiar caché expirada
     */
    cleanupExpiredCache: async function() {
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, entry] of this.state.cache.entries()) {
            if (now > entry.expiresAt) {
                keysToDelete.push(key);
            }
        }
        
        for (const key of keysToDelete) {
            this.state.cache.delete(key);
        }
        
        if (keysToDelete.length > 0) {
            this.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
        }
    },

    /**
     * Optimizar assets frecuentes
     */
    optimizeFrequentAssets: async function() {
        // Identificar assets más usados
        const frequentAssets = Array.from(this.state.assetMetrics.entries())
            .filter(([_, metrics]) => metrics.loadCount > 5)
            .sort(([_, a], [__, b]) => b.loadCount - a.loadCount)
            .slice(0, 10);
        
        for (const [assetName] of frequentAssets) {
            const asset = this.state.assetRegistry.get(assetName);
            if (asset && !asset.optimized) {
                try {
                    await this.loadAndProcessAsset(asset, { forceOptimize: true });
                } catch (error) {
                    this.log(`Error optimizando asset frecuente ${assetName}:`, error);
                }
            }
        }
    },

    /**
     * Generar bundles críticos
     */
    generateCriticalBundles: async function() {
        for (const [bundleName, bundle] of this.state.bundleRegistry.entries()) {
            if (bundle.critical && !bundle.generated) {
                try {
                    await this.generateBundle(bundle);
                } catch (error) {
                    this.log(`Error generando bundle crítico ${bundleName}:`, error);
                }
            }
        }
    },

    /**
     * Optimizar uso de memoria
     */
    optimizeMemoryUsage: async function() {
        const cacheSize = this.state.cache.size;
        const maxSize = this.config.maxAssets;
        
        if (cacheSize > maxSize * 0.9) {
            // Eliminar assets menos usados
            const entries = Array.from(this.state.cache.entries())
                .sort(([_, a], [__, b]) => a.accessCount - b.accessCount)
                .slice(0, Math.floor(cacheSize * 0.1));
            
            for (const [key] of entries) {
                this.state.cache.delete(key);
            }
            
            this.log(`Memory optimization: ${entries.length} cache entries removed`);
        }
    },

    /**
     * Iniciar preloading
     */
    startPreloading: function() {
        // Preload assets críticos
        if (this.config.preloadCriticalAssets) {
            setTimeout(async () => {
                await this.preloadCriticalAssets();
            }, 1000);
        }
    },

    /**
     * Preload assets críticos
     */
    preloadCriticalAssets: async function() {
        for (const assetName of this.state.criticalAssets) {
            try {
                await this.getAsset(assetName, { preload: true });
                this.log(`Critical asset preloaded: ${assetName}`);
            } catch (error) {
                this.log(`Error preloading critical asset ${assetName}:`, error);
            }
        }
    },

    /**
     * Invalidar asset
     */
    invalidateAsset: async function(assetName) {
        // Eliminar de caché
        const keysToDelete = [];
        for (const [key, entry] of this.state.cache.entries()) {
            if (entry.assetName === assetName) {
                keysToDelete.push(key);
            }
        }
        
        for (const key of keysToDelete) {
            this.state.cache.delete(key);
        }
        
        // Actualizar asset
        const asset = this.state.assetRegistry.get(assetName);
        if (asset) {
            asset.optimized = false;
            asset.compressed = false;
            asset.version = this.incrementVersion(asset.version);
            this.state.versionMap.set(assetName, asset.version);
        }
        
        this.log(`Asset invalidated: ${assetName} (${keysToDelete.length} cache entries removed)`);
    },

    /**
     * Inicializar Service Worker
     */
    initializeServiceWorker: async function() {
        if (!('serviceWorker' in navigator)) {
            this.log('Service Worker not supported');
            return;
        }
        
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            this.log('Service Worker registered:', registration);
        } catch (error) {
            this.log('Service Worker registration failed:', error);
        }
    },

    /**
     * Descomprimir asset
     */
    decompressAsset: async function(compressedData) {
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
                return decoder.decode(decompressed);
            }
            
            return compressedData;
            
        } catch (error) {
            this.log('Error descomprimiendo asset:', error);
            return compressedData;
        }
    },

    /**
     * Limpiar caché
     */
    clear: async function() {
        const clearedCount = this.state.cache.size;
        
        this.state.cache.clear();
        
        // Reiniciar estadísticas
        this.state.assetStats = {
            totalAssets: 0,
            cachedAssets: 0,
            optimizedAssets: 0,
            compressedAssets: 0,
            totalSize: 0,
            compressedSize: 0,
            cacheHitRate: 0,
            averageLoadTime: 0,
            bandwidthSaved: 0
        };
        
        this.log(`Asset Cache CLEAR: ${clearedCount} assets eliminados`);
        return clearedCount;
    },

    /**
     * Obtener estadísticas
     */
    getStatistics: function() {
        return {
            cacheSize: this.state.cache.size,
            assetStats: this.state.assetStats,
            assetMetrics: Object.fromEntries(this.state.assetMetrics),
            registrySize: this.state.assetRegistry.size,
            bundleRegistrySize: this.state.bundleRegistry.size,
            criticalAssetsCount: this.state.criticalAssets.size
        };
    },

    /**
     * Obtener estado detallado
     */
    getDetailedStatus: function() {
        return {
            statistics: this.getStatistics(),
            config: this.config,
            assetRegistry: Object.fromEntries(this.state.assetRegistry),
            bundleRegistry: Object.fromEntries(this.state.bundleRegistry),
            bundleDependencies: Object.fromEntries(this.state.bundleDependencies),
            cacheEntries: Array.from(this.state.cache.entries()).slice(-10),
            criticalAssets: Array.from(this.state.criticalAssets),
            isInitialized: this.state.isInitialized,
            lastOptimization: this.state.lastOptimization
        };
    },

    /**
     * Exportar configuración de assets
     */
    exportAssetConfig: function() {
        return {
            registry: Object.fromEntries(this.state.assetRegistry),
            bundleRegistry: Object.fromEntries(this.state.bundleRegistry),
            bundleDependencies: Object.fromEntries(this.state.bundleDependencies),
            metrics: Object.fromEntries(this.state.assetMetrics),
            versionMap: Object.fromEntries(this.state.versionMap),
            integrityMap: Object.fromEntries(this.state.integrityMap),
            criticalAssets: Array.from(this.state.criticalAssets),
            timestamp: Date.now()
        };
    },

    /**
     * Importar configuración de assets
     */
    importAssetConfig: function(config) {
        if (config.registry) {
            this.state.assetRegistry = new Map(Object.entries(config.registry));
        }
        
        if (config.bundleRegistry) {
            this.state.bundleRegistry = new Map(Object.entries(config.bundleRegistry));
        }
        
        if (config.bundleDependencies) {
            this.state.bundleDependencies = new Map(Object.entries(config.bundleDependencies));
        }
        
        if (config.metrics) {
            this.state.assetMetrics = new Map(Object.entries(config.metrics));
        }
        
        if (config.versionMap) {
            this.state.versionMap = new Map(Object.entries(config.versionMap));
        }
        
        if (config.integrityMap) {
            this.state.integrityMap = new Map(Object.entries(config.integrityMap));
        }
        
        if (config.criticalAssets) {
            this.state.criticalAssets = new Set(config.criticalAssets);
        }
        
        this.log('Asset configuration imported');
    },

    /**
     * Logging
     */
    log: function(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [AssetCache] ${message}`;
        
        if (data) {
            console.log(logEntry, data);
        } else {
            console.log(logEntry);
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.AssetCache = AssetCache;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetCache;
}