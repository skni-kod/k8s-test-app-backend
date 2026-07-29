const express = require('express');
const cors = require('cors');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

let nextId = 4;
let users = [
  { id: 1, name: 'Alicja Nowak' },
  { id: 2, name: 'Jan Kowalski' },
  { id: 3, name: 'Marta Wiśniewska' },
];

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/users', (_req, res) => {
  res.json({ users });
});

app.post('/api/users', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

  if (!name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  const user = { id: nextId, name };
  nextId += 1;
  users = [...users, user];

  return res.status(201).json(user);
});

app.delete('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }

  const existingUser = users.find((user) => user.id === id);
  if (!existingUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  users = users.filter((user) => user.id !== id);
  return res.status(204).send();
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
