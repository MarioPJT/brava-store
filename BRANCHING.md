# Flujo de ramas

BRAVA usa un flujo sencillo basado en ramas y pull requests. Cada cambio se trabaja de forma aislada y llega a las ramas estables mediante revisión.

## Ramas permanentes

- `main`: línea estable del proyecto. Recibe cambios listos y correcciones urgentes.
- `develop`: integración de cambios que se preparan para la siguiente versión.

`main` sigue siendo la rama predeterminada de GitHub.

## Ramas de trabajo

Se crean desde la rama base indicada y se eliminan después de integrar el pull request:

- `feature/<nombre-corto>`: funciones nuevas; nace de `develop` y vuelve a `develop`.
- `fix/<nombre-corto>`: correcciones normales; nace de `develop` y vuelve a `develop`.
- `hotfix/<nombre-corto>`: correcciones urgentes sobre la línea estable; nace de `main`. Después de integrarla en `main`, se sincroniza también con `develop`.
- `release/<version>`: solo si una versión requiere una etapa específica de revisión antes de publicarse; nace de `develop` y se integra en `main`.

Usa nombres breves en minúsculas y separados por guiones, por ejemplo `feature/filtro-por-color` o `fix/stock-negativo`.

## Flujo habitual

1. Actualiza la rama base (`develop` para funciones y correcciones normales; `main` para hotfixes).
2. Crea una rama de trabajo con el prefijo adecuado.
3. Haz commits pequeños y descriptivos.
4. Sube la rama y abre un pull request hacia su rama base.
5. Revisa el diff y la compilación antes de integrar.
6. Elimina la rama corta después de integrar el pull request.

```bash
git switch develop
git pull origin develop
git switch -c feature/nombre-del-cambio
# trabajar y hacer commits
git push -u origin feature/nombre-del-cambio
```

Para una corrección urgente:

```bash
git switch main
git pull origin main
git switch -c hotfix/nombre-del-arreglo
# corregir, hacer commit y abrir un pull request a main
```

La estrategia sigue el flujo de GitHub de aislar el trabajo en ramas y proponerlo mediante pull requests. Las ramas cortas se eliminan al terminar, conservando el historial del pull request.
