// Shared categories keep seller forms, admin filters and the storefront in sync.
export const PRODUCT_CATEGORIES = [
  'Gorras',
  'Accesorios',
  'Ropa',
  'Bolsos y morrales',
  'Joyería',
  'Calzado',
  'Hogar y decoración',
  'Cuidado personal',
  'Tecnología',
  'Otros',
];

export const categoriesIn = catalog => [...new Set([
  ...PRODUCT_CATEGORIES,
  ...catalog.map(product => product.category?.trim()).filter(Boolean),
])];
