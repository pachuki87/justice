/**
 * Justice 2 Documents Manager
 * Sistema de gestión de documentos con análisis de IA y NetworkErrorHandler integrado
 */

// Importar sistema de manejo robusto de promesas y NetworkErrorHandler
if (typeof window !== 'undefined') {
    // Cargar NetworkErrorHandler primero (dependencia crítica)
    const networkErrorHandlerScript = document.createElement('script');
    networkErrorHandlerScript.src = './components/network-error-handler.js';
    networkErrorHandlerScript.async = true;
    networkErrorHandlerScript.onload = () => {
        console.log('[DocumentsManager] NetworkErrorHandler cargado');
    };
    document.head.appendChild(networkErrorHandlerScript);
}

// Función de sanitización XSS robusta
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
    },
    
    // Crear elemento seguro con atributos sanitizados
    createElementSafe: function(tagName, attributes = {}, textContent = '') {
        const element = document.createElement(tagName);
        
        // Sanitizar atributos
        Object.keys(attributes).forEach(key => {
            if (key === 'href' || key === 'src') {
                element.setAttribute(key, this.sanitizeUrl(attributes[key]));
            } else if (key === 'title' || key === 'alt') {
                element.setAttribute(key, this.escapeHtml(attributes[key]));
            } else if (!key.startsWith('on') && !key.includes('script')) {
                element.setAttribute(key, this.escapeHtml(attributes[key]));
            }
        });
        
        // Añadir texto sanitizado
        if (textContent) {
            element.textContent = textContent;
        }
        
        return element;
    }
};

// Sistema de Validación de Archivos Seguro
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

    // Validar archivo completo
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

            // 4. Validar tipo MIME
            const mimeValidation = await this.validateMimeType(file, extension);
            if (!mimeValidation.isValid) {
                result.isValid = false;
                result.errors.push(mimeValidation.error);
                return result;
            }

            // 5. Validar magic numbers
            const magicValidation = await this.validateMagicNumbers(file, extension);
            if (!magicValidation.isValid) {
                result.isValid = false;
                result.errors.push(magicValidation.error);
                return result;
            }

            // 6. Analizar contenido malicioso
            const contentValidation = await this.analyzeMaliciousContent(file, extension);
            if (!contentValidation.isValid) {
                result.isValid = false;
                result.errors.push(...contentValidation.errors);
                return result;
            }

            // 7. Validaciones adicionales según tipo
            const additionalValidation = await this.performAdditionalValidations(file, extension);
            if (!additionalValidation.isValid) {
                result.isValid = false;
                result.errors.push(...additionalValidation.errors);
            }
            if (additionalValidation.warnings.length > 0) {
                result.warnings.push(...additionalValidation.warnings);
            }

            result.fileInfo.extension = extension;
            result.fileInfo.typeConfig = typeConfig;

        } catch (error) {
            result.isValid = false;
            result.errors.push(`Error durante la validación: ${error.message}`);
        }

        return result;
    },

    // Sanitizar nombre de archivo
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

        // Limitar longitud del nombre
        const maxLength = 255;
        if (sanitizedName.length > maxLength) {
            const extension = this.getFileExtension(sanitizedName);
            const nameWithoutExt = sanitizedName.substring(0, sanitizedName.lastIndexOf('.'));
            const maxNameLength = maxLength - (extension ? extension.length + 1 : 0);
            
            if (nameWithoutExt.length > maxNameLength) {
                sanitizedName = nameWithoutExt.substring(0, maxNameLength) + (extension ? '.' + extension : '');
                result.sanitized = true;
            }
        }

        // Evitar nombres vacíos después de sanitización
        if (!sanitizedName || sanitizedName.trim() === '') {
            result.isValid = false;
            result.errors.push('El nombre del archivo contiene caracteres no permitidos');
            return result;
        }

        // Eliminar espacios consecutivos
        sanitizedName = sanitizedName.replace(/\s+/g, ' ').trim();

        if (sanitizedName !== fileName) {
            result.sanitized = true;
            result.sanitizedName = sanitizedName;
        }

        return result;
    },

    // Obtener extensión de archivo
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

    // Validar tipo MIME
    validateMimeType: async function(file, expectedExtension) {
        const typeConfig = this.allowedTypes[expectedExtension];
        
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const arr = new Uint8Array(e.target.result).subarray(0, 4);
                let header = '';
                
                for (let i = 0; i < arr.length; i++) {
                    header += arr[i].toString(16);
                }

                // Validar MIME type del archivo con verificación más robusta
                if (file.type && !typeConfig.mimeTypes.includes(file.type)) {
                    // Verificar si es un caso de MIME type genérico que podría ser válido
                    const genericMimeTypes = [
                        'application/octet-stream',
                        'application/unknown',
                        'text/plain'
                    ];
                    
                    if (!genericMimeTypes.includes(file.type)) {
                        resolve({
                            isValid: false,
                            error: `Tipo MIME no coincide con la extensión. Esperado: ${typeConfig.mimeTypes.join(', ')}, Recibido: ${file.type}`
                        });
                        return;
                    }
                }
                
                // Validar que el MIME type no sea peligroso
                const dangerousMimeTypes = [
                    'application/javascript',
                    'text/javascript',
                    'application/x-javascript',
                    'text/x-javascript',
                    'application/x-msdownload',
                    'application/x-msdos-program',
                    'application/x-executable',
                    'application/x-sh',
                    'application/x-shellscript',
                    'application/x-python-code',
                    'text/x-python',
                    'application/x-perl',
                    'text/x-perl',
                    'application/x-php',
                    'text/x-php',
                    'application/x-ruby',
                    'text/x-ruby'
                ];
                
                if (file.type && dangerousMimeTypes.includes(file.type)) {
                    resolve({
                        isValid: false,
                        error: `Tipo MIME peligroso detectado: ${file.type}`
                    });
                    return;
                }

                resolve({ isValid: true });
            };

            reader.onerror = function() {
                resolve({
                    isValid: false,
                    error: 'Error al leer el archivo para validar tipo MIME'
                });
            };

            reader.readAsArrayBuffer(file.slice(0, 4));
        });
    },

    // Validar magic numbers
    validateMagicNumbers: async function(file, expectedExtension) {
        const typeConfig = this.allowedTypes[expectedExtension];
        
        // Los archivos de texto no tienen magic numbers específicos
        if (typeConfig.magicNumbers.length === 0) {
            return { isValid: true };
        }

        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const arrayBuffer = e.target.result;
                const bytes = new Uint8Array(arrayBuffer);
                
                let isValid = false;
                
                for (const magicNumber of typeConfig.magicNumbers) {
                    const magicBytes = magicNumber.split('').map(char => char.charCodeAt(0));
                    
                    if (bytes.length >= magicBytes.length) {
                        let matches = true;
                        
                        for (let i = 0; i < magicBytes.length; i++) {
                            if (bytes[i] !== magicBytes[i]) {
                                matches = false;
                                break;
                            }
                        }
                        
                        if (matches) {
                            isValid = true;
                            break;
                        }
                    }
                }

                if (!isValid) {
                    resolve({
                        isValid: false,
                        error: `La firma del archivo no corresponde a un ${typeConfig.description} válido`
                    });
                } else {
                    resolve({ isValid: true });
                }
            };

            reader.onerror = function() {
                resolve({
                    isValid: false,
                    error: 'Error al leer el archivo para validar magic numbers'
                });
            };

            reader.readAsArrayBuffer(file.slice(0, 16));
        });
    },

    // Analizar contenido malicioso
    analyzeMaliciousContent: async function(file, extension) {
        const result = {
            isValid: true,
            errors: []
        };

        // Para archivos de texto, analizar contenido completo
        if (extension === 'txt') {
            return new Promise((resolve) => {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const content = e.target.result;
                    
                    // Validar contenido con patrones mejorados
                    const dangerousPatterns = [
                        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
                        /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
                        /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
                        /javascript:/gi,
                        /vbscript:/gi,
                        /data:text\/html/gi,
                        /data:application\/javascript/gi,
                        /on\w+\s*=/gi,
                        /eval\s*\(/gi,
                        /expression\s*\(/gi,
                        /@import/gi,
                        /binding:/gi,
                        /<link[^>]*>/gi,
                        /<meta[^>]*>/gi,
                        /<style[^>]*>.*?<\/style>/gi,
                        /document\.write/gi,
                        /innerHTML\s*=/gi,
                        /outerHTML\s*=/gi,
                        /setTimeout\s*\(/gi,
                        /setInterval\s*\(/gi,
                        /Function\s*\(/gi,
                        /constructor\s*\(/gi,
                        /__proto__/gi,
                        /prototype\./gi,
                        /import\s+.*\s+from/gi,
                        /require\s*\(/gi
                    ];
                    
                    for (const pattern of dangerousPatterns) {
                        if (pattern.test(content)) {
                            result.isValid = false;
                            result.errors.push('Se detectó contenido potencialmente malicioso en el archivo');
                            
                            // Logging del patrón detectado para análisis
                            console.warn('Patrón peligroso detectado:', pattern.source);
                            break;
                        }
                    }
                    
                    // Validar longitud del contenido para evitar ataques de denegación de servicio
                    if (content.length > 1000000) { // 1MB de texto
                        result.isValid = false;
                        result.errors.push('El archivo de texto es demasiado grande');
                        return resolve(result);
                    }
                    
                    resolve(result);
                };

                reader.onerror = function() {
                    result.isValid = false;
                    result.errors.push('Error al analizar el contenido del archivo');
                    resolve(result);
                };

                reader.readAsText(file);
            });
        }

        // Para otros formatos, analizar primeros bytes en busca de patrones sospechosos
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const arrayBuffer = e.target.result;
                const bytes = new Uint8Array(arrayBuffer);
                const content = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 1024));
                
                // Validar contenido con patrones mejorados para archivos binarios
                const binaryDangerousPatterns = [
                    /<script/gi,
                    /javascript:/gi,
                    /vbscript:/gi,
                    /data:text\/html/gi,
                    /on\w+\s*=/gi,
                    /eval\s*\(/gi,
                    /expression\s*\(/gi,
                    /@import/gi,
                    /binding:/gi
                ];
                
                for (const pattern of binaryDangerousPatterns) {
                    if (pattern.test(content)) {
                        result.isValid = false;
                        result.errors.push('Se detectaron patrones sospechosos en el archivo');
                        
                        // Logging del patrón detectado para análisis
                        console.warn('Patrón peligroso detectado en archivo binario:', pattern.source);
                        break;
                    }
                }
                
                // Validar que no haya secuencias de bytes sospechosas
                const suspiciousBytes = [
                    Buffer.from([0x4D, 0x5A]), // MZ header (executable)
                    Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF header
                    Buffer.from([0xFE, 0xED, 0xFA, 0xCE]) // Mach-O header
                ];
                
                const buffer = Buffer.from(bytes);
                for (const suspicious of suspiciousBytes) {
                    if (buffer.includes(suspicious)) {
                        result.isValid = false;
                        result.errors.push('Se detectaron bytes de ejecutable en el archivo');
                        break;
                    }
                }
                
                resolve(result);
            };

            reader.onerror = function() {
                result.isValid = false;
                result.errors.push('Error al analizar el contenido del archivo');
                resolve(result);
            };

            reader.readAsArrayBuffer(file.slice(0, 1024));
        });
    },

    // Validaciones adicionales según tipo de archivo
    performAdditionalValidations: async function(file, extension) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        try {
            switch (extension) {
                case 'jpg':
                case 'jpeg':
                case 'png':
                    await this.validateImageDimensions(file, result);
                    break;
                case 'pdf':
                    await this.validatePdfStructure(file, result);
                    break;
                case 'docx':
                    await this.validateOfficeDocument(file, result);
                    break;
            }
        } catch (error) {
            result.warnings.push(`No se pudo completar la validación adicional: ${error.message}`);
        }

        return result;
    },

    // Validar dimensiones de imagen
    validateImageDimensions: async function(file, result) {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = function() {
                const maxWidth = 10000;
                const maxHeight = 10000;
                
                if (img.width > maxWidth || img.height > maxHeight) {
                    result.warnings.push(`La imagen tiene dimensiones muy grandes (${img.width}x${img.height})`);
                }
                
                if (img.width <= 0 || img.height <= 0) {
                    result.isValid = false;
                    result.errors.push('La imagen tiene dimensiones inválidas');
                }
                
                resolve();
            };
            
            img.onerror = function() {
                result.isValid = false;
                result.errors.push('No se pudo cargar la imagen para validar dimensiones');
                resolve();
            };
            
            img.src = URL.createObjectURL(file);
        });
    },

    // Validar estructura PDF
    validatePdfStructure: async function(file, result) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const arrayBuffer = e.target.result;
                const view = new DataView(arrayBuffer);
                
                // Verificar firma PDF con múltiples validaciones
                const pdfSignature = 0x25504446; // "%PDF"
                const signature = view.getUint32(0, false);
                
                if (signature !== pdfSignature) {
                    result.isValid = false;
                    result.errors.push('El archivo no tiene una firma PDF válida');
                    resolve();
                    return;
                }
                
                // Validar versión PDF
                const pdfText = new TextDecoder('utf-8').decode(arrayBuffer.slice(0, 1024));
                const pdfVersionMatch = pdfText.match(/%PDF-(\d\.\d)/);
                
                if (!pdfVersionMatch) {
                    result.warnings.push('No se pudo determinar la versión del PDF');
                } else {
                    const version = parseFloat(pdfVersionMatch[1]);
                    if (version > 2.0) {
                        result.warnings.push(`Versión PDF no soportada: ${version}`);
                    }
                    if (version < 1.0) {
                        result.warnings.push(`Versión PDF muy antigua: ${version}`);
                    }
                }
                
                // Validar que no contenga JavaScript incrustado
                if (/\/JavaScript\s*\(/i.test(pdfText) || /\/JS\s*\(/i.test(pdfText)) {
                    result.warnings.push('El PDF contiene JavaScript que podría ser peligroso');
                }
                
                resolve();
            };
            
            reader.onerror = function() {
                result.isValid = false;
                result.errors.push('Error al leer la estructura del PDF');
                resolve();
            };
            
            reader.readAsArrayBuffer(file.slice(0, 1024));
        });
    },

    // Validar documento Office
    validateOfficeDocument: async function(file, result) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const arrayBuffer = e.target.result;
                const view = new DataView(arrayBuffer);
                
                // Verificar firma ZIP (los archivos DOCX son ZIP)
                if (view.getUint32(0, true) !== 0x04034b50) {
                    result.isValid = false;
                    result.errors.push('El archivo no tiene una estructura ZIP válida (requerido para DOCX)');
                    resolve();
                    return;
                }
                
                resolve();
            };
            
            reader.onerror = function() {
                result.isValid = false;
                result.errors.push('Error al leer la estructura del documento Office');
                resolve();
            };
            
            reader.readAsArrayBuffer(file.slice(0, 4));
        });
    },

    // Formatear tamaño de archivo
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

const DocumentsManager = {
    // Configuración
    config: {
        maxFileSize: 10 * 1024 * 1024, // 10MB (sobrescrito por FileSecurityValidator)
        supportedTypes: Object.keys(FileSecurityValidator.allowedTypes),
        itemsPerPage: 12,
        viewMode: 'grid', // grid o list
        autoRefresh: true,
        refreshInterval: 30000, // 30 segundos
        enableSecurityValidation: true,
        quarantineSuspiciousFiles: true,
        enableAdvancedCache: true
    },
    
    // Estado
    state: {
        documents: [],
        filteredDocuments: [],
        currentPage: 1,
        totalPages: 1,
        isLoading: false,
        filters: {
            search: '',
            type: '',
            category: '',
            date: ''
        },
        statistics: {
            total: 0,
            totalSize: 0,
            analyzed: 0
        },
        uploadQueue: [],
        selectedDocument: null,
        documentCache: null // CacheManager para documentos
    },
    
    // Inicialización
    init: function() {
        this.log('Inicializando Gestor de Documentos con NetworkErrorHandler integrado');
        
        // Esperar a que NetworkErrorHandler esté disponible antes de continuar
        const waitForNetworkErrorHandler = () => {
            if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
                // NetworkErrorHandler está disponible, continuar con inicialización
                this.initializeDocumentCache();
                this.loadDocuments();
                this.initEvents();
                this.initDragAndDrop();
                
                // Configurar eventos de NetworkErrorHandler para documentos
                this.setupNetworkErrorHandlerEvents();
                
                // Inicializar actualización automática
                if (this.config.autoRefresh) {
                    this.startAutoRefresh();
                }
                
                this.log('Gestor de Documentos inicializado con NetworkErrorHandler');
            } else {
                // NetworkErrorHandler no está disponible aún, esperar y reintentar
                this.log('Esperando a NetworkErrorHandler para documentos...');
                setTimeout(waitForNetworkErrorHandler, 100);
            }
        };
        
        waitForNetworkErrorHandler();
    },
    
    // Configurar eventos de NetworkErrorHandler para documentos
    setupNetworkErrorHandlerEvents: function() {
        if (typeof window === 'undefined' || !window.NetworkErrorHandler) {
            return;
        }
        
        // Escuchar eventos de conexión relevantes para documentos
        document.addEventListener('connection:restored', (event) => {
            this.log('Conexión restaurada - reanudando operaciones de documentos');
            this.handleConnectionRestored(event.detail);
        });
        
        document.addEventListener('connection:lost', (event) => {
            this.log('Pérdida de conexión - protegiendo operaciones de documentos');
            this.handleConnectionLost(event.detail);
        });
        
        // Escuchar eventos de circuit breaker para documentos
        document.addEventListener('circuit-breaker:tripped', (event) => {
            if (event.detail.endpoint.includes('/documents') || event.detail.endpoint.includes('/files')) {
                this.log(`Circuit breaker activado para servicio de documentos: ${event.detail.endpoint}`);
                this.handleDocumentCircuitBreakerTripped(event.detail);
            }
        });
        
        // Escuchar eventos de error de red para documentos
        document.addEventListener('network:error', (event) => {
            const { errorInfo, context } = event.detail;
            
            if (context.type === 'document') {
                this.log(`Error de red de documentos detectado: ${errorInfo.type}`);
                this.handleDocumentNetworkError(errorInfo, context);
            }
        });
    },
    
    // Manejar restauración de conexión para documentos
    handleConnectionRestored: function(detail) {
        // Reanudar operaciones de documentos pendientes
        this.processPendingDocumentOperations();
        
        // Recargar documentos si es necesario
        if (this.state.documents.length === 0) {
            this.loadDocuments();
        }
        
        // Notificar a otros componentes
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.events) {
            window.Justice2.events.emit('documents:connection-restored', detail);
        }
    },
    
    // Manejar pérdida de conexión para documentos
    handleConnectionLost: function(detail) {
        // Pausar operaciones de documentos no críticas
        this.pauseNonCriticalDocumentOperations();
        
        // Notificar al usuario que las operaciones están en pausa
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(
                'Conexión perdida. Las operaciones de documentos se reanudarán automáticamente.',
                'info'
            );
        }
        
        // Notificar a otros componentes
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.events) {
            window.Justice2.events.emit('documents:connection-lost', detail);
        }
    },
    
    // Manejar activación de circuit breaker para documentos
    handleDocumentCircuitBreakerTripped: function(detail) {
        // Notificar al usuario sobre problemas con el servicio de documentos
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.utils) {
            window.Justice2.utils.showNotification(
                'Servicio de documentos temporalmente no disponible. Las operaciones se reanudarán automáticamente.',
                'warning'
            );
        }
        
        // Notificar a otros componentes
        if (typeof window !== 'undefined' && window.Justice2 && window.Justice2.events) {
            window.Justice2.events.emit('documents:circuit-breaker-tripped', detail);
        }
    },
    
    // Manejar error de red de documentos
    handleDocumentNetworkError: function(errorInfo, context) {
        // Actualizar estado de documentos basado en el error
        if (errorInfo.severity === 'high') {
            this.state.lastError = errorInfo;
        }
        
        // Notificar a otros componentes si es un error crítico
        if (errorInfo.severity === 'high' && typeof window !== 'undefined' && window.Justice2 && window.Justice2.events) {
            window.Justice2.events.emit('documents:critical-error', { errorInfo, context });
        }
    },
    
    // Procesar operaciones de documentos pendientes
    processPendingDocumentOperations: function() {
        // Implementar lógica para procesar operaciones pendientes
        this.log('Procesando operaciones de documentos pendientes');
        
        // Reanudar uploads pendientes
        if (this.state.uploadQueue.length > 0) {
            this.processUploadQueue();
        }
        
        // Recargar documentos si es necesario
        if (this.state.documents.length === 0) {
            this.loadDocuments();
        }
    },
    
    // Pausar operaciones no críticas de documentos
    pauseNonCriticalDocumentOperations: function() {
        // Implementar lógica para pausar operaciones no críticas
        this.log('Pausando operaciones no críticas de documentos');
        
        // Pausar actualización automática
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
        }
    },
    
    // Obtener estadísticas combinadas de documentos y NetworkErrorHandler
    getDocumentStats: function() {
        const documentStats = {
            totalDocuments: this.state.documents.length,
            filteredDocuments: this.state.filteredDocuments.length,
            uploadQueueLength: this.state.uploadQueue.length,
            isLoading: this.state.isLoading,
            lastError: this.state.lastError,
            cacheEnabled: this.config.enableAdvancedCache
        };
        
        // Agregar estadísticas de NetworkErrorHandler si está disponible
        if (typeof window !== 'undefined' && window.NetworkErrorHandler) {
            const networkStats = window.NetworkErrorHandler.getStats();
            return {
                ...documentStats,
                ...networkStats,
                networkHandlerEnabled: true
            };
        }
        
        return {
            ...documentStats,
            networkHandlerEnabled: false
        };
    },
    
    // Inicializar caché de documentos
    initializeDocumentCache: function() {
        if (!this.config.enableAdvancedCache) return;
        
        // Esperar a que CacheManager esté disponible
        const initializeCache = () => {
            if (typeof window !== 'undefined' && window.CacheManager) {
                try {
                    // Crear instancia de caché para documentos
                    this.state.documentCache = new window.CacheManager({
                        name: 'justice2-documents-cache',
                        strategy: 'multi-level',
                        ttl: 10 * 60 * 1000, // 10 minutos por defecto
                        maxSize: 200, // 200 documentos
                        compression: true,
                        metrics: true,
                        cacheLevels: ['memory', 'localStorage', 'indexedDB']
                    });
                    
                    // Configurar estrategias específicas para documentos
                    this.state.documentCache.configureStrategy('document-list', {
                        ttl: 5 * 60 * 1000, // 5 minutos
                        strategy: 'multi-level',
                        compression: true,
                        refreshAhead: true,
                        refreshAheadThreshold: 0.8
                    });
                    
                    this.state.documentCache.configureStrategy('document-metadata', {
                        ttl: 15 * 60 * 1000, // 15 minutos
                        strategy: 'persistent',
                        compression: true
                    });
                    
                    this.state.documentCache.configureStrategy('document-content', {
                        ttl: 30 * 60 * 1000, // 30 minutos
                        strategy: 'multi-level',
                        compression: true,
                        maxSize: 50 // Solo 50 documentos en memoria
                    });
                    
                    this.state.documentCache.configureStrategy('document-analysis', {
                        ttl: 60 * 60 * 1000, // 1 hora
                        strategy: 'persistent',
                        compression: true
                    });
                    
                    this.state.documentCache.configureStrategy('document-search', {
                        ttl: 10 * 60 * 1000, // 10 minutos
                        strategy: 'lru',
                        maxSize: 100,
                        compression: true
                    });
                    
                    // Precargar documentos recientes
                    this.preloadRecentDocuments();
                    
                    this.log('Sistema de caché de documentos inicializado');
                } catch (error) {
                    console.error('Error inicializando caché de documentos:', error);
                }
            } else {
                // Reintentar en 100ms
                setTimeout(initializeCache, 100);
            }
        };
        
        initializeCache();
    },
    
    // Precargar documentos recientes
    preloadRecentDocuments: async function() {
        if (!this.state.documentCache) return;
        
        try {
            // Precargar lista de documentos recientes
            const recentDocsPromise = Justice2API.getDocuments({
                page: 1,
                limit: 20,
                sort: 'recent'
            }).catch(() => null);
            
            // Esperar a que se complete la precarga
            const result = await recentDocsPromise;
            
            if (result && result.data && result.data.documents) {
                const cacheKey = 'document-list:recent';
                await this.state.documentCache.set(cacheKey, result.data, {
                    strategy: 'document-list',
                    tags: ['documents', 'recent', 'list'],
                    priority: 1
                });
                
                this.log('Documentos recientes precargados en caché');
            }
        } catch (error) {
            this.log('Error en precarga de documentos recientes:', error);
        }
    },
    
    // Obtener caché para una estrategia específica
    getDocumentCacheForStrategy: function(strategy) {
        if (!this.state.documentCache) return null;
        
        try {
            return this.state.documentCache.getCache(strategy);
        } catch (error) {
            this.log('Error obteniendo caché de documentos para estrategia:', strategy, error);
            return null;
        }
    },
    
    // Cachear lista de documentos
    cacheDocumentList: async function(filters, documentsData) {
        if (!this.state.documentCache) return;
        
        try {
            const cacheKey = `document-list:${JSON.stringify(filters)}`;
            
            await this.state.documentCache.set(cacheKey, documentsData, {
                strategy: 'document-list',
                ttl: 5 * 60 * 1000, // 5 minutos
                tags: ['documents', 'list'],
                priority: 2
            });
            
            this.log(`Lista de documentos almacenada en caché: ${cacheKey}`);
        } catch (error) {
            this.log('Error almacenando lista de documentos en caché:', error);
        }
    },
    
    // Obtener lista de documentos desde caché
    getCachedDocumentList: async function(filters) {
        if (!this.state.documentCache) return null;
        
        try {
            const cacheKey = `document-list:${JSON.stringify(filters)}`;
            const documentsData = await this.state.documentCache.get(cacheKey, 'document-list');
            
            if (documentsData) {
                this.log(`Lista de documentos obtenida desde caché: ${cacheKey}`);
                return documentsData;
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo lista de documentos desde caché:', error);
            return null;
        }
    },
    
    // Cachear metadatos de documento
    cacheDocumentMetadata: async function(documentId, metadata) {
        if (!this.state.documentCache) return;
        
        try {
            const cacheKey = `document-metadata:${documentId}`;
            
            await this.state.documentCache.set(cacheKey, metadata, {
                strategy: 'document-metadata',
                ttl: 15 * 60 * 1000, // 15 minutos
                tags: ['documents', 'metadata', documentId],
                priority: 3
            });
            
            this.log(`Metadatos de documento almacenados en caché: ${documentId}`);
        } catch (error) {
            this.log('Error almacenando metadatos de documento en caché:', error);
        }
    },
    
    // Obtener metadatos de documento desde caché
    getCachedDocumentMetadata: async function(documentId) {
        if (!this.state.documentCache) return null;
        
        try {
            const cacheKey = `document-metadata:${documentId}`;
            const metadata = await this.state.documentCache.get(cacheKey, 'document-metadata');
            
            if (metadata) {
                this.log(`Metadatos de documento obtenidos desde caché: ${documentId}`);
                return metadata;
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo metadatos de documento desde caché:', error);
            return null;
        }
    },
    
    // Cachear contenido de documento
    cacheDocumentContent: async function(documentId, content) {
        if (!this.state.documentCache) return;
        
        try {
            const cacheKey = `document-content:${documentId}`;
            
            await this.state.documentCache.set(cacheKey, content, {
                strategy: 'document-content',
                ttl: 30 * 60 * 1000, // 30 minutos
                tags: ['documents', 'content', documentId],
                priority: 4
            });
            
            this.log(`Contenido de documento almacenado en caché: ${documentId}`);
        } catch (error) {
            this.log('Error almacenando contenido de documento en caché:', error);
        }
    },
    
    // Obtener contenido de documento desde caché
    getCachedDocumentContent: async function(documentId) {
        if (!this.state.documentCache) return null;
        
        try {
            const cacheKey = `document-content:${documentId}`;
            const content = await this.state.documentCache.get(cacheKey, 'document-content');
            
            if (content) {
                this.log(`Contenido de documento obtenido desde caché: ${documentId}`);
                return content;
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo contenido de documento desde caché:', error);
            return null;
        }
    },
    
    // Cachear análisis de documento
    cacheDocumentAnalysis: async function(documentId, analysis) {
        if (!this.state.documentCache) return;
        
        try {
            const cacheKey = `document-analysis:${documentId}`;
            
            await this.state.documentCache.set(cacheKey, analysis, {
                strategy: 'document-analysis',
                ttl: 60 * 60 * 1000, // 1 hora
                tags: ['documents', 'analysis', documentId],
                priority: 5
            });
            
            this.log(`Análisis de documento almacenado en caché: ${documentId}`);
        } catch (error) {
            this.log('Error almacenando análisis de documento en caché:', error);
        }
    },
    
    // Obtener análisis de documento desde caché
    getCachedDocumentAnalysis: async function(documentId) {
        if (!this.state.documentCache) return null;
        
        try {
            const cacheKey = `document-analysis:${documentId}`;
            const analysis = await this.state.documentCache.get(cacheKey, 'document-analysis');
            
            if (analysis) {
                this.log(`Análisis de documento obtenido desde caché: ${documentId}`);
                return analysis;
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo análisis de documento desde caché:', error);
            return null;
        }
    },
    
    // Cachear resultados de búsqueda
    cacheSearchResults: async function(query, results) {
        if (!this.state.documentCache) return;
        
        try {
            const cacheKey = `document-search:${JSON.stringify(query)}`;
            
            await this.state.documentCache.set(cacheKey, results, {
                strategy: 'document-search',
                ttl: 10 * 60 * 1000, // 10 minutos
                tags: ['documents', 'search'],
                priority: 6
            });
            
            this.log(`Resultados de búsqueda almacenados en caché: ${query}`);
        } catch (error) {
            this.log('Error almacenando resultados de búsqueda en caché:', error);
        }
    },
    
    // Obtener resultados de búsqueda desde caché
    getCachedSearchResults: async function(query) {
        if (!this.state.documentCache) return null;
        
        try {
            const cacheKey = `document-search:${JSON.stringify(query)}`;
            const results = await this.state.documentCache.get(cacheKey, 'document-search');
            
            if (results) {
                this.log(`Resultados de búsqueda obtenidos desde caché: ${query}`);
                return results;
            }
            
            return null;
        } catch (error) {
            this.log('Error obteniendo resultados de búsqueda desde caché:', error);
            return null;
        }
    },
    
    // Invalidar caché de documento específico
    invalidateDocumentCache: async function(documentId) {
        if (!this.state.documentCache) return;
        
        try {
            const patterns = [
                `document-metadata:${documentId}`,
                `document-content:${documentId}`,
                `document-analysis:${documentId}`
            ];
            
            for (const pattern of patterns) {
                await this.state.documentCache.delete(pattern);
            }
            
            // También invalidar listas que puedan contener este documento
            await this.state.documentCache.invalidateByPattern('document-list:');
            
            this.log(`Caché de documento invalidada: ${documentId}`);
        } catch (error) {
            this.log('Error invalidando caché de documento:', error);
        }
    },
    
    // Invalidar toda la caché de documentos
    invalidateAllDocumentCache: async function() {
        if (!this.state.documentCache) return;
        
        try {
            await this.state.documentCache.invalidateByPattern('document-');
            this.log('Toda la caché de documentos ha sido invalidada');
        } catch (error) {
            this.log('Error invalidando toda la caché de documentos:', error);
        }
    },
    
    // Obtener estadísticas de caché de documentos
    getDocumentCacheStatistics: function() {
        if (!this.state.documentCache) return null;
        
        try {
            const metrics = this.state.documentCache.getMetrics();
            const health = this.state.documentCache.getHealth();
            
            return {
                metrics,
                health,
                strategies: this.state.documentCache.getStrategies(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.log('Error obteniendo estadísticas de caché de documentos:', error);
            return null;
        }
    },
    
    // Inicializar eventos
    initEvents: function() {
        // Eventos de upload
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('upload-area');
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        if (uploadArea) {
            uploadArea.addEventListener('click', () => fileInput.click());
        }
        
        // Eventos de filtros
        const searchInput = document.getElementById('search-documents');
        const typeFilter = document.getElementById('filter-type');
        const categoryFilter = document.getElementById('filter-category');
        const dateFilter = document.getElementById('filter-date');
        
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.state.filters.search = searchInput.value;
                this.applyFilters();
            }, 300));
        }
        
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.state.filters.type = typeFilter.value;
                this.applyFilters();
            });
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.state.filters.category = categoryFilter.value;
                this.applyFilters();
            });
        }
        
        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.state.filters.date = dateFilter.value;
                this.applyFilters();
            });
        }
        
        // Eventos de modales
        this.initModalEvents();
    },
    
    // Inicializar eventos de modales
    initModalEvents: function() {
        // Modal de visor de documentos
        const downloadBtn = document.getElementById('download-document');
        const analyzeBtn = document.getElementById('analyze-document');
        const exportAnalysisBtn = document.getElementById('export-analysis');
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadCurrentDocument());
        }
        
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeCurrentDocument());
        }
        
        if (exportAnalysisBtn) {
            exportAnalysisBtn.addEventListener('click', () => this.exportAnalysis());
        }
    },
    
    // Inicializar drag and drop
    initDragAndDrop: function() {
        const uploadArea = document.getElementById('upload-area');
        if (!uploadArea) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFileSelect({ target: { files } });
        }, false);
    },
    
    preventDefaults: function(e) {
        e.preventDefault();
        e.stopPropagation();
    },
    
    // Cargar documentos
    loadDocuments: async function() {
        this.state.isLoading = true;
        this.showLoading();
        
        try {
            // Intentar obtener desde caché primero
            if (this.config.enableAdvancedCache) {
                const cachedData = await this.getCachedDocumentList({
                    page: this.state.currentPage,
                    limit: this.config.itemsPerPage,
                    ...this.state.filters
                });
                
                if (cachedData) {
                    this.state.documents = cachedData.documents || [];
                    this.state.totalPages = cachedData.total_pages || 1;
                    this.state.statistics = cachedData.statistics || this.getMockStatistics();
                    
                    this.applyFilters();
                    this.updateStatistics();
                    
                    this.state.isLoading = false;
                    this.hideLoading();
                    
                    this.log('Documentos cargados desde caché');
                    return;
                }
            }
            
            const response = await Justice2API.getDocuments({
                page: this.state.currentPage,
                limit: this.config.itemsPerPage,
                ...this.state.filters
            });
            
            this.state.documents = response.data.documents || [];
            this.state.totalPages = response.data.total_pages || 1;
            this.state.statistics = response.data.statistics || this.getMockStatistics();
            
            // Almacenar en caché
            if (this.config.enableAdvancedCache) {
                await this.cacheDocumentList({
                    page: this.state.currentPage,
                    limit: this.config.itemsPerPage,
                    ...this.state.filters
                }, response.data);
            }
            
            this.applyFilters();
            this.updateStatistics();
            
        } catch (error) {
            this.log('Error cargando documentos:', error);
            // Usar datos mock para demostración
            this.loadMockDocuments();
        } finally {
            this.state.isLoading = false;
            this.hideLoading();
        }
    },
    
    // Cargar documentos mock para demostración
    loadMockDocuments: function() {
        const mockDocuments = [
            {
                id: 1,
                title: 'Demanda Laboral - Juan Pérez',
                type: 'pdf',
                category: 'legal',
                size: 2621440, // 2.5 MB
                created_at: '2024-01-15T10:30:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                analyzed: true,
                status: 'analyzed',
                thumbnail: null,
                url: '#'
            },
            {
                id: 2,
                title: 'Contrato de Arrendamiento',
                type: 'docx',
                category: 'contract',
                size: 1258291, // 1.2 MB
                created_at: '2024-01-14T15:45:00Z',
                updated_at: '2024-01-14T15:45:00Z',
                analyzed: false,
                status: 'pending',
                thumbnail: null,
                url: '#'
            },
            {
                id: 3,
                title: 'Escritura de Propiedad',
                type: 'pdf',
                category: 'administrative',
                size: 3984589, // 3.8 MB
                created_at: '2024-01-13T09:20:00Z',
                updated_at: '2024-01-13T09:20:00Z',
                analyzed: true,
                status: 'analyzed',
                thumbnail: null,
                url: '#'
            },
            {
                id: 4,
                title: 'Fotografías Evidencia',
                type: 'jpg',
                category: 'evidence',
                size: 524288, // 512 KB
                created_at: '2024-01-12T14:15:00Z',
                updated_at: '2024-01-12T14:15:00Z',
                analyzed: false,
                status: 'pending',
                thumbnail: null,
                url: '#'
            },
            {
                id: 5,
                title: 'Acta de Conciliación',
                type: 'pdf',
                category: 'court',
                size: 891289, // 870 KB
                created_at: '2024-01-11T11:30:00Z',
                updated_at: '2024-01-11T11:30:00Z',
                analyzed: true,
                status: 'analyzed',
                thumbnail: null,
                url: '#'
            }
        ];
        
        this.state.documents = mockDocuments;
        this.state.totalPages = Math.ceil(mockDocuments.length / this.config.itemsPerPage);
        this.state.statistics = this.getMockStatistics();
        
        this.applyFilters();
        this.updateStatistics();
    },
    
    // Obtener estadísticas mock
    getMockStatistics: function() {
        return {
            total: this.state.documents.length,
            totalSize: this.state.documents.reduce((sum, doc) => sum + doc.size, 0),
            analyzed: this.state.documents.filter(doc => doc.analyzed).length
        };
    },
    
    // Sistema de cuarentena
    quarantine: {
        files: [],
        
        addFile: function(file, validationResult) {
            const quarantineItem = {
                id: Justice2.utils.generateId(),
                originalFile: file,
                validationResult: validationResult,
                timestamp: new Date().toISOString(),
                status: 'quarantined',
                reviewed: false
            };
            
            this.files.push(quarantineItem);
            
            // Registrar evento de seguridad
            this.logSecurityEvent(quarantineItem);
            
            return quarantineItem;
        },
        
        removeFile: function(quarantineId) {
            const index = this.files.findIndex(item => item.id === quarantineId);
            if (index !== -1) {
                this.files.splice(index, 1);
            }
        },
        
        getQuarantinedFiles: function() {
            return this.files.filter(item => item.status === 'quarantined');
        },
        
        logSecurityEvent: function(quarantineItem) {
            const securityEvent = {
                type: 'FILE_QUARANTINE',
                timestamp: quarantineItem.timestamp,
                fileName: quarantineItem.originalFile.name,
                fileSize: quarantineItem.originalFile.size,
                fileType: quarantineItem.originalFile.type,
                validationErrors: quarantineItem.validationResult.errors,
                validationWarnings: quarantineItem.validationResult.warnings,
                userAgent: navigator.userAgent,
                ip: 'client' // En producción, esto debería venir del servidor
            };
            
            // Enviar evento de seguridad al servidor
            this.sendSecurityEvent(securityEvent);
        },
        
        sendSecurityEvent: function(event) {
            // Enviar al servidor para registro y análisis
            if (Justice2API && Justice2API.logSecurityEvent) {
                Justice2API.logSecurityEvent(event).catch(error => {
                    console.error('Error registrando evento de seguridad:', error);
                });
            }
            
            // También registrar localmente para análisis
            console.warn('EVENTO DE SEGURIDAD - ARCHIVO EN CUARENTENA:', event);
        }
    },

    // Manejar selección de archivos
    handleFileSelect: async function(event) {
        const files = Array.from(event.target.files);
        
        if (files.length === 0) return;
        
        // Mostrar indicador de procesamiento
        this.showValidationProgress(files.length);
        
        // Validar cada archivo con el sistema de seguridad
        const validationResults = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            this.updateValidationProgress(i + 1, files.length, file.name);
            
            try {
                const validationResult = await FileSecurityValidator.validateFile(file);
                validationResults.push({ file, validationResult });
            } catch (error) {
                validationResults.push({
                    file,
                    validationResult: {
                        isValid: false,
                        errors: [`Error durante la validación: ${error.message}`],
                        warnings: []
                    }
                });
            }
        }
        
        // Procesar resultados de validación
        const validFiles = [];
        const quarantinedFiles = [];
        
        validationResults.forEach(({ file, validationResult }) => {
            const safeFileName = XSSProtection.escapeHtml(file.name || '');
            
            if (validationResult.isValid) {
                // Archivo válido - agregar a cola de upload
                if (validationResult.warnings.length > 0) {
                    Justice2.utils.showNotification(
                        `${safeFileName} pasó la validación con advertencias: ${validationResult.warnings.join(', ')}`,
                        'warning'
                    );
                }
                
                validFiles.push({
                    file: validationResult.fileInfo.sanitizedName ?
                          new File([file], validationResult.fileInfo.sanitizedName, { type: file.type }) :
                          file,
                    validationResult
                });
            } else {
                // Archivo inválido - poner en cuarentena o rechazar
                if (this.config.quarantineSuspiciousFiles) {
                    const quarantineItem = this.quarantine.addFile(file, validationResult);
                    quarantinedFiles.push({ file, quarantineItem, validationResult });
                    
                    Justice2.utils.showNotification(
                        `${safeFileName} fue puesto en cuarentena por razones de seguridad: ${validationResult.errors.join(', ')}`,
                        'error'
                    );
                } else {
                    Justice2.utils.showNotification(
                        `${safeFileName} fue rechazado: ${validationResult.errors.join(', ')}`,
                        'error'
                    );
                }
            }
        });
        
        // Ocultar indicador de progreso
        this.hideValidationProgress();
        
        // Agregar archivos válidos a cola de upload
        validFiles.forEach(({ file, validationResult }) => {
            this.state.uploadQueue.push({
                file,
                id: Justice2.utils.generateId(),
                progress: 0,
                status: 'pending',
                validationResult
            });
        });
        
        // Iniciar upload si hay archivos válidos
        if (validFiles.length > 0) {
            this.processUploadQueue();
        }
        
        // Mostrar resumen
        if (validFiles.length > 0 || quarantinedFiles.length > 0) {
            this.showValidationSummary(validFiles.length, quarantinedFiles.length);
        }
    },

    // Mostrar progreso de validación
    showValidationProgress: function(totalFiles) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'validation-progress';
        progressContainer.id = 'validation-progress-container';
        
        const title = document.createElement('div');
        title.className = 'validation-title';
        title.textContent = `Validando ${totalFiles} archivo(s)...`;
        
        const progressBar = document.createElement('div');
        progressBar.className = 'validation-progress-bar';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'validation-progress-fill';
        progressFill.style.width = '0%';
        
        const progressText = document.createElement('div');
        progressText.className = 'validation-progress-text';
        progressText.textContent = '0%';
        
        progressBar.appendChild(progressFill);
        progressContainer.appendChild(title);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);
        
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.insertAdjacentElement('afterend', progressContainer);
        }
    },

    // Actualizar progreso de validación
    updateValidationProgress: function(current, total, fileName) {
        const progressContainer = document.getElementById('validation-progress-container');
        if (!progressContainer) return;
        
        const percentage = Math.round((current / total) * 100);
        const progressFill = progressContainer.querySelector('.validation-progress-fill');
        const progressText = progressContainer.querySelector('.validation-progress-text');
        const title = progressContainer.querySelector('.validation-title');
        
        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `${percentage}%`;
        if (title) title.textContent = `Validando ${XSSProtection.escapeHtml(fileName)} (${current}/${total})...`;
    },

    // Ocultar progreso de validación
    hideValidationProgress: function() {
        const progressContainer = document.getElementById('validation-progress-container');
        if (progressContainer) {
            progressContainer.remove();
        }
    },

    // Mostrar resumen de validación
    showValidationSummary: function(validCount, quarantinedCount) {
        let message = `Validación completada: ${validCount} archivo(s) válido(s)`;
        if (quarantinedCount > 0) {
            message += `, ${quarantinedCount} archivo(s) en cuarentena`;
        }
        
        const type = quarantinedCount > 0 ? 'warning' : 'success';
        Justice2.utils.showNotification(message, type);
    },
    
    // Procesar cola de upload
    processUploadQueue: async function() {
        if (this.state.uploadQueue.length === 0) return;
        
        const uploadItem = this.state.uploadQueue.find(item => item.status === 'pending');
        if (!uploadItem) return;
        
        uploadItem.status = 'uploading';
        this.showUploadProgress();
        
        try {
            // Simular upload
            await this.simulateUpload(uploadItem);
            
            // Subir a API
            const response = await Justice2API.uploadDocument(uploadItem.file, {
                category: this.state.filters.category || 'general'
            });
            
            // Agregar a lista de documentos
            const newDocument = {
                ...response.data,
                type: uploadItem.file.name.split('.').pop().toLowerCase(),
                size: uploadItem.file.size,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                analyzed: false,
                status: 'pending'
            };
            
            this.state.documents.unshift(newDocument);
            this.applyFilters();
            this.updateStatistics();
            
            // Remover de cola
            const index = this.state.uploadQueue.indexOf(uploadItem);
            this.state.uploadQueue.splice(index, 1);
            
            const safeFileName = XSSProtection.escapeHtml(uploadItem.file.name || '');
            Justice2.utils.showNotification(
                `Documento ${safeFileName} subido correctamente`,
                'success'
            );
            
            // Procesar siguiente
            this.processUploadQueue();
            
        } catch (error) {
            this.log('Error subiendo archivo:', error);
            uploadItem.status = 'error';
            const safeFileName = XSSProtection.escapeHtml(uploadItem.file.name || '');
            Justice2.utils.showNotification(
                `Error subiendo ${safeFileName}`,
                'error'
            );
        }
        
        this.updateUploadProgress();
    },
    
    // Simular upload para demostración
    simulateUpload: function(uploadItem) {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                uploadItem.progress += Math.random() * 20;
                
                if (uploadItem.progress >= 100) {
                    uploadItem.progress = 100;
                    clearInterval(interval);
                    resolve();
                }
                
                this.updateUploadProgress();
            }, 200);
        });
    },
    
    // Mostrar progreso de upload
    showUploadProgress: function() {
        // Crear contenedor de progreso de forma segura
        const progressContainer = document.createElement('div');
        progressContainer.className = 'upload-progress';
        
        this.state.uploadQueue.forEach(item => {
            if (item.status === 'uploading') {
                const safeFileName = XSSProtection.escapeHtml(item.file.name || '');
                
                const progressItem = document.createElement('div');
                progressItem.className = 'progress-item';
                
                const fileNameSpan = document.createElement('span');
                fileNameSpan.className = 'progress-filename';
                fileNameSpan.textContent = safeFileName;
                
                const progressBarContainer = document.createElement('div');
                progressBarContainer.className = 'progress-bar-container';
                
                const progressBarFill = document.createElement('div');
                progressBarFill.className = 'progress-bar-fill';
                progressBarFill.style.width = `${item.progress}%`;
                
                const progressPercentage = document.createElement('span');
                progressPercentage.className = 'progress-percentage';
                progressPercentage.textContent = `${Math.round(item.progress)}%`;
                
                progressBarContainer.appendChild(progressBarFill);
                
                progressItem.appendChild(fileNameSpan);
                progressItem.appendChild(progressBarContainer);
                progressItem.appendChild(progressPercentage);
                
                progressContainer.appendChild(progressItem);
            }
        });
        
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.insertAdjacentElement('afterend', progressContainer);
        }
    },
    
    // Actualizar progreso de upload
    updateUploadProgress: function() {
        const progressItems = document.querySelectorAll('.progress-item');
        
        this.state.uploadQueue.forEach((item, index) => {
            if (progressItems[index]) {
                const progressBar = progressItems[index].querySelector('.progress-bar-fill');
                const progressText = progressItems[index].querySelector('.progress-percentage');
                
                if (progressBar) {
                    progressBar.style.width = `${item.progress}%`;
                }
                
                if (progressText) {
                    progressText.textContent = `${Math.round(item.progress)}%`;
                }
            }
        });
        
        // Limpiar uploads completados
        const completedUploads = this.state.uploadQueue.filter(item => item.progress >= 100);
        if (completedUploads.length > 0) {
            setTimeout(() => {
                const progressContainer = document.querySelector('.upload-progress');
                if (progressContainer) {
                    progressContainer.remove();
                }
            }, 2000);
        }
    },
    
    // Aplicar filtros
    applyFilters: async function() {
        let filtered = [...this.state.documents];
        
        // Filtro de búsqueda con caché
        if (this.state.filters.search && this.config.enableAdvancedCache) {
            const searchQuery = {
                query: this.state.filters.search,
                type: this.state.filters.type,
                category: this.state.filters.category
            };
            
            // Intentar obtener resultados de búsqueda desde caché
            const cachedResults = await this.getCachedSearchResults(searchQuery);
            
            if (cachedResults) {
                filtered = cachedResults;
                this.log('Resultados de búsqueda obtenidos desde caché');
            } else {
                // Realizar búsqueda local
                const search = this.state.filters.search.toLowerCase();
                filtered = filtered.filter(doc =>
                    doc.title.toLowerCase().includes(search) ||
                    (doc.description && doc.description.toLowerCase().includes(search))
                );
                
                // Almacenar resultados en caché
                await this.cacheSearchResults(searchQuery, filtered);
            }
        } else if (this.state.filters.search) {
            // Búsqueda local sin caché
            const search = this.state.filters.search.toLowerCase();
            filtered = filtered.filter(doc =>
                doc.title.toLowerCase().includes(search) ||
                (doc.description && doc.description.toLowerCase().includes(search))
            );
        }
        
        // Filtro de tipo
        if (this.state.filters.type) {
            filtered = filtered.filter(doc => doc.type === this.state.filters.type);
        }
        
        // Filtro de categoría
        if (this.state.filters.category) {
            filtered = filtered.filter(doc => doc.category === this.state.filters.category);
        }
        
        // Filtro de fecha
        if (this.state.filters.date) {
            const filterDate = new Date(this.state.filters.date);
            filtered = filtered.filter(doc => {
                const docDate = new Date(doc.created_at);
                return docDate >= filterDate;
            });
        }
        
        this.state.filteredDocuments = filtered;
        this.state.totalPages = Math.ceil(filtered.length / this.config.itemsPerPage);
        this.state.currentPage = 1;
        
        this.renderDocuments();
        this.renderPagination();
    },
    
    // Renderizar documentos
    renderDocuments: function() {
        const container = document.getElementById('documents-container');
        if (!container) return;
        
        if (this.state.filteredDocuments.length === 0) {
            // Crear estado vacío de forma segura
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            
            const icon = document.createElement('i');
            icon.className = 'fas fa-folder-open';
            
            const title = document.createElement('h5');
            title.textContent = 'No se encontraron documentos';
            
            const paragraph = document.createElement('p');
            paragraph.textContent = 'Intente ajustar los filtros o suba nuevos documentos';
            
            emptyState.appendChild(icon);
            emptyState.appendChild(title);
            emptyState.appendChild(paragraph);
            
            container.appendChild(emptyState);
            return;
        }
        
        const startIndex = (this.state.currentPage - 1) * this.config.itemsPerPage;
        const endIndex = startIndex + this.config.itemsPerPage;
        const pageDocuments = this.state.filteredDocuments.slice(startIndex, endIndex);
        
        let html = '';
        
        if (this.config.viewMode === 'grid') {
            html = '<div class="documents-grid">';
            pageDocuments.forEach(doc => {
                html += this.renderDocumentCard(doc);
            });
            html += '</div>';
        } else {
            html = '<div class="documents-list">';
            pageDocuments.forEach(doc => {
                html += this.renderDocumentListItem(doc);
            });
            html += '</div>';
        }
        
        container.innerHTML = html;
    },
    
    // Renderizar tarjeta de documento
    renderDocumentCard: function(doc) {
        const icon = this.getDocumentIcon(doc.type);
        const statusClass = this.getStatusClass(doc.status);
        const fileSize = this.formatFileSize(doc.size);
        
        // Sanitizar datos del documento
        const safeTitle = XSSProtection.escapeHtml(doc.title || '');
        const safeThumbnail = XSSProtection.sanitizeUrl(doc.thumbnail || '');
        const safeType = XSSProtection.escapeHtml((doc.type || '').toUpperCase());
        
        return `
            <div class="document-card" onclick="DocumentsManager.viewDocument(${doc.id})">
                <div class="document-thumbnail">
                    ${safeThumbnail ? `<img src="${safeThumbnail}" alt="${safeTitle}">` : `<i class="${icon}"></i>`}
                    <div class="document-status ${statusClass}"></div>
                </div>
                <div class="document-info">
                    <div class="document-title" title="${safeTitle}">${safeTitle}</div>
                    <div class="document-meta">
                        <span class="document-type">${safeType}</span>
                        <span class="document-size">${fileSize}</span>
                    </div>
                    <div class="document-actions">
                        <button class="document-action-btn view" onclick="event.stopPropagation(); DocumentsManager.viewDocument(${doc.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="document-action-btn download" onclick="event.stopPropagation(); DocumentsManager.downloadDocument(${doc.id})">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="document-action-btn analyze" onclick="event.stopPropagation(); DocumentsManager.analyzeDocument(${doc.id})">
                            <i class="fas fa-brain"></i>
                        </button>
                        <button class="document-action-btn delete" onclick="event.stopPropagation(); DocumentsManager.deleteDocument(${doc.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Renderizar item de lista de documento
    renderDocumentListItem: function(doc) {
        const icon = this.getDocumentIcon(doc.type);
        const statusClass = this.getStatusClass(doc.status);
        const fileSize = this.formatFileSize(doc.size);
        
        // Sanitizar datos del documento
        const safeTitle = XSSProtection.escapeHtml(doc.title || '');
        const safeType = XSSProtection.escapeHtml((doc.type || '').toUpperCase());
        
        return `
            <div class="document-list-item" onclick="DocumentsManager.viewDocument(${doc.id})">
                <div class="document-list-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="document-list-info">
                    <div class="document-list-title" title="${safeTitle}">${safeTitle}</div>
                    <div class="document-list-meta">
                        <span class="document-type">${safeType}</span>
                        <span>${fileSize}</span>
                        <span>${Justice2.utils.formatDate(doc.created_at)}</span>
                    </div>
                </div>
                <div class="document-list-actions">
                    <button class="document-action-btn view" onclick="event.stopPropagation(); DocumentsManager.viewDocument(${doc.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="document-action-btn download" onclick="event.stopPropagation(); DocumentsManager.downloadDocument(${doc.id})">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="document-action-btn analyze" onclick="event.stopPropagation(); DocumentsManager.analyzeDocument(${doc.id})">
                        <i class="fas fa-brain"></i>
                    </button>
                    <button class="document-action-btn delete" onclick="event.stopPropagation(); DocumentsManager.deleteDocument(${doc.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    },
    
    // Renderizar paginación
    renderPagination: function() {
        const container = document.getElementById('documents-pagination');
        if (!container) return;
        
        if (this.state.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Previous
        html += `
            <li class="page-item ${this.state.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="DocumentsManager.goToPage(${this.state.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, this.state.currentPage - 2);
        const endPage = Math.min(this.state.totalPages, this.state.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.state.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="DocumentsManager.goToPage(${i})">${i}</a>
                </li>
            `;
        }
        
        // Next
        html += `
            <li class="page-item ${this.state.currentPage === this.state.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="DocumentsManager.goToPage(${this.state.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        container.innerHTML = html;
    },
    
    // Ver documento
    viewDocument: function(documentId) {
        const document = this.state.documents.find(doc => doc.id === documentId);
        if (!document) return;
        
        this.state.selectedDocument = document;
        
        const modal = new bootstrap.Modal(document.getElementById('documentViewerModal'));
        const titleElement = document.getElementById('document-viewer-title');
        const contentElement = document.getElementById('document-viewer-content');
        
        if (titleElement) {
            titleElement.textContent = XSSProtection.escapeHtml(document.title || '');
        }
        
        if (contentElement) {
            // Sanitizar datos del documento
            const safeUrl = XSSProtection.sanitizeUrl(document.url || '#');
            const safeTitle = XSSProtection.escapeHtml(document.title || '');
            
            // Limpiar contenido existente de forma segura
            while (contentElement.firstChild) {
                contentElement.removeChild(contentElement.firstChild);
            }
            
            if (document.type === 'pdf') {
                const viewerDiv = document.createElement('div');
                viewerDiv.className = 'document-viewer';
                
                const iframe = document.createElement('iframe');
                iframe.src = safeUrl;
                iframe.title = safeTitle;
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
                
                viewerDiv.appendChild(iframe);
                contentElement.appendChild(viewerDiv);
            } else if (['jpg', 'jpeg', 'png'].includes(document.type)) {
                const viewerDiv = document.createElement('div');
                viewerDiv.className = 'document-viewer';
                
                const img = document.createElement('img');
                img.src = safeUrl;
                img.alt = safeTitle;
                
                viewerDiv.appendChild(img);
                contentElement.appendChild(viewerDiv);
            } else if (document.type === 'txt') {
                const textDiv = document.createElement('div');
                textDiv.className = 'document-viewer-text';
                textDiv.textContent = 'Cargando contenido del documento...';
                contentElement.appendChild(textDiv);
                this.loadTextDocument(document);
            } else {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'text-center py-5';
                
                const icon = document.createElement('i');
                icon.className = 'fas fa-file fa-3x text-muted mb-3';
                
                const paragraph = document.createElement('p');
                paragraph.textContent = 'Este tipo de archivo no puede ser visualizado directamente';
                
                const button = document.createElement('button');
                button.className = 'btn btn-primary';
                button.onclick = () => this.downloadDocument(document.id);
                
                const buttonIcon = document.createElement('i');
                buttonIcon.className = 'fas fa-download mr-2';
                
                const buttonText = document.createTextNode('Descargar');
                
                button.appendChild(buttonIcon);
                button.appendChild(buttonText);
                
                messageDiv.appendChild(icon);
                messageDiv.appendChild(paragraph);
                messageDiv.appendChild(button);
                contentElement.appendChild(messageDiv);
            }
        }
        
        modal.show();
    },
    
    // Cargar documento de texto
    loadTextDocument: async function(document) {
        try {
            const response = await fetch(document.url);
            const text = await response.text();
            
            // Almacenar en caché
            if (this.config.enableAdvancedCache) {
                await this.cacheDocumentContent(document.id, text);
            }
            
            const contentElement = document.getElementById('document-viewer-content');
            if (contentElement) {
                const textDiv = contentElement.querySelector('.document-viewer-text');
                if (textDiv) {
                    textDiv.textContent = text;
                }
            }
        } catch (error) {
            this.log('Error cargando documento de texto:', error);
        }
    },
    
    // Descargar documento
    downloadDocument: function(documentId) {
        const document = this.state.documents.find(doc => doc.id === documentId);
        if (!document) return;
        
        Justice2API.downloadDocument(documentId)
            .then(response => {
                const blob = new Blob([response.data]);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = XSSProtection.escapeHtml(document.title || '');
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                Justice2.utils.showNotification('Documento descargado correctamente', 'success');
            })
            .catch(error => {
                this.log('Error descargando documento:', error);
                Justice2.utils.showNotification('Error al descargar documento', 'error');
            });
    },
    
    // Analizar documento
    analyzeDocument: async function(documentId) {
        let document = this.state.documents.find(doc => doc.id === documentId);
        
        // Intentar obtener metadatos desde caché si no se encuentra en estado local
        if (!document && this.config.enableAdvancedCache) {
            document = await this.getCachedDocumentMetadata(documentId);
        }
        
        if (!document) return;
        
        // Verificar si ya hay análisis en caché
        if (this.config.enableAdvancedCache) {
            const cachedAnalysis = await this.getCachedDocumentAnalysis(documentId);
            if (cachedAnalysis) {
                this.showAnalysisResults(cachedAnalysis);
                Justice2.utils.showNotification('Análisis obtenido desde caché', 'info');
                
                // Actualizar estado del documento
                document.analyzed = true;
                document.status = 'analyzed';
                this.renderDocuments();
                this.updateStatistics();
                
                return;
            }
        }
        
        // Mostrar loading
        Justice2.utils.showNotification('Iniciando análisis con IA...', 'info');
        
        try {
            const response = await Justice2API.analyzeDocument(documentId);
            
            // Almacenar análisis en caché
            if (this.config.enableAdvancedCache) {
                await this.cacheDocumentAnalysis(documentId, response.data);
            }
            
            this.showAnalysisResults(response.data);
            Justice2.utils.showNotification('Análisis completado', 'success');
            
            // Actualizar estado del documento
            document.analyzed = true;
            document.status = 'analyzed';
            
            // Actualizar metadatos en caché
            if (this.config.enableAdvancedCache) {
                await this.cacheDocumentMetadata(documentId, document);
            }
            
            this.renderDocuments();
            this.updateStatistics();
        } catch (error) {
            this.log('Error analizando documento:', error);
            Justice2.utils.showNotification('Error en análisis del documento', 'error');
        }
    },
    
    // Mostrar resultados de análisis
    showAnalysisResults: function(analysis) {
        const modal = new bootstrap.Modal(document.getElementById('documentAnalysisModal'));
        const contentElement = document.getElementById('analysis-content');
        
        if (contentElement) {
            // Limpiar contenido existente de forma segura
            while (contentElement.firstChild) {
                contentElement.removeChild(contentElement.firstChild);
            }
            
            // Función helper para crear secciones de análisis de forma segura
            const createAnalysisSection = (title, iconClass, content) => {
                const section = document.createElement('div');
                section.className = 'analysis-section';
                
                const titleElement = document.createElement('h6');
                const icon = document.createElement('i');
                icon.className = `${iconClass} mr-2`;
                titleElement.appendChild(icon);
                titleElement.appendChild(document.createTextNode(title));
                
                section.appendChild(titleElement);
                section.appendChild(content);
                
                return section;
            };
            
            if (analysis.summary) {
                const safeSummary = XSSProtection.sanitizeText(analysis.summary);
                const summaryDiv = document.createElement('p');
                summaryDiv.textContent = safeSummary;
                
                contentElement.appendChild(createAnalysisSection('Resumen', 'fas fa-file-alt', summaryDiv));
            }
            
            if (analysis.entities && analysis.entities.length > 0) {
                const entityList = document.createElement('div');
                entityList.className = 'entity-list';
                
                analysis.entities.forEach(entity => {
                    const safeText = XSSProtection.escapeHtml(entity.text || '');
                    const safeType = XSSProtection.escapeHtml(entity.type || '');
                    
                    const item = document.createElement('div');
                    item.className = 'analysis-item';
                    
                    const label = document.createElement('span');
                    label.className = 'analysis-label';
                    label.textContent = safeText;
                    
                    const value = document.createElement('span');
                    value.className = 'analysis-value';
                    value.textContent = safeType;
                    
                    item.appendChild(label);
                    item.appendChild(value);
                    entityList.appendChild(item);
                });
                
                contentElement.appendChild(createAnalysisSection('Entidades Identificadas', 'fas fa-tags', entityList));
            }
            
            if (analysis.risks && analysis.risks.length > 0) {
                const riskContainer = document.createElement('div');
                
                analysis.risks.forEach(risk => {
                    const safeDescription = XSSProtection.sanitizeText(risk.description || '');
                    const safeLevel = XSSProtection.escapeHtml(risk.level || '');
                    const riskClass = safeLevel === 'high' ? 'high' :
                                    safeLevel === 'medium' ? 'medium' : 'low';
                    
                    const item = document.createElement('div');
                    item.className = 'analysis-item';
                    
                    const label = document.createElement('span');
                    label.className = 'analysis-label';
                    label.textContent = safeDescription;
                    
                    const value = document.createElement('span');
                    value.className = `analysis-value ${riskClass}`;
                    value.textContent = safeLevel;
                    
                    item.appendChild(label);
                    item.appendChild(value);
                    riskContainer.appendChild(item);
                });
                
                contentElement.appendChild(createAnalysisSection('Riesgos Identificados', 'fas fa-exclamation-triangle', riskContainer));
            }
            
            if (analysis.recommendations && analysis.recommendations.length > 0) {
                const list = document.createElement('ul');
                
                analysis.recommendations.forEach(rec => {
                    const safeRec = XSSProtection.sanitizeText(rec || '');
                    const li = document.createElement('li');
                    li.textContent = safeRec;
                    list.appendChild(li);
                });
                
                contentElement.appendChild(createAnalysisSection('Recomendaciones', 'fas fa-lightbulb', list));
            }
        }
        
        modal.show();
    },
    
    // Eliminar documento
    deleteDocument: async function(documentId) {
        const document = this.state.documents.find(doc => doc.id === documentId);
        if (!document) return;
        
        const safeTitle = XSSProtection.escapeHtml(document.title || '');
        if (!confirm(`¿Está seguro de que desea eliminar "${safeTitle}"?`)) {
            return;
        }
        
        try {
            await Justice2API.deleteDocument(documentId);
            
            // Remover de lista
            const index = this.state.documents.findIndex(doc => doc.id === documentId);
            this.state.documents.splice(index, 1);
            
            // Invalidar caché del documento
            if (this.config.enableAdvancedCache) {
                await this.invalidateDocumentCache(documentId);
            }
            
            this.applyFilters();
            this.updateStatistics();
            
            Justice2.utils.showNotification('Documento eliminado correctamente', 'success');
        } catch (error) {
            this.log('Error eliminando documento:', error);
            Justice2.utils.showNotification('Error al eliminar documento', 'error');
        }
    },
    
    // Cambiar vista
    setView: function(mode) {
        this.config.viewMode = mode;
        
        // Actualizar botones
        const buttons = document.querySelectorAll('.btn-group .btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        this.renderDocuments();
    },
    
    // Ir a página
    goToPage: function(page) {
        if (page < 1 || page > this.state.totalPages) return;
        
        this.state.currentPage = page;
        this.renderDocuments();
        this.renderPagination();
    },
    
    // Actualizar estadísticas
    updateStatistics: function() {
        const totalElement = document.getElementById('total-documents');
        const sizeElement = document.getElementById('total-size');
        const analyzedElement = document.getElementById('analyzed-docs');
        
        if (totalElement) {
            totalElement.textContent = this.state.statistics.total;
        }
        
        if (sizeElement) {
            sizeElement.textContent = this.formatFileSize(this.state.statistics.totalSize);
        }
        
        if (analyzedElement) {
            analyzedElement.textContent = this.state.statistics.analyzed;
        }
    },
    
    // Mostrar loading
    showLoading: function() {
        const container = document.getElementById('documents-container');
        if (container) {
            // Crear loading de forma segura
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'documents-loading';
            
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            
            const paragraph = document.createElement('p');
            paragraph.textContent = 'Cargando documentos...';
            
            loadingDiv.appendChild(spinner);
            loadingDiv.appendChild(paragraph);
            
            container.appendChild(loadingDiv);
        }
    },
    
    // Ocultar loading
    hideLoading: function() {
        // El loading se oculta al renderizar los documentos
    },
    
    // Iniciar actualización automática
    startAutoRefresh: function() {
        setInterval(() => {
            if (!this.state.isLoading) {
                this.loadDocuments();
            }
        }, this.config.refreshInterval);
    },
    
    // Utilidades
    getDocumentIcon: function(type) {
        const icons = {
            'pdf': 'fas fa-file-pdf',
            'doc': 'fas fa-file-word',
            'docx': 'fas fa-file-word',
            'txt': 'fas fa-file-alt',
            'jpg': 'fas fa-file-image',
            'jpeg': 'fas fa-file-image',
            'png': 'fas fa-file-image'
        };
        return icons[type] || 'fas fa-file';
    },
    
    getStatusClass: function(status) {
        const classes = {
            'analyzed': 'analyzed',
            'pending': 'pending',
            'error': 'error'
        };
        return classes[status] || 'pending';
    },
    
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // Debounce utility
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Logging
    log: function(...args) {
        Justice2?.log('[DocumentsManager]', ...args);
    },
    
    // Método para optimizar caché de documentos
    optimizeDocumentCache: async function() {
        if (!this.state.documentCache) return;
        
        try {
            await this.state.documentCache.optimize();
            this.log('Caché de documentos optimizada automáticamente');
        } catch (error) {
            this.log('Error optimizando caché de documentos:', error);
        }
    },
    
    // Método para limpiar caché de documentos
    clearDocumentCache: async function() {
        if (!this.state.documentCache) return;
        
        try {
            await this.state.documentCache.clear();
            this.log('Caché de documentos limpiada completamente');
        } catch (error) {
            this.log('Error limpiando caché de documentos:', error);
        }
    },
    
    // Método para obtener estadísticas detalladas de uso de caché
    getDetailedCacheStatistics: function() {
        if (!this.state.documentCache) return null;
        
        try {
            const baseStats = this.getDocumentCacheStatistics();
            
            // Agregar estadísticas específicas de documentos
            const documentStats = {
                totalDocumentsCached: this.state.documents.length,
                cacheHitRate: this.calculateCacheHitRate(),
                mostAccessedDocuments: this.getMostAccessedDocuments(),
                cacheSizeByType: this.getCacheSizeByType(),
                lastCacheUpdate: new Date().toISOString()
            };
            
            return {
                ...baseStats,
                documents: documentStats
            };
        } catch (error) {
            this.log('Error obteniendo estadísticas detalladas de caché:', error);
            return null;
        }
    },
    
    // Calcular tasa de aciertos de caché (simulado para demostración)
    calculateCacheHitRate: function() {
        if (!this.state.documentCache) return 0;
        
        try {
            const metrics = this.state.documentCache.getMetrics();
            return metrics.hitRate || 0;
        } catch (error) {
            return 0;
        }
    },
    
    // Obtener documentos más accedidos (simulado para demostración)
    getMostAccessedDocuments: function() {
        // En una implementación real, esto se basaría en métricas de acceso
        return this.state.documents.slice(0, 5).map(doc => ({
            id: doc.id,
            title: doc.title,
            accessCount: Math.floor(Math.random() * 100) + 1
        }));
    },
    
    // Obtener tamaño de caché por tipo (simulado para demostración)
    getCacheSizeByType: function() {
        // En una implementación real, esto se basaría en métricas reales
        const types = {};
        this.state.documents.forEach(doc => {
            types[doc.type] = (types[doc.type] || 0) + 1;
        });
        return types;
    }
};

// Inicializar Gestor de Documentos
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        DocumentsManager.init();
    });
} else {
    DocumentsManager.init();
}

// Exportar para uso global
window.DocumentsManager = DocumentsManager;