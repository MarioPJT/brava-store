import { createClient } from '@supabase/supabase-js';

// VITE_* values ship to the browser, so this client must only use the publishable key.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured ? createClient(url, key) : null;

// Keep database column names separate from the product shape used by the UI.
export const fromDatabaseProduct = row => ({
  id: row.id, name: row.name, seller: row.seller, price: Number(row.price), category: row.category,
  color: row.color, style: row.style, stock: row.stock, badge: row.badge, img: row.image_url,
  description: row.description, material: row.material, adjust: row.adjust,
  variants: row.variants || [], rating: Number(row.rating || 0), reviews: row.reviews || 0,
  owner_id: row.owner_id || null, publication_status: row.publication_status || 'published', moderation_note: row.moderation_note || '',
});

export const toDatabaseProduct = product => ({
  name: product.name, seller: product.seller, price: Number(product.price), category: product.category,
  color: product.color, style: product.style, stock: Number(product.stock), badge: product.badge || '',
  image_url: product.img, description: product.description, material: product.material, adjust: product.adjust,
  variants: product.variants || [], rating: Number(product.rating || 0), reviews: Number(product.reviews || 0),
});
