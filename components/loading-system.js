/**
 * Justice 2 Loading System
 * Sistema de carga y progreso modular y reutilizable
 */

const Justice2Loading = {
    // Configuración
    config: {
        defaultDuration: 2000,
        minDuration: 500,
        maxDuration: 10000,
        animationDuration: 300
    },
    
    // Estados de carga
    states: {
        idle: 'idle',
        loading: 'loading',
        success: 'success',
        error: 'error'
    },
    
    // Estado actual
    currentState: 'idle',
    
    // Contadores activos
    activeLoaders: new Map(),
    
    // Inicializar sistema
    init: function() {
        this.createLoadingOverlay();
        this.createProgressBars();
        this.createSpinners();
        this.bindEvents();
    },
    
    // Crear overlay de carga global
    createLoadingOverlay: function() {
        if (document.getElementById('global-loading-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'global-loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
                <div class="loading-text">Cargando...</div>
                <div class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <span class="progress-text">0%</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    },
    
    // Crear barras de progreso
    createProgressBars: function() {
        const styles = `
            .progress-container {
                margin: 10px 0;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s ease;
            }
            
            .progress-container.active {
                opacity: 1;
                transform: translateY(0);
            }
            
            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .progress-title {
                font-size: 14px;
                font-weight: 600;
                color: #37373F;
            }
            
            .progress-percentage {
                font-size: 12px;
                color: #B49C73;
                font-weight: 500;
            }
            
            .progress-bar {
                height: 8px;
                background-color: #f8f9fa;
                border-radius: 4px;
                overflow: hidden;
                position: relative;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #B49C73, #37373F);
                border-radius: 4px;
                width: 0%;
                transition: width 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .progress-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(255, 255, 255, 0.3),
                    transparent
                );
                animation: progress-shine 2s infinite;
            }
            
            @keyframes progress-shine {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            
            .progress-status {
                font-size: 12px;
                color: #6c757d;
                margin-top: 4px;
            }
            
            .progress-indeterminate {
                height: 4px;
                background-color: #f8f9fa;
                border-radius: 2px;
                overflow: hidden;
                position: relative;
            }
            
            .progress-indeterminate::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 30%;
                background: linear-gradient(90deg, #B49C73, #37373F);
                border-radius: 2px;
                animation: progress-indeterminate 1.5s infinite ease-in-out;
            }
            
            @keyframes progress-indeterminate {
                0% { left: -30%; }
                100% { left: 100%; }
            }
        `;
        
        this.addStyles(styles);
    },
    
    // Crear spinners
    createSpinners: function() {
        const styles = `
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(255, 255, 255, 0.95);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            
            .loading-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            
            .loading-content {
                text-align: center;
                max-width: 300px;
            }
            
            .loading-spinner {
                margin-bottom: 20px;
            }
            
            .spinner {
                width: 50px;
                height: 50px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #B49C73;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .loading-text {
                font-size: 16px;
                color: #37373F;
                margin-bottom: 15px;
                font-weight: 500;
            }
            
            .loading-progress {
                margin-top: 15px;
            }
            
            .spinner-sm {
                width: 20px;
                height: 20px;
                border-width: 2px;
            }
            
            .spinner-lg {
                width: 80px;
                height: 80px;
                border-width: 6px;
            }
            
            .dots-loader {
                display: inline-flex;
                gap: 4px;
            }
            
            .dots-loader .dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #B49C73;
                animation: dots-bounce 1.4s infinite ease-in-out both;
            }
            
            .dots-loader .dot:nth-child(1) { animation-delay: -0.32s; }
            .dots-loader .dot:nth-child(2) { animation-delay: -0.16s; }
            .dots-loader .dot:nth-child(3) { animation-delay: 0s; }
            
            @keyframes dots-bounce {
                0%, 80%, 100% {
                    transform: scale(0);
                }
                40% {
                    transform: scale(1);
                }
            }
            
            .pulse-loader {
                display: inline-block;
                width: 40px;
                height: 40px;
                background-color: #B49C73;
                border-radius: 50%;
                animation: pulse 1.5s infinite ease-in-out;
            }
            
            @keyframes pulse {
                0% {
                    transform: scale(0);
                    opacity: 1;
                }
                100% {
                    transform: scale(1);
                    opacity: 0;
                }
            }
        `;
        
        this.addStyles(styles);
    },
    
    // Agregar estilos CSS
    addStyles: function(styles) {
        if (document.getElementById('loading-system-styles')) return;
        
        const styleElement = document.createElement('style');
        styleElement.id = 'loading-system-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    },
    
    // Mostrar carga global
    show: function(options = {}) {
        const config = {
            text: 'Cargando...',
            showProgress: false,
            duration: this.config.defaultDuration,
            ...options
        };
        
        const overlay = document.getElementById('global-loading-overlay');
        if (!overlay) return;
        
        const textElement = overlay.querySelector('.loading-text');
        const progressContainer = overlay.querySelector('.loading-progress');
        
        textElement.textContent = config.text;
        progressContainer.style.display = config.showProgress ? 'block' : 'none';
        
        overlay.classList.add('active');
        this.currentState = this.states.loading;
        
        return new Promise((resolve) => {
            setTimeout(() => {
                this.hide();
                resolve();
            }, config.duration);
        });
    },
    
    // Ocultar carga global
    hide: function() {
        const overlay = document.getElementById('global-loading-overlay');
        if (!overlay) return;
        
        overlay.classList.remove('active');
        this.currentState = this.states.idle;
    },
    
    // Crear barra de progreso
    createProgressBar: function(container, options = {}) {
        const config = {
            id: this.generateId(),
            title: 'Progreso',
            showPercentage: true,
            showStatus: true,
            indeterminate: false,
            ...options
        };
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-container';
        progressBar.id = config.id;
        
        progressBar.innerHTML = `
            <div class="progress-header">
                <span class="progress-title">${config.title}</span>
                ${config.showPercentage ? '<span class="progress-percentage">0%</span>' : ''}
            </div>
            <div class="${config.indeterminate ? 'progress-indeterminate' : 'progress-bar'}">
                ${!config.indeterminate ? '<div class="progress-fill"></div>' : ''}
            </div>
            ${config.showStatus ? '<div class="progress-status">Iniciando...</div>' : ''}
        `;
        
        container.appendChild(progressBar);
        
        // Animar entrada
        setTimeout(() => {
            progressBar.classList.add('active');
        }, 10);
        
        return {
            id: config.id,
            element: progressBar,
            update: (progress, status) => this.updateProgressBar(config.id, progress, status),
            complete: (status) => this.completeProgressBar(config.id, status),
            error: (status) => this.errorProgressBar(config.id, status),
            remove: () => this.removeProgressBar(config.id)
        };
    },
    
    // Actualizar barra de progreso
    updateProgressBar: function(id, progress, status) {
        const container = document.getElementById(id);
        if (!container) return;
        
        const progressFill = container.querySelector('.progress-fill');
        const percentageText = container.querySelector('.progress-percentage');
        const statusText = container.querySelector('.progress-status');
        
        if (progressFill) {
            progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
        
        if (percentageText) {
            percentageText.textContent = `${Math.round(progress)}%`;
        }
        
        if (statusText && status) {
            statusText.textContent = status;
        }
    },
    
    // Completar barra de progreso
    completeProgressBar: function(id, status = 'Completado') {
        this.updateProgressBar(id, 100, status);
        
        const container = document.getElementById(id);
        if (container) {
            const progressFill = container.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.background = 'linear-gradient(90deg, #28a745, #20c997)';
            }
        }
        
        // Auto-eliminar después de 2 segundos
        setTimeout(() => {
            this.removeProgressBar(id);
        }, 2000);
    },
    
    // Error en barra de progreso
    errorProgressBar: function(id, status = 'Error') {
        const container = document.getElementById(id);
        if (container) {
            const progressFill = container.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.background = 'linear-gradient(90deg, #dc3545, #e83e8c)';
            }
            
            const statusText = container.querySelector('.progress-status');
            if (statusText) {
                statusText.textContent = status;
                statusText.style.color = '#dc3545';
            }
        }
        
        // Auto-eliminar después de 3 segundos
        setTimeout(() => {
            this.removeProgressBar(id);
        }, 3000);
    },
    
    // Eliminar barra de progreso
    removeProgressBar: function(id) {
        const container = document.getElementById(id);
        if (container) {
            container.classList.remove('active');
            setTimeout(() => {
                container.remove();
            }, this.config.animationDuration);
        }
    },
    
    // Crear spinner en elemento
    createSpinner: function(container, options = {}) {
        const config = {
            size: 'md',
            text: 'Cargando...',
            overlay: false,
            ...options
        };
        
        const spinnerContainer = document.createElement('div');
        spinnerContainer.className = `spinner-container spinner-${config.size}`;
        
        if (config.overlay) {
            spinnerContainer.className += ' spinner-overlay';
        }
        
        const sizeClasses = {
            sm: 'spinner-sm',
            md: '',
            lg: 'spinner-lg'
        };
        
        spinnerContainer.innerHTML = `
            <div class="spinner ${sizeClasses[config.size]}"></div>
            ${config.text ? `<div class="spinner-text">${config.text}</div>` : ''}
        `;
        
        container.appendChild(spinnerContainer);
        
        return {
            element: spinnerContainer,
            remove: () => spinnerContainer.remove(),
            updateText: (text) => {
                const textElement = spinnerContainer.querySelector('.spinner-text');
                if (textElement) {
                    textElement.textContent = text;
                }
            }
        };
    },
    
    // Crear loader de puntos
    createDotsLoader: function(container, options = {}) {
        const config = {
            text: 'Cargando',
            dotCount: 3,
            ...options
        };
        
        const loaderContainer = document.createElement('div');
        loaderContainer.className = 'dots-loader-container';
        
        let dots = '';
        for (let i = 0; i < config.dotCount; i++) {
            dots += '<div class="dot"></div>';
        }
        
        loaderContainer.innerHTML = `
            <div class="dots-loader">${dots}</div>
            ${config.text ? `<div class="dots-text">${config.text}</div>` : ''}
        `;
        
        container.appendChild(loaderContainer);
        
        return {
            element: loaderContainer,
            remove: () => loaderContainer.remove()
        };
    },
    
    // Crear loader de pulso
    createPulseLoader: function(container, options = {}) {
        const config = {
            text: 'Procesando',
            ...options
        };
        
        const loaderContainer = document.createElement('div');
        loaderContainer.className = 'pulse-loader-container';
        
        loaderContainer.innerHTML = `
            <div class="pulse-loader"></div>
            ${config.text ? `<div class="pulse-text">${config.text}</div>` : ''}
        `;
        
        container.appendChild(loaderContainer);
        
        return {
            element: loaderContainer,
            remove: () => loaderContainer.remove()
        };
    },
    
    // Carga con promesa
    loadWithPromise: function(promise, options = {}) {
        const config = {
            showGlobal: true,
            text: 'Procesando...',
            showProgress: false,
            ...options
        };
        
        if (config.showGlobal) {
            this.show({
                text: config.text,
                showProgress: config.showProgress
            });
        }
        
        return promise
            .then(result => {
                if (config.showGlobal) {
                    this.hide();
                }
                return result;
            })
            .catch(error => {
                if (config.showGlobal) {
                    this.hide();
                }
                throw error;
            });
    },
    
    // Carga múltiple
    loadMultiple: function(tasks, options = {}) {
        const config = {
            concurrent: true,
            showProgress: true,
            text: 'Procesando tareas...',
            ...options
        };
        
        if (config.showProgress) {
            return this.show({
                text: config.text,
                showProgress: true
            }).then(() => {
                return this.executeTasks(tasks, config);
            });
        } else {
            return this.executeTasks(tasks, config);
        }
    },
    
    // Ejecutar tareas
    executeTasks: function(tasks, config) {
        const total = tasks.length;
        let completed = 0;
        
        const updateProgress = () => {
            const progress = (completed / total) * 100;
            this.updateGlobalProgress(progress, `${completed} de ${total} tareas completadas`);
        };
        
        if (config.concurrent) {
            return Promise.allSettled(
                tasks.map(task => 
                    task().then(result => {
                        completed++;
                        updateProgress();
                        return result;
                    }).catch(error => {
                        completed++;
                        updateProgress();
                        throw error;
                    })
                )
            );
        } else {
            return tasks.reduce((promise, task) => {
                return promise.then(() => {
                    return task().then(result => {
                        completed++;
                        updateProgress();
                        return result;
                    });
                });
            }, Promise.resolve());
        }
    },
    
    // Actualizar progreso global
    updateGlobalProgress: function(progress, text) {
        const overlay = document.getElementById('global-loading-overlay');
        if (!overlay) return;
        
        const progressFill = overlay.querySelector('.progress-fill');
        const progressText = overlay.querySelector('.progress-text');
        const loadingText = overlay.querySelector('.loading-text');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(progress)}%`;
        }
        
        if (loadingText && text) {
            loadingText.textContent = text;
        }
    },
    
    // Generar ID único
    generateId: function() {
        return 'loader_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Eventos
    bindEvents: function() {
        // Eventos personalizados si se necesitan
    },
    
    // Utilidades
    utils: {
        // Convertir bytes a progreso
        bytesToProgress: function(current, total) {
            if (total === 0) return 0;
            return (current / total) * 100;
        },
        
        // Formatear tiempo restante
        formatTimeRemaining: function(percentage, startTime) {
            const elapsed = Date.now() - startTime;
            const total = (elapsed / percentage) * 100;
            const remaining = total - elapsed;
            
            return Justice2Utils.formatDuration(Math.floor(remaining / 1000));
        },
        
        // Calcular velocidad de transferencia
        calculateSpeed: function(bytes, elapsed) {
            const bytesPerSecond = bytes / (elapsed / 1000);
            return Justice2Utils.formatFileSize(bytesPerSecond) + '/s';
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    Justice2Loading.init();
});

// Exportar para uso global
window.Justice2Loading = Justice2Loading;