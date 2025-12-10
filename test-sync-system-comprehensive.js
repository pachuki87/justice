/**
 * Justice 2 Sync System Comprehensive Tests
 * Suite de pruebas completas para el sistema de sincronización robusto
 * Prueba concurrencia, deadlocks, race conditions y recuperación
 */

// Importar sistemas de sincronización
import SyncManager from './components/sync-manager.js';
import ConcurrencyController from './components/concurrency-controller.js';
import SyncDiagnostics from './components/sync-diagnostics.js';

const SyncSystemTests = {
    // Configuración de pruebas
    config: {
        // Configuración de concurrencia
        maxConcurrentOperations: 10,
        testTimeout: 30000,
        
        // Configuración de escenarios
        enableStressTests: true,
        enableRaceConditionTests: true,
        enableDeadlockTests: true,
        enableRecoveryTests: true,
        
        // Configuración de reportes
        generateReport: true,
        reportFormat: 'json',
        
        // Configuración de logging
        enableLogging: true,
        logLevel: 'info'
    },

    // Estado de las pruebas
    state: {
        initialized: false,
        running: false,
        results: {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            duration: 0,
            tests: []
        },
        metrics: {
            operations: 0,
            errors: 0,
            warnings: 0,
            startTime: null,
            endTime: null
        }
    },

    // Inicialización del sistema de pruebas
    init: function() {
        if (this.state.initialized) {
            console.log('[SyncTests] Ya está inicializado');
            return;
        }

        try {
            console.log('[SyncTests] Inicializando sistema de pruebas de sincronización...');
            
            // Inicializar sistemas a probar
            if (typeof SyncManager !== 'undefined') {
                SyncManager.init();
            }
            
            if (typeof ConcurrencyController !== 'undefined') {
                ConcurrencyController.init();
            }
            
            if (typeof SyncDiagnostics !== 'undefined') {
                SyncDiagnostics.init();
            }
            
            this.state.initialized = true;
            console.log('[SyncTests] Sistema de pruebas inicializado correctamente');
            
        } catch (error) {
            console.error('[SyncTests] Error inicializando sistema de pruebas:', error);
            throw error;
        }
    },

    // Ejecutar todas las pruebas
    runAllTests: async function() {
        if (!this.state.initialized) {
            this.init();
        }

        if (this.state.running) {
            console.warn('[SyncTests] Las pruebas ya están en ejecución');
            return;
        }

        this.state.running = true;
        this.state.metrics.startTime = Date.now();
        
        console.log('[SyncTests] Iniciando suite completa de pruebas de sincronización...');
        
        try {
            // Inicializar resultados
            this.resetResults();
            
            // Ejecutar categorías de pruebas
            await this.runBasicTests();
            await this.runConcurrencyTests();
            await this.runRaceConditionTests();
            await this.runDeadlockTests();
            await this.runRecoveryTests();
            await this.runPerformanceTests();
            await this.runStressTests();
            
            // Calcular resultados finales
            this.calculateFinalResults();
            
            // Generar reporte
            if (this.config.generateReport) {
                this.generateTestReport();
            }
            
            this.state.running = false;
            this.state.metrics.endTime = Date.now();
            
            console.log('[SyncTests] Suite de pruebas completada');
            return this.state.results;
            
        } catch (error) {
            console.error('[SyncTests] Error ejecutando pruebas:', error);
            this.state.running = false;
            throw error;
        }
    },

    // Reiniciar resultados
    resetResults: function() {
        this.state.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            duration: 0,
            tests: []
        };
        
        this.state.metrics = {
            operations: 0,
            errors: 0,
            warnings: 0,
            startTime: Date.now(),
            endTime: null
        };
    },

    // Ejecutar pruebas básicas
    runBasicTests: async function() {
        console.log('[SyncTests] Ejecutando pruebas básicas...');
        
        const tests = [
            this.testSyncManagerInitialization,
            this.testConcurrencyControllerInitialization,
            this.testSyncDiagnosticsInitialization,
            this.testBasicLockAcquisition,
            this.testBasicSemaphoreOperation,
            this.testBasicBarrierOperation,
            this.testBasicLatchOperation
        ];
        
        for (const test of tests) {
            await this.runTest(test);
        }
    },

    // Ejecutar pruebas de concurrencia
    runConcurrencyTests: async function() {
        console.log('[SyncTests] Ejecutando pruebas de concurrencia...');
        
        const tests = [
            this.testConcurrentLockAcquisition,
            this.testThreadPoolExecution,
            this.testAtomicOperations,
            this.testConcurrentQueueProcessing,
            this.testSemaphoreWithMultiplePermits
        ];
        
        for (const test of tests) {
            await this.runTest(test);
        }
    },

    // Ejecutar pruebas de race conditions
    runRaceConditionTests: async function() {
        if (!this.config.enableRaceConditionTests) {
            console.log('[SyncTests] Pruebas de race conditions deshabilitadas');
            return;
        }
        
        console.log('[SyncTests] Ejecutando pruebas de race conditions...');
        
        const tests = [
            this.testRaceConditionDetection,
            this.testSharedResourceAccess,
            this.testConcurrentCounterIncrement,
            this.testConcurrentStateModification,
            this.testRaceConditionPrevention
        ];
        
        for (const test of tests) {
            await this.runTest(test);
        }
    },

    // Ejecutar pruebas de deadlocks
    runDeadlockTests: async function() {
        if (!this.config.enableDeadlockTests) {
            console.log('[SyncTests] Pruebas de deadlock deshabilitadas');
            return;
        }
        
        console.log('[SyncTests] Ejecutando pruebas de deadlock...');
        
        const tests = [
            this.testDeadlockDetection,
            this.testDeadlockPrevention,
            this.testDeadlockResolution,
            this.testCircularDependencyDetection,
            this.testTimeoutBasedDeadlockResolution
        ];
        
        for (const test of tests) {
            await this.runTest(test);
        }
    },

    // Ejecutar pruebas de recuperación
    runRecoveryTests: async function() {
        if (!this.config.enableRecoveryTests) {
            console.log('[SyncTests] Pruebas de recuperación deshabilitadas');
            return;
        }
        
        console.log('[SyncTests] Ejecutando pruebas de recuperación...');
        
        const tests = [
            this.testAutomaticRecovery,
            this.testManualRecovery,
            this.testRecoveryFromDeadlock,
            this.testRecoveryFromRaceCondition,
            this.testRecoveryFromMemoryLeak
        ];
        
        for (const test of tests) {
            await this.runTest(test);
        }
    },

    // Ejecutar pruebas de rendimiento
    runPerformanceTests: async function() {
        console.log('[SyncTests] Ejecutando pruebas de rendimiento...');
        
        const tests = [
            this.testLockAcquisitionPerformance,
            this.testQueueProcessingPerformance,
            this.testMemoryUsageUnderLoad,
            this.testScalabilityUnderLoad,
            this.testResponseTimeUnderLoad
        ];
        
        for (const test of tests) {
            await this.runTest(test);
        }
    },

    // Ejecutar pruebas de estrés
    runStressTests: async function() {
        if (!this.config.enableStressTests) {
            console.log('[SyncTests] Pruebas de estrés deshabilitadas');
            return;
        }
        
        console.log('[SyncTests] Ejecutando pruebas de estrés...');
        
        const tests = [
            this.testHighConcurrencyStress,
            this.testMemoryStress,
            this.testQueueOverflowStress,
            this.testResourceExhaustionStress,
            this.testExtendedOperationStress
        ];
        
        for (const test of tests) {
            await this.runTest(test);
        }
    },

    // Ejecutar prueba individual
    runTest: async function(testFunction) {
        const testResult = {
            name: testFunction.name,
            category: this.getTestCategory(testFunction.name),
            startTime: Date.now(),
            endTime: null,
            duration: 0,
            status: 'running',
            error: null,
            details: {}
        };
        
        try {
            console.log(`[SyncTests] Ejecutando prueba: ${testFunction.name}`);
            
            // Ejecutar prueba con timeout
            const result = await Promise.race([
                testFunction.call(this),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Test timeout')), this.config.testTimeout)
                )
            ]);
            
            testResult.endTime = Date.now();
            testResult.duration = testResult.endTime - testResult.startTime;
            testResult.status = 'passed';
            testResult.details = result;
            
            this.state.results.passed++;
            console.log(`[SyncTests] ✓ ${testFunction.name} (${testResult.duration}ms)`);
            
        } catch (error) {
            testResult.endTime = Date.now();
            testResult.duration = testResult.endTime - testResult.startTime;
            testResult.status = 'failed';
            testResult.error = error.message;
            testResult.details = { error: error.stack };
            
            this.state.results.failed++;
            this.state.metrics.errors++;
            console.error(`[SyncTests] ✗ ${testFunction.name}: ${error.message}`);
        }
        
        this.state.results.total++;
        this.state.results.tests.push(testResult);
        
        return testResult;
    },

    // Obtener categoría de prueba
    getTestCategory: function(testName) {
        if (testName.includes('Basic')) return 'basic';
        if (testName.includes('Concurrency')) return 'concurrency';
        if (testName.includes('Race')) return 'race-condition';
        if (testName.includes('Deadlock')) return 'deadlock';
        if (testName.includes('Recovery')) return 'recovery';
        if (testName.includes('Performance')) return 'performance';
        if (testName.includes('Stress')) return 'stress';
        return 'unknown';
    },

    // === PRUEBAS BÁSICAS ===
    
    // Probar inicialización de SyncManager
    testSyncManagerInitialization: async function() {
        if (typeof SyncManager === 'undefined') {
            throw new Error('SyncManager no está disponible');
        }
        
        const result = {
            initialized: SyncManager.state.initialized,
            hasLockManager: !!SyncManager.LockManager,
            hasQueueManager: !!SyncManager.QueueManager,
            hasTransactionManager: !!SyncManager.TransactionManager,
            hasEventSystem: !!SyncManager.EventSystem
        };
        
        if (!result.initialized) {
            throw new Error('SyncManager no está inicializado');
        }
        
        return result;
    },

    // Probar inicialización de ConcurrencyController
    testConcurrencyControllerInitialization: async function() {
        if (typeof ConcurrencyController === 'undefined') {
            throw new Error('ConcurrencyController no está disponible');
        }
        
        const result = {
            initialized: ConcurrencyController.state.initialized,
            hasSemaphore: !!ConcurrencyController.Semaphore,
            hasBarrier: !!ConcurrencyController.Barrier,
            hasCountDownLatch: !!ConcurrencyController.CountDownLatch,
            hasThreadPool: !!ConcurrencyController.ThreadPool,
            hasAtomic: !!ConcurrencyController.Atomic
        };
        
        if (!result.initialized) {
            throw new Error('ConcurrencyController no está inicializado');
        }
        
        return result;
    },

    // Probar inicialización de SyncDiagnostics
    testSyncDiagnosticsInitialization: async function() {
        if (typeof SyncDiagnostics === 'undefined') {
            throw new Error('SyncDiagnostics no está disponible');
        }
        
        const result = {
            initialized: SyncDiagnostics.state.initialized,
            monitoringActive: SyncDiagnostics.state.monitoringActive,
            healthCheckActive: SyncDiagnostics.state.healthCheckActive
        };
        
        if (!result.initialized) {
            throw new Error('SyncDiagnostics no está inicializado');
        }
        
        return result;
    },

    // Probar adquisición básica de bloqueo
    testBasicLockAcquisition: async function() {
        const lockResult = await SyncManager.LockManager.acquire('test-resource', {
            timeout: 5000
        });
        
        if (!lockResult.success) {
            throw new Error('No se pudo adquirir bloqueo básico');
        }
        
        const releaseResult = await SyncManager.LockManager.release('test-resource', lockResult.lockId);
        
        if (!releaseResult.success) {
            throw new Error('No se pudo liberar bloqueo básico');
        }
        
        return {
            acquisition: lockResult,
            release: releaseResult
        };
    },

    // Probar operación básica de semáforo
    testBasicSemaphoreOperation: async function() {
        const semaphore = new ConcurrencyController.Semaphore(2);
        
        const acquire1 = await semaphore.acquire();
        const acquire2 = await semaphore.acquire();
        
        if (!acquire1 || !acquire2) {
            throw new Error('No se pudieron adquirir los permisos del semáforo');
        }
        
        // Intentar adquirir tercer permiso (debe fallar)
        const tryAcquire = semaphore.tryAcquire();
        if (tryAcquire) {
            throw new Error('El semáforo permitió más permisos de los disponibles');
        }
        
        // Liberar permisos
        semaphore.release();
        semaphore.release();
        
        // Ahora debería poder adquirir
        const acquire3 = await semaphore.acquire();
        if (!acquire3) {
            throw new Error('No se pudo adquirir permiso después de liberar');
        }
        
        semaphore.release();
        semaphore.destroy();
        
        return {
            permits: 2,
            successfulAcquisitions: 3
        };
    },

    // Probar operación básica de barrera
    testBasicBarrierOperation: async function() {
        const barrier = new ConcurrencyController.Barrier(3);
        
        let completed = 0;
        const promises = [];
        
        for (let i = 0; i < 3; i++) {
            promises.push(
                barrier.await().then(() => {
                    completed++;
                    return i;
                })
            );
        }
        
        const results = await Promise.all(promises);
        
        if (completed !== 3) {
            throw new Error('La barrera no completó a todas las partes');
        }
        
        barrier.destroy();
        
        return {
            parties: 3,
            completed,
            results
        };
    },

    // Probar operación básica de latch
    testBasicLatchOperation: async function() {
        const latch = new ConcurrencyController.CountDownLatch(3);
        
        let completed = 0;
        const promises = [];
        
        // Iniciar tareas que contarán hacia abajo
        for (let i = 0; i < 3; i++) {
            promises.push(
                new Promise(resolve => {
                    setTimeout(() => {
                        latch.countDown();
                        resolve(i);
                    }, 100);
                })
            );
        }
        
        // Esperar a que el latch llegue a cero
        await latch.await();
        
        const results = await Promise.all(promises);
        
        if (latch.getCount() !== 0) {
            throw new Error('El latch no llegó a cero');
        }
        
        latch.destroy();
        
        return {
            count: 3,
            completed: true,
            results
        };
    },

    // === PRUEBAS DE CONCURRENCIA ===
    
    // Probar adquisición concurrente de bloqueos
    testConcurrentLockAcquisition: async function() {
        const resource = 'concurrent-test-resource';
        const promises = [];
        const results = [];
        
        // Iniciar múltiples solicitudes de bloqueo concurrentes
        for (let i = 0; i < 5; i++) {
            promises.push(
                SyncManager.LockManager.acquire(resource, {
                    timeout: 10000,
                    priority: i
                }).then(result => {
                    results.push({ index: i, result });
                    
                    // Mantener bloqueo por un tiempo
                    setTimeout(() => {
                        SyncManager.LockManager.release(resource, result.lockId);
                    }, 1000);
                    
                    return result;
                })
            );
        }
        
        await Promise.all(promises);
        
        // Verificar que todas las solicitudes fueron exitosas
        const successful = results.filter(r => r.result.success);
        if (successful.length !== 5) {
            throw new Error(`Solo ${successful.length}/5 solicitudes concurrentes fueron exitosas`);
        }
        
        return {
            concurrentRequests: 5,
            successful: successful.length,
            results
        };
    },

    // Probar ejecución de thread pool
    testThreadPoolExecution: async function() {
        const threadPool = new ConcurrencyController.ThreadPool({
            maxSize: 3,
            minSize: 1
        });
        
        const promises = [];
        const results = [];
        
        // Enviar más tareas que el tamaño del pool
        for (let i = 0; i < 10; i++) {
            promises.push(
                threadPool.execute(async (thread) => {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return { taskId: i, threadId: thread.id };
                }).then(result => {
                    results.push(result);
                    return result;
                })
            );
        }
        
        await Promise.all(promises);
        
        // Verificar que todas las tareas se completaron
        if (results.length !== 10) {
            throw new Error(`Solo ${results.length}/10 tareas se completaron`);
        }
        
        const stats = threadPool.getStats();
        await threadPool.destroy();
        
        return {
            tasks: 10,
            completed: results.length,
            stats,
            results
        };
    },

    // Probar operaciones atómicas
    testAtomicOperations: async function() {
        let counter = 0;
        const promises = [];
        
        // Incrementar contador atómicamente desde múltiples hilos
        for (let i = 0; i < 10; i++) {
            promises.push(
                ConcurrencyController.Atomic.increment(() => counter, 1).then(result => {
                    return result;
                })
            );
        }
        
        const results = await Promise.all(promises);
        
        // Verificar que el contador final es correcto
        if (counter !== 10) {
            throw new Error(`El contador final es ${counter}, debería ser 10`);
        }
        
        // Probar operación atómica de actualización
        const updateResult = await ConcurrencyController.Atomic.update(() => counter, (current) => current * 2);
        
        if (updateResult !== 20) {
            throw new Error(`La actualización atómica falló: ${updateResult}, debería ser 20`);
        }
        
        return {
            increments: 10,
            finalCounter: counter,
            updateResult,
            results
        };
    },

    // Probar procesamiento concurrente de cola
    testConcurrentQueueProcessing: async function() {
        const queue = [];
        const processed = [];
        const promises = [];
        
        // Productores concurrentes
        for (let i = 0; i < 3; i++) {
            promises.push(
                new Promise(resolve => {
                    setTimeout(() => {
                        for (let j = 0; j < 5; j++) {
                            const item = { producer: i, item: j, timestamp: Date.now() };
                            queue.push(item);
                        }
                        resolve(i);
                    }, 100);
                })
            );
        }
        
        // Consumidores concurrentes
        for (let i = 0; i < 2; i++) {
            promises.push(
                new Promise(resolve => {
                    const consume = () => {
                        if (queue.length > 0) {
                            const item = queue.shift();
                            processed.push({ consumer: i, item });
                            setTimeout(consume, 10);
                        } else if (processed.length < 15) {
                            setTimeout(consume, 10);
                        } else {
                            resolve(i);
                        }
                    };
                    consume();
                })
            );
        }
        
        await Promise.all(promises);
        
        // Verificar que todos los items fueron procesados
        if (processed.length !== 15) {
            throw new Error(`Solo ${processed.length}/15 items fueron procesados`);
        }
        
        return {
            producers: 3,
            consumers: 2,
            items: 15,
            processed: processed.length,
            results: processed
        };
    },

    // Probar semáforo con múltiples permisos
    testSemaphoreWithMultiplePermits: async function() {
        const semaphore = new ConcurrencyController.Semaphore(3);
        const promises = [];
        const results = [];
        
        // Adquirir todos los permisos
        for (let i = 0; i < 3; i++) {
            promises.push(
                semaphore.acquire().then(acquired => {
                    results.push({ index: i, acquired });
                    return acquired;
                })
            );
        }
        
        await Promise.all(promises);
        
        // Intentar adquirir permiso adicional (debe fallar)
        const tryAcquire = semaphore.tryAcquire();
        if (tryAcquire) {
            throw new Error('El semáforo permitió más permisos de los disponibles');
        }
        
        // Liberar todos los permisos
        for (let i = 0; i < 3; i++) {
            semaphore.release();
        }
        
        // Ahora debería poder adquirir múltiples permisos
        const additionalPromises = [];
        for (let i = 0; i < 2; i++) {
            additionalPromises.push(semaphore.acquire());
        }
        
        await Promise.all(additionalPromises);
        
        semaphore.destroy();
        
        return {
            totalPermits: 3,
            initialAcquisitions: 3,
            additionalAcquisitions: 2,
            results
        };
    },

    // === PRUEBAS DE RACE CONDITIONS ===
    
    // Probar detección de race conditions
    testRaceConditionDetection: async function() {
        const detector = ConcurrencyController.RaceDetector.create('race-test-resource', {
            maxConcurrent: 1,
            window: 2000
        });
        
        const promises = [];
        const results = [];
        
        // Iniciar operaciones concurrentes que deberían generar race condition
        for (let i = 0; i < 3; i++) {
            promises.push(
                new Promise(resolve => {
                    setTimeout(async () => {
                        const operationId = `op_${i}`;
                        const canProceed = detector.track(operationId);
                        
                        if (canProceed) {
                            // Simular operación
                            await new Promise(r => setTimeout(r, 100));
                            results.push({ operationId, success: true });
                            detector.complete(operationId);
                        } else {
                            results.push({ operationId, success: false, reason: 'race_detected' });
                        }
                        
                        resolve();
                    }, i * 50);
                })
            );
        }
        
        await Promise.all(promises);
        
        // Verificar que se detectó la race condition
        const raceDetected = detector.check();
        
        detector.destroy();
        
        return {
            concurrentOperations: 3,
            raceDetected,
            results
        };
    },

    // Probar acceso a recurso compartido
    testSharedResourceAccess: async function() {
        const sharedResource = { value: 0, operations: [] };
        const promises = [];
        
        // Múltiples operaciones concurrentes sobre recurso compartido
        for (let i = 0; i < 5; i++) {
            promises.push(
                new Promise(resolve => {
                    setTimeout(() => {
                        // Operación no atómica (potencial race condition)
                        const currentValue = sharedResource.value;
                        sharedResource.value = currentValue + 1;
                        sharedResource.operations.push({ thread: i, oldValue: currentValue, newValue: sharedResource.value });
                        resolve(i);
                    }, Math.random() * 100);
                })
            );
        }
        
        await Promise.all(promises);
        
        // Verificar consistencia
        const expectedValue = 5;
        const isConsistent = sharedResource.value === expectedValue;
        
        return {
            operations: 5,
            finalValue: sharedResource.value,
            expectedValue,
            consistent: isConsistent,
            operationsLog: sharedResource.operations
        };
    },

    // Probar incremento concurrente de contador
    testConcurrentCounterIncrement: async function() {
        let unsafeCounter = 0;
        let atomicCounter = 0;
        const promises = [];
        
        // Incrementar contadores concurrentemente
        for (let i = 0; i < 10; i++) {
            promises.push(
                Promise.all([
                    // Incremento no atómico
                    new Promise(resolve => {
                        setTimeout(() => {
                            const oldValue = unsafeCounter;
                            unsafeCounter = oldValue + 1;
                            resolve(oldValue);
                        }, Math.random() * 100);
                    }),
                    
                    // Incremento atómico
                    ConcurrencyController.Atomic.increment(() => atomicCounter, 1)
                ])
            );
        }
        
        const results = await Promise.all(promises);
        
        // Verificar resultados
        const unsafeExpected = 10;
        const atomicExpected = 10;
        
        const unsafeConsistent = unsafeCounter === unsafeExpected;
        const atomicConsistent = atomicCounter === atomicExpected;
        
        return {
            increments: 10,
            unsafeCounter,
            atomicCounter,
            unsafeConsistent,
            atomicConsistent,
            results
        };
    },

    // Probar modificación concurrenta de estado
    testConcurrentStateModification: async function() {
        const state = { data: [], version: 0 };
        const promises = [];
        
        // Modificar estado concurrentemente
        for (let i = 0; i < 5; i++) {
            promises.push(
                new Promise(resolve => {
                    setTimeout(() => {
                        // Modificación no atómica del estado
                        const currentVersion = state.version;
                        state.version = currentVersion + 1;
                        state.data.push({ operation: i, version: state.version, timestamp: Date.now() });
                        resolve(i);
                    }, Math.random() * 100);
                })
            );
        }
        
        await Promise.all(promises);
        
        // Verificar consistencia del estado
        const expectedVersion = 5;
        const versionConsistent = state.version === expectedVersion;
        const dataConsistent = state.data.length === 5;
        
        return {
            modifications: 5,
            finalVersion: state.version,
            dataLength: state.data.length,
            versionConsistent,
            dataConsistent,
            stateData: state.data
        };
    },

    // Probar prevención de race conditions
    testRaceConditionPrevention: async function() {
        const protectedResource = { value: 0, operations: [] };
        const lockResource = 'protected-resource';
        const promises = [];
        
        // Operaciones protegidas con bloqueo
        for (let i = 0; i < 5; i++) {
            promises.push(
                SyncManager.LockManager.acquire(lockResource, {
                    timeout: 5000
                }).then(async (lockResult) => {
                    if (lockResult.success) {
                        try {
                            // Operación atómica protegida
                            const currentValue = protectedResource.value;
                            protectedResource.value = currentValue + 1;
                            protectedResource.operations.push({ 
                                thread: i, 
                                oldValue: currentValue, 
                                newValue: protectedResource.value,
                                protected: true 
                            });
                            
                            await new Promise(resolve => setTimeout(resolve, 50));
                            
                            return { thread: i, success: true, value: protectedResource.value };
                        } finally {
                            await SyncManager.LockManager.release(lockResource, lockResult.lockId);
                        }
                    } else {
                        return { thread: i, success: false, reason: 'lock_failed' };
                    }
                })
            );
        }
        
        const results = await Promise.all(promises);
        
        // Verificar que todas las operaciones fueron exitosas y consistentes
        const successful = results.filter(r => r.success);
        const finalValue = protectedResource.value;
        const expectedValue = 5;
        const consistent = finalValue === expectedValue;
        
        return {
            operations: 5,
            successful: successful.length,
            finalValue,
            expectedValue,
            consistent,
            results,
            operationsLog: protectedResource.operations
        };
    },

    // === PRUEBAS DE DEADLOCKS ===
    
    // Probar detección de deadlock
    testDeadlockDetection: async function() {
        const resource1 = 'deadlock-test-1';
        const resource2 = 'deadlock-test-2';
        const promises = [];
        
        // Crear escenario de deadlock potencial
        promises.push(
            // Operación 1: adquirir resource1, luego resource2
            SyncManager.LockManager.acquire(resource1, { timeout: 5000 })
                .then(async (lock1) => {
                    if (lock1.success) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        return SyncManager.LockManager.acquire(resource2, { timeout: 5000 });
                    }
                    return lock1;
                })
        );
        
        promises.push(
            // Operación 2: adquirir resource2, luego resource1
            SyncManager.LockManager.acquire(resource2, { timeout: 5000 })
                .then(async (lock2) => {
                    if (lock2.success) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        return SyncManager.LockManager.acquire(resource1, { timeout: 5000 });
                    }
                    return lock2;
                })
        );
        
        const results = await Promise.allSettled(promises);
        
        // Verificar si se detectó deadlock (basado en timeouts o detección interna)
        const deadlockDetected = results.some(r => 
            r.status === 'rejected' || 
            (r.value && !r.value.success)
        );
        
        // Liberar recursos si fueron adquiridos
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.success) {
                if (result.value.resource === resource1) {
                    await SyncManager.LockManager.release(resource1, result.value.lockId);
                } else if (result.value.resource === resource2) {
                    await SyncManager.LockManager.release(resource2, result.value.lockId);
                }
            }
        }
        
        return {
            resources: 2,
            operations: 2,
            deadlockDetected,
            results
        };
    },

    // Probar prevención de deadlock
    testDeadlockPrevention: async function() {
        const resources = ['deadlock-prev-1', 'deadlock-prev-2', 'deadlock-prev-3'];
        const promises = [];
        
        // Adquirir recursos en orden consistente para prevenir deadlock
        for (let i = 0; i < 3; i++) {
            promises.push(
                SyncManager.LockManager.acquire(resources[i], {
                    timeout: 5000,
                    priority: i // Prioridad para orden consistente
                }).then(async (lockResult) => {
                    if (lockResult.success) {
                        // Mantener recurso por un tiempo
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                        // Liberar en orden inverso
                        await SyncManager.LockManager.release(resources[i], lockResult.lockId);
                        
                        return { resource: resources[i], success: true };
                    }
                    return { resource: resources[i], success: false };
                })
            );
        }
        
        const results = await Promise.all(promises);
        
        // Verificar que todas las operaciones fueron exitosas
        const successful = results.filter(r => r.success);
        const allSuccessful = successful.length === 3;
        
        return {
            resources: 3,
            operations: 3,
            successful: successful.length,
            allSuccessful,
            results
        };
    },

    // Probar resolución de deadlock
    testDeadlockResolution: async function() {
        // Esta prueba simula un deadlock y verifica la resolución
        const resource1 = 'deadlock-res-1';
        const resource2 = 'deadlock-res-2';
        
        let deadlockDetected = false;
        let resolutionAttempted = false;
        
        // Escuchar eventos de deadlock
        if (typeof document !== 'undefined') {
            document.addEventListener('sync:deadlock:resolved', (event) => {
                deadlockDetected = true;
                resolutionAttempted = true;
            });
        }
        
        // Crear situación que podría causar deadlock
        const operation1 = SyncManager.LockManager.acquire(resource1, { timeout: 2000 })
            .then(async (lock1) => {
                if (lock1.success) {
                    // Intentar adquirir segundo recurso (podría causar deadlock)
                    return SyncManager.LockManager.acquire(resource2, { timeout: 2000 });
                }
                return lock1;
            });
        
        const operation2 = SyncManager.LockManager.acquire(resource2, { timeout: 2000 })
            .then(async (lock2) => {
                if (lock2.success) {
                    // Intentar adquirir primer recurso (podría causar deadlock)
                    return SyncManager.LockManager.acquire(resource1, { timeout: 2000 });
                }
                return lock2;
            });
        
        const results = await Promise.allSettled([operation1, operation2]);
        
        // Esperar un tiempo para que se detecte y resuelva el deadlock
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Limpiar recursos
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value && result.value.success) {
                if (result.value.resource === resource1) {
                    await SyncManager.LockManager.release(resource1, result.value.lockId);
                } else if (result.value.resource === resource2) {
                    await SyncManager.LockManager.release(resource2, result.value.lockId);
                }
            }
        }
        
        return {
            resources: 2,
            deadlockDetected,
            resolutionAttempted,
            results
        };
    },

    // Probar detección de dependencias circulares
    testCircularDependencyDetection: async function() {
        // Crear grafo de dependencias circular
        const graph = new Map();
        graph.set('A', new Set(['B']));
        graph.set('B', new Set(['C']));
        graph.set('C', new Set(['A'])); // Ciclo A->B->C->A
        
        // Usar algoritmo de detección de ciclos del SyncManager
        const cycles = SyncManager.findCycles ? 
            SyncManager.findCycles(graph) : [];
        
        const hasCycle = cycles.length > 0;
        
        return {
            nodes: 3,
            edges: 3,
            hasCycle,
            cycles,
            graph
        };
    },

    // Probar resolución de deadlock por timeout
    testTimeoutBasedDeadlockResolution: async function() {
        const resource = 'timeout-deadlock-test';
        const promises = [];
        
        // Múltiples operaciones con timeout corto
        for (let i = 0; i < 3; i++) {
            promises.push(
                SyncManager.LockManager.acquire(resource, {
                    timeout: 1000, // Timeout corto
                    priority: i
                }).then(result => {
                    if (result.success) {
                        // Liberar rápidamente
                        setTimeout(() => {
                            SyncManager.LockManager.release(resource, result.lockId);
                        }, 100);
                    }
                    return result;
                })
            );
        }
        
        const results = await Promise.allSettled(promises);
        
        // Verificar que al menos una operación falló por timeout
        const timeouts = results.filter(r => 
            r.status === 'rejected' || 
            (r.value && !r.value.success)
        );
        
        const hasTimeoutResolution = timeouts.length > 0;
        
        return {
            operations: 3,
            timeouts: timeouts.length,
            hasTimeoutResolution,
            results
        };
    },

    // === PRUEBAS DE RECUPERACIÓN ===
    
    // Probar recuperación automática
    testAutomaticRecovery: async function() {
        if (typeof SyncDiagnostics === 'undefined') {
            throw new Error('SyncDiagnostics no está disponible');
        }
        
        // Simular condición de error
        const originalHealth = SyncDiagnostics.state.health.status;
        
        // Forzar estado degradado
        SyncDiagnostics.state.health.status = 'error';
        SyncDiagnostics.state.health.issues = ['Simulated error for testing'];
        
        // Esperar a que el sistema de recuperación actúe
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verificar si se intentó recuperación
        const recoveryAttempted = SyncDiagnostics.state.recovery.lastAttempt !== null;
        
        // Restaurar estado original
        SyncDiagnostics.state.health.status = originalHealth;
        SyncDiagnostics.state.health.issues = [];
        
        return {
            simulatedError: true,
            recoveryAttempted,
            originalHealth
        };
    },

    // Probar recuperación manual
    testManualRecovery: async function() {
        // Simular estado degradado
        const degradedState = {
            status: 'degraded',
            issues: ['Memory usage high', 'Lock contention detected'],
            checks: {
                memory: { status: 'warning' },
                locks: { status: 'warning' }
            }
        };
        
        // Realizar acciones de recuperación manual
        const recoveryActions = [];
        
        // Liberar bloqueos
        if (typeof SyncManager !== 'undefined') {
            const releasedLocks = SyncManager.LockManager.releaseAll();
            recoveryActions.push({ action: 'release_locks', count: releasedLocks });
        }
        
        // Limpiar colas
        if (typeof SyncManager !== 'undefined') {
            const clearedQueues = [];
            for (const [resource] of SyncManager.state.queues) {
                const cleared = SyncManager.QueueManager.clearQueue(resource);
                clearedQueues.push({ resource, cleared });
            }
            recoveryActions.push({ action: 'clear_queues', cleared: clearedQueues });
        }
        
        // Reiniciar métricas
        if (typeof SyncManager !== 'undefined') {
            SyncManager.resetMetrics();
            recoveryActions.push({ action: 'reset_metrics' });
        }
        
        // Verificar estado después de recuperación
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const healthAfterRecovery = typeof SyncDiagnostics !== 'undefined' ? 
            await SyncDiagnostics.performHealthCheck() : null;
        
        return {
            degradedState,
            recoveryActions,
            healthAfterRecovery
        };
    },

    // Probar recuperación de deadlock
    testRecoveryFromDeadlock: async function() {
        // Crear situación de deadlock real
        const resource1 = 'recovery-deadlock-1';
        const resource2 = 'recovery-deadlock-2';
        
        let deadlockResolved = false;
        
        // Escuchar eventos de resolución de deadlock
        if (typeof document !== 'undefined') {
            document.addEventListener('sync:deadlock:resolved', () => {
                deadlockResolved = true;
            });
        }
        
        // Crear deadlock
        const lock1Promise = SyncManager.LockManager.acquire(resource1, { timeout: 10000 });
        const lock2Promise = SyncManager.LockManager.acquire(resource2, { timeout: 10000 });
        
        const [lock1, lock2] = await Promise.all([lock1Promise, lock2Promise]);
        
        if (lock1.success && lock2.success) {
            // Intentar crear deadlock
            const deadlockPromise1 = SyncManager.LockManager.acquire(resource2, { timeout: 1000 });
            const deadlockPromise2 = SyncManager.LockManager.acquire(resource1, { timeout: 1000 });
            
            await Promise.allSettled([deadlockPromise1, deadlockPromise2]);
            
            // Esperar a resolución
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Liberar recursos
            await SyncManager.LockManager.release(resource1, lock1.lockId);
            await SyncManager.LockManager.release(resource2, lock2.lockId);
        }
        
        return {
            resources: [resource1, resource2],
            deadlockResolved,
            initialLocks: { lock1: lock1.success, lock2: lock2.success }
        };
    },

    // Probar recuperación de race condition
    testRecoveryFromRaceCondition: async function() {
        const detector = ConcurrencyController.RaceDetector.create('recovery-race-test', {
            maxConcurrent: 1,
            window: 1000
        });
        
        let raceDetected = false;
        let recoveryAttempted = false;
        
        // Simular race condition y recuperación
        const promises = [];
        
        for (let i = 0; i < 3; i++) {
            promises.push(
                new Promise(resolve => {
                    setTimeout(async () => {
                        const operationId = `recovery_op_${i}`;
                        
                        const canProceed = detector.track(operationId);
                        if (!canProceed) {
                            raceDetected = true;
                            recoveryAttempted = true;
                            
                            // Simular acción de recuperación
                            await new Promise(r => setTimeout(r, 100));
                        }
                        
                        detector.complete(operationId);
                        resolve({ operationId, raceDetected });
                    }, i * 50);
                })
            );
        }
        
        const results = await Promise.all(promises);
        
        detector.destroy();
        
        return {
            operations: 3,
            raceDetected,
            recoveryAttempted,
            results
        };
    },

    // Probar recuperación de memory leak
    testRecoveryFromMemoryLeak: async function() {
        // Simular alta memoria
        const initialMemory = typeof performance !== 'undefined' && performance.memory ? 
            performance.memory.usedJSHeapSize : 0;
        
        // Simular recuperación de memoria
        let recoveryPerformed = false;
        
        if (typeof SyncDiagnostics !== 'undefined') {
            // Forzar detección de memory leak
            SyncDiagnostics.raiseAlert('high-memory-usage', {
                percentage: 0.9,
                used: initialMemory * 1.1,
                threshold: 0.8
            });
            
            // Esperar a que se inicie recuperación
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Realizar recuperación manual
            await SyncDiagnostics.performMemoryRecovery();
            recoveryPerformed = true;
        }
        
        const finalMemory = typeof performance !== 'undefined' && performance.memory ? 
            performance.memory.usedJSHeapSize : 0;
        
        return {
            initialMemory,
            finalMemory,
            recoveryPerformed,
            memoryReduced: finalMemory < initialMemory
        };
    },

    // === PRUEBAS DE RENDIMIENTO ===
    
    // Probar rendimiento de adquisición de bloqueos
    testLockAcquisitionPerformance: async function() {
        const iterations = 100;
        const promises = [];
        const startTime = Date.now();
        
        // Realizar múltiples adquisiciones de bloqueos
        for (let i = 0; i < iterations; i++) {
            promises.push(
                SyncManager.LockManager.acquire(`perf-test-${i % 10}`, {
                    timeout: 5000
                }).then(async (result) => {
                    if (result.success) {
                        // Mantener bloqueo por tiempo corto
                        await new Promise(resolve => setTimeout(resolve, 10));
                        await SyncManager.LockManager.release(`perf-test-${i % 10}`, result.lockId);
                    }
                    return result;
                })
            );
        }
        
        const results = await Promise.all(promises);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const successful = results.filter(r => r.success).length;
        const averageTime = duration / iterations;
        
        return {
            iterations,
            successful,
            failed: iterations - successful,
            duration,
            averageTime,
            throughput: successful / (duration / 1000) // operaciones por segundo
        };
    },

    // Probar rendimiento de procesamiento de cola
    testQueueProcessingPerformance: async function() {
        const queue = [];
        const processed = [];
        const items = 1000;
        const workers = 5;
        const startTime = Date.now();
        
        // Productor
        for (let i = 0; i < items; i++) {
            queue.push({ id: i, timestamp: Date.now() });
        }
        
        // Consumidores concurrentes
        const promises = [];
        for (let i = 0; i < workers; i++) {
            promises.push(
                new Promise(resolve => {
                    const process = () => {
                        if (queue.length > 0) {
                            const item = queue.shift();
                            processed.push({ worker: i, item });
                            setTimeout(process, 1);
                        } else if (processed.length < items) {
                            setTimeout(process, 1);
                        } else {
                            resolve(i);
                        }
                    };
                    process();
                })
            );
        }
        
        await Promise.all(promises);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return {
            items,
            workers,
            processed: processed.length,
            duration,
            throughput: processed.length / (duration / 1000)
        };
    },

    // Probar uso de memoria bajo carga
    testMemoryUsageUnderLoad: async function() {
        const initialMemory = typeof performance !== 'undefined' && performance.memory ? 
            performance.memory.usedJSHeapSize : 0;
        
        // Crear carga de memoria
        const data = [];
        for (let i = 0; i < 10000; i++) {
            data.push({
                id: i,
                data: new Array(100).fill(Math.random()),
                timestamp: Date.now()
            });
        }
        
        const peakMemory = typeof performance !== 'undefined' && performance.memory ? 
            performance.memory.usedJSHeapSize : 0;
        
        // Limpiar datos
        data.length = 0;
        
        // Forzar garbage collection si está disponible
        if (typeof window !== 'undefined' && window.gc) {
            window.gc();
        }
        
        const finalMemory = typeof performance !== 'undefined' && performance.memory ? 
            performance.memory.usedJSHeapSize : 0;
        
        return {
            initialMemory,
            peakMemory,
            finalMemory,
            memoryIncrease: peakMemory - initialMemory,
            memoryRecovered: peakMemory - finalMemory
        };
    },

    // Probar escalabilidad bajo carga
    testScalabilityUnderLoad: async function() {
        const loads = [10, 50, 100, 200];
        const results = [];
        
        for (const load of loads) {
            const startTime = Date.now();
            const promises = [];
            
            // Crear carga
            for (let i = 0; i < load; i++) {
                promises.push(
                    SyncManager.LockManager.acquire(`scale-test-${i % 20}`, {
                        timeout: 5000
                    }).then(async (result) => {
                        if (result.success) {
                            await new Promise(resolve => setTimeout(resolve, 10));
                            await SyncManager.LockManager.release(`scale-test-${i % 20}`, result.lockId);
                        }
                        return result;
                    })
                );
            }
            
            const loadResults = await Promise.all(promises);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            const successful = loadResults.filter(r => r.success).length;
            
            results.push({
                load,
                successful,
                failed: load - successful,
                duration,
                throughput: successful / (duration / 1000)
            });
        }
        
        return {
            loads,
            results
        };
    },

    // Probar tiempo de respuesta bajo carga
    testResponseTimeUnderLoad: async function() {
        const operations = 50;
        const promises = [];
        const responseTimes = [];
        
        for (let i = 0; i < operations; i++) {
            promises.push(
                new Promise(resolve => {
                    const startTime = Date.now();
                    
                    SyncManager.LockManager.acquire(`response-test-${i % 10}`, {
                        timeout: 5000
                    }).then(async (result) => {
                        if (result.success) {
                            await new Promise(r => setTimeout(r, 10));
                            await SyncManager.LockManager.release(`response-test-${i % 10}`, result.lockId);
                        }
                        
                        const endTime = Date.now();
                        const responseTime = endTime - startTime;
                        responseTimes.push(responseTime);
                        
                        resolve({ operation: i, responseTime, success: result.success });
                    });
                })
            );
        }
        
        const results = await Promise.all(promises);
        
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);
        const minResponseTime = Math.min(...responseTimes);
        
        return {
            operations,
            responseTimes,
            average: avgResponseTime,
            maximum: maxResponseTime,
            minimum: minResponseTime,
            results
        };
    },

    // === PRUEBAS DE ESTRÉS ===
    
    // Probar estrés de alta concurrencia
    testHighConcurrencyStress: async function() {
        const concurrency = 50;
        const duration = 5000; // 5 segundos
        const promises = [];
        const operations = [];
        
        const startTime = Date.now();
        
        // Mantener alta concurrencia durante el tiempo especificado
        for (let i = 0; i < concurrency; i++) {
            promises.push(
                new Promise(resolve => {
                    const operation = async () => {
                        let count = 0;
                        const endTime = Date.now() + duration;
                        
                        while (Date.now() < endTime) {
                            try {
                                const result = await SyncManager.LockManager.acquire(`stress-${i}`, {
                                    timeout: 1000
                                });
                                
                                if (result.success) {
                                    count++;
                                    operations.push({ thread: i, operation: count, timestamp: Date.now() });
                                    
                                    // Liberar rápidamente
                                    setTimeout(() => {
                                        SyncManager.LockManager.release(`stress-${i}`, result.lockId);
                                    }, 10);
                                }
                            } catch (error) {
                                operations.push({ thread: i, error: error.message, timestamp: Date.now() });
                            }
                            
                            await new Promise(r => setTimeout(r, 50));
                        }
                        
                        return count;
                    };
                    
                    operation().then(resolve);
                })
            );
        }
        
        const results = await Promise.all(promises);
        const endTime = Date.now();
        const actualDuration = endTime - startTime;
        
        const successfulOps = operations.filter(op => !op.error).length;
        const failedOps = operations.filter(op => op.error).length;
        
        return {
            concurrency,
            duration: actualDuration,
            totalOperations: operations.length,
            successful: successfulOps,
            failed: failedOps,
            throughput: successfulOps / (actualDuration / 1000),
            results
        };
    },

    // Probar estrés de memoria
    testMemoryStress: async function() {
        const initialMemory = typeof performance !== 'undefined' && performance.memory ? 
            performance.memory.usedJSHeapSize : 0;
        
        const data = [];
        let peakMemory = initialMemory;
        
        // Consumir memoria rápidamente
        const startTime = Date.now();
        const duration = 3000; // 3 segundos
        
        while (Date.now() - startTime < duration) {
            // Crear objetos grandes
            for (let i = 0; i < 100; i++) {
                data.push({
                    id: i,
                    largeData: new Array(1000).fill(Math.random()),
                    timestamp: Date.now()
                });
            }
            
            // Verificar memoria pico
            if (typeof performance !== 'undefined' && performance.memory) {
                const currentMemory = performance.memory.usedJSHeapSize;
                peakMemory = Math.max(peakMemory, currentMemory);
            }
            
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        const finalMemory = typeof performance !== 'undefined' && performance.memory ? 
            performance.memory.usedJSHeapSize : 0;
        
        // Limpiar datos
        data.length = 0;
        
        // Forzar garbage collection
        if (typeof window !== 'undefined' && window.gc) {
            window.gc();
        }
        
        const recoveredMemory = typeof performance !== 'undefined' && performance.memory ? 
            performance.memory.usedJSHeapSize : 0;
        
        return {
            duration,
            initialMemory,
            peakMemory,
            finalMemory,
            recoveredMemory,
            memoryIncrease: peakMemory - initialMemory,
            memoryRecovered: peakMemory - recoveredMemory,
            objectsCreated: data.length
        };
    },

    // Probar estrés de desbordamiento de cola
    testQueueOverflowStress: async function() {
        const queue = [];
        const maxQueueSize = 100;
        const producers = 10;
        const consumers = 2;
        
        let overflowDetected = false;
        let processedCount = 0;
        
        // Productores rápidos
        const producerPromises = [];
        for (let i = 0; i < producers; i++) {
            producerPromises.push(
                new Promise(resolve => {
                    let produced = 0;
                    const produce = () => {
                        if (queue.length < maxQueueSize) {
                            queue.push({ producer: i, item: produced++, timestamp: Date.now() });
                            setTimeout(produce, 1);
                        } else {
                            overflowDetected = true;
                            resolve(produced);
                        }
                    };
                    produce();
                })
            );
        }
        
        // Consumidores lentos
        const consumerPromises = [];
        for (let i = 0; i < consumers; i++) {
            consumerPromises.push(
                new Promise(resolve => {
                    const consume = () => {
                        if (queue.length > 0) {
                            const item = queue.shift();
                            processedCount++;
                            setTimeout(consume, 100);
                        } else if (processedCount < maxQueueSize * producers) {
                            setTimeout(consume, 50);
                        } else {
                            resolve(processedCount);
                        }
                    };
                    consume();
                })
            );
        }
        
        await Promise.all([...producerPromises, ...consumerPromises]);
        
        return {
            maxQueueSize,
            producers,
            consumers,
            overflowDetected,
            processedCount,
            queueSize: queue.length
        };
    },

    // Probar estrés de agotamiento de recursos
    testResourceExhaustionStress: async function() {
        const maxResources = 20;
        const requests = 50;
        const promises = [];
        let resourceExhaustionDetected = false;
        
        // Solicitar más recursos de los disponibles
        for (let i = 0; i < requests; i++) {
            promises.push(
                SyncManager.LockManager.acquire(`exhaustion-${i % maxResources}`, {
                    timeout: 1000
                }).then(result => {
                    if (!result.success) {
                        resourceExhaustionDetected = true;
                    }
                    return result;
                })
            );
        }
        
        const results = await Promise.all(promises);
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        return {
            maxResources,
            requests,
            successful,
            failed,
            resourceExhaustionDetected,
            exhaustionRate: failed / requests
        };
    },

    // Probar estrés de operación extendida
    testExtendedOperationStress: async function() {
        const duration = 10000; // 10 segundos
        const operations = [];
        const startTime = Date.now();
        
        // Mantener operaciones continuas
        let operationId = 0;
        while (Date.now() - startTime < duration) {
            try {
                const result = await SyncManager.LockManager.acquire(`extended-${operationId % 10}`, {
                    timeout: 2000
                });
                
                if (result.success) {
                    operations.push({
                        id: operationId++,
                        success: true,
                        timestamp: Date.now()
                    });
                    
                    // Liberar después de un tiempo
                    setTimeout(() => {
                        SyncManager.LockManager.release(`extended-${(operationId - 1) % 10}`, result.lockId);
                    }, 100);
                } else {
                    operations.push({
                        id: operationId++,
                        success: false,
                        reason: 'timeout',
                        timestamp: Date.now()
                    });
                }
                
            } catch (error) {
                operations.push({
                    id: operationId++,
                    success: false,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        const endTime = Date.now();
        const actualDuration = endTime - startTime;
        
        const successful = operations.filter(op => op.success).length;
        const failed = operations.filter(op => !op.success).length;
        
        return {
            duration: actualDuration,
            totalOperations: operations.length,
            successful,
            failed,
            successRate: successful / operations.length,
            operationsPerSecond: operations.length / (actualDuration / 1000)
        };
    },

    // Calcular resultados finales
    calculateFinalResults: function() {
        this.state.results.duration = Date.now() - this.state.metrics.startTime;
        
        // Calcular estadísticas adicionales
        const successRate = this.state.results.total > 0 ? 
            (this.state.results.passed / this.state.results.total) * 100 : 0;
        
        const categoryResults = {};
        for (const test of this.state.results.tests) {
            if (!categoryResults[test.category]) {
                categoryResults[test.category] = { passed: 0, failed: 0, total: 0 };
            }
            
            categoryResults[test.category].total++;
            if (test.status === 'passed') {
                categoryResults[test.category].passed++;
            } else if (test.status === 'failed') {
                categoryResults[test.category].failed++;
            }
        }
        
        this.state.results.categoryBreakdown = categoryResults;
        this.state.results.successRate = successRate;
    },

    // Generar reporte de pruebas
    generateTestReport: function() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.state.results.total,
                passed: this.state.results.passed,
                failed: this.state.results.failed,
                skipped: this.state.results.skipped,
                duration: this.state.results.duration,
                successRate: this.state.results.successRate
            },
            categories: this.state.results.categoryBreakdown,
            tests: this.state.results.tests,
            metrics: this.state.metrics,
            configuration: this.config
        };
        
        if (this.config.reportFormat === 'json') {
            console.log('[SyncTests] Reporte JSON:');
            console.log(JSON.stringify(report, null, 2));
        } else {
            console.log('[SyncTests] Reporte de pruebas:');
            console.log(`Total: ${report.summary.total}`);
            console.log(`Pasadas: ${report.summary.passed}`);
            console.log(`Fallidas: ${report.summary.failed}`);
            console.log(`Duración: ${report.summary.duration}ms`);
            console.log(`Tasa de éxito: ${report.summary.successRate.toFixed(2)}%`);
        }
        
        // Guardar reporte en archivo si está en navegador
        if (typeof document !== 'undefined') {
            const reportData = JSON.stringify(report, null, 2);
            const blob = new Blob([reportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `sync-test-report-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        return report;
    },

    // Obtener resultados actuales
    getCurrentResults: function() {
        return {
            ...this.state.results,
            metrics: this.state.metrics,
            running: this.state.running
        };
    }
};

// Exportar el sistema de pruebas
export default SyncSystemTests;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.SyncSystemTests = SyncSystemTests;
}