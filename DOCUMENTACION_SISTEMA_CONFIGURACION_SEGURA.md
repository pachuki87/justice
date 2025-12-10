# Documentación del Sistema de Configuración Segura - Justice 2

## 📋 Tabla de Contenidos

1. [Overview](#overview)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Variables de Entorno](#variables-de-entorno)
4. [Implementación](#implementación)
5. [Uso y Configuración](#uso-y-configuración)
6. [Pruebas de Seguridad](#pruebas-de-seguridad)
7. [Mejores Prácticas](#mejores-prácticas)
8. [Troubleshooting](#troubleshooting)

## 🎯 Overview

El Sistema de Configuración Segura de Justice 2 ha sido diseñado para eliminar completamente la exposición de credenciales en el frontend, proporcionando un mecanismo robusto y seguro para gestionar variables de entorno sensibles.

### 🔒 Problemas Resueltos

- **Credenciales Hardcodeadas**: Eliminación completa de URLs, claves API y tokens en el código fuente
- **Exposición de Datos Sensibles**: Sistema de aislamiento que previene accesos no autorizados
- **Configuración Insegura**: Validación automática y fallbacks seguros
- **Falta de Validación**: Sistema completo de validación de configuración

### ✅ Beneficios Principales

- **Seguridad Máxima**: Cero credenciales expuestas en el frontend
- **Flexibilidad**: Soporte para múltiples entornos (desarrollo, producción)
- **Validación Automática**: Detección de configuraciones inválidas o inseguras
- **Fallbacks Seguros**: Comportamiento predecible cuando faltan variables
- **Auditoría Completa**: Logging de todos los eventos de configuración

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    Sistema de Configuración Segura              │
├─────────────────────────────────────────────────────────────┤
│  components/env-config.js                               │
│  ├── Carga de variables de entorno                       │
│  ├── Validación de configuración                         │
│  ├── Sanitización de valores                            │
│  ├── Detección de manipulación                           │
│  └── Fallbacks seguros                                 │
├─────────────────────────────────────────────────────────────┤
│  .env.example                                          │
│  ├── Plantilla de variables de entorno                   │
│  ├── Documentación de seguridad                         │
│  └── Valores por defecto seguros                       │
├─────────────────────────────────────────────────────────────┤
│  js/justice2-config.js                                │
│  ├── Integración con EnvConfig                          │
│  ├── URLs dinámicas según entorno                       │
│  └── Sin credenciales hardcodeadas                     │
├─────────────────────────────────────────────────────────────┤
│  js/justice2-auth.js                                  │
│  ├── Validación de tokens con configuración segura        │
│  ├── Issuers dinámicos                                 │
│  └── Sin URLs hardcodeadas                             │
├─────────────────────────────────────────────────────────────┤
│  test-environment-security.js                           │
│  ├── Pruebas automatizadas de seguridad                 │
│  ├── Detección de credenciales expuestas               │
│  └── Reportes de vulnerabilidades                      │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Carga de Configuración

```mermaid
graph TD
    A[Inicio de Aplicación] --> B{EnvConfig disponible?}
    B -->|Sí| C[Cargar desde process.env]
    B -->|No| D[Cargar desde window.ENV]
    C --> E[Cargar desde meta tags]
    D --> E
    E --> F[Aplicar fallbacks seguros]
    F --> G[Validar configuración]
    G --> H{Validación exitosa?}
    H -->|Sí| I[Congelar configuración]
    H -->|No| J[Error crítico]
    I --> K[Sistema listo]
    J --> L[Página de error]
```

## 🔧 Variables de Entorno

### Variables Críticas de Seguridad

| Variable | Tipo | Requerida | Descripción | Ejemplo |
|----------|-------|------------|-------------|----------|
| `PRODUCTION_API_URL` | URL | No | URL del servidor de API para producción | `https://api.justice2.com` |
| `DEVELOPMENT_API_URL` | URL | No | URL del servidor de API para desarrollo | `http://localhost:8000` |
| `FRONTEND_BASE_URL` | URL | No | URL base del frontend | `http://localhost:3000` |
| `DEFAULT_ENVIRONMENT` | String | No | Entorno por defecto | `auto` |
| `VALID_JWT_ISSUERS` | Array | No | Issuers válidos para tokens JWT | `justice2-system,https://api.justice2.com` |

### Variables de Base de Datos (Backend)

| Variable | Tipo | Requerida | Descripción | Ejemplo |
|----------|-------|------------|-------------|----------|
| `DB_HOST` | String | Sí | Host de base de datos | `localhost` |
| `DB_PORT` | Number | Sí | Puerto de base de datos | `5432` |
| `DB_NAME` | String | Sí | Nombre de base de datos | `justice2_db` |
| `DB_USER` | String | Sí | Usuario de base de datos | `justice2_user` |
| `DB_PASSWORD` | String | Sí | Contraseña de base de datos | `contraseña_segura` |
| `DATABASE_URL` | URL | Sí | URL completa de conexión | `postgres://user:pass@host:port/db` |

### Variables de Seguridad

| Variable | Tipo | Requerida | Descripción | Longitud Mínima |
|----------|-------|------------|-------------|------------------|
| `JWT_SECRET` | String | Sí | Secreto para firmar tokens JWT | 64 caracteres |
| `PASSWORD_PEPPER` | String | Sí | Pepper para hashing de contraseñas | 32 caracteres |
| `SESSION_SECRET` | String | Sí | Secreto para sesiones | 32 caracteres |

## 🚀 Implementación

### 1. Configuración del Entorno

#### Archivo .env.example

```bash
# Copiar este archivo como .env
cp .env.example .env

# Editar con valores reales y seguros
nano .env
```

#### Variables de Entorno del Sistema

```bash
# En producción, usar variables del sistema
export PRODUCTION_API_URL="https://api.justice2.com"
export JWT_SECRET="$(openssl rand -hex 64)"
export PASSWORD_PEPPER="$(openssl rand -hex 32)"
```

### 2. Integración en el Frontend

#### Inclusión del Sistema de Configuración

```html
<!-- En index.html o plantilla principal -->
<script src="components/env-config.js"></script>
<script src="js/justice2-config.js"></script>
<script src="js/justice2-auth.js"></script>
```

#### Inyección de Variables (Backend)

```javascript
// Ejemplo para Node.js/Express
app.get('/', (req, res) => {
    res.render('index', {
        env: {
            PRODUCTION_API_URL: process.env.PRODUCTION_API_URL,
            DEVELOPMENT_API_URL: process.env.DEVELOPMENT_API_URL,
            VALID_JWT_ISSUERS: process.env.VALID_JWT_ISSUERS
        }
    });
});
```

#### Plantilla HTML con Variables

```html
<!-- Meta tags para inyección segura -->
<meta name="env-production_api_url" content="{{env.PRODUCTION_API_URL}}">
<meta name="env-development_api_url" content="{{env.DEVELOPMENT_API_URL}}">
<meta name="env-valid_jwt_issuers" content="{{env.VALID_JWT_ISSUERS}}">
```

### 3. Uso en el Código

#### Acceso Seguro a Variables

```javascript
// Usar el sistema de configuración
const apiUrl = EnvConfig.getApiUrl();
const environment = EnvConfig.getEnvironment();
const validIssuers = EnvConfig.getValidJwtIssuers();

// Verificar estado del sistema
const status = EnvConfig.getStatus();
if (!status.loaded || !status.validated) {
    console.error('Sistema de configuración no disponible');
}
```

#### Configuración Dinámica

```javascript
// En js/justice2-config.js
api: {
    get baseURL() {
        // Usar configuración segura en lugar de URLs hardcodeadas
        return EnvConfig.getApiUrl();
    }
}
```

## 📖 Uso y Configuración

### Configuración para Desarrollo

```bash
# .env para desarrollo
DEFAULT_ENVIRONMENT=development
DEVELOPMENT_API_URL=http://localhost:8000
FRONTEND_BASE_URL=http://localhost:3000
VALID_JWT_ISSUERS=justice2-system,http://localhost:8000
```

### Configuración para Producción

```bash
# .env para producción
DEFAULT_ENVIRONMENT=production
PRODUCTION_API_URL=https://api.justice2.com
FRONTEND_BASE_URL=https://justice2.com
VALID_JWT_ISSUERS=justice2-system,https://api.justice2.com
JWT_SECRET=secreto_jwt_aleatorio_de_128_caracteres_hexadecimal
PASSWORD_PEPPER=pepper_secreto_aleatorio_de_64_caracteres_hexadecimal
```

### Configuración para Netlify

```toml
# netlify.toml
[build.environment]
  NODE_ENV="production"
  DEFAULT_ENVIRONMENT="production"

[context.production.environment]
  PRODUCTION_API_URL="https://api.justice2.com"
  FRONTEND_BASE_URL="https://justice2.netlify.app"
```

## 🔍 Pruebas de Seguridad

### Ejecución de Pruebas Automatizadas

```bash
# Ejecutar todas las pruebas de seguridad
node test-environment-security.js

# Ver reporte generado
cat environment-security-test-report.json
```

### Tipos de Pruebas

1. **Detección de Credenciales Hardcodeadas**
   - Búsqueda de URLs, claves API, tokens, contraseñas
   - Validación contra whitelist de URLs permitidas
   - Enmascaramiento de credenciales en logs

2. **Validación del Sistema de Configuración**
   - Verificación de carga correcta
   - Validación de integridad
   - Detección de manipulación

3. **Pruebas de Variables de Entorno**
   - Verificación de variables críticas
   - Validación de tipos y formatos
   - Comprobación de fallbacks

4. **Seguridad de Almacenamiento**
   - Verificación de localStorage
   - Detección de credenciales expuestas
   - Validación de limpieza automática

### Reporte de Pruebas

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "total": 6,
    "passed": 6,
    "failed": 0,
    "errors": 0,
    "critical": 0,
    "successRate": "100.00"
  },
  "recommendations": [
    {
      "priority": "MEDIUM",
      "title": "Implementar monitoreo continuo",
      "actions": [
        "Ejecutar pruebas regularmente",
        "Configurar alertas de seguridad",
        "Implementar scanning automatizado"
      ]
    }
  ]
}
```

## 🛡️ Mejores Prácticas

### 1. Gestión de Credenciales

```bash
# Generar secrets seguros
JWT_SECRET=$(openssl rand -hex 64)
PASSWORD_PEPPER=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Almacenar en gestor de secrets (recomendado)
# AWS Secrets Manager, HashiCorp Vault, etc.
```

### 2. Configuración de Entorno

```bash
# Usar variables de entorno del sistema en producción
export PRODUCTION_API_URL="https://api.justice2.com"

# No incluir .env en control de versiones
echo ".env" >> .gitignore
echo "environment-security-test-report.json" >> .gitignore
```

### 3. Validación Continua

```javascript
// Implementar verificación en tiempo de ejecución
if (EnvConfig.isConfigurationTampered()) {
    console.error('¡ALERTA! Configuración manipulada');
    // Redirigir a página de error o tomar acción correctiva
}
```

### 4. Monitoreo y Auditoría

```javascript
// Logging de eventos de configuración
EnvConfig.on('configuration_loaded', (event) => {
    console.log('Configuración cargada:', event.timestamp);
});

EnvConfig.on('validation_failed', (event) => {
    console.error('Validación fallida:', event.errors);
    // Enviar alerta de seguridad
});
```

## 🔧 Troubleshooting

### Problemas Comunes

#### 1. Variables de Entorno No Cargadas

**Síntomas:**
- Error: "EnvConfig no disponible"
- URLs por defecto en lugar de configuradas

**Soluciones:**
```bash
# Verificar archivo .env
ls -la .env

# Verificar permisos
chmod 600 .env

# Verificar formato
cat .env | grep -E "^[A-Z_]+="
```

#### 2. Validación Fallida

**Síntomas:**
- Error: "Configuración inválida"
- Variables con formato incorrecto

**Soluciones:**
```javascript
// Depurar configuración
console.log('Estado:', EnvConfig.getStatus());
console.log('Variables:', Object.keys(EnvConfig._config));

// Validar manualmente
const isValid = EnvConfig.isValidUrl('https://example.com');
console.log('URL válida:', isValid);
```

#### 3. Manipulación Detectada

**Síntomas:**
- Error: "Configuración manipulada"
- Comportamiento inesperado

**Soluciones:**
```javascript
// Verificar hash de configuración
console.log('Hash original:', EnvConfig._configHash);
console.log('Hash actual:', btoa(JSON.stringify(EnvConfig._config)));

// Reinicializar si es necesario
if (EnvConfig.isConfigurationTampered()) {
    location.reload();
}
```

### Herramientas de Depuración

#### Interfaz de Configuración

```html
<!-- Abrir env-config.html para diagnóstico -->
<a href="env-config.html">Panel de Configuración</a>
```

#### Consola de Depuración

```javascript
// Habilitar modo debug
localStorage.setItem('env_debug', 'true');

// Ver estado completo
console.table(EnvConfig.getStatus());

// Ver todas las variables
console.table(EnvConfig._config);
```

### Soporte y Contacto

Para problemas relacionados con la seguridad de configuración:

1. **Urgente**: Revisar logs de errores y ejecutar pruebas de seguridad
2. **General**: Consultar documentación y mejores prácticas
3. **Crítico**: Implementar rollback y contactar equipo de seguridad

---

## 📝 Notas de Versión

### v2.0.0 - Implementación Completa
- ✅ Sistema de configuración segura implementado
- ✅ Eliminación de credenciales hardcodeadas
- ✅ Pruebas automatizadas de seguridad
- ✅ Documentación completa

### Cambios Críticos
- Migración de URLs hardcodeadas a variables de entorno
- Implementación de validación y sanitización
- Sistema de detección de manipulación
- Fallbacks seguros para todos los escenarios

---

**⚠️ IMPORTANTE**: Este sistema es crítico para la seguridad de Justice 2. Cualquier modificación debe ser revisada por el equipo de seguridad antes de implementarse en producción.