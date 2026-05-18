import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({status: 'ok'}));

app.post('/webhooks/openwa', async (req, res) => {
  console.log('Received:', req.body);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`SupportWA on ${PORT}`));