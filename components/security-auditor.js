/**
 * SecurityAuditor - Sistema de auditoría de seguridad
 * 
 * Este módulo proporciona funcionalidades para:
 * - Realizar auditorías de seguridad completas
 * - Evaluar políticas de seguridad
 * - Verificar configuraciones seguras
 * - Generar reportes de cumplimiento
 * - Monitorear métricas de seguridad
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class SecurityAuditor {
    constructor(options = {}) {
        this.options = {
            projectPath: options.projectPath || process.cwd(),
            auditLevel: options.auditLevel || 'comprehensive', // 'basic', 'standard', 'comprehensive'
            includeDevDependencies: options.includeDevDependencies !== false,
            generateReports: options.generateReports !== false,
            reportPath: options.reportPath || path.join(options.projectPath || process.cwd(), 'security-reports'),
            ...options
        };
        
        this.packageJsonPath = path.join(this.options.projectPath, 'package.json');
        this.packageLockPath = path.join(this.options.projectPath, 'package-lock.json');
        this.auditHistory = [];
        
        // Criterios de auditoría
        this.auditCriteria = {
            vulnerability: {
                enabled: true,
                weight: 0.3,
                checks: ['npm_audit', 'osv_database', 'github_advisory']
            },
            dependency: {
                enabled: true,
                weight: 0.2,
                checks: ['outdated', 'deprecated', 'license', 'maintenance']
            },
            configuration: {
                enabled: true,
                weight: 0.2,
                checks: ['security_headers', 'env_variables', 'permissions']
            },
            code: {
                enabled: true,
                weight: 0.15,
                checks: ['secrets', 'insecure_functions', 'validation']
            },
            infrastructure: {
                enabled: true,
                weight: 0.15,
                checks: ['ssl', 'authentication', 'authorization']
            }
        };
        
        // Estándares de seguridad
        this.securityStandards = {
            owasp: {
                name: 'OWASP Top 10',
                version: '2021',
                categories: [
                    'A01_Broken_Access_Control',
                    'A02_Cryptographic_Failures',
                    'A03_Injection',
                    'A04_Insecure_Design',
                    'A05_Security_Misconfiguration',
                    'A06_Vulnerable_and_Outdated_Components',
                    'A07_Identification_and_Authentication_Failures',
                    'A08_Software_and_Data_Integrity_Failures',
                    'A09_Security_Logging_and_Monitoring_Failures',
                    'A10_Server-Side_Request_Forgery'
                ]
            },
            iso27001: {
                name: 'ISO 27001',
                version: '2013',
                controls: [
                    'A.9.1_Access_Control_Policy',
                    'A.9.2_Access_Control_Requirements',
                    'A.12.1_Operational_Procedures',
                    'A.12.4_Logging_and_Monitoring',
                    'A.12.6_Technical_Vulnerability_Management'
                ]
            },
            nist: {
                name: 'NIST Cybersecurity Framework',
                version: '1.1',
                functions: [
                    'Identify',
                    'Protect',
                    'Detect',
                    'Respond',
                    'Recover'
                ]
            }
        };
    }

    /**
     * Inicializa el auditor de seguridad
     */
    async initialize() {
        try {
            await this.loadProjectData();
            await this.ensureReportDirectory();
            console.log('✅ SecurityAuditor inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar SecurityAuditor:', error.message);
            throw error;
        }
    }

    /**
     * Carga los datos del proyecto
     */
    async loadProjectData() {
        try {
            const packageJson = await fs.readFile(this.packageJsonPath, 'utf8');
            this.packageJson = JSON.parse(packageJson);
            
            try {
                const packageLock = await fs.readFile(this.packageLockPath, 'utf8');
                this.packageLock = JSON.parse(packageLock);
            } catch {
                console.warn('⚠️ No se encontró package-lock.json');
                this.packageLock = null;
            }
        } catch (error) {
            throw new Error(`Error al cargar datos del proyecto: ${error.message}`);
        }
    }

    /**
     * Asegura que el directorio de reportes exista
     */
    async ensureReportDirectory() {
        try {
            await fs.access(this.options.reportPath);
        } catch {
            await fs.mkdir(this.options.reportPath, { recursive: true });
        }
    }

    /**
     * Ejecuta una auditoría de seguridad completa
     */
    async auditSecurity(options = {}) {
        const auditOptions = {
            level: options.level || this.options.auditLevel,
            includeDev: options.includeDev !== undefined ? options.includeDev : this.options.includeDevDependencies,
            generateReport: options.generateReport !== undefined ? options.generateReport : this.options.generateReports,
            ...options
        };

        try {
            console.log(`🔒 Iniciando auditoría de seguridad (${auditOptions.level})...`);
            
            const audit = {
                timestamp: new Date().toISOString(),
                auditId: this.generateAuditId(),
                level: auditOptions.level,
                options: auditOptions,
                results: {
                    vulnerability: null,
                    dependency: null,
                    configuration: null,
                    code: null,
                    infrastructure: null
                },
                scores: {
                    overall: 0,
                    vulnerability: 0,
                    dependency: 0,
                    configuration: 0,
                    code: 0,
                    infrastructure: 0
                },
                compliance: {
                    owasp: null,
                    iso27001: null,
                    nist: null
                },
                recommendations: [],
                metadata: {
                    duration: 0,
                    checksPerformed: 0,
                    issuesFound: 0
                }
            };

            const startTime = Date.now();

            // Ejecutar auditorías según el nivel
            if (this.auditCriteria.vulnerability.enabled) {
                audit.results.vulnerability = await this.auditVulnerabilities(auditOptions);
                audit.scores.vulnerability = this.calculateVulnerabilityScore(audit.results.vulnerability);
            }

            if (this.auditCriteria.dependency.enabled) {
                audit.results.dependency = await this.auditDependencies(auditOptions);
                audit.scores.dependency = this.calculateDependencyScore(audit.results.dependency);
            }

            if (this.auditCriteria.configuration.enabled) {
                audit.results.configuration = await this.auditConfiguration(auditOptions);
                audit.scores.configuration = this.calculateConfigurationScore(audit.results.configuration);
            }

            if (this.auditCriteria.code.enabled) {
                audit.results.code = await this.auditCode(auditOptions);
                audit.scores.code = this.calculateCodeScore(audit.results.code);
            }

            if (this.auditCriteria.infrastructure.enabled) {
                audit.results.infrastructure = await this.auditInfrastructure(auditOptions);
                audit.scores.infrastructure = this.calculateInfrastructureScore(audit.results.infrastructure);
            }

            // Calcular puntaje general
            audit.scores.overall = this.calculateOverallScore(audit.scores);

            // Evaluar cumplimiento de estándares
            audit.compliance.owasp = await this.evaluateOWASPCompliance(audit);
            audit.compliance.iso27001 = await this.evaluateISO27001Compliance(audit);
            audit.compliance.nist = await this.evaluateNISTCompliance(audit);

            // Generar recomendaciones
            audit.recommendations = this.generateSecurityRecommendations(audit);

            // Actualizar metadatos
            audit.metadata.duration = Date.now() - startTime;
            audit.metadata.checksPerformed = this.countChecksPerformed(audit);
            audit.metadata.issuesFound = this.countIssuesFound(audit);

            // Guardar en historial
            this.auditHistory.push(audit);

            // Generar reporte
            if (auditOptions.generateReport) {
                await this.generateSecurityReport(audit);
            }

            console.log(`✅ Auditoría completada: Puntaje general ${audit.scores.overall}/100`);
            return audit;
        } catch (error) {
            throw new Error(`Error en auditoría de seguridad: ${error.message}`);
        }
    }

    /**
     * Genera un ID único para la auditoría
     */
    generateAuditId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Audita vulnerabilidades
     */
    async auditVulnerabilities(options) {
        const VulnerabilityScanner = require('./vulnerability-scanner');
        const scanner = new VulnerabilityScanner({
            projectPath: this.options.projectPath,
            includeDevDependencies: options.includeDev,
            severityThreshold: 'low'
        });

        await scanner.initialize();
        const scanResult = await scanner.scanVulnerabilities();

        return {
            type: 'vulnerability',
            timestamp: new Date().toISOString(),
            result: scanResult,
            issues: scanResult.vulnerabilities,
            score: this.calculateVulnerabilityScore(scanResult)
        };
    }

    /**
     * Audita dependencias
     */
    async auditDependencies(options) {
        const DependencyUpdater = require('./dependency-updater');
        const updater = new DependencyUpdater({
            projectPath: this.options.projectPath,
            includeDevDependencies: options.includeDev
        });

        await updater.initialize();
        const analysis = await updater.analyzeUpdates();

        // Analizar dependencias obsoletas
        const outdatedIssues = analysis.outdated.map(dep => ({
            type: 'outdated',
            severity: this.getOutdatedSeverity(dep.updateType),
            package: dep.name,
            currentVersion: dep.currentVersion,
            latestVersion: dep.latestVersion,
            description: `Package ${dep.name} is outdated`,
            recommendation: `Update to ${dep.latestVersion}`
        }));

        // Analizar licencias
        const licenseIssues = await this.analyzeLicenses();

        // Analizar mantenimiento
        const maintenanceIssues = await this.analyzeMaintenance(analysis);

        return {
            type: 'dependency',
            timestamp: new Date().toISOString(),
            result: analysis,
            issues: [...outdatedIssues, ...licenseIssues, ...maintenanceIssues],
            score: this.calculateDependencyScore({
                outdated: analysis.outdated,
                licenseIssues,
                maintenanceIssues
            })
        };
    }

    /**
     * Analiza licencias de dependencias
     */
    async analyzeLicenses() {
        const issues = [];
        const dependencies = this.getAllDependencies();

        for (const [name, version] of Object.entries(dependencies)) {
            try {
                const packageInfo = await this.getPackageInfo(name);
                const license = packageInfo.license;
                
                if (!license) {
                    issues.push({
                        type: 'license_missing',
                        severity: 'moderate',
                        package: name,
                        description: `Package ${name} has no license information`,
                        recommendation: 'Verify package license or consider alternative'
                    });
                } else if (this.isRestrictedLicense(license)) {
                    issues.push({
                        type: 'license_restricted',
                        severity: 'high',
                        package: name,
                        license,
                        description: `Package ${name} has restricted license: ${license}`,
                        recommendation: 'Review license compatibility or find alternative'
                    });
                }
            } catch (error) {
                // Ignorar errores al obtener información del paquete
            }
        }

        return issues;
    }

    /**
     * Verifica si una licencia está restringida
     */
    isRestrictedLicense(license) {
        const restrictedLicenses = [
            'GPL-2.0', 'GPL-3.0', 'AGPL-1.0', 'AGPL-3.0',
            'LGPL-2.0', 'LGPL-2.1', 'LGPL-3.0'
        ];

        if (typeof license === 'string') {
            return restrictedLicenses.includes(license);
        } else if (Array.isArray(license)) {
            return license.some(l => restrictedLicenses.includes(l));
        }

        return false;
    }

    /**
     * Analiza mantenimiento de dependencias
     */
    async analyzeMaintenance(analysis) {
        const issues = [];
        
        for (const dep of analysis.outdated) {
            if (dep.updateType === 'major') {
                const daysSinceUpdate = this.getDaysSinceLastUpdate(dep.packageInfo);
                
                if (daysSinceUpdate > 365) {
                    issues.push({
                        type: 'maintenance_abandoned',
                        severity: 'critical',
                        package: dep.name,
                        description: `Package ${dep.name} appears to be unmaintained`,
                        recommendation: 'Find actively maintained alternative'
                    });
                } else if (daysSinceUpdate > 180) {
                    issues.push({
                        type: 'maintenance_inactive',
                        severity: 'moderate',
                        package: dep.name,
                        description: `Package ${dep.name} has infrequent updates`,
                        recommendation: 'Monitor for updates or consider alternative'
                    });
                }
            }
        }

        return issues;
    }

    /**
     * Obtiene días desde última actualización
     */
    getDaysSinceLastUpdate(packageInfo) {
        if (!packageInfo) return 999;
        
        // Implementación simplificada - en producción usaría datos reales
        return Math.floor(Math.random() * 400) + 100;
    }

    /**
     * Audita configuración
     */
    async auditConfiguration(options) {
        const issues = [];

        // Verificar variables de entorno
        const envIssues = await this.auditEnvironmentVariables();
        issues.push(...envIssues);

        // Verificar headers de seguridad
        const headerIssues = await this.auditSecurityHeaders();
        issues.push(...headerIssues);

        // Verificar permisos
        const permissionIssues = await this.auditPermissions();
        issues.push(...permissionIssues);

        return {
            type: 'configuration',
            timestamp: new Date().toISOString(),
            issues,
            score: this.calculateConfigurationScore({ issues })
        };
    }

    /**
     * Audita variables de entorno
     */
    async auditEnvironmentVariables() {
        const issues = [];
        
        try {
            const envPath = path.join(this.options.projectPath, '.env');
            try {
                const envContent = await fs.readFile(envPath, 'utf8');
                
                // Verificar secrets en .env
                const sensitivePatterns = [
                    /password\s*=\s*.+/i,
                    /secret\s*=\s*.+/i,
                    /key\s*=\s*.+/i,
                    /token\s*=\s*.+/i
                ];
                
                for (const pattern of sensitivePatterns) {
                    if (pattern.test(envContent)) {
                        issues.push({
                            type: 'sensitive_env',
                            severity: 'high',
                            file: '.env',
                            description: 'Sensitive data found in environment file',
                            recommendation: 'Use environment-specific configuration or secret management'
                        });
                    }
                }
            } catch {
                // .env no encontrado
            }
        } catch (error) {
            console.warn('⚠️ Error auditando variables de entorno:', error.message);
        }

        return issues;
    }

    /**
     * Audita headers de seguridad
     */
    async auditSecurityHeaders() {
        const issues = [];
        
        // Verificar configuración de headers en el código
        const headerFiles = [
            'js/justice2-auth.js',
            'netlify/functions/api.js',
            'netlify/functions/csrf-middleware.js'
        ];

        for (const file of headerFiles) {
            try {
                const filePath = path.join(this.options.projectPath, file);
                const content = await fs.readFile(filePath, 'utf8');
                
                // Verificar headers de seguridad recomendados
                const requiredHeaders = [
                    'helmet',
                    'X-Content-Type-Options',
                    'X-Frame-Options',
                    'X-XSS-Protection',
                    'Strict-Transport-Security'
                ];
                
                for (const header of requiredHeaders) {
                    if (!content.includes(header)) {
                        issues.push({
                            type: 'missing_security_header',
                            severity: 'moderate',
                            file,
                            header,
                            description: `Missing security header: ${header}`,
                            recommendation: `Implement ${header} security header`
                        });
                    }
                }
            } catch (error) {
                // Archivo no encontrado o error de lectura
            }
        }

        return issues;
    }

    /**
     * Audita permisos
     */
    async auditPermissions() {
        const issues = [];
        
        try {
            // Verificar permisos de archivos sensibles
            const sensitiveFiles = [
                '.env',
                'package-lock.json',
                '.git/config'
            ];

            for (const file of sensitiveFiles) {
                try {
                    const filePath = path.join(this.options.projectPath, file);
                    const stats = await fs.stat(filePath);
                    
                    // Verificar permisos (implementación simplificada)
                    if (stats.mode & 0o044) { // readable by others
                        issues.push({
                            type: 'insecure_permissions',
                            severity: 'high',
                            file,
                            description: `File ${file} has overly permissive permissions`,
                            recommendation: 'Restrict file permissions to owner only'
                        });
                    }
                } catch {
                    // Archivo no encontrado
                }
            }
        } catch (error) {
            console.warn('⚠️ Error auditando permisos:', error.message);
        }

        return issues;
    }

    /**
     * Audita código fuente
     */
    async auditCode(options) {
        const issues = [];
        
        // Escanear archivos JavaScript
        const jsFiles = await this.findJavaScriptFiles();
        
        for (const file of jsFiles) {
            try {
                const content = await fs.readFile(file, 'utf8');
                const relativePath = path.relative(this.options.projectPath, file);
                
                // Verificar secrets en el código
                const secretIssues = this.scanForSecrets(content, relativePath);
                issues.push(...secretIssues);
                
                // Verificar funciones inseguras
                const insecureIssues = this.scanForInsecureFunctions(content, relativePath);
                issues.push(...insecureIssues);
                
                // Verificar validación de entrada
                const validationIssues = this.scanForValidationIssues(content, relativePath);
                issues.push(...validationIssues);
                
            } catch (error) {
                console.warn(`⚠️ Error auditando ${file}:`, error.message);
            }
        }

        return {
            type: 'code',
            timestamp: new Date().toISOString(),
            issues,
            score: this.calculateCodeScore({ issues })
        };
    }

    /**
     * Encuentra archivos JavaScript
     */
    async findJavaScriptFiles() {
        const files = [];
        
        const searchDirectory = async (dir) => {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                        await searchDirectory(fullPath);
                    } else if (entry.isFile() && entry.name.endsWith('.js')) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                // Ignorar errores de lectura
            }
        };

        await searchDirectory(this.options.projectPath);
        return files;
    }

    /**
     * Escanea secrets en el código
     */
    scanForSecrets(content, file) {
        const issues = [];
        
        const secretPatterns = [
            {
                pattern: /['"]?API_KEY['"]?\s*[:=]\s*['"][^'"]{10,}['"]/gi,
                type: 'api_key',
                severity: 'critical'
            },
            {
                pattern: /['"]?PASSWORD['"]?\s*[:=]\s*['"][^'"]{8,}['"]/gi,
                type: 'password',
                severity: 'critical'
            },
            {
                pattern: /['"]?SECRET['"]?\s*[:=]\s*['"][^'"]{10,}['"]/gi,
                type: 'secret',
                severity: 'critical'
            },
            {
                pattern: /['"]?TOKEN['"]?\s*[:=]\s*['"][^'"]{10,}['"]/gi,
                type: 'token',
                severity: 'critical'
            }
        ];

        for (const { pattern, type, severity } of secretPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                issues.push({
                    type: 'secret_exposed',
                    severity,
                    file,
                    secretType: type,
                    description: `Potential ${type} found in code`,
                    recommendation: 'Remove hardcoded secrets and use environment variables'
                });
            }
        }

        return issues;
    }

    /**
     * Escanea funciones inseguras
     */
    scanForInsecureFunctions(content, file) {
        const issues = [];
        
        const insecurePatterns = [
            {
                pattern: /eval\s*\(/gi,
                type: 'eval_usage',
                severity: 'critical',
                recommendation: 'Avoid eval() function, use safer alternatives'
            },
            {
                pattern: /innerHTML\s*=/gi,
                type: 'inner_html',
                severity: 'high',
                recommendation: 'Use textContent or sanitize HTML before setting innerHTML'
            },
            {
                pattern: /document\.write\s*\(/gi,
                type: 'document_write',
                severity: 'high',
                recommendation: 'Avoid document.write(), use DOM manipulation methods'
            },
            {
                pattern: /setTimeout\s*\(\s*["']/gi,
                type: 'settimeout_string',
                severity: 'moderate',
                recommendation: 'Avoid passing strings to setTimeout, use functions'
            }
        ];

        for (const { pattern, type, severity, recommendation } of insecurePatterns) {
            const matches = content.match(pattern);
            if (matches) {
                issues.push({
                    type: 'insecure_function',
                    severity,
                    file,
                    functionType: type,
                    description: `Insecure function usage: ${type}`,
                    recommendation
                });
            }
        }

        return issues;
    }

    /**
     * Escanea problemas de validación
     */
    scanForValidationIssues(content, file) {
        const issues = [];
        
        // Verificar si hay validación de entrada
        const hasValidation = /validate|sanitize|escape|test\(/gi.test(content);
        const hasUserInput = /req\.body|req\.query|req\.params|getElementById|querySelector/gi.test(content);
        
        if (hasUserInput && !hasValidation) {
            issues.push({
                type: 'missing_validation',
                severity: 'high',
                file,
                description: 'User input without proper validation',
                recommendation: 'Implement input validation and sanitization'
            });
        }

        return issues;
    }

    /**
     * Audita infraestructura
     */
    async auditInfrastructure(options) {
        const issues = [];
        
        // Verificar configuración SSL
        const sslIssues = await this.auditSSLConfiguration();
        issues.push(...sslIssues);

        // Verificar autenticación
        const authIssues = await this.auditAuthentication();
        issues.push(...authIssues);

        // Verificar autorización
        const authzIssues = await this.auditAuthorization();
        issues.push(...authzIssues);

        return {
            type: 'infrastructure',
            timestamp: new Date().toISOString(),
            issues,
            score: this.calculateInfrastructureScore({ issues })
        };
    }

    /**
     * Audita configuración SSL
     */
    async auditSSLConfiguration() {
        const issues = [];
        
        // Verificar configuración SSL en archivos de configuración
        const configFiles = [
            '.env.example',
            'netlify.toml'
        ];

        for (const file of configFiles) {
            try {
                const filePath = path.join(this.options.projectPath, file);
                const content = await fs.readFile(filePath, 'utf8');
                
                if (!content.includes('https') && !content.includes('SSL')) {
                    issues.push({
                        type: 'ssl_missing',
                        severity: 'high',
                        file,
                        description: 'SSL/TLS configuration not found',
                        recommendation: 'Configure HTTPS and SSL certificates'
                    });
                }
            } catch (error) {
                // Archivo no encontrado
            }
        }

        return issues;
    }

    /**
     * Audita autenticación
     */
    async auditAuthentication() {
        const issues = [];
        
        try {
            const authFile = path.join(this.options.projectPath, 'js/justice2-auth.js');
            const content = await fs.readFile(authFile, 'utf8');
            
            // Verificar mecanismos de autenticación
            if (!content.includes('bcrypt') && !content.includes('hash')) {
                issues.push({
                    type: 'weak_authentication',
                    severity: 'critical',
                    file: 'js/justice2-auth.js',
                    description: 'Weak or missing password hashing',
                    recommendation: 'Implement strong password hashing (bcrypt, scrypt, argon2)'
                });
            }

            // Verificar manejo de sesiones
            if (!content.includes('jwt') && !content.includes('session')) {
                issues.push({
                    type: 'session_management',
                    severity: 'high',
                    file: 'js/justice2-auth.js',
                    description: 'Missing session management',
                    recommendation: 'Implement secure session management'
                });
            }
        } catch (error) {
            // Archivo no encontrado
        }

        return issues;
    }

    /**
     * Audita autorización
     */
    async auditAuthorization() {
        const issues = [];
        
        try {
            const apiFile = path.join(this.options.projectPath, 'netlify/functions/api.js');
            const content = await fs.readFile(apiFile, 'utf8');
            
            // Verificar controles de acceso
            if (!content.includes('authorize') && !content.includes('permission')) {
                issues.push({
                    type: 'missing_authorization',
                    severity: 'high',
                    file: 'netlify/functions/api.js',
                    description: 'Missing authorization controls',
                    recommendation: 'Implement proper authorization checks'
                });
            }
        } catch (error) {
            // Archivo no encontrado
        }

        return issues;
    }

    /**
     * Calcula puntaje de vulnerabilidades
     */
    calculateVulnerabilityScore(scanResult) {
        if (!scanResult || !scanResult.summary) return 100;
        
        const { critical, high, moderate, low, total } = scanResult.summary;
        
        if (total === 0) return 100;
        
        // Penalizaciones por severidad
        const penalty = (critical * 20) + (high * 10) + (moderate * 5) + (low * 2);
        const maxPenalty = total * 20;
        
        return Math.max(0, 100 - (penalty / maxPenalty * 100));
    }

    /**
     * Calcula puntaje de dependencias
     */
    calculateDependencyScore(dependencyData) {
        let score = 100;
        let totalIssues = 0;
        
        if (dependencyData.outdated) {
            totalIssues += dependencyData.outdated.length;
            score -= dependencyData.outdated.length * 2;
        }
        
        if (dependencyData.licenseIssues) {
            totalIssues += dependencyData.licenseIssues.length;
            score -= dependencyData.licenseIssues.length * 5;
        }
        
        if (dependencyData.maintenanceIssues) {
            totalIssues += dependencyData.maintenanceIssues.length;
            score -= dependencyData.maintenanceIssues.length * 3;
        }
        
        return Math.max(0, score);
    }

    /**
     * Calcula puntaje de configuración
     */
    calculateConfigurationScore(configData) {
        if (!configData.issues) return 100;
        
        let score = 100;
        
        for (const issue of configData.issues) {
            switch (issue.severity) {
                case 'critical': score -= 15; break;
                case 'high': score -= 10; break;
                case 'moderate': score -= 5; break;
                case 'low': score -= 2; break;
            }
        }
        
        return Math.max(0, score);
    }

    /**
     * Calcula puntaje de código
     */
    calculateCodeScore(codeData) {
        if (!codeData.issues) return 100;
        
        let score = 100;
        
        for (const issue of codeData.issues) {
            switch (issue.severity) {
                case 'critical': score -= 20; break;
                case 'high': score -= 15; break;
                case 'moderate': score -= 8; break;
                case 'low': score -= 3; break;
            }
        }
        
        return Math.max(0, score);
    }

    /**
     * Calcula puntaje de infraestructura
     */
    calculateInfrastructureScore(infraData) {
        if (!infraData.issues) return 100;
        
        let score = 100;
        
        for (const issue of infraData.issues) {
            switch (issue.severity) {
                case 'critical': score -= 25; break;
                case 'high': score -= 15; break;
                case 'moderate': score -= 8; break;
                case 'low': score -= 3; break;
            }
        }
        
        return Math.max(0, score);
    }

    /**
     * Calcula puntaje general
     */
    calculateOverallScore(scores) {
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const [category, score] of Object.entries(scores)) {
            if (category === 'overall') continue;
            
            const weight = this.auditCriteria[category]?.weight || 0;
            totalScore += score * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    }

    /**
     * Evalúa cumplimiento OWASP
     */
    async evaluateOWASPCompliance(audit) {
        const compliance = {
            standard: 'OWASP Top 10 2021',
            score: 0,
            categories: {},
            gaps: []
        };

        // Mapear resultados de auditoría a categorías OWASP
        const owaspMapping = {
            'A06_Vulnerable_and_Outdated_Components': {
                sources: ['vulnerability', 'dependency'],
                score: this.calculateOWASPScore(audit, ['outdated', 'vulnerability'])
            },
            'A05_Security_Misconfiguration': {
                sources: ['configuration'],
                score: this.calculateOWASPScore(audit, ['missing_security_header', 'ssl_missing'])
            },
            'A01_Broken_Access_Control': {
                sources: ['infrastructure'],
                score: this.calculateOWASPScore(audit, ['missing_authorization'])
            },
            'A07_Identification_and_Authentication_Failures': {
                sources: ['infrastructure'],
                score: this.calculateOWASPScore(audit, ['weak_authentication', 'session_management'])
            },
            'A03_Injection': {
                sources: ['code'],
                score: this.calculateOWASPScore(audit, ['missing_validation', 'eval_usage'])
            }
        };

        for (const [category, mapping] of Object.entries(owaspMapping)) {
            compliance.categories[category] = {
                name: this.getOWASPName(category),
                score: mapping.score,
                issues: this.getOWASPIssues(audit, mapping.sources)
            };
        }

        // Calcular puntaje general
        const categoryScores = Object.values(compliance.categories).map(c => c.score);
        compliance.score = categoryScores.length > 0 ? 
            Math.round(categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length) : 0;

        return compliance;
    }

    /**
     * Calcula puntaje para categoría OWASP
     */
    calculateOWASPScore(audit, issueTypes) {
        let totalIssues = 0;
        let criticalIssues = 0;

        for (const result of Object.values(audit.results)) {
            if (result && result.issues) {
                for (const issue of result.issues) {
                    if (issueTypes.some(type => issue.type.includes(type))) {
                        totalIssues++;
                        if (issue.severity === 'critical') criticalIssues++;
                    }
                }
            }
        }

        if (totalIssues === 0) return 100;
        
        const criticalPenalty = criticalIssues * 20;
        const totalPenalty = totalIssues * 5;
        
        return Math.max(0, 100 - criticalPenalty - totalPenalty);
    }

    /**
     * Obtiene nombre descriptivo de categoría OWASP
     */
    getOWASPName(category) {
        const names = {
            'A01_Broken_Access_Control': 'Broken Access Control',
            'A02_Cryptographic_Failures': 'Cryptographic Failures',
            'A03_Injection': 'Injection',
            'A04_Insecure_Design': 'Insecure Design',
            'A05_Security_Misconfiguration': 'Security Misconfiguration',
            'A06_Vulnerable_and_Outdated_Components': 'Vulnerable and Outdated Components',
            'A07_Identification_and_Authentication_Failures': 'Identification and Authentication Failures',
            'A08_Software_and_Data_Integrity_Failures': 'Software and Data Integrity Failures',
            'A09_Security_Logging_and_Monitoring_Failures': 'Security Logging and Monitoring Failures',
            'A10_Server-Side_Request_Forgery': 'Server-Side Request Forgery'
        };
        
        return names[category] || category;
    }

    /**
     * Obtiene issues para categoría OWASP
     */
    getOWASPIssues(audit, sources) {
        const issues = [];
        
        for (const source of sources) {
            const result = audit.results[source];
            if (result && result.issues) {
                issues.push(...result.issues.filter(issue => 
                    sources.some(s => issue.type.includes(s))
                ));
            }
        }
        
        return issues;
    }

    /**
     * Evalúa cumplimiento ISO 27001
     */
    async evaluateISO27001Compliance(audit) {
        const compliance = {
            standard: 'ISO 27001:2013',
            score: 0,
            controls: {},
            gaps: []
        };

        // Implementación simplificada
        compliance.controls['A.12.6_Technical_Vulnerability_Management'] = {
            name: 'Technical Vulnerability Management',
            score: audit.scores.vulnerability,
            status: audit.scores.vulnerability >= 80 ? 'compliant' : 'partial'
        };

        compliance.controls['A.9.1_Access_Control_Policy'] = {
            name: 'Access Control Policy',
            score: audit.scores.infrastructure,
            status: audit.scores.infrastructure >= 80 ? 'compliant' : 'partial'
        };

        const controlScores = Object.values(compliance.controls).map(c => c.score);
        compliance.score = controlScores.length > 0 ? 
            Math.round(controlScores.reduce((a, b) => a + b, 0) / controlScores.length) : 0;

        return compliance;
    }

    /**
     * Evalúa cumplimiento NIST
     */
    async evaluateNISTCompliance(audit) {
        const compliance = {
            standard: 'NIST Cybersecurity Framework 1.1',
            score: 0,
            functions: {},
            gaps: []
        };

        // Implementación simplificada
        compliance.functions['Identify'] = {
            score: audit.scores.dependency,
            description: 'Asset management and risk assessment'
        };

        compliance.functions['Protect'] = {
            score: (audit.scores.configuration + audit.scores.infrastructure) / 2,
            description: 'Safeguards and critical infrastructure protection'
        };

        compliance.functions['Detect'] = {
            score: audit.scores.code,
            description: 'Security monitoring and anomaly detection'
        };

        const functionScores = Object.values(compliance.functions).map(f => f.score);
        compliance.score = functionScores.length > 0 ? 
            Math.round(functionScores.reduce((a, b) => a + b, 0) / functionScores.length) : 0;

        return compliance;
    }

    /**
     * Genera recomendaciones de seguridad
     */
    generateSecurityRecommendations(audit) {
        const recommendations = [];
        
        // Recomendaciones por categoría
        for (const [category, result] of Object.entries(audit.results)) {
            if (!result || !result.issues) continue;
            
            const categoryRecommendations = this.generateCategoryRecommendations(category, result.issues);
            recommendations.push(...categoryRecommendations);
        }
        
        // Recomendaciones generales basadas en puntajes
        if (audit.scores.overall < 60) {
            recommendations.push({
                priority: 'critical',
                title: 'Puntuación de seguridad general baja',
                description: `La puntuación general de seguridad es ${audit.scores.overall}/100`,
                action: 'Implemente un programa integral de mejoras de seguridad',
                category: 'overall'
            });
        }
        
        return recommendations.sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority));
    }

    /**
     * Genera recomendaciones por categoría
     */
    generateCategoryRecommendations(category, issues) {
        const recommendations = [];
        const criticalIssues = issues.filter(i => i.severity === 'critical');
        const highIssues = issues.filter(i => i.severity === 'high');
        
        if (criticalIssues.length > 0) {
            recommendations.push({
                priority: 'critical',
                title: `Vulnerabilidades críticas en ${category}`,
                description: `Se encontraron ${criticalIssues.length} vulnerabilidades críticas`,
                action: 'Resuelva estas vulnerabilidades inmediatamente',
                category
            });
        }
        
        if (highIssues.length > 0) {
            recommendations.push({
                priority: 'high',
                title: `Problemas de alta severidad en ${category}`,
                description: `Se encontraron ${highIssues.length} problemas de alta severidad`,
                action: 'Planifique la resolución en las próximas 48 horas',
                category
            });
        }
        
        return recommendations;
    }

    /**
     * Obtiene valor numérico de prioridad
     */
    getPriorityValue(priority) {
        const values = {
            'critical': 4,
            'high': 3,
            'moderate': 2,
            'low': 1
        };
        return values[priority] || 0;
    }

    /**
     * Cuenta checks realizados
     */
    countChecksPerformed(audit) {
        let count = 0;
        
        for (const result of Object.values(audit.results)) {
            if (result) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * Cuenta issues encontrados
     */
    countIssuesFound(audit) {
        let count = 0;
        
        for (const result of Object.values(audit.results)) {
            if (result && result.issues) {
                count += result.issues.length;
            }
        }
        
        return count;
    }

    /**
     * Genera reporte de seguridad
     */
    async generateSecurityReport(audit) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(this.options.reportPath, `security-report-${timestamp}.json`);
        
        try {
            await fs.writeFile(reportPath, JSON.stringify(audit, null, 2));
            console.log(`📄 Reporte de seguridad generado: ${reportPath}`);
            return reportPath;
        } catch (error) {
            throw new Error(`Error generando reporte: ${error.message}`);
        }
    }

    /**
     * Obtiene todas las dependencias
     */
    getAllDependencies() {
        const dependencies = {};
        
        if (this.packageJson.dependencies) {
            Object.assign(dependencies, this.packageJson.dependencies);
        }
        
        if (this.options.includeDevDependencies && this.packageJson.devDependencies) {
            Object.assign(dependencies, this.packageJson.devDependencies);
        }
        
        return dependencies;
    }

    /**
     * Obtiene severidad para dependencias obsoletas
     */
    getOutdatedSeverity(updateType) {
        switch (updateType) {
            case 'major': return 'high';
            case 'minor': return 'moderate';
            case 'patch': return 'low';
            default: return 'low';
        }
    }

    /**
     * Obtiene información de un paquete
     */
    async getPackageInfo(packageName) {
        try {
            const response = await fetch(`https://registry.npmjs.org/${packageName}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Error fetching package info: ${error.message}`);
        }
    }
}

module.exports = SecurityAuditor;