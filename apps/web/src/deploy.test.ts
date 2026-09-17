import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { criarManifesto } from './pwa/manifest.js';

/*
 * Guardas da publicação.
 *
 * O destino oficial é o GitHub Pages, e o Pages não tem reescrita de rota nem
 * painel de configuração: tudo o que garante o comportamento do site está no
 * workflow. Um erro aqui só apareceria depois do deploy, com o jogo no ar —
 * por isso o workflow é verificado como código.
 */
const workflow = readFileSync(
  fileURLToPath(new URL('../../../.github/workflows/pages.yml', import.meta.url)),
  'utf8',
);

describe('workflow de publicação', () => {
  it('publica a partir da main', () => {
    expect(workflow).toContain('branches: [main]');
  });

  it('constrói a partir da raiz do monorepo', () => {
    expect(workflow).toContain('run: npm ci');
    expect(workflow).toContain('run: npm run build');
  });

  it('informa o prefixo de publicação a partir do nome do repositório', () => {
    expect(workflow).toContain('BASE_PATH: /${{ github.event.repository.name }}/');
  });

  it('faz o fallback de SPA servindo o mesmo documento em 404.html', () => {
    // É assim que o Pages responde a /login, /builds, /match e /profile.
    expect(workflow).toContain('cp apps/web/dist/index.html apps/web/dist/404.html');
  });

  it('desliga o Jekyll, que senão reprocessaria o site', () => {
    expect(workflow).toContain('touch apps/web/dist/.nojekyll');
  });

  it('publica o conteúdo de apps/web/dist, sem cópia separada do cliente', () => {
    expect(workflow).toContain('cp -r apps/web/dist/. ../site/');
  });

  it('nunca reescreve o histórico do site publicado', () => {
    expect(workflow).not.toMatch(/push[^\n]*--force/);
    expect(workflow).not.toMatch(/push[^\n]*-f\b/);
  });

  it('não depende de nenhum serviço externo de publicação', () => {
    expect(workflow.toLowerCase()).not.toContain('vercel');
    expect(workflow.toLowerCase()).not.toContain('netlify');
    expect(workflow.toLowerCase()).not.toContain('cloudflare');
  });
});

describe('prefixo de publicação do cliente', () => {
  it('produz um manifesto coerente com o caminho servido pelo Pages', () => {
    const manifesto = criarManifesto('/Arcane-duel-rebuild/');
    expect(manifesto.start_url).toBe('/Arcane-duel-rebuild/');
    expect(manifesto.scope).toBe('/Arcane-duel-rebuild/');
    expect(manifesto.display).toBe('standalone');
    expect(manifesto.orientation).toBe('landscape');
  });

  it('mantém os ícones relativos, para o recorte do sistema achá-los sob o prefixo', () => {
    for (const icone of criarManifesto('/Arcane-duel-rebuild/').icons) {
      expect(icone.src.startsWith('/')).toBe(false);
    }
  });
});
