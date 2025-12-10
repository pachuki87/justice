/**
 * Justice 2 Notification System
 * Sistema de notificaciones modular y reutilizable
 */

// Importar sistema de protección XSS centralizado
import { XSSProtection } from './xss-protection.js';

const NotificationSystem = {
    // Configuración
    config: {
        position: 'top-right',
        duration: 5000,
        maxNotifications: 5,
        animationDuration: 300,
        types: {
            success: { icon: 'fas fa-check-circle', color: '#28a745' },
            error: { icon: 'fas fa-exclamation-circle', color: '#dc3545' },
            warning: { icon: 'fas fa-exclamation-triangle', color: '#ffc107' },
            info: { icon: 'fas fa-info-circle', color: '#17a2b8' }
        }
    },
    
    // Estado
    state: {
        notifications: [],
        container: null,
        isInitialized: false
    },
    
    // Inicialización
    init: function() {
        if (this.state.isInitialized) return;
        
        this.createContainer();
        this.setupStyles();
        this.state.isInitialized = true;
        
        this.log('Sistema de notificaciones inicializado');
    },
    
    // Crear contenedor
    createContainer: function() {
        // Eliminar contenedor existente si hay
        const existingContainer = document.getElementById('notification-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Crear nuevo contenedor
        this.state.container = document.createElement('div');
        this.state.container.id = 'notification-container';
        this.state.container.className = 'notification-system';
        document.body.appendChild(this.state.container);
    },
    
    // Configurar estilos
    setupStyles: function() {
        const style = document.createElement('style');
        style.textContent = `
            .notification-system {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
            }
            
            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 10px;
                padding: 15px;
                display: flex;
                align-items: flex-start;
                animation: slideInRight 0.3s ease-out;
                position: relative;
                overflow: hidden;
            }
            
            .notification.removing {
                animation: slideOutRight 0.3s ease-out;
            }
            
            .notification-icon {
                margin-right: 12px;
                font-size: 1.2rem;
                flex-shrink: 0;
                margin-top: 2px;
            }
            
            .notification-content {
                flex: 1;
                min-width: 0;
            }
            
            .notification-title {
                font-weight: 600;
                margin-bottom: 5px;
                color: #37373F;
            }
            
            .notification-message {
                color: #6c757d;
                line-height: 1.4;
                margin-bottom: 8px;
            }
            
            .notification-actions {
                display: flex;
                gap: 8px;
                margin-top: 10px;
            }
            
            .notification-btn {
                padding: 4px 8px;
                border: none;
                border-radius: 4px;
                font-size: 0.75rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .notification-btn:hover {
                transform: translateY(-1px);
            }
            
            .notification-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                font-size: 1rem;
                color: #6c757d;
                cursor: pointer;
                padding: 4px;
                border-radius: 50%;
                transition: all 0.2s ease;
            }
            
            .notification-close:hover {
                background-color: rgba(0, 0, 0, 0.1);
                color: #37373F;
            }
            
            .notification-progress {
                width: 100%;
                height: 4px;
                background-color: #e9ecef;
                border-radius: 2px;
                margin-top: 8px;
                overflow: hidden;
            }
            
            .notification-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #B49C73, #9B8A62);
                transition: width 0.3s ease;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            @media (max-width: 768px) {
                .notification-system {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                    width: calc(100% - 20px);
                }
                
                .notification {
                    margin-bottom: 5px;
                    padding: 12px;
                }
            }
        `;
        
        document.head.appendChild(style);
    },
    
    // Mostrar notificación
    show: function(options) {
        if (!this.state.isInitialized) {
            this.init();
        }
        
        // Validar y sanitizar todas las opciones usando XSSProtection
        const sanitizedOptions = {
            title: XSSProtection.escapeHtml(options.title || ''),
            message: XSSProtection.escapeHtml(options.message || ''),
            type: XSSProtection.validateInput(options.type || 'info', {
                type: 'text',
                allowedValues: ['success', 'error', 'warning', 'info'],
                defaultValue: 'info'
            }),
            duration: XSSProtection.validateInput(options.duration, {
                type: 'number',
                min: 1000,
                max: 30000,
                defaultValue: this.config.duration
            }),
            actions: (options.actions || []).map(action => ({
                ...action,
                text: XSSProtection.escapeHtml(action.text || '')
            })),
            progress: XSSProtection.validateInput(options.progress, {
                type: 'number',
                min: 0,
                max: 100,
                defaultValue: null
            }),
            persistent: XSSProtection.validateInput(options.persistent, {
                type: 'boolean',
                defaultValue: false
            })
        };

        // PREVENCIÓN DE DUPLICADOS (Context7 MCP Pattern)
        // Evita que notificaciones idénticas se apilen (cascading)
        const isDuplicate = this.state.notifications.some(n =>
            n.title === sanitizedOptions.title &&
            n.message === sanitizedOptions.message &&
            n.type === sanitizedOptions.type
        );

        if (isDuplicate) {
            console.warn('[NotificationSystem] Notificación duplicada prevenida:', sanitizedOptions.title);
            return null; // No mostrar duplicados
        }
        
        const notification = {
            id: this.generateId(),
            ...sanitizedOptions,
            timestamp: new Date()
        };
        
        // Agregar al estado
        this.state.notifications.unshift(notification);
        
        // Limitar número de notificaciones
        if (this.state.notifications.length > this.config.maxNotifications) {
            this.state.notifications = this.state.notifications.slice(0, this.config.maxNotifications);
        }
        
        // Renderizar
        this.renderNotification(notification);
        
        // Auto remover si no es persistente
        if (!notification.persistent) {
            setTimeout(() => {
                this.remove(notification.id);
            }, notification.duration);
        }
        
        return notification.id;
    },
    
    // Renderizar notificación
    renderNotification: function(notification) {
        const typeConfig = this.config.types[notification.type] || this.config.types.info;
        
        const notificationElement = document.createElement('div');
        notificationElement.className = 'notification';
        notificationElement.dataset.id = notification.id;
        
        let actionsHtml = '';
        if (notification.actions.length > 0) {
            actionsHtml = '<div class="notification-actions">';
            notification.actions.forEach(action => {
                // Sanitizar el texto del botón de acción usando XSSProtection
                const sanitizedActionText = XSSProtection.escapeHtml(action.text);
                const sanitizedActionId = XSSProtection.escapeHtml(action.id || '');
                actionsHtml += `
                    <button class="notification-btn" onclick="NotificationSystem.handleAction('${notification.id}', '${sanitizedActionId}')">
                        ${sanitizedActionText}
                    </button>
                `;
            });
            actionsHtml += '</div>';
        }
        
        let progressHtml = '';
        if (notification.progress !== null) {
            const sanitizedProgress = XSSProtection.validateInput(notification.progress, {
                type: 'number',
                min: 0,
                max: 100
            });
            progressHtml = `
                <div class="notification-progress">
                    <div class="notification-progress-fill" style="width: ${sanitizedProgress}%"></div>
                </div>
            `;
        }
        
        // Sanitizar todo el contenido antes de renderizar usando XSSProtection
        const sanitizedTitle = XSSProtection.escapeHtml(notification.title);
        const sanitizedMessage = XSSProtection.escapeHtml(notification.message);
        const sanitizedColor = XSSProtection.sanitizeCssValue(typeConfig.color);
        
        // Usar setInnerHTMLSafe en lugar de innerHTML directo
        const safeHtml = `
            <div class="notification-icon" style="color: ${sanitizedColor}">
                <i class="${typeConfig.icon}"></i>
            </div>
            <div class="notification-content">
                ${sanitizedTitle ? `<div class="notification-title">${sanitizedTitle}</div>` : ''}
                <div class="notification-message">${sanitizedMessage}</div>
                ${progressHtml}
                ${actionsHtml}
            </div>
            <button class="notification-close" onclick="NotificationSystem.remove('${notification.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        XSSProtection.setInnerHTMLSafe(notificationElement, safeHtml);
        this.state.container.appendChild(notificationElement);
    },
    
    // Actualizar notificación
    update: function(id, updates) {
        const notification = this.state.notifications.find(n => n.id === id);
        if (!notification) return;
        
        Object.assign(notification, updates);
        
        const element = this.state.container.querySelector(`[data-id="${id}"]`);
        if (element) {
            this.renderNotification(notification);
        }
    },
    
    // Remover notificación
    remove: function(id) {
        const index = this.state.notifications.findIndex(n => n.id === id);
        if (index === -1) return;
        
        const element = this.state.container.querySelector(`[data-id="${id}"]`);
        if (element) {
            element.classList.add('removing');
            
            setTimeout(() => {
                element.remove();
            }, this.config.animationDuration);
        }
        
        this.state.notifications.splice(index, 1);
    },
    
    // Manejar acción
    handleAction: function(notificationId, actionId) {
        const notification = this.state.notifications.find(n => n.id === notificationId);
        if (!notification) return;
        
        const action = notification.actions.find(a => a.id === actionId);
        if (action && action.callback) {
            action.callback();
        }
        
        // Ejecutar acción específica
        this.executeAction(action, notification);
    },
    
    // Ejecutar acción
    executeAction: function(action, notification) {
        // Sanitizar el texto de la acción antes de usarlo
        const sanitizedActionText = XSSProtection.escapeHtml(action.text || '');
        
        switch (action.type) {
            case 'confirm':
                this.show('success', 'Acción confirmada', `La acción "${sanitizedActionText}" ha sido confirmada.`);
                break;
            case 'cancel':
                this.show('info', 'Acción cancelada', `La acción "${sanitizedActionText}" ha sido cancelada.`);
                break;
            case 'retry':
                this.show('warning', 'Reintentando', `Reintentando "${sanitizedActionText}"...`);
                if (action.retryCallback) {
                    setTimeout(action.retryCallback, 1000);
                }
                break;
            case 'view':
                if (action.url) {
                    // Sanitizar URL antes de abrirla
                    const sanitizedUrl = XSSProtection.sanitizeUrl(action.url);
                    if (sanitizedUrl && sanitizedUrl !== '#') {
                        window.open(sanitizedUrl, '_blank', 'noopener,noreferrer');
                    }
                }
                break;
            default:
                if (action.callback) {
                    action.callback(notification);
                }
                break;
        }
    },
    
    // Mostrar notificación de éxito
    success: function(message, title = 'Éxito') {
        // Validar y sanitizar entradas usando XSSProtection
        if (!XSSProtection.validateInput(message, { type: 'text', required: true }) ||
            !XSSProtection.validateInput(title, { type: 'text', required: true })) {
            console.error('NotificationSystem: Contenido inválido detectado');
            return null;
        }
        
        return this.show({
            type: 'success',
            title: XSSProtection.escapeHtml(title),
            message: XSSProtection.escapeHtml(message)
        });
    },
    
    // Mostrar notificación de error
    error: function(message, title = 'Error') {
        // Validar y sanitizar entradas usando XSSProtection
        if (!XSSProtection.validateInput(message, { type: 'text', required: true }) ||
            !XSSProtection.validateInput(title, { type: 'text', required: true })) {
            console.error('NotificationSystem: Contenido inválido detectado');
            return null;
        }
        
        return this.show({
            type: 'error',
            title: XSSProtection.escapeHtml(title),
            message: XSSProtection.escapeHtml(message),
            duration: 8000
        });
    },
    
    // Mostrar notificación de advertencia
    warning: function(message, title = 'Advertencia') {
        // Validar y sanitizar entradas usando XSSProtection
        if (!XSSProtection.validateInput(message, { type: 'text', required: true }) ||
            !XSSProtection.validateInput(title, { type: 'text', required: true })) {
            console.error('NotificationSystem: Contenido inválido detectado');
            return null;
        }
        
        return this.show({
            type: 'warning',
            title: XSSProtection.escapeHtml(title),
            message: XSSProtection.escapeHtml(message),
            duration: 6000
        });
    },
    
    // Mostrar notificación informativa
    info: function(message, title = 'Información') {
        // Validar y sanitizar entradas usando XSSProtection
        if (!XSSProtection.validateInput(message, { type: 'text', required: true }) ||
            !XSSProtection.validateInput(title, { type: 'text', required: true })) {
            console.error('NotificationSystem: Contenido inválido detectado');
            return null;
        }
        
        return this.show({
            type: 'info',
            title: XSSProtection.escapeHtml(title),
            message: XSSProtection.escapeHtml(message)
        });
    },
    
    // Mostrar notificación con progreso
    progress: function(message, progress, title = 'Progreso') {
        // Validar y sanitizar entradas usando XSSProtection
        if (!XSSProtection.validateInput(message, { type: 'text', required: true }) ||
            !XSSProtection.validateInput(title, { type: 'text', required: true }) ||
            !XSSProtection.validateInput(progress, { type: 'number', min: 0, max: 100 })) {
            console.error('NotificationSystem: Contenido inválido detectado');
            return null;
        }
        
        return this.show({
            type: 'info',
            title: XSSProtection.escapeHtml(title),
            message: XSSProtection.escapeHtml(message),
            progress: XSSProtection.validateInput(progress, { type: 'number', min: 0, max: 100 }),
            persistent: true
        });
    },
    
    // Actualizar progreso
    updateProgress: function(id, progress) {
        return this.update(id, { progress });
    },
    
    // Completar progreso
    completeProgress: function(id, message = 'Completado') {
        // Sanitizar el mensaje antes de actualizar
        const sanitizedMessage = XSSProtection.escapeHtml(message);
        
        return this.update(id, {
            progress: 100,
            type: 'success',
            message: sanitizedMessage,
            persistent: false
        });
    },
    
    // Limpiar todas las notificaciones
    clear: function() {
        this.state.notifications.forEach(notification => {
            this.remove(notification.id);
        });
    },
    
    // Generar ID único
    generateId: function() {
        return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Obtener notificaciones activas
    getActive: function() {
        return this.state.notifications;
    },
    
    // Obtener número de notificaciones
    getCount: function() {
        return this.state.notifications.length;
    },
    
    // Verificar si hay notificaciones
    hasNotifications: function() {
        return this.state.notifications.length > 0;
    },
    
    // Logging
    log: function(...args) {
        Justice2?.log('[NotificationSystem]', ...args);
    }
};

// Inicializar sistema de notificaciones
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        NotificationSystem.init();
    });
} else {
    NotificationSystem.init();
}

// Exportar para uso global
window.NotificationSystem = NotificationSystem;