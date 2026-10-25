// FinRossi SW v12 (toque na notificação abre o app)
// • Página (index.html): sempre da rede; sem internet, a última cópia salva.
// • Na instalação já guarda TUDO que o index.html usa (CSS/JS com ?v=, Chart.js, Firebase, fontes).
//   Antes só guardava o index.html: o app instalado abria quebrado sem internet até a 2ª visita.
// • Arquivos do app com versão (?v=) e bibliotecas com versão fixa (cdnjs, jsdelivr, Firebase SDK,
//   arquivos de fonte): do aparelho primeiro. São imutáveis — quando mudam, a URL muda.
//   Numa atualização, o que não mudou é reaproveitado do cache anterior (não baixa de novo).
// • Versão nova não assume sozinha: o app avisa "Nova versão" e troca quando a pessoa toca
//   (ou na próxima abertura). Antes recarregava no meio do uso e apagava o que estava sendo digitado.
// • Banco de dados, login, backend e pagamentos: nunca passam pelo SW.
const CACHE_NAME = 'finrossi-v12';

// Bibliotecas e fontes com versão fixa na URL — seguras para guardar
const IMUTAVEIS = [
  'https://cdnjs.cloudflare.com/ajax/libs/',
  'https://cdn.jsdelivr.net/npm/',
  'https://www.gstatic.com/firebasejs/',
  'https://fonts.gstatic.com/'
];
// CSS das fontes do Google: não tem versão na URL — rede primeiro, cópia para usar sem internet
const FONTES_CSS = 'https://fonts.googleapis.com/css';

// URLs que NUNCA devem ser interceptadas pelo SW
const BYPASS = [
  'firebase', 'firebaseio', 'firebaseapp', 'googleapis',
  'gstatic', 'railway.app', 'resend.com', 'asaas', 'cdnjs.cloudflare.com',
  'fonts.googleapis', 'fonts.gstatic', ':3000'
];

const ehImutavel = url => IMUTAVEIS.some(p => url.startsWith(p));
const ehLocalComVersao = url => url.startsWith(self.location.origin) && /[?&]v=/.test(url);

// Lista o que o index.html carrega: arquivos locais com ?v=, bibliotecas e CSS das fontes
function listarRecursos(html){
  const urls = new Set();
  const re = /(?:src|href)="([^"]+)"/g;
  let m;
  while((m = re.exec(html))){
    let abs;
    try{ abs = new URL(m[1].replace(/&amp;/g, '&'), self.location.origin + '/'); }catch(e){ continue; }
    if(abs.pathname === '/') continue;   // preconnect para o servidor, não é arquivo
    abs = abs.href;
    if(ehLocalComVersao(abs) || ehImutavel(abs) || abs.startsWith(FONTES_CSS)) urls.add(abs);
  }
  return [...urls];
}

// Arquivos de fonte citados no CSS do Google (só os alfabetos latinos, que o app usa)
function listarArquivosDeFonte(css){
  const urls = [];
  const blocos = css.match(/\/\*\s*latin(?:-ext)?\s*\*\/\s*@font-face\s*\{[^}]*\}/g) || [];
  blocos.forEach(b => { const u = b.match(/url\((https:[^)]+)\)/); if(u) urls.push(u[1]); });
  return urls;
}

async function baixar(url){
  const local = url.startsWith(self.location.origin);
  let r = await fetch(url, local ? {} : { mode: 'cors', credentials: 'omit' }).catch(() => null);
  if(!r && !local) r = await fetch(url, { mode: 'no-cors' }).catch(() => null);
  return r && (r.ok || r.type === 'opaque') ? r : null;
}

// Guarda uma URL no cache novo. Se ela é imutável e já existe num cache anterior, só copia.
async function guardar(cache, url){
  try{
    if(url.startsWith(FONTES_CSS)){
      const r = await baixar(url) || await caches.match(url, { ignoreVary: true });
      if(!r) return;
      if(r.ok && r.type !== 'opaque'){
        const css = await r.clone().text();
        await Promise.all(listarArquivosDeFonte(css).map(f => guardar(cache, f)));
      }
      await cache.put(url, r);
      return;
    }
    const salvo = await caches.match(url, { ignoreVary: true });
    if(salvo){ await cache.put(url, salvo); return; }
    const r = await baixar(url);
    if(r) await cache.put(url, r);
  }catch(e){}
}

// Bibliotecas que o app baixou sob demanda (leitor de fotos, PDF...) continuam no aparelho
async function reaproveitarImutaveis(cache){
  const nomes = (await caches.keys()).filter(k => k !== CACHE_NAME);
  for(const nome of nomes){
    const antigo = await caches.open(nome);
    for(const req of await antigo.keys()){
      if(!ehImutavel(req.url)) continue;
      const r = await antigo.match(req);
      if(r) await cache.put(req, r).catch(() => {});
    }
  }
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await reaproveitarImutaveis(cache);
    // Sem a página não instala: a versão anterior continua valendo e o navegador tenta de novo depois
    const r = await fetch('/index.html', { cache: 'no-cache' });
    if(!r.ok) throw new Error('index.html indisponível');
    const paraLer = r.clone(), copia = r.clone();
    const html = await paraLer.text();
    await cache.put('/index.html', copia);
    await cache.put('/', r);
    await Promise.all(listarRecursos(html).map(u => guardar(cache, u)));
    // Sem skipWaiting aqui: a versão nova espera o app pedir (ver 33-pwa-init.js)
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Do aparelho primeiro; se não tiver, busca e guarda
function doCacheOuRede(req){
  return caches.match(req, { ignoreVary: true }).then(salvo => salvo || fetch(req).then(r => {
    if (r && (r.ok || r.type === 'opaque')) {
      const copia = r.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, copia));
    }
    return r;
  }));
}

// Da rede; sem internet, a cópia salva
function redeOuCache(req, soDoSite){
  return fetch(req)
    .then(r => {
      if (r && r.status === 200 && (!soDoSite || r.type === 'basic')) {
        const copia = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copia));
      }
      return r;
    })
    .catch(() => caches.match(req, { ignoreVary: true }));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  if (ehImutavel(url)) { e.respondWith(doCacheOuRede(e.request)); return; }
  if (url.startsWith(FONTES_CSS)) { e.respondWith(redeOuCache(e.request)); return; }

  // Ignora completamente tudo que não é do próprio site
  if (BYPASS.some(b => url.includes(b))) return;
  if (!url.startsWith(self.location.origin)) return;

  // Arquivos do app com versão na URL (?v=) — do aparelho primeiro
  if (/[?&]v=/.test(url)) { e.respondWith(doCacheOuRede(e.request)); return; }

  // Páginas (index.html e navegação) — sempre da rede; sem internet, a cópia salva
  if (e.request.mode === 'navigate' || url.endsWith('/') || url.includes('index.html')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })   // sempre confere com o servidor (antes podia vir a cópia de até 10 min do navegador)
        .then(r => {
          if (r && r.status === 200) {
            const copia = r.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, copia));
          }
          return r;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // Demais arquivos locais — da rede, com cópia para usar sem internet
  e.respondWith(redeOuCache(e.request, true));
});

// Toque na notificação: traz o app para a frente (ou abre, se estiver fechado)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const destino = new URL((e.notification.data && e.notification.data.url) || '/?entrar=1', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(janelas => {
    const aberta = janelas.find(j => j.url.startsWith(self.location.origin) && !j.url.includes('/landing/'));
    if (aberta && 'focus' in aberta) return aberta.focus();
    return self.clients.openWindow(destino);
  }));
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
