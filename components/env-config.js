/**
 * Justice 2 Environment Configuration Manager
 * Sistema seguro de gestión de variables de entorno para el frontend
 * 
 * CARACTERÍSTICAS DE SEGURIDAD:
 * - Carga segura de variables de entorno
 * - Validación de configuración requerida
 * - Fallbacks seguros para valores faltantes
 * - Sanitización de valores cargados
 * - Detección automática de entorno
 * - Prevención de exposición de credenciales
 */

const EnvConfig = {
    // Estado interno
    _config: {},
    _loaded: false,
    _validated: false,
    
    // Configuración de variables requeridas y sus validaciones
    _requiredVars: {
        // URLs del sistema
        PRODUCTION_API_URL: {
            type: 'url',
            required: false, // Opcional con fallback seguro
            fallback: null,
            description: 'URL del servidor de API para producción'
        },
        DEVELOPMENT_API_URL: {
            type: 'url',
            required: false,
            fallback: 'http://localhost:8000',
            description: 'URL del servidor de API para desarrollo'
        },
        FRONTEND_BASE_URL: {
            type: 'url',
            required: false,
            fallback: 'http://localhost:3000',
            description: 'URL base del frontend'
        },
        
        // Configuración de entorno
        DEFAULT_ENVIRONMENT: {
            type: 'string',
            required: false,
            fallback: 'auto',
            allowedValues: ['auto', 'development', 'production'],
            description: 'Entorno por defecto (auto, development, production)'
        },
        
        // Validación de JWT
        VALID_JWT_ISSUERS: {
            type: 'string-array',
            required: false,
            fallback: ['justice2-system', 'http://localhost:8000'],
            description: 'Lista de issuers válidos para tokens JWT'
        }
    },
    
    /**
     * Inicializar el sistema de configuración
     */
    init: function() {
        this.log('Inicializando sistema de configuración segura');
        
        try {
            this.loadEnvironmentVariables();
            this.validateConfiguration();
            this.setupSecurityMeasures();
            this._loaded = true;
            this._validated = true;
            
            this.log('Sistema de configuración inicializado correctamente');
            return true;
        } catch (error) {
            this.logError('Error crítico al inicializar configuración:', error);
            this.handleCriticalError(error);
            return false;
        }
    },
    
    /**
     * Cargar variables de entorno desde múltiples fuentes
     */
    loadEnvironmentVariables: function() {
        this.log('Cargando variables de entorno');
        
        // 1. Variables de entorno del proceso (si están disponibles)
        if (typeof process !== 'undefined' && process.env) {
            this.loadFromProcessEnv();
        }
        
        // 2. Variables globales window.ENV (inyectadas por el servidor)
        if (typeof window !== 'undefined' && window.ENV) {
            this.loadFromWindowEnv();
        }
        
        // 3. Variables desde meta tags (para build-time variables)
        this.loadFromMetaTags();
        
        // 4. Aplicar fallbacks seguros
        this.applyFallbacks();
        
        this.log('Variables de entorno cargadas:', Object.keys(this._config));
    },
    
    /**
     * Cargar desde process.env (solo disponible en Node.js/build time)
     */
    loadFromProcessEnv: function() {
        if (!process || !process.env) return;
        
        Object.keys(this._requiredVars).forEach(varName => {
            if (process.env[varName]) {
                this._config[varName] = this.sanitizeValue(varName, process.env[varName]);
                this.log(`Cargado ${varName} desde process.env`);
            }
        });
    },
    
    /**
     * Cargar desde window.ENV (inyectadas por el servidor)
     */
    loadFromWindowEnv: function() {
        if (!window || !window.ENV) return;
        
        Object.keys(this._requiredVars).forEach(varName => {
            if (window.ENV[varName]) {
                this._config[varName] = this.sanitizeValue(varName, window.ENV[varName]);
                this.log(`Cargado ${varName} desde window.ENV`);
            }
        });
    },
    
    /**
     * Cargar desde meta tags en el HTML
     */
    loadFromMetaTags: function() {
        if (!document) return;
        
        Object.keys(this._requiredVars).forEach(varName => {
            const metaTag = document.querySelector(`meta[name="env-${varName.toLowerCase()}"]`);
            if (metaTag && metaTag.content) {
                this._config[varName] = this.sanitizeValue(varName, metaTag.content);
                this.log(`Cargado ${varName} desde meta tag`);
            }
        });
    },
    
    /**
     * Aplicar fallbacks seguros para variables faltantes
     */
    applyFallbacks: function() {
        Object.keys(this._requiredVars).forEach(varName => {
            const varConfig = this._requiredVars[varName];
            
            if (!this._config[varName] && varConfig.fallback !== null) {
                this._config[varName] = varConfig.fallback;
                this.log(`Aplicado fallback para ${varName}:`, varConfig.fallback);
            }
        });
    },
    
    /**
     * Validar la configuración cargada
     */
    validateConfiguration: function() {
        this.log('Validando configuración');
        
        const errors = [];
        const warnings = [];
        
        Object.keys(this._requiredVars).forEach(varName => {
            const varConfig = this._requiredVars[varName];
            const value = this._config[varName];
            
            try {
                // Validar que las variables requeridas estén presentes
                if (varConfig.required && !value) {
                    errors.push(`Variable requerida faltante: ${varName}`);
                    return;
                }
                
                // Si no hay valor y no es requerida, continuar
                if (!value) return;
                
                // Validar tipo y formato
                const validation = this.validateVariable(varName, value, varConfig);
                if (!validation.valid) {
                    errors.push(`Variable ${varName} inválida: ${validation.error}`);
                }
                
                // Advertencias de seguridad
                if (this.isInsecureValue(varName, value)) {
                    warnings.push(`Valor inseguro detectado en ${varName}`);
                }
                
            } catch (error) {
                errors.push(`Error validando ${varName}: ${error.message}`);
            }
        });
        
        // Reportar resultados
        if (errors.length > 0) {
            throw new Error(`Errores de validación: ${errors.join(', ')}`);
        }
        
        if (warnings.length > 0) {
            warnings.forEach(warning => this.logWarning(warning));
        }
        
        this.log('Validación completada exitosamente');
    },
    
    /**
     * Validar una variable individual
     */
    validateVariable: function(varName, value, config) {
        const result = { valid: true, error: null };
        
        try {
            switch (config.type) {
                case 'url':
                    if (!this.isValidUrl(value)) {
                        result.valid = false;
                        result.error = `URL inválida: ${value}`;
                    }
                    break;
                    
                case 'string':
                    if (typeof value !== 'string') {
                        result.valid = false;
                        result.error = 'Debe ser un string';
                    } else if (config.allowedValues && !config.allowedValues.includes(value)) {
                        result.valid = false;
                        result.error = `Valor no permitido. Valores válidos: ${config.allowedValues.join(', ')}`;
                    }
                    break;
                    
                case 'string-array':
                    const values = Array.isArray(value) ? value : value.split(',').map(v => v.trim());
                    if (!Array.isArray(values) || values.length === 0) {
                        result.valid = false;
                        result.error = 'Debe ser un array de strings no vacío';
                    }
                    break;
                    
                default:
                    // Tipo desconocido, aceptar por defecto con advertencia
                    this.logWarning(`Tipo de variable desconocido para ${varName}: ${config.type}`);
            }
        } catch (error) {
            result.valid = false;
            result.error = `Error en validación: ${error.message}`;
        }
        
        return result;
    },
    
    /**
     * Verificar si un valor es inseguro
     */
    isInsecureValue: function(varName, value) {
        if (!value || typeof value !== 'string') return false;
        
        // Verificar patrones inseguros comunes
        const insecurePatterns = [
            /localhost/i,  // Advertencia para producción
            /127\.0\.0\.1/,  // Advertencia para producción
            /password/i,     // Posible contraseña expuesta
            /secret/i,        // Posible secreto expuesto
            /key=/i,          // Posible clave API expuesta
            /token=/i         // Posible token expuesto
        ];
        
        // Solo verificar patrones localhost en producción
        const isProduction = this.getEnvironment() === 'production';
        const patterns = isProduction ? 
            insecurePatterns.filter(p => !/localhost|127\.0\.0\.1/.test(p)) : 
            insecurePatterns.filter(p => !/password|secret|key=|token=/i.test(p));
        
        return patterns.some(pattern => pattern.test(value));
    },
    
    /**
     * Sanitizar un valor cargado
     */
    sanitizeValue: function(varName, value) {
        if (!value || typeof value !== 'string') return value;
        
        // Importar XSSProtection si está disponible
        if (typeof XSSProtection !== 'undefined' && XSSProtection.validateInput) {
            const validation = XSSProtection.validateInput(value, {
                type: 'text',
                maxLength: 1000,
                allowEmpty: false
            });
            
            if (validation.valid) {
                return validation.sanitized;
            }
        }
        
        // Sanitización básica si XSSProtection no está disponible
        return value
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#x27;')
            .trim();
    },
    
    /**
     * Configurar medidas de seguridad adicionales
     */
    setupSecurityMeasures: function() {
        this.log('Configurando medidas de seguridad');
        
        // Prevenir acceso directo a variables sensibles
        if (typeof Object !== 'undefined' && Object.freeze) {
            Object.freeze(this._config);
        }
        
        // Limpiar variables temporales si existen
        if (typeof window !== 'undefined') {
            delete window.ENV;
        }
        
        // Configurar detección de manipulación
        this.setupTamperingDetection();
    },
    
    /**
     * Configurar detección de manipulación
     */
    setupTamperingDetection: function() {
        // Guardar hash de la configuración para detectar cambios
        if (typeof btoa !== 'undefined') {
            this._configHash = btoa(JSON.stringify(this._config));
        }
    },
    
    /**
     * Verificar si la configuración ha sido manipulada
     */
    isConfigurationTampered: function() {
        if (!this._configHash) return false;
        
        try {
            const currentHash = btoa(JSON.stringify(this._config));
            return currentHash !== this._configHash;
        } catch (error) {
            return true; // Si hay error, asumir manipulación
        }
    },
    
    /**
     * Obtener valor de configuración de forma segura
     */
    get: function(varName, defaultValue = null) {
        if (!this._loaded) {
            this.logWarning('Intento de acceso antes de inicializar');
            return defaultValue;
        }
        
        if (this.isConfigurationTampered()) {
            this.logError('Detectada manipulación en la configuración');
            return defaultValue;
        }
        
        return this._config[varName] || defaultValue;
    },
    
    /**
     * Obtener URL de API según entorno actual
     */
    getApiUrl: function() {
        const env = this.getEnvironment();
        
        if (env === 'production') {
            const prodUrl = this.get('PRODUCTION_API_URL');
            if (prodUrl) {
                return prodUrl;
            }
            this.logWarning('PRODUCTION_API_URL no configurada, usando fallback');
        }
        
        // Para desarrollo o fallback
        return this.get('DEVELOPMENT_API_URL', '/api');
    },
    
    /**
     * Obtener lista de issuers JWT válidos
     */
    getValidJwtIssuers: function() {
        const issuers = this.get('VALID_JWT_ISSUERS');
        
        if (Array.isArray(issuers)) {
            return issuers;
        }
        
        if (typeof issuers === 'string') {
            return issuers.split(',').map(issuer => issuer.trim());
        }
        
        return ['justice2-system']; // Fallback seguro
    },
    
    /**
     * Detectar entorno actual
     */
    getEnvironment: function() {
        const defaultEnv = this.get('DEFAULT_ENVIRONMENT', 'auto');
        
        if (defaultEnv !== 'auto') {
            return defaultEnv;
        }
        
        // Detección automática
        if (typeof window !== 'undefined' && window.location) {
            const hostname = window.location.hostname;
            
            // Patrones de producción
            const productionPatterns = [
                /^(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/,
                /^.*\.herokuapp\.com$/,
                /^.*\.netlify\.app$/
            ];
            
            const isProduction = productionPatterns.some(pattern => pattern.test(hostname));
            return isProduction ? 'production' : 'development';
        }
        
        return 'development'; // Fallback seguro
    },
    
    /**
     * Validar URL
     */
    isValidUrl: function(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch (error) {
            return false;
        }
    },
    
    /**
     * Manejar error crítico de configuración
     */
    handleCriticalError: function(error) {
        console.error('ERROR CRÍTICO DE CONFIGURACIÓN:', error);
        
        // En producción, podría redirigir a una página de error
        if (this.getEnvironment() === 'production' && typeof window !== 'undefined') {
            document.body.innerHTML = `
                <div style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    background: #f8f9fa;
                    color: #333;
                    font-family: Arial, sans-serif;
                    text-align: center;
                ">
                    <div>
                        <h1 style="color: #dc3545;">⚠️ Error de Configuración</h1>
                        <p>La aplicación no puede iniciarse debido a un error de configuración.</p>
                        <p>Por favor, contacte al administrador del sistema.</p>
                    </div>
                </div>
            `;
        }
    },
    
    /**
     * Logging seguro
     */
    log: function(...args) {
        if (this.getEnvironment() === 'development') {
            console.log('[EnvConfig]', ...args);
        }
    },
    
    logWarning: function(message) {
        console.warn('[EnvConfig WARNING]', message);
    },
    
    logError: function(message, error = null) {
        console.error('[EnvConfig ERROR]', message, error || '');
    },
    
    /**
     * Obtener estado del sistema
     */
    getStatus: function() {
        return {
            loaded: this._loaded,
            validated: this._validated,
            environment: this.getEnvironment(),
            variablesCount: Object.keys(this._config).length,
            tampered: this.isConfigurationTampered()
        };
    }
};

// Auto-inicialización si estamos en el navegador
if (typeof window !== 'undefined') {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            EnvConfig.init();
        });
    } else {
        EnvConfig.init();
    }
    
    // Exportar para uso global
    window.EnvConfig = EnvConfig;
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvConfig;
}