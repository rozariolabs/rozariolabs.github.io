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
  home: [
    {
      nome: 'index.html: layout base e description',
      ok: () => /^---[\s\S]*?^layout:\s*base\s*$[\s\S]*?^---/m.test(ler('index.html')) && /^description:.*rescisão/m.test(ler('index.html')),
    },
    {
      nome: 'index.html: logo, título, frase, links, e-mail e rodapé',
      ok: () =>
        tem(
          'index.html',
          'logo.html size="lg"',
          '<h1>Meu Acerto</h1>',
          'Calcule rescisão, férias, 13º, hora extra e salário líquido com o passo a passo de cada valor.',
          'href="/termos/"',
          'href="/privacidade/"',
          'mailto:gabrielsilvarozario@gmail.com',
          '© 2026 Rozario Labs',
        ),
    },
    {
      nome: 'index.html: botão do Play só quando play_url está preenchido',
      ok: () => {
        const html = ler('index.html');
        const bloco = html.match(/{%\s*if site\.play_url != ""\s*%}([\s\S]*?){%\s*endif\s*%}/);
        if (!bloco || !bloco[1].includes('Disponível no Google Play') || !bloco[1].includes('href="{{ site.play_url }}"')) return false;
        return !html.replace(bloco[0], '').includes('Disponível no Google Play');
      },
    },
    {
      nome: '404.html: permalink, layout base e link para o início',
      ok: () => tem('404.html', 'href="/"') && /^permalink:\s*\/404\.html\s*$/m.test(ler('404.html')) && /^layout:\s*base\s*$/m.test(ler('404.html')),
    },
  ],
  legal: [
    {
      nome: 'legal.html: layout base, cabeçalho, título, data, conteúdo e links do fim',
      ok: () =>
        /^layout:\s*base\s*$/m.test(ler('_layouts/legal.html')) &&
        tem(
          '_layouts/legal.html',
          'href="/"',
          'logo.html size="sm"',
          '{{ page.title }}',
          'Última atualização: {{ page.updated }}',
          '{{ content }}',
          'href="/privacidade/"',
          'href="/termos/"',
        ),
    },
    ...[
      ['privacidade.md', '/privacidade/', 'Política de privacidade', 11, '1. Quem é o responsável', '11. Alterações nesta política'],
      ['termos.md', '/termos/', 'Termos de uso', 13, '1. O que é o app', '13. Contato'],
    ].flatMap(([arq, permalink, titulo, secoes, primeira, ultima]) => [
      {
        nome: `${arq}: front matter`,
        ok: () => {
          const fm = frontMatter(ler(arq));
          return fm.layout === 'legal' && fm.permalink === permalink && fm.title === titulo && fm.updated === '31 de outubro de 2026';
        },
      },
      {
        nome: `${arq}: ${secoes} seções, sem título nem data no corpo`,
        ok: () => {
          const corpo = semFrontMatter(ler(arq));
          const h2 = corpo.match(/^## .*/gm) ?? [];
          return (
            !/^# /m.test(corpo) &&
            !corpo.includes('Última atualização') &&
            h2.length === secoes &&
            h2[0] === `## ${primeira}` &&
            h2.at(-1) === `## ${ultima}`
          );
        },
      },
      {
        nome: `${arq}: conteúdo igual ao original de meu-acerto/docs/legal`,
        ok: () => {
          const orig = join(root, '..', 'meu-acerto', 'docs', 'legal', arq === 'termos.md' ? 'termos-de-uso.md' : 'politica-de-privacidade.md');
          if (!existsSync(orig)) return 'pulada';
          const original = readFileSync(orig, 'utf8')
            .split('\n')
            .filter((l) => !/^# /.test(l) && !/^Última atualização/.test(l))
            .join('\n');
          return normalizar(original) === normalizar(semFrontMatter(ler(arq)));
        },
      },
    ]),
    {
      nome: 'privacidade.md: responsável, e-mail e links do Google',
      ok: () => {
        const c = ler('privacidade.md');
        return (
          tem('privacidade.md', 'gabrielsilvarozario@gmail.com', 'Rozario Labs') &&
          ['https://policies.google.com/privacy', 'https://policies.google.com/technologies/partner-sites', 'https://firebase.google.com/support/privacy'].every(
            (u) => c.includes(`](${u})`),
          )
        );
      },
    },
    { nome: 'termos.md: link para a Política', ok: () => tem('termos.md', '[Política de privacidade](/privacidade/)') },
  ],
  live: [
    ...[
      ['/', 'Meu Acerto'],
      ['/privacidade/', 'Política de privacidade'],
      ['/termos/', 'Termos de uso'],
    ].map(([caminho, texto]) => ({
      nome: `no ar: ${caminho} responde 200 com "${texto}", pt-BR, sem recurso externo e sem botão do Play`,
      ok: async (base) => {
        const r = await fetch(base + caminho);
        const html = await r.text();
        return (
          r.status === 200 &&
          html.includes(texto) &&
          html.includes('lang="pt-BR"') &&
          violacoesExternas(html).length === 0 &&
          !html.includes('Disponível no Google Play')
        );
      },
    })),
    ...['/privacidade', '/termos'].map((caminho) => ({
      nome: `no ar: ${caminho} sem barra final abre a página`,
      ok: async (base) => (await fetch(base + caminho)).status === 200,
    })),
    {
      nome: 'no ar: endereço inexistente dá 404 com link para o início',
      ok: async (base) => {
        const r = await fetch(base + '/pagina-que-nao-existe');
        const html = await r.text();
        return r.status === 404 && html.includes('Página não encontrada') && html.includes('href="/"');
      },
    },
    ...['/assets/css/site.css', '/assets/fonts/Figtree-Bold.ttf', '/favicon.svg'].map((caminho) => ({
      nome: `no ar: ${caminho} responde 200`,
      ok: async (base) => (await fetch(base + caminho)).status === 200,
    })),
  ],
};

function frontMatter(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  return Object.fromEntries(
    m[1].split(/\r?\n/).map((l) => l.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.replace(/^["']|["']$/g, '')]),
  );
}

function semFrontMatter(texto) {
  return texto.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

// Compara só o texto: desfaz links Markdown e normaliza espaços.
function normalizar(texto) {
  return texto
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, (_, rotulo, url) => (rotulo === url ? url : rotulo))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}


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
