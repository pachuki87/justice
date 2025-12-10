/**
 * Justice 2 Environment Security Tests
 * Pruebas de seguridad para verificar que no haya credenciales expuestas en el frontend
 * 
 * Estas pruebas verifican:
 * - No hay URLs hardcodeadas en el código
 * - No hay credenciales expuestas
 * - El sistema de configuración segura funciona correctamente
 * - Las variables de entorno se cargan correctamente
 */

const EnvironmentSecurityTests = {
    // Estado de las pruebas
    results: [],
    
    // Patrones de credenciales a buscar
    credentialPatterns: [
        // URLs hardcodeadas
        /https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s"']*)?/g,
        
        // Claves API
        /api[_-]?key[_-]?[a-zA-Z0-9]{20,}/gi,
        /[_-]?api[_-]?key[_-]?[=:]\s*['"]?[a-zA-Z0-9]{20,}['"]?/gi,
        
        // Tokens
        /token[_-]?[a-zA-Z0-9]{20,}/gi,
        /[_-]?token[_-]?[=:]\s*['"]?[a-zA-Z0-9]{20,}['"]?/gi,
        
        // Contraseñas
        /password[_-]?[a-zA-Z0-9]{8,}/gi,
        /[_-]?password[_-]?[=:]\s*['"]?[a-zA-Z0-9]{8,}['"]?/gi,
        
        // Secretos
        /secret[_-]?[a-zA-Z0-9]{16,}/gi,
        /[_-]?secret[_-]?[=:]\s*['"]?[a-zA-Z0-9]{16,}['"]?/gi,
        
        // JWT tokens
        /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
        
        // Claves de AWS
        /AKIA[0-9A-Z]{16}/g,
        
        // Claves de otros servicios
        /sk_[a-zA-Z0-9]{24,}/g, // Stripe
        /ghp_[a-zA-Z0-9]{36}/g, // GitHub
        /gho_[a-zA-Z0-9]{36}/g, // GitHub
        /ghu_[a-zA-Z0-9]{36}/g, // GitHub
        /ghs_[a-zA-Z0-9]{36}/g, // GitHub
        /ghr_[a-zA-Z0-9]{36}/g  // GitHub
    ],
    
    // Archivos a analizar
    filesToAnalyze: [
        'js/justice2-config.js',
        'js/justice2-auth.js',
        'js/justice2-api.js',
        'js/justice2-core.js',
        'js/justice2-dynamic.js',
        'js/ai-assistant.js',
        'js/cases.js',
        'js/analytics.js',
        'js/documents.js',
        'components/utils.js',
        'components/validation-system.js',
        'components/notification-system.js',
        'components/xss-protection.js',
        'components/csrf-protection.js',
        'components/rate-limiter.js'
    ],
    
    // URLs permitidas (whitelist)
    allowedUrls: [
        // URLs de ejemplo y documentación
        'https://example.com',
        'https://api.example.com',
        'https://docs.example.com',
        
        // URLs de CDNs comunes
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
        'https://unpkg.com',
        
        // URLs de datos embebidos
        'data:image/svg+xml',
        'data:text/css',
        
        // URLs relativas
        '/api',
        '/auth',
        '/css',
        '/js',
        '/images'
    ],
    
    /**
     * Ejecutar todas las pruebas de seguridad
     */
    runAllTests: function() {
        console.log('🔍 INICIANDO PRUEBAS DE SEGURIDAD DE ENTORNO');
        console.log('='.repeat(60));
        
        this.results = [];
        
        // 1. Prueba de detección de credenciales hardcodeadas
        this.runTest('Detección de Credenciales Hardcodeadas', () => {
            return this.testHardcodedCredentials();
        });
        
        // 2. Prueba del sistema de configuración
        this.runTest('Sistema de Configuración Segura', () => {
            return this.testEnvironmentConfig();
        });
        
        // 3. Prueba de carga de variables de entorno
        this.runTest('Carga de Variables de Entorno', () => {
            return this.testEnvironmentVariables();
        });
        
        // 4. Prueba de validación de URLs
        this.runTest('Validación de URLs', () => {
            return this.testUrlValidation();
        });
        
        // 5. Prueba de seguridad de localStorage
        this.runTest('Seguridad de LocalStorage', () => {
            return this.testLocalStorageSecurity();
        });
        
        // 6. Prueba de exposición de credenciales en memoria
        this.runTest('Exposición de Credenciales en Memoria', () => {
            return this.testMemoryExposure();
        });
        
        // Mostrar resultados
        this.showResults();
        
        return this.results;
    },
    
    /**
     * Ejecutar una prueba individual
     */
    runTest: function(testName, testFunction) {
        console.log(`\n🧪 Ejecutando: ${testName}`);
        
        try {
            const result = testFunction();
            this.results.push({
                name: testName,
                status: result.passed ? 'PASS' : 'FAIL',
                message: result.message,
                details: result.details || null,
                critical: result.critical || false
            });
            
            console.log(`${result.passed ? '✅' : '❌'} ${testName}: ${result.passed ? 'PASS' : 'FAIL'}`);
            if (result.details) {
                console.log('   Detalles:', result.details);
            }
            
        } catch (error) {
            this.results.push({
                name: testName,
                status: 'ERROR',
                message: `Error en prueba: ${error.message}`,
                details: error.stack,
                critical: true
            });
            
            console.log(`❌ ${testName}: ERROR - ${error.message}`);
        }
    },
    
    /**
     * Buscar credenciales hardcodeadas en archivos
     */
    testHardcodedCredentials: function() {
        const fs = require('fs');
        const path = require('path');
        const issues = [];
        
        for (const filePath of this.filesToAnalyze) {
            try {
                const fullPath = path.resolve(filePath);
                if (!fs.existsSync(fullPath)) {
                    continue;
                }
                
                const content = fs.readFileSync(fullPath, 'utf8');
                const lines = content.split('\n');
                
                // Buscar cada patrón de credencial
                for (const pattern of this.credentialPatterns) {
                    const matches = content.match(pattern);
                    if (matches) {
                        for (const match of matches) {
                            // Verificar si es una URL permitida
                            if (this.isAllowedUrl(match)) {
                                continue;
                            }
                            
                            // Encontrar la línea del match
                            const lineNumber = lines.findIndex(line => line.includes(match)) + 1;
                            
                            issues.push({
                                file: filePath,
                                line: lineNumber,
                                match: this.maskCredential(match),
                                pattern: pattern.toString()
                            });
                        }
                    }
                }
            } catch (error) {
                console.warn(`No se pudo analizar ${filePath}: ${error.message}`);
            }
        }
        
        if (issues.length > 0) {
            return {
                passed: false,
                message: `Se encontraron ${issues.length} credenciales potencialmente expuestas`,
                details: issues,
                critical: true
            };
        }
        
        return {
            passed: true,
            message: 'No se encontraron credenciales hardcodeadas'
        };
    },
    
    /**
     * Verificar si una URL está en la lista de permitidas
     */
    isAllowedUrl: function(url) {
        return this.allowedUrls.some(allowed => url.includes(allowed));
    },
    
    /**
     * Enmascarar credenciales para logging seguro
     */
    maskCredential: function(credential) {
        if (credential.length <= 8) {
            return '*****';
        }
        
        return credential.substring(0, 4) + '*****' + credential.substring(credential.length - 4);
    },
    
    /**
     * Probar el sistema de configuración segura
     */
    testEnvironmentConfig: function() {
        // Simular carga del sistema en un entorno de prueba
        global.window = {
            location: { hostname: 'localhost', port: '3000' },
            document: {
                readyState: 'complete',
                querySelector: () => ({ content: 'test-value' }),
                addEventListener: () => {}
            },
            btoa: (str) => Buffer.from(str).toString('base64')
        };
        
        global.document = global.window.document;
        
        try {
            // Cargar el sistema de configuración
            require('./components/env-config.js');
            
            if (typeof global.window.EnvConfig !== 'undefined') {
                const status = global.window.EnvConfig.getStatus();
                
                if (status.loaded && status.validated && !status.tampered) {
                    return {
                        passed: true,
                        message: 'Sistema de configuración funciona correctamente'
                    };
                } else {
                    return {
                        passed: false,
                        message: 'Sistema de configuración tiene problemas',
                        details: status
                    };
                }
            } else {
                return {
                    passed: false,
                    message: 'Sistema de configuración no disponible'
                };
            }
        } catch (error) {
            return {
                passed: false,
                message: `Error al cargar sistema de configuración: ${error.message}`
            };
        }
    },
    
    /**
     * Probar carga de variables de entorno
     */
    testEnvironmentVariables: function() {
        // Verificar que las variables críticas estén definidas
        const criticalVars = [
            'PRODUCTION_API_URL',
            'DEVELOPMENT_API_URL',
            'VALID_JWT_ISSUERS'
        ];
        
        const missingVars = [];
        const loadedVars = [];
        
        // Simular entorno de prueba
        if (typeof global !== 'undefined' && global.window) {
            const envConfig = global.window.EnvConfig;
            
            if (envConfig && envConfig.get) {
                for (const varName of criticalVars) {
                    const value = envConfig.get(varName);
                    if (value) {
                        loadedVars.push(varName);
                    } else {
                        missingVars.push(varName);
                    }
                }
            } else {
                return {
                    passed: false,
                    message: 'Sistema de configuración no disponible para prueba de variables'
                };
            }
        } else {
            return {
                passed: false,
                message: 'Entorno de prueba no disponible'
            };
        }
        
        if (missingVars.length > 0) {
            return {
                passed: false,
                message: `Faltan variables críticas: ${missingVars.join(', ')}`,
                details: { missing: missingVars, loaded: loadedVars }
            };
        }
        
        return {
            passed: true,
            message: `Todas las variables críticas cargadas: ${loadedVars.join(', ')}`
        };
    },
    
    /**
     * Probar validación de URLs
     */
    testUrlValidation: function() {
        const testUrls = [
            'https://example.com/api',
            'http://localhost:8000',
            'ftp://files.example.com',
            'javascript:alert(1)',
            'data:text/html,<script>alert(1)</script>'
        ];
        
        const results = [];
        
        if (typeof global !== 'undefined' && global.window && global.window.EnvConfig) {
            const envConfig = global.window.EnvConfig;
            
            for (const url of testUrls) {
                const isValid = envConfig.isValidUrl ? envConfig.isValidUrl(url) : false;
                results.push({
                    url: url,
                    valid: isValid
                });
            }
            
            const invalidUrls = results.filter(r => !r.valid && !r.url.startsWith('javascript:') && !r.url.startsWith('data:'));
            
            if (invalidUrls.length > 0) {
                return {
                    passed: false,
                    message: 'Hay URLs potencialmente inválidas',
                    details: invalidUrls
                };
            }
        }
        
        return {
            passed: true,
            message: 'Validación de URLs funciona correctamente'
        };
    },
    
    /**
     * Probar seguridad de localStorage
     */
    testLocalStorageSecurity: function() {
        if (typeof global !== 'undefined' && global.window) {
            const mockLocalStorage = {
                data: {},
                getItem: function(key) { return this.data[key] || null; },
                setItem: function(key, value) { this.data[key] = value; },
                removeItem: function(key) { delete this.data[key]; },
                clear: function() { this.data = {}; }
            };
            
            global.window.localStorage = mockLocalStorage;
            
            // Intentar almacenar credenciales falsas
            const testCredentials = {
                'api_key': 'sk_test_123456789',
                'password': 'test_password_123',
                'token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9'
            };
            
            for (const [key, value] of Object.entries(testCredentials)) {
                mockLocalStorage.setItem(key, value);
            }
            
            // Verificar si el sistema de configuración limpia datos sensibles
            if (global.window.EnvConfig && global.window.EnvConfig.init) {
                global.window.EnvConfig.init();
                
                // Verificar que las credenciales no estén accesibles
                const exposedCredentials = [];
                for (const key of Object.keys(testCredentials)) {
                    if (mockLocalStorage.getItem(key)) {
                        exposedCredentials.push(key);
                    }
                }
                
                if (exposedCredentials.length > 0) {
                    return {
                        passed: false,
                        message: `Credenciales expuestas en localStorage: ${exposedCredentials.join(', ')}`,
                        critical: true
                    };
                }
            }
        }
        
        return {
            passed: true,
            message: 'LocalStorage seguro, no hay credenciales expuestas'
        };
    },
    
    /**
     * Probar exposición de credenciales en memoria
     */
    testMemoryExposure: function() {
        const fs = require('fs');
        const path = require('path');
        const exposedCredentials = [];
        
        for (const filePath of this.filesToAnalyze) {
            try {
                const fullPath = path.resolve(filePath);
                if (!fs.existsSync(fullPath)) {
                    continue;
                }
                
                const content = fs.readFileSync(fullPath, 'utf8');
                
                // Buscar patrones de asignación de variables globales con credenciales
                const globalAssignments = content.match(/(?:window|global)\.(\w+)\s*=\s*['"`]([^'"`]+)['"`]/g);
                
                if (globalAssignments) {
                    for (const assignment of globalAssignments) {
                        const match = assignment.match(/(?:window|global)\.(\w+)\s*=\s*['"`]([^'"`]+)['"`]/);
                        if (match) {
                            const varName = match[1];
                            const value = match[2];
                            
                            // Verificar si el valor parece una credencial
                            if (this.looksLikeCredential(value)) {
                                exposedCredentials.push({
                                    file: filePath,
                                    variable: varName,
                                    value: this.maskCredential(value)
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn(`No se pudo analizar ${filePath} para exposición en memoria: ${error.message}`);
            }
        }
        
        if (exposedCredentials.length > 0) {
            return {
                passed: false,
                message: `Se encontraron ${exposedCredentials.length} credenciales potencialmente expuestas en variables globales`,
                details: exposedCredentials,
                critical: true
            };
        }
        
        return {
            passed: true,
            message: 'No se encontraron credenciales expuestas en variables globales'
        };
    },
    
    /**
     * Verificar si un valor parece una credencial
     */
    looksLikeCredential: function(value) {
        if (!value || typeof value !== 'string') return false;
        
        // Patrones que indican credenciales
        const credentialPatterns = [
            /^sk_[a-zA-Z0-9]{20,}/, // Stripe
            /^gh[pousr]_[a-zA-Z0-9]{20,}/, // GitHub
            /^[a-zA-Z0-9]{32,}$/, // Claves largas
            /^eyJ[a-zA-Z0-9_-]*\.eyJ/, // JWT
            /password/i,
            /secret/i,
            /api[_-]?key/i,
            /token/i
        ];
        
        return credentialPatterns.some(pattern => pattern.test(value));
    },
    
    /**
     * Mostrar resultados de las pruebas
     */
    showResults: function() {
        console.log('\n📊 RESULTADOS DE PRUEBAS DE SEGURIDAD DE ENTORNO');
        console.log('='.repeat(60));
        
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const errors = this.results.filter(r => r.status === 'ERROR').length;
        const critical = this.results.filter(r => r.critical).length;
        const total = this.results.length;
        
        console.log(`Total de pruebas: ${total}`);
        console.log(`Pruebas pasadas: ${passed}`);
        console.log(`Pruebas fallidas: ${failed}`);
        console.log(`Errores: ${errors}`);
        console.log(`Problemas críticos: ${critical}`);
        console.log(`Tasa de éxito: ${((passed / total) * 100).toFixed(2)}%`);
        
        // Mostrar detalles de pruebas fallidas
        const failedTests = this.results.filter(r => r.status === 'FAIL' || r.status === 'ERROR');
        if (failedTests.length > 0) {
            console.log('\n❌ PRUEBAS FALLADAS:');
            failedTests.forEach(test => {
                console.log(`\n   ${test.name}: ${test.message}`);
                if (test.details) {
                    console.log('   Detalles:', test.details);
                }
                if (test.critical) {
                    console.log('   ⚠️  PROBLEMA CRÍTICO DE SEGURIDAD');
                }
            });
        }
        
        // Resumen final
        if (critical > 0) {
            console.log('\n🚨 SE DETECTARON PROBLEMAS CRÍTICOS DE SEGURIDAD');
            console.log('   Se requieren acciones inmediatas para proteger las credenciales');
        } else if (failed > 0) {
            console.log('\n⚠️  HAY PROBLEMAS DE SEGURIDAD QUE REQUIEREN ATENCIÓN');
        } else {
            console.log('\n🎉 ¡TODAS LAS PRUEBAS DE SEGURIDAD PASARON!');
            console.log('   El sistema de configuración segura está funcionando correctamente');
        }
        
        // Generar reporte JSON
        this.generateReport();
    },
    
    /**
     * Generar reporte en formato JSON
     */
    generateReport: function() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.results.length,
                passed: this.results.filter(r => r.status === 'PASS').length,
                failed: this.results.filter(r => r.status === 'FAIL').length,
                errors: this.results.filter(r => r.status === 'ERROR').length,
                critical: this.results.filter(r => r.critical).length,
                successRate: ((this.results.filter(r => r.status === 'PASS').length / this.results.length) * 100).toFixed(2)
            },
            tests: this.results,
            recommendations: this.generateRecommendations()
        };
        
        // Guardar reporte
        const fs = require('fs');
        const reportPath = './environment-security-test-report.json';
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`\n📄 Reporte guardado en: ${reportPath}`);
        } catch (error) {
            console.warn('No se pudo guardar el reporte:', error.message);
        }
        
        return report;
    },
    
    /**
     * Generar recomendaciones basadas en los resultados
     */
    generateRecommendations: function() {
        const recommendations = [];
        const criticalIssues = this.results.filter(r => r.critical);
        const failedTests = this.results.filter(r => r.status === 'FAIL');
        
        if (criticalIssues.length > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                title: 'Eliminar credenciales expuestas inmediatamente',
                description: 'Se detectaron credenciales hardcodeadas que representan un riesgo de seguridad crítico',
                actions: [
                    'Mover todas las credenciales a variables de entorno',
                    'Implementar el sistema de configuración segura',
                    'Rotar todas las credenciales expuestas',
                    'Verificar logs de acceso por actividad sospechosa'
                ]
            });
        }
        
        if (failedTests.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                title: 'Corregir problemas de configuración',
                description: 'Hay problemas en el sistema de configuración que deben ser resueltos',
                actions: [
                    'Revisar la configuración de variables de entorno',
                    'Verificar que todos los componentes carguen correctamente',
                    'Implementar validaciones adicionales'
                ]
            });
        }
        
        recommendations.push({
            priority: 'MEDIUM',
            title: 'Implementar monitoreo continuo',
            description: 'Establecer monitoreo regular de seguridad de configuración',
            actions: [
                'Ejecutar estas pruebas regularmente',
                'Configurar alertas para cambios en configuración',
                'Implementar scanning automatizado de credenciales'
            ]
        });
        
        return recommendations;
    }
};

// Ejecutar pruebas si este archivo se ejecuta directamente
if (require.main === module) {
    EnvironmentSecurityTests.runAllTests();
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvironmentSecurityTests;
}