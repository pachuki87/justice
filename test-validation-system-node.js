/**
 * Justice 2 - Sistema de Pruebas de Validación para Node.js
 * 
 * Este archivo contiene una versión adaptada del sistema de validación
 * para pruebas en entorno Node.js sin dependencias del navegador.
 */

// Sistema de validación adaptado para Node.js
const ValidationSystem = {
    // Validación de email
    validateEmail: function(email) {
        const result = {
            isValid: false,
            errors: [],
            warnings: [],
            sanitized: null
        };
        
        // Verificar si el valor es nulo o indefinido
        if (email === null || email === undefined) {
            result.errors.push('El email es requerido');
            return result;
        }
        
        // Convertir a string y sanitizar
        const sanitizedEmail = String(email).trim().toLowerCase();
        result.sanitized = sanitizedEmail;
        
        // Verificar si está vacío después de sanitizar
        if (!sanitizedEmail) {
            result.errors.push('El email no puede estar vacío');
            return result;
        }
        
        // Verificar longitud máxima
        if (sanitizedEmail.length > 40) {
            result.errors.push('El email es demasiado largo (máximo 40 caracteres)');
            return result;
        }
        
        // Regex robusta para validación de email (corregida)
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
        
        // Verificar doble punto en la parte local
        if (sanitizedEmail.includes('..')) {
            result.errors.push('El email no puede contener dobles puntos consecutivos');
            return result;
        }
        
        // Verificar doble punto en el dominio
        const emailDomain = sanitizedEmail.split('@')[1];
        if (emailDomain && emailDomain.includes('..')) {
            result.errors.push('El dominio no puede contener dobles puntos consecutivos');
            return result;
        }
        
        // Verificar que el dominio tenga al menos un punto
        if (!emailDomain || !emailDomain.includes('.')) {
            result.errors.push('El dominio debe tener al menos un punto');
            return result;
        }
        
        // Verificar que el TLD no sea numérico
        const emailTld = emailDomain.split('.').pop();
        if (/^\d+$/.test(emailTld)) {
            result.errors.push('El TLD no puede ser numérico');
            return result;
        }
        
        if (!emailRegex.test(sanitizedEmail)) {
            result.errors.push('El formato del email no es válido');
            return result;
        }
        
        // Verificar caracteres peligrosos
        const dangerousPatterns = [
            /[\x00-\x1F\x7F]/, // Caracteres de control
            /[<>]/, // HTML tags
            /javascript:/i, // Protocolo JavaScript
            /data:/i, // Data URI
            /vbscript:/i // Protocolo VBScript
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(sanitizedEmail)) {
                result.errors.push('El email contiene caracteres peligrosos');
                return result;
            }
        }
        
        // Verificar dominios sospechosos
        const suspiciousDomains = [
            'tempmail.com',
            '10minutemail.com',
            'guerrillamail.com',
            'mailinator.com',
            'yopmail.com',
            'localhost',
            'test.com'
        ];
        
        // Verificar si es IP o localhost
        if (suspiciousDomains.includes(emailDomain)) {
            result.errors.push('El dominio del email no está permitido');
            return result;
        }
        
        // Verificar si es dirección IP
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(emailDomain)) {
            result.errors.push('No se permiten direcciones IP en el email');
            return result;
        }
        
        // Verificar si es localhost
        if (emailDomain === 'localhost') {
            result.errors.push('No se permite localhost en el email');
            return result;
        }
        
        // Verificar si el TLD es demasiado corto o largo
        if (emailTld.length < 2 || emailTld.length > 6) {
            result.errors.push('El TLD debe tener entre 2 y 6 caracteres');
            return result;
        }
        
        result.isValid = true;
        return result;
    },
    
    // Validación de contraseña
    validatePassword: function(password) {
        const result = {
            isValid: false,
            errors: [],
            warnings: [],
            strength: 0,
            sanitized: null
        };
        
        // Verificar si el valor es nulo o indefinido
        if (password === null || password === undefined) {
            result.errors.push('La contraseña es requerida');
            return result;
        }
        
        // Convertir a string
        const sanitizedPassword = String(password);
        result.sanitized = sanitizedPassword;
        
        // Verificar longitud mínima
        if (sanitizedPassword.length < 8) {
            result.errors.push('La contraseña debe tener al menos 8 caracteres');
            return result;
        }
        
        // Verificar longitud máxima
        if (sanitizedPassword.length > 128) {
            result.errors.push('La contraseña es demasiado larga (máximo 128 caracteres)');
            return result;
        }
        
        // Calcular fuerza de la contraseña
        let strength = 0;
        
        // Verificar si contiene letras mayúsculas
        if (/[A-Z]/.test(sanitizedPassword)) {
            strength += 1;
        } else {
            result.errors.push('La contraseña debe contener al menos una letra mayúscula');
        }
        
        // Verificar si contiene letras minúsculas
        if (/[a-z]/.test(sanitizedPassword)) {
            strength += 1;
        } else {
            result.errors.push('La contraseña debe contener al menos una letra minúscula');
        }
        
        // Verificar si contiene números
        if (/[0-9]/.test(sanitizedPassword)) {
            strength += 1;
        } else {
            result.errors.push('La contraseña debe contener al menos un número');
        }
        
        // Verificar si contiene caracteres especiales
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(sanitizedPassword)) {
            strength += 1;
        } else {
            result.errors.push('La contraseña debe contener al menos un carácter especial');
        }
        
        // Verificar si contiene caracteres peligrosos
        const dangerousPatterns = [
            /[\x00-\x1F\x7F]/, // Caracteres de control
            /[<>]/, // HTML tags
            /javascript:/i, // Protocolo JavaScript
            /data:/i, // Data URI
            /vbscript:/i // Protocolo VBScript
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(sanitizedPassword)) {
                result.errors.push('La contraseña contiene caracteres peligrosos');
                return result;
            }
        }
        
        // Verificar contraseñas comunes
        const commonPasswords = [
            'password',
            '12345678',
            'qwerty',
            'admin',
            'letmein',
            'welcome',
            'monkey',
            '123456789',
            'password123',
            'abc123'
        ];
        
        if (commonPasswords.includes(sanitizedPassword.toLowerCase())) {
            result.errors.push('La contraseña es demasiado común');
            return result;
        }
        
        // Verificar si es un patrón predecible
        if (sanitizedPassword.match(/^(.)\1{7,}$/)) {
            result.errors.push('La contraseña no puede consistir en el mismo carácter repetido');
            return result;
        }
        
        // Verificar patrones secuenciales predecibles
        if (sanitizedPassword.match(/^(0123|1234|2345|3456|4567|5678|6789|7890|abcd|bcde|cdef|defg|efgh|fghi|ghij|hijk|ijkl|jklm|klmn|lmno|mnop|nopq|opqr|pqrs|qrst|rstu|stuv|tuvw|uvwx|vwxy|wxyz|qwerty|asdf|zxcv)/i)) {
            result.errors.push('La contraseña contiene un patrón secuencial predecible');
            return result;
        }
        
        // Verificar patrones de teclado
        if (sanitizedPassword.match(/^(qwerty|asdf|zxcv|1234|abcd)/i)) {
            result.errors.push('La contraseña contiene un patrón de teclado predecible');
            return result;
        }
        
        result.strength = strength;
        result.isValid = result.errors.length === 0;
        return result;
    },
    
    // Validación de nombre
    validateName: function(name) {
        const result = {
            isValid: false,
            errors: [],
            warnings: [],
            sanitized: null
        };
        
        // Verificar si el valor es nulo o indefinido
        if (name === null || name === undefined) {
            result.errors.push('El nombre es requerido');
            return result;
        }
        
        // Convertir a string y sanitizar
        const sanitizedName = String(name).trim();
        result.sanitized = sanitizedName;
        
        // Verificar si está vacío después de sanitizar
        if (!sanitizedName) {
            result.errors.push('El nombre no puede estar vacío');
            return result;
        }
        
        // Verificar longitud mínima
        if (sanitizedName.length < 2) {
            result.errors.push('El nombre debe tener al menos 2 caracteres');
            return result;
        }
        
        // Verificar longitud máxima
        if (sanitizedName.length > 100) {
            result.errors.push('El nombre es demasiado largo (máximo 100 caracteres)');
            return result;
        }
        
        // Verificar caracteres válidos (letras, espacios, apóstrofes, guiones)
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
        if (!nameRegex.test(sanitizedName)) {
            result.errors.push('El nombre contiene caracteres inválidos');
            return result;
        }
        
        // Verificar si contiene solo espacios
        if (/^\s+$/.test(sanitizedName)) {
            result.errors.push('El nombre no puede consistir solo en espacios');
            return result;
        }
        
        // Verificar si contiene caracteres de control
        if (/[\x00-\x1F\x7F]/.test(sanitizedName)) {
            result.errors.push('El nombre contiene caracteres de control');
            return result;
        }
        
        // Verificar si contiene múltiples espacios consecutivos
        if (/\s{3,}/.test(sanitizedName)) {
            result.warnings.push('El nombre contiene múltiples espacios consecutivos');
        }
        
        // Verificar caracteres peligrosos
        const dangerousPatterns = [
            /[\x00-\x1F\x7F]/, // Caracteres de control
            /[<>]/, // HTML tags
            /javascript:/i, // Protocolo JavaScript
            /data:/i, // Data URI
            /vbscript:/i // Protocolo VBScript
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(sanitizedName)) {
                result.errors.push('El nombre contiene caracteres peligrosos');
                return result;
            }
        }
        
        // Verificar nombres reservados
        const reservedNames = [
            'admin',
            'root',
            'system',
            'test',
            'demo',
            'null',
            'undefined',
            'eval',
            'alert',
            'prompt',
            'confirm'
        ];
        
        if (reservedNames.includes(sanitizedName.toLowerCase())) {
            result.errors.push('El nombre no está permitido');
            return result;
        }
        
        result.isValid = true;
        return result;
    },
    
    // Validación de número
    validateNumber: function(number) {
        const result = {
            isValid: false,
            errors: [],
            warnings: [],
            sanitized: null,
            parsed: null
        };
        
        // Verificar si el valor es nulo o indefinido
        if (number === null || number === undefined) {
            result.errors.push('El número es requerido');
            return result;
        }
        
        // Convertir a string
        const numberString = String(number).trim();
        result.sanitized = numberString;
        
        // Verificar si está vacío después de sanitizar
        if (!numberString) {
            result.errors.push('El número no puede estar vacío');
            return result;
        }
        
        // Verificar longitud máxima
        if (numberString.length > 50) {
            result.errors.push('El número es demasiado largo (máximo 50 caracteres)');
            return result;
        }
        
        // Verificar caracteres peligrosos
        const dangerousPatterns = [
            /[\x00-\x1F\x7F]/, // Caracteres de control
            /[<>]/, // HTML tags
            /javascript:/i, // Protocolo JavaScript
            /data:/i, // Data URI
            /vbscript:/i // Protocolo VBScript
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(numberString)) {
                result.errors.push('El número contiene caracteres peligrosos');
                return result;
            }
        }
        
        // Intentar parsear como número
        let parsedNumber;
        
        // Verificar si es un número decimal válido
        if (/^-?\d*\.?\d+$/.test(numberString)) {
            parsedNumber = parseFloat(numberString);
        } else if (/^-?\d+$/.test(numberString)) {
            parsedNumber = parseInt(numberString, 10);
        } else if (/^-?\d+\.?\d*[eE][+-]?\d+$/.test(numberString)) {
            parsedNumber = parseFloat(numberString);
        } else {
            result.errors.push('El formato del número no es válido');
            return result;
        }
        
        // Verificar si el resultado es NaN
        if (isNaN(parsedNumber)) {
            result.errors.push('El número no es válido');
            return result;
        }
        
        // Verificar si es infinito
        if (!isFinite(parsedNumber)) {
            result.errors.push('El número no puede ser infinito');
            return result;
        }
        
        result.parsed = parsedNumber;
        result.isValid = true;
        return result;
    },
    
    // Validación de fecha
    validateDate: function(date) {
        const result = {
            isValid: false,
            errors: [],
            warnings: [],
            sanitized: null,
            parsed: null
        };
        
        // Verificar si el valor es nulo o indefinido
        if (date === null || date === undefined) {
            result.errors.push('La fecha es requerida');
            return result;
        }
        
        // Convertir a string y sanitizar
        const dateString = String(date).trim();
        result.sanitized = dateString;
        
        // Verificar si está vacío después de sanitizar
        if (!dateString) {
            result.errors.push('La fecha no puede estar vacía');
            return result;
        }
        
        // Verificar longitud máxima
        if (dateString.length > 50) {
            result.errors.push('La fecha es demasiado larga (máximo 50 caracteres)');
            return result;
        }
        
        // Verificar caracteres peligrosos
        const dangerousPatterns = [
            /[\x00-\x1F\x7F]/, // Caracteres de control
            /[<>]/, // HTML tags
            /javascript:/i, // Protocolo JavaScript
            /data:/i, // Data URI
            /vbscript:/i // Protocolo VBScript
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(dateString)) {
                result.errors.push('La fecha contiene caracteres peligrosos');
                return result;
            }
        }
        
        // Verificar formato de fecha (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateString)) {
            result.errors.push('El formato de la fecha debe ser YYYY-MM-DD');
            return result;
        }
        
        // Parsear la fecha
        const parts = dateString.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        
        // Verificar rango del año
        if (year < 1900 || year > 2100) {
            result.errors.push('El año debe estar entre 1900 y 2100');
            return result;
        }
        
        // Verificar rango del mes
        if (month < 1 || month > 12) {
            result.errors.push('El mes debe estar entre 1 y 12');
            return result;
        }
        
        // Verificar rango del día
        if (day < 1 || day > 31) {
            result.errors.push('El día debe estar entre 1 y 31');
            return result;
        }
        
        // Verificar días por mes
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        
        // Verificar año bisiesto para febrero
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        const februaryDays = isLeapYear ? 29 : 28;
        
        if (month === 2 && day > februaryDays) {
            result.errors.push(`Febrero ${year} tiene solo ${februaryDays} días`);
            return result;
        }
        
        if (month !== 2 && day > daysInMonth[month - 1]) {
            result.errors.push(`El mes ${month} tiene solo ${daysInMonth[month - 1]} días`);
            return result;
        }
        
        // Crear objeto Date
        const parsedDate = new Date(year, month - 1, day);
        
        // Verificar si la fecha es válida
        if (isNaN(parsedDate.getTime())) {
            result.errors.push('La fecha no es válida');
            return result;
        }
        
        result.parsed = parsedDate;
        result.isValid = true;
        return result;
    },
    
    // Validación de string
    validateString: function(str, options = {}) {
        const result = {
            isValid: false,
            errors: [],
            warnings: [],
            sanitized: null
        };
        
        // Verificar si el valor es nulo o indefinido
        if (str === null || str === undefined) {
            result.errors.push('El texto es requerido');
            return result;
        }
        
        // Convertir a string
        const originalString = String(str);
        const sanitizedString = originalString.trim();
        result.sanitized = sanitizedString;
        
        // Verificar si contiene demasiados espacios consecutivos (más de 2) - ANTES de trim
        if (/\s{3,}/.test(originalString)) {
            result.errors.push('El texto contiene demasiados espacios consecutivos');
            return result;
        }
        
        // Verificar si está vacío después de sanitizar
        if (!sanitizedString) {
            result.errors.push('El texto no puede estar vacío');
            return result;
        }
        
        // Verificar longitud mínima
        if (options.minLength && sanitizedString.length < options.minLength) {
            result.errors.push(`El texto debe tener al menos ${options.minLength} caracteres`);
            return result;
        }
        
        // Verificar longitud máxima
        if (options.maxLength && sanitizedString.length > options.maxLength) {
            result.errors.push(`El texto es demasiado largo (máximo ${options.maxLength} caracteres)`);
            return result;
        }
        
        // Verificar longitud máxima por defecto
        if (!options.maxLength && sanitizedString.length > 10000) {
            result.errors.push('El texto es demasiado largo (máximo 10000 caracteres)');
            return result;
        }
        
        // Verificar caracteres peligrosos
        const dangerousPatterns = [
            /[\x00-\x1F\x7F]/, // Caracteres de control
            /<script[^>]*>.*?<\/script>/gi, // Script tags
            /javascript:/gi, // Protocolo JavaScript
            /data:/gi, // Data URI
            /vbscript:/gi, // Protocolo VBScript
            /on\w+\s*=/gi, // Event handlers
            /expression\s*\(/gi, // CSS expressions
            /@import/gi, // CSS imports
            /binding\s*:/gi, // CSS bindings
            /eval\s*\(/gi, // Eval function
            /setTimeout\s*\(/gi, // setTimeout
            /setInterval\s*\(/gi, // setInterval
            /Function\s*\(/gi, // Function constructor
            /document\./gi, // Document access
            /window\./gi, // Window access
            /alert\s*\(/gi, // Alert function
            /prompt\s*\(/gi, // Prompt function
            /confirm\s*\(/gi // Confirm function
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(sanitizedString)) {
                result.errors.push('El texto contiene contenido peligroso');
                return result;
            }
        }
        
        // Verificar si contiene demasiados espacios consecutivos (más de 2)
        if (/\s{3,}/.test(sanitizedString)) {
            result.errors.push('El texto contiene demasiados espacios consecutivos');
            return result;
        }
        
        // Verificar si el texto es demasiado largo después de trim (solo espacios)
        if (sanitizedString.length > 3 && /^\s+$/.test(sanitizedString)) {
            result.errors.push('El texto contiene demasiados espacios');
            return result;
        }
        
        // Verificar si el texto tiene una proporción anormal de espacios (más del 40%)
        const spaceCount = (sanitizedString.match(/\s/g) || []).length;
        const totalLength = sanitizedString.length;
        if (totalLength > 3 && spaceCount / totalLength > 0.4) {
            result.errors.push('El texto contiene una proporción anormal de espacios');
            return result;
        }
        
        // Verificar si contiene caracteres de control extendidos (C1 y C0)
        if (/[\x80-\x9F]/.test(sanitizedString)) {
            result.errors.push('El texto contiene caracteres de control extendidos');
            return result;
        }
        
        // Verificar caracteres de control altos (solo caracteres de control específicos, no caracteres internacionales)
        // Permitir caracteres internacionales como ñ, á, é, í, ó, ú, etc.
        // Bloquear caracteres de control específicos y caracteres no imprimibles como ÿ
        if (/[\x00-\x1F\x7F\xFF]/.test(sanitizedString)) {
            result.errors.push('El texto contiene caracteres de control no permitidos');
            return result;
        }
        
        // Verificar patrones XSS específicos
        const xssPatterns = [
            /<iframe[^>]*>/gi,
            /<object[^>]*>/gi,
            /<embed[^>]*>/gi,
            /<applet[^>]*>/gi,
            /<meta[^>]*>/gi,
            /<link[^>]*>/gi,
            /<style[^>]*>/gi,
            /<img[^>]*>/gi,
            /<svg[^>]*>/gi,
            /<math[^>]*>/gi,
            /<table[^>]*>/gi,
            /<form[^>]*>/gi,
            /<input[^>]*>/gi,
            /<textarea[^>]*>/gi,
            /<select[^>]*>/gi,
            /<button[^>]*>/gi,
            /<details[^>]*>/gi,
            /<dialog[^>]*>/gi,
            /<template[^>]*>/gi,
            /<slot[^>]*>/gi,
            /<shadow[^>]*>/gi
        ];
        
        for (const pattern of xssPatterns) {
            if (pattern.test(sanitizedString)) {
                result.warnings.push('El texto contiene etiquetas HTML potencialmente peligrosas');
            }
        }
        
        result.isValid = true;
        return result;
    }
};

// Configuración de pruebas
const TEST_CONFIG = {
    verbose: true,
    stopOnFailure: false,
    logResults: true,
    generateReport: true
};

// Contador de resultados
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
    warnings: [],
    details: []
};

/**
 * Utilidades para pruebas
 */
const TestUtils = {
    // Ejecutar una prueba individual
    runTest: (testName, testFunction) => {
        testResults.total++;
        
        try {
            const result = testFunction();
            if (result.passed) {
                testResults.passed++;
                if (TEST_CONFIG.verbose) {
                    console.log(`✅ ${testName}: ${result.message || 'PASSED'}`);
                }
            } else {
                testResults.failed++;
                testResults.errors.push({
                    test: testName,
                    error: result.message || 'FAILED',
                    details: result.details || null
                });
                if (TEST_CONFIG.verbose) {
                    console.log(`❌ ${testName}: ${result.message || 'FAILED'}`);
                    if (result.details) {
                        console.log(`   Detalles:`, result.details);
                    }
                }
            }
            
            testResults.details.push({
                test: testName,
                passed: result.passed,
                message: result.message || '',
                details: result.details || null,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            testResults.failed++;
            testResults.errors.push({
                test: testName,
                error: `Error en prueba: ${error.message}`,
                details: error.stack
            });
            console.log(`💥 ${testName}: ERROR - ${error.message}`);
        }
    },
    
    // Generar reporte HTML
    generateReport: () => {
        const report = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Justice 2 - Reporte de Validaciones</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: flex; justify-content: space-around; margin-bottom: 30px; }
        .summary-item { text-align: center; padding: 20px; border-radius: 8px; }
        .passed { background-color: #d4edda; color: #155724; }
        .failed { background-color: #f8d7da; color: #721c24; }
        .total { background-color: #d1ecf1; color: #0c5460; }
        .test-section { margin-bottom: 30px; }
        .test-category { background-color: #e9ecef; padding: 10px; border-radius: 5px; margin-bottom: 15px; }
        .test-item { padding: 10px; margin: 5px 0; border-left: 4px solid #ddd; }
        .test-passed { border-left-color: #28a745; background-color: #f8fff9; }
        .test-failed { border-left-color: #dc3545; background-color: #fff8f8; }
        .test-error { border-left-color: #6f42c1; background-color: #f8f9fa; }
        .test-name { font-weight: bold; margin-bottom: 5px; }
        .test-message { color: #666; font-style: italic; }
        .test-details { background-color: #f8f9fa; padding: 10px; margin-top: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; }
        .timestamp { color: #999; font-size: 12px; }
        h1 { color: #333; }
        h2 { color: #555; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Justice 2 - Reporte de Validaciones</h1>
            <p>Generado el: ${new Date().toLocaleString('es-ES')}</p>
        </div>
        
        <div class="summary">
            <div class="summary-item total">
                <h3>${testResults.total}</h3>
                <p>Total de Pruebas</p>
            </div>
            <div class="summary-item passed">
                <h3>${testResults.passed}</h3>
                <p>Pruebas Pasadas</p>
            </div>
            <div class="summary-item failed">
                <h3>${testResults.failed}</h3>
                <p>Pruebas Fallidas</p>
            </div>
        </div>
        
        <div class="test-section">
            <h2>📋 Detalles de Pruebas</h2>
            ${testResults.details.map(test => `
                <div class="test-item ${test.passed ? 'test-passed' : 'test-failed'}">
                    <div class="test-name">${test.test}</div>
                    <div class="test-message">${test.message || (test.passed ? 'PASSED' : 'FAILED')}</div>
                    ${test.details ? `<div class="test-details">${test.details}</div>` : ''}
                    <div class="timestamp">${test.timestamp}</div>
                </div>
            `).join('')}
        </div>
        
        ${testResults.errors.length > 0 ? `
        <div class="test-section">
            <h2>❌ Errores Encontrados</h2>
            ${testResults.errors.map(error => `
                <div class="test-item test-error">
                    <div class="test-name">${error.test}</div>
                    <div class="test-message">${error.error}</div>
                    ${error.details ? `<div class="test-details">${error.details}</div>` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
        
        return report;
    }
};

/**
 * Pruebas de Validación de Email
 */
const EmailValidationTests = {
    runAll: () => {
        console.log('\n🔍 Ejecutando pruebas de validación de email...');
        
        // Emails válidos
        const validEmails = [
            'user@example.com',
            'test.email+tag@domain.co.uk',
            'user_name@sub.domain.org',
            'firstname.lastname@company.com',
            'x@a.co',
            'admin@justice2.legal'
        ];
        
        // Emails inválidos
        const invalidEmails = [
            '', // Vacío
            'plaintext', // Sin @
            '@domain.com', // Sin usuario
            'user@', // Sin dominio
            'user..name@domain.com', // Doble punto
            'user@domain..com', // Doble punto en dominio
            'user@.com', // Punto al inicio
            'user@domain.', // Punto al final
            'user name@domain.com', // Espacio
            'user@domain com', // Espacio en dominio
            'user@domain', // Sin TLD
            'user@domain.c', // TLD muy corto
            'user@domain.toolongtld', // TLD muy largo
            'user@domain.123', // Números en TLD
            '<script>alert("xss")@domain.com', // XSS
            'javascript:alert("xss")@domain.com', // Protocolo peligroso
            'user@' + 'a'.repeat(250) + '.com', // Demasiado largo
            'user@localhost', // Dominio local
            'user@127.0.0.1', // IP
            'user@test.com', // Dominio sospechoso
            'user@' + 'example'.repeat(5) + '.com', // Dominio demasiado largo
            'user@tempmail.com', // Dominio temporal
            'user@' + String.fromCharCode(0) + 'domain.com' // Carácter nulo
        ];
        
        // Probar emails válidos
        validEmails.forEach(email => {
            TestUtils.runTest(`Email válido: ${email}`, () => {
                const result = ValidationSystem.validateEmail(email);
                return {
                    passed: result.isValid,
                    message: result.isValid ? 'Email válido aceptado correctamente' : 'Email válido rechazado incorrectamente',
                    details: `Resultado: ${JSON.stringify(result)}`
                };
            });
        });
        
        // Probar emails inválidos
        invalidEmails.forEach(email => {
            TestUtils.runTest(`Email inválido: ${email.substring(0, 50)}${email.length > 50 ? '...' : ''}`, () => {
                const result = ValidationSystem.validateEmail(email);
                return {
                    passed: !result.isValid,
                    message: !result.isValid ? 'Email inválido rechazado correctamente' : 'Email inválido aceptado incorrectamente',
                    details: `Resultado: ${JSON.stringify(result)}`
                };
            });
        });
        
        // Pruebas de bypass de validación de email
        const bypassAttempts = [
            'user@example.com<script>alert("xss")</script>',
            'user@example.com\0@domain.com',
            'user@example.com\r\n@domain.com',
            'user@example.com%00@domain.com',
            'user@example.com%0a@domain.com',
            'user@example.com%0d@domain.com',
            'user@example.com@domain.com@domain.com',
            'user@example.com>user@domain.com',
            'user@example.com<user@domain.com',
            'user@example.com|user@domain.com'
        ];
        
        bypassAttempts.forEach(attempt => {
            TestUtils.runTest(`Bypass email: ${attempt.substring(0, 50)}...`, () => {
                const result = ValidationSystem.validateEmail(attempt);
                return {
                    passed: !result.isValid,
                    message: !result.isValid ? 'Intento de bypass bloqueado correctamente' : 'Intento de bypass exitoso - VULNERABILIDAD',
                    details: `Intento: ${attempt}, Resultado: ${JSON.stringify(result)}`
                };
            });
        });
    }
};

/**
 * Pruebas de Validación de Contraseñas
 */
const PasswordValidationTests = {
    runAll: () => {
        console.log('\n🔐 Ejecutando pruebas de validación de contraseñas...');
        
        // Contraseñas válidas
        const validPasswords = [
            'SecurePass123!',
            'MyP@ssw0rd2024',
            'Complex!Passw0rd',
            'Justice2_Secure_2024',
            'P@ssw0rd!123',
            'MyStr0ng#Password',
            'SecurePass$2024',
            'C0mpl3x!P@ss',
            'JusT1c3_#S3cur3'
        ];
        
        // Contraseñas inválidas
        const invalidPasswords = [
            '', // Vacía
            '123', // Demasiado corta
            'password', // Común
            '12345678', // Secuencia numérica
            'abcdefgh', // Solo letras minúsculas
            'ABCDEFGH', // Solo letras mayúsculas
            '12345678', // Solo números
            'qwerty', // Teclado secuencial
            'admin', // Palabra común
            'test', // Palabra común
            'user', // Palabra común
            'pass', // Palabra común
            'a'.repeat(8), // Mismo caracter
            'Password123', // Sin caracteres especiales
            'NOLETRASMAYUSCULAS', // Sin minúsculas
            'minusculassolamente', // Sin mayúsculas
            'sinespacios', // Sin espacios
            'sinnumeros123', // Sin caracteres especiales
            'Espacios al inicio ',
            ' Espacios al final',
            ' Espacios en medio ',
            'contraseña', // Caracteres no ASCII
            'pássword', // Caracteres especiales no permitidos
            '\x00\x01\x02\x03', // Caracteres de control
            'a'.repeat(129), // Demasiado larga
            'user@example.com', // Email
            'john.doe', // Nombre
            'january2024', // Fecha
            'company123', // Empresa
            'password123', // Común + números
            'Qwerty123!' // Teclado + números
        ];
        
        // Probar contraseñas válidas
        validPasswords.forEach(password => {
            TestUtils.runTest(`Contraseña válida: ${password.replace(/./g, '*')}`, () => {
                const result = ValidationSystem.validatePassword(password);
                return {
                    passed: result.isValid,
                    message: result.isValid ? 'Contraseña válida aceptada correctamente' : 'Contraseña válida rechazada incorrectamente',
                    details: `Resultado: ${JSON.stringify(result)}`
                };
            });
        });
        
        // Probar contraseñas inválidas
        invalidPasswords.forEach(password => {
            const displayName = password.length > 20 ? password.substring(0, 20) + '...' : password;
            TestUtils.runTest(`Contraseña inválida: ${displayName}`, () => {
                const result = ValidationSystem.validatePassword(password);
                return {
                    passed: !result.isValid,
                    message: !result.isValid ? 'Contraseña inválida rechazada correctamente' : 'Contraseña inválida aceptada incorrectamente',
                    details: `Resultado: ${JSON.stringify(result)}`
                };
            });
        });
    }
};

/**
 * Pruebas de Validación de Nombres
 */
const NameValidationTests = {
    runAll: () => {
        console.log('\n👤 Ejecutando pruebas de validación de nombres...');
        
        // Nombres válidos
        const validNames = [
            'John Doe',
            'María García',
            'José Pérez',
            'Ana María López',
            'Jean-Claude Van Damme',
            "O'Connor",
            "D'Angelo",
            'Mary-Jane Watson',
            'Juan Carlos',
            'Sofía Martínez',
            'Pedro Alvarado',
            'Laura Sánchez',
            'Miguel Ángel',
            'Carmen María'
        ];
        
        // Nombres inválidos
        const invalidNames = [
            '', // Vacío
            ' ', // Solo espacio
            '   ', // Múltiples espacios
            '123', // Solo números
            'John123', // Números y letras
            'John@Doe', // Caracteres especiales
            '<script>alert("xss")</script>', // XSS
            'javascript:alert("xss")', // Protocolo peligroso
            'John\nDoe', // Salto de línea
            'John\tDoe', // Tabulación
            'John\x00Doe', // Carácter nulo
            'admin', // Nombre reservado
            'root', // Nombre reservado
            'system', // Nombre reservado
            'test', // Nombre reservado
            'demo', // Nombre reservado
            'null', // Nombre reservado
            'undefined', // Nombre reservado
            'eval', // Nombre reservado
            'alert', // Nombre reservado
            'prompt', // Nombre reservado
            'confirm', // Nombre reservado
            'John<>Doe', // Caracteres inválidos
            'John|Doe', // Pipe
            'John&Doe', // Ampersand
            'John%Doe', // Porcentaje
            'John#Doe', // Hash
            'John' + 'a'.repeat(101), // Demasiado largo
            'John Doe' + '\n' + 'Admin', // Inyección
            'John Doe<script>alert(1)</script>', // XSS
            'John Doe' + String.fromCharCode(0) + 'Admin' // Inyección
        ];
        
        // Probar nombres válidos
        validNames.forEach(name => {
            TestUtils.runTest(`Nombre válido: ${name}`, () => {
                const result = ValidationSystem.validateName(name);
                return {
                    passed: result.isValid,
                    message: result.isValid ? 'Nombre válido aceptado correctamente' : 'Nombre válido rechazado incorrectamente',
                    details: `Resultado: ${JSON.stringify(result)}`
                };
            });
        });
        
        // Probar nombres inválidos
        invalidNames.forEach(name => {
            const displayName = name.length > 30 ? name.substring(0, 30) + '...' : name;
            TestUtils.runTest(`Nombre inválido: ${displayName}`, () => {
                const result = ValidationSystem.validateName(name);
                return {
                    passed: !result.isValid,
                    message: !result.isValid ? 'Nombre inválido rechazado correctamente' : 'Nombre inválido aceptado incorrectamente',
                    details: `Resultado: ${JSON.stringify(result)}`
                };
            });
        });
    }
};

/**
 * Pruebas de Validación de Números
 */
const NumberValidationTests = {
    runAll: () => {
        console.log('\n🔢 Ejecutando pruebas de validación de números...');
        
        // Números válidos
        const validNumbers = [
            '123',
            '0',
            '-123',
            '123.456',
            '-123.456',
            '1000000',
            '0.001',
            '-0.001',
            '1e10',
            '1e-10',
            '1.23e5',
            '1.23e-5'
        ];
        
        // Números inválidos
        const invalidNumbers = [
            '', // Vacío
            'abc', // Texto
            '12a34', // Mixto
            '12.34.56', // Múltiples puntos
            '12..34', // Doble punto
            '12e34e56', // Múltiple notación científica
            '12e', // Notación científica incompleta
            'Infinity', // Infinito
            'NaN', // Not a Number
            'null', // Nulo
            'undefined', // Indefinido
            '123,', // Coma al final
            ',123', // Coma al inicio
            '12,34', // Coma decimal
            '12 34', // Espacio
            '12\t34', // Tabulación
            '12\n34', // Salto de línea
            '12\x0034', // Carácter nulo
            '12' + String.fromCharCode(0) + '34', // Carácter de control
            '123<script>', // XSS
            '123javascript:alert(1)', // Inyección
            '123<img src=x onerror=alert(1)>', // XSS
            '123' + 'a'.repeat(1001), // Demasiado largo
            '0x123', // Hexadecimal
            '0b1010', // Binario
            '0o777', // Octal
            '123abc', // Mixto al final
            'abc123', // Mixto al inicio
            '12.3e4.5', // Mixto decimal y científico
            '12e3.45', // Mixto científico y decimal
            '12.3e', // Decimal incompleto
            '12e3.4e5' // Múltiple mixto
        ];
        
        // Probar números válidos
        validNumbers.forEach(number => {
            TestUtils.runTest(`Número válido: ${number}`, () => {
                const result = ValidationSystem.validateNumber(number);
                return {
                    passed: result.isValid,
                    message: result.isValid ? 'Número válido aceptado correctamente' : 'Número válido rechazado incorrectamente',
                    details: `Resultado: ${JSON.stringify(result)}`
                };
            });
        });
        
        // Probar números inválidos
        invalidNumbers.forEach(number => {
            const displayName = number.length > 20 ? number.substring(0, 20) + '...' : number;
            TestUtils.runTest(`Número inválido: ${displayName}`, () => {
                const result = ValidationSystem.validateNumber(number);
                return {
                    passed: !result.isValid,
                    message: !result.isValid ? 'Número inválido rechazado correctamente' : 'Número inválido aceptado incorrectamente',
                    details: `Resultado: ${JSON.stringify(result)}`
                };
            });
        });
    }
};

/**
 * Pruebas de Validación de Fechas
 */
const DateValidationTests = {
    runAll: () => {
        console.log('\n📅 Ejecutando pruebas de validación de fechas...');
        
        // Fechas válidas
        const validDates = [
            '2024-01-01',
            '2024-12-31',
            '2024-02-29', // Año bisiesto
            '2020-02-29', // Año bisiesto
            '2000-02-29', // Año bisiesto (siglo)
            '2024-06-30',
            '2024-07-31',
            '1999-12-31',
            '2000-01-01',
            '2024-03-15',
            '2024-04-30'
        ];
        
        // Fechas inválidas
        const invalidDates = [
            '', // Vacía
            '2024-13-01', // Mes inválido
            '2024-02-30', // Día inválido (febrero)
            '2024-02-31', // Día inválido (febrero)
            '2024-04-31', // Día inválido (abril)
            '2024-06-31', // Día inválido (junio)
            '2024-09-31', // Día inválido (septiembre)
            '2024-11-31', // Día inválido (noviembre)
            '2024-00-15', // Mes cero
            '2024-13-15', // Mes 13
            '2024-02-00', // Día cero
            '2024-02-32', // Día 32
            '1899-12-31', // Año muy antiguo
            '2101-01-01', // Año muy futuro
            '2023-02-29', // No bisiesto
            'abcd-ef-gh', // Formato inválido
            '2024/01/01', // Separador inválido
            '2024.01.01', // Separador inválido
            '2024_01_01', // Separador inválido
            '2024 01 01', // Espacio como separador
            '2024-01', // Incompleta
            '01-01-2024', // Formato inverso
            '2024-13-32', // Mes y día inválidos
            '2024-02-30', // Día inválido en febrero
            '2024-04-31', // Día inválido en abril
            '2024-06-31', // Día inválido en junio
            '2024-09-31', // Día inválido en septiembre
            '2024-11-31', // Día inválido en noviembre
            '2024-02-29<script>', // XSS
            '2024-01-01<img src=x onerror=alert(1)>', // XSS
            '2024-01-01' + '\n' + '2024-01-02', // Inyección
            '2024-01-01' + '\0' + '2024-01-02', // Inyección
            '2024-01-01' + String.fromCharCode(0) + '2024-01-02', // Inyección
            '9999-12-31', // Año extremo
            '0001-01-01', // Año extremo
            '2024-01-01T00:00:00Z', // Con tiempo (no soportado)
            '2024-01-01 00:00:00', // Con tiempo (no soportado)
            'Jan 1, 2024', // Formato texto
            '1/1/2024', // Formato americano
            '01.01.2024', // Formato europeo con puntos
            '2024-01-01 ' + 'a'.repeat(1000), // Demasiado larga
            'javascript:alert(1)', // Inyección
            '<script>alert(1)</script>', // XSS
            '2024-01-01' + '<script>alert(1)</script>', // XSS
            '2024-01-01' + 'javascript:alert(1)', // Inyección
            '2024-01-01' + 'data:text/html,<script>alert(1)</script>', // Inyección
            '2024-01-01' + 'vbscript:alert(1)', // Inyección
            '2024-01-01' + 'onload=alert(1)', // Inyección
            '2024-01-01' + 'onclick=alert(1)', // Inyección
            '2024-01-01' + 'onerror=alert(1)', // Inyección
            '2024-01-01' + 'onmouseover=alert(1)', // Inyección
            '2024-01-01' + 'onfocus=alert(1)', // Inyección
            '2024-01-01' + 'onblur=alert(1)', // Inyección
            '2024-01-01' + 'onchange=alert(1)', // Inyección
            '2024-01-01' + 'onsubmit=alert(1)', // Inyección
            '2024-01-01' + 'onkeydown=alert(1)', // Inyección
            '2024-01-01' + 'onkeyup=alert(1)', // Inyección
            '2024-01-01' + 'onkeypress=alert(1)', // Inyección
            '2024-01-01' + 'ondblclick=alert(1)', // Inyección
            '2024-01-01' + 'oncontextmenu=alert(1)', // Inyección
            '2024-01-01' + 'ondrag=alert(1)', // Inyección
            '2024-01-01' + 'ondrop=alert(1)', // Inyección
            '2024-01-01' + 'onscroll=alert(1)', // Inyección
            '2024-01-01' + 'onresize=alert(1)', // Inyección
            '2024-01-01' + 'onunload=alert(1)' // Inyección
        ];
        
        // Probar fechas válidas
        validDates.forEach(date => {
            TestUtils.runTest(`Fecha válida: ${date}`, () => {
                const result = ValidationSystem.validateDate(date);
                return {
                    passed: result.isValid,
                    message: result.isValid ? 'Fecha válida aceptada correctamente' : 'Fecha válida rechazada incorrectamente',
                    details: `Resultado: ${JSON.stringify(result)}`
                };
            });
        });
        
        // Probar fechas inválidas
        invalidDates.forEach(date => {
            const displayName = date.length > 30 ? date.substring(0, 30) + '...' : date;
            TestUtils.runTest(`Fecha inválida: ${displayName}`, () => {
                const result = ValidationSystem.validateDate(date);
                return {
                    passed: !result.isValid,
                    message: !result.isValid ? 'Fecha inválida rechazada correctamente' : 'Fecha inválida aceptada incorrectamente',
                    details: `Resultado: ${JSON.stringify(result)}`
                };
            });
        });
    }
};

/**
 * Pruebas de Validación de Strings
 */
const StringValidationTests = {
    runAll: () => {
        console.log('\n📝 Ejecutando pruebas de validación de strings...');
        
        // Strings válidos
        const validStrings = [
            'Hello World',
            'Texto en español',
            'Café con tilde',
            'Niño con ñ',
            '123 Main Street',
            'User@Example.com',
            'Normal text 123',
            'Mixed CASE text',
            'Text with numbers 123',
            'Special chars: !@#$%',
            'Unicode: café, naïve, résumé',
            'Emoji: 😊🎉🚀',
            'Math: 2 + 2 = 4',
            'Quotes: "single" and \'double\'',
            'HTML escaped: <script>',
            'URL: https://example.com',
            'Email: user@example.com',
            'Phone: +1-555-123-4567',
            'Date: 2024-01-01',
            'Time: 12:34:56',
            'Currency: $123.45',
            'Percentage: 50%',
            'Coordinates: 40.7128° N, 74.0060° W',
            'Temperature: 23.5°C',
            'Weight: 75.2 kg',
            'Height: 175 cm',
            'Address: 123 Main St, City, ST 12345',
            'Code: ABC-123-XYZ',
            'Version: v1.2.3',
            'Hash: a1b2c3d4e5f6',
            'UUID: 550e8400-e29b-41d4-a716-446655440000',
            'IP: 192.168.1.1',
            'MAC: 00:1A:2B:3C:4D:5E:6F',
            'Serial: ABC123XYZ789',
            'License: ABCD-1234-EFGH-5678'
        ];
        
        // Strings inválidos
        const invalidStrings = [
            '', // Vacío
            '\x00', // Carácter nulo
            '\x01\x02\x03', // Caracteres de control
            '\x7F', // Carácter de control DEL
            '\xFF', // Byte alto
            String.fromCharCode(0) + 'text', // Carácter nulo al inicio
            'text' + String.fromCharCode(0), // Carácter nulo al final
            'te' + String.fromCharCode(0) + 'xt', // Carácter nulo en medio
            'text' + String.fromCharCode(13) + 'newline', // Carriage return
            'text' + String.fromCharCode(10) + 'newline', // Line feed
            'text' + String.fromCharCode(9) + 'tab', // Tab
            'text' + String.fromCharCode(8) + 'backspace', // Backspace
            'text' + String.fromCharCode(127) + 'del', // Delete
            '<script>alert("xss")</script>', // XSS
            'javascript:alert("xss")', // Protocolo peligroso
            'vbscript:alert("xss")', // Protocolo peligroso
            'data:text/html,<script>alert("xss")</script>', // Data URI
            'data:application/javascript,alert("xss")', // Data URI
            'onload=alert("xss")', // Event handler
            'onclick=alert("xss")', // Event handler
            'onerror=alert("xss")', // Event handler
            'onmouseover=alert("xss")', // Event handler
            'onfocus=alert("xss")', // Event handler
            'onblur=alert("xss")', // Event handler
            'onchange=alert("xss")', // Event handler
            'onsubmit=alert("xss")', // Event handler
            'onkeydown=alert("xss")', // Event handler
            'onkeyup=alert("xss")', // Event handler
            'onkeypress=alert("xss")', // Event handler
            'ondblclick=alert("xss")', // Event handler
            'oncontextmenu=alert("xss")', // Event handler
            'ondrag=alert("xss")', // Event handler
            'ondrop=alert("xss")', // Event handler
            'onscroll=alert("xss")', // Event handler
            'onresize=alert("xss")', // Event handler
            'onunload=alert("xss")', // Event handler
            'eval(alert("xss"))', // Eval
            'expression(alert("xss"))', // Expression CSS
            '@import url("javascript:alert(\'xss\')")', // Import CSS
            'binding:url("javascript:alert(\'xss\')")', // Binding CSS
            '<iframe src="javascript:alert(\'xss\')"></iframe>', // Iframe
            '<object data="javascript:alert(\'xss\')"></object>', // Object
            '<embed src="javascript:alert(\'xss\')"></embed>', // Embed
            '<applet code="javascript:alert(\'xss\')"></applet>', // Applet
            '<meta http-equiv="refresh" content="0;url=javascript:alert(\'xss\')">', // Meta refresh
            '<link rel="stylesheet" href="javascript:alert(\'xss\')">', // Link
            '<style>@import url("javascript:alert(\'xss\')");</style>', // Style
            '<style>body{background:url("javascript:alert(\'xss\')")}</style>', // Style
            '<img src="x" onerror="alert(\'xss\')">', // Img
            '<svg onload="alert(\'xss\')"></svg>', // SVG
            '<math><mtext><script>alert(\'xss\')</script></mtext></math>', // MathML
            '<table background="javascript:alert(\'xss\')">', // Table
            '<td background="javascript:alert(\'xss\')">', // TD
            '<div background="javascript:alert(\'xss\')">', // Div
            '<span background="javascript:alert(\'xss\')">', // Span
            '<p background="javascript:alert(\'xss\')">', // P
            '<a href="javascript:alert(\'xss\')">link</a>', // A
            '<form action="javascript:alert(\'xss\')">', // Form
            '<input type="text" value="javascript:alert(\'xss\')">', // Input
            '<textarea>javascript:alert(\'xss\')</textarea>', // Textarea
            '<select><option value="javascript:alert(\'xss\')">option</option></select>', // Select
            '<button onclick="javascript:alert(\'xss\')">button</button>', // Button
            '<details open="ontoggle=alert(\'xss\')">details</details>', // Details
            '<summary open="ontoggle=alert(\'xss\')">summary</summary>', // Summary
            '<dialog open="onclose=alert(\'xss\')">dialog</dialog>', // Dialog
            '<template><script>alert(\'xss\')</script></template>', // Template
            '<slot><script>alert(\'xss\')</script></slot>', // Slot
            '<shadow><script>alert(\'xss\')</script></shadow>', // Shadow
            '<custom-element onclick="alert(\'xss\')">custom-element</custom-element>', // Custom element
            '<foreignObject><script>alert(\'xss\')</script></foreignObject>', // Foreign object
            '<annotation><script>alert(\'xss\')</script></annotation>', // Annotation
            '<glyph><script>alert(\'xss\')</script></glyph>', // Glyph
            '<missing-glyph><script>alert(\'xss\')</script></missing-glyph>', // Missing glyph
            '<hkern><script>alert(\'xss\')</script></hkern>', // HKern
            '<vkern><script>alert(\'xss\')</script></vkern>', // VKern
            '<mpath><script>alert(\'xss\')</script></mpath>', // MPath
            '<mtext><script>alert(\'xss\')</script></mtext>', // MText
            '<mspace><script>alert(\'xss\')</script></mspace>', // MSpace
            '<malign><script>alert(\'xss\')</script></malign>', // MAlign
            '<mrow><script>alert(\'xss\')</script></mrow>', // MRow
            '<mfrac><script>alert(\'xss\')</script></mfrac>', // MFrac
            '<msqrt><script>alert(\'xss\')</script></msqrt>', // MSqrt
            '<mroot><script>alert(\'xss\')</script></mroot>', // MRoot
            '<mstyle><script>alert(\'xss\')</script></mstyle>', // MStyle
            '<merror><script>alert(\'xss\')</script></merror>', // MError
            '<mpadded><script>alert(\'xss\')</script></mpadded>', // MPadded
            '<mphantom><script>alert(\'xss\')</script></mphantom>', // MPhantom
            '<mglyph><script>alert(\'xss\')</script></mglyph>', // MGlyph
            '<maligngroup><script>alert(\'xss\')</script></maligngroup>', // MAlignGroup
            '<mtable><script>alert(\'xss\')</script></mtable>', // MTable
            '<mtr><script>alert(\'xss\')</script></mtr>', // MTR
            '<mtd><script>alert(\'xss\')</script></mtd>', // MTD
            '<mlabeledtr><script>alert(\'xss\')</script></mlabeledtr>', // MLabeledTR
            '<maction><script>alert(\'xss\')</script></maction>', // MAction
            '<menclose><script>alert(\'xss\')</script></menclose>', // MEnclose
            '<msub><script>alert(\'xss\')</script></msub>', // MSub
            '<msup><script>alert(\'xss\')</script></msup>', // MSup
            '<msubsup><script>alert(\'xss\')</script></msubsup>', // MSubSup
            '<munder><script>alert(\'xss\')</script></munder>', // MUnder
            '<mover><script>alert(\'xss\')</script></mover>', // MOver
            '<munderover><script>alert(\'xss\')</script></munderover>', // MUnderOver
            '<mmultiscripts><script>alert(\'xss\')</script></mmultiscripts>', // MMultiScripts
            'text' + 'a'.repeat(10001), // Demasiado largo
            'text' + '\0'.repeat(100), // Múltiples caracteres nulos
            'text' + '\r\n'.repeat(50), // Múltiples saltos de línea
            'text' + '\t'.repeat(100), // Múltiples tabulaciones
            'text' + '\x00'.repeat(50), // Múltiples caracteres de control
            'text' + '\x01'.repeat(50), // Múltiples caracteres de control
            'text' + '\x02'.repeat(50), // Múltiples caracteres de control
            'text' + '\x03'.repeat(50), // Múltiples caracteres de control
            'text' + '\x04'.repeat(50), // Múltiples caracteres de control
            'text' + '\x05'.repeat(50), // Múltiples caracteres de control
            'text' + '\x06'.repeat(50), // Múltiples caracteres de control
            'text' + '\x07'.repeat(50), // Múltiples caracteres de control
            'text' + '\x08'.repeat(50), // Múltiples caracteres de control
            'text' + '\x09'.repeat(50), // Múltiples caracteres de control
            'text' + '\x0A'.repeat(50), // Múltiples caracteres de control
            'text' + '\x0B'.repeat(50), // Múltiples caracteres de control
            'text' + '\x0C'.repeat(50), // Múltiples caracteres de control
            'text' + '\x0D'.repeat(50), // Múltiples caracteres de control
            'text' + '\x0E'.repeat(50), // Múltiples caracteres de control
            'text' + '\x0F'.repeat(50), // Múltiples caracteres de control
            'text' + '\x10'.repeat(50), // Múltiples caracteres de control
            'text' + '\x11'.repeat(50), // Múltiples caracteres de control
            'text' + '\x12'.repeat(50), // Múltiples caracteres de control
            'text' + '\x13'.repeat(50), // Múltiples caracteres de control
            'text' + '\x14'.repeat(50), // Múltiples caracteres de control
            'text' + '\x15'.repeat(50), // Múltiples caracteres de control
            'text' + '\x16'.repeat(50), // Múltiples caracteres de control
            'text' + '\x17'.repeat(50), // Múltiples caracteres de control
            'text' + '\x18'.repeat(50), // Múltiples caracteres de control
            'text' + '\x19'.repeat(50), // Múltiples caracteres de control
            'text' + '\x1A'.repeat(50), // Múltiples caracteres de control
            'text' + '\x1B'.repeat(50), // Múltiples caracteres de control
            'text' + '\x1C'.repeat(50), // Múltiples caracteres de control
            'text' + '\x1D'.repeat(50), // Múltiples caracteres de control
            'text' + '\x1E'.repeat(50), // Múltiples caracteres de control
            'text' + '\x1F'.repeat(50), // Múltiples caracteres de control
            'text' + '\x7F'.repeat(50), // Múltiples caracteres de control
            'text' + '\x80'.repeat(50), // Múltiples caracteres de control
            'text' + '\x81'.repeat(50), // Múltiples caracteres de control
            'text' + '\x82'.repeat(50), // Múltiples caracteres de control
            'text' + '\x83'.repeat(50), // Múltiples caracteres de control
            'text' + '\x84'.repeat(50), // Múltiples caracteres de control
            'text' + '\x85'.repeat(50), // Múltiples caracteres de control
            'text' + '\x86'.repeat(50), // Múltiples caracteres de control
            'text' + '\x87'.repeat(50), // Múltiples caracteres de control
            'text' + '\x88'.repeat(50), // Múltiples caracteres de control
            'text' + '\x89'.repeat(50), // Múltiples caracteres de control
            'text' + '\x8A'.repeat(50), // Múltiples caracteres de control
            'text' + '\x8B'.repeat(50), // Múltiples caracteres de control
            'text' + '\x8C'.repeat(50), // Múltiples caracteres de control
            'text' + '\x8D'.repeat(50), // Múltiples caracteres de control
            'text' + '\x8E'.repeat(50), // Múltiples caracteres de control
            'text' + '\x8F'.repeat(50), // Múltiples caracteres de control
            'text' + '\x90'.repeat(50), // Múltiples caracteres de control
            'text' + '\x91'.repeat(50), // Múltiples caracteres de control
            'text' + '\x92'.repeat(50), // Múltiples caracteres de control
            'text' + '\x93'.repeat(50), // Múltiples caracteres de control
            'text' + '\x94'.repeat(50), // Múltiples caracteres de control
            'text' + '\x95'.repeat(50), // Múltiples caracteres de control
            'text' + '\x96'.repeat(50), // Múltiples caracteres de control
            'text' + '\x97'.repeat(50), // Múltiples caracteres de control
            'text' + '\x98'.repeat(50), // Múltiples caracteres de control
            'text' + '\x99'.repeat(50), // Múltiples caracteres de control
            'text' + '\x9A'.repeat(50), // Múltiples caracteres de control
            'text' + '\x9B'.repeat(50), // Múltiples caracteres de control
            'text' + '\x9C'.repeat(50), // Múltiples caracteres de control
            'text' + '\x9D'.repeat(50), // Múltiples caracteres de control
            'text' + '\x9E'.repeat(50), // Múltiples caracteres de control
            'text' + '\x9F'.repeat(50) // Múltiples caracteres de control
        ];
        
        // Probar strings válidos
        validStrings.forEach(str => {
            TestUtils.runTest(`String válido: ${str.substring(0, 50)}${str.length > 50 ? '...' : ''}`, () => {
                const result = ValidationSystem.validateString(str);
                return {
                    passed: result.isValid,
                    message: result.isValid ? 'String válido aceptado correctamente' : 'String válido rechazado incorrectamente',
                    details: `Resultado: ${JSON.stringify(result)}`
                };
            });
        });
        
        // Probar strings inválidos
        invalidStrings.forEach(str => {
            const displayName = str.length > 50 ? str.substring(0, 50) + '...' : str;
            TestUtils.runTest(`String inválido: ${displayName}`, () => {
                const result = ValidationSystem.validateString(str);
                return {
                    passed: !result.isValid,
                    message: !result.isValid ? 'String inválido rechazado correctamente' : 'String inválido aceptado incorrectamente',
                    details: `Resultado: ${JSON.stringify(result)}`
                };
            });
        });
    }
};

/**
 * Función principal para ejecutar todas las pruebas
 */
function runAllTests() {
    console.log('🚀 Iniciando sistema de pruebas de validación comprehensivo...');
    console.log('==================================================');
    
    // Resetear resultados
    testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: [],
        warnings: [],
        details: []
    };
    
    // Ejecutar todas las suites de pruebas
    EmailValidationTests.runAll();
    PasswordValidationTests.runAll();
    NameValidationTests.runAll();
    NumberValidationTests.runAll();
    DateValidationTests.runAll();
    StringValidationTests.runAll();
    
    // Mostrar resumen
    console.log('\n==================================================');
    console.log('📊 RESUMEN DE PRUEBAS');
    console.log('==================================================');
    console.log(`Total de pruebas: ${testResults.total}`);
    console.log(`Pruebas pasadas: ${testResults.passed}`);
    console.log(`Pruebas fallidas: ${testResults.failed}`);
    console.log(`Tasa de éxito: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
    
    if (testResults.errors.length > 0) {
        console.log('\n❌ ERRORES CRÍTICOS ENCONTRADOS:');
        testResults.errors.forEach(error => {
            console.log(`  - ${error.test}: ${error.error}`);
        });
    }
    
    // Generar reporte HTML si está configurado
    if (TEST_CONFIG.generateReport) {
        const report = TestUtils.generateReport();
        const fs = require('fs');
        const reportPath = './validation-test-report.html';
        
        try {
            fs.writeFileSync(reportPath, report);
            console.log(`\n📄 Reporte HTML generado: ${reportPath}`);
        } catch (error) {
            console.log(`\n❌ Error generando reporte HTML: ${error.message}`);
        }
    }
    
    return testResults;
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        EmailValidationTests,
        PasswordValidationTests,
        NameValidationTests,
        NumberValidationTests,
        DateValidationTests,
        StringValidationTests,
        TestUtils,
        testResults,
        ValidationSystem
    };
}

// Ejecutar pruebas si se llama directamente
if (typeof window === 'undefined' && require.main === module) {
    runAllTests();
}