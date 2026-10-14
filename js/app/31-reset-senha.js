// js/app/31-reset-senha.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── RESET DE SENHA ──────────────────────────────────────────────────────────
function abrirResetSenha(){
  const modal = document.getElementById('modal-reset-senha');
  const emailLogin = document.getElementById('login-email')?.value || '';
  if(emailLogin) document.getElementById('reset-email').value = emailLogin;
  document.getElementById('reset-msg').style.display = 'none';
  document.getElementById('reset-msg').textContent = '';
  document.getElementById('btn-reset').textContent = 'Enviar link de redefinição';
  document.getElementById('btn-reset').disabled = false;
  modal.style.display = 'flex';
  setTimeout(()=>document.getElementById('reset-email').focus(), 100);
}

function fecharResetSenha(){
  document.getElementById('modal-reset-senha').style.display = 'none';
}

async function enviarResetSenha(){
  const emailEl = document.getElementById('reset-email');
  const msgEl   = document.getElementById('reset-msg');
  const btnEl   = document.getElementById('btn-reset');
  const email   = emailEl.value.trim();

  if(!email){ 
    msgEl.textContent = 'Digite seu email.';
    msgEl.style.display = 'block';
    msgEl.style.background = 'rgba(248,113,113,0.1)';
    msgEl.style.color = '#f87171';
    return; 
  }
  if(!validarEmail(email)){
    msgEl.textContent = 'Email inválido — verifique o formato.';
    msgEl.style.display = 'block';
    msgEl.style.background = 'rgba(248,113,113,0.1)';
    msgEl.style.color = '#f87171';
    return;
  }

  btnEl.textContent = 'Enviando...';
  btnEl.disabled = true;
  msgEl.style.display = 'none';

  try{
    const f = window._firebase;
    if(!f || !f.firebaseOk) throw new Error('Firebase não disponível');

    const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    
    await sendPasswordResetEmail(f.auth, email, {
      url: 'https://finrossi.com.br', // redireciona para o app após redefinir
      handleCodeInApp: false,
    });

    // Sucesso
    msgEl.innerHTML = 'E-mail enviado<br><span style="font-size:12px;opacity:.8">Verifique sua caixa de entrada e spam. O link expira em 1 hora.</span>';
    msgEl.style.display = 'block';
    msgEl.style.background = 'rgba(74,222,128,0.08)';
    msgEl.style.border = '1px solid rgba(74,222,128,0.2)';
    msgEl.style.color = '#4ade80';
    btnEl.textContent = 'Email enviado ✓';
    btnEl.style.background = '#1a3a2a';
    btnEl.style.color = '#4ade80';

    // Fecha o modal após 4s
    setTimeout(()=>fecharResetSenha(), 4000);

  }catch(e){
    let msg = 'Erro ao enviar. Tente novamente.';
    if(e.code === 'auth/user-not-found') msg = 'Email não encontrado. Verifique ou crie uma conta.';
    if(e.code === 'auth/invalid-email')  msg = 'Email inválido.';
    if(e.code === 'auth/too-many-requests') msg = 'Muitas tentativas. Aguarde alguns minutos.';
    msgEl.textContent = msg;
    msgEl.style.display = 'block';
    msgEl.style.background = 'rgba(248,113,113,0.1)';
    msgEl.style.border = '1px solid rgba(248,113,113,0.2)';
    msgEl.style.color = '#f87171';
    btnEl.textContent = 'Enviar link de redefinição';
    btnEl.disabled = false;
  }
}


window._abrirComBoasVindas = function(nome, callback){
  const tela = document.getElementById('tela-bemvindo');
  if(!tela){ if(callback) callback(); return; }

  const set = (id, txt) => { const el=document.getElementById(id); if(el) el.textContent=txt; };
  const fade = (id, v) => { const el=document.getElementById(id); if(el){ el.style.opacity=v; el.style.transform=v==='1'?'translateY(0)':'translateY(20px)'; } };

  const hora = new Date().getHours();
  const saudacao = hora<12?'Bom dia':hora<18?'Boa tarde':'Boa noite';
  const frases = ['Suas finanças estão te esperando.','Vamos organizar o seu dia.','Controle total nas suas mãos.','Cada real conta. Vamos lá.'];

  set('bv-saudacao', saudacao+',');
  set('bv-nome', nome.split(' ')[0]);
  set('bv-frase', frases[Math.floor(Math.random()*frases.length)]);
  tela.style.display = 'flex';
  tela.style.opacity = '1';

  // Partículas
  const canvas = document.getElementById('bv-canvas');
  let animId;
  if(canvas){
    canvas.width=window.innerWidth; canvas.height=window.innerHeight;
    const ctx=canvas.getContext('2d');
    const pts=Array.from({length:35},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:Math.random()*1.4+.3,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,a:Math.random()*.35+.1}));
    const draw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(200,169,110,${p.a})`;ctx.fill();p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=canvas.width;if(p.x>canvas.width)p.x=0;if(p.y<0)p.y=canvas.height;if(p.y>canvas.height)p.y=0;});animId=requestAnimationFrame(draw);};
    draw();
  }

  // Sequência
  const logoEl=document.getElementById('bv-logo');
  const linhaEl=document.getElementById('bv-linha');
  const loadTxt=document.getElementById('bv-loading-txt');
  const progressBar=document.getElementById('bv-progress');
  const feats=document.querySelectorAll('.bv-feat');

  setTimeout(()=>{ if(logoEl){logoEl.style.opacity='1';logoEl.style.transform='translateY(0)';} },100);
  setTimeout(()=>fade('bv-saudacao','1'),300);
  setTimeout(()=>{ const el=document.getElementById('bv-nome');if(el){el.style.opacity='1';el.style.transform='translateY(0)';} },600);
  setTimeout(()=>{ if(linhaEl)linhaEl.style.width='160px'; },900);
  setTimeout(()=>fade('bv-frase','1'),1100);
  feats.forEach((f,i)=>setTimeout(()=>{f.style.opacity='1';f.style.transform='translateY(0)';},1300+i*100));
  setTimeout(()=>{ if(progressBar)progressBar.style.width='100%'; if(loadTxt)loadTxt.style.opacity='1'; },1600);

  // Saída
  const sair = () => {
    if(animId) cancelAnimationFrame(animId);
    tela.style.transition='opacity .5s ease';
    tela.style.opacity='0';
    setTimeout(()=>{ tela.style.display='none'; tela.style.opacity='1'; tela.style.transition=''; if(callback)callback(); },500);
  };
  setTimeout(sair, 2800);
  // Segurança total
  setTimeout(()=>{ if(tela.style.display!=='none'){ tela.style.display='none'; if(callback)callback(); } },5000);
};
var _pwaPrompt = null;
var _deferredPromptLogin = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _pwaPrompt = e;
  _deferredPromptLogin = e;
  setTimeout(mostrarPWABanner, 4000);
  // Mostra card na tela de login após 2s
  setTimeout(() => {
    const card = document.getElementById('login-pwa-card');
    const jaInstalou = localStorage.getItem('fin_pwa_instalado');
    if (card && !jaInstalou && _pwaDeveMostrarAgora()) card.style.display = 'block';
  }, 2000);
});

async function instalarPWALogin() {
  if (!_deferredPromptLogin) {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      document.getElementById('login-pwa-card').style.display = 'none';
      document.getElementById('ios-banner').style.display = 'block';
    }
    return;
  }
  _deferredPromptLogin.prompt();
  const { outcome } = await _deferredPromptLogin.userChoice;
  if (outcome === 'accepted') {
    localStorage.setItem('fin_pwa_instalado', '1');
    document.getElementById('login-pwa-card').style.display = 'none';
  } else {
    // Recusou — mostra de novo em 3h (mesma regra do banner)
    localStorage.setItem('fin_pwa_ultimo_aviso', String(Date.now()));
  }
  _deferredPromptLogin = null;
}

// Verifica se instalou — checa localStorage E Firebase
async function _pwaJaInstalou(){
  // 1. Se está rodando como standalone — instalado neste dispositivo
  if(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) return true;
  // 2. Se salvou localmente que instalou
  if(localStorage.getItem('fin_pwa_instalado') === '1') return true;
  // 3. Verifica no Firebase (instalou em outro dispositivo) — com timeout de segurança,
  // pra nunca travar em "Verificando..." caso o Firebase não responda
  if(window._db && window._ref && window._onValue && window._firebaseUser){
    try{
      const snap = await new Promise((res,rej)=>{
        const timeoutId = setTimeout(()=>rej(new Error('timeout')), 4000);
        window._onValue(window._ref(window._db,`usuarios/${window._firebaseUser.uid}/pwaInstalado`),(s)=>{
          clearTimeout(timeoutId);
          res(s);
        },{onlyOnce:true});
      });
      if(snap.val() === true){
        localStorage.setItem('fin_pwa_instalado','1');
        return true;
      }
    }catch(e){}
  }
  return false;
}

function _pwaDeveMostrarAgora(){
  const TRES_HORAS_MS = 3 * 60 * 60 * 1000;
  const ultimo = localStorage.getItem('fin_pwa_ultimo_aviso');
  if(!ultimo) return true;
  return (Date.now() - parseInt(ultimo)) >= TRES_HORAS_MS;
}

async function mostrarPWABanner(){
  if(await _pwaJaInstalou()) return;
  if(!_pwaDeveMostrarAgora()) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
  if(_pwaPrompt){
    document.getElementById('pwa-banner').style.display='block';
    const fab = document.getElementById('pwa-fab');
    if(fab) fab.style.display='flex';
  } else if(isIOS){
    document.getElementById('ios-banner').style.display='block';
  }
}

async function instalarPWA(){
  if(!_pwaPrompt) return;
  _pwaPrompt.prompt();
  const result = await _pwaPrompt.userChoice;
  _pwaPrompt = null;
  if(result.outcome === 'accepted'){
    fecharPWABanner(true);
    // Salva que instalou — localStorage e Firebase
    localStorage.setItem('fin_pwa_instalado','1');
    if(window._db && window._set && window._ref && window._firebaseUser){
      try{ window._set(window._ref(window._db,`usuarios/${window._firebaseUser.uid}/pwaInstalado`), true); }catch(e){}
    }
    const fab = document.getElementById('pwa-fab');
    if(fab) fab.style.display='none';
  } else {
    // Cancelou o diálogo nativo — trata como recusa: reagenda lembrete em 3h.
    // Esconde banner e FAB (o prompt nativo já foi consumido e só volta
    // quando o Chrome disparar um novo 'beforeinstallprompt', geralmente no próximo carregamento)
    document.getElementById('pwa-banner').style.display='none';
    const fab = document.getElementById('pwa-fab');
    if(fab) fab.style.display='none';
    localStorage.setItem('fin_pwa_ultimo_aviso', String(Date.now()));
  }
}

function fecharPWABanner(instalou=false){
  document.getElementById('pwa-banner').style.display='none';
  if(!instalou){
    // Recusou — registra agora, mostra de novo em 3h
    localStorage.setItem('fin_pwa_ultimo_aviso', String(Date.now()));
    // Mostra FAB para instalar quando quiser
    if(_pwaPrompt){
      const fab = document.getElementById('pwa-fab');
      if(fab) fab.style.display='flex';
    }
  }
}

function fecharIOSBanner(){
  document.getElementById('ios-banner').style.display='none';
  localStorage.setItem('fin_pwa_ultimo_aviso', String(Date.now()));
}

async function abrirPWAManual(){
  if(await _pwaJaInstalou()) return;
  if(_pwaPrompt){
    document.getElementById('pwa-banner').style.display='block';
  } else {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if(isIOS) document.getElementById('ios-banner').style.display='block';
  }
}

async function atualizarStatusPWAConfig(){
  const statusEl=document.getElementById('cfg-pwa-status');
  const btnEl=document.getElementById('cfg-pwa-btn');
  if(!statusEl||!btnEl) return;
  let instalado = false;
  try{
    instalado = await _pwaJaInstalou();
  }catch(e){
    console.warn('[PWA] erro ao verificar status:', e);
  }
  if(instalado){
    statusEl.textContent='Instalado';
    statusEl.style.background='var(--green-s)';
    statusEl.style.color='var(--green)';
    btnEl.style.display='none';
  } else {
    statusEl.textContent='Não instalado';
    statusEl.style.background='var(--surface3)';
    statusEl.style.color='var(--muted)';
    btnEl.style.display='';
  }
}

async function instalarPWAConfig(){
  const msg=document.getElementById('msg-pwa-config');
  if(msg){msg.textContent='';msg.style.color='';}
  if(await _pwaJaInstalou()){
    atualizarStatusPWAConfig();
    return;
  }
  if(_pwaPrompt){
    _pwaPrompt.prompt();
    const result = await _pwaPrompt.userChoice;
    _pwaPrompt = null;
    if(result.outcome==='accepted'){
      localStorage.setItem('fin_pwa_instalado','1');
      if(window._db && window._set && window._ref && window._firebaseUser){
        try{ window._set(window._ref(window._db,`usuarios/${window._firebaseUser.uid}/pwaInstalado`), true); }catch(e){}
      }
      if(msg){msg.textContent='App instalado!';msg.style.color='var(--green)';}
    } else if(msg){
      msg.textContent='Instalação cancelada.';msg.style.color='var(--muted)';
    }
    atualizarStatusPWAConfig();
    return;
  }
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(msg){
    msg.textContent = isIOS
      ? 'No iPhone: toque em Compartilhar (□↑) e depois "Adicionar à Tela de Início".'
      : 'Seu navegador ainda não liberou a instalação automática. Tente pelo Chrome ou Edge.';
    msg.style.color='var(--amber)';
  }
}

