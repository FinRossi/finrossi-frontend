// js/i18n.js — idioma e moeda. Carregado no <head> do app e da landing, ANTES de todos os scripts.
// ─── Regras ──────────────────────────────────────────────────────────────────
// • Português (pt-BR) é o original do FinRossi. Em português nada é traduzido nem baixado a mais, e
//   com R$ os formatos são exatamente os de antes (fmtMoeda devolve o mesmo texto que o fmtR antigo).
// • Idioma: o escolhido pela pessoa (fin_idioma) ou o do aparelho — inglês → en; qualquer outro → pt.
// • Moeda: a da CONTA (gravada no cadastro: BRL no Brasil, AUD na Austrália; firebase-init.js aplica
//   no login). Antes do login (landing), pelo fuso do aparelho. Idioma e moeda são independentes:
//   brasileiro morando na Austrália = português + A$; australiano = inglês + A$.
// • Inglês: js/i18n-en.js (dicionário) é baixado só nesse caso e traduz a tela inteira, inclusive o que
//   os scripts desenham depois (ver iniciarTraducao). Texto sem tradução continua em português.
(function(){
  var ler = function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } };
  var escolhido = ler('fin_idioma');
  var aparelho = (navigator.languages && navigator.languages[0]) || navigator.language || 'pt-BR';
  window.IDIOMA = (escolhido === 'en' || escolhido === 'pt') ? escolhido : (/^en\b/i.test(aparelho) ? 'en' : 'pt');
  var fuso = ''; try{ fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }catch(e){}
  window.MOEDA_PELO_FUSO = /^Australia\//.test(fuso) ? 'AUD' : 'BRL';
  var m = ler('fin_moeda');
  window.MOEDA = (m === 'AUD' || m === 'BRL') ? m : window.MOEDA_PELO_FUSO;
  window.LOCALE = window.IDIOMA === 'en' ? 'en-AU' : 'pt-BR';
  document.documentElement.lang = window.LOCALE;

  // Inglês: esconde a página até o dicionário chegar (sem "piscar" em português) — no máximo 2,5 s
  if(window.IDIOMA === 'en'){
    var st = document.createElement('style'); st.id = 'i18n-espera';
    st.textContent = 'html.i18n-espera body{visibility:hidden}';
    document.head.appendChild(st);
    document.documentElement.classList.add('i18n-espera');
    setTimeout(function(){ document.documentElement.classList.remove('i18n-espera'); }, 2500);
    var s = document.createElement('script');
    s.src = '/js/i18n-en.js?v=8';
    s.onload = function(){ if(window.iniciarTraducao) window.iniciarTraducao(); };
    s.onerror = function(){ document.documentElement.classList.remove('i18n-espera'); };
    document.head.appendChild(s);
  }
})();

// Troca de idioma pela pessoa (configurações / landing): guarda e recarrega a página
function trocarIdioma(id){
  try{ localStorage.setItem('fin_idioma', id === 'en' ? 'en' : 'pt'); }catch(e){}
  location.reload();
}
// Moeda da conta (login): guarda para as próximas aberturas; devolve true se mudou
function definirMoeda(m){
  m = m === 'AUD' ? 'AUD' : 'BRL';
  try{ localStorage.setItem('fin_moeda', m); }catch(e){}
  var mudou = window.MOEDA !== m;
  window.MOEDA = m;
  ajustarRotulosMoeda();
  return mudou;
}

// Português com A$ (brasileiro na Austrália): os rótulos fixos que citam o real passam para A$
// ("Valor (R$)" → "Valor (A$)"). Em inglês o dicionário já cuida; com R$ não faz nada.
function ajustarRotulosMoeda(){
  if(window.MOEDA === 'BRL' || window.IDIOMA !== 'pt' || !document.body) return;
  var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n, nos = [];
  while((n = w.nextNode())){ if(/R\$|em reais/.test(n.nodeValue) && n.parentElement && !n.parentElement.closest('script,style,textarea')) nos.push(n); }
  nos.forEach(function(no){
    no.nodeValue = no.nodeValue.replace(/\(R\$\)/g, '(A$)').replace(/^(\s*)R\$(\s*)$/, '$1A$$$2').replace('Valores em reais.', 'Valores em dólar australiano (A$).');
  });
  document.querySelectorAll('[placeholder*="R$"]').forEach(function(el){ el.setAttribute('placeholder', el.getAttribute('placeholder').replace(/R\$/g, 'A$')); });
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ajustarRotulosMoeda); else ajustarRotulosMoeda();

// ─── Dinheiro ────────────────────────────────────────────────────────────────
function simboloMoeda(){ return window.MOEDA === 'AUD' ? (window.IDIOMA === 'en' ? '$' : 'A$') : 'R$'; }
function fmtNumero(v, casas){
  return Number(v).toLocaleString(window.LOCALE, { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
function fmtMoeda(v, casas){
  var n = Number(v);
  if(window.MOEDA === 'BRL' && window.IDIOMA === 'pt') return 'R$ ' + fmtNumero(n, casas);   // Brasil: igual a sempre
  if(window.IDIOMA === 'en') return (n < 0 ? '-' : '') + simboloMoeda() + fmtNumero(Math.abs(n), casas);   // $1,234.56
  return simboloMoeda() + ' ' + fmtNumero(n, casas);                                                 // A$ 1.234,56
}

// ─── Preços dos planos por moeda ─────────────────────────────────────────────
// BRL: os de sempre (iguais ao servidor, asaas.js). AUD: com o GST de 10% incluído (lei australiana).
// ⚠️ AUD: valores sugeridos, aguardando o Lucas confirmar. Anual = 12 meses com 20% de desconto.
var PRECOS_PLANO = {
  BRL: { mensal: { essencial: 9.90, evolucao: 24.90, patrimonio: 49.90 }, anual: { essencial: 95.04, evolucao: 239.04, patrimonio: 479.04 } },
  AUD: { mensal: { essencial: 6.99, evolucao: 14.99, patrimonio: 29.99 }, anual: { essencial: 67.10, evolucao: 143.90, patrimonio: 287.90 } },
};
function precoPlano(plano, periodo){
  var t = PRECOS_PLANO[window.MOEDA] || PRECOS_PLANO.BRL;
  return (t[periodo || 'mensal'] || {})[plano] || 0;
}
// "R$ 9,90/mês" — no Brasil, exatamente o texto de antes (com espaço comum)
function precoTexto(plano){
  var br = window.MOEDA === 'BRL' && window.IDIOMA === 'pt';
  if(plano === 'gratuito') return br ? 'R$ 0' : fmtMoeda(0, 0);
  var v = precoPlano(plano, 'mensal');
  if(br) return 'R$ ' + fmtNumero(v, 2) + '/mês';
  return fmtMoeda(v, 2) + (window.IDIOMA === 'en' ? '/month' : '/mês');
}
