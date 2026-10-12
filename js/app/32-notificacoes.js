// js/app/32-notificacoes.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ═══════════════════════════════════════════════════════════
// SISTEMA DE NOTIFICAÇÕES — FinRossi
// ═══════════════════════════════════════════════════════════

// ── Calcula vencimentos próximos ──────────────────────────
function getVencimentosProximos(diasAlerta=3){
  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const mesHoje = hoje.getMonth();
  const anoHoje = hoje.getFullYear();
  const {assinaturas, recorrentes} = pd();
  const alertas = [];

  // Assinaturas
  (assinaturas||[]).filter(a=>a.status!=='pausada').forEach(a=>{
    const diasFaltam = a.dia >= diaHoje ? a.dia - diaHoje : (new Date(anoHoje, mesHoje+1, a.dia) - hoje) / 86400000;
    if(diasFaltam >= 0 && diasFaltam <= diasAlerta){
      alertas.push({tipo:'assinatura', nome:a.nome, val:a.val, dia:a.dia, diasFaltam:Math.ceil(diasFaltam), cat:a.cat});
    }
  });

  // Recorrentes
  (recorrentes||[]).forEach(r=>{
    const diasFaltam = r.dia >= diaHoje ? r.dia - diaHoje : (new Date(anoHoje, mesHoje+1, r.dia) - hoje) / 86400000;
    if(diasFaltam >= 0 && diasFaltam <= diasAlerta){
      alertas.push({tipo:'recorrente', nome:r.desc, val:r.val, dia:r.dia, diasFaltam:Math.ceil(diasFaltam), cat:r.cat});
    }
  });

  // Cartões (fatura)
  (pd().cartoes||[]).forEach(cartao=>{
    if(!cartao.venc) return;
    const diasFaltam = cartao.venc >= diaHoje ? cartao.venc - diaHoje : (new Date(anoHoje, mesHoje+1, cartao.venc) - hoje) / 86400000;
    if(diasFaltam >= 0 && diasFaltam <= diasAlerta){
      alertas.push({tipo:'cartao', nome:`Fatura ${cartao.nome}`, val:null, dia:cartao.venc, diasFaltam:Math.ceil(diasFaltam), cat:'Cartão'});
    }
  });

  return alertas.sort((a,b)=>a.diasFaltam-b.diasFaltam);
}

// ── FASE 1: Alerta visual no Dashboard ───────────────────
function renderAlertasVencimento(){
  const el = document.getElementById('dash-alertas-venc');
  if(!el) return;
  if(typeof verComoPlanoPermite==='function' && !verComoPlanoPermite('assinaturas')){ el.innerHTML=''; return; }
  const alertas = getVencimentosProximos(5);
  if(!alertas.length){ el.innerHTML=''; return; }

  const itens = alertas.map(a=>{
    const urgente = a.diasFaltam <= 1;
    const cor = urgente ? 'var(--red)' : a.diasFaltam <= 3 ? 'var(--amber)' : 'var(--blue)';
    const label = a.diasFaltam === 0 ? 'Hoje!' : a.diasFaltam === 1 ? 'Amanhã' : `Em ${a.diasFaltam} dias`;
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:${urgente?'rgba(248,113,113,.06)':'rgba(251,191,36,.06)'};border-radius:9px;border-left:3px solid ${cor}">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:16px">${a.tipo==='cartao'?'💳':a.tipo==='assinatura'?'🔄':'📋'}</span>
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--text)">${a.nome}</div>
          <div style="font-size:11px;color:var(--muted)">${a.cat} · dia ${a.dia}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;font-weight:600;color:${cor}">${label}</div>
        ${a.val?`<div style="font-size:11px;color:var(--muted)">${fmtR(a.val)}</div>`:''}
      </div>
    </div>`;
  }).join('');

  el.innerHTML=`<div class="card" style="padding:16px 18px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span style="font-size:14px">🔔</span>
      <span style="font-size:13px;font-weight:600;color:var(--text)">Vencimentos próximos</span>
      <span style="background:var(--red-s);color:var(--red);font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600">${alertas.length}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">${itens}</div>
  </div>`;
}

// ── FASE 2: Email automático (via backend Railway) ────────
async function enviarAlertasEmail(){
  const token = await getAdminToken();
  if(!token) return;
  try{
    await fetch(BACKEND_URL+'/admin/email/alertas-vencimento',{
      method:'POST', headers:{'x-admin-token':token,'Content-Type':'application/json'}
    });
    console.log('[Notif] Alertas de email disparados');
  }catch(e){ console.warn('[Notif] Erro email:', e.message); }
}

// ── FASE 3: Push Notifications ────────────────────────────
async function solicitarPermissaoNotificacoes(){
  if(!('Notification' in window)){
    alert('Seu navegador não suporta notificações. Instale o app para receber alertas.');
    return;
  }
  if(Notification.permission === 'granted'){
    const ativo = localStorage.getItem('fin_notif_ok') !== '0';
    if(ativo){
      // Estava ativo — desativa (o app para de disparar, sem precisar mexer na permissão do navegador)
      localStorage.setItem('fin_notif_ok','0');
    } else {
      // Estava desativado — reativa
      localStorage.setItem('fin_notif_ok','1');
      mostrarNotificacaoTeste();
      agendarNotificacoes();
    }
    atualizarStatusNotificacoesConfig();
    return;
  }
  if(Notification.permission === 'denied'){
    alert('Notificações bloqueadas. Acesse as configurações do navegador para permitir.');
    return;
  }
  const perm = await Notification.requestPermission();
  if(perm === 'granted'){
    localStorage.setItem('fin_notif_ok','1');
    mostrarNotificacaoTeste();
    agendarNotificacoes();
  }
  atualizarStatusNotificacoesConfig();
}

function mostrarNotificacaoTeste(){
  new Notification('FinRossi 🔔', {
    body: 'Notificações ativadas! Você será avisado sobre vencimentos.',
    icon: '/img/icon-192.png?v=3',
    badge: '/img/favicon-32.png?v=3'
  });
}

function agendarNotificacoes(){
  if(Notification.permission !== 'granted') return;
  if(localStorage.getItem('fin_notif_ok') === '0') return;
  const alertas = getVencimentosProximos(3);
  alertas.forEach(a=>{
    const msg = a.diasFaltam === 0
      ? `${a.nome} vence HOJE!`
      : a.diasFaltam === 1
      ? `${a.nome} vence amanhã (dia ${a.dia})`
      : `${a.nome} vence em ${a.diasFaltam} dias (dia ${a.dia})`;
    // Mostra imediatamente se há alertas urgentes
    if(a.diasFaltam <= 1){
      new Notification('FinRossi — Vencimento próximo 🔔', {
        body: msg + (a.val ? ` · ${fmtR(a.val)}` : ''),
        icon: '/img/icon-192.png?v=3',
        badge: '/img/favicon-32.png?v=3',
        tag: `venc-${a.nome}-${a.dia}`,
        renotify: false
      });
    }
  });
}

// Verifica e mostra notificações ao abrir o app
function iniciarSistemaNotificacoes(){
  // Fase 1: sempre mostra no dashboard
  renderAlertasVencimento();
  // Fase 3: push se permitido e ativado
  if(Notification.permission === 'granted' && localStorage.getItem('fin_notif_ok') !== '0'){
    agendarNotificacoes();
  }
  // Verifica a cada hora
  setInterval(()=>{
    renderAlertasVencimento();
    if(Notification.permission === 'granted' && localStorage.getItem('fin_notif_ok') !== '0') agendarNotificacoes();
  }, 3600000);
}

