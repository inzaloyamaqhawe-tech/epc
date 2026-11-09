import {esc,icon,badge,grade,number,colors} from './primitives.js';

export function portfolioPage(s) {
  const query=(s.search||'').toLowerCase();
  const rows=s.data.assessments.filter(a=>`${a.name} ${a.province} ${a.propertyId}`.toLowerCase().includes(query)&&(!s.filter||a.result?.grade===s.filter)&&(!s.province||a.province===s.province));
  if(s.sort)rows.sort((a,b)=>s.sort==='eui-desc'?(b.result?.eui||0)-(a.result?.eui||0):s.sort==='eui-asc'?(a.result?.eui||0)-(b.result?.eui||0):a.name.localeCompare(b.name));
  const size=[5,25,50,100].includes(Number(s.pageSize))?Number(s.pageSize):25;
  const pageCount=Math.max(1,Math.ceil(rows.length/size));
  const page=Math.max(1,Math.min(Number(s.tablePage)||1,pageCount));
  return {all:rows,rows:rows.slice((page-1)*size,page*size),total:rows.length,pageCount,page,size,start:rows.length?(page-1)*size+1:0,end:Math.min(page*size,rows.length)};
}

export function pagination(s) {
  const p=portfolioPage(s);
  return `<label>Rows per page<select id="page-size" aria-label="Rows per page">${[5,25,50,100].map(n=>`<option ${n===p.size?'selected':''}>${n}</option>`).join('')}</select></label><span class="page-range">${p.start}–${p.end} of ${p.total} assessments</span><div class="pagination-buttons"><button class="secondary" data-action="table-page" data-id="${p.page-1}" ${p.page===1?'disabled':''}>Previous</button><span>Page ${p.page} of ${p.pageCount}</span><button class="secondary" data-action="table-page" data-id="${p.page+1}" ${p.page===p.pageCount?'disabled':''}>Next</button></div>`;
}

export function propertyTable(s,limit=0) {
  const p=portfolioPage(s),list=limit?p.all.slice(0,limit):s.paginate?p.rows:p.all;
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="Property assessment table; scroll rows to see more"><table><thead><tr><th scope="col">PROPERTY</th><th scope="col">OCCUPANCY / ZONE</th><th scope="col">ENERGY INTENSITY</th><th scope="col">RATING</th><th scope="col">ASSESSMENT</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${list.map(a=>`<tr><td><button class="property-link" data-action="detail" data-id="${a.id}"><span class="property-icon">${icon('building')}</span><span>${esc(a.name)}<small>${esc(a.province)} · ${esc(a.propertyId)}</small></span></button></td><td><b>${esc(a.occupancy)}</b><small>Energy zone ${esc(a.zone)}</small></td><td class="mono">${a.result?number(a.result.eui,1):'—'}<small>kWh/m²/year</small></td><td>${grade(a.result?.grade)}</td><td>${badge(a.status)}</td><td><button class="icon-button" data-action="detail" data-id="${a.id}" aria-label="Open ${esc(a.name)}">${icon('chevron')}</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">No matching properties. Adjust the filters or create an assessment.</td></tr>'}</tbody></table></div>`;
}

export function properties(s) {
  return `<div class="page-heading"><div><div class="eyebrow">YOUR BUILDING PORTFOLIO</div><h1>Properties & performance</h1><p>Measured energy. Verified evidence. A clear path to certification.</p></div><div class="button-row"><button class="primary" data-action="import">${icon('report')} Import CSV / Excel</button><button class="secondary" data-action="new">${icon('plus')} Add manually</button></div></div>
  <section class="panel data-panel"><div class="toolbar"><label class="search">${icon('search')}<input id="search" placeholder="Search property, province or ID…" value="${esc(s.search||'')}" aria-label="Search properties"></label><select id="province-filter" aria-label="Filter province"><option value="">All provinces</option>${[...new Set(s.data.assessments.map(a=>a.province))].sort().map(p=>`<option ${s.province===p?'selected':''}>${esc(p)}</option>`).join('')}</select><select id="rating-filter" aria-label="Filter rating"><option value="">All ratings</option>${Object.keys(colors).map(g=>`<option ${s.filter===g?'selected':''}>${g}</option>`).join('')}</select><select id="sort-order" aria-label="Sort properties">${[['','Latest first'],['name','Name A–Z'],['eui-desc','EUI high to low'],['eui-asc','EUI low to high']].map(([key,label])=>`<option value="${key}" ${s.sort===key?'selected':''}>${label}</option>`).join('')}</select><button class="secondary" data-action="csv">${icon('download')} Export CSV</button></div><div id="property-table">${propertyTable({...s,paginate:true})}</div><div id="pagination" class="pagination" aria-label="Property table pagination">${pagination(s)}</div></section>`;
}
