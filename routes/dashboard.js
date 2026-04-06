const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const db = require('../db');

router.get('/', isLoggedIn, async (req, res) => {
  const { user } = req.session;
  
  try {
    let stats = {};
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    if (user.role === 'owner') {
      stats.totalLots = (await db('lots').count('id as count').first()).count;
      stats.pendingOrders = (await db('orders').where('status', 'PENDING').count('id as count').first()).count;
      stats.totalShops = (await db('users').where('role', 'shop_owner').count('id as count').first()).count;
      stats.staffCount = (await db('users').where('role', 'staff').count('id as count').first()).count;
      stats.completedLots = (await db('lots').where('status', 'RECEIVED').count('id as count').first()).count;
      
      const totalItems = (await db('lots').count('id as count').first()).count;
      const totalPages = Math.ceil(totalItems / limit);
      
      const recentLots = await db('lots')
        .join('users', 'lots.shop_id', 'users.id')
        .select('lots.*', 'users.full_name as shop_name')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);
        
      return res.render('dashboards/owner', { 
        stats, 
        user,
        recentLots, 
        currentPage: page, 
        totalPages, 
        activePage: 'dashboard', 
        pageTitle: 'Admin Overview' 
      });
    }
    
    if (user.role === 'staff') {
      const totalItems = (await db('lots').where('creator_id', user.id).count('id as count').first()).count;
      const totalPages = Math.ceil(totalItems / limit);

      const myLots = await db('lots')
        .where('creator_id', user.id)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return res.render('dashboards/staff', { 
        myLots, 
        user,
        currentPage: page, 
        totalPages, 
        activePage: 'dashboard', 
        pageTitle: 'Staff Portal' 
      });
    }
    
    if (user.role === 'shop_owner') {
      const incomingLotsTotal = (await db('lots').where({ shop_id: user.id, status: 'DISPATCHED' }).count('id as count').first()).count;
      const totalPages = Math.ceil(incomingLotsTotal / limit);

      const incomingLots = await db('lots')
        .where({ shop_id: user.id, status: 'DISPATCHED' })
        .orderBy('dispatched_at', 'desc')
        .limit(limit)
        .offset(offset);
      
      const recentReceived = await db('lots')
        .where({ shop_id: user.id, status: 'RECEIVED' })
        .orderBy('received_at', 'desc')
        .limit(5);

      return res.render('dashboards/shop', { 
        incomingLots, 
        recentReceived, 
        user,
        currentPage: page, 
        totalPages, 
        activePage: 'dashboard', 
        pageTitle: 'Shop Dashboard' 
      });
    }
    
    res.send('Dashboard for role: ' + user.role);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
