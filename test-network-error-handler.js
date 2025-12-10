/**
 * Pruebas Completas para Network Error Handler
 * Sistema de pruebas automatizadas para validar la resiliencia de red
 */

// Importar el sistema a probar
// En un entorno real, esto se importaría como módulo
// const NetworkErrorHandler = require('./components/network-error-handler.js');

const NetworkErrorHandlerTests = {
    // Configuración de pruebas
    config: {
        testTimeout: 30000, // 30 segundos por prueba
        mockServerPort: 3001,
        testEndpoints: [
            '/api/test-success',
            '/api/test-timeout',
            '/api/test-error',
            '/api/test-server-error',
            '/api/test-connection-refused',
            '/api/test-ssl-error'
        ],
        retryTestAttempts: 5,
        circuitBreakerTestThreshold: 3
    },
    
    // Estado de las pruebas
    state: {
        testResults: [],
        currentTest: null,
        startTime: null,
        mockServer: null,
        originalFetch: null,
        originalXHR: null,
        testNotifications: []
    },
    
    // Inicializar pruebas
    init: function() {
        console.log('🧪 Inicializando pruebas de Network Error Handler');
        
        this.state.startTime = Date.now();
        
        // Guardar implementaciones originales
        this.state.originalFetch = window.fetch;
        this.state.originalXHR = window.XMLHttpRequest;
        
        // Configurar mock server
        this.setupMockServer();
        
        // Configurar sistema de notificaciones de prueba
        this.setupTestNotifications();
        
        // Ejecutar todas las pruebas
        this.runAllTests();
    },
    
    // Configurar servidor mock
    setupMockServer: function() {
        // Mock de fetch para simular diferentes escenarios
        window.fetch = async (url, options = {}) => {
            const testUrl = new URL(url, window.location.origin);
            
            // Simular diferentes tipos de errores según el endpoint
            switch (testUrl.pathname) {
                case '/api/test-success':
                    return this.createMockResponse(200, { success: true, data: 'test' });
                
                case '/api/test-timeout':
                    return this.createTimeoutError();
                
                case '/api/test-error':
                    return this.createNetworkError();
                
                case '/api/test-server-error':
                    return this.createMockResponse(500, { error: 'Server Error' });
                
                case '/api/test-connection-refused':
                    return this.createConnectionRefusedError();
                
                case '/api/test-ssl-error':
                    return this.createSSLError();
                
                default:
                    return this.createMockResponse(404, { error: 'Not Found' });
            }
        };
        
        // Mock de XMLHttpRequest
        const self = this;
        window.XMLHttpRequest = function() {
            const xhr = new self.state.originalXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;
            
            let mockResponse = null;
            let mockError = null;
            
            xhr.open = function(method, url) {
                originalOpen.call(this, method, url);
                
                // Determinar respuesta mock según URL
                const testUrl = new URL(url, window.location.origin);
                switch (testUrl.pathname) {
                    case '/api/test-success':
                        mockResponse = { status: 200, responseText: JSON.stringify({ success: true }) };
                        break;
                    case '/api/test-timeout':
                        mockError = new Error('Request Timeout');
                        mockError.name = 'TimeoutError';
                        break;
                    case '/api/test-server-error':
                        mockResponse = { status: 500, responseText: JSON.stringify({ error: 'Server Error' }) };
                        break;
                    default:
                        mockResponse = { status: 404, responseText: JSON.stringify({ error: 'Not Found' }) };
                }
            };
            
            xhr.send = function() {
                const selfXhr = this;
                
                // Simular respuesta asíncrona
                setTimeout(() => {
                    if (mockError) {
                        // Disparar evento de error
                        if (selfXhr.onerror) {
                            selfXhr.onerror(mockError);
                        }
                    } else if (mockResponse) {
                        // Simular respuesta exitosa
                        selfXhr.status = mockResponse.status;
                        selfXhr.responseText = mockResponse.responseText;
                        
                        if (selfXhr.onload) {
                            selfXhr.onload();
                        }
                    }
                }, Math.random() * 1000 + 500); // Delay aleatorio entre 500-1500ms
            };
            
            return xhr;
        };
    },
    
    // Configurar sistema de notificaciones de prueba
    setupTestNotifications: function() {
        // Mock del sistema de notificaciones para capturar llamadas
        if (typeof window !== 'undefined' && window.Justice2) {
            const originalShowNotification = window.Justice2.utils?.showNotification;
            
            window.Justice2.utils = {
                ...window.Justice2.utils,
                showNotification: (message, type) => {
                    this.state.testNotifications.push({
                        message,
                        type,
                        timestamp: Date.now()
                    });
                    
                    console.log(`📢 Notificación: ${message} (${type})`);
                }
            };
        }
    },
    
    // Ejecutar todas las pruebas
    runAllTests: async function() {
        console.log('🚀 Iniciando suite de pruebas de Network Error Handler');
        
        const tests = [
            this.testBasicFunctionality.bind(this),
            this.testErrorClassification.bind(this),
            this.testRetryMechanism.bind(this),
            this.testCircuitBreaker.bind(this),
            this.testConnectionDetection.bind(this),
            this.testNotificationSystem.bind(this),
            this.testTimeoutHandling.bind(this),
            this.testSSLErrorHandling.bind(this),
            this.testConnectionRefusedHandling.bind(this),
            this.testServerErrorHandling.bind(this),
            this.testOfflineMode.bind(this),
            this.testRecoveryMechanism.bind(this)
        ];
        
        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                console.error(`❌ Error en prueba: ${test.name}`, error);
                this.recordTestResult(test.name, false, error.message);
            }
        }
        
        this.generateTestReport();
    },
    
    // Prueba 1: Funcionalidad básica
    testBasicFunctionality: async function() {
        console.log('📋 Prueba 1: Funcionalidad básica');
        
        // Verificar inicialización
        if (typeof NetworkErrorHandler === 'undefined') {
            throw new Error('NetworkErrorHandler no está definido');
        }
        
        // Verificar configuración por defecto
        if (!NetworkErrorHandler.config || !NetworkErrorHandler.state) {
            throw new Error('Configuración o estado no inicializado');
        }
        
        // Verificar métodos principales
        const requiredMethods = [
            'init', 'handleNetworkError', 'classifyError', 'shouldRetry',
            'calculateRetryDelay', 'getCircuitBreaker', 'isCircuitBreakerOpen',
            'checkConnection', 'getStats'
        ];
        
        for (const method of requiredMethods) {
            if (typeof NetworkErrorHandler[method] !== 'function') {
                throw new Error(`Método requerido no encontrado: ${method}`);
            }
        }
        
        this.recordTestResult('Funcionalidad básica', true);
        console.log('✅ Prueba 1 completada exitosamente');
    },
    
    // Prueba 2: Clasificación de errores
    testErrorClassification: async function() {
        console.log('📋 Prueba 2: Clasificación de errores');
        
        const testCases = [
            {
                error: new Error('Request Timeout'),
                name: 'TimeoutError',
                expectedType: 'TIMEOUT_ERROR',
                expectedSeverity: 'medium',
                expectedRetryable: true
            },
            {
                error: new Error('ERR_CONNECTION_REFUSED'),
                expectedType: 'CONNECTION_REFUSED',
                expectedSeverity: 'high',
                expectedRetryable: true
            },
            {
                error: new Error('ERR_CERT_AUTHORITY_INVALID'),
                expectedType: 'SSL_ERROR',
                expectedSeverity: 'high',
                expectedRetryable: false
            },
            {
                error: new Error('ERR_NAME_NOT_RESOLVED'),
                expectedType: 'DNS_ERROR',
                expectedSeverity: 'high',
                expectedRetryable: true
            },
            {
                error: new Error('Network Error'),
                expectedType: 'NETWORK_ERROR',
                expectedSeverity: 'medium',
                expectedRetryable: true
            }
        ];
        
        for (const testCase of testCases) {
            const errorInfo = NetworkErrorHandler.classifyError(testCase.error);
            
            if (errorInfo.type !== testCase.expectedType) {
                throw new Error(`Tipo de error incorrecto. Esperado: ${testCase.expectedType}, Recibido: ${errorInfo.type}`);
            }
            
            if (errorInfo.severity !== testCase.expectedSeverity) {
                throw new Error(`Severidad incorrecta. Esperada: ${testCase.expectedSeverity}, Recibida: ${errorInfo.severity}`);
            }
            
            if (errorInfo.retryable !== testCase.expectedRetryable) {
                throw new Error(`Retryable incorrecto. Esperado: ${testCase.expectedRetryable}, Recibido: ${errorInfo.retryable}`);
            }
        }
        
        this.recordTestResult('Clasificación de errores', true);
        console.log('✅ Prueba 2 completada exitosamente');
    },
    
    // Prueba 3: Mecanismo de reintento
    testRetryMechanism: async function() {
        console.log('📋 Prueba 3: Mecanismo de reintento');
        
        let retryCount = 0;
        const maxRetries = 3;
        
        // Mock de función que falla las primeras veces
        const failingFunction = async () => {
            retryCount++;
            if (retryCount < maxRetries) {
                throw new Error('Network Error');
            }
            return { success: true };
        };
        
        // Probar cálculo de delay de reintento
        for (let i = 0; i < 5; i++) {
            const delay = NetworkErrorHandler.calculateRetryDelay(i);
            const expectedDelay = Math.min(
                NetworkErrorHandler.config.retry.baseDelay * Math.pow(NetworkErrorHandler.config.retry.backoffMultiplier, i),
                NetworkErrorHandler.config.retry.maxDelay
            );
            
            if (Math.abs(delay - expectedDelay) > 100) { // Permitir pequeña variación por jitter
                throw new Error(`Delay de reintento incorrecto. Esperado: ~${expectedDelay}, Recibido: ${delay}`);
            }
        }
        
        // Probar lógica de reintento
        for (let i = 0; i < 5; i++) {
            const shouldRetry = NetworkErrorHandler.shouldRetry(
                { type: 'NETWORK_ERROR', retryable: true },
                { retryCount: i }
            );
            
            const expectedRetry = i < NetworkErrorHandler.config.retry.maxAttempts;
            if (shouldRetry !== expectedRetry) {
                throw new Error(`Lógica de reintento incorrecta en intento ${i}. Esperado: ${expectedRetry}, Recibido: ${shouldRetry}`);
            }
        }
        
        this.recordTestResult('Mecanismo de reintento', true);
        console.log('✅ Prueba 3 completada exitosamente');
    },
    
    // Prueba 4: Circuit Breaker
    testCircuitBreaker: async function() {
        console.log('📋 Prueba 4: Circuit Breaker');
        
        const endpoint = '/api/test-circuit-breaker';
        const circuitBreaker = NetworkErrorHandler.getCircuitBreaker(endpoint);
        
        // Estado inicial debe ser CLOSED
        if (circuitBreaker.state !== 'CLOSED') {
            throw new Error(`Estado inicial incorrecto. Esperado: CLOSED, Recibido: ${circuitBreaker.state}`);
        }
        
        // Simular fallos para abrir el circuito
        for (let i = 0; i < NetworkErrorHandler.config.circuitBreaker.failureThreshold; i++) {
            NetworkErrorHandler.updateCircuitBreaker(
                { type: 'SERVER_ERROR', severity: 'high' },
                { endpoint }
            );
        }
        
        // El circuito debería estar OPEN
        if (circuitBreaker.state !== 'OPEN') {
            throw new Error(`El circuito no se abrió. Estado actual: ${circuitBreaker.state}`);
        }
        
        // Verificar que el circuito está abierto
        if (!NetworkErrorHandler.isCircuitBreakerOpen(endpoint)) {
            throw new Error('isCircuitBreakerOpen() retornó false para un circuito abierto');
        }
        
        // Resetear circuit breaker
        NetworkErrorHandler.resetCircuitBreaker(endpoint);
        
        // Debería estar CLOSED nuevamente
        if (circuitBreaker.state !== 'CLOSED') {
            throw new Error(`El circuito no se reseteó. Estado actual: ${circuitBreaker.state}`);
        }
        
        this.recordTestResult('Circuit Breaker', true);
        console.log('✅ Prueba 4 completada exitosamente');
    },
    
    // Prueba 5: Detección de conexión
    testConnectionDetection: async function() {
        console.log('📋 Prueba 5: Detección de conexión');
        
        // Simular estado online
        NetworkErrorHandler.state.isOnline = true;
        NetworkErrorHandler.state.consecutiveSuccesses = 0;
        NetworkErrorHandler.state.consecutiveFailures = 0;
        
        // Mock de checkConnection para retornar true
        const originalCheckConnection = NetworkErrorHandler.checkConnection;
        NetworkErrorHandler.checkConnection = async () => true;
        
        const isOnline = await NetworkErrorHandler.checkConnection();
        if (!isOnline) {
            throw new Error('checkConnection() debería retornar true');
        }
        
        // Restaurar método original
        NetworkErrorHandler.checkConnection = originalCheckConnection;
        
        // Simular estado offline
        NetworkErrorHandler.state.isOnline = false;
        NetworkErrorHandler.state.consecutiveFailures = NetworkErrorHandler.config.connection.offlineThreshold;
        
        const shouldRetry = NetworkErrorHandler.shouldRetry(
            { type: 'NETWORK_ERROR', retryable: true },
            { retryCount: 0 }
        );
        
        if (shouldRetry) {
            throw new Error('No debería reintentar cuando está offline');
        }
        
        this.recordTestResult('Detección de conexión', true);
        console.log('✅ Prueba 5 completada exitosamente');
    },
    
    // Prueba 6: Sistema de notificaciones
    testNotificationSystem: async function() {
        console.log('📋 Prueba 6: Sistema de notificaciones');
        
        const initialNotificationCount = this.state.testNotifications.length;
        
        // Simular error que debería mostrar notificación
        NetworkErrorHandler.showErrorNotification(
            { type: 'SERVER_ERROR', severity: 'medium', userMessage: 'Error de prueba' },
            { endpoint: '/api/test' }
        );
        
        // Verificar que se agregó una notificación
        if (this.state.testNotifications.length <= initialNotificationCount) {
            throw new Error('No se agregó notificación de error');
        }
        
        const lastNotification = this.state.testNotifications[this.state.testNotifications.length - 1];
        if (lastNotification.message !== 'Error de prueba' || lastNotification.type !== 'error') {
            throw new Error('Notificación incorrecta');
        }
        
        // Probar detección de duplicados
        const beforeDuplicateCount = this.state.testNotifications.length;
        NetworkErrorHandler.showErrorNotification(
            { type: 'SERVER_ERROR', severity: 'medium', userMessage: 'Error de prueba' },
            { endpoint: '/api/test' }
        );
        
        // No debería agregar notificación duplicada
        if (this.state.testNotifications.length > beforeDuplicateCount) {
            throw new Error('Se agregó notificación duplicada');
        }
        
        this.recordTestResult('Sistema de notificaciones', true);
        console.log('✅ Prueba 6 completada exitosamente');
    },
    
    // Prueba 7: Manejo de timeouts
    testTimeoutHandling: async function() {
        console.log('📋 Prueba 7: Manejo de timeouts');
        
        try {
            const response = await fetch('/api/test-timeout', { 
                signal: AbortSignal.timeout(1000) 
            });
        } catch (error) {
            const errorInfo = NetworkErrorHandler.classifyError(error);
            
            if (errorInfo.type !== 'TIMEOUT_ERROR') {
                throw new Error(`Tipo de error incorrecto para timeout. Esperado: TIMEOUT_ERROR, Recibido: ${errorInfo.type}`);
            }
            
            if (!errorInfo.retryable) {
                throw new Error('El error de timeout debería ser reintentable');
            }
        }
        
        this.recordTestResult('Manejo de timeouts', true);
        console.log('✅ Prueba 7 completada exitosamente');
    },
    
    // Prueba 8: Manejo de errores SSL
    testSSLErrorHandling: async function() {
        console.log('📋 Prueba 8: Manejo de errores SSL');
        
        try {
            const response = await fetch('/api/test-ssl-error');
        } catch (error) {
            const errorInfo = NetworkErrorHandler.classifyError(error);
            
            if (errorInfo.type !== 'SSL_ERROR') {
                throw new Error(`Tipo de error incorrecto para SSL. Esperado: SSL_ERROR, Recibido: ${errorInfo.type}`);
            }
            
            if (errorInfo.retryable) {
                throw new Error('El error de SSL no debería ser reintentable');
            }
            
            if (errorInfo.severity !== 'high') {
                throw new Error('El error de SSL debería tener severidad alta');
            }
        }
        
        this.recordTestResult('Manejo de errores SSL', true);
        console.log('✅ Prueba 8 completada exitosamente');
    },
    
    // Prueba 9: Manejo de conexión rechazada
    testConnectionRefusedHandling: async function() {
        console.log('📋 Prueba 9: Manejo de conexión rechazada');
        
        try {
            const response = await fetch('/api/test-connection-refused');
        } catch (error) {
            const errorInfo = NetworkErrorHandler.classifyError(error);
            
            if (errorInfo.type !== 'CONNECTION_REFUSED') {
                throw new Error(`Tipo de error incorrecto para conexión rechazada. Esperado: CONNECTION_REFUSED, Recibido: ${errorInfo.type}`);
            }
            
            if (!errorInfo.retryable) {
                throw new Error('El error de conexión rechazada debería ser reintentable');
            }
            
            if (errorInfo.severity !== 'high') {
                throw new Error('El error de conexión rechazada debería tener severidad alta');
            }
        }
        
        this.recordTestResult('Manejo de conexión rechazada', true);
        console.log('✅ Prueba 9 completada exitosamente');
    },
    
    // Prueba 10: Manejo de errores de servidor
    testServerErrorHandling: async function() {
        console.log('📋 Prueba 10: Manejo de errores de servidor');
        
        try {
            const response = await fetch('/api/test-server-error');
            
            // Si no hay error, verificar el estado
            if (response.status >= 500) {
                const errorInfo = NetworkErrorHandler.classifyError({
                    response: { status: response.status }
                });
                
                if (errorInfo.type !== 'SERVER_ERROR') {
                    throw new Error(`Tipo de error incorrecto para error de servidor. Esperado: SERVER_ERROR, Recibido: ${errorInfo.type}`);
                }
                
                if (!errorInfo.retryable) {
                    throw new Error('El error de servidor debería ser reintentable');
                }
            }
        } catch (error) {
            const errorInfo = NetworkErrorHandler.classifyError(error);
            
            if (errorInfo.type !== 'SERVER_ERROR') {
                throw new Error(`Tipo de error incorrecto para error de servidor. Esperado: SERVER_ERROR, Recibido: ${errorInfo.type}`);
            }
        }
        
        this.recordTestResult('Manejo de errores de servidor', true);
        console.log('✅ Prueba 10 completada exitosamente');
    },
    
    // Prueba 11: Modo offline
    testOfflineMode: async function() {
        console.log('📋 Prueba 11: Modo offline');
        
        // Simular estado offline
        NetworkErrorHandler.state.isOnline = false;
        NetworkErrorHandler.state.connectionStatus = 'offline';
        
        const shouldRetry = NetworkErrorHandler.shouldRetry(
            { type: 'NETWORK_ERROR', retryable: true },
            { retryCount: 0 }
        );
        
        if (shouldRetry) {
            throw new Error('No debería reintentar en modo offline');
        }
        
        // Verificar que todos los circuit breakers se abren
        NetworkErrorHandler.tripAllCircuitBreakers();
        
        const testEndpoint = '/api/test';
        if (!NetworkErrorHandler.isCircuitBreakerOpen(testEndpoint)) {
            throw new Error('El circuit breaker debería estar abierto en modo offline');
        }
        
        this.recordTestResult('Modo offline', true);
        console.log('✅ Prueba 11 completada exitosamente');
    },
    
    // Prueba 12: Mecanismo de recuperación
    testRecoveryMechanism: async function() {
        console.log('📋 Prueba 12: Mecanismo de recuperación');
        
        // Simular estado offline
        NetworkErrorHandler.state.isOnline = false;
        NetworkErrorHandler.state.connectionStatus = 'offline';
        
        // Simular recuperación
        NetworkErrorHandler.state.isOnline = true;
        NetworkErrorHandler.state.consecutiveSuccesses = NetworkErrorHandler.config.connection.onlineThreshold;
        NetworkErrorHandler.handleConnectionRestored();
        
        // Verificar que el estado se actualizó
        if (NetworkErrorHandler.state.connectionStatus !== 'online') {
            throw new Error('El estado de conexión debería ser online');
        }
        
        // Verificar que los circuit breakers se resetearon
        const testEndpoint = '/api/test';
        if (NetworkErrorHandler.isCircuitBreakerOpen(testEndpoint)) {
            throw new Error('El circuit breaker debería estar cerrado después de la recuperación');
        }
        
        this.recordTestResult('Mecanismo de recuperación', true);
        console.log('✅ Prueba 12 completada exitosamente');
    },
    
    // Crear respuesta mock
    createMockResponse: function(status, data) {
        return Promise.resolve({
            status,
            ok: status >= 200 && status < 300,
            json: () => Promise.resolve(data),
            text: () => Promise.resolve(JSON.stringify(data))
        });
    },
    
    // Crear error de timeout
    createTimeoutError: function() {
        return Promise.reject(new Error('Request Timeout'));
    },
    
    // Crear error de red
    createNetworkError: function() {
        return Promise.reject(new Error('Network Error'));
    },
    
    // Crear error de conexión rechazada
    createConnectionRefusedError: function() {
        return Promise.reject(new Error('ERR_CONNECTION_REFUSED'));
    },
    
    // Crear error SSL
    createSSLError: function() {
        return Promise.reject(new Error('ERR_CERT_AUTHORITY_INVALID'));
    },
    
    // Registrar resultado de prueba
    recordTestResult: function(testName, passed, error = null) {
        this.state.testResults.push({
            testName,
            passed,
            error,
            timestamp: Date.now()
        });
    },
    
    // Generar reporte de pruebas
    generateTestReport: function() {
        const endTime = Date.now();
        const duration = endTime - this.state.startTime;
        
        const passedTests = this.state.testResults.filter(r => r.passed).length;
        const totalTests = this.state.testResults.length;
        const successRate = ((passedTests / totalTests) * 100).toFixed(2);
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 REPORTE DE PRUEBAS - NETWORK ERROR HANDLER');
        console.log('='.repeat(60));
        console.log(`⏱️  Duración total: ${duration}ms`);
        console.log(`✅ Pruebas pasadas: ${passedTests}/${totalTests}`);
        console.log(`📈 Tasa de éxito: ${successRate}%`);
        console.log('='.repeat(60));
        
        // Detalles de cada prueba
        this.state.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.testName}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });
        
        // Estadísticas del NetworkErrorHandler
        console.log('\n📈 ESTADÍSTICAS DEL NETWORK ERROR HANDLER:');
        const stats = NetworkErrorHandler.getStats();
        console.log(JSON.stringify(stats, null, 2));
        
        // Notificaciones capturadas
        console.log('\n📢 NOTIFICACIONES CAPTURADAS:');
        this.state.testNotifications.forEach((notification, index) => {
            console.log(`${index + 1}. [${notification.type.toUpperCase()}] ${notification.message}`);
        });
        
        console.log('='.repeat(60));
        
        // Guardar reporte en archivo (si está en entorno Node.js)
        if (typeof module !== 'undefined' && module.exports) {
            const fs = require('fs');
            const reportData = {
                summary: {
                    duration,
                    passedTests,
                    totalTests,
                    successRate
                },
                results: this.state.testResults,
                stats,
                notifications: this.state.testNotifications
            };
            
            fs.writeFileSync(
                'network-error-handler-test-report.json',
                JSON.stringify(reportData, null, 2)
            );
            
            console.log('📄 Reporte guardado en: network-error-handler-test-report.json');
        }
        
        return {
            duration,
            passedTests,
            totalTests,
            successRate,
            results: this.state.testResults,
            stats,
            notifications: this.state.testNotifications
        };
    },
    
    // Restaurar entorno original
    restoreEnvironment: function() {
        if (this.state.originalFetch) {
            window.fetch = this.state.originalFetch;
        }
        
        if (this.state.originalXHR) {
            window.XMLHttpRequest = this.state.originalXHR;
        }
        
        // Limpiar estado
        this.state.testResults = [];
        this.state.testNotifications = [];
    }
};

// Auto-ejecución si se carga directamente
if (typeof window !== 'undefined') {
    // Esperar a que NetworkErrorHandler esté disponible
    const waitForNetworkErrorHandler = () => {
        if (typeof NetworkErrorHandler !== 'undefined') {
            NetworkErrorHandlerTests.init();
        } else {
            setTimeout(waitForNetworkErrorHandler, 100);
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForNetworkErrorHandler);
    } else {
        waitForNetworkErrorHandler();
    }
    
    // Exportar para uso manual
    window.NetworkErrorHandlerTests = NetworkErrorHandlerTests;
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkErrorHandlerTests;
}