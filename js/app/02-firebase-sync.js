// js/app/02-firebase-sync.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── Recuperação única: juntar o aparelho com a nuvem ────────────────────────
// De 25/06 a 21/10/2026 as regras do banco recusavam as gravações do app: o que foi lançado
// nesse período ficou só no aparelho. Na primeira leitura da nuvem em cada aparelho (e perfil),
// junta os dois lados pelo id — nada some —, grava a união na nuvem e só depois volta à
// sincronização normal (a nuvem manda). Se a gravação falhar, tenta de novo na próxima abertura.
const TIPOS_SYNC = ['lancs','invs','metas','objs','notas','assinaturas','recorrentes','cartoes'];
const chaveJuntado = perfil => `fin_juntado_nuvem_v1_${perfil}`;
function precisaJuntar(perfil){
  try{ return !localStorage.getItem(chaveJuntado(perfil)); }catch(e){ return false; }
}
function lerLocal(chave){
  try{ const v = localStorage.getItem(chave); return v ? JSON.parse(v) : null; }catch(e){ return null; }
}
// Lista da nuvem + o que só existe no aparelho (mesmo id: vale a nuvem)
function juntarLista(local, nuvem){
  const lista = (Array.isArray(nuvem) ? nuvem : Object.values(nuvem || {})).filter(Boolean);
  const ids = new Set(lista.filter(x => x.id != null).map(x => String(x.id)));
  let novos = 0;
  (Array.isArray(local) ? local : []).forEach(x => {
    if(x && x.id != null && !ids.has(String(x.id))){ lista.push(x); ids.add(String(x.id)); novos++; }
  });
  return { lista, novos };
}
function juntarAparelhoENuvem(perfil, val, base){
  if(!DATA[perfil]) DATA[perfil]={lancs:[],invs:[],metas:[],objs:[],notas:[],assinaturas:[],recorrentes:[],cartoes:[]};
  const gravacoes = [];
  let total = 0;
  TIPOS_SYNC.forEach(t => {
    const { lista, novos } = juntarLista(DATA[perfil][t], val[t]);
    DATA[perfil][t] = lista; lsSave(perfil, t);
    if(novos){ total += novos; gravacoes.push(_set(_ref(_db, `${base}/${t}`), lista)); }
  });
  // Categorias e renda passiva: vale a do aparelho (a mais recente); sem ela, a da nuvem
  ['categorias','rendaPassiva'].forEach(campo => {
    const local = lerLocal(`fin3_${perfil}_${campo}`);
    if(local){
      DATA[perfil][campo] = local;
      if(JSON.stringify(local) !== JSON.stringify(val[campo] || null)) gravacoes.push(_set(_ref(_db, `${base}/${campo}`), local));
    } else if(val[campo]){
      DATA[perfil][campo] = val[campo];
      try{ localStorage.setItem(`fin3_${perfil}_${campo}`, JSON.stringify(val[campo])); }catch(e){}
    }
  });
  Promise.all(gravacoes)
    .then(() => {
      try{ localStorage.setItem(chaveJuntado(perfil), new Date().toISOString()); }catch(e){}
      if(total) console.info(`[Sync] ${total} registro(s) que estavam só neste aparelho foram enviados para a nuvem (${perfil}).`);
    })
    .catch(e => console.warn('[Sync] Não deu para juntar com a nuvem agora; tenta de novo na próxima abertura.', e && e.message));
}

// ─── FIREBASE INIT ────────────────────────────────────────────────────────────
function initFB(){
  const f=window._firebase;
  if(!f) return;
  fbOk=f.firebaseOk||false;
  if(!fbOk){ lsLoad(); refreshAll(); return; }

  // Pega referências e expõe globalmente
  _db=f.db; _ref=f.ref; _set=f.set; _onValue=f.onValue;
  window._db=_db; window._ref=_ref; window._set=_set; window._onValue=_onValue;

  const sb=document.getElementById('sync-badge');
  if(sb){sb.className='sync-badge ok';sb.innerHTML='<span class="sync-dot"></span><span class="nav-text">Sincronizado</span>';}

  const TIPOS=['lancs','invs','metas','objs','notas','assinaturas','recorrentes','cartoes'];

  if(isAdmin()){
    ['pessoal','finrossi'].forEach(p=>{
      try{
        _onValue(_ref(_db,`financeiro/${p}`),(snap)=>{
          try{
            const val=snap.val();
            if(precisaJuntar(p)){ juntarAparelhoENuvem(p, val||{}, `financeiro/${p}`); if(p===cp) refreshAll(); return; }
            if(val){
              TIPOS.forEach(t=>{
                if(val[t]!==undefined){DATA[p][t]=Array.isArray(val[t])?val[t]:Object.values(val[t]||{});lsSave(p,t);}
              });
              if(val.categorias) DATA[p].categorias=val.categorias;
              if(val.rendaPassiva){ DATA[p].rendaPassiva=val.rendaPassiva; lsSave(p,'rendaPassiva'); }
            }
            if(p===cp) refreshAll();
          }catch(e){console.warn('snap err',e)}
        });
      }catch(e){console.warn('listener err',e)}
    });
  } else {
    const uid=window._firebaseUser?.uid;
    if(uid){
      if(!DATA[uid]) DATA[uid]={lancs:[],invs:[],metas:[],objs:[],notas:[],assinaturas:[],recorrentes:[],cartoes:[]};
      cp=uid;
      _onValue(_ref(_db,`financeiro/${uid}`),(snap)=>{
        try{
          const val=snap.val();
          if(precisaJuntar(uid)){ juntarAparelhoENuvem(uid, val||{}, `financeiro/${uid}`); refreshAll(); return; }
          if(val){
            TIPOS.forEach(t=>{
              if(val[t]!==undefined){
                DATA[uid][t]=Array.isArray(val[t])?val[t]:Object.values(val[t]||{});
                try{localStorage.setItem(`fin3_${uid}_${t}`,JSON.stringify(DATA[uid][t]));}catch{}
              }
            });
            if(val.categorias) DATA[uid].categorias=val.categorias;
            if(val.rendaPassiva){ DATA[uid].rendaPassiva=val.rendaPassiva; lsSave(uid,'rendaPassiva'); }
          }
          refreshAll();
        }catch(e){console.warn('snap err cliente',e)}
      });
    }
  }
}
// ─── INICIALIZAÇÃO — aguarda Firebase estar pronto ────────────────────────────
document.addEventListener('fbReady', () => {
  initTema();   // aplica tema salvo antes de renderizar
  lsLoad();
  // Se a entrada já montou e mostrou o app, não redesenha tudo de novo (os gráficos
  // repetiam a animação logo depois de aparecer); os dados da nuvem redesenham quando chegarem
  if(document.getElementById('tela-app')?.style.display !== 'flex') refreshAll();
  initFB();
});

