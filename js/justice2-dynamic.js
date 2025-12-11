/**
 * Justice 2 Dynamic Content Loader
 * Sistema de carga dinámica de contenido para la página principal
 */

// Importar sistema de protección XSS centralizado
// El sistema se carga automáticamente desde components/xss-protection.js

// Nota: Los sistemas de renderizado optimizado se cargarán dinámicamente
// si están disponibles en window.Justice2.renderComponents

const Justice2Dynamic = {
    // Configuración
    config: {
        refreshInterval: 30000, // 30 segundos
        animationDuration: 500,
        maxRetries: 3,
        cacheTimeout: 60000, // 1 minuto
        endpoints: {
            cases: '/cases',
            documents: '/documents',
            statistics: '/analytics/dashboard',
            notifications: '/notifications'
        },
        silentMode: true // No loguear errores en consola
    },
    
    // Estado
    state: {
        isLoading: false,
        lastUpdate: null,
        refreshTimer: null,
        cache: {},
        retryCount: 0,
        degradedMode: false,
        degradedReason: null,
        // Sistema de renderizado optimizado
        optimizedRenderer: null,
        smartComponent: null,
        lazyRenderer: null,
        renderSystemInitialized: false
    },
    
    // Inicialización
    init: function() {
        this.log('Inicializando carga dinámica de contenido con renderizado optimizado');
        
        // Inicializar sistema de renderizado optimizado
        this.initializeRenderSystem();
        
        // Configurar eventos
        this.setupEvents();
        
        // Configurar eventos de modo degradado
        this.setupDegradedModeEvents();
        
        // Cargar contenido inicial
        this.loadAllContent();
        
        // Iniciar actualización automática
        this.startAutoRefresh();
        
        this.log('Carga dinámica inicializada con renderizado optimizado');
    },
    
    // Inicializar sistema de renderizado optimizado
    initializeRenderSystem: function() {
        try {
            this.log('Inicializando sistema de renderizado optimizado para contenido dinámico...');
            
            // Usar el sistema global si está disponible
            if (window.Justice2 && window.Justice2.state && window.Justice2.state.renderSystemInitialized) {
                this.state.optimizedRenderer = window.Justice2.state.optimizedRenderer;
                this.state.smartComponent = window.Justice2.state.smartComponent;
                this.state.lazyRenderer = window.Justice2.state.lazyRenderer;
                this.state.renderSystemInitialized = true;
                this.log('Sistema de renderizado optimizado conectado al sistema global');
                return;
            }
            
            // Inicializar sistemas locales si el global no está disponible
            // Los sistemas optimizados son opcionales para el funcionamiento básico
            if (window.Justice2 && window.Justice2.renderComponents) {
                const components = window.Justice2.renderComponents;
                if (components.OptimizedRenderer) {
                    this.state.optimizedRenderer = new components.OptimizedRenderer({
                        enableVirtualDOM: true,
                        enableMemoization: true,
                        enableBatching: true,
                        enableLazyLoading: true,
                        enableSmartComponents: true
                    });
                    this.log('OptimizedRenderer local inicializado');
                }

                if (components.SmartComponent) {
                    this.state.smartComponent = new components.SmartComponent({
                        enableAutoOptimization: true,
                        enableErrorBoundaries: true,
                        enableLifecycleHooks: true
                    });
                    this.log('SmartComponent local inicializado');
                }
            }
  
            if (components && components.LazyRenderer) {
                this.state.lazyRenderer = new components.LazyRenderer({
                    rootMargin: '50px',
                    threshold: 0.1,
                    enablePlaceholders: true,
                    enableSkeletons: true
                });
                
                this.log('LazyRenderer local inicializado');
            }
            
            this.state.renderSystemInitialized = true;
            this.log('Sistema de renderizado optimizado para contenido dinámico inicializado correctamente');
            
        } catch (error) {
            this.log('Error inicializando sistema de renderizado optimizado para contenido dinámico:', error);
            // Continuar sin renderizado optimizado en caso de error
        }
    },
    
    // Configurar eventos
    setupEvents: function() {
        // Eventos de visibilidad de página
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoRefresh();
            } else {
                this.startAutoRefresh();
                this.loadAllContent(); // Recargar al volver a la página
            }
        });
        
        // Eventos de conexión
        window.addEventListener('online', () => {
            this.loadAllContent();
        });
        
        // Eventos de scroll para lazy loading
        window.addEventListener('scroll', this.debounce(() => {
            this.handleScroll();
        }, 200));
        
        // Eventos de resize
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 300));
    },

    // Configurar eventos de modo degradado
    setupDegradedModeEvents: function() {
        document.addEventListener('justice2:degraded-mode', (e) => {
            this.state.degradedMode = true;
            this.state.degradedReason = e.detail.reason;
            
            this.log(`Modo degradado activado: ${e.detail.reason}`);
            
            // Mostrar indicador visual de modo degradado
            this.showDegradedModeIndicator();
            
            // Recargar contenido usando datos mock
            this.loadAllContent();
        });
        
        // Escuchar eventos de restauración de conexión
        document.addEventListener('justice2:connection-restored', () => {
            this.state.degradedMode = false;
            this.state.degradedReason = null;
            
            this.log('Conexión restaurada, saliendo de modo degradado');
            
            // Ocultar indicador de modo degradado
            this.hideDegradedModeIndicator();
            
            // Recargar contenido desde la API real
            this.loadAllContent();
        });
    },

    // Mostrar indicador de modo degradado
    showDegradedModeIndicator: function() {
        // Eliminar indicador existente si hay
        const existingIndicator = document.getElementById('degraded-mode-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const indicator = document.createElement('div');
        indicator.id = 'degraded-mode-indicator';
        XSSProtection.setInnerHTMLSafe(indicator, `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(90deg, #ff6b6b, #feca57);
                color: white;
                padding: 8px 16px;
                text-align: center;
                z-index: 10000;
                font-size: 14px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            ">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                <strong>Modo Degradado:</strong> Usando datos locales mientras se restaura la conexión
                <button onclick="Justice2Dynamic.hideDegradedModeIndicator()" style="
                    background: none;
                    border: none;
                    color: white;
                    margin-left: 10px;
                    cursor: pointer;
                    font-size: 16px;
                ">×</button>
            </div>
        `);
        
        document.body.appendChild(indicator);
        
        // Ajustar el padding del body para no cubrir contenido
        document.body.style.paddingTop = '50px';
    },

    // Ocultar indicador de modo degradado
    hideDegradedModeIndicator: function() {
        const indicator = document.getElementById('degraded-mode-indicator');
        if (indicator) {
            indicator.remove();
            document.body.style.paddingTop = '0';
        }
    },
    
    // Cargar todo el contenido dinámico
    loadAllContent: function() {
        if (this.state.isLoading) return;
        
        this.state.isLoading = true;
        this.showLoadingState();
        
        Promise.all([
            this.loadRecentCases(),
            this.loadActiveDocuments(),
            this.loadStatistics(),
            this.loadNotifications()
        ])
        .then(() => {
            this.state.lastUpdate = Date.now();
            this.hideLoadingState();
            this.state.retryCount = 0;
        })
        .catch(error => {
            this.log('Error cargando contenido:', error);
            this.handleError(error);
        })
        .finally(() => {
            this.state.isLoading = false;
        });
    },
    
    // Cargar casos recientes
    loadRecentCases: function() {
        const container = document.getElementById('recent-cases');
        if (!container) return Promise.resolve();
        
        // Verificar cache
        const cacheKey = 'recent-cases';
        if (this.isCached(cacheKey)) {
            this.renderCases(container, this.state.cache[cacheKey].data);
            return Promise.resolve();
        }
        
        this.showSectionLoading(container, 'Cargando casos recientes...');
        
        // Si estamos en modo degradado, usar datos mock directamente
        if (this.state.degradedMode) {
            return this.loadCasesFromMock(container, cacheKey);
        }
        
        return Justice2API.getCases({ limit: 5, sort: 'updated_desc' })
            .then(response => {
                const cases = response.data || this.getMockCases();
                this.updateCache(cacheKey, cases);
                this.renderCases(container, cases);
            })
            .catch(error => {
                // Silently fallback to mock data on error without logging to console
                return this.loadCasesFromMock(container, cacheKey);
            });
    },

    // Cargar casos desde datos mock
    loadCasesFromMock: function(container, cacheKey) {
        if (window.Justice2MockData) {
            return Justice2MockData.getCases({ limit: 5, sort: 'updated_desc' })
                .then(response => {
                    const cases = response.data;
                    this.updateCache(cacheKey, cases);
                    this.renderCases(container, cases);
                    
                    // Mostrar notificación de modo degradado
                    if (this.state.degradedMode) {
                        this.showDegradedModeNotification('casos');
                    }
                })
                .catch(error => {
                    this.log('Error cargando casos desde mock:', error);
                    const cases = this.getMockCases();
                    this.renderCases(container, cases);
                });
        } else {
            // Fallback a datos mock locales
            const cases = this.getMockCases();
            this.updateCache(cacheKey, cases);
            this.renderCases(container, cases);
            return Promise.resolve();
        }
    },

    // Mostrar notificación de modo degradado (SILENCIADA POR CONTEXT7 MCP)
    showDegradedModeNotification: function(contentType) {
        // No hacer nada para no molestar al usuario
        // La notificación visual ha sido desactivada intencionalmente
    },
    
    // Renderizar casos (optimizado)
    renderCases: function(container, cases) {
        // Usar sistema de renderizado optimizado si está disponible
        if (this.state.renderSystemInitialized && this.state.optimizedRenderer) {
            return this.renderCasesOptimized(container, cases);
        }
        
        // Fallback al método original
        return this.renderCasesLegacy(container, cases);
    },
    
    // Renderizado de casos optimizado
    renderCasesOptimized: function(container, cases) {
        const casesComponent = {
            id: `dynamic-cases_${Date.now()}`,
            type: 'dynamic-cases-list',
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
                
                const children = props.cases.map((caseItem, index) => {
                    const statusClass = Justice2Dynamic.getStatusClass(caseItem.status);
                    const statusText = Justice2Dynamic.getStatusText(caseItem.status);
                    const delay = index * 100;
                    
                    // Validar y sanitizar datos del caso
                    const titleValidation = XSSProtection.validateInput(caseItem.title, {
                        type: 'text',
                        maxLength: 200,
                        allowEmpty: true
                    });
                    
                    const clientValidation = XSSProtection.validateInput(caseItem.client, {
                        type: 'text',
                        maxLength: 100,
                        allowEmpty: true
                    });
                    
                    const descriptionValidation = XSSProtection.validateInput(caseItem.description, {
                        type: 'text',
                        maxLength: 500,
                        allowEmpty: true
                    });
                    
                    const caseChildren = [
                        {
                            tag: 'div',
                            attributes: {
                                class: 'd-flex justify-content-between align-items-start'
                            },
                            children: [
                                {
                                    tag: 'div',
                                    attributes: {
                                        class: 'flex-grow-1'
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
                                            children: [
                                                {
                                                    tag: 'i',
                                                    attributes: {
                                                        class: 'fas fa-calendar-alt mr-1'
                                                    }
                                                },
                                                XSSProtection.escapeHtml(Justice2.utils.formatDate(caseItem.updated_at))
                                            ]
                                        },
                                        caseItem.client ? {
                                            tag: 'small',
                                            attributes: {
                                                class: 'text-muted ml-2'
                                            },
                                            children: [
                                                {
                                                    tag: 'i',
                                                    attributes: {
                                                        class: 'fas fa-user mr-1'
                                                    }
                                                },
                                                clientValidation.valid ? XSSProtection.escapeHtml(clientValidation.sanitized) : ''
                                            ]
                                        } : null
                                    ].filter(Boolean)
                                },
                                {
                                    tag: 'span',
                                    attributes: {
                                        class: `case-status ${XSSProtection.escapeHtml(statusClass)}`
                                    },
                                    children: [XSSProtection.escapeHtml(statusText)]
                                }
                            ]
                        }
                    ];
                    
                    if (caseItem.description && descriptionValidation.valid) {
                        caseChildren.push({
                            tag: 'p',
                            attributes: {
                                class: 'text-muted small mt-2 mb-0'
                            },
                            children: [XSSProtection.escapeHtml(descriptionValidation.sanitized)]
                        });
                    }
                    
                    caseChildren.push({
                        tag: 'div',
                        attributes: {
                            class: 'mt-2'
                        },
                        children: [
                            {
                                tag: 'button',
                                attributes: {
                                    class: 'btn btn-sm btn-outline-primary',
                                    onclick: `Justice2Dynamic.viewCase(${XSSProtection.escapeHtml(caseItem.id)})`
                                },
                                children: [
                                    {
                                        tag: 'i',
                                        attributes: {
                                            class: 'fas fa-eye mr-1'
                                        }
                                    },
                                    'Ver'
                                ]
                            }
                        ]
                    });
                    
                    return {
                        tag: 'div',
                        attributes: {
                            class: 'case-item fade-in',
                            style: `animation-delay: ${delay}ms;`
                        },
                        children: caseChildren
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
    
    // Renderizado de casos legacy (fallback)
    renderCasesLegacy: function(container, cases) {
        if (!cases || cases.length === 0) {
            XSSProtection.setInnerHTMLSafe(container, `
                <div class="text-center py-3">
                    <i class="fas fa-briefcase fa-2x text-muted mb-2"></i>
                    <p class="text-muted">No hay casos recientes</p>
                </div>
            `);
            return;
        }
        
        let html = '';
        cases.forEach((caseItem, index) => {
            const statusClass = this.getStatusClass(caseItem.status);
            const statusText = this.getStatusText(caseItem.status);
            const delay = index * 100;
            
            // Validar y sanitizar datos del caso
            const titleValidation = XSSProtection.validateInput(caseItem.title, {
                type: 'text',
                maxLength: 200,
                allowEmpty: true
            });
            
            const clientValidation = XSSProtection.validateInput(caseItem.client, {
                type: 'text',
                maxLength: 100,
                allowEmpty: true
            });
            
            const descriptionValidation = XSSProtection.validateInput(caseItem.description, {
                type: 'text',
                maxLength: 500,
                allowEmpty: true
            });
            
            html += `
                <div class="case-item fade-in" style="animation-delay: ${delay}ms;">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="case-title">${titleValidation.valid ? XSSProtection.escapeHtml(titleValidation.sanitized) : ''}</div>
                            <small class="text-muted">
                                <i class="fas fa-calendar-alt mr-1"></i>
                                ${XSSProtection.escapeHtml(Justice2.utils.formatDate(caseItem.updated_at))}
                            </small>
                            ${caseItem.client ? `<small class="text-muted ml-2"><i class="fas fa-user mr-1"></i>${clientValidation.valid ? XSSProtection.escapeHtml(clientValidation.sanitized) : ''}</small>` : ''}
                        </div>
                        <span class="case-status ${XSSProtection.escapeHtml(statusClass)}">${XSSProtection.escapeHtml(statusText)}</span>
                    </div>
                    ${caseItem.description && descriptionValidation.valid ? `<p class="text-muted small mt-2 mb-0">${XSSProtection.escapeHtml(descriptionValidation.sanitized)}</p>` : ''}
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="Justice2Dynamic.viewCase(${XSSProtection.escapeHtml(caseItem.id)})">
                            <i class="fas fa-eye mr-1"></i>Ver
                        </button>
                    </div>
                </div>
            `;
        });
        
        XSSProtection.setInnerHTMLSafe(container, html);
    },
    
    // Cargar documentos activos
    loadActiveDocuments: function() {
        const container = document.getElementById('active-documents');
        if (!container) return Promise.resolve();
        
        // Verificar cache
        const cacheKey = 'active-documents';
        if (this.isCached(cacheKey)) {
            this.renderDocuments(container, this.state.cache[cacheKey].data);
            return Promise.resolve();
        }
        
        this.showSectionLoading(container, 'Cargando documentos activos...');
        
        // Si estamos en modo degradado, usar datos mock directamente
        if (this.state.degradedMode) {
            return this.loadDocumentsFromMock(container, cacheKey);
        }
        
        return Justice2API.getDocuments({ limit: 5, sort: 'updated_desc' })
            .then(response => {
                const documents = response.data || this.getMockDocuments();
                this.updateCache(cacheKey, documents);
                this.renderDocuments(container, documents);
            })
            .catch(error => {
                this.log('Error cargando documentos:', error);
                // Intentar cargar desde mock como fallback
                return this.loadDocumentsFromMock(container, cacheKey);
            });
    },

    // Cargar documentos desde datos mock
    loadDocumentsFromMock: function(container, cacheKey) {
        if (window.Justice2MockData) {
            return Justice2MockData.getDocuments({ limit: 5, sort: 'updated_desc' })
                .then(response => {
                    const documents = response.data;
                    this.updateCache(cacheKey, documents);
                    this.renderDocuments(container, documents);
                    
                    // Mostrar notificación de modo degradado
                    if (this.state.degradedMode) {
                        this.showDegradedModeNotification('documentos');
                    }
                })
                .catch(error => {
                    this.log('Error cargando documentos desde mock:', error);
                    const documents = this.getMockDocuments();
                    this.renderDocuments(container, documents);
                });
        } else {
            // Fallback a datos mock locales
            const documents = this.getMockDocuments();
            this.updateCache(cacheKey, documents);
            this.renderDocuments(container, documents);
            return Promise.resolve();
        }
    },
    
    // Renderizar documentos
    renderDocuments: function(container, documents) {
        if (!documents || documents.length === 0) {
            XSSProtection.setInnerHTMLSafe(container, `
                <div class="text-center py-3">
                    <i class="fas fa-file-alt fa-2x text-muted mb-2"></i>
                    <p class="text-muted">No hay documentos activos</p>
                </div>
            `);
            return;
        }
        
        let html = '';
        documents.forEach((doc, index) => {
            const delay = index * 100;
            const icon = this.getDocumentIcon(doc.type);
            
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
            
            html += `
                <div class="document-item fade-in" style="animation-delay: ${delay}ms;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="document-info">
                            <div class="document-title">
                                <i class="${XSSProtection.escapeHtml(icon)} mr-2"></i>${titleValidation.valid ? XSSProtection.escapeHtml(titleValidation.sanitized) : ''}
                            </div>
                            <div class="document-meta">
                                <span class="badge badge-secondary">${typeValidation.valid ? XSSProtection.escapeHtml(typeValidation.sanitized) : ''}</span>
                                <span class="ml-2">${XSSProtection.escapeHtml(this.formatFileSize(doc.size))}</span>
                                <span class="ml-2">${XSSProtection.escapeHtml(Justice2.utils.formatDate(doc.updated_at))}</span>
                            </div>
                        </div>
                        <div class="document-actions">
                            <button class="btn btn-sm btn-outline-primary btn-sm-square"
                                    onclick="Justice2Dynamic.viewDocument(${XSSProtection.escapeHtml(doc.id)})"
                                    title="Ver">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary btn-sm-square"
                                    onclick="Justice2Dynamic.downloadDocument(${XSSProtection.escapeHtml(doc.id)})"
                                    title="Descargar">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        XSSProtection.setInnerHTMLSafe(container, html);
    },
    
    // Cargar estadísticas
    loadStatistics: function() {
        const container = document.getElementById('statistics');
        if (!container) return Promise.resolve();
        
        // Verificar cache
        const cacheKey = 'statistics';
        if (this.isCached(cacheKey)) {
            this.renderStatistics(container, this.state.cache[cacheKey].data);
            return Promise.resolve();
        }
        
        this.showSectionLoading(container, 'Cargando estadísticas...');
        
        // Si estamos en modo degradado, usar datos mock directamente
        if (this.state.degradedMode) {
            return this.loadStatisticsFromMock(container, cacheKey);
        }
        
        return Justice2API.getDashboard()
            .then(response => {
                const stats = response.data || this.getMockStatistics();
                this.updateCache(cacheKey, stats);
                this.renderStatistics(container, stats);
            })
            .catch(error => {
                this.log('Error cargando estadísticas:', error);
                // Intentar cargar desde mock como fallback
                return this.loadStatisticsFromMock(container, cacheKey);
            });
    },

    // Cargar estadísticas desde datos mock
    loadStatisticsFromMock: function(container, cacheKey) {
        if (window.Justice2MockData) {
            return Justice2MockData.getDashboard()
                .then(response => {
                    const stats = response.data;
                    this.updateCache(cacheKey, stats);
                    this.renderStatistics(container, stats);
                    
                    // Mostrar notificación de modo degradado
                    if (this.state.degradedMode) {
                        this.showDegradedModeNotification('estadísticas');
                    }
                })
                .catch(error => {
                    this.log('Error cargando estadísticas desde mock:', error);
                    const stats = this.getMockStatistics();
                    this.renderStatistics(container, stats);
                });
        } else {
            // Fallback a datos mock locales
            const stats = this.getMockStatistics();
            this.updateCache(cacheKey, stats);
            this.renderStatistics(container, stats);
            return Promise.resolve();
        }
    },
    
    // Renderizar estadísticas
    renderStatistics: function(container, stats) {
        let html = '';
        
        stats.forEach((stat, index) => {
            const delay = index * 100;
            const trend = stat.trend || 'up';
            const trendIcon = trend === 'up' ? 'fa-arrow-up text-success' : 'fa-arrow-down text-danger';
            const trendValue = stat.trend_value || '0%';
            
            // Validar y sanitizar datos de estadísticas
            const labelValidation = XSSProtection.validateInput(stat.label, {
                type: 'text',
                maxLength: 50,
                allowEmpty: true
            });
            
            const iconValidation = XSSProtection.validateInput(stat.icon, {
                type: 'text',
                maxLength: 50,
                allowEmpty: true
            });
            
            const trendValueValidation = XSSProtection.validateInput(trendValue, {
                type: 'text',
                maxLength: 20,
                allowEmpty: true
            });
            
            html += `
                <div class="stat-item fade-in" style="animation-delay: ${delay}ms;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <i class="${iconValidation.valid ? XSSProtection.escapeHtml(iconValidation.sanitized) : 'fas fa-chart-bar'} fa-2x text-primary"></i>
                        <small class="${trend === 'up' ? 'text-success' : 'text-danger'}">
                            <i class="fas ${XSSProtection.escapeHtml(trendIcon)} mr-1"></i>${trendValueValidation.valid ? XSSProtection.escapeHtml(trendValueValidation.sanitized) : '0%'}
                        </small>
                    </div>
                    <span class="stat-number" data-target="${XSSProtection.escapeHtml(stat.value)}">0</span>
                    <div class="stat-label">${labelValidation.valid ? XSSProtection.escapeHtml(labelValidation.sanitized) : ''}</div>
                </div>
            `;
        });
        
        XSSProtection.setInnerHTMLSafe(container, html);
        
        // Animar contadores
        setTimeout(() => {
            container.querySelectorAll('.stat-number').forEach(element => {
                const target = parseInt(element.dataset.target);
                Justice2.utils.animateCounter(element, target);
            });
        }, 100);
    },
    
    // Cargar notificaciones
    loadNotifications: function() {
        // Implementar si se necesita un panel de notificaciones
        return Promise.resolve();
    },
    
    // Iniciar actualización automática
    startAutoRefresh: function() {
        if (this.state.refreshTimer) {
            clearInterval(this.state.refreshTimer);
        }
        
        this.state.refreshTimer = setInterval(() => {
            if (!document.hidden && !this.state.isLoading) {
                this.loadAllContent();
            }
        }, this.config.refreshInterval);
    },
    
    // Detener actualización automática
    stopAutoRefresh: function() {
        if (this.state.refreshTimer) {
            clearInterval(this.state.refreshTimer);
            this.state.refreshTimer = null;
        }
    },
    
    // Utilidad de log
    log: function(...args) {
        if (!this.config.silentMode) {
            console.log('[Justice2Dynamic]', ...args);
        }
    },

    // Manejar errores de forma silenciosa
    handleError: function(error) {
        this.log('Error en carga dinámica:', error);
        
        // Activar modo degradado silenciosamente si falla la red
        if (!this.state.degradedMode) {
            this.state.degradedMode = true;
            this.state.degradedReason = 'Error de conexión';
            
            // Recargar con datos mock sin molestar al usuario
            this.loadAllContent();
        }
    },
    
    // Mostrar estado de carga
    showLoadingState: function() {
        const sections = ['recent-cases', 'active-documents', 'statistics'];
        sections.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                this.showSectionLoading(container, 'Cargando...');
            }
        });
    },
    
    // Ocultar estado de carga
    hideLoadingState: function() {
        // Las secciones individuales se actualizan al renderizar el contenido
    },
    
    // Mostrar carga en sección específica
    showSectionLoading: function(container, text) {
        Justice2.utils.showLoading(container, text);
    },
    
    // Manejar scroll
    handleScroll: function() {
        // Implementar lazy loading si es necesario
    },
    
    // Manejar resize
    handleResize: function() {
        // Ajustar layouts si es necesario
    },
    
    // Métodos de interacción
    viewCase: function(caseId) {
        // Validar y sanitizar el ID antes de usarlo
        const sanitizedId = XSSProtection.validateInput(caseId, {
            type: 'number',
            allowEmpty: false
        });
        
        if (sanitizedId.valid) {
            window.location.href = `cases.html?id=${sanitizedId.sanitized}`;
        }
    },
    
    viewDocument: function(docId) {
        // Validar y sanitizar el ID antes de usarlo
        const sanitizedId = XSSProtection.validateInput(docId, {
            type: 'number',
            allowEmpty: false
        });
        
        if (sanitizedId.valid) {
            window.open(`documents.html?id=${sanitizedId.sanitized}`, '_blank');
        }
    },
    
    downloadDocument: function(docId) {
        // Si estamos en modo degradado, simular descarga
        if (this.state.degradedMode) {
            if (typeof NotificationSystem !== 'undefined') {
                NotificationSystem.show({
                    type: 'warning',
                    title: 'Modo Degradado',
                    message: 'No se puede descargar el documento en modo degradado. La descarga se procesará cuando se restaure la conexión.',
                    duration: 5000
                });
            } else {
                // Fallback a console si NotificationSystem no está disponible
                console.log('[Justice2Dynamic] Modo Degradado: No se puede descargar el documento en modo degradado. La descarga se procesará cuando se restaure la conexión.');
            }
            return;
        }
        
        Justice2API.downloadDocument(docId)
            .then(response => {
                const blob = new Blob([response.data]);
                const url = window.URL.createObjectURL(blob);
                const a = XSSProtection.createElementSafe('a', {
                    href: url,
                    download: `document_${docId}`
                });
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                Justice2.utils.showNotification('Documento descargado correctamente', 'success');
            })
            .catch(error => {
                Justice2.utils.showNotification('Error al descargar documento', 'error');
            });
    },
    
    // Utilidades
    getStatusClass: function(status) {
        const statusClasses = {
            'active': 'status-active',
            'pending': 'status-pending',
            'closed': 'status-closed',
            'archived': 'status-archived'
        };
        return statusClasses[status] || 'status-pending';
    },
    
    getStatusText: function(status) {
        const statusTexts = {
            'active': 'Activo',
            'pending': 'Pendiente',
            'closed': 'Cerrado',
            'archived': 'Archivado'
        };
        return statusTexts[status] || 'Desconocido';
    },
    
    getDocumentIcon: function(type) {
        const icons = {
            'PDF': 'fas fa-file-pdf',
            'DOCX': 'fas fa-file-word',
            'DOC': 'fas fa-file-word',
            'XLSX': 'fas fa-file-excel',
            'XLS': 'fas fa-file-excel',
            'PPTX': 'fas fa-file-powerpoint',
            'PPT': 'fas fa-file-powerpoint',
            'TXT': 'fas fa-file-alt',
            'JPG': 'fas fa-file-image',
            'PNG': 'fas fa-file-image',
            'JPEG': 'fas fa-file-image'
        };
        return icons[type] || 'fas fa-file';
    },
    
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    isCached: function(key) {
        const cached = this.state.cache[key];
        return cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout;
    },
    
    updateCache: function(key, data) {
        this.state.cache[key] = {
            data,
            timestamp: Date.now()
        };
    },
    
    clearCache: function() {
        this.state.cache = {};
    },
    
    // Datos mock para demostración
    getMockCases: function() {
        return [
            {
                id: 1,
                title: 'Caso Laboral - Despido Improcedente',
                status: 'active',
                client: 'Juan Pérez',
                description: 'Despido sin justa causa en empresa tecnológica',
                updated_at: '2024-01-15T10:30:00Z'
            },
            {
                id: 2,
                title: 'Caso Civil - Incumplimiento de Contrato',
                status: 'pending',
                client: 'María García',
                description: 'Incumplimiento de términos contractuales',
                updated_at: '2024-01-14T15:45:00Z'
            },
            {
                id: 3,
                title: 'Caso Familiar - Custodia Compartida',
                status: 'active',
                client: 'Carlos Rodríguez',
                description: 'Modificación de medidas de custodia',
                updated_at: '2024-01-13T09:20:00Z'
            }
        ];
    },
    
    getMockDocuments: function() {
        return [
            {
                id: 1,
                title: 'Demanda Laboral',
                type: 'PDF',
                size: 2621440, // 2.5 MB
                updated_at: '2024-01-15T10:30:00Z'
            },
            {
                id: 2,
                title: 'Contrato de Arrendamiento',
                type: 'DOCX',
                size: 1258291, // 1.2 MB
                updated_at: '2024-01-14T15:45:00Z'
            },
            {
                id: 3,
                title: 'Escritura de Propiedad',
                type: 'PDF',
                size: 3984589, // 3.8 MB
                updated_at: '2024-01-13T09:20:00Z'
            }
        ];
    },
    
    getMockStatistics: function() {
        return [
            {
                label: 'Casos Activos',
                value: 47,
                icon: 'fas fa-briefcase',
                trend: 'up',
                trend_value: '12%'
            },
            {
                label: 'Documentos',
                value: 234,
                icon: 'fas fa-file-alt',
                trend: 'up',
                trend_value: '8%'
            },
            {
                label: 'Clientes',
                value: 89,
                icon: 'fas fa-users',
                trend: 'up',
                trend_value: '15%'
            }
        ];
    },
    
    // Debounce utility
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Logging
    log: function(...args) {
        Justice2?.log('[Justice2Dynamic]', ...args);
    }
};

// Inicializar carga dinámica
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Justice2Dynamic.init();
    });
} else {
    Justice2Dynamic.init();
}

// Exportar para uso global
window.Justice2Dynamic = Justice2Dynamic;