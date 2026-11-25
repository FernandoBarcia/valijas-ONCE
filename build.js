// Development only. Runtime HTML needs no Node, server, packages or network.
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname,read=p=>fs.readFileSync(path.join(root,p),'utf8');
const version=JSON.parse(read('package.json')).version;
if(require('./src/correos.js').VERSION!==version) throw new Error('La versión del generador y la del proyecto no coinciden.');
const centerPath=fs.existsSync(path.join(root,'data/centros.json'))?'data/centros.json':'data/centros.example.json';
let html=read('src/index.html');
for(const [marker,content] of [
  ['/* STYLES */',read('src/styles.css')],
  ['/* CENTERS */',JSON.stringify(JSON.parse(read(centerPath))).replace(/</g,'\\u003c')],
  ['/* CORE */',read('src/correos.js')],['/* APP */',read('src/app.js')]
]) html=html.replace(marker,()=>content);
fs.writeFileSync(path.join(root,'Valijas ONCE.html'),html);
const filename=`Valijas-ONCE-v${version}.html`;
fs.writeFileSync(path.join(root,filename),html);
console.log(`${filename} generado.`);
