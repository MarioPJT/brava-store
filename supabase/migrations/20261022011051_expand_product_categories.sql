-- Keep database validation aligned with the seller and admin category lists.
alter table public.products
  drop constraint if exists products_category_check;

alter table public.products
  add constraint products_category_check
  check (category in (
    'Gorras',
    'Accesorios',
    'Ropa',
    'Bolsos y morrales',
    'Joyería',
    'Calzado',
    'Cuidado personal'
  ));
