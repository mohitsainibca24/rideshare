const initSqlJs = require('sql.js');

let db = null;

// Wrapper to match better-sqlite3 API style
class Database {
  constructor(sqlDb) {
    this.sqlDb = sqlDb;
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self.sqlDb.run(sql, params);
        const lastId = self.sqlDb.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0] || 0;
        const changes = self.sqlDb.getRowsModified();
        return { lastInsertRowid: lastId, changes };
      },
      get(...params) {
        const stmt = self.sqlDb.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          stmt.free();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const result = self.sqlDb.exec(sql, params);
        if (!result.length) return [];
        const cols = result[0].columns;
        return result[0].values.map(vals => {
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          return row;
        });
      }
    };
  }

  exec(sql) {
    this.sqlDb.run(sql);
  }
}

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  const sqlDb = new SQL.Database();

  db = new Database(sqlDb);

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      avatar TEXT DEFAULT '🧑',
      rating REAL DEFAULT 5.0,
      trips_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      departure_date TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      seats_available INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL,
      car_model TEXT,
      car_color TEXT,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (driver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id INTEGER NOT NULL,
      passenger_id INTEGER NOT NULL,
      seats_booked INTEGER NOT NULL DEFAULT 1,
      status TEXT DEFAULT 'confirmed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ride_id) REFERENCES rides(id),
      FOREIGN KEY (passenger_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reviewer_id INTEGER NOT NULL,
      reviewee_id INTEGER NOT NULL,
      ride_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (reviewee_id) REFERENCES users(id),
      FOREIGN KEY (ride_id) REFERENCES rides(id)
    );
  `);

  return db;
}

module.exports = { getDb };
