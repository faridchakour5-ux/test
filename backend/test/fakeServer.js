// Serveur réel (vrai code HTTP, vraie validation, vrai flux SSE) avec une fausse IA, pour les tests de contrat
// côté application. Affiche « READY <port> » quand il écoute. Usage: node test/fakeServer.js
import { createApp } from '../src/app.js';

const delta = (text) => ({ type: 'content_block_delta', delta: { type: 'text_delta', text } });

// Fausse IA: répond « Echo: <dernier message> » mot par mot, et révèle la consigne système reçue.
// Mots déclencheurs dans le message: FAILNOW (panne immédiate), FAILMID (panne après 2 morceaux).
const client = {
  messages: {
    create: async (params) => {
      const last = params.messages[params.messages.length - 1].content;
      if (last.includes('FAILNOW')) throw Object.assign(new Error('boom'), { status: 500 });
      const text = last.includes('SYSTEM?') ? `SYSTEM: ${params.system}` : `Echo: ${last}`;
      if (!params.stream) return { content: [{ type: 'text', text }] };
      const words = text.split(' ');
      return (async function* () {
        for (let i = 0; i < words.length; i++) {
          if (last.includes('FAILMID') && i === 2) throw new Error('mid-stream failure');
          yield delta((i ? ' ' : '') + words[i]);
          await new Promise((r) => setTimeout(r, 2));
        }
      })();
    },
  },
};

const server = createApp({ client, log: { error() {} }, rate: { max: 1000, windowMs: 60_000 } });
server.listen(0, '127.0.0.1', () => console.log(`READY ${server.address().port}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
