const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors()); // Permitir requests desde Laravel

// Variables globales
let db;
let logBuffer = [];
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 100;
const BATCH_INTERVAL = parseInt(process.env.BATCH_INTERVAL) || 500; // ms

// Conectar a MongoDB
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DATABASE || 'academicloud_logs';

MongoClient.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 50,
    minPoolSize: 10
})
.then(client => {
    db = client.db(dbName);
    console.log(`✅ Conectado a MongoDB: ${dbName}`);
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    
    // Iniciar procesamiento de buffer
    startBatchProcessor();
})
.catch(err => {
    console.error('❌ Error al conectar a MongoDB:', err);
    process.exit(1);
});

// Procesador de buffer (escritura en lotes)
function startBatchProcessor() {
    setInterval(async () => {
        if (logBuffer.length > 0) {
            const logsToInsert = [...logBuffer];
            logBuffer = [];
            
            try {
                await db.collection('auditoria').insertMany(logsToInsert, { ordered: false });
                console.log(`✍️  Escritos ${logsToInsert.length} registros de auditoría en MongoDB`);
            } catch (error) {
                console.error('❌ Error al escribir logs de auditoría:', error.message);
                // Si falla, intentar reinsertarlos uno por uno
                for (const log of logsToInsert) {
                    try {
                        await db.collection('auditoria').insertOne(log);
                    } catch (e) {
                        console.error('Error al insertar registro de auditoría individual:', e.message);
                    }
                }
            }
        }
    }, BATCH_INTERVAL);
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        mongodb: db ? 'connected' : 'disconnected',
        buffer_size: logBuffer.length,
        timestamp: new Date().toISOString()
    });
});

// Endpoint principal para escribir logs de auditoría
app.post('/log', (req, res) => {
    try {
        const { 
            tipo, 
            subtipo, 
            id_referencia_principal, 
            id_referencia_secundario,
            accion,
            autor,
            ip,
            institucion,
            detalles 
        } = req.body;
        
        // Validar datos mínimos
        if (!tipo || !accion) {
            return res.status(400).json({
                success: false,
                error: 'tipo y accion son requeridos'
            });
        }
        
        // Agregar al buffer
        logBuffer.push({
            fecha: new Date(),
            tipo,
            subtipo: subtipo || null,
            id_referencia_principal: id_referencia_principal || null,
            id_referencia_secundario: id_referencia_secundario || null,
            accion,
            autor: autor || null,
            ip: ip || req.ip,
            institucion: institucion || null,
            detalles: detalles || {},
            _created_at: new Date()
        });
        
        // Si el buffer está muy lleno, forzar escritura inmediata
        if (logBuffer.length >= BATCH_SIZE) {
            setImmediate(async () => {
                const logsToInsert = [...logBuffer];
                logBuffer = [];
                try {
                    await db.collection('auditoria').insertMany(logsToInsert, { ordered: false });
                } catch (error) {
                    console.error('Error al escribir batch completo:', error.message);
                }
            });
        }
        
        // Responder inmediatamente (no esperar a MongoDB)
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error en /log:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para búsqueda de logs de auditoría
app.get('/logs/search', async (req, res) => {
    try {
        const { 
            tipo, 
            subtipo, 
            id_referencia_principal, 
            autor, 
            institucion,
            from, 
            to, 
            limit = 100 
        } = req.query;
        
        const query = {};
        
        if (tipo) query.tipo = tipo;
        if (subtipo) query.subtipo = subtipo;
        if (id_referencia_principal) query.id_referencia_principal = parseInt(id_referencia_principal);
        if (autor) query.autor = { $regex: autor, $options: 'i' }; // Búsqueda parcial
        if (institucion) query.institucion = institucion;
        
        if (from || to) {
            query.fecha = {};
            if (from) query.fecha.$gte = new Date(from);
            if (to) query.fecha.$lte = new Date(to);
        }
        
        const logs = await db.collection('auditoria')
            .find(query)
            .sort({ fecha: -1 })
            .limit(parseInt(limit))
            .toArray();
        
        res.json({
            success: true,
            count: logs.length,
            logs
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para estadísticas de auditoría
app.get('/stats', async (req, res) => {
    try {
        const stats = await db.collection('auditoria').aggregate([
            {
                $facet: {
                    total: [{ $count: 'count' }],
                    por_tipo: [
                        { $group: { _id: '$tipo', count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    por_subtipo: [
                        { $group: { _id: { tipo: '$tipo', subtipo: '$subtipo' }, count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 20 }
                    ],
                    por_institucion: [
                        { $group: { _id: '$institucion', count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    ultimas_24h: [
                        { $match: { fecha: { $gte: new Date(Date.now() - 24*60*60*1000) } } },
                        { $count: 'count' }
                    ],
                    recientes: [
                        { $sort: { fecha: -1 } },
                        { $limit: 10 },
                        { $project: { _id: 0, tipo: 1, subtipo: 1, accion: 1, autor: 1, fecha: 1 } }
                    ]
                }
            }
        ]).toArray();
        
        res.json({
            success: true,
            buffer_size: logBuffer.length,
            stats: stats[0]
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    
    // Escribir logs pendientes
    if (logBuffer.length > 0) {
        console.log(`📝 Escribiendo ${logBuffer.length} logs pendientes...`);
        try {
            await db.collection('auditoria').insertMany(logBuffer, { ordered: false });
            console.log('✅ Logs pendientes guardados');
        } catch (error) {
            console.error('❌ Error al guardar logs pendientes:', error.message);
        }
    }
    
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     📝 AcademiCloud MongoDB Logger Microservice           ║
║                                                            ║
║     Puerto: ${PORT}                                          ║
║     Base de datos: ${dbName}                 ║
║     Batch size: ${BATCH_SIZE}                                       ║
║     Batch interval: ${BATCH_INTERVAL}ms                                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});

