// Checagens do site, sem dependências.
//   node tools/check.mjs                 todos os grupos estáticos
//   node tools/check.mjs --only base     um grupo
//   node tools/check.mjs --live <url>    também confere o site publicado
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ler = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : '');
const existe = (p) => existsSync(join(root, p));
const tem = (p, ...trechos) => trechos.every((t) => ler(p).includes(t));
const temI = (p, ...trechos) => trechos.every((t) => ler(p).toLowerCase().includes(t.toLowerCase()));

// Arquivos publicados (fora de tools/, README e pastas ocultas ou geradas).
function publicados(dir = root) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    const rel = relative(root, caminho).replaceAll('\\', '/');
    if (/^(\.|_site|tools|README\.md|node_modules)/.test(rel)) return [];
    if (statSync(caminho).isDirectory()) return publicados(caminho);
    return /\.(html|md|css)$/.test(nome) ? [rel] : [];
  });
}

// Regra global: nada de JavaScript nem recurso carregado de outro domínio.
export function violacoesExternas(texto) {
  const erros = [];
  if (/<script\b/i.test(texto)) erros.push('<script>');
  if (/@import\b/i.test(texto)) erros.push('@import');
  if (/url\(\s*['"]?(https?:)?\/\//i.test(texto)) erros.push('url() externa');
  const tag = /<(link|script|img|iframe|source|video|audio)\b[^>]*\b(src|href|srcset)\s*=\s*["']?(https?:)?\/\//i;
  if (tag.test(texto)) erros.push('tag com recurso externo');
  return erros;
}

const fontes = ['Regular', 'SemiBold', 'Bold', 'ExtraBold'].map((p) => `assets/fonts/Figtree-${p}.ttf`);

const grupos = {
  base: [
    ...[
      '_config.yml',
      '_layouts/base.html',
      '_includes/logo.html',
      'assets/css/site.css',
      'favicon.svg',
      'apple-touch-icon.png',
      'README.md',
      'assets/fonts/OFL-Figtree.txt',
      ...fontes,
    ].map((p) => ({ nome: `existe ${p}`, ok: () => existe(p) })),
    {
      nome: '_config.yml: lang, play_url vazio e exclude de tools e README',
      ok: () => {
        const c = ler('_config.yml');
        return /^lang:\s*pt-BR\s*$/m.test(c) && /^play_url:\s*""\s*$/m.test(c) && /tools/.test(c) && /README\.md/.test(c);
      },
    },
    {
      nome: 'base.html: lang, viewport, theme-color claro e escuro, ícones',
      ok: () =>
        tem('_layouts/base.html', '<html lang="pt-BR">', 'name="viewport"', 'favicon.svg', 'apple-touch-icon.png') &&
        /theme-color[^>]*#D4EFF6[^>]*prefers-color-scheme: light|prefers-color-scheme: light[^>]*#D4EFF6/i.test(ler('_layouts/base.html')) &&
        /theme-color[^>]*#050708[^>]*prefers-color-scheme: dark|prefers-color-scheme: dark[^>]*#050708/i.test(ler('_layouts/base.html')),
    },
    {
      nome: 'site.css: cores do claro e do escuro',
      ok: () =>
        temI('assets/css/site.css', '#d4eff6', '#f3f8fa', '#fbeef6', '#050708', '#182023', '#eef4f6', '#93a4aa', 'prefers-color-scheme: dark'),
    },
    {
      nome: 'site.css: @font-face Figtree 400/600/700/800 servida do site',
      ok: () => {
        const blocos = ler('assets/css/site.css').match(/@font-face\s*{[^}]*}/g) ?? [];
        return (
          blocos.length === 4 &&
          ['400', '600', '700', '800'].every((w) =>
            blocos.some((b) => new RegExp(`font-weight:\\s*${w}`).test(b) && /src:\s*url\("\/assets\/fonts\/Figtree-[A-Za-z]+\.ttf"\)/.test(b)),
          )
        );
      },
    },
    { nome: 'site.css: fallback system-ui', ok: () => tem('assets/css/site.css', 'system-ui') },
    { nome: 'site.css: largura de leitura 680px', ok: () => tem('assets/css/site.css', 'max-width: 680px') },
    { nome: 'site.css: overflow-wrap para textos longos', ok: () => tem('assets/css/site.css', 'overflow-wrap') },
    {
      nome: 'site.css: tabela rola dentro do cartão',
      ok: () => /(^|[\s,}])table[^{]*{[^}]*overflow-x:\s*auto/m.test(ler('assets/css/site.css')),
    },
    {
      nome: 'logo: glifos + − × = e cores claras',
      ok: () => tem('_includes/logo.html', '+', '−', '×', '=') && temI('assets/css/site.css', '#49cbeb', '#f7b3e1', '#85f5cc', '#0f1214'),
    },
    { nome: 'logo: cores escuras', ok: () => temI('assets/css/site.css', '#3db4d2', '#e39bcb', '#74e2bb') },
    {
      nome: 'global: sem JavaScript nem recurso externo',
      ok: () => {
        const ruins = publicados().flatMap((p) => violacoesExternas(ler(p)).map((e) => `${p}: ${e}`));
        if (ruins.length) console.log('    ' + ruins.join('\n    '));
        return ruins.length === 0;
      },
    },
  ],
};


const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const live = args.includes('--live') ? args[args.indexOf('--live') + 1] : null;

let falhas = 0;
for (const [nome, checagens] of Object.entries(grupos)) {
  if (only && nome !== only) continue;
  if (nome === 'live' && !live && only !== 'live') continue;
  console.log(`[${nome}]`);
  for (const c of checagens) {
    let r;
    try {
      r = await c.ok(live);
    } catch (e) {
      r = false;
      console.log(`    erro: ${e.message}`);
    }
    if (r === 'pulada') console.log(`  - ${c.nome} (pulada)`);
    else if (r) console.log(`  ok ${c.nome}`);
    else {
      falhas++;
      console.log(`  FALHOU ${c.nome}`);
    }
  }
}
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
