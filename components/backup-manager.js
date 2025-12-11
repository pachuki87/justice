/**
 * BackupManager - Sistema de gestión de backups
 * 
 * Este módulo proporciona funcionalidades para:
 * - Crear backups automáticos antes de actualizaciones
 * - Gestionar diferentes tipos de backups
 * - Restaurar backups específicos
 * - Monitorear espacio de almacenamiento
 * - Programar backups automáticos
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const zlib = require('zlib');
const crypto = require('crypto');

class BackupManager {
    constructor(options = {}) {
        this.options = {
            projectPath: options.projectPath || process.cwd(),
            backupPath: options.backupPath || path.join(options.projectPath || process.cwd(), 'backups'),
            maxBackups: options.maxBackups || 10,
            compressionEnabled: options.compressionEnabled !== false,
            encryptionEnabled: options.encryptionEnabled || false,
            encryptionKey: options.encryptionKey || null,
            autoCleanup: options.autoCleanup !== false,
            scheduleBackup: options.scheduleBackup || false,
            scheduleInterval: options.scheduleInterval || 'daily', // 'hourly', 'daily', 'weekly'
            ...options
        };
        
        this.packageJsonPath = path.join(this.options.projectPath, 'package.json');
        this.packageLockPath = path.join(this.options.projectPath, 'package-lock.json');
        this.backupHistory = [];
        this.scheduleTimer = null;
        
        // Tipos de backup
        this.backupTypes = {
            full: {
                name: 'Full Backup',
                description: 'Complete project backup including all files',
                files: ['**/*'],
                exclude: ['node_modules/**', '.git/**', 'backups/**', 'coverage/**', '*.log']
            },
            dependencies: {
                name: 'Dependencies Backup',
                description: 'Package files and dependency configurations',
                files: ['package*.json', 'package-lock.json', 'yarn.lock', '.npmrc'],
                exclude: []
            },
            configuration: {
                name: 'Configuration Backup',
                description: 'Configuration files and environment settings',
                files: ['.env*', 'config/**', '*.config.*', '.rc files'],
                exclude: ['*.key', '*.pem', 'secrets/**']
            },
            source: {
                name: 'Source Code Backup',
                description: 'Source code files excluding dependencies',
                files: ['src/**', 'js/**', 'css/**', 'components/**', 'lib/**', 'netlify/**'],
                exclude: ['node_modules/**', 'dist/**', 'build/**', '*.log']
            }
        };
    }

    /**
     * Inicializa el gestor de backups
     */
    async initialize() {
        try {
            await this.ensureBackupDirectory();
            await this.loadBackupHistory();
            
            if (this.options.scheduleBackup) {
                await this.startScheduledBackups();
            }
            
            console.log('✅ BackupManager inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar BackupManager:', error.message);
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
     * Carga el historial de backups
     */
    async loadBackupHistory() {
        try {
            const historyPath = path.join(this.options.backupPath, 'backup-history.json');
            const historyData = await fs.readFile(historyPath, 'utf8');
            this.backupHistory = JSON.parse(historyData);
        } catch {
            this.backupHistory = [];
        }
    }

    /**
     * Guarda el historial de backups
     */
    async saveBackupHistory() {
        try {
            const historyPath = path.join(this.options.backupPath, 'backup-history.json');
            await fs.writeFile(historyPath, JSON.stringify(this.backupHistory, null, 2));
        } catch (error) {
            console.warn('⚠️ Error guardando historial de backups:', error.message);
        }
    }

    /**
     * Crea un backup
     */
    async createBackup(type = 'full', options = {}) {
        const backupOptions = {
            description: options.description || `Backup ${type}`,
            tags: options.tags || [],
            compress: options.compress !== undefined ? options.compress : this.options.compressionEnabled,
            encrypt: options.encrypt !== undefined ? options.encrypt : this.options.encryptionEnabled,
            ...options
        };

        try {
            console.log(`💾 Creando backup tipo: ${type}`);
            
            const backupId = this.generateBackupId();
            const timestamp = new Date().toISOString();
            const backupDir = path.join(this.options.backupPath, backupId);
            
            // Crear directorio de backup
            await fs.mkdir(backupDir, { recursive: true });
            
            // Obtener configuración del tipo de backup
            const backupConfig = this.backupTypes[type];
            if (!backupConfig) {
                throw new Error(`Tipo de backup no soportado: ${type}`);
            }
            
            // Crear backup
            const backupResult = await this.performBackup(backupDir, backupConfig, backupOptions);
            
            // Crear metadata
            const metadata = {
                id: backupId,
                type,
                timestamp,
                description: backupOptions.description,
                tags: backupOptions.tags,
                size: backupResult.size,
                compressed: backupOptions.compress,
                encrypted: backupOptions.encrypt,
                files: backupResult.files,
                checksum: backupResult.checksum,
                nodeVersion: process.version,
                npmVersion: this.getNpmVersion(),
                platform: process.platform,
                projectInfo: await this.getProjectInfo()
            };
            
            // Guardar metadata
            await fs.writeFile(
                path.join(backupDir, 'backup-metadata.json'),
                JSON.stringify(metadata, null, 2)
            );
            
            // Agregar al historial
            this.backupHistory.push(metadata);
            await this.saveBackupHistory();
            
            // Limpiar backups antiguos si es necesario
            if (this.options.autoCleanup) {
                await this.cleanupOldBackups();
            }
            
            console.log(`✅ Backup creado: ${backupId}`);
            return {
                success: true,
                backupId,
                path: backupDir,
                metadata
            };
        } catch (error) {
            throw new Error(`Error creando backup: ${error.message}`);
        }
    }

    /**
     * Genera un ID único para el backup
     */
    generateBackupId() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const random = Math.random().toString(36).substr(2, 9);
        return `backup-${timestamp}-${random}`;
    }

    /**
     * Realiza el backup físico
     */
    async performBackup(backupDir, config, options) {
        const files = [];
        let totalSize = 0;
        
        try {
            // Copiar archivos según configuración
            for (const pattern of config.files) {
                const matchedFiles = await this.matchFiles(pattern, config.exclude);
                
                for (const file of matchedFiles) {
                    const relativePath = path.relative(this.options.projectPath, file);
                    const backupFilePath = path.join(backupDir, relativePath);
                    
                    // Asegurar que el directorio destino exista
                    await fs.mkdir(path.dirname(backupFilePath), { recursive: true });
                    
                    // Copiar archivo
                    await fs.copyFile(file, backupFilePath);
                    
                    // Obtener tamaño
                    const stats = await fs.stat(backupFilePath);
                    totalSize += stats.size;
                    
                    files.push({
                        path: relativePath,
                        size: stats.size,
                        modified: stats.mtime.toISOString()
                    });
                }
            }
            
            // Comprimir si es necesario
            if (options.compress) {
                await this.compressBackup(backupDir);
            }
            
            // Encriptar si es necesario
            if (options.encrypt) {
                await this.encryptBackup(backupDir);
            }
            
            // Calcular checksum
            const checksum = await this.calculateDirectoryChecksum(backupDir);
            
            return {
                files,
                size: totalSize,
                checksum
            };
        } catch (error) {
            throw new Error(`Error en backup físico: ${error.message}`);
        }
    }

    /**
     * Busca archivos que coincidan con un patrón
     */
    async matchFiles(pattern, exclude = []) {
        const files = [];
        
        // Implementación simplificada - en producción usaría glob o similar
        try {
            if (pattern === '**/*') {
                // Todos los archivos
                await this.collectAllFiles(this.options.projectPath, files, exclude);
            } else if (pattern.startsWith('**/') && pattern.endsWith('/**')) {
                // Directorio específico
                const dirName = pattern.slice(3, -3);
                const dirPath = path.join(this.options.projectPath, dirName);
                
                try {
                    await fs.access(dirPath);
                    await this.collectAllFiles(dirPath, files, exclude);
                } catch {
                    // Directorio no existe
                }
            } else if (pattern.includes('*')) {
                // Patrón con comodines
                const dirPath = path.dirname(pattern);
                const fileName = path.basename(pattern);
                
                try {
                    const entries = await fs.readdir(dirPath);
                    for (const entry of entries) {
                        if (this.matchesPattern(entry, fileName)) {
                            const fullPath = path.join(dirPath, entry);
                            const stats = await fs.stat(fullPath);
                            
                            if (stats.isFile()) {
                                files.push(fullPath);
                            }
                        }
                    }
                } catch {
                    // Error leyendo directorio
                }
            } else {
                // Archivo específico
                const filePath = path.join(this.options.projectPath, pattern);
                
                try {
                    await fs.access(filePath);
                    files.push(filePath);
                } catch {
                    // Archivo no existe
                }
            }
        } catch (error) {
            console.warn(`⚠️ Error buscando archivos con patrón ${pattern}:`, error.message);
        }
        
        return files;
    }

    /**
     * Colecta todos los archivos recursivamente
     */
    async collectAllFiles(dirPath, files, exclude = []) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const relativePath = path.relative(this.options.projectPath, fullPath);
                
                // Verificar exclusiones
                if (this.shouldExclude(relativePath, exclude)) {
                    continue;
                }
                
                if (entry.isFile()) {
                    files.push(fullPath);
                } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    await this.collectAllFiles(fullPath, files, exclude);
                }
            }
        } catch (error) {
            console.warn(`⚠️ Error leyendo directorio ${dirPath}:`, error.message);
        }
    }

    /**
     * Verifica si un archivo debe ser excluido
     */
    shouldExclude(filePath, excludePatterns) {
        for (const pattern of excludePatterns) {
            if (this.matchesPattern(filePath, pattern)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Verifica si un nombre coincide con un patrón
     */
    matchesPattern(name, pattern) {
        // Implementación simplificada de patrones glob
        const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '.');
        
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(name);
    }

    /**
     * Comprime un backup
     */
    async compressBackup(backupDir) {
        try {
            console.log('🗜️ Comprimiendo backup...');
            
            // Crear archivo comprimido
            const compressedPath = `${backupDir}.tar.gz`;
            
            // Usar tar para compresión (más eficiente que JavaScript puro)
            execSync(`tar -czf "${compressedPath}" -C "${path.dirname(backupDir)}" "${path.basename(backupDir)}"`, {
                stdio: 'inherit'
            });
            
            // Eliminar directorio original
            await fs.rmdir(backupDir, { recursive: true });
            
            console.log('✅ Backup comprimido correctamente');
        } catch (error) {
            throw new Error(`Error comprimiendo backup: ${error.message}`);
        }
    }

    /**
     * Encripta un backup
     */
    async encryptBackup(backupPath) {
        if (!this.options.encryptionKey) {
            throw new Error('Se requiere una clave de encriptación');
        }
        
        try {
            console.log('🔐 Encriptando backup...');
            
            const cipher = crypto.createCipher('aes-256-cbc', this.options.encryptionKey);
            
            // Si es un archivo comprimido
            if (backupPath.endsWith('.tar.gz')) {
                const input = await fs.readFile(backupPath);
                const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
                await fs.writeFile(`${backupPath}.enc`, encrypted);
                await fs.unlink(backupPath);
            } else {
                // Encriptar cada archivo individualmente
                await this.encryptDirectory(backupPath, cipher);
            }
            
            console.log('✅ Backup encriptado correctamente');
        } catch (error) {
            throw new Error(`Error encriptando backup: ${error.message}`);
        }
    }

    /**
     * Encripta un directorio completo
     */
    async encryptDirectory(dirPath, cipher) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isFile()) {
                const input = await fs.readFile(fullPath);
                const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
                await fs.writeFile(`${fullPath}.enc`, encrypted);
                await fs.unlink(fullPath);
            } else if (entry.isDirectory()) {
                await this.encryptDirectory(fullPath, cipher);
            }
        }
    }

    /**
     * Calcula checksum de un directorio
     */
    async calculateDirectoryChecksum(dirPath) {
        const hash = crypto.createHash('sha256');
        await this.hashDirectory(dirPath, hash);
        return hash.digest('hex');
    }

    /**
     * Calcula hash recursivamente
     */
    async hashDirectory(dirPath, hash) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const sortedEntries = entries.sort((a, b) => a.name.localeCompare(b.name));
        
        for (const entry of sortedEntries) {
            const fullPath = path.join(dirPath, entry.name);
            
            hash.update(entry.name);
            
            if (entry.isFile()) {
                const content = await fs.readFile(fullPath);
                hash.update(content);
            } else if (entry.isDirectory()) {
                await this.hashDirectory(fullPath, hash);
            }
        }
    }

    /**
     * Restaura un backup
     */
    async restoreBackup(backupId, options = {}) {
        const restoreOptions = {
            targetPath: options.targetPath || this.options.projectPath,
            overwrite: options.overwrite !== false,
            decrypt: options.decrypt !== undefined ? options.decrypt : this.options.encryptionEnabled,
            decompress: options.decompress !== undefined ? options.decompress : this.options.compressionEnabled,
            ...options
        };

        try {
            console.log(`🔄 Restaurando backup: ${backupId}`);
            
            // Encontrar backup
            const backupPath = await this.findBackupPath(backupId);
            if (!backupPath) {
                throw new Error(`Backup no encontrado: ${backupId}`);
            }
            
            // Cargar metadata
            const metadata = await this.loadBackupMetadata(backupPath);
            
            // Desencriptar si es necesario
            if (metadata.encrypted && restoreOptions.decrypt) {
                await this.decryptBackup(backupPath);
            }
            
            // Descomprimir si es necesario
            if (metadata.compressed && restoreOptions.decompress) {
                await this.decompressBackup(backupPath);
            }
            
            // Restaurar archivos
            await this.restoreFiles(backupPath, restoreOptions.targetPath, restoreOptions.overwrite);
            
            console.log(`✅ Backup ${backupId} restaurado correctamente`);
            return {
                success: true,
                backupId,
                metadata,
                restoredTo: restoreOptions.targetPath
            };
        } catch (error) {
            throw new Error(`Error restaurando backup: ${error.message}`);
        }
    }

    /**
     * Encuentra la ruta de un backup
     */
    async findBackupPath(backupId) {
        try {
            // Buscar en directorio de backups
            const entries = await fs.readdir(this.options.backupPath);
            
            for (const entry of entries) {
                if (entry.startsWith(backupId)) {
                    return path.join(this.options.backupPath, entry);
                }
            }
            
            return null;
        } catch (error) {
            throw new Error(`Error buscando backup: ${error.message}`);
        }
    }

    /**
     * Carga metadata de un backup
     */
    async loadBackupMetadata(backupPath) {
        try {
            let metadataPath = backupPath;
            
            // Si es un archivo comprimido, extraer temporalmente
            if (backupPath.endsWith('.tar.gz') || backupPath.endsWith('.tar.gz.enc')) {
                // Implementación simplificada
                metadataPath = backupPath.replace('.tar.gz', '').replace('.enc', '');
            }
            
            const metadataFile = path.join(metadataPath, 'backup-metadata.json');
            const metadataContent = await fs.readFile(metadataFile, 'utf8');
            return JSON.parse(metadataContent);
        } catch (error) {
            throw new Error(`Error cargando metadata: ${error.message}`);
        }
    }

    /**
     * Desencripta un backup
     */
    async decryptBackup(backupPath) {
        if (!this.options.encryptionKey) {
            throw new Error('Se requiere una clave de encriptación');
        }
        
        try {
            console.log('🔓 Desencriptando backup...');
            
            const decipher = crypto.createDecipher('aes-256-cbc', this.options.encryptionKey);
            
            if (backupPath.endsWith('.enc')) {
                const encrypted = await fs.readFile(backupPath);
                const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
                await fs.writeFile(backupPath.replace('.enc', ''), decrypted);
                await fs.unlink(backupPath);
            } else {
                await this.decryptDirectory(backupPath, decipher);
            }
            
            console.log('✅ Backup desencriptado correctamente');
        } catch (error) {
            throw new Error(`Error desencriptando backup: ${error.message}`);
        }
    }

    /**
     * Desencripta un directorio
     */
    async decryptDirectory(dirPath, decipher) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.name.endsWith('.enc') && entry.isFile()) {
                const encrypted = await fs.readFile(fullPath);
                const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
                await fs.writeFile(fullPath.replace('.enc', ''), decrypted);
                await fs.unlink(fullPath);
            } else if (entry.isDirectory()) {
                await this.decryptDirectory(fullPath, decipher);
            }
        }
    }

    /**
     * Descomprime un backup
     */
    async decompressBackup(backupPath) {
        try {
            console.log('📦 Descomprimiendo backup...');
            
            const decompressPath = backupPath.replace('.tar.gz', '');
            
            execSync(`tar -xzf "${backupPath}" -C "${path.dirname(backupPath)}"`, {
                stdio: 'inherit'
            });
            
            console.log('✅ Backup descomprimido correctamente');
        } catch (error) {
            throw new Error(`Error descomprimiendo backup: ${error.message}`);
        }
    }

    /**
     * Restaura archivos desde un backup
     */
    async restoreFiles(backupPath, targetPath, overwrite = false) {
        try {
            const sourceDir = backupPath.endsWith('.tar.gz') ? 
                backupPath.replace('.tar.gz', '') : backupPath;
            
            await this.copyDirectory(sourceDir, targetPath, overwrite);
        } catch (error) {
            throw new Error(`Error restaurando archivos: ${error.message}`);
        }
    }

    /**
     * Copia un directorio recursivamente
     */
    async copyDirectory(sourceDir, targetDir, overwrite = false) {
        const entries = await fs.readdir(sourceDir, { withFileTypes: true });
        
        for (const entry of entries) {
            if (entry.name === 'backup-metadata.json') {
                continue; // No restaurar metadata
            }
            
            const sourcePath = path.join(sourceDir, entry.name);
            const targetPath = path.join(targetDir, entry.name);
            
            if (entry.isFile()) {
                if (overwrite) {
                    await fs.copyFile(sourcePath, targetPath);
                } else {
                    try {
                        await fs.copyFile(sourcePath, targetPath);
                    } catch (error) {
                        if (error.code !== 'ENOENT') {
                            throw error;
                        }
                    }
                }
            } else if (entry.isDirectory()) {
                await fs.mkdir(targetPath, { recursive: true });
                await this.copyDirectory(sourcePath, targetPath, overwrite);
            }
        }
    }

    /**
     * Lista todos los backups disponibles
     */
    async listBackups() {
        try {
            const entries = await fs.readdir(this.options.backupPath);
            const backups = [];
            
            for (const entry of entries) {
                if (entry.startsWith('backup-')) {
                    const backupPath = path.join(this.options.backupPath, entry);
                    
                    try {
                        const metadata = await this.loadBackupMetadata(backupPath);
                        backups.push({
                            id: metadata.id,
                            type: metadata.type,
                            timestamp: metadata.timestamp,
                            description: metadata.description,
                            tags: metadata.tags,
                            size: metadata.size,
                            compressed: metadata.compressed,
                            encrypted: metadata.encrypted,
                            path: backupPath
                        });
                    } catch (error) {
                        console.warn(`⚠️ Error cargando metadata de ${entry}:`, error.message);
                    }
                }
            }
            
            return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            throw new Error(`Error listando backups: ${error.message}`);
        }
    }

    /**
     * Elimina un backup
     */
    async deleteBackup(backupId) {
        try {
            const backupPath = await this.findBackupPath(backupId);
            if (!backupPath) {
                throw new Error(`Backup no encontrado: ${backupId}`);
            }
            
            await fs.rmdir(backupPath, { recursive: true });
            
            // Eliminar del historial
            this.backupHistory = this.backupHistory.filter(b => b.id !== backupId);
            await this.saveBackupHistory();
            
            console.log(`🗑️ Backup ${backupId} eliminado correctamente`);
            return true;
        } catch (error) {
            throw new Error(`Error eliminando backup: ${error.message}`);
        }
    }

    /**
     * Limpia backups antiguos
     */
    async cleanupOldBackups() {
        try {
            const backups = await this.listBackups();
            
            if (backups.length <= this.options.maxBackups) {
                return;
            }
            
            const backupsToDelete = backups.slice(this.options.maxBackups);
            
            for (const backup of backupsToDelete) {
                await this.deleteBackup(backup.id);
            }
            
            console.log(`🧹 Limpieza completada: ${backupsToDelete.length} backups eliminados`);
        } catch (error) {
            console.warn(`⚠️ Error en limpieza de backups: ${error.message}`);
        }
    }

    /**
     * Inicia backups programados
     */
    async startScheduledBackups() {
        if (this.scheduleTimer) {
            clearInterval(this.scheduleTimer);
        }
        
        const intervalMs = this.getIntervalMilliseconds(this.options.scheduleInterval);
        
        this.scheduleTimer = setInterval(async () => {
            try {
                await this.createBackup('full', {
                    description: `Scheduled backup (${this.options.scheduleInterval})`,
                    tags: ['scheduled', this.options.scheduleInterval]
                });
            } catch (error) {
                console.error('❌ Error en backup programado:', error.message);
            }
        }, intervalMs);
        
        console.log(`⏰ Backups programados iniciados: ${this.options.scheduleInterval}`);
    }

    /**
     * Detiene backups programados
     */
    stopScheduledBackups() {
        if (this.scheduleTimer) {
            clearInterval(this.scheduleTimer);
            this.scheduleTimer = null;
            console.log('⏹️ Backups programados detenidos');
        }
    }

    /**
     * Obtiene milisegundos para intervalo
     */
    getIntervalMilliseconds(interval) {
        switch (interval) {
            case 'hourly': return 60 * 60 * 1000;
            case 'daily': return 24 * 60 * 60 * 1000;
            case 'weekly': return 7 * 24 * 60 * 60 * 1000;
            default: return 24 * 60 * 60 * 1000;
        }
    }

    /**
     * Obtiene información del proyecto
     */
    async getProjectInfo() {
        try {
            const packageJson = await fs.readFile(this.packageJsonPath, 'utf8');
            const packageData = JSON.parse(packageJson);
            
            return {
                name: packageData.name,
                version: packageData.version,
                description: packageData.description,
                dependencies: Object.keys(packageData.dependencies || {}),
                devDependencies: Object.keys(packageData.devDependencies || {})
            };
        } catch (error) {
            return {
                name: 'unknown',
                version: 'unknown',
                description: 'Unable to load project info'
            };
        }
    }

    /**
     * Obtiene versión de npm
     */
    getNpmVersion() {
        try {
            return execSync('npm --version', { encoding: 'utf8' }).trim();
        } catch {
            return 'unknown';
        }
    }

    /**
     * Obtiene estadísticas de backups
     */
    async getBackupStats() {
        try {
            const backups = await this.listBackups();
            
            const stats = {
                totalBackups: backups.length,
                totalSize: backups.reduce((sum, b) => sum + b.size, 0),
                backupTypes: {},
                oldestBackup: null,
                newestBackup: null,
                compressedBackups: 0,
                encryptedBackups: 0
            };
            
            for (const backup of backups) {
                // Tipos de backup
                if (!stats.backupTypes[backup.type]) {
                    stats.backupTypes[backup.type] = 0;
                }
                stats.backupTypes[backup.type]++;
                
                // Compresión y encriptación
                if (backup.compressed) stats.compressedBackups++;
                if (backup.encrypted) stats.encryptedBackups++;
                
                // Fechas
                const backupDate = new Date(backup.timestamp);
                if (!stats.oldestBackup || backupDate < new Date(stats.oldestBackup.timestamp)) {
                    stats.oldestBackup = backup;
                }
                if (!stats.newestBackup || backupDate > new Date(stats.newestBackup.timestamp)) {
                    stats.newestBackup = backup;
                }
            }
            
            return stats;
        } catch (error) {
            throw new Error(`Error obteniendo estadísticas: ${error.message}`);
        }
    }

    /**
     * Verifica integridad de backups
     */
    async verifyBackupIntegrity(backupId) {
        try {
            const backupPath = await this.findBackupPath(backupId);
            if (!backupPath) {
                throw new Error(`Backup no encontrado: ${backupId}`);
            }
            
            const metadata = await this.loadBackupMetadata(backupPath);
            const currentChecksum = await this.calculateDirectoryChecksum(backupPath);
            
            const isValid = currentChecksum === metadata.checksum;
            
            return {
                backupId,
                isValid,
                expectedChecksum: metadata.checksum,
                actualChecksum: currentChecksum,
                verifiedAt: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Error verificando integridad: ${error.message}`);
        }
    }

    /**
     * Exporta configuración de backups
     */
    exportConfiguration() {
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            options: this.options,
            backupTypes: this.backupTypes,
            statistics: {
                totalBackups: this.backupHistory.length,
                lastBackup: this.backupHistory.length > 0 ? 
                    this.backupHistory[this.backupHistory.length - 1].timestamp : null
            }
        };
    }

    /**
     * Importa configuración de backups
     */
    async importConfiguration(config) {
        try {
            if (config.version !== '1.0.0') {
                throw new Error('Versión de configuración no compatible');
            }
            
            // Actualizar opciones
            Object.assign(this.options, config.options);
            
            // Guardar configuración
            const configPath = path.join(this.options.backupPath, 'backup-config.json');
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
            
            console.log('✅ Configuración de backups importada correctamente');
            return true;
        } catch (error) {
            throw new Error(`Error importando configuración: ${error.message}`);
        }
    }
}

module.exports = BackupManager;