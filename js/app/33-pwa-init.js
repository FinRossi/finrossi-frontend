// js/app/33-pwa-init.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── PWA SERVICE WORKER + ATUALIZAÇÃO ────────────────────────────────────────
// Versão nova do app: antes recarregava sozinho no meio do uso (perdia o que estava sendo digitado).
// Agora: se o app acabou de abrir, troca na hora (nada digitado ainda); se já está em uso,
// mostra o aviso "Nova versão" e só troca quando a pessoa toca em Atualizar.
let _swReg = null;
let _swTrocaPedida = false;

function aplicarAtualizacaoApp(){
  if (_swReg && _swReg.waiting) {
    _swTrocaPedida = true;
    _swReg.waiting.postMessage('SKIP_WAITING');   // recarrega no 'controllerchange'
  } else {
    window.location.reload();
  }
}

function fecharAvisoAtualizacao(){
  const el = document.getElementById('aviso-atualizacao');
  if (el) el.remove();
}

function mostrarAvisoAtualizacao(){
  if (document.getElementById('aviso-atualizacao')) return;
  const el = document.createElement('div');
  el.id = 'aviso-atualizacao';
  el.className = 'app-atualizacao';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>Nova versão do FinRossi disponível</span>
    <button class="btn primary xs" type="button" onclick="aplicarAtualizacaoApp()">Atualizar</button>
    <button class="app-atualizacao-fechar" type="button" onclick="fecharAvisoAtualizacao()" aria-label="Fechar">✕</button>`;
  document.body.appendChild(el);
}

// Acabou de abrir e a pessoa ainda não está digitando: dá para trocar de versão sem atrapalhar
function _appAcabouDeAbrir(){
  const ativo = document.activeElement;
  const digitando = ativo && /^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName);
  return performance.now() < 10000 && !digitando;
}

if ('serviceWorker' in navigator) {
  // Marca se a página JÁ estava controlada por um SW antes de registrar.
  // Isso diferencia "primeira instalação" (não deve recarregar) de "atualização" (recarrega se pedida).
  let _swJaTinhaControlador = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!_swJaTinhaControlador) {
      _swJaTinhaControlador = true;
      console.log('[SW] Primeira instalação — sem reload');
      return;
    }
    if (_swTrocaPedida) {
      console.log('[SW] Atualização aplicada — recarregando');
      window.location.reload();
    }
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      _swReg = reg;

      const novaVersaoPronta = () => {
        if (!navigator.serviceWorker.controller) return;   // primeira instalação: nada a trocar
        if (_appAcabouDeAbrir()) aplicarAtualizacaoApp();
        else mostrarAvisoAtualizacao();
      };

      // Versão nova baixada numa visita anterior, esperando
      if (reg.waiting) novaVersaoPronta();

      // Versão nova encontrada agora
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed') novaVersaoPronta();
        });
      });

      // App aberto por muito tempo (comum no celular): procura versão nova a cada hora
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);

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
  const isIOS = _ehIOS() && !_navegadorInterno() && !window.navigator.standalone;
  const card = document.getElementById('login-pwa-card');
  const jaInstalou = localStorage.getItem('fin_pwa_instalado');
  if (isIOS && card && !jaInstalou && _pwaDeveMostrarAgora()) card.style.display = 'block';
}, 2000);

// Verifica de novo periodicamente — cobre quem deixa o app aberto por horas
// (o próprio mostrarPWABanner já checa se já se passaram 3h desde o último aviso)
setInterval(mostrarPWABanner, 30 * 60 * 1000); // a cada 30min, só mostra se já passaram 3h
