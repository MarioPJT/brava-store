import React, { useEffect, useState } from 'react';
import { Check, ImagePlus, X } from 'lucide-react';
import { PRODUCT_CATEGORIES } from './lib/productCategories';

export default function ProductEditor({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(() => initial
    ? { ...initial, variants: initial.variants?.join(', ') || '' }
    : { name: '', seller: '', price: '', category: 'Gorras', color: 'Arena', style: 'Minimal', stock: 0, badge: 'Nuevo', img: '', description: '', material: '', adjust: '', variants: '', rating: 0, reviews: 0 });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageError, setImageError] = useState('');
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
  const onImageSelected = event => {
    const file = event.target.files?.[0] || null;
    setImageError('');
    if (!file) { setImageFile(null); return; }
    const accepted = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!accepted.includes(file.type)) { setImageFile(null); setImageError('Usa una imagen JPG, PNG, WEBP o GIF.'); event.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { setImageFile(null); setImageError('La imagen debe pesar máximo 5 MB.'); event.target.value = ''; return; }
    setImageFile(file);
  };

  return <form className="product-editor admin-product-editor" onSubmit={event => {
    event.preventDefault();
    onSave({ ...form, id: initial?.id, imageFile, price: Number(form.price), stock: Number(form.stock), variants: form.variants.split(',').map(value => value.trim()).filter(Boolean) });
  }}>
    <div className="editor-heading"><div><span className="eyebrow">{initial ? 'EDITAR' : 'NUEVO'} PRODUCTO</span><h3>{initial ? 'Actualizar ficha' : 'Añadir al catálogo'}</h3></div><button type="button" className="icon" aria-label="Cerrar editor" onClick={onCancel}><X size={18}/></button></div>
    <div className="editor-grid">
      <label>Nombre del producto<input required maxLength="120" value={form.name} onChange={event => field('name', event.target.value)}/></label>
      <label>Marca o vendedor<input required maxLength="80" value={form.seller} onChange={event => field('seller', event.target.value)}/></label>
      <label>Precio en COP<input type="number" min="0" required value={form.price} onChange={event => field('price', event.target.value)}/></label>
      <label>Unidades disponibles<input type="number" min="0" required value={form.stock} onChange={event => field('stock', event.target.value)}/></label>
      <label>Categoría<input required list="brava-product-categories" maxLength="50" value={form.category} onChange={event => field('category', event.target.value)} placeholder="Ej. Joyería"/><datalist id="brava-product-categories">{PRODUCT_CATEGORIES.map(category => <option key={category} value={category}/>)}</datalist><small>Elige una sugerencia o escribe una categoría nueva.</small></label>
      <label>Estilo<input required value={form.style} onChange={event => field('style', event.target.value)} placeholder="Minimal, urbano, bordado…"/></label>
      <label>Color<input required value={form.color} onChange={event => field('color', event.target.value)}/></label>
      <label>Etiqueta<input value={form.badge} onChange={event => field('badge', event.target.value)} placeholder="Nuevo, edición local…"/></label>
      <div className="editor-wide product-image-upload">
        <label htmlFor="product-image-file">Fotografía del producto</label>
        <div className="product-image-upload-control"><label className="product-image-picker" htmlFor="product-image-file"><ImagePlus size={18}/><span>{imageFile ? 'Cambiar imagen' : currentImage ? 'Subir otra imagen' : 'Elegir una imagen'}</span></label><input id="product-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required={!currentImage && !imageFile} onChange={onImageSelected}/><small>JPG, PNG, WEBP o GIF · máximo 5 MB</small></div>
        {(previewUrl || currentImage) && <img className="product-image-preview" src={previewUrl || currentImage} alt="Vista previa del producto"/>}
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
