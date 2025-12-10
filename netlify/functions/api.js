const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Importar sistemas de seguridad
const RateLimiterMiddleware = require('./rate-limit-middleware.js');
const PasswordSecurity = require('./password-security.js');
const CSRFMiddleware = require('./csrf-middleware.js');

// Importar sistema de optimización de consultas
const QueryOptimizer = require('../components/query-optimizer.js');
const QueryBuilder = require('../components/query-builder.js');
const DatabaseManager = require('../components/database-manager.js');
const QueryAnalyzer = require('../components/query-analyzer.js');
const QueryCache = require('../components/query-cache.js');

const app = express();

// Content Security Policy headers para protección XSS
const setCSPHeaders = (req, res, next) => {
  // Política CSP estricta para prevenir XSS
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.openai.com; " +
    "frame-src 'self'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none'; " +
    "upgrade-insecure-requests"
  );
  
  // Headers de seguridad adicionales
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

app.use(cors());
app.use(express.json());
app.use(setCSPHeaders);

// Aplicar rate limiting global a todas las rutas
app.use(RateLimiterMiddleware.middleware());

// Inicializar sistema CSRF
const csrfProtection = CSRFMiddleware.middleware();
const csrfTokenGenerator = CSRFMiddleware.tokenGenerator();

// Database connection with flexible SSL configuration
const createSecurePool = () => {
  const connectionString = process.env.DATABASE_URL;
  const isSSLDisabled = connectionString && connectionString.includes('sslmode=disable');
  
  // Base configuration
  const config = {
    connectionString: connectionString,
  };

  // Only apply SSL config if NOT disabled
  if (!isSSLDisabled) {
      config.ssl = {
        rejectUnauthorized: true, // Default to secure
        checkServerIdentity: () => undefined,
      };
      
      // Allow override from env vars
      if (process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
          config.ssl.rejectUnauthorized = false;
      }
  } else {
      console.log('⚠️ SSL desactivado explícitamente por configuración (sslmode=disable)');
      // Explicitly disable SSL for pg
      config.ssl = false; 
  }

  return config;
};

// Create pool with secure configuration
const pool = new Pool(createSecurePool());

// Inicializar sistema de optimización de consultas
DatabaseManager.init().catch(error => {
    console.error('Error inicializando Database Manager:', error);
});

QueryOptimizer.init();
QueryAnalyzer.init();
QueryCache.init();

// Enhanced error handling for SSL connection issues
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de conexión:', err);
  
  // Specific SSL error handling
  if (err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    console.error('🚨 ERROR SSL: No se puede verificar el certificado del servidor');
    console.error('🚨 Posibles causas:');
    console.error('   - Certificado autofirmado sin CA configurada');
    console.error('   - Certificado expirado o inválido');
    console.error('   - Configuración de red incorrecta');
  } else if (err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
    console.error('🚨 ERROR SSL: Certificado autofirmado detectado');
    console.error('🚨 En producción, use certificados emitidos por una CA confiable');
  } else if (err.code === 'CERT_HAS_EXPIRED') {
    console.error('🚨 ERROR SSL: El certificado ha expirado');
    console.error('🚨 Renueve el certificado inmediatamente');
  }
});

// Connection validation function
const validateSSLConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    client.release();
    
    console.log('✅ Conexión SSL validada exitosamente');
    console.log('📊 Base de datos conectada:', result.rows[0].postgres_version.split(' ')[0]);
    
    return { success: true, time: result.rows[0].current_time };
  } catch (err) {
    console.error('❌ Error validando conexión SSL:', err.message);
    
    // Enhanced error reporting for SSL issues
    if (err.message.includes('SSL')) {
      console.error('🔍 Detalles del error SSL:', {
        code: err.code,
        severity: err.severity,
        detail: err.detail,
        hint: err.hint
      });
      
      // Provide actionable guidance
      if (process.env.NODE_ENV === 'production') {
        console.error('🚨 ACCIÓN REQUERIDA: La conexión SSL falló en producción');
        console.error('🚨 Revise la configuración del certificado y la cadena de confianza');
      }
    }
    
    return { success: false, error: err.message, code: err.code };
  }
};

// Validate connection on startup
validateSSLConnection();

// Validación CRÍTICA de JWT_SECRET para seguridad
const validateJWTSecret = () => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    console.error('🚨 VULNERABILIDAD CRÍTICA: JWT_SECRET no está configurado');
    console.error('🚨 Esto compromete toda la autenticación del sistema');
    console.error('🚨 ACCIÓN REQUERIDA: Configure JWT_SECRET en variables de entorno');
    console.error('🚨 Comando para generar secreto seguro: node -e "const crypto = require(\'crypto\'); console.log(crypto.randomBytes(64).toString(\'hex\'));"');
    process.exit(1); // Detener ejecución por seguridad
  }
  
  // Validar longitud mínima (mínimo 64 caracteres recomendado)
  if (jwtSecret.length < 64) {
    console.error('🚨 VULNERABILIDAD CRÍTICA: JWT_SECRET demasiado corto');
    console.error(`🚨 Longitud actual: ${jwtSecret.length} caracteres (mínimo 64 recomendado)`);
    console.error('🚨 Un secreto corto es vulnerable a ataques de fuerza bruta');
    console.error('🚨 ACCIÓN REQUERIDA: Use un JWT_SECRET de al menos 64 caracteres');
    process.exit(1); // Detener ejecución por seguridad
  }
  
  // Validar que no sea un valor por defecto o inseguro
  const insecurePatterns = [
    /secret/i,
    /default/i,
    /example/i,
    /test/i,
    /justice2-secret-key/,
    /GENERATE/,
    /temporal/i,
    /demo/i
  ];
  
  for (const pattern of insecurePatterns) {
    if (pattern.test(jwtSecret)) {
      console.error('🚨 VULNERABILIDAD CRÍTICA: JWT_SECRET contiene patrón inseguro');
      console.error('🚨 El secreto parece ser un valor por defecto o de ejemplo');
      console.error('🚨 ACCIÓN REQUERIDA: Genere un JWT_SECRET único y seguro');
      process.exit(1); // Detener ejecución por seguridad
    }
  }
  
  console.log('✅ JWT_SECRET validado correctamente');
  console.log(`🔐 Longitud del secreto: ${jwtSecret.length} caracteres`);
  return jwtSecret;
};

// Configuración JWT con validación estricta
const JWT_CONFIG = {
  secret: validateJWTSecret(), // Validación crítica al iniciar
  algorithm: 'HS256',
  expiresIn: '24h',
  issuer: 'justice2',
  audience: 'justice2-client'
};

// Helper to check auth token con validación completa
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Token no proporcionado',
      code: 'TOKEN_MISSING'
    });
  }

  // Verificar formato del token
  const parts = token.split('.');
  if (parts.length !== 3) {
    return res.status(401).json({
      error: 'Token con formato inválido',
      code: 'TOKEN_INVALID_FORMAT'
    });
  }

  // Opciones de verificación JWT
  const verifyOptions = {
    algorithm: [JWT_CONFIG.algorithm],
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
    maxAge: '24h' // Tiempo máximo de vida del token
  };

  jwt.verify(token, JWT_CONFIG.secret, verifyOptions, (err, user) => {
    if (err) {
      console.error('Error verificando token:', err.message);
      
      // Mensajes específicos según el error
      let errorMessage = 'Token inválido';
      let errorCode = 'TOKEN_INVALID';
      
      if (err.name === 'TokenExpiredError') {
        errorMessage = 'Token expirado';
        errorCode = 'TOKEN_EXPIRED';
      } else if (err.name === 'JsonWebTokenError') {
        errorMessage = 'Token malformed';
        errorCode = 'TOKEN_MALFORMED';
      } else if (err.name === 'NotBeforeError') {
        errorMessage = 'Token no válido aún';
        errorCode = 'TOKEN_NOT_BEFORE';
      }
      
      return res.status(403).json({
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    
    // Verificar claims adicionales
    if (!user.sub || !user.iat || !user.exp) {
        return res.status(403).json({
            error: 'Token con claims incompletos',
            code: 'TOKEN_INCOMPLETE_CLAIMS'
        });
    }
    
    // Validar que el subject (sub) sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user.sub)) {
        return res.status(403).json({
            error: 'Token con subject inválido',
            code: 'TOKEN_INVALID_SUBJECT'
        });
    }
    
    // Validar que el issuer sea el esperado
    if (user.iss !== JWT_CONFIG.issuer) {
        return res.status(403).json({
            error: 'Token con issuer inválido',
            code: 'TOKEN_INVALID_ISSUER'
        });
    }
    
    // Validar que la audience sea la esperada
    if (user.aud !== JWT_CONFIG.audience) {
        return res.status(403).json({
            error: 'Token con audience inválida',
            code: 'TOKEN_INVALID_AUDIENCE'
        });
    }
    
    // Validar que el token no sea demasiado antiguo (máximo 24 horas)
    const maxAge = 24 * 60 * 60; // 24 horas en segundos
    if (Math.floor(Date.now() / 1000) - user.iat > maxAge) {
        return res.status(403).json({
            error: 'Token demasiado antiguo',
            code: 'TOKEN_TOO_OLD'
        });
    }
    
    req.user = user;
    req.token = token;
    next();
  });
};

const router = express.Router();

// --- CSRF TOKEN ENDPOINT ---

// Endpoint para obtener token CSRF (público pero con rate limiting)
router.get('/csrf/token', RateLimiterMiddleware.publicMiddleware(), (req, res) => {
    try {
        const token = csrfTokenGenerator.generateToken(req);
        
        // Configurar cookie segura para el token
        res.cookie('csrf-token', token, {
            httpOnly: false, // El cliente necesita leerlo para enviarlo
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 60 * 1000, // 30 minutos
            path: '/'
        });
        
        res.json({
            token: token,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            message: 'Token CSRF generado exitosamente'
        });
    } catch (error) {
        console.error('Error generando token CSRF:', error);
        res.status(500).json({
            error: 'Error generando token CSRF',
            code: 'CSRF_TOKEN_GENERATION_ERROR'
        });
    }
});

// Endpoint para validar token CSRF
router.post('/csrf/validate', RateLimiterMiddleware.publicMiddleware(), (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                error: 'Token CSRF es requerido',
                code: 'CSRF_TOKEN_MISSING'
            });
        }
        
        const isValid = csrfTokenGenerator.validateToken(token, req);
        
        if (isValid) {
            res.json({
                valid: true,
                message: 'Token CSRF válido'
            });
        } else {
            res.status(403).json({
                valid: false,
                error: 'Token CSRF inválido o expirado',
                code: 'CSRF_TOKEN_INVALID'
            });
        }
    } catch (error) {
        console.error('Error validando token CSRF:', error);
        res.status(500).json({
            error: 'Error validando token CSRF',
            code: 'CSRF_VALIDATION_ERROR'
        });
    }
});

// --- AUTH ROUTES ---

// Login - Rate limiting estricto para autenticación con verificación segura de contraseñas
router.post('/auth/login', RateLimiterMiddleware.authMiddleware(), csrfProtection, async (req, res) => {
    const { email, password } = req.body;
    
    // Validación básica de entrada
    if (!email || !password) {
        return res.status(400).json({
            error: 'Email y contraseña son requeridos',
            code: 'MISSING_CREDENTIALS'
        });
    }

    // Validar formato de email con regex más robusta y segura
    const robustEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    // Validación completa del email
    if (!email || typeof email !== 'string') {
        return res.status(400).json({
            error: 'Email es requerido y debe ser un texto',
            code: 'EMAIL_REQUIRED'
        });
    }
    
    // Validar longitud mínima y máxima del email
    if (email.length < 3 || email.length > 254) {
        return res.status(400).json({
            error: 'Email debe tener entre 3 y 254 caracteres',
            code: 'EMAIL_INVALID_LENGTH'
        });
    }
    
    // Validar formato con regex
    if (!robustEmailRegex.test(email)) {
        return res.status(400).json({
            error: 'Formato de email inválido',
            code: 'INVALID_EMAIL_FORMAT'
        });
    }
    
    // Validar que no tenga caracteres peligrosos o patrones de inyección
    const dangerousPatterns = [
        /<[^>]*>/,           // Etiquetas HTML
        /javascript:/i,        // Protocolo JavaScript
        /vbscript:/i,         // Protocolo VBScript
        /data:/i,             // Protocolo Data
        /on\w+\s*=/i,       // Event handlers
        /['"]/g               // Comillas que podrían causar inyección
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(email)) {
            return res.status(400).json({
                error: 'Email contiene caracteres o patrones no permitidos',
                code: 'EMAIL_DANGEROUS_CONTENT'
            });
        }
    }
    
    // Validar que no sea un email conocido como peligroso o de prueba
    const suspiciousDomains = ['test.com', 'example.com', 'tempmail.com', '10minutemail.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (suspiciousDomains.includes(emailDomain)) {
        return res.status(400).json({
            error: 'Email de dominio no permitido',
            code: 'EMAIL_SUSPICIOUS_DOMAIN'
        });
    }

    try {
        // 🚨 ELIMINADO: Acceso sin autenticación real eliminado por seguridad
        // Ya no se permiten usuarios con privilegios por defecto

        // Verificar rate limiting por email
        const lockStatus = PasswordSecurity.isUserLocked(email);
        if (lockStatus.locked) {
            return res.status(429).json({
                error: 'Cuenta temporalmente bloqueada por demasiados intentos fallidos',
                code: 'ACCOUNT_LOCKED',
                retryAfter: lockStatus.remainingTime,
                attempts: lockStatus.attempts
            });
        }

        // Buscar usuario en la base de datos usando Query Builder
        const query = QueryBuilder
            .select(['id', 'email', 'full_name', 'password_hash', 'role', 'created_at', 'updated_at'])
            .from('profiles')
            .whereEquals('email', email)
            .limit(1)
            .build();
        
        const optimizedQuery = QueryOptimizer.optimizeQuery(query.sql, query.params, {
            priority: 'high',
            cacheTTL: 300000 // 5 minutos para datos de usuario
        });
        
        const result = await DatabaseManager.query(optimizedQuery.sql, optimizedQuery.params);
        
        if (result.rows.length === 0) {
            // Registrar intento fallido para prevención de enumeración
            PasswordSecurity.recordFailedLogin(email);
            
            return res.status(401).json({
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const user = result.rows[0];
        
        // Verificar si el usuario tiene contraseña hasheada
        if (!user.password_hash) {
            // Usuario sin contraseña - podría ser usuario antiguo o demo
            PasswordSecurity.recordFailedLogin(email);
            
            return res.status(401).json({
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Verificación segura de contraseña (timing attack resistant)
        const isPasswordValid = await PasswordSecurity.verifyPassword(password, user.password_hash);
        
        if (!isPasswordValid) {
            // Registrar intento fallido
            PasswordSecurity.recordFailedLogin(email);
            
            return res.status(401).json({
                error: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Limpiar intentos fallidos después de login exitoso
        PasswordSecurity.clearFailedLogins(email);
        
        // Crear token con claims estándar y seguridad mejorada
        const now = Math.floor(Date.now() / 1000);
        const tokenPayload = {
            sub: user.id,           // Subject (ID del usuario)
            iss: JWT_CONFIG.issuer, // Issuer (emisor)
            aud: JWT_CONFIG.audience, // Audience (audiencia)
            iat: now,              // Issued at (emitido en)
            exp: now + (24 * 60 * 60), // Expires in (expira en 24h)
            nbf: now,              // Not before (no válido antes de ahora)
            jti: require('uuid').v4(), // JWT ID (identificador único)
            email: user.email,
            role: user.role || 'user'
        };
        
        const token = jwt.sign(tokenPayload, JWT_CONFIG.secret, {
            algorithm: JWT_CONFIG.algorithm,
            expiresIn: JWT_CONFIG.expiresIn
        });
        
        // Logging de login exitoso
        PasswordSecurity.logSecurityEvent('successful_login', {
            userId: user.id,
            email: user.email,
            timestamp: new Date().toISOString()
        });
        
        // No devolver el hash de contraseña en la respuesta
        const { password_hash, ...userWithoutPassword } = user;
        
        res.json({ token, user: userWithoutPassword });

    } catch (err) {
        console.error('Error en login:', err);
        
        // Logging de error de autenticación
        PasswordSecurity.logSecurityEvent('login_error', {
            email,
            error: err.message,
            timestamp: new Date().toISOString()
        });
        
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

// Register - Rate limiting estricto para registro con hashing seguro de contraseñas
router.post('/auth/register', RateLimiterMiddleware.authMiddleware(), csrfProtection, async (req, res) => {
    const { email, password, name } = req.body;
    
    // Validación básica de entrada
    if (!email || !password || !name) {
        return res.status(400).json({
            error: 'Email, contraseña y nombre son requeridos',
            code: 'MISSING_FIELDS'
        });
    }

    // Validar formato de email con regex más robusta y segura
    const robustEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    // Validación completa del email
    if (!email || typeof email !== 'string') {
        return res.status(400).json({
            error: 'Email es requerido y debe ser un texto',
            code: 'EMAIL_REQUIRED'
        });
    }
    
    // Validar longitud mínima y máxima del email
    if (email.length < 3 || email.length > 254) {
        return res.status(400).json({
            error: 'Email debe tener entre 3 y 254 caracteres',
            code: 'EMAIL_INVALID_LENGTH'
        });
    }
    
    // Validar formato con regex
    if (!robustEmailRegex.test(email)) {
        return res.status(400).json({
            error: 'Formato de email inválido',
            code: 'INVALID_EMAIL_FORMAT'
        });
    }
    
    // Validar que no tenga caracteres peligrosos o patrones de inyección
    const dangerousPatterns = [
        /<[^>]*>/,           // Etiquetas HTML
        /javascript:/i,        // Protocolo JavaScript
        /vbscript:/i,         // Protocolo VBScript
        /data:/i,             // Protocolo Data
        /on\w+\s*=/i,       // Event handlers
        /['"]/g               // Comillas que podrían causar inyección
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(email)) {
            return res.status(400).json({
                error: 'Email contiene caracteres o patrones no permitidos',
                code: 'EMAIL_DANGEROUS_CONTENT'
            });
        }
    }
    
    // Validar que no sea un email conocido como peligroso o de prueba
    const suspiciousDomains = ['test.com', 'example.com', 'tempmail.com', '10minutemail.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (suspiciousDomains.includes(emailDomain)) {
        return res.status(400).json({
            error: 'Email de dominio no permitido',
            code: 'EMAIL_SUSPICIOUS_DOMAIN'
        });
    }

    // Validar nombre de forma más robusta
    if (!name || typeof name !== 'string') {
        return res.status(400).json({
            error: 'El nombre es requerido y debe ser un texto',
            code: 'NAME_REQUIRED'
        });
    }
    
    // Validar longitud del nombre
    if (name.length < 2 || name.length > 100) {
        return res.status(400).json({
            error: 'El nombre debe tener entre 2 y 100 caracteres',
            code: 'INVALID_NAME_LENGTH'
        });
    }
    
    // Validar que no esté vacío o solo contenga espacios
    if (name.trim().length < 2) {
        return res.status(400).json({
            error: 'El nombre no puede estar vacío o contener solo espacios',
            code: 'NAME_EMPTY_OR_SPACES'
        });
    }
    
    // Validar caracteres permitidos del nombre
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
    if (!nameRegex.test(name)) {
        return res.status(400).json({
            error: 'El nombre solo puede contener letras, espacios, apóstrofes y guiones',
            code: 'INVALID_NAME_CHARACTERS'
        });
    }
    
    // Validar que no tenga secuencias peligrosas o patrones de inyección
    const dangerousPatterns = [
        /<script[^>]*>/i,           // Etiquetas script
        /<\/script>/i,               // Cierre de script
        /javascript:/i,              // Protocolo JavaScript
        /vbscript:/i,               // Protocolo VBScript
        /on\w+\s*=/i,             // Event handlers
        /data:/i,                   // Protocolo Data
        /expression\s*\(/i,          // Expresiones CSS
        /@import/i,                  // Importaciones CSS
        /<iframe/i,                 // Iframes
        /<object/i,                 // Objetos
        /<embed/i,                  // Embeds
        /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g // Caracteres de control
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(name)) {
            return res.status(400).json({
                error: 'El nombre contiene contenido no permitido',
                code: 'NAME_DANGEROUS_CONTENT'
            });
        }
    }
    
    // Validar que no sea un nombre común de ataque
    const attackNames = [
        'admin', 'administrator', 'root', 'system', 'test', 'demo',
        'null', 'undefined', 'eval', 'alert', 'prompt', 'confirm'
    ];
    
    if (attackNames.includes(name.toLowerCase().trim())) {
        return res.status(400).json({
            error: 'El nombre no es válido',
            code: 'NAME_RESERVED_OR_SUSPICIOUS'
        });
    }

    try {
        // 🚨 ELIMINADO: Usuario demo eliminado por seguridad
        // Ya no se permite registro sin autenticación real

        // Validar fortaleza de contraseña
        const passwordValidation = PasswordSecurity.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                error: 'Contraseña insegura',
                code: 'WEAK_PASSWORD',
                details: passwordValidation.issues,
                recommendations: passwordValidation.recommendations,
                strength: passwordValidation.strength,
                strengthLevel: passwordValidation.strengthLevel
            });
        }

        // Verificar si el email ya existe
        const existingUser = await pool.query('SELECT id FROM profiles WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'El email ya está registrado',
                code: 'EMAIL_ALREADY_EXISTS'
            });
        }

        // Hashear contraseña de forma segura
        const passwordHash = await PasswordSecurity.hashPassword(password);
        
        const id = uuidv4();
        
        // Insertar usuario con contraseña hasheada
        await pool.query(
            'INSERT INTO profiles (id, email, full_name, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
            [id, email, name, passwordHash]
        );
        
        // Crear token con claims estándar y seguridad mejorada
        const now = Math.floor(Date.now() / 1000);
        const tokenPayload = {
            sub: id,                // Subject (ID del usuario)
            iss: JWT_CONFIG.issuer, // Issuer (emisor)
            aud: JWT_CONFIG.audience, // Audience (audiencia)
            iat: now,              // Issued at (emitido en)
            exp: now + (24 * 60 * 60), // Expires in (expira en 24h)
            nbf: now,              // Not before (no válido antes de ahora)
            jti: require('uuid').v4(), // JWT ID (identificador único)
            email: email,
            role: 'user'
        };
        
        const token = jwt.sign(tokenPayload, JWT_CONFIG.secret, {
            algorithm: JWT_CONFIG.algorithm,
            expiresIn: JWT_CONFIG.expiresIn
        });
        
        // Logging de registro exitoso
        PasswordSecurity.logSecurityEvent('successful_registration', {
            userId: id,
            email: email,
            passwordStrength: passwordValidation.strength,
            timestamp: new Date().toISOString()
        });
        
        res.json({
            token,
            user: { id, email, full_name: name },
            passwordStrength: {
                score: passwordValidation.strength,
                level: passwordValidation.strengthLevel
            }
        });
    } catch (err) {
        console.error('Error en registro:', err);
        
        // Logging de error de registro
        PasswordSecurity.logSecurityEvent('registration_error', {
            email,
            error: err.message,
            timestamp: new Date().toISOString()
        });
        
        if (err.code === '23503') { // Foreign key violation
            res.status(400).json({
                error: 'El registro está restringido. Contacte al administrador del sistema',
                code: 'REGISTRATION_RESTRICTED'
            });
        } else if (err.message.includes('Contraseña insegura')) {
            res.status(400).json({
                error: err.message,
                code: 'WEAK_PASSWORD'
            });
        } else {
            res.status(500).json({
                error: 'Error interno del servidor',
                code: 'INTERNAL_SERVER_ERROR'
            });
        }
    }
});

// Profile - Rate limiting estándar para perfil
router.get('/auth/profile', RateLimiterMiddleware.apiMiddleware(), authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM profiles WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.sendStatus(404);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CASES ROUTES ---

router.get('/cases', RateLimiterMiddleware.apiMiddleware(), authenticateToken, async (req, res) => {
    try {
        // Usar Query Builder con paginación y optimización
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const query = QueryBuilder
            .select(['id', 'title', 'description', 'status', 'priority', 'client_id', 'created_at', 'updated_at'])
            .from('cases')
            .whereEquals('user_id', req.user.id)
            .orderByDesc('created_at')
            .limit(limit)
            .offset(offset)
            .build();
        
        const optimizedQuery = QueryOptimizer.optimizeQuery(query.sql, query.params, {
            priority: 'medium',
            cacheTTL: 60000 // 1 minuto para lista de casos
            forceIndex: 'idx_cases_user_id_created_at'
        });
        
        const result = await DatabaseManager.query(optimizedQuery.sql, optimizedQuery.params);
        
        // Analizar rendimiento de la consulta
        await QueryAnalyzer.analyzeQuery(
            optimizedQuery.sql,
            optimizedQuery.params,
            Date.now() - performance.now(),
            result
        );
        
        // Obtener conteo total para paginación
        const countQuery = QueryBuilder
            .select('COUNT(*) as total')
            .from('cases')
            .whereEquals('user_id', req.user.id)
            .build();
        
        const countResult = await DatabaseManager.query(countQuery.sql, countQuery.params);
        const totalCases = parseInt(countResult.rows[0].total);
        
        res.json({
            cases: result.rows,
            pagination: {
                page: page,
                limit: limit,
                total: totalCases,
                totalPages: Math.ceil(totalCases / limit),
                hasNext: page * limit < totalCases,
                hasPrev: page > 1
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/cases', RateLimiterMiddleware.apiMiddleware(), authenticateToken, csrfProtection, async (req, res) => {
    const { title, description, client_id, status, priority } = req.body;
    const id = uuidv4();
    try {
        const result = await pool.query(
            'INSERT INTO cases (id, user_id, client_id, title, description, status, priority, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *',
            [id, req.user.id, client_id, title, description, status || 'open', priority || 'medium']
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/cases/:id', RateLimiterMiddleware.apiMiddleware(), authenticateToken, async (req, res) => {
    try {
        // Usar Query Builder con JOIN optimizado
        const query = QueryBuilder
            .select([
                'c.id', 'c.title', 'c.description', 'c.status', 'c.priority',
                'c.created_at', 'c.updated_at',
                'cl.name as client_name', 'cl.email as client_email'
            ])
            .from('cases c')
            .leftJoin('clients cl', 'c.client_id = cl.id')
            .whereEquals('c.id', req.params.id)
            .whereEquals('c.user_id', req.user.id)
            .limit(1)
            .build();
        
        const optimizedQuery = QueryOptimizer.optimizeQuery(query.sql, query.params, {
            priority: 'high',
            cacheTTL: 300000 // 5 minutos para detalles de caso
            forceIndex: 'idx_cases_id_user_id'
        });
        
        const result = await DatabaseManager.query(optimizedQuery.sql, optimizedQuery.params);
        
        // Analizar rendimiento
        await QueryAnalyzer.analyzeQuery(
            optimizedQuery.sql,
            optimizedQuery.params,
            Date.now() - performance.now(),
            result
        );
        
        if (result.rows.length === 0) return res.sendStatus(404);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CLIENTS ROUTES ---

router.get('/clients', RateLimiterMiddleware.apiMiddleware(), authenticateToken, async (req, res) => {
    try {
        // Usar Query Builder con paginación y caché
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        
        const query = QueryBuilder
            .select(['id', 'name', 'email', 'phone', 'address', 'created_at', 'updated_at'])
            .from('clients')
            .whereEquals('user_id', req.user.id)
            .orderBy('name')
            .limit(limit)
            .offset(offset)
            .build();
        
        const optimizedQuery = QueryOptimizer.optimizeQuery(query.sql, query.params, {
            priority: 'medium',
            cacheTTL: 600000 // 10 minutos para lista de clientes
            forceIndex: 'idx_clients_user_id_name'
        });
        
        const result = await DatabaseManager.query(optimizedQuery.sql, optimizedQuery.params);
        
        // Analizar rendimiento
        await QueryAnalyzer.analyzeQuery(
            optimizedQuery.sql,
            optimizedQuery.params,
            Date.now() - performance.now(),
            result
        );
        
        // Obtener conteo total
        const countQuery = QueryBuilder
            .select('COUNT(*) as total')
            .from('clients')
            .whereEquals('user_id', req.user.id)
            .build();
        
        const countResult = await DatabaseManager.query(countQuery.sql, countQuery.params);
        const totalClients = parseInt(countResult.rows[0].total);
        
        res.json({
            clients: result.rows,
            pagination: {
                page: page,
                limit: limit,
                total: totalClients,
                totalPages: Math.ceil(totalClients / limit),
                hasNext: page * limit < totalClients,
                hasPrev: page > 1
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/clients', RateLimiterMiddleware.apiMiddleware(), authenticateToken, csrfProtection, async (req, res) => {
    const { name, email, phone, address } = req.body;
    const id = uuidv4();
    
    try {
        // Usar Query Builder para inserción optimizada
        const query = QueryBuilder
            .insertInto('clients')
            .values({
                id: id,
                user_id: req.user.id,
                name: name,
                email: email,
                phone: phone,
                address: address,
                created_at: 'NOW()',
                updated_at: 'NOW()'
            })
            .returning(['id', 'name', 'email', 'phone', 'address', 'created_at', 'updated_at'])
            .build();
        
        const optimizedQuery = QueryOptimizer.optimizeQuery(query.sql, query.params, {
            priority: 'high',
            validateQuery: true,
            preventSQLInjection: true
        });
        
        const result = await DatabaseManager.query(optimizedQuery.sql, optimizedQuery.params);
        
        // Analizar rendimiento
        await QueryAnalyzer.analyzeQuery(
            optimizedQuery.sql,
            optimizedQuery.params,
            Date.now() - performance.now(),
            result
        );
        
        // Invalidar caché relacionada
        QueryCache.delete(`clients_user_${req.user.id}`);
        
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ANALYTICS ROUTES ---

router.get('/analytics/dashboard', RateLimiterMiddleware.sensitiveMiddleware(), authenticateToken, async (req, res) => {
    try {
        // Mock dashboard data for now
        res.json({
            cases: { total: 12, active: 5, pending: 3, closed: 4 },
            documents: { total: 45, processed: 40, pending: 5 },
            performance: { efficiency: 85, satisfaction: 92 },
            recent_activity: []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DOCUMENTS ROUTES ---

router.get('/documents', RateLimiterMiddleware.apiMiddleware(), authenticateToken, async (req, res) => {
    try {
        // Mock documents list for now
        res.json([]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AI ROUTES (Mock for now) ---

router.post('/ai/chat', RateLimiterMiddleware.sensitiveMiddleware(), authenticateToken, csrfProtection, async (req, res) => {
    const { message, context } = req.body;
    // In future: Call OpenAI or similar here.
    // For now, return a simulated response.
    res.json({
        response: `Entendido. He recibido tu consulta sobre "${message}". Como asistente legal de Justice 2, puedo ayudarte a analizar este caso basándome en la legislación vigente. ¿Te gustaría que busque precedentes?`,
        suggestedActions: ['Buscar jurisprudencia', 'Redactar demanda', 'Calcular indemnización']
    });
});

// --- HEALTH CHECK ---
router.get('/health', RateLimiterMiddleware.publicMiddleware(), async (req, res) => {
  try {
    // Use enhanced SSL validation
    const validation = await validateSSLConnection();
    
    if (validation.success) {
      res.json({
        status: 'ok',
        time: validation.time,
        connection: 'success',
        ssl: 'validated',
        security: 'enforced'
      });
    } else {
      // Provide detailed SSL error information
      res.status(503).json({
        status: 'error',
        message: validation.error,
        code: validation.code,
        connection: 'failed',
        ssl: 'validation_failed',
        security: 'compromised'
      });
    }
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message,
      connection: 'failed',
      ssl: 'unknown',
      security: 'error'
    });
  }
});

// --- RATE LIMITING STATS ENDPOINT ---
router.get('/rate-limit/stats', RateLimiterMiddleware.sensitiveMiddleware(), authenticateToken, async (req, res) => {
    try {
        // Solo administradores pueden ver estadísticas de rate limiting
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const stats = RateLimiterMiddleware.getStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RATE LIMITING RESET ENDPOINT ---
router.post('/rate-limit/reset', RateLimiterMiddleware.sensitiveMiddleware(), authenticateToken, csrfProtection, async (req, res) => {
    try {
        // Solo administradores pueden reiniciar estadísticas
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        RateLimiterMiddleware.resetStats();
        res.json({ message: 'Rate limiting statistics reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PASSWORD SECURITY ENDPOINTS ---

// Validar fortaleza de contraseña
router.post('/auth/validate-password', RateLimiterMiddleware.authMiddleware(), csrfProtection, async (req, res) => {
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({
            error: 'Contraseña es requerida',
            code: 'MISSING_PASSWORD'
        });
    }

    try {
        const validation = PasswordSecurity.validatePasswordStrength(password);
        
        res.json({
            isValid: validation.isValid,
            strength: validation.strength,
            strengthLevel: validation.strengthLevel,
            maxScore: validation.maxScore,
            issues: validation.issues,
            recommendations: validation.recommendations
        });
    } catch (err) {
        console.error('Error validando contraseña:', err);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

// Cambiar contraseña
router.post('/auth/change-password', RateLimiterMiddleware.sensitiveMiddleware(), authenticateToken, csrfProtection, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            error: 'Contraseña actual y nueva son requeridas',
            code: 'MISSING_PASSWORDS'
        });
    }

    try {
        // Obtener usuario actual
        const userResult = await pool.query('SELECT * FROM profiles WHERE id = $1', [req.user.id]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        // Si el usuario no tiene contraseña (usuario antiguo), requiere configuración inicial
        if (!user.password_hash) {
            // Validar nueva contraseña
            const validation = PasswordSecurity.validatePasswordStrength(newPassword);
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Contraseña insegura',
                    code: 'WEAK_PASSWORD',
                    details: validation.issues,
                    recommendations: validation.recommendations
                });
            }

            // Hashear nueva contraseña
            const passwordHash = await PasswordSecurity.hashPassword(newPassword);

            // Actualizar usuario
            await pool.query(
                'UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2',
                [passwordHash, req.user.id]
            );

            // Logging de configuración de contraseña
            PasswordSecurity.logSecurityEvent('password_setup', {
                userId: req.user.id,
                email: user.email,
                passwordStrength: validation.strength,
                timestamp: new Date().toISOString()
            });

            return res.json({
                message: 'Contraseña configurada exitosamente',
                passwordStrength: {
                    score: validation.strength,
                    level: validation.strengthLevel
                }
            });
        }

        // Verificar contraseña actual
        const isCurrentPasswordValid = await PasswordSecurity.verifyPassword(currentPassword, user.password_hash);
        
        if (!isCurrentPasswordValid) {
            // Registrar intento fallido de cambio de contraseña
            PasswordSecurity.logSecurityEvent('failed_password_change', {
                userId: req.user.id,
                email: user.email,
                reason: 'invalid_current_password',
                timestamp: new Date().toISOString()
            });

            return res.status(401).json({
                error: 'Contraseña actual incorrecta',
                code: 'INVALID_CURRENT_PASSWORD'
            });
        }

        // Validar nueva contraseña
        const validation = PasswordSecurity.validatePasswordStrength(newPassword);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Nueva contraseña insegura',
                code: 'WEAK_PASSWORD',
                details: validation.issues,
                recommendations: validation.recommendations
            });
        }

        // Verificar que no sea la misma contraseña
        const isSamePassword = await PasswordSecurity.verifyPassword(newPassword, user.password_hash);
        if (isSamePassword) {
            return res.status(400).json({
                error: 'La nueva contraseña debe ser diferente a la actual',
                code: 'SAME_PASSWORD'
            });
        }

        // Hashear nueva contraseña
        const passwordHash = await PasswordSecurity.hashPassword(newPassword);

        // Actualizar contraseña
        await pool.query(
            'UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [passwordHash, req.user.id]
        );

        // Logging de cambio exitoso
        PasswordSecurity.logSecurityEvent('successful_password_change', {
            userId: req.user.id,
            email: user.email,
            oldPasswordStrength: 'unknown', // No podemos medir la fortaleza de la contraseña antigua
            newPasswordStrength: validation.strength,
            timestamp: new Date().toISOString()
        });

        res.json({
            message: 'Contraseña cambiada exitosamente',
            passwordStrength: {
                score: validation.strength,
                level: validation.strengthLevel
            }
        });

    } catch (err) {
        console.error('Error cambiando contraseña:', err);
        
        // Logging de error
        PasswordSecurity.logSecurityEvent('password_change_error', {
            userId: req.user.id,
            error: err.message,
            timestamp: new Date().toISOString()
        });
        
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

// Solicitar reset de contraseña
router.post('/auth/request-password-reset', RateLimiterMiddleware.authMiddleware(), csrfProtection, async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({
            error: 'Email es requerido',
            code: 'MISSING_EMAIL'
        });
    }

    try {
        // Validar formato de email con regex más robusta y segura
        const robustEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        // Validación completa del email
        if (!email || typeof email !== 'string') {
            return res.status(400).json({
                error: 'Email es requerido y debe ser un texto',
                code: 'EMAIL_REQUIRED'
            });
        }
        
        // Validar longitud mínima y máxima del email
        if (email.length < 3 || email.length > 254) {
            return res.status(400).json({
                error: 'Email debe tener entre 3 y 254 caracteres',
                code: 'EMAIL_INVALID_LENGTH'
            });
        }
        
        // Validar formato con regex
        if (!robustEmailRegex.test(email)) {
            return res.status(400).json({
                error: 'Formato de email inválido',
                code: 'INVALID_EMAIL_FORMAT'
            });
        }
        
        // Validar que no tenga caracteres peligrosos o patrones de inyección
        const dangerousPatterns = [
            /<[^>]*>/,           // Etiquetas HTML
            /javascript:/i,        // Protocolo JavaScript
            /vbscript:/i,         // Protocolo VBScript
            /data:/i,             // Protocolo Data
            /on\w+\s*=/i,       // Event handlers
            /['"]/g               // Comillas que podrían causar inyección
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(email)) {
                return res.status(400).json({
                    error: 'Email contiene caracteres o patrones no permitidos',
                    code: 'EMAIL_DANGEROUS_CONTENT'
                });
            }
        }
        
        // Validar que no sea un email conocido como peligroso o de prueba
        const suspiciousDomains = ['test.com', 'example.com', 'tempmail.com', '10minutemail.com'];
        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (suspiciousDomains.includes(emailDomain)) {
            return res.status(400).json({
                error: 'Email de dominio no permitido',
                code: 'EMAIL_SUSPICIOUS_DOMAIN'
            });
        }

        // Buscar usuario
        const userResult = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
        
        // Siempre responder exitosamente para prevenir enumeración de emails
        if (userResult.rows.length === 0) {
            // Logging de intento con email no existente
            PasswordSecurity.logSecurityEvent('password_reset_nonexistent_email', {
                email,
                timestamp: new Date().toISOString()
            });

            return res.json({
                message: 'Si el email está registrado, recibirás instrucciones para resetear tu contraseña',
                code: 'EMAIL_SENT_IF_EXISTS'
            });
        }

        const user = userResult.rows[0];

        // Generar token de reset
        const resetToken = PasswordSecurity.generateResetToken();

        // Almacenar token en la base de datos (necesitaríamos una tabla para esto)
        // Por ahora, simulamos el proceso
        console.log('🔐 Reset token generado para', email, ':', resetToken.token);

        // Logging de solicitud de reset
        PasswordSecurity.logSecurityEvent('password_reset_requested', {
            userId: user.id,
            email: user.email,
            tokenExpiry: new Date(resetToken.expires).toISOString(),
            timestamp: new Date().toISOString()
        });

        res.json({
            message: 'Si el email está registrado, recibirás instrucciones para resetear tu contraseña',
            code: 'EMAIL_SENT_IF_EXISTS'
        });

    } catch (err) {
        console.error('Error solicitando reset de contraseña:', err);
        
        // Siempre responder exitosamente para prevenir enumeración
        res.json({
            message: 'Si el email está registrado, recibirás instrucciones para resetear tu contraseña',
            code: 'EMAIL_SENT_IF_EXISTS'
        });
    }
});

// Estadísticas de seguridad de contraseñas (solo admin)
router.get('/auth/security-stats', RateLimiterMiddleware.sensitiveMiddleware(), authenticateToken, async (req, res) => {
    try {
        // Solo administradores pueden ver estadísticas de seguridad
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Acceso administrador requerido',
                code: 'ADMIN_ACCESS_REQUIRED'
            });
        }

        const securityStats = PasswordSecurity.getSecurityStats();
        const configValidation = PasswordSecurity.validateSecurityConfig();

        res.json({
            passwordSecurity: securityStats,
            configValidation: configValidation,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Error obteniendo estadísticas de seguridad:', err);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

// --- ADMIN SETUP ENDPOINTS ---

// Verificar estado de inicialización del sistema
router.get('/admin/setup/status', RateLimiterMiddleware.publicMiddleware(), async (req, res) => {
    try {
        const AdminSetup = require('./admin-setup.js');
        const adminSetup = new AdminSetup();
        
        const status = await adminSetup.getInitializationStatus();
        
        await adminSetup.close();
        
        res.json(status);
    } catch (err) {
        console.error('Error verificando estado de inicialización:', err);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

// Crear primer administrador (solo si no existe ninguno)
router.post('/admin/setup', RateLimiterMiddleware.sensitiveMiddleware(), csrfProtection, async (req, res) => {
    try {
        const AdminSetup = require('./admin-setup.js');
        const adminSetup = new AdminSetup();
        
        // Verificar si ya hay administradores
        const hasAdmins = await adminSetup.hasAdminUsers();
        if (hasAdmins) {
            await adminSetup.close();
            return res.status(403).json({
                error: 'El sistema ya tiene administradores configurados',
                code: 'SYSTEM_ALREADY_INITIALIZED'
            });
        }
        
        const { email, password, fullName } = req.body;
        
        // Validar datos de entrada de forma más robusta
        if (!email || typeof email !== 'string') {
            await adminSetup.close();
            return res.status(400).json({
                error: 'Email es requerido y debe ser un texto',
                code: 'EMAIL_REQUIRED'
            });
        }
        
        if (!password || typeof password !== 'string') {
            await adminSetup.close();
            return res.status(400).json({
                error: 'Contraseña es requerida y debe ser un texto',
                code: 'PASSWORD_REQUIRED'
            });
        }
        
        if (!fullName || typeof fullName !== 'string') {
            await adminSetup.close();
            return res.status(400).json({
                error: 'Nombre completo es requerido y debe ser un texto',
                code: 'FULL_NAME_REQUIRED'
            });
        }
        
        // Validar longitud de los campos
        if (email.length < 3 || email.length > 254) {
            await adminSetup.close();
            return res.status(400).json({
                error: 'Email debe tener entre 3 y 254 caracteres',
                code: 'EMAIL_INVALID_LENGTH'
            });
        }
        
        if (password.length < 8 || password.length > 128) {
            await adminSetup.close();
            return res.status(400).json({
                error: 'Contraseña debe tener entre 8 y 128 caracteres',
                code: 'PASSWORD_INVALID_LENGTH'
            });
        }
        
        if (fullName.length < 2 || fullName.length > 100) {
            await adminSetup.close();
            return res.status(400).json({
                error: 'Nombre completo debe tener entre 2 y 100 caracteres',
                code: 'FULL_NAME_INVALID_LENGTH'
            });
        }
        
        // Validar formato de email
        const robustEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!robustEmailRegex.test(email)) {
            await adminSetup.close();
            return res.status(400).json({
                error: 'Formato de email inválido',
                code: 'INVALID_EMAIL_FORMAT'
            });
        }
        
        // Validar caracteres del nombre completo
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
        if (!nameRegex.test(fullName)) {
            await adminSetup.close();
            return res.status(400).json({
                error: 'El nombre solo puede contener letras, espacios, apóstrofes y guiones',
                code: 'INVALID_NAME_CHARACTERS'
            });
        }
        
        // Validar que no haya caracteres peligrosos
        const adminSetupDangerousPatterns = [
            /<script/i, /javascript:/i, /vbscript:/i, /on\w+\s*=/i
        ];
        
        if (adminSetupDangerousPatterns.some(pattern => pattern.test(email)) ||
            adminSetupDangerousPatterns.some(pattern => pattern.test(fullName))) {
            await adminSetup.close();
            return res.status(400).json({
                error: 'Los datos contienen contenido no permitido',
                code: 'DANGEROUS_CONTENT'
            });
        }
        
        // Crear administrador
        const result = await adminSetup.createFirstAdmin({
            email,
            password,
            fullName
        });
        
        await adminSetup.close();
        
        res.status(201).json({
            success: true,
            message: 'Administrador creado exitosamente',
            adminId: result.adminId,
            email: result.email
        });
        
    } catch (err) {
        console.error('Error en configuración de administrador:', err);
        
        if (err.message.includes('Contraseña insegura')) {
            return res.status(400).json({
                error: err.message,
                code: 'WEAK_PASSWORD'
            });
        }
        
        if (err.message.includes('Email ya está registrado')) {
            return res.status(409).json({
                error: err.message,
                code: 'EMAIL_ALREADY_EXISTS'
            });
        }
        
        if (err.message.includes('Formato de email inválido')) {
            return res.status(400).json({
                error: err.message,
                code: 'INVALID_EMAIL_FORMAT'
            });
        }
        
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

// --- ROLE VALIDATION MIDDLEWARE ---

// Middleware para verificar roles de usuario
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                error: 'Usuario no autenticado',
                code: 'USER_NOT_AUTHENTICATED'
            });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            // Logging de acceso denegado por rol
            PasswordSecurity.logSecurityEvent('access_denied_insufficient_role', {
                userId: req.user.id,
                userRole: req.user.role,
                requiredRoles: allowedRoles,
                endpoint: req.path,
                timestamp: new Date().toISOString()
            });
            
            return res.status(403).json({
                error: 'Acceso denegado. Permisos insuficientes',
                code: 'INSUFFICIENT_ROLE',
                required: allowedRoles,
                current: req.user.role
            });
        }
        
        // Logging de acceso autorizado
        PasswordSecurity.logSecurityEvent('access_authorized', {
            userId: req.user.id,
            userRole: req.user.role,
            endpoint: req.path,
            timestamp: new Date().toISOString()
        });
        
        next();
    };
};

// --- PROTECTED ADMIN ENDPOINTS ---

// Endpoint solo para administradores
router.get('/admin/dashboard',
    RateLimiterMiddleware.sensitiveMiddleware(),
    authenticateToken,
    requireRole(['admin']),
    async (req, res) => {
        try {
            // Estadísticas del sistema para administradores
            const stats = await pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM profiles) as total_users,
                    (SELECT COUNT(*) FROM profiles WHERE role = 'admin') as admin_users,
                    (SELECT COUNT(*) FROM cases) as total_cases,
                    (SELECT COUNT(*) FROM clients) as total_clients
            `);
            
            res.json({
                success: true,
                stats: stats.rows[0],
                timestamp: new Date().toISOString()
            });
            
        } catch (err) {
            console.error('Error obteniendo dashboard admin:', err);
            res.status(500).json({
                error: 'Error interno del servidor',
                code: 'INTERNAL_SERVER_ERROR'
            });
        }
    }
);

// Mount router
app.use('/api', router);
app.use('/', router); // Fallback for direct function access

module.exports.handler = serverless(app);
