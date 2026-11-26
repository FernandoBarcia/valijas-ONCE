/* UI and local repository. Generator has no DOM or storage dependencies. */
(function () {
  'use strict';
  const C=window.Correos, $=id=>document.getElementById(id), KEY='valijas-once-v1';
  const original=C.validateCenters(JSON.parse($('initial-centers').textContent));
  let state={schema:1,centros:original,config:{...C.DEFAULTS},counters:{},draft:{}};
  let storageOK=true, storageDamaged=false, lastFile=null, editing=null, fileAction=null, busy=false, messageSource=null;
  const escape=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function message(s,error=false,source=null) { $('message').hidden=false; $('message').textContent=s; $('message').className=error?'error':''; messageSource=source; }
  // Quita un aviso solo si sigue en pantalla y lo puso ese mismo problema.
  function clearMessage(source) { if(messageSource!==source) return; $('message').hidden=true; $('message').textContent=''; $('message').className=''; messageSource=null; }
  function parseState(raw) {
    const data=JSON.parse(raw);
    if (data.schema!==1) throw Error('Versión de copia no soportada.');
    const centros=C.validateCenters(data.centros), config={...data.config}; C.validateConfig(config);
    const counters=C.validateCounters(data.counters), draft=C.cleanDraft(centros,data.draft);
    return {schema:1,centros,config,counters,draft};
  }
  try {
    const saved=localStorage.getItem(KEY);
    if(saved) {
      try { state=parseState(saved); }
      catch(e) {storageDamaged=true; throw e;}
    }
    localStorage.setItem(KEY,JSON.stringify(state));
  } catch(e) { storageOK=false; message('No se ha podido recuperar o guardar la copia del navegador. Se han cargado los centros originales. Importa tu copia completa y comprueba el siguiente número de referencia. '+e.message,true); }
  function persist(nextState=state) {
    try {
      if(storageDamaged) throw Error('Copia del navegador no válida.');
      const saved=localStorage.getItem(KEY);
      if(saved) {
        try { nextState.counters=C.mergeCounters(nextState.counters,parseState(saved).counters); }
        catch(e) { storageDamaged=true; throw e; }
      }
      localStorage.setItem(KEY,JSON.stringify(nextState)); storageOK=true;
    }
    catch(e) { storageOK=false; }
    $('storage-status').hidden=storageOK;
    $('storage-status').textContent=storageOK?'':'No se han podido guardar los cambios. Descarga una copia completa antes de cerrar.';
    return storageOK;
  }
  function reportSave(saved,success) {
    if(saved) message(success);
    else message('Los cambios solo están en esta pestaña. Guarda una copia completa antes de cerrar.',true);
  }
  const counterKey=()=>state.config.prefijo+':'+C.dateKey();
  function minimumStart() { return state.counters[counterKey()]||1; }
  function refreshCounter() {
    $('start').min=minimumStart(); $('start').value=minimumStart(); checkStart();
  }
  function startValid() {
    const n=C.quantityFrom($('start').value,$('start').validity.badInput);
    return Number.isInteger(n) && n>=minimumStart() && n<=999999;
  }
  function checkStart() {
    const valid=startValid();
    $('start').setAttribute('aria-invalid',String(!valid));
    if(valid) clearMessage('start'); else message(`El siguiente número de referencia debe ser un entero entre ${minimumStart()} y 999999.`,true,'start');
    updateReference(); renderSummary();
  }
  // Tras cambiar algo, el error del último intento de generar ya no vale.
  const edited=()=>clearMessage('generate');
  function updateReference() {
    $('reference-example').textContent=`${state.config.prefijo}-${C.dateKey()}-${String($('start').value||1).padStart(3,'0')}`;
  }
  function showPage(id) {
    document.querySelectorAll('.page').forEach(el=>el.hidden=el.id!==id);
    document.querySelectorAll('nav button').forEach(el=>{el.classList.toggle('active',el.dataset.page===id);if(el.dataset.page===id)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    if(id==='ajustes') fillSettings();
    if(id==='centros') renderCenters();
    document.title='Valijas ONCE · '+({remesa:'Envío de valijas',centros:'Centros',ajustes:'Configuración',ayuda:'Ayuda'}[id]);
  }
  // Un centro bloqueado no se puede editar en la tabla: nunca cuenta ni se envía.
  const quantity=c=>C.centerErrors(c).length?0:(state.draft[c.codigo]??0);
  const shortName=c=>c.localidad==='A CORUÑA'?'A Coruña':c.localidad.toLocaleLowerCase('es').replace(/(^|\s)\S/g,x=>x.toLocaleUpperCase('es'));
  // Pantalla inicial: solo favoritos (y los que ya llevan bultos). Sin favoritos, todos.
  // Al buscar se busca en toda la agenda.
  const favoritos=()=>state.centros.filter(c=>c.favorito).length;
  const matches=(c,q,fields)=>fields.map(k=>c[k]||'').join(' ').toLocaleLowerCase('es').includes(q);
  function visibleRows() {
    const q=$('search').value.trim().toLocaleLowerCase('es');
    if(q) return state.centros.filter(c=>matches(c,q,['nombreCentro','localidad','provincia']));
    return favoritos()?state.centros.filter(c=>c.favorito||quantity(c)!==0):state.centros;
  }
  function renderRows() {
    const q=$('search').value.trim(), centers=visibleRows();
    $('destinations').innerHTML=centers.map(c=>{
      const errors=C.centerErrors(c), blocked=errors.length>0;
      return `<tr data-center="${escape(c.codigo)}" class="${quantity(c)>0?'selected':''}"><td><span class="destination-title">${escape(c.nombreCentro)}</span><span class="destination-meta">${escape(c.via)} ${escape(c.numero)} · ${escape(c.cp)} ${escape(c.localidad)}</span>${blocked?`<span class="destination-warning">${escape(errors[0])} Revisa este centro en la agenda.</span>`:''}</td><td><input class="qty" type="number" min="0" max="150" step="1" value="${escape(quantity(c))}" aria-label="Bultos para ${escape(c.nombreCentro)}" ${blocked?'disabled':''}></td><td><button class="remove" aria-label="Quitar ${escape(c.nombreCentro)} del envío" ${blocked?'disabled':''}>×</button></td></tr>`;
    }).join('')||'<tr><td colspan="3">No hay centros que coincidan con la búsqueda.</td></tr>';
    const available=state.centros.filter(c=>C.centerErrors(c).length===0).length;
    const scope=q?`${centers.length} resultados en toda la agenda`:favoritos()?`Mostrando favoritos (${centers.length} de ${state.centros.length} centros) · Busca para ver el resto`:'Mostrando todos los centros · Marca favoritos en Centros para ver aquí solo esos';
    $('available').textContent=`${scope} · ${available} disponibles · Máximo 150 paquetes por archivo`;
    $('center-count').textContent=state.centros.length;
    renderSummary();
  }
  function renderSummary() {
    let total=0,invalid=false; const selected=[];
    for(const c of state.centros) {
      const n=quantity(c);
      if(!Number.isInteger(n)||n<0||n>150) invalid=true;
      else if(n>0) { total+=n; selected.push([c,n]); }
    }
    $('total').textContent=total;
    $('dest-total').textContent=selected.length?`${selected.length} ${selected.length===1?'destino seleccionado':'destinos seleccionados'}`:'Ningún destino seleccionado';
    $('summary-list').innerHTML=selected.map(([c,n])=>`<li><span>${escape(shortName(c))}</span><b>${n}</b></li>`).join('');
    $('service').textContent=state.config.producto==='S0235'?'Paq Premium':'Paq Estándar';
    $('dimensions').textContent=`${state.config.peso} g · ${state.config.largo} × ${state.config.alto} × ${state.config.ancho} cm`;
    $('generate').disabled=$('review').disabled=!total||invalid||total>150||busy||!startValid();
    if(invalid) message('Los bultos deben ser un número entero entre 0 y 150.',true,'quantity'); else clearMessage('quantity');
    if(total>150) message('El envío supera los 150 paquetes. Reduce las cantidades o prepara varios archivos.',true,'limit'); else clearMessage('limit');
  }
  function download(bytes,name,type) {
    const blob=new Blob([bytes],{type}), url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=name; document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  const jsonDownload=(data,name)=>download(JSON.stringify(data,null,2)+'\n',name,'application/json;charset=utf-8');
  function stamp() {
    return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()).replace(/[-:]/g,'').replace(' ','_');
  }
  function generateNow() {
    if(storageDamaged) throw Error('La copia del navegador no es válida. Restaura una copia completa desde Configuración antes de generar para no repetir referencias.');
    const start=Number($('start').value);
    // Re-read persistent high-water marks immediately before reserving references.
    const raw=localStorage.getItem(KEY);
    if(raw) {
      const saved=parseState(raw);
      if(JSON.stringify(saved.centros)!==JSON.stringify(state.centros)||JSON.stringify(saved.config)!==JSON.stringify(state.config)) throw Error('Los datos han cambiado en otra pestaña. Recarga la aplicación antes de generar.');
      state.counters=C.mergeCounters(state.counters,saved.counters);
    }
    if(!Number.isInteger(start)||start<minimumStart()) throw Error(`Usa un número de referencia igual o superior a ${minimumStart()}.`);
    const destinos=state.centros.filter(c=>quantity(c)!==0).map(c=>({codigo:c.codigo,bultos:quantity(c)}));
    const result=C.generate({centros:state.centros,destinos,config:state.config,inicio:start});
    const nextState={...state,counters:{...state.counters,[counterKey()]:result.siguiente}};
    if(!persist(nextState)) throw Error('No se pudo guardar la reserva de referencias. Comprueba el almacenamiento del navegador antes de volver a generar.');
    state=nextState;
    lastFile={bytes:result.bytes,name:`VALIJAS_CORREOS_${stamp()}.txt`};
    download(lastFile.bytes,lastFile.name,'text/plain');
    $('redownload').hidden=false; refreshCounter();
    message(`TXT preparado: ${result.records.length} paquetes. Descarga iniciada.\nReferencias: ${result.referencias[0]} a ${result.referencias.at(-1)}.\nArchivo listo para importar en Correos.`);
    $('message').scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  async function runGenerate() {
    if(busy)return; busy=true; renderSummary();
    try { if(navigator.locks?.request) await navigator.locks.request(KEY,generateNow); else generateNow(); }
    catch(e) {message(e.message,true,'generate');}
    finally {busy=false; renderSummary();}
  }
  $('generate').addEventListener('click',runGenerate);
  // Revisar: el mismo cálculo que Generar, sin guardar contadores ni descargar nada.
  $('review').onclick=()=>{
    try {
      const destinos=state.centros.filter(c=>quantity(c)!==0).map(c=>({codigo:c.codigo,bultos:quantity(c)}));
      const result=C.generate({centros:state.centros,destinos,config:state.config,inicio:Number($('start').value)});
      const groups=C.reviewGroups(result.records), tail=ref=>ref.slice(ref.lastIndexOf('-')+1);
      const encoding={'windows-1252':'Windows-1252','utf-8':'UTF-8','utf-8-bom':'UTF-8 con BOM'}[state.config.codificacion];
      $('review-summary').textContent=`${result.records.length} ${result.records.length===1?'paquete':'paquetes'} para ${groups.length} ${groups.length===1?'destino':'destinos'} · ${state.config.producto==='S0235'?'Paq Premium':'Paq Estándar'} · ${state.config.peso} g · ${state.config.largo} × ${state.config.alto} × ${state.config.ancho} cm · Referencias ${result.referencias[0]} a ${result.referencias.at(-1)} · ${encoding}`;
      $('review-rows').innerHTML=groups.map(g=>`<tr><td><span class="destination-title">${escape(g.centro)}</span><span class="destination-meta">${escape(g.destinatario)}</span><span class="destination-meta">${escape(g.direccion)} · ${escape(g.cp)} ${escape(g.localidad)} (${escape(g.provincia)})</span>${g.documentos?'<span class="destination-meta">Aduana: se declara como Documentos</span>':''}</td><td>${g.bultos}</td><td title="${escape(g.desde)}${g.bultos>1?' a '+escape(g.hasta):''}">${escape(tail(g.desde))}${g.bultos>1?` a ${escape(tail(g.hasta))}`:''}</td></tr>`).join('');
      edited(); $('review-dialog').showModal();
    } catch(e) { message(e.message,true,'generate'); }
  };
  $('review-generate').onclick=()=>{ $('review-dialog').close(); runGenerate(); };
  $('close-review').onclick=$('review-back').onclick=()=>$('review-dialog').close();
  $('redownload').onclick=()=>{if(lastFile)download(lastFile.bytes,lastFile.name,'text/plain');};
  $('destinations').addEventListener('input',event=>{
    const input=event.target;if(!input.matches('.qty'))return;
    const id=input.closest('tr').dataset.center;
    const n=C.quantityFrom(input.value,input.validity.badInput);
    state.draft[id]=n; edited();
    const valid=Number.isInteger(n)&&n>=0&&n<=150;
    input.setAttribute('aria-invalid',String(!valid));
    input.closest('tr').classList.toggle('selected',valid&&n>0);
    persist();renderSummary();
  });
  $('destinations').addEventListener('click',event=>{
    const button=event.target.closest('.remove');if(!button)return;
    state.draft[button.closest('tr').dataset.center]=0;edited();persist();renderRows();
  });
  // Pone 1 bulto a cada centro de la lista visible; los demás quedan como estaban.
  $('one-each').onclick=()=>{for(const c of visibleRows())state.draft[c.codigo]=C.centerErrors(c).length?0:1;edited();persist();renderRows();};
  $('new').onclick=()=>{
    if(Object.values(state.draft).some(n=>n!==0)&&!confirm('¿Vaciar las cantidades para preparar un nuevo envío? Los contadores se conservan.'))return;
    state.draft={};persist();renderRows();refreshCounter();message('Nuevo envío preparado.');
  };
  $('search').oninput=renderRows; $('start').oninput=()=>{edited();checkStart();};
  document.querySelectorAll('nav button').forEach(el=>el.onclick=()=>showPage(el.dataset.page));
  $('change-settings').onclick=()=>showPage('ajustes');
  function fillSettings() {
    const form=$('settings'); for(const [k,v] of Object.entries(state.config)) {const el=form.elements.namedItem(k);if(el){if(el.type==='checkbox')el.checked=v;else el.value=v;}}
  }
  $('settings').onsubmit=event=>{
    event.preventDefault();
    try {
      const data=Object.fromEntries(new FormData(event.target));data.normalizarEnie=event.target.elements.normalizarEnie.checked;
      C.validateConfig(data);state.config=data;const saved=persist();refreshCounter();renderSummary();reportSave(saved,'Configuración guardada. Se aplicará al próximo TXT.');
    }catch(e){message(e.message,true,'settings');}
  };
  function renderCenters() {
    const q=$('center-search').value.trim().toLocaleLowerCase('es');
    const list=state.centros.filter(c=>!q||matches(c,q,['nombreCentro','localidad','provincia','cp','via','nombre','apellido1','apellido2','codigo']));
    $('center-results').textContent=q?`${list.length} de ${state.centros.length} centros`:`${state.centros.length} centros · ${favoritos()} favoritos en la pantalla inicial`;
    $('center-cards').innerHTML=list.map(c=>{
      const errors=C.centerErrors(c);
      return `<article class="card center-card"><div class="card-top"><span class="badge ${errors.length?'pending':''}">${errors.length?'Pendiente de revisión':'Disponible'}</span><button class="fav ${c.favorito?'on':''}" data-fav="${escape(c.codigo)}" aria-pressed="${c.favorito}" title="Mostrar en la pantalla inicial">${c.favorito?'★ Favorito':'☆ Favorito'}</button></div><h2>${escape(c.nombreCentro)}</h2><p>${escape([c.nombre,c.apellido1,c.apellido2].filter(Boolean).join(' '))}<br>${escape(c.tipoVia+' '+c.via+' '+c.numero)}<br>${escape(c.cp+' '+c.localidad)}</p>${errors.length?`<p class="destination-warning">${errors.map(escape).join('<br>')}</p>`:''}<button class="secondary" data-edit="${escape(c.codigo)}">Editar centro</button></article>`;
    }).join('')||'<p>No hay centros que coincidan con la búsqueda.</p>';
  }
  $('center-search').oninput=renderCenters;
  function editCenter(id) {
    editing=id;const c=state.centros.find(c=>c.codigo===id)||{codigo:C.nextCode(state.centros),nombreCentro:'',tipoVia:'C',activo:true,validado:false,favorito:true};
    // Tipo de vía: solo los códigos de Correos. Un valor antiguo no admitido obliga a elegir uno.
    const tipoValido=Object.hasOwn(C.TIPOS_VIA,c.tipoVia||'');
    const tipoVia=`<label>Tipo de vía<select name="tipoVia">${tipoValido?'':`<option value="" selected>${c.tipoVia?escape(c.tipoVia)+' · no admitido, elige otro':'Elige un tipo'}</option>`}${Object.entries(C.TIPOS_VIA).map(([k,v])=>`<option value="${k}" ${k===c.tipoVia?'selected':''}>${escape(v)} (${k})</option>`).join('')}</select></label>`;
    $('dialog-title').textContent=id?'Editar centro':'Añadir centro';
    $('delete-center').hidden=!id;
    // El código interno es automático: se muestra, pero no se escribe.
    $('center-fields').innerHTML=Object.entries(C.CENTER_FIELDS).map(([k,[label,max]])=>k==='tipoVia'?tipoVia:k==='codigo'
      ?`<label>${escape(label)}<input name="codigo" value="${escape(c.codigo)}" readonly aria-describedby="codigo-help"><small id="codigo-help">Se asigna automáticamente.</small></label>`
      :`<label>${escape(label)}${k==='nombreCentro'?' *':''}<input name="${k}" maxlength="${max}" value="${escape(c[k]||'')}" ${k==='nombreCentro'?'required':''} ${k==='cp'?'inputmode="numeric"':''}></label>`).join('');
    $('center-form').elements.activo.checked=c.activo;$('center-form').elements.validado.checked=c.validado;$('center-form').elements.favorito.checked=c.favorito===true;
    const emailInput=$('center-form').elements.email;
    emailInput.type='email';emailInput.autocapitalize='none';emailInput.spellcheck=false;
    emailInput.setAttribute('autocorrect','off');
    emailInput.setAttribute('aria-describedby','email-help');
    const emailHelp=document.createElement('small');emailHelp.id='email-help';emailHelp.textContent='Sin tildes ni ñ. Ejemplo: destinatario@example.com';emailInput.parentElement.appendChild(emailHelp);
    emailInput.oninput=()=>{
      const invalid=/[^\x00-\x7f]/.test(emailInput.value);
      emailInput.setCustomValidity(invalid?'El email no puede contener tildes, ñ ni otros caracteres no ASCII.':'');
      emailInput.setAttribute('aria-invalid',String(invalid));
      $('center-error').textContent=invalid?'El email no puede contener tildes, ñ ni otros caracteres no ASCII. Corrige la dirección para guardarla.':'';
    };
    $('center-error').textContent='';$('center-dialog').showModal();
  }
  $('center-cards').onclick=e=>{
    const fav=e.target.closest('[data-fav]');
    if(fav){state.centros=state.centros.map(c=>c.codigo===fav.dataset.fav?{...c,favorito:!c.favorito}:c);persist();renderCenters();renderRows();return;}
    const b=e.target.closest('[data-edit]');if(b)editCenter(b.dataset.edit);
  };
  $('add-center').onclick=()=>editCenter(null);
  $('close-dialog').onclick=$('cancel-center').onclick=()=>$('center-dialog').close();
  // Eliminar: quita el centro de la agenda y del envío en curso. Los contadores de referencias no cambian.
  $('delete-center').onclick=()=>{
    const c=state.centros.find(c=>c.codigo===editing);if(!c)return;
    if(state.centros.length===1){$('center-error').textContent='La agenda debe tener al menos un centro. Añade otro antes de eliminar este.';return;}
    if(!confirm(`¿Eliminar ${c.nombreCentro} de la agenda? Esta acción no se puede deshacer, salvo restaurando una copia completa.`))return;
    state.centros=state.centros.filter(x=>x.codigo!==editing);delete state.draft[editing];edited();
    const saved=persist();renderCenters();renderRows();$('center-dialog').close();reportSave(saved,`Centro eliminado: ${c.nombreCentro}.`);
  };
  $('center-form').onsubmit=e=>{
    e.preventDefault();
    try {
      const c=Object.fromEntries(new FormData(e.target));
      for(const k of Object.keys(C.CENTER_FIELDS))c[k]=c[k].trim();
      c.activo=e.target.elements.activo.checked;c.validado=e.target.elements.validado.checked;c.favorito=e.target.elements.favorito.checked;
      const errors=C.centerErrors(c,false);if(errors.length)throw Error(errors.join('\n'));
      if(c.validado){const errors=C.centerErrors({...c,activo:true});if(errors.length)throw Error('No se puede marcar como validado:\n'+errors.join('\n'));}
      const list=editing?state.centros.map(old=>old.codigo===editing?c:old):[...state.centros,c];
      state.centros=C.validateCenters(list);if(C.centerErrors(c).length)state.draft[c.codigo]=0;
      const saved=persist();renderCenters();renderRows();$('center-dialog').close();reportSave(saved,'Centro guardado.');
    }catch(err){$('center-error').textContent=err.message;}
  };
  function previewCenterImport(input) {
    const plan=C.planCenterImport(state.centros,input);
    const added=plan.changes.filter(change=>!change.previous).length;
    const updated=plan.changes.length-added;
    const exceedsLimit=plan.merged.length>500;
    const describe=center=>[center.nombreCentro,center.tipoVia+' '+center.via+' '+center.numero,center.cp+' '+center.localidad].join(' · ');
    $('import-summary').textContent=`${added} nuevos · ${updated} para actualizar · ${plan.imported.length-plan.changes.length} sin cambios`+
      (exceedsLimit?' · Combinar las agendas superaría el límite de 500 centros.':'');
    const labels={...Object.fromEntries(Object.entries(C.CENTER_FIELDS).map(([key,[label]])=>[key,label])),
      activo:'Activo',validado:'Validado',favorito:'Favorito'};
    const display=value=>value===true?'Sí':value===false?'No':value||'Vacío';
    $('import-rows').innerHTML=plan.changes.map(({center,previous})=>{
      const fields=previous?Object.keys(labels).filter(key=>center[key]!==previous[key]):[];
      const details=fields.map(key=>`<span class="destination-meta">${escape(labels[key])}: ${escape(display(previous[key]))} → ${escape(display(center[key]))}</span>`).join('');
      return `<tr><td><strong class="destination-title">${escape(center.codigo)}</strong>`+
        `<span class="destination-meta">${escape(describe(center))}</span>${details}</td><td>${previous?'Actualizar':'Añadir'}</td></tr>`;
    }).join('')||'<tr><td colspan="2">El archivo coincide con los centros de la agenda.</td></tr>';
    $('import-merge').disabled=exceedsLimit||!plan.changes.length;
    const apply=(centros,draft)=>{
      const nextState={...state,centros,draft};
      if(!persist(nextState)) {
        $('import-dialog').close();
        message('No se pudo guardar la importación. La agenda sigue disponible. Comprueba el almacenamiento del navegador y vuelve a intentarlo.',true);
        return;
      }
      state=nextState;
      $('import-dialog').close();
      renderRows();renderCenters();refreshCounter();message('Agenda importada.');
    };
    $('import-merge').onclick=()=>{
      const draft={...state.draft};
      for(const {center} of plan.changes) delete draft[center.codigo];
      apply(plan.merged,draft);
    };
    $('import-replace').onclick=()=>{
      const list=C.validateCenters(input);
      if(confirm(`¿Sustituir la agenda por los ${list.length} centros del archivo? Se vaciarán todas las cantidades y se conservarán los contadores.`)) apply(list,{});
    };
    $('import-cancel').onclick=()=>$('import-dialog').close();
    $('import-dialog').showModal();
  }
  function selectFile(action){fileAction=action;$('file-input').value='';$('file-input').click();}
  $('import-centers').onclick=()=>selectFile('centers');$('import-backup').onclick=()=>selectFile('backup');
  $('export-centers').onclick=()=>jsonDownload(state.centros,'centros.json');
  $('export-backup').onclick=$('export-backup-shipment').onclick=()=>jsonDownload({...state,exportedAt:new Date().toISOString()},`VALIJAS_COPIA_${stamp()}.json`);
  $('file-input').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try {
      if(file.size>2000000)throw Error('El archivo supera 2 MB.');
      const raw=await file.text();
      if(fileAction==='centers') {
        previewCenterImport(JSON.parse(raw));
        return;
      }
      const restored=parseState(raw);
      if(!confirm('¿Restaurar centros, configuración y cantidades desde esta copia? Los contadores nunca se reducirán.'))return;
      restored.counters=C.mergeCounters(state.counters,restored.counters);state=restored;
      if(storageDamaged) {
        localStorage.setItem(KEY,JSON.stringify(state));
        storageDamaged=false;
      }
      const saved=persist();renderRows();renderCenters();fillSettings();refreshCounter();reportSave(saved,'Centros y datos importados.');
    }catch(err){message('No se ha importado el archivo: '+err.message,true);}
  };
  window.addEventListener('storage',event=>{
    if(event.key!==KEY)return;
    try {const incoming=parseState(event.newValue);state.counters=C.mergeCounters(state.counters,incoming.counters);refreshCounter();message('Hay otra pestaña abierta. Utiliza solo una para editar y generar; recarga esta pestaña si has cambiado los centros o la configuración.',true);}catch(e){message('El almacenamiento ha cambiado. Recarga y comprueba tu copia completa antes de generar.',true);}
  });
  $('today').textContent=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',weekday:'long',day:'numeric',month:'long'}).format(new Date());
  $('version').textContent='v'+C.VERSION;
  $('header-version').textContent='v'+C.VERSION;
  fillSettings();renderRows();refreshCounter();persist();
})();
