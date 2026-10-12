// js/app/26-pwa-init.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── PWA SERVICE WORKER + AUTO-UPDATE ────────────────────────────────────────
if ('serviceWorker' in navigator) {
  // Marca se a página JÁ estava controlada por um SW antes de registrar.
  // Isso diferencia "primeira instalação" (não deve recarregar) de "atualização real" (deve recarregar).
  let _swJaTinhaControlador = !!navigator.serviceWorker.controller;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');

      // Detecta nova versão disponível
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // Nova versão pronta — recarrega automaticamente
            console.log('[SW] Nova versão detectada — atualizando...');
            newSW.postMessage('SKIP_WAITING');
          }
        });
      });

      // Quando o SW assumir controle, recarrega SÓ se já havia um SW controlando antes
      // (evita recarregar na primeira instalação, o que derrubava o prompt de instalação do Android)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!_swJaTinhaControlador) {
          _swJaTinhaControlador = true;
          console.log('[SW] Primeira instalação — sem reload');
          return;
        }
        console.log('[SW] Atualização aplicada — recarregando');
        window.location.reload();
      });

    } catch(e) {
      console.log('[SW] Erro:', e);
    }
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
initTema();
initDatePickers();

// Verifica instalação do PWA de forma incondicional — necessário pro iOS,
// que nunca dispara o evento 'beforeinstallprompt' (só Android/Chrome/Edge disparam)
setTimeout(mostrarPWABanner, 4000);
setTimeout(() => {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
  const card = document.getElementById('login-pwa-card');
  const jaInstalou = localStorage.getItem('fin_pwa_instalado');
  if (isIOS && card && !jaInstalou && _pwaDeveMostrarAgora()) card.style.display = 'block';
}, 2000);

// Verifica de novo periodicamente — cobre quem deixa o app aberto por horas
// (o próprio mostrarPWABanner já checa se já se passaram 3h desde o último aviso)
setInterval(mostrarPWABanner, 30 * 60 * 1000); // a cada 30min, só mostra se já passaram 3h
