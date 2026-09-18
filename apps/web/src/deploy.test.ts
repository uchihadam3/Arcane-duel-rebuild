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
 *
 * A guarda mais importante é a do **método**. O site público ficou dias
 * servindo o primeiro deploy porque a origem do Pages é "GitHub Actions" e o
 * workflow havia passado a publicar empurrando a branch `gh-pages`. Os dois
 * mecanismos não conversam: o job ficava verde, a branch ficava em dia, e o
 * endereço público não mudava. Voltar a publicar por branch é regressão, e os
 * testes abaixo recusam.
 */
const workflow = readFileSync(
  fileURLToPath(new URL('../../../.github/workflows/pages.yml', import.meta.url)),
  'utf8',
);

const raiz = readFileSync(fileURLToPath(new URL('../../../package.json', import.meta.url)), 'utf8');
const scriptsDaRaiz = (JSON.parse(raiz) as { readonly scripts: Readonly<Record<string, string>> })
  .scripts;

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

  it('passa o número da execução como identificador de build', () => {
    // É o que aparece na tela do aplicativo instalado. Sem ele, duas builds
    // do mesmo `package.json` ficariam indistinguíveis.
    expect(workflow).toContain('GITHUB_RUN_NUMBER: ${{ github.run_number }}');
  });

  it('faz o fallback de SPA servindo o mesmo documento em 404.html', () => {
    // É assim que o Pages responde a /login, /builds, /match e /profile.
    expect(workflow).toContain('cp apps/web/dist/index.html apps/web/dist/404.html');
  });

  it('desliga o Jekyll, que senão reprocessaria o site', () => {
    expect(workflow).toContain('touch apps/web/dist/.nojekyll');
  });

  it('publica o conteúdo de apps/web/dist pelo mecanismo oficial do Pages', () => {
    expect(workflow).toContain('actions/upload-pages-artifact@v3');
    expect(workflow).toContain('path: apps/web/dist');
  });

  it('usa o deploy oficial do Pages, que é quem troca o site público', () => {
    expect(workflow).toContain('actions/configure-pages@v5');
    expect(workflow).toContain('actions/deploy-pages@v4');
  });

  it('declara as permissões que o deploy oficial exige', () => {
    // `id-token: write` é o OIDC que autentica o artefato perante o Pages.
    expect(workflow).toContain('pages: write');
    expect(workflow).toContain('id-token: write');
  });

  it('prende o deploy ao environment github-pages', () => {
    expect(workflow).toContain('name: github-pages');
    expect(workflow).toContain('url: ${{ steps.deployment.outputs.page_url }}');
  });

  it('NÃO volta a publicar empurrando a branch gh-pages', () => {
    /*
     * Esta é a regressão que tirou o site do ar por dias. Publicar na branch
     * não atualiza um Pages cuja origem é "GitHub Actions" — e o workflow
     * continua verde, o que torna a falha silenciosa.
     */
    expect(workflow).not.toContain('gh-pages');
    expect(workflow).not.toContain('git worktree');
    expect(workflow).not.toMatch(/git\s+push/);
    expect(workflow).not.toMatch(/git\s+commit/);
  });

  it('confere o artefato antes de publicá-lo', () => {
    expect(workflow).toContain('node scripts/verificar-artefato-publicado.mjs');
  });

  it('gera a sonda de versão em toda build publicada', () => {
    /*
     * A sonda é o que permite conferir, de dentro de um aparelho com o
     * aplicativo instalado, se o endereço público já mudou. Sem ela volta a
     * ser impossível distinguir "o Pages está atrasado" de "o service worker
     * deste aparelho está atrasado" — que foi exatamente a confusão que
     * segurou o diagnóstico por dias.
     */
    expect(raiz).toContain('scripts/gerar-sonda-de-versao.mjs');
    expect(scriptsDaRaiz.build).toContain('npm run sonda');
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
