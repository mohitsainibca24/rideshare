const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const auth = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// Register
router.post('/register', (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const avatars = ['🧑', '👩', '👨', '🧔', '👱', '🧑‍💼'];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];

    const result = db.prepare(
      'INSERT INTO users (name, email, password, phone, avatar) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email, hashedPassword, phone || null, avatar);

    const token = jwt.sign(
      { id: result.lastInsertRowid, name, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: { id: result.lastInsertRowid, name, email, avatar, phone }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        phone: user.phone,
        rating: user.rating,
        trips_count: user.trips_count
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get current user profile
router.get('/me', auth, (req, res) => {
  try {
    const user = db.prepare(
      'SELECT id, name, email, phone, avatar, rating, trips_count, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Update profile
router.put('/me', auth, (req, res) => {
  try {
    const { name, phone } = req.body;
    db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?')
      .run(name || null, phone || null, req.user.id);

    const user = db.prepare(
      'SELECT id, name, email, phone, avatar, rating, trips_count FROM users WHERE id = ?'
    ).get(req.user.id);

    res.json({ message: 'Profile updated.', user });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
