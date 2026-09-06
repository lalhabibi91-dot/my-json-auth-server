const express = require('express');
const fs = require('fs');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const DB_FILE = './users.json';

// Helper to read database
const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return {};
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
};

// Helper to write database
const writeDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// Automatically seed default users on startup with custom durations
const seedDefaultUsers = async () => {
  const db = readDB();
  let modified = false;

  const defaultUsers = {
    'admin': { password: 'ilobyou', days: 300 },
    'rajj': { password: 'rajj', days: 28 },
    'john': { password: 'john7698', days: 28 }
  };

  for (const [username, config] of Object.entries(defaultUsers)) {
    if (!db[username]) {
      const hashedPassword = await bcrypt.hash(config.password, 10);
      db[username] = {
        password: hashedPassword,
        expiresAt: Date.now() + (config.days * 24 * 60 * 60 * 1000),
        activeSession: ''
      };
      modified = true;
    }
  }

  if (modified) {
    writeDB(db);
    console.log('Default users seeded with custom durations successfully.');
  }
};
seedDefaultUsers();

// Get all users (Admin view)
app.get('/users', (req, res) => {
  const db = readDB();
  res.json(db);
});

// Create / Register a new user
app.post('/register', async (req, res) => {
  const { username, password, duration, unit } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = readDB();
  let ms = 24 * 60 * 60 * 1000; // default 1 day
  if (duration && unit) {
    const dur = parseFloat(duration);
    if (unit === 'days') ms = dur * 24 * 60 * 60 * 1000;
    if (unit === 'hours') ms = dur * 60 * 60 * 1000;
    if (unit === 'minutes') ms = dur * 60 * 1000;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  db[username] = {
    password: hashedPassword,
    expiresAt: Date.now() + ms,
    activeSession: ''
  };
  writeDB(db);

  res.status(201).json({ message: 'User created successfully' });
});

// Delete user endpoint
app.delete('/users/:username', (req, res) => {
  const { username } = req.params;
  const db = readDB();
  if (db[username]) {
    delete db[username];
    writeDB(db);
    return res.json({ message: 'User deleted successfully' });
  }
  res.status(404).json({ error: 'User not found' });
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db[username];

  if (!user) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  let isValidPassword = false;
  if (user.password.startsWith('$2b$')) {
    isValidPassword = await bcrypt.compare(password, user.password);
  } else {
    isValidPassword = (password === user.password);
  }

  if (!isValidPassword) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  if (Date.now() > user.expiresAt) {
    return res.status(400).json({ error: 'This account has expired. Contact administrator.' });
  }

  res.json({ message: 'Login successful', expiresAt: user.expiresAt });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});