const express = require('express');
const router = express.Router();
const { isLoggedIn, hasRole } = require('../middleware/auth');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { notifyDispatch, notifyReceipt } = require('../services/email');

// All Lots List
router.get('/', isLoggedIn, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const totalItems = (await db('lots').count('id as count').first()).count;
    const totalPages = Math.ceil(totalItems / limit);

    const lots = await db('lots')
      .join('users', 'lots.shop_id', 'users.id')
      .select('lots.*', 'users.full_name as shop_name')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
      
    res.render('lots_list', { 
        lots, 
        user: req.session.user,
        currentPage: page, 
        totalPages, 
        activePage: 'lots', 
        pageTitle: 'All Shipments' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// View Specific Lot Items
router.get('/view/:id', isLoggedIn, async (req, res) => {
  try {
    const lot = await db('lots').where('id', req.params.id).first();
    if (!lot) return res.status(404).send('Lot not found');
    
    // Check permission: Owner/Staff or the assigned Shop Owner
    if (req.session.user.role !== 'owner' && req.session.user.role !== 'staff' && req.session.user.id !== lot.shop_id) {
       return res.status(403).send('Unauthorized access');
    }

    const items = await db('lot_items').where('lot_id', lot.id);
    const shop = await db('users').where('id', lot.shop_id).first();
    res.render('view_lot', { 
        lot, 
        items, 
        shop, 
        user: req.session.user,
        activePage: 'lots', 
        pageTitle: 'Shipment Detail' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Create Lot Page
router.get('/create', isLoggedIn, hasRole(['owner', 'staff']), async (req, res) => {
  try {
    const shops = await db('users').where('role', 'shop_owner');
    res.render('create_lot', { 
        shops, 
        user: req.session.user,
        activePage: 'create_lot', 
        pageTitle: 'Assemble Parcel' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Save Lot
router.post('/create', isLoggedIn, hasRole(['owner', 'staff']), async (req, res) => {
  const { shop_id, item_names, quantities } = req.body;
  const lot_id = uuidv4();
  
  try {
    await db.transaction(async trx => {
      await trx('lots').insert({
        id: lot_id,
        shop_id,
        creator_id: req.session.user.id,
        status: 'PACKED'
      });

      const items = Array.isArray(item_names) ? item_names : [item_names];
      const quants = Array.isArray(quantities) ? quantities : [quantities];
      
      const lotItems = items.map((name, index) => ({
        lot_id,
        item_name: name,
        quantity: quants[index]
      }));
      
      if (lotItems.length > 0) {
        await trx('lot_items').insert(lotItems);
      }
    });

    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Transaction Failed');
  }
});

// Dispatch Lot
router.post('/dispatch/:id', isLoggedIn, hasRole(['owner', 'staff']), async (req, res) => {
  try {
    const lot = await db('lots').where('id', req.params.id).first();
    const shop = await db('users').where('id', lot.shop_id).first();
    
    await db('lots')
      .where('id', req.params.id)
      .update({
        status: 'DISPATCHED',
        dispatched_at: db.fn.now()
      });
      
    // Send email to shop
    notifyDispatch(shop.email, lot.id);
    
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Update Failed');
  }
});

// Receive Lot
router.post('/receive/:id', isLoggedIn, hasRole(['shop_owner']), async (req, res) => {
  const { id } = req.params;
  try {
    const lot = await db('lots').where({ id, shop_id: req.session.user.id }).first();
    if (!lot) return res.status(403).send('Unauthorized receipt');

    const owner = await db('users').where('role', 'owner').first();
    const shop = req.session.user;

    await db('lots')
      .where('id', id)
      .update({
        status: 'RECEIVED',
        received_at: db.fn.now()
      });
    
    // Notify owner
    notifyReceipt(owner.email, shop.name, lot.id);
    
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Update Failed');
  }
});

module.exports = router;
