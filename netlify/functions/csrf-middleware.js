/**
 * Justice 2 CSRF Middleware
 * Middleware de Express para protección CSRF en Netlify Functions
 */

const crypto = require('crypto');

const CSFRMiddleware = {
    // Configuración
    config: {
        tokenLength: 64,                    // Longitud del token
        tokenExpiry: 2 * 60 * 60 * 1000,   // 2 horas en milisegundos
        cookieName: 'justice2_csrf_token',
        headerName: 'X-CSRF-Token',
        paramName: '_csrf',
        secretKey: process.env.CSRF_SECRET_KEY || 'default-secret-key-change-in-production',
        secureCookies: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxTokensPerSession: 5,
        rotationInterval: 30 * 60 * 1000, // 30 minutos
        enableLogging: true
    },

    // Almacenamiento de tokens (en producción usar Redis o base de datos)
    tokenStore: new Map(),

    // Generar token CSRF seguro
    generateToken: function(sessionId) {
        const timestamp = Date.now();
        const randomBytes = crypto.randomBytes(this.config.tokenLength);
        const randomString = randomBytes.toString('hex');
        
        // Crear payload del token
        const payload = {
            sessionId: sessionId,
            timestamp: timestamp,
            random: randomString
        };
        
        // Firmar el token
        const signature = this.signToken(payload);
        
        // Crear token completo
        const token = Buffer.from(JSON.stringify({
            data: payload,
            sig: signature
        })).toString('base64url');
        
        // Almacenar información del token
        this.tokenStore.set(token, {
            sessionId: sessionId,
            created: timestamp,
            used: 0,
            lastUsed: null
        });
        
        // Limpiar tokens antiguos
        this.cleanupExpiredTokens();
        
        if (this.config.enableLogging) {
            console.log('[CSRF] Token generado para sesión:', sessionId);
        }
        
        return token;
    },

    // Firmar token con HMAC
    signToken: function(payload) {
        const data = JSON.stringify(payload);
        return crypto
            .createHmac('sha256', this.config.secretKey)
            .update(data)
            .digest('hex');
    },

    // Verificar firma del token
    verifyTokenSignature: function(tokenData, signature) {
        const expectedSignature = this.signToken(tokenData);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    },

    // Validar token CSRF
    validateToken: function(token, sessionId) {
        if (!token) {
            this.logSecurityEvent('csrf_token_missing', { sessionId });
            return false;
        }

        try {
            // Decodificar token
            const decoded = Buffer.from(token, 'base64url').toString();
            const tokenObj = JSON.parse(decoded);
            
            if (!tokenObj.data || !tokenObj.sig) {
                this.logSecurityEvent('csrf_token_invalid_format', { 
                    token: token.substring(0, 20) + '...',
                    sessionId 
                });
                return false;
            }

            const { data, sig } = tokenObj;
            
            // Validar firma
            if (!this.verifyTokenSignature(data, sig)) {
                this.logSecurityEvent('csrf_token_invalid_signature', { 
                    token: token.substring(0, 20) + '...',
                    sessionId 
                });
                return false;
            }

            // Validar sesión
            if (data.sessionId !== sessionId) {
                this.logSecurityEvent('csrf_token_session_mismatch', { 
                    tokenSessionId: data.sessionId,
                    currentSessionId: sessionId 
                });
                return false;
            }

            // Validar expiración
            const tokenAge = Date.now() - data.timestamp;
            if (tokenAge > this.config.tokenExpiry) {
                this.logSecurityEvent('csrf_token_expired', { 
                    tokenAge,
                    maxAge: this.config.tokenExpiry,
                    sessionId 
                });
                return false;
            }

            // Verificar que el token exista en nuestro store
            const tokenInfo = this.tokenStore.get(token);
            if (!tokenInfo) {
                this.logSecurityEvent('csrf_token_not_found', { 
                    token: token.substring(0, 20) + '...',
                    sessionId 
                });
                return false;
            }

            // Actualizar información de uso
            tokenInfo.used++;
            tokenInfo.lastUsed = Date.now();
            
            if (this.config.enableLogging) {
                console.log('[CSRF] Token validado para sesión:', sessionId);
            }

            return true;

        } catch (error) {
            this.logSecurityEvent('csrf_token_validation_error', { 
                error: error.message,
                token: token.substring(0, 20) + '...',
                sessionId 
            });
            return false;
        }
    },

    // Middleware principal de CSRF
    middleware: function(options = {}) {
        const config = { ...this.config, ...options };
        
        return (req, res, next) => {
            // Métodos que requieren protección CSRF
            const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
            const method = req.method ? req.method.toUpperCase() : 'GET';
            
            // Si es un método seguro, continuar
            if (!protectedMethods.includes(method)) {
                return next();
            }

            // Obtener sesión del usuario (del JWT o sesión)
            const sessionId = this.getSessionId(req);
            
            if (!sessionId) {
                return this.handleCSRFError(res, 'NO_SESSION', 'No hay sesión activa');
            }

            // Obtener token CSRF de la petición
            const csrfToken = this.extractCSRFToken(req);
            
            if (!csrfToken) {
                return this.handleCSRFError(res, 'TOKEN_MISSING', 'Token CSRF no proporcionado');
            }

            // Validar token
            if (!this.validateToken(csrfToken, sessionId)) {
                return this.handleCSRFError(res, 'TOKEN_INVALID', 'Token CSRF inválido');
            }

            // Token válido, continuar
            next();
        };
    },

    // Obtener ID de sesión de la petición
    getSessionId: function(req) {
        // Intentar obtener del JWT
        if (req.user && req.user.sub) {
            return req.user.sub;
        }
        
        // Intentar obtener de la sesión
        if (req.session && req.session.id) {
            return req.session.id;
        }
        
        // Intentar obtener del header de autorización
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                    return payload.sub;
                }
            } catch (error) {
                // Error parseando JWT
            }
        }
        
        return null;
    },

    // Extraer token CSRF de la petición
    extractCSRFToken: function(req) {
        // Buscar en headers
        const headerToken = req.headers[this.config.headerName.toLowerCase()];
        if (headerToken) {
            return headerToken;
        }
        
        // Buscar en body (JSON)
        if (req.body && req.body[this.config.paramName]) {
            return req.body[this.config.paramName];
        }
        
        // Buscar en body (form data)
        if (req.body && typeof req.body === 'object') {
            for (const key in req.body) {
                if (key === this.config.paramName) {
                    return req.body[key];
                }
            }
        }
        
        return null;
    },

    // Manejar errores CSRF
    handleCSRFError: function(res, code, message) {
        this.logSecurityEvent('csrf_protection_triggered', { code, message });
        
        res.status(403).json({
            error: 'Error de seguridad CSRF',
            code: code,
            message: message,
            timestamp: new Date().toISOString()
        });
    },

    // Generar token para el cliente
    generateTokenForClient: function(req, res) {
        const sessionId = this.getSessionId(req);
        
        if (!sessionId) {
            return res.status(401).json({
                error: 'No hay sesión activa',
                code: 'NO_SESSION'
            });
        }
        
        const token = this.generateToken(sessionId);
        
        // Configurar cookie si se solicita
        if (req.query.cookie === 'true') {
            res.cookie(this.config.cookieName, token, {
                httpOnly: false, // Para que JavaScript pueda acceder
                secure: this.config.secureCookies,
                sameSite: this.config.sameSite,
                maxAge: this.config.tokenExpiry
            });
        }
        
        res.json({
            csrfToken: token,
            expiresIn: this.config.tokenExpiry,
            timestamp: Date.now()
        });
    },

    // Limpiar tokens expirados
    cleanupExpiredTokens: function() {
        const now = Date.now();
        const expiredTokens = [];
        
        for (const [token, info] of this.tokenStore.entries()) {
            if (now - info.created > this.config.tokenExpiry) {
                expiredTokens.push(token);
            }
        }
        
        expiredTokens.forEach(token => {
            this.tokenStore.delete(token);
        });
        
        if (expiredTokens.length > 0 && this.config.enableLogging) {
            console.log(`[CSRF] Limpiados ${expiredTokens.length} tokens expirados`);
        }
    },

    // Limpiar tokens antiguos por sesión
    cleanupOldTokens: function(sessionId) {
        const sessionTokens = [];
        
        for (const [token, info] of this.tokenStore.entries()) {
            if (info.sessionId === sessionId) {
                sessionTokens.push({ token, info });
            }
        }
        
        // Ordenar por fecha de creación (más nuevos primero)
        sessionTokens.sort((a, b) => b.info.created - a.info.created);
        
        // Mantener solo los más recientes
        const tokensToRemove = sessionTokens.slice(this.config.maxTokensPerSession);
        
        tokensToRemove.forEach(({ token }) => {
            this.tokenStore.delete(token);
        });
        
        if (tokensToRemove.length > 0 && this.config.enableLogging) {
            console.log(`[CSRF] Eliminados ${tokensToRemove.length} tokens antiguos para sesión: ${sessionId}`);
        }
    },

    // Invalidar todos los tokens de una sesión
    invalidateSessionTokens: function(sessionId) {
        let invalidatedCount = 0;
        
        for (const [token, info] of this.tokenStore.entries()) {
            if (info.sessionId === sessionId) {
                this.tokenStore.delete(token);
                invalidatedCount++;
            }
        }
        
        if (this.config.enableLogging) {
            console.log(`[CSRF] Invalidados ${invalidatedCount} tokens para sesión: ${sessionId}`);
        }
        
        return invalidatedCount;
    },

    // Obtener estadísticas de seguridad
    getSecurityStats: function() {
        const now = Date.now();
        const last24Hours = now - (24 * 60 * 60 * 1000);
        
        let recentTokens = 0;
        let activeTokens = 0;
        const sessions = new Set();
        
        for (const [token, info] of this.tokenStore.entries()) {
            sessions.add(info.sessionId);
            
            if (now - info.created < last24Hours) {
                recentTokens++;
            }
            
            if (now - info.created < this.config.tokenExpiry) {
                activeTokens++;
            }
        }
        
        return {
            totalTokens: this.tokenStore.size,
            activeTokens: activeTokens,
            recentTokens: recentTokens,
            totalSessions: sessions.size,
            config: {
                tokenExpiry: this.config.tokenExpiry,
                maxTokensPerSession: this.config.maxTokensPerSession,
                secureCookies: this.config.secureCookies
            }
        };
    },

    // Logging de eventos de seguridad
    logSecurityEvent: function(eventType, details) {
        const event = {
            type: eventType,
            details: details,
            timestamp: new Date().toISOString(),
            service: 'csrf-middleware'
        };
        
        if (this.config.enableLogging) {
            console.warn('[CSRF Security Event]', event);
        }
        
        // En producción, enviar a sistema de monitoreo
        if (process.env.NODE_ENV === 'production') {
            // Aquí se podría enviar a Elasticsearch, CloudWatch, etc.
        }
    },

    // Endpoint para obtener token CSRF
    setupCSRFEndpoint: function(router) {
        router.get('/csrf/token', (req, res) => {
            this.generateTokenForClient(req, res);
        });
        
        router.post('/csrf/validate', (req, res) => {
            const { token } = req.body;
            const sessionId = this.getSessionId(req);
            
            if (!sessionId) {
                return res.status(401).json({
                    valid: false,
                    error: 'No hay sesión activa'
                });
            }
            
            const isValid = this.validateToken(token, sessionId);
            
            res.json({
                valid: isValid,
                timestamp: Date.now()
            });
        });
        
        router.get('/csrf/stats', (req, res) => {
            // Solo administradores pueden ver estadísticas
            if (req.user && req.user.role === 'admin') {
                const stats = this.getSecurityStats();
                res.json(stats);
            } else {
                res.status(403).json({
                    error: 'Acceso denegado'
                });
            }
        });
    },

    // Inicialización del middleware
    init: function(options = {}) {
        // Actualizar configuración
        this.config = { ...this.config, ...options };
        
        // Validar clave secreta
        if (!this.config.secretKey || this.config.secretKey === 'default-secret-key-change-in-production') {
            if (process.env.NODE_ENV === 'production') {
                console.error('[CSRF] ADVERTENCIA: Usando clave secreta por defecto en producción');
                console.error('[CSRF] Configure CSRF_SECRET_KEY en variables de entorno');
            }
        }
        
        // Configurar limpieza periódica
        setInterval(() => {
            this.cleanupExpiredTokens();
        }, 5 * 60 * 1000); // Cada 5 minutos
        
        if (this.config.enableLogging) {
            console.log('[CSRF] Middleware inicializado');
            console.log('[CSRF] Configuración:', {
                tokenLength: this.config.tokenLength,
                tokenExpiry: this.config.tokenExpiry,
                secureCookies: this.config.secureCookies,
                sameSite: this.config.sameSite
            });
        }
    }
};

module.exports = CSFRMiddleware;