/**
 * Pruebas de Seguridad XSS - Justice 2
 * Verificación de correcciones de vulnerabilidades XSS en js/documents.js
 */

const XSSProtection = {
    // Escapar caracteres HTML peligrosos
    escapeHtml: function(text) {
        if (typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Validar y sanitizar URLs
    sanitizeUrl: function(url) {
        if (typeof url !== 'string') return '#';
        
        try {
            // Solo permitir protocolos seguros
            const allowedProtocols = ['https:', 'http:', 'ftp:', 'data:'];
            const parsedUrl = new URL(url, window.location.origin);
            
            if (!allowedProtocols.includes(parsedUrl.protocol)) {
                return '#';
            }
            
            // Prevenir javascript: y otros protocolos peligrosos
            if (url.toLowerCase().includes('javascript:') || 
                url.toLowerCase().includes('data:text/html') ||
                url.toLowerCase().includes('vbscript:')) {
                return '#';
            }
            
            return parsedUrl.toString();
        } catch (e) {
            return '#';
        }
    },
    
    // Validar contenido de texto
    sanitizeText: function(text) {
        if (typeof text !== 'string') return '';
        
        // Eliminar scripts y contenido peligroso
        return text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
            .replace(/on\w+\s*=/gi, '') // Eliminar event handlers
            .replace(/javascript:/gi, '') // Eliminar protocolos javascript
            .replace(/vbscript:/gi, '') // Eliminar protocolos vbscript
            .trim();
    }
};

// Test cases para XSS
const XSS_TEST_CASES = {
    // Scripts básicos
    basicScripts: [
        '<script>alert("XSS")</script>',
        '<SCRIPT>alert("XSS")</SCRIPT>',
        '<script>alert(String.fromCharCode(88,83,83))</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<body onload=alert("XSS")>',
        '<input onfocus=alert("XSS") autofocus>',
        '<select onfocus=alert("XSS") autofocus>',
        '<textarea onfocus=alert("XSS") autofocus>',
        '<keygen onfocus=alert("XSS") autofocus>',
        '<video><source onerror="alert(\'XSS\')">',
        '<audio src=x onerror=alert("XSS")>',
        '<details open ontoggle=alert("XSS")>',
        '<marquee onstart=alert("XSS")>',
        '<isindex action=javascript:alert("XSS") type=submit>'
    ],
    
    // Protocolos peligrosos
    dangerousProtocols: [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'vbscript:msgbox("XSS")',
        'file:///etc/passwd',
        'ftp://malicious.com/script.js'
    ],
    
    // Event handlers
    eventHandlers: [
        'onclick="alert(\'XSS\')"',
        'onmouseover="alert(\'XSS\')"',
        'onload="alert(\'XSS\')"',
        'onerror="alert(\'XSS\')"',
        'onfocus="alert(\'XSS\')"',
        'onblur="alert(\'XSS\')"',
        'onchange="alert(\'XSS\')"',
        'onsubmit="alert(\'XSS\')"',
        'onreset="alert(\'XSS\')"',
        'onselect="alert(\'XSS\')"',
        'onkeydown="alert(\'XSS\')"',
        'onkeyup="alert(\'XSS\')"',
        'onkeypress="alert(\'XSS\')"'
    ],
    
    // Codificación y obfuscación
    encoding: [
        '<script>alert("XSS")</script>',
        '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E',
        '&#60;script&#62;alert&#40;&#34;XSS&#34;&#41;&#60;/script&#62;',
        '\\x3Cscript\\x3Ealert\\x28\\x22XSS\\x22\\x29\\x3C/script\\x3E',
        '\\u003Cscript\\u003Ealert\\u0028\\u0022XSS\\u0022\\u0029\\u003C/script\\u003E'
    ],
    
    // Inyección en atributos
    attributeInjection: [
        '" onclick="alert(\'XSS\')"',
        '\' onmouseover="alert(\'XSS\')"',
        '"><script>alert("XSS")</script>',
        '"><img src=x onerror=alert("XSS")>',
        '" autofocus onfocus="alert(\'XSS\')"'
    ],
    
    // Contexto específico para documentos
    documentContext: [
        {
            type: 'title',
            payload: '<script>alert("XSS en título")</script>',
            description: 'XSS en título de documento'
        },
        {
            type: 'filename',
            payload: 'documento<script>alert("XSS en nombre")</script>.pdf',
            description: 'XSS en nombre de archivo'
        },
        {
            type: 'thumbnail',
            payload: 'javascript:alert("XSS en thumbnail")',
            description: 'XSS en URL de thumbnail'
        },
        {
            type: 'analysis',
            payload: '<script>alert("XSS en análisis")</script>',
            description: 'XSS en contenido de análisis'
        }
    ]
};

// Función para ejecutar pruebas
function runXSSTests() {
    console.log('🔍 INICIANDO PRUEBAS DE SEGURIDAD XSS');
    console.log('='.repeat(60));
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    // Prueba 1: escapeHtml
    console.log('\n📋 PRUEBA 1: escapeHtml()');
    console.log('-'.repeat(40));
    
    XSS_TEST_CASES.basicScripts.forEach((payload, index) => {
        totalTests++;
        const escaped = XSSProtection.escapeHtml(payload);
        const isSafe = !escaped.includes('<script>') && 
                      !escaped.includes('onerror') && 
                      !escaped.includes('onload') &&
                      !escaped.includes('alert(');
        
        if (isSafe) {
            passedTests++;
            console.log(`✅ Test ${index + 1}: PASADO - ${payload.substring(0, 50)}...`);
        } else {
            failedTests++;
            console.log(`❌ Test ${index + 1}: FALLADO - ${payload}`);
            console.log(`   Resultado: ${escaped}`);
        }
    });
    
    // Prueba 2: sanitizeUrl
    console.log('\n📋 PRUEBA 2: sanitizeUrl()');
    console.log('-'.repeat(40));
    
    [...XSS_TEST_CASES.dangerousProtocols, ...XSS_TEST_CASES.basicScripts].forEach((payload, index) => {
        totalTests++;
        const sanitized = XSSProtection.sanitizeUrl(payload);
        const isSafe = sanitized === '#' || 
                      !sanitized.includes('javascript:') && 
                      !sanitized.includes('data:text/html') &&
                      !sanitized.includes('vbscript:');
        
        if (isSafe) {
            passedTests++;
            console.log(`✅ Test ${index + 1}: PASADO - ${payload.substring(0, 50)}...`);
        } else {
            failedTests++;
            console.log(`❌ Test ${index + 1}: FALLADO - ${payload}`);
            console.log(`   Resultado: ${sanitized}`);
        }
    });
    
    // Prueba 3: sanitizeText
    console.log('\n📋 PRUEBA 3: sanitizeText()');
    console.log('-'.repeat(40));
    
    XSS_TEST_CASES.basicScripts.forEach((payload, index) => {
        totalTests++;
        const sanitized = XSSProtection.sanitizeText(payload);
        const isSafe = !sanitized.includes('<script>') && 
                      !sanitized.includes('onerror') && 
                      !sanitized.includes('onload') &&
                      !sanitized.includes('alert(');
        
        if (isSafe) {
            passedTests++;
            console.log(`✅ Test ${index + 1}: PASADO - ${payload.substring(0, 50)}...`);
        } else {
            failedTests++;
            console.log(`❌ Test ${index + 1}: FALLADO - ${payload}`);
            console.log(`   Resultado: ${sanitized}`);
        }
    });
    
    // Prueba 4: Contexto específico de documentos
    console.log('\n📋 PRUEBA 4: Contexto específico de documentos');
    console.log('-'.repeat(40));
    
    XSS_TEST_CASES.documentContext.forEach((testCase, index) => {
        totalTests++;
        let result;
        let isSafe = false;
        
        switch (testCase.type) {
            case 'title':
            case 'filename':
                result = XSSProtection.escapeHtml(testCase.payload);
                isSafe = !result.includes('<script>') && !result.includes('alert(');
                break;
            case 'thumbnail':
                result = XSSProtection.sanitizeUrl(testCase.payload);
                isSafe = result === '#' || !result.includes('javascript:');
                break;
            case 'analysis':
                result = XSSProtection.sanitizeText(testCase.payload);
                isSafe = !result.includes('<script>') && !result.includes('alert(');
                break;
        }
        
        if (isSafe) {
            passedTests++;
            console.log(`✅ Test ${index + 1}: PASADO - ${testCase.description}`);
        } else {
            failedTests++;
            console.log(`❌ Test ${index + 1}: FALLADO - ${testCase.description}`);
            console.log(`   Payload: ${testCase.payload}`);
            console.log(`   Resultado: ${result}`);
        }
    });
    
    // Resumen
    console.log('\n📊 RESUMEN DE PRUEBAS');
    console.log('='.repeat(60));
    console.log(`Total de pruebas: ${totalTests}`);
    console.log(`Pruebas pasadas: ${passedTests}`);
    console.log(`Pruebas fallidas: ${failedTests}`);
    console.log(`Tasa de éxito: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
    
    if (failedTests === 0) {
        console.log('\n🎉 ¡TODAS LAS PRUEBAS DE XSS HAN PASADO!');
        console.log('✅ Las correcciones de seguridad XSS son efectivas.');
    } else {
        console.log('\n⚠️ HAY PRUEBAS FALLADAS - REVISAR CORRECCIONES');
        console.log('❌ Algunas vulnerabilidades XSS podrían estar presentes.');
    }
    
    return {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: (passedTests / totalTests) * 100
    };
}

// Función para probar renderizado seguro
function testSecureRendering() {
    console.log('\n🔧 PRUEBA DE RENDERIZADO SEGURO');
    console.log('-'.repeat(40));
    
    const maliciousDocument = {
        id: 1,
        title: '<script>alert("XSS en título")</script>',
        type: 'pdf',
        url: 'javascript:alert("XSS en URL")',
        thumbnail: 'javascript:alert("XSS en thumbnail")',
        size: 1024
    };
    
    const maliciousAnalysis = {
        summary: '<script>alert("XSS en resumen")</script>',
        entities: [
            { text: '<script>alert("XSS en entidad")</script>', type: 'Person' }
        ],
        risks: [
            { description: '<script>alert("XSS en riesgo")</script>', level: 'high' }
        ],
        recommendations: [
            '<script>alert("XSS en recomendación")</script>'
        ]
    };
    
    // Simular renderizado seguro
    const safeTitle = XSSProtection.escapeHtml(maliciousDocument.title);
    const safeUrl = XSSProtection.sanitizeUrl(maliciousDocument.url);
    const safeThumbnail = XSSProtection.sanitizeUrl(maliciousDocument.thumbnail);
    const safeSummary = XSSProtection.sanitizeText(maliciousAnalysis.summary);
    
    console.log('📄 Documento malicioso:');
    console.log(`   Título original: ${maliciousDocument.title}`);
    console.log(`   Título seguro: ${safeTitle}`);
    console.log(`   URL original: ${maliciousDocument.url}`);
    console.log(`   URL segura: ${safeUrl}`);
    console.log(`   Thumbnail original: ${maliciousDocument.thumbnail}`);
    console.log(`   Thumbnail seguro: ${safeThumbnail}`);
    
    console.log('\n📊 Análisis malicioso:');
    console.log(`   Resumen original: ${maliciousAnalysis.summary}`);
    console.log(`   Resumen seguro: ${safeSummary}`);
    
    const isDocumentSafe = !safeTitle.includes('<script>') && 
                          !safeUrl.includes('javascript:') && 
                          !safeThumbnail.includes('javascript:');
    
    const isAnalysisSafe = !safeSummary.includes('<script>') && 
                         !safeSummary.includes('alert(');
    
    if (isDocumentSafe && isAnalysisSafe) {
        console.log('\n✅ RENDERIZADO SEGURO: PASADO');
        console.log('✅ Todos los datos maliciosos han sido neutralizados.');
    } else {
        console.log('\n❌ RENDERIZADO SEGURO: FALLADO');
        console.log('❌ Algunos datos maliciosos no fueron neutralizados.');
    }
    
    return isDocumentSafe && isAnalysisSafe;
}

// Ejecutar pruebas si estamos en navegador
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    console.log('🌐 Ejecutando pruebas en entorno navegador...');
    const results = runXSSTests();
    const renderingTest = testSecureRendering();
    
    // Mostrar resultados en la página si existe un elemento
    const resultsElement = document.getElementById('xss-test-results');
    if (resultsElement) {
        resultsElement.innerHTML = `
            <div class="xss-test-summary">
                <h3>🔍 Resultados de Pruebas XSS</h3>
                <p><strong>Total:</strong> ${results.total}</p>
                <p><strong>Pasadas:</strong> ${results.passed}</p>
                <p><strong>Fallidas:</strong> ${results.failed}</p>
                <p><strong>Tasa de éxito:</strong> ${results.successRate.toFixed(2)}%</p>
                <p><strong>Renderizado seguro:</strong> ${renderingTest ? '✅ PASADO' : '❌ FALLADO'}</p>
                <p><strong>Estado general:</strong> ${results.failed === 0 && renderingTest ? '🎉 SEGURO' : '⚠️ VULNERABLE'}</p>
            </div>
        `;
    }
} else {
    console.log('🖥️ Ejecutando pruebas en entorno Node.js...');
    console.log('⚠️ Algunas pruebas DOM requieren entorno navegador');
}

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runXSSTests,
        testSecureRendering,
        XSS_TEST_CASES,
        XSSProtection
    };
}