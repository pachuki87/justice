#!/usr/bin/env node

/**
 * Sistema de validación de configuración para Justice 2
 * Valida package.json, netlify.toml y archivos de configuración relacionados
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ConfigurationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = [];
    this.projectRoot = process.cwd();
  }

  // Método principal para ejecutar todas las validaciones
  async validateAll() {
    console.log('🔍 Iniciando validación completa de configuración...\n');

    try {
      await this.validatePackageJson();
      await this.validateNetlifyToml();
      await this.validateDevDependencies();
      await this.validateSecurityConfiguration();
      await this.validateBuildConfiguration();
      await this.validateEnvironmentConfiguration();
      await this.validateTestingConfiguration();
      await this.validatePerformanceConfiguration();
      await this.validateGitConfiguration();
      
      this.generateReport();
      return this.errors.length === 0;
    } catch (error) {
      console.error('❌ Error durante la validación:', error.message);
      this.errors.push(`Error crítico: ${error.message}`);
      return false;
    }
  }

  // Validar package.json
  async validatePackageJson() {
    console.log('📦 Validando package.json...');
    
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      
      if (!fs.existsSync(packagePath)) {
        this.errors.push('package.json no encontrado');
        return;
      }

      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Validar campos requeridos
      const requiredFields = ['name', 'version', 'description', 'main', 'scripts'];
      for (const field of requiredFields) {
        if (!packageJson[field]) {
          this.errors.push(`Campo requerido faltante en package.json: ${field}`);
        }
      }

      // Validar scripts esenciales
      const essentialScripts = ['start', 'dev', 'build', 'test', 'lint'];
      for (const script of essentialScripts) {
        if (!packageJson.scripts || !packageJson.scripts[script]) {
          this.warnings.push(`Script recomendado faltante: ${script}`);
        }
      }

      // Validar dependencias
      if (packageJson.dependencies) {
        const criticalDeps = ['express', 'jsonwebtoken', 'bcryptjs', 'cors', 'dotenv'];
        for (const dep of criticalDeps) {
          if (!packageJson.dependencies[dep]) {
            this.warnings.push(`Dependencia crítica faltante: ${dep}`);
          }
        }
      }

      // Validar engines
      if (!packageJson.engines || !packageJson.engines.node) {
        this.warnings.push('No se especificó versión mínima de Node.js');
      }

      // Validar que sea privado
      if (packageJson.private !== true) {
        this.warnings.push('El paquete debería ser privado para evitar publicación accidental');
      }

      this.success.push('✅ package.json validado correctamente');
    } catch (error) {
      this.errors.push(`Error validando package.json: ${error.message}`);
    }
  }

  // Validar netlify.toml
  async validateNetlifyToml() {
    console.log('🌐 Validando netlify.toml...');
    
    try {
      const netlifyPath = path.join(this.projectRoot, 'netlify.toml');
      
      if (!fs.existsSync(netlifyPath)) {
        this.errors.push('netlify.toml no encontrado');
        return;
      }

      const tomlContent = fs.readFileSync(netlifyPath, 'utf8');
      
      // Validar configuración de build
      if (!tomlContent.includes('[build]')) {
        this.errors.push('Configuración [build] faltante en netlify.toml');
      }

      // Validar headers de seguridad
      const securityHeaders = [
        'Content-Security-Policy',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Strict-Transport-Security'
      ];

      for (const header of securityHeaders) {
        if (!tomlContent.includes(header)) {
          this.warnings.push(`Header de seguridad faltante: ${header}`);
        }
      }

      // Validar redirecciones API
      if (!tomlContent.includes('/api/*')) {
        this.warnings.push('Redirección de API no configurada');
      }

      this.success.push('✅ netlify.toml validado correctamente');
    } catch (error) {
      this.errors.push(`Error validando netlify.toml: ${error.message}`);
    }
  }

  // Validar dependencias de desarrollo
  async validateDevDependencies() {
    console.log('🛠️ Validando dependencias de desarrollo...');
    
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      const devDeps = packageJson.devDependencies || {};
      const requiredDevDeps = ['eslint', 'prettier', 'jest', 'netlify-cli'];
      
      for (const dep of requiredDevDeps) {
        if (!devDeps[dep]) {
          this.warnings.push(`Dependencia de desarrollo recomendada faltante: ${dep}`);
        }
      }

      // Validar archivos de configuración
      const configFiles = [
        '.eslintrc.js',
        '.prettierrc',
        'jest.config.js',
        '.ncurc.json'
      ];

      for (const file of configFiles) {
        const filePath = path.join(this.projectRoot, file);
        if (!fs.existsSync(filePath)) {
          this.warnings.push(`Archivo de configuración faltante: ${file}`);
        }
      }

      this.success.push('✅ Dependencias de desarrollo validadas');
    } catch (error) {
      this.errors.push(`Error validando dependencias de desarrollo: ${error.message}`);
    }
  }

  // Validar configuración de seguridad
  async validateSecurityConfiguration() {
    console.log('🔒 Validando configuración de seguridad...');
    
    try {
      // Validar .env.example
      const envExamplePath = path.join(this.projectRoot, '.env.example');
      if (!fs.existsSync(envExamplePath)) {
        this.warnings.push('.env.example no encontrado');
      }

      // Validar .gitignore
      const gitignorePath = path.join(this.projectRoot, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        const requiredIgnores = ['.env', 'node_modules/', 'coverage/', 'dist/'];
        
        for (const ignore of requiredIgnores) {
          if (!gitignoreContent.includes(ignore)) {
            this.warnings.push(`Entrada recomendada faltante en .gitignore: ${ignore}`);
          }
        }
      } else {
        this.errors.push('.gitignore no encontrado');
      }

      // Ejecutar npm audit
      try {
        execSync('npm audit --audit-level moderate', { stdio: 'pipe' });
        this.success.push('✅ No hay vulnerabilidades de seguridad conocidas');
      } catch (error) {
        this.warnings.push('Se encontraron vulnerabilidades de seguridad (ejecutar npm audit)');
      }

      this.success.push('✅ Configuración de seguridad validada');
    } catch (error) {
      this.errors.push(`Error validando configuración de seguridad: ${error.message}`);
    }
  }

  // Validar configuración de build
  async validateBuildConfiguration() {
    console.log('🏗️ Validando configuración de build...');
    
    try {
      // Validar que exista index.html
      const indexPath = path.join(this.projectRoot, 'index.html');
      if (!fs.existsSync(indexPath)) {
        this.errors.push('index.html no encontrado');
      }

      // Validar directorios de assets
      const assetDirs = ['css/', 'js/', 'images/'];
      for (const dir of assetDirs) {
        const dirPath = path.join(this.projectRoot, dir);
        if (!fs.existsSync(dirPath)) {
          this.warnings.push(`Directorio de assets faltante: ${dir}`);
        }
      }

      // Validar scripts de build
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      if (!packageJson.scripts.build) {
        this.warnings.push('Script build no configurado');
      }

      this.success.push('✅ Configuración de build validada');
    } catch (error) {
      this.errors.push(`Error validando configuración de build: ${error.message}`);
    }
  }

  // Validar configuración de entorno
  async validateEnvironmentConfiguration() {
    console.log('🌍 Validando configuración de entorno...');
    
    try {
      const netlifyPath = path.join(this.projectRoot, 'netlify.toml');
      if (fs.existsSync(netlifyPath)) {
        const tomlContent = fs.readFileSync(netlifyPath, 'utf8');
        
        // Validar configuración por contexto
        if (!tomlContent.includes('[context.production]')) {
          this.warnings.push('Configuración de producción faltante');
        }
        
        if (!tomlContent.includes('[context.development]')) {
          this.warnings.push('Configuración de desarrollo faltante');
        }
      }

      this.success.push('✅ Configuración de entorno validada');
    } catch (error) {
      this.errors.push(`Error validando configuración de entorno: ${error.message}`);
    }
  }

  // Validar configuración de testing
  async validateTestingConfiguration() {
    console.log('🧪 Validando configuración de testing...');
    
    try {
      const jestConfigPath = path.join(this.projectRoot, 'jest.config.js');
      const testSetupPath = path.join(this.projectRoot, 'test-setup.js');
      
      if (!fs.existsSync(jestConfigPath)) {
        this.warnings.push('jest.config.js no encontrado');
      }
      
      if (!fs.existsSync(testSetupPath)) {
        this.warnings.push('test-setup.js no encontrado');
      }

      // Buscar archivos de prueba
      const testFiles = this.findFiles('**/test*.js').length + 
                       this.findFiles('**/*.test.js').length;
      
      if (testFiles === 0) {
        this.warnings.push('No se encontraron archivos de prueba');
      }

      this.success.push('✅ Configuración de testing validada');
    } catch (error) {
      this.errors.push(`Error validando configuración de testing: ${error.message}`);
    }
  }

  // Validar configuración de rendimiento
  async validatePerformanceConfiguration() {
    console.log('⚡ Validando configuración de rendimiento...');
    
    try {
      const netlifyPath = path.join(this.projectRoot, 'netlify.toml');
      if (fs.existsSync(netlifyPath)) {
        const tomlContent = fs.readFileSync(netlifyPath, 'utf8');
        
        // Validar headers de caché
        const cacheHeaders = ['Cache-Control', 'ETag'];
        for (const header of cacheHeaders) {
          if (!tomlContent.includes(header)) {
            this.warnings.push(`Header de rendimiento faltante: ${header}`);
          }
        }

        // Validar plugins de optimización
        const optimizationPlugins = [
          '@netlify/plugin-lighthouse',
          '@netlify/plugin-minify-html'
        ];
        
        for (const plugin of optimizationPlugins) {
          if (!tomlContent.includes(plugin)) {
            this.warnings.push(`Plugin de optimización faltante: ${plugin}`);
          }
        }
      }

      this.success.push('✅ Configuración de rendimiento validada');
    } catch (error) {
      this.errors.push(`Error validando configuración de rendimiento: ${error.message}`);
    }
  }

  // Validar configuración de Git
  async validateGitConfiguration() {
    console.log('📚 Validando configuración de Git...');
    
    try {
      const gitPath = path.join(this.projectRoot, '.git');
      
      if (!fs.existsSync(gitPath)) {
        this.warnings.push('Repositorio Git no inicializado');
        return;
      }

      // Validar hooks de Git si existen
      const hooksPath = path.join(gitPath, 'hooks');
      if (fs.existsSync(hooksPath)) {
        const hooks = fs.readdirSync(hooksPath);
        const recommendedHooks = ['pre-commit', 'pre-push'];
        
        for (const hook of recommendedHooks) {
          if (hooks.includes(hook)) {
            this.success.push(`✅ Hook de Git encontrado: ${hook}`);
          }
        }
      }

      this.success.push('✅ Configuración de Git validada');
    } catch (error) {
      this.warnings.push(`Error validando configuración de Git: ${error.message}`);
    }
  }

  // Método auxiliar para buscar archivos
  findFiles(pattern) {
    try {
      return execSync(`find . -name "${pattern}"`, { 
        encoding: 'utf8', 
        stdio: 'pipe' 
      }).split('\n').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  // Generar reporte de validación
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 REPORTE DE VALIDACIÓN DE CONFIGURACIÓN');
    console.log('='.repeat(60));

    if (this.success.length > 0) {
      console.log('\n✅ VALIDACIONES EXITOSAS:');
      this.success.forEach(item => console.log(`  ${item}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️ ADVERTENCIAS:');
      this.warnings.forEach(item => console.log(`  ${item}`));
    }

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORES:');
      this.errors.forEach(item => console.log(`  ${item}`));
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📈 RESUMEN:`);
    console.log(`  ✅ Exitos: ${this.success.length}`);
    console.log(`  ⚠️ Advertencias: ${this.warnings.length}`);
    console.log(`  ❌ Errores: ${this.errors.length}`);
    
    const totalIssues = this.errors.length + this.warnings.length;
    if (totalIssues === 0) {
      console.log('\n🎉 ¡Configuración perfecta! No se encontraron problemas.');
    } else {
      console.log(`\n📋 Se encontraron ${totalIssues} problemas que deben ser abordados.`);
    }
    
    console.log('='.repeat(60));
  }
}

// Ejecutar validación si se llama directamente
if (require.main === module) {
  const validator = new ConfigurationValidator();
  validator.validateAll()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = ConfigurationValidator;