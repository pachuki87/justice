/**
 * Justice 2 Configuration
 * Archivo de configuración principal que integra todos los componentes
 */

// Configuración global de Justice 2
window.Justice2 = {
    // Versión
    version: '2.0.0',
    
    // Configuración principal
    config: {
        // Entorno
        environment: {
            type: 'auto', // 'development', 'production', 'auto'
            detection: {
                hostname: true, // Detectar por hostname
                port: true,    // Detectar por puerto
                protocol: true, // Detectar por protocolo
                localStorage: true // Detectar por localStorage
            },
            development: {
                hostnames: ['localhost', '127.0.0.1', '0.0.0.0'],
                ports: [3000, 8080, 5173, 8000],
                protocols: ['http:']
            }
        },

        // Compatibilidad con código antiguo que busca Justice2.config.apiBaseUrl
        get apiBaseUrl() {
            return this.api.baseURL;
        },
        
        // API
        api: {
            // Configuración dinámica según entorno con variables de entorno seguras
            get baseURL() {
                // Usar el sistema de configuración seguro
                if (typeof EnvConfig !== 'undefined' && EnvConfig.getApiUrl) {
                    return EnvConfig.getApiUrl();
                }
                
                // Fallback seguro si EnvConfig no está disponible
                const envType = Justice2.config.environment.type;
                if (envType === 'development') {
                    // Usar ruta relativa en desarrollo para evitar problemas de CORS y puertos
                    // Netlify Dev maneja la redirección de /api a las funciones
                    return '/api';
                } else {
                    // CRÍTICO: No exponer URLs hardcodeadas en producción
                    console.error('ERROR CRÍTICO: EnvConfig no disponible. URL de producción no configurada.');
                    return '/api'; // Fallback seguro
                }
            },
            // Compatibilidad con código antiguo
            get apiBaseUrl() {
                return this.baseURL;
            },
            timeout: 30000,
            retries: 3,
            retryDelay: 1000,
            // Configuración SSL mejorada
            ssl: {
                allowInsecure: function() {
                    // Solo permitir inseguro en desarrollo con advertencia explícita
                    const isDev = Justice2.config.environment.type === 'development';
                    if (isDev) {
                        console.warn('ADVERTENCIA: Modo SSL inseguro activado solo para desarrollo');
                    }
                    return isDev;
                },
                ignoreErrors: function() {
                    // Ignorar errores SSL solo en desarrollo con advertencia
                    const isDev = Justice2.config.environment.type === 'development';
                    if (isDev) {
                        console.warn('ADVERTENCIA: Ignorando errores SSL - NO USAR EN PRODUCCIÓN');
                    }
                    return isDev;
                },
                verifyCertificates: true,
                checkRevocation: true,
                // Configuración de cifrado fuerte
                cipherSuites: [
                    'TLS_AES_256_GCM_SHA384',
                    'TLS_CHACHA20_POLY1305_SHA256',
                    'TLS_AES_128_GCM_SHA256',
                    'ECDHE-ECDSA-AES256-GCM-SHA384',
                    'ECDHE-RSA-AES256-GCM-SHA384',
                    'ECDHE-ECDSA-CHACHA20-POLY1305',
                    'ECDHE-RSA-CHACHA20-POLY1305',
                    'ECDHE-ECDSA-AES128-GCM-SHA256',
                    'ECDHE-RSA-AES128-GCM-SHA256'
                ],
                // Protocolos TLS permitidos
                protocols: ['TLSv1.3', 'TLSv1.2'],
                // Configuración HSTS
                hsts: {
                    enabled: true,
                    maxAge: 31536000, // 1 año
                    includeSubDomains: true,
                    preload: true
                },
                // Configuración de headers de seguridad
                securityHeaders: {
                    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                    'X-XSS-Protection': '1; mode=block',
                    'Referrer-Policy': 'strict-origin-when-cross-origin',
                    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
                }
            }
        },
        
        // Autenticación
        auth: {
            tokenKey: 'justice2_token',
            refreshTokenKey: 'justice2_refresh_token',
            userKey: 'justice2_user',
            sessionTimeout: 3600000, // 1 hora
            refreshThreshold: 300000, // 5 minutos antes de expirar
            maxLoginAttempts: 5,
            lockoutDuration: 900000 // 15 minutos
        },
        
        // UI/UX
        ui: {
            theme: 'light',
            language: 'es',
            animations: true,
            transitions: true,
            autoSave: true,
            autoSaveInterval: 30000, // 30 segundos
            notifications: {
                position: 'top-right',
                duration: 5000,
                maxVisible: 5
            }
        },
        
        // Configuración de API (La conexión a BD es manejada por el backend)
        database: {
            // Configuración referencial, no usada para conexión directa
            timeout: 10000
        },
        
        // Funcionalidades
        features: {
            aiAssistant: true,
            documentAnalysis: true,
            caseManagement: true,
            analytics: true,
            voiceRecognition: true,
            realTimeUpdates: true,
            offlineMode: false,
            darkMode: true
        },
        
        // Rendimiento
        performance: {
            cacheEnabled: true,
            cacheTimeout: 300000, // 5 minutos
            compressionEnabled: true,
            lazyLoading: true,
            prefetchEnabled: true
        },
        
        // Seguridad
        security: {
            csrfProtection: true,
            xssProtection: true,
            rateLimiting: true,
            encryptionEnabled: true,
            auditLogging: true
        },
        
        // Desarrollo
        debug: function() {
            return Justice2.config.environment.type === 'development';
        },
        logging: {
            level: function() {
                return Justice2.config.environment.type === 'development' ? 'debug' : 'info';
            },
            console: true,
            remote: function() {
                return Justice2.config.environment.type === 'production';
            },
            remoteEndpoint: '/api/logs'
        }
    },
    
    // Componentes disponibles
    components: {
        core: 'Justice2Core',
        auth: 'Justice2Auth',
        api: 'Justice2API',
        dynamic: 'Justice2Dynamic',
        notifications: 'Justice2Notifications',
        loading: 'Justice2Loading',
        modals: 'Justice2Modal',
        validation: 'Justice2Validation',
        utils: 'Justice2Utils'
    },
    
    // Módulos de página
    modules: {
        aiAssistant: 'AIAssistant',
        documents: 'DocumentsManager',
        cases: 'CasesManager',
        analytics: 'AnalyticsDashboard'
    },
    
    // Estado de la aplicación
    state: {
        initialized: false,
        authenticated: false,
        user: null,
        currentPage: null,
        loading: false,
        error: null,
        lastActivity: Date.now()
    },
    
    // Eventos personalizados
    events: {
        APP_READY: 'justice2:ready',
        AUTH_LOGIN: 'justice2:auth:login',
        AUTH_LOGOUT: 'justice2:auth:logout',
        AUTH_REFRESH: 'justice2:auth:refresh',
        NAVIGATE: 'justice2:navigate',
        ERROR: 'justice2:error',
        SUCCESS: 'justice2:success',
        LOADING_START: 'justice2:loading:start',
        LOADING_END: 'justice2:loading:end',
        DATA_UPDATED: 'justice2:data:updated',
        NOTIFICATION: 'justice2:notification'
    },
    
    // Inicializar aplicación
    init: function() {
        if (this.state.initialized) {
            console.warn('Justice 2 ya está inicializado');
            return;
        }
        
        try {
            // Detectar entorno automáticamente
            this.detectEnvironment();
            
            // Mostrar carga inicial
            this.showInitialLoading();
            
            // Inicializar componentes principales
            this.initializeComponents();
            
            // Configurar eventos globales
            this.setupGlobalEvents();
            
            // Verificar autenticación
            this.checkAuthentication();
            
            // Configurar actualizaciones automáticas
            this.setupAutoUpdates();
            
            // Configurar manejo de errores
            this.setupErrorHandling();
            
            // Marcar como inicializado
            this.state.initialized = true;
            
            // Emitir evento de aplicación lista
            this.emit(this.events.APP_READY);
            
            // Ocultar carga inicial
            this.hideInitialLoading();
            
            console.log(`Justice 2 inicializado correctamente en modo: ${this.config.environment.type}`);
            
        } catch (error) {
            console.error('Error inicializando Justice 2:', error);
            this.handleCriticalError(error);
        }
    },

    // Detectar entorno automáticamente
    detectEnvironment: function() {
        if (this.config.environment.type !== 'auto') {
            // Si está configurado manualmente, usar esa configuración
            this.log(`Usando entorno configurado manualmente: ${this.config.environment.type}`);
            return;
        }
        
        const detection = this.config.environment.detection;
        const devConfig = this.config.environment.development;
        let isDevelopment = false;
        
        // Detectar por hostname
        if (detection.hostname) {
            const hostname = window.location.hostname;
            isDevelopment = devConfig.hostnames.some(devHost =>
                hostname === devHost || hostname.includes(devHost)
            );
            
            if (isDevelopment) {
                this.log(`Entorno desarrollo detectado por hostname: ${hostname}`);
            }
        }
        
        // Detectar por puerto
        if (!isDevelopment && detection.port) {
            const port = parseInt(window.location.port);
            isDevelopment = devConfig.ports.includes(port);
            
            if (isDevelopment) {
                this.log(`Entorno desarrollo detectado por puerto: ${port}`);
            }
        }
        
        // Detectar por protocolo
        if (!isDevelopment && detection.protocol) {
            const protocol = window.location.protocol;
            isDevelopment = devConfig.protocols.includes(protocol);
            
            if (isDevelopment) {
                this.log(`Entorno desarrollo detectado por protocolo: ${protocol}`);
            }
        }
        
        // Detectar por localStorage
        if (!isDevelopment && detection.localStorage) {
            const storedEnv = localStorage.getItem('justice2_environment');
            if (storedEnv) {
                isDevelopment = storedEnv === 'development';
                this.log(`Entorno desarrollo detectado por localStorage: ${storedEnv}`);
            }
        }
        
        // Aplicar detección
        this.config.environment.type = isDevelopment ? 'development' : 'production';
        
        // Guardar en localStorage para futuras detecciones
        if (detection.localStorage) {
            localStorage.setItem('justice2_environment', this.config.environment.type);
        }
        
        // Aplicar configuración específica del entorno
        this.applyEnvironmentConfig();
        
        this.log(`Entorno detectado: ${this.config.environment.type}`);
    },

    // Aplicar configuración específica del entorno
    applyEnvironmentConfig: function() {
        const envType = this.config.environment.type;
        
        // Configurar API
        if (window.Justice2API) {
            Justice2API.config.environment = envType;
            Justice2API.config.baseUrl = this.config.api.baseURL;
            Justice2API.config.ssl.allowInsecure = this.config.api.ssl.allowInsecure();
            Justice2API.config.ssl.ignoreErrors = this.config.api.ssl.ignoreErrors();
        }
        
        // Configurar logging
        if (this.config.debug()) {
            console.log('Modo debug activado');
        }
        
        // Mostrar indicador de entorno en desarrollo
        if (envType === 'development') {
            this.showDevelopmentIndicator();
        }
    },

    // Mostrar indicador de desarrollo
    showDevelopmentIndicator: function() {
        const indicator = document.createElement('div');
        indicator.id = 'development-indicator';
        indicator.innerHTML = `
            <div style="
                position: fixed;
                bottom: 10px;
                right: 10px;
                background: #28a745;
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 9999;
                font-family: monospace;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            ">
                <i class="fas fa-code mr-1"></i>
                DESARROLLO
            </div>
        `;
        
        document.body.appendChild(indicator);
        
        // Remover después de 5 segundos
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 5000);
    },

    // Cambiar entorno manualmente
    setEnvironment: function(envType) {
        if (['development', 'production'].includes(envType)) {
            this.config.environment.type = envType;
            localStorage.setItem('justice2_environment', envType);
            this.applyEnvironmentConfig();
            
            this.log(`Entorno cambiado manualmente a: ${envType}`);
            
            // Recargar página para aplicar cambios
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    },
    
    // Mostrar carga inicial
    showInitialLoading: function() {
        const loadingHtml = `
            <div id="justice2-initial-loading" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #B49C73, #37373F);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 99999;
                color: white;
                font-family: Arial, sans-serif;
            ">
                <div style="text-align: center;">
                    <div style="
                        width: 60px;
                        height: 60px;
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        border-top: 4px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    "></div>
                    <h2 style="margin: 0; font-size: 24px; font-weight: 300;">Justice 2</h2>
                    <p style="margin: 10px 0 0; opacity: 0.8;">Iniciando plataforma...</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loadingHtml);
    },
    
    // Ocultar carga inicial
    hideInitialLoading: function() {
        const loading = document.getElementById('justice2-initial-loading');
        if (loading) {
            loading.style.opacity = '0';
            loading.style.transition = 'opacity 0.5s ease';
            setTimeout(() => loading.remove(), 500);
        }
    },
    
    // Inicializar componentes
    initializeComponents: function() {
        // Componentes principales
        if (window.Justice2Core) {
            window.Justice2Core.init();
        }
        
        if (window.Justice2Auth) {
            window.Justice2Auth.init();
        }
        
        if (window.Justice2API) {
            window.Justice2API.init();
        }
        
        if (window.Justice2Dynamic) {
            window.Justice2Dynamic.init();
        }
        
        // Componentes modulares
        if (window.Justice2Notifications) {
            window.Justice2Notifications.init();
        }
        
        if (window.Justice2Loading) {
            window.Justice2Loading.init();
        }
        
        if (window.Justice2Modal) {
            window.Justice2Modal.init();
        }
        
        if (window.Justice2Validation) {
            window.Justice2Validation.init();
        }
        
        // Utilidades siempre disponibles
        if (window.Justice2Utils) {
            // Las utilidades no necesitan inicialización
        }
    },
    
    // Configurar eventos globales
    setupGlobalEvents: function() {
        // Eventos de autenticación
        document.addEventListener(this.events.AUTH_LOGIN, (e) => {
            this.state.authenticated = true;
            this.state.user = e.detail.user;
            this.updateUIForAuth();
        });
        
        document.addEventListener(this.events.AUTH_LOGOUT, () => {
            this.state.authenticated = false;
            this.state.user = null;
            this.updateUIForLogout();
        });
        
        // Eventos de navegación
        document.addEventListener(this.events.NAVIGATE, (e) => {
            this.state.currentPage = e.detail.page;
            this.updatePageTitle(e.detail.title);
        });
        
        // Eventos de error
        document.addEventListener(this.events.ERROR, (e) => {
            this.handleError(e.detail.error);
        });
        
        // Eventos de carga
        document.addEventListener(this.events.LOADING_START, () => {
            this.state.loading = true;
        });
        
        document.addEventListener(this.events.LOADING_END, () => {
            this.state.loading = false;
        });
        
        // Eventos de actividad del usuario
        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, () => {
                this.state.lastActivity = Date.now();
            });
        });
    },
    
    // Verificar autenticación
    checkAuthentication: function() {
        if (window.Justice2Auth) {
            const token = window.Justice2Auth.getToken();
            if (token) {
                window.Justice2Auth.validateToken()
                    .then(isValid => {
                        if (isValid) {
                            this.state.authenticated = true;
                            this.updateUIForAuth();
                        } else {
                            window.Justice2Auth.logout();
                        }
                    })
                    .catch(() => {
                        window.Justice2Auth.logout();
                    });
            }
        }
    },
    
    // Configurar actualizaciones automáticas
    setupAutoUpdates: function() {
        if (this.config.features.realTimeUpdates) {
            // Actualización de datos cada 30 segundos
            setInterval(() => {
                if (this.state.authenticated && !this.state.loading) {
                    this.updateDynamicContent();
                }
            }, 30000);
        }
        
        // Auto-guardado
        if (this.config.ui.autoSave) {
            setInterval(() => {
                if (this.state.authenticated) {
                    this.autoSave();
                }
            }, this.config.ui.autoSaveInterval);
        }
    },
    
    // Configurar manejo de errores
    setupErrorHandling: function() {
        // Capturar errores no manejados
        window.addEventListener('error', (e) => {
            this.handleError(e.error);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            this.handleError(e.reason);
        });
    },
    
    // Actualizar UI para usuario autenticado
    updateUIForAuth: function() {
        // Actualizar elementos de navegación
        const loginLinks = document.querySelectorAll('.auth-login');
        const logoutLinks = document.querySelectorAll('.auth-logout');
        const userElements = document.querySelectorAll('.user-info');
        
        loginLinks.forEach(link => link.style.display = 'none');
        logoutLinks.forEach(link => link.style.display = 'block');
        
        if (this.state.user) {
            userElements.forEach(el => {
                el.textContent = this.state.user.name || this.state.user.email;
            });
        }
        
        // Cargar contenido dinámico
        if (window.Justice2Dynamic) {
            window.Justice2Dynamic.loadAllContent();
        }
    },
    
    // Actualizar UI para logout
    updateUIForLogout: function() {
        const loginLinks = document.querySelectorAll('.auth-login');
        const logoutLinks = document.querySelectorAll('.auth-logout');
        const userElements = document.querySelectorAll('.user-info');
        
        loginLinks.forEach(link => link.style.display = 'block');
        logoutLinks.forEach(link => link.style.display = 'none');
        userElements.forEach(el => el.textContent = '');
    },
    
    // Actualizar título de página
    updatePageTitle: function(title) {
        if (title) {
            document.title = `${title} - Justice 2`;
        }
    },
    
    // Actualizar contenido dinámico
    updateDynamicContent: function() {
        if (window.Justice2Dynamic) {
            window.Justice2Dynamic.updateContent();
        }
    },
    
    // Auto-guardar
    autoSave: function() {
        // Implementar auto-guardado según la página actual
        this.emit(this.events.DATA_UPDATED, { action: 'autosave' });
    },
    
    // Manejar errores
    handleError: function(error) {
        console.error('Error en Justice 2:', error);
        
        this.state.error = error;
        
        // Mostrar notificación de error
        if (window.Justice2Notifications && this.config.ui.notifications) {
            window.Justice2Notifications.error(
                error.message || 'Ha ocurrido un error inesperado',
                { duration: 5000 }
            );
        }
        
        // Enviar error a servidor si está configurado
        if (this.config.debug && this.config.logging.remote) {
            this.logError(error);
        }
    },
    
    // Manejar error crítico
    handleCriticalError: function(error) {
        console.error('Error crítico en Justice 2:', error);
        
        // Mostrar pantalla de error
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background: linear-gradient(135deg, #B49C73, #37373F);
                color: white;
                font-family: Arial, sans-serif;
                text-align: center;
            ">
                <div>
                    <h1 style="font-size: 48px; margin: 0 0 20px;">⚠️</h1>
                    <h2 style="margin: 0 0 10px;">Error Crítico</h2>
                    <p style="margin: 0 0 20px; opacity: 0.8;">
                        La aplicación no pudo iniciarse correctamente.
                    </p>
                    <button onclick="location.reload()" style="
                        background: white;
                        color: #37373F;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 16px;
                    ">
                        Reintentar
                    </button>
                </div>
            </div>
        `;
    },
    
    // Enviar error a servidor
    logError: function(error) {
        const errorData = {
            message: error.message,
            stack: error.stack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            userId: this.state.user ? this.state.user.id : null,
            page: this.state.currentPage
        };
        
        fetch(this.config.logging.remoteEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(errorData)
        }).catch(() => {
            // Ignorar errores de logging
        });
    },
    
    // Emitir evento personalizado
    emit: function(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    },
    
    // Escuchar evento personalizado
    on: function(eventName, callback) {
        document.addEventListener(eventName, callback);
    },
    
    // Dejar de escuchar evento
    off: function(eventName, callback) {
        document.removeEventListener(eventName, callback);
    },
    
    // Obtener configuración
    getConfig: function(path = null) {
        if (!path) {
            return this.config;
        }
        
        return path.split('.').reduce((obj, key) => {
            return obj && obj[key] !== undefined ? obj[key] : null;
        }, this.config);
    },
    
    // Actualizar configuración
    updateConfig: function(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.config);
        
        target[lastKey] = value;
    },
    
    // Obtener estado
    getState: function() {
        return { ...this.state };
    },
    
    // Verificar si el usuario está autenticado
    isAuthenticated: function() {
        return this.state.authenticated;
    },
    
    // Obtener usuario actual
    getCurrentUser: function() {
        return this.state.user;
    },
    
    // Verificar si una funcionalidad está habilitada
    isFeatureEnabled: function(feature) {
        return this.config.features[feature] === true;
    },
    
    // Navegar a una página
    navigate: function(page, options = {}) {
        const eventDetail = {
            page,
            title: options.title,
            params: options.params || {},
            replace: options.replace || false
        };
        
        this.emit(this.events.NAVIGATE, eventDetail);
        
        if (!options.replace) {
            history.pushState(
                { page: page, params: options.params || {} },
                options.title || page,
                options.url || `/${page}`
            );
        }
    },
    
    // Mostrar notificación
    notify: function(message, type = 'info', options = {}) {
        if (window.Justice2Notifications) {
            window.Justice2Notifications[type](message, options);
        }
    },
    
    // Mostrar modal
    showModal: function(options) {
        if (window.Justice2Modal) {
            return window.Justice2Modal.create(options);
        }
    },
    
    // Mostrar confirmación
    confirm: function(options) {
        if (window.Justice2Modal) {
            return window.Justice2Modal.confirm(options);
        }
    },
    
    // Mostrar alerta
    alert: function(options) {
        if (window.Justice2Modal) {
            return window.Justice2Modal.alert(options);
        }
    },
    
    // Mostrar carga
    showLoading: function(options) {
        if (window.Justice2Loading) {
            return window.Justice2Loading.show(options);
        }
    },
    
    // Ocultar carga
    hideLoading: function() {
        if (window.Justice2Loading) {
            window.Justice2Loading.hide();
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que todos los scripts se carguen
    setTimeout(() => {
        window.Justice2.init();
    }, 100);
});

// Exportar para uso global
window.Justice2 = window.Justice2;