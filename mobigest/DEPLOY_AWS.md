# Despliegue de MobiGest en AWS

Esta guía despliega MobiGest siguiendo **exactamente** la arquitectura de tu informe (capítulos X y XIV): VPC con 2 zonas de disponibilidad, ALB, EC2, RDS PostgreSQL Multi-AZ, S3, Route 53 y Certificate Manager.

Tiempo estimado: **1.5 a 2.5 horas** la primera vez. Necesitas una cuenta de AWS (la capa gratuita cubre la mayoría de esto si usas instancias `t3.micro`/`db.t3.micro`).

> 💡 Si tienes poco tiempo antes de la defensa, puedes hacer una versión simplificada (un solo EC2 + una RDS sin Multi-AZ, sin ALB) — lo indico en cada paso como **"Atajo"**.

---

## Paso 0 — Antes de empezar

Necesitas:
- Una cuenta de AWS con tarjeta válida (capa gratuita).
- AWS CLI instalado en tu computador ([instrucciones](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)) y configurado con `aws configure` (Access Key + Secret Key de un usuario IAM con permisos de administrador, creado desde IAM → Users).
- Tu código de MobiGest subido a un repositorio de GitHub (privado está bien).
- Un dominio (opcional). Si no tienes uno, puedes usar la URL pública del ALB/EC2 directamente para la demo — omite los pasos de Route 53 y Certificate Manager.

---

## Paso 1 — Red (VPC, subredes, zonas de disponibilidad)

**Consola → VPC → Create VPC → "VPC and more"**

- Nombre: `mobigest-vpc`
- IPv4 CIDR: `10.0.0.0/16`
- Número de AZs: **2**
- Subredes públicas: 2 (una por AZ)
- Subredes privadas: 2 (una por AZ)
- NAT Gateway: **1 por AZ** (o "1" para ahorrar costos)
- Click **Create VPC**.

Esto crea automáticamente las subredes, tablas de rutas y el Internet Gateway — exactamente la topología del diagrama de tu informe (10.5).

> **Atajo:** usa la VPC `default` que ya viene en tu cuenta y crea solo 1 subred pública adicional. Ahorra ~15 min pero pierdes el Multi-AZ real.

---

## Paso 2 — Grupos de seguridad (Security Groups)

**Consola → EC2 → Security Groups → Create security group**

1. `sg-alb` (para el Load Balancer):
   - Inbound: HTTP 80 (0.0.0.0/0), HTTPS 443 (0.0.0.0/0)
2. `sg-ec2` (para las instancias de la API):
   - Inbound: TCP 4000 — Source: `sg-alb` (solo desde el balanceador)
   - Inbound: SSH 22 — Source: tu IP (`My IP`)
3. `sg-rds` (para la base de datos):
   - Inbound: PostgreSQL 5432 — Source: `sg-ec2` (solo desde las instancias de la API)

Esto reproduce el aislamiento de capas que describiste en 14.2.2 / 10.6.

---

## Paso 3 — Base de datos (RDS PostgreSQL Multi-AZ)

**Consola → RDS → Create database**

- Motor: **PostgreSQL 16**
- Plantilla: `Production` (para Multi-AZ real) o `Free tier` (para ahorrar costos en la demo)
- Identificador: `mobigest-db`
- Usuario maestro: `mobigest_admin`
- Contraseña: genera una segura y **guárdala** (la necesitas para el `.env` del backend)
- Clase de instancia: `db.t3.micro`
- Almacenamiento: 20 GB SSD
- **Multi-AZ**: Sí (esto es lo que justifica tu SLA de disponibilidad del informe)
- VPC: `mobigest-vpc`
- Subred: privada
- Acceso público: **No**
- Security group: `sg-rds`
- Nombre de la base de datos inicial: `mobigest`

Click **Create database**. Tarda 5–10 minutos en quedar disponible.

Cuando esté lista, copia el **endpoint** (algo como `mobigest-db.xxxxx.us-east-1.rds.amazonaws.com`) — lo necesitas en el Paso 5.

---

## Paso 4 — Almacenamiento (S3) y secretos

### S3 (para backups/archivos futuros)
**Consola → S3 → Create bucket**
- Nombre: `mobigest-files-<tu-nombre-o-numero-random>` (debe ser único globalmente)
- Bloquea todo el acceso público (déjalo marcado por defecto)

### Secrets Manager (opcional pero recomendado, según tu diagrama 10.6)
**Consola → Secrets Manager → Store a new secret → Other type of secret**
- Agrega pares clave/valor: `DB_PASSWORD`, `JWT_SECRET`
- Nombre: `mobigest/prod`

> **Atajo:** si tienes poco tiempo, omite Secrets Manager y pon las variables directamente en el `.env` del servidor EC2 (menos seguro, pero funcional para la demo).

---

## Paso 5 — Servidor de la aplicación (EC2)

**Consola → EC2 → Launch instance**

- Nombre: `mobigest-app-1`
- AMI: **Ubuntu Server 24.04 LTS**
- Tipo de instancia: `t3.micro` (capa gratuita) o `t3.medium` si quieres más margen para la demo
- Par de claves: crea uno nuevo (`mobigest-key.pem`) y descárgalo — lo necesitas para conectarte por SSH
- Red: `mobigest-vpc`, subred **pública** (para simplificar el acceso SSH; en producción real iría en subred privada detrás del NAT)
- Security group: `sg-ec2`
- Almacenamiento: 20 GB

Click **Launch instance**. Asóciale una **Elastic IP** (EC2 → Elastic IPs → Allocate → Associate con tu instancia) para que la IP no cambie si se reinicia.

### Conéctate por SSH y prepara el servidor:

```bash
chmod 400 mobigest-key.pem
ssh -i mobigest-key.pem ubuntu@<IP_ELASTICA>

# En el servidor:
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx
sudo npm install -g pm2

# Clona tu repositorio
git clone https://github.com/<tu-usuario>/mobigest.git
cd mobigest/backend
npm install --omit=dev
```

### Configura las variables de entorno de producción:

```bash
nano .env
```

```env
PORT=4000
NODE_ENV=production
DB_HOST=<endpoint-de-tu-RDS>
DB_PORT=5432
DB_NAME=mobigest
DB_USER=mobigest_admin
DB_PASSWORD=<la-contraseña-que-creaste-en-el-paso-3>
JWT_SECRET=<genera-uno-largo-y-aleatorio-distinto-al-de-ejemplo>
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://mobigest.cl
```

> Genera un JWT_SECRET seguro con: `openssl rand -base64 48`

### Carga las tablas y datos de demo, y levanta el servicio con PM2:

```bash
npm run seed          # crea tablas + datos de ejemplo en la RDS
pm2 start src/server.js --name mobigest-api
pm2 save
pm2 startup           # sigue las instrucciones que imprime para que arranque solo al reiniciar
```

Verifica que responda:
```bash
curl http://localhost:4000/api/v1/health
```

---

## Paso 6 — Compilar y servir el Frontend

Puedes servir el frontend desde el mismo EC2 con Nginx, o desde S3 + CloudFront. La opción con Nginx en el mismo servidor es la más rápida para la demo:

### En tu computador (no en el servidor), compila el frontend apuntando a la IP/dominio real de tu API:

```bash
cd frontend
echo "VITE_API_URL=https://mobigest.cl/api/v1" > .env.production
npm install
npm run build
```

Esto genera la carpeta `dist/`. Súbela al servidor:

```bash
scp -i mobigest-key.pem -r dist/* ubuntu@<IP_ELASTICA>:/home/ubuntu/frontend-dist/
```

### Configura Nginx como proxy inverso (en el servidor EC2):

```bash
sudo nano /etc/nginx/sites-available/mobigest
```

```nginx
server {
    listen 80;
    server_name mobigest.cl www.mobigest.cl;

    root /home/ubuntu/frontend-dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:4000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mobigest /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

En este punto, visitando la IP elástica en el navegador ya deberías ver MobiGest funcionando. 🎉

---

## Paso 7 — Balanceador de carga (ALB) — opcional pero recomendado para tu defensa

Esto es lo que justifica tu diagrama de Topología (10.5) y el SLA de disponibilidad.

**Consola → EC2 → Load Balancers → Create → Application Load Balancer**

- Nombre: `mobigest-alb`
- Esquema: Internet-facing
- VPC: `mobigest-vpc`, subredes **públicas** de ambas AZs
- Security group: `sg-alb`
- Listener HTTP 80 → crea un **Target Group** (`mobigest-tg`, tipo instance, puerto 80) y registra tu(s) instancia(s) EC2.
- Health check path: `/api/v1/health` (puerto 4000) — o `/` si prefieres chequear el frontend.

> **Atajo:** si solo tienes 1 instancia EC2 y poco tiempo, puedes omitir el ALB y apuntar tu dominio directo a la Elastic IP de la instancia. Pierdes el balanceo Multi-AZ pero la demo funciona igual.

---

## Paso 8 — Dominio y certificado SSL (Route 53 + ACM)

Si tienes un dominio propio:

1. **ACM** (Certificate Manager) → Request certificate → dominio `mobigest.cl` y `*.mobigest.cl` → validación por DNS → agrega el registro CNAME que te indica en tu proveedor de DNS (o en Route 53 si migraste el dominio).
2. Una vez validado el certificado, vuelve al ALB → Listeners → agrega un listener **HTTPS 443** y selecciónalo.
3. **Route 53** → Hosted zones → crea un registro tipo **A (Alias)** apuntando a tu ALB (o a la Elastic IP si no usaste ALB).

> **Atajo:** sin dominio propio, usa la IP elástica o el DNS público que AWS asigna automáticamente a tu EC2/ALB. HTTPS quedaría pendiente, pero para una demo en clase no es bloqueante — menciónalo como "trabajo futuro" si te preguntan.

---

## Paso 9 — Monitoreo (CloudWatch)

**Consola → CloudWatch → Alarms → Create alarm**

Crea al menos 1-2 alarmas simples para poder mostrarlas en la defensa:
- CPU de la instancia EC2 > 80% por 5 minutos.
- Conexiones de RDS > umbral razonable.

Esto respalda tu capítulo de Plan de Mantención (13.3) y el diagrama de infraestructura (10.6).

---

## Checklist final antes de la defensa

- [ ] `https://tu-dominio.cl` (o la IP) carga el login de MobiGest.
- [ ] Puedes iniciar sesión con `admin@mobigest.cl` / la clave que configuraste.
- [ ] El dashboard muestra los KPIs con datos reales (no vacíos — corre el seed o crea algunas órdenes de prueba).
- [ ] Puedes crear una orden de servicio nueva de principio a fin.
- [ ] El botón "Comprobante PDF" descarga un PDF correctamente.
- [ ] Tienes un screenshot/backup de cada pantalla por si falla el internet en la sala de defensa.

## Costos aproximados (capa gratuita / mínimo)

Con `t3.micro` + `db.t3.micro` sin Multi-AZ, estás dentro de la capa gratuita de AWS (12 meses) para una cuenta nueva. Con Multi-AZ real y NAT Gateway en 2 AZs, espera entre **USD 35–60/mes** — recuerda **apagar o eliminar los recursos** después de la defensa si no vas a seguir usándolos, para no generar cobros.
