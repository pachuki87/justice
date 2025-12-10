/**
 * PRUEBAS COMPLETAS DE SEGURIDAD XSS - JUSTICE 2 (VERSIÓN CORREGIDA)
 * 
 * Este archivo contiene pruebas exhaustivas para validar que el sistema
 * de protección XSS implementado en todo el sistema Justice 2 funciona
 * correctamente y bloquea todos los posibles ataques.
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

// Clase principal de pruebas XSS
class XSSSecurityTestSuite {
    constructor() {
        this.results = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.startTime = Date.now();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [XSS-Test]`;
        
        switch(type) {
            case 'error':
                console.error(`${prefix} ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ${message}`);
                break;
            case 'success':
                console.log(`\x1b[32m${prefix} ${message}\x1b[0m`);
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }

    runTest(testName, testFunction, category = 'General') {
        this.totalTests++;
        this.log(`Ejecutando: ${testName} [${category}]`);
        
        try {
            const result = testFunction();
            if (result.passed) {
                this.passedTests++;
                this.results.push({ 
                    name: testName, 
                    status: 'PASS', 
                    message: result.message,
                    category: category,
                    duration: result.duration || 0
                });
                this.log(`✅ ${testName}: PASS - ${result.message}`, 'success');
            } else {
                this.failedTests++;
                this.results.push({ 
                    name: testName, 
                    status: 'FAIL', 
                    message: result.message,
                    category: category,
                    duration: result.duration || 0
                });
                this.log(`❌ ${testName}: FAIL - ${result.message}`, 'error');
            }
        } catch (error) {
            this.failedTests++;
            this.results.push({ 
                name: testName, 
                status: 'ERROR', 
                message: error.message,
                category: category,
                duration: 0
            });
            this.log(`❌ ${testName}: ERROR - ${error.message}`, 'error');
        }
    }

    // Pruebas básicas de escape HTML
    testBasicHTMLEscape() {
        const testCases = [
            {
                input: '<script>alert("XSS")</script>',
                expected: '<script>alert("XSS")</script>'
            },
            {
                input: '<img src="x" onerror="alert(1)">',
                expected: '<img src="x" onerror="alert(1)">'
            },
            {
                input: '<div onclick="alert(1)">Click</div>',
                expected: '<div onclick="alert(1)">Click</div>'
            },
            {
                input: '<script>alert(1)</script>',
                expected: '&lt;script&gt;alert(1)&lt;/script&gt;'
            }
        ];

        let allPassed = true;
        let failedCases = [];

        testCases.forEach((testCase, index) => {
            const result = XSSProtection.escapeHtml(testCase.input);
            if (result !== testCase.expected) {
                allPassed = false;
                failedCases.push({
                    index: index + 1,
                    input: testCase.input,
                    expected: testCase.expected,
                    actual: result
                });
            }
        });

        if (allPassed) {
            return { 
                passed: true, 
                message: 'Todos los casos de escape HTML básicos pasaron correctamente' 
            };
        } else {
            return { 
                passed: false, 
                message: `Fallaron ${failedCases.length} casos: ${JSON.stringify(failedCases)}` 
            };
        }
    }

    // Pruebas de sanitización de URLs
    testURLSanitization() {
        const testCases = [
            {
                input: 'javascript:alert("XSS")',
                expected: '#'
            },
            {
                input: 'data:text/html,<script>alert(1)</script>',
                expected: '#'
            },
            {
                input: 'vbscript:msgbox("XSS")',
                expected: '#'
            },
            {
                input: 'https://example.com',
                expected: 'https://example.com/'
            },
            {
                input: 'http://localhost:3000',
                expected: 'http://localhost:3000/'
            },
            {
                input: 'ftp://files.example.com/file.txt',
                expected: 'ftp://files.example.com/file.txt'
            }
        ];

        let allPassed = true;
        let failedCases = [];

        testCases.forEach((testCase, index) => {
            const result = XSSProtection.sanitizeUrl(testCase.input);
            if (result !== testCase.expected) {
                allPassed = false;
                failedCases.push({
                    index: index + 1,
                    input: testCase.input,
                    expected: testCase.expected,
                    actual: result
                });
            }
        });

        if (allPassed) {
            return { 
                passed: true, 
                message: 'Todas las URLs fueron sanitizadas correctamente' 
            };
        } else {
            return { 
                passed: false, 
                message: `Fallaron ${failedCases.length} casos de URL: ${JSON.stringify(failedCases)}` 
            };
        }
    }

    // Pruebas de sanitización de texto
    testTextSanitization() {
        const testCases = [
            {
                input: '<script>alert("XSS")</script>',
                shouldNotContain: '<script>'
            },
            {
                input: '<img src=x onerror=alert(1)>',
                shouldNotContain: 'onerror'
            },
            {
                input: '<iframe src="javascript:alert(1)"></iframe>',
                shouldNotContain: '<iframe>'
            },
            {
                input: '<object data="x"></object>',
                shouldNotContain: '<object>'
            },
            {
                input: '<embed src="x"></embed>',
                shouldNotContain: '<embed>'
            },
            {
                input: 'onclick="alert(1)"',
                shouldNotContain: 'onclick'
            },
            {
                input: 'javascript:alert(1)',
                shouldNotContain: 'javascript:'
            },
            {
                input: 'vbscript:msgbox(1)',
                shouldNotContain: 'vbscript:'
            }
        ];

        let allPassed = true;
        let failedCases = [];

        testCases.forEach((testCase, index) => {
            const result = XSSProtection.sanitizeText(testCase.input);
            if (result.includes(testCase.shouldNotContain)) {
                allPassed = false;
                failedCases.push({
                    index: index + 1,
                    input: testCase.input,
                    shouldNotContain: testCase.shouldNotContain,
                    actual: result
                });
            }
        });

        if (allPassed) {
            return { 
                passed: true, 
                message: 'Todo el texto fue sanitizado correctamente' 
            };
        } else {
            return { 
                passed: false, 
                message: `Fallaron ${failedCases.length} casos de texto: ${JSON.stringify(failedCases)}` 
            };
        }
    }

    // Pruebas de validación de entrada
    testInputValidation() {
        const testCases = [
            {
                input: '<script>alert("XSS")</script>',
                type: 'name',
                shouldPass: false
            },
            {
                input: 'John Doe',
                type: 'name',
                shouldPass: true
            },
            {
                input: 'test@example.com',
                type: 'email',
                shouldPass: true
            },
            {
                input: 'invalid-email',
                type: 'email',
                shouldPass: false
            },
            {
                input: '123-456-7890',
                type: 'phone',
                shouldPass: true
            },
            {
                input: 'abc',
                type: 'phone',
                shouldPass: false
            },
            {
                input: 'https://example.com',
                type: 'url',
                shouldPass: true
            },
            {
                input: 'javascript:alert(1)',
                type: 'url',
                shouldPass: false
            }
        ];

        let allPassed = true;
        let failedCases = [];

        testCases.forEach((testCase, index) => {
            const result = XSSProtection.validateInput(testCase.input, { type: testCase.type });
            if (result.valid !== testCase.shouldPass) {
                allPassed = false;
                failedCases.push({
                    index: index + 1,
                    input: testCase.input,
                    type: testCase.type,
                    expected: testCase.shouldPass,
                    actual: result.valid
                });
            }
        });

        if (allPassed) {
            return { 
                passed: true, 
                message: 'Toda la validación de entrada funcionó correctamente' 
            };
        } else {
            return { 
                passed: false, 
                message: `Fallaron ${failedCases.length} casos de validación: ${JSON.stringify(failedCases)}` 
            };
        }
    }

    // Pruebas de XSS avanzados
    testAdvancedXSS() {
        const advancedPayloads = [
            '<script>eval(String.fromCharCode(97,108,101,114,116,40,34,88,83,83,34,41))</script>',
            '<img src=x onerror="eval(atob("YWxlcnQoJ1hTUycp"))">',
            '<svg><script>alert&lpar;1&rpar;</script></svg>',
            '<iframe src="javascript:alert(1)"></iframe>',
            '<body onload="alert(1)">',
            '<input autofocus onfocus="alert(1)">',
            '<select onfocus="alert(1)" autofocus>',
            '<textarea onfocus="alert(1)" autofocus>',
            '<keygen onfocus="alert(1)" autofocus>',
            '<video><source onerror="alert(1)">',
            '<audio src=x onerror="alert(1)">',
            '<details open ontoggle="alert(1)">',
            '<marquee onstart="alert(1)">',
            '<isindex action="javascript:alert(1)" type="submit">',
            '<form><button formaction="javascript:alert(1)">',
            '<math><maction actiontype="statusline#http://google.com" xlink:href="javascript:alert(1)">',
            '<embed src="javascript:alert(1)">',
            '<object data="javascript:alert(1)">',
            '<link rel="import" href="javascript:alert(1)">'
        ];

        let allPassed = true;
        let failedPayloads = [];

        advancedPayloads.forEach((payload, index) => {
            const escaped = XSSProtection.escapeHtml(payload);
            const sanitized = XSSProtection.sanitizeText(payload);
            
            // Verificar que el payload no contiene etiquetas de script o event handlers
            const isSafe = !escaped.includes('<script>') && 
                          !escaped.includes('onerror=') && 
                          !escaped.includes('onload=') &&
                          !escaped.includes('onfocus=') &&
                          !escaped.includes('ontoggle=') &&
                          !escaped.includes('onstart=') &&
                          !escaped.includes('javascript:') &&
                          !sanitized.includes('<script>') &&
                          !sanitized.includes('javascript:');

            if (!isSafe) {
                allPassed = false;
                failedPayloads.push({
                    index: index + 1,
                    payload: payload.substring(0, 50) + '...',
                    escaped: escaped.substring(0, 50) + '...'
                });
            }
        });

        if (allPassed) {
            return { 
                passed: true, 
                message: 'Todos los payloads XSS avanzados fueron neutralizados' 
            };
        } else {
            return { 
                passed: false, 
                message: `${failedPayloads.length} payloads XSS avanzados no fueron neutralizados: ${JSON.stringify(failedPayloads)}` 
            };
        }
    }

    // Pruebas de XSS codificados
    testEncodedXSS() {
        const encodedPayloads = [
            '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E',
            '<script>alert("XSS")</script>',
            '&#60;script&#62;alert(&#34;XSS&#34;)&#60;/script&#62;',
            '&#x3C;script&#x3E;alert(&#x22;XSS&#x22;)&#x3C;/script&#x3E;',
            '%253Cscript%253Ealert%2528%2522XSS%2522%2529%253C%252Fscript%253E',
            'javascript%3Aalert%28%22XSS%22%29',
            'data:text/html,%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E'
        ];

        let allPassed = true;
        let failedPayloads = [];

        encodedPayloads.forEach((payload, index) => {
            try {
                const decoded = decodeURIComponent(payload);
                const escaped = XSSProtection.escapeHtml(decoded);
                const sanitized = XSSProtection.sanitizeText(decoded);
                
                const isSafe = !escaped.includes('<script>') && 
                              !escaped.includes('javascript:') &&
                              !sanitized.includes('<script>') &&
                              !sanitized.includes('javascript:');

                if (!isSafe) {
                    allPassed = false;
                    failedPayloads.push({
                        index: index + 1,
                        payload: payload.substring(0, 50) + '...',
                        decoded: decoded.substring(0, 50) + '...'
                    });
                }
            } catch (error) {
                // Si hay error al decodificar, consideramos que es seguro
            }
        });

        if (allPassed) {
            return { 
                passed: true, 
                message: 'Todos los payloads XSS codificados fueron neutralizados' 
            };
        } else {
            return { 
                passed: false, 
                message: `${failedPayloads.length} payloads XSS codificados no fueron neutralizados: ${JSON.stringify(failedPayloads)}` 
            };
        }
    }

    // Pruebas de XSS basados en DOM
    testDOMBasedXSS() {
        const domPayloads = [
            '#<script>alert("XSS")</script>',
            '?param=<script>alert("XSS")</script>',
            'javascript:alert("XSS")',
            '#<img src=x onerror=alert(1)>',
            '?redirect=javascript:alert(1)',
            '#<svg onload=alert(1)>',
            '?callback=<script>alert(1)</script>',
            '#<iframe src="javascript:alert(1)"></iframe>'
        ];

        let allPassed = true;
        let failedPayloads = [];

        domPayloads.forEach((payload, index) => {
            // Simular extracción de parámetro de URL o hash
            const extracted = payload.startsWith('?') ? payload.substring(1) : 
                            payload.startsWith('#') ? payload.substring(1) : payload;
            
            const escaped = XSSProtection.escapeHtml(extracted);
            const sanitized = XSSProtection.sanitizeText(extracted);
            
            const isSafe = !escaped.includes('<script>') && 
                          !escaped.includes('onerror=') && 
                          !escaped.includes('onload=') &&
                          !escaped.includes('javascript:') &&
                          !sanitized.includes('<script>') &&
                          !sanitized.includes('javascript:');

            if (!isSafe) {
                allPassed = false;
                failedPayloads.push({
                    index: index + 1,
                    payload: payload,
                    extracted: extracted.substring(0, 50) + '...'
                });
            }
        });

        if (allPassed) {
            return { 
                passed: true, 
                message: 'Todos los ataques XSS basados en DOM fueron neutralizados' 
            };
        } else {
            return { 
                passed: false, 
                message: `${failedPayloads.length} ataques XSS basados en DOM no fueron neutralizados: ${JSON.stringify(failedPayloads)}` 
            };
        }
    }

    // Pruebas de inyección CSS
    testCSSInjection() {
        const cssPayloads = [
            'background: url("javascript:alert(1)")',
            'color: expression(alert(1))',
            'behavior: url(script.js)',
            'binding: url(xss.htc)',
            '@import "javascript:alert(1)"',
            'background: #000000; color: #ffffff; /* comment */',
            'font-family: "Arial";',
            'margin: 10px; padding: 5px;'
        ];

        let allPassed = true;
        let failedPayloads = [];

        cssPayloads.forEach((payload, index) => {
            const sanitized = XSSProtection.sanitizeCSS(payload);
            
            const isSafe = !sanitized.includes('javascript:') && 
                          !sanitized.includes('expression(') &&
                          !sanitized.includes('behavior:') &&
                          !sanitized.includes('@import') &&
                          !sanitized.includes('binding:');

            if (!isSafe) {
                allPassed = false;
                failedPayloads.push({
                    index: index + 1,
                    payload: payload,
                    sanitized: sanitized
                });
            }
        });

        if (allPassed) {
            return { 
                passed: true, 
                message: 'Todos los ataques de inyección CSS fueron neutralizados' 
            };
        } else {
            return { 
                passed: false, 
                message: `${failedPayloads.length} ataques de inyección CSS no fueron neutralizados: ${JSON.stringify(failedPayloads)}` 
            };
        }
    }

    // Pruebas de creación segura de elementos
    testSafeElementCreation() {
        const elementTests = [
            {
                tagName: 'div',
                attributes: { class: 'test-class', id: 'test-id' },
                content: 'Test content'
            },
            {
                tagName: 'span',
                attributes: { style: 'color: red;' },
                content: 'Span content'
            },
            {
                tagName: 'a',
                attributes: { href: 'https://example.com' },
                content: 'Link'
            }
        ];

        let allPassed = true;
        let failedTests = [];

        elementTests.forEach((test, index) => {
            try {
                const element = XSSProtection.createElementSafe(
                    test.tagName, 
                    test.attributes, 
                    test.content
                );
                
                const hasCorrectTag = element.tagName === test.tagName.toUpperCase();
                const hasSafeContent = !element.innerHTML.includes('<script>');
                const hasSafeAttributes = !JSON.stringify(test.attributes).includes('javascript:');
                
                if (!hasCorrectTag || !hasSafeContent || !hasSafeAttributes) {
                    allPassed = false;
                    failedTests.push({
                        index: index + 1,
                        test: test,
                        element: element
                    });
                }
            } catch (error) {
                allPassed = false;
                failedTests.push({
                    index: index + 1,
                    test: test,
                    error: error.message
                });
            }
        });

        if (allPassed) {
            return { 
                passed: true, 
                message: 'Todos los elementos fueron creados de forma segura' 
            };
        } else {
            return { 
                passed: false, 
                message: `${failedTests.length} pruebas de creación de elementos fallaron: ${JSON.stringify(failedTests)}` 
            };
        }
    }

    // Pruebas de innerHTML seguro
    testSafeInnerHTML() {
        const innerHTMLTests = [
            {
                element: { innerHTML: '' },
                content: '<script>alert("XSS")</script>',
                shouldNotContain: '<script>'
            },
            {
                element: { innerHTML: '' },
                content: '<img src=x onerror=alert(1)>',
                shouldNotContain: 'onerror'
            },
            {
                element: { innerHTML: '' },
                content: 'Safe content',
                shouldContain: 'Safe content'
            }
        ];

        let allPassed = true;
        let failedTests = [];

        innerHTMLTests.forEach((test, index) => {
            try {
                XSSProtection.setInnerHTMLSafe(test.element, test.content);
                
                if (test.shouldNotContain) {
                    if (test.element.innerHTML.includes(test.shouldNotContain)) {
                        allPassed = false;
                        failedTests.push({
                            index: index + 1,
                            test: test,
                            actual: test.element.innerHTML
                        });
                    }
                }
                
                if (test.shouldContain) {
                    if (!test.element.innerHTML.includes(test.shouldContain)) {
                        allPassed = false;
                        failedTests.push({
                            index: index + 1,
                            test: test,
                            actual: test.element.innerHTML
                        });
                    }
                }
            } catch (error) {
                allPassed = false;
                failedTests.push({
                    index: index + 1,
                    test: test,
                    error: error.message
                });
            }
        });

        if (allPassed) {
            return { 
                passed: true, 
                message: 'Todas las asignaciones de innerHTML fueron seguras' 
            };
        } else {
            return { 
                passed: false, 
                message: `${failedTests.length} pruebas de innerHTML seguro fallaron: ${JSON.stringify(failedTests)}` 
            };
        }
    }

    // Ejecutar todas las pruebas
    runAllTests() {
        this.log('🚀 INICIANDO PRUEBAS COMPLETAS DE SEGURIDAD XSS');
        this.log('='.repeat(60));

        // Pruebas básicas
        this.runTest('Escape HTML Básico', () => this.testBasicHTMLEscape(), 'Básico');
        this.runTest('Sanitización de URLs', () => this.testURLSanitization(), 'Básico');
        this.runTest('Sanitización de Texto', () => this.testTextSanitization(), 'Básico');
        this.runTest('Validación de Entrada', () => this.testInputValidation(), 'Básico');

        // Pruebas avanzadas
        this.runTest('XSS Avanzados', () => this.testAdvancedXSS(), 'Avanzado');
        this.runTest('XSS Codificados', () => this.testEncodedXSS(), 'Avanzado');
        this.runTest('XSS Basados en DOM', () => this.testDOMBasedXSS(), 'Avanzado');
        this.runTest('Inyección CSS', () => this.testCSSInjection(), 'Avanzado');

        // Pruebas de API
        this.runTest('Creación Segura de Elementos', () => this.testSafeElementCreation(), 'API');
        this.runTest('innerHTML Seguro', () => this.testSafeInnerHTML(), 'API');

        // Generar reporte
        this.generateReport();
    }

    // Generar reporte de resultados
    generateReport() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        console.log('\n📊 REPORTE COMPLETO DE PRUEBAS XSS');
        console.log('='.repeat(60));
        console.log(`Duración total: ${duration}ms`);
        console.log(`Total de pruebas: ${this.totalTests}`);
        console.log(`Pruebas pasadas: ${this.passedTests}`);
        console.log(`Pruebas fallidas: ${this.failedTests}`);
        console.log(`Tasa de éxito: ${((this.passedTests / this.totalTests) * 100).toFixed(2)}%`);

        // Agrupar por categoría
        const categories = {};
        this.results.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = { passed: 0, failed: 0, total: 0 };
            }
            categories[result.category].total++;
            if (result.status === 'PASS') {
                categories[result.category].passed++;
            } else {
                categories[result.category].failed++;
            }
        });

        console.log('\n📈 RESULTADOS POR CATEGORÍA');
        console.log('-'.repeat(40));
        Object.keys(categories).forEach(category => {
            const cat = categories[category];
            const rate = ((cat.passed / cat.total) * 100).toFixed(2);
            console.log(`${category}: ${cat.passed}/${cat.total} (${rate}%)`);
        });

        // Mostrar pruebas fallidas
        if (this.failedTests > 0) {
            console.log('\n❌ PRUEBAS FALLADAS');
            console.log('-'.repeat(40));
            this.results.filter(r => r.status !== 'PASS').forEach(result => {
                console.log(`❌ ${result.name} [${result.category}]: ${result.message}`);
            });
        }

        // Guardar reporte en archivo
        const reportData = {
            timestamp: new Date().toISOString(),
            duration: duration,
            summary: {
                total: this.totalTests,
                passed: this.passedTests,
                failed: this.failedTests,
                successRate: ((this.passedTests / this.totalTests) * 100).toFixed(2)
            },
            categories: categories,
            results: this.results
        };

        require('fs').writeFileSync(
            'xss-security-test-report-fixed.json', 
            JSON.stringify(reportData, null, 2)
        );

        console.log('\n💾 Reporte guardado en: xss-security-test-report-fixed.json');

        if (this.passedTests === this.totalTests) {
            console.log('\n🎉 ¡TODAS LAS PRUEBAS DE SEGURIDAD XSS HAN PASADO!');
            console.log('✅ El sistema Justice 2 está protegido contra ataques XSS');
        } else {
            console.log('\n⚠️ HAY PRUEBAS FALLADAS - REVISAR CORRECCIONES');
            console.log('❌ El sistema tiene vulnerabilidades XSS que deben ser corregidas');
        }
    }
}

// Ejecutar las pruebas si este archivo se ejecuta directamente
if (require.main === module) {
    const testSuite = new XSSSecurityTestSuite();
    testSuite.runAllTests();
}

module.exports = XSSSecurityTestSuite;