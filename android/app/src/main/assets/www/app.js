(()=>{
    const STORE_KEY='notas-business-v1';
    const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
    const shift=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
    const uid=()=>Math.random().toString(36).slice(2,9);
    const seed=()=>({settings:{business:'Mi negocio',currency:'MXN'},products:[
      {id:'p1',name:'Café americano',category:'Bebidas',price:42,cost:14,stock:28,min:8,emoji:'☕'},
      {id:'p2',name:'Pan de elote',category:'Panadería',price:38,cost:16,stock:12,min:5,emoji:'🍰'},
      {id:'p3',name:'Té chai',category:'Bebidas',price:55,cost:21,stock:19,min:6,emoji:'🫖'},
      {id:'p4',name:'Galleta de avena',category:'Panadería',price:25,cost:9,stock:4,min:8,emoji:'🍪'},
      {id:'p5',name:'Bolsa de café 250 g',category:'Productos',price:165,cost:94,stock:9,min:4,emoji:'🫘'}],
      customers:[{id:'c1',name:'Mariana López',phone:'55 1234 5678',notes:''},{id:'c2',name:'Diego Ramírez',phone:'55 9876 1234',notes:''},{id:'c3',name:'Sofía Cruz',phone:'',notes:''}],
      suppliers:[{id:'s1',name:'Café de la Sierra',phone:'55 2040 1800',notes:'Grano y café'},{id:'s2',name:'Horno del Barrio',phone:'55 6612 2000',notes:'Pan y repostería'}],
      sales:[{id:'v1',date:shift(-1),productId:'p1',product:'Café americano',qty:2,unitPrice:42,total:84,customer:'Mariana López',payment:'Efectivo',paid:84},{id:'v2',date:shift(-1),productId:'p2',product:'Pan de elote',qty:1,unitPrice:38,total:38,customer:'',payment:'Tarjeta',paid:38},{id:'v3',date:shift(-2),productId:'p3',product:'Té chai',qty:2,unitPrice:55,total:110,customer:'Diego Ramírez',payment:'Pendiente',paid:40},{id:'v4',date:shift(-4),productId:'p5',product:'Bolsa de café 250 g',qty:1,unitPrice:165,total:165,customer:'Sofía Cruz',payment:'Transferencia',paid:165},{id:'v5',date:shift(-6),productId:'p1',product:'Café americano',qty:3,unitPrice:42,total:126,customer:'',payment:'Efectivo',paid:126}],
      expenses:[{id:'g1',date:shift(-1),name:'Compra de leche',category:'Insumos',amount:186,payment:'Efectivo',notes:''},{id:'g2',date:shift(-3),name:'Internet del local',category:'Servicios',amount:499,payment:'Transferencia',notes:''},{id:'g3',date:shift(-5),name:'Servilletas y vasos',category:'Empaque',amount:235,payment:'Tarjeta',notes:''}]});
    function loadState(){try{const saved=window.NotasApp?.loadState?.();if(saved)return JSON.parse(saved)}catch{}try{return JSON.parse(localStorage.getItem(STORE_KEY))}catch{return null}}
    let state=loadState()||seed();
    state.settings={business:'Mi negocio',currency:'MXN',address:'',phone:'',email:'',registration:'',seller:'',...(state.settings||{})};
    if(!Array.isArray(state.sales))state.sales=[];
    state.sales.forEach((sale,index)=>{if(!sale.folio)sale.folio=String(state.sales.length-index).padStart(4,'0')});
    state.saleSequence=Math.max(Number(state.saleSequence)||1,...state.sales.map(sale=>(Number(sale.folio)||0)+1));
    let page='inicio',search='',saleFilter='all',stockFilter='all',invCategory='Todas',invPhotoSize=(()=>{try{return localStorage.getItem('notas-inv-photo-size')||'md'}catch{return 'md'}})(),period='30',modal=null,toastTimer,saleDraft=[],saleStep='pick',saleSearch='',saleCategory='Todas',saleMeta={},productPhotoDraft=null,productFormDraft=null,returnToSale=null,photoBusy=false,cameraStream=null,updateInfo=null,swRegistration=null;
    const DRAFT_KEY='notas-product-draft-v1';
    const APP_LOCAL_VERSION=(()=>{try{const info=window.NotasApp?.getAppVersion?.();if(info)return JSON.parse(info)}catch{}return {versionCode:9,versionName:'1.7.4',webVersion:'1.7.4',platform:'web'}})();
    function saveModalDraft(){
      if(modal?.type!=='product')return;
      const val=(id,fb)=>{const el=document.getElementById(id);return el?el.value:fb};
      const fields={name:val('name',productFormDraft?.name??''),category:val('category',productFormDraft?.category??'Productos'),emoji:val('emoji',productFormDraft?.emoji??'📦'),price:val('price',productFormDraft?.price??''),cost:val('cost',productFormDraft?.cost??0),stock:val('stock',productFormDraft?.stock??0),min:val('min',productFormDraft?.min??3)};
      productFormDraft=fields;
      const payload=JSON.stringify({page,modal,returnToSale,saleDraft,saleStep,saleMeta,productPhotoDraft,fields,ts:Date.now()});
      try{window.NotasApp?.saveTempDraft?.(payload)}catch{}
      try{localStorage.setItem(DRAFT_KEY,payload)}catch{}
    }
    function clearModalDraft(){try{window.NotasApp?.saveTempDraft?.('')}catch{}try{localStorage.removeItem(DRAFT_KEY)}catch{}}
    function restoreModalDraft(){
      let raw='';
      try{raw=window.NotasApp?.loadTempDraft?.()||''}catch{}
      if(!raw)try{raw=localStorage.getItem(DRAFT_KEY)||''}catch{}
      if(!raw)return;
      clearModalDraft();
      try{
        const d=JSON.parse(raw);
        if(!d||d.modal?.type!=='product'||!d.ts||Date.now()-Number(d.ts)>900000)return;
        page=d.page||'inventario';modal=d.modal;returnToSale=d.returnToSale||null;
        if(Array.isArray(d.saleDraft))saleDraft=d.saleDraft;
        if(d.saleStep)saleStep=d.saleStep;
        if(d.saleMeta)saleMeta=d.saleMeta;
        if(d.productPhotoDraft!==undefined)productPhotoDraft=d.productPhotoDraft;
        if(d.fields)productFormDraft=d.fields;
      }catch{}
    }
    function receiveCameraResult(){
      let res='';
      try{res=window.NotasApp?.consumePendingCameraPhoto?.()||''}catch{}
      if(!res)return;
      photoBusy=false;
      const sub=document.getElementById('modal-submit');if(sub)sub.disabled=false;
      if(res.startsWith('data:image/')){
        productPhotoDraft=res;
        const prev=document.getElementById('photo-preview'),rm=document.getElementById('photo-remove');
        if(prev)prev.innerHTML=productArt({photo:productPhotoDraft});
        if(rm)rm.hidden=false;
        toast('Foto agregada');
      }else if(res==='ERR'){toast('No se pudo cargar la foto tomada',true)}
    }
    window.notasReceiveCameraResult=receiveCameraResult;
    const UPDATE_MANIFEST_URL='https://navi1896.github.io/notas-app/version.json';
    const compareSemver=(a='0',b='0')=>{const pa=String(a).split('.').map(Number),pb=String(b).split('.').map(Number);for(let i=0;i<3;i++){const da=pa[i]||0,db=pb[i]||0;if(da!==db)return da-db}return 0};
    const app=document.getElementById('app');
    const navItems=[['inicio','Inicio','home'],['ventas','Ventas','cart'],['gastos','Gastos','receipt'],['inventario','Inventario','box'],['clientes','Clientes','users'],['proveedores','Proveedores','truck'],['deudas','Pendientes','clock'],['reportes','Reportes','chart'],['catalogo','Catálogo','grid']];
    const path={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',cart:'<circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 3h2l2.4 12.1a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L22 7H5"/>',receipt:'<path d="M4 3h16v18l-3-2-3 2-3-2-3 2-4-2z"/><path d="M8 8h8M8 12h8M8 16h4"/>',box:'<path d="m12 3 9 5-9 5-9-5z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',truck:'<path d="M3 6h11v12H3zM14 10h4l3 3v5h-7z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="17.5" cy="19" r="1.5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',chart:'<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.4-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a8 8 0 0 1 0-2L6.4 12l1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.4-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 1.9z"/>',plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',export:'<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 14v6h14v-6"/>',edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',chevron:'<path d="m9 18 6-6-6-6"/>',camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'};
    const icon=(name,size=18)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path[name]||path.grid}</svg>`;
    const money=(n)=>new Intl.NumberFormat('es-MX',{style:'currency',currency:state.settings.currency||'MXN',minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(n)||0);
    const fmtDate=(s)=>{if(!s)return'—';const d=new Date(s+'T12:00:00');return new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short'}).format(d)};
    const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const save=()=>{const value=JSON.stringify(state);try{localStorage.setItem(STORE_KEY,value)}catch{}try{window.NotasApp?.saveState?.(value)}catch{}};
    const getProduct=(id)=>state.products.find(p=>p.id===id);
    const productArt=(p)=>p?.photo?`<img src="${esc(p.photo)}" alt="" onerror="this.replaceWith(document.createTextNode('📦'))" />`:esc(p?.emoji||'📦');
    const pending=(s)=>Math.max(0,(Number(s.total)||0)-(Number(s.paid)||0));
    const getSaleItems=(s)=>Array.isArray(s.items)&&s.items.length?s.items.map(item=>({productId:item.productId,product:item.product||item.name||'Producto',name:item.name||item.product||'Producto',qty:Number(item.qty)||0,unitPrice:Number(item.unitPrice)||0,total:Number(item.total??item.amount)||((Number(item.qty)||0)*(Number(item.unitPrice)||0))})):[{productId:s.productId,product:s.product||'Producto',name:s.product||'Producto',qty:Number(s.qty)||0,unitPrice:Number(s.unitPrice)||0,total:Number(s.total)||0}];
    const invoiceDate=(s)=>{const d=new Date((s.date||today())+'T12:00:00');const date=new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'long',year:'numeric'}).format(d);return `${date}${s.time?' · '+s.time:''}`};
    const iconForNav=(id)=>navItems.find(x=>x[0]===id)?.[2]||'grid';
    function navButton(id,label,ic){return `<button class="nav-btn ${page===id?'active':''}" data-page="${id}"><span class="nav-icon">${icon(ic)}</span><span>${label}</span>${id==='deudas'&&state.sales.filter(s=>pending(s)>0).length?`<span class="nav-count">${state.sales.filter(s=>pending(s)>0).length}</span>`:''}</button>`}
    const totalSales=(arr=state.sales)=>arr.reduce((a,s)=>a+Number(s.total||0),0);
    const totalExpenses=(arr=state.expenses)=>arr.reduce((a,e)=>a+Number(e.amount||0),0);
    function withinDays(date,days){const t=new Date();t.setHours(0,0,0,0);const d=new Date(date+'T00:00:00');const start=new Date(t);start.setDate(start.getDate()-(Number(days)-1));return d>=start&&d<=t}
    function dataInPeriod(){return{sales:state.sales.filter(s=>withinDays(s.date,period==='all'?100000:Number(period))),expenses:state.expenses.filter(e=>withinDays(e.date,period==='all'?100000:Number(period)))}}
    function head(title,desc,actions=''){return `<div class="page-head"><div><div class="eyebrow">Notas · ${esc(state.settings.business||'Mi negocio')}</div><h1 class="page-title">${title}</h1><p class="page-desc">${desc}</p></div>${actions?`<div class="head-actions">${actions}</div>`:''}</div>`}
    function pageTitle(){return navItems.find(x=>x[0]===page)?.[1]||'Inicio'}
    function render(){
      const mobile=[['inicio','Inicio','home'],['ventas','Ventas','cart'],['inventario','Stock','box'],['reportes','Reportes','chart'],['mas','Menú','menu']];
      const updateBanner=updateInfo?`<div class="update-banner"><div><strong>Nueva versión disponible (v${esc(updateInfo.webVersion||updateInfo.versionName)})</strong><span>${esc(updateInfo.notes||'Mejoras listas para instalar.')}</span></div><button class="btn btn-primary btn-sm" data-action="apply-update">Actualizar ahora</button></div>`:'';
      app.innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand"><div class="brand-mark">N.</div><div><div class="brand-name">notas</div><div class="brand-sub">cuentas claras, negocio en orden</div></div></div><div class="nav-label">Tu negocio</div><nav class="nav">${navItems.map(x=>navButton(x[0],x[1],x[2])).join('')}</nav><div class="sidebar-bottom"><button class="nav-btn" data-action="settings"><span class="nav-icon">${icon('settings')}</span><span>Configuración</span></button><div class="shop-card"><div class="shop-avatar">⌂</div><div class="shop-copy"><div class="shop-name">${esc(state.settings.business||'Mi negocio')}</div><div class="shop-plan">Espacio local · ${esc(state.settings.currency||'MXN')}</div></div><button class="shop-menu" data-action="settings" aria-label="Configuración">···</button></div></div></aside><main class="main"><header class="topbar"><div class="crumb">${page==='inicio'?'Resumen de hoy':pageTitle()}</div><div class="top-actions"><button class="icon-btn" data-action="settings" title="Configuración">${icon('settings',17)}</button><div class="user-pill" aria-label="Perfil">${esc((state.settings.business||'N').slice(0,1).toUpperCase())}</div></div></header><div class="content">${updateBanner}${renderPage()}</div></main></div><nav class="mobile-nav">${mobile.map(([id,label,ic])=>`<button data-page="${id}" class="${page===id?'active':''}"><span class="nav-icon">${icon(ic)}</span><span>${label}</span></button>`).join('')}</nav>${modal?renderModal():''}`;
      document.querySelectorAll('.table-wrap table').forEach(table=>{const labels=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());table.querySelectorAll('tbody tr').forEach(row=>[...row.cells].forEach((cell,i)=>{cell.dataset.label=labels[i]||'';if(cell.querySelector('button'))cell.classList.add('mobile-actions')}))});
      document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.page==='mas'){showMoreMenu();return}page=b.dataset.page;search='';saleFilter='all';stockFilter='all';invCategory='Todas';render()}));
      document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.open)));
      document.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.edit,b.dataset.id)));
      document.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteRecord(b.dataset.delete,b.dataset.id)));
      bindPage(); if(page==='reportes')drawCharts();
      if(modal)bindModal();
    }
    function renderPage(){switch(page){case'ventas':return salesPage();case'gastos':return expensesPage();case'inventario':return inventoryPage();case'clientes':return contactsPage('clientes');case'proveedores':return contactsPage('proveedores');case'deudas':return debtsPage();case'reportes':return reportsPage();case'catalogo':return catalogPage();default:return homePage()}}
    function homePage(){
      const{sales,expenses}=dataInPeriod();
      const sale=totalSales(sales),expense=totalExpenses(expenses),profit=sale-expense;
      const pendingCount=state.sales.filter(s=>pending(s)>0).length;
      const pendingTotal=state.sales.reduce((a,s)=>a+pending(s),0);
      const stockLow=state.products.filter(p=>Number(p.stock)<=Number(p.min)).length;
      const actions=`<button class="btn btn-lime" data-open="sale">${icon('plus',15)} Nueva venta</button>`;
      const alerts=[
        pendingCount?`<button class="home-alert" data-page="deudas">⏳ ${money(pendingTotal)} por cobrar (${pendingCount}) →</button>`:'',
        stockLow?`<button class="home-alert warn" data-page="inventario">⚠️ ${stockLow} producto(s) con stock bajo →</button>`:''
      ].filter(Boolean).join('');
      return `${head(esc(state.settings.business||'Inicio'),'Resumen de los últimos 30 días.',actions)}<div class="home-stats"><div class="card stat-card"><div class="stat-label">Ventas</div><div class="stat-val">${money(sale)}</div><div class="stat-foot">${sales.length} nota(s)</div></div><div class="card stat-card"><div class="stat-label">Balance</div><div class="stat-val">${money(profit)}</div><div class="stat-foot">Gastos: ${money(expense)}</div></div></div>${alerts?`<div class="home-alerts">${alerts}</div>`:''}<div class="home-quick"><button class="home-quick-btn" data-open="expense">− Gasto</button><button class="home-quick-btn" data-open="product">＋ Producto</button><button class="home-quick-btn" data-open="customer">＋ Cliente</button></div><section class="card table-card" style="margin-top:0"><div class="table-head"><div><h2 class="panel-title">Últimos movimientos</h2></div><button class="text-btn" data-page="ventas">Ver todo ${icon('chevron',13)}</button></div><div class="home-list">${activityList()}</div></section>`;
    }
    function activityList(){
      const rows=[
        ...state.sales.map(s=>{const items=getSaleItems(s);return{kind:'sale',date:s.date,title:items.length>1?`${items.length} productos`:items[0].product,sub:s.customer||s.payment||'Venta',amount:s.total}}),
        ...state.expenses.map(e=>({kind:'expense',date:e.date,title:e.name,sub:e.category||'Gasto',amount:e.amount}))
      ].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
      if(!rows.length)return `<div class="empty">Todavía no hay actividad. Registra tu primera venta o gasto.</div>`;
      return `<div class="activity">${rows.map(r=>`<div class="activity-item"><div class="activity-mark ${r.kind==='sale'?'':'out'}">${r.kind==='sale'?'+':'−'}</div><div class="activity-main"><div class="activity-name">${esc(r.title)}</div><div class="activity-meta">${fmtDate(r.date)} · ${esc(r.sub)}</div></div><div class="activity-amount" style="color:${r.kind==='sale'?'#455f27':'#a05b26'}">${r.kind==='sale'?'+':'−'}${money(r.amount)}</div></div>`).join('')}</div>`;
    }
    function toolbar(placeholder='Buscar…',filters=''){return `<div class="toolbar"><div class="searchbox"><span>${icon('search',16)}</span><input id="list-search" value="${esc(search)}" placeholder="${placeholder}" /></div>${filters}</div>`}
    function tableShell(title,sub,rows,cols,emptyText,tableClass='',headRight=''){return `<section class="card table-card" style="margin-top:0"><div class="table-head"><div><h2 class="panel-title">${title}</h2><p class="panel-note">${sub}</p></div>${headRight}</div>${rows.length?`<div class="table-wrap ${tableClass}"><table><thead><tr>${cols}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:`<div class="empty"><div class="empty-icon">🗒️</div>${emptyText}</div>`}</section>`}
    function salesPage(){
      const q=search.trim().toLowerCase();
      const pendingCount=state.sales.filter(s=>pending(s)>0).length;
      const list=state.sales.filter(s=>{
        const matchQuery=!q||(getSaleItems(s).map(i=>i.product).join(' ')+' '+(s.customer||'')+' '+(s.payment||'')+' #'+(s.folio||'')).toLowerCase().includes(q);
        const matchFilter=saleFilter==='all'||(saleFilter==='Pendiente'?pending(s)>0:s.payment===saleFilter);
        return matchQuery&&matchFilter;
      }).sort((a,b)=>b.date.localeCompare(a.date));
      const filterOpts=[['all','Todas'],['Pendiente','Pendientes'],['Efectivo','Efectivo'],['Tarjeta','Tarjeta'],['Transferencia','Transferencia']];
      const filterChips=`<div class="sale-filter-chips" role="group" aria-label="Filtrar ventas por pago">${filterOpts.map(([val,label])=>`<button type="button" class="sale-filter-chip ${saleFilter===val?'active':''}" data-sale-filter="${val}">${label}${val==='Pendiente'&&pendingCount?`<span class="sale-filter-count">${pendingCount}</span>`:''}</button>`).join('')}</div>`;
      const rows=list.map(s=>{
        const items=getSaleItems(s),label=items.map(i=>i.product).join(', '),units=items.reduce((a,i)=>a+i.qty,0),pend=pending(s);
        return `<tr><td class="sale-col-main"><div class="table-main"><span class="sale-folio-tag">#${esc(s.folio||'0001')}</span>${esc(label)}</div><div class="table-sub">${units} ud(s)${s.customer?' · '+esc(s.customer):''}</div></td><td class="sale-col-meta"><span>${fmtDate(s.date)} · ${esc(s.payment)}</span>${pend>0?`<span class="badge orange">Pendiente ${money(pend)}</span>`:`<span class="badge green">Pagada</span>`}</td><td class="money sale-col-total" style="text-align:right">${money(s.total)}</td><td><div class="inline-actions">${pend>0?`<button class="text-btn" style="color:var(--orange-dark);font-weight:750" data-action="collect:${s.id}">Cobrar</button>`:''}<button class="text-btn" data-action="receipt:${s.id}" title="Ver comprobante">Ver nota</button><button class="text-btn" data-edit="sale" data-id="${s.id}" aria-label="Editar">${icon('edit',14)} Editar</button><button class="text-btn delete-action" data-delete="sale" data-id="${s.id}" aria-label="Eliminar nota">${icon('trash',14)}</button></div></td></tr>`;
      });
      const subSummary=list.length===state.sales.length?`${state.sales.length} nota(s) · ${money(totalSales(list))}`:`${list.length} de ${state.sales.length} nota(s) · ${money(totalSales(list))}`;
      return `${head('Ventas','Registra ventas rápido y consulta tus notas.',`<button class="btn btn-lime" data-open="sale">${icon('plus',15)} Nueva venta</button>`)}${toolbar('Buscar producto, cliente o #folio…')}${filterChips}${tableShell('Historial de ventas',subSummary,rows,'<th>Nota</th><th>Fecha, pago y estado</th><th style="text-align:right">Total</th><th></th>',q||saleFilter!=='all'?'No hay ventas que coincidan con este filtro.':'No hay ventas todavía. Registra tu primera venta para empezar.','sales-table')}`;
    }
    function expensesPage(){const list=state.expenses.filter(e=>(e.name+' '+e.category+' '+e.payment).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));const rows=list.map(e=>`<tr><td><div class="table-main">${esc(e.name)}</div><div class="table-sub">${esc(e.notes||e.category||'')}</div></td><td>${fmtDate(e.date)}</td><td>${esc(e.category||'—')}</td><td>${esc(e.payment||'—')}</td><td class="money" style="text-align:right">${money(e.amount)}</td><td><div class="inline-actions"><button class="text-btn" data-edit="expense" data-id="${e.id}">${icon('edit',14)} Editar</button><button class="text-btn delete-action" data-delete="expense" data-id="${e.id}">${icon('trash',14)} Eliminar</button></div></td></tr>`);return `${head('Gastos','Anota las salidas de dinero para entender mejor tus costos.',`<button class="btn btn-lime" data-open="expense">${icon('plus',15)} Nuevo gasto</button>`)}${toolbar('Buscar gasto o categoría…')}${tableShell('Gastos registrados',`${state.expenses.length} movimiento(s) · ${money(totalExpenses())}`,rows,'<th>Concepto</th><th>Fecha</th><th>Categoría</th><th>Forma de pago</th><th style="text-align:right">Importe</th><th></th>','Aún no tienes gastos registrados.')}`}
    function inventoryPage(){
      const q=search.trim().toLowerCase();
      const categories=['Todas',...new Set(state.products.map(p=>p.category||'Productos'))].sort((a,b)=>a==='Todas'?-1:b==='Todas'?1:a.localeCompare(b,'es-MX'));
      const lowCount=state.products.filter(p=>Number(p.stock)<=Number(p.min)).length;
      const outCount=state.products.filter(p=>Number(p.stock)<=0).length;
      const list=state.products.filter(p=>{
        const matchQ=!q||(p.name+' '+(p.category||'')+' '+p.price+' '+p.cost+' '+p.stock).toLowerCase().includes(q);
        const matchStock=stockFilter==='all'||(stockFilter==='low'?Number(p.stock)<=Number(p.min):Number(p.stock)<=0);
        const matchCat=invCategory==='Todas'||(p.category||'Productos')===invCategory;
        return matchQ&&matchStock&&matchCat;
      }).sort((a,b)=>a.name.localeCompare(b.name,'es-MX'));
      const statusOpts=[['all','Todos'],['low','Stock bajo'],['out','Agotados']];
      const statusChips=`<div class="sale-filter-chips" role="group" aria-label="Filtrar existencias">${statusOpts.map(([val,label])=>`<button type="button" class="sale-filter-chip ${stockFilter===val?'active':''}" data-stock-filter="${val}">${label}${val==='low'&&lowCount?`<span class="sale-filter-count">${lowCount}</span>`:''}${val==='out'&&outCount?`<span class="inv-filter-count">${outCount}</span>`:''}</button>`).join('')}</div>`;
      const catChips=categories.length>2?`<div class="sale-categories inv-cats" role="tablist" aria-label="Categorías de inventario">${categories.map(c=>`<button type="button" class="sale-chip ${invCategory===c?'active':''}" data-inv-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>`:'';
      const rows=list.map(p=>{
        const st=Number(p.stock)||0,mn=Number(p.min)||0,margin=(Number(p.price)||0)-(Number(p.cost)||0);
        const badge=st<=0?`<span class="badge red">0 · Agotado</span>`:st<=mn?`<span class="badge orange">${st} · Bajo (mín. ${mn})</span>`:`<span class="badge green">${st} disp.</span>`;
        return `<tr class="${st<=mn?'low-row':''}"><td class="inv-col-main"><div class="stock-name"><button type="button" class="product-thumb photo-zoom-trigger" data-zoom-product="${esc(p.id)}" title="Ver imagen grande" aria-label="Agrandar imagen de ${esc(p.name)}">${productArt(p)}</button><div><div class="table-main">${esc(p.name)}</div><div class="table-sub">${esc(p.category||'Sin categoría')}</div></div></div></td><td class="money inv-col-price">${money(p.price)}<div class="table-sub">Ganancia ${money(margin)}</div></td><td class="inv-col-stock">${badge}</td><td class="inv-col-cost">Costo ${money(p.cost)}</td><td><div class="inline-actions"><button class="text-btn" style="font-weight:740" data-action="adjust:${p.id}">± Stock</button><button class="text-btn" data-edit="product" data-id="${p.id}" aria-label="Editar">${icon('edit',14)} Editar</button><button class="text-btn delete-action" data-delete="product" data-id="${p.id}" aria-label="Eliminar producto">${icon('trash',14)}</button></div></td></tr>`;
      });
      const sizeOpts=[['sm','Chica'],['md','Mediana'],['lg','Grande']];
      const sizeSwitch=`<div class="inv-size-switch" role="group" aria-label="Tamaño de imagen">${sizeOpts.map(([val,label])=>`<button type="button" class="inv-size-btn ${invPhotoSize===val?'active':''}" data-inv-size="${val}">${label}</button>`).join('')}</div>`;
      const listUnits=list.reduce((a,p)=>a+(Number(p.stock)||0),0),listRetail=list.reduce((a,p)=>a+(Number(p.price)||0)*(Number(p.stock)||0),0);
      const subSummary=`${list.length}${list.length!==state.products.length?' de '+state.products.length:''} producto(s) · ${listUnits} ud(s) · valor venta ${money(listRetail)}`;
      return `${head('Inventario','Controla existencias, precios y alertas de resurtido.',`<button class="btn btn-lime" data-open="product">${icon('plus',15)} Agregar producto</button>`)}${toolbar('Buscar producto, categoría o precio…')}${statusChips}${catChips}${tableShell('Productos',subSummary,rows,'<th>Producto</th><th>Precio</th><th>Existencias</th><th>Costo</th><th></th>',q||stockFilter!=='all'||invCategory!=='Todas'?'No hay productos con ese filtro.':'Agrega tus productos para llevar tu inventario al día.',`inv-table thumb-${invPhotoSize}`,sizeSwitch)}`;
    }
    function contactsPage(type){const isCustomer=type==='clientes',items=isCustomer?state.customers:state.suppliers,title=isCustomer?'Clientes':'Proveedores',kind=isCustomer?'customer':'supplier';const list=items.filter(x=>(x.name+' '+(x.phone||'')+' '+(x.notes||'')).toLowerCase().includes(search.toLowerCase()));const rows=list.map(x=>`<tr><td><div class="table-main">${esc(x.name)}</div><div class="table-sub">${esc(x.notes||'')}</div></td><td>${esc(x.phone||'—')}</td>${isCustomer?`<td>${money(state.sales.filter(s=>s.customer===x.name).reduce((a,s)=>a+s.total,0))}</td><td>${money(state.sales.filter(s=>s.customer===x.name).reduce((a,s)=>a+pending(s),0))}</td>`:`<td>${esc(x.email||'—')}</td>`}<td><div class="inline-actions"><button class="text-btn" data-edit="${kind}" data-id="${x.id}">Editar</button><button class="text-btn delete-action" data-delete="${type==='clientes'?'customer':'supplier'}" data-id="${x.id}">${icon('trash',14)} Eliminar</button></div></td></tr>`);const cols=isCustomer?'<th>Nombre</th><th>Teléfono</th><th>Compras</th><th>Por cobrar</th><th></th>':'<th>Proveedor</th><th>Teléfono</th><th>Correo</th><th></th>';return `${head(title,isCustomer?'Organiza tus contactos y consulta sus compras o saldos.':'Guarda los datos de quienes abastecen tu negocio.',`<button class="btn btn-lime" data-open="${kind}">${icon('plus',15)} Agregar ${isCustomer?'cliente':'proveedor'}</button>`)}${toolbar(isCustomer?'Buscar cliente…':'Buscar proveedor…')}${tableShell(title,`${items.length} contacto(s)`,rows,cols,`Todavía no hay ${isCustomer?'clientes':'proveedores'} guardados.`)}`}
    function debtsPage(){const list=state.sales.filter(s=>pending(s)>0).sort((a,b)=>b.date.localeCompare(a.date));const total=list.reduce((a,s)=>a+pending(s),0);const rows=list.map(s=>`<tr><td><div class="table-main">${esc(s.customer||'Cliente sin nombre')}</div><div class="table-sub">${esc(getSaleItems(s).map(item=>item.product).join(', '))} · ${fmtDate(s.date)}</div></td><td>${money(s.total)}</td><td>${money(s.paid)}</td><td class="money">${money(pending(s))}</td><td><div class="inline-actions"><button class="btn btn-light btn-sm" data-action="collect:${s.id}">Registrar abono</button><button class="btn btn-light btn-sm" data-edit="sale" data-id="${s.id}">Editar nota</button></div></td></tr>`);return `${head('Por cobrar','Da seguimiento a ventas que todavía tienen saldo pendiente.')}<div class="kpi-banner"><div><h3>Saldo total pendiente</h3><p>Se calcula a partir de las ventas registradas como pendientes o con abono.</p></div><div class="amount">${money(total)}</div></div>${tableShell('Cuentas pendientes',`${list.length} saldo(s) abierto(s)`,rows,'<th>Cliente / venta</th><th>Total venta</th><th>Abonado</th><th>Saldo</th><th></th>','No hay cuentas pendientes. ¡Todo al corriente!')}`}
    function reportsPage(){
      const{sales,expenses}=dataInPeriod();
      const sale=totalSales(sales),exp=totalExpenses(expenses),balance=sale-exp;
      const collected=sales.reduce((a,s)=>a+Math.min(Number(s.total)||0,Number(s.paid)||0),0);
      const unitsSold=sales.reduce((a,s)=>a+getSaleItems(s).reduce((x,i)=>x+i.qty,0),0);
      const avgTicket=sales.length?sale/sales.length:0;
      const totalPending=state.sales.reduce((a,s)=>a+pending(s),0),pendingCount=state.sales.filter(s=>pending(s)>0).length;
      const marginPct=sale>0?Math.round(balance/sale*100):0;
      const grouped={};sales.forEach(s=>getSaleItems(s).forEach(item=>{const cur=grouped[item.product]||{val:0,qty:0};cur.val+=item.total;cur.qty+=item.qty;grouped[item.product]=cur}));
      const top=Object.entries(grouped).sort((a,b)=>b[1].val-a[1].val).slice(0,6);
      const cats={};expenses.forEach(e=>cats[e.category||'Otros']=(cats[e.category||'Otros']||0)+e.amount);
      const cat=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
      const payColors={Efectivo:'#8fb838',Tarjeta:'#5a7bc0',Transferencia:'#3a9b8f',Pendiente:'#d9883b'};
      const payMap={};sales.forEach(s=>{const k=s.payment||'Efectivo';const cur=payMap[k]||{val:0,count:0};cur.val+=Number(s.total)||0;cur.count+=1;payMap[k]=cur});
      const payRows=Object.entries(payMap).sort((a,b)=>b[1].val-a[1].val);
      const invCost=state.products.reduce((a,p)=>a+(Number(p.cost)||0)*(Number(p.stock)||0),0);
      const invRetail=state.products.reduce((a,p)=>a+(Number(p.price)||0)*(Number(p.stock)||0),0);
      const invUnits=state.products.reduce((a,p)=>a+(Number(p.stock)||0),0);
      const periodOpts=[['7','7 días'],['30','30 días'],['90','90 días'],['all','Todo']];
      const periodChips=`<div class="sale-filter-chips" role="group" aria-label="Periodo de reportes">${periodOpts.map(([val,label])=>`<button type="button" class="sale-filter-chip ${period===val?'active':''}" data-report-period="${val}">${label}</button>`).join('')}</div>`;
      return `${head('Reportes','Resumen claro de tus ventas, gastos y pagos.',`<button class="btn btn-light" data-action="export">${icon('export',15)} Exportar datos</button>`)}${periodChips}<div class="report-kpis"><section class="report-hero"><div class="report-hero-top"><span class="report-hero-label">Balance · ${period==='all'?'Historial completo':'Últimos '+period+' días'}</span>${sale>0?`<span class="report-hero-badge ${balance<0?'neg':''}">${balance>=0?'+':''}${marginPct}% margen</span>`:''}</div><div class="report-hero-val">${money(balance)}</div><div class="report-hero-pills"><span class="report-hero-pill">Ventas <strong>${money(sale)}</strong> (${sales.length})</span><span class="report-hero-pill">Gastos <strong>${money(exp)}</strong> (${expenses.length})</span>${collected<sale?`<span class="report-hero-pill">Cobrado <strong>${money(collected)}</strong></span>`:''}</div></section><div class="card report-mini"><div class="stat-label">Ticket promedio</div><div class="stat-val">${money(avgTicket)}</div><div class="stat-foot">${unitsSold} unidad(es) vendidas</div></div>${pendingCount?`<button type="button" class="card report-mini report-mini-btn" data-page="deudas"><div class="stat-label">Por cobrar</div><div class="stat-val" style="color:var(--orange-dark)">${money(totalPending)}</div><div class="stat-foot">${pendingCount} nota(s) pendiente(s) →</div></button>`:`<div class="card report-mini"><div class="stat-label">Por cobrar</div><div class="stat-val">${money(0)}</div><div class="stat-foot">Sin saldos pendientes</div></div>`}</div><div class="grid report-grid"><section class="card panel"><div class="panel-head"><div><h2 class="panel-title">Ventas y gastos</h2><p class="panel-note">${period==='all'?'Historial completo':'Últimos '+period+' días'}</p></div><div class="chart-legend"><span><i class="chart-dot" style="background:#cde95d"></i>Ventas</span><span><i class="chart-dot" style="background:#edc99e"></i>Gastos</span></div></div>${sales.length||expenses.length?`<div class="chart-wrap"><canvas id="main-chart"></canvas></div>`:`<div class="empty">Sin movimientos en este periodo.</div>`}</section><section class="card panel"><div class="panel-head"><div><h2 class="panel-title">Cobros por método</h2><p class="panel-note">Distribución de ventas del periodo</p></div></div>${payRows.length?`<div class="pay-stack">${payRows.map(([k,v])=>`<div class="pay-seg" style="width:${Math.max(4,v.val/(sale||1)*100)}%;background:${payColors[k]||'#95a398'}" title="${esc(k)}: ${money(v.val)}"></div>`).join('')}</div><div class="pay-list">${payRows.map(([k,v])=>`<div class="pay-row"><div class="pay-row-left"><i class="chart-dot" style="background:${payColors[k]||'#95a398'}"></i><span class="pay-row-name">${esc(k)}</span><span class="pay-row-sub">${v.count} nota(s) · ${sale>0?Math.round(v.val/sale*100):0}%</span></div><span class="pay-row-val">${money(v.val)}</span></div>`).join('')}</div>`:`<div class="empty">Todavía no hay ventas en este periodo.</div>`}</section><section class="card panel"><div class="panel-head"><div><h2 class="panel-title">Productos más vendidos</h2><p class="panel-note">Por importe vendido en el periodo</p></div></div>${top.length?`<div class="report-rank">${top.map(([name,info])=>`<div class="report-rank-item"><div class="report-rank-top"><span class="report-rank-name">${esc(name)}<span class="report-rank-sub">${info.qty} ud(s)</span></span><strong class="report-rank-val">${money(info.val)}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4,info.val/(top[0][1].val||1)*100)}%"></div></div></div>`).join('')}</div>`:`<div class="empty">Todavía no hay ventas para comparar.</div>`}</section><section class="card panel"><div class="panel-head"><div><h2 class="panel-title">Gastos por categoría</h2><p class="panel-note">Distribución de salidas</p></div></div>${cat.length?`<div class="report-rank">${cat.map(([name,val])=>`<div class="report-rank-item"><div class="report-rank-top"><span class="report-rank-name">${esc(name)}<span class="report-rank-sub">${exp>0?Math.round(val/exp*100):0}%</span></span><strong class="report-rank-val">${money(val)}</strong></div><div class="bar-track"><div class="bar-fill expense" style="width:${Math.max(4,val/(cat[0][1]||1)*100)}%"></div></div></div>`).join('')}</div>`:`<div class="empty">Aún no hay gastos en este periodo.</div>`}</section><section class="card panel" style="grid-column:1/-1"><div class="panel-head"><div><h2 class="panel-title">Valor del inventario</h2><p class="panel-note">${state.products.length} producto(s) · ${invUnits} unidad(es) en existencia</p></div><button type="button" class="text-btn" data-page="inventario">Ver stock ${icon('chevron',13)}</button></div><div class="report-inv-grid"><div class="report-inv-box"><span>Costo en stock</span><strong>${money(invCost)}</strong></div><div class="report-inv-box"><span>Valor a precio de venta</span><strong>${money(invRetail)}</strong></div><div class="report-inv-box"><span>Ganancia potencial</span><strong style="color:#455f27">${money(invRetail-invCost)}</strong></div></div></section></div>`;
    }
    function catalogPage(){const list=state.products.filter(p=>(p.name+' '+p.category+' '+p.price+' '+p.stock+' '+p.min).toLowerCase().includes(search.toLowerCase()));return `${head('Catálogo','Una vista sencilla de los productos disponibles para compartir.',`<button class="btn btn-light" data-action="copy-catalog">Compartir catálogo</button><button class="btn btn-lime" data-open="product">${icon('plus',15)} Agregar producto</button>`)}<div class="notice">Esta vista usa los productos guardados en este dispositivo. Comparte la lista desde aquí; aún no publica una tienda en internet.</div>${toolbar('Buscar en el catálogo…')}${list.length?`<div class="grid catalog-grid">${list.map(p=>`<article class="card catalog-card"><button type="button" class="catalog-art photo-zoom-trigger" data-zoom-product="${esc(p.id)}" title="Ver imagen grande" aria-label="Agrandar imagen de ${esc(p.name)}">${productArt(p)}</button><div class="catalog-body"><div class="catalog-name">${esc(p.name)}</div><div class="catalog-meta"><span>${esc(p.category||'Producto')}</span><span>${p.stock>0?'Disponible':'Agotado'}</span></div><div class="catalog-price">${money(p.price)}</div></div></article>`).join('')}</div>`:`<div class="card empty">No hay productos en el catálogo.</div>`}`}
    function closePhotoZoom(){const el=document.getElementById('photo-zoom-out');if(el){el.remove();return true}return false}
    function openPhotoZoom({photo,emoji,title,subtitle,priceText,productId}){
      closePhotoZoom();
      const wrap=document.createElement('div');
      wrap.className='modal-backdrop zoom-backdrop';wrap.id='photo-zoom-out';
      wrap.innerHTML=`<section class="modal zoom-modal" role="dialog" aria-modal="true" aria-label="Vista ampliada de imagen"><div class="modal-head" style="margin-bottom:12px"><div><h2 class="modal-title">${esc(title||'Imagen del producto')}</h2>${subtitle?`<p class="modal-desc">${esc(subtitle)}</p>`:''}</div><button type="button" class="modal-close" data-zoom-close aria-label="Cerrar">×</button></div><div class="zoom-stage">${productArt({photo,emoji})}</div>${priceText?`<div class="zoom-meta"><span>Precio de venta</span><strong>${esc(priceText)}</strong></div>`:''}<div class="modal-actions" style="margin-top:14px">${productId&&!modal?`<button type="button" class="btn btn-light" data-zoom-edit="${esc(productId)}">Editar producto</button>`:''}<button type="button" class="btn btn-primary" data-zoom-close>Cerrar</button></div></section>`;
      wrap.addEventListener('click',e=>{
        if(e.target===wrap||e.target.closest('[data-zoom-close]')){closePhotoZoom();return}
        const editBtn=e.target.closest('[data-zoom-edit]');
        if(editBtn){const id=editBtn.dataset.zoomEdit;closePhotoZoom();openModal('product',id)}
      });
      document.body.appendChild(wrap);
    }
    function bindPage(){const searchInput=document.getElementById('list-search');if(searchInput){searchInput.addEventListener('input',e=>{const pos=e.target.selectionStart;search=e.target.value;render();const fresh=document.getElementById('list-search');fresh?.focus();fresh?.setSelectionRange(pos,pos)})}const p=document.getElementById('period-select');if(p)p.addEventListener('change',e=>{period=e.target.value;render()});document.querySelectorAll('[data-report-period]').forEach(btn=>btn.addEventListener('click',()=>{period=btn.dataset.reportPeriod;render()}));document.querySelectorAll('[data-sale-filter]').forEach(btn=>btn.addEventListener('click',()=>{saleFilter=btn.dataset.saleFilter;render()}));document.querySelectorAll('[data-stock-filter]').forEach(btn=>btn.addEventListener('click',()=>{stockFilter=btn.dataset.stockFilter;render()}));document.querySelectorAll('[data-inv-cat]').forEach(btn=>btn.addEventListener('click',()=>{invCategory=btn.dataset.invCat;render()}));document.querySelectorAll('[data-inv-size]').forEach(btn=>btn.addEventListener('click',()=>{invPhotoSize=btn.dataset.invSize;try{localStorage.setItem('notas-inv-photo-size',invPhotoSize)}catch{}render()}));document.querySelectorAll('[data-zoom-product]').forEach(btn=>btn.addEventListener('click',()=>{const prod=getProduct(btn.dataset.zoomProduct);if(!prod)return;openPhotoZoom({photo:prod.photo,emoji:prod.emoji,title:prod.name,subtitle:`${prod.category||'Sin categoría'} · Stock: ${Number(prod.stock)||0}`,priceText:money(prod.price),productId:prod.id})}))}
    function drawCharts(){requestAnimationFrame(()=>{const canvas=document.getElementById('main-chart');if(!canvas)return;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;const ratio=window.devicePixelRatio||1;canvas.width=rect.width*ratio;canvas.height=rect.height*ratio;const c=canvas.getContext('2d');c.scale(ratio,ratio);const w=rect.width,h=rect.height;const n=period==='7'?7:period==='30'?6:period==='90'?6:8;const now=new Date();now.setHours(0,0,0,0);const earliest=[...state.sales.map(s=>s.date),...state.expenses.map(e=>e.date)].sort()[0];let range=period==='7'?7:period==='30'?30:period==='90'?90:360;if(period==='all'&&earliest){const start=new Date(earliest+'T00:00:00');range=Math.min(360,Math.max(30,Math.ceil((now-start)/86400000)+1))}const start=new Date(now);start.setDate(start.getDate()-range+1);const labels=Array.from({length:n},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+Math.floor(i*range/n));return new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short'}).format(d)});const sums=Array.from({length:n},()=>[0,0]);const addToBuckets=(items,slot)=>items.forEach(item=>{const d=new Date(item.date+'T00:00:00');const day=Math.floor((d-start)/86400000);if(day>=0&&day<range){const bucket=Math.min(n-1,Math.floor(day*n/range));sums[bucket][slot]+=Number(item.total??item.amount)||0}});addToBuckets(state.sales,0);addToBuckets(state.expenses,1);const max=Math.max(1,...sums.flat())*1.15;const fmtAxis=(v)=>v<=0?'0':v>=1000?`$${(v/1000).toFixed(v>=10000?0:1).replace(/\.0$/,'')}k`:money(v).replace(/\.00$/,'');c.font='10px system-ui';const yLabels=[0,1,2,3].map(i=>i===3?'0':fmtAxis(max*(1-i/3)));const leftPad=Math.max(36,Math.ceil(Math.max(...yLabels.map(t=>c.measureText(t).width)))+10);const pad={l:leftPad,r:8,t:10,b:26},iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;for(let i=0;i<4;i++){const y=pad.t+ih*i/3;c.strokeStyle=i===3?'#dfe4dd':'#eef1ec';c.setLineDash(i===3?[]:[3,3]);c.lineWidth=1;c.beginPath();c.moveTo(pad.l,y);c.lineTo(w-pad.r,y);c.stroke();c.fillStyle='#8c978e';c.textAlign='right';c.fillText(yLabels[i],pad.l-6,y+3)}c.setLineDash([]);const gap=iw/n,bw=Math.max(7,Math.min(18,gap*.27));const drawBar=(x,y,bw,bh)=>{if(bh<=0)return;const r=Math.min(4,bh/2,bw/2);if(c.roundRect){c.beginPath();c.roundRect(x,y,bw,bh,[r,r,0,0]);c.fill()}else{c.fillRect(x,y,bw,bh)}};sums.forEach((pair,i)=>{const cx=pad.l+gap*i+gap/2;const hs=pair[0]>0?Math.max(3,pair[0]/max*ih):0,he=pair[1]>0?Math.max(3,pair[1]/max*ih):0;c.fillStyle='#cde95d';drawBar(cx-bw-1.5,pad.t+ih-hs,bw,hs);c.fillStyle='#edc99e';drawBar(cx+1.5,pad.t+ih-he,bw,he);c.textAlign='center';c.fillStyle='#849087';c.fillText(labels[i],cx,h-7)});c.textAlign='left'})}
    function showMoreMenu(){modal={type:'more'};render()}
    function action(type){if(type==='settings'){modal={type:'settings'};render();return}if(type==='export'){exportData();return}if(type==='copy-catalog'){copyCatalog();return}if(type.startsWith('collect:')){openModal('collect',type.split(':')[1]);return}if(type.startsWith('receipt:')){showReceipt(type.split(':')[1]);return}if(type.startsWith('adjust:')){openModal('adjust',type.split(':')[1]);return}}
    function openModal(type,id=null){
      if(type==='sale'){
        const previous=id?state.sales.find(s=>s.id===id):null;
        if(id&&!previous)return toast('No encontré la nota para editar',true);
        saleDraft=previous?getSaleItems(previous).map(item=>({productId:item.productId,product:item.product,qty:item.qty,unitPrice:item.unitPrice})):[];
        saleStep=id?'review':'pick';saleSearch='';saleCategory='Todas';returnToSale=null;
        saleMeta={customer:previous?.customer||'',date:previous?.date||today(),seller:previous?.seller??state.settings.seller??'',payment:previous?.payment||'Efectivo',paid:previous?.paid??0};
      }
      if(type==='product'){
        returnToSale=modal?.type==='sale'?{...modal,step:saleStep}:null;
        productPhotoDraft=null;productFormDraft=null;photoBusy=false;
      }
      modal={type,id};render()
    }
    function stopCameraStream(){if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}}
    function closeModal(){stopCameraStream();clearModalDraft();productFormDraft=null;if(modal?.type==='product'&&returnToSale){saleStep=returnToSale.step;modal={type:'sale',id:returnToSale.id};returnToSale=null;productPhotoDraft=null;render();return}modal=null;saleDraft=[];returnToSale=null;productPhotoDraft=null;render()}
    function toast(message,error=false){const old=document.querySelector('.toast');old?.remove();const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=message;document.body.appendChild(el);clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.remove(),2600)}
    const field=(label,name,type='text',value='',opts={})=>`<div class="field ${opts.full?'full':''}"><label for="${name}">${label}</label>${opts.options?`<select id="${name}" name="${name}">${opts.options.map(o=>`<option ${String(value)===String(o.value)?'selected':''} value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select>`:type==='textarea'?`<textarea id="${name}" name="${name}" placeholder="${opts.placeholder||''}">${esc(value)}</textarea>`:`<input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${opts.min!=null?`min="${opts.min}"`:''} ${opts.step?`step="${opts.step}"`:''} ${opts.list?`list="${opts.list}"`:''} ${opts.placeholder?`placeholder="${opts.placeholder}"`:''} ${opts.required?'required':''} />`}</div>`;
    function modalFrame(title,desc,content,submit='Guardar'){return `<div class="modal-backdrop" id="modal-out"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2 class="modal-title">${title}</h2><p class="modal-desc">${desc}</p></div><button class="modal-close" data-action="close" aria-label="Cerrar">×</button></div>${content}<div class="modal-actions"><button class="btn btn-light" data-action="close">Cancelar</button><button class="btn btn-primary" id="modal-submit">${submit}</button></div></section></div>`}
    function saleAvailable(productId){
      const previous=modal?.type==='sale'&&modal.id?state.sales.find(s=>s.id===modal.id):null;
      const oldQty=previous?getSaleItems(previous).filter(item=>item.productId===productId).reduce((sum,item)=>sum+item.qty,0):0;
      const product=getProduct(productId);
      return (product?Math.max(0,Number(product.stock)||0):0)+oldQty
    }
    const selectedQty=(productId)=>saleDraft.filter(item=>item.productId===productId).reduce((sum,item)=>sum+(Number(item.qty)||0),0);
    function renderSaleDraft(){const list=document.getElementById('sale-draft-list');if(!list)return;list.innerHTML=saleDraft.length?saleDraft.map((item,index)=>`<div class="sale-draft-item" data-draft-row="${index}"><div class="sale-draft-top"><div class="sale-review-product"><span class="sale-photo">${productArt(getProduct(item.productId))}</span><div><strong>${esc(item.product)}</strong><small>${getProduct(item.productId)?`Disponibles para esta nota: ${saleAvailable(item.productId)}`:'Producto fuera del inventario'}</small></div></div><button type="button" class="text-btn delete-action" data-remove-draft="${index}">Quitar</button></div><div class="sale-review-fields"><div class="sale-edit-field"><label for="draft-qty-${index}">Cantidad</label><div class="review-qty-control"><button type="button" data-review-adjust="${index}" data-delta="-1" aria-label="Restar una unidad de ${esc(item.product)}" ${Number(item.qty)<=1?'disabled':''}>−</button><input id="draft-qty-${index}" type="text" inputmode="numeric" autocomplete="off" value="${esc(item.qty)}" data-draft-qty="${index}" aria-label="Cantidad de ${esc(item.product)}" /><button type="button" data-review-adjust="${index}" data-delta="1" aria-label="Sumar una unidad de ${esc(item.product)}" ${Number(item.qty)>=saleAvailable(item.productId)?'disabled':''}>+</button></div></div><label>Precio unitario<input type="number" inputmode="decimal" min="0" step="0.01" value="${item.unitPrice}" data-draft-price="${index}" /></label></div><div class="sale-review-line">Subtotal: <span data-line-total="${index}">${money(item.qty*item.unitPrice)}</span></div></div>`).join(''):'<div class="sale-draft-empty">Aún no hay productos. Toca “＋ Agregar productos”.</div>';const sub=document.getElementById('modal-submit');if(sub&&modal?.type==='sale')sub.disabled=!saleDraft.length;updateTotal()}
    function renderSaleProducts(){const q=saleSearch.trim().toLocaleLowerCase('es-MX');const matches=state.products.filter(p=>(saleCategory==='Todas'||p.category===saleCategory)&&(p.name+' '+(p.category||'')).toLocaleLowerCase('es-MX').includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'es-MX'));if(!matches.length)return '<div class="empty">No encontré productos. Prueba otra búsqueda o agrega uno nuevo.</div>';return matches.map(p=>{const qty=selectedQty(p.id),avail=saleAvailable(p.id),remaining=avail-qty,isLow=avail>0&&avail<=Number(p.min||0),pillClass=avail<1?'out':isLow?'low':'';return `<div class="sale-product-card ${qty>0?'selected':''} ${avail<1?'sold-out':''}" data-sale-card="${esc(p.id)}"><button type="button" class="sale-photo" data-sale-tap="${esc(p.id)}" aria-label="Agregar 1 unidad de ${esc(p.name)}">${productArt(p)}</button><div class="sale-product-main"><button type="button" class="sale-card-tap" data-sale-tap="${esc(p.id)}" aria-label="Agregar 1 unidad de ${esc(p.name)}"><div class="sale-product-top"><div class="sale-product-name">${esc(p.name)}</div>${avail<=Number(p.min||0)?`<span class="sale-stock-warn" aria-hidden="true">!</span>`:''}</div><div class="sale-stock-pill ${pillClass}">${avail>0?`${avail} disponibles`:'Agotado'}</div></button><div class="sale-card-foot"><div class="sale-product-price">${money(p.price)}</div><div class="qty-stepper"><button type="button" data-sale-adjust="-1" data-id="${esc(p.id)}" aria-label="Quitar una unidad de ${esc(p.name)}" ${qty<1?'disabled':''}>−</button><strong>${qty}</strong><button type="button" data-sale-adjust="1" data-id="${esc(p.id)}" aria-label="Agregar una unidad de ${esc(p.name)}" ${remaining<1?'disabled':''}>+</button></div></div></div></div>`}).join('')}
    function saleTotal(){return Math.round(saleDraft.reduce((sum,item)=>sum+Math.max(0,Number(item.qty)||0)*Math.max(0,Number(item.unitPrice)||0),0)*100)/100}
    function captureSaleMeta(){for(const name of ['customer','date','seller','payment','paid']){const input=document.getElementById(name);if(input)saleMeta[name]=input.value}}
    function renderModal(){if(modal.type==='more')return `<div class="modal-backdrop" id="modal-out"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2 class="modal-title">Más secciones</h2><p class="modal-desc">Abre una sección de Notas</p></div><button class="modal-close" data-action="close">×</button></div><div class="nav">${navItems.filter(x=>!['inicio','ventas','inventario','reportes'].includes(x[0])).map(x=>navButton(x[0],x[1],x[2])).join('')}<button class="nav-btn" data-action="settings"><span class="nav-icon">${icon('settings')}</span><span>Configuración</span></button></div></section></div>`;
      if(modal.type==='settings')return `<div class="modal-backdrop" id="modal-out"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2 class="modal-title">Configuración</h2><p class="modal-desc">Datos que aparecerán en los comprobantes.</p></div><button class="modal-close" data-action="close">×</button></div><div class="business-settings"><label>Nombre del negocio<input id="business-name" value="${esc(state.settings.business)}" placeholder="Mi negocio" /></label><label>Dirección o ubicación<input id="business-address" value="${esc(state.settings.address)}" placeholder="Colonia, ciudad" /></label><label>Teléfono<input id="business-phone" type="tel" value="${esc(state.settings.phone)}" placeholder="Número de contacto" /></label><label>Correo electrónico<input id="business-email" type="email" value="${esc(state.settings.email)}" placeholder="correo@negocio.com" /></label><label>Registro o identificador comercial<input id="business-registration" value="${esc(state.settings.registration)}" placeholder="Opcional" /></label><label>Vendedor predeterminado<input id="business-seller" value="${esc(state.settings.seller)}" placeholder="Nombre del vendedor" /></label></div><div class="setting-block"><div class="setting-row"><div><div class="setting-label">Moneda</div><div class="setting-hint">Se usa para mostrar importes.</div></div><select id="currency"><option value="MXN" ${state.settings.currency==='MXN'?'selected':''}>MXN · Peso mexicano</option><option value="USD" ${state.settings.currency==='USD'?'selected':''}>USD · Dólar estadounidense</option><option value="COP" ${state.settings.currency==='COP'?'selected':''}>COP · Peso colombiano</option><option value="EUR" ${state.settings.currency==='EUR'?'selected':''}>EUR · Euro</option></select></div></div><div class="setting-block"><div class="setting-row"><div><div class="setting-label">Copia de seguridad</div><div class="setting-hint">Exporta o importa tus registros entre celular y PC.</div></div><div class="setting-actions"><button class="btn btn-light btn-sm" data-action="import">Importar</button><button class="btn btn-light btn-sm" data-action="export">${icon('export',14)} Exportar</button><input id="import-backup-file" type="file" accept=".json,application/json" hidden /></div></div></div><div class="setting-block"><div class="setting-row"><div><div class="setting-label">Actualizaciones</div><div class="setting-hint">Versión instalada: v${esc(APP_LOCAL_VERSION.webVersion||APP_LOCAL_VERSION.versionName)} (${esc(APP_LOCAL_VERSION.platform||'web')})</div></div><button class="btn btn-light btn-sm" data-action="${updateInfo?'apply-update':'check-update'}">${updateInfo?'Instalar v'+esc(updateInfo.webVersion||updateInfo.versionName):'Buscar actualización'}</button></div></div><div class="setting-block"><div class="setting-row"><div><div class="setting-label">Empezar de nuevo</div><div class="setting-hint">Restaura datos de demostración en este dispositivo.</div></div><button class="btn btn-danger btn-sm" data-action="reset">Restablecer</button></div></div><div class="modal-actions"><button class="btn btn-light" data-action="close">Cerrar</button><button class="btn btn-primary" data-action="save-settings">Guardar cambios</button></div></section></div>`;
      if(modal.type==='receipt'){const s=state.sales.find(x=>x.id===modal.id);if(!s)return '';const items=getSaleItems(s),business=state.settings,paid=Number(s.paid)||0;return `<div class="modal-backdrop" id="modal-out"><section class="modal receipt-modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2 class="modal-title">Comprobante de venta</h2><p class="modal-desc">Vista previa de la nota que compartirás</p></div><button class="modal-close" data-action="close">×</button></div><article class="invoice-paper"><header class="invoice-business"><h2>${esc(business.business||'Mi negocio')}</h2>${business.address?`<div>${esc(business.address)}</div>`:''}<div class="invoice-contact">${business.phone?`<span>☎ ${esc(business.phone)}</span>`:''}${business.email?`<span>✉ ${esc(business.email)}</span>`:''}${business.registration?`<span>⌂ ${esc(business.registration)}</span>`:''}</div></header><div class="invoice-divider"></div><section class="invoice-meta"><div><span>Fecha</span><strong>${esc(invoiceDate(s))}</strong></div><div><span>Vendedor</span><strong>${esc(s.seller||business.seller||'—')}</strong></div><div><span>Método de pago</span><strong>${esc(s.payment==='Pendiente'?'Por definir':s.payment||'—')}</strong></div><div><span>Estado</span><strong class="${pending(s)>0?'invoice-pending':''}">${pending(s)>0?'Pendiente':'Pagada'}</strong></div><div><span>Número de transacción</span><strong>${esc(s.folio||'0001')}</strong></div>${s.customer?`<div><span>Cliente</span><strong>${esc(s.customer)}</strong></div>`:''}</section><div class="invoice-table-wrap"><table class="invoice-table"><colgroup><col style="width:43%"><col style="width:14%"><col style="width:21%"><col style="width:22%"></colgroup><thead><tr><th>Productos</th><th>Cantidad</th><th>Precio unitario</th><th>Valor</th></tr></thead><tbody>${items.map(item=>`<tr><td>${esc(item.product)}</td><td>${item.qty}</td><td>${money(item.unitPrice)}</td><td>${money(item.total)}</td></tr>`).join('')}</tbody></table></div><div class="invoice-total"><span>Total:</span><strong>${money(s.total)}</strong></div>${pending(s)>0?`<div class="invoice-balance"><span>Pagado ${money(paid)}</span><strong>Saldo pendiente ${money(pending(s))}</strong></div>`:''}</article><div class="modal-actions invoice-actions"><button class="btn btn-light" data-action="close">Cerrar</button><button class="btn btn-light" data-edit="sale" data-id="${s.id}">Editar nota</button><button class="btn btn-light" data-action="share-receipt:${s.id}">Compartir como imagen</button><button class="btn btn-primary" data-action="print">Imprimir / Guardar PDF</button></div></section></div>`}
      if(modal.type==='sale'){
        const s=modal.id?state.sales.find(x=>x.id===modal.id):null;
        if(modal.id&&!s)return '';
        const customers=[{value:'',label:'Venta de mostrador'},...state.customers.map(c=>({value:c.name,label:c.name}))];
        if(saleMeta.customer&&!customers.some(c=>c.value===saleMeta.customer))customers.push({value:saleMeta.customer,label:saleMeta.customer});
        const categories=['Todas',...new Set(state.products.map(p=>p.category||'Productos'))].sort((a,b)=>a==='Todas'?-1:b==='Todas'?1:a.localeCompare(b,'es-MX'));
        const picker=`<div class="sale-search-row"><div class="sale-search-wrap"><input class="sale-search" id="product-search" type="search" autocomplete="off" placeholder="Buscar producto…" aria-label="Buscar productos" value="${esc(saleSearch)}" /><button type="button" class="sale-search-clear" data-sale-clear-search aria-label="Limpiar búsqueda" ${saleSearch?'':'hidden'}>×</button></div><button type="button" class="sale-new-compact" data-open="product">＋ Nuevo</button></div><div class="sale-categories" role="tablist" aria-label="Categorías">${categories.map(c=>`<button type="button" class="sale-chip ${c===saleCategory?'active':''}" data-sale-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div><div id="sale-product-results" class="sale-products">${renderSaleProducts()}</div>`;
        const showPaid=s||saleMeta.payment==='Pendiente';
        const payBlock=`<div class="sale-pay-block"><span class="sale-pay-label">Forma de pago</span><input type="hidden" id="payment" name="payment" value="${esc(saleMeta.payment)}" /><div class="sale-pay-pills" role="group" aria-label="Forma de pago">${['Efectivo','Tarjeta','Transferencia','Pendiente'].map(v=>`<button type="button" class="sale-pay-pill ${saleMeta.payment===v?'active':''}" data-pay-method="${v}">${v}</button>`).join('')}</div></div>${showPaid?`<div class="sale-paid-row">${field(s?'Importe ya pagado':'Abono inicial (opcional)','paid','number',saleMeta.paid??0,{min:0,step:'0.01',placeholder:'0',required:Boolean(s)})}<div class="sale-paid-meta"><span class="sale-paid-badge" id="sale-paid-badge"></span>${s?`<button type="button" class="btn btn-light btn-sm" data-pay-full>Liquidar total</button>`:''}</div></div>`:''}`;
        const review=`<div class="sale-review-head"><h3>Productos seleccionados</h3><button type="button" class="btn btn-light btn-sm" data-sale-step="pick">＋ Agregar productos</button></div><div id="sale-draft-list" class="sale-draft-list"></div><form id="modal-form" class="sale-review-form">${payBlock}${field('Cliente (opcional)','customer','text',saleMeta.customer,{options:customers})}${field('Fecha','date','date',saleMeta.date,{required:true})}${field('Vendedor/a','seller','text',saleMeta.seller,{placeholder:'Nombre del vendedor',full:true})}</form>`;
        const units=saleDraft.reduce((sum,item)=>sum+Number(item.qty),0);
        return `<div class="modal-backdrop sale-backdrop" id="modal-out"><section class="modal sale-modal" role="dialog" aria-modal="true"><div class="modal-head sale-modal-head"><div><h2 class="modal-title">${s?`Editar nota ${esc(s.folio||'')}`:'Nueva venta'}</h2><div class="sale-step-bar"><button type="button" class="sale-step-pill ${saleStep==='pick'?'active':''}" data-sale-step="pick">1. Productos</button><button type="button" class="sale-step-pill ${saleStep==='review'?'active':''}" data-sale-step="review" ${saleDraft.length?'':'disabled'}>2. Cobro y datos</button></div></div><button class="modal-close" data-action="close" aria-label="Cerrar">×</button></div><div class="sale-body">${saleStep==='pick'?picker:review}</div><div class="sale-bottom"><div class="sale-bottom-summary"><div><span id="sale-count">${units} unidad(es)</span><div class="sale-bottom-pending" id="sale-bottom-pending" hidden></div></div><strong id="sale-total">${money(saleTotal())}</strong></div>${saleStep==='pick'?`<button class="btn btn-primary" data-sale-step="review" ${saleDraft.length?'':'disabled'}>Continuar · Cobrar →</button>`:`<button class="btn btn-primary" id="modal-submit" ${saleDraft.length?'':'disabled'}>${s?'Guardar cambios':'Guardar nota'}</button>`}</div></section></div>`
      }
      if(modal.type==='expense'){const e=modal.id?state.expenses.find(x=>x.id===modal.id):null;return modalFrame(e?'Editar gasto':'Registrar gasto','Anota el concepto y el importe para el control de caja.',`<form id="modal-form" class="form-grid">${field('Concepto','name','text',e?.name||'',{full:true,required:true,placeholder:'Ej. compra de insumos'})}${field('Importe','amount','number',e?.amount??'',{min:0,step:'0.01',required:true})}${field('Fecha','date','date',e?.date||today(),{required:true})}${field('Categoría','category','text',e?.category||'Insumos',{options:['Insumos','Servicios','Renta','Empaque','Transporte','Nómina','Otros'].map(v=>({value:v,label:v}))})}${field('Forma de pago','payment','text',e?.payment||'Efectivo',{options:['Efectivo','Tarjeta','Transferencia','Otro'].map(v=>({value:v,label:v}))})}${field('Nota','notes','textarea',e?.notes||'',{full:true,placeholder:'Detalle opcional'})}</form>`,e?'Guardar cambios':'Guardar gasto')}
      if(modal.type==='product'){const p=state.products.find(x=>x.id===modal.id)||{};const f=productFormDraft||{};const photo=productPhotoDraft===null?p.photo:productPhotoDraft;const cats=[...new Set(state.products.map(x=>x.category||'Productos'))].sort((a,b)=>a.localeCompare(b,'es-MX'));return modalFrame(modal.id?'Editar producto':'Agregar producto','Configura precio, costo y alerta de stock mínimo.',`<form id="modal-form" class="form-grid"><div class="photo-edit"><button type="button" class="photo-preview photo-zoom-trigger" id="photo-preview" title="Ver imagen grande" aria-label="Agrandar vista previa">${productArt({...p,photo})}</button><div class="photo-controls"><strong>Foto del producto</strong><div class="photo-btn-row"><button type="button" class="btn btn-light btn-sm" id="product-camera-btn">${icon('camera',15)} Tomar foto</button><label for="product-photo" class="btn btn-light btn-sm" id="product-gallery-lbl">${icon('image',15)} Galería</label><input id="product-camera" type="file" accept="image/*" capture="environment" hidden aria-label="Tomar foto con cámara" /><input id="product-photo" type="file" accept="image/*" hidden aria-label="Elegir foto de la galería" /><button type="button" class="photo-remove" id="photo-remove" ${photo?'':'hidden'}>Quitar</button></div><small>Toca la imagen para verla grande.</small></div></div><div class="camera-live-box" id="camera-live-box" hidden><video class="camera-live-video" id="camera-live-video" autoplay playsinline muted></video><div class="camera-live-actions"><button type="button" class="btn btn-light btn-sm" id="camera-live-cancel">Cancelar</button><button type="button" class="btn btn-lime btn-sm" id="camera-live-snap">${icon('camera',15)} Capturar</button></div></div>${field('Nombre','name','text',f.name??p.name??'',{full:true,required:true,placeholder:'Ej. Café americano'})}${field('Categoría','category','text',(f.category??p.category)||'Productos',{list:'product-categories',placeholder:'Productos'})}<datalist id="product-categories">${cats.map(c=>`<option value="${esc(c)}"></option>`).join('')}</datalist>${field('Emoji si no hay foto','emoji','text',(f.emoji??p.emoji)||'📦',{placeholder:'📦'})}${field('Precio de venta','price','number',f.price??p.price??'',{min:0,step:'0.01',required:true})}${field('Costo unitario','cost','number',f.cost??p.cost??0,{min:0,step:'0.01'})}<div class="field-live-hint" id="product-margin-hint"></div>${field('Existencias actuales','stock','number',f.stock??p.stock??0,{min:0,step:1})}${field('Avisar al llegar a','min','number',f.min??p.min??3,{min:0,step:1})}</form>`,modal.id?'Guardar cambios':'Guardar producto')}
      if(modal.type==='customer'||modal.type==='supplier'){const customer=modal.type==='customer',list=customer?state.customers:state.suppliers,x=list.find(a=>a.id===modal.id)||{};return modalFrame(modal.id?'Editar contacto':customer?'Agregar cliente':'Agregar proveedor','Guarda los datos para encontrarlos fácilmente después.',`<form id="modal-form" class="form-grid">${field('Nombre','name','text',x.name||'',{full:true,required:true})}${field('Teléfono','phone','tel',x.phone||'')}${customer?'':field('Correo','email','email',x.email||'')}${field('Notas','notes','textarea',x.notes||'',{full:true,placeholder:'Información útil sobre este contacto'})}</form>`,customer?'Guardar cliente':'Guardar proveedor')}
      if(modal.type==='collect'){const s=state.sales.find(x=>x.id===modal.id);if(!s)return '';return modalFrame('Registrar abono',`${s.customer||'Cliente'} · saldo actual ${money(pending(s))}`,`<form id="modal-form" class="form-grid">${field('Importe recibido','amount','number','',{min:.01,step:'0.01',required:true})}${field('Fecha','date','date',today(),{required:true})}<div class="field"><label for="payment">Forma de pago</label><select id="payment" name="payment"><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option><option>Otro</option></select></div></form>`,'Guardar abono')}
      if(modal.type==='adjust'){const p=getProduct(modal.id);if(!p)return '';return modalFrame('Ajustar existencias',`${esc(p.name)} · tienes ${p.stock} unidad(es)`, `<form id="modal-form" class="form-grid"><input type="hidden" id="movement" name="movement" value="add" /><div class="adjust-modes" role="group" aria-label="Tipo de ajuste"><button type="button" class="adjust-mode active" data-adjust-mode="add">+ Sumar</button><button type="button" class="adjust-mode" data-adjust-mode="remove">− Restar</button><button type="button" class="adjust-mode" data-adjust-mode="set">= Fijar total</button></div>${field('Cantidad','amount','number',1,{min:0,step:1,required:true,full:true})}<div class="adjust-quick">${[1,5,10,25].map(n=>`<button type="button" class="adjust-chip" data-adjust-val="${n}">${n}</button>`).join('')}</div><div class="adjust-preview" id="adjust-preview" data-current-stock="${Number(p.stock)||0}"><span>Stock actual: ${p.stock}</span><strong>Nuevo: ${(Number(p.stock)||0)+1}</strong></div><div class="field full"><div class="field-help">Si es una compra nueva y quieres llevar control del gasto, regístrala también en Gastos.</div></div></form>`,'Actualizar stock')}
      return ''}
    function bindModal(){
      const backdrop=document.getElementById('modal-out');backdrop?.addEventListener('click',e=>{if(e.target===backdrop)closeModal()});
      const form=document.getElementById('modal-form');const submit=document.getElementById('modal-submit');if(submit&&form)submit.addEventListener('click',()=>form.requestSubmit());if(form)form.addEventListener('submit',e=>{e.preventDefault();submitForm(form)});
      const productSearch=document.getElementById('product-search'),results=document.getElementById('sale-product-results'),clearSearch=document.querySelector('[data-sale-clear-search]');
      const adjustDraftProduct=(id,delta)=>{const p=getProduct(id);if(!p)return;const current=selectedQty(p.id),next=current+delta;if(next<0||next>saleAvailable(p.id))return toast(saleAvailable(p.id)<1?`${p.name} está agotado`:`Solo puedes incluir ${saleAvailable(p.id)} unidad(es) de ${p.name}`,true);const item=saleDraft.find(x=>x.productId===p.id);if(item){item.qty=next;if(!next)saleDraft=saleDraft.filter(x=>x!==item)}else if(next>0)saleDraft.push({productId:p.id,product:p.name,qty:next,unitPrice:Number(p.price)||0});if(results)results.innerHTML=renderSaleProducts();updateTotal();document.querySelectorAll('[data-sale-step="review"]').forEach(b=>b.disabled=!saleDraft.length)};
      if(productSearch&&results){productSearch.addEventListener('input',()=>{saleSearch=productSearch.value;if(clearSearch)clearSearch.hidden=!saleSearch;results.innerHTML=renderSaleProducts()});clearSearch?.addEventListener('click',()=>{saleSearch='';productSearch.value='';clearSearch.hidden=true;results.innerHTML=renderSaleProducts();productSearch.focus()});document.querySelectorAll('[data-sale-cat]').forEach(btn=>btn.addEventListener('click',()=>{saleCategory=btn.dataset.saleCat;document.querySelectorAll('[data-sale-cat]').forEach(c=>c.classList.toggle('active',c===btn));results.innerHTML=renderSaleProducts()}));results.addEventListener('click',e=>{const adjustBtn=e.target.closest('[data-sale-adjust]');if(adjustBtn){adjustDraftProduct(adjustBtn.dataset.id,Number(adjustBtn.dataset.saleAdjust));return}const tapBtn=e.target.closest('[data-sale-tap]');if(tapBtn)adjustDraftProduct(tapBtn.dataset.saleTap,1)})}
      document.querySelectorAll('[data-sale-step]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.saleStep===saleStep)return;if(button.dataset.saleStep==='review'&&!saleDraft.length)return toast('Elige al menos un producto',true);captureSaleMeta();saleStep=button.dataset.saleStep;render()}));
      document.querySelectorAll('[data-pay-method]').forEach(btn=>btn.addEventListener('click',()=>{captureSaleMeta();saleMeta.payment=btn.dataset.payMethod;if(!modal?.id&&saleMeta.payment!=='Pendiente')saleMeta.paid=0;render()}));
      document.querySelector('[data-pay-full]')?.addEventListener('click',()=>{const paidInput=document.getElementById('paid');if(!paidInput)return;const t=saleTotal();paidInput.value=String(t);saleMeta.paid=t;updateTotal()});
      const draftList=document.getElementById('sale-draft-list');
      draftList?.addEventListener('focusin',e=>{const input=e.target;if(input.dataset?.draftQty==null)return;input.select();requestAnimationFrame(()=>{if(document.activeElement===input)input.select()})});
      draftList?.addEventListener('input',e=>{
        const input=e.target,index=Number(input.dataset?.draftQty??input.dataset?.draftPrice);
        if(!Number.isInteger(index)||!saleDraft[index])return;
        const item=saleDraft[index];
        if(input.dataset.draftQty!=null){
          const raw=input.value.trim(),qty=Number(raw);
          if(/^[1-9]\d*$/.test(raw)&&Number.isSafeInteger(qty)){
            item.qty=qty;input.removeAttribute('aria-invalid');
            const row=input.closest('[data-draft-row]');
            const minus=row?.querySelector('[data-delta="-1"]'),plus=row?.querySelector('[data-delta="1"]');
            if(minus)minus.disabled=qty<=1;
            if(plus)plus.disabled=qty>=saleAvailable(item.productId);
          }
          else input.setAttribute('aria-invalid','true');
        }else item.unitPrice=Math.max(0,Number(input.value)||0);
        const line=document.querySelector(`[data-line-total="${index}"]`);
        if(line)line.textContent=money(item.qty*item.unitPrice);
        updateTotal();
      });
      draftList?.addEventListener('click',e=>{
        const remove=e.target.closest('[data-remove-draft]');
        if(remove){saleDraft.splice(Number(remove.dataset.removeDraft),1);renderSaleDraft();return}
        const adjust=e.target.closest('[data-review-adjust]');if(!adjust)return;
        const item=saleDraft[Number(adjust.dataset.reviewAdjust)];if(!item)return;
        const next=Number(item.qty)+Number(adjust.dataset.delta);
        if(!Number.isInteger(next)||next<1||next>saleAvailable(item.productId))return;
        item.qty=next;renderSaleDraft();
      });
      const photoInput=document.getElementById('product-photo'),galleryLbl=document.getElementById('product-gallery-lbl'),photoPreview=document.getElementById('photo-preview'),cameraInput=document.getElementById('product-camera'),cameraBtn=document.getElementById('product-camera-btn'),photoRemove=document.getElementById('photo-remove'),camBox=document.getElementById('camera-live-box'),camVideo=document.getElementById('camera-live-video'),camSnap=document.getElementById('camera-live-snap'),camCancel=document.getElementById('camera-live-cancel');
      photoPreview?.addEventListener('click',()=>{const prod=modal?.id?getProduct(modal.id):null;const curPhoto=productPhotoDraft===null?prod?.photo:productPhotoDraft;const title=document.getElementById('name')?.value?.trim()||prod?.name||'Vista previa';const emoji=document.getElementById('emoji')?.value?.trim()||prod?.emoji||'📦';if(curPhoto||prod)openPhotoZoom({photo:curPhoto,emoji,title})});
      const applyProductPhotoDataUrl=(dataUrl)=>{productPhotoDraft=dataUrl;const prev=document.getElementById('photo-preview');if(prev)prev.innerHTML=productArt({photo:productPhotoDraft});if(photoRemove)photoRemove.hidden=false};
      const drawSquaredPhoto=(source,sw,sh)=>{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,320,320);const scale=Math.min(320/sw,320/sh),w=Math.max(1,sw*scale),h=Math.max(1,sh*scale);ctx.drawImage(source,(320-w)/2,(320-h)/2,w,h);return canvas.toDataURL('image/jpeg',.72)};
      const handleImageFile=(file)=>{if(!file)return;if(!file.type.startsWith('image/'))return toast('Selecciona una imagen',true);photoBusy=true;if(submit)submit.disabled=true;const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{try{applyProductPhotoDataUrl(drawSquaredPhoto(img,img.width,img.height))}catch{toast('No se pudo preparar la foto',true)}finally{URL.revokeObjectURL(url);photoBusy=false;if(submit)submit.disabled=false}};img.onerror=()=>{URL.revokeObjectURL(url);photoBusy=false;if(submit)submit.disabled=false;toast('No se pudo abrir la foto',true)};img.src=url};
      galleryLbl?.addEventListener('click',saveModalDraft);
      photoInput?.addEventListener('change',()=>{handleImageFile(photoInput.files?.[0]);photoInput.value=''});
      cameraInput?.addEventListener('change',()=>{handleImageFile(cameraInput.files?.[0]);cameraInput.value=''});
      window.notasOnCameraPhoto=(dataUrl)=>{photoBusy=false;if(submit)submit.disabled=false;if(dataUrl)applyProductPhotoDataUrl(dataUrl)};
      cameraBtn?.addEventListener('click',async()=>{
        if(window.NotasApp?.takeProductPhoto){saveModalDraft();photoBusy=true;if(submit)submit.disabled=true;window.NotasApp.takeProductPhoto();return}
        const isMobile=window.matchMedia?.('(pointer:coarse)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if(isMobile&&cameraInput){saveModalDraft();cameraInput.click();return}
        if(navigator.mediaDevices?.getUserMedia&&camBox&&camVideo){
          try{stopCameraStream();cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});camVideo.srcObject=cameraStream;camBox.hidden=false}
          catch{toast('No se pudo abrir la cámara; usa Galería para elegir una imagen',true)}
          return;
        }
        cameraInput?.click();
      });
      camCancel?.addEventListener('click',()=>{stopCameraStream();if(camBox)camBox.hidden=true});
      camSnap?.addEventListener('click',()=>{if(!camVideo?.videoWidth)return;try{applyProductPhotoDataUrl(drawSquaredPhoto(camVideo,camVideo.videoWidth,camVideo.videoHeight))}catch{toast('No se pudo capturar la foto',true)}stopCameraStream();if(camBox)camBox.hidden=true});
      photoRemove?.addEventListener('click',()=>{productPhotoDraft='';document.getElementById('photo-preview').innerHTML=productArt({emoji:document.getElementById('emoji')?.value||'📦'});photoRemove.hidden=true;if(photoInput)photoInput.value='';if(cameraInput)cameraInput.value=''});
      const marginHint=document.getElementById('product-margin-hint'),priceIn=document.getElementById('price'),costIn=document.getElementById('cost');
      if(marginHint&&priceIn&&costIn){const updateMargin=()=>{const pr=Number(priceIn.value)||0,co=Number(costIn.value)||0,diff=pr-co,pct=pr>0?Math.round(diff/pr*100):0;marginHint.innerHTML=pr>0?`Ganancia por unidad: <strong>${money(diff)}</strong> (${pct}% del precio)`:'Escribe el precio de venta para ver tu ganancia.'};priceIn.addEventListener('input',updateMargin);costIn.addEventListener('input',updateMargin);updateMargin()}
      const adjPrev=document.getElementById('adjust-preview'),adjMove=document.getElementById('movement'),adjAmt=document.getElementById('amount');
      if(adjPrev&&adjMove&&adjAmt){const cur=Number(adjPrev.dataset.currentStock)||0;const updateAdjust=()=>{const mode=adjMove.value||'add',raw=adjAmt.value.trim(),qty=Math.floor(Number(raw));const next=mode==='set'?qty:mode==='add'?cur+qty:cur-qty;const valid=raw!==''&&Number.isFinite(qty)&&(mode==='set'?qty>=0:qty>=1)&&next>=0;adjPrev.classList.toggle('warn',!valid);adjPrev.innerHTML=`<span>Stock actual: ${cur}</span><strong>${valid?`Nuevo: ${next}`:next<0?'Excede el stock actual':'Cantidad inválida'}</strong>`;if(submit)submit.disabled=!valid};document.querySelectorAll('[data-adjust-mode]').forEach(btn=>btn.addEventListener('click',()=>{adjMove.value=btn.dataset.adjustMode;document.querySelectorAll('[data-adjust-mode]').forEach(b=>b.classList.toggle('active',b===btn));updateAdjust()}));document.querySelectorAll('[data-adjust-val]').forEach(btn=>btn.addEventListener('click',()=>{adjAmt.value=btn.dataset.adjustVal;updateAdjust()}));adjAmt.addEventListener('input',updateAdjust);updateAdjust()}
      document.getElementById('paid')?.addEventListener('input',updateTotal);
      const importInput=document.getElementById('import-backup-file');
      importInput?.addEventListener('change',()=>{const file=importInput.files?.[0];if(file)importData(file);importInput.value=''});
      renderSaleDraft()
    }
    function escModal(e){if(e.key==='Escape'&&modal)closeModal()}
    function updateTotal(){
      const t=document.getElementById('sale-total'),count=document.getElementById('sale-count'),pendNote=document.getElementById('sale-bottom-pending'),paidBadge=document.getElementById('sale-paid-badge'),paidEl=document.getElementById('paid');if(!t)return;
      const total=saleTotal();t.textContent=money(total);
      if(count)count.textContent=`${saleDraft.reduce((sum,item)=>sum+Number(item.qty),0)} unidad(es)`;
      if(paidEl){
        const paidVal=Number(paidEl.value)||0,pendVal=Math.max(0,Math.round((total-paidVal)*100)/100);
        if(paidBadge)paidBadge.textContent=paidVal>total?'Supera el total':pendVal>0?`Saldo pendiente: ${money(pendVal)}`:'Pagado completo';
        if(pendNote){pendNote.hidden=paidVal<=total&&pendVal<=0;pendNote.textContent=paidVal>total?'Revisa lo pagado':pendVal>0?`Por cobrar: ${money(pendVal)}`:''}
      }else if(pendNote){pendNote.hidden=true;pendNote.textContent=''}
    }
    function submitForm(form){const fd=new FormData(form),v=Object.fromEntries(fd.entries());if(modal.type==='sale'){
        const invalidInput=[...document.querySelectorAll('[data-draft-qty]')].find(input=>{const raw=input.value.trim();return !/^[1-9]\d*$/.test(raw)||!Number.isSafeInteger(Number(raw))});
        if(invalidInput){invalidInput.setAttribute('aria-invalid','true');invalidInput.focus();return toast('Escribe una cantidad válida para cada producto',true)}
        const previous=modal.id?state.sales.find(x=>x.id===modal.id):null;
        if(modal.id&&!previous)return toast('No encontré la nota para editar',true);
        if(!saleDraft.length)return toast('Agrega al menos un producto',true);
        const originalQty=new Map(),newQty=new Map();
        if(previous)getSaleItems(previous).forEach(item=>originalQty.set(item.productId,(originalQty.get(item.productId)||0)+item.qty));
        const items=[];
        for(const draft of saleDraft){
          const p=getProduct(draft.productId),qty=Number(draft.qty),unit=Number(draft.unitPrice);
          if(!p&&!originalQty.has(draft.productId))return toast('Uno de los productos ya no existe',true);
          if(!Number.isInteger(qty)||qty<1)return toast('La cantidad debe ser un número entero mayor que cero',true);
          if(!Number.isFinite(unit)||unit<0)return toast('El precio no puede ser negativo',true);
          const price=Math.round(unit*100)/100;
          items.push({productId:draft.productId,product:draft.product||p?.name||'Producto',name:draft.product||p?.name||'Producto',qty,unitPrice:price,total:Math.round(qty*price*100)/100});
          newQty.set(draft.productId,(newQty.get(draft.productId)||0)+qty);
        }
        for(const [productId,qty] of newQty){
          const p=getProduct(productId),available=(p?Math.max(0,Number(p.stock)||0):0)+(originalQty.get(productId)||0);
          if(qty>available)return toast(`Solo puedes incluir ${available} unidad(es) de ${p?.name||'este producto'} en la nota`,true);
        }
        const total=Math.round(items.reduce((sum,item)=>sum+item.total,0)*100)/100;
        const pay=v.payment,rawPaid=v.paid!==undefined&&v.paid!==''?Number(v.paid):0,paid=previous?Number(v.paid):pay==='Pendiente'?rawPaid:total;
        if(!Number.isFinite(paid)||paid<0||paid>total)return toast('El importe pagado debe estar entre cero y el total de la nota',true);
        const now=new Date(),folio=previous?.folio||String(state.saleSequence||1).padStart(4,'0');
        const sale={...previous,id:previous?.id||uid(),folio,date:v.date,time:previous?previous.time||'':now.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}),seller:(v.seller||'').trim(),items,product:items.length===1?items[0].product:`${items.length} productos`,productId:items.length===1?items[0].productId:'',qty:items.reduce((sum,item)=>sum+item.qty,0),unitPrice:items.length===1?items[0].unitPrice:0,total,customer:(v.customer||'').trim(),payment:pay,paid};
        for(const productId of new Set([...originalQty.keys(),...newQty.keys()])){
          const p=getProduct(productId);
          if(p)p.stock+=(originalQty.get(productId)||0)-(newQty.get(productId)||0);
        }
        if(previous)Object.assign(previous,sale);
        else{state.saleSequence=Number(state.saleSequence||1)+1;state.sales.unshift(sale)}
        save();saleDraft=[];modal=null;render();toast(previous?'Nota actualizada · inventario y saldo recalculados':'Nota de venta guardada · inventario actualizado');return
      }
      if(modal.type==='expense'){const record={id:modal.id||uid(),date:v.date,name:v.name.trim(),category:v.category,amount:Number(v.amount),payment:v.payment,notes:v.notes.trim()};if(modal.id){const idx=state.expenses.findIndex(x=>x.id===modal.id);if(idx>=0)state.expenses[idx]=record;else state.expenses.unshift(record)}else state.expenses.unshift(record);save();modal=null;render();toast(modal.id?'Gasto actualizado':'Gasto guardado');return}
      if(modal.type==='product'){
        if(photoBusy)return toast('Espera a que termine de cargar la foto',true);
        stopCameraStream();
        const old=modal.id?getProduct(modal.id):null,id=modal.id||uid();
        let photo=old?.photo||'';
        if(productPhotoDraft===''){if(photo&&window.NotasApp?.removeProductImage)window.NotasApp.removeProductImage(id);photo=''}
        else if(productPhotoDraft){if(window.NotasApp?.saveProductImage){photo=window.NotasApp.saveProductImage(id,productPhotoDraft);if(!photo)return toast('No se pudo guardar la foto. Intenta con otra imagen.',true)}else photo=productPhotoDraft}
        const record={id,name:v.name.trim(),category:v.category.trim()||'Productos',emoji:v.emoji.trim()||'📦',price:Number(v.price),cost:Number(v.cost)||0,stock:Math.max(0,Number(v.stock)||0),min:Math.max(0,Number(v.min)||0),photo};
        if(modal.id)state.products=state.products.map(p=>p.id===modal.id?record:p);else state.products.push(record);
        save();productPhotoDraft=null;productFormDraft=null;clearModalDraft();
        if(returnToSale){modal={type:'sale',id:returnToSale.id};saleStep=returnToSale.step;returnToSale=null;saleSearch='';saleCategory='Todas';if(!old&&record.stock>0)saleDraft.push({productId:id,product:record.name,qty:1,unitPrice:record.price})}
        else modal=null;
        render();toast('Producto guardado');return
      }
      if(modal.type==='customer'||modal.type==='supplier'){const arr=modal.type==='customer'?state.customers:state.suppliers,record={id:modal.id||uid(),name:v.name.trim(),phone:v.phone.trim(),email:v.email?.trim()||'',notes:v.notes.trim()};if(modal.id){const old=arr.find(x=>x.id===modal.id);if(old&&old.name!==record.name&&modal.type==='customer')state.sales.forEach(s=>{if(s.customer===old.name)s.customer=record.name});const i=arr.findIndex(x=>x.id===modal.id);arr[i]=record}else arr.push(record);save();modal=null;render();toast('Contacto guardado');return}
      if(modal.type==='collect'){const s=state.sales.find(x=>x.id===modal.id),amount=Number(v.amount);if(!s||!amount||amount<=0)return toast('Escribe un importe válido',true);if(amount>pending(s))return toast('El abono no puede superar el saldo pendiente',true);s.paid=Number(s.paid||0)+amount;s.payment=v.payment;save();modal=null;render();toast('Abono registrado');return}
      if(modal.type==='adjust'){const p=getProduct(modal.id),raw=String(v.amount??'').trim(),amount=Math.floor(Number(raw)),mode=v.movement||'add';if(!p||!raw||!Number.isFinite(amount)||(mode==='set'?amount<0:amount<1))return toast('Ingresa una cantidad válida',true);if(mode==='remove'&&amount>p.stock)return toast('No puedes retirar más unidades de las que hay',true);p.stock=mode==='set'?amount:p.stock+(mode==='add'?amount:-amount);save();modal=null;render();toast('Existencias actualizadas');return}}
    function deleteRecord(type,id){const labels={sale:'esta venta',expense:'este gasto',product:'este producto',customer:'este cliente',supplier:'este proveedor'};if(!confirm(`¿Eliminar ${labels[type]||'este registro'}? Esta acción no se puede deshacer.`))return;if(type==='sale'){const s=state.sales.find(x=>x.id===id);if(s)getSaleItems(s).forEach(item=>{const p=getProduct(item.productId);if(p)p.stock+=Number(item.qty)||0});state.sales=state.sales.filter(x=>x.id!==id)}if(type==='expense')state.expenses=state.expenses.filter(x=>x.id!==id);if(type==='product'){if(window.NotasApp?.removeProductImage)window.NotasApp.removeProductImage(id);state.products=state.products.filter(x=>x.id!==id)}if(type==='customer')state.customers=state.customers.filter(x=>x.id!==id);if(type==='supplier')state.suppliers=state.suppliers.filter(x=>x.id!==id);save();render();toast('Registro eliminado')}
    function exportData(){const backup={...state,products:state.products.map(p=>({...p,photo:p.photo?.startsWith('content://')&&window.NotasApp?.loadProductImage?window.NotasApp.loadProductImage(p.id):p.photo||''}))};const contents=JSON.stringify(backup,null,2);if(window.NotasApp?.saveBackup){window.NotasApp.saveBackup(contents);toast('Elige dónde guardar tu copia');return}const blob=new Blob([contents],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='notas-respaldo-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Copia de seguridad descargada')}
    function importData(file){
      const reader=new FileReader();
      reader.onload=()=>{
        try{
          const parsed=JSON.parse(String(reader.result||''));
          if(!parsed||!Array.isArray(parsed.products)||!Array.isArray(parsed.sales)||!Array.isArray(parsed.expenses)){
            return toast('El archivo no es una copia válida de Notas',true);
          }
          if(!confirm('¿Importar esta copia y reemplazar los registros actuales en este dispositivo?'))return;
          const nextProducts=parsed.products.map(p=>{
            let photo=p.photo||'';
            if(photo.startsWith('data:image/')&&window.NotasApp?.saveProductImage){
              const savedUri=window.NotasApp.saveProductImage(p.id,photo);
              if(savedUri)photo=savedUri;
            }
            return {...p,photo};
          });
          state={
            settings:{business:'Mi negocio',currency:'MXN',address:'',phone:'',email:'',registration:'',seller:'',...(parsed.settings||{})},
            products:nextProducts,
            customers:Array.isArray(parsed.customers)?parsed.customers:[],
            suppliers:Array.isArray(parsed.suppliers)?parsed.suppliers:[],
            sales:parsed.sales,
            expenses:parsed.expenses,
            saleSequence:Number(parsed.saleSequence)||1
          };
          state.sales.forEach((sale,index)=>{if(!sale.folio)sale.folio=String(state.sales.length-index).padStart(4,'0')});
          state.saleSequence=Math.max(state.saleSequence,...state.sales.map(sale=>(Number(sale.folio)||0)+1));
          save();modal=null;render();toast('Copia de seguridad restaurada');
        }catch{toast('No se pudo leer el archivo de respaldo',true)}
      };
      reader.onerror=()=>toast('Error al abrir el archivo',true);
      reader.readAsText(file);
    }
    function copyCatalog(){
      const text=[state.settings.business,'Catálogo de productos',...state.products.map(p=>`${p.name} — ${money(p.price)} (${p.stock>0?'disponible':'agotado'})`)].join('\n');
      if(window.NotasApp?.shareText){window.NotasApp.shareText(text);return}
      if(navigator.share){navigator.share({title:state.settings.business||'Catálogo',text}).catch(()=>{});return}
      if(!navigator.clipboard?.writeText){toast('Compartir no está disponible en este navegador.',true);return}
      navigator.clipboard.writeText(text).then(()=>toast('Lista copiada para compartir')).catch(()=>toast('No se pudo copiar. Revisa los permisos del navegador.',true));
    }
    function showReceipt(id){modal={type:'receipt',id};render()}
    function renderReceiptCanvas(invoice){
      const w=960,pad=56,cw=w-pad*2;
      const tmp=document.createElement('canvas');tmp.width=w;tmp.height=640+invoice.items.length*64;
      const ctx=tmp.getContext('2d');
      const wrap=(txt,font,maxW)=>{ctx.font=font;const words=String(txt||'').trim().split(/\s+/),lines=[];let cur='';for(const word of words){const cand=cur?cur+' '+word:word;if(ctx.measureText(cand).width<=maxW)cur=cand;else{if(cur)lines.push(cur);cur=word}}if(cur)lines.push(cur);return lines.length?lines:['']};
      ctx.fillStyle='#fff';ctx.fillRect(0,0,tmp.width,tmp.height);
      let y=74;
      ctx.fillStyle='#202720';ctx.font='bold 38px system-ui,sans-serif';
      for(const line of wrap(invoice.business,'bold 38px system-ui,sans-serif',cw)){ctx.fillText(line,pad,y);y+=46}
      ctx.fillStyle='#48514a';ctx.font='23px system-ui,sans-serif';
      if(invoice.address){for(const line of wrap(invoice.address,'23px system-ui,sans-serif',cw)){ctx.fillText(line,pad,y);y+=31}}
      const contact=[invoice.phone?'Tel. '+invoice.phone:'',invoice.email||''].filter(Boolean).join('  ·  ');
      if(contact){for(const line of wrap(contact,'23px system-ui,sans-serif',cw)){ctx.fillText(line,pad,y);y+=31}}
      y+=14;ctx.strokeStyle='#dfe3df';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke();y+=40;
      const rowMeta=(k,v)=>{ctx.fillStyle='#4c554f';ctx.font='23px system-ui,sans-serif';ctx.textAlign='left';ctx.fillText(k,pad,y);ctx.fillStyle='#202720';ctx.font='bold 23px system-ui,sans-serif';ctx.textAlign='right';ctx.fillText(String(v||'—'),w-pad,y);y+=36};
      rowMeta('Fecha',invoice.date);rowMeta('Vendedor',invoice.seller);rowMeta('Método de pago',invoice.payment);rowMeta('Estado',invoice.status);rowMeta('Número de transacción',invoice.folio);
      if(invoice.customer)rowMeta('Cliente',invoice.customer);
      y+=18;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke();y+=30;
      ctx.fillStyle='#303a33';ctx.font='bold 21px system-ui,sans-serif';ctx.textAlign='left';ctx.fillText('Productos',pad,y);ctx.textAlign='right';ctx.fillText('Cant.',pad+530,y);ctx.fillText('Precio',pad+730,y);ctx.fillText('Valor',w-pad,y);
      y+=14;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke();y+=36;
      for(const item of invoice.items){
        ctx.fillStyle='#202720';ctx.font='22px system-ui,sans-serif';ctx.textAlign='left';
        const lines=wrap(item.product,'22px system-ui,sans-serif',420);
        lines.forEach((l,i)=>ctx.fillText(l,pad,y+i*30));
        ctx.textAlign='right';ctx.fillText(item.qty,pad+530,y);ctx.fillText(item.unitPrice,pad+730,y);
        ctx.font='bold 22px system-ui,sans-serif';ctx.fillText(item.total,w-pad,y);
        y+=Math.max(30,lines.length*30)+14;
        ctx.strokeStyle='#f0f2ef';ctx.beginPath();ctx.moveTo(pad,y-8);ctx.lineTo(w-pad,y-8);ctx.stroke();
      }
      y+=34;ctx.textAlign='left';ctx.fillStyle='#202720';ctx.font='bold 34px system-ui,sans-serif';ctx.fillText('Total:',pad,y);
      ctx.textAlign='right';ctx.font='bold 40px system-ui,sans-serif';ctx.fillText(invoice.total,w-pad,y);
      if(invoice.pending){y+=38;rowMeta('Pagado '+invoice.paid,'Saldo pendiente '+invoice.pending)}
      const out=document.createElement('canvas');out.width=w;out.height=Math.min(tmp.height,y+52);
      out.getContext('2d').drawImage(tmp,0,0,w,out.height,0,0,w,out.height);
      return out;
    }
    function shareReceipt(id){
      const s=state.sales.find(x=>x.id===id);if(!s)return;
      const invoice={business:state.settings.business||'Mi negocio',address:state.settings.address||'',phone:state.settings.phone||'',email:state.settings.email||'',registration:state.settings.registration||'',date:invoiceDate(s),seller:s.seller||state.settings.seller||'—',payment:s.payment==='Pendiente'?'Por definir':s.payment||'—',status:pending(s)>0?'Pendiente':'Pagada',folio:s.folio||'0001',customer:s.customer||'',total:money(s.total),paid:money(s.paid),pending:pending(s)>0?money(pending(s)):'',items:getSaleItems(s).map(item=>({product:item.product,qty:String(item.qty),unitPrice:money(item.unitPrice),total:money(item.total)}))};
      if(window.NotasApp?.shareReceiptImage){window.NotasApp.shareReceiptImage(JSON.stringify(invoice));return}
      const canvas=renderReceiptCanvas(invoice);
      canvas.toBlob(async blob=>{
        if(!blob)return toast('No se pudo crear la imagen',true);
        const fileName=`nota-${invoice.folio||'0001'}.png`;
        const file=new File([blob],fileName,{type:'image/png'});
        if(navigator.canShare?.({files:[file]})){
          try{await navigator.share({title:`Nota ${invoice.folio}`,files:[file]});return}catch{}
        }
        const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fileName;a.click();
        setTimeout(()=>URL.revokeObjectURL(a.href),1000);
        toast('Imagen de la nota descargada');
      },'image/png');
    }
    async function checkForUpdates(manual=false){
      const candidates=location.protocol==='file:'?[UPDATE_MANIFEST_URL]:['./version.json',UPDATE_MANIFEST_URL];
      for(const url of candidates){
        try{
          const res=await fetch(url+'?t='+Date.now(),{cache:'no-store'});
          if(!res.ok)continue;
          const remote=await res.json();
          const hasNewWeb=compareSemver(remote.webVersion||remote.versionName,APP_LOCAL_VERSION.webVersion||APP_LOCAL_VERSION.versionName)>0;
          const hasNewApk=Number(remote.versionCode||0)>Number(APP_LOCAL_VERSION.versionCode||0);
          if(hasNewWeb||hasNewApk){
            updateInfo=remote;render();
            if(manual)toast(`Nueva versión v${remote.webVersion||remote.versionName} disponible`);
            return;
          }
          if(manual)toast('Ya tienes la versión más reciente');
          return;
        }catch{}
      }
      if(manual)toast('No se pudo verificar actualizaciones ahora',true);
    }
    async function applyUpdate(){
      if(!updateInfo)return checkForUpdates(true);
      const needsApk=Number(updateInfo.versionCode||0)>Number(APP_LOCAL_VERSION.versionCode||0);
      if(window.NotasApp){
        if(needsApk&&updateInfo.apkUrl&&window.NotasApp.installApkUpdate){
          window.NotasApp.installApkUpdate(updateInfo.apkUrl);return;
        }
        if(updateInfo.webBaseUrl&&window.NotasApp.applyWebUpdate){
          toast('Descargando actualización…');
          window.NotasApp.applyWebUpdate(updateInfo.webBaseUrl,Number(updateInfo.versionCode||APP_LOCAL_VERSION.versionCode),String(updateInfo.webVersion||updateInfo.versionName));
          return;
        }
      }
      try{await swRegistration?.update?.()}catch{}
      location.reload();
    }
    window.notasBack=()=>{if(closePhotoZoom())return true;if(modal){if(modal.type==='sale'&&saleStep==='review'){captureSaleMeta();saleStep='pick';render()}else closeModal();return true}if(page!=='inicio'){page='inicio';render();return true}return false};
    function bindPageActions(){ }
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){if(closePhotoZoom())return;escModal(e)}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
        const s=document.getElementById('list-search');
        if(s){e.preventDefault();s.focus();s.select()}
      }
    });
    document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;if(a==='close')closeModal();else if(a==='settings'||a==='export'||a==='copy-catalog')action(a);else if(a==='import'){document.getElementById('import-backup-file')?.click()}else if(a==='check-update'){checkForUpdates(true)}else if(a==='apply-update'){applyUpdate()}else if(a==='print'){if(window.NotasApp?.printPage)window.NotasApp.printPage();else window.print()}else if(a==='save-settings'){state.settings.business=document.getElementById('business-name').value.trim()||'Mi negocio';state.settings.address=document.getElementById('business-address').value.trim();state.settings.phone=document.getElementById('business-phone').value.trim();state.settings.email=document.getElementById('business-email').value.trim();state.settings.registration=document.getElementById('business-registration').value.trim();state.settings.seller=document.getElementById('business-seller').value.trim();state.settings.currency=document.getElementById('currency').value;save();modal=null;render();toast('Configuración guardada')}else if(a==='reset'){if(confirm('¿Restablecer Notas y reemplazar tus registros por datos de demostración?')){if(window.NotasApp?.removeProductImage)state.products.forEach(p=>window.NotasApp.removeProductImage(p.id));state=seed();state.settings={business:'Mi negocio',currency:'MXN',address:'',phone:'',email:'',registration:'',seller:'',...(state.settings||{})};state.sales.forEach((sale,index)=>sale.folio=String(state.sales.length-index).padStart(4,'0'));state.saleSequence=Math.max(1,...state.sales.map(sale=>(Number(sale.folio)||0)+1));save();modal=null;render();toast('Datos de demostración restaurados')}}else if(a.startsWith('share-receipt:'))shareReceipt(a.split(':')[1]);else if(a.startsWith('collect:')||a.startsWith('receipt:')||a.startsWith('adjust:'))action(a)});
    window.addEventListener('resize',()=>{if(page==='reportes')drawCharts()});
    if('serviceWorker'in navigator && location.protocol!=='file:')window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').then(reg=>{swRegistration=reg;reg.addEventListener('updatefound',()=>{const nw=reg.installing;nw?.addEventListener('statechange',()=>{if(nw.state==='installed'&&navigator.serviceWorker.controller){updateInfo=updateInfo||{webVersion:APP_LOCAL_VERSION.webVersion,notes:'Nueva versión web lista.'};render()}})})}).catch(()=>{});checkForUpdates(false)});
    else window.addEventListener('load',()=>checkForUpdates(false));
    restoreModalDraft();
    render();
    receiveCameraResult();
  })();
