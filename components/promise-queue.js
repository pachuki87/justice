/**
 * Justice 2 Promise Queue
 * Sistema de colas para controlar concurrencia y priorizar operaciones asíncronas
 */

const PromiseQueue = {
    // Configuración
    config: {
        maxConcurrency: 10,
        defaultPriority: 5,
        enableLogging: true,
        enableTelemetry: true,
        queueTimeout: 300000, // 5 minutos
        enablePriorityQueue: true,
        enableFairScheduling: true,
        timeSlice: 100, // 100ms por time slice para fair scheduling
        maxQueueSize: 1000,
        enableMetrics: true
    },

    // Estado
    state: {
        queues: {
            high: [],    // Prioridad 1-3
            normal: [],  // Prioridad 4-7
            low: []      // Prioridad 8-10
        },
        running: new Map(),
        waiting: new Map(),
        completed: [],
        failed: [],
        statistics: {
            totalQueued: 0,
            totalCompleted: 0,
            totalFailed: 0,
            averageWaitTime: 0,
            averageExecutionTime: 0,
            currentConcurrency: 0,
            peakConcurrency: 0
        },
        metrics: {
            queueLengths: { high: 0, normal: 0, low: 0 },
            throughput: 0,
            errorRate: 0,
            priorityDistribution: {}
        }
    },

    // Inicialización
    init: function(customConfig = {}) {
        this.log('Inicializando Promise Queue');
        
        // Fusionar configuración personalizada
        this.config = { ...this.config, ...customConfig };
        
        // Iniciar procesamiento de colas
        this.startQueueProcessor();
        
        // Iniciar recolección de métricas
        if (this.config.enableMetrics) {
            this.startMetricsCollection();
        }
        
        this.log('Promise Queue inicializado correctamente');
    },

    // Agregar tarea a la cola
    enqueue: function(promiseFunction, options = {}) {
        const taskId = this.generateTaskId();
        const timestamp = Date.now();
        
        // Validar límite de cola
        if (this.getTotalQueueSize() >= this.config.maxQueueSize) {
            throw new Error('La cola ha alcanzado su capacidad máxima');
        }

        // Determinar prioridad
        const priority = this.normalizePriority(options.priority || this.config.defaultPriority);
        
        // Crear tarea
        const task = {
            id: taskId,
            promiseFunction,
            priority,
            timestamp,
            timeout: options.timeout || this.config.queueTimeout,
            retries: options.retries || 0,
            maxRetries: options.maxRetries || 3,
            context: options.context || {},
            metadata: options.metadata || {},
            onProgress: options.onProgress || null,
            onSuccess: options.onSuccess || null,
            onFailure: options.onFailure || null,
            onTimeout: options.onTimeout || null,
            status: 'queued',
            queueTime: 0,
            executionTime: 0,
            startTime: null,
            endTime: null
        };

        // Agregar a la cola apropiada
        this.addToQueue(task, priority);
        
        // Actualizar estadísticas
        this.state.statistics.totalQueued++;
        this.updateQueueMetrics();
        
        // Crear promesa para el resultado
        const resultPromise = new Promise((resolve, reject) => {
            task.resolve = resolve;
            task.reject = reject;
        });

        // Configurar timeout si es necesario
        if (task.timeout > 0) {
            this.setupTaskTimeout(task);
        }

        this.log(`Tarea ${taskId} encolada con prioridad ${priority}`);
        
        return {
            taskId,
            promise: resultPromise,
            task
        };
    },

    // Normalizar prioridad
    normalizePriority: function(priority) {
        return Math.max(1, Math.min(10, priority));
    },

    // Agregar tarea a la cola específica
    addToQueue: function(task, priority) {
        let queueName;
        
        if (priority <= 3) {
            queueName = 'high';
        } else if (priority <= 7) {
            queueName = 'normal';
        } else {
            queueName = 'low';
        }

        // Insertar manteniendo orden por prioridad y timestamp
        const queue = this.state.queues[queueName];
        let insertIndex = queue.length;
        
        for (let i = 0; i < queue.length; i++) {
            if (queue[i].priority > priority || 
                (queue[i].priority === priority && queue[i].timestamp > task.timestamp)) {
                insertIndex = i;
                break;
            }
        }
        
        queue.splice(insertIndex, 0, task);
        task.queueName = queueName;
    },

    // Configurar timeout para tarea
    setupTaskTimeout: function(task) {
        const timeoutId = setTimeout(() => {
            this.handleTaskTimeout(task);
        }, task.timeout);
        
        task.timeoutId = timeoutId;
    },

    // Manejar timeout de tarea
    handleTaskTimeout: function(task) {
        if (task.status !== 'running') {
            return;
        }

        this.log(`Tarea ${task.id} ha excedido el tiempo límite`);
        
        // Cancelar tarea
        this.cancelTask(task.id, 'timeout');
        
        // Llamar callback de timeout
        if (task.onTimeout) {
            task.onTimeout(task);
        }
        
        // Rechazar promesa
        task.reject(new Error(`Tarea ${task.id} excedió el tiempo límite de ${task.timeout}ms`));
    },

    // Iniciar procesador de colas
    startQueueProcessor: function() {
        this.processQueue();
    },

    // Procesar cola
    processQueue: async function() {
        while (true) {
            try {
                // Verificar si hay capacidad para ejecutar más tareas
                if (this.state.running.size < this.config.maxConcurrency) {
                    const task = this.getNextTask();
                    
                    if (task) {
                        this.executeTask(task);
                    }
                }
                
                // Pequeña pausa para no bloquear el event loop
                await this.delay(10);
                
            } catch (error) {
                this.log('Error en procesador de cola:', error);
                await this.delay(100);
            }
        }
    },

    // Obtener siguiente tarea a ejecutar
    getNextTask: function() {
        // Buscar en orden de prioridad
        const queueOrder = ['high', 'normal', 'low'];
        
        for (const queueName of queueOrder) {
            const queue = this.state.queues[queueName];
            if (queue.length > 0) {
                return queue.shift();
            }
        }
        
        return null;
    },

    // Ejecutar tarea
    executeTask: async function(task) {
        const startTime = Date.now();
        task.startTime = startTime;
        task.status = 'running';
        task.queueTime = startTime - task.timestamp;
        
        // Actualizar estadísticas
        this.state.statistics.currentConcurrency++;
        this.state.statistics.peakConcurrency = Math.max(
            this.state.statistics.peakConcurrency,
            this.state.statistics.currentConcurrency
        );
        
        // Agregar a tareas en ejecución
        this.state.running.set(task.id, task);
        
        // Limpiar timeout
        if (task.timeoutId) {
            clearTimeout(task.timeoutId);
            delete task.timeoutId;
        }
        
        this.log(`Ejecutando tarea ${task.id} (prioridad: ${task.priority})`);
        
        try {
            // Ejecutar función de la promesa
            const result = await task.promiseFunction();
            
            // Éxito
            const endTime = Date.now();
            task.endTime = endTime;
            task.executionTime = endTime - startTime;
            task.status = 'completed';
            
            // Actualizar estadísticas
            this.state.statistics.totalCompleted++;
            this.state.statistics.currentConcurrency--;
            
            // Mover a completadas
            this.state.completed.unshift(task);
            this.cleanupHistory();
            
            // Actualizar métricas
            this.updateExecutionMetrics(task);
            
            // Llamar callback de éxito
            if (task.onSuccess) {
                task.onSuccess(result, task);
            }
            
            // Resolver promesa
            task.resolve(result);
            
            this.log(`Tarea ${task.id} completada exitosamente en ${task.executionTime}ms`);
            
        } catch (error) {
            // Error
            const endTime = Date.now();
            task.endTime = endTime;
            task.executionTime = endTime - startTime;
            task.status = 'failed';
            task.error = error;
            
            // Verificar si se puede reintentar
            if (task.retries < task.maxRetries) {
                task.retries++;
                task.status = 'retrying';
                
                this.log(`Reintentando tarea ${task.id} (intento ${task.retries}/${task.maxRetries})`);
                
                // Reencolar con menor prioridad
                task.priority = Math.min(10, task.priority + 1);
                this.addToQueue(task, task.priority);
                
                // Actualizar estadísticas
                this.state.statistics.currentConcurrency--;
                
            } else {
                // Fallo definitivo
                this.state.statistics.totalFailed++;
                this.state.statistics.currentConcurrency--;
                
                // Mover a fallidas
                this.state.failed.unshift(task);
                this.cleanupHistory();
                
                // Actualizar métricas
                this.updateExecutionMetrics(task);
                
                // Llamar callback de fallo
                if (task.onFailure) {
                    task.onFailure(error, task);
                }
                
                // Rechazar promesa
                task.reject(error);
                
                this.log(`Tarea ${task.id} falló definitivamente después de ${task.maxRetries} reintentos: ${error.message}`);
            }
        } finally {
            // Remover de tareas en ejecución
            this.state.running.delete(task.id);
            
            // Actualizar métricas
            this.updateQueueMetrics();
        }
    },

    // Cancelar tarea
    cancelTask: function(taskId, reason = 'cancelled') {
        // Buscar en colas
        for (const queueName of ['high', 'normal', 'low']) {
            const queue = this.state.queues[queueName];
            const index = queue.findIndex(task => task.id === taskId);
            
            if (index !== -1) {
                const task = queue.splice(index, 1)[0];
                task.status = 'cancelled';
                task.cancelReason = reason;
                
                // Limpiar timeout
                if (task.timeoutId) {
                    clearTimeout(task.timeoutId);
                }
                
                // Rechazar promesa
                task.reject(new Error(`Tarea ${taskId} cancelada: ${reason}`));
                
                this.log(`Tarea ${taskId} cancelada: ${reason}`);
                return true;
            }
        }
        
        // Buscar en tareas en ejecución
        const runningTask = this.state.running.get(taskId);
        if (runningTask) {
            runningTask.status = 'cancelled';
            runningTask.cancelReason = reason;
            
            // Limpiar timeout
            if (runningTask.timeoutId) {
                clearTimeout(runningTask.timeoutId);
            }
            
            // Notificar cancelación (la tarea debe manejarla)
            this.log(`Tarea ${taskId} marcada para cancelación: ${reason}`);
            return true;
        }
        
        return false;
    },

    // Cancelar todas las tareas
    cancelAllTasks: function(reason = 'cancelled_all') {
        let cancelledCount = 0;
        
        // Cancelar tareas en colas
        for (const queueName of ['high', 'normal', 'low']) {
            const queue = this.state.queues[queueName];
            cancelledCount += queue.length;
            
            queue.forEach(task => {
                task.status = 'cancelled';
                task.cancelReason = reason;
                
                if (task.timeoutId) {
                    clearTimeout(task.timeoutId);
                }
                
                task.reject(new Error(`Tarea ${task.id} cancelada: ${reason}`));
            });
            
            queue.length = 0;
        }
        
        // Marcar tareas en ejecución para cancelación
        this.state.running.forEach(task => {
            task.status = 'cancelled';
            task.cancelReason = reason;
            cancelledCount++;
        });
        
        this.log(`${cancelledCount} tareas canceladas: ${reason}`);
        return cancelledCount;
    },

    // Pausar procesamiento de cola
    pauseQueue: function() {
        this.state.paused = true;
        this.log('Procesamiento de cola pausado');
    },

    // Reanudar procesamiento de cola
    resumeQueue: function() {
        this.state.paused = false;
        this.log('Procesamiento de cola reanudado');
    },

    // Limpiar historial (mantener últimos 1000)
    cleanupHistory: function() {
        if (this.state.completed.length > 1000) {
            this.state.completed = this.state.completed.slice(0, 1000);
        }
        
        if (this.state.failed.length > 1000) {
            this.state.failed = this.state.failed.slice(0, 1000);
        }
    },

    // Actualizar métricas de cola
    updateQueueMetrics: function() {
        this.state.metrics.queueLengths = {
            high: this.state.queues.high.length,
            normal: this.state.queues.normal.length,
            low: this.state.queues.low.length
        };
        
        // Calcular throughput (tareas por segundo)
        const recentCompleted = this.state.completed.filter(
            task => Date.now() - task.endTime < 60000 // Último minuto
        );
        this.state.metrics.throughput = recentCompleted.length;
        
        // Calcular error rate
        const recentTotal = recentCompleted.length + this.state.failed.filter(
            task => Date.now() - task.endTime < 60000
        ).length;
        
        if (recentTotal > 0) {
            this.state.metrics.errorRate = (this.state.failed.length / recentTotal) * 100;
        }
    },

    // Actualizar métricas de ejecución
    updateExecutionMetrics: function(task) {
        // Actualizar tiempos promedio
        const completedCount = this.state.statistics.totalCompleted;
        const failedCount = this.state.statistics.totalFailed;
        const totalProcessed = completedCount + failedCount;
        
        if (totalProcessed > 0) {
            // Promedio de tiempo en cola
            const totalQueueTime = this.state.completed.reduce((sum, t) => sum + t.queueTime, 0) +
                                  this.state.failed.reduce((sum, t) => sum + t.queueTime, 0);
            this.state.statistics.averageWaitTime = totalQueueTime / totalProcessed;
            
            // Promedio de tiempo de ejecución
            const totalExecutionTime = this.state.completed.reduce((sum, t) => sum + t.executionTime, 0) +
                                     this.state.failed.reduce((sum, t) => sum + t.executionTime, 0);
            this.state.statistics.averageExecutionTime = totalExecutionTime / totalProcessed;
        }
        
        // Actualizar distribución de prioridades
        const priority = task.priority;
        this.state.metrics.priorityDistribution[priority] = 
            (this.state.metrics.priorityDistribution[priority] || 0) + 1;
    },

    // Iniciar recolección de métricas
    startMetricsCollection: function() {
        setInterval(() => {
            this.updateQueueMetrics();
            
            // Enviar telemetría si está habilitada
            if (this.config.enableTelemetry) {
                this.sendTelemetry();
            }
        }, 5000); // Cada 5 segundos
    },

    // Enviar telemetría
    sendTelemetry: function() {
        if (typeof window !== 'undefined' && window.Justice2API) {
            const telemetryData = {
                queueMetrics: this.state.metrics,
                statistics: this.state.statistics,
                timestamp: new Date().toISOString()
            };

            window.Justice2API.post('/telemetry/queue', telemetryData)
                .catch(err => {
                    console.warn('Error enviando telemetría de cola:', err);
                });
        }
    },

    // Obtener tamaño total de la cola
    getTotalQueueSize: function() {
        return this.state.queues.high.length + 
               this.state.queues.normal.length + 
               this.state.queues.low.length;
    },

    // Obtener estado de la cola
    getQueueStatus: function() {
        return {
            queues: {
                high: this.state.queues.high.length,
                normal: this.state.queues.normal.length,
                low: this.state.queues.low.length
            },
            running: this.state.running.size,
            statistics: this.state.statistics,
            metrics: this.state.metrics,
            paused: this.state.paused || false
        };
    },

    // Obtener tarea específica
    getTask: function(taskId) {
        // Buscar en colas
        for (const queueName of ['high', 'normal', 'low']) {
            const task = this.state.queues[queueName].find(t => t.id === taskId);
            if (task) return task;
        }
        
        // Buscar en ejecución
        return this.state.running.get(taskId);
    },

    // Obtener tareas en ejecución
    getRunningTasks: function() {
        return Array.from(this.state.running.values());
    },

    // Obtener tareas recientes
    getRecentTasks: function(limit = 50) {
        const recent = [
            ...this.state.completed.slice(0, limit),
            ...this.state.failed.slice(0, limit)
        ];
        
        return recent
            .sort((a, b) => (b.endTime || b.timestamp) - (a.endTime || a.timestamp))
            .slice(0, limit);
    },

    // Funciones de conveniencia para patrones comunes

    // Ejecutar con alta prioridad
    enqueueHigh: function(promiseFunction, options = {}) {
        return this.enqueue(promiseFunction, { ...options, priority: 1 });
    },

    // Ejecutar con baja prioridad
    enqueueLow: function(promiseFunction, options = {}) {
        return this.enqueue(promiseFunction, { ...options, priority: 9 });
    },

    // Ejecutar en paralelo con control de concurrencia
    enqueueParallel: function(promiseFunctions, options = {}) {
        const tasks = promiseFunctions.map(fn => this.enqueue(fn, options));
        return Promise.all(tasks.map(t => t.promise));
    },

    // Ejecutar en secuencia
    enqueueSequence: function(promiseFunctions, options = {}) {
        return promiseFunctions.reduce((previousPromise, promiseFunction) => {
            return previousPromise.then(() => {
                const task = this.enqueue(promiseFunction, options);
                return task.promise;
            });
        }, Promise.resolve());
    },

    // Generar ID único para tarea
    generateTaskId: function() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Función de delay
    delay: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Logging
    log: function(message, data = null) {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [PromiseQueue] ${message}`;
            
            if (data) {
                console.log(logEntry, data);
            } else {
                console.log(logEntry);
            }
        }
    }
};

// Auto-inicialización si se carga en navegador
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PromiseQueue.init();
    });
} else if (typeof window !== 'undefined') {
    // Para Node.js o si ya está cargado
    PromiseQueue.init();
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.PromiseQueue = PromiseQueue;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromiseQueue;
}