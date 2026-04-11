const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { isLoggedIn, hasRole } = require('../middleware/auth');

// List All Users with Pagination
router.get('/', isLoggedIn, hasRole(['owner']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const totalItems = (await db('users').count('id as count').first()).count;
    const totalPages = Math.ceil(totalItems / limit);

    const users = await db('users')
      .select('id', 'email', 'full_name', 'role', 'phone', 'address', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
      
    res.render('users', { 
        users, 
        user: req.session.user,
        error: req.query.error || null, 
        success: req.query.success || null, 
        currentPage: page, 
        totalPages, 
        activePage: 'users', 
        pageTitle: 'User Management' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Add New User
router.post('/add', isLoggedIn, hasRole(['owner']), async (req, res) => {
  const { full_name, email, password, role, phone, address } = req.body;
  
  try {
    const existing = await db('users').where({ email }).first();
    if (existing) {
      const users = await db('users').select('*').orderBy('created_at', 'desc');
      return res.render('users', { users, error: 'User already exists', success: null });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await db('users').insert({
      full_name,
      email,
      password_hash,
      role,
      phone,
      address
    });

    res.redirect('/users?success=User added successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Edit User
router.post('/edit', isLoggedIn, hasRole(['owner']), async (req, res) => {
  const { id, full_name, email, role, password } = req.body;
  
  try {
    const updateData = {
      full_name,
      email,
      role
    };

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }

    await db('users').where('id', id).update(updateData);

    res.redirect('/users?success=User updated successfully');
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
       return res.redirect('/users?error=Email already in use');
    }
    res.redirect('/users?error=Update Failed');
  }
});

// Delete User
router.post('/delete/:id', isLoggedIn, hasRole(['owner']), async (req, res) => {
  try {
    if (req.params.id == req.session.user.id) {
       return res.redirect('/users?error=Cannot delete yourself');
    }
    await db('users').where('id', req.params.id).del();
    res.redirect('/users?success=User deleted');
  } catch (err) {
    console.error(err);
    if (err.code === '23503') {
      return res.redirect('/users?error=Cannot delete user: They have active Shipments or Orders linked to their account.');
    }
    res.redirect('/users?error=Delete Failed');
  }
});

module.exports = router;
