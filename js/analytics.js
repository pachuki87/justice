/**
 * Justice 2 Analytics Manager
 * Sistema de análisis y visualización de datos con Chart.js
 */

// Importar sistema de protección XSS
import { XSSProtection } from '../components/xss-protection.js';

const AnalyticsManager = {
    // Configuración
    config: {
        refreshInterval: 30000, // 30 segundos
        chartColors: {
            primary: '#B49C73',
            secondary: '#37373F',
            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8'
        },
        chartOptions: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        fontColor: '#37373F',
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(55, 55, 63, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#B49C73',
                    borderWidth: 1
                }
            }
        }
    },
    
    // Estado
    state: {
        currentPeriod: '30d',
        customDateRange: {
            start: null,
            end: null
        },
        charts: {},
        data: {
            keyMetrics: {},
            casesTrend: [],
            caseTypes: [],
            successRate: [],
            resolutionTime: [],
            aiPerformance: {},
            topPerformers: []
        },
        isLoading: false
    },
    
    // Inicialización
    init: function() {
        this.log('Inicializando Analytics Manager');
        
        // Inicializar Chart.js
        this.initCharts();
        
        // Inicializar eventos
        this.initEvents();
        
        // Cargar datos iniciales
        this.loadAnalyticsData();
        
        // Inicializar actualización automática
        this.startAutoRefresh();
        
        this.log('Analytics Manager inicializado');
    },
    
    // Inicializar eventos
    initEvents: function() {
        // Selector de período
        const periodSelector = document.getElementById('period-selector');
        const customDateRange = document.getElementById('custom-date-range');
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        
        if (periodSelector) {
            periodSelector.addEventListener('change', (e) => {
                this.handlePeriodChange(e.target.value);
            });
        }
        
        if (startDate) {
            startDate.addEventListener('change', () => {
                this.handleCustomDateChange();
            });
        }
        
        if (endDate) {
            endDate.addEventListener('change', () => {
                this.handleCustomDateChange();
            });
        }
        
        // Botón de exportar
        const exportBtn = document.querySelector('[onclick="AnalyticsManager.exportReport()"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportReport());
        }
    },
    
    // Manejar cambio de período
    handlePeriodChange: function(period) {
        // Validar y sanitizar el período seleccionado
        const sanitizedPeriod = XSSProtection.validateInput(period, {
            type: 'text',
            required: true,
            allowedValues: ['7d', '30d', '90d', '1y', 'custom'],
            errorMessage: 'Período seleccionado inválido'
        });
        
        if (sanitizedPeriod) {
            this.state.currentPeriod = sanitizedPeriod;
            
            const customDateRange = document.getElementById('custom-date-range');
            
            if (sanitizedPeriod === 'custom') {
                customDateRange.classList.remove('d-none');
            } else {
                customDateRange.classList.add('d-none');
                this.state.customDateRange = { start: null, end: null };
            }
            
            this.loadAnalyticsData();
        }
    },
    
    // Manejar cambio de fecha personalizada
    handleCustomDateChange: function() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        // Validar y sanitizar entradas de fecha
        if (startDate && endDate) {
            const sanitizedStartDate = XSSProtection.validateInput(startDate, {
                type: 'date',
                required: true,
                errorMessage: 'Fecha de inicio inválida'
            });
            
            const sanitizedEndDate = XSSProtection.validateInput(endDate, {
                type: 'date',
                required: true,
                errorMessage: 'Fecha de fin inválida'
            });
            
            if (sanitizedStartDate && sanitizedEndDate) {
                this.state.customDateRange = {
                    start: new Date(sanitizedStartDate),
                    end: new Date(sanitizedEndDate)
                };
                this.loadAnalyticsData();
            }
        }
    },
    
    // Cargar datos de analytics
    loadAnalyticsData: async function() {
        this.state.isLoading = true;
        this.showLoading();
        
        try {
            const params = {
                period: this.state.currentPeriod,
                ...this.state.customDateRange
            };
            
            // Cargar diferentes tipos de datos
            const [keyMetrics, casesTrend, caseTypes, successRate, resolutionTime, aiPerformance, topPerformers] = await Promise.all([
                Justice2API.getDashboard(params),
                Justice2API.getCasesAnalytics(params),
                Justice2API.getPerformanceAnalytics(params),
                Justice2API.getDocumentsAnalytics(params)
            ]);
            
            this.state.data = {
                keyMetrics: keyMetrics.data || this.getMockKeyMetrics(),
                casesTrend: casesTrend.data || this.getMockCasesTrend(),
                caseTypes: caseTypes.data || this.getMockCaseTypes(),
                successRate: successRate.data || this.getMockSuccessRate(),
                resolutionTime: resolutionTime.data || this.getMockResolutionTime(),
                aiPerformance: aiPerformance.data || this.getMockAIPerformance(),
                topPerformers: topPerformers.data || this.getMockTopPerformers()
            };
            
            // Actualizar visualizaciones
            this.updateKeyMetrics();
            this.updateCharts();
            this.updateAITable();
            
        } catch (error) {
            this.log('Error cargando datos de analytics:', error);
            // Usar datos mock para demostración
            this.loadMockData();
        } finally {
            this.state.isLoading = false;
            this.hideLoading();
        }
    },
    
    // Cargar datos mock para demostración
    loadMockData: function() {
        this.state.data = {
            keyMetrics: this.getMockKeyMetrics(),
            casesTrend: this.getMockCasesTrend(),
            caseTypes: this.getMockCaseTypes(),
            successRate: this.getMockSuccessRate(),
            resolutionTime: this.getMockResolutionTime(),
            aiPerformance: this.getMockAIPerformance(),
            topPerformers: this.getMockTopPerformers()
        };
        
        this.updateKeyMetrics();
        this.updateCharts();
        this.updateAITable();
    },
    
    // Obtener métricas clave mock
    getMockKeyMetrics: function() {
        return {
            total_cases: 47,
            active_cases: 15,
            resolved_cases: 32,
            success_rate: 89,
            avg_resolution_time: 15,
            total_documents: 234,
            ai_analyses: 1247,
            client_satisfaction: 92
        };
    },
    
    // Obtener tendencia de casos mock
    getMockCasesTrend: function() {
        const days = 30;
        const data = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            data.push({
                date: date.toISOString().split('T')[0],
                new_cases: Math.floor(Math.random() * 3) + 1,
                resolved_cases: Math.floor(Math.random() * 4) + 2
            });
        }
        
        return data;
    },
    
    // Obtener distribución por tipo mock
    getMockCaseTypes: function() {
        return [
            { type: 'Civil', count: 18, color: '#B49C73' },
            { type: 'Penal', count: 12, color: '#dc3545' },
            { type: 'Laboral', count: 15, color: '#28a745' },
            { type: 'Familiar', count: 8, color: '#ffc107' },
            { type: 'Administrativo', count: 4, color: '#17a2b8' }
        ];
    },
    
    // Obtener tasa de éxito mock
    getMockSuccessRate: function() {
        return [
            { type: 'Civil', rate: 85, color: '#B49C73' },
            { type: 'Penal', rate: 92, color: '#dc3545' },
            { type: 'Laboral', rate: 88, color: '#28a745' },
            { type: 'Familiar', rate: 91, color: '#ffc107' },
            { type: 'Administrativo', rate: 87, color: '#17a2b8' }
        ];
    },
    
    // Obtener tiempo de resolución mock
    getMockResolutionTime: function() {
        return {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [{
                label: 'Días Promedio',
                data: [18, 16, 14, 15, 13, 12],
                borderColor: '#B49C73',
                backgroundColor: 'rgba(180, 156, 115, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };
    },
    
    // Obtener rendimiento IA mock
    getMockAIPerformance: function() {
        return {
            total_analyses: 1247,
            accuracy: 94,
            avg_response_time: 2.3,
            user_satisfaction: 89,
            cost_savings: 15680
        };
    },
    
    // Obtener mejores desempeños mock
    getMockTopPerformers: function() {
        return [
            {
                name: 'Dr. José Moreno',
                cases: 28,
                success_rate: 96,
                avg_resolution_time: 12,
                client_satisfaction: 98
            },
            {
                name: 'María García',
                cases: 24,
                success_rate: 91,
                avg_resolution_time: 14,
                client_satisfaction: 94
            },
            {
                name: 'Carlos Rodríguez',
                cases: 19,
                success_rate: 89,
                avg_resolution_time: 16,
                client_satisfaction: 91
            },
            {
                name: 'Ana Martínez',
                cases: 17,
                success_rate: 93,
                avg_resolution_time: 13,
                client_satisfaction: 96
            },
            {
                name: 'Luis Fernández',
                cases: 15,
                success_rate: 87,
                avg_resolution_time: 18,
                client_satisfaction: 88
            }
        ];
    },
    
    // Actualizar métricas clave
    updateKeyMetrics: function() {
        const metrics = this.state.data.keyMetrics;
        
        // Actualizar números con animación
        this.animateNumber('total-cases', metrics.total_cases);
        this.animateNumber('active-cases', metrics.active_cases);
        this.animateNumber('closed-cases', metrics.resolved_cases);
        this.animateNumber('success-rate', metrics.success_rate);
        this.animateNumber('avg-resolution-days', metrics.avg_resolution_time);
    },
    
    // Animar número
    animateNumber: function(elementId, target) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const start = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(start);
            }
        }, 20);
    },
    
    // Inicializar charts
    initCharts: function() {
        // Chart de tendencia de casos
        const casesTrendCtx = document.getElementById('cases-trend-chart');
        if (casesTrendCtx) {
            this.state.charts.casesTrend = new Chart(casesTrendCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Nuevos Casos',
                        data: [],
                        borderColor: this.config.chartColors.primary,
                        backgroundColor: 'rgba(180, 156, 115, 0.1)',
                        fill: true,
                        tension: 0.4
                    }, {
                        label: 'Casos Resueltos',
                        data: [],
                        borderColor: this.config.chartColors.success,
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                ...this.config.chartOptions
            });
        }
        
        // Chart de distribución por tipo
        const caseTypesCtx = document.getElementById('case-types-chart');
        if (caseTypesCtx) {
            this.state.charts.caseTypes = new Chart(caseTypesCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                ...this.config.chartOptions
            });
        }
        
        // Chart de tasa de éxito
        const successRateCtx = document.getElementById('success-rate-chart');
        if (successRateCtx) {
            this.state.charts.successRate = new Chart(successRateCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Tasa de Éxito (%)',
                        data: [],
                        backgroundColor: [],
                        borderColor: [],
                        borderWidth: 1
                    }]
                },
                ...this.config.chartOptions
            });
        }
        
        // Chart de tiempo de resolución
        const resolutionTimeCtx = document.getElementById('resolution-time-chart');
        if (resolutionTimeCtx) {
            this.state.charts.resolutionTime = new Chart(resolutionTimeCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: []
                },
                ...this.config.chartOptions
            });
        }
    },
    
    // Actualizar charts
    updateCharts: function() {
        // Actualizar chart de tendencia
        this.updateCasesTrendChart();
        
        // Actualizar chart de tipos
        this.updateCaseTypesChart();
        
        // Actualizar chart de tasa de éxito
        this.updateSuccessRateChart();
        
        // Actualizar chart de tiempo de resolución
        this.updateResolutionTimeChart();
    },
    
    // Actualizar chart de tendencia de casos
    updateCasesTrendChart: function() {
        const chart = this.state.charts.casesTrend;
        if (!chart || !this.state.data.casesTrend) return;
        
        const data = this.state.data.casesTrend;
        chart.data.labels = data.map(item => item.date);
        chart.data.datasets[0].data = data.map(item => item.new_cases);
        chart.data.datasets[1].data = data.map(item => item.resolved_cases);
        
        chart.update('active');
    },
    
    // Actualizar chart de tipos de casos
    updateCaseTypesChart: function() {
        const chart = this.state.charts.caseTypes;
        if (!chart || !this.state.data.caseTypes) return;
        
        const data = this.state.data.caseTypes;
        chart.data.labels = data.map(item => item.type);
        chart.data.datasets[0].data = data.map(item => item.count);
        chart.data.datasets[0].backgroundColor = data.map(item => item.color);
        
        chart.update('active');
    },
    
    // Actualizar chart de tasa de éxito
    updateSuccessRateChart: function() {
        const chart = this.state.charts.successRate;
        if (!chart || !this.state.data.successRate) return;
        
        const data = this.state.data.successRate;
        chart.data.labels = data.map(item => item.type);
        chart.data.datasets[0].data = data.map(item => item.rate);
        chart.data.datasets[0].backgroundColor = data.map(item => item.color);
        chart.data.datasets[0].borderColor = data.map(item => item.color);
        
        chart.update('active');
    },
    
    // Actualizar chart de tiempo de resolución
    updateResolutionTimeChart: function() {
        const chart = this.state.charts.resolutionTime;
        if (!chart || !this.state.data.resolutionTime) return;
        
        const data = this.state.data.resolutionTime;
        chart.data = data;
        
        chart.update('active');
    },
    
    // Actualizar tabla de rendimiento IA
    updateAITable: function() {
        const table = document.getElementById('top-performers-table');
        if (!table || !this.state.data.topPerformers) return;
        
        // Sanitizar datos de mejores desempeños
        const sanitizedPerformers = this.state.data.topPerformers.map(performer =>
            this.sanitizePerformerData(performer)
        );
        
        let html = '';
        sanitizedPerformers.forEach((performer, index) => {
            html += `
                <tr>
                    <td>${performer.name}</td>
                    <td>${performer.cases}</td>
                    <td>${performer.success_rate}%</td>
                    <td>${performer.avg_resolution_time} días</td>
                    <td>${performer.client_satisfaction}%</td>
                </tr>
            `;
        });
        
        // Usar setInnerHTMLSafe en lugar de innerHTML directo
        XSSProtection.setInnerHTMLSafe(table, html);
        
        // Actualizar métricas de IA
        const aiData = this.state.data.aiPerformance;
        this.animateNumber('ai-analyses', aiData.total_analyses);
        this.animateNumber('ai-accuracy', aiData.accuracy);
        this.animateNumber('ai-response-time', aiData.avg_response_time);
        this.animateNumber('ai-satisfaction', aiData.user_satisfaction);
        this.animateNumber('ai-cost-savings', aiData.cost_savings);
    },
    
    // Mostrar loading
    showLoading: function() {
        const containers = [
            'key-metrics',
            'cases-trend-chart',
            'case-types-chart',
            'success-rate-chart',
            'resolution-time-chart',
            'top-performers-table'
        ];
        
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.opacity = '0.5';
                element.style.pointerEvents = 'none';
            }
        });
    },
    
    // Ocultar loading
    hideLoading: function() {
        const containers = [
            'key-metrics',
            'cases-trend-chart',
            'case-types-chart',
            'success-rate-chart',
            'resolution-time-chart',
            'top-performers-table'
        ];
        
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.opacity = '1';
                element.style.pointerEvents = 'auto';
            }
        });
    },
    
    // Iniciar actualización automática
    startAutoRefresh: function() {
        setInterval(() => {
            if (!this.state.isLoading) {
                this.loadAnalyticsData();
            }
        }, this.config.refreshInterval);
    },
    
    // Exportar reporte
    exportReport: function() {
        // Sanitizar datos del reporte antes de exportar
        const sanitizedReportData = this.sanitizeReportData({
            period: this.state.currentPeriod,
            customDateRange: this.state.customDateRange,
            generated_at: new Date().toISOString(),
            data: this.state.data
        });
        
        // Crear contenido del reporte con datos sanitizados
        let content = XSSProtection.escapeHtml(`Reporte de Analytics - Justice 2\n`);
        content += XSSProtection.escapeHtml(`Período: ${sanitizedReportData.period}\n`);
        content += XSSProtection.escapeHtml(`Generado: ${new Date().toLocaleString('es-ES')}\n`);
        content += `${'='.repeat(50)}\n\n`;
        
        content += XSSProtection.escapeHtml(`Métricas Clave:\n`);
        content += XSSProtection.escapeHtml(`Total de Casos: ${sanitizedReportData.data.keyMetrics.total_cases}\n`);
        content += XSSProtection.escapeHtml(`Casos Activos: ${sanitizedReportData.data.keyMetrics.active_cases}\n`);
        content += XSSProtection.escapeHtml(`Casos Resueltos: ${sanitizedReportData.data.keyMetrics.resolved_cases}\n`);
        content += XSSProtection.escapeHtml(`Tasa de Éxito: ${sanitizedReportData.data.keyMetrics.success_rate}%\n`);
        content += XSSProtection.escapeHtml(`Tiempo Promedio de Resolución: ${sanitizedReportData.data.keyMetrics.avg_resolution_time} días\n\n`);
        
        content += XSSProtection.escapeHtml(`Rendimiento de IA:\n`);
        content += XSSProtection.escapeHtml(`Análisis Totales: ${sanitizedReportData.data.aiPerformance.total_analyses}\n`);
        content += XSSProtection.escapeHtml(`Precisión: ${sanitizedReportData.data.aiPerformance.accuracy}%\n`);
        content += XSSProtection.escapeHtml(`Tiempo de Respuesta: ${sanitizedReportData.data.aiPerformance.avg_response_time}s\n`);
        content += XSSProtection.escapeHtml(`Satisfacción del Usuario: ${sanitizedReportData.data.aiPerformance.user_satisfaction}%\n`);
        
        // Descargar archivo de forma segura
        const safeFileName = `analytics_report_${new Date().toISOString().split('T')[0]}.txt`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = XSSProtection.sanitizeUrl(url);
        a.download = XSSProtection.sanitizeFileName(safeFileName);
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        if (Justice2.utils && Justice2.utils.showNotification) {
            Justice2.utils.showNotification('Reporte exportado correctamente', 'success');
        }
    },
    
    // Sanitizar datos de mejores desempeños
    sanitizePerformerData: function(performer) {
        return {
            name: XSSProtection.escapeHtml(performer.name || ''),
            cases: XSSProtection.validateInput(performer.cases, { type: 'number', min: 0 }) || 0,
            success_rate: XSSProtection.validateInput(performer.success_rate, { type: 'number', min: 0, max: 100 }) || 0,
            avg_resolution_time: XSSProtection.validateInput(performer.avg_resolution_time, { type: 'number', min: 0 }) || 0,
            client_satisfaction: XSSProtection.validateInput(performer.client_satisfaction, { type: 'number', min: 0, max: 100 }) || 0
        };
    },
    
    // Sanitizar datos del reporte
    sanitizeReportData: function(reportData) {
        const sanitized = {
            period: XSSProtection.escapeHtml(reportData.period || ''),
            generated_at: reportData.generated_at || new Date().toISOString(),
            data: {
                keyMetrics: {
                    total_cases: XSSProtection.validateInput(reportData.data?.keyMetrics?.total_cases, { type: 'number', min: 0 }) || 0,
                    active_cases: XSSProtection.validateInput(reportData.data?.keyMetrics?.active_cases, { type: 'number', min: 0 }) || 0,
                    resolved_cases: XSSProtection.validateInput(reportData.data?.keyMetrics?.resolved_cases, { type: 'number', min: 0 }) || 0,
                    success_rate: XSSProtection.validateInput(reportData.data?.keyMetrics?.success_rate, { type: 'number', min: 0, max: 100 }) || 0,
                    avg_resolution_time: XSSProtection.validateInput(reportData.data?.keyMetrics?.avg_resolution_time, { type: 'number', min: 0 }) || 0,
                    total_documents: XSSProtection.validateInput(reportData.data?.keyMetrics?.total_documents, { type: 'number', min: 0 }) || 0,
                    ai_analyses: XSSProtection.validateInput(reportData.data?.keyMetrics?.ai_analyses, { type: 'number', min: 0 }) || 0,
                    client_satisfaction: XSSProtection.validateInput(reportData.data?.keyMetrics?.client_satisfaction, { type: 'number', min: 0, max: 100 }) || 0
                },
                aiPerformance: {
                    total_analyses: XSSProtection.validateInput(reportData.data?.aiPerformance?.total_analyses, { type: 'number', min: 0 }) || 0,
                    accuracy: XSSProtection.validateInput(reportData.data?.aiPerformance?.accuracy, { type: 'number', min: 0, max: 100 }) || 0,
                    avg_response_time: XSSProtection.validateInput(reportData.data?.aiPerformance?.avg_response_time, { type: 'number', min: 0 }) || 0,
                    user_satisfaction: XSSProtection.validateInput(reportData.data?.aiPerformance?.user_satisfaction, { type: 'number', min: 0, max: 100 }) || 0,
                    cost_savings: XSSProtection.validateInput(reportData.data?.aiPerformance?.cost_savings, { type: 'number', min: 0 }) || 0
                }
            }
        };
        
        // Sanitizar fechas personalizadas si existen
        if (reportData.customDateRange) {
            sanitized.customDateRange = {
                start: reportData.customDateRange.start,
                end: reportData.customDateRange.end
            };
        }
        
        return sanitized;
    },
    
    // Sanitizar datos de métricas clave
    sanitizeKeyMetrics: function(metrics) {
        return {
            total_cases: XSSProtection.validateInput(metrics.total_cases, { type: 'number', min: 0 }) || 0,
            active_cases: XSSProtection.validateInput(metrics.active_cases, { type: 'number', min: 0 }) || 0,
            resolved_cases: XSSProtection.validateInput(metrics.resolved_cases, { type: 'number', min: 0 }) || 0,
            success_rate: XSSProtection.validateInput(metrics.success_rate, { type: 'number', min: 0, max: 100 }) || 0,
            avg_resolution_time: XSSProtection.validateInput(metrics.avg_resolution_time, { type: 'number', min: 0 }) || 0,
            total_documents: XSSProtection.validateInput(metrics.total_documents, { type: 'number', min: 0 }) || 0,
            ai_analyses: XSSProtection.validateInput(metrics.ai_analyses, { type: 'number', min: 0 }) || 0,
            client_satisfaction: XSSProtection.validateInput(metrics.client_satisfaction, { type: 'number', min: 0, max: 100 }) || 0
        };
    },
    
    // Sanitizar datos de tendencia de casos
    sanitizeCasesTrend: function(trendData) {
        if (!Array.isArray(trendData)) return [];
        
        return trendData.map(item => ({
            date: XSSProtection.escapeHtml(item.date || ''),
            new_cases: XSSProtection.validateInput(item.new_cases, { type: 'number', min: 0 }) || 0,
            resolved_cases: XSSProtection.validateInput(item.resolved_cases, { type: 'number', min: 0 }) || 0
        }));
    },
    
    // Sanitizar datos de tipos de casos
    sanitizeCaseTypes: function(caseTypesData) {
        if (!Array.isArray(caseTypesData)) return [];
        
        return caseTypesData.map(item => ({
            type: XSSProtection.escapeHtml(item.type || ''),
            count: XSSProtection.validateInput(item.count, { type: 'number', min: 0 }) || 0,
            color: XSSProtection.sanitizeCssValue(item.color || '#000000')
        }));
    },
    
    // Sanitizar datos de tasa de éxito
    sanitizeSuccessRate: function(successRateData) {
        if (!Array.isArray(successRateData)) return [];
        
        return successRateData.map(item => ({
            type: XSSProtection.escapeHtml(item.type || ''),
            rate: XSSProtection.validateInput(item.rate, { type: 'number', min: 0, max: 100 }) || 0,
            color: XSSProtection.sanitizeCssValue(item.color || '#000000')
        }));
    },
    
    // Logging
    log: function(...args) {
        Justice2?.log('[AnalyticsManager]', ...args);
    }
};

// Inicializar Analytics Manager
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AnalyticsManager.init();
    });
} else {
    AnalyticsManager.init();
}

// Exportar para uso global
window.AnalyticsManager = AnalyticsManager;