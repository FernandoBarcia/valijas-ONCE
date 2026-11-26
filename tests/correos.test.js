const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../src/correos.js');
const base={codigo:'TEST-1',nombreCentro:'CENTRO DE PRUEBA',nombre:'MARÍA',apellido1:'CAMAÑO',apellido2:'TOURIÑAN',tipoVia:'C',via:'PRUEBA',numero:'1',complemento:'',cp:'01001',localidad:'A CORUÑA',provincia:'A CORUÑA',email:'',telefono:'',activo:true,validado:true};
const run=(n=1,c={},config={},extra={})=>C.generate({centros:[{...base,...c}],destinos:[{codigo:'TEST-1',bultos:n}],config:{...C.DEFAULTS,...config},fecha:'20261125',...extra});
test('un bulto: U',()=>assert.equal(run().records[0][0],'U'));
test('seis bultos: C R R R R F',()=>assert.deepEqual(run(6).records.map(r=>r[0]),['C','R','R','R','R','F']));
test('dos bultos: C F',()=>assert.deepEqual(run(2).records.map(r=>r[0]),['C','F']));
test('186 campos y 185 tabuladores en todas las líneas',()=>{for(const line of run(6).txt.trimEnd().split('\r\n')){assert.equal(line.split('\t').length,186);assert.equal((line.match(/\t/g)||[]).length,185);}});
test('CAMAÑO y TOURIÑAN se normalizan solo al exportar',()=>{const r=run().records[0];assert.equal(r[19],'CAMANO');assert.equal(r[20],'TOURINAN');assert.equal(base.apellido1,'CAMAÑO');});
test('ñ minúscula y nombres, sin eliminar tildes',()=>{const r=run(1,{nombre:'Begoña',apellido1:'Muñoz'}).records[0];assert.equal(r[18],'Begona');assert.equal(r[19],'Munoz');assert.equal(run().records[0][18],'MARÍA');});
test('normalización se puede desactivar',()=>assert.equal(run(1,{}, {normalizarEnie:false}).records[0][19],'CAMAÑO'));
test('A CORUÑA permanece y CP conserva cero inicial',()=>{const r=run().records[0];assert.equal(r[33],'A CORUÑA');assert.equal(r[34],'A CORUÑA');assert.equal(r[35],'01001');});
test('complemento y email opcionales vacíos',()=>{assert.equal(run().records[0][26],'');assert.equal(run().records[0][42],'');});
test('regresión Correos: bloquea email con tilde sin inventar otro ni omitirlo',()=>{assert.throws(()=>run(6,{email:'organización@example.com'}),/ASCII/);});
test('email confirmado por el usuario se exporta en los seis registros',()=>{const email='organizacion@example.com',r=run(6,{email});assert.ok(r.records.every(row=>row[42]===email));});
test('validador rechaza una fila alterada con email Unicode',()=>{const r=run().records;r[0][42]='organización@example.com';assert.throws(()=>C.validateRecords(r),/ASCII/);});
test('email ASCII mal formado no pasa al TXT',()=>{for(const email of ['a..b@example.com','.a@example.com','a@-example.com'])assert.throws(()=>run(1,{email}),/Correo/);});
test('agenda e importación rechazan tildes y ñ en emails',()=>{
  for(const email of ['josé@example.com','niño@example.com','ana@domínio.es']) {
    assert.ok(C.centerErrors({...base,email},false).some(s=>s.includes('ASCII')));
    assert.throws(()=>C.validateCenters([{...base,email}]),/ASCII/);
  }
  assert.doesNotThrow(()=>C.validateCenters([{...base,email:''}]));
});
test('rechaza todos los datos obligatorios vacíos',()=>{for(const k of ['nombre','apellido1','apellido2','tipoVia','via','numero','cp','localidad','provincia']) assert.throws(()=>run(1,{[k]:''}),/obligatorio/);});
test('rechaza centros inactivos y pendientes',()=>{assert.throws(()=>run(1,{activo:false}),/inactivo/);assert.throws(()=>run(1,{validado:false}),/validar/);});
test('rechaza cantidades inválidas y remesa vacía',()=>{for(const n of [0,-1,1.5,151,NaN,Infinity])assert.throws(()=>run(n));assert.throws(()=>run(1,{}, {},{destinos:[]}));});
test('máximo 150 y contador continuo',()=>{const r=run(150,{}, {},{inicio:25});assert.equal(r.records.length,150);assert.equal(r.referencias[149],'VALIJA-20261125-174');assert.equal(r.siguiente,175);});
test('el límite aplica a la remesa completa',()=>assert.throws(()=>run(1,{}, {},{centros:[base,{...base,codigo:'TEST-2'}],destinos:[{codigo:'TEST-1',bultos:100},{codigo:'TEST-2',bultos:51}]}),/150/));
test('registro usa las posiciones oficiales y campos vacíos',()=>{const r=run().records[0];assert.deepEqual([r[1],r[2],r[4],r[13],r[14],r[22],r[37],r[45],r[48],r[49],r[50],r[51],r[52],r[185]],['2018v002','S0235','9KAQ','01','01','CENTRO DE PRUEBA','ES','VALIJA-20261125-001','ST','1000','20','15','20','E']);assert.equal(r[3],'');assert.equal(r[162],'');});
test('sin encabezado, CRLF incluido al final y sin LF sueltos',()=>{const r=run(2);assert.ok(r.txt.startsWith('C\t2018v002\t'));assert.ok(r.txt.endsWith('\tE\r\n'));assert.ok(!r.txt.replace(/\r\n/g,'').includes('\n'));});
test('codificación Windows-1252 conserva Ñ con byte D1',()=>{const r=run();assert.ok(r.bytes.includes(0xD1));assert.equal(new TextDecoder('windows-1252').decode(r.bytes),r.txt);assert.notEqual(r.bytes[0],0xEF);});
test('UTF-8 y BOM opcional',()=>{const a=run(1,{}, {codificacion:'utf-8'}),b=run(1,{}, {codificacion:'utf-8-bom'});assert.equal(new TextDecoder().decode(a.bytes),a.txt);assert.deepEqual(Array.from(b.bytes.slice(0,3)),[239,187,191]);assert.equal(new TextDecoder().decode(b.bytes),b.txt);});
test('Windows-1252 rechaza caracteres irrepresentables sin sustituirlos',()=>{assert.throws(()=>run(1,{nombre:'李'}),/Windows-1252/);assert.doesNotThrow(()=>run(1,{nombre:'李'},{codificacion:'utf-8'}));});
test('Windows-1252 asigna símbolos europeos correctamente',()=>assert.deepEqual(Array.from(C.encode('€ŒŸ','windows-1252')),[128,140,159]));
test('rechaza tabuladores, saltos y controles en cualquier campo',()=>{for(const s of ['A\tB','A\nB','A\rB','A\u0000B','A\u2028B'])assert.throws(()=>run(1,{via:s}),/control/);});
test('longitudes, CP no numérico y CP numérico sin texto se rechazan',()=>{assert.throws(()=>run(1,{numero:'123456'}),/máximo/);assert.throws(()=>run(1,{cp:'1001'}),/cinco/);assert.throws(()=>run(1,{cp:1001}),/texto/);assert.throws(()=>run(1,{cp:'99000'}),/provincia/);});
test('no admite productos o perfiles sin implementar',()=>{for(const cfg of [{producto:'XXXXX'},{modalidad:'LS'},{pais:'PT'},{estructura:'2026v001'},{peso:'0'},{alto:'1.5'},{etiquetador:'AB'},{prefijo:'a\tb'}])assert.throws(()=>run(1,{},cfg));});
test('no genera destinos que requieren aduana sin sus datos',()=>assert.throws(()=>run(1,{cp:'35001'}),/aduanera/));
test('el validador detecta campos, marcas, fin, obligatorios y duplicados alterados',()=>{
  for(const mutate of [r=>r[0].pop(),r=>r[0][0]='R',r=>r[1][0]='C',r=>r[0][185]='',r=>r[0][18]='',r=>r[1][45]=r[0][45],r=>r[0][13]='02',r=>r[0][1]='bad',r=>r[0][25]='a\tb']) {const r=run(2).records;mutate(r);assert.throws(()=>C.validateRecords(r));}
});
test('el validador TXT rechaza LF, línea vacía y tabulador extra',()=>{const txt=run().txt;for(const bad of [txt.replace(/\r\n/g,'\n'),txt+'\r\n',txt.replace('\t','\t\t'),txt.slice(0,-2)])assert.throws(()=>C.validateTXT(bad));});
test('referencias únicas entre remesas del día',()=>{const a=run(6),b=run(6,{}, {},{inicio:a.siguiente});assert.equal(new Set([...a.referencias,...b.referencias]).size,12);});
test('contadores restaurados nunca retroceden',()=>assert.deepEqual(C.mergeCounters({'VALIJA:20261125':17},{'VALIJA:20261125':2,'VALIJA:20261126':4}),{'VALIJA:20261125':17,'VALIJA:20261126':4}));
test('fechas, referencias y códigos duplicados se rechazan',()=>{assert.throws(()=>run(1,{}, {},{fecha:'20260230'}));assert.throws(()=>run(2,{}, {},{inicio:999999}));assert.throws(()=>C.validateCenters([base,base]));assert.throws(()=>run(1,{}, {},{destinos:[{codigo:'TEST-1',bultos:1},{codigo:'TEST-1',bultos:1}]}));});
test('fecha de referencia utiliza Europe/Madrid',()=>assert.equal(C.dateKey(new Date('2026-11-24T23:30:00Z')),'20261125'));
test('agenda de ejemplo: genera un envío sin modificar datos',()=>{
  const centros=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/centros.example.json'),'utf8'));
  const before=JSON.stringify(centros);
  const r=C.generate({centros,destinos:centros.map(c=>({codigo:c.codigo,bultos:1})),fecha:'20261125'});
  assert.equal(r.records.length,1);assert.equal(JSON.stringify(centros),before);
});
test('cantidades: vacío es 0 y solo se aceptan enteros sin signo',()=>{
  assert.equal(C.quantityFrom(''),0);assert.equal(C.quantityFrom('7'),7);assert.equal(C.quantityFrom('007'),7);
  for(const v of ['-','-1','1.5','1e2','abc',' 3',undefined])assert.ok(Number.isNaN(C.quantityFrom(v)),String(v));
  assert.ok(Number.isNaN(C.quantityFrom('',true)),'entrada que el navegador no entiende');
});
test('cantidades guardadas: centros bloqueados a 0 y valores raros fuera',()=>{
  const centros=[base,{...base,codigo:'TEST-2',activo:false},{...base,codigo:'TEST-3',validado:false},{...base,codigo:'TEST-4'}];
  assert.deepEqual(C.cleanDraft(centros,{'TEST-1':4,'TEST-2':7,'TEST-3':2,'TEST-4':1.5,'OTRO':3}),{'TEST-1':4,'TEST-2':0,'TEST-3':0});
  assert.deepEqual(C.cleanDraft(centros,null),{});
});
test('revisión: un grupo por destino con bultos y primera y última referencia',()=>{
  const centros=[base,{...base,codigo:'TEST-2',nombreCentro:'OTRO CENTRO',cp:'15003',localidad:'A CORUÑA'}];
  const r=C.generate({centros,destinos:[{codigo:'TEST-1',bultos:3},{codigo:'TEST-2',bultos:1}],fecha:'20261125',inicio:8});
  const g=C.reviewGroups(r.records);
  assert.equal(g.length,2);
  assert.deepEqual([g[0].centro,g[0].bultos,g[0].desde,g[0].hasta],['CENTRO DE PRUEBA',3,'VALIJA-20261125-008','VALIJA-20261125-010']);
  assert.deepEqual([g[1].centro,g[1].bultos,g[1].desde,g[1].hasta,g[1].cp],['OTRO CENTRO',1,'VALIJA-20261125-011','VALIJA-20261125-011','15003']);
  assert.equal(g[0].destinatario,'MARÍA CAMANO TOURINAN','los nombres salen como en el TXT');
  assert.equal(g[0].direccion,'C PRUEBA 1');
});
test('código interno automático: siguiente libre y sin reutilizar huecos',()=>{
  assert.equal(C.nextCode([]),'CENTRO-001');
  assert.equal(C.nextCode([base]),'CENTRO-001');
  assert.equal(C.nextCode([{codigo:'CENTRO-001'},{codigo:'CENTRO-007'},{codigo:'EJEMPLO-050'}]),'CENTRO-008');
});
test('centros importados sin código reciben uno automático y único',()=>{
  const list=C.validateCenters([{...base,codigo:'CENTRO-004'},{...base,codigo:''},{...base,codigo:undefined}]);
  assert.deepEqual(list.map(c=>c.codigo),['CENTRO-004','CENTRO-005','CENTRO-006']);
});
test('tipo de vía: solo los códigos de Correos',()=>{
  for(const t of ['C','AV','PLA','TRA','OTR'])assert.doesNotThrow(()=>run(1,{tipoVia:t}));
  for(const t of ['CL','PZ','c','XYZ'])assert.throws(()=>run(1,{tipoVia:t}),/Tipo de vía/);
  assert.doesNotThrow(()=>C.validateCenters([{...base,tipoVia:'CL'}]),'una agenda antigua se importa y queda pendiente de revisión');
  assert.ok(C.centerErrors({...base,tipoVia:'CL'}).some(e=>e.includes('Tipo de vía')));
});
