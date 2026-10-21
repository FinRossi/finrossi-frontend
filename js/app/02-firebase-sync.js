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
      TIPOS_SYNC.forEach(t => lembrarIds(perfil, t, DATA[perfil][t]));   // a partir daqui vale a sincronização item a item
      if(total) console.info(`[Sync] ${total} registro(s) que estavam só neste aparelho foram enviados para a nuvem (${perfil}).`);
    })
    .catch(e => console.warn('[Sync] Não deu para juntar com a nuvem agora; tenta de novo na próxima abertura.', e && e.message));
}

// ─── Sincronização item a item (F6) ──────────────────────────────────────────
// Antes cada gravação trocava a lista inteira na nuvem pela do aparelho, e cada aviso da nuvem
// trocava a do aparelho pela da nuvem: com dois aparelhos abertos (ou lançando sem internet e
// recarregando) um lançamento sumia. Agora o aparelho lembra quais itens a nuvem tinha da última
// vez que viu ("conhecidos") e junta item por item:
//   • está nos dois                      → fica (versão do aparelho ao gravar; da nuvem ao receber)
//   • só no aparelho e não era conhecido → criado aqui → fica e sobe
//   • só no aparelho e era conhecido     → apagado em outro aparelho → sai
//   • só na nuvem e não era conhecido    → criado em outro aparelho → fica
//   • só na nuvem e era conhecido        → apagado aqui → sai
const chaveIds = (p, t) => `fin_ids_nuvem_${p}_${t}`;
const listaDe = v => (Array.isArray(v) ? v : Object.values(v || {})).filter(Boolean);
function idsConhecidos(p, t){
  try{ return new Set(JSON.parse(localStorage.getItem(chaveIds(p, t)) || '[]')); }catch(e){ return new Set(); }
}
function lembrarIds(p, t, lista){
  try{ localStorage.setItem(chaveIds(p, t), JSON.stringify(listaDe(lista).filter(x => x.id != null).map(x => String(x.id)))); }catch(e){}
}
function juntarComNuvem(local, nuvem, conhecidos, preferir){
  const N = new Map(listaDe(nuvem).filter(x => x.id != null).map(x => [String(x.id), x]));
  const vistos = new Set(), r = [];
  listaDe(local).forEach(x => {
    if(x.id == null){ r.push(x); return; }               // itens antigos sem id: ficam como estão
    const id = String(x.id); vistos.add(id);
    if(N.has(id)) r.push(preferir === 'local' ? x : N.get(id));
    else if(!conhecidos.has(id)) r.push(x);
  });
  N.forEach((x, id) => { if(!vistos.has(id) && !conhecidos.has(id)) r.push(x); });
  return r;
}
const mesmosIds = (a, b) => {
  const ia = listaDe(a).filter(x => x.id != null).map(x => String(x.id)).sort().join('|');
  const ib = listaDe(b).filter(x => x.id != null).map(x => String(x.id)).sort().join('|');
  return ia === ib;
};
// Chegou a lista da nuvem: junta com o aparelho e, se o aparelho tinha algo a mais/a menos, sobe
function sincronizarLista(perfil, tipo, nuvem, base){
  const juntada = juntarComNuvem(DATA[perfil][tipo], nuvem, idsConhecidos(perfil, tipo), 'nuvem');
  lembrarIds(perfil, tipo, nuvem);                       // o que a nuvem tem agora (confirmado)
  DATA[perfil][tipo] = juntada; lsSave(perfil, tipo);
  if(!mesmosIds(juntada, nuvem)){
    gravarLista(perfil, tipo, `${base}/${tipo}`)
      .catch(e => console.warn('[Sync] Não subiu agora; tenta de novo na próxima mudança.', e && e.message));
  }
}
// Lê um caminho uma vez (sem internet: undefined depois de 4 s)
function lerUmaVez(caminho){
  return new Promise(res => {
    let feito = false; const fim = v => { if(!feito){ feito = true; res(v); } };
    try{ _onValue(_ref(_db, caminho), s => fim(s.val()), () => fim(undefined), { onlyOnce: true }); }catch(e){ fim(undefined); }
    setTimeout(() => fim(undefined), 4000);
  });
}
// Gravar uma lista: junta com o que está na nuvem agora (preferindo a edição deste aparelho).
// Com transação, ler + juntar + gravar é uma coisa só: se outro aparelho gravar no meio, a
// Firebase repete a junção com a versão nova — dois aparelhos gravando juntos não se atropelam.
async function gravarLista(perfil, tipo, caminho){
  const tx = window._firebase && window._firebase.runTransaction;
  if(tx){
    const conhecidos = idsConhecidos(perfil, tipo);
    const r = await tx(_ref(_db, caminho), atual => {
      const lista = juntarComNuvem(DATA[perfil][tipo], atual, conhecidos, 'local');
      return lista.length ? lista : null;
    }, { applyLocally: false });   // sem resultado provisório: só o que a nuvem confirmou
    if(r && r.committed){
      // Junta (não substitui): o que foi lançado aqui enquanto esta gravação andava continua
      // no aparelho e sobe na própria gravação
      const confirmada = r.snapshot.val();
      DATA[perfil][tipo] = juntarComNuvem(DATA[perfil][tipo], confirmada, conhecidos, 'local');
      lsSave(perfil, tipo);
      lembrarIds(perfil, tipo, confirmada);
    }
    return;
  }
  const nuvem = await lerUmaVez(caminho);
  if(nuvem !== undefined){
    DATA[perfil][tipo] = juntarComNuvem(DATA[perfil][tipo], nuvem, idsConhecidos(perfil, tipo), 'local');
    lsSave(perfil, tipo);
  }
  const lista = DATA[perfil][tipo] || [];
  await _set(_ref(_db, caminho), lista.length ? lista : null);
  lembrarIds(perfil, tipo, lista);
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
            TIPOS.forEach(t=>sincronizarLista(p, t, (val||{})[t], `financeiro/${p}`));   // item a item (F6)
            if(val){
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
          TIPOS.forEach(t=>sincronizarLista(uid, t, (val||{})[t], `financeiro/${uid}`));   // item a item (F6)
          if(val){
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

