/**
 * Justice 2 Batch Renderer
 * Sistema de renderizado por lotes para optimizar rendimiento
 * Agrupa operaciones de renderizado para minimizar reflows y repaints
 */

const BatchRenderer = {
    // Configuración
    config: {
        enableBatching: true,
        enablePrioritization: true,
        enableAsyncRendering: true,
        enableFrameScheduling: true,
        maxBatchSize: 100,
        batchTimeout: 16, // ~60fps
        priorityLevels: ['immediate', 'high', 'normal', 'low', 'idle'],
        enableMetrics: true,
        enableProfiling: false,
        enableAdaptiveBatching: true,
        enableIntelligentMerging: true,
        enableDependencyResolution: true,
        enableErrorRecovery: true,
        maxRetries: 3,
        retryDelay: 100
    },

    // Estado
    state: {
        isInitialized: false,
        batches: new Map(), // Batches por prioridad
        renderQueue: [],
        processingQueue: [],
        completedQueue: [],
        failedQueue: [],
        frameScheduled: false,
        isProcessing: false,
        currentFrame: null,
        metrics: {
            totalBatches: 0,
            totalRendered: 0,
            averageBatchSize: 0,
            averageProcessingTime: 0,
            maxProcessingTime: 0,
            minProcessingTime: Infinity,
            frameDrops: 0,
            retries: 0,
            errors: 0,
            throughput: 0, // renders por segundo
            efficiency: 0 // ratio de renders exitosos
        },
        performanceMetrics: {
            frameStartTime: 0,
            frameCount: 0,
            lastFrameTime: 0,
            fps: 0,
            processingTime: 0,
            idleTime: 0
        },
        adaptiveSettings: {
            batchSize: 100,
            batchTimeout: 16,
            enableAsyncRendering: true,
            enableFrameScheduling: true
        },
        dependencyGraph: new Map(),
        mergeStrategies: new Map(),
        errorRecovery: {
            retryCount: new Map(),
            lastError: new Map(),
            backoffMultiplier: 1.5
        }
    },

    /**
     * Inicializar Batch Renderer
     */
    init: async function(customConfig = {}) {
        if (this.state.isInitialized) return;

        this.config = { ...this.config, ...customConfig };
        
        // Inicializar batches por prioridad
        this.config.priorityLevels.forEach(priority => {
            this.state.batches.set(priority, []);
        });
        
        // Inicializar subsistemas
        await this.initializeFrameScheduling();
        await this.initializePrioritization();
        await this.initializeDependencyResolution();
        await this.initializeIntelligentMerging();
        await this.initializeErrorRecovery();
        
        // Iniciar procesamiento de lotes
        this.startBatchProcessor();
        
        // Iniciar monitoreo de rendimiento
        if (this.config.enableMetrics) {
            this.startPerformanceMonitoring();
        }
        
        this.state.isInitialized = true;
        this.log('Batch Renderer inicializado con renderizado por lotes optimizado');
    },

    /**
     * Inicializar scheduling de frames
     */
    initializeFrameScheduling: async function() {
        if (!this.config.enableFrameScheduling) return;

        this.state.currentFrame = {
            id: 0,
            startTime: 0,
            renderOperations: [],
            completed: false
        };

        this.log('Frame scheduling inicializado');
    },

    /**
     * Inicializar sistema de priorización
     */
    initializePrioritization: async function() {
        if (!this.config.enablePrioritization) return;

        // Configurar estrategias de priorización
        this.state.mergeStrategies.set('immediate', {
            maxBatchSize: 10,
            batchTimeout: 0,
            forceSync: true
        });

        this.state.mergeStrategies.set('high', {
            maxBatchSize: 25,
            batchTimeout: 8,
            forceSync: false
        });

        this.state.mergeStrategies.set('normal', {
            maxBatchSize: 50,
            batchTimeout: 16,
            forceSync: false
        });

        this.state.mergeStrategies.set('low', {
            maxBatchSize: 100,
            batchTimeout: 33,
            forceSync: false
        });

        this.state.mergeStrategies.set('idle', {
            maxBatchSize: 200,
            batchTimeout: 100,
            forceSync: false
        });

        this.log('Sistema de priorización inicializado');
    },

    /**
     * Inicializar resolución de dependencias
     */
    initializeDependencyResolution: async function() {
        if (!this.config.enableDependencyResolution) return;

        this.state.dependencyGraph = new Map();
        this.log('Resolución de dependencias inicializada');
    },

    /**
     * Inicializar merging inteligente
     */
    initializeIntelligentMerging: async function() {
        if (!this.config.enableIntelligentMerging) return;

        this.state.mergeStrategies.set('smart', {
            canMerge: this.canMergeOperations.bind(this),
            mergeOperations: this.mergeOperations.bind(this),
            optimizeOrder: this.optimizeRenderOrder.bind(this)
        });

        this.log('Merging inteligente inicializado');
    },

    /**
     * Inicializar recuperación de errores
     */
    initializeErrorRecovery: async function() {
        if (!this.config.enableErrorRecovery) return;

        this.state.errorRecovery.retryCount = new Map();
        this.state.errorRecovery.lastError = new Map();
        
        this.log('Recuperación de errores inicializada');
    },

    /**
     * Agregar operación de renderizado al lote
     */
    addRenderOperation: function(operation, priority = 'normal', dependencies = []) {
        if (!this.state.isInitialized) {
            this.init();
        }

        const renderOperation = {
            id: this.generateOperationId(),
            operation,
            priority: this.validatePriority(priority),
            dependencies,
            timestamp: Date.now(),
            retries: 0,
            status: 'pending'
        };

        // Agregar dependencias al grafo
        if (this.config.enableDependencyResolution && dependencies.length > 0) {
            this.addDependencies(renderOperation.id, dependencies);
        }

        // Agregar al batch correspondiente
        const batch = this.state.batches.get(renderOperation.priority);
        batch.push(renderOperation);

        // Si es prioridad inmediata, procesar inmediatamente
        if (renderOperation.priority === 'immediate') {
            this.processImmediateBatch();
        } else {
            // Programar procesamiento si no está programado
            this.scheduleBatchProcessing();
        }

        return renderOperation.id;
    },

    /**
     * Validar prioridad
     */
    validatePriority: function(priority) {
        return this.config.priorityLevels.includes(priority) ? priority : 'normal';
    },

    /**
     * Generar ID único de operación
     */
    generateOperationId: function() {
        return `batch_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Agregar dependencias
     */
    addDependencies: function(operationId, dependencies) {
        this.state.dependencyGraph.set(operationId, dependencies);
    },

    /**
     * Programar procesamiento de lotes
     */
    scheduleBatchProcessing: function() {
        if (this.state.frameScheduled) return;

        this.state.frameScheduled = true;

        if (this.config.enableFrameScheduling) {
            requestAnimationFrame(() => {
                this.processBatchedOperations();
            });
        } else {
            setTimeout(() => {
                this.processBatchedOperations();
            }, this.config.batchTimeout);
        }
    },

    /**
     * Procesar operaciones en lotes
     */
    processBatchedOperations: async function() {
        if (this.state.isProcessing) return;

        this.state.isProcessing = true;
        this.state.frameScheduled = false;

        const frameStartTime = performance.now();
        this.state.performanceMetrics.frameStartTime = frameStartTime;

        try {
            // Recolectar operaciones de todos los niveles de prioridad
            const operations = this.collectOperations();
            
            if (operations.length === 0) {
                this.state.isProcessing = false;
                return;
            }

            // Resolver dependencias
            const resolvedOperations = this.config.enableDependencyResolution 
                ? await this.resolveDependencies(operations)
                : operations;

            // Optimizar orden de renderizado
            const optimizedOperations = this.config.enableIntelligentMerging
                ? await this.optimizeRenderOrder(resolvedOperations)
                : resolvedOperations;

            // Procesar por lotes según prioridad
            await this.processOperationsByPriority(optimizedOperations);

            // Actualizar métricas
            this.updateMetrics(operations.length, performance.now() - frameStartTime);

        } catch (error) {
            this.log('Error procesando operaciones en lote:', error);
            this.handleBatchError(error);
        } finally {
            this.state.isProcessing = false;
            this.state.performanceMetrics.lastFrameTime = performance.now();
        }
    },

    /**
     * Recolectar operaciones de todos los batches
     */
    collectOperations: function() {
        const operations = [];
        
        // Recolectar en orden de prioridad
        for (const priority of this.config.priorityLevels) {
            const batch = this.state.batches.get(priority);
            if (batch.length > 0) {
                operations.push(...batch.splice(0));
            }
        }

        return operations;
    },

    /**
     * Resolver dependencias
     */
    resolveDependencies: async function(operations) {
        const resolved = [];
        const processed = new Set();
        const inProgress = new Set();

        const processOperation = async (operation) => {
            if (processed.has(operation.id)) return;
            if (inProgress.has(operation.id)) {
                // Evitar ciclos
                this.log(`Ciclo de dependencia detectado: ${operation.id}`);
                return;
            }

            inProgress.add(operation.id);

            // Procesar dependencias primero
            const dependencies = this.state.dependencyGraph.get(operation.id) || [];
            for (const depId of dependencies) {
                const depOperation = operations.find(op => op.id === depId);
                if (depOperation) {
                    await processOperation(depOperation);
                }
            }

            resolved.push(operation);
            processed.add(operation.id);
            inProgress.delete(operation.id);
        };

        // Procesar todas las operaciones
        for (const operation of operations) {
            await processOperation(operation);
        }

        return resolved;
    },

    /**
     * Optimizar orden de renderizado
     */
    optimizeRenderOrder: async function(operations) {
        // Agrupar operaciones similares
        const groups = this.groupSimilarOperations(operations);
        
        // Ordenar grupos por tipo y prioridad
        const sortedGroups = this.sortOperationGroups(groups);
        
        // Aplanar grupos en orden optimizado
        const optimized = [];
        for (const group of sortedGroups) {
            optimized.push(...group.operations);
        }

        return optimized;
    },

    /**
     * Agrupar operaciones similares
     */
    groupSimilarOperations: function(operations) {
        const groups = new Map();

        for (const operation of operations) {
            const groupKey = this.getGroupKey(operation);
            
            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    type: groupKey,
                    operations: [],
                    priority: operation.priority
                });
            }

            groups.get(groupKey).operations.push(operation);
        }

        return Array.from(groups.values());
    },

    /**
     * Obtener clave de agrupación
     */
    getGroupKey: function(operation) {
        // Agrupar por tipo de operación y componente
        const op = operation.operation;
        
        if (op.type === 'render') {
            return `render:${op.componentName}`;
        } else if (op.type === 'update') {
            return `update:${op.componentName}`;
        } else if (op.type === 'remove') {
            return `remove:${op.componentName}`;
        }
        
        return `other:${op.type}`;
    },

    /**
     * Ordenar grupos de operaciones
     */
    sortOperationGroups: function(groups) {
        const priorityOrder = {
            'immediate': 0,
            'high': 1,
            'normal': 2,
            'low': 3,
            'idle': 4
        };

        return groups.sort((a, b) => {
            // Primero por prioridad
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;

            // Luego por tipo (removes primero, luego renders, luego updates)
            const typeOrder = { 'remove': 0, 'render': 1, 'update': 2, 'other': 3 };
            const aType = a.type.split(':')[0];
            const bType = b.type.split(':')[0];
            
            return typeOrder[aType] - typeOrder[bType];
        });
    },

    /**
     * Procesar operaciones por prioridad
     */
    processOperationsByPriority: async function(operations) {
        // Agrupar por prioridad
        const priorityGroups = new Map();
        for (const operation of operations) {
            if (!priorityGroups.has(operation.priority)) {
                priorityGroups.set(operation.priority, []);
            }
            priorityGroups.get(operation.priority).push(operation);
        }

        // Procesar en orden de prioridad
        for (const priority of this.config.priorityLevels) {
            const group = priorityGroups.get(priority);
            if (group && group.length > 0) {
                await this.processPriorityGroup(group, priority);
            }
        }
    },

    /**
     * Procesar grupo de prioridad
     */
    processPriorityGroup: async function(operations, priority) {
        const strategy = this.state.mergeStrategies.get(priority) || 
                        this.state.mergeStrategies.get('normal');

        // Dividir en lotes según estrategia
        const batches = this.createBatches(operations, strategy);
        
        // Procesar cada lote
        for (const batch of batches) {
            await this.processBatch(batch, strategy);
        }
    },

    /**
     * Crear lotes
     */
    createBatches: function(operations, strategy) {
        const batches = [];
        const maxBatchSize = strategy.maxBatchSize || this.config.maxBatchSize;

        for (let i = 0; i < operations.length; i += maxBatchSize) {
            batches.push(operations.slice(i, i + maxBatchSize));
        }

        return batches;
    },

    /**
     * Procesar lote individual
     */
    processBatch: async function(batch, strategy) {
        const batchStartTime = performance.now();
        
        try {
            // Aplicar merging inteligente si está disponible
            const processedBatch = this.config.enableIntelligentMerging && strategy.mergeOperations
                ? await strategy.mergeOperations(batch)
                : batch;

            // Ejecutar operaciones
            if (strategy.forceSync) {
                await this.executeBatchSync(processedBatch);
            } else if (this.config.enableAsyncRendering) {
                await this.executeBatchAsync(processedBatch);
            } else {
                await this.executeBatchSequential(processedBatch);
            }

            // Actualizar métricas
            const batchTime = performance.now() - batchStartTime;
            this.updateBatchMetrics(batch.length, batchTime);

        } catch (error) {
            this.log(`Error procesando lote:`, error);
            await this.handleBatchError(error, batch);
        }
    },

    /**
     * Ejecutar lote síncrono
     */
    executeBatchSync: async function(batch) {
        for (const operation of batch) {
            await this.executeOperation(operation);
        }
    },

    /**
     * Ejecutar lote asíncrono
     */
    executeBatchAsync: async function(batch) {
        const promises = batch.map(operation => this.executeOperation(operation));
        await Promise.allSettled(promises);
    },

    /**
     * Ejecutar lote secuencial con yield
     */
    executeBatchSequential: async function(batch) {
        for (const operation of batch) {
            await this.executeOperation(operation);
            
            // Ceder control para no bloquear el hilo principal
            if (this.config.enableFrameScheduling) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    },

    /**
     * Ejecutar operación individual
     */
    executeOperation: async function(operation) {
        try {
            operation.status = 'processing';
            operation.startTime = performance.now();

            const result = await operation.operation.execute();
            
            operation.status = 'completed';
            operation.endTime = performance.now();
            operation.result = result;
            
            this.state.completedQueue.push(operation);
            
        } catch (error) {
            operation.status = 'failed';
            operation.endTime = performance.now();
            operation.error = error;
            
            // Intentar recuperación si está habilitada
            if (this.config.enableErrorRecovery) {
                await this.attemptErrorRecovery(operation);
            } else {
                this.state.failedQueue.push(operation);
            }
        }
    },

    /**
     * Intentar recuperación de error
     */
    attemptErrorRecovery: async function(operation) {
        const retryCount = this.state.errorRecovery.retryCount.get(operation.id) || 0;
        
        if (retryCount < this.config.maxRetries) {
            // Incrementar contador de reintentos
            this.state.errorRecovery.retryCount.set(operation.id, retryCount + 1);
            
            // Calcular delay con backoff exponencial
            const delay = this.config.retryDelay * 
                         Math.pow(this.state.errorRecovery.backoffMultiplier, retryCount);
            
            // Programar reintento
            setTimeout(async () => {
                operation.status = 'retrying';
                await this.executeOperation(operation);
            }, delay);
            
            this.state.metrics.retries++;
        } else {
            // Máximo de reintentos alcanzado
            this.state.failedQueue.push(operation);
            this.state.metrics.errors++;
        }
    },

    /**
     * Procesar lote inmediato
     */
    processImmediateBatch: async function() {
        const immediateBatch = this.state.batches.get('immediate');
        if (immediateBatch.length === 0) return;

        const operations = immediateBatch.splice(0);
        await this.processBatch(operations, this.state.mergeStrategies.get('immediate'));
    },

    /**
     * Verificar si se pueden fusionar operaciones
     */
    canMergeOperations: function(operations) {
        if (operations.length < 2) return false;

        // Todas las operaciones deben ser del mismo tipo y componente
        const firstOp = operations[0].operation;
        
        return operations.every(op => 
            op.operation.type === firstOp.type &&
            op.operation.componentName === firstOp.componentName
        );
    },

    /**
     * Fusionar operaciones
     */
    mergeOperations: async function(operations) {
        if (!this.canMergeOperations(operations)) {
            return operations;
        }

        const firstOp = operations[0].operation;
        
        if (firstOp.type === 'update' && operations.length > 1) {
            // Fusionar updates: tomar el último
            const lastOp = operations[operations.length - 1].operation;
            
            return [{
                ...operations[operations.length - 1],
                operation: {
                    ...lastOp,
                    merged: true,
                    mergedCount: operations.length
                }
            }];
        }

        return operations;
    },

    /**
     * Iniciar procesador de lotes
     */
    startBatchProcessor: function() {
        setInterval(() => {
            this.performBatchMaintenance();
        }, 1000); // Cada segundo
    },

    /**
     * Realizar mantenimiento de lotes
     */
    performBatchMaintenance: function() {
        // Limpiar colas completadas y fallidas
        const now = Date.now();
        const maxAge = 60000; // 1 minuto

        this.state.completedQueue = this.state.completedQueue.filter(op => 
            now - op.endTime < maxAge
        );

        this.state.failedQueue = this.state.failedQueue.filter(op => 
            now - op.endTime < maxAge
        );

        // Optimizar configuración adaptativa
        if (this.config.enableAdaptiveBatching) {
            this.optimizeAdaptiveSettings();
        }
    },

    /**
     * Optimizar configuración adaptativa
     */
    optimizeAdaptiveSettings: function() {
        const metrics = this.state.metrics;
        
        // Si hay muchos frames drops, reducir tamaño de lote
        if (metrics.frameDrops > 10) {
            this.state.adaptiveSettings.batchSize = Math.max(10, 
                this.state.adaptiveSettings.batchSize * 0.8);
            this.state.adaptiveSettings.batchTimeout = Math.max(8, 
                this.state.adaptiveSettings.batchTimeout * 0.8);
        }
        
        // Si el throughput es bajo, aumentar tamaño de lote
        if (metrics.throughput < 30 && metrics.frameDrops < 5) {
            this.state.adaptiveSettings.batchSize = Math.min(200, 
                this.state.adaptiveSettings.batchSize * 1.2);
            this.state.adaptiveSettings.batchTimeout = Math.min(50, 
                this.state.adaptiveSettings.batchTimeout * 1.2);
        }
    },

    /**
     * Iniciar monitoreo de rendimiento
     */
    startPerformanceMonitoring: function() {
        setInterval(() => {
            this.updatePerformanceMetrics();
        }, 1000); // Cada segundo
    },

    /**
     * Actualizar métricas de rendimiento
     */
    updatePerformanceMetrics: function() {
        const now = performance.now();
        const deltaTime = now - this.state.performanceMetrics.lastFrameTime;
        
        if (deltaTime > 0) {
            // Calcular FPS
            this.state.performanceMetrics.fps = 1000 / deltaTime;
            
            // Detectar frames drops
            if (deltaTime > this.config.batchTimeout * 2) {
                this.state.metrics.frameDrops++;
            }
        }
        
        this.state.performanceMetrics.lastFrameTime = now;
        this.state.performanceMetrics.frameCount++;
    },

    /**
     * Actualizar métricas de lote
     */
    updateBatchMetrics: function(batchSize, batchTime) {
        this.state.metrics.totalBatches++;
        this.state.metrics.totalRendered += batchSize;
        
        // Calcular tamaño promedio de lote
        this.state.metrics.averageBatchSize = 
            (this.state.metrics.averageBatchSize * (this.state.metrics.totalBatches - 1) + batchSize) / 
            this.state.metrics.totalBatches;
        
        // Calcular tiempo promedio de procesamiento
        this.state.metrics.averageProcessingTime = 
            (this.state.metrics.averageProcessingTime * (this.state.metrics.totalBatches - 1) + batchTime) / 
            this.state.metrics.totalBatches;
        
        // Actualizar tiempos máximo y mínimo
        this.state.metrics.maxProcessingTime = Math.max(this.state.metrics.maxProcessingTime, batchTime);
        this.state.metrics.minProcessingTime = Math.min(this.state.metrics.minProcessingTime, batchTime);
        
        // Calcular throughput
        if (batchTime > 0) {
            this.state.metrics.throughput = (batchSize / batchTime) * 1000; // operaciones por segundo
        }
        
        // Calcular eficiencia
        const totalOperations = this.state.metrics.totalRendered + this.state.metrics.errors;
        if (totalOperations > 0) {
            this.state.metrics.efficiency = (this.state.metrics.totalRendered / totalOperations) * 100;
        }
    },

    /**
     * Actualizar métricas generales
     */
    updateMetrics: function(operationCount, frameTime) {
        this.state.metrics.totalBatches++;
        this.state.metrics.totalRendered += operationCount;
        
        // Actualizar tiempo de procesamiento
        this.state.performanceMetrics.processingTime += frameTime;
    },

    /**
     * Manejar error de lote
     */
    handleBatchError: async function(error, batch) {
        this.log('Error en lote:', error);
        
        // Marcar operaciones como fallidas
        for (const operation of batch) {
            operation.status = 'failed';
            operation.error = error;
            this.state.failedQueue.push(operation);
        }
        
        this.state.metrics.errors++;
    },

    /**
     * Obtener estadísticas
     */
    getStatistics: function() {
        return {
            metrics: this.state.metrics,
            performanceMetrics: this.state.performanceMetrics,
            queueSizes: {
                render: this.state.renderQueue.length,
                processing: this.state.processingQueue.length,
                completed: this.state.completedQueue.length,
                failed: this.state.failedQueue.length
            },
            batchSizes: Object.fromEntries(
                Array.from(this.state.batches.entries()).map(([priority, batch]) => [priority, batch.length])
            ),
            adaptiveSettings: this.state.adaptiveSettings
        };
    },

    /**
     * Limpiar recursos
     */
    cleanup: function() {
        // Limpiar colas
        this.state.batches.forEach(batch => batch.length = 0);
        this.state.renderQueue = [];
        this.state.processingQueue = [];
        this.state.completedQueue = [];
        this.state.failedQueue = [];
        
        // Limpiar grafo de dependencias
        this.state.dependencyGraph.clear();
        
        // Resetear estado
        this.state.isProcessing = false;
        this.state.frameScheduled = false;
        this.state.isInitialized = false;
        
        this.log('Batch Renderer limpiado');
    },

    /**
     * Logging
     */
    log: function(...args) {
        if (this.config.enableMetrics) {
            console.log('[BatchRenderer]', ...args);
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.BatchRenderer = BatchRenderer;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchRenderer;
}