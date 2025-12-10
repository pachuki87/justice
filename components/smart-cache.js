/**
 * Justice 2 Smart Cache - Caché Inteligente con Aprendizaje Automático
 * Implementación avanzada con ML para predicción de patrones de acceso
 */

const SmartCache = {
    // Configuración
    config: {
        maxSize: 500,
        defaultTTL: 300000, // 5 minutos
        enableMachineLearning: true,
        enablePredictivePrefetch: true,
        enableAdaptiveCompression: true,
        enableIntelligentEviction: true,
        learningRate: 0.01,
        predictionWindow: 60000, // 1 minuto para predicciones
        minConfidenceThreshold: 0.7, // 70% confianza mínima
        enableAIOptimization: true,
        modelUpdateInterval: 300000, // 5 minutos para actualizar modelo
        enableBehavioralAnalysis: true,
        enableContextAwareCaching: true,
        enableSemanticAnalysis: false, // Futuro: análisis semántico
        compressionThreshold: 1024,
        enableEncryption: false
    },

    // Estado
    state: {
        cache: new Map(),
        accessPatterns: new Map(),
        predictions: new Map(),
        mlModel: {
            weights: new Map(),
            biases: new Map(),
            accuracy: 0,
            lastUpdated: Date.now(),
            trainingData: []
        },
        behavioralProfiles: new Map(),
        contextData: new Map(),
        statistics: {
            hits: 0,
            misses: 0,
            predictions: 0,
            correctPredictions: 0,
            adaptiveOperations: 0,
            compressionSavings: 0,
            intelligentEvictions: 0,
            totalRequests: 0,
            averageResponseTime: 0,
            modelAccuracy: 0
        },
        performanceMetrics: {
            accessTimes: new Map(),
            frequencyAnalysis: new Map(),
            seasonalPatterns: new Map(),
            correlationMatrix: new Map()
        },
        isInitialized: false,
        lastModelUpdate: Date.now()
    },

    /**
     * Inicializar Smart Cache
     */
    init: async function(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        
        // Inicializar modelo de ML
        await this.initializeMLModel();
        
        // Cargar datos persistentes si existen
        await this.loadPersistentData();
        
        // Iniciar actualización periódica del modelo
        this.startModelUpdateTimer();
        
        // Iniciar análisis de patrones
        this.startPatternAnalysis();
        
        this.state.isInitialized = true;
        this.log('Smart Cache inicializado con ML y predicción inteligente');
    },

    /**
     * Inicializar modelo de Machine Learning
     */
    initializeMLModel: async function() {
        // Inicializar pesos y biases para red neuronal simple
        const inputSize = 10; // Características de entrada
        const hiddenSize = 5; // Capa oculta
        const outputSize = 1; // Predicción de acceso
        
        // Inicializar pesos con valores aleatorios pequeños
        for (let i = 0; i < inputSize; i++) {
            const weights = [];
            for (let j = 0; j < hiddenSize; j++) {
                weights.push((Math.random() - 0.5) * 0.1);
            }
            this.state.mlModel.weights.set(`input_${i}`, weights);
        }
        
        // Inicializar pesos de capa oculta a salida
        for (let i = 0; i < hiddenSize; i++) {
            this.state.mlModel.weights.set(`hidden_${i}`, (Math.random() - 0.5) * 0.1);
        }
        
        // Inicializar biases
        for (let i = 0; i < hiddenSize; i++) {
            this.state.mlModel.biases.set(`hidden_${i}`, 0);
        }
        this.state.mlModel.biases.set('output', 0);
    },

    /**
     * Obtener valor con predicción inteligente
     */
    get: async function(key, context = {}) {
        const startTime = performance.now();
        
        try {
            // Actualizar contexto si está habilitado
            if (this.config.enableContextAwareCaching) {
                this.updateContextData(key, context);
            }
            
            // Predecir acceso y hacer prefetch si es necesario
            if (this.config.enablePredictivePrefetch) {
                await this.predictivePrefetch(key);
            }
            
            // Buscar en caché
            const cacheEntry = this.state.cache.get(key);
            
            if (!cacheEntry) {
                // Miss - actualizar modelo de ML
                await this.updateMLModel(key, false, context);
                this.recordMiss();
                return null;
            }
            
            // Verificar si ha expirado
            if (this.isExpired(cacheEntry)) {
                await this.delete(key);
                await this.updateMLModel(key, false, context);
                this.recordMiss();
                return null;
            }
            
            // Hit - actualizar modelo y estadísticas
            await this.updateMLModel(key, true, context);
            this.recordHit();
            
            // Actualizar patrones de comportamiento
            if (this.config.enableBehavioralAnalysis) {
                this.updateBehavioralProfile(key, 'hit');
            }
            
            // Actualizar métricas de rendimiento
            const endTime = performance.now();
            this.updatePerformanceMetrics(key, endTime - startTime, true);
            
            // Descomprimir si es necesario
            let value = cacheEntry.value;
            if (cacheEntry.compressed) {
                value = await this.decompressValue(value);
            }
            
            this.log(`Smart Cache HIT: ${key} (predicción: ${cacheEntry.predicted ? 'sí' : 'no'})`);
            
            return value;
            
        } catch (error) {
            this.log(`Error obteniendo clave ${key}:`, error);
            this.recordMiss();
            return null;
        }
    },

    /**
     * Establecer valor con optimización inteligente
     */
    set: async function(key, value, options = {}) {
        const startTime = performance.now();
        
        try {
            const ttl = options.ttl || this.config.defaultTTL;
            const now = Date.now();
            
            // Análisis inteligente del valor
            const analysis = await this.analyzeValue(key, value);
            
            // Calcular TTL adaptativo basado en ML
            const adaptiveTTL = await this.calculateAdaptiveTTL(key, value, analysis);
            
            // Compresión adaptativa
            let processedValue = value;
            let compressed = false;
            let originalSize = this.calculateSize(value);
            
            if (this.config.enableAdaptiveCompression && 
                originalSize > this.config.compressionThreshold) {
                const compressionResult = await this.adaptiveCompress(value);
                if (compressionResult.compressed) {
                    processedValue = compressionResult.data;
                    compressed = true;
                    this.state.statistics.compressionSavings += 
                        originalSize - compressionResult.size;
                }
            }
            
            // Verificar límite de tamaño con evicción inteligente
            if (this.state.cache.size >= this.config.maxSize && !this.state.cache.has(key)) {
                await this.intelligentEviction(key, analysis);
            }
            
            // Crear entrada de caché con metadatos inteligentes
            const cacheEntry = {
                key,
                value: processedValue,
                compressed,
                originalSize,
                timestamp: now,
                ttl: adaptiveTTL,
                expiresAt: now + adaptiveTTL,
                accessCount: 0,
                lastAccess: now,
                predicted: false,
                priority: analysis.priority,
                category: analysis.category,
                context: options.context || {},
                metadata: {
                    ...options.metadata,
                    mlFeatures: analysis.features,
                    confidence: analysis.confidence,
                    accessPattern: analysis.pattern
                }
            };
            
            // Almacenar en caché
            this.state.cache.set(key, cacheEntry);
            
            // Actualizar modelo de ML
            await this.updateMLModel(key, true, options.context);
            
            // Actualizar patrones de comportamiento
            if (this.config.enableBehavioralAnalysis) {
                this.updateBehavioralProfile(key, 'set');
            }
            
            // Actualizar métricas de rendimiento
            const endTime = performance.now();
            this.updatePerformanceMetrics(key, endTime - startTime, false);
            
            this.state.statistics.adaptiveOperations++;
            
            this.log(`Smart Cache SET: ${key} (TTL adaptativo: ${adaptiveTTL}ms, prioridad: ${analysis.priority})`);
            
            return true;
            
        } catch (error) {
            this.log(`Error estableciendo clave ${key}:`, error);
            return false;
        }
    },

    /**
     * Analizar valor para determinar características
     */
    analyzeValue: async function(key, value) {
        const features = await this.extractFeatures(key, value);
        
        // Análisis de patrones
        const pattern = this.analyzeAccessPattern(key);
        
        // Categorización automática
        const category = this.categorizeData(key, value);
        
        // Cálculo de prioridad
        const priority = this.calculatePriority(key, value, features, pattern);
        
        // Predicción de frecuencia de acceso
        const accessPrediction = await this.predictAccessFrequency(key, features);
        
        // Cálculo de confianza
        const confidence = this.calculateConfidence(features, pattern, accessPrediction);
        
        return {
            features,
            pattern,
            category,
            priority,
            accessPrediction,
            confidence,
            size: this.calculateSize(value),
            complexity: this.calculateComplexity(value)
        };
    },

    /**
     * Extraer características para ML
     */
    extractFeatures: async function(key, value) {
        const features = [];
        
        // Características de la clave
        features.push(key.length); // Longitud de clave
        features.push(key.split(':').length); // Número de segmentos
        features.push(key.includes('user') ? 1 : 0); // Es dato de usuario
        features.push(key.includes('api') ? 1 : 0); // Es dato de API
        features.push(key.includes('temp') ? 1 : 0); // Es dato temporal
        
        // Características del valor
        const valueSize = this.calculateSize(value);
        features.push(valueSize); // Tamaño del valor
        features.push(valueSize > 1024 ? 1 : 0); // Es valor grande
        features.push(typeof value === 'object' ? 1 : 0); // Es objeto
        features.push(Array.isArray(value) ? 1 : 0); // Es array
        
        // Características temporales
        const now = Date.now();
        const hourOfDay = new Date(now).getHours();
        features.push(hourOfDay / 24); // Hora del día normalizada
        features.push((now / 1000) % 86400 / 86400); // Segundo del día normalizado
        
        return features;
    },

    /**
     * Analizar patrón de acceso
     */
    analyzeAccessPattern: function(key) {
        const pattern = this.state.accessPatterns.get(key);
        
        if (!pattern) {
            return {
                frequency: 0,
                recency: 0,
                regularity: 0,
                trend: 'unknown',
                seasonality: 'none'
            };
        }
        
        const now = Date.now();
        const timeSinceLastAccess = now - pattern.lastAccess;
        const timeSinceFirstAccess = now - pattern.firstAccess;
        
        // Calcular frecuencia
        const frequency = pattern.accessCount / (timeSinceFirstAccess / 1000 / 60); // accesos por minuto
        
        // Calcular recencia (más reciente = mayor valor)
        const recency = Math.max(0, 1 - (timeSinceLastAccess / (60 * 60 * 1000))); // normalizado a 1 hora
        
        // Calcular regularidad (varianza en tiempos de acceso)
        const regularity = this.calculateRegularity(pattern.accessTimes);
        
        // Determinar tendencia
        const trend = this.calculateTrend(pattern.accessTimes);
        
        // Determinar estacionalidad
        const seasonality = this.calculateSeasonality(pattern.accessTimes);
        
        return {
            frequency,
            recency,
            regularity,
            trend,
            seasonality,
            accessCount: pattern.accessCount,
            averageInterval: pattern.averageInterval
        };
    },

    /**
     * Categorizar datos automáticamente
     */
    categorizeData: function(key, value) {
        // Categorización basada en patrones de clave
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
        } else if (key.includes('document') || key.includes('file')) {
            return 'document-data';
        }
        
        // Categorización basada en tipo y tamaño de valor
        const size = this.calculateSize(value);
        if (size > 100 * 1024) { // > 100KB
            return 'large-data';
        } else if (typeof value === 'object' && value !== null) {
            return 'structured-data';
        } else if (typeof value === 'string' && value.length > 1000) {
            return 'text-data';
        }
        
        return 'general';
    },

    /**
     * Calcular prioridad inteligente
     */
    calculatePriority: function(key, value, features, pattern) {
        let priority = 5; // Prioridad base
        
        // Ajustar por frecuencia de acceso
        if (pattern.frequency > 10) {
            priority += 3;
        } else if (pattern.frequency > 5) {
            priority += 2;
        } else if (pattern.frequency > 1) {
            priority += 1;
        }
        
        // Ajustar por recencia
        if (pattern.recency > 0.8) {
            priority += 2;
        } else if (pattern.recency > 0.5) {
            priority += 1;
        }
        
        // Ajustar por categoría
        const category = this.categorizeData(key, value);
        if (category === 'user-data' || category === 'session-data') {
            priority += 2;
        } else if (category === 'api-response' || category === 'configuration') {
            priority += 1;
        } else if (category === 'temporary') {
            priority -= 1;
        }
        
        // Ajustar por tamaño (valores más pequeños tienen mayor prioridad)
        const size = this.calculateSize(value);
        if (size < 1024) { // < 1KB
            priority += 1;
        } else if (size > 100 * 1024) { // > 100KB
            priority -= 2;
        }
        
        // Ajustar por tendencia
        if (pattern.trend === 'increasing') {
            priority += 2;
        } else if (pattern.trend === 'decreasing') {
            priority -= 1;
        }
        
        return Math.max(1, Math.min(10, priority)); // Limitar entre 1 y 10
    },

    /**
     * Predicción de frecuencia de acceso usando ML
     */
    predictAccessFrequency: async function(key, features) {
        if (!this.config.enableMachineLearning) {
            return { frequency: 0, confidence: 0 };
        }
        
        try {
            // Forward pass through neural network
            const hiddenLayer = [];
            const inputSize = features.length;
            const hiddenSize = 5;
            
            // Capa oculta
            for (let i = 0; i < hiddenSize; i++) {
                let sum = this.state.mlModel.biases.get(`hidden_${i}`) || 0;
                
                for (let j = 0; j < inputSize; j++) {
                    const weights = this.state.mlModel.weights.get(`input_${j}`) || [];
                    sum += features[j] * (weights[i] || 0);
                }
                
                // Activación ReLU
                hiddenLayer[i] = Math.max(0, sum);
            }
            
            // Capa de salida
            let output = this.state.mlModel.biases.get('output') || 0;
            for (let i = 0; i < hiddenSize; i++) {
                output += hiddenLayer[i] * (this.state.mlModel.weights.get(`hidden_${i}`) || 0);
            }
            
            // Activación sigmoid para salida entre 0 y 1
            const predictedFrequency = 1 / (1 + Math.exp(-output));
            
            // Calcular confianza basada en precisión histórica del modelo
            const confidence = this.state.mlModel.accuracy || 0.5;
            
            this.state.statistics.predictions++;
            
            return {
                frequency: predictedFrequency,
                confidence,
                rawOutput: output,
                hiddenLayer
            };
            
        } catch (error) {
            this.log('Error en predicción ML:', error);
            return { frequency: 0, confidence: 0 };
        }
    },

    /**
     * Calcular confianza de la predicción
     */
    calculateConfidence: function(features, pattern, prediction) {
        let confidence = prediction.confidence;
        
        // Ajustar por cantidad de datos históricos
        const historicalData = this.state.accessPatterns.get(features[0]);
        if (historicalData && historicalData.accessCount > 10) {
            confidence += 0.2;
        } else if (historicalData && historicalData.accessCount > 5) {
            confidence += 0.1;
        } else {
            confidence -= 0.2;
        }
        
        // Ajustar por regularidad del patrón
        confidence += pattern.regularity * 0.3;
        
        // Ajustar por tendencia
        if (pattern.trend === 'stable') {
            confidence += 0.1;
        } else if (pattern.trend === 'volatile') {
            confidence -= 0.2;
        }
        
        return Math.max(0, Math.min(1, confidence));
    },

    /**
     * Calcular TTL adaptativo basado en ML
     */
    calculateAdaptiveTTL: async function(key, value, analysis) {
        let baseTTL = this.config.defaultTTL;
        
        // Ajustar por predicción de frecuencia
        if (analysis.accessPrediction.frequency > 0.8) {
            baseTTL *= 2; // Duplicar TTL para datos muy frecuentes
        } else if (analysis.accessPrediction.frequency > 0.6) {
            baseTTL *= 1.5; // Aumentar 50% para datos frecuentes
        } else if (analysis.accessPrediction.frequency < 0.2) {
            baseTTL *= 0.5; // Reducir TTL para datos infrecuentes
        }
        
        // Ajustar por categoría
        const category = analysis.category;
        if (category === 'user-data' || category === 'session-data') {
            baseTTL *= 0.7; // TTL más corto para datos sensibles
        } else if (category === 'configuration') {
            baseTTL *= 3; // TTL más largo para configuración
        } else if (category === 'temporary') {
            baseTTL *= 0.3; // TTL muy corto para datos temporales
        }
        
        // Ajustar por tamaño
        if (analysis.size > 100 * 1024) { // > 100KB
            baseTTL *= 0.8; // Reducir TTL para datos grandes
        }
        
        // Ajustar por confianza de la predicción
        if (analysis.confidence > 0.8) {
            baseTTL *= 1.2; // Aumentar TTL si hay alta confianza
        } else if (analysis.confidence < 0.5) {
            baseTTL *= 0.8; // Reducir TTL si hay baja confianza
        }
        
        // Ajustar por patrón de acceso
        if (analysis.pattern.regularity > 0.8) {
            baseTTL *= 1.3; // Aumentar TTL para patrones regulares
        }
        
        // Limitar TTL entre 30 segundos y 24 horas
        return Math.max(30000, Math.min(86400000, baseTTL));
    },

    /**
     * Compresión adaptativa inteligente
     */
    adaptiveCompress: async function(value) {
        const originalSize = this.calculateSize(value);
        
        // Analizar el valor para determinar mejor estrategia de compresión
        const analysis = this.analyzeForCompression(value);
        
        if (!analysis.shouldCompress) {
            return {
                compressed: false,
                data: value,
                size: originalSize
            };
        }
        
        try {
            let compressedData;
            let algorithm;
            
            // Seleccionar algoritmo basado en análisis
            if (analysis.type === 'text' && analysis.repetitive) {
                // Usar compresión basada en diccionario para texto repetitivo
                compressedData = await this.dictionaryCompress(value);
                algorithm = 'dictionary';
            } else if (analysis.type === 'json') {
                // Usar compresión específica para JSON
                compressedData = await this.jsonCompress(value);
                algorithm = 'json';
            } else {
                // Usar compresión genérica
                compressedData = await this.genericCompress(value);
                algorithm = 'generic';
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
     * Analizar valor para determinar estrategia de compresión
     */
    analyzeForCompression: function(value) {
        const analysis = {
            shouldCompress: false,
            type: 'unknown',
            repetitive: false,
            entropy: 0
        };
        
        const size = this.calculateSize(value);
        
        // No comprimir valores pequeños
        if (size < this.config.compressionThreshold) {
            return analysis;
        }
        
        analysis.shouldCompress = true;
        
        // Determinar tipo de dato
        if (typeof value === 'string') {
            analysis.type = 'text';
            
            // Calcular entropía para detectar repetición
            const entropy = this.calculateEntropy(value);
            analysis.entropy = entropy;
            analysis.repetitive = entropy < 6; // Baja entropía = más repetitivo
            
        } else if (typeof value === 'object') {
            analysis.type = 'json';
            
            // Para objetos, convertir a string y analizar
            const jsonString = JSON.stringify(value);
            const entropy = this.calculateEntropy(jsonString);
            analysis.entropy = entropy;
            analysis.repetitive = entropy < 6;
        }
        
        return analysis;
    },

    /**
     * Calcular entropía de Shannon para determinar repetición
     */
    calculateEntropy: function(data) {
        if (typeof data !== 'string') {
            data = String(data);
        }
        
        const frequency = {};
        let entropy = 0;
        
        // Calcular frecuencia de cada carácter
        for (let i = 0; i < data.length; i++) {
            const char = data[i];
            frequency[char] = (frequency[char] || 0) + 1;
        }
        
        // Calcular entropía
        for (const char in frequency) {
            const probability = frequency[char] / data.length;
            if (probability > 0) {
                entropy -= probability * Math.log2(probability);
            }
        }
        
        return entropy;
    },

    /**
     * Compresión basada en diccionario
     */
    dictionaryCompress: async function(text) {
        // Implementación simple de compresión basada en diccionario
        const dictionary = {};
        const compressed = [];
        let dictSize = 256;
        
        // Inicializar diccionario con caracteres ASCII
        for (let i = 0; i < 256; i++) {
            dictionary[String.fromCharCode(i)] = i;
        }
        
        let current = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const phrase = current + char;
            
            if (dictionary.hasOwnProperty(phrase)) {
                current = phrase;
            } else {
                compressed.push(dictionary[current]);
                dictionary[phrase] = dictSize++;
                current = char;
            }
        }
        
        if (current) {
            compressed.push(dictionary[current]);
        }
        
        return JSON.stringify({
            data: compressed,
            dictionary: Object.keys(dictionary).slice(256) // Solo nuevas entradas
        });
    },

    /**
     * Compresión específica para JSON
     */
    jsonCompress: async function(data) {
        try {
            const jsonString = JSON.stringify(data);
            
            // Optimizaciones específicas para JSON
            let compressed = jsonString
                .replace(/\s+/g, '') // Eliminar espacios
                .replace(/","/g, '","') // Normalizar comas
                .replace(/:\{/g, ':{') // Normalizar dos puntos
                .replace(/\[\{/g, '[{'); // Normalizar brackets
            
            // Usar compresión genérica si es necesario
            if (compressed.length < jsonString.length * 0.8) {
                return compressed;
            }
            
            return await this.genericCompress(jsonString);
            
        } catch (error) {
            return data;
        }
    },

    /**
     * Compresión genérica
     */
    genericCompress: async function(data) {
        try {
            const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
            
            // Usar CompressionStream API si está disponible
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
            
            // Fallback: compresión simple
            return btoa(encodeURIComponent(jsonString));
            
        } catch (error) {
            return data;
        }
    },

    /**
     * Evicción inteligente basada en ML
     */
    intelligentEviction: async function(newKey, analysis) {
        if (!this.config.enableIntelligentEviction) {
            // Usar evicción LRU estándar
            this.evictLRU();
            return;
        }
        
        const candidates = [];
        
        // Evaluar cada entrada para evicción
        for (const [key, entry] of this.state.cache.entries()) {
            if (key === newKey) continue;
            
            const score = await this.calculateEvictionScore(key, entry);
            candidates.push({ key, score, entry });
        }
        
        // Ordenar por score (menor score = mejor candidato para evicción)
        candidates.sort((a, b) => a.score - b.score);
        
        // Evictar las entradas con menor score
        const toEvict = Math.ceil(this.config.maxSize * 0.1); // Evictar 10%
        for (let i = 0; i < toEvict && i < candidates.length; i++) {
            await this.delete(candidates[i].key);
            this.state.statistics.intelligentEvictions++;
        }
    },

    /**
     * Calcular score de evicción para una entrada
     */
    calculateEvictionScore: async function(key, entry) {
        let score = 0;
        
        // Factor de frecuencia (menor frecuencia = menor score)
        const pattern = this.analyzeAccessPattern(key);
        score += (1 - pattern.frequency) * 0.3;
        
        // Factor de recencia (menor recencia = menor score)
        score += (1 - pattern.recency) * 0.25;
        
        // Factor de tamaño (mayor tamaño = menor score)
        const normalizedSize = Math.min(1, entry.originalSize / (100 * 1024)); // Normalizar a 100KB
        score += normalizedSize * 0.2;
        
        // Factor de prioridad (menor prioridad = menor score)
        score += (1 - entry.priority / 10) * 0.15;
        
        // Factor de predicción (menor probabilidad de acceso futuro = menor score)
        const features = await this.extractFeatures(key, entry.value);
        const prediction = await this.predictAccessFrequency(key, features);
        score += (1 - prediction.frequency) * 0.1;
        
        return score;
    },

    /**
     * Prefetch predictivo
     */
    predictivePrefetch: async function(key) {
        if (!this.config.enablePredictivePrefetch) {
            return;
        }
        
        try {
            // Analizar patrones para predecir próximas claves
            const relatedKeys = await this.predictRelatedKeys(key);
            
            for (const relatedKey of relatedKeys) {
                // Verificar si ya está en caché
                if (this.state.cache.has(relatedKey)) {
                    continue;
                }
                
                // Verificar confianza de la predicción
                const features = await this.extractFeatures(relatedKey, null);
                const prediction = await this.predictAccessFrequency(relatedKey, features);
                
                if (prediction.confidence >= this.config.minConfidenceThreshold &&
                    prediction.frequency >= 0.5) {
                    
                    // Marcar como prefetch y almacenar
                    this.log(`Prefetch predictivo: ${relatedKey} (confianza: ${prediction.confidence})`);
                    
                    // Aquí se debería obtener el dato real y almacenarlo
                    // Por ahora, solo registramos la predicción
                    this.state.statistics.predictions++;
                }
            }
            
        } catch (error) {
            this.log('Error en prefetch predictivo:', error);
        }
    },

    /**
     * Predecir claves relacionadas
     */
    predictRelatedKeys: async function(key) {
        const relatedKeys = [];
        const pattern = this.state.accessPatterns.get(key);
        
        if (!pattern || !pattern.relatedKeys) {
            return relatedKeys;
        }
        
        // Analizar claves accedidas después de esta clave
        for (const [relatedKey, relatedPattern] of this.state.accessPatterns.entries()) {
            if (relatedKey === key) continue;
            
            // Calcular correlación
            const correlation = this.calculateCorrelation(pattern, relatedPattern);
            
            if (correlation > 0.5) { // Umbral de correlación
                relatedKeys.push({
                    key: relatedKey,
                    correlation,
                    frequency: relatedPattern.accessCount
                });
            }
        }
        
        // Ordenar por correlación y frecuencia
        relatedKeys.sort((a, b) => 
            (b.correlation * b.frequency) - (a.correlation * a.frequency)
        );
        
        // Retornar top 5
        return relatedKeys.slice(0, 5).map(item => item.key);
    },

    /**
     * Calcular correlación entre patrones
     */
    calculateCorrelation: function(pattern1, pattern2) {
        // Implementación simple de correlación basada en tiempos de acceso
        if (!pattern1.accessTimes || !pattern2.accessTimes) {
            return 0;
        }
        
        let correlation = 0;
        let matches = 0;
        
        // Buscar accesos que ocurrieron cerca en el tiempo
        for (const time1 of pattern1.accessTimes) {
            for (const time2 of pattern2.accessTimes) {
                const timeDiff = Math.abs(time1 - time2);
                
                // Si ocurrieron dentro de 5 minutos
                if (timeDiff < 5 * 60 * 1000) {
                    correlation += 1 - (timeDiff / (5 * 60 * 1000));
                    matches++;
                }
            }
        }
        
        return matches > 0 ? correlation / matches : 0;
    },

    /**
     * Actualizar modelo de Machine Learning
     */
    updateMLModel: async function(key, wasHit, context = {}) {
        if (!this.config.enableMachineLearning) {
            return;
        }
        
        try {
            // Extraer características
            const features = await this.extractFeatures(key, null);
            
            // Agregar datos de entrenamiento
            this.state.mlModel.trainingData.push({
                features,
                target: wasHit ? 1 : 0,
                timestamp: Date.now(),
                context
            });
            
            // Limitar tamaño de datos de entrenamiento
            if (this.state.mlModel.trainingData.length > 1000) {
                this.state.mlModel.trainingData = this.state.mlModel.trainingData.slice(-1000);
            }
            
            // Actualizar modelo periódicamente
            const now = Date.now();
            if (now - this.state.lastModelUpdate > this.config.modelUpdateInterval) {
                await this.trainModel();
                this.state.lastModelUpdate = now;
            }
            
        } catch (error) {
            this.log('Error actualizando modelo ML:', error);
        }
    },

    /**
     * Entrenar modelo de Machine Learning
     */
    trainModel: async function() {
        if (this.state.mlModel.trainingData.length < 10) {
            return; // No hay suficientes datos para entrenar
        }
        
        try {
            const trainingData = this.state.mlModel.trainingData;
            const learningRate = this.config.learningRate;
            
            // Entrenamiento simple usando descenso de gradiente
            for (let epoch = 0; epoch < 10; epoch++) {
                let totalError = 0;
                
                for (const sample of trainingData) {
                    // Forward pass
                    const prediction = await this.forwardPass(sample.features);
                    
                    // Calcular error
                    const error = sample.target - prediction.output;
                    totalError += Math.abs(error);
                    
                    // Backward pass (simplificado)
                    await this.backwardPass(sample.features, error, learningRate);
                }
                
                // Calcular precisión del modelo
                this.state.mlModel.accuracy = 1 - (totalError / trainingData.length);
            }
            
            this.state.mlModel.lastUpdated = Date.now();
            this.log(`Modelo ML entrenado. Precisión: ${(this.state.mlModel.accuracy * 100).toFixed(2)}%`);
            
        } catch (error) {
            this.log('Error entrenando modelo ML:', error);
        }
    },

    /**
     * Forward pass del modelo
     */
    forwardPass: async function(features) {
        const hiddenLayer = [];
        const hiddenSize = 5;
        
        // Capa oculta
        for (let i = 0; i < hiddenSize; i++) {
            let sum = this.state.mlModel.biases.get(`hidden_${i}`) || 0;
            
            for (let j = 0; j < features.length; j++) {
                const weights = this.state.mlModel.weights.get(`input_${j}`) || [];
                sum += features[j] * (weights[i] || 0);
            }
            
            hiddenLayer[i] = Math.max(0, sum); // ReLU
        }
        
        // Capa de salida
        let output = this.state.mlModel.biases.get('output') || 0;
        for (let i = 0; i < hiddenSize; i++) {
            output += hiddenLayer[i] * (this.state.mlModel.weights.get(`hidden_${i}`) || 0);
        }
        
        const sigmoidOutput = 1 / (1 + Math.exp(-output));
        
        return {
            output: sigmoidOutput,
            hiddenLayer
        };
    },

    /**
     * Backward pass del modelo
     */
    backwardPass: async function(features, error, learningRate) {
        // Implementación simplificada de backpropagation
        const hiddenSize = 5;
        
        // Actualizar pesos de capa oculta a salida
        for (let i = 0; i < hiddenSize; i++) {
            const currentWeight = this.state.mlModel.weights.get(`hidden_${i}`) || 0;
            const newWeight = currentWeight + learningRate * error;
            this.state.mlModel.weights.set(`hidden_${i}`, newWeight);
        }
        
        // Actualizar bias de salida
        const currentOutputBias = this.state.mlModel.biases.get('output') || 0;
        const newOutputBias = currentOutputBias + learningRate * error;
        this.state.mlModel.biases.set('output', newOutputBias);
        
        // Actualizar pesos de entrada a capa oculta
        for (let j = 0; j < features.length; j++) {
            const weights = this.state.mlModel.weights.get(`input_${j}`) || [];
            const newWeights = [];
            
            for (let i = 0; i < hiddenSize; i++) {
                const currentWeight = weights[i] || 0;
                const newWeight = currentWeight + learningRate * error * features[j];
                newWeights[i] = newWeight;
            }
            
            this.state.mlModel.weights.set(`input_${j}`, newWeights);
        }
        
        // Actualizar biases de capa oculta
        for (let i = 0; i < hiddenSize; i++) {
            const currentBias = this.state.mlModel.biases.get(`hidden_${i}`) || 0;
            const newBias = currentBias + learningRate * error;
            this.state.mlModel.biases.set(`hidden_${i}`, newBias);
        }
    },

    /**
     * Actualizar perfil de comportamiento
     */
    updateBehavioralProfile: function(key, action) {
        let profile = this.state.behavioralProfiles.get(key);
        
        if (!profile) {
            profile = {
                hits: 0,
                misses: 0,
                sets: 0,
                lastAction: action,
                actionHistory: [],
                preferences: {
                    preferredTTL: this.config.defaultTTL,
                    preferredCompression: false,
                    preferredPriority: 5
                }
            };
        }
        
        // Actualizar contadores
        if (action === 'hit') {
            profile.hits++;
        } else if (action === 'miss') {
            profile.misses++;
        } else if (action === 'set') {
            profile.sets++;
        }
        
        // Actualizar historial
        profile.actionHistory.push({
            action,
            timestamp: Date.now()
        });
        
        // Limitar historial
        if (profile.actionHistory.length > 100) {
            profile.actionHistory = profile.actionHistory.slice(-100);
        }
        
        // Actualizar preferencias basadas en comportamiento
        this.updatePreferences(profile, key);
        
        profile.lastAction = action;
        this.state.behavioralProfiles.set(key, profile);
    },

    /**
     * Actualizar preferencias basadas en comportamiento
     */
    updatePreferences: function(profile, key) {
        const hitRate = profile.hits / (profile.hits + profile.misses);
        
        // Ajustar TTL preferido basado en hit rate
        if (hitRate > 0.8) {
            profile.preferences.preferredTTL = Math.min(86400000, profile.preferences.preferredTTL * 1.2);
        } else if (hitRate < 0.3) {
            profile.preferences.preferredTTL = Math.max(60000, profile.preferences.preferredTTL * 0.8);
        }
        
        // Ajustar preferencia de compresión basada en patrones
        const cacheEntry = this.state.cache.get(key);
        if (cacheEntry && cacheEntry.compressed) {
            profile.preferences.preferredCompression = true;
        }
    },

    /**
     * Actualizar datos de contexto
     */
    updateContextData: function(key, context) {
        if (!this.config.enableContextAwareCaching) {
            return;
        }
        
        let contextData = this.state.contextData.get(key) || {
            contexts: [],
            lastUpdate: Date.now()
        };
        
        // Agregar nuevo contexto
        contextData.contexts.push({
            ...context,
            timestamp: Date.now()
        });
        
        // Limitar historial de contextos
        if (contextData.contexts.length > 50) {
            contextData.contexts = contextData.contexts.slice(-50);
        }
        
        contextData.lastUpdate = Date.now();
        this.state.contextData.set(key, contextData);
    },

    /**
     * Iniciar timer de actualización del modelo
     */
    startModelUpdateTimer: function() {
        setInterval(async () => {
            if (this.config.enableMachineLearning) {
                await this.trainModel();
            }
        }, this.config.modelUpdateInterval);
    },

    /**
     * Iniciar análisis de patrones
     */
    startPatternAnalysis: function() {
        setInterval(async () => {
            await this.analyzeGlobalPatterns();
        }, 60000); // Cada minuto
    },

    /**
     * Analizar patrones globales
     */
    analyzeGlobalPatterns: async function() {
        // Analizar patrones de acceso globales
        const now = Date.now();
        const recentAccesses = [];
        
        for (const [key, pattern] of this.state.accessPatterns.entries()) {
            if (now - pattern.lastAccess < 300000) { // Últimos 5 minutos
                recentAccesses.push({
                    key,
                    ...pattern
                });
            }
        }
        
        // Actualizar estadísticas globales
        this.state.performanceMetrics.frequencyAnalysis = this.analyzeFrequencyPatterns(recentAccesses);
        this.state.performanceMetrics.seasonalPatterns = this.analyzeSeasonalPatterns(recentAccesses);
    },

    /**
     * Analizar patrones de frecuencia
     */
    analyzeFrequencyPatterns: function(accesses) {
        const patterns = {
            highFrequency: accesses.filter(a => a.frequency > 10).length,
            mediumFrequency: accesses.filter(a => a.frequency > 2 && a.frequency <= 10).length,
            lowFrequency: accesses.filter(a => a.frequency <= 2).length,
            total: accesses.length
        };
        
        return patterns;
    },

    /**
     * Analizar patrones estacionales
     */
    analyzeSeasonalPatterns: function(accesses) {
        const hourlyPattern = new Array(24).fill(0);
        const dailyPattern = new Array(7).fill(0);
        
        for (const access of accesses) {
            const date = new Date(access.lastAccess);
            hourlyPattern[date.getHours()]++;
            dailyPattern[date.getDay()]++;
        }
        
        return {
            hourly: hourlyPattern,
            daily: dailyPattern
        };
    },

    /**
     * Cargar datos persistentes
     */
    loadPersistentData: async function() {
        try {
            if (typeof localStorage !== 'undefined') {
                const data = localStorage.getItem('justice2_smart_cache_data');
                if (data) {
                    const parsed = JSON.parse(data);
                    
                    // Cargar modelo ML
                    if (parsed.mlModel) {
                        this.state.mlModel = { ...this.state.mlModel, ...parsed.mlModel };
                    }
                    
                    // Cargar perfiles de comportamiento
                    if (parsed.behavioralProfiles) {
                        this.state.behavioralProfiles = new Map(Object.entries(parsed.behavioralProfiles));
                    }
                    
                    this.log('Datos persistentes cargados');
                }
            }
        } catch (error) {
            this.log('Error cargando datos persistentes:', error);
        }
    },

    /**
     * Guardar datos persistentes
     */
    savePersistentData: async function() {
        try {
            if (typeof localStorage !== 'undefined') {
                const data = {
                    mlModel: {
                        accuracy: this.state.mlModel.accuracy,
                        lastUpdated: this.state.mlModel.lastUpdated
                    },
                    behavioralProfiles: Object.fromEntries(this.state.behavioralProfiles),
                    timestamp: Date.now()
                };
                
                localStorage.setItem('justice2_smart_cache_data', JSON.stringify(data));
            }
        } catch (error) {
            this.log('Error guardando datos persistentes:', error);
        }
    },

    /**
     * Métodos auxiliares
     */
    isExpired: function(entry) {
        return Date.now() > entry.expiresAt;
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

    calculateComplexity: function(value) {
        if (typeof value !== 'object' || value === null) {
            return 1;
        }
        
        let complexity = 0;
        const keys = Object.keys(value);
        complexity += keys.length;
        
        for (const key of keys) {
            if (typeof value[key] === 'object') {
                complexity += this.calculateComplexity(value[key]);
            }
        }
        
        return complexity;
    },

    calculateRegularity: function(accessTimes) {
        if (!accessTimes || accessTimes.length < 2) {
            return 0;
        }
        
        const intervals = [];
        for (let i = 1; i < accessTimes.length; i++) {
            intervals.push(accessTimes[i] - accessTimes[i - 1]);
        }
        
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Regularidad: 1 = perfectamente regular, 0 = completamente irregular
        return Math.max(0, 1 - (standardDeviation / mean));
    },

    calculateTrend: function(accessTimes) {
        if (!accessTimes || accessTimes.length < 3) {
            return 'unknown';
        }
        
        // Calcular tendencia simple basada en los últimos accesos
        const recent = accessTimes.slice(-3);
        const intervals = [];
        
        for (let i = 1; i < recent.length; i++) {
            intervals.push(recent[i] - recent[i - 1]);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        if (avgInterval < 60000) { // Menos de 1 minuto
            return 'increasing';
        } else if (avgInterval > 300000) { // Más de 5 minutos
            return 'decreasing';
        } else {
            return 'stable';
        }
    },

    calculateSeasonality: function(accessTimes) {
        if (!accessTimes || accessTimes.length < 10) {
            return 'none';
        }
        
        // Analizar patrones por hora del día
        const hourlyPattern = new Array(24).fill(0);
        
        for (const time of accessTimes) {
            const hour = new Date(time).getHours();
            hourlyPattern[hour]++;
        }
        
        // Calcular varianza para determinar estacionalidad
        const mean = hourlyPattern.reduce((a, b) => a + b, 0) / 24;
        const variance = hourlyPattern.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 24;
        
        if (variance > mean * 0.5) {
            return 'daily';
        }
        
        return 'none';
    },

    evictLRU: function() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.state.cache.entries()) {
            if (entry.lastAccess < oldestTime) {
                oldestTime = entry.lastAccess;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.state.cache.delete(oldestKey);
            this.log(`Evicción LRU: ${oldestKey}`);
        }
    },

    recordHit: function() {
        this.state.statistics.hits++;
        this.state.statistics.totalRequests++;
    },

    recordMiss: function() {
        this.state.statistics.misses++;
        this.state.statistics.totalRequests++;
    },

    updatePerformanceMetrics: function(key, responseTime, wasHit) {
        // Actualizar métricas de tiempo de respuesta
        const currentAvg = this.state.statistics.averageResponseTime;
        const totalRequests = this.state.statistics.totalRequests;
        
        this.state.statistics.averageResponseTime = 
            (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
        
        // Actualizar métricas específicas de la clave
        if (!this.state.performanceMetrics.accessTimes.has(key)) {
            this.state.performanceMetrics.accessTimes.set(key, []);
        }
        
        const keyMetrics = this.state.performanceMetrics.accessTimes.get(key);
        keyMetrics.push(responseTime);
        
        // Limitar historial de métricas por clave
        if (keyMetrics.length > 100) {
            keyMetrics.splice(0, keyMetrics.length - 100);
        }
    },

    /**
     * Eliminar clave
     */
    delete: async function(key) {
        const deleted = this.state.cache.delete(key);
        
        if (deleted) {
            // Limpiar datos relacionados
            this.state.accessPatterns.delete(key);
            this.state.behavioralProfiles.delete(key);
            this.state.contextData.delete(key);
            
            this.log(`Smart Cache DELETE: ${key}`);
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
        this.state.predictions.clear();
        this.state.behavioralProfiles.clear();
        this.state.contextData.clear();
        
        // Reiniciar estadísticas
        this.state.statistics = {
            hits: 0,
            misses: 0,
            predictions: 0,
            correctPredictions: 0,
            adaptiveOperations: 0,
            compressionSavings: 0,
            intelligentEvictions: 0,
            totalRequests: 0,
            averageResponseTime: 0,
            modelAccuracy: 0
        };
        
        this.log(`Smart Cache CLEAR: ${clearedCount} entradas eliminadas`);
        return clearedCount;
    },

    /**
     * Obtener estadísticas
     */
    getStatistics: function() {
        const total = this.state.statistics.hits + this.state.statistics.misses;
        const hitRate = total > 0 ? (this.state.statistics.hits / total) * 100 : 0;
        
        const modelAccuracy = this.state.mlModel.accuracy || 0;
        this.state.statistics.modelAccuracy = modelAccuracy;
        
        return {
            ...this.state.statistics,
            hitRate: Math.round(hitRate * 100) / 100,
            cacheSize: this.state.cache.size,
            modelAccuracy: Math.round(modelAccuracy * 100) / 100,
            lastModelUpdate: this.state.mlModel.lastUpdated,
            trainingDataSize: this.state.mlModel.trainingData.length,
            behavioralProfiles: this.state.behavioralProfiles.size,
            contextDataSize: this.state.contextData.size
        };
    },

    /**
     * Obtener estado detallado
     */
    getDetailedStatus: function() {
        return {
            statistics: this.getStatistics(),
            config: this.config,
            performanceMetrics: {
                ...this.state.performanceMetrics,
                averageResponseTime: this.state.statistics.averageResponseTime
            },
            modelInfo: {
                accuracy: this.state.mlModel.accuracy,
                lastUpdated: this.state.mlModel.lastUpdated,
                trainingDataSize: this.state.mlModel.trainingData.length,
                weightsCount: this.state.mlModel.weights.size,
                biasesCount: this.state.mlModel.biases.size
            },
            cacheEntries: this.state.cache.size,
            isInitialized: this.state.isInitialized
        };
    },

    /**
     * Exportar modelo ML
     */
    exportModel: function() {
        return {
            weights: Object.fromEntries(this.state.mlModel.weights),
            biases: Object.fromEntries(this.state.mlModel.biases),
            accuracy: this.state.mlModel.accuracy,
            lastUpdated: this.state.mlModel.lastUpdated,
            trainingDataSize: this.state.mlModel.trainingData.length
        };
    },

    /**
     * Importar modelo ML
     */
    importModel: function(model) {
        if (model.weights) {
            this.state.mlModel.weights = new Map(Object.entries(model.weights));
        }
        
        if (model.biases) {
            this.state.mlModel.biases = new Map(Object.entries(model.biases));
        }
        
        if (model.accuracy !== undefined) {
            this.state.mlModel.accuracy = model.accuracy;
        }
        
        if (model.lastUpdated !== undefined) {
            this.state.mlModel.lastUpdated = model.lastUpdated;
        }
        
        this.log('Modelo ML importado correctamente');
    },

    /**
     * Logging
     */
    log: function(message, data = null) {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [SmartCache] ${message}`;
            
            if (data) {
                console.log(logEntry, data);
            } else {
                console.log(logEntry);
            }
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.SmartCache = SmartCache;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartCache;
}