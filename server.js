const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// IMPORTANTE: Aumentar el límite de tamaño para permitir subir imágenes (diseños y fotos de productos)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Conexión a MongoDB Atlas (Reemplaza con tu cadena de conexión si manejas variables de entorno o déjala así si ya funciona)
const MONGO_URI = process.env.MONGO_URI || 'TU_CONEXION_MONGODB_ATLAS'; 

mongoose.connect(MONGO_URI)
    .then(() => console.log('Conectado exitosamente a MongoDB Atlas'))
    .catch(err => console.error('Error conectando a MongoDB:', err));

// ==========================================
// 1. ESQUEMAS Y MODELOS DE BASE DE DATOS
// ==========================================
const productoSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    nombre: { type: String, required: true },
    imagen: String,
    tieneVariantes: Boolean,
    rangos: [{
        min: Number,
        max: Number,
        precio: Number
    }]
});
const Producto = mongoose.model('Producto', productoSchema);

const pedidoSchema = new mongoose.Schema({
    folio: Number,
    cliente: {
        nombre: String,
        telefono: String
    },
    productos: [{
        id: String,
        nombre: String,
        cantidad: Number,
        variante: String,
        personalizacion: String,
        diseno: String, // <--- Imagen o logotipo adjuntado por el cliente
        subtotal: Number
    }],
    total: Number,
    estado: { type: String, default: 'Pendiente' },
    fecha: String
});
const Pedido = mongoose.model('Pedido', pedidoSchema);

// ==========================================
// 2. RUTAS API (PRODUCTOS)
// ==========================================
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find();
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

app.post('/api/productos', async (req, res) => {
    try {
        const nuevo = new Producto(req.body);
        await nuevo.save();
        res.json({ exito: true });
    } catch (error) {
        res.status(500).json({ exito: false, error: error.message });
    }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        const { nombre, imagen, rangos } = req.body;
        await Producto.findOneAndUpdate({ id: req.params.id }, {
            nombre,
            imagen,
            rangos
        });
        res.json({ exito: true });
    } catch (error) {
        res.status(500).json({ exito: false, error: error.message });
    }
});

app.delete('/api/productos/:id', async (req, res) => {
    try {
        await Producto.findOneAndDelete({ id: req.params.id });
        res.json({ exito: true });
    } catch (error) {
        res.status(500).json({ exito: false, error: error.message });
    }
});

// ==========================================
// 3. RUTAS API (PEDIDOS)
// ==========================================
app.post('/api/pedido', async (req, res) => {
    try {
        const datos = req.body;
        const nuevoPedido = new Pedido({
            folio: Date.now(),
            ...datos,
            estado: 'Pendiente',
            fecha: new Date().toLocaleString()
        });
        await nuevoPedido.save();
        res.json({ exito: true, folio: nuevoPedido.folio });
    } catch (error) {
        res.status(500).json({ exito: false, error: 'Error al guardar pedido' });
    }
});

app.get('/api/pedidos', async (req, res) => {
    try {
        const pedidos = await Pedido.find().sort({ folio: -1 });
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
});

app.put('/api/pedidos/:folio', async (req, res) => {
    try {
        const { estado } = req.body;
        await Pedido.findOneAndUpdate({ folio: req.params.folio }, { estado });
        res.json({ exito: true });
    } catch (error) {
        res.status(500).json({ exito: false, error: error.message });
    }
});

app.delete('/api/pedidos/:folio', async (req, res) => {
    try {
        await Pedido.findOneAndDelete({ folio: req.params.folio });
        res.json({ exito: true });
    } catch (error) {
        res.status(500).json({ exito: false, error: error.message });
    }
});

// ==========================================
// 4. RUTAS PARA CARGAR LAS PÁGINAS HTML
// ==========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ==========================================
// 5. INICIALIZACIÓN DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de Kromantra corriendo en el puerto ${PORT}`);
});
