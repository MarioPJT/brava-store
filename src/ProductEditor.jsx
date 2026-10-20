import React, { useEffect, useState } from 'react';
import { Check, ImagePlus, RotateCw, X } from 'lucide-react';
import { PRODUCT_CATEGORIES } from './lib/productCategories';
import { prepareProductImage } from './lib/prepareProductImage';

export default function ProductEditor({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(() => initial
    ? { ...initial, variants: initial.variants?.join(', ') || '' }
    : { name: '', seller: '', price: '', category: 'Gorras', color: 'Arena', style: 'Minimal', stock: 0, badge: 'Nuevo', img: '', description: '', material: '', adjust: '', variants: '', rating: 0, reviews: 0 });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [customCategory,setCustomCategory]=useState(()=>Boolean(initial?.category&&!PRODUCT_CATEGORIES.includes(initial.category)));
  const [imageAdjustments,setImageAdjustments]=useState({zoom:1,x:50,y:50,rotation:0,brightness:100});
  const field = (key, value) => setForm(old => ({ ...old, [key]: value }));

  useEffect(() => {
    if (!imageFile) { setPreviewUrl(''); return; }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const currentImage = form.img?.startsWith('http')
    ? form.img
    : form.img?.startsWith('photo-')
      ? `https://images.unsplash.com/${form.img}?auto=format&fit=crop&w=500&q=80`
      : '';
  const sourceImage=previewUrl||currentImage;
  const onImageSelected = event => {
    const file = event.target.files?.[0] || null;
    setImageError('');
    if (!file) { setImageFile(null); return; }
    const accepted = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!accepted.includes(file.type)) { setImageFile(null); setImageError('Usa una imagen JPG, PNG, WEBP o GIF.'); event.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { setImageFile(null); setImageError('La imagen debe pesar máximo 5 MB.'); event.target.value = ''; return; }
    setImageFile(file);
  };

  return <form className="product-editor admin-product-editor" onSubmit={async event => {
    event.preventDefault();
    try{
      const preparedImage=imageFile?await prepareProductImage(imageFile,imageAdjustments):null;
      onSave({ ...form, id: initial?.id, imageFile:preparedImage, price: Number(form.price), stock: Number(form.stock), variants: form.variants.split(',').map(value => value.trim()).filter(Boolean) });
    }catch(error){setImageError(error.message||'No se pudo preparar la fotografía.');}
  }}>
    <div className="editor-heading"><div><span className="eyebrow">{initial ? 'EDITAR' : 'NUEVO'} PRODUCTO</span><h3>{initial ? 'Actualizar ficha' : 'Añadir al catálogo'}</h3></div><button type="button" className="icon" aria-label="Cerrar editor" onClick={onCancel}><X size={18}/></button></div>
    <div className="editor-grid">
      <label>Nombre del producto<input required maxLength="120" value={form.name} onChange={event => field('name', event.target.value)}/></label>
      <label>Marca o vendedor<input required maxLength="80" value={form.seller} onChange={event => field('seller', event.target.value)}/></label>
      <label>Precio en COP<input type="number" min="0" required value={form.price} onChange={event => field('price', event.target.value)}/></label>
      <label>Unidades disponibles<input type="number" min="0" required value={form.stock} onChange={event => field('stock', event.target.value)}/></label>
      <label>Categoría<select value={customCategory?'__custom__':form.category} onChange={event=>{const custom=event.target.value==='__custom__';setCustomCategory(custom);if(!custom)field('category',event.target.value);else field('category','');}}><option value="" disabled>Elige una categoría</option>{PRODUCT_CATEGORIES.map(category=><option key={category} value={category}>{category}</option>)}<option value="__custom__">Otra categoría…</option></select>{customCategory&&<input required autoFocus maxLength="50" value={form.category} onChange={event=>field('category',event.target.value)} placeholder="Escribe la categoría"/>}</label>
      <label>Estilo<input required value={form.style} onChange={event => field('style', event.target.value)} placeholder="Minimal, urbano, bordado…"/></label>
      <label>Color<input required value={form.color} onChange={event => field('color', event.target.value)}/></label>
      <label>Etiqueta<input value={form.badge} onChange={event => field('badge', event.target.value)} placeholder="Nuevo, edición local…"/></label>
      <div className="editor-wide product-image-upload">
        <label htmlFor="product-image-file">Fotografía del producto</label>
        <div className="product-image-upload-control"><label className="product-image-picker" htmlFor="product-image-file"><ImagePlus size={18}/><span>{imageFile ? 'Cambiar imagen' : currentImage ? 'Subir otra imagen' : 'Elegir una imagen'}</span></label><input id="product-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required={!currentImage && !imageFile} onChange={onImageSelected}/><small>JPG, PNG, WEBP o GIF · máximo 5 MB</small></div>
        {sourceImage&&<div className="product-image-editing"><div className="product-image-stage"><img src={sourceImage} alt="Vista previa editable" style={{objectPosition:`${imageAdjustments.x}% ${imageAdjustments.y}%`,transform:`scale(${imageAdjustments.zoom}) rotate(${imageAdjustments.rotation}deg)`,filter:`brightness(${imageAdjustments.brightness}%)`}}/><span>Vista previa · 4:5</span></div><div className="product-image-tools"><div className="image-tool-head"><b>Ajusta tu foto</b><button type="button" className="image-rotate-button" onClick={()=>setImageAdjustments(old=>({...old,rotation:(old.rotation+90)%360}))}><RotateCw size={13}/> Girar</button></div><label>Zoom <input type="range" min="1" max="2.4" step="0.05" value={imageAdjustments.zoom} onChange={event=>setImageAdjustments(old=>({...old,zoom:Number(event.target.value)}))}/></label><label>Encuadre horizontal <input type="range" min="0" max="100" value={imageAdjustments.x} onChange={event=>setImageAdjustments(old=>({...old,x:Number(event.target.value)}))}/></label><label>Encuadre vertical <input type="range" min="0" max="100" value={imageAdjustments.y} onChange={event=>setImageAdjustments(old=>({...old,y:Number(event.target.value)}))}/></label><label>Luz <input type="range" min="70" max="130" value={imageAdjustments.brightness} onChange={event=>setImageAdjustments(old=>({...old,brightness:Number(event.target.value)}))}/></label><small>El recorte y la luz se aplicarán a la imagen al guardar.</small></div></div>}
        {imageError && <small className="product-image-error" role="alert">{imageError}</small>}
      </div>
      <label className="editor-wide">Descripción<textarea required rows="3" maxLength="1200" value={form.description} onChange={event => field('description', event.target.value)}/></label>
      <label>Materiales<input value={form.material} onChange={event => field('material', event.target.value)}/></label>
      <label>Ajuste o medidas<input value={form.adjust} onChange={event => field('adjust', event.target.value)}/></label>
      <label className="editor-wide">Tallas o variantes<input value={form.variants} onChange={event => field('variants', event.target.value)} placeholder="S/M, L/XL (separadas por coma)"/></label>
    </div>
    <div className="editor-actions"><button type="button" className="text-link" onClick={onCancel}>Cancelar</button><button className="btn dark"><Check size={15}/> Guardar producto</button></div>
  </form>;
}
