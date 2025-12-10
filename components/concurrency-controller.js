/**
 * Justice 2 Concurrency Controller
 * Controlador especializado de concurrencia con patrones avanzados
 * Proporciona semáforos, barreras, count-down latches y thread pools
 */

import { XSSProtection } from './xss-protection.js';

const ConcurrencyController = {
    // Configuración del controlador de concurrencia
    config: {
        // Configuración de semáforos
        maxSemaphorePermits: 100,
        semaphoreTimeout: 30000,
        
        // Configuración de barreras
        barrierTimeout: 60000,
        maxBarrierParties: 50,
        
        // Configuración de thread pools
        maxThreadPoolSize: 10,
        minThreadPoolSize: 2,
        threadIdleTimeout: 30000,
        taskQueueSize: 1000,
        
        // Configuración de count-down latches
        latchTimeout: 60000,
        
        // Configuración de atomic operations
        maxRetries: 5,
        retryDelay: 100,
        
        // Configuración de race condition detection
        enableRaceDetection: true,
        raceDetectionWindow: 1000, // 1 segundo
        
        // Configuración de logging
        enableLogging: true,
        logLevel: 'info'
    },

    // Estado del controlador
    state: {
        initialized: false,
        semaphores: new Map(),
        barriers: new Map(),
        latches: new Map(),
        threadPools: new Map(),
        atomicOperations: new Map(),
        raceDetectors: new Map(),
        metrics: {
            totalOperations: 0,
            concurrentOperations: 0,
            maxConcurrentOperations: 0,
            raceConditionsDetected: 0,
            deadlocksPrevented: 0,
            averageWaitTime: 0
        }
    },

    // Inicialización del controlador
    init: function() {
        if (this.state.initialized) {
            this.log('ConcurrencyController ya está inicializado', 'warn');
            return;
        }

        try {
            this.log('Inicializando ConcurrencyController...');
            
            // Inicializar subsistemas
            this.initializeSemaphores();
            this.initializeBarriers();
            this.initializeLatches();
            this.initializeThreadPools();
            this.initializeAtomicOperations();
            this.initializeRaceDetection();
            
            this.state.initialized = true;
            this.log('ConcurrencyController inicializado correctamente', 'success');
            
        } catch (error) {
            this.log('Error inicializando ConcurrencyController: ' + error.message, 'error');
            throw error;
        }
    },

    // Inicializar sistema de semáforos
    initializeSemaphores: function() {
        this.Semaphore = class {
            constructor(permits, options = {}) {
                this.permits = permits;
                this.available = permits;
                this.waiting = [];
                this.timeout = options.timeout || ConcurrencyController.config.semaphoreTimeout;
                this.id = ConcurrencyController.generateId();
                this.metadata = options.metadata || {};
                
                // Registrar semáforo
                ConcurrencyController.state.semaphores.set(this.id, this);
            }

            // Adquirir permiso del semáforo
            async acquire() {
                return new Promise((resolve, reject) => {
                    if (this.available > 0) {
                        this.available--;
                        resolve(true);
                        return;
                    }

                    // Agregar a la cola de espera
                    const waitItem = {
                        resolve,
                        reject,
                        timestamp: Date.now()
                    };

                    this.waiting.push(waitItem);

                    // Configurar timeout
                    if (this.timeout > 0) {
                        setTimeout(() => {
                            const index = this.waiting.indexOf(waitItem);
                            if (index !== -1) {
                                this.waiting.splice(index, 1);
                                reject(new Error('Semaphore acquire timeout'));
                            }
                        }, this.timeout);
                    }
                });
            }

            // Liberar permiso del semáforo
            release() {
                if (this.waiting.length > 0) {
                    const waitItem = this.waiting.shift();
                    waitItem.resolve(true);
                } else {
                    this.available++;
                }
            }

            // Intentar adquirir sin bloquear
            tryAcquire() {
                if (this.available > 0) {
                    this.available--;
                    return true;
                }
                return false;
            }

            // Obtener número de permisos disponibles
            availablePermits() {
                return this.available;
            }

            // Obtener número de procesos en espera
            waitingProcesses() {
                return this.waiting.length;
            }

            // Destruir semáforo
            destroy() {
                // Rechazar todos los procesos en espera
                for (const waitItem of this.waiting) {
                    waitItem.reject(new Error('Semaphore destroyed'));
                }
                
                // Eliminar del registro
                ConcurrencyController.state.semaphores.delete(this.id);
            }
        };
    },

    // Inicializar sistema de barreras
    initializeBarriers: function() {
        this.Barrier = class {
            constructor(parties, options = {}) {
                this.parties = parties;
                this.waiting = [];
                this.arrived = 0;
                this.timeout = options.timeout || ConcurrencyController.config.barrierTimeout;
                this.id = ConcurrencyController.generateId();
                this.action = options.action || null;
                this.metadata = options.metadata || {};
                
                // Validar número de partes
                if (parties <= 0) {
                    throw new Error('Number of parties must be positive');
                }
                
                // Registrar barrera
                ConcurrencyController.state.barriers.set(this.id, this);
            }

            // Esperar en la barrera
            async await() {
                return new Promise((resolve, reject) => {
                    this.arrived++;
                    
                    if (this.arrived === this.parties) {
                        // Todas las partes han llegado
                        this.arrived = 0;
                        
                        // Ejecutar acción si existe
                        if (this.action) {
                            try {
                                const result = this.action();
                                resolve(result);
                            } catch (error) {
                                reject(error);
                            }
                        } else {
                            resolve(true);
                        }
                        
                        // Liberar a todos los que estaban esperando
                        for (const waitItem of this.waiting) {
                            waitItem.resolve(true);
                        }
                        this.waiting = [];
                        
                    } else {
                        // Esperar a las demás partes
                        const waitItem = {
                            resolve,
                            reject,
                            timestamp: Date.now()
                        };

                        this.waiting.push(waitItem);

                        // Configurar timeout
                        if (this.timeout > 0) {
                            setTimeout(() => {
                                const index = this.waiting.indexOf(waitItem);
                                if (index !== -1) {
                                    this.waiting.splice(index, 1);
                                    this.arrived--;
                                    reject(new Error('Barrier await timeout'));
                                }
                            }, this.timeout);
                        }
                    }
                });
            }

            // Obtener número de partes que han llegado
            getArrivedCount() {
                return this.arrived;
            }

            // Obtener número de partes totales
            getPartiesCount() {
                return this.parties;
            }

            // Reiniciar barrera
            reset() {
                this.arrived = 0;
                
                // Rechazar todos los que estaban esperando
                for (const waitItem of this.waiting) {
                    waitItem.reject(new Error('Barrier reset'));
                }
                this.waiting = [];
            }

            // Destruir barrera
            destroy() {
                this.reset();
                ConcurrencyController.state.barriers.delete(this.id);
            }
        };
    },

    // Inicializar sistema de count-down latches
    initializeLatches: function() {
        this.CountDownLatch = class {
            constructor(count, options = {}) {
                this.count = count;
                this.waiting = [];
                this.timeout = options.timeout || ConcurrencyController.config.latchTimeout;
                this.id = ConcurrencyController.generateId();
                this.metadata = options.metadata || {};
                
                // Validar count
                if (count < 0) {
                    throw new Error('Count must be non-negative');
                }
                
                // Registrar latch
                ConcurrencyController.state.latches.set(this.id, this);
            }

            // Esperar a que el latch llegue a cero
            async await() {
                return new Promise((resolve, reject) => {
                    if (this.count === 0) {
                        resolve(true);
                        return;
                    }

                    const waitItem = {
                        resolve,
                        reject,
                        timestamp: Date.now()
                    };

                    this.waiting.push(waitItem);

                    // Configurar timeout
                    if (this.timeout > 0) {
                        setTimeout(() => {
                            const index = this.waiting.indexOf(waitItem);
                            if (index !== -1) {
                                this.waiting.splice(index, 1);
                                reject(new Error('CountDownLatch await timeout'));
                            }
                        }, this.timeout);
                    }
                });
            }

            // Decrementar el contador
            countDown() {
                if (this.count > 0) {
                    this.count--;
                    
                    if (this.count === 0) {
                        // Liberar a todos los que estaban esperando
                        for (const waitItem of this.waiting) {
                            waitItem.resolve(true);
                        }
                        this.waiting = [];
                    }
                }
            }

            // Obtener el contador actual
            getCount() {
                return this.count;
            }

            // Destruir latch
            destroy() {
                // Rechazar todos los que estaban esperando
                for (const waitItem of this.waiting) {
                    waitItem.reject(new Error('CountDownLatch destroyed'));
                }
                
                ConcurrencyController.state.latches.delete(this.id);
            }
        };
    },

    // Inicializar sistema de thread pools
    initializeThreadPools: function() {
        this.ThreadPool = class {
            constructor(options = {}) {
                this.maxSize = options.maxSize || ConcurrencyController.config.maxThreadPoolSize;
                this.minSize = options.minSize || ConcurrencyController.config.minThreadPoolSize;
                this.idleTimeout = options.idleTimeout || ConcurrencyController.config.threadIdleTimeout;
                this.taskQueueSize = options.taskQueueSize || ConcurrencyController.config.taskQueueSize;
                
                this.threads = new Set();
                this.taskQueue = [];
                this.idleThreads = new Set();
                this.id = ConcurrencyController.generateId();
                this.metadata = options.metadata || {};
                
                // Registrar thread pool
                ConcurrencyController.state.threadPools.set(this.id, this);
                
                // Crear threads iniciales
                for (let i = 0; i < this.minSize; i++) {
                    this.createThread();
                }
            }

            // Crear un nuevo thread
            createThread() {
                const thread = {
                    id: ConcurrencyController.generateId(),
                    busy: false,
                    lastUsed: Date.now(),
                    task: null
                };

                this.threads.add(thread);
                this.idleThreads.add(thread);
                
                // Simular thread worker
                thread.worker = () => {
                    this.processTasks(thread);
                };
                
                return thread;
            }

            // Procesar tareas en un thread
            async processTasks(thread) {
                while (true) {
                    if (this.taskQueue.length === 0) {
                        // No hay tareas, marcar como idle
                        thread.busy = false;
                        this.idleThreads.add(thread);
                        
                        // Esperar por nueva tarea o timeout
                        await new Promise(resolve => {
                            const checkInterval = setInterval(() => {
                                if (this.taskQueue.length > 0 || 
                                    Date.now() - thread.lastUsed > this.idleTimeout) {
                                    clearInterval(checkInterval);
                                    resolve();
                                }
                            }, 100);
                        });
                        
                        // Verificar si debe terminar el thread
                        if (Date.now() - thread.lastUsed > this.idleTimeout && 
                            this.threads.size > this.minSize) {
                            this.threads.delete(thread);
                            this.idleThreads.delete(thread);
                            break;
                        }
                        
                        continue;
                    }

                    // Obtener siguiente tarea
                    const task = this.taskQueue.shift();
                    if (!task) continue;

                    // Marcar thread como ocupado
                    thread.busy = true;
                    thread.lastUsed = Date.now();
                    thread.task = task;
                    this.idleThreads.delete(thread);

                    try {
                        // Ejecutar tarea
                        const result = await this.executeTask(task, thread);
                        
                        // Resolver promesa de la tarea
                        if (task.resolve) {
                            task.resolve(result);
                        }
                        
                    } catch (error) {
                        // Rechazar promesa de la tarea
                        if (task.reject) {
                            task.reject(error);
                        }
                    } finally {
                        // Limpiar tarea
                        thread.task = null;
                    }
                }
            }

            // Ejecutar una tarea
            async executeTask(task, thread) {
                const startTime = Date.now();
                
                try {
                    // Actualizar métricas
                    ConcurrencyController.state.metrics.concurrentOperations++;
                    ConcurrencyController.state.metrics.maxConcurrentOperations = 
                        Math.max(ConcurrencyController.state.metrics.maxConcurrentOperations,
                                ConcurrencyController.state.metrics.concurrentOperations);
                    
                    // Ejecutar la tarea
                    const result = await task.task(thread);
                    
                    // Actualizar métricas
                    const duration = Date.now() - startTime;
                    ConcurrencyController.updateAverageWaitTime(duration);
                    
                    return result;
                    
                } finally {
                    ConcurrencyController.state.metrics.concurrentOperations--;
                }
            }

            // Ejecutar tarea en el pool
            async execute(task, options = {}) {
                return new Promise((resolve, reject) => {
                    const taskItem = {
                        task,
                        resolve,
                        reject,
                        priority: options.priority || 5,
                        timestamp: Date.now(),
                        metadata: options.metadata || {}
                    };

                    // Verificar si hay espacio en la cola
                    if (this.taskQueue.length >= this.taskQueueSize) {
                        reject(new Error('Task queue is full'));
                        return;
                    }

                    // Insertar tarea manteniendo orden por prioridad
                    let insertIndex = this.taskQueue.length;
                    for (let i = 0; i < this.taskQueue.length; i++) {
                        if (this.taskQueue[i].priority > taskItem.priority) {
                            insertIndex = i;
                            break;
                        }
                    }
                    this.taskQueue.splice(insertIndex, 0, taskItem);

                    // Intentar despertar un thread idle
                    if (this.idleThreads.size > 0) {
                        const idleThread = this.idleThreads.values().next().value;
                        if (idleThread && idleThread.worker) {
                            idleThread.worker();
                        }
                    } else if (this.threads.size < this.maxSize) {
                        // Crear nuevo thread si es posible
                        this.createThread();
                    }
                });
            }

            // Obtener estadísticas del pool
            getStats() {
                return {
                    totalThreads: this.threads.size,
                    busyThreads: Array.from(this.threads).filter(t => t.busy).length,
                    idleThreads: this.idleThreads.size,
                    queuedTasks: this.taskQueue.length,
                    maxQueueSize: this.taskQueueSize
                };
            }

            // Destruir thread pool
            async destroy() {
                // Esperar a que todas las tareas se completen
                while (this.taskQueue.length > 0 || 
                       Array.from(this.threads).some(t => t.busy)) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                // Limpiar threads
                this.threads.clear();
                this.idleThreads.clear();
                this.taskQueue = [];
                
                // Eliminar del registro
                ConcurrencyController.state.threadPools.delete(this.id);
            }
        };
    },

    // Inicializar sistema de operaciones atómicas
    initializeAtomicOperations: function() {
        this.Atomic = {
            // Operación atómica de comparación e intercambio
            compareAndSet: function(target, expectedValue, newValue) {
                const operationId = ConcurrencyController.generateId();
                
                return ConcurrencyController.executeWithRetry(() => {
                    const currentValue = target();
                    
                    if (currentValue === expectedValue) {
                        target(newValue);
                        return true;
                    }
                    
                    return false;
                }, {
                    operationId,
                    maxRetries: ConcurrencyController.config.maxRetries,
                    retryDelay: ConcurrencyController.config.retryDelay
                });
            },

            // Incremento atómico
            increment: function(target, delta = 1) {
                const operationId = ConcurrencyController.generateId();
                
                return ConcurrencyController.executeWithRetry(() => {
                    const currentValue = target();
                    const newValue = currentValue + delta;
                    target(newValue);
                    return newValue;
                }, {
                    operationId,
                    maxRetries: ConcurrencyController.config.maxRetries,
                    retryDelay: ConcurrencyController.config.retryDelay
                });
            },

            // Decremento atómico
            decrement: function(target, delta = 1) {
                return this.increment(target, -delta);
            },

            // Actualización atómica
            update: function(target, updateFunction) {
                const operationId = ConcurrencyController.generateId();
                
                return ConcurrencyController.executeWithRetry(() => {
                    const currentValue = target();
                    const newValue = updateFunction(currentValue);
                    target(newValue);
                    return newValue;
                }, {
                    operationId,
                    maxRetries: ConcurrencyController.config.maxRetries,
                    retryDelay: ConcurrencyController.config.retryDelay
                });
            }
        };
    },

    // Inicializar sistema de detección de race conditions
    initializeRaceDetection: function() {
        this.RaceDetector = {
            // Detectores activos
            detectors: new Map(),
            
            // Crear detector para un recurso
            create: function(resource, options = {}) {
                const detectorId = ConcurrencyController.generateId();
                const window = options.window || ConcurrencyController.config.raceDetectionWindow;
                const maxConcurrent = options.maxConcurrent || 1;
                
                const detector = {
                    id: detectorId,
                    resource,
                    window,
                    maxConcurrent,
                    operations: new Map(),
                    violations: []
                };
                
                ConcurrencyController.state.raceDetectors.set(detectorId, detector);
                
                return {
                    detectorId,
                    track: (operationId) => this.track(detectorId, operationId),
                    check: () => this.check(detectorId),
                    destroy: () => this.destroy(detectorId)
                };
            },
            
            // Rastrear operación
            track: function(detectorId, operationId) {
                const detector = ConcurrencyController.state.raceDetectors.get(detectorId);
                if (!detector) return false;
                
                detector.operations.set(operationId, {
                    startTime: Date.now(),
                    endTime: null
                });
                
                // Verificar inmediatamente si hay race condition
                const hasRace = this.check(detectorId);
                
                return !hasRace;
            },
            
            // Completar operación
            complete: function(detectorId, operationId) {
                const detector = ConcurrencyController.state.raceDetectors.get(detectorId);
                if (!detector) return false;
                
                const operation = detector.operations.get(operationId);
                if (operation) {
                    operation.endTime = Date.now();
                }
                
                return true;
            },
            
            // Verificar race conditions
            check: function(detectorId) {
                const detector = ConcurrencyController.state.raceDetectors.get(detectorId);
                if (!detector) return false;
                
                const now = Date.now();
                const activeOperations = [];
                
                // Filtrar operaciones activas dentro de la ventana
                for (const [opId, operation] of detector.operations) {
                    const endTime = operation.endTime || now;
                    
                    if (now - operation.startTime <= detector.window) {
                        activeOperations.push({
                            id: opId,
                            ...operation
                        });
                    }
                }
                
                // Verificar si hay demasiadas operaciones concurrentes
                if (activeOperations.length > detector.maxConcurrent) {
                    const violation = {
                        timestamp: now,
                        operations: activeOperations.map(op => op.id),
                        count: activeOperations.length,
                        maxAllowed: detector.maxConcurrent
                    };
                    
                    detector.violations.push(violation);
                    ConcurrencyController.state.metrics.raceConditionsDetected++;
                    
                    // Emitir evento de race condition
                    ConcurrencyController.emitRaceConditionEvent(detector.resource, violation);
                    
                    return true;
                }
                
                return false;
            },
            
            // Destruir detector
            destroy: function(detectorId) {
                const detector = ConcurrencyController.state.raceDetectors.get(detectorId);
                if (detector) {
                    ConcurrencyController.state.raceDetectors.delete(detectorId);
                    return true;
                }
                return false;
            }
        };
    },

    // Ejecutar operación con reintento
    executeWithRetry: async function(operation, options = {}) {
        const {
            maxRetries = this.config.maxRetries,
            retryDelay = this.config.retryDelay,
            backoff = 'linear',
            onRetry = null
        } = options;

        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Calcular delay con backoff
                let delay = retryDelay;
                if (backoff === 'exponential') {
                    delay = retryDelay * Math.pow(2, attempt);
                } else if (backoff === 'exponential-with-jitter') {
                    delay = retryDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
                }
                
                // Notificar reintento
                if (onRetry) {
                    onRetry(error, attempt + 1, delay);
                }
                
                // Esperar antes de reintentar
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    },

    // Actualizar tiempo promedio de espera
    updateAverageWaitTime: function(duration) {
        const total = ConcurrencyController.state.metrics.totalOperations;
        const current = ConcurrencyController.state.metrics.averageWaitTime;
        
        ConcurrencyController.state.metrics.averageWaitTime = 
            ((current * (total - 1)) + duration) / total;
    },

    // Emitir evento de race condition
    emitRaceConditionEvent: function(resource, violation) {
        const event = new CustomEvent('concurrency:race-condition', {
            detail: {
                resource,
                violation,
                timestamp: Date.now()
            }
        });
        
        if (typeof document !== 'undefined') {
            document.dispatchEvent(event);
        }
        
        this.log(`Race condition detectada en recurso: ${resource}`, 'warn');
    },

    // Generar ID único
    generateId: function() {
        return `conc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Obtener métricas del controlador
    getMetrics: function() {
        return {
            ...this.state.metrics,
            semaphores: this.state.semaphores.size,
            barriers: this.state.barriers.size,
            latches: this.state.latches.size,
            threadPools: this.state.threadPools.size,
            raceDetectors: this.state.raceDetectors.size
        };
    },

    // Reiniciar métricas
    resetMetrics: function() {
        this.state.metrics = {
            totalOperations: 0,
            concurrentOperations: 0,
            maxConcurrentOperations: 0,
            raceConditionsDetected: 0,
            deadlocksPrevented: 0,
            averageWaitTime: 0
        };
        
        this.log('Métricas de concurrencia reiniciadas', 'info');
    },

    // Logging
    log: function(message, level = 'info') {
        if (!this.config.enableLogging) return;
        
        const shouldLog = this.config.logLevel === 'debug' || 
                          (this.config.logLevel === 'info' && ['info', 'warn', 'error'].includes(level)) ||
                          (this.config.logLevel === 'warn' && ['warn', 'error'].includes(level)) ||
                          (this.config.logLevel === 'error' && level === 'error');
        
        if (shouldLog) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [ConcurrencyController] [${level.toUpperCase()}] ${message}`;
            
            if (level === 'error') {
                console.error(logMessage);
            } else if (level === 'warn') {
                console.warn(logMessage);
            } else if (level === 'success') {
                console.log(`%c${logMessage}`, 'color: green');
            } else {
                console.log(logMessage);
            }
        }
    }
};

// Exportar el controlador
export default ConcurrencyController;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.ConcurrencyController = ConcurrencyController;
}