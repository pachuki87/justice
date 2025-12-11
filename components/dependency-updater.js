/**
 * DependencyUpdater - Sistema centralizado de actualización de dependencias
 * 
 * Este módulo proporciona funcionalidades para:
 * - Actualizar dependencias de forma segura
 * - Gestionar versiones y conflictos
 * - Realizar backups antes de actualizaciones
 * - Validar compatibilidad
 * - Generar reportes de actualización
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class DependencyUpdater {
    constructor(options = {}) {
        this.options = {
            projectPath: options.projectPath || process.cwd(),
            backupPath: options.backupPath || path.join(options.projectPath || process.cwd(), 'backups'),
            autoBackup: options.autoBackup !== false,
            dryRun: options.dryRun || false,
            updatePolicy: options.updatePolicy || 'safe', // 'safe', 'latest', 'patch'
            excludePackages: options.excludePackages || [],
            includeDevDependencies: options.includeDevDependencies !== false,
            ...options
        };
        
        this.packageJsonPath = path.join(this.options.projectPath, 'package.json');
        this.packageLockPath = path.join(this.options.projectPath, 'package-lock.json');
        this.updateHistory = [];
        this.currentOperation = null;
    }

    /**
     * Inicializa el sistema de actualización
     */
    async initialize() {
        try {
            await this.ensureBackupDirectory();
            await this.loadCurrentState();
            console.log('✅ DependencyUpdater inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar DependencyUpdater:', error.message);
            throw error;
        }
    }

    /**
     * Asegura que el directorio de backups exista
     */
    async ensureBackupDirectory() {
        try {
            await fs.access(this.options.backupPath);
        } catch {
            await fs.mkdir(this.options.backupPath, { recursive: true });
        }
    }

    /**
     * Carga el estado actual de las dependencias
     */
    async loadCurrentState() {
        try {
            const packageJson = await fs.readFile(this.packageJsonPath, 'utf8');
            this.currentPackageJson = JSON.parse(packageJson);
            
            try {
                const packageLock = await fs.readFile(this.packageLockPath, 'utf8');
                this.currentPackageLock = JSON.parse(packageLock);
            } catch {
                console.warn('⚠️ No se encontró package-lock.json');
                this.currentPackageLock = null;
            }
        } catch (error) {
            throw new Error(`Error al cargar estado actual: ${error.message}`);
        }
    }

    /**
     * Realiza un backup completo antes de la actualización
     */
    async createBackup(description = 'Pre-update backup') {
        if (!this.options.autoBackup) {
            return null;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.options.backupPath, `backup-${timestamp}`);
        
        try {
            await fs.mkdir(backupDir, { recursive: true });
            
            // Backup de package.json
            await fs.copyFile(
                this.packageJsonPath,
                path.join(backupDir, 'package.json')
            );
            
            // Backup de package-lock.json si existe
            if (this.currentPackageLock) {
                await fs.copyFile(
                    this.packageLockPath,
                    path.join(backupDir, 'package-lock.json')
                );
            }
            
            // Crear metadata del backup
            const backupMetadata = {
                timestamp: new Date().toISOString(),
                description,
                packageVersion: this.currentPackageJson.version,
                dependencies: this.currentPackageJson.dependencies,
                devDependencies: this.currentPackageJson.devDependencies,
                nodeVersion: process.version,
                npmVersion: this.getNpmVersion()
            };
            
            await fs.writeFile(
                path.join(backupDir, 'backup-metadata.json'),
                JSON.stringify(backupMetadata, null, 2)
            );
            
            console.log(`📦 Backup creado en: ${backupDir}`);
            return backupDir;
        } catch (error) {
            throw new Error(`Error al crear backup: ${error.message}`);
        }
    }

    /**
     * Obtiene la versión de npm
     */
    getNpmVersion() {
        try {
            return execSync('npm --version', { encoding: 'utf8' }).trim();
        } catch {
            return 'unknown';
        }
    }

    /**
     * Analiza las dependencias que necesitan actualización
     */
    async analyzeUpdates() {
        try {
            console.log('🔍 Analizando dependencias para actualización...');
            
            const analysis = {
                outdated: [],
                upToDate: [],
                errors: [],
                summary: {
                    total: 0,
                    outdated: 0,
                    upToDate: 0,
                    errors: 0
                }
            };

            // Analizar dependencias principales
            if (this.currentPackageJson.dependencies) {
                for (const [name, currentVersion] of Object.entries(this.currentPackageJson.dependencies)) {
                    if (this.options.excludePackages.includes(name)) {
                        continue;
                    }
                    
                    try {
                        const updateInfo = await this.checkPackageUpdate(name, currentVersion);
                        if (updateInfo.needsUpdate) {
                            analysis.outdated.push(updateInfo);
                        } else {
                            analysis.upToDate.push(updateInfo);
                        }
                    } catch (error) {
                        analysis.errors.push({
                            name,
                            currentVersion,
                            error: error.message
                        });
                    }
                }
            }

            // Analizar dependencias de desarrollo si se incluyen
            if (this.options.includeDevDependencies && this.currentPackageJson.devDependencies) {
                for (const [name, currentVersion] of Object.entries(this.currentPackageJson.devDependencies)) {
                    if (this.options.excludePackages.includes(name)) {
                        continue;
                    }
                    
                    try {
                        const updateInfo = await this.checkPackageUpdate(name, currentVersion, true);
                        if (updateInfo.needsUpdate) {
                            analysis.outdated.push(updateInfo);
                        } else {
                            analysis.upToDate.push(updateInfo);
                        }
                    } catch (error) {
                        analysis.errors.push({
                            name,
                            currentVersion,
                            error: error.message
                        });
                    }
                }
            }

            // Calcular resumen
            analysis.summary.total = analysis.outdated.length + analysis.upToDate.length + analysis.errors.length;
            analysis.summary.outdated = analysis.outdated.length;
            analysis.summary.upToDate = analysis.upToDate.length;
            analysis.summary.errors = analysis.errors.length;

            return analysis;
        } catch (error) {
            throw new Error(`Error al analizar actualizaciones: ${error.message}`);
        }
    }

    /**
     * Verifica si un paquete necesita actualización
     */
    async checkPackageUpdate(packageName, currentVersion, isDev = false) {
        try {
            // Obtener información del paquete desde npm
            const npmInfo = await this.getPackageInfo(packageName);
            
            const latestVersion = npmInfo['dist-tags']?.latest;
            if (!latestVersion) {
                throw new Error('No se encontró versión latest');
            }

            const needsUpdate = this.compareVersions(currentVersion, latestVersion) < 0;
            
            return {
                name: packageName,
                currentVersion,
                latestVersion,
                needsUpdate,
                isDev,
                updateType: this.getUpdateType(currentVersion, latestVersion),
                packageInfo: {
                    description: npmInfo.description,
                    homepage: npmInfo.homepage,
                    repository: npmInfo.repository,
                    license: npmInfo.license,
                    deprecated: npmInfo.deprecated
                }
            };
        } catch (error) {
            throw new Error(`Error checking ${packageName}: ${error.message}`);
        }
    }

    /**
     * Obtiene información de un paquete desde npm
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

    /**
     * Compara dos versiones semver
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
     * Determina el tipo de actualización
     */
    getUpdateType(currentVersion, latestVersion) {
        const current = this.normalizeVersion(currentVersion);
        const latest = this.normalizeVersion(latestVersion);
        
        if (current[0] < latest[0]) return 'major';
        if (current[1] < latest[1]) return 'minor';
        if (current[2] < latest[2]) return 'patch';
        return 'none';
    }

    /**
     * Actualiza dependencias específicas
     */
    async updateDependencies(packages, options = {}) {
        const updateOptions = {
            policy: options.policy || this.options.updatePolicy,
            dryRun: options.dryRun !== undefined ? options.dryRun : this.options.dryRun,
            ...options
        };

        try {
            this.currentOperation = {
                type: 'update',
                packages,
                startTime: new Date(),
                options: updateOptions
            };

            console.log(`🚀 Iniciando actualización de ${packages.length} paquetes...`);

            // Crear backup antes de actualizar
            const backupPath = await this.createBackup(`Update: ${packages.join(', ')}`);

            // Preparar actualizaciones según política
            const updates = await this.prepareUpdates(packages, updateOptions.policy);

            if (updateOptions.dryRun) {
                console.log('🔍 MODO DRY RUN - No se realizarán cambios reales');
                console.log('Actualizaciones planificadas:', updates);
                return { success: true, dryRun: true, updates, backupPath };
            }

            // Ejecutar actualizaciones
            const results = await this.executeUpdates(updates);

            // Validar después de actualizar
            const validationResult = await this.validateUpdates(results);

            // Registrar operación
            const operationResult = {
                success: validationResult.success,
                backupPath,
                updates: results,
                validation: validationResult,
                endTime: new Date()
            };

            this.updateHistory.push(operationResult);
            this.currentOperation = null;

            return operationResult;
        } catch (error) {
            this.currentOperation = null;
            throw new Error(`Error en actualización: ${error.message}`);
        }
    }

    /**
     * Prepara las actualizaciones según la política
     */
    async prepareUpdates(packages, policy) {
        const updates = [];

        for (const packageInfo of packages) {
            let targetVersion = packageInfo.latestVersion;

            switch (policy) {
                case 'patch':
                    targetVersion = await this.getPatchVersion(packageInfo.name, packageInfo.currentVersion);
                    break;
                case 'minor':
                    targetVersion = await this.getMinorVersion(packageInfo.name, packageInfo.currentVersion);
                    break;
                case 'safe':
                    // Solo actualizaciones patch y menores
                    if (packageInfo.updateType === 'major') {
                        console.warn(`⚠️ Saltando actualización major de ${packageInfo.name} en modo seguro`);
                        continue;
                    }
                    break;
            }

            updates.push({
                name: packageInfo.name,
                currentVersion: packageInfo.currentVersion,
                targetVersion,
                updateType: this.getUpdateType(packageInfo.currentVersion, targetVersion),
                isDev: packageInfo.isDev
            });
        }

        return updates;
    }

    /**
     * Obtiene la versión patch más reciente
     */
    async getPatchVersion(packageName, currentVersion) {
        // Implementación simplificada - en producción usaría npm view
        return currentVersion; // Por ahora mantener la misma versión
    }

    /**
     * Obtiene la versión minor más reciente
     */
    async getMinorVersion(packageName, currentVersion) {
        // Implementación simplificada - en producción usaría npm view
        return currentVersion; // Por ahora mantener la misma versión
    }

    /**
     * Ejecuta las actualizaciones
     */
    async executeUpdates(updates) {
        const results = [];

        for (const update of updates) {
            try {
                console.log(`📦 Actualizando ${update.name}: ${update.currentVersion} → ${update.targetVersion}`);

                // Actualizar package.json
                await this.updatePackageJson(update);

                // Ejecutar npm install
                if (!this.options.dryRun) {
                    execSync(`npm install ${update.name}@${update.targetVersion}`, {
                        cwd: this.options.projectPath,
                        stdio: 'inherit'
                    });
                }

                results.push({
                    ...update,
                    success: true,
                    error: null
                });

                console.log(`✅ ${update.name} actualizado correctamente`);
            } catch (error) {
                results.push({
                    ...update,
                    success: false,
                    error: error.message
                });

                console.error(`❌ Error actualizando ${update.name}: ${error.message}`);
            }
        }

        return results;
    }

    /**
     * Actualiza el package.json
     */
    async updatePackageJson(update) {
        const packageJson = { ...this.currentPackageJson };

        if (update.isDev && packageJson.devDependencies) {
            packageJson.devDependencies[update.name] = update.targetVersion;
        } else if (packageJson.dependencies) {
            packageJson.dependencies[update.name] = update.targetVersion;
        }

        await fs.writeFile(
            this.packageJsonPath,
            JSON.stringify(packageJson, null, 2)
        );

        this.currentPackageJson = packageJson;
    }

    /**
     * Valida las actualizaciones realizadas
     */
    async validateUpdates(results) {
        const validation = {
            success: true,
            errors: [],
            warnings: [],
            tests: []
        };

        try {
            // Ejecutar pruebas si existen
            if (this.hasTestScript()) {
                console.log('🧪 Ejecutando pruebas...');
                const testResult = await this.runTests();
                validation.tests.push(testResult);
                
                if (!testResult.success) {
                    validation.success = false;
                    validation.errors.push('Las pruebas fallaron después de la actualización');
                }
            }

            // Verificar que las dependencias se instalaron correctamente
            for (const result of results) {
                if (result.success) {
                    const installedVersion = await this.getInstalledVersion(result.name);
                    if (installedVersion !== result.targetVersion) {
                        validation.warnings.push(
                            `Versión instalada de ${result.name} (${installedVersion}) no coincide con la esperada (${result.targetVersion})`
                        );
                    }
                }
            }

            // Ejecutar auditoría de seguridad
            const auditResult = await this.runSecurityAudit();
            validation.tests.push(auditResult);

            if (auditResult.vulnerabilities.length > 0) {
                validation.warnings.push(`Se encontraron ${auditResult.vulnerabilities.length} vulnerabilidades`);
            }

        } catch (error) {
            validation.success = false;
            validation.errors.push(`Error en validación: ${error.message}`);
        }

        return validation;
    }

    /**
     * Verifica si existe script de pruebas
     */
    hasTestScript() {
        return this.currentPackageJson.scripts && 
               (this.currentPackageJson.scripts.test || this.currentPackageJson.scripts['test:unit']);
    }

    /**
     * Ejecuta las pruebas del proyecto
     */
    async runTests() {
        try {
            execSync('npm test', {
                cwd: this.options.projectPath,
                stdio: 'pipe'
            });
            return { success: true, output: 'Pruebas exitosas' };
        } catch (error) {
            return { 
                success: false, 
                output: error.stdout?.toString() || error.message,
                exitCode: error.status
            };
        }
    }

    /**
     * Obtiene la versión instalada de un paquete
     */
    async getInstalledVersion(packageName) {
        try {
            const packageJsonPath = path.join(
                this.options.projectPath,
                'node_modules',
                packageName,
                'package.json'
            );
            
            const packageJson = await fs.readFile(packageJsonPath, 'utf8');
            const packageInfo = JSON.parse(packageJson);
            return packageInfo.version;
        } catch {
            return null;
        }
    }

    /**
     * Ejecuta auditoría de seguridad
     */
    async runSecurityAudit() {
        try {
            const auditOutput = execSync('npm audit --json', {
                cwd: this.options.projectPath,
                encoding: 'utf8'
            });
            
            const auditData = JSON.parse(auditOutput);
            
            return {
                success: true,
                vulnerabilities: auditData.vulnerabilities || [],
                metadata: auditData.metadata
            };
        } catch (error) {
            // npm audit puede salir con código 1 incluso cuando solo hay advertencias
            try {
                const auditOutput = error.stdout?.toString() || error.message;
                const auditData = JSON.parse(auditOutput);
                
                return {
                    success: true,
                    vulnerabilities: auditData.vulnerabilities || [],
                    metadata: auditData.metadata
                };
            } catch {
                return {
                    success: false,
                    error: error.message,
                    vulnerabilities: []
                };
            }
        }
    }

    /**
     * Restaura un backup anterior
     */
    async restoreBackup(backupPath) {
        try {
            console.log(`🔄 Restaurando backup desde: ${backupPath}`);

            // Restaurar package.json
            await fs.copyFile(
                path.join(backupPath, 'package.json'),
                this.packageJsonPath
            );

            // Restaurar package-lock.json si existe
            const lockBackupPath = path.join(backupPath, 'package-lock.json');
            try {
                await fs.access(lockBackupPath);
                await fs.copyFile(lockBackupPath, this.packageLockPath);
            } catch {
                console.warn('⚠️ No se encontró package-lock.json en el backup');
            }

            // Reinstalar dependencias
            execSync('npm install', {
                cwd: this.options.projectPath,
                stdio: 'inherit'
            });

            // Recargar estado
            await this.loadCurrentState();

            console.log('✅ Backup restaurado correctamente');
            return true;
        } catch (error) {
            throw new Error(`Error restaurando backup: ${error.message}`);
        }
    }

    /**
     * Genera un reporte completo del estado de dependencias
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            projectPath: this.options.projectPath,
            packageInfo: {
                name: this.currentPackageJson.name,
                version: this.currentPackageJson.version,
                description: this.currentPackageJson.description
            },
            dependencies: this.currentPackageJson.dependencies,
            devDependencies: this.currentPackageJson.devDependencies,
            updateHistory: this.updateHistory,
            currentOperation: this.currentOperation,
            summary: {
                totalDependencies: Object.keys(this.currentPackageJson.dependencies || {}).length,
                totalDevDependencies: Object.keys(this.currentPackageJson.devDependencies || {}).length,
                totalUpdates: this.updateHistory.length
            }
        };

        return report;
    }

    /**
     * Limpia backups antiguos
     */
    async cleanupOldBackups(keepCount = 5) {
        try {
            const backups = await this.getBackupList();
            
            if (backups.length <= keepCount) {
                return;
            }

            const backupsToDelete = backups
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(keepCount);

            for (const backup of backupsToDelete) {
                await fs.rmdir(backup.path, { recursive: true });
                console.log(`🗑️ Backup eliminado: ${backup.path}`);
            }
        } catch (error) {
            console.warn(`⚠️ Error limpiando backups antiguos: ${error.message}`);
        }
    }

    /**
     * Obtiene la lista de backups
     */
    async getBackupList() {
        try {
            const files = await fs.readdir(this.options.backupPath);
            const backups = [];

            for (const file of files) {
                if (file.startsWith('backup-')) {
                    const backupPath = path.join(this.options.backupPath, file);
                    const stat = await fs.stat(backupPath);
                    
                    try {
                        const metadataPath = path.join(backupPath, 'backup-metadata.json');
                        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
                        
                        backups.push({
                            path: backupPath,
                            name: file,
                            timestamp: metadata.timestamp,
                            description: metadata.description,
                            packageVersion: metadata.packageVersion
                        });
                    } catch {
                        // Si no hay metadata, usar la fecha del archivo
                        backups.push({
                            path: backupPath,
                            name: file,
                            timestamp: stat.mtime.toISOString(),
                            description: 'Backup sin metadata',
                            packageVersion: 'unknown'
                        });
                    }
                }
            }

            return backups;
        } catch (error) {
            return [];
        }
    }
}

module.exports = DependencyUpdater;