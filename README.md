# FLAD Análisis - Módulo de Análisis Estadístico

Aplicación Tauri + React + TypeScript para análisis estadístico de bases de datos FLAD.

## Características

### 3 Pestañas Principales:

1. **Carga**: Importar archivos JSON de bases de datos
2. **Filtros**: Seleccionar jardines y rangos de fechas
3. **Análisis**: Visualización estadística con gráficos de torta

### Categorías de Análisis:

- **Pagados**: Con informe de pago
- **Recibidos**: Con fecha de recepción, sin informe de pago
- **Atrasados**: Sin recepción, fecha límite vencida, sin informe de pago
- **En Curso**: Con orden de trabajo activa
- **Sin Curso**: Sin orden de trabajo

### Visualizaciones:

- Toggle Cantidades/Montos
- Tabla resumen por categoría
- Gráficos de torta (cantidades y montos)

## Instalación

```bash
cd flad-analisis
npm install
```

## Desarrollo

```bash
npm run dev
```

## Construcción

```bash
npm run tauri build
```

## Tecnologías

- Tauri 2.x
- React 18
- TypeScript
- TailwindCSS
- Recharts
- Lucide Icons
