/**
 * Justice 2 Sync Diagnostics
 * Sistema de detección y recuperación de problemas de sincronización
 * Proporciona monitoreo, diagnóstico y recuperación automática
 */

import { XSSProtection } from './xss-protection.js';

const SyncDiagnostics = {
    // Configuración del sistema de diagnóstico
    config: {
        // Configuración de monitoreo
        monitoringInterval: 5000,        // 5 segundos
        healthCheckInterval: 10000,       // 10 segundos
        metricsRetention: 24 * 60 * 60 * 1000, // 24 horas
        
        // Umbrales para detección de problemas
        maxResponseTime: 5000,           // 5 segundos
        maxErrorRate: 0.1,               // 10% de error
        maxLockWaitTime: 10000,          // 10 segundos
        maxQueueSize: 50,                 // 50 items en cola
        maxMemoryUsage: 0.8,              // 80% de memoria
        
        // Configuración de recuperación
        enableAutoRecovery: true,
        maxRecoveryAttempts: 3,
        recoveryDelay: 2000,
        
        // Configuración de alertas
        enableAlerts: true,
        alertThreshold: 3,               // 3 errores antes de alertar
        
        // Configuración de logging
        enableLogging: true,
        logLevel: 'info',
        enableDetailedTraces: false
    },

    // Estado del sistema de diagnóstico
    state: {
        initialized: false,
        monitoringActive: false,
        healthCheckActive: false,
        
        // Métricas
        metrics: {
            operations: new Map(),
            errors: new Map(),
            responseTimes: [],
            lockWaitTimes: [],
            queueSizes: [],
            memoryUsage: [],
            errorCounts: new Map(),
            lastHealthCheck: null,
            lastCleanup: Date.now()
        },
        
        // Estado de salud
        health: {
            status: 'unknown', // 'healthy', 'degraded', 'error', 'critical'
            issues: [],
            lastCheck: null,
            checks: {}
        },
        
        // Sistema de alertas
        alerts: {
            active: new Map(),
            history: [],
            counters: new Map()
        },
        
        // Sistema de recuperación
        recovery: {
            attempts: new Map(),
            inProgress: new Set(),
            lastAttempt: null
        }
    },

    // Inicialización del sistema de diagnóstico
    init: function() {
        if (this.state.initialized) {
            this.log('SyncDiagnostics ya está inicializado', 'warn');
            return;
        }

        try {
            this.log('Inicializando SyncDiagnostics...');
            
            // Configurar monitoreo
            this.setupMonitoring();
            
            // Configurar chequeos de salud
            this.setupHealthChecks();
            
            // Configurar manejo de alertas
            this.setupAlertSystem();
            
            // Configurar limpieza periódica
            this.setupPeriodicCleanup();
            
            // Configurar captura de errores globales
            this.setupGlobalErrorCapture();
            
            this.state.initialized = true;
            this.log('SyncDiagnostics inicializado correctamente', 'success');
            
            // Emitir evento de inicialización
            this.emitEvent('sync:diagnostics:initialized', {
                timestamp: Date.now(),
                config: this.config
            });
            
        } catch (error) {
            this.log('Error inicializando SyncDiagnostics: ' + error.message, 'error');
            throw error;
        }
    },

    // Configurar monitoreo continuo
    setupMonitoring: function() {
        if (this.state.monitoringActive) return;
        
        this.state.monitoringActive = true;
        
        // Monitorear operaciones de sincronización
        this.monitorInterval = setInterval(() => {
            this.collectMetrics();
            this.analyzeMetrics();
        }, this.config.monitoringInterval);
        
        this.log('Monitoreo continuo configurado', 'info');
    },

    // Configurar chequeos de salud
    setupHealthChecks: function() {
        if (this.state.healthCheckActive) return;
        
        this.state.healthCheckActive = true;
        
        // Realizar chequeos de salud periódicos
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);
        
        this.log('Chequeos de salud configurados', 'info');
    },

    // Configurar sistema de alertas
    setupAlertSystem: function() {
        if (!this.config.enableAlerts) return;
        
        // Escuchar eventos de problemas de sincronización
        if (typeof document !== 'undefined') {
            document.addEventListener('sync:operation:failed', (event) => {
                this.handleOperationFailure(event.detail);
            });
            
            document.addEventListener('sync:lock:timeout', (event) => {
                this.handleLockTimeout(event.detail);
            });
            
            document.addEventListener('sync:deadlock:detected', (event) => {
                this.handleDeadlockDetected(event.detail);
            });
            
            document.addEventListener('concurrency:race-condition', (event) => {
                this.handleRaceCondition(event.detail);
            });
            
            document.addEventListener('sync:recovery:failed', (event) => {
                this.handleRecoveryFailure(event.detail);
            });
        }
        
        this.log('Sistema de alertas configurado', 'info');
    },

    // Configurar limpieza periódica
    setupPeriodicCleanup: function() {
        // Limpiar métricas antiguas cada hora
        setInterval(() => {
            this.cleanupOldMetrics();
        }, 60 * 60 * 1000);
    },

    // Configurar captura de errores globales
    setupGlobalErrorCapture: function() {
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.handleGlobalError(event.error);
            });
            
            window.addEventListener('unhandledrejection', (event) => {
                this.handleGlobalError(event.reason);
            });
        }
    },

    // Colectar métricas del sistema
    collectMetrics: function() {
        const timestamp = Date.now();
        
        try {
            // Colectar métricas de SyncManager si está disponible
            if (typeof SyncManager !== 'undefined' && SyncManager.state.initialized) {
                const syncMetrics = SyncManager.getMetrics();
                
                // Guardar métricas de operaciones
                this.state.metrics.operations.set(timestamp, {
                    total: syncMetrics.totalOperations,
                    successful: syncMetrics.successfulOperations,
                    failed: syncMetrics.failedOperations,
                    concurrent: syncMetrics.concurrentOperations,
                    averageTime: syncMetrics.averageOperationTime
                });
                
                // Guardar métricas de bloqueos
                if (syncMetrics.locks) {
                    this.state.metrics.lockWaitTimes.push({
                        timestamp,
                        active: syncMetrics.locks.active,
                        waitTime: syncMetrics.averageWaitTime || 0
                    });
                }
                
                // Guardar métricas de colas
                if (syncMetrics.queues) {
                    this.state.metrics.queueSizes.push({
                        timestamp,
                        size: syncMetrics.queues.totalItems,
                        queues: syncMetrics.queues.totalQueues
                    });
                }
            }
            
            // Colectar métricas de ConcurrencyController si está disponible
            if (typeof ConcurrencyController !== 'undefined' && ConcurrencyController.state.initialized) {
                const concMetrics = ConcurrencyController.getMetrics();
                
                // Guardar métricas de concurrencia
                this.state.metrics.operations.set(timestamp, {
                    ...this.state.metrics.operations.get(timestamp),
                    concurrent: concMetrics.concurrentOperations,
                    maxConcurrent: concMetrics.maxConcurrentOperations,
                    raceConditions: concMetrics.raceConditionsDetected
                });
            }
            
            // Colectar métricas de memoria
            if (typeof performance !== 'undefined' && performance.memory) {
                const memoryUsage = {
                    timestamp,
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit,
                    percentage: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
                };
                
                this.state.metrics.memoryUsage.push(memoryUsage);
            }
            
        } catch (error) {
            this.log('Error colectando métricas: ' + error.message, 'error');
        }
    },

    // Analizar métricas para detectar problemas
    analyzeMetrics: function() {
        const now = Date.now();
        const windowStart = now - 60000; // Último minuto
        
        try {
            // Analizar tiempos de respuesta
            this.analyzeResponseTimes(windowStart);
            
            // Analizar tasas de error
            this.analyzeErrorRates(windowStart);
            
            // Analizar tiempos de espera de bloqueos
            this.analyzeLockWaitTimes(windowStart);
            
            // Analizar tamaños de cola
            this.analyzeQueueSizes(windowStart);
            
            // Analizar uso de memoria
            this.analyzeMemoryUsage();
            
            // Detectar patrones anómalos
            this.detectAnomalousPatterns();
            
        } catch (error) {
            this.log('Error analizando métricas: ' + error.message, 'error');
        }
    },

    // Analizar tiempos de respuesta
    analyzeResponseTimes: function(windowStart) {
        const recentTimes = this.state.metrics.responseTimes.filter(
            metric => metric.timestamp >= windowStart
        );
        
        if (recentTimes.length === 0) return;
        
        const avgTime = recentTimes.reduce((sum, m) => sum + m.time, 0) / recentTimes.length;
        const maxTime = Math.max(...recentTimes.map(m => m.time));
        
        // Detectar tiempos de respuesta lentos
        if (avgTime > this.config.maxResponseTime) {
            this.raiseAlert('slow-response', {
                average: avgTime,
                maximum: maxTime,
                threshold: this.config.maxResponseTime,
                samples: recentTimes.length
            });
        }
        
        // Detectar picos en tiempos de respuesta
        if (maxTime > this.config.maxResponseTime * 2) {
            this.raiseAlert('response-time-spike', {
                maximum: maxTime,
                threshold: this.config.maxResponseTime * 2,
                timestamp: Date.now()
            });
        }
    },

    // Analizar tasas de error
    analyzeErrorRates: function(windowStart) {
        const recentOperations = Array.from(this.state.metrics.operations.values())
            .filter(op => op.timestamp >= windowStart);
        
        if (recentOperations.length === 0) return;
        
        const totalOperations = recentOperations.reduce((sum, op) => sum + op.total, 0);
        const totalErrors = recentOperations.reduce((sum, op) => sum + op.failed, 0);
        const errorRate = totalErrors / totalOperations;
        
        // Detectar alta tasa de error
        if (errorRate > this.config.maxErrorRate) {
            this.raiseAlert('high-error-rate', {
                errorRate,
                totalErrors,
                totalOperations,
                threshold: this.config.maxErrorRate
            });
        }
        
        // Contar errores por tipo
        const errorCounts = {};
        for (const [timestamp, errors] of this.state.metrics.errors) {
            if (timestamp >= windowStart) {
                for (const error of errors) {
                    errorCounts[error.type] = (errorCounts[error.type] || 0) + 1;
                }
            }
        }
        
        // Detectar errores recurrentes
        for (const [errorType, count] of Object.entries(errorCounts)) {
            if (count >= this.config.alertThreshold) {
                this.raiseAlert('recurrent-error', {
                    type: errorType,
                    count,
                    threshold: this.config.alertThreshold
                });
            }
        }
    },

    // Analizar tiempos de espera de bloqueos
    analyzeLockWaitTimes: function(windowStart) {
        const recentWaits = this.state.metrics.lockWaitTimes.filter(
            metric => metric.timestamp >= windowStart
        );
        
        if (recentWaits.length === 0) return;
        
        const avgWaitTime = recentWaits.reduce((sum, m) => sum + m.waitTime, 0) / recentWaits.length;
        const maxWaitTime = Math.max(...recentWaits.map(m => m.waitTime));
        
        // Detectar largos tiempos de espera
        if (avgWaitTime > this.config.maxLockWaitTime) {
            this.raiseAlert('slow-lock-wait', {
                average: avgWaitTime,
                maximum: maxWaitTime,
                threshold: this.config.maxLockWaitTime
            });
        }
        
        // Detectar posible deadlock
        if (maxWaitTime > this.config.maxLockWaitTime * 3) {
            this.raiseAlert('potential-deadlock', {
                waitTime: maxWaitTime,
                threshold: this.config.maxLockWaitTime * 3
            });
        }
    },

    // Analizar tamaños de cola
    analyzeQueueSizes: function(windowStart) {
        const recentQueues = this.state.metrics.queueSizes.filter(
            metric => metric.timestamp >= windowStart
        );
        
        if (recentQueues.length === 0) return;
        
        const avgSize = recentQueues.reduce((sum, m) => sum + m.size, 0) / recentQueues.length;
        const maxSize = Math.max(...recentQueues.map(m => m.size));
        
        // Detectar colas grandes
        if (avgSize > this.config.maxQueueSize) {
            this.raiseAlert('large-queue', {
                average: avgSize,
                maximum: maxSize,
                threshold: this.config.maxQueueSize
            });
        }
        
        // Detectar crecimiento continuo de cola
        if (recentQueues.length >= 5) {
            const lastFive = recentQueues.slice(-5);
            const isGrowing = lastFive.every((val, i) => 
                i === 0 || val.size >= lastFive[i-1].size
            );
            
            if (isGrowing) {
                this.raiseAlert('queue-growth', {
                    trend: 'growing',
                    samples: lastFive.map(q => q.size)
                });
            }
        }
    },

    // Analizar uso de memoria
    analyzeMemoryUsage: function() {
        if (this.state.metrics.memoryUsage.length === 0) return;
        
        const latest = this.state.metrics.memoryUsage[this.state.metrics.memoryUsage.length - 1];
        
        // Detectar alto uso de memoria
        if (latest.percentage > this.config.maxMemoryUsage) {
            this.raiseAlert('high-memory-usage', {
                percentage: latest.percentage,
                used: latest.used,
                limit: latest.limit,
                threshold: this.config.maxMemoryUsage
            });
        }
        
        // Detectar posible memory leak
        if (this.state.metrics.memoryUsage.length >= 10) {
            const lastTen = this.state.metrics.memoryUsage.slice(-10);
            const isGrowing = lastTen.every((val, i) => 
                i === 0 || val.percentage >= lastTen[i-1].percentage
            );
            
            if (isGrowing && latest.percentage > 0.7) {
                this.raiseAlert('potential-memory-leak', {
                    trend: 'growing',
                    currentUsage: latest.percentage,
                    samples: lastTen.map(m => m.percentage)
                });
            }
        }
    },

    // Detectar patrones anómalos
    detectAnomalousPatterns: function() {
        // Implementar detección de patrones usando estadísticas simples
        this.detectPerformanceDegradation();
        this.detectSynchronizationDrift();
        this.detectCascadingFailures();
    },

    // Detectar degradación de rendimiento
    detectPerformanceDegradation: function() {
        const responseTimes = this.state.metrics.responseTimes.slice(-20);
        if (responseTimes.length < 10) return;
        
        const recent = responseTimes.slice(-5);
        const older = responseTimes.slice(-10, -5);
        
        const recentAvg = recent.reduce((sum, m) => sum + m.time, 0) / recent.length;
        const olderAvg = older.reduce((sum, m) => sum + m.time, 0) / older.length;
        
        // Detectar degradación significativa (>50% más lento)
        if (recentAvg > olderAvg * 1.5) {
            this.raiseAlert('performance-degradation', {
                recentAverage: recentAvg,
                olderAverage: olderAvg,
                degradation: ((recentAvg - olderAvg) / olderAvg) * 100
            });
        }
    },

    // Detectar desincronización
    detectSynchronizationDrift: function() {
        // Analizar si los componentes están sincronizados
        if (typeof SyncManager !== 'undefined' && SyncManager.state.initialized) {
            const health = SyncManager.healthCheck();
            
            if (health.status === 'degraded' || health.status === 'error') {
                this.raiseAlert('synchronization-drift', {
                    healthStatus: health.status,
                    issues: health.issues,
                    checks: health.checks
                });
            }
        }
    },

    // Detectar fallos en cascada
    detectCascadingFailures: function() {
        const recentErrors = Array.from(this.state.metrics.errors.values())
            .flat()
            .filter(error => Date.now() - error.timestamp < 30000); // Últimos 30 segundos
        
        if (recentErrors.length >= 5) {
            // Verificar si los errores están relacionados
            const errorTypes = recentErrors.map(e => e.type);
            const uniqueTypes = [...new Set(errorTypes)];
            
            // Si hay muchos errores del mismo tipo, podría ser una cascada
            if (uniqueTypes.length <= 2) {
                this.raiseAlert('cascading-failures', {
                    errorCount: recentErrors.length,
                    errorTypes,
                    timeWindow: '30 seconds'
                });
            }
        }
    },

    // Realizar chequeo de salud completo
    performHealthCheck: async function() {
        const healthCheck = {
            timestamp: Date.now(),
            status: 'healthy',
            checks: {},
            issues: []
        };
        
        try {
            // Chequear SyncManager
            if (typeof SyncManager !== 'undefined' && SyncManager.state.initialized) {
                const syncHealth = await SyncManager.healthCheck();
                healthCheck.checks.syncManager = syncHealth;
                
                if (syncHealth.status !== 'healthy') {
                    healthCheck.status = syncHealth.status;
                    healthCheck.issues.push(...syncHealth.issues || []);
                }
            } else {
                healthCheck.checks.syncManager = {
                    status: 'unavailable',
                    message: 'SyncManager no está inicializado'
                };
                healthCheck.status = 'degraded';
            }
            
            // Chequear ConcurrencyController
            if (typeof ConcurrencyController !== 'undefined' && ConcurrencyController.state.initialized) {
                const concMetrics = ConcurrencyController.getMetrics();
                healthCheck.checks.concurrencyController = {
                    status: concMetrics.raceConditionsDetected > 0 ? 'warning' : 'healthy',
                    metrics: concMetrics
                };
                
                if (concMetrics.raceConditionsDetected > 0) {
                    healthCheck.issues.push(`Race conditions detectadas: ${concMetrics.raceConditionsDetected}`);
                    if (healthCheck.status === 'healthy') {
                        healthCheck.status = 'degraded';
                    }
                }
            } else {
                healthCheck.checks.concurrencyController = {
                    status: 'unavailable',
                    message: 'ConcurrencyController no está inicializado'
                };
                healthCheck.status = 'degraded';
            }
            
            // Chequear memoria
            if (typeof performance !== 'undefined' && performance.memory) {
                const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
                healthCheck.checks.memory = {
                    status: memoryUsage > this.config.maxMemoryUsage ? 'warning' : 'healthy',
                    usage: memoryUsage,
                    threshold: this.config.maxMemoryUsage
                };
                
                if (memoryUsage > this.config.maxMemoryUsage) {
                    healthCheck.issues.push(`Alto uso de memoria: ${(memoryUsage * 100).toFixed(1)}%`);
                    if (healthCheck.status === 'healthy') {
                        healthCheck.status = 'degraded';
                    }
                }
            }
            
            // Determinar estado final
            if (healthCheck.issues.length === 0) {
                healthCheck.status = 'healthy';
            } else if (healthCheck.issues.length <= 2) {
                healthCheck.status = 'degraded';
            } else {
                healthCheck.status = 'error';
            }
            
            // Actualizar estado de salud
            this.state.health = healthCheck;
            this.state.health.lastCheck = Date.now();
            
            // Emitir evento de chequeo de salud
            this.emitEvent('sync:health-check', healthCheck);
            
            // Si hay problemas y está habilitada la recuperación automática
            if (healthCheck.status !== 'healthy' && this.config.enableAutoRecovery) {
                await this.attemptAutoRecovery(healthCheck);
            }
            
        } catch (error) {
            this.log('Error en chequeo de salud: ' + error.message, 'error');
            healthCheck.status = 'error';
            healthCheck.error = error.message;
        }
        
        return healthCheck;
    },

    // Intentar recuperación automática
    attemptAutoRecovery: async function(healthCheck) {
        if (this.state.recovery.inProgress.has('auto-recovery')) {
            return false;
        }
        
        this.state.recovery.inProgress.add('auto-recovery');
        
        try {
            this.log('Iniciando recuperación automática...', 'warn');
            
            for (let attempt = 1; attempt <= this.config.maxRecoveryAttempts; attempt++) {
                try {
                    // Esperar antes de reintentar
                    if (attempt > 1) {
                        await new Promise(resolve => 
                            setTimeout(resolve, this.config.recoveryDelay * attempt)
                        );
                    }
                    
                    // Intentar diferentes estrategias de recuperación
                    const recoverySuccess = await this.performRecoveryActions(healthCheck);
                    
                    if (recoverySuccess) {
                        this.log(`Recuperación automática exitosa en intento ${attempt}`, 'success');
                        
                        // Emitir evento de recuperación exitosa
                        this.emitEvent('sync:recovery:success', {
                            attempt,
                            healthCheck,
                            timestamp: Date.now()
                        });
                        
                        return true;
                    }
                    
                } catch (error) {
                    this.log(`Error en recuperación intento ${attempt}: ${error.message}`, 'error');
                }
            }
            
            this.log('Recuperación automática fallida después de todos los intentos', 'error');
            
            // Emitir evento de recuperación fallida
            this.emitEvent('sync:recovery:failed', {
                attempts: this.config.maxRecoveryAttempts,
                healthCheck,
                timestamp: Date.now()
            });
            
            return false;
            
        } finally {
            this.state.recovery.inProgress.delete('auto-recovery');
            this.state.recovery.lastAttempt = Date.now();
        }
    },

    // Realizar acciones de recuperación
    performRecoveryActions: async function(healthCheck) {
        let recoverySuccess = false;
        
        try {
            // Recuperación de problemas de memoria
            if (healthCheck.checks.memory?.status === 'warning') {
                await this.performMemoryRecovery();
                recoverySuccess = true;
            }
            
            // Recuperación de problemas de sincronización
            if (healthCheck.checks.syncManager?.status !== 'healthy') {
                await this.performSyncRecovery(healthCheck.checks.syncManager);
                recoverySuccess = true;
            }
            
            // Recuperación de problemas de concurrencia
            if (healthCheck.checks.concurrencyController?.status === 'warning') {
                await this.performConcurrencyRecovery(healthCheck.checks.concurrencyController);
                recoverySuccess = true;
            }
            
            // Verificar si la recuperación fue exitosa
            if (recoverySuccess) {
                const newHealthCheck = await this.performHealthCheck();
                return newHealthCheck.status === 'healthy';
            }
            
        } catch (error) {
            this.log('Error en acciones de recuperación: ' + error.message, 'error');
        }
        
        return false;
    },

    // Recuperación de problemas de memoria
    performMemoryRecovery: async function() {
        this.log('Realizando recuperación de memoria...', 'info');
        
        try {
            // Forzar garbage collection si está disponible
            if (typeof window !== 'undefined' && window.gc) {
                window.gc();
            }
            
            // Limpiar cachés si están disponibles
            if (typeof SyncManager !== 'undefined' && SyncManager.state.initialized) {
                SyncManager.resetMetrics();
            }
            
            if (typeof ConcurrencyController !== 'undefined' && ConcurrencyController.state.initialized) {
                ConcurrencyController.resetMetrics();
            }
            
            // Limpiar métricas antiguas
            this.cleanupOldMetrics();
            
            this.log('Recuperación de memoria completada', 'success');
            return true;
            
        } catch (error) {
            this.log('Error en recuperación de memoria: ' + error.message, 'error');
            return false;
        }
    },

    // Recuperación de problemas de sincronización
    performSyncRecovery: async function(syncHealth) {
        this.log('Realizando recuperación de sincronización...', 'info');
        
        try {
            if (typeof SyncManager !== 'undefined' && SyncManager.state.initialized) {
                // Liberar todos los bloqueos
                SyncManager.LockManager.releaseAll();
                
                // Limpiar todas las colas
                for (const [resource] of SyncManager.state.queues) {
                    SyncManager.QueueManager.clearQueue(resource);
                }
                
                // Reiniciar métricas
                SyncManager.resetMetrics();
                
                this.log('Recuperación de sincronización completada', 'success');
                return true;
            }
            
        } catch (error) {
            this.log('Error en recuperación de sincronización: ' + error.message, 'error');
            return false;
        }
        
        return false;
    },

    // Recuperación de problemas de concurrencia
    performConcurrencyRecovery: async function(concHealth) {
        this.log('Realizando recuperación de concurrencia...', 'info');
        
        try {
            if (typeof ConcurrencyController !== 'undefined' && ConcurrencyController.state.initialized) {
                // Reiniciar métricas
                ConcurrencyController.resetMetrics();
                
                // Destruir detectores de race conditions
                for (const [detectorId] of ConcurrencyController.state.raceDetectors) {
                    ConcurrencyController.RaceDetector.destroy(detectorId);
                }
                
                this.log('Recuperación de concurrencia completada', 'success');
                return true;
            }
            
        } catch (error) {
            this.log('Error en recuperación de concurrencia: ' + error.message, 'error');
            return false;
        }
        
        return false;
    },

    // Manejar fallo de operación
    handleOperationFailure: function(detail) {
        const timestamp = Date.now();
        
        // Registrar error
        if (!this.state.metrics.errors.has(timestamp)) {
            this.state.metrics.errors.set(timestamp, []);
        }
        
        this.state.metrics.errors.get(timestamp).push({
            type: 'operation-failure',
            detail,
            timestamp
        });
        
        // Registrar tiempo de respuesta
        this.state.metrics.responseTimes.push({
            timestamp,
            time: detail.duration || 0,
            success: false
        });
        
        this.log(`Fallo de operación detectado: ${detail.error}`, 'warn');
    },

    // Manejar timeout de bloqueo
    handleLockTimeout: function(detail) {
        const timestamp = Date.now();
        
        // Registrar error
        if (!this.state.metrics.errors.has(timestamp)) {
            this.state.metrics.errors.set(timestamp, []);
        }
        
        this.state.metrics.errors.get(timestamp).push({
            type: 'lock-timeout',
            detail,
            timestamp
        });
        
        // Registrar tiempo de espera
        this.state.metrics.lockWaitTimes.push({
            timestamp,
            waitTime: detail.timeout || 0,
            resource: detail.resource
        });
        
        this.log(`Timeout de bloqueo detectado: ${detail.resource}`, 'warn');
    },

    // Manejar deadlock detectado
    handleDeadlockDetected: function(detail) {
        const timestamp = Date.now();
        
        // Registrar error
        if (!this.state.metrics.errors.has(timestamp)) {
            this.state.metrics.errors.set(timestamp, []);
        }
        
        this.state.metrics.errors.get(timestamp).push({
            type: 'deadlock',
            detail,
            timestamp
        });
        
        this.log(`Deadlock detectado: ${JSON.stringify(detail.cycle)}`, 'error');
        
        // Alerta crítica
        this.raiseAlert('deadlock-detected', {
            cycle: detail.cycle,
            victim: detail.victim,
            timestamp
        }, 'critical');
    },

    // Manejar race condition detectada
    handleRaceCondition: function(detail) {
        const timestamp = Date.now();
        
        // Registrar error
        if (!this.state.metrics.errors.has(timestamp)) {
            this.state.metrics.errors.set(timestamp, []);
        }
        
        this.state.metrics.errors.get(timestamp).push({
            type: 'race-condition',
            detail,
            timestamp
        });
        
        this.log(`Race condition detectada: ${detail.resource}`, 'warn');
    },

    // Manejar fallo de recuperación
    handleRecoveryFailure: function(detail) {
        const timestamp = Date.now();
        
        // Registrar error
        if (!this.state.metrics.errors.has(timestamp)) {
            this.state.metrics.errors.set(timestamp, []);
        }
        
        this.state.metrics.errors.get(timestamp).push({
            type: 'recovery-failure',
            detail,
            timestamp
        });
        
        this.log(`Fallo de recuperación detectado: ${detail.error}`, 'error');
    },

    // Manejar error global
    handleGlobalError: function(error) {
        const timestamp = Date.now();
        
        // Registrar error
        if (!this.state.metrics.errors.has(timestamp)) {
            this.state.metrics.errors.set(timestamp, []);
        }
        
        this.state.metrics.errors.get(timestamp).push({
            type: 'global-error',
            error: error.message || error,
            stack: error.stack,
            timestamp
        });
        
        this.log(`Error global detectado: ${error.message || error}`, 'error');
    },

    // Emitir alerta
    raiseAlert: function(type, data, severity = 'warning') {
        if (!this.config.enableAlerts) return;
        
        const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const alert = {
            id: alertId,
            type,
            severity,
            data,
            timestamp: Date.now()
        };
        
        // Contar alertas por tipo
        const counter = this.state.alerts.counters.get(type) || 0;
        this.state.alerts.counters.set(type, counter + 1);
        
        // Verificar si se debe emitir alerta (basado en umbral)
        if (counter >= this.config.alertThreshold) {
            // Agregar a alertas activas
            this.state.alerts.active.set(alertId, alert);
            
            // Agregar al historial
            this.state.alerts.history.push(alert);
            
            // Limitar historial
            if (this.state.alerts.history.length > 1000) {
                this.state.alerts.history = this.state.alerts.history.slice(-500);
            }
            
            // Emitir evento de alerta
            this.emitEvent('sync:alert', alert);
            
            this.log(`Alerta emitida: ${type} - ${JSON.stringify(data)}`, severity);
        }
    },

    // Limpiar métricas antiguas
    cleanupOldMetrics: function() {
        const cutoff = Date.now() - this.config.metricsRetention;
        
        // Limpiar métricas de operaciones
        for (const [timestamp] of this.state.metrics.operations) {
            if (timestamp < cutoff) {
                this.state.metrics.operations.delete(timestamp);
            }
        }
        
        // Limpiar métricas de errores
        for (const [timestamp] of this.state.metrics.errors) {
            if (timestamp < cutoff) {
                this.state.metrics.errors.delete(timestamp);
            }
        }
        
        // Limpiar arrays de métricas
        this.state.metrics.responseTimes = 
            this.state.metrics.responseTimes.filter(m => m.timestamp >= cutoff);
        
        this.state.metrics.lockWaitTimes = 
            this.state.metrics.lockWaitTimes.filter(m => m.timestamp >= cutoff);
        
        this.state.metrics.queueSizes = 
            this.state.metrics.queueSizes.filter(m => m.timestamp >= cutoff);
        
        this.state.metrics.memoryUsage = 
            this.state.metrics.memoryUsage.filter(m => m.timestamp >= cutoff);
        
        this.state.metrics.lastCleanup = Date.now();
        
        this.log('Limpieza de métricas antiguas completada', 'debug');
    },

    // Emitir evento
    emitEvent: function(eventType, data) {
        if (typeof document !== 'undefined') {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    },

    // Obtener reporte de diagnóstico
    getDiagnosticReport: function() {
        return {
            timestamp: Date.now(),
            health: this.state.health,
            metrics: {
                operations: Array.from(this.state.metrics.operations.values()).slice(-10),
                errors: Array.from(this.state.metrics.errors.values()).flat().slice(-10),
                responseTimes: this.state.metrics.responseTimes.slice(-10),
                lockWaitTimes: this.state.metrics.lockWaitTimes.slice(-10),
                queueSizes: this.state.metrics.queueSizes.slice(-10),
                memoryUsage: this.state.metrics.memoryUsage.slice(-10)
            },
            alerts: {
                active: Array.from(this.state.alerts.active.values()),
                history: this.state.alerts.history.slice(-20),
                counters: Object.fromEntries(this.state.alerts.counters)
            },
            recovery: {
                lastAttempt: this.state.recovery.lastAttempt,
                inProgress: Array.from(this.state.recovery.inProgress)
            }
        };
    },

    // Obtener métricas actuales
    getCurrentMetrics: function() {
        return {
            timestamp: Date.now(),
            operations: this.state.metrics.operations.size,
            errors: this.state.metrics.errors.size,
            activeAlerts: this.state.alerts.active.size,
            healthStatus: this.state.health.status,
            lastHealthCheck: this.state.health.lastCheck,
            lastCleanup: this.state.metrics.lastCleanup
        };
    },

    // Reiniciar sistema de diagnóstico
    reset: function() {
        this.log('Reiniciando SyncDiagnostics...');
        
        // Detener monitoreo
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.state.monitoringActive = false;
        }
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.state.healthCheckActive = false;
        }
        
        // Limpiar estado
        this.state.metrics = {
            operations: new Map(),
            errors: new Map(),
            responseTimes: [],
            lockWaitTimes: [],
            queueSizes: [],
            memoryUsage: [],
            errorCounts: new Map(),
            lastHealthCheck: null,
            lastCleanup: Date.now()
        };
        
        this.state.health = {
            status: 'unknown',
            issues: [],
            lastCheck: null,
            checks: {}
        };
        
        this.state.alerts = {
            active: new Map(),
            history: [],
            counters: new Map()
        };
        
        this.state.recovery = {
            attempts: new Map(),
            inProgress: new Set(),
            lastAttempt: null
        };
        
        // Reiniciar monitoreo
        this.setupMonitoring();
        this.setupHealthChecks();
        
        this.log('SyncDiagnostics reiniciado', 'success');
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
            const logMessage = `[${timestamp}] [SyncDiagnostics] [${level.toUpperCase()}] ${message}`;
            
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

// Exportar el sistema de diagnóstico
export default SyncDiagnostics;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.SyncDiagnostics = SyncDiagnostics;
}