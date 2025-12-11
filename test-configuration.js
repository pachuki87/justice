#!/usr/bin/env node

/**
 * Pruebas automatizadas de configuración para Justice 2
 * Verifica que el build, deploy y configuración funcionen correctamente
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const http = require('http');

class ConfigurationTester {
  constructor() {
    this.testResults = [];
    this.projectRoot = process.cwd();
    this.testTimeout = 30000; // 30 segundos por prueba
  }

  // Ejecutar todas las pruebas
  async runAllTests() {
    console.log('🧪 Iniciando pruebas de configuración...\n');

    try {
      await this.testPackageJsonValidation();
      await this.testNetlifyConfiguration();
      await this.testDependenciesInstallation();
      await this.testLinting();
      await this.testBuildProcess();
      await this.testSecurityHeaders();
      await this.testEnvironmentVariables();
      await this.testApiEndpoints();
      await this.testStaticAssets();
      await this.testPerformanceOptimization();
      await this.testDeploymentConfiguration();
      
      this.generateTestReport();
      return this.getSuccessRate();
    } catch (error) {
      console.error('❌ Error crítico durante las pruebas:', error.message);
      this.addTestResult('Error Crítico', false, error.message);
      return 0;
    }
  }

  // Probar validación de package.json
  async testPackageJsonValidation() {
    console.log('📦 Probando validación de package.json...');
    
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      
      if (!fs.existsSync(packagePath)) {
        this.addTestResult('package.json existe', false, 'package.json no encontrado');
        return;
      }

      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Validar estructura JSON
      this.addTestResult('package.json JSON válido', true);
      
      // Validar campos requeridos
      const requiredFields = ['name', 'version', 'description', 'scripts'];
      for (const field of requiredFields) {
        const hasField = packageJson[field] !== undefined;
        this.addTestResult(`Campo ${field} presente`, hasField, hasField ? '' : `Campo ${field} faltante`);
      }

      // Validar scripts esenciales
      const essentialScripts = ['start', 'dev', 'build', 'test'];
      for (const script of essentialScripts) {
        const hasScript = packageJson.scripts && packageJson.scripts[script];
        this.addTestResult(`Script ${script} presente`, hasScript, hasScript ? '' : `Script ${script} faltante`);
      }

    } catch (error) {
      this.addTestResult('package.json validación', false, error.message);
    }
  }

  // Probar configuración de Netlify
  async testNetlifyConfiguration() {
    console.log('🌐 Probando configuración de Netlify...');
    
    try {
      const netlifyPath = path.join(this.projectRoot, 'netlify.toml');
      
      if (!fs.existsSync(netlifyPath)) {
        this.addTestResult('netlify.toml existe', false, 'netlify.toml no encontrado');
        return;
      }

      const tomlContent = fs.readFileSync(netlifyPath, 'utf8');
      
      // Validar configuración básica
      this.addTestResult('Configuración [build] presente', tomlContent.includes('[build]'));
      this.addTestResult('Functions configurado', tomlContent.includes('functions'));
      this.addTestResult('Publish configurado', tomlContent.includes('publish'));
      
      // Validar headers de seguridad
      const securityHeaders = [
        'Content-Security-Policy',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Strict-Transport-Security'
      ];

      for (const header of securityHeaders) {
        this.addTestResult(`Header ${header} presente`, tomlContent.includes(header));
      }

      // Validar redirecciones
      this.addTestResult('Redirección API configurada', tomlContent.includes('/api/*'));

    } catch (error) {
      this.addTestResult('netlify.toml configuración', false, error.message);
    }
  }

  // Probar instalación de dependencias
  async testDependenciesInstallation() {
    console.log('📚 Probando instalación de dependencias...');
    
    try {
      // Verificar si node_modules existe
      const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
      const nodeModulesExists = fs.existsSync(nodeModulesPath);
      this.addTestResult('node_modules existe', nodeModulesExists);

      if (nodeModulesExists) {
        // Verificar dependencias críticas
        const criticalDeps = ['express', 'jsonwebtoken', 'bcryptjs', 'cors'];
        for (const dep of criticalDeps) {
          const depPath = path.join(nodeModulesPath, dep);
          const depExists = fs.existsSync(depPath);
          this.addTestResult(`Dependencia ${dep} instalada`, depExists);
        }
      }

      // Ejecutar npm list para verificar integridad
      try {
        execSync('npm list --depth=0', { stdio: 'pipe' });
        this.addTestResult('Dependencias consistentes', true);
      } catch (error) {
        this.addTestResult('Dependencias consistentes', false, 'Dependencias inconsistentes');
      }

    } catch (error) {
      this.addTestResult('Instalación de dependencias', false, error.message);
    }
  }

  // Probar linting
  async testLinting() {
    console.log('🔍 Probando linting...');
    
    try {
      // Verificar configuración de ESLint
      const eslintConfigPath = path.join(this.projectRoot, '.eslintrc.js');
      const eslintConfigExists = fs.existsSync(eslintConfigPath);
      this.addTestResult('.eslintrc.js existe', eslintConfigExists);

      if (eslintConfigExists) {
        // Ejecutar ESLint en modo dry-run
        try {
          execSync('npx eslint . --ext .js --max-warnings 0', { 
            stdio: 'pipe',
            timeout: this.testTimeout 
          });
          this.addTestResult('ESLint sin errores', true);
        } catch (error) {
          this.addTestResult('ESLint sin errores', false, 'Errores de linting encontrados');
        }
      }

    } catch (error) {
      this.addTestResult('Configuración de linting', false, error.message);
    }
  }

  // Probar proceso de build
  async testBuildProcess() {
    console.log('🏗️ Probando proceso de build...');
    
    try {
      // Ejecutar script de build
      try {
        execSync('npm run build', { 
          stdio: 'pipe',
          timeout: this.testTimeout 
        });
        this.addTestResult('Build exitoso', true);
      } catch (error) {
        this.addTestResult('Build exitoso', false, 'Build falló');
      }

      // Verificar archivos de salida
      const indexPath = path.join(this.projectRoot, 'index.html');
      const indexExists = fs.existsSync(indexPath);
      this.addTestResult('index.html existe', indexExists);

      // Verificar directorios de assets
      const assetDirs = ['css', 'js', 'images'];
      for (const dir of assetDirs) {
        const dirPath = path.join(this.projectRoot, dir);
        const dirExists = fs.existsSync(dirPath);
        this.addTestResult(`Directorio ${dir} existe`, dirExists);
      }

    } catch (error) {
      this.addTestResult('Proceso de build', false, error.message);
    }
  }

  // Probar headers de seguridad
  async testSecurityHeaders() {
    console.log('🔒 Probando headers de seguridad...');
    
    try {
      // Leer configuración de headers
      const netlifyPath = path.join(this.projectRoot, 'netlify.toml');
      if (fs.existsSync(netlifyPath)) {
        const tomlContent = fs.readFileSync(netlifyPath, 'utf8');
        
        const securityHeaders = [
          'Content-Security-Policy',
          'X-Frame-Options',
          'X-Content-Type-Options',
          'X-XSS-Protection',
          'Strict-Transport-Security',
          'Referrer-Policy'
        ];

        for (const header of securityHeaders) {
          const hasHeader = tomlContent.includes(header);
          this.addTestResult(`Header de seguridad ${header}`, hasHeader);
        }
      }

    } catch (error) {
      this.addTestResult('Headers de seguridad', false, error.message);
    }
  }

  // Probar variables de entorno
  async testEnvironmentVariables() {
    console.log('🌍 Probando variables de entorno...');
    
    try {
      // Verificar .env.example
      const envExamplePath = path.join(this.projectRoot, '.env.example');
      const envExampleExists = fs.existsSync(envExamplePath);
      this.addTestResult('.env.example existe', envExampleExists);

      if (envExampleExists) {
        const envContent = fs.readFileSync(envExamplePath, 'utf8');
        const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY'];
        
        for (const varName of requiredVars) {
          const hasVar = envContent.includes(varName);
          this.addTestResult(`Variable ${varName} documentada`, hasVar);
        }
      }

      // Verificar que .env no esté en el repositorio
      const envPath = path.join(this.projectRoot, '.env');
      const envExists = fs.existsSync(envPath);
      this.addTestResult('.env no versionado', !envExists);

    } catch (error) {
      this.addTestResult('Variables de entorno', false, error.message);
    }
  }

  // Probar endpoints de API
  async testApiEndpoints() {
    console.log('🔌 Probando endpoints de API...');
    
    try {
      // Verificar configuración de redirección API
      const netlifyPath = path.join(this.projectRoot, 'netlify.toml');
      if (fs.existsSync(netlifyPath)) {
        const tomlContent = fs.readFileSync(netlifyPath, 'utf8');
        
        this.addTestResult('Redirección /api/* configurada', tomlContent.includes('/api/*'));
        
        // Verificar funciones de API
        const functionsPath = path.join(this.projectRoot, 'netlify/functions');
        const functionsExist = fs.existsSync(functionsPath);
        this.addTestResult('Directorio functions existe', functionsExist);

        if (functionsExist) {
          const apiFile = path.join(functionsPath, 'api.js');
          const apiExists = fs.existsSync(apiFile);
          this.addTestResult('API function existe', apiExists);
        }
      }

    } catch (error) {
      this.addTestResult('Endpoints de API', false, error.message);
    }
  }

  // Probar assets estáticos
  async testStaticAssets() {
    console.log('📁 Probando assets estáticos...');
    
    try {
      const indexPath = path.join(this.projectRoot, 'index.html');
      if (fs.existsSync(indexPath)) {
        const htmlContent = fs.readFileSync(indexPath, 'utf8');
        
        // Verificar referencias a CSS y JS
        this.addTestResult('Referencia a CSS presente', htmlContent.includes('<link') || htmlContent.includes('.css'));
        this.addTestResult('Referencia a JS presente', htmlContent.includes('<script') || htmlContent.includes('.js'));
      }

      // Verificar directorios de assets
      const assetDirs = ['css', 'js', 'images'];
      for (const dir of assetDirs) {
        const dirPath = path.join(this.projectRoot, dir);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          const hasFiles = files.length > 0;
          this.addTestResult(`Directorio ${dir} con archivos`, hasFiles);
        }
      }

    } catch (error) {
      this.addTestResult('Assets estáticos', false, error.message);
    }
  }

  // Probar optimización de rendimiento
  async testPerformanceOptimization() {
    console.log('⚡ Probando optimización de rendimiento...');
    
    try {
      const netlifyPath = path.join(this.projectRoot, 'netlify.toml');
      if (fs.existsSync(netlifyPath)) {
        const tomlContent = fs.readFileSync(netlifyPath, 'utf8');
        
        // Verificar headers de caché
        this.addTestResult('Headers de caché configurados', tomlContent.includes('Cache-Control'));
        
        // Verificar plugins de optimización
        const optimizationPlugins = [
          '@netlify/plugin-lighthouse',
          '@netlify/plugin-minify-html'
        ];
        
        for (const plugin of optimizationPlugins) {
          const hasPlugin = tomlContent.includes(plugin);
          this.addTestResult(`Plugin ${plugin} presente`, hasPlugin);
        }
      }

    } catch (error) {
      this.addTestResult('Optimización de rendimiento', false, error.message);
    }
  }

  // Probar configuración de deploy
  async testDeploymentConfiguration() {
    console.log('🚀 Probando configuración de deploy...');
    
    try {
      // Verificar configuración de Netlify CLI
      try {
        execSync('npx netlify --version', { stdio: 'pipe' });
        this.addTestResult('Netlify CLI disponible', true);
      } catch (error) {
        this.addTestResult('Netlify CLI disponible', false, 'Netlify CLI no instalado');
      }

      // Verificar scripts de deploy
      const packagePath = path.join(this.projectRoot, 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        const hasDeployScript = packageJson.scripts && packageJson.scripts.deploy;
        this.addTestResult('Script deploy presente', hasDeployScript);
        
        const hasStagingScript = packageJson.scripts && packageJson.scripts['deploy:staging'];
        this.addTestResult('Script deploy:staging presente', hasStagingScript);
      }

    } catch (error) {
      this.addTestResult('Configuración de deploy', false, error.message);
    }
  }

  // Agregar resultado de prueba
  addTestResult(testName, passed, message = '') {
    this.testResults.push({
      name: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    });

    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${testName}${message ? ` - ${message}` : ''}`);
  }

  // Calcular tasa de éxito
  getSuccessRate() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.passed).length;
    return totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  }

  // Generar reporte de pruebas
  generateTestReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 REPORTE DE PRUEBAS DE CONFIGURACIÓN');
    console.log('='.repeat(60));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = this.getSuccessRate();

    console.log(`\n📈 RESUMEN:`);
    console.log(`  Total de pruebas: ${totalTests}`);
    console.log(`  ✅ Exitosas: ${passedTests}`);
    console.log(`  ❌ Fallidas: ${failedTests}`);
    console.log(`  📊 Tasa de éxito: ${successRate}%`);

    if (failedTests > 0) {
      console.log('\n❌ PRUEBAS FALLIDAS:');
      this.testResults
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  • ${test.name}: ${test.message}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    
    if (successRate >= 90) {
      console.log('🎉 ¡Excelente! La configuración está en óptimas condiciones.');
    } else if (successRate >= 70) {
      console.log('👍 Bien! La configuración es funcional pero puede mejorarse.');
    } else {
      console.log('⚠️ Se requiere atención. Hay problemas importantes que resolver.');
    }
    
    console.log('='.repeat(60));

    // Generar reporte JSON
    const reportPath = path.join(this.projectRoot, 'configuration-test-report.json');
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: successRate
      },
      results: this.testResults
    };

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Reporte detallado guardado en: ${reportPath}`);
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  const tester = new ConfigurationTester();
  tester.runAllTests()
    .then(successRate => {
      process.exit(successRate >= 70 ? 0 : 1);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = ConfigurationTester;