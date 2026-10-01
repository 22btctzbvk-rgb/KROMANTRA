const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Permitir imágenes en Base64 grandes
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname))); // Sirve archivos estáticos (HTML, imágenes, etc.)

// Conexión a MongoDB Atlas
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// ==================== MODELOS ====================
const pedidoSchema = new mongoose.Schema({
    folio: { type: Number, required: true, unique: true },
    cliente: {
        nombre: String,
        telefono: String,
        direccion: String
    },
    productos: Array,
    total: Number,
    estado: { type: String, default: 'Pendiente' },
    metodoPago: String,
    estadoPago: { type: String, default: 'Pendiente' },
    fecha: { type: String, default: () => new Date().toLocaleString() }
});
const Pedido = mongoose.model('Pedido', pedidoSchema);

const productoSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    nombre: String,
    imagen: String,
    rangos: Array
});
const Producto = mongoose.model('Producto', productoSchema);

const configSchema = new mongoose.Schema({
    key: { type: String, unique: true, default: 'main' },
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

// ==================== RUTAS DE CONFIGURACIÓN ====================
app.get('/api/config', async (req, res) => {
    try {
        const cfg = await Config.findOne({ key: 'main' });
        res.json(cfg || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/config', async (req, res) => {
    try {
        await Config.findOneAndUpdate({ key: 'main' }, { ...req.body, key: 'main' }, { upsert: true, new: true });
        res.json({ exito: true });
    } catch (err) {
        res.status(500).json({ exito: false, error: err.message });
    }
});

// ==================== RUTAS DE PRODUCTOS ====================
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find();
        res.json(productos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/productos', async (req, res) => {
    try {
        const nuevo = new Producto(req.body);
        await nuevo.save();
        res.json({ exito: true });
    } catch (err) {
        res.status(500).json({ exito: false, error: err.message });
    }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        await Producto.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        res.json({ exito: true });
    } catch (err) {
        res.status(500).json({ exito: false, error: err.message });
    }
});

app.delete('/api/productos/:id', async (req, res) => {
    try {
        await Producto.findOneAndDelete({ id: req.params.id });
        res.json({ exito: true });
    } catch (err) {
        res.status(500).json({ exito: false, error: err.message });
    }
});

// ==================== RUTAS DE PEDIDOS ====================
app.get('/api/pedidos', async (req, res) => {
    try {
        const pedidos = await Pedido.find().sort({ folio: -1 });
        res.json(pedidos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Compatible tanto con /api/pedidos (tienda) como /api/pedido
app.post(['/api/pedidos', '/api/pedido'], async (req, res) => {
    try {
        const ultimoPedido = await Pedido.findOne().sort({ folio: -1 });
        const nuevoFolio = ultimoPedido && ultimoPedido.folio ? ultimoPedido.folio + 1 : 1001;

        const nuevoPedido = new Pedido({
            folio: req.body.folio || nuevoFolio,
            cliente: req.body.cliente,
            productos: req.body.productos,
            total: req.body.total,
            metodoPago: req.body.metodoPago,
            estado: req.body.estado || 'Pendiente'
        });

        const guardado = await nuevoPedido.save();
        res.status(201).json({ exito: true, folio: guardado.folio, pedido: guardado });
    } catch (err) {
        res.status(500).json({ exito: false, error: err.message });
    }
});

app.put('/api/pedidos/:folio', async (req, res) => {
    try {
        await Pedido.findOneAndUpdate({ folio: req.params.folio }, { estado: req.body.estado }, { new: true });
        res.json({ exito: true });
    } catch (err) {
        res.status(500).json({ exito: false, error: err.message });
    }
});

app.delete('/api/pedidos/:folio', async (req, res) => {
    try {
        await Pedido.findOneAndDelete({ folio: req.params.folio });
        res.json({ exito: true });
    } catch (err) {
        res.status(500).json({ exito: false, error: err.message });
    }
});

// ==================== RASTREO INTELIGENTE ====================
app.get('/api/rastreo', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.json([]);
        
        const numQ = Number(q);
        let condiciones = [
            { "cliente.telefono": new RegExp(q, 'i') },
            { "cliente.nombre": new RegExp(q, 'i') }
        ];
        
        if (!isNaN(numQ)) {
            condiciones.push({ folio: numQ });
        }
        
        const pedidos = await Pedido.find({ $or: condiciones });
        res.json(pedidos);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// ==================== INICIO DEL SERVIDOR ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
