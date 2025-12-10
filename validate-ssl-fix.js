/**
 * VALIDACIÓN DE CORRECCIÓN SSL
 * 
 * Script simplificado para validar que la vulnerabilidad crítica
 * ha sido corregida correctamente en netlify/functions/api.js
 */

const fs = require('fs');
const path = require('path');

function log(message, type = 'info') {
  const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
  };
  
  const icons = {
    success: '✅',
    error: '🚨',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  console.log(`${colors[type]}${icons[type]} ${message}${colors.reset}`);
}

function validateSSLConfiguration() {
  log('INICIANDO VALIDACIÓN DE CORRECCIÓN SSL', 'cyan');
  log('==========================================', 'cyan');
  
  const apiFilePath = path.join(__dirname, 'netlify', 'functions', 'api.js');
  
  // 1. Verificar que el archivo existe
  if (!fs.existsSync(apiFilePath)) {
    log('Archivo netlify/functions/api.js no encontrado', 'error');
    return false;
  }
  
  log('Archivo netlify/functions/api.js encontrado', 'success');
  
  // 2. Leer el contenido del archivo
  const apiContent = fs.readFileSync(apiFilePath, 'utf8');
  
  // 3. Verificar que la configuración insegura ha sido eliminada
  if (apiContent.includes('rejectUnauthorized: false')) {
    log('VULNERABILIDAD CRÍTICA AÚN PRESENTE: rejectUnauthorized: false', 'error');
    log('La configuración SSL insegura no ha sido corregida', 'error');
    return false;
  }
  
  log('Configuración insegura rejectUnauthorized: false eliminada', 'success');
  
  // 4. Verificar que la configuración segura ha sido implementada
  if (apiContent.includes('rejectUnauthorized: true')) {
    log('Configuración segura rejectUnauthorized: true implementada', 'success');
  } else {
    log('No se encontró configuración segura rejectUnauthorized: true', 'warning');
  }
  
  // 5. Verificar implementación de manejo de errores SSL
  const sslErrorPatterns = [
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'CERT_HAS_EXPIRED',
    'validateSSLConnection'
  ];
  
  let sslErrorHandlingScore = 0;
  for (const pattern of sslErrorPatterns) {
    if (apiContent.includes(pattern)) {
      sslErrorHandlingScore++;
      log(`Manejo de error SSL implementado: ${pattern}`, 'success');
    }
  }
  
  if (sslErrorHandlingScore >= 3) {
    log('Manejo comprehensivo de errores SSL implementado', 'success');
  } else {
    log('Manejo de errores SSL parcial o incompleto', 'warning');
  }
  
  // 6. Verificar configuración condicional para desarrollo
  if (apiContent.includes('NODE_ENV') && apiContent.includes('development')) {
    log('Configuración condicional para entorno de desarrollo implementada', 'success');
  } else {
    log('No se encontró configuración condicional para desarrollo', 'warning');
  }
  
  // 7. Verificar variables de entorno SSL
  const envFilePath = path.join(__dirname, '.env');
  if (fs.existsSync(envFilePath)) {
    const envContent = fs.readFileSync(envFilePath, 'utf8');
    
    const sslVars = [
      'DB_SSL_REJECT_UNAUTHORIZED=true',
      'SSL_VERIFY_CERTIFICATE=true',
      'SSL_CHECK_HOSTNAME=true'
    ];
    
    let sslVarsScore = 0;
    for (const sslVar of sslVars) {
      if (envContent.includes(sslVar)) {
        sslVarsScore++;
        log(`Variable SSL configurada: ${sslVar}`, 'success');
      }
    }
    
    if (sslVarsScore === sslVars.length) {
      log('Todas las variables SSL de seguridad configuradas', 'success');
    } else {
      log('Faltan variables SSL de seguridad', 'warning');
    }
  } else {
    log('Archivo .env no encontrado', 'warning');
  }
  
  // 8. Verificar actualización de .env.example
  const envExamplePath = path.join(__dirname, '.env.example');
  if (fs.existsSync(envExamplePath)) {
    const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
    
    if (envExampleContent.includes('DB_SSL_REJECT_UNAUTHORIZED=true')) {
      log('Plantilla .env.example actualizada con configuración SSL segura', 'success');
    } else {
      log('Plantilla .env.example no actualizada', 'warning');
    }
  }
  
  // 9. Verificar que no haya comentarios peligrosos
  const dangerousComments = [
    'rejectUnauthorized: false',
    'disable SSL verification',
    'skip certificate validation'
  ];
  
  let hasDangerousComments = false;
  for (const comment of dangerousComments) {
    if (apiContent.toLowerCase().includes(comment.toLowerCase())) {
      log(`Comentario peligroso detectado: ${comment}`, 'error');
      hasDangerousComments = true;
    }
  }
  
  if (!hasDangerousComments) {
    log('No se encontraron comentarios peligrosos relacionados con SSL', 'success');
  }
  
  // Resultado final
  log('==========================================', 'cyan');
  log('RESULTADO DE LA VALIDACIÓN', 'cyan');
  log('==========================================', 'cyan');
  
  // Verificación final de la corrección crítica
  const criticalFixImplemented = 
    !apiContent.includes('rejectUnauthorized: false') &&
    apiContent.includes('rejectUnauthorized: true') &&
    apiContent.includes('validateSSLConnection');
  
  if (criticalFixImplemented) {
    log('✅ VULNERABILIDAD CRÍTICA CORREGIDA EXITOSAMENTE', 'success');
    log('✅ Configuración SSL segura implementada', 'success');
    log('✅ Manejo de errores SSL implementado', 'success');
    log('✅ Validación de conexión SSL implementada', 'success');
    return true;
  } else {
    log('🚨 LA VULNERABILIDAD CRÍTICA NO HA SIDO CORREGIDA COMPLETAMENTE', 'error');
    log('🚨 Se requieren acciones adicionales', 'error');
    return false;
  }
}

// Ejecutar validación
if (require.main === module) {
  const isValid = validateSSLConfiguration();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateSSLConfiguration };