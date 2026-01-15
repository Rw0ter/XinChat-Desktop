import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter, { ensureStorage } from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3001;

const app = express();

app.use(express.json());
app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use('/resource', express.static(path.join(__dirname, 'resource')));
app.use('/admin', express.static(path.join(__dirname, 'index.html')));

app.use('/api', authRouter);

app.listen(PORT, async () => {
  await ensureStorage();
  console.log(`Backend listening on http://localhost:${PORT}`);
});
