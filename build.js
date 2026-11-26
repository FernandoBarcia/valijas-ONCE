// Development only. Runtime HTML needs no Node, server, packages or network.
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname,read=p=>fs.readFileSync(path.join(root,p),'utf8');
const version=JSON.parse(read('package.json')).version;
if(require('./src/correos.js').VERSION!==version) throw new Error('La versión del generador y la del proyecto no coinciden.');
const centerPath=fs.existsSync(path.join(root,'data/centros.json'))?'data/centros.json':'data/centros.example.json';
let html=read('src/index.html');
// Iconos incrustados como data: (la CSP solo permite imágenes data:).
const dataURI=(file,type)=>`data:${type};base64,${fs.readFileSync(path.join(root,file)).toString('base64')}`;
for(const [marker,content] of [
  ['/* STYLES */',read('src/styles.css')],
  ['/* ICON_SVG */',dataURI('assets/icon.svg','image/svg+xml')],['/* ICON_PNG */',dataURI('assets/icon-32.png','image/png')],
  ['/* ICON_APPLE */',dataURI('assets/apple-touch-icon.png','image/png')],
  ['/* CENTERS */',JSON.stringify(JSON.parse(read(centerPath))).replace(/</g,'\\u003c')],
  ['/* CORE */',read('src/correos.js')],['/* APP */',read('src/app.js')]
]) html=html.replace(marker,()=>content);
const filename='Valijas-ONCE.html';
fs.writeFileSync(path.join(root,filename),html);
console.log(`${filename} generado (v${version}).`);
