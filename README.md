# FORMA — prototipo local

## Inicio

1. Instala Node.js 20 o posterior.
2. Abre una terminal en esta carpeta.
3. Ejecuta `npm install` y después `npm run dev`.
4. Abre http://localhost:3000.

## Qué incluye
- Plan inicial de noviembre 2026 con opciones y cantidades del PDF de nutrición.
- Selector diario limitado al plan activo.
- Compra semanal consolidada y descuento de despensa.
- Entrenos flexibles, series, pesos, comentarios, foto de ejercicio (limitada a 1 MB), reutilización de series anteriores.
- Medidas iniciales del 12/11/2026 y nuevas mediciones.
- Duplicación y edición de planes, activación de un plan diferente.
- Exportación JSON.

## Limitaciones importantes
- Es un prototipo local, no hay autenticación, sincronización ni base de datos.
- localStorage no es una copia de seguridad fiable; exporta tus datos y no borres los datos del navegador.
- Los menús anteriores conservan sus selecciones, pero **todavía no** guardan una instantánea independiente del plan histórico: al cambiar de plan, la vista del menú antiguo puede mostrar las recetas del plan activo. Hay que resolverlo en la versión con Supabase.
- No hay importación automática de PDF, almacenamiento de fotos robusto, cálculo de macros, conversión crudo/cocido, ni modo offline sincronizado.
- Para usarla en iPhone desde fuera del ordenador se necesita desplegarla en un hosting HTTPS (por ejemplo Vercel). Después en Safari: Compartir > Añadir a pantalla de inicio.
- La copia inicial incluye leche semidesnatada en las opciones de desayuno según el café con 200 ml indicado en el plan; el café no se cuenta como ingrediente de compra.
