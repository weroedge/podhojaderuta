# Contexto del Proyecto: ZETAK @ San Mamés - Hoja de Ruta

## Propósito
Este proyecto es el **Dossier Operativo Digital** para la producción técnica y logística del concierto de **ZETAK** en el **Estadio San Mamés (Bilbao)**, programado para junio de 2026. Su objetivo es centralizar planos, horarios, contactos y especificaciones técnicas para todo el staff y proveedores, permitiendo una consulta rápida y coordinada desde cualquier dispositivo.

## Arquitectura y Tecnologías
- **Frontend:** Aplicación web estática (Single Page) desarrollada con **HTML5, CSS3 (Vanilla)** y **JavaScript (Vanilla)**. No utiliza frameworks pesados para garantizar velocidad y compatibilidad.
- **Estilo:** Interfaz moderna con modo oscuro, tipografía "Inter" y sistema de navegación por pestañas.
- **Gestión de Datos:** La información principal reside en el `index.html`, complementada por archivos **Markdown** para secciones dinámicas (como Logística).
- **Sincronización:** Utiliza un script `sync_dossier.js` y un archivo de procesamiento por lotes `Sincronizar_Dossier.bat` para mantener la documentación actualizada con fuentes externas (Google Drive).
- **Documentación:** Repositorio extenso de planos y especificaciones en formato **PDF**.

## Estructura de Archivos Clave
- `/index.html`: Interfaz principal del usuario y contenedor de la mayoría de la información.
- `/context.md`: Este archivo; guía de arquitectura y estado del proyecto.
- `/sync_dossier.js`: Script de sincronización de archivos y assets.
- `/Logistica/Logistica.md`: Detalle de transportes y alojamiento coordinado por Maddi.
- `/PLANOS/PDFs/`: Carpeta crítica con toda la planimetría aprobada.

## Estado Actual y Hitos
- **Fase:** Operativa / Ejecución. Los horarios y proveedores están confirmados para las fechas del 8 al 24 de junio de 2026.
- **Refactorizaciones Recientes:** Consolidación de la navegación en una única SPA (`index.html`) y externalización de la lógica de logística a Markdown.
- **Arquitectura:** Se mantiene una estructura plana y sencilla para facilitar la edición directa y la sincronización automática.

## Convenciones y Reglas Críticas
- **Seguridad (EPIS):** Casco, calzado de seguridad y chaleco obligatorios en campo.
- **Acceso:** Único punto de acceso oficial: Túnel de Mercancías (Calle Ventosa).
- **Comunicación:** El dossier es la "fuente de verdad" para el equipo técnico.
