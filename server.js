const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
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
    fecha: { type: Date, default: Date.now }
});
const Pedido = mongoose.model('Pedido', pedidoSchema);

const productoSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    nombre: String,
    imagen: String,
    precios: Object
});
const Producto = mongoose.model('Producto', productoSchema);

// ==================== RUTAS DE PEDIDOS ====================

// 1. Obtener todos los pedidos (Panel de Administración)
app.get('/api/pedidos', async (req, res) => {
    try {
        const pedidos = await Pedido.find().sort({ fecha: -1 });
        res.json(pedidos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Crear un nuevo pedido (Tienda Pública)
app.post('/api/pedidos', async (req, res) => {
    try {
        const ultimoPedido = await Pedido.findOne().sort({ folio: -1 });
        const nuevoFolio = ultimoPedido && ultimoPedido.folio ? ultimoPedido.folio + 1 : 1001;

        const nuevoPedido = new Pedido({
            folio: req.body.folio || nuevoFolio,
            cliente: req.body.cliente,
            productos: req.body.productos,
            total: req.body.total,
            estado: req.body.estado || 'Pendiente'
        });

        const guardado = await nuevoPedido.save();
        res.status(201).json(guardado);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Actualizar estado de un pedido (Administrador)
app.put('/api/pedido/:id', async (req, res) => {
    try {
        const actualizado = await Pedido.findByIdAndUpdate(
            req.params.id, 
            { estado: req.body.estado }, 
            { new: true }
        );
        res.json(actualizado);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Rastreo inteligente (Busca por folio numérico, teléfono o nombre del cliente)
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

// ==================== RUTAS DE PRODUCTOS ====================

// Obtener todos los productos (Catálogo)
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find();
        res.json(productos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Guardar o actualizar un producto (Administrador)
app.post('/api/productos', async (req, res) => {
    try {
        const { id, nombre, imagen, precios } = req.body;
        const productoActualizado = await Producto.findOneAndUpdate(
            { id: id },
            { nombre, imagen, precios },
            { new: true, upsert: true }
        );
        res.json(productoActualizado);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Eliminar un producto (Administrador)
app.delete('/api/productos/:id', async (req, res) => {
    try {
        await Producto.findOneAndDelete({ id: req.params.id });
        res.json({ mensaje: 'Producto eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== INICIO DEL SERVIDOR ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
