# Justice 2 - Plataforma Jurídica Inteligente

## Descripción General

Justice 2 es una plataforma jurídica completa basada en el diseño visual original de Justice, pero con funcionalidades dinámicas avanzadas y conexión con el sistema AI Replicator existente en `srv1024767.hstgr.cloud`.

## Características Principales

### 🎨 Diseño Visual
- **Mantenido exactamente el diseño original de Justice**
- Colores corporativos: `#B49C73` (dorado) y `#37373F` (oscuro)
- Tipografía y estructura idénticas al original
- Responsive design con mobile-first

### 🔐 Autenticación No Intrusiva
- Sistema de login/register sin interrumpir la experiencia
- Gestión de tokens JWT con refresh automático
- Bloqueo por intentos fallidos
- Persistencia de sesión segura

### 🤖 Asistente IA
- Chat en tiempo real con historial de conversaciones
- Análisis de documentos con IA
- Investigación jurídica automatizada
- Reconocimiento de voz Web Speech API

### 📄 Gestión Documental
- Upload drag-and-drop con progreso
- Análisis automático de documentos
- Filtros avanzados y búsqueda
- Visualización en grid y lista

### ⚖️ Gestión de Casos
- Creación y edición de casos
- Análisis predictivo con IA
- Múltiples vistas: grid, lista y timeline
- Gestión de estados y prioridades

### 📊 Analytics Dashboard
- Métricas clave de rendimiento
- Gráficos interactivos con Chart.js
- Análisis de rendimiento de IA
- Exportación de reportes

## Estructura de Archivos

```
justice 2/
├── index.html                    # Página principal (manteniendo diseño Justice)
├── ai-assistant.html            # Página de Asistente IA
├── documents.html               # Página de Gestión de Documentos
├── cases.html                   # Página de Gestión de Casos
├── analytics.html               # Página de Analytics
├── css/                         # Hojas de estilo
│   ├── justice2-dynamic.css     # Estilos dinámicos adicionales
│   ├── ai-assistant.css         # Estilos del Asistente IA
│   ├── documents.css            # Estilos de Gestión Documental
│   ├── cases.css               # Estilos de Gestión de Casos
│   └── analytics.css           # Estilos de Analytics
├── js/                          # JavaScript principal
│   ├── justice2-core.js         # Funcionalidades principales
│   ├── justice2-auth.js         # Sistema de autenticación
│   ├── justice2-api.js          # Cliente API
│   ├── justice2-dynamic.js      # Carga dinámica de contenido
│   ├── ai-assistant.js          # Funcionalidades del Asistente IA
│   ├── documents.js             # Gestión de Documentos
│   ├── cases.js                # Gestión de Casos
│   ├── analytics.js             # Analytics Dashboard
│   └── justice2-config.js      # Configuración principal
├── components/                   # Componentes modulares
│   ├── notification-system.js   # Sistema de notificaciones
│   ├── utils.js                # Utilidades reutilizables
│   ├── loading-system.js       # Sistema de carga y progreso
│   ├── modal-system.js         # Sistema de modales y diálogos
│   └── validation-system.js    # Sistema de validación
├── images/                      # Imágenes y assets
└── lib/                        # Librerías externas
```

## Configuración

### Base de Datos
La aplicación está configurada para conectarse a la base de datos existente del AI Replicator:

```javascript
database: {
    host: 'srv1024767.hstgr.cloud',
    port: 5432,
    name: 'ai_law_replicator',
    ssl: true
}
```

### API
El cliente API está configurado para comunicarse con:

```javascript
api: {
    baseURL: 'https://srv1024767.hstgr.cloud/api',
    timeout: 30000,
    retries: 3
}
```

## Componentes Modulares

### Justice2Core
Funcionalidades principales y utilidades de la aplicación.

### Justice2Auth
Sistema de autenticación no intrusivo con:
- Login/Register
- Gestión de tokens JWT
- Refresh automático
- Bloqueo por intentos fallidos

### Justice2API
Cliente API completo con:
- Manejo de errores
- Reintentos automáticos
- Caché inteligente
- Interceptors

### Justice2Dynamic
Sistema de carga dinámica de contenido con:
- Actualización automática cada 30 segundos
- Animaciones suaves
- Contadores animados
- Transiciones elegantes

### Justice2Notifications
Sistema de notificaciones reutilizable:
- Múltiples tipos (success, error, warning, info)
- Posicionamiento configurable
- Animaciones y auto-eliminación
- Acciones personalizadas

### Justice2Loading
Sistema de carga y progreso:
- Overlay global
- Barras de progreso
- Spinners animados
- Indicadores de estado

### Justice2Modal
Sistema de modales y diálogos:
- Modales básicos
- Diálogos de confirmación
- Formularios modales
- Modales de carga, imagen y video

### Justice2Validation
Sistema de validación de formularios:
- Validadores predefinidos
- Validación en tiempo real
- Indicadores de fortaleza de contraseña
- Resúmenes de errores

### Justice2Utils
Utilidades reutilizables:
- Formateo de fechas, números, monedas
- Validación de datos
- Almacenamiento local
- Detección de dispositivos

## Instalación y Configuración

### 1. Requisitos Previos
- Servidor web (Apache, Nginx, etc.)
- PHP 7.4+ (para el backend existente)
- PostgreSQL (base de datos)
- Acceso a srv1024767.hstgr.cloud

### 2. Configuración
1. Copiar los archivos al servidor web
2. Configurar la conexión a la base de datos en `justice2-config.js`
3. Ajustar las URLs de la API si es necesario
4. Configurar SSL/TLS

### 3. Personalización
- Modificar colores en los archivos CSS si se desea
- Ajustar configuración en `justice2-config.js`
- Personalizar mensajes y textos

## Uso

### Autenticación
El sistema de autenticación es no intrusivo. Los usuarios pueden navegar por el sitio sin interrupciones, y el sistema gestionará las sesiones automáticamente.

### Navegación
La navegación se realiza a través del menú principal, manteniendo el diseño original de Justice pero con funcionalidades dinámicas.

### Asistente IA
Accesible desde el menú principal, ofrece:
- Chat en tiempo real
- Análisis de documentos
- Investigación jurídica
- Reconocimiento de voz

### Gestión de Documentos
Permite:
- Upload de archivos con drag-and-drop
- Análisis automático con IA
- Búsqueda y filtrado avanzado
- Visualización múltiple

### Gestión de Casos
Ofrece:
- Creación y edición de casos
- Análisis predictivo
- Seguimiento de estados
- Múltiples vistas

### Analytics
Proporciona:
- Dashboards interactivos
- Métricas de rendimiento
- Análisis de IA
- Exportación de datos

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrarse
- `POST /api/auth/refresh` - Refrescar token
- `POST /api/auth/logout` - Cerrar sesión

### Documentos
- `GET /api/documents` - Listar documentos
- `POST /api/documents` - Subir documento
- `GET /api/documents/:id` - Obtener documento
- `PUT /api/documents/:id` - Actualizar documento
- `DELETE /api/documents/:id` - Eliminar documento

### Casos
- `GET /api/cases` - Listar casos
- `POST /api/cases` - Crear caso
- `GET /api/cases/:id` - Obtener caso
- `PUT /api/cases/:id` - Actualizar caso
- `DELETE /api/cases/:id` - Eliminar caso

### Analytics
- `GET /api/analytics/dashboard` - Datos del dashboard
- `GET /api/analytics/reports` - Reportes
- `GET /api/analytics/metrics` - Métricas

## Seguridad

### Implementaciones
- Protección CSRF
- XSS Protection
- Rate Limiting
- Encriptación de datos
- Auditoría de logs

### Mejores Prácticas
- Validación de entrada de datos
- Sanitización de contenido
- Gestión segura de tokens
- HTTPS obligatorio
- Actualizaciones regulares

## Rendimiento

### Optimizaciones
- Caché inteligente
- Lazy loading
- Compresión de assets
- Mínimas peticiones HTTP
- CDN para assets estáticos

### Métricas
- Tiempo de carga < 2 segundos
- First Contentful Paint < 1.5s
- Lighthouse score > 90
- Core Web Vitals óptimos

## Accesibilidad

### Implementaciones
- ARIA labels
- Navegación por teclado
- Contraste WCAG AA
- Screen reader compatible
- Focus management

## Browser Support

### Navegadores Soportados
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Características Modernas
- ES6+ JavaScript
- CSS Grid y Flexbox
- Web Speech API
- LocalStorage/SessionStorage
- Fetch API

## Mantenimiento

### Actualizaciones
- Revisar dependencias regularmente
- Actualizar librerías de seguridad
- Monitorear rendimiento
- Backup de datos

### Monitoreo
- Logs de errores
- Métricas de uso
- Performance monitoring
- Uptime monitoring

## Troubleshooting

### Problemas Comunes

#### No carga la página
- Verificar conexión a la base de datos
- Comprobar configuración de API
- Revisar logs de errores

#### Error de autenticación
- Verificar tokens JWT
- Comprobar configuración de refresh
- Revisar tiempo de sesión

#### Problemas con uploads
- Verificar permisos de archivos
- Comprobar límites de tamaño
- Revisar configuración de PHP

### Logs
Los errores se registran en:
- Consola del navegador (debug mode)
- Logs del servidor
- Sistema de logging remoto (configurable)

## Contribución

### Desarrollo Local
1. Clonar el repositorio
2. Configurar entorno local
3. Instalar dependencias
4. Iniciar servidor de desarrollo

### Código
- Seguir estándares de código
- Comentar funciones complejas
- Mantener compatibilidad
- Testing obligatorio

## Licencia

Este proyecto está bajo licencia proprietaria. Todos los derechos reservados.

## Contacto

Para soporte técnico:
- Email: soporte@justice2.com
- Teléfono: +34 900 123 456
- Web: www.justice2.com

---

**Justice 2 v2.0.0** - Plataforma Jurídica Inteligente
Manteniendo la excelencia del diseño original con tecnología de vanguardia.