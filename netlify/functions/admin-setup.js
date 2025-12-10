const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Importar sistemas de seguridad
const PasswordSecurity = require('./password-security.js');

class AdminSetup {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_URL.includes('sslmode=disable') ? false : {
                rejectUnauthorized: true
            }
        });
    }

    // Verificar si ya existe algún administrador
    async hasAdminUsers() {
        try {
            const result = await this.pool.query(
                'SELECT COUNT(*) as count FROM profiles WHERE role = $1',
                ['admin']
            );
            return parseInt(result.rows[0].count) > 0;
        } catch (error) {
            console.error('Error verificando administradores:', error);
            throw error;
        }
    }

    // Crear primer administrador de forma segura
    async createFirstAdmin(adminData) {
        const { email, password, fullName } = adminData;

        // Validaciones de seguridad
        if (!email || !password || !fullName) {
            throw new Error('Email, contraseña y nombre completo son requeridos');
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Formato de email inválido');
        }

        // Validar fortaleza de contraseña
        const passwordValidation = PasswordSecurity.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            throw new Error(`Contraseña insegura: ${passwordValidation.issues.join(', ')}`);
        }

        // Verificar que no exista el email
        const existingUser = await this.pool.query(
            'SELECT id FROM profiles WHERE email = $1',
            [email]
        );
        if (existingUser.rows.length > 0) {
            throw new Error('El email ya está registrado');
        }

        try {
            // Hashear contraseña de forma segura
            const passwordHash = await PasswordSecurity.hashPassword(password);
            
            // Crear administrador
            const adminId = uuidv4();
            await this.pool.query(`
                INSERT INTO profiles (id, email, full_name, password_hash, role, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            `, [adminId, email, fullName, passwordHash, 'admin']);

            // Logging de creación de administrador
            PasswordSecurity.logSecurityEvent('admin_created', {
                adminId,
                email,
                timestamp: new Date().toISOString(),
                setupMethod: 'secure_initialization'
            });

            return {
                success: true,
                adminId,
                email,
                message: 'Administrador creado exitosamente'
            };

        } catch (error) {
            console.error('Error creando administrador:', error);
            throw new Error('Error al crear administrador: ' + error.message);
        }
    }

    // Verificar si el sistema necesita inicialización
    async needsInitialization() {
        try {
            const hasAdmins = await this.hasAdminUsers();
            return !hasAdmins;
        } catch (error) {
            console.error('Error verificando inicialización:', error);
            // En caso de error, asumimos que necesita inicialización por seguridad
            return true;
        }
    }

    // Obtener estado de la inicialización
    async getInitializationStatus() {
        try {
            const hasAdmins = await this.hasAdminUsers();
            const totalUsers = await this.pool.query('SELECT COUNT(*) as count FROM profiles');
            
            return {
                needsInitialization: !hasAdmins,
                hasAdminUsers: hasAdmins,
                totalUsers: parseInt(totalUsers.rows[0].count),
                message: hasAdmins 
                    ? 'Sistema ya inicializado con administradores'
                    : 'Sistema requiere inicialización de administrador'
            };
        } catch (error) {
            console.error('Error obteniendo estado:', error);
            return {
                needsInitialization: true,
                hasAdminUsers: false,
                totalUsers: 0,
                message: 'No se pudo verificar el estado del sistema',
                error: error.message
            };
        }
    }

    // Validar token de inicialización (opcional, para mayor seguridad)
    generateSetupToken() {
        const token = require('crypto').randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
        
        return {
            token,
            expires: expires.toISOString(),
            message: 'Guarde este token de forma segura. Expira en 24 horas.'
        };
    }

    // Cerrar conexiones
    async close() {
        await this.pool.end();
    }
}

module.exports = AdminSetup;