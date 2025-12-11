/**
 * Script de prueba para el sistema de compatibilidad
 * 
 * Este script prueba todas las funcionalidades del CompatibilityTester:
 * - Ejecución de pruebas de compatibilidad
 * - Análisis de resultados
 * - Generación de reportes
 * - Validación de escenarios
 */

const CompatibilityTester = require('./components/compatibility-tester');

// Configuración de pruebas
const TEST_CONFIG = {
    projectPath: process.cwd(),
    testEnvironment: 'node',
    testTypes: ['unit', 'integration', 'e2e'],
    parallel: true,
    timeout: 30000,
    retries: 3,
    dryRun: false,
    reportPath: './compatibility-reports'
};

// Escenarios de prueba
const TEST_SCENARIOS = [
    {
        name: 'Basic Compatibility Test',
        description: 'Prueba básica de compatibilidad',
        options: {
            testType: 'upgrade',
            testCategories: ['api', 'functionality'],
            scenarios: ['upgrade'],
            dryRun: false
        }
    },
    {
        name: 'Full Compatibility Test',
        description: 'Prueba completa de compatibilidad',
        options: {
            testType: 'upgrade',
            testCategories: ['api', 'functionality', 'performance', 'security'],
            scenarios: ['upgrade', 'rollback'],
            dryRun: false
        }
    },
    {
        name: 'Security Compatibility Test',
        description: 'Prueba de compatibilidad de seguridad',
        options: {
            testType: 'upgrade',
            testCategories: ['security'],
            scenarios: ['upgrade'],
            dryRun: false
        }
    },
    {
        name: 'Performance Compatibility Test',
        description: 'Prueba de compatibilidad de rendimiento',
        options: {
            testType: 'upgrade',
            testCategories: ['performance'],
            scenarios: ['upgrade'],
            dryRun: false
        }
    },
    {
        name: 'Dry Run Test',
        description: 'Prueba en modo simulación',
        options: {
            testType: 'upgrade',
            testCategories: ['api', 'functionality'],
            scenarios: ['upgrade'],
            dryRun: true
        }
    }
];

// Resultados de pruebas
let testResults = [];
let currentTest = null;

/**
 * Inicia las pruebas del sistema de compatibilidad
 */
async function runCompatibilityTests() {
    console.log('🚀 Iniciando pruebas del sistema de compatibilidad...\n');
    
    try {
        // Inicializar el tester
        const tester = new CompatibilityTester(TEST_CONFIG);
        await tester.initialize();
        
        console.log('✅ CompatibilityTester inicializado correctamente\n');
        
        // Ejecutar escenarios de prueba
        for (const scenario of TEST_SCENARIOS) {
            console.log(`📋 Ejecutando escenario: ${scenario.name}`);
            console.log(`📝 ${scenario.description}\n`);
            
            currentTest = scenario.name;
            
            try {
                const startTime = Date.now();
                
                // Ejecutar pruebas de compatibilidad
                const result = await tester.runCompatibilityTests(scenario.options);
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // Guardar resultado
                const testResult = {
                    scenario: scenario.name,
                    description: scenario.description,
                    success: result.success,
                    duration: duration,
                    testSuite: result.testSuite,
                    reportPath: result.reportPath,
                    summary: result.summary,
                    timestamp: new Date().toISOString()
                };
                
                testResults.push(testResult);
                
                // Mostrar resultado
                console.log(`✅ Escenario "${scenario.name}" completado en ${duration}ms`);
                console.log(`📊 Resultado: ${result.summary.overall.toUpperCase()}`);
                console.log(`📈 Compatibilidad: ${result.summary.compatibility}%`);
                console.log(`📄 Reporte: ${result.reportPath.jsonPath}`);
                console.log(`🌐 HTML: ${result.reportPath.htmlPath}\n`);
                
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
        
        // Generar resumen final
        await generateFinalSummary();
        
        console.log('🎉 Pruebas del sistema de compatibilidad completadas');
        
    } catch (error) {
        console.error('❌ Error general en pruebas:', error.message);
        process.exit(1);
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
        averageCompatibility: 0,
        totalDuration: testResults.reduce((sum, r) => sum + (r.duration || 0), 0),
        scenarios: {},
        recommendations: []
    };
    
    // Calcular compatibilidad promedio
    const successfulTests = testResults.filter(r => r.success && r.summary);
    if (successfulTests.length > 0) {
        summary.averageCompatibility = Math.round(
            successfulTests.reduce((sum, r) => sum + r.summary.compatibility, 0) / successfulTests.length
        );
    }
    
    // Agrupar por escenario
    testResults.forEach(result => {
        summary.scenarios[result.scenario] = {
            success: result.success,
            compatibility: result.summary ? result.summary.compatibility : 0,
            duration: result.duration || 0,
            error: result.error || null
        };
    });
    
    // Generar recomendaciones
    summary.recommendations = generateRecommendations(summary);
    
    // Mostrar resumen
    console.log('📈 RESUMEN DE PRUEBAS');
    console.log('='.repeat(50));
    console.log(`Total de pruebas: ${summary.totalTests}`);
    console.log(`Pruebas exitosas: ${summary.passedTests}`);
    console.log(`Pruebas fallidas: ${summary.failedTests}`);
    console.log(`Compatibilidad promedio: ${summary.averageCompatibility}%`);
    console.log(`Duración total: ${summary.totalDuration}ms\n`);
    
    console.log('📋 RESULTADOS POR ESCENARIO');
    console.log('-'.repeat(50));
    for (const [scenario, result] of Object.entries(summary.scenarios)) {
        console.log(`${scenario}:`);
        console.log(`  ✅ Éxito: ${result.success ? 'Sí' : 'No'}`);
        console.log(`  📈 Compatibilidad: ${result.compatibility}%`);
        console.log(`  ⏱️ Duración: ${result.duration}ms`);
        if (result.error) {
            console.log(`  ❌ Error: ${result.error}`);
        }
        console.log('');
    }
    
    console.log('💡 RECOMENDACIONES');
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
        recommendations.push(`Investigar y corregir ${summary.failedTests} pruebas fallidas antes de continuar.`);
    }
    
    if (summary.averageCompatibility < 80) {
        recommendations.push('La compatibilidad general es baja. Revisar dependencias y realizar pruebas adicionales.');
    }
    
    if (summary.averageCompatibility >= 80 && summary.averageCompatibility < 95) {
        recommendations.push('La compatibilidad es aceptable pero podría mejorarse. Considerar optimizaciones.');
    }
    
    if (summary.averageCompatibility >= 95) {
        recommendations.push('Excelente compatibilidad. El sistema está listo para actualización.');
    }
    
    // Recomendaciones específicas por escenario
    for (const [scenario, result] of Object.entries(summary.scenarios)) {
        if (!result.success) {
            recommendations.push(`Revisar escenario "${scenario}" que presentó errores.`);
        }
        
        if (result.compatibility < 90) {
            recommendations.push(`Mejorar compatibilidad en escenario "${scenario}" (actual: ${result.compatibility}%).`);
        }
    }
    
    if (summary.totalDuration > 60000) {
        recommendations.push('Optimizar tiempo de ejecución de pruebas para mejorar eficiencia.');
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
    const summaryPath = path.join(TEST_CONFIG.reportPath, `compatibility-test-summary-${timestamp}.json`);
    
    try {
        // Asegurar que el directorio exista
        await fs.mkdir(TEST_CONFIG.reportPath, { recursive: true });
        
        const summaryData = {
            metadata: {
                generated: new Date().toISOString(),
                tester: 'CompatibilityTester Test Suite',
                version: '1.0.0',
                environment: TEST_CONFIG.testEnvironment
            },
            summary,
            detailedResults: testResults,
            testConfiguration: TEST_CONFIG,
            testScenarios: TEST_SCENARIOS
        };
        
        await fs.writeFile(summaryPath, JSON.stringify(summaryData, null, 2));
        console.log(`\n📄 Resumen guardado en: ${summaryPath}`);
    } catch (error) {
        console.error('❌ Error guardando resumen:', error.message);
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
        await runCompatibilityTests();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal:', error.message);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = {
    runCompatibilityTests,
    TEST_CONFIG,
    TEST_SCENARIOS
};