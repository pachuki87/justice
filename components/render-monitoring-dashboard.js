/**
 * RenderMonitoringDashboard - Dashboard de monitoreo de renderizado
 * 
 * Este sistema proporciona una interfaz completa para monitorear
 * el rendimiento de renderizado en tiempo real con visualización de datos.
 */

class RenderMonitoringDashboard {
    constructor(options = {}) {
        this.options = {
            refreshInterval: options.refreshInterval || 1000, // 1 segundo
            maxDataPoints: options.maxDataPoints || 60, // 60 segundos de historial
            enableRealTimeUpdates: options.enableRealTimeUpdates !== false,
            enableAlerts: options.enableAlerts !== false,
            alertThresholds: {
                fps: options.fpsThreshold || 30,
                frameTime: options.frameTimeThreshold || 33.33, // 30 FPS
                memoryUsage: options.memoryThreshold || 0.8, // 80%
                renderTime: options.renderTimeThreshold || 16.67 // 60 FPS
            },
            ...options
        };

        // Estado del dashboard
        this.isVisible = false;
        this.isMonitoring = false;
        this.currentData = {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            renderTime: 0,
            componentCount: 0,
            cacheHitRate: 0,
            droppedFrames: 0
        };

        // Historial de datos
        this.dataHistory = {
            fps: [],
            frameTime: [],
            memoryUsage: [],
            renderTime: [],
            componentCount: [],
            cacheHitRate: [],
            droppedFrames: []
        };

        // Alertas activas
        this.activeAlerts = new Set();

        // Referencias a sistemas de renderizado
        this.performanceProfiler = null;
        this.renderScheduler = null;
        this.optimizedRenderer = null;

        // Elementos del dashboard
        this.dashboardElement = null;
        this.charts = {};

        // Intervalos
        this.monitoringInterval = null;
        this.refreshInterval = null;

        // Callbacks
        this.callbacks = {
            onAlert: [],
            onMetricUpdate: [],
            onDashboardShow: [],
            onDashboardHide: []
        };

        this.initialize();
    }

    /**
     * Inicializa el dashboard
     */
    initialize() {
        this.createDashboard();
        this.setupEventListeners();
        this.connectToRenderSystems();
        
        console.log('RenderMonitoringDashboard inicializado');
    }

    /**
     * Conecta con los sistemas de renderizado
     */
    connectToRenderSystems() {
        // Conectar con sistemas globales si están disponibles
        if (window.Justice2 && window.Justice2.state) {
            const state = window.Justice2.state;
            
            this.performanceProfiler = state.performanceProfiler;
            this.renderScheduler = state.renderScheduler;
            this.optimizedRenderer = state.optimizedRenderer;
        }

        // Configurar callbacks para recibir datos en tiempo real
        if (this.performanceProfiler) {
            this.performanceProfiler.on('frameData', (data) => {
                this.updateMetric('fps', 1000 / data.frameTime);
                this.updateMetric('frameTime', data.frameTime);
                this.updateMetric('memoryUsage', data.memory ? data.memory.usageRatio : 0);
            });

            this.performanceProfiler.on('componentData', (data) => {
                this.updateMetric('componentCount', 1); // Incrementar contador
                this.updateMetric('cacheHitRate', data.cacheHitRate || 0);
            });

            this.performanceProfiler.on('bottleneckDetected', (bottlenecks) => {
                this.handleBottlenecks(bottlenecks);
            });
        }

        if (this.renderScheduler) {
            this.renderScheduler.on('frameEnd', (data) => {
                this.updateMetric('droppedFrames', data.utilization > 100 ? 1 : 0);
            });
        }
    }

    /**
     * Crea la interfaz del dashboard
     */
    createDashboard() {
        // Crear contenedor principal
        this.dashboardElement = document.createElement('div');
        this.dashboardElement.id = 'render-monitoring-dashboard';
        this.dashboardElement.className = 'render-monitoring-dashboard';
        this.dashboardElement.style.display = 'none';

        // Crear estructura HTML
        this.dashboardElement.innerHTML = `
            <div class="dashboard-header">
                <h3>Monitor de Rendimiento de Renderizado</h3>
                <div class="dashboard-controls">
                    <button id="toggle-monitoring" class="btn btn-sm btn-primary">Iniciar Monitoreo</button>
                    <button id="reset-data" class="btn btn-sm btn-secondary">Resetear Datos</button>
                    <button id="export-data" class="btn btn-sm btn-info">Exportar</button>
                    <button id="close-dashboard" class="btn btn-sm btn-danger">×</button>
                </div>
            </div>
            
            <div class="dashboard-content">
                <div class="metrics-grid">
                    <div class="metric-card" data-metric="fps">
                        <div class="metric-value">0</div>
                        <div class="metric-label">FPS</div>
                        <div class="metric-chart" id="fps-chart"></div>
                    </div>
                    
                    <div class="metric-card" data-metric="frameTime">
                        <div class="metric-value">0ms</div>
                        <div class="metric-label">Tiempo de Frame</div>
                        <div class="metric-chart" id="frametime-chart"></div>
                    </div>
                    
                    <div class="metric-card" data-metric="memoryUsage">
                        <div class="metric-value">0%</div>
                        <div class="metric-label">Uso de Memoria</div>
                        <div class="metric-chart" id="memory-chart"></div>
                    </div>
                    
                    <div class="metric-card" data-metric="renderTime">
                        <div class="metric-value">0ms</div>
                        <div class="metric-label">Tiempo de Render</div>
                        <div class="metric-chart" id="render-chart"></div>
                    </div>
                    
                    <div class="metric-card" data-metric="componentCount">
                        <div class="metric-value">0</div>
                        <div class="metric-label">Componentes</div>
                        <div class="metric-chart" id="component-chart"></div>
                    </div>
                    
                    <div class="metric-card" data-metric="cacheHitRate">
                        <div class="metric-value">0%</div>
                        <div class="metric-label">Tasa de Cache</div>
                        <div class="metric-chart" id="cache-chart"></div>
                    </div>
                    
                    <div class="metric-card" data-metric="droppedFrames">
                        <div class="metric-value">0</div>
                        <div class="metric-label">Frames Caídos</div>
                        <div class="metric-chart" id="dropped-chart"></div>
                    </div>
                </div>
                
                <div class="alerts-section">
                    <h4>Alertas de Rendimiento</h4>
                    <div id="alerts-container" class="alerts-container"></div>
                </div>
                
                <div class="details-section">
                    <h4>Detalles del Sistema</h4>
                    <div class="system-details">
                        <div class="detail-item">
                            <label>RenderOptimizer:</label>
                            <span id="render-optimizer-status">No disponible</span>
                        </div>
                        <div class="detail-item">
                            <label>VirtualDOM:</label>
                            <span id="virtual-dom-status">No disponible</span>
                        </div>
                        <div class="detail-item">
                            <label>ComponentMemoizer:</label>
                            <span id="memoizer-status">No disponible</span>
                        </div>
                        <div class="detail-item">
                            <label>BatchRenderer:</label>
                            <span id="batch-renderer-status">No disponible</span>
                        </div>
                        <div class="detail-item">
                            <label>LazyRenderer:</label>
                            <span id="lazy-renderer-status">No disponible</span>
                        </div>
                        <div class="detail-item">
                            <label>SmartComponent:</label>
                            <span id="smart-component-status">No disponible</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Agregar estilos
        this.addStyles();

        // Agregar al DOM
        document.body.appendChild(this.dashboardElement);

        // Inicializar gráficos
        this.initializeCharts();
    }

    /**
     * Agrega estilos CSS al dashboard
     */
    addStyles() {
        const style = document.createElement('style');
        style.id = 'render-monitoring-dashboard-styles';
        style.textContent = `
            .render-monitoring-dashboard {
                position: fixed;
                top: 50px;
                right: 20px;
                width: 400px;
                max-height: 80vh;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 12px;
                overflow-y: auto;
            }

            .dashboard-header {
                padding: 15px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #B49C73, #37373F);
                color: white;
            }

            .dashboard-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }

            .dashboard-controls {
                display: flex;
                gap: 5px;
            }

            .dashboard-controls button {
                padding: 4px 8px;
                font-size: 11px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .btn-primary { background: #007bff; color: white; }
            .btn-secondary { background: #6c757d; color: white; }
            .btn-info { background: #17a2b8; color: white; }
            .btn-danger { background: #dc3545; color: white; }

            .dashboard-content {
                padding: 15px;
            }

            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 10px;
                margin-bottom: 20px;
            }

            .metric-card {
                border: 1px solid #e9ecef;
                border-radius: 6px;
                padding: 10px;
                text-align: center;
                background: #f8f9fa;
            }

            .metric-value {
                font-size: 18px;
                font-weight: bold;
                color: #37373F;
                margin-bottom: 5px;
            }

            .metric-label {
                font-size: 11px;
                color: #6c757d;
                margin-bottom: 8px;
            }

            .metric-chart {
                height: 40px;
                background: white;
                border-radius: 4px;
                position: relative;
                overflow: hidden;
            }

            .alerts-section, .details-section {
                margin-top: 20px;
            }

            .alerts-section h4, .details-section h4 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #37373F;
            }

            .alerts-container {
                max-height: 150px;
                overflow-y: auto;
            }

            .alert-item {
                padding: 8px;
                margin-bottom: 5px;
                border-radius: 4px;
                font-size: 11px;
            }

            .alert-warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
            }

            .alert-danger {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
            }

            .alert-info {
                background: #d1ecf1;
                border: 1px solid #bee5eb;
                color: #0c5460;
            }

            .system-details {
                display: grid;
                gap: 8px;
            }

            .detail-item {
                display: flex;
                justify-content: space-between;
                padding: 6px;
                background: #f8f9fa;
                border-radius: 4px;
            }

            .detail-item label {
                font-weight: 500;
                color: #495057;
            }

            .detail-item span {
                color: #6c757d;
            }

            .status-active { color: #28a745; }
            .status-inactive { color: #dc3545; }
            .status-warning { color: #ffc107; }

            @media (max-width: 768px) {
                .render-monitoring-dashboard {
                    width: 95vw;
                    right: 2.5vw;
                    left: 2.5vw;
                }
                
                .metrics-grid {
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Inicializa los gráficos de métricas
     */
    initializeCharts() {
        const chartTypes = ['fps', 'frametime', 'memory', 'render', 'component', 'cache', 'dropped'];
        
        chartTypes.forEach(type => {
            const chartElement = document.getElementById(`${type}-chart`);
            if (chartElement) {
                this.charts[type] = new MiniChart(chartElement, {
                    maxValue: this.getMaxValueForMetric(type),
                    color: this.getColorForMetric(type),
                    lineWidth: 2
                });
            }
        });
    }

    /**
     * Obtiene el valor máximo para una métrica
     */
    getMaxValueForMetric(metric) {
        const maxValues = {
            fps: 60,
            frametime: 50,
            memory: 100,
            render: 50,
            component: 100,
            cache: 100,
            dropped: 10
        };
        return maxValues[metric] || 100;
    }

    /**
     * Obtiene el color para una métrica
     */
    getColorForMetric(metric) {
        const colors = {
            fps: '#28a745',
            frametime: '#dc3545',
            memory: '#ffc107',
            render: '#17a2b8',
            component: '#6f42c1',
            cache: '#20c997',
            dropped: '#fd7e14'
        };
        return colors[metric] || '#6c757d';
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Toggle monitoreo
        const toggleBtn = document.getElementById('toggle-monitoring');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (this.isMonitoring) {
                    this.stopMonitoring();
                    toggleBtn.textContent = 'Iniciar Monitoreo';
                    toggleBtn.className = 'btn btn-sm btn-primary';
                } else {
                    this.startMonitoring();
                    toggleBtn.textContent = 'Detener Monitoreo';
                    toggleBtn.className = 'btn btn-sm btn-warning';
                }
            });
        }

        // Resetear datos
        const resetBtn = document.getElementById('reset-data');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetData();
            });
        }

        // Exportar datos
        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        // Cerrar dashboard
        const closeBtn = document.getElementById('close-dashboard');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Atajo de teclado
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    /**
     * Inicia el monitoreo
     */
    startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;

        // Iniciar actualización periódica
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
            this.updateDisplay();
            this.checkAlerts();
        }, this.options.refreshInterval);

        // Iniciar actualización de gráficos
        this.refreshInterval = setInterval(() => {
            this.updateCharts();
        }, 100); // 10 FPS para gráficos

        this.updateSystemStatus();
        console.log('Monitoreo de renderizado iniciado');
    }

    /**
     * Detiene el monitoreo
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;

        // Limpiar intervalos
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        console.log('Monitoreo de renderizado detenido');
    }

    /**
     * Recopila métricas de los sistemas de renderizado
     */
    collectMetrics() {
        // Obtener métricas del PerformanceProfiler
        if (this.performanceProfiler) {
            const metrics = this.performanceProfiler.getMetrics();
            
            if (metrics.averageFPS) {
                this.updateMetric('fps', metrics.averageFPS);
            }
            
            if (metrics.averageFrameTime) {
                this.updateMetric('frameTime', metrics.averageFrameTime);
            }
            
            if (metrics.memoryUsage && metrics.memoryUsage.current) {
                const memoryUsage = (metrics.memoryUsage.current / metrics.memoryUsage.limit) * 100;
                this.updateMetric('memoryUsage', memoryUsage);
            }
        }

        // Obtener métricas del RenderScheduler
        if (this.renderScheduler) {
            const schedulerMetrics = this.renderScheduler.getMetrics();
            
            if (schedulerMetrics.frameUtilization) {
                this.updateMetric('renderTime', schedulerMetrics.frameUtilization / 100 * 16.67);
            }
            
            if (schedulerMetrics.droppedFrames) {
                this.updateMetric('droppedFrames', schedulerMetrics.droppedFrames);
            }
        }

        // Obtener métricas del OptimizedRenderer
        if (this.optimizedRenderer) {
            const rendererMetrics = this.optimizedRenderer.getMetrics();
            
            if (rendererMetrics.componentCount) {
                this.updateMetric('componentCount', rendererMetrics.componentCount);
            }
            
            if (rendererMetrics.cacheHitRate) {
                this.updateMetric('cacheHitRate', rendererMetrics.cacheHitRate * 100);
            }
        }
    }

    /**
     * Actualiza una métrica específica
     */
    updateMetric(metric, value) {
        this.currentData[metric] = value;

        // Agregar al historial
        if (!this.dataHistory[metric]) {
            this.dataHistory[metric] = [];
        }

        this.dataHistory[metric].push({
            value,
            timestamp: Date.now()
        });

        // Limitar tamaño del historial
        if (this.dataHistory[metric].length > this.options.maxDataPoints) {
            this.dataHistory[metric].shift();
        }

        // Notificar actualización
        this.callbacks.onMetricUpdate.forEach(callback => {
            try {
                callback(metric, value, this.dataHistory[metric]);
            } catch (e) {
                console.error('Error en callback de métrica:', e);
            }
        });
    }

    /**
     * Actualiza la visualización de métricas
     */
    updateDisplay() {
        // Actualizar valores en las tarjetas
        Object.keys(this.currentData).forEach(metric => {
            const card = document.querySelector(`[data-metric="${metric}"] .metric-value`);
            if (card) {
                card.textContent = this.formatMetricValue(metric, this.currentData[metric]);
            }
        });
    }

    /**
     * Formatea el valor de una métrica para visualización
     */
    formatMetricValue(metric, value) {
        switch (metric) {
            case 'fps':
                return Math.round(value);
            case 'frameTime':
            case 'renderTime':
                return `${value.toFixed(2)}ms`;
            case 'memoryUsage':
            case 'cacheHitRate':
                return `${value.toFixed(1)}%`;
            case 'droppedFrames':
            case 'componentCount':
                return Math.round(value);
            default:
                return value.toString();
        }
    }

    /**
     * Actualiza los gráficos
     */
    updateCharts() {
        Object.keys(this.charts).forEach(metric => {
            const chart = this.charts[metric];
            const history = this.dataHistory[metric] || [];
            
            if (chart && history.length > 0) {
                chart.update(history.map(h => h.value));
            }
        });
    }

    /**
     * Verifica alertas de rendimiento
     */
    checkAlerts() {
        const thresholds = this.options.alertThresholds;
        const alerts = [];

        // Verificar FPS
        if (this.currentData.fps < thresholds.fps) {
            alerts.push({
                type: 'warning',
                message: `FPS bajo: ${this.currentData.fps.toFixed(1)} (umbral: ${thresholds.fps})`,
                metric: 'fps'
            });
        }

        // Verificar tiempo de frame
        if (this.currentData.frameTime > thresholds.frameTime) {
            alerts.push({
                type: 'danger',
                message: `Tiempo de frame alto: ${this.currentData.frameTime.toFixed(2)}ms (umbral: ${thresholds.frameTime}ms)`,
                metric: 'frameTime'
            });
        }

        // Verificar uso de memoria
        if (this.currentData.memoryUsage > thresholds.memoryUsage * 100) {
            alerts.push({
                type: 'warning',
                message: `Uso de memoria alto: ${this.currentData.memoryUsage.toFixed(1)}% (umbral: ${thresholds.memoryUsage * 100}%)`,
                metric: 'memoryUsage'
            });
        }

        // Verificar tiempo de renderizado
        if (this.currentData.renderTime > thresholds.renderTime) {
            alerts.push({
                type: 'warning',
                message: `Tiempo de renderizado alto: ${this.currentData.renderTime.toFixed(2)}ms (umbral: ${thresholds.renderTime}ms)`,
                metric: 'renderTime'
            });
        }

        // Mostrar alertas nuevas
        alerts.forEach(alert => {
            const alertKey = `${alert.metric}_${alert.type}`;
            if (!this.activeAlerts.has(alertKey)) {
                this.activeAlerts.add(alertKey);
                this.showAlert(alert);
                this.notifyAlert(alert);
            }
        });

        // Limpiar alertas resueltas
        this.activeAlerts.forEach(alertKey => {
            const [metric, type] = alertKey.split('_');
            const threshold = thresholds[metric];
            const currentValue = this.currentData[metric];

            let isResolved = false;
            switch (type) {
                case 'warning':
                    isResolved = currentValue < threshold;
                    break;
                case 'danger':
                    isResolved = currentValue < threshold * 1.5;
                    break;
            }

            if (isResolved) {
                this.activeAlerts.delete(alertKey);
                this.hideAlert(alertKey);
            }
        });
    }

    /**
     * Muestra una alerta en el dashboard
     */
    showAlert(alert) {
        const container = document.getElementById('alerts-container');
        if (!container) return;

        const alertElement = document.createElement('div');
        alertElement.className = `alert-item alert-${alert.type}`;
        alertElement.dataset.alertKey = `${alert.metric}_${alert.type}`;
        alertElement.innerHTML = `
            <strong>${alert.type.toUpperCase()}:</strong> ${alert.message}
            <small>${new Date().toLocaleTimeString()}</small>
        `;

        container.appendChild(alertElement);
    }

    /**
     * Oculta una alerta
     */
    hideAlert(alertKey) {
        const alertElement = document.querySelector(`[data-alert-key="${alertKey}"]`);
        if (alertElement) {
            alertElement.remove();
        }
    }

    /**
     * Maneja cuellos de botella detectados
     */
    handleBottlenecks(bottlenecks) {
        bottlenecks.forEach(bottleneck => {
            this.showAlert({
                type: 'danger',
                message: `Cuello de botella: ${bottleneck.description}`,
                metric: 'bottleneck'
            });
        });
    }

    /**
     * Notifica una alerta a los callbacks
     */
    notifyAlert(alert) {
        this.callbacks.onAlert.forEach(callback => {
            try {
                callback(alert);
            } catch (e) {
                console.error('Error en callback de alerta:', e);
            }
        });
    }

    /**
     * Actualiza el estado del sistema
     */
    updateSystemStatus() {
        const statusMap = {
            'render-optimizer-status': this.optimizedRenderer,
            'virtual-dom-status': this.optimizedRenderer ? this.optimizedRenderer.virtualDOM : null,
            'memoizer-status': this.optimizedRenderer ? this.optimizedRenderer.componentMemoizer : null,
            'batch-renderer-status': this.optimizedRenderer ? this.optimizedRenderer.batchRenderer : null,
            'lazy-renderer-status': this.optimizedRenderer ? this.optimizedRenderer.lazyRenderer : null,
            'smart-component-status': this.optimizedRenderer ? this.optimizedRenderer.smartComponent : null
        };

        Object.entries(statusMap).forEach(([elementId, system]) => {
            const element = document.getElementById(elementId);
            if (element) {
                if (system) {
                    element.textContent = 'Activo';
                    element.className = 'status-active';
                } else {
                    element.textContent = 'No disponible';
                    element.className = 'status-inactive';
                }
            }
        });
    }

    /**
     * Resetea todos los datos
     */
    resetData() {
        // Resetear datos actuales
        Object.keys(this.currentData).forEach(metric => {
            this.currentData[metric] = 0;
        });

        // Resetear historial
        Object.keys(this.dataHistory).forEach(metric => {
            this.dataHistory[metric] = [];
        });

        // Resetear alertas
        this.activeAlerts.clear();
        const alertsContainer = document.getElementById('alerts-container');
        if (alertsContainer) {
            alertsContainer.innerHTML = '';
        }

        // Resetear gráficos
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.clear) {
                chart.clear();
            }
        });

        this.updateDisplay();
        console.log('Datos del dashboard reseteados');
    }

    /**
     * Exporta los datos del dashboard
     */
    exportData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            currentMetrics: this.currentData,
            history: this.dataHistory,
            alerts: Array.from(this.activeAlerts),
            systemInfo: {
                userAgent: navigator.userAgent,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                performance: {
                    memory: performance.memory ? {
                        usedJSHeapSize: performance.memory.usedJSHeapSize,
                        totalJSHeapSize: performance.memory.totalJSHeapSize,
                        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                    } : null
                }
            }
        };

        // Crear y descargar archivo JSON
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `render-performance-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('Datos exportados correctamente');
    }

    /**
     * Muestra el dashboard
     */
    show() {
        if (this.isVisible) return;

        this.dashboardElement.style.display = 'block';
        this.isVisible = true;

        this.callbacks.onDashboardShow.forEach(callback => {
            try {
                callback();
            } catch (e) {
                console.error('Error en callback de show:', e);
            }
        });
    }

    /**
     * Oculta el dashboard
     */
    hide() {
        if (!this.isVisible) return;

        this.dashboardElement.style.display = 'none';
        this.isVisible = false;

        this.callbacks.onDashboardHide.forEach(callback => {
            try {
                callback();
            } catch (e) {
                console.error('Error en callback de hide:', e);
            }
        });
    }

    /**
     * Alterna la visibilidad del dashboard
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
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
     * Obtiene el estado actual del dashboard
     */
    getStatus() {
        return {
            isVisible: this.isVisible,
            isMonitoring: this.isMonitoring,
            currentMetrics: { ...this.currentData },
            activeAlerts: Array.from(this.activeAlerts),
            dataPoints: Object.keys(this.dataHistory).reduce((sum, key) => {
                return sum + this.dataHistory[key].length;
            }, 0)
        };
    }

    /**
     * Limpia recursos
     */
    cleanup() {
        this.stopMonitoring();

        // Remover dashboard del DOM
        if (this.dashboardElement && this.dashboardElement.parentElement) {
            this.dashboardElement.parentElement.removeChild(this.dashboardElement);
        }

        // Remover estilos
        const styles = document.getElementById('render-monitoring-dashboard-styles');
        if (styles) {
            styles.parentElement.removeChild(styles);
        }

        // Limpiar callbacks
        Object.keys(this.callbacks).forEach(event => {
            this.callbacks[event] = [];
        });

        console.log('RenderMonitoringDashboard limpiado');
    }
}

/**
 * MiniChart - Gráfico simple para métricas en tiempo real
 */
class MiniChart {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            maxValue: options.maxValue || 100,
            color: options.color || '#007bff',
            lineWidth: options.lineWidth || 2,
            ...options
        };

        this.canvas = document.createElement('canvas');
        this.canvas.width = element.offsetWidth;
        this.canvas.height = element.offsetHeight;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

        this.ctx = this.canvas.getContext('2d');
        this.data = [];

        element.appendChild(this.canvas);
    }

    update(data) {
        this.data = data.slice(-50); // Mantener últimos 50 puntos
        this.draw();
    }

    draw() {
        const { width, height } = this.canvas;
        const { maxValue, color, lineWidth } = this.options;

        // Limpiar canvas
        this.ctx.clearRect(0, 0, width, height);

        if (this.data.length < 2) return;

        // Dibujar línea
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();

        const stepX = width / (this.data.length - 1);

        this.data.forEach((value, index) => {
            const x = index * stepX;
            const y = height - (value / maxValue) * height;

            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();

        // Dibujar área de relleno
        this.ctx.fillStyle = color + '20';
        this.ctx.lineTo(width, height);
        this.ctx.lineTo(0, height);
        this.ctx.closePath();
        this.ctx.fill();
    }

    clear() {
        this.data = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// Exportar el dashboard
window.RenderMonitoringDashboard = RenderMonitoringDashboard;
window.MiniChart = MiniChart;