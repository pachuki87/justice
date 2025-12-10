/**
 * Justice 2 Query Monitoring Dashboard
 * Sistema de monitoreo en tiempo real para consultas de base de datos
 */

const QueryMonitoringDashboard = {
    // Configuración del dashboard
    config: {
        // Configuración de actualización
        updateInterval: 5000, // 5 segundos
        historyRetention: 24 * 60 * 60 * 1000, // 24 horas
        
        // Configuración de alertas
        enableAlerts: true,
        alertThresholds: {
            slowQueryThreshold: 2000, // 2 segundos
            errorRateThreshold: 5, // 5%
            connectionPoolThreshold: 80, // 80%
            memoryUsageThreshold: 85 // 85%
        },
        
        // Configuración de visualización
        maxDataPoints: 100,
        chartColors: {
            primary: '#3498db',
            success: '#27ae60',
            warning: '#f39c12',
            danger: '#e74c3c',
            info: '#17a2b8'
        },
        
        // Configuración de exportación
        enableExport: true,
        exportFormats: ['json', 'csv', 'pdf'],
        
        // Configuración de filtros
        enableFilters: true,
        defaultFilters: {
            timeRange: '1h', // 1h, 6h, 24h, 7d
            queryType: 'all', // all, select, insert, update, delete
            status: 'all' // all, success, error
        }
    },

    // Estado del dashboard
    state: {
        initialized: false,
        isMonitoring: false,
        lastUpdate: null,
        currentFilters: { ...this.config.defaultFilters },
        alerts: [],
        metrics: {
            realtime: {},
            historical: new Map()
        },
        charts: {
            queryPerformance: null,
            errorRate: null,
            connectionPool: null,
            cacheEfficiency: null
        }
    },

    // Elementos del DOM
    elements: {
        dashboard: null,
        metricsContainer: null,
        chartsContainer: null,
        alertsContainer: null,
        filtersContainer: null
    },

    /**
     * Inicializar el dashboard de monitoreo
     */
    init: function() {
        if (this.state.initialized) {
            console.log('⚠️ Query Monitoring Dashboard ya está inicializado');
            return;
        }
        
        console.log('📊 Inicializando Query Monitoring Dashboard...');
        
        // Crear estructura HTML del dashboard
        this.createDashboardStructure();
        
        // Inicializar componentes
        this.initializeComponents();
        
        // Configurar actualización automática
        this.setupAutoUpdate();
        
        // Configurar manejadores de eventos
        this.setupEventHandlers();
        
        // Iniciar monitoreo
        this.startMonitoring();
        
        this.state.initialized = true;
        console.log('✅ Query Monitoring Dashboard inicializado');
    },

    /**
     * Crear estructura HTML del dashboard
     */
    createDashboardStructure: function() {
        const dashboardHTML = `
            <div id="query-monitoring-dashboard" class="query-monitoring-dashboard">
                <header class="dashboard-header">
                    <h1>🔍 Query Monitoring Dashboard</h1>
                    <div class="dashboard-controls">
                        <button id="start-monitoring" class="btn btn-primary">▶️ Iniciar Monitoreo</button>
                        <button id="stop-monitoring" class="btn btn-secondary" disabled>⏸️ Detener</button>
                        <button id="export-data" class="btn btn-info">📊 Exportar</button>
                        <button id="clear-data" class="btn btn-danger">🗑️ Limpiar</button>
                    </div>
                </header>
                
                <div class="dashboard-filters">
                    <h3>🔧 Filtros</h3>
                    <div class="filter-controls">
                        <div class="filter-group">
                            <label>Rango de tiempo:</label>
                            <select id="time-range-filter">
                                <option value="1h">Última hora</option>
                                <option value="6h">Últimas 6 horas</option>
                                <option value="24h">Últimas 24 horas</option>
                                <option value="7d">Últimos 7 días</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Tipo de consulta:</label>
                            <select id="query-type-filter">
                                <option value="all">Todas</option>
                                <option value="select">SELECT</option>
                                <option value="insert">INSERT</option>
                                <option value="update">UPDATE</option>
                                <option value="delete">DELETE</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Estado:</label>
                            <select id="status-filter">
                                <option value="all">Todos</option>
                                <option value="success">Exitosas</option>
                                <option value="error">Con errores</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-content">
                    <div class="dashboard-metrics">
                        <h3>📈 Métricas en Tiempo Real</h3>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-value" id="queries-per-second">0</div>
                                <div class="metric-label">Consultas/segundo</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value" id="average-response-time">0ms</div>
                                <div class="metric-label">Tiempo promedio</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value" id="error-rate">0%</div>
                                <div class="metric-label">Tasa de error</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value" id="cache-hit-rate">0%</div>
                                <div class="metric-label">Tasa de caché</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value" id="active-connections">0</div>
                                <div class="metric-label">Conexiones activas</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value" id="slow-queries">0</div>
                                <div class="metric-label">Consultas lentas</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-charts">
                        <h3>📊 Gráficos de Rendimiento</h3>
                        <div class="charts-grid">
                            <div class="chart-container">
                                <h4>Rendimiento de Consultas</h4>
                                <canvas id="query-performance-chart"></canvas>
                            </div>
                            <div class="chart-container">
                                <h4>Tasa de Error</h4>
                                <canvas id="error-rate-chart"></canvas>
                            </div>
                            <div class="chart-container">
                                <h4>Pool de Conexiones</h4>
                                <canvas id="connection-pool-chart"></canvas>
                            </div>
                            <div class="chart-container">
                                <h4>Eficiencia de Caché</h4>
                                <canvas id="cache-efficiency-chart"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-alerts">
                        <h3>🚨 Alertas Activas</h3>
                        <div id="alerts-list" class="alerts-list">
                            <p class="no-alerts">No hay alertas activas</p>
                        </div>
                    </div>
                    
                    <div class="dashboard-queries">
                        <h3>🔍 Consultas Recientes</h3>
                        <div class="queries-table-container">
                            <table id="recent-queries-table" class="queries-table">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Tipo</th>
                                        <th>Consulta</th>
                                        <th>Tiempo</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colspan="6" class="loading-row">Cargando consultas...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .query-monitoring-dashboard {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 20px;
                    background-color: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                
                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e9ecef;
                }
                
                .dashboard-header h1 {
                    margin: 0;
                    color: #2c3e50;
                    font-size: 28px;
                }
                
                .dashboard-controls {
                    display: flex;
                    gap: 10px;
                }
                
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s ease;
                }
                
                .btn-primary { background-color: #3498db; color: white; }
                .btn-secondary { background-color: #6c757d; color: white; }
                .btn-info { background-color: #17a2b8; color: white; }
                .btn-danger { background-color: #dc3545; color: white; }
                
                .btn:hover:not(:disabled) { opacity: 0.8; transform: translateY(-1px); }
                .btn:disabled { opacity: 0.5; cursor: not-allowed; }
                
                .dashboard-filters {
                    background: white;
                    padding: 20px;
                    border-radius: 6px;
                    margin-bottom: 20px;
                    border: 1px solid #dee2e6;
                }
                
                .filter-controls {
                    display: flex;
                    gap: 20px;
                    flex-wrap: wrap;
                }
                
                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                
                .filter-group label {
                    font-weight: bold;
                    color: #495057;
                }
                
                .filter-group select {
                    padding: 8px;
                    border: 1px solid #ced4da;
                    border-radius: 4px;
                    background-color: white;
                }
                
                .dashboard-content {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 20px;
                }
                
                @media (min-width: 1200px) {
                    .dashboard-content {
                        grid-template-columns: 1fr 1fr;
                    }
                }
                
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                }
                
                .metric-card {
                    background: white;
                    padding: 20px;
                    border-radius: 6px;
                    text-align: center;
                    border: 1px solid #e9ecef;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .metric-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 5px;
                }
                
                .metric-label {
                    font-size: 12px;
                    color: #6c757d;
                    text-transform: uppercase;
                }
                
                .charts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                }
                
                .chart-container {
                    background: white;
                    padding: 20px;
                    border-radius: 6px;
                    border: 1px solid #e9ecef;
                }
                
                .chart-container h4 {
                    margin-top: 0;
                    color: #495057;
                    text-align: center;
                }
                
                .alerts-list {
                    max-height: 300px;
                    overflow-y: auto;
                }
                
                .alert-item {
                    background: white;
                    padding: 15px;
                    margin-bottom: 10px;
                    border-radius: 6px;
                    border-left: 4px solid #dc3545;
                }
                
                .alert-warning {
                    border-left-color: #ffc107;
                }
                
                .alert-info {
                    border-left-color: #17a2b8;
                }
                
                .alert-success {
                    border-left-color: #28a745;
                }
                
                .queries-table {
                    width: 100%;
                    background: white;
                    border-radius: 6px;
                    overflow: hidden;
                }
                
                .queries-table th,
                .queries-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .queries-table th {
                    background-color: #f8f9fa;
                    font-weight: bold;
                    color: #495057;
                }
                
                .query-success { color: #28a745; }
                .query-error { color: #dc3545; }
                .query-slow { color: #ffc107; }
                
                .loading-row {
                    text-align: center;
                    color: #6c757d;
                    font-style: italic;
                }
                
                .no-alerts {
                    text-align: center;
                    color: #6c757d;
                    font-style: italic;
                    padding: 20px;
                }
            </style>
        `;
        
        // Agregar al DOM
        document.body.insertAdjacentHTML('beforeend', dashboardHTML);
        
        // Guardar referencias a elementos
        this.elements.dashboard = document.getElementById('query-monitoring-dashboard');
        this.elements.metricsContainer = document.querySelector('.dashboard-metrics');
        this.elements.chartsContainer = document.querySelector('.dashboard-charts');
        this.elements.alertsContainer = document.querySelector('.dashboard-alerts');
        this.elements.filtersContainer = document.querySelector('.dashboard-filters');
    },

    /**
     * Inicializar componentes del dashboard
     */
    initializeComponents: function() {
        // Inicializar gráficos
        this.initializeCharts();
        
        // Inicializar métricas
        this.initializeMetrics();
        
        // Inicializar alertas
        this.initializeAlerts();
    },

    /**
     * Inicializar gráficos
     */
    initializeCharts: function() {
        // Chart.js would be ideal, but for simplicity we'll create placeholder charts
        this.state.charts.queryPerformance = {
            canvas: document.getElementById('query-performance-chart'),
            data: [],
            update: function(data) {
                // Update chart logic here
                console.log('Updating query performance chart:', data);
            }
        };
        
        this.state.charts.errorRate = {
            canvas: document.getElementById('error-rate-chart'),
            data: [],
            update: function(data) {
                console.log('Updating error rate chart:', data);
            }
        };
        
        this.state.charts.connectionPool = {
            canvas: document.getElementById('connection-pool-chart'),
            data: [],
            update: function(data) {
                console.log('Updating connection pool chart:', data);
            }
        };
        
        this.state.charts.cacheEfficiency = {
            canvas: document.getElementById('cache-efficiency-chart'),
            data: [],
            update: function(data) {
                console.log('Updating cache efficiency chart:', data);
            }
        };
    },

    /**
     * Inicializar métricas
     */
    initializeMetrics: function() {
        this.state.metrics.realtime = {
            queriesPerSecond: 0,
            averageResponseTime: 0,
            errorRate: 0,
            cacheHitRate: 0,
            activeConnections: 0,
            slowQueries: 0
        };
    },

    /**
     * Inicializar sistema de alertas
     */
    initializeAlerts: function() {
        this.state.alerts = [];
    },

    /**
     * Configurar actualización automática
     */
    setupAutoUpdate: function() {
        setInterval(() => {
            if (this.state.isMonitoring) {
                this.updateMetrics();
                this.updateCharts();
                this.checkAlerts();
            }
        }, this.config.updateInterval);
    },

    /**
     * Configurar manejadores de eventos
     */
    setupEventHandlers: function() {
        // Botones de control
        document.getElementById('start-monitoring').addEventListener('click', () => {
            this.startMonitoring();
        });
        
        document.getElementById('stop-monitoring').addEventListener('click', () => {
            this.stopMonitoring();
        });
        
        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });
        
        document.getElementById('clear-data').addEventListener('click', () => {
            this.clearData();
        });
        
        // Filtros
        document.getElementById('time-range-filter').addEventListener('change', (e) => {
            this.state.currentFilters.timeRange = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('query-type-filter').addEventListener('change', (e) => {
            this.state.currentFilters.queryType = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.state.currentFilters.status = e.target.value;
            this.applyFilters();
        });
    },

    /**
     * Iniciar monitoreo
     */
    startMonitoring: function() {
        if (this.state.isMonitoring) {
            return;
        }
        
        console.log('▶️ Iniciando monitoreo de consultas...');
        
        this.state.isMonitoring = true;
        this.state.lastUpdate = Date.now();
        
        // Actualizar botones
        document.getElementById('start-monitoring').disabled = true;
        document.getElementById('stop-monitoring').disabled = false;
        
        // Inicializar recolección de datos
        this.collectInitialData();
        
        // Mostrar notificación
        this.showNotification('Monitoreo iniciado', 'success');
    },

    /**
     * Detener monitoreo
     */
    stopMonitoring: function() {
        if (!this.state.isMonitoring) {
            return;
        }
        
        console.log('⏸️ Deteniendo monitoreo de consultas...');
        
        this.state.isMonitoring = false;
        
        // Actualizar botones
        document.getElementById('start-monitoring').disabled = false;
        document.getElementById('stop-monitoring').disabled = true;
        
        // Mostrar notificación
        this.showNotification('Monitoreo detenido', 'info');
    },

    /**
     * Recopilar datos iniciales
     */
    collectInitialData: function() {
        // Recopilar datos de Database Manager
        if (typeof DatabaseManager !== 'undefined') {
            const dbStats = DatabaseManager.getStatistics();
            this.updateMetricsFromDatabaseStats(dbStats);
        }
        
        // Recopilar datos de Query Cache
        if (typeof QueryCache !== 'undefined') {
            const cacheStats = QueryCache.getStatistics();
            this.updateMetricsFromCacheStats(cacheStats);
        }
        
        // Recopilar datos de Query Analyzer
        if (typeof QueryAnalyzer !== 'undefined') {
            const analyzerStats = QueryAnalyzer.getStatistics();
            this.updateMetricsFromAnalyzerStats(analyzerStats);
        }
    },

    /**
     * Actualizar métricas desde estadísticas de base de datos
     * @param {Object} dbStats - Estadísticas de base de datos
     */
    updateMetricsFromDatabaseStats: function(dbStats) {
        if (dbStats.metrics) {
            this.state.metrics.realtime.averageResponseTime = dbStats.metrics.averageQueryTime || 0;
            this.state.metrics.realtime.activeConnections = dbStats.pool?.totalCount || 0;
            this.state.metrics.realtime.slowQueries = dbStats.metrics.slowQueries || 0;
            
            // Calcular consultas por segundo
            const totalQueries = dbStats.metrics.totalQueries || 0;
            const timeSpan = (Date.now() - (this.state.lastUpdate || Date.now())) / 1000;
            this.state.metrics.realtime.queriesPerSecond = timeSpan > 0 ? totalQueries / timeSpan : 0;
        }
    },

    /**
     * Actualizar métricas desde estadísticas de caché
     * @param {Object} cacheStats - Estadísticas de caché
     */
    updateMetricsFromCacheStats: function(cacheStats) {
        if (cacheStats.metrics) {
            this.state.metrics.realtime.cacheHitRate = cacheStats.metrics.hitRate || 0;
        }
    },

    /**
     * Actualizar métricas desde estadísticas de analizador
     * @param {Object} analyzerStats - Estadísticas de analizador
     */
    updateMetricsFromAnalyzerStats: function(analyzerStats) {
        if (analyzerStats.metrics) {
            const totalQueries = analyzerStats.metrics.totalQueries || 0;
            const failedQueries = analyzerStats.metrics.failedQueries || 0;
            
            this.state.metrics.realtime.errorRate = totalQueries > 0 ? 
                (failedQueries / totalQueries) * 100 : 0;
        }
    },

    /**
     * Actualizar métricas en la interfaz
     */
    updateMetrics: function() {
        // Actualizar valores en el DOM
        document.getElementById('queries-per-second').textContent = 
            this.state.metrics.realtime.queriesPerSecond.toFixed(2);
        
        document.getElementById('average-response-time').textContent = 
            Math.round(this.state.metrics.realtime.averageResponseTime) + 'ms';
        
        document.getElementById('error-rate').textContent = 
            this.state.metrics.realtime.errorRate.toFixed(1) + '%';
        
        document.getElementById('cache-hit-rate').textContent = 
            this.state.metrics.realtime.cacheHitRate.toFixed(1) + '%';
        
        document.getElementById('active-connections').textContent = 
            this.state.metrics.realtime.activeConnections;
        
        document.getElementById('slow-queries').textContent = 
            this.state.metrics.realtime.slowQueries;
        
        // Aplicar colores según umbrales
        this.applyMetricColors();
    },

    /**
     * Aplicar colores a métricas según umbrales
     */
    applyMetricColors: function() {
        const thresholds = this.config.alertThresholds;
        
        // Tiempo de respuesta
        const responseTimeElement = document.getElementById('average-response-time');
        if (this.state.metrics.realtime.averageResponseTime > thresholds.slowQueryThreshold) {
            responseTimeElement.style.color = this.config.chartColors.danger;
        } else if (this.state.metrics.realtime.averageResponseTime > thresholds.slowQueryThreshold / 2) {
            responseTimeElement.style.color = this.config.chartColors.warning;
        } else {
            responseTimeElement.style.color = this.config.chartColors.success;
        }
        
        // Tasa de error
        const errorRateElement = document.getElementById('error-rate');
        if (this.state.metrics.realtime.errorRate > thresholds.errorRateThreshold) {
            errorRateElement.style.color = this.config.chartColors.danger;
        } else if (this.state.metrics.realtime.errorRate > thresholds.errorRateThreshold / 2) {
            errorRateElement.style.color = this.config.chartColors.warning;
        } else {
            errorRateElement.style.color = this.config.chartColors.success;
        }
        
        // Conexiones activas
        const connectionsElement = document.getElementById('active-connections');
        if (this.state.metrics.realtime.activeConnections > thresholds.connectionPoolThreshold) {
            connectionsElement.style.color = this.config.chartColors.warning;
        } else {
            connectionsElement.style.color = this.config.chartColors.success;
        }
    },

    /**
     * Actualizar gráficos
     */
    updateCharts: function() {
        const timestamp = Date.now();
        
        // Actualizar gráfico de rendimiento
        const performanceData = {
            timestamp: timestamp,
            responseTime: this.state.metrics.realtime.averageResponseTime,
            queriesPerSecond: this.state.metrics.realtime.queriesPerSecond
        };
        this.state.charts.queryPerformance.update(performanceData);
        
        // Actualizar gráfico de tasa de error
        const errorData = {
            timestamp: timestamp,
            errorRate: this.state.metrics.realtime.errorRate
        };
        this.state.charts.errorRate.update(errorData);
        
        // Actualizar gráfico de pool de conexiones
        const connectionData = {
            timestamp: timestamp,
            activeConnections: this.state.metrics.realtime.activeConnections
        };
        this.state.charts.connectionPool.update(connectionData);
        
        // Actualizar gráfico de eficiencia de caché
        const cacheData = {
            timestamp: timestamp,
            hitRate: this.state.metrics.realtime.cacheHitRate
        };
        this.state.charts.cacheEfficiency.update(cacheData);
    },

    /**
     * Verificar y generar alertas
     */
    checkAlerts: function() {
        const thresholds = this.config.alertThresholds;
        const newAlerts = [];
        
        // Alerta de consultas lentas
        if (this.state.metrics.realtime.averageResponseTime > thresholds.slowQueryThreshold) {
            newAlerts.push({
                id: 'slow_queries',
                type: 'warning',
                title: 'Consultas Lentas Detectadas',
                message: `Tiempo promedio de consulta: ${Math.round(this.state.metrics.realtime.averageResponseTime)}ms`,
                timestamp: Date.now(),
                severity: 'warning'
            });
        }
        
        // Alerta de alta tasa de error
        if (this.state.metrics.realtime.errorRate > thresholds.errorRateThreshold) {
            newAlerts.push({
                id: 'high_error_rate',
                type: 'error',
                title: 'Alta Tasa de Error',
                message: `Tasa de error: ${this.state.metrics.realtime.errorRate.toFixed(1)}%`,
                timestamp: Date.now(),
                severity: 'danger'
            });
        }
        
        // Alerta de pool de conexiones
        if (this.state.metrics.realtime.activeConnections > thresholds.connectionPoolThreshold) {
            newAlerts.push({
                id: 'connection_pool_pressure',
                type: 'warning',
                title: 'Presión en Pool de Conexiones',
                message: `Conexiones activas: ${this.state.metrics.realtime.activeConnections}/${thresholds.connectionPoolThreshold}%`,
                timestamp: Date.now(),
                severity: 'warning'
            });
        }
        
        // Agregar alertas nuevas y eliminar duplicadas
        newAlerts.forEach(alert => {
            if (!this.state.alerts.find(existing => existing.id === alert.id)) {
                this.state.alerts.push(alert);
                this.showAlert(alert);
            }
        });
        
        // Limitar número de alertas
        if (this.state.alerts.length > 50) {
            this.state.alerts = this.state.alerts.slice(-50);
        }
    },

    /**
     * Mostrar alerta en la interfaz
     * @param {Object} alert - Alerta a mostrar
     */
    showAlert: function(alert) {
        const alertsList = document.getElementById('alerts-list');
        
        // Eliminar mensaje de "no hay alertas"
        const noAlertsMessage = alertsList.querySelector('.no-alerts');
        if (noAlertsMessage) {
            noAlertsMessage.remove();
        }
        
        // Crear elemento de alerta
        const alertElement = document.createElement('div');
        alertElement.className = `alert-item alert-${alert.type}`;
        alertElement.innerHTML = `
            <div class="alert-header">
                <strong>${alert.title}</strong>
                <span class="alert-time">${new Date(alert.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="alert-message">${alert.message}</div>
        `;
        
        // Agregar al principio de la lista
        alertsList.insertBefore(alertElement, alertsList.firstChild);
        
        // Limitar número de alertas visibles
        const visibleAlerts = alertsList.querySelectorAll('.alert-item');
        if (visibleAlerts.length > 10) {
            visibleAlerts[visibleAlerts.length - 1].remove();
        }
    },

    /**
     * Aplicar filtros a los datos
     */
    applyFilters: function() {
        console.log('Aplicando filtros:', this.state.currentFilters);
        
        // Aquí se implementaría la lógica de filtrado
        // Por ahora, solo recopilamos datos actualizados
        this.collectInitialData();
    },

    /**
     * Exportar datos del monitoreo
     */
    exportData: function() {
        if (!this.config.enableExport) {
            this.showNotification('Exportación deshabilitada', 'warning');
            return;
        }
        
        const exportData = {
            timestamp: new Date().toISOString(),
            filters: this.state.currentFilters,
            metrics: this.state.metrics,
            alerts: this.state.alerts,
            charts: {
                queryPerformance: this.state.charts.queryPerformance.data,
                errorRate: this.state.charts.errorRate.data,
                connectionPool: this.state.charts.connectionPool.data,
                cacheEfficiency: this.state.charts.cacheEfficiency.data
            }
        };
        
        // Crear blob y descargar
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `query-monitoring-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Datos exportados exitosamente', 'success');
    },

    /**
     * Limpiar datos del monitoreo
     */
    clearData: function() {
        // Confirmar limpieza
        if (!confirm('¿Está seguro de que desea limpiar todos los datos del monitoreo?')) {
            return;
        }
        
        // Limpiar métricas
        this.state.metrics.realtime = {
            queriesPerSecond: 0,
            averageResponseTime: 0,
            errorRate: 0,
            cacheHitRate: 0,
            activeConnections: 0,
            slowQueries: 0
        };
        
        // Limpiar alertas
        this.state.alerts = [];
        
        // Limpiar gráficos
        Object.values(this.state.charts).forEach(chart => {
            chart.data = [];
        });
        
        // Actualizar interfaz
        this.updateMetrics();
        this.updateCharts();
        
        // Limpiar lista de alertas
        const alertsList = document.getElementById('alerts-list');
        alertsList.innerHTML = '<p class="no-alerts">No hay alertas activas</p>';
        
        this.showNotification('Datos limpiados exitosamente', 'success');
    },

    /**
     * Mostrar notificación
     * @param {string} message - Mensaje
     * @param {string} type - Tipo de notificación
     */
    showNotification: function(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 6px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        // Aplicar color según tipo
        const colors = {
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545',
            info: '#17a2b8'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        
        // Agregar al DOM
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    },

    /**
     * Obtener estado actual del monitoreo
     * @returns {Object} Estado completo
     */
    getState: function() {
        return {
            isMonitoring: this.state.isMonitoring,
            lastUpdate: this.state.lastUpdate,
            currentFilters: this.state.currentFilters,
            metrics: this.state.metrics,
            alerts: this.state.alerts,
            config: this.config
        };
    },

    /**
     * Destruir dashboard
     */
    destroy: function() {
        if (this.state.isMonitoring) {
            this.stopMonitoring();
        }
        
        // Remover elemento del dashboard
        if (this.elements.dashboard && this.elements.dashboard.parentNode) {
            this.elements.dashboard.parentNode.removeChild(this.elements.dashboard);
        }
        
        // Limpiar estado
        this.state = {
            initialized: false,
            isMonitoring: false,
            lastUpdate: null,
            currentFilters: { ...this.config.defaultFilters },
            alerts: [],
            metrics: {
                realtime: {},
                historical: new Map()
            },
            charts: {
                queryPerformance: null,
                errorRate: null,
                connectionPool: null,
                cacheEfficiency: null
            }
        };
        
        console.log('🗑️ Query Monitoring Dashboard destruido');
    }
};

// Agregar animaciones CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.QueryMonitoringDashboard = QueryMonitoringDashboard;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = QueryMonitoringDashboard;
}