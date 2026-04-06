const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db('users').where({ email }).first();
    if (user && await bcrypt.compare(password, user.password_hash)) {
      req.session.user = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      };
      return res.redirect('/');
    }
    res.render('login', { error: 'Invalid email or password' });
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Internal Server Error' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
