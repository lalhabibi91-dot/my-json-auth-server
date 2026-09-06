const express = require('express');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

const DB_FILE = './users.json';

// Helper to read database
const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return { users: [] };
  const data = fs.readFileSync(DB_FILE);
  return JSON.parse(data);
};

// Helper to write to database
const writeDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// Register endpoint
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = readDB();
  const existingUser = db.users.find(u => u.username === username);
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  db.users.push({ username, password: hashedPassword });
  writeDB(db);

  res.status(201).json({ message: 'User registered successfully' });
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  const db = readDB();
  const user = db.users.find(u => u.username === username);
  if (!user) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  res.json({ message: 'Login successful' });
});

// Use Render's dynamic port or default to 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});