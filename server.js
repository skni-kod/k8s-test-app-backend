const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Dodajemy klienta PostgreSQL

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

// Konfiguracja puli połączeń z wykorzystaniem zmiennych środowiskowych z K8s
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || process.env.PGDATABASE || 'myappdb',
});

// Automatyczna inicjalizacja tabeli przy starcie aplikacji
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      );
    `);
    console.log('Baza danych zsynchronizowana: tabela "users" jest gotowa.');
  } catch (err) {
    console.error('Błąd inicjalizacji bazy danych:', err.message);
  }
};
initDb();

// Healthcheck (teraz sprawdza też faktyczne połączenie z bazą!)
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Pobieranie użytkowników z bazy
app.get('/api/users', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM users ORDER BY id ASC');
    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

// Dodawanie nowego użytkownika do bazy
app.post('/api/users', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

  if (!name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

// Usuwanie użytkownika z bazy
app.delete('/api/users/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

app.get('/', (_req, res) => {
  res.json({
    service: 'k8s-test-app-backend',
    endpoints: ['/health', '/api/users'],
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
