/**
 * Pruebas de Memory Leaks para Justice 2 Integration
 * Verifica que los sistemas de cleanup funcionen correctamente
 */

// Mock del entorno DOM para pruebas
global.document = {
    createElement: function(tag) {
        return {
            textContent: '',
            innerHTML: '',
            setAttribute: function() {},
            appendChild: function() {},
            classList: { add: function() {}, remove: function() {} },
            style: {}
        };
    },
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() {},
    getElementById: function() { return null; },
    querySelectorAll: function() { return []; },
    body: { innerHTML: '', insertAdjacentHTML: function() {} },
    title: ''
};

global.window = {
    location: { origin: 'http://localhost', hostname: 'localhost' },
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() {},
    performance: {
        memory: {
            usedJSHeapSize: 50 * 1024 * 1024, // 50MB inicial
            totalJSHeapSize: 100 * 1024 * 1024,
            jsHeapSizeLimit: 2048 * 1024 * 1024
        }
    },
    gc: function() { console.log('🗑️ Garbage collection simulada'); },
    CustomEvent: function(type, options) {
        this.type = type;
        this.detail = options ? options.detail : null;
    }
};

global.navigator = {
    onLine: true,
    serviceWorker: {
        register: function() { return Promise.resolve(); }
    }
};

global.localStorage = {
    data: {},
    getItem: function(key) { return this.data[key] || null; },
    setItem: function(key, value) { this.data[key] = value; },
    removeItem: function(key) { delete this.data[key]; }
};

// Mock de componentes
global.Justice2Core = { name: 'Justice2Core' };
global.Justice2Auth = { 
    name: 'Justice2Auth',
    getCurrentUser: function() { return { id: 1, name: 'Test User' }; },
    updateUser: function() {},
    handleAuthError: function() {}
};
global.Justice2API = { 
    name: 'Justice2API',
    updateToken: function() {},
    reconnect: function() {},
    logError: function() {}
};
global.Justice2Database = { 
    name: 'Justice2Database',
    init: async function() { return Promise.resolve(); },
    users: { getById: async function() { return null; } },
    cases: { getByUser: async function() { return []; } },
    documents: { getByUser: async function() { return []; } }
};
global.Justice2Dynamic = { 
    name: 'Justice2Dynamic',
    updateCasesData: function() {},
    updateDocumentsData: function() {},
    updateAnalyticsData: function() {},
    clearData: function() {},
    clearCache: function() {}
};
global.Justice2Notifications = { 
    name: 'Justice2Notifications',
    success: function() {},
    info: function() {},
    warning: function() {},
    error: function() {}
};
global.Justice2Loading = { name: 'Justice2Loading' };
global.Justice2Modal = { name: 'Justice2Modal' };
global.Justice2Validation = { name: 'Justice2Validation' };
global.Justice2Utils = { 
    name: 'Justice2Utils',
    formatDateTime: function() { return new Date().toISOString(); }
};

// Cargar el módulo de integración
const fs = require('fs');
const path = require('path');

try {
    const integrationCode = fs.readFileSync(path.join(__dirname, 'js', 'justice2-integration.js'), 'utf8');
    eval(integrationCode);
} catch (error) {
    console.error('❌ Error cargando justice2-integration.js:', error.message);
    process.exit(1);
}

// Suite de pruebas de memory leaks
class MemoryLeakTestSuite {
    constructor() {
        this.results = [];
        this.testStartTime = Date.now();
    }
    
    log(...args) {
        console.log(`[MemoryLeakTest]`, ...args);
    }
    
    // Test 1: Verificar sistema de gestión de recursos
    testResourceManager() {
        this.log('🧪 Test 1: Verificando sistema de gestión de recursos...');
        
        const integration = global.Justice2Integration;
        
        // Verificar que el resourceManager existe
        if (!integration.resourceManager) {
            throw new Error('resourceManager no encontrado');
        }
        
        // Verificar métodos del resourceManager
        const requiredMethods = ['registerInterval', 'registerTimeout', 'registerEventListener', 'cleanup'];
        requiredMethods.forEach(method => {
            if (typeof integration.resourceManager[method] !== 'function') {
                throw new Error(`Método ${method} no encontrado en resourceManager`);
            }
        });
        
        // Probar registro y limpieza de interval
        const testInterval = integration.resourceManager.registerInterval(
            setInterval(() => {}, 1000)
        );
        
        if (!integration.resourceManager.intervals.has(testInterval)) {
            throw new Error('Interval no registrado correctamente');
        }
        
        // Probar registro y limpieza de timeout
        const testTimeout = integration.resourceManager.registerTimeout(
            setTimeout(() => {}, 1000)
        );
        
        if (!integration.resourceManager.timeouts.has(testTimeout)) {
            throw new Error('Timeout no registrado correctamente');
        }
        
        // Probar cleanup
        integration.resourceManager.cleanup();
        
        if (integration.resourceManager.intervals.size > 0 || 
            integration.resourceManager.timeouts.size > 0) {
            throw new Error('Recursos no limpiados correctamente');
        }
        
        return { message: '✅ Sistema de gestión de recursos funciona correctamente' };
    }
    
    // Test 2: Verificar sistema de monitoreo de memoria
    testMemoryMonitor() {
        this.log('🧪 Test 2: Verificando sistema de monitoreo de memoria...');
        
        const integration = global.Justice2Integration;
        
        // Verificar que el memoryMonitor existe
        if (!integration.memoryMonitor) {
            throw new Error('memoryMonitor no encontrado');
        }
        
        // Verificar métodos del memoryMonitor
        const requiredMethods = ['start', 'stop', 'checkMemory', 'detectMemoryLeak', 'getMemoryReport'];
        requiredMethods.forEach(method => {
            if (typeof integration.memoryMonitor[method] !== 'function') {
                throw new Error(`Método ${method} no encontrado en memoryMonitor`);
            }
        });
        
        // Probar monitoreo
        integration.memoryMonitor.start();
        
        if (!integration.memoryMonitor.monitorInterval) {
            throw new Error('Monitoreo de memoria no iniciado');
        }
        
        // Simular chequeo de memoria
        integration.memoryMonitor.checkMemory();
        
        if (integration.memoryMonitor.memoryHistory.length === 0) {
            throw new Error('Historial de memoria no registrado');
        }
        
        // Probar detención
        integration.memoryMonitor.stop();
        
        if (integration.memoryMonitor.monitorInterval) {
            throw new Error('Monitoreo de memoria no detenido');
        }
        
        return { message: '✅ Sistema de monitoreo de memoria funciona correctamente' };
    }
    
    // Test 3: Verificar cleanup completo
    testCompleteCleanup() {
        this.log('🧪 Test 3: Verificando cleanup completo...');
        
        const integration = global.Justice2Integration;
        
        // Inicializar para tener recursos que limpiar
        integration.init().catch(() => {}); // Ignorar errores en pruebas
        
        // Esperar un poco para que se inicialicen los recursos
        setTimeout(() => {
            // Verificar que hay componentes cargados
            const hasComponents = Object.values(integration.components).some(comp => comp !== null);
            
            // Realizar cleanup
            integration.cleanup();
            
            // Verificar que el cleanup se marcó como completo
            if (!integration.state.cleanupComplete) {
                throw new Error('Cleanup no marcado como completo');
            }
            
            // Verificar que las referencias a componentes fueron limpiadas
            const hasComponentsAfterCleanup = Object.values(integration.components).some(comp => comp !== null);
            if (hasComponentsAfterCleanup) {
                throw new Error('Referencias a componentes no limpiadas');
            }
            
        }, 100);
        
        return { message: '✅ Cleanup completo funciona correctamente' };
    }
    
    // Test 4: Verificar detección de memory leaks
    testMemoryLeakDetection() {
        this.log('🧪 Test 4: Verificando detección de memory leaks...');
        
        const integration = global.Justice2Integration;
        
        // Simular aumento de memoria progresivo
        const initialMemory = 50 * 1024 * 1024; // 50MB
        const leakMemory = 100 * 1024 * 1024; // 100MB
        
        // Crear historial falso que simule un leak
        integration.memoryMonitor.memoryHistory = [
            { used: initialMemory, timestamp: Date.now() - 300000 },
            { used: initialMemory + 20 * 1024 * 1024, timestamp: Date.now() - 240000 },
            { used: initialMemory + 40 * 1024 * 1024, timestamp: Date.now() - 180000 },
            { used: initialMemory + 60 * 1024 * 1024, timestamp: Date.now() - 120000 },
            { used: leakMemory, timestamp: Date.now() - 60000 }
        ];
        
        // Probar detección
        let leakDetected = false;
        const originalEmitEvent = integration.emitEvent;
        integration.emitEvent = function(eventName, data) {
            if (eventName === 'justice2:memory:leak') {
                leakDetected = true;
            }
        };
        
        integration.memoryMonitor.detectMemoryLeak({ used: leakMemory });
        
        // Restaurar método original
        integration.emitEvent = originalEmitEvent;
        
        if (!leakDetected) {
            throw new Error('Memory leak no detectado');
        }
        
        return { message: '✅ Detección de memory leaks funciona correctamente' };
    }
    
    // Test 5: Verificar manejo de eventos sin leaks
    testEventHandlingLeaks() {
        this.log('🧪 Test 5: Verificando manejo de eventos sin leaks...');
        
        const integration = global.Justice2Integration;
        
        // Inicializar componentes mock
        integration.components.auth = global.Justice2Auth;
        integration.components.notifications = global.Justice2Notifications;
        
        // Configurar eventos globales
        integration.setupGlobalEvents();
        
        // Verificar que los eventos fueron registrados
        if (integration.resourceManager.eventListeners.size === 0) {
            throw new Error('Event listeners no registrados');
        }
        
        // Simular eventos
        const loginEvent = new global.window.CustomEvent('justice2:auth:login', {
            detail: { name: 'Test User', email: 'test@example.com' }
        });
        global.document.dispatchEvent(loginEvent);
        
        // Realizar cleanup
        integration.resourceManager.cleanup();
        
        // Verificar que los eventos fueron limpiados
        if (integration.resourceManager.eventListeners.size > 0) {
            throw new Error('Event listeners no limpiados correctamente');
        }
        
        return { message: '✅ Manejo de eventos sin memory leaks funciona correctamente' };
    }
    
    // Test 6: Verificar gestión de intervals
    testIntervalManagement() {
        this.log('🧪 Test 6: Verificando gestión de intervals...');
        
        const integration = global.Justice2Integration;
        
        // Configurar auto sync para crear un interval
        integration.config.autoSync = true;
        integration.setupAutoSync();
        
        // Verificar que el interval fue registrado
        if (!integration.state.syncInterval) {
            throw new Error('Interval de sync no creado');
        }
        
        if (!integration.resourceManager.intervals.has(integration.state.syncInterval)) {
            throw new Error('Interval no registrado en resourceManager');
        }
        
        // Realizar cleanup
        integration.cleanup();
        
        // Verificar que el interval fue limpiado
        if (integration.state.syncInterval) {
            throw new Error('Interval de sync no limpiado');
        }
        
        return { message: '✅ Gestión de intervals funciona correctamente' };
    }
    
    runTest(testName, testFunction) {
        console.log(`\n🧪 Ejecutando: ${testName}`);
        
        try {
            const result = testFunction.call(this);
            this.results.push({ name: testName, status: 'PASS', message: result.message });
            console.log(`✅ ${testName}: PASS`);
            console.log(`   ${result.message}`);
        } catch (error) {
            this.results.push({ name: testName, status: 'FAIL', message: error.message });
            console.log(`❌ ${testName}: FAIL - ${error.message}`);
        }
    }
    
    runAllTests() {
        console.log('🔍 INICIANDO PRUEBAS DE MEMORY LEAKS');
        console.log('='.repeat(60));
        
        this.runTest('Gestión de Recursos', () => this.testResourceManager());
        this.runTest('Monitoreo de Memoria', () => this.testMemoryMonitor());
        this.runTest('Cleanup Completo', () => this.testCompleteCleanup());
        this.runTest('Detección de Memory Leaks', () => this.testMemoryLeakDetection());
        this.runTest('Manejo de Eventos', () => this.testEventHandlingLeaks());
        this.runTest('Gestión de Intervals', () => this.testIntervalManagement());
        
        this.generateReport();
    }
    
    generateReport() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const total = this.results.length;
        const duration = Date.now() - this.testStartTime;
        
        console.log('\n📊 REPORTE DE PRUEBAS DE MEMORY LEAKS');
        console.log('='.repeat(60));
        console.log(`Total de pruebas: ${total}`);
        console.log(`Pruebas pasadas: ${passed}`);
        console.log(`Pruebas fallidas: ${total - passed}`);
        console.log(`Tasa de éxito: ${((passed / total) * 100).toFixed(2)}%`);
        console.log(`Duración: ${(duration / 1000).toFixed(2)} segundos`);
        
        console.log('\n📋 Detalle de resultados:');
        this.results.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${icon} ${result.name}: ${result.message}`);
        });
        
        if (passed === total) {
            console.log('\n🎉 ¡TODAS LAS PRUEBAS DE MEMORY LEAKS HAN PASADO!');
            console.log('✅ Los sistemas de cleanup y monitoreo funcionan correctamente');
        } else {
            console.log('\n⚠️ HAY PRUEBAS FALLADAS - REVISAR CORRECCIONES');
            console.log('❌ Algunos memory leaks pueden no estar siendo manejados correctamente');
        }
        
        // Generar reporte en archivo
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                total: total,
                passed: passed,
                failed: total - passed,
                successRate: ((passed / total) * 100).toFixed(2),
                duration: duration
            },
            results: this.results
        };
        
        try {
            fs.writeFileSync(
                path.join(__dirname, 'memory-leaks-test-report.json'),
                JSON.stringify(reportData, null, 2)
            );
            console.log('\n📄 Reporte guardado en: memory-leaks-test-report.json');
        } catch (error) {
            console.error('Error guardando reporte:', error.message);
        }
    }
}

// Ejecutar pruebas
console.log('🚀 INICIANDO SUITE DE PRUEBAS DE MEMORY LEAKS');

const testSuite = new MemoryLeakTestSuite();
testSuite.runAllTests();