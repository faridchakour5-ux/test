import Anthropic from '@anthropic-ai/sdk';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT ?? 8787);

// La clé vient UNIQUEMENT de la variable d'environnement ANTHROPIC_API_KEY du serveur.
// Délai et nouvelles tentatives gérés par le SDK pour absorber les pannes passagères.
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ timeout: 25_000, maxRetries: 2 }) : null;

const app = createApp({
  log: { info: (line) => console.log(line), error: (...a) => console.error(...a) },
  client,
  model: process.env.KALAM_MODEL ?? 'claude-sonnet-5-5',
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? '*',
  // TRUST_PROXY=1 derrière Render/Fly/Railway: sinon tous les utilisateurs partagent l'adresse du proxy.
  trustProxy: process.env.TRUST_PROXY === '1',
  // Plafond de requêtes par jour (UTC) pour borner la facture de l'API. 0 = illimité.
  dailyBudget: Number(process.env.DAILY_REQUEST_LIMIT ?? 20_000),
});

app.listen(PORT, () => console.log(`Kalam backend on :${PORT} (${client ? 'configured' : 'NOT configured: set ANTHROPIC_API_KEY'})`));

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => app.close(() => process.exit(0)));
}
