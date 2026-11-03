// construir.js — gera a pasta dist/ que vai para o ar (Cloudflare Pages): o mesmo site, compactado.
// ─── O que faz ───────────────────────────────────────────────────────────────
// • JS: tira comentários e espaços e troca os nomes INTERNOS de cada função por letras (terser).
//   Os nomes de nível de cima (funções e variáveis globais) ficam iguais: os botões do HTML chamam
//   por eles (onclick="addLanc(...)") e um arquivo usa as funções do outro.
// • CSS: tira comentários e espaços (clean-css).
// • HTML: tira comentários e espaços sobrando; compacta o CSS e o JS que estão dentro da página.
// • Imagens, ícones e manifest: copiados como estão.
// • Não vão para o ar: este arquivo, package.json, node_modules, README, .gitignore, CNAME.
// O código original (com os comentários) fica só no repositório. Uso: npm run construir
const fs = require('fs');
const path = require('path');
const { minify: minJS } = require('terser');
const { minify: minHTML } = require('html-minifier-terser');
const CleanCSS = require('clean-css');

const RAIZ = __dirname;
const SAIDA = path.join(RAIZ, 'dist');
const FORA = new Set(['node_modules', 'dist', '.git', '.github', 'construir.js', 'package.json', 'package-lock.json', 'README.md', '.gitignore', 'CNAME', '.wrangler']);

const OPC_JS = {
  ecma: 2020,
  toplevel: false,                       // nomes globais intactos (onclick e scripts entre si)
  compress: { passes: 2, keep_fargs: true, keep_infinity: true },
  mangle: { toplevel: false },
  format: { comments: false },
};

function arquivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (FORA.has(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? arquivos(p) : [p];
  });
}

async function construir() {
  fs.rmSync(SAIDA, { recursive: true, force: true });
  const css = new CleanCSS({ level: 1, returnPromise: false });
  let antes = 0, depois = 0;
  const tamanhos = {};
  for (const origem of arquivos(RAIZ)) {
    const rel = path.relative(RAIZ, origem);
    const destino = path.join(SAIDA, rel);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    const ext = path.extname(origem).toLowerCase();
    if (!['.js', '.css', '.html'].includes(ext)) { fs.copyFileSync(origem, destino); continue; }
    const texto = fs.readFileSync(origem, 'utf8');
    let saida;
    try {
      if (ext === '.js') {
        const modulo = /^\s*(import|export)\s/m.test(texto);   // js/firebase-init.js é módulo
        saida = (await minJS(texto, { ...OPC_JS, module: modulo })).code;
      } else if (ext === '.css') {
        const r = css.minify(texto);
        if (r.errors.length) throw new Error(r.errors.join('; '));
        saida = r.styles;
      } else {
        saida = await minHTML(texto, {
          removeComments: true,
          collapseWhitespace: true,
          conservativeCollapse: true,          // deixa 1 espaço onde havia espaço (texto não gruda)
          keepClosingSlash: true,
          minifyCSS: { level: 1 },
          minifyJS: { ...OPC_JS },
        });
      }
    } catch (e) {
      throw new Error(`${rel}: ${e.message}`);
    }
    fs.writeFileSync(destino, saida);
    antes += Buffer.byteLength(texto); depois += Buffer.byteLength(saida);
    tamanhos[ext] = (tamanhos[ext] || 0) + 1;
  }
  console.log(`✅ dist/ pronta: ${Object.entries(tamanhos).map(([e, n]) => `${n} ${e}`).join(', ')} compactados · ${(antes / 1024).toFixed(0)} KB → ${(depois / 1024).toFixed(0)} KB (${Math.round(100 - depois / antes * 100)}% menor)`);
}

construir().catch(e => { console.error('❌ Não construí:', e.message); process.exit(1); });
