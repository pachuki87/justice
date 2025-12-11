# Documentación Completa de Configuración - Justice 2

## 📋 Tabla de Contenidos

1. [Overview](#overview)
2. [package.json](#packagejson)
3. [netlify.toml](#netlifytoml)
4. [Archivos de Configuración de Desarrollo](#archivos-de-configuración-de-desarrollo)
5. [Scripts y Comandos](#scripts-y-comandos)
6. [Configuración de Seguridad](#configuración-de-seguridad)
7. [Configuración de Entorno](#configuración-de-entorno)
8. [Validación y Pruebas](#validación-y-pruebas)
9. [Mantenimiento y Actualizaciones](#mantenimiento-y-actualizaciones)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Justice 2 utiliza una configuración moderna y robusta que asegura seguridad, rendimiento y mantenibilidad. Esta documentación describe todos los aspectos de la configuración del proyecto.

### 🏗️ Arquitectura de Configuración

```
justice-2/
├── package.json              # Configuración principal del proyecto
├── netlify.toml            # Configuración de despliegue y seguridad
├── .ncurc.json            # Configuración de actualización de dependencias
├── .eslintrc.js            # Configuración de linting
├── .prettierrc             # Configuración de formato de código
├── jest.config.js           # Configuración de pruebas
├── test-setup.js           # Configuración global de pruebas
├── validate-configuration.js # Sistema de validación
├── test-configuration.js   # Sistema de pruebas automatizadas
└── .env.example           # Plantilla de variables de entorno
```

---

## 📦 package.json

### 🎯 Propósito

Archivo principal de configuración del proyecto que define dependencias, scripts, metadata y configuración de desarrollo.

### 📋 Campos Principales

```json
{
  "name": "justice-2",
  "version": "1.0.0",
  "description": "Justice 2 es una plataforma jurídica completa...",
  "main": "index.html",
  "private": true,
  "type": "commonjs",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

### 🚀 Scripts Disponibles

#### Scripts de Desarrollo
- `npm start` - Inicia servidor de desarrollo Netlify
- `npm run dev` - Alias para npm start
- `npm run build` - Construye el proyecto para producción

#### Scripts de Despliegue
- `npm run deploy` - Despliega a producción
- `npm run deploy:staging` - Despliega a staging

#### Scripts de Pruebas
- `npm test` - Ejecuta pruebas unitarias y de integración
- `npm run test:watch` - Ejecuta pruebas en modo watch
- `npm run test:coverage` - Genera reporte de cobertura

#### Scripts de Calidad de Código
- `npm run lint` - Verifica calidad de código con ESLint
- `npm run lint:fix` - Corrige automáticamente problemas de linting
- `npm run format` - Formatea código con Prettier
- `npm run format:check` - Verifica formato del código

#### Scripts de Seguridad y Mantenimiento
- `npm run security` - Ejecuta auditoría de seguridad
- `npm run security:fix` - Aplica correcciones de seguridad
- `npm run update` - Actualiza dependencias
- `npm run update:check` - Verifica actualizaciones disponibles
- `npm run clean` - Limpia e reinstala dependencias

#### Scripts de Validación
- `npm run validate` - Ejecuta validación completa
- `npm run prepare` - Validación pre-commit
- `npm run precommit` - Validación pre-commit
- `npm run prepush` - Validación pre-push

### 📚 Dependencias

#### Dependencias de Producción
- `express` - Framework web para API
- `jsonwebtoken` - Manejo de tokens JWT
- `bcryptjs` - Encriptación de contraseñas
- `cors` - Manejo de CORS
- `dotenv` - Gestión de variables de entorno
- `pg` - Cliente PostgreSQL
- `serverless-http` - Adaptador para funciones serverless
- `uuid` - Generación de IDs únicos

#### Dependencias de Desarrollo
- `eslint` - Linting de código
- `prettier` - Formato de código
- `jest` - Framework de pruebas
- `netlify-cli` - CLI de Netlify
- `npm-check-updates` - Gestión de actualizaciones

---

## 🌐 netlify.toml

### 🎯 Propósito

Configuración completa de despliegue, seguridad, rendimiento y optimización para Netlify.

### 🏗️ Configuración de Build

```toml
[build]
  publish = "."
  functions = "netlify/functions"
  command = "echo 'Build completed - Static site ready for deployment'"
  command_origin = "config"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"
  NODE_OPTIONS = "--max-old-space-size=4096"
```

### 🔌 Plugins de Optimización

```toml
[[plugins]]
  package = "@netlify/plugin-lighthouse"
  [plugins.inputs]
    output_path = "lighthouse.html"

[[plugins]]
  package = "@netlify/plugin-sitemap"

[[plugins]]
  package = "@netlify/plugin-minify-html"
```

### 🔒 Headers de Seguridad

#### Headers Globales
- **Content Security Policy**: Política estricta de seguridad de contenido
- **X-Frame-Options**: Previene clickjacking
- **X-Content-Type-Options**: Previene MIME-sniffing
- **Strict-Transport-Security**: Forza HTTPS
- **Referrer-Policy**: Controla información de referer
- **Permissions-Policy**: Controla acceso a APIs del navegador

#### Headers de API
- **CORS restrictivos**: Configuración segura de CORS
- **Cache control**: Sin caché para respuestas sensibles
- **Rate limiting headers**: Información de límites de tasa

### 🔄 Redirecciones

```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 🌍 Configuración por Entorno

#### Producción
- Headers más restrictivos
- Variables de entorno de producción
- Optimizaciones máximas

#### Desarrollo
- Headers más permisivos
- Variables de entorno locales
- Sin caché para facilitar debugging

#### Staging
- Configuración intermedia
- Variables de entorno de staging

---

## 🛠️ Archivos de Configuración de Desarrollo

### .ncurc.json

Configuración para `npm-check-updates`:

```json
{
  "upgrade": true,
  "target": "latest",
  "reject": ["eslint", "prettier", "jest"],
  "filter": "*",
  "format": "group",
  "loglevel": "info",
  "peer": true
}
```

### .eslintrc.js

Configuración completa de ESLint:

- **Reglas de calidad**: No console, no debugger, prefer-const
- **Reglas de seguridad**: No eval, no script-url
- **Reglas de estilo**: Indentación, quotes, semicolons
- **Overrides**: Configuración específica para funciones y pruebas

### .prettierrc

Configuración de formato de código:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### jest.config.js

Configuración completa de Jest:

- **Entorno**: jsdom para pruebas de frontend
- **Cobertura**: Umbral del 70% para todas las métricas
- **Transformaciones**: Soporte para ES6+
- **Mocks**: Configuración de fetch, localStorage, etc.

### test-setup.js

Configuración global para pruebas:

- **Mocks de APIs**: fetch, Response, Request
- **Mocks de Storage**: localStorage, sessionStorage
- **Mocks de DOM**: IntersectionObserver, ResizeObserver
- **Helpers**: Funciones utilitarias para pruebas

---

## 🚀 Scripts y Comandos

### Flujo de Desarrollo Típico

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar desarrollo
npm run dev

# 3. Verificar calidad de código
npm run lint
npm run format

# 4. Ejecutar pruebas
npm test

# 5. Validar configuración
npm run validate

# 6. Desplegar a staging
npm run deploy:staging

# 7. Desplegar a producción
npm run deploy
```

### Comandos de Mantenimiento

```bash
# Actualizar dependencias
npm run update

# Auditoría de seguridad
npm run security

# Limpiar proyecto
npm run clean

# Validación completa
npm run validate
```

---

## 🔒 Configuración de Seguridad

### 🔐 Variables de Entorno

Crear archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Variables requeridas:
- `DATABASE_URL` - URL de base de datos
- `JWT_SECRET` - Secreto para tokens JWT
- `OPENAI_API_KEY` - API key de OpenAI

### 🛡️ Headers de Seguridad

La configuración incluye headers de seguridad completos:

- **CSP**: Política de contenido restrictiva
- **HSTS**: Forzado de HTTPS
- **X-Frame-Options**: Prevención de clickjacking
- **X-Content-Type-Options**: Prevención de MIME-sniffing
- **Permissions-Policy**: Control de APIs del navegador

### 🔍 Auditoría de Seguridad

```bash
# Verificar vulnerabilidades
npm audit

# Verificar configuración
node validate-configuration.js

# Ejecutar pruebas de seguridad
npm run security
```

---

## 🌍 Configuración de Entorno

### 🏠 Desarrollo Local

```bash
# Variables de entorno
NODE_ENV=development
API_URL=http://localhost:8888

# Servidor de desarrollo
npm run dev
```

### 🚀 Producción

```bash
# Variables de entorno (configuradas en Netlify)
NODE_ENV=production
API_URL=https://justice2.netlify.app

# Despliegue
npm run deploy
```

### 🧪 Staging

```bash
# Variables de entorno
NODE_ENV=staging
API_URL=https://deploy-preview-justice2.netlify.app

# Despliegue a staging
npm run deploy:staging
```

---

## ✅ Validación y Pruebas

### 📊 Sistema de Validación

Ejecutar validación completa:

```bash
node validate-configuration.js
```

La validación verifica:
- ✅ Estructura de package.json
- ✅ Configuración de netlify.toml
- ✅ Dependencias de desarrollo
- ✅ Configuración de seguridad
- ✅ Configuración de build
- ✅ Configuración de entorno
- ✅ Configuración de testing
- ✅ Configuración de rendimiento
- ✅ Configuración de Git

### 🧪 Sistema de Pruebas

Ejecutar pruebas automatizadas:

```bash
node test-configuration.js
```

Las pruebas verifican:
- ✅ Validación de package.json
- ✅ Configuración de Netlify
- ✅ Instalación de dependencias
- ✅ Linting
- ✅ Proceso de build
- ✅ Headers de seguridad
- ✅ Variables de entorno
- ✅ Endpoints de API
- ✅ Assets estáticos
- ✅ Optimización de rendimiento
- ✅ Configuración de deploy

---

## 🔧 Mantenimiento y Actualizaciones

### 📦 Gestión de Dependencias

```bash
# Verificar actualizaciones
npm run update:check

# Actualizar dependencias
npm run update

# Instalar nuevas dependencias
npm install package-name --save

# Instalar dependencias de desarrollo
npm install package-name --save-dev
```

### 🔍 Auditoría Regular

```bash
# Auditoría de seguridad (semanal)
npm audit

# Validación de configuración (mensual)
npm run validate

# Pruebas completas (antes de deploy)
npm test && npm run lint && npm run security
```

### 📊 Monitoreo

- **Lighthouse**: Reportes automáticos de rendimiento
- **Coverage**: Reportes de cobertura de código
- **Security**: Auditorías automatizadas
- **Performance**: Monitoreo de build y deploy

---

## 🛠️ Troubleshooting

### Problemas Comunes

#### ❌ npm install falla
```bash
# Limpiar caché
npm cache clean --force

# Limpiar node_modules
npm run clean

# Reinstalar
npm install
```

#### ❌ Linting errors
```bash
# Verificar problemas
npm run lint

# Corregir automáticamente
npm run lint:fix

# Formatear código
npm run format
```

#### ❌ Tests fallan
```bash
# Ejecutar en modo verbose
npm test -- --verbose

# Ejecutar pruebas específicas
npm test -- --testNamePattern="test-name"

# Generar cobertura
npm run test:coverage
```

#### ❌ Build falla
```bash
# Verificar configuración
npm run validate

# Limpiar y rebuild
npm run clean && npm run build

# Verificar dependencias
npm ls
```

#### ❌ Deploy falla
```bash
# Verificar configuración de Netlify
npx netlify status

# Desplegar en modo debug
npx netlify deploy --debug

# Verificar variables de entorno
npx netlify env:list
```

### 📞 Soporte

- **Documentación**: Revisar esta documentación completa
- **Logs**: Verificar logs de Netlify y consola
- **Validación**: Ejecutar `node validate-configuration.js`
- **Pruebas**: Ejecutar `node test-configuration.js`

---

## 📈 Mejoras Futuras

### 🎯 Plan de Mejoras

1. **CI/CD Automatizado**: GitHub Actions para validación continua
2. **Monitoreo Avanzado**: Integración con herramientas de APM
3. **Testing E2E**: Pruebas end-to-end con Cypress
4. **Performance**: Optimización avanzada de bundle
5. **Security**: Escaneo automatizado de vulnerabilidades

### 🔄 Actualizaciones Automáticas

Configurar actualizaciones automáticas con Dependabot o renovate:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

## 📚 Referencias

### 📖 Documentación Oficial

- [Netlify Documentation](https://docs.netlify.com/)
- [npm Documentation](https://docs.npmjs.com/)
- [ESLint Documentation](https://eslint.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/)
- [Prettier Documentation](https://prettier.io/docs/)

### 🔗 Herramientas Útiles

- [Netlify CLI](https://cli.netlify.com/)
- [npm-check-updates](https://github.com/raineorshine/npm-check-updates)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals](https://web.dev/vitals/)

---

## 📄 Licencia

Esta configuración sigue las mejores prácticas de la industria y está diseñada para ser mantenible, escalable y segura.

---

**Última actualización**: 10 de diciembre de 2024
**Versión**: 1.0.0
**Mantenido por**: Justice 2 Development Team