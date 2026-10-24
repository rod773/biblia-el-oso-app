# Biblia el oso — Lector en voz alta

Aplicación web (Next.js) para escuchar el libro *"Biblia el oso"* de forma auditiva, mostrando la página escaneada original y desplazándose automáticamente mientras se lee.

## Características

- **Lectura en voz alta** con la API nativa `speechSynthesis` del navegador (sin servicios externos).
- **Voz en español**: prefiere voces `es-ES`, con «Microsoft Sebastian» como voz predeterminada.
- **Selección de voz**, **control de volumen**, **auto-avance** a la siguiente página.
- **Auto-scroll**: la vista se desplaza en proporción al progreso de la lectura.
- **Navegación manual** (Anterior / Siguiente) y selector de página.
- **Imágenes originales**: cada página se muestra como imagen escaneada (`public/pages/page-NNN.png`).

## Cómo funciona

- `src/app/page.tsx` contiene toda la lógica de la aplicación.
- El texto de cada página proviene de `src/pages.json` (1654 páginas con `{ page, text }`), generado desde el PDF (`npm run generate`).
- El texto se divide en fragmentos; cada uno se envuelve en un `SpeechSynthesisUtterance` y se encadenan por `onend`.
- Se estima la duración de cada fragmento (`max(6000, longitud * 150)`) para calcular el progreso y animar el scroll.

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servir el build de producción |
| `npm run lint` | Linter (ESLint) |
| `npm run generate` | Regenera `src/pages.json` desde `Biblia el oso.pdf` |

## Estructura

```
biblia-el-oso-app/
├── public/
│   └── pages/
│       ├── page-001.png ... page-1654.png   # Páginas escaneadas del PDF
├── scripts/
│   └── generate-pages.py                    # Generador de pages.json
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Layout raíz (fuentes Geist, metadata)
│   │   ├── page.tsx        # Toda la lógica de lectura y UI
│   │   └── globals.css     # Estilos globales (Tailwind + tema claro/oscuro)
│   └── pages.json          # Texto de las 1654 páginas
├── package.json
└── README.md
```

## Notas

- El contenido escaneado e imágenes pertenecen a la edición original del libro y se usan aquí únicamente con fines personales/educativos.
- La lectura en voz alta depende de las voces instaladas en el navegador/sistema.
