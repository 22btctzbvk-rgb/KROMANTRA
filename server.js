const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname)));

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Modelos
const pedidoSchema = new mongoose.Schema({
    folio: { type: Number, required: true, unique: true },
    cliente: { nombre: String, telefono: String, direccion: String },
    productos: Array,
    total: Number,
    estado: { type: String, default: 'Pendiente' },
    metodoPago: String,
    fecha: { type: String, default: () => new Date().toLocaleString() }
});
const Pedido = mongoose.model('Pedido', pedidoSchema);

// CORRECCIÓN 1: Se agregó 'stock' dentro del esquema
const productoSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    nombre: String,
    categoria: { type: String, default: 'Grabado láser' },
    stock: { type: Number, default: 0 }, // <-- AQUÍ ESTÁ EL STOCK
    imagen: String,
    rangos: Array
});
const Producto = mongoose.model('Producto', productoSchema);

const configSchema = new mongoose.Schema({
    key: { type: String, unique: true, default: 'main' },
    titulo: String, subtitulo: String, quienesSomos: String,
    whatsapp: String, banco: String, tarjeta: String, titular: String,
    tiempoElaboracion: String, horarios: String, instagram: String, tiktok: String,
    materiales: Array, galeria: Array
});
const Config = mongoose.model('Config', configSchema);

const reseñaSchema = new mongoose.Schema({
    nombre: String,
    comentario: String,
    estrellas: { type: Number, default: 5 },
    fecha: { type: String, default: () => new Date().toLocaleDateString() }
});
const Reseña = mongoose.model('Reseña', reseñaSchema);

// Rutas Config
app.get('/api/config', async (req, res) => {
    try { const cfg = await Config.findOne({ key: 'main' }); res.json(cfg || {}); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/config', async (req, res) => {
    try {
        await Config.findOneAndUpdate({ key: 'main' }, { ...req.body, key: 'main' }, { upsert: true, new: true });
        res.json({ exito: true });
    } catch (err) { res.status(500).json({ exito: false, error: err.message }); }
});

// Rutas Productos
app.get('/api/productos', async (req, res) => {
    try { res.json(await Producto.find()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// CORRECCIÓN 2: Se usa findOneAndUpdate con upsert para crear o actualizar sin error de clave duplicada
app.post('/api/productos', async (req, res) => {
    try {
        const { id, ...datos } = req.body;
        await Producto.findOneAndUpdate(
            { id: id },
            { id, ...datos },
            { upsert: true, new: true }
        );
        res.json({ exito: true });
    } catch (err) { res.status(500).json({ exito: false, error: err.message }); }
});

app.put('/api/productos/:id', async (req, res) => {
    try { 
        await Producto.findOneAndUpdate({ id: req.params.id }, req.body, { new: true, upsert: true }); 
        res.json({ exito: true }); 
    } catch (err) { res.status(500).json({ exito: false, error: err.message }); }
});

app.delete('/api/productos/:id', async (req, res) => {
    try { await Producto.findOneAndDelete({ id: req.params.id }); res.json({ exito: true }); }
    catch (err) { res.status(500).json({ exito: false, error: err.message }); }
});

// Rutas Reseñas
app.get('/api/resenas', async (req, res) => {
    try { res.json(await Reseña.find().sort({ _id: -1 })); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/resenas', async (req, res) => {
    try { await new Reseña(req.body).save(); res.json({ exito: true }); }
    catch (err) { res.status(500).json({ exito: false, error: err.message }); }
});

app.delete('/api/resenas/:id', async (req, res) => {
    try { await Reseña.findByIdAndDelete(req.params.id); res.json({ exito: true }); }
    catch (err) { res.status(500).json({ exito: false, error: err.message }); }
});

// Rutas Pedidos
app.get('/api/pedidos', async (req, res) => {
    try { res.json(await Pedido.find().sort({ folio: -1 })); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

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
    } catch (err) { res.status(500).json({ exito: false, error: err.message }); }
});

app.put('/api/pedidos/:folio', async (req, res) => {
    try { await Pedido.findOneAndUpdate({ folio: req.params.folio }, { estado: req.body.estado }, { new: true }); res.json({ exito: true }); }
    catch (err) { res.status(500).json({ exito: false, error: err.message }); }
});

app.delete('/api/pedidos/:folio', async (req, res) => {
    try { await Pedido.findOneAndDelete({ folio: req.params.folio }); res.json({ exito: true }); }
    catch (err) { res.status(500).json({ exito: false, error: err.message }); }
});

// Rastreo Inteligente
app.get('/api/rastreo', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.json([]);
        const numQ = Number(q);
        let condiciones = [
            { "cliente.telefono": new RegExp(q, 'i') },
            { "cliente.nombre": new RegExp(q, 'i') }
        ];
        if (!isNaN(numQ)) condiciones.push({ folio: numQ });
        res.json(await Pedido.find({ $or: condiciones }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor en puerto ${PORT}`));
