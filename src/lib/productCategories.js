// Shared categories keep seller forms, admin filters and the storefront in sync.
export const PRODUCT_CATEGORIES = [
  'Gorras',
  'Accesorios',
  'Ropa',
  'Bolsos y morrales',
  'Joyería',
  'Calzado',
  'Cuidado personal',
  'Otros',
];

const HIDDEN_CATEGORIES = new Set(['Hogar y decoración', 'Tecnología']);

// Exclude removed categories from storefront filters, including old catalog rows.
export const categoriesIn = catalog => [...new Set([
  ...PRODUCT_CATEGORIES,
  ...catalog
    .map(product => product.category?.trim())
    .filter(category => category && !HIDDEN_CATEGORIES.has(category)),
])];
