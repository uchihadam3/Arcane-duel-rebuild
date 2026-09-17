# Desenvolvimento

## Fluxo

1. `npm install`
2. `npm run dev` para o cliente, `npm run dev:server` para o servidor
3. escreva o teste junto com o código
4. `npm run check` antes de commitar

## Regras de qualidade

- `any` é erro de lint. Use `unknown` e estreite o tipo.
- Funções exportadas declaram o tipo de retorno.
- Código de regra usa `Resultado<T, E>` em vez de exceção para caso previsto.
- Nada de regra dentro de componente visual.
- Nada de texto ou número de jogo desenhado dentro de um PNG.

## Testes

O Vitest roda a partir do código-fonte dos pacotes, então `npm test` funciona
sem build prévio. Arquivos que precisam de DOM declaram
`// @vitest-environment jsdom` na primeira linha.

## Publicação

O cliente é um site estático: `npm run build` gera `apps/web/dist`, que pode
ser servido por qualquer host com HTTPS. A branch `main` é a fonte da
publicação.

Duas exigências do host:

1. **SPA fallback, com exceção.** Requisições que não casarem com um arquivo
   devem cair em `index.html`, **menos** as que começarem com `/assets/`. Sem
   essa exceção, um asset que falta devolve HTML com status 200 em vez de 404.
2. **HTTPS.** O service worker e a instalação da PWA dependem disso.

Nenhum serviço externo foi configurado nesta entrega. Vercel, Cloudflare,
Netlify e Supabase exigem autorização explícita antes de serem conectados.

## Versionamento

- `RULES_VERSION` (`packages/rules-engine/src/version.ts`) sobe quando o
  comportamento do motor muda.
- `CARD_DATA_VERSION` (`packages/card-data/src/version.ts`) sobe quando o
  catálogo muda.

As duas são gravadas em toda partida, porque um replay antigo só faz sentido
com as versões que o produziram.
