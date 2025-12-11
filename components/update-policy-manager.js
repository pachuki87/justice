/**
 * UpdatePolicyManager - Sistema de políticas de actualización y flujo de aprobación
 * 
 * Este módulo proporciona funcionalidades para:
 * - Definir y gestionar políticas de actualización
 * - Implementar flujos de aprobación
 * - Gestionar ventanas de mantenimiento
 * - Coordinar actualizaciones automáticas
 * - Mantener registros de auditoría
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class UpdatePolicyManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            projectPath: options.projectPath || process.cwd(),
            configPath: options.configPath || path.join(options.projectPath || process.cwd(), 'update-policies.json'),
            auditLogPath: options.auditLogPath || path.join(options.projectPath || process.cwd(), 'update-audit.log'),
            approvalRequired: options.approvalRequired !== false,
            autoApproveSafeUpdates: options.autoApproveSafeUpdates !== false,
            maintenanceWindows: options.maintenanceWindows || [],
            maxApprovalTime: options.maxApprovalTime || 24 * 60 * 60 * 1000, // 24 horas
            rollbackEnabled: options.rollbackEnabled !== false,
            notificationChannels: options.notificationChannels || ['email', 'slack'],
            approvers: options.approvers || [],
            ...options
        };
        
        this.policies = {};
        this.approvalQueue = [];
        this.maintenanceSchedule = [];
        this.auditLog = [];
        this.currentApprovals = {};
        
        // Tipos de políticas de actualización
        this.policyTypes = {
            security: {
                name: 'Security Updates',
                description: 'Actualizaciones de seguridad críticas',
                priority: 'high',
                autoApprove: false,
                rollbackRequired: true,
                testingRequired: true,
                maintenanceWindow: true
            },
            patch: {
                name: 'Patch Updates',
                description: 'Actualizaciones de parches (versiones menores)',
                priority: 'medium',
                autoApprove: true,
                rollbackRequired: false,
                testingRequired: false,
                maintenanceWindow: false
            },
            minor: {
                name: 'Minor Updates',
                description: 'Actualizaciones menores (nuevas funcionalidades)',
                priority: 'medium',
                autoApprove: false,
                rollbackRequired: true,
                testingRequired: true,
                maintenanceWindow: true
            },
            major: {
                name: 'Major Updates',
                description: 'Actualizaciones mayores (cambios breaking)',
                priority: 'high',
                autoApprove: false,
                rollbackRequired: true,
                testingRequired: true,
                maintenanceWindow: true
            },
            dependency: {
                name: 'Dependency Updates',
                description: 'Actualizaciones de dependencias',
                priority: 'medium',
                autoApprove: false,
                rollbackRequired: true,
                testingRequired: true,
                maintenanceWindow: false
            }
        };
        
        // Estados de aprobación
        this.approvalStatuses = {
            pending: 'Pendiente de aprobación',
            approved: 'Aprobado',
            rejected: 'Rechazado',
            expired: 'Expirado',
            cancelled: 'Cancelado',
            executed: 'Ejecutado',
            rolled_back: 'Revertido'
        };
    }

    /**
     * Inicializa el gestor de políticas
     */
    async initialize() {
        try {
            await this.loadPolicies();
            await this.loadApprovalQueue();
            await this.loadMaintenanceSchedule();
            await this.loadAuditLog();
            
            console.log('✅ UpdatePolicyManager inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar UpdatePolicyManager:', error.message);
            throw error;
        }
    }

    /**
     * Carga políticas desde archivo
     */
    async loadPolicies() {
        try {
            const policiesData = await fs.readFile(this.options.configPath, 'utf8');
            this.policies = JSON.parse(policiesData);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Crear políticas por defecto
                this.policies = this.createDefaultPolicies();
                await this.savePolicies();
            } else {
                throw new Error(`Error cargando políticas: ${error.message}`);
            }
        }
    }

    /**
     * Carga cola de aprobación
     */
    async loadApprovalQueue() {
        try {
            const queuePath = path.join(path.dirname(this.options.configPath), 'approval-queue.json');
            const queueData = await fs.readFile(queuePath, 'utf8');
            this.approvalQueue = JSON.parse(queueData);
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.approvalQueue = [];
            } else {
                console.warn('⚠️ Error cargando cola de aprobación:', error.message);
                this.approvalQueue = [];
            }
        }
    }

    /**
     * Carga schedule de mantenimiento
     */
    async loadMaintenanceSchedule() {
        try {
            const schedulePath = path.join(path.dirname(this.options.configPath), 'maintenance-schedule.json');
            const scheduleData = await fs.readFile(schedulePath, 'utf8');
            this.maintenanceSchedule = JSON.parse(scheduleData);
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.maintenanceSchedule = this.options.maintenanceWindows;
            } else {
                console.warn('⚠️ Error cargando schedule de mantenimiento:', error.message);
                this.maintenanceSchedule = this.options.maintenanceWindows;
            }
        }
    }

    /**
     * Carga log de auditoría
     */
    async loadAuditLog() {
        try {
            const auditData = await fs.readFile(this.options.auditLogPath, 'utf8');
            const lines = auditData.split('\n').filter(line => line.trim());
            this.auditLog = lines.map(line => JSON.parse(line));
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.auditLog = [];
            } else {
                console.warn('⚠️ Error cargando log de auditoría:', error.message);
                this.auditLog = [];
            }
        }
    }

    /**
     * Crea políticas por defecto
     */
    createDefaultPolicies() {
        const policies = {};
        
        for (const [type, config] of Object.entries(this.policyTypes)) {
            policies[type] = {
                ...config,
                rules: {
                    autoApprove: config.autoApprove,
                    requireTesting: config.testingRequired,
                    requireRollback: config.rollbackRequired,
                    requireMaintenanceWindow: config.maintenanceWindow,
                    maxRetries: 3,
                    timeout: 60 * 60 * 1000, // 1 hora
                    approvers: this.options.approvers,
                    notificationChannels: this.options.notificationChannels
                },
                conditions: {
                    vulnerabilityScore: {
                        critical: 'immediate',
                        high: '24h',
                        medium: '72h',
                        low: '7d'
                    },
                    compatibilityScore: {
                        min: 80,
                        target: 95
                    },
                    performanceImpact: {
                        max: 20 // % de degradación permitida
                    }
                }
            };
        }
        
        return policies;
    }

    /**
     * Guarda políticas en archivo
     */
    async savePolicies() {
        try {
            await fs.writeFile(this.options.configPath, JSON.stringify(this.policies, null, 2));
        } catch (error) {
            throw new Error(`Error guardando políticas: ${error.message}`);
        }
    }

    /**
     * Guarda cola de aprobación
     */
    async saveApprovalQueue() {
        try {
            const queuePath = path.join(path.dirname(this.options.configPath), 'approval-queue.json');
            await fs.writeFile(queuePath, JSON.stringify(this.approvalQueue, null, 2));
        } catch (error) {
            console.error('❌ Error guardando cola de aprobación:', error.message);
        }
    }

    /**
     * Guarda schedule de mantenimiento
     */
    async saveMaintenanceSchedule() {
        try {
            const schedulePath = path.join(path.dirname(this.options.configPath), 'maintenance-schedule.json');
            await fs.writeFile(schedulePath, JSON.stringify(this.maintenanceSchedule, null, 2));
        } catch (error) {
            console.error('❌ Error guardando schedule de mantenimiento:', error.message);
        }
    }

    /**
     * Agrega entrada al log de auditoría
     */
    async addAuditLog(entry) {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            id: this.generateId(),
            ...entry
        };
        
        this.auditLog.push(auditEntry);
        
        // Guardar en archivo
        try {
            const logLine = JSON.stringify(auditEntry) + '\n';
            await fs.appendFile(this.options.auditLogPath, logLine);
        } catch (error) {
            console.error('❌ Error escribiendo en log de auditoría:', error.message);
        }
        
        this.emit('audit:log', auditEntry);
        return auditEntry;
    }

    /**
     * Genera ID único
     */
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Evalúa una solicitud de actualización
     */
    async evaluateUpdateRequest(updateRequest) {
        try {
            console.log(`🔍 Evaluando solicitud de actualización: ${updateRequest.id}`);
            
            const evaluation = {
                requestId: updateRequest.id,
                timestamp: new Date().toISOString(),
                policy: null,
                approvalRequired: false,
                autoApprove: false,
                recommendations: [],
                conditions: {},
                status: 'evaluated'
            };
            
            // Determinar tipo de política
            const policyType = this.determinePolicyType(updateRequest);
            evaluation.policy = policyType;
            
            // Obtener política configurada
            const policy = this.policies[policyType];
            if (!policy) {
                throw new Error(`Política no encontrada para tipo: ${policyType}`);
            }
            
            // Evaluar condiciones
            evaluation.conditions = await this.evaluateConditions(updateRequest, policy);
            
            // Determinar si requiere aprobación
            evaluation.approvalRequired = this.requiresApproval(updateRequest, policy, evaluation.conditions);
            
            // Determinar si se puede aprobar automáticamente
            evaluation.autoApprove = this.canAutoApprove(updateRequest, policy, evaluation.conditions);
            
            // Generar recomendaciones
            evaluation.recommendations = this.generateRecommendations(updateRequest, policy, evaluation.conditions);
            
            // Registrar evaluación
            await this.addAuditLog({
                type: 'evaluation',
                action: 'update_request_evaluated',
                details: evaluation
            });
            
            console.log(`✅ Evaluación completada: ${evaluation.approvalRequired ? 'Requiere aprobación' : 'Auto-aprobado'}`);
            
            return evaluation;
        } catch (error) {
            await this.addAuditLog({
                type: 'error',
                action: 'evaluation_failed',
                requestId: updateRequest.id,
                error: error.message
            });
            
            throw new Error(`Error evaluando solicitud: ${error.message}`);
        }
    }

    /**
     * Determina el tipo de política para una actualización
     */
    determinePolicyType(updateRequest) {
        const { updates, vulnerabilities, securityIssues } = updateRequest;
        
        // Prioridad 1: Actualizaciones de seguridad críticas
        if (vulnerabilities && vulnerabilities.length > 0) {
            const hasCritical = vulnerabilities.some(v => v.severity === 'critical');
            const hasHigh = vulnerabilities.some(v => v.severity === 'high');
            
            if (hasCritical || hasHigh) {
                return 'security';
            }
        }
        
        // Prioridad 2: Analizar tipo de actualizaciones
        if (updates) {
            const hasMajor = updates.some(u => u.updateType === 'major');
            const hasMinor = updates.some(u => u.updateType === 'minor');
            const hasPatch = updates.some(u => u.updateType === 'patch');
            
            if (hasMajor) return 'major';
            if (hasMinor) return 'minor';
            if (hasPatch) return 'patch';
        }
        
        // Prioridad 3: Actualizaciones de dependencias
        return 'dependency';
    }

    /**
     * Evalúa condiciones de la política
     */
    async evaluateConditions(updateRequest, policy) {
        const conditions = {
            vulnerabilityScore: this.evaluateVulnerabilityScore(updateRequest),
            compatibilityScore: this.evaluateCompatibilityScore(updateRequest),
            performanceImpact: this.evaluatePerformanceImpact(updateRequest),
            maintenanceWindow: this.checkMaintenanceWindow(policy),
            testingRequirements: this.checkTestingRequirements(updateRequest, policy),
            rollbackRequirements: this.checkRollbackRequirements(updateRequest, policy)
        };
        
        return conditions;
    }

    /**
     * Evalúa puntaje de vulnerabilidad
     */
    evaluateVulnerabilityScore(updateRequest) {
        if (!updateRequest.vulnerabilities || updateRequest.vulnerabilities.length === 0) {
            return { score: 0, level: 'none', action: 'none' };
        }
        
        const vulnerabilities = updateRequest.vulnerabilities;
        const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
        const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
        const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;
        const lowCount = vulnerabilities.filter(v => v.severity === 'low').length;
        
        // Calcular puntaje ponderado
        const score = (criticalCount * 10) + (highCount * 5) + (mediumCount * 2) + (lowCount * 1);
        
        let level, action;
        if (score >= 10) {
            level = 'critical';
            action = 'immediate';
        } else if (score >= 5) {
            level = 'high';
            action = '24h';
        } else if (score >= 2) {
            level = 'medium';
            action = '72h';
        } else {
            level = 'low';
            action = '7d';
        }
        
        return {
            score,
            level,
            action,
            details: {
                critical: criticalCount,
                high: highCount,
                medium: mediumCount,
                low: lowCount,
                total: vulnerabilities.length
            }
        };
    }

    /**
     * Evalúa puntaje de compatibilidad
     */
    evaluateCompatibilityScore(updateRequest) {
        if (!updateRequest.compatibilityTest) {
            return { score: 0, status: 'unknown', action: 'required' };
        }
        
        const testResult = updateRequest.compatibilityTest;
        const score = testResult.compatibility || 0;
        
        let status, action;
        if (score >= 95) {
            status = 'excellent';
            action = 'proceed';
        } else if (score >= 80) {
            status = 'good';
            action = 'caution';
        } else if (score >= 60) {
            status = 'acceptable';
            action = 'review';
        } else {
            status = 'poor';
            action = 'reject';
        }
        
        return {
            score,
            status,
            action,
            details: {
                totalTests: testResult.totalTests || 0,
                passedTests: testResult.passedTests || 0,
                failedTests: testResult.failedTests || 0
            }
        };
    }

    /**
     * Evalúa impacto en rendimiento
     */
    evaluatePerformanceImpact(updateRequest) {
        if (!updateRequest.performanceTest) {
            return { impact: 0, level: 'unknown', action: 'required' };
        }
        
        const perfResult = updateRequest.performanceTest;
        const responseTimeImpact = perfResult.responseTimeImpact || 0;
        const memoryImpact = perfResult.memoryImpact || 0;
        const cpuImpact = perfResult.cpuImpact || 0;
        
        // Calcular impacto promedio
        const impact = Math.max(responseTimeImpact, memoryImpact, cpuImpact);
        
        let level, action;
        if (impact <= 5) {
            level = 'minimal';
            action = 'proceed';
        } else if (impact <= 15) {
            level = 'moderate';
            action = 'monitor';
        } else if (impact <= 25) {
            level = 'significant';
            action = 'review';
        } else {
            level = 'severe';
            action = 'reject';
        }
        
        return {
            impact,
            level,
            action,
            details: {
                responseTime: responseTimeImpact,
                memory: memoryImpact,
                cpu: cpuImpact
            }
        };
    }

    /**
     * Verifica ventana de mantenimiento
     */
    checkMaintenanceWindow(policy) {
        if (!policy.rules.requireMaintenanceWindow) {
            return { required: false, available: true, nextWindow: null };
        }
        
        const now = new Date();
        const availableWindows = this.maintenanceSchedule.filter(window => {
            const start = new Date(window.start);
            const end = new Date(window.end);
            return now >= start && now <= end;
        });
        
        const nextWindow = this.findNextMaintenanceWindow();
        
        return {
            required: true,
            available: availableWindows.length > 0,
            currentWindows: availableWindows,
            nextWindow
        };
    }

    /**
     * Encuentra la próxima ventana de mantenimiento
     */
    findNextMaintenanceWindow() {
        const now = new Date();
        const futureWindows = this.maintenanceSchedule
            .filter(window => new Date(window.start) > now)
            .sort((a, b) => new Date(a.start) - new Date(b.start));
        
        return futureWindows.length > 0 ? futureWindows[0] : null;
    }

    /**
     * Verifica requisitos de prueba
     */
    checkTestingRequirements(updateRequest, policy) {
        const required = policy.rules.requireTesting;
        const completed = !!(updateRequest.compatibilityTest && updateRequest.performanceTest);
        const passed = completed && 
                     updateRequest.compatibilityTest.compatibility >= policy.conditions.compatibilityScore.min;
        
        return {
            required,
            completed,
            passed,
            action: required && !completed ? 'required' : 
                   required && !passed ? 'failed' : 'passed'
        };
    }

    /**
     * Verifica requisitos de rollback
     */
    checkRollbackRequirements(updateRequest, policy) {
        const required = policy.rules.requireRollback;
        const available = !!(updateRequest.backup && updateRequest.rollbackPlan);
        
        return {
            required,
            available,
            action: required && !available ? 'required' : 'passed'
        };
    }

    /**
     * Determina si se requiere aprobación
     */
    requiresApproval(updateRequest, policy, conditions) {
        // Si las políticas lo requieren siempre
        if (this.options.approvalRequired) {
            return true;
        }
        
        // Si la política específica lo requiere
        if (!policy.rules.autoApprove) {
            return true;
        }
        
        // Si hay vulnerabilidades críticas
        if (conditions.vulnerabilityScore.level === 'critical' || 
            conditions.vulnerabilityScore.level === 'high') {
            return true;
        }
        
        // Si la compatibilidad es baja
        if (conditions.compatibilityScore.status === 'poor') {
            return true;
        }
        
        // Si el impacto en rendimiento es severo
        if (conditions.performanceImpact.level === 'severe') {
            return true;
        }
        
        // Si no se cumplen los requisitos de prueba
        if (conditions.testingRequirements.action === 'failed') {
            return true;
        }
        
        // Si no se cumplen los requisitos de rollback
        if (conditions.rollbackRequirements.action === 'required') {
            return true;
        }
        
        return false;
    }

    /**
     * Determina si se puede aprobar automáticamente
     */
    canAutoApprove(updateRequest, policy, conditions) {
        // Si no está habilitado el auto-aprobado
        if (!this.options.autoApproveSafeUpdates) {
            return false;
        }
        
        // Si la política no lo permite
        if (!policy.rules.autoApprove) {
            return false;
        }
        
        // Si requiere aprobación manual
        if (this.requiresApproval(updateRequest, policy, conditions)) {
            return false;
        }
        
        // Si todas las condiciones son favorables
        const allConditionsPass = [
            conditions.vulnerabilityScore.level === 'none' || 
            conditions.vulnerabilityScore.level === 'low',
            conditions.compatibilityScore.status === 'excellent' || 
            conditions.compatibilityScore.status === 'good',
            conditions.performanceImpact.level === 'minimal' || 
            conditions.performanceImpact.level === 'moderate',
            conditions.testingRequirements.action === 'passed',
            conditions.rollbackRequirements.action === 'passed'
        ].every(Boolean);
        
        return allConditionsPass;
    }

    /**
     * Genera recomendaciones
     */
    generateRecommendations(updateRequest, policy, conditions) {
        const recommendations = [];
        
        // Recomendaciones de vulnerabilidad
        if (conditions.vulnerabilityScore.level !== 'none') {
            recommendations.push({
                type: 'security',
                priority: conditions.vulnerabilityScore.level,
                message: `Vulnerabilidades detectadas: ${conditions.vulnerabilityScore.details.total} (${conditions.vulnerabilityScore.level})`,
                action: conditions.vulnerabilityScore.action
            });
        }
        
        // Recomendaciones de compatibilidad
        if (conditions.compatibilityScore.status !== 'excellent') {
            recommendations.push({
                type: 'compatibility',
                priority: conditions.compatibilityScore.status === 'poor' ? 'high' : 'medium',
                message: `Compatibilidad: ${conditions.compatibilityScore.score}% (${conditions.compatibilityScore.status})`,
                action: conditions.compatibilityScore.action
            });
        }
        
        // Recomendaciones de rendimiento
        if (conditions.performanceImpact.level !== 'minimal') {
            recommendations.push({
                type: 'performance',
                priority: conditions.performanceImpact.level === 'severe' ? 'high' : 'medium',
                message: `Impacto en rendimiento: ${conditions.performanceImpact.impact}% (${conditions.performanceImpact.level})`,
                action: conditions.performanceImpact.action
            });
        }
        
        // Recomendaciones de ventana de mantenimiento
        if (conditions.maintenanceWindow.required && !conditions.maintenanceWindow.available) {
            recommendations.push({
                type: 'maintenance',
                priority: 'medium',
                message: 'Requiere ventana de mantenimiento',
                action: 'schedule',
                nextWindow: conditions.maintenanceWindow.nextWindow
            });
        }
        
        // Recomendaciones de prueba
        if (conditions.testingRequirements.action === 'required') {
            recommendations.push({
                type: 'testing',
                priority: 'high',
                message: 'Se requieren pruebas de compatibilidad y rendimiento',
                action: 'run_tests'
            });
        }
        
        // Recomendaciones de rollback
        if (conditions.rollbackRequirements.action === 'required') {
            recommendations.push({
                type: 'rollback',
                priority: 'high',
                message: 'Se requiere plan de rollback y backup',
                action: 'prepare_rollback'
            });
        }
        
        return recommendations;
    }

    /**
     * Crea una solicitud de aprobación
     */
    async createApprovalRequest(updateRequest, evaluation) {
        try {
            const approvalRequest = {
                id: this.generateId(),
                requestId: updateRequest.id,
                timestamp: new Date().toISOString(),
                status: 'pending',
                policy: evaluation.policy,
                requester: updateRequest.requester || 'system',
                approvers: this.policies[evaluation.policy].rules.approvers,
                conditions: evaluation.conditions,
                recommendations: evaluation.recommendations,
                deadline: new Date(Date.now() + this.options.maxApprovalTime).toISOString(),
                approvals: [],
                rejections: [],
                comments: [],
                metadata: {
                    updateRequest,
                    evaluation
                }
            };
            
            // Agregar a la cola
            this.approvalQueue.push(approvalRequest);
            await this.saveApprovalQueue();
            
            // Registrar en auditoría
            await this.addAuditLog({
                type: 'approval_request',
                action: 'created',
                requestId: updateRequest.id,
                approvalId: approvalRequest.id,
                details: approvalRequest
            });
            
            // Enviar notificaciones
            await this.sendApprovalNotifications(approvalRequest);
            
            this.emit('approval:created', approvalRequest);
            
            console.log(`📋 Solicitud de aprobación creada: ${approvalRequest.id}`);
            
            return approvalRequest;
        } catch (error) {
            await this.addAuditLog({
                type: 'error',
                action: 'approval_request_failed',
                requestId: updateRequest.id,
                error: error.message
            });
            
            throw new Error(`Error creando solicitud de aprobación: ${error.message}`);
        }
    }

    /**
     * Aprueba una solicitud
     */
    async approveRequest(approvalId, approver, comment = null) {
        try {
            const request = this.findApprovalRequest(approvalId);
            if (!request) {
                throw new Error(`Solicitud de aprobación no encontrada: ${approvalId}`);
            }
            
            if (request.status !== 'pending') {
                throw new Error(`Solicitud no está pendiente: ${request.status}`);
            }
            
            // Verificar que el aprobador esté autorizado
            if (!request.approvers.includes(approver)) {
                throw new Error(`Aprobador no autorizado: ${approver}`);
            }
            
            // Agregar aprobación
            request.approvals.push({
                approver,
                timestamp: new Date().toISOString(),
                comment
            });
            
            // Verificar si se ha alcanzado el quórum
            const requiredApprovals = Math.ceil(request.approvers.length / 2);
            const hasQuorum = request.approvals.length >= requiredApprovals;
            
            if (hasQuorum) {
                request.status = 'approved';
                request.approvedAt = new Date().toISOString();
                
                // Ejecutar actualización
                await this.executeApprovedUpdate(request);
            }
            
            // Guardar cambios
            await this.saveApprovalQueue();
            
            // Registrar en auditoría
            await this.addAuditLog({
                type: 'approval',
                action: 'approved',
                approvalId,
                approver,
                comment,
                status: request.status
            });
            
            // Enviar notificaciones
            await this.sendApprovalStatusNotifications(request);
            
            this.emit('approval:updated', request);
            
            console.log(`✅ Solicitud aprobada por ${approver}: ${approvalId}`);
            
            return request;
        } catch (error) {
            await this.addAuditLog({
                type: 'error',
                action: 'approval_failed',
                approvalId,
                approver,
                error: error.message
            });
            
            throw new Error(`Error aprobando solicitud: ${error.message}`);
        }
    }

    /**
     * Rechaza una solicitud
     */
    async rejectRequest(approvalId, approver, reason, comment = null) {
        try {
            const request = this.findApprovalRequest(approvalId);
            if (!request) {
                throw new Error(`Solicitud de aprobación no encontrada: ${approvalId}`);
            }
            
            if (request.status !== 'pending') {
                throw new Error(`Solicitud no está pendiente: ${request.status}`);
            }
            
            // Verificar que el aprobador esté autorizado
            if (!request.approvers.includes(approver)) {
                throw new Error(`Aprobador no autorizado: ${approver}`);
            }
            
            // Agregar rechazo
            request.rejections.push({
                approver,
                reason,
                timestamp: new Date().toISOString(),
                comment
            });
            
            // Cambiar estado
            request.status = 'rejected';
            request.rejectedAt = new Date().toISOString();
            
            // Guardar cambios
            await this.saveApprovalQueue();
            
            // Registrar en auditoría
            await this.addAuditLog({
                type: 'approval',
                action: 'rejected',
                approvalId,
                approver,
                reason,
                comment
            });
            
            // Enviar notificaciones
            await this.sendApprovalStatusNotifications(request);
            
            this.emit('approval:updated', request);
            
            console.log(`❌ Solicitud rechazada por ${approver}: ${approvalId} - ${reason}`);
            
            return request;
        } catch (error) {
            await this.addAuditLog({
                type: 'error',
                action: 'rejection_failed',
                approvalId,
                approver,
                error: error.message
            });
            
            throw new Error(`Error rechazando solicitud: ${error.message}`);
        }
    }

    /**
     * Encuentra una solicitud de aprobación
     */
    findApprovalRequest(approvalId) {
        return this.approvalQueue.find(request => request.id === approvalId);
    }

    /**
     * Ejecuta una actualización aprobada
     */
    async executeApprovedUpdate(approvalRequest) {
        try {
            console.log(`🚀 Ejecutando actualización aprobada: ${approvalRequest.requestId}`);
            
            // Aquí se integraría con el DependencyUpdater
            // Por ahora, simulamos la ejecución
            
            const execution = {
                approvalId: approvalRequest.id,
                requestId: approvalRequest.requestId,
                startedAt: new Date().toISOString(),
                status: 'executing',
                steps: []
            };
            
            // Paso 1: Crear backup
            execution.steps.push({
                step: 'backup',
                status: 'completed',
                timestamp: new Date().toISOString()
            });
            
            // Paso 2: Ejecutar actualización
            execution.steps.push({
                step: 'update',
                status: 'completed',
                timestamp: new Date().toISOString()
            });
            
            // Paso 3: Verificar actualización
            execution.steps.push({
                step: 'verification',
                status: 'completed',
                timestamp: new Date().toISOString()
            });
            
            execution.completedAt = new Date().toISOString();
            execution.status = 'completed';
            
            // Actualizar estado de la solicitud
            approvalRequest.status = 'executed';
            approvalRequest.execution = execution;
            
            // Guardar cambios
            await this.saveApprovalQueue();
            
            // Registrar en auditoría
            await this.addAuditLog({
                type: 'execution',
                action: 'update_executed',
                approvalId: approvalRequest.id,
                requestId: approvalRequest.requestId,
                details: execution
            });
            
            this.emit('update:executed', { approvalRequest, execution });
            
            console.log(`✅ Actualización ejecutada correctamente: ${approvalRequest.requestId}`);
            
            return execution;
        } catch (error) {
            // Marcar como fallido
            approvalRequest.status = 'execution_failed';
            approvalRequest.error = error.message;
            
            await this.saveApprovalQueue();
            
            await this.addAuditLog({
                type: 'error',
                action: 'execution_failed',
                approvalId: approvalRequest.id,
                requestId: approvalRequest.requestId,
                error: error.message
            });
            
            throw new Error(`Error ejecutando actualización: ${error.message}`);
        }
    }

    /**
     * Envía notificaciones de aprobación
     */
    async sendApprovalNotifications(approvalRequest) {
        try {
            const notification = {
                type: 'approval_request',
                id: approvalRequest.id,
                requestId: approvalRequest.requestId,
                policy: approvalRequest.policy,
                deadline: approvalRequest.deadline,
                approvers: approvalRequest.approvers,
                recommendations: approvalRequest.recommendations
            };
            
            // Aquí se integraría con sistemas de notificación reales
            console.log(`📧 Enviando notificaciones de aprobación a: ${approvalRequest.approvers.join(', ')}`);
            
            this.emit('notification:sent', notification);
            
            return notification;
        } catch (error) {
            console.error('❌ Error enviando notificaciones:', error.message);
        }
    }

    /**
     * Envía notificaciones de estado de aprobación
     */
    async sendApprovalStatusNotifications(approvalRequest) {
        try {
            const notification = {
                type: 'approval_status',
                id: approvalRequest.id,
                requestId: approvalRequest.requestId,
                status: approvalRequest.status,
                approvals: approvalRequest.approvals.length,
                rejections: approvalRequest.rejections.length,
                approvers: approvalRequest.approvers
            };
            
            console.log(`📧 Enviando notificación de estado: ${approvalRequest.status}`);
            
            this.emit('notification:sent', notification);
            
            return notification;
        } catch (error) {
            console.error('❌ Error enviando notificaciones de estado:', error.message);
        }
    }

    /**
     * Procesa solicitudes expiradas
     */
    async processExpiredRequests() {
        try {
            const now = new Date();
            const expiredRequests = this.approvalQueue.filter(request => 
                request.status === 'pending' && 
                new Date(request.deadline) < now
            );
            
            for (const request of expiredRequests) {
                request.status = 'expired';
                request.expiredAt = now.toISOString();
                
                await this.addAuditLog({
                    type: 'approval',
                    action: 'expired',
                    approvalId: request.id,
                    requestId: request.requestId
                });
                
                await this.sendApprovalStatusNotifications(request);
            }
            
            if (expiredRequests.length > 0) {
                await this.saveApprovalQueue();
                console.log(`⏰ Procesadas ${expiredRequests.length} solicitudes expiradas`);
            }
            
            return expiredRequests.length;
        } catch (error) {
            console.error('❌ Error procesando solicitudes expiradas:', error.message);
            return 0;
        }
    }

    /**
     * Agrega ventana de mantenimiento
     */
    async addMaintenanceWindow(window) {
        try {
            const maintenanceWindow = {
                id: this.generateId(),
                ...window,
                createdAt: new Date().toISOString()
            };
            
            this.maintenanceSchedule.push(maintenanceWindow);
            await this.saveMaintenanceSchedule();
            
            await this.addAuditLog({
                type: 'maintenance',
                action: 'window_added',
                windowId: maintenanceWindow.id,
                details: maintenanceWindow
            });
            
            console.log(`📅 Ventana de mantenimiento agregada: ${maintenanceWindow.start} - ${maintenanceWindow.end}`);
            
            return maintenanceWindow;
        } catch (error) {
            console.error('❌ Error agregando ventana de mantenimiento:', error.message);
            throw error;
        }
    }

    /**
     * Elimina ventana de mantenimiento
     */
    async removeMaintenanceWindow(windowId) {
        try {
            const index = this.maintenanceSchedule.findIndex(w => w.id === windowId);
            if (index === -1) {
                throw new Error(`Ventana de mantenimiento no encontrada: ${windowId}`);
            }
            
            const removed = this.maintenanceSchedule.splice(index, 1)[0];
            await this.saveMaintenanceSchedule();
            
            await this.addAuditLog({
                type: 'maintenance',
                action: 'window_removed',
                windowId,
                details: removed
            });
            
            console.log(`🗑️ Ventana de mantenimiento eliminada: ${windowId}`);
            
            return removed;
        } catch (error) {
            console.error('❌ Error eliminando ventana de mantenimiento:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de aprobación
     */
    getApprovalStatistics() {
        const stats = {
            total: this.approvalQueue.length,
            pending: this.approvalQueue.filter(r => r.status === 'pending').length,
            approved: this.approvalQueue.filter(r => r.status === 'approved').length,
            rejected: this.approvalQueue.filter(r => r.status === 'rejected').length,
            expired: this.approvalQueue.filter(r => r.status === 'expired').length,
            executed: this.approvalQueue.filter(r => r.status === 'executed').length,
            byPolicy: {},
            averageApprovalTime: 0,
            approverStats: {}
        };
        
        // Estadísticas por política
        for (const request of this.approvalQueue) {
            if (!stats.byPolicy[request.policy]) {
                stats.byPolicy[request.policy] = {
                    total: 0,
                    approved: 0,
                    rejected: 0,
                    expired: 0
                };
            }
            
            stats.byPolicy[request.policy].total++;
            if (request.status === 'approved' || request.status === 'executed') {
                stats.byPolicy[request.policy].approved++;
            } else if (request.status === 'rejected') {
                stats.byPolicy[request.policy].rejected++;
            } else if (request.status === 'expired') {
                stats.byPolicy[request.policy].expired++;
            }
        }
        
        // Estadísticas de aprobadores
        for (const request of this.approvalQueue) {
            for (const approval of request.approvals) {
                if (!stats.approverStats[approval.approver]) {
                    stats.approverStats[approval.approver] = {
                        approvals: 0,
                        rejections: 0,
                        averageTime: 0
                    };
                }
                stats.approverStats[approval.approver].approvals++;
            }
            
            for (const rejection of request.rejections) {
                if (!stats.approverStats[rejection.approver]) {
                    stats.approverStats[rejection.approver] = {
                        approvals: 0,
                        rejections: 0,
                        averageTime: 0
                    };
                }
                stats.approverStats[rejection.approver].rejections++;
            }
        }
        
        return stats;
    }

    /**
     * Obtiene historial de auditoría
     */
    async getAuditHistory(options = {}) {
        const {
            limit = 100,
            offset = 0,
            type = null,
            action = null,
            startDate = null,
            endDate = null
        } = options;
        
        let filtered = [...this.auditLog];
        
        // Filtrar por tipo
        if (type) {
            filtered = filtered.filter(entry => entry.type === type);
        }
        
        // Filtrar por acción
        if (action) {
            filtered = filtered.filter(entry => entry.action === action);
        }
        
        // Filtrar por fecha
        if (startDate) {
            const start = new Date(startDate);
            filtered = filtered.filter(entry => new Date(entry.timestamp) >= start);
        }
        
        if (endDate) {
            const end = new Date(endDate);
            filtered = filtered.filter(entry => new Date(entry.timestamp) <= end);
        }
        
        // Ordenar por timestamp (más reciente primero)
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Aplicar paginación
        const paginated = filtered.slice(offset, offset + limit);
        
        return {
            entries: paginated,
            total: filtered.length,
            offset,
            limit
        };
    }

    /**
     * Exporta configuración de políticas
     */
    async exportPolicies() {
        return {
            policies: this.policies,
            maintenanceSchedule: this.maintenanceSchedule,
            configuration: {
                approvalRequired: this.options.approvalRequired,
                autoApproveSafeUpdates: this.options.autoApproveSafeUpdates,
                maxApprovalTime: this.options.maxApprovalTime,
                rollbackEnabled: this.options.rollbackEnabled,
                notificationChannels: this.options.notificationChannels,
                approvers: this.options.approvers
            },
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Importa configuración de políticas
     */
    async importPolicies(config) {
        try {
            if (config.policies) {
                this.policies = config.policies;
                await this.savePolicies();
            }
            
            if (config.maintenanceSchedule) {
                this.maintenanceSchedule = config.maintenanceSchedule;
                await this.saveMaintenanceSchedule();
            }
            
            if (config.configuration) {
                Object.assign(this.options, config.configuration);
            }
            
            await this.addAuditLog({
                type: 'configuration',
                action: 'policies_imported',
                details: config
            });
            
            console.log('📥 Configuración de políticas importada correctamente');
            
            return true;
        } catch (error) {
            console.error('❌ Error importando políticas:', error.message);
            throw error;
        }
    }
}

module.exports = UpdatePolicyManager;