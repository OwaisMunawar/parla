import { loadConfig } from './config';
import { startTutorServer } from './server';

const config = loadConfig();
const server = await startTutorServer({ port: config.port, model: config.model });
console.log(`Parla tutor on ${server.url} using ${config.modelLabel}`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void server.close().then(() => process.exit(0));
  });
}
