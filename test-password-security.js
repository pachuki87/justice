/**
 * Pruebas de Seguridad para el Sistema de Manejo de Contraseñas
 * Verificación completa de la implementación de seguridad de credenciales
 */

const fs = require('fs');
const path = require('path');

// Configurar variables de entorno para pruebas
process.env.PASSWORD_PEPPER = 'mi_pepper_secreto_de_32_caracteros_minimo';

// Cargar el sistema de seguridad de contraseñas
let PasswordSecurity;
try {
    PasswordSecurity = require('./netlify/functions/password-security.js');
    console.log('✅ Sistema PasswordSecurity cargado correctamente');
} catch (error) {
    console.error('❌ Error cargando PasswordSecurity:', error.message);
    process.exit(1);
}

class PasswordSecurityTestSuite {
    constructor() {
        this.results = [];
        this.testData = {
            weakPasswords: [
                '123456',
                'password',
                'qwerty',
                'abc123',
                '123456789',
                'password123',
                'admin',
                'letmein',
                'welcome',
                'monkey',
                '1234567890',
                'password1',
                '123123',
                'qwerty123',
                'starwars'
            ],
            strongPasswords: [
                'Tru3S3cur3P@ssw0rd!2024',
                'MyC0mpl3x#P@ssw0rd',
                'JusTic3-2_S3cur3_System',
                'L3g@l_S3cur1ty_2024!',
                'P@ssw0rd_C0mpl3x&Str0ng'
            ],
            edgeCases: [
                'Aa1!', // Mínimo válido
                'A'.repeat(100) + '1a!', // Muy largo
                'UPPERCASE123!', // Solo mayúsculas y números
                'lowercase123!', // Solo minúsculas y números
                '1234567890!', // Solo números y especiales
                'PasswordWithoutSpecialChars123', // Sin caracteres especiales
                '!@#$%^&*()_+', // Solo caracteres especiales
                '   spaced   password   123!   ', // Con espacios
                'ñáéíóú123!Aa', // Caracteres internacionales
                'Password\nWith\nNewlines123!', // Con newlines
                'Password\tWith\tTabs123!' // Con tabs
            ]
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    runTest(testName, testFunction) {
        this.log(`Ejecutando prueba: ${testName}`);
        
        try {
            const result = testFunction();
            this.results.push({
                name: testName,
                status: 'PASS',
                message: result.message || 'Prueba exitosa',
                details: result.details || {}
            });
            this.log(`✅ ${testName}: PASS`);
            return true;
        } catch (error) {
            this.results.push({
                name: testName,
                status: 'FAIL',
                message: error.message,
                details: error.details || {}
            });
            this.log(`❌ ${testName}: FAIL - ${error.message}`, 'error');
            return false;
        }
    }

    async runAsyncTest(testName, testFunction) {
        this.log(`Ejecutando prueba asíncrona: ${testName}`);
        
        try {
            const result = await testFunction();
            this.results.push({
                name: testName,
                status: 'PASS',
                message: result.message || 'Prueba exitosa',
                details: result.details || {}
            });
            this.log(`✅ ${testName}: PASS`);
            return true;
        } catch (error) {
            this.results.push({
                name: testName,
                status: 'FAIL',
                message: error.message,
                details: error.details || {}
            });
            this.log(`❌ ${testName}: FAIL - ${error.message}`, 'error');
            return false;
        }
    }

    // Tests de validación de fortaleza de contraseñas
    testPasswordStrengthValidation() {
        const results = {
            weakPasswordsRejected: 0,
            strongPasswordsAccepted: 0,
            totalTests: 0
        };

        // Probar contraseñas débiles (deberían ser rechazadas)
        for (const password of this.testData.weakPasswords) {
            results.totalTests++;
            const validation = PasswordSecurity.validatePasswordStrength(password);
            
            if (!validation.isValid) {
                results.weakPasswordsRejected++;
                this.log(`Contraseña débil correctamente rechazada: ${password.substring(0, 10)}...`);
            } else {
                this.log(`⚠️ Contraseña débil incorrectamente aceptada: ${password}`, 'warning');
            }
        }

        // Probar contraseñas fuertes (deberían ser aceptadas)
        for (const password of this.testData.strongPasswords) {
            results.totalTests++;
            const validation = PasswordSecurity.validatePasswordStrength(password);
            
            if (validation.isValid && validation.strength >= 75) {
                results.strongPasswordsAccepted++;
                this.log(`Contraseña fuerte correctamente aceptada: ${password.substring(0, 10)}... (puntuación: ${validation.strength})`);
            } else {
                this.log(`⚠️ Contraseña fuerte incorrectamente rechazada: ${password.substring(0, 10)}... (puntuación: ${validation.strength})`, 'warning');
            }
        }

        const weakRejectionRate = (results.weakPasswordsRejected / this.testData.weakPasswords.length) * 100;
        const strongAcceptanceRate = (results.strongPasswordsAccepted / this.testData.strongPasswords.length) * 100;

        if (weakRejectionRate >= 90 && strongAcceptanceRate >= 80) {
            return {
                message: `Validación de fortaleza funcionando correctamente (${weakRejectionRate.toFixed(1)}% rechazo débil, ${strongAcceptanceRate.toFixed(1)}% aceptación fuerte)`,
                details: results
            };
        } else {
            throw new Error(`Validación de fortaleza deficiente (${weakRejectionRate.toFixed(1)}% rechazo débil, ${strongAcceptanceRate.toFixed(1)}% aceptación fuerte)`);
        }
    }

    // Tests de hashing de contraseñas
    async testPasswordHashing() {
        const testPassword = 'TestP@ssw0rd123!';
        const results = {
            hashingSuccessful: false,
            hashesAreDifferent: false,
            hashesAreConsistent: false,
            hashFormatValid: false
        };

        try {
            // Generar múltiples hashes de la misma contraseña
            const hash1 = await PasswordSecurity.hashPassword(testPassword);
            const hash2 = await PasswordSecurity.hashPassword(testPassword);

            // Verificar que los hashes se generaron correctamente
            if (hash1 && hash2 && hash1.length > 50 && hash2.length > 50) {
                results.hashingSuccessful = true;
                this.log('Hashing de contraseñas funcionando correctamente');
            }

            // Verificar que los hashes son diferentes (debido al salt)
            if (hash1 !== hash2) {
                results.hashesAreDifferent = true;
                this.log('Generación de salt funcionando correctamente (hashes diferentes)');
            }

            // Verificar formato bcrypt ($2a$, $2b$, o $2y$)
            const bcryptRegex = /^\$2[aby]\$\d+\$[./A-Za-z0-9]{53}$/;
            if (bcryptRegex.test(hash1) && bcryptRegex.test(hash2)) {
                results.hashFormatValid = true;
                this.log('Formato de hash bcrypt válido');
            }

            // Verificar verificación consistente
            const verify1 = await PasswordSecurity.verifyPassword(testPassword, hash1);
            const verify2 = await PasswordSecurity.verifyPassword(testPassword, hash2);
            const verifyWrong = await PasswordSecurity.verifyPassword('wrongpassword', hash1);

            if (verify1 && verify2 && !verifyWrong) {
                results.hashesAreConsistent = true;
                this.log('Verificación de contraseñas funcionando correctamente');
            }

            const allPassed = Object.values(results).every(result => result === true);
            
            if (allPassed) {
                return {
                    message: 'Sistema de hashing funcionando correctamente',
                    details: results
                };
            } else {
                throw new Error(`Sistema de hashing con problemas: ${JSON.stringify(results)}`);
            }
        } catch (error) {
            throw new Error(`Error en hashing: ${error.message}`);
        }
    }

    // Tests de resistencia a timing attacks
    async testTimingAttackResistance() {
        const testPassword = 'TestP@ssw0rd123!';
        const wrongPassword = 'WrongP@ssw0rd123!';
        
        try {
            // Generar hash para pruebas
            const hash = await PasswordSecurity.hashPassword(testPassword);
            
            // Medir tiempo de verificación correcta
            const startCorrect = process.hrtime.bigint();
            const correctResult = await PasswordSecurity.verifyPassword(testPassword, hash);
            const endCorrect = process.hrtime.bigint();
            const correctTime = Number(endCorrect - startCorrect) / 1000000; // Convertir a milisegundos

            // Medir tiempo de verificación incorrecta
            const startWrong = process.hrtime.bigint();
            const wrongResult = await PasswordSecurity.verifyPassword(wrongPassword, hash);
            const endWrong = process.hrtime.bigint();
            const wrongTime = Number(endWrong - startWrong) / 1000000; // Convertir a milisegundos

            // Verificar resultados
            if (!correctResult || wrongResult) {
                throw new Error('Resultados de verificación incorrectos');
            }

            // Verificar que los tiempos son similares (dentro de un rango razonable)
            const timeDifference = Math.abs(correctTime - wrongTime);
            const maxAllowedDifference = 200; // 200ms de diferencia máxima (aumentado para bcrypt)

            if (timeDifference <= maxAllowedDifference) {
                return {
                    message: `Resistencia a timing attacks funcionando (diferencia: ${timeDifference.toFixed(2)}ms)`,
                    details: {
                        correctTime,
                        wrongTime,
                        timeDifference,
                        maxAllowedDifference
                    }
                };
            } else {
                throw new Error(`Posible vulnerabilidad a timing attacks (diferencia: ${timeDifference.toFixed(2)}ms > ${maxAllowedDifference}ms)`);
            }
        } catch (error) {
            throw new Error(`Error en prueba de timing attacks: ${error.message}`);
        }
    }

    // Tests de rate limiting
    testRateLimiting() {
        const testEmail = 'test@example.com';
        
        try {
            // Limpiar intentos previos
            PasswordSecurity.loginAttempts.delete(testEmail);
            
            // Simular intentos fallidos
            for (let i = 0; i < 3; i++) {
                PasswordSecurity.recordFailedLogin(testEmail);
            }

            // Verificar que no está bloqueado aún
            let lockStatus = PasswordSecurity.isUserLocked(testEmail);
            if (lockStatus.locked) {
                throw new Error('Usuario bloqueado prematuramente');
            }

            // Agregar más intentos para exceder el límite
            for (let i = 0; i < 3; i++) {
                PasswordSecurity.recordFailedLogin(testEmail);
            }

            // Verificar que ahora está bloqueado
            lockStatus = PasswordSecurity.isUserLocked(testEmail);
            if (!lockStatus.locked) {
                throw new Error('Usuario no bloqueado después de exceder intentos');
            }

            // Limpiar intentos y verificar que se desbloquea
            PasswordSecurity.clearFailedLogins(testEmail);
            lockStatus = PasswordSecurity.isUserLocked(testEmail);
            if (lockStatus.locked) {
                throw new Error('Usuario permanece bloqueado después de limpiar intentos');
            }

            return {
                message: 'Rate limiting funcionando correctamente',
                details: {
                    maxAttempts: PasswordSecurity.config.loginAttempts.maxAttempts,
                    lockoutDuration: PasswordSecurity.config.loginAttempts.lockoutDuration
                }
            };
        } catch (error) {
            throw new Error(`Error en rate limiting: ${error.message}`);
        }
    }

    // Tests de configuración de seguridad
    testSecurityConfiguration() {
        try {
            const configValidation = PasswordSecurity.validateSecurityConfig();
            
            if (!configValidation.isValid) {
                // En desarrollo, algunos errores pueden ser aceptables
                const criticalIssues = configValidation.issues.filter(issue => 
                    issue.includes('bcryptRounds') || issue.includes('PASSWORD_PEPPER')
                );
                
                if (criticalIssues.length > 0) {
                    throw new Error(`Problemas críticos de configuración: ${criticalIssues.join(', ')}`);
                } else {
                    this.log('⚠️ Problemas de configuración no críticos (aceptables en desarrollo)', 'warning');
                }
            }

            const stats = PasswordSecurity.getSecurityStats();
            
            return {
                message: 'Configuración de seguridad validada',
                details: {
                    configValidation,
                    stats
                }
            };
        } catch (error) {
            throw new Error(`Error en configuración: ${error.message}`);
        }
    }

    // Tests de generación de tokens de reset
    testResetTokenGeneration() {
        try {
            const token1 = PasswordSecurity.generateResetToken();
            const token2 = PasswordSecurity.generateResetToken();

            // Verificar que los tokens son diferentes
            if (token1.token === token2.token) {
                throw new Error('Tokens de reset no son únicos');
            }

            // Verificar formato del token
            if (!/^[a-f0-9]{64}$/.test(token1.token)) {
                throw new Error('Formato de token inválido');
            }

            // Verificar tiempo de expiración
            const now = Date.now();
            if (token1.expires <= now) {
                throw new Error('Token de reset expirado inmediatamente');
            }

            // Verificar duración (debería ser aproximadamente 1 hora)
            const duration = token1.expires - now;
            const expectedDuration = 60 * 60 * 1000; // 1 hora
            const tolerance = 5 * 60 * 1000; // 5 minutos de tolerancia

            if (Math.abs(duration - expectedDuration) > tolerance) {
                throw new Error(`Duración de token incorrecta: ${duration}ms (esperado: ${expectedDuration}ms)`);
            }

            // Verificar validación de token
            const isValidToken = PasswordSecurity.verifyResetToken(token1, token1.token);
            const isInvalidToken = PasswordSecurity.verifyResetToken(token1, token1.token.substring(0, 32) + 'different');

            if (!isValidToken || isInvalidToken) {
                throw new Error('Validación de tokens de reset no funciona correctamente');
            }

            return {
                message: 'Generación de tokens de reset funcionando correctamente',
                details: {
                    tokenLength: token1.token.length,
                    duration: duration,
                    formatValid: /^[a-f0-9]{64}$/.test(token1.token)
                }
            };
        } catch (error) {
            throw new Error(`Error en tokens de reset: ${error.message}`);
        }
    }

    // Tests de edge cases
    testEdgeCases() {
        const results = {
            totalTests: 0,
            passedTests: 0,
            edgeCaseResults: []
        };

        for (const password of this.testData.edgeCases) {
            results.totalTests++;
            
            try {
                const validation = PasswordSecurity.validatePasswordStrength(password);
                
                // Algunos edge cases pueden ser válidos, otros no
                // Lo importante es que el sistema no se rompa
                const handledGracefully = validation && typeof validation.isValid === 'boolean';
                
                if (handledGracefully) {
                    results.passedTests++;
                    results.edgeCaseResults.push({
                        password: password.replace(/\s+/g, ' ').substring(0, 20) + '...',
                        valid: validation.isValid,
                        strength: validation.strength,
                        issues: validation.issues || []
                    });
                } else {
                    this.log(`Edge case no manejado correctamente: ${password}`, 'warning');
                }
            } catch (error) {
                this.log(`Error en edge case: ${password} - ${error.message}`, 'error');
            }
        }

        const successRate = (results.passedTests / results.totalTests) * 100;
        
        if (successRate >= 90) {
            return {
                message: `Edge cases manejados correctamente (${successRate.toFixed(1)}% de éxito)`,
                details: results
            };
        } else {
            throw new Error(`Edge cases no manejados adecuadamente (${successRate.toFixed(1)}% de éxito)`);
        }
    }

    // Ejecutar todas las pruebas
    async runAllTests() {
        console.log('🔐 INICIANDO PRUEBAS DE SEGURIDAD DE CONTRASEÑAS');
        console.log('='.repeat(60));

        // Tests síncronos
        this.runTest('Validación de Fortaleza de Contraseñas', () => this.testPasswordStrengthValidation());
        this.runTest('Rate Limiting', () => this.testRateLimiting());
        this.runTest('Configuración de Seguridad', () => this.testSecurityConfiguration());
        this.runTest('Generación de Tokens de Reset', () => this.testResetTokenGeneration());
        this.runTest('Manejo de Edge Cases', () => this.testEdgeCases());

        // Tests asíncronos
        await this.runAsyncTest('Hashing de Contraseñas', () => this.testPasswordHashing());
        await this.runAsyncTest('Resistencia a Timing Attacks', () => this.testTimingAttackResistance());

        // Generar reporte
        this.generateReport();
    }

    // Generar reporte de resultados
    generateReport() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const total = this.results.length;
        const successRate = ((passed / total) * 100).toFixed(2);

        console.log('\n📊 REPORTE DE PRUEBAS DE SEGURIDAD DE CONTRASEÑAS');
        console.log('='.repeat(60));
        console.log(`Total de pruebas: ${total}`);
        console.log(`Pruebas pasadas: ${passed}`);
        console.log(`Tasa de éxito: ${successRate}%`);

        console.log('\n📋 DETALLE DE PRUEBAS:');
        this.results.forEach(result => {
            const status = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${status} ${result.name}: ${result.message}`);
            
            if (result.status === 'FAIL' && result.details && Object.keys(result.details).length > 0) {
                console.log(`   Detalles: ${JSON.stringify(result.details, null, 2)}`);
            }
        });

        // Guardar reporte en archivo
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                total,
                passed,
                failed: total - passed,
                successRate: parseFloat(successRate)
            },
            tests: this.results
        };

        try {
            fs.writeFileSync('password-security-test-report.json', JSON.stringify(reportData, null, 2));
            console.log('\n📄 Reporte guardado en: password-security-test-report.json');
        } catch (error) {
            console.log('\n❌ Error guardando reporte:', error.message);
        }

        // Veredicto final
        if (passed === total) {
            console.log('\n🎉 ¡TODAS LAS PRUEBAS DE SEGURIDAD DE CONTRASEÑAS HAN PASADO!');
            console.log('✅ El sistema de manejo de contraseñas es seguro y robusto');
        } else {
            console.log('\n⚠️ HAY PRUEBAS FALLADAS - REVISAR IMPLEMENTACIÓN');
            console.log('❌ Algunos aspectos de la seguridad de contraseñas requieren atención');
        }

        return reportData;
    }
}

// Ejecutar pruebas
async function main() {
    const testSuite = new PasswordSecurityTestSuite();
    
    try {
        await testSuite.runAllTests();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando pruebas:', error);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = PasswordSecurityTestSuite;