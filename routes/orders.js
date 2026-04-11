const express = require('express');
const router = express.Router();
const { isLoggedIn, hasRole } = require('../middleware/auth');
const db = require('../db');
const { notifyNewOrder } = require('../services/email');
const upload = require('../middleware/upload');

// View My Orders (Shop Owner)
router.get('/', isLoggedIn, hasRole(['shop_owner']), async (req, res) => {
  try {
    const orders = await db('orders')
      .where('shop_id', req.session.user.id)
      .orderBy('created_at', 'desc');
    res.render('order_list', { 
        orders,
        user: req.session.user,
        activePage: 'orders',
        pageTitle: 'My Order Requests'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// New Order Form (Shop Owner)
router.get('/new', isLoggedIn, hasRole(['shop_owner']), async (req, res) => {
  res.render('new_order');
});

// Save Order
router.post('/new', isLoggedIn, hasRole(['shop_owner']), (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err) {
      console.error('Upload Error:', err);
      return res.redirect('/orders/new?error=' + encodeURIComponent(err.message));
    }
    next();
  });
}, async (req, res) => {
  const { mobile, address, description } = req.body || {};
  const images = req.files && req.files.length > 0 ? JSON.stringify(req.files.map(f => f.filename)) : null;

  try {
    const shop = req.session.user;
    const owner = await db('users').where('role', 'owner').first();

    await db('orders').insert({
      shop_id: shop.id,
      mobile,
      address,
      description,
      status: 'PENDING',
      images
    });

    // Notify owner
    notifyNewOrder(owner.email, shop.full_name);

    res.redirect('/orders?success=Order%20Placed%20Successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/orders/new?error=Order%20Placement%20Failed');
  }
});

// Manage Orders (Owner)
router.get('/manage', isLoggedIn, hasRole(['owner']), async (req, res) => {
  try {
    const orders = await db('orders')
      .join('users', 'orders.shop_id', 'users.id')
      .select('orders.*', 'users.full_name as shop_name')
      .orderBy('created_at', 'desc');
    res.render('manage_orders', { orders });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Update Order Status
router.post('/update-status/:id', isLoggedIn, hasRole(['owner']), async (req, res) => {
  const { status } = req.body;
  try {
    await db('orders').where('id', req.params.id).update({ status });
    res.redirect('/orders/manage?success=Status%20Updated%20Successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/orders/manage?error=Status%20Update%20Failed');
  }
});

module.exports = router;
