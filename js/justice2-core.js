/**
 * Justice 2 Core JavaScript - VERSIÓN CORREGIDA
 * Funcionalidades principales y utilidades para Justice 2
 * Sin sistemas complejos que causan sobrecarga
 */

// Importar sistema de protección XSS centralizado
// El sistema se carga automáticamente desde components/xss-protection.js

// Configuración global (versión simplificada y estable)
const Justice2Core = {
    config: {
        apiBaseUrl: '/api',
        version: '2.0.0',
        debug: false, // Desactivado por defecto para mejorar rendimiento
        animations: true,
        autoRefresh: false, // DESACTIVADO por defecto para evitar sobrecarga
        refreshInterval: 60000, // Aumentado a 60 segundos si se activa
        syncEnabled: false, // DESACTIVADO por defecto para evitar sobrecarga
        maxConcurrentOperations: 2 // Reducido para mejorar rendimiento
    },

    // Estado de la aplicación (simplificado)
    state: {
        user: null,
        isAuthenticated: false,
        currentPage: 'index',
        theme: 'light',
        language: 'es',
        coreCache: null, // CacheManager básico
        initialized: false
    },

    // Gestión de intervalos y event listeners para prevenir memory leaks
    intervals: [],
    eventListeners: [],

    // Utilidades
    utils: {
        // Formatear fecha
        formatDate: function(date) {
            return new Date(date).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },

        // Formatear número
        formatNumber: function(num) {
            return new Intl.NumberFormat('es-ES').format(num);
        },

        // Generar ID único
        generateId: function() {
            return 'j2_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        // Validar email
        validateEmail: function(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },

        // Mostrar notificación simple y optimizada
        showNotification: function(message, type = 'info', duration = 3000) {
            // Verificar si el sistema de notificaciones está disponible
            if (window.NotificationSystem && typeof window.NotificationSystem.show === 'function') {
                return window.NotificationSystem.show(message, type, duration);
            }

            // Fallback: Crear notificación simple sin validaciones complejas
            console.log(`[${type.toUpperCase()}] ${message}`);

            // Solo crear notificación si hay XSSProtection disponible
            if (typeof XSSProtection !== 'undefined') {
                const notification = document.createElement('div');
                notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    max-width: 300px;
                `;

                if (XSSProtection.setInnerHTMLSafe) {
                    XSSProtection.setInnerHTMLSafe(notification, `
                        ${XSSProtection.escapeHtml ? XSSProtection.escapeHtml(message) : message}
                        <button type="button" class="close" data-dismiss="alert">
                            <span>&times;</span>
                        </button>
                    `);
                } else {
                    notification.innerHTML = `
                        ${message}
                        <button type="button" class="close" data-dismiss="alert">
                            <span>&times;</span>
                        </button>
                    `;
                }

                document.body.appendChild(notification);

                // Auto-eliminar después de duration
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, duration);
            }
        },

        // Mostrar loading simplificado
        showLoading: function(element, text = 'Cargando...') {
            element.classList.add('loading');
            element.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">${text}</span>
                    </div>
                    <p class="mt-2">${text}</p>
                </div>
            `;
        },

        // Ocultar loading
        hideLoading: function(element) {
            element.classList.remove('loading');
        },

        // Animar contador optimizado
        animateCounter: function(element, target, duration = 1000) {
            let start = 0;
            const increment = target / (duration / 16);
            const timer = setInterval(() => {
                start += increment;
                if (start >= target) {
                    element.textContent = this.formatNumber(Math.round(target));
                    clearInterval(timer);
                    // Limpiar referencia
                    const index = Justice2Core.intervals.indexOf(timer);
                    if (index > -1) {
                        Justice2Core.intervals.splice(index, 1);
                    }
                } else {
                    element.textContent = this.formatNumber(Math.round(start));
                }
            }, 16);

            Justice2Core.intervals.push(timer);
            return timer;
        },

        // Limpiar todos los intervalos activos
        clearAllIntervals: function() {
            Justice2Core.intervals.forEach(intervalId => {
                clearInterval(intervalId);
            });
            Justice2Core.intervals = [];
        },

        // Limpiar todos los event listeners
        removeAllEventListeners: function() {
            Justice2Core.eventListeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            Justice2Core.eventListeners = [];
        },

        // Agregar event listener con seguimiento
        addTrackedEventListener: function(element, event, handler, options) {
            element.addEventListener(event, handler, options);
            Justice2Core.eventListeners.push({ element, event, handler, options });
        }
    },

    // Inicialización simplificada y segura
    init: function() {
        try {
            this.log('Inicializando Justice 2 v' + this.config.version + ' (versión estable)');

            // Inicializar caché básica
            this.initializeBasicCache();

            // Inicializar componentes básicos
            this.initComponents();

            // Inicializar eventos esenciales
            this.initEssentialEvents();

            // Cargar estado guardado
            this.loadState();

            // SOLO inicializar actualización automática si está explícitamente activada
            if (this.config.autoRefresh && localStorage.getItem('justice2-auto-refresh') === 'true') {
                this.initAutoRefresh();
            }

            this.state.initialized = true;
            this.log('Justice 2 inicializado correctamente (versión estable)');

        } catch (error) {
            this.log('Error en inicialización:', error);
            // No detener la aplicación si hay errores
        }
    },

    // Inicializar caché básica (solo si CacheManager existe)
    initializeBasicCache: function() {
        try {
            if (typeof window !== 'undefined' && window.CacheManager) {
                this.state.coreCache = new window.CacheManager({
                    name: 'justice2-basic-cache',
                    strategy: 'lru',
                    ttl: 30 * 60 * 1000, // 30 minutos
                    maxSize: 50, // Reducido para mejorar rendimiento
                    compression: false, // Desactivado para mejorar rendimiento
                    metrics: false
                });
                this.log('Caché básica inicializada');
            }
        } catch (error) {
            this.log('Error inicializando caché básica:', error);
        }
    },

    // Inicializar componentes esenciales
    initComponents: function() {
        // Inicializar tooltips si están disponibles
        if (typeof $ !== 'undefined' && $.fn.tooltip) {
            $('[data-toggle="tooltip"]').tooltip();
        }

        // Inicializar carousels básicos
        this.initBasicCarousels();

        // Inicializar navegación
        this.initNavigation();
    },

    // Inicializar eventos esenciales (sin sobrecarga)
    initEssentialEvents: function() {
        // Eventos de navegación básicos
        document.addEventListener('DOMContentLoaded', () => {
            this.handlePageLoad();
        });

        // Eventos de scroll optimizados con throttle
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (scrollTimeout) {
                return;
            }
            scrollTimeout = setTimeout(() => {
                this.handleScroll();
                scrollTimeout = null;
            }, 16); // ~60fps
        });

        // Eventos de resize con debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });

        // Eventos de conexión básicos
        window.addEventListener('online', () => {
            this.utils.showNotification('Conexión restaurada', 'success', 2000);
        });

        window.addEventListener('offline', () => {
            this.utils.showNotification('Sin conexión a internet', 'error', 3000);
        });
    },

    // Inicializar carousels básicos
    initBasicCarousels: function() {
        // Solo carousel principal con configuración simple
        const headerCarousel = document.getElementById('header-carousel');
        if (headerCarousel && typeof $ !== 'undefined' && $(headerCarousel).carousel) {
            $(headerCarousel).carousel({
                interval: 7000, // Aumentado para reducir cambios frecuentes
                pause: 'hover',
                wrap: true
            });
        }
    },

    // Inicializar navegación
    initNavigation: function() {
        // Marcar enlace activo
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });

        // Smooth scroll para anclas (con validación)
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const href = this.getAttribute('href');

                if (!href || href === '#') return;

                try {
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                } catch (err) {
                    console.debug('Selector inválido para scroll suave:', href);
                }
            });
        });
    },

    // Manejar carga de página
    handlePageLoad: function() {
        // Animar elementos de forma simple
        const animatedElements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right');
        animatedElements.forEach((element, index) => {
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 50); // Reducido para mejorar rendimiento
        });

        // Cargar contenido dinámico básico
        this.loadBasicDynamicContent();
    },

    // Manejar scroll optimizado
    handleScroll: function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Back to top button
        const backToTop = document.querySelector('.back-to-top');
        if (backToTop) {
            backToTop.style.display = scrollTop > 300 ? 'block' : 'none';
        }
    },

    // Manejar resize
    handleResize: function() {
        this.log('Window resized');
    },

    // Cargar contenido dinámico básico (sin sincronización compleja)
    loadBasicDynamicContent: function() {
        // Cargar datos de forma simple y asíncrona
        this.loadRecentCases();
        this.loadActiveDocuments();
        this.loadStatistics();
    },

    // Cargar casos recientes
    loadRecentCases: function() {
        const container = document.getElementById('recent-cases');
        if (!container) return;

        // Usar caché si está disponible
        if (this.state.coreCache) {
            try {
                const cachedCases = this.state.coreCache.get('recent-cases');
                if (cachedCases) {
                    this.renderRecentCases(container, cachedCases);
                    return;
                }
            } catch (e) {
                console.debug('Error leyendo caché de casos:', e);
            }
        }

        // Simular carga sin bloquear
        setTimeout(() => {
            const cases = [
                { id: 1, title: 'Caso Laboral - Despido Improcedente', status: 'active', date: '2024-01-15' },
                { id: 2, title: 'Caso Civil - Incumplimiento de Contrato', status: 'pending', date: '2024-01-14' },
                { id: 3, title: 'Caso Familiar - Custodia Compartida', status: 'active', date: '2024-01-13' }
            ];

            this.renderRecentCases(container, cases);

            // Guardar en caché si está disponible
            if (this.state.coreCache) {
                try {
                    this.state.coreCache.set('recent-cases', cases);
                } catch (e) {
                    console.debug('Error guardando casos en caché:', e);
                }
            }
        }, 500);
    },

    // Renderizar casos recientes
    renderRecentCases: function(container, cases) {
        let html = '';
        cases.forEach(caseItem => {
            const statusClass = caseItem.status === 'active' ? 'status-active' : 'status-pending';
            const statusText = caseItem.status === 'active' ? 'Activo' : 'Pendiente';

            html += `
                <div class="case-item">
                    <div class="case-title">${this.escapeHtml(caseItem.title)}</div>
                    <small class="text-muted">${this.escapeHtml(this.utils.formatDate(caseItem.date))}</small>
                    <span class="case-status ${statusClass}">${this.escapeHtml(statusText)}</span>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // Cargar documentos activos
    loadActiveDocuments: function() {
        const container = document.getElementById('active-documents');
        if (!container) return;

        setTimeout(() => {
            const documents = [
                { id: 1, title: 'Demanda Laboral', type: 'PDF', size: '2.5 MB', date: '2024-01-15' },
                { id: 2, title: 'Contrato de Arrendamiento', type: 'DOCX', size: '1.2 MB', date: '2024-01-14' },
                { id: 3, title: 'Escritura de Propiedad', type: 'PDF', size: '3.8 MB', date: '2024-01-13' }
            ];

            this.renderActiveDocuments(container, documents);
        }, 700);
    },

    // Renderizar documentos activos
    renderActiveDocuments: function(container, documents) {
        let html = '';
        documents.forEach(doc => {
            html += `
                <div class="document-item">
                    <div class="document-info">
                        <div class="document-title">${this.escapeHtml(doc.title)}</div>
                        <div class="document-meta">
                            <span class="badge badge-secondary">${this.escapeHtml(doc.type)}</span>
                            <span class="ml-2">${this.escapeHtml(doc.size)}</span>
                            <span class="ml-2">${this.escapeHtml(this.utils.formatDate(doc.date))}</span>
                        </div>
                    </div>
                    <div class="document-actions">
                        <button class="btn btn-sm btn-outline-primary btn-sm-square" title="Ver">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary btn-sm-square" title="Descargar">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // Cargar estadísticas
    loadStatistics: function() {
        const container = document.getElementById('statistics');
        if (!container) return;

        setTimeout(() => {
            const stats = [
                { label: 'Casos Activos', value: 47, icon: 'fa-briefcase' },
                { label: 'Documentos', value: 234, icon: 'fa-file-alt' },
                { label: 'Clientes', value: 89, icon: 'fa-users' }
            ];

            this.renderStatistics(container, stats);
        }, 300);
    },

    // Renderizar estadísticas
    renderStatistics: function(container, stats) {
        let html = '';
        stats.forEach(stat => {
            html += `
                <div class="stat-item">
                    <i class="fas ${stat.icon} fa-2x text-primary mb-2"></i>
                    <span class="stat-number" data-target="${stat.value}">0</span>
                    <div class="stat-label">${this.escapeHtml(stat.label)}</div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Animar contadores
        container.querySelectorAll('.stat-number').forEach(element => {
            const target = parseInt(element.dataset.target);
            this.utils.animateCounter(element, target);
        });
    },

    // Auto-refresh básico (solo si está explícitamente activado)
    initAutoRefresh: function() {
        const refreshInterval = setInterval(() => {
            this.log('Actualizando contenido automáticamente...');
            try {
                this.loadBasicDynamicContent();
            } catch (error) {
                this.log('Error en actualización automática:', error);
            }
        }, this.config.refreshInterval);

        this.intervals.push(refreshInterval);
        this.log('Auto-refresh inicializado');
    },

    // Cargar estado guardado
    loadState: function() {
        try {
            const savedState = localStorage.getItem('justice2_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                this.state = { ...this.state, ...state };
            }
        } catch (e) {
            this.log('Error al cargar estado:', e);
        }
    },

    // Guardar estado
    saveState: function() {
        try {
            localStorage.setItem('justice2_state', JSON.stringify(this.state));
        } catch (e) {
            this.log('Error al guardar estado:', e);
        }
    },

    // Función de limpieza básica
    cleanup: function() {
        this.log('Iniciando limpieza de recursos...');

        try {
            // Limpiar todos los intervalos
            this.utils.clearAllIntervals();

            // Limpiar todos los event listeners
            this.utils.removeAllEventListeners();

            // Limpiar estado
            this.state = {
                user: null,
                isAuthenticated: false,
                currentPage: 'index',
                theme: 'light',
                language: 'es',
                coreCache: null,
                initialized: false
            };

            this.log('Limpieza de recursos completada');
        } catch (error) {
            this.log('Error en limpieza de recursos:', error);
        }
    },

    // Escape HTML básico
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Logging simple
    log: function(...args) {
        if (this.config.debug) {
            console.log('[Justice2]', ...args);
        }
    }
};

// Integración con el sistema principal
if (window.Justice2) {
    // Preservar configuración existente
    const globalConfig = window.Justice2.config;

    // Fusionar todo el Core en el objeto global Justice2
    Object.assign(window.Justice2, Justice2Core);

    // Restaurar configuración global
    window.Justice2.config = { ...globalConfig, ...Justice2Core.config };

    // Exponer Core explícitamente
    window.Justice2Core = Justice2Core;

    // Inicializar Justice 2 cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.Justice2.init();
        });
    } else {
        window.Justice2.init();
    }
} else {
    // Fallback: Si no existe Justice2 global
    window.Justice2 = Justice2Core;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            Justice2Core.init();
        });
    } else {
        Justice2Core.init();
    }
}

// Exportar para uso global
window.Justice2 = Justice2Core;