/**
 * Justice 2 Distributed Cache - Caché Distribuida para Escalabilidad
 * Proporciona sincronización de caché entre múltiples instancias/nodos
 */

const DistributedCache = {
    // Configuración
    config: {
        nodeId: null,
        clusterNodes: [],
        syncInterval: 30000, // 30 segundos
        enableConflictResolution: true,
        enableConsistencyChecks: true,
        enableLoadBalancing: true,
        enableFailover: true,
        enableReplication: true,
        replicationFactor: 2,
        consistencyLevel: 'eventual', // 'strong', 'eventual', 'weak'
        conflictResolutionStrategy: 'last-write-wins', // 'last-write-wins', 'merge', 'custom'
        enableCompression: true,
        enableEncryption: true,
        encryptionKey: null,
        maxSyncRetries: 3,
        syncTimeout: 10000, // 10 segundos
        heartbeatInterval: 15000, // 15 segundos
        nodeTimeout: 45000, // 45 segundos
        enablePartitioning: true,
        partitionStrategy: 'hash', // 'hash', 'range', 'consistent-hash'
        enableMetrics: true,
        enableHealthChecks: true,
        enableAutoDiscovery: false,
        discoveryService: null,
        enableVersioning: true,
        enableTombstones: true,
        tombstoneTTL: 300000 // 5 minutos
    },

    // Estado
    state: {
        cache: new Map(),
        nodeId: null,
        clusterNodes: new Map(),
        isLeader: false,
        leaderId: null,
        syncQueue: [],
        activeSyncs: new Set(),
        nodeStatus: new Map(),
        lastSync: Date.now(),
        syncStats: {
            totalSyncs: 0,
            successfulSyncs: 0,
            failedSyncs: 0,
            conflicts: 0,
            averageSyncTime: 0,
            lastSyncTime: null
        },
        replicationMap: new Map(),
        versionMap: new Map(),
        tombstones: new Map(),
        partitionMap: new Map(),
        metrics: {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            syncs: 0,
            conflicts: 0,
            replications: 0,
            networkLatency: 0,
            throughput: 0
        },
        healthStatus: {
            isHealthy: true,
            lastHealthCheck: Date.now(),
            issues: [],
            nodeHealth: new Map()
        },
        isInitialized: false,
        lastHeartbeat: Date.now()
    },

    /**
     * Inicializar Distributed Cache
     */
    init: async function(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        
        // Generar o configurar ID de nodo
        this.state.nodeId = this.config.nodeId || this.generateNodeId();
        
        // Inicializar mapa de nodos
        await this.initializeClusterNodes();
        
        // Inicializar particionamiento si está habilitado
        if (this.config.enablePartitioning) {
            await this.initializePartitioning();
        }
        
        // Iniciar heartbeat
        this.startHeartbeat();
        
        // Iniciar sincronización periódica
        this.startSyncTimer();
        
        // Iniciar health checks
        if (this.config.enableHealthChecks) {
            this.startHealthChecks();
        }
        
        // Iniciar auto-descubrimiento si está habilitado
        if (this.config.enableAutoDiscovery) {
            await this.startAutoDiscovery();
        }
        
        // Elegir líder si no hay uno
        await this.electLeader();
        
        this.state.isInitialized = true;
        this.log(`Distributed Cache inicializado - Nodo: ${this.state.nodeId}, Líder: ${this.state.leaderId}`);
    },

    /**
     * Generar ID de nodo único
     */
    generateNodeId: function() {
        return 'node_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    },

    /**
     * Inicializar nodos del clúster
     */
    initializeClusterNodes: async function() {
        // Agregar nodo actual
        this.state.clusterNodes.set(this.state.nodeId, {
            id: this.state.nodeId,
            status: 'active',
            lastSeen: Date.now(),
            address: this.getNodeAddress(),
            load: 0,
            version: '1.0.0'
        });
        
        // Agregar nodos configurados
        for (const nodeConfig of this.config.clusterNodes) {
            this.state.clusterNodes.set(nodeConfig.id, {
                ...nodeConfig,
                status: 'unknown',
                lastSeen: null,
                load: 0
            });
        }
    },

    /**
     * Obtener dirección del nodo actual
     */
    getNodeAddress: function() {
        if (typeof window !== 'undefined') {
            return window.location.origin;
        } else if (typeof process !== 'undefined') {
            return `localhost:${process.env.PORT || 3000}`;
        }
        return 'unknown';
    },

    /**
     * Inicializar particionamiento
     */
    initializePartitioning: async function() {
        const nodeIds = Array.from(this.state.clusterNodes.keys());
        
        for (const nodeId of nodeIds) {
            this.state.partitionMap.set(nodeId, new Set());
        }
        
        // Distribuir claves existentes entre particiones
        for (const [key] of this.state.cache.entries()) {
            const targetNode = this.getPartitionNode(key);
            this.state.partitionMap.get(targetNode).add(key);
        }
    },

    /**
     * Obtener nodo para una partición
     */
    getPartitionNode: function(key) {
        const nodeIds = Array.from(this.state.clusterNodes.keys());
        
        switch (this.config.partitionStrategy) {
            case 'hash':
                const hash = this.hashKey(key);
                const index = Math.abs(hash) % nodeIds.length;
                return nodeIds[index];
                
            case 'consistent-hash':
                return this.consistentHash(key, nodeIds);
                
            case 'range':
                // Implementación simplificada de particionamiento por rango
                const keyCode = key.charCodeAt(0) || 0;
                const rangeIndex = Math.floor(keyCode / (256 / nodeIds.length));
                return nodeIds[Math.min(rangeIndex, nodeIds.length - 1)];
                
            default:
                return nodeIds[0];
        }
    },

    /**
     * Hash simple para particionamiento
     */
    hashKey: function(key) {
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            const char = key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32-bit integer
        }
        return hash;
    },

    /**
     * Hash consistente
     */
    consistentHash: function(key, nodes) {
        const ring = [];
        
        // Crear anillo hash
        for (const node of nodes) {
            for (let i = 0; i < 100; i++) { // 100 puntos virtuales por nodo
                const virtualKey = `${node}:${i}`;
                const hash = this.hashKey(virtualKey);
                ring.push({ hash, node });
            }
        }
        
        // Ordenar por hash
        ring.sort((a, b) => a.hash - b.hash);
        
        // Encontrar primer nodo mayor o igual al hash de la clave
        const keyHash = this.hashKey(key);
        
        for (const point of ring) {
            if (point.hash >= keyHash) {
                return point.node;
            }
        }
        
        // Si no se encuentra, devolver el primer nodo (circular)
        return ring[0].node;
    },

    /**
     * Obtener valor con soporte distribuido
     */
    get: async function(key, options = {}) {
        const startTime = performance.now();
        
        try {
            // Verificar si la clave pertenece a este nodo
            const targetNode = this.config.enablePartitioning ? 
                this.getPartitionNode(key) : this.state.nodeId;
            
            if (targetNode !== this.state.nodeId) {
                // Redirigir al nodo responsable
                return await this.forwardGet(targetNode, key, options);
            }
            
            // Buscar en caché local
            const cacheEntry = this.state.cache.get(key);
            
            if (!cacheEntry) {
                // Verificar si hay un tombstone
                if (this.state.tombstones.has(key)) {
                    const tombstone = this.state.tombstones.get(key);
                    if (Date.now() < tombstone.expiresAt) {
                        this.state.metrics.misses++;
                        return null; // Clave eliminada
                    } else {
                        this.state.tombstones.delete(key);
                    }
                }
                
                // Intentar obtener de otros nodos (consistencia eventual)
                if (this.config.consistencyLevel !== 'strong') {
                    const remoteValue = await this.getFromRemoteNodes(key, options);
                    if (remoteValue !== null) {
                        this.state.metrics.hits++;
                        return remoteValue;
                    }
                }
                
                this.state.metrics.misses++;
                return null;
            }
            
            // Verificar versión si está habilitado
            if (this.config.enableVersioning) {
                const currentVersion = this.state.versionMap.get(key) || 0;
                if (cacheEntry.version > currentVersion) {
                    // Actualizar versión
                    this.state.versionMap.set(key, cacheEntry.version);
                }
            }
            
            // Verificar si ha expirado
            if (this.isExpired(cacheEntry)) {
                await this.delete(key);
                this.state.metrics.misses++;
                return null;
            }
            
            // Actualizar estadísticas
            this.state.metrics.hits++;
            
            // Actualizar tiempo de acceso
            cacheEntry.lastAccess = Date.now();
            cacheEntry.accessCount++;
            
            // Actualizar métricas de rendimiento
            const endTime = performance.now();
            this.updateMetrics(endTime - startTime);
            
            this.log(`Distributed Cache HIT: ${key} (nodo: ${this.state.nodeId})`);
            
            // Desencriptar si es necesario
            let value = cacheEntry.value;
            if (this.config.enableEncryption && cacheEntry.encrypted) {
                value = await this.decryptValue(value);
            }
            
            // Descomprimir si es necesario
            if (this.config.enableCompression && cacheEntry.compressed) {
                value = await this.decompressValue(value);
            }
            
            return value;
            
        } catch (error) {
            this.log(`Error obteniendo clave ${key}:`, error);
            this.state.metrics.misses++;
            return null;
        }
    },

    /**
     * Establecer valor con soporte distribuido
     */
    set: async function(key, value, options = {}) {
        const startTime = performance.now();
        
        try {
            // Verificar si la clave pertenece a este nodo
            const targetNode = this.config.enablePartitioning ? 
                this.getPartitionNode(key) : this.state.nodeId;
            
            if (targetNode !== this.state.nodeId) {
                // Redirigir al nodo responsable
                return await this.forwardSet(targetNode, key, value, options);
            }
            
            const ttl = options.ttl || 300000; // 5 minutos por defecto
            const now = Date.now();
            let version = 1;
            
            // Obtener versión actual si está habilitado
            if (this.config.enableVersioning) {
                version = (this.state.versionMap.get(key) || 0) + 1;
                this.state.versionMap.set(key, version);
            }
            
            // Procesar valor
            let processedValue = value;
            let compressed = false;
            let encrypted = false;
            let originalSize = this.calculateSize(value);
            
            // Compresión
            if (this.config.enableCompression && originalSize > 1024) {
                const compressionResult = await this.compressValue(value);
                if (compressionResult.compressed) {
                    processedValue = compressionResult.data;
                    compressed = true;
                }
            }
            
            // Encriptación
            if (this.config.enableEncryption) {
                const encryptionResult = await this.encryptValue(processedValue);
                processedValue = encryptionResult.data;
                encrypted = true;
            }
            
            // Crear entrada de caché
            const cacheEntry = {
                key,
                value: processedValue,
                timestamp: now,
                ttl,
                expiresAt: now + ttl,
                version,
                lastAccess: now,
                accessCount: 0,
                compressed,
                encrypted,
                originalSize,
                nodeId: this.state.nodeId,
                checksum: this.calculateChecksum(processedValue),
                metadata: {
                    ...options.metadata,
                    distributed: true,
                    replicated: false,
                    syncVersion: 0
                }
            };
            
            // Almacenar en caché local
            this.state.cache.set(key, cacheEntry);
            
            // Eliminar tombstone si existe
            this.state.tombstones.delete(key);
            
            // Replicar a otros nodos si está habilitado
            if (this.config.enableReplication) {
                await this.replicateToNodes(key, cacheEntry);
            }
            
            // Agregar a cola de sincronización
            await this.queueSync(key, 'set', cacheEntry);
            
            // Actualizar estadísticas
            this.state.metrics.sets++;
            
            // Actualizar métricas de rendimiento
            const endTime = performance.now();
            this.updateMetrics(endTime - startTime);
            
            this.log(`Distributed Cache SET: ${key} (nodo: ${this.state.nodeId}, versión: ${version})`);
            
            return true;
            
        } catch (error) {
            this.log(`Error estableciendo clave ${key}:`, error);
            return false;
        }
    },

    /**
     * Eliminar clave con soporte distribuido
     */
    delete: async function(key) {
        const startTime = performance.now();
        
        try {
            // Verificar si la clave pertenece a este nodo
            const targetNode = this.config.enablePartitioning ? 
                this.getPartitionNode(key) : this.state.nodeId;
            
            if (targetNode !== this.state.nodeId) {
                // Redirigir al nodo responsable
                return await this.forwardDelete(targetNode, key);
            }
            
            const deleted = this.state.cache.delete(key);
            
            if (deleted) {
                // Crear tombstone si está habilitado
                if (this.config.enableTombstones) {
                    this.state.tombstones.set(key, {
                        timestamp: Date.now(),
                        nodeId: this.state.nodeId,
                        expiresAt: Date.now() + this.config.tombstoneTTL
                    });
                }
                
                // Eliminar versión
                if (this.config.enableVersioning) {
                    this.state.versionMap.delete(key);
                }
                
                // Replicar eliminación
                if (this.config.enableReplication) {
                    await this.replicateDeletion(key);
                }
                
                // Agregar a cola de sincronización
                await this.queueSync(key, 'delete', { nodeId: this.state.nodeId });
                
                this.state.metrics.deletes++;
                this.log(`Distributed Cache DELETE: ${key} (nodo: ${this.state.nodeId})`);
            }
            
            const endTime = performance.now();
            this.updateMetrics(endTime - startTime);
            
            return deleted;
            
        } catch (error) {
            this.log(`Error eliminando clave ${key}:`, error);
            return false;
        }
    },

    /**
     * Replicar a otros nodos
     */
    replicateToNodes: async function(key, cacheEntry) {
        if (!this.config.enableReplication) {
            return;
        }
        
        const replicationNodes = this.selectReplicationNodes(key);
        const replicationPromises = [];
        
        for (const nodeId of replicationNodes) {
            const promise = this.replicateToNode(nodeId, key, cacheEntry);
            replicationPromises.push(promise);
        }
        
        try {
            const results = await Promise.allSettled(replicationPromises);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            
            // Actualizar mapa de replicación
            this.state.replicationMap.set(key, {
                nodes: replicationNodes,
                successfulReplications: successful,
                timestamp: Date.now()
            });
            
            this.state.metrics.replications += successful;
            
        } catch (error) {
            this.log('Error en replicación:', error);
        }
    },

    /**
     * Seleccionar nodos para replicación
     */
    selectReplicationNodes: function(key) {
        const availableNodes = Array.from(this.state.clusterNodes.keys())
            .filter(nodeId => nodeId !== this.state.nodeId)
            .filter(nodeId => {
                const node = this.state.clusterNodes.get(nodeId);
                return node && node.status === 'active';
            });
        
        if (availableNodes.length === 0) {
            return [];
        }
        
        // Seleccionar nodos basados en factor de replicación
        const replicationCount = Math.min(this.config.replicationFactor, availableNodes.length);
        
        // Estrategia simple: seleccionar los primeros N nodos
        // En producción, usar estrategia más sofisticada (distancia, carga, etc.)
        return availableNodes.slice(0, replicationCount);
    },

    /**
     * Replicar a un nodo específico
     */
    replicateToNode: async function(nodeId, key, cacheEntry) {
        try {
            const node = this.state.clusterNodes.get(nodeId);
            if (!node || node.status !== 'active') {
                throw new Error(`Nodo ${nodeId} no disponible`);
            }
            
            // Simular replicación (en producción, sería una llamada real de red)
            const replicationData = {
                operation: 'replicate',
                key,
                cacheEntry,
                sourceNode: this.state.nodeId,
                timestamp: Date.now()
            };
            
            // Simular latencia de red
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
            
            this.log(`Replicación exitosa: ${key} -> ${nodeId}`);
            return true;
            
        } catch (error) {
            this.log(`Error replicando ${key} a ${nodeId}:`, error);
            return false;
        }
    },

    /**
     * Replicar eliminación
     */
    replicateDeletion: async function(key) {
        const replicationNodes = this.selectReplicationNodes(key);
        const replicationPromises = [];
        
        for (const nodeId of replicationNodes) {
            const promise = this.replicateDeletionToNode(nodeId, key);
            replicationPromises.push(promise);
        }
        
        try {
            await Promise.allSettled(replicationPromises);
        } catch (error) {
            this.log('Error replicando eliminación:', error);
        }
    },

    /**
     * Replicar eliminación a un nodo específico
     */
    replicateDeletionToNode: async function(nodeId, key) {
        try {
            const node = this.state.clusterNodes.get(nodeId);
            if (!node || node.status !== 'active') {
                throw new Error(`Nodo ${nodeId} no disponible`);
            }
            
            const deletionData = {
                operation: 'delete',
                key,
                sourceNode: this.state.nodeId,
                timestamp: Date.now()
            };
            
            // Simular latencia de red
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
            
            this.log(`Eliminación replicada: ${key} -> ${nodeId}`);
            return true;
            
        } catch (error) {
            this.log(`Error replicando eliminación ${key} a ${nodeId}:`, error);
            return false;
        }
    },

    /**
     * Agregar a cola de sincronización
     */
    queueSync: async function(key, operation, data) {
        const syncItem = {
            key,
            operation,
            data,
            timestamp: Date.now(),
            nodeId: this.state.nodeId,
            retries: 0,
            version: this.state.versionMap.get(key) || 0
        };
        
        this.state.syncQueue.push(syncItem);
        
        // Limitar tamaño de cola
        if (this.state.syncQueue.length > 1000) {
            this.state.syncQueue = this.state.syncQueue.slice(-500);
        }
    },

    /**
     * Procesar cola de sincronización
     */
    processSyncQueue: async function() {
        if (this.state.syncQueue.length === 0) {
            return;
        }
        
        const syncItems = this.state.syncQueue.splice(0, 10); // Procesar en lotes de 10
        
        for (const syncItem of syncItems) {
            if (this.state.activeSyncs.has(syncItem.key)) {
                continue; // Ya se está sincronizando
            }
            
            this.state.activeSyncs.add(syncItem.key);
            
            try {
                await this.syncToNodes(syncItem);
                this.state.syncStats.successfulSyncs++;
            } catch (error) {
                this.log(`Error sincronizando ${syncItem.key}:`, error);
                this.state.syncStats.failedSyncs++;
                
                // Reintentar si no excede el máximo
                if (syncItem.retries < this.config.maxSyncRetries) {
                    syncItem.retries++;
                    this.state.syncQueue.push(syncItem);
                }
            } finally {
                this.state.activeSyncs.delete(syncItem.key);
            }
        }
        
        this.state.lastSync = Date.now();
        this.state.syncStats.totalSyncs++;
    },

    /**
     * Sincronizar con otros nodos
     */
    syncToNodes: async function(syncItem) {
        const startTime = performance.now();
        const targetNodes = this.getSyncTargetNodes(syncItem.key);
        
        const syncPromises = targetNodes.map(nodeId => 
            this.syncToNode(nodeId, syncItem)
        );
        
        const results = await Promise.allSettled(syncPromises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        // Detectar conflictos
        const conflicts = results.filter(r => 
            r.status === 'rejected' && 
            r.reason.message.includes('conflict')
        ).length;
        
        if (conflicts > 0 && this.config.enableConflictResolution) {
            await this.resolveConflicts(syncItem.key, conflicts);
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Actualizar estadísticas
        this.updateSyncStats(duration, conflicts);
        
        this.log(`Sincronización completada: ${syncItem.key} (${successful}/${targetNodes.length} exitosos)`);
    },

    /**
     * Obtener nodos objetivo para sincronización
     */
    getSyncTargetNodes: function(key) {
        return Array.from(this.state.clusterNodes.keys())
            .filter(nodeId => nodeId !== this.state.nodeId)
            .filter(nodeId => {
                const node = this.state.clusterNodes.get(nodeId);
                return node && node.status === 'active';
            });
    },

    /**
     * Sincronizar con un nodo específico
     */
    syncToNode: async function(nodeId, syncItem) {
        try {
            const node = this.state.clusterNodes.get(nodeId);
            if (!node || node.status !== 'active') {
                throw new Error(`Nodo ${nodeId} no disponible`);
            }
            
            // Simular sincronización (en producción, sería una llamada real de red)
            const syncData = {
                ...syncItem,
                targetNode: nodeId,
                syncId: this.generateSyncId()
            };
            
            // Simular latencia de red
            await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
            
            // Simular posible conflicto
            if (Math.random() < 0.1) { // 10% de probabilidad de conflicto
                throw new Error('conflict: Version mismatch detected');
            }
            
            this.log(`Sincronización exitosa: ${syncItem.key} -> ${nodeId}`);
            return true;
            
        } catch (error) {
            this.log(`Error sincronizando ${syncItem.key} a ${nodeId}:`, error);
            throw error;
        }
    },

    /**
     * Resolver conflictos
     */
    resolveConflicts: async function(key, conflictCount) {
        this.state.syncStats.conflicts += conflictCount;
        
        switch (this.config.conflictResolutionStrategy) {
            case 'last-write-wins':
                await this.resolveLastWriteWins(key);
                break;
                
            case 'merge':
                await this.resolveMerge(key);
                break;
                
            case 'custom':
                await this.resolveCustom(key);
                break;
                
            default:
                this.log(`Estrategia de resolución de conflictos no implementada: ${this.config.conflictResolutionStrategy}`);
        }
    },

    /**
     * Resolver con last-write-wins
     */
    resolveLastWriteWins: async function(key) {
        const localEntry = this.state.cache.get(key);
        if (!localEntry) return;
        
        // Obtener versiones de otros nodos
        const remoteVersions = await this.getRemoteVersions(key);
        
        // Encontrar la versión más reciente
        let latestEntry = localEntry;
        let latestTimestamp = localEntry.timestamp;
        
        for (const remoteEntry of remoteVersions) {
            if (remoteEntry.timestamp > latestTimestamp) {
                latestEntry = remoteEntry;
                latestTimestamp = remoteEntry.timestamp;
            }
        }
        
        // Si la versión local no es la más reciente, actualizarla
        if (latestEntry !== localEntry) {
            this.state.cache.set(key, latestEntry);
            this.log(`Conflicto resuelto (last-write-wins): ${key}`);
        }
    },

    /**
     * Resolver con merge
     */
    resolveMerge: async function(key) {
        // Implementación simplificada de merge
        const localEntry = this.state.cache.get(key);
        if (!localEntry) return;
        
        this.log(`Conflicto resuelto (merge): ${key}`);
    },

    /**
     * Resolver con estrategia personalizada
     */
    resolveCustom: async function(key) {
        // Implementación personalizada basada en requisitos específicos
        this.log(`Conflicto resuelto (custom): ${key}`);
    },

    /**
     * Obtener versiones remotas
     */
    getRemoteVersions: async function(key) {
        const versions = [];
        const targetNodes = this.getSyncTargetNodes(key);
        
        for (const nodeId of targetNodes) {
            try {
                const version = await this.getVersionFromNode(nodeId, key);
                if (version) {
                    versions.push(version);
                }
            } catch (error) {
                this.log(`Error obteniendo versión de ${nodeId}:`, error);
            }
        }
        
        return versions;
    },

    /**
     * Obtener versión de un nodo específico
     */
    getVersionFromNode: async function(nodeId, key) {
        // Simulación - en producción sería una llamada real de red
        return {
            key,
            timestamp: Date.now() - Math.random() * 10000,
            version: Math.floor(Math.random() * 10),
            nodeId
        };
    },

    /**
     * Redirigir GET a otro nodo
     */
    forwardGet: async function(nodeId, key, options) {
        try {
            const node = this.state.clusterNodes.get(nodeId);
            if (!node || node.status !== 'active') {
                throw new Error(`Nodo ${nodeId} no disponible`);
            }
            
            // Simular llamada de red
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
            
            // Simular respuesta
            return { key, value: `forwarded_value_${key}`, nodeId };
            
        } catch (error) {
            this.log(`Error redirigiendo GET a ${nodeId}:`, error);
            return null;
        }
    },

    /**
     * Redirigir SET a otro nodo
     */
    forwardSet: async function(nodeId, key, value, options) {
        try {
            const node = this.state.clusterNodes.get(nodeId);
            if (!node || node.status !== 'active') {
                throw new Error(`Nodo ${nodeId} no disponible`);
            }
            
            // Simular llamada de red
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
            
            this.log(`SET redirigido: ${key} -> ${nodeId}`);
            return true;
            
        } catch (error) {
            this.log(`Error redirigiendo SET a ${nodeId}:`, error);
            return false;
        }
    },

    /**
     * Redirigir DELETE a otro nodo
     */
    forwardDelete: async function(nodeId, key) {
        try {
            const node = this.state.clusterNodes.get(nodeId);
            if (!node || node.status !== 'active') {
                throw new Error(`Nodo ${nodeId} no disponible`);
            }
            
            // Simular llamada de red
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
            
            this.log(`DELETE redirigido: ${key} -> ${nodeId}`);
            return true;
            
        } catch (error) {
            this.log(`Error redirigiendo DELETE a ${nodeId}:`, error);
            return false;
        }
    },

    /**
     * Obtener de nodos remotos
     */
    getFromRemoteNodes: async function(key, options) {
        const targetNodes = this.getSyncTargetNodes(key);
        
        for (const nodeId of targetNodes) {
            try {
                const value = await this.forwardGet(nodeId, key, options);
                if (value !== null) {
                    // Almacenar localmente para futuros accesos
                    await this.set(key, value.value, {
                        ...options,
                        ttl: options.ttl || 300000,
                        metadata: { ...options.metadata, remoteSource: nodeId }
                    });
                    return value.value;
                }
            } catch (error) {
                this.log(`Error obteniendo ${key} de ${nodeId}:`, error);
            }
        }
        
        return null;
    },

    /**
     * Elegir líder del clúster
     */
    electLeader: async function() {
        if (this.state.leaderId && this.state.clusterNodes.has(this.state.leaderId)) {
            const leader = this.state.clusterNodes.get(this.state.leaderId);
            if (leader.status === 'active') {
                return; // Líder actual sigue activo
            }
        }
        
        // Algoritmo simple de elección: el nodo con ID más bajo es el líder
        const activeNodes = Array.from(this.state.clusterNodes.entries())
            .filter(([_, node]) => node.status === 'active')
            .map(([id, _]) => id)
            .sort();
        
        if (activeNodes.length > 0) {
            this.state.leaderId = activeNodes[0];
            this.state.isLeader = (this.state.leaderId === this.state.nodeId);
            
            this.log(`Nuevo líder elegido: ${this.state.leaderId}`);
        }
    },

    /**
     * Iniciar heartbeat
     */
    startHeartbeat: function() {
        setInterval(async () => {
            await this.sendHeartbeat();
            await this.checkNodeHealth();
        }, this.config.heartbeatInterval);
    },

    /**
     * Enviar heartbeat
     */
    sendHeartbeat: async function() {
        const heartbeat = {
            nodeId: this.state.nodeId,
            timestamp: Date.now(),
            status: 'active',
            load: this.calculateNodeLoad(),
            version: '1.0.0'
        };
        
        // Actualizar propio estado
        const currentNode = this.state.clusterNodes.get(this.state.nodeId);
        if (currentNode) {
            Object.assign(currentNode, heartbeat);
        }
        
        // Enviar a otros nodos (simulado)
        this.state.lastHeartbeat = Date.now();
    },

    /**
     * Verificar salud de nodos
     */
    checkNodeHealth: async function() {
        const now = Date.now();
        
        for (const [nodeId, node] of this.state.clusterNodes.entries()) {
            if (nodeId === this.state.nodeId) continue;
            
            const timeSinceLastSeen = now - (node.lastSeen || 0);
            
            if (timeSinceLastSeen > this.config.nodeTimeout) {
                // Marcar nodo como inactivo
                node.status = 'inactive';
                this.log(`Nodo ${nodeId} marcado como inactivo`);
                
                // Si era el líder, elegir nuevo líder
                if (nodeId === this.state.leaderId) {
                    await this.electLeader();
                }
            }
        }
    },

    /**
     * Calcular carga del nodo
     */
    calculateNodeLoad: function() {
        const cacheSize = this.state.cache.size;
        const activeSyncs = this.state.activeSyncs.size;
        const queueSize = this.state.syncQueue.length;
        
        // Carga normalizada (0-1)
        const cacheLoad = Math.min(1, cacheSize / 1000);
        const syncLoad = Math.min(1, activeSyncs / 10);
        const queueLoad = Math.min(1, queueSize / 100);
        
        return (cacheLoad + syncLoad + queueLoad) / 3;
    },

    /**
     * Iniciar timer de sincronización
     */
    startSyncTimer: function() {
        setInterval(async () => {
            await this.processSyncQueue();
            await this.cleanupTombstones();
        }, this.config.syncInterval);
    },

    /**
     * Iniciar health checks
     */
    startHealthChecks: function() {
        setInterval(async () => {
            await this.performHealthCheck();
        }, 60000); // Cada minuto
    },

    /**
     * Realizar health check
     */
    performHealthCheck: async function() {
        const issues = [];
        
        // Verificar memoria
        if (this.state.cache.size > 10000) {
            issues.push('Alta utilización de caché');
        }
        
        // Verificar sincronización
        if (Date.now() - this.state.lastSync > this.config.syncInterval * 3) {
            issues.push('Sincronización retrasada');
        }
        
        // Verificar cola de sincronización
        if (this.state.syncQueue.length > 100) {
            issues.push('Cola de sincronización saturada');
        }
        
        // Verificar conectividad del clúster
        const activeNodes = Array.from(this.state.clusterNodes.values())
            .filter(node => node.status === 'active').length;
        
        if (activeNodes < this.config.clusterNodes.length * 0.5) {
            issues.push('Baja conectividad del clúster');
        }
        
        // Actualizar estado de salud
        this.state.healthStatus = {
            isHealthy: issues.length === 0,
            lastHealthCheck: Date.now(),
            issues,
            nodeHealth: new Map(this.state.clusterNodes)
        };
        
        if (issues.length > 0) {
            this.log('Health check detectó problemas:', issues);
        }
    },

    /**
     * Iniciar auto-descubrimiento
     */
    startAutoDiscovery: async function() {
        if (!this.config.enableAutoDiscovery || !this.config.discoveryService) {
            return;
        }
        
        // Implementación simplificada de auto-descubrimiento
        setInterval(async () => {
            await this.discoverNodes();
        }, 60000); // Cada minuto
    },

    /**
     * Descubrir nodos
     */
    discoverNodes: async function() {
        // Simulación - en producción usaría un servicio real de descubrimiento
        this.log('Auto-descubrimiento de nodos (simulado)');
    },

    /**
     * Limpiar tombstones expirados
     */
    cleanupTombstones: async function() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, tombstone] of this.state.tombstones.entries()) {
            if (now > tombstone.expiresAt) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => {
            this.state.tombstones.delete(key);
        });
        
        if (expiredKeys.length > 0) {
            this.log(`Limpiados ${expiredKeys.length} tombstones expirados`);
        }
    },

    /**
     * Métodos de utilidad
     */
    generateSyncId: function() {
        return 'sync_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    },

    calculateChecksum: function(data) {
        // Checksum simple
        let hash = 0;
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
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
        
        return 8;
    },

    isExpired: function(entry) {
        return Date.now() > entry.expiresAt;
    },

    updateMetrics: function(responseTime) {
        this.metrics.networkLatency = 
            (this.metrics.networkLatency + responseTime) / 2;
        
        this.metrics.throughput = 
            (this.metrics.hits + this.metrics.misses) / (Date.now() / 1000);
    },

    updateSyncStats: function(duration, conflicts) {
        const stats = this.state.syncStats;
        const totalDuration = stats.averageSyncTime * (stats.totalSyncs - 1) + duration;
        stats.averageSyncTime = totalDuration / stats.totalSyncs;
        stats.lastSyncTime = Date.now();
    },

    /**
     * Compresión y encriptación
     */
    compressValue: async function(value) {
        try {
            const jsonString = typeof value === 'string' ? value : JSON.stringify(value);
            
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
                
                return {
                    compressed: true,
                    data: compressed,
                    originalSize: jsonString.length,
                    compressedSize: compressed.length
                };
            }
            
            return { compressed: false, data: value };
            
        } catch (error) {
            this.log('Error en compresión:', error);
            return { compressed: false, data: value };
        }
    },

    decompressValue: async function(data) {
        try {
            if (typeof DecompressionStream !== 'undefined' && data instanceof Uint8Array) {
                const stream = new DecompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                writer.write(data);
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
                
                const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
                let offset = 0;
                for (const chunk of chunks) {
                    decompressed.set(chunk, offset);
                    offset += chunk.length;
                }
                
                const decoder = new TextDecoder();
                return JSON.parse(decoder.decode(decompressed));
            }
            
            return data;
            
        } catch (error) {
            this.log('Error en descompresión:', error);
            return data;
        }
    },

    encryptValue: async function(value) {
        // Implementación simplificada - en producción usar algoritmos criptográficos robustos
        try {
            const jsonString = typeof value === 'string' ? value : JSON.stringify(value);
            const key = this.config.encryptionKey || 'default_key';
            
            // Simulación de encriptación
            const encrypted = btoa(jsonString + ':' + key);
            
            return {
                encrypted: true,
                data: encrypted
            };
            
        } catch (error) {
            this.log('Error en encriptación:', error);
            return { encrypted: false, data: value };
        }
    },

    decryptValue: async function(data) {
        try {
            const key = this.config.encryptionKey || 'default_key';
            
            // Simulación de desencriptación
            const decrypted = atob(data);
            const [value, usedKey] = decrypted.split(':');
            
            if (usedKey !== key) {
                throw new Error('Clave de encriptación inválida');
            }
            
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
            
        } catch (error) {
            this.log('Error en desencriptación:', error);
            return data;
        }
    },

    /**
     * Limpiar caché
     */
    clear: async function() {
        const clearedCount = this.state.cache.size;
        
        this.state.cache.clear();
        this.state.versionMap.clear();
        this.state.tombstones.clear();
        this.state.syncQueue = [];
        this.state.replicationMap.clear();
        
        // Reiniciar estadísticas
        this.state.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            syncs: 0,
            conflicts: 0,
            replications: 0,
            networkLatency: 0,
            throughput: 0
        };
        
        this.log(`Distributed Cache CLEAR: ${clearedCount} entradas eliminadas`);
        return clearedCount;
    },

    /**
     * Obtener estadísticas
     */
    getStatistics: function() {
        const hitRate = this.state.metrics.hits + this.state.metrics.misses > 0 ? 
            (this.state.metrics.hits / (this.state.metrics.hits + this.state.metrics.misses)) * 100 : 0;
        
        return {
            nodeId: this.state.nodeId,
            isLeader: this.state.isLeader,
            leaderId: this.state.leaderId,
            clusterSize: this.state.clusterNodes.size,
            activeNodes: Array.from(this.state.clusterNodes.values())
                .filter(node => node.status === 'active').length,
            cacheSize: this.state.cache.size,
            hitRate: Math.round(hitRate * 100) / 100,
            metrics: this.state.metrics,
            syncStats: this.state.syncStats,
            healthStatus: this.state.healthStatus,
            lastSync: this.state.lastSync,
            lastHeartbeat: this.state.lastHeartbeat
        };
    },

    /**
     * Obtener estado detallado
     */
    getDetailedStatus: function() {
        return {
            statistics: this.getStatistics(),
            config: this.config,
            clusterNodes: Array.from(this.state.clusterNodes.entries()),
            syncQueue: this.state.syncQueue.slice(-10),
            activeSyncs: Array.from(this.state.activeSyncs),
            replicationMap: Object.fromEntries(this.state.replicationMap),
            versionMap: Object.fromEntries(this.state.versionMap),
            tombstones: Object.fromEntries(this.state.tombstones),
            partitionMap: Object.fromEntries(
                Array.from(this.state.partitionMap.entries())
                    .map(([key, value]) => [key, Array.from(value)])
            ),
            isInitialized: this.state.isInitialized
        };
    },

    /**
     * Exportar configuración del clúster
     */
    exportClusterConfig: function() {
        return {
            nodeId: this.state.nodeId,
            clusterNodes: Array.from(this.state.clusterNodes.values()),
            leaderId: this.state.leaderId,
            isLeader: this.state.isLeader,
            config: this.config,
            timestamp: Date.now()
        };
    },

    /**
     * Importar configuración del clúster
     */
    importClusterConfig: function(config) {
        if (config.clusterNodes) {
            this.state.clusterNodes.clear();
            config.clusterNodes.forEach(node => {
                this.state.clusterNodes.set(node.id, node);
            });
        }
        
        if (config.leaderId) {
            this.state.leaderId = config.leaderId;
            this.state.isLeader = (config.leaderId === this.state.nodeId);
        }
        
        if (config.config) {
            Object.assign(this.config, config.config);
        }
        
        this.log('Configuración del clúster importada');
    },

    /**
     * Logging
     */
    log: function(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [DistributedCache:${this.state.nodeId}] ${message}`;
        
        if (data) {
            console.log(logEntry, data);
        } else {
            console.log(logEntry);
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.DistributedCache = DistributedCache;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = DistributedCache;
}