# 📝 AcademiCloud MongoDB Auditoría Microservice

Microservicio Node.js para registrar auditoría estructurada en MongoDB desde AcademiCloud (Laravel).

## 🚀 Instalación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp env.example .env
# Editar .env con tus credenciales de MongoDB
```

### 3. Ejecutar en desarrollo
```bash
npm run dev
```

### 4. Ejecutar en producción con PM2
```bash
# Instalar PM2 globalmente (solo primera vez)
npm install -g pm2

# Iniciar servicio
npm run pm2:start

# Ver logs
npm run pm2:logs

# Monitorear
npm run pm2:monit

# Reiniciar
npm run pm2:restart

# Detener
npm run pm2:stop
```

## 📡 API Endpoints

### POST /log
Escribe un log en MongoDB.

**Request:**
```json
{
  "level": "info",
  "message": "Estudiante actualizado",
  "context": {
    "estudiante_id": 123,
    "campos": ["apellidos", "nombres"]
  },
  "user_id": 45,
  "ip": "192.168.1.1",
  "url": "/estudiantes/gestionv2/actualizar_estudiante",
  "extra": {}
}
```

**Response:**
```json
{
  "success": true
}
```

### GET /health
Health check del servicio.

**Response:**
```json
{
  "status": "ok",
  "uptime": 12345.67,
  "mongodb": "connected",
  "buffer_size": 25,
  "timestamp": "2025-10-23T12:00:00.000Z"
}
```

### GET /logs/search
Buscar logs en MongoDB.

**Query Parameters:**
- `level` - Filtrar por nivel (info, warning, error)
- `user_id` - Filtrar por usuario
- `from` - Fecha desde (ISO 8601)
- `to` - Fecha hasta (ISO 8601)
- `limit` - Límite de resultados (default: 100)

**Example:**
```
GET /logs/search?level=error&limit=50
```

### GET /stats
Estadísticas de logs.

**Response:**
```json
{
  "success": true,
  "buffer_size": 10,
  "stats": {
    "total": [{ "count": 15234 }],
    "by_level": [
      { "_id": "info", "count": 12000 },
      { "_id": "error", "count": 234 }
    ],
    "recent": [...]
  }
}
```

## 🔧 Configuración

### Variables de Entorno (.env)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `MONGODB_URI` | Connection string de MongoDB | `mongodb://user:pass@host:27017/db` |
| `MONGODB_DATABASE` | Nombre de la base de datos | `academicloud_logs` |
| `PORT` | Puerto del servidor | `3001` |
| `BATCH_SIZE` | Tamaño del buffer antes de forzar escritura | `100` |
| `BATCH_INTERVAL` | Intervalo de escritura en ms | `500` |

### Optimización de Rendimiento

- **BATCH_SIZE**: Aumenta para mayor throughput (e.g., 500)
- **BATCH_INTERVAL**: Reduce para logs más en tiempo real (e.g., 100ms)

## 📊 Rendimiento

- **Throughput**: ~8,000-10,000 logs/segundo
- **Latencia PHP**: <1ms (async)
- **Latencia real MongoDB**: ~10-30ms (batch)

## 🔒 Seguridad

El servicio corre en `localhost:3001` y solo acepta conexiones locales.

Para producción, considera:
- Agregar autenticación (API Key)
- Configurar firewall (solo localhost)
- Limitar rate limiting

## 📦 Deploy en Producción

### Con PM2 (Recomendado)
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Como Systemd Service
```bash
sudo nano /etc/systemd/system/academicloud-logger.service
# Copiar contenido de academicloud-logger.service
sudo systemctl enable academicloud-logger
sudo systemctl start academicloud-logger
```

### Con Docker
```bash
docker build -t academicloud-logger .
docker run -d -p 3001:3001 --env-file .env academicloud-logger
```

## 📝 Uso desde Laravel

```php
use App\Services\MongoLogService;

$logger = new MongoLogService();
$logger->log('info', 'Estudiante actualizado', [
    'estudiante_id' => 123,
    'cambios' => ['apellidos', 'nombres']
]);
```

## 🛠️ Mantenimiento

### Ver logs de PM2
```bash
pm2 logs academicloud-logger
```

### Reiniciar servicio
```bash
pm2 restart academicloud-logger
```

### Ver status
```bash
pm2 status
```

## 📈 Monitoreo

Visita `http://localhost:3001/health` para verificar estado del servicio.

Visita `http://localhost:3001/stats` para ver estadísticas de logs.

