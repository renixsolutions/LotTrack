const express = require('express');
const router = express.Router();
const { isLoggedIn, hasRole } = require('../middleware/auth');
const db = require('../db');
const { notifyNewOrder } = require('../services/email');

// New Order Form (Shop Owner)
router.get('/new', isLoggedIn, hasRole(['shop_owner']), async (req, res) => {
  res.render('new_order');
});

// Save Order
router.post('/new', isLoggedIn, hasRole(['shop_owner']), async (req, res) => {
  const { mobile, address, description } = req.body;
  try {
    const shop = req.session.user;
    const owner = await db('users').where('role', 'owner').first();

    await db('orders').insert({
      shop_id: shop.id,
      mobile,
      address,
      description,
      status: 'PENDING'
    });

    // Notify owner
    notifyNewOrder(owner.email, shop.name);

    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Order Placement Failed');
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
    res.redirect('/orders/manage');
  } catch (err) {
    console.error(err);
    res.status(500).send('Update Failed');
  }
});

module.exports = router;
