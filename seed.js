const { getDb } = require('./db/database');
const bcrypt = require('bcryptjs');

async function seed() {
  const db = await getDb();

  // Check if already seeded
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count > 0) {
    console.log('✅ Database already seeded, skipping...');
    return;
  }

  console.log('🌱 Seeding database...');

  // Create sample users
  const password = bcrypt.hashSync('password123', 10);

  const users = [
    { name: 'Amit Sharma', email: 'amit@example.com', phone: '+91 98100-10101', avatar: '👨' },
    { name: 'Priya Patel', email: 'priya@example.com', phone: '+91 98200-20202', avatar: '👩' },
    { name: 'Rahul Verma', email: 'rahul@example.com', phone: '+91 99100-30303', avatar: '🧔' },
    { name: 'Sneha Gupta', email: 'sneha@example.com', phone: '+91 98300-40404', avatar: '👱' },
    { name: 'Vikram Singh', email: 'vikram@example.com', phone: '+91 97100-50505', avatar: '🧑‍💼' },
  ];

  const userIds = [];
  for (const u of users) {
    const rating = (4 + Math.random()).toFixed(1);
    const trips = Math.floor(Math.random() * 30) + 5;
    const result = db.prepare(
      'INSERT OR IGNORE INTO users (name, email, password, phone, avatar, rating, trips_count) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(u.name, u.email, password, u.phone, u.avatar, rating, trips);
    userIds.push(result.lastInsertRowid);
  }

  // Create sample rides
  const rides = [
    { origin: 'Mumbai', destination: 'Pune', date: '2026-03-05', time: '08:00', seats: 3, price: 500, car: 'Maruti Suzuki Dzire', color: 'Silver', desc: 'Comfortable ride via Mumbai-Pune Expressway. One stop for chai!' },
    { origin: 'Delhi', destination: 'Jaipur', date: '2026-03-06', time: '07:30', seats: 2, price: 700, car: 'Honda City', color: 'Blue', desc: 'Scenic route via NH48. Luggage space available.' },
    { origin: 'Bangalore', destination: 'Mysore', date: '2026-03-07', time: '09:00', seats: 4, price: 400, car: 'Hyundai Creta', color: 'Black', desc: 'Direct route via Mysore Expressway, pet-friendly! Music preferences flexible.' },
    { origin: 'Chennai', destination: 'Pondicherry', date: '2026-03-08', time: '10:00', seats: 3, price: 350, car: 'Toyota Innova', color: 'White', desc: 'Quick trip to Pondy. AC works great!' },
    { origin: 'Hyderabad', destination: 'Vijayawada', date: '2026-03-09', time: '06:30', seats: 2, price: 450, car: 'Tata Nexon EV', color: 'Red', desc: 'Electric vehicle, zero emissions ride!' },
    { origin: 'Kolkata', destination: 'Digha', date: '2026-03-10', time: '05:00', seats: 3, price: 600, car: 'Mahindra XUV700', color: 'Gray', desc: 'Weekend trip to the beach! Good vibes only 🏖️' },
    { origin: 'Pune', destination: 'Mumbai', date: '2026-03-10', time: '14:00', seats: 2, price: 500, car: 'Hyundai Verna', color: 'Green', desc: 'Afternoon ride back to Mumbai. Wi-Fi hotspot available.' },
    { origin: 'Ahmedabad', destination: 'Surat', date: '2026-03-11', time: '11:00', seats: 4, price: 350, car: 'Maruti Suzuki Ertiga', color: 'Silver', desc: 'Spacious ride with plenty of legroom.' },
    { origin: 'Chandigarh', destination: 'Shimla', date: '2026-03-12', time: '08:00', seats: 3, price: 550, car: 'Mahindra Thar', color: 'Blue', desc: 'Mountain views! Great for travellers with gear space.' },
    { origin: 'Lucknow', destination: 'Agra', date: '2026-03-08', time: '16:00', seats: 2, price: 400, car: 'Kia Seltos', color: 'White', desc: 'Quick evening commute. Clean car, good music.' },
  ];

  for (let i = 0; i < rides.length; i++) {
    const r = rides[i];
    const driverId = userIds[i % userIds.length];
    db.prepare(
      'INSERT INTO rides (driver_id, origin, destination, departure_date, departure_time, seats_available, price, car_model, car_color, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(driverId, r.origin, r.destination, r.date, r.time, r.seats, r.price, r.car, r.color, r.desc);
  }

  console.log(`✅ Seeded ${users.length} users and ${rides.length} rides`);
  console.log('📧 Login with any email above (e.g. amit@example.com), password: password123');
}

module.exports = seed;
