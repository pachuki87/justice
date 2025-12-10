/**
 * Justice 2 Rate Limiter
 * Sistema completo de rate limiting con algoritmo Token Bucket
 * Proporciona protección contra ataques DoS y fuerza bruta
 */

const RateLimiter = {
    // Configuración principal
    config: {
        // Algoritmo Token Bucket
        tokenBucket: {
            // Configuración por defecto
            default: {
                tokens: 100,        // Tokens iniciales
                refillRate: 10,     // Tokens por segundo
                maxTokens: 100,     // Máximo de tokens
                windowMs: 60000     // Ventana de tiempo (1 minuto)
            },
            // Configuraciones específicas por tipo de endpoint
            auth: {
                tokens: 5,           // Menos tokens para autenticación
                refillRate: 0.1,    // Recarga lenta (1 token cada 10 segundos)
                maxTokens: 5,
                windowMs: 60000     // 1 minuto
            },
            public: {
                tokens: 1000,       // Más tokens para endpoints públicos
                refillRate: 16.7,   // ~1000 tokens por minuto
                maxTokens: 1000,
                windowMs: 3600000   // 1 hora
            },
            sensitive: {
                tokens: 10,         // Muy pocos tokens para operaciones sensibles
                refillRate: 0.17,   // ~10 tokens por minuto
                maxTokens: 10,
                windowMs: 3600000   // 1 hora
            },
            global: {
                tokens: 10000,      // Límite global para toda la aplicación
                refillRate: 167,    // ~10000 tokens por minuto
                maxTokens: 10000,
                windowMs: 3600000   // 1 hora
            }
        },
        
        // Configuración de bloqueo
        blocking: {
            enabled: true,
            duration: 900000,      // 15 minutos de bloqueo
            maxViolations: 5,      // Máximo de violaciones antes de bloquear
            decayTime: 3600000     // 1 hora para reducir contador de violaciones
        },
        
        // Configuración de monitoreo
        monitoring: {
            enabled: true,
            alertThreshold: 80,    // % de uso para alertar
            logLevel: 'info',      // 'debug', 'info', 'warn', 'error'
            metricsRetention: 86400000 // 24 horas de retención de métricas
        }
    },
    
    // Estado del rate limiter
    state: {
        // Buckets por identificador (IP, usuario, etc.)
        buckets: new Map(),
        // Contadores de violaciones
        violations: new Map(),
        // Bloqueos activos
        blocks: new Map(),
        // Métricas de uso
        metrics: {
            totalRequests: 0,
            blockedRequests: 0,
            rateLimitHits: 0,
            lastReset: Date.now()
        },
        // Cache de configuraciones de endpoints
        endpointConfigs: new Map()
    },
    
    // Inicialización
    init: function() {
        this.log('Inicializando sistema de Rate Limiting');
        
        // Configurar limpieza periódica
        this.setupCleanup();
        
        // Configurar monitoreo
        this.setupMonitoring();
        
        // Pre-calcular configuraciones de endpoints
        this.precomputeEndpointConfigs();
        
        this.log('Sistema de Rate Limiting inicializado');
    },
    
    // Configurar limpieza periódica
    setupCleanup: function() {
        // Limpiar buckets expirados cada 5 minutos
        setInterval(() => {
            this.cleanupExpiredBuckets();
        }, 5 * 60 * 1000);
        
        // Limpiar violaciones antiguas cada hora
        setInterval(() => {
            this.cleanupOldViolations();
        }, 60 * 60 * 1000);
        
        // Limpiar bloques expirados cada minuto
        setInterval(() => {
            this.cleanupExpiredBlocks();
        }, 60 * 1000);
    },
    
    // Configurar monitoreo
    setupMonitoring: function() {
        if (!this.config.monitoring.enabled) return;
        
        // Reportar métricas cada 5 minutos
        setInterval(() => {
            this.reportMetrics();
        }, 5 * 60 * 1000);
    },
    
    // Pre-calcular configuraciones de endpoints
    precomputeEndpointConfigs: function() {
        const endpointPatterns = {
            // Endpoints de autenticación
            '/api/auth/login': 'auth',
            '/api/auth/register': 'auth',
            '/api/auth/refresh': 'auth',
            '/api/auth/logout': 'auth',
            
            // Endpoints públicos
            '/api/health': 'public',
            '/api/public/': 'public',
            
            // Endpoints sensibles
            '/api/users/': 'sensitive',
            '/api/admin/': 'sensitive',
            '/api/documents/upload': 'sensitive',
            '/api/documents/delete': 'sensitive',
            
            // Endpoints estándar (usar configuración por defecto)
            '/api/cases': 'default',
            '/api/clients': 'default',
            '/api/analytics': 'default',
            '/api/ai/': 'default'
        };
        
        // Guardar configuraciones en cache
        Object.entries(endpointPatterns).forEach(([pattern, configType]) => {
            this.state.endpointConfigs.set(pattern, this.config.tokenBucket[configType]);
        });
    },
    
    // Obtener configuración para un endpoint específico
    getEndpointConfig: function(endpoint) {
        // Buscar coincidencia exacta primero
        if (this.state.endpointConfigs.has(endpoint)) {
            return this.state.endpointConfigs.get(endpoint);
        }
        
        // Buscar coincidencia por patrón
        for (const [pattern, config] of this.state.endpointConfigs.entries()) {
            if (endpoint.includes(pattern.replace('*', ''))) {
                return config;
            }
        }
        
        // Usar configuración por defecto
        return this.config.tokenBucket.default;
    },
    
    // Crear o obtener un bucket de tokens
    getBucket: function(identifier, config) {
        if (!this.state.buckets.has(identifier)) {
            this.state.buckets.set(identifier, {
                tokens: config.tokens,
                lastRefill: Date.now(),
                config: config,
                created: Date.now()
            });
        }
        
        return this.state.buckets.get(identifier);
    },
    
    // Refill tokens en un bucket
    refillBucket: function(bucket) {
        const now = Date.now();
        const timePassed = (now - bucket.lastRefill) / 1000; // en segundos
        const tokensToAdd = Math.floor(timePassed * bucket.config.refillRate);
        
        if (tokensToAdd > 0) {
            bucket.tokens = Math.min(bucket.tokens + tokensToAdd, bucket.config.maxTokens);
            bucket.lastRefill = now;
        }
        
        return bucket.tokens;
    },
    
    // Consumir tokens de un bucket
    consumeTokens: function(bucket, tokens = 1) {
        this.refillBucket(bucket);
        
        if (bucket.tokens >= tokens) {
            bucket.tokens -= tokens;
            return { success: true, remaining: bucket.tokens };
        }
        
        return { 
            success: false, 
            remaining: bucket.tokens,
            resetTime: bucket.lastRefill + (Math.ceil((tokens - bucket.tokens) / bucket.config.refillRate) * 1000)
        };
    },
    
    // Verificar si un identificador está bloqueado
    isBlocked: function(identifier) {
        const block = this.state.blocks.get(identifier);
        if (!block) return false;
        
        if (Date.now() > block.expires) {
            this.state.blocks.delete(identifier);
            return false;
        }
        
        return true;
    },
    
    // Bloquear un identificador
    blockIdentifier: function(identifier, reason = 'Rate limit violation') {
        const block = {
            identifier,
            reason,
            created: Date.now(),
            expires: Date.now() + this.config.blocking.duration
        };
        
        this.state.blocks.set(identifier, block);
        this.log(`Identificador bloqueado: ${identifier}, Razón: ${reason}`);
        
        // Emitir evento de bloqueo
        this.emitEvent('rate-limit:block', {
            identifier,
            reason,
            duration: this.config.blocking.duration
        });
    },
    
    // Registrar violación
    recordViolation: function(identifier) {
        const now = Date.now();
        const violations = this.state.violations.get(identifier) || {
            count: 0,
            lastViolation: now,
            firstViolation: now
        };
        
        violations.count++;
        violations.lastViolation = now;
        
        this.state.violations.set(identifier, violations);
        
        // Verificar si se debe bloquear
        if (violations.count >= this.config.blocking.maxViolations) {
            this.blockIdentifier(identifier, `Too many violations (${violations.count})`);
        }
        
        return violations.count;
    },
    
    // Función principal de rate limiting
    checkRateLimit: function(identifier, endpoint, tokens = 1) {
        // Incrementar contador total de requests
        this.state.metrics.totalRequests++;
        
        // Verificar si está bloqueado
        if (this.isBlocked(identifier)) {
            this.state.metrics.blockedRequests++;
            return {
                allowed: false,
                blocked: true,
                reason: 'Identifier is blocked',
                retryAfter: Math.ceil((this.state.blocks.get(identifier).expires - Date.now()) / 1000)
            };
        }
        
        // Obtener configuración del endpoint
        const config = this.getEndpointConfig(endpoint);
        
        // Verificar límite global
        const globalBucket = this.getBucket('global', this.config.tokenBucket.global);
        const globalResult = this.consumeTokens(globalBucket, tokens);
        
        if (!globalResult.success) {
            this.state.metrics.rateLimitHits++;
            this.recordViolation(identifier);
            
            return {
                allowed: false,
                blocked: false,
                reason: 'Global rate limit exceeded',
                retryAfter: Math.ceil((globalResult.resetTime - Date.now()) / 1000),
                limit: globalBucket.config.maxTokens,
                remaining: globalResult.remaining,
                resetTime: globalResult.resetTime
            };
        }
        
        // Verificar límite específico del identificador
        const bucket = this.getBucket(identifier, config);
        const result = this.consumeTokens(bucket, tokens);
        
        if (!result.success) {
            this.state.metrics.rateLimitHits++;
            this.recordViolation(identifier);
            
            return {
                allowed: false,
                blocked: false,
                reason: 'Rate limit exceeded',
                retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
                limit: bucket.config.maxTokens,
                remaining: result.remaining,
                resetTime: result.resetTime
            };
        }
        
        // Verificar umbral de alerta
        const usagePercent = ((bucket.config.maxTokens - result.remaining) / bucket.config.maxTokens) * 100;
        if (usagePercent >= this.config.monitoring.alertThreshold) {
            this.emitEvent('rate-limit:warning', {
                identifier,
                endpoint,
                usagePercent,
                remaining: result.remaining
            });
        }
        
        return {
            allowed: true,
            blocked: false,
            limit: bucket.config.maxTokens,
            remaining: result.remaining,
            resetTime: bucket.lastRefill + bucket.config.windowMs
        };
    },
    
    // Limpiar buckets expirados
    cleanupExpiredBuckets: function() {
        const now = Date.now();
        const expired = [];
        
        for (const [identifier, bucket] of this.state.buckets.entries()) {
            if (now - bucket.created > bucket.config.windowMs * 2) {
                expired.push(identifier);
            }
        }
        
        expired.forEach(identifier => {
            this.state.buckets.delete(identifier);
        });
        
        if (expired.length > 0) {
            this.log(`Limpiados ${expired.length} buckets expirados`);
        }
    },
    
    // Limpiar violaciones antiguas
    cleanupOldViolations: function() {
        const now = Date.now();
        const expired = [];
        
        for (const [identifier, violations] of this.state.violations.entries()) {
            if (now - violations.lastViolation > this.config.blocking.decayTime) {
                expired.push(identifier);
            }
        }
        
        expired.forEach(identifier => {
            this.state.violations.delete(identifier);
        });
        
        if (expired.length > 0) {
            this.log(`Limpiadas ${expired.length} violaciones antiguas`);
        }
    },
    
    // Limpiar bloques expirados
    cleanupExpiredBlocks: function() {
        const now = Date.now();
        const expired = [];
        
        for (const [identifier, block] of this.state.blocks.entries()) {
            if (now > block.expires) {
                expired.push(identifier);
            }
        }
        
        expired.forEach(identifier => {
            this.state.blocks.delete(identifier);
        });
        
        if (expired.length > 0) {
            this.log(`Liberados ${expired.length} bloques expirados`);
        }
    },
    
    // Reportar métricas
    reportMetrics: function() {
        const metrics = {
            ...this.state.metrics,
            activeBuckets: this.state.buckets.size,
            activeBlocks: this.state.blocks.size,
            totalViolations: Array.from(this.state.violations.values())
                .reduce((sum, v) => sum + v.count, 0),
            timestamp: Date.now()
        };
        
        this.emitEvent('rate-limit:metrics', metrics);
        
        // Log de métricas
        if (this.config.monitoring.logLevel === 'debug') {
            this.log('Métricas de Rate Limiting:', metrics);
        }
    },
    
    // Emitir evento
    emitEvent: function(eventType, data) {
        if (typeof CustomEvent !== 'undefined') {
            const event = new CustomEvent(eventType, {
                detail: data
            });
            if (document.dispatchEvent) {
                document.dispatchEvent(event);
            }
        }
        
        // También emitir a través de Justice2 si está disponible
        if (window.Justice2 && window.Justice2.events) {
            window.Justice2.events.emit(eventType, data);
        }
    },
    
    // Obtener estadísticas
    getStats: function() {
        return {
            metrics: { ...this.state.metrics },
            buckets: this.state.buckets.size,
            blocks: this.state.blocks.size,
            violations: this.state.violations.size,
            config: {
                tokenBucket: this.config.tokenBucket,
                blocking: this.config.blocking,
                monitoring: this.config.monitoring
            }
        };
    },
    
    // Reiniciar estadísticas
    resetStats: function() {
        this.state.metrics = {
            totalRequests: 0,
            blockedRequests: 0,
            rateLimitHits: 0,
            lastReset: Date.now()
        };
        
        this.log('Estadísticas de Rate Limiting reiniciadas');
    },
    
    // Logging
    log: function(...args) {
        if (this.config.monitoring.logLevel === 'debug') {
            console.log('[RateLimiter]', ...args);
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            RateLimiter.init();
        });
    } else {
        RateLimiter.init();
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.RateLimiter = RateLimiter;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RateLimiter;
}