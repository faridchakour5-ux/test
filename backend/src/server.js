import Anthropic from '@anthropic-ai/sdk';
import { createApp } from './app.js';
import { parseDailyLimit, parseTrustProxy } from './config.js';

const PORT = Number(process.env.PORT ?? 8787);

// La clé vient UNIQUEMENT de la variable d'environnement ANTHROPIC_API_KEY du serveur.
// Délai et nouvelles tentatives gérés par le SDK pour absorber les pannes passagères.
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ timeout: 25_000, maxRetries: 2 }) : null;

const app = createApp({
  log: { info: (line) => console.log(line), error: (...a) => console.error(...a) },
  client,
  model: process.env.KALAM_MODEL ?? 'claude-sonnet-5-5',
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? '*',
  // TRUST_PROXY = nombre de proxys de confiance devant le serveur (Render/Fly/Railway: voir PUBLISHING.md). Sans cela, tous les
  // utilisateurs partageraient l'adresse du proxy; avec une valeur trop forte, l'adresse pourrait être falsifiée.
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  // Plafond de requêtes par jour (UTC) pour borner la facture de l'API. 0 = illimité. Valeur invalide: le serveur ne démarre pas.
  dailyBudget: parseDailyLimit(process.env.DAILY_REQUEST_LIMIT),
});

app.listen(PORT, () => console.log(`Kalam backend on :${PORT} (${client ? 'configured' : 'NOT configured: set ANTHROPIC_API_KEY'})`));

// Arrêt propre: on laisse finir les réponses en cours, on ferme les connexions inactives, et on force la sortie au bout de 10 s
// (sinon une connexion qui reste ouverte empêcherait l'arrêt jusqu'à la coupure brutale de l'hébergeur).
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    setTimeout(() => process.exit(0), 10_000).unref();
    app.close(() => process.exit(0));
    app.closeIdleConnections?.();
  });
}
