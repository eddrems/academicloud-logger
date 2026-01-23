# 🚀 Guía de Deploy - AcademiCloud Logger

## 📋 Métodos de Deploy

### **Opción 1: PM2 (Recomendado para producción)** ⭐

PM2 es un gestor de procesos para Node.js que mantiene tu servicio corriendo 24/7.

#### 1. Instalar PM2 globalmente
```bash
npm install -g pm2
```

#### 2. Iniciar el servicio
```bash
cd /Users/edissonmendieta/.config/valet/Sites/academicloud_logger
npm run pm2:start
```

#### 3. Configurar auto-inicio en reboot
```bash
pm2 startup
# Ejecutar el comando que PM2 te muestra
pm2 save
```

#### 4. Comandos útiles
```bash
# Ver status
pm2 status

# Ver logs en tiempo real
pm2 logs academicloud-logger

# Ver logs con filtros
pm2 logs academicloud-logger --lines 100
pm2 logs academicloud-logger --err  # Solo errores

# Monitorear recursos
pm2 monit

# Reiniciar
pm2 restart academicloud-logger

# Detener
pm2 stop academicloud-logger

# Eliminar del PM2
pm2 delete academicloud-logger
```

---

### **Opción 2: Systemd (Linux Nativo)**

Para servidores Linux sin PM2.

#### 1. Copiar archivo de servicio
```bash
sudo cp academicloud-logger.service /etc/systemd/system/
```

#### 2. Editar rutas en el archivo
```bash
sudo nano /etc/systemd/system/academicloud-logger.service
# Cambiar WorkingDirectory y ExecStart a las rutas correctas
```

#### 3. Habilitar e iniciar
```bash
sudo systemctl daemon-reload
sudo systemctl enable academicloud-logger
sudo systemctl start academicloud-logger
```

#### 4. Comandos útiles
```bash
# Ver status
sudo systemctl status academicloud-logger

# Ver logs
sudo journalctl -u academicloud-logger -f

# Reiniciar
sudo systemctl restart academicloud-logger

# Detener
sudo systemctl stop academicloud-logger
```

---

### **Opción 3: Docker (Para contenedores)**

#### 1. Crear Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

#### 2. Build y run
```bash
docker build -t academicloud-logger .
docker run -d \
  --name academicloud-logger \
  -p 3001:3001 \
  --env-file .env \
  --restart always \
  academicloud-logger
```

---

### **Opción 4: Desarrollo Local (Mac con Valet)**

Para desarrollo local en tu Mac:

#### 1. Instalar dependencias
```bash
cd /Users/edissonmendieta/.config/valet/Sites/academicloud_logger
npm install
```

#### 2. Crear archivo .env
```bash
cp env.example .env
nano .env
# Configurar MONGODB_URI con tus credenciales
```

#### 3. Ejecutar en desarrollo
```bash
npm run dev
```

#### 4. O con PM2 (no se cierra al cerrar terminal)
```bash
npm run pm2:start
```

---

## 🔧 Configuración en Laravel

Agregar al `.env` de Laravel:

```bash
# MongoDB Logger Microservice
MONGODB_LOGGER_ENABLED=true
MONGODB_LOGGER_URL=http://localhost:3001
```

---

## ✅ Verificar que está funcionando

### 1. Health check
```bash
curl http://localhost:3001/health
```

Deberías ver:
```json
{
  "status": "ok",
  "uptime": 123.45,
  "mongodb": "connected",
  "buffer_size": 0,
  "timestamp": "2025-10-23T12:00:00.000Z"
}
```

### 2. Probar escribir log
```bash
curl -X POST http://localhost:3001/log \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Test desde curl",
    "context": {"test": true}
  }'
```

### 3. Ver estadísticas
```bash
curl http://localhost:3001/stats
```

---

## 🚨 Troubleshooting

### El servicio no inicia
```bash
# Ver logs de error
pm2 logs academicloud-logger --err

# Verificar que el puerto 3001 no esté ocupado
lsof -i :3001
```

### No conecta a MongoDB
```bash
# Verificar conexión desde terminal
mongosh "your_mongodb_uri"

# Revisar .env tiene MONGODB_URI correcto
cat .env | grep MONGODB_URI
```

### PHP no puede conectarse al servicio
```bash
# Verificar que el servicio esté corriendo
curl http://localhost:3001/health

# Verificar firewall permite localhost
# (normalmente localhost siempre está permitido)
```

---

## 📊 Monitoreo en Producción

### Con PM2 Web Dashboard
```bash
pm2 install pm2-server-monit
```

### Logs rotativos automáticos
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🔄 Actualizar el Servicio

```bash
cd /Users/edissonmendieta/.config/valet/Sites/academicloud_logger
git pull  # o copiar nuevos archivos
npm install  # si hay nuevas dependencias
pm2 restart academicloud-logger
```

---

## 💾 Backup de Logs

MongoDB puede exportar logs periódicamente:

```bash
# Exportar logs de los últimos 7 días
mongodump --uri="mongodb://..." --db=academicloud_logs --collection=logs --query='{"timestamp": {"$gte": {"$date": "2025-10-16T00:00:00Z"}}}'
```

---

## 🎯 Próximos Pasos

1. ✅ Configurar .env con tus credenciales
2. ✅ Ejecutar `npm install`
3. ✅ Ejecutar `npm run pm2:start`
4. ✅ Verificar con `curl http://localhost:3001/health`
5. ✅ Configurar Laravel `.env` con `MONGODB_LOGGER_ENABLED=true`
6. ✅ Usar `MongoLogService` en tu código

