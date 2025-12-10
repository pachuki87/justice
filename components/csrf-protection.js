/**
 * Justice 2 CSRF Protection System
 * Sistema completo de protección contra ataques Cross-Site Request Forgery
 */

const CSRFProtection = {
    // Configuración
    config: {
        tokenLength: 64,           // Longitud del token CSRF
        tokenExpiry: 2 * 60 * 60 * 1000, // 2 horas de expiración
        cookieName: 'justice2_csrf_token',
        headerName: 'X-CSRF-Token',
        paramName: '_csrf',
        storageType: 'localStorage', // 'localStorage' o 'cookie'
        rotationInterval: 30 * 60 * 1000, // 30 minutos para rotación
        maxTokens: 5,              // Máximo de tokens almacenados
        secureCookies: true,        // Solo enviar cookies por HTTPS en producción
        sameSite: 'strict'         // Política SameSite para cookies
    },

    // Estado del sistema
    state: {
        currentToken: null,
        tokenCreated: null,
        lastRotation: Date.now(),
        tokens: new Map(),          // Tokens válidos por sesión
        rotationTimer: null,
        isInitialized: false,
        securityEvents: []
    },

    // Inicialización del sistema
    init: function() {
        if (this.state.isInitialized) {
            return;
        }

        this.log('Inicializando sistema de protección CSRF');
        
        // Detectar entorno
        this.detectEnvironment();
        
        // Inicializar token actual
        this.initializeToken();
        
        // Configurar rotación automática
        this.setupTokenRotation();
        
        // Limpiar tokens expirados
        this.cleanupExpiredTokens();
        
        // Configurar eventos de seguridad
        this.setupSecurityEvents();
        
        this.state.isInitialized = true;
        this.log('Sistema CSRF inicializado correctamente');
    },

    // Detectar entorno (producción/desarrollo)
    detectEnvironment: function() {
        const isDevelopment = window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1' ||
                             window.location.hostname.includes('dev');
        
        if (isDevelopment) {
            this.config.secureCookies = false;
            this.config.sameSite = 'lax';
            this.log('Modo desarrollo detectado - ajustando configuración CSRF');
        }
    },

    // Generar token CSRF criptográficamente seguro
    generateToken: function() {
        const array = new Uint8Array(this.config.tokenLength);
        crypto.getRandomValues(array);
        
        // Convertir a string hexadecimal
        let token = '';
        for (let i = 0; i < array.length; i++) {
            token += array[i].toString(16).padStart(2, '0');
        }
        
        // Agregar timestamp y firma
        const timestamp = Date.now();
        const signature = this.signToken(token, timestamp);
        
        return `${token}.${timestamp}.${signature}`;
    },

    // Firmar token con HMAC
    signToken: function(token, timestamp) {
        // En una implementación real, esto debería usar una clave secreta del servidor
        // Para el cliente, usamos una firma simple basada en el token y timestamp
        const data = `${token}.${timestamp}`;
        let hash = 0;
        
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32-bit integer
        }
        
        return Math.abs(hash).toString(16);
    },

    // Validar firma del token
    validateTokenSignature: function(token, timestamp, signature) {
        const expectedSignature = this.signToken(token, timestamp);
        return signature === expectedSignature;
    },

    // Inicializar token CSRF
    initializeToken: function() {
        // Intentar recuperar token existente
        const existingToken = this.getStoredToken();
        
        if (existingToken && this.validateToken(existingToken)) {
            this.state.currentToken = existingToken;
            this.state.tokenCreated = this.extractTimestamp(existingToken);
            this.log('Token CSRF existente recuperado y validado');
        } else {
            // Generar nuevo token
            this.regenerateToken();
        }
    },

    // Obtener token almacenado
    getStoredToken: function() {
        if (this.config.storageType === 'cookie') {
            return this.getCookie(this.config.cookieName);
        } else {
            return localStorage.getItem(this.config.cookieName);
        }
    },

    // Almacenar token
    storeToken: function(token) {
        if (this.config.storageType === 'cookie') {
            this.setCookie(this.config.cookieName, token, {
                expires: new Date(Date.now() + this.config.tokenExpiry),
                secure: this.config.secureCookies,
                sameSite: this.config.sameSite
            });
        } else {
            localStorage.setItem(this.config.cookieName, token);
        }
        
        // También mantener en memoria para acceso rápido
        this.state.tokens.set(token, {
            created: Date.now(),
            used: 0
        });
    },

    // Generar nuevo token
    regenerateToken: function() {
        const newToken = this.generateToken();
        
        // Invalidar token anterior
        if (this.state.currentToken) {
            this.invalidateToken(this.state.currentToken);
        }
        
        // Establecer nuevo token
        this.state.currentToken = newToken;
        this.state.tokenCreated = Date.now();
        this.state.lastRotation = Date.now();
        
        // Almacenar token
        this.storeToken(newToken);
        
        // Limpiar tokens antiguos
        this.cleanupOldTokens();
        
        this.log('Nuevo token CSRF generado');
        this.logSecurityEvent('csrf_token_generated', {
            tokenLength: newToken.length,
            timestamp: Date.now()
        });
        
        return newToken;
    },

    // Obtener token CSRF actual
    getToken: function() {
        if (!this.state.isInitialized) {
            this.init();
        }
        
        // Verificar si el token necesita rotación
        if (this.shouldRotateToken()) {
            this.regenerateToken();
        }
        
        return this.state.currentToken;
    },

    // Verificar si el token necesita rotación
    shouldRotateToken: function() {
        const now = Date.now();
        const tokenAge = now - this.state.lastRotation;
        
        return tokenAge >= this.config.rotationInterval;
    },

    // Validar token CSRF
    validateToken: function(token) {
        if (!token) {
            this.logSecurityEvent('csrf_token_missing', {
                timestamp: Date.now()
            });
            return false;
        }
        
        try {
            // Parsear token
            const [tokenData, timestamp, signature] = token.split('.');
            
            if (!tokenData || !timestamp || !signature) {
                this.logSecurityEvent('csrf_token_invalid_format', {
                    token: token.substring(0, 20) + '...',
                    timestamp: Date.now()
                });
                return false;
            }
            
            // Validar firma
            if (!this.validateTokenSignature(tokenData, timestamp, signature)) {
                this.logSecurityEvent('csrf_token_invalid_signature', {
                    token: token.substring(0, 20) + '...',
                    timestamp: Date.now()
                });
                return false;
            }
            
            // Validar expiración
            const tokenAge = Date.now() - parseInt(timestamp);
            if (tokenAge > this.config.tokenExpiry) {
                this.logSecurityEvent('csrf_token_expired', {
                    tokenAge: tokenAge,
                    maxAge: this.config.tokenExpiry,
                    timestamp: Date.now()
                });
                return false;
            }
            
            // Validar que el token esté en nuestra lista de tokens válidos
            const tokenInfo = this.state.tokens.get(token);
            if (!tokenInfo) {
                this.logSecurityEvent('csrf_token_not_found', {
                    token: token.substring(0, 20) + '...',
                    timestamp: Date.now()
                });
                return false;
            }
            
            // Incrementar uso del token
            tokenInfo.used++;
            
            return true;
            
        } catch (error) {
            this.logSecurityEvent('csrf_token_validation_error', {
                error: error.message,
                token: token.substring(0, 20) + '...',
                timestamp: Date.now()
            });
            return false;
        }
    },

    // Extraer timestamp del token
    extractTimestamp: function(token) {
        try {
            const parts = token.split('.');
            return parts.length >= 2 ? parseInt(parts[1]) : Date.now();
        } catch (error) {
            return Date.now();
        }
    },

    // Invalidar token
    invalidateToken: function(token) {
        this.state.tokens.delete(token);
        
        // Eliminar del almacenamiento
        if (this.config.storageType === 'cookie') {
            this.deleteCookie(this.config.cookieName);
        } else {
            localStorage.removeItem(this.config.cookieName);
        }
        
        this.logSecurityEvent('csrf_token_invalidated', {
            token: token.substring(0, 20) + '...',
            timestamp: Date.now()
        });
    },

    // Configurar rotación automática
    setupTokenRotation: function() {
        if (this.state.rotationTimer) {
            clearInterval(this.state.rotationTimer);
        }
        
        this.state.rotationTimer = setInterval(() => {
            if (this.shouldRotateToken()) {
                this.regenerateToken();
            }
        }, this.config.rotationInterval);
    },

    // Limpiar tokens expirados
    cleanupExpiredTokens: function() {
        const now = Date.now();
        const expiredTokens = [];
        
        for (const [token, info] of this.state.tokens.entries()) {
            if (now - info.created > this.config.tokenExpiry) {
                expiredTokens.push(token);
            }
        }
        
        expiredTokens.forEach(token => {
            this.state.tokens.delete(token);
        });
        
        if (expiredTokens.length > 0) {
            this.log(`Limpiados ${expiredTokens.length} tokens CSRF expirados`);
        }
    },

    // Limpiar tokens antiguos (mantener solo los más recientes)
    cleanupOldTokens: function() {
        if (this.state.tokens.size <= this.config.maxTokens) {
            return;
        }
        
        // Ordenar tokens por fecha de creación
        const sortedTokens = Array.from(this.state.tokens.entries())
            .sort((a, b) => a[1].created - b[1].created);
        
        // Eliminar los más antiguos
        const tokensToRemove = sortedTokens.slice(0, sortedTokens.length - this.config.maxTokens);
        
        tokensToRemove.forEach(([token]) => {
            this.state.tokens.delete(token);
        });
        
        if (tokensToRemove.length > 0) {
            this.log(`Eliminados ${tokensToRemove.length} tokens CSRF antiguos`);
        }
    },

    // Configurar eventos de seguridad
    setupSecurityEvents: function() {
        // Escuchar eventos de sesión
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Detectar posibles ataques CSRF
        this.detectPotentialCSRFAttacks();
    },

    // Detectar posibles ataques CSRF
    detectPotentialCSRFAttacks: function() {
        // Monitorear peticiones AJAX sin token CSRF
        const originalFetch = window.fetch;
        
        window.fetch = (...args) => {
            const [url, options = {}] = args;
            
            // Verificar si es una petición a nuestro dominio que requiere protección
            if (this.requiresCSRFProtection(url, options)) {
                const hasCSRFToken = this.hasCSRFToken(options);
                
                if (!hasCSRFToken) {
                    this.logSecurityEvent('csrf_missing_token_request', {
                        url: url,
                        method: options.method || 'GET',
                        timestamp: Date.now()
                    });
                }
            }
            
            return originalFetch(...args);
        };
    },

    // Verificar si una petición requiere protección CSRF
    requiresCSRFProtection: function(url, options) {
        // Solo proteger peticiones a nuestro dominio
        if (!url.includes(window.location.hostname)) {
            return false;
        }
        
        // Métodos que requieren protección
        const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
        const method = (options.method || 'GET').toUpperCase();
        
        return protectedMethods.includes(method);
    },

    // Verificar si una petición tiene token CSRF
    hasCSRFToken: function(options) {
        // Verificar en headers
        if (options.headers && options.headers[this.config.headerName]) {
            return true;
        }
        
        // Verificar en body (form data)
        if (options.body) {
            if (typeof options.body === 'string') {
                try {
                    const data = JSON.parse(options.body);
                    return data[this.config.paramName] !== undefined;
                } catch (e) {
                    // No es JSON, verificar si contiene el parámetro
                    return options.body.includes(`${this.config.paramName}=`);
                }
            }
        }
        
        return false;
    },

    // Agregar token CSRF a formulario
    addTokenToForm: function(form) {
        if (!form || !this.state.currentToken) {
            return;
        }
        
        // Buscar input CSRF existente
        let csrfInput = form.querySelector(`input[name="${this.config.paramName}"]`);
        
        if (!csrfInput) {
            // Crear nuevo input CSRF
            csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = this.config.paramName;
            form.appendChild(csrfInput);
        }
        
        csrfInput.value = this.state.currentToken;
        
        this.log('Token CSRF agregado al formulario');
    },

    // Agregar token CSRF a todas las peticiones AJAX
    addTokenToRequest: function(options = {}) {
        if (!this.state.currentToken) {
            return options;
        }
        
        // Inicializar headers si no existen
        options.headers = options.headers || {};
        
        // Agregar token CSRF como header
        options.headers[this.config.headerName] = this.state.currentToken;
        
        return options;
    },

    // Agregar token CSRF a FormData
    addTokenToFormData: function(formData) {
        if (!formData || !this.state.currentToken) {
            return formData;
        }
        
        formData.append(this.config.paramName, this.state.currentToken);
        
        return formData;
    },

    // Configurar protección automática para formularios
    setupFormProtection: function() {
        // Agregar token a todos los formularios existentes
        document.querySelectorAll('form').forEach(form => {
            this.addTokenToForm(form);
        });
        
        // Observar nuevos formularios
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'FORM') {
                            this.addTokenToForm(node);
                        } else {
                            // Buscar formularios dentro del nodo añadido
                            const forms = node.querySelectorAll('form');
                            forms.forEach(form => this.addTokenToForm(form));
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.log('Protección CSRF automática configurada para formularios');
    },

    // Configurar protección para AJAX
    setupAJAXProtection: function() {
        // Sobrescribir XMLHttpRequest para agregar token CSRF automáticamente
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._csrfMethod = method;
            this._csrfUrl = url;
            return originalXHROpen.apply(this, [method, url, ...args]);
        };
        
        XMLHttpRequest.prototype.send = function(data) {
            // Verificar si requiere protección CSRF
            if (CSRFProtection.requiresCSRFProtection(this._csrfUrl, { method: this._csrfMethod })) {
                // Agregar token CSRF si no existe
                if (!CSRFProtection.hasCSRFToken({ headers: this._csrfHeaders, body: data })) {
                    CSRFProtection.addTokenToRequest({
                        headers: this._csrfHeaders,
                        body: data
                    });
                }
            }
            
            return originalXHRSend.apply(this, [data]);
        };
        
        this.log('Protección CSRF automática configurada para AJAX');
    },

    // Logging de eventos de seguridad
    logSecurityEvent: function(eventType, details) {
        const event = {
            type: eventType,
            details: details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.state.securityEvents.push(event);
        
        // Mantener solo los últimos 100 eventos
        if (this.state.securityEvents.length > 100) {
            this.state.securityEvents.shift();
        }
        
        // En desarrollo, mostrar en consola
        if (window.location.hostname === 'localhost') {
            console.warn('[CSRF Protection Security Event]', event);
        }
        
        // En producción, enviar al servidor
        if (window.location.hostname !== 'localhost') {
            this.sendSecurityEventToServer(event);
        }
    },

    // Enviar evento de seguridad al servidor
    sendSecurityEventToServer: function(event) {
        // Solo enviar eventos críticos
        const criticalEvents = [
            'csrf_token_invalid_signature',
            'csrf_token_expired',
            'csrf_token_not_found',
            'csrf_missing_token_request'
        ];
        
        if (!criticalEvents.includes(event.type)) {
            return;
        }
        
        fetch('/api/security/csrf-event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        }).catch(error => {
            // Silenciar errores de logging para no afectar la UX
            console.warn('Error enviando evento CSRF:', error);
        });
    },

    // Obtener estadísticas de seguridad
    getSecurityStats: function() {
        const now = Date.now();
        const last24Hours = now - (24 * 60 * 60 * 1000);
        
        const recentEvents = this.state.securityEvents.filter(
            event => new Date(event.timestamp).getTime() > last24Hours
        );
        
        return {
            totalTokens: this.state.tokens.size,
            currentTokenAge: this.state.currentToken ? 
                now - this.state.tokenCreated : 0,
            lastRotation: this.state.lastRotation,
            securityEvents24h: recentEvents.length,
            securityEventsByType: this.groupEventsByType(recentEvents),
            isInitialized: this.state.isInitialized
        };
    },

    // Agrupar eventos por tipo
    groupEventsByType: function(events) {
        const grouped = {};
        
        events.forEach(event => {
            grouped[event.type] = (grouped[event.type] || 0) + 1;
        });
        
        return grouped;
    },

    // Forzar rotación de token
    forceTokenRotation: function() {
        this.regenerateToken();
        this.log('Rotación de token CSRF forzada');
    },

    // Limpiar recursos
    cleanup: function() {
        if (this.state.rotationTimer) {
            clearInterval(this.state.rotationTimer);
            this.state.rotationTimer = null;
        }
        
        this.state.tokens.clear();
        this.log('Recursos CSRF limpiados');
    },

    // Utilidades de cookies
    getCookie: function(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        
        return null;
    },

    setCookie: function(name, value, options = {}) {
        let cookieString = `${name}=${value}`;
        
        if (options.expires) {
            cookieString += `; expires=${options.expires.toUTCString()}`;
        }
        
        if (options.path) {
            cookieString += `; path=${options.path}`;
        }
        
        if (options.domain) {
            cookieString += `; domain=${options.domain}`;
        }
        
        if (options.secure) {
            cookieString += '; secure';
        }
        
        if (options.sameSite) {
            cookieString += `; samesite=${options.sameSite}`;
        }
        
        document.cookie = cookieString;
    },

    deleteCookie: function(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    },

    // Logging
    log: function(...args) {
        if (window.location.hostname === 'localhost') {
            console.log('[CSRF Protection]', ...args);
        }
    }
};

// Auto-inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CSRFProtection.init();
        CSRFProtection.setupFormProtection();
        CSRFProtection.setupAJAXProtection();
    });
} else {
    CSRFProtection.init();
    CSRFProtection.setupFormProtection();
    CSRFProtection.setupAJAXProtection();
}

// Exportar para uso global
window.CSRFProtection = CSRFProtection;