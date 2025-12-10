/**
 * Justice 2 Modal System
 * Sistema de modales y diálogos modular y reutilizable
 */

// Importar sistema de renderizado optimizado
import OptimizedRenderer from './optimized-renderer.js';
import SmartComponent from './smart-component.js';
import LazyRenderer from './lazy-renderer.js';

const Justice2Modal = {
    // Configuración
    config: {
        animationDuration: 300,
        closeOnEscape: true,
        closeOnOverlay: true,
        maxModals: 5,
        zIndexBase: 10000
    },
    
    // Modales activos
    activeModals: new Map(),
    
    // Contador para IDs únicos
    modalCounter: 0,
    
    // Sistema de renderizado optimizado
    optimizedRenderer: null,
    smartComponent: null,
    lazyRenderer: null,
    renderSystemInitialized: false,
    
    // Inicializar sistema
    init: function() {
        // Inicializar sistema de renderizado optimizado primero
        this.initializeRenderSystem();
        
        this.createModalOverlay();
        this.createModalStyles();
        this.bindEvents();
    },
    
    // Inicializar sistema de renderizado optimizado
    initializeRenderSystem: function() {
        try {
            this.log('Inicializando sistema de renderizado optimizado para modales...');
            
            // Usar el sistema global si está disponible
            if (window.Justice2 && window.Justice2.state && window.Justice2.state.renderSystemInitialized) {
                this.optimizedRenderer = window.Justice2.state.optimizedRenderer;
                this.smartComponent = window.Justice2.state.smartComponent;
                this.lazyRenderer = window.Justice2.state.lazyRenderer;
                this.renderSystemInitialized = true;
                this.log('Sistema de renderizado optimizado conectado al sistema global');
                return;
            }
            
            // Inicializar sistemas locales si el global no está disponible
            if (typeof OptimizedRenderer !== 'undefined') {
                this.optimizedRenderer = new OptimizedRenderer({
                    enableVirtualDOM: true,
                    enableMemoization: true,
                    enableBatching: true,
                    enableLazyLoading: false, // Los modales no deben ser lazy
                    enableSmartComponents: true
                });
                
                this.log('OptimizedRenderer local inicializado para modales');
            }
            
            if (typeof SmartComponent !== 'undefined') {
                this.smartComponent = new SmartComponent({
                    enableAutoOptimization: true,
                    enableErrorBoundaries: true,
                    enableLifecycleHooks: true
                });
                
                this.log('SmartComponent local inicializado para modales');
            }
            
            this.renderSystemInitialized = true;
            this.log('Sistema de renderizado optimizado para modales inicializado correctamente');
            
        } catch (error) {
            this.log('Error inicializando sistema de renderizado optimizado para modales:', error);
            // Continuar sin renderizado optimizado en caso de error
        }
    },
    
    // Crear overlay para modales
    createModalOverlay: function() {
        if (document.getElementById('modal-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.style.display = 'none';
        
        document.body.appendChild(overlay);
    },
    
    // Crear estilos CSS
    createModalStyles: function() {
        if (document.getElementById('modal-system-styles')) return;
        
        const styles = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            
            .modal {
                background: white;
                border-radius: 8px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                max-width: 90%;
                max-height: 90vh;
                overflow: hidden;
                transform: scale(0.7);
                opacity: 0;
                transition: all 0.3s ease;
                position: relative;
                z-index: 10000;
            }
            
            .modal.active {
                transform: scale(1);
                opacity: 1;
            }
            
            .modal-sm { max-width: 400px; }
            .modal-md { max-width: 600px; }
            .modal-lg { max-width: 800px; }
            .modal-xl { max-width: 1200px; }
            .modal-fullscreen { max-width: 95vw; max-height: 95vh; }
            
            .modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #B49C73, #37373F);
                color: white;
            }
            
            .modal-title {
                font-size: 18px;
                font-weight: 600;
                margin: 0;
                flex: 1;
            }
            
            .modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s ease;
            }
            
            .modal-close:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }
            
            .modal-body {
                padding: 24px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .modal-footer {
                padding: 16px 24px;
                border-top: 1px solid #e9ecef;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                background-color: #f8f9fa;
            }
            
            .modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 9998;
            }
            
            /* Confirm Dialog */
            .confirm-dialog .modal-body {
                text-align: center;
                padding: 32px 24px;
            }
            
            .confirm-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
            
            .confirm-icon.warning { color: #ffc107; }
            .confirm-icon.danger { color: #dc3545; }
            .confirm-icon.info { color: #17a2b8; }
            .confirm-icon.success { color: #28a745; }
            
            .confirm-message {
                font-size: 16px;
                color: #37373F;
                margin-bottom: 8px;
            }
            
            .confirm-details {
                font-size: 14px;
                color: #6c757d;
            }
            
            /* Alert Dialog */
            .alert-dialog .modal-body {
                padding: 24px;
            }
            
            .alert-icon {
                text-align: center;
                font-size: 36px;
                margin-bottom: 16px;
            }
            
            .alert-content {
                text-align: center;
            }
            
            .alert-title {
                font-size: 18px;
                font-weight: 600;
                color: #37373F;
                margin-bottom: 8px;
            }
            
            .alert-message {
                font-size: 14px;
                color: #6c757d;
            }
            
            /* Form Dialog */
            .form-dialog .modal-body {
                padding: 24px;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-label {
                display: block;
                font-weight: 500;
                color: #37373F;
                margin-bottom: 8px;
            }
            
            .form-control {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
                transition: border-color 0.2s ease;
            }
            
            .form-control:focus {
                outline: none;
                border-color: #B49C73;
                box-shadow: 0 0 0 3px rgba(180, 156, 115, 0.1);
            }
            
            .form-text {
                font-size: 12px;
                color: #6c757d;
                margin-top: 4px;
            }
            
            .form-error {
                font-size: 12px;
                color: #dc3545;
                margin-top: 4px;
            }
            
            /* Loading Dialog */
            .loading-dialog .modal-body {
                text-align: center;
                padding: 40px 24px;
            }
            
            .loading-spinner {
                margin-bottom: 20px;
            }
            
            .loading-text {
                font-size: 16px;
                color: #37373F;
            }
            
            /* Image Dialog */
            .image-dialog .modal-body {
                padding: 0;
                text-align: center;
            }
            
            .image-dialog img {
                max-width: 100%;
                max-height: 70vh;
                object-fit: contain;
            }
            
            /* Video Dialog */
            .video-dialog .modal-body {
                padding: 0;
            }
            
            .video-dialog video,
            .video-dialog iframe {
                width: 100%;
                height: 400px;
                border: none;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .modal {
                    max-width: 95%;
                    margin: 20px;
                }
                
                .modal-header,
                .modal-body,
                .modal-footer {
                    padding: 16px;
                }
                
                .modal-footer {
                    flex-direction: column;
                }
                
                .modal-footer button {
                    width: 100%;
                }
            }
            
            /* Animations */
            .modal-slide-in {
                animation: modalSlideIn 0.3s ease-out;
            }
            
            .modal-slide-out {
                animation: modalSlideOut 0.3s ease-in;
            }
            
            @keyframes modalSlideIn {
                from {
                    transform: translateY(-50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            @keyframes modalSlideOut {
                from {
                    transform: translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateY(-50px);
                    opacity: 0;
                }
            }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.id = 'modal-system-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    },
    
    // Crear modal básico
    create: function(options = {}) {
        const config = {
            title: 'Modal',
            content: '',
            size: 'md',
            showClose: true,
            closeOnEscape: this.config.closeOnEscape,
            closeOnOverlay: this.config.closeOnOverlay,
            backdrop: true,
            keyboard: true,
            showFooter: false,
            footerButtons: [],
            onShow: null,
            onHide: null,
            onConfirm: null,
            onCancel: null,
            ...options
        };
        
        const modalId = this.generateId();
        
        // Usar sistema de renderizado optimizado si está disponible
        if (this.renderSystemInitialized && this.optimizedRenderer) {
            return this.createModalOptimized(modalId, config);
        }
        
        // Fallback al método original
        return this.createModalLegacy(modalId, config);
    },
    
    // Crear modal optimizado
    createModalOptimized: function(modalId, config) {
        const modalComponent = {
            id: modalId,
            type: 'modal',
            props: config,
            render: function(props) {
                const children = [
                    {
                        tag: 'div',
                        attributes: {
                            class: 'modal-header'
                        },
                        children: [
                            {
                                tag: 'h3',
                                attributes: {
                                    class: 'modal-title'
                                },
                                children: [XSSProtection.escapeHtml(props.title)]
                            },
                            props.showClose ? {
                                tag: 'button',
                                attributes: {
                                    class: 'modal-close'
                                },
                                children: ['×']
                            } : null
                        ].filter(Boolean)
                    },
                    {
                        tag: 'div',
                        attributes: {
                            class: 'modal-body'
                        },
                        children: props.content ? [{
                            tag: 'div',
                            attributes: {
                                innerHTML: props.content // Usar innerHTML para contenido complejo
                            }
                        }] : []
                    }
                ];
                
                // Agregar footer si es necesario
                if (props.showFooter) {
                    children.push({
                        tag: 'div',
                        attributes: {
                            class: 'modal-footer',
                            innerHTML: Justice2Modal.createFooter(props.footerButtons)
                        }
                    });
                }
                
                return {
                    tag: 'div',
                    attributes: {
                        class: `modal modal-${props.size}`,
                        id: modalId
                    },
                    children: children
                };
            }
        };
        
        // Renderizar usando el sistema optimizado
        const modalElement = this.optimizedRenderer.render(modalComponent);
        document.body.appendChild(modalElement);
        
        // Crear objeto de control
        const modalInstance = {
            id: modalId,
            element: modalElement,
            config: config,
            show: () => this.showModal(modalId),
            hide: () => this.hideModal(modalId),
            destroy: () => this.destroyModal(modalId),
            updateContent: (content) => this.updateModalContent(modalId, content),
            updateTitle: (title) => this.updateModalTitle(modalId, title)
        };
        
        // Guardar en mapa de modales activos
        this.activeModals.set(modalId, modalInstance);
        
        // Bind eventos
        this.bindModalEvents(modalId);
        
        return modalInstance;
    },
    
    // Crear modal legacy (fallback)
    createModalLegacy: function(modalId, config) {
        // Crear estructura del modal
        const modal = document.createElement('div');
        modal.className = `modal modal-${config.size}`;
        modal.id = modalId;
        
        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${config.title}</h3>
                ${config.showClose ? '<button class="modal-close">&times;</button>' : ''}
            </div>
            <div class="modal-body">
                ${config.content}
            </div>
            ${config.showFooter ? this.createFooter(config.footerButtons) : ''}
        `;
        
        // Agregar al DOM
        document.body.appendChild(modal);
        
        // Crear objeto de control
        const modalInstance = {
            id: modalId,
            element: modal,
            config: config,
            show: () => this.showModal(modalId),
            hide: () => this.hideModal(modalId),
            destroy: () => this.destroyModal(modalId),
            updateContent: (content) => this.updateModalContent(modalId, content),
            updateTitle: (title) => this.updateModalTitle(modalId, title)
        };
        
        // Guardar en mapa de modales activos
        this.activeModals.set(modalId, modalInstance);
        
        // Bind eventos
        this.bindModalEvents(modalId);
        
        return modalInstance;
    },
    
    // Crear footer del modal
    createFooter: function(buttons) {
        const defaultButtons = [
            {
                text: 'Cancelar',
                class: 'btn btn-secondary',
                action: 'cancel'
            },
            {
                text: 'Confirmar',
                class: 'btn btn-primary',
                action: 'confirm'
            }
        ];
        
        const footerButtons = buttons.length > 0 ? buttons : defaultButtons;
        
        const buttonsHtml = footerButtons.map(btn => `
            <button class="${btn.class}" data-action="${btn.action}">
                ${btn.text}
            </button>
        `).join('');
        
        return `<div class="modal-footer">${buttonsHtml}</div>`;
    },
    
    // Mostrar modal
    showModal: function(modalId) {
        const modalInstance = this.activeModals.get(modalId);
        if (!modalInstance) return;
        
        const overlay = document.getElementById('modal-overlay');
        const modal = modalInstance.element;
        
        // Mostrar overlay
        overlay.style.display = 'flex';
        
        // Actualizar z-index
        const zIndex = this.config.zIndexBase + this.activeModals.size;
        modal.style.zIndex = zIndex + 1;
        overlay.style.zIndex = zIndex;
        
        // Animar entrada
        setTimeout(() => {
            overlay.classList.add('active');
            modal.classList.add('active');
        }, 10);
        
        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';
        
        // Ejecutar callback onShow
        if (modalInstance.config.onShow) {
            modalInstance.config.onShow(modalInstance);
        }
    },
    
    // Ocultar modal
    hideModal: function(modalId) {
        const modalInstance = this.activeModals.get(modalId);
        if (!modalInstance) return;
        
        const overlay = document.getElementById('modal-overlay');
        const modal = modalInstance.element;
        
        // Animar salida
        overlay.classList.remove('active');
        modal.classList.remove('active');
        
        // Ocultar overlay después de animación
        setTimeout(() => {
            if (this.activeModals.size <= 1) {
                overlay.style.display = 'none';
                document.body.style.overflow = '';
            }
        }, this.config.animationDuration);
        
        // Ejecutar callback onHide
        if (modalInstance.config.onHide) {
            modalInstance.config.onHide(modalInstance);
        }
    },
    
    // Destruir modal
    destroyModal: function(modalId) {
        const modalInstance = this.activeModals.get(modalId);
        if (!modalInstance) return;
        
        this.hideModal(modalId);
        
        setTimeout(() => {
            modalInstance.element.remove();
            this.activeModals.delete(modalId);
        }, this.config.animationDuration);
    },
    
    // Actualizar contenido del modal
    updateModalContent: function(modalId, content) {
        const modalInstance = this.activeModals.get(modalId);
        if (!modalInstance) return;
        
        const body = modalInstance.element.querySelector('.modal-body');
        if (body) {
            body.innerHTML = content;
        }
    },
    
    // Actualizar título del modal
    updateModalTitle: function(modalId, title) {
        const modalInstance = this.activeModals.get(modalId);
        if (!modalInstance) return;
        
        const titleElement = modalInstance.element.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    },
    
    // Bind eventos del modal
    bindModalEvents: function(modalId) {
        const modalInstance = this.activeModals.get(modalId);
        if (!modalInstance) return;
        
        const modal = modalInstance.element;
        
        // Botón de cerrar
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideModal(modalId);
            });
        }
        
        // Botones del footer
        const footerButtons = modal.querySelectorAll('.modal-footer button');
        footerButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                this.handleFooterAction(modalId, action);
            });
        });
        
        // Cerrar con escape
        if (modalInstance.config.closeOnEscape) {
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    this.hideModal(modalId);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        }
        
        // Cerrar al hacer clic en overlay
        if (modalInstance.config.closeOnOverlay) {
            const overlay = document.getElementById('modal-overlay');
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideModal(modalId);
                }
            });
        }
    },
    
    // Manejar acciones del footer
    handleFooterAction: function(modalId, action) {
        const modalInstance = this.activeModals.get(modalId);
        if (!modalInstance) return;
        
        switch (action) {
            case 'confirm':
                if (modalInstance.config.onConfirm) {
                    const result = modalInstance.config.onConfirm(modalInstance);
                    if (result !== false) {
                        this.hideModal(modalId);
                    }
                } else {
                    this.hideModal(modalId);
                }
                break;
                
            case 'cancel':
                if (modalInstance.config.onCancel) {
                    modalInstance.config.onCancel(modalInstance);
                }
                this.hideModal(modalId);
                break;
                
            default:
                // Acción personalizada
                if (modalInstance.config[action]) {
                    modalInstance.config[action](modalInstance);
                }
                break;
        }
    },
    
    // Modal de confirmación
    confirm: function(options = {}) {
        const config = {
            title: 'Confirmar',
            message: '¿Está seguro de realizar esta acción?',
            details: '',
            type: 'warning',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            confirmClass: 'btn btn-primary',
            cancelClass: 'btn btn-secondary',
            ...options
        };
        
        const iconTypes = {
            warning: 'fas fa-exclamation-triangle',
            danger: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle'
        };
        
        const content = `
            <div class="confirm-dialog">
                <div class="confirm-icon ${config.type}">
                    <i class="${iconTypes[config.type]}"></i>
                </div>
                <div class="confirm-message">${config.message}</div>
                ${config.details ? `<div class="confirm-details">${config.details}</div>` : ''}
            </div>
        `;
        
        const footerButtons = [
            {
                text: config.cancelText,
                class: config.cancelClass,
                action: 'cancel'
            },
            {
                text: config.confirmText,
                class: config.confirmClass,
                action: 'confirm'
            }
        ];
        
        return new Promise((resolve) => {
            const modal = this.create({
                title: config.title,
                content: content,
                size: 'sm',
                showFooter: true,
                footerButtons: footerButtons,
                onConfirm: () => {
                    resolve(true);
                    return true;
                },
                onCancel: () => {
                    resolve(false);
                }
            });
            
            modal.show();
        });
    },
    
    // Modal de alerta
    alert: function(options = {}) {
        const config = {
            title: 'Información',
            message: '',
            type: 'info',
            buttonText: 'Aceptar',
            buttonClass: 'btn btn-primary',
            ...options
        };
        
        const iconTypes = {
            warning: 'fas fa-exclamation-triangle',
            danger: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle'
        };
        
        const content = `
            <div class="alert-dialog">
                <div class="alert-icon ${config.type}">
                    <i class="${iconTypes[config.type]}"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-title">${config.title}</div>
                    <div class="alert-message">${config.message}</div>
                </div>
            </div>
        `;
        
        const footerButtons = [
            {
                text: config.buttonText,
                class: config.buttonClass,
                action: 'confirm'
            }
        ];
        
        return new Promise((resolve) => {
            const modal = this.create({
                title: '',
                content: content,
                size: 'sm',
                showFooter: true,
                footerButtons: footerButtons,
                onConfirm: () => {
                    resolve(true);
                    return true;
                }
            });
            
            modal.show();
        });
    },
    
    // Modal de formulario
    form: function(options = {}) {
        const config = {
            title: 'Formulario',
            fields: [],
            submitText: 'Enviar',
            cancelText: 'Cancelar',
            submitClass: 'btn btn-primary',
            cancelClass: 'btn btn-secondary',
            validation: null,
            ...options
        };
        
        const content = `
            <div class="form-dialog">
                <form id="modal-form-${this.modalCounter}">
                    ${this.generateFormFields(config.fields)}
                </form>
            </div>
        `;
        
        const footerButtons = [
            {
                text: config.cancelText,
                class: config.cancelClass,
                action: 'cancel'
            },
            {
                text: config.submitText,
                class: config.submitClass,
                action: 'submit'
            }
        ];
        
        return new Promise((resolve) => {
            const modal = this.create({
                title: config.title,
                content: content,
                size: 'md',
                showFooter: true,
                footerButtons: footerButtons,
                submit: (modalInstance) => {
                    const form = modalInstance.element.querySelector('form');
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());
                    
                    // Validación
                    if (config.validation) {
                        const validation = config.validation(data);
                        if (!validation.isValid) {
                            this.showFormErrors(form, validation.errors);
                            return false;
                        }
                    }
                    
                    resolve(data);
                    return true;
                },
                onCancel: () => {
                    resolve(null);
                }
            });
            
            modal.show();
        });
    },
    
    // Generar campos de formulario
    generateFormFields: function(fields) {
        return fields.map(field => {
            const fieldTypes = {
                text: this.createTextInput(field),
                email: this.createEmailInput(field),
                password: this.createPasswordInput(field),
                number: this.createNumberInput(field),
                textarea: this.createTextarea(field),
                select: this.createSelect(field),
                checkbox: this.createCheckbox(field),
                radio: this.createRadio(field)
            };
            
            return fieldTypes[field.type] || fieldTypes.text;
        }).join('');
    },
    
    // Crear input de texto
    createTextInput: function(field) {
        return `
            <div class="form-group">
                <label class="form-label" for="${field.id}">${field.label}</label>
                <input type="text" class="form-control" id="${field.id}" name="${field.name}" 
                       placeholder="${field.placeholder || ''}" value="${field.value || ''}"
                       ${field.required ? 'required' : ''}>
                ${field.help ? `<div class="form-text">${field.help}</div>` : ''}
                <div class="form-error" id="${field.id}-error"></div>
            </div>
        `;
    },
    
    // Crear input de email
    createEmailInput: function(field) {
        return `
            <div class="form-group">
                <label class="form-label" for="${field.id}">${field.label}</label>
                <input type="email" class="form-control" id="${field.id}" name="${field.name}" 
                       placeholder="${field.placeholder || ''}" value="${field.value || ''}"
                       ${field.required ? 'required' : ''}>
                ${field.help ? `<div class="form-text">${field.help}</div>` : ''}
                <div class="form-error" id="${field.id}-error"></div>
            </div>
        `;
    },
    
    // Crear input de contraseña
    createPasswordInput: function(field) {
        return `
            <div class="form-group">
                <label class="form-label" for="${field.id}">${field.label}</label>
                <input type="password" class="form-control" id="${field.id}" name="${field.name}" 
                       placeholder="${field.placeholder || ''}" value="${field.value || ''}"
                       ${field.required ? 'required' : ''}>
                ${field.help ? `<div class="form-text">${field.help}</div>` : ''}
                <div class="form-error" id="${field.id}-error"></div>
            </div>
        `;
    },
    
    // Crear input numérico
    createNumberInput: function(field) {
        return `
            <div class="form-group">
                <label class="form-label" for="${field.id}">${field.label}</label>
                <input type="number" class="form-control" id="${field.id}" name="${field.name}" 
                       placeholder="${field.placeholder || ''}" value="${field.value || ''}"
                       min="${field.min || ''}" max="${field.max || ''}" step="${field.step || ''}"
                       ${field.required ? 'required' : ''}>
                ${field.help ? `<div class="form-text">${field.help}</div>` : ''}
                <div class="form-error" id="${field.id}-error"></div>
            </div>
        `;
    },
    
    // Crear textarea
    createTextarea: function(field) {
        return `
            <div class="form-group">
                <label class="form-label" for="${field.id}">${field.label}</label>
                <textarea class="form-control" id="${field.id}" name="${field.name}" 
                          placeholder="${field.placeholder || ''}" rows="${field.rows || 4}"
                          ${field.required ? 'required' : ''}>${field.value || ''}</textarea>
                ${field.help ? `<div class="form-text">${field.help}</div>` : ''}
                <div class="form-error" id="${field.id}-error"></div>
            </div>
        `;
    },
    
    // Crear select
    createSelect: function(field) {
        const options = field.options.map(opt => 
            `<option value="${opt.value}" ${opt.selected ? 'selected' : ''}>${opt.label}</option>`
        ).join('');
        
        return `
            <div class="form-group">
                <label class="form-label" for="${field.id}">${field.label}</label>
                <select class="form-control" id="${field.id}" name="${field.name}" 
                        ${field.required ? 'required' : ''}>
                    ${field.placeholder ? `<option value="">${field.placeholder}</option>` : ''}
                    ${options}
                </select>
                ${field.help ? `<div class="form-text">${field.help}</div>` : ''}
                <div class="form-error" id="${field.id}-error"></div>
            </div>
        `;
    },
    
    // Crear checkbox
    createCheckbox: function(field) {
        return `
            <div class="form-group">
                <div class="form-check">
                    <input type="checkbox" class="form-check-input" id="${field.id}" name="${field.name}" 
                           value="${field.value || '1'}" ${field.checked ? 'checked' : ''}>
                    <label class="form-check-label" for="${field.id}">${field.label}</label>
                </div>
                ${field.help ? `<div class="form-text">${field.help}</div>` : ''}
                <div class="form-error" id="${field.id}-error"></div>
            </div>
        `;
    },
    
    // Crear radio buttons
    createRadio: function(field) {
        const radios = field.options.map(opt => `
            <div class="form-check">
                <input type="radio" class="form-check-input" id="${field.id}_${opt.value}" 
                       name="${field.name}" value="${opt.value}" ${opt.checked ? 'checked' : ''}>
                <label class="form-check-label" for="${field.id}_${opt.value}">${opt.label}</label>
            </div>
        `).join('');
        
        return `
            <div class="form-group">
                <label class="form-label">${field.label}</label>
                ${radios}
                ${field.help ? `<div class="form-text">${field.help}</div>` : ''}
                <div class="form-error" id="${field.id}-error"></div>
            </div>
        `;
    },
    
    // Mostrar errores de formulario
    showFormErrors: function(form, errors) {
        // Limpiar errores anteriores
        form.querySelectorAll('.form-error').forEach(error => {
            error.textContent = '';
        });
        
        // Mostrar nuevos errores
        Object.keys(errors).forEach(fieldName => {
            const errorElement = form.querySelector(`#${fieldName}-error`);
            if (errorElement) {
                errorElement.textContent = errors[fieldName];
            }
        });
    },
    
    // Modal de carga
    loading: function(options = {}) {
        const config = {
            title: 'Procesando',
            message: 'Por favor, espere...',
            showProgress: false,
            ...options
        };
        
        const content = `
            <div class="loading-dialog">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
                <div class="loading-text">${config.message}</div>
            </div>
        `;
        
        const modal = this.create({
            title: config.title,
            content: content,
            size: 'sm',
            showClose: false,
            closeOnEscape: false,
            closeOnOverlay: false
        });
        
        modal.show();
        
        return {
            updateMessage: (message) => {
                const textElement = modal.element.querySelector('.loading-text');
                if (textElement) {
                    textElement.textContent = message;
                }
            },
            close: () => {
                modal.hide();
                modal.destroy();
            }
        };
    },
    
    // Modal de imagen
    image: function(options = {}) {
        const config = {
            src: '',
            alt: 'Imagen',
            title: 'Imagen',
            ...options
        };
        
        const content = `
            <div class="image-dialog">
                <img src="${config.src}" alt="${config.alt}">
            </div>
        `;
        
        const modal = this.create({
            title: config.title,
            content: content,
            size: 'lg'
        });
        
        modal.show();
        
        return modal;
    },
    
    // Modal de video
    video: function(options = {}) {
        const config = {
            src: '',
            type: 'video', // 'video' o 'iframe'
            title: 'Video',
            ...options
        };
        
        let content = '';
        if (config.type === 'iframe') {
            content = `
                <div class="video-dialog">
                    <iframe src="${config.src}" allowfullscreen></iframe>
                </div>
            `;
        } else {
            content = `
                <div class="video-dialog">
                    <video controls>
                        <source src="${config.src}" type="video/mp4">
                        Tu navegador no soporta el elemento de video.
                    </video>
                </div>
            `;
        }
        
        const modal = this.create({
            title: config.title,
            content: content,
            size: 'lg'
        });
        
        modal.show();
        
        return modal;
    },
    
    // Generar ID único
    generateId: function() {
        this.modalCounter++;
        return 'modal_' + Date.now() + '_' + this.modalCounter;
    },
    
    // Bind eventos globales
    bindEvents: function() {
        // Eventos globales si se necesitan
    },
    
    // Logging
    log: function(...args) {
        if (window.Justice2 && window.Justice2.config && window.Justice2.config.debug) {
            console.log('[Justice2Modal]', ...args);
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    Justice2Modal.init();
});

// Exportar para uso global
window.Justice2Modal = Justice2Modal;