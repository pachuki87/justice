/**
 * Justice 2 Query Builder
 * Constructor de consultas seguras y optimizadas para base de datos
 */

const QueryBuilder = {
    // Tipos de consulta soportados
    QUERY_TYPES: {
        SELECT: 'SELECT',
        INSERT: 'INSERT',
        UPDATE: 'UPDATE',
        DELETE: 'DELETE'
    },

    // Tipos de JOIN soportados
    JOIN_TYPES: {
        INNER: 'INNER JOIN',
        LEFT: 'LEFT JOIN',
        RIGHT: 'RIGHT JOIN',
        FULL: 'FULL OUTER JOIN'
    },

    // Operadores de comparación
    OPERATORS: {
        EQUALS: '=',
        NOT_EQUALS: '!=',
        GREATER_THAN: '>',
        GREATER_EQUAL: '>=',
        LESS_THAN: '<',
        LESS_EQUAL: '<=',
        LIKE: 'LIKE',
        ILIKE: 'ILIKE',
        IN: 'IN',
        NOT_IN: 'NOT IN',
        IS_NULL: 'IS NULL',
        IS_NOT_NULL: 'IS NOT NULL',
        BETWEEN: 'BETWEEN'
    },

    // Estado actual del constructor
    currentState: {
        type: null,
        table: null,
        columns: [],
        joins: [],
        where: [],
        groupBy: [],
        having: [],
        orderBy: [],
        limit: null,
        offset: null,
        params: [],
        returning: []
    },

    /**
     * Iniciar una nueva consulta SELECT
     * @param {string|Array} columns - Columnas a seleccionar
     * @returns {Object} Instancia del QueryBuilder
     */
    select: function(columns = '*') {
        this.reset();
        this.currentState.type = this.QUERY_TYPES.SELECT;
        
        if (Array.isArray(columns)) {
            this.currentState.columns = columns;
        } else if (typeof columns === 'string') {
            this.currentState.columns = columns.split(',').map(col => col.trim());
        } else {
            throw new Error('Las columnas deben ser un string o un array');
        }
        
        return this;
    },

    /**
     * Iniciar una nueva consulta INSERT
     * @param {string} table - Tabla donde insertar
     * @returns {Object} Instancia del QueryBuilder
     */
    insertInto: function(table) {
        this.reset();
        this.currentState.type = this.QUERY_TYPES.INSERT;
        this.currentState.table = table;
        return this;
    },

    /**
     * Iniciar una nueva consulta UPDATE
     * @param {string} table - Tabla a actualizar
     * @returns {Object} Instancia del QueryBuilder
     */
    update: function(table) {
        this.reset();
        this.currentState.type = this.QUERY_TYPES.UPDATE;
        this.currentState.table = table;
        return this;
    },

    /**
     * Iniciar una nueva consulta DELETE
     * @param {string} table - Tabla donde eliminar
     * @returns {Object} Instancia del QueryBuilder
     */
    deleteFrom: function(table) {
        this.reset();
        this.currentState.type = this.QUERY_TYPES.DELETE;
        this.currentState.table = table;
        return this;
    },

    /**
     * Especificar la tabla principal (para SELECT)
     * @param {string} table - Nombre de la tabla
     * @returns {Object} Instancia del QueryBuilder
     */
    from: function(table) {
        if (this.currentState.type !== this.QUERY_TYPES.SELECT) {
            throw new Error('from() solo se puede usar con consultas SELECT');
        }
        
        this.currentState.table = table;
        return this;
    },

    /**
     * Agregar un JOIN a la consulta
     * @param {string} type - Tipo de JOIN
     * @param {string} table - Tabla a unir
     * @param {string} on - Condición del JOIN
     * @param {string} alias - Alias opcional para la tabla
     * @returns {Object} Instancia del QueryBuilder
     */
    join: function(type, table, on, alias = null) {
        if (!Object.values(this.JOIN_TYPES).includes(type)) {
            throw new Error(`Tipo de JOIN no válido: ${type}`);
        }
        
        const join = {
            type: type,
            table: table,
            on: on,
            alias: alias
        };
        
        this.currentState.joins.push(join);
        return this;
    },

    /**
     * Método de conveniencia para INNER JOIN
     * @param {string} table - Tabla a unir
     * @param {string} on - Condición del JOIN
     * @param {string} alias - Alias opcional
     * @returns {Object} Instancia del QueryBuilder
     */
    innerJoin: function(table, on, alias = null) {
        return this.join(this.JOIN_TYPES.INNER, table, on, alias);
    },

    /**
     * Método de conveniencia para LEFT JOIN
     * @param {string} table - Tabla a unir
     * @param {string} on - Condición del JOIN
     * @param {string} alias - Alias opcional
     * @returns {Object} Instancia del QueryBuilder
     */
    leftJoin: function(table, on, alias = null) {
        return this.join(this.JOIN_TYPES.LEFT, table, on, alias);
    },

    /**
     * Agregar condición WHERE
     * @param {string} column - Columna
     * @param {string} operator - Operador
     * @param {*} value - Valor
     * @param {string} logicalOperator - Operador lógico (AND/OR)
     * @returns {Object} Instancia del QueryBuilder
     */
    where: function(column, operator, value, logicalOperator = 'AND') {
        if (!Object.values(this.OPERATORS).includes(operator)) {
            throw new Error(`Operador no válido: ${operator}`);
        }
        
        const condition = {
            column: column,
            operator: operator,
            value: value,
            logicalOperator: logicalOperator.toUpperCase()
        };
        
        this.currentState.where.push(condition);
        
        // Agregar valor a parámetros si no es NULL
        if (value !== null && operator !== this.OPERATORS.IS_NULL && operator !== this.OPERATORS.IS_NOT_NULL) {
            this.currentState.params.push(value);
        }
        
        return this;
    },

    /**
     * Método de conveniencia para WHERE con igualdad
     * @param {string} column - Columna
     * @param {*} value - Valor
     * @returns {Object} Instancia del QueryBuilder
     */
    whereEquals: function(column, value) {
        return this.where(column, this.OPERATORS.EQUALS, value);
    },

    /**
     * Método de conveniencia para WHERE con LIKE
     * @param {string} column - Columna
     * @param {string} value - Valor
     * @returns {Object} Instancia del QueryBuilder
     */
    whereLike: function(column, value) {
        return this.where(column, this.OPERATORS.LIKE, value);
    },

    /**
     * Método de conveniencia para WHERE con IN
     * @param {string} column - Columna
     * @param {Array} values - Valores
     * @returns {Object} Instancia del QueryBuilder
     */
    whereIn: function(column, values) {
        if (!Array.isArray(values) || values.length === 0) {
            throw new Error('whereIn requiere un array no vacío');
        }
        
        // Crear placeholders para cada valor
        const placeholders = values.map(() => '?').join(', ');
        const condition = {
            column: column,
            operator: this.OPERATORS.IN,
            value: `(${placeholders})`,
            logicalOperator: 'AND',
            isInClause: true
        };
        
        this.currentState.where.push(condition);
        this.currentState.params.push(...values);
        
        return this;
    },

    /**
     * Agregar condición WHERE con OR
     * @param {string} column - Columna
     * @param {string} operator - Operador
     * @param {*} value - Valor
     * @returns {Object} Instancia del QueryBuilder
     */
    orWhere: function(column, operator, value) {
        return this.where(column, operator, value, 'OR');
    },

    /**
     * Agregar cláusula GROUP BY
     * @param {string|Array} columns - Columnas para agrupar
     * @returns {Object} Instancia del QueryBuilder
     */
    groupBy: function(columns) {
        if (Array.isArray(columns)) {
            this.currentState.groupBy.push(...columns);
        } else if (typeof columns === 'string') {
            this.currentState.groupBy.push(columns);
        } else {
            throw new Error('groupBy requiere un string o un array');
        }
        
        return this;
    },

    /**
     * Agregar cláusula HAVING
     * @param {string} column - Columna
     * @param {string} operator - Operador
     * @param {*} value - Valor
     * @returns {Object} Instancia del QueryBuilder
     */
    having: function(column, operator, value) {
        const condition = {
            column: column,
            operator: operator,
            value: value
        };
        
        this.currentState.having.push(condition);
        this.currentState.params.push(value);
        
        return this;
    },

    /**
     * Agregar cláusula ORDER BY
     * @param {string|Array} columns - Columnas para ordenar
     * @param {string} direction - Dirección (ASC/DESC)
     * @returns {Object} Instancia del QueryBuilder
     */
    orderBy: function(columns, direction = 'ASC') {
        const orderDirection = direction.toUpperCase();
        if (orderDirection !== 'ASC' && orderDirection !== 'DESC') {
            throw new Error('Dirección de ordenamiento debe ser ASC o DESC');
        }
        
        if (Array.isArray(columns)) {
            columns.forEach(col => {
                this.currentState.orderBy.push({ column: col, direction: orderDirection });
            });
        } else if (typeof columns === 'string') {
            this.currentState.orderBy.push({ column: columns, direction: orderDirection });
        } else {
            throw new Error('orderBy requiere un string o un array');
        }
        
        return this;
    },

    /**
     * Método de conveniencia para ORDER BY DESC
     * @param {string|Array} columns - Columnas para ordenar
     * @returns {Object} Instancia del QueryBuilder
     */
    orderByDesc: function(columns) {
        return this.orderBy(columns, 'DESC');
    },

    /**
     * Establecer límite de resultados
     * @param {number} limit - Límite de resultados
     * @returns {Object} Instancia del QueryBuilder
     */
    limit: function(limit) {
        if (typeof limit !== 'number' || limit <= 0) {
            throw new Error('El límite debe ser un número positivo');
        }
        
        this.currentState.limit = limit;
        return this;
    },

    /**
     * Establecer offset de resultados
     * @param {number} offset - Offset de resultados
     * @returns {Object} Instancia del QueryBuilder
     */
    offset: function(offset) {
        if (typeof offset !== 'number' || offset < 0) {
            throw new Error('El offset debe ser un número no negativo');
        }
        
        this.currentState.offset = offset;
        return this;
    },

    /**
     * Agregar cláusula RETURNING (para INSERT/UPDATE/DELETE)
     * @param {string|Array} columns - Columnas a retornar
     * @returns {Object} Instancia del QueryBuilder
     */
    returning: function(columns) {
        if (Array.isArray(columns)) {
            this.currentState.returning.push(...columns);
        } else if (typeof columns === 'string') {
            this.currentState.returning.push(columns);
        } else {
            throw new Error('returning requiere un string o un array');
        }
        
        return this;
    },

    /**
     * Agregar valores para INSERT
     * @param {Object} data - Objeto con los datos a insertar
     * @returns {Object} Instancia del QueryBuilder
     */
    values: function(data) {
        if (this.currentState.type !== this.QUERY_TYPES.INSERT) {
            throw new Error('values() solo se puede usar con consultas INSERT');
        }
        
        if (typeof data !== 'object' || data === null) {
            throw new Error('values() requiere un objeto');
        }
        
        this.currentState.insertData = data;
        
        // Extraer columnas y valores
        const columns = Object.keys(data);
        const values = Object.values(data);
        
        this.currentState.insertColumns = columns;
        this.currentState.params.push(...values);
        
        return this;
    },

    /**
     * Agregar cláusula SET para UPDATE
     * @param {Object} data - Objeto con los datos a actualizar
     * @returns {Object} Instancia del QueryBuilder
     */
    set: function(data) {
        if (this.currentState.type !== this.QUERY_TYPES.UPDATE) {
            throw new Error('set() solo se puede usar con consultas UPDATE');
        }
        
        if (typeof data !== 'object' || data === null) {
            throw new Error('set() requiere un objeto');
        }
        
        this.currentState.updateData = data;
        
        // Extraer columnas y valores
        const columns = Object.keys(data);
        const values = Object.values(data);
        
        this.currentState.updateColumns = columns;
        this.currentState.params.push(...values);
        
        return this;
    },

    /**
     * Construir la consulta SQL
     * @returns {Object} Objeto con SQL y parámetros
     */
    build: function() {
        let sql = '';
        let params = [...this.currentState.params];
        
        switch (this.currentState.type) {
            case this.QUERY_TYPES.SELECT:
                sql = this.buildSelect();
                break;
            case this.QUERY_TYPES.INSERT:
                sql = this.buildInsert();
                break;
            case this.QUERY_TYPES.UPDATE:
                sql = this.buildUpdate();
                break;
            case this.QUERY_TYPES.DELETE:
                sql = this.buildDelete();
                break;
            default:
                throw new Error('Tipo de consulta no especificado');
        }
        
        return {
            sql: sql,
            params: params,
            type: this.currentState.type,
            table: this.currentState.table
        };
    },

    /**
     * Construir consulta SELECT
     * @returns {string} SQL SELECT
     */
    buildSelect: function() {
        if (!this.currentState.table) {
            throw new Error('Tabla no especificada para consulta SELECT');
        }
        
        let sql = `SELECT ${this.currentState.columns.join(', ')} FROM ${this.currentState.table}`;
        
        // Agregar JOINs
        this.currentState.joins.forEach(join => {
            const tableWithAlias = join.alias ? `${join.table} ${join.alias}` : join.table;
            sql += ` ${join.type} ${tableWithAlias} ON ${join.on}`;
        });
        
        // Agregar WHERE
        if (this.currentState.where.length > 0) {
            sql += ` WHERE ${this.buildWhereClause()}`;
        }
        
        // Agregar GROUP BY
        if (this.currentState.groupBy.length > 0) {
            sql += ` GROUP BY ${this.currentState.groupBy.join(', ')}`;
        }
        
        // Agregar HAVING
        if (this.currentState.having.length > 0) {
            sql += ` HAVING ${this.buildHavingClause()}`;
        }
        
        // Agregar ORDER BY
        if (this.currentState.orderBy.length > 0) {
            const orderClauses = this.currentState.orderBy.map(order => 
                `${order.column} ${order.direction}`
            );
            sql += ` ORDER BY ${orderClauses.join(', ')}`;
        }
        
        // Agregar LIMIT y OFFSET
        if (this.currentState.limit !== null) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(this.currentState.limit);
        }
        
        if (this.currentState.offset !== null) {
            sql += ` OFFSET $${params.length + 1}`;
            params.push(this.currentState.offset);
        }
        
        return sql;
    },

    /**
     * Construir consulta INSERT
     * @returns {string} SQL INSERT
     */
    buildInsert: function() {
        if (!this.currentState.insertData) {
            throw new Error('Datos no especificados para consulta INSERT');
        }
        
        const columns = this.currentState.insertColumns.join(', ');
        const placeholders = this.currentState.insertColumns.map((_, index) => 
            `$${index + 1}`
        ).join(', ');
        
        let sql = `INSERT INTO ${this.currentState.table} (${columns}) VALUES (${placeholders})`;
        
        // Agregar RETURNING
        if (this.currentState.returning.length > 0) {
            sql += ` RETURNING ${this.currentState.returning.join(', ')}`;
        }
        
        return sql;
    },

    /**
     * Construir consulta UPDATE
     * @returns {string} SQL UPDATE
     */
    buildUpdate: function() {
        if (!this.currentState.updateData) {
            throw new Error('Datos no especificados para consulta UPDATE');
        }
        
        const setClauses = this.currentState.updateColumns.map((column, index) => 
            `${column} = $${index + 1}`
        ).join(', ');
        
        let sql = `UPDATE ${this.currentState.table} SET ${setClauses}`;
        
        // Agregar WHERE
        if (this.currentState.where.length > 0) {
            sql += ` WHERE ${this.buildWhereClause()}`;
        }
        
        // Agregar RETURNING
        if (this.currentState.returning.length > 0) {
            sql += ` RETURNING ${this.currentState.returning.join(', ')}`;
        }
        
        return sql;
    },

    /**
     * Construir consulta DELETE
     * @returns {string} SQL DELETE
     */
    buildDelete: function() {
        let sql = `DELETE FROM ${this.currentState.table}`;
        
        // Agregar WHERE
        if (this.currentState.where.length > 0) {
            sql += ` WHERE ${this.buildWhereClause()}`;
        }
        
        // Agregar RETURNING
        if (this.currentState.returning.length > 0) {
            sql += ` RETURNING ${this.currentState.returning.join(', ')}`;
        }
        
        return sql;
    },

    /**
     * Construir cláusula WHERE
     * @returns {string} Cláusula WHERE
     */
    buildWhereClause: function() {
        const conditions = [];
        let paramIndex = this.currentState.params.length - this.currentState.where.length + 1;
        
        this.currentState.where.forEach((condition, index) => {
            let clause = '';
            
            if (index > 0) {
                clause += ` ${condition.logicalOperator} `;
            }
            
            if (condition.isInClause) {
                // Para cláusulas IN, construir placeholders
                const valueCount = condition.value.match(/\?/g).length;
                const placeholders = [];
                for (let i = 0; i < valueCount; i++) {
                    placeholders.push(`$${paramIndex++}`);
                }
                clause += `${condition.column} ${condition.operator} (${placeholders.join(', ')})`;
            } else if (condition.operator === this.OPERATORS.IS_NULL || condition.operator === this.OPERATORS.IS_NOT_NULL) {
                clause += `${condition.column} ${condition.operator}`;
            } else {
                clause += `${condition.column} ${condition.operator} $${paramIndex++}`;
            }
            
            conditions.push(clause);
        });
        
        return conditions.join('');
    },

    /**
     * Construir cláusula HAVING
     * @returns {string} Cláusula HAVING
     */
    buildHavingClause: function() {
        const conditions = [];
        let paramIndex = this.currentState.params.length - this.currentState.having.length + 1;
        
        this.currentState.having.forEach((condition, index) => {
            let clause = '';
            
            if (index > 0) {
                clause += ' AND ';
            }
            
            clause += `${condition.column} ${condition.operator} $${paramIndex++}`;
            conditions.push(clause);
        });
        
        return conditions.join('');
    },

    /**
     * Reiniciar el estado del constructor
     */
    reset: function() {
        this.currentState = {
            type: null,
            table: null,
            columns: [],
            joins: [],
            where: [],
            groupBy: [],
            having: [],
            orderBy: [],
            limit: null,
            offset: null,
            params: [],
            returning: [],
            insertData: null,
            insertColumns: [],
            updateData: null,
            updateColumns: []
        };
    },

    /**
     * Validar la consulta actual
     * @returns {Object} Resultado de la validación
     */
    validate: function() {
        const errors = [];
        const warnings = [];
        
        // Validaciones básicas
        if (!this.currentState.type) {
            errors.push('Tipo de consulta no especificado');
        }
        
        if (!this.currentState.table) {
            errors.push('Tabla no especificada');
        }
        
        // Validaciones específicas por tipo
        switch (this.currentState.type) {
            case this.QUERY_TYPES.SELECT:
                if (this.currentState.columns.length === 0) {
                    warnings.push('No se especificaron columnas para SELECT');
                }
                break;
                
            case this.QUERY_TYPES.INSERT:
                if (!this.currentState.insertData) {
                    errors.push('Datos no especificados para INSERT');
                }
                break;
                
            case this.QUERY_TYPES.UPDATE:
                if (!this.currentState.updateData) {
                    errors.push('Datos no especificados para UPDATE');
                }
                if (this.currentState.where.length === 0) {
                    warnings.push('UPDATE sin cláusula WHERE - afectará a todos los registros');
                }
                break;
                
            case this.QUERY_TYPES.DELETE:
                if (this.currentState.where.length === 0) {
                    warnings.push('DELETE sin cláusula WHERE - eliminará todos los registros');
                }
                break;
        }
        
        // Validaciones de seguridad
        if (this.currentState.limit && this.currentState.limit > 1000) {
            warnings.push('Límite muy alto podría afectar el rendimiento');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    },

    /**
     * Obtener información sobre la consulta
     * @returns {Object} Información de la consulta
     */
    getInfo: function() {
        return {
            type: this.currentState.type,
            table: this.currentState.table,
            hasJoins: this.currentState.joins.length > 0,
            hasWhere: this.currentState.where.length > 0,
            hasGroupBy: this.currentState.groupBy.length > 0,
            hasOrderBy: this.currentState.orderBy.length > 0,
            hasLimit: this.currentState.limit !== null,
            hasOffset: this.currentState.offset !== null,
            paramCount: this.currentState.params.length,
            estimatedComplexity: this.estimateComplexity()
        };
    },

    /**
     * Estimar complejidad de la consulta
     * @returns {string} Nivel de complejidad
     */
    estimateComplexity: function() {
        let complexity = 1;
        
        if (this.currentState.joins.length > 0) complexity += this.currentState.joins.length * 2;
        if (this.currentState.where.length > 0) complexity += this.currentState.where.length;
        if (this.currentState.groupBy.length > 0) complexity += this.currentState.groupBy.length * 1.5;
        if (this.currentState.having.length > 0) complexity += this.currentState.having.length;
        if (this.currentState.orderBy.length > 0) complexity += this.currentState.orderBy.length * 0.5;
        
        if (complexity < 3) return 'low';
        if (complexity < 6) return 'medium';
        return 'high';
    },

    /**
     * Clonar el constructor actual
     * @returns {Object} Nueva instancia del QueryBuilder
     */
    clone: function() {
        const cloned = Object.create(this);
        cloned.currentState = JSON.parse(JSON.stringify(this.currentState));
        return cloned;
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.QueryBuilder = QueryBuilder;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = QueryBuilder;
}