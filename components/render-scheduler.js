/**
 * RenderScheduler - Planificador avanzado de renderizados
 * 
 * Este sistema proporciona planificación inteligente de renderizados
 * con prioridades, frames y optimización de rendimiento.
 */

class RenderScheduler {
    constructor(options = {}) {
        this.options = {
            targetFPS: options.targetFPS || 60,
            frameBudget: options.frameBudget || 16.67, // ms para 60 FPS
            maxConcurrentRenders: options.maxConcurrentRenders || 3,
            enablePreloading: options.enablePreloading !== false,
            enablePredictiveScheduling: options.enablePredictiveScheduling !== false,
            adaptiveFrameBudget: options.adaptiveFrameBudget !== false,
            ...options
        };

        // Colas de prioridad
        this.queues = {
            critical: [],      // Renderizados críticos (interacciones del usuario)
            high: [],         // Renderizados de alta prioridad (animaciones)
            normal: [],       // Renderizados normales (actualizaciones de UI)
            low: [],          // Renderizados de baja prioridad (carga diferida)
            idle: []          // Renderizados en tiempo de inactividad
        };

        // Estado del scheduler
        this.isRunning = false;
        this.currentFrame = null;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.averageFrameTime = 0;
        this.frameTimeHistory = [];
        this.maxHistorySize = 60; // 1 segundo de historial a 60 FPS

        // Predicción y aprendizaje
        this.renderPatterns = new Map();
        this.predictiveQueue = [];
        this.userInteractionTracker = new UserInteractionTracker();

        // Gestión de recursos
        this.resourceMonitor = new RenderResourceMonitor();
        this.performancePredictor = new PerformancePredictor();

        // Callbacks y eventos
        this.callbacks = {
            onFrameStart: [],
            onFrameEnd: [],
            onRenderComplete: [],
            onPerformanceIssue: [],
            onQueueOverflow: []
        };

        // Métricas
        this.metrics = {
            totalRenders: 0,
            skippedFrames: 0,
            averageRenderTime: 0,
            queueSizes: {},
            frameUtilization: 0,
            predictiveAccuracy: 0
        };

        // Inicialización
        this.initialize();
    }

    /**
     * Inicializa el scheduler
     */
    initialize() {
        this.startScheduler();
        this.initializePerformanceMonitoring();
        this.initializePredictiveScheduling();
        
        console.log('RenderScheduler inicializado');
    }

    /**
     * Inicia el bucle principal del scheduler
     */
    startScheduler() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.scheduleNextFrame();
    }

    /**
     * Detiene el scheduler
     */
    stopScheduler() {
        this.isRunning = false;
        
        if (this.currentFrame) {
            cancelAnimationFrame(this.currentFrame);
            this.currentFrame = null;
        }
    }

    /**
     * Planifica el siguiente frame
     */
    scheduleNextFrame() {
        if (!this.isRunning) return;

        this.currentFrame = requestAnimationFrame((timestamp) => {
            this.processFrame(timestamp);
        });
    }

    /**
     * Procesa un frame completo
     */
    async processFrame(timestamp) {
        const frameStartTime = performance.now();
        
        // Notificar inicio del frame
        this.notifyFrameStart(timestamp);

        try {
            // Actualizar estado del frame
            this.updateFrameState(timestamp);

            // Determinar presupuesto del frame
            const frameBudget = this.calculateFrameBudget();

            // Ejecutar renderizados planificados
            await this.executeScheduledRenders(frameBudget);

            // Procesar renderizados predictivos
            if (this.options.enablePredictiveScheduling) {
                this.processPredictiveRenders(frameBudget);
            }

            // Actualizar predicciones
            this.updatePredictions();

        } catch (error) {
            console.error('Error en procesamiento de frame:', error);
            this.handleFrameError(error);
        } finally {
            // Finalizar frame
            const frameEndTime = performance.now();
            this.finalizeFrame(frameStartTime, frameEndTime);

            // Planificar siguiente frame
            this.scheduleNextFrame();
        }
    }

    /**
     * Actualiza el estado del frame actual
     */
    updateFrameState(timestamp) {
        this.frameCount++;
        
        if (this.lastFrameTime > 0) {
            const frameTime = timestamp - this.lastFrameTime;
            this.updateFrameTimeHistory(frameTime);
        }
        
        this.lastFrameTime = timestamp;
    }

    /**
     * Actualiza el historial de tiempos de frame
     */
    updateFrameTimeHistory(frameTime) {
        this.frameTimeHistory.push(frameTime);
        
        if (this.frameTimeHistory.length > this.maxHistorySize) {
            this.frameTimeHistory.shift();
        }
        
        // Calcular promedio móvil
        this.averageFrameTime = this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
    }

    /**
     * Calcula el presupuesto del frame actual
     */
    calculateFrameBudget() {
        if (!this.options.adaptiveFrameBudget) {
            return this.options.frameBudget;
        }

        // Ajustar basado en rendimiento reciente
        const performanceRatio = this.averageFrameTime / this.options.frameBudget;
        
        if (performanceRatio > 1.2) {
            // Rendimiento pobre, reducir presupuesto
            return this.options.frameBudget * 0.8;
        } else if (performanceRatio < 0.8) {
            // Buen rendimiento, aumentar presupuesto
            return this.options.frameBudget * 1.2;
        }
        
        return this.options.frameBudget;
    }

    /**
     * Ejecuta los renderizados planificados
     */
    async executeScheduledRenders(frameBudget) {
        const renderStartTime = performance.now();
        let remainingBudget = frameBudget;
        let renderCount = 0;

        // Procesar colas en orden de prioridad
        const queueOrder = ['critical', 'high', 'normal', 'low', 'idle'];
        
        for (const priority of queueOrder) {
            const queue = this.queues[priority];
            
            while (queue.length > 0 && remainingBudget > 0 && renderCount < this.options.maxConcurrentRenders) {
                const renderTask = queue.shift();
                
                try {
                    const renderStartTime = performance.now();
                    await this.executeRenderTask(renderTask);
                    const renderTime = performance.now() - renderStartTime;
                    
                    remainingBudget -= renderTime;
                    renderCount++;
                    
                    this.metrics.totalRenders++;
                    
                } catch (error) {
                    console.error('Error en render task:', error);
                    this.handleRenderError(renderTask, error);
                }
            }
        }

        // Actualizar métricas de utilización
        const totalRenderTime = performance.now() - renderStartTime;
        this.metrics.frameUtilization = (totalRenderTime / frameBudget) * 100;
    }

    /**
     * Ejecuta una tarea de renderizado específica
     */
    async executeRenderTask(renderTask) {
        const { component, props, priority, callback } = renderTask;
        
        // Validar tarea
        if (!component || typeof component.render !== 'function') {
            throw new Error('Tarea de renderizado inválida');
        }

        // Ejecutar renderizado
        const result = await component.render(props);
        
        // Notificar completion
        if (callback && typeof callback === 'function') {
            callback(null, result);
        }
        
        this.notifyRenderComplete(renderTask, result);
        
        return result;
    }

    /**
     * Planifica un renderizado
     */
    scheduleRender(component, props = {}, options = {}) {
        const priority = options.priority || 'normal';
        const callback = options.callback;
        const metadata = options.metadata || {};

        // Validar prioridad
        if (!this.queues.hasOwnProperty(priority)) {
            throw new Error(`Prioridad inválida: ${priority}`);
        }

        const renderTask = {
            id: this.generateRenderId(),
            component,
            props,
            priority,
            callback,
            metadata,
            scheduledAt: performance.now(),
            estimatedDuration: this.estimateRenderDuration(component, props)
        };

        // Añadir a la cola apropiada
        this.queues[priority].push(renderTask);

        // Actualizar métricas
        this.updateQueueMetrics();

        // Verificar si hay overflow
        this.checkQueueOverflow();

        return renderTask.id;
    }

    /**
     * Planifica renderizado crítico (interacción del usuario)
     */
    scheduleCriticalRender(component, props, callback) {
        return this.scheduleRender(component, props, {
            priority: 'critical',
            callback,
            metadata: { userInteraction: true }
        });
    }

    /**
     * Planifica renderizado de alta prioridad (animaciones)
     */
    scheduleHighPriorityRender(component, props, callback) {
        return this.scheduleRender(component, props, {
            priority: 'high',
            callback,
            metadata: { animation: true }
        });
    }

    /**
     * Planifica renderizado en tiempo de inactividad
     */
    scheduleIdleRender(component, props, callback) {
        return this.scheduleRender(component, props, {
            priority: 'idle',
            callback,
            metadata: { background: true }
        });
    }

    /**
     * Cancela un renderizado planificado
     */
    cancelRender(renderId) {
        for (const [priority, queue] of Object.entries(this.queues)) {
            const index = queue.findIndex(task => task.id === renderId);
            if (index !== -1) {
                const cancelledTask = queue.splice(index, 1)[0];
                
                // Notificar cancelación
                if (cancelledTask.callback) {
                    cancelledTask.callback(new Error('Renderizado cancelado'));
                }
                
                return true;
            }
        }
        
        return false;
    }

    /**
     * Procesa renderizados predictivos
     */
    processPredictiveRenders(frameBudget) {
        if (!this.options.enablePredictiveScheduling) return;

        const predictiveRenders = this.getPredictiveRenders();
        const maxPredictiveTime = frameBudget * 0.2; // Máximo 20% del presupuesto

        for (const renderTask of predictiveRenders) {
            if (performance.now() - this.lastFrameTime > maxPredictiveTime) {
                break;
            }

            this.scheduleRender(renderTask.component, renderTask.props, {
                priority: 'low',
                metadata: { predictive: true }
            });
        }
    }

    /**
     * Obtiene renderizados predictivos
     */
    getPredictiveRenders() {
        const userPatterns = this.userInteractionTracker.getPatterns();
        const predictions = [];

        for (const pattern of userPatterns) {
            if (pattern.probability > 0.7) {
                predictions.push({
                    component: pattern.component,
                    props: pattern.predictedProps,
                    probability: pattern.probability
                });
            }
        }

        return predictions.sort((a, b) => b.probability - a.probability);
    }

    /**
     * Actualiza predicciones basadas en el comportamiento
     */
    updatePredictions() {
        const patterns = this.userInteractionTracker.analyzePatterns();
        
        for (const pattern of patterns) {
            this.renderPatterns.set(pattern.id, pattern);
        }
    }

    /**
     * Estima la duración de un renderizado
     */
    estimateRenderDuration(component, props) {
        const componentId = component.id || component.name || 'unknown';
        const history = this.renderPatterns.get(componentId);
        
        if (history && history.averageRenderTime) {
            return history.averageRenderTime;
        }
        
        // Estimación basada en complejidad
        return this.estimateComplexity(component, props);
    }

    /**
     * Estima la complejidad de un renderizado
     */
    estimateComplexity(component, props) {
        let complexity = 1;
        
        // Analizar props
        if (props.children && Array.isArray(props.children)) {
            complexity += props.children.length * 0.5;
        }
        
        if (props.style && Object.keys(props.style).length > 0) {
            complexity += Object.keys(props.style).length * 0.1;
        }
        
        // Analizar componente
        if (component.render && typeof component.render === 'function') {
            complexity += 1;
        }
        
        return Math.min(complexity * 2, 10); // Máximo 10ms estimados
    }

    /**
     * Genera ID único para renderizado
     */
    generateRenderId() {
        return `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Actualiza métricas de colas
     */
    updateQueueMetrics() {
        this.metrics.queueSizes = {};
        
        for (const [priority, queue] of Object.entries(this.queues)) {
            this.metrics.queueSizes[priority] = queue.length;
        }
    }

    /**
     * Verifica si hay overflow en las colas
     */
    checkQueueOverflow() {
        const totalQueueSize = Object.values(this.queues).reduce((sum, queue) => sum + queue.length, 0);
        
        if (totalQueueSize > 100) {
            this.notifyQueueOverflow(totalQueueSize);
        }
    }

    /**
     * Maneja errores de frame
     */
    handleFrameError(error) {
        console.error('Error en frame:', error);
        
        // Notificar error
        this.callbacks.onPerformanceIssue.forEach(callback => {
            try {
                callback({ type: 'frame_error', error });
            } catch (e) {
                console.error('Error en callback de performance:', e);
            }
        });
    }

    /**
     * Maneja errores de renderizado
     */
    handleRenderError(renderTask, error) {
        console.error('Error en render task:', error);
        
        // Reintentar si es crítico
        if (renderTask.priority === 'critical') {
            setTimeout(() => {
                this.scheduleRender(renderTask.component, renderTask.props, {
                    priority: 'high', // Bajar prioridad en reintento
                    callback: renderTask.callback,
                    metadata: renderTask.metadata
                });
            }, 100);
        }
    }

    /**
     * Finaliza el procesamiento del frame
     */
    finalizeFrame(startTime, endTime) {
        const frameDuration = endTime - startTime;
        
        // Actualizar métricas
        this.metrics.averageRenderTime = (this.metrics.averageRenderTime * 0.9) + (frameDuration * 0.1);
        
        // Detectar frames saltados
        if (frameDuration > this.options.frameBudget * 1.5) {
            this.metrics.skippedFrames++;
        }
        
        // Notificar fin del frame
        this.notifyFrameEnd(endTime, frameDuration);
    }

    /**
     * Inicializa monitoreo de rendimiento
     */
    initializePerformanceMonitoring() {
        // Monitorear uso de memoria
        setInterval(() => {
            if (performance.memory) {
                const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
                
                if (memoryUsage > 0.8) {
                    this.handleMemoryPressure();
                }
            }
        }, 5000);
    }

    /**
     * Inicializa planificación predictiva
     */
    initializePredictiveScheduling() {
        if (!this.options.enablePredictiveScheduling) return;
        
        // Analizar patrones periódicamente
        setInterval(() => {
            this.updatePredictions();
        }, 10000);
    }

    /**
     * Maneja presión de memoria
     */
    handleMemoryPressure() {
        console.warn('Presión de memoria detectada, ajustando scheduler');
        
        // Reducir renderizados concurrentes
        this.options.maxConcurrentRenders = Math.max(1, this.options.maxConcurrentRenders - 1);
        
        // Priorizar renderizados críticos
        this.prioritizeCriticalRenders();
        
        // Notificar presión de memoria
        this.callbacks.onPerformanceIssue.forEach(callback => {
            try {
                callback({ type: 'memory_pressure', usage: performance.memory.usedJSHeapSize });
            } catch (e) {
                console.error('Error en callback de performance:', e);
            }
        });
    }

    /**
     * Prioriza renderizados críticos
     */
    prioritizeCriticalRenders() {
        // Mover renderizados no críticos a colas de menor prioridad
        ['high', 'normal'].forEach(priority => {
            const queue = this.queues[priority];
            const filtered = queue.filter(task => task.priority === 'critical' || task.metadata.userInteraction);
            const demoted = queue.filter(task => task.priority !== 'critical' && !task.metadata.userInteraction);
            
            this.queues[priority] = filtered;
            this.queues.low.push(...demoted);
        });
    }

    /**
     * Registra callbacks de eventos
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    /**
     * Elimina callbacks de eventos
     */
    off(event, callback) {
        if (this.callbacks[event]) {
            const index = this.callbacks[event].indexOf(callback);
            if (index !== -1) {
                this.callbacks[event].splice(index, 1);
            }
        }
    }

    /**
     * Notifica inicio de frame
     */
    notifyFrameStart(timestamp) {
        this.callbacks.onFrameStart.forEach(callback => {
            try {
                callback({ timestamp, frameCount: this.frameCount });
            } catch (e) {
                console.error('Error en callback de frame start:', e);
            }
        });
    }

    /**
     * Notifica fin de frame
     */
    notifyFrameEnd(timestamp, duration) {
        this.callbacks.onFrameEnd.forEach(callback => {
            try {
                callback({ timestamp, duration, utilization: this.metrics.frameUtilization });
            } catch (e) {
                console.error('Error en callback de frame end:', e);
            }
        });
    }

    /**
     * Notifica completion de renderizado
     */
    notifyRenderComplete(renderTask, result) {
        this.callbacks.onRenderComplete.forEach(callback => {
            try {
                callback({ renderTask, result, timestamp: performance.now() });
            } catch (e) {
                console.error('Error en callback de render complete:', e);
            }
        });
    }

    /**
     * Notifica overflow de cola
     */
    notifyQueueOverflow(size) {
        this.callbacks.onQueueOverflow.forEach(callback => {
            try {
                callback({ size, timestamp: performance.now() });
            } catch (e) {
                console.error('Error en callback de queue overflow:', e);
            }
        });
    }

    /**
     * Obtiene métricas actuales
     */
    getMetrics() {
        return {
            ...this.metrics,
            isRunning: this.isRunning,
            frameCount: this.frameCount,
            averageFrameTime: this.averageFrameTime,
            currentFPS: 1000 / this.averageFrameTime,
            targetFPS: this.options.targetFPS,
            queueSizes: { ...this.metrics.queueSizes }
        };
    }

    /**
     * Obtiene estado detallado del scheduler
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            frameCount: this.frameCount,
            averageFrameTime: this.averageFrameTime,
            currentFPS: 1000 / this.averageFrameTime,
            targetFPS: this.options.targetFPS,
            metrics: this.getMetrics(),
            queues: Object.keys(this.queues).reduce((acc, priority) => {
                acc[priority] = {
                    size: this.queues[priority].length,
                    tasks: this.queues[priority].slice(0, 5) // Primeros 5 tareas
                };
                return acc;
            }, {}),
            options: this.options
        };
    }

    /**
     * Limpia recursos
     */
    cleanup() {
        this.stopScheduler();
        
        // Limpiar colas
        for (const priority of Object.keys(this.queues)) {
            this.queues[priority] = [];
        }
        
        // Limpiar callbacks
        for (const event of Object.keys(this.callbacks)) {
            this.callbacks[event] = [];
        }
        
        console.log('RenderScheduler limpiado');
    }
}

/**
 * Tracker de interacciones del usuario
 */
class UserInteractionTracker {
    constructor() {
        this.interactions = [];
        this.patterns = new Map();
        this.maxHistorySize = 100;
    }

    recordInteraction(component, action, timestamp = performance.now()) {
        this.interactions.push({
            component: component.id || component.name,
            action,
            timestamp
        });

        if (this.interactions.length > this.maxHistorySize) {
            this.interactions.shift();
        }
    }

    getPatterns() {
        this.analyzePatterns();
        return Array.from(this.patterns.values());
    }

    analyzePatterns() {
        // Implementación simplificada de análisis de patrones
        const recentInteractions = this.interactions.slice(-20);
        const componentFrequency = {};

        for (const interaction of recentInteractions) {
            if (!componentFrequency[interaction.component]) {
                componentFrequency[interaction.component] = 0;
            }
            componentFrequency[interaction.component]++;
        }

        for (const [component, frequency] of Object.entries(componentFrequency)) {
            const probability = frequency / recentInteractions.length;
            
            this.patterns.set(component, {
                id: component,
                component,
                probability,
                frequency,
                lastInteraction: recentInteractions.filter(i => i.component === component).pop()?.timestamp
            });
        }
    }
}

/**
 * Monitor de recursos de renderizado
 */
class RenderResourceMonitor {
    constructor() {
        this.metrics = {
            cpuUsage: 0,
            memoryUsage: 0,
            renderCount: 0,
            averageRenderTime: 0
        };
    }

    updateMetrics(renderTime) {
        this.metrics.renderCount++;
        this.metrics.averageRenderTime = (this.metrics.averageRenderTime * 0.9) + (renderTime * 0.1);
        
        if (performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
        }
    }

    getMetrics() {
        return { ...this.metrics };
    }
}

/**
 * Predictor de rendimiento
 */
class PerformancePredictor {
    constructor() {
        this.history = [];
        this.maxHistorySize = 50;
    }

    recordPerformance(frameTime, renderCount) {
        this.history.push({
            frameTime,
            renderCount,
            timestamp: performance.now()
        });

        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    predictNextFramePerformance() {
        if (this.history.length < 5) {
            return { estimatedFrameTime: 16.67, confidence: 0.5 };
        }

        const recent = this.history.slice(-10);
        const avgFrameTime = recent.reduce((sum, h) => sum + h.frameTime, 0) / recent.length;
        const variance = this.calculateVariance(recent.map(h => h.frameTime));
        const confidence = Math.max(0.1, 1 - (variance / avgFrameTime));

        return {
            estimatedFrameTime: avgFrameTime,
            confidence
        };
    }

    calculateVariance(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    }
}

// Exportar el scheduler
window.RenderScheduler = RenderScheduler;