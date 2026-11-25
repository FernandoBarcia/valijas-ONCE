# Valijas ONCE

Herramienta para facilitar el envío de valijas: selecciona centros, indica los bultos y genera el archivo TXT para importarlo en Correos.

Contacto · fernando.barcia@once.es

## Puesta en marcha

Requiere Node.js 22 o superior solo para desarrollar y construir el HTML. No hay dependencias que instalar.

```sh
npm test
npm run build
```

Abre el HTML versionado que produce el build en Safari o Chrome. La aplicación funciona sin servidor. El repositorio contiene únicamente centros ficticios y un código etiquetador de ejemplo (`TEST`). Configura el código real en la aplicación antes de preparar envíos.

Para usar tu agenda, impórtala desde Centros o crea `data/centros.json` siguiendo `data/centros.example.json` y reconstruye. Ese archivo está excluido de Git.

## Funciones

- Cantidades por centro y resumen del envío.
- Revisión opcional antes de generar: destinos, bultos y referencias tal como irán en el TXT, sin gastar referencias.
- Edición e importación de centros.
- Un registro independiente por bulto, con 186 campos, tabuladores y CRLF.
- Referencias correlativas, configuración del producto y características.
- Validación de datos y correos sin tildes.
- Copias de seguridad y recuperación del último TXT de la sesión.

La versión de trabajo ha sido utilizada con éxito en la web de Correos. La agenda incluida aquí es ficticia y no debe utilizarse para envíos reales.

## Organización

`src/correos.js` contiene el generador y las validaciones; `src/app.js`, la interfaz y persistencia; `src/index.html` y `src/styles.css`, la presentación. `build.js` empaqueta la aplicación en un HTML y comprueba la coincidencia de versiones. Las pruebas utilizan `node:test` sin dependencias.

La versión figura en `package.json` y `src/correos.js`; deben actualizarse juntas. Al abrir una versión con otro nombre de archivo, restaura una copia completa para conservar tus datos y contadores si el navegador utiliza almacenamiento separado.

## Datos de trabajo

No añadas a Git la agenda real, copias de seguridad, TXT de envíos, hojas de cálculo ni capturas con destinatarios. El HTML generado también incluye la agenda y está excluido. La copia de trabajo con los centros reales se mantiene fuera de este repositorio.

## Alcance

Formato 2018v002, Paq Premium o Paq Estándar a domicilio, España, sin servicios aduaneros o adicionales. Hasta 150 bultos por archivo. Peso y medidas comunes por envío. La identificación del remitente procede de la cuenta de Correos. Las validaciones internas requieren nombre y dos apellidos.

Consulta la [guía del formato de Correos](https://epostal.correos.es/OV2PREENVWEB/plantillas/GuiadeAyuda.pdf).

## Repositorio

[Ver proyecto en GitHub](https://github.com/FernandoBarcia/valijas-ONCE). El enlace también aparece en el pie de la aplicación.
