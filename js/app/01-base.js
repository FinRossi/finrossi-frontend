// js/app/01-base.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
const PNAMES={pessoal:'Pessoal',finrossi:'FinRossi'};
// Mesma paleta dourada dos gráficos do Dashboard (antes era arco-íris: verde, azul, roxo...)
const PALETTE=['#E8C560','#C8A96E','#D4B896','#B8935A','#9A8560','#6A5838','#6B7A6E','#8A7A5C','#5F5E5A'];
const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let cp='pessoal', charts={}, fbOk=false;
let _cartaoPage=0;
let _db,_ref,_set,_onValue;

// Dados em memória (sincronizados do Firebase ou localStorage)
let DATA={pessoal:{lancs:[],invs:[],metas:[],objs:[],notas:[],assinaturas:[],recorrentes:[],cartoes:[]},finrossi:{lancs:[],invs:[],metas:[],objs:[],notas:[],assinaturas:[],recorrentes:[],cartoes:[]}};

// Data no fuso do aparelho (Brasil). Antes era UTC: depois das 21h o "hoje" já era o dia seguinte
const hoje=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
// Dinheiro na moeda da conta (js/i18n.js). Em portugu\u00eas com R$, o texto \u00e9 exatamente o de antes.
const fmtR=(v)=>fmtMoeda(v,2);
const fmtR0=(v)=>fmtMoeda(v,0);
const MESES_ROTULO = IDIOMA==='en' ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] : ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const mesLbl=(ym)=>{const[y,m]=ym.split('-');return MESES_ROTULO[+m-1]+'/'+y.slice(2)};
const curMes=()=>hoje().slice(0,7);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
// Impressão digital (SRI) das bibliotecas externas: se o arquivo da CDN for adulterado, o navegador
// recusa carregar. Ao trocar a versão de uma biblioteca, gere o hash novo (sha384) e troque aqui.
const SRI_CDN={
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js':'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js':'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js':'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js':'sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js':'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F',
};
function scriptComIntegridade(s, url){ s.src=url; if(SRI_CDN[url]){ s.integrity=SRI_CDN[url]; s.crossOrigin='anonymous'; } return s; }
const pd=()=>{if(!DATA[cp])DATA[cp]={lancs:[],invs:[],metas:[],objs:[],notas:[],assinaturas:[],recorrentes:[],cartoes:[]};return DATA[cp];};

// Texto digitado pelo usuário nunca entra cru no HTML (protege contra código escondido num texto)
function escHTML(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showMsg(id,txt,cls){const el=document.getElementById(id);if(!el)return;el.textContent=txt;el.className='msg '+cls;setTimeout(()=>{el.textContent='';el.className='msg'},2800)}
function destroyChart(id){if(charts[id]){charts[id].destroy();delete charts[id]}}

// ─── STORAGE ─────────────────────────────────────────────────────────────────
function lsLoad(){
  // Carrega perfis fixos
  ['pessoal','finrossi'].forEach(p=>{
    ['lancs','invs','metas','objs','notas','assinaturas','recorrentes','cartoes'].forEach(t=>{
      try{const v=localStorage.getItem(`fin3_${p}_${t}`);if(v)DATA[p][t]=JSON.parse(v)}catch{}
    });
  });
  // Carrega perfil de cliente (UID) se existir
  const uid = window._firebaseUser?.uid;
  if(uid && uid !== 'pessoal' && uid !== 'finrossi'){
    if(!DATA[uid]) DATA[uid]={lancs:[],invs:[],metas:[],objs:[],notas:[],assinaturas:[],recorrentes:[],cartoes:[]};
    ['lancs','invs','metas','objs','notas','assinaturas','recorrentes','cartoes'].forEach(t=>{
      try{const v=localStorage.getItem(`fin3_${uid}_${t}`);if(v)DATA[uid][t]=JSON.parse(v)}catch{}
    });
  }
}
function lsSave(profile,type){
  if(!DATA[profile]) DATA[profile]={lancs:[],invs:[],metas:[],objs:[],notas:[],assinaturas:[],recorrentes:[],cartoes:[]};
  try{localStorage.setItem(`fin3_${profile}_${type}`,JSON.stringify(DATA[profile][type]))}catch{}
}

async function fbSave(profile,type){
  if(!fbOk||!_db||!_ref||!_set) return;
  try{
    const role = window._userRole || _userRole;
    const savePath = (role==='cliente' && window._firebaseUser?.uid)
      ? `financeiro/${window._firebaseUser.uid}/${type}`
      : `financeiro/${profile}/${type}`;
    // Listas: junta item a item com a nuvem (02-firebase-sync.js). Configurações (ex.: rendaPassiva): grava direto.
    if(Array.isArray(DATA[profile][type]) && TIPOS_SYNC.includes(type)) await gravarLista(profile, type, savePath);
    else await _set(_ref(_db, savePath), DATA[profile][type] || null);
  }catch(e){console.warn('fbSave err',e)}
}

async function saveCollection(type){
  // Garante que DATA[cp] existe
  if(!DATA[cp]) DATA[cp]={lancs:[],invs:[],metas:[],objs:[],notas:[],assinaturas:[],recorrentes:[],cartoes:[]};
  
  // Salva localStorage primeiro (imediato)
  lsSave(cp, type);
  
  // Salva Firebase em background
  if(fbOk && _db && _ref && _set){
    try{
      const role = window._userRole || _userRole;
      // Cliente usa UID como path
      const savePath = (role==='cliente' && window._firebaseUser?.uid)
        ? `financeiro/${window._firebaseUser.uid}/${type}`
        : `financeiro/${cp}/${type}`;
      await gravarLista(cp, type, savePath);   // junta item a item com a nuvem (02-firebase-sync.js)
      // Atualiza badge
      const sb = document.getElementById('sync-badge');
      if(sb){ sb.className='sync-badge ok'; sb.innerHTML='<span class="sync-dot"></span><span class="nav-text">Sincronizado</span>'; }
    }catch(e){
      console.warn('fbSave erro:', e);
      const sb = document.getElementById('sync-badge');
      if(sb){ sb.className='sync-badge local'; sb.innerHTML='<span class="sync-dot"></span><span class="nav-text">Salvo localmente</span>'; }
    }
  } else {
    // Sem Firebase — salvo só local, badge avisa
    const sb = document.getElementById('sync-badge');
    if(sb && sb.className !== 'sync-badge ok'){ sb.innerHTML='<span class="sync-dot"></span><span class="nav-text">Salvo localmente</span>'; }
  }
}

