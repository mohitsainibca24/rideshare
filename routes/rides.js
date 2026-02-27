const express = require('express');
const { getDb } = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a ride
router.post('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { origin, destination, departure_date, departure_time, seats_available, price, car_model, car_color, description } = req.body;

    if (!origin || !destination || !departure_date || !departure_time || !seats_available || !price) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    const result = db.prepare(`
      INSERT INTO rides (driver_id, origin, destination, departure_date, departure_time, seats_available, price, car_model, car_color, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, origin, destination, departure_date, departure_time, seats_available, price, car_model || null, car_color || null, description || null);

    const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Ride created successfully!', ride });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Search rides
router.get('/search', async (req, res) => {
  try {
    const db = await getDb();
    const { origin, destination, date } = req.query;

    let query = `
      SELECT r.*, u.name as driver_name, u.avatar as driver_avatar, u.rating as driver_rating, u.trips_count as driver_trips
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      WHERE r.status = 'active' AND r.seats_available > 0
    `;
    const params = [];

    if (origin) {
      query += ' AND LOWER(r.origin) LIKE ?';
      params.push(`%${origin.toLowerCase()}%`);
    }
    if (destination) {
      query += ' AND LOWER(r.destination) LIKE ?';
      params.push(`%${destination.toLowerCase()}%`);
    }
    if (date) {
      query += ' AND r.departure_date = ?';
      params.push(date);
    }

    query += ' ORDER BY r.departure_date ASC, r.departure_time ASC';

    const rides = db.prepare(query).all(...params);
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get all active rides
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rides = db.prepare(`
      SELECT r.*, u.name as driver_name, u.avatar as driver_avatar, u.rating as driver_rating, u.trips_count as driver_trips
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      WHERE r.status = 'active' AND r.seats_available > 0
      ORDER BY r.created_at DESC
      LIMIT 50
    `).all();

    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get single ride details
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const ride = db.prepare(`
      SELECT r.*, u.name as driver_name, u.avatar as driver_avatar, u.rating as driver_rating,
             u.phone as driver_phone, u.trips_count as driver_trips
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!ride) return res.status(404).json({ error: 'Ride not found.' });

    const bookings = db.prepare(`
      SELECT b.*, u.name as passenger_name, u.avatar as passenger_avatar
      FROM bookings b
      JOIN users u ON b.passenger_id = u.id
      WHERE b.ride_id = ? AND b.status = 'confirmed'
    `).all(req.params.id);

    res.json({ ...ride, bookings });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get my offered rides
router.get('/my/offered', auth, async (req, res) => {
  try {
    const db = await getDb();
    const rides = db.prepare(`
      SELECT r.*, 
        (SELECT COUNT(*) FROM bookings b WHERE b.ride_id = r.id AND b.status = 'confirmed') as booked_seats
      FROM rides r
      WHERE r.driver_id = ?
      ORDER BY r.departure_date DESC
    `).all(req.user.id);

    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Delete a ride
router.delete('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const ride = db.prepare('SELECT * FROM rides WHERE id = ? AND driver_id = ?').get(req.params.id, req.user.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found or unauthorized.' });

    db.prepare("UPDATE rides SET status = 'cancelled' WHERE id = ?").run(req.params.id);
    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE ride_id = ?").run(req.params.id);

    res.json({ message: 'Ride cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
