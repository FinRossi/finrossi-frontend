// js/app/21-manual-render.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
function renderManual(){
  const el=document.getElementById('manual-content');
  el.innerHTML=`
    <div class="card card-full" style="margin-bottom:16px;background:linear-gradient(135deg,rgba(74,222,128,0.06) 0%,rgba(96,165,250,0.04) 100%);border-color:rgba(74,222,128,0.15)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div style="font-size:32px">💎</div>
        <div>
          <div style="font-family:'DM Serif Display',serif;font-size:18px">Bem-vindo ao FinRossi</div>
          <div style="font-size:13px;color:var(--muted)">Controle financeiro pessoal simples e inteligente</div>
        </div>
      </div>
      <p style="font-size:13px;color:var(--muted);line-height:1.7">Este manual explica cada funcionalidade do app. Navegue pelas seções abaixo para aprender a usar tudo. Se tiver dúvidas, entre em contato pelo suporte.</p>
    </div>
    ${MANUAL_SECTIONS.map((s,i)=>`
      <div class="card card-full" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="font-size:24px">${s.icon}</div>
          <div>
            <div style="font-family:'DM Serif Display',serif;font-size:16px">${i+1}. ${s.titulo}</div>
            <div style="font-size:12px;color:var(--muted)">${s.desc}</div>
          </div>
        </div>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:7px">
          ${s.itens.map(item=>`
            <li style="display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--text);line-height:1.6">
              <span style="color:${s.cor};margin-top:1px;flex-shrink:0">›</span>
              <span>${item}</span>
            </li>`).join('')}
        </ul>
      </div>`).join('')}
    <div class="card card-full" style="margin-bottom:16px;text-align:center;padding:24px">
      <div style="font-size:24px;margin-bottom:8px">💬</div>
      <div style="font-family:'DM Serif Display',serif;font-size:16px;margin-bottom:6px">Precisa de ajuda?</div>
      <div style="font-size:13px;color:var(--muted)">Entre em contato com o suporte do FinRossi pelo WhatsApp ou e-mail.</div>
    </div>`;
}

function exportarManualPDF(){
  const conteudo=document.getElementById('manual-content').innerHTML;
  const janela=window.open('','_blank');
  janela.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8">
    <title>Manual FinRossi</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'DM Sans',sans-serif;color:#1a1a1a;padding:40px;max-width:800px;margin:0 auto;line-height:1.6}
      h1{font-family:'DM Serif Display',serif;font-size:28px;margin-bottom:6px}
      .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:14px;page-break-inside:avoid}
      .card-full{margin-bottom:14px}
      ul{list-style:none}
      li{padding:4px 0;font-size:14px}
      strong{font-weight:600}
      @media print{body{padding:20px}.card{page-break-inside:avoid}}
    </style>
  </head><body>
    <div style="text-align:center;margin-bottom:32px;padding:24px;background:#f9fafb;border-radius:12px">
      <h1>📖 Manual de Uso — FinRossi</h1>
      <p style="color:#6b7280;margin-top:8px">Controle financeiro pessoal simples e inteligente</p>
    </div>
    ${conteudo}
  </body></html>`);
  janela.document.close();
  setTimeout(()=>janela.print(),800);
}

