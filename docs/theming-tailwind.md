# Advanced DataTable Theming & Tailwind Integration

## Objetivo

La librería utiliza Tailwind CSS para todos los estilos, pero expone un sistema de tokens mediante variables CSS (`--dt-*`) que permite personalizar la estética desde la implementación, sin recompilar Tailwind.

## ¿Cómo funciona?

- **Tailwind** se usa para la estructura, layout y utilidades.
- **Variables CSS** (tokens) se definen en un archivo `theme.css` y se referencian en las clases Tailwind usando la sintaxis `[color:var(--dt-primary)]`, etc.
- **Personalización**: El consumidor puede sobrescribir los tokens en su propio CSS para modificar colores, tipografía, bordes, etc.
- **Estilos compilados**: La librería se distribuye con los estilos ya compilados, pero los tokens pueden ser sobrescritos en cualquier momento.

## Ejemplo de tokens en `theme.css`

```css
:root {
  --dt-primary: #2563eb;
  --dt-bg: #fff;
  --dt-bg-alt: #f3f4f6;
  --dt-border: #e5e7eb;
  --dt-header-bg: #f9fafb;
  --dt-header-color: #111827;
  --dt-row-hover: #e0e7ff;
  --dt-radius: 0.375rem;
  --dt-font: 'Inter', sans-serif;
}
```

## Ejemplo de uso en componentes

```jsx
<div className="bg-(--dt-bg) text-(--dt-header-color) font-(--dt-font) rounded-(--dt-radius) ...">
  ...
</div>
```

## ¿Cómo personalizar?

En tu proyecto, simplemente sobrescribe los tokens:

```css
:root {
  --dt-primary: #d97706;
  --dt-bg: #1e293b;
  --dt-header-color: #fbbf24;
}
```

## Ventajas
- Máxima flexibilidad para el consumidor.
- No requiere recompilar Tailwind.
- Permite dark mode, branding, y ajustes finos fácilmente.

## Archivos clave
- `packages/ui/theme.css`: tokens base.
- `packages/ui/tailwind.config.js`: configuración de Tailwind para usar variables.
- Componentes: usan clases Tailwind con referencias a tokens.

---

Para dudas o ejemplos avanzados, consulta la documentación de cada componente o abre un issue.