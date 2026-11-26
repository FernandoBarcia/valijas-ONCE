# Valijas ONCE

Herramienta para facilitar el envío de valijas: selecciona centros, indica los bultos y genera el archivo TXT para importarlo en Correos.

Contacto · fernando.barcia@once.es

## Descargar y usar

Descarga `Valijas-ONCE.html` desde [Releases](https://github.com/FernandoBarcia/valijas-ONCE/releases/latest) y ábrelo en Safari o Chrome. Funciona sin instalación y sin conexión.

## Construir desde el código fuente

Requiere Node.js 22 o superior solo para desarrollar y construir el HTML. No hay dependencias que instalar.

```sh
npm test
npm run build
```

Abre `Valijas ONCE.html`, que produce el build, en Safari o Chrome. La aplicación funciona sin servidor. El repositorio contiene únicamente centros ficticios. El código etiquetador por defecto es `9KAQ`; se puede cambiar en Configuración.

Para usar tu agenda, impórtala desde Centros o crea `data/centros.json` siguiendo `data/centros.example.json` y reconstruye. Ese archivo está excluido de Git.

## Funciones

- Cantidades por centro y resumen del envío. La pantalla inicial muestra solo los centros favoritos (o todos, si no hay ninguno marcado); la búsqueda recorre toda la agenda.
- Búsqueda en Centros por nombre, localidad, provincia, dirección o destinatario.
- Revisión opcional antes de generar: destinos, bultos y referencias tal como irán en el TXT, sin gastar referencias.
- Alta, edición, eliminación e importación de centros. El código interno se asigna automáticamente (`CENTRO-001`, `CENTRO-002`…), también a los centros importados sin código. El tipo de vía se elige entre los códigos de Correos (C, AV, PLA, VIA, ALA, AUP, AUV, BUL, CAM, CAR, GLO, PAS, PAJ, RON, SEC, TRA, OTR).
- Un registro independiente por bulto, con 186 campos, tabuladores y CRLF.
- Referencias correlativas, configuración del producto y características.
- Validación de datos y correos sin tildes.
- Copias de seguridad y recuperación del último TXT de la sesión.

La versión de trabajo ha sido utilizada con éxito en la web de Correos. La agenda incluida aquí es ficticia y no debe utilizarse para envíos reales.

## Organización

`src/correos.js` contiene el generador y las validaciones; `src/app.js`, la interfaz y persistencia; `src/index.html` y `src/styles.css`, la presentación. Los iconos están en `assets/` y se incrustan en el HTML. `build.js` empaqueta la aplicación en un HTML y comprueba la coincidencia de versiones. Las pruebas utilizan `node:test` sin dependencias.

La versión figura en `package.json` y `src/correos.js`; deben actualizarse juntas. Para actualizar, guarda una copia completa y sustituye `Valijas ONCE.html` en la misma carpeta. Usa el mismo navegador y perfil. Si al abrirlo faltan tu agenda o tus contadores, restaura la copia completa.

## Datos de trabajo

No añadas a Git la agenda real, copias de seguridad, TXT de envíos, hojas de cálculo ni capturas con destinatarios. El HTML generado también incluye la agenda y está excluido. La copia de trabajo con los centros reales se mantiene fuera de este repositorio.

## Alcance

Formato 2018v002, Paq Premium o Paq Estándar a domicilio, España, sin servicios adicionales. Los envíos a Canarias, Ceuta y Melilla (CP 35, 38, 51 y 52) se declaran automáticamente como Documentos (campo 111 = 1). Hasta 150 bultos por archivo. Peso y medidas comunes por envío. La identificación del remitente procede de la cuenta de Correos. Las validaciones internas requieren nombre y dos apellidos.

Consulta la [guía del formato de Correos](https://epostal.correos.es/OV2PREENVWEB/plantillas/GuiadeAyuda.pdf).

## Repositorio

[Ver proyecto en GitHub](https://github.com/FernandoBarcia/valijas-ONCE). El enlace también aparece en el pie de la aplicación.
