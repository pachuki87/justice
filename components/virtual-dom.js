/**
 * Justice 2 Virtual DOM
 * Sistema de Virtual DOM eficiente con algoritmos de diffing optimizados
 * Proporciona renderizado declarativo y actualizaciones eficientes del DOM
 */

const VirtualDOM = {
    // Configuración
    config: {
        enableDiffing: true,
        enablePatching: true,
        enableKeyedLists: true,
        enableEventDelegation: true,
        enableAsyncRendering: true,
        maxDiffTime: 16, // ms para 60fps
        enableOptimizations: true,
        enableProfiling: false,
        enableMetrics: true,
        batchSize: 100,
        enableVirtualScrolling: true,
        enableComponentMemoization: true
    },

    // Estado
    state: {
        isInitialized: false,
        virtualTree: null,
        realDOM: null,
        componentRegistry: new Map(),
        eventListeners: new Map(),
        diffMetrics: {
            totalDiffs: 0,
            averageDiffTime: 0,
            maxDiffTime: 0,
            patchesApplied: 0,
            nodesCompared: 0,
            nodesSkipped: 0,
            optimizationsApplied: 0
        },
        renderQueue: [],
        patchQueue: [],
        optimizationCache: new Map(),
        componentCache: new Map(),
        memoizedNodes: new Map(),
        keyRegistry: new Map(),
        performanceMetrics: {
            renderStartTime: 0,
            diffStartTime: 0,
            patchStartTime: 0,
            totalRenderTime: 0,
            totalDiffTime: 0,
            totalPatchTime: 0
        }
    },

    /**
     * Inicializar Virtual DOM
     */
    init: async function(customConfig = {}) {
        if (this.state.isInitialized) return;

        this.config = { ...this.config, ...customConfig };
        
        // Inicializar DOM real
        this.state.realDOM = document;
        
        // Inicializar sistemas de optimización
        await this.initializeDiffing();
        await this.initializePatching();
        await this.initializeEventDelegation();
        await this.initializeOptimizationCache();
        
        this.state.isInitialized = true;
        this.log('Virtual DOM inicializado con diffing optimizado');
    },

    /**
     * Inicializar sistema de diffing
     */
    initializeDiffing: async function() {
        if (!this.config.enableDiffing) return;

        this.log('Sistema de diffing inicializado');
    },

    /**
     * Inicializar sistema de patching
     */
    initializePatching: async function() {
        if (!this.config.enablePatching) return;

        this.log('Sistema de patching inicializado');
    },

    /**
     * Inicializar delegación de eventos
     */
    initializeEventDelegation: async function() {
        if (!this.config.enableEventDelegation) return;

        this.setupEventDelegation();
        this.log('Delegación de eventos inicializada');
    },

    /**
     * Inicializar caché de optimización
     */
    initializeOptimizationCache: async function() {
        if (!this.config.enableOptimizations) return;

        this.state.optimizationCache = new Map();
        this.state.componentCache = new Map();
        this.state.memoizedNodes = new Map();
        
        this.log('Caché de optimización inicializada');
    },

    /**
     * Crear nodo virtual
     */
    createElement: function(type, props = {}, children = []) {
        const node = {
            type,
            props: { ...props },
            children: Array.isArray(children) ? children : [children],
            key: props.key || null,
            ref: props.ref || null,
            _virtualDOM: true,
            _id: this.generateNodeId(),
            _created: Date.now(),
            _updated: Date.now()
        };

        // Procesar hijos especiales
        if (children && children.length === 1 && typeof children[0] === 'string') {
            node.children = children[0];
        }

        return node;
    },

    /**
     * Generar ID único para nodo
     */
    generateNodeId: function() {
        return `vnode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Renderizar nodo virtual al DOM
     */
    render: async function(virtualNode, container) {
        if (!this.state.isInitialized) {
            await this.init();
        }

        const startTime = performance.now();
        this.state.performanceMetrics.renderStartTime = startTime;

        try {
            // Si es el primer render, crear el árbol virtual
            if (!this.state.virtualTree) {
                const realNode = await this.createRealNode(virtualNode);
                container.appendChild(realNode);
                this.state.virtualTree = virtualNode;
                
                // Configurar eventos si hay delegación
                if (this.config.enableEventDelegation) {
                    this.attachEventListeners(container);
                }
                
                return realNode;
            }

            // Para renders subsiguientes, hacer diffing
            if (this.config.enableDiffing) {
                const patches = await this.diff(this.state.virtualTree, virtualNode);
                
                if (this.config.enablePatching && patches.length > 0) {
                    await this.patch(container, patches);
                }
                
                this.state.virtualTree = virtualNode;
            } else {
                // Fallback: reemplazar completamente
                container.innerHTML = '';
                const realNode = await this.createRealNode(virtualNode);
                container.appendChild(realNode);
                this.state.virtualTree = virtualNode;
            }

            const renderTime = performance.now() - startTime;
            this.state.performanceMetrics.totalRenderTime += renderTime;
            
            return container.firstChild;

        } catch (error) {
            this.log('Error en renderizado:', error);
            throw error;
        }
    },

    /**
     * Crear nodo real desde nodo virtual
     */
    createRealNode: async function(virtualNode) {
        if (typeof virtualNode === 'string' || typeof virtualNode === 'number') {
            return this.state.realDOM.createTextNode(virtualNode);
        }

        if (!virtualNode || !virtualNode._virtualDOM) {
            return this.state.realDOM.createTextNode('');
        }

        let realNode;

        // Crear elemento basado en el tipo
        if (typeof virtualNode.type === 'string') {
            realNode = this.state.realDOM.createElement(virtualNode.type);
            
            // Aplicar props
            await this.applyProps(realNode, virtualNode.props);
            
            // Aplicar hijos
            if (virtualNode.children) {
                const children = Array.isArray(virtualNode.children) 
                    ? virtualNode.children 
                    : [virtualNode.children];
                
                for (const child of children) {
                    const realChild = await this.createRealNode(child);
                    realNode.appendChild(realChild);
                }
            }
        } else if (typeof virtualNode.type === 'function') {
            // Componente funcional
            const componentResult = virtualNode.type(virtualNode.props);
            realNode = await this.createRealNode(componentResult);
        }

        // Aplicar ref si existe
        if (virtualNode.ref && typeof virtualNode.ref === 'function') {
            virtualNode.ref(realNode);
        }

        return realNode;
    },

    /**
     * Aplicar props a nodo real
     */
    applyProps: async function(realNode, props) {
        for (const [propName, propValue] of Object.entries(props)) {
            if (propName === 'key' || propName === 'ref') continue;
            
            if (propName.startsWith('on') && typeof propValue === 'function') {
                // Event handler
                const eventName = propName.toLowerCase().substring(2);
                this.addEventListener(realNode, eventName, propValue);
            } else if (propName === 'className') {
                realNode.setAttribute('class', propValue);
            } else if (propName === 'style' && typeof propValue === 'object') {
                Object.assign(realNode.style, propValue);
            } else if (propName in realNode) {
                realNode[propName] = propValue;
            } else {
                realNode.setAttribute(propName, propValue);
            }
        }
    },

    /**
     * Algoritmo de diffing optimizado
     */
    diff: async function(oldNode, newNode) {
        const startTime = performance.now();
        this.state.performanceMetrics.diffStartTime = startTime;

        const patches = [];
        await this.diffNode(oldNode, newNode, patches, []);

        const diffTime = performance.now() - startTime;
        this.updateDiffMetrics(diffTime, patches.length);

        return patches;
    },

    /**
     * Diff de nodos recursivo
     */
    diffNode: async function(oldNode, newNode, patches, path) {
        // Incrementar contador de nodos comparados
        this.state.diffMetrics.nodesCompared++;

        // Caso 1: Ambos son null/undefined
        if (!oldNode && !newNode) return;

        // Caso 2: Nodo nuevo se agregó
        if (!oldNode && newNode) {
            patches.push({
                type: 'CREATE',
                node: newNode,
                path: [...path]
            });
            return;
        }

        // Caso 3: Nodo antiguo se eliminó
        if (oldNode && !newNode) {
            patches.push({
                type: 'REMOVE',
                path: [...path]
            });
            return;
        }

        // Caso 4: Nodos de diferente tipo
        if (this.getNodeType(oldNode) !== this.getNodeType(newNode)) {
            patches.push({
                type: 'REPLACE',
                oldNode,
                newNode,
                path: [...path]
            });
            return;
        }

        // Caso 5: Nodos de texto
        if (typeof oldNode === 'string' || typeof oldNode === 'number') {
            if (oldNode !== newNode) {
                patches.push({
                    type: 'TEXT',
                    value: newNode,
                    path: [...path]
                });
            }
            return;
        }

        // Caso 6: Componentes
        if (typeof oldNode.type === 'function' || typeof newNode.type === 'function') {
            await this.diffComponents(oldNode, newNode, patches, path);
            return;
        }

        // Caso 7: Elementos DOM - comparar props
        await this.diffProps(oldNode, newNode, patches, path);

        // Caso 8: Comparar hijos con optimización
        await this.diffChildren(oldNode, newNode, patches, path);
    },

    /**
     * Obtener tipo de nodo
     */
    getNodeType: function(node) {
        if (!node) return 'null';
        if (typeof node === 'string' || typeof node === 'number') return 'text';
        if (typeof node.type === 'function') return 'component';
        return 'element';
    },

    /**
     * Diff de componentes
     */
    diffComponents: async function(oldNode, newNode, patches, path) {
        // Si el tipo de componente cambió, reemplazar completamente
        if (oldNode.type !== newNode.type) {
            patches.push({
                type: 'REPLACE',
                oldNode,
                newNode,
                path: [...path]
            });
            return;
        }

        // Renderizar componente con nuevas props
        const oldResult = typeof oldNode.type === 'function' 
            ? oldNode.type(oldNode.props) 
            : oldNode;
        const newResult = typeof newNode.type === 'function' 
            ? newNode.type(newNode.props) 
            : newNode;

        // Diff de los resultados
        await this.diffNode(oldResult, newResult, patches, path);
    },

    /**
     * Diff de props
     */
    diffProps: async function(oldNode, newNode, patches, path) {
        const oldProps = oldNode.props || {};
        const newProps = newNode.props || {};

        // Props eliminadas o cambiadas
        for (const propName of Object.keys(oldProps)) {
            if (!(propName in newProps)) {
                patches.push({
                    type: 'REMOVE_PROP',
                    propName,
                    path: [...path]
                });
            } else if (oldProps[propName] !== newProps[propName]) {
                patches.push({
                    type: 'SET_PROP',
                    propName,
                    propValue: newProps[propName],
                    path: [...path]
                });
            }
        }

        // Props nuevas
        for (const propName of Object.keys(newProps)) {
            if (!(propName in oldProps)) {
                patches.push({
                    type: 'SET_PROP',
                    propName,
                    propValue: newProps[propName],
                    path: [...path]
                });
            }
        }
    },

    /**
     * Diff de hijos con algoritmo optimizado
     */
    diffChildren: async function(oldNode, newNode, patches, path) {
        const oldChildren = this.normalizeChildren(oldNode.children);
        const newChildren = this.normalizeChildren(newNode.children);

        // Estrategia 1: Si no hay keys, usar algoritmo simple
        if (!this.config.enableKeyedLists || !this.hasKeys(oldChildren) && !this.hasKeys(newChildren)) {
            await this.diffChildrenSimple(oldChildren, newChildren, patches, path);
            return;
        }

        // Estrategia 2: Usar algoritmo con keys (más eficiente)
        await this.diffChildrenKeyed(oldChildren, newChildren, patches, path);
    },

    /**
     * Normalizar hijos
     */
    normalizeChildren: function(children) {
        if (!children) return [];
        if (typeof children === 'string' || typeof children === 'number') {
            return [children];
        }
        if (!Array.isArray(children)) {
            return [children];
        }
        return children.filter(child => child != null);
    },

    /**
     * Verificar si hay keys en los hijos
     */
    hasKeys: function(children) {
        return children.some(child => 
            child && child.props && child.props.key != null
        );
    },

    /**
     * Diff simple de hijos (sin keys)
     */
    diffChildrenSimple: async function(oldChildren, newChildren, patches, path) {
        const maxLength = Math.max(oldChildren.length, newChildren.length);

        for (let i = 0; i < maxLength; i++) {
            const oldChild = oldChildren[i];
            const newChild = newChildren[i];
            
            await this.diffNode(oldChild, newChild, patches, [...path, i]);
        }
    },

    /**
     * Diff de hijos con keys (algoritmo optimizado)
     */
    diffChildrenKeyed: async function(oldChildren, newChildren, patches, path) {
        // Crear mapa de hijos antiguos por key
        const oldChildrenByKey = new Map();
        oldChildren.forEach((child, index) => {
            const key = child && child.props ? child.props.key : null;
            if (key != null) {
                oldChildrenByKey.set(key, { child, index });
            }
        });

        // Crear mapa de hijos nuevos por key
        const newChildrenByKey = new Map();
        newChildren.forEach((child, index) => {
            const key = child && child.props ? child.props.key : null;
            if (key != null) {
                newChildrenByKey.set(key, { child, index });
            }
        });

        // Encontrar operaciones mínimas
        const operations = this.calculateMinimalOperations(oldChildren, newChildren, oldChildrenByKey, newChildrenByKey);
        
        // Aplicar operaciones como patches
        for (const operation of operations) {
            patches.push({
                type: operation.type,
                ...operation,
                path: [...path]
            });
        }
    },

    /**
     * Calcular operaciones mínimas para transformar lista antigua en nueva
     */
    calculateMinimalOperations: function(oldChildren, newChildren, oldChildrenByKey, newChildrenByKey) {
        const operations = [];
        let oldIndex = 0;
        let newIndex = 0;

        while (oldIndex < oldChildren.length || newIndex < newChildren.length) {
            const oldChild = oldChildren[oldIndex];
            const newChild = newChildren[newIndex];

            // Si ambos existen y tienen la misma key
            if (oldChild && newChild && 
                oldChild.props && newChild.props &&
                oldChild.props.key === newChild.props.key) {
                
                // Mover si el índice cambió
                if (oldIndex !== newIndex) {
                    operations.push({
                        type: 'MOVE',
                        from: oldIndex,
                        to: newIndex,
                        key: oldChild.props.key
                    });
                }
                
                oldIndex++;
                newIndex++;
            }
            // Si el hijo nuevo existe y tiene key que estaba en la lista antigua
            else if (newChild && newChild.props && 
                     newChild.props.key != null && 
                     oldChildrenByKey.has(newChild.props.key)) {
                
                operations.push({
                    type: 'MOVE',
                    from: oldChildrenByKey.get(newChild.props.key).index,
                    to: newIndex,
                    key: newChild.props.key
                });
                
                newIndex++;
            }
            // Si el hijo antiguo no tiene correspondencia en la nueva lista
            else if (oldChild && (!oldChild.props || oldChild.props.key == null || 
                     !newChildrenByKey.has(oldChild.props.key))) {
                
                operations.push({
                    type: 'REMOVE',
                    index: oldIndex,
                    key: oldChild.props ? oldChild.props.key : null
                });
                
                oldIndex++;
            }
            // Si el hijo nuevo no tiene correspondencia en la lista antigua
            else if (newChild && (!newChild.props || newChild.props.key == null || 
                     !oldChildrenByKey.has(newChild.props.key))) {
                
                operations.push({
                    type: 'INSERT',
                    index: newIndex,
                    node: newChild,
                    key: newChild.props ? newChild.props.key : null
                });
                
                newIndex++;
            }
        }

        return operations;
    },

    /**
     * Aplicar patches al DOM real
     */
    patch: async function(container, patches) {
        const startTime = performance.now();
        this.state.performanceMetrics.patchStartTime = startTime;

        // Ordenar patches por tipo y profundidad para optimización
        const sortedPatches = this.sortPatches(patches);

        for (const patch of sortedPatches) {
            await this.applyPatch(container, patch);
        }

        const patchTime = performance.now() - startTime;
        this.state.performanceMetrics.totalPatchTime += patchTime;
        this.state.diffMetrics.patchesApplied += patches.length;
    },

    /**
     * Ordenar patches para optimización
     */
    sortPatches: function(patches) {
        // Ordenar por tipo y profundidad
        return patches.sort((a, b) => {
            // Prioridad: REMOVE > REPLACE > CREATE > INSERT > MOVE > TEXT > SET_PROP > REMOVE_PROP
            const priority = {
                'REMOVE': 0,
                'REPLACE': 1,
                'CREATE': 2,
                'INSERT': 3,
                'MOVE': 4,
                'TEXT': 5,
                'SET_PROP': 6,
                'REMOVE_PROP': 7
            };

            const priorityDiff = priority[a.type] - priority[b.type];
            if (priorityDiff !== 0) return priorityDiff;

            // Si misma prioridad, ordenar por profundidad (más profundo primero)
            return b.path.length - a.path.length;
        });
    },

    /**
     * Aplicar patch individual
     */
    applyPatch: async function(container, patch) {
        const targetNode = this.getNodeAtPath(container, patch.path);

        switch (patch.type) {
            case 'CREATE':
                const newNode = await this.createRealNode(patch.node);
                if (targetNode) {
                    targetNode.appendChild(newNode);
                } else {
                    container.appendChild(newNode);
                }
                break;

            case 'REMOVE':
                if (targetNode && targetNode.parentNode) {
                    targetNode.parentNode.removeChild(targetNode);
                }
                break;

            case 'REPLACE':
                const replacementNode = await this.createRealNode(patch.newNode);
                if (targetNode && targetNode.parentNode) {
                    targetNode.parentNode.replaceChild(replacementNode, targetNode);
                }
                break;

            case 'TEXT':
                if (targetNode) {
                    targetNode.textContent = patch.value;
                }
                break;

            case 'SET_PROP':
                if (targetNode) {
                    await this.setProp(targetNode, patch.propName, patch.propValue);
                }
                break;

            case 'REMOVE_PROP':
                if (targetNode) {
                    await this.removeProp(targetNode, patch.propName);
                }
                break;

            case 'INSERT':
                const insertedNode = await this.createRealNode(patch.node);
                const parentNode = this.getNodeAtPath(container, patch.path.slice(0, -1));
                if (parentNode) {
                    parentNode.insertBefore(insertedNode, parentNode.childNodes[patch.index]);
                }
                break;

            case 'MOVE':
                const nodeToMove = this.findNodeByKey(container, patch.key);
                const targetParent = this.getNodeAtPath(container, patch.path.slice(0, -1));
                if (nodeToMove && targetParent) {
                    targetParent.insertBefore(nodeToMove, targetParent.childNodes[patch.to]);
                }
                break;
        }
    },

    /**
     * Obtener nodo en ruta específica
     */
    getNodeAtPath: function(container, path) {
        let currentNode = container;
        
        for (const index of path) {
            if (currentNode && currentNode.childNodes) {
                currentNode = currentNode.childNodes[index];
            } else {
                return null;
            }
        }
        
        return currentNode;
    },

    /**
     * Encontrar nodo por key
     */
    findNodeByKey: function(container, key) {
        if (!key) return null;
        
        const walker = container.createTreeWalker(
            container,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            if (node.getAttribute && node.getAttribute('data-key') === key) {
                return node;
            }
        }
        
        return null;
    },

    /**
     * Establecer prop en nodo
     */
    setProp: async function(node, propName, propValue) {
        if (propName.startsWith('on') && typeof propValue === 'function') {
            const eventName = propName.toLowerCase().substring(2);
            this.addEventListener(node, eventName, propValue);
        } else if (propName === 'className') {
            node.setAttribute('class', propValue);
        } else if (propName === 'style' && typeof propValue === 'object') {
            Object.assign(node.style, propValue);
        } else if (propName in node) {
            node[propName] = propValue;
        } else {
            node.setAttribute(propName, propValue);
        }
    },

    /**
     * Remover prop de nodo
     */
    removeProp: async function(node, propName) {
        if (propName.startsWith('on')) {
            const eventName = propName.toLowerCase().substring(2);
            this.removeEventListener(node, eventName);
        } else if (propName === 'className') {
            node.removeAttribute('class');
        } else if (propName in node) {
            node[propName] = null;
        } else {
            node.removeAttribute(propName);
        }
    },

    /**
     * Configurar delegación de eventos
     */
    setupEventDelegation: function() {
        // Escuchar eventos en el nivel superior
        const eventTypes = [
            'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout',
            'mousemove', 'keydown', 'keyup', 'keypress', 'change', 'input', 'submit',
            'focus', 'blur', 'touchstart', 'touchend', 'touchmove'
        ];

        eventTypes.forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                this.handleDelegatedEvent(e, eventType);
            }, true);
        });
    },

    /**
     * Manejar evento delegado
     */
    handleDelegatedEvent: function(event, eventType) {
        let target = event.target;
        
        // Buscar hacia arriba hasta encontrar un elemento con handler
        while (target && target !== document) {
            const listeners = this.state.eventListeners.get(target);
            
            if (listeners && listeners[eventType]) {
                listeners[eventType].forEach(handler => {
                    try {
                        handler.call(target, event);
                    } catch (error) {
                        this.log('Error en event handler delegado:', error);
                    }
                });
            }
            
            target = target.parentNode;
        }
    },

    /**
     * Agregar event listener con delegación
     */
    addEventListener: function(node, eventType, handler) {
        if (!this.config.enableEventDelegation) {
            // Fallback a listeners normales
            node.addEventListener(eventType, handler);
            return;
        }

        // Usar delegación
        if (!this.state.eventListeners.has(node)) {
            this.state.eventListeners.set(node, {});
        }

        const listeners = this.state.eventListeners.get(node);
        if (!listeners[eventType]) {
            listeners[eventType] = [];
        }

        listeners[eventType].push(handler);
    },

    /**
     * Remover event listener con delegación
     */
    removeEventListener: function(node, eventType) {
        if (!this.config.enableEventDelegation) {
            // Fallback a listeners normales
            node.removeEventListener(eventType);
            return;
        }

        const listeners = this.state.eventListeners.get(node);
        if (listeners && listeners[eventType]) {
            delete listeners[eventType];
        }
    },

    /**
     * Adjuntar event listeners a contenedor
     */
    attachEventListeners: function(container) {
        // Los listeners ya están configurados a nivel de documento
        // Solo necesitamos marcar el contenedor para delegación
        container.setAttribute('data-virtual-dom', 'true');
    },

    /**
     * Actualizar métricas de diffing
     */
    updateDiffMetrics: function(diffTime, patchCount) {
        const metrics = this.state.diffMetrics;
        
        metrics.totalDiffs++;
        metrics.averageDiffTime = 
            (metrics.averageDiffTime * (metrics.totalDiffs - 1) + diffTime) / metrics.totalDiffs;
        metrics.maxDiffTime = Math.max(metrics.maxDiffTime, diffTime);
        metrics.patchesApplied += patchCount;
    },

    /**
     * Invalidar caché de optimización
     */
    invalidateOptimizationCache: function(componentName) {
        if (this.state.optimizationCache.has(componentName)) {
            this.state.optimizationCache.delete(componentName);
        }
    },

    /**
     * Limpiar recursos
     */
    cleanup: function() {
        // Limpiar event listeners
        this.state.eventListeners.clear();
        
        // Limpiar cachés
        this.state.optimizationCache.clear();
        this.state.componentCache.clear();
        this.state.memoizedNodes.clear();
        this.state.keyRegistry.clear();
        
        // Resetear estado
        this.state.virtualTree = null;
        this.state.renderQueue = [];
        this.state.patchQueue = [];
        
        this.state.isInitialized = false;
        this.log('Virtual DOM limpiado');
    },

    /**
     * Obtener estadísticas
     */
    getStatistics: function() {
        return {
            diffMetrics: this.state.diffMetrics,
            performanceMetrics: this.state.performanceMetrics,
            cacheSizes: {
                optimization: this.state.optimizationCache.size,
                component: this.state.componentCache.size,
                memoized: this.state.memoizedNodes.size,
                eventListeners: this.state.eventListeners.size
            },
            queueSizes: {
                render: this.state.renderQueue.length,
                patch: this.state.patchQueue.length
            }
        };
    },

    /**
     * Logging
     */
    log: function(...args) {
        if (this.config.enableMetrics) {
            console.log('[VirtualDOM]', ...args);
        }
    }
};

// Auto-inicialización
if (typeof window !== 'undefined') {
    window.VirtualDOM = VirtualDOM;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualDOM;
}