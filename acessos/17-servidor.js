// acessos/17-servidor.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── SERVIDOR (comum a todo o app) ───────────────────────────────────────────
// As telas da equipe (Clientes, Sócios, Painel do negócio...) não ficam no site: o servidor entrega só
// para quem é da equipe (carregarEquipe, acessos/03-perfil-roles.js). Aqui fica só o que o app inteiro usa.
// Site oficial (finrossi.com.br) usa o servidor do Railway; teste no computador
// (localhost ou IP da rede, via "npm run local" no backend) usa o backend local na porta 3000.
const BACKEND_URL = /(^|\.)finrossi\.com\.br$|\.github\.io$/.test(location.hostname)
  ? 'https://finrossi-backend-production1.up.railway.app'
  : 'http://' + (location.hostname || 'localhost') + ':3000';

// A equipe entra no servidor pelo próprio login (o servidor lê o cargo no banco). Antes havia uma
// senha admin compartilhada (ADMIN_SECRET), pedida num prompt e salva no navegador: acabou (B3).
var _adminToken = null;
try{ localStorage.removeItem('fin_admin_token'); }catch(e){}   // apaga a senha antiga que ficou salva
function getAdminToken(){
  if(window._firebaseUser && typeof isEquipe === 'function' && isEquipe()) return 'login';
  goTo('dashboard');
  return null;
}

// Cabeçalhos das chamadas admin: senha admin + login do Firebase de quem está usando.
// O servidor usa o login para saber se é o Master (único que mexe em acessos da equipe).
async function adminHeaders(token, extra){
  const h = {...(extra||{})};
  try{
    const u = window._firebaseUser;
    if(u && u.getIdToken) h.Authorization = 'Bearer ' + await u.getIdToken();
  }catch(e){}
  return h;
}

const ROLES_EQUIPE = ['master','socio','admin','dev'];

// Chamada ao servidor com tempo limite e mensagem clara (antes: "Failed to fetch",
// "Unexpected token" ou "Carregando..." para sempre quando o servidor estava fora do ar)
async function fetchBackend(url, opcoes){
  const ctrl = new AbortController(); const limite = setTimeout(() => ctrl.abort(), 12000);
  let res;
  try{ res = await fetch(url, { ...(opcoes || {}), signal: ctrl.signal }); }
  catch(e){ throw new Error(e && e.name === 'AbortError' ? 'O servidor demorou para responder. Tente de novo em instantes.' : 'Não foi possível falar com o servidor. Ele pode estar fora do ar.'); }
  finally{ clearTimeout(limite); }
  const jsonOriginal = res.json.bind(res);
  res.json = async () => { try{ return await jsonOriginal(); }catch(e){ throw new Error('O servidor respondeu de um jeito inesperado. Ele pode estar fora do ar ou em manutenção.'); } };
  return res;
}
function erroServidorHTML(msg, tentarDeNovo){
  return `<div class="fr-vazio"><b>Servidor indisponível</b><p>${escHTML(msg)}</p>${tentarDeNovo ? `<button class="btn" type="button" onclick="${tentarDeNovo}">Tentar de novo</button>` : ''}</div>`;
}

// Celular no formato (11) 98765-4321 (cadastro da equipe e primeiro acesso)
function ncMascaraTelefone(el){
  const d=el.value.replace(/\D/g,'').slice(0,11);
  el.value=d.length<=2?(d?'('+d:''):d.length<=6?'('+d.slice(0,2)+') '+d.slice(2):d.length<=10?'('+d.slice(0,2)+') '+d.slice(2,6)+'-'+d.slice(6):'('+d.slice(0,2)+') '+d.slice(2,7)+'-'+d.slice(7);
}
