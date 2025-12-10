/**
 * PRUEBAS BÁSICAS DE SEGURIDAD XSS - JUSTICE 2
 * Versión simplificada para verificar el sistema de protección XSS
 */

// Mock del entorno DOM para Node.js
global.document = {
    createElement: function(tag) {
        const element = {
            tagName: tag.toUpperCase(),
            _textContent: '',
            _innerHTML: '',
            _attributes: {},
            setAttribute: function(name, value) { this._attributes[name] = value; },
            getAttribute: function(name) { return this._attributes[name]; },
            appendChild: function(child) { /* Mock */ },
            classList: {
                add: function(className) { /* Mock */ },
                remove: function(className) { /* Mock */ },
                contains: function(className) { return false; }
            },
            style: {},
            parentNode: null,
            firstChild: null,
            children: []
        };
        
        // Definir propiedades con getters y setters
        Object.defineProperty(element, 'textContent', {
            get: function() { return this._textContent; },
            set: function(value) {
                this._textContent = value;
                // Cuando se establece textContent, el innerHTML debe ser el texto escapado
                this._innerHTML = value.replace(/&/g, '&')
                                       .replace(/</g, '<')
                                       .replace(/>/g, '>')
                                       .replace(/"/g, '"')
                                       .replace(/'/g, ''');
            }
        });
        
        Object.defineProperty(element, 'innerHTML', {
            get: function() { return this._innerHTML; },
            set: function(value) {
                this._innerHTML = value;
                // Cuando se establece innerHTML, el textContent debe ser el texto sin etiquetas
                this._textContent = value.replace(/<[^>]*>/g, '');
            }
        });
        
        return element;
    },
    getElementById: function(id) {
        return this.createElement('div');
    },
    querySelector: function(selector) {
        return this.createElement('div');
    },
    querySelectorAll: function(selector) {
        return [this.createElement('div')];
    },
    addEventListener: function(event, handler) { /* Mock */ },
    body: {
        appendChild: function(child) { /* Mock */ }
    }
};

global.window = {
    location: { 
        origin: 'http://localhost',
        hostname: 'localhost',
        protocol: 'http:',
        href: 'http://localhost'
    },
    URL: URL,
    history: { pushState: function() {} },
    localStorage: {
        getItem: function(key) { return null; },
        setItem: function(key, value) { /* Mock */ },
        removeItem: function(key) { /* Mock */ }
    },
    sessionStorage: {
        getItem: function(key) { return null; },
        setItem: function(key, value) { /* Mock */ },
        removeItem: function(key) { /* Mock */ }
    },
    addEventListener: function(event, handler) { /* Mock */ },
    navigator: {
        userAgent: 'Mozilla/5.0 (Node.js Test Environment)',
        onLine: true
    }
};

global.console = console;

// Importar el sistema XSSProtection
const XSSProtection = require('./components/xss-protection.js');

// Función para ejecutar pruebas básicas
function runBasicTests() {
    console.log('🚀 INICIANDO PRUEBAS BÁSICAS DE SEGURIDAD XSS');
    console.log('='.repeat(60));
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    // Casos de prueba básicos
    const testCases = [
        {
            name: 'Script Tag',
            input: '<script>alert("XSS")</script>',
            testFunction: 'escapeHtml',
            shouldNotContain: '<script>'
        },
        {
            name: 'Image with onerror',
            input: '<img src=x onerror=alert("XSS")>',
            testFunction: 'escapeHtml',
            shouldNotContain: 'onerror'
        },
        {
            name: 'JavaScript URL',
            input: 'javascript:alert("XSS")',
            testFunction: 'sanitizeUrl',
            expectedResult: '#'
        },
        {
            name: 'SVG with onload',
            input: '<svg onload=alert("XSS")>',
            testFunction: 'escapeHtml',
            shouldNotContain: 'onload'
        },
        {
            name: 'Data URL HTML',
            input: 'data:text/html,<script>alert("XSS")</script>',
            testFunction: 'sanitizeUrl',
            expectedResult: '#'
        },
        {
            name: 'Safe Text',
            input: 'This is safe text content',
            testFunction: 'escapeHtml',
            shouldContain: 'This is safe text content'
        }
    ];
    
    // Ejecutar pruebas
    testCases.forEach((testCase, index) => {
        totalTests++;
        console.log(`🧪 Ejecutando prueba ${index + 1}: ${testCase.name}`);
        
        try {
            let result;
            let isSafe = false;
            
            switch (testCase.testFunction) {
                case 'escapeHtml':
                    result = XSSProtection.escapeHtml(testCase.input);
                    if (testCase.shouldNotContain) {
                        isSafe = !result.includes(testCase.shouldNotContain);
                    } else if (testCase.shouldContain) {
                        isSafe = result.includes(testCase.shouldContain);
                    }
                    break;
                case 'sanitizeUrl':
                    result = XSSProtection.sanitizeUrl(testCase.input);
                    if (testCase.expectedResult) {
                        isSafe = result === testCase.expectedResult;
                    }
                    break;
                default:
                    isSafe = false;
            }
            
            if (isSafe) {
                passedTests++;
                console.log(`✅ ${testCase.name}: PASADO`);
            } else {
                failedTests++;
                console.log(`❌ ${testCase.name}: FALLADO`);
                console.log(`   Input: ${testCase.input}`);
                console.log(`   Result: ${result}`);
                if (testCase.shouldNotContain) {
                    console.log(`   Should not contain: ${testCase.shouldNotContain}`);
                } else if (testCase.shouldContain) {
                    console.log(`   Should contain: ${testCase.shouldContain}`);
                } else if (testCase.expectedResult) {
                    console.log(`   Expected result: ${testCase.expectedResult}`);
                }
            }
        } catch (error) {
            failedTests++;
            console.log(`❌ ${testCase.name}: ERROR - ${error.message}`);
        }
    });
    
    // Mostrar resumen
    console.log('\n📊 RESUMEN DE PRUEBAS');
    console.log('='.repeat(60));
    console.log(`Total de pruebas: ${totalTests}`);
    console.log(`Pruebas pasadas: ${passedTests}`);
    console.log(`Pruebas fallidas: ${failedTests}`);
    console.log(`Tasa de éxito: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 ¡TODAS LAS PRUEBAS DE XSS HAN PASADO!');
        console.log('✅ El sistema Justice 2 está protegido contra ataques XSS básicos');
    } else {
        console.log('\n⚠️ HAY PRUEBAS FALLADAS - REVISAR CORRECCIONES');
        console.log('❌ El sistema tiene vulnerabilidades XSS que deben ser corregidas');
    }
    
    // Guardar reporte simple
    const reportData = {
        timestamp: new Date().toISOString(),
        summary: {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            successRate: ((passedTests / totalTests) * 100).toFixed(2)
        },
        testResults: testCases.map((testCase, index) => {
            try {
                let result;
                let passed = false;
                
                switch (testCase.testFunction) {
                    case 'escapeHtml':
                        result = XSSProtection.escapeHtml(testCase.input);
                        if (testCase.shouldNotContain) {
                            passed = !result.includes(testCase.shouldNotContain);
                        } else if (testCase.shouldContain) {
                            passed = result.includes(testCase.shouldContain);
                        }
                        break;
                    case 'sanitizeUrl':
                        result = XSSProtection.sanitizeUrl(testCase.input);
                        if (testCase.expectedResult) {
                            passed = result === testCase.expectedResult;
                        }
                        break;
                }
                
                return {
                    name: testCase.name,
                    input: testCase.input,
                    passed: passed,
                    result: result
                };
            } catch (error) {
                return {
                    name: testCase.name,
                    input: testCase.input,
                    passed: false,
                    error: error.message
                };
            }
        })
    };
    
    require('fs').writeFileSync(
        'xss-basic-test-report.json', 
        JSON.stringify(reportData, null, 2)
    );
    
    console.log('\n💾 Reporte guardado en: xss-basic-test-report.json');
    
    return {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: ((passedTests / totalTests) * 100).toFixed(2)
    };
}

// Ejecutar pruebas si este archivo se ejecuta directamente
if (require.main === module) {
    runBasicTests();
}

module.exports = { runBasicTests };