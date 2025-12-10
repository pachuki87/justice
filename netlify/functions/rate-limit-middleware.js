/**
 * Rate Limiting Middleware for Netlify Functions
 * Middleware de Express para rate limiting robusto
 */

const RateLimiterMiddleware = {
    // Importar el rate limiter principal
    RateLimiter: null,
    
    // Inicialización
    init: function() {
        // Importar el rate limiter del componente principal
        try {
            // Para Netlify Functions, necesitamos cargar el componente
            this.RateLimiter = require('../../components/rate-limiter.js');
            this.RateLimiter.init();
        } catch (error) {
            console.error('Error al cargar RateLimiter:', error);
            // Fallback a implementación básica
            this.RateLimiter = this.createFallbackRateLimiter();
        }
    },
    
    // Crear fallback básico si no se puede cargar el componente principal
    createFallbackRateLimiter: function() {
        return {
            state: {
                buckets: new Map(),
                metrics: { totalRequests: 0, blockedRequests: 0, rateLimitHits: 0 }
            },
            checkRateLimit: function(identifier, endpoint, tokens = 1) {
                this.state.metrics.totalRequests++;
                
                const key = `${identifier}:${endpoint}`;
                const bucket = this.state.buckets.get(key) || {
                    count: 0,
                    resetTime: Date.now() + 60000
                };
                
                if (Date.now() > bucket.resetTime) {
                    bucket.count = 0;
                    bucket.resetTime = Date.now() + 60000;
                }
                
                bucket.count++;
                this.state.buckets.set(key, bucket);
                
                if (bucket.count > 100) { // Límite básico de 100 por minuto
                    this.state.metrics.rateLimitHits++;
                    return {
                        allowed: false,
                        blocked: false,
                        reason: 'Rate limit exceeded',
                        retryAfter: 60,
                        limit: 100,
                        remaining: 0,
                        resetTime: bucket.resetTime
                    };
                }
                
                return {
                    allowed: true,
                    blocked: false,
                    limit: 100,
                    remaining: 100 - bucket.count,
                    resetTime: bucket.resetTime
                };
            }
        };
    },
    
    // Obtener IP del cliente
    getClientIP: function(req) {
        return req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress || 
               req.ip || 
               'unknown';
    },
    
    // Obtener identificador de usuario
    getUserIdentifier: function(req) {
        // Prioridad: Token JWT > API Key > Session ID > IP
        if (req.user && req.user.sub) {
            return `user:${req.user.sub}`;
        }
        
        if (req.headers['x-api-key']) {
            return `apikey:${req.headers['x-api-key']}`;
        }
        
        if (req.sessionID) {
            return `session:${req.sessionID}`;
        }
        
        const ip = this.getClientIP(req);
        return `ip:${ip}`;
    },
    
    // Middleware principal de rate limiting
    middleware: function(options = {}) {
        return (req, res, next) => {
            // Inicializar si no está hecho
            if (!this.RateLimiter) {
                this.init();
            }
            
            // Obtener identificadores
            const userIdentifier = this.getUserIdentifier(req);
            const ip = this.getClientIP(req);
            const endpoint = req.path || req.url || 'unknown';
            
            // Verificar rate limit por usuario
            const userResult = this.RateLimiter.checkRateLimit(
                userIdentifier, 
                endpoint, 
                options.tokens || 1
            );
            
            // Verificar rate limit por IP (adicional)
            const ipResult = this.RateLimiter.checkRateLimit(
                `ip:${ip}`, 
                endpoint, 
                options.tokens || 1
            );
            
            // Si alguno de los dos está bloqueado, denegar
            if (!userResult.allowed || !ipResult.allowed) {
                const result = !userResult.allowed ? userResult : ipResult;
                
                // Configurar headers de rate limiting
                res.setHeader('X-RateLimit-Limit', result.limit);
                res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
                res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
                
                if (result.retryAfter) {
                    res.setHeader('Retry-After', result.retryAfter);
                }
                
                // Log del intento de rate limit
                console.warn(`Rate limit exceeded for ${userIdentifier} at ${endpoint}:`, {
                    ip,
                    userAgent: req.headers['user-agent'],
                    result
                });
                
                // Emitir evento para monitoreo
                if (this.RateLimiter.emitEvent) {
                    this.RateLimiter.emitEvent('rate-limit:exceeded', {
                        identifier: userIdentifier,
                        ip,
                        endpoint,
                        result
                    });
                }
                
                // Responder con 429 Too Many Requests
                return res.status(429).json({
                    error: 'Too Many Requests',
                    message: result.reason || 'Rate limit exceeded',
                    retryAfter: result.retryAfter,
                    limit: result.limit,
                    remaining: Math.max(0, result.remaining),
                    resetTime: result.resetTime
                });
            }
            
            // Configurar headers informativos
            res.setHeader('X-RateLimit-Limit', userResult.limit);
            res.setHeader('X-RateLimit-Remaining', userResult.remaining);
            res.setHeader('X-RateLimit-Reset', Math.ceil(userResult.resetTime / 1000));
            
            // Continuar con la solicitud
            next();
        };
    },
    
    // Middleware específico para autenticación
    authMiddleware: function() {
        return this.middleware({
            tokens: 1, // Un token por intento de auth
            customConfig: 'auth' // Usar configuración de auth
        });
    },
    
    // Middleware para endpoints públicos
    publicMiddleware: function() {
        return this.middleware({
            tokens: 1,
            customConfig: 'public'
        });
    },
    
    // Middleware para endpoints sensibles
    sensitiveMiddleware: function() {
        return this.middleware({
            tokens: 2, // Más costoso
            customConfig: 'sensitive'
        });
    },
    
    // Middleware para API endpoints estándar
    apiMiddleware: function() {
        return this.middleware({
            tokens: 1,
            customConfig: 'default'
        });
    },
    
    // Middleware para uploads (más costoso)
    uploadMiddleware: function() {
        return this.middleware({
            tokens: 5, // Más tokens para uploads
            customConfig: 'sensitive'
        });
    },
    
    // Obtener estadísticas
    getStats: function() {
        if (!this.RateLimiter) {
            this.init();
        }
        
        return this.RateLimiter.getStats ? this.RateLimiter.getStats() : {
            metrics: { totalRequests: 0, blockedRequests: 0, rateLimitHits: 0 },
            buckets: 0,
            blocks: 0,
            violations: 0
        };
    },
    
    // Reiniciar estadísticas
    resetStats: function() {
        if (this.RateLimiter && this.RateLimiter.resetStats) {
            this.RateLimiter.resetStats();
        }
    }
};

// Auto-inicialización
RateLimiterMiddleware.init();

module.exports = RateLimiterMiddleware;