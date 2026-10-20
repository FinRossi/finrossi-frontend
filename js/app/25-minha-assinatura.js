// js/app/25-minha-assinatura.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── MINHA ASSINATURA (cliente) ───────────────────────────────────────────────
async function renderMinhaAssinatura(){
  const el = document.getElementById('assinatura-content');
  if(!el) return;

  el.innerHTML='<p class="empty">Carregando sua assinatura…</p>';

  const uid = window._firebaseUser?.uid;
  if(!uid){ el.innerHTML='<p class="empty">Entre na sua conta para ver a assinatura.</p>'; return; }

  // Busca dados do usuário no Firebase — com timeout de segurança,
  // pra nunca travar em "Carregando..." caso o Firebase não responda
  let dadosUsuario = null;
  try{
    if(window._db && window._ref && window._onValue){
      dadosUsuario = await new Promise((res,rej)=>{
        const timeoutId = setTimeout(()=>rej(new Error('timeout')), 5000);
        window._onValue(window._ref(window._db,`usuarios/${uid}`), snap=>{
          clearTimeout(timeoutId);
          res(snap.val());
        }, {onlyOnce:true});
      });
    }
  }catch(e){ console.warn('renderMinhaAssinatura:', e); }

  // "Ver como" mostra o plano simulado
  const planoSimulado = (typeof _verComoPlano!=='undefined' && _verComoPlano) || null;
  const plano   = planoSimulado || dadosUsuario?.plano || _userPlano || 'gratuito';
  const status  = dadosUsuario?.status || (plano==='gratuito' ? 'trial' : 'ativo');
  const origem  = dadosUsuario?.origem || 'trial';
  const dataCad = dadosUsuario?.dataCadastro ? dadosUsuario.dataCadastro.slice(0,10).split('-').reverse().join('/') : '—';
  const trialFim = dadosUsuario?.trialFim?.slice(0,10);
  const cfg = (typeof PLANOS_CONFIG!=='undefined' && PLANOS_CONFIG[plano]) || { label: plano, preco: '', limites: {} };
  const lim = cfg.limites || {};

  const STATUS = {
    ativo:   '<span class="fr-selo ok">Ativa</span>',
    trial:   '<span class="fr-selo destaque">Período de teste</span>',
    inativo: '<span class="fr-selo alerta">Inativa</span>',
    pendente: '<span class="fr-selo alerta">Aguardando pagamento</span>',
  };
  const ORIGEM = { pagante: 'Assinatura paga', trial: 'Período de teste' };
  const esc = escHTML;

  // Dias restantes no período de teste
  let aviso = '';
  if(status==='trial' && trialFim){
    const dias = Math.ceil((new Date(trialFim)-new Date()) / 86400000);
    aviso = dias > 0
      ? `<div class="ma-aviso">Faltam ${dias} ${dias===1?'dia':'dias'} do período de teste.</div>`
      : `<div class="ma-aviso alerta">O período de teste terminou. Escolha um plano para continuar usando tudo.</div>`;
  }

  // O que o plano inclui — lido das regras dos planos (sempre igual ao que o app libera)
  const RECURSOS = [
    ['Lançamentos', lim.lancamentos===true ? 'ilimitados' : (lim.lancamentos ? `até ${lim.lancamentos}` : false)],
    ['Investimentos', !!lim.investimentos],
    ['Metas e objetivos', !!lim.metas],
    ['Cartões de crédito', !!lim.cartoes],
    ['Assinaturas e contas recorrentes', !!lim.assinaturas],
    ['Calendário financeiro e notas', !!lim.calendario],
    ['Calculadora de renda passiva', !!lim.renda],
    ['Saúde do patrimônio', !!lim.score],
    ['Relatórios semanais e mensais em PDF', !!lim.relatorios],
    ['Lançar por foto e anexos', !!lim.foto],
    ['App personalizável', !!lim.personalizacao],
    ['Sessão mensal com o consultor e atendimento prioritário', plano==='patrimonio'],
  ];
  const ICO_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

  const pago = plano!=='gratuito' && origem==='pagante';
  const nome = window._firebaseUser?.displayName || localStorage.getItem('fin_nome_display') || '—';
  const email = window._firebaseUser?.email || '';
  const ehEquipe = typeof isEquipe === 'function' && isEquipe();
  // Situação da assinatura (gravada pelo servidor): troca aguardando pagamento ou cancelamento marcado
  const dataBR = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
  const solicitado = !planoSimulado && dadosUsuario?.planoSolicitado;
  const planoAte = !planoSimulado && dadosUsuario?.planoAte;
  _maSituacao = { plano, periodo: dadosUsuario?.periodo || 'mensal', pago, status };
  let avisoAssinatura = '';
  if(solicitado){
    const cfgS = (typeof PLANOS_CONFIG!=='undefined' && PLANOS_CONFIG[solicitado]) || { label: solicitado };
    avisoAssinatura = `<div class="card card-full ma-situacao" style="margin-bottom:16px"><b>Plano ${esc(cfgS.label)} ${dadosUsuario.periodoSolicitado==='anual'?'anual':'mensal'} aguardando pagamento.</b>
      <span>Assim que o pagamento for confirmado, ele é liberado na hora. Se já pagou, pode levar alguns minutos.</span>
      <div class="btn-row"><button class="btn primary sm" type="button" onclick="abrirEscolhaPlano('${esc(solicitado)}')">Ver forma de pagamento</button></div></div>`;
  } else if(planoAte){
    avisoAssinatura = `<div class="card card-full ma-situacao" style="margin-bottom:16px"><b>Assinatura cancelada.</b>
      <span>Seu plano ${esc(cfg.label)} continua liberado até ${dataBR(planoAte)}. Depois disso a conta volta ao Gratuito, sem apagar nada. Mudou de ideia? É só assinar de novo.</span></div>`;
  }

  el.innerHTML = `
    <div class="ced-painel" style="margin-bottom:16px"><div class="ced-painel-int ma-painel">
      <div class="ced-rotulo">Plano atual</div>
      <div class="ma-plano">${esc(cfg.label)}</div>
      <div class="ma-linha">${cfg.preco?`<span class="ma-preco">${esc(cfg.preco)}</span>`:''}${STATUS[status]||STATUS.inativo}</div>
      ${cfg.desc?`<p class="ma-desc">${esc(cfg.desc)}</p>`:''}
      ${aviso}
    </div></div>
    ${avisoAssinatura}

    <div class="grid2" style="margin-bottom:16px">
      <div class="card">
        <h3>Sua conta</h3>
        <div class="fr-dados">
          <div><span>Nome</span><b>${esc(nome)}</b></div>
          <div><span>E-mail</span><b>${esc(email||'—')}</b></div>
          <div><span>Cliente desde</span><b>${dataCad}</b></div>
          <div><span>Forma de acesso</span><b>${ORIGEM[origem]||'Teste gratuito'}</b></div>
        </div>
      </div>
      <div class="card">
        <h3>O que o seu plano inclui</h3>
        <ul class="ma-recursos">
          ${RECURSOS.map(([rotulo, ok]) => `<li class="${ok?'':'fora'}">${ok?ICO_OK:'<i></i>'}<span>${rotulo}${typeof ok==='string'?`<small>, ${ok}</small>`:''}</span></li>`).join('')}
        </ul>
        <p class="fr-card-sub" style="margin:12px 0 0">Seus dados ficam na sua conta. Ao mudar de plano, nada é apagado: o que não fizer parte do novo plano só fica bloqueado e volta a aparecer quando o recurso for liberado.</p>
      </div>
    </div>

    ${ehEquipe && !planoSimulado ? '' : `
    <div class="card card-full" style="margin-bottom:16px">
      <h3>${pago ? 'Mudar de plano' : 'Escolha seu plano'}</h3>
      <p class="fr-card-sub" style="margin:-6px 0 14px">${pago ? 'Troque quando quiser. O plano novo começa assim que o pagamento for confirmado.' : 'Assine aqui mesmo, na sua conta. Seus dados continuam todos com você.'}</p>
      <div class="ma-planos">
        ${MA_PLANOS.map(p => {
          const atual = pago && p.id === plano;
          return `<div class="ma-plano-card${atual ? ' atual' : ''}${p.id==='evolucao' ? ' destaque' : ''}">
            <div class="ma-plano-nome">${p.nome}${p.id==='evolucao' ? ' <span class="fr-selo destaque">mais escolhido</span>' : ''}</div>
            <div class="ma-plano-preco">${fmtR(MA_PRECO.mensal[p.id])}<small>/mês</small></div>
            <div class="ma-plano-desc">${p.desc}</div>
            <button class="btn ${atual ? '' : 'primary'} sm" type="button" ${atual ? 'disabled' : ''} onclick="abrirEscolhaPlano('${p.id}')">${atual ? 'Seu plano' : pago ? 'Mudar para este' : 'Assinar'}</button>
          </div>`;
        }).join('')}
      </div>
    </div>`}

    <div class="card card-full">
      <h3>Ajuda e documentos</h3>
      <div class="btn-row" style="flex-wrap:wrap">
        <a href="mailto:finrossiapp@gmail.com?subject=${encodeURIComponent('Suporte FinRossi')}" class="btn" style="text-decoration:none">Enviar e-mail ao suporte</a>
        ${plano==='patrimonio'?`<a href="mailto:finrossiapp@gmail.com?subject=${encodeURIComponent('Agendar sessão FinRossi')}" class="btn primary" style="text-decoration:none">Agendar sessão</a>`:''}
        <a href="landing/legal/termos.html" target="_blank" rel="noopener" class="btn" style="text-decoration:none">Termos de uso</a>
        <a href="landing/legal/privacidade.html" target="_blank" rel="noopener" class="btn" style="text-decoration:none">Privacidade</a>
        <a href="landing/legal/contrato.html" target="_blank" rel="noopener" class="btn" style="text-decoration:none">Contrato</a>
      </div>
      ${(pago && !planoAte && !planoSimulado) || (status==='pendente' && !planoSimulado) ?`<div class="ma-cancelar">
        <div><b>Cancelar assinatura</b><span>${status==='pendente' ? 'Desfaz a assinatura que ainda não foi paga.' : 'Para de cobrar. Seu plano continua liberado até o fim do período já pago, e nada é apagado.'}</span></div>
        <button class="btn danger" type="button" id="btn-ma-cancelar" onclick="cancelarMinhaAssinatura()">Cancelar assinatura</button>
      </div>`:''}
    </div>
  `;
}

// ─── ASSINAR / TROCAR DE PLANO / CANCELAR (dentro do app) ────────────────────
// Quem já tem conta assina aqui (antes o "Ver planos" levava ao cadastro da landing, que cria conta
// nova e dava "Email já cadastrado"). O servidor (/minha-assinatura) confere o login, calcula o preço,
// valida o cupom e devolve o link da fatura ou o Pix. O plano novo vale quando o pagamento é confirmado.
const MA_PLANOS = [
  { id: 'essencial',  nome: 'Essencial',  desc: 'Lançamentos ilimitados e investimentos.' },
  { id: 'evolucao',   nome: 'Evolução',   desc: 'Metas, cartões, contas fixas, calendário e renda passiva.' },
  { id: 'patrimonio', nome: 'Patrimônio', desc: 'Tudo do Evolução + relatórios, saúde do patrimônio e lançar por foto.' },
];
const MA_PRECO = { mensal: { essencial: 9.90, evolucao: 24.90, patrimonio: 49.90 }, anual: { essencial: 95.04, evolucao: 239.04, patrimonio: 479.04 } };
let _maSituacao = { plano: 'gratuito', periodo: 'mensal', pago: false };
let _maEscolha = { plano: 'evolucao', periodo: 'mensal', metodo: 'cartao', cupom: '' };

// Link do e-mail (finrossi.com.br/?plano=evolucao&cupom=FR20-7KQ2): guarda a intenção antes do login
// e tira os parâmetros do endereço. Depois do login, abre "Minha assinatura" com tudo aplicado.
(function(){
  try{
    const q = new URLSearchParams(location.search);
    const plano = q.get('plano'), cupom = (q.get('cupom') || '').trim().toUpperCase();
    if(plano && MA_PLANOS.some(p => p.id === plano)){
      sessionStorage.setItem('fin_intencao_assinatura', JSON.stringify({ plano, cupom: /^[A-Z0-9-]{3,30}$/.test(cupom) ? cupom : '' }));
      history.replaceState(null, '', location.pathname + location.hash);
    }
  }catch(e){}
})();
function verificarIntencaoAssinatura(){
  let int = null;
  try{ int = JSON.parse(sessionStorage.getItem('fin_intencao_assinatura') || 'null'); sessionStorage.removeItem('fin_intencao_assinatura'); }catch(e){}
  if(!int || !window._firebaseUser || (typeof isEquipe === 'function' && isEquipe())) return;
  goTo('minha-assinatura');
  setTimeout(() => abrirEscolhaPlano(int.plano, int.cupom), 600);
}

function abrirEscolhaPlano(planoId, cupom){
  _maEscolha = { plano: MA_PLANOS.some(p => p.id === planoId) ? planoId : 'evolucao', periodo: 'mensal', metodo: 'cartao', cupom: cupom || _maEscolha.cupom || '' };
  let m = document.getElementById('modal-ma-plano');
  if(!m){
    m = document.createElement('div');
    m.className = 'modal-overlay'; m.id = 'modal-ma-plano';
    m.addEventListener('click', e => { if(e.target === m) closeModal('modal-ma-plano'); });
    document.body.appendChild(m);
  }
  desenharEscolhaPlano();
  m.classList.add('open');
}
function desenharEscolhaPlano(){
  const m = document.getElementById('modal-ma-plano'); if(!m) return;
  const e = _maEscolha, anual = e.periodo === 'anual';
  const preco = MA_PRECO[e.periodo][e.plano];
  const opcao = (grupo, valor, rotulo, ativo) => `<button type="button" class="ma-opcao${ativo ? ' ativa' : ''}" onclick="_maEscolha.${grupo}='${valor}';${grupo==='periodo' ? `_maEscolha.metodo='${valor==='anual' ? 'pix' : 'cartao'}';` : ''}desenharEscolhaPlano()">${rotulo}</button>`;
  m.innerHTML = `<div class="modal ma-modal" role="dialog" aria-modal="true" aria-labelledby="ma-modal-tit">
    <h3 id="ma-modal-tit">Assinar o FinRossi</h3>
    <div class="ma-grupo"><span>Plano</span><div class="ma-opcoes">${MA_PLANOS.map(p => opcao('plano', p.id, p.nome, e.plano === p.id)).join('')}</div></div>
    <div class="ma-grupo"><span>Cobrança</span><div class="ma-opcoes">${opcao('periodo', 'mensal', 'Mensal', !anual)}${opcao('periodo', 'anual', 'Anual · 20% off', anual)}</div></div>
    <div class="ma-grupo"><span>Pagamento</span><div class="ma-opcoes">${anual ? opcao('metodo', 'pix', 'Pix', true) : opcao('metodo', 'cartao', 'Cartão de crédito', e.metodo === 'cartao') + opcao('metodo', 'boleto', 'Boleto', e.metodo === 'boleto')}</div></div>
    ${anual ? '' : `<div class="ma-grupo"><label for="ma-cupom">Cupom <small>(opcional)</small></label><input id="ma-cupom" type="text" autocomplete="off" autocapitalize="characters" maxlength="30" placeholder="Ex.: FR20-7KQ2" value="${escHTML(e.cupom)}" oninput="_maEscolha.cupom=this.value.trim().toUpperCase()"></div>`}
    <div class="ma-resumo"><span>Total</span><b>${fmtR(preco)}${anual ? '/ano' : '/mês'}</b></div>
    ${!anual && e.cupom ? '<p class="ma-nota">O desconto do cupom aparece na primeira fatura.</p>' : ''}
    ${anual ? '<p class="ma-nota">Pagamento único por Pix. O plano vale por 12 meses e não renova sozinho.</p>' : '<p class="ma-nota">Renova todo mês. Cancele quando quiser em Minha assinatura.</p>'}
    <div id="ma-msg" class="msg"></div>
    <div class="btn-row"><button class="btn primary" id="btn-ma-confirmar" type="button" onclick="confirmarEscolhaPlano()">Continuar para o pagamento</button><button class="btn" type="button" onclick="closeModal('modal-ma-plano')">Voltar</button></div>
  </div>`;
}

async function maChamar(caminho, corpo){
  const u = window._firebaseUser;
  if(!u || !u.getIdToken) throw new Error('Entre na sua conta para continuar.');
  const token = await u.getIdToken();
  const res = await fetchBackend(`${BACKEND_URL}${caminho}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(corpo || {}) });
  let data = {};
  try{ data = await res.json(); }catch(e){}
  if(!res.ok) throw new Error(data.erro || 'Não foi possível concluir agora. Tente de novo em instantes.');
  return data;
}

async function confirmarEscolhaPlano(){
  const btn = document.getElementById('btn-ma-confirmar'), msg = document.getElementById('ma-msg');
  btn.disabled = true; btn.textContent = 'Preparando o pagamento…'; msg.textContent = ''; msg.className = 'msg';
  try{
    const e = _maEscolha;
    const r = await maChamar('/minha-assinatura', { plano: e.plano, periodo: e.periodo, metodo: e.metodo, ...(e.periodo === 'mensal' && e.cupom ? { cupom: e.cupom } : {}) });
    const m = document.getElementById('modal-ma-plano');
    const nomePlano = (MA_PLANOS.find(p => p.id === r.plano) || {}).nome || r.plano;
    const link = /^https:\/\//.test(r.linkPagamento || '') ? r.linkPagamento : '';
    m.innerHTML = `<div class="modal ma-modal" role="dialog" aria-modal="true" aria-labelledby="ma-ok-tit">
      <h3 id="ma-ok-tit">Falta só pagar</h3>
      <p class="ma-nota">Plano <b>${escHTML(nomePlano)}</b> ${r.periodo === 'anual' ? 'anual' : 'mensal'}. Assim que o pagamento for confirmado, ele é liberado na hora e você recebe um e-mail.</p>
      <div class="ma-resumo"><span>${r.valorPrimeiroMes ? '1º mês com cupom' : 'Valor'}</span><b>${fmtR(r.valorPrimeiroMes || r.valor)}${r.periodo === 'anual' ? '' : (r.valorPrimeiroMes ? `<small> depois ${fmtR(r.valor)}/mês</small>` : '/mês')}</b></div>
      ${r.pix ? `${r.pix.qrCode ? `<img class="ma-qr" src="data:image/png;base64,${escHTML(r.pix.qrCode)}" alt="QR Code do Pix">` : ''}
        <label class="ma-nota" for="ma-pix">Pix copia e cola</label><textarea id="ma-pix" class="ma-pix" readonly>${escHTML(r.pix.copiaEcola || '')}</textarea>
        <div class="btn-row"><button class="btn primary" type="button" onclick="copiarPixMA(this)">Copiar código Pix</button></div>`
      : link ? `<div class="btn-row"><a class="btn primary" href="${escHTML(link)}" target="_blank" rel="noopener" style="text-decoration:none">Pagar agora</a></div>`
      : '<p class="ma-nota">A fatura também chega no seu e-mail.</p>'}
      <div class="btn-row"><button class="btn" type="button" onclick="closeModal('modal-ma-plano');renderMinhaAssinatura()">Fechar</button></div>
    </div>`;
  }catch(err){
    msg.textContent = err.message; msg.className = 'msg err';
    btn.disabled = false; btn.textContent = 'Continuar para o pagamento';
  }
}
function copiarPixMA(btn){
  const t = document.getElementById('ma-pix'); if(!t) return;
  const ok = () => { btn.textContent = 'Código copiado ✓'; };
  if(navigator.clipboard) navigator.clipboard.writeText(t.value).then(ok).catch(() => { t.select(); document.execCommand('copy'); ok(); });
  else { t.select(); document.execCommand('copy'); ok(); }
}

async function cancelarMinhaAssinatura(){
  const pendente = _maSituacao.status === 'pendente';
  if(!confirm(pendente ? 'Desfazer a assinatura que ainda não foi paga?' : 'Cancelar a assinatura? Seu plano continua liberado até o fim do período já pago.')) return;
  const btn = document.getElementById('btn-ma-cancelar');
  if(btn){ btn.disabled = true; btn.textContent = 'Cancelando…'; }
  try{
    const r = await maChamar('/minha-assinatura/cancelar');
    alert(r.planoAte ? `Assinatura cancelada. Seu plano continua liberado até ${new Date(r.planoAte).toLocaleDateString('pt-BR')}.` : 'Assinatura cancelada.');
    renderMinhaAssinatura();
  }catch(err){
    alert(err.message);
    if(btn){ btn.disabled = false; btn.textContent = 'Cancelar assinatura'; }
  }
}

function toggleNavGroup(group){
  const items = document.getElementById('sb-group-'+group);
  const arrow = document.getElementById('sb-arrow-'+group);
  if(!items) return;

  const isOpen = items.dataset.open !== 'false';

  if(isOpen){
    // Fechar: fixa a altura atual, depois anima para 0
    items.style.maxHeight = items.scrollHeight+'px';
    items.dataset.open = 'false';
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{ items.style.maxHeight='0px'; });
    });
    if(arrow) arrow.style.transform='rotate(0deg)';
    localStorage.setItem('fin_navgroup_'+group,'0');
  } else {
    // Abrir: anima para a altura real
    items.dataset.open = 'true';
    items.style.maxHeight = items.scrollHeight+'px';
    setTimeout(()=>{ if(items.dataset.open==='true') items.style.maxHeight='none'; }, 260);
    if(arrow) arrow.style.transform='rotate(90deg)';
    localStorage.setItem('fin_navgroup_'+group,'1');
  }
}

function initNavGroups(){
  ['menu','controles'].forEach(group=>{
    const items = document.getElementById('sb-group-'+group);
    const arrow = document.getElementById('sb-arrow-'+group);
    const collapsed = localStorage.getItem('fin_navgroup_'+group) === '0';
    if(items){
      items.dataset.open = collapsed ? 'false' : 'true';
      items.style.maxHeight = collapsed ? '0px' : 'none';
      if(arrow) arrow.style.transform = collapsed ? 'rotate(0deg)' : 'rotate(90deg)';
    }
  });
}


