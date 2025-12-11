/**
 * Script de prueba para el sistema de integración CI/CD
 * 
 * Este script prueba todas las funcionalidades del CICDIntegration:
 * - Ejecución de pipelines
 * - Generación de workflows
 * - Gestión de entornos
 * - Despliegues y rollbacks
 */

const CICDIntegration = require('./components/ci-cd-integration');

// Configuración de pruebas
const TEST_CONFIG = {
    projectPath: process.cwd(),
    configPath: './test-ci-cd-config.json',
    pipelinesPath: './test-ci-cd-pipelines',
    environments: ['development', 'staging', 'production'],
    defaultEnvironment: 'development',
    autoDeploy: false,
    rollbackOnFailure: true,
    integrationProviders: ['github', 'gitlab'],
    notificationWebhooks: ['https://hooks.slack.com/test']
};

// Escenarios de prueba
const TEST_SCENARIOS = [
    {
        name: 'Security Pipeline Execution',
        description: 'Ejecución completa del pipeline de seguridad',
        pipelineType: 'security',
        options: {
            environment: 'staging',
            trigger: 'manual',
            autoApprove: true
        }
    },
    {
        name: 'Dependency Pipeline Execution',
        description: 'Ejecución del pipeline de actualización de dependencias',
        pipelineType: 'dependency',
        options: {
            environment: 'development',
            trigger: 'manual',
            autoApprove: false
        }
    },
    {
        name: 'Feature Pipeline Execution',
        description: 'Ejecución del pipeline de despliegue de funcionalidades',
        pipelineType: 'feature',
        options: {
            environment: 'production',
            trigger: 'manual',
            autoApprove: true
        }
    },
    {
        name: 'Emergency Rollback Pipeline',
        description: 'Ejecución del pipeline de rollback de emergencia',
        pipelineType: 'emergency',
        options: {
            environment: 'production',
            trigger: 'automatic'
        }
    }
];

// Resultados de pruebas
let testResults = [];
let currentTest = null;
let cicdManager = null;

/**
 * Inicia las pruebas del sistema CI/CD
 */
async function runCICDTests() {
    console.log('🚀 Iniciando pruebas del sistema de integración CI/CD...\n');
    
    try {
        // Inicializar el gestor CI/CD
        cicdManager = new CICDIntegration(TEST_CONFIG);
        await cicdManager.initialize();
        
        console.log('✅ CICDIntegration inicializado correctamente\n');
        
        // Ejecutar escenarios de prueba
        for (const scenario of TEST_SCENARIOS) {
            console.log(`📋 Ejecutando escenario: ${scenario.name}`);
            console.log(`📝 ${scenario.description}\n`);
            
            currentTest = scenario.name;
            
            try {
                const startTime = Date.now();
                
                // Ejecutar prueba específica
                const result = await executeCICDTest(scenario);
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // Guardar resultado
                const testResult = {
                    scenario: scenario.name,
                    description: scenario.description,
                    success: result.success,
                    duration: duration,
                    execution: result.execution,
                    stages: result.stages || [],
                    artifacts: result.artifacts || [],
                    error: result.error || null,
                    timestamp: new Date().toISOString()
                };
                
                testResults.push(testResult);
                
                // Mostrar resultado
                console.log(`✅ Escenario "${scenario.name}" completado en ${duration}ms`);
                console.log(`📊 Resultado: ${result.success ? 'EXITOSO' : 'FALLIDO'}`);
                
                if (result.execution) {
                    console.log(`🔍 Pipeline: ${result.execution.pipelineName}`);
                    console.log(`📋 Estado: ${result.execution.status}`);
                    console.log(`🌍 Entorno: ${result.execution.environment}`);
                }
                
                if (result.stages && result.stages.length > 0) {
                    console.log(`📋 Etapas ejecutadas: ${result.stages.length}`);
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
        
        // Probar generación de workflows
        await testWorkflowGeneration();
        
        // Probar gestión de entornos
        await testEnvironmentManagement();
        
        // Generar resumen final
        await generateFinalSummary();
        
        console.log('🎉 Pruebas del sistema CI/CD completadas');
        
    } catch (error) {
        console.error('❌ Error general en pruebas:', error.message);
        process.exit(1);
    }
}

/**
 * Ejecuta una prueba de CI/CD específica
 */
async function executeCICDTest(scenario) {
    const result = {
        success: true,
        execution: null,
        stages: [],
        artifacts: []
    };
    
    try {
        console.log(`🚀 Ejecutando pipeline: ${scenario.pipelineType}`);
        
        // Ejecutar pipeline
        result.execution = await cicdManager.executePipeline(
            scenario.pipelineType, 
            scenario.options
        );
        
        // Extraer información de etapas y artefactos
        if (result.execution.stages) {
            result.stages = result.execution.stages.map(stage => ({
                name: stage.name,
                status: stage.status,
                duration: stage.duration || 0
            }));
        }
        
        if (result.execution.artifacts) {
            result.artifacts = result.execution.artifacts.map(artifact => ({
                name: artifact.name,
                type: artifact.type
            }));
        }
        
        console.log('✅ Pipeline ejecutado correctamente');
        
        return result;
        
    } catch (error) {
        result.success = false;
        result.error = error.message;
        throw error;
    }
}

/**
 * Prueba generación de workflows
 */
async function testWorkflowGeneration() {
    console.log('📝 Probando generación de workflows...\n');
    
    try {
        const workflows = await cicdManager.generateWorkflows();
        
        console.log('✅ Workflows generados correctamente');
        console.log(`📋 Proveedores configurados: ${Object.keys(workflows).length}`);
        
        for (const [provider, workflow] of Object.entries(workflows)) {
            console.log(`  - ${provider}: ${workflow.length} caracteres generados`);
        }
        
        // Agregar resultado de prueba
        testResults.push({
            scenario: 'Workflow Generation Test',
            description: 'Prueba de generación de workflows CI/CD',
            success: true,
            generatedWorkflows: Object.keys(workflows).length,
            providers: Object.keys(workflows),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error en generación de workflows:', error.message);
        
        testResults.push({
            scenario: 'Workflow Generation Test',
            description: 'Prueba de generación de workflows CI/CD',
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Prueba gestión de entornos
 */
async function testEnvironmentManagement() {
    console.log('🌍 Probando gestión de entornos...\n');
    
    try {
        // Obtener estadísticas
        const stats = cicdManager.getCICDStatistics();
        
        console.log('✅ Estadísticas obtenidas correctamente');
        console.log(`📊 Pipelines totales: ${stats.pipelines.total}`);
        console.log(`🌍 Entornos configurados: ${stats.environments}`);
        console.log(`🔌 Proveedores integrados: ${stats.providers}`);
        
        // Obtener historial de ejecuciones
        const history = await cicdManager.getExecutionHistory({ limit: 10 });
        
        console.log(`📜 Ejecuciones recientes: ${history.executions.length}`);
        
        // Agregar resultado de prueba
        testResults.push({
            scenario: 'Environment Management Test',
            description: 'Prueba de gestión de entornos y estadísticas',
            success: true,
            statistics: stats,
            executionHistory: history.executions.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error en gestión de entornos:', error.message);
        
        testResults.push({
            scenario: 'Environment Management Test',
            description: 'Prueba de gestión de entornos y estadísticas',
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
        scenarios: {},
        pipelineTypes: {},
        environments: {},
        stages: {},
        artifacts: {},
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
            duration: result.duration || 0
        };
    });
    
    // Contar tipos de pipeline ejecutados
    testResults.forEach(result => {
        if (result.execution) {
            const pipelineType = result.execution.pipelineId;
            summary.pipelineTypes[pipelineType] = (summary.pipelineTypes[pipelineType] || 0) + 1;
        }
    });
    
    // Contar entornos utilizados
    testResults.forEach(result => {
        if (result.execution) {
            const environment = result.execution.environment;
            summary.environments[environment] = (summary.environments[environment] || 0) + 1;
        }
    });
    
    // Contar etapas ejecutadas
    testResults.forEach(result => {
        if (result.stages) {
            result.stages.forEach(stage => {
                summary.stages[stage.name] = (summary.stages[stage.name] || 0) + 1;
            });
        }
    });
    
    // Contar artefactos generados
    testResults.forEach(result => {
        if (result.artifacts) {
            result.artifacts.forEach(artifact => {
                summary.artifacts[artifact.type] = (summary.artifacts[artifact.type] || 0) + 1;
            });
        }
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
    console.log(`Duración total: ${summary.totalDuration}ms\n`);
    
    console.log('📋 RESULTADOS POR ESCENARIO');
    console.log('-'.repeat(50));
    for (const [scenario, result] of Object.entries(summary.scenarios)) {
        console.log(`${scenario}:`);
        console.log(`  ✅ Éxito: ${result.success ? 'Sí' : 'No'}`);
        console.log(`  ⏱️ Duración: ${result.duration}ms`);
        console.log('');
    }
    
    console.log('🔌 TIPOS DE PIPELINE EJECUTADOS');
    console.log('-'.repeat(50));
    for (const [type, count] of Object.entries(summary.pipelineTypes)) {
        console.log(`${type}: ${count} ejecuciones`);
    }
    
    console.log('\n🌍 ENTORNOS UTILIZADOS');
    console.log('-'.repeat(50));
    for (const [env, count] of Object.entries(summary.environments)) {
        console.log(`${env}: ${count} despliegues`);
    }
    
    console.log('\n📋 ETAPAS EJECUTADAS');
    console.log('-'.repeat(50));
    for (const [stage, count] of Object.entries(summary.stages)) {
        console.log(`${stage}: ${count} ejecuciones`);
    }
    
    console.log('\n📄 ARTEFACTOS GENERADOS');
    console.log('-'.repeat(50));
    for (const [type, count] of Object.entries(summary.artifacts)) {
        console.log(`${type}: ${count} artefactos`);
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
        recommendations.push('Excelente rendimiento del sistema CI/CD. Todos los escenarios funcionaron correctamente.');
    }
    
    if (summary.averageDuration > 30000) {
        recommendations.push('Optimizar tiempo de ejecución de pipelines para mejorar eficiencia.');
    }
    
    // Recomendaciones específicas por tipo de pipeline
    const securityPipelines = summary.pipelineTypes.security || 0;
    if (securityPipelines === 0) {
        recommendations.push('Implementar pipeline de seguridad para actualizaciones críticas.');
    }
    
    // Recomendaciones de entornos
    const productionDeployments = summary.environments.production || 0;
    if (productionDeployments === 0) {
        recommendations.push('Probar despliegues a entorno de producción.');
    }
    
    // Recomendaciones de etapas
    const approvalStages = summary.stages.approval || 0;
    if (approvalStages > 0) {
        recommendations.push('Optimizar proceso de aprobación para reducir tiempos de espera.');
    }
    
    // Recomendaciones de artefactos
    const reportArtifacts = summary.artifacts.report || 0;
    if (reportArtifacts < 5) {
        recommendations.push('Aumentar generación de reportes para mejor trazabilidad.');
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
    const summaryPath = `test-ci-cd-summary-${timestamp}.json`;
    
    try {
        const summaryData = {
            metadata: {
                generated: new Date().toISOString(),
                tester: 'CICDIntegration Test Suite',
                version: '1.0.0',
                configuration: TEST_CONFIG
            },
            summary,
            detailedResults: testResults,
            testScenarios: TEST_SCENARIOS,
            systemConfiguration: cicdManager ? {
                config: cicdManager.config,
                pipelines: cicdManager.pipelines,
                environments: cicdManager.environments,
                activePipelines: cicdManager.activePipelines.size
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
    
    const filesToClean = [
        TEST_CONFIG.configPath,
        ...TEST_CONFIG.integrationProviders.map(provider => `./test-ci-cd-pipelines/${provider}.yml`),
        './test-ci-cd-pipelines/.gitlab-ci.yml',
        './test-ci-cd-pipelines/Jenkinsfile'
    ];
    
    const directoriesToClean = [
        TEST_CONFIG.pipelinesPath,
        './.github'
    ];
    
    for (const file of filesToClean) {
        try {
            await fs.unlink(file);
            console.log(`🗑️ Archivo de prueba eliminado: ${file}`);
        } catch (error) {
            // Ignorar errores de archivos que no existen
        }
    }
    
    for (const dir of directoriesToClean) {
        try {
            await fs.rm(dir, { recursive: true, force: true });
            console.log(`🗑️ Directorio de prueba eliminado: ${dir}`);
        } catch (error) {
            // Ignorar errores de directorios que no existen
        }
    }
    
    // Limpiar archivos de resumen
    try {
        const files = await fs.readdir('.');
        const summaryFiles = files.filter(f => f.startsWith('test-ci-cd-summary-'));
        
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
        await runCICDTests();
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
    runCICDTests,
    TEST_CONFIG,
    TEST_SCENARIOS
};