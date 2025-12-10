/**
 * Pruebas para el método validateToken() de Justice2Auth
 * Archivo de pruebas para validar la implementación crítica del método validateToken()
 */

// Cargar las dependencias necesarias
const fs = require('fs');
const path = require('path');

// Simular entorno del navegador
global.window = {
    location: {
        hostname: 'localhost',
        port: '8000',
        protocol: 'http:'
    }
};

global.navigator = {
    userAgent: 'Test Environment'
};

global.document = {
    addEventListener: () => {},
    getElementById: () => null,
    querySelectorAll: () => [],
    body: {
        appendChild: () => {},
        removeChild: () => {}
    }
};

global.localStorage = {
    data: {},
    getItem: function(key) { return this.data[key] || null; },
    setItem: function(key, value) { this.data[key] = value; },
    removeItem: function(key) { delete this.data[key]; }
};

global.btoa = (str) => Buffer.from(str).toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString();

// Cargar Justice2Auth
const justice2AuthPath = path.join(__dirname, 'js', 'justice2-auth.js');
const justice2AuthCode = fs.readFileSync(justice2AuthPath, 'utf8');

// Simular dependencias
global.Justice2 = {
    log: (...args) => console.log('[Justice2]', ...args),
    config: {
        debug: () => true,
        environment: { type: 'development' },
        api: { baseURL: 'http://localhost:8000/api' }
    }
};

// Evaluar el código y extraer Justice2Auth
eval(justice2AuthCode);
const Justice2Auth = global.window.Justice2Auth;

// Función para generar tokens de prueba
function generateTestToken(overrides = {}) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    
    const defaultPayload = {
        sub: 'user123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 horas
        iss: 'justice2-system',
        aud: 'justice2-frontend'
    };
    
    const payload = btoa(JSON.stringify({ ...defaultPayload, ...overrides }));
    const signature = btoa('test-signature');
    
    return `${header}.${payload}.${signature}`;
}

// Casos de prueba
const testCases = [
    {
        name: 'Token válido',
        token: generateTestToken(),
        expected: true,
        description: 'Token correctamente formado y no expirado'
    },
    {
        name: 'Token nulo',
        token: null,
        expected: false,
        description: 'No se proporciona token'
    },
    {
        name: 'Token vacío',
        token: '',
        expected: false,
        description: 'Token string vacío'
    },
    {
        name: 'Token con formato inválido (menos partes)',
        token: 'header.payload',
        expected: false,
        description: 'Token con solo 2 partes en lugar de 3'
    },
    {
        name: 'Token con formato inválido (más partes)',
        token: 'header.payload.signature.extra',
        expected: false,
        description: 'Token con más de 3 partes'
    },
    {
        name: 'Token con payload inválido (no JSON)',
        token: `header.${btoa('invalid-json')}.signature`,
        expected: false,
        description: 'Payload no es JSON válido'
    },
    {
        name: 'Token sin campos requeridos (sin sub)',
        token: generateTestToken({ sub: undefined }),
        expected: false,
        description: 'Token sin campo subject'
    },
    {
        name: 'Token sin campos requeridos (sin iat)',
        token: generateTestToken({ iat: undefined }),
        expected: false,
        description: 'Token sin campo issued at'
    },
    {
        name: 'Token sin campos requeridos (sin exp)',
        token: generateTestToken({ exp: undefined }),
        expected: false,
        description: 'Token sin campo expiration'
    },
    {
        name: 'Token expirado',
        token: generateTestToken({ 
            exp: Math.floor(Date.now() / 1000) - 3600 // Expiró hace 1 hora
        }),
        expected: false,
        description: 'Token con fecha de expiración en el pasado'
    },
    {
        name: 'Token emitido en el futuro',
        token: generateTestToken({ 
            iat: Math.floor(Date.now() / 1000) + 3600 // Emitido en 1 hora
        }),
        expected: false,
        description: 'Token con fecha de emisión en el futuro'
    },
    {
        name: 'Token demasiado antiguo',
        token: generateTestToken({ 
            iat: Math.floor(Date.now() / 1000) - (25 * 60 * 60) // Emitido hace 25 horas
        }),
        expected: false,
        description: 'Token emitido hace más de 24 horas'
    },
    {
        name: 'Token con issuer inválido',
        token: generateTestToken({ 
            iss: 'malicious-server'
        }),
        expected: false,
        description: 'Token con issuer no autorizado'
    },
    {
        name: 'Token con audience inválido',
        token: generateTestToken({ 
            aud: 'malicious-app'
        }),
        expected: false,
        description: 'Token con audience no autorizado'
    },
    {
        name: 'Token con admin claim inválido',
        token: generateTestToken({ 
            admin: true,
            sub: undefined // Sin subject pero con admin claim
        }),
        expected: false,
        description: 'Token con claim de administrador pero estructura inválida'
    }
];

// Función para ejecutar pruebas
async function runTests() {
    console.log('🧪 Iniciando pruebas del método validateToken()');
    console.log('=' .repeat(60));
    
    let passed = 0;
    let failed = 0;
    
    for (const testCase of testCases) {
        try {
            console.log(`\n📋 Test: ${testCase.name}`);
            console.log(`   Descripción: ${testCase.description}`);
            
            // Configurar estado del usuario si es necesario
            if (testCase.name.includes('user mismatch') || testCase.name.includes('admin')) {
                Justice2Auth.state.user = { id: 'user123' };
            } else {
                Justice2Auth.state.user = null;
            }
            
            // Ejecutar la prueba
            const result = await Justice2Auth.validateToken(testCase.token);
            
            // Verificar resultado
            if (result === testCase.expected) {
                console.log(`   ✅ PASÓ: Resultado ${result} como se esperaba`);
                passed++;
            } else {
                console.log(`   ❌ FALLÓ: Se esperaba ${testCase.expected} pero obtuvo ${result}`);
                failed++;
            }
            
        } catch (error) {
            console.log(`   💥 ERROR: ${error.message}`);
            failed++;
        }
    }
    
    // Resumen
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RESUMEN DE PRUEBAS');
    console.log(`   ✅ Pasaron: ${passed}`);
    console.log(`   ❌ Fallaron: ${failed}`);
    console.log(`   📈 Total: ${passed + failed}`);
    
    if (failed === 0) {
        console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON! El método validateToken() funciona correctamente.');
    } else {
        console.log('\n⚠️  Algunas pruebas fallaron. Revisar la implementación.');
    }
    
    // Probar logging de eventos de seguridad
    console.log('\n🔒 Probando sistema de logging de seguridad...');
    Justice2Auth.logSecurityEvent('TEST_EVENT', 'Evento de prueba para validar logging');
    console.log('   ✅ Logging de seguridad funcionando');
    
    // Probar rate limiting
    console.log('\n⏱️  Probando rate limiting...');
    const rateLimitResult = Justice2Auth.checkTokenValidationRateLimit();
    console.log(`   ✅ Rate limiting: ${rateLimitResult ? 'Permitido' : 'Bloqueado'}`);
    
    return failed === 0;
}

// Ejecutar pruebas
runTests()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Error ejecutando pruebas:', error);
        process.exit(1);
    });