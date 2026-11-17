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
      expenses:[{id:'g1',date:shift(-1),name:'Compra de leche',category:'Insumos',amount:186,payment:'Efectivo',notes:''},{id:'g2',date:shift(-3),name:'Internet del local',category:'Servicios',amount:499,payment:'Transferencia',notes:''},{id:'g3',date:shift(-5),name:'Servilletas y vasos',category:'Empaque',amount:235,payment:'Tarjeta',notes:''}],
      cashClosures:[]});
    function loadState(){try{const saved=window.NotasApp?.loadState?.();if(saved)return JSON.parse(saved)}catch{}try{return JSON.parse(localStorage.getItem(STORE_KEY))}catch{return null}}
    let state=loadState()||seed();
    state.settings={business:'Mi negocio',currency:'MXN',address:'',phone:'',email:'',registration:'',seller:'',allowNegativeStock:true,cashFloat:0,...(state.settings||{})};
    if(!Array.isArray(state.sales))state.sales=[];
    if(!Array.isArray(state.cashClosures))state.cashClosures=[];
    state.sales.forEach((sale,index)=>{if(!sale.folio)sale.folio=String(state.sales.length-index).padStart(4,'0')});
    state.saleSequence=Math.max(Number(state.saleSequence)||1,...state.sales.map(sale=>(Number(sale.folio)||0)+1));
    let page='inicio',search='',saleFilter='all',saleOwnerFilter='all',stockFilter='all',invCategory='Todas',invPhotoSize=(()=>{try{return localStorage.getItem('notas-inv-photo-size')||'md'}catch{return 'md'}})(),period='30',modal=null,toastTimer,saleDraft=[],saleStep='pick',saleSearch='',saleCategory='Todas',saleMeta={},productPhotoDraft=null,productFormDraft=null,returnToSale=null,photoBusy=false,cameraStream=null,updateInfo=null,swRegistration=null,calcState={expr:'0',result:'0'},calcReturn=null,cashCloseDraft={mode:'since-last',openingFloat:'',countedCash:'',notes:''},collectDraft={cashReceived:''};
    const THEME_KEY='notas-theme';
    let theme=(()=>{try{return localStorage.getItem(THEME_KEY)==='dark'?'dark':'light'}catch{return 'light'}})();
    const applyTheme=(next)=>{theme=next==='dark'?'dark':'light';document.documentElement.dataset.theme=theme;const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',theme==='dark'?'#0f1411':'#f5f7f3');try{localStorage.setItem(THEME_KEY,theme)}catch{}};
    applyTheme(theme);
    const DRAFT_KEY='notas-product-draft-v1';
    const CLOUD_CACHE_PREFIX='notas-cloud-cache-v1-';
    const PUBLIC_CATALOG_BASE='https://navi1896.github.io/notas-app/';
    const FIREBASE_CONFIG={
      projectId:'notas-96ef7',
      appId:'1:1002701021775:web:cfce3554fe45f634e4403a',
      storageBucket:'notas-96ef7.firebasestorage.app',
      apiKey:'AIzaSyCy7j66RTZPKu1r0JfWqZukLCb7FW1-pyw',
      authDomain:'notas-96ef7.firebaseapp.com',
      messagingSenderId:'1002701021775',
      measurementId:'G-787ZQ138B2'
    };
    const APP_LOCAL_VERSION=(()=>{try{const info=window.NotasApp?.getAppVersion?.();if(info)return JSON.parse(info)}catch{}return {versionCode:9,versionName:'1.9.1',webVersion:'1.9.1',platform:'web'}})();
    const initialCatalogParam=(()=>{try{const u=new URL(location.href);const q=u.searchParams.get('catalogo')||u.searchParams.get('catalog')||'';if(q)return q.trim();const h=location.hash||'';const m=h.match(/catalogo=([a-zA-Z0-9_-]+)/);return m?m[1]:''}catch{return ''}})();
    let cloud={
      sdkLoaded:false,sdkError:'',app:null,auth:null,db:null,fb:null,
      authReady:false,user:null,profile:null,
      storeId:null,role:null,member:null,members:[],invites:[],
      costsByProduct:{},unsubs:[],syncing:false,busy:false,joiningInvite:false,previewSeller:false,previewOwnSaleIds:new Set(),
      authMode:'login',onboardMode:'create',onboardingForced:false,
      publicStoreId:initialCatalogParam,publicStore:null,publicItems:[],publicCart:{},publicLoading:Boolean(initialCatalogParam),publicError:'',publicCategory:'Todas',publicViaLink:Boolean(initialCatalogParam)
    };
    const isCloudActive=()=>Boolean(cloud.user&&cloud.storeId&&cloud.role);
    const isRealOwner=()=>!isCloudActive()||cloud.role==='owner';
    const isOwnerRole=()=>isRealOwner()&&!cloud.previewSeller;
    const isSellerRole=()=>(isCloudActive()&&cloud.role==='seller')||(isRealOwner()&&cloud.previewSeller);
    const canManageStore=()=>isOwnerRole();
    const canAdjustStock=()=>!isCloudActive()||cloud.role==='owner'||cloud.role==='seller';
    const allowsNegativeStock=()=>state.settings?.allowNegativeStock!==false;
    const saleAuthorMember=(s)=>s?.sellerUid?cloud.members.find(m=>m.uid===s.sellerUid):null;
    const saleAuthorRole=(s)=>{
      if(cloud.previewOwnSaleIds?.has?.(s?.id))return 'seller';
      const m=saleAuthorMember(s);
      if(m?.role)return m.role;
      return (s?.sellerUid&&cloud.user?.uid&&s.sellerUid===cloud.user.uid)?(cloud.role||'owner'):'owner';
    };
    const isOwnSale=(s)=>{
      if(!s)return false;
      if(cloud.previewSeller)return cloud.previewOwnSaleIds?.has?.(s.id)||false;
      if(!isCloudActive())return true;
      return Boolean(s.sellerUid&&cloud.user?.uid&&s.sellerUid===cloud.user.uid);
    };
    const canModifySale=(s)=>Boolean(s)&&(isOwnerRole()||(isSellerRole()&&isOwnSale(s)));
    const cloudRoleLabel=()=>cloud.previewSeller?'Vendedor (Vista previa)':!cloud.user?'Modo local':!cloud.storeId?'Sin negocio':cloud.role==='owner'?'Dueño':'Vendedor';
    const catalogUrlFor=(sid)=>`${PUBLIC_CATALOG_BASE}?catalogo=${encodeURIComponent(sid||cloud.storeId||'')}`;
    function resolvePortablePhoto(p){
      let photo=p?.photo||'';
      if((photo.startsWith('content://')||photo.startsWith('file://'))&&window.NotasApp?.loadProductImage){
        try{photo=window.NotasApp.loadProductImage(p.id)||''}catch{photo=''}
      }
      if(photo.length>480000)return '';
      return photo;
    }
    function applyLocalState(parsed){
      const next=parsed||seed();
      state={
        settings:{business:'Mi negocio',currency:'MXN',address:'',phone:'',email:'',registration:'',seller:'',allowNegativeStock:true,cashFloat:0,...(next.settings||{})},
        products:Array.isArray(next.products)?next.products:[],
        customers:Array.isArray(next.customers)?next.customers:[],
        suppliers:Array.isArray(next.suppliers)?next.suppliers:[],
        sales:Array.isArray(next.sales)?next.sales:[],
        expenses:Array.isArray(next.expenses)?next.expenses:[],
        cashClosures:Array.isArray(next.cashClosures)?next.cashClosures:[],
        saleSequence:Number(next.saleSequence)||1
      };
      state.sales.forEach((sale,index)=>{if(!sale.folio)sale.folio=String(state.sales.length-index).padStart(4,'0')});
      state.saleSequence=Math.max(1,Number(state.saleSequence)||1,...state.sales.map(sale=>(Number(sale.folio)||0)+1));
    }
    function cacheCloudState(){
      if(!cloud.storeId)return;
      try{localStorage.setItem(CLOUD_CACHE_PREFIX+cloud.storeId,JSON.stringify({role:cloud.role,state}))}catch{}
    }
    function loadCloudCache(storeId){
      try{const raw=localStorage.getItem(CLOUD_CACHE_PREFIX+storeId);return raw?JSON.parse(raw):null}catch{return null}
    }
    function clearCloudListeners(){
      cloud.unsubs.forEach(fn=>{try{fn()}catch{}});
      cloud.unsubs=[];
    }
    function translateAuthError(err){
      const code=err?.code||'';
      if(code==='auth/invalid-credential'||code==='auth/wrong-password'||code==='auth/user-not-found')return 'Correo o contraseña incorrectos.';
      if(code==='auth/email-already-in-use')return 'Ya existe una cuenta con ese correo. Inicia sesión.';
      if(code==='auth/weak-password')return 'La contraseña debe tener al menos 6 caracteres.';
      if(code==='auth/invalid-email')return 'Escribe un correo electrónico válido.';
      if(code==='auth/network-request-failed')return 'Sin conexión a internet. Revisa tu red e intenta de nuevo.';
      if(code==='auth/too-many-requests')return 'Demasiados intentos seguidos. Espera un momento.';
      if(code==='permission-denied')return 'No tienes permisos para completar esta acción en la nube.';
      if(code==='unavailable')return 'Sin conexión con el servidor. Intenta de nuevo.';
      return err?.message||'No se pudo completar la operación.';
    }
    async function ensureFirebase(){
      if(cloud.sdkLoaded&&cloud.db&&cloud.auth)return true;
      try{
        const[appMod,authMod,fsMod]=await Promise.all([
          import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js'),
          import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js'),
          import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js')
        ]);
        const app=appMod.getApps().length?appMod.getApp():appMod.initializeApp(FIREBASE_CONFIG);
        let auth;
        try{auth=authMod.initializeAuth(app,{persistence:[authMod.indexedDBLocalPersistence,authMod.browserLocalPersistence]})}
        catch{auth=authMod.getAuth(app)}
        let db;
        try{db=fsMod.initializeFirestore(app,{localCache:fsMod.persistentLocalCache({tabManager:fsMod.persistentMultipleTabManager()})})}
        catch{db=fsMod.getFirestore(app)}
        cloud.fb={...appMod,...authMod,...fsMod};
        cloud.app=app;cloud.auth=auth;cloud.db=db;cloud.sdkLoaded=true;cloud.sdkError='';
        return true;
      }catch(err){
        cloud.sdkError=err?.message||'Sin conexión con Firebase';
        return false;
      }
    }
    function scheduleCloudRender(){
      if(!modal){render();return}
      if(modal.type==='sale'&&saleStep==='pick'){
        const res=document.getElementById('sale-product-results');
        if(res)res.innerHTML=renderSaleProducts();
        updateTotal();
      }
    }
    function buildProductDoc(record){
      const pid=String(record.id||uid()).trim().slice(0,128)||uid();
      const name=String(record.name||'').trim().slice(0,160)||'Producto';
      const stVal=Number(record.stock)||0;
      return {id:pid,name,category:String(record.category||'Productos').trim().slice(0,80),price:Math.max(0,Number(record.price)||0),stock:allowsNegativeStock()?stVal:Math.max(0,stVal),min:Math.max(0,Number(record.min)||0),emoji:String(record.emoji||'📦').slice(0,16)||'📦',photo:resolvePortablePhoto({...record,id:pid}),updatedAt:Date.now()};
    }
    function buildCatalogItemDoc(record){
      const pid=String(record.id||uid()).trim().slice(0,128)||uid();
      const name=String(record.name||'').trim().slice(0,160)||'Producto';
      return {id:pid,name,category:String(record.category||'Productos').trim().slice(0,80),price:Math.max(0,Number(record.price)||0),available:(Number(record.stock)||0)>0,emoji:String(record.emoji||'📦').slice(0,16)||'📦',photo:resolvePortablePhoto({...record,id:pid}),updatedAt:Date.now()};
    }
    function buildCatalogStoreDoc(storeId,settings){
      return {storeId:String(storeId),business:String(settings.business||'').trim().slice(0,120)||'Mi negocio',phone:String(settings.phone||'').slice(0,40),currency:String(settings.currency||'MXN').trim().slice(0,10)||'MXN',updatedAt:Date.now()};
    }
    async function subscribePublicCatalog(storeId){
      clearCloudListeners();
      cloud.publicStoreId=storeId;cloud.publicLoading=true;cloud.publicError='';
      render();
      if(!(await ensureFirebase())){
        cloud.publicLoading=false;cloud.publicError='No se pudo conectar con el catálogo. Verifica tu internet.';render();return;
      }
      const{doc,collection,onSnapshot}=cloud.fb;
      const u1=onSnapshot(doc(cloud.db,'catalog',storeId),snap=>{
        cloud.publicStore=snap.exists()?snap.data():null;
        cloud.publicLoading=false;
        if(!snap.exists())cloud.publicError='No encontramos este catálogo. Verifica el enlace o código con el negocio.';
        else cloud.publicError='';
        render();
      },()=>{cloud.publicLoading=false;cloud.publicError='No se pudo cargar el catálogo.';render()});
      const u2=onSnapshot(collection(cloud.db,'catalog',storeId,'items'),snap=>{
        cloud.publicItems=snap.docs.map(d=>d.data()).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es-MX'));
        render();
      },()=>{});
      cloud.unsubs.push(u1,u2);
    }
    async function attachStoreCloud(storeId,roleOverride=null){
      clearCloudListeners();
      cloud.storeId=storeId;
      if(roleOverride)cloud.role=roleOverride;
      const cached=loadCloudCache(storeId);
      if(cached?.state){applyLocalState(cached.state);if(!cloud.role&&cached.role)cloud.role=cached.role}
      else{state={settings:{business:'Cargando negocio…',currency:'MXN',address:'',phone:'',email:'',registration:'',seller:'',allowNegativeStock:true,cashFloat:0},products:[],customers:[],suppliers:[],sales:[],expenses:[],cashClosures:[],saleSequence:1}}
      render();
      const{doc,collection,query,where,onSnapshot}=cloud.fb;
      const db=cloud.db,uid=cloud.user.uid;
      let ownerStreamsAttached=false;
      const attachOwnerStreams=()=>{
        if(ownerStreamsAttached||cloud.role!=='owner')return;
        ownerStreamsAttached=true;
        const uCost=onSnapshot(collection(db,'stores',storeId,'productCosts'),snap=>{
          const map={};snap.docs.forEach(d=>{map[d.id]=Number(d.data().cost)||0});
          cloud.costsByProduct=map;
          state.products=state.products.map(p=>({...p,cost:map[p.id]??p.cost??0}));
          cacheCloudState();scheduleCloudRender();
        },()=>{});
        const uExp=onSnapshot(collection(db,'stores',storeId,'expenses'),snap=>{
          state.expenses=snap.docs.map(d=>d.data()).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
          cacheCloudState();scheduleCloudRender();
        },()=>{});
        const uSup=onSnapshot(collection(db,'stores',storeId,'suppliers'),snap=>{
          state.suppliers=snap.docs.map(d=>d.data()).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es-MX'));
          cacheCloudState();scheduleCloudRender();
        },()=>{});
        const uInv=onSnapshot(query(collection(db,'invites'),where('storeId','==',storeId)),snap=>{
          cloud.invites=snap.docs.map(d=>d.data()).sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0));
          scheduleCloudRender();
        },()=>{});
        cloud.unsubs.push(uCost,uExp,uSup,uInv);
      };
      const uMemberSelf=onSnapshot(doc(db,'stores',storeId,'members',uid),snap=>{
        if(!snap.exists()||snap.data().active!==true){
          clearCloudListeners();
          cloud.storeId=null;cloud.role=null;cloud.member=null;cloud.members=[];cloud.invites=[];cloud.costsByProduct={};
          applyLocalState(loadState()||seed());
          toast('Tu acceso a este negocio cambió o fue revocado',true);
          modal={type:'onboarding'};render();return;
        }
        const m=snap.data();
        const prevRole=cloud.role;
        cloud.member=m;cloud.role=m.role;
        if(m.role==='owner')attachOwnerStreams();
        else if(prevRole==='owner'){attachStoreCloud(storeId,'seller');return}
        if(m.role==='seller'&&['gastos','proveedores','reportes','equipo'].includes(page))page='inicio';
        cacheCloudState();scheduleCloudRender();
      },()=>{});
      const uStore=onSnapshot(doc(db,'stores',storeId),snap=>{
        if(!snap.exists())return;
        const d=snap.data();
        state.settings={business:d.business||'Mi negocio',currency:d.currency||'MXN',address:d.address||'',phone:d.phone||'',email:d.email||'',registration:d.registration||'',seller:d.seller||'',allowNegativeStock:d.allowNegativeStock!==false,cashFloat:Number(d.cashFloat)||0};
        state.saleSequence=Math.max(1,Number(d.saleSequence)||1,...state.sales.map(s=>(Number(s.folio)||0)+1));
        cacheCloudState();scheduleCloudRender();
      },()=>{});
      const uProd=onSnapshot(collection(db,'stores',storeId,'products'),snap=>{
        state.products=snap.docs.map(d=>{const x=d.data();return {...x,cost:cloud.role==='owner'?(cloud.costsByProduct[x.id]??0):0}}).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es-MX'));
        cacheCloudState();scheduleCloudRender();
      },()=>{});
      const uCust=onSnapshot(collection(db,'stores',storeId,'customers'),snap=>{
        state.customers=snap.docs.map(d=>d.data()).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es-MX'));
        cacheCloudState();scheduleCloudRender();
      },()=>{});
      const uSales=onSnapshot(collection(db,'stores',storeId,'sales'),snap=>{
        state.sales=snap.docs.map(d=>d.data()).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(Number(b.createdAt)||0)-(Number(a.createdAt)||0));
        state.saleSequence=Math.max(Number(state.saleSequence)||1,...state.sales.map(s=>(Number(s.folio)||0)+1));
        cacheCloudState();scheduleCloudRender();
      },()=>{});
      const uMembers=onSnapshot(collection(db,'stores',storeId,'members'),snap=>{
        cloud.members=snap.docs.map(d=>d.data()).sort((a,b)=>(a.role==='owner'?-1:1)-(b.role==='owner'?-1:1)||String(a.name||a.email||'').localeCompare(String(b.name||b.email||''),'es-MX'));
        scheduleCloudRender();
      },()=>{});
      const uClosures=onSnapshot(collection(db,'stores',storeId,'cashClosures'),snap=>{
        state.cashClosures=snap.docs.map(d=>d.data()).sort((a,b)=>(Number(b.closedAt)||0)-(Number(a.closedAt)||0));
        cacheCloudState();scheduleCloudRender();
      },()=>{});
      cloud.unsubs.push(uMemberSelf,uStore,uProd,uCust,uSales,uMembers,uClosures);
      if(cloud.role==='owner')attachOwnerStreams();
    }
    async function loadUserProfileAndStore(user){
      if(cloud.joiningInvite||cloud.storeId)return;
      const{doc,getDoc,setDoc}=cloud.fb;
      const db=cloud.db,uRef=doc(db,'users',user.uid);
      let prof=null;
      try{const snap=await getDoc(uRef);if(snap.exists())prof=snap.data()}catch{}
      if(cloud.joiningInvite||cloud.storeId)return;
      if(!prof){
        prof={uid:user.uid,email:user.email||'',displayName:user.displayName||'',activeStoreId:null,storeIds:[],updatedAt:Date.now()};
        try{await setDoc(uRef,prof)}catch{}
      }
      if(cloud.joiningInvite||cloud.storeId)return;
      cloud.profile=prof;
      const candidateIds=[prof.activeStoreId,...(Array.isArray(prof.storeIds)?prof.storeIds:[])].filter(Boolean);
      for(const sid of [...new Set(candidateIds)]){
        try{
          const mSnap=await getDoc(doc(db,'stores',sid,'members',user.uid));
          if(cloud.joiningInvite||cloud.storeId)return;
          if(mSnap.exists()&&mSnap.data().active===true){
            if(prof.activeStoreId!==sid){
              prof.activeStoreId=sid;prof.updatedAt=Date.now();
              await setDoc(uRef,prof,{merge:true}).catch(()=>{});
            }
            cloud.onboardingForced=false;
            await attachStoreCloud(sid,mSnap.data().role);
            return;
          }
        }catch{}
      }
      if(cloud.joiningInvite||cloud.storeId)return;
      cloud.storeId=null;cloud.role=null;cloud.member=null;cloud.members=[];cloud.invites=[];
      cloud.onboardingForced=true;
      modal={type:'onboarding'};render();
    }
    async function initCloud(){
      if(cloud.publicStoreId){await subscribePublicCatalog(cloud.publicStoreId);return}
      if(!(await ensureFirebase())){cloud.authReady=true;render();return}
      cloud.fb.onAuthStateChanged(cloud.auth,async user=>{
        cloud.authReady=true;
        if(!user){
          clearCloudListeners();
          const wasCloud=Boolean(cloud.user);
          cloud.user=null;cloud.profile=null;cloud.storeId=null;cloud.role=null;cloud.member=null;cloud.members=[];cloud.invites=[];cloud.costsByProduct={};cloud.onboardingForced=false;cloud.previewSeller=false;
          if(wasCloud){applyLocalState(loadState()||seed());page='inicio'}
          render();return;
        }
        cloud.user={uid:user.uid,email:user.email||'',displayName:user.displayName||''};
        await loadUserProfileAndStore(user);
      });
    }
    async function createCloudStore({business,ownerName,migrateLocal}){
      const{doc,writeBatch}=cloud.fb;
      const db=cloud.db,uid=cloud.user.uid,now=Date.now();
      const storeId='n'+uid.slice(0,6).toLowerCase()+Math.random().toString(36).slice(2,6);
      const cleanName=(business||'Mi negocio').trim().slice(0,120)||'Mi negocio';
      const myName=(ownerName||cloud.user.displayName||cloud.user.email||'Dueño').trim().slice(0,120);
      const local=loadState()||state;
      const seq=migrateLocal?Math.max(1,Math.floor(Number(local.saleSequence)||1),...(local.sales||[]).map(s=>Math.floor(Number(s.folio)||0)+1)):1;
      const storeSettings=migrateLocal?{...local.settings,business:cleanName}:{business:cleanName,currency:'MXN',address:'',phone:'',email:'',registration:'',seller:myName,allowNegativeStock:true};
      const existingIds=Array.isArray(cloud.profile?.storeIds)?cloud.profile.storeIds.filter(x=>typeof x==='string'&&x&&x!==storeId):[];
      const userDoc={uid,email:cloud.user.email||'',displayName:myName,activeStoreId:storeId,storeIds:[storeId,...existingIds].slice(0,20),updatedAt:now};
      const storeDoc={id:storeId,business:cleanName,currency:String(storeSettings.currency||'MXN').trim().slice(0,10)||'MXN',address:String(storeSettings.address||'').slice(0,250),phone:String(storeSettings.phone||'').slice(0,40),email:String(storeSettings.email||'').slice(0,254),registration:String(storeSettings.registration||'').slice(0,80),seller:String(storeSettings.seller||myName).slice(0,120),allowNegativeStock:storeSettings.allowNegativeStock!==false,ownerUid:uid,saleSequence:seq,createdAt:now,updatedAt:now};
      const memberDoc={uid,email:cloud.user.email||'',name:myName,role:'owner',active:true,joinedAt:now,updatedAt:now};
      const b1=writeBatch(db);
      b1.set(doc(db,'stores',storeId),storeDoc);
      b1.set(doc(db,'stores',storeId,'members',uid),memberDoc);
      b1.set(doc(db,'users',uid),userDoc,{merge:true});
      await b1.commit();
      const ops=[[doc(db,'catalog',storeId),buildCatalogStoreDoc(storeId,storeDoc)]];
      if(migrateLocal){
        for(const p of (local.products||[])){
          const cleanProd={...p,id:String(p.id||uid()).trim().slice(0,128)||uid()};
          const pd={...buildProductDoc(cleanProd),createdAt:now};
          ops.push([doc(db,'stores',storeId,'products',pd.id),pd]);
          ops.push([doc(db,'stores',storeId,'productCosts',pd.id),{id:pd.id,productId:pd.id,cost:Math.max(0,Number(cleanProd.cost)||0),createdAt:now,updatedAt:now}]);
          ops.push([doc(db,'catalog',storeId,'items',pd.id),buildCatalogItemDoc(cleanProd)]);
        }
        for(const e of (local.expenses||[])){
          const id=String(e.id||uid()).trim().slice(0,128)||uid();
          ops.push([doc(db,'stores',storeId,'expenses',id),{id,date:String(e.date||today()).trim().slice(0,32)||today(),name:String(e.name||'').trim().slice(0,160)||'Gasto',category:String(e.category||'Otros').slice(0,80),amount:Math.max(0,Number(e.amount)||0),payment:String(e.payment||'Efectivo').slice(0,60),notes:String(e.notes||'').slice(0,1000),createdAt:now,updatedAt:now}]);
        }
        for(const c of (local.customers||[])){
          const id=String(c.id||uid()).trim().slice(0,128)||uid();
          ops.push([doc(db,'stores',storeId,'customers',id),{id,name:String(c.name||'').trim().slice(0,160)||'Cliente',phone:String(c.phone||'').slice(0,40),email:String(c.email||'').slice(0,254),notes:String(c.notes||'').slice(0,1000),createdAt:now,updatedAt:now}]);
        }
        for(const s of (local.suppliers||[])){
          const id=String(s.id||uid()).trim().slice(0,128)||uid();
          ops.push([doc(db,'stores',storeId,'suppliers',id),{id,name:String(s.name||'').trim().slice(0,160)||'Proveedor',phone:String(s.phone||'').slice(0,40),email:String(s.email||'').slice(0,254),notes:String(s.notes||'').slice(0,1000),createdAt:now,updatedAt:now}]);
        }
        for(const v of (local.sales||[])){
          const id=String(v.id||uid()).trim().slice(0,128)||uid(),tot=Math.max(0,Number(v.total)||0),pd=Math.min(tot,Math.max(0,Number(v.paid)||0));
          ops.push([doc(db,'stores',storeId,'sales',id),{id,folio:String(v.folio||'0001').slice(0,32),date:String(v.date||today()).trim().slice(0,32)||today(),time:String(v.time||'').slice(0,32),seller:String(v.seller||myName).slice(0,120),sellerUid:uid,items:Array.isArray(v.items)?v.items.slice(0,200):[],product:String(v.product||'').slice(0,200),productId:String(v.productId||'').slice(0,128),qty:Math.max(0,Number(v.qty)||0),unitPrice:Math.max(0,Number(v.unitPrice)||0),total:tot,customer:String(v.customer||'').slice(0,160),payment:String(v.payment||'').trim().slice(0,60)||'Efectivo',paid:pd,createdAt:now,updatedAt:now}]);
        }
      }
      for(let i=0;i<ops.length;i+=400){
        const bx=writeBatch(db);
        ops.slice(i,i+400).forEach(([ref,data])=>bx.set(ref,data));
        await bx.commit();
      }
      cloud.profile=userDoc;cloud.onboardingForced=false;
      await attachStoreCloud(storeId,'owner');
    }
    async function joinCloudWithInvite({code,memberName}){
      const cleanCode=String(code||'').trim().toUpperCase();
      if(cleanCode.length<4)throw new Error('Escribe un código de invitación válido.');
      const{doc,getDoc,writeBatch}=cloud.fb;
      const db=cloud.db,uid=cloud.user.uid,now=Date.now();
      const invRef=doc(db,'invites',cleanCode);
      const invSnap=await getDoc(invRef);
      if(!invSnap.exists())throw new Error('Ese código de invitación no existe.');
      const inv=invSnap.data();
      if(!inv.active||inv.usedBy)throw new Error('Ese código ya fue usado o fue revocado.');
      const myName=(memberName||cloud.user.displayName||cloud.user.email||'Miembro').trim().slice(0,120);
      const storeId=inv.storeId;
      const existingIds=Array.isArray(cloud.profile?.storeIds)?cloud.profile.storeIds.filter(x=>x!==storeId):[];
      const userDoc={uid,email:cloud.user.email||'',displayName:myName,activeStoreId:storeId,storeIds:[storeId,...existingIds].slice(0,20),updatedAt:now};
      const batch=writeBatch(db);
      batch.update(invRef,{active:false,usedBy:uid,usedAt:now});
      batch.set(doc(db,'stores',storeId,'members',uid),{uid,email:cloud.user.email||'',name:myName,role:inv.role,active:true,joinedAt:now,inviteCode:cleanCode,updatedAt:now});
      batch.set(doc(db,'users',uid),userDoc,{merge:true});
      await batch.commit();
      cloud.profile=userDoc;cloud.onboardingForced=false;
      await cloud.auth.currentUser?.getIdToken?.(true).catch(()=>{});
      await attachStoreCloud(storeId,inv.role);
    }
    async function createInviteCode(role){
      if(!isOwnerRole()||!cloud.storeId)return;
      const{doc,setDoc}=cloud.fb;
      const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code='NT';
      for(let i=0;i<6;i++)code+=chars[Math.floor(Math.random()*chars.length)];
      const now=Date.now();
      await setDoc(doc(cloud.db,'invites',code),{code,storeId:cloud.storeId,storeName:String(state.settings.business||'Mi negocio').slice(0,120),role:role==='owner'?'owner':'seller',active:true,usedBy:null,usedAt:null,createdBy:cloud.user.uid,createdAt:now});
      toast(`Código ${code} creado`);
    }
    async function revokeInviteCode(code){
      if(!isOwnerRole()||!cloud.storeId)return;
      const{doc,deleteDoc}=cloud.fb;
      await deleteDoc(doc(cloud.db,'invites',code));
      toast('Invitación eliminada');
    }
    async function setMemberRole(memberUid,newRole){
      if(!isOwnerRole()||!cloud.storeId)return;
      const m=cloud.members.find(x=>x.uid===memberUid);if(!m)return;
      if(memberUid===cloud.user.uid&&newRole!=='owner'){
        const otherOwners=cloud.members.filter(x=>x.uid!==memberUid&&x.role==='owner'&&x.active);
        if(!otherOwners.length)return toast('Debe quedar al menos un dueño en la tienda',true);
      }
      const{doc,updateDoc}=cloud.fb;
      await updateDoc(doc(cloud.db,'stores',cloud.storeId,'members',memberUid),{role:newRole,updatedAt:Date.now()});
      toast(`Rol actualizado a ${newRole==='owner'?'Dueño':'Vendedor'}`);
    }
    async function removeMember(memberUid){
      if(!isOwnerRole()||!cloud.storeId||memberUid===cloud.user.uid)return;
      if(!confirm('¿Quitar acceso a esta persona del negocio?'))return;
      const{doc,deleteDoc}=cloud.fb;
      await deleteDoc(doc(cloud.db,'stores',cloud.storeId,'members',memberUid));
      toast('Miembro eliminado del equipo');
    }
    async function cloudSaveProduct(record,isNew){
      const{doc,writeBatch}=cloud.fb;
      const db=cloud.db,sid=cloud.storeId,now=Date.now();
      const b=writeBatch(db);
      const prodDoc={...buildProductDoc(record),...(isNew?{createdAt:now}:{})};
      const costDoc={id:String(record.id),productId:String(record.id),cost:Math.max(0,Number(record.cost)||0),...(isNew?{createdAt:now}:{}),updatedAt:now};
      b.set(doc(db,'stores',sid,'products',prodDoc.id),prodDoc,{merge:true});
      b.set(doc(db,'stores',sid,'productCosts',prodDoc.id),costDoc,{merge:true});
      b.set(doc(db,'catalog',sid,'items',prodDoc.id),buildCatalogItemDoc(record),{merge:true});
      await b.commit();
    }
    async function cloudAdjustStock(product,nextStock){
      const{doc,updateDoc}=cloud.fb;
      const db=cloud.db,sid=cloud.storeId,now=Date.now();
      await updateDoc(doc(db,'stores',sid,'products',product.id),{stock:nextStock,updatedAt:now});
      try{await updateDoc(doc(db,'catalog',sid,'items',product.id),{available:nextStock>0,updatedAt:now})}catch{}
    }
    async function cloudSaveSale(sale,stockChanges,isEdit,nextSeq){
      const{doc,writeBatch,updateDoc}=cloud.fb;
      const db=cloud.db,sid=cloud.storeId,now=Date.now();
      const tot=Math.max(0,Number(sale.total)||0),pd=Math.min(tot,Math.max(0,Number(sale.paid)||0));
      const sub=Math.max(0,Number(sale.subtotal??tot)||0),disc=Math.max(0,Number(sale.discount)||0);
      const cr=Math.max(0,Number(sale.cashReceived)||0),cd=Math.max(0,Number(sale.changeDue)||0);
      const saleDoc={id:String(sale.id),folio:String(sale.folio||'0001').slice(0,32),date:String(sale.date||today()),time:String(sale.time||'').slice(0,32),seller:String(sale.seller||'').slice(0,120),sellerUid:String(sale.sellerUid||cloud.user.uid),items:Array.isArray(sale.items)?sale.items.slice(0,200):[],product:String(sale.product||'').slice(0,200),productId:String(sale.productId||'').slice(0,128),qty:Math.max(0,Number(sale.qty)||0),unitPrice:Math.max(0,Number(sale.unitPrice)||0),subtotal:sub,discount:disc,total:tot,customer:String(sale.customer||'').slice(0,160),payment:String(sale.payment||'Efectivo').slice(0,60),paid:pd,cashReceived:cr,changeDue:cd,notes:String(sale.notes||'').slice(0,500),payments:Array.isArray(sale.payments)?sale.payments.slice(0,100):[],...(isEdit?{}:{createdAt:sale.createdAt||now}),updatedAt:now};
      const b=writeBatch(db);
      b.set(doc(db,'stores',sid,'sales',saleDoc.id),saleDoc,{merge:true});
      stockChanges.forEach(({id,stock})=>{
        const stVal=Number(stock)||0;
        b.update(doc(db,'stores',sid,'products',id),{stock:allowsNegativeStock()?stVal:Math.max(0,stVal),updatedAt:now});
      });
      if(!isEdit)b.update(doc(db,'stores',sid),{saleSequence:Math.max(1,Math.floor(Number(nextSeq)||1)),updatedAt:now});
      await b.commit();
      for(const sc of stockChanges){
        try{await updateDoc(doc(db,'catalog',sid,'items',sc.id),{available:sc.stock>0,updatedAt:now})}catch{}
      }
    }
    async function cloudCollectSale(s){
      const{doc,updateDoc}=cloud.fb;
      const paid=Math.min(Number(s.total)||0,Math.max(0,Number(s.paid)||0));
      await updateDoc(doc(cloud.db,'stores',cloud.storeId,'sales',s.id),{paid,payment:String(s.payment||'Efectivo').slice(0,60),payments:Array.isArray(s.payments)?s.payments.slice(0,100):[],updatedAt:Date.now()});
    }
    async function cloudSaveCashClosure(closure){
      const{doc,setDoc}=cloud.fb;
      const now=Date.now();
      const record={
        id:String(closure.id),
        date:String(closure.date||today()).slice(0,32),
        openedAt:Number(closure.openedAt)||0,
        closedAt:Number(closure.closedAt)||now,
        openingFloat:Math.max(0,Number(closure.openingFloat)||0),
        cashSales:Math.max(0,Number(closure.cashSales)||0),
        cardSales:Math.max(0,Number(closure.cardSales)||0),
        transferSales:Math.max(0,Number(closure.transferSales)||0),
        expensesTotal:Math.max(0,Number(closure.expensesTotal)||0),
        expectedCash:Number(closure.expectedCash)||0,
        countedCash:Math.max(0,Number(closure.countedCash)||0),
        difference:Number(closure.difference)||0,
        notes:String(closure.notes||'').slice(0,500),
        closedBy:String(closure.closedBy||'').slice(0,120),
        closedByUid:String(closure.closedByUid||cloud.user.uid).slice(0,128),
        createdAt:Number(closure.createdAt)||now,
        updatedAt:now
      };
      await setDoc(doc(cloud.db,'stores',cloud.storeId,'cashClosures',record.id),record);
    }
    async function cloudSaveExpense(record,isNew){
      const{doc,setDoc}=cloud.fb;
      const now=Date.now();
      await setDoc(doc(cloud.db,'stores',cloud.storeId,'expenses',record.id),{id:record.id,date:record.date,name:record.name.slice(0,160),category:String(record.category||'Otros').slice(0,80),amount:Math.max(0,Number(record.amount)||0),payment:String(record.payment||'Efectivo').slice(0,60),notes:String(record.notes||'').slice(0,1000),...(isNew?{createdAt:now}:{}),updatedAt:now},{merge:true});
    }
    async function cloudSaveContact(kind,record,isNew){
      const{doc,setDoc}=cloud.fb;
      const col=kind==='customer'?'customers':'suppliers',now=Date.now();
      await setDoc(doc(cloud.db,'stores',cloud.storeId,col,record.id),{id:record.id,name:record.name.slice(0,160),phone:String(record.phone||'').slice(0,40),email:String(record.email||'').slice(0,254),notes:String(record.notes||'').slice(0,1000),...(isNew?{createdAt:now}:{}),updatedAt:now},{merge:true});
    }
    async function cloudDeleteRecord(type,id,stockRestores=[]){
      const{doc,writeBatch,deleteDoc,updateDoc}=cloud.fb;
      const db=cloud.db,sid=cloud.storeId,now=Date.now();
      if(type==='product'){
        const b=writeBatch(db);
        b.delete(doc(db,'stores',sid,'products',id));
        b.delete(doc(db,'stores',sid,'productCosts',id));
        b.delete(doc(db,'catalog',sid,'items',id));
        await b.commit();return;
      }
      if(type==='sale'){
        const b=writeBatch(db);
        b.delete(doc(db,'stores',sid,'sales',id));
        stockRestores.forEach(({id:pid,stock})=>{
          const stVal=Number(stock)||0;
          b.update(doc(db,'stores',sid,'products',pid),{stock:allowsNegativeStock()?stVal:Math.max(0,stVal),updatedAt:now});
        });
        await b.commit();
        for(const sc of stockRestores){try{await updateDoc(doc(db,'catalog',sid,'items',sc.id),{available:sc.stock>0,updatedAt:now})}catch{}}
        return;
      }
      const map={expense:'expenses',customer:'customers',supplier:'suppliers',cashClosure:'cashClosures'};
      if(map[type])await deleteDoc(doc(db,'stores',sid,map[type],id));
    }
    async function cloudSaveSettings(){
      if(!isOwnerRole()||!cloud.storeId)return;
      const{doc,writeBatch}=cloud.fb;
      const db=cloud.db,sid=cloud.storeId,now=Date.now(),st=state.settings;
      const b=writeBatch(db);
      b.update(doc(db,'stores',sid),{business:String(st.business||'Mi negocio').slice(0,120),currency:String(st.currency||'MXN').slice(0,10),address:String(st.address||'').slice(0,250),phone:String(st.phone||'').slice(0,40),email:String(st.email||'').slice(0,254),registration:String(st.registration||'').slice(0,80),seller:String(st.seller||'').slice(0,120),allowNegativeStock:st.allowNegativeStock!==false,cashFloat:Math.max(0,Number(st.cashFloat)||0),updatedAt:now});
      b.set(doc(db,'catalog',sid),buildCatalogStoreDoc(sid,st),{merge:true});
      await b.commit();
    }
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
    const navItems=[['inicio','Inicio','home'],['ventas','Ventas','cart'],['gastos','Gastos','receipt'],['inventario','Inventario','box'],['clientes','Clientes','users'],['proveedores','Proveedores','truck'],['deudas','Pendientes','clock'],['reportes','Reportes','chart'],['catalogo','Catálogo','grid'],['equipo','Equipo','team']];
    const path={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',cart:'<circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 3h2l2.4 12.1a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L22 7H5"/>',receipt:'<path d="M4 3h16v18l-3-2-3 2-3-2-3 2-4-2z"/><path d="M8 8h8M8 12h8M8 16h4"/>',box:'<path d="m12 3 9 5-9 5-9-5z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',truck:'<path d="M3 6h11v12H3zM14 10h4l3 3v5h-7z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="17.5" cy="19" r="1.5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',chart:'<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',team:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',cloud:'<path d="M17.5 19H7a5 5 0 0 1-.5-9.97A6 6 0 0 1 18 10a4.5 4.5 0 0 1-.5 9z"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.4-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a8 8 0 0 1 0-2L6.4 12l1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.4-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 1.9z"/>',plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',export:'<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 14v6h14v-6"/>',edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',chevron:'<path d="m9 18 6-6-6-6"/>',camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',moon:'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',calc:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h2M12 11h2M16 11h.01M8 15h2M12 15h2M16 15h.01M8 19h2M12 19h2"/>'};
    const round2=(n)=>Math.round((Number(n)||0)*100)/100;
    function evalCalcExpr(raw){
      const clean=String(raw||'').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/,/g,'').replace(/\s+/g,'');
      if(!clean)return 0;
      const tokens=[];let i=0;
      while(i<clean.length){
        const ch=clean[i];
        if(/[0-9.]/.test(ch)){let num='';while(i<clean.length&&/[0-9.]/.test(clean[i]))num+=clean[i++];if(num==='.'||Number.isNaN(Number(num)))return NaN;tokens.push({t:'n',v:Number(num)});continue}
        if('+-*/%()'.includes(ch)){tokens.push({t:'o',v:ch});i++;continue}
        return NaN;
      }
      let p=0;const peek=()=>tokens[p],take=()=>tokens[p++];
      const parseExpr=()=>{let v=parseTerm();while(peek()&&(peek().v==='+'||peek().v==='-')){const op=take().v,r=parseTerm();v=op==='+'?v+r:v-r}return v};
      const parseTerm=()=>{let v=parseUnary();while(peek()&&(peek().v==='*'||peek().v==='/')){const op=take().v,r=parseUnary();if(op==='/'&&r===0)return NaN;v=op==='*'?v*r:v/r}return v};
      const parseUnary=()=>{if(peek()?.v==='-'||peek()?.v==='+'){const op=take().v;return op==='-'?-parseUnary():parseUnary()}return parsePostfix()};
      const parsePostfix=()=>{let v=parsePrimary();while(peek()?.v==='%'){take();v=v/100}return v};
      const parsePrimary=()=>{const tk=peek();if(!tk)return NaN;if(tk.t==='n'){take();return tk.v}if(tk.v==='('){take();const v=parseExpr();if(take()?.v!==')')return NaN;return v}return NaN};
      const res=parseExpr();
      return (p===tokens.length&&Number.isFinite(res))?Math.round(res*1000000)/1000000:NaN;
    }
    const getSalePaymentEntries=(s)=>{
      if(Array.isArray(s.payments)&&s.payments.length)return s.payments.map(x=>({method:x.method||'Efectivo',amount:Math.max(0,Number(x.amount)||0),date:x.date||s.date||today(),at:Number(x.at||x.createdAt)||0,by:x.by||s.seller||'',byUid:x.byUid||s.sellerUid||''})).filter(x=>x.amount>0);
      const pd=Math.min(Number(s.total)||0,Math.max(0,Number(s.paid)||0));
      if(pd<=0)return [];
      const m=(!s.payment||s.payment==='Pendiente'||s.payment==='Combinado')?'Efectivo':s.payment;
      return [{method:m,amount:pd,date:s.date||today(),at:Number(s.createdAt)||0,by:s.seller||'',byUid:s.sellerUid||''}];
    };
    const icon=(name,size=18)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path[name]||path.grid}</svg>`;
    const money=(n)=>new Intl.NumberFormat('es-MX',{style:'currency',currency:(cloud.publicStoreId?cloud.publicStore?.currency:state.settings.currency)||'MXN',minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(n)||0);
    const fmtDate=(s)=>{if(!s)return'—';const d=new Date(s+'T12:00:00');return new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short'}).format(d)};
    const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const save=()=>{if(isCloudActive()){cacheCloudState();return}const value=JSON.stringify(state);try{localStorage.setItem(STORE_KEY,value)}catch{}try{window.NotasApp?.saveState?.(value)}catch{}};
    const getProduct=(id)=>state.products.find(p=>p.id===id);
    const productArt=(p)=>p?.photo?`<img src="${esc(p.photo)}" alt="" onerror="this.replaceWith(document.createTextNode('📦'))" />`:esc(p?.emoji||'📦');
    const pending=(s)=>Math.max(0,(Number(s.total)||0)-(Number(s.paid)||0));
    const getSaleItems=(s)=>Array.isArray(s.items)&&s.items.length?s.items.map(item=>({productId:item.productId,product:item.product||item.name||'Producto',name:item.name||item.product||'Producto',qty:Number(item.qty)||0,unitPrice:Number(item.unitPrice)||0,total:Number(item.total??item.amount)||((Number(item.qty)||0)*(Number(item.unitPrice)||0))})):[{productId:s.productId,product:s.product||'Producto',name:s.product||'Producto',qty:Number(s.qty)||0,unitPrice:Number(s.unitPrice)||0,total:Number(s.total)||0}];
    const invoiceDate=(s)=>{const d=new Date((s.date||today())+'T12:00:00');const date=new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'long',year:'numeric'}).format(d);return `${date}${s.time?' · '+s.time:''}`};
    const visibleNavItems=()=>isSellerRole()?navItems.filter(x=>['inicio','ventas','inventario','clientes','deudas','catalogo'].includes(x[0])):navItems;
    const iconForNav=(id)=>navItems.find(x=>x[0]===id)?.[2]||'grid';
    function navButton(id,label,ic){return `<button class="nav-btn ${page===id?'active':''}" data-page="${id}"><span class="nav-icon">${icon(ic)}</span><span>${label}</span>${id==='deudas'&&state.sales.filter(s=>pending(s)>0).length?`<span class="nav-count">${state.sales.filter(s=>pending(s)>0).length}</span>`:''}</button>`}
    const totalSales=(arr=state.sales)=>arr.reduce((a,s)=>a+Number(s.total||0),0);
    const totalExpenses=(arr=state.expenses)=>arr.reduce((a,e)=>a+Number(e.amount||0),0);
    function withinDays(date,days){const t=new Date();t.setHours(0,0,0,0);const d=new Date(date+'T00:00:00');const start=new Date(t);start.setDate(start.getDate()-(Number(days)-1));return d>=start&&d<=t}
    function computeShiftSummary(mode='since-last',floatOverride=null){
      const sellerOnly=isSellerRole();
      const sortedClosures=[...(state.cashClosures||[])].sort((a,b)=>(Number(b.closedAt)||0)-(Number(a.closedAt)||0));
      const relevantClosure=sellerOnly?sortedClosures.find(c=>!cloud.user?.uid||c.closedByUid===cloud.user.uid):sortedClosures[0];
      const useSinceLast=mode==='since-last'&&Boolean(relevantClosure?.closedAt);
      const cutoffTs=useSinceLast?Number(relevantClosure.closedAt):0;
      const td=today();
      let cashSales=0,cardSales=0,transferSales=0,otherSales=0,salesCount=0,pendingCreated=0;
      for(const s of state.sales){
        if(sellerOnly&&!isOwnSale(s))continue;
        const entries=getSalePaymentEntries(s);
        let matchedSale=false;
        for(const p of entries){
          const ts=Number(p.at)||0;
          const inWindow=useSinceLast?(ts>cutoffTs||(!ts&&String(p.date||'')>String(relevantClosure.date||''))):(String(p.date||s.date||'')===td);
          if(!inWindow)continue;
          if(sellerOnly&&isCloudActive()&&p.byUid&&cloud.user?.uid&&p.byUid!==cloud.user.uid)continue;
          matchedSale=true;
          if(p.method==='Efectivo')cashSales=round2(cashSales+p.amount);
          else if(p.method==='Tarjeta')cardSales=round2(cardSales+p.amount);
          else if(p.method==='Transferencia')transferSales=round2(transferSales+p.amount);
          else otherSales=round2(otherSales+p.amount);
        }
        const saleTs=Number(s.createdAt)||0;
        const saleInWindow=useSinceLast?(saleTs>cutoffTs||(!saleTs&&String(s.date||'')>String(relevantClosure.date||''))):(String(s.date||'')===td);
        if(saleInWindow){salesCount++;if(pending(s)>0)pendingCreated=round2(pendingCreated+pending(s))}
        else if(matchedSale)salesCount++;
      }
      let expensesTotal=0;
      if(!sellerOnly){
        for(const e of state.expenses){
          if((e.payment||'Efectivo')!=='Efectivo')continue;
          const ts=Number(e.createdAt||e.updatedAt)||0;
          const inWindow=useSinceLast?(ts>cutoffTs||(!ts&&String(e.date||'')>String(relevantClosure.date||''))):(String(e.date||'')===td);
          if(inWindow)expensesTotal=round2(expensesTotal+(Number(e.amount)||0));
        }
      }
      const openingFloat=Math.max(0,Number(floatOverride!=null?floatOverride:(relevantClosure?.countedCash??state.settings.cashFloat??0))||0);
      const rawExpected=round2(openingFloat+cashSales-expensesTotal);
      const expectedCash=Math.max(0,rawExpected);
      return {mode:useSinceLast?'since-last':'today',hasPrevClosure:Boolean(relevantClosure),prevClosure:relevantClosure||null,openedAt:useSinceLast?cutoffTs:new Date(td+'T00:00:00').getTime(),openingFloat,cashSales,cardSales,transferSales,otherSales,expensesTotal,rawExpected,expectedCash,salesCount,pendingCreated,sellerOnly};
    }
    function dataInPeriod(){return{sales:state.sales.filter(s=>withinDays(s.date,period==='all'?100000:Number(period))),expenses:state.expenses.filter(e=>withinDays(e.date,period==='all'?100000:Number(period)))}}
    function head(title,desc,actions=''){return `<div class="page-head"><div><div class="eyebrow">Notas · ${esc(state.settings.business||'Mi negocio')}</div><h1 class="page-title">${title}</h1><p class="page-desc">${desc}</p></div>${actions?`<div class="head-actions">${actions}</div>`:''}</div>`}
    function pageTitle(){return navItems.find(x=>x[0]===page)?.[1]||'Inicio'}
    function renderPublicCatalog(){
      const st=cloud.publicStore||{business:'Catálogo',currency:'MXN',phone:''};
      const avail=cloud.publicItems.filter(p=>p.available!==false);
      const cats=['Todas',...new Set(avail.map(p=>p.category||'Productos'))].sort((a,b)=>a==='Todas'?-1:b==='Todas'?1:a.localeCompare(b,'es-MX'));
      const q=search.trim().toLocaleLowerCase('es-MX');
      const list=avail.filter(p=>(cloud.publicCategory==='Todas'||(p.category||'Productos')===cloud.publicCategory)&&(!q||(p.name+' '+(p.category||'')).toLocaleLowerCase('es-MX').includes(q)));
      const cartEntries=Object.entries(cloud.publicCart).filter(([,q])=>q>0).map(([id,qty])=>{const p=avail.find(x=>x.id===id);return p?{...p,qty}:null}).filter(Boolean);
      const cartUnits=cartEntries.reduce((a,x)=>a+x.qty,0),cartTotal=cartEntries.reduce((a,x)=>a+x.qty*(Number(x.price)||0),0);
      app.innerHTML=`<div class="pub-shell"><header class="pub-header"><div class="pub-brand"><div class="brand-mark">N.</div><div><div class="pub-title">${esc(st.business||'Catálogo')}</div><div class="pub-sub">Catálogo en vivo · Productos disponibles</div></div></div><div class="pub-head-actions"><button type="button" class="icon-btn" data-action="toggle-theme" title="${theme==='dark'?'Modo claro':'Modo oscuro'}" aria-label="${theme==='dark'?'Modo claro':'Modo oscuro'}">${icon(theme==='dark'?'sun':'moon',17)}</button>${!cloud.publicViaLink?`<button class="btn btn-light btn-sm" data-pub-exit>Volver a Notas</button>`:`<button class="btn btn-light btn-sm" data-pub-exit>Soy del equipo</button>`}</div></header><main class="pub-content">${cloud.publicLoading?`<div class="card empty">Cargando catálogo disponible…</div>`:cloud.publicError?`<div class="card empty"><div class="empty-icon">🔎</div>${esc(cloud.publicError)}</div>`:`${toolbar('Buscar producto en el catálogo…')}${cats.length>2?`<div class="sale-categories" role="tablist">${cats.map(c=>`<button type="button" class="sale-chip ${cloud.publicCategory===c?'active':''}" data-pub-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>`:''}${list.length?`<div class="grid pub-grid">${list.map(p=>{const qty=cloud.publicCart[p.id]||0;return `<article class="card pub-card ${qty>0?'selected':''}"><button type="button" class="pub-art photo-zoom-trigger" data-pub-zoom="${esc(p.id)}" aria-label="Ampliar ${esc(p.name)}">${productArt(p)}</button><div class="pub-body"><div class="pub-name">${esc(p.name)}</div><div class="pub-meta"><span>${esc(p.category||'Producto')}</span><span class="badge green">Disponible</span></div><div class="pub-foot"><strong class="pub-price">${money(p.price)}</strong><div class="qty-stepper"><button type="button" data-pub-qty="-1" data-id="${esc(p.id)}" ${qty<1?'disabled':''}>−</button><strong>${qty}</strong><button type="button" data-pub-qty="1" data-id="${esc(p.id)}">+</button></div></div></div></article>`}).join('')}</div>`:`<div class="card empty">No hay productos disponibles con esa búsqueda.</div>`}`}</main>${cartUnits?`<div class="pub-cart-bar"><div class="pub-cart-info"><span>${cartUnits} producto(s) seleccionados</span><strong>${money(cartTotal)}</strong></div><button type="button" class="btn btn-lime" data-pub-whatsapp>${st.phone?'Pedir por WhatsApp':'Copiar lista de pedido'}</button></div>`:''}</div>`;
      const searchInput=document.getElementById('list-search');
      if(searchInput)searchInput.addEventListener('input',e=>{const pos=e.target.selectionStart;search=e.target.value;render();const f=document.getElementById('list-search');f?.focus();f?.setSelectionRange(pos,pos)});
      document.querySelectorAll('[data-pub-cat]').forEach(b=>b.addEventListener('click',()=>{cloud.publicCategory=b.dataset.pubCat;render()}));
      document.querySelectorAll('[data-pub-qty]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.id,next=Math.max(0,(cloud.publicCart[id]||0)+Number(b.dataset.pubQty));if(next)cloud.publicCart[id]=next;else delete cloud.publicCart[id];render()}));
      document.querySelectorAll('[data-pub-zoom]').forEach(b=>b.addEventListener('click',()=>{const p=cloud.publicItems.find(x=>x.id===b.dataset.pubZoom);if(p)openPhotoZoom({photo:p.photo,emoji:p.emoji,title:p.name,subtitle:p.category||'Disponible',priceText:money(p.price)})}));
      document.querySelector('[data-pub-exit]')?.addEventListener('click',()=>{clearCloudListeners();cloud.publicStoreId='';cloud.publicViaLink=false;cloud.publicCart={};search='';if(location.search.includes('catalogo')||location.hash.includes('catalogo')){try{history.replaceState(null,'',location.pathname)}catch{}}initCloud();render()});
      document.querySelector('[data-pub-whatsapp]')?.addEventListener('click',()=>{
        const lines=[`Hola, me gustaría pedir de *${st.business||'tu tienda'}*:`,...cartEntries.map(x=>`• ${x.qty}x ${x.name} (${money(x.qty*(Number(x.price)||0))})`),`Total aproximado: ${money(cartTotal)}`].join('\n');
        const digits=String(st.phone||'').replace(/\D/g,'');
        if(digits.length>=8){const wa=(digits.length===10?'52'+digits:digits);window.open(`https://wa.me/${wa}?text=${encodeURIComponent(lines)}`,'_blank','noopener');return}
        if(navigator.clipboard?.writeText){navigator.clipboard.writeText(lines).then(()=>toast('Pedido copiado para enviar')).catch(()=>toast('No se pudo copiar el pedido',true))}
        else toast(lines);
      });
    }
    function render(){
      if(cloud.publicStoreId){renderPublicCatalog();return}
      const navList=visibleNavItems();
      const mobile=isSellerRole()
        ?[['inicio','Inicio','home'],['ventas','Ventas','cart'],['inventario','Stock','box'],['catalogo','Catálogo','grid'],['mas','Menú','menu']]
        :[['inicio','Inicio','home'],['ventas','Ventas','cart'],['inventario','Stock','box'],['reportes','Reportes','chart'],['mas','Menú','menu']];
      const updateBanner=updateInfo?`<div class="update-banner"><div><strong>Nueva versión disponible (v${esc(updateInfo.webVersion||updateInfo.versionName)})</strong><span>${esc(updateInfo.notes||'Mejoras listas para instalar.')}</span></div><button class="btn btn-primary btn-sm" data-action="apply-update">Actualizar ahora</button></div>`:'';
      const cloudBanner=!cloud.user&&cloud.authReady?`<div class="cloud-banner"><div><strong>Sincroniza tus celulares y vendedores en la nube</strong><span>Inicia sesión para compartir catálogo en vivo entre dispositivos y generar tu link para compradores.</span></div><button class="btn btn-primary btn-sm" data-action="auth">Conectar cuenta</button></div>`:'';
      const previewBanner=cloud.previewSeller?`<div class="cloud-banner preview-banner"><div><strong>Vista previa de Vendedor activa</strong><span>Costos, Gastos, Proveedores, Reportes y Equipo están ocultos como para tus empleados.</span></div><button type="button" class="btn btn-primary btn-sm" data-exit-seller-preview>Volver a Dueño</button></div>`:'';
      const planLabel=isCloudActive()?`${cloudRoleLabel()} · Nube`:cloud.user?'Cuenta lista · Sin negocio':`Espacio local · ${esc(state.settings.currency||'MXN')}`;
      const avatarChar=esc((cloud.user?.displayName||cloud.user?.email||state.settings.business||'N').slice(0,1).toUpperCase());
      app.innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand"><div class="brand-mark">N.</div><div><div class="brand-name">notas</div><div class="brand-sub">cuentas claras, negocio en orden</div></div></div><div class="nav-label">Tu negocio</div><nav class="nav">${navList.map(x=>navButton(x[0],x[1],x[2])).join('')}</nav><div class="sidebar-bottom">${isOwnerRole()?`<button class="nav-btn" data-action="settings"><span class="nav-icon">${icon('settings')}</span><span>Configuración</span></button>`:''}<button class="shop-card shop-card-btn" data-action="${cloud.user?'account':'auth'}"><div class="shop-avatar">${isCloudActive()?'☁️':'⌂'}</div><div class="shop-copy"><div class="shop-name">${esc(state.settings.business||'Mi negocio')}</div><div class="shop-plan">${esc(planLabel)}</div></div><span class="shop-menu">${cloud.user?'✓':'→'}</span></button></div></aside><main class="main"><header class="topbar"><div class="crumb">${page==='inicio'?'Resumen de hoy':pageTitle()}${isCloudActive()||cloud.previewSeller?` <span class="role-pill ${cloud.previewSeller?'seller':cloud.role}">${esc(cloudRoleLabel())}</span>`:''}</div><div class="top-actions">${isRealOwner()?`<button type="button" class="btn btn-sm ${cloud.previewSeller?'btn-primary':'btn-light'}" data-action="toggle-seller-preview" title="${cloud.previewSeller?'Volver a tu vista de Dueño':'Simular vista de Vendedor en esta pantalla'}">${cloud.previewSeller?'Volver a Dueño':'Vista vendedor'}</button>`:''}<button type="button" class="icon-btn" data-action="calculator" title="Calculadora rápida" aria-label="Calculadora rápida">${icon('calc',17)}</button><button type="button" class="icon-btn" data-action="toggle-theme" title="${theme==='dark'?'Cambiar a modo claro':'Cambiar a modo oscuro'}" aria-label="${theme==='dark'?'Cambiar a modo claro':'Cambiar a modo oscuro'}">${icon(theme==='dark'?'sun':'moon',17)}</button>${isOwnerRole()?`<button class="icon-btn" data-action="settings" title="Configuración">${icon('settings',17)}</button>`:''}<button type="button" class="user-pill" data-action="${cloud.user?'account':'auth'}" title="${cloud.user?'Cuenta en la nube':'Iniciar sesión'}" aria-label="Cuenta">${avatarChar}</button></div></header><div class="content">${updateBanner}${cloudBanner}${previewBanner}${renderPage()}</div></main></div><nav class="mobile-nav">${mobile.map(([id,label,ic])=>`<button data-page="${id}" class="${page===id?'active':''}"><span class="nav-icon">${icon(ic)}</span><span>${label}</span></button>`).join('')}</nav>${modal?renderModal():''}`;
      document.querySelectorAll('.table-wrap table').forEach(table=>{const labels=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());table.querySelectorAll('tbody tr').forEach(row=>[...row.cells].forEach((cell,i)=>{cell.dataset.label=labels[i]||'';if(cell.querySelector('.inline-actions'))cell.classList.add('mobile-actions')}))});
      document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.page==='mas'){showMoreMenu();return}if(isSellerRole()&&['gastos','proveedores','reportes','equipo'].includes(b.dataset.page))return toast('Solo un dueño puede abrir esa sección',true);if(modal?.type==='more')modal=null;page=b.dataset.page;search='';saleFilter='all';saleOwnerFilter='all';stockFilter='all';invCategory='Todas';render()}));
      document.querySelectorAll('[data-exit-seller-preview]').forEach(b=>b.addEventListener('click',()=>{cloud.previewSeller=false;modal=null;render();toast('Volviste a tu vista de Dueño')}));
      document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.open)));
      document.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.edit,b.dataset.id)));
      document.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteRecord(b.dataset.delete,b.dataset.id)));
      bindPage(); if(page==='reportes'&&isOwnerRole())drawCharts();
      if(modal)bindModal();
    }
    function renderPage(){
      if(isSellerRole()&&['gastos','proveedores','reportes','equipo'].includes(page))page='inicio';
      switch(page){case'ventas':return salesPage();case'gastos':return expensesPage();case'inventario':return inventoryPage();case'clientes':return contactsPage('clientes');case'proveedores':return contactsPage('proveedores');case'deudas':return debtsPage();case'reportes':return reportsPage();case'catalogo':return catalogPage();case'equipo':return teamPage();default:return homePage()}
    }
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
      const sellerStats=`<div class="home-stats"><button type="button" class="card stat-card stat-card-btn" data-page="ventas"><div class="stat-label">Ventas (30 días)</div><div class="stat-val">${money(sale)}</div><div class="stat-foot">${sales.length} nota(s) →</div></button><button type="button" class="card stat-card stat-card-btn" data-page="inventario"><div class="stat-label">Productos disponibles</div><div class="stat-val">${state.products.filter(p=>Number(p.stock)>0).length}</div><div class="stat-foot">${state.products.length} en catálogo →</div></button></div>`;
      const ownerStats=`<div class="home-stats"><button type="button" class="card stat-card stat-card-btn" data-page="ventas"><div class="stat-label">Ventas</div><div class="stat-val">${money(sale)}</div><div class="stat-foot">${sales.length} nota(s) →</div></button><button type="button" class="card stat-card stat-card-btn" data-page="reportes"><div class="stat-label">Balance</div><div class="stat-val">${money(profit)}</div><div class="stat-foot">Gastos: ${money(expense)} · Ver →</div></button></div>`;
      const quickBar=isSellerRole()
        ?`<div class="home-quick seller-quick"><button class="home-quick-btn" data-page="inventario">📦 Ver Stock</button><button class="home-quick-btn" data-open="customer">＋ Cliente</button></div>`
        :`<div class="home-quick"><button class="home-quick-btn" data-open="expense">− Gasto</button><button class="home-quick-btn" data-open="product">＋ Producto</button><button class="home-quick-btn" data-open="customer">＋ Cliente</button></div>`;
      return `${head(esc(state.settings.business||'Inicio'),isSellerRole()?'Vista de vendedor · Stock sincronizado en vivo.':'Resumen de los últimos 30 días.',actions)}${isSellerRole()?sellerStats:ownerStats}${alerts?`<div class="home-alerts">${alerts}</div>`:''}${quickBar}<section class="card table-card" style="margin-top:0"><div class="table-head"><div><h2 class="panel-title">Últimos movimientos</h2></div><button class="text-btn" data-page="ventas">Ver todo ${icon('chevron',13)}</button></div><div class="home-list">${activityList()}</div></section>`;
    }
    function activityList(){
      const rows=[
        ...state.sales.map(s=>{const items=getSaleItems(s);return{kind:'sale',date:s.date,title:items.length>1?`${items.length} productos`:items[0].product,sub:s.customer||s.payment||'Venta',amount:s.total}}),
        ...(isSellerRole()?[]:state.expenses.map(e=>({kind:'expense',date:e.date,title:e.name,sub:e.category||'Gasto',amount:e.amount})))
      ].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
      if(!rows.length)return `<div class="empty">Todavía no hay actividad. Registra tu primera venta.</div>`;
      return `<div class="activity">${rows.map(r=>`<div class="activity-item"><div class="activity-mark ${r.kind==='sale'?'':'out'}">${r.kind==='sale'?'+':'−'}</div><div class="activity-main"><div class="activity-name">${esc(r.title)}</div><div class="activity-meta">${fmtDate(r.date)} · ${esc(r.sub)}</div></div><div class="activity-amount ${r.kind==='sale'?'in':'out'}">${r.kind==='sale'?'+':'−'}${money(r.amount)}</div></div>`).join('')}</div>`;
    }
    function toolbar(placeholder='Buscar…',filters=''){return `<div class="toolbar"><div class="searchbox"><span>${icon('search',16)}</span><input id="list-search" value="${esc(search)}" placeholder="${placeholder}" /></div>${filters}</div>`}
    function tableShell(title,sub,rows,cols,emptyText,tableClass='',headRight=''){return `<section class="card table-card" style="margin-top:0"><div class="table-head"><div><h2 class="panel-title">${title}</h2><p class="panel-note">${sub}</p></div>${headRight}</div>${rows.length?`<div class="table-wrap ${tableClass}"><table><thead><tr>${cols}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:`<div class="empty"><div class="empty-icon">🗒️</div>${emptyText}</div>`}</section>`}
    function salesPage(){
      const q=search.trim().toLowerCase();
      const pendingCount=state.sales.filter(s=>pending(s)>0).length;
      const myCount=state.sales.filter(s=>isOwnSale(s)).length;
      const ownerCount=state.sales.filter(s=>saleAuthorRole(s)==='owner').length;
      const sellerCount=state.sales.filter(s=>saleAuthorRole(s)==='seller').length;
      const list=state.sales.filter(s=>{
        const matchQuery=!q||(getSaleItems(s).map(i=>i.product).join(' ')+' '+(s.customer||'')+' '+(s.seller||'')+' '+(s.payment||'')+' #'+(s.folio||'')).toLowerCase().includes(q);
        const matchFilter=saleFilter==='all'||(saleFilter==='Pendiente'?pending(s)>0:s.payment===saleFilter);
        const matchOwner=saleOwnerFilter==='all'||(saleOwnerFilter==='mine'?isOwnSale(s):saleAuthorRole(s)===saleOwnerFilter);
        return matchQuery&&matchFilter&&matchOwner;
      }).sort((a,b)=>b.date.localeCompare(a.date));
      const ownerOpts=[['all','Todas',state.sales.length],['mine','Mis ventas',myCount],['owner','Dueño',ownerCount],['seller','Vendedores',sellerCount]];
      const ownerChips=(isCloudActive()||cloud.previewSeller)?`<div class="sale-filter-chips sale-owner-chips" role="group" aria-label="Separar ventas por responsable">${ownerOpts.map(([val,label,cnt])=>`<button type="button" class="sale-filter-chip ${saleOwnerFilter===val?'active':''}" data-sale-owner-filter="${val}">${label}<span class="sale-filter-count">${cnt}</span></button>`).join('')}</div>`:'';
      const filterOpts=[['all','Todas'],['Pendiente','Pendientes'],['Efectivo','Efectivo'],['Tarjeta','Tarjeta'],['Transferencia','Transferencia']];
      const filterChips=`<div class="sale-filter-chips" role="group" aria-label="Filtrar ventas por pago">${filterOpts.map(([val,label])=>`<button type="button" class="sale-filter-chip ${saleFilter===val?'active':''}" data-sale-filter="${val}">${label}${val==='Pendiente'&&pendingCount?`<span class="sale-filter-count">${pendingCount}</span>`:''}</button>`).join('')}</div>`;
      const rows=list.map(s=>{
        const items=getSaleItems(s),label=items.map(i=>i.product).join(', '),units=items.reduce((a,i)=>a+i.qty,0),pend=pending(s);
        const rowCanEdit=canModifySale(s),own=isOwnSale(s),role=saleAuthorRole(s);
        const roleTag=(isCloudActive()||cloud.previewSeller)?(own&&isSellerRole()?`<span class="role-pill mine">Tuya</span>`:role==='owner'?`<span class="role-pill owner">Dueño</span>`:`<span class="role-pill seller">Vendedor</span>`):'';
        return `<tr><td class="sale-col-main"><div class="table-main"><span class="sale-folio-tag">#${esc(s.folio||'0001')}</span>${esc(label)}</div><div class="table-sub">${roleTag}${units} ud(s)${s.customer?' · '+esc(s.customer):''}${s.seller?' · Vendió: '+esc(s.seller):''}</div></td><td class="sale-col-meta"><span>${fmtDate(s.date)} · ${esc(s.payment)}</span>${pend>0?`<span class="badge orange">Pendiente ${money(pend)}</span>`:`<span class="badge green">Pagada</span>`}</td><td class="money sale-col-total" style="text-align:right">${money(s.total)}</td><td><div class="inline-actions">${pend>0?`<button class="text-btn" style="color:var(--orange-dark);font-weight:750" data-action="collect:${s.id}">Cobrar</button>`:''}<button class="text-btn" data-action="receipt:${s.id}" title="Ver comprobante">Ver nota</button>${rowCanEdit?`<button class="text-btn" data-edit="sale" data-id="${s.id}" aria-label="Editar">${icon('edit',14)} Editar</button><button class="text-btn delete-action" data-delete="sale" data-id="${s.id}" title="Cancelar / eliminar nota" aria-label="Eliminar nota">${icon('trash',14)}</button>`:''}</div></td></tr>`;
      });
      const subSummary=list.length===state.sales.length?`${state.sales.length} nota(s) · ${money(totalSales(list))}`:`${list.length} de ${state.sales.length} nota(s) · ${money(totalSales(list))}`;
      return `${head('Ventas','Registra ventas rápido y consulta tus notas.',`<button class="btn btn-light" data-action="cash-close">Corte de caja</button><button class="btn btn-lime" data-open="sale">${icon('plus',15)} Nueva venta</button>`)}${toolbar('Buscar producto, cliente o #folio…')}${ownerChips}${filterChips}${tableShell('Historial de ventas',subSummary,rows,'<th>Nota</th><th>Fecha, pago y estado</th><th style="text-align:right">Total</th><th></th>',q||saleFilter!=='all'||saleOwnerFilter!=='all'?'No hay ventas que coincidan con este filtro.':'No hay ventas todavía. Registra tu primera venta para empezar.','sales-table')}`;
    }
    function expensesPage(){const list=state.expenses.filter(e=>(e.name+' '+e.category+' '+e.payment).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));const rows=list.map(e=>`<tr><td><div class="table-main">${esc(e.name)}</div><div class="table-sub">${esc(e.notes||e.category||'')}</div></td><td>${fmtDate(e.date)}</td><td>${esc(e.category||'—')}</td><td>${esc(e.payment||'—')}</td><td class="money" style="text-align:right">${money(e.amount)}</td><td><div class="inline-actions"><button class="text-btn" data-edit="expense" data-id="${e.id}">${icon('edit',14)} Editar</button><button class="text-btn delete-action" data-delete="expense" data-id="${e.id}">${icon('trash',14)} Eliminar</button></div></td></tr>`);return `${head('Gastos','Anota las salidas de dinero para entender mejor tus costos.',`<button class="btn btn-lime" data-open="expense">${icon('plus',15)} Nuevo gasto</button>`)}${toolbar('Buscar gasto o categoría…')}${tableShell('Gastos registrados',`${state.expenses.length} movimiento(s) · ${money(totalExpenses())}`,rows,'<th>Concepto</th><th>Fecha</th><th>Categoría</th><th>Forma de pago</th><th style="text-align:right">Importe</th><th></th>','Aún no tienes gastos registrados.')}`}
    function inventoryPage(){
      const q=search.trim().toLowerCase(),owner=isOwnerRole();
      const categories=['Todas',...new Set(state.products.map(p=>p.category||'Productos'))].sort((a,b)=>a==='Todas'?-1:b==='Todas'?1:a.localeCompare(b,'es-MX'));
      const lowCount=state.products.filter(p=>Number(p.stock)<=Number(p.min)).length;
      const outCount=state.products.filter(p=>Number(p.stock)<=0).length;
      const list=state.products.filter(p=>{
        const matchQ=!q||(p.name+' '+(p.category||'')+' '+p.price+' '+(owner?p.cost:'')+' '+p.stock).toLowerCase().includes(q);
        const matchStock=stockFilter==='all'||(stockFilter==='low'?Number(p.stock)<=Number(p.min):Number(p.stock)<=0);
        const matchCat=invCategory==='Todas'||(p.category||'Productos')===invCategory;
        return matchQ&&matchStock&&matchCat;
      }).sort((a,b)=>a.name.localeCompare(b.name,'es-MX'));
      const statusOpts=[['all','Todos'],['low','Stock bajo'],['out','Agotados']];
      const statusChips=`<div class="sale-filter-chips" role="group" aria-label="Filtrar existencias">${statusOpts.map(([val,label])=>`<button type="button" class="sale-filter-chip ${stockFilter===val?'active':''}" data-stock-filter="${val}">${label}${val==='low'&&lowCount?`<span class="sale-filter-count">${lowCount}</span>`:''}${val==='out'&&outCount?`<span class="inv-filter-count">${outCount}</span>`:''}</button>`).join('')}</div>`;
      const catChips=categories.length>2?`<div class="sale-categories inv-cats" role="tablist" aria-label="Categorías de inventario">${categories.map(c=>`<button type="button" class="sale-chip ${invCategory===c?'active':''}" data-inv-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>`:'';
      const rows=list.map(p=>{
        const st=Number(p.stock)||0,mn=Number(p.min)||0,margin=(Number(p.price)||0)-(Number(p.cost)||0);
        const badge=st<0?`<span class="badge red">${st} · Negativo</span>`:st===0?`<span class="badge red">0 · Agotado</span>`:st<=mn?`<span class="badge orange">${st} · Bajo (mín. ${mn})</span>`:`<span class="badge green">${st} disp.</span>`;
        const priceSub=owner?`<div class="table-sub"><span class="inv-cost-inline">Costo ${money(p.cost)} · </span>Gan. ${money(margin)}</div>`:'';
        const actions=owner
          ?`<button class="text-btn" style="font-weight:740" data-action="adjust:${p.id}">± Stock</button><button class="text-btn" data-edit="product" data-id="${p.id}" aria-label="Editar">${icon('edit',14)} Editar</button><button class="text-btn delete-action" data-delete="product" data-id="${p.id}" aria-label="Eliminar producto">${icon('trash',14)}</button>`
          :`<button class="text-btn" style="font-weight:740" data-action="adjust:${p.id}">＋ Sumar stock</button>`;
        return `<tr class="${st<=mn?'low-row':''}"><td class="inv-col-main"><div class="stock-name"><button type="button" class="product-thumb photo-zoom-trigger" data-zoom-product="${esc(p.id)}" title="Ver imagen grande" aria-label="Agrandar imagen de ${esc(p.name)}">${productArt(p)}</button><div class="inv-title-wrap"><div class="table-main">${esc(p.name)}</div><div class="table-sub">${esc(p.category||'Sin categoría')}</div></div></div></td><td class="money inv-col-price">${money(p.price)}${priceSub}</td><td class="inv-col-stock">${badge}</td>${owner?`<td class="inv-col-cost">Costo ${money(p.cost)}</td>`:''}<td><div class="inline-actions">${actions}</div></td></tr>`;
      });
      const sizeOpts=[['sm','Chica'],['md','Mediana'],['lg','Grande']];
      const sizeSwitch=`<div class="inv-size-switch" role="group" aria-label="Tamaño de imagen">${sizeOpts.map(([val,label])=>`<button type="button" class="inv-size-btn ${invPhotoSize===val?'active':''}" data-inv-size="${val}">${label}</button>`).join('')}</div>`;
      const listUnits=list.reduce((a,p)=>a+(Number(p.stock)||0),0),listRetail=list.reduce((a,p)=>a+(Number(p.price)||0)*(Number(p.stock)||0),0);
      const subSummary=`${list.length}${list.length!==state.products.length?' de '+state.products.length:''} producto(s) · ${listUnits} ud(s)${owner?' · valor venta '+money(listRetail):''}`;
      const cols=owner?'<th>Producto</th><th>Precio</th><th>Existencias</th><th>Costo</th><th></th>':'<th>Producto</th><th>Precio</th><th>Existencias</th><th></th>';
      return `${head('Inventario',owner?'Controla existencias, precios y alertas de resurtido.':'Consulta existencias en tiempo real o suma nuevas entradas.',owner?`<button class="btn btn-lime" data-open="product">${icon('plus',15)} Agregar producto</button>`:'')}${toolbar('Buscar producto, categoría o precio…')}${statusChips}${catChips}${tableShell('Productos',subSummary,rows,cols,q||stockFilter!=='all'||invCategory!=='Todas'?'No hay productos con ese filtro.':'Agrega tus productos para llevar tu inventario al día.',`inv-table thumb-${invPhotoSize}`,sizeSwitch)}`;
    }
    function contactsPage(type){const isCustomer=type==='clientes',items=isCustomer?state.customers:state.suppliers,title=isCustomer?'Clientes':'Proveedores',kind=isCustomer?'customer':'supplier',owner=isOwnerRole();const list=items.filter(x=>(x.name+' '+(x.phone||'')+' '+(x.notes||'')).toLowerCase().includes(search.toLowerCase()));const rows=list.map(x=>`<tr><td><div class="table-main">${esc(x.name)}</div><div class="table-sub">${esc(x.notes||'')}</div></td><td>${esc(x.phone||'—')}</td>${isCustomer?`<td>${money(state.sales.filter(s=>s.customer===x.name).reduce((a,s)=>a+s.total,0))}</td><td>${money(state.sales.filter(s=>s.customer===x.name).reduce((a,s)=>a+pending(s),0))}</td>`:`<td>${esc(x.email||'—')}</td>`}<td><div class="inline-actions"><button class="text-btn" data-edit="${kind}" data-id="${x.id}">Editar</button>${owner?`<button class="text-btn delete-action" data-delete="${type==='clientes'?'customer':'supplier'}" data-id="${x.id}">${icon('trash',14)} Eliminar</button>`:''}</div></td></tr>`);const cols=isCustomer?'<th>Nombre</th><th>Teléfono</th><th>Compras</th><th>Por cobrar</th><th></th>':'<th>Proveedor</th><th>Teléfono</th><th>Correo</th><th></th>';return `${head(title,isCustomer?'Organiza tus contactos y consulta sus compras o saldos.':'Guarda los datos de quienes abastecen tu negocio.',`<button class="btn btn-lime" data-open="${kind}">${icon('plus',15)} Agregar ${isCustomer?'cliente':'proveedor'}</button>`)}${toolbar(isCustomer?'Buscar cliente…':'Buscar proveedor…')}${tableShell(title,`${items.length} contacto(s)`,rows,cols,`Todavía no hay ${isCustomer?'clientes':'proveedores'} guardados.`)}`}
    function debtsPage(){const owner=isOwnerRole(),list=state.sales.filter(s=>pending(s)>0).sort((a,b)=>b.date.localeCompare(a.date));const total=list.reduce((a,s)=>a+pending(s),0);const rows=list.map(s=>`<tr><td><div class="table-main">${esc(s.customer||'Cliente sin nombre')}</div><div class="table-sub">${esc(getSaleItems(s).map(item=>item.product).join(', '))} · ${fmtDate(s.date)}</div></td><td>${money(s.total)}</td><td>${money(s.paid)}</td><td class="money">${money(pending(s))}</td><td><div class="inline-actions"><button class="btn btn-light btn-sm" data-action="collect:${s.id}">Registrar abono</button>${owner?`<button class="btn btn-light btn-sm" data-edit="sale" data-id="${s.id}">Editar nota</button>`:''}</div></td></tr>`);return `${head('Por cobrar','Da seguimiento a ventas que todavía tienen saldo pendiente.')}<div class="kpi-banner"><div><h3>Saldo total pendiente</h3><p>Se calcula a partir de las ventas registradas como pendientes o con abono.</p></div><div class="amount">${money(total)}</div></div>${tableShell('Cuentas pendientes',`${list.length} saldo(s) abierto(s)`,rows,'<th>Cliente / venta</th><th>Total venta</th><th>Abonado</th><th>Saldo</th><th></th>','No hay cuentas pendientes. ¡Todo al corriente!')}`}
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
      const payColors={Efectivo:'#8fb838',Tarjeta:'#5a7bc0',Transferencia:'#3a9b8f',Otro:'#7d8f82',Pendiente:'#d9883b'};
      const payMap={};sales.forEach(s=>{const entries=getSalePaymentEntries(s);entries.forEach(e=>{const k=e.method||'Efectivo';const cur=payMap[k]||{val:0,count:0};cur.val=round2(cur.val+e.amount);cur.count+=1;payMap[k]=cur});const pend=pending(s);if(pend>0){const cur=payMap.Pendiente||{val:0,count:0};cur.val=round2(cur.val+pend);cur.count+=1;payMap.Pendiente=cur}});
      const payRows=Object.entries(payMap).sort((a,b)=>b[1].val-a[1].val);
      const invCost=state.products.reduce((a,p)=>a+(Number(p.cost)||0)*Math.max(0,Number(p.stock)||0),0);
      const invRetail=state.products.reduce((a,p)=>a+(Number(p.price)||0)*Math.max(0,Number(p.stock)||0),0);
      const invUnits=state.products.reduce((a,p)=>a+Math.max(0,Number(p.stock)||0),0);
      const periodOpts=[['7','7 días'],['30','30 días'],['90','90 días'],['all','Todo']];
      const periodChips=`<div class="sale-filter-chips" role="group" aria-label="Periodo de reportes">${periodOpts.map(([val,label])=>`<button type="button" class="sale-filter-chip ${period===val?'active':''}" data-report-period="${val}">${label}</button>`).join('')}</div>`;
      return `${head('Reportes','Resumen claro de tus ventas, gastos y pagos.',`<button class="btn btn-light" data-action="cash-close">Corte de caja</button><button class="btn btn-light" data-action="export">${icon('export',15)} Exportar datos</button>`)}${periodChips}<div class="report-kpis"><section class="report-hero"><div class="report-hero-top"><span class="report-hero-label">Balance · ${period==='all'?'Historial completo':'Últimos '+period+' días'}</span>${sale>0?`<span class="report-hero-badge ${balance<0?'neg':''}">${balance>=0?'+':''}${marginPct}% margen</span>`:''}</div><div class="report-hero-val">${money(balance)}</div><div class="report-hero-pills"><button type="button" class="report-hero-pill report-pill-btn" data-page="ventas">Ventas <strong>${money(sale)}</strong> (${sales.length}) →</button><button type="button" class="report-hero-pill report-pill-btn" data-page="gastos">Gastos <strong>${money(exp)}</strong> (${expenses.length}) →</button>${collected<sale?`<span class="report-hero-pill">Cobrado <strong>${money(collected)}</strong></span>`:''}</div></section><div class="card report-mini"><div class="stat-label">Ticket promedio</div><div class="stat-val">${money(avgTicket)}</div><div class="stat-foot">${unitsSold} unidad(es) vendidas</div></div>${pendingCount?`<button type="button" class="card report-mini report-mini-btn" data-page="deudas"><div class="stat-label">Por cobrar</div><div class="stat-val" style="color:var(--orange-dark)">${money(totalPending)}</div><div class="stat-foot">${pendingCount} nota(s) pendiente(s) →</div></button>`:`<div class="card report-mini"><div class="stat-label">Por cobrar</div><div class="stat-val">${money(0)}</div><div class="stat-foot">Sin saldos pendientes</div></div>`}</div><div class="grid report-grid"><section class="card panel"><div class="panel-head"><div><h2 class="panel-title">Ventas y gastos</h2><p class="panel-note">${period==='all'?'Historial completo':'Últimos '+period+' días'}</p></div><div class="chart-legend"><span><i class="chart-dot" style="background:#cde95d"></i>Ventas</span><span><i class="chart-dot" style="background:#edc99e"></i>Gastos</span></div></div>${sales.length||expenses.length?`<div class="chart-wrap"><canvas id="main-chart"></canvas></div>`:`<div class="empty">Sin movimientos en este periodo.</div>`}</section><section class="card panel"><div class="panel-head"><div><h2 class="panel-title">Cobros por método</h2><p class="panel-note">Distribución de ventas del periodo</p></div></div>${payRows.length?`<div class="pay-stack">${payRows.map(([k,v])=>`<div class="pay-seg" style="width:${Math.max(4,v.val/(sale||1)*100)}%;background:${payColors[k]||'#95a398'}" title="${esc(k)}: ${money(v.val)}"></div>`).join('')}</div><div class="pay-list">${payRows.map(([k,v])=>`<div class="pay-row"><div class="pay-row-left"><i class="chart-dot" style="background:${payColors[k]||'#95a398'}"></i><span class="pay-row-name">${esc(k)}</span><span class="pay-row-sub">${v.count} nota(s) · ${sale>0?Math.round(v.val/sale*100):0}%</span></div><span class="pay-row-val">${money(v.val)}</span></div>`).join('')}</div>`:`<div class="empty">Todavía no hay ventas en este periodo.</div>`}</section><section class="card panel"><div class="panel-head"><div><h2 class="panel-title">Productos más vendidos</h2><p class="panel-note">Por importe vendido en el periodo</p></div></div>${top.length?`<div class="report-rank">${top.map(([name,info])=>`<div class="report-rank-item"><div class="report-rank-top"><span class="report-rank-name">${esc(name)}<span class="report-rank-sub">${info.qty} ud(s)</span></span><strong class="report-rank-val">${money(info.val)}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4,info.val/(top[0][1].val||1)*100)}%"></div></div></div>`).join('')}</div>`:`<div class="empty">Todavía no hay ventas para comparar.</div>`}</section><section class="card panel"><div class="panel-head"><div><h2 class="panel-title">Gastos por categoría</h2><p class="panel-note">Distribución de salidas</p></div></div>${cat.length?`<div class="report-rank">${cat.map(([name,val])=>`<div class="report-rank-item"><div class="report-rank-top"><span class="report-rank-name">${esc(name)}<span class="report-rank-sub">${exp>0?Math.round(val/exp*100):0}%</span></span><strong class="report-rank-val">${money(val)}</strong></div><div class="bar-track"><div class="bar-fill expense" style="width:${Math.max(4,val/(cat[0][1]||1)*100)}%"></div></div></div>`).join('')}</div>`:`<div class="empty">Aún no hay gastos en este periodo.</div>`}</section><section class="card panel" style="grid-column:1/-1"><div class="panel-head"><div><h2 class="panel-title">Valor del inventario</h2><p class="panel-note">${state.products.length} producto(s) · ${invUnits} unidad(es) en existencia</p></div><button type="button" class="text-btn" data-page="inventario">Ver stock ${icon('chevron',13)}</button></div><div class="report-inv-grid"><div class="report-inv-box"><span>Costo en stock</span><strong>${money(invCost)}</strong></div><div class="report-inv-box"><span>Valor a precio de venta</span><strong>${money(invRetail)}</strong></div><div class="report-inv-box"><span>Ganancia potencial</span><strong style="color:#455f27">${money(invRetail-invCost)}</strong></div></div></section></div>`;
    }
    function catalogPage(){
      const owner=isOwnerRole(),link=isCloudActive()?catalogUrlFor():'';
      const list=state.products.filter(p=>(p.name+' '+p.category+' '+p.price+' '+p.stock+' '+p.min).toLowerCase().includes(search.toLowerCase()));
      const notice=link
        ?`<div class="notice catalog-link-box"><div><strong>Enlace público para compradores</strong><span>Tus clientes ven solo productos disponibles, fotos y precios (sin costos ni gastos).</span><code class="catalog-url">${esc(link)}</code></div><div class="catalog-link-btns"><button type="button" class="btn btn-primary btn-sm" data-copy-link>Copiar link</button><button type="button" class="btn btn-light btn-sm" data-preview-public>Vista cliente</button></div></div>`
        :`<div class="notice">Conecta tu cuenta en la nube para generar un enlace público en vivo para tus compradores.</div>`;
      return `${head('Catálogo','Vista lista para compartir con tus compradores.',`<button class="btn btn-light" data-action="copy-catalog">${link?'Enviar link / lista':'Compartir catálogo'}</button>${owner?`<button class="btn btn-lime" data-open="product">${icon('plus',15)} Agregar producto</button>`:''}`)}${notice}${toolbar('Buscar en el catálogo…')}${list.length?`<div class="grid catalog-grid">${list.map(p=>`<article class="card catalog-card"><button type="button" class="catalog-art photo-zoom-trigger" data-zoom-product="${esc(p.id)}" title="Ver imagen grande" aria-label="Agrandar imagen de ${esc(p.name)}">${productArt(p)}</button><div class="catalog-body"><div class="catalog-name">${esc(p.name)}</div><div class="catalog-meta"><span>${esc(p.category||'Producto')}</span><span>${p.stock>0?'Disponible':'Agotado'}</span></div><div class="catalog-price">${money(p.price)}</div></div></article>`).join('')}</div>`:`<div class="card empty">No hay productos en el catálogo.</div>`}`;
    }
    function teamPage(){
      if(!cloud.user){
        return `${head('Equipo y Nube','Conecta una cuenta para sincronizar varios celulares, invitar dueños o vendedores y publicar tu catálogo.')}<section class="card panel team-empty-card"><h2 class="panel-title">Aún estás en modo local</h2><p class="panel-note" style="margin:8px 0 16px">Inicia sesión o crea tu cuenta gratis en Firebase para respaldar tus datos en la nube y compartir el inventario en vivo entre teléfonos.</p><div class="head-actions"><button class="btn btn-primary" data-action="auth">Iniciar sesión / Crear cuenta</button></div></section>`;
      }
      if(!cloud.storeId){
        return `${head('Equipo y Nube','Configura o únete a un negocio en la nube.')}<section class="card panel"><h2 class="panel-title">Cuenta lista: ${esc(cloud.user.email)}</h2><p class="panel-note" style="margin:8px 0 16px">Crea tu negocio como dueño (puedes subir tus productos locales) o únete a uno existente con un código.</p><button class="btn btn-primary" data-action="onboarding">Configurar negocio</button></section>`;
      }
      const link=catalogUrlFor();
      const activeInvites=cloud.invites.filter(inv=>inv.active&&!inv.usedBy);
      const memberRows=cloud.members.map(m=>{
        const isSelf=m.uid===cloud.user.uid;
        return `<div class="team-row"><div class="team-user"><div class="user-pill">${esc((m.name||m.email||'U').slice(0,1).toUpperCase())}</div><div><div class="table-main">${esc(m.name||'Sin nombre')}${isSelf?' (Tú)':''}</div><div class="table-sub">${esc(m.email||'')}</div></div></div><div class="team-controls"><span class="role-pill ${m.role}">${m.role==='owner'?'Dueño':'Vendedor'}</span>${!isSelf?`<button type="button" class="btn btn-light btn-sm" data-member-role="${esc(m.uid)}" data-next-role="${m.role==='owner'?'seller':'owner'}">${m.role==='owner'?'Hacer vendedor':'Hacer dueño'}</button><button type="button" class="text-btn delete-action" data-member-remove="${esc(m.uid)}">Quitar</button>`:''}</div></div>`;
      }).join('');
      const inviteRows=activeInvites.length?activeInvites.map(inv=>`<div class="team-row"><div><div class="table-main"><code class="invite-code-pill">${esc(inv.code)}</code> <span class="role-pill ${inv.role}">${inv.role==='owner'?'Dueño':'Vendedor'}</span></div><div class="table-sub">Un solo uso · Comparte este código con quien se unirá</div></div><div class="team-controls"><button type="button" class="btn btn-light btn-sm" data-copy-invite="${esc(inv.code)}">Copiar</button><button type="button" class="text-btn delete-action" data-revoke-invite="${esc(inv.code)}">Revocar</button></div></div>`).join(''):`<div class="empty" style="padding:20px">No hay códigos pendientes. Genera uno arriba cuando invites a otro dueño o vendedor.</div>`;
      return `${head('Equipo y Nube',`${esc(state.settings.business)} · Sincronización activa`,`<button type="button" class="btn btn-lime" data-preview-seller>Probar vista vendedor</button><button class="btn btn-light" data-action="account">Mi cuenta</button>`)}${`<section class="card panel" style="margin-bottom:16px"><div class="panel-head"><div><h2 class="panel-title">Enlace para compradores</h2><p class="panel-note">Compártelo para que tus clientes vean el catálogo disponible sin iniciar sesión.</p></div></div><div class="catalog-link-box" style="margin:0"><code class="catalog-url">${esc(link)}</code><div class="catalog-link-btns"><button type="button" class="btn btn-primary btn-sm" data-copy-link>Copiar link</button><button type="button" class="btn btn-light btn-sm" data-preview-public>Abrir vista cliente</button></div></div></section><section class="card panel" style="margin-bottom:16px"><div class="panel-head"><div><h2 class="panel-title">Invitar dueño o vendedor</h2><p class="panel-note">El código define automáticamente el rol cuando la otra persona se registre o entre.</p></div></div><div class="invite-gen-row"><button type="button" class="btn btn-lime" data-gen-invite="seller">＋ Código de Vendedor</button><button type="button" class="btn btn-light" data-gen-invite="owner">＋ Código de Dueño (socio)</button></div><div class="team-list">${inviteRows}</div></section><section class="card panel"><div class="panel-head"><div><h2 class="panel-title">Miembros del negocio (${cloud.members.length})</h2><p class="panel-note">Si eres tú mismo en 2 celulares, basta iniciar sesión con tu misma cuenta (${esc(cloud.user.email)}).</p></div></div><div class="team-list">${memberRows}</div></section>`}`;
    }
    function closePhotoZoom(){const el=document.getElementById('photo-zoom-out');if(el){el.remove();return true}return false}
    function openPhotoZoom({photo,emoji,title,subtitle,priceText,productId}){
      closePhotoZoom();
      const wrap=document.createElement('div');
      wrap.className='modal-backdrop zoom-backdrop';wrap.id='photo-zoom-out';
      wrap.innerHTML=`<section class="modal zoom-modal" role="dialog" aria-modal="true" aria-label="Vista ampliada de imagen"><div class="modal-head" style="margin-bottom:12px"><div><h2 class="modal-title">${esc(title||'Imagen del producto')}</h2>${subtitle?`<p class="modal-desc">${esc(subtitle)}</p>`:''}</div><button type="button" class="modal-close" data-zoom-close aria-label="Cerrar">×</button></div><div class="zoom-stage">${productArt({photo,emoji})}</div>${priceText?`<div class="zoom-meta"><span>Precio de venta</span><strong>${esc(priceText)}</strong></div>`:''}<div class="modal-actions" style="margin-top:14px">${productId&&!modal&&isOwnerRole()?`<button type="button" class="btn btn-light" data-zoom-edit="${esc(productId)}">Editar producto</button>`:''}<button type="button" class="btn btn-primary" data-zoom-close>Cerrar</button></div></section>`;
      wrap.addEventListener('click',e=>{
        if(e.target===wrap||e.target.closest('[data-zoom-close]')){closePhotoZoom();return}
        const editBtn=e.target.closest('[data-zoom-edit]');
        if(editBtn){const id=editBtn.dataset.zoomEdit;closePhotoZoom();openModal('product',id)}
      });
      document.body.appendChild(wrap);
    }
    function bindPage(){
      const searchInput=document.getElementById('list-search');
      if(searchInput){searchInput.addEventListener('input',e=>{const pos=e.target.selectionStart;search=e.target.value;render();const fresh=document.getElementById('list-search');fresh?.focus();fresh?.setSelectionRange(pos,pos)})}
      const p=document.getElementById('period-select');if(p)p.addEventListener('change',e=>{period=e.target.value;render()});
      document.querySelectorAll('[data-report-period]').forEach(btn=>btn.addEventListener('click',()=>{period=btn.dataset.reportPeriod;render()}));
      document.querySelectorAll('[data-sale-filter]').forEach(btn=>btn.addEventListener('click',()=>{saleFilter=btn.dataset.saleFilter;render()}));
      document.querySelectorAll('[data-sale-owner-filter]').forEach(btn=>btn.addEventListener('click',()=>{saleOwnerFilter=btn.dataset.saleOwnerFilter;render()}));
      document.querySelectorAll('[data-stock-filter]').forEach(btn=>btn.addEventListener('click',()=>{stockFilter=btn.dataset.stockFilter;render()}));
      document.querySelectorAll('[data-inv-cat]').forEach(btn=>btn.addEventListener('click',()=>{invCategory=btn.dataset.invCat;render()}));
      document.querySelectorAll('[data-inv-size]').forEach(btn=>btn.addEventListener('click',()=>{invPhotoSize=btn.dataset.invSize;try{localStorage.setItem('notas-inv-photo-size',invPhotoSize)}catch{}render()}));
      document.querySelectorAll('[data-zoom-product]').forEach(btn=>btn.addEventListener('click',()=>{const prod=getProduct(btn.dataset.zoomProduct);if(!prod)return;openPhotoZoom({photo:prod.photo,emoji:prod.emoji,title:prod.name,subtitle:`${prod.category||'Sin categoría'} · Stock: ${Number(prod.stock)||0}`,priceText:money(prod.price),productId:prod.id})}));
      document.querySelectorAll('[data-copy-link]').forEach(btn=>btn.addEventListener('click',()=>{const link=catalogUrlFor();if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link).then(()=>toast('Enlace del catálogo copiado')).catch(()=>toast('No se pudo copiar el enlace',true));else toast(link)}));
      document.querySelectorAll('[data-preview-public]').forEach(btn=>btn.addEventListener('click',()=>{if(!cloud.storeId)return;cloud.publicViaLink=false;cloud.publicCategory='Todas';cloud.publicCart={};subscribePublicCatalog(cloud.storeId)}));
      document.querySelectorAll('[data-preview-seller]').forEach(btn=>btn.addEventListener('click',()=>{if(!isRealOwner())return;cloud.previewSeller=true;modal=null;if(['gastos','proveedores','reportes','equipo'].includes(page))page='inicio';render();toast('Vista previa: así ve Notas tu vendedor')}));
      document.querySelectorAll('[data-gen-invite]').forEach(btn=>btn.addEventListener('click',()=>createInviteCode(btn.dataset.genInvite).catch(err=>toast(err.message||'No se pudo crear el código',true))));
      document.querySelectorAll('[data-copy-invite]').forEach(btn=>btn.addEventListener('click',()=>{const code=btn.dataset.copyInvite;if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code).then(()=>toast(`Código ${code} copiado`));else toast(code)}));
      document.querySelectorAll('[data-revoke-invite]').forEach(btn=>btn.addEventListener('click',()=>revokeInviteCode(btn.dataset.revokeInvite).catch(err=>toast(err.message||'Error al revocar',true))));
      document.querySelectorAll('[data-member-role]').forEach(btn=>btn.addEventListener('click',()=>setMemberRole(btn.dataset.memberRole,btn.dataset.nextRole).catch(err=>toast(err.message||'No se pudo cambiar rol',true))));
      document.querySelectorAll('[data-member-remove]').forEach(btn=>btn.addEventListener('click',()=>removeMember(btn.dataset.memberRemove).catch(err=>toast(err.message||'No se pudo quitar miembro',true))));
    }
    function drawCharts(){requestAnimationFrame(()=>{const canvas=document.getElementById('main-chart');if(!canvas)return;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;const ratio=window.devicePixelRatio||1;canvas.width=rect.width*ratio;canvas.height=rect.height*ratio;const c=canvas.getContext('2d');c.scale(ratio,ratio);const w=rect.width,h=rect.height;const n=period==='7'?7:period==='30'?6:period==='90'?6:8;const now=new Date();now.setHours(0,0,0,0);const earliest=[...state.sales.map(s=>s.date),...state.expenses.map(e=>e.date)].sort()[0];let range=period==='7'?7:period==='30'?30:period==='90'?90:360;if(period==='all'&&earliest){const start=new Date(earliest+'T00:00:00');range=Math.min(360,Math.max(30,Math.ceil((now-start)/86400000)+1))}const start=new Date(now);start.setDate(start.getDate()-range+1);const labels=Array.from({length:n},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+Math.floor(i*range/n));return new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short'}).format(d)});const sums=Array.from({length:n},()=>[0,0]);const addToBuckets=(items,slot)=>items.forEach(item=>{const d=new Date(item.date+'T00:00:00');const day=Math.floor((d-start)/86400000);if(day>=0&&day<range){const bucket=Math.min(n-1,Math.floor(day*n/range));sums[bucket][slot]+=Number(item.total??item.amount)||0}});addToBuckets(state.sales,0);addToBuckets(state.expenses,1);const max=Math.max(1,...sums.flat())*1.15;const fmtAxis=(v)=>v<=0?'0':v>=1000?`$${(v/1000).toFixed(v>=10000?0:1).replace(/\.0$/,'')}k`:money(v).replace(/\.00$/,'');c.font='10px system-ui';const yLabels=[0,1,2,3].map(i=>i===3?'0':fmtAxis(max*(1-i/3)));const leftPad=Math.max(36,Math.ceil(Math.max(...yLabels.map(t=>c.measureText(t).width)))+10);const pad={l:leftPad,r:8,t:10,b:26},iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;for(let i=0;i<4;i++){const y=pad.t+ih*i/3;c.strokeStyle=theme==='dark'?(i===3?'#313e35':'#232d26'):(i===3?'#dfe4dd':'#eef1ec');c.setLineDash(i===3?[]:[3,3]);c.lineWidth=1;c.beginPath();c.moveTo(pad.l,y);c.lineTo(w-pad.r,y);c.stroke();c.fillStyle=theme==='dark'?'#9ba89f':'#8c978e';c.textAlign='right';c.fillText(yLabels[i],pad.l-6,y+3)}c.setLineDash([]);const gap=iw/n,bw=Math.max(7,Math.min(18,gap*.27));const drawBar=(x,y,bw,bh)=>{if(bh<=0)return;const r=Math.min(4,bh/2,bw/2);if(c.roundRect){c.beginPath();c.roundRect(x,y,bw,bh,[r,r,0,0]);c.fill()}else{c.fillRect(x,y,bw,bh)}};sums.forEach((pair,i)=>{const cx=pad.l+gap*i+gap/2;const hs=pair[0]>0?Math.max(3,pair[0]/max*ih):0,he=pair[1]>0?Math.max(3,pair[1]/max*ih):0;c.fillStyle='#cde95d';drawBar(cx-bw-1.5,pad.t+ih-hs,bw,hs);c.fillStyle='#edc99e';drawBar(cx+1.5,pad.t+ih-he,bw,he);c.textAlign='center';c.fillStyle=theme==='dark'?'#9ba89f':'#849087';c.fillText(labels[i],cx,h-7)});c.textAlign='left'})}
    function showMoreMenu(){modal={type:'more'};render()}
    function openCalcFor(targetId=''){
      if(targetId){
        if(modal?.type==='sale')captureSaleMeta();
        if(modal?.type==='cash-close'){
          const fl=document.getElementById('cc-float'),ct=document.getElementById('cc-counted'),nt=document.getElementById('notes');
          if(fl)cashCloseDraft.openingFloat=fl.value;
          if(ct)cashCloseDraft.countedCash=ct.value;
          if(nt)cashCloseDraft.notes=nt.value;
        }
        const curEl=document.getElementById(targetId);
        const curVal=curEl?String(curEl.value||'').trim():'';
        calcReturn={modal:{...modal},targetId,collectAmount:document.getElementById('amount')?.value,collectMethod:document.getElementById('payment')?.value,collectDate:document.getElementById('date')?.value};
        calcState={expr:curVal&&Number(curVal)>0?curVal:'0',result:curVal&&Number(curVal)>0?curVal:'0'};
      }else{
        calcReturn=null;
        calcState={expr:'0',result:'0'};
      }
      modal={type:'calc'};render();
    }
    function action(type){
      if(type==='calculator'){openCalcFor('');return}
      if(type==='cash-close'){
        const sum=computeShiftSummary(cashCloseDraft.mode||'since-last');
        cashCloseDraft={mode:sum.mode,openingFloat:String(sum.openingFloat),countedCash:'',notes:''};
        modal={type:'cash-close'};render();return;
      }
      if(type==='auth'){modal={type:'auth'};render();return}
      if(type==='account'){modal={type:'account'};render();return}
      if(type==='onboarding'){cloud.onboardingForced=false;modal={type:'onboarding'};render();return}
      if(type==='settings'){if(!isOwnerRole())return action('account');modal={type:'settings'};render();return}
      if(type==='export'){exportData();return}
      if(type==='copy-catalog'){copyCatalog();return}
      if(type.startsWith('collect:')){openModal('collect',type.split(':')[1]);return}
      if(type.startsWith('receipt:')){showReceipt(type.split(':')[1]);return}
      if(type.startsWith('adjust:')){openModal('adjust',type.split(':')[1]);return}
    }
    function openModal(type,id=null){
      if(type==='sale'&&id){
        const targetSale=state.sales.find(x=>x.id===id);
        if(!targetSale)return toast('No encontré la nota para editar',true);
        if(!canModifySale(targetSale))return toast('Solo el dueño o quien creó esta nota puede editarla',true);
      }else if(isSellerRole()&&['expense','product','supplier'].includes(type)){
        return toast('Solo el dueño puede hacer esta acción',true);
      }
      if(type==='sale'){
        const previous=id?state.sales.find(s=>s.id===id):null;
        if(id&&!previous)return toast('No encontré la nota para editar',true);
        saleDraft=previous?getSaleItems(previous).map(item=>({productId:item.productId,product:item.product,qty:item.qty,unitPrice:item.unitPrice})):[];
        saleStep=id?'review':'pick';saleSearch='';saleCategory='Todas';returnToSale=null;
        const defaultSeller=isCloudActive()?(cloud.member?.name||cloud.user?.displayName||''):(state.settings.seller||'');
        const prevCashEntry=Array.isArray(previous?.payments)?previous.payments.find(p=>p.method==='Efectivo'):null;
        const prevOtherEntry=Array.isArray(previous?.payments)?previous.payments.find(p=>p.method&&p.method!=='Efectivo'):null;
        saleMeta={customer:previous?.customer||'',date:previous?.date||today(),seller:previous?.seller??defaultSeller,payment:previous?.payment||'Efectivo',paid:previous?.paid??0,discountType:'$',discountValue:previous?.discount?String(previous.discount):'',notes:previous?.notes||'',showExtras:Boolean(previous?.discount||previous?.notes),cashReceived:previous?.cashReceived?String(previous.cashReceived):'',splitCash:prevCashEntry?String(prevCashEntry.amount):'',splitOther:prevOtherEntry?String(prevOtherEntry.amount):'',splitOtherMethod:prevOtherEntry?.method||'Tarjeta'};
      }
      if(type==='collect'){collectDraft={cashReceived:''}}
      if(type==='product'){
        returnToSale=modal?.type==='sale'?{...modal,step:saleStep}:null;
        productPhotoDraft=null;productFormDraft=null;photoBusy=false;
      }
      cloud.busy=false;
      modal={type,id};render()
    }
    function stopCameraStream(){if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}}
    function closeModal(){
      if(modal?.type==='onboarding'&&cloud.onboardingForced&&cloud.user&&!cloud.storeId){
        toast('Crea tu negocio, únete con código o cierra sesión',true);return;
      }
      stopCameraStream();clearModalDraft();productFormDraft=null;
      if(modal?.type==='calc'&&calcReturn){const back=calcReturn;calcReturn=null;modal=back.modal;render();return}
      if(modal?.type==='product'&&returnToSale){saleStep=returnToSale.step;modal={type:'sale',id:returnToSale.id};returnToSale=null;productPhotoDraft=null;render();return}
      modal=null;saleDraft=[];returnToSale=null;productPhotoDraft=null;calcReturn=null;cloud.busy=false;render()
    }
    function toast(message,error=false){const old=document.querySelector('.toast');old?.remove();const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=message;document.body.appendChild(el);clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.remove(),2600)}
    const field=(label,name,type='text',value='',opts={})=>`<div class="field ${opts.full?'full':''}"><label for="${name}">${label}</label>${opts.options?`<select id="${name}" name="${name}">${opts.options.map(o=>`<option ${String(value)===String(o.value)?'selected':''} value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select>`:type==='textarea'?`<textarea id="${name}" name="${name}" placeholder="${opts.placeholder||''}">${esc(value)}</textarea>`:`<input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${opts.min!=null?`min="${opts.min}"`:''} ${opts.step?`step="${opts.step}"`:''} ${opts.list?`list="${opts.list}"`:''} ${opts.placeholder?`placeholder="${opts.placeholder}"`:''} ${opts.required?'required':''} />`}</div>`;
    function modalFrame(title,desc,content,submit='Guardar'){return `<div class="modal-backdrop" id="modal-out"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2 class="modal-title">${title}</h2><p class="modal-desc">${desc}</p></div><button class="modal-close" data-action="close" aria-label="Cerrar">×</button></div>${content}<div class="modal-actions"><button class="btn btn-light" data-action="close">Cancelar</button><button class="btn btn-primary" id="modal-submit">${submit}</button></div></section></div>`}
    function saleAvailable(productId){
      const previous=modal?.type==='sale'&&modal.id?state.sales.find(s=>s.id===modal.id):null;
      const oldQty=previous?getSaleItems(previous).filter(item=>item.productId===productId).reduce((sum,item)=>sum+item.qty,0):0;
      const product=getProduct(productId);
      const cur=product?Number(product.stock)||0:0;
      return (allowsNegativeStock()?cur:Math.max(0,cur))+oldQty
    }
    const selectedQty=(productId)=>saleDraft.filter(item=>item.productId===productId).reduce((sum,item)=>sum+(Number(item.qty)||0),0);
    function renderSaleDraft(){const list=document.getElementById('sale-draft-list');if(!list)return;const negOk=allowsNegativeStock();list.innerHTML=saleDraft.length?saleDraft.map((item,index)=>`<div class="sale-draft-item" data-draft-row="${index}"><div class="sale-draft-top"><div class="sale-review-product"><span class="sale-photo">${productArt(getProduct(item.productId))}</span><div><strong>${esc(item.product)}</strong><small>${getProduct(item.productId)?(saleAvailable(item.productId)>0?`Disponibles para esta nota: ${saleAvailable(item.productId)}`:negOk?`Stock actual: ${saleAvailable(item.productId)} · se permite negativo`:'Sin existencias disponibles'):'Producto fuera del inventario'}</small></div></div><button type="button" class="text-btn delete-action" data-remove-draft="${index}">Quitar</button></div><div class="sale-review-fields"><div class="sale-edit-field"><label for="draft-qty-${index}">Cantidad</label><div class="review-qty-control"><button type="button" data-review-adjust="${index}" data-delta="-1" aria-label="Restar una unidad de ${esc(item.product)}" ${Number(item.qty)<=1?'disabled':''}>−</button><input id="draft-qty-${index}" type="text" inputmode="numeric" autocomplete="off" value="${esc(item.qty)}" data-draft-qty="${index}" aria-label="Cantidad de ${esc(item.product)}" /><button type="button" data-review-adjust="${index}" data-delta="1" aria-label="Sumar una unidad de ${esc(item.product)}" ${!negOk&&Number(item.qty)>=saleAvailable(item.productId)?'disabled':''}>+</button></div></div><label>Precio unitario<input type="number" inputmode="decimal" min="0" step="0.01" value="${item.unitPrice}" data-draft-price="${index}" /></label></div><div class="sale-review-line">Subtotal: <span data-line-total="${index}">${money(item.qty*item.unitPrice)}</span></div></div>`).join(''):'<div class="sale-draft-empty">Aún no hay productos. Toca “＋ Agregar productos”.</div>';const sub=document.getElementById('modal-submit');if(sub&&modal?.type==='sale')sub.disabled=!saleDraft.length;updateTotal()}
    function renderSaleProducts(){const q=saleSearch.trim().toLocaleLowerCase('es-MX'),negOk=allowsNegativeStock();const matches=state.products.filter(p=>(saleCategory==='Todas'||p.category===saleCategory)&&(p.name+' '+(p.category||'')).toLocaleLowerCase('es-MX').includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'es-MX'));if(!matches.length)return '<div class="empty">No encontré productos. Prueba otra búsqueda o agrega uno nuevo.</div>';return matches.map(p=>{const qty=selectedQty(p.id),avail=saleAvailable(p.id),remaining=avail-qty,isLow=avail>0&&avail<=Number(p.min||0),pillClass=avail<1?(negOk?'low':'out'):isLow?'low':'',pillText=avail>0?`${avail} disponibles`:negOk?(avail<0?`${avail} en stock · negativo`:'Sin stock · permite negativo'):'Agotado';return `<div class="sale-product-card ${qty>0?'selected':''} ${!negOk&&avail<1?'sold-out':''}" data-sale-card="${esc(p.id)}"><button type="button" class="sale-photo" data-sale-tap="${esc(p.id)}" aria-label="Agregar 1 unidad de ${esc(p.name)}">${productArt(p)}</button><div class="sale-product-main"><button type="button" class="sale-card-tap" data-sale-tap="${esc(p.id)}" aria-label="Agregar 1 unidad de ${esc(p.name)}"><div class="sale-product-top"><div class="sale-product-name">${esc(p.name)}</div>${avail<=Number(p.min||0)?`<span class="sale-stock-warn" aria-hidden="true">!</span>`:''}</div><div class="sale-stock-pill ${pillClass}">${pillText}</div></button><div class="sale-card-foot"><div class="sale-product-price">${money(p.price)}</div><div class="qty-stepper"><button type="button" data-sale-adjust="-1" data-id="${esc(p.id)}" aria-label="Quitar una unidad de ${esc(p.name)}" ${qty<1?'disabled':''}>−</button><strong>${qty}</strong><button type="button" data-sale-adjust="1" data-id="${esc(p.id)}" aria-label="Agregar una unidad de ${esc(p.name)}" ${!negOk&&remaining<1?'disabled':''}>+</button></div></div></div></div>`}).join('')}
    const saleSubtotal=()=>round2(saleDraft.reduce((sum,item)=>sum+Math.max(0,Number(item.qty)||0)*Math.max(0,Number(item.unitPrice)||0),0));
    function saleDiscountAmount(sub=saleSubtotal()){
      const raw=Math.max(0,Number(saleMeta.discountValue)||0);
      if(!raw||sub<=0)return 0;
      const amt=saleMeta.discountType==='%'?round2(sub*Math.min(100,raw)/100):round2(raw);
      return Math.min(sub,amt);
    }
    const saleTotal=()=>round2(Math.max(0,saleSubtotal()-saleDiscountAmount()));
    function smartCashBills(total){
      const t=Math.ceil(Math.max(0,Number(total)||0));
      if(t<=0)return [50,100,200,500];
      const denoms=[20,50,100,200,500,1000,2000];
      const picks=[];
      for(const step of [10,50,100,500]){const next=Math.ceil(t/step)*step;if(next>t&&!picks.includes(next))picks.push(next)}
      for(const d of denoms){if(d>t&&!picks.includes(d))picks.push(d)}
      return picks.sort((a,b)=>a-b).slice(0,4);
    }
    function captureSaleMeta(){for(const [id,key] of [['customer','customer'],['date','date'],['seller','seller'],['payment','payment'],['paid','paid'],['discount-value','discountValue'],['sale-notes','notes'],['cash-received','cashReceived'],['split-cash','splitCash'],['split-other','splitOther'],['split-other-method','splitOtherMethod']]){const input=document.getElementById(id);if(input)saleMeta[key]=input.value}}
    function renderModal(){
      if(modal.type==='more'){
        const bottomIds=isSellerRole()?['inicio','ventas','inventario','catalogo']:['inicio','ventas','inventario','reportes'];
        const moreItems=visibleNavItems().filter(x=>!bottomIds.includes(x[0]));
        return `<div class="modal-backdrop" id="modal-out"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2 class="modal-title">Más secciones</h2><p class="modal-desc">Abre una sección o herramienta rápida</p></div><button class="modal-close" data-action="close">×</button></div><div class="nav">${moreItems.map(x=>navButton(x[0],x[1],x[2])).join('')}<button class="nav-btn" data-action="cash-close"><span class="nav-icon">${icon('receipt')}</span><span>Corte de caja</span></button><button class="nav-btn" data-action="calculator"><span class="nav-icon">${icon('calc')}</span><span>Calculadora rápida</span></button>${cloud.previewSeller?`<button class="nav-btn" data-exit-seller-preview><span class="nav-icon">${icon('team')}</span><span>Volver a vista Dueño</span></button>`:isRealOwner()&&isCloudActive()?`<button class="nav-btn" data-preview-seller><span class="nav-icon">${icon('team')}</span><span>Probar vista vendedor</span></button>`:''}<button class="nav-btn" data-action="toggle-theme"><span class="nav-icon">${icon(theme==='dark'?'sun':'moon')}</span><span>${theme==='dark'?'Modo claro':'Modo oscuro'}</span></button><button class="nav-btn" data-action="${cloud.user?'account':'auth'}"><span class="nav-icon">${icon('cloud')}</span><span>${cloud.user?'Mi cuenta y rol':'Conectar nube'}</span></button>${isOwnerRole()?`<button class="nav-btn" data-action="settings"><span class="nav-icon">${icon('settings')}</span><span>Configuración</span></button>`:''}</div></section></div>`;
      }
      if(modal.type==='calc'){
        const keys=[['C','C','clr'],['⌫','DEL','op'],['%','%','op'],['÷','/','op'],['7','7',''],['8','8',''],['9','9',''],['×','*','op'],['4','4',''],['5','5',''],['6','6',''],['−','-','op'],['1','1',''],['2','2',''],['3','3',''],['+','+','op'],['00','00',''],['0','0',''],['.','.',''],['=','=','eq']];
        return `<div class="modal-backdrop" id="modal-out"><section class="modal calc-modal" role="dialog" aria-modal="true" aria-label="Calculadora rápida"><div class="modal-head"><div><h2 class="modal-title">Calculadora rápida</h2><p class="modal-desc">${calcReturn?'Calcula el monto y úsalo directo en tu nota':'Operaciones rápidas sin salir de Notas'}</p></div><button class="modal-close" data-action="close" aria-label="Cerrar">×</button></div><div class="calc-display"><div class="calc-expr" id="calc-expr">${esc(calcState.expr||'0')}</div><div class="calc-val" id="calc-val">${esc(calcState.result||'0')}</div></div><div class="calc-grid">${keys.map(([lbl,val,cls])=>`<button type="button" class="calc-key ${cls}" data-calc-key="${esc(val)}">${lbl}</button>`).join('')}</div><div class="calc-footer"><button type="button" class="btn btn-light btn-sm" data-action="close">${calcReturn?'Volver':'Cerrar'}</button>${calcReturn?`<button type="button" class="btn btn-lime btn-sm" data-calc-apply>Usar resultado</button>`:`<button type="button" class="btn btn-primary btn-sm" data-calc-copy>Copiar resultado</button>`}</div></section></div>`;
      }
      if(modal.type==='cash-close'){
        const floatVal=cashCloseDraft.openingFloat!==''?Math.max(0,Number(cashCloseDraft.openingFloat)||0):null;
        const sum=computeShiftSummary(cashCloseDraft.mode||'since-last',floatVal);
        const hasCounted=String(cashCloseDraft.countedCash??'').trim()!=='';
        const counted=hasCounted?Math.max(0,Number(cashCloseDraft.countedCash)||0):sum.expectedCash;
        const diff=round2(counted-sum.rawExpected);
        const diffCls=Math.abs(diff)<0.01?'ok':diff>0?'pos':'neg';
        const diffLabel=Math.abs(diff)<0.01?'Cuadra exacto':diff>0?`Sobrante +${money(diff)}`:`Falta ${money(Math.abs(diff))}`;
        const prevLabel=sum.mode==='since-last'&&sum.prevClosure?`Desde último corte (${fmtDate(sum.prevClosure.date)} · ${new Date(sum.prevClosure.closedAt).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})})`:'Movimientos de hoy';
        const history=(state.cashClosures||[]).filter(c=>!sum.sellerOnly||!cloud.user?.uid||c.closedByUid===cloud.user.uid).slice(0,8);
        return `<div class="modal-backdrop" id="modal-out"><section class="modal cash-close-modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2 class="modal-title">Corte de caja</h2><p class="modal-desc">${esc(prevLabel)}${sum.sellerOnly?' · solo tus cobros':''}</p></div><button class="modal-close" data-action="close" aria-label="Cerrar">×</button></div><div class="cc-period-pills" role="group" aria-label="Rango del corte"><button type="button" class="sale-filter-chip ${cashCloseDraft.mode==='since-last'?'active':''}" data-cc-mode="since-last">${sum.hasPrevClosure?'Desde último corte':'Turno actual (hoy)'}</button><button type="button" class="sale-filter-chip ${cashCloseDraft.mode==='today'?'active':''}" data-cc-mode="today">Todo el día de hoy</button></div><div class="cc-summary-grid"><div class="cc-stat"><span>Cobrado en Efectivo</span><strong id="cc-cash-sales">${money(sum.cashSales)}</strong></div><div class="cc-stat"><span>Tarjeta / Transferencia</span><strong>${money(round2(sum.cardSales+sum.transferSales+sum.otherSales))}</strong></div>${sum.sellerOnly?'':`<div class="cc-stat"><span>Gastos en efectivo</span><strong style="color:var(--orange-dark)">−${money(sum.expensesTotal)}</strong></div>`}<div class="cc-stat"><span>Notas del turno</span><strong>${sum.salesCount}${sum.pendingCreated>0?` (${money(sum.pendingCreated)} pend.)`:''}</strong></div><div class="cc-stat highlight"><span>Efectivo esperado en caja</span><strong id="cc-expected-val">${money(sum.expectedCash)}</strong></div></div><form id="modal-form" class="form-grid"><div class="field"><label for="cc-float">Fondo inicial en caja</label><input id="cc-float" name="openingFloat" type="number" min="0" step="0.01" value="${esc(cashCloseDraft.openingFloat!==''?cashCloseDraft.openingFloat:sum.openingFloat)}" /></div><div class="field"><label for="cc-counted">Efectivo contado físico</label><div class="input-with-calc"><input id="cc-counted" name="countedCash" type="number" min="0" step="0.01" value="${esc(cashCloseDraft.countedCash)}" placeholder="${esc(sum.expectedCash)}" /><button type="button" class="calc-inline-btn" data-open-calc-for="cc-counted" title="Abrir calculadora">${icon('calc',14)} Calc</button></div></div><div class="field full"><div class="cc-diff-banner ${diffCls}" id="cc-diff-banner"><span>Diferencia contra esperado</span><strong>${esc(diffLabel)}</strong></div></div>${field('Observaciones del turno (opcional)','notes','text',cashCloseDraft.notes||'',{full:true,placeholder:'Ej. Faltó cambio en monedas o retiro parcial'})}<div class="field full"><div class="modal-actions" style="margin-top:4px"><button type="button" class="btn btn-light" data-action="close">Cerrar</button><button type="submit" class="btn btn-primary" id="modal-submit">Guardar corte</button></div></div></form>${history.length?`<div class="setting-block"><div class="setting-label">Historial de cortes recientes</div><div class="cc-history-list">${history.map(c=>`<div class="cc-history-item"><div class="cc-history-main"><strong>${fmtDate(c.date)} · ${new Date(c.closedAt).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</strong><small>${esc(c.closedBy||'Equipo')} · Esperado ${money(c.expectedCash)} · Contado ${money(c.countedCash)}${c.notes?' · '+esc(c.notes):''}</small></div><div class="cc-history-right"><span class="badge ${Math.abs(Number(c.difference)||0)<0.01?'green':Number(c.difference)>0?'lime':'orange'}">${Math.abs(Number(c.difference)||0)<0.01?'Exacto':(Number(c.difference)>0?'+':'')+money(c.difference)}</span>${isOwnerRole()?` <button type="button" class="text-btn delete-action" data-cc-delete="${esc(c.id)}" aria-label="Eliminar corte">${icon('trash',13)}</button>`:''}</div></div>`).join('')}</div></div>`:''}</section></div>`;
      }
      if(modal.type==='auth'){
        const isReg=cloud.authMode==='register';
        return `<div class="modal-backdrop" id="modal-out"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2 class="modal-title">${isReg?'Crear cuenta en la nube':'Iniciar sesión'}</h2><p class="modal-desc">Sincroniza inventario, ventas y roles en tiempo real entre dispositivos.</p></div><button class="modal-close" data-action="close">×</button></div><div class="auth-tabs" role="tablist"><button type="button" class="auth-tab ${!isReg?'active':''}" data-auth-mode="login">Iniciar sesión</button><button type="button" class="auth-tab ${isReg?'active':''}" data-auth-mode="register">Crear cuenta</button></div><form id="auth-form" class="form-grid">${isReg?field('Tu nombre','auth-name','text','',{full:true,required:true,placeholder:'Ej. Iván o Nombre del vendedor'}):''}${field('Correo electrónico','auth-email','email','',{full:true,required:true,placeholder:'tu@correo.com'})}${field('Contraseña','auth-pass','password','',{full:true,required:true,placeholder:isReg?'Mínimo 6 caracteres':'Tu contraseña'})}${isReg?field('Código de invitación (opcional si te invitaron)','auth-invite','text','',{full:true,placeholder:'Ej. NT7K4P9M (déjalo vacío si eres dueño)'}):''}<div class="field full auth-error" id="auth-error" hidden></div><div class="field full"><div class="modal-actions" style="margin-top:4px"><button type="button" class="btn btn-light" data-action="close">Cancelar</button><button type="submit" class="btn btn-primary" id="auth-submit">${isReg?'Crear cuenta':'Entrar'}</button></div></div></form><div class="setting-block"><div class="setting-row"><div><div class="setting-label">¿Eres comprador?</div><div class="setting-hint">No necesitas iniciar sesión. Abre un catálogo con su código de tienda.</div></div></div><div class="invite-gen-row" style="margin-top:10px;margin-bottom:0"><input id="auth-catalog-code" placeholder="Código de tienda (ej. n123...)" aria-label="Código de tienda" /><button type="button" class="btn btn-light btn-sm" id="auth-open-catalog">Ver catálogo</button></div></div></section></div>`;
      }
      if(modal.type==='onboarding'){
        if(!cloud.user){modal={type:'auth'};return renderModal()}
        const isJoin=cloud.onboardMode==='join';
        const prodCount=state.products.length;
        return `<div class="modal-backdrop" id="modal-out"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2 class="modal-title">${isJoin?'Unirme a un negocio':'Crear mi negocio'}</h2><p class="modal-desc">Sesión: ${esc(cloud.user.email)}</p></div>${cloud.onboardingForced?'':`<button class="modal-close" data-action="close">×</button>`}</div><div class="auth-tabs" role="tablist"><button type="button" class="auth-tab ${!isJoin?'active':''}" data-ob-mode="create">Crear negocio (Dueño)</button><button type="button" class="auth-tab ${isJoin?'active':''}" data-ob-mode="join">Tengo un código</button></div><form id="onboarding-form" class="form-grid">${!isJoin?`${field('Nombre del negocio','ob-business','text',state.settings.business||'Mi negocio',{full:true,required:true,placeholder:'Ej. Abarrotes Lupita'})}${field('Tu nombre (Dueño)','ob-owner-name','text',cloud.user.displayName||state.settings.seller||'',{full:true,required:true,placeholder:'Cómo aparecerás en notas y equipo'})}<label class="field full ob-check"><input type="checkbox" id="ob-migrate" ${prodCount?'checked':''} /><span>Subir mis datos actuales de este dispositivo (${prodCount} producto(s), ventas y clientes)</span></label>`:`${field('Código de invitación','ob-code','text','',{full:true,required:true,placeholder:'Ej. NT7K4P9M'})}${field('Tu nombre','ob-member-name','text',cloud.user.displayName||'',{full:true,required:true,placeholder:'Cómo aparecerás al vender'})}<div class="field full"><div class="field-help">El código que te compartió el dueño define automáticamente si entras como Dueño (socio) o Vendedor.</div></div>`}<div class="field full auth-error" id="ob-error" hidden></div><div class="field full"><div class="modal-actions" style="margin-top:4px">${cloud.onboardingForced?`<button type="button" class="btn btn-light" id="ob-signout">Cerrar sesión</button>`:`<button type="button" class="btn btn-light" data-action="close">Cancelar</button>`}<button type="submit" class="btn btn-primary" id="ob-submit">${isJoin?'Unirme ahora':'Crear negocio'}</button></div></div></form></section></div>`;
      }
      if(modal.type==='account'){
        if(!cloud.user){modal={type:'auth'};return renderModal()}
        const storeIds=Array.isArray(cloud.profile?.storeIds)?cloud.profile.storeIds:[];
        const switchBlock=storeIds.length>1?`<div class="setting-block"><div class="setting-row"><div><div class="setting-label">Cambiar de tienda</div><div class="setting-hint">Selecciona otro negocio vinculado a tu cuenta.</div></div><select id="account-store-select">${storeIds.map(sid=>`<option value="${esc(sid)}" ${sid===cloud.storeId?'selected':''}>${esc(sid===cloud.storeId?(state.settings.business||sid):sid)}</option>`).join('')}</select></div></div>`:'';
        const previewBlock=isRealOwner()&&cloud.storeId?`<div class="setting-block"><div class="setting-row"><div><div class="setting-label">Probar vista de Vendedor</div><div class="setting-hint">Simula al instante lo que ve un empleado sin crear otra cuenta.</div></div>${cloud.previewSeller?`<button type="button" class="btn btn-primary btn-sm" data-exit-seller-preview>Volver a Dueño</button>`:`<button type="button" class="btn btn-lime btn-sm" data-preview-seller>Probar ahora</button>`}</div></div>`:'';
        return `<div class="modal-backdrop" id="modal-out"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2 class="modal-title">Mi cuenta</h2><p class="modal-desc">${esc(cloud.user.email)} · ${esc(cloudRoleLabel())}</p></div><button class="modal-close" data-action="close">×</button></div><div class="setting-block"><div class="setting-row"><div><div class="setting-label">${esc(state.settings.business||'Sin negocio activo')}</div><div class="setting-hint">Rol actual: <span class="role-pill ${cloud.previewSeller?'seller':esc(cloud.role||'')}">${esc(cloudRoleLabel())}</span></div></div><button type="button" class="btn btn-light btn-sm" data-action="onboarding">Crear o unirme</button></div></div>${previewBlock}${switchBlock}${cloud.storeId?`<div class="setting-block"><div class="setting-row"><div><div class="setting-label">Link de catálogo público</div><div class="setting-hint">Tus clientes ven productos disponibles sin iniciar sesión.</div></div><button type="button" class="btn btn-light btn-sm" data-copy-link>Copiar link</button></div></div>`:''}<div class="setting-block"><div class="setting-row"><div><div class="setting-label">Apariencia</div><div class="setting-hint">Tema actual: ${theme==='dark'?'Oscuro':'Claro'}</div></div><button type="button" class="btn btn-light btn-sm" data-action="toggle-theme">${icon(theme==='dark'?'sun':'moon',14)} ${theme==='dark'?'Usar modo claro':'Usar modo oscuro'}</button></div></div><div class="setting-block"><div class="setting-row"><div><div class="setting-label">Actualizaciones</div><div class="setting-hint">Versión instalada: v${esc(APP_LOCAL_VERSION.webVersion||APP_LOCAL_VERSION.versionName)} (${esc(APP_LOCAL_VERSION.platform||'web')})</div></div><button class="btn btn-light btn-sm" data-action="${updateInfo?'apply-update':'check-update'}">${updateInfo?'Instalar v'+esc(updateInfo.webVersion||updateInfo.versionName):'Buscar actualización'}</button></div></div><div class="modal-actions"><button type="button" class="btn btn-danger" id="account-signout">Cerrar sesión</button><button type="button" class="btn btn-primary" data-action="close">Cerrar</button></div></section></div>`;
      }
      if(modal.type==='settings'){
        if(!isOwnerRole()){modal={type:'account'};return renderModal()}
        return `<div class="modal-backdrop" id="modal-out"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2 class="modal-title">Configuración</h2><p class="modal-desc">Datos que aparecerán en los comprobantes.</p></div><button class="modal-close" data-action="close">×</button></div><div class="business-settings"><label>Nombre del negocio<input id="business-name" value="${esc(state.settings.business)}" placeholder="Mi negocio" /></label><label>Dirección o ubicación<input id="business-address" value="${esc(state.settings.address)}" placeholder="Colonia, ciudad" /></label><label>Teléfono<input id="business-phone" type="tel" value="${esc(state.settings.phone)}" placeholder="Número de contacto" /></label><label>Correo electrónico<input id="business-email" type="email" value="${esc(state.settings.email)}" placeholder="correo@negocio.com" /></label><label>Registro o identificador comercial<input id="business-registration" value="${esc(state.settings.registration)}" placeholder="Opcional" /></label><label>Vendedor predeterminado<input id="business-seller" value="${esc(state.settings.seller)}" placeholder="Nombre del vendedor" /></label></div><div class="setting-block"><div class="setting-row"><div><div class="setting-label">Apariencia</div><div class="setting-hint">Tema actual: ${theme==='dark'?'Oscuro':'Claro'}</div></div><button type="button" class="btn btn-light btn-sm" data-action="toggle-theme">${icon(theme==='dark'?'sun':'moon',14)} ${theme==='dark'?'Usar modo claro':'Usar modo oscuro'}</button></div></div><div class="setting-block"><div class="setting-row"><div><div class="setting-label">Moneda</div><div class="setting-hint">Se usa para mostrar importes.</div></div><select id="currency"><option value="MXN" ${state.settings.currency==='MXN'?'selected':''}>MXN · Peso mexicano</option><option value="USD" ${state.settings.currency==='USD'?'selected':''}>USD · Dólar estadounidense</option><option value="COP" ${state.settings.currency==='COP'?'selected':''}>COP · Peso colombiano</option><option value="EUR" ${state.settings.currency==='EUR'?'selected':''}>EUR · Euro</option></select></div></div><div class="setting-block"><div class="setting-row"><div><div class="setting-label">Fondo inicial de caja</div><div class="setting-hint">Base predeterminada sugerida al hacer corte de caja.</div></div><input type="number" id="cash-float" min="0" step="0.01" value="${esc(state.settings.cashFloat??0)}" style="max-width:130px;text-align:right" /></div></div><div class="setting-block"><div class="setting-row"><div><div class="setting-label">Permitir vender con stock negativo</div><div class="setting-hint">Vende aunque el producto esté en 0 o negativo para ajustar existencias cuando surtas.</div></div><input type="checkbox" id="allow-negative-stock" style="width:20px;height:20px;min-height:0;accent-color:#4b6a27" ${state.settings.allowNegativeStock!==false?'checked':''} /></div></div><div class="setting-block"><div class="setting-row"><div><div class="setting-label">Copia de seguridad</div><div class="setting-hint">Exporta o importa tus registros entre celular y PC.</div></div><div class="setting-actions"><button class="btn btn-light btn-sm" data-action="import">Importar</button><button class="btn btn-light btn-sm" data-action="export">${icon('export',14)} Exportar</button><input id="import-backup-file" type="file" accept=".json,application/json" hidden /></div></div></div><div class="setting-block"><div class="setting-row"><div><div class="setting-label">Actualizaciones</div><div class="setting-hint">Versión instalada: v${esc(APP_LOCAL_VERSION.webVersion||APP_LOCAL_VERSION.versionName)} (${esc(APP_LOCAL_VERSION.platform||'web')})</div></div><button class="btn btn-light btn-sm" data-action="${updateInfo?'apply-update':'check-update'}">${updateInfo?'Instalar v'+esc(updateInfo.webVersion||updateInfo.versionName):'Buscar actualización'}</button></div></div>${isCloudActive()?'':`<div class="setting-block"><div class="setting-row"><div><div class="setting-label">Empezar de nuevo</div><div class="setting-hint">Restaura datos de demostración en este dispositivo.</div></div><button class="btn btn-danger btn-sm" data-action="reset">Restablecer</button></div></div>`}<div class="modal-actions"><button class="btn btn-light" data-action="close">Cerrar</button><button class="btn btn-primary" data-action="save-settings">Guardar cambios</button></div></section></div>`;
      }
      if(modal.type==='receipt'){const s=state.sales.find(x=>x.id===modal.id);if(!s)return '';const items=getSaleItems(s),business=state.settings,paid=Number(s.paid)||0,disc=Number(s.discount)||0,sub=Number(s.subtotal)||(Number(s.total)+disc),payEntries=getSalePaymentEntries(s);return `<div class="modal-backdrop" id="modal-out"><section class="modal receipt-modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2 class="modal-title">Comprobante de venta</h2><p class="modal-desc">Vista previa de la nota que compartirás</p></div><button class="modal-close" data-action="close">×</button></div><article class="invoice-paper"><header class="invoice-business"><h2>${esc(business.business||'Mi negocio')}</h2>${business.address?`<div>${esc(business.address)}</div>`:''}<div class="invoice-contact">${business.phone?`<span>☎ ${esc(business.phone)}</span>`:''}${business.email?`<span>✉ ${esc(business.email)}</span>`:''}${business.registration?`<span>⌂ ${esc(business.registration)}</span>`:''}</div></header><div class="invoice-divider"></div><section class="invoice-meta"><div><span>Fecha</span><strong>${esc(invoiceDate(s))}</strong></div><div><span>Vendedor</span><strong>${esc(s.seller||business.seller||'—')}</strong></div><div><span>Método de pago</span><strong>${esc(s.payment==='Pendiente'?'Por definir':s.payment||'—')}</strong></div><div><span>Estado</span><strong class="${pending(s)>0?'invoice-pending':''}">${pending(s)>0?'Pendiente':'Pagada'}</strong></div><div><span>Número de transacción</span><strong>${esc(s.folio||'0001')}</strong></div>${s.customer?`<div><span>Cliente</span><strong>${esc(s.customer)}</strong></div>`:''}</section><div class="invoice-table-wrap"><table class="invoice-table"><colgroup><col style="width:43%"><col style="width:14%"><col style="width:21%"><col style="width:22%"></colgroup><thead><tr><th>Productos</th><th>Cantidad</th><th>Precio unitario</th><th>Valor</th></tr></thead><tbody>${items.map(item=>`<tr><td>${esc(item.product)}</td><td>${item.qty}</td><td>${money(item.unitPrice)}</td><td>${money(item.total)}</td></tr>`).join('')}</tbody></table></div>${disc>0?`<div class="invoice-discount-row"><span>Subtotal</span><strong>${money(sub)}</strong></div><div class="invoice-discount-row"><span>Descuento</span><strong>−${money(disc)}</strong></div>`:''}<div class="invoice-total"><span>Total:</span><strong>${money(s.total)}</strong></div>${Number(s.cashReceived)>0?`<div class="invoice-discount-row"><span>Efectivo recibido</span><span>${money(s.cashReceived)} · Cambio <strong>${money(s.changeDue||0)}</strong></span></div>`:''}${payEntries.length>1?`<div class="invoice-payments-list">${payEntries.map(p=>`<span class="invoice-pay-chip">${esc(p.method)}: ${money(p.amount)}</span>`).join('')}</div>`:''}${pending(s)>0?`<div class="invoice-balance"><span>Pagado ${money(paid)}</span><strong>Saldo pendiente ${money(pending(s))}</strong></div>`:''}${s.notes?`<div class="invoice-note-box"><strong>Nota:</strong> ${esc(s.notes)}</div>`:''}</article><div class="modal-actions invoice-actions"><button class="btn btn-light" data-action="close">Cerrar</button>${canModifySale(s)?`<button class="btn btn-light" data-edit="sale" data-id="${s.id}">Editar nota</button>`:''}<button class="btn btn-light" data-action="share-receipt:${s.id}">Compartir como imagen</button><button class="btn btn-primary" data-action="print">Imprimir / Guardar PDF</button></div></section></div>`}
      if(modal.type==='sale'){
        const s=modal.id?state.sales.find(x=>x.id===modal.id):null;
        if(modal.id&&!s)return '';
        const customers=[{value:'',label:'Venta de mostrador'},...state.customers.map(c=>({value:c.name,label:c.name}))];
        if(saleMeta.customer&&!customers.some(c=>c.value===saleMeta.customer))customers.push({value:saleMeta.customer,label:saleMeta.customer});
        const categories=['Todas',...new Set(state.products.map(p=>p.category||'Productos'))].sort((a,b)=>a==='Todas'?-1:b==='Todas'?1:a.localeCompare(b,'es-MX'));
        const picker=`<div class="sale-search-row"><div class="sale-search-wrap"><input class="sale-search" id="product-search" type="search" autocomplete="off" placeholder="Buscar producto…" aria-label="Buscar productos" value="${esc(saleSearch)}" /><button type="button" class="sale-search-clear" data-sale-clear-search aria-label="Limpiar búsqueda" ${saleSearch?'':'hidden'}>×</button></div>${isOwnerRole()?`<button type="button" class="sale-new-compact" data-open="product">＋ Nuevo</button>`:''}</div><div class="sale-categories" role="tablist" aria-label="Categorías">${categories.map(c=>`<button type="button" class="sale-chip ${c===saleCategory?'active':''}" data-sale-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div><div id="sale-product-results" class="sale-products">${renderSaleProducts()}</div>`;
        const showPaid=s||saleMeta.payment==='Pendiente';
        const sub=saleSubtotal(),discAmt=saleDiscountAmount(sub),tot=round2(Math.max(0,sub-discAmt));
        const showExtras=Boolean(saleMeta.showExtras||discAmt>0||(saleMeta.notes||'').trim());
        const extrasBlock=`<div class="sale-extras-row"><button type="button" class="sale-extras-toggle ${showExtras?'active':''}" data-toggle-sale-extras>${showExtras?'− Ocultar descuento / nota':'＋ Descuento o nota en ticket'}</button>${showExtras?`<div class="sale-discount-box"><div class="sale-discount-head"><span class="sale-pay-label" style="margin:0">Descuento</span><div class="disc-type-toggle" role="group" aria-label="Tipo de descuento"><button type="button" class="disc-type-btn ${saleMeta.discountType!=='%'?'active':''}" data-disc-type="$">$</button><button type="button" class="disc-type-btn ${saleMeta.discountType==='%'?'active':''}" data-disc-type="%">%</button></div></div><div class="sale-discount-inputs"><input id="discount-value" type="number" min="0" step="0.01" value="${esc(saleMeta.discountValue??'')}" placeholder="${saleMeta.discountType==='%'?'Ej. 10 (%)':'Ej. 20 ($)'}" aria-label="Valor de descuento" /><span style="font-size:12.5px;color:var(--muted);padding-bottom:10px" id="sale-disc-calc">${discAmt>0?'−'+money(discAmt):'$0'}</span></div><div class="field"><label for="sale-notes">Nota en ticket (opcional)</label><input id="sale-notes" type="text" maxlength="500" value="${esc(saleMeta.notes||'')}" placeholder="Ej. Entregar sin bolsa o garantía 30 días" /></div><div class="sale-discount-summary" id="sale-disc-summary"><span>Subtotal ${money(sub)} · Desc. ${money(discAmt)}</span><strong>Neto ${money(tot)}</strong></div></div>`:''}</div>`;
        const bills=smartCashBills(tot);
        const cashBox=saleMeta.payment==='Efectivo'?`<div class="cash-change-box" id="sale-cash-box"><div class="cash-box-head"><label for="cash-received">Efectivo recibido (cambio rápido)</label><button type="button" class="calc-inline-btn" data-open-calc-for="cash-received" style="min-height:30px;padding:0 9px">${icon('calc',13)} Calc</button></div><div class="cash-bill-chips"><button type="button" class="bill-chip exact ${Number(saleMeta.cashReceived)===tot&&tot>0?'active':''}" data-bill-val="${tot}">Exacto (${money(tot)})</button>${bills.map(b=>`<button type="button" class="bill-chip ${Number(saleMeta.cashReceived)===b?'active':''}" data-bill-val="${b}">${money(b)}</button>`).join('')}</div><input id="cash-received" type="number" min="0" step="0.01" value="${esc(saleMeta.cashReceived??'')}" placeholder="Monto con el que paga el cliente" /><div class="change-result neutral" id="cash-change-preview"><span>Sin monto capturado</span><strong>Cambio: $0</strong></div></div>`:'';
        const splitBox=saleMeta.payment==='Combinado'?`<div class="split-pay-box" id="sale-split-box"><span class="sale-pay-label">Dividir cobro (${money(tot)})</span><div class="split-pay-grid"><div class="field"><label for="split-cash">En Efectivo</label><input id="split-cash" type="number" min="0" step="0.01" value="${esc(saleMeta.splitCash??'')}" placeholder="0" /></div><div class="split-other-row"><div class="field"><label for="split-other-method">2do método</label><select id="split-other-method"><option value="Tarjeta" ${saleMeta.splitOtherMethod!=='Transferencia'?'selected':''}>Tarjeta</option><option value="Transferencia" ${saleMeta.splitOtherMethod==='Transferencia'?'selected':''}>Transferencia</option></select></div><div class="field"><label for="split-other">Importe</label><input id="split-other" type="number" min="0" step="0.01" value="${esc(saleMeta.splitOther??'')}" placeholder="${esc(tot)}" /></div></div></div><div class="change-result neutral" id="split-pay-preview"><span>Suma: $0</span><strong>Faltan ${money(tot)}</strong></div></div>`:'';
        const payBlock=`<div class="sale-pay-block"><span class="sale-pay-label">Forma de pago</span><input type="hidden" id="payment" name="payment" value="${esc(saleMeta.payment)}" /><div class="sale-pay-pills" role="group" aria-label="Forma de pago">${['Efectivo','Tarjeta','Transferencia','Combinado','Pendiente'].map(v=>`<button type="button" class="sale-pay-pill ${saleMeta.payment===v?'active':''}" data-pay-method="${v}">${v}</button>`).join('')}</div></div>${cashBox}${splitBox}${showPaid?`<div class="sale-paid-row">${field(s?'Importe ya pagado':'Abono inicial (opcional)','paid','number',saleMeta.paid??0,{min:0,step:'0.01',placeholder:'0',required:Boolean(s)})}<div class="sale-paid-meta"><span class="sale-paid-badge" id="sale-paid-badge"></span>${s?`<button type="button" class="btn btn-light btn-sm" data-pay-full>Liquidar total</button>`:''}</div></div>`:''}${extrasBlock}`;
        const review=`<div class="sale-review-head"><h3>Productos seleccionados</h3><button type="button" class="btn btn-light btn-sm" data-sale-step="pick">＋ Agregar productos</button></div><div id="sale-draft-list" class="sale-draft-list"></div><form id="modal-form" class="sale-review-form">${payBlock}${field('Cliente (opcional)','customer','text',saleMeta.customer,{options:customers})}${field('Fecha','date','date',saleMeta.date,{required:true})}${field('Vendedor/a','seller','text',saleMeta.seller,{placeholder:'Nombre del vendedor',full:true})}</form>`;
        const units=saleDraft.reduce((sum,item)=>sum+Number(item.qty),0);
        return `<div class="modal-backdrop sale-backdrop" id="modal-out"><section class="modal sale-modal" role="dialog" aria-modal="true"><div class="modal-head sale-modal-head"><div><h2 class="modal-title">${s?`Editar nota ${esc(s.folio||'')}`:'Nueva venta'}</h2><div class="sale-step-bar"><button type="button" class="sale-step-pill ${saleStep==='pick'?'active':''}" data-sale-step="pick">1. Productos</button><button type="button" class="sale-step-pill ${saleStep==='review'?'active':''}" data-sale-step="review" ${saleDraft.length?'':'disabled'}>2. Cobro y datos</button></div></div><button class="modal-close" data-action="close" aria-label="Cerrar">×</button></div><div class="sale-body">${saleStep==='pick'?picker:review}</div><div class="sale-bottom"><div class="sale-bottom-summary"><div><span id="sale-count">${units} unidad(es)</span><div class="sale-bottom-pending" id="sale-bottom-pending" hidden></div></div><strong id="sale-total">${money(saleTotal())}</strong></div>${saleStep==='pick'?`<button class="btn btn-primary" data-sale-step="review" ${saleDraft.length?'':'disabled'}>Continuar · Cobrar →</button>`:`<button class="btn btn-primary" id="modal-submit" ${saleDraft.length?'':'disabled'}>${s?'Guardar cambios':'Guardar nota'}</button>`}</div></section></div>`
      }
      if(modal.type==='expense'){const e=modal.id?state.expenses.find(x=>x.id===modal.id):null;return modalFrame(e?'Editar gasto':'Registrar gasto','Anota el concepto y el importe para el control de caja.',`<form id="modal-form" class="form-grid">${field('Concepto','name','text',e?.name||'',{full:true,required:true,placeholder:'Ej. compra de insumos'})}${field('Importe','amount','number',e?.amount??'',{min:0,step:'0.01',required:true})}${field('Fecha','date','date',e?.date||today(),{required:true})}${field('Categoría','category','text',e?.category||'Insumos',{options:['Insumos','Servicios','Renta','Empaque','Transporte','Nómina','Otros'].map(v=>({value:v,label:v}))})}${field('Forma de pago','payment','text',e?.payment||'Efectivo',{options:['Efectivo','Tarjeta','Transferencia','Otro'].map(v=>({value:v,label:v}))})}${field('Nota','notes','textarea',e?.notes||'',{full:true,placeholder:'Detalle opcional'})}</form>`,e?'Guardar cambios':'Guardar gasto')}
      if(modal.type==='product'){const p=state.products.find(x=>x.id===modal.id)||{};const f=productFormDraft||{};const photo=productPhotoDraft===null?p.photo:productPhotoDraft;const cats=[...new Set(state.products.map(x=>x.category||'Productos'))].sort((a,b)=>a.localeCompare(b,'es-MX'));return modalFrame(modal.id?'Editar producto':'Agregar producto','Configura precio, costo y alerta de stock mínimo.',`<form id="modal-form" class="form-grid"><div class="photo-edit"><button type="button" class="photo-preview photo-zoom-trigger" id="photo-preview" title="Ver imagen grande" aria-label="Agrandar vista previa">${productArt({...p,photo})}</button><div class="photo-controls"><strong>Foto del producto</strong><div class="photo-btn-row"><button type="button" class="btn btn-light btn-sm" id="product-camera-btn">${icon('camera',15)} Tomar foto</button><label for="product-photo" class="btn btn-light btn-sm" id="product-gallery-lbl">${icon('image',15)} Galería</label><input id="product-camera" type="file" accept="image/*" capture="environment" hidden aria-label="Tomar foto con cámara" /><input id="product-photo" type="file" accept="image/*" hidden aria-label="Elegir foto de la galería" /><button type="button" class="photo-remove" id="photo-remove" ${photo?'':'hidden'}>Quitar</button></div><small>Toca la imagen para verla grande.</small></div></div><div class="camera-live-box" id="camera-live-box" hidden><video class="camera-live-video" id="camera-live-video" autoplay playsinline muted></video><div class="camera-live-actions"><button type="button" class="btn btn-light btn-sm" id="camera-live-cancel">Cancelar</button><button type="button" class="btn btn-lime btn-sm" id="camera-live-snap">${icon('camera',15)} Capturar</button></div></div>${field('Nombre','name','text',f.name??p.name??'',{full:true,required:true,placeholder:'Ej. Café americano'})}${field('Categoría','category','text',(f.category??p.category)||'Productos',{list:'product-categories',placeholder:'Productos'})}<datalist id="product-categories">${cats.map(c=>`<option value="${esc(c)}"></option>`).join('')}</datalist>${field('Emoji si no hay foto','emoji','text',(f.emoji??p.emoji)||'📦',{placeholder:'📦'})}${field('Precio de venta','price','number',f.price??p.price??'',{min:0,step:'0.01',required:true})}${field('Costo unitario','cost','number',f.cost??p.cost??0,{min:0,step:'0.01'})}<div class="field-live-hint" id="product-margin-hint"></div>${field('Existencias actuales','stock','number',f.stock??p.stock??0,{...(allowsNegativeStock()?{}:{min:0}),step:1})}${field('Avisar al llegar a','min','number',f.min??p.min??3,{min:0,step:1})}</form>`,modal.id?'Guardar cambios':'Guardar producto')}
      if(modal.type==='customer'||modal.type==='supplier'){const customer=modal.type==='customer',list=customer?state.customers:state.suppliers,x=list.find(a=>a.id===modal.id)||{};return modalFrame(modal.id?'Editar contacto':customer?'Agregar cliente':'Agregar proveedor','Guarda los datos para encontrarlos fácilmente después.',`<form id="modal-form" class="form-grid">${field('Nombre','name','text',x.name||'',{full:true,required:true})}${field('Teléfono','phone','tel',x.phone||'')}${customer?'':field('Correo','email','email',x.email||'')}${field('Notas','notes','textarea',x.notes||'',{full:true,placeholder:'Información útil sobre este contacto'})}</form>`,customer?'Guardar cliente':'Guardar proveedor')}
      if(modal.type==='collect'){const s=state.sales.find(x=>x.id===modal.id);if(!s)return '';const pend=pending(s),initAmt=modal.initAmount??pend,initMethod=modal.initMethod||'Efectivo',initDate=modal.initDate||today();return modalFrame('Registrar abono',`${s.customer||'Cliente'} · saldo actual ${money(pend)}`,`<form id="modal-form" class="form-grid"><div class="field full"><div class="cash-box-head"><label for="amount">Importe del abono</label><button type="button" class="btn btn-light btn-sm" data-collect-full="${pend}">Liquidar (${money(pend)})</button></div><div class="input-with-calc"><input id="amount" name="amount" type="number" min="0.01" step="0.01" value="${esc(initAmt)}" required /><button type="button" class="calc-inline-btn" data-open-calc-for="amount" title="Abrir calculadora">${icon('calc',14)} Calc</button></div></div>${field('Fecha','date','date',initDate,{required:true})}<div class="field"><label for="payment">Forma de pago</label><select id="payment" name="payment"><option ${initMethod==='Efectivo'?'selected':''}>Efectivo</option><option ${initMethod==='Tarjeta'?'selected':''}>Tarjeta</option><option ${initMethod==='Transferencia'?'selected':''}>Transferencia</option><option ${initMethod==='Otro'?'selected':''}>Otro</option></select></div><div class="cash-change-box" id="collect-cash-box" ${initMethod==='Efectivo'?'':'hidden'}><div class="cash-box-head"><label for="collect-cash-received">Efectivo recibido (opcional)</label><button type="button" class="calc-inline-btn" data-open-calc-for="collect-cash-received" style="min-height:30px;padding:0 9px">${icon('calc',13)} Calc</button></div><input id="collect-cash-received" type="number" min="0" step="0.01" value="${esc(collectDraft.cashReceived||'')}" placeholder="Monto con el que paga" /><div class="change-result neutral" id="collect-change-preview"><span>Pago exacto</span><strong>Cambio: $0</strong></div></div></form>`,'Guardar abono')}
      if(modal.type==='adjust'){const p=getProduct(modal.id);if(!p)return '';return modalFrame('Ajustar existencias',`${esc(p.name)} · tienes ${p.stock} unidad(es)`, `<form id="modal-form" class="form-grid"><input type="hidden" id="movement" name="movement" value="add" /><div class="adjust-modes" role="group" aria-label="Tipo de ajuste"><button type="button" class="adjust-mode active" data-adjust-mode="add">+ Sumar</button><button type="button" class="adjust-mode" data-adjust-mode="remove">− Restar</button><button type="button" class="adjust-mode" data-adjust-mode="set">= Fijar total</button></div>${field('Cantidad','amount','number',1,{min:0,step:1,required:true,full:true})}<div class="adjust-quick">${[1,5,10,25].map(n=>`<button type="button" class="adjust-chip" data-adjust-val="${n}">${n}</button>`).join('')}</div><div class="adjust-preview" id="adjust-preview" data-current-stock="${Number(p.stock)||0}"><span>Stock actual: ${p.stock}</span><strong>Nuevo: ${(Number(p.stock)||0)+1}</strong></div>${isSellerRole()?'':`<div class="field full"><div class="field-help">Si es una compra nueva y quieres llevar control del gasto, regístrala también en Gastos.</div></div>`}</form>`,'Actualizar stock')}
      return ''}
    function bindModal(){
      const backdrop=document.getElementById('modal-out');backdrop?.addEventListener('click',e=>{if(e.target===backdrop)closeModal()});
      const form=document.getElementById('modal-form');const submit=document.getElementById('modal-submit');if(submit&&form)submit.addEventListener('click',()=>form.requestSubmit());if(form)form.addEventListener('submit',e=>{e.preventDefault();submitForm(form)});
      const productSearch=document.getElementById('product-search'),results=document.getElementById('sale-product-results'),clearSearch=document.querySelector('[data-sale-clear-search]');
      const adjustDraftProduct=(id,delta)=>{const p=getProduct(id);if(!p)return;const current=selectedQty(p.id),next=current+delta;if(next<0||(!allowsNegativeStock()&&next>saleAvailable(p.id)))return toast(saleAvailable(p.id)<1?`${p.name} está agotado`:`Solo puedes incluir ${saleAvailable(p.id)} unidad(es) de ${p.name}`,true);const item=saleDraft.find(x=>x.productId===p.id);if(item){item.qty=next;if(!next)saleDraft=saleDraft.filter(x=>x!==item)}else if(next>0)saleDraft.push({productId:p.id,product:p.name,qty:next,unitPrice:Number(p.price)||0});if(results)results.innerHTML=renderSaleProducts();updateTotal();document.querySelectorAll('[data-sale-step="review"]').forEach(b=>b.disabled=!saleDraft.length)};
      if(productSearch&&results){productSearch.addEventListener('input',()=>{saleSearch=productSearch.value;if(clearSearch)clearSearch.hidden=!saleSearch;results.innerHTML=renderSaleProducts()});clearSearch?.addEventListener('click',()=>{saleSearch='';productSearch.value='';clearSearch.hidden=true;results.innerHTML=renderSaleProducts();productSearch.focus()});document.querySelectorAll('[data-sale-cat]').forEach(btn=>btn.addEventListener('click',()=>{saleCategory=btn.dataset.saleCat;document.querySelectorAll('[data-sale-cat]').forEach(c=>c.classList.toggle('active',c===btn));results.innerHTML=renderSaleProducts()}));results.addEventListener('click',e=>{const adjustBtn=e.target.closest('[data-sale-adjust]');if(adjustBtn){adjustDraftProduct(adjustBtn.dataset.id,Number(adjustBtn.dataset.saleAdjust));return}const tapBtn=e.target.closest('[data-sale-tap]');if(tapBtn)adjustDraftProduct(tapBtn.dataset.saleTap,1)})}
      document.querySelectorAll('[data-sale-step]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.saleStep===saleStep)return;if(button.dataset.saleStep==='review'&&!saleDraft.length)return toast('Elige al menos un producto',true);captureSaleMeta();saleStep=button.dataset.saleStep;render()}));
      document.querySelectorAll('[data-pay-method]').forEach(btn=>btn.addEventListener('click',()=>{captureSaleMeta();saleMeta.payment=btn.dataset.payMethod;if(saleMeta.payment==='Combinado'){const t=saleTotal();if(saleMeta.splitCash===''&&saleMeta.splitOther===''){const half=round2(t/2);saleMeta.splitCash=String(half);saleMeta.splitOther=String(round2(t-half))}}if(!modal?.id&&saleMeta.payment!=='Pendiente')saleMeta.paid=0;render()}));
      document.querySelector('[data-pay-full]')?.addEventListener('click',()=>{const paidInput=document.getElementById('paid');if(!paidInput)return;const t=saleTotal();paidInput.value=String(t);saleMeta.paid=t;updateTotal()});
      document.querySelector('[data-toggle-sale-extras]')?.addEventListener('click',()=>{captureSaleMeta();saleMeta.showExtras=!saleMeta.showExtras;render()});
      document.querySelectorAll('[data-disc-type]').forEach(btn=>btn.addEventListener('click',()=>{captureSaleMeta();saleMeta.discountType=btn.dataset.discType;render()}));
      document.getElementById('discount-value')?.addEventListener('input',e=>{saleMeta.discountValue=e.target.value;updateTotal()});
      document.getElementById('sale-notes')?.addEventListener('input',e=>{saleMeta.notes=e.target.value});
      document.getElementById('cash-received')?.addEventListener('input',e=>{saleMeta.cashReceived=e.target.value;updateTotal()});
      document.querySelectorAll('[data-bill-val]').forEach(btn=>btn.addEventListener('click',()=>{const cr=document.getElementById('cash-received');if(!cr)return;cr.value=btn.dataset.billVal;saleMeta.cashReceived=btn.dataset.billVal;updateTotal()}));
      const splitCashEl=document.getElementById('split-cash'),splitOtherEl=document.getElementById('split-other'),splitMethodEl=document.getElementById('split-other-method');
      splitCashEl?.addEventListener('input',()=>{const c=Math.max(0,Number(splitCashEl.value)||0),t=saleTotal();const rem=round2(Math.max(0,t-c));if(splitOtherEl){splitOtherEl.value=String(rem);saleMeta.splitOther=String(rem)}saleMeta.splitCash=splitCashEl.value;updateTotal()});
      splitOtherEl?.addEventListener('input',()=>{saleMeta.splitOther=splitOtherEl.value;updateTotal()});
      splitMethodEl?.addEventListener('change',()=>{saleMeta.splitOtherMethod=splitMethodEl.value});
      document.querySelectorAll('[data-open-calc-for]').forEach(btn=>btn.addEventListener('click',()=>openCalcFor(btn.dataset.openCalcFor)));
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
            if(plus)plus.disabled=!allowsNegativeStock()&&qty>=saleAvailable(item.productId);
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
        if(!Number.isInteger(next)||next<1||(!allowsNegativeStock()&&next>saleAvailable(item.productId)))return;
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
      if(adjPrev&&adjMove&&adjAmt){const cur=Number(adjPrev.dataset.currentStock)||0;const updateAdjust=()=>{const negOk=allowsNegativeStock(),mode=adjMove.value||'add',raw=adjAmt.value.trim(),qty=Math.floor(Number(raw));const next=mode==='set'?qty:mode==='add'?cur+qty:cur-qty;const valid=raw!==''&&Number.isFinite(qty)&&(mode==='set'?(negOk?qty>=-999999:qty>=0):qty>=1)&&(negOk?next>=-999999:next>=0);adjPrev.classList.toggle('warn',!valid||next<0);adjPrev.innerHTML=`<span>Stock actual: ${cur}</span><strong>${valid?`Nuevo: ${next}${next<0?' (negativo)':''}`:(!negOk&&next<0)?'Excede el stock actual':'Cantidad inválida'}</strong>`;if(submit)submit.disabled=!valid};document.querySelectorAll('[data-adjust-mode]').forEach(btn=>btn.addEventListener('click',()=>{adjMove.value=btn.dataset.adjustMode;document.querySelectorAll('[data-adjust-mode]').forEach(b=>b.classList.toggle('active',b===btn));updateAdjust()}));document.querySelectorAll('[data-adjust-val]').forEach(btn=>btn.addEventListener('click',()=>{adjAmt.value=btn.dataset.adjustVal;updateAdjust()}));adjAmt.addEventListener('input',updateAdjust);updateAdjust()}
      const paidEl=document.getElementById('paid');paidEl?.addEventListener('input',updateTotal);
      if(modal?.type==='collect'){
        const amtEl=document.getElementById('amount'),payEl=document.getElementById('payment'),cBox=document.getElementById('collect-cash-box'),cCashEl=document.getElementById('collect-cash-received'),cPrev=document.getElementById('collect-change-preview');
        const refreshCollectChange=()=>{
          if(!cBox||!cPrev)return;
          const isCash=(payEl?.value||'Efectivo')==='Efectivo';cBox.hidden=!isCash;
          if(!isCash)return;
          const due=Math.max(0,Number(amtEl?.value)||0),recRaw=String(cCashEl?.value??'').trim();
          if(!recRaw){cPrev.className='change-result neutral';cPrev.innerHTML=`<span>Pago exacto</span><strong>Cambio: ${money(0)}</strong>`;return}
          const rec=Math.max(0,Number(recRaw)||0),diff=round2(rec-due);
          if(diff>=0){cPrev.className=diff===0?'change-result exact':'change-result ok';cPrev.innerHTML=`<span>${diff===0?'Pago exacto':'Cambio a devolver'}</span><strong>${money(diff)}</strong>`}
          else{cPrev.className='change-result short';cPrev.innerHTML=`<span>Falta para este abono</span><strong>${money(Math.abs(diff))}</strong>`}
        };
        document.querySelector('[data-collect-full]')?.addEventListener('click',b=>{if(amtEl){amtEl.value=b.currentTarget.dataset.collectFull;refreshCollectChange()}});
        amtEl?.addEventListener('input',refreshCollectChange);
        payEl?.addEventListener('change',refreshCollectChange);
        cCashEl?.addEventListener('input',()=>{collectDraft.cashReceived=cCashEl.value;refreshCollectChange()});
        refreshCollectChange();
      }
      if(modal?.type==='calc'){
        const exprEl=document.getElementById('calc-expr'),valEl=document.getElementById('calc-val');
        const syncCalcDisplay=()=>{
          if(exprEl)exprEl.textContent=calcState.expr||'0';
          const ev=evalCalcExpr(calcState.expr);
          if(!Number.isNaN(ev)&&calcState.expr!=='')calcState.result=String(round2(ev));
          if(valEl)valEl.textContent=calcState.result||'0';
        };
        const pressCalc=(k)=>{
          let ex=String(calcState.expr||'0');
          if(k==='C'){calcState={expr:'0',result:'0'};syncCalcDisplay();return}
          if(k==='DEL'){ex=ex.length>1?ex.slice(0,-1):'0';calcState.expr=ex;syncCalcDisplay();return}
          if(k==='='){const ev=evalCalcExpr(ex);if(Number.isNaN(ev))return toast('Revisa la operación',true);const r=String(round2(ev));calcState={expr:r,result:r};syncCalcDisplay();return}
          const isOp='+-*/%'.includes(k);
          if(isOp){if(ex==='0'&&k==='-')ex='-';else if('+-*/'.includes(ex.slice(-1))&&k!=='%')ex=ex.slice(0,-1)+k;else ex+=k}
          else if(k==='.'){const tail=ex.split(/[+\-*/%]/).pop()||'';if(!tail.includes('.'))ex+=ex==='0'?'0.':'.'}
          else{if(ex==='0')ex=k==='00'?'0':k;else ex+=k}
          calcState.expr=ex;syncCalcDisplay();
        };
        document.querySelectorAll('[data-calc-key]').forEach(btn=>btn.addEventListener('click',()=>pressCalc(btn.dataset.calcKey)));
        document.querySelector('[data-calc-copy]')?.addEventListener('click',()=>{
          const out=calcState.result||'0';
          if(navigator.clipboard?.writeText)navigator.clipboard.writeText(out).then(()=>toast(`Copiado: ${out}`)).catch(()=>toast(out));
          else toast(`Resultado: ${out}`);
        });
        document.querySelector('[data-calc-apply]')?.addEventListener('click',()=>{
          const ev=evalCalcExpr(calcState.expr);
          const num=Number.isNaN(ev)?(Number(calcState.result)||0):round2(ev);
          if(!Number.isFinite(num)||num<0)return toast('Usa un resultado positivo',true);
          const back=calcReturn;calcReturn=null;
          if(!back){closeModal();return}
          const valStr=String(round2(num));
          if(back.targetId==='cash-received')saleMeta.cashReceived=valStr;
          else if(back.targetId==='cc-counted')cashCloseDraft.countedCash=valStr;
          else if(back.targetId==='collect-cash-received')collectDraft.cashReceived=valStr;
          else if(back.targetId==='amount'&&back.modal.type==='collect'){back.modal.initAmount=valStr;back.modal.initMethod=back.collectMethod||'Efectivo';back.modal.initDate=back.collectDate||today()}
          modal=back.modal;render();
        });
      }
      if(modal?.type==='cash-close'){
        const floatEl=document.getElementById('cc-float'),countedEl=document.getElementById('cc-counted'),notesEl=document.getElementById('notes'),diffBanner=document.getElementById('cc-diff-banner'),expValEl=document.getElementById('cc-expected-val');
        const refreshCashClose=()=>{
          const fl=Math.max(0,Number(floatEl?.value)||0);
          cashCloseDraft.openingFloat=floatEl?.value??'';
          cashCloseDraft.countedCash=countedEl?.value??'';
          cashCloseDraft.notes=notesEl?.value??'';
          const s=computeShiftSummary(cashCloseDraft.mode||'since-last',fl);
          if(expValEl)expValEl.textContent=money(s.expectedCash);
          const hasCounted=String(countedEl?.value||'').trim()!=='';
          const cnt=hasCounted?Math.max(0,Number(countedEl.value)||0):s.expectedCash;
          const diff=round2(cnt-s.rawExpected);
          if(diffBanner){
            diffBanner.className=`cc-diff-banner ${Math.abs(diff)<0.01?'ok':diff>0?'pos':'neg'}`;
            diffBanner.innerHTML=`<span>Diferencia contra esperado</span><strong>${esc(Math.abs(diff)<0.01?'Cuadra exacto':diff>0?`Sobrante +${money(diff)}`:`Falta ${money(Math.abs(diff))}`)}</strong>`;
          }
        };
        document.querySelectorAll('[data-cc-mode]').forEach(btn=>btn.addEventListener('click',()=>{
          cashCloseDraft.mode=btn.dataset.ccMode;
          cashCloseDraft.openingFloat=floatEl?.value??cashCloseDraft.openingFloat;
          cashCloseDraft.countedCash=countedEl?.value??cashCloseDraft.countedCash;
          cashCloseDraft.notes=notesEl?.value??cashCloseDraft.notes;
          render();
        }));
        floatEl?.addEventListener('input',refreshCashClose);
        countedEl?.addEventListener('input',refreshCashClose);
        notesEl?.addEventListener('input',refreshCashClose);
        document.querySelectorAll('[data-cc-delete]').forEach(btn=>btn.addEventListener('click',()=>{
          if(!isOwnerRole())return toast('Solo el dueño puede eliminar cortes',true);
          if(!confirm('¿Eliminar este corte de caja del historial?'))return;
          const id=btn.dataset.ccDelete;
          state.cashClosures=(state.cashClosures||[]).filter(c=>c.id!==id);
          save();
          if(isCloudActive())cloudDeleteRecord('cashClosure',id).catch(err=>toast(err?.message||'No se pudo eliminar en la nube',true));
          render();toast('Corte eliminado');
        }));
      }
      const importInput=document.getElementById('import-backup-file');
      importInput?.addEventListener('change',()=>{const file=importInput.files?.[0];if(file)importData(file);importInput.value=''});
      document.querySelectorAll('[data-auth-mode]').forEach(btn=>btn.addEventListener('click',()=>{cloud.authMode=btn.dataset.authMode;render()}));
      document.querySelectorAll('[data-ob-mode]').forEach(btn=>btn.addEventListener('click',()=>{cloud.onboardMode=btn.dataset.obMode;render()}));
      document.querySelectorAll('.modal [data-copy-link]').forEach(btn=>btn.addEventListener('click',()=>{const link=catalogUrlFor();if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link).then(()=>toast('Enlace del catálogo copiado')).catch(()=>toast(link));else toast(link)}));
      document.getElementById('auth-open-catalog')?.addEventListener('click',()=>{
        const raw=document.getElementById('auth-catalog-code')?.value?.trim()||'';
        const m=raw.match(/catalogo=([a-zA-Z0-9_-]+)/);
        const sid=(m?m[1]:raw).trim();
        if(!sid)return toast('Escribe el código o pega el link del catálogo',true);
        modal=null;cloud.publicViaLink=false;cloud.publicCategory='Todas';cloud.publicCart={};
        subscribePublicCatalog(sid);
      });
      const authForm=document.getElementById('auth-form');
      if(authForm)authForm.addEventListener('submit',async e=>{
        e.preventDefault();
        if(cloud.busy)return;
        const errBox=document.getElementById('auth-error'),subBtn=document.getElementById('auth-submit');
        const showErr=(msg)=>{if(errBox){errBox.textContent=msg;errBox.hidden=false}else toast(msg,true)};
        if(errBox)errBox.hidden=true;
        const email=(document.getElementById('auth-email')?.value||'').trim();
        const pass=document.getElementById('auth-pass')?.value||'';
        const name=(document.getElementById('auth-name')?.value||'').trim();
        const invite=(document.getElementById('auth-invite')?.value||'').trim().toUpperCase();
        if(!email||!pass)return showErr('Completa tu correo y contraseña.');
        cloud.busy=true;cloud.joiningInvite=Boolean(cloud.authMode==='register'&&invite);if(subBtn){subBtn.disabled=true;subBtn.textContent='Conectando…'}
        try{
          if(!(await ensureFirebase()))throw new Error(cloud.sdkError||'No se pudo conectar con Firebase');
          if(cloud.authMode==='register'){
            const cred=await cloud.fb.createUserWithEmailAndPassword(cloud.auth,email,pass);
            if(name){await cloud.fb.updateProfile(cred.user,{displayName:name}).catch(()=>{})}
            cloud.user={uid:cred.user.uid,email:cred.user.email||email,displayName:name||''};
            if(invite){
              try{
                await joinCloudWithInvite({code:invite,memberName:name});
                modal=null;render();toast('Cuenta creada y unida al negocio');
              }catch(joinErr){
                cloud.joiningInvite=false;
                cloud.onboardMode='join';
                cloud.onboardingForced=true;
                modal={type:'onboarding'};render();
                toast(joinErr.message||'Cuenta creada, revisa el código de invitación',true);
              }
              return;
            }
            toast('Cuenta creada · configura tu negocio');
          }else{
            await cloud.fb.signInWithEmailAndPassword(cloud.auth,email,pass);
            modal=null;render();toast('Sesión iniciada');
          }
        }catch(err){
          showErr(translateAuthError(err));
        }finally{
          cloud.busy=false;cloud.joiningInvite=false;
          if(subBtn&&document.body.contains(subBtn)){subBtn.disabled=false;subBtn.textContent=cloud.authMode==='register'?'Crear cuenta':'Entrar'}
        }
      });
      const obForm=document.getElementById('onboarding-form');
      if(obForm)obForm.addEventListener('submit',async e=>{
        e.preventDefault();
        if(cloud.busy)return;
        const errBox=document.getElementById('ob-error'),subBtn=document.getElementById('ob-submit');
        const showErr=(msg)=>{if(errBox){errBox.textContent=msg;errBox.hidden=false}else toast(msg,true)};
        if(errBox)errBox.hidden=true;
        cloud.busy=true;if(subBtn){subBtn.disabled=true;subBtn.textContent='Guardando…'}
        try{
          if(cloud.onboardMode==='join'){
            const code=document.getElementById('ob-code')?.value||'';
            const memberName=document.getElementById('ob-member-name')?.value||'';
            await joinCloudWithInvite({code,memberName});
            modal=null;page='inicio';render();toast('Te uniste al equipo correctamente');
          }else{
            const business=document.getElementById('ob-business')?.value||'';
            const ownerName=document.getElementById('ob-owner-name')?.value||'';
            const migrateLocal=Boolean(document.getElementById('ob-migrate')?.checked);
            await createCloudStore({business,ownerName,migrateLocal});
            modal=null;page='inicio';render();toast('Negocio creado y sincronizado en la nube');
          }
        }catch(err){
          showErr(translateAuthError(err));
        }finally{
          cloud.busy=false;
          if(subBtn&&document.body.contains(subBtn)){subBtn.disabled=false;subBtn.textContent=cloud.onboardMode==='join'?'Unirme ahora':'Crear negocio'}
        }
      });
      const doSignOut=async()=>{try{cloud.previewSeller=false;await cloud.fb?.signOut?.(cloud.auth);modal=null;render();toast('Sesión cerrada')}catch{toast('No se pudo cerrar sesión',true)}};
      document.querySelectorAll('.modal [data-preview-seller]').forEach(btn=>btn.addEventListener('click',()=>{if(!isRealOwner())return;cloud.previewSeller=true;modal=null;if(['gastos','proveedores','reportes','equipo'].includes(page))page='inicio';render();toast('Vista previa: así ve Notas tu vendedor')}));
      document.querySelectorAll('.modal [data-exit-seller-preview]').forEach(btn=>btn.addEventListener('click',()=>{cloud.previewSeller=false;modal=null;render();toast('Volviste a tu vista de Dueño')}));
      document.getElementById('ob-signout')?.addEventListener('click',doSignOut);
      document.getElementById('account-signout')?.addEventListener('click',doSignOut);
      document.getElementById('account-store-select')?.addEventListener('change',async e=>{
        const sid=e.target.value;if(!sid||sid===cloud.storeId)return;
        try{
          cloud.previewSeller=false;
          const{doc,setDoc}=cloud.fb;
          if(cloud.profile){cloud.profile.activeStoreId=sid;cloud.profile.updatedAt=Date.now();await setDoc(doc(cloud.db,'users',cloud.user.uid),cloud.profile,{merge:true})}
          await attachStoreCloud(sid);modal=null;render();toast('Tienda cambiada');
        }catch{toast('No se pudo cambiar de tienda',true)}
      });
      renderSaleDraft()
    }
    function escModal(e){if(e.key==='Escape'&&modal)closeModal()}
    function updateTotal(){
      const t=document.getElementById('sale-total'),count=document.getElementById('sale-count'),pendNote=document.getElementById('sale-bottom-pending'),paidBadge=document.getElementById('sale-paid-badge'),paidEl=document.getElementById('paid');if(!t)return;
      const sub=saleSubtotal(),discAmt=saleDiscountAmount(sub),total=round2(Math.max(0,sub-discAmt));
      t.textContent=money(total);
      if(count)count.textContent=`${saleDraft.reduce((sum,item)=>sum+Number(item.qty),0)} unidad(es)${discAmt>0?` · desc. −${money(discAmt)}`:''}`;
      const discCalc=document.getElementById('sale-disc-calc'),discSum=document.getElementById('sale-disc-summary');
      if(discCalc)discCalc.textContent=discAmt>0?'−'+money(discAmt):'$0';
      if(discSum)discSum.innerHTML=`<span>Subtotal ${money(sub)} · Desc. ${money(discAmt)}</span><strong>Neto ${money(total)}</strong>`;
      const cashPrev=document.getElementById('cash-change-preview'),cashIn=document.getElementById('cash-received');
      if(cashPrev&&cashIn){
        const raw=String(cashIn.value||'').trim(),rec=Number(raw)||0;
        document.querySelectorAll('[data-bill-val]').forEach(b=>b.classList.toggle('active',raw!==''&&Number(b.dataset.billVal)===rec));
        if(!raw){cashPrev.className='change-result neutral';cashPrev.innerHTML=`<span>Pago exacto por defecto</span><strong>Cambio: ${money(0)}</strong>`}
        else{
          const diff=round2(rec-total);
          if(diff>0){cashPrev.className='change-result ok';cashPrev.innerHTML=`<span>Cambio a devolver</span><strong>${money(diff)}</strong>`}
          else if(diff===0){cashPrev.className='change-result exact';cashPrev.innerHTML=`<span>Pago exacto</span><strong>Cambio: ${money(0)}</strong>`}
          else{cashPrev.className='change-result short';cashPrev.innerHTML=`<span>Faltan para cubrir total</span><strong>${money(Math.abs(diff))}</strong>`}
        }
      }
      const splitPrev=document.getElementById('split-pay-preview'),scEl=document.getElementById('split-cash'),soEl=document.getElementById('split-other');
      if(splitPrev&&scEl&&soEl){
        const c=Math.max(0,Number(scEl.value)||0),o=Math.max(0,Number(soEl.value)||0),sum=round2(c+o),diff=round2(total-sum);
        if(Math.abs(diff)<=0.01){splitPrev.className='change-result ok';splitPrev.innerHTML=`<span>Suma: ${money(sum)}</span><strong>Cubierto completo</strong>`}
        else if(diff>0){splitPrev.className='change-result short';splitPrev.innerHTML=`<span>Suma: ${money(sum)}</span><strong>Faltan ${money(diff)}</strong>`}
        else{splitPrev.className='change-result short';splitPrev.innerHTML=`<span>Suma: ${money(sum)}</span><strong>Sobra ${money(Math.abs(diff))}</strong>`}
      }
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
        if(!allowsNegativeStock()){
          for(const [productId,qty] of newQty){
            const p=getProduct(productId),available=(p?Math.max(0,Number(p.stock)||0):0)+(originalQty.get(productId)||0);
            if(qty>available)return toast(`Solo puedes incluir ${available} unidad(es) de ${p?.name||'este producto'} en la nota`,true);
          }
        }
        captureSaleMeta();
        const subtotal=round2(items.reduce((sum,item)=>sum+item.total,0));
        const discount=saleDiscountAmount(subtotal);
        const total=round2(Math.max(0,subtotal-discount));
        const pay=v.payment,nowMs=Date.now(),sellerStr=(v.seller||'').trim(),uidStr=previous?.sellerUid||(cloud.user?.uid||'');
        let cashReceived=0,changeDue=0,paid=0,payments=Array.isArray(previous?.payments)?[...previous.payments]:[];
        if(pay==='Combinado'){
          const sc=Math.max(0,Number(document.getElementById('split-cash')?.value)||0);
          const so=Math.max(0,Number(document.getElementById('split-other')?.value)||0);
          const som=document.getElementById('split-other-method')?.value==='Transferencia'?'Transferencia':'Tarjeta';
          if(Math.abs((sc+so)-total)>0.01)return toast('En pago combinado la suma debe ser igual al total',true);
          paid=total;cashReceived=round2(sc);
          payments=[{method:'Efectivo',amount:round2(sc),date:v.date,at:nowMs,by:sellerStr,byUid:uidStr},{method:som,amount:round2(so),date:v.date,at:nowMs,by:sellerStr,byUid:uidStr}].filter(p=>p.amount>0);
        }else{
          const rawPaid=v.paid!==undefined&&v.paid!==''?Number(v.paid):0;
          paid=previous?Math.min(total,Number(v.paid)):pay==='Pendiente'?rawPaid:total;
          if(!Number.isFinite(paid)||paid<0||paid>total)return toast('El importe pagado debe estar entre cero y el total de la nota',true);
          if(pay==='Efectivo'){
            const crRaw=String(document.getElementById('cash-received')?.value??'').trim();
            if(crRaw!==''){
              const cr=Number(crRaw);
              if(!Number.isFinite(cr)||cr<total)return toast('El efectivo recibido no puede ser menor al total',true);
              cashReceived=round2(cr);changeDue=round2(cr-total);
            }else if(!previous){cashReceived=total;changeDue=0}
          }
          if(!previous||previous.payment==='Combinado'||!payments.length||previous.payment!==pay){
            payments=paid>0?[{method:pay==='Pendiente'?'Efectivo':pay,amount:round2(paid),date:v.date,at:nowMs,by:sellerStr,byUid:uidStr}]:[];
          }
        }
        const notes=String(document.getElementById('sale-notes')?.value??saleMeta.notes??'').trim().slice(0,500);
        const now=new Date(),folio=previous?.folio||String(state.saleSequence||1).padStart(4,'0');
        if(previous&&!canModifySale(previous))return toast('Solo puedes editar tus propias notas de venta',true);
        const sale={...previous,id:previous?.id||uid(),folio,date:v.date,time:previous?previous.time||'':now.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}),createdAt:previous?.createdAt||nowMs,seller:sellerStr,sellerUid:uidStr,items,product:items.length===1?items[0].product:`${items.length} productos`,productId:items.length===1?items[0].productId:'',qty:items.reduce((sum,item)=>sum+item.qty,0),unitPrice:items.length===1?items[0].unitPrice:0,subtotal,discount,total,customer:(v.customer||'').trim(),payment:pay,paid:round2(paid),cashReceived,changeDue,notes,payments};
        const stockChanges=[];
        for(const productId of new Set([...originalQty.keys(),...newQty.keys()])){
          const p=getProduct(productId);
          if(p){const rawNext=(Number(p.stock)||0)+(originalQty.get(productId)||0)-(newQty.get(productId)||0);p.stock=allowsNegativeStock()?rawNext:Math.max(0,rawNext);stockChanges.push({id:p.id,stock:p.stock})}
        }
        if(previous)Object.assign(previous,sale);
        else{state.saleSequence=Number(state.saleSequence||1)+1;state.sales.unshift(sale);if(cloud.previewSeller)cloud.previewOwnSaleIds.add(sale.id)}
        save();
        if(isCloudActive())cloudSaveSale(sale,stockChanges,Boolean(previous),state.saleSequence).catch(err=>toast(err?.message||'No se pudo sincronizar la venta',true));
        saleDraft=[];modal=null;render();toast(previous?'Nota actualizada · inventario y saldo recalculados':'Nota de venta guardada · inventario actualizado');return
      }
      if(modal.type==='expense'){if(isSellerRole())return toast('Solo el dueño puede registrar gastos',true);const isNew=!modal.id,record={id:modal.id||uid(),date:v.date,name:v.name.trim(),category:v.category,amount:Number(v.amount),payment:v.payment,notes:v.notes.trim()};if(modal.id){const idx=state.expenses.findIndex(x=>x.id===modal.id);if(idx>=0)state.expenses[idx]=record;else state.expenses.unshift(record)}else state.expenses.unshift(record);save();if(isCloudActive())cloudSaveExpense(record,isNew).catch(err=>toast(err?.message||'No se pudo sincronizar el gasto',true));modal=null;render();toast(modal.id?'Gasto actualizado':'Gasto guardado');return}
      if(modal.type==='product'){
        if(isSellerRole())return toast('Solo el dueño puede agregar o editar productos',true);
        if(photoBusy)return toast('Espera a que termine de cargar la foto',true);
        stopCameraStream();
        const isNew=!modal.id,old=modal.id?getProduct(modal.id):null,id=modal.id||uid();
        let photo=old?.photo||'';
        if(productPhotoDraft===''){if(photo&&window.NotasApp?.removeProductImage)window.NotasApp.removeProductImage(id);photo=''}
        else if(productPhotoDraft){if(window.NotasApp?.saveProductImage){photo=window.NotasApp.saveProductImage(id,productPhotoDraft);if(!photo)return toast('No se pudo guardar la foto. Intenta con otra imagen.',true)}else photo=productPhotoDraft}
        const record={id,name:v.name.trim(),category:v.category.trim()||'Productos',emoji:v.emoji.trim()||'📦',price:Number(v.price),cost:Number(v.cost)||0,stock:allowsNegativeStock()?(Number(v.stock)||0):Math.max(0,Number(v.stock)||0),min:Math.max(0,Number(v.min)||0),photo};
        if(modal.id)state.products=state.products.map(p=>p.id===modal.id?record:p);else state.products.push(record);
        save();
        if(isCloudActive()){
          const cloudRec=productPhotoDraft&&productPhotoDraft.startsWith('data:image/')?{...record,photo:productPhotoDraft}:record;
          cloudSaveProduct(cloudRec,isNew).catch(err=>toast(err?.message||'No se pudo sincronizar el producto',true));
        }
        productPhotoDraft=null;productFormDraft=null;clearModalDraft();
        if(returnToSale){modal={type:'sale',id:returnToSale.id};saleStep=returnToSale.step;returnToSale=null;saleSearch='';saleCategory='Todas';if(!old&&(record.stock>0||allowsNegativeStock()))saleDraft.push({productId:id,product:record.name,qty:1,unitPrice:record.price})}
        else modal=null;
        render();toast('Producto guardado');return
      }
      if(modal.type==='customer'||modal.type==='supplier'){if(modal.type==='supplier'&&isSellerRole())return toast('Solo el dueño puede editar proveedores',true);const isNew=!modal.id,arr=modal.type==='customer'?state.customers:state.suppliers,record={id:modal.id||uid(),name:v.name.trim(),phone:v.phone.trim(),email:v.email?.trim()||'',notes:v.notes.trim()};if(modal.id){const old=arr.find(x=>x.id===modal.id);if(old&&old.name!==record.name&&modal.type==='customer')state.sales.forEach(s=>{if(s.customer===old.name)s.customer=record.name});const i=arr.findIndex(x=>x.id===modal.id);arr[i]=record}else arr.push(record);save();if(isCloudActive())cloudSaveContact(modal.type,record,isNew).catch(err=>toast(err?.message||'No se pudo sincronizar el contacto',true));modal=null;render();toast('Contacto guardado');return}
      if(modal.type==='collect'){const s=state.sales.find(x=>x.id===modal.id),amount=round2(Number(v.amount)),pend=round2(pending(s));if(!s||!amount||amount<=0)return toast('Escribe un importe válido',true);if(amount>pend+0.01)return toast('El abono no puede superar el saldo pendiente',true);let changeMsg='';if((v.payment||'Efectivo')==='Efectivo'){const cRaw=String(document.getElementById('collect-cash-received')?.value??'').trim();if(cRaw!==''){const cr=Number(cRaw);if(!Number.isFinite(cr)||cr<amount)return toast('El efectivo recibido es menor al importe del abono',true);const ch=round2(cr-amount);if(ch>0)changeMsg=` · Cambio: ${money(ch)}`}}const entries=getSalePaymentEntries(s);entries.push({method:v.payment||'Efectivo',amount:Math.min(amount,pend),date:v.date||today(),at:Date.now(),by:isCloudActive()?(cloud.member?.name||cloud.user?.displayName||''):(state.settings.seller||''),byUid:cloud.user?.uid||''});s.payments=entries;s.paid=round2(Math.min(Number(s.total)||0,Number(s.paid||0)+Math.min(amount,pend)));s.payment=v.payment;save();if(isCloudActive())cloudCollectSale(s).catch(err=>toast(err?.message||'No se pudo sincronizar el abono',true));collectDraft={cashReceived:''};modal=null;render();toast('Abono registrado'+changeMsg);return}
      if(modal.type==='cash-close'){
        const fl=Math.max(0,round2(Number(document.getElementById('cc-float')?.value)||0));
        const sum=computeShiftSummary(cashCloseDraft.mode||'since-last',fl);
        const cntRaw=String(document.getElementById('cc-counted')?.value??'').trim();
        const counted=cntRaw===''?sum.expectedCash:Math.max(0,round2(Number(cntRaw)||0));
        const diff=round2(counted-sum.rawExpected);
        const nowMs=Date.now();
        const closure={id:uid(),date:today(),openedAt:sum.openedAt,closedAt:nowMs,openingFloat:fl,cashSales:sum.cashSales,cardSales:sum.cardSales,transferSales:sum.transferSales,expensesTotal:sum.expensesTotal,expectedCash:sum.expectedCash,countedCash:counted,difference:diff,notes:String(v.notes||'').trim().slice(0,500),closedBy:isCloudActive()?(cloud.member?.name||cloud.user?.displayName||cloud.user?.email||''):(state.settings.seller||'Dueño'),closedByUid:cloud.user?.uid||'',createdAt:nowMs,updatedAt:nowMs};
        state.cashClosures=[closure,...(state.cashClosures||[])];
        save();
        if(isCloudActive())cloudSaveCashClosure(closure).catch(err=>toast(err?.message||'No se pudo guardar el corte en la nube',true));
        cashCloseDraft={mode:'since-last',openingFloat:'',countedCash:'',notes:''};
        modal=null;render();toast('Corte de caja guardado');return;
      }
      if(modal.type==='adjust'){const p=getProduct(modal.id),raw=String(v.amount??'').trim(),amount=Math.floor(Number(raw)),mode=v.movement||'add',negOk=allowsNegativeStock();if(!p||!raw||!Number.isFinite(amount)||(mode==='set'?(negOk?amount<-999999:amount<0):amount<1))return toast('Ingresa una cantidad válida',true);if(!negOk&&mode==='remove'&&amount>p.stock)return toast('No puedes retirar más unidades de las que hay',true);p.stock=mode==='set'?amount:p.stock+(mode==='add'?amount:-amount);save();if(isCloudActive())cloudAdjustStock(p,p.stock).catch(err=>toast(err?.message||'No se pudo sincronizar existencias',true));modal=null;render();toast('Existencias actualizadas');return}}
    function deleteRecord(type,id){
      if(type==='sale'){
        const target=state.sales.find(x=>x.id===id);
        if(target&&!canModifySale(target))return toast('Solo el dueño o quien creó esta nota puede cancelarla',true);
      }else if(isSellerRole())return toast('Solo el dueño puede eliminar registros',true);
      const labels={sale:'esta venta',expense:'este gasto',product:'este producto',customer:'este cliente',supplier:'este proveedor'};
      const msg=type==='sale'?'¿Cancelar y eliminar esta nota de venta? Se devolverán los productos al inventario.':`¿Eliminar ${labels[type]||'este registro'}? Esta acción no se puede deshacer.`;
      if(!confirm(msg))return;
      const stockRestores=[];
      if(type==='sale'){const s=state.sales.find(x=>x.id===id);if(s)getSaleItems(s).forEach(item=>{const p=getProduct(item.productId);if(p){p.stock+=Number(item.qty)||0;stockRestores.push({id:p.id,stock:p.stock})}});state.sales=state.sales.filter(x=>x.id!==id)}
      if(type==='expense')state.expenses=state.expenses.filter(x=>x.id!==id);
      if(type==='product'){if(window.NotasApp?.removeProductImage)window.NotasApp.removeProductImage(id);state.products=state.products.filter(x=>x.id!==id)}
      if(type==='customer')state.customers=state.customers.filter(x=>x.id!==id);
      if(type==='supplier')state.suppliers=state.suppliers.filter(x=>x.id!==id);
      save();
      if(isCloudActive())cloudDeleteRecord(type,id,stockRestores).catch(err=>toast(err?.message||'No se pudo eliminar en la nube',true));
      render();toast('Registro eliminado')
    }
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
            settings:{business:'Mi negocio',currency:'MXN',address:'',phone:'',email:'',registration:'',seller:'',allowNegativeStock:true,cashFloat:0,...(parsed.settings||{})},
            products:nextProducts,
            customers:Array.isArray(parsed.customers)?parsed.customers:[],
            suppliers:Array.isArray(parsed.suppliers)?parsed.suppliers:[],
            sales:parsed.sales,
            expenses:parsed.expenses,
            cashClosures:Array.isArray(parsed.cashClosures)?parsed.cashClosures:[],
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
      const link=isCloudActive()?catalogUrlFor():'';
      const lines=[state.settings.business,'Catálogo de productos',...(link?['Ver catálogo en vivo con fotos: '+link,'']:[]),...state.products.map(p=>`${p.name} — ${money(p.price)} (${p.stock>0?'disponible':'agotado'})`)];
      const text=lines.join('\n');
      if(window.NotasApp?.shareText){window.NotasApp.shareText(text);return}
      if(navigator.share){navigator.share({title:state.settings.business||'Catálogo',text}).catch(()=>{});return}
      if(!navigator.clipboard?.writeText){toast('Compartir no está disponible en este navegador.',true);return}
      navigator.clipboard.writeText(text).then(()=>toast(link?'Catálogo y link copiados para compartir':'Lista copiada para compartir')).catch(()=>toast('No se pudo copiar. Revisa los permisos del navegador.',true));
    }
    function showReceipt(id){modal={type:'receipt',id};render()}
    function renderReceiptCanvas(invoice){
      const w=960,pad=56,cw=w-pad*2;
      const tmp=document.createElement('canvas');tmp.width=w;tmp.height=820+invoice.items.length*64;
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
      y+=24;
      if(invoice.discount){rowMeta('Subtotal',invoice.subtotal);rowMeta('Descuento','−'+invoice.discount);y+=6}
      else y+=10;
      ctx.textAlign='left';ctx.fillStyle='#202720';ctx.font='bold 34px system-ui,sans-serif';ctx.fillText('Total:',pad,y);
      ctx.textAlign='right';ctx.font='bold 40px system-ui,sans-serif';ctx.fillText(invoice.total,w-pad,y);
      if(invoice.cashReceived){y+=40;rowMeta('Efectivo recibido: '+invoice.cashReceived,'Cambio: '+(invoice.changeDue||'$0'))}
      if(invoice.paymentBreakdown){y+=34;for(const line of wrap('Pagos: '+invoice.paymentBreakdown,'22px system-ui,sans-serif',cw)){ctx.fillStyle='#4c554f';ctx.font='22px system-ui,sans-serif';ctx.textAlign='left';ctx.fillText(line,pad,y);y+=30}}
      if(invoice.pending){y+=38;rowMeta('Pagado '+invoice.paid,'Saldo pendiente '+invoice.pending)}
      if(invoice.notes){y+=34;for(const line of wrap('Nota: '+invoice.notes,'22px system-ui,sans-serif',cw)){ctx.fillStyle='#3a443d';ctx.font='22px system-ui,sans-serif';ctx.textAlign='left';ctx.fillText(line,pad,y);y+=30}}
      const out=document.createElement('canvas');out.width=w;out.height=Math.min(tmp.height,y+52);
      out.getContext('2d').drawImage(tmp,0,0,w,out.height,0,0,w,out.height);
      return out;
    }
    function shareReceipt(id){
      const s=state.sales.find(x=>x.id===id);if(!s)return;
      const disc=Number(s.discount)||0,sub=Number(s.subtotal)||(Number(s.total)+disc),payEntries=getSalePaymentEntries(s);
      const invoice={business:state.settings.business||'Mi negocio',address:state.settings.address||'',phone:state.settings.phone||'',email:state.settings.email||'',registration:state.settings.registration||'',date:invoiceDate(s),seller:s.seller||state.settings.seller||'—',payment:s.payment==='Pendiente'?'Por definir':s.payment||'—',status:pending(s)>0?'Pendiente':'Pagada',folio:s.folio||'0001',customer:s.customer||'',subtotal:money(sub),discount:disc>0?money(disc):'',cashReceived:Number(s.cashReceived)>0?money(s.cashReceived):'',changeDue:Number(s.cashReceived)>0?money(s.changeDue||0):'',paymentBreakdown:payEntries.length>1?payEntries.map(p=>`${p.method} ${money(p.amount)}`).join(' · '):'',notes:s.notes||'',total:money(s.total),paid:money(s.paid),pending:pending(s)>0?money(pending(s)):'',items:getSaleItems(s).map(item=>({product:item.product,qty:String(item.qty),unitPrice:money(item.unitPrice),total:money(item.total)}))};
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
    window.notasBack=()=>{if(closePhotoZoom())return true;if(modal){if(modal.type==='sale'&&saleStep==='review'){captureSaleMeta();saleStep='pick';render()}else closeModal();return true}if(cloud.publicStoreId&&!cloud.publicViaLink){clearCloudListeners();cloud.publicStoreId='';cloud.publicCart={};initCloud();render();return true}if(page!=='inicio'){page='inicio';render();return true}return false};
    function bindPageActions(){ }
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){if(closePhotoZoom())return;escModal(e);return}
      if(modal?.type==='calc'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
        const k=e.key==='Enter'?'=':e.key==='Backspace'?'DEL':e.key==='c'||e.key==='C'?'C':/^[0-9+\-*/.%]$/.test(e.key)?e.key:'';
        if(k){e.preventDefault();document.querySelector(`[data-calc-key="${CSS.escape(k)}"]`)?.click();return}
      }
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
        const s=document.getElementById('list-search');
        if(s){e.preventDefault();s.focus();s.select()}
      }
    });
    document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;if(a==='close')closeModal();else if(a==='toggle-theme'){applyTheme(theme==='dark'?'light':'dark');render();toast(theme==='dark'?'Modo oscuro activado':'Modo claro activado')}else if(a==='toggle-seller-preview'){if(!isRealOwner())return;cloud.previewSeller=!cloud.previewSeller;modal=null;if(cloud.previewSeller&&['gastos','proveedores','reportes','equipo'].includes(page))page='inicio';render();toast(cloud.previewSeller?'Vista previa: así ve Notas tu vendedor':'Volviste a tu vista de Dueño')}else if(a==='settings'||a==='export'||a==='copy-catalog'||a==='auth'||a==='account'||a==='onboarding'||a==='calculator'||a==='cash-close')action(a);else if(a==='import'){document.getElementById('import-backup-file')?.click()}else if(a==='check-update'){checkForUpdates(true)}else if(a==='apply-update'){applyUpdate()}else if(a==='print'){if(window.NotasApp?.printPage)window.NotasApp.printPage();else window.print()}else if(a==='save-settings'){if(isSellerRole())return toast('Solo el dueño puede editar la configuración',true);state.settings.business=document.getElementById('business-name').value.trim()||'Mi negocio';state.settings.address=document.getElementById('business-address').value.trim();state.settings.phone=document.getElementById('business-phone').value.trim();state.settings.email=document.getElementById('business-email').value.trim();state.settings.registration=document.getElementById('business-registration').value.trim();state.settings.seller=document.getElementById('business-seller').value.trim();state.settings.currency=document.getElementById('currency').value;state.settings.cashFloat=Math.max(0,Number(document.getElementById('cash-float')?.value)||0);state.settings.allowNegativeStock=Boolean(document.getElementById('allow-negative-stock')?.checked);save();if(isCloudActive())cloudSaveSettings().catch(err=>toast(err?.message||'No se pudo guardar en la nube',true));modal=null;render();toast('Configuración guardada')}else if(a==='reset'){if(isCloudActive())return toast('En modo nube gestiona los datos desde tus secciones',true);if(confirm('¿Restablecer Notas y reemplazar tus registros por datos de demostración?')){if(window.NotasApp?.removeProductImage)state.products.forEach(p=>window.NotasApp.removeProductImage(p.id));state=seed();state.settings={business:'Mi negocio',currency:'MXN',address:'',phone:'',email:'',registration:'',seller:'',allowNegativeStock:true,cashFloat:0,...(state.settings||{})};state.sales.forEach((sale,index)=>sale.folio=String(state.sales.length-index).padStart(4,'0'));state.saleSequence=Math.max(1,...state.sales.map(sale=>(Number(sale.folio)||0)+1));save();modal=null;render();toast('Datos de demostración restaurados')}}else if(a.startsWith('share-receipt:'))shareReceipt(a.split(':')[1]);else if(a.startsWith('collect:')||a.startsWith('receipt:')||a.startsWith('adjust:'))action(a)});
    window.addEventListener('resize',()=>{if(page==='reportes')drawCharts()});
    if('serviceWorker'in navigator && location.protocol!=='file:')window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').then(reg=>{swRegistration=reg;reg.addEventListener('updatefound',()=>{const nw=reg.installing;nw?.addEventListener('statechange',()=>{if(nw.state==='installed'&&navigator.serviceWorker.controller){updateInfo=updateInfo||{webVersion:APP_LOCAL_VERSION.webVersion,notes:'Nueva versión web lista.'};render()}})})}).catch(()=>{});checkForUpdates(false)});
    else window.addEventListener('load',()=>checkForUpdates(false));
    restoreModalDraft();
    initCloud();
    render();
    receiveCameraResult();
  })();
