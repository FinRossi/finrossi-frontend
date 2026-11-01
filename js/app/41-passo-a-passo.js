// js/app/41-passo-a-passo.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── PASSO A PASSO DO PRIMEIRO ACESSO ────────────────────────────────────────
// O app é grande: na primeira entrada do cliente (depois das boas-vindas), um passeio guiado destaca
// cada parte do menu e explica para que serve, com a tela de fundo mudando junto.
// • Só para clientes (a equipe não vê), uma vez por conta: "já vi" fica no aparelho e na nuvem
//   (usuarios/<uid>/preferencias/passoAPassoVisto), para não repetir em outro aparelho.
// • Só mostra telas que o plano libera e itens que estão no menu; no celular usa a barra de baixo.
// • Dá para rever pelo botão "Passo a passo" no Manual.
// Chamado por js/firebase-init.js (talvezIniciarPassoAPasso) quando o app aparece.

const _ppIco = {
  dashboard:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  lancar:'<path d="M12 5v14M5 12h14"/>',
  historico:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  invest:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  metas:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  cartao:'<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  cores:'<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 000 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0022 9.8C22 5.5 17.5 2 12 2z"/>',
  mais:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  manual:'<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  ok:'<polyline points="20 6 9 17 4 12"/>',
  ola:'<path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"/>',
};
// alvo: [computador, celular] — id do elemento ou ".classe"; soPC / soCel: passo só naquele tamanho de tela
const PASSOS_APP = [
  { ico:'ola', tit:'Bem-vindo ao FinRossi', txt:'Em menos de um minuto, mostramos onde fica cada coisa no app. Você pode pular quando quiser.' },
  { ico:'dashboard', tela:'dashboard', alvo:['nav-dashboard', 'mnav-dashboard'], tit:'Dashboard', txt:'Seu resumo do mês: quanto entrou, quanto saiu, o saldo e o seu patrimônio. É a tela que abre sempre que você entra.' },
  { ico:'lancar', tela:'lancamentos', alvo:['nav-lancamentos', 'mnav-lancamentos'], tit:'Lançamentos', txt:'Aqui você registra receitas, despesas e investimentos. Leva poucos segundos, e o dashboard atualiza na hora.' },
  { ico:'historico', tela:'historico', alvo:['nav-historico', 'mnav-historico'], tit:'Histórico', txt:'Todos os seus lançamentos, como um extrato. Filtre por mês e categoria, edite ou apague.' },
  { ico:'invest', tela:'investimentos', alvo:['nav-investimentos'], soPC:true, tit:'Investimentos', txt:'Acompanhe onde o seu dinheiro está aplicado e quanto ele já rendeu.' },
  { ico:'metas', tela:'metas', alvo:['nav-metas', 'mnav-metas'], tit:'Metas', txt:'Defina o que quer conquistar, como a reserva de emergência, e veja o progresso a cada mês.' },
  { ico:'cartao', tela:'cartoes', alvo:['nav-cartoes'], soPC:true, tit:'Cartões de crédito', txt:'Controle a fatura e os gastos de cada cartão, sem surpresa no vencimento.' },
  { ico:'mais', alvo:[null, 'mnav-mais'], soCel:true, tit:'Mais', txt:'Investimentos, cartões, relatórios, o Manual, as configurações e todo o resto ficam aqui.' },
  { ico:'cores', alvo:['.sb-avatar-wrap'], soPC:true, tit:'Do seu jeito', txt:'Tocando no seu nome você abre as configurações: cores do app, tema claro ou escuro e os itens do menu.' },
  { ico:'manual', tela:'manual', alvo:['nav-manual'], soPC:true, tit:'Manual', txt:'Ficou com alguma dúvida? O Manual explica cada tela. Este passo a passo também fica lá, para ver de novo.' },
  { ico:'ok', fim:true, tit:'Tudo pronto!', txt:'Que tal começar registrando a sua primeira receita? É o primeiro passo para ver o seu dinheiro crescer.' },
];

let _pp = null;   // passeio aberto: { passos, i }
const _ppCelular = () => window.innerWidth <= 767;
function _ppElemento(p){
  if(!p.alvo) return null;
  const sel = _ppCelular() ? p.alvo[1] : p.alvo[0];
  if(!sel) return null;
  const el = sel[0] === '.' ? document.querySelector(sel) : document.getElementById(sel);
  if(!el) return null;
  const r = el.getBoundingClientRect();
  return (r.width && r.height && getComputedStyle(el).display !== 'none') ? el : null;
}
function _ppPassosValidos(){
  const cel = _ppCelular();
  return PASSOS_APP.filter(p => {
    if(cel ? p.soPC : p.soCel) return false;
    if(p.tela && typeof verComoPlanoPermite === 'function' && !verComoPlanoPermite(p.tela)) return false;   // o plano não libera
    if(p.alvo && !_ppElemento(p)) return false;                                                            // item escondido do menu
    return true;
  });
}

function _ppChaveLocal(){ return 'fin_passo_a_passo_' + (window._firebaseUser?.uid || 'local'); }
function _ppMarcarVisto(){
  try{ localStorage.setItem(_ppChaveLocal(), '1'); }catch(e){}
  if(typeof prefSalvar === 'function') prefSalvar('passoAPassoVisto', true);
}
// Primeira entrada do cliente: abre sozinho, uma vez
async function talvezIniciarPassoAPasso(){
  if(_pp || (typeof _userRole !== 'undefined' && _userRole !== 'cliente')) return;
  if(typeof _verComoPlano !== 'undefined' && _verComoPlano) return;
  try{ if(localStorage.getItem(_ppChaveLocal()) === '1') return; }catch(e){}
  const u = window._firebaseUser;
  if(u && window._onValue && window._ref && window._db){
    const visto = await new Promise(res => {
      const t = setTimeout(() => res(undefined), 4000);
      try{ window._onValue(window._ref(window._db, `usuarios/${u.uid}/preferencias/passoAPassoVisto`), s => { clearTimeout(t); res(s.val()); }, () => { clearTimeout(t); res(undefined); }, { onlyOnce:true }); }
      catch(e){ clearTimeout(t); res(undefined); }
    });
    if(visto === undefined) return;   // banco não respondeu: tenta na próxima entrada (melhor que repetir para quem já viu)
    if(visto){ try{ localStorage.setItem(_ppChaveLocal(), '1'); }catch(e){} return; }
  }
  // Outra janela já cobre a tela (primeiro acesso, criar senha): não abre por cima
  if(['pa-primeiro-acesso', 'pa-criar-senha'].some(id => { const el = document.getElementById(id); return el && el.style.display !== 'none'; })) return;
  iniciarPassoAPasso();
}

function iniciarPassoAPasso(){
  if(_pp) return;
  if(typeof closeMobileMoreForce === 'function') try{ closeMobileMoreForce(); }catch(e){}
  const passos = _ppPassosValidos();
  _pp = { passos, i:0, voltarPara: document.querySelector('section:not(.section-hidden)')?.id?.replace('sec-', '') || 'dashboard' };
  let m = document.getElementById('pp-tour');
  if(!m){
    m = document.createElement('div');
    m.id = 'pp-tour';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'pp-tit');
    m.innerHTML = `<div class="pp-fundo"></div><div class="pp-foco" aria-hidden="true"></div>
      <div class="pp-cartao">
        <div class="pp-topo"><span class="pp-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg></span><span class="pp-conta"></span>
          <button type="button" class="pp-pular" onclick="fecharPassoAPasso()">Pular</button></div>
        <h3 id="pp-tit"></h3><p class="pp-txt"></p>
        <div class="pp-pontos" aria-hidden="true"></div>
        <div class="pp-acoes"><button type="button" class="btn pp-voltar" onclick="passoAPassoIr(-1)">Voltar</button><button type="button" class="btn primary pp-prox" onclick="passoAPassoIr(1)">Próximo</button></div>
      </div>`;
    document.body.appendChild(m);
    window.addEventListener('resize', () => { if(_pp) _ppPosicionar(); });
    document.addEventListener('keydown', e => {
      if(!_pp) return;
      if(e.key === 'Escape') fecharPassoAPasso();
      else if(e.key === 'ArrowRight') passoAPassoIr(1);
      else if(e.key === 'ArrowLeft') passoAPassoIr(-1);
    });
  }
  m.style.display = 'block';
  document.body.classList.add('pp-aberto');
  requestAnimationFrame(() => m.classList.add('aberto'));
  _ppMostrar();
}

function _ppMostrar(){
  const m = document.getElementById('pp-tour'); if(!m || !_pp) return;
  const p = _pp.passos[_pp.i], n = _pp.passos.length;
  if(p.tela && typeof goTo === 'function') try{ goTo(p.tela); }catch(e){}   // a tela de fundo acompanha o passo
  m.querySelector('.pp-ico svg').innerHTML = _ppIco[p.ico] || '';
  m.querySelector('#pp-tit').textContent = p.tit;
  m.querySelector('.pp-txt').textContent = p.txt;
  m.querySelector('.pp-conta').textContent = `${_pp.i + 1} de ${n}`;
  m.querySelector('.pp-pontos').innerHTML = _pp.passos.map((_, k) => `<i class="${k === _pp.i ? 'on' : k < _pp.i ? 'feito' : ''}"></i>`).join('');
  m.querySelector('.pp-voltar').style.visibility = _pp.i === 0 ? 'hidden' : '';
  m.querySelector('.pp-pular').style.visibility = p.fim ? 'hidden' : '';
  const prox = m.querySelector('.pp-prox');
  prox.textContent = p.fim ? 'Fazer meu primeiro lançamento' : _pp.i === 0 ? 'Começar' : 'Próximo';
  m.classList.toggle('pp-fim', !!p.fim);
  // Espera a tela trocar e o item rolar para a vista antes de medir
  const el = _ppElemento(p);
  if(el) try{ el.scrollIntoView({ block:'nearest' }); }catch(e){}
  setTimeout(_ppPosicionar, 60);
  setTimeout(() => prox.focus({ preventScroll:true }), 80);
}

function _ppPosicionar(){
  const m = document.getElementById('pp-tour'); if(!m || !_pp) return;
  const p = _pp.passos[_pp.i], el = _ppElemento(p);
  const foco = m.querySelector('.pp-foco'), cartao = m.querySelector('.pp-cartao');
  const W = window.innerWidth, H = window.innerHeight, folga = 8, margem = 14;
  if(!el){
    // Sem alvo (abertura e fim): cartão no meio, sem recorte
    m.classList.add('pp-centro');
    foco.style.cssText = `left:${W / 2}px;top:${H / 2}px;width:0;height:0`;
    cartao.style.left = Math.max(16, (W - cartao.offsetWidth) / 2) + 'px';
    cartao.style.top = Math.max(16, (H - cartao.offsetHeight) / 2) + 'px';
    return;
  }
  m.classList.remove('pp-centro');
  const r = el.getBoundingClientRect();
  foco.style.cssText = `left:${r.left - folga}px;top:${r.top - folga}px;width:${r.width + folga * 2}px;height:${r.height + folga * 2}px`;
  const cw = cartao.offsetWidth, ch = cartao.offsetHeight;
  let x, y;
  if(W - r.right > cw + margem * 2){ x = r.right + folga + margem; y = r.top + r.height / 2 - ch / 2; }   // à direita (menu lateral)
  else if(r.top > ch + margem * 2){ x = r.left + r.width / 2 - cw / 2; y = r.top - folga - margem - ch; }  // acima (barra de baixo do celular)
  else { x = r.left + r.width / 2 - cw / 2; y = r.bottom + folga + margem; }                             // abaixo
  cartao.style.left = Math.min(Math.max(12, x), W - cw - 12) + 'px';
  cartao.style.top = Math.min(Math.max(12, y), H - ch - 12) + 'px';
}

function passoAPassoIr(d){
  if(!_pp) return;
  const p = _pp.passos[_pp.i];
  if(d > 0 && p.fim){
    fecharPassoAPasso(true);
    try{ goTo('lancamentos'); if(typeof switchTab === 'function') switchTab('receita'); }catch(e){}
    return;
  }
  const i = _pp.i + d;
  if(i < 0 || i >= _pp.passos.length) return;
  _pp.i = i;
  _ppMostrar();
}

function fecharPassoAPasso(concluiu){
  if(!_pp) return;
  const voltar = _pp.voltarPara;
  _pp = null;
  _ppMarcarVisto();
  document.body.classList.remove('pp-aberto');
  const m = document.getElementById('pp-tour');
  if(m){ m.classList.remove('aberto'); setTimeout(() => { if(!_pp) m.style.display = 'none'; }, 250); }
  if(!concluiu && typeof goTo === 'function') try{ goTo(voltar === 'manual' ? 'manual' : 'dashboard'); }catch(e){}
}
