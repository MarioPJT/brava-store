import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Heart, LayoutDashboard, MapPin, Menu, Minus, Navigation, Plus, Search, ShoppingBag, SlidersHorizontal, Sparkles, Star, Store, X } from 'lucide-react';
import AdminWorkspace from './AdminWorkspace';
import SellerWorkspace from './SellerWorkspace';
import { fromDatabaseProduct, supabase, supabaseConfigured, toDatabaseProduct, uploadProductImage } from './lib/supabase';
import { categoriesIn } from './lib/productCategories';

const products = [
  { id: 1, name: 'Gorra Sombra', seller: 'Taller Nómada', price: 89000, category: 'Gorras', color: 'Arena', style: 'Minimal', stock: 8, badge: 'Favorito', img: 'photo-1588850561407-ed78c282e89b', description: 'Una silueta clásica, reinterpretada con calma. Confeccionada en lona de algodón de gramaje medio, pensada para acompañarte todos los días.', material: '100% algodón · lona de 280 g', adjust: 'Talla única · correa ajustable', rating: 4.8, reviews: 18 },
  { id: 2, name: 'Visera Horizonte', seller: 'Casa Brava', price: 76000, category: 'Gorras', color: 'Negro', style: 'Urbano', stock: 12, badge: 'Nuevo', img: 'photo-1521369909029-2afed882baee', description: 'Perfil bajo, visera curva y una textura que mejora con el tiempo. Un básico bien resuelto, sin más de lo necesario.', material: 'Algodón lavado · hebilla metálica', adjust: 'Ajustable · contorno 54–60 cm', rating: 4.9, reviews: 12 },
  { id: 3, name: 'Gorra Línea', seller: 'Oficio Local', price: 112000, category: 'Gorras', color: 'Verde', style: 'Bordado', stock: 4, badge: 'Edición local', img: 'photo-1575428652377-a2d80e2277fc', description: 'Una pieza de edición local con bordado tonal de puntada compacta. Producida en lotes pequeños por talleres independientes.', material: 'Dril de algodón · bordado artesanal', adjust: 'Correa ajustable con hebilla', rating: 4.7, reviews: 9 },
  { id: 4, name: 'Riñonera Tránsito', seller: 'Taller Nómada', price: 139000, category: 'Accesorios', color: 'Negro', style: 'Urbano', stock: 6, badge: '', img: 'photo-1553062407-98eeb64c6a62', description: 'Lo esencial, siempre a mano. Una riñonera compacta en lona resistente, con bolsillo interior y herrajes de acabado mate.', material: 'Lona reciclada · forro de algodón', adjust: 'Correa regulable · 72–118 cm', rating: 4.6, reviews: 7 },
  { id: 5, variants: ['S/M','L/XL'], name: 'Bucket Terral', seller: 'Casa Brava', price: 98000, category: 'Gorras', color: 'Arena', style: 'Minimal', stock: 0, badge: 'Agotado', img: 'photo-1534215754734-18e55d13e346', description: 'Volumen ligero y protección solar con una forma que no pasa de moda. Diseñado para doblar y guardar fácilmente.', material: 'Sarga de algodón orgánico', adjust: 'Dos tallas: S/M y L/XL', rating: 4.9, reviews: 14 },
  { id: 6, name: 'Morral Punto Cero', seller: 'Oficio Local', price: 189000, category: 'Accesorios', color: 'Verde', style: 'Urbano', stock: 5, badge: 'Nuevo', img: 'photo-1553062407-98eeb64c6a62', description: 'Un compañero de ciudad, funcional y sin volumen extra. Compartimento principal amplio, bolsillo exterior y espalda cómoda.', material: 'Lona de algodón · herrajes metálicos', adjust: '18 L · correas acolchadas', rating: 4.8, reviews: 5 },
  { id: 7, name: 'Gorra Umbral', seller: 'Casa Brava', price: 92000, category: 'Gorras', color: 'Azul', style: 'Minimal', stock: 3, badge: '', img: 'photo-1588850561407-ed78c282e89b', description: 'Algodón de tacto suave y una visera equilibrada. Ese detalle que cierra el conjunto sin hacer ruido.', material: 'Algodón cepillado · 6 paneles', adjust: 'Talla única · ajuste posterior', rating: 4.7, reviews: 8 },
  { id: 8, name: 'Tote Después', seller: 'Taller Nómada', price: 64000, category: 'Accesorios', color: 'Arena', style: 'Minimal', stock: 15, badge: '', img: 'photo-1544816155-12df9643f363', description: 'Una bolsa ligera y resistente para cargar lo que te acompaña. Costuras reforzadas y espacio para el día a día.', material: 'Lienzo de algodón · 340 g', adjust: '40 × 36 cm · asas largas', rating: 4.8, reviews: 6 },
];
const money = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const photo = (id, width=720) => id?.startsWith('http') ? id : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
const readSaved = key => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
const readStoreSettings = () => { try { return JSON.parse(localStorage.getItem('brava-store-settings') || 'null'); } catch { return null; } };
const safeWebsiteUrl = (value,allowedHosts) => { try { const url=new URL(value);return url.protocol==='https:'&&allowedHosts.some(host=>url.hostname===host||url.hostname.endsWith(`.${host}`))?url.href:''; } catch { return ''; } };
const defaultStoreOptions = { announcement_enabled:true, whatsapp_url:'', shipping_fee:null, free_shipping_minimum:null, dispatch_days:'', shipping_carriers:[], hide_out_of_stock:false, seo_title:'', seo_description:'' };

class AdminWorkspaceBoundary extends React.Component {
  state={error:null};
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error){console.error('Admin workspace render failed',error);}
  render(){return this.state.error?<div className="admin-render-error"><b>No se pudo abrir el panel de administración.</b><span>{String(this.state.error.message||this.state.error)}</span><button onClick={()=>this.setState({error:null})}>Volver a intentar</button></div>:this.props.children;}
}

function App() {
  const [page, setPage] = useState(() => new URLSearchParams(window.location.search).get('payment') === 'pending' ? 'carrito' : 'inicio'), [selected, setSelected] = useState(products[0]);
  const [catalog, setCatalog] = useState(() => readSaved('brava-products').length ? readSaved('brava-products') : products);
  const [authUser, setAuthUser] = useState(null), [authMode, setAuthMode] = useState('login'), [authEmail, setAuthEmail] = useState(''), [authPassword, setAuthPassword] = useState(''), [authBusy, setAuthBusy] = useState(false);
  const [profile, setProfile] = useState(null), [sellerProfile,setSellerProfile]=useState(null), [sellerProfileLoading,setSellerProfileLoading]=useState(false), [sellerApplications,setSellerApplications]=useState([]), [sellerAppsBusy,setSellerAppsBusy]=useState(false), [adminSection, setAdminSection] = useState('overview'), [adminUsers, setAdminUsers] = useState([]), [usersBusy, setUsersBusy] = useState(false);
  const [campaigns, setCampaigns] = useState([]), [campaignFormOpen, setCampaignFormOpen] = useState(false), [editingCampaign, setEditingCampaign] = useState(null);
  const [storeSettings, setStoreSettings] = useState(()=>{const saved=readStoreSettings()||{};return {store_name:'BRAVA',support_email:'',instagram_url:'',announcement:'Diseño independiente · Hecho para acompañarte',...saved,settings_data:{...defaultStoreOptions,...saved.settings_data}};}), [settingsSaving, setSettingsSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null), [productFormOpen, setProductFormOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [cart, setCart] = useState(() => readSaved('brava-cart')), [saved, setSaved] = useState(() => readSaved('brava-favorites')), [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todo'), [sort, setSort] = useState('Destacados');
  const storefrontCategories = useMemo(() => ['Todo', ...categoriesIn(catalog)], [catalog]);
  const [filters, setFilters] = useState({color:'Todos',seller:'Todos',availability:'Todas'}), [detailQty, setDetailQty] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false), [mobileNav, setMobileNav] = useState(false), [notice, setNotice] = useState('');
  const [checkoutDone, setCheckoutDone] = useState(() => new URLSearchParams(window.location.search).get('payment') === 'pending'), [activeTab, setActiveTab] = useState('Perfil');
  const [paymentReference, setPaymentReference] = useState(() => new URLSearchParams(window.location.search).get('reference') || '');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [reviewRefresh, setReviewRefresh] = useState(0), [reviewSnippets, setReviewSnippets] = useState({});
  const [form, setForm] = useState({ name: '', surname: '', email: '', address: '', extraAddress: '', locationNotes: '', city: '', department: '', postalCode: '', phone: '', documentType: 'C.C.', documentNumber: '', marketingOptIn: false, saveInfo: false, acceptedTerms: false });
  const [shippingCarrierId, setShippingCarrierId] = useState('');
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const wompiCheckoutEnabled = import.meta.env.VITE_WOMPI_CHECKOUT_ENABLED === 'true';
  // The JSON settings object contains only public storefront values, never payment credentials or secrets.
  const storeOptions = {...defaultStoreOptions,...storeSettings.settings_data};
  const whatsappHref=safeWebsiteUrl(storeOptions.whatsapp_url,['wa.me','whatsapp.com']);
  const instagramHref=safeWebsiteUrl(storeSettings.instagram_url,['instagram.com']);
  const shippingConfigured = storeOptions.shipping_fee !== null && storeOptions.shipping_fee !== '';
  const freeShippingMinimum = Number(storeOptions.free_shipping_minimum)||0;
  const qualifiesForFreeShipping = freeShippingMinimum>0&&subtotal>=freeShippingMinimum;
  const baseShippingFee=shippingConfigured?Number(storeOptions.shipping_fee)||0:null;
  const shippingCarriers=(storeOptions.shipping_carriers||[]).filter(carrier=>carrier.active!==false&&carrier.name?.trim()).map(carrier=>({...carrier,estimated_fee:carrier.fee!==null&&carrier.fee!==''?Number(carrier.fee):baseShippingFee}));
  const selectedShippingCarrier=shippingCarriers.find(carrier=>carrier.id===shippingCarrierId)||shippingCarriers[0]||null;
  const selectedCarrierFee=selectedShippingCarrier?.estimated_fee??null;
  const shippingEstimate = qualifiesForFreeShipping ? 0 : selectedShippingCarrier ? selectedCarrierFee : shippingConfigured ? Number(storeOptions.shipping_fee)||0 : null;
  const storefrontCatalog = useMemo(() => catalog.filter(p => !storeSettings.settings_data?.hide_out_of_stock || p.stock > 0), [catalog, storeSettings.settings_data?.hide_out_of_stock]);
  const visible = useMemo(() => {
    let list = storefrontCatalog.filter(p => (category === 'Todo' || p.category === category) && (p.name + p.seller + p.style + p.color).toLowerCase().includes(query.toLowerCase()) && (filters.color==='Todos'||p.color===filters.color) && (filters.seller==='Todos'||p.seller===filters.seller) && (filters.availability==='Todas'||(filters.availability==='Disponible'?p.stock>0:p.stock===0)));
    if (sort === 'Precio menor') list.sort((a,b)=>a.price-b.price);
    if (sort === 'Precio mayor') list.sort((a,b)=>b.price-a.price);
    if (sort === 'Novedades') list.sort((a,b)=>(b.badge==='Nuevo')-(a.badge==='Nuevo'));
    return list;
  }, [storefrontCatalog, category, query, sort, filters]);
  useEffect(()=>{localStorage.setItem('brava-cart',JSON.stringify(cart));},[cart]);
  useEffect(()=>{localStorage.setItem('brava-favorites',JSON.stringify(saved));},[saved]);
  useEffect(()=>{if(!supabaseConfigured){localStorage.setItem('brava-products',JSON.stringify(catalog));return;}},[catalog]);
  // Hydrate the current session and catalog, then unsubscribe when the app unmounts.
  useEffect(()=>{
    if(!supabase) return;
    let alive=true;
    supabase.auth.getSession().then(({data})=>{if(alive)setAuthUser(data.session?.user||null);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setAuthUser(session?.user||null));
    supabase.from('products').select('*').order('id').then(({data,error})=>{if(!alive)return;if(error){notify(`No se pudo cargar el catalogo: ${error.message}`);return;}if(data){setCatalog(data.map(fromDatabaseProduct));localStorage.setItem('brava-products',JSON.stringify(data.map(fromDatabaseProduct)));}});
    return ()=>{alive=false;subscription.unsubscribe();};
  },[]);
  // Load one recent verified buyer comment per product for the storefront cards.
  useEffect(()=>{
    if(!supabase||!catalog.length){setReviewSnippets({});return;}
    let alive=true;
    supabase.from('product_reviews').select('id,product_id,author_name,rating,comment,created_at').in('product_id',catalog.map(product=>product.id)).order('created_at',{ascending:false}).limit(200).then(({data,error})=>{
      if(!alive)return;
      if(error){console.error('No se pudieron cargar las opiniones de las tarjetas',error);return;}
      const latest={};for(const review of data||[]){if(!latest[review.product_id])latest[review.product_id]=review;}
      setReviewSnippets(latest);
    });
    return()=>{alive=false;};
  },[catalog,reviewRefresh]);
  useEffect(()=>{
    if(!supabase||!authUser){setProfile(null);return;}
    let alive=true;
    const loadProfile=async()=>{let {data,error}=await supabase.from('profiles').select('id,display_name,role').eq('id',authUser.id).maybeSingle();if(!data&&!error){const created=await supabase.from('profiles').insert({id:authUser.id,display_name:authUser.email?.split('@')[0]||'Mi cuenta',role:'user'}).select('id,display_name,role').single();data=created.data;error=created.error;}if(alive){setProfile(data||null);if(error)notify(`No se pudo cargar el perfil: ${error.message}`);}};
    loadProfile();return()=>{alive=false;};
  },[authUser?.id]);
  useEffect(()=>{
    if(!supabase||!authUser){setSellerProfile(null);setSellerProfileLoading(false);return;}
    let alive=true;
    setSellerProfileLoading(true);
    supabase.from('seller_profiles').select('*').eq('user_id',authUser.id).maybeSingle().then(({data,error})=>{
      if(!alive)return;
      if(error){notify(`No se pudo cargar tu perfil de vendedor: ${error.message}`);setSellerProfileLoading(false);return;}
      setSellerProfile(data||null);
      setSellerProfileLoading(false);
    });
    return()=>{alive=false;};
  },[authUser?.id]);
  useEffect(()=>{
    if(!supabase){const localSettings=readStoreSettings();if(localSettings)setStoreSettings({...localSettings,settings_data:{...defaultStoreOptions,...(localSettings.settings_data||{})}});return;}
    let alive=true;
    supabase.from('store_settings').select('*').eq('id',1).maybeSingle().then(({data,error})=>{if(!alive)return;if(error){notify(`No se pudo cargar la configuración: ${error.message}`);return;}if(data)setStoreSettings({...data,settings_data:{...defaultStoreOptions,...(data.settings_data||{})}});});
    return()=>{alive=false;};
  },[]);
  // Keep search previews and the browser tab aligned with the admin's SEO settings.
  useEffect(()=>{
    const description=storeSettings.settings_data?.seo_description?.trim()||'BRAVA — gorras y accesorios de autor. Diseño independiente, hecho para durar.';
    document.title=storeSettings.settings_data?.seo_title?.trim()||`${storeSettings.store_name||'BRAVA'} — Objetos para llevar`;
    let meta=document.querySelector('meta[name="description"]');
    if(!meta){meta=document.createElement('meta');meta.name='description';document.head.appendChild(meta);}
    meta.content=description;
  },[storeSettings.store_name,storeSettings.settings_data?.seo_title,storeSettings.settings_data?.seo_description]);
  useEffect(()=>{
    if(page!=='panel-admin'||profile?.role!=='admin'||!supabase)return;
    let alive=true;
    setUsersBusy(true);
    supabase.rpc('admin_list_users').then(({data,error})=>{if(alive){if(error)notify(`No se pudieron cargar las cuentas: ${error.message}`);else setAdminUsers(data||[]);setUsersBusy(false);}});
    return()=>{alive=false;};
  },[page,profile?.role]);
  useEffect(()=>{
    if(profile?.role!=='admin'||!supabase)return;
    let alive=true,initialized=false;
    const knownIds=new Set();
    setSellerAppsBusy(true);
    const refreshSellerApplications=async()=>{
      const {data,error}=await supabase.from('seller_profiles').select('*').order('created_at',{ascending:false});
      if(!alive)return;
      if(error){notify(`No se pudieron cargar las solicitudes de vendedores: ${error.message}`);setSellerAppsBusy(false);return;}
      const applications=data||[];
      const newPending=initialized?applications.filter(application=>application.status==='pending'&&!knownIds.has(application.user_id)):[];
      applications.forEach(application=>knownIds.add(application.user_id));
      setSellerApplications(applications);
      setSellerAppsBusy(false);
      if(newPending.length){
        notify(newPending.length===1?`Nueva solicitud de ${newPending[0].store_name}. Revísala en Vendedores.`:`Hay ${newPending.length} nuevas solicitudes de vendedores para revisar.`);
      }
      initialized=true;
    };
    refreshSellerApplications();
    const interval=window.setInterval(refreshSellerApplications,15000);
    return()=>{alive=false;window.clearInterval(interval);};
  },[profile?.role]);
  useEffect(()=>{
    if(page!=='panel-admin'||adminSection!=='marketing'||profile?.role!=='admin'||!supabase)return;
    let alive=true;
    supabase.from('marketing_campaigns').select('*').order('created_at',{ascending:false}).then(({data,error})=>{if(alive){if(error)notify(`No se pudieron cargar las campañas: ${error.message}`);else setCampaigns(data||[]);}});
    return()=>{alive=false;};
  },[page,adminSection,profile?.role]);
  const go = p => { setPage(p); setMobileNav(false); window.scrollTo({top:0,behavior:'smooth'}); };
  // The cart is local demo state; this does not reserve stock or create a paid order.
  const add = (p,qty=1,variant='') => { setCart(old => { const found=old.find(i=>i.id===p.id&&i.variant===variant); return found ? old.map(i=>i.id===p.id&&i.variant===variant?{...i,qty:Math.min(p.stock,i.qty+qty)}:i) : [...old,{...p,variant,key:`${p.id}-${variant||'unica'}`,qty:Math.min(p.stock,qty)}]; }); setNotice('Añadido a tu bolsa'); setTimeout(()=>setNotice(''),2300); };
  const changeQty = (key,delta) => setCart(old=>old.map(i=>(i.key||`${i.id}-unica`)===key?{...i,qty:Math.min(i.stock,i.qty+delta)}:i).filter(i=>i.qty>0));
  const toggleSave = id => setSaved(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  const openProduct = p => { setSelected(p); setDetailQty(1); setSelectedVariant(p.variants?.[0]||''); go('producto'); };
  const notify = message => { setNotice(message); setTimeout(()=>setNotice(''),3200); };
  const submitAuth = async e => { e.preventDefault(); if(!supabase){notify('Para activar cuentas reales, configura las variables de Supabase indicadas en .env.example.');return;} setAuthBusy(true); const result=authMode==='register'?await supabase.auth.signUp({email:authEmail,password:authPassword}):await supabase.auth.signInWithPassword({email:authEmail,password:authPassword}); setAuthBusy(false); if(result.error)notify(result.error.message); else if(authMode==='register'&&!result.data.session)notify('Cuenta creada. Revisa tu correo para confirmar el registro.'); else {setAuthUser(result.data.user);notify(authMode==='register'?'Cuenta creada.':'Sesión iniciada.');} };
  const saveProduct = async product => {
    const {imageFile,...productData}=product;
    if(!supabase){notify('Conecta una cuenta y el almacenamiento de Supabase para guardar las fotografías.');return;}
    try{
      const savedData={...productData};
      if(imageFile)savedData.img=await uploadProductImage(imageFile,authUser?.id);
      const query=product.id?supabase.from('products').update(toDatabaseProduct(savedData)).eq('id',product.id).select().single():supabase.from('products').insert(toDatabaseProduct(savedData)).select().single();
      const {data,error}=await query;
      if(error)throw error;
      const savedProduct=fromDatabaseProduct(data);
      setCatalog(old=>product.id?old.map(item=>item.id===product.id?savedProduct:item):[savedProduct,...old]);
      setProductFormOpen(false);setEditingProduct(null);notify('Producto guardado.');
    }catch(error){notify(`No se pudo guardar el producto: ${error.message}`);}
  };
  const reviewSeller=async(seller,status)=>{const {error}=await supabase.rpc('admin_review_seller',{target_user_id:seller.user_id,target_status:status});if(error){notify(`No se pudo actualizar el vendedor: ${error.message}`);return;}setSellerApplications(old=>old.map(item=>item.user_id===seller.user_id?{...item,status,reviewed_at:new Date().toISOString()}:item));notify(status==='approved'?'Vendedor aprobado. Ya puede enviar productos a revisión.':status==='suspended'?'Vendedor suspendido.':'Solicitud rechazada.');};
  const reviewProduct=async(product,status)=>{const {data,error}=await supabase.from('products').update({publication_status:status,moderation_note:status==='rejected'?'Contacta a BRAVA para corregir la ficha antes de volver a enviar.':''}).eq('id',product.id).select().single();if(error){notify(`No se pudo actualizar la publicación: ${error.message}`);return;}const savedProduct=fromDatabaseProduct(data);setCatalog(old=>old.map(item=>item.id===product.id?{...savedProduct,publication_status:data.publication_status,moderation_note:data.moderation_note}:item));notify(status==='published'?'Producto aprobado y publicado.':'Producto devuelto al vendedor.');};
  const deleteProduct = async product => { if(!window.confirm(`¿Eliminar ${product.name}?`))return;if(supabase){const {error}=await supabase.from('products').delete().eq('id',product.id);if(error){notify(`No se pudo eliminar: ${error.message}`);return;}}setCatalog(old=>old.filter(p=>p.id!==product.id));notify('Producto eliminado.'); };
  const signOut = async()=>{if(supabase)await supabase.auth.signOut();setAuthUser(null);setProfile(null);go('inicio');};
  // PostgreSQL validates the caller and target role inside this RPC; the UI cannot grant itself admin.
  const changeUserRole=async user=>{const nextRole=user.role==='admin'?'user':'admin';const {error}=await supabase.rpc('admin_set_user_role',{target_user_id:user.id,target_role:nextRole});if(error){notify(`No se pudo cambiar el rol: ${error.message}`);return;}setAdminUsers(old=>old.map(item=>item.id===user.id?{...item,role:nextRole}:item));notify(`Rol actualizado: ${nextRole}.`);};
  const saveCampaign=async campaign=>{const payload={...campaign,created_by:campaign.created_by||authUser?.id,updated_at:new Date().toISOString()};const query=campaign.id?supabase.from('marketing_campaigns').update(payload).eq('id',campaign.id).select().single():supabase.from('marketing_campaigns').insert(payload).select().single();const {data,error}=await query;if(error){notify(`No se pudo guardar la campaña: ${error.message}`);return;}setCampaigns(old=>campaign.id?old.map(item=>item.id===campaign.id?data:item):[data,...old]);setCampaignFormOpen(false);setEditingCampaign(null);notify('Borrador guardado.');};
  const deleteCampaign=async campaign=>{if(!window.confirm(`¿Eliminar el borrador “${campaign.name}”?`))return;const {error}=await supabase.from('marketing_campaigns').delete().eq('id',campaign.id);if(error){notify(`No se pudo eliminar: ${error.message}`);return;}setCampaigns(old=>old.filter(item=>item.id!==campaign.id));notify('Borrador eliminado.');};
  // Persist to the browser for local demos, or to the RLS-protected settings row for signed-in stores.
  const updateStoreSettings=async e=>{e.preventDefault();setSettingsSaving(true);const payload={...storeSettings,settings_data:{...defaultStoreOptions,...storeSettings.settings_data},updated_at:new Date().toISOString()};if(!supabase){localStorage.setItem('brava-store-settings',JSON.stringify(payload));setStoreSettings(payload);setSettingsSaving(false);notify('Configuración guardada en este navegador.');return;}const {data,error}=await supabase.from('store_settings').upsert({...payload,id:1},{onConflict:'id'}).select().single();setSettingsSaving(false);if(error){notify(`No se pudo guardar la configuración: ${error.message}`);return;}setStoreSettings(data);notify('Configuración guardada.');};
  const submitWompiCheckout = async e => {
    e.preventDefault();
    if(!form.name.trim()||!form.surname.trim()||!form.email.includes('@')||!form.address.trim()||!form.city.trim()||!form.department.trim()||!form.phone.trim()||!form.documentNumber.trim()||!form.acceptedTerms){notify('Completa los datos obligatorios y acepta los términos para continuar.');return;}
    if(!wompiCheckoutEnabled||!supabase){notify('El pago seguro todavía no está activado.');return;}
    setCheckoutBusy(true);
    const {data,error}=await supabase.functions.invoke('create-wompi-checkout',{body:{acceptedTerms:form.acceptedTerms,customer:form,items:cart.map(item=>({id:item.id,quantity:item.qty,variant:item.variant||null})),shippingCarrierId:selectedShippingCarrier?.id||null}});
    setCheckoutBusy(false);
    if(error||!data?.paymentUrl){notify(data?.error||error?.message||'No se pudo iniciar el pago.');return;}
    setPaymentReference(data.reference);
    window.location.assign(data.paymentUrl);
  };

  return <>
    {page!=='panel-admin'&&<>
    <div className="demo-bar"><span><Sparkles size={12}/> TIENDA DE DEMOSTRACIÓN</span><span>Las compras no se procesan ni generan pagos reales</span>{storeSettings.settings_data?.announcement_enabled!==false&&storeSettings.announcement&&<span>{storeSettings.announcement}</span>}</div>
    <header className="header">
      <button className="icon mobile-menu" aria-label="Abrir menú" onClick={()=>setMobileNav(!mobileNav)}>{mobileNav?<X/>:<Menu/>}</button>
      <button className="wordmark" onClick={()=>go('inicio')} aria-label={`${storeSettings.store_name||'BRAVA'}, inicio`}>{storeSettings.store_name||'BRAVA'}<span>®</span></button>
      <nav className={mobileNav?'nav open':'nav'} aria-label="Navegación principal">
        <button className={page==='catalogo'?'active':''} onClick={()=>go('catalogo')}>Tienda</button><button onClick={()=>{setCategory('Gorras');go('catalogo')}}>Gorras</button><button onClick={()=>{setCategory('Accesorios');go('catalogo')}}>Accesorios</button><button onClick={()=>go('historia')}>Nuestra historia</button>
      </nav>
      <div className="header-actions"><label className="searchbox"><Search size={17}/><input value={query} onChange={e=>{setQuery(e.target.value);if(e.target.value)go('catalogo')}} placeholder="Buscar" aria-label="Buscar productos"/><kbd>⌘ K</kbd></label>{profile?.role==='admin'&&<button className="admin-shortcut" onClick={()=>{setAdminSection('overview');go('panel-admin')}}><LayoutDashboard size={15}/> Administración</button>}{sellerProfile&&<button className="admin-shortcut" onClick={()=>go('panel-vendedor')}><Store size={15}/> Mi tienda</button>}<button className="icon account-btn" aria-label="Mi cuenta" onClick={()=>go('cuenta')}><span>Cuenta</span></button><button className="icon bag-button" aria-label={`Bolsa, ${cart.reduce((n,i)=>n+i.qty,0)} artículos`} onClick={()=>go('carrito')}><ShoppingBag size={19}/><span className="bag-count">{cart.reduce((n,i)=>n+i.qty,0)}</span></button></div>
    </header>
    </>}
    <main>
      {page==='inicio' && <>
        <section className="hero"><img src={photo('photo-1521369909029-2afed882baee',1800)} alt="Gorra de demostración fotografiada para la campaña BRAVA"/><div className="hero-shade"/><div className="hero-copy"><p className="eyebrow">BRAVA · DISEÑO INDEPENDIENTE</p><h1>Piezas para<br/>moverte.</h1><p>Gorras y accesorios hechos para salir contigo.</p><button className="btn light" onClick={()=>{setCategory('Todo');go('catalogo')}}>Explorar la tienda <ArrowRight size={16}/></button></div><div className="hero-note"><span>Objetos para llevar, Bogotá</span><span>Una selección de talleres independientes</span></div></section>
        <section className="intro section-pad"><div><span className="eyebrow">HECHO PARA EL USO DIARIO</span><h2>Se quedan contigo<br/>más de una temporada.</h2></div><div className="intro-copy"><p>Materiales honestos, oficio cercano y formas que funcionan en la calle. Piezas independientes para usar una y otra vez.</p><button className="text-link" onClick={()=>go('historia')}>La historia detrás de BRAVA <ArrowUpRight size={15}/></button></div></section>
        <section className="category-showcase section-pad"><div className="section-heading"><div><span className="eyebrow">ENCUENTRA TU RUTA</span><h2>Explora por categoría</h2></div></div><div className="category-cards">{[['Gorras','photo-1521369909029-2afed882baee','Formas para todos los días'],['Accesorios','photo-1553062407-98eeb64c6a62','Lo esencial, bien resuelto']].map(([name,img,caption])=><button className="category-card" key={name} onClick={()=>{setCategory(name);go('catalogo')}}><img src={photo(img,900)} alt=""/><span className="category-overlay"/><span className="category-card-copy"><small>{caption}</small><b>{name}</b><i>Explorar <ArrowUpRight size={15}/></i></span></button>)}</div></section>
        <section className="feature-collection"><div className="feature-image"><img src={photo('photo-1529139574466-a303027c1d8b',1100)} alt="Estilismo de moda urbana, imagen de campaña de demostración"/><span className="image-caption">IMAGEN EDITORIAL DE DEMOSTRACIÓN</span></div><div className="feature-copy"><span className="eyebrow">DISEÑO LOCAL, SIN PRISA</span><h2>El oficio se nota<br/>en los detalles.</h2><p>Costuras, materiales y proporciones resueltos con cuidado. Explora piezas de talleres independientes.</p><button className="btn dark" onClick={()=>go('catalogo')}>Ver piezas seleccionadas <ArrowRight size={16}/></button><span className="feature-index">Explorar colección</span></div></section>
        <section className="products-section section-pad"><div className="section-heading"><div><span className="eyebrow">SELECCIÓN BRAVA</span><h2>Piezas para todos los días</h2></div><button className="text-link" onClick={()=>go('catalogo')}>Ver toda la tienda <ArrowRight size={15}/></button></div><div className="product-grid">{storefrontCatalog.slice(0,4).map(p=><ProductCard key={p.id} p={p} onOpen={openProduct} onAdd={add} saved={saved.includes(p.id)} onSave={toggleSave} review={reviewSnippets[p.id]}/>)}</div></section>
        <section className="values section-pad"><div className="value-head"><span className="eyebrow">LO QUE NOS IMPORTA</span><h2>Compra con criterio.<br/><i>Usa con intención.</i></h2></div><div className="value-grid"><Value title="Hecho con intención" body="Materiales honestos y procesos cuidados, elegidos por quienes hacen cada pieza."/><Value title="Diseño independiente" body="Cada marca conserva su voz. Reunimos creadores locales con una mirada propia."/><Value title="Información clara" body="Precio, vendedor, disponibilidad y condiciones visibles antes de decidir."/></div></section>
        <section className="seller-cta"><div><span className="eyebrow">HECHO POR INDEPENDIENTES</span><h2>Tu trabajo merece<br/>un buen escaparate.</h2><p>Estamos construyendo un lugar para descubrir diseño independiente.</p><button className="btn light" onClick={()=>go('vender')}>Conoce cómo vender <ArrowRight size={16}/></button></div><img src={photo('photo-1523381210434-271e8be1f52b',1000)} alt="Detalles textiles en un taller independiente"/></section>
      </>}
      {page==='catalogo' && <><div className="catalog-top"><div className="breadcrumbs">BRAVA <ChevronRight size={12}/> TIENDA</div><h1>Objetos para llevar.</h1><p>Diseño independiente, elegido para acompañarte.</p></div><section className="catalog section-pad"><div className="catalog-toolbar"><div className="category-pills">{storefrontCategories.map(c=><button key={c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="toolbar-right"><span>{visible.length} piezas</span><button className="filter-button" onClick={()=>setFilterOpen(!filterOpen)}><SlidersHorizontal size={15}/> Filtros</button><label className="sort-label">Ordenar <select value={sort} onChange={e=>setSort(e.target.value)}><option>Destacados</option><option>Novedades</option><option>Precio menor</option><option>Precio mayor</option></select><ChevronDown size={13}/></label></div></div>
        {filterOpen&&<div className="filter-panel"><label>Color<select value={filters.color} onChange={e=>setFilters({...filters,color:e.target.value})}><option>Todos</option>{['Arena','Negro','Verde','Azul'].map(x=><option key={x}>{x}</option>)}</select></label><label>Vendedor<select value={filters.seller} onChange={e=>setFilters({...filters,seller:e.target.value})}><option>Todos</option>{['Casa Brava','Taller Nómada','Oficio Local'].map(x=><option key={x}>{x}</option>)}</select></label><label>Disponibilidad<select value={filters.availability} onChange={e=>setFilters({...filters,availability:e.target.value})}><option>Todas</option><option>Disponible</option><option>Agotado</option></select></label><button className="text-link" onClick={()=>{setFilters({color:'Todos',seller:'Todos',availability:'Todas'});setQuery('');setCategory('Todo')}}>Quitar filtros <X size={14}/></button></div>}
        {visible.length?<div className="product-grid">{visible.map(p=><ProductCard key={p.id} p={p} onOpen={openProduct} onAdd={add} saved={saved.includes(p.id)} onSave={toggleSave} review={reviewSnippets[p.id]}/>)}</div>:<div className="empty"><Search size={25}/><h3>No encontramos esa pieza.</h3><p>Prueba otra búsqueda o quita los filtros.</p><button className="text-link" onClick={()=>{setQuery('');setCategory('Todo')}}>Ver toda la tienda</button></div>}</section></>}
      {page==='producto'&&<section className="detail section-pad"><button className="back-link" onClick={()=>go('catalogo')}><ArrowLeft size={15}/> Volver a la tienda</button><div className="detail-layout"><div className="gallery"><img className="gallery-main" src={photo(selected.img,1100)} alt={`${selected.name}, vista principal`}/><img src={photo(selected.img,650)} alt={`${selected.name}, detalle de material`}/><span className="image-caption">IMAGEN DE DEMOSTRACIÓN · {selected.seller.toUpperCase()}</span></div><div className="detail-info"><span className="eyebrow">{selected.category.toUpperCase()} · {selected.seller.toUpperCase()}</span><h1>{selected.name}</h1><div className="detail-rating"><Star size={14} fill="currentColor"/> Opiniones de compradores</div><p className="detail-price">{money(selected.price)} <small>COP</small></p><p className="detail-desc">{selected.description}</p>{selected.variants?.length>0&&<label className="variant-select">Talla / variante<select value={selectedVariant} onChange={e=>setSelectedVariant(e.target.value)}>{selected.variants.map(v=><option key={v}>{v}</option>)}</select></label>}<div className="specs"><div><span>Materiales</span><b>{selected.material}</b></div><div><span>Ajuste</span><b>{selected.adjust}</b></div><div><span>Disponibilidad</span><b>{selected.stock>0?`${selected.stock} disponibles en demo`:'Agotado en demo'}</b></div></div><div className="detail-buy-row"><div className="qty detail-qty"><button aria-label="Reducir cantidad" disabled={detailQty<=1} onClick={()=>setDetailQty(detailQty-1)}><Minus size={13}/></button><span>{detailQty}</span><button aria-label="Aumentar cantidad" disabled={detailQty>=selected.stock} onClick={()=>setDetailQty(detailQty+1)}><Plus size={13}/></button></div><button className="btn dark add-button" disabled={!selected.stock} onClick={()=>add(selected,detailQty,selectedVariant)}>{selected.stock?'Añadir a la bolsa':'Agotado'} <ShoppingBag size={17}/></button></div><p className="shipping-note">{storeOptions.shipping_fee!==null&&storeOptions.shipping_fee!==""?`Envío estimado ${money(Number(storeOptions.shipping_fee)||0)}${Number(storeOptions.free_shipping_minimum)>0?` · gratis desde ${money(Number(storeOptions.free_shipping_minimum))}`:""}. `:"Envío por confirmar. "}{storeOptions.dispatch_days?`Preparación estimada: ${storeOptions.dispatch_days}. `:""}Las fechas finales dependen del destino.</p><div className="seller-card"><div className="seller-avatar">{selected.seller[0]}</div><div><span className="eyebrow">DISEÑO INDEPENDIENTE</span><b>{selected.seller}</b><span>Vendedor de demostración · Colombia</span></div><ArrowUpRight size={16}/></div><ProductReviews product={selected} authUser={authUser} profile={profile} go={go} notify={notify} onPublished={()=>setReviewRefresh(value=>value+1)}/></div></div><div className="section-heading related-head"><div><span className="eyebrow">SIGUE EXPLORANDO</span><h2>También te puede gustar</h2></div></div><div className="product-grid">{storefrontCatalog.filter(p=>p.id!==selected.id).slice(0,4).map(p=><ProductCard key={p.id} p={p} onOpen={openProduct} onAdd={add} saved={saved.includes(p.id)} onSave={toggleSave} review={reviewSnippets[p.id]}/>)}</div></section>}
      {page==='carrito'&&<section className="checkout section-pad"><div className="breadcrumbs">BRAVA <ChevronRight size={12}/> BOLSA</div><h1>Tu bolsa.</h1>{checkoutDone?<div className="confirmation"><span className="confirm-icon"><Check size={28}/></span><span className="eyebrow">PAGO EN VALIDACIÓN</span><h2>Estamos verificando tu pago.</h2><p>Wompi nos notificará cuando confirme la transacción. En ese momento enviaremos la confirmación de compra al correo y al celular registrados.</p>{paymentReference&&<div className="order-number">REFERENCIA · {paymentReference}</div>}<button className="btn dark" onClick={()=>{setCheckoutDone(false);setPaymentReference('');window.history.replaceState({},'',window.location.pathname);go('catalogo')}}>Seguir explorando <ArrowRight size={16}/></button></div>:cart.length===0?<div className="empty cart-empty"><ShoppingBag size={29}/><h2>Tu bolsa está esperando.</h2><p>Encuentra piezas hechas para acompañarte.</p><button className="btn dark" onClick={()=>go('catalogo')}>Explorar la tienda <ArrowRight size={16}/></button></div>:<CheckoutExperience cart={cart} subtotal={subtotal} shippingEstimate={shippingEstimate} freeShippingMinimum={freeShippingMinimum} shippingCarriers={shippingCarriers} selectedCarrierId={selectedShippingCarrier?.id||''} setShippingCarrierId={setShippingCarrierId} dispatchDays={storeOptions.dispatch_days} form={form} setForm={setForm} changeQty={changeQty} openProduct={openProduct} submitCheckout={submitWompiCheckout} checkoutBusy={checkoutBusy} wompiCheckoutEnabled={wompiCheckoutEnabled} money={money} photo={photo}/>}</section>}
      {page==='cuenta'&&<section className="account section-pad"><div className="breadcrumbs">BRAVA <ChevronRight size={12}/> CUENTA</div><span className="eyebrow">TU ESPACIO PERSONAL</span><h1>{authUser?'Hola.':'Tu cuenta.'}</h1>{authUser?<div className="account-content auth-card"><p>Sesión iniciada como <b>{authUser.email}</b></p><p>{profile?.role==='admin'?'Tienes permisos de administración.':'Tu cuenta de cliente está activa.'}</p><button className="btn dark" onClick={()=>go(profile?.role==='admin'?'panel-admin':'catalogo')}>{profile?.role==='admin'?'Abrir administración':'Explorar tienda'} <ArrowRight size={15}/></button>{profile?.role!=='admin'&&<button className="btn light seller-apply-link" onClick={()=>go('panel-vendedor')}>{sellerProfile?'Abrir panel de vendedor':'Quiero vender en BRAVA'} <Store size={15}/></button>}<button className="text-link auth-signout" onClick={signOut}>Cerrar sesión</button></div>:<div className="account-content auth-card"><h2>{authMode==='register'?'Crear cuenta':'Iniciar sesión'}</h2><p>{supabaseConfigured?'Regístrate para guardar tus datos y acceder desde tus dispositivos.':'El registro real se activa al conectar el proyecto de base de datos. La pantalla queda lista para configurarlo.'}</p><form className="auth-form" onSubmit={submitAuth}><label>Correo electrónico<input type="email" required autoComplete="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="nombre@correo.com"/></label><label>Contraseña<input type="password" required minLength="8" autoComplete={authMode==='register'?'new-password':'current-password'} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Mínimo 8 caracteres"/></label><button className="btn dark" disabled={authBusy}>{authBusy?'Un momento…':authMode==='register'?'Crear mi cuenta':'Iniciar sesión'} <ArrowRight size={15}/></button></form><button className="text-link auth-switch" onClick={()=>setAuthMode(authMode==='register'?'login':'register')}>{authMode==='register'?'Ya tengo cuenta · Iniciar sesión':'¿Eres nuevo? Crear cuenta'}</button>{!supabaseConfigured&&<div className="demo-disclaimer"><Sparkles size={16}/><span>Las cuentas y contraseñas no se guardan en este navegador. Configura Supabase para activarlas.</span></div>}</div>}</section>}
      {page==='panel-vendedor'&&<SellerWorkspace user={authUser} profile={sellerProfile} profileLoading={sellerProfileLoading} onProfileChange={setSellerProfile} go={go} notify={notify}/>}
      {page==='panel-admin'&&<AdminWorkspace catalog={catalog} supabaseConfigured={supabaseConfigured} profile={profile} authUser={authUser} adminSection={adminSection} setAdminSection={setAdminSection} adminUsers={adminUsers} usersBusy={usersBusy} sellerApplications={sellerApplications} sellerAppsBusy={sellerAppsBusy} reviewSeller={reviewSeller} reviewProduct={reviewProduct} editingProduct={editingProduct} setEditingProduct={setEditingProduct} setProductFormOpen={setProductFormOpen} productFormOpen={productFormOpen} saveProduct={saveProduct} deleteProduct={deleteProduct} changeUserRole={changeUserRole} campaigns={campaigns} campaignFormOpen={campaignFormOpen} setCampaignFormOpen={setCampaignFormOpen} editingCampaign={editingCampaign} setEditingCampaign={setEditingCampaign} saveCampaign={saveCampaign} deleteCampaign={deleteCampaign} storeSettings={storeSettings} setStoreSettings={setStoreSettings} settingsSaving={settingsSaving} updateStoreSettings={updateStoreSettings} go={go} signOut={signOut}/>}
      {page==='vender'&&<SellerWorkspace user={authUser} profile={sellerProfile} profileLoading={sellerProfileLoading} onProfileChange={setSellerProfile} go={go} notify={notify}/>}
      {page==='historia'&&<section className="story"><div className="story-image"><img src={photo('photo-1490481651871-ab68de25d43d',1200)} alt="Prendas de materiales naturales en una composición de estudio"/><span className="image-caption">OBJETOS PENSADOS PARA DURAR</span></div><div className="story-copy"><span className="eyebrow">SOBRE BRAVA · DEMOSTRACIÓN</span><h1>Diseño con<br/><i>sentido de lugar.</i></h1><p>BRAVA reúne gorras y accesorios de marcas independientes. Un catálogo pequeño, seleccionado por la calidad de sus materiales, el oficio detrás de cada pieza y la claridad con la que se cuenta su historia.</p><p>Esta identidad y el contenido de marca son de demostración, creados para validar una primera experiencia de tienda. La marca, sus vendedores y productos deben verificarse antes de su lanzamiento público.</p><button className="btn dark" onClick={()=>go('catalogo')}>Explorar la tienda <ArrowRight size={15}/></button></div></section>}
      {['envios','devoluciones','privacidad','terminos','contacto'].includes(page)&&<section className="info-page section-pad"><span className="eyebrow">INFORMACIÓN IMPORTANTE</span><h1>{({envios:'Envíos',devoluciones:'Devoluciones',privacidad:'Privacidad',terminos:'Términos y condiciones',contacto:'Contacto'})[page]}.</h1><div className="policy-placeholder"><Sparkles size={18}/><p>Este contenido requiere datos y revisión del operador de la tienda antes de publicar o procesar compras reales.</p><ul><li>Configuración del mercado, zonas y transportadoras.</li><li>Condiciones legales, plazos y responsables de tratamiento.</li><li>Canal de servicio al cliente y datos de contacto verificados.</li></ul><span>CONTENIDO PENDIENTE DE CONFIGURACIÓN · NO USAR COMO POLÍTICA OPERATIVA</span></div></section>}
    </main>
    {page!=='panel-admin'&&<footer className="footer"><div className="footer-top"><div><button className="wordmark footer-mark" onClick={()=>go('inicio')}>{storeSettings.store_name||'BRAVA'}<span>®</span></button><p>Diseño independiente.<br/>Hecho para acompañarte.</p></div><div><span className="footer-label">EXPLORA</span><button onClick={()=>go('catalogo')}>Tienda</button><button onClick={()=>go('historia')}>Nuestra historia</button><button onClick={()=>go('vender')}>Vende con nosotros</button></div><div><span className="footer-label">INFORMACIÓN</span><button onClick={()=>go('envios')}>Envíos</button><button onClick={()=>go('devoluciones')}>Devoluciones</button><button onClick={()=>go('contacto')}>Contacto</button>{storeSettings.support_email&&<a className="footer-contact-link" href={`mailto:${storeSettings.support_email}`}>Correo de soporte</a>}{whatsappHref&&<a className="footer-contact-link" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp</a>}{instagramHref&&<a className="footer-contact-link" href={instagramHref} target="_blank" rel="noreferrer">Instagram</a>}<button onClick={()=>{setAdminSection('overview');go('panel-admin')}}>Administración</button></div><div className="newsletter"><span className="footer-label">UNA NOTA DE VEZ EN CUANDO</span><p>Novedades de la casa, sin ruido.</p><form onSubmit={e=>{e.preventDefault();setNotice('Newsletter de demostración: suscripción no enviada.');setTimeout(()=>setNotice(''),3000)}}><input type="email" required placeholder="Tu correo electrónico" aria-label="Tu correo electrónico"/><button aria-label="Suscribirme"><ArrowRight size={17}/></button></form><small>Suscripción no activa en modo demo.</small></div></div><div className="footer-bottom"><span>© 2026 {storeSettings.store_name||'BRAVA'} STUDIO · TIENDA DEMO</span><span>Precios expresados en COP · Colombia</span><div><button onClick={()=>go('privacidad')}>Privacidad</button><button onClick={()=>go('terminos')}>Términos</button></div></div></footer>}
    {notice&&<div className="toast" role="status">{notice}</div>}
  </>;
}

function AdminPanel({catalog,supabaseConfigured,profile,authUser,adminTab,setAdminTab,adminUsers,usersBusy,editingProduct,setEditingProduct,setProductFormOpen,productFormOpen,saveProduct,deleteProduct,changeUserRole}) {
  if (supabaseConfigured && profile?.role !== 'admin') return <section className="account section-pad admin-page"><div className="breadcrumbs">BRAVA <ChevronRight size={12}/> ADMINISTRACION</div><h1>Administracion.</h1><div className="demo-disclaimer"><X size={16}/><span>Acceso restringido. Inicia sesion con una cuenta autorizada como administradora.</span></div></section>;
  return <section className="account section-pad admin-page"><div className="breadcrumbs">BRAVA <ChevronRight size={12}/> ADMINISTRACION</div><span className="eyebrow">GESTION DE LA TIENDA</span><h1>Administracion.</h1><div className="demo-disclaimer"><Sparkles size={16}/><span>{supabaseConfigured?'Catalogo compartido; la base de datos controla los permisos.':'Modo local: los cambios viven unicamente en este navegador. Conecta Supabase para compartirlos y proteger el acceso.'}</span></div><div className="admin-metrics"><article><small>PRODUCTOS</small><b>{catalog.length}</b></article><article><small>EN INVENTARIO</small><b>{catalog.reduce((sum,p)=>sum+p.stock,0)}</b></article><article><small>CATEGORIAS</small><b>{new Set(catalog.map(p=>p.category)).size}</b></article></div>{supabaseConfigured&&<div className="admin-tabs"><button className={adminTab==='productos'?'selected':''} onClick={()=>setAdminTab('productos')}>Productos</button><button className={adminTab==='usuarios'?'selected':''} onClick={()=>setAdminTab('usuarios')}>Cuentas de usuario</button></div>}{adminTab==='productos'||!supabaseConfigured?<><div className="section-heading admin-heading"><div><span className="eyebrow">CATALOGO</span><h2>Productos y estilos</h2></div><button className="btn dark" onClick={()=>{setEditingProduct(null);setProductFormOpen(true)}}><Plus size={16}/> Nuevo producto</button></div>{productFormOpen&&<ProductEditor key={editingProduct?.id||'new'} initial={editingProduct} onCancel={()=>{setProductFormOpen(false);setEditingProduct(null)}} onSave={saveProduct}/>}<div className="admin-products">{catalog.map(p=><article className="admin-product" key={p.id}><img src={photo(p.img,300)} alt=""/><div className="admin-product-main"><b>{p.name}</b><span>{p.category} · {p.style} · {p.color}</span><small>{p.seller} · {money(p.price)} · {p.stock} en inventario</small></div><div className="admin-product-actions"><button className="text-link" onClick={()=>{setEditingProduct(p);setProductFormOpen(true)}}>Editar</button><button className="text-link delete-link" onClick={()=>deleteProduct(p)}>Eliminar</button></div></article>)}</div></>:<><div className="section-heading admin-heading"><div><span className="eyebrow">CUENTAS REGISTRADAS</span><h2>Clientes y permisos</h2></div><span>{usersBusy?'Cargando...':`${adminUsers.length} cuentas`}</span></div><div className="admin-products">{adminUsers.map(user=><article className="admin-user" key={user.id}><div className="seller-avatar">{(user.display_name||user.email||'U')[0].toUpperCase()}</div><div className="admin-product-main"><b>{user.display_name||'Cliente'}</b><span>{user.email}</span><small>Registrada {new Date(user.created_at).toLocaleDateString('es-CO')}</small></div><div className="admin-product-actions"><span className={`role-pill ${user.role==='admin'?'role-admin':''}`}>{user.role==='admin'?'Administradora':'Cliente'}</span><button className="text-link" disabled={user.id===authUser?.id} onClick={()=>changeUserRole(user)}>{user.id===authUser?.id?'Tu cuenta':user.role==='admin'?'Quitar admin':'Dar admin'}</button></div></article>)}</div></>}<div className="policy-placeholder"><span>OPERACION DE LA TIENDA</span><p>Pedidos, pagos y envios requieren configurar el checkout y las reglas comerciales.</p></div></section>;
}

function ProductEditor({initial,onCancel,onSave}){const [form,setForm]=useState(()=>initial?{...initial,variants:initial.variants?.join(', ')||''}:{name:'',seller:'',price:'',category:'Gorras',color:'Arena',style:'Minimal',stock:0,badge:'Nuevo',img:'',description:'',material:'',adjust:'',variants:'',rating:0,reviews:0});const field=(key,value)=>setForm(old=>({...old,[key]:value}));return <form className="product-editor" onSubmit={e=>{e.preventDefault();onSave({...form,id:initial?.id,price:Number(form.price),stock:Number(form.stock),variants:form.variants.split(',').map(v=>v.trim()).filter(Boolean)});}}><div className="editor-heading"><div><span className="eyebrow">{initial?'EDITAR':'NUEVO'} PRODUCTO</span><h3>{initial?'Actualizar ficha':'Añadir al catálogo'}</h3></div><button type="button" className="icon" aria-label="Cerrar" onClick={onCancel}><X size={18}/></button></div><div className="editor-grid"><label>Nombre del producto<input required value={form.name} onChange={e=>field('name',e.target.value)}/></label><label>Marca o vendedor<input required value={form.seller} onChange={e=>field('seller',e.target.value)}/></label><label>Precio en COP<input type="number" min="0" required value={form.price} onChange={e=>field('price',e.target.value)}/></label><label>Inventario<input type="number" min="0" required value={form.stock} onChange={e=>field('stock',e.target.value)}/></label><label>Tipo<select value={form.category} onChange={e=>field('category',e.target.value)}><option>Gorras</option><option>Accesorios</option></select></label><label>Estilo<input required value={form.style} onChange={e=>field('style',e.target.value)} placeholder="Minimal, urbano, bordado…"/></label><label>Color<input required value={form.color} onChange={e=>field('color',e.target.value)}/></label><label>Etiqueta<input value={form.badge} onChange={e=>field('badge',e.target.value)} placeholder="Nuevo, edición local…"/></label><label className="editor-wide">URL de imagen<input type="url" required={!initial} value={form.img?.startsWith('photo-')?'':form.img} onChange={e=>field('img',e.target.value)} placeholder="https://…"/><small>Usa la URL pública de una imagen del producto.</small></label><label className="editor-wide">Descripción<textarea required rows="3" value={form.description} onChange={e=>field('description',e.target.value)}/></label><label>Materiales<input value={form.material} onChange={e=>field('material',e.target.value)}/></label><label>Ajuste o medidas<input value={form.adjust} onChange={e=>field('adjust',e.target.value)}/></label><label className="editor-wide">Tallas o variantes<input value={form.variants} onChange={e=>field('variants',e.target.value)} placeholder="S/M, L/XL (separadas por coma)"/></label></div><div className="editor-actions"><button type="button" className="text-link" onClick={onCancel}>Cancelar</button><button className="btn dark"><Check size={15}/> Guardar producto</button></div></form>}

// Checkout inspirado en la referencia del usuario; los medios son visuales hasta conectar una pasarela.
function CheckoutExperience({cart,subtotal,shippingEstimate,freeShippingMinimum,shippingCarriers,selectedCarrierId,setShippingCarrierId,dispatchDays,form,setForm,changeQty,openProduct,submitCheckout,checkoutBusy,wompiCheckoutEnabled,money,photo}) {
  const update=(field,value)=>setForm(old=>({...old,[field]:value}));
  const [locationBusy,setLocationBusy]=useState(false),[locationStatus,setLocationStatus]=useState('');
  // The browser asks for permission; coordinates stay in the editable delivery notes.
  const useCurrentLocation=()=>{
    if(!navigator.geolocation){setLocationStatus('Este navegador no permite compartir la ubicación. Completa la dirección manualmente.');return;}
    setLocationBusy(true);setLocationStatus('Solicitando permiso de ubicación…');
    navigator.geolocation.getCurrentPosition(({coords})=>{
      const lat=coords.latitude.toFixed(6),lon=coords.longitude.toFixed(6),mapUrl=`https://maps.google.com/?q=${lat},${lon}`;
      update('locationNotes',`${form.locationNotes?`${form.locationNotes}\n`:''}Pin de entrega: ${mapUrl}`);
      setLocationBusy(false);setLocationStatus('Pin añadido. Completa y revisa la dirección, ciudad y departamento.');
    },error=>{
      setLocationBusy(false);
      setLocationStatus(error.code===1?'No se concedió el permiso. Puedes escribir la dirección y las indicaciones manualmente.':'No pudimos obtener la ubicación. Revisa el permiso del navegador o completa los datos manualmente.');
    },{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
  };
  const qualifiesForFreeShipping=freeShippingMinimum>0&&subtotal>=freeShippingMinimum;
  const total=subtotal+(shippingEstimate||0);
  return <form className="checkout-flow" onSubmit={submitCheckout}>
    <div className="checkout-main">
      <section className="checkout-block"><div className="checkout-section-title"><span>01</span><div><h2>Contacto</h2><p>Usaremos estos datos para enviarte actualizaciones de la compra.</p></div></div>
        <label className="checkout-field checkout-full">Correo electrónico<input required type="email" autoComplete="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="nombre@correo.com"/></label>
        <label className="checkout-check"><input type="checkbox" checked={form.marketingOptIn} onChange={e=>update('marketingOptIn',e.target.checked)}/><span>Acepto recibir novedades y ofertas por correo, SMS o WhatsApp. Puedes retirar tu consentimiento cuando quieras.</span></label>
        <div className="checkout-subtitle">Datos de documento</div><div className="checkout-fields two-cols"><label className="checkout-field">Tipo de documento<select value={form.documentType} onChange={e=>update('documentType',e.target.value)}><option>C.C.</option><option>C.E.</option><option>Pasaporte</option><option>NIT</option></select></label><label className="checkout-field">Número de documento<input required value={form.documentNumber} onChange={e=>update('documentNumber',e.target.value)} autoComplete="off" placeholder="Número de documento"/></label></div>
      </section>
      <section className="checkout-block"><div className="checkout-section-title"><span>02</span><div><h2>Entrega</h2><p>Completa los datos para calcular y coordinar el envío.</p></div></div>
        <div className="checkout-fields two-cols"><label className="checkout-field">Nombre<input required autoComplete="given-name" value={form.name} onChange={e=>update('name',e.target.value)} placeholder="Nombre"/></label><label className="checkout-field">Apellidos<input required autoComplete="family-name" value={form.surname} onChange={e=>update('surname',e.target.value)} placeholder="Apellidos"/></label></div>
        <label className="checkout-field checkout-full">Dirección<input required autoComplete="address-line1" value={form.address} onChange={e=>update('address',e.target.value)} placeholder="Calle, carrera y número"/></label>
        <label className="checkout-field checkout-full">Apartamento, casa o interior <span>(opcional)</span><input autoComplete="address-line2" value={form.extraAddress} onChange={e=>update('extraAddress',e.target.value)} placeholder="Apto., torre, interior"/></label>
        <div className="location-action"><button type="button" className="location-button" onClick={useCurrentLocation} disabled={locationBusy}><Navigation size={15}/>{locationBusy?'Buscando ubicación…':'Usar mi ubicación actual'}</button><span>El navegador te pedirá permiso. El pin se añade a las indicaciones; puedes editarlo o quitarlo.</span></div>
        {locationStatus&&<p className="location-status" role="status" aria-live="polite">{locationStatus}</p>}
        <div className="checkout-fields three-cols"><label className="checkout-field">Departamento<input required autoComplete="address-level1" value={form.department} onChange={e=>update('department',e.target.value)} placeholder="Departamento"/></label><label className="checkout-field">Ciudad<input required autoComplete="address-level2" value={form.city} onChange={e=>update('city',e.target.value)} placeholder="Ciudad"/></label><label className="checkout-field">Código postal <span>(opcional)</span><input autoComplete="postal-code" value={form.postalCode} onChange={e=>update('postalCode',e.target.value)} placeholder="Código postal"/></label></div>
        <label className="checkout-field checkout-full location-notes">Indicaciones para encontrar el lugar <span>(opcional)</span><textarea rows="3" value={form.locationNotes} onChange={e=>update('locationNotes',e.target.value)} placeholder="Ej.: portería azul junto al parque; llamar al llegar; casa de reja blanca…"/></label>
        <label className="checkout-field checkout-full">Teléfono<input required type="tel" autoComplete="tel" value={form.phone} onChange={e=>update('phone',e.target.value)} placeholder="+57 300 000 0000"/><small>Usaremos este número para enviarte avisos sobre el estado de esta compra.</small></label>
        <label className="checkout-check"><input type="checkbox" checked={form.saveInfo} onChange={e=>update('saveInfo',e.target.checked)}/><span>Recordar mi información para la próxima vez en este dispositivo.</span></label>
        <div className="checkout-notice"><b>Antes de continuar</b><p>Revisa que la ciudad y el departamento correspondan a tu dirección. La tarifa y el tiempo final de entrega se confirmarán al configurar la operación de BRAVA.</p></div>
        <div className="checkout-subtitle">Método de envío</div>{shippingCarriers.length>0?<div className="shipping-options">{shippingCarriers.map(carrier=><label className={`shipping-choice ${selectedCarrierId===carrier.id?'selected':''}`} key={carrier.id}><input type="radio" name="shipping-carrier" checked={selectedCarrierId===carrier.id} onChange={()=>setShippingCarrierId(carrier.id)}/><span className="shipping-choice-radio"/><span className="shipping-choice-copy"><b>{carrier.name}</b><small>{[carrier.coverage,carrier.delivery_days].filter(Boolean).join(' · ')||'Cobertura por confirmar'}</small></span><b className="shipping-choice-price">{qualifiesForFreeShipping?'Gratis':carrier.estimated_fee===null?'Por cotizar':money(carrier.estimated_fee)}</b></label>)}</div>:<div className="shipping-choice"><span><b>Envío nacional</b><small>{dispatchDays?`Preparación: ${dispatchDays}`:'Entrega por confirmar según cobertura'}</small></span><b>{shippingEstimate===null?'Por confirmar':shippingEstimate===0?'Gratis':money(shippingEstimate)}</b></div>}
      </section>
      <section className="checkout-block payment-block"><div className="checkout-section-title"><span>03</span><div><h2>Pago</h2><p>Elige una opción. Los pagos reales aún no están habilitados.</p></div></div>
        <div className="payment-options"><div className="payment-option active"><span className="payment-radio"/><span className="payment-copy"><b>Pago seguro con Wompi</b><small>Los medios de pago disponibles aparecerán en el checkout de Wompi.</small></span><span className="payment-demo">WOMPI</span></div></div>
        <div className="payment-placeholder"><span className="secure-lock">◇</span><div><b>{wompiCheckoutEnabled?'Tu pago se procesa en Wompi':'Pago seguro en preparación'}</b><p>{wompiCheckoutEnabled?'BRAVA no recibe ni almacena los datos de tu tarjeta.':'Al terminar la conexión, pagarás en el sitio seguro de Wompi. BRAVA no almacena datos de tarjeta.'}</p></div></div>
        <label className="checkout-check terms-check"><input required type="checkbox" checked={form.acceptedTerms} onChange={e=>update('acceptedTerms',e.target.checked)}/><span>Acepto los términos del servicio, la política de privacidad y confirmo que tengo la edad legal para comprar.</span></label>
      </section>
    </div>
    <aside className="checkout-aside"><div className="aside-title"><div><span className="eyebrow">BRAVA · TU PEDIDO</span><h2>Resumen</h2></div><span>{cart.reduce((n,item)=>n+item.qty,0)} piezas</span></div>
      <div className="checkout-products">{cart.map(item=><article className="checkout-product" key={item.key||item.id}><div className="checkout-product-image"><img src={photo(item.img,180)} alt=""/><span>{item.qty}</span></div><div className="checkout-product-info"><button type="button" onClick={()=>openProduct(item)}>{item.name}</button><small>{item.variant||item.color} · {item.seller}</small><button type="button" className="checkout-remove" onClick={()=>changeQty(item.key||`${item.id}-unica`,-item.qty)}>Quitar</button></div><div className="checkout-product-price">{money(item.price*item.qty)}<div className="qty"><button type="button" aria-label="Reducir cantidad" onClick={()=>changeQty(item.key||`${item.id}-unica`,-1)}><Minus size={12}/></button><span>{item.qty}</span><button type="button" aria-label="Aumentar cantidad" onClick={()=>changeQty(item.key||`${item.id}-unica`,1)}><Plus size={12}/></button></div></div></article>)}</div>
      <div className="checkout-totals"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Envío</span><b>{shippingEstimate===null?'Por confirmar':shippingEstimate===0?'Gratis':money(shippingEstimate)}</b></div>{freeShippingMinimum>0&&<small>Envío gratis desde {money(freeShippingMinimum)}.</small>}<div className="checkout-total"><span>Total estimado</span><b>{money(total)}{shippingEstimate===null?' + envío':''}</b></div><p>El valor definitivo del envío se confirmará antes del cobro.</p></div>
      {!wompiCheckoutEnabled&&<div className="checkout-demo-warning"><Sparkles size={15}/><span>Estamos terminando la conexión segura de Wompi, correo y SMS. Aún no se reciben pagos reales.</span></div>}<button className="btn dark checkout-submit" disabled={!wompiCheckoutEnabled||checkoutBusy}>{checkoutBusy?'Conectando con Wompi…':'Pagar con Wompi'} <ArrowRight size={16}/></button><span className="secure-note">La confirmación de compra se envía cuando Wompi aprueba el pago.</span>
    </aside>
  </form>;
}

function ProductReviews({product,authUser,profile,go,notify,onPublished}) {
  const [reviews,setReviews]=useState([]),[orders,setOrders]=useState([]),[rating,setRating]=useState(5),[comment,setComment]=useState(''),[orderId,setOrderId]=useState(''),[loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false);
  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      setLoading(true);
      if(!supabase){setReviews([]);setOrders([]);setLoading(false);return;}
      const [{data,error},eligible]=await Promise.all([
        supabase.from('product_reviews').select('id,author_name,rating,comment,verified_purchase,created_at').eq('product_id',product.id).order('created_at',{ascending:false}),
        authUser?supabase.rpc('get_reviewable_orders',{p_product_id:product.id}):Promise.resolve({data:[],error:null})
      ]);
      if(!alive)return;
      if(error)notify(`No se pudieron cargar las opiniones: ${error.message}`);
      if(eligible.error)notify(`No se pudieron consultar tus compras: ${eligible.error.message}`);
      setReviews(data||[]);setOrders(eligible.data||[]);setLoading(false);
    };
    load();return()=>{alive=false;};
  },[product.id,authUser?.id]);
  const submit=async event=>{
    event.preventDefault();if(!supabase||!authUser||!orderId)return;
    setSubmitting(true);
    const {error}=await supabase.from('product_reviews').insert({product_id:product.id,order_id:orderId,user_id:authUser.id,rating,comment:comment.trim()});
    setSubmitting(false);
    if(error){notify(error.message.includes('duplicate')?'Ya dejaste tu opinión sobre esta compra.':`No se pudo publicar: ${error.message}`);return;}
    setComment('');setOrders(old=>old.filter(order=>order.order_id!==orderId));
    const {data}=await supabase.from('product_reviews').select('id,author_name,rating,comment,verified_purchase,created_at').eq('product_id',product.id).order('created_at',{ascending:false});
    setReviews(data||[]);onPublished?.();notify('¡Gracias! Tu opinión ya está publicada.');
  };
  return <section className="review-box product-reviews" aria-labelledby="reviews-title">
    <span className="eyebrow">OPINIONES DE COMPRADORES</span><h3 id="reviews-title">Lo que cuentan quienes ya la tienen</h3>
    <div className="reviews-summary"><span className="review-stars">{reviews.length?`★ ${ (reviews.reduce((sum,item)=>sum+item.rating,0)/reviews.length).toFixed(1)}`:'—'}</span><span>{reviews.length} {reviews.length===1?'opinión':'opiniones'} verificadas</span></div>
    {!supabase?<p>Las opiniones estarán disponibles cuando la tienda se conecte a Supabase.</p>:!authUser?<div className="review-access"><p>Compraste esta pieza? Inicia sesión con el mismo correo de la compra para dejar tu opinión.</p><button className="text-link" onClick={()=>go('cuenta')}>Iniciar sesión <ArrowRight size={14}/></button></div>:orders.length>0?<form className="review-form" onSubmit={submit}>
      <label>Compra<select required value={orderId||orders[0]?.order_id||''} onChange={event=>setOrderId(event.target.value)}>{orders.map(order=><option key={order.order_id} value={order.order_id}>{order.reference} · {new Date(order.paid_at).toLocaleDateString('es-CO')}</option>)}</select></label>
      <fieldset><legend>Tu calificación</legend><div className="review-rating-picker" role="radiogroup" aria-label="Calificación">{[1,2,3,4,5].map(value=><button type="button" key={value} aria-label={`${value} estrellas`} aria-pressed={rating===value} className={rating>=value?'active':''} onClick={()=>setRating(value)}><Star size={20} fill="currentColor"/></button>)}</div></fieldset>
      <label>Tu opinión<textarea required minLength={8} maxLength={1200} rows={4} value={comment} onChange={event=>setComment(event.target.value)} placeholder="¿Qué te gustó de esta pieza?"/></label>
      <button className="btn dark" disabled={submitting||comment.trim().length<8}>{submitting?'Publicando…':'Publicar opinión'} <ArrowRight size={15}/></button><small>Solo puedes opinar sobre compras pagadas con tu correo verificado.</small>
    </form>:<p className="review-hint">{loading?'Cargando tus compras…':profile?'No encontramos una compra pagada de este producto con tu correo confirmado.':'Confirma tu correo para habilitar las opiniones de compras verificadas.'}</p>}
    <div className="review-list">{reviews.map(review=><article className="review-entry" key={review.id}><div className="review-entry-heading"><b>{review.author_name}</b><span><span aria-label={`${review.rating} de 5 estrellas`}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span> · {new Date(review.created_at).toLocaleDateString('es-CO')}</span></div><span className="verified-review"><Check size={12}/> Compra verificada</span><p>{review.comment}</p></article>)}</div>
  </section>;
}

function ProductCard({p,onOpen,onAdd,saved,onSave,review}){const addToCart=()=>p.variants?.length?onOpen(p):onAdd(p);return <article className="product-card"><div className="product-image"><img src={photo(p.img,700)} alt={`${p.name}, producto de demostración`} loading="lazy"/>{p.badge&&<span className="product-badge">{p.badge}</span>}<button className={`heart ${saved?'is-saved':''}`} aria-label={saved?'Quitar de favoritos':'Guardar en favoritos'} onClick={()=>onSave(p.id)}><Heart size={17} fill={saved?'currentColor':'none'}/></button><div className="product-actions"><button className="product-action-cart" onClick={addToCart} disabled={!p.stock} aria-label={p.stock?'Añadir al carrito':'Producto agotado'}><ShoppingBag size={15}/><span>{p.stock?(p.variants?.length?'Elegir talla':'Añadir al carrito'):'Agotado'}</span></button><button className="product-action-view" onClick={()=>onOpen(p)}>Ver pieza <ArrowUpRight size={14}/></button></div></div><div className="product-meta"><div><button className="product-name" onClick={()=>onOpen(p)}>{p.name}</button><span>{p.seller}</span></div><b>{money(p.price)}</b></div><div className="product-foot"><span>{p.color} · {p.category}</span><span className="rating">Opiniones</span></div>{review&&<button className="product-review-teaser" onClick={()=>onOpen(p)}><span className="review-teaser-meta"><Star size={12} fill="currentColor"/> {review.rating} · {review.author_name}</span><span className="review-teaser-comment">“{review.comment}”</span><span className="review-teaser-link">Leer opiniones <ArrowUpRight size={12}/></span></button>}</article>}
function Value({title,body}){return <article className="value-item"><h3>{title}</h3><p>{body}</p></article>}

export default App;
