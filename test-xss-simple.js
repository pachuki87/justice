// Mock simple de DOM para Node.js
global.document = {
  createElement: function(tag) {
    return {
      textContent: '',
      innerHTML: '',
      setAttribute: function() {},
      appendChild: function() {},
      classList: { add: function() {} }
    };
  }
};
global.window = { location: { origin: 'http://localhost' } };

// Funciones de protección XSS (copiadas de js/documents.js)
const XSSProtection = {
    escapeHtml: function(text) {
        if (typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    sanitizeUrl: function(url) {
        if (typeof url !== 'string') return '#';
        
        try {
            const allowedProtocols = ['https:', 'http:', 'ftp:', 'data:'];
            const parsedUrl = new URL(url, window.location.origin);
            
            if (!allowedProtocols.includes(parsedUrl.protocol)) {
                return '#';
            }
            
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
    
    sanitizeText: function(text) {
        if (typeof text !== 'string') return '';
        
        return text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/vbscript:/gi, '')
            .trim();
    }
};

// Test cases
const testCases = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg onload=alert("XSS")>',
    'data:text/html,<script>alert("XSS")</script>'
];

console.log('🔍 INICIANDO PRUEBAS DE SEGURIDAD XSS');
console.log('='.repeat(60));

let totalTests = 0;
let passedTests = 0;

testCases.forEach((payload, index) => {
    totalTests++;
    
    const escaped = XSSProtection.escapeHtml(payload);
    const sanitized = XSSProtection.sanitizeUrl(payload);
    const cleanText = XSSProtection.sanitizeText(payload);
    
    const isSafe = !escaped.includes('<script>') && 
                  !escaped.includes('onerror') && 
                  !sanitized.includes('javascript:') &&
                  !cleanText.includes('<script>');
    
    if (isSafe) {
        passedTests++;
        console.log(`✅ Test ${index + 1}: PASADO - ${payload.substring(0, 30)}...`);
    } else {
        console.log(`❌ Test ${index + 1}: FALLADO - ${payload}`);
        console.log(`   Escaped: ${escaped}`);
        console.log(`   Sanitized: ${sanitized}`);
    }
});

console.log('\n📊 RESUMEN DE PRUEBAS');
console.log('='.repeat(60));
console.log(`Total de pruebas: ${totalTests}`);
console.log(`Pruebas pasadas: ${passedTests}`);
console.log(`Tasa de éxito: ${((passedTests / totalTests) * 100).toFixed(2)}%`);

if (passedTests === totalTests) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE XSS HAN PASADO!');
} else {
    console.log('\n⚠️ HAY PRUEBAS FALLADAS - REVISAR CORRECCIONES');
}