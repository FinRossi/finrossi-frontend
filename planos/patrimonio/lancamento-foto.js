// planos/patrimonio/lancamento-foto.js — "Lançar por foto" (exclusivo do plano Patrimônio)
// O cliente fotografa a nota fiscal / cupom / comprovante e o app preenche o lançamento.
// Tudo roda no próprio aparelho, de graça: OCR com Tesseract (código aberto) + regras de
// leitura de comprovantes brasileiros. A foto não sai do aparelho. O cliente confere e salva.

const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

function fotoTemAcesso(){ return planoLibera('foto'); }

function atualizarBotaoFoto(){
  const el = document.getElementById('lanc-foto-wrap');
  if(el) el.style.display = fotoTemAcesso() ? '' : 'none';
  document.querySelectorAll('.anexo-campo').forEach(c => { c.hidden = !fotoTemAcesso(); });
}

// "Escolher da galeria": fotos ou prints já salvos
function abrirLancamentoFoto(){
  if(!fotoTemAcesso()) return;
  const inp = document.getElementById('inp-lanc-foto');
  if(inp){ inp.value=''; inp.click(); }
}

// ── "Tirar foto": câmera ao vivo dentro do app ───────────────────────────────
// O navegador só libera a câmera ao vivo em endereço seguro (https ou localhost).
// Fora disso (ex.: teste pelo IP da rede), usa a câmera nativa do celular.
let _camStream = null, _camFacing = 'environment', _camDestino = null;

// Abre a câmera e entrega a foto capturada para "destino" (leitura do comprovante ou anexo)
function tirarFotoPara(destino, inputNativoId){
  if(!fotoTemAcesso()) return;
  _camDestino = destino;
  const ok = window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  if(!ok){
    const inp = document.getElementById(inputNativoId);
    if(inp){ inp.value=''; inp.click(); }
    return;
  }
  _abrirCamera();
}

function tirarFotoLanc(){ tirarFotoPara(processarFotoLanc, 'inp-lanc-camera'); }

function _modalCamera(){
  let m = document.getElementById('modal-camera');
  if(m) return m;
  m = document.createElement('div');
  m.className = 'modal-overlay'; m.id = 'modal-camera';
  m.innerHTML = `<div class="modal cam-modal">
    <h3>Fotografe o comprovante</h3>
    <div class="cam-palco">
      <video id="cam-video" autoplay playsinline muted></video>
      <div class="cam-moldura" aria-hidden="true"></div>
      <div class="cam-contagem" id="cam-contagem" aria-live="assertive" hidden></div>
      <p class="cam-erro" id="cam-erro" hidden></p>
    </div>
    <p class="cam-dica">Enquadre o comprovante inteiro na moldura, com boa luz e o papel esticado.</p>
    <div class="cam-timer"><span>Timer</span><div class="ced-seg" role="tablist" aria-label="Timer da câmera">
      <button type="button" data-t="0" onclick="_definirTimer(0)">Desligado</button>
      <button type="button" data-t="3" onclick="_definirTimer(3)">3 s</button>
      <button type="button" data-t="5" onclick="_definirTimer(5)">5 s</button>
    </div></div>
    <div class="btn-row cam-acoes">
      <button class="btn primary" id="cam-capturar" onclick="_capturarComTimer()">Capturar</button>
      <button class="btn" id="cam-trocar" onclick="_trocarCamera()" hidden>Trocar câmera</button>
      <button class="btn" onclick="_fecharCamera()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  return m;
}

async function _abrirCamera(){
  const m = _modalCamera();
  m.classList.add('open');
  _cancelarContagem();
  _definirTimer(_camTimer);
  const erro = document.getElementById('cam-erro');
  erro.hidden = true;
  document.getElementById('cam-capturar').disabled = true;
  _pararCamera();
  // Se o navegador estiver esperando a permissão, orienta em vez de mostrar tela preta
  const aviso = setTimeout(() => {
    if(!_camStream && erro.hidden){
      erro.hidden = false;
      erro.textContent = 'Toque em "Permitir" para o FinRossi usar a câmera.';
    }
  }, 1500);
  try{
    _camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: _camFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
    clearTimeout(aviso);
    erro.hidden = true;
    const v = document.getElementById('cam-video');
    v.srcObject = _camStream;
    await v.play().catch(()=>{});
    // A câmera começa escura enquanto ajusta a luz — libera o "Capturar" após estabilizar
    await new Promise(r => setTimeout(r, 800));
    document.getElementById('cam-capturar').disabled = false;
    const cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    document.getElementById('cam-trocar').hidden = cams.length < 2;
  }catch(e){
    clearTimeout(aviso);
    erro.hidden = false;
    erro.innerHTML = (e && e.name === 'NotAllowedError')
      ? 'O acesso à câmera foi bloqueado. Libere a câmera nas permissões do navegador ou use "Escolher da galeria".'
      : 'Não encontrei uma câmera disponível. Use "Escolher da galeria".';
  }
}

function _trocarCamera(){
  _camFacing = _camFacing === 'environment' ? 'user' : 'environment';
  _abrirCamera();
}

function _pararCamera(){
  if(_camStream){ _camStream.getTracks().forEach(t => t.stop()); _camStream = null; }
}

function _fecharCamera(){
  _cancelarContagem();
  _pararCamera();
  const m = document.getElementById('modal-camera');
  if(m) m.classList.remove('open');
}

// ── Timer (até 5 segundos) ───────────────────────────────────────────────────
let _camTimer = (() => { try{ return Math.min(5, Math.max(0, parseInt(localStorage.getItem('fin_cam_timer') || '0', 10) || 0)); }catch(e){ return 0; } })();
let _contagemId = null;

function _definirTimer(seg){
  _camTimer = Math.min(5, Math.max(0, seg | 0));
  try{ localStorage.setItem('fin_cam_timer', String(_camTimer)); }catch(e){}
  document.querySelectorAll('.cam-timer [data-t]').forEach(b => {
    const ativo = +b.dataset.t === _camTimer;
    b.classList.toggle('ativo', ativo); b.setAttribute('aria-selected', ativo);
  });
}

function _cancelarContagem(){
  if(_contagemId){ clearInterval(_contagemId); _contagemId = null; }
  const el = document.getElementById('cam-contagem'); if(el) el.hidden = true;
  const btn = document.getElementById('cam-capturar'); if(btn) btn.textContent = 'Capturar';
}

// Sem timer: captura na hora. Com timer: contagem regressiva grande e captura no fim;
// tocar de novo durante a contagem cancela.
function _capturarComTimer(){
  if(_contagemId){ _cancelarContagem(); return; }
  if(!_camTimer) return _capturarFoto();
  let resta = _camTimer;
  const el = document.getElementById('cam-contagem'), btn = document.getElementById('cam-capturar');
  el.hidden = false; el.textContent = resta; btn.textContent = 'Cancelar timer';
  _contagemId = setInterval(() => {
    resta--;
    if(resta > 0){ el.textContent = resta; return; }
    _cancelarContagem();
    _capturarFoto();
  }, 1000);
}

function _capturarFoto(){
  const v = document.getElementById('cam-video');
  if(!v || !v.videoWidth) return;
  const c = document.createElement('canvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0);
  // Captura escura ou vazia (câmera ainda iniciando, lente tampada): pede outra, sem mandar ao leitor
  const amostra = document.createElement('canvas'); amostra.width = amostra.height = 48;
  const ga = amostra.getContext('2d'); ga.drawImage(c, 0, 0, 48, 48);
  const px = ga.getImageData(0, 0, 48, 48).data;
  let soma = 0, min = 255, max = 0;
  for(let i = 0; i < px.length; i += 4){ const g = (px[i] + px[i+1] + px[i+2]) / 3; soma += g; if(g < min) min = g; if(g > max) max = g; }
  if(soma / (px.length / 4) < 25 || max - min < 20){
    const erro = document.getElementById('cam-erro');
    erro.hidden = false;
    erro.textContent = 'A foto saiu escura ou vazia. Aponte para o comprovante com boa luz e toque em "Capturar" de novo.';
    setTimeout(() => { erro.hidden = true; }, 2500);
    return;
  }
  _fecharCamera();
  c.toBlob(blob => { if(blob) (_camDestino || processarFotoLanc)(blob); }, 'image/jpeg', 0.92);
}

// ── Janela de progresso ──────────────────────────────────────────────────────
function _fotoStatus(texto, pct){
  let m = document.getElementById('modal-lanc-foto');
  if(!m){
    m = document.createElement('div');
    m.className = 'modal-overlay'; m.id = 'modal-lanc-foto';
    m.innerHTML = `<div class="modal" style="max-width:380px;text-align:center">
      <h3 style="margin-bottom:8px">Lendo o comprovante</h3>
      <p id="lf-texto" style="font-size:13px;color:var(--muted);margin-bottom:14px"></p>
      <div class="pt-barra"><i id="lf-barra" style="width:0%"></i></div>
      <div class="btn-row" style="justify-content:center"><button class="btn" id="lf-fechar" onclick="closeModal('modal-lanc-foto')" style="display:none">Fechar</button></div>
    </div>`;
    document.body.appendChild(m);
  }
  m.classList.add('open');
  document.getElementById('lf-texto').textContent = texto;
  if(pct != null) document.getElementById('lf-barra').style.width = Math.round(pct) + '%';
  document.getElementById('lf-fechar').style.display = 'none';
}
function _fotoErro(texto){
  _fotoStatus(texto, 0);
  document.getElementById('lf-fechar').style.display = '';
}

function _carregarTesseract(){
  if(window.Tesseract) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    scriptComIntegridade(s, TESSERACT_URL);
    s.onload = res;
    s.onerror = () => rej(new Error('Não foi possível carregar o leitor de fotos. Verifique a internet e tente de novo.'));
    document.head.appendChild(s);
  });
}

// Reduz, passa para tons de cinza e estica o contraste — melhora muito o OCR de cupom térmico
async function _prepararImagem(file){
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Não consegui abrir essa imagem. Tente outra foto.'));
    i.src = URL.createObjectURL(file);
  });
  const maior = Math.max(img.naturalWidth, img.naturalHeight);
  const escala = maior > 2000 ? 2000 / maior : (maior < 1200 ? 1200 / maior : 1);
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * escala);
  c.height = Math.round(img.naturalHeight * escala);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  const dados = ctx.getImageData(0, 0, c.width, c.height), p = dados.data;
  const hist = new Array(256).fill(0);
  for(let i = 0; i < p.length; i += 4){
    const g = Math.round(.299*p[i] + .587*p[i+1] + .114*p[i+2]);
    p[i] = p[i+1] = p[i+2] = g; hist[g]++;
  }
  // corta 1% dos extremos e estica o restante para 0–255
  const total = p.length / 4; let acc = 0, lo = 0, hi = 255;
  for(let v = 0; v < 256; v++){ acc += hist[v]; if(acc > total * .01){ lo = v; break; } }
  acc = 0;
  for(let v = 255; v >= 0; v--){ acc += hist[v]; if(acc > total * .01){ hi = v; break; } }
  const faixa = Math.max(1, hi - lo);
  for(let i = 0; i < p.length; i += 4){
    const v = Math.max(0, Math.min(255, (p[i] - lo) * 255 / faixa));
    p[i] = p[i+1] = p[i+2] = v;
  }
  ctx.putImageData(dados, 0, 0);
  return c;
}

// ── Leitura do texto do comprovante ──────────────────────────────────────────
const _semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

function _numeroBR(s){
  s = s.replace(/[^\d.,]/g, '');
  if(/,\d{2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if(/\.\d{2}$/.test(s)) s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
const _RE_VALOR = /(?:R\$\s*)?(\d{1,3}(?:[.\s]\d{3})+[,.]\d{2}|\d+[,.]\d{2})(?![\d,.]*\d)/g;
const _valoresDaLinha = l => [...l.matchAll(_RE_VALOR)].map(m => _numeroBR(m[1])).filter(v => v != null && v > 0);
// Erros da foto em valores: "38,4O" / "1O,00" (letra O no lugar do zero) e "38 ,40" (espaço antes da vírgula).
// Mantém o tamanho da linha (o leitor do total corta a linha pela posição da palavra-chave).
const _ocrValores = l => l
  .replace(/\b[\dOo]{1,3}(?:\.[\dOo]{3})*,[\dOo]{2}\b/g, t => /\d/.test(t) ? t.replace(/[Oo]/g, '0') : t)
  .replace(/(\d) ,(\d{2})\b/g, '$1,$2 ');

const _CATEGORIAS_PALAVRAS = {
  'Alimentação': ['SUPERMERCADO','MERCADO','MERCADINHO','MINIMERCADO','MINI MERCADO','MERCEARIA','SACOLAO','QUITANDA','ACAI','PASTELARIA','CHURRASCARIA','HAMBURGUERIA','ATACAD','HIPER','PADARIA','PANIFICADORA','RESTAURANTE','LANCHONETE','PIZZARIA','IFOOD','HORTIFRUTI','ACOUGUE','CARREFOUR','ASSAI','PAO DE ACUCAR','BURGER','MC DONALDS','MCDONALDS','CAFETERIA','SORVETERIA','DOCERIA','EMPORIO','RAPPI'],
  'Transporte':  ['POSTO','COMBUSTIVE','GASOLINA','ETANOL','DIESEL','SHELL','IPIRANGA','PETROBRAS','UBER','99POP','99 TECNOLOGIA','ESTACIONAMENTO','PEDAGIO','SEM PARAR','METRO ','ONIBUS','PASSAGEM'],
  'Saúde':       ['FARMACIA','DROGARIA','DROGA ','RAIA','DROGASIL','PAGUE MENOS','PANVEL','HOSPITAL','CLINICA','LABORATORIO','ODONTO','OTICA','MEDIC'],
  'Moradia':     ['ALUGUEL','CONDOMINIO','ENERGIA','ELETRICIDADE','CPFL','ENEL','CEMIG','COPEL','LIGHT S','SABESP','SANEAMENTO','COMGAS','MATERIAL DE CONSTRUCAO','LEROY','TELHA NORTE'],
  'Lazer':       ['CINEMA','INGRESSO','TEATRO','SHOW','PARQUE','BAR ','CHOPERIA','CERVEJARIA','BOLICHE','CLUBE'],
  'Educação':    ['ESCOLA','COLEGIO','CURSO','FACULDADE','UNIVERSIDADE','LIVRARIA','PAPELARIA','MENSALIDADE ESCOLAR'],
  'Serviços':    ['INTERNET','TELEFONIA','VIVO','CLARO','TIM ','OI ','NETFLIX','SPOTIFY','LAVANDERIA','BARBEARIA','SALAO','ASSINATURA','SEGURO'],
};
const _RODAPE_CAT = /(CONSULTE|WWW\.|HTTP|SEFAZ|TRIBUT|IMPOSTO|\bLEI\b|PROCON|OUVIDORIA)/;
const _RE_PALAVRA = {};
// "POSTO" vale em "AUTO POSTO X", não em "IMPOSTO" (precisa começar no início da palavra)
const _temPalavra = (L, p) => (_RE_PALAVRA[p] = _RE_PALAVRA[p] || new RegExp('[^A-Z0-9]' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).test(L);
const _RECEITA_PALAVRAS = {
  'Salário': ['SALARIO','FOLHA DE PAGAMENTO','PROVENTOS','HOLERITE'],
  'Dividendos': ['DIVIDENDO','JCP','JUROS SOBRE CAPITAL','RENDIMENTO'],
  'Aluguel recebido': ['ALUGUEL'],
};

// ── Data da compra / do pagamento ─────────────────────────────────────────────
// Acha todas as datas do comprovante e dá nota a cada uma pelo contexto:
// + "data do pagamento / pago em / data da transação / compra" (no rótulo da linha ou da linha de cima)
// + "emissão / data / autorização", + hora junto (é o carimbo da transação)
// − "vencimento / validade / nascimento / cliente desde / entrega" (não é a data da compra)
// Formatos: 28/10/2026 · 28.10.26 · 28-10-2026 · 2026-10-28 · 28 OUT 2026 · 28 de outubro de 2026 ·
// 28/OUT/26 · 28/10 14:32 (sem ano: ano atual) · e erros de foto (O no lugar de 0, B no lugar de 8, espaços).
const _MES3 = { JAN:1, FEV:2, FEB:2, MAR:3, ABR:4, APR:4, MAI:5, MAY:5, JUN:6, JUL:7, AGO:8, AUG:8, SET:9, SEP:9, OUT:10, OCT:10, NOV:11, DEZ:12, DEC:12 };
// Mês só vale abreviado (3 letras) ou por extenso — "1 MARGARINA" / "2 MAIONESE" não são 1º de março / 2 de maio
const _MES_EXTENSO = /^(JANEIRO|FEVEREIRO|MARCO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO|JANUARY|FEBRUARY|MARCH|APRIL|JUNE|JULY|AUGUST|SEPTEMBER|SEPT|OCTOBER|NOVEMBER|DECEMBER)$/;
const _ROT_PAGTO  = /(DATA (DO|DE|DA) (PAGAMENTO|COMPRA|TRANSACAO|OPERACAO|TRANSFERENCIA)|PAGO EM|PAGAMENTO (EFETUADO|REALIZADO)|REALIZAD[OA] EM|EFETUAD[OA] EM|COMPRA EM|DATA\/HORA|DATA E HORA|DATA HORA)/;
const _ROT_DATA   = /(EMISSAO|EMITID|\bDATA\b|AUTORIZACAO|HORARIO|\bDT\b)/;
const _ROT_NAO    = /(VENCIMENTO|\bVENC\b|VALIDADE|VALIDO ATE|\bVAL\b|NASCIMENTO|\bNASC\b|CLIENTE DESDE|DESDE|ABERTURA|PREVISAO|ENTREGA|PROXIMA|LIMITE)/;
// Corrige erros comuns da foto só dentro de "pedaços de data" (letras que parecem números)
const _ocrNumero = t => t.replace(/[OQD]/g, '0').replace(/[IL|]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/Z/g, '2');
function _limparDatasDaLinha(L){
  // "2 4 / 1 0 / 2 0 2 6" → "24/10/2026" (dígitos soltos com espaço, comum na foto de papel térmico)
  let s = L.replace(/(?:\b[0-9OQDILSBZ]\s){1,3}[0-9OQDILSBZ]\b\s*[\/.\-]\s*(?:[0-9OQDILSBZ]\s?){1,2}\s*[\/.\-]\s*(?:[0-9OQDILSBZ]\s?){2,4}/g, t => t.replace(/\s+(?=\S)/g, ''));   // mantém o espaço antes da hora
  s = s.replace(/\s*([\/])\s*/g, '$1');
  return s.replace(/[0-9OQDILSBZ|]{1,4}(?:[\/.\-][0-9OQDILSBZ|]{1,4}){1,2}/g, t => (t.match(/\d/g) || []).length >= 2 ? _ocrNumero(t) : t);
}
function _dataDoComprovante(LINHAS, hojeISO){
  const ano = +hojeISO.slice(0, 4);
  const iso = (a, m, d) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const valida = (a, m, d) => a >= 2000 && m >= 1 && m <= 12 && d >= 1 && d <= new Date(a, m, 0).getDate();
  const achadas = [];
  LINHAS.forEach((L0, i) => {
    const L = _limparDatasDaLinha(L0);
    const cima = i > 0 ? LINHAS[i - 1] : '';
    const rotulo = t => t.test(L) || (t.test(cima) && !/\d{1,2}[\/.\-]\d{1,2}/.test(cima));
    const comHora = /\b\d{1,2}:\d{2}\b/.test(L);
    const nota = () => (rotulo(_ROT_PAGTO) ? 4 : 0) + (rotulo(_ROT_DATA) ? 2 : 0) + (comHora ? 1 : 0) - (rotulo(_ROT_NAO) && !rotulo(_ROT_PAGTO) ? 6 : 0);
    const add = (a, m, d, extra) => { if(valida(a, m, d)){ const v = iso(a, m, d); if(v <= hojeISO) achadas.push({ v, n: nota() + (extra || 0), i }); } };
    // 28/10/2026 · 28.10.26 · 28-10-2026
    for(const m of L.matchAll(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})\b/g)){ let a = +m[3]; if(a < 100) a += 2000; add(a, +m[2], +m[1]); }
    // 2026-10-28 · 2026/10/28
    for(const m of L.matchAll(/\b(20\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})\b/g)) add(+m[1], +m[2], +m[3]);
    // 28 OUT 2026 · 28 de outubro de 2026 · 28/OUT/26 · 28OUT26 · 30 Out, 14:22 (sem ano)
    for(const m of L.matchAll(/\b(\d{1,2})\s*(?:DE\s+)?[\/.\-]?\s*([A-Z0]{3,9})\.?\s*(?:DE\s+|[\/.\-,]\s*)?(\d{4}|\d{2}(?!\s*:))?\b/g)){
      const nome = m[2].replace(/0/g, 'O');   // "0UTUBRO": zero no lugar do O
      const mes = _MES3[nome.slice(0, 3)]; if(!mes || (nome.length > 3 && !_MES_EXTENSO.test(nome))) continue;
      let a = m[3] ? +m[3] : ano; if(a < 100) a += 2000;
      if(!m[3] && iso(a, mes, +m[1]) > hojeISO) a--;
      add(a, mes, +m[1]);
    }
    // 28/10 14:32 (sem ano, só com hora junto — "PARCELA 01/03" não é data)
    if(comHora) for(const m of L.matchAll(/\b(\d{1,2})\/(\d{1,2})\b(?![\/.\-]\d)/g)){
      let a = ano; if(iso(a, +m[2], +m[1]) > hojeISO) a--;
      add(a, +m[2], +m[1], -1);
    }
  });
  if(!achadas.length) return '';   // sem data: quem chama usa hoje e avisa para conferir
  achadas.sort((x, y) => y.n - x.n || x.i - y.i);   // maior nota; empate: a que aparece primeiro
  return achadas[0].v;
}

// ── Forma de pagamento ────────────────────────────────────────────────────────
// Cada forma ganha pontos pelas palavras que aparecem; valem 3x perto de "forma de pagamento / pago com /
// valor pago" (ou na linha de baixo desse título). Não contam: propaganda ("aceitamos Pix", "desconto no
// Pix", "parcele"), "crédito de ICMS / tributo", "crédito em conta" (é entrada, não cartão), limite de crédito.
const _FORMAS = [
  ['pix',           3, /\bP[I1L]X\b|CHAVE PIX|ID DA TRANSACAO|PAGAMENTO INSTANTANEO|\bE\d{8}[A-Z0-9]{20,}\b/],
  ['credito',       3, /\bCRED(ITO)?\b|CREDITO A VISTA|CREDITO PARCELADO|VENDA CREDITO|PARCELADO (LOJA|EMISSOR|ADM)|PARCELA \d{1,2}\s*\/\s*\d{1,2}|\b(AMEX|HIPERCARD|DINERS)\b/],
  ['debito',        3, /\bDEB(ITO)?\b|DEBITO A VISTA|VENDA DEBITO|MAESTRO|ELECTRON|REDESHOP|VISA DEBITO|ELO DEBITO/],
  ['dinheiro',      3, /DINHEIRO|\bESPECIE\b|\bTROCO\b/],
  ['boleto',        3, /BOLETO|LINHA DIGITAVEL|CODIGO DE BARRAS|\d{5}\.\d{5}\s\d{5}\.\d{6}\s\d{5}\.\d{6}/],
  ['transferencia', 2, /\bTED\b|\bDOC\b|TRANSFERENCIA BANCARIA|TRANSFERENCIA ENTRE CONTAS/],
  ['deposito',      2, /\bDEPOSITO\b/],
  // Vale-refeição / alimentação / benefícios: vai como "Outro" (não é crédito nem débito do cliente)
  ['outro',         4, /\b(ALELO|SODEXO|PLUXEE|TICKET (RESTAURANTE|ALIMENTACAO|REFEICAO)|VALE[- ]?(REFEICAO|ALIMENTACAO)|VR (BENEFICIOS|REFEICAO|ALIMENTACAO)|BEN VISA|CAJU BENEFICIOS|SWILE|FLASH BENEFICIOS|VEROCARD|GREEN CARD|UP BRASIL)\b/],
];
const _PAG_CONTEXTO = /(FORMAS? DE PAGAMENTO|MEIO DE PAGAMENTO|TIPO DE PAGAMENTO|FORMA PAGAMENTO|PAGO COM|PAGAMENTO\s*:|VALOR PAGO|PAGAMENTO (PIX|EM|VIA|NO|COM)|TIPO DE TRANSFERENCIA|TIPO DE TRANSACAO|MODALIDADE|PIX ENVIADO|PIX RECEBIDO|ENVIADO VIA|RECEBEU UM PIX|VIA CLIENTE|COMPROVANTE DE (VENDA|PAGAMENTO))/;
const _PAG_PROPAGANDA = /(ACEITAMOS|ACEITA |PAGUE COM|PAGUE VIA|PAGUE NO|DESCONTO (NO|DE|PAGANDO)|PARCELE|EM ATE \d|CONDICOES|PROMOCAO|SIGA|INSTAGRAM|WWW\.|HTTP)/;
const _PAG_NAO_CARTAO = /(CREDITO (DE|DO) (ICMS|IMPOSTO|TRIBUT)|CREDITO TRIBUT|CREDITO EM CONTA|LIMITE DE CREDITO|CREDITO PRE-APROVADO|SALDO|DEBITO AUTOMATICO EM CONTA DE)/;
function _metodoDoComprovante(LINHAS, ehReceita){
  const pontos = {};
  LINHAS.forEach((L, i) => {
    if(_PAG_PROPAGANDA.test(L)) return;
    const contexto = _PAG_CONTEXTO.test(L) || (i > 0 && _PAG_CONTEXTO.test(LINHAS[i - 1]) && !/\d/.test(LINHAS[i - 1].replace(/R\$/g, '')));
    const linha = L.replace(_PAG_NAO_CARTAO, ' ');
    for(const [forma, peso, re] of _FORMAS){
      if(forma === 'deposito' && !ehReceita) continue;
      if(re.test(linha)) pontos[forma] = (pontos[forma] || 0) + peso * (contexto ? 3 : 1);
    }
  });
  // Pix com "transferência" no texto é Pix (o Pix é uma transferência)
  const melhor = Object.entries(pontos).sort((a, b) => b[1] - a[1])[0];
  return melhor ? melhor[0] : '';
}

function lerComprovanteTexto(texto, categorias){
  const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 1).map(_ocrValores);
  const LINHAS = linhas.map(_semAcento);
  const TUDO = LINHAS.join('\n');

  // Entrada ou saída
  const ehReceita = /(PIX RECEBIDO|VOCE RECEBEU|RECEBIMENTO DE PIX|TRANSFERENCIA RECEBIDA|CREDITO EM CONTA|DEPOSITO RECEBIDO|RECEBEU UM PIX)/.test(TUDO);
  const tipo = ehReceita ? 'receita' : 'despesa';

  // Valor: linha com palavra de total (em ordem de prioridade); senão, o maior valor
  const CHAVES_TOTAL = ['VALOR A PAGAR','VALOR TOTAL','TOTAL A PAGAR','VL TOTAL','VL. TOTAL','VALOR PAGO','TOTAL R$','VALOR DA TRANSFERENCIA','VALOR DO PIX','TOTAL','VALOR'];
  const IGNORAR = /(SUBTOTAL|TRIBUT|IMPOSTO|DESCONTO|TROCO|QTD|QUANTIDADE|ITENS|CPF|CNPJ|ACRESCIMO|LEI 12)/;
  let valor = null;
  for(const chave of CHAVES_TOTAL){
    for(let i = 0; i < LINHAS.length && valor == null; i++){
      if(!LINHAS[i].includes(chave) || IGNORAR.test(LINHAS[i])) continue;
      // o número DEPOIS da palavra: "DINHEIRO R$ 50,00   TOTAL R$ 33,74" na mesma linha → 33,74
      const depois = linhas[i].slice(Math.max(0, LINHAS[i].indexOf(chave)));
      const nums = _valoresDaLinha(depois).concat(i + 1 < linhas.length && !IGNORAR.test(LINHAS[i+1]) ? _valoresDaLinha(linhas[i+1]) : []);
      if(nums.length) valor = nums[0];
    }
    if(valor != null) break;
  }
  if(valor == null){
    const todos = linhas.filter((l, i) => !IGNORAR.test(LINHAS[i])).flatMap(_valoresDaLinha);
    if(todos.length) valor = Math.max(...todos);
  }

  const dataLida = _dataDoComprovante(LINHAS, hoje());   // hoje no fuso do aparelho (UTC errava depois das 21h)
  const data = dataLida || hoje();
  const metodo = _metodoDoComprovante(LINHAS, ehReceita);

  // Descrição: em comprovante de Pix/transferência, quem recebeu (ou quem enviou);
  // em nota/cupom, o nome do estabelecimento (primeira linha "de nome" do topo)
  let descricao = '';
  const rotulos = ehReceita ? /^(DE|ORIGEM|PAGADOR|QUEM PAGOU|REMETENTE)\b/ : /^(PARA|DESTINO|RECEBEDOR|FAVORECIDO|DESTINATARIO|QUEM RECEBEU)\b/;
  for(let i = 0; i < LINHAS.length && !descricao; i++){
    const rot = LINHAS[i].match(rotulos);
    if(!rot) continue;
    const resto = linhas[i].slice(rot[0].length).replace(/^\s*:?\s*/, '').trim();   // "Quem recebeu: X" → "X"
    descricao = /[A-Za-zÀ-ú]{3}/.test(resto) ? resto : (linhas[i+1] || '');
    descricao = descricao.replace(/^(nome|razão social|razao social)\s*:?\s*/i, '');   // Nubank/Inter: "Nome João…"
  }
  if(!descricao){
    const CABECALHO = /(CNPJ|\bCPF\b|\bIE\b|INSCRICAO|DOCUMENTO|CUPOM|NFC|NF-E|DANFE|CONSUMIDOR|AUXILIAR|ENDERECO|RUA |AV\.|AVENIDA|FONE|TEL|CEP|SAT|EXTRATO|COMPROVANTE|TRANSACAO|DATA|HORA|PROTOCOLO|CHAVE)/;
    // Primeiro, a linha com cara de razão social / nome de loja (LTDA, ME, Comércio, Supermercado…)
    const LOJA = /(\bLTDA\b|\bEIRELI\b|\bME\b|\bEPP\b|\bS\/A\b|\bS\.A\b|COMERCIO|SUPERMERCADO|MERCADO|FARMACIA|DROGARIA|RESTAURANTE|PADARIA|LANCHONETE|POSTO|LOJA|NOME FANTASIA)/;
    for(let i = 0; i < Math.min(LINHAS.length, 12) && !descricao; i++){
      if(LOJA.test(LINHAS[i]) && !CABECALHO.test(LINHAS[i]) && (LINHAS[i].match(/[A-Z]/g) || []).length >= 4) descricao = linhas[i];
    }
    for(let i = 0; i < Math.min(LINHAS.length, 8) && !descricao; i++){
      const letras = (LINHAS[i].match(/[A-Z]/g) || []).length;
      if(letras >= 4 && letras / LINHAS[i].length > .5 && !CABECALHO.test(LINHAS[i])) descricao = linhas[i];
    }
  }
  descricao = descricao.replace(/\s{2,}/g, ' ').replace(/[^\wÀ-ú&.\- ]/g, '').trim().slice(0, 60)
    .toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase()) || (ehReceita ? 'Recebimento' : 'Compra');

  // Categoria: palavras do estabelecimento/conteúdo → uma das categorias do próprio cliente
  const lista = (categorias || []).map(c => ({ nome: c, chave: _semAcento(c) }));
  const existe = nome => lista.find(c => c.chave === _semAcento(nome));
  // Pontos por categoria: o topo (nome da loja) e a descrição valem 3x; rodapé (impostos, "consulte pela
  // internet") não conta. A palavra tem que começar no início de uma palavra ("IMPOSTO" não é POSTO,
  // "PRAIA" não é RAIA) e a bandeira Hipercard sai antes (não é hipermercado).
  const dicionario = ehReceita ? _RECEITA_PALAVRAS : _CATEGORIAS_PALAVRAS;
  const trechos = LINHAS.map((L, i) => ({ L, peso: i < 4 ? 3 : 1 })).filter(x => !_RODAPE_CAT.test(x.L));
  trechos.push({ L: _semAcento(descricao), peso: 3 });
  trechos.forEach(x => { x.L = ' ' + x.L.replace(/HIPER ?CARD/g, ' ') + ' '; });
  let categoria = '', melhor = 0;
  for(const [cat, palavras] of Object.entries(dicionario)){
    if(!existe(cat)) continue;
    const pts = trechos.reduce((s, x) => s + (palavras.some(p => _temPalavra(x.L, p)) ? x.peso : 0), 0);
    if(pts > melhor){ categoria = existe(cat).nome; melhor = pts; }
  }
  if(!categoria) categoria = (existe('Outros') || lista[0] || { nome: '' }).nome;

  return { tipo, valor, data, descricao, metodo, categoria, semData: !dataLida };
}

// Preto e branco "adaptativo" (Bradley): cada ponto é comparado com a média da vizinhança, então sombra
// da mão e papel térmico desbotado não apagam o texto. Usa soma acumulada (rápido mesmo em foto grande).
function _binarizarPixels(p, w, h){
  const S = new Uint32Array((w + 1) * (h + 1));
  for(let y = 0; y < h; y++){
    let linha = 0;
    for(let x = 0; x < w; x++){
      linha += p[(y * w + x) * 4];
      S[(y + 1) * (w + 1) + x + 1] = S[y * (w + 1) + x + 1] + linha;
    }
  }
  const r = Math.max(8, Math.round(w / 32)), T = .15;
  for(let y = 0; y < h; y++){
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for(let x = 0; x < w; x++){
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const soma = S[y1 * (w + 1) + x1] - S[y0 * (w + 1) + x1] - S[y1 * (w + 1) + x0] + S[y0 * (w + 1) + x0];
      const i = (y * w + x) * 4;
      p[i] = p[i + 1] = p[i + 2] = p[i] * (x1 - x0) * (y1 - y0) <= soma * (1 - T) ? 0 : 255;
    }
  }
}
function _binarizarCanvas(c){
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const dados = ctx.getImageData(0, 0, c.width, c.height);
  _binarizarPixels(dados.data, c.width, c.height);
  ctx.putImageData(dados, 0, 0);
}
// Junta 2 leituras: a base é a que achou o valor; da outra só entra o que faltou (data, forma, loja, categoria)
function _juntarLeituras(a, b){
  const base = a.valor ? a : b, outra = base === a ? b : a;
  if(!base.valor || outra.tipo !== base.tipo) return base;
  const r = Object.assign({}, base);
  if(r.semData && !outra.semData){ r.data = outra.data; r.semData = false; }
  if(!r.metodo) r.metodo = outra.metodo;
  if(/^(Compra|Recebimento)$/.test(r.descricao) && !/^(Compra|Recebimento)$/.test(outra.descricao)) r.descricao = outra.descricao;
  if(r.categoria === 'Outros' && outra.categoria && outra.categoria !== 'Outros') r.categoria = outra.categoria;
  return r;
}

// ── Fluxo completo: foto → OCR → formulário preenchido para conferir ────────
async function processarFotoLanc(file){
  if(!file) return;
  try{
    _fotoStatus('Preparando a foto…', 5);
    const canvas = await _prepararImagem(file);
    _fotoStatus('Carregando o leitor (só na primeira vez demora um pouco)…', 12);
    await _carregarTesseract();
    let fase = { texto: 'Lendo o texto da foto…', de: 20, ate: 95 };
    const worker = await Tesseract.createWorker('por', 1, {
      logger: m => { if(m.status === 'recognizing text') _fotoStatus(fase.texto, fase.de + m.progress * (fase.ate - fase.de)); },
    });
    const catsDesp = [...document.querySelectorAll('#d-cat option')].map(o => o.value).filter(Boolean);
    const catsRec  = [...document.querySelectorAll('#r-cat option')].map(o => o.value).filter(Boolean);
    const ler = texto => { const x = lerComprovanteTexto(texto || '', catsDesp); return x.tipo === 'receita' ? lerComprovanteTexto(texto || '', catsRec) : x; };
    let r;
    try{
      r = ler((await worker.recognize(canvas)).data.text);
      // Faltou valor, data ou forma de pagamento: 2ª leitura com a foto em preto e branco puro
      // (tira sombra e papel amarelado) e lendo como uma coluna de cupom. Completa só o que faltou.
      if(!r.valor || r.semData || !r.metodo){
        fase = { texto: 'Conferindo a foto mais uma vez…', de: 55, ate: 95 };
        _fotoStatus(fase.texto, fase.de);
        _binarizarCanvas(canvas);
        await worker.setParameters({ tessedit_pageseg_mode: '4' });
        r = _juntarLeituras(r, ler((await worker.recognize(canvas)).data.text));
      }
    }finally{
      await worker.terminate();
    }
    _fotoStatus('Organizando os dados…', 98);

    if(!r.valor){
      _fotoErro('Não consegui encontrar o valor nessa foto. Tente de novo com o comprovante esticado, bem iluminado e enquadrado — ou lance manualmente.');
      return;
    }
    closeModal('modal-lanc-foto');
    _preencherLancamento(r, file);
  }catch(e){
    console.warn('[Lançar por foto]', e);
    _fotoErro(e && e.message ? e.message : 'Não foi possível ler a foto. Tente novamente.');
  }
}

function _preencherLancamento(r, foto){
  const p = r.tipo === 'receita' ? 'r' : 'd';
  switchTab(r.tipo);
  const set = (id, v) => { const el = document.getElementById(id); if(el && v != null && v !== '') el.value = v; return el; };
  set(`${p}-desc`, r.descricao);
  set(`${p}-val`, r.valor.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  if(typeof dpSetValue === 'function') dpSetValue(`${p}-data`, r.data);
  const cat = document.getElementById(`${p}-cat`);
  if(cat && [...cat.options].some(o => o.value === r.categoria)) cat.value = r.categoria;
  const met = document.getElementById(`${p}-metodo`);
  if(met && r.metodo && [...met.options].some(o => o.value === r.metodo)) met.value = r.metodo;
  if(p === 'd'){
    if(typeof toggleMetodoPagamento === 'function') toggleMetodoPagamento();
    if(typeof calcParcela === 'function') calcParcela();
  }
  ['desc','val','cat','metodo'].forEach(c => {
    const el = document.getElementById(`${p}-${c}`);
    if(el){ el.classList.add('lf-lido'); setTimeout(() => el.classList.remove('lf-lido'), 4000); }
  });
  const msg = document.getElementById(`msg-${p}`);
  if(msg){
    msg.className = 'msg ok';
    msg.textContent = r.semData
      ? 'Lido da foto. Não encontrei a data da compra: confira a data e toque em "Adicionar" para salvar.'
      : 'Lido da foto. Confira os dados e toque em "Adicionar" para salvar.';
  }
  // A foto do comprovante entra como anexo do lançamento
  if(foto && typeof definirAnexoPendente === 'function') definirAnexoPendente(p, foto);
  document.getElementById(`${p}-desc`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
