const express = require('express');
const { getDb } = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Book a ride
router.post('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { ride_id, seats_booked } = req.body;
    const seats = seats_booked || 1;

    if (!ride_id) {
      return res.status(400).json({ error: 'Ride ID is required.' });
    }

    const ride = db.prepare('SELECT * FROM rides WHERE id = ? AND status = ?').get(ride_id, 'active');
    if (!ride) return res.status(404).json({ error: 'Ride not found or no longer active.' });

    if (ride.driver_id === req.user.id) {
      return res.status(400).json({ error: "You can't book your own ride." });
    }

    const existingBooking = db.prepare(
      "SELECT * FROM bookings WHERE ride_id = ? AND passenger_id = ? AND status = 'confirmed'"
    ).get(ride_id, req.user.id);

    if (existingBooking) {
      return res.status(400).json({ error: 'You already have a booking for this ride.' });
    }

    if (ride.seats_available < seats) {
      return res.status(400).json({ error: 'Not enough seats available.' });
    }

    const result = db.prepare(
      'INSERT INTO bookings (ride_id, passenger_id, seats_booked) VALUES (?, ?, ?)'
    ).run(ride_id, req.user.id, seats);

    db.prepare(
      'UPDATE rides SET seats_available = seats_available - ? WHERE id = ?'
    ).run(seats, ride_id);

    // Update trip counts
    db.prepare('UPDATE users SET trips_count = trips_count + 1 WHERE id = ?').run(req.user.id);
    db.prepare('UPDATE users SET trips_count = trips_count + 1 WHERE id = ?').run(ride.driver_id);

    res.status(201).json({
      message: 'Ride booked successfully!',
      booking: { id: result.lastInsertRowid, ride_id, seats_booked: seats, status: 'confirmed' }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get my bookings
router.get('/my', auth, async (req, res) => {
  try {
    const db = await getDb();
    const bookings = db.prepare(`
      SELECT b.*, r.origin, r.destination, r.departure_date, r.departure_time, r.price,
             r.car_model, r.car_color, u.name as driver_name, u.avatar as driver_avatar, u.rating as driver_rating
      FROM bookings b
      JOIN rides r ON b.ride_id = r.id
      JOIN users u ON r.driver_id = u.id
      WHERE b.passenger_id = ?
      ORDER BY r.departure_date DESC
    `).all(req.user.id);

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Cancel a booking
router.delete('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const booking = db.prepare(
      'SELECT * FROM bookings WHERE id = ? AND passenger_id = ?'
    ).get(req.params.id, req.user.id);

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);
    db.prepare('UPDATE rides SET seats_available = seats_available + ? WHERE id = ?')
      .run(booking.seats_booked, booking.ride_id);

    res.json({ message: 'Booking cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
