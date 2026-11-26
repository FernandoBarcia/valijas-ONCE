# Valijas ONCE

Valijas ONCE prepara el archivo TXT que se importa en Correos para enviar valijas. Selecciona los centros destinatarios, indica cuántos bultos va a recibir cada uno y revisa el envío antes de descargar el fichero.

**[Descargar Valijas-ONCE.html](https://github.com/FernandoBarcia/valijas-ONCE/releases/latest/download/Valijas-ONCE.html)**

Abre el archivo descargado en Safari o Chrome. La herramienta funciona sin instalación y sin conexión. Solo necesitas acceder a Correos para importar el TXT.

## Preparar la agenda

Puedes introducir los centros que usas habitualmente en **Centros → Añadir centro**. Si ya tienes una agenda en JSON, ve a **Centros → Importar centros JSON**. La vista previa indica qué centros se añadirán y qué campos se actualizarán.

- **Añadir y actualizar** combina las agendas por código interno. Los registros sin código se añaden como centros nuevos.
- **Sustituir toda la agenda** carga el contenido del archivo y vacía las cantidades del envío en curso. Úsalo al importar la agenda de trabajo por primera vez para quitar el centro de ejemplo.

Marca con la estrella los centros habituales para tenerlos a mano en la pantalla de envío. El buscador recorre toda la agenda. Si un centro queda pendiente de revisión, su ficha indica los campos que debes corregir antes de usarlo.

## Preparar un envío

1. Abre **Envío de valijas** e indica los bultos de cada centro destinatario.
2. Pulsa **Revisar antes de generar** para comprobar las direcciones, las cantidades y las referencias. La revisión no reserva referencias.
3. Pulsa **Generar TXT Correos** y carga el archivo desde **Importar fichero** en Correos.

Cada TXT admite hasta **150 bultos**, con un registro por bulto. La herramienta prepara envíos nacionales a domicilio con **Paq Premium** o **Paq Estándar**, con el mismo peso y medidas para todos los bultos de la remesa. Para **Canarias, Ceuta y Melilla**, genera la declaración aduanera como **Documentos**.

## Copias de seguridad y actualizaciones

La agenda se guarda en el navegador con el que abres el HTML. En **Configuración → Copia de seguridad** puedes descargar un JSON que incluye centros y favoritos, configuración, cantidades en curso y contadores de referencias.

Antes de actualizar, guarda una copia completa. Sustituye el HTML conservando su nombre y carpeta, y vuelve a abrirlo con el mismo navegador y perfil. Si necesitas recuperar los datos o cambiar de ordenador, usa **Restaurar copia**.

El HTML de GitHub incluye un centro ficticio. Para compartir la herramienta con un compañero, envíale el HTML y comparte la agenda de trabajo por separado en un canal interno con acceso restringido.

## Compilar y mantener el proyecto

Con Node.js 22 o superior, ejecuta desde la raíz del repositorio:

```sh
npm test
npm run build
```

El build crea `Valijas-ONCE.html` en la raíz. No hay dependencias que instalar. Para una compilación de uso interno se puede incluir `data/centros.json`, siguiendo el [ejemplo de agenda](data/centros.example.json). Ese archivo está excluido de Git. Mantén también fuera del repositorio las copias de seguridad, los TXT de trabajo y cualquier HTML compilado con una agenda real.

- [Generador y validación del TXT](src/correos.js)
- [Interfaz y almacenamiento local](src/app.js)
- [Pruebas del formato y la agenda](tests/correos.test.js)
- [Guía de Correos para el formato 2018v002](docs/guia-correos-formato-2018v002.pdf)

Para publicar una nueva versión, actualiza el número en `package.json` y `src/correos.js`. GitHub Actions ejecuta las pruebas y el build en `main` antes de publicar el HTML en [Releases](https://github.com/FernandoBarcia/valijas-ONCE/releases).

Contacto · [Fernando Barcia](mailto:fernando.barcia@once.es)
