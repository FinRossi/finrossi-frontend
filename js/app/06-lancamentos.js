// js/app/06-lancamentos.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── LANÇAMENTOS ─────────────────────────────────────────────────────────────
function switchTab(t){
  document.querySelectorAll('.tab-btn').forEach((b,i)=>b.classList.toggle('active',['receita','despesa','investimento'][i]===t));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active',p.id==='tab-'+t));
}
// ─── MÁSCARA DE MOEDA ─────────────────────────────────────────────────────────
function maskCurrency(el){
  let v = el.value.replace(/\D/g,'');
  if(!v){ el.value=''; return; }
  v = (parseInt(v)/100).toFixed(2);
  el.value = parseFloat(v).toLocaleString(LOCALE,{minimumFractionDigits:2,maximumFractionDigits:2});
}
function parseCurrency(el){
  if(!el) return 0;
  const v = typeof el==='string' ? el : el.value;
  if(IDIOMA==='en') return parseFloat(v.replace(/,/g,'')) || 0;   // inglês: 1,234.56
  return parseFloat(v.replace(/\./g,'').replace(',','.')) || 0;  // português: 1.234,56
}
// Mesmo formato que maskCurrency escreve (para preencher um campo de dinheiro com um valor salvo)
const fmtCampoValor=v=>(+v||0).toLocaleString(LOCALE,{minimumFractionDigits:2,maximumFractionDigits:2});
// Taxas e porcentagens digitadas com vírgula ou ponto: "0,8" / "0.8" → 0.8 (inglês: "1,000.5" → 1000.5)
function lerNumeroLocal(v){
  const s=String(v==null?'':v).trim(); if(!s) return NaN;
  return parseFloat(IDIOMA==='en'?s.replace(/,/g,''):s.replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.'));
}

// ─── MOEDA DO LANÇAMENTO (saldos separados por moeda — js/app/01-base.js) ────
// O seletor começa na moeda da conta. Outra moeda: o lançamento vai para o saldo daquela moeda, fora dos
// totais da conta, e não pode ir para a fatura de cartão (que é na moeda da conta).
const moedaForm=p=>document.getElementById(p+'-moeda')?.value||MOEDA;
function preencherMoedasLanc(){
  const lista=[MOEDA,...MOEDAS_LANC.filter(m=>m!==MOEDA)];
  ['r','d','mel'].forEach(p=>{
    const s=document.getElementById(p+'-moeda'); if(!s) return;
    const cur=s.value;
    s.innerHTML=lista.map(m=>`<option value="${m}">${SIMBOLO_MOEDA[m]}</option>`).join('');
    s.value=lista.includes(cur)?cur:MOEDA;
    aoTrocarMoedaLanc(p,true);
  });
}
function aoTrocarMoedaLanc(p,quieto){
  const m=moedaForm(p), outra=m!==MOEDA;
  const av=document.getElementById(p+'-moeda-aviso');
  // Título do campo acompanha a moeda: "Valor total (R$)" → "Valor total (US$)"; volta ao original na moeda da conta
  const rot=document.getElementById(p+'-moeda')?.closest('.field')?.querySelector('label');
  // (o símbolo da conta vem de simboloMoeda: R$, A$ ou $ no inglês — o mesmo que o resto do app usa)
  if(rot&&/\((R\$|A\$|US\$|€|£|\$)\)/.test(rot.textContent)){
    const novo=rot.textContent.replace(/\((R\$|A\$|US\$|€|£|\$)\)/,'('+(outra?SIMBOLO_MOEDA[m]:simboloMoeda())+')');
    if(novo!==rot.textContent) rot.textContent=novo;
  }
  if(av){ av.hidden=!outra;av.innerHTML=outra?`<span>Fica no saldo em</span> ${escHTML(SIMBOLO_MOEDA[m])}<span>, separado do saldo da conta.</span>`:''; }
  if(p==='d'&&!quieto){ toggleMetodoPagamento(); calcParcela(); }
}

function toggleMetodoPagamento(){
  const metodo = document.getElementById('d-metodo')?.value;
  const cartaoRow = document.querySelector('#d-cartao')?.closest('.form-row');
  const outraMoeda = moedaForm('d')!==MOEDA;   // cartão (fatura/limite) é na moeda da conta
  // Crédito ou débito: mostra o campo de qual cartão foi usado (o título acompanha a forma de pagamento).
  // No débito o cartão é só informativo: fica em cartaoDebitoId e NÃO entra na fatura nem no limite.
  if((metodo==='credito' || metodo==='debito') && !outraMoeda){
    if(cartaoRow) cartaoRow.style.display='';
    const rot=document.getElementById('d-cartao-rotulo');
    if(rot) rot.textContent = metodo==='debito' ? 'Cartão de débito' : 'Cartão de crédito';
  } else {
    // Outras formas: limpa seleção e esconde o campo
    const cartaoSel = document.getElementById('d-cartao');
    if(cartaoSel) cartaoSel.value='';
    if(cartaoRow) cartaoRow.style.display='none';
  }
  // Parcelado só faz sentido em crédito
  const parcWrap = document.getElementById('d-parcelado-wrap');
  if(parcWrap) parcWrap.style.display = metodo==='credito' ? '' : 'none';
  if(metodo!=='credito'){
    const parc = document.getElementById('d-parcelado');
    if(parc) parc.value='avista';
    toggleParcelado();
  }
}

function toggleParcelado(){
  const isParc=document.getElementById('d-parcelado').value==='parcelado';
  const rotData=document.getElementById('d-data-rotulo');
  if(rotData) rotData.textContent=isParc?'Data 1ª parcela':'Data';   // à vista: só "Data"
  document.getElementById('d-parcelas-wrap').style.display=isParc?'flex':'none';
  document.getElementById('d-parcela-preview').style.display=isParc?'block':'none';
  if(!isParc){document.getElementById('d-parcelas').value='';calcParcela()}
  calcParcela();
}
function calcParcela(){
  const val=parseCurrency(document.getElementById('d-val'));
  const n=parseInt(document.getElementById('d-parcelas').value)||0;
  const isParc=document.getElementById('d-parcelado').value==='parcelado';
  if(!isParc||!val||n<2){document.getElementById('d-parcela-preview').style.display='none';return}
  const parcel=val/n;
  document.getElementById('d-parcela-preview').style.display='block';
  document.getElementById('d-parcela-val').textContent=fmtMoedaDe(parcel,moedaForm('d'));
  document.getElementById('d-parcela-desc').textContent=` × ${n} meses = ${fmtMoedaDe(val,moedaForm('d'))} total`;
}
function addLanc(tipo){
  const p=tipo==='receita'?'r':'d';
  const desc=document.getElementById(p+'-desc').value.trim();
  const val=parseCurrency(document.getElementById(p+'-val'));
  const data=document.getElementById(p+'-data').value||hoje();
  const cat=document.getElementById(p+'-cat').value;
  const obs=document.getElementById(p+'-obs').value.trim();
  const metodo=document.getElementById(p+'-metodo')?.value||'';
  if(!desc){showMsg('msg-'+p,'Informe a descrição','err');return}
  if(!val||val<=0){showMsg('msg-'+p,'Valor inválido','err');return}
  const moeda=moedaForm(p), mo=moeda!==MOEDA?{moeda}:{};   // só grava "moeda" quando não é a da conta

  if(tipo==='despesa'){
    const cartaoSel=moeda===MOEDA?(document.getElementById('d-cartao')?.value||''):'';
    const cartaoId=metodo==='credito'?cartaoSel:'';                 // crédito: entra na fatura do cartão
    const cartaoDebitoId=metodo==='debito'?cartaoSel:'';            // débito: só para saber qual cartão (fora da fatura)
    const parcelado=document.getElementById('d-parcelado').value==='parcelado';
    const nParc=parseInt(document.getElementById('d-parcelas').value)||1;
    if(parcelado){
      if(nParc<2){showMsg('msg-d','Informe ao menos 2 parcelas','err');return}
      const valParc=val/nParc;
      const gid=uid();
      const anexo=(typeof anexoParaSalvar==='function')?anexoParaSalvar('d'):null; // mesma foto para todas as parcelas
      const [yr,mo,dy]=data.split('-').map(Number);
      for(let i=0;i<nParc;i++){
        // Dia 29/30/31 em mês mais curto: usa o último dia do mês (31/01 + 1 = 28/02, não 03/03)
        const ultimoDia=new Date(yr,mo+i,0).getDate();
        const d=new Date(yr,mo-1+i,Math.min(dy,ultimoDia));
        const dataParc=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        pd().lancs.push({id:uid(),tipo,desc,val:valParc,data:dataParc,cat,obs,metodo,parcelado:true,parcela:i+1,totalParcelas:nParc,valorTotal:val,groupId:gid,cartaoId,...mo,...(anexo?{anexo}:{})});
      }
      saveCollection('lancs');clearForm(p);showMsg('msg-d',`${nParc} parcelas de ${fmtMoedaDe(valParc,moeda)} adicionadas!`,'ok');refreshDash();renderHistorico();
      return;
    }
    const anexo=(typeof anexoParaSalvar==='function')?anexoParaSalvar('d'):null;
    pd().lancs.push({id:uid(),tipo,desc,val,data,cat,obs,metodo,cartaoId,...(cartaoDebitoId?{cartaoDebitoId}:{}),...mo,...(anexo?{anexo}:{})});
    saveCollection('lancs');clearForm(p);showMsg('msg-d','Despesa adicionada!','ok');refreshDash();renderHistorico();
    return;
  }

  const anexo=(typeof anexoParaSalvar==='function')?anexoParaSalvar(p):null;
  pd().lancs.push({id:uid(),tipo,desc,val,data,cat,obs,metodo,...mo,...(anexo?{anexo}:{})});
  saveCollection('lancs');clearForm(p);showMsg('msg-'+p,tipo==='receita'?'Receita adicionada!':'Despesa adicionada!','ok');refreshDash();renderHistorico();
}
function addInv(){
  const nome=document.getElementById('i-nome').value.trim();
  const val=parseCurrency(document.getElementById('i-val'));
  if(!nome){showMsg('msg-i','Informe o nome','err');return}
  if(!val||val<=0){showMsg('msg-i','Valor inválido','err');return}
  pd().invs.push({id:uid(),nome,val,tipo:document.getElementById('i-tipo').value,rent:document.getElementById('i-rent').value.trim(),banco:document.getElementById('i-banco').value.trim(),data:document.getElementById('i-data').value||hoje()});
  saveCollection('invs');clearForm('i');showMsg('msg-i','Investimento adicionado!','ok');renderInvs();refreshDash();
}
function editarLanc(id){
  const l=pd().lancs.find(x=>x.id===id);
  if(!l) return;
  document.getElementById('mel-id').value=id;
  document.getElementById('mel-desc').value=l.desc||'';
  // Valor formatado
  const valEl=document.getElementById('mel-val');
  valEl.value=l.val.toLocaleString(LOCALE,{minimumFractionDigits:2,maximumFractionDigits:2});
  dpInit('mel-data', l.data||hoje());
  // Categorias: as ativas + as ocultas (dá para escolher qualquer uma) e o "editar" abre o gerenciador do tipo
  document.getElementById('modal-editar-lanc')._tipo=l.tipo;
  preencherCatEdicao(l.cat);
  document.getElementById('mel-metodo').value=l.metodo||'';
  const melMoeda=document.getElementById('mel-moeda');
  if(melMoeda){ if(!melMoeda.options.length) preencherMoedasLanc(); melMoeda.value=moedaDoLanc(l); aoTrocarMoedaLanc('mel'); }
  document.getElementById('mel-obs').value=l.obs||'';
  document.getElementById('msg-mel').textContent='';
  document.getElementById('modal-editar-lanc').classList.add('open');
}

// Lista de categorias da janela "Editar lançamento". Antes vinham só as ativas: um lançamento numa
// categoria ocultada abria marcado na primeira da lista e, ao salvar, trocava de categoria sem aviso.
function preencherCatEdicao(atual){
  const tipo=document.getElementById('modal-editar-lanc')._tipo||'despesa';
  if(tipo!=='despesa'&&tipo!=='receita') return;
  const catSel=document.getElementById('mel-cat');
  const ativas=getCats(tipo);
  const ocultas=[...new Set([...getCatsOcultas(tipo),...(atual&&!ativas.includes(atual)?[atual]:[])])];
  const opt=c=>`<option value="${escHTML(c)}" ${c===atual?'selected':''}>${escHTML(c)}</option>`;
  catSel.innerHTML=ativas.map(opt).join('')+(ocultas.length?`<optgroup label="Categorias ocultas">${ocultas.map(opt).join('')}</optgroup>`:'');
  if(atual) catSel.value=atual;
  const ed=document.getElementById('mel-cat-editar'); if(ed) ed.onclick=()=>abrirGerenciarCats(tipo);
}

async function salvarEdicaoLanc(){
  const id=document.getElementById('mel-id').value;
  const desc=document.getElementById('mel-desc').value.trim();
  const val=parseCurrency(document.getElementById('mel-val'));
  const data=document.getElementById('mel-data').value||hoje();
  const cat=document.getElementById('mel-cat').value;
  const metodo=document.getElementById('mel-metodo').value;
  const obs=document.getElementById('mel-obs').value.trim();
  if(!desc){showMsg('msg-mel','Informe a descrição','err');return}
  if(!val||val<=0){showMsg('msg-mel','Valor inválido','err');return}
  const idx=pd().lancs.findIndex(x=>x.id===id);
  if(idx<0){showMsg('msg-mel','Lançamento não encontrado','err');return}
  // O cartão acompanha a forma de pagamento: crédito → fatura (cartaoId); débito → só informativo
  // (cartaoDebitoId); outra forma → sem cartão. Antes, trocar crédito por débito deixava a compra na fatura.
  // Moeda: outra moeda sai da fatura (o cartão é na moeda da conta); "moeda" só fica gravada se não for a da conta.
  const moeda=moedaForm('mel'), outraMoeda=moeda!==MOEDA;
  const antes=pd().lancs[idx], cartao=outraMoeda?'':(antes.cartaoId||antes.cartaoDebitoId||'');
  const editado={...antes,desc,val,data,cat,metodo,obs,cartaoId:metodo==='credito'?cartao:''};
  delete editado.cartaoDebitoId; delete editado.moeda;
  if(metodo==='debito'&&cartao) editado.cartaoDebitoId=cartao;
  if(outraMoeda) editado.moeda=moeda;
  pd().lancs[idx]=editado;
  await saveCollection('lancs');
  refreshDash();renderHistorico();
  closeModal('modal-editar-lanc');
}

async function remLanc(id){  pd().lancs=pd().lancs.filter(l=>l.id!==id);
  refreshDash();
  renderHistorico();
  saveCollection('lancs');
}
async function remInv(id){
  pd().invs=pd().invs.filter(i=>i.id!==id);
  renderInvs();
  refreshDash();
  saveCollection('invs');
}
async function limparTudo(){
  if(!confirm('Apagar todos os lançamentos deste perfil?'))return;
  pd().lancs=[];
  refreshDash();
  renderHistorico();
  saveCollection('lancs');
}
function clearForm(p){
  if(p==='r'||p==='d'){
    ['desc','val','obs'].forEach(f=>{const el=document.getElementById(p+'-'+f);if(el)el.value=''});
    dpInit(p+'-data', hoje());
    if(typeof limparAnexoPendente==='function') limparAnexoPendente(p);
    // Depois de salvar, a moeda volta para a da conta (evita lançar em outra moeda sem querer)
    const ms=document.getElementById(p+'-moeda'); if(ms&&ms.value!==MOEDA){ ms.value=MOEDA; aoTrocarMoedaLanc(p); }
    if(p==='d'){
      const sel=document.getElementById('d-parcelado');if(sel)sel.value='avista';
      const pw=document.getElementById('d-parcelas-wrap');if(pw)pw.style.display='none';
      const pp=document.getElementById('d-parcela-preview');if(pp)pp.style.display='none';
      const pn=document.getElementById('d-parcelas');if(pn)pn.value='';
    }
  } else{['nome','val','rent','banco'].forEach(f=>{const el=document.getElementById('i-'+f);if(el)el.value=''});dpInit('i-data',hoje());}
}

