/**
 * Justice 2 Query Optimization System Tests
 * Sistema completo de pruebas para optimización de consultas de base de datos
 */

const QueryOptimizationTests = {
    // Configuración de pruebas
    config: {
        // Configuración de pruebas de rendimiento
        performanceTests: {
            enabled: true,
            iterations: 100,
            warmupIterations: 10,
            concurrency: 10,
            dataSizes: [100, 1000, 10000, 100000],
            queryComplexity: ['simple', 'medium', 'complex', 'very_complex']
        },
        
        // Configuración de pruebas de carga
        loadTests: {
            enabled: true,
            duration: 60000, // 1 minuto
            rampUpTime: 10000, // 10 segundos
            concurrentUsers: [10, 50, 100, 500],
            requestsPerSecond: [10, 50, 100, 500]
        },
        
        // Configuración de pruebas de escalabilidad
        scalabilityTests: {
            enabled: true,
            maxConnections: 100,
            connectionIncrement: 10,
            testDuration: 30000 // 30 segundos
        },
        
        // Configuración de pruebas de concurrencia
        concurrencyTests: {
            enabled: true,
            maxConcurrentQueries: 50,
            queryIncrement: 5,
            testDuration: 20000 // 20 segundos
        },
        
        // Configuración de pruebas de seguridad
        securityTests: {
            enabled: true,
            sqlInjectionTests: true,
            xssTests: true,
            parameterValidationTests: true,
            authenticationTests: true
        },
        
        // Configuración de informes
        reports: {
            generateHtml: true,
            generateJson: true,
            includeCharts: true,
            saveResults: true,
            outputDirectory: './test-results'
        }
    },

    // Estado de las pruebas
    state: {
        running: false,
        currentTest: null,
        results: new Map(),
        startTime: null,
        endTime: null,
        testSuite: null
    },

    // Datos de prueba
    testData: {
        users: [],
        cases: [],
        clients: [],
        documents: [],
        analytics: []
    },

    /**
     * Inicializar el sistema de pruebas
     */
    init: function() {
        console.log('🧪 Inicializando Query Optimization Tests...');
        
        // Crear directorio de resultados si no existe
        this.createOutputDirectory();
        
        // Generar datos de prueba
        this.generateTestData();
        
        // Inicializar componentes de optimización
        this.initializeOptimizationComponents();
        
        console.log('✅ Query Optimization Tests inicializado');
    },

    /**
     * Ejecutar todas las pruebas
     * @returns {Object} Resultados completos
     */
    runAllTests: async function() {
        if (this.state.running) {
            throw new Error('Las pruebas ya están en ejecución');
        }
        
        console.log('🚀 Iniciando suite completa de pruebas de optimización...');
        
        this.state.running = true;
        this.state.startTime = Date.now();
        
        try {
            const results = {
                performance: await this.runPerformanceTests(),
                load: await this.runLoadTests(),
                scalability: await this.runScalabilityTests(),
                concurrency: await this.runConcurrencyTests(),
                security: await this.runSecurityTests(),
                summary: {}
            };
            
            // Generar resumen
            results.summary = this.generateSummary(results);
            
            this.state.endTime = Date.now();
            this.state.running = false;
            
            // Generar informes
            await this.generateReports(results);
            
            console.log('✅ Suite de pruebas completada');
            
            return results;
            
        } catch (error) {
            this.state.running = false;
            console.error('❌ Error en suite de pruebas:', error);
            throw error;
        }
    },

    /**
     * Ejecutar pruebas de rendimiento
     * @returns {Object} Resultados de pruebas de rendimiento
     */
    runPerformanceTests: async function() {
        if (!this.config.performanceTests.enabled) {
            return { skipped: true, reason: 'Performance tests disabled' };
        }
        
        console.log('⚡ Ejecutando pruebas de rendimiento...');
        
        const results = {
            queryPerformance: [],
            cachePerformance: [],
            optimizationPerformance: [],
            summary: {}
        };
        
        // Probar diferentes tipos de consultas
        for (const complexity of this.config.performanceTests.queryComplexity) {
            console.log(`📊 Probando consultas de complejidad: ${complexity}`);
            
            const queryResults = await this.testQueryPerformance(complexity);
            results.queryPerformance.push({
                complexity: complexity,
                ...queryResults
            });
        }
        
        // Probar rendimiento de caché
        console.log('💾 Probando rendimiento de caché...');
        const cacheResults = await this.testCachePerformance();
        results.cachePerformance = cacheResults;
        
        // Probar rendimiento de optimización
        console.log('🔧 Probando rendimiento de optimización...');
        const optimizationResults = await this.testOptimizationPerformance();
        results.optimizationPerformance = optimizationResults;
        
        // Generar resumen de rendimiento
        results.summary = this.generatePerformanceSummary(results);
        
        return results;
    },

    /**
     * Probar rendimiento de consultas
     * @param {string} complexity - Complejidad de la consulta
     * @returns {Object} Resultados de la prueba
     */
    testQueryPerformance: async function(complexity) {
        const queries = this.getTestQueries(complexity);
        const results = {
            queries: [],
            averageTime: 0,
            minTime: Infinity,
            maxTime: 0,
            totalTime: 0,
            successRate: 0
        };
        
        for (const query of queries) {
            console.log(`🔍 Probando consulta: ${query.name}`);
            
            const queryResult = await this.executePerformanceTest(query);
            results.queries.push(queryResult);
            
            // Actualizar estadísticas
            results.totalTime += queryResult.averageTime;
            results.minTime = Math.min(results.minTime, queryResult.averageTime);
            results.maxTime = Math.max(results.maxTime, queryResult.averageTime);
        }
        
        results.averageTime = results.totalTime / results.queries.length;
        results.successRate = (results.queries.filter(q => q.successRate === 100).length / results.queries.length) * 100;
        
        return results;
    },

    /**
     * Ejecutar prueba de rendimiento individual
     * @param {Object} query - Consulta a probar
     * @returns {Object} Resultado de la prueba
     */
    executePerformanceTest: async function(query) {
        const iterations = this.config.performanceTests.iterations;
        const warmupIterations = this.config.performanceTests.warmupIterations;
        const times = [];
        
        // Calentamiento
        for (let i = 0; i < warmupIterations; i++) {
            try {
                await this.executeQuery(query);
            } catch (error) {
                // Ignorar errores de calentamiento
            }
        }
        
        // Pruebas reales
        let successCount = 0;
        for (let i = 0; i < iterations; i++) {
            try {
                const startTime = Date.now();
                await this.executeQuery(query);
                const endTime = Date.now();
                
                times.push(endTime - startTime);
                successCount++;
            } catch (error) {
                console.warn(`⚠️ Error en ejecución ${i}:`, error.message);
            }
        }
        
        // Calcular estadísticas
        const sortedTimes = times.sort((a, b) => a - b);
        const average = times.reduce((sum, time) => sum + time, 0) / times.length;
        const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
        const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
        const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
        
        return {
            name: query.name,
            sql: query.sql,
            params: query.params,
            iterations: iterations,
            successCount: successCount,
            successRate: (successCount / iterations) * 100,
            averageTime: average,
            medianTime: median,
            p95Time: p95,
            p99Time: p99,
            minTime: Math.min(...times),
            maxTime: Math.max(...times),
            standardDeviation: this.calculateStandardDeviation(times, average)
        };
    },

    /**
     * Probar rendimiento de caché
     * @returns {Object} Resultados de prueba de caché
     */
    testCachePerformance: async function() {
        const results = {
            hitRate: 0,
            averageHitTime: 0,
            averageMissTime: 0,
            totalOperations: 0,
            cacheEfficiency: 0
        };
        
        if (typeof QueryCache !== 'undefined') {
            const testQueries = this.getCacheTestQueries();
            const hitTimes = [];
            const missTimes = [];
            
            for (const query of testQueries) {
                // Primera ejecución (miss)
                const missStart = Date.now();
                await this.executeQuery(query);
                const missTime = Date.now() - missStart;
                missTimes.push(missTime);
                
                // Segunda ejecución (hit)
                const hitStart = Date.now();
                await this.executeQuery(query);
                const hitTime = Date.now() - hitStart;
                hitTimes.push(hitTime);
            }
            
            results.totalOperations = testQueries.length * 2;
            results.averageHitTime = hitTimes.reduce((sum, time) => sum + time, 0) / hitTimes.length;
            results.averageMissTime = missTimes.reduce((sum, time) => sum + time, 0) / missTimes.length;
            results.hitRate = (hitTimes.length / (hitTimes.length + missTimes.length)) * 100;
            results.cacheEfficiency = results.averageMissTime > 0 ? 
                (results.averageMissTime - results.averageHitTime) / results.averageMissTime * 100 : 0;
        }
        
        return results;
    },

    /**
     * Probar rendimiento de optimización
     * @returns {Object} Resultados de prueba de optimización
     */
    testOptimizationPerformance: async function() {
        const results = {
            optimizationTime: 0,
            optimizationSuccess: 0,
            performanceImprovement: 0,
            indexRecommendations: 0
        };
        
        if (typeof QueryOptimizer !== 'undefined') {
            const testQueries = this.getOptimizationTestQueries();
            const optimizationTimes = [];
            const improvements = [];
            
            for (const query of testQueries) {
                // Ejecutar sin optimización
                const nonOptimizedStart = Date.now();
                await this.executeQuery(query);
                const nonOptimizedTime = Date.now() - nonOptimizedStart;
                
                // Ejecutar con optimización
                const optimizedStart = Date.now();
                const optimizedQuery = QueryOptimizer.optimizeQuery(query.sql, query.params);
                await this.executeQuery(optimizedQuery);
                const optimizedTime = Date.now() - optimizedStart;
                
                optimizationTimes.push(optimizedQuery.optimizationTime);
                
                if (nonOptimizedTime > 0 && optimizedTime > 0) {
                    const improvement = ((nonOptimizedTime - optimizedTime) / nonOptimizedTime) * 100;
                    improvements.push(improvement);
                }
            }
            
            results.optimizationTime = optimizationTimes.reduce((sum, time) => sum + time, 0) / optimizationTimes.length;
            results.optimizationSuccess = (improvements.filter(imp => imp > 0).length / improvements.length) * 100;
            results.performanceImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
            
            // Obtener recomendaciones de índices
            const stats = QueryOptimizer.collectMetrics();
            results.indexRecommendations = stats.recommendedIndexes ? stats.recommendedIndexes.length : 0;
        }
        
        return results;
    },

    /**
     * Ejecutar pruebas de carga
     * @returns {Object} Resultados de pruebas de carga
     */
    runLoadTests: async function() {
        if (!this.config.loadTests.enabled) {
            return { skipped: true, reason: 'Load tests disabled' };
        }
        
        console.log('🔥 Ejecutando pruebas de carga...');
        
        const results = {
            throughput: [],
            responseTime: [],
            errorRate: [],
            resourceUsage: [],
            summary: {}
        };
        
        // Probar diferentes niveles de carga
        for (const concurrentUsers of this.config.loadTests.concurrentUsers) {
            console.log(`👥 Probando con ${concurrentUsers} usuarios concurrentes...`);
            
            const loadResult = await this.executeLoadTest(concurrentUsers);
            results.throughput.push({
                concurrentUsers: concurrentUsers,
                ...loadResult.throughput
            });
            results.responseTime.push({
                concurrentUsers: concurrentUsers,
                ...loadResult.responseTime
            });
            results.errorRate.push({
                concurrentUsers: concurrentUsers,
                ...loadResult.errorRate
            });
            results.resourceUsage.push({
                concurrentUsers: concurrentUsers,
                ...loadResult.resourceUsage
            });
        }
        
        results.summary = this.generateLoadSummary(results);
        
        return results;
    },

    /**
     * Ejecutar prueba de carga individual
     * @param {number} concurrentUsers - Número de usuarios concurrentes
     * @returns {Object} Resultado de la prueba
     */
    executeLoadTest: async function(concurrentUsers) {
        const duration = this.config.loadTests.duration;
        const rampUpTime = this.config.loadTests.rampUpTime;
        const queries = this.getLoadTestQueries();
        
        const startTime = Date.now();
        const endTime = startTime + duration;
        const results = {
            throughput: { requestsPerSecond: 0, totalRequests: 0 },
            responseTime: { average: 0, p95: 0, p99: 0 },
            errorRate: { percentage: 0, totalErrors: 0 },
            resourceUsage: { cpu: 0, memory: 0, connections: 0 }
        };
        
        const promises = [];
        const responseTimes = [];
        let totalRequests = 0;
        let totalErrors = 0;
        
        // Crear usuarios concurrentes
        for (let i = 0; i < concurrentUsers; i++) {
            const delay = (rampUpTime / concurrentUsers) * i;
            
            const userPromise = this.createConcurrentUser(i, queries, endTime, delay, responseTimes);
            promises.push(userPromise);
        }
        
        // Esperar a que todos los usuarios completen
        const userResults = await Promise.allSettled(promises);
        
        // Procesar resultados
        userResults.forEach(result => {
            if (result.status === 'fulfilled') {
                totalRequests += result.value.requests;
                totalErrors += result.value.errors;
                responseTimes.push(...result.value.responseTimes);
            }
        });
        
        // Calcular estadísticas
        const actualDuration = Date.now() - startTime;
        results.throughput.requestsPerSecond = (totalRequests / actualDuration) * 1000;
        results.throughput.totalRequests = totalRequests;
        
        if (responseTimes.length > 0) {
            const sortedTimes = responseTimes.sort((a, b) => a - b);
            results.responseTime.average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
            results.responseTime.p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
            results.responseTime.p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
        }
        
        results.errorRate.percentage = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
        results.errorRate.totalErrors = totalErrors;
        
        // Obtener uso de recursos
        if (typeof DatabaseManager !== 'undefined') {
            const dbStats = DatabaseManager.getState();
            results.resourceUsage.connections = dbStats.poolMetrics ? dbStats.poolMetrics.totalCount : 0;
        }
        
        return results;
    },

    /**
     * Crear usuario concurrente para prueba de carga
     * @param {number} userId - ID del usuario
     * @param {Array} queries - Consultas a ejecutar
     * @param {number} endTime - Tiempo de finalización
     * @param {number} delay - Retraso antes de empezar
     * @param {Array} responseTimes - Array para almacenar tiempos de respuesta
     * @returns {Promise} Resultado del usuario
     */
    createConcurrentUser: async function(userId, queries, endTime, delay, responseTimes) {
        // Esperar el retraso
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const results = {
            userId: userId,
            requests: 0,
            errors: 0,
            responseTimes: []
        };
        
        while (Date.now() < endTime) {
            const query = queries[Math.floor(Math.random() * queries.length)];
            
            try {
                const startTime = Date.now();
                await this.executeQuery(query);
                const responseTime = Date.now() - startTime;
                
                results.requests++;
                responseTimes.push(responseTime);
                results.responseTimes.push(responseTime);
            } catch (error) {
                results.errors++;
            }
            
            // Pequeña pausa entre consultas
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        }
        
        return results;
    },

    /**
     * Ejecutar pruebas de escalabilidad
     * @returns {Object} Resultados de pruebas de escalabilidad
     */
    runScalabilityTests: async function() {
        if (!this.config.scalabilityTests.enabled) {
            return { skipped: true, reason: 'Scalability tests disabled' };
        }
        
        console.log('📈 Ejecutando pruebas de escalabilidad...');
        
        const results = {
            connectionScaling: [],
            throughputScaling: [],
            resourceScaling: [],
            summary: {}
        };
        
        const maxConnections = this.config.scalabilityTests.maxConnections;
        const increment = this.config.scalabilityTests.connectionIncrement;
        
        // Probar diferentes números de conexiones
        for (let connections = increment; connections <= maxConnections; connections += increment) {
            console.log(`🔌 Probando con ${connections} conexiones...`);
            
            const scalabilityResult = await this.executeScalabilityTest(connections);
            results.connectionScaling.push({
                connections: connections,
                ...scalabilityResult.connectionScaling
            });
            results.throughputScaling.push({
                connections: connections,
                ...scalabilityResult.throughputScaling
            });
            results.resourceScaling.push({
                connections: connections,
                ...scalabilityResult.resourceScaling
            });
        }
        
        results.summary = this.generateScalabilitySummary(results);
        
        return results;
    },

    /**
     * Ejecutar prueba de escalabilidad individual
     * @param {number} connections - Número de conexiones
     * @returns {Object} Resultado de la prueba
     */
    executeScalabilityTest: async function(connections) {
        const duration = this.config.scalabilityTests.testDuration;
        const queries = this.getScalabilityTestQueries();
        
        const startTime = Date.now();
        const endTime = startTime + duration;
        
        const promises = [];
        const results = {
            connectionScaling: { successRate: 0, averageConnectionTime: 0 },
            throughputScaling: { requestsPerSecond: 0, totalRequests: 0 },
            resourceScaling: { memoryUsage: 0, cpuUsage: 0, connectionPoolUsage: 0 }
        };
        
        // Crear conexiones concurrentes
        for (let i = 0; i < connections; i++) {
            const connectionPromise = this.createScalabilityConnection(i, queries, endTime);
            promises.push(connectionPromise);
        }
        
        // Esperar a que todas las conexiones completen
        const connectionResults = await Promise.allSettled(promises);
        
        // Procesar resultados
        let totalRequests = 0;
        let successfulConnections = 0;
        const connectionTimes = [];
        
        connectionResults.forEach(result => {
            if (result.status === 'fulfilled') {
                totalRequests += result.value.requests;
                successfulConnections++;
                connectionTimes.push(result.value.connectionTime);
            }
        });
        
        // Calcular estadísticas
        const actualDuration = Date.now() - startTime;
        results.connectionScaling.successRate = (successfulConnections / connections) * 100;
        results.connectionScaling.averageConnectionTime = connectionTimes.length > 0 ? 
            connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length : 0;
        
        results.throughputScaling.requestsPerSecond = (totalRequests / actualDuration) * 1000;
        results.throughputScaling.totalRequests = totalRequests;
        
        // Obtener uso de recursos
        if (typeof DatabaseManager !== 'undefined') {
            const dbStats = DatabaseManager.getState();
            results.resourceScaling.connectionPoolUsage = dbStats.poolMetrics ? 
                (dbStats.poolMetrics.totalCount / this.config.scalabilityTests.maxConnections) * 100 : 0;
        }
        
        return results;
    },

    /**
     * Crear conexión para prueba de escalabilidad
     * @param {number} connectionId - ID de la conexión
     * @param {Array} queries - Consultas a ejecutar
     * @param {number} endTime - Tiempo de finalización
     * @returns {Promise} Resultado de la conexión
     */
    createScalabilityConnection: async function(connectionId, queries, endTime) {
        const startTime = Date.now();
        const results = {
            connectionId: connectionId,
            requests: 0,
            connectionTime: 0
        };
        
        // Medir tiempo de conexión
        try {
            if (typeof DatabaseManager !== 'undefined') {
                await DatabaseManager.checkConnection();
            }
            results.connectionTime = Date.now() - startTime;
        } catch (error) {
            results.connectionTime = Date.now() - startTime;
            return results;
        }
        
        // Ejecutar consultas mientras haya tiempo
        while (Date.now() < endTime) {
            const query = queries[Math.floor(Math.random() * queries.length)];
            
            try {
                await this.executeQuery(query);
                results.requests++;
            } catch (error) {
                // Ignorar errores en pruebas de escalabilidad
            }
            
            // Pequeña pausa
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        return results;
    },

    /**
     * Ejecutar pruebas de concurrencia
     * @returns {Object} Resultados de pruebas de concurrencia
     */
    runConcurrencyTests: async function() {
        if (!this.config.concurrencyTests.enabled) {
            return { skipped: true, reason: 'Concurrency tests disabled' };
        }
        
        console.log('🔄 Ejecutando pruebas de concurrencia...');
        
        const results = {
            deadlockTests: [],
            raceConditionTests: [],
            isolationTests: [],
            summary: {}
        };
        
        // Probar diferentes niveles de concurrencia
        const maxConcurrent = this.config.concurrencyTests.maxConcurrentQueries;
        const increment = this.config.concurrencyTests.queryIncrement;
        
        for (let concurrent = increment; concurrent <= maxConcurrent; concurrent += increment) {
            console.log(`⚡ Probando con ${concurrent} consultas concurrentes...`);
            
            const concurrencyResult = await this.executeConcurrencyTest(concurrent);
            
            if (concurrency % 10 === 0) { // Cada 10 consultas
                results.deadlockTests.push({
                    concurrentQueries: concurrent,
                    ...concurrencyResult.deadlockTests
                });
                results.raceConditionTests.push({
                    concurrentQueries: concurrent,
                    ...concurrencyResult.raceConditionTests
                });
                results.isolationTests.push({
                    concurrentQueries: concurrent,
                    ...concurrencyResult.isolationTests
                });
            }
        }
        
        results.summary = this.generateConcurrencySummary(results);
        
        return results;
    },

    /**
     * Ejecutar prueba de concurrencia individual
     * @param {number} concurrentQueries - Número de consultas concurrentes
     * @returns {Object} Resultado de la prueba
     */
    executeConcurrencyTest: async function(concurrentQueries) {
        const duration = this.config.concurrencyTests.testDuration;
        
        const results = {
            deadlockTests: { deadlocks: 0, successRate: 0 },
            raceConditionTests: { raceConditions: 0, dataConsistency: 0 },
            isolationTests: { isolationViolations: 0, transactionIntegrity: 0 }
        };
        
        // Probar deadlocks
        const deadlockResult = await this.testDeadlocks(concurrentQueries, duration);
        results.deadlockTests = deadlockResult;
        
        // Probar condiciones de carrera
        const raceConditionResult = await this.testRaceConditions(concurrentQueries, duration);
        results.raceConditionTests = raceConditionResult;
        
        // Probar aislamiento
        const isolationResult = await this.testIsolation(concurrentQueries, duration);
        results.isolationTests = isolationResult;
        
        return results;
    },

    /**
     * Probar deadlocks
     * @param {number} concurrentQueries - Número de consultas concurrentes
     * @param {number} duration - Duración de la prueba
     * @returns {Object} Resultado de prueba de deadlocks
     */
    testDeadlocks: async function(concurrentQueries, duration) {
        const results = {
            deadlocks: 0,
            successRate: 0
        };
        
        if (typeof DatabaseManager !== 'undefined') {
            const promises = [];
            let successCount = 0;
            
            // Crear transacciones concurrentes que podrían causar deadlocks
            for (let i = 0; i < concurrentQueries; i++) {
                const transactionPromise = DatabaseManager.transaction(async (client) => {
                    try {
                        // Actualizar diferentes recursos en orden diferente
                        if (i % 2 === 0) {
                            await client.query('UPDATE cases SET status = $1 WHERE id = $2', ['active', 1]);
                            await client.query('UPDATE clients SET name = $1 WHERE id = $2', ['Test', 1]);
                        } else {
                            await client.query('UPDATE clients SET name = $1 WHERE id = $2', ['Test', 1]);
                            await client.query('UPDATE cases SET status = $1 WHERE id = $2', ['active', 1]);
                        }
                        
                        successCount++;
                        return { success: true };
                    } catch (error) {
                        if (error.code === '40P01') { // Deadlock detected
                            results.deadlocks++;
                        }
                        return { success: false, error: error.message };
                    }
                });
                
                promises.push(transactionPromise);
            }
            
            await Promise.allSettled(promises);
            results.successRate = (successCount / concurrentQueries) * 100;
        }
        
        return results;
    },

    /**
     * Probar condiciones de carrera
     * @param {number} concurrentQueries - Número de consultas concurrentes
     * @param {number} duration - Duración de la prueba
     * @returns {Object} Resultado de prueba de condiciones de carrera
     */
    testRaceConditions: async function(concurrentQueries, duration) {
        const results = {
            raceConditions: 0,
            dataConsistency: 0
        };
        
        if (typeof DatabaseManager !== 'undefined') {
            const promises = [];
            const testId = Date.now();
            
            // Crear operaciones concurrentes sobre el mismo dato
            for (let i = 0; i < concurrentQueries; i++) {
                const operationPromise = DatabaseManager.query(
                    'UPDATE analytics SET page_views = page_views + 1 WHERE date = CURRENT_DATE RETURNING page_views',
                    []
                );
                promises.push(operationPromise);
            }
            
            const operationResults = await Promise.allSettled(promises);
            
            // Verificar consistencia de datos
            const finalValue = await DatabaseManager.query(
                'SELECT page_views FROM analytics WHERE date = CURRENT_DATE',
                []
            );
            
            if (finalValue.rows.length > 0) {
                const expectedIncrement = concurrentQueries;
                const actualIncrement = finalValue.rows[0].page_views;
                
                if (actualIncrement === expectedIncrement) {
                    results.dataConsistency = 100;
                } else {
                    results.raceConditions++;
                    results.dataConsistency = (actualIncrement / expectedIncrement) * 100;
                }
            }
        }
        
        return results;
    },

    /**
     * Probar aislamiento de transacciones
     * @param {number} concurrentQueries - Número de consultas concurrentes
     * @param {number} duration - Duración de la prueba
     * @returns {Object} Resultado de prueba de aislamiento
     */
    testIsolation: async function(concurrentQueries, duration) {
        const results = {
            isolationViolations: 0,
            transactionIntegrity: 0
        };
        
        if (typeof DatabaseManager !== 'undefined') {
            const promises = [];
            let integrityCount = 0;
            
            // Crear transacciones concurrentes con diferentes niveles de aislamiento
            for (let i = 0; i < concurrentQueries; i++) {
                const transactionPromise = DatabaseManager.transaction(async (client) => {
                    try {
                        // Insertar dato temporal
                        await client.query(
                            'INSERT INTO cases (id, user_id, title, status) VALUES ($1, $2, $3, $4)',
                            [`test_${i}_${Date.now()}`, 'test_user', 'Test Case', 'pending']
                        );
                        
                        // Leer datos que podrían ser modificados por otras transacciones
                        const readResult = await client.query('SELECT COUNT(*) FROM cases WHERE status = $1', ['pending']);
                        
                        // Simular procesamiento
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        // Actualizar el mismo dato
                        await client.query('UPDATE cases SET status = $1 WHERE title = $2', ['processed', 'Test Case']);
                        
                        integrityCount++;
                        return { success: true, count: readResult.rows[0].count };
                    } catch (error) {
                        results.isolationViolations++;
                        return { success: false, error: error.message };
                    }
                }, { isolationLevel: 'READ COMMITTED' });
                
                promises.push(transactionPromise);
            }
            
            await Promise.allSettled(promises);
            results.transactionIntegrity = (integrityCount / concurrentQueries) * 100;
        }
        
        return results;
    },

    /**
     * Ejecutar pruebas de seguridad
     * @returns {Object} Resultados de pruebas de seguridad
     */
    runSecurityTests: async function() {
        if (!this.config.securityTests.enabled) {
            return { skipped: true, reason: 'Security tests disabled' };
        }
        
        console.log('🔒 Ejecutando pruebas de seguridad...');
        
        const results = {
            sqlInjection: {},
            xss: {},
            parameterValidation: {},
            authentication: {},
            summary: {}
        };
        
        // Probar inyección SQL
        if (this.config.securityTests.sqlInjectionTests) {
            results.sqlInjection = await this.testSQLInjection();
        }
        
        // Probar XSS
        if (this.config.securityTests.xssTests) {
            results.xss = await this.testXSS();
        }
        
        // Probar validación de parámetros
        if (this.config.securityTests.parameterValidationTests) {
            results.parameterValidation = await this.testParameterValidation();
        }
        
        // Probar autenticación
        if (this.config.securityTests.authenticationTests) {
            results.authentication = await this.testAuthentication();
        }
        
        results.summary = this.generateSecuritySummary(results);
        
        return results;
    },

    /**
     * Probar inyección SQL
     * @returns {Object} Resultados de prueba de inyección SQL
     */
    testSQLInjection: async function() {
        const results = {
            blockedAttacks: 0,
            totalAttacks: 0,
            vulnerabilities: []
        };
        
        const injectionPayloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --",
            "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
            "' AND 1=CONVERT(int, (SELECT @@version)) --"
        ];
        
        for (const payload of injectionPayloads) {
            results.totalAttacks++;
            
            try {
                // Intentar inyección en consulta de usuarios
                if (typeof DatabaseManager !== 'undefined') {
                    await DatabaseManager.query(
                        'SELECT * FROM profiles WHERE email = $1',
                        [payload]
                    );
                }
                
                // Si llega aquí, la inyección no fue bloqueada
                results.vulnerabilities.push({
                    payload: payload,
                    type: 'SQL Injection',
                    severity: 'high'
                });
            } catch (error) {
                // Error esperado - inyección bloqueada
                results.blockedAttacks++;
            }
        }
        
        results.securityScore = (results.blockedAttacks / results.totalAttacks) * 100;
        
        return results;
    },

    /**
     * Probar XSS
     * @returns {Object} Resultados de prueba de XSS
     */
    testXSS: async function() {
        const results = {
            blockedAttacks: 0,
            totalAttacks: 0,
            vulnerabilities: []
        };
        
        const xssPayloads = [
            '<script>alert("XSS")</script>',
            'javascript:alert("XSS")',
            '<img src="x" onerror="alert(\'XSS\')">',
            '"><script>alert("XSS")</script>',
            '<svg onload="alert(\'XSS\')">'
        ];
        
        for (const payload of xssPayloads) {
            results.totalAttacks++;
            
            try {
                // Intentar XSS en consulta de inserción
                if (typeof DatabaseManager !== 'undefined') {
                    await DatabaseManager.query(
                        'INSERT INTO cases (title, description) VALUES ($1, $2)',
                        [payload, 'Test description']
                    );
                }
                
                // Verificar si el payload fue sanitizado
                const checkResult = await DatabaseManager.query(
                    'SELECT title FROM cases WHERE title LIKE $1',
                    ['%Test%']
                );
                
                if (checkResult.rows.length > 0) {
                    const storedTitle = checkResult.rows[0].title;
                    
                    // Si el payload está sin cambios, hay vulnerabilidad
                    if (storedTitle.includes('<script>') || storedTitle.includes('javascript:')) {
                        results.vulnerabilities.push({
                            payload: payload,
                            type: 'XSS',
                            severity: 'high',
                            storedAs: storedTitle
                        });
                    } else {
                        results.blockedAttacks++;
                    }
                }
            } catch (error) {
                // Error esperado - XSS bloqueado
                results.blockedAttacks++;
            }
        }
        
        results.securityScore = (results.blockedAttacks / results.totalAttacks) * 100;
        
        return results;
    },

    /**
     * Probar validación de parámetros
     * @returns {Object} Resultados de prueba de validación
     */
    testParameterValidation: async function() {
        const results = {
            validParametersBlocked: 0,
            invalidParametersBlocked: 0,
            totalTests: 0,
            vulnerabilities: []
        };
        
        const invalidParameters = [
            null,
            undefined,
            '',
            'x'.repeat(10000), // Parámetro muy largo
            { malicious: 'object' },
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] // Demasiados parámetros
        ];
        
        for (const param of invalidParameters) {
            results.totalTests++;
            
            try {
                if (typeof DatabaseManager !== 'undefined') {
                    await DatabaseManager.query(
                        'SELECT * FROM profiles WHERE id = $1',
                        [param]
                    );
                }
                
                // Si la consulta se ejecuta sin error, hay problema
                results.vulnerabilities.push({
                    parameter: param,
                    type: 'Invalid Parameter',
                    severity: 'medium'
                });
            } catch (error) {
                // Error esperado - parámetro inválido bloqueado
                results.invalidParametersBlocked++;
            }
        }
        
        // Probar parámetros válidos
        const validParameters = [1, 'test@example.com', 'Test User'];
        
        for (const param of validParameters) {
            results.totalTests++;
            
            try {
                if (typeof DatabaseManager !== 'undefined') {
                    await DatabaseManager.query(
                        'SELECT COUNT(*) FROM profiles WHERE email = $1',
                        [param]
                    );
                }
                
                results.validParametersBlocked++;
            } catch (error) {
                // Error inesperado - parámetro válido bloqueado
                results.vulnerabilities.push({
                    parameter: param,
                    type: 'Valid Parameter Blocked',
                    severity: 'low',
                    error: error.message
                });
            }
        }
        
        results.securityScore = ((results.invalidParametersBlocked + results.validParametersBlocked) / results.totalTests) * 100;
        
        return results;
    },

    /**
     * Probar autenticación
     * @returns {Object} Resultados de prueba de autenticación
     */
    testAuthentication: async function() {
        const results = {
            unauthorizedAccessBlocked: 0,
            validAuthenticationPassed: 0,
            totalTests: 0,
            vulnerabilities: []
        };
        
        // Probar acceso sin token
        results.totalTests++;
        
        try {
            // Simular llamada a endpoint protegido sin token
            const response = await fetch('/api/cases', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                    // Sin Authorization header
                }
            });
            
            if (response.status === 401 || response.status === 403) {
                results.unauthorizedAccessBlocked++;
            } else {
                results.vulnerabilities.push({
                    test: 'Access without token',
                    type: 'Authentication Bypass',
                    severity: 'critical',
                    responseStatus: response.status
                });
            }
        } catch (error) {
            results.unauthorizedAccessBlocked++;
        }
        
        // Probar con token inválido
        results.totalTests++;
        
        try {
            const response = await fetch('/api/cases', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer invalid_token_12345'
                }
            });
            
            if (response.status === 401 || response.status === 403) {
                results.unauthorizedAccessBlocked++;
            } else {
                results.vulnerabilities.push({
                    test: 'Access with invalid token',
                    type: 'Authentication Bypass',
                    severity: 'critical',
                    responseStatus: response.status
                });
            }
        } catch (error) {
            results.unauthorizedAccessBlocked++;
        }
        
        results.securityScore = (results.unauthorizedAccessBlocked / 2) * 100;
        
        return results;
    },

    /**
     * Ejecutar consulta de prueba
     * @param {Object} query - Consulta a ejecutar
     * @returns {Object} Resultado de la consulta
     */
    executeQuery: async function(query) {
        if (typeof DatabaseManager !== 'undefined') {
            return await DatabaseManager.query(query.sql, query.params);
        } else {
            // Simulación de consulta para pruebas
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({ rows: [], rowCount: 0 });
                }, Math.random() * 100 + 50);
            });
        }
    },

    /**
     * Obtener consultas de prueba por complejidad
     * @param {string} complexity - Nivel de complejidad
     * @returns {Array} Lista de consultas
     */
    getTestQueries: function(complexity) {
        const queries = {
            simple: [
                {
                    name: 'Simple SELECT',
                    sql: 'SELECT * FROM profiles WHERE id = $1',
                    params: [1]
                },
                {
                    name: 'Simple INSERT',
                    sql: 'INSERT INTO cases (title, description) VALUES ($1, $2)',
                    params: ['Test Case', 'Test Description']
                }
            ],
            medium: [
                {
                    name: 'SELECT with JOIN',
                    sql: 'SELECT c.*, p.full_name FROM cases c JOIN profiles p ON c.user_id = p.id WHERE c.status = $1',
                    params: ['active']
                },
                {
                    name: 'SELECT with aggregation',
                    sql: 'SELECT status, COUNT(*) as count FROM cases GROUP BY status HAVING COUNT(*) > $1',
                    params: [5]
                }
            ],
            complex: [
                {
                    name: 'Multiple JOINs with subquery',
                    sql: `SELECT c.title, p.full_name, cl.name as client_name 
                            FROM cases c 
                            JOIN profiles p ON c.user_id = p.id 
                            LEFT JOIN clients cl ON c.client_id = cl.id 
                            WHERE c.status IN (SELECT status FROM cases WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY status) 
                            ORDER BY c.created_at DESC LIMIT $1`,
                    params: [50]
                },
                {
                    name: 'Complex aggregation',
                    sql: `SELECT 
                            DATE_TRUNC('month', created_at) as month,
                            COUNT(*) as total_cases,
                            COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_cases,
                            AVG(CASE WHEN status = 'closed' THEN EXTRACT(EPOCH FROM (updated_at - created_at))/3600 END) as avg_resolution_hours
                            FROM cases 
                            WHERE created_at > NOW() - INTERVAL '1 year'
                            GROUP BY DATE_TRUNC('month', created_at)
                            ORDER BY month DESC`,
                    params: []
                }
            ],
            very_complex: [
                {
                    name: 'Window functions and CTEs',
                    sql: `WITH monthly_stats AS (
                        SELECT 
                            user_id,
                            DATE_TRUNC('month', created_at) as month,
                            COUNT(*) as case_count,
                            ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY COUNT(*) DESC) as rank
                        FROM cases 
                        WHERE created_at > NOW() - INTERVAL '6 months'
                        GROUP BY user_id, DATE_TRUNC('month', created_at)
                    )
                    SELECT 
                        p.full_name,
                        ms.month,
                        ms.case_count,
                        LAG(ms.case_count) OVER (PARTITION BY p.id ORDER BY ms.month) as previous_month_cases
                    FROM monthly_stats ms
                    JOIN profiles p ON ms.user_id = p.id
                    WHERE ms.rank <= 3
                    ORDER BY p.full_name, ms.month DESC`,
                    params: []
                }
            ]
        };
        
        return queries[complexity] || queries.simple;
    },

    /**
     * Obtener consultas para prueba de caché
     * @returns {Array} Lista de consultas
     */
    getCacheTestQueries: function() {
        return [
            {
                name: 'Cacheable SELECT',
                sql: 'SELECT * FROM profiles WHERE role = $1',
                params: ['user']
            },
            {
                name: 'Parameterized SELECT',
                sql: 'SELECT COUNT(*) FROM cases WHERE status = $1 AND created_at > $2',
                params: ['active', new Date(Date.now() - 24 * 60 * 60 * 1000)]
            }
        ];
    },

    /**
     * Obtener consultas para prueba de optimización
     * @returns {Array} Lista de consultas
     */
    getOptimizationTestQueries: function() {
        return [
            {
                name: 'Unoptimized SELECT',
                sql: 'SELECT * FROM cases WHERE user_id = $1 ORDER BY created_at DESC',
                params: [1]
            },
            {
                name: 'Complex JOIN',
                sql: `SELECT c.*, p.full_name, cl.name 
                        FROM cases c 
                        JOIN profiles p ON c.user_id = p.id 
                        LEFT JOIN clients cl ON c.client_id = cl.id 
                        WHERE c.status = $1`,
                params: ['active']
            }
        ];
    },

    /**
     * Obtener consultas para prueba de carga
     * @returns {Array} Lista de consultas
     */
    getLoadTestQueries: function() {
        return [
            {
                name: 'Read Query',
                sql: 'SELECT * FROM cases WHERE user_id = $1 LIMIT 10',
                params: [Math.floor(Math.random() * 100) + 1]
            },
            {
                name: 'Write Query',
                sql: 'INSERT INTO analytics (page_views, date) VALUES ($1, CURRENT_DATE)',
                params: [Math.floor(Math.random() * 10) + 1]
            },
            {
                name: 'Update Query',
                sql: 'UPDATE profiles SET last_login = NOW() WHERE id = $1',
                params: [Math.floor(Math.random() * 100) + 1]
            }
        ];
    },

    /**
     * Obtener consultas para prueba de escalabilidad
     * @returns {Array} Lista de consultas
     */
    getScalabilityTestQueries: function() {
        return [
            {
                name: 'Simple Read',
                sql: 'SELECT COUNT(*) FROM cases',
                params: []
            },
            {
                name: 'Indexed Read',
                sql: 'SELECT * FROM profiles WHERE email = $1',
                params: [`test${Math.floor(Math.random() * 1000)}@example.com`]
            }
        ];
    },

    /**
     * Generar datos de prueba
     */
    generateTestData: function() {
        console.log('📊 Generando datos de prueba...');
        
        // Generar usuarios de prueba
        for (let i = 1; i <= 100; i++) {
            this.testData.users.push({
                id: `user_${i}`,
                email: `user${i}@example.com`,
                full_name: `Test User ${i}`,
                role: i <= 5 ? 'admin' : 'user'
            });
        }
        
        // Generar casos de prueba
        for (let i = 1; i <= 1000; i++) {
            this.testData.cases.push({
                id: `case_${i}`,
                user_id: `user_${Math.floor(Math.random() * 100) + 1}`,
                title: `Test Case ${i}`,
                description: `Description for test case ${i}`,
                status: ['active', 'pending', 'closed'][Math.floor(Math.random() * 3)],
                priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
            });
        }
        
        // Generar clientes de prueba
        for (let i = 1; i <= 200; i++) {
            this.testData.clients.push({
                id: `client_${i}`,
                name: `Client ${i}`,
                email: `client${i}@example.com`,
                phone: `555-000${i.toString().padStart(3, '0')}`
            });
        }
        
        console.log('✅ Datos de prueba generados');
    },

    /**
     * Inicializar componentes de optimización
     */
    initializeOptimizationComponents: function() {
        // Inicializar Query Cache
        if (typeof QueryCache !== 'undefined') {
            QueryCache.init();
        }
        
        // Inicializar Query Optimizer
        if (typeof QueryOptimizer !== 'undefined') {
            QueryOptimizer.init();
        }
        
        // Inicializar Database Manager
        if (typeof DatabaseManager !== 'undefined') {
            DatabaseManager.init().catch(error => {
                console.warn('⚠️ No se pudo inicializar Database Manager:', error.message);
            });
        }
        
        // Inicializar Query Analyzer
        if (typeof QueryAnalyzer !== 'undefined') {
            QueryAnalyzer.init();
        }
    },

    /**
     * Crear directorio de salida
     */
    createOutputDirectory: function() {
        const fs = require('fs');
        const path = require('path');
        
        const outputDir = path.resolve(this.config.reports.outputDirectory);
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`📁 Directorio de salida creado: ${outputDir}`);
        }
    },

    /**
     * Calcular desviación estándar
     * @param {Array} values - Valores
     * @param {number} mean - Media
     * @returns {number} Desviación estándar
     */
    calculateStandardDeviation: function(values, mean) {
        const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
        const avgSquaredDiff = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
    },

    /**
     * Generar resumen de rendimiento
     * @param {Object} results - Resultados de pruebas
     * @returns {Object} Resumen de rendimiento
     */
    generatePerformanceSummary: function(results) {
        const summary = {
            overallPerformance: 'good',
            averageQueryTime: 0,
            cacheEfficiency: 0,
            optimizationBenefits: 0,
            recommendations: []
        };
        
        // Calcular tiempo promedio de consulta
        const allQueryTimes = results.queryPerformance.flatMap(qp => 
            qp.queries.map(q => q.averageTime)
        );
        
        if (allQueryTimes.length > 0) {
            summary.averageQueryTime = allQueryTimes.reduce((sum, time) => sum + time, 0) / allQueryTimes.length;
        }
        
        // Calcular eficiencia de caché
        if (results.cachePerformance.hitRate) {
            summary.cacheEfficiency = results.cachePerformance.hitRate;
        }
        
        // Calcular beneficios de optimización
        if (results.optimizationPerformance.performanceImprovement) {
            summary.optimizationBenefits = results.optimizationPerformance.performanceImprovement;
        }
        
        // Determinar rendimiento general
        if (summary.averageQueryTime > 1000) {
            summary.overallPerformance = 'poor';
        } else if (summary.averageQueryTime > 500) {
            summary.overallPerformance = 'fair';
        } else if (summary.averageQueryTime > 200) {
            summary.overallPerformance = 'good';
        } else {
            summary.overallPerformance = 'excellent';
        }
        
        // Generar recomendaciones
        if (summary.cacheEfficiency < 50) {
            summary.recommendations.push('Considerar ajustar la configuración de caché para mejorar la tasa de aciertos');
        }
        
        if (summary.optimizationBenefits < 10) {
            summary.recommendations.push('La optimización de consultas está mostrando beneficios limitados, revisar estrategias');
        }
        
        return summary;
    },

    /**
     * Generar resumen de carga
     * @param {Object} results - Resultados de pruebas
     * @returns {Object} Resumen de carga
     */
    generateLoadSummary: function(results) {
        const summary = {
            maxThroughput: 0,
            averageResponseTime: 0,
            errorRate: 0,
            scalability: 'good',
            recommendations: []
        };
        
        // Calcular throughput máximo
        const throughputs = results.throughput.map(t => t.requestsPerSecond);
        summary.maxThroughput = Math.max(...throughputs);
        
        // Calcular tiempo de respuesta promedio
        const responseTimes = results.responseTime.map(r => r.average);
        summary.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        
        // Calcular tasa de error promedio
        const errorRates = results.errorRate.map(e => e.percentage);
        summary.errorRate = errorRates.reduce((sum, rate) => sum + rate, 0) / errorRates.length;
        
        // Determinar escalabilidad
        if (summary.errorRate > 5) {
            summary.scalability = 'poor';
        } else if (summary.averageResponseTime > 1000) {
            summary.scalability = 'fair';
        } else if (summary.averageResponseTime > 500) {
            summary.scalability = 'good';
        } else {
            summary.scalability = 'excellent';
        }
        
        // Generar recomendaciones
        if (summary.errorRate > 1) {
            summary.recommendations.push('Alta tasa de errores detectada, revisar manejo de concurrencia');
        }
        
        if (summary.averageResponseTime > 500) {
            summary.recommendations.push('Tiempo de respuesta elevado, considerar optimización de consultas o aumento de recursos');
        }
        
        return summary;
    },

    /**
     * Generar resumen de escalabilidad
     * @param {Object} results - Resultados de pruebas
     * @returns {Object} Resumen de escalabilidad
     */
    generateScalabilitySummary: function(results) {
        const summary = {
            connectionScaling: 'good',
            throughputScaling: 'good',
            resourceEfficiency: 'good',
            recommendations: []
        };
        
        // Analizar escalabilidad de conexiones
        const connectionSuccessRates = results.connectionScaling.map(cs => cs.successRate);
        const avgConnectionSuccessRate = connectionSuccessRates.reduce((sum, rate) => sum + rate, 0) / connectionSuccessRates.length;
        
        if (avgConnectionSuccessRate < 90) {
            summary.connectionScaling = 'poor';
        } else if (avgConnectionSuccessRate < 95) {
            summary.connectionScaling = 'fair';
        }
        
        // Analizar escalabilidad de throughput
        const throughputs = results.throughputScaling.map(ts => ts.requestsPerSecond);
        const maxThroughput = Math.max(...throughputs);
        const minThroughput = Math.min(...throughputs);
        const throughputGrowth = (maxThroughput - minThroughput) / minThroughput * 100;
        
        if (throughputGrowth < 50) {
            summary.throughputScaling = 'poor';
        } else if (throughputGrowth < 100) {
            summary.throughputScaling = 'fair';
        }
        
        // Generar recomendaciones
        if (summary.connectionScaling === 'poor') {
            summary.recommendations.push('Problemas de escalabilidad de conexiones detectados, revisar pool de conexiones');
        }
        
        if (summary.throughputScaling === 'poor') {
            summary.recommendations.push('Throughput no escala adecuadamente, considerar optimización de consultas');
        }
        
        return summary;
    },

    /**
     * Generar resumen de concurrencia
     * @param {Object} results - Resultados de pruebas
     * @returns {Object} Resumen de concurrencia
     */
    generateConcurrencySummary: function(results) {
        const summary = {
            deadlockResistance: 'good',
            dataConsistency: 'good',
            transactionIsolation: 'good',
            recommendations: []
        };
        
        // Analizar resistencia a deadlocks
        const deadlockRates = results.deadlockTests.map(dt => (dt.deadlocks / 100) * 100);
        const avgDeadlockRate = deadlockRates.reduce((sum, rate) => sum + rate, 0) / deadlockRates.length;
        
        if (avgDeadlockRate > 5) {
            summary.deadlockResistance = 'poor';
        } else if (avgDeadlockRate > 1) {
            summary.deadlockResistance = 'fair';
        }
        
        // Analizar consistencia de datos
        const consistencyRates = results.raceConditionTests.map(rct => rct.dataConsistency);
        const avgConsistencyRate = consistencyRates.reduce((sum, rate) => sum + rate, 0) / consistencyRates.length;
        
        if (avgConsistencyRate < 95) {
            summary.dataConsistency = 'poor';
        } else if (avgConsistencyRate < 99) {
            summary.dataConsistency = 'fair';
        }
        
        // Analizar aislamiento de transacciones
        const isolationRates = results.isolationTests.map(it => it.transactionIntegrity);
        const avgIsolationRate = isolationRates.reduce((sum, rate) => sum + rate, 0) / isolationRates.length;
        
        if (avgIsolationRate < 95) {
            summary.transactionIsolation = 'poor';
        } else if (avgIsolationRate < 99) {
            summary.transactionIsolation = 'fair';
        }
        
        // Generar recomendaciones
        if (summary.deadlockResistance === 'poor') {
            summary.recommendations.push('Deadlocks frecuentes detectados, revisar orden de bloqueos y transacciones');
        }
        
        if (summary.dataConsistency === 'poor') {
            summary.recommendations.push('Problemas de consistencia de datos, revisar mecanismos de concurrencia');
        }
        
        return summary;
    },

    /**
     * Generar resumen de seguridad
     * @param {Object} results - Resultados de pruebas
     * @returns {Object} Resumen de seguridad
     */
    generateSecuritySummary: function(results) {
        const summary = {
            overallSecurity: 'good',
            sqlInjectionProtection: 'good',
            xssProtection: 'good',
            parameterValidation: 'good',
            authenticationSecurity: 'good',
            vulnerabilities: [],
            recommendations: []
        };
        
        // Analizar protección contra inyección SQL
        if (results.sqlInjection.securityScore < 90) {
            summary.sqlInjectionProtection = 'poor';
            summary.vulnerabilities.push(...results.sqlInjection.vulnerabilities);
        }
        
        // Analizar protección XSS
        if (results.xss.securityScore < 90) {
            summary.xssProtection = 'poor';
            summary.vulnerabilities.push(...results.xss.vulnerabilities);
        }
        
        // Analizar validación de parámetros
        if (results.parameterValidation.securityScore < 90) {
            summary.parameterValidation = 'poor';
            summary.vulnerabilities.push(...results.parameterValidation.vulnerabilities);
        }
        
        // Analizar seguridad de autenticación
        if (results.authentication.securityScore < 90) {
            summary.authenticationSecurity = 'poor';
            summary.vulnerabilities.push(...results.authentication.vulnerabilities);
        }
        
        // Determinar seguridad general
        const criticalVulns = summary.vulnerabilities.filter(v => v.severity === 'critical');
        if (criticalVulns.length > 0) {
            summary.overallSecurity = 'critical';
        } else if (summary.vulnerabilities.length > 0) {
            summary.overallSecurity = 'poor';
        }
        
        // Generar recomendaciones
        if (summary.sqlInjectionProtection === 'poor') {
            summary.recommendations.push('Implementar validación estricta y prepared statements para prevenir inyección SQL');
        }
        
        if (summary.xssProtection === 'poor') {
            summary.recommendations.push('Implementar sanitización de entrada y escaping de salida para prevenir XSS');
        }
        
        if (summary.authenticationSecurity === 'poor') {
            summary.recommendations.push('Revisar implementación de autenticación y autorización');
        }
        
        return summary;
    },

    /**
     * Generar resumen general
     * @param {Object} results - Resultados completos
     * @returns {Object} Resumen general
     */
    generateSummary: function(results) {
        const summary = {
            overallScore: 0,
            performance: results.performance.summary,
            load: results.load.summary,
            scalability: results.scalability.summary,
            concurrency: results.concurrency.summary,
            security: results.security.summary,
            recommendations: [],
            testDuration: this.state.endTime - this.state.startTime
        };
        
        // Calcular puntuación general
        let score = 0;
        let factors = 0;
        
        if (results.performance.summary.overallPerformance) {
            const performanceScore = {
                'excellent': 100,
                'good': 80,
                'fair': 60,
                'poor': 40
            }[results.performance.summary.overallPerformance];
            score += performanceScore;
            factors++;
        }
        
        if (results.load.summary.scalability) {
            const loadScore = {
                'excellent': 100,
                'good': 80,
                'fair': 60,
                'poor': 40
            }[results.load.summary.scalability];
            score += loadScore;
            factors++;
        }
        
        if (results.security.summary.overallSecurity) {
            const securityScore = {
                'excellent': 100,
                'good': 80,
                'fair': 60,
                'poor': 40,
                'critical': 20
            }[results.security.summary.overallSecurity];
            score += securityScore;
            factors++;
        }
        
        summary.overallScore = factors > 0 ? Math.round(score / factors) : 0;
        
        // Consolidar recomendaciones
        summary.recommendations = [
            ...(results.performance.summary.recommendations || []),
            ...(results.load.summary.recommendations || []),
            ...(results.scalability.summary.recommendations || []),
            ...(results.concurrency.summary.recommendations || []),
            ...(results.security.summary.recommendations || [])
        ];
        
        return summary;
    },

    /**
     * Generar informes
     * @param {Object} results - Resultados completos
     */
    generateReports: async function(results) {
        console.log('📄 Generando informes...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Generar informe JSON
        if (this.config.reports.generateJson) {
            await this.generateJsonReport(results, timestamp);
        }
        
        // Generar informe HTML
        if (this.config.reports.generateHtml) {
            await this.generateHtmlReport(results, timestamp);
        }
        
        console.log('✅ Informes generados');
    },

    /**
     * Generar informe JSON
     * @param {Object} results - Resultados
     * @param {string} timestamp - Timestamp
     */
    generateJsonReport: async function(results, timestamp) {
        const fs = require('fs');
        const path = require('path');
        
        const reportPath = path.resolve(
            this.config.reports.outputDirectory,
            `query-optimization-report-${timestamp}.json`
        );
        
        const report = {
            metadata: {
                generatedAt: new Date().toISOString(),
                testDuration: results.summary.testDuration,
                overallScore: results.summary.overallScore,
                version: '1.0.0'
            },
            results: results,
            config: this.config
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Informe JSON generado: ${reportPath}`);
    },

    /**
     * Generar informe HTML
     * @param {Object} results - Resultados
     * @param {string} timestamp - Timestamp
     */
    generateHtmlReport: async function(results, timestamp) {
        const fs = require('fs');
        const path = require('path');
        
        const reportPath = path.resolve(
            this.config.reports.outputDirectory,
            `query-optimization-report-${timestamp}.html`
        );
        
        const html = this.generateHtmlContent(results, timestamp);
        
        fs.writeFileSync(reportPath, html);
        console.log(`📄 Informe HTML generado: ${reportPath}`);
    },

    /**
     * Generar contenido HTML del informe
     * @param {Object} results - Resultados
     * @param {string} timestamp - Timestamp
     * @returns {string} Contenido HTML
     */
    generateHtmlContent: function(results, timestamp) {
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Justice 2 - Query Optimization Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .score { font-size: 48px; font-weight: bold; color: #2ecc71; margin: 20px 0; }
        .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .section h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #ecf0f1; border-radius: 5px; text-align: center; min-width: 120px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .metric-label { font-size: 12px; color: #7f8c8d; margin-top: 5px; }
        .good { color: #27ae60; }
        .fair { color: #f39c12; }
        .poor { color: #e74c3c; }
        .critical { color: #c0392b; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; }
        .recommendations h3 { color: #856404; margin-top: 0; }
        .recommendations ul { margin: 10px 0; }
        .chart { margin: 20px 0; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .status-good { background-color: #d4edda; }
        .status-fair { background-color: #fff3cd; }
        .status-poor { background-color: #f8d7da; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Justice 2 - Query Optimization Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <div class="score">${results.summary.overallScore}/100</div>
            <p>Overall System Score</p>
        </div>

        <div class="section">
            <h2>Performance Summary</h2>
            <div class="metric">
                <div class="metric-value ${results.performance.summary.overallPerformance}">${results.performance.summary.overallPerformance.toUpperCase()}</div>
                <div class="metric-label">Performance Level</div>
            </div>
            <div class="metric">
                <div class="metric-value">${Math.round(results.performance.summary.averageQueryTime || 0)}ms</div>
                <div class="metric-label">Avg Query Time</div>
            </div>
            <div class="metric">
                <div class="metric-value">${Math.round(results.performance.summary.cacheEfficiency || 0)}%</div>
                <div class="metric-label">Cache Efficiency</div>
            </div>
        </div>

        <div class="section">
            <h2>Load Testing Results</h2>
            <div class="metric">
                <div class="metric-value ${results.load.summary.scalability}">${results.load.summary.scalability.toUpperCase()}</div>
                <div class="metric-label">Scalability</div>
            </div>
            <div class="metric">
                <div class="metric-value">${Math.round(results.load.summary.maxThroughput || 0)}</div>
                <div class="metric-label">Max Throughput (req/s)</div>
            </div>
            <div class="metric">
                <div class="metric-value">${Math.round(results.load.summary.averageResponseTime || 0)}ms</div>
                <div class="metric-label">Avg Response Time</div>
            </div>
        </div>

        <div class="section">
            <h2>Security Assessment</h2>
            <div class="metric">
                <div class="metric-value ${results.security.summary.overallSecurity}">${results.security.summary.overallSecurity.toUpperCase()}</div>
                <div class="metric-label">Security Level</div>
            </div>
            <div class="metric">
                <div class="metric-value">${results.security.summary.vulnerabilities.length}</div>
                <div class="metric-label">Vulnerabilities Found</div>
            </div>
        </div>

        ${results.summary.recommendations.length > 0 ? `
        <div class="section recommendations">
            <h3>Recommendations</h3>
            <ul>
                ${results.summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <div class="section">
            <h2>Test Details</h2>
            <p><strong>Test Duration:</strong> ${Math.round(results.summary.testDuration / 1000)} seconds</p>
            <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
        </div>
    </div>
</body>
</html>
        `;
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.QueryOptimizationTests = QueryOptimizationTests;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = QueryOptimizationTests;
}