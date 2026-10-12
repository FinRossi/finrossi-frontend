// planos/evolucao/12-recorrentes.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── EMPRESAS DASHBOARD ───────────────────────────────────────────────────────
// ─── ASSINATURAS ─────────────────────────────────────────────────────────────
const ASSIN_ICONS={'Streaming':'🎬','Música':'🎵','Saúde/Academia':'💪','Educação':'📚','Software':'💻','E-commerce':'🛒','Outros':'📦'};

function getRecorr(){return pd().recorrentes||[];}
function saveRecorr(){lsSave(cp,'recorrentes');fbSave(cp,'recorrentes');}

function openModalRecorr(id){
  document.getElementById('recorr-modal-title').textContent=id?'Editar conta':'Nova conta recorrente';
  document.getElementById('recorr-edit-id').value=id||'';
  if(id){const r=getRecorr().find(x=>x.id===id);if(r){document.getElementById('recorr-desc').value=r.desc;document.getElementById('recorr-val').value=r.val;document.getElementById('recorr-cat').value=r.cat;document.getElementById('recorr-dia').value=r.dia;}}
  else{['recorr-desc','recorr-val','recorr-dia'].forEach(i=>document.getElementById(i).value='');}
  document.getElementById('modal-recorr').classList.add('open');
}
function salvarRecorr(){
  const desc=document.getElementById('recorr-desc').value.trim();
  const val=parseFloat(document.getElementById('recorr-val').value);
  const cat=document.getElementById('recorr-cat').value;
  const dia=parseInt(document.getElementById('recorr-dia').value)||1;
  if(!desc){showMsg('msg-recorr','Informe a descrição','err');return;}
  if(!val||val<=0){showMsg('msg-recorr','Valor inválido','err');return;}
  const id=document.getElementById('recorr-edit-id').value;
  if(!pd().recorrentes)pd().recorrentes=[];
  if(id){const i=pd().recorrentes.findIndex(r=>r.id===id);if(i>=0)pd().recorrentes[i]={...pd().recorrentes[i],desc,val,cat,dia};}
  else{pd().recorrentes.push({id:uid(),desc,val,cat,dia,ultimoMes:''});}
  saveRecorr();closeModal('modal-recorr');renderRecorrentes();
}
function remRecorr(id){
  if(!confirm('Excluir esta conta recorrente?'))return;
  pd().recorrentes=getRecorr().filter(r=>r.id!==id);
  saveRecorr();renderRecorrentes();
}
function gerarMesRecorrentes(){
  const mes=curMes();
  const recorr=getRecorr();
  if(!recorr.length){alert('Nenhuma conta recorrente cadastrada.');return;}
  const jageradas=recorr.filter(r=>r.ultimoMes===mes);
  if(jageradas.length===recorr.length){alert('Todas as contas já foram geradas para este mês!');return;}
  const paraGerar=recorr.filter(r=>r.ultimoMes!==mes);
  const [yr,mo]=mes.split('-');
  paraGerar.forEach(r=>{
    const dia=Math.min(r.dia,new Date(+yr,+mo,0).getDate());
    const data=`${yr}-${mo}-${String(dia).padStart(2,'0')}`;
    pd().lancs.push({id:uid(),tipo:'despesa',desc:r.desc+' (recorrente)',val:r.val,data,cat:r.cat,obs:'Gerado automaticamente'});
    r.ultimoMes=mes;
  });
  lsSave(cp,'lancs');saveRecorr();
  alert(`${paraGerar.length} lançamento(s) gerado(s) com sucesso!`);
  renderRecorrentes();refreshDash();
}
