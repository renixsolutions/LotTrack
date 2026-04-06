require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { ConnectSessionKnexStore } = require('connect-session-knex');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// EJS Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session Store
const store = new ConnectSessionKnexStore({
  knex: db,
  tablename: 'sessions', // Create this table automatically
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  store: store,
  proxy: process.env.NODE_ENV === 'production',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    secure: process.env.NODE_ENV === 'production' // true for Render HTTPS
  }
}));

// Global variable for user session in EJS
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const lotRoutes = require('./routes/lots');
const orderRoutes = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboard');
const usersRoutes = require('./routes/users');

app.use('/auth', authRoutes);
app.use('/lots', lotRoutes);
app.use('/orders', orderRoutes);
app.use('/users', usersRoutes);
app.use('/', dashboardRoutes);

const QRCode = require('qrcode');

// Public Lot Page (No login)
app.get('/lot/:id', async (req, res) => {
  try {
    const lot = await db('lots')
      .where('lots.id', req.params.id)
      .first();
    
    if (!lot) return res.status(404).render('404');

    const items = await db('lot_items').where('lot_id', lot.id);
    const shop = await db('users').where('id', lot.shop_id).first();
    
    // Generate QR Code for the specific URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const url = `${baseUrl}/lot/${lot.id}`;
    const qrImage = await QRCode.toDataURL(url);
    
    res.render('public_lot', { lot, items, shop, qrImage });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// 404 Handler - Must be last
app.use((req, res) => {
  res.status(404).render('404', { 
    user: req.session.user || null,
    pageTitle: 'Page Not Found' 
  });
});
