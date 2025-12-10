/**
 * Justice 2 Template Cache - Caché Especializada para Plantillas
 * Optimiza el almacenamiento y compilación de plantillas HTML
 */

const TemplateCache = {
    // Configuración
    config: {
        maxTemplates: 200,
        defaultTTL: 1800000, // 30 minutos
        enablePrecompilation: true,
        enableCompression: true,
        enableValidation: true,
        enableMinification: true,
        enableCaching: true,
        enableHotReload: false,
        enableVersioning: true,
        enableDependencyTracking: true,
        enablePartialCaching: true,
        enableLayoutCaching: true,
        enableTemplateInheritance: true,
        enableAsyncCompilation: true,
        enableOptimization: true,
        compressionThreshold: 2048, // 2KB
        compilationTimeout: 5000, // 5 segundos
        maxTemplateSize: 1024 * 1024, // 1MB
        enableMetrics: true,
        enableProfiling: false,
        supportedEngines: ['handlebars', 'mustache', 'ejs', 'pug', 'nunjucks'],
        defaultEngine: 'handlebars'
    },

    // Estado
    state: {
        cache: new Map(),
        compiledTemplates: new Map(),
        templateRegistry: new Map(),
        partialRegistry: new Map(),
        layoutRegistry: new Map(),
        dependencyGraph: new Map(),
        compilationQueue: [],
        activeCompilations: new Set(),
        templateStats: {
            totalTemplates: 0,
            compiledTemplates: 0,
            cachedTemplates: 0,
            compilationErrors: 0,
            averageCompilationTime: 0,
            cacheHitRate: 0,
            memoryUsage: 0
        },
        engineAdapters: new Map(),
        templateMetrics: new Map(),
        versionMap: new Map(),
        hotReloadSubscribers: new Set(),
        isInitialized: false,
        lastOptimization: Date.now()
    },

    /**
     * Inicializar Template Cache
     */
    init: async function(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        
        // Inicializar adaptadores de motores de plantillas
        await this.initializeEngineAdapters();
        
        // Inicializar registro de plantillas
        await this.initializeTemplateRegistry();
        
        // Inicializar registro de parciales
        await this.initializePartialRegistry();
        
        // Inicializar registro de layouts
        await this.initializeLayoutRegistry();
        
        // Inicializar grafo de dependencias
        await this.initializeDependencyGraph();
        
        // Iniciar optimización periódica si está habilitada
        if (this.config.enableOptimization) {
            this.startOptimizationTimer();
        }
        
        this.state.isInitialized = true;
        this.log('Template Cache inicializado con capacidades de compilación optimizada');
    },

    /**
     * Inicializar adaptadores de motores de plantillas
     */
    initializeEngineAdapters: async function() {
        // Adaptador Handlebars
        this.state.engineAdapters.set('handlebars', {
            name: 'handlebars',
            compile: async function(template, options) {
                // Simulación de compilación Handlebars
                return {
                    render: function(data) {
                        // Renderizado simple simulado
                        let rendered = template;
                        for (const [key, value] of Object.entries(data)) {
                            rendered = rendered.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value);
                        }
                        return rendered;
                    },
                    compiled: true,
                    engine: 'handlebars'
                };
            },
            validate: function(template) {
                // Validación básica de sintaxis Handlebars
                const openTags = (template.match(/{{/g) || []).length;
                const closeTags = (template.match(/}}/g) || []).length;
                return openTags === closeTags;
            },
            minify: function(template) {
                // Minificación básica
                return template
                    .replace(/\s+/g, ' ')
                    .replace(/>\s+</g, '><')
                    .trim();
            }
        });

        // Adaptador Mustache
        this.state.engineAdapters.set('mustache', {
            name: 'mustache',
            compile: async function(template, options) {
                return {
                    render: function(data) {
                        // Renderizado simple simulado
                        let rendered = template;
                        for (const [key, value] of Object.entries(data)) {
                            rendered = rendered.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value);
                        }
                        return rendered;
                    },
                    compiled: true,
                    engine: 'mustache'
                };
            },
            validate: function(template) {
                // Validación básica de sintaxis Mustache
                const openTags = (template.match(/{{/g) || []).length;
                const closeTags = (template.match(/}}/g) || []).length;
                return openTags === closeTags;
            },
            minify: function(template) {
                return template
                    .replace(/\s+/g, ' ')
                    .replace(/>\s+</g, '><')
                    .trim();
            }
        });

        // Adaptador EJS
        this.state.engineAdapters.set('ejs', {
            name: 'ejs',
            compile: async function(template, options) {
                return {
                    render: function(data) {
                        // Renderizado simple simulado
                        let rendered = template;
                        for (const [key, value] of Object.entries(data)) {
                            rendered = rendered.replace(new RegExp(`<%=${key}%>`, 'g'), value);
                        }
                        return rendered;
                    },
                    compiled: true,
                    engine: 'ejs'
                };
            },
            validate: function(template) {
                // Validación básica de sintaxis EJS
                const openTags = (template.match(/<%/g) || []).length;
                const closeTags = (template.match(/%>/g) || []).length;
                return openTags === closeTags;
            },
            minify: function(template) {
                return template
                    .replace(/\s+/g, ' ')
                    .replace(/>\s+</g, '><')
                    .trim();
            }
        });

        // Adaptador Pug
        this.state.engineAdapters.set('pug', {
            name: 'pug',
            compile: async function(template, options) {
                return {
                    render: function(data) {
                        // Renderizado simple simulado (Pug usa indentación)
                        return `<div>${JSON.stringify(data)}</div>`;
                    },
                    compiled: true,
                    engine: 'pug'
                };
            },
            validate: function(template) {
                // Validación básica de sintaxis Pug
                return template.length > 0;
            },
            minify: function(template) {
                return template.trim();
            }
        });

        // Adaptador Nunjucks
        this.state.engineAdapters.set('nunjucks', {
            name: 'nunjucks',
            compile: async function(template, options) {
                return {
                    render: function(data) {
                        // Renderizado simple simulado
                        let rendered = template;
                        for (const [key, value] of Object.entries(data)) {
                            rendered = rendered.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value);
                        }
                        return rendered;
                    },
                    compiled: true,
                    engine: 'nunjucks'
                };
            },
            validate: function(template) {
                // Validación básica de sintaxis Nunjucks
                const openTags = (template.match(/{{/g) || []).length;
                const closeTags = (template.match(/}}/g) || []).length;
                return openTags === closeTags;
            },
            minify: function(template) {
                return template
                    .replace(/\s+/g, ' ')
                    .replace(/>\s+</g, '><')
                    .trim();
            }
        });
    },

    /**
     * Inicializar registro de plantillas
     */
    initializeTemplateRegistry: async function() {
        // Plantillas conocidas de Justice 2
        const knownTemplates = [
            'navbar', 'sidebar', 'header', 'footer', 'main-layout',
            'case-list', 'case-detail', 'document-viewer', 'analytics-dashboard',
            'user-profile', 'settings-panel', 'login-form', 'registration-form',
            'modal', 'dropdown', 'table', 'card', 'form', 'button'
        ];
        
        for (const templateName of knownTemplates) {
            this.state.templateRegistry.set(templateName, {
                name: templateName,
                engine: this.config.defaultEngine,
                path: `/templates/${templateName}.${this.config.defaultEngine}`,
                version: '1.0.0',
                dependencies: [],
                lastModified: Date.now(),
                compiled: false,
                size: 0,
                priority: 'normal'
            });
        }
    },

    /**
     * Inicializar registro de parciales
     */
    initializePartialRegistry: async function() {
        const knownPartials = [
            'user-avatar', 'status-badge', 'action-button', 'breadcrumb',
            'pagination', 'search-box', 'filter-dropdown', 'date-picker'
        ];
        
        for (const partialName of knownPartials) {
            this.state.partialRegistry.set(partialName, {
                name: partialName,
                engine: this.config.defaultEngine,
                path: `/partials/${partialName}.${this.config.defaultEngine}`,
                version: '1.0.0',
                compiled: false,
                size: 0
            });
        }
    },

    /**
     * Inicializar registro de layouts
     */
    initializeLayoutRegistry: async function() {
        const knownLayouts = [
            'default', 'admin', 'public', 'minimal', 'fullscreen'
        ];
        
        for (const layoutName of knownLayouts) {
            this.state.layoutRegistry.set(layoutName, {
                name: layoutName,
                engine: this.config.defaultEngine,
                path: `/layouts/${layoutName}.${this.config.defaultEngine}`,
                version: '1.0.0',
                compiled: false,
                size: 0
            });
        }
    },

    /**
     * Inicializar grafo de dependencias
     */
    initializeDependencyGraph: async function() {
        // Definir dependencias entre plantillas
        const dependencies = {
            'case-list': ['navbar', 'sidebar', 'table', 'pagination'],
            'case-detail': ['navbar', 'sidebar', 'card', 'button'],
            'document-viewer': ['navbar', 'sidebar', 'user-avatar'],
            'analytics-dashboard': ['navbar', 'sidebar', 'chart'],
            'user-profile': ['navbar', 'sidebar', 'user-avatar', 'form'],
            'settings-panel': ['navbar', 'sidebar', 'form', 'button']
        };
        
        for (const [template, deps] of Object.entries(dependencies)) {
            this.state.dependencyGraph.set(template, deps);
        }
    },

    /**
     * Obtener plantilla compilada
     */
    getTemplate: async function(templateName, data = {}, options = {}) {
        const startTime = performance.now();
        
        try {
            // Generar clave de caché
            const cacheKey = this.generateTemplateKey(templateName, data, options);
            
            // Verificar si está en caché
            const cachedTemplate = await this.getFromCache(cacheKey);
            if (cachedTemplate && !options.forceCompile) {
                this.state.templateStats.cachedTemplates++;
                this.updateTemplateMetrics(templateName, 'cache_hit', performance.now() - startTime);
                
                this.log(`Template Cache HIT: ${templateName}`);
                return cachedTemplate;
            }
            
            // Verificar si ya está compilada
            const compiledTemplate = this.state.compiledTemplates.get(templateName);
            if (compiledTemplate && !options.forceCompile) {
                const rendered = await compiledTemplate.render(data);
                
                // Almacenar resultado en caché
                await this.storeInCache(cacheKey, rendered, templateName);
                
                this.state.templateStats.compiledTemplates++;
                this.updateTemplateMetrics(templateName, 'render', performance.now() - startTime);
                
                return rendered;
            }
            
            // Compilar plantilla
            const template = await this.compileTemplate(templateName, options);
            const rendered = await template.render(data);
            
            // Almacenar plantilla compilada
            this.state.compiledTemplates.set(templateName, template);
            
            // Almacenar resultado en caché
            await this.storeInCache(cacheKey, rendered, templateName);
            
            // Actualizar estadísticas
            this.state.templateStats.totalTemplates++;
            const endTime = performance.now();
            this.updateTemplateStats(endTime - startTime);
            this.updateTemplateMetrics(templateName, 'compile', endTime - startTime);
            
            this.log(`Template compiled: ${templateName} (${(endTime - startTime).toFixed(2)}ms)`);
            
            return rendered;
            
        } catch (error) {
            this.state.templateStats.compilationErrors++;
            this.log(`Error obteniendo plantilla ${templateName}:`, error);
            throw error;
        }
    },

    /**
     * Generar clave de caché para plantilla
     */
    generateTemplateKey: function(templateName, data, options) {
        const dataHash = this.hashObject(data);
        const optionsHash = this.hashObject(options);
        const version = this.getTemplateVersion(templateName);
        
        return `${templateName}:${version}:${dataHash}:${optionsHash}`;
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
     * Obtener versión de la plantilla
     */
    getTemplateVersion: function(templateName) {
        const template = this.state.templateRegistry.get(templateName);
        return template ? template.version : '1.0.0';
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
        let template = cached.template;
        if (cached.compressed) {
            template = await this.decompressTemplate(template);
        }
        
        // Actualizar último acceso
        cached.lastAccess = Date.now();
        cached.accessCount++;
        
        return template;
    },

    /**
     * Compilar plantilla
     */
    compileTemplate: async function(templateName, options = {}) {
        // Verificar si ya se está compilando
        if (this.state.activeCompilations.has(templateName)) {
            return await this.waitForCompilation(templateName);
        }
        
        this.state.activeCompilations.add(templateName);
        
        try {
            const template = this.state.templateRegistry.get(templateName);
            
            if (!template) {
                throw new Error(`Plantilla no encontrada: ${templateName}`);
            }
            
            // Obtener adaptador del motor
            const adapter = this.state.engineAdapters.get(template.engine);
            if (!adapter) {
                throw new Error(`Motor de plantillas no soportado: ${template.engine}`);
            }
            
            // Obtener fuente de la plantilla
            const templateSource = await this.getTemplateSource(templateName);
            
            // Validar plantilla si está habilitado
            if (this.config.enableValidation && !adapter.validate(templateSource)) {
                throw new Error(`Error de validación en plantilla: ${templateName}`);
            }
            
            // Minificar plantilla si está habilitado
            let processedSource = templateSource;
            if (this.config.enableMinification) {
                processedSource = adapter.minify(templateSource);
            }
            
            // Compilar plantilla
            const compiledTemplate = await adapter.compile(processedSource, {
                ...options,
                partials: await this.getPartials(templateName),
                layout: await this.getLayout(templateName, options.layout)
            });
            
            // Actualizar registro
            template.compiled = true;
            template.size = this.calculateTemplateSize(processedSource);
            template.lastModified = Date.now();
            
            // Actualizar versión si está habilitado
            if (this.config.enableVersioning) {
                template.version = this.incrementVersion(template.version);
                this.state.versionMap.set(templateName, template.version);
            }
            
            return compiledTemplate;
            
        } finally {
            this.state.activeCompilations.delete(templateName);
        }
    },

    /**
     * Esperar a que termine la compilación
     */
    waitForCompilation: async function(templateName, timeout = this.config.compilationTimeout) {
        const startTime = Date.now();
        
        while (this.state.activeCompilations.has(templateName) && 
               (Date.now() - startTime) < timeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (this.state.activeCompilations.has(templateName)) {
            throw new Error(`Timeout esperando compilación de ${templateName}`);
        }
        
        return this.state.compiledTemplates.get(templateName);
    },

    /**
     * Obtener fuente de la plantilla
     */
    getTemplateSource: async function(templateName) {
        const template = this.state.templateRegistry.get(templateName);
        
        if (!template) {
            throw new Error(`Plantilla no encontrada: ${templateName}`);
        }
        
        // Simulación de carga de archivo
        // En producción, esto cargaría el archivo real del sistema de archivos
        const mockSources = {
            'navbar': '<nav class="navbar">{{title}}</nav>',
            'sidebar': '<aside class="sidebar">{{content}}</aside>',
            'case-list': '<div class="case-list">{{#each cases}}<div class="case">{{this}}</div>{{/each}}</div>',
            'case-detail': '<div class="case-detail"><h1>{{title}}</h1><p>{{description}}</p></div>',
            'document-viewer': '<div class="document-viewer"><iframe src="{{url}}"></iframe></div>',
            'analytics-dashboard': '<div class="analytics"><h1>Analytics</h1>{{data}}</div>',
            'user-profile': '<div class="profile"><img src="{{avatar}}" /><h2>{{name}}</h2></div>',
            'settings-panel': '<div class="settings"><form>{{#each settings}}<label>{{this}}</label>{{/each}}</form></div>',
            'login-form': '<form class="login"><input name="username" /><input name="password" /></form>',
            'registration-form': '<form class="register">{{#each fields}}<input name="{{name}}" />{{/each}}</form>',
            'modal': '<div class="modal"><div class="content">{{content}}</div></div>',
            'dropdown': '<div class="dropdown">{{#each options}}<option>{{this}}</option>{{/each}}</div>',
            'table': '<table>{{#each rows}}<tr>{{#each columns}}<td>{{this}}</td>{{/each}}</tr>{{/each}}</table>',
            'card': '<div class="card"><h3>{{title}}</h3><p>{{content}}</p></div>',
            'form': '<form>{{#each fields}}<label>{{label}}</label><input name="{{name}}" />{{/each}}</form>',
            'button': '<button class="{{class}}">{{text}}</button>',
            'header': '<header>{{content}}</header>',
            'footer': '<footer>{{content}}</footer>',
            'main-layout': '<div>{{> header}}{{> navbar}}{{content}}{{> footer}}</div>'
        };
        
        return mockSources[templateName] || `<div>Template: ${templateName}</div>`;
    },

    /**
     * Obtener parciales
     */
    getPartials: async function(templateName) {
        if (!this.config.enablePartialCaching) {
            return {};
        }
        
        const dependencies = this.state.dependencyGraph.get(templateName) || [];
        const partials = {};
        
        for (const partialName of dependencies) {
            if (this.state.partialRegistry.has(partialName)) {
                const partialSource = await this.getPartialSource(partialName);
                partials[partialName] = partialSource;
            }
        }
        
        return partials;
    },

    /**
     * Obtener fuente de parcial
     */
    getPartialSource: async function(partialName) {
        const partial = this.state.partialRegistry.get(partialName);
        
        if (!partial) {
            throw new Error(`Parcial no encontrado: ${partialName}`);
        }
        
        const mockPartials = {
            'user-avatar': '<img class="avatar" src="{{src}}" alt="{{alt}}" />',
            'status-badge': '<span class="badge {{status}}">{{text}}</span>',
            'action-button': '<button class="btn {{type}}" onclick="{{action}}">{{text}}</button>',
            'breadcrumb': '<nav class="breadcrumb">{{#each items}}<span>{{this}}</span>{{/each}}</nav>',
            'pagination': '<div class="pagination">{{#each pages}}<a href="{{url}}">{{page}}</a>{{/each}}</div>',
            'search-box': '<input type="search" placeholder="{{placeholder}}" />',
            'filter-dropdown': '<select>{{#each options}}<option value="{{value}}">{{label}}</option>{{/each}}</select>',
            'date-picker': '<input type="date" value="{{value}}" />'
        };
        
        return mockPartials[partialName] || `<div>Partial: ${partialName}</div>`;
    },

    /**
     * Obtener layout
     */
    getLayout: async function(templateName, layoutName = 'default') {
        if (!this.config.enableLayoutCaching) {
            return null;
        }
        
        const layout = this.state.layoutRegistry.get(layoutName);
        
        if (!layout) {
            throw new Error(`Layout no encontrado: ${layoutName}`);
        }
        
        const mockLayouts = {
            'default': '<!DOCTYPE html><html><head><title>{{title}}</title></head><body>{{{content}}}</body></html>',
            'admin': '<!DOCTYPE html><html><head><title>Admin - {{title}}</title></head><body class="admin">{{{content}}}</body></html>',
            'public': '<!DOCTYPE html><html><head><title>{{title}}</title></head><body class="public">{{{content}}}</body></html>',
            'minimal': '<!DOCTYPE html><html><head><title>{{title}}</title></head><body>{{{content}}}</body></html>',
            'fullscreen': '<div class="fullscreen">{{{content}}}</div>'
        };
        
        return mockLayouts[layoutName] || '<div>{{{content}}}</div>';
    },

    /**
     * Almacenar en caché
     */
    storeInCache: async function(cacheKey, template, templateName) {
        const now = Date.now();
        const ttl = this.getTemplateTTL(templateName);
        
        // Procesar plantilla para almacenamiento
        let processedTemplate = template;
        let compressed = false;
        let originalSize = this.calculateTemplateSize(template);
        
        // Compresión si está habilitada y la plantilla es grande
        if (this.config.enableCompression && originalSize > this.config.compressionThreshold) {
            const compressionResult = await this.compressTemplate(template);
            if (compressionResult.compressed) {
                processedTemplate = compressionResult.data;
                compressed = true;
            }
        }
        
        // Crear entrada de caché
        const cacheEntry = {
            key: cacheKey,
            template: processedTemplate,
            templateName,
            timestamp: now,
            ttl,
            expiresAt: now + ttl,
            compressed,
            originalSize,
            compressedSize: compressed ? this.calculateTemplateSize(processedTemplate) : originalSize,
            accessCount: 0,
            lastAccess: now,
            version: this.getTemplateVersion(templateName),
            checksum: this.calculateTemplateChecksum(template)
        };
        
        // Verificar límite de caché
        await this.checkCacheLimit();
        
        // Almacenar en caché
        this.state.cache.set(cacheKey, cacheEntry);
        
        // Actualizar estadísticas de memoria
        this.updateMemoryMetrics(originalSize);
    },

    /**
     * Obtener TTL de la plantilla
     */
    getTemplateTTL: function(templateName) {
        const template = this.state.templateRegistry.get(templateName);
        
        if (!template) {
            return this.config.defaultTTL;
        }
        
        // TTL basado en prioridad y frecuencia de uso
        let ttl = this.config.defaultTTL;
        
        switch (template.priority) {
            case 'critical':
                ttl *= 3; // Triple TTL para plantillas críticas
                break;
            case 'high':
                ttl *= 2;
                break;
            case 'low':
                ttl *= 0.5; // Mitad TTL para plantillas de baja prioridad
                break;
        }
        
        return ttl;
    },

    /**
     * Calcular tamaño de la plantilla
     */
    calculateTemplateSize: function(template) {
        if (!template) return 0;
        
        const jsonString = typeof template === 'string' ? template : JSON.stringify(template);
        return new Blob([jsonString]).size;
    },

    /**
     * Calcular checksum de la plantilla
     */
    calculateTemplateChecksum: function(template) {
        const jsonString = typeof template === 'string' ? template : JSON.stringify(template);
        let hash = 0;
        
        for (let i = 0; i < jsonString.length; i++) {
            const char = jsonString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString(36);
    },

    /**
     * Comprimir plantilla
     */
    compressTemplate: async function(template) {
        try {
            const jsonString = typeof template === 'string' ? template : JSON.stringify(template);
            
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
            
            return { compressed: false, data: template };
            
        } catch (error) {
            this.log('Error comprimiendo plantilla:', error);
            return { compressed: false, data: template };
        }
    },

    /**
     * Descomprimir plantilla
     */
    decompressTemplate: async function(compressedData) {
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
            this.log('Error descomprimiendo plantilla:', error);
            return compressedData;
        }
    },

    /**
     * Verificar límite de caché
     */
    checkCacheLimit: async function() {
        if (this.state.cache.size <= this.config.maxTemplates) {
            return;
        }
        
        // Ordenar por último acceso
        const entries = Array.from(this.state.cache.entries())
            .sort(([_, a], [__, b]) => a.lastAccess - b.lastAccess);
        
        // Eliminar las más antiguas
        const toDelete = entries.slice(0, this.state.cache.size - this.config.maxTemplates + 10);
        
        for (const [key] of toDelete) {
            this.state.cache.delete(key);
        }
        
        this.log(`Cache limit reached: ${toDelete.length} templates evicted`);
    },

    /**
     * Actualizar métricas de memoria
     */
    updateMemoryMetrics: function(size) {
        this.state.templateStats.memoryUsage += size;
    },

    /**
     * Actualizar estadísticas de plantillas
     */
    updateTemplateStats: function(compilationTime) {
        const stats = this.state.templateStats;
        const totalTemplates = stats.totalTemplates;
        
        // Calcular tiempo promedio de compilación
        stats.averageCompilationTime = 
            (stats.averageCompilationTime * (totalTemplates - 1) + compilationTime) / totalTemplates;
        
        // Calcular hit rate
        const totalAccesses = stats.cachedTemplates + stats.compiledTemplates;
        stats.cacheHitRate = totalAccesses > 0 ? 
            (stats.cachedTemplates / totalAccesses) * 100 : 0;
    },

    /**
     * Actualizar métricas de plantilla
     */
    updateTemplateMetrics: function(templateName, action, duration) {
        if (!this.state.templateMetrics.has(templateName)) {
            this.state.templateMetrics.set(templateName, {
                renderCount: 0,
                cacheHits: 0,
                compilationTime: 0,
                averageRenderTime: 0,
                lastRendered: null
            });
        }
        
        const metrics = this.state.templateMetrics.get(templateName);
        
        switch (action) {
            case 'render':
            case 'compile':
                metrics.renderCount++;
                metrics.compilationTime += duration;
                metrics.averageRenderTime = metrics.compilationTime / metrics.renderCount;
                metrics.lastRendered = Date.now();
                break;
            case 'cache_hit':
                metrics.cacheHits++;
                break;
        }
        
        // Actualizar registro de la plantilla
        const template = this.state.templateRegistry.get(templateName);
        if (template) {
            template.lastModified = Date.now();
        }
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
     * Iniciar timer de optimización
     */
    startOptimizationTimer: function() {
        setInterval(async () => {
            await this.performOptimization();
        }, 300000); // Cada 5 minutos
    },

    /**
     * Realizar optimización
     */
    performOptimization: async function() {
        const now = Date.now();
        
        // Limpiar caché expirada
        await this.cleanupExpiredCache();
        
        // Optimizar compilaciones frecuentes
        await this.optimizeFrequentTemplates();
        
        // Liberar memoria si es necesario
        await this.optimizeMemoryUsage();
        
        this.state.lastOptimization = now;
        this.log('Template optimization completed');
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
     * Optimizar plantillas frecuentes
     */
    optimizeFrequentTemplates: async function() {
        // Identificar plantillas más usadas
        const frequentTemplates = Array.from(this.state.templateMetrics.entries())
            .filter(([_, metrics]) => metrics.renderCount > 10)
            .sort(([_, a], [__, b]) => b.renderCount - a.renderCount)
            .slice(0, 5);
        
        for (const [templateName] of frequentTemplates) {
            // Precompilar si no está compilada
            if (!this.state.compiledTemplates.has(templateName)) {
                try {
                    await this.compileTemplate(templateName);
                } catch (error) {
                    this.log(`Error precompiling frequent template ${templateName}:`, error);
                }
            }
        }
    },

    /**
     * Optimizar uso de memoria
     */
    optimizeMemoryUsage: async function() {
        const memoryUsage = this.state.templateStats.memoryUsage;
        const maxMemory = this.config.maxTemplateSize * this.config.maxTemplates;
        
        if (memoryUsage > maxMemory * 0.8) {
            // Eliminar caché menos usada
            const entries = Array.from(this.state.cache.entries())
                .sort(([_, a], [__, b]) => a.accessCount - b.accessCount)
                .slice(0, Math.floor(this.state.cache.size * 0.2));
            
            for (const [key] of entries) {
                this.state.cache.delete(key);
            }
            
            this.log(`Memory optimization: ${entries.length} cache entries removed`);
        }
    },

    /**
     * Invalidar plantilla
     */
    invalidateTemplate: async function(templateName) {
        // Eliminar de caché compilada
        this.state.compiledTemplates.delete(templateName);
        
        // Eliminar entradas de caché
        const keysToDelete = [];
        for (const [key, entry] of this.state.cache.entries()) {
            if (entry.templateName === templateName) {
                keysToDelete.push(key);
            }
        }
        
        for (const key of keysToDelete) {
            this.state.cache.delete(key);
        }
        
        // Actualizar versión
        if (this.config.enableVersioning) {
            const template = this.state.templateRegistry.get(templateName);
            if (template) {
                template.version = this.incrementVersion(template.version);
                this.state.versionMap.set(templateName, template.version);
            }
        }
        
        this.log(`Template invalidated: ${templateName} (${keysToDelete.length} cache entries removed)`);
    },

    /**
     * Recargar plantilla
     */
    reloadTemplate: async function(templateName) {
        await this.invalidateTemplate(templateName);
        
        // Disparar hot reload si está habilitado
        if (this.config.enableHotReload) {
            await this.triggerHotReload(templateName);
        }
        
        return await this.compileTemplate(templateName);
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
    triggerHotReload: async function(templateName) {
        if (!this.config.enableHotReload) {
            return;
        }
        
        // Notificar suscriptores
        for (const callback of this.state.hotReloadSubscribers) {
            try {
                await callback(templateName);
            } catch (error) {
                this.log('Error en callback de hot reload:', error);
            }
        }
        
        this.log(`Hot reload triggered: ${templateName}`);
    },

    /**
     * Limpiar caché
     */
    clear: async function() {
        const clearedCount = this.state.cache.size;
        
        this.state.cache.clear();
        this.state.compiledTemplates.clear();
        
        // Reiniciar estadísticas
        this.state.templateStats = {
            totalTemplates: 0,
            compiledTemplates: 0,
            cachedTemplates: 0,
            compilationErrors: 0,
            averageCompilationTime: 0,
            cacheHitRate: 0,
            memoryUsage: 0
        };
        
        this.log(`Template Cache CLEAR: ${clearedCount} plantillas eliminadas`);
        return clearedCount;
    },

    /**
     * Obtener estadísticas
     */
    getStatistics: function() {
        return {
            cacheSize: this.state.cache.size,
            compiledTemplates: this.state.compiledTemplates.size,
            templateStats: this.state.templateStats,
            templateMetrics: Object.fromEntries(this.state.templateMetrics),
            registrySize: this.state.templateRegistry.size,
            partialRegistrySize: this.state.partialRegistry.size,
            layoutRegistrySize: this.state.layoutRegistry.size
        };
    },

    /**
     * Obtener estado detallado
     */
    getDetailedStatus: function() {
        return {
            statistics: this.getStatistics(),
            config: this.config,
            templateRegistry: Object.fromEntries(this.state.templateRegistry),
            partialRegistry: Object.fromEntries(this.state.partialRegistry),
            layoutRegistry: Object.fromEntries(this.state.layoutRegistry),
            dependencyGraph: Object.fromEntries(this.state.dependencyGraph),
            cacheEntries: Array.from(this.state.cache.entries()).slice(-10),
            isInitialized: this.state.isInitialized,
            lastOptimization: this.state.lastOptimization
        };
    },

    /**
     * Exportar configuración de plantillas
     */
    exportTemplateConfig: function() {
        return {
            registry: Object.fromEntries(this.state.templateRegistry),
            partialRegistry: Object.fromEntries(this.state.partialRegistry),
            layoutRegistry: Object.fromEntries(this.state.layoutRegistry),
            dependencyGraph: Object.fromEntries(this.state.dependencyGraph),
            metrics: Object.fromEntries(this.state.templateMetrics),
            versionMap: Object.fromEntries(this.state.versionMap),
            timestamp: Date.now()
        };
    },

    /**
     * Importar configuración de plantillas
     */
    importTemplateConfig: function(config) {
        if (config.registry) {
            this.state.templateRegistry = new Map(Object.entries(config.registry));
        }
        
        if (config.partialRegistry) {
            this.state.partialRegistry = new Map(Object.entries(config.partialRegistry));
        }
        
        if (config.layoutRegistry) {
            this.state.layoutRegistry = new Map(Object.entries(config.layoutRegistry));
        }
        
        if (config.dependencyGraph) {
            this.state.dependencyGraph = new Map(Object.entries(config.dependencyGraph));
        }
        
        if (config.metrics) {
            this.state.templateMetrics = new Map(Object.entries(config.metrics));
        }
        
        if (config.versionMap) {
            this.state.versionMap = new Map(Object.entries(config.versionMap));
        }
        
        this.log('Template configuration imported');
    },

    /**
     * Logging
     */
    log: function(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [TemplateCache] ${message}`;
        
        if (data) {
            console.log(logEntry, data);
        } else {
            console.log(logEntry);
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.TemplateCache = TemplateCache;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateCache;
}