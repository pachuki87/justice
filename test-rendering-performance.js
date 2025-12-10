/**
 * Test de Rendimiento de Renderizado para Justice 2
 * 
 * Este suite de pruebas evalúa el rendimiento del sistema de renderizado optimizado
 * midiendo FPS, tiempo de renderizado, uso de memoria y otras métricas clave.
 */

// Importar sistemas de renderizado optimizado
import RenderOptimizer from './components/render-optimizer.js';
import VirtualDOM from './components/virtual-dom.js';
import ComponentMemoizer from './components/component-memoizer.js';
import BatchRenderer from './components/batch-renderer.js';
import LazyRenderer from './components/lazy-renderer.js';
import SmartComponent from './components/smart-component.js';
import OptimizedRenderer from './components/optimized-renderer.js';
import RenderScheduler from './components/render-scheduler.js';
import PerformanceProfiler from './components/performance-profiler.js';

class RenderingPerformanceTest {
    constructor(options = {}) {
        this.options = {
            testDuration: options.testDuration || 10000, // 10 segundos
            componentCount: options.componentCount || 100,
            updateFrequency: options.updateFrequency || 60, // 60 Hz
            enableMemoryProfiling: options.enableMemoryProfiling !== false,
            enableStressTest: options.enableStressTest !== false,
            outputFormat: options.outputFormat || 'console', // 'console', 'json', 'html'
            ...options
        };

        // Estado de las pruebas
        this.isRunning = false;
        this.testResults = {};
        this.currentTest = null;
        this.testStartTime = 0;
        this.testEndTime = 0;

        // Sistemas bajo prueba
        this.systems = {
            renderOptimizer: null,
            virtualDOM: null,
            componentMemoizer: null,
            batchRenderer: null,
            lazyRenderer: null,
            smartComponent: null,
            optimizedRenderer: null,
            renderScheduler: null,
            performanceProfiler: null
        };

        // Componentes de prueba
        this.testComponents = [];
        this.testContainer = null;

        // Métricas
        this.metrics = {
            fps: [],
            frameTime: [],
            renderTime: [],
            memoryUsage: [],
            componentCount: 0,
            renderCount: 0,
            cacheHitRate: 0,
            droppedFrames: 0
        };

        this.initialize();
    }

    /**
     * Inicializa el sistema de pruebas
     */
    initialize() {
        console.log('Inicializando sistema de pruebas de rendimiento de renderizado...');
        
        this.setupTestEnvironment();
        this.initializeRenderSystems();
        this.createTestComponents();
        
        console.log('Sistema de pruebas inicializado');
    }

    /**
     * Configura el entorno de pruebas
     */
    setupTestEnvironment() {
        // Crear contenedor de pruebas
        this.testContainer = document.createElement('div');
        this.testContainer.id = 'render-performance-test-container';
        this.testContainer.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            width: 400px;
            height: 300px;
            background: white;
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 10px;
            z-index: 10000;
            font-family: monospace;
            font-size: 12px;
            overflow: hidden;
        `;

        document.body.appendChild(this.testContainer);
    }

    /**
     * Inicializa los sistemas de renderizado
     */
    initializeRenderSystems() {
        try {
            // Inicializar PerformanceProfiler primero
            this.systems.performanceProfiler = new PerformanceProfiler({
                enableDetailedTracing: true,
                enableMemoryProfiling: this.options.enableMemoryProfiling,
                enableFrameAnalysis: true,
                enableComponentAnalysis: true,
                reportInterval: 1000
            });

            // Inicializar otros sistemas
            this.systems.renderScheduler = new RenderScheduler({
                targetFPS: 60,
                frameBudget: 16.67,
                maxConcurrentRenders: 3,
                enablePreloading: true,
                enablePredictiveScheduling: true
            });

            this.systems.componentMemoizer = new ComponentMemoizer({
                maxCacheSize: 1000,
                defaultTTL: 30000,
                enableAdaptiveTTL: true,
                enablePatternAnalysis: true
            });

            this.systems.virtualDOM = new VirtualDOM({
                enableDiffingOptimization: true,
                enableBatchPatches: true,
                maxNodesPerBatch: 50
            });

            this.systems.batchRenderer = new BatchRenderer({
                maxBatchSize: 20,
                batchTimeout: 16,
                enablePriorityQueue: true
            });

            this.systems.lazyRenderer = new LazyRenderer({
                rootMargin: '50px',
                threshold: 0.1,
                enablePlaceholders: true,
                enableSkeletons: true
            });

            this.systems.smartComponent = new SmartComponent({
                enableAutoOptimization: true,
                enableErrorBoundaries: true,
                enableLifecycleHooks: true
            });

            this.systems.optimizedRenderer = new OptimizedRenderer({
                enableVirtualDOM: true,
                enableMemoization: true,
                enableBatching: true,
                enableLazyLoading: true,
                enableSmartComponents: true
            });

            // Conectar sistemas
            this.systems.optimizedRenderer.connectSystems({
                virtualDOM: this.systems.virtualDOM,
                componentMemoizer: this.systems.componentMemoizer,
                batchRenderer: this.systems.batchRenderer,
                lazyRenderer: this.systems.lazyRenderer,
                smartComponent: this.systems.smartComponent,
                renderScheduler: this.systems.renderScheduler,
                performanceProfiler: this.systems.performanceProfiler
            });

            this.systems.renderOptimizer = new RenderOptimizer({
                enableAutoOptimization: true,
                enablePerformanceMonitoring: true,
                enableAdaptiveRendering: true,
                optimizationThreshold: 16.67
            });

            this.systems.renderOptimizer.connectRenderer(this.systems.optimizedRenderer);

            console.log('Sistemas de renderizado inicializados correctamente');

        } catch (error) {
            console.error('Error inicializando sistemas de renderizado:', error);
        }
    }

    /**
     * Crea componentes de prueba
     */
    createTestComponents() {
        this.testComponents = [];
        
        for (let i = 0; i < this.options.componentCount; i++) {
            const component = {
                id: `test-component-${i}`,
                type: 'test-component',
                props: {
                    index: i,
                    title: `Componente ${i}`,
                    content: `Este es el contenido del componente ${i}`,
                    style: {
                        backgroundColor: `hsl(${(i * 360) / this.options.componentCount}, 70%, 80%)`,
                        padding: '10px',
                        margin: '5px',
                        borderRadius: '4px',
                        border: '1px solid #ccc'
                    }
                },
                render: function(props) {
                    return {
                        tag: 'div',
                        attributes: {
                            style: Object.entries(props.style).map(([k, v]) => `${k}: ${v}`).join('; ')
                        },
                        children: [
                            {
                                tag: 'h4',
                                children: [props.title]
                            },
                            {
                                tag: 'p',
                                children: [props.content]
                            },
                            {
                                tag: 'div',
                                attributes: {
                                    style: 'font-size: 10px; color: #666;'
                                },
                                children: [`Index: ${props.index}`]
                            }
                        ]
                    };
                }
            };
            
            this.testComponents.push(component);
        }
        
        console.log(`Creados ${this.testComponents.length} componentes de prueba`);
    }

    /**
     * Ejecuta todas las pruebas
     */
    async runAllTests() {
        console.log('Iniciando suite completo de pruebas de rendimiento de renderizado...');
        
        const testSuite = [
            () => this.testBasicRendering(),
            () => this.testVirtualDOMPerformance(),
            () => this.testMemoizationEfficiency(),
            () => this.testBatchRendering(),
            () => this.testLazyLoading(),
            () => this.testSmartComponents(),
            () => this.testRenderScheduler(),
            () => this.testMemoryUsage(),
            () => this.testStressScenario(),
            () => this.testFPSStability(),
            () => this.testComponentUpdatePerformance()
        ];

        const results = {};

        for (const test of testSuite) {
            try {
                const testName = test.name.replace('bound ', '');
                console.log(`\n=== Ejecutando prueba: ${testName} ===`);
                
                const result = await test();
                results[testName] = result;
                
                console.log(`✅ Prueba ${testName} completada`);
                
                // Pequeña pausa entre pruebas
                await this.sleep(500);
                
            } catch (error) {
                console.error(`❌ Error en prueba ${test.name}:`, error);
                results[test.name] = {
                    success: false,
                    error: error.message
                };
            }
        }

        this.testResults = results;
        this.generateReport();
        
        return results;
    }

    /**
     * Prueba de renderizado básico
     */
    async testBasicRendering() {
        this.resetMetrics();
        this.currentTest = 'basic-rendering';
        
        const startTime = performance.now();
        this.startMonitoring();
        
        // Renderizar componentes básicos
        for (const component of this.testComponents.slice(0, 10)) {
            await this.systems.optimizedRenderer.render(component, this.testContainer);
        }
        
        await this.sleep(this.options.testDuration);
        
        this.stopMonitoring();
        const endTime = performance.now();
        
        return {
            success: true,
            duration: endTime - startTime,
            metrics: this.getAggregatedMetrics(),
            averageFPS: this.calculateAverageFPS(),
            averageRenderTime: this.calculateAverageRenderTime()
        };
    }

    /**
     * Prueba de rendimiento de Virtual DOM
     */
    async testVirtualDOMPerformance() {
        this.resetMetrics();
        this.currentTest = 'virtual-dom-performance';
        
        const startTime = performance.now();
        this.startMonitoring();
        
        // Crear árbol virtual grande
        const largeComponent = {
            id: 'large-virtual-component',
            type: 'large-component',
            props: {
                children: this.testComponents.slice(0, 50)
            },
            render: function(props) {
                return {
                    tag: 'div',
                    children: props.children.map(child => ({
                        tag: 'div',
                        attributes: { style: 'margin: 2px; padding: 5px; border: 1px solid #ddd;' },
                        children: [child.render ? child.render(child.props) : 'Empty']
                    }))
                };
            }
        };
        
        // Medir diffing
        const initialRender = await this.systems.optimizedRenderer.render(largeComponent, this.testContainer);
        
        // Actualizar varias veces para medir diffing
        for (let i = 0; i < 10; i++) {
            largeComponent.props.children = this.testComponents.slice(i, i + 50);
            await this.systems.optimizedRenderer.render(largeComponent, this.testContainer);
            await this.sleep(100);
        }
        
        await this.sleep(this.options.testDuration / 2);
        
        this.stopMonitoring();
        const endTime = performance.now();
        
        return {
            success: true,
            duration: endTime - startTime,
            metrics: this.getAggregatedMetrics(),
            diffingPerformance: this.systems.virtualDOM ? this.systems.virtualDOM.getMetrics() : null
        };
    }

    /**
     * Prueba de eficiencia de memoización
     */
    async testMemoizationEfficiency() {
        this.resetMetrics();
        this.currentTest = 'memoization-efficiency';
        
        const startTime = performance.now();
        this.startMonitoring();
        
        // Renderizar mismo componente múltiples veces
        const testComponent = this.testComponents[0];
        
        // Primera renderización (cache miss)
        await this.systems.optimizedRenderer.render(testComponent, this.testContainer);
        
        // Renderizaciones subsecuentes (deberían ser cache hits)
        for (let i = 0; i < 100; i++) {
            await this.systems.optimizedRenderer.render(testComponent, this.testContainer);
        }
        
        await this.sleep(this.options.testDuration / 2);
        
        this.stopMonitoring();
        const endTime = performance.now();
        
        const memoizerMetrics = this.systems.componentMemoizer ? this.systems.componentMemoizer.getMetrics() : null;
        
        return {
            success: true,
            duration: endTime - startTime,
            metrics: this.getAggregatedMetrics(),
            cacheHitRate: memoizerMetrics ? memoizerMetrics.hitRate : 0,
            memoizerMetrics
        };
    }

    /**
     * Prueba de renderizado por lotes
     */
    async testBatchRendering() {
        this.resetMetrics();
        this.currentTest = 'batch-rendering';
        
        const startTime = performance.now();
        this.startMonitoring();
        
        // Renderizar muchos componentes en batch
        const batchPromises = this.testComponents.slice(0, 50).map(component => 
            this.systems.batchRenderer.scheduleRender(component, this.testContainer)
        );
        
        await Promise.all(batchPromises);
        
        await this.sleep(this.options.testDuration);
        
        this.stopMonitoring();
        const endTime = performance.now();
        
        const batchMetrics = this.systems.batchRenderer ? this.systems.batchRenderer.getMetrics() : null;
        
        return {
            success: true,
            duration: endTime - startTime,
            metrics: this.getAggregatedMetrics(),
            batchMetrics
        };
    }

    /**
     * Prueba de lazy loading
     */
    async testLazyLoading() {
        this.resetMetrics();
        this.currentTest = 'lazy-loading';
        
        const startTime = performance.now();
        this.startMonitoring();
        
        // Crear componentes fuera de viewport
        const lazyComponents = this.testComponents.slice(0, 20).map((component, index) => ({
            ...component,
            props: {
                ...component.props,
                lazy: true,
                style: {
                    ...component.props.style,
                    marginTop: `${index * 100}px` // Fuera de viewport inicialmente
                }
            }
        }));
        
        // Registrar componentes para lazy loading
        lazyComponents.forEach(component => {
            this.systems.lazyRenderer.register(component, this.testContainer);
        });
        
        // Simular scroll para activar lazy loading
        for (let i = 0; i < 10; i++) {
            window.scrollTo(0, i * 200);
            await this.sleep(200);
        }
        
        await this.sleep(this.options.testDuration);
        
        this.stopMonitoring();
        const endTime = performance.now();
        
        const lazyMetrics = this.systems.lazyRenderer ? this.systems.lazyRenderer.getMetrics() : null;
        
        return {
            success: true,
            duration: endTime - startTime,
            metrics: this.getAggregatedMetrics(),
            lazyMetrics
        };
    }

    /**
     * Prueba de componentes inteligentes
     */
    async testSmartComponents() {
        this.resetMetrics();
        this.currentTest = 'smart-components';
        
        const startTime = performance.now();
        this.startMonitoring();
        
        // Crear componente inteligente
        const smartComponent = this.systems.smartComponent.create({
            id: 'smart-test-component',
            type: 'smart-component',
            props: {
                title: 'Smart Component Test',
                data: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `Item ${i}` }))
            },
            shouldUpdate: (newProps, oldProps) => {
                // Lógica de actualización inteligente
                return newProps.data.length !== oldProps.data.length;
            },
            render: function(props) {
                return {
                    tag: 'div',
                    attributes: { style: 'padding: 10px; border: 1px solid #007bff;' },
                    children: [
                        {
                            tag: 'h3',
                            children: [props.title]
                        },
                        {
                            tag: 'ul',
                            children: props.data.slice(0, 10).map(item => ({
                                tag: 'li',
                                children: [item.value]
                            }))
                        }
                    ]
                };
            }
        });
        
        // Actualizar componente varias veces
        for (let i = 0; i < 20; i++) {
            smartComponent.props.data = Array.from({ length: 100 + i }, (_, j) => ({ id: j, value: `Item ${j}` }));
            await this.systems.optimizedRenderer.render(smartComponent, this.testContainer);
            await this.sleep(100);
        }
        
        await this.sleep(this.options.testDuration / 2);
        
        this.stopMonitoring();
        const endTime = performance.now();
        
        return {
            success: true,
            duration: endTime - startTime,
            metrics: this.getAggregatedMetrics(),
            smartComponentMetrics: smartComponent.getMetrics ? smartComponent.getMetrics() : null
        };
    }

    /**
     * Prueba del scheduler de renderizado
     */
    async testRenderScheduler() {
        this.resetMetrics();
        this.currentTest = 'render-scheduler';
        
        const startTime = performance.now();
        this.startMonitoring();
        
        // Programar renderizados con diferentes prioridades
        const renderPromises = [
            // Renderizados críticos
            ...this.testComponents.slice(0, 5).map(component => 
                this.systems.renderScheduler.scheduleCriticalRender(component, component.props)
            ),
            // Renderizados de alta prioridad
            ...this.testComponents.slice(5, 15).map(component => 
                this.systems.renderScheduler.scheduleHighPriorityRender(component, component.props)
            ),
            // Renderizados normales
            ...this.testComponents.slice(15, 30).map(component => 
                this.systems.renderScheduler.scheduleRender(component, component.props, { priority: 'normal' })
            ),
            // Renderizados en tiempo de inactividad
            ...this.testComponents.slice(30, 40).map(component => 
                this.systems.renderScheduler.scheduleIdleRender(component, component.props)
            )
        ];
        
        await Promise.all(renderPromises);
        
        await this.sleep(this.options.testDuration);
        
        this.stopMonitoring();
        const endTime = performance.now();
        
        const schedulerMetrics = this.systems.renderScheduler ? this.systems.renderScheduler.getMetrics() : null;
        
        return {
            success: true,
            duration: endTime - startTime,
            metrics: this.getAggregatedMetrics(),
            schedulerMetrics
        };
    }

    /**
     * Prueba de uso de memoria
     */
    async testMemoryUsage() {
        this.resetMetrics();
        this.currentTest = 'memory-usage';
        
        const startTime = performance.now();
        this.startMonitoring();
        
        // Renderizar muchos componentes y medir memoria
        const memorySnapshots = [];
        
        for (let i = 0; i < 10; i++) {
            // Renderizar lote de componentes
            const batch = this.testComponents.slice(i * 10, (i + 1) * 10);
            for (const component of batch) {
                await this.systems.optimizedRenderer.render(component, this.testContainer);
            }
            
            // Capturar snapshot de memoria
            if (performance.memory) {
                memorySnapshots.push({
                    iteration: i,
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                });
            }
            
            await this.sleep(500);
        }
        
        await this.sleep(this.options.testDuration / 2);
        
        this.stopMonitoring();
        const endTime = performance.now();
        
        return {
            success: true,
            duration: endTime - startTime,
            metrics: this.getAggregatedMetrics(),
            memorySnapshots,
            memoryGrowth: memorySnapshots.length > 1 ? 
                memorySnapshots[memorySnapshots.length - 1].used - memorySnapshots[0].used : 0
        };
    }

    /**
     * Prueba de estrés
     */
    async testStressScenario() {
        if (!this.options.enableStressTest) {
            return { success: true, skipped: true, reason: 'Stress test disabled' };
        }
        
        this.resetMetrics();
        this.currentTest = 'stress-test';
        
        const startTime = performance.now();
        this.startMonitoring();
        
        // Escenario de estrés: muchos renderizados simultáneos
        const stressPromises = [];
        
        for (let i = 0; i < 100; i++) {
            const component = {
                ...this.testComponents[i % this.testComponents.length],
                id: `stress-component-${i}`,
                props: {
                    ...this.testComponents[i % this.testComponents.length].props,
                    stressIndex: i
                }
            };
            
            stressPromises.push(
                this.systems.optimizedRenderer.render(component, this.testContainer)
            );
        }
        
        await Promise.all(stressPromises);
        
        await this.sleep(this.options.testDuration);
        
        this.stopMonitoring();
        const endTime = performance.now();
        
        return {
            success: true,
            duration: endTime - startTime,
            metrics: this.getAggregatedMetrics(),
            stressComponents: 100
        };
    }

    /**
     * Prueba de estabilidad de FPS
     */
    async testFPSStability() {
        this.resetMetrics();
        this.currentTest = 'fps-stability';
        
        const startTime = performance.now();
        this.startMonitoring();
        
        // Renderizar continuamente para medir estabilidad de FPS
        const renderInterval = setInterval(async () => {
            const component = this.testComponents[Math.floor(Math.random() * this.testComponents.length)];
            await this.systems.optimizedRenderer.render(component, this.testContainer);
        }, 1000 / this.options.updateFrequency);
        
        await this.sleep(this.options.testDuration);
        
        clearInterval(renderInterval);
        this.stopMonitoring();
        const endTime = performance.now();
        
        return {
            success: true,
            duration: endTime - startTime,
            metrics: this.getAggregatedMetrics(),
            fpsVariance: this.calculateFPSVariance(),
            frameDrops: this.metrics.droppedFrames
        };
    }

    /**
     * Prueba de rendimiento de actualización de componentes
     */
    async testComponentUpdatePerformance() {
        this.resetMetrics();
        this.currentTest = 'component-update-performance';
        
        const startTime = performance.now();
        this.startMonitoring();
        
        // Crear componente que se actualizará frecuentemente
        const updateComponent = {
            id: 'update-test-component',
            type: 'update-component',
            props: {
                counter: 0,
                timestamp: Date.now()
            },
            render: function(props) {
                return {
                    tag: 'div',
                    attributes: { style: 'padding: 10px; margin: 5px; border: 1px solid #ddd;' },
                    children: [
                        {
                            tag: 'h4',
                            children: [`Counter: ${props.counter}`]
                        },
                        {
                            tag: 'div',
                            children: [`Timestamp: ${new Date(props.timestamp).toLocaleTimeString()}`]
                        }
                    ]
                };
            }
        };
        
        // Actualizar componente frecuentemente
        for (let i = 0; i < 50; i++) {
            updateComponent.props.counter = i;
            updateComponent.props.timestamp = Date.now();
            await this.systems.optimizedRenderer.render(updateComponent, this.testContainer);
            await this.sleep(100);
        }
        
        await this.sleep(this.options.testDuration / 2);
        
        this.stopMonitoring();
        const endTime = performance.now();
        
        return {
            success: true,
            duration: endTime - startTime,
            metrics: this.getAggregatedMetrics(),
            updateCount: 50
        };
    }

    /**
     * Inicia el monitoreo de métricas
     */
    startMonitoring() {
        this.metrics = {
            fps: [],
            frameTime: [],
            renderTime: [],
            memoryUsage: [],
            componentCount: 0,
            renderCount: 0,
            cacheHitRate: 0,
            droppedFrames: 0
        };

        if (this.systems.performanceProfiler) {
            this.systems.performanceProfiler.start();
        }

        // Iniciar recolección de métricas
        this.metricsInterval = setInterval(() => {
            this.collectMetrics();
        }, 100);
    }

    /**
     * Detiene el monitoreo de métricas
     */
    stopMonitoring() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }

        if (this.systems.performanceProfiler) {
            this.systems.performanceProfiler.stop();
        }
    }

    /**
     * Recolecta métricas actuales
     */
    collectMetrics() {
        if (this.systems.performanceProfiler) {
            const profilerMetrics = this.systems.performanceProfiler.getMetrics();
            
            if (profilerMetrics.averageFPS) {
                this.metrics.fps.push(profilerMetrics.averageFPS);
            }
            
            if (profilerMetrics.averageFrameTime) {
                this.metrics.frameTime.push(profilerMetrics.averageFrameTime);
            }
            
            if (profilerMetrics.memoryUsage && profilerMetrics.memoryUsage.current) {
                this.metrics.memoryUsage.push(profilerMetrics.memoryUsage.current);
            }
        }

        if (this.systems.optimizedRenderer) {
            const rendererMetrics = this.systems.optimizedRenderer.getMetrics();
            
            if (rendererMetrics.renderCount) {
                this.metrics.renderCount = rendererMetrics.renderCount;
            }
            
            if (rendererMetrics.componentCount) {
                this.metrics.componentCount = rendererMetrics.componentCount;
            }
            
            if (rendererMetrics.cacheHitRate) {
                this.metrics.cacheHitRate = rendererMetrics.cacheHitRate;
            }
        }

        if (this.systems.renderScheduler) {
            const schedulerMetrics = this.systems.renderScheduler.getMetrics();
            
            if (schedulerMetrics.droppedFrames) {
                this.metrics.droppedFrames = schedulerMetrics.droppedFrames;
            }
        }
    }

    /**
     * Resetea las métricas
     */
    resetMetrics() {
        this.metrics = {
            fps: [],
            frameTime: [],
            renderTime: [],
            memoryUsage: [],
            componentCount: 0,
            renderCount: 0,
            cacheHitRate: 0,
            droppedFrames: 0
        };

        // Limpiar contenedor
        if (this.testContainer) {
            this.testContainer.innerHTML = '';
        }
    }

    /**
     * Obtiene métricas agregadas
     */
    getAggregatedMetrics() {
        return {
            fps: {
                average: this.calculateAverage(this.metrics.fps),
                min: Math.min(...this.metrics.fps),
                max: Math.max(...this.metrics.fps),
                variance: this.calculateVariance(this.metrics.fps)
            },
            frameTime: {
                average: this.calculateAverage(this.metrics.frameTime),
                min: Math.min(...this.metrics.frameTime),
                max: Math.max(...this.metrics.frameTime),
                variance: this.calculateVariance(this.metrics.frameTime)
            },
            memoryUsage: {
                average: this.calculateAverage(this.metrics.memoryUsage),
                min: Math.min(...this.metrics.memoryUsage),
                max: Math.max(...this.metrics.memoryUsage),
                peak: Math.max(...this.metrics.memoryUsage)
            },
            renderCount: this.metrics.renderCount,
            componentCount: this.metrics.componentCount,
            cacheHitRate: this.metrics.cacheHitRate,
            droppedFrames: this.metrics.droppedFrames
        };
    }

    /**
     * Calcula el promedio de un array
     */
    calculateAverage(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    }

    /**
     * Calcula la varianza de un array
     */
    calculateVariance(arr) {
        if (arr.length === 0) return 0;
        const avg = this.calculateAverage(arr);
        return arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
    }

    /**
     * Calcula el FPS promedio
     */
    calculateAverageFPS() {
        return this.calculateAverage(this.metrics.fps);
    }

    /**
     * Calcula el tiempo de renderizado promedio
     */
    calculateAverageRenderTime() {
        return this.calculateAverage(this.metrics.frameTime);
    }

    /**
     * Calcula la varianza del FPS
     */
    calculateFPSVariance() {
        return this.calculateVariance(this.metrics.fps);
    }

    /**
     * Genera reporte de resultados
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            testOptions: this.options,
            results: this.testResults,
            summary: this.generateSummary(),
            recommendations: this.generateRecommendations()
        };

        // Output según formato especificado
        switch (this.options.outputFormat) {
            case 'json':
                this.outputJSON(report);
                break;
            case 'html':
                this.outputHTML(report);
                break;
            default:
                this.outputConsole(report);
        }

        return report;
    }

    /**
     * Genera resumen de resultados
     */
    generateSummary() {
        const successfulTests = Object.values(this.testResults).filter(result => result.success).length;
        const totalTests = Object.keys(this.testResults).length;
        
        const avgFPS = Object.values(this.testResults)
            .filter(result => result.metrics && result.metrics.fps)
            .reduce((sum, result) => sum + result.metrics.fps.average, 0) / successfulTests;
        
        const avgRenderTime = Object.values(this.testResults)
            .filter(result => result.metrics && result.metrics.frameTime)
            .reduce((sum, result) => sum + result.metrics.frameTime.average, 0) / successfulTests;

        return {
            totalTests,
            successfulTests,
            failedTests: totalTests - successfulTests,
            successRate: (successfulTests / totalTests) * 100,
            averageFPS: avgFPS,
            averageRenderTime: avgRenderTime,
            overallPerformance: this.evaluateOverallPerformance(avgFPS, avgRenderTime)
        };
    }

    /**
     * Evalúa el rendimiento general
     */
    evaluateOverallPerformance(avgFPS, avgRenderTime) {
        if (avgFPS >= 55 && avgRenderTime <= 16.67) {
            return 'excellent';
        } else if (avgFPS >= 45 && avgRenderTime <= 22.22) {
            return 'good';
        } else if (avgFPS >= 30 && avgRenderTime <= 33.33) {
            return 'acceptable';
        } else {
            return 'poor';
        }
    }

    /**
     * Genera recomendaciones
     */
    generateRecommendations() {
        const recommendations = [];
        const summary = this.generateSummary();

        if (summary.averageFPS < 30) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'FPS bajo detectado. Considere reducir la complejidad de componentes o aumentar el batching.',
                action: 'Optimizar renderizado'
            });
        }

        if (summary.averageRenderTime > 20) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'Tiempo de renderizado alto. Revise la lógica de componentes y considere memoización.',
                action: 'Optimizar componentes'
            });
        }

        const lowCacheHitRateTests = Object.values(this.testResults)
            .filter(result => result.cacheHitRate && result.cacheHitRate < 0.5);
        
        if (lowCacheHitRateTests.length > 0) {
            recommendations.push({
                type: 'cache',
                priority: 'medium',
                message: 'Baja tasa de cache hits detectada. Revise la estrategia de memoización.',
                action: 'Optimizar caché'
            });
        }

        const highMemoryTests = Object.values(this.testResults)
            .filter(result => result.metrics && result.metrics.memoryUsage && result.metrics.memoryUsage.peak > 50 * 1024 * 1024);
        
        if (highMemoryTests.length > 0) {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                message: 'Alto uso de memoria detectado. Revise fugas de memoria y optimice estructuras de datos.',
                action: 'Optimizar uso de memoria'
            });
        }

        return recommendations;
    }

    /**
     * Output a consola
     */
    outputConsole(report) {
        console.log('\n' + '='.repeat(60));
        console.log('REPORTE DE PRUEBAS DE RENDIMIENTO DE RENDERIZADO');
        console.log('='.repeat(60));
        
        console.log('\n📊 RESUMEN:');
        console.log(`Tests totales: ${report.summary.totalTests}`);
        console.log(`Tests exitosos: ${report.summary.successfulTests}`);
        console.log(`Tests fallidos: ${report.summary.failedTests}`);
        console.log(`Tasa de éxito: ${report.summary.successRate.toFixed(1)}%`);
        console.log(`FPS promedio: ${report.summary.averageFPS.toFixed(1)}`);
        console.log(`Tiempo de renderizado promedio: ${report.summary.averageRenderTime.toFixed(2)}ms`);
        console.log(`Rendimiento general: ${report.summary.overallPerformance}`);
        
        console.log('\n📋 DETALLES POR PRUEBA:');
        Object.entries(report.results).forEach(([testName, result]) => {
            console.log(`\n${testName}:`);
            console.log(`  Éxito: ${result.success ? '✅' : '❌'}`);
            if (result.metrics) {
                console.log(`  FPS promedio: ${result.metrics.fps ? result.metrics.fps.average.toFixed(1) : 'N/A'}`);
                console.log(`  Tiempo de renderizado: ${result.metrics.frameTime ? result.metrics.frameTime.average.toFixed(2) + 'ms' : 'N/A'}`);
                console.log(`  Tasa de cache: ${result.cacheHitRate ? (result.cacheHitRate * 100).toFixed(1) + '%' : 'N/A'}`);
            }
        });
        
        if (report.recommendations.length > 0) {
            console.log('\n💡 RECOMENDACIONES:');
            report.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
                console.log(`   Acción: ${rec.action}`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
    }

    /**
     * Output JSON
     */
    outputJSON(report) {
        const jsonStr = JSON.stringify(report, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `rendering-performance-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Output HTML
     */
    outputHTML(report) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reporte de Rendimiento de Renderizado</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { background: #007bff; color: white; padding: 20px; border-radius: 8px; }
                    .summary { background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 8px; }
                    .test-result { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
                    .success { border-left: 4px solid #28a745; }
                    .failure { border-left: 4px solid #dc3545; }
                    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0; }
                    .metric { background: #e9ecef; padding: 10px; border-radius: 4px; }
                    .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 5px 0; border-radius: 4px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Reporte de Rendimiento de Renderizado</h1>
                    <p>Generado: ${new Date().toLocaleString()}</p>
                </div>
                
                <div class="summary">
                    <h2>Resumen</h2>
                    <div class="metrics">
                        <div class="metric"><strong>Tests totales:</strong> ${report.summary.totalTests}</div>
                        <div class="metric"><strong>Tests exitosos:</strong> ${report.summary.successfulTests}</div>
                        <div class="metric"><strong>Tasa de éxito:</strong> ${report.summary.successRate.toFixed(1)}%</div>
                        <div class="metric"><strong>FPS promedio:</strong> ${report.summary.averageFPS.toFixed(1)}</div>
                        <div class="metric"><strong>Tiempo renderizado:</strong> ${report.summary.averageRenderTime.toFixed(2)}ms</div>
                        <div class="metric"><strong>Rendimiento:</strong> ${report.summary.overallPerformance}</div>
                    </div>
                </div>
                
                <h2>Resultados por Prueba</h2>
                ${Object.entries(report.results).map(([testName, result]) => `
                    <div class="test-result ${result.success ? 'success' : 'failure'}">
                        <h3>${testName}</h3>
                        <p><strong>Éxito:</strong> ${result.success ? '✅ Sí' : '❌ No'}</p>
                        ${result.duration ? `<p><strong>Duración:</strong> ${result.duration.toFixed(2)}ms</p>` : ''}
                        ${result.metrics ? `
                            <div class="metrics">
                                ${result.metrics.fps ? `<div class="metric"><strong>FPS promedio:</strong> ${result.metrics.fps.average.toFixed(1)}</div>` : ''}
                                ${result.metrics.frameTime ? `<div class="metric"><strong>Tiempo renderizado:</strong> ${result.metrics.frameTime.average.toFixed(2)}ms</div>` : ''}
                                ${result.cacheHitRate ? `<div class="metric"><strong>Tasa cache:</strong> ${(result.cacheHitRate * 100).toFixed(1)}%</div>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
                
                ${report.recommendations.length > 0 ? `
                    <h2>Recomendaciones</h2>
                    ${report.recommendations.map(rec => `
                        <div class="recommendation">
                            <strong>[${rec.priority.toUpperCase()}]</strong> ${rec.message}<br>
                            <em>Acción: ${rec.action}</em>
                        </div>
                    `).join('')}
                ` : ''}
            </body>
            </html>
        `;
        
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `rendering-performance-report-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Utilidad para dormir
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Limpia el entorno de pruebas
     */
    cleanup() {
        if (this.testContainer && this.testContainer.parentElement) {
            this.testContainer.parentElement.removeChild(this.testContainer);
        }

        // Limpiar sistemas
        Object.values(this.systems).forEach(system => {
            if (system && system.cleanup) {
                system.cleanup();
            }
        });

        console.log('Entorno de pruebas limpiado');
    }
}

// Exportar para uso global
window.RenderingPerformanceTest = RenderingPerformanceTest;

// Ejecutar pruebas si se carga directamente
if (typeof window !== 'undefined') {
    // Crear botón para ejecutar pruebas
    const testButton = document.createElement('button');
    testButton.textContent = 'Ejecutar Pruebas de Rendimiento';
    testButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 10px 20px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 10001;
        font-weight: bold;
    `;
    
    testButton.addEventListener('click', async () => {
        testButton.disabled = true;
        testButton.textContent = 'Ejecutando...';
        
        const test = new RenderingPerformanceTest({
            testDuration: 5000,
            componentCount: 50,
            outputFormat: 'console'
        });
        
        await test.runAllTests();
        
        testButton.textContent = 'Pruebas Completadas';
        setTimeout(() => {
            testButton.remove();
        }, 3000);
    });
    
    document.body.appendChild(testButton);
    
    console.log('Botón de pruebas de rendimiento agregado. Haz clic para ejecutar las pruebas.');
}