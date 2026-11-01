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
  const data = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`;
  return { dias: Math.round((alvo - hoje) / 86400000), dia: alvo.getDate(), data, mes: data.slice(0, 7) };
}

// ── Contas pagas ─────────────────────────────────────────────────────────────
// Recorrente/assinatura: paga = já tem o lançamento de despesa daquele vencimento (o mesmo formato do
// "Lançar do mês" de Contas recorrentes, então um nunca duplica o outro). Fatura do cartão: as compras já
// estão lançadas uma a uma; "Paguei" só marca a fatura do mês (cartoes[].faturasPagas[AAAA-MM]).
// A mesma regra está no servidor (backend/push.js), que não lembra conta paga.
function _dataNoMes(dia, mes){ const [a, m] = mes.split('-').map(Number); return `${mes}-${String(Math.min(dia, new Date(a, m, 0).getDate())).padStart(2, '0')}`; }
// Paga = tem o "Paguei" daquela conta naquele mês (vencRef), ou um lançamento dela com data que já chegou.
// Lançamento com data futura (ex.: "Lançar do mês") é só PREVISTO: o dinheiro ainda não saiu.
function _vencRef(tipo, id, mes){ return `${tipo}:${id}:${mes}`; }
function _lancDaConta(tipo, item, data){
  const nome = tipo === 'recorrente' ? item.desc : item.nome, marca = tipo === 'recorrente' ? 'recorrente' : 'assinatura';
  const lancs = pd().lancs || [], ref = _vencRef(tipo, item.id, data.slice(0, 7));
  return lancs.find(l => l.vencRef === ref) || lancs.find(l => l.tipo === 'despesa' && l[marca] && !l.vencRef && l.desc === nome && l.data === data) || null;
}
function _contaPaga(tipo, item, data){
  if(tipo === 'cartao') return !!(item.faturasPagas && item.faturasPagas[data.slice(0, 7)]);
  const l = _lancDaConta(tipo, item, data);
  return !!l && (!!l.vencRef || l.data <= hoje());
}

// ── Calcula vencimentos próximos (só as contas ainda não pagas) ───────────────
function getVencimentosProximos(diasAlerta=3){
  const {assinaturas, recorrentes, cartoes} = pd();
  const alertas = [];
  const add = (tipo, item, nome, val, dia, cat) => {
    const v = _proximoVencimento(dia);
    if(v && v.dias <= diasAlerta && !_contaPaga(tipo, item, v.data)) alertas.push({tipo, id:item.id, nome, val, dia:v.dia, diasFaltam:v.dias, cat, data:v.data, mes:v.mes});
  };
  (assinaturas||[]).filter(a=>a && a.status!=='pausada').forEach(a=>add('assinatura', a, a.nome, a.val, a.dia, a.cat));
  (recorrentes||[]).filter(Boolean).forEach(r=>add('recorrente', r, r.desc, r.val, r.dia, r.cat));
  (cartoes||[]).filter(c=>c && c.venc).forEach(c=>add('cartao', c, `Fatura ${c.nome}`, null, c.venc, 'Cartão'));
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
      <div class="ext-valor-col">${a.val?`<div class="ext-valor">${fmtR(a.val)}</div>`:''}${selo}
        <button type="button" class="venc-paguei" onclick="registrarPagamentoVenc('${a.tipo}','${escHTML(a.id)}','${a.mes}')">Paguei</button></div>
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
// • Com o app FECHADO quem avisa é o servidor (push, backend/push.js): o aparelho se inscreve ao ativar
//   (_ativarPush). Com o push ligado neste aparelho, as notificações locais abaixo não saem (não duplica).
// • Toque na notificação de vencimento: "Paguei" lança o pagamento; o texto abre "Paguei / Vou pagar".
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
      _desativarPush();
    } else {
      // Estava desativado — reativa
      localStorage.setItem('fin_notif_ok','1');
      mostrarNotificacaoTeste();
      _ativarPush().then(() => agendarNotificacoes());
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
    await _ativarPush();
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

const NOTIF_DIAS_ANTES = 2;   // começa a lembrar 2 dias antes do vencimento (01/11/2026)
function agendarNotificacoes(){
  if(!_notifLigada()) return;
  if(localStorage.getItem('fin_push_ok') === '1') return;   // o servidor já avisa este aparelho (push): não duplica
  if(typeof verComoPlanoPermite==='function' && !verComoPlanoPermite('assinaturas')) return;   // mesmo critério do card do dashboard
  // Lembra 2 dias antes, na véspera e no dia (uma vez em cada um desses dias)
  const en = typeof IDIOMA !== 'undefined' && IDIOMA === 'en';
  getVencimentosProximos(NOTIF_DIAS_ANTES).forEach(a=>{
    const tag = `venc-${a.tipo}-${a.id}-${a.data}-${a.diasFaltam}`;
    if(_jaAvisadoHoje(tag)) return;
    const msg = en
      ? (a.diasFaltam === 0 ? `${a.nome} is due today` : a.diasFaltam === 1 ? `${a.nome} is due tomorrow (${a.dia})` : `${a.nome} is due in ${a.diasFaltam} days (${a.dia})`)
      : (a.diasFaltam === 0 ? `${a.nome} vence hoje` : a.diasFaltam === 1 ? `${a.nome} vence amanhã (dia ${a.dia})` : `${a.nome} vence em ${a.diasFaltam} dias (dia ${a.dia})`);
    const venc = { tipo: a.tipo, id: a.id, mes: a.mes };
    // O aparelho não conseguiu mostrar: tira a marca de "avisado hoje" para tentar na próxima conferência
    _mostrarNotificacao(en ? 'FinRossi: bill due soon' : 'FinRossi: vencimento próximo', {
      body: msg + (a.val ? ` · ${fmtR(a.val)}` : ''), tag: `venc-${a.tipo}-${a.id}-${a.data}`, data: { url: '/?entrar=1', venc },
      actions: [{ action: 'paguei', title: en ? 'Paid' : 'Paguei' }, { action: 'depois', title: en ? 'Will pay' : 'Vou pagar' }],
    }).then(ok => { if(!ok) _desmarcarAvisado(tag); });
  });
}
function _desmarcarAvisado(tag){
  try{ const reg = JSON.parse(localStorage.getItem('fin_notif_enviadas') || '{}') || {}; delete reg[tag]; localStorage.setItem('fin_notif_enviadas', JSON.stringify(reg)); }catch(e){}
}

// ── Push: avisos com o app fechado (o servidor envia; backend/push.js) ─────────
// Só clientes. O aparelho se inscreve ao ativar as notificações e de novo a cada entrada (se o navegador
// trocar a inscrição, o servidor recebe a nova). Desativar em Configurações cancela a inscrição.
const _b64ParaBytes = s => { const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function _ativarPush(){
  try{
    const role = window._userRole || (typeof _userRole !== 'undefined' ? _userRole : '');
    const u = window._firebaseUser;
    if(role !== 'cliente' || !u || !_notifLigada() || !('serviceWorker' in navigator) || typeof fetchBackend !== 'function') return false;
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 5000))]);
    if(!reg || !reg.pushManager) return false;
    let sub = await reg.pushManager.getSubscription();
    if(!sub){
      const { publicKey } = await (await fetchBackend(`${BACKEND_URL}/push/chave`)).json();
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: _b64ParaBytes(publicKey) });
    }
    let fuso = ''; try{ fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }catch(e){}
    const res = await fetchBackend(`${BACKEND_URL}/push/inscrever`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, body: JSON.stringify({ sub: sub.toJSON(), fuso }) });
    if(!res.ok) throw new Error('servidor ' + res.status);
    localStorage.setItem('fin_push_ok', '1');
    return true;
  }catch(e){ console.warn('[Push] não ativou:', e && e.message); localStorage.removeItem('fin_push_ok'); return false; }
}
async function _desativarPush(){
  localStorage.removeItem('fin_push_ok');
  try{
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    const sub = reg && reg.pushManager ? await reg.pushManager.getSubscription() : null;
    if(!sub) return;
    const u = window._firebaseUser;
    if(u && typeof fetchBackend === 'function') await fetchBackend(`${BACKEND_URL}/push/sair`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe();
  }catch(e){}
}

// ── "Paguei" / "Vou pagar" (notificação, card do dashboard) ────────────────────
// Recorrente → despesa na categoria dela; assinatura → despesa "Assinaturas". Entra com a data de HOJE
// (o dia em que o dinheiro saiu) e a marca vencRef da conta/mês, para o "Lançar do mês" não lançar de novo.
// Se a conta já estava prevista (lançada com data futura), só passa a data dela para hoje.
// Fatura do cartão → só marca a fatura (as compras já estão lançadas).
function _itemVenc(tipo, id){
  const lista = tipo === 'recorrente' ? pd().recorrentes : tipo === 'assinatura' ? pd().assinaturas : tipo === 'cartao' ? pd().cartoes : null;
  return (lista || []).find(x => x && x.id === id) || null;
}
async function registrarPagamentoVenc(tipo, id, mes){
  const item = _itemVenc(tipo, id);
  if(!item){ _avisoVenc('Não encontramos essa conta. Ela pode ter sido apagada.', 'err'); return false; }
  const dia = tipo === 'cartao' ? item.venc : item.dia;
  const data = _dataNoMes(dia, mes || hoje().slice(0, 7));
  const nome = tipo === 'recorrente' ? item.desc : tipo === 'assinatura' ? item.nome : `Fatura ${item.nome}`;
  if(_contaPaga(tipo, item, data)){ _avisoVenc(`${nome} já estava marcada como paga.`, 'ok'); return true; }
  if(tipo === 'cartao'){
    item.faturasPagas = { ...(item.faturasPagas || {}), [data.slice(0, 7)]: hoje() };
    if(typeof saveCartoes === 'function') await saveCartoes(); else await saveCollection('cartoes');
    _avisoVenc(`${nome} marcada como paga. As compras do cartão já estão nos seus lançamentos.`, 'ok');
  } else {
    // O dinheiro saiu HOJE (mesmo que o vencimento seja depois): a despesa entra com a data de hoje.
    const ref = _vencRef(tipo, item.id, data.slice(0, 7));
    const previsto = _lancDaConta(tipo, item, data);   // já lançada com data futura ("Lançar do mês")
    if(previsto){
      const antes = { data: previsto.data, obs: previsto.obs };
      previsto.data = hoje(); previsto.vencRef = ref; previsto.obs = (previsto.obs ? previsto.obs + ' · ' : '') + 'pago antes do vencimento';
      await saveCollection('lancs');
      _avisoVenc(`Pronto! ${nome} (${fmtR(previsto.val)}) foi paga hoje e saiu do seu saldo.`, 'ok', async () => {
        previsto.data = antes.data; previsto.obs = antes.obs; delete previsto.vencRef;
        await saveCollection('lancs'); try{ refreshAll(); }catch(e){} _avisoVenc('Pagamento desfeito.', 'ok');
      });
    } else {
      const base = { id: uid(), tipo: 'despesa', val: item.val, data: hoje(), vencRef: ref };
      const lanc = tipo === 'recorrente'
        ? { ...base, desc: item.desc, cat: item.cat || 'Outros', obs: `Conta do dia ${String(dia).padStart(2, '0')} · paga pelo FinRossi`, recorrente: true }
        : { ...base, desc: item.nome, cat: 'Assinaturas', obs: `Assinatura do dia ${String(dia).padStart(2, '0')} · paga pelo FinRossi`, assinatura: true };
      pd().lancs.push(lanc);
      await saveCollection('lancs');
      _avisoVenc(`Pronto! ${nome} (${fmtR(item.val)}) foi lançada como despesa de hoje.`, 'ok', () => desfazerPagamentoVenc(lanc.id));
    }
  }
  try{ refreshAll(); }catch(e){}
  return true;
}
async function desfazerPagamentoVenc(lancId){
  pd().lancs = (pd().lancs || []).filter(l => l.id !== lancId);
  await saveCollection('lancs');
  try{ refreshAll(); }catch(e){}
  _avisoVenc('Lançamento desfeito.', 'ok');
}
// Aviso curto no rodapé (com "Desfazer" quando dá)
function _avisoVenc(texto, tipo, desfazer){
  let el = document.getElementById('venc-aviso');
  if(!el){ el = document.createElement('div'); el.id = 'venc-aviso'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.className = 'venc-aviso ' + (tipo === 'err' ? 'err' : 'ok');
  el.innerHTML = `<span>${escHTML(texto)}</span>${desfazer ? '<button type="button">Desfazer</button>' : ''}`;
  if(desfazer) el.querySelector('button').onclick = () => { el.classList.remove('on'); desfazer(); };
  requestAnimationFrame(() => el.classList.add('on'));
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), desfazer ? 8000 : 5000);
}
// Janela "Paguei / Vou pagar" (toque no texto da notificação; no iPhone a notificação não tem botões)
function abrirPerguntaVenc(tipo, id, mes){
  const item = _itemVenc(tipo, id); if(!item) return;
  const dia = tipo === 'cartao' ? item.venc : item.dia, data = _dataNoMes(dia, mes);
  const nome = tipo === 'recorrente' ? item.desc : tipo === 'assinatura' ? item.nome : `Fatura ${item.nome}`;
  if(_contaPaga(tipo, item, data)){ _avisoVenc(`${nome} já está paga.`, 'ok'); return; }
  const dias = Math.round((new Date(data + 'T00:00:00') - new Date(hoje() + 'T00:00:00')) / 864e5);
  const quando = dias <= 0 ? (dias === 0 ? 'Vence hoje' : 'Venceu') : dias === 1 ? 'Vence amanhã' : `Vence em ${dias} dias`;
  let m = document.getElementById('venc-pergunta');
  if(!m){ m = document.createElement('div'); m.id = 'venc-pergunta'; m.className = 'modal-overlay'; m.addEventListener('click', e => { if(e.target === m) m.classList.remove('open'); }); document.body.appendChild(m); }
  m.innerHTML = `<div class="fav-vidro conv-notif" role="dialog" aria-modal="true" aria-labelledby="vp-tit">
    <div class="conv-sino" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg></div>
    <h3 id="vp-tit">${escHTML(nome)}</h3>
    <p>${quando}, dia ${String(new Date(data + 'T00:00:00').getDate()).padStart(2, '0')}${item.val && tipo !== 'cartao' ? ` · <b style="color:var(--text)">${fmtR(item.val)}</b>` : ''}</p>
    <div class="conv-acoes">
      <button type="button" class="btn primary" id="vp-paguei">Paguei</button>
      <button type="button" class="btn" onclick="document.getElementById('venc-pergunta').classList.remove('open')">Vou pagar</button>
    </div>
    <p style="font-size:12px">${tipo === 'cartao' ? 'Marca a fatura deste mês como paga (as compras do cartão já estão nos seus lançamentos).' : 'Lança a despesa automaticamente, com a data do vencimento.'}</p>
  </div>`;
  m.querySelector('#vp-paguei').onclick = () => { m.classList.remove('open'); registrarPagamentoVenc(tipo, id, mes); };
  m.classList.add('open');
}
// Veio de uma notificação: ?venc=tipo:id:AAAA-MM&acao=paguei|perguntar (app fechado) ou mensagem do SW (app aberto).
// Espera os dados chegarem da nuvem (até 20 s) antes de procurar a conta.
async function tratarVencNotificacao(venc, acao){
  if(!venc || !venc.tipo || !venc.id) return;
  for(let i = 0; i < 40 && !_itemVenc(venc.tipo, venc.id); i++) await new Promise(r => setTimeout(r, 500));
  if(acao === 'paguei') registrarPagamentoVenc(venc.tipo, venc.id, venc.mes);
  else abrirPerguntaVenc(venc.tipo, venc.id, venc.mes);
}
function vencDaUrl(){
  try{
    const q = new URLSearchParams(location.search), v = q.get('venc');
    if(!v) return null;
    const [tipo, id, mes] = v.split(':');
    history.replaceState(null, '', location.pathname);   // não repete ao recarregar
    if(!['recorrente', 'assinatura', 'cartao'].includes(tipo) || !id || !/^\d{4}-\d{2}$/.test(mes || '')) return null;
    return { venc: { tipo, id, mes }, acao: q.get('acao') === 'paguei' ? 'paguei' : 'perguntar' };
  }catch(e){ return null; }
}
// Lido já no carregamento: depois do login o app limpa o endereço (js/firebase-init.js)
let _vencPendente = vencDaUrl();
// Chamado quando o app aparece (js/firebase-init.js); true = havia uma conta da notificação para tratar
function talvezTratarVencPendente(){
  if(!_vencPendente) return false;
  const p = _vencPendente; _vencPendente = null;
  tratarVencNotificacao(p.venc, p.acao);
  return true;
}
if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => {
  if(e.data && e.data.tipo === 'venc') tratarVencNotificacao(e.data.venc, e.data.acao);
});

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
    <p>Avisamos no seu aparelho quando uma conta, assinatura ou fatura do cartão estiver para vencer: 2 dias antes, na véspera e no dia. Assim nada passa do prazo.</p>
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
    localStorage.setItem('fin_notif_ok', '1'); mostrarNotificacaoTeste(); _ativarPush().then(() => agendarNotificacoes());
    if(typeof atualizarStatusNotificacoesConfig === 'function') atualizarStatusNotificacoesConfig();
  } else await solicitarPermissaoNotificacoes();   // pede a permissão do aparelho (precisa ser no toque)
  if(_notifSuportada() && Notification.permission === 'granted') _convGravar('ativado');
  else if(_notifSuportada() && Notification.permission === 'denied') _convGravar('nunca');   // bloqueou no aparelho: não insiste
}
function convNotifDepois(adiado){ _convFechar(); _convGravar((adiado || 0) + 1); }
function convNotifNunca(){ _convFechar(); _convGravar('nunca'); }

// ── Lembretes pelo WhatsApp: aceite do cliente (Configurações → Notificações) ──────────
// O texto aceito, a versão, o número, a data, o aparelho e o IP ficam guardados no servidor a cada aceite
// ou cancelamento (backend/whatsapp.js → consentimentos/<uid>/whatsapp). Os lembretes só saem depois que
// o FinRossi tiver o número na Meta e o cliente confirmar o número respondendo SIM.
let _whatsInfo = null;
async function _whatsApi(metodo, corpo){
  const u = window._firebaseUser;
  if(!u || typeof fetchBackend !== 'function') throw new Error('Entre na sua conta.');
  const res = await fetchBackend(`${BACKEND_URL}/whatsapp/consentimento`, { method: metodo, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, ...(corpo ? { body: JSON.stringify(corpo) } : {}) });
  const d = await res.json().catch(() => ({}));
  if(!res.ok) throw new Error(d.erro || 'Não deu agora. Tente de novo em instantes.');
  return d;
}
const _whatsTelTela = t => { const d = String(t || '').replace(/\D/g, ''); return d.startsWith('55') ? d.slice(2) : d.startsWith('61') ? '0' + d.slice(2) : d; };
async function renderWhatsConfig(){
  const box = document.getElementById('cfg-whats'); if(!box) return;
  const role = window._userRole || (typeof _userRole !== 'undefined' ? _userRole : '');
  if(role !== 'cliente'){ box.style.display = 'none'; return; }
  box.style.display = '';
  const st = document.getElementById('cfg-whats-status'), btn = document.getElementById('cfg-whats-btn'), info = document.getElementById('cfg-whats-info');
  try{ _whatsInfo = await _whatsApi('GET'); }catch(e){ st.textContent = 'Indisponível'; btn.style.display = 'none'; return; }
  const w = _whatsInfo, pintar = (txt, verde) => { st.textContent = txt; st.style.background = verde ? 'rgba(74,222,128,.1)' : 'var(--surface3)'; st.style.color = verde ? 'var(--green)' : 'var(--muted)'; };
  btn.style.display = '';
  // Plano sem contas para lembrar (Gratuito, Essencial ou pagamento pendente): mostra o plano que libera
  if(w.planoPermite === false){
    pintar(w.aceito ? 'Pausado' : 'Evolução e Patrimônio', false);
    info.style.display = '';
    info.textContent = w.aceito
      ? 'Seu plano atual não tem contas recorrentes, assinaturas e cartões, então os lembretes estão pausados.'
      : 'Os lembretes pelo WhatsApp avisam das contas recorrentes, assinaturas e faturas de cartão, que fazem parte dos planos Evolução e Patrimônio.';
    btn.textContent = w.aceito ? 'Não quero mais pelo WhatsApp' : 'Ver planos';
    btn.style.background = w.aceito ? 'var(--surface3)' : 'var(--accent)'; btn.style.color = w.aceito ? 'var(--text)' : '#0f0f0f';
    btn.onclick = w.aceito ? cancelarAceiteWhats : () => { if(typeof fecharConfiguracoes === 'function') fecharConfiguracoes(); if(typeof mostrarPlanoNecessario === 'function') mostrarPlanoNecessario('recorrentes'); };
    return;
  }
  if(w.aceito){
    pintar(w.canalAtivo && w.confirmadoEm ? 'Ativo' : 'Aceito', true);
    const tel = typeof ncMascaraTelefone === 'function' && !String(w.telefone).startsWith('61') ? (() => { const e = { value: _whatsTelTela(w.telefone) }; ncMascaraTelefone(e); return e.value; })() : _whatsTelTela(w.telefone);
    info.style.display = '';
    info.textContent = `Você aceitou em ${new Date(w.aceitoEm).toLocaleDateString(LOCALE)} · número ${tel}. `
      + (!w.canalAtivo ? 'Os lembretes começam assim que o WhatsApp do FinRossi estiver no ar.' : w.confirmadoEm ? 'Lembretes ligados.' : 'Para começar, responda SIM na mensagem que enviamos no WhatsApp.');
    btn.textContent = 'Não quero mais pelo WhatsApp';
    btn.style.background = 'var(--surface3)'; btn.style.color = 'var(--text)';
    btn.onclick = cancelarAceiteWhats;
  } else {
    pintar('Desativado', false);
    info.style.display = 'none';
    btn.textContent = 'Quero receber pelo WhatsApp';
    btn.style.background = 'var(--accent)'; btn.style.color = '#0f0f0f';
    btn.onclick = abrirAceiteWhats;
  }
}
// Janela de aceite: mostra o texto inteiro, o número (pode corrigir) e só libera com "Li e aceito"
async function abrirAceiteWhats(){
  try{ if(!_whatsInfo) _whatsInfo = await _whatsApi('GET'); }catch(e){ alert(e.message); return; }
  const w = _whatsInfo, aud = typeof MOEDA !== 'undefined' && MOEDA === 'AUD';
  let m = document.getElementById('whats-aceite');
  if(!m){ m = document.createElement('div'); m.id = 'whats-aceite'; m.className = 'modal-overlay'; m.addEventListener('click', e => { if(e.target === m) m.classList.remove('open'); }); document.body.appendChild(m); }
  m.innerHTML = `<div class="fav-vidro whats-aceite" role="dialog" aria-modal="true" aria-labelledby="wa-tit">
    <div class="fav-topo"><div><h3 id="wa-tit">Lembretes pelo WhatsApp</h3><p>Receba o aviso das suas contas no WhatsApp e responda Paguei para lançar na hora.</p></div>
      <button type="button" class="fav-fechar" onclick="document.getElementById('whats-aceite').classList.remove('open')" aria-label="Fechar">✕</button></div>
    <div class="field" style="margin:0"><label for="wa-tel">Seu WhatsApp</label>
      <input id="wa-tel" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" placeholder="${aud ? '0412 345 678' : '(11) 98765-4321'}" oninput="${aud ? '' : 'ncMascaraTelefone(this)'}"></div>
    <div class="wa-texto">${escHTML(w.texto)}</div>
    <label class="wa-check"><input type="checkbox" id="wa-ok" onchange="document.getElementById('wa-aceitar').disabled=!this.checked"> <span>Li e aceito receber os lembretes pelo WhatsApp</span></label>
    <div class="msg" id="msg-wa" style="margin:0;min-height:0"></div>
    <div class="fav-acoes"><span style="flex:1"></span>
      <button type="button" class="btn sm" onclick="document.getElementById('whats-aceite').classList.remove('open')">Agora não</button>
      <button type="button" class="btn primary sm" id="wa-aceitar" disabled onclick="confirmarAceiteWhats()">Aceitar</button></div>
  </div>`;
  const tel = document.getElementById('wa-tel');
  tel.value = _whatsTelTela(w.telefone);
  if(!aud && tel.value && typeof ncMascaraTelefone === 'function') ncMascaraTelefone(tel);
  m.classList.add('open');
}
async function confirmarAceiteWhats(){
  const btn = document.getElementById('wa-aceitar');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try{
    let fuso = ''; try{ fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }catch(e){}
    await _whatsApi('POST', { aceito: true, telefone: document.getElementById('wa-tel').value, versao: _whatsInfo.versao, fuso });
    document.getElementById('whats-aceite').classList.remove('open');
    _whatsInfo = null; renderWhatsConfig();
    _avisoVenc('Pronto! Seu aceite foi registrado.', 'ok');
  }catch(e){ showMsg('msg-wa', e.message, 'err'); btn.disabled = false; btn.textContent = 'Aceitar'; }
}
async function cancelarAceiteWhats(){
  if(!confirm('Parar de receber os lembretes pelo WhatsApp?')) return;
  try{ await _whatsApi('POST', { aceito: false }); _whatsInfo = null; renderWhatsConfig(); _avisoVenc('Pronto, os lembretes pelo WhatsApp foram cancelados.', 'ok'); }
  catch(e){ alert(e.message); }
}

// Verifica e mostra notificações ao abrir o app (chamada a cada login: um relógio só)
let _notifRelogio = null;
function iniciarSistemaNotificacoes(){
  renderAlertasVencimento();          // Fase 1: sempre mostra no dashboard
  if(_notifLigada()) _ativarPush();   // renova a inscrição do push deste aparelho (o servidor avisa com o app fechado)
  agendarNotificacoes();              // Fase 3: se permitido e ativado
  if(_notifRelogio) clearInterval(_notifRelogio);
  _notifRelogio = setInterval(()=>{ renderAlertasVencimento(); agendarNotificacoes(); }, 3600000);
}
