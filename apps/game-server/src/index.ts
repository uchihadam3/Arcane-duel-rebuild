import { criarServidor } from './server.js';

const porta = Number(process.env.PORT ?? 8787);

criarServidor().listen(porta, () => {
  console.info(`game-server ouvindo em http://localhost:${String(porta)}`);
  console.info('Apenas diagnóstico. A partida autoritativa entra na etapa dez do roadmap.');
});
