// js/app/10-modal-export.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── MODAL & EXPORT ──────────────────────────────────────────────────────────
function closeModal(id){document.getElementById(id).classList.remove('open')}
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));

function exportarExcel(){
  const {lancs,invs}=pd();
  const mes=getMesFiltro();
  const [yr,mo]=mes.split('-');
  const mesNome=MONTHS[+mo-1]+'/'+yr.slice(2);

  // Popup de seleção
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML=`
    <div style="background:var(--surface);border:1px solid var(--border2);border-radius:16px;padding:28px;width:100%;max-width:380px">
      <div style="font-family:'DM Serif Display',serif;font-size:18px;margin-bottom:6px">Exportar Excel</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:20px">Escolha o que deseja exportar</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
        <label style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--surface2);border-radius:10px;cursor:pointer">
          <input type="checkbox" id="exp-lanc" checked style="width:16px;height:16px;accent-color:var(--accent)">
          <div>
            <div style="font-size:13px;font-weight:500">Lançamentos</div>
            <div style="font-size:11px;color:var(--muted)">${lancs.length} registro(s)</div>
          </div>
        </label>
        <label style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--surface2);border-radius:10px;cursor:pointer">
          <input type="checkbox" id="exp-inv" checked style="width:16px;height:16px;accent-color:var(--accent)">
          <div>
            <div style="font-size:13px;font-weight:500">Investimentos</div>
            <div style="font-size:11px;color:var(--muted)">${invs.length} registro(s)</div>
          </div>
        </label>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;height:42px;background:var(--surface2);border:1px solid var(--border2);border-radius:9px;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px">Cancelar</button>
        <button id="btn-exp-confirm" style="flex:1;height:42px;background:var(--accent);border:none;border-radius:9px;color:#0f0f0f;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px">⬇ Baixar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('btn-exp-confirm').onclick=()=>{
    const expLanc=document.getElementById('exp-lanc').checked;
    const expInv=document.getElementById('exp-inv').checked;
    if(!expLanc&&!expInv){alert('Selecione ao menos uma opção.');return;}
    overlay.remove();

    if(typeof XLSX==='undefined'){alert('Biblioteca de exportação não carregada. Recarregue a página.');return;}
    const wb=XLSX.utils.book_new();
    if(expLanc&&lancs.length){
      const rows=[...lancs].sort((a,b)=>a.data.localeCompare(b.data)).map((l,i)=>({
        '#':i+1,'Tipo':l.tipo.charAt(0).toUpperCase()+l.tipo.slice(1),
        'Descrição':l.desc,'Categoria':l.cat,'Valor (R$)':l.val,
        'Data':l.data.split('-').reverse().join('/'),'Mês':mesLbl(l.data.slice(0,7)+'-01'),'Obs':l.obs||''
      }));
      const ws=XLSX.utils.json_to_sheet(rows);
      ws['!cols']=[{wch:4},{wch:12},{wch:28},{wch:14},{wch:14},{wch:12},{wch:10},{wch:25}];
      XLSX.utils.book_append_sheet(wb,ws,'Lançamentos');
    }
    if(expInv&&invs.length){
      const rows=invs.map((v,i)=>({
        '#':i+1,'Nome':v.nome,'Tipo':v.tipo,'Valor (R$)':v.val,
        'Rent.':v.rent||'','Banco':v.banco||'','Data':v.data.split('-').reverse().join('/')
      }));
      const ws2=XLSX.utils.json_to_sheet(rows);
      ws2['!cols']=[{wch:4},{wch:25},{wch:25},{wch:14},{wch:16},{wch:18},{wch:12}];
      XLSX.utils.book_append_sheet(wb,ws2,'Investimentos');
    }
    if(!wb.SheetNames.length){alert('Nenhum dado para exportar.');return;}
    const now=new Date();
    XLSX.writeFile(wb,`FinRossi_${cp}_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}.xlsx`);
  };
}

