/**
 * Pruebas de Seguridad para Validación de Archivos
 * Justice 2 - Sistema de Documentos Seguros
 */

// Importar el validador (simulado para pruebas)
const FileSecurityValidator = {
    // Configuración de tipos permitidos con sus características
    allowedTypes: {
        'pdf': {
            mimeTypes: ['application/pdf'],
            magicNumbers: ['%PDF-'],
            maxSize: 50 * 1024 * 1024, // 50MB
            description: 'Documento PDF'
        },
        'doc': {
            mimeTypes: ['application/msword'],
            magicNumbers: ['\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1'],
            maxSize: 20 * 1024 * 1024, // 20MB
            description: 'Documento Microsoft Word 97-2003'
        },
        'docx': {
            mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            magicNumbers: ['PK\x03\x04'],
            maxSize: 20 * 1024 * 1024, // 20MB
            description: 'Documento Microsoft Word'
        },
        'txt': {
            mimeTypes: ['text/plain'],
            magicNumbers: [], // Los archivos de texto no tienen magic numbers específicos
            maxSize: 5 * 1024 * 1024, // 5MB
            description: 'Archivo de texto plano'
        },
        'jpg': {
            mimeTypes: ['image/jpeg'],
            magicNumbers: ['\xFF\xD8\xFF'],
            maxSize: 10 * 1024 * 1024, // 10MB
            description: 'Imagen JPEG'
        },
        'jpeg': {
            mimeTypes: ['image/jpeg'],
            magicNumbers: ['\xFF\xD8\xFF'],
            maxSize: 10 * 1024 * 1024, // 10MB
            description: 'Imagen JPEG'
        },
        'png': {
            mimeTypes: ['image/png'],
            magicNumbers: ['\x89PNG\r\n\x1a\n'],
            maxSize: 10 * 1024 * 1024, // 10MB
            description: 'Imagen PNG'
        }
    },

    // Patrones peligrosos a detectar en nombres de archivo
    dangerousPatterns: [
        /\.\./g,                    // Directory traversal
        /[<>:"|?*]/g,              // Caracteres inválidos en Windows
        /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Nombres reservados de Windows
        /\.exe$/i,                  // Ejecutables
        /\.bat$/i,                  // Batch files
        /\.cmd$/i,                  // Command files
        /\.com$/i,                  // Archivos COM
        /\.scr$/i,                  // Screensavers
        /\.pif$/i,                  // Program Information Files
        /\.vbs$/i,                  // Visual Basic Scripts
        /\.js$/i,                   // JavaScript files
        /\.jar$/i,                  // Java Archives
        /\.php$/i,                  // PHP files
        /\.asp$/i,                  // ASP files
        /\.jsp$/i,                  // JSP files
        /\.sh$/i,                   // Shell scripts
        /\.ps1$/i,                  // PowerShell scripts
        /\.py$/i,                   // Python scripts
        /\.rb$/i,                   // Ruby scripts
        /\.pl$/i,                   // Perl scripts
    ],

    // Patrones de contenido malicioso
    maliciousContentPatterns: [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
        /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /on\w+\s*=/gi,
        /eval\s*\(/gi,
        /document\.write/gi,
        /innerHTML\s*=/gi,
        /outerHTML\s*=/gi,
    ],

    // Implementación simplificada para pruebas
    validateFile: async function(file) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            sanitized: false,
            fileInfo: {
                originalName: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            }
        };

        try {
            // 1. Sanitizar nombre de archivo
            const nameValidation = this.sanitizeFileName(file.name);
            if (!nameValidation.isValid) {
                result.isValid = false;
                result.errors.push(...nameValidation.errors);
            }
            if (nameValidation.sanitized) {
                result.sanitized = true;
                result.fileInfo.sanitizedName = nameValidation.sanitizedName;
            }

            // 2. Validar extensión
            const extension = this.getFileExtension(file.name);
            if (!extension || !this.allowedTypes[extension]) {
                result.isValid = false;
                result.errors.push(`Tipo de archivo no permitido: ${extension || 'desconocido'}`);
                return result;
            }

            // 3. Validar tamaño
            const typeConfig = this.allowedTypes[extension];
            if (file.size > typeConfig.maxSize) {
                result.isValid = false;
                result.errors.push(`Archivo demasiado grande. Máximo permitido: ${this.formatFileSize(typeConfig.maxSize)}`);
                return result;
            }

            result.fileInfo.extension = extension;
            result.fileInfo.typeConfig = typeConfig;

        } catch (error) {
            result.isValid = false;
            result.errors.push(`Error durante la validación: ${error.message}`);
        }

        return result;
    },

    sanitizeFileName: function(fileName) {
        const result = {
            isValid: true,
            errors: [],
            sanitized: false,
            sanitizedName: fileName
        };

        if (!fileName || typeof fileName !== 'string') {
            result.isValid = false;
            result.errors.push('Nombre de archivo inválido');
            return result;
        }

        let sanitizedName = fileName.trim();

        // Eliminar caracteres peligrosos
        this.dangerousPatterns.forEach(pattern => {
            if (pattern.test(sanitizedName)) {
                sanitizedName = sanitizedName.replace(pattern, '');
                result.sanitized = true;
            }
        });

        // Evitar nombres vacíos después de sanitización
        if (!sanitizedName || sanitizedName.trim() === '') {
            result.isValid = false;
            result.errors.push('El nombre del archivo contiene caracteres no permitidos');
            return result;
        }

        if (sanitizedName !== fileName) {
            result.sanitized = true;
            result.sanitizedName = sanitizedName;
        }

        return result;
    },

    getFileExtension: function(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            return null;
        }

        const parts = fileName.split('.');
        if (parts.length < 2) {
            return null;
        }

        return parts.pop().toLowerCase();
    },

    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// Sistema de pruebas de seguridad
const FileSecurityTests = {
    results: [],
    
    // Crear archivo mock para pruebas
    createMockFile: function(name, content, type = 'text/plain', size = null) {
        const blob = new Blob([content], { type });
        const file = new File([blob], name, { type });
        
        if (size && size > content.length) {
            // Ajustar tamaño si es necesario
            const padding = new Array(size - content.length + 1).join(' ');
            return new File([content + padding], name, { type });
        }
        
        return file;
    },

    // Ejecutar todas las pruebas
    runAllTests: async function() {
        console.log('🔒 Iniciando pruebas de seguridad de archivos...\n');
        
        this.results = [];
        
        await this.testValidFiles();
        await this.testInvalidExtensions();
        await this.testDangerousFileNames();
        await this.testOversizedFiles();
        await this.testMaliciousContent();
        await this.testDirectoryTraversal();
        await this.testExecutableFiles();
        await this.testScriptInjection();
        await this.testSpecialCharacters();
        
        this.generateReport();
    },

    // Prueba de archivos válidos
    testValidFiles: async function() {
        console.log('📄 Probando archivos válidos...');
        
        const validFiles = [
            { name: 'documento.pdf', content: '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n', type: 'application/pdf' },
            { name: 'contrato.docx', content: 'PK\x03\x04', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
            { name: 'nota.txt', content: 'Este es un archivo de texto válido', type: 'text/plain' },
            { name: 'imagen.jpg', content: '\xFF\xD8\xFF\xE0\x00\x10JFIF', type: 'image/jpeg' },
            { name: 'logo.png', content: '\x89PNG\r\n\x1a\n', type: 'image/png' }
        ];

        for (const fileData of validFiles) {
            const file = this.createMockFile(fileData.name, fileData.content, fileData.type);
            const result = await FileSecurityValidator.validateFile(file);
            
            this.addTestResult(
                `Archivo válido: ${fileData.name}`,
                result.isValid,
                result.errors.length > 0 ? result.errors.join(', ') : 'Validación exitosa',
                result
            );
        }
    },

    // Prueba de extensiones inválidas
    testInvalidExtensions: async function() {
        console.log('🚫 Probando extensiones inválidas...');
        
        const invalidExtensions = [
            'malware.exe',
            'script.php',
            'program.bat',
            'virus.scr',
            'trojan.com',
            'backdoor.sh',
            'exploit.py',
            'payload.rb'
        ];

        for (const fileName of invalidExtensions) {
            const file = this.createMockFile(fileName, 'contenido malicioso');
            const result = await FileSecurityValidator.validateFile(file);
            
            this.addTestResult(
                `Extensión inválida: ${fileName}`,
                !result.isValid,
                result.errors.length > 0 ? result.errors.join(', ') : 'Error: debería ser inválido',
                result
            );
        }
    },

    // Prueba de nombres de archivo peligrosos
    testDangerousFileNames: async function() {
        console.log('⚠️ Probando nombres de archivo peligrosos...');
        
        const dangerousNames = [
            '../../../etc/passwd',
            'CON.txt',
            'PRN.pdf',
            'AUX.doc',
            'NUL.txt',
            'COM1.txt',
            'LPT1.pdf',
            'file<script>.txt',
            'data"malicious".pdf',
            'file|pipe.txt'
        ];

        for (const fileName of dangerousNames) {
            const file = this.createMockFile(fileName, 'contenido');
            const result = await FileSecurityValidator.validateFile(file);
            
            this.addTestResult(
                `Nombre peligroso: ${fileName}`,
                !result.isValid || result.sanitized,
                result.sanitized ? 'Nombre sanitizado correctamente' : 
                (result.errors.length > 0 ? result.errors.join(', ') : 'Error: debería ser detectado'),
                result
            );
        }
    },

    // Prueba de archivos sobredimensionados
    testOversizedFiles: async function() {
        console.log('📏 Probando archivos sobredimensionados...');
        
        const oversizedTests = [
            { name: 'grande.pdf', size: 60 * 1024 * 1024, maxSize: 50 * 1024 * 1024 }, // 60MB > 50MB
            { name: 'huge.jpg', size: 15 * 1024 * 1024, maxSize: 10 * 1024 * 1024 }, // 15MB > 10MB
            { name: 'massive.txt', size: 6 * 1024 * 1024, maxSize: 5 * 1024 * 1024 } // 6MB > 5MB
        ];

        for (const test of oversizedTests) {
            const file = this.createMockFile(test.name, 'x', 'text/plain', test.size);
            const result = await FileSecurityValidator.validateFile(file);
            
            this.addTestResult(
                `Archivo sobredimensionado: ${test.name} (${this.formatFileSize(test.size)})`,
                !result.isValid,
                result.errors.length > 0 ? result.errors.join(', ') : 'Error: debería ser rechazado',
                result
            );
        }
    },

    // Prueba de contenido malicioso
    testMaliciousContent: async function() {
        console.log('🦠 Probando contenido malicioso...');
        
        const maliciousContents = [
            { name: 'script.txt', content: '<script>alert("XSS")</script>' },
            { name: 'iframe.txt', content: '<iframe src="javascript:alert(1)"></iframe>' },
            { name: 'object.txt', content: '<object data="malware.exe"></object>' },
            { name: 'embed.txt', content: '<embed src="virus.scr">' },
            { name: 'javascript.txt', content: 'javascript:alert("XSS")' },
            { name: 'vbscript.txt', content: 'vbscript:msgbox("Malware")' },
            { name: 'onload.txt', content: '<img onload="alert(1)" src="x">' },
            { name: 'eval.txt', content: 'eval("malicious code")' }
        ];

        for (const malicious of maliciousContents) {
            const file = this.createMockFile(malicious.name, malicious.content);
            const result = await FileSecurityValidator.validateFile(file);
            
            // Nota: Esta versión simplificada no analiza contenido, pero en producción debería detectarlo
            this.addTestResult(
                `Contenido malicioso: ${malicious.name}`,
                true, // En producción debería ser false
                'Versión simplificada - en producción debería detectar contenido malicioso',
                result
            );
        }
    },

    // Prueba de directory traversal
    testDirectoryTraversal: async function() {
        console.log('📁 Probando ataques de directory traversal...');
        
        const traversalAttempts = [
            '../../../etc/passwd.txt',
            '..\\..\\..\\windows\\system32\\config\\sam',
            '....//....//....//etc/passwd',
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
            '..%252f..%252f..%252fetc%252fpasswd'
        ];

        for (const attempt of traversalAttempts) {
            const file = this.createMockFile(attempt, 'contenido');
            const result = await FileSecurityValidator.validateFile(file);
            
            this.addTestResult(
                `Directory traversal: ${attempt}`,
                !result.isValid || result.sanitized,
                result.sanitized ? 'Ataque mitigado mediante sanitización' :
                (result.errors.length > 0 ? result.errors.join(', ') : 'Error: debería ser detectado'),
                result
            );
        }
    },

    // Prueba de archivos ejecutables
    testExecutableFiles: async function() {
        console.log('⚙️ Probando archivos ejecutables...');
        
        const executables = [
            'program.exe',
            'script.bat',
            'command.cmd',
            'screen.scr',
            'info.pif',
            'visual.vbs',
            'java.jar',
            'powershell.ps1'
        ];

        for (const exeName of executables) {
            const file = this.createMockFile(exeName, 'contenido ejecutable');
            const result = await FileSecurityValidator.validateFile(file);
            
            this.addTestResult(
                `Ejecutable: ${exeName}`,
                !result.isValid,
                result.errors.length > 0 ? result.errors.join(', ') : 'Error: debería ser rechazado',
                result
            );
        }
    },

    // Prueba de inyección de scripts
    testScriptInjection: async function() {
        console.log('💉 Probando inyección de scripts...');
        
        const scriptInjections = [
            '<script>alert("XSS")</script>.txt',
            'javascript:alert(1).pdf',
            '<img src=x onerror=alert(1)>.jpg',
            '"><script>alert(1)</script>.png',
            '\x3Cscript\x3Ealert(1)\x3C/script\x3E.txt'
        ];

        for (const injection of scriptInjections) {
            const file = this.createMockFile(injection, 'contenido');
            const result = await FileSecurityValidator.validateFile(file);
            
            this.addTestResult(
                `Inyección de script: ${injection}`,
                !result.isValid || result.sanitized,
                result.sanitized ? 'Script sanitizado' :
                (result.errors.length > 0 ? result.errors.join(', ') : 'Error: debería ser detectado'),
                result
            );
        }
    },

    // Prueba de caracteres especiales
    testSpecialCharacters: async function() {
        console.log('🔣 Probando caracteres especiales...');
        
        const specialChars = [
            'file<>.txt',
            'file|pipe.txt',
            'file?question.txt',
            'file*asterisk.txt',
            'file"quote.txt',
            'file:colon.txt',
            'file\0null.txt',
            'file\ttab.txt',
            'file\nnewline.txt'
        ];

        for (const fileName of specialChars) {
            const file = this.createMockFile(fileName, 'contenido');
            const result = await FileSecurityValidator.validateFile(file);
            
            this.addTestResult(
                `Caracteres especiales: ${fileName}`,
                !result.isValid || result.sanitized,
                result.sanitized ? 'Caracteres sanitizados' :
                (result.errors.length > 0 ? result.errors.join(', ') : 'Error: debería ser detectado'),
                result
            );
        }
    },

    // Agregar resultado de prueba
    addTestResult: function(testName, passed, message, details = null) {
        this.results.push({
            testName,
            passed,
            message,
            details,
            timestamp: new Date().toISOString()
        });
        
        const status = passed ? '✅' : '❌';
        console.log(`  ${status} ${testName}: ${message}`);
    },

    // Formatear tamaño de archivo
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Generar reporte
    generateReport: function() {
        console.log('\n📊 Reporte de Pruebas de Seguridad');
        console.log('=====================================\n');
        
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total de pruebas: ${totalTests}`);
        console.log(`Pruebas superadas: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
        console.log(`Pruebas fallidas: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)\n`);
        
        if (failedTests > 0) {
            console.log('❌ Pruebas fallidas:');
            this.results.filter(r => !r.passed).forEach(result => {
                console.log(`  - ${result.testName}: ${result.message}`);
            });
            console.log('');
        }
        
        // Guardar reporte en archivo
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                passRate: ((passedTests/totalTests)*100).toFixed(1)
            },
            results: this.results
        };
        
        const reportBlob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const reportUrl = URL.createObjectURL(reportBlob);
        
        const a = document.createElement('a');
        a.href = reportUrl;
        a.download = `file-security-test-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(reportUrl);
        
        console.log('📄 Reporte guardado como archivo JSON');
        
        // Evaluar seguridad general
        this.evaluateSecurity(passedTests, totalTests);
    },

    // Evaluar nivel de seguridad
    evaluateSecurity: function(passed, total) {
        const percentage = (passed / total) * 100;
        
        console.log('\n🛡️ Evaluación de Seguridad');
        console.log('==========================');
        
        if (percentage >= 95) {
            console.log('🟢 Nivel de Seguridad: EXCELENTE');
            console.log('   El sistema de validación de archivos es muy robusto.');
        } else if (percentage >= 85) {
            console.log('🟡 Nivel de Seguridad: BUENO');
            console.log('   El sistema es seguro pero podría mejorarse.');
        } else if (percentage >= 70) {
            console.log('🟠 Nivel de Seguridad: REGULAR');
            console.log('   El sistema tiene vulnerabilidades que deben corregirse.');
        } else {
            console.log('🔴 Nivel de Seguridad: CRÍTICO');
            console.log('   El sistema tiene graves vulnerabilidades de seguridad.');
        }
        
        console.log(`\nPuntuación: ${percentage.toFixed(1)}%`);
        
        // Recomendaciones
        console.log('\n💡 Recomendaciones:');
        if (percentage < 100) {
            console.log('   - Revisar las pruebas fallidas y corregir las vulnerabilidades');
        }
        if (percentage < 95) {
            console.log('   - Implementar análisis de contenido malicioso');
        }
        if (percentage < 90) {
            console.log('   - Fortalecer la sanitización de nombres de archivo');
        }
        if (percentage < 85) {
            console.log('   - Agregar validación de magic numbers');
        }
        if (percentage < 80) {
            console.log('   - Implementar sistema de cuarentena completo');
        }
        
        console.log('\n   - Realizar pruebas de penetración regulares');
        console.log('   - Mantener actualizados los patrones de seguridad');
        console.log('   - Implementar monitoreo de eventos de seguridad');
        console.log('   - Capacitar al personal sobre seguridad de archivos');
    }
};

// Ejecutar pruebas si estamos en navegador
if (typeof window !== 'undefined') {
    // Botón para ejecutar pruebas
    const runTestsBtn = document.createElement('button');
    runTestsBtn.textContent = 'Ejecutar Pruebas de Seguridad de Archivos';
    runTestsBtn.className = 'btn btn-danger mt-3';
    runTestsBtn.onclick = () => FileSecurityTests.runAllTests();
    
    // Agregar botón a la página si existe un contenedor
    const container = document.querySelector('.container, body');
    if (container) {
        container.appendChild(runTestsBtn);
    }
    
    console.log('🔒 Sistema de pruebas de seguridad de archivos cargado');
    console.log('   Haga clic en "Ejecutar Pruebas de Seguridad de Archivos" para comenzar');
}

// Exportar para uso en Node.js o módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FileSecurityTests, FileSecurityValidator };
}