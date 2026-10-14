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
  const assuntoCancelar = encodeURIComponent('Cancelar assinatura FinRossi');
  const corpoCancelar = encodeURIComponent(`Olá, quero cancelar minha assinatura do FinRossi.\n\nNome: ${nome}\nE-mail da conta: ${email}\nPlano: ${cfg.label}\n`);

  el.innerHTML = `
    <div class="ced-painel" style="margin-bottom:16px"><div class="ced-painel-int ma-painel">
      <div class="ced-rotulo">Plano atual</div>
      <div class="ma-plano">${esc(cfg.label)}</div>
      <div class="ma-linha">${cfg.preco?`<span class="ma-preco">${esc(cfg.preco)}</span>`:''}${STATUS[status]||STATUS.inativo}</div>
      ${cfg.desc?`<p class="ma-desc">${esc(cfg.desc)}</p>`:''}
      ${aviso}
    </div></div>

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
      </div>
    </div>

    ${plano!=='patrimonio'?`
    <div class="card card-full" style="margin-bottom:16px">
      <h3>Quer mais recursos?</h3>
      <p class="fr-card-sub" style="margin:-6px 0 14px">Os planos acima liberam ${plano==='gratuito'?'lançamentos ilimitados, investimentos, metas, cartões':'relatórios em PDF, saúde do patrimônio, lançar por foto'} e mais.</p>
      <div class="btn-row">
        <a href="https://finrossi.com.br/landing/#planos" target="_blank" rel="noopener" class="btn primary" style="text-decoration:none">Ver planos</a>
        <a href="mailto:finrossiapp@gmail.com?subject=${encodeURIComponent('Mudar de plano FinRossi')}" class="btn" style="text-decoration:none">Falar com o suporte</a>
      </div>
    </div>`:''}

    <div class="card card-full">
      <h3>Ajuda e documentos</h3>
      <div class="btn-row" style="flex-wrap:wrap">
        <a href="mailto:finrossiapp@gmail.com?subject=${encodeURIComponent('Suporte FinRossi')}" class="btn" style="text-decoration:none">Enviar e-mail ao suporte</a>
        ${plano==='patrimonio'?`<a href="mailto:finrossiapp@gmail.com?subject=${encodeURIComponent('Agendar sessão FinRossi')}" class="btn primary" style="text-decoration:none">Agendar sessão</a>`:''}
        <a href="https://finrossi.com.br/landing/legal/termos.html" target="_blank" rel="noopener" class="btn" style="text-decoration:none">Termos de uso</a>
        <a href="https://finrossi.com.br/landing/legal/privacidade.html" target="_blank" rel="noopener" class="btn" style="text-decoration:none">Privacidade</a>
        <a href="https://finrossi.com.br/landing/legal/contrato.html" target="_blank" rel="noopener" class="btn" style="text-decoration:none">Contrato</a>
      </div>
      ${pago?`<div class="ma-cancelar">
        <div><b>Cancelar assinatura</b><span>Abre um e-mail pronto para o suporte com os dados da sua conta.</span></div>
        <a href="mailto:finrossiapp@gmail.com?subject=${assuntoCancelar}&body=${corpoCancelar}" class="btn danger" style="text-decoration:none">Pedir cancelamento</a>
      </div>`:''}
    </div>
  `;
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


