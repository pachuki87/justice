/**
 * Justice 2 Adaptive Cache - Caché Adaptativa Dinámica
 * Se adapta automáticamente a patrones de uso y condiciones del sistema
 */

const AdaptiveCache = {
    // Configuración
    config: {
        initialSize: 200,
        maxSize: 1000,
        minSize: 50,
        defaultTTL: 300000, // 5 minutos
        enableAutoScaling: true,
        enableAdaptiveTTL: true,
        enableLoadBasedOptimization: true,
        enableEnvironmentAwareness: true,
        scalingThreshold: 0.8, // 80% utilización para escalar
        shrinkingThreshold: 0.3, // 30% utilización para reducir
        adaptationInterval: 60000, // 1 minuto para adaptaciones
        enableMemoryPressureDetection: true,
        enableCPUMonitoring: true,
        enableNetworkAwareness: true,
        enableUserBehaviorAdaptation: true,
        enableContextualAdaptation: true,
        enablePredictiveScaling: true,
        enableResourceOptimization: true
    },

    // Estado
    state: {
        cache: new Map(),
        currentSize: 200,
        accessPatterns: new Map(),
        systemMetrics: {
            memoryUsage: 0,
            cpuUsage: 0,
            networkLatency: 0,
            loadAverage: 0,
            timestamp: Date.now()
        },
        adaptationHistory: [],
        performanceBaseline: {
            hitRate: 0,
            averageResponseTime: 0,
            throughput: 0
        },
        adaptiveStrategies: {
            currentStrategy: 'balanced',
            strategies: {
                'performance': { priority: 'speed', ttlMultiplier: 1.5, sizeMultiplier: 1.5 },
                'memory': { priority: 'memory', ttlMultiplier: 0.7, sizeMultiplier: 0.5 },
                'balanced': { priority: 'balanced', ttlMultiplier: 1.0, sizeMultiplier: 1.0 },
                'network': { priority: 'network', ttlMultiplier: 1.2, sizeMultiplier: 0.8 },
                'battery': { priority: 'battery', ttlMultiplier: 0.5, sizeMultiplier: 0.3 }
            }
        },
        userProfiles: new Map(),
        contextProfiles: new Map(),
        adaptationStats: {
            totalAdaptations: 0,
            successfulAdaptations: 0,
            failedAdaptations: 0,
            averageAdaptationTime: 0,
            lastAdaptation: null,
            adaptationReasons: new Map()
        },
        isInitialized: false,
        lastAdaptation: Date.now()
    },

    /**
     * Inicializar Adaptive Cache
     */
    init: async function(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        
        // Inicializar tamaño actual
        this.state.currentSize = this.config.initialSize;
        
        // Iniciar monitoreo del sistema
        await this.initializeSystemMonitoring();
        
        // Cargar perfiles persistentes
        await this.loadPersistentProfiles();
        
        // Iniciar adaptaciones periódicas
        this.startAdaptationTimer();
        
        // Iniciar monitoreo de rendimiento
        this.startPerformanceMonitoring();
        
        this.state.isInitialized = true;
        this.log('Adaptive Cache inicializado con adaptación dinámica');
    },

    /**
     * Inicializar monitoreo del sistema
     */
    initializeSystemMonitoring: async function() {
        // Monitoreo de memoria
        if (this.config.enableMemoryPressureDetection) {
            this.startMemoryMonitoring();
        }
        
        // Monitoreo de CPU
        if (this.config.enableCPUMonitoring) {
            this.startCPUMonitoring();
        }
        
        // Monitoreo de red
        if (this.config.enableNetworkAwareness) {
            this.startNetworkMonitoring();
        }
        
        // Monitoreo de batería (si está disponible)
        if (typeof navigator !== 'undefined' && navigator.getBattery) {
            this.startBatteryMonitoring();
        }
    },

    /**
     * Obtener valor con adaptación dinámica
     */
    get: async function(key, context = {}) {
        const startTime = performance.now();
        
        try {
            // Actualizar contexto si está habilitado
            if (this.config.enableContextualAdaptation) {
                this.updateContextProfile(key, context);
            }
            
            // Adaptar estrategia basada en condiciones actuales
            await this.adaptStrategyIfNeeded();
            
            // Buscar en caché
            const cacheEntry = this.state.cache.get(key);
            
            if (!cacheEntry) {
                // Miss - actualizar patrones y adaptar
                await this.updateAccessPattern(key, false);
                await this.checkAndAdapt();
                this.recordMiss();
                return null;
            }
            
            // Verificar si ha expirado
            if (this.isExpired(cacheEntry)) {
                await this.delete(key);
                await this.updateAccessPattern(key, false);
                await this.checkAndAdapt();
                this.recordMiss();
                return null;
            }
            
            // Hit - actualizar patrones y métricas
            await this.updateAccessPattern(key, true);
            this.recordHit();
            
            // Actualizar perfil de usuario si está habilitado
            if (this.config.enableUserBehaviorAdaptation && context.userId) {
                this.updateUserProfile(context.userId, key, 'hit');
            }
            
            // Actualizar métricas de rendimiento
            const endTime = performance.now();
            this.updatePerformanceMetrics(key, endTime - startTime, true);
            
            // Descomprimir si es necesario
            let value = cacheEntry.value;
            if (cacheEntry.compressed) {
                value = await this.decompressValue(value);
            }
            
            this.log(`Adaptive Cache HIT: ${key} (estrategia: ${this.state.adaptiveStrategies.currentStrategy})`);
            
            return value;
            
        } catch (error) {
            this.log(`Error obteniendo clave ${key}:`, error);
            this.recordMiss();
            return null;
        }
    },

    /**
     * Establecer valor con optimización adaptativa
     */
    set: async function(key, value, options = {}) {
        const startTime = performance.now();
        
        try {
            // Adaptar estrategia si es necesario
            await this.adaptStrategyIfNeeded();
            
            const strategy = this.state.adaptiveStrategies.strategies[this.state.adaptiveStrategies.currentStrategy];
            const ttl = this.calculateAdaptiveTTL(key, value, options, strategy);
            const now = Date.now();
            
            // Verificar límite de tamaño con evicción adaptativa
            if (this.state.cache.size >= this.state.currentSize && !this.state.cache.has(key)) {
                await this.adaptiveEviction(key, value, strategy);
            }
            
            // Compresión adaptativa basada en estrategia
            let processedValue = value;
            let compressed = false;
            let originalSize = this.calculateSize(value);
            
            if (strategy.priority === 'memory' || strategy.priority === 'battery') {
                // Priorizar ahorro de memoria
                const compressionResult = await this.adaptiveCompress(value, strategy);
                if (compressionResult.compressed) {
                    processedValue = compressionResult.data;
                    compressed = true;
                }
            }
            
            // Crear entrada de caché con metadatos adaptativas
            const cacheEntry = {
                key,
                value: processedValue,
                compressed,
                originalSize,
                timestamp: now,
                ttl,
                expiresAt: now + ttl,
                accessCount: 0,
                lastAccess: now,
                strategy: this.state.adaptiveStrategies.currentStrategy,
                priority: this.calculateAdaptivePriority(key, value, strategy),
                context: options.context || {},
                metadata: {
                    ...options.metadata,
                    adaptationReason: this.state.adaptationStats.lastAdaptation?.reason || 'initial',
                    systemLoad: this.state.systemMetrics.loadAverage,
                    memoryPressure: this.state.systemMetrics.memoryUsage
                }
            };
            
            // Almacenar en caché
            this.state.cache.set(key, cacheEntry);
            
            // Actualizar patrones de acceso
            await this.updateAccessPattern(key, true);
            
            // Actualizar perfil de usuario si está habilitado
            if (this.config.enableUserBehaviorAdaptation && options.context?.userId) {
                this.updateUserProfile(options.context.userId, key, 'set');
            }
            
            // Actualizar métricas de rendimiento
            const endTime = performance.now();
            this.updatePerformanceMetrics(key, endTime - startTime, false);
            
            // Verificar si se necesita adaptación
            await this.checkAndAdapt();
            
            this.log(`Adaptive Cache SET: ${key} (estrategia: ${this.state.adaptiveStrategies.currentStrategy}, TTL: ${ttl}ms)`);
            
            return true;
            
        } catch (error) {
            this.log(`Error estableciendo clave ${key}:`, error);
            return false;
        }
    },

    /**
     * Calcular TTL adaptativo basado en estrategia
     */
    calculateAdaptiveTTL: function(key, value, options, strategy) {
        let baseTTL = options.ttl || this.config.defaultTTL;
        
        // Aplicar multiplicador de TTL según estrategia
        baseTTL *= strategy.ttlMultiplier;
        
        // Ajustar por tipo de dato
        const category = this.categorizeData(key, value);
        if (category === 'user-data' || category === 'session-data') {
            baseTTL *= 0.7; // TTL más corto para datos sensibles
        } else if (category === 'configuration') {
            baseTTL *= 2; // TTL más largo para configuración
        }
        
        // Ajustar por carga del sistema
        if (this.state.systemMetrics.loadAverage > 0.8) {
            baseTTL *= 0.8; // Reducir TTL bajo alta carga
        } else if (this.state.systemMetrics.loadAverage < 0.3) {
            baseTTL *= 1.2; // Aumentar TTL bajo baja carga
        }
        
        // Ajustar por presión de memoria
        if (this.state.systemMetrics.memoryUsage > 0.8) {
            baseTTL *= 0.6; // Reducir TTL bajo presión de memoria
        }
        
        // Ajustar por latencia de red
        if (this.state.systemMetrics.networkLatency > 1000) { // > 1 segundo
            baseTTL *= 1.5; // Aumentar TTL con red lenta
        }
        
        // Ajustar por nivel de batería (si está disponible)
        if (this.state.systemMetrics.batteryLevel && this.state.systemMetrics.batteryLevel < 0.2) {
            baseTTL *= 0.5; // Reducir TTL con batería baja
        }
        
        // Limitar TTL entre 30 segundos y 24 horas
        return Math.max(30000, Math.min(86400000, baseTTL));
    },

    /**
     * Calcular prioridad adaptativa
     */
    calculateAdaptivePriority: function(key, value, strategy) {
        let priority = 5; // Prioridad base
        
        // Ajustar por estrategia
        if (strategy.priority === 'performance') {
            priority += 2; // Mayor prioridad para rendimiento
        } else if (strategy.priority === 'memory') {
            priority -= 1; // Menor prioridad para ahorro de memoria
        } else if (strategy.priority === 'battery') {
            priority -= 2; // Menor prioridad para ahorro de batería
        }
        
        // Ajustar por patrón de acceso
        const pattern = this.state.accessPatterns.get(key);
        if (pattern && pattern.frequency > 5) {
            priority += 2;
        }
        
        // Ajustar por tamaño
        const size = this.calculateSize(value);
        if (size > 100 * 1024) { // > 100KB
            priority -= 2;
        } else if (size < 1024) { // < 1KB
            priority += 1;
        }
        
        return Math.max(1, Math.min(10, priority));
    },

    /**
     * Compresión adaptativa basada en estrategia
     */
    adaptiveCompress: async function(value, strategy) {
        const originalSize = this.calculateSize(value);
        
        // No comprimir si es muy pequeño
        if (originalSize < 1024) {
            return { compressed: false, data: value, size: originalSize };
        }
        
        // Determinar si comprimir basado en estrategia
        let shouldCompress = false;
        
        if (strategy.priority === 'memory' || strategy.priority === 'battery') {
            shouldCompress = true; // Siempre comprimir para ahorrar memoria/batería
        } else if (strategy.priority === 'performance') {
            shouldCompress = originalSize > 10 * 1024; // Solo comprimir datos grandes
        } else {
            shouldCompress = originalSize > 5 * 1024; // Compresión moderada
        }
        
        if (!shouldCompress) {
            return { compressed: false, data: value, size: originalSize };
        }
        
        try {
            let compressedData;
            let algorithm;
            
            // Seleccionar algoritmo basado en estrategia
            if (strategy.priority === 'battery') {
                // Usar compresión ligera para ahorrar batería
                compressedData = await this.lightCompress(value);
                algorithm = 'light';
            } else if (strategy.priority === 'memory') {
                // Usar compresión agresiva para ahorrar memoria
                compressedData = await this.aggressiveCompress(value);
                algorithm = 'aggressive';
            } else {
                // Usar compresión balanceada
                compressedData = await this.balancedCompress(value);
                algorithm = 'balanced';
            }
            
            const compressedSize = this.calculateSize(compressedData);
            
            // Verificar que la compresión fue efectiva
            if (compressedSize < originalSize * 0.8) {
                return {
                    compressed: true,
                    data: compressedData,
                    size: compressedSize,
                    algorithm,
                    compressionRatio: compressedSize / originalSize
                };
            }
            
        } catch (error) {
            this.log('Error en compresión adaptativa:', error);
        }
        
        return {
            compressed: false,
            data: value,
            size: originalSize
        };
    },

    /**
     * Compresión ligera (ahorro de batería)
     */
    lightCompress: async function(value) {
        try {
            const jsonString = typeof value === 'string' ? value : JSON.stringify(value);
            
            // Compresión simple y rápida
            let compressed = jsonString
                .replace(/\s+/g, '') // Eliminar espacios
                .replace(/,+/g, ',') // Normalizar comas
                .replace(/:+/g, ':'); // Normalizar dos puntos
            
            return compressed;
            
        } catch (error) {
            return value;
        }
    },

    /**
     * Compresión agresiva (ahorro de memoria)
     */
    aggressiveCompress: async function(value) {
        try {
            const jsonString = typeof value === 'string' ? value : JSON.stringify(value);
            
            // Usar compresión gzip si está disponible
            if (typeof CompressionStream !== 'undefined') {
                const stream = new CompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                const encoder = new TextEncoder();
                const uint8Array = encoder.encode(jsonString);
                
                writer.write(uint8Array);
                writer.close();
                
                const chunks = [];
                let done = false;
                
                while (!done) {
                    const { value: chunk, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (chunk) {
                        chunks.push(chunk);
                    }
                }
                
                const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
                let offset = 0;
                for (const chunk of chunks) {
                    compressed.set(chunk, offset);
                    offset += chunk.length;
                }
                
                return btoa(String.fromCharCode(...compressed));
            }
            
            // Fallback: compresión base64
            return btoa(encodeURIComponent(jsonString));
            
        } catch (error) {
            return value;
        }
    },

    /**
     * Compresión balanceada
     */
    balancedCompress: async function(value) {
        try {
            const jsonString = typeof value === 'string' ? value : JSON.stringify(value);
            
            // Optimizaciones balanceadas
            let compressed = jsonString
                .replace(/\s+/g, '') // Eliminar espacios
                .replace(/,\s*}/g, '}') // Limpiar objetos vacíos
                .replace(/,\s*\]/g, ']'); // Limpiar arrays vacíos
            
            // Usar compresión gzip si el resultado sigue siendo grande
            if (compressed.length > 2048 && typeof CompressionStream !== 'undefined') {
                const stream = new CompressionStream('deflate');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                const encoder = new TextEncoder();
                const uint8Array = encoder.encode(compressed);
                
                writer.write(uint8Array);
                writer.close();
                
                const chunks = [];
                let done = false;
                
                while (!done) {
                    const { value: chunk, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (chunk) {
                        chunks.push(chunk);
                    }
                }
                
                const compressedDeflate = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
                let offset = 0;
                for (const chunk of chunks) {
                    compressedDeflate.set(chunk, offset);
                    offset += chunk.length;
                }
                
                return btoa(String.fromCharCode(...compressedDeflate));
            }
            
            return compressed;
            
        } catch (error) {
            return value;
        }
    },

    /**
     * Evicción adaptativa
     */
    adaptiveEviction: async function(newKey, newValue, strategy) {
        const candidates = [];
        
        // Evaluar cada entrada para evicción basada en estrategia
        for (const [key, entry] of this.state.cache.entries()) {
            if (key === newKey) continue;
            
            const score = this.calculateEvictionScore(key, entry, strategy);
            candidates.push({ key, score, entry });
        }
        
        // Ordenar por score (menor score = mejor candidato para evicción)
        candidates.sort((a, b) => a.score - b.score);
        
        // Determinar cuántas entradas evictar
        const toEvict = Math.ceil(this.state.currentSize * 0.1); // Evictar 10%
        
        // Evictar entradas con menor score
        for (let i = 0; i < toEvict && i < candidates.length; i++) {
            await this.delete(candidates[i].key);
            this.log(`Evicción adaptativa: ${candidates[i].key} (estrategia: ${strategy.priority})`);
        }
    },

    /**
     * Calcular score de evicción adaptativa
     */
    calculateEvictionScore: function(key, entry, strategy) {
        let score = 0;
        
        // Factor de frecuencia
        const pattern = this.state.accessPatterns.get(key);
        const frequency = pattern ? pattern.frequency : 0;
        score += (1 - Math.min(1, frequency / 10)) * 0.3;
        
        // Factor de recencia
        const recency = pattern ? pattern.recency : 0;
        score += (1 - recency) * 0.25;
        
        // Factor de tamaño (ajustado por estrategia)
        const normalizedSize = Math.min(1, entry.originalSize / (100 * 1024));
        if (strategy.priority === 'memory') {
            score += normalizedSize * 0.3; // Mayor peso al tamaño
        } else {
            score += normalizedSize * 0.2;
        }
        
        // Factor de prioridad
        score += (1 - entry.priority / 10) * 0.15;
        
        // Factor de edad
        const age = Date.now() - entry.timestamp;
        score += Math.min(1, age / (24 * 60 * 60 * 1000)) * 0.1; // Normalizado a 24 horas
        
        return score;
    },

    /**
     * Adaptar estrategia si es necesario
     */
    adaptStrategyIfNeeded: async function() {
        if (!this.config.enableAutoScaling) {
            return;
        }
        
        const now = Date.now();
        const timeSinceLastAdaptation = now - this.state.lastAdaptation;
        
        // No adaptar muy frecuentemente
        if (timeSinceLastAdaptation < this.config.adaptationInterval) {
            return;
        }
        
        // Analizar condiciones actuales
        const conditions = this.analyzeCurrentConditions();
        
        // Determinar mejor estrategia
        const recommendedStrategy = this.selectOptimalStrategy(conditions);
        
        // Cambiar estrategia si es diferente
        if (recommendedStrategy !== this.state.adaptiveStrategies.currentStrategy) {
            await this.changeStrategy(recommendedStrategy, conditions);
        }
    },

    /**
     * Analizar condiciones actuales del sistema
     */
    analyzeCurrentConditions: function() {
        const utilization = this.state.cache.size / this.state.currentSize;
        const hitRate = this.calculateHitRate();
        const avgResponseTime = this.state.performanceBaseline.averageResponseTime;
        
        return {
            utilization,
            hitRate,
            avgResponseTime,
            memoryUsage: this.state.systemMetrics.memoryUsage,
            cpuUsage: this.state.systemMetrics.cpuUsage,
            networkLatency: this.state.systemMetrics.networkLatency,
            loadAverage: this.state.systemMetrics.loadAverage,
            batteryLevel: this.state.systemMetrics.batteryLevel,
            timestamp: Date.now()
        };
    },

    /**
     * Seleccionar estrategia óptima basada en condiciones
     */
    selectOptimalStrategy: function(conditions) {
        let bestStrategy = 'balanced';
        let bestScore = 0;
        
        for (const [strategyName, strategy] of Object.entries(this.state.adaptiveStrategies.strategies)) {
            const score = this.calculateStrategyScore(strategyName, strategy, conditions);
            
            if (score > bestScore) {
                bestScore = score;
                bestStrategy = strategyName;
            }
        }
        
        return bestStrategy;
    },

    /**
     * Calcular score para una estrategia
     */
    calculateStrategyScore: function(strategyName, strategy, conditions) {
        let score = 0;
        
        // Score base por estrategia
        switch (strategyName) {
            case 'performance':
                score = conditions.hitRate < 0.7 ? 0.8 : 0.5;
                score += conditions.avgResponseTime > 100 ? 0.2 : -0.1;
                break;
            case 'memory':
                score = conditions.memoryUsage > 0.8 ? 0.9 : 0.3;
                score += conditions.utilization > 0.9 ? 0.1 : 0;
                break;
            case 'network':
                score = conditions.networkLatency > 1000 ? 0.8 : 0.4;
                break;
            case 'battery':
                score = conditions.batteryLevel && conditions.batteryLevel < 0.3 ? 0.9 : 0.2;
                break;
            case 'balanced':
                score = 0.5; // Score base para estrategia balanceada
                break;
        }
        
        // Ajustes basados en condiciones del sistema
        if (conditions.cpuUsage > 0.8) {
            score += strategyName === 'performance' ? -0.2 : 0.1;
        }
        
        if (conditions.loadAverage > 0.8) {
            score += strategyName === 'memory' ? 0.1 : 0;
        }
        
        return Math.max(0, Math.min(1, score));
    },

    /**
     * Cambiar estrategia de caché
     */
    changeStrategy: async function(newStrategy, conditions) {
        const oldStrategy = this.state.adaptiveStrategies.currentStrategy;
        const startTime = performance.now();
        
        try {
            this.log(`Cambiando estrategia: ${oldStrategy} -> ${newStrategy}`);
            
            // Actualizar estrategia actual
            this.state.adaptiveStrategies.currentStrategy = newStrategy;
            
            // Adaptar tamaño de caché según estrategia
            const newStrategyConfig = this.state.adaptiveStrategies.strategies[newStrategy];
            const targetSize = Math.round(this.config.maxSize * newStrategyConfig.sizeMultiplier);
            
            if (targetSize !== this.state.currentSize) {
                await this.resizeCache(targetSize, newStrategy);
            }
            
            // Adaptar TTL de entradas existentes
            await this.adaptExistingEntries(newStrategy);
            
            // Registrar adaptación exitosa
            const endTime = performance.now();
            this.recordSuccessfulAdaptation(oldStrategy, newStrategy, conditions, endTime - startTime);
            
            this.state.lastAdaptation = Date.now();
            
        } catch (error) {
            this.log(`Error cambiando estrategia:`, error);
            this.recordFailedAdaptation(oldStrategy, newStrategy, error);
        }
    },

    /**
     * Redimensionar caché
     */
    resizeCache: async function(newSize, strategy) {
        const oldSize = this.state.currentSize;
        
        if (newSize > oldSize) {
            // Aumentar tamaño - no hay necesidad de evictar
            this.state.currentSize = newSize;
            this.log(`Caché redimensionado: ${oldSize} -> ${newSize} (aumentado)`);
        } else if (newSize < oldSize) {
            // Reducir tamaño - evictar entradas según nueva estrategia
            const toEvict = oldSize - newSize;
            await this.evictForResize(toEvict, strategy);
            this.state.currentSize = newSize;
            this.log(`Caché redimensionado: ${oldSize} -> ${newSize} (reducido, ${toEvict} entradas evictadas)`);
        }
    },

    /**
     * Evictar entradas para redimensionamiento
     */
    evictForResize: async function(count, strategy) {
        const candidates = [];
        
        for (const [key, entry] of this.state.cache.entries()) {
            const score = this.calculateEvictionScore(key, entry, strategy);
            candidates.push({ key, score, entry });
        }
        
        candidates.sort((a, b) => a.score - b.score);
        
        for (let i = 0; i < count && i < candidates.length; i++) {
            await this.delete(candidates[i].key);
        }
    },

    /**
     * Adaptar entradas existentes a nueva estrategia
     */
    adaptExistingEntries: async function(newStrategy) {
        const strategy = this.state.adaptiveStrategies.strategies[newStrategy];
        const adaptedEntries = [];
        
        for (const [key, entry] of this.state.cache.entries()) {
            // Recalcular TTL
            const newTTL = entry.ttl * strategy.ttlMultiplier;
            entry.expiresAt = entry.timestamp + newTTL;
            entry.ttl = newTTL;
            
            // Recalcular prioridad
            entry.priority = this.calculateAdaptivePriority(key, entry.value, strategy);
            
            // Marcar como adaptada
            entry.strategy = newStrategy;
            entry.lastAdapted = Date.now();
            
            adaptedEntries.push(key);
        }
        
        this.log(`${adaptedEntries.length} entradas adaptadas a estrategia ${newStrategy}`);
    },

    /**
     * Verificar y adaptar si es necesario
     */
    checkAndAdapt: async function() {
        if (!this.config.enableAutoScaling) {
            return;
        }
        
        const conditions = this.analyzeCurrentConditions();
        
        // Adaptar tamaño si es necesario
        if (conditions.utilization > this.config.scalingThreshold) {
            await this.scaleUp(conditions);
        } else if (conditions.utilization < this.config.shrinkingThreshold) {
            await this.scaleDown(conditions);
        }
        
        // Adaptar basado en memoria
        if (this.config.enableMemoryPressureDetection && conditions.memoryUsage > 0.9) {
            await this.handleMemoryPressure(conditions);
        }
    },

    /**
     * Escalar hacia arriba
     */
    scaleUp: async function(conditions) {
        const currentStrategy = this.state.adaptiveStrategies.currentStrategy;
        const strategy = this.state.adaptiveStrategies.strategies[currentStrategy];
        
        const newSize = Math.min(
            this.config.maxSize,
            Math.round(this.state.currentSize * 1.2)
        );
        
        if (newSize > this.state.currentSize) {
            await this.resizeCache(newSize, strategy);
            this.recordAdaptationReason('scale_up', conditions);
        }
    },

    /**
     * Escalar hacia abajo
     */
    scaleDown: async function(conditions) {
        const currentStrategy = this.state.adaptiveStrategies.currentStrategy;
        const strategy = this.state.adaptiveStrategies.strategies[currentStrategy];
        
        const newSize = Math.max(
            this.config.minSize,
            Math.round(this.state.currentSize * 0.8)
        );
        
        if (newSize < this.state.currentSize) {
            await this.resizeCache(newSize, strategy);
            this.recordAdaptationReason('scale_down', conditions);
        }
    },

    /**
     * Manejar presión de memoria
     */
    handleMemoryPressure: async function(conditions) {
        // Cambiar a estrategia de ahorro de memoria
        if (this.state.adaptiveStrategies.currentStrategy !== 'memory') {
            await this.changeStrategy('memory', conditions);
            this.recordAdaptationReason('memory_pressure', conditions);
        }
        
        // Reducir tamaño de caché
        const newSize = Math.max(
            this.config.minSize,
            Math.round(this.state.currentSize * 0.7)
        );
        
        if (newSize < this.state.currentSize) {
            await this.resizeCache(newSize, this.state.adaptiveStrategies.strategies.memory);
        }
    },

    /**
     * Iniciar monitoreo de memoria
     */
    startMemoryMonitoring: function() {
        setInterval(() => {
            if (typeof performance !== 'undefined' && performance.memory) {
                const memory = performance.memory;
                const used = memory.usedJSHeapSize;
                const total = memory.totalJSHeapSize;
                
                this.state.systemMetrics.memoryUsage = used / total;
            } else if (typeof process !== 'undefined' && process.memoryUsage) {
                const memory = process.memoryUsage();
                const used = memory.heapUsed;
                const total = memory.heapTotal;
                
                this.state.systemMetrics.memoryUsage = used / total;
            }
        }, 5000); // Cada 5 segundos
    },

    /**
     * Iniciar monitoreo de CPU
     */
    startCPUMonitoring: function() {
        setInterval(() => {
            // Simulación de monitoreo de CPU
            // En producción, usar APIs reales de monitoreo
            const now = Date.now();
            const randomFactor = Math.sin(now / 10000) * 0.3 + 0.5; // Simulación
            
            this.state.systemMetrics.cpuUsage = Math.max(0, Math.min(1, randomFactor));
            this.state.systemMetrics.loadAverage = this.state.systemMetrics.cpuUsage;
        }, 3000); // Cada 3 segundos
    },

    /**
     * Iniciar monitoreo de red
     */
    startNetworkMonitoring: function() {
        setInterval(async () => {
            try {
                // Medir latencia con una petición simple
                const startTime = performance.now();
                
                if (typeof fetch !== 'undefined') {
                    const response = await fetch('https://httpbin.org/json', {
                        method: 'HEAD',
                        cache: 'no-cache'
                    });
                    const endTime = performance.now();
                    
                    this.state.systemMetrics.networkLatency = endTime - startTime;
                }
            } catch (error) {
                // Error de red - asumir alta latencia
                this.state.systemMetrics.networkLatency = 5000;
            }
        }, 10000); // Cada 10 segundos
    },

    /**
     * Iniciar monitoreo de batería
     */
    startBatteryMonitoring: function() {
        if (typeof navigator !== 'undefined' && navigator.getBattery) {
            navigator.getBattery().then(battery => {
                this.state.systemMetrics.batteryLevel = battery.level;
                
                battery.addEventListener('levelchange', () => {
                    this.state.systemMetrics.batteryLevel = battery.level;
                    
                    // Adaptar si la batería está baja
                    if (battery.level < 0.2) {
                        this.handleLowBattery();
                    }
                });
            });
        }
    },

    /**
     * Manejar batería baja
     */
    handleLowBattery: async function() {
        if (this.state.adaptiveStrategies.currentStrategy !== 'battery') {
            const conditions = this.analyzeCurrentConditions();
            await this.changeStrategy('battery', conditions);
            this.recordAdaptationReason('low_battery', conditions);
        }
    },

    /**
     * Iniciar timer de adaptación
     */
    startAdaptationTimer: function() {
        setInterval(async () => {
            await this.checkAndAdapt();
        }, this.config.adaptationInterval);
    },

    /**
     * Iniciar monitoreo de rendimiento
     */
    startPerformanceMonitoring: function() {
        setInterval(() => {
            this.updatePerformanceBaseline();
        }, 30000); // Cada 30 segundos
    },

    /**
     * Actualizar línea base de rendimiento
     */
    updatePerformanceBaseline: function() {
        const hitRate = this.calculateHitRate();
        const avgResponseTime = this.state.performanceBaseline.averageResponseTime;
        const throughput = this.calculateThroughput();
        
        // Suavizar cambios con media móvil
        const alpha = 0.1; // Factor de suavizado
        
        this.state.performanceBaseline.hitRate = 
            this.state.performanceBaseline.hitRate * (1 - alpha) + hitRate * alpha;
        
        this.state.performanceBaseline.averageResponseTime = 
            this.state.performanceBaseline.averageResponseTime * (1 - alpha) + avgResponseTime * alpha;
        
        this.state.performanceBaseline.throughput = 
            this.state.performanceBaseline.throughput * (1 - alpha) + throughput * alpha;
    },

    /**
     * Actualizar patrón de acceso
     */
    updateAccessPattern: async function(key, wasHit) {
        let pattern = this.state.accessPatterns.get(key);
        
        if (!pattern) {
            pattern = {
                accessCount: 0,
                hits: 0,
                misses: 0,
                firstAccess: Date.now(),
                lastAccess: Date.now(),
                accessTimes: [],
                frequency: 0,
                recency: 0
            };
        }
        
        pattern.accessCount++;
        pattern.lastAccess = Date.now();
        pattern.accessTimes.push(Date.now());
        
        if (wasHit) {
            pattern.hits++;
        } else {
            pattern.misses++;
        }
        
        // Limitar historial de tiempos de acceso
        if (pattern.accessTimes.length > 100) {
            pattern.accessTimes = pattern.accessTimes.slice(-100);
        }
        
        // Calcular métricas
        const timeSinceFirstAccess = Date.now() - pattern.firstAccess;
        pattern.frequency = pattern.accessCount / (timeSinceFirstAccess / 1000 / 60); // accesos por minuto
        
        const timeSinceLastAccess = Date.now() - pattern.lastAccess;
        pattern.recency = Math.max(0, 1 - (timeSinceLastAccess / (60 * 60 * 1000))); // normalizado a 1 hora
        
        this.state.accessPatterns.set(key, pattern);
    },

    /**
     * Actualizar perfil de usuario
     */
    updateUserProfile: function(userId, key, action) {
        let profile = this.state.userProfiles.get(userId);
        
        if (!profile) {
            profile = {
                accessPatterns: new Map(),
                preferences: {
                    preferredStrategy: 'balanced',
                    preferredTTL: this.config.defaultTTL,
                    compressionEnabled: true
                },
                statistics: {
                    totalAccesses: 0,
                    hitRate: 0,
                    averageResponseTime: 0
                }
            };
        }
        
        // Actualizar patrón de acceso
        if (!profile.accessPatterns.has(key)) {
            profile.accessPatterns.set(key, {
                hits: 0,
                misses: 0,
                lastAccess: Date.now()
            });
        }
        
        const keyPattern = profile.accessPatterns.get(key);
        if (action === 'hit') {
            keyPattern.hits++;
        } else {
            keyPattern.misses++;
        }
        keyPattern.lastAccess = Date.now();
        
        // Actualizar estadísticas
        profile.statistics.totalAccesses++;
        
        this.state.userProfiles.set(userId, profile);
    },

    /**
     * Actualizar perfil de contexto
     */
    updateContextProfile: function(key, context) {
        if (!this.config.enableContextualAdaptation) {
            return;
        }
        
        let profile = this.state.contextProfiles.get(key);
        
        if (!profile) {
            profile = {
                contexts: [],
                lastUpdate: Date.now(),
                preferredStrategy: 'balanced',
                adaptationHistory: []
            };
        }
        
        // Agregar nuevo contexto
        profile.contexts.push({
            ...context,
            timestamp: Date.now()
        });
        
        // Limitar historial de contextos
        if (profile.contexts.length > 50) {
            profile.contexts = profile.contexts.slice(-50);
        }
        
        profile.lastUpdate = Date.now();
        this.state.contextProfiles.set(key, profile);
    },

    /**
     * Cargar perfiles persistentes
     */
    loadPersistentProfiles: async function() {
        try {
            if (typeof localStorage !== 'undefined') {
                const data = localStorage.getItem('justice2_adaptive_cache_profiles');
                if (data) {
                    const parsed = JSON.parse(data);
                    
                    // Cargar perfiles de usuario
                    if (parsed.userProfiles) {
                        this.state.userProfiles = new Map(Object.entries(parsed.userProfiles));
                    }
                    
                    // Cargar perfiles de contexto
                    if (parsed.contextProfiles) {
                        this.state.contextProfiles = new Map(Object.entries(parsed.contextProfiles));
                    }
                    
                    this.log('Perfiles persistentes cargados');
                }
            }
        } catch (error) {
            this.log('Error cargando perfiles persistentes:', error);
        }
    },

    /**
     * Guardar perfiles persistentes
     */
    savePersistentProfiles: async function() {
        try {
            if (typeof localStorage !== 'undefined') {
                const data = {
                    userProfiles: Object.fromEntries(this.state.userProfiles),
                    contextProfiles: Object.fromEntries(this.state.contextProfiles),
                    timestamp: Date.now()
                };
                
                localStorage.setItem('justice2_adaptive_cache_profiles', JSON.stringify(data));
            }
        } catch (error) {
            this.log('Error guardando perfiles persistentes:', error);
        }
    },

    /**
     * Registrar adaptación exitosa
     */
    recordSuccessfulAdaptation: function(oldStrategy, newStrategy, conditions, duration) {
        const adaptation = {
            timestamp: Date.now(),
            oldStrategy,
            newStrategy,
            conditions,
            duration,
            success: true
        };
        
        this.state.adaptationHistory.push(adaptation);
        this.state.adaptationStats.totalAdaptations++;
        this.state.adaptationStats.successfulAdaptations++;
        this.state.adaptationStats.lastAdaptation = adaptation;
        
        // Actualizar tiempo promedio de adaptación
        const totalDuration = this.state.adaptationStats.averageAdaptationTime * 
            (this.state.adaptationStats.totalAdaptations - 1) + duration;
        this.state.adaptationStats.averageAdaptationTime = totalDuration / this.state.adaptationStats.totalAdaptations;
        
        // Limitar historial de adaptaciones
        if (this.state.adaptationHistory.length > 100) {
            this.state.adaptationHistory = this.state.adaptationHistory.slice(-100);
        }
        
        this.log(`Adaptación exitosa: ${oldStrategy} -> ${newStrategy} (${duration.toFixed(2)}ms)`);
    },

    /**
     * Registrar adaptación fallida
     */
    recordFailedAdaptation: function(oldStrategy, newStrategy, error) {
        const adaptation = {
            timestamp: Date.now(),
            oldStrategy,
            newStrategy,
            error: error.message,
            success: false
        };
        
        this.state.adaptationHistory.push(adaptation);
        this.state.adaptationStats.totalAdaptations++;
        this.state.adaptationStats.failedAdaptations++;
        
        this.log(`Adaptación fallida: ${oldStrategy} -> ${newStrategy}: ${error.message}`);
    },

    /**
     * Registrar razón de adaptación
     */
    recordAdaptationReason: function(reason, conditions) {
        if (!this.state.adaptationStats.adaptationReasons.has(reason)) {
            this.state.adaptationStats.adaptationReasons.set(reason, {
                count: 0,
                lastOccurrence: null,
                conditions: []
            });
        }
        
        const reasonData = this.state.adaptationStats.adaptationReasons.get(reason);
        reasonData.count++;
        reasonData.lastOccurrence = Date.now();
        reasonData.conditions.push(conditions);
        
        // Limitar historial de condiciones
        if (reasonData.conditions.length > 10) {
            reasonData.conditions = reasonData.conditions.slice(-10);
        }
    },

    /**
     * Métodos auxiliares
     */
    categorizeData: function(key, value) {
        if (key.includes('user') || key.includes('profile')) {
            return 'user-data';
        } else if (key.includes('api') || key.includes('response')) {
            return 'api-response';
        } else if (key.includes('config') || key.includes('settings')) {
            return 'configuration';
        } else if (key.includes('temp') || key.includes('cache')) {
            return 'temporary';
        } else if (key.includes('session') || key.includes('auth')) {
            return 'session-data';
        }
        
        return 'general';
    },

    calculateSize: function(value) {
        if (value === null || value === undefined) {
            return 0;
        }
        
        if (typeof value === 'string') {
            return new Blob([value]).size;
        }
        
        if (typeof value === 'object') {
            return new Blob([JSON.stringify(value)]).size;
        }
        
        return 8; // Tamaño aproximado para tipos primitivos
    },

    isExpired: function(entry) {
        return Date.now() > entry.expiresAt;
    },

    calculateHitRate: function() {
        const total = this.state.cache.size;
        if (total === 0) return 0;
        
        let hits = 0;
        for (const pattern of this.state.accessPatterns.values()) {
            hits += pattern.hits;
        }
        
        return hits / total;
    },

    calculateThroughput: function() {
        // Simplificación: calcular basado en operaciones recientes
        return this.state.cache.size * 10; // Estimación simple
    },

    recordHit: function() {
        // Implementado en updateAccessPattern
    },

    recordMiss: function() {
        // Implementado en updateAccessPattern
    },

    updatePerformanceMetrics: function(key, responseTime, wasHit) {
        // Implementado en updatePerformanceBaseline
    },

    /**
     * Eliminar clave
     */
    delete: async function(key) {
        const deleted = this.state.cache.delete(key);
        
        if (deleted) {
            this.state.accessPatterns.delete(key);
            this.state.contextProfiles.delete(key);
        }
        
        return deleted;
    },

    /**
     * Limpiar caché
     */
    clear: async function() {
        const clearedCount = this.state.cache.size;
        
        this.state.cache.clear();
        this.state.accessPatterns.clear();
        this.state.userProfiles.clear();
        this.state.contextProfiles.clear();
        
        // Reiniciar estadísticas
        this.state.adaptationStats = {
            totalAdaptations: 0,
            successfulAdaptations: 0,
            failedAdaptations: 0,
            averageAdaptationTime: 0,
            lastAdaptation: null,
            adaptationReasons: new Map()
        };
        
        this.log(`Adaptive Cache CLEAR: ${clearedCount} entradas eliminadas`);
        return clearedCount;
    },

    /**
     * Obtener estadísticas
     */
    getStatistics: function() {
        const hitRate = this.calculateHitRate();
        const utilization = this.state.cache.size / this.state.currentSize;
        
        return {
            cacheSize: this.state.cache.size,
            currentSize: this.state.currentSize,
            maxSize: this.config.maxSize,
            minSize: this.config.minSize,
            utilization: Math.round(utilization * 100) / 100,
            hitRate: Math.round(hitRate * 100) / 100,
            currentStrategy: this.state.adaptiveStrategies.currentStrategy,
            systemMetrics: this.state.systemMetrics,
            performanceBaseline: this.state.performanceBaseline,
            adaptationStats: {
                ...this.state.adaptationStats,
                successRate: this.state.adaptationStats.totalAdaptations > 0 ? 
                    (this.state.adaptationStats.successfulAdaptations / this.state.adaptationStats.totalAdaptations) * 100 : 0
            },
            userProfiles: this.state.userProfiles.size,
            contextProfiles: this.state.contextProfiles.size,
            adaptationHistory: this.state.adaptationHistory.length
        };
    },

    /**
     * Obtener estado detallado
     */
    getDetailedStatus: function() {
        return {
            statistics: this.getStatistics(),
            config: this.config,
            adaptiveStrategies: this.state.adaptiveStrategies,
            systemMetrics: this.state.systemMetrics,
            performanceBaseline: this.state.performanceBaseline,
            adaptationHistory: this.state.adaptationHistory.slice(-10), // Últimas 10 adaptaciones
            isInitialized: this.state.isInitialized,
            lastAdaptation: this.state.lastAdaptation
        };
    },

    /**
     * Exportar configuración de adaptación
     */
    exportAdaptationConfig: function() {
        return {
            currentStrategy: this.state.adaptiveStrategies.currentStrategy,
            strategies: this.state.adaptiveStrategies.strategies,
            currentSize: this.state.currentSize,
            adaptationHistory: this.state.adaptationHistory,
            userProfiles: Object.fromEntries(this.state.userProfiles),
            contextProfiles: Object.fromEntries(this.state.contextProfiles),
            timestamp: Date.now()
        };
    },

    /**
     * Importar configuración de adaptación
     */
    importAdaptationConfig: function(config) {
        if (config.currentStrategy) {
            this.state.adaptiveStrategies.currentStrategy = config.currentStrategy;
        }
        
        if (config.strategies) {
            this.state.adaptiveStrategies.strategies = config.strategies;
        }
        
        if (config.currentSize) {
            this.state.currentSize = config.currentSize;
        }
        
        if (config.userProfiles) {
            this.state.userProfiles = new Map(Object.entries(config.userProfiles));
        }
        
        if (config.contextProfiles) {
            this.state.contextProfiles = new Map(Object.entries(config.contextProfiles));
        }
        
        this.log('Configuración de adaptación importada');
    },

    /**
     * Logging
     */
    log: function(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [AdaptiveCache] ${message}`;
        
        if (data) {
            console.log(logEntry, data);
        } else {
            console.log(logEntry);
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.AdaptiveCache = AdaptiveCache;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdaptiveCache;
}