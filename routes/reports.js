const express = require('express');
const router = express.Router();
const { isLoggedIn, hasRole } = require('../middleware/auth');
const db = require('../db');

// Reports Dashboard
router.get('/', isLoggedIn, hasRole(['owner']), async (req, res) => {
  try {
    const shops = await db('users').where('role', 'shop_owner').select('id', 'full_name');
    
    // Default filters
    const { shop_id, start_date, end_date, format } = req.query;
    
    let query = db('lots')
      .join('users', 'lots.shop_id', 'users.id')
      .select('lots.*', 'users.full_name as shop_name')
      .orderBy('lots.created_at', 'desc');

    if (shop_id && shop_id !== '' && shop_id !== 'undefined') query.where('lots.shop_id', shop_id);
    if (start_date && start_date !== '' && start_date !== 'undefined') query.where('lots.created_at', '>=', start_date);
    if (end_date && end_date !== '' && end_date !== 'undefined') query.where('lots.created_at', '<=', end_date + ' 23:59:59');

    const reports = await query;

    // Handle CSV Download
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=shipment_report.csv');
      
      let csv = 'Tracking ID,Destination,Status,Logistics Lead,Created At\n';
      reports.forEach(r => {
        csv += `${r.id},${r.shop_name},${r.status},${r.logistics_lead || 'N/A'},${new Date(r.created_at).toLocaleString()}\n`;
      });
      return res.send(csv);
    }

    const csvUrl = '/reports?' + new URLSearchParams({ 
      shop_id: shop_id || '', 
      start_date: start_date || '', 
      end_date: end_date || '', 
      format: 'csv' 
    }).toString();

    res.render('reports', {
      reports,
      shops,
      filters: { shop_id, start_date, end_date },
      csvUrl,
      user: req.session.user,
      activePage: 'reports',
      pageTitle: 'Reporting & Analytics'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
