// js/app/32-notificacoes.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ═══════════════════════════════════════════════════════════
// SISTEMA DE NOTIFICAÇÕES — FinRossi
// ═══════════════════════════════════════════════════════════

// Dias até a próxima ocorrência do dia do mês (0 = hoje). Dia 31 num mês de 30 dias cai no dia 30
// (antes pulava para o mês seguinte e o aviso não saía).
function _proximoVencimento(dia){
  dia = parseInt(dia, 10);
  if(!(dia >= 1 && dia <= 31)) return null;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const noMes = (ano, mes) => new Date(ano, mes, Math.min(dia, new Date(ano, mes + 1, 0).getDate()));
  let alvo = noMes(hoje.getFullYear(), hoje.getMonth());
  if(alvo < hoje) alvo = noMes(hoje.getFullYear(), hoje.getMonth() + 1);
  return { dias: Math.round((alvo - hoje) / 86400000), dia: alvo.getDate() };
}

// ── Calcula vencimentos próximos ──────────────────────────
function getVencimentosProximos(diasAlerta=3){
  const {assinaturas, recorrentes, cartoes} = pd();
  const alertas = [];
  const add = (tipo, nome, val, dia, cat) => {
    const v = _proximoVencimento(dia);
    if(v && v.dias <= diasAlerta) alertas.push({tipo, nome, val, dia:v.dia, diasFaltam:v.dias, cat});
  };
  (assinaturas||[]).filter(a=>a && a.status!=='pausada').forEach(a=>add('assinatura', a.nome, a.val, a.dia, a.cat));
  (recorrentes||[]).filter(Boolean).forEach(r=>add('recorrente', r.desc, r.val, r.dia, r.cat));
  (cartoes||[]).filter(c=>c && c.venc).forEach(c=>add('cartao', `Fatura ${c.nome}`, null, c.venc, 'Cartão'));
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

// ── FASE 3: Notificações do aparelho ──────────────────────
// • Saem pelo service worker (registration.showNotification): no Android e no app instalado o
//   "new Notification()" dá erro, e antes nenhuma notificação aparecia no celular.
// • No iPhone só existem com o app instalado na tela de início (iOS 16.4+). No Safari comum
//   "Notification" nem existe — antes o código quebrava ao ler Notification.permission.
// • Cada aviso sai uma vez por dia (antes repetia a cada abertura do app e a cada hora).
// • Por enquanto avisam quando o app é aberto (ou fica aberto). Com o app fechado precisa de push
//   do servidor — ver backlog.
const _notifSuportada = () => typeof window !== 'undefined' && 'Notification' in window;
const _notifLigada = () => _notifSuportada() && Notification.permission === 'granted' && localStorage.getItem('fin_notif_ok') !== '0';

async function _mostrarNotificacao(titulo, opcoes){
  const o = { icon:'/img/icon-192.png?v=5', lang:LOCALE, data:{ url:'/?entrar=1' }, ...(opcoes||{}) };
  try{
    if('serviceWorker' in navigator){
      const reg = await Promise.race([navigator.serviceWorker.getRegistration(), new Promise(r=>setTimeout(()=>r(null), 3000))]);
      if(reg && reg.showNotification){ await reg.showNotification(titulo, o); return true; }
    }
    new Notification(titulo, o);   // computador sem service worker (ex.: teste local)
    return true;
  }catch(e){ console.warn('[Notificações]', e && e.message); return false; }
}

async function solicitarPermissaoNotificacoes(){
  if(!_notifSuportada()){
    const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(iphone
      ? 'No iPhone, as notificações funcionam com o FinRossi instalado: toque em Compartilhar → "Adicionar à Tela de Início" e abra o app por lá.'
      : 'Este navegador não suporta notificações. Instale o app para receber alertas.');
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
  _mostrarNotificacao('FinRossi', { body:'Notificações ativadas! Você será avisado sobre vencimentos.', tag:'fin-teste' });
}

// Registro do que já foi avisado hoje (some sozinho no dia seguinte)
function _jaAvisadoHoje(tag){
  const hoje = new Date().toLocaleDateString('sv');   // AAAA-MM-DD no fuso do aparelho
  let reg = {};
  try{ reg = JSON.parse(localStorage.getItem('fin_notif_enviadas') || '{}') || {}; }catch(e){}
  for(const k in reg) if(reg[k] !== hoje) delete reg[k];
  if(reg[tag]){ return true; }
  reg[tag] = hoje;
  try{ localStorage.setItem('fin_notif_enviadas', JSON.stringify(reg)); }catch(e){}
  return false;
}

function agendarNotificacoes(){
  if(!_notifLigada()) return;
  if(typeof verComoPlanoPermite==='function' && !verComoPlanoPermite('assinaturas')) return;   // mesmo critério do card do dashboard
  getVencimentosProximos(1).forEach(a=>{
    const tag = `venc-${a.tipo}-${a.nome}-${a.dia}`;
    if(_jaAvisadoHoje(tag)) return;
    const msg = a.diasFaltam === 0 ? `${a.nome} vence hoje` : `${a.nome} vence amanhã (dia ${a.dia})`;
    // O aparelho não conseguiu mostrar: tira a marca de "avisado hoje" para tentar na próxima conferência
    _mostrarNotificacao('FinRossi: vencimento próximo', { body: msg + (a.val ? ` · ${fmtR(a.val)}` : ''), tag })
      .then(ok => { if(!ok) _desmarcarAvisado(tag); });
  });
}
function _desmarcarAvisado(tag){
  try{ const reg = JSON.parse(localStorage.getItem('fin_notif_enviadas') || '{}') || {}; delete reg[tag]; localStorage.setItem('fin_notif_enviadas', JSON.stringify(reg)); }catch(e){}
}

// ── Convite para ativar as notificações (clientes) ───────────────────────────
// Aparece a cada abertura do app até o cliente ativar, depois das boas-vindas e do passo a passo
// (perfil teste: a partir da primeira entrada com a própria senha; assinante: desde a primeira entrada).
// 1ª vez: "Ativar" ou "Lembrar depois". Da 2ª em diante também "Não perguntar mais" (encerra o convite).
// Estado: preferencias/notifConvite = nº de vezes adiado | 'nunca' | 'ativado' (vale em qualquer aparelho).
// Não aparece: equipe, quem já ativou ou desativou em Configurações, navegador bloqueado, aparelho sem
// suporte (iPhone sem o app instalado) e plano sem contas/assinaturas para avisar (Gratuito).
let _convNotifFeito = false;
const _convChave = () => 'fin_notif_convite_' + (window._firebaseUser?.uid || 'local');
function _convJanelaAberta(){
  if(typeof _pp !== 'undefined' && _pp) return true;   // passo a passo
  const bv = document.getElementById('tela-bemvindo'); if(bv && bv.style.display === 'flex') return true;
  if(['pa-primeiro-acesso', 'pa-criar-senha'].some(id => { const e = document.getElementById(id); return e && e.style.display !== 'none'; })) return true;
  return !!document.querySelector('.modal-overlay.open');
}
async function talvezConvidarNotificacoes(){
  if(_convNotifFeito) return;
  const role = window._userRole || (typeof _userRole !== 'undefined' ? _userRole : '');
  if(role !== 'cliente' || window._primeiroAcesso) return;
  if(typeof _verComoPlano !== 'undefined' && _verComoPlano) return;
  if(!_notifSuportada() || Notification.permission === 'denied') return;
  if(Notification.permission === 'granted' && localStorage.getItem('fin_notif_ok') !== null) return;   // ativou, ou desativou de propósito
  if(typeof verComoPlanoPermite === 'function' && !verComoPlanoPermite('assinaturas')) return;
  let estado = null;
  try{ estado = localStorage.getItem(_convChave()); }catch(e){}
  const u = window._firebaseUser;
  if(u && window._onValue && window._ref && window._db){
    const nuvem = await new Promise(res => {
      const t = setTimeout(() => res(undefined), 4000);
      try{ window._onValue(window._ref(window._db, `usuarios/${u.uid}/preferencias/notifConvite`), s => { clearTimeout(t); res(s.val()); }, () => { clearTimeout(t); res(undefined); }, { onlyOnce: true }); }
      catch(e){ clearTimeout(t); res(undefined); }
    });
    if(nuvem !== undefined && nuvem !== null) estado = String(nuvem);
  }
  if(estado === 'nunca' || estado === 'ativado') return;
  // Espera o passo a passo e outras janelas fecharem (até 3 min); não abre por cima de nada
  for(let i = 0; i < 180 && _convJanelaAberta(); i++) await new Promise(r => setTimeout(r, 1000));
  if(_convJanelaAberta() || _convNotifFeito) return;
  _convNotifFeito = true;
  _convMostrar(parseInt(estado, 10) || 0);
}
function _convGravar(v){
  try{ localStorage.setItem(_convChave(), String(v)); }catch(e){}
  if(typeof prefSalvar === 'function') prefSalvar('notifConvite', v);
}
function _convMostrar(adiado){
  let m = document.getElementById('notif-convite');
  if(!m){
    m = document.createElement('div');
    m.id = 'notif-convite'; m.className = 'modal-overlay';
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="fav-vidro conv-notif" role="dialog" aria-modal="true" aria-labelledby="conv-tit">
    <div class="conv-sino" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg></div>
    <h3 id="conv-tit">Ative as notificações</h3>
    <p>Avisamos no seu aparelho quando uma conta, assinatura ou fatura do cartão estiver para vencer, na véspera e no dia. Assim nada passa do prazo.</p>
    <div class="conv-acoes">
      <button type="button" class="btn primary" onclick="convNotifAtivar()">Ativar notificações</button>
      <button type="button" class="btn" onclick="convNotifDepois(${adiado})">Lembrar depois</button>
      ${adiado >= 1 ? '<button type="button" class="conv-nunca" onclick="convNotifNunca()">Não perguntar mais</button>' : ''}
    </div>
  </div>`;
  m.classList.add('open');
}
function _convFechar(){ const m = document.getElementById('notif-convite'); if(m) m.classList.remove('open'); }
async function convNotifAtivar(){
  _convFechar();
  if(_notifSuportada() && Notification.permission === 'granted'){
    // O aparelho já permitia: só liga no app (o botão de Configurações alterna e desligaria)
    localStorage.setItem('fin_notif_ok', '1'); mostrarNotificacaoTeste(); agendarNotificacoes();
    if(typeof atualizarStatusNotificacoesConfig === 'function') atualizarStatusNotificacoesConfig();
  } else await solicitarPermissaoNotificacoes();   // pede a permissão do aparelho (precisa ser no toque)
  if(_notifSuportada() && Notification.permission === 'granted') _convGravar('ativado');
  else if(_notifSuportada() && Notification.permission === 'denied') _convGravar('nunca');   // bloqueou no aparelho: não insiste
}
function convNotifDepois(adiado){ _convFechar(); _convGravar((adiado || 0) + 1); }
function convNotifNunca(){ _convFechar(); _convGravar('nunca'); }

// Verifica e mostra notificações ao abrir o app (chamada a cada login: um relógio só)
let _notifRelogio = null;
function iniciarSistemaNotificacoes(){
  renderAlertasVencimento();          // Fase 1: sempre mostra no dashboard
  agendarNotificacoes();              // Fase 3: se permitido e ativado
  if(_notifRelogio) clearInterval(_notifRelogio);
  _notifRelogio = setInterval(()=>{ renderAlertasVencimento(); agendarNotificacoes(); }, 3600000);
}
