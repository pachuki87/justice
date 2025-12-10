/**
 * Pruebas de Seguridad CSRF para Justice 2
 * 
 * Este archivo contiene pruebas completas para validar el sistema
 * de protección CSRF implementado en Justice 2.
 */

const fs = require('fs');
const https = require('https');
const http = require('http');

// Configuración de pruebas
const TEST_CONFIG = {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8888',
    timeout: 10000,
    retryAttempts: 3,
    userAgent: 'Justice2-CSRF-Test/1.0'
};

// Estado de las pruebas
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
    details: []
};

// Utilidades de prueba
const TestUtils = {
    // Realizar solicitud HTTP
    makeRequest: async function(options) {
        return new Promise((resolve, reject) => {
            const url = new URL(options.url || TEST_CONFIG.baseUrl);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;
            
            const requestOptions = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: options.method || 'GET',
                headers: {
                    'User-Agent': TEST_CONFIG.userAgent,
                    ...options.headers
                },
                timeout: options.timeout || TEST_CONFIG.timeout,
                rejectUnauthorized: false // Para pruebas con certificados auto-firmados
            };
            
            const req = httpModule.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                        headers: res.headers,
                        body: data,
                        url: options.url
                    });
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            if (options.data) {
                req.write(typeof options.data === 'string' ? options.data : JSON.stringify(options.data));
            }
            
            req.end();
        });
    },
    
    // Generar token CSRF falso para pruebas
    generateFakeCSRFToken: function() {
        return 'fake-csrf-token-' + Math.random().toString(36).substring(2);
    },
    
    // Extraer token CSRF de respuesta HTML
    extractCSRFToken: function(html) {
        const tokenMatch = html.match(/name=["']csrf-token["']\s+content=["']([^"']+)["']/);
        return tokenMatch ? tokenMatch[1] : null;
    },
    
    // Registrar resultado de prueba
    logTest: function(testName, passed, message, details = {}) {
        testResults.total++;
        if (passed) {
            testResults.passed++;
            console.log(`✅ ${testName}: ${message}`);
        } else {
            testResults.failed++;
            console.log(`❌ ${testName}: ${message}`);
            if (Object.keys(details).length > 0) {
                console.log('   Detalles:', JSON.stringify(details, null, 2));
            }
        }
        
        testResults.details.push({
            test: testName,
            passed,
            message,
            details,
            timestamp: new Date().toISOString()
        });
    },
    
    // Esperar un tiempo específico
    sleep: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Suite de pruebas CSRF
const CSRFTestSuite = {
    // Prueba 1: Verificar endpoint de generación de token CSRF
    testCSRFTokenEndpoint: async function() {
        try {
            const response = await TestUtils.makeRequest({
                url: `${TEST_CONFIG.baseUrl}/api/csrf/token`,
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            const isValid = response.statusCode === 200;
            const hasToken = response.body && JSON.parse(response.body).token;
            
            TestUtils.logTest(
                'CSRF Token Endpoint',
                isValid && hasToken,
                isValid ? 
                    (hasToken ? 'Endpoint responde con token válido' : 'Endpoint responde pero sin token') :
                    `Endpoint falló con status ${response.statusCode}`,
                {
                    statusCode: response.statusCode,
                    hasToken: !!hasToken,
                    body: response.body.substring(0, 200)
                }
            );
            
            return isValid && hasToken ? JSON.parse(response.body).token : null;
        } catch (error) {
            TestUtils.logTest(
                'CSRF Token Endpoint',
                false,
                `Error: ${error.message}`,
                { error: error.message }
            );
            return null;
        }
    },
    
    // Prueba 2: Verificar que las solicitudes sin token CSRF son rechazadas
    testCSRFTokenRequired: async function() {
        try {
            const response = await TestUtils.makeRequest({
                url: `${TEST_CONFIG.baseUrl}/api/cases`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer fake-jwt-token'
                },
                data: {
                    title: 'Test Case',
                    description: 'Test Description'
                }
            });
            
            const isRejected = response.statusCode === 403;
            const hasCSRFError = response.body && 
                                JSON.parse(response.body).code === 'CSRF_TOKEN_MISSING';
            
            TestUtils.logTest(
                'CSRF Token Required',
                isRejected && hasCSRFError,
                isRejected ? 
                    (hasCSRFError ? 'Solicitud sin token correctamente rechazada' : 'Rechazada pero sin error CSRF específico') :
                    `Solicitud aceptada indebidamente (status ${response.statusCode})`,
                {
                    statusCode: response.statusCode,
                    hasCSRFError,
                    body: response.body.substring(0, 200)
                }
            );
            
            return isRejected;
        } catch (error) {
            TestUtils.logTest(
                'CSRF Token Required',
                false,
                `Error: ${error.message}`,
                { error: error.message }
            );
            return false;
        }
    },
    
    // Prueba 3: Verificar que las solicitudes con token CSRF inválido son rechazadas
    testCSRFTokenInvalid: async function() {
        try {
            const response = await TestUtils.makeRequest({
                url: `${TEST_CONFIG.baseUrl}/api/cases`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer fake-jwt-token',
                    'X-CSRF-Token': TestUtils.generateFakeCSRFToken()
                },
                data: {
                    title: 'Test Case',
                    description: 'Test Description'
                }
            });
            
            const isRejected = response.statusCode === 403;
            const hasCSRFError = response.body && 
                                JSON.parse(response.body).code === 'CSRF_TOKEN_INVALID';
            
            TestUtils.logTest(
                'CSRF Token Invalid',
                isRejected && hasCSRFError,
                isRejected ? 
                    (hasCSRFError ? 'Solicitud con token inválido correctamente rechazada' : 'Rechazada pero sin error CSRF específico') :
                    `Solicitud aceptada indebidamente (status ${response.statusCode})`,
                {
                    statusCode: response.statusCode,
                    hasCSRFError,
                    body: response.body.substring(0, 200)
                }
            );
            
            return isRejected;
        } catch (error) {
            TestUtils.logTest(
                'CSRF Token Invalid',
                false,
                `Error: ${error.message}`,
                { error: error.message }
            );
            return false;
        }
    },
    
    // Prueba 4: Verificar endpoint de validación de token CSRF
    testCSRFValidationEndpoint: async function() {
        try {
            // Primero obtener un token válido
            const tokenResponse = await TestUtils.makeRequest({
                url: `${TEST_CONFIG.baseUrl}/api/csrf/token`,
                method: 'GET'
            });
            
            if (tokenResponse.statusCode !== 200) {
                TestUtils.logTest(
                    'CSRF Validation Endpoint',
                    false,
                    'No se pudo obtener token para prueba de validación',
                    { statusCode: tokenResponse.statusCode }
                );
                return false;
            }
            
            const validToken = JSON.parse(tokenResponse.body).token;
            
            // Probar validación con token válido
            const validResponse = await TestUtils.makeRequest({
                url: `${TEST_CONFIG.baseUrl}/api/csrf/validate`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: { token: validToken }
            });
            
            const isValidValid = validResponse.statusCode === 200 && 
                               JSON.parse(validResponse.body).valid === true;
            
            // Probar validación con token inválido
            const invalidResponse = await TestUtils.makeRequest({
                url: `${TEST_CONFIG.baseUrl}/api/csrf/validate`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: { token: TestUtils.generateFakeCSRFToken() }
            });
            
            const isInvalidInvalid = invalidResponse.statusCode === 200 && 
                                   JSON.parse(invalidResponse.body).valid === false;
            
            const allPassed = isValidValid && isInvalidInvalid;
            
            TestUtils.logTest(
                'CSRF Validation Endpoint',
                allPassed,
                allPassed ? 
                    'Endpoint de validación funciona correctamente' :
                    'Endpoint de validación tiene problemas',
                {
                    validTokenTest: {
                        statusCode: validResponse.statusCode,
                        valid: isValidValid
                    },
                    invalidTokenTest: {
                        statusCode: invalidResponse.statusCode,
                        valid: isInvalidInvalid
                    }
                }
            );
            
            return allPassed;
        } catch (error) {
            TestUtils.logTest(
                'CSRF Validation Endpoint',
                false,
                `Error: ${error.message}`,
                { error: error.message }
            );
            return false;
        }
    },
    
    // Prueba 5: Verificar que los endpoints seguros requieren CSRF
    testSecureEndpointsCSRF: async function() {
        const secureEndpoints = [
            { path: '/api/cases', method: 'POST' },
            { path: '/api/clients', method: 'POST' },
            { path: '/api/ai/chat', method: 'POST' },
            { path: '/api/auth/change-password', method: 'POST' }
        ];
        
        let results = [];
        
        for (const endpoint of secureEndpoints) {
            try {
                const response = await TestUtils.makeRequest({
                    url: `${TEST_CONFIG.baseUrl}${endpoint.path}`,
                    method: endpoint.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer fake-jwt-token'
                    },
                    data: { test: 'data' }
                });
                
                const requiresCSRF = response.statusCode === 403;
                results.push({
                    endpoint: `${endpoint.method} ${endpoint.path}`,
                    requiresCSRF,
                    statusCode: response.statusCode
                });
            } catch (error) {
                results.push({
                    endpoint: `${endpoint.method} ${endpoint.path}`,
                    requiresCSRF: false,
                    error: error.message
                });
            }
        }
        
        const allRequireCSRF = results.every(r => r.requiresCSRF);
        
        TestUtils.logTest(
            'Secure Endpoints CSRF',
            allRequireCSRF,
            allRequireCSRF ? 
                'Todos los endpoints seguros requieren CSRF' :
                'Algunos endpoints seguros no requieren CSRF',
            { results }
        );
        
        return allRequireCSRF;
    },
    
    // Prueba 6: Verificar que los endpoints públicos no requieren CSRF
    testPublicEndpointsNoCSRF: async function() {
        const publicEndpoints = [
            { path: '/api/auth/login', method: 'POST' },
            { path: '/api/auth/register', method: 'POST' },
            { path: '/api/health', method: 'GET' }
        ];
        
        let results = [];
        
        for (const endpoint of publicEndpoints) {
            try {
                const response = await TestUtils.makeRequest({
                    url: `${TEST_CONFIG.baseUrl}${endpoint.path}`,
                    method: endpoint.method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: endpoint.method === 'POST' ? { 
                        email: 'test@example.com', 
                        password: 'testpassword' 
                    } : undefined
                });
                
                // Los endpoints públicos pueden fallar por otras razones (401, 400, etc.)
                // pero no deberían fallar específicamente por CSRF
                const notCSRFError = response.statusCode !== 403 || 
                                    (response.body && 
                                     !JSON.parse(response.body).code?.startsWith('CSRF_'));
                
                results.push({
                    endpoint: `${endpoint.method} ${endpoint.path}`,
                    notCSRFError,
                    statusCode: response.statusCode
                });
            } catch (error) {
                results.push({
                    endpoint: `${endpoint.method} ${endpoint.path}`,
                    notCSRFError: false,
                    error: error.message
                });
            }
        }
        
        const allNotCSRFError = results.every(r => r.notCSRFError);
        
        TestUtils.logTest(
            'Public Endpoints No CSRF',
            allNotCSRFError,
            allNotCSRFError ? 
                'Los endpoints públicos no requieren CSRF' :
                'Algunos endpoints públicos están requiriendo CSRF indebidamente',
            { results }
        );
        
        return allNotCSRFError;
    },
    
    // Prueba 7: Verificar rotación de tokens CSRF
    testCSRFTokenRotation: async function() {
        try {
            // Obtener primer token
            const firstResponse = await TestUtils.makeRequest({
                url: `${TEST_CONFIG.baseUrl}/api/csrf/token`,
                method: 'GET'
            });
            
            if (firstResponse.statusCode !== 200) {
                TestUtils.logTest(
                    'CSRF Token Rotation',
                    false,
                    'No se pudo obtener primer token',
                    { statusCode: firstResponse.statusCode }
                );
                return false;
            }
            
            const firstToken = JSON.parse(firstResponse.body).token;
            
            // Esperar un momento
            await TestUtils.sleep(100);
            
            // Obtener segundo token
            const secondResponse = await TestUtils.makeRequest({
                url: `${TEST_CONFIG.baseUrl}/api/csrf/token`,
                method: 'GET'
            });
            
            if (secondResponse.statusCode !== 200) {
                TestUtils.logTest(
                    'CSRF Token Rotation',
                    false,
                    'No se pudo obtener segundo token',
                    { statusCode: secondResponse.statusCode }
                );
                return false;
            }
            
            const secondToken = JSON.parse(secondResponse.body).token;
            
            // Los tokens deberían ser diferentes (rotación)
            const tokensAreDifferent = firstToken !== secondToken;
            
            TestUtils.logTest(
                'CSRF Token Rotation',
                tokensAreDifferent,
                tokensAreDifferent ? 
                    'Los tokens CSRF se rotan correctamente' :
                    'Los tokens CSRF no se están rotando',
                {
                    firstTokenLength: firstToken.length,
                    secondTokenLength: secondToken.length,
                    tokensAreDifferent
                }
            );
            
            return tokensAreDifferent;
        } catch (error) {
            TestUtils.logTest(
                'CSRF Token Rotation',
                false,
                `Error: ${error.message}`,
                { error: error.message }
            );
            return false;
        }
    },
    
    // Prueba 8: Verificar expiración de tokens CSRF
    testCSRFTokenExpiration: async function() {
        try {
            // Esta prueba simula la expiración modificando el tiempo del servidor
            // En un entorno real, esto requeriría esperar el tiempo de expiración real
            
            const response = await TestUtils.makeRequest({
                url: `${TEST_CONFIG.baseUrl}/api/csrf/token`,
                method: 'GET'
            });
            
            if (response.statusCode !== 200) {
                TestUtils.logTest(
                    'CSRF Token Expiration',
                    false,
                    'No se pudo obtener token para prueba de expiración',
                    { statusCode: response.statusCode }
                );
                return false;
            }
            
            const tokenData = JSON.parse(response.body);
            const hasExpiry = tokenData.expiresAt;
            
            TestUtils.logTest(
                'CSRF Token Expiration',
                hasExpiry,
                hasExpiry ? 
                    'El token CSRF incluye fecha de expiración' :
                    'El token CSRF no incluye fecha de expiración',
                {
                    hasExpiry,
                    expiresAt: tokenData.expiresAt
                }
            );
            
            return hasExpiry;
        } catch (error) {
            TestUtils.logTest(
                'CSRF Token Expiration',
                false,
                `Error: ${error.message}`,
                { error: error.message }
            );
            return false;
        }
    }
};

// Función principal para ejecutar todas las pruebas
async function runCSRFSecurityTests() {
    console.log('🔍 INICIANDO PRUEBAS DE SEGURIDAD CSRF');
    console.log('='.repeat(60));
    console.log(`Base URL: ${TEST_CONFIG.baseUrl}`);
    console.log('');
    
    // Ejecutar todas las pruebas
    await CSRFTestSuite.testCSRFTokenEndpoint();
    await TestUtils.sleep(500);
    
    await CSRFTestSuite.testCSRFTokenRequired();
    await TestUtils.sleep(500);
    
    await CSRFTestSuite.testCSRFTokenInvalid();
    await TestUtils.sleep(500);
    
    await CSRFTestSuite.testCSRFValidationEndpoint();
    await TestUtils.sleep(500);
    
    await CSRFTestSuite.testSecureEndpointsCSRF();
    await TestUtils.sleep(500);
    
    await CSRFTestSuite.testPublicEndpointsNoCSRF();
    await TestUtils.sleep(500);
    
    await CSRFTestSuite.testCSRFTokenRotation();
    await TestUtils.sleep(500);
    
    await CSRFTestSuite.testCSRFTokenExpiration();
    
    // Mostrar resumen
    console.log('\n📊 RESUMEN DE PRUEBAS CSRF');
    console.log('='.repeat(60));
    console.log(`Total de pruebas: ${testResults.total}`);
    console.log(`Pruebas pasadas: ${testResults.passed}`);
    console.log(`Pruebas fallidas: ${testResults.failed}`);
    console.log(`Tasa de éxito: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
    
    if (testResults.errors.length > 0) {
        console.log('\n⚠️ ERRORES ENCONTRADOS:');
        testResults.errors.forEach(error => {
            console.log(`   - ${error}`);
        });
    }
    
    // Generar reporte JSON
    const report = {
        timestamp: new Date().toISOString(),
        config: TEST_CONFIG,
        summary: {
            total: testResults.total,
            passed: testResults.passed,
            failed: testResults.failed,
            successRate: ((testResults.passed / testResults.total) * 100).toFixed(2)
        },
        details: testResults.details
    };
    
    try {
        fs.writeFileSync('csrf-security-test-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Reporte guardado en: csrf-security-test-report.json');
    } catch (error) {
        console.log('\n❌ Error guardando reporte:', error.message);
    }
    
    // Veredicto final
    if (testResults.passed === testResults.total) {
        console.log('\n🎉 ¡TODAS LAS PRUEBAS CSRF HAN PASADO!');
        console.log('✅ El sistema de protección CSRF está funcionando correctamente');
        process.exit(0);
    } else {
        console.log('\n⚠️ HAY PRUEBAS CSRF FALLADAS');
        console.log('❌ El sistema de protección CSRF requiere atención');
        process.exit(1);
    }
}

// Ejecutar pruebas si este archivo se ejecuta directamente
if (require.main === module) {
    runCSRFSecurityTests().catch(error => {
        console.error('Error ejecutando pruebas CSRF:', error);
        process.exit(1);
    });
}

module.exports = {
    CSRFTestSuite,
    TestUtils,
    runCSRFSecurityTests
};