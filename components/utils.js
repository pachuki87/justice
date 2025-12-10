/**
 * Justice 2 Utilities
 * Utilidades modulares y reutilizables
 */

// Importar sistema de protección XSS centralizado
// El sistema se carga automáticamente desde components/xss-protection.js

const Justice2Utils = {
    // Configuración
    config: {
        dateFormat: 'es-ES',
        currency: 'EUR',
        timezone: 'Europe/Madrid'
    },
    
    // Formatear fecha
    formatDate: function(date, options = {}) {
        if (!date) return '';
        
        const dateObj = new Date(date);
        const defaults = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const config = { ...defaults, ...options };
        
        try {
            return dateObj.toLocaleDateString(this.config.dateFormat, config);
        } catch (error) {
            this.log('Error formateando fecha:', error);
            return dateObj.toLocaleDateString();
        }
    },
    
    // Formatear hora
    formatTime: function(date, options = {}) {
        if (!date) return '';
        
        const dateObj = new Date(date);
        const defaults = {
            hour: '2-digit',
            minute: '2-digit',
            second: options.includeSeconds ? '2-digit' : undefined
        };
        
        const config = { ...defaults, ...options };
        
        try {
            return dateObj.toLocaleTimeString(this.config.dateFormat, config);
        } catch (error) {
            this.log('Error formateando hora:', error);
            return dateObj.toLocaleTimeString();
        }
    },
    
    // Formatear fecha y hora
    formatDateTime: function(date, options = {}) {
        if (!date) return '';
        
        const dateObj = new Date(date);
        const defaults = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const config = { ...defaults, ...options };
        
        try {
            return dateObj.toLocaleString(this.config.dateFormat, config);
        } catch (error) {
            this.log('Error formateando fecha y hora:', error);
            return dateObj.toLocaleString();
        }
    },
    
    // Formatear número
    formatNumber: function(num, options = {}) {
        if (num === null || num === undefined) return '0';
        
        const defaults = {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        };
        
        const config = { ...defaults, ...options };
        
        try {
            return new Intl.NumberFormat(this.config.dateFormat, config).format(num);
        } catch (error) {
            this.log('Error formateando número:', error);
            return num.toLocaleString();
        }
    },
    
    // Formatear moneda
    formatCurrency: function(amount, currency = this.config.currency) {
        if (amount === null || amount === undefined) return '0 €';
        
        try {
            return new Intl.NumberFormat(this.config.dateFormat, {
                style: 'currency',
                currency: currency
            }).format(amount);
        } catch (error) {
            this.log('Error formateando moneda:', error);
            return `${amount} ${currency}`;
        }
    },
    
    // Formatear porcentaje
    formatPercentage: function(value, decimals = 1) {
        if (value === null || value === undefined) return '0%';
        
        try {
            return new Intl.NumberFormat(this.config.dateFormat, {
                style: 'percent',
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(value);
        } catch (error) {
            this.log('Error formateando porcentaje:', error);
            return `${value}%`;
        }
    },
    
    // Formatear tamaño de archivo
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // Formatear duración
    formatDuration: function(seconds) {
        if (!seconds || seconds === 0) return '0s';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    },
    
    // Validar email
    validateEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // Validar URL
    validateUrl: function(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },
    
    // Validar teléfono
    validatePhone: function(phone) {
        const re = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}$/;
        return re.test(phone.replace(/\s/g, ''));
    },
    
    // Validar DNI
    validateDNI: function(dni) {
        const re = /^[XYZ]?\d{7,8}[A-Z]$/;
        return re.test(dni.toUpperCase());
    },
    
    // Generar ID único
    generateId: function(prefix = 'j2') {
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Generar UUID
    generateUUID: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    // Sanitizar string (DEPRECADO - Usar XSSProtection en su lugar)
    sanitize: function(str) {
        console.warn('[Justice2Utils] La función sanitize() está deprecada. Use XSSProtection.escapeHtml() en su lugar.');
        
        if (!str) return '';
        
        // Usar el sistema XSSProtection centralizado
        return XSSProtection.escapeHtml(str);
    },
    
    // Sanitizar texto con XSSProtection
    sanitizeText: function(text, options = {}) {
        if (!text) return '';
        
        const validation = XSSProtection.validateInput(text, {
            type: 'text',
            maxLength: options.maxLength || 10000,
            allowEmpty: options.allowEmpty !== false
        });
        
        return validation.valid ? validation.sanitized : '';
    },
    
    // Sanitizar URL con XSSProtection
    sanitizeUrl: function(url) {
        if (!url) return '#';
        
        return XSSProtection.sanitizeUrl(url);
    },
    
    // Sanitizar HTML con XSSProtection
    sanitizeHtml: function(html, options = {}) {
        if (!html) return '';
        
        return XSSProtection.sanitizeHtml(html, options);
    },
    
    // Validar entrada con XSSProtection
    validateInput: function(input, options = {}) {
        return XSSProtection.validateInput(input, options);
    },
    
    // Truncar texto
    truncate: function(str, length, suffix = '...') {
        if (!str || str.length <= length) return str;
        
        // Sanitizar antes de truncar para evitar XSS
        const sanitized = this.sanitizeText(str);
        
        return sanitized.substring(0, length) + suffix;
    },
    
    // Capitalizar palabras
    capitalizeWords: function(str) {
        if (!str) return '';
        
        return str.replace(/\b\w/g, char => {
            return char.toUpperCase();
        });
    },
    
    // Capitalizar primera letra
    capitalize: function(str) {
        if (!str) return '';
        
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    
    // Convertir a slug
    slugify: function(str) {
        if (!str) return '';
        
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    },
    
    // Calcular diferencia de fechas
    dateDiff: function(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
        
        return {
            days: diffDays,
            hours: diffHours,
            minutes: diffMinutes,
            total: diffTime
        };
    },
    
    // Calcular edad
    calculateAge: function(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    },
    
    // Obtener color según estado
    getStatusColor: function(status) {
        const colors = {
            'active': '#28a745',
            'pending': '#ffc107',
            'warning': '#fd7e14',
            'danger': '#dc3545',
            'success': '#28a745',
            'info': '#17a2b8',
            'closed': '#6c757d',
            'archived': '#17a2b8'
        };
        
        return colors[status] || colors.info;
    },
    
    // Obtener icono según tipo
    getTypeIcon: function(type) {
        const icons = {
            'document': 'fas fa-file-alt',
            'case': 'fas fa-briefcase',
            'user': 'fas fa-user',
            'client': 'fas fa-user-tie',
            'lawyer': 'fas fa-user-tie',
            'court': 'fas fa-gavel',
            'contract': 'fas fa-file-contract',
            'evidence': 'fas fa-fingerprint',
            'hearing': 'fas fa-calendar-alt',
            'deadline': 'fas fa-clock',
            'notification': 'fas fa-bell',
            'message': 'fas fa-envelope',
            'phone': 'fas fa-phone',
            'email': 'fas fa-envelope',
            'analytics': 'fas fa-chart-line',
            'report': 'fas fa-file-alt',
            'settings': 'fas fa-cog',
            'search': 'fas fa-search',
            'filter': 'fas fa-filter',
            'download': 'fas fa-download',
            'upload': 'fas fa-upload',
            'edit': 'fas fa-edit',
            'delete': 'fas fa-trash',
            'view': 'fas fa-eye',
            'add': 'fas fa-plus',
            'save': 'fas fa-save',
            'cancel': 'fas fa-times',
            'check': 'fas fa-check',
            'times': 'fas fa-times',
            'arrow-up': 'fas fa-arrow-up',
            'arrow-down': 'fas fa-arrow-down',
            'brain': 'fas fa-brain',
            'robot': 'fas fa-robot',
            'shield': 'fas fa-shield-alt',
            'lock': 'fas fa-lock',
            'unlock': 'fas fa-unlock',
            'key': 'fas fa-key'
        };
        
        return icons[type] || icons.file;
    },
    
    // Obtener etiqueta según estado
    getStatusLabel: function(status) {
        const labels = {
            'active': 'Activo',
            'pending': 'Pendiente',
            'warning': 'Advertencia',
            'danger': 'Peligro',
            'success': 'Completado',
            'info': 'Información',
            'closed': 'Cerrado',
            'archived': 'Archivado',
            'draft': 'Borrador',
            'review': 'En Revisión',
            'approved': 'Aprobado',
            'rejected': 'Rechazado'
        };
        
        return labels[status] || labels.info;
    },
    
    // Obtener etiqueta según prioridad
    getPriorityLabel: function(priority) {
        const labels = {
            'high': 'Alta',
            'medium': 'Media',
            'low': 'Baja',
            'critical': 'Crítica',
            'urgent': 'Urgente'
        };
        
        return labels[priority] || labels.medium;
    },
    
    // Copiar al portapapeles
    copyToClipboard: async function(text) {
        try {
            // Validar y sanitizar el texto antes de copiarlo
            if (typeof text !== 'string') {
                text = String(text || '');
            }
            
            const sanitizedText = this.sanitizeText(text);
            
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(sanitizedText);
            } else {
                // Fallback para navegadores antiguos
                const textArea = XSSProtection.createElementSafe('textarea', {
                    value: sanitizedText,
                    style: 'position: fixed; left: -999999px;'
                });
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            
            return true;
        } catch (error) {
            this.log('Error copiando al portapapeles:', error);
            return false;
        }
    },
    
    // Descargar archivo
    downloadFile: function(content, filename, mimeType = 'text/plain') {
        try {
            // Validar y sanitizar el nombre del archivo
            const filenameValidation = this.validateInput(filename, {
                type: 'filename',
                maxLength: 255,
                allowEmpty: false
            });
            
            if (!filenameValidation.valid) {
                this.log('Nombre de archivo no seguro:', filename);
                return;
            }
            
            const sanitizedFilename = filenameValidation.sanitized;
            
            // Sanitizar contenido si es texto
            let sanitizedContent = content;
            if (typeof content === 'string' && mimeType.startsWith('text/')) {
                sanitizedContent = this.sanitizeText(content);
            }
            
            const blob = new Blob([sanitizedContent], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            
            const a = XSSProtection.createElementSafe('a', {
                href: url,
                download: sanitizedFilename
            });
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            this.log('Error descargando archivo:', error);
        }
    },
    
    // Imprimir contenido
    printContent: function(content, title = 'Documento') {
        try {
            // Validar y sanitizar el título
            const titleValidation = this.validateInput(title, {
                type: 'text',
                maxLength: 100,
                allowEmpty: true
            });
            
            const sanitizedTitle = titleValidation.valid ? titleValidation.sanitized : 'Documento';
            
            // Sanitizar el contenido
            const sanitizedContent = this.sanitizeHtml(content, {
                allowedTags: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'hr', 'table', 'tr', 'td', 'th'],
                allowedAttributes: ['class', 'id']
            });
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${sanitizedTitle}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #B49C73; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    ${sanitizedContent}
                </body>
                </html>
            `);
            
            printWindow.document.close();
            printWindow.print();
        } catch (error) {
            this.log('Error imprimiendo contenido:', error);
        }
    },
    
    // Debounce
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
    
    // Throttle
    throttle: function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Detectar dispositivo móvil
    isMobile: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Detectar tablet
    isTablet: function() {
        return /iPad|Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent);
    },
    
    // Detectar escritorio
    isDesktop: function() {
        return !this.isMobile() && !this.isTablet();
    },
    
    // Obtener configuración de dispositivo
    getDeviceInfo: function() {
        return {
            isMobile: this.isMobile(),
            isTablet: this.isTablet(),
            isDesktop: this.isDesktop(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cookiesEnabled: navigator.cookieEnabled,
            localStorage: typeof Storage !== 'undefined',
            sessionStorage: typeof sessionStorage !== 'undefined'
        };
    },
    
    // Almacenar en localStorage
    setLocalStorage: function(key, value) {
        try {
            if (typeof Storage !== 'undefined') {
                // Validar y sanitizar la clave
                const keyValidation = this.validateInput(key, {
                    type: 'text',
                    maxLength: 100,
                    allowEmpty: false
                });
                
                if (!keyValidation.valid) {
                    this.log('Clave de localStorage no segura:', key);
                    return false;
                }
                
                const sanitizedKey = keyValidation.sanitized;
                
                // Sanitizar valores de texto
                let sanitizedValue = value;
                if (typeof value === 'string') {
                    const valueValidation = this.validateInput(value, {
                        type: 'text',
                        maxLength: 10000,
                        allowEmpty: true
                    });
                    
                    if (!valueValidation.valid) {
                        this.log('Valor de localStorage no seguro:', value);
                        return false;
                    }
                    
                    sanitizedValue = valueValidation.sanitized;
                }
                
                localStorage.setItem(sanitizedKey, JSON.stringify(sanitizedValue));
                return true;
            }
        } catch (error) {
            this.log('Error guardando en localStorage:', error);
            return false;
        }
        return false;
    },
    
    // Obtener de localStorage
    getLocalStorage: function(key, defaultValue = null) {
        try {
            if (typeof Storage !== 'undefined') {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            }
        } catch (error) {
            this.log('Error obteniendo de localStorage:', error);
            return defaultValue;
        }
    },
    
    // Eliminar de localStorage
    removeLocalStorage: function(key) {
        try {
            if (typeof Storage !== 'undefined') {
                localStorage.removeItem(key);
            }
        } catch (error) {
            this.log('Error eliminando de localStorage:', error);
        }
    },
    
    // Almacenar en sessionStorage
    setSessionStorage: function(key, value) {
        try {
            if (typeof sessionStorage !== 'undefined') {
                // Validar y sanitizar la clave
                const keyValidation = this.validateInput(key, {
                    type: 'text',
                    maxLength: 100,
                    allowEmpty: false
                });
                
                if (!keyValidation.valid) {
                    this.log('Clave de sessionStorage no segura:', key);
                    return false;
                }
                
                const sanitizedKey = keyValidation.sanitized;
                
                // Sanitizar valores de texto
                let sanitizedValue = value;
                if (typeof value === 'string') {
                    const valueValidation = this.validateInput(value, {
                        type: 'text',
                        maxLength: 10000,
                        allowEmpty: true
                    });
                    
                    if (!valueValidation.valid) {
                        this.log('Valor de sessionStorage no seguro:', value);
                        return false;
                    }
                    
                    sanitizedValue = valueValidation.sanitized;
                }
                
                sessionStorage.setItem(sanitizedKey, JSON.stringify(sanitizedValue));
                return true;
            }
        } catch (error) {
            this.log('Error guardando en sessionStorage:', error);
            return false;
        }
        return false;
    },
    
    // Obtener de sessionStorage
    getSessionStorage: function(key, defaultValue = null) {
        try {
            if (typeof sessionStorage !== 'undefined') {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            }
        } catch (error) {
            this.log('Error obteniendo de sessionStorage:', error);
            return defaultValue;
        }
    },
    
    // Eliminar de sessionStorage
    removeSessionStorage: function(key) {
        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem(key);
            }
        } catch (error) {
            this.log('Error eliminando de sessionStorage:', error);
        }
    },
    
    // Generar colores aleatorios
    generateRandomColor: function() {
        const colors = [
            '#B49C73', '#28a745', '#dc3545', '#ffc107', '#17a2b8',
            '#6f42c1', '#e83e8c', '#20c997', '#343a40'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },
    
    // Generar gradiente
    generateGradient: function(color1, color2, angle = 45) {
        return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
    },
    
    // Validar formulario
    validateForm: function(formData, rules) {
        const errors = {};
        
        Object.keys(rules).forEach(field => {
            const rule = rules[field];
            const value = formData[field];
           
            // Validar y sanitizar el valor del campo
            if (typeof value === 'string') {
                const validation = this.validateInput(value, {
                    type: rule.type || 'text',
                    maxLength: rule.maxLength || 1000,
                    allowEmpty: !rule.required
                });
                
                if (!validation.valid) {
                    errors[field] = 'El campo contiene contenido no permitido';
                    return;
                }
            }
           
            if (rule.required && (!value || value.toString().trim() === '')) {
                errors[field] = 'Este campo es requerido';
            }
           
            if (rule.minLength && value.length < rule.minLength) {
                errors[field] = `Mínimo ${rule.minLength} caracteres`;
            }
           
            if (rule.maxLength && value.length > rule.maxLength) {
                errors[field] = `Máximo ${rule.maxLength} caracteres`;
            }
           
            if (rule.pattern && !rule.pattern.test(value)) {
                errors[field] = 'Formato inválido';
            }
           
            if (rule.email && !this.validateEmail(value)) {
                errors[field] = 'Email inválido';
            }
           
            if (rule.phone && !this.validatePhone(value)) {
                errors[field] = 'Teléfono inválido';
            }
           
            if (rule.dni && !this.validateDNI(value)) {
                errors[field] = 'DNI inválido';
            }
        });
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },
    
    // Logging
    log: function(...args) {
        if (window.Justice2 && window.Justice2.config && window.Justice2.config.debug) {
            console.log('[Justice2Utils]', ...args);
        }
    }
};

// Exportar para uso global
window.Justice2Utils = Justice2Utils;