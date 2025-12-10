/**
 * Justice 2 Resource Pool
 * Sistema de pooling de objetos para reducir garbage collection
 * Proporciona reutilización eficiente de objetos y memoria
 */

import { XSSProtection } from './xss-protection.js';

const ResourcePool = {
    // Configuración del pool
    config: {
        // Configuración de pools
        enableAutoCleanup: true,
        cleanupInterval: 60000,           // 1 minuto
        maxPoolSize: 100,               // Máximo objetos por pool
        minPoolSize: 5,                 // Mínimo objetos por pool
        maxIdleTime: 300000,             // 5 minutos máximo tiempo inactivo
        
        // Configuración de estadísticas
        enableStatistics: true,
        statisticsInterval: 30000,        // 30 segundos
        
        // Configuración de logging
        enableLogging: true,
        logLevel: 'info'
    },

    // Estado del pool
    state: {
        initialized: false,
        
        // Pools de objetos
        pools: new Map(),
        
        // Estadísticas
        stats: {
            totalCreated: 0,
            totalReused: 0,
            totalAcquired: 0,
            totalReleased: 0,
            currentPooled: 0,
            peakPooled: 0,
            efficiency: 0,
            lastCleanup: Date.now()
        },
        
        // Configuración de tipos de objetos
        objectTypes: new Map()
    },

    // Inicialización del ResourcePool
    init: function() {
        if (this.state.initialized) {
            this.log('ResourcePool ya está inicializado', 'warn');
            return;
        }

        try {
            this.log('Inicializando ResourcePool...');
            
            // Configurar tipos de objetos predefinidos
            this.setupObjectTypes();
            
            // Configurar limpieza automática
            if (this.config.enableAutoCleanup) {
                this.setupAutoCleanup();
            }
            
            // Configurar estadísticas
            if (this.config.enableStatistics) {
                this.setupStatistics();
            }
            
            // Configurar manejadores de eventos
            this.setupEventHandlers();
            
            this.state.initialized = true;
            this.log('ResourcePool inicializado correctamente', 'success');
            
            // Emitir evento de inicialización
            this.emitEvent('resource:pool:initialized', {
                timestamp: Date.now(),
                config: this.config
            });
            
        } catch (error) {
            this.log('Error inicializando ResourcePool: ' + error.message, 'error');
            throw error;
        }
    },

    // Configurar tipos de objetos predefinidos
    setupObjectTypes: function() {
        // Pool de arrays
        this.registerObjectType('array', {
            factory: () => [],
            reset: (arr) => arr.length = 0,
            maxSize: 50,
            minSize: 5
        });
        
        // Pool de objetos genéricos
        this.registerObjectType('object', {
            factory: () => ({}),
            reset: (obj) => {
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        delete obj[key];
                    }
                }
            },
            maxSize: 30,
            minSize: 3
        });
        
        // Pool de strings
        this.registerObjectType('string', {
            factory: () => '',
            reset: (str) => str.length = 0,
            maxSize: 100,
            minSize: 10
        });
        
        // Pool de buffers
        this.registerObjectType('buffer', {
            factory: () => new ArrayBuffer(1024),
            reset: (buffer) => {
                // Limpiar buffer
                new Uint8Array(buffer).fill(0);
            },
            maxSize: 20,
            minSize: 2
        });
        
        // Pool de DOM elements
        this.registerObjectType('dom', {
            factory: () => document.createElement('div'),
            reset: (element) => {
                element.innerHTML = '';
                element.className = '';
                element.style.cssText = '';
                while (element.firstChild) {
                    element.removeChild(element.firstChild);
                }
            },
            maxSize: 25,
            minSize: 3
        });
        
        // Pool de eventos
        this.registerObjectType('event', {
            factory: () => new Event('custom'),
            reset: (event) => {
                // Los eventos no se pueden resetear fácilmente
                return null;
            },
            maxSize: 15,
            minSize: 2
        });
        
        this.log('Tipos de objetos predefinidos configurados', 'info');
    },

    // Registrar tipo de objeto
    registerObjectType: function(type, config) {
        const typeConfig = {
            factory: config.factory || (() => ({})),
            reset: config.reset || ((obj) => obj),
            maxSize: config.maxSize || this.config.maxPoolSize,
            minSize: config.minSize || this.config.minPoolSize,
            created: Date.now(),
            stats: {
                created: 0,
                reused: 0,
                acquired: 0,
                released: 0,
                current: 0,
                peak: 0
            }
        };
        
        this.state.objectTypes.set(type, typeConfig);
        
        // Crear pool para este tipo
        this.state.pools.set(type, {
            available: [],
            inUse: new Set(),
            config: typeConfig
        });
        
        // Pre-cargar objetos mínimos
        this.preloadObjects(type, typeConfig.minSize);
        
        this.log(`Tipo de objeto registrado: ${type}`, 'info');
    },

    // Pre-cargar objetos
    preloadObjects: function(type, count) {
        const pool = this.state.pools.get(type);
        if (!pool) return;
        
        for (let i = 0; i < count; i++) {
            const obj = pool.config.factory();
            pool.available.push(obj);
            pool.config.stats.created++;
        }
        
        this.updateGlobalStats();
    },

    // Configurar limpieza automática
    setupAutoCleanup: function() {
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, this.config.cleanupInterval);
        
        this.log('Limpieza automática configurada', 'info');
    },

    // Configurar estadísticas
    setupStatistics: function() {
        this.statisticsInterval = setInterval(() => {
            this.updateStatistics();
        }, this.config.statisticsInterval);
        
        this.log('Estadísticas configuradas', 'info');
    },

    // Configurar manejadores de eventos
    setupEventHandlers: function() {
        if (typeof window !== 'undefined') {
            // Limpiar pools al cambiar de página
            window.addEventListener('beforeunload', () => {
                this.cleanupAllPools();
            });
            
            // Limpiar al descargar la página
            window.addEventListener('unload', () => {
                this.cleanupAllPools();
            });
        }
    },

    // Adquirir objeto del pool
    acquire: function(type, factory = null, resetFn = null) {
        const pool = this.state.pools.get(type);
        
        if (!pool) {
            // Crear pool dinámico si no existe
            this.registerObjectType(type, {
                factory: factory || (() => ({})),
                reset: resetFn || ((obj) => obj),
                maxSize: this.config.maxPoolSize,
                minSize: this.config.minPoolSize
            });
            
            return this.acquire(type, factory, resetFn);
        }
        
        let obj;
        
        // Intentar obtener objeto del pool
        if (pool.available.length > 0) {
            obj = pool.available.pop();
            pool.config.stats.reused++;
            this.state.stats.totalReused++;
        } else {
            // Crear nuevo objeto si el pool está vacío
            obj = pool.config.factory();
            pool.config.stats.created++;
            this.state.stats.totalCreated++;
        }
        
        // Resetear objeto
        try {
            pool.config.reset(obj);
        } catch (error) {
            this.log(`Error reseteando objeto tipo ${type}: ${error.message}`, 'warn');
        }
        
        // Marcar como en uso
        pool.inUse.add(obj);
        pool.config.stats.acquired++;
        pool.config.stats.current = pool.inUse.size;
        pool.config.stats.peak = Math.max(pool.config.stats.peak, pool.inUse.size);
        
        // Actualizar estadísticas globales
        this.state.stats.totalAcquired++;
        this.updateGlobalStats();
        
        return obj;
    },

    // Liberar objeto al pool
    release: function(type, obj) {
        const pool = this.state.pools.get(type);
        
        if (!pool || !pool.inUse.has(obj)) {
            this.log(`Intento de liberar objeto no válido del pool ${type}`, 'warn');
            return false;
        }
        
        // Remover de uso
        pool.inUse.delete(obj);
        pool.config.stats.released++;
        
        // Resetear objeto antes de devolver al pool
        try {
            pool.config.reset(obj);
        } catch (error) {
            this.log(`Error reseteando objeto al liberar tipo ${type}: ${error.message}`, 'warn');
        }
        
        // Devolver al pool si hay espacio
        if (pool.available.length < pool.config.maxSize) {
            pool.available.push(obj);
        } else {
            // Pool lleno, descartar objeto
            this.log(`Pool ${type} lleno, descartando objeto`, 'debug');
        }
        
        // Actualizar estadísticas globales
        this.state.stats.totalReleased++;
        this.updateGlobalStats();
        
        return true;
    },

    // Crear pool personalizado
    createPool: function(type, factory, resetFn, options = {}) {
        const config = {
            factory,
            reset: resetFn || ((obj) => obj),
            maxSize: options.maxSize || this.config.maxPoolSize,
            minSize: options.minSize || this.config.minPoolSize,
            autoPreload: options.autoPreload !== false
        };
        
        this.registerObjectType(type, config);
        
        return {
            acquire: (customFactory, customReset) => this.acquire(type, customFactory || factory, customReset || resetFn),
            release: (obj) => this.release(type, obj),
            getStats: () => this.getPoolStats(type),
            clear: () => this.clearPool(type)
        };
    },

    // Obtener estadísticas del pool
    getPoolStats: function(type) {
        const pool = this.state.pools.get(type);
        const typeConfig = this.state.objectTypes.get(type);
        
        if (!pool || !typeConfig) return null;
        
        return {
            type,
            available: pool.available.length,
            inUse: pool.inUse.size,
            total: pool.available.length + pool.inUse.size,
            maxSize: pool.config.maxSize,
            minSize: pool.config.minSize,
            utilization: (pool.inUse.size / pool.config.maxSize) * 100,
            efficiency: typeConfig.stats.reused / (typeConfig.stats.created + typeConfig.stats.reused) * 100 || 0,
            stats: { ...typeConfig.stats }
        };
    },

    // Limpiar pool específico
    clearPool: function(type) {
        const pool = this.state.pools.get(type);
        if (!pool) return false;
        
        // Limpiar objetos en uso
        pool.inUse.clear();
        
        // Limpiar objetos disponibles
        pool.available = [];
        
        // Reiniciar estadísticas
        const typeConfig = this.state.objectTypes.get(type);
        if (typeConfig) {
            typeConfig.stats = {
                created: 0,
                reused: 0,
                acquired: 0,
                released: 0,
                current: 0,
                peak: 0
            };
        }
        
        this.log(`Pool ${type} limpiado`, 'info');
        return true;
    },

    // Realizar limpieza automática
    performCleanup: function() {
        let totalCleaned = 0;
        
        for (const [type, pool] of this.state.pools) {
            const cleaned = this.cleanupPool(type);
            totalCleaned += cleaned;
        }
        
        this.state.stats.lastCleanup = Date.now();
        
        if (totalCleaned > 0) {
            this.log(`Limpieza automática: ${totalCleaned} objetos eliminados`, 'info');
        }
        
        return totalCleaned;
    },

    // Limpiar pool específico
    cleanupPool: function(type) {
        const pool = this.state.pools.get(type);
        if (!pool) return 0;
        
        let cleaned = 0;
        const now = Date.now();
        
        // Limpiar objetos disponibles que exceden el máximo
        if (pool.available.length > pool.config.maxSize) {
            const excess = pool.available.length - pool.config.maxSize;
            pool.available.splice(0, excess);
            cleaned += excess;
        }
        
        // Limpiar objetos inactivos (si tuviéramos timestamp de último uso)
        // Esta es una implementación simplificada
        
        // Pre-cargar si es necesario
        if (pool.available.length < pool.config.minSize) {
            const needed = pool.config.minSize - pool.available.length;
            for (let i = 0; i < needed; i++) {
                const obj = pool.config.factory();
                pool.available.push(obj);
                pool.config.stats.created++;
            }
        }
        
        return cleaned;
    },

    // Limpiar todos los pools
    cleanupAllPools: function() {
        let totalCleaned = 0;
        
        for (const type of this.state.pools.keys()) {
            totalCleaned += this.clearPool(type);
        }
        
        this.log(`Limpieza total: ${totalCleaned} objetos eliminados`, 'info');
        return totalCleaned;
    },

    // Actualizar estadísticas globales
    updateGlobalStats: function() {
        let totalPooled = 0;
        
        for (const pool of this.state.pools.values()) {
            totalPooled += pool.available.length + pool.inUse.size;
        }
        
        this.state.stats.currentPooled = totalPooled;
        this.state.stats.peakPooled = Math.max(this.state.stats.peakPooled, totalPooled);
        
        // Calcular eficiencia global
        if (this.state.stats.totalCreated + this.state.stats.totalReused > 0) {
            this.state.stats.efficiency = 
                (this.state.stats.totalReused / (this.state.stats.totalCreated + this.state.stats.totalReused)) * 100;
        }
    },

    // Actualizar estadísticas detalladas
    updateStatistics: function() {
        this.updateGlobalStats();
        
        // Emitir evento de estadísticas
        this.emitEvent('resource:pool:statistics', {
            timestamp: Date.now(),
            globalStats: this.state.stats,
            poolStats: this.getAllPoolStats()
        });
    },

    // Obtener estadísticas de todos los pools
    getAllPoolStats: function() {
        const stats = {};
        
        for (const type of this.state.pools.keys()) {
            stats[type] = this.getPoolStats(type);
        }
        
        return stats;
    },

    // Obtener reporte completo
    getReport: function() {
        return {
            timestamp: Date.now(),
            globalStats: this.state.stats,
            poolStats: this.getAllPoolStats(),
            objectTypes: Object.fromEntries(
                Array.from(this.state.objectTypes.entries()).map(([type, config]) => [
                    type, {
                        created: config.created,
                        maxSize: config.maxSize,
                        minSize: config.minSize,
                        stats: config.stats
                    }
                ])
            ),
            config: this.config
        };
    },

    // Obtener métricas actuales
    getCurrentMetrics: function() {
        return {
            ...this.state.stats,
            poolCount: this.state.pools.size,
            objectTypeCount: this.state.objectTypes.size,
            averagePoolSize: this.state.pools.size > 0 ? 
                Array.from(this.state.pools.values())
                    .reduce((sum, pool) => sum + pool.available.length + pool.inUse.size, 0) / 
                this.state.pools.size : 0
        };
    },

    // Emitir evento
    emitEvent: function(eventType, data) {
        if (typeof document !== 'undefined') {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    },

    // Reiniciar ResourcePool
    reset: function() {
        this.log('Reiniciando ResourcePool...');
        
        // Limpiar todos los pools
        this.cleanupAllPools();
        
        // Reiniciar estadísticas
        this.state.stats = {
            totalCreated: 0,
            totalReused: 0,
            totalAcquired: 0,
            totalReleased: 0,
            currentPooled: 0,
            peakPooled: 0,
            efficiency: 0,
            lastCleanup: Date.now()
        };
        
        // Reiniciar estadísticas de tipos
        for (const typeConfig of this.state.objectTypes.values()) {
            typeConfig.stats = {
                created: 0,
                reused: 0,
                acquired: 0,
                released: 0,
                current: 0,
                peak: 0
            };
        }
        
        this.log('ResourcePool reiniciado', 'success');
    },

    // Logging
    log: function(message, level = 'info', data = null) {
        if (!this.config.enableLogging) return;
        
        const shouldLog = this.config.logLevel === 'debug' || 
                          (this.config.logLevel === 'info' && ['info', 'warn', 'error'].includes(level)) ||
                          (this.config.logLevel === 'warn' && ['warn', 'error'].includes(level)) ||
                          (this.config.logLevel === 'error' && level === 'error');
        
        if (shouldLog) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [ResourcePool] [${level.toUpperCase()}] ${message}`;
            
            if (data) {
                console.log(logMessage, data);
            } else if (level === 'error') {
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

// Exportar el ResourcePool
export default ResourcePool;

// También exportar para uso global si está en navegador
if (typeof window !== 'undefined') {
    window.ResourcePool = ResourcePool;
}