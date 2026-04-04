# Advanced DataTable

Monorepo en **TypeScript + React** para experimentar una DataTable orientada a operaciones: edición inline, cambios por lotes, resiliencia ante fallos de red y sincronización con backend.

## ✨ Qué incluye

- **`apps/playground`**: demo visual con escenarios de edición, resiliencia, selección y virtualización.
- **`apps/mock-backend`**: backend HTTP mock para probar integración real y respuestas parciales.
- **`packages/*`**: núcleo reusable del sistema (`core`, `operations`, `api-client`, `store`, `react`, `ui`).
- **`tests/*`**: pruebas unitarias e integración.
- **`docs/*`**: documentación funcional, técnica y de arquitectura.

---

## ✅ Requisitos

- **Node.js** `>= 20.19.0`
- **npm** `>= 10`

---

## 🚀 Levantar la demo y el backend en local

### 1) Instalar dependencias

Desde la raíz del repositorio:

```bash
npm install
```

### 2) Configurar variables de entorno del playground

```bash
cp apps/playground/.env.example apps/playground/.env
```

Valor por defecto:

```env
VITE_BACKEND_URL=http://localhost:3001
```

### 3) Levantar el backend mock

En una terminal:

```bash
npm run mock-backend
```

Quedará disponible en:

- `http://localhost:3001`

### 4) Levantar la demo

En otra terminal, desde la raíz:

```bash
npm run dev
```

Abre en el navegador:

- `http://localhost:5173/`

> La demo usa el backend configurado en `VITE_BACKEND_URL` para los escenarios de integración.

---

## 🧪 Scripts útiles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el playground con Vite |
| `npm run mock-backend` | Inicia el backend mock local |
| `npm run build` | Compila el monorepo con TypeScript |
| `npm test` | Ejecuta la suite de tests |
| `npm run test:coverage` | Ejecuta tests con cobertura |

---

## 🏗️ Estructura del proyecto

```text
advanced-datatable/
├── apps/
│   ├── mock-backend/   # Backend HTTP de pruebas
│   └── playground/     # Demo React/Vite
├── packages/
│   ├── api-client/     # Transporte HTTP y contratos de integración
│   ├── core/           # Motor de tabla, modelos y lógica base
│   ├── operations/     # Gestión de operaciones, batching y persistencia
│   ├── react/          # Hooks y contexto para React
│   ├── store/          # Store de estado de tabla
│   └── ui/             # Componentes visuales reutilizables
├── tests/              # Tests unitarios e integración
├── docs/               # RFCs, arquitectura y plan de implementación
└── specs/              # Notas técnicas por archivo/componente
```

### Resumen por capa

- **`packages/core`**: define el estado de tabla, operaciones y el motor principal.
- **`packages/operations`**: añade cola de operaciones, replay, persistencia y conectividad.
- **`packages/api-client`**: conecta la tabla con servicios HTTP.
- **`packages/store`**: centraliza el estado consumible por la UI.
- **`packages/react`**: expone integración idiomática para apps React.
- **`packages/ui`**: contiene la `DataTable`, grid y utilidades visuales.
- **`apps/playground`**: reúne escenarios como core, resilience, backend integration, selection lab y virtualization.
- **`apps/mock-backend`**: simula confirmaciones, conflictos, latencia y errores para validar flujos reales.

---

## 📚 Documentación relacionada

Si quieres profundizar en la arquitectura y el diseño:

- `docs/06-architecture.md`
- `docs/07-implementation-plan.md`
- `docs/10-backend-implementation.md`
- `docs/11-http-contracts.md`

