import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, Megaphone, Package, Plus, Sparkles, Store, Trash2 } from 'lucide-react';
import ProductEditor from './ProductEditor';
import { fromDatabaseProduct, supabase, toDatabaseProduct, uploadProductImage } from './lib/supabase';

const money = value => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(value)||0);
const image = value => value?.startsWith('http') ? value : `https://images.unsplash.com/${value}?auto=format&fit=crop&w=220&q=80`;

export default function SellerWorkspace({user,profile,profileLoading=false,onProfileChange,go,notify}) {
  const [application,setApplication]=useState({store_name:'',description:'',contact_email:user?.email||'',instagram_url:''});
  const [products,setProducts]=useState([]),[subscription,setSubscription]=useState(null),[busy,setBusy]=useState(false);
  const [editing,setEditing]=useState(null),[editorOpen,setEditorOpen]=useState(false);

  useEffect(()=>{
    if(!user||profile?.status!=='approved'||!supabase)return;
    let alive=true;setBusy(true);
    Promise.all([
      supabase.from('products').select('*').eq('owner_id',user.id).order('created_at',{ascending:false}),
      supabase.from('seller_subscriptions').select('status,current_period_end,amount_cop').eq('user_id',user.id).maybeSingle(),
    ]).then(([catalog,billing])=>{
      if(!alive)return;
      if(catalog.error)notify(`No se pudieron cargar tus productos: ${catalog.error.message}`);else setProducts((catalog.data||[]).map(fromDatabaseProduct).map((product,index)=>({...product,publication_status:catalog.data[index].publication_status,moderation_note:catalog.data[index].moderation_note})));
      if(billing.error)notify(`No se pudo consultar tu plan: ${billing.error.message}`);else setSubscription(billing.data);
      setBusy(false);
    });
    return()=>{alive=false;};
  },[user?.id,profile?.status]);

  const apply=async event=>{
    event.preventDefault();if(!user||!supabase)return;
    const payload={...application,user_id:user.id,contact_email:application.contact_email.trim().toLowerCase()};
    const {data,error}=await supabase.from('seller_profiles').insert(payload).select().single();
    if(error){notify(`No se pudo enviar tu solicitud: ${error.message}`);return;}
    onProfileChange(data);notify('Solicitud enviada. BRAVA revisará tu tienda antes de habilitar publicaciones.');
  };

  const saveProduct=async product=>{
    if(!supabase||!user)return;
    try{
      const {imageFile,...productData}=product;
      if(imageFile)productData.img=await uploadProductImage(imageFile,user.id);
      const payload={...toDatabaseProduct({...productData,seller:profile.store_name}),owner_id:user.id,publication_status:'pending',moderation_note:''};
      const query=product.id
        ?supabase.from('products').update(payload).eq('id',product.id).eq('owner_id',user.id).select().single()
        :supabase.from('products').insert(payload).select().single();
      const {data,error}=await query;
      if(error)throw error;
      const saved=fromDatabaseProduct(data);setProducts(old=>product.id?old.map(item=>item.id===product.id?{...saved,publication_status:data.publication_status,moderation_note:data.moderation_note}:item):[{...saved,publication_status:data.publication_status,moderation_note:data.moderation_note},...old]);
      setEditorOpen(false);setEditing(null);notify('Producto enviado a revisión de BRAVA.');
    }catch(error){notify(`No se pudo enviar el producto: ${error.message}`);}
  };

  const removeProduct=async product=>{
    if(!window.confirm(`¿Eliminar “${product.name}” de tu catálogo?`))return;
    const {error}=await supabase.from('products').delete().eq('id',product.id).eq('owner_id',user.id);
    if(error){notify(`No se pudo eliminar: ${error.message}`);return;}
    setProducts(old=>old.filter(item=>item.id!==product.id));notify('Producto eliminado.');
  };

  if(!user)return <section className="seller-portal section-pad"><span className="eyebrow">VENDE EN BRAVA</span><h1>Tu tienda empieza aquí.</h1><p>Inicia sesión o crea una cuenta antes de enviar tu solicitud.</p><button className="btn dark" onClick={()=>go('cuenta')}>Ir a mi cuenta <ArrowRight size={15}/></button></section>;

  if(profileLoading)return <section className="seller-portal section-pad"><span className="eyebrow">VENDE EN BRAVA</span><h1>Preparando tu espacio.</h1><p>Estamos consultando el estado de tu tienda.</p></section>;

  if(!profile)return <section className="seller-portal section-pad"><span className="eyebrow">VENDE EN BRAVA</span><h1>Un escaparate para tu oficio.</h1><p>Cuéntanos quién eres y qué haces. Revisaremos tu solicitud antes de habilitar tus productos.</p><form className="seller-application" onSubmit={apply}>
    <label>Nombre de tu marca o tienda<input required minLength={2} maxLength={80} value={application.store_name} onChange={event=>setApplication({...application,store_name:event.target.value})}/></label>
    <label>Correo de contacto<input type="email" required value={application.contact_email} onChange={event=>setApplication({...application,contact_email:event.target.value})}/></label>
    <label>Instagram o página web<input type="url" value={application.instagram_url} onChange={event=>setApplication({...application,instagram_url:event.target.value})} placeholder="https://instagram.com/tu-marca"/></label>
    <label>Cuéntanos sobre tu marca<textarea maxLength={800} rows={4} value={application.description} onChange={event=>setApplication({...application,description:event.target.value})} placeholder="Qué haces, cómo produces y qué hace especial tu catálogo…"/></label>
    <button className="btn dark">Enviar solicitud <ArrowRight size={15}/></button>
  </form></section>;

  if(profile.status!=='approved')return <section className="seller-portal section-pad"><button className="back-link" onClick={()=>go('inicio')}><ArrowLeft size={15}/> Volver a BRAVA</button><div className="seller-state-card"><Clock3 size={25}/><span className="eyebrow">{profile.store_name}</span><h1>{profile.status==='rejected'?'Tu solicitud requiere ajustes':'Estamos revisando tu tienda.'}</h1><p>{profile.status==='rejected'?'Contacta a BRAVA para conocer los cambios necesarios y volver a postularte.':profile.status==='suspended'?'Las publicaciones de esta tienda están pausadas. Contacta al equipo BRAVA.':'Cuando aprobemos tu marca, tendrás acceso a tu catálogo y herramientas de vendedor.'}</p></div></section>;

  const aiActive=subscription?.status==='active'&&(!subscription.current_period_end||new Date(subscription.current_period_end)>new Date());
  return <section className="seller-portal section-pad">
    <div className="seller-portal-heading"><div><span className="eyebrow">CENTRO DE VENDEDOR</span><h1>{profile.store_name}.</h1><p>Administra tu catálogo y consulta el estado de revisión de cada producto.</p></div><button className="btn dark" onClick={()=>{setEditing(null);setEditorOpen(true)}}><Plus size={15}/> Enviar producto</button></div>
    <div className="seller-portal-tabs"><article><Store size={17}/><span>Tu escaparate</span><b>{profile.store_name}</b></article><article><Package size={17}/><span>Productos</span><b>{products.length}</b></article><article><Check size={17}/><span>Publicados</span><b>{products.filter(item=>item.publication_status==='published').length}</b></article></div>
    <div className="seller-subscription-card"><div><span className="eyebrow">BRAVA IMPULSO · IA PARA MARKETING</span><h2>{aiActive?'Herramientas de IA activas':'Haz crecer tu marca con IA.'}</h2><p>Genera ideas de contenido y textos de producto para tus canales.</p></div><div className="seller-plan-price"><b>COP $29.900</b><span>/ mes</span><small>{aiActive?'Suscripción activa':'Plan mensual'}</small></div>{aiActive?<button className="btn dark" disabled><Sparkles size={15}/> Próximamente</button>:<button className="btn dark" disabled title="Los cobros recurrentes se activarán al configurar Wompi">Suscripción en preparación <ArrowRight size={15}/></button>}</div>
    <div className="seller-ai-locked"><Sparkles size={17}/><span><b>{aiActive?'Marketing asistido por IA':'Acceso a IA bloqueado'}</b><small>{aiActive?'La generación de contenido estará disponible cuando conectemos el proveedor de IA.':'Disponible con la suscripción activa. El cobro automático aún requiere configurar Wompi para pagos recurrentes.'}</small></span><Megaphone size={20}/></div>
    {editorOpen&&<ProductEditor key={editing?.id||'seller-new'} initial={editing} onCancel={()=>{setEditorOpen(false);setEditing(null)}} onSave={saveProduct}/>}
    <div className="seller-product-list"><div className="seller-product-list-heading"><div><span className="eyebrow">TU INVENTARIO</span><h2>Productos enviados</h2></div><span>{busy?'Cargando…':`${products.length} productos`}</span></div>
      {products.map(product=><article className="seller-product-row" key={product.id}><img src={image(product.img)} alt=""/><div><b>{product.name}</b><span>{product.category} · {product.style} · {money(product.price)}</span><small>{product.moderation_note||'Revisión de publicación a cargo de BRAVA'}</small></div><span className={`seller-product-status status-${product.publication_status}`}>{product.publication_status==='published'?'Publicado':product.publication_status==='rejected'?'Requiere cambios':product.publication_status==='archived'?'Archivado':'En revisión'}</span><button className="text-link" onClick={()=>{setEditing(product);setEditorOpen(true)}}>Editar</button><button className="text-link delete-link" onClick={()=>removeProduct(product)}><Trash2 size={14}/> Eliminar</button></article>)}
      {!busy&&!products.length&&<div className="seller-empty"><Package size={23}/><h3>Aún no tienes productos</h3><p>Prepara tu primera pieza para que BRAVA revise la publicación.</p><button className="btn dark" onClick={()=>{setEditing(null);setEditorOpen(true)}}>Enviar primer producto <ArrowRight size={14}/></button></div>}
    </div>
  </section>;
}
