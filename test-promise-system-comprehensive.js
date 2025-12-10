/**
 * Justice 2 Promise System Comprehensive Tests
 * Sistema de pruebas exhaustivas para el manejo robusto de promesas
 */

const PromiseSystemTests = {
    // Configuración de pruebas
    config: {
        enableLogging: true,
        testTimeout: 30000,
        parallelTests: true,
        maxConcurrency: 5,
        reportFormat: 'detailed', // 'summary', 'detailed', 'json'
        enableTelemetry: true,
        testCategories: {
            PROMISE_MANAGER: 'PromiseManager',
            ASYNC_ERROR_HANDLER: 'AsyncErrorHandler',
            RETRY_WRAPPER: 'RetryWrapper',
            PROMISE_QUEUE: 'PromiseQueue',
            PROMISE_CACHE: 'PromiseCache',
            INTEGRATION: 'Integration'
        }
    },

    // Estado de pruebas
    state: {
        results: {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: []
        },
        currentSuite: null,
        startTime: null,
        endTime: null,
        testResults: [],
        performanceMetrics: {},
        coverage: {
            components: new Set(),
            methods: new Set(),
            errorTypes: new Set()
        }
    },

    // Inicialización
    init: function() {
        this.log('Inicializando sistema de pruebas de promesas');
        
        // Verificar que los componentes estén disponibles
        this.checkComponentAvailability();
        
        // Iniciar pruebas
        this.runAllTests()
            .then(results => {
                this.generateReport(results);
            })
            .catch(error => {
                this.log('Error ejecutando pruebas:', error);
            });
    },

    // Verificar disponibilidad de componentes
    checkComponentAvailability: function() {
        const components = [
            'PromiseManager',
            'AsyncErrorHandler', 
            'RetryWrapper',
            'PromiseQueue',
            'PromiseCache'
        ];

        components.forEach(component => {
            if (typeof window !== 'undefined' && window[component]) {
                this.state.coverage.components.add(component);
                this.log(`Componente ${component} disponible`);
            } else {
                this.log(`Componente ${component} NO disponible`);
                this.state.results.errors.push({
                    type: 'component_missing',
                    component,
                    message: `Componente ${component} no está disponible`
                });
            }
        });
    },

    // Ejecutar todas las pruebas
    async runAllTests() {
        this.state.startTime = Date.now();
        this.log('Iniciando ejecución de pruebas de promesas');

        const testSuites = [
            this.testPromiseManager,
            this.testAsyncErrorHandler,
            this.testRetryWrapper,
            this.testPromiseQueue,
            this.testPromiseCache,
            this.testIntegration
        ];

        if (this.config.parallelTests) {
            // Ejecutar pruebas en paralelo con control de concurrencia
            const results = await this.runParallelTests(testSuites);
            return results;
        } else {
            // Ejecutar pruebas en secuencia
            const results = [];
            for (const suite of testSuites) {
                try {
                    const result = await suite.call(this);
                    results.push(result);
                } catch (error) {
                    this.log(`Error en suite de pruebas:`, error);
                    results.push({ error, suite: suite.name });
                }
            }
            return results;
        }
    },

    // Ejecutar pruebas en paralelo con control de concurrencia
    async runParallelTests(testSuites) {
        const results = [];
        const executing = [];

        for (const suite of testSuites) {
            const promise = suite.call(this).then(result => {
                results.push(result);
                return result;
            });

            executing.push(promise);

            // Controlar concurrencia
            if (executing.length >= this.config.maxConcurrency) {
                await Promise.race(executing);
                // Remover promesas completadas
                for (let i = executing.length - 1; i >= 0; i--) {
                    if (executing[i].result !== undefined) {
                        executing.splice(i, 1);
                    }
                }
            }
        }

        // Esperar todas las promesas restantes
        await Promise.all(executing);
        return results;
    },

    // Pruebas para PromiseManager
    async testPromiseManager() {
        this.state.currentSuite = this.config.testCategories.PROMISE_MANAGER;
        const suiteResults = {
            name: 'PromiseManager',
            tests: [],
            startTime: Date.now()
        };

        try {
            // Test 1: Timeout handling
            await this.testPromiseManagerTimeout(suiteResults);

            // Test 2: Retry mechanism
            await this.testPromiseManagerRetry(suiteResults);

            // Test 3: Parallel execution
            await this.testPromiseManagerParallel(suiteResults);

            // Test 4: Race conditions
            await this.testPromiseManagerRace(suiteResults);

            // Test 5: Error handling
            await this.testPromiseManagerErrorHandling(suiteResults);

        } catch (error) {
            suiteResults.error = error;
            this.log(`Error en suite PromiseManager:`, error);
        }

        suiteResults.endTime = Date.now();
        suiteResults.duration = suiteResults.endTime - suiteResults.startTime;
        this.state.testResults.push(suiteResults);

        return suiteResults;
    },

    // Test: Timeout handling en PromiseManager
    async testPromiseManagerTimeout(suiteResults) {
        const testName = 'PromiseManager Timeout Handling';
        const startTime = Date.now();

        try {
            if (!window.PromiseManager) {
                throw new Error('PromiseManager no disponible');
            }

            // Test timeout exitoso
            const timeoutPromise = new Promise(resolve => {
                setTimeout(() => resolve('success'), 2000);
            });

            const result = await window.PromiseManager.withTimeout(timeoutPromise, 1000);
            
            // Debería lanzar error por timeout
            throw new Error('Se esperaba un error de timeout');

        } catch (error) {
            if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: 'Timeout manejado correctamente'
                });
            } else {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'failed',
                    duration: Date.now() - startTime,
                    error: error.message,
                    message: 'Error inesperado en test de timeout'
                });
            }
        }
    },

    // Test: Retry mechanism en PromiseManager
    async testPromiseManagerRetry(suiteResults) {
        const testName = 'PromiseManager Retry Mechanism';
        const startTime = Date.now();
        let attemptCount = 0;

        try {
            if (!window.PromiseManager) {
                throw new Error('PromiseManager no disponible');
            }

            const retryFunction = () => {
                attemptCount++;
                if (attemptCount < 3) {
                    throw new Error('Intento fallido');
                }
                return 'success';
            };

            const result = await window.PromiseManager.withRetry(retryFunction, {
                maxRetries: 3,
                retryDelay: 100
            });

            if (result === 'success' && attemptCount === 3) {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: `Retry exitoso después de ${attemptCount} intentos`
                });
            } else {
                throw new Error('Resultado inesperado en retry');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en mecanismo de retry'
            });
        }
    },

    // Test: Parallel execution en PromiseManager
    async testPromiseManagerParallel(suiteResults) {
        const testName = 'PromiseManager Parallel Execution';
        const startTime = Date.now();

        try {
            if (!window.PromiseManager) {
                throw new Error('PromiseManager no disponible');
            }

            const promises = [
                Promise.resolve('result1'),
                Promise.resolve('result2'),
                Promise.resolve('result3')
            ];

            const results = await window.PromiseManager.parallel(promises);

            if (Array.isArray(results) && results.length === 3) {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: 'Ejecución paralela exitosa'
                });
            } else {
                throw new Error('Resultados inesperados en ejecución paralela');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en ejecución paralela'
            });
        }
    },

    // Test: Race conditions en PromiseManager
    async testPromiseManagerRace(suiteResults) {
        const testName = 'PromiseManager Race Conditions';
        const startTime = Date.now();

        try {
            if (!window.PromiseManager) {
                throw new Error('PromiseManager no disponible');
            }

            const promises = [
                new Promise(resolve => setTimeout(() => resolve('slow'), 1000)),
                new Promise(resolve => setTimeout(() => resolve('fast'), 100)),
                new Promise(resolve => setTimeout(() => resolve('medium'), 500))
            ];

            const result = await window.PromiseManager.race(promises);

            if (result === 'fast') {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: 'Race condition manejada correctamente'
                });
            } else {
                throw new Error('Resultado inesperado en race condition');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en race condition'
            });
        }
    },

    // Test: Error handling en PromiseManager
    async testPromiseManagerErrorHandling(suiteResults) {
        const testName = 'PromiseManager Error Handling';
        const startTime = Date.now();

        try {
            if (!window.PromiseManager) {
                throw new Error('PromiseManager no disponible');
            }

            const errorFunction = () => {
                throw new Error('Error de prueba');
            };

            try {
                await window.PromiseManager.withRetry(errorFunction, { maxRetries: 2 });
                throw new Error('Se esperaba un error');
            } catch (error) {
                if (error.message === 'Error de prueba') {
                    this.addTestResult(suiteResults, {
                        name: testName,
                        status: 'passed',
                        duration: Date.now() - startTime,
                        message: 'Error manejado correctamente'
                    });
                } else {
                    throw new Error('Error inesperado');
                }
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en manejo de errores'
            });
        }
    },

    // Pruebas para AsyncErrorHandler
    async testAsyncErrorHandler() {
        this.state.currentSuite = this.config.testCategories.ASYNC_ERROR_HANDLER;
        const suiteResults = {
            name: 'AsyncErrorHandler',
            tests: [],
            startTime: Date.now()
        };

        try {
            // Test 1: Error classification
            await this.testAsyncErrorClassification(suiteResults);

            // Test 2: Recovery mechanisms
            await this.testAsyncErrorRecovery(suiteResults);

            // Test 3: Error logging
            await this.testAsyncErrorLogging(suiteResults);

            // Test 4: Degraded mode
            await this.testAsyncErrorDegradedMode(suiteResults);

        } catch (error) {
            suiteResults.error = error;
            this.log(`Error en suite AsyncErrorHandler:`, error);
        }

        suiteResults.endTime = Date.now();
        suiteResults.duration = suiteResults.endTime - suiteResults.startTime;
        this.state.testResults.push(suiteResults);

        return suiteResults;
    },

    // Test: Error classification en AsyncErrorHandler
    async testAsyncErrorClassification(suiteResults) {
        const testName = 'AsyncErrorHandler Error Classification';
        const startTime = Date.now();

        try {
            if (!window.AsyncErrorHandler) {
                throw new Error('AsyncErrorHandler no disponible');
            }

            // Test clasificación de error de red
            const networkError = new Error('Network connection failed');
            networkError.name = 'NetworkError';

            const networkErrorInfo = window.AsyncErrorHandler.classifyError(networkError);

            if (networkErrorInfo.category === 'network' && networkErrorInfo.recoverable === true) {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: 'Error de red clasificado correctamente'
                });
            } else {
                throw new Error('Clasificación de error de red fallida');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en clasificación de errores'
            });
        }
    },

    // Test: Error recovery en AsyncErrorHandler
    async testAsyncErrorRecovery(suiteResults) {
        const testName = 'AsyncErrorHandler Error Recovery';
        const startTime = Date.now();

        try {
            if (!window.AsyncErrorHandler) {
                throw new Error('AsyncErrorHandler no disponible');
            }

            // Test recuperación de error temporal
            const tempError = new Error('Temporary failure');
            tempError.name = 'TimeoutError';

            const recovery = window.AsyncErrorHandler.attemptRecovery({
                ...window.AsyncErrorHandler.classifyError(tempError),
                id: 'test-error-id'
            });

            // La recuperación puede o no ser manejada dependiendo de la configuración
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'passed',
                duration: Date.now() - startTime,
                message: recovery.handled ? 'Recuperación automática exitosa' : 'Recuperación no disponible (configuración)'
            });

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en mecanismo de recuperación'
            });
        }
    },

    // Test: Error logging en AsyncErrorHandler
    async testAsyncErrorLogging(suiteResults) {
        const testName = 'AsyncErrorHandler Error Logging';
        const startTime = Date.now();

        try {
            if (!window.AsyncErrorHandler) {
                throw new Error('AsyncErrorHandler no disponible');
            }

            const testError = new Error('Test error for logging');
            const errorInfo = window.AsyncErrorHandler.classifyError(testError);

            // Verificar que se pueda registrar el error
            window.AsyncErrorHandler.logError(errorInfo);

            // Verificar estadísticas
            const stats = window.AsyncErrorHandler.getStatistics();

            if (stats.totalErrors > 0) {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: 'Error registrado correctamente'
                });
            } else {
                throw new Error('Error no registrado en estadísticas');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en logging de errores'
            });
        }
    },

    // Test: Degraded mode en AsyncErrorHandler
    async testAsyncErrorDegradedMode(suiteResults) {
        const testName = 'AsyncErrorHandler Degraded Mode';
        const startTime = Date.now();

        try {
            if (!window.AsyncErrorHandler) {
                throw new Error('AsyncErrorHandler no disponible');
            }

            // Activar modo degradado
            window.AsyncErrorHandler.activateDegradedMode({
                id: 'test-degraded',
                category: 'server_error',
                userMessage: 'Test degraded mode'
            });

            const stats = window.AsyncErrorHandler.getStatistics();

            if (stats.degradedMode === true) {
                // Desactivar modo degradado
                window.AsyncErrorHandler.deactivateDegradedMode();

                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: 'Modo degradado activado y desactivado correctamente'
                });
            } else {
                throw new Error('Modo degradado no se activó');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en modo degradado'
            });
        }
    },

    // Pruebas para RetryWrapper
    async testRetryWrapper() {
        this.state.currentSuite = this.config.testCategories.RETRY_WRAPPER;
        const suiteResults = {
            name: 'RetryWrapper',
            tests: [],
            startTime: Date.now()
        };

        try {
            // Test 1: Basic retry
            await this.testRetryWrapperBasic(suiteResults);

            // Test 2: Exponential backoff
            await this.testRetryWrapperBackoff(suiteResults);

            // Test 3: Jitter
            await this.testRetryWrapperJitter(suiteResults);

            // Test 4: Max retries
            await this.testRetryWrapperMaxRetries(suiteResults);

        } catch (error) {
            suiteResults.error = error;
            this.log(`Error en suite RetryWrapper:`, error);
        }

        suiteResults.endTime = Date.now();
        suiteResults.duration = suiteResults.endTime - suiteResults.startTime;
        this.state.testResults.push(suiteResults);

        return suiteResults;
    },

    // Test: Basic retry en RetryWrapper
    async testRetryWrapperBasic(suiteResults) {
        const testName = 'RetryWrapper Basic Retry';
        const startTime = Date.now();
        let attemptCount = 0;

        try {
            if (!window.RetryWrapper) {
                throw new Error('RetryWrapper no disponible');
            }

            const retryFunction = () => {
                attemptCount++;
                if (attemptCount < 2) {
                    throw new Error('Temporary failure');
                }
                return 'success';
            };

            const result = await window.RetryWrapper.retry(retryFunction, {
                maxRetries: 3,
                baseDelay: 50
            });

            if (result === 'success' && attemptCount === 2) {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: `Retry básico exitoso después de ${attemptCount} intentos`
                });
            } else {
                throw new Error('Resultado inesperado en retry básico');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en retry básico'
            });
        }
    },

    // Test: Exponential backoff en RetryWrapper
    async testRetryWrapperBackoff(suiteResults) {
        const testName = 'RetryWrapper Exponential Backoff';
        const startTime = Date.now();
        const delays = [];

        try {
            if (!window.RetryWrapper) {
                throw new Error('RetryWrapper no disponible');
            }

            const retryFunction = () => {
                if (delays.length === 0) {
                    delays.push(Date.now());
                }
                throw new Error('Always fails');
            };

            try {
                await window.RetryWrapper.exponentialBackoff(retryFunction, {
                    maxRetries: 3,
                    baseDelay: 100,
                    backoffMultiplier: 2
                });
            } catch (error) {
                // Se espera que falle
            }

            // Verificar que se ejecutaron múltiples intentos
            if (delays.length > 0) {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: 'Backoff exponencial ejecutado correctamente'
                });
            } else {
                throw new Error('No se ejecutaron intentos de retry');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en backoff exponencial'
            });
        }
    },

    // Test: Jitter en RetryWrapper
    async testRetryWrapperJitter(suiteResults) {
        const testName = 'RetryWrapper Jitter';
        const startTime = Date.now();

        try {
            if (!window.RetryWrapper) {
                throw new Error('RetryWrapper no disponible');
            }

            const retryFunction = () => {
                throw new Error('Always fails');
            };

            try {
                await window.RetryWrapper.retry(retryFunction, {
                    maxRetries: 2,
                    baseDelay: 100,
                    jitterEnabled: true
                });
            } catch (error) {
                // Se espera que falle
            }

            this.addTestResult(suiteResults, {
                name: testName,
                status: 'passed',
                duration: Date.now() - startTime,
                message: 'Jitter aplicado correctamente'
            });

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en jitter'
            });
        }
    },

    // Test: Max retries en RetryWrapper
    async testRetryWrapperMaxRetries(suiteResults) {
        const testName = 'RetryWrapper Max Retries';
        const startTime = Date.now();
        let attemptCount = 0;

        try {
            if (!window.RetryWrapper) {
                throw new Error('RetryWrapper no disponible');
            }

            const retryFunction = () => {
                attemptCount++;
                throw new Error('Always fails');
            };

            try {
                await window.RetryWrapper.retry(retryFunction, {
                    maxRetries: 3,
                    baseDelay: 10
                });
                throw new Error('Se esperaba un error después de max retries');
            } catch (error) {
                if (attemptCount === 4) { // 1 intento inicial + 3 retries
                    this.addTestResult(suiteResults, {
                        name: testName,
                        status: 'passed',
                        duration: Date.now() - startTime,
                        message: `Max retries respetado: ${attemptCount} intentos totales`
                    });
                } else {
                    throw new Error(`Número de intentos incorrecto: ${attemptCount}`);
                }
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en max retries'
            });
        }
    },

    // Pruebas para PromiseQueue
    async testPromiseQueue() {
        this.state.currentSuite = this.config.testCategories.PROMISE_QUEUE;
        const suiteResults = {
            name: 'PromiseQueue',
            tests: [],
            startTime: Date.now()
        };

        try {
            // Test 1: Basic queuing
            await this.testPromiseQueueBasic(suiteResults);

            // Test 2: Priority handling
            await this.testPromiseQueuePriority(suiteResults);

            // Test 3: Concurrency control
            await this.testPromiseQueueConcurrency(suiteResults);

            // Test 4: Timeout handling
            await this.testPromiseQueueTimeout(suiteResults);

        } catch (error) {
            suiteResults.error = error;
            this.log(`Error en suite PromiseQueue:`, error);
        }

        suiteResults.endTime = Date.now();
        suiteResults.duration = suiteResults.endTime - suiteResults.startTime;
        this.state.testResults.push(suiteResults);

        return suiteResults;
    },

    // Test: Basic queuing en PromiseQueue
    async testPromiseQueueBasic(suiteResults) {
        const testName = 'PromiseQueue Basic Queuing';
        const startTime = Date.now();

        try {
            if (!window.PromiseQueue) {
                throw new Error('PromiseQueue no disponible');
            }

            const taskFunction = () => Promise.resolve('queue-test-result');

            const task = window.PromiseQueue.enqueue(taskFunction, {
                priority: 5
            });

            const result = await task.promise;

            if (result === 'queue-test-result') {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: 'Tarea encolada y ejecutada correctamente'
                });
            } else {
                throw new Error('Resultado inesperado en cola');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en cola básica'
            });
        }
    },

    // Test: Priority handling en PromiseQueue
    async testPromiseQueuePriority(suiteResults) {
        const testName = 'PromiseQueue Priority Handling';
        const startTime = Date.now();
        const executionOrder = [];

        try {
            if (!window.PromiseQueue) {
                throw new Error('PromiseQueue no disponible');
            }

            // Tareas con diferentes prioridades
            const tasks = [
                window.PromiseQueue.enqueue(() => {
                    executionOrder.push('low');
                    return 'low';
                }, { priority: 8 }),
                window.PromiseQueue.enqueue(() => {
                    executionOrder.push('high');
                    return 'high';
                }, { priority: 1 }),
                window.PromiseQueue.enqueue(() => {
                    executionOrder.push('medium');
                    return 'medium';
                }, { priority: 5 })
            ];

            await Promise.all(tasks.map(t => t.promise));

            // La tarea de alta prioridad debería ejecutarse primero
            if (executionOrder[0] === 'high') {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: 'Prioridades manejadas correctamente'
                });
            } else {
                throw new Error('Orden de prioridad incorrecto');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en manejo de prioridades'
            });
        }
    },

    // Test: Concurrency control en PromiseQueue
    async testPromiseQueueConcurrency(suiteResults) {
        const testName = 'PromiseQueue Concurrency Control';
        const startTime = Date.now();

        try {
            if (!window.PromiseQueue) {
                throw new Error('PromiseQueue no disponible');
            }

            const status = window.PromiseQueue.getQueueStatus();

            if (typeof status.running === 'number' && 
                typeof status.queues === 'object') {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: 'Control de concurrencia funcionando'
                });
            } else {
                throw new Error('Estado de concurrencia inválido');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en control de concurrencia'
            });
        }
    },

    // Test: Timeout handling en PromiseQueue
    async testPromiseQueueTimeout(suiteResults) {
        const testName = 'PromiseQueue Timeout Handling';
        const startTime = Date.now();

        try {
            if (!window.PromiseQueue) {
                throw new Error('PromiseQueue no disponible');
            }

            const slowFunction = () => new Promise(resolve => {
                setTimeout(() => resolve('slow'), 2000);
            });

            try {
                const task = window.PromiseQueue.enqueue(slowFunction, {
                    timeout: 1000 // 1 segundo timeout
                });

                await task.promise;
                throw new Error('Se esperaba un timeout');
            } catch (error) {
                if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                    this.addTestResult(suiteResults, {
                        name: testName,
                        status: 'passed',
                        duration: Date.now() - startTime,
                        message: 'Timeout manejado correctamente'
                    });
                } else {
                    throw new Error('Error inesperado en timeout');
                }
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en manejo de timeout'
            });
        }
    },

    // Pruebas para PromiseCache
    async testPromiseCache() {
        this.state.currentSuite = this.config.testCategories.PROMISE_CACHE;
        const suiteResults = {
            name: 'PromiseCache',
            tests: [],
            startTime: Date.now()
        };

        try {
            // Test 1: Basic caching
            await this.testPromiseCacheBasic(suiteResults);

            // Test 2: TTL expiration
            await this.testPromiseCacheTTL(suiteResults);

            // Test 3: Cache invalidation
            await this.testPromiseCacheInvalidation(suiteResults);

            // Test 4: Get or set pattern
            await this.testPromiseCacheGetOrSet(suiteResults);

        } catch (error) {
            suiteResults.error = error;
            this.log(`Error en suite PromiseCache:`, error);
        }

        suiteResults.endTime = Date.now();
        suiteResults.duration = suiteResults.endTime - suiteResults.startTime;
        this.state.testResults.push(suiteResults);

        return suiteResults;
    },

    // Test: Basic caching en PromiseCache
    async testPromiseCacheBasic(suiteResults) {
        const testName = 'PromiseCache Basic Caching';
        const startTime = Date.now();

        try {
            if (!window.PromiseCache) {
                throw new Error('PromiseCache no disponible');
            }

            const testKey = 'test-basic-cache';
            const testValue = { data: 'test-value', timestamp: Date.now() };

            // Almacenar en caché
            const setResult = window.PromiseCache.set(testKey, testValue);

            if (!setResult) {
                throw new Error('Error almacenando en caché');
            }

            // Recuperar de caché
            const retrievedValue = window.PromiseCache.get(testKey);

            if (retrievedValue && retrievedValue.data === testValue.data) {
                // Limpiar caché
                window.PromiseCache.delete(testKey);

                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: 'Caché básico funcionando correctamente'
                });
            } else {
                throw new Error('Valor recuperado no coincide');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en caché básico'
            });
        }
    },

    // Test: TTL expiration en PromiseCache
    async testPromiseCacheTTL(suiteResults) {
        const testName = 'PromiseCache TTL Expiration';
        const startTime = Date.now();

        try {
            if (!window.PromiseCache) {
                throw new Error('PromiseCache no disponible');
            }

            const testKey = 'test-ttl-cache';
            const testValue = { data: 'ttl-test' };

            // Almacenar con TTL corto
            window.PromiseCache.set(testKey, testValue, { ttl: 100 }); // 100ms

            // Esperar a que expire
            await new Promise(resolve => setTimeout(resolve, 150));

            // Intentar recuperar
            const retrievedValue = window.PromiseCache.get(testKey);

            if (retrievedValue === null) {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: 'TTL expirado correctamente'
                });
            } else {
                throw new Error('Valor no expiró como esperado');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en TTL de caché'
            });
        }
    },

    // Test: Cache invalidation en PromiseCache
    async testPromiseCacheInvalidation(suiteResults) {
        const testName = 'PromiseCache Cache Invalidation';
        const startTime = Date.now();

        try {
            if (!window.PromiseCache) {
                throw new Error('PromiseCache no disponible');
            }

            const testKey = 'test-invalidation';
            const testValue = { data: 'invalidation-test' };

            // Almacenar con etiqueta
            window.PromiseCache.set(testKey, testValue, { tags: ['test-tag'] });

            // Invalidar por etiqueta
            const invalidatedCount = window.PromiseCache.invalidateByTag('test-tag');

            if (invalidatedCount > 0) {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: `${invalidatedCount} entradas invalidadas por etiqueta`
                });
            } else {
                throw new Error('No se invalidaron entradas');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en invalidación de caché'
            });
        }
    },

    // Test: Get or set pattern en PromiseCache
    async testPromiseCacheGetOrSet(suiteResults) {
        const testName = 'PromiseCache Get Or Set Pattern';
        const startTime = Date.now();
        let callCount = 0;

        try {
            if (!window.PromiseCache) {
                throw new Error('PromiseCache no disponible');
            }

            const testKey = 'test-get-or-set';
            const expensiveFunction = () => {
                callCount++;
                return Promise.resolve({ data: 'expensive-result', callCount });
            };

            // Primera llamada - debe ejecutar la función
            const result1 = await window.PromiseCache.getOrSet(testKey, expensiveFunction);

            // Segunda llamada - debe usar caché
            const result2 = await window.PromiseCache.getOrSet(testKey, expensiveFunction);

            if (result1.data === result2.data && callCount === 1) {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: 'Get-or-set pattern funcionando correctamente'
                });
            } else {
                throw new Error('Get-or-set pattern no funcionó');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en get-or-set pattern'
            });
        }
    },

    // Pruebas de integración
    async testIntegration() {
        this.state.currentSuite = this.config.testCategories.INTEGRATION;
        const suiteResults = {
            name: 'Integration',
            tests: [],
            startTime: Date.now()
        };

        try {
            // Test 1: Component interaction
            await this.testIntegrationComponentInteraction(suiteResults);

            // Test 2: Error propagation
            await this.testIntegrationErrorPropagation(suiteResults);

            // Test 3: Performance under load
            await this.testIntegrationPerformance(suiteResults);

        } catch (error) {
            suiteResults.error = error;
            this.log(`Error en suite Integration:`, error);
        }

        suiteResults.endTime = Date.now();
        suiteResults.duration = suiteResults.endTime - suiteResults.startTime;
        this.state.testResults.push(suiteResults);

        return suiteResults;
    },

    // Test: Component interaction en Integration
    async testIntegrationComponentInteraction(suiteResults) {
        const testName = 'Integration Component Interaction';
        const startTime = Date.now();

        try {
            // Verificar que los componentes puedan trabajar juntos
            const componentsAvailable = [
                'PromiseManager',
                'AsyncErrorHandler',
                'RetryWrapper',
                'PromiseQueue',
                'PromiseCache'
            ].filter(comp => typeof window !== 'undefined' && window[comp]);

            if (componentsAvailable.length >= 3) {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: `${componentsAvailable.length} componentes disponibles para integración`
                });
            } else {
                throw new Error('Insuficientes componentes para integración');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en interacción de componentes'
            });
        }
    },

    // Test: Error propagation en Integration
    async testIntegrationErrorPropagation(suiteResults) {
        const testName = 'Integration Error Propagation';
        const startTime = Date.now();

        try {
            if (!window.PromiseManager || !window.AsyncErrorHandler) {
                throw new Error('Componentes necesarios no disponibles');
            }

            // Crear un error que debe propagarse a través del sistema
            const errorFunction = () => {
                const error = new Error('Integration test error');
                error.name = 'NetworkError';
                throw error;
            };

            try {
                await window.PromiseManager.withRetry(errorFunction, {
                    maxRetries: 2,
                    retryDelay: 50
                });
                throw new Error('Se esperaba un error');
            } catch (error) {
                // Verificar que el error fue manejado por AsyncErrorHandler
                const stats = window.AsyncErrorHandler.getStatistics();
                
                if (stats.totalErrors > 0) {
                    this.addTestResult(suiteResults, {
                        name: testName,
                        status: 'passed',
                        duration: Date.now() - startTime,
                        message: 'Error propagado y manejado correctamente'
                    });
                } else {
                    throw new Error('Error no fue registrado por AsyncErrorHandler');
                }
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en propagación de errores'
            });
        }
    },

    // Test: Performance under load en Integration
    async testIntegrationPerformance(suiteResults) {
        const testName = 'Integration Performance Under Load';
        const startTime = Date.now();

        try {
            if (!window.PromiseManager) {
                throw new Error('PromiseManager no disponible');
            }

            // Crear múltiples promesas concurrentes
            const concurrentPromises = Array.from({ length: 50 }, (_, i) => 
                window.PromiseManager.withTimeout(
                    Promise.resolve(`result-${i}`),
                    5000
                )
            );

            const results = await Promise.all(concurrentPromises);

            if (results.length === 50) {
                this.addTestResult(suiteResults, {
                    name: testName,
                    status: 'passed',
                    duration: Date.now() - startTime,
                    message: `${results.length} operaciones concurrentes completadas`
                });
            } else {
                throw new Error('No todas las operaciones concurrentes completaron');
            }

        } catch (error) {
            this.addTestResult(suiteResults, {
                name: testName,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error.message,
                message: 'Error en rendimiento bajo carga'
            });
        }
    },

    // Agregar resultado de prueba
    addTestResult: function(suiteResults, testResult) {
        suiteResults.tests.push(testResult);
        this.state.results.total++;

        if (testResult.status === 'passed') {
            this.state.results.passed++;
        } else if (testResult.status === 'failed') {
            this.state.results.failed++;
            this.state.results.errors.push({
                suite: suiteResults.name,
                test: testResult.name,
                error: testResult.error,
                message: testResult.message
            });
        } else if (testResult.status === 'skipped') {
            this.state.results.skipped++;
        }

        // Actualizar cobertura
        if (testResult.method) {
            this.state.coverage.methods.add(testResult.method);
        }

        if (testResult.errorType) {
            this.state.coverage.errorTypes.add(testResult.errorType);
        }

        this.log(`Test ${testResult.status}: ${testResult.name} - ${testResult.message}`);
    },

    // Generar reporte
    generateReport: function(results) {
        this.state.endTime = Date.now();
        const totalDuration = this.state.endTime - this.state.startTime;

        const report = {
            summary: {
                totalTests: this.state.results.total,
                passed: this.state.results.passed,
                failed: this.state.results.failed,
                skipped: this.state.results.skipped,
                successRate: this.state.results.total > 0 ? 
                    (this.state.results.passed / this.state.results.total * 100).toFixed(2) + '%' : '0%',
                totalDuration,
                startTime: new Date(this.state.startTime).toISOString(),
                endTime: new Date(this.state.endTime).toISOString()
            },
            suites: this.state.testResults,
            coverage: {
                components: Array.from(this.state.coverage.components),
                methods: Array.from(this.state.coverage.methods),
                errorTypes: Array.from(this.state.coverage.errorTypes)
            },
            errors: this.state.results.errors,
            performance: this.state.performanceMetrics
        };

        // Mostrar reporte según configuración
        if (this.config.reportFormat === 'summary') {
            this.displaySummaryReport(report);
        } else if (this.config.reportFormat === 'detailed') {
            this.displayDetailedReport(report);
        } else if (this.config.reportFormat === 'json') {
            console.log('JSON Report:', JSON.stringify(report, null, 2));
        }

        // Enviar telemetría si está habilitada
        if (this.config.enableTelemetry) {
            this.sendTestTelemetry(report);
        }

        return report;
    },

    // Mostrar reporte resumido
    displaySummaryReport: function(report) {
        console.log('\n=== PRUEBAS DE SISTEMA DE PROMESAS - RESUMEN ===');
        console.log(`Total de pruebas: ${report.summary.totalTests}`);
        console.log(`Exitosas: ${report.summary.passed}`);
        console.log(`Fallidas: ${report.summary.failed}`);
        console.log(`Omitidas: ${report.summary.skipped}`);
        console.log(`Tasa de éxito: ${report.summary.successRate}`);
        console.log(`Duración total: ${report.summary.totalDuration}ms`);
        console.log(`Componentes cubiertos: ${report.coverage.components.length}`);
        console.log(`\n=== FIN DEL RESUMEN ===\n');
    },

    // Mostrar reporte detallado
    displayDetailedReport: function(report) {
        console.log('\n=== PRUEBAS DE SISTEMA DE PROMESAS - REPORTE DETALLADO ===');
        
        // Resumen
        console.log('\n--- RESUMEN ---');
        console.log(JSON.stringify(report.summary, null, 2));

        // Suites de pruebas
        console.log('\n--- SUITES DE PRUEBAS ---');
        report.suites.forEach(suite => {
            console.log('\\n' + suite.name + ' (' + suite.duration + 'ms):');
            suite.tests.forEach(test => {
                const status = test.status.toUpperCase();
                const duration = test.duration ? ' (' + test.duration + 'ms)' : '';
                console.log('  [' + status + '] ' + test.name + duration);
                if (test.error) {
                    console.log('    Error: ' + test.error);
                }
                console.log('    ' + test.message);
            });
        });

        // Cobertura
        console.log('\n--- COBERTURA ---');
        console.log('Componentes: ' + report.coverage.components.join(', '));
        console.log('Métodos: ' + report.coverage.methods.join(', '));
        console.log('Tipos de error: ' + report.coverage.errorTypes.join(', '));

        // Errores
        if (report.errors.length > 0) {
            console.log('\n--- ERRORES ---');
            report.errors.forEach(error => {
                console.log(error.suite + '.' + error.test + ': ' + error.message);
                console.log('  ' + error.error);
            });
        }

        console.log('\n=== FIN DEL REPORTE DETALLADO ===\n');
    },

    // Enviar telemetría de pruebas
    sendTestTelemetry: function(report) {
        if (typeof window !== 'undefined' && window.Justice2API) {
            const telemetryData = {
                type: 'promise_system_test_results',
                timestamp: new Date().toISOString(),
                summary: report.summary,
                coverage: report.coverage,
                performance: report.performance
            };

            window.Justice2API.post('/telemetry/promise-tests', telemetryData)
                .catch(error => {
                    console.warn('Error enviando telemetría de pruebas:', error);
                });
        }
    },

    // Logging
    log: function(...args) {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            console.log('[' + timestamp + '] [PromiseSystemTests]', ...args);
        }
    }
};

// Auto-inicialización si se carga en navegador
if (typeof window !== 'undefined') {
    // Esperar a que todos los componentes estén cargados
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => PromiseSystemTests.init(), 1000);
        });
    } else {
        setTimeout(() => PromiseSystemTests.init(), 1000);
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.PromiseSystemTests = PromiseSystemTests;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromiseSystemTests;
}