const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// ==========================================
// 1. CONEXIÓN A MONGODB ATLAS
// ==========================================
const MONGO_URI = 'mongodb+srv://angelvalderrama944_db_user:UAT5y3u0Jqzbd1mQ@cluster0.xlybp0s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; 

// ==========================================
// 2. ESQUEMAS Y MODELOS
// ==========================================
const productoSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    imagen: { type: String },
    tieneVariantes: { type: Boolean, default: false },
    opciones: [{
        nombre: String,
        rangos: [{ min: Number, max: Number, precio: Number }]
    }],
    rangos: [{ min: Number, max: Number, precio: Number }]
});

const pedidoSchema = new mongoose.Schema({
    folio: Number,
    cliente: { nombre: String, telefono: String },
    productos: Array,
    total: Number,
    estado: { type: String, default: 'Pendiente' },
    fecha: String
});

const Producto = mongoose.model('Producto', productoSchema);
const Pedido = mongoose.model('Pedido', pedidoSchema);

// Cargar catálogo inicial si está vacío
async function inicializarCatalogo() {
    try {
        const count = await Producto.countDocuments();
        if (count === 0) {
            await Producto.insertMany([
                {
                    id: 'taza',
                    nombre: 'Tazas personalizadas de 11 oz',
                    imagen: 'taza.jpg',
                    tieneVariantes: false,
                    rangos: [
                        { min: 1, max: 10, precio: 100 },
                        { min: 11, max: 99, precio: 80 },
                        { min: 100, max: 1000, precio: 40 }
                    ]
                },
                {
                    id: 'pines',
                    nombre: 'Pines 5.5 cm',
                    imagen: 'pines.jpg',
                    tieneVariantes: false,
                    rangos: [
                        { min: 1, max: 25, precio: 22 },
                        { min: 26, max: 50, precio: 20 },
                        { min: 51, max: 100, precio: 18 }
                    ]
                },
                {
                    id: 'vaso_cubero',
                    nombre: 'Vaso cubero de 295 ml',
                    imagen: 'vaso_cubero.jpg',
                    tieneVariantes: false,
                    rangos: [
                        { min: 12, max: 24, precio: 55 },
                        { min: 25, max: 49, precio: 45 },
                        { min: 50, max: 100, precio: 35 }
                    ]
                },
                {
                    id: 'vaso_popote',
                    nombre: 'Vaso de plástico con popote (474 ml)',
                    imagen: 'vaso_popote.jpg',
                    tieneVariantes: false,
                    rangos: [
                        { min: 1, max: 30, precio: 45 },
                        { min: 31, max: 89, precio: 43 },
                        { min: 90, max: 1000, precio: 40 }
                    ]
                },
                {
                    id: 'termo',
                    nombre: 'Termos personalizados de 30 Oz',
                    imagen: 'termo_1.jpg',
                    tieneVariantes: true,
                    opciones: [
                        {
                            nombre: 'Grabado 1 Cara',
                            rangos: [
                                { min: 1, max: 4, precio: 350 },
                                { min: 5, max: 100, precio: 320 }
                            ]
                        },
                        {
                            nombre: 'Grabado 2 Caras',
                            rangos: [
                                { min: 1, max: 4, precio: 430 },
                                { min: 5, max: 100, precio: 400 }
                            ]
                        }
                    ]
                }
            ]);
            console.log('📦 Catálogo inicial cargado en MongoDB.');
        }
    } catch (err) {
        console.error('Error al inicializar catálogo:', err);
    }
}


// ==========================================
// 3. RUTAS API (PRODUCTOS Y PEDIDOS)
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

// NUEVO: Editar producto existente
app.put('/api/productos/:id', async (req, res) => {
    try {
        const { nombre, imagen, precio } = req.body;
        await Producto.findOneAndUpdate({ id: req.params.id }, {
            nombre,
            imagen,
            rangos: [{ min: 1, max: 1000, precio }]
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

// NUEVO: Actualizar estado del pedido (Pendiente, En proceso, Entregado)
app.put('/api/pedidos/:folio', async (req, res) => {
    try {
        const { estado } = req.body;
        await Pedido.findOneAndUpdate({ folio: req.params.folio }, { estado });
        res.json({ exito: true });
    } catch (error) {
        res.status(500).json({ exito: false, error: error.message });
    }
});

// ==========================================
// 4. RUTAS DE VISTAS (TIENDA Y ADMIN)
// ==========================================
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ==========================================
// 5. INICIALIZACIÓN SEGURA DEL SERVIDOR
// ==========================================
async function iniciarServidor() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('🟢 Conectado exitosamente a la base de datos de MongoDB');

        await inicializarCatalogo();

        app.listen(PORT, () => {
            console.log(`🌟 Servidor Kromantra activo en http://localhost:${PORT}`);
            console.log(`📊 Panel de administración: http://localhost:${PORT}/admin`);
        });
    } catch (err) {
        console.error('🔴 Error al conectar a MongoDB:', err);
    }
}

iniciarServidor();
