/**
 * Justice 2 Cases Manager
 * Sistema de gestión de casos legales con análisis predictivo
 */

// Importar sistema de protección XSS centralizado
// El sistema se carga automáticamente desde components/xss-protection.js

const CasesManager = {
    // Configuración
    config: {
        itemsPerPage: 12,
        viewMode: 'grid', // grid, list, timeline
        autoRefresh: true,
        refreshInterval: 30000, // 30 segundos
        analysisEnabled: true
    },
    
    // Estado
    state: {
        cases: [],
        filteredCases: [],
        currentPage: 1,
        totalPages: 1,
        isLoading: false,
        filters: {
            search: '',
            status: '',
            priority: '',
            type: '',
            date: ''
        },
        statistics: {
            total: 0,
            active: 0,
            closed: 0,
            successRate: 0
        },
        selectedCase: null
    },
    
    // Inicialización
    init: function() {
        this.log('Inicializando Gestor de Casos');
        
        // Cargar casos
        this.loadCases();
        
        // Inicializar eventos
        this.initEvents();
        
        // Inicializar actualización automática
        if (this.config.autoRefresh) {
            this.startAutoRefresh();
        }
        
        this.log('Gestor de Casos inicializado');
    },
    
    // Inicializar eventos
    initEvents: function() {
        // Eventos de filtros
        const searchInput = document.getElementById('search-cases');
        const statusFilter = document.getElementById('filter-status');
        const priorityFilter = document.getElementById('filter-priority');
        const typeFilter = document.getElementById('filter-type');
        const dateFilter = document.getElementById('filter-date');
        
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                // Validar y sanitizar el término de búsqueda
                const searchValidation = XSSProtection.validateInput(searchInput.value, {
                    type: 'text',
                    maxLength: 200,
                    allowEmpty: true
                });
                
                this.state.filters.search = searchValidation.valid ? searchValidation.sanitized : '';
                this.applyFilters();
            }, 300));
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                // Validar y sanitizar el estado
                const statusValidation = XSSProtection.validateInput(statusFilter.value, {
                    type: 'text',
                    maxLength: 50,
                    allowEmpty: true
                });
                
                this.state.filters.status = statusValidation.valid ? statusValidation.sanitized : '';
                this.applyFilters();
            });
        }
        
        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => {
                // Validar y sanitizar la prioridad
                const priorityValidation = XSSProtection.validateInput(priorityFilter.value, {
                    type: 'text',
                    maxLength: 20,
                    allowEmpty: true
                });
                
                this.state.filters.priority = priorityValidation.valid ? priorityValidation.sanitized : '';
                this.applyFilters();
            });
        }
        
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                // Validar y sanitizar el tipo
                const typeValidation = XSSProtection.validateInput(typeFilter.value, {
                    type: 'text',
                    maxLength: 50,
                    allowEmpty: true
                });
                
                this.state.filters.type = typeValidation.valid ? typeValidation.sanitized : '';
                this.applyFilters();
            });
        }
        
        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.state.filters.date = dateFilter.value;
                this.applyFilters();
            });
        }
        
        // Eventos de modales
        this.initModalEvents();
    },
    
    // Inicializar eventos de modales
    initModalEvents: function() {
        // Modal de crear caso
        const createCaseForm = document.getElementById('create-case-form');
        
        if (createCaseForm) {
            createCaseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createCase();
            });
        }
        
        // Modal de detalles
        const editCaseBtn = document.getElementById('edit-case');
        const analyzeCaseBtn = document.getElementById('analyze-case');
        
        if (editCaseBtn) {
            editCaseBtn.addEventListener('click', () => this.editCurrentCase());
        }
        
        if (analyzeCaseBtn) {
            analyzeCaseBtn.addEventListener('click', () => this.analyzeCurrentCase());
        }
    },
    
    // Cargar casos
    loadCases: async function() {
        this.state.isLoading = true;
        this.showLoading();
        
        try {
            const response = await Justice2API.getCases({
                page: this.state.currentPage,
                limit: this.config.itemsPerPage,
                ...this.state.filters
            });
            
            this.state.cases = response.data.cases || [];
            this.state.totalPages = response.data.total_pages || 1;
            this.state.statistics = response.data.statistics || this.calculateStatistics();
            
            this.applyFilters();
            this.updateStatistics();
            
        } catch (error) {
            this.log('Error cargando casos:', error);
            // Usar datos mock para demostración
            this.loadMockCases();
        } finally {
            this.state.isLoading = false;
            this.hideLoading();
        }
    },
    
    // Cargar casos mock para demostración
    loadMockCases: function() {
        const mockCases = [
            {
                id: 1,
                title: 'Caso Laboral - Despido Improcedente',
                number: 'EXP-2024-001',
                client: 'Juan Pérez García',
                type: 'laboral',
                status: 'active',
                priority: 'high',
                description: 'Despido sin justa causa en empresa tecnológica. Se solicita indemnización y readmisión.',
                notes: 'Cliente con pruebas documentales y testigos.',
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-20T15:45:00Z',
                documents: 5,
                hearings: 2,
                success_probability: 85
            },
            {
                id: 2,
                title: 'Caso Civil - Incumplimiento de Contrato',
                number: 'EXP-2024-002',
                client: 'María González López',
                type: 'civil',
                status: 'active',
                priority: 'medium',
                description: 'Incumplimiento de términos contractuales por parte del proveedor.',
                notes: 'Contrato con cláusulas penales evidentes.',
                created_at: '2024-01-14T09:15:00Z',
                updated_at: '2024-01-18T11:20:00Z',
                documents: 8,
                hearings: 1,
                success_probability: 72
            },
            {
                id: 3,
                title: 'Caso Familiar - Custodia Compartida',
                number: 'EXP-2024-003',
                client: 'Carlos Rodríguez Martínez',
                type: 'family',
                status: 'pending',
                priority: 'medium',
                description: 'Modificación de medidas de custodia compartida tras cambio de circunstancias.',
                notes: 'Interés superior del menor como factor principal.',
                created_at: '2024-01-13T14:20:00Z',
                updated_at: '2024-01-13T14:20:00Z',
                documents: 3,
                hearings: 0,
                success_probability: 68
            },
            {
                id: 4,
                title: 'Caso Penal - Defensa en Juicio Rápido',
                number: 'EXP-2024-004',
                client: 'Ana Martínez Sánchez',
                type: 'penal',
                status: 'active',
                priority: 'high',
                description: 'Defensa en procedimiento de juicio rápido por falta leve.',
                notes: 'Cliente sin antecedentes penales.',
                created_at: '2024-01-12T16:45:00Z',
                updated_at: '2024-01-19T10:30:00Z',
                documents: 4,
                hearings: 3,
                success_probability: 90
            },
            {
                id: 5,
                title: 'Caso Administrativo - Recurso contra Sanción',
                number: 'EXP-2024-005',
                client: 'Pedro Jiménez Castro',
                type: 'administrative',
                status: 'closed',
                priority: 'low',
                description: 'Recurso administrativo contra sanción impuesta por organismo público.',
                notes: 'Resolución favorable al cliente.',
                created_at: '2024-01-10T11:00:00Z',
                updated_at: '2024-01-25T09:15:00Z',
                documents: 6,
                hearings: 2,
                success_probability: 95,
                outcome: 'favorable'
            },
            {
                id: 6,
                title: 'Caso Civil - Reclamación de Cantidades',
                number: 'EXP-2024-006',
                client: 'Laura Torres Díaz',
                type: 'civil',
                status: 'archived',
                priority: 'low',
                description: 'Reclamación de cantidades adeudadas por servicios prestados.',
                notes: 'Caso archivado por acuerdo extrajudicial.',
                created_at: '2024-01-08T13:30:00Z',
                updated_at: '2024-01-22T16:45:00Z',
                documents: 2,
                hearings: 0,
                success_probability: 88,
                outcome: 'acuerdo'
            }
        ];
        
        this.state.cases = mockCases;
        this.state.totalPages = Math.ceil(mockCases.length / this.config.itemsPerPage);
        this.state.statistics = this.calculateStatistics();
        
        this.applyFilters();
        this.updateStatistics();
    },
    
    // Calcular estadísticas
    calculateStatistics: function() {
        const total = this.state.cases.length;
        const active = this.state.cases.filter(c => c.status === 'active').length;
        const closed = this.state.cases.filter(c => c.status === 'closed' || c.status === 'archived').length;
        
        let successRate = 0;
        const successfulCases = this.state.cases.filter(c => 
            c.outcome === 'favorable' || c.outcome === 'acuerdo'
        );
        
        if (closed > 0) {
            successRate = Math.round((successfulCases.length / closed) * 100);
        }
        
        return {
            total,
            active,
            closed,
            successRate
        };
    },
    
    // Aplicar filtros
    applyFilters: function() {
        let filtered = [...this.state.cases];
        
        // Filtro de búsqueda
        if (this.state.filters.search) {
            const search = this.state.filters.search.toLowerCase();
            filtered = filtered.filter(c => 
                c.title.toLowerCase().includes(search) ||
                c.client.toLowerCase().includes(search) ||
                c.number.toLowerCase().includes(search)
            );
        }
        
        // Filtro de estado
        if (this.state.filters.status) {
            filtered = filtered.filter(c => c.status === this.state.filters.status);
        }
        
        // Filtro de prioridad
        if (this.state.filters.priority) {
            filtered = filtered.filter(c => c.priority === this.state.filters.priority);
        }
        
        // Filtro de tipo
        if (this.state.filters.type) {
            filtered = filtered.filter(c => c.type === this.state.filters.type);
        }
        
        // Filtro de fecha
        if (this.state.filters.date) {
            const filterDate = new Date(this.state.filters.date);
            filtered = filtered.filter(c => {
                const caseDate = new Date(c.created_at);
                return caseDate >= filterDate;
            });
        }
        
        this.state.filteredCases = filtered;
        this.state.totalPages = Math.ceil(filtered.length / this.config.itemsPerPage);
        this.state.currentPage = 1;
        
        this.renderCases();
        this.renderPagination();
    },
    
    // Renderizar casos
    renderCases: function() {
        const container = document.getElementById('cases-container');
        if (!container) return;
        
        if (this.state.filteredCases.length === 0) {
            XSSProtection.setInnerHTMLSafe(container, `
                <div class="empty-state">
                    <i class="fas fa-briefcase"></i>
                    <h5>No se encontraron casos</h5>
                    <p>Intente ajustar los filtros o cree un nuevo caso</p>
                </div>
            `);
            return;
        }
        
        const startIndex = (this.state.currentPage - 1) * this.config.itemsPerPage;
        const endIndex = startIndex + this.config.itemsPerPage;
        const pageCases = this.state.filteredCases.slice(startIndex, endIndex);
        
        let html = '';
        
        if (this.config.viewMode === 'grid') {
            html = '<div class="cases-grid">';
            pageCases.forEach(caseItem => {
                html += this.renderCaseCard(caseItem);
            });
            html += '</div>';
        } else if (this.config.viewMode === 'list') {
            html = '<div class="cases-list">';
            pageCases.forEach(caseItem => {
                html += this.renderCaseListItem(caseItem);
            });
            html += '</div>';
        } else if (this.config.viewMode === 'timeline') {
            html = '<div class="cases-timeline">';
            html += '<div class="timeline-line"></div>';
            pageCases.forEach(caseItem => {
                html += this.renderTimelineItem(caseItem);
            });
            html += '</div>';
        }
        
        XSSProtection.setInnerHTMLSafe(container, html);
    },
    
    // Renderizar tarjeta de caso
    renderCaseCard: function(caseItem) {
        // Validar y sanitizar datos del caso
        const sanitizedCase = this.sanitizeCaseData(caseItem);
        
        const statusClass = this.getStatusClass(sanitizedCase.status);
        const priorityClass = this.getPriorityClass(sanitizedCase.priority);
        const typeIcon = this.getTypeIcon(sanitizedCase.type);
        
        return `
            <div class="case-card" onclick="CasesManager.viewCase(${XSSProtection.escapeHtml(sanitizedCase.id)})">
                <div class="case-header">
                    <div class="case-number">${XSSProtection.escapeHtml(sanitizedCase.number)}</div>
                    <div class="case-title">${XSSProtection.escapeHtml(sanitizedCase.title)}</div>
                    <div class="case-client">${XSSProtection.escapeHtml(sanitizedCase.client)}</div>
                    <div class="case-priority ${XSSProtection.escapeHtml(priorityClass)}"></div>
                </div>
                <div class="case-body">
                    <div class="case-type">
                        <i class="${XSSProtection.escapeHtml(typeIcon)} mr-2"></i>${XSSProtection.escapeHtml(this.getTypeLabel(sanitizedCase.type))}
                    </div>
                    <div class="case-status ${XSSProtection.escapeHtml(statusClass)}">${XSSProtection.escapeHtml(this.getStatusLabel(sanitizedCase.status))}</div>
                    <div class="case-description">${XSSProtection.escapeHtml(sanitizedCase.description)}</div>
                    <div class="case-meta">
                        <div class="case-date">
                            <i class="fas fa-calendar-alt mr-2"></i>
                            ${XSSProtection.escapeHtml(Justice2.utils.formatDate(sanitizedCase.created_at))}
                        </div>
                        <div>
                            <i class="fas fa-file-alt mr-2"></i>${XSSProtection.escapeHtml(sanitizedCase.documents)} docs
                        </div>
                        <div>
                            <i class="fas fa-gavel mr-2"></i>${XSSProtection.escapeHtml(sanitizedCase.hearings)} audiencias
                        </div>
                    </div>
                    <div class="case-actions">
                        <button class="case-action-btn view" onclick="event.stopPropagation(); CasesManager.viewCase(${XSSProtection.escapeHtml(sanitizedCase.id)})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="case-action-btn edit" onclick="event.stopPropagation(); CasesManager.editCase(${XSSProtection.escapeHtml(sanitizedCase.id)})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="case-action-btn analyze" onclick="event.stopPropagation(); CasesManager.analyzeCase(${XSSProtection.escapeHtml(sanitizedCase.id)})">
                            <i class="fas fa-brain"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Renderizar item de lista de caso
    renderCaseListItem: function(caseItem) {
        const statusClass = this.getStatusClass(caseItem.status);
        const priorityClass = this.getPriorityClass(caseItem.priority);
        const typeIcon = this.getTypeIcon(caseItem.type);
        
        return `
            <div class="case-list-item" onclick="CasesManager.viewCase(${caseItem.id})">
                <div class="case-list-icon">
                    <i class="${typeIcon}"></i>
                </div>
                <div class="case-list-info">
                    <div class="case-list-title">${caseItem.title}</div>
                    <div class="case-list-meta">
                        <span class="badge badge-secondary">${caseItem.number}</span>
                        <span>${caseItem.client}</span>
                        <span>${this.getTypeLabel(caseItem.type)}</span>
                        <span class="case-status ${statusClass}">${this.getStatusLabel(caseItem.status)}</span>
                    </div>
                    <div class="case-list-description">${caseItem.description}</div>
                </div>
                <div class="case-list-actions">
                    <button class="case-action-btn view" onclick="event.stopPropagation(); CasesManager.viewCase(${caseItem.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="case-action-btn edit" onclick="event.stopPropagation(); CasesManager.editCase(${caseItem.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="case-action-btn analyze" onclick="event.stopPropagation(); CasesManager.analyzeCase(${caseItem.id})">
                        <i class="fas fa-brain"></i>
                    </button>
                </div>
            </div>
        `;
    },
    
    // Renderizar item de timeline
    renderTimelineItem: function(caseItem) {
        const date = new Date(caseItem.created_at);
        const day = date.getDate();
        const month = date.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
        
        return `
            <div class="timeline-item">
                <div class="timeline-date">
                    <div class="timeline-day">${day}</div>
                    <div class="timeline-month">${month}</div>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <div class="timeline-title">${caseItem.title}</div>
                        <div class="timeline-status case-status ${this.getStatusClass(caseItem.status)}">
                            ${this.getStatusLabel(caseItem.status)}
                        </div>
                    </div>
                    <div class="timeline-meta">
                        <span><i class="fas fa-user mr-2"></i>${caseItem.client}</span>
                        <span><i class="fas fa-briefcase mr-2"></i>${caseItem.number}</span>
                        <span><i class="fas fa-calendar-alt mr-2"></i>${Justice2.utils.formatDate(caseItem.created_at)}</span>
                    </div>
                    <div class="timeline-description">${caseItem.description}</div>
                </div>
            </div>
        `;
    },
    
    // Renderizar paginación
    renderPagination: function() {
        const container = document.getElementById('cases-pagination');
        if (!container) return;
        
        if (this.state.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Previous
        html += `
            <li class="page-item ${this.state.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="CasesManager.goToPage(${this.state.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, this.state.currentPage - 2);
        const endPage = Math.min(this.state.totalPages, this.state.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.state.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="CasesManager.goToPage(${i})">${i}</a>
                </li>
            `;
        }
        
        // Next
        html += `
            <li class="page-item ${this.state.currentPage === this.state.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="CasesManager.goToPage(${this.state.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        XSSProtection.setInnerHTMLSafe(container, html);
    },
    
    // Ver caso
    viewCase: function(caseId) {
        const caseItem = this.state.cases.find(c => c.id === caseId);
        if (!caseItem) return;
        
        this.state.selectedCase = caseItem;
        
        const modal = new bootstrap.Modal(document.getElementById('caseDetailsModal'));
        const titleElement = document.getElementById('case-details-title');
        const contentElement = document.getElementById('case-details-content');
        
        if (titleElement) {
            const titleValidation = XSSProtection.validateInput(caseItem.title, {
                type: 'text',
                maxLength: 200,
                allowEmpty: true
            });
            XSSProtection.setElementTextSafe(titleElement, titleValidation.valid ? titleValidation.sanitized : '');
        }
        
        if (contentElement) {
            XSSProtection.setInnerHTMLSafe(contentElement, this.renderCaseDetails(caseItem));
        }
        
        modal.show();
    },
    
    // Renderizar detalles del caso
    renderCaseDetails: function(caseItem) {
        const statusClass = this.getStatusClass(caseItem.status);
        const priorityClass = this.getPriorityClass(caseItem.priority);
        
        let html = `
            <div class="case-details-section">
                <h6><i class="fas fa-info-circle mr-2"></i>Información General</h6>
                <div class="case-detail-item">
                    <span class="case-detail-label">Número de Expediente:</span>
                    <span class="case-detail-value">${caseItem.number}</span>
                </div>
                <div class="case-detail-item">
                    <span class="case-detail-label">Cliente:</span>
                    <span class="case-detail-value">${caseItem.client}</span>
                </div>
                <div class="case-detail-item">
                    <span class="case-detail-label">Tipo:</span>
                    <span class="case-detail-value">${this.getTypeLabel(caseItem.type)}</span>
                </div>
                <div class="case-detail-item">
                    <span class="case-detail-label">Estado:</span>
                    <span class="case-status ${statusClass}">${this.getStatusLabel(caseItem.status)}</span>
                </div>
                <div class="case-detail-item">
                    <span class="case-detail-label">Prioridad:</span>
                    <span class="case-priority ${priorityClass}"></span>
                    <span class="case-detail-value">${this.getPriorityLabel(caseItem.priority)}</span>
                </div>
            </div>
            
            <div class="case-details-section">
                <h6><i class="fas fa-file-alt mr-2"></i>Descripción</h6>
                <p>${caseItem.description}</p>
            </div>
            
            <div class="case-details-section">
                <h6><i class="fas fa-sticky-note mr-2"></i>Notas</h6>
                <p>${caseItem.notes || 'No hay notas adicionales'}</p>
            </div>
            
            <div class="case-details-section">
                <h6><i class="fas fa-chart-bar mr-2"></i>Estadísticas</h6>
                <div class="case-detail-item">
                    <span class="case-detail-label">Documentos:</span>
                    <span class="case-detail-value">${caseItem.documents}</span>
                </div>
                <div class="case-detail-item">
                    <span class="case-detail-label">Audiencias:</span>
                    <span class="case-detail-value">${caseItem.hearings}</span>
                </div>
                <div class="case-detail-item">
                    <span class="case-detail-label">Fecha de Creación:</span>
                    <span class="case-detail-value">${Justice2.utils.formatDate(caseItem.created_at)}</span>
                </div>
                <div class="case-detail-item">
                    <span class="case-detail-label">Última Actualización:</span>
                    <span class="case-detail-value">${Justice2.utils.formatDate(caseItem.updated_at)}</span>
                </div>
            </div>
        `;
        
        // Agregar análisis con IA si está disponible
        if (caseItem.success_probability && this.config.analysisEnabled) {
            html += `
                <div class="analysis-result">
                    <h6><i class="fas fa-brain mr-2"></i>Análisis Predictivo con IA</h6>
                    <div class="analysis-prediction">
                        <div class="prediction-percentage">${caseItem.success_probability}%</div>
                        <div class="prediction-text">
                            <strong>Probabilidad de éxito:</strong><br>
                            ${this.getSuccessPrediction(caseItem.success_probability)}
                        </div>
                    </div>
                    <div class="prediction-confidence">
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${caseItem.success_probability}%"></div>
                        </div>
                        <div class="confidence-text">Confianza: ${caseItem.success_probability}%</div>
                    </div>
                </div>
            `;
        }
        
        return html;
    },
    
    // Mostrar modal para crear caso
    showCreateCaseModal: function() {
        const modal = new bootstrap.Modal(document.getElementById('createCaseModal'));
        modal.show();
    },
    
    // Crear caso
    createCase: async function() {
        const form = document.getElementById('create-case-form');
        const formData = new FormData(form);
        
        // Validar y sanitizar datos del formulario
        const caseData = {
            title: this.sanitizeFormDataInput(formData.get('case-title'), 'text', 200),
            number: this.sanitizeFormDataInput(formData.get('case-number'), 'text', 50),
            client: this.sanitizeFormDataInput(formData.get('case-client'), 'text', 100),
            type: this.sanitizeFormDataInput(formData.get('case-type'), 'text', 50),
            priority: this.sanitizeFormDataInput(formData.get('case-priority'), 'text', 20),
            status: this.sanitizeFormDataInput(formData.get('case-status'), 'text', 20),
            description: this.sanitizeFormDataInput(formData.get('case-description'), 'text', 1000),
            notes: this.sanitizeFormDataInput(formData.get('case-notes'), 'text', 2000)
        };
        
        // Validar formulario
        if (!this.validateCaseData(caseData)) {
            return;
        }
        
        try {
            // Crear caso en API
            const response = await Justice2API.createCase(caseData);
            
            // Agregar a lista
            const newCase = {
                ...response.data,
                documents: 0,
                hearings: 0,
                success_probability: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            this.state.cases.unshift(newCase);
            this.applyFilters();
            this.updateStatistics();
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createCaseModal'));
            modal.hide();
            
            // Limpiar formulario
            form.reset();
            
            Justice2.utils.showNotification('Caso creado correctamente', 'success');
            
        } catch (error) {
            this.log('Error creando caso:', error);
            Justice2.utils.showNotification('Error al crear caso', 'error');
        }
    },
    
    // Validar datos del caso
    validateCaseData: function(caseData) {
        if (!caseData.title.trim()) {
            Justice2.utils.showNotification('El título es requerido', 'error');
            return false;
        }
        
        if (!caseData.client.trim()) {
            Justice2.utils.showNotification('El cliente es requerido', 'error');
            return false;
        }
        
        if (!caseData.type) {
            Justice2.utils.showNotification('El tipo de caso es requerido', 'error');
            return false;
        }
        
        if (!caseData.priority) {
            Justice2.utils.showNotification('La prioridad es requerida', 'error');
            return false;
        }
        
        return true;
    },
    
    // Editar caso
    editCase: function(caseId) {
        const caseItem = this.state.cases.find(c => c.id === caseId);
        if (!caseItem) return;
        
        // Cerrar modal de detalles
        const detailsModal = bootstrap.Modal.getInstance(document.getElementById('caseDetailsModal'));
        detailsModal.hide();
        
        // Abrir modal de edición con datos precargados
        this.showCreateCaseModal();
        
        // Llenar formulario con datos existentes
        setTimeout(() => {
            const titleElement = document.getElementById('case-title');
            const numberElement = document.getElementById('case-number');
            const clientElement = document.getElementById('case-client');
            const typeElement = document.getElementById('case-type');
            const priorityElement = document.getElementById('case-priority');
            const statusElement = document.getElementById('case-status');
            const descriptionElement = document.getElementById('case-description');
            const notesElement = document.getElementById('case-notes');
            
            if (titleElement) titleElement.value = caseItem.title || '';
            if (numberElement) numberElement.value = caseItem.number || '';
            if (clientElement) clientElement.value = caseItem.client || '';
            if (typeElement) typeElement.value = caseItem.type || '';
            if (priorityElement) priorityElement.value = caseItem.priority || '';
            if (statusElement) statusElement.value = caseItem.status || '';
            if (descriptionElement) descriptionElement.value = caseItem.description || '';
            if (notesElement) notesElement.value = caseItem.notes || '';
        }, 500);
    },
    
    // Analizar caso con IA
    analyzeCase: async function(caseId) {
        const caseItem = this.state.cases.find(c => c.id === caseId);
        if (!caseItem) return;
        
        Justice2.utils.showNotification('Iniciando análisis predictivo con IA...', 'info');
        
        try {
            const response = await Justice2API.analyzeWithAI(
                JSON.stringify(caseItem),
                'case'
            );
            
            // Actualizar caso con resultados del análisis
            caseItem.success_probability = response.data.success_probability;
            caseItem.analysis = response.data.analysis;
            
            // Actualizar vista
            this.renderCaseDetails(caseItem);
            
            Justice2.utils.showNotification('Análisis completado', 'success');
            
        } catch (error) {
            this.log('Error analizando caso:', error);
            Justice2.utils.showNotification('Error en análisis del caso', 'error');
        }
    },
    
    // Editar caso actual
    editCurrentCase: function() {
        if (this.state.selectedCase) {
            this.editCase(this.state.selectedCase.id);
        }
    },
    
    // Analizar caso actual
    analyzeCurrentCase: function() {
        if (this.state.selectedCase) {
            this.analyzeCase(this.state.selectedCase.id);
        }
    },
    
    // Cambiar vista
    setView: function(mode) {
        this.config.viewMode = mode;
        
        // Actualizar botones
        const buttons = document.querySelectorAll('.btn-group .btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        this.renderCases();
    },
    
    // Ir a página
    goToPage: function(page) {
        if (page < 1 || page > this.state.totalPages) return;
        
        this.state.currentPage = page;
        this.renderCases();
        this.renderPagination();
    },
    
    // Actualizar estadísticas
    updateStatistics: function() {
        const totalElement = document.getElementById('total-cases');
        const activeElement = document.getElementById('active-cases');
        const closedElement = document.getElementById('closed-cases');
        const successRateElement = document.getElementById('success-rate');
        
        if (totalElement) {
            totalElement.textContent = this.state.statistics.total;
        }
        
        if (activeElement) {
            activeElement.textContent = this.state.statistics.active;
        }
        
        if (closedElement) {
            closedElement.textContent = this.state.statistics.closed;
        }
        
        if (successRateElement) {
            successRateElement.textContent = `${this.state.statistics.successRate}%`;
        }
    },
    
    // Mostrar loading
    showLoading: function() {
        const container = document.getElementById('cases-container');
        if (container) {
            XSSProtection.setInnerHTMLSafe(container, `
                <div class="cases-loading">
                    <div class="loading-spinner"></div>
                    <p>Cargando casos...</p>
                </div>
            `);
        }
    },
    
    // Ocultar loading
    hideLoading: function() {
        // El loading se oculta al renderizar los casos
    },
    
    // Iniciar actualización automática
    startAutoRefresh: function() {
        setInterval(() => {
            if (!this.state.isLoading) {
                this.loadCases();
            }
        }, this.config.refreshInterval);
    },
    
    // Utilidades
    getStatusClass: function(status) {
        const classes = {
            'active': 'status-active',
            'pending': 'status-pending',
            'closed': 'status-closed',
            'archived': 'status-archived'
        };
        return classes[status] || 'status-pending';
    },
    
    getStatusLabel: function(status) {
        const labels = {
            'active': 'Activo',
            'pending': 'Pendiente',
            'closed': 'Cerrado',
            'archived': 'Archivado'
        };
        return labels[status] || 'Desconocido';
    },
    
    getPriorityClass: function(priority) {
        const classes = {
            'high': 'priority-high',
            'medium': 'priority-medium',
            'low': 'priority-low'
        };
        return classes[priority] || 'priority-medium';
    },
    
    getPriorityLabel: function(priority) {
        const labels = {
            'high': 'Alta',
            'medium': 'Media',
            'low': 'Baja'
        };
        return labels[priority] || 'Media';
    },
    
    getTypeIcon: function(type) {
        const icons = {
            'civil': 'fas fa-balance-scale',
            'penal': 'fas fa-gavel',
            'laboral': 'fas fa-briefcase',
            'administrative': 'fas fa-landmark',
            'family': 'fas fa-home'
        };
        return icons[type] || 'fas fa-briefcase';
    },
    
    getTypeLabel: function(type) {
        const labels = {
            'civil': 'Civil',
            'penal': 'Penal',
            'laboral': 'Laboral',
            'administrative': 'Administrativo',
            'family': 'Familiar'
        };
        return labels[type] || 'Otro';
    },
    
    getSuccessPrediction: function(probability) {
        if (probability >= 80) {
            return 'Alta probabilidad de éxito. Caso con fundamentos sólidos y buena evidencia.';
        } else if (probability >= 60) {
            return 'Probabilidad moderada de éxito. Caso con posibilidades razonables.';
        } else if (probability >= 40) {
            return 'Probabilidad baja de éxito. Se recomienda fortalecer la estrategia.';
        } else {
            return 'Probabilidad muy baja de éxito. Caso de alto riesgo.';
        }
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
    
    // Sanitizar datos de caso
    sanitizeCaseData: function(caseItem) {
        if (!caseItem || typeof caseItem !== 'object') {
            return {};
        }
        
        const sanitized = {};
        
        // Sanitizar campos de texto
        ['title', 'number', 'client', 'type', 'status', 'priority', 'description', 'notes', 'outcome'].forEach(field => {
            if (caseItem[field]) {
                const validation = XSSProtection.validateInput(caseItem[field], {
                    type: 'text',
                    maxLength: field === 'description' || field === 'notes' ? 2000 : 200,
                    allowEmpty: true
                });
                sanitized[field] = validation.valid ? validation.sanitized : '';
            }
        });
        
        // Copiar campos numéricos seguros
        ['id', 'documents', 'hearings', 'success_probability'].forEach(field => {
            if (caseItem[field] !== undefined) {
                sanitized[field] = caseItem[field];
            }
        });
        
        // Copiar campos de fecha seguros
        ['created_at', 'updated_at'].forEach(field => {
            if (caseItem[field]) {
                sanitized[field] = caseItem[field];
            }
        });
        
        return sanitized;
    },
    
    // Sanitizar entrada de formulario
    sanitizeFormDataInput: function(value, type, maxLength) {
        const validation = XSSProtection.validateInput(value, {
            type: type,
            maxLength: maxLength,
            allowEmpty: true
        });
        
        return validation.valid ? validation.sanitized : '';
    },
    
    // Logging
    log: function(...args) {
        Justice2?.log('[CasesManager]', ...args);
    }
};

// Inicializar Gestor de Casos
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CasesManager.init();
    });
} else {
    CasesManager.init();
}

// Exportar para uso global
window.CasesManager = CasesManager;