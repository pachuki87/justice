/**
 * Script de prueba para el sistema de políticas de actualización
 * 
 * Este script prueba todas las funcionalidades del UpdatePolicyManager:
 * - Evaluación de solicitudes de actualización
 * - Creación y gestión de solicitudes de aprobación
 * - Flujo de aprobación y rechazo
 * - Gestión de ventanas de mantenimiento
 * - Auditoría y registro de eventos
 */

const UpdatePolicyManager = require('./components/update-policy-manager');

// Configuración de pruebas
const TEST_CONFIG = {
    projectPath: process.cwd(),
    configPath: './test-update-policies.json',
    auditLogPath: './test-update-audit.log',
    approvalRequired: true,
    autoApproveSafeUpdates: true,
    maxApprovalTime: 60 * 60 * 1000, // 1 hora para pruebas
    rollbackEnabled: true,
    notificationChannels: ['email', 'slack'],
    approvers: ['admin@justice2.com', 'security@justice2.com', 'devops@justice2.com'],
    maintenanceWindows: [
        {
            start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
            end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), // 4 horas después
            description: 'Ventana de mantenimiento programada',
            type: 'scheduled'
        }
    ]
};

// Escenarios de prueba
const TEST_SCENARIOS = [
    {
        name: 'Security Critical Update',
        description: 'Actualización de seguridad crítica que requiere aprobación inmediata',
        updateRequest: {
            id: 'security-critical-001',
            type: 'security',
            updates: [
                { name: 'express', from: '4.17.1', to: '4.18.2', updateType: 'patch' }
            ],
            vulnerabilities: [
                { id: 'CVE-2023-4567', severity: 'critical', score: 9.8 },
                { id: 'CVE-2023-4568', severity: 'high', score: 7.5 }
            ],
            compatibilityTest: {
                compatibility: 95,
                totalTests: 100,
                passedTests: 95,
                failedTests: 5
            },
            performanceTest: {
                responseTimeImpact: 5,
                memoryImpact: 3,
                cpuImpact: 2
            },
            backup: true,
            rollbackPlan: true,
            requester: 'security-system'
        },
        expectedPolicy: 'security',
        expectedApprovalRequired: true,
        expectedAutoApprove: false
    },
    {
        name: 'Safe Patch Update',
        description: 'Actualización de parche segura que puede ser auto-aprobada',
        updateRequest: {
            id: 'safe-patch-001',
            type: 'patch',
            updates: [
                { name: 'lodash', from: '4.17.20', to: '4.17.21', updateType: 'patch' }
            ],
            vulnerabilities: [],
            compatibilityTest: {
                compatibility: 98,
                totalTests: 50,
                passedTests: 49,
                failedTests: 1
            },
            performanceTest: {
                responseTimeImpact: 2,
                memoryImpact: 1,
                cpuImpact: 1
            },
            backup: true,
            rollbackPlan: true,
            requester: 'dependency-monitor'
        },
        expectedPolicy: 'patch',
        expectedApprovalRequired: false,
        expectedAutoApprove: true
    },
    {
        name: 'Major Version Update',
        description: 'Actualización mayor que requiere aprobación manual',
        updateRequest: {
            id: 'major-update-001',
            type: 'major',
            updates: [
                { name: 'react', from: '17.0.2', to: '18.2.0', updateType: 'major' }
            ],
            vulnerabilities: [],
            compatibilityTest: {
                compatibility: 75,
                totalTests: 200,
                passedTests: 150,
                failedTests: 50
            },
            performanceTest: {
                responseTimeImpact: 15,
                memoryImpact: 10,
                cpuImpact: 8
            },
            backup: true,
            rollbackPlan: true,
            requester: 'developer'
        },
        expectedPolicy: 'major',
        expectedApprovalRequired: true,
        expectedAutoApprove: false
    },
    {
        name: 'Dependency Update with Issues',
        description: 'Actualización de dependencias con problemas de compatibilidad',
        updateRequest: {
            id: 'dependency-issues-001',
            type: 'dependency',
            updates: [
                { name: 'axios', from: '0.24.0', to: '1.4.0', updateType: 'minor' }
            ],
            vulnerabilities: [
                { id: 'CVE-2023-2855', severity: 'medium', score: 5.3 }
            ],
            compatibilityTest: {
                compatibility: 65,
                totalTests: 80,
                passedTests: 52,
                failedTests: 28
            },
            performanceTest: {
                responseTimeImpact: 25,
                memoryImpact: 20,
                cpuImpact: 15
            },
            backup: true,
            rollbackPlan: true,
            requester: 'auto-updater'
        },
        expectedPolicy: 'minor',
        expectedApprovalRequired: true,
        expectedAutoApprove: false
    },
    {
        name: 'Minor Update with Good Compatibility',
        description: 'Actualización menor con buena compatibilidad',
        updateRequest: {
            id: 'minor-good-001',
            type: 'minor',
            updates: [
                { name: 'moment', from: '2.29.1', to: '2.29.4', updateType: 'patch' }
            ],
            vulnerabilities: [
                { id: 'CVE-2022-31129', severity: 'low', score: 3.1 }
            ],
            compatibilityTest: {
                compatibility: 92,
                totalTests: 60,
                passedTests: 55,
                failedTests: 5
            },
            performanceTest: {
                responseTimeImpact: 3,
                memoryImpact: 2,
                cpuImpact: 1
            },
            backup: true,
            rollbackPlan: true,
            requester: 'scheduled-updater'
        },
        expectedPolicy: 'patch',
        expectedApprovalRequired: false,
        expectedAutoApprove: true
    }
];

// Resultados de pruebas
let testResults = [];
let currentTest = null;
let policyManager = null;

/**
 * Inicia las pruebas del sistema de políticas
 */
async function runPolicyTests() {
    console.log('🚀 Iniciando pruebas del sistema de políticas de actualización...\n');
    
    try {
        // Inicializar el gestor de políticas
        policyManager = new UpdatePolicyManager(TEST_CONFIG);
        await policyManager.initialize();
        
        console.log('✅ UpdatePolicyManager inicializado correctamente\n');
        
        // Ejecutar escenarios de prueba
        for (const scenario of TEST_SCENARIOS) {
            console.log(`📋 Ejecutando escenario: ${scenario.name}`);
            console.log(`📝 ${scenario.description}\n`);
            
            currentTest = scenario.name;
            
            try {
                const startTime = Date.now();
                
                // Ejecutar prueba completa
                const result = await executePolicyTest(scenario);
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // Guardar resultado
                const testResult = {
                    scenario: scenario.name,
                    description: scenario.description,
                    success: result.success,
                    duration: duration,
                    evaluation: result.evaluation,
                    approvalRequest: result.approvalRequest,
                    execution: result.execution,
                    timestamp: new Date().toISOString()
                };
                
                testResults.push(testResult);
                
                // Mostrar resultado
                console.log(`✅ Escenario "${scenario.name}" completado en ${duration}ms`);
                console.log(`📊 Resultado: ${result.success ? 'EXITOSO' : 'FALLIDO'}`);
                
                if (result.evaluation) {
                    console.log(`🔍 Política: ${result.evaluation.policy}`);
                    console.log(`📋 Requiere aprobación: ${result.evaluation.approvalRequired ? 'Sí' : 'No'}`);
                    console.log(`🤖 Auto-aprobado: ${result.evaluation.autoApprove ? 'Sí' : 'No'}`);
                }
                
                if (result.approvalRequest) {
                    console.log(`📄 Solicitud de aprobación: ${result.approvalRequest.id}`);
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
        
        // Probar flujo de aprobación
        await testApprovalWorkflow();
        
        // Probar gestión de mantenimiento
        await testMaintenanceManagement();
        
        // Generar resumen final
        await generateFinalSummary();
        
        console.log('🎉 Pruebas del sistema de políticas completadas');
        
    } catch (error) {
        console.error('❌ Error general en pruebas:', error.message);
        process.exit(1);
    }
}

/**
 * Ejecuta una prueba de política completa
 */
async function executePolicyTest(scenario) {
    const result = {
        success: true,
        evaluation: null,
        approvalRequest: null,
        execution: null
    };
    
    try {
        // Paso 1: Evaluar solicitud
        console.log('🔍 Evaluando solicitud de actualización...');
        result.evaluation = await policyManager.evaluateUpdateRequest(scenario.updateRequest);
        
        // Verificar resultados esperados
        if (result.evaluation.policy !== scenario.expectedPolicy) {
            throw new Error(`Política incorrecta: esperado ${scenario.expectedPolicy}, obtenido ${result.evaluation.policy}`);
        }
        
        if (result.evaluation.approvalRequired !== scenario.expectedApprovalRequired) {
            throw new Error(`Requerimiento de aprobación incorrecto: esperado ${scenario.expectedApprovalRequired}, obtenido ${result.evaluation.approvalRequired}`);
        }
        
        if (result.evaluation.autoApprove !== scenario.expectedAutoApprove) {
            throw new Error(`Auto-aprobación incorrecta: esperado ${scenario.expectedAutoApprove}, obtenido ${result.evaluation.autoApprove}`);
        }
        
        console.log('✅ Evaluación completada correctamente');
        
        // Paso 2: Crear solicitud de aprobación si es necesario
        if (result.evaluation.approvalRequired) {
            console.log('📋 Creando solicitud de aprobación...');
            result.approvalRequest = await policyManager.createApprovalRequest(
                scenario.updateRequest, 
                result.evaluation
            );
            console.log(`✅ Solicitud de aprobación creada: ${result.approvalRequest.id}`);
        } else if (result.evaluation.autoApprove) {
            console.log('🤖 Auto-aprobando actualización...');
            // Simular ejecución directa
            result.execution = {
                status: 'auto_approved',
                message: 'Actualización auto-aprobada y ejecutada'
            };
            console.log('✅ Actualización auto-aprobada y ejecutada');
        }
        
        return result;
        
    } catch (error) {
        result.success = false;
        result.error = error.message;
        throw error;
    }
}

/**
 * Prueba el flujo de aprobación
 */
async function testApprovalWorkflow() {
    console.log('🔄 Probando flujo de aprobación...\n');
    
    try {
        // Encontrar una solicitud pendiente
        const pendingRequest = policyManager.approvalQueue.find(r => r.status === 'pending');
        if (!pendingRequest) {
            console.log('⚠️ No hay solicitudes pendientes para probar el flujo de aprobación');
            return;
        }
        
        console.log(`📋 Probando aprobación con solicitud: ${pendingRequest.id}`);
        
        // Simular aprobación por un aprobador
        const approver = pendingRequest.approvers[0];
        const approvalResult = await policyManager.approveRequest(
            pendingRequest.id, 
            approver, 
            'Aprobado tras revisión de seguridad'
        );
        
        console.log(`✅ Solicitud aprobada por ${approver}: ${approvalResult.status}`);
        
        // Si aún está pendiente, aprobar con otro aprobador
        if (approvalResult.status === 'pending') {
            const secondApprover = pendingRequest.approvers[1];
            const secondApproval = await policyManager.approveRequest(
                pendingRequest.id,
                secondApprover,
                'Segunda aprobación confirmada'
            );
            
            console.log(`✅ Segunda aprobación por ${secondApprover}: ${secondApproval.status}`);
        }
        
        // Probar rechazo de otra solicitud
        const anotherPending = policyManager.approvalQueue.find(r => 
            r.status === 'pending' && r.id !== pendingRequest.id
        );
        
        if (anotherPending) {
            console.log(`📋 Probando rechazo con solicitud: ${anotherPending.id}`);
            
            const rejectionResult = await policyManager.rejectRequest(
                anotherPending.id,
                anotherPending.approvers[0],
                'Compatibilidad insuficiente',
                'Se requiere más testing'
            );
            
            console.log(`❌ Solicitud rechazada: ${rejectionResult.status}`);
        }
        
        console.log('✅ Flujo de aprobación probado correctamente\n');
        
    } catch (error) {
        console.error('❌ Error en flujo de aprobación:', error.message);
        throw error;
    }
}

/**
 * Prueba la gestión de mantenimiento
 */
async function testMaintenanceManagement() {
    console.log('🔧 Probando gestión de mantenimiento...\n');
    
    try {
        // Agregar ventana de mantenimiento
        const newWindow = {
            start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Pasado mañana
            end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(), // 6 horas después
            description: 'Ventana de mantenimiento de prueba',
            type: 'test'
        };
        
        const addedWindow = await policyManager.addMaintenanceWindow(newWindow);
        console.log(`✅ Ventana de mantenimiento agregada: ${addedWindow.id}`);
        
        // Listar ventanas actuales
        console.log(`📅 Total de ventanas de mantenimiento: ${policyManager.maintenanceSchedule.length}`);
        
        // Eliminar ventana de prueba
        await policyManager.removeMaintenanceWindow(addedWindow.id);
        console.log(`🗑️ Ventana de mantenimiento eliminada: ${addedWindow.id}`);
        
        // Verificar que se eliminó
        console.log(`📅 Ventanas restantes: ${policyManager.maintenanceSchedule.length}`);
        
        console.log('✅ Gestión de mantenimiento probada correctamente\n');
        
    } catch (error) {
        console.error('❌ Error en gestión de mantenimiento:', error.message);
        throw error;
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
        policyStatistics: null,
        approvalStatistics: null,
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
            hasApproval: !!(result.approvalRequest),
            hasExecution: !!(result.execution)
        };
    });
    
    // Obtener estadísticas del sistema
    if (policyManager) {
        summary.policyStatistics = {
            policies: Object.keys(policyManager.policies).length,
            maintenanceWindows: policyManager.maintenanceSchedule.length,
            auditEntries: policyManager.auditLog.length
        };
        
        summary.approvalStatistics = policyManager.getApprovalStatistics();
    }
    
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
        console.log(`  📋 Aprobación: ${result.hasApproval ? 'Sí' : 'No'}`);
        console.log(`  🚀 Ejecución: ${result.hasExecution ? 'Sí' : 'No'}`);
        console.log('');
    }
    
    if (summary.policyStatistics) {
        console.log('📊 ESTADÍSTICAS DEL SISTEMA');
        console.log('-'.repeat(50));
        console.log(`Políticas configuradas: ${summary.policyStatistics.policies}`);
        console.log(`Ventanas de mantenimiento: ${summary.policyStatistics.maintenanceWindows}`);
        console.log(`Entradas de auditoría: ${summary.policyStatistics.auditEntries}`);
        console.log('');
    }
    
    if (summary.approvalStatistics) {
        console.log('📋 ESTADÍSTICAS DE APROBACIÓN');
        console.log('-'.repeat(50));
        console.log(`Total de solicitudes: ${summary.approvalStatistics.total}`);
        console.log(`Pendientes: ${summary.approvalStatistics.pending}`);
        console.log(`Aprobadas: ${summary.approvalStatistics.approved}`);
        console.log(`Rechazadas: ${summary.approvalStatistics.rejected}`);
        console.log(`Expiradas: ${summary.approvalStatistics.expired}`);
        console.log(`Ejecutadas: ${summary.approvalStatistics.executed}`);
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
    
    if (summary.passedTests === summary.totalTests) {
        recommendations.push('Excelente rendimiento del sistema de políticas. Todos los escenarios funcionaron correctamente.');
    }
    
    if (summary.averageDuration > 5000) {
        recommendations.push('Optimizar tiempo de respuesta del sistema de políticas para mejorar eficiencia.');
    }
    
    // Recomendaciones específicas por escenario
    for (const [scenario, result] of Object.entries(summary.scenarios)) {
        if (!result.success) {
            recommendations.push(`Revisar escenario "${scenario}" que presentó errores.`);
        }
    }
    
    // Recomendaciones del sistema
    if (summary.approvalStatistics && summary.approvalStatistics.pending > 0) {
        recommendations.push(`Procesar ${summary.approvalStatistics.pending} solicitudes de aprobación pendientes.`);
    }
    
    if (summary.approvalStatistics && summary.approvalStatistics.expired > 0) {
        recommendations.push(`Revisar ${summary.approvalStatistics.expired} solicitudes expiradas y mejorar tiempos de respuesta.`);
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
    const summaryPath = `test-update-policy-summary-${timestamp}.json`;
    
    try {
        const summaryData = {
            metadata: {
                generated: new Date().toISOString(),
                tester: 'UpdatePolicyManager Test Suite',
                version: '1.0.0',
                configuration: TEST_CONFIG
            },
            summary,
            detailedResults: testResults,
            testScenarios: TEST_SCENARIOS,
            systemConfiguration: policyManager ? {
                policies: policyManager.policies,
                maintenanceSchedule: policyManager.maintenanceSchedule,
                auditLogSize: policyManager.auditLog.length
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
        TEST_CONFIG.auditLogPath,
        'approval-queue.json',
        'maintenance-schedule.json'
    ];
    
    for (const file of filesToClean) {
        try {
            await fs.unlink(file);
            console.log(`🗑️ Archivo de prueba eliminado: ${file}`);
        } catch (error) {
            // Ignorar errores de archivos que no existen
        }
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
        await runPolicyTests();
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
    runPolicyTests,
    TEST_CONFIG,
    TEST_SCENARIOS
};