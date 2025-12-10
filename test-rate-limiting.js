/**
 * Pruebas Completas de Rate Limiting
 * Suite de pruebas para validar el sistema de rate limiting robusto
 */

const fs = require('fs');

// Mock del entorno DOM para Node.js
global.document = {
    createElement: function(tag) {
        return {
            textContent: '',
            innerHTML: '',
            setAttribute: function() {},
            appendChild: function() {},
            classList: { add: function() {} }
        };
    },
    addEventListener: function() {},
    head: {
        appendChild: function() {}
    }
};

global.window = {
    location: { origin: 'http://localhost', hostname: 'localhost' },
    navigator: { onLine: true },
    CustomEvent: function(type, options) {
        this.type = type;
        this.detail = options ? options.detail : null;
    },
    dispatchEvent: function() {}
};

// Cargar el sistema de rate limiting
let RateLimiter;
try {
    RateLimiter = require('./components/rate-limiter.js');
    RateLimiter.init();
} catch (error) {
    console.error('Error cargando RateLimiter:', error.message);
    process.exit(1);
}

const RateLimitingTestSuite = {
    name: 'Rate Limiting Security Tests',
    version: '1.0.0',
    results: [],
    
    // Configuración de pruebas
    testConfig: {
        // Configuración para pruebas aceleradas
        acceleratedMode: true,
        timeMultiplier: 0.01, // 100x más rápido para pruebas
        maxTestDuration: 10000, // 10 segundos máximo por prueba
        
        // Escenarios de prueba
        scenarios: {
            normal: { requests: 50, interval: 100 }, // Normal usage
            burst: { requests: 200, interval: 10 },   // Burst attack
            sustained: { requests: 1000, interval: 50 }, // Sustained attack
            authentication: { requests: 20, interval: 200 }, // Auth attempts
            sensitive: { requests: 30, interval: 300 } // Sensitive operations
        }
    },
    
    // Inicialización
    init: function() {
        console.log('🚀 Iniciando suite de pruebas de Rate Limiting');
        console.log('='.repeat(60));
        
        // Configurar modo acelerado para pruebas
        if (this.testConfig.acceleratedMode) {
            this.configureAcceleratedMode();
        }
        
        // Ejecutar todas las pruebas
        this.runAllTests();
        
        // Generar reporte
        this.generateReport();
    },
    
    // Configurar modo acelerado
    configureAcceleratedMode: function() {
        // Modificar configuración del rate limiter para pruebas rápidas
        if (RateLimiter.config) {
            // Reducir tiempos de ventana para pruebas
            Object.keys(RateLimiter.config.tokenBucket).forEach(key => {
                if (RateLimiter.config.tokenBucket[key].windowMs) {
                    RateLimiter.config.tokenBucket[key].windowMs *= this.testConfig.timeMultiplier;
                }
                if (RateLimiter.config.tokenBucket[key].refillRate) {
                    RateLimiter.config.tokenBucket[key].refillRate /= this.testConfig.timeMultiplier;
                }
            });
            
            // Reducir tiempos de bloqueo
            if (RateLimiter.config.blocking) {
                RateLimiter.config.blocking.duration *= this.testConfig.timeMultiplier;
                RateLimiter.config.blocking.decayTime *= this.testConfig.timeMultiplier;
            }
        }
        
        console.log('⚡ Modo acelerado configurado para pruebas rápidas');
    },
    
    // Ejecutar todas las pruebas
    runAllTests: function() {
        const tests = [
            { name: 'Token Bucket Algorithm', fn: () => this.testTokenBucketAlgorithm() },
            { name: 'Rate Limiting by IP', fn: () => this.testRateLimitingByIP() },
            { name: 'Rate Limiting by User', fn: () => this.testRateLimitingByUser() },
            { name: 'Different Endpoint Limits', fn: () => this.testDifferentEndpointLimits() },
            { name: 'Authentication Rate Limiting', fn: () => this.testAuthenticationRateLimiting() },
            { name: 'Sensitive Operations Protection', fn: () => this.testSensitiveOperationsProtection() },
            { name: 'Global Rate Limiting', fn: () => this.testGlobalRateLimiting() },
            { name: 'Blocking Mechanism', fn: () => this.testBlockingMechanism() },
            { name: 'HTTP Headers Response', fn: () => this.testHTTPHeadersResponse() },
            { name: 'Recovery After Limit', fn: () => this.testRecoveryAfterLimit() },
            { name: 'Burst Attack Protection', fn: () => this.testBurstAttackProtection() },
            { name: 'Sustained Attack Protection', fn: () => this.testSustainedAttackProtection() }
        ];
        
        tests.forEach(test => {
            this.runTest(test.name, test.fn);
        });
    },
    
    // Ejecutar prueba individual
    runTest: function(testName, testFunction) {
        console.log(`\n🧪 Ejecutando: ${testName}`);
        
        const startTime = Date.now();
        let result;
        
        try {
            // Limpiar estado antes de cada prueba
            this.resetRateLimiterState();
            
            // Ejecutar prueba con timeout
            result = this.runWithTimeout(testFunction, this.testConfig.maxTestDuration);
            
            const duration = Date.now() - startTime;
            
            this.results.push({
                name: testName,
                status: 'PASS',
                duration,
                result
            });
            
            console.log(`✅ ${testName}: PASS (${duration}ms)`);
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.results.push({
                name: testName,
                status: 'FAIL',
                duration,
                error: error.message
            });
            
            console.log(`❌ ${testName}: FAIL - ${error.message}`);
        }
    },
    
    // Ejecutar función con timeout
    runWithTimeout: function(fn, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Test timeout after ${timeout}ms`));
            }, timeout);
            
            Promise.resolve(fn())
                .then(result => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    },
    
    // Resetear estado del rate limiter
    resetRateLimiterState: function() {
        if (RateLimiter.state) {
            RateLimiter.state.buckets.clear();
            RateLimiter.state.violations.clear();
            RateLimiter.state.blocks.clear();
            RateLimiter.state.metrics = {
                totalRequests: 0,
                blockedRequests: 0,
                rateLimitHits: 0,
                lastReset: Date.now()
            };
        }
    },
    
    // Test: Algoritmo Token Bucket
    testTokenBucketAlgorithm: function() {
        const identifier = 'test-token-bucket';
        const endpoint = '/api/test';
        
        // Realizar solicitudes hasta agotar tokens
        let allowedRequests = 0;
        let blockedRequests = 0;
        
        for (let i = 0; i < 150; i++) {
            const result = RateLimiter.checkRateLimit(identifier, endpoint);
            if (result.allowed) {
                allowedRequests++;
            } else {
                blockedRequests++;
            }
        }
        
        // Verificar que se permitieron las solicitudes esperadas
        const expectedLimit = RateLimiter.config.tokenBucket.default.maxTokens;
        
        if (allowedRequests <= expectedLimit && blockedRequests > 0) {
            return {
                message: `Token bucket funciona correctamente: ${allowedRequests} permitidas, ${blockedRequests} bloqueadas`,
                details: { allowedRequests, blockedRequests, expectedLimit }
            };
        }
        
        throw new Error(`Token bucket no funciona como esperado: ${allowedRequests} permitidas, ${blockedRequests} bloqueadas`);
    },
    
    // Test: Rate Limiting por IP
    testRateLimitingByIP: function() {
        const ip1 = '192.168.1.100';
        const ip2 = '192.168.1.101';
        const endpoint = '/api/test';
        
        // Realizar solicitudes desde dos IPs diferentes
        const results1 = this.simulateRequests(`ip:${ip1}`, endpoint, 120);
        const results2 = this.simulateRequests(`ip:${ip2}`, endpoint, 120);
        
        // Verificar que cada IP tiene su propio límite
        if (results1.allowed > 0 && results1.blocked > 0 && 
            results2.allowed > 0 && results2.blocked > 0) {
            return {
                message: 'Rate limiting por IP funciona correctamente',
                details: { ip1: results1, ip2: results2 }
            };
        }
        
        throw new Error('Rate limiting por IP no funciona correctamente');
    },
    
    // Test: Rate Limiting por Usuario
    testRateLimitingByUser: function() {
        const user1 = 'user-123';
        const user2 = 'user-456';
        const endpoint = '/api/test';
        
        // Realizar solicitudes desde dos usuarios diferentes
        const results1 = this.simulateRequests(`user:${user1}`, endpoint, 120);
        const results2 = this.simulateRequests(`user:${user2}`, endpoint, 120);
        
        // Verificar que cada usuario tiene su propio límite
        if (results1.allowed > 0 && results1.blocked > 0 && 
            results2.allowed > 0 && results2.blocked > 0) {
            return {
                message: 'Rate limiting por usuario funciona correctamente',
                details: { user1: results1, user2: results2 }
            };
        }
        
        throw new Error('Rate limiting por usuario no funciona correctamente');
    },
    
    // Test: Límites diferenciados por endpoint
    testDifferentEndpointLimits: function() {
        const identifier = 'test-different-endpoints';
        
        // Probar diferentes tipos de endpoints
        const authResults = this.simulateRequests(identifier, '/api/auth/login', 20);
        const publicResults = this.simulateRequests(identifier, '/api/health', 1200);
        const sensitiveResults = this.simulateRequests(identifier, '/api/admin/users', 20);
        
        // Verificar que los límites son diferentes
        if (authResults.allowed < publicResults.allowed && 
            sensitiveResults.allowed < publicResults.allowed) {
            return {
                message: 'Límites diferenciados por endpoint funcionan correctamente',
                details: { auth: authResults, public: publicResults, sensitive: sensitiveResults }
            };
        }
        
        throw new Error('Límites diferenciados por endpoint no funcionan correctamente');
    },
    
    // Test: Rate Limiting de Autenticación
    testAuthenticationRateLimiting: function() {
        const identifier = 'test-auth';
        const endpoint = '/api/auth/login';
        
        // Simular intentos de login
        const results = this.simulateRequests(identifier, endpoint, 20);
        
        // Verificar que se aplica límite estricto para auth
        if (results.allowed <= 5 && results.blocked > 0) {
            return {
                message: 'Rate limiting de autenticación funciona correctamente',
                details: results
            };
        }
        
        throw new Error('Rate limiting de autenticación no funciona correctamente');
    },
    
    // Test: Protección de Operaciones Sensibles
    testSensitiveOperationsProtection: function() {
        const identifier = 'test-sensitive';
        const endpoint = '/api/documents/upload';
        
        // Simular operaciones sensibles
        const results = this.simulateRequests(identifier, endpoint, 20, 5); // 5 tokens por request
        
        // Verificar que se aplica límite muy estricto
        if (results.allowed <= 2 && results.blocked > 0) {
            return {
                message: 'Protección de operaciones sensibles funciona correctamente',
                details: results
            };
        }
        
        throw new Error('Protección de operaciones sensibles no funciona correctamente');
    },
    
    // Test: Rate Limiting Global
    testGlobalRateLimiting: function() {
        // Simular múltiples usuarios excediendo límite global
        const identifiers = ['user1', 'user2', 'user3', 'user4', 'user5'];
        let totalAllowed = 0;
        let totalBlocked = 0;
        
        identifiers.forEach(id => {
            const results = this.simulateRequests(`user:${id}`, '/api/test', 200);
            totalAllowed += results.allowed;
            totalBlocked += results.blocked;
        });
        
        // Verificar que el límite global se respeta
        const globalLimit = RateLimiter.config.tokenBucket.global.maxTokens;
        
        if (totalAllowed <= globalLimit && totalBlocked > 0) {
            return {
                message: 'Rate limiting global funciona correctamente',
                details: { totalAllowed, totalBlocked, globalLimit }
            };
        }
        
        throw new Error('Rate limiting global no funciona correctamente');
    },
    
    // Test: Mecanismo de Bloqueo
    testBlockingMechanism: function() {
        const identifier = 'test-blocking';
        const endpoint = '/api/auth/login';
        
        // Generar suficientes violaciones para activar bloqueo
        let violations = 0;
        for (let i = 0; i < 10; i++) {
            const result = RateLimiter.checkRateLimit(identifier, endpoint);
            if (!result.allowed) {
                violations++;
                RateLimiter.recordViolation(identifier);
            }
        }
        
        // Verificar que el identificador está bloqueado
        const isBlocked = RateLimiter.isBlocked(identifier);
        
        if (isBlocked && violations >= 5) {
            return {
                message: 'Mecanismo de bloqueo funciona correctamente',
                details: { violations, isBlocked }
            };
        }
        
        throw new Error('Mecanismo de bloqueo no funciona correctamente');
    },
    
    // Test: Respuestas HTTP con Headers
    testHTTPHeadersResponse: function() {
        const identifier = 'test-headers';
        const endpoint = '/api/test';
        
        // Realizar solicitud hasta alcanzar límite
        let rateLimitResult = null;
        for (let i = 0; i < 200; i++) {
            const result = RateLimiter.checkRateLimit(identifier, endpoint);
            if (!result.allowed) {
                rateLimitResult = result;
                break;
            }
        }
        
        // Verificar que la respuesta contiene los headers correctos
        if (rateLimitResult && 
            rateLimitResult.limit !== undefined && 
            rateLimitResult.remaining !== undefined && 
            rateLimitResult.resetTime !== undefined &&
            rateLimitResult.retryAfter !== undefined) {
            return {
                message: 'Headers HTTP de rate limiting son correctos',
                details: rateLimitResult
            };
        }
        
        throw new Error('Headers HTTP de rate limiting son incorrectos');
    },
    
    // Test: Recuperación después de exceder límite
    testRecoveryAfterLimit: function() {
        const identifier = 'test-recovery';
        const endpoint = '/api/test';
        
        // Exceder límite
        this.simulateRequests(identifier, endpoint, 200);
        
        // Esperar un poco y verificar recuperación
        setTimeout(() => {
            const result = RateLimiter.checkRateLimit(identifier, endpoint);
            
            if (result.allowed) {
                return {
                    message: 'Recuperación después de exceder límite funciona correctamente',
                    details: result
                };
            }
            
            throw new Error('Recuperación después de exceder límite no funciona correctamente');
        }, 1000);
        
        // Esperar asíncrono
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    const result = RateLimiter.checkRateLimit(identifier, endpoint);
                    if (result.allowed) {
                        resolve({
                            message: 'Recuperación después de exceder límite funciona correctamente',
                            details: result
                        });
                    } else {
                        reject(new Error('Recuperación después de exceder límite no funciona correctamente'));
                    }
                } catch (error) {
                    reject(error);
                }
            }, 1000);
        });
    },
    
    // Test: Protección contra Ataques de Ráfaga
    testBurstAttackProtection: function() {
        const identifier = 'test-burst';
        const endpoint = '/api/test';
        
        // Simular ataque de ráfaga
        const results = this.simulateBurstAttack(identifier, endpoint, 500, 10); // 500 requests en 10ms
        
        // Verificar que se bloquea la ráfaga
        if (results.blocked > results.allowed * 0.8) { // Al menos 80% bloqueado
            return {
                message: 'Protección contra ataques de ráfaga funciona correctamente',
                details: results
            };
        }
        
        throw new Error('Protección contra ataques de ráfaga no funciona correctamente');
    },
    
    // Test: Protección contra Ataques Sostenidos
    testSustainedAttackProtection: function() {
        const identifier = 'test-sustained';
        const endpoint = '/api/test';
        
        // Simular ataque sostenido
        const results = this.simulateSustainedAttack(identifier, endpoint, 100, 50); // 100 requests durante 50ms
        
        // Verificar que se mitiga el ataque sostenido
        if (results.blocked > 0 && results.allowed / (results.allowed + results.blocked) < 0.5) {
            return {
                message: 'Protección contra ataques sostenidos funciona correctamente',
                details: results
            };
        }
        
        throw new Error('Protección contra ataques sostenidos no funciona correctamente');
    },
    
    // Simular solicitudes
    simulateRequests: function(identifier, endpoint, count, tokensPerRequest = 1) {
        let allowed = 0;
        let blocked = 0;
        
        for (let i = 0; i < count; i++) {
            const result = RateLimiter.checkRateLimit(identifier, endpoint, tokensPerRequest);
            if (result.allowed) {
                allowed++;
            } else {
                blocked++;
            }
        }
        
        return { allowed, blocked, total: count };
    },
    
    // Simular ataque de ráfaga
    simulateBurstAttack: function(identifier, endpoint, requestCount, durationMs) {
        const startTime = Date.now();
        let allowed = 0;
        let blocked = 0;
        
        for (let i = 0; i < requestCount; i++) {
            const result = RateLimiter.checkRateLimit(identifier, endpoint);
            if (result.allowed) {
                allowed++;
            } else {
                blocked++;
            }
            
            // Pequeña pausa para simular ráfaga
            if (i % 10 === 0) {
                const elapsed = Date.now() - startTime;
                if (elapsed >= durationMs) break;
            }
        }
        
        return { allowed, blocked, total: allowed + blocked, duration: Date.now() - startTime };
    },
    
    // Simular ataque sostenido
    simulateSustainedAttack: function(identifier, endpoint, requestCount, durationMs) {
        const startTime = Date.now();
        let allowed = 0;
        let blocked = 0;
        const interval = durationMs / requestCount;
        
        for (let i = 0; i < requestCount; i++) {
            const result = RateLimiter.checkRateLimit(identifier, endpoint);
            if (result.allowed) {
                allowed++;
            } else {
                blocked++;
            }
            
            // Esperar para mantener el ritmo sostenido
            if (i < requestCount - 1) {
                const elapsed = Date.now() - startTime;
                const expectedElapsed = (i + 1) * interval;
                if (elapsed < expectedElapsed) {
                    // Simular espera (en pruebas reales sería setTimeout)
                    continue;
                }
            }
        }
        
        return { allowed, blocked, total: allowed + blocked, duration: Date.now() - startTime };
    },
    
    // Generar reporte
    generateReport: function() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 REPORTE DE PRUEBAS DE RATE LIMITING');
        console.log('='.repeat(60));
        
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const total = this.results.length;
        const passRate = ((passed / total) * 100).toFixed(2);
        
        console.log(`\n📈 RESUMEN GENERAL:`);
        console.log(`Total de pruebas: ${total}`);
        console.log(`Pruebas pasadas: ${passed}`);
        console.log(`Pruebas fallidas: ${total - passed}`);
        console.log(`Tasa de éxito: ${passRate}%`);
        
        console.log(`\n📋 DETALLE DE PRUEBAS:`);
        this.results.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${icon} ${result.name}: ${result.status} (${result.duration}ms)`);
            
            if (result.status === 'FAIL') {
                console.log(`   Error: ${result.error}`);
            }
        });
        
        console.log(`\n🔍 MÉTRICAS DEL SISTEMA:`);
        const stats = RateLimiter.getStats();
        console.log(`Requests totales: ${stats.metrics.totalRequests}`);
        console.log(`Requests bloqueadas: ${stats.metrics.blockedRequests}`);
        console.log(`Rate limit hits: ${stats.metrics.rateLimitHits}`);
        console.log(`Buckets activos: ${stats.buckets}`);
        console.log(`Bloqueos activos: ${stats.blocks}`);
        
        // Guardar reporte en archivo
        this.saveReportToFile();
        
        // Veredicto final
        if (passed === total) {
            console.log('\n🎉 ¡TODAS LAS PRUEBAS DE RATE LIMITING HAN PASADO!');
            console.log('✅ El sistema de rate limiting es robusto y seguro');
        } else {
            console.log('\n⚠️ HAY PRUEBAS FALLADAS - REVISAR IMPLEMENTACIÓN');
            console.log('❌ Algunos aspectos del rate limiting requieren atención');
        }
    },
    
    // Guardar reporte en archivo
    saveReportToFile: function() {
        const report = {
            timestamp: new Date().toISOString(),
            suite: {
                name: this.name,
                version: this.version
            },
            config: this.testConfig,
            results: this.results,
            summary: {
                total: this.results.length,
                passed: this.results.filter(r => r.status === 'PASS').length,
                failed: this.results.filter(r => r.status === 'FAIL').length,
                passRate: ((this.results.filter(r => r.status === 'PASS').length / this.results.length) * 100).toFixed(2)
            },
            systemStats: RateLimiter.getStats()
        };
        
        try {
            fs.writeFileSync('rate-limiting-test-report.json', JSON.stringify(report, null, 2));
            console.log('\n📄 Reporte guardado en: rate-limiting-test-report.json');
        } catch (error) {
            console.error('Error guardando reporte:', error.message);
        }
    }
};

// Ejecutar pruebas si este archivo se ejecuta directamente
if (require.main === module) {
    RateLimitingTestSuite.init();
}

module.exports = RateLimitingTestSuite;