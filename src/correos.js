(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Correos = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '1.0.6';
  const DEFAULTS = Object.freeze({estructura:'2018v002', producto:'S0235', etiquetador:'TEST',
    modalidad:'ST', pais:'ES', peso:'1000', largo:'20', alto:'15', ancho:'20',
    prefijo:'VALIJA', normalizarEnie:true, codificacion:'windows-1252'});
  // Posiciones humanas (1..186), contrastadas con PlantillaFicheroFormatoUnico.xls.
  const F = Object.freeze({posicion:1, estructura:2, producto:3, etiquetador:5,
    totalBultos:14, numeroBulto:15, nombre:19, apellido1:20, apellido2:21,
    empresa:23, tipoVia:25, via:26, complemento:27, numero:28, localidad:34,
    provincia:35, cp:36, pais:38, telefono:42, email:43, referencia:46,
    modalidad:49, peso:50, largo:51, alto:52, ancho:53, fin:186});
  const CENTER_FIELDS = Object.freeze({codigo:['Código interno',40],nombreCentro:['Centro',150],
    nombre:['Nombre',300],apellido1:['Primer apellido',50],apellido2:['Segundo apellido',50],
    tipoVia:['Tipo de vía',3],via:['Vía',100],numero:['Número',5],complemento:['Complemento',100],
    cp:['Código postal',5],localidad:['Localidad',100],provincia:['Provincia',40],
    email:['Correo electrónico',50],telefono:['Teléfono',15]});
  const REQUIRED = ['codigo','nombreCentro','nombre','apellido1','apellido2','tipoVia','via','numero','cp','localidad','provincia'];
  const CTRL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;
  function fail(message) { throw new Error(message); }
  function text(value, label, max, required=false) {
    if (typeof value !== 'string') fail(`${label}: debe ser texto.`);
    if (CTRL.test(value)) fail(`${label}: contiene un tabulador, salto de línea o carácter de control.`);
    if (value !== value.trim()) fail(`${label}: elimina los espacios del principio o del final.`);
    if (required && !value) fail(`${label}: falta un dato obligatorio.`);
    if ([...value].length > max) fail(`${label}: máximo ${max} caracteres.`);
    return value;
  }
  function centerErrors(c, forShipment=true) {
    const errors=[];
    if (!c || typeof c !== 'object' || Array.isArray(c)) return ['Centro no válido.'];
    for (const [key,[label,max]] of Object.entries(CENTER_FIELDS)) {
      try { text(c[key],label,max,forShipment ? REQUIRED.includes(key) : ['codigo','nombreCentro'].includes(key)); }
      catch(e) { errors.push(e.message); }
    }
    if (typeof c.activo!=='boolean' || typeof c.validado!=='boolean') errors.push('Activo y validado deben ser valores booleanos.');
    if (c.cp && !/^\d{5}$/.test(c.cp)) errors.push('Código postal: debe contener cinco dígitos.');
    if (c.cp && /^\d{5}$/.test(c.cp) && (+c.cp.slice(0,2)<1 || +c.cp.slice(0,2)>52)) errors.push('Código postal: provincia no válida.');
    if (c.telefono && !/^\d{1,15}$/.test(c.telefono)) errors.push('Teléfono: utiliza solo dígitos, sin espacios.');
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(c.email)) errors.push('Correo electrónico: formato no válido.');
    if (typeof c.email==='string') {
      try { emailForExport(c.email); } catch(e) { errors.push(e.message); }
    }
    if (forShipment) {
      if (c.activo!==true) errors.push('Centro inactivo.');
      if (c.validado!==true) errors.push('Destinatario pendiente de validar.');
      if (/^(35|38|51|52)/.test(c.cp)) errors.push('Esta versión no admite destinos que requieren información aduanera.');
    }
    return errors;
  }
  function validateCenters(list) {
    if (!Array.isArray(list) || !list.length || list.length>500) fail('El archivo debe contener entre 1 y 500 centros.');
    const ids=new Set();
    return list.map((input,i)=>{
      const c={};
      for (const key of Object.keys(CENTER_FIELDS)) c[key]=input?.[key] ?? '';
      c.activo=input?.activo; c.validado=input?.validado;
      const errors=centerErrors(c,false);
      if (errors.length) fail(`Centro ${i+1}: ${errors.join(' ')}`);
      if (ids.has(c.codigo)) fail(`Código de centro duplicado: ${c.codigo}.`);
      ids.add(c.codigo);
      return c;
    });
  }
  function validateConfig(c) {
    if (!c || typeof c !== 'object') fail('Configuración no válida.');
    if (c.estructura!=='2018v002') fail('Solo está implementada la estructura 2018v002.');
    if (!['S0235','S0132'].includes(c.producto)) fail('Producto no soportado: utiliza Paq Premium o Paq Estándar a domicilio.');
    if (!/^[A-Z0-9]{4}$/.test(c.etiquetador)) fail('Código etiquetador: cuatro letras mayúsculas o dígitos.');
    if (c.pais!=='ES' || c.modalidad!=='ST') fail('Esta versión admite España y entrega a domicilio (ES / ST).');
    for (const k of ['peso','largo','alto','ancho']) {
      if (typeof c[k]!=='string' || !/^[1-9]\d*$/.test(c[k]) || c[k].length>(k==='peso'?5:3)) fail(`${k}: introduce un entero positivo de hasta ${k==='peso'?5:3} dígitos.`);
    }
    if (typeof c.prefijo!=='string' || !/^[A-Z0-9-]{1,20}$/.test(c.prefijo)) fail('Prefijo: de 1 a 20 letras mayúsculas, números o guiones.');
    if (typeof c.normalizarEnie!=='boolean') fail('Normalización de Ñ no válida.');
    if (!['windows-1252','utf-8','utf-8-bom'].includes(c.codificacion)) fail('Codificación no soportada.');
    return c;
  }
  function dateKey(date=new Date()) {
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return p.year+p.month+p.day;
  }
  function checkDate(s) {
    if (!/^\d{8}$/.test(s)) fail('Fecha de envío no válida.');
    const d=new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T12:00:00Z`);
    if (Number.isNaN(d.getTime()) || dateKey(d)!==s) fail('Fecha de envío no válida.');
  }
  function normalizeName(value, enabled) { return enabled ? value.replace(/Ñ/g,'N').replace(/ñ/g,'n') : value; }
  // No corregir direcciones arbitrarias ni omitirlas silenciosamente.
  // El usuario confirmó la corrección concreta de la agenda original.
  function emailForExport(value) {
    if (!value) return '';
    if (/[^\x00-\x7f]/.test(value)) fail('Correo electrónico: contiene tildes o caracteres no ASCII. Corrige la dirección antes de exportar.');
    const parts=value.split('@'), local=parts[0], domain=parts[1];
    if(parts.length!==2 || !/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..') || !domain.includes('.') || domain.split('.').some(label=>! /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label))) fail('Correo electrónico: formato no compatible con la exportación de Correos.');
    return value;
  }
  function position(i,n) { return n===1?'U':i===0?'C':i===n-1?'F':'R'; }
  const CP1252 = new Map([... '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'].map((ch,i)=>[ch,[128,130,131,132,133,134,135,136,137,138,139,140,142,145,146,147,148,149,150,151,152,153,154,155,156,158,159][i]]));
  function encode(s,encoding) {
    if (encoding==='utf-8' || encoding==='utf-8-bom') {
      return new TextEncoder().encode((encoding==='utf-8-bom'?'\ufeff':'')+s);
    }
    if (encoding!=='windows-1252') fail('Codificación no soportada.');
    const bytes=[];
    for (const ch of s) {
      const n=ch.codePointAt(0);
      if (n<128 || (n>=160 && n<=255)) bytes.push(n);
      else if (CP1252.has(ch)) bytes.push(CP1252.get(ch));
      else fail(`El carácter «${ch}» no se puede representar en Windows-1252. Corrige el dato o selecciona UTF-8.`);
    }
    return new Uint8Array(bytes);
  }
  function validateRecords(records) {
    if (!Array.isArray(records) || !records.length || records.length>150) fail('El envío debe contener entre 1 y 150 paquetes.');
    const refs=new Set();
    records.forEach((row,i)=>{
      if (!Array.isArray(row) || row.length!==186) fail(`Registro ${i+1}: se esperaban 186 campos.`);
      for (let k=0;k<186;k++) if (typeof row[k]!=='string' || CTRL.test(row[k])) fail(`Registro ${i+1}, campo ${k+1}: texto no válido.`);
      if (row[0]!==position(i,records.length)) fail(`Registro ${i+1}: posición C/R/F/U incorrecta.`);
      if (row[185]!=='E') fail(`Registro ${i+1}: falta el fin de registro E.`);
      if (row[1]!=='2018v002') fail(`Registro ${i+1}: estructura no soportada.`);
      for (const k of ['nombre','apellido1','apellido2','empresa','tipoVia','via','numero','cp','localidad','provincia','referencia']) {
        if (!row[F[k]-1].trim()) fail(`Registro ${i+1}: falta ${k}.`);
      }
      for (const [key,[label,max]] of Object.entries(CENTER_FIELDS)) {
        if (F[key]) text(row[F[key]-1],`Registro ${i+1}, ${label}`,max);
      }
      text(row[22],`Registro ${i+1}, centro`,150,true);
      text(row[45],`Registro ${i+1}, referencia`,100,true);
      if (!/^\d{5}$/.test(row[35])) fail(`Registro ${i+1}: código postal no válido.`);
      if (emailForExport(row[42])!==row[42]) fail(`Registro ${i+1}: el email de Correos no puede contener caracteres no ASCII.`);
      if (row[13]!=='01' || row[14]!=='01') fail(`Registro ${i+1}: cada bulto debe ser una expedición independiente.`);
      if (refs.has(row[45])) fail('Las referencias de envío se repiten.');
      refs.add(row[45]);
      validateConfig({...DEFAULTS,estructura:row[1],producto:row[2],etiquetador:row[4],pais:row[37],modalidad:row[48],peso:row[49],largo:row[50],alto:row[51],ancho:row[52]});
    });
    return true;
  }
  function validateTXT(txt) {
    if (typeof txt!=='string' || !txt.endsWith('\r\n')) fail('El TXT debe terminar en CRLF.');
    const lines=txt.slice(0,-2).split('\r\n');
    for (const [i,line] of lines.entries()) {
      if ((line.match(/\t/g)||[]).length!==185) fail(`Línea ${i+1}: debe tener 185 tabuladores.`);
      if (!line.endsWith('\tE')) fail(`Línea ${i+1}: debe terminar en el campo E.`);
    }
    validateRecords(lines.map(line=>line.split('\t')));
    return true;
  }
  function generate({centros,destinos,config={...DEFAULTS},fecha=dateKey(),inicio=1}) {
    validateConfig(config); checkDate(fecha);
    const list=validateCenters(centros), lookup=new Map(list.map(c=>[c.codigo,c]));
    if (!Number.isSafeInteger(inicio) || inicio<1 || inicio>999999) fail('Número inicial: entero entre 1 y 999999.');
    if (!Array.isArray(destinos) || !destinos.length) fail('Selecciona al menos un destino con uno o más bultos.');
    const parcels=[], used=new Set();
    for (const d of destinos) {
      const c=lookup.get(d.codigo);
      if (!c) fail('Selecciona un centro existente.');
      if (used.has(d.codigo)) fail(`Destino duplicado: ${c.nombreCentro}.`);
      used.add(d.codigo);
      if (!Number.isInteger(d.bultos) || d.bultos<1 || d.bultos>150) fail(`${c.nombreCentro}: introduce de 1 a 150 bultos enteros.`);
      const errors=centerErrors(c);
      if (errors.length) fail(`${c.nombreCentro}: ${errors.join(' ')}`);
      if (parcels.length+d.bultos>150) fail('Máximo 150 paquetes por archivo, según la pantalla de importación.');
      for (let i=0;i<d.bultos;i++) parcels.push(c);
    }
    if (inicio+parcels.length-1>999999) fail('Se ha superado el límite del contador de referencias.');
    const records=parcels.map((c,i)=>{
      const row=Array(186).fill('');
      const set=(key,value)=>{row[F[key]-1]=value;};
      set('posicion',position(i,parcels.length));
      for (const key of ['estructura','producto','etiquetador','pais','modalidad','peso','largo','alto','ancho']) set(key,config[key]);
      for (const key of ['nombre','apellido1','apellido2']) set(key,normalizeName(c[key],config.normalizarEnie));
      for (const key of ['tipoVia','via','complemento','numero','localidad','provincia','cp','telefono']) set(key,c[key]);
      set('email',emailForExport(c.email));
      set('empresa',c.nombreCentro); set('totalBultos','01'); set('numeroBulto','01');
      set('referencia',`${config.prefijo}-${fecha}-${String(inicio+i).padStart(3,'0')}`);
      set('fin','E');
      return row;
    });
    validateRecords(records);
    const txt=records.map(r=>r.join('\t')).join('\r\n')+'\r\n';
    validateTXT(txt);
    const bytes=encode(txt,config.codificacion);
    return {records,txt,bytes,siguiente:inicio+records.length,referencias:records.map(r=>r[45])};
  }
  function validateCounters(counters) {
    if (!counters || typeof counters!=='object' || Array.isArray(counters)) fail('Contadores no válidos.');
    const result={};
    for (const [key,value] of Object.entries(counters)) {
      if (!/^[A-Z0-9-]{1,20}:\d{8}$/.test(key) || !Number.isInteger(value) || value<1 || value>1000000) fail('Contador de referencias no válido.');
      checkDate(key.slice(-8)); result[key]=value;
    }
    return result;
  }
  function mergeCounters(a,b) {
    const result=validateCounters(a);
    for (const [k,v] of Object.entries(validateCounters(b))) result[k]=Math.max(result[k]||1,v);
    return result;
  }
  return {VERSION,DEFAULTS,F,CENTER_FIELDS,centerErrors,validateCenters,validateConfig,dateKey,
    normalizeName,encode,validateRecords,validateTXT,generate,validateCounters,mergeCounters};
});
