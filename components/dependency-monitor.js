/**
 * DependencyMonitor - Sistema de monitoreo continuo de dependencias
 * 
 * Este módulo proporciona funcionalidades para:
 * - Monitorear dependencias en tiempo real
 * - Detectar cambios y actualizaciones
 * - Enviar alertas de seguridad
 * - Generar métricas de dependencias
 * - Programar escaneos automáticos
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');
const cron = require('node-cron');

class DependencyMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            projectPath: options.projectPath || process.cwd(),
            checkInterval: options.checkInterval || 'hourly', // '5min', '15min', '30min', 'hourly', 'daily'
            alertThreshold: options.alertThreshold || 'moderate', // 'low', 'moderate', 'high', 'critical'
            enableNotifications: options.enableNotifications !== false,
            notificationChannels: options.notificationChannels || ['console', 'log'],
            enableMetrics: options.enableMetrics !== false,
            metricsRetention: options.metricsRetention || 30, // días
            enableAutoUpdates: options.enableAutoUpdates || false,
            autoUpdatePolicy: options.autoUpdatePolicy || 'safe', // 'safe', 'patch', 'minor'
            ...options
        };
        
        this.packageJsonPath = path.join(this.options.projectPath, 'package.json');
        this.packageLockPath = path.join(this.options.projectPath, 'package-lock.json');
        this.metricsPath = path.join(this.options.projectPath, 'dependency-metrics.json');
        
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.currentSnapshot = null;
        this.previousSnapshot = null;
        this.metrics = {
            history: [],
            alerts: [],
            trends: {},
            summary: {}
        };
        
        // Estado del monitoreo
        this.status = {
            lastCheck: null,
            lastUpdate: null,
            totalChecks: 0,
            totalAlerts: 0,
            totalUpdates: 0,
            uptime: 0
        };
        
        // Patrones de alerta
        this.alertPatterns = {
            security: {
                vulnerability: {
                    severity: ['critical', 'high'],
                    message: 'Vulnerabilidad crítica detectada en dependencia'
                },
                deprecated: {
                    message: 'Dependencia obsoleta detectada'
                },
                license: {
                    restricted: ['GPL-2.0', 'GPL-3.0', 'AGPL'],
                    message: 'Licencia restringida detectada'
                }
            },
            version: {
                major: {
                    message: 'Actualización major disponible'
                },
                breaking: {
                    message: 'Cambio breaking detectado'
                },
                conflict: {
                    message: 'Conflicto de versiones detectado'
                }
            },
            maintenance: {
                abandoned: {
                    days: 365,
                    message: 'Dependencia potencialmente abandonada'
                },
                inactive: {
                    days: 180,
                    message: 'Dependencia inactiva detectada'
                }
            }
        };
    }

    /**
     * Inicializa el monitor de dependencias
     */
    async initialize() {
        try {
            await this.loadMetrics();
            await this.createInitialSnapshot();
            await this.ensureMetricsDirectory();
            
            console.log('✅ DependencyMonitor inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar DependencyMonitor:', error.message);
            throw error;
        }
    }

    /**
     * Inicia el monitoreo continuo
     */
    async startMonitoring() {
        if (this.isMonitoring) {
            console.warn('⚠️ El monitoreo ya está activo');
            return;
        }

        try {
            console.log('🔍 Iniciando monitoreo continuo de dependencias...');
            
            this.isMonitoring = true;
            this.status.uptime = Date.now();
            
            // Configurar intervalo de monitoreo
            const intervalMs = this.getIntervalMilliseconds(this.options.checkInterval);
            
            this.monitoringInterval = setInterval(async () => {
                await this.performMonitoringCycle();
            }, intervalMs);
            
            // Ejecutar primer ciclo inmediatamente
            await this.performMonitoringCycle();
            
            console.log(`✅ Monitoreo iniciado con intervalo: ${this.options.checkInterval}`);
            this.emit('monitoring:started', { interval: this.options.checkInterval });
            
        } catch (error) {
            console.error('❌ Error iniciando monitoreo:', error.message);
            throw error;
        }
    }

    /**
     * Detiene el monitoreo continuo
     */
    async stopMonitoring() {
        if (!this.isMonitoring) {
            console.warn('⚠️ El monitoreo no está activo');
            return;
        }

        try {
            console.log('⏹️ Deteniendo monitoreo continuo...');
            
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }
            
            this.isMonitoring = false;
            const uptime = Date.now() - this.status.uptime;
            
            console.log(`✅ Monitoreo detenido. Uptime: ${Math.round(uptime / 1000)}s`);
            this.emit('monitoring:stopped', { uptime });
            
        } catch (error) {
            console.error('❌ Error deteniendo monitoreo:', error.message);
            throw error;
        }
    }

    /**
     * Realiza un ciclo completo de monitoreo
     */
    async performMonitoringCycle() {
        try {
            const cycleStart = Date.now();
            
            // Guardar snapshot anterior
            this.previousSnapshot = this.currentSnapshot;
            
            // Crear nuevo snapshot
            this.currentSnapshot = await this.createDependencySnapshot();
            
            // Analizar cambios
            const changes = await this.analyzeChanges(this.previousSnapshot, this.currentSnapshot);
            
            // Verificar seguridad
            const securityIssues = await this.checkSecurityIssues(this.currentSnapshot);
            
            // Actualizar métricas
            await this.updateMetrics(changes, securityIssues);
            
            // Generar alertas
            const alerts = await this.generateAlerts(changes, securityIssues);
            
            // Enviar notificaciones
            if (alerts.length > 0) {
                await this.sendNotifications(alerts);
            }
            
            // Ejecutar auto-actualizaciones si está habilitado
            if (this.options.enableAutoUpdates && changes.updates.length > 0) {
                await this.performAutoUpdates(changes.updates);
            }
            
            // Actualizar estado
            this.status.lastCheck = new Date().toISOString();
            this.status.totalChecks++;
            
            const cycleDuration = Date.now() - cycleStart;
            
            // Emitir eventos
            this.emit('monitoring:cycle', {
                timestamp: this.status.lastCheck,
                duration: cycleDuration,
                changes,
                securityIssues,
                alerts: alerts.length
            });
            
            console.log(`🔄 Ciclo de monitoreo completado en ${cycleDuration}ms - ${alerts.length} alertas`);
            
        } catch (error) {
            console.error('❌ Error en ciclo de monitoreo:', error.message);
            this.emit('monitoring:error', { error: error.message, timestamp: new Date().toISOString() });
        }
    }

    /**
     * Crea un snapshot del estado actual de dependencias
     */
    async createDependencySnapshot() {
        try {
            const packageJson = await fs.readFile(this.packageJsonPath, 'utf8');
            const packageData = JSON.parse(packageJson);
            
            let packageLockData = null;
            try {
                const packageLock = await fs.readFile(this.packageLockPath, 'utf8');
                packageLockData = JSON.parse(packageLock);
            } catch {
                // package-lock.json no encontrado
            }
            
            const snapshot = {
                timestamp: new Date().toISOString(),
                dependencies: {},
                devDependencies: {},
                metadata: {
                    nodeVersion: process.version,
                    npmVersion: this.getNpmVersion(),
                    platform: process.platform,
                    projectVersion: packageData.version
                }
            };
            
            // Procesar dependencias principales
            if (packageData.dependencies) {
                for (const [name, version] of Object.entries(packageData.dependencies)) {
                    snapshot.dependencies[name] = {
                        version,
                        type: 'production',
                        info: await this.getPackageInfo(name),
                        lockVersion: this.getLockVersion(packageLockData, name),
                        lastChecked: new Date().toISOString()
                    };
                }
            }
            
            // Procesar dependencias de desarrollo
            if (packageData.devDependencies) {
                for (const [name, version] of Object.entries(packageData.devDependencies)) {
                    snapshot.devDependencies[name] = {
                        version,
                        type: 'development',
                        info: await this.getPackageInfo(name),
                        lockVersion: this.getLockVersion(packageLockData, name),
                        lastChecked: new Date().toISOString()
                    };
                }
            }
            
            return snapshot;
        } catch (error) {
            throw new Error(`Error creando snapshot: ${error.message}`);
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
            const data = await response.json();
            
            return {
                latestVersion: data['dist-tags']?.latest,
                description: data.description,
                license: data.license,
                deprecated: data.deprecated,
                repository: data.repository,
                homepage: data.homepage,
                maintainers: data.maintainers,
                publishDate: data.time?.modified,
                downloads: this.getDownloadStats(data)
            };
        } catch (error) {
            return {
                error: error.message,
                lastChecked: new Date().toISOString()
            };
        }
    }

    /**
     * Obtiene estadísticas de descargas
     */
    getDownloadStats(packageData) {
        if (!packageData.downloads) {
            return null;
        }
        
        const downloads = packageData.downloads;
        return {
            lastWeek: downloads.last_week || 0,
            lastMonth: downloads.last_month || 0,
            lastYear: downloads.last_year || 0,
            total: downloads.total || 0
        };
    }

    /**
     * Obtiene versión desde package-lock.json
     */
    getLockVersion(packageLockData, packageName) {
        if (!packageLockData || !packageLockData.dependencies) {
            return null;
        }
        
        // Buscar en el árbol de dependencias
        return this.findVersionInLockTree(packageLockData.dependencies, packageName);
    }

    /**
     * Busca versión recursivamente en el árbol de lock
     */
    findVersionInLockTree(dependencies, packageName) {
        for (const [name, info] of Object.entries(dependencies)) {
            if (name === packageName) {
                return info.version;
            }
            
            if (info.dependencies) {
                const found = this.findVersionInLockTree(info.dependencies, packageName);
                if (found) return found;
            }
        }
        
        return null;
    }

    /**
     * Analiza cambios entre snapshots
     */
    async analyzeChanges(previousSnapshot, currentSnapshot) {
        const changes = {
            added: [],
            removed: [],
            updated: [],
            downgraded: [],
            updates: [],
            metadata: {
                totalDependencies: 0,
                totalChanges: 0,
                changeTypes: {}
            }
        };
        
        if (!previousSnapshot) {
            // Primer snapshot - todas las dependencias son "agregadas"
            this.processInitialSnapshot(currentSnapshot, changes);
            return changes;
        }
        
        // Analizar dependencias de producción
        this.analyzeDependencyChanges(
            previousSnapshot.dependencies,
            currentSnapshot.dependencies,
            changes,
            'production'
        );
        
        // Analizar dependencias de desarrollo
        this.analyzeDependencyChanges(
            previousSnapshot.devDependencies,
            currentSnapshot.devDependencies,
            changes,
            'development'
        );
        
        // Calcular métricas
        changes.metadata.totalDependencies = 
            Object.keys(currentSnapshot.dependencies).length + 
            Object.keys(currentSnapshot.devDependencies).length;
        changes.metadata.totalChanges = 
            changes.added.length + changes.removed.length + 
            changes.updated.length + changes.downgraded.length;
        
        // Contar tipos de cambios
        for (const change of [...changes.added, ...changes.removed, ...changes.updated, ...changes.downgraded]) {
            const type = change.type;
            changes.metadata.changeTypes[type] = (changes.metadata.changeTypes[type] || 0) + 1;
        }
        
        return changes;
    }

    /**
     * Procesa el snapshot inicial
     */
    processInitialSnapshot(snapshot, changes) {
        // Todas las dependencias son consideradas "agregadas"
        for (const [name, info] of Object.entries(snapshot.dependencies)) {
            changes.added.push({
                name,
                version: info.version,
                type: 'production',
                changeType: 'added',
                timestamp: new Date().toISOString()
            });
        }
        
        for (const [name, info] of Object.entries(snapshot.devDependencies)) {
            changes.added.push({
                name,
                version: info.version,
                type: 'development',
                changeType: 'added',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Analiza cambios en dependencias específicas
     */
    analyzeDependencyChanges(previous, current, changes, dependencyType) {
        // Dependencias agregadas
        for (const [name, info] of Object.entries(current)) {
            if (!previous[name]) {
                changes.added.push({
                    name,
                    version: info.version,
                    type: dependencyType,
                    changeType: 'added',
                    timestamp: new Date().toISOString(),
                    info: info.info
                });
            }
        }
        
        // Dependencias eliminadas
        for (const [name, info] of Object.entries(previous)) {
            if (!current[name]) {
                changes.removed.push({
                    name,
                    version: info.version,
                    type: dependencyType,
                    changeType: 'removed',
                    timestamp: new Date().toISOString(),
                    info: info.info
                });
            }
        }
        
        // Dependencias actualizadas o degradadas
        for (const [name, currentInfo] of Object.entries(current)) {
            if (previous[name]) {
                const previousInfo = previous[name];
                const versionComparison = this.compareVersions(
                    previousInfo.version,
                    currentInfo.version
                );
                
                if (versionComparison !== 0) {
                    const change = {
                        name,
                        previousVersion: previousInfo.version,
                        currentVersion: currentInfo.version,
                        type: dependencyType,
                        timestamp: new Date().toISOString(),
                        info: currentInfo.info
                    };
                    
                    if (versionComparison > 0) {
                        change.changeType = 'updated';
                        changes.updated.push(change);
                        changes.updates.push(change);
                    } else {
                        change.changeType = 'downgraded';
                        changes.downgraded.push(change);
                    }
                }
            }
        }
    }

    /**
     * Compara dos versiones
     */
    compareVersions(version1, version2) {
        const v1 = this.normalizeVersion(version1);
        const v2 = this.normalizeVersion(version2);
        
        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            const num1 = v1[i] || 0;
            const num2 = v2[i] || 0;
            
            if (num1 < num2) return -1;
            if (num1 > num2) return 1;
        }
        
        return 0;
    }

    /**
     * Normaliza una versión para comparación
     */
    normalizeVersion(version) {
        // Eliminar prefijos como ^, ~, >=, etc.
        const cleanVersion = version.replace(/^[^\d]*/, '');
        return cleanVersion.split('.').map(part => parseInt(part) || 0);
    }

    /**
     * Verifica issues de seguridad
     */
    async checkSecurityIssues(snapshot) {
        const issues = {
            vulnerabilities: [],
            deprecated: [],
            licenseIssues: [],
            maintenance: []
        };
        
        // Verificar dependencias de producción
        for (const [name, info] of Object.entries(snapshot.dependencies)) {
            const packageIssues = await this.checkPackageSecurity(name, info);
            
            if (packageIssues.vulnerabilities.length > 0) {
                issues.vulnerabilities.push(...packageIssues.vulnerabilities);
            }
            
            if (packageIssues.deprecated) {
                issues.deprecated.push({
                    name,
                    version: info.version,
                    type: 'production',
                    info: info.info
                });
            }
            
            if (packageIssues.licenseIssues.length > 0) {
                issues.licenseIssues.push(...packageIssues.licenseIssues);
            }
            
            if (packageIssues.maintenance.length > 0) {
                issues.maintenance.push(...packageIssues.maintenance);
            }
        }
        
        // Verificar dependencias de desarrollo
        for (const [name, info] of Object.entries(snapshot.devDependencies)) {
            const packageIssues = await this.checkPackageSecurity(name, info);
            
            if (packageIssues.vulnerabilities.length > 0) {
                issues.vulnerabilities.push(...packageIssues.vulnerabilities);
            }
            
            if (packageIssues.deprecated) {
                issues.deprecated.push({
                    name,
                    version: info.version,
                    type: 'development',
                    info: info.info
                });
            }
            
            if (packageIssues.licenseIssues.length > 0) {
                issues.licenseIssues.push(...packageIssues.licenseIssues);
            }
            
            if (packageIssues.maintenance.length > 0) {
                issues.maintenance.push(...packageIssues.maintenance);
            }
        }
        
        return issues;
    }

    /**
     * Verifica seguridad de un paquete específico
     */
    async checkPackageSecurity(packageName, info) {
        const issues = {
            vulnerabilities: [],
            deprecated: false,
            licenseIssues: [],
            maintenance: []
        };
        
        if (!info.info || info.info.error) {
            return issues;
        }
        
        // Verificar si está deprecado
        if (info.info.deprecated) {
            issues.deprecated = true;
        }
        
        // Verificar licencia
        if (info.info.license) {
            const licenseIssues = this.checkLicense(info.info.license);
            if (licenseIssues.length > 0) {
                issues.licenseIssues = licenseIssues;
            }
        }
        
        // Verificar mantenimiento
        const maintenanceIssues = this.checkMaintenance(info.info);
        if (maintenanceIssues.length > 0) {
            issues.maintenance = maintenanceIssues;
        }
        
        // Verificar vulnerabilidades conocidas
        const vulnerabilities = await this.checkVulnerabilities(packageName, info.version);
        if (vulnerabilities.length > 0) {
            issues.vulnerabilities = vulnerabilities;
        }
        
        return issues;
    }

    /**
     * Verifica problemas de licencia
     */
    checkLicense(license) {
        const issues = [];
        
        if (Array.isArray(license)) {
            for (const lic of license) {
                if (this.isRestrictedLicense(lic)) {
                    issues.push({
                        license: lic,
                        restricted: true,
                        reason: 'Restricted license detected'
                    });
                }
            }
        } else if (typeof license === 'string') {
            if (this.isRestrictedLicense(license)) {
                issues.push({
                    license,
                    restricted: true,
                    reason: 'Restricted license detected'
                });
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
        
        return restrictedLicenses.includes(license);
    }

    /**
     * Verifica estado de mantenimiento
     */
    checkMaintenance(packageInfo) {
        const issues = [];
        
        if (!packageInfo.publishDate) {
            return issues;
        }
        
        const daysSinceUpdate = this.getDaysSince(packageInfo.publishDate);
        
        if (daysSinceUpdate > 365) {
            issues.push({
                type: 'abandoned',
                days: daysSinceUpdate,
                reason: 'Package appears to be abandoned'
            });
        } else if (daysSinceUpdate > 180) {
            issues.push({
                type: 'inactive',
                days: daysSinceUpdate,
                reason: 'Package has infrequent updates'
            });
        }
        
        return issues;
    }

    /**
     * Calcula días desde una fecha
     */
    getDaysSince(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now - date;
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Verifica vulnerabilidades conocidas
     */
    async checkVulnerabilities(packageName, version) {
        // Implementación simplificada - en producción usaría bases de datos de vulnerabilidades
        const vulnerabilities = [];
        
        // Simular verificación de vulnerabilidades
        // En producción, esto consultaría bases de datos como OSV, GitHub Advisory, etc.
        
        return vulnerabilities;
    }

    /**
     * Actualiza métricas
     */
    async updateMetrics(changes, securityIssues) {
        const timestamp = new Date().toISOString();
        
        // Crear entrada de métricas
        const metricEntry = {
            timestamp,
            changes: {
                added: changes.added.length,
                removed: changes.removed.length,
                updated: changes.updated.length,
                downgraded: changes.downgraded.length,
                total: changes.metadata.totalChanges
            },
            security: {
                vulnerabilities: securityIssues.vulnerabilities.length,
                deprecated: securityIssues.deprecated.length,
                licenseIssues: securityIssues.licenseIssues.length,
                maintenance: securityIssues.maintenance.length
            },
            summary: {
                totalDependencies: changes.metadata.totalDependencies,
                healthScore: this.calculateHealthScore(changes, securityIssues)
            }
        };
        
        // Agregar al historial
        this.metrics.history.push(metricEntry);
        
        // Mantener solo las métricas recientes
        const retentionDays = this.options.metricsRetention;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        
        this.metrics.history = this.metrics.history.filter(
            entry => new Date(entry.timestamp) > cutoffDate
        );
        
        // Actualizar resumen
        this.updateSummaryMetrics();
        
        // Guardar métricas
        await this.saveMetrics();
    }

    /**
     * Calcula puntaje de salud
     */
    calculateHealthScore(changes, securityIssues) {
        let score = 100;
        
        // Penalizar cambios
        score -= changes.downgraded.length * 10;
        score -= changes.updated.length * 2;
        
        // Penalizar issues de seguridad
        score -= securityIssues.vulnerabilities.length * 15;
        score -= securityIssues.deprecated.length * 5;
        score -= securityIssues.licenseIssues.length * 3;
        score -= securityIssues.maintenance.length * 2;
        
        return Math.max(0, score);
    }

    /**
     * Actualiza métricas de resumen
     */
    updateSummaryMetrics() {
        if (this.metrics.history.length === 0) {
            return;
        }
        
        const latest = this.metrics.history[this.metrics.history.length - 1];
        const previous = this.metrics.history.length > 1 ? 
            this.metrics.history[this.metrics.history.length - 2] : null;
        
        this.metrics.summary = {
            lastCheck: latest.timestamp,
            totalDependencies: latest.summary.totalDependencies,
            healthScore: latest.summary.healthScore,
            trend: previous ? latest.summary.healthScore - previous.summary.healthScore : 0,
            totalAlerts: this.metrics.alerts.length,
            uptime: this.isMonitoring ? Date.now() - this.status.uptime : 0
        };
    }

    /**
     * Genera alertas basadas en cambios y issues de seguridad
     */
    async generateAlerts(changes, securityIssues) {
        const alerts = [];
        
        // Alertas de cambios
        for (const change of changes.updated) {
            if (this.shouldAlertForVersionChange(change)) {
                alerts.push({
                    type: 'version_update',
                    severity: this.getUpdateSeverity(change),
                    package: change.name,
                    message: `Actualización disponible: ${change.name} ${change.previousVersion} → ${change.currentVersion}`,
                    timestamp: new Date().toISOString(),
                    details: change
                });
            }
        }
        
        for (const change of changes.downgraded) {
            alerts.push({
                type: 'version_downgrade',
                severity: 'high',
                package: change.name,
                message: `Degradación detectada: ${change.name} ${change.previousVersion} → ${change.currentVersion}`,
                timestamp: new Date().toISOString(),
                details: change
            });
        }
        
        // Alertas de seguridad
        for (const vuln of securityIssues.vulnerabilities) {
            if (this.meetsAlertThreshold(vuln.severity)) {
                alerts.push({
                    type: 'security_vulnerability',
                    severity: vuln.severity || 'unknown',
                    package: vuln.packageName,
                    message: `Vulnerabilidad en ${vuln.packageName}: ${vuln.title}`,
                    timestamp: new Date().toISOString(),
                    details: vuln
                });
            }
        }
        
        for (const deprecated of securityIssues.deprecated) {
            alerts.push({
                type: 'deprecated_package',
                severity: 'moderate',
                package: deprecated.name,
                message: `Paquete deprecado: ${deprecated.name}`,
                timestamp: new Date().toISOString(),
                details: deprecated
            });
        }
        
        for (const license of securityIssues.licenseIssues) {
            if (license.restricted) {
                alerts.push({
                    type: 'license_issue',
                    severity: 'high',
                    package: license.packageName,
                    message: `Licencia restringida: ${license.license}`,
                    timestamp: new Date().toISOString(),
                    details: license
                });
            }
        }
        
        for (const maintenance of securityIssues.maintenance) {
            if (maintenance.type === 'abandoned') {
                alerts.push({
                    type: 'maintenance_abandoned',
                    severity: 'critical',
                    package: maintenance.packageName,
                    message: `Paquete potencialmente abandonado: ${maintenance.packageName}`,
                    timestamp: new Date().toISOString(),
                    details: maintenance
                });
            }
        }
        
        // Agregar alertas al historial
        this.metrics.alerts.push(...alerts);
        
        // Mantener solo alertas recientes
        const alertRetention = 100; // Mantener últimas 100 alertas
        if (this.metrics.alerts.length > alertRetention) {
            this.metrics.alerts = this.metrics.alerts.slice(-alertRetention);
        }
        
        return alerts;
    }

    /**
     * Verifica si un cambio de versión debe generar alerta
     */
    shouldAlertForVersionChange(change) {
        const versionComparison = this.compareVersions(
            change.previousVersion,
            change.currentVersion
        );
        
        // Alertar para actualizaciones major y breaking
        if (versionComparison >= 2) {
            return true;
        }
        
        // Alertar para actualizaciones minor si hay vulnerabilidades
        if (versionComparison === 1 && this.hasKnownVulnerabilities(change.name)) {
            return true;
        }
        
        return false;
    }

    /**
     * Obtiene severidad de actualización
     */
    getUpdateSeverity(change) {
        const versionComparison = this.compareVersions(
            change.previousVersion,
            change.currentVersion
        );
        
        if (versionComparison >= 3) return 'critical';
        if (versionComparison === 2) return 'high';
        if (versionComparison === 1) return 'moderate';
        return 'low';
    }

    /**
     * Verifica si hay vulnerabilidades conocidas
     */
    hasKnownVulnerabilities(packageName) {
        // Implementación simplificada
        return false;
    }

    /**
     * Verifica si una alerta cumple con el umbral
     */
    meetsAlertThreshold(severity) {
        const thresholds = {
            'low': 0,
            'moderate': 1,
            'high': 2,
            'critical': 3
        };
        
        return thresholds[severity] >= thresholds[this.options.alertThreshold];
    }

    /**
     * Envía notificaciones
     */
    async sendNotifications(alerts) {
        if (!this.options.enableNotifications || alerts.length === 0) {
            return;
        }
        
        for (const channel of this.options.notificationChannels) {
            switch (channel) {
                case 'console':
                    this.sendConsoleNotifications(alerts);
                    break;
                case 'log':
                    await this.sendLogNotifications(alerts);
                    break;
                case 'email':
                    await this.sendEmailNotifications(alerts);
                    break;
                case 'webhook':
                    await this.sendWebhookNotifications(alerts);
                    break;
            }
        }
        
        this.status.totalAlerts += alerts.length;
    }

    /**
     * Envía notificaciones a consola
     */
    sendConsoleNotifications(alerts) {
        for (const alert of alerts) {
            const icon = this.getSeverityIcon(alert.severity);
            console.log(`${icon} [${alert.severity.toUpperCase()}] ${alert.message}`);
        }
    }

    /**
     * Envía notificaciones a log
     */
    async sendLogNotifications(alerts) {
        const logFile = path.join(this.options.projectPath, 'dependency-alerts.log');
        
        try {
            const logEntry = alerts.map(alert => 
                `${alert.timestamp} [${alert.severity.toUpperCase()}] ${alert.message}`
            ).join('\n');
            
            await fs.appendFile(logFile, logEntry + '\n');
        } catch (error) {
            console.warn('⚠️ Error escribiendo log de alertas:', error.message);
        }
    }

    /**
     * Envía notificaciones por email
     */
    async sendEmailNotifications(alerts) {
        // Implementación placeholder - en producción usaría servicio de email
        console.log('📧 Notificaciones por email no implementadas');
    }

    /**
     * Envía notificaciones por webhook
     */
    async sendWebhookNotifications(alerts) {
        // Implementación placeholder - en producción haría HTTP POST a webhook
        console.log('🔗 Notificaciones por webhook no implementadas');
    }

    /**
     * Obtiene icono de severidad
     */
    getSeverityIcon(severity) {
        const icons = {
            'low': '🟢',
            'moderate': '🟡',
            'high': '🟠',
            'critical': '🔴'
        };
        
        return icons[severity] || '⚪';
    }

    /**
     * Realiza auto-actualizaciones
     */
    async performAutoUpdates(updates) {
        if (!this.options.enableAutoUpdates || updates.length === 0) {
            return;
        }
        
        console.log(`🔄 Realizando auto-actualizaciones (${this.options.autoUpdatePolicy} policy)...`);
        
        try {
            const DependencyUpdater = require('./dependency-updater');
            const updater = new DependencyUpdater({
                projectPath: this.options.projectPath,
                updatePolicy: this.options.autoUpdatePolicy,
                dryRun: false
            });
            
            await updater.initialize();
            
            // Filtrar actualizaciones según política
            const eligibleUpdates = this.filterUpdatesByPolicy(updates, this.options.autoUpdatePolicy);
            
            if (eligibleUpdates.length > 0) {
                const result = await updater.updateDependencies(eligibleUpdates);
                
                if (result.success) {
                    this.status.totalUpdates += eligibleUpdates.length;
                    console.log(`✅ Auto-actualizaciones completadas: ${eligibleUpdates.length} paquetes`);
                    
                    this.emit('auto-update:completed', {
                        updates: eligibleUpdates.length,
                        policy: this.options.autoUpdatePolicy,
                        result
                    });
                } else {
                    console.error('❌ Error en auto-actualizaciones:', result);
                    
                    this.emit('auto-update:failed', {
                        updates: eligibleUpdates.length,
                        policy: this.options.autoUpdatePolicy,
                        error: result
                    });
                }
            }
            
        } catch (error) {
            console.error('❌ Error en auto-actualizaciones:', error.message);
            
            this.emit('auto-update:error', {
                error: error.message,
                updates: updates.length
            });
        }
    }

    /**
     * Filtra actualizaciones según política
     */
    filterUpdatesByPolicy(updates, policy) {
        switch (policy) {
            case 'safe':
                return updates.filter(update => {
                    const versionComparison = this.compareVersions(
                        update.previousVersion,
                        update.currentVersion
                    );
                    return versionComparison <= 1; // Solo patch y minor
                });
            case 'patch':
                return updates.filter(update => {
                    const versionComparison = this.compareVersions(
                        update.previousVersion,
                        update.currentVersion
                    );
                    return versionComparison === 1 && this.isPatchUpdate(update);
                });
            case 'minor':
                return updates.filter(update => {
                    const versionComparison = this.compareVersions(
                        update.previousVersion,
                        update.currentVersion
                    );
                    return versionComparison <= 2; // Patch y minor
                });
            default:
                return updates;
        }
    }

    /**
     * Verifica si es una actualización patch
     */
    isPatchUpdate(update) {
        const prev = this.normalizeVersion(update.previousVersion);
        const curr = this.normalizeVersion(update.currentVersion);
        
        return prev[0] === curr[0] && prev[1] === curr[1];
    }

    /**
     * Crea snapshot inicial
     */
    async createInitialSnapshot() {
        this.currentSnapshot = await this.createDependencySnapshot();
        console.log('📸 Snapshot inicial creado');
    }

    /**
     * Asegura que el directorio de métricas exista
     */
    async ensureMetricsDirectory() {
        try {
            await fs.access(this.options.projectPath);
        } catch {
            await fs.mkdir(this.options.projectPath, { recursive: true });
        }
    }

    /**
     * Carga métricas guardadas
     */
    async loadMetrics() {
        try {
            const data = await fs.readFile(this.metricsPath, 'utf8');
            this.metrics = JSON.parse(data);
        } catch {
            console.log('📊 No se encontraron métricas previas, iniciando desde cero');
            this.metrics = {
                history: [],
                alerts: [],
                trends: {},
                summary: {}
            };
        }
    }

    /**
     * Guarda métricas
     */
    async saveMetrics() {
        try {
            await fs.writeFile(this.metricsPath, JSON.stringify(this.metrics, null, 2));
        } catch (error) {
            console.warn('⚠️ Error guardando métricas:', error.message);
        }
    }

    /**
     * Obtiene milisegundos para intervalo
     */
    getIntervalMilliseconds(interval) {
        const intervals = {
            '5min': 5 * 60 * 1000,
            '15min': 15 * 60 * 1000,
            '30min': 30 * 60 * 1000,
            'hourly': 60 * 60 * 1000,
            'daily': 24 * 60 * 60 * 1000
        };
        
        return intervals[interval] || intervals.hourly;
    }

    /**
     * Obtiene versión de npm
     */
    getNpmVersion() {
        try {
            const { execSync } = require('child_process');
            return execSync('npm --version', { encoding: 'utf8' }).trim();
        } catch {
            return 'unknown';
        }
    }

    /**
     * Obtiene estado actual del monitoreo
     */
    getStatus() {
        return {
            ...this.status,
            isMonitoring: this.isMonitoring,
            currentSnapshot: this.currentSnapshot ? {
                timestamp: this.currentSnapshot.timestamp,
                totalDependencies: Object.keys(this.currentSnapshot.dependencies).length + Object.keys(this.currentSnapshot.devDependencies).length
            } : null,
            lastAlerts: this.metrics.alerts.slice(-10), // Últimas 10 alertas
            metrics: this.metrics.summary
        };
    }

    /**
     * Obtiene métricas detalladas
     */
    getMetrics(options = {}) {
        const {
            period = options.period || '24h', // '1h', '6h', '24h', '7d', '30d'
            includeAlerts = options.includeAlerts !== false,
            includeTrends = options.includeTrends !== false
        } = options;
        
        const filteredMetrics = {
            history: this.filterMetricsByPeriod(this.metrics.history, period),
            alerts: includeAlerts ? this.metrics.alerts : [],
            trends: includeTrends ? this.calculateTrends() : {},
            summary: this.metrics.summary
        };
        
        return filteredMetrics;
    }

    /**
     * Filtra métricas por período
     */
    filterMetricsByPeriod(history, period) {
        const now = new Date();
        let cutoffDate;
        
        switch (period) {
            case '1h':
                cutoffDate = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '6h':
                cutoffDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
                break;
            case '24h':
                cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
        
        return history.filter(entry => new Date(entry.timestamp) > cutoffDate);
    }

    /**
     * Calcula tendencias
     */
    calculateTrends() {
        const trends = {
            healthScore: this.calculateTrend('healthScore'),
            dependencyCount: this.calculateTrend('totalDependencies'),
            alertFrequency: this.calculateAlertTrend()
        };
        
        return trends;
    }

    /**
     * Calcula tendencia para una métrica específica
     */
    calculateTrend(metricName) {
        if (this.metrics.history.length < 2) {
            return { direction: 'insufficient_data' };
        }
        
        const recent = this.metrics.history.slice(-10);
        const values = recent.map(entry => 
            entry.summary[metricName] || entry.summary.totalDependencies || 0
        );
        
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        const latest = values[values.length - 1];
        const previous = values[values.length - 2] || latest;
        
        let direction = 'stable';
        if (latest > previous * 1.05) {
            direction = 'increasing';
        } else if (latest < previous * 0.95) {
            direction = 'decreasing';
        }
        
        return {
            direction,
            average,
            latest,
            change: latest - previous,
            changePercent: previous !== 0 ? ((latest - previous) / previous * 100).toFixed(2) : 0
        };
    }

    /**
     * Calcula tendencia de frecuencia de alertas
     */
    calculateAlertTrend() {
        if (this.metrics.alerts.length < 2) {
            return { direction: 'insufficient_data' };
        }
        
        const recentAlerts = this.metrics.alerts.slice(-50);
        const now = new Date();
        
        // Calcular alertas por hora en las últimas 24 horas
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const lastDayAlerts = recentAlerts.filter(alert => 
            new Date(alert.timestamp) > dayAgo
        );
        
        const alertsPerHour = lastDayAlerts.length / 24;
        
        let severity = 'normal';
        if (alertsPerHour > 5) {
            severity = 'high';
        } else if (alertsPerHour > 2) {
            severity = 'moderate';
        } else if (alertsPerHour > 0) {
            severity = 'low';
        }
        
        return {
            severity,
            alertsPerHour: Math.round(alertsPerHour * 10) / 10,
            totalLast24h: lastDayAlerts.length,
            trend: this.calculateAlertFrequencyTrend(recentAlerts)
        };
    }

    /**
     * Calcula tendencia de frecuencia de alertas
     */
    calculateAlertFrequencyTrend(alerts) {
        if (alerts.length < 10) {
            return 'stable';
        }
        
        const recent = alerts.slice(-20);
        const firstHalf = recent.slice(0, 10);
        const secondHalf = recent.slice(10);
        
        const firstHalfCount = this.countAlertsInPeriod(firstHalf, 12 * 60 * 60 * 1000);
        const secondHalfCount = this.countAlertsInPeriod(secondHalf, 12 * 60 * 60 * 1000);
        
        if (secondHalfCount > firstHalfCount * 1.2) {
            return 'increasing';
        } else if (secondHalfCount < firstHalfCount * 0.8) {
            return 'decreasing';
        }
        
        return 'stable';
    }

    /**
     * Cuenta alertas en un período
     */
    countAlertsInPeriod(alerts, periodMs) {
        if (alerts.length === 0) return 0;
        
        const oldestTimestamp = new Date(alerts[0].timestamp).getTime();
        const newestTimestamp = new Date(alerts[alerts.length - 1].timestamp).getTime();
        const periodRange = newestTimestamp - oldestTimestamp;
        
        if (periodRange > periodMs) {
            // Contar solo alertas en el período especificado
            const cutoffTime = newestTimestamp - periodMs;
            return alerts.filter(alert => new Date(alert.timestamp).getTime() > cutoffTime).length;
        }
        
        return alerts.length;
    }

    /**
     * Exporta configuración y estado
     */
    exportConfiguration() {
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            options: this.options,
            status: this.getStatus(),
            alertPatterns: this.alertPatterns,
            metrics: {
                retention: this.options.metricsRetention,
                historySize: this.metrics.history.length,
                alertsSize: this.metrics.alerts.length
            }
        };
    }

    /**
     * Programa monitoreo con cron
     */
    scheduleMonitoring(cronExpression) {
        try {
            // Validar expresión cron
            if (!cron.validate(cronExpression)) {
                throw new Error('Expresión cron inválida');
            }
            
            // Programar tarea
            cron.schedule(cronExpression, async () => {
                await this.performMonitoringCycle();
            }, {
                scheduled: true,
                timezone: 'America/New_York'
            });
            
            console.log(`⏰ Monitoreo programado con: ${cronExpression}`);
        } catch (error) {
            console.error('❌ Error programando monitoreo:', error.message);
            throw error;
        }
    }
}

module.exports = DependencyMonitor;