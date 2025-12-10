/**
 * PRUEBAS DE SEGURIDAD DE HEADERS
 * 
 * Este script valida que todos los headers de seguridad configurados
 * en netlify.toml se envíen correctamente y funcionen como esperado.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class SecurityHeadersTestSuite {
    constructor(baseUrl = 'https://localhost:8888') {
        this.baseUrl = baseUrl;
        this.results = [];
        this.securityHeaders = {
            // Headers fundamentales
            'Content-Security-Policy': {
                description: 'Política de Seguridad de Contenido',
                required: true,
                validate: (value) => {
                    return value && 
                           value.includes("default-src 'self'") &&
                           value.includes("script-src 'self'") &&
                           value.includes("style-src 'self'") &&
                           value.includes("frame-ancestors 'none'") &&
                           value.includes("upgrade-insecure-requests");
                }
            },
            'X-Frame-Options': {
                description: 'Protección contra Clickjacking',
                required: true,
                validate: (value) => value === 'DENY'
            },
            'X-Content-Type-Options': {
                description: 'Prevención MIME-sniffing',
                required: true,
                validate: (value) => value === 'nosniff'
            },
            'X-XSS-Protection': {
                description: 'Protección XSS del navegador',
                required: true,
                validate: (value) => value === '1; mode=block'
            },
            'Strict-Transport-Security': {
                description: 'Forzar HTTPS (HSTS)',
                required: true,
                validate: (value) => {
                    return value && 
                           value.includes('max-age=31536000') &&
                           value.includes('includeSubDomains');
                }
            },
            'Referrer-Policy': {
                description: 'Política de Referer',
                required: true,
                validate: (value) => value === 'strict-origin-when-cross-origin'
            },
            'Permissions-Policy': {
                description: 'Política de Permisos',
                required: true,
                validate: (value) => {
                    return value && 
                           value.includes('geolocation=()') &&
                           value.includes('microphone=()') &&
                           value.includes('camera=()');
                }
            },
            
            // Headers adicionales
            'Cross-Origin-Embedder-Policy': {
                description: 'Política de Embedding Cross-Origin',
                required: true,
                validate: (value) => value === 'require-corp'
            },
            'Cross-Origin-Opener-Policy': {
                description: 'Política de Ventanas Cross-Origin',
                required: true,
                validate: (value) => value === 'same-origin'
            },
            'Cross-Origin-Resource-Policy': {
                description: 'Política de Recursos Cross-Origin',
                required: true,
                validate: (value) => value === 'same-origin'
            },
            'X-Permitted-Cross-Domain-Policies': {
                description: 'Políticas Cross-Domain',
                required: true,
                validate: (value) => value === 'none'
            },
            'X-Download-Options': {
                description: 'Opciones de Descarga',
                required: true,
                validate: (value) => value === 'noopen'
            },
            'X-Robots-Tag': {
                description: 'Política para Robots',
                required: true,
                validate: (value) => {
                    return value && 
                           value.includes('noindex') &&
                           value.includes('nofollow');
                }
            }
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [SecurityHeadersTest]`;
        
        switch (type) {
            case 'success':
                console.log(`✅ ${prefix} ${message}`);
                break;
            case 'error':
                console.error(`❌ ${prefix} ${message}`);
                break;
            case 'warning':
                console.warn(`⚠️ ${prefix} ${message}`);
                break;
            default:
                console.log(`ℹ️ ${prefix} ${message}`);
        }
    }

    async makeRequest(path = '/') {
        const url = new URL(path, this.baseUrl);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        return new Promise((resolve, reject) => {
            const req = client.request({
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'SecurityHeadersTestSuite/1.0'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                });
            });

            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
            req.end();
        });
    }

    async testSecurityHeaders(path = '/') {
        this.log(`Probando headers de seguridad en: ${path}`);
        
        try {
            const response = await this.makeRequest(path);
            
            if (response.statusCode !== 200) {
                throw new Error(`Status code ${response.statusCode}`);
            }

            const results = {
                path: path,
                totalHeaders: Object.keys(this.securityHeaders).length,
                presentHeaders: 0,
                missingHeaders: [],
                invalidHeaders: [],
                validHeaders: []
            };

            // Verificar cada header de seguridad
            for (const [headerName, headerConfig] of Object.entries(this.securityHeaders)) {
                const headerValue = response.headers[headerName.toLowerCase()];
                
                if (!headerValue) {
                    if (headerConfig.required) {
                        results.missingHeaders.push({
                            name: headerName,
                            description: headerConfig.description
                        });
                    }
                    continue;
                }

                results.presentHeaders++;
                
                if (headerConfig.validate && !headerConfig.validate(headerValue)) {
                    results.invalidHeaders.push({
                        name: headerName,
                        description: headerConfig.description,
                        value: headerValue
                    });
                } else {
                    results.validHeaders.push({
                        name: headerName,
                        description: headerConfig.description,
                        value: headerValue
                    });
                }
            }

            return results;
        } catch (error) {
            this.log(`Error al probar ${path}: ${error.message}`, 'error');
            return {
                path: path,
                error: error.message
            };
        }
    }

    async testAPIHeaders() {
        this.log('Probando headers específicos para APIs');
        
        try {
            const response = await this.makeRequest('/api/health');
            
            if (response.statusCode !== 200) {
                throw new Error(`Status code ${response.statusCode}`);
            }

            const apiHeaders = {
                'Access-Control-Allow-Origin': {
                    description: 'CORS Allow Origin',
                    validate: (value) => value === 'self' || value === 'https://localhost:8888'
                },
                'Access-Control-Allow-Methods': {
                    description: 'CORS Allow Methods',
                    validate: (value) => value && value.includes('GET') && value.includes('POST')
                },
                'Access-Control-Allow-Headers': {
                    description: 'CORS Allow Headers',
                    validate: (value) => value && value.includes('Content-Type') && value.includes('Authorization')
                },
                'Access-Control-Max-Age': {
                    description: 'CORS Max Age',
                    validate: (value) => value && parseInt(value) > 0
                },
                'Cache-Control': {
                    description: 'Cache Control para API',
                    validate: (value) => value && value.includes('no-store')
                },
                'X-RateLimit-Limit': {
                    description: 'Rate Limit',
                    validate: (value) => value && parseInt(value) > 0
                }
            };

            const results = {
                path: '/api/health',
                totalHeaders: Object.keys(apiHeaders).length,
                presentHeaders: 0,
                missingHeaders: [],
                invalidHeaders: [],
                validHeaders: []
            };

            for (const [headerName, headerConfig] of Object.entries(apiHeaders)) {
                const headerValue = response.headers[headerName.toLowerCase()];
                
                if (!headerValue) {
                    results.missingHeaders.push({
                        name: headerName,
                        description: headerConfig.description
                    });
                    continue;
                }

                results.presentHeaders++;
                
                if (headerConfig.validate && !headerConfig.validate(headerValue)) {
                    results.invalidHeaders.push({
                        name: headerName,
                        description: headerConfig.description,
                        value: headerValue
                    });
                } else {
                    results.validHeaders.push({
                        name: headerName,
                        description: headerConfig.description,
                        value: headerValue
                    });
                }
            }

            return results;
        } catch (error) {
            this.log(`Error al probar API: ${error.message}`, 'error');
            return {
                path: '/api/health',
                error: error.message
            };
        }
    }

    async testStaticFileHeaders() {
        this.log('Probando headers para archivos estáticos');
        
        const staticFiles = [
            '/css/style.css',
            '/js/main.js',
            '/images/carousel-1.jpg'
        ];

        const results = [];
        
        for (const file of staticFiles) {
            try {
                const response = await this.makeRequest(file);
                
                const cacheControl = response.headers['cache-control'];
                const contentType = response.headers['content-type'];
                
                results.push({
                    path: file,
                    statusCode: response.statusCode,
                    cacheControl: cacheControl,
                    contentType: contentType,
                    hasCacheControl: cacheControl && cacheControl.includes('max-age=31536000'),
                    hasContentType: contentType && contentType !== 'application/octet-stream'
                });
            } catch (error) {
                results.push({
                    path: file,
                    error: error.message
                });
            }
        }

        return results;
    }

    async runAllTests() {
        this.log('🔍 INICIANDO PRUEBAS COMPLETAS DE HEADERS DE SEGURIDAD');
        this.log('='.repeat(60));

        // Test 1: Headers de seguridad principales
        this.log('\n📋 TEST 1: Headers de Seguridad Fundamentales');
        const mainHeaders = await this.testSecurityHeaders('/');
        this.results.push(mainHeaders);

        // Test 2: Headers específicos para APIs
        this.log('\n🔌 TEST 2: Headers Específicos para APIs');
        const apiHeaders = await this.testAPIHeaders();
        this.results.push(apiHeaders);

        // Test 3: Headers para archivos estáticos
        this.log('\n📁 TEST 3: Headers para Archivos Estáticos');
        const staticHeaders = await this.testStaticFileHeaders();
        this.results.push(...staticHeaders);

        // Generar reporte
        this.generateReport();
    }

    generateReport() {
        this.log('\n📊 REPORTE COMPLETO DE SEGURIDAD');
        this.log('='.repeat(60));

        let totalTests = 0;
        let passedTests = 0;

        // Analizar resultados principales
        const mainResults = this.results[0];
        if (mainResults && !mainResults.error) {
            totalTests += mainResults.totalHeaders;
            passedTests += mainResults.validHeaders.length;

            this.log(`\n🔒 Headers de Seguridad Principales:`);
            this.log(`   ✅ Válidos: ${mainResults.validHeaders.length}/${mainResults.totalHeaders}`);
            
            if (mainResults.missingHeaders.length > 0) {
                this.log(`   ❌ Faltantes: ${mainResults.missingHeaders.length}`);
                mainResults.missingHeaders.forEach(h => {
                    this.log(`      - ${h.name}: ${h.description}`, 'error');
                });
            }
            
            if (mainResults.invalidHeaders.length > 0) {
                this.log(`   ⚠️ Inválidos: ${mainResults.invalidHeaders.length}`);
                mainResults.invalidHeaders.forEach(h => {
                    this.log(`      - ${h.name}: ${h.description}`, 'warning');
                    this.log(`        Valor: ${h.value}`, 'warning');
                });
            }
        }

        // Analizar resultados de API
        const apiResults = this.results[1];
        if (apiResults && !apiResults.error) {
            totalTests += apiResults.totalHeaders;
            passedTests += apiResults.validHeaders.length;

            this.log(`\n🔌 Headers de API:`);
            this.log(`   ✅ Válidos: ${apiResults.validHeaders.length}/${apiResults.totalHeaders}`);
            
            if (apiResults.missingHeaders.length > 0) {
                this.log(`   ❌ Faltantes: ${apiResults.missingHeaders.length}`);
                apiResults.missingHeaders.forEach(h => {
                    this.log(`      - ${h.name}: ${h.description}`, 'error');
                });
            }
        }

        // Analizar resultados de archivos estáticos
        const staticResults = this.results.slice(2);
        if (staticResults.length > 0) {
            this.log(`\n📁 Headers de Archivos Estáticos:`);
            staticResults.forEach(result => {
                if (!result.error) {
                    totalTests += 2; // cache-control + content-type
                    if (result.hasCacheControl) passedTests++;
                    if (result.hasContentType) passedTests++;
                    
                    this.log(`   ${result.path}:`);
                    this.log(`     Cache-Control: ${result.hasCacheControl ? '✅' : '❌'}`);
                    this.log(`     Content-Type: ${result.hasContentType ? '✅' : '❌'}`);
                } else {
                    this.log(`   ${result.path}: ❌ ${result.error}`, 'error');
                }
            });
        }

        // Resumen final
        const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0;
        
        this.log(`\n📈 RESUMEN FINAL:`);
        this.log(`   Total de pruebas: ${totalTests}`);
        this.log(`   Pruebas pasadas: ${passedTests}`);
        this.log(`   Tasa de éxito: ${successRate}%`);

        if (passedTests === totalTests) {
            this.log('\n🎉 ¡TODAS LAS PRUEBAS DE SEGURIDAD HAN PASADO!');
            this.log('✅ La aplicación está protegida con headers de seguridad completos');
        } else {
            this.log('\n⚠️ HAY PRUEBAS FALLADAS - REVISAR CONFIGURACIÓN');
            this.log('❌ Algunos headers de seguridad requieren atención');
        }

        // Guardar reporte en archivo
        this.saveReport();
    }

    saveReport() {
        const report = {
            timestamp: new Date().toISOString(),
            baseUrl: this.baseUrl,
            results: this.results,
            summary: {
                totalTests: this.results.reduce((sum, r) => {
                    if (r.totalHeaders) return sum + r.totalHeaders;
                    if (r.path && r.path !== '/api/health') return sum + 2; // static files
                    return sum;
                }, 0),
                passedTests: this.results.reduce((sum, r) => {
                    if (r.validHeaders) return sum + r.validHeaders.length;
                    if (r.path && r.path !== '/api/health' && !r.error) {
                        return sum + (r.hasCacheControl ? 1 : 0) + (r.hasContentType ? 1 : 0);
                    }
                    return sum;
                }, 0)
            }
        };

        const fs = require('fs');
        fs.writeFileSync('security-headers-test-report.json', JSON.stringify(report, null, 2));
        this.log('\n💾 Reporte guardado en: security-headers-test-report.json');
    }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
    const testSuite = new SecurityHeadersTestSuite();
    testSuite.runAllTests().catch(error => {
        console.error('Error ejecutando pruebas:', error);
        process.exit(1);
    });
}

module.exports = SecurityHeadersTestSuite;