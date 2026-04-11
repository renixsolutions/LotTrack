const express = require('express');
const router = express.Router();
const { isLoggedIn, hasRole } = require('../middleware/auth');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { notifyDispatch, notifyReceipt } = require('../services/email');
const upload = require('../middleware/upload');

// All Lots List
router.get('/', isLoggedIn, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const totalItemsQuery = db('lots');
    const lotsQuery = db('lots')
      .join('users', 'lots.shop_id', 'users.id')
      .select('lots.*', 'users.full_name as shop_name');

    if (req.session.user.role === 'shop_owner') {
      totalItemsQuery.where('lots.shop_id', req.session.user.id);
      lotsQuery.where('lots.shop_id', req.session.user.id);
    }

    const totalItemsRow = await totalItemsQuery.count('lots.id as count').first();
    const totalItems = totalItemsRow.count;
    const totalPages = Math.ceil(totalItems / limit);

    const lots = await lotsQuery
      .orderBy('lots.created_at', 'desc')
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
    const BASE_URL = process.env.BASE_URL || `http://${req.headers.host}`;
    const qrCode = await QRCode.toDataURL(`${BASE_URL}/lot/${lot.id}`);

    res.render('view_lot', { 
        lot, 
        items, 
        shop, 
        qrCode,
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
router.post('/create', isLoggedIn, hasRole(['owner', 'staff']), (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err) {
      console.error('Upload Error:', err);
      return res.redirect('/lots/create?error=' + encodeURIComponent(err.message));
    }
    next();
  });
}, async (req, res) => {
  const { shop_id, item_names, quantities, logistics_lead } = req.body || {};
  const lot_id = uuidv4();
  
  if (!shop_id || shop_id === 'undefined') {
    return res.redirect('/lots/create?error=Missing required fields');
  }

  // Extract filenames from uploaded files as an array
  const images = req.files && req.files.length > 0 ? req.files.map(f => f.filename) : null;

  try {
    await db.transaction(async trx => {
      await trx('lots').insert({
        id: lot_id,
        shop_id,
        creator_id: req.session.user.id,
        logistics_lead,
        status: 'PACKED',
        images: images ? JSON.stringify(images) : null // Keep stringify for safety across different DB types
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
    
    res.redirect(`/lots/view/${req.params.id}?success=Parcel%20Successfully%20Dispatched`);
  } catch (err) {
    console.error(err);
    res.redirect(`/lots/view/${req.params.id}?error=Dispatch%20Failed`);
  }
});

// Confirm Receipt (Shop Owner via Scanner)
router.post('/receive/:id', isLoggedIn, hasRole(['shop_owner']), async (req, res) => {
  const { id } = req.params;
  try {
    const lot = await db('lots').where({ id }).first();
    
    if (!lot) return res.status(404).send('Parcel not found');
    
    // Check if assigned to this shop
    if (lot.shop_id !== req.session.user.id) {
      return res.status(403).send('Unauthorized: This parcel is not assigned to your shop.');
    }

    // Check status
    if (lot.status !== 'DISPATCHED') {
      return res.status(400).send(`Invalid Action: Parcel is already ${lot.status.toLowerCase()}`);
    }

    const owner = await db('users').where('role', 'owner').first();
    const shop = req.session.user;

    await db('lots')
      .where('id', id)
      .update({
        status: 'RECEIVED',
        received_at: db.fn.now()
      });
    
    // Notify owner
    notifyReceipt(owner.email, shop.full_name, lot.id);
    
    // If request is from fetch (scanner), return JSON; otherwise redirect
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
       return res.json({ success: true, redirectUrl: `/lots/view/${id}` });
    }
    
    res.redirect(`/lots/view/${id}`);
  } catch (err) {
    console.error(err);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(500).json({ error: 'Update Failed' });
    }
    res.status(500).send('Update Failed');
  }
});

module.exports = router;
