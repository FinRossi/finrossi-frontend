// FinRossi SW v10
// • Página (index.html): sempre da rede; sem internet, a última cópia salva.
// • Arquivos do app com versão (?v=) e bibliotecas com versão fixa (cdnjs, jsdelivr, Firebase SDK,
//   arquivos de fonte): do aparelho primeiro. São imutáveis — quando mudam, a URL muda.
// • Banco de dados, login, backend e pagamentos: nunca passam pelo SW.
const CACHE_NAME = 'finrossi-v10';
const ASSETS = ['/', '/index.html'];

// Bibliotecas e fontes com versão fixa na URL — seguras para guardar
const IMUTAVEIS = [
  'https://cdnjs.cloudflare.com/ajax/libs/',
  'https://cdn.jsdelivr.net/npm/',
  'https://www.gstatic.com/firebasejs/',
  'https://fonts.gstatic.com/'
];

// URLs que NUNCA devem ser interceptadas pelo SW
const BYPASS = [
  'firebase', 'firebaseio', 'firebaseapp', 'googleapis',
  'gstatic', 'railway.app', 'resend.com', 'asaas', 'cdnjs.cloudflare.com',
  'fonts.googleapis', 'fonts.gstatic', ':3000'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(()=>{})))
      .then(() => self.skipWaiting())
  );
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
  return caches.match(req).then(salvo => salvo || fetch(req).then(r => {
    if (r && (r.ok || r.type === 'opaque')) {
      const copia = r.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, copia));
    }
    return r;
  }));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  if (IMUTAVEIS.some(p => url.startsWith(p))) { e.respondWith(doCacheOuRede(e.request)); return; }

  // Ignora completamente tudo que não é do próprio site
  if (BYPASS.some(b => url.includes(b))) return;
  if (!url.startsWith(self.location.origin)) return;

  // Arquivos do app com versão na URL (?v=) — do aparelho primeiro
  if (/[?&]v=/.test(url)) { e.respondWith(doCacheOuRede(e.request)); return; }

  // index.html — sempre da rede
  if (url.endsWith('/') || url.includes('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r && r.status === 200) {
            const copia = r.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, copia));
          }
          return r;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Demais arquivos locais — da rede, com cópia para usar sem internet
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.status === 200 && r.type === 'basic') {
          const copia = r.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
