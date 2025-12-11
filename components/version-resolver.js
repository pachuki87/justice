/**
 * VersionResolver - Sistema de resolución de conflictos de versiones
 * 
 * Este módulo proporciona funcionalidades para:
 * - Detectar conflictos de versiones entre dependencias
 * - Resolver incompatibilidades semver
 * - Sugerir versiones compatibles
 * - Analizar árboles de dependencias
 * - Generar estrategias de resolución
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class VersionResolver {
    constructor(options = {}) {
        this.options = {
            projectPath: options.projectPath || process.cwd(),
            resolutionStrategy: options.resolutionStrategy || 'safe', // 'safe', 'latest', 'compatible'
            allowMajorUpdates: options.allowMajorUpdates || false,
            includeDevDependencies: options.includeDevDependencies !== false,
            cacheResults: options.cacheResults !== false,
            ...options
        };
        
        this.packageJsonPath = path.join(this.options.projectPath, 'package.json');
        this.packageLockPath = path.join(this.options.projectPath, 'package-lock.json');
        this.cache = new Map();
        this.resolutionHistory = [];
        
        // Reglas de compatibilidad conocidas
        this.compatibilityRules = {
            // Node.js compatibility
            node: {
                '>=14': {
                    express: '^4.18.0',
                    'jsonwebtoken': '^9.0.0',
                    'bcryptjs': '^2.4.0'
                },
                '>=16': {
                    express: '^4.18.0',
                    'jsonwebtoken': '^9.0.0',
                    'bcryptjs': '^2.4.0'
                },
                '>=18': {
                    express: '^4.18.0 || ^5.0.0',
                    'jsonwebtoken': '^9.0.0',
                    'bcryptjs': '^2.4.0 || ^3.0.0'
                }
            },
            // Framework compatibility
            express: {
                '4.x': {
                    'body-parser': '^1.20.0',
                    'cors': '^2.8.5',
                    'helmet': '^7.0.0'
                },
                '5.x': {
                    'cors': '^2.8.5',
                    'helmet': '^7.0.0'
                    // body-parser viene incluido en Express 5
                }
            }
        };
    }

    /**
     * Inicializa el resolvedor de versiones
     */
    async initialize() {
        try {
            await this.loadProjectData();
            console.log('✅ VersionResolver inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar VersionResolver:', error.message);
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
     * Analiza conflictos de versiones en el proyecto
     */
    async analyzeVersionConflicts() {
        try {
            console.log('🔍 Analizando conflictos de versiones...');
            
            const analysis = {
                timestamp: new Date().toISOString(),
                conflicts: [],
                warnings: [],
                recommendations: [],
                summary: {
                    totalConflicts: 0,
                    criticalConflicts: 0,
                    warningConflicts: 0
                },
                dependencyTree: null
            };

            // Analizar dependencias directas
            const directConflicts = await this.analyzeDirectDependencies();
            analysis.conflicts.push(...directConflicts);

            // Analizar árbol de dependencias si hay package-lock.json
            if (this.packageLock) {
                const treeConflicts = await this.analyzeDependencyTree();
                analysis.conflicts.push(...treeConflicts);
                analysis.dependencyTree = this.buildDependencyTree();
            }

            // Analizar compatibilidad con Node.js
            const nodeConflicts = await this.analyzeNodeCompatibility();
            analysis.conflicts.push(...nodeConflicts);

            // Analizar compatibilidad entre frameworks
            const frameworkConflicts = await this.analyzeFrameworkCompatibility();
            analysis.conflicts.push(...frameworkConflicts);

            // Clasificar conflictos
            this.classifyConflicts(analysis);

            // Generar recomendaciones
            analysis.recommendations = this.generateResolutionRecommendations(analysis);

            console.log(`✅ Análisis completado: ${analysis.summary.totalConflicts} conflictos encontrados`);
            return analysis;
        } catch (error) {
            throw new Error(`Error analizando conflictos de versiones: ${error.message}`);
        }
    }

    /**
     * Analiza conflictos en dependencias directas
     */
    async analyzeDirectDependencies() {
        const conflicts = [];
        const dependencies = this.getAllDependencies();

        // Verificar rangos de versiones inválidos
        for (const [name, version] of Object.entries(dependencies)) {
            const validation = this.validateVersionRange(version);
            if (!validation.isValid) {
                conflicts.push({
                    type: 'invalid_version_range',
                    severity: 'high',
                    package: name,
                    currentVersion: version,
                    issue: validation.error,
                    recommendation: `Fix version range: ${validation.suggestion}`,
                    autoFixable: true
                });
            }
        }

        // Detectar dependencias duplicadas con diferentes versiones
        const packageVersions = new Map();
        for (const [name, version] of Object.entries(dependencies)) {
            if (packageVersions.has(name)) {
                conflicts.push({
                    type: 'duplicate_dependency',
                    severity: 'critical',
                    package: name,
                    versions: [packageVersions.get(name), version],
                    issue: 'Same package specified with different versions',
                    recommendation: 'Unify to a single version',
                    autoFixable: true
                });
            } else {
                packageVersions.set(name, version);
            }
        }

        return conflicts;
    }

    /**
     * Analiza conflictos en el árbol de dependencias
     */
    async analyzeDependencyTree() {
        const conflicts = [];
        
        if (!this.packageLock || !this.packageLock.dependencies) {
            return conflicts;
        }

        // Buscar versiones múltiples del mismo paquete
        const packageVersions = new Map();
        
        this.collectPackageVersions(this.packageLock.dependencies, packageVersions);

        for (const [packageName, versions] of packageVersions) {
            if (versions.size > 1) {
                const versionArray = Array.from(versions);
                conflicts.push({
                    type: 'multiple_versions',
                    severity: 'high',
                    package: packageName,
                    versions: versionArray,
                    locations: this.findPackageLocations(packageName, versionArray),
                    issue: 'Multiple versions of the same package in dependency tree',
                    recommendation: this.suggestVersionResolution(packageName, versionArray),
                    autoFixable: this.canAutoFixVersionConflict(packageName, versionArray)
                });
            }
        }

        return conflicts;
    }

    /**
     * Recursivamente colecta versiones de paquetes
     */
    collectPackageVersions(dependencies, packageVersions, depth = 0) {
        if (depth > 10) return; // Evitar recursión infinita

        for (const [name, info] of Object.entries(dependencies)) {
            if (!packageVersions.has(name)) {
                packageVersions.set(name, new Set());
            }
            packageVersions.get(name).add(info.version);

            if (info.dependencies) {
                this.collectPackageVersions(info.dependencies, packageVersions, depth + 1);
            }
        }
    }

    /**
     * Encuentra ubicaciones de paquetes en el árbol
     */
    findPackageLocations(packageName, versions) {
        const locations = [];
        
        if (!this.packageLock || !this.packageLock.dependencies) {
            return locations;
        }

        this.searchPackageInTree(this.packageLock.dependencies, packageName, versions, locations, []);
        
        return locations;
    }

    /**
     * Busca paquetes en el árbol de dependencias
     */
    searchPackageInTree(dependencies, targetName, targetVersions, locations, path, depth = 0) {
        if (depth > 10) return;

        for (const [name, info] of Object.entries(dependencies)) {
            const currentPath = [...path, name];
            
            if (name === targetName && targetVersions.includes(info.version)) {
                locations.push({
                    version: info.version,
                    path: currentPath.join(' > '),
                    resolved: info.resolved || 'local'
                });
            }

            if (info.dependencies) {
                this.searchPackageInTree(info.dependencies, targetName, targetVersions, locations, currentPath, depth + 1);
            }
        }
    }

    /**
     * Analiza compatibilidad con Node.js
     */
    async analyzeNodeCompatibility() {
        const conflicts = [];
        const nodeVersion = this.getNodeVersion();
        const dependencies = this.getAllDependencies();

        for (const [name, version] of Object.entries(dependencies)) {
            const compatibility = await this.checkNodeCompatibility(name, version, nodeVersion);
            
            if (!compatibility.isCompatible) {
                conflicts.push({
                    type: 'node_compatibility',
                    severity: compatibility.severity,
                    package: name,
                    currentVersion: version,
                    nodeVersion,
                    issue: compatibility.issue,
                    recommendation: compatibility.recommendation,
                    autoFixable: compatibility.autoFixable
                });
            }
        }

        return conflicts;
    }

    /**
     * Obtiene la versión de Node.js
     */
    getNodeVersion() {
        try {
            const version = process.version;
            return version.startsWith('v') ? version.slice(1) : version;
        } catch {
            return 'unknown';
        }
    }

    /**
     * Verifica compatibilidad de un paquete con Node.js
     */
    async checkNodeCompatibility(packageName, version, nodeVersion) {
        try {
            // Obtener información del paquete
            const packageInfo = await this.getPackageInfo(packageName);
            
            // Verificar engines field
            if (packageInfo.engines && packageInfo.engines.node) {
                const isCompatible = this.checkVersionConstraint(nodeVersion, packageInfo.engines.node);
                
                if (!isCompatible) {
                    return {
                        isCompatible: false,
                        severity: 'high',
                        issue: `Package requires Node.js ${packageInfo.engines.node}, but current is ${nodeVersion}`,
                        recommendation: `Upgrade Node.js or find compatible version of ${packageName}`,
                        autoFixable: false
                    };
                }
            }

            // Verificar reglas de compatibilidad conocidas
            const knownCompatibility = this.checkKnownCompatibility(packageName, version, nodeVersion);
            if (!knownCompatibility.isCompatible) {
                return knownCompatibility;
            }

            return { isCompatible: true };
        } catch (error) {
            return {
                isCompatible: false,
                severity: 'moderate',
                issue: `Cannot verify compatibility: ${error.message}`,
                recommendation: 'Manually verify package compatibility',
                autoFixable: false
            };
        }
    }

    /**
     * Verifica compatibilidad conocida
     */
    checkKnownCompatibility(packageName, version, nodeVersion) {
        // Reglas específicas para paquetes conocidos
        const rules = {
            'express': {
                '5.x': {
                    minNode: '18.0.0',
                    issue: 'Express 5 requires Node.js 18+',
                    recommendation: 'Upgrade Node.js to 18+ or use Express 4.x'
                }
            },
            'jsonwebtoken': {
                '9.x': {
                    minNode: '12.0.0',
                    issue: 'jsonwebtoken 9 requires Node.js 12+',
                    recommendation: 'Upgrade Node.js to 12+ or use jsonwebtoken 8.x'
                }
            }
        };

        const packageRules = rules[packageName];
        if (!packageRules) {
            return { isCompatible: true };
        }

        const versionRange = this.extractVersionRange(version);
        const rule = packageRules[versionRange];
        
        if (rule && this.compareVersions(nodeVersion, rule.minNode) < 0) {
            return {
                isCompatible: false,
                severity: 'high',
                issue: rule.issue,
                recommendation: rule.recommendation,
                autoFixable: false
            };
        }

        return { isCompatible: true };
    }

    /**
     * Extrae rango de versiones (major.x)
     */
    extractVersionRange(version) {
        const cleanVersion = version.replace(/^[^\d]*/, '');
        const parts = cleanVersion.split('.');
        return `${parts[0]}.x`;
    }

    /**
     * Analiza compatibilidad entre frameworks
     */
    async analyzeFrameworkCompatibility() {
        const conflicts = [];
        const dependencies = this.getAllDependencies();

        // Detectar frameworks principales
        const frameworks = this.detectFrameworks(dependencies);
        
        // Verificar compatibilidad entre frameworks
        for (const [framework, version] of Object.entries(frameworks)) {
            const compatibility = await this.checkFrameworkCompatibility(framework, version, dependencies);
            
            if (!compatibility.isCompatible) {
                conflicts.push({
                    type: 'framework_compatibility',
                    severity: compatibility.severity,
                    package: framework,
                    currentVersion: version,
                    issue: compatibility.issue,
                    recommendation: compatibility.recommendation,
                    autoFixable: compatibility.autoFixable
                });
            }
        }

        return conflicts;
    }

    /**
     * Detecta frameworks en las dependencias
     */
    detectFrameworks(dependencies) {
        const frameworks = {};
        
        for (const [name, version] of Object.entries(dependencies)) {
            if (this.isFramework(name)) {
                frameworks[name] = version;
            }
        }
        
        return frameworks;
    }

    /**
     * Verifica si un paquete es un framework
     */
    isFramework(packageName) {
        const frameworks = [
            'express', 'koa', 'fastify', 'hapi', 'sails',
            'react', 'vue', 'angular', 'svelte',
            'next', 'nuxt', 'gatsby',
            'lodash', 'underscore', 'ramda'
        ];
        
        return frameworks.includes(packageName);
    }

    /**
     * Verifica compatibilidad de framework
     */
    async checkFrameworkCompatibility(framework, version, dependencies) {
        const rules = this.compatibilityRules[framework];
        if (!rules) {
            return { isCompatible: true };
        }

        const versionRange = this.extractVersionRange(version);
        const frameworkRules = rules[versionRange];
        
        if (!frameworkRules) {
            return { isCompatible: true };
        }

        // Verificar dependencias requeridas
        for (const [dep, requiredVersion] of Object.entries(frameworkRules)) {
            const installedVersion = dependencies[dep];
            
            if (!installedVersion) {
                return {
                    isCompatible: false,
                    severity: 'high',
                    issue: `${framework} ${versionRange} requires ${dep} ${requiredVersion}`,
                    recommendation: `Install ${dep}@${requiredVersion}`,
                    autoFixable: true
                };
            }
            
            if (!this.areVersionsCompatible(installedVersion, requiredVersion)) {
                return {
                    isCompatible: false,
                    severity: 'moderate',
                    issue: `${framework} ${versionRange} is incompatible with ${dep} ${installedVersion}`,
                    recommendation: `Update ${dep} to ${requiredVersion}`,
                    autoFixable: true
                };
            }
        }

        return { isCompatible: true };
    }

    /**
     * Valida un rango de versiones
     */
    validateVersionRange(version) {
        // Patrones válidos de semver
        const validPatterns = [
            /^\d+\.\d+\.\d+$/,                    // 1.2.3
            /^\^\d+\.\d+\.\d+$/,                  // ^1.2.3
            /^~\d+\.\d+\.\d+$/,                  // ~1.2.3
            /^>=\d+\.\d+\.\d+$/,                 // >=1.2.3
            /^<=\d+\.\d+\.\d+$/,                 // <=1.2.3
            /^\d+\.\d+\.x$/,                     // 1.2.x
            /^\^\d+\.\d+\.x$/,                   // ^1.2.x
            /^~\d+\.\d+\.x$/,                   // ~1.2.x
            /^\d+\.\d+\.\d+ - \d+\.\d+\.\d+$/,  // 1.2.3 - 2.3.4
            /^\d+\.\d+\.\d+\|\d+\.\d+\.\d+$/,   // 1.2.3|2.3.4
        ];

        for (const pattern of validPatterns) {
            if (pattern.test(version)) {
                return { isValid: true };
            }
        }

        return {
            isValid: false,
            error: `Invalid version range: ${version}`,
            suggestion: this.suggestValidVersionRange(version)
        };
    }

    /**
     * Sugiere un rango de versiones válido
     */
    suggestValidVersionRange(invalidVersion) {
        const cleanVersion = invalidVersion.replace(/[^0-9.]/g, '');
        const parts = cleanVersion.split('.');
        
        if (parts.length >= 3) {
            return `^${parts[0]}.${parts[1]}.${parts[2]}`;
        } else if (parts.length === 2) {
            return `^${parts[0]}.${parts[1]}.0`;
        } else if (parts.length === 1) {
            return `^${parts[0]}.0.0`;
        }
        
        return '^1.0.0';
    }

    /**
     * Verifica si dos versiones son compatibles
     */
    areVersionsCompatible(version1, version2) {
        // Implementación simplificada - en producción usaría semver library
        const v1 = this.normalizeVersion(version1);
        const v2 = this.normalizeVersion(version2);
        
        // Para esta implementación, consideramos compatibilidad si la major es la misma
        return v1[0] === v2[0];
    }

    /**
     * Normaliza una versión para comparación
     */
    normalizeVersion(version) {
        const cleanVersion = version.replace(/^[^\d]*/, '');
        return cleanVersion.split('.').map(part => parseInt(part) || 0);
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
     * Verifica una restricción de versión
     */
    checkVersionConstraint(version, constraint) {
        // Implementación simplificada - en producción usaría semver library
        if (constraint.startsWith('>=')) {
            const minVersion = constraint.slice(2);
            return this.compareVersions(version, minVersion) >= 0;
        } else if (constraint.startsWith('<=')) {
            const maxVersion = constraint.slice(2);
            return this.compareVersions(version, maxVersion) <= 0;
        } else if (constraint.includes('||')) {
            const alternatives = constraint.split('||').map(s => s.trim());
            return alternatives.some(alt => this.checkVersionConstraint(version, alt));
        }
        
        // Por defecto, verificar coincidencia exacta
        return this.compareVersions(version, constraint) === 0;
    }

    /**
     * Sugiere resolución para conflictos de versiones
     */
    suggestVersionResolution(packageName, versions) {
        // Estrategia: usar la versión más alta que sea compatible
        const sortedVersions = versions.sort((a, b) => this.compareVersions(b, a));
        
        // Verificar si hay una versión que satisfaga a todos
        for (const version of sortedVersions) {
            if (this.isVersionCompatibleWithAll(packageName, version, versions)) {
                return `Update to version ${version}`;
            }
        }
        
        // Si no hay una versión compatible, sugerir la más reciente
        return `Update to latest version: ${sortedVersions[0]}`;
    }

    /**
     * Verifica si una versión es compatible con todas las requeridas
     */
    isVersionCompatibleWithAll(packageName, targetVersion, requiredVersions) {
        // Implementación simplificada - en producción sería más compleja
        return true;
    }

    /**
     * Verifica si un conflicto se puede arreglar automáticamente
     */
    canAutoFixVersionConflict(packageName, versions) {
        // Se puede arreglar automáticamente si todas las versiones son compatibles
        const sortedVersions = versions.sort((a, b) => this.compareVersions(b, a));
        const latestVersion = sortedVersions[0];
        
        return this.isVersionCompatibleWithAll(packageName, latestVersion, versions);
    }

    /**
     * Clasifica los conflictos por severidad
     */
    classifyConflicts(analysis) {
        analysis.summary.totalConflicts = analysis.conflicts.length;
        analysis.summary.criticalConflicts = analysis.conflicts.filter(c => c.severity === 'critical').length;
        analysis.summary.warningConflicts = analysis.conflicts.filter(c => c.severity === 'moderate' || c.severity === 'low').length;
    }

    /**
     * Genera recomendaciones de resolución
     */
    generateResolutionRecommendations(analysis) {
        const recommendations = [];
        
        // Agrupar conflictos por tipo
        const conflictsByType = this.groupConflictsByType(analysis.conflicts);
        
        // Recomendaciones por tipo de conflicto
        for (const [type, conflicts] of Object.entries(conflictsByType)) {
            const recommendation = this.generateRecommendationForType(type, conflicts);
            if (recommendation) {
                recommendations.push(recommendation);
            }
        }
        
        // Recomendaciones generales
        if (analysis.summary.criticalConflicts > 0) {
            recommendations.push({
                priority: 'critical',
                title: 'Resolver conflictos críticos inmediatamente',
                description: `Hay ${analysis.summary.criticalConflicts} conflictos críticos que pueden causar fallos en producción.`,
                action: 'Revise y resuelva estos conflictos antes de continuar.',
                autoFixable: analysis.conflicts.filter(c => c.severity === 'critical' && c.autoFixable).length
            });
        }
        
        return recommendations.sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority));
    }

    /**
     * Agrupa conflictos por tipo
     */
    groupConflictsByType(conflicts) {
        const grouped = {};
        
        for (const conflict of conflicts) {
            if (!grouped[conflict.type]) {
                grouped[conflict.type] = [];
            }
            grouped[conflict.type].push(conflict);
        }
        
        return grouped;
    }

    /**
     * Genera recomendación para un tipo específico de conflicto
     */
    generateRecommendationForType(type, conflicts) {
        const autoFixable = conflicts.filter(c => c.autoFixable).length;
        
        switch (type) {
            case 'invalid_version_range':
                return {
                    priority: 'high',
                    title: 'Corregir rangos de versión inválidos',
                    description: `${conflicts.length} paquetes tienen rangos de versión inválidos.`,
                    action: 'Use rangos semver estándar como ^1.2.3 o ~1.2.3',
                    autoFixable
                };
                
            case 'multiple_versions':
                return {
                    priority: 'high',
                    title: 'Unificar versiones duplicadas',
                    description: `${conflicts.length} paquetes tienen múltiples versiones en el árbol.`,
                    action: 'Use npm dedupe o actualice dependencias para unificar versiones',
                    autoFixable
                };
                
            case 'node_compatibility':
                return {
                    priority: 'critical',
                    title: 'Resolver incompatibilidades con Node.js',
                    description: `${conflicts.length} paquetes son incompatibles con la versión actual de Node.js.`,
                    action: 'Actualice Node.js o use versiones compatibles de los paquetes',
                    autoFixable
                };
                
            case 'framework_compatibility':
                return {
                    priority: 'moderate',
                    title: 'Resolver incompatibilidades de framework',
                    description: `${conflicts.length} conflictos de compatibilidad entre frameworks.`,
                    action: 'Asegure que todas las dependencias sean compatibles entre sí',
                    autoFixable
                };
                
            default:
                return null;
        }
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
     * Resuelve conflictos automáticamente
     */
    async resolveConflicts(conflicts, options = {}) {
        const resolutionOptions = {
            strategy: options.strategy || this.options.resolutionStrategy,
            dryRun: options.dryRun || false,
            backup: options.backup !== false,
            ...options
        };

        try {
            console.log(`🔧 Resolviendo ${conflicts.length} conflictos...`);
            
            const results = {
                timestamp: new Date().toISOString(),
                strategy: resolutionOptions.strategy,
                resolved: [],
                failed: [],
                skipped: [],
                summary: {
                    total: conflicts.length,
                    resolved: 0,
                    failed: 0,
                    skipped: 0
                }
            };

            // Crear backup si es necesario
            let backupPath = null;
            if (resolutionOptions.backup && !resolutionOptions.dryRun) {
                backupPath = await this.createBackup('Version conflict resolution');
            }

            // Procesar cada conflicto
            for (const conflict of conflicts) {
                try {
                    if (!conflict.autoFixable) {
                        results.skipped.push({
                            conflict,
                            reason: 'Not auto-fixable'
                        });
                        continue;
                    }

                    const resolution = await this.resolveConflict(conflict, resolutionOptions);
                    
                    if (resolution.success) {
                        results.resolved.push({
                            conflict,
                            resolution
                        });
                    } else {
                        results.failed.push({
                            conflict,
                            error: resolution.error
                        });
                    }
                } catch (error) {
                    results.failed.push({
                        conflict,
                        error: error.message
                    });
                }
            }

            // Actualizar resumen
            results.summary.resolved = results.resolved.length;
            results.summary.failed = results.failed.length;
            results.summary.skipped = results.skipped.length;

            // Guardar en historial
            this.resolutionHistory.push(results);

            console.log(`✅ Resolución completada: ${results.summary.resolved}/${results.summary.total} conflictos resueltos`);
            return results;
        } catch (error) {
            throw new Error(`Error resolviendo conflictos: ${error.message}`);
        }
    }

    /**
     * Resuelve un conflicto específico
     */
    async resolveConflict(conflict, options) {
        switch (conflict.type) {
            case 'invalid_version_range':
                return await this.resolveInvalidVersionRange(conflict, options);
                
            case 'duplicate_dependency':
                return await this.resolveDuplicateDependency(conflict, options);
                
            case 'multiple_versions':
                return await this.resolveMultipleVersions(conflict, options);
                
            case 'node_compatibility':
                return await this.resolveNodeCompatibility(conflict, options);
                
            case 'framework_compatibility':
                return await this.resolveFrameworkCompatibility(conflict, options);
                
            default:
                return {
                    success: false,
                    error: `Unsupported conflict type: ${conflict.type}`
                };
        }
    }

    /**
     * Resuelve conflicto de rango de versión inválido
     */
    async resolveInvalidVersionRange(conflict, options) {
        try {
            const newVersion = conflict.recommendation.replace('Fix version range: ', '');
            
            if (!options.dryRun) {
                await this.updatePackageVersion(conflict.package, newVersion);
            }
            
            return {
                success: true,
                action: 'version_update',
                oldVersion: conflict.currentVersion,
                newVersion
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Resuelve conflicto de dependencia duplicada
     */
    async resolveDuplicateDependency(conflict, options) {
        try {
            // Elegir la versión más reciente
            const versions = conflict.versions;
            const latestVersion = versions.sort((a, b) => this.compareVersions(b, a))[0];
            
            if (!options.dryRun) {
                await this.updatePackageVersion(conflict.package, latestVersion);
            }
            
            return {
                success: true,
                action: 'version_unification',
                oldVersions: versions,
                newVersion: latestVersion
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Resuelve conflicto de múltiples versiones
     */
    async resolveMultipleVersions(conflict, options) {
        try {
            // Usar npm dedupe para unificar versiones
            if (!options.dryRun) {
                execSync('npm dedupe', {
                    cwd: this.options.projectPath,
                    stdio: 'inherit'
                });
            }
            
            return {
                success: true,
                action: 'npm_dedupe',
                description: 'Ran npm dedupe to unify versions'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Resuelve conflicto de compatibilidad con Node.js
     */
    async resolveNodeCompatibility(conflict, options) {
        try {
            // Este tipo de conflicto generalmente requiere acción manual
            return {
                success: false,
                error: 'Node.js compatibility conflicts require manual intervention'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Resuelve conflicto de compatibilidad de framework
     */
    async resolveFrameworkCompatibility(conflict, options) {
        try {
            const recommendation = conflict.recommendation;
            
            if (recommendation.startsWith('Install')) {
                const packageMatch = recommendation.match(/Install (\S+)@(\S+)/);
                if (packageMatch) {
                    const [, packageName, version] = packageMatch;
                    
                    if (!options.dryRun) {
                        execSync(`npm install ${packageName}@${version}`, {
                            cwd: this.options.projectPath,
                            stdio: 'inherit'
                        });
                    }
                    
                    return {
                        success: true,
                        action: 'package_install',
                        package: packageName,
                        version
                    };
                }
            } else if (recommendation.startsWith('Update')) {
                const packageMatch = recommendation.match(/Update (\S+) to (\S+)/);
                if (packageMatch) {
                    const [, packageName, version] = packageMatch;
                    
                    if (!options.dryRun) {
                        await this.updatePackageVersion(packageName, version);
                    }
                    
                    return {
                        success: true,
                        action: 'package_update',
                        package: packageName,
                        oldVersion: conflict.currentVersion,
                        newVersion: version
                    };
                }
            }
            
            return {
                success: false,
                error: 'Cannot parse recommendation'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Actualiza la versión de un paquete
     */
    async updatePackageVersion(packageName, newVersion) {
        const packageJson = { ...this.packageJson };
        
        if (packageJson.dependencies && packageJson.dependencies[packageName]) {
            packageJson.dependencies[packageName] = newVersion;
        }
        
        if (packageJson.devDependencies && packageJson.devDependencies[packageName]) {
            packageJson.devDependencies[packageName] = newVersion;
        }
        
        await fs.writeFile(
            this.packageJsonPath,
            JSON.stringify(packageJson, null, 2)
        );
        
        this.packageJson = packageJson;
    }

    /**
     * Crea un backup
     */
    async createBackup(description) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.options.projectPath, 'backups', `version-resolve-${timestamp}`);
        
        await fs.mkdir(backupDir, { recursive: true });
        
        await fs.copyFile(
            this.packageJsonPath,
            path.join(backupDir, 'package.json')
        );
        
        if (this.packageLock) {
            await fs.copyFile(
                this.packageLockPath,
                path.join(backupDir, 'package-lock.json')
            );
        }
        
        return backupDir;
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

    /**
     * Construye el árbol de dependencias
     */
    buildDependencyTree() {
        if (!this.packageLock || !this.packageLock.dependencies) {
            return null;
        }
        
        return this.buildTreeFromDependencies(this.packageLock.dependencies);
    }

    /**
     * Construye árbol recursivamente
     */
    buildTreeFromDependencies(dependencies, depth = 0) {
        if (depth > 5) return null; // Limitar profundidad
        
        const tree = {};
        
        for (const [name, info] of Object.entries(dependencies)) {
            tree[name] = {
                version: info.version,
                resolved: info.resolved,
                dependencies: info.dependencies ? 
                    this.buildTreeFromDependencies(info.dependencies, depth + 1) : 
                    null
            };
        }
        
        return tree;
    }
}

module.exports = VersionResolver;