/**
 * Justice 2 AI Assistant
 * Funcionalidades del Asistente con Inteligencia Artificial
 */

// Importar sistema de protección XSS centralizado
// El sistema se carga automáticamente desde components/xss-protection.js

const AIAssistant = {
    // Configuración
    config: {
        maxMessages: 50,
        typingDelay: 1000,
        autoSave: true,
        voiceRecognition: true,
        supportedLanguages: ['es', 'en', 'fr', 'de', 'it'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        supportedFileTypes: ['pdf', 'doc', 'docx', 'txt']
    },
    
    // Estado
    state: {
        currentConversation: null,
        conversations: [],
        isTyping: false,
        isRecording: false,
        voiceRecognition: null,
        lastMessage: null,
        context: {}
    },
    
    // Inicialización
    init: function() {
        this.log('Inicializando Asistente IA');
        
        // Cargar conversaciones guardadas
        this.loadConversations();
        
        // Inicializar eventos
        this.initEvents();
        
        // Inicializar reconocimiento de voz
        this.initVoiceRecognition();
        
        // Cargar conversación actual o crear nueva
        this.loadCurrentConversation();
        
        // Mostrar conversaciones recientes
        this.displayRecentConversations();
        
        this.log('Asistente IA inicializado');
    },
    
    // Inicializar eventos
    initEvents: function() {
        // Eventos del chat
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-message');
        const clearChat = document.getElementById('clear-chat');
        const exportChat = document.getElementById('export-chat');
        const voiceInput = document.getElementById('voice-input');
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        if (clearChat) {
            clearChat.addEventListener('click', () => this.clearChat());
        }
        
        if (exportChat) {
            exportChat.addEventListener('click', () => this.exportChat());
        }
        
        if (voiceInput) {
            voiceInput.addEventListener('click', () => this.toggleVoiceRecording());
        }
        
        // Eventos de modales
        this.initModalEvents();
        
        // Eventos de autoguardado
        if (this.config.autoSave) {
            setInterval(() => this.saveConversation(), 30000); // Cada 30 segundos
        }
    },
    
    // Inicializar eventos de modales
    initModalEvents: function() {
        // Modal de análisis de documento
        const analyzeDocumentBtn = document.getElementById('analyze-document');
        const documentUpload = document.getElementById('document-upload');
        
        if (analyzeDocumentBtn) {
            analyzeDocumentBtn.addEventListener('click', () => this.analyzeDocument());
        }
        
        if (documentUpload) {
            documentUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        // Modal de investigación jurídica
        const startResearchBtn = document.getElementById('start-research');
        
        if (startResearchBtn) {
            startResearchBtn.addEventListener('click', () => this.startLegalResearch());
        }
        
        // Drag and drop para documentos
        this.initDragAndDrop();
    },
    
    // Inicializar reconocimiento de voz
    initVoiceRecognition: function() {
        if (!this.config.voiceRecognition || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            this.log('Reconocimiento de voz no disponible');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.state.voiceRecognition = new SpeechRecognition();
        
        this.state.voiceRecognition.continuous = false;
        this.state.voiceRecognition.interimResults = true;
        this.state.voiceRecognition.lang = 'es-ES';
        
        this.state.voiceRecognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.value = transcript;
            }
        };
        
        this.state.voiceRecognition.onerror = (event) => {
            this.log('Error en reconocimiento de voz:', event.error);
            this.stopVoiceRecording();
            Justice2.utils.showNotification('Error en reconocimiento de voz', 'error');
        };
        
        this.state.voiceRecognition.onend = () => {
            this.stopVoiceRecording();
        };
    },
    
    // Inicializar drag and drop
    initDragAndDrop: function() {
        const dropZone = document.getElementById('document-upload');
        if (!dropZone) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
        });
        
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload({ target: { files } });
            }
        }, false);
    },
    
    preventDefaults: function(e) {
        e.preventDefault();
        e.stopPropagation();
    },
    
    // Enviar mensaje
    sendMessage: async function() {
        const chatInput = document.getElementById('chat-input');
        let message = chatInput.value.trim();
        
        if (!message || this.state.isTyping) return;
        
        // Usar sistema XSSProtection centralizado para validar y sanitizar
        const validation = XSSProtection.validateInput(message, {
            type: 'text',
            maxLength: 10000,
            allowEmpty: false
        });
        
        if (!validation.valid) {
            Justice2?.utils?.showNotification('El mensaje contiene contenido no permitido', 'error');
            return;
        }
        
        message = validation.sanitized;
        
        if (!message) {
            Justice2?.utils?.showNotification('Por favor, ingrese un mensaje válido', 'warning');
            return;
        }
        
        // Agregar mensaje del usuario
        this.addMessage(message, 'user');
        
        // Limpiar input
        chatInput.value = '';
        
        // Mostrar indicador de escritura
        this.showTypingIndicator();
        
        try {
            // Enviar mensaje a la API
            const response = await Justice2API.chatWithAI(message, this.state.context);
            
            // Ocultar indicador de escritura
            this.hideTypingIndicator();
            
            // Agregar respuesta de la IA
            this.addMessage(response.data.message, 'ai');
            
            // Actualizar contexto
            this.updateContext(response.data.context);
            
            // Guardar conversación
            if (this.config.autoSave) {
                this.saveConversation();
            }
            
        } catch (error) {
            this.hideTypingIndicator();
            this.log('Error enviando mensaje:', error);
            
            // Mensaje de error
            this.addMessage('Lo siento, ha ocurrido un error. Por favor, inténtelo de nuevo.', 'ai', true);
        }
    },
    
    // Agregar mensaje al chat
    addMessage: function(content, sender, isError = false) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        // Usar sistema XSSProtection centralizado para validar y sanitizar
        const validation = XSSProtection.validateInput(content, {
            type: 'text',
            maxLength: 10000,
            allowEmpty: true
        });
        
        if (!validation.valid) {
            console.error('Intento de inyección de código detectado y bloqueado:', content);
            return;
        }
        
        const sanitizedContent = validation.sanitized;
        
        const messageDiv = XSSProtection.createElementSafe('div', {
            class: `chat-message ${sender}-message fade-in-up`
        });
        
        const avatar = sender === 'user' ?
            '<i class="fas fa-user"></i>' :
            '<i class="fas fa-robot"></i>';
        
        const errorClass = isError ? ' text-danger' : '';
        
        // Usar elementos seguros para el contenido
        const contentElement = XSSProtection.createElementSafe('p');
        contentElement.textContent = sanitizedContent;
        
        const timeElement = XSSProtection.createElementSafe('small', {
            class: 'text-muted'
        });
        timeElement.textContent = new Date().toLocaleTimeString('es-ES');
        
        const messageContent = XSSProtection.createElementSafe('div', {
            class: `message-content${errorClass}`
        });
        messageContent.appendChild(contentElement);
        messageContent.appendChild(timeElement);
        
        const avatarElement = XSSProtection.createElementSafe('div', {
            class: 'message-avatar'
        });
        XSSProtection.setInnerHTMLSafe(avatarElement, avatar);
        
        messageDiv.appendChild(avatarElement);
        messageDiv.appendChild(messageContent);
        
        messagesContainer.appendChild(messageDiv);
        
        // Scroll al final
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Guardar en conversación actual (con contenido sanitizado)
        if (this.state.currentConversation) {
            this.state.currentConversation.messages.push({
                content: sanitizedContent,
                sender,
                timestamp: new Date().toISOString(),
                isError
            });
        }
        
        this.state.lastMessage = { content: sanitizedContent, sender, timestamp: new Date() };
    },
    
    // Mostrar indicador de escritura
    showTypingIndicator: function() {
        this.state.isTyping = true;
        
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        XSSProtection.setInnerHTMLSafe(typingDiv, `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <small>El asistente está escribiendo</small>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `);
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    
    // Ocultar indicador de escritura
    hideTypingIndicator: function() {
        this.state.isTyping = false;
        
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    },
    
    // Limpiar chat
    clearChat: function() {
        if (!confirm('¿Está seguro de que desea limpiar la conversación actual?')) {
            return;
        }
        
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            XSSProtection.setInnerHTMLSafe(messagesContainer, '');
        }
        
        // Reiniciar conversación actual
        if (this.state.currentConversation) {
            this.state.currentConversation.messages = [];
            this.state.context = {};
        }
        
        // Agregar mensaje de bienvenida
        this.addMessage('Conversación limpiada. ¿En qué puedo ayudarle?', 'ai');
    },
    
    // Exportar chat
    exportChat: function() {
        if (!this.state.currentConversation || this.state.currentConversation.messages.length === 0) {
            Justice2.utils.showNotification('No hay mensajes para exportar', 'warning');
            return;
        }
        
        const conversation = this.state.currentConversation;
        const content = this.formatConversationForExport(conversation);
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation_${conversation.id}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        Justice2.utils.showNotification('Conversación exportada correctamente', 'success');
    },
    
    // Formatear conversación para exportación
    formatConversationForExport: function(conversation) {
        let content = `Conversación con Asistente IA - Justice 2\n`;
        content += `ID: ${conversation.id}\n`;
        content += `Fecha: ${new Date(conversation.created_at).toLocaleString('es-ES')}\n`;
        content += `Total de mensajes: ${conversation.messages.length}\n`;
        content += `${'='.repeat(50)}\n\n`;
        
        conversation.messages.forEach(msg => {
            const sender = msg.sender === 'user' ? 'Usuario' : 'Asistente IA';
            const time = new Date(msg.timestamp).toLocaleString('es-ES');
            content += `[${time}] ${sender}:\n`;
            content += `${msg.content}\n\n`;
        });
        
        return content;
    },
    
    // Toggle grabación de voz
    toggleVoiceRecording: function() {
        if (!this.state.voiceRecognition) {
            Justice2.utils.showNotification('Reconocimiento de voz no disponible', 'error');
            return;
        }
        
        if (this.state.isRecording) {
            this.stopVoiceRecording();
        } else {
            this.startVoiceRecording();
        }
    },
    
    // Iniciar grabación de voz
    startVoiceRecording: function() {
        if (!this.state.voiceRecognition) return;
        
        this.state.isRecording = true;
        const voiceBtn = document.getElementById('voice-input');
        
        if (voiceBtn) {
            voiceBtn.classList.add('voice-recording');
            XSSProtection.setInnerHTMLSafe(voiceBtn, '<i class="fas fa-stop mr-1"></i>Detener');
        }
        
        try {
            this.state.voiceRecognition.start();
        } catch (error) {
            this.log('Error iniciando reconocimiento de voz:', error);
            this.stopVoiceRecording();
        }
    },
    
    // Detener grabación de voz
    stopVoiceRecording: function() {
        if (!this.state.voiceRecognition) return;
        
        this.state.isRecording = false;
        const voiceBtn = document.getElementById('voice-input');
        
        if (voiceBtn) {
            voiceBtn.classList.remove('voice-recording');
            XSSProtection.setInnerHTMLSafe(voiceBtn, '<i class="fas fa-microphone mr-1"></i>Voz');
        }
        
        try {
            this.state.voiceRecognition.stop();
        } catch (error) {
            this.log('Error deteniendo reconocimiento de voz:', error);
        }
    },
    
    // Analizar documento
    analyzeDocument: function() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('documentAnalysisModal'));
        if (!modal) {
            const newModal = new bootstrap.Modal(document.getElementById('documentAnalysisModal'));
            newModal.show();
        } else {
            modal.show();
        }
    },
    
    // Manejar upload de archivo
    handleFileUpload: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validar archivo
        if (!this.validateFile(file)) {
            return;
        }
        
        // Mostrar loading
        const analyzeBtn = document.getElementById('analyze-document');
        const originalText = analyzeBtn.textContent;
        analyzeBtn.disabled = true;
        XSSProtection.setInnerHTMLSafe(analyzeBtn, '<i class="fas fa-spinner fa-spin mr-2"></i>Analizando...');
        
        // Subir y analizar archivo
        const formData = new FormData();
        formData.append('file', file);
        
        const analysisType = document.getElementById('analysis-type').value;
        formData.append('analysis_type', analysisType);
        
        Justice2API.uploadDocument(file, { analysis_type: analysisType })
            .then(response => {
                return Justice2API.analyzeDocument(response.data.id);
            })
            .then(response => {
                this.displayAnalysisResults(response.data);
            })
            .catch(error => {
                this.log('Error analizando documento:', error);
                Justice2.utils.showNotification('Error analizando documento', 'error');
            })
            .finally(() => {
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = originalText;
            });
    },
    
    // Validar archivo
    validateFile: function(file) {
        // Validar tamaño
        if (file.size > this.config.maxFileSize) {
            Justice2.utils.showNotification('El archivo es demasiado grande. Máximo 10MB.', 'error');
            return false;
        }
        
        // Validar tipo
        const extension = file.name.split('.').pop().toLowerCase();
        if (!this.config.supportedFileTypes.includes(extension)) {
            Justice2.utils.showNotification('Tipo de archivo no soportado.', 'error');
            return false;
        }
        
        return true;
    },
    
    // Mostrar resultados de análisis
    displayAnalysisResults: function(results) {
        const resultDiv = document.getElementById('analysis-result');
        const contentDiv = document.getElementById('analysis-content');
        
        if (!resultDiv || !contentDiv) return;
        
        let html = '';
        
        if (results.summary) {
            html += `<div class="analysis-section">
                <h6>Resumen</h6>
                <p>${results.summary}</p>
            </div>`;
        }
        
        if (results.risks && results.risks.length > 0) {
            html += `<div class="analysis-section">
                <h6>Riesgos Identificados</h6>`;
            results.risks.forEach(risk => {
                const riskClass = risk.level === 'high' ? 'risk-high' : 
                                risk.level === 'medium' ? 'risk-medium' : 'risk-low';
                html += `<div class="analysis-item">
                    <span class="analysis-label">${risk.description}</span>
                    <span class="analysis-value ${riskClass}">${risk.level}</span>
                </div>`;
            });
            html += `</div>`;
        }
        
        if (results.clauses && results.clauses.length > 0) {
            html += `<div class="analysis-section">
                <h6>Cláusulas Importantes</h6>`;
            results.clauses.forEach(clause => {
                html += `<div class="analysis-item">
                    <span class="analysis-label">${clause.type}</span>
                    <span class="analysis-value">${clause.status}</span>
                </div>`;
            });
            html += `</div>`;
        }
        
        XSSProtection.setInnerHTMLSafe(contentDiv, html);
        resultDiv.classList.remove('d-none');
    },
    
    // Investigación jurídica
    legalResearch: function() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('legalResearchModal'));
        if (!modal) {
            const newModal = new bootstrap.Modal(document.getElementById('legalResearchModal'));
            newModal.show();
        } else {
            modal.show();
        }
    },
    
    // Iniciar investigación jurídica
    startLegalResearch: function() {
        const queryElement = document.getElementById('research-query');
        const queryValidation = XSSProtection.validateInput(
            queryElement ? queryElement.value.trim() : '',
            { type: 'text', maxLength: 1000, allowEmpty: false }
        );
        
        if (!queryValidation.valid) {
            Justice2?.utils?.showNotification('Por favor, ingrese una consulta válida', 'warning');
            return;
        }
        
        const query = queryValidation.sanitized;
        
        const jurisdictionElement = document.getElementById('jurisdiction');
        const jurisdictionValidation = XSSProtection.validateInput(
            jurisdictionElement ? jurisdictionElement.value : 'es',
            { type: 'text', maxLength: 50, allowEmpty: true }
        );
        const jurisdiction = jurisdictionValidation.valid ? jurisdictionValidation.sanitized : 'es';
        
        const areaLawElement = document.getElementById('area-law');
        const areaLawValidation = XSSProtection.validateInput(
            areaLawElement ? areaLawElement.value : '',
            { type: 'text', maxLength: 100, allowEmpty: true }
        );
        const areaLaw = areaLawValidation.valid ? areaLawValidation.sanitized : '';
        
        // Mostrar loading
        const researchBtn = document.getElementById('start-research');
        const originalText = researchBtn.textContent;
        researchBtn.disabled = true;
        XSSProtection.setInnerHTMLSafe(researchBtn, '<i class="fas fa-spinner fa-spin mr-2"></i>Investigando...');
        
        // Realizar investigación
        Justice2API.legalResearch(query, jurisdiction)
            .then(response => {
                this.displayResearchResults(response.data);
            })
            .catch(error => {
                this.log('Error en investigación jurídica:', error);
                Justice2.utils.showNotification('Error en investigación jurídica', 'error');
            })
            .finally(() => {
                researchBtn.disabled = false;
                researchBtn.textContent = originalText;
            });
    },
    
    // Mostrar resultados de investigación
    displayResearchResults: function(results) {
        const resultDiv = document.getElementById('research-result');
        const contentDiv = document.getElementById('research-content');
        
        if (!resultDiv || !contentDiv) return;
        
        // Limpiar contenido previo de forma segura
        while (contentDiv.firstChild) {
            contentDiv.removeChild(contentDiv.firstChild);
        }
        
        if (results.articles && results.articles.length > 0) {
            results.articles.forEach(article => {
                // Crear elementos de forma segura para prevenir XSS
                const itemDiv = document.createElement('div');
                itemDiv.className = 'research-item';
                
                const titleDiv = XSSProtection.createElementSafe('div', {
                    class: 'research-title'
                });
                const titleValidation = XSSProtection.validateInput(article.title || '', {
                    type: 'text',
                    maxLength: 200,
                    allowEmpty: true
                });
                titleDiv.textContent = titleValidation.valid ? titleValidation.sanitized : '';
                
                const sourceDiv = XSSProtection.createElementSafe('div', {
                    class: 'research-source'
                });
                const sourceValidation = XSSProtection.validateInput(article.source || '', {
                    type: 'text',
                    maxLength: 100,
                    allowEmpty: true
                });
                const dateValidation = XSSProtection.validateInput(article.date || '', {
                    type: 'text',
                    maxLength: 50,
                    allowEmpty: true
                });
                sourceDiv.textContent = `${sourceValidation.valid ? sourceValidation.sanitized : ''} - ${dateValidation.valid ? dateValidation.sanitized : ''}`;
                
                const summaryDiv = XSSProtection.createElementSafe('div', {
                    class: 'research-summary'
                });
                const summaryValidation = XSSProtection.validateInput(article.summary || '', {
                    type: 'text',
                    maxLength: 500,
                    allowEmpty: true
                });
                summaryDiv.textContent = summaryValidation.valid ? summaryValidation.sanitized : '';
                
                const link = XSSProtection.createElementSafe('a', {
                    href: XSSProtection.sanitizeUrl(article.url || '#'),
                    target: '_blank',
                    class: 'research-link'
                });
                link.textContent = 'Leer más';
                
                itemDiv.appendChild(titleDiv);
                itemDiv.appendChild(sourceDiv);
                itemDiv.appendChild(summaryDiv);
                itemDiv.appendChild(link);
                
                contentDiv.appendChild(itemDiv);
            });
        } else {
            const noResultsP = document.createElement('p');
            noResultsP.textContent = 'No se encontraron resultados para esta consulta.';
            contentDiv.appendChild(noResultsP);
        }
        
        resultDiv.classList.remove('d-none');
    },
    
    // Redactar documento
    draftDocument: function() {
        this.addMessage('Puedo ayudarle a redactar documentos legales. Por favor, indíqueme:', 'ai');
        this.addMessage('1. Tipo de documento (contrato, demanda, etc.)\n2. Partes involucradas\n3. Términos principales\n4. Jurisdicción aplicable', 'ai');
    },
    
    // Análisis de caso
    caseAnalysis: function() {
        this.addMessage('Para analizar su caso, necesito la siguiente información:', 'ai');
        this.addMessage('1. Tipo de caso (civil, penal, laboral, etc.)\n2. Hechos principales\n3. Pretensiones\n4. Pruebas disponibles\n5. Jurisdicción', 'ai');
    },
    
    // Actualizar contexto
    updateContext: function(newContext) {
        this.state.context = { ...this.state.context, ...newContext };
    },
    
    // Cargar conversaciones
    loadConversations: function() {
        const saved = localStorage.getItem('ai_conversations');
        if (saved) {
            try {
                this.state.conversations = JSON.parse(saved);
            } catch (error) {
                this.log('Error cargando conversaciones:', error);
                this.state.conversations = [];
            }
        }
    },
    
    // Cargar conversación actual
    loadCurrentConversation: function() {
        const currentId = localStorage.getItem('ai_current_conversation');
        
        if (currentId) {
            this.state.currentConversation = this.state.conversations.find(c => c.id === currentId);
        }
        
        if (!this.state.currentConversation) {
            this.createNewConversation();
        } else {
            // Cargar mensajes existentes
            this.state.currentConversation.messages.forEach(msg => {
                this.addMessage(msg.content, msg.sender, msg.isError);
            });
        }
    },
    
    // Crear nueva conversación
    createNewConversation: function() {
        const conversation = {
            id: Justice2.utils.generateId(),
            title: 'Nueva Conversación',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            messages: []
        };
        
        this.state.conversations.unshift(conversation);
        this.state.currentConversation = conversation;
        
        // Agregar mensaje de bienvenida
        this.addMessage('¡Hola! Soy su asistente legal con inteligencia artificial. ¿En qué puedo ayudarle?', 'ai');
        
        this.saveConversations();
    },
    
    // Guardar conversaciones
    saveConversations: function() {
        localStorage.setItem('ai_conversations', JSON.stringify(this.state.conversations));
    },
    
    // Guardar conversación actual
    saveConversation: function() {
        if (!this.state.currentConversation) return;
        
        this.state.currentConversation.updated_at = new Date().toISOString();
        
        // Actualizar título si es necesario
        if (this.state.currentConversation.messages.length > 1 && 
            this.state.currentConversation.title === 'Nueva Conversación') {
            const firstUserMessage = this.state.currentConversation.messages.find(m => m.sender === 'user');
            if (firstUserMessage) {
                this.state.currentConversation.title = firstUserMessage.content.substring(0, 50) + '...';
            }
        }
        
        this.saveConversations();
        localStorage.setItem('ai_current_conversation', this.state.currentConversation.id);
    },
    
    // Mostrar conversaciones recientes
    displayRecentConversations: function() {
        const container = document.getElementById('recent-conversations');
        if (!container) return;
        
        const recentConversations = this.state.conversations.slice(0, 5);
        
        if (recentConversations.length === 0) {
            XSSProtection.setInnerHTMLSafe(container, '<p class="text-muted">No hay conversaciones recientes</p>');
            return;
        }
        
        let html = '';
        recentConversations.forEach(conv => {
            const lastMessage = conv.messages[conv.messages.length - 1];
            const preview = lastMessage ? 
                lastMessage.content.substring(0, 100) + '...' : 
                'Sin mensajes';
            
            html += `
                <div class="conversation-item" onclick="AIAssistant.loadConversation('${conv.id}')">
                    <div class="conversation-title">${conv.title}</div>
                    <div class="conversation-preview">${preview}</div>
                    <div class="conversation-date">${Justice2.utils.formatDate(conv.updated_at)}</div>
                </div>
            `;
        });
        
        XSSProtection.setInnerHTMLSafe(container, html);
    },
    
    // Cargar conversación específica
    loadConversation: function(conversationId) {
        const conversation = this.state.conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        
        // Guardar conversación actual
        this.saveConversation();
        
        // Cargar nueva conversación
        this.state.currentConversation = conversation;
        this.state.context = {};
        
        // Limpiar chat
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            XSSProtection.setInnerHTMLSafe(messagesContainer, '');
        }
        
        // Cargar mensajes
        conversation.messages.forEach(msg => {
            this.addMessage(msg.content, msg.sender, msg.isError);
        });
        
        // Actualizar conversaciones recientes
        this.displayRecentConversations();
        
        Justice2.utils.showNotification('Conversación cargada', 'success');
    },
    
    // Logging
    log: function(...args) {
        Justice2?.log('[AIAssistant]', ...args);
    }
};

// Inicializar Asistente IA
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AIAssistant.init();
    });
} else {
    AIAssistant.init();
}

// Exportar para uso global
window.AIAssistant = AIAssistant;