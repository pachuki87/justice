/**
 * Justice 2 Mock Data
 * Datos de ejemplo para modo degradado cuando la API no está disponible
 */

// Importar sistema de protección XSS centralizado
// El sistema se carga automáticamente desde components/xss-protection.js

const Justice2MockData = {
    // Configuración
    config: {
        enabled: true,
        autoActivate: true,
        dataRefreshInterval: 300000, // 5 minutos
        storageKey: 'justice2_mock_cache'
    },

    // Estado
    state: {
        isActive: false,
        lastUpdate: null,
        cache: {}
    },

    // Inicialización
    init: function() {
        this.log('Inicializando datos mock para modo degradado');
        
        // Cargar cache si existe
        this.loadCache();
        
        // Escuchar eventos de modo degradado
        this.setupEventListeners();
        
        this.log('Datos mock inicializados');
    },

    // Configurar event listeners
    setupEventListeners: function() {
        document.addEventListener('justice2:degraded-mode', (e) => {
            this.activate(e.detail.reason);
        });
    },

    // Activar modo mock
    activate: function(reason) {
        this.state.isActive = true;
        this.state.lastUpdate = Date.now();
        
        this.log(`Modo mock activado por: ${reason}`);
        
        // Notificación visual SILENCIADA (Context7 MCP)
        // Se reemplaza por log en consola para evitar saturación de la UI
        console.info('[Justice2MockData] Modo Degradado Activado: Usando datos locales mientras se restaura la conexión.');
    },

    // Desactivar modo mock
    deactivate: function() {
        this.state.isActive = false;
        this.log('Modo mock desactivado');
    },

    // Obtener datos mock de casos
    getCases: function(params = {}) {
        const cases = this.generateCases(params.limit || 10);
        
        return Promise.resolve({
            data: cases,
            cached: true,
            source: 'mock',
            timestamp: Date.now()
        });
    },

    // Obtener un caso específico
    getCase: function(id) {
        const cases = this.generateCases(50);
        const caseItem = cases.find(c => c.id == id);
        
        if (!caseItem) {
            return Promise.reject({
                response: { status: 404, statusText: 'Case not found' }
            });
        }
        
        return Promise.resolve({
            data: caseItem,
            cached: true,
            source: 'mock',
            timestamp: Date.now()
        });
    },

    // Crear caso mock
    createCase: function(caseData) {
        // Validar y sanitizar datos del caso antes de crearlo
        const sanitizedData = this.sanitizeCaseData(caseData);
        
        const newCase = {
            id: Math.floor(Math.random() * 10000) + 1000,
            ...sanitizedData,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        if (typeof NotificationSystem !== 'undefined') {
            NotificationSystem.show({
                type: 'success',
                title: 'Caso Creado',
                message: 'El caso se ha guardado localmente. Se sincronizará cuando la conexión se restaure.',
                duration: 5000
            });
        } else {
            // Fallback a console si NotificationSystem no está disponible
            console.log('[Justice2MockData] Caso Creado: El caso se ha guardado localmente. Se sincronizará cuando la conexión se restaure.');
        }
        
        return Promise.resolve({
            data: newCase,
            cached: true,
            source: 'mock',
            timestamp: Date.now()
        });
    },

    // Obtener documentos mock
    getDocuments: function(params = {}) {
        const documents = this.generateDocuments(params.limit || 10);
        
        return Promise.resolve({
            data: documents,
            cached: true,
            source: 'mock',
            timestamp: Date.now()
        });
    },

    // Obtener documento específico
    getDocument: function(id) {
        const documents = this.generateDocuments(50);
        const document = documents.find(d => d.id == id);
        
        if (!document) {
            return Promise.reject({
                response: { status: 404, statusText: 'Document not found' }
            });
        }
        
        return Promise.resolve({
            data: document,
            cached: true,
            source: 'mock',
            timestamp: Date.now()
        });
    },

    // Subir documento mock
    uploadDocument: function(file, metadata = {}) {
        // Validar y sanitizar metadatos del documento
        const sanitizedMetadata = this.sanitizeDocumentMetadata(metadata);
        
        const newDocument = {
            id: Math.floor(Math.random() * 10000) + 1000,
            title: sanitizedMetadata.title || this.sanitizeFileName(file.name),
            type: this.getFileType(file.name),
            size: file.size || Math.floor(Math.random() * 5000000) + 100000,
            status: 'processing',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...sanitizedMetadata
        };
        
        if (typeof NotificationSystem !== 'undefined') {
            NotificationSystem.show({
                type: 'success',
                title: 'Documento Subido',
                message: 'El documento se ha guardado localmente. Se procesará cuando la conexión se restaure.',
                duration: 5000
            });
        } else {
            // Fallback a console si NotificationSystem no está disponible
            console.log('[Justice2MockData] Documento Subido: El documento se ha guardado localmente. Se procesará cuando la conexión se restaure.');
        }
        
        return Promise.resolve({
            data: newDocument,
            cached: true,
            source: 'mock',
            timestamp: Date.now()
        });
    },

    // Obtener estadísticas mock
    getDashboard: function() {
        const stats = this.generateStatistics();
        
        return Promise.resolve({
            data: stats,
            cached: true,
            source: 'mock',
            timestamp: Date.now()
        });
    },

    // Chat con IA mock
    chatWithAI: function(message, context = {}) {
        // Validar y sanitizar el mensaje del usuario
        const messageValidation = XSSProtection.validateInput(message, {
            type: 'text',
            maxLength: 5000,
            allowEmpty: false
        });
        
        if (!messageValidation.valid) {
            return Promise.resolve({
                data: {
                    message: 'Lo siento, su mensaje contiene contenido no permitido. Por favor, reformule su consulta.',
                    context: {},
                    timestamp: Date.now(),
                    degraded_mode: true,
                    error: true
                },
                cached: true,
                source: 'mock',
                timestamp: Date.now()
            });
        }
        
        // Validar y sanitizar el contexto
        const sanitizedContext = this.sanitizeContext(context);
        
        const responses = [
            'Entiendo su consulta. En modo degradado, mi capacidad de análisis está limitada. Cuando se restaure la conexión, podré proporcionar respuestas más completas.',
            'He recibido su mensaje. Actualmente estoy funcionando con capacidades reducidas. Su consulta será procesada completamente cuando la conexión se restaure.',
            'Gracias por su pregunta. En modo degradado, puedo ofrecer respuestas básicas. Para análisis avanzados, espere a que se restaure la conexión.',
            'Su consulta ha sido registrada. En modo normal, podría realizar un análisis completo de su caso legal.'
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        // Simular delay de procesamiento
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    data: {
                        message: randomResponse,
                        context: sanitizedContext,
                        timestamp: Date.now(),
                        degraded_mode: true
                    },
                    cached: true,
                    source: 'mock',
                    timestamp: Date.now()
                });
            }, 1000 + Math.random() * 2000);
        });
    },

    // Generar casos mock
    generateCases: function(count) {
        const caseTypes = ['Laboral', 'Civil', 'Familiar', 'Penal', 'Administrativo'];
        const statuses = ['active', 'pending', 'closed', 'archived'];
        const clients = [
            'Juan Pérez', 'María García', 'Carlos Rodríguez', 'Ana Martínez',
            'Luis Sánchez', 'Carmen López', 'José González', 'Patricia Díaz'
        ];
        
        const cases = [];
        for (let i = 1; i <= count; i++) {
            const type = caseTypes[Math.floor(Math.random() * caseTypes.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const client = clients[Math.floor(Math.random() * clients.length)];
            
            // Generar datos del caso con sanitización
            const caseTitle = this.getRandomCaseTitle(type);
            const caseDescription = this.getRandomCaseDescription(type);
            
            cases.push({
                id: i,
                title: `Caso ${XSSProtection.escapeHtml(type)} - ${XSSProtection.escapeHtml(caseTitle)}`,
                type: XSSProtection.escapeHtml(type),
                status: XSSProtection.escapeHtml(status),
                client: XSSProtection.escapeHtml(client),
                description: XSSProtection.escapeHtml(caseDescription),
                priority: XSSProtection.escapeHtml(this.getRandomPriority()),
                value: Math.floor(Math.random() * 100000) + 10000,
                created_at: this.getRandomDate(-30, -1),
                updated_at: this.getRandomDate(-7, 0),
                next_hearing: status === 'active' ? this.getRandomDate(1, 30) : null,
                documents_count: Math.floor(Math.random() * 20) + 1
            });
        }
        
        return cases;
    },

    // Generar documentos mock
    generateDocuments: function(count) {
        const documentTypes = ['PDF', 'DOCX', 'DOC', 'XLSX', 'PPTX', 'TXT'];
        const documentTitles = [
            'Demanda', 'Contrato', 'Escritura', 'Testimonio', 'Informe Pericial',
            'Acta', 'Resolución', 'Sentencia', 'Recurso', 'Escrito'
        ];
        
        const documents = [];
        for (let i = 1; i <= count; i++) {
            const type = documentTypes[Math.floor(Math.random() * documentTypes.length)];
            const title = documentTitles[Math.floor(Math.random() * documentTitles.length)];
            
            // Generar datos del documento con sanitización
            const tags = this.getRandomTags();
            const sanitizedTags = tags.map(tag => XSSProtection.escapeHtml(tag));
            
            documents.push({
                id: i,
                title: `${XSSProtection.escapeHtml(title)} ${i}`,
                type: XSSProtection.escapeHtml(type),
                size: Math.floor(Math.random() * 5000000) + 100000,
                status: XSSProtection.escapeHtml(this.getRandomDocumentStatus()),
                created_at: this.getRandomDate(-30, -1),
                updated_at: this.getRandomDate(-7, 0),
                case_id: Math.floor(Math.random() * 50) + 1,
                tags: sanitizedTags,
                encrypted: Math.random() > 0.7
            });
        }
        
        return documents;
    },

    // Generar estadísticas mock
    generateStatistics: function() {
        return [
            {
                label: XSSProtection.escapeHtml('Casos Activos'),
                value: Math.floor(Math.random() * 50) + 20,
                icon: XSSProtection.escapeHtml('fas fa-briefcase'),
                trend: Math.random() > 0.5 ? 'up' : 'down',
                trend_value: XSSProtection.escapeHtml(Math.floor(Math.random() * 20) + 1 + '%')
            },
            {
                label: XSSProtection.escapeHtml('Documentos'),
                value: Math.floor(Math.random() * 500) + 100,
                icon: XSSProtection.escapeHtml('fas fa-file-alt'),
                trend: Math.random() > 0.5 ? 'up' : 'down',
                trend_value: XSSProtection.escapeHtml(Math.floor(Math.random() * 15) + 1 + '%')
            },
            {
                label: XSSProtection.escapeHtml('Clientes'),
                value: Math.floor(Math.random() * 100) + 50,
                icon: XSSProtection.escapeHtml('fas fa-users'),
                trend: Math.random() > 0.5 ? 'up' : 'down',
                trend_value: XSSProtection.escapeHtml(Math.floor(Math.random() * 10) + 1 + '%')
            },
            {
                label: XSSProtection.escapeHtml('Audiencias'),
                value: Math.floor(Math.random() * 20) + 5,
                icon: XSSProtection.escapeHtml('fas fa-calendar-alt'),
                trend: Math.random() > 0.5 ? 'up' : 'down',
                trend_value: XSSProtection.escapeHtml(Math.floor(Math.random() * 25) + 1 + '%')
            }
        ];
    },

    // Utilidades
    getRandomCaseTitle: function(type) {
        const titles = {
            'Laboral': ['Despido Improcedente', 'Accidente Laboral', 'Mobbing', 'Salarios Pendientes'],
            'Civil': ['Incumplimiento Contractual', 'Daños y Perjuicios', 'Responsabilidad Civil', 'Cobro de Deuda'],
            'Familiar': ['Divorcio', 'Custodia Compartida', 'Pensión Alimenticia', 'Régimen de Visitas'],
            'Penal': ['Hurto', 'Estafa', 'Agresión', 'Calumnias'],
            'Administrativo': ['Recurso Administrativo', 'Contencioso Administrativo', 'Sanción', 'Licencia']
        };
        
        const typeTitles = titles[type] || ['Caso General'];
        return typeTitles[Math.floor(Math.random() * typeTitles.length)];
    },

    getRandomCaseDescription: function(type) {
        const descriptions = {
            'Laboral': 'Despido sin justa causa en empresa tecnológica',
            'Civil': 'Incumplimiento de términos contractuales establecidos',
            'Familiar': 'Modificación de medidas de custodia y régimen de visitas',
            'Penal': 'Denuncia por presunto delito contra la propiedad',
            'Administrativo': 'Recurso contra resolución administrativa desfavorable'
        };
        
        return descriptions[type] || 'Caso legal requiriendo representación especializada';
    },

    getRandomPriority: function() {
        const priorities = ['low', 'medium', 'high', 'urgent'];
        return priorities[Math.floor(Math.random() * priorities.length)];
    },

    getRandomDocumentStatus: function() {
        const statuses = ['draft', 'processing', 'completed', 'archived'];
        return statuses[Math.floor(Math.random() * statuses.length)];
    },

    getRandomTags: function() {
        const allTags = ['importante', 'urgente', 'confidencial', 'borrador', 'firmado', 'pendiente'];
        const numTags = Math.floor(Math.random() * 3) + 1;
        const tags = [];
        
        for (let i = 0; i < numTags; i++) {
            const tag = allTags[Math.floor(Math.random() * allTags.length)];
            if (!tags.includes(tag)) {
                tags.push(tag);
            }
        }
        
        return tags;
    },

    getFileType: function(filename) {
        const extension = filename.split('.').pop().toUpperCase();
        return ['PDF', 'DOCX', 'DOC', 'XLSX', 'PPTX', 'TXT'].includes(extension) ? extension : 'PDF';
    },

    getRandomDate: function(daysAgoMin, daysAgoMax) {
        const now = new Date();
        const minDate = new Date(now.getTime() + (daysAgoMin * 24 * 60 * 60 * 1000));
        const maxDate = new Date(now.getTime() + (daysAgoMax * 24 * 60 * 60 * 1000));
        
        const randomTime = minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime());
        return new Date(randomTime).toISOString();
    },

    // Cache management
    loadCache: function() {
        try {
            const cached = localStorage.getItem(this.config.storageKey);
            if (cached) {
                this.state.cache = JSON.parse(cached);
                this.log('Cache de datos mock cargado');
            }
        } catch (error) {
            this.log('Error cargando cache:', error);
        }
    },

    saveCache: function() {
        try {
            localStorage.setItem(this.config.storageKey, JSON.stringify(this.state.cache));
            this.log('Cache de datos mock guardado');
        } catch (error) {
            this.log('Error guardando cache:', error);
        }
    },

    clearCache: function() {
        try {
            localStorage.removeItem(this.config.storageKey);
            this.state.cache = {};
            this.log('Cache de datos mock limpiado');
        } catch (error) {
            this.log('Error limpiando cache:', error);
        }
    },

    // Sanitizar datos de caso
    sanitizeCaseData: function(caseData) {
        if (!caseData || typeof caseData !== 'object') {
            return {};
        }
        
        const sanitized = {};
        
        // Sanitizar cada campo del caso
        if (caseData.title) {
            const titleValidation = XSSProtection.validateInput(caseData.title, {
                type: 'text',
                maxLength: 200,
                allowEmpty: true
            });
            sanitized.title = titleValidation.valid ? titleValidation.sanitized : '';
        }
        
        if (caseData.description) {
            const descValidation = XSSProtection.validateInput(caseData.description, {
                type: 'text',
                maxLength: 2000,
                allowEmpty: true
            });
            sanitized.description = descValidation.valid ? descValidation.sanitized : '';
        }
        
        if (caseData.client) {
            const clientValidation = XSSProtection.validateInput(caseData.client, {
                type: 'text',
                maxLength: 100,
                allowEmpty: true
            });
            sanitized.client = clientValidation.valid ? clientValidation.sanitized : '';
        }
        
        if (caseData.type) {
            const typeValidation = XSSProtection.validateInput(caseData.type, {
                type: 'text',
                maxLength: 50,
                allowEmpty: true
            });
            sanitized.type = typeValidation.valid ? typeValidation.sanitized : '';
        }
        
        if (caseData.priority) {
            const priorityValidation = XSSProtection.validateInput(caseData.priority, {
                type: 'text',
                maxLength: 20,
                allowEmpty: true
            });
            sanitized.priority = priorityValidation.valid ? priorityValidation.sanitized : 'medium';
        }
        
        // Copiar campos seguros sin sanitización
        ['status', 'value', 'created_at', 'updated_at', 'next_hearing', 'documents_count'].forEach(field => {
            if (caseData[field] !== undefined) {
                sanitized[field] = caseData[field];
            }
        });
        
        return sanitized;
    },
    
    // Sanitizar metadatos de documento
    sanitizeDocumentMetadata: function(metadata) {
        if (!metadata || typeof metadata !== 'object') {
            return {};
        }
        
        const sanitized = {};
        
        // Sanitizar título del documento
        if (metadata.title) {
            const titleValidation = XSSProtection.validateInput(metadata.title, {
                type: 'text',
                maxLength: 200,
                allowEmpty: true
            });
            sanitized.title = titleValidation.valid ? titleValidation.sanitized : '';
        }
        
        // Sanitizar tags si existen
        if (metadata.tags && Array.isArray(metadata.tags)) {
            sanitized.tags = metadata.tags.map(tag => {
                const tagValidation = XSSProtection.validateInput(tag, {
                    type: 'text',
                    maxLength: 50,
                    allowEmpty: true
                });
                return tagValidation.valid ? tagValidation.sanitized : '';
            }).filter(tag => tag.length > 0);
        }
        
        // Copiar campos seguros sin sanitización
        ['type', 'size', 'status', 'created_at', 'updated_at', 'case_id', 'encrypted'].forEach(field => {
            if (metadata[field] !== undefined) {
                sanitized[field] = metadata[field];
            }
        });
        
        return sanitized;
    },
    
    // Sanitizar nombre de archivo
    sanitizeFileName: function(filename) {
        if (!filename || typeof filename !== 'string') {
            return 'documento.pdf';
        }
        
        const validation = XSSProtection.validateInput(filename, {
            type: 'filename',
            maxLength: 255,
            allowEmpty: true
        });
        
        return validation.valid ? validation.sanitized : 'documento.pdf';
    },
    
    // Sanitizar contexto del chat
    sanitizeContext: function(context) {
        if (!context || typeof context !== 'object') {
            return {};
        }
        
        const sanitized = {};
        
        Object.keys(context).forEach(key => {
            if (typeof context[key] === 'string') {
                const validation = XSSProtection.validateInput(context[key], {
                    type: 'text',
                    maxLength: 500,
                    allowEmpty: true
                });
                sanitized[key] = validation.valid ? validation.sanitized : '';
            } else {
                sanitized[key] = context[key];
            }
        });
        
        return sanitized;
    },
    
    // Logging
    log: function(...args) {
        console.log('[Justice2MockData]', ...args);
    }
};

// Inicializar datos mock
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Justice2MockData.init();
    });
} else {
    Justice2MockData.init();
}

// Exportar para uso global
window.Justice2MockData = Justice2MockData;