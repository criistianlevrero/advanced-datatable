# UI Next Steps (hallazgos de revision)

Este documento reemplaza el plan anterior con oportunidades de mejora detectadas en la revision de `@advanced-datatable/ui`.

## 1. Acciones ya aplicadas

- Eliminados archivos legacy con imports rotos que quedaron tras la migracion:
  - `packages/ui/src/components/Cell.tsx`
  - `packages/ui/src/components/Grid.tsx`
  - `packages/ui/src/components/DataTable.tsx`

Resultado: se elimina ruido de type-check y confusion de rutas antiguas.

## 2. Hallazgos priorizados

## 2.1 Alta prioridad

1. Reactividad de `DataTable` frente a cambios de props criticas
- En `packages/ui/src/components/data-table/DataTable.tsx` la API se crea una sola vez con `useMemo` y dependencias vacias.
- Si cambian `transport`, `initialState` o `persistence`, la instancia interna queda stale.

2. Duplicacion de logica entre `Grid` y `GridVirtualized`
- Navegacion de teclado, copy/paste, seleccion y parte del manejo de filtros/resize estan duplicados.
- Riesgo: divergencia funcional entre ambos componentes.

## 2.2 Media prioridad

3. Accesibilidad de foco en controles de header
- Los botones de ordenar/filtrar usan estilos que eliminan foco visible.
- Impacto: peor UX para teclado y lectores de pantalla.

4. Cobertura de pruebas incompleta para virtualizacion
- Hay buena cobertura para `Grid` clasico, pero no para `GridVirtualized` en casos clave (teclado, clipboard, seleccion extendida, limites de viewport).

## 2.3 Baja prioridad

5. Observabilidad de `loadPersistedOperations`
- Se ejecuta sin manejo explicito de errores.
- Conviene registrar o exponer estado de error para debugging.

## 3. Recomendacion de contrato para DataTable

Recomendacion: mantener `DataTable` como componente de ciclo de vida estable (sin hot-swap interno de `transport`, `initialState`, `persistence`) y documentarlo explicitamente.

Motivo:
- Evita estados intermedios complejos y race conditions entre manager/store viejos y nuevos.
- Mantiene semantica predecible para operaciones pendientes y replay.
- Encaja mejor con el modelo actual de bootstrap unico.

Implementacion sugerida:
- Documentar en `DataTableProps` que esos props se consideran inmutables tras mount.
- Si un consumidor necesita cambiarlos, usar `key` en `DataTable` para forzar remount controlado.
- Opcional: en desarrollo, emitir warning si esas props cambian despues del primer render.

## 4. Plan de ejecucion corto (sin breaking changes)

1. Documentar contrato de inmutabilidad de props criticas en `DataTable`.
2. Extraer logica compartida de interaccion (`keyboard`, `clipboard`, `selection`) a pieza interna reutilizable.
3. Agregar pruebas de `GridVirtualized` equivalentes a las de `Grid` normal.
4. Ajustar estilos de foco visible en header usando `:focus-visible`.
5. Agregar manejo de error no disruptivo para carga de persistencia.

## 5. Definicion de terminado

- No quedan imports/rutas legacy rotas.
- `Grid` y `GridVirtualized` comparten la mayor parte de logica de interaccion.
- `DataTable` tiene contrato claro de ciclo de vida y documentado.
- Existe cobertura de tests para flujo virtualizado.
- Se mejora accesibilidad sin cambiar API publica.
