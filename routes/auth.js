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
      return res.redirect('/?success=Welcome%20Back!%20Access%20Granted.');
    }
    res.redirect('/auth/login?error=Invalid%20Email%20or%20Password');
  } catch (err) {
    console.error(err);
    res.redirect('/auth/login?error=Internal%20Server%20Error');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login?success=Logged%20out%20successfully');
});

module.exports = router;
