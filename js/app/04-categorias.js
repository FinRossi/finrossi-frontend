// js/app/04-categorias.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── CATEGORIAS PERSONALIZADAS ────────────────────────────────────────────────
const CATS_DEFAULT = {
  despesa: ['Moradia','Alimentação','Saúde','Transporte','Educação','Lazer','Parcela','Serviços','Outros'],
  receita: ['Salário','Freelance','Aluguel recebido','Dividendos','Venda','Outros'],
};

function getCats(tipo){
  const perfil = pd();
  if(!perfil.categorias) perfil.categorias = {despesa:[],receita:[]};
  const desativadas = perfil.categorias[tipo+'_off'] || [];
  const extras = (perfil.categorias[tipo] || []).filter(c=>!CATS_DEFAULT[tipo].includes(c));
  const todas = [...CATS_DEFAULT[tipo], ...extras];
  // Retorna apenas as ativas
  return todas.filter(c=>!desativadas.includes(c));
}

function populateCatSelects(){
  populateCartaoSelect();
  // Despesa
  const dCat = document.getElementById('d-cat');
  if(dCat){
    const cur = dCat.value;
    dCat.innerHTML = getCats('despesa').map(c=>`<option value="${escHTML(c)}">${escHTML(c)}</option>`).join('');
    if(cur) dCat.value = cur;
  }
  // Receita
  const rCat = document.getElementById('r-cat');
  if(rCat){
    const cur = rCat.value;
    rCat.innerHTML = getCats('receita').map(c=>`<option value="${escHTML(c)}">${escHTML(c)}</option>`).join('');
    if(cur) rCat.value = cur;
  }
  // Histórico
  const hCat = document.getElementById('h-cat');
  if(hCat){
    const cur = hCat.value;
    const todas = [...new Set([...getCats('despesa'),...getCats('receita')])];
    hCat.innerHTML = '<option value="">Todas as categorias</option>'+todas.map(c=>`<option value="${escHTML(c)}">${escHTML(c)}</option>`).join('');
    if(cur) hCat.value = cur;
  }
  // Assinaturas e Recorrentes
  const assinCat = document.getElementById('assin-cat');
  if(assinCat){
    const cur = assinCat.value;
    assinCat.innerHTML = getCats('despesa').map(c=>`<option value="${escHTML(c)}">${escHTML(c)}</option>`).join('');
    if(cur) assinCat.value = cur;
  }
  const recCat = document.getElementById('rec-cat');
  if(recCat){
    const cur = recCat.value;
    recCat.innerHTML = getCats('despesa').map(c=>`<option value="${escHTML(c)}">${escHTML(c)}</option>`).join('');
    if(cur) recCat.value = cur;
  }
}

let _catsEditandoTipo = 'despesa';
let _catsTemp = []; // {nome, ativa, padrao}

function abrirGerenciarCats(tipo){
  _catsEditandoTipo = tipo;
  const perfil = pd();
  if(!perfil.categorias) perfil.categorias = {despesa:[],receita:[]};
  const padrao = CATS_DEFAULT[tipo];
  const desativadas = perfil.categorias[tipo+'_off'] || [];
  const extras = perfil.categorias[tipo] || [];

  // Monta lista: padrão (com flag ativa) + personalizadas
  _catsTemp = [
    ...padrao.map(n=>({nome:n, ativa:!desativadas.includes(n), padrao:true})),
    ...extras.filter(n=>!padrao.includes(n)).map(n=>({nome:n, ativa:!desativadas.includes(n), padrao:false}))
  ];

  document.getElementById('cats-modal-title').textContent = tipo==='despesa' ? 'Categorias de Despesa' : 'Categorias de Receita';
  document.getElementById('cats-nova').value = '';
  document.getElementById('cats-msg').textContent = '';
  renderCatsLista();
  document.getElementById('modal-cats').classList.add('open');
  setTimeout(()=>document.getElementById('cats-nova').focus(), 100);
}

function renderCatsLista(){
  const el = document.getElementById('cats-lista');
  if(!el) return;

  el.innerHTML = _catsTemp.map((cat,idx)=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--surface2);border:1px solid ${cat.ativa?'var(--border)':'rgba(248,113,113,0.2)'};border-radius:var(--radius-sm);opacity:${cat.ativa?1:.6}">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;${cat.ativa?'':'text-decoration:line-through;color:var(--muted)'}">${escHTML(cat.nome)}</span>
        ${cat.padrao?`<span style="font-size:10px;color:var(--muted2);background:var(--surface3);padding:1px 6px;border-radius:10px">padrão</span>`:''}
        ${!cat.ativa?`<span style="font-size:10px;color:var(--red);background:rgba(248,113,113,0.1);padding:1px 6px;border-radius:10px">inativa</span>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <!-- Toggle ativa/inativa -->
        <div onclick="toggleCat(${idx})" title="${cat.ativa?'Desativar':'Ativar'}"
          style="width:34px;height:18px;border-radius:9px;background:${cat.ativa?'var(--accent)':'var(--surface3)'};border:1px solid ${cat.ativa?'var(--accent)':'var(--border2)'};cursor:pointer;transition:all .2s;position:relative;flex-shrink:0">
          <div style="position:absolute;top:2px;left:${cat.ativa?'17px':'2px'};width:12px;height:12px;border-radius:50%;background:#fff;transition:left .2s"></div>
        </div>
        <!-- Botão remover (só para personalizadas) -->
        ${!cat.padrao?`<button onclick="removerCat(${idx})" title="Remover" style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:14px;line-height:1;padding:2px 4px;transition:color .15s" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--muted2)'">✕</button>`:'<span style="width:22px"></span>'}
      </div>
    </div>`).join('');
}

function toggleCat(idx){
  if(_catsTemp[idx]) _catsTemp[idx].ativa = !_catsTemp[idx].ativa;
  renderCatsLista();
}

function removerCat(idx){
  if(_catsTemp[idx] && !_catsTemp[idx].padrao) _catsTemp.splice(idx,1);
  renderCatsLista();
}

function adicionarCategoria(){
  const input = document.getElementById('cats-nova');
  const msg = document.getElementById('cats-msg');
  const nova = input.value.trim();
  if(!nova){ msg.textContent='Digite um nome.'; msg.style.color='var(--red)'; return; }
  if(_catsTemp.some(c=>c.nome.toLowerCase()===nova.toLowerCase())){
    msg.textContent='Essa categoria já existe.'; msg.style.color='var(--amber)'; return;
  }
  _catsTemp.push({nome:nova, ativa:true, padrao:false});
  input.value = '';
  msg.textContent = `✓ "${nova}" adicionada.`; msg.style.color='var(--green)';
  renderCatsLista();
}

function salvarCategorias(){
  const perfil = pd();
  if(!perfil.categorias) perfil.categorias = {despesa:[],receita:[]};
  const tipo = _catsEditandoTipo;

  // Separar: extras (não padrão), desativadas (todas as inativas)
  const extras = _catsTemp.filter(c=>!c.padrao).map(c=>c.nome);
  const desativadas = _catsTemp.filter(c=>!c.ativa).map(c=>c.nome);

  perfil.categorias[tipo] = extras;
  perfil.categorias[tipo+'_off'] = desativadas;

  // Salva no localStorage e Firebase
  try{ localStorage.setItem(`fin3_${cp}_categorias`, JSON.stringify(perfil.categorias)); }catch(e){}
  if(window._db && window._set && window._ref) window._set(window._ref(window._db,`financeiro/${cp}/categorias`), perfil.categorias);
  populateCatSelects();
  closeModal('modal-cats');

  // Atualiza contagem no modal de configurações
  const dCount = document.getElementById('cfg-cats-desp-count');
  const rCount = document.getElementById('cfg-cats-rec-count');
  if(dCount){ const extras=(pd().categorias?.despesa||[]).length; const off=(pd().categorias?.despesa_off||[]).length; dCount.textContent=`${CATS_DEFAULT.despesa.length} padrão${extras?` + ${extras} suas`:''}${off?` · ${off} inativa(s)`:''}`; }
  if(rCount){ const extras=(pd().categorias?.receita||[]).length; const off=(pd().categorias?.receita_off||[]).length; rCount.textContent=`${CATS_DEFAULT.receita.length} padrão${extras?` + ${extras} suas`:''}${off?` · ${off} inativa(s)`:''}`; }
}

// Carrega categorias do localStorage no lsLoad
function loadCategorias(){
  const p = cp;
  try{
    const v = localStorage.getItem(`fin3_${p}_categorias`);
    if(v){ if(!DATA[p]) DATA[p]={lancs:[],invs:[],metas:[],objs:[],notas:[],assinaturas:[],recorrentes:[],cartoes:[]}; DATA[p].categorias=JSON.parse(v); }
  }catch(e){}
}



function syncMesFiltro(origem){
  const v=origem==='mob'
    ?(document.getElementById('dash-mes-filtro-mob')||{}).value||''
    :(document.getElementById('dash-mes-filtro')||{}).value||'';
  const desk=document.getElementById('dash-mes-filtro');
  const mob=document.getElementById('dash-mes-filtro-mob');
  if(desk)desk.value=v;
  if(mob)mob.value=v;
}
function getMesFiltro(){
  const el=document.getElementById('dash-mes-filtro');
  const v=el?el.value:'';
  return v||curMes();
}
function populateMesFiltro(){
  const lancs=pd().lancs;
  // Garante que o mês atual sempre aparece na lista
  const mesAtual=curMes();
  const mesesSet=new Set(lancs.map(l=>l.data.slice(0,7)));
  mesesSet.add(mesAtual);
  const meses=[...mesesSet].sort().reverse();
  const cur=getMesFiltro();
  const opts=`<option value="todos" ${cur==='todos'?'selected':''}>Todos os meses</option>`
    + meses.map(m=>`<option value="${m}" ${m===cur?'selected':''}>${mesLbl(m+'-01')}${m===mesAtual?' (atual)':''}</option>`).join('');
  ['dash-mes-filtro','dash-mes-filtro-mob'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.innerHTML=opts;el.value=cur;}
  });
}

