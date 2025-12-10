/**
 * Justice 2 XSS Protection System
 * Sistema centralizado de protección contra ataques XSS
 * Versión mejorada con sanitización completa y validación robusta
 */

const XSSProtection = {
    // Configuración
    config: {
        // Límites de longitud para prevenir ataques
        maxInputLength: 10000,
        maxUrlLength: 2048,
        
        // Protocolos permitidos
        allowedProtocols: ['https:', 'http:', 'ftp:', 'mailto:', 'tel:'],
        
        // Atributos peligrosos a bloquear
        dangerousAttributes: [
            'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
            'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown',
            'onkeyup', 'onkeypress', 'ondblclick', 'oncontextmenu',
            'ondrag', 'ondrop', 'onscroll', 'onresize', 'onunload'
        ],
        
        // Etiquetas HTML peligrosas
        dangerousTags: [
            'script', 'iframe', 'object', 'embed', 'applet',
            'meta', 'link', 'style', 'form', 'input', 'textarea'
        ],
        
        // Patrones de ataque XSS
        xssPatterns: [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
            /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
            /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /data:text\/html/gi,
            /data:application\/javascript/gi,
            /on\w+\s*=/gi,
            /eval\s*\(/gi,
            /expression\s*\(/gi,
            /@import/gi,
            /binding:/gi,
            /<link[^>]*>/gi,
            /<meta[^>]*>/gi,
            /<style[^>]*>.*?<\/style>/gi
        ]
    },

    // Estado del sistema
    state: {
        initialized: false,
        blockedAttempts: 0,
        lastBlockedAttempt: null,
        securityLog: []
    },

    // Inicialización
    init: function() {
        if (this.state.initialized) return;
        
        this.log('Inicializando sistema de protección XSS');
        this.state.initialized = true;
        
        // Configurar interceptores globales si es necesario
        this.setupGlobalInterceptors();
        
        this.log('Sistema XSSProtection inicializado correctamente');
    },

    // Configurar interceptores globales
    setupGlobalInterceptors: function() {
        // Sobrescribir innerHTML de forma segura
        if (typeof Element !== 'undefined') {
            const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
            
            Object.defineProperty(Element.prototype, 'innerHTML', {
                set: function(value) {
                    // Sanitizar el valor antes de asignarlo
                    const sanitized = XSSProtection.sanitizeHtml(value);
                    originalInnerHTML.set.call(this, sanitized);
                },
                get: function() {
                    return originalInnerHTML.get.call(this);
                }
            });
        }
    },

    // Escapar HTML de forma segura
    escapeHtml: function(text) {
        if (typeof text !== 'string') return '';
        
        if (text.length > this.config.maxInputLength) {
            this.logSecurityEvent('ESCAPE_HTML_LENGTH_EXCEEDED', `Texto demasiado largo: ${text.length} caracteres`);
            return '';
        }
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Sanitizar URL de forma segura
    sanitizeUrl: function(url) {
        if (typeof url !== 'string') return '#';
        
        if (url.length > this.config.maxUrlLength) {
            this.logSecurityEvent('SANITIZE_URL_LENGTH_EXCEEDED', `URL demasiado larga: ${url.length} caracteres`);
            return '#';
        }
        
        try {
            // Eliminar espacios en blanco y caracteres de control
            const cleanUrl = url.trim().replace(/[\x00-\x1F\x7F]/g, '');
            
            // Verificar protocolos peligrosos con patrones más robustos
            const lowerUrl = cleanUrl.toLowerCase();
            
            // Patrones más estrictos para detectar protocolos peligrosos
            const dangerousProtocols = [
                /javascript\s*:/gi,
                /data\s*:\s*text\/html/gi,
                /vbscript\s*:/gi,
                /data\s*:\s*application\/javascript/gi,
                /data\s*:\s*text\/javascript/gi,
                /about\s*:/gi,
                /chrome\s*:/gi,
                /chrome-extension\s*:/gi,
                /file\s*:/gi,
                /ftp\s*:/gi  // Bloquear FTP por seguridad
            ];
            
            for (const protocol of dangerousProtocols) {
                if (protocol.test(lowerUrl)) {
                    this.logSecurityEvent('DANGEROUS_PROTOCOL_DETECTED', `Protocolo peligroso en URL: ${cleanUrl}`);
                    return '#';
                }
            }
            
            // Validar que no haya caracteres peligrosos en la URL
            const dangerousChars = [
                /<[^>]*>/gi,  // Etiquetas HTML
                /["']/g,       // Comillas
                /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g // Caracteres de control
            ];
            
            let hasDangerousChars = false;
            for (const charPattern of dangerousChars) {
                if (charPattern.test(cleanUrl)) {
                    hasDangerousChars = true;
                    break;
                }
            }
            
            if (hasDangerousChars) {
                this.logSecurityEvent('DANGEROUS_CHARS_IN_URL', `Caracteres peligrosos en URL: ${cleanUrl}`);
                return '#';
            }
            
            // Parsear URL para validación
            const parsedUrl = new URL(cleanUrl, window.location.origin);
            
            // Verificar protocolo permitido
            if (!this.config.allowedProtocols.includes(parsedUrl.protocol)) {
                this.logSecurityEvent('INVALID_PROTOCOL', `Protocolo no permitido: ${parsedUrl.protocol}`);
                return '#';
            }
            
            // Validar que el hostname no sea peligroso
            if (parsedUrl.hostname) {
                const dangerousHostnames = [
                    'localhost',
                    '127.0.0.1',
                    '0.0.0.0',
                    '::1'
                ];
                
                if (dangerousHostnames.includes(parsedUrl.hostname.toLowerCase())) {
                    this.logSecurityEvent('DANGEROUS_HOSTNAME', `Hostname peligroso: ${parsedUrl.hostname}`);
                    return '#';
                }
            }
            
            return parsedUrl.toString();
        } catch (e) {
            this.logSecurityEvent('URL_PARSE_ERROR', `Error parseando URL: ${url} - ${e.message}`);
            return '#';
        }
    },

    // Sanitizar texto eliminando contenido peligroso
    sanitizeText: function(text) {
        if (typeof text !== 'string') return '';
        
        if (text.length > this.config.maxInputLength) {
            this.logSecurityEvent('SANITIZE_TEXT_LENGTH_EXCEEDED', `Texto demasiado largo: ${text.length} caracteres`);
            return '';
        }
        
        let sanitized = text;
        
        // Aplicar patrones de XSS
        this.config.xssPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });
        
        // Eliminar caracteres de control
        sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
        
        return sanitized.trim();
    },

    // Sanitizar HTML completo
    sanitizeHtml: function(html) {
        if (typeof html !== 'string') return '';
        
        if (html.length > this.config.maxInputLength) {
            this.logSecurityEvent('SANITIZE_HTML_LENGTH_EXCEEDED', `HTML demasiado largo: ${html.length} caracteres`);
            return '';
        }
        
        let sanitized = html;
        
        // Eliminar etiquetas peligrosas
        this.config.dangerousTags.forEach(tag => {
            // Corregir regex para escapar correctamente las barras
            const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
            sanitized = sanitized.replace(regex, '');
            
            // También eliminar etiquetas de apertura sin cierre
            const openTagRegex = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
            sanitized = sanitized.replace(openTagRegex, '');
        });
        
        // Eliminar atributos peligrosos
        this.config.dangerousAttributes.forEach(attr => {
            // Corregir regex para detectar atributos con comillas simples o dobles
            const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
            sanitized = sanitized.replace(regex, '');
            
            // También eliminar atributos sin comillas
            const unquotedRegex = new RegExp(`\\s${attr}\\s*=\\s*[^\\s>]*`, 'gi');
            sanitized = sanitized.replace(unquotedRegex, '');
        });
        
        // Aplicar patrones de XSS adicionales
        this.config.xssPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });
        
        return sanitized.trim();
    },

    // Validar contenido seguro
    isValidContent: function(content) {
        if (!content || typeof content !== 'string') return false;
        
        if (content.length > this.config.maxInputLength) {
            return false;
        }
        
        // Verificar patrones peligrosos
        for (const pattern of this.config.xssPatterns) {
            if (pattern.test(content)) {
                this.logSecurityEvent('DANGEROUS_PATTERN_DETECTED', `Patrón peligroso detectado: ${pattern}`);
                return false;
            }
        }
        
        return true;
    },

    // Crear elemento DOM de forma segura
    createElementSafe: function(tagName, attributes = {}, textContent = '') {
        try {
            // Validar tagName
            if (typeof tagName !== 'string' || this.config.dangerousTags.includes(tagName.toLowerCase())) {
                this.logSecurityEvent('INVALID_TAG_NAME', `TagName inválido o peligroso: ${tagName}`);
                return document.createElement('div'); // Fallback seguro
            }
            
            const element = document.createElement(tagName);
            
            // Establecer atributos de forma segura
            Object.keys(attributes).forEach(key => {
                if (this.config.dangerousAttributes.includes(key.toLowerCase())) {
                    this.logSecurityEvent('DANGEROUS_ATTRIBUTE_BLOCKED', `Atributo peligroso bloqueado: ${key}`);
                    return; // No establecer atributos peligrosos
                }
                
                if (key === 'href' || key === 'src') {
                    element.setAttribute(key, this.sanitizeUrl(attributes[key]));
                } else {
                    element.setAttribute(key, this.escapeHtml(attributes[key]));
                }
            });
            
            // Establecer texto de forma segura
            if (textContent) {
                element.textContent = textContent;
            }
            
            return element;
        } catch (error) {
            this.logSecurityEvent('CREATE_ELEMENT_ERROR', `Error creando elemento: ${error.message}`);
            return document.createElement('div'); // Fallback seguro
        }
    },

    // Establecer innerHTML de forma segura
    setInnerHTMLSafe: function(element, html) {
        if (!element) return;
        
        const sanitized = this.sanitizeHtml(html);
        element.innerHTML = sanitized;
    },

    // Establecer texto de forma segura
    setTextContentSafe: function(element, text) {
        if (!element) return;
        
        const sanitized = this.escapeHtml(text);
        element.textContent = sanitized;
    },

    // Validar y sanitizar entrada de formulario
    sanitizeFormData: function(formData) {
        const sanitized = {};
        
        Object.keys(formData).forEach(key => {
            const value = formData[key];
            
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeText(value);
            } else if (Array.isArray(value)) {
                sanitized[key] = value.map(item => 
                    typeof item === 'string' ? this.sanitizeText(item) : item
                );
            } else {
                sanitized[key] = value;
            }
        });
        
        return sanitized;
    },

    // Crear HTML seguro para atributos
    createSafeAttribute: function(value) {
        if (typeof value !== 'string') return '';
        
        // Escapar HTML y luego reemplazar comillas dobles con entidad HTML
        return this.escapeHtml(value)
            .replace(/"/g, '"')
            .replace(/'/g, '&#x27;')
            .replace(/`/g, '&#x60;');
    },

    // Validar CSS seguro
    sanitizeCSS: function(css) {
        if (typeof css !== 'string') return '';
        
        if (css.length > this.config.maxInputLength) {
            this.logSecurityEvent('SANITIZE_CSS_LENGTH_EXCEEDED', `CSS demasiado largo: ${css.length} caracteres`);
            return '';
        }
        
        // Eliminar javascript: y expresiones peligrosas
        let sanitized = css
            .replace(/javascript:/gi, '')
            .replace(/expression\s*\(/gi, '')
            .replace(/@import/gi, '')
            .replace(/binding:/gi, '')
            .replace(/behavior\s*:/gi, '')
            .replace(/url\s*\(\s*["']?javascript:/gi, '')
            .replace(/\\x/gi, '') // Eliminar secuencias de escape hex
            .replace(/\\u/gi, '') // Eliminar secuencias de escape unicode
            .trim();
        
        // Validar que no queden patrones peligrosos
        const dangerousPatterns = [
            /javascript:/gi,
            /vbscript:/gi,
            /data:text\/html/gi,
            /expression\s*\(/gi,
            /@import/gi,
            /binding:/gi
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(sanitized)) {
                this.logSecurityEvent('DANGEROUS_CSS_PATTERN', `Patrón peligroso en CSS: ${pattern}`);
                return '';
            }
        }
        
        return sanitized;
    },

    // Registrar evento de seguridad
    logSecurityEvent: function(eventType, details) {
        const securityEvent = {
            type: eventType,
            details: details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.state.securityLog.push(securityEvent);
        this.state.blockedAttempts++;
        this.state.lastBlockedAttempt = securityEvent;
        
        // Mantener solo los últimos 100 eventos
        if (this.state.securityLog.length > 100) {
            this.state.securityLog = this.state.securityLog.slice(-100);
        }
        
        // En desarrollo, mostrar en consola
        if (window.Justice2 && window.Justice2.config && window.Justice2.config.debug) {
            console.warn('[XSSProtection] Evento de seguridad:', securityEvent);
        }
    },

    // Obtener estadísticas de seguridad
    getSecurityStats: function() {
        return {
            blockedAttempts: this.state.blockedAttempts,
            lastBlockedAttempt: this.state.lastBlockedAttempt,
            recentEvents: this.state.securityLog.slice(-10),
            totalEvents: this.state.securityLog.length
        };
    },

    // Limpiar log de seguridad
    clearSecurityLog: function() {
        this.state.securityLog = [];
        this.state.blockedAttempts = 0;
        this.state.lastBlockedAttempt = null;
    },

    // Validar entrada completa (función principal)
    validateInput: function(input, options = {}) {
        const defaults = {
            type: 'text', // text, html, url, css
            maxLength: this.config.maxInputLength,
            allowEmpty: true,
            trim: true
        };
        
        const config = { ...defaults, ...options };
        
        // Validar tipo
        if (typeof input !== 'string') {
            this.logSecurityEvent('INVALID_INPUT_TYPE', `Tipo de entrada inválido: ${typeof input}`);
            return { valid: false, sanitized: '', error: 'Tipo de entrada inválido' };
        }
        
        // Validar longitud
        if (input.length > config.maxLength) {
            this.logSecurityEvent('INPUT_TOO_LONG', `Entrada demasiado larga: ${input.length} caracteres`);
            return { valid: false, sanitized: '', error: 'Entrada demasiado larga' };
        }
        
        // Validar vacío
        if (!config.allowEmpty && input.trim() === '') {
            return { valid: false, sanitized: '', error: 'La entrada no puede estar vacía' };
        }
        
        // Aplicar trim si es necesario
        let processedInput = config.trim ? input.trim() : input;
        
        // Sanitizar según tipo
        let sanitized;
        switch (config.type) {
            case 'html':
                sanitized = this.sanitizeHtml(processedInput);
                break;
            case 'url':
                sanitized = this.sanitizeUrl(processedInput);
                break;
            case 'css':
                sanitized = this.sanitizeCSS(processedInput);
                break;
            default:
                sanitized = this.sanitizeText(processedInput);
        }
        
        // Validar contenido seguro (solo para tipos que no sean URL, ya que ya se validó)
        if (config.type !== 'url' && !this.isValidContent(sanitized)) {
            this.logSecurityEvent('INVALID_CONTENT', 'Contenido inválido detectado');
            return { valid: false, sanitized: '', error: 'Contenido no seguro' };
        }
        
        // Validación adicional para URLs
        if (config.type === 'url' && sanitized === '#') {
            return { valid: false, sanitized: '', error: 'URL no segura' };
        }
        
        return { valid: true, sanitized, error: null };
    },

    // Logging
    log: function(...args) {
        if (window.Justice2 && window.Justice2.config && window.Justice2.config.debug) {
            console.log('[XSSProtection]', ...args);
        }
    }
};

// Inicializar automáticamente si estamos en el navegador
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    XSSProtection.init();
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.XSSProtection = XSSProtection;
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = XSSProtection;
}