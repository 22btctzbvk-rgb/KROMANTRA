const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Servir archivos estáticos
app.use(express.static(__dirname));

// CONEXIÓN A MONGODB ATLAS (Reemplaza con tu cadena de conexión real si es necesario)
const MONGO_URI = process.env.MONGO_URI || "TU_CADENA_DE_CONEXION_DE_MONGODB";

mongoose.connect(MONGO_URI)
    .then(() => console.log('Conectado a MongoDB Atlas'))
    .catch(err => console.error('Error al conectar a MongoDB:', err));

// Esquemas y Modelos de Base de Datos
const productoSchema = new mongoose.Schema({
    id: String,
    nombre: String,
    descripcion: String,
    imagen: String,
    rangos: Array
});
const Producto = mongoose.model('Producto', productoSchema);

const pedidoSchema = new mongoose.Schema({
    folio: Number,
    cliente: Object,
    productos: Array,
    total: Number,
    metodoPago: String,
    estado: { type: String, default: 'Pendiente' },
    fecha: String
});
const Pedido = mongoose.model('Pedido', pedidoSchema);

const configSchema = new mongoose.Schema({
    titulo: String,
    subtitulo: String,
    quienesSomos: String,
    whatsapp: String,
    banco: String,
    tarjeta: String,
    titular: String,
    tiempoElaboracion: String,
    horarios: String,
    instagram: String,
    tiktok: String,
    materiales: Array,
    galeria: Array
});
const Config = mongoose.model('Config', configSchema);

// ==================== RUTAS DE LA API ====================

// 1. Configuración general
app.get('/api/config', async (req, res) => {
    try {
        let config = await Config.findOne();
        res.json(config || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/config', async (req, res) => {
    try {
        await Config.deleteMany({});
        const nuevaConfig = new Config(req.body);
        await nuevaConfig.save();
        res.json({ exito: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Productos
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find();
        res.json(productos);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/productos', async (req, res) => {
    try {
        const nuevoProd = new Producto(req.body);
        await nuevoProd.save();
        res.json({ exito: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        await Producto.findOneAndUpdate({ id: req.params.id }, req.body);
        res.json({ exito: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/productos/:id', async (req, res) => {
    try {
        await Producto.findOneAndDelete({ id: req.params.id });
        res.json({ exito: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Pedidos (¡Rutas clave para conectar tienda y admin!)
app.get('/api/pedidos', async (req, res) => {
    try {
        const pedidos = await Pedido.find().sort({ folio: -1 });
        res.json(pedidos);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pedido', async (req, res) => {
    try {
        const ultimoPedido = await Pedido.findOne().sort({ folio: -1 });
        const siguienteFolio = ultimoPedido && ultimoPedido.folio ? ultimoPedido.folio + 1 : 1001;
        const fechaActual = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
        
        const nuevoPedido = new Pedido({
            folio: siguienteFolio,
            cliente: req.body.cliente,
            productos: req.body.productos,
            total: req.body.total,
            metodoPago: req.body.metodoPago,
            estado: 'Pendiente',
            fecha: fechaActual
        });
        
        await nuevoPedido.save();
        res.json({ exito: true, folio: siguienteFolio });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/pedidos/:folio', async (req, res) => {
    try {
        await Pedido.findOneAndUpdate({ folio: req.params.folio }, { estado: req.body.estado });
        res.json({ exito: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/pedidos/:folio', async (req, res) => {
    try {
        await Pedido.findOneAndDelete({ folio: req.params.folio });
        res.json({ exito: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Rastreo
app.get('/api/rastreo', async (req, res) => {
    try {
        const q = req.query.q;
        const query = isNaN(q) ? { "cliente.telefono": new RegExp(q, 'i') } : { folio: Number(q) };
        const pedidos = await Pedido.find(query);
        res.json(pedidos);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
