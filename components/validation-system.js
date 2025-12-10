/**
 * Justice 2 Validation System
 * Sistema de validación de formularios modular y reutilizable
 */

// Función de sanitización XSS para prevenir ataques
const sanitizeInput = function(input) {
    if (typeof input !== 'string') return input;
    
    // Eliminar etiquetas HTML peligrosas
    const tempDiv = document.createElement('div');
    tempDiv.textContent = input;
    const sanitized = tempDiv.innerHTML;
    
    // Eliminar scripts y eventos peligrosos
    return sanitized
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/data:/gi, '');
};

// Función para escapar HTML
const escapeHTML = function(str) {
    if (typeof str !== 'string') return str;
    
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
};

const Justice2Validation = {
    // Configuración
    config: {
        validateOnInput: false,
        validateOnBlur: true,
        validateOnSubmit: true,
        showErrors: true,
        errorClass: 'is-invalid',
        successClass: 'is-valid',
        errorElement: 'div',
        errorClass: 'invalid-feedback',
        successElement: 'div',
        successClass: 'valid-feedback'
    },
    
    // Validadores predefinidos
    validators: {
        required: function(value, options = {}) {
            const trimmedValue = value.toString().trim();
            return {
                isValid: trimmedValue.length > 0,
                message: options.message || 'Este campo es requerido'
            };
        },
        
        email: function(value, options = {}) {
            const allowEmpty = options.allowEmpty !== false; // Por defecto permite vacío
            const isEmpty = !value || value.trim() === '';
            
            // Si está vacío y no se permite, es inválido
            if (isEmpty && !allowEmpty) {
                return {
                    isValid: false,
                    message: options.message || 'El email es requerido'
                };
            }
            
            // Si está vacío y se permite, es válido
            if (isEmpty && allowEmpty) {
                return {
                    isValid: true,
                    message: ''
                };
            }
            
            // Validaciones básicas de formato
            if (!value || typeof value !== 'string') {
                return {
                    isValid: false,
                    message: options.message || 'El email debe ser un texto válido'
                };
            }
            
            // Validar longitud máxima (254 caracteres según RFC 5321)
            if (value.length > 254) {
                return {
                    isValid: false,
                    message: options.message || 'El email es demasiado largo'
                };
            }
            
            // Validar que no tenga espacios
            if (/\s/.test(value)) {
                return {
                    isValid: false,
                    message: options.message || 'El email no puede contener espacios'
                };
            }
            
            // Validar que tenga solo un @
            const atCount = (value.match(/@/g) || []).length;
            if (atCount !== 1) {
                return {
                    isValid: false,
                    message: options.message || 'El email debe contener exactamente un @'
                };
            }
            
            // Separar partes local y dominio
            const [localPart, domain] = value.split('@');
            
            // Validar parte local
            if (localPart.length === 0 || localPart.length > 64) {
                return {
                    isValid: false,
                    message: options.message || 'La parte local del email es inválida'
                };
            }
            
            // Validar que no comience o termine con punto
            if (localPart.startsWith('.') || localPart.endsWith('.')) {
                return {
                    isValid: false,
                    message: options.message || 'La parte local no puede comenzar o terminar con punto'
                };
            }
            
            // Validar que no tenga puntos consecutivos
            if (localPart.includes('..')) {
                return {
                    isValid: false,
                    message: options.message || 'La parte local no puede tener puntos consecutivos'
                };
            }
            
            // Validar dominio
            if (domain.length === 0 || domain.length > 253) {
                return {
                    isValid: false,
                    message: options.message || 'El dominio del email es inválido'
                };
            }
            
            // Validar que el dominio no comience o termine con punto o guión
            if (domain.startsWith('.') || domain.endsWith('.') || domain.startsWith('-') || domain.endsWith('-')) {
                return {
                    isValid: false,
                    message: options.message || 'El dominio no puede comenzar o terminar con punto o guión'
                };
            }
            
            // Validar que no tenga puntos consecutivos en el dominio
            if (domain.includes('..')) {
                return {
                    isValid: false,
                    message: options.message || 'El dominio no puede tener puntos consecutivos'
                };
            }
            
            // Validar etiquetas del dominio
            const domainLabels = domain.split('.');
            if (domainLabels.length < 2) {
                return {
                    isValid: false,
                    message: options.message || 'El dominio debe tener al menos dos etiquetas'
                };
            }
            
            // Validar cada etiqueta del dominio
            for (const label of domainLabels) {
                if (label.length === 0 || label.length > 63) {
                    return {
                        isValid: false,
                        message: options.message || 'Las etiquetas del dominio deben tener entre 1 y 63 caracteres'
                    };
                }
                
                // Validar que las etiquetas solo contengan caracteres válidos
                if (!/^[a-zA-Z0-9-]+$/.test(label)) {
                    return {
                        isValid: false,
                        message: options.message || 'Las etiquetas del dominio solo pueden contener letras, números y guiones'
                    };
                }
                
                // Validar que las etiquetas no comiencen o terminen con guión
                if (label.startsWith('-') || label.endsWith('-')) {
                    return {
                        isValid: false,
                        message: options.message || 'Las etiquetas del dominio no pueden comenzar o terminar con guión'
                    };
                }
            }
            
            // Validar TLD (última etiqueta)
            const tld = domainLabels[domainLabels.length - 1];
            if (tld.length < 2) {
                return {
                    isValid: false,
                    message: options.message || 'El TLD debe tener al menos 2 caracteres'
                };
            }
            
            if (tld.length > 23) { // Límite real para TLDs
                return {
                    isValid: false,
                    message: options.message || 'El TLD es demasiado largo'
                };
            }
            
            // Validar que el TLD solo contenga letras
            if (!/^[a-zA-Z]+$/.test(tld)) {
                return {
                    isValid: false,
                    message: options.message || 'El TLD solo puede contener letras'
                };
            }
            
            // Validar caracteres permitidos en la parte local
            const localRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
            if (!localRegex.test(localPart)) {
                return {
                    isValid: false,
                    message: options.message || 'La parte local contiene caracteres no permitidos'
                };
            }
            
            // Dominios permitidos (whitelist para mayor seguridad)
            const allowedDomains = [
                'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'justice2.legal',
                'example.com', 'test.com', 'domain.co.uk', 'sub.domain.org'
            ];
            
            // Si se especifica una lista de dominios permitidos, validar contra ella
            if (options.allowedDomains && options.allowedDomains.length > 0) {
                if (!options.allowedDomains.includes(domain)) {
                    return {
                        isValid: false,
                        message: options.message || 'El dominio del email no está permitido'
                    };
                }
            }
            
            // Por defecto, permitir dominios comunes pero bloquear sospechosos
            const suspiciousDomains = ['tempmail.com', 'test.com', 'example.com'];
            if (suspiciousDomains.includes(domain) && !options.allowSuspicious) {
                return {
                    isValid: false,
                    message: options.message || 'El dominio del email no está permitido'
                };
            }
            
            return {
                isValid: true,
                message: ''
            };
        },
        
        phone: function(value, options = {}) {
            const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}$/;
            const cleanValue = value.replace(/\s/g, '');
            return {
                isValid: !value || phoneRegex.test(cleanValue),
                message: options.message || 'Ingrese un teléfono válido'
            };
        },
        
        dni: function(value, options = {}) {
            const dniRegex = /^[XYZ]?\d{7,8}[A-Z]$/;
            return {
                isValid: !value || dniRegex.test(value.toUpperCase()),
                message: options.message || 'Ingrese un DNI válido'
            };
        },
        
        minLength: function(value, options = {}) {
            const minLength = options.min || 1;
            return {
                isValid: value.length >= minLength,
                message: options.message || `Mínimo ${minLength} caracteres`
            };
        },
        
        maxLength: function(value, options = {}) {
            const maxLength = options.max || 255;
            return {
                isValid: value.length <= maxLength,
                message: options.message || `Máximo ${maxLength} caracteres`
            };
        },
        
        min: function(value, options = {}) {
            const min = options.min || 0;
            const allowEmpty = options.allowEmpty !== false; // Por defecto permite vacío
            const isEmpty = !value || value.toString().trim() === '';
            
            // Si está vacío y no se permite, es inválido
            if (isEmpty && !allowEmpty) {
                return {
                    isValid: false,
                    message: options.message || 'Este campo es requerido'
                };
            }
            
            // Si está vacío y se permite, es válido
            if (isEmpty && allowEmpty) {
                return {
                    isValid: true,
                    message: ''
                };
            }
            
            const numValue = parseFloat(value);
            
            // Si no es un número válido, es inválido
            if (isNaN(numValue)) {
                return {
                    isValid: false,
                    message: options.message || 'Debe ingresar un número válido'
                };
            }
            
            return {
                isValid: numValue >= min,
                message: options.message || `El valor debe ser mayor o igual a ${min}`
            };
        },
        
        max: function(value, options = {}) {
            const max = options.max || 100;
            const allowEmpty = options.allowEmpty !== false; // Por defecto permite vacío
            const isEmpty = !value || value.toString().trim() === '';
            
            // Si está vacío y no se permite, es inválido
            if (isEmpty && !allowEmpty) {
                return {
                    isValid: false,
                    message: options.message || 'Este campo es requerido'
                };
            }
            
            // Si está vacío y se permite, es válido
            if (isEmpty && allowEmpty) {
                return {
                    isValid: true,
                    message: ''
                };
            }
            
            const numValue = parseFloat(value);
            
            // Si no es un número válido, es inválido
            if (isNaN(numValue)) {
                return {
                    isValid: false,
                    message: options.message || 'Debe ingresar un número válido'
                };
            }
            
            return {
                isValid: numValue <= max,
                message: options.message || `El valor debe ser menor o igual a ${max}`
            };
        },
        
        pattern: function(value, options = {}) {
            const pattern = options.pattern;
            if (!pattern) return { isValid: true };
            
            const regex = new RegExp(pattern);
            return {
                isValid: !value || regex.test(value),
                message: options.message || 'Formato inválido'
            };
        },
        
        url: function(value, options = {}) {
            try {
                new URL(value);
                return { isValid: !value || true, message: options.message || 'URL inválida' };
            } catch {
                return { isValid: !value, message: options.message || 'URL inválida' };
            }
        },
        
        numeric: function(value, options = {}) {
            const allowEmpty = options.allowEmpty !== false; // Por defecto permite vacío
            const isEmpty = !value || value.toString().trim() === '';
            
            // Si está vacío y no se permite, es inválido
            if (isEmpty && !allowEmpty) {
                return {
                    isValid: false,
                    message: options.message || 'Este campo es requerido'
                };
            }
            
            // Si está vacío y se permite, es válido
            if (isEmpty && allowEmpty) {
                return {
                    isValid: true,
                    message: ''
                };
            }
            
            const numValue = parseFloat(value);
            
            return {
                isValid: !isNaN(numValue) && isFinite(numValue),
                message: options.message || 'Ingrese un valor numérico válido'
            };
        },
        
        integer: function(value, options = {}) {
            const allowEmpty = options.allowEmpty !== false; // Por defecto permite vacío
            const isEmpty = !value || value.toString().trim() === '';
            
            // Si está vacío y no se permite, es inválido
            if (isEmpty && !allowEmpty) {
                return {
                    isValid: false,
                    message: options.message || 'Este campo es requerido'
                };
            }
            
            // Si está vacío y se permite, es válido
            if (isEmpty && allowEmpty) {
                return {
                    isValid: true,
                    message: ''
                };
            }
            
            const intValue = parseInt(value, 10);
            
            return {
                isValid: !isNaN(intValue) && Number.isInteger(intValue) && isFinite(intValue),
                message: options.message || 'Ingrese un número entero válido'
            };
        },
        
        alpha: function(value, options = {}) {
            const allowEmpty = options.allowEmpty !== false; // Por defecto permite vacío
            const isEmpty = !value || value.toString().trim() === '';
            
            // Si está vacío y no se permite, es inválido
            if (isEmpty && !allowEmpty) {
                return {
                    isValid: false,
                    message: options.message || 'Este campo es requerido'
                };
            }
            
            // Si está vacío y se permite, es válido
            if (isEmpty && allowEmpty) {
                return {
                    isValid: true,
                    message: ''
                };
            }
            
            // Validar tipo de dato
            if (typeof value !== 'string') {
                return {
                    isValid: false,
                    message: options.message || 'El valor debe ser un texto'
                };
            }
            
            // Validar longitud máxima
            const maxLength = options.maxLength || 255;
            if (value.length > maxLength) {
                return {
                    isValid: false,
                    message: options.message || `Máximo ${maxLength} caracteres`
                };
            }
            
            // Validar longitud mínima
            const minLength = options.minLength || 1;
            if (value.length < minLength) {
                return {
                    isValid: false,
                    message: options.message || `Mínimo ${minLength} caracteres`
                };
            }
            
            // Validar que no tenga caracteres de control (excepto espacios, tabs y newlines permitidos)
            if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
                return {
                    isValid: false,
                    message: options.message || 'El texto contiene caracteres de control no permitidos'
                };
            }
            
            // Permitir caracteres alfabéticos incluyendo caracteres internacionales (ñ, á, é, í, ó, ú, etc.)
            // y espacios, pero no caracteres especiales peligrosos
            const alphaRegex = /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s]+$/;
            const isValidFormat = alphaRegex.test(value);
            
            return {
                isValid: isValidFormat,
                message: options.message || 'Solo se permiten letras y espacios'
            };
        },
        
        alphanumeric: function(value, options = {}) {
            const allowEmpty = options.allowEmpty !== false; // Por defecto permite vacío
            const isEmpty = !value || value.toString().trim() === '';
            
            // Si está vacío y no se permite, es inválido
            if (isEmpty && !allowEmpty) {
                return {
                    isValid: false,
                    message: options.message || 'Este campo es requerido'
                };
            }
            
            // Si está vacío y se permite, es válido
            if (isEmpty && allowEmpty) {
                return {
                    isValid: true,
                    message: ''
                };
            }
            
            // Validar tipo de dato
            if (typeof value !== 'string') {
                return {
                    isValid: false,
                    message: options.message || 'El valor debe ser un texto'
                };
            }
            
            // Validar longitud máxima
            const maxLength = options.maxLength || 255;
            if (value.length > maxLength) {
                return {
                    isValid: false,
                    message: options.message || `Máximo ${maxLength} caracteres`
                };
            }
            
            // Validar longitud mínima
            const minLength = options.minLength || 1;
            if (value.length < minLength) {
                return {
                    isValid: false,
                    message: options.message || `Mínimo ${minLength} caracteres`
                };
            }
            
            // Validar que no tenga caracteres de control (excepto espacios, tabs y newlines permitidos)
            if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
                return {
                    isValid: false,
                    message: options.message || 'El texto contiene caracteres de control no permitidos'
                };
            }
            
            // Permitir caracteres alfanuméricos incluyendo caracteres internacionales
            const alphanumericRegex = /^[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s]+$/;
            const isValidFormat = alphanumericRegex.test(value);
            
            return {
                isValid: isValidFormat,
                message: options.message || 'Solo se permiten letras, números y espacios'
            };
        },
        
        string: function(value, options = {}) {
            const allowEmpty = options.allowEmpty !== false; // Por defecto permite vacío
            const isEmpty = !value || value.toString().trim() === '';
            
            // Si está vacío y no se permite, es inválido
            if (isEmpty && !allowEmpty) {
                return {
                    isValid: false,
                    message: options.message || 'Este campo es requerido'
                };
            }
            
            // Si está vacío y se permite, es válido
            if (isEmpty && allowEmpty) {
                return {
                    isValid: true,
                    message: ''
                };
            }
            
            // Validar tipo de dato
            if (typeof value !== 'string') {
                return {
                    isValid: false,
                    message: options.message || 'El valor debe ser un texto'
                };
            }
            
            // Validar longitud máxima
            const maxLength = options.maxLength || 1000;
            if (value.length > maxLength) {
                return {
                    isValid: false,
                    message: options.message || `Máximo ${maxLength} caracteres`
                };
            }
            
            // Validar longitud mínima
            const minLength = options.minLength || 1;
            if (value.length < minLength) {
                return {
                    isValid: false,
                    message: options.message || `Mínimo ${minLength} caracteres`
                };
            }
            
            // Validar que no tenga caracteres de control peligrosos
            if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
                return {
                    isValid: false,
                    message: options.message || 'El texto contiene caracteres de control no permitidos'
                };
            }
            
            // Validar patrones peligrosos
            const dangerousPatterns = [
                /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                /javascript:/gi,
                /vbscript:/gi,
                /data:/gi,
                /on\w+\s*=/gi,
                /expression\s*\(/gi,
                /@import/gi,
                /binding\s*\(/gi,
                /<iframe/gi,
                /<object/gi,
                /<embed/gi,
                /<applet/gi,
                /<meta/gi,
                /<link/gi,
                /<style/gi
            ];
            
            for (const pattern of dangerousPatterns) {
                if (pattern.test(value)) {
                    return {
                        isValid: false,
                        message: options.message || 'El texto contiene contenido no permitido'
                    };
                }
            }
            
            // Validar que no tenga secuencias de espacios excesivas
            if (/\s{3,}/.test(value)) {
                return {
                    isValid: false,
                    message: options.message || 'El texto contiene demasiados espacios consecutivos'
                };
            }
            
            // Validar que no tenga líneas excesivamente largas (previene ataques de denegación de servicio)
            const lines = value.split('\n');
            for (const line of lines) {
                if (line.length > 1000) {
                    return {
                        isValid: false,
                        message: options.message || 'Las líneas demasiado largas no están permitidas'
                    };
                }
            }
            
            // Validar número máximo de líneas
            const maxLines = options.maxLines || 100;
            if (lines.length > maxLines) {
                return {
                    isValid: false,
                    message: options.message || `Máximo ${maxLines} líneas permitidas`
                };
            }
            
            return {
                isValid: true,
                message: ''
            };
        },
        
        password: function(value, options = {}) {
            const minLength = options.minLength || 8;
            const requireUppercase = options.requireUppercase !== false;
            const requireLowercase = options.requireLowercase !== false;
            const requireNumbers = options.requireNumbers !== false;
            const requireSpecialChars = options.requireSpecialChars !== false;
            
            let isValid = true;
            let messages = [];
            
            if (value.length < minLength) {
                isValid = false;
                messages.push(`Mínimo ${minLength} caracteres`);
            }
            
            if (requireUppercase && !/[A-Z]/.test(value)) {
                isValid = false;
                messages.push('Debe incluir mayúsculas');
            }
            
            if (requireLowercase && !/[a-z]/.test(value)) {
                isValid = false;
                messages.push('Debe incluir minúsculas');
            }
            
            if (requireNumbers && !/\d/.test(value)) {
                isValid = false;
                messages.push('Debe incluir números');
            }
            
            if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
                isValid = false;
                messages.push('Debe incluir caracteres especiales');
            }
            
            const allowEmpty = options.allowEmpty !== false; // Por defecto permite vacío
            const isEmpty = !value || value.toString().trim() === '';
            
            // Si está vacío y no se permite, es inválido
            if (isEmpty && !allowEmpty) {
                return {
                    isValid: false,
                    message: options.message || 'La contraseña es requerida'
                };
            }
            
            // Si está vacío y se permite, es válido
            if (isEmpty && allowEmpty) {
                return {
                    isValid: true,
                    message: ''
                };
            }
            
            return {
                isValid: isValid,
                message: options.message || messages.join(', ')
            };
        },
        
        confirmPassword: function(value, options = {}) {
            const originalPassword = options.originalPassword;
            return {
                isValid: value === originalPassword,
                message: options.message || 'Las contraseñas no coinciden'
            };
        },
        
        date: function(value, options = {}) {
            const allowEmpty = options.allowEmpty !== false; // Por defecto permite vacío
            const isEmpty = !value || value.toString().trim() === '';
            
            // Si está vacío y no se permite, es inválido
            if (isEmpty && !allowEmpty) {
                return {
                    isValid: false,
                    message: options.message || 'La fecha es requerida'
                };
            }
            
            // Si está vacío y se permite, es válido
            if (isEmpty && allowEmpty) {
                return {
                    isValid: true,
                    message: ''
                };
            }
            
            const date = new Date(value);
            
            // Validar que sea una fecha válida
            if (isNaN(date.getTime())) {
                return {
                    isValid: false,
                    message: options.message || 'Fecha inválida'
                };
            }
            
            // Validar rango de fecha razonable (entre 1900 y 2100)
            const year = date.getFullYear();
            if (year < 1900 || year > 2100) {
                return {
                    isValid: false,
                    message: options.message || 'La fecha debe estar entre 1900 y 2100'
                };
            }
            
            return {
                isValid: true,
                message: ''
            };
        },
        
        minDate: function(value, options = {}) {
            const minDate = new Date(options.minDate);
            const inputDate = new Date(value);
            return {
                isValid: !value || isNaN(inputDate.getTime()) || inputDate >= minDate,
                message: options.message || `La fecha debe ser posterior a ${minDate.toLocaleDateString()}`
            };
        },
        
        maxDate: function(value, options = {}) {
            const maxDate = new Date(options.maxDate);
            const inputDate = new Date(value);
            return {
                isValid: !value || isNaN(inputDate.getTime()) || inputDate <= maxDate,
                message: options.message || `La fecha debe ser anterior a ${maxDate.toLocaleDateString()}`
            };
        },
        
        file: function(value, options = {}) {
            if (!value || !value.files || value.files.length === 0) {
                return { isValid: true };
            }
            
            const file = value.files[0];
            let isValid = true;
            let messages = [];
            
            if (options.maxSize && file.size > options.maxSize) {
                isValid = false;
                messages.push(`El archivo excede el tamaño máximo de ${Justice2Utils.formatFileSize(options.maxSize)}`);
            }
            
            if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
                isValid = false;
                messages.push(`Tipo de archivo no permitido. Tipos permitidos: ${options.allowedTypes.join(', ')}`);
            }
            
            return {
                isValid,
                message: options.message || messages.join(', ')
            };
        },
        
        iban: function(value, options = {}) {
            const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/;
            return {
                isValid: !value || ibanRegex.test(value.replace(/\s/g, '').toUpperCase()),
                message: options.message || 'IBAN inválido'
            };
        },
        
        creditCard: function(value, options = {}) {
            const cardRegex = /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$/;
            const cleanValue = value.replace(/\s/g, '');
            return {
                isValid: !value || cardRegex.test(cleanValue),
                message: options.message || 'Número de tarjeta inválido'
            };
        }
    },
    
    // Formularios registrados
    registeredForms: new Map(),
    
    // Estado de caché
    state: {
        validationCache: null // CacheManager para resultados de validación
    },
    
    // Inicializar sistema
    init: function() {
        this.createValidationStyles();
        this.bindGlobalEvents();
        this.initializeValidationCache();
    },
    
    // Inicializar caché de validación
    initializeValidationCache: function() {
        // Esperar a que CacheManager esté disponible
        const initializeCache = () => {
            if (typeof window !== 'undefined' && window.CacheManager) {
                try {
                    // Crear instancia de caché para validación
                    this.state.validationCache = new window.CacheManager({
                        name: 'justice2-validation-cache',
                        strategy: 'lru',
                        ttl: 15 * 60 * 1000, // 15 minutos por defecto
                        maxSize: 500, // 500 resultados de validación
                        compression: true,
                        metrics: true,
                        cacheLevels: ['memory', 'localStorage']
                    });
                    
                    // Configurar estrategias específicas para validación
                    this.state.validationCache.configureStrategy('field-validation', {
                        ttl: 10 * 60 * 1000, // 10 minutos
                        strategy: 'lru',
                        maxSize: 300,
                        compression: true
                    });
                    
                    this.state.validationCache.configureStrategy('form-validation', {
                        ttl: 5 * 60 * 1000, // 5 minutos
                        strategy: 'lru',
                        maxSize: 100,
                        compression: true
                    });
                    
                    this.state.validationCache.configureStrategy('validation-rules', {
                        ttl: 60 * 60 * 1000, // 1 hora
                        strategy: 'persistent',
                        compression: true
                    });
                    
                    this.state.validationCache.configureStrategy('password-strength', {
                        ttl: 30 * 60 * 1000, // 30 minutos
                        strategy: 'lru',
                        maxSize: 200,
                        compression: false // Los cálculos de fortaleza son rápidos
                    });
                    
                    this.log('Sistema de caché de validación inicializado');
                } catch (error) {
                    console.error('Error inicializando caché de validación:', error);
                }
            } else {
                // Reintentar en 100ms
                setTimeout(initializeCache, 100);
            }
        };
        
        initializeCache();
    },
    
    // Obtener caché para una estrategia específica
    getValidationCacheForStrategy: function(strategy) {
        if (!this.state.validationCache) return null;
        
        try {
            return this.state.validationCache.getCache(strategy);
        } catch (error) {
            this.log('Error obteniendo caché de validación para estrategia:', strategy, error);
            return null;
        }
    },
    
    // Generar clave de caché para validación de campo
    generateFieldCacheKey: function(fieldName, value, rules) {
        // Hash del valor para privacidad y consistencia
        const valueHash = this.hashValue(value);
        const rulesHash = this.hashRules(rules);
        
        return `field-validation:${fieldName}:${valueHash}:${rulesHash}`;
    },
    
    // Generar clave de caché para validación de formulario
    generateFormCacheKey: function(formId, formData) {
        const dataHash = this.hashFormData(formData);
        return `form-validation:${formId}:${dataHash}`;
    },
    
    // Generar clave de caché para fortaleza de contraseña
    generatePasswordStrengthKey: function(password) {
        const passwordHash = this.hashValue(password);
        return `password-strength:${passwordHash}`;
    },
    
    // Hash de valor para caché
    hashValue: function(value) {
        if (typeof value !== 'string') {
            value = String(value);
        }
        
        // Simple hash para demostración (en producción usar algoritmo criptográfico)
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            const char = value.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32-bit integer
        }
        return Math.abs(hash).toString(36);
    },
    
    // Hash de reglas para caché
    hashRules: function(rules) {
        if (!Array.isArray(rules)) return 'empty';
        
        const rulesString = rules.map(rule =>
            `${rule.type}:${JSON.stringify(rule.options || {})}`
        ).sort().join('|');
        
        return this.hashValue(rulesString);
    },
    
    // Hash de datos de formulario para caché
    hashFormData: function(formData) {
        if (!formData || typeof formData !== 'object') return 'empty';
        
        const sortedKeys = Object.keys(formData).sort();
        const dataString = sortedKeys.map(key => `${key}:${formData[key]}`).join('|');
        
        return this.hashValue(dataString);
    },
    
    // Cachear resultado de validación de campo
    cacheFieldValidation: async function(fieldName, value, rules, result) {
        if (!this.state.validationCache) return;
        
        try {
            const cacheKey = this.generateFieldCacheKey(fieldName, value, rules);
            
            await this.state.validationCache.set(cacheKey, result, {
                strategy: 'field-validation',
                ttl: 10 * 60 * 1000, // 10 minutos
                tags: ['validation', 'field', fieldName],
                priority: 3
            });
            
            this.log(`Validación de campo almacenada en caché: ${fieldName}`);
        } catch (error) {
            this.log('Error almacenando validación de campo en caché:', error);
        }
    },
    
    // Obtener validación de campo desde caché
    getCachedFieldValidation: async function(fieldName, value, rules) {
        if (!this.state.validationCache) return null;
        
        try {
            const cacheKey = this.generateFieldCacheKey(fieldName, value, rules);
            const result = await this.state.validationCache.get(cacheKey, 'field-validation');
            
            if (result) {
                this.log(`Validación de campo obtenida desde caché: ${fieldName}`);
                return result;
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo validación de campo desde caché:', error);
            return null;
        }
    },
    
    // Cachear resultado de validación de formulario
    cacheFormValidation: async function(formId, formData, result) {
        if (!this.state.validationCache) return;
        
        try {
            const cacheKey = this.generateFormCacheKey(formId, formData);
            
            await this.state.validationCache.set(cacheKey, result, {
                strategy: 'form-validation',
                ttl: 5 * 60 * 1000, // 5 minutos
                tags: ['validation', 'form', formId],
                priority: 2
            });
            
            this.log(`Validación de formulario almacenada en caché: ${formId}`);
        } catch (error) {
            this.log('Error almacenando validación de formulario en caché:', error);
        }
    },
    
    // Obtener validación de formulario desde caché
    getCachedFormValidation: async function(formId, formData) {
        if (!this.state.validationCache) return null;
        
        try {
            const cacheKey = this.generateFormCacheKey(formId, formData);
            const result = await this.state.validationCache.get(cacheKey, 'form-validation');
            
            if (result) {
                this.log(`Validación de formulario obtenida desde caché: ${formId}`);
                return result;
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo validación de formulario desde caché:', error);
            return null;
        }
    },
    
    // Cachear cálculo de fortaleza de contraseña
    cachePasswordStrength: async function(password, strengthResult) {
        if (!this.state.validationCache) return;
        
        try {
            const cacheKey = this.generatePasswordStrengthKey(password);
            
            await this.state.validationCache.set(cacheKey, strengthResult, {
                strategy: 'password-strength',
                ttl: 30 * 60 * 1000, // 30 minutos
                tags: ['validation', 'password', 'strength'],
                priority: 4
            });
            
            this.log('Fortaleza de contraseña almacenada en caché');
        } catch (error) {
            this.log('Error almacenando fortaleza de contraseña en caché:', error);
        }
    },
    
    // Obtener fortaleza de contraseña desde caché
    getCachedPasswordStrength: async function(password) {
        if (!this.state.validationCache) return null;
        
        try {
            const cacheKey = this.generatePasswordStrengthKey(password);
            const result = await this.state.validationCache.get(cacheKey, 'password-strength');
            
            if (result) {
                this.log('Fortaleza de contraseña obtenida desde caché');
                return result;
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo fortaleza de contraseña desde caché:', error);
            return null;
        }
    },
    
    // Invalidar caché de validación por campo
    invalidateFieldValidationCache: async function(fieldName) {
        if (!this.state.validationCache) return;
        
        try {
            await this.state.validationCache.invalidateByPattern(`field-validation:${fieldName}:`);
            this.log(`Caché de validación de campo invalidada: ${fieldName}`);
        } catch (error) {
            this.log('Error invalidando caché de validación de campo:', error);
        }
    },
    
    // Invalidar caché de validación de formulario
    invalidateFormValidationCache: async function(formId) {
        if (!this.state.validationCache) return;
        
        try {
            await this.state.validationCache.invalidateByPattern(`form-validation:${formId}:`);
            this.log(`Caché de validación de formulario invalidada: ${formId}`);
        } catch (error) {
            this.log('Error invalidando caché de validación de formulario:', error);
        }
    },
    
    // Invalidar caché de fortaleza de contraseña
    invalidatePasswordStrengthCache: async function() {
        if (!this.state.validationCache) return;
        
        try {
            await this.state.validationCache.invalidateByPattern('password-strength:');
            this.log('Caché de fortaleza de contraseña invalidada');
        } catch (error) {
            this.log('Error invalidando caché de fortaleza de contraseña:', error);
        }
    },
    
    // Obtener estadísticas de caché de validación
    getValidationCacheStatistics: function() {
        if (!this.state.validationCache) return null;
        
        try {
            const metrics = this.state.validationCache.getMetrics();
            const health = this.state.validationCache.getHealth();
            
            return {
                metrics,
                health,
                strategies: this.state.validationCache.getStrategies(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.log('Error obteniendo estadísticas de caché de validación:', error);
            return null;
        }
    },
    
    // Crear estilos CSS
    createValidationStyles: function() {
        if (document.getElementById('validation-system-styles')) return;
        
        const styles = `
            .form-group {
                margin-bottom: 1rem;
                position: relative;
            }
            
            .form-control.is-invalid {
                border-color: #dc3545;
                padding-right: calc(1.5em + 0.75rem);
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='%23dc3545'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e");
                background-repeat: no-repeat;
                background-position: right calc(0.375em + 0.1875rem) center;
                background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
            }
            
            .form-control.is-valid {
                border-color: #28a745;
                padding-right: calc(1.5em + 0.75rem);
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath fill='%2328a745' d='M2.3 6.73L.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z'/%3e%3c/svg%3e");
                background-repeat: no-repeat;
                background-position: right calc(0.375em + 0.1875rem) center;
                background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
            }
            
            .invalid-feedback {
                width: 100%;
                margin-top: 0.25rem;
                font-size: 0.875em;
                color: #dc3545;
                display: block;
            }
            
            .valid-feedback {
                width: 100%;
                margin-top: 0.25rem;
                font-size: 0.875em;
                color: #28a745;
                display: block;
            }
            
            .form-control.is-invalid ~ .invalid-feedback {
                display: block;
            }
            
            .form-control.is-valid ~ .valid-feedback {
                display: block;
            }
            
            .validation-tooltip {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #dc3545;
                color: white;
                padding: 0.5rem;
                border-radius: 0.25rem;
                font-size: 0.75rem;
                z-index: 1000;
                margin-top: 0.25rem;
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.3s ease;
                pointer-events: none;
            }
            
            .validation-tooltip.show {
                opacity: 1;
                transform: translateY(0);
            }
            
            .validation-tooltip::before {
                content: '';
                position: absolute;
                top: -5px;
                left: 10px;
                width: 0;
                height: 0;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-bottom: 5px solid #dc3545;
            }
            
            .field-validation-summary {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
                padding: 0.75rem 1.25rem;
                border-radius: 0.25rem;
                margin-bottom: 1rem;
            }
            
            .field-validation-summary ul {
                margin: 0;
                padding-left: 1.25rem;
            }
            
            .field-validation-summary li {
                margin-bottom: 0.25rem;
            }
            
            .field-validation-summary li:last-child {
                margin-bottom: 0;
            }
            
            .password-strength {
                margin-top: 0.5rem;
            }
            
            .password-strength-bar {
                height: 5px;
                background: #e9ecef;
                border-radius: 2.5px;
                overflow: hidden;
                margin-bottom: 0.25rem;
            }
            
            .password-strength-fill {
                height: 100%;
                width: 0%;
                transition: all 0.3s ease;
            }
            
            .password-strength-fill.weak {
                width: 25%;
                background: #dc3545;
            }
            
            .password-strength-fill.fair {
                width: 50%;
                background: #ffc107;
            }
            
            .password-strength-fill.good {
                width: 75%;
                background: #17a2b8;
            }
            
            .password-strength-fill.strong {
                width: 100%;
                background: #28a745;
            }
            
            .password-strength-text {
                font-size: 0.75rem;
                color: #6c757d;
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            
            .form-group.shake {
                animation: shake 0.5s;
            }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.id = 'validation-system-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    },
    
    // Registrar formulario
    registerForm: function(formElement, rules, options = {}) {
        const formId = this.getFormId(formElement);
        const config = {
            validateOnInput: options.validateOnInput || this.config.validateOnInput,
            validateOnBlur: options.validateOnBlur || this.config.validateOnBlur,
            validateOnSubmit: options.validateOnSubmit || this.config.validateOnSubmit,
            showErrors: options.showErrors !== false,
            showErrorSummary: options.showErrorSummary || false,
            onSuccess: options.onSuccess || null,
            onError: options.onError || null,
            ...options
        };
        
        const formInstance = {
            id: formId,
            element: formElement,
            rules: rules,
            config: config,
            isValid: false,
            errors: {},
            validate: () => this.validateForm(formId),
            validateField: (fieldName) => this.validateField(formId, fieldName),
            reset: () => this.resetForm(formId),
            getErrors: () => this.getFormErrors(formId),
            isValid: () => this.isFormValid(formId)
        };
        
        this.registeredForms.set(formId, formInstance);
        this.bindFormEvents(formId);
        
        return formInstance;
    },
    
    // Obtener ID del formulario
    getFormId: function(formElement) {
        if (formElement.id) {
            return formElement.id;
        }
        
        if (formElement.name) {
            return formElement.name;
        }
        
        return 'form_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Bind eventos del formulario
    bindFormEvents: function(formId) {
        const formInstance = this.registeredForms.get(formId);
        if (!formInstance) return;
        
        const form = formInstance.element;
        
        // Evento submit
        if (formInstance.config.validateOnSubmit) {
            form.addEventListener('submit', async (e) => {
                const isValid = await this.validateForm(formId);
                if (!isValid) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (formInstance.config.onError) {
                        formInstance.config.onError(formInstance.errors);
                    }
                } else if (formInstance.config.onSuccess) {
                    formInstance.config.onSuccess();
                }
            });
        }
        
        // Eventos de campos
        Object.keys(formInstance.rules).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (!field) return;
            
            // Validar al salir del campo
            if (formInstance.config.validateOnBlur) {
                field.addEventListener('blur', async () => {
                    await this.validateField(formId, fieldName);
                });
            }
            
            // Validar mientras se escribe
            if (formInstance.config.validateOnInput) {
                field.addEventListener('input', async () => {
                    await this.validateField(formId, fieldName);
                });
            }
        });
    },
    
    // Validar formulario completo
    validateForm: async function(formId) {
        const formInstance = this.registeredForms.get(formId);
        if (!formInstance) return false;
        
        // Obtener datos del formulario para caché
        const formData = this.getFormData(formInstance.element);
        
        // Intentar obtener resultado desde caché
        if (this.state.validationCache) {
            const cachedResult = await this.getCachedFormValidation(formId, formData);
            if (cachedResult !== null) {
                formInstance.isValid = cachedResult.isValid;
                formInstance.errors = cachedResult.errors;
                
                // Actualizar UI basado en caché
                if (!cachedResult.isValid && formInstance.config.showErrorSummary) {
                    this.showErrorSummary(formId, cachedResult.errors);
                } else {
                    this.hideErrorSummary(formId);
                }
                
                // Actualizar estados de campos individuales
                Object.keys(cachedResult.errors).forEach(fieldName => {
                    const field = formInstance.element.querySelector(`[name="${fieldName}"]`);
                    if (field && formInstance.config.showErrors) {
                        this.showFieldErrors(field, cachedResult.errors[fieldName]);
                    }
                });
                
                return cachedResult.isValid;
            }
        }
        
        let isValid = true;
        const errors = {};
        
        // Validar cada campo
        for (const fieldName of Object.keys(formInstance.rules)) {
            const fieldErrors = await this.validateField(formId, fieldName);
            if (fieldErrors.length > 0) {
                isValid = false;
                errors[fieldName] = fieldErrors;
            }
        }
        
        formInstance.isValid = isValid;
        formInstance.errors = errors;
        
        // Almacenar resultado en caché
        if (this.state.validationCache) {
            await this.cacheFormValidation(formId, formData, { isValid, errors });
        }
        
        // Mostrar resumen de errores
        if (!isValid && formInstance.config.showErrorSummary) {
            this.showErrorSummary(formId, errors);
        } else {
            this.hideErrorSummary(formId);
        }
        
        return isValid;
    },
    
    // Validar campo específico
    validateField: async function(formId, fieldName) {
        const formInstance = this.registeredForms.get(formId);
        if (!formInstance) return [];
        
        const form = formInstance.element;
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (!field) return [];
        
        const fieldRules = formInstance.rules[fieldName];
        if (!fieldRules) return [];
        
        let value = this.getFieldValue(field);
        
        // Sanitizar entrada para prevenir XSS
        if (typeof value === 'string') {
            value = sanitizeInput(value);
            // Actualizar el campo con el valor sanitizado
            field.value = value;
        }
        
        // Intentar obtener resultado desde caché
        if (this.state.validationCache) {
            const cachedResult = await this.getCachedFieldValidation(fieldName, value, fieldRules);
            if (cachedResult !== null) {
                // Mostrar/ocultar errores basados en caché
                if (formInstance.config.showErrors) {
                    this.showFieldErrors(field, cachedResult);
                }
                return cachedResult;
            }
        }
        
        const errors = [];
        
        // Ejecutar cada regla de validación
        fieldRules.forEach(rule => {
            const validator = this.validators[rule.type];
            if (!validator) return;
            
            const result = validator(value, rule.options || {});
            if (!result.isValid) {
                errors.push(result.message);
            }
        });
        
        // Almacenar resultado en caché
        if (this.state.validationCache) {
            await this.cacheFieldValidation(fieldName, value, fieldRules, errors);
        }
        
        // Mostrar/ocultar errores
        if (formInstance.config.showErrors) {
            this.showFieldErrors(field, errors);
        }
        
        return errors;
    },
    
    // Obtener valor del campo
    getFieldValue: function(field) {
        if (field.type === 'checkbox') {
            return field.checked;
        }
        
        if (field.type === 'radio') {
            const radioGroup = field.form.querySelectorAll(`[name="${field.name}"]`);
            const checkedRadio = Array.from(radioGroup).find(radio => radio.checked);
            return checkedRadio ? checkedRadio.value : '';
        }
        
        if (field.type === 'file') {
            return field;
        }
        
        return field.value;
    },
    
    // Mostrar errores de campo
    showFieldErrors: function(field, errors) {
        const formGroup = field.closest('.form-group');
        if (!formGroup) return;
        
        // Limpiar estados anteriores
        field.classList.remove(this.config.errorClass, this.config.successClass);
        
        // Eliminar mensajes de error anteriores
        const existingErrors = formGroup.querySelectorAll(`.${this.config.errorClass}`);
        existingErrors.forEach(error => error.remove());
        
        if (errors.length > 0) {
            // Agregar clase de error
            field.classList.add(this.config.errorClass);
            
            // Crear mensaje de error
            const errorElement = document.createElement(this.config.errorElement);
            errorElement.className = this.config.errorClass;
            // Escapar HTML para prevenir XSS en mensajes de error
            errorElement.textContent = errors[0]; // Mostrar solo el primer error
            formGroup.appendChild(errorElement);
            
            // Agregar animación shake
            formGroup.classList.add('shake');
            setTimeout(() => {
                formGroup.classList.remove('shake');
            }, 500);
        } else {
            // Agregar clase de éxito
            field.classList.add(this.config.successClass);
        }
    },
    
    // Mostrar resumen de errores
    showErrorSummary: function(formId, errors) {
        const formInstance = this.registeredForms.get(formId);
        if (!formInstance) return;
        
        const form = formInstance.element;
        
        // Eliminar resumen anterior
        this.hideErrorSummary(formId);
        
        // Crear resumen de errores
        const summary = document.createElement('div');
        summary.className = 'field-validation-summary';
        summary.id = `validation-summary-${formId}`;
        
        const errorList = Object.keys(errors).map(fieldName => {
            const fieldErrors = errors[fieldName];
            // Escapar HTML para prevenir XSS en el resumen de errores
            const escapedFieldName = escapeHTML(fieldName);
            const escapedErrors = fieldErrors.map(error => escapeHTML(error)).join(', ');
            return `<li>${escapedFieldName}: ${escapedErrors}</li>`;
        }).join('');
        
        summary.innerHTML = `
            <strong>Por favor, corrija los siguientes errores:</strong>
            <ul>${errorList}</ul>
        `;
        
        // Insertar al principio del formulario
        form.insertBefore(summary, form.firstChild);
    },
    
    // Ocultar resumen de errores
    hideErrorSummary: function(formId) {
        const summary = document.getElementById(`validation-summary-${formId}`);
        if (summary) {
            summary.remove();
        }
    },
    
    // Resetear formulario
    resetForm: function(formId) {
        const formInstance = this.registeredForms.get(formId);
        if (!formInstance) return;
        
        const form = formInstance.element;
        
        // Resetear formulario
        form.reset();
        
        // Limpiar clases de validación
        form.querySelectorAll(`.${this.config.errorClass}, .${this.config.successClass}`).forEach(field => {
            field.classList.remove(this.config.errorClass, this.config.successClass);
        });
        
        // Eliminar mensajes de error
        form.querySelectorAll(`.${this.config.errorClass}, .${this.config.successClass}`).forEach(error => {
            error.remove();
        });
        
        // Ocultar resumen de errores
        this.hideErrorSummary(formId);
        
        // Resetear estado
        formInstance.isValid = false;
        formInstance.errors = {};
    },
    
    // Obtener errores del formulario
    getFormErrors: function(formId) {
        const formInstance = this.registeredForms.get(formId);
        return formInstance ? formInstance.errors : {};
    },
    
    // Verificar si formulario es válido
    isFormValid: function(formId) {
        const formInstance = this.registeredForms.get(formId);
        return formInstance ? formInstance.isValid : false;
    },
    
    // Agregar validador personalizado
    addValidator: function(name, validatorFunction) {
        this.validators[name] = validatorFunction;
    },
    
    // Validar campo individual
    validateFieldStandalone: function(field, rules, options = {}) {
        const config = {
            showErrors: options.showErrors !== false,
            ...options
        };
        
        const value = this.getFieldValue(field);
        const errors = [];
        
        // Ejecutar cada regla de validación
        rules.forEach(rule => {
            const validator = this.validators[rule.type];
            if (!validator) return;
            
            const result = validator(value, rule.options || {});
            if (!result.isValid) {
                errors.push(result.message);
            }
        });
        
        // Mostrar errores
        if (config.showErrors) {
            this.showFieldErrors(field, errors);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },
    
    // Crear indicador de fortaleza de contraseña
    createPasswordStrengthIndicator: function(passwordField, options = {}) {
        const config = {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            showText: true,
            ...options
        };
        
        const container = passwordField.closest('.form-group');
        if (!container) return;
        
        // Crear indicador de fortaleza
        const strengthIndicator = document.createElement('div');
        strengthIndicator.className = 'password-strength';
        strengthIndicator.innerHTML = `
            <div class="password-strength-bar">
                <div class="password-strength-fill"></div>
            </div>
            ${config.showText ? '<div class="password-strength-text"></div>' : ''}
        `;
        
        container.appendChild(strengthIndicator);
        
        // Actualizar fortaleza al escribir
        passwordField.addEventListener('input', async () => {
            const strength = await this.calculatePasswordStrength(passwordField.value, config);
            this.updatePasswordStrengthIndicator(strengthIndicator, strength);
        });
        
        return strengthIndicator;
    },
    
    // Calcular fortaleza de contraseña
    calculatePasswordStrength: async function(password, config) {
        // Intentar obtener desde caché primero
        if (this.state.validationCache) {
            const cachedResult = await this.getCachedPasswordStrength(password);
            if (cachedResult !== null) {
                return cachedResult;
            }
        }
        
        let score = 0;
        let feedback = [];
        
        // Longitud
        if (password.length >= config.minLength) {
            score += 25;
        } else {
            feedback.push(`Mínimo ${config.minLength} caracteres`);
        }
        
        // Mayúsculas
        if (config.requireUppercase && /[A-Z]/.test(password)) {
            score += 25;
        } else if (config.requireUppercase) {
            feedback.push('Incluir mayúsculas');
        }
        
        // Minúsculas
        if (config.requireLowercase && /[a-z]/.test(password)) {
            score += 25;
        } else if (config.requireLowercase) {
            feedback.push('Incluir minúsculas');
        }
        
        // Números
        if (config.requireNumbers && /\d/.test(password)) {
            score += 25;
        } else if (config.requireNumbers) {
            feedback.push('Incluir números');
        }
        
        // Caracteres especiales
        if (config.requireSpecialChars && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            score += 10;
        } else if (config.requireSpecialChars) {
            feedback.push('Incluir caracteres especiales');
        }
        
        let strength = 'weak';
        let strengthText = 'Débil';
        
        if (score >= 80) {
            strength = 'strong';
            strengthText = 'Fuerte';
        } else if (score >= 60) {
            strength = 'good';
            strengthText = 'Buena';
        } else if (score >= 40) {
            strength = 'fair';
            strengthText = 'Regular';
        }
        
        const result = {
            score,
            strength,
            strengthText,
            feedback
        };
        
        // Almacenar en caché
        if (this.state.validationCache) {
            await this.cachePasswordStrength(password, result);
        }
        
        return result;
    },
    
    // Actualizar indicador de fortaleza
    updatePasswordStrengthIndicator: function(indicator, strength) {
        const fill = indicator.querySelector('.password-strength-fill');
        const text = indicator.querySelector('.password-strength-text');
        
        if (fill) {
            fill.className = `password-strength-fill ${strength.strength}`;
        }
        
        if (text) {
            text.textContent = strength.strengthText;
            if (strength.feedback.length > 0) {
                text.textContent += ` (${strength.feedback.join(', ')})`;
            }
        }
    },
    
    // Bind eventos globales
    bindGlobalEvents: function() {
        // Eventos globales si se necesitan
        
        // Limpiar caché de validación periódicamente
        if (this.state.validationCache) {
            setInterval(() => {
                this.optimizeValidationCache();
            }, 10 * 60 * 1000); // Cada 10 minutos
        }
    },
    
    // Obtener datos de formulario
    getFormData: function(form) {
        const formData = {};
        const elements = form.elements;
        
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            if (element.name && !element.disabled) {
                if (element.type === 'checkbox') {
                    formData[element.name] = element.checked;
                } else if (element.type === 'radio') {
                    if (element.checked) {
                        formData[element.name] = element.value;
                    }
                } else if (element.type === 'select-multiple') {
                    const selectedOptions = Array.from(element.selectedOptions);
                    formData[element.name] = selectedOptions.map(option => option.value);
                } else {
                    formData[element.name] = element.value;
                }
            }
        }
        
        return formData;
    },
    
    // Optimizar caché de validación
    optimizeValidationCache: async function() {
        if (!this.state.validationCache) return;
        
        try {
            await this.state.validationCache.optimize();
            this.log('Caché de validación optimizada automáticamente');
        } catch (error) {
            this.log('Error optimizando caché de validación:', error);
        }
    },
    
    // Limpiar caché de validación
    clearValidationCache: async function() {
        if (!this.state.validationCache) return;
        
        try {
            await this.state.validationCache.clear();
            this.log('Caché de validación limpiada completamente');
        } catch (error) {
            this.log('Error limpiando caché de validación:', error);
        }
    },
    
    // Logging
    log: function(...args) {
        console.log('[Justice2Validation]', ...args);
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    Justice2Validation.init();
});

// Exportar para uso global
window.Justice2Validation = Justice2Validation;