const db = require('./db/database');
const bcrypt = require('bcryptjs');

// Check if already seeded
const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (count === 0) {

console.log('🌱 Seeding database...');

// Create sample users
const password = bcrypt.hashSync('password123', 10);

const users = [
  { name: 'Alex Johnson', email: 'alex@example.com', phone: '+1 555-0101', avatar: '👨' },
  { name: 'Sarah Williams', email: 'sarah@example.com', phone: '+1 555-0102', avatar: '👩' },
  { name: 'Michael Chen', email: 'michael@example.com', phone: '+1 555-0103', avatar: '🧔' },
  { name: 'Emma Davis', email: 'emma@example.com', phone: '+1 555-0104', avatar: '👱' },
  { name: 'James Wilson', email: 'james@example.com', phone: '+1 555-0105', avatar: '🧑‍💼' },
];

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (name, email, password, phone, avatar, rating, trips_count) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

const userIds = [];
for (const u of users) {
  const rating = (4 + Math.random()).toFixed(1);
  const trips = Math.floor(Math.random() * 30) + 5;
  const result = insertUser.run(u.name, u.email, password, u.phone, u.avatar, rating, trips);
  userIds.push(result.lastInsertRowid);
}

// Create sample rides
const rides = [
  { origin: 'New York', destination: 'Boston', date: '2026-03-05', time: '08:00', seats: 3, price: 35, car: 'Toyota Camry', color: 'Silver', desc: 'Comfortable ride via I-95. One stop for coffee!' },
  { origin: 'Los Angeles', destination: 'San Francisco', date: '2026-03-06', time: '07:30', seats: 2, price: 45, car: 'Honda Civic', color: 'Blue', desc: 'Scenic route along the coast. Luggage space available.' },
  { origin: 'Chicago', destination: 'Detroit', date: '2026-03-07', time: '09:00', seats: 4, price: 28, car: 'Ford Explorer', color: 'Black', desc: 'Direct route, pet-friendly! Music preferences flexible.' },
  { origin: 'Miami', destination: 'Orlando', date: '2026-03-08', time: '10:00', seats: 3, price: 22, car: 'Nissan Altima', color: 'White', desc: 'Quick trip to Orlando. AC works great!' },
  { origin: 'Seattle', destination: 'Portland', date: '2026-03-09', time: '06:30', seats: 2, price: 20, car: 'Tesla Model 3', color: 'Red', desc: 'Electric vehicle, zero emissions ride!' },
  { origin: 'San Francisco', destination: 'Las Vegas', date: '2026-03-10', time: '05:00', seats: 3, price: 55, car: 'BMW 3 Series', color: 'Gray', desc: 'Weekend trip to Vegas! Good vibes only 🎰' },
  { origin: 'Boston', destination: 'New York', date: '2026-03-10', time: '14:00', seats: 2, price: 30, car: 'Hyundai Sonata', color: 'Green', desc: 'Afternoon ride back to NYC. Wi-Fi hotspot available.' },
  { origin: 'Austin', destination: 'Houston', date: '2026-03-11', time: '11:00', seats: 4, price: 18, car: 'Chevrolet Malibu', color: 'Silver', desc: 'Spacious ride with plenty of legroom.' },
  { origin: 'Denver', destination: 'Salt Lake City', date: '2026-03-12', time: '08:00', seats: 3, price: 40, car: 'Subaru Outback', color: 'Blue', desc: 'Mountain views! Great for skiers with gear space.' },
  { origin: 'Washington DC', destination: 'Philadelphia', date: '2026-03-08', time: '16:00', seats: 2, price: 25, car: 'Volkswagen Jetta', color: 'White', desc: 'Quick evening commute. Clean car, good music.' },
];

const insertRide = db.prepare(
  'INSERT INTO rides (driver_id, origin, destination, departure_date, departure_time, seats_available, price, car_model, car_color, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

for (let i = 0; i < rides.length; i++) {
  const r = rides[i];
  const driverId = userIds[i % userIds.length];
  insertRide.run(driverId, r.origin, r.destination, r.date, r.time, r.seats, r.price, r.car, r.color, r.desc);
}

console.log(`✅ Seeded ${users.length} users and ${rides.length} rides`);
console.log('📧 Login with any email above, password: password123');

} else {
  console.log('✅ Database already seeded, skipping...');
}
