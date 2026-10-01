const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Configura tu conexión a MongoDB Atlas
const mongoUrl = process.env.MONGO_URI || "mongodb+srv://angelvalderrama944_db_user:UAT5y3u0Jqzbd1mQ@cluster0.xlybp0s.mongodb.net";
const dbName = "Prueba"; // Apunta a la base de datos donde tienes tus productos y pedidos reales
let db;

MongoClient.connect(mongoUrl)
    .then(client => {
        db = client.db(dbName);
        console.log("Conectado exitosamente a MongoDB Atlas");
        const PORT = process.env.PORT || 10000;
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
        });
    })
    .catch(err => console.error("Error al conectar a MongoDB:", err));

// ==========================================
// RUTA: CONFIGURACIÓN DEL NEGOCIO
// ==========================================
app.get('/api/config', async (req, res) => {
    try {
        let config = await db.collection('configuracion').findOne({});
        if (!config) {
            config = {
                titulo: "Kromantra",
                subtitulo: "Regalos Personalizados y Mayoreo Inteligente",
                quienesSomos: "Somos un taller dedicado a crear piezas con alta precisión y detalle. Ya sea que busques un regalo único y personalizado para una ocasión especial, o necesites producción de mayoreo inteligente para hacer crecer tu marca, ponemos pasión y cuidado en cada trabajo que fabricamos.",
                whatsapp: "525514494333",
                banco: "BBVA",
                tarjeta: "4152314063676335",
                titular: "Carolina Perez Mendez"
            };
        }
        res.json(config);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener configuración" });
    }
});

app.post('/api/config', async (req, res) => {
    try {
        const nuevaConfig = req.body;
        await db.collection('configuracion').updateOne(
            {}, 
            { $set: nuevaConfig }, 
            { upsert: true }
        );
        res.json({ exito: true });
    } catch (e) {
        res.status(500).json({ error: "Error al guardar configuración" });
    }
});

// ==========================================
// RUTAS: PRODUCTOS
// ==========================================
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await db.collection('productos').find({}).toArray();
        res.json(productos);
    } catch (e) {
        res.status(500).json({ error: "Error al obtener productos" });
    }
});

app.post('/api/productos', async (req, res) => {
    try {
        const nuevoProducto = req.body;
        const count = await db.collection('productos').countDocuments();
        nuevoProducto.id = count + 1;
        await db.collection('productos').insertOne(nuevoProducto);
        res.json({ exito: true });
    } catch (e) {
        res.status(500).json({ error: "Error al guardar producto" });
    }
});

app.delete('/api/productos/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.collection('productos').deleteOne({ id: id });
        res.json({ exito: true });
    } catch (e) {
        res.status(500).json({ error: "Error al eliminar producto" });
    }
});

// ==========================================
// RUTAS: PEDIDOS Y RASTREO
// ==========================================
app.post('/api/pedido', async (req, res) => {
    try {
        const pedido = req.body;
        const count = await db.collection('pedidos').countDocuments();
        pedido.folio = 1000 + count + 1;
        pedido.estado = "Pendiente en Taller";
        pedido.estadoPago = pedido.metodoPago.includes('Tarjeta') ? "Verificando Comprobante" : "Pago en Taller";
        pedido.fecha = new Date();
        
        await db.collection('pedidos').insertOne(pedido);
        res.json({ exito: true, folio: pedido.folio });
    } catch (e) {
        res.status(500).json({ error: "Error al registrar pedido" });
    }
});

app.get('/api/rastreo', async (req, res) => {
    try {
        const q = req.query.q;
        const query = {
            $or: [
                { folio: isNaN(q) ? q : parseInt(q) },
                { "cliente.telefono": { $regex: q,$options: 'i' } }
            ]
        };
        const pedidos = await db.collection('pedidos').find(query).toArray();
        res.json(pedidos);
    } catch (e) {
        res.status(500).json({ error: "Error en rastreo" });
    }
});
