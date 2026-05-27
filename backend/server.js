const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysqlPool = require('./db/mysql');
const { connectMongo, getDb } = require('./db/mongodb');
const { ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Explicit routes for frontend files (in case static fails)
app.get('/store.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/store.html'));
});
app.get('/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-dashboard.html'));
});

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ------------------- AUTHENTICATION -------------------
app.post('/api/register', async (req, res) => {
    const { email, password, full_name, birthdate, address } = req.body;
    if (!email || !password || !full_name) {
        return res.status(400).json({ error: 'Email, password and full name required' });
    }
    try {
        const hashed = await bcrypt.hash(password, 10);
        const [result] = await mysqlPool.query(
            'INSERT INTO users (email, password_hash, full_name, birthdate, address) VALUES (?, ?, ?, ?, ?)',
            [email, hashed, full_name, birthdate || null, address || null]
        );
        const token = jwt.sign({ userId: result.insertId, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: result.insertId, email, full_name, birthdate, address } });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    try {
        const [rows] = await mysqlPool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, birthdate: user.birthdate, address: user.address } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/profile', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [rows] = await mysqlPool.query('SELECT id, email, full_name, birthdate, address FROM users WHERE id = ?', [decoded.userId]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

app.put('/api/profile', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const { full_name, birthdate, address, email } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await mysqlPool.query(
            'UPDATE users SET full_name = ?, birthdate = ?, address = ?, email = ? WHERE id = ?',
            [full_name, birthdate || null, address || null, email, decoded.userId]
        );
        res.json({ message: 'Profile updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------- CART (persistent) -------------------
app.get('/api/cart', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authentication required' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [rows] = await mysqlPool.query(
            `SELECT c.product_id, p.name, p.price, p.stock, c.quantity 
             FROM user_cart c 
             JOIN products p ON c.product_id = p.id 
             WHERE c.user_id = ?`,
            [decoded.userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

app.post('/api/cart', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authentication required' });
    const token = authHeader.split(' ')[1];
    const { items } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        await mysqlPool.query('DELETE FROM user_cart WHERE user_id = ?', [userId]);
        for (const item of items) {
            if (item.quantity > 0) {
                await mysqlPool.query(
                    'INSERT INTO user_cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                    [userId, item.product_id, item.quantity]
                );
            }
        }
        res.json({ message: 'Cart saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------- PRODUCTS -------------------
app.post('/api/products', upload.single('image'), async (req, res) => {
    const { name, price, stock, category } = req.body;
    if (!name || price === undefined || stock === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        let image_path = null;
        if (req.file) image_path = `/uploads/${req.file.filename}`;
        const [result] = await mysqlPool.query(
            'INSERT INTO products (name, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?)',
            [name, price, stock, category, image_path]
        );
        res.status(201).json({ id: result.insertId, name, price, stock, category, image_url: image_path });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await mysqlPool.query('SELECT * FROM products');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    const { name, price, stock, category } = req.body;
    const productId = req.params.id;
    try {
        let image_path = null;
        if (req.file) {
            image_path = `/uploads/${req.file.filename}`;
        } else {
            const [rows] = await mysqlPool.query('SELECT image_url FROM products WHERE id = ?', [productId]);
            image_path = rows[0]?.image_url || null;
        }
        await mysqlPool.query(
            'UPDATE products SET name=?, price=?, stock=?, category=?, image_url=? WHERE id=?',
            [name, price, stock, category, image_path, productId]
        );
        res.json({ message: 'Product updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    const productId = parseInt(req.params.id);
    try {
        await mysqlPool.query('DELETE FROM products WHERE id = ?', [productId]);
        const db = getDb();
        await db.collection('attributes').deleteMany({ product_id: productId });
        await db.collection('reviews').deleteMany({ product_id: productId });
        res.json({ message: 'Product and related MongoDB data deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------- ORDERS (transaction) -------------------
app.post('/api/orders', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authentication required' });
    const token = authHeader.split(' ')[1];
    let userId;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const { items } = req.body;
    if (!items || !items.length) {
        return res.status(400).json({ error: 'No items in cart' });
    }

    const connection = await mysqlPool.getConnection();
    try {
        await connection.beginTransaction();

        let total = 0;
        const productUpdates = [];
        for (const item of items) {
            const [rows] = await connection.query(
                'SELECT name, price, stock FROM products WHERE id = ? FOR UPDATE',
                [item.product_id]
            );
            if (rows.length === 0) throw new Error(`Product ${item.product_id} not found`);
            if (rows[0].stock < item.quantity) throw new Error(`Insufficient stock for ${rows[0].name}`);
            total += rows[0].price * item.quantity;
            productUpdates.push({
                id: item.product_id,
                name: rows[0].name,
                price: rows[0].price,
                quantity: item.quantity,
                newStock: rows[0].stock - item.quantity
            });
        }

        const [userRows] = await connection.query('SELECT address, full_name, email FROM users WHERE id = ?', [userId]);
        if (!userRows[0]?.address) {
            throw new Error('Please update your shipping address in your profile before ordering');
        }

        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 7);
        const formattedDate = deliveryDate.toISOString().split('T')[0];

        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, customer_name, customer_email, delivery_date, total_amount) VALUES (?, ?, ?, ?, ?)',
            [userId, userRows[0].full_name, userRows[0].email, formattedDate, total]
        );
        const orderId = orderResult.insertId;

        for (const prod of productUpdates) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_time) VALUES (?, ?, ?, ?, ?)',
                [orderId, prod.id, prod.name, prod.quantity, prod.price]
            );
            await connection.query('UPDATE products SET stock = ? WHERE id = ?', [prod.newStock, prod.id]);
        }

        await connection.query('DELETE FROM user_cart WHERE user_id = ?', [userId]);

        await connection.commit();
        res.status(201).json({ orderId, delivery_date: formattedDate, total });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const [orders] = await mysqlPool.query(`
            SELECT o.*, 
                   GROUP_CONCAT(CONCAT(oi.product_name, ' (x', oi.quantity, ')') SEPARATOR ', ') AS items_summary
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.order_date DESC
        `);
        for (const order of orders) {
            const [items] = await mysqlPool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
            order.items = items;
        }
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------- USER MANAGEMENT (admin) -------------------
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await mysqlPool.query(`
            SELECT id, email, full_name, birthdate, address, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    const { full_name, email, birthdate, address } = req.body;
    try {
        await mysqlPool.query(
            'UPDATE users SET full_name = ?, email = ?, birthdate = ?, address = ? WHERE id = ?',
            [full_name, email, birthdate || null, address || null, userId]
        );
        res.json({ message: 'User updated' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        await mysqlPool.query('DELETE FROM users WHERE id = ?', [userId]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------- ATTRIBUTES (MongoDB) -------------------
app.post('/api/attributes', async (req, res) => {
    const { product_id, attributes } = req.body;
    if (!product_id || !attributes) return res.status(400).json({ error: 'product_id and attributes required' });
    try {
        const db = getDb();
        await db.collection('attributes').updateOne(
            { product_id: parseInt(product_id) },
            { $set: { product_id: parseInt(product_id), ...attributes, updated_at: new Date() } },
            { upsert: true }
        );
        res.json({ message: 'Attributes saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/attributes/:product_id', async (req, res) => {
    try {
        const db = getDb();
        const doc = await db.collection('attributes').findOne({ product_id: parseInt(req.params.product_id) });
        res.json(doc || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------- REVIEWS (MongoDB) -------------------
app.post('/api/reviews', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Login required to post a review' });
    const token = authHeader.split(' ')[1];
    let userId;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const { product_id, rating, comment } = req.body;
    if (!product_id || !rating) return res.status(400).json({ error: 'product_id and rating required' });
    try {
        const [userRows] = await mysqlPool.query('SELECT full_name FROM users WHERE id = ?', [userId]);
        const userName = userRows[0]?.full_name || 'User';
        const db = getDb();
        const review = {
            product_id: parseInt(product_id),
            rating: parseInt(rating),
            comment: comment || '',
            user: userName,
            created_at: new Date()
        };
        const result = await db.collection('reviews').insertOne(review);
        review._id = result.insertedId;
        res.status(201).json(review);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reviews/:product_id', async (req, res) => {
    try {
        const db = getDb();
        const reviews = await db.collection('reviews')
            .find({ product_id: parseInt(req.params.product_id) })
            .sort({ created_at: -1 })
            .toArray();
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/reviews/:id', async (req, res) => {
    try {
        const db = getDb();
        await db.collection('reviews').deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ message: 'Review deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------- START SERVER -------------------
async function start() {
    await connectMongo();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
start();