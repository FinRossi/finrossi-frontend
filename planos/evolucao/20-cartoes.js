// planos/evolucao/20-cartoes.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── CARTÕES DE CRÉDITO ──────────────────────────────────────────────────────
function getCartoes(){return pd().cartoes||[];}
async function saveCartoes(){lsSave(cp,'cartoes');fbSave(cp,'cartoes');}
// Bandeiras do cartão (a mesma arte na prévia do formulário e na lista)
const CARTAO_BANDEIRAS = {
  visa: '<svg width="44" height="14" viewBox="0 0 44 14"><text x="0" y="12" font-family="Arial" font-weight="900" font-size="14" fill="white" letter-spacing="-1">VISA</text></svg>',
  master: '<svg width="36" height="22" viewBox="0 0 36 22"><circle cx="13" cy="11" r="11" fill="#EB001B" opacity=".9"/><circle cx="23" cy="11" r="11" fill="#F79E1B" opacity=".9"/><path d="M18 4.5a11 11 0 010 13A11 11 0 0118 4.5z" fill="#FF5F00" opacity=".9"/></svg>',
  elo: '<svg width="36" height="14" viewBox="0 0 36 14"><text x="0" y="12" font-family="Arial" font-weight="900" font-size="13" fill="white">elo</text></svg>',
  amex: '<svg width="36" height="14" viewBox="0 0 36 14"><text x="0" y="12" font-family="Arial" font-weight="700" font-size="11" fill="white">AMEX</text></svg>',
  hipercard: '<svg width="36" height="14" viewBox="0 0 36 14"><text x="0" y="12" font-family="Arial" font-weight="700" font-size="10" fill="white">Hiper</text></svg>',
};

function populateCartaoSelect(){
  const cartoes=getCartoes();
  const sel=document.getElementById('d-cartao');
  if(!sel)return;
  const cur=sel.value;
  sel.innerHTML='<option value="">Selecione o cartão usado</option>'+
    cartoes.map(c=>`<option value="${c.id}">${c.nome} •••• ${c.final} (${c.banco})</option>`).join('');
  sel.value=cur;
}

function atualizarPreviewCartao(){
  const wrap=document.getElementById('cartao-preview-wrap');
  if(!wrap) return;
  const c={
    final: document.getElementById('cartao-final')?.value || '0000',
    cor: document.getElementById('cartao-cor')?.value || '#C8A96E',
    modelo: document.getElementById('cartao-modelo')?.value || 'preto',
    nome: document.getElementById('cartao-nome')?.value || '',
    banco: document.getElementById('cartao-banco')?.value || '',
  };
  wrap.innerHTML=cartaoVisualHTML(c, 220, 138);
}

function openModalCartao(id){
  document.getElementById('mcartao-title').textContent=id?'Editar cartão':'Novo cartão';
  document.getElementById('cartao-edit-id').value=id||'';
  if(id){
    const c=getCartoes().find(x=>x.id===id);
    if(c){
      document.getElementById('cartao-nome').value=c.nome;
      document.getElementById('cartao-banco').value=c.banco;
      document.getElementById('cartao-final').value=c.final;
      document.getElementById('cartao-limite').value=(c.limite||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
      document.getElementById('cartao-venc').value=c.venc;
      document.getElementById('cartao-fecha').value=c.fecha||'';
      document.getElementById('cartao-cor').value=c.cor||'#C8A96E';
      document.getElementById('cartao-modelo').value=c.modelo||'preto';
      document.getElementById('cartao-bandeira').value=c.bandeira||'outra';
    }
  } else {
    ['cartao-nome','cartao-final','cartao-limite','cartao-venc','cartao-fecha'].forEach(i=>document.getElementById(i).value='');
    document.getElementById('cartao-cor').value='#C8A96E';
    document.getElementById('cartao-modelo').value='preto';
    document.getElementById('cartao-bandeira').value='master';
  }
  document.getElementById('modal-cartao').classList.add('open');
  atualizarPreviewCartao();
}

async function salvarCartao(){
  const nome=document.getElementById('cartao-nome').value.trim();
  const banco=document.getElementById('cartao-banco').value;
  const final=document.getElementById('cartao-final').value.trim();
  const limite=parseCurrency(document.getElementById('cartao-limite'));
  const venc=parseInt(document.getElementById('cartao-venc').value)||0;
  const fecha=parseInt(document.getElementById('cartao-fecha').value)||0;
  const cor=document.getElementById('cartao-cor').value;
  const modelo=document.getElementById('cartao-modelo').value;
  const bandeira=document.getElementById('cartao-bandeira').value;
  if(!nome){showMsg('msg-cartao','Informe o nome','err');return}
  if(!final||final.length!==4){showMsg('msg-cartao','Informe os 4 dígitos finais','err');return}
  const id=document.getElementById('cartao-edit-id').value;
  const obj={id:id||uid(),nome,banco,final,limite,venc,fecha,cor,modelo,bandeira};
  if(id){const i=pd().cartoes.findIndex(c=>c.id===id);if(i>=0)pd().cartoes[i]=obj;}
  else{if(!pd().cartoes)pd().cartoes=[];pd().cartoes.push(obj);}
  await saveCartoes();
  closeModal('modal-cartao');
  renderCartoes();
  populateCartaoSelect();
}

async function remCartao(id){
  if(!confirm('Excluir este cartão?'))return;
  pd().cartoes=getCartoes().filter(c=>c.id!==id);
  renderCartoes();saveCartoes();populateCartaoSelect();
}

// ─── Visual do cartão (modelo + cor) — reaproveitado no dashboard e na página Cartões ──
const CARTAO_MODELOS = {
  preto:       'Preto fosco + friso',
  solido:      'Cor sólida premium',
  carbono:     'Carbono + brilho',
  minimalista: 'Linhas finas',
};
function cartaoVisualHTML(c, w, h){
  const cor = c.cor || '#C8A96E';
  const modelo = CARTAO_MODELOS[c.modelo] ? c.modelo : 'preto';
  const final = c.final || '0000';
  const banco = c.banco || 'FinRossi';
  const nome = (c.nome || '').toUpperCase();
  const bandeira = `<div style="flex-shrink:0;transform:scale(${(w/300).toFixed(2)});transform-origin:top right">${CARTAO_BANDEIRAS[c.bandeira]||''}</div>`;
  const chip = `<svg width="${Math.round(w*0.15)}" height="${Math.round(h*0.16)}" viewBox="0 0 34 26" fill="none"><rect x="0" y="0" width="34" height="26" rx="4" fill="#D4AF5A" opacity=".9"/><rect x="11" y="0" width="12" height="26" fill="#C4992A" opacity=".5"/><rect x="0" y="8" width="34" height="10" fill="#C4992A" opacity=".5"/></svg>`;
  const bgByModelo = {
    preto:       `background:linear-gradient(135deg,#1a1a1a 0%,#000 100%);border:1px solid ${cor}55`,
    solido:      `background:linear-gradient(135deg,${cor} 0%,${cor}99 60%,#1a1a1a 100%)`,
    carbono:     `background:radial-gradient(circle at 30% 20%,#2a2a2a,#050505 70%);border:1px solid rgba(255,255,255,.08)`,
    minimalista: `background:#0a0a0a;border:1px solid ${cor}66`,
  };
  const textByModelo = { preto:'#fff', solido:'#1a1400', carbono:'#fff', minimalista:'#fff' };
  const numByModelo   = { preto:'rgba(255,255,255,.7)', solido:'rgba(26,20,0,.7)', carbono:'#999', minimalista:'#ccc' };
  const subByModelo   = { preto:'rgba(255,255,255,.55)', solido:'rgba(26,20,0,.55)', carbono:'#888', minimalista:'#999' };
  let extra = '';
  if(modelo==='preto') extra = `<div style="position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,${cor}22 50%,transparent 60%)"></div>`;
  else if(modelo==='solido') extra = `<div style="position:absolute;top:-30px;right:-30px;width:${Math.round(w*0.6)}px;height:${Math.round(w*0.6)}px;border-radius:50%;background:rgba(255,255,255,.12)"></div>`;
  else if(modelo==='carbono') extra = `<div style="position:absolute;top:10px;left:10px;width:5px;height:5px;border-radius:50%;background:${cor};box-shadow:0 0 8px ${cor}"></div>`;
  else if(modelo==='minimalista') extra = `<svg width="100%" height="100%" style="position:absolute;inset:0;opacity:.4"><line x1="0" y1="25%" x2="100%" y2="25%" stroke="${cor}" stroke-width=".5"/><line x1="0" y1="50%" x2="100%" y2="50%" stroke="${cor}" stroke-width=".5"/><line x1="0" y1="75%" x2="100%" y2="75%" stroke="${cor}" stroke-width=".5"/></svg>`;
  const pad = Math.round(w*0.07);
  return `<div style="width:${w}px;height:${h}px;flex-shrink:0;border-radius:${Math.round(h*0.11)}px;${bgByModelo[modelo]};padding:${pad}px;position:relative;overflow:hidden;box-shadow:0 8px 24px ${cor}22,0 2px 8px rgba(0,0,0,.4)">
    ${extra}
    <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative">
      <div style="font-size:${Math.round(w*0.052)}px;letter-spacing:.5px;color:${subByModelo[modelo]};font-weight:500;max-width:60%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${banco}</div>
      ${bandeira}
    </div>
    <div style="position:relative;margin-top:${Math.round(h*0.1)}px">${chip}</div>
    <div style="font-size:${Math.round(w*0.062)}px;letter-spacing:2px;color:${numByModelo[modelo]};font-family:monospace;margin-top:${Math.round(h*0.07)}px;position:relative">•••• •••• •••• ${final}</div>
    <div style="position:absolute;bottom:${pad}px;left:${pad}px;right:${pad}px;display:flex;justify-content:space-between;align-items:flex-end;gap:8px">
      <div style="min-width:0">
        <div style="font-size:${Math.round(w*0.028)}px;letter-spacing:1px;color:${subByModelo[modelo]};text-transform:uppercase;margin-bottom:2px">Titular</div>
        <div style="font-size:${Math.round(w*0.05)}px;font-weight:700;color:${textByModelo[modelo]};text-transform:uppercase;letter-spacing:.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nome||'<span style="opacity:.45">SEU NOME</span>'}</div>
      </div>
    </div>
  </div>`;
}

function mudarPaginaCartao(delta){
  _cartaoPage += delta;
  renderCartoes();
}

function renderCartoes(){
  try{
  populateCartaoSelect();
  const cartoes=getCartoes();
  const mes=curMes();
  const el=document.getElementById('cartoes-content');
  const hdrBtn=document.getElementById('cartoes-header-btn');
  if(!el){console.warn('renderCartoes: cartoes-content não encontrado');return;}

  if(!cartoes.length){
    if(hdrBtn) hdrBtn.innerHTML='';
    el.innerHTML=`
      <div class="card fr-vazio" style="margin-bottom:18px">
        <b>Nenhum cartão cadastrado</b>
        <p>Cadastre seus cartões para acompanhar a fatura, o limite disponível e as despesas feitas em cada um.</p>
        <button class="btn primary" onclick="openModalCartao()">+ Novo cartão</button>
      </div>
      <div class="card" style="margin-bottom:18px">
        <h3>Como funciona</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-top:8px">
          ${[['1','Cadastre o cartão','Informe nome, banco, 4 dígitos finais, limite e dia de vencimento.'],
             ['2','Lance as despesas','Em Lançamentos, adicione uma despesa e selecione o cartão. Entra na fatura automaticamente.'],
             ['3','Acompanhe a fatura','Veja fatura atual, limite disponível, gastos por categoria e alertas de limite.']
          ].map(([n,t,d])=>`<div style="display:flex;gap:12px;align-items:flex-start">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--accent-s);border:1px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--accent);flex-shrink:0">${n}</div>
            <div><div style="font-size:13px;font-weight:500;margin-bottom:3px">${t}</div><div style="font-size:12px;color:var(--muted);line-height:1.6">${d}</div></div>
          </div>`).join('')}
        </div>
      </div>`;
    destroyChart('cartao-dist'); destroyChart('cartao-limite');
    return;
  }

  // Tem cartões
  if(hdrBtn) hdrBtn.innerHTML='<button class="btn primary" onclick="openModalCartao()">+ Novo cartão</button>';
  const lancs=pd().lancs.filter(l=>l.tipo==='despesa'&&l.data.startsWith(mes));

  // Grid de cartões — tamanho padrão fixo, paginado de 3 em 3
  const CARTAO_PAGE_SIZE = 3;
  const totalPaginas = Math.ceil(cartoes.length / CARTAO_PAGE_SIZE) || 1;
  if(_cartaoPage >= totalPaginas) _cartaoPage = totalPaginas - 1;
  if(_cartaoPage < 0) _cartaoPage = 0;
  const cartoesVisiveis = cartoes.slice(_cartaoPage*CARTAO_PAGE_SIZE, _cartaoPage*CARTAO_PAGE_SIZE + CARTAO_PAGE_SIZE);
  const gridCols = 'repeat(auto-fit,minmax(280px,300px))';
  const gridMaxW = '956px';

  const CHIP = '<svg width="34" height="26" viewBox="0 0 34 26" fill="none"><rect x="0" y="0" width="34" height="26" rx="4" fill="#D4AF5A" opacity=".9"/><rect x="11" y="0" width="12" height="26" fill="#C4992A" opacity=".5"/><rect x="0" y="8" width="34" height="10" fill="#C4992A" opacity=".5"/><rect x="11" y="8" width="12" height="10" fill="#B8881A" opacity=".7"/></svg>';

  const gridHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;max-width:${gridMaxW}">
    ${cartoes.length>CARTAO_PAGE_SIZE?`<button class="btn xs" onclick="mudarPaginaCartao(-1)" ${_cartaoPage===0?'disabled':''} style="flex-shrink:0;${_cartaoPage===0?'opacity:.3;cursor:default':''}">‹</button>`:''}
    <div style="display:grid;grid-template-columns:${gridCols};gap:24px;flex:1" id="cartoes-grid-inner">
    ${cartoesVisiveis.map(c=>{
      const gastos=lancs.filter(l=>l.cartaoId===c.id).reduce((a,b)=>a+b.val,0);
      const pct=c.limite>0?Math.min(100,(gastos/c.limite)*100):0;
      const disponivel=Math.max(0,c.limite-gastos);
      const corS=pct>=90?'var(--red)':pct>=70?'var(--accent)':'var(--green)';
      const cor=c.cor||'#C8A96E';
      const modelo=CARTAO_MODELOS[c.modelo]?c.modelo:'preto';
      const bandSVG=CARTAO_BANDEIRAS[(c.bandeira||'').toLowerCase()]||'';
      const MODELO_BG_FULL={
        preto:       `background:linear-gradient(135deg,#1a1a1a 0%,#000 100%);border:1px solid ${cor}55`,
        solido:      `background:linear-gradient(135deg,${cor}ee 0%,${cor}99 50%,#1a1a1a 100%)`,
        carbono:     `background:radial-gradient(circle at 25% 15%,#2a2a2a,#050505 75%);border:1px solid rgba(255,255,255,.08)`,
        minimalista: `background:#0a0a0a;border:1px solid ${cor}66`,
      };
      const decorFull = modelo==='preto'
        ? `<div style="position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,${cor}22 50%,transparent 60%)"></div>`
        : modelo==='carbono'
        ? `<div style="position:absolute;top:16px;left:16px;width:6px;height:6px;border-radius:50%;background:${cor};box-shadow:0 0 10px ${cor}"></div>`
        : modelo==='minimalista'
        ? `<svg width="100%" height="100%" style="position:absolute;inset:0;opacity:.35"><line x1="0" y1="30%" x2="100%" y2="30%" stroke="${cor}" stroke-width=".5"/><line x1="0" y1="55%" x2="100%" y2="55%" stroke="${cor}" stroke-width=".5"/><line x1="0" y1="80%" x2="100%" y2="80%" stroke="${cor}" stroke-width=".5"/></svg>`
        : `<div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.06)"></div>
           <div style="position:absolute;bottom:-60px;left:-20px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.03)"></div>`;
      return`<div>
        <div style="${MODELO_BG_FULL[modelo]};border-radius:18px;padding:24px;position:relative;overflow:hidden;height:190px;box-shadow:0 8px 32px ${cor}33,0 2px 8px rgba(0,0,0,.5);margin-bottom:16px">
          ${decorFull}
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;position:relative">
            <div style="font-size:13px;color:rgba(255,255,255,.75);font-weight:500">${c.banco}</div>
            <div style="display:flex;gap:6px">
              <button class="btn xs" onclick="openModalCartao('${c.id}')" title="Editar" aria-label="Editar cartão" style="background:rgba(255,255,255,.15);border:none;color:white">${ICO_EDITAR}</button>
              <button class="btn danger xs" onclick="remCartao('${c.id}')" title="Excluir" aria-label="Excluir cartão" style="background:rgba(248,113,113,.2);border:none;color:#f87171">✕</button>
            </div>
          </div>
          <div style="margin-bottom:16px;position:relative">${CHIP}</div>
          <div style="font-size:16px;letter-spacing:4px;color:rgba(255,255,255,.9);font-family:monospace;margin-bottom:16px;position:relative">•••• •••• •••• ${c.final||'0000'}</div>
          <div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative">
            <div>
              <div style="font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Titular</div>
              <div style="font-size:13px;color:white;font-weight:600;text-transform:uppercase;letter-spacing:.5px">${c.nome}</div>
            </div>
            <div>${bandSVG}</div>
          </div>
        </div>
        <div class="cartao-extrato">
          <div><span>Fatura atual</span><b>${fmtR(gastos)}</b></div>
          <div><span>Disponível</span><b class="pos">${fmtR(disponivel)}</b></div>
        </div>
        ${c.limite>0?`<div class="cartao-limite">
          <div class="prog-meta"><span>Limite de ${fmtR(c.limite)}</span><strong style="color:${corS}">${pct.toFixed(0)}% usado</strong></div>
          <div class="prog-track"><div class="prog-fill" style="width:${pct.toFixed(1)}%;background:${corS}"></div></div>
          <div class="cartao-datas"><span>Vence dia ${c.venc}</span>${c.fecha?`<span>Fecha dia ${c.fecha}</span>`:''}</div>
        </div>`:''}</div>`;
    }).join('')}
  </div>
    ${cartoes.length>CARTAO_PAGE_SIZE?`<button class="btn xs" onclick="mudarPaginaCartao(1)" ${_cartaoPage>=totalPaginas-1?'disabled':''} style="flex-shrink:0;${_cartaoPage>=totalPaginas-1?'opacity:.3;cursor:default':''}">›</button>`:''}
  </div>
  ${cartoes.length>CARTAO_PAGE_SIZE?`<div style="text-align:center;font-size:11px;color:var(--muted2);margin-top:-16px;margin-bottom:20px">${_cartaoPage+1} / ${totalPaginas}</div>`:''}`;

  // Linhas de gastos do mês agrupados por cartão (estava faltando — causava erro e travava o render)
  const gastosCartao = lancs.filter(l=>l.cartaoId).sort((a,b)=>b.data.localeCompare(a.data));
  const rowsHTML = gastosCartao.length ? gastosCartao.map(l=>{
      const cartao = cartoes.find(c=>c.id===l.cartaoId);
      return `<div class="ext-linha" style="grid-template-columns:44px 1fr auto">
        <div class="ext-dia"><b>${l.data.slice(8,10)}</b><span>${MESES_CURTOS[+l.data.slice(5,7)-1]}</span></div>
        <div style="min-width:0"><div class="ext-tit">${l.desc}</div><div class="ext-meta">${l.cat}, ${cartao?`${cartao.nome} final ${cartao.final}`:'cartão removido'}</div></div>
        <div class="ext-valor">− ${fmtR(l.val).replace(/^R\$\s?/,'')}</div>
      </div>`;
    }).join('') : '';

  el.innerHTML=gridHTML+`
    <div class="card card-full" style="margin-bottom:20px">
      <h3>Gastos com cartão em ${MONTHS[parseInt(mes.split('-')[1])-1].toLowerCase()}</h3>
      <div id="cartoes-gastos-inner">${rowsHTML||'<p class="empty" style="text-align:left;padding:8px 0">Nenhuma despesa no cartão este mês. Ao lançar uma despesa, escolha o cartão usado.</p>'}</div>
    </div>
    <div class="grid2">
      <div class="card"><h3><span class="dot" style="background:var(--purple)"></span>Distribuição de gastos</h3>
        <div class="chart-wrap" style="height:200px"><canvas id="c-cartao-dist"></canvas></div></div>
      <div class="card"><h3><span class="dot" style="background:var(--amber)"></span>Fatura vs Limite</h3>
        <div class="chart-wrap" style="height:200px"><canvas id="c-cartao-limite"></canvas></div></div>
    </div>`;

  // Gráficos
  destroyChart('cartao-dist');
  const ctxD=document.getElementById('c-cartao-dist');
  if(ctxD){
    const vals=cartoes.map(c=>lancs.filter(l=>l.cartaoId===c.id).reduce((a,b)=>a+b.val,0));
    charts['cartao-dist']=new Chart(ctxD,{type:'doughnut',data:{labels:cartoes.map(c=>`${c.nome} final ${c.final}`),datasets:[{data:vals,backgroundColor:cartoes.map((c,i)=>/^#/.test(c.cor||'')?c.cor:PALETTE[i%PALETTE.length]),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#888',font:{size:11},padding:6,boxWidth:10}}}}});
  }
  destroyChart('cartao-limite');
  const ctxL=document.getElementById('c-cartao-limite');
  if(ctxL){
    const com=cartoes.filter(c=>c.limite>0);
    charts['cartao-limite']=new Chart(ctxL,{type:'bar',data:{labels:com.map(c=>`${c.nome} final ${c.final}`),datasets:[
      {label:'Fatura',data:com.map(c=>lancs.filter(l=>l.cartaoId===c.id).reduce((a,b)=>a+b.val,0)),backgroundColor:'rgba(248,113,113,0.7)',borderRadius:4},
      {label:'Limite',data:com.map(c=>c.limite),backgroundColor:'rgba(200,169,110,0.3)',borderRadius:4}
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#888',font:{size:11},boxWidth:10}}},scales:{x:{ticks:{color:'#888'},grid:{color:'rgba(255,255,255,0.04)'}},y:{ticks:{color:'#888'},grid:{color:'rgba(255,255,255,0.04)'}}}}});
  }
  }catch(e){console.error('renderCartoes error:',e);}
}

