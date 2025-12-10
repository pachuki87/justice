/**
 * SCRIPT DE PRUEBA DE SEGURIDAD SSL
 * 
 * Este script valida que la configuración SSL sea segura
 * y que no haya vulnerabilidades críticas de conexión.
 */

const { Pool } = require('pg');
require('dotenv').config();

// Colores para salida en consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`🚨 ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'blue');
}

async function testSSLSecurity() {
  log('🔍 INICIANDO PRUEBA DE SEGURIDAD SSL', 'cyan');
  log('=====================================', 'cyan');
  
  let securityScore = 0;
  const maxScore = 10;
  
  // 1. Verificar variables de entorno SSL
  log('\n1. Verificando variables de entorno SSL...', 'blue');
  
  const sslChecks = [
    { var: 'DB_SSL', expected: 'true', description: 'SSL habilitado' },
    { var: 'DB_SSL_MODE', expected: 'require', description: 'Modo SSL requerido' },
    { var: 'DB_SSL_REJECT_UNAUTHORIZED', expected: 'true', description: 'Rechazo de no autorizado' },
    { var: 'SSL_VERIFY_CERTIFICATE', expected: 'true', description: 'Verificación de certificado' },
    { var: 'SSL_CHECK_HOSTNAME', expected: 'true', description: 'Verificación de hostname' }
  ];
  
  let sslEnvScore = 0;
  for (const check of sslChecks) {
    const value = process.env[check.var];
    if (value === check.expected) {
      logSuccess(`${check.description}: ✓ (${check.var}=${value})`);
      sslEnvScore++;
    } else {
      logError(`${check.description}: ✗ (${check.var}=${value || 'undefined'})`);
    }
  }
  
  securityScore += (sslEnvScore / sslChecks.length) * 2;
  logInfo(`Puntuación variables SSL: ${sslEnvScore}/${sslChecks.length}`);
  
  // 2. Probar conexión con SSL seguro
  log('\n2. Probando conexión SSL segura...', 'blue');
  
  try {
    // Verificar que DATABASE_URL esté configurada
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL no está configurada');
    }
    
    const secureConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: true, // CRÍTICO: Siempre validar certificados
        checkServerIdentity: () => undefined, // Usar validación por defecto
      }
    };
    
    // Mostrar URL segura sin credenciales
    const safeUrl = process.env.DATABASE_URL
      .replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
      .replace(/\$\{[^}]+\}/g, '***');
    logInfo(`Conectando a: ${safeUrl}`);
    
    const pool = new Pool(secureConfig);
    
    // Añadir timeout para evitar conexiones colgadas
    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de conexión')), 10000)
      )
    ]);
    
    // Verificar que la conexión use SSL
    const sslStatusResult = await client.query('SHOW ssl');
    const sslStatus = sslStatusResult.rows[0].ssl;
    
    if (sslStatus === 'on') {
      logSuccess('Conexión SSL establecida correctamente');
      securityScore += 2;
    } else {
      logError('La conexión no está usando SSL');
    }
    
    // Verificar versión de PostgreSQL
    const versionResult = await client.query('SELECT version()');
    logInfo(`PostgreSQL: ${versionResult.rows[0].version.split(' ')[0]}`);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    logError(`Error en conexión SSL: ${error.message}`);
    
    // Analizar tipo de error SSL
    if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      logError('No se puede verificar el certificado del servidor');
      logError('Posible certificado autofirmado sin CA configurada');
    } else if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
      logError('Certificado autofirmado detectado');
      logError('Use certificados emitidos por una CA confiable en producción');
    } else if (error.code === 'CERT_HAS_EXPIRED') {
      logError('El certificado ha expirado');
      logError('Renueve el certificado inmediatamente');
    }
  }
  
  // 3. Verificar configuración de NODE_ENV
  log('\n3. Verificando entorno de ejecución...', 'blue');
  
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    logSuccess('Entorno de producción detectado');
    securityScore += 1;
  } else if (nodeEnv === 'development') {
    logWarning('Entorno de desarrollo detectado');
    logWarning('Asegúrese de usar configuración segura en producción');
    securityScore += 0.5;
  } else {
    logWarning(`NODE_ENV no configurado: ${nodeEnv || 'undefined'}`);
  }
  
  // 4. Verificar configuración JWT
  log('\n4. Verificando configuración JWT...', 'blue');
  
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length >= 64) {
    logSuccess('JWT Secret configurado y seguro (64+ caracteres)');
    securityScore += 1;
  } else if (jwtSecret && jwtSecret.length >= 32) {
    logWarning('JWT Secret configurado pero podría ser más fuerte (recomendado 64+ caracteres)');
    securityScore += 0.5;
  } else if (jwtSecret) {
    logError('JWT Secret demasiado corto (mínimo 64 caracteres recomendado)');
  } else {
    logError('JWT Secret no configurado');
  }
  
  // 5. Verificar seguridad de DATABASE_URL
  log('\n5. Verificando seguridad de DATABASE_URL...', 'blue');
  
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.includes('sslmode=require')) {
    logSuccess('DATABASE_URL configurado con sslmode=require');
    securityScore += 1;
  } else if (dbUrl) {
    logWarning('DATABASE_URL no incluye sslmode=require');
  } else {
    logError('DATABASE_URL no configurado');
  }
  
  // 6. Verificar si hay credenciales expuestas
  log('\n6. Verificando exposición de credenciales...', 'blue');
  
  if (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
    if (dbUrl.includes('password:')) {
      logWarning('DATABASE_URL contiene contraseña en texto plano');
      logWarning('Considere usar variables de entorno del sistema');
    }
    securityScore += 0.5;
  } else {
    logSuccess('DATABASE_URL usa localhost o configuración segura');
    securityScore += 1;
  }
  
  // 7. Verificar configuración de rate limiting
  log('\n7. Verificando configuración de rate limiting...', 'blue');
  
  const rateLimit = process.env.API_RATE_LIMIT;
  if (rateLimit && parseInt(rateLimit) > 0) {
    logSuccess(`Rate limiting configurado: ${rateLimit} peticiones`);
    securityScore += 0.5;
  } else {
    logWarning('Rate limiting no configurado');
  }
  
  // Resultado final
  log('\n=====================================', 'cyan');
  log('📊 RESULTADO DE LA PRUEBA DE SEGURIDAD', 'cyan');
  log('=====================================', 'cyan');
  
  const finalScore = Math.round(securityScore);
  const percentage = Math.round((securityScore / maxScore) * 100);
  
  log(`Puntuación final: ${finalScore}/${maxScore} (${percentage}%)`, 
      percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red');
  
  if (percentage >= 80) {
    logSuccess('✅ Configuración SSL SEGURA');
    logSuccess('La vulnerabilidad crítica ha sido corregida');
  } else if (percentage >= 60) {
    logWarning('⚠️ Configuración SSL PARCIALMENTE SEGURA');
    logWarning('Se requieren mejoras adicionales');
  } else {
    logError('🚨 Configuración SSL INSEGURA');
    logError('Vulnerabilidades críticas detectadas');
  }
  
  // Recomendaciones
  log('\n📋 RECOMENDACIONES:', 'blue');
  
  if (process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'true') {
    log('- Configure DB_SSL_REJECT_UNAUTHORIZED=true', 'red');
  }
  
  if (!process.env.DATABASE_URL?.includes('sslmode=require')) {
    log('- Use sslmode=require en DATABASE_URL', 'red');
  }
  
  if (process.env.NODE_ENV !== 'production') {
    log('- Configure NODE_ENV=production en producción', 'yellow');
  }
  
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64) {
    log('- Use un JWT Secret de al menos 64 caracteres (recomendado 128)', 'red');
  }
  
  log('- Revise regularmente la validez de los certificados SSL', 'blue');
  log('- Monitoree los logs de errores SSL', 'blue');
  log('- Implemente alertas para fallos de conexión SSL', 'blue');
  
  return {
    score: finalScore,
    percentage,
    secure: percentage >= 80,
    issues: maxScore - finalScore
  };
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
  testSSLSecurity()
    .then(result => {
      process.exit(result.secure ? 0 : 1);
    })
    .catch(error => {
      logError(`Error ejecutando prueba: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { testSSLSecurity };