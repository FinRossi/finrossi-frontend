// js/app/02-firebase-sync.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
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
            if(val){
              TIPOS.forEach(t=>{
                if(val[t]!==undefined){DATA[p][t]=Array.isArray(val[t])?val[t]:Object.values(val[t]||{});lsSave(p,t);}
              });
              if(val.categorias) DATA[p].categorias=val.categorias;
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
          if(val){
            TIPOS.forEach(t=>{
              if(val[t]!==undefined){
                DATA[uid][t]=Array.isArray(val[t])?val[t]:Object.values(val[t]||{});
                try{localStorage.setItem(`fin3_${uid}_${t}`,JSON.stringify(DATA[uid][t]));}catch{}
              }
            });
            if(val.categorias) DATA[uid].categorias=val.categorias;
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
  refreshAll();
  initFB();
});

