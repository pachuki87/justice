/**
 * Sistema Seguro de Manejo de Contraseñas
 * Implementación completa de seguridad para credenciales de usuarios
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const PasswordSecurity = {
    // Configuración de hashing
    config: {
        // Rounds de bcrypt (costo computacional)
        bcryptRounds: 12,
        
        // Pepper adicional (secreto global)
        pepper: process.env.PASSWORD_PEPPER || null,
        
        // Longitud mínima de contraseña
        minLength: 8,
        
        // Requisitos de complejidad
        complexity: {
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            maxRepeatedChars: 2,
            preventCommonPasswords: true
        },
        
        // Configuración de rate limiting para intentos de login
        loginAttempts: {
            maxAttempts: 5,
            lockoutDuration: 15 * 60 * 1000, // 15 minutos
            attemptWindow: 5 * 60 * 1000, // 5 minutos
            progressiveDelay: true
        }
    },

    // Generar pepper si no existe
    generatePepper: function() {
        const pepper = crypto.randomBytes(32).toString('hex');
        console.warn('⚠️ PASSWORD_PEPPER no configurado, usando pepper temporal:', pepper.substring(0, 8) + '...');
        console.warn('🚨 ACCIÓN REQUERIDA: Configure PASSWORD_PEPPER en variables de entorno');
        return pepper;
    },

    // Validar fortaleza de contraseña
    validatePasswordStrength: function(password, options = {}) {
        const config = { ...this.config.complexity, ...options };
        const issues = [];
        const score = { strength: 0, maxScore: 100 };

        // Validación básica de longitud
        if (password.length < this.config.minLength) {
            issues.push(`La contraseña debe tener al menos ${this.config.minLength} caracteres`);
        } else {
            score.strength += 20;
        }

        // Validación de mayúsculas
        if (config.requireUppercase && !/[A-Z]/.test(password)) {
            issues.push('La contraseña debe contener al menos una letra mayúscula');
        } else if (/[A-Z]/.test(password)) {
            score.strength += 15;
        }

        // Validación de minúsculas
        if (config.requireLowercase && !/[a-z]/.test(password)) {
            issues.push('La contraseña debe contener al menos una letra minúscula');
        } else if (/[a-z]/.test(password)) {
            score.strength += 15;
        }

        // Validación de números
        if (config.requireNumbers && !/\d/.test(password)) {
            issues.push('La contraseña debe contener al menos un número');
        } else if (/\d/.test(password)) {
            score.strength += 15;
        }

        // Validación de caracteres especiales
        if (config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            issues.push('La contraseña debe contener al menos un carácter especial');
        } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            score.strength += 15;
        }

        // Validación de caracteres repetidos
        if (config.maxRepeatedChars) {
            const repeatedPattern = new RegExp(`(.)\\1{${config.maxRepeatedChars},}`, 'i');
            if (repeatedPattern.test(password)) {
                issues.push(`No se permiten más de ${config.maxRepeatedChars} caracteres repetidos consecutivamente`);
            } else {
                score.strength += 10;
            }
        }

        // Validación de contraseñas comunes
        if (config.preventCommonPasswords) {
            const commonPasswords = [
                'password', '123456', '123456789', 'qwerty', 'abc123',
                'password123', 'admin', 'letmein', 'welcome', 'monkey',
                '1234567890', 'password1', '123123', 'qwerty123', 'starwars'
            ];
            
            if (commonPasswords.includes(password.toLowerCase())) {
                issues.push('La contraseña es demasiado común y fácil de adivinar');
            } else {
                score.strength += 10;
            }
        }

        // Calcular nivel de fortaleza
        let strengthLevel = 'muy débil';
        if (score.strength >= 90) strengthLevel = 'muy fuerte';
        else if (score.strength >= 75) strengthLevel = 'fuerte';
        else if (score.strength >= 60) strengthLevel = 'moderada';
        else if (score.strength >= 40) strengthLevel = 'débil';

        return {
            isValid: issues.length === 0,
            strength: score.strength,
            strengthLevel,
            maxScore: score.maxScore,
            issues,
            recommendations: this.getPasswordRecommendations(issues)
        };
    },

    // Generar recomendaciones basadas en problemas
    getPasswordRecommendations: function(issues) {
        const recommendations = [];
        
        if (issues.some(issue => issue.includes('caracteres'))) {
            recommendations.push('Use una contraseña más larga (12+ caracteres recomendado)');
        }
        
        if (issues.some(issue => issue.includes('mayúscula'))) {
            recommendations.push('Agregue letras mayúsculas (A-Z)');
        }
        
        if (issues.some(issue => issue.includes('minúscula'))) {
            recommendations.push('Agregue letras minúsculas (a-z)');
        }
        
        if (issues.some(issue => issue.includes('número'))) {
            recommendations.push('Agregue números (0-9)');
        }
        
        if (issues.some(issue => issue.includes('especial'))) {
            recommendations.push('Agregue caracteres especiales (!@#$%^&*())');
        }
        
        if (issues.some(issue => issue.includes('común'))) {
            recommendations.push('Evite contraseñas comunes o predecibles');
        }
        
        if (issues.some(issue => issue.includes('repetidos'))) {
            recommendations.push('Evite caracteres repetidos consecutivamente');
        }

        return recommendations;
    },

    // Hashear contraseña de forma segura
    async hashPassword(password) {
        try {
            // Validar fortaleza antes de hashear
            const strengthCheck = this.validatePasswordStrength(password);
            if (!strengthCheck.isValid) {
                throw new Error(`Contraseña insegura: ${strengthCheck.issues.join(', ')}`);
            }

            // Asegurar que el pepper esté configurado
            if (!this.config.pepper) {
                this.config.pepper = this.generatePepper();
            }
            
            // Agregar pepper a la contraseña antes de hashear
            const pepperedPassword = password + this.config.pepper;

            // Hashear con bcrypt
            const hashedPassword = await bcrypt.hash(pepperedPassword, this.config.bcryptRounds);

            // Logging de seguridad (sin exponer datos sensibles)
            this.logSecurityEvent('password_hashed', {
                passwordLength: password.length,
                hasUpper: /[A-Z]/.test(password),
                hasLower: /[a-z]/.test(password),
                hasNumber: /\d/.test(password),
                hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
                bcryptRounds: this.config.bcryptRounds
            });

            return hashedPassword;
        } catch (error) {
            console.error('Error al hashear contraseña:', error.message);
            throw new Error('Error al procesar la contraseña de forma segura');
        }
    },

    // Verificar contraseña de forma segura (timing attack resistant)
    async verifyPassword(password, hashedPassword) {
        try {
            // Asegurar que el pepper esté configurado
            if (!this.config.pepper) {
                this.config.pepper = this.generatePepper();
            }
            
            // Agregar pepper a la contraseña
            const pepperedPassword = password + this.config.pepper;

            // Verificar con bcrypt (timing attack resistant)
            const isValid = await bcrypt.compare(pepperedPassword, hashedPassword);

            // Logging de seguridad (sin exponer datos sensibles)
            this.logSecurityEvent('password_verification', {
                success: isValid,
                passwordLength: password.length,
                timestamp: new Date().toISOString()
            });

            return isValid;
        } catch (error) {
            console.error('Error al verificar contraseña:', error.message);
            // En caso de error, siempre retornar false por seguridad
            return false;
        }
    },

    // Sistema de tracking de intentos de login
    loginAttempts: new Map(),

    // Verificar si un usuario está bloqueado por intentos fallidos
    isUserLocked: function(identifier) {
        const attempts = this.loginAttempts.get(identifier);
        if (!attempts) return false;

        const now = Date.now();
        
        // Limpiar intentos expirados
        attempts.failed = attempts.failed.filter(attempt => 
            now - attempt.timestamp < this.config.loginAttempts.attemptWindow
        );

        // Verificar si está bloqueado
        if (attempts.lockoutUntil && now < attempts.lockoutUntil) {
            return {
                locked: true,
                lockoutUntil: attempts.lockoutUntil,
                remainingTime: Math.ceil((attempts.lockoutUntil - now) / 1000),
                attempts: attempts.failed.length
            };
        }

        // Verificar si excede el máximo de intentos
        if (attempts.failed.length >= this.config.loginAttempts.maxAttempts) {
            const lockoutDuration = this.config.loginAttempts.progressiveDelay 
                ? Math.min(this.config.loginAttempts.lockoutDuration * Math.pow(2, attempts.failed.length - this.config.loginAttempts.maxAttempts), 60 * 60 * 1000) // Máximo 1 hora
                : this.config.loginAttempts.lockoutDuration;

            attempts.lockoutUntil = now + lockoutDuration;
            this.loginAttempts.set(identifier, attempts);

            return {
                locked: true,
                lockoutUntil: attempts.lockoutUntil,
                remainingTime: Math.ceil(lockoutDuration / 1000),
                attempts: attempts.failed.length
            };
        }

        return { locked: false, attempts: attempts.failed.length };
    },

    // Registrar intento de login fallido
    recordFailedLogin: function(identifier) {
        const now = Date.now();
        const attempts = this.loginAttempts.get(identifier) || {
            failed: [],
            lockoutUntil: null
        };

        attempts.failed.push({ timestamp: now });
        this.loginAttempts.set(identifier, attempts);

        // Logging de seguridad
        this.logSecurityEvent('failed_login_attempt', {
            identifier,
            attempts: attempts.failed.length,
            timestamp: new Date().toISOString()
        });
    },

    // Limpiar intentos de login exitoso
    clearFailedLogins: function(identifier) {
        this.loginAttempts.delete(identifier);

        // Logging de seguridad
        this.logSecurityEvent('successful_login', {
            identifier,
            timestamp: new Date().toISOString()
        });
    },

    // Generar token seguro para reset de contraseña
    generateResetToken: function() {
        return {
            token: crypto.randomBytes(32).toString('hex'),
            expires: Date.now() + (60 * 60 * 1000), // 1 hora
            createdAt: new Date().toISOString()
        };
    },

    // Verificar token de reset
    verifyResetToken: function(tokenData, providedToken) {
        if (!tokenData || !providedToken) return false;
        
        const isExpired = Date.now() > tokenData.expires;
        
        // Asegurar que ambos tokens tengan la misma longitud para timingSafeEqual
        const tokenBuffer = Buffer.from(tokenData.token);
        const providedBuffer = Buffer.from(providedToken);
        
        // Si las longitudes son diferentes, usar comparación segura pero no timingSafeEqual
        if (tokenBuffer.length !== providedBuffer.length) {
            return !isExpired && tokenData.token === providedToken;
        }
        
        const isValidToken = crypto.timingSafeEqual(tokenBuffer, providedBuffer);

        return !isExpired && isValidToken;
    },

    // Logging de eventos de seguridad
    logSecurityEvent: function(eventType, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: eventType,
            data: data
        };

        // En producción, esto debería ir a un sistema de logging seguro
        if (process.env.NODE_ENV === 'production') {
            console.log('🔐 SECURITY EVENT:', JSON.stringify(logEntry));
        } else {
            console.log('🔐 SECURITY EVENT (DEV):', logEntry);
        }
    },

    // Obtener estadísticas de seguridad
    getSecurityStats: function() {
        const now = Date.now();
        let totalFailedAttempts = 0;
        let lockedUsers = 0;

        for (const [identifier, attempts] of this.loginAttempts.entries()) {
            totalFailedAttempts += attempts.failed.length;
            
            if (attempts.lockoutUntil && now < attempts.lockoutUntil) {
                lockedUsers++;
            }
        }

        return {
            totalFailedAttempts,
            currentlyLockedUsers: lockedUsers,
            activeLoginAttempts: this.loginAttempts.size,
            bcryptRounds: this.config.bcryptRounds,
            pepperConfigured: !!process.env.PASSWORD_PEPPER
        };
    },

    // Validar configuración de seguridad
    validateSecurityConfig: function() {
        const issues = [];

        // Validar pepper
        if (!process.env.PASSWORD_PEPPER || process.env.PASSWORD_PEPPER.length < 32) {
            issues.push('PASSWORD_PEPPER no configurado o demasiado corto (mínimo 32 caracteres)');
        }

        // Validar rounds de bcrypt
        if (this.config.bcryptRounds < 10) {
            issues.push('bcryptRounds demasiado bajo (mínimo 10 recomendado)');
        }

        // Validar configuración de rate limiting
        if (this.config.loginAttempts.maxAttempts > 10) {
            issues.push('maxAttempts demasiado alto (máximo 10 recomendado)');
        }

        if (this.config.loginAttempts.lockoutDuration < 5 * 60 * 1000) {
            issues.push('lockoutDuration demasiado corto (mínimo 5 minutos recomendado)');
        }

        return {
            isValid: issues.length === 0,
            issues,
            config: {
                bcryptRounds: this.config.bcryptRounds,
                pepperConfigured: !!process.env.PASSWORD_PEPPER,
                pepperLength: process.env.PASSWORD_PEPPER?.length || 0,
                loginAttempts: this.config.loginAttempts
            }
        };
    }
};

// Validar configuración al iniciar
const configValidation = PasswordSecurity.validateSecurityConfig();
if (!configValidation.isValid) {
    console.error('🚨 ERRORES DE CONFIGURACIÓN DE SEGURIDAD:');
    configValidation.issues.forEach(issue => console.error('   -', issue));
    console.error('🚨 ACCIÓN REQUERIDA: Corrija la configuración de seguridad');
}

module.exports = PasswordSecurity;