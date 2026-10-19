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

  // Mesmo formato de extrato das outras listas: dia | conta | valor + quando vence
  const TIPO_NOME = { cartao:'Fatura do cartão', assinatura:'Assinatura', recorrente:'Conta recorrente' };
  const itens = alertas.map(a=>{
    const selo = a.diasFaltam === 0 ? '<span class="fr-selo alerta">Vence hoje</span>'
      : a.diasFaltam === 1 ? '<span class="fr-selo alerta">Vence amanhã</span>'
      : `<span class="fr-selo destaque">Em ${a.diasFaltam} dias</span>`;
    return `<div class="ext-linha" style="grid-template-columns:44px 1fr auto">
      <div class="ext-dia"><b>${String(a.dia).padStart(2,'0')}</b><span>dia</span></div>
      <div style="min-width:0"><div class="ext-tit">${escHTML(a.nome)}</div><div class="ext-meta">${escHTML(TIPO_NOME[a.tipo]||a.cat)}</div></div>
      <div class="ext-valor-col">${a.val?`<div class="ext-valor">${fmtR(a.val)}</div>`:''}${selo}</div>
    </div>`;
  }).join('');

  el.innerHTML=`<div class="card" style="margin-bottom:16px">
    <h3>Vencimentos próximos</h3>
    ${itens}
  </div>`;
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
  new Notification('FinRossi', {
    body: 'Notificações ativadas! Você será avisado sobre vencimentos.',
    icon: '/img/icon-192.png?v=4',
    badge: '/img/favicon-32.png?v=4'
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
      new Notification('FinRossi: vencimento próximo', {
        body: msg + (a.val ? ` · ${fmtR(a.val)}` : ''),
        icon: '/img/icon-192.png?v=4',
        badge: '/img/favicon-32.png?v=4',
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

