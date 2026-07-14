# MobiGest

Sistema de gestión de órdenes de servicio para talleres de reparación de dispositivos móviles. Proyecto de título — TIHI84.

Stack: **React + Vite + Tailwind** (frontend) · **Node.js + Express + Sequelize** (backend) · **PostgreSQL** (base de datos) · **JWT** (autenticación).

---

## 1. Estructura del proyecto

```
mobigest/
├── backend/          API REST (Node.js + Express + PostgreSQL)
├── frontend/         Aplicación web (React + Vite + Tailwind)
└── DEPLOY_AWS.md      Guía paso a paso para desplegar en AWS
```

## 2. Requisitos previos

- Node.js 18 o superior
- PostgreSQL 14 o superior (local o remoto)
- npm

## 3. Puesta en marcha local (para probar antes de desplegar)

### 3.1 Base de datos

Crea una base de datos vacía en tu PostgreSQL local:

```sql
CREATE DATABASE mobigest;
```

### 3.2 Backend

```bash
cd backend
cp .env.example .env
# Edita .env con los datos de tu PostgreSQL local (DB_USER, DB_PASSWORD, etc.)

npm install
npm run seed      # crea las tablas y carga datos de ejemplo (clientes, órdenes, etc.)
npm run dev        # levanta la API en http://localhost:4000
```

Cuentas de demostración que crea el seed:

| Rol          | Email                       | Clave         |
|--------------|------------------------------|---------------|
| Administrador| admin@mobigest.cl            | mobigest2026  |
| Técnico      | tecnico@mobigest.cl          | mobigest2026  |
| Cliente      | javiera.munoz@gmail.com      | mobigest2026  |

**Importante:** cambia estas claves antes de presentar o usar en producción (Configuración → no implementada aún en UI; puedes regenerar el hash y actualizarlo directo en la tabla `usuarios`, o pedir que se agregue una pantalla de cambio de clave).

### 3.3 Frontend

En otra terminal:

```bash
cd frontend
cp .env.example .env
# Verifica que VITE_API_URL apunte a tu backend (http://localhost:4000/api/v1 para desarrollo local)

npm install
npm run dev        # levanta la app en http://localhost:5173
```

Abre `http://localhost:5173` en tu navegador. Inicia sesión con alguna de las cuentas de arriba.

## 4. Módulos incluidos

- **Dashboard**: KPIs operativos (TAT promedio, % entregas a tiempo, ingresos del mes, satisfacción, disponibilidad, stock bajo, órdenes sin asignar) con gráficos y **tablero de estados tipo Kanban** (Recibido hoy / En proceso / Terminado hoy / Pendiente-Atrasado).
- **Órdenes de Servicio**: ciclo completo — recepción, diagnóstico con checklist de componentes, presupuesto con aprobación del cliente, repuestos utilizados (con descuento automático de stock), asignación/reasignación de técnico, workflow de estados, calificación del cliente, mensajería directa cliente-técnico, y generación de comprobante en PDF.
- **Portal del Cliente**: registro/login propio, solicitud de servicio autoservicio, seguimiento de estado en tiempo real con línea de tiempo, aprobación/rechazo de presupuesto, chat con el taller, calificación al finalizar, historial y descarga de comprobante, edición de datos de contacto.
- **Notificaciones**: campana con notificaciones en la app (cambios de estado, nuevos mensajes, nuevas solicitudes, presupuestos aprobados/rechazados, calificaciones). El envío por email/SMS queda como punto de extensión documentado en `backend/src/utils/notificar.js`.
- **Clientes**: CRUD con búsqueda (personal del taller).
- **Dispositivos**: CRUD con validación de IMEI (algoritmo de Luhn) e historial de órdenes por equipo.
- **Repuestos**: control de inventario con alerta de stock bajo mínimo.
- **Autenticación**: JWT con 3 roles (administrador / técnico / cliente) y permisos diferenciados por endpoint.

## 5. Despliegue en AWS

Ver **`DEPLOY_AWS.md`** — guía paso a paso con los comandos exactos para desplegar siguiendo la misma arquitectura del informe (EC2, RDS PostgreSQL Multi-AZ, Application Load Balancer, S3, Route 53, Certificate Manager).

## 6. Notas técnicas para la defensa

- La generación de PDF usa **pdfkit** en el servidor (reemplaza a pdfmake mencionado inicialmente en el informe: misma función — generación de comprobantes en servidor — implementación más liviana y sin dependencias de fuentes externas). Si te preguntan, puedes mencionar que se evaluaron ambas librerías y se optó por pdfkit por simplicidad de despliegue.
- Las contraseñas se almacenan con **bcrypt** (factor de costo 10).
- Las rutas de la API están protegidas con middleware JWT (`Authorization: Bearer <token>`) y con control de acceso por rol (`admin`, `tecnico`, `cliente`); un cliente sólo puede ver/editar sus propias órdenes y dispositivos.
- El stock de repuestos se descuenta/restaura automáticamente dentro de una **transacción de base de datos** al crear, editar o eliminar una orden, evitando inconsistencias.
- El código de orden (`OS-2026-00001`) se genera automáticamente de forma correlativa.
- Las notificaciones y mensajes usan **polling simple** (refresco cada 30s en la campana) en vez de WebSockets, para mantener la arquitectura simple; es un punto de extensión natural si se requiere tiempo real estricto.

## 7. Cambios agregados sobre la especificación original

Esta versión agrega, en base al documento de especificación (`Especificación_ Registro de Órdenes de Servicio.md`), lo que faltaba del **Perfil Cliente** y del resto del MVP sugerido:

1. Registro/login de clientes y portal propio (antes sólo existían roles admin/técnico).
2. Solicitud de servicio en autoservicio, con creación de la orden "sin asignar" hasta que un admin le asigna técnico.
3. Aprobación/rechazo de presupuesto por el cliente.
4. Chat cliente-técnico por orden.
5. Calificación del servicio al finalizar.
6. Notificaciones en la app ante cambios de estado, mensajes, nuevas solicitudes y decisiones de presupuesto.
7. Tablero Kanban de estados en el dashboard (Recibido hoy / En proceso / Terminado hoy / Pendiente-Atrasado), tal como pedía la especificación.
8. Asignación y reasignación de técnico desde el detalle de la orden (antes la orden quedaba fija al usuario que la creaba).
9. Descarga de comprobante corregida para funcionar con la autenticación JWT (antes usaba un enlace sin token).

**Fuera de alcance en esta iteración** (quedan como "terciarios" según la priorización del propio documento, ítem 7 del MVP sugerido): notificaciones reales por email/SMS/WhatsApp (hay un punto de extensión listo en el código), subida de fotos/evidencia con archivos binarios (el campo existe en el modelo pero no hay endpoint de carga de imágenes), firma digital táctil, modo offline, multi-sucursal, y programa de puntos/referidos.

Después de estos cambios, **es necesario volver a correr `npm run seed`** (recrea las tablas con los nuevos campos y roles) antes de levantar el backend.
