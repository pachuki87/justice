/**
 * Script de prueba para el sistema de documentación de dependencias
 * 
 * Este script prueba todas las funcionalidades del DependencyDocumentation:
 * - Generación de documentación completa
 * - Creación de archivos individuales
 * - Generación de reportes
 * - Actualización de documentación
 */

const DependencyDocumentation = require('./components/dependency-documentation');

// Configuración de pruebas
const TEST_CONFIG = {
    projectPath: process.cwd(),
    docsPath: './test-dependency-docs',
    autoGenerate: true,
    includeDevDependencies: true,
    format: ['markdown', 'json'], // Sin HTML para simplificar pruebas
    updateFrequency: 'daily',
    retentionDays: 30
};

// Escenarios de prueba
const TEST_SCENARIOS = [
    {
        name: 'Full Documentation Generation',
        description: 'Generación completa de documentación',
        action: 'generateAll'
    },
    {
        name: 'Dependency Documentation Only',
        description: 'Generación solo de documentación de dependencias',
        action: 'dependencies'
    },
    {
        name: 'Vulnerability Documentation Only',
        description: 'Generación solo de documentación de vulnerabilidades',
        action: 'vulnerabilities'
    },
    {
        name: 'Update Documentation Only',
        description: 'Generación solo de documentación de actualizaciones',
        action: 'updates'
    },
    {
        name: 'Policy Documentation Only',
        description: 'Generación solo de documentación de políticas',
        action: 'policies'
    },
    {
        name: 'Best Practices Documentation Only',
        description: 'Generación solo de mejores prácticas',
        action: 'bestPractices'
    },
    {
        name: 'Troubleshooting Documentation Only',
        description: 'Generación solo de troubleshooting',
        action: 'troubleshooting'
    }
];

// Resultados de pruebas
let testResults = [];
let currentTest = null;
let docManager = null;

/**
 * Inicia las pruebas del sistema de documentación
 */
async function runDocumentationTests() {
    console.log('🚀 Iniciando pruebas del sistema de documentación de dependencias...\n');
    
    try {
        // Inicializar el gestor de documentación
        docManager = new DependencyDocumentation(TEST_CONFIG);
        await docManager.initialize();
        
        console.log('✅ DependencyDocumentation inicializado correctamente\n');
        
        // Ejecutar escenarios de prueba
        for (const scenario of TEST_SCENARIOS) {
            console.log(`📋 Ejecutando escenario: ${scenario.name}`);
            console.log(`📝 ${scenario.description}\n`);
            
            currentTest = scenario.name;
            
            try {
                const startTime = Date.now();
                
                // Ejecutar prueba específica
                const result = await executeDocumentationTest(scenario);
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // Guardar resultado
                const testResult = {
                    scenario: scenario.name,
                    description: scenario.description,
                    success: result.success,
                    duration: duration,
                    generatedFiles: result.generatedFiles || [],
                    documentation: result.documentation || {},
                    error: result.error || null,
                    timestamp: new Date().toISOString()
                };
                
                testResults.push(testResult);
                
                // Mostrar resultado
                console.log(`✅ Escenario "${scenario.name}" completado en ${duration}ms`);
                console.log(`📊 Resultado: ${result.success ? 'EXITOSO' : 'FALLIDO'}`);
                
                if (result.generatedFiles && result.generatedFiles.length > 0) {
                    console.log(`📄 Archivos generados: ${result.generatedFiles.length}`);
                }
                
                console.log('');
                
            } catch (error) {
                console.error(`❌ Error en escenario "${scenario.name}": ${error.message}\n`);
                
                testResults.push({
                    scenario: scenario.name,
                    description: scenario.description,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Probar actualización de documentación
        await testDocumentationUpdates();
        
        // Generar resumen final
        await generateFinalSummary();
        
        console.log('🎉 Pruebas del sistema de documentación completadas');
        
    } catch (error) {
        console.error('❌ Error general en pruebas:', error.message);
        process.exit(1);
    }
}

/**
 * Ejecuta una prueba de documentación específica
 */
async function executeDocumentationTest(scenario) {
    const result = {
        success: true,
        generatedFiles: [],
        documentation: {}
    };
    
    try {
        switch (scenario.action) {
            case 'generateAll':
                console.log('📚 Generando toda la documentación...');
                result.documentation = await docManager.generateAllDocumentation();
                result.generatedFiles = await countGeneratedFiles();
                break;
                
            case 'dependencies':
                console.log('📦 Generando documentación de dependencias...');
                result.documentation.dependencies = await docManager.generateDependencyDocumentation();
                result.generatedFiles = await countFilesInDirectory('./test-dependency-docs/dependencies');
                break;
                
            case 'vulnerabilities':
                console.log('🔒 Generando documentación de vulnerabilidades...');
                result.documentation.vulnerabilities = await docManager.generateVulnerabilityDocumentation();
                result.generatedFiles = await countFilesInDirectory('./test-dependency-docs/vulnerabilities');
                break;
                
            case 'updates':
                console.log('🔄 Generando documentación de actualizaciones...');
                result.documentation.updates = await docManager.generateUpdateDocumentation();
                result.generatedFiles = await countFilesInDirectory('./test-dependency-docs/updates');
                break;
                
            case 'policies':
                console.log('📋 Generando documentación de políticas...');
                result.documentation.policies = await docManager.generatePolicyDocumentation();
                result.generatedFiles = await countFilesInDirectory('./test-dependency-docs/policies');
                break;
                
            case 'bestPractices':
                console.log('💡 Generando documentación de mejores prácticas...');
                result.documentation.bestPractices = await docManager.generateBestPracticesDocumentation();
                result.generatedFiles = await countFilesInDirectory('./test-dependency-docs/best-practices');
                break;
                
            case 'troubleshooting':
                console.log('🔧 Generando documentación de troubleshooting...');
                result.documentation.troubleshooting = await docManager.generateTroubleshootingDocumentation();
                result.generatedFiles = await countFilesInDirectory('./test-dependency-docs/troubleshooting');
                break;
                
            default:
                throw new Error(`Acción no reconocida: ${scenario.action}`);
        }
        
        console.log('✅ Documentación generada correctamente');
        
        return result;
        
    } catch (error) {
        result.success = false;
        result.error = error.message;
        throw error;
    }
}

/**
 * Cuenta archivos generados
 */
async function countGeneratedFiles() {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
        const directories = [
            './test-dependency-docs/dependencies',
            './test-dependency-docs/vulnerabilities',
            './test-dependency-docs/updates',
            './test-dependency-docs/policies',
            './test-dependency-docs/best-practices',
            './test-dependency-docs/troubleshooting',
            './test-dependency-docs/reports'
        ];
        
        let totalFiles = 0;
        
        for (const dir of directories) {
            try {
                const files = await fs.readdir(dir);
                totalFiles += files.length;
            } catch (error) {
                // Directorio no existe o está vacío
            }
        }
        
        // Contar archivos principales
        try {
            const mainFiles = await fs.readdir('./test-dependency-docs');
            totalFiles += mainFiles.filter(f => f.endsWith('.md') || f.endsWith('.json')).length;
        } catch (error) {
            // Directorio principal no existe
        }
        
        return totalFiles;
    } catch (error) {
        return 0;
    }
}

/**
 * Cuenta archivos en un directorio específico
 */
async function countFilesInDirectory(dirPath) {
    const fs = require('fs').promises;
    
    try {
        const files = await fs.readdir(dirPath);
        return files.length;
    } catch (error) {
        return 0;
    }
}

/**
 * Prueba actualización de documentación
 */
async function testDocumentationUpdates() {
    console.log('🔄 Probando actualización de documentación...\n');
    
    try {
        // Probar actualización de dependencia
        const updateData = {
            name: 'test-package',
            version: '1.0.0',
            type: 'production',
            metadata: {
                description: 'Paquete de prueba',
                latestVersion: '1.1.0'
            }
        };
        
        const updateResult = await docManager.updateDocumentation('dependency', updateData);
        
        console.log('✅ Actualización de documentación completada');
        console.log(`📄 Tipo: ${updateResult.type || 'dependency'}`);
        
        // Agregar resultado de actualización
        testResults.push({
            scenario: 'Documentation Update Test',
            description: 'Prueba de actualización de documentación',
            success: true,
            updateResult,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error en actualización de documentación:', error.message);
        
        testResults.push({
            scenario: 'Documentation Update Test',
            description: 'Prueba de actualización de documentación',
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Genera resumen final de pruebas
 */
async function generateFinalSummary() {
    console.log('📊 Generando resumen final...\n');
    
    const summary = {
        totalTests: testResults.length,
        passedTests: testResults.filter(r => r.success).length,
        failedTests: testResults.filter(r => !r.success).length,
        averageDuration: 0,
        totalDuration: testResults.reduce((sum, r) => sum + (r.duration || 0), 0),
        totalGeneratedFiles: testResults.reduce((sum, r) => sum + (r.generatedFiles?.length || 0), 0),
        scenarios: {},
        documentationTypes: {},
        recommendations: []
    };
    
    // Calcular duración promedio
    if (summary.totalTests > 0) {
        summary.averageDuration = Math.round(summary.totalDuration / summary.totalTests);
    }
    
    // Agrupar por escenario
    testResults.forEach(result => {
        summary.scenarios[result.scenario] = {
            success: result.success,
            duration: result.duration || 0,
            generatedFiles: result.generatedFiles?.length || 0
        };
    });
    
    // Contar tipos de documentación generados
    const docTypes = ['dependencies', 'vulnerabilities', 'updates', 'policies', 'bestPractices', 'troubleshooting'];
    docTypes.forEach(type => {
        summary.documentationTypes[type] = testResults.some(r => 
            r.documentation && r.documentation[type]
        );
    });
    
    // Generar recomendaciones
    summary.recommendations = generateRecommendations(summary);
    
    // Mostrar resumen
    console.log('📈 RESUMEN DE PRUEBAS');
    console.log('='.repeat(50));
    console.log(`Total de pruebas: ${summary.totalTests}`);
    console.log(`Pruebas exitosas: ${summary.passedTests}`);
    console.log(`Pruebas fallidas: ${summary.failedTests}`);
    console.log(`Duración promedio: ${summary.averageDuration}ms`);
    console.log(`Duración total: ${summary.totalDuration}ms`);
    console.log(`Total archivos generados: ${summary.totalGeneratedFiles}\n`);
    
    console.log('📋 RESULTADOS POR ESCENARIO');
    console.log('-'.repeat(50));
    for (const [scenario, result] of Object.entries(summary.scenarios)) {
        console.log(`${scenario}:`);
        console.log(`  ✅ Éxito: ${result.success ? 'Sí' : 'No'}`);
        console.log(`  ⏱️ Duración: ${result.duration}ms`);
        console.log(`  📄 Archivos: ${result.generatedFiles}`);
        console.log('');
    }
    
    console.log('📚 TIPOS DE DOCUMENTACIÓN');
    console.log('-'.repeat(50));
    for (const [type, generated] of Object.entries(summary.documentationTypes)) {
        console.log(`${type}: ${generated ? '✅ Generado' : '❌ No generado'}`);
    }
    
    console.log('\n💡 RECOMENDACIONES');
    console.log('-'.repeat(50));
    summary.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
    });
    
    // Guardar resumen en archivo
    await saveSummaryToFile(summary);
}

/**
 * Genera recomendaciones basadas en resultados
 */
function generateRecommendations(summary) {
    const recommendations = [];
    
    if (summary.failedTests > 0) {
        recommendations.push(`Investigar y corregir ${summary.failedTests} pruebas fallidas.`);
    }
    
    if (summary.passedTests === summary.totalTests) {
        recommendations.push('Excelente rendimiento del sistema de documentación. Todos los escenarios funcionaron correctamente.');
    }
    
    if (summary.averageDuration > 5000) {
        recommendations.push('Optimizar tiempo de generación de documentación para mejorar eficiencia.');
    }
    
    if (summary.totalGeneratedFiles === 0) {
        recommendations.push('Verificar configuración de generación de archivos y permisos del sistema.');
    }
    
    // Recomendaciones específicas por tipo de documentación
    const missingTypes = Object.entries(summary.documentationTypes)
        .filter(([type, generated]) => !generated)
        .map(([type]) => type);
    
    if (missingTypes.length > 0) {
        recommendations.push(`Revisar generación de tipos de documentación faltantes: ${missingTypes.join(', ')}`);
    }
    
    // Recomendaciones de calidad
    if (summary.totalGeneratedFiles < 10) {
        recommendations.push('Considerar expandir la documentación para incluir más detalles y ejemplos.');
    }
    
    return recommendations;
}

/**
 * Guarda resumen en archivo JSON
 */
async function saveSummaryToFile(summary) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const summaryPath = `test-dependency-documentation-summary-${timestamp}.json`;
    
    try {
        const summaryData = {
            metadata: {
                generated: new Date().toISOString(),
                tester: 'DependencyDocumentation Test Suite',
                version: '1.0.0',
                configuration: TEST_CONFIG
            },
            summary,
            detailedResults: testResults,
            testScenarios: TEST_SCENARIOS,
            systemConfiguration: docManager ? {
                documentation: docManager.documentation,
                templates: Object.keys(docManager.templates)
            } : null
        };
        
        await fs.writeFile(summaryPath, JSON.stringify(summaryData, null, 2));
        console.log(`\n📄 Resumen guardado en: ${summaryPath}`);
    } catch (error) {
        console.error('❌ Error guardando resumen:', error.message);
    }
}

/**
 * Limpia archivos de prueba
 */
async function cleanupTestFiles() {
    const fs = require('fs').promises;
    
    const directoriesToClean = [
        './test-dependency-docs'
    ];
    
    for (const dir of directoriesToClean) {
        try {
            await fs.rm(dir, { recursive: true, force: true });
            console.log(`🗑️ Directorio de prueba eliminado: ${dir}`);
        } catch (error) {
            // Ignorar errores de archivos que no existen
        }
    }
    
    // Limpiar archivos de resumen
    try {
        const files = await fs.readdir('.');
        const summaryFiles = files.filter(f => f.startsWith('test-dependency-documentation-summary-'));
        
        for (const file of summaryFiles) {
            await fs.unlink(file);
            console.log(`🗑️ Archivo de resumen eliminado: ${file}`);
        }
    } catch (error) {
        // Ignorar errores
    }
}

/**
 * Maneja señales de interrupción
 */
function handleShutdown() {
    console.log('\n🛑 Interrumpiendo pruebas...');
    
    if (currentTest) {
        console.log(`📋 Prueba actual: ${currentTest}`);
    }
    
    console.log('📊 Resultados hasta el momento:');
    testResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.scenario}: ${result.success ? '✅' : '❌'}`);
    });
    
    cleanupTestFiles();
    process.exit(0);
}

/**
 * Función principal
 */
async function main() {
    // Configurar manejadores de señales
    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
    
    try {
        await runDocumentationTests();
        await cleanupTestFiles();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal:', error.message);
        await cleanupTestFiles();
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = {
    runDocumentationTests,
    TEST_CONFIG,
    TEST_SCENARIOS
};