/**
 * Placeholder técnico para um asset ainda não entregue.
 *
 * Ele é deliberadamente feio e legível: hachura diagonal, moldura tracejada e
 * o id do asset escrito por cima. Não é arte, não define identidade visual e
 * desaparece sozinho no instante em que o PNG aprovado é colocado em /assets.
 */
export const gerarPlaceholder = (id: string, legenda = 'ASSET AUSENTE'): string => {
  const texto = escaparXml(id);
  const rotulo = escaparXml(legenda);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700" role="img" aria-label="${rotulo}: ${texto}">
<defs><pattern id="h" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
<rect width="16" height="16" fill="#191d26"/><rect width="8" height="16" fill="#232936"/>
</pattern></defs>
<rect width="500" height="700" fill="url(#h)"/>
<rect x="8" y="8" width="484" height="684" fill="none" stroke="#5b6478" stroke-width="4"/>
<text x="250" y="330" fill="#9aa4b8" font-family="monospace" font-size="26" text-anchor="middle">${rotulo}</text>
<text x="250" y="372" fill="#e2e8f0" font-family="monospace" font-size="22" text-anchor="middle">${texto}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const escaparXml = (valor: string): string =>
  valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
