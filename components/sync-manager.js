/**
 * Justice 2 Sync Manager
 * Sistema centralizado de sincronización robusta para Justice 2
 * Proporciona control de concurrencia, detección de deadlocks y recuperación automática
 */

// Importar sistemas existentes
import { XSSProtection } from './xss-protection.js';

const SyncManager = {
    // Configuración del gestor de sincronización
    config: {
        // Tiempos de espera y reintentos
        lockTimeout: 30000,           // 30 segundos máximo para bloqueos
        deadlockDetectionInterval: 5000, // 5 segundos para detección de deadlocks
        retryAttempts: 3,             // Número máximo de reintentos
        retryDelay: 1000,             // Retraso inicial entre reintentos
        
        // Configuración de colas y prioridades
        maxConcurrentOperations: 10,  // Máximo de operaciones concurrentes
        queueSize: 100,               // Tamaño máximo de la cola de operaciones
        
        // Configuración de transacciones
        transactionTimeout: 60000,    // 60 segundos máximo para transacciones
        enableDeadlockDetection: true,
        enableRaceConditionDetection: true,
        
        // Configuración de logging y monitoreo
        enableLogging: true,
        logLevel: 'info',             // 'debug', 'info', 'warn', 'error'
        enableMetrics: true,
        
        // Configuración de recuperación
        enableAutoRecovery: true,
        recoveryAttempts: 3,
        recoveryDelay: 2000
    },

    // Estado del gestor de sincronización
    state: {
        initialized: false,
        locks: new Map(),              // Mapa de bloqueos activos
        queues: new Map(),             // Mapa de colas por recurso
        transactions: new Map(),      // Mapa de transacciones activas
        operations: new Map(),         // Mapa de operaciones en curso
        deadlockGraph: new Map(),      // Grafo de dependencias para detección de deadlocks
        metrics: {
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            deadlocksDetected: 0,
            raceConditionsDetected: 0,
            averageOperationTime: 0,
            lockContentions: 0
        },
        observers: new Set(),          // Observadores del patrón Observer
        subscribers: new Map(),       // Suscriptores del patrón Publisher-Subscriber
        lastCleanup: Date.now()
    },

    // Inicialización del SyncManager
    init: function() {
        if (this.state.initialized) {
            this.log('SyncManager ya está inicializado', 'warn');
            return;
        }

        try {
            this.log('Inicializando SyncManager...');
            
            // Configurar detección automática de deadlocks
            if (this.config.enableDeadlockDetection) {
                this.setupDeadlockDetection();
            }
            
            // Configurar limpieza periódica
            this.setupPeriodicCleanup();
            
            // Configurar manejo de errores globales
            this.setupGlobalErrorHandling();
            
            // Inicializar subsistemas
            this.initializeLockManager();
            this.initializeQueueManager();
            this.initializeTransactionManager();
            this.initializeEventSystem();
            
            this.state.initialized = true;
            this.log('SyncManager inicializado correctamente', 'success');
            
            // Emitir evento de inicialización completa
            this.emitEvent('sync:initialized', {
                timestamp: Date.now(),
                config: this.config
            });
            
        } catch (error) {
            this.log('Error inicializando SyncManager: ' + error.message, 'error');
            throw error;
        }
    },

    // Inicializar el gestor de bloqueos
    initializeLockManager: function() {
        this.LockManager = {
            // Adquirir un bloqueo sobre un recurso
            acquire: async (resource, options = {}) => {
                const {
                    timeout = SyncManager.config.lockTimeout,
                    priority = 5,
                    metadata = {}
                } = options;

                const lockId = SyncManager.generateId();
                const startTime = Date.now();
                
                SyncManager.log(`Intentando adquirir bloqueo para recurso: ${resource}`, 'debug');

                // Verificar si ya existe un bloqueo
                if (SyncManager.state.locks.has(resource)) {
                    const existingLock = SyncManager.state.locks.get(resource);
                    
                    // Verificar si el bloqueo está expirado
                    if (Date.now() - existingLock.timestamp > existingLock.timeout) {
                        SyncManager.log(`Bloqueo expirado detectado para recurso: ${resource}`, 'warn');
                        SyncManager.releaseLock(resource, existingLock.id);
                    } else {
                        // Bloqueo válido, agregar a la cola de espera
                        return await SyncManager.QueueManager.enqueue(resource, {
                            type: 'lock',
                            priority,
                            timeout,
                            metadata,
                            lockId
                        });
                    }
                }

                // Crear nuevo bloqueo
                const lock = {
                    id: lockId,
                    resource,
                    timestamp: Date.now(),
                    timeout,
                    priority,
                    metadata,
                    holder: SyncManager.getCurrentContext()
                };

                SyncManager.state.locks.set(resource, lock);
                
                // Actualizar métricas
                SyncManager.state.metrics.totalOperations++;
                
                SyncManager.log(`Bloqueo adquirido para recurso: ${resource} (ID: ${lockId})`, 'success');
                
                // Emitir evento de bloqueo adquirido
                SyncManager.emitEvent('sync:lock:acquired', {
                    resource,
                    lockId,
                    holder: lock.holder,
                    waitTime: Date.now() - startTime
                });

                return {
                    success: true,
                    lockId,
                    resource,
                    acquired: true
                };
            },

            // Liberar un bloqueo
            release: async (resource, lockId) => {
                SyncManager.log(`Intentando liberar bloqueo para recurso: ${resource}`, 'debug');

                const lock = SyncManager.state.locks.get(resource);
                
                if (!lock) {
                    SyncManager.log(`No se encontró bloqueo para recurso: ${resource}`, 'warn');
                    return { success: false, reason: 'Lock not found' };
                }

                if (lock.id !== lockId) {
                    SyncManager.log(`ID de bloqueo inválido para recurso: ${resource}`, 'error');
                    return { success: false, reason: 'Invalid lock ID' };
                }

                // Liberar el bloqueo
                SyncManager.state.locks.delete(resource);
                
                // Procesar siguiente en la cola si existe
                await SyncManager.QueueManager.processNext(resource);
                
                SyncManager.log(`Bloqueo liberado para recurso: ${resource} (ID: ${lockId})`, 'success');
                
                // Emitir evento de bloqueo liberado
                SyncManager.emitEvent('sync:lock:released', {
                    resource,
                    lockId,
                    holder: lock.holder
                });

                return { success: true, resource, lockId };
            },

            // Verificar si un recurso está bloqueado
            isLocked: (resource) => {
                const lock = SyncManager.state.locks.get(resource);
                if (!lock) return false;
                
                // Verificar si el bloqueo está expirado
                if (Date.now() - lock.timestamp > lock.timeout) {
                    SyncManager.state.locks.delete(resource);
                    return false;
                }
                
                return true;
            },

            // Obtener información de un bloqueo
            getLockInfo: (resource) => {
                return SyncManager.state.locks.get(resource) || null;
            },

            // Forzar liberación de todos los bloqueos (emergency)
            releaseAll: () => {
                const releasedLocks = Array.from(SyncManager.state.locks.entries());
                SyncManager.state.locks.clear();
                
                SyncManager.log(`Liberados ${releasedLocks.length} bloqueos (emergency)`, 'warn');
                
                // Emitir evento de liberación masiva
                SyncManager.emitEvent('sync:lock:released-all', {
                    count: releasedLocks.length,
                    locks: releasedLocks
                });

                return releasedLocks.length;
            }
        };
    },

    // Inicializar el gestor de colas
    initializeQueueManager: function() {
        this.QueueManager = {
            // Agregar operación a la cola
            enqueue: async (resource, operation) => {
                if (!SyncManager.state.queues.has(resource)) {
                    SyncManager.state.queues.set(resource, []);
                }

                const queue = SyncManager.state.queues.get(resource);
                
                // Verificar tamaño máximo de la cola
                if (queue.length >= SyncManager.config.queueSize) {
                    SyncManager.log(`Cola llena para recurso: ${resource}`, 'error');
                    return { success: false, reason: 'Queue full' };
                }

                // Agregar operación a la cola manteniendo orden por prioridad
                const queueItem = {
                    ...operation,
                    timestamp: Date.now(),
                    id: SyncManager.generateId()
                };

                // Insertar manteniendo orden por prioridad (menor número = mayor prioridad)
                let insertIndex = queue.length;
                for (let i = 0; i < queue.length; i++) {
                    if (queue[i].priority > queueItem.priority) {
                        insertIndex = i;
                        break;
                    }
                }

                queue.splice(insertIndex, 0, queueItem);
                
                SyncManager.log(`Operación agregada a cola para recurso: ${resource} (prioridad: ${operation.priority})`, 'debug');
                
                // Actualizar métricas de contention
                if (queue.length > 1) {
                    SyncManager.state.metrics.lockContentions++;
                }

                // Esperar a que se procese la operación
                return await this.waitForProcessing(resource, queueItem.id);
            },

            // Esperar a que se procese una operación en cola
            waitForProcessing: async (resource, operationId) => {
                return new Promise((resolve, reject) => {
                    const checkInterval = setInterval(() => {
                        const queue = SyncManager.state.queues.get(resource);
                        const operation = queue?.find(item => item.id === operationId);
                        
                        if (!operation) {
                            clearInterval(checkInterval);
                            resolve({ success: true, processed: true });
                        }
                        
                        // Verificar timeout
                        if (Date.now() - operation.timestamp > operation.timeout) {
                            clearInterval(checkInterval);
                            SyncManager.log(`Timeout en cola para recurso: ${resource}`, 'warn');
                            reject(new Error('Queue timeout'));
                        }
                    }, 100);
                });
            },

            // Procesar siguiente operación en la cola
            processNext: async (resource) => {
                const queue = SyncManager.state.queues.get(resource);
                if (!queue || queue.length === 0) {
                    return { success: false, reason: 'Empty queue' };
                }

                const nextOperation = queue.shift();
                
                if (nextOperation.type === 'lock') {
                    // Procesar solicitud de bloqueo
                    const lock = {
                        id: nextOperation.lockId,
                        resource,
                        timestamp: Date.now(),
                        timeout: nextOperation.timeout,
                        priority: nextOperation.priority,
                        metadata: nextOperation.metadata,
                        holder: SyncManager.getCurrentContext()
                    };

                    SyncManager.state.locks.set(resource, lock);
                    
                    SyncManager.log(`Bloqueo adquirido desde cola para recurso: ${resource}`, 'success');
                    
                    // Emitir evento de bloqueo adquirido desde cola
                    SyncManager.emitEvent('sync:lock:acquired-from-queue', {
                        resource,
                        lockId: lock.id,
                        holder: lock.holder,
                        queueWaitTime: Date.now() - nextOperation.timestamp
                    });

                    return { success: true, lockId: lock.id };
                }

                return { success: false, reason: 'Unknown operation type' };
            },

            // Obtener estado de la cola
            getQueueStatus: (resource) => {
                const queue = SyncManager.state.queues.get(resource);
                return {
                    length: queue ? queue.length : 0,
                    items: queue ? [...queue] : []
                };
            },

            // Limpiar cola de un recurso
            clearQueue: (resource) => {
                const queue = SyncManager.state.queues.get(resource);
                if (queue) {
                    const clearedCount = queue.length;
                    SyncManager.state.queues.delete(resource);
                    
                    SyncManager.log(`Cola limpiada para recurso: ${resource} (${clearedCount} items)`, 'info');
                    
                    return clearedCount;
                }
                return 0;
            }
        };
    },

    // Inicializar el gestor de transacciones
    initializeTransactionManager: function() {
        this.TransactionManager = {
            // Iniciar una transacción
            begin: async (options = {}) => {
                const {
                    timeout = SyncManager.config.transactionTimeout,
                    isolation = 'READ_COMMITTED',
                    metadata = {}
                } = options;

                const transactionId = SyncManager.generateId();
                const transaction = {
                    id: transactionId,
                    status: 'ACTIVE',
                    startTime: Date.now(),
                    timeout,
                    isolation,
                    metadata,
                    operations: [],
                    locks: new Set(),
                    rollbackData: new Map()
                };

                SyncManager.state.transactions.set(transactionId, transaction);
                
                SyncManager.log(`Transacción iniciada: ${transactionId}`, 'debug');
                
                // Emitir evento de transacción iniciada
                SyncManager.emitEvent('sync:transaction:begin', {
                    transactionId,
                    isolation,
                    metadata
                });

                return {
                    success: true,
                    transactionId,
                    transaction
                };
            },

            // Confirmar una transacción
            commit: async (transactionId) => {
                const transaction = SyncManager.state.transactions.get(transactionId);
                
                if (!transaction) {
                    return { success: false, reason: 'Transaction not found' };
                }

                if (transaction.status !== 'ACTIVE') {
                    return { success: false, reason: 'Transaction not active' };
                }

                try {
                    // Ejecutar todas las operaciones de la transacción
                    for (const operation of transaction.operations) {
                        await this.executeOperation(operation);
                    }

                    // Liberar todos los bloqueos de la transacción
                    for (const lockResource of transaction.locks) {
                        await SyncManager.LockManager.release(lockResource, transactionId);
                    }

                    // Actualizar estado de la transacción
                    transaction.status = 'COMMITTED';
                    transaction.endTime = Date.now();
                    
                    // Limpiar transacción después de un tiempo
                    setTimeout(() => {
                        SyncManager.state.transactions.delete(transactionId);
                    }, 5000);

                    SyncManager.log(`Transacción confirmada: ${transactionId}`, 'success');
                    
                    // Actualizar métricas
                    SyncManager.state.metrics.successfulOperations++;
                    
                    // Emitir evento de transacción confirmada
                    SyncManager.emitEvent('sync:transaction:committed', {
                        transactionId,
                        duration: transaction.endTime - transaction.startTime,
                        operations: transaction.operations.length
                    });

                    return { success: true, transactionId };
                    
                } catch (error) {
                    // Si hay error, hacer rollback automático
                    await this.rollback(transactionId);
                    throw error;
                }
            },

            // Revertir una transacción
            rollback: async (transactionId) => {
                const transaction = SyncManager.state.transactions.get(transactionId);
                
                if (!transaction) {
                    return { success: false, reason: 'Transaction not found' };
                }

                try {
                    // Restaurar datos desde rollbackData
                    for (const [key, value] of transaction.rollbackData) {
                        await this.restoreData(key, value);
                    }

                    // Liberar todos los bloqueos de la transacción
                    for (const lockResource of transaction.locks) {
                        await SyncManager.LockManager.release(lockResource, transactionId);
                    }

                    // Actualizar estado de la transacción
                    transaction.status = 'ROLLED_BACK';
                    transaction.endTime = Date.now();
                    
                    // Limpiar transacción después de un tiempo
                    setTimeout(() => {
                        SyncManager.state.transactions.delete(transactionId);
                    }, 5000);

                    SyncManager.log(`Transacción revertida: ${transactionId}`, 'warn');
                    
                    // Actualizar métricas
                    SyncManager.state.metrics.failedOperations++;
                    
                    // Emitir evento de transacción revertida
                    SyncManager.emitEvent('sync:transaction:rolled-back', {
                        transactionId,
                        duration: transaction.endTime - transaction.startTime,
                        operations: transaction.operations.length
                    });

                    return { success: true, transactionId };
                    
                } catch (error) {
                    SyncManager.log(`Error en rollback de transacción ${transactionId}: ${error.message}`, 'error');
                    throw error;
                }
            },

            // Agregar operación a una transacción
            addOperation: (transactionId, operation) => {
                const transaction = SyncManager.state.transactions.get(transactionId);
                
                if (!transaction) {
                    return { success: false, reason: 'Transaction not found' };
                }

                if (transaction.status !== 'ACTIVE') {
                    return { success: false, reason: 'Transaction not active' };
                }

                transaction.operations.push(operation);
                
                return { success: true, transactionId, operation };
            },

            // Ejecutar operación dentro de transacción
            executeOperation: async (operation) => {
                // Implementación específica según el tipo de operación
                switch (operation.type) {
                    case 'write':
                        return await this.executeWriteOperation(operation);
                    case 'read':
                        return await this.executeReadOperation(operation);
                    case 'delete':
                        return await this.executeDeleteOperation(operation);
                    default:
                        throw new Error(`Unknown operation type: ${operation.type}`);
                }
            },

            // Ejecutar operación de escritura
            executeWriteOperation: async (operation) => {
                // Guardar datos para rollback
                const currentValue = await this.getCurrentData(operation.key);
                operation.transaction.rollbackData.set(operation.key, currentValue);
                
                // Ejecutar la operación
                return await this.performWrite(operation);
            },

            // Ejecutar operación de lectura
            executeReadOperation: async (operation) => {
                return await this.performRead(operation);
            },

            // Ejecutar operación de eliminación
            executeDeleteOperation: async (operation) => {
                // Guardar datos para rollback
                const currentValue = await this.getCurrentData(operation.key);
                operation.transaction.rollbackData.set(operation.key, currentValue);
                
                // Ejecutar la operación
                return await this.performDelete(operation);
            },

            // Métodos placeholder para operaciones específicas
            getCurrentData: async (key) => {
                // Implementación específica del sistema
                return null;
            },

            restoreData: async (key, value) => {
                // Implementación específica del sistema
            },

            performWrite: async (operation) => {
                // Implementación específica del sistema
            },

            performRead: async (operation) => {
                // Implementación específica del sistema
            },

            performDelete: async (operation) => {
                // Implementación específica del sistema
            }
        };
    },

    // Inicializar el sistema de eventos
    initializeEventSystem: function() {
        this.EventSystem = {
            // Patrón Observer
            observers: new Map(),
            
            // Suscribir a eventos (Observer pattern)
            subscribe: (eventType, callback) => {
                if (!SyncManager.state.observers.has(eventType)) {
                    SyncManager.state.observers.set(eventType, new Set());
                }
                
                const observerId = SyncManager.generateId();
                SyncManager.state.observers.get(eventType).add({
                    id: observerId,
                    callback
                });
                
                return observerId;
            },
            
            // Desuscribir de eventos
            unsubscribe: (eventType, observerId) => {
                const observers = SyncManager.state.observers.get(eventType);
                if (observers) {
                    for (const observer of observers) {
                        if (observer.id === observerId) {
                            observers.delete(observer);
                            return true;
                        }
                    }
                }
                return false;
            },
            
            // Publicar evento (Observer pattern)
            publish: (eventType, data) => {
                const observers = SyncManager.state.observers.get(eventType);
                if (observers) {
                    for (const observer of observers) {
                        try {
                            observer.callback(data);
                        } catch (error) {
                            SyncManager.log(`Error en observer para evento ${eventType}: ${error.message}`, 'error');
                        }
                    }
                }
            },
            
            // Patrón Publisher-Subscriber
            subscribers: new Map(),
            
            // Suscribir a canal (PubSub pattern)
            subscribeToChannel: (channel, callback) => {
                if (!SyncManager.state.subscribers.has(channel)) {
                    SyncManager.state.subscribers.set(channel, new Set());
                }
                
                const subscriptionId = SyncManager.generateId();
                SyncManager.state.subscribers.get(channel).add({
                    id: subscriptionId,
                    callback
                });
                
                return subscriptionId;
            },
            
            // Desuscribir de canal
            unsubscribeFromChannel: (channel, subscriptionId) => {
                const subscribers = SyncManager.state.subscribers.get(channel);
                if (subscribers) {
                    for (const subscriber of subscribers) {
                        if (subscriber.id === subscriptionId) {
                            subscribers.delete(subscriber);
                            return true;
                        }
                    }
                }
                return false;
            },
            
            // Publicar en canal (PubSub pattern)
            publishToChannel: (channel, message) => {
                const subscribers = SyncManager.state.subscribers.get(channel);
                if (subscribers) {
                    for (const subscriber of subscribers) {
                        try {
                            subscriber.callback(message);
                        } catch (error) {
                            SyncManager.log(`Error en subscriber para canal ${channel}: ${error.message}`, 'error');
                        }
                    }
                }
            }
        };
    },

    // Configurar detección de deadlocks
    setupDeadlockDetection: function() {
        setInterval(() => {
            this.detectDeadlocks();
        }, this.config.deadlockDetectionInterval);
    },

    // Detectar deadlocks usando algoritmo de detección de ciclos
    detectDeadlocks: function() {
        const graph = this.buildDependencyGraph();
        const cycles = this.findCycles(graph);
        
        if (cycles.length > 0) {
            this.state.metrics.deadlocksDetected++;
            this.handleDeadlocks(cycles);
        }
    },

    // Construir grafo de dependencias
    buildDependencyGraph: function() {
        const graph = new Map();
        
        // Construir grafo basado en bloqueos y colas de espera
        for (const [resource, lock] of this.state.locks) {
            if (!graph.has(lock.holder)) {
                graph.set(lock.holder, new Set());
            }
            
            // Agregar dependencias desde la cola de espera
            const queue = this.state.queues.get(resource);
            if (queue) {
                for (const waitingOperation of queue) {
                    graph.get(lock.holder).add(waitingOperation.holder);
                }
            }
        }
        
        return graph;
    },

    // Encontrar ciclos en el grafo (algoritmo de DFS)
    findCycles: function(graph) {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        
        const dfs = (node, path) => {
            if (recursionStack.has(node)) {
                // Encontrado ciclo
                const cycleStart = path.indexOf(node);
                cycles.push(path.slice(cycleStart).concat(node));
                return;
            }
            
            if (visited.has(node)) {
                return;
            }
            
            visited.add(node);
            recursionStack.add(node);
            
            const neighbors = graph.get(node);
            if (neighbors) {
                for (const neighbor of neighbors) {
                    dfs(neighbor, [...path, node]);
                }
            }
            
            recursionStack.delete(node);
        };
        
        for (const node of graph.keys()) {
            if (!visited.has(node)) {
                dfs(node, []);
            }
        }
        
        return cycles;
    },

    // Manejar deadlocks detectados
    handleDeadlocks: function(cycles) {
        this.log(`Deadlocks detectados: ${cycles.length}`, 'error');
        
        for (const cycle of cycles) {
            // Seleccionar víctima (el que tenga menor prioridad o más reciente)
            const victim = this.selectDeadlockVictim(cycle);
            
            // Liberar recursos de la víctima
            this.releaseVictimResources(victim);
            
            // Emitir evento de deadlock resuelto
            this.emitEvent('sync:deadlock:resolved', {
                cycle,
                victim,
                timestamp: Date.now()
            });
        }
    },

    // Seleccionar víctima para resolver deadlock
    selectDeadlockVictim: function(cycle) {
        // Estrategia simple: seleccionar el proceso con menor prioridad
        let victim = cycle[0];
        let lowestPriority = this.getProcessPriority(victim);
        
        for (let i = 1; i < cycle.length; i++) {
            const priority = this.getProcessPriority(cycle[i]);
            if (priority < lowestPriority) {
                victim = cycle[i];
                lowestPriority = priority;
            }
        }
        
        return victim;
    },

    // Obtener prioridad de un proceso
    getProcessPriority: function(processId) {
        // Implementación específica para obtener prioridad
        return 5; // Prioridad por defecto
    },

    // Liberar recursos de la víctima
    releaseVictimResources: function(victim) {
        // Liberar todos los bloqueos de la víctima
        for (const [resource, lock] of this.state.locks) {
            if (lock.holder === victim) {
                this.LockManager.release(resource, lock.id);
            }
        }
        
        // Cancelar operaciones en cola
        for (const [resource, queue] of this.state.queues) {
            const filteredQueue = queue.filter(op => op.holder !== victim);
            this.state.queues.set(resource, filteredQueue);
        }
    },

    // Configurar limpieza periódica
    setupPeriodicCleanup: function() {
        setInterval(() => {
            this.performCleanup();
        }, 60000); // Cada minuto
    },

    // Realizar limpieza de recursos expirados
    performCleanup: function() {
        const now = Date.now();
        
        // Limpiar bloqueos expirados
        for (const [resource, lock] of this.state.locks) {
            if (now - lock.timestamp > lock.timeout) {
                this.LockManager.release(resource, lock.id);
                this.log(`Bloqueo expirado limpiado: ${resource}`, 'warn');
            }
        }
        
        // Limpiar transacciones expiradas
        for (const [transactionId, transaction] of this.state.transactions) {
            if (now - transaction.startTime > transaction.timeout) {
                this.TransactionManager.rollback(transactionId);
                this.log(`Transacción expirada limpiada: ${transactionId}`, 'warn');
            }
        }
        
        // Limpiar operaciones expiradas en colas
        for (const [resource, queue] of this.state.queues) {
            const filteredQueue = queue.filter(op => 
                now - op.timestamp <= op.timeout
            );
            this.state.queues.set(resource, filteredQueue);
        }
        
        this.state.lastCleanup = now;
    },

    // Configurar manejo de errores globales
    setupGlobalErrorHandling: function() {
        // Capturar errores no manejados que puedan afectar la sincronización
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.handleGlobalError(event.error);
            });
            
            window.addEventListener('unhandledrejection', (event) => {
                this.handleGlobalError(event.reason);
            });
        }
    },

    // Manejar errores globales
    handleGlobalError: function(error) {
        this.log(`Error global detectado: ${error.message}`, 'error');
        
        // Emitir evento de error global
        this.emitEvent('sync:global-error', {
            error: error.message,
            stack: error.stack,
            timestamp: Date.now()
        });
        
        // Intentar recuperación automática si está habilitada
        if (this.config.enableAutoRecovery) {
            this.attemptErrorRecovery(error);
        }
    },

    // Intentar recuperación automática de errores
    attemptErrorRecovery: async function(error) {
        this.log('Intentando recuperación automática...', 'info');
        
        for (let attempt = 1; attempt <= this.config.recoveryAttempts; attempt++) {
            try {
                // Esperar antes de reintentar
                await new Promise(resolve => 
                    setTimeout(resolve, this.config.recoveryDelay * attempt)
                );
                
                // Validar estado del sistema
                const healthCheck = await this.healthCheck();
                
                if (healthCheck.status === 'healthy') {
                    this.log(`Recuperación exitosa en intento ${attempt}`, 'success');
                    
                    // Emitir evento de recuperación exitosa
                    this.emitEvent('sync:recovery:success', {
                        attempt,
                        error: error.message,
                        timestamp: Date.now()
                    });
                    
                    return true;
                }
                
            } catch (recoveryError) {
                this.log(`Error en recuperación intento ${attempt}: ${recoveryError.message}`, 'error');
            }
        }
        
        this.log('Recuperación automática fallida', 'error');
        
        // Emitir evento de recuperación fallida
        this.emitEvent('sync:recovery:failed', {
            attempts: this.config.recoveryAttempts,
            error: error.message,
            timestamp: Date.now()
        });
        
        return false;
    },

    // Ejecutar operación con sincronización
    executeWithSync: async function(operation, options = {}) {
        const {
            resource = 'default',
            lockTimeout = this.config.lockTimeout,
            priority = 5,
            transactionId = null,
            metadata = {}
        } = options;

        const startTime = Date.now();
        
        try {
            // Adquirir bloqueo
            const lockResult = await this.LockManager.acquire(resource, {
                timeout: lockTimeout,
                priority,
                metadata
            });
            
            if (!lockResult.success) {
                throw new Error(`No se pudo adquirir bloqueo: ${lockResult.reason}`);
            }
            
            // Ejecutar operación
            const result = await this.executeOperation(operation, {
                resource,
                lockId: lockResult.lockId,
                transactionId,
                metadata
            });
            
            // Liberar bloqueo
            await this.LockManager.release(resource, lockResult.lockId);
            
            // Actualizar métricas
            this.state.metrics.successfulOperations++;
            const duration = Date.now() - startTime;
            this.updateAverageOperationTime(duration);
            
            // Emitir evento de operación completada
            this.emitEvent('sync:operation:completed', {
                resource,
                duration,
                success: true,
                result
            });
            
            return {
                success: true,
                result,
                duration
            };
            
        } catch (error) {
            // Actualizar métricas
            this.state.metrics.failedOperations++;
            
            // Emitir evento de operación fallida
            this.emitEvent('sync:operation:failed', {
                resource,
                duration: Date.now() - startTime,
                success: false,
                error: error.message
            });
            
            throw error;
        }
    },

    // Ejecutar operación específica
    executeOperation: async function(operation, context) {
        // Validar y sanitizar operación
        if (typeof operation !== 'function') {
            throw new Error('La operación debe ser una función');
        }
        
        // Ejecutar operación con contexto de sincronización
        return await operation(context);
    },

    // Actualizar tiempo promedio de operación
    updateAverageOperationTime: function(duration) {
        const total = this.state.metrics.totalOperations;
        const current = this.state.metrics.averageOperationTime;
        
        this.state.metrics.averageOperationTime = 
            ((current * (total - 1)) + duration) / total;
    },

    // Obtener contexto actual
    getCurrentContext: function() {
        return {
            timestamp: Date.now(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
            url: typeof window !== 'undefined' ? window.location.href : 'server',
            threadId: this.getCurrentThreadId()
        };
    },

    // Obtener ID del hilo actual (simulado para JavaScript)
    getCurrentThreadId: function() {
        return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Generar ID único
    generateId: function() {
        return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Emitir evento
    emitEvent: function(eventType, data) {
        // Usar el sistema de eventos
        if (this.EventSystem) {
            this.EventSystem.publish(eventType, data);
        }
        
        // También emitir como evento DOM si está disponible
        if (typeof document !== 'undefined') {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    },

    // Realizar chequeo de salud del sistema
    healthCheck: async function() {
        const health = {
            status: 'healthy',
            timestamp: Date.now(),
            checks: {},
            metrics: this.getMetrics()
        };
        
        try {
            // Verificar estado de bloqueos
            health.checks.locks = {
                active: this.state.locks.size,
                maxAllowed: this.config.maxConcurrentOperations,
                status: this.state.locks.size <= this.config.maxConcurrentOperations ? 'ok' : 'warning'
            };
            
            // Verificar estado de colas
            let totalQueueSize = 0;
            for (const queue of this.state.queues.values()) {
                totalQueueSize += queue.length;
            }
            
            health.checks.queues = {
                totalSize: totalQueueSize,
                maxSize: this.config.queueSize * this.state.queues.size,
                status: totalQueueSize <= this.config.queueSize * this.state.queues.size ? 'ok' : 'warning'
            };
            
            // Verificar estado de transacciones
            health.checks.transactions = {
                active: this.state.transactions.size,
                status: this.state.transactions.size <= 10 ? 'ok' : 'warning' // Límite arbitrario
            };
            
            // Verificar última limpieza
            const timeSinceLastCleanup = Date.now() - this.state.lastCleanup;
            health.checks.cleanup = {
                lastCleanup: this.state.lastCleanup,
                timeSinceLastCleanup,
                status: timeSinceLastCleanup <= 120000 ? 'ok' : 'warning' // 2 minutos máximo
            };
            
            // Determinar estado general
            const hasWarnings = Object.values(health.checks).some(check => check.status === 'warning');
            if (hasWarnings) {
                health.status = 'degraded';
            }
            
        } catch (error) {
            health.status = 'error';
            health.error = error.message;
        }
        
        return health;
    },

    // Obtener métricas del sistema
    getMetrics: function() {
        return {
            ...this.state.metrics,
            locks: {
                active: this.state.locks.size,
                total: this.state.metrics.totalOperations
            },
            queues: {
                totalQueues: this.state.queues.size,
                totalItems: Array.from(this.state.queues.values())
                    .reduce((total, queue) => total + queue.length, 0)
            },
            transactions: {
                active: this.state.transactions.size
            },
            uptime: Date.now() - (this.state.initTime || Date.now())
        };
    },

    // Reiniciar métricas
    resetMetrics: function() {
        this.state.metrics = {
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            deadlocksDetected: 0,
            raceConditionsDetected: 0,
            averageOperationTime: 0,
            lockContentions: 0
        };
        
        this.log('Métricas reiniciadas', 'info');
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
            const logMessage = `[${timestamp}] [SyncManager] [${level.toUpperCase()}] ${message}`;
            
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

// Exportar el SyncManager
export default SyncManager;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.SyncManager = SyncManager;
}