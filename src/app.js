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
    const counters=C.validateCounters(data.counters), draft={};
    if (data.draft && typeof data.draft==='object') for(const c of centros) {
      const n=data.draft[c.codigo]; if(Number.isInteger(n) && n>=0 && n<=150) draft[c.codigo]=C.centerErrors(c).length?0:n;
    }
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
  function persist() {
    try {
      if(storageDamaged) throw Error('Copia del navegador no válida.');
      const saved=localStorage.getItem(KEY);
      if(saved) {
        try { state.counters=C.mergeCounters(state.counters,parseState(saved).counters); }
        catch(e) { storageDamaged=true; throw e; }
      }
      localStorage.setItem(KEY,JSON.stringify(state)); storageOK=true;
    }
    catch(e) { storageOK=false; }
    $('storage-status').hidden=storageOK;
    $('storage-status').textContent=storageOK?'':'No se han podido guardar los cambios. Descarga una copia completa antes de cerrar.';
    return storageOK;
  }
  const counterKey=()=>state.config.prefijo+':'+C.dateKey();
  function minimumStart() { return state.counters[counterKey()]||1; }
  function refreshCounter() {
    $('start').min=minimumStart(); $('start').value=minimumStart(); updateReference();
  }
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
  function renderRows() {
    const q=$('search').value.toLocaleLowerCase('es');
    const centers=state.centros.filter(c=>(c.nombreCentro+' '+c.localidad).toLocaleLowerCase('es').includes(q));
    $('destinations').innerHTML=centers.map(c=>{
      const errors=C.centerErrors(c), blocked=errors.length>0;
      return `<tr data-center="${escape(c.codigo)}" class="${quantity(c)>0?'selected':''}"><td><span class="destination-title">${escape(c.nombreCentro)}</span><span class="destination-meta">${escape(c.via)} ${escape(c.numero)} · ${escape(c.cp)} ${escape(c.localidad)}</span>${blocked?`<span class="destination-warning">${escape(errors[0])} Revisa este centro en la agenda.</span>`:''}</td><td><input class="qty" type="number" min="0" max="150" step="1" value="${escape(quantity(c))}" aria-label="Bultos para ${escape(c.nombreCentro)}" ${blocked?'disabled':''}></td><td><button class="remove" aria-label="Quitar ${escape(c.nombreCentro)} del envío" ${blocked?'disabled':''}>×</button></td></tr>`;
    }).join('')||'<tr><td colspan="3">No hay centros que coincidan con la búsqueda.</td></tr>';
    const available=state.centros.filter(c=>C.centerErrors(c).length===0).length;
    $('available').textContent=`${available} centros disponibles · ${state.centros.length-available} pendientes o inactivos · Máximo 150 paquetes por archivo`;
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
    $('generate').disabled=!total||invalid||total>150||busy;
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
    if(storageOK) {
      const raw=localStorage.getItem(KEY);
      if(raw) {
        const saved=parseState(raw);
        if(JSON.stringify(saved.centros)!==JSON.stringify(state.centros)||JSON.stringify(saved.config)!==JSON.stringify(state.config)) throw Error('Los datos han cambiado en otra pestaña. Recarga la aplicación antes de generar.');
        state.counters=C.mergeCounters(state.counters,saved.counters);
      }
    }
    if(!Number.isInteger(start)||start<minimumStart()) throw Error(`Usa un número de referencia igual o superior a ${minimumStart()}.`);
    const destinos=state.centros.filter(c=>quantity(c)!==0).map(c=>({codigo:c.codigo,bultos:quantity(c)}));
    const result=C.generate({centros:state.centros,destinos,config:state.config,inicio:start});
    state.counters[counterKey()]=result.siguiente;
    const saved=persist();
    lastFile={bytes:result.bytes,name:`VALIJAS_CORREOS_${stamp()}.txt`};
    download(lastFile.bytes,lastFile.name,'text/plain');
    $('redownload').hidden=false; refreshCounter();
    message(`TXT preparado: ${result.records.length} paquetes. Descarga iniciada.\nReferencias: ${result.referencias[0]} a ${result.referencias.at(-1)}.\nArchivo listo para importar en Correos.${saved?'':'\nNo se pudo guardar el contador: exporta ahora una copia completa antes de cerrar.'}`);
    $('message').scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  $('generate').addEventListener('click',async()=>{
    if(busy)return; busy=true; renderSummary();
    try { if(navigator.locks?.request) await navigator.locks.request(KEY,generateNow); else generateNow(); }
    catch(e) {message(e.message,true);}
    finally {busy=false; renderSummary();}
  });
  $('redownload').onclick=()=>{if(lastFile)download(lastFile.bytes,lastFile.name,'text/plain');};
  $('destinations').addEventListener('input',event=>{
    const input=event.target;if(!input.matches('.qty'))return;
    const id=input.closest('tr').dataset.center;
    const n=input.value===''?0:Number(input.value);
    state.draft[id]=n;
    const valid=Number.isInteger(n)&&n>=0&&n<=150;
    input.setAttribute('aria-invalid',String(!valid));
    input.closest('tr').classList.toggle('selected',valid&&n>0);
    persist();renderSummary();
  });
  $('destinations').addEventListener('click',event=>{
    const button=event.target.closest('.remove');if(!button)return;
    state.draft[button.closest('tr').dataset.center]=0;persist();renderRows();
  });
  $('one-each').onclick=()=>{state.draft=Object.fromEntries(state.centros.map(c=>[c.codigo,C.centerErrors(c).length?0:1]));persist();renderRows();};
  $('new').onclick=()=>{
    if(Object.values(state.draft).some(n=>n!==0)&&!confirm('¿Vaciar las cantidades para preparar un nuevo envío? Los contadores se conservan.'))return;
    state.draft={};persist();renderRows();refreshCounter();message('Nuevo envío preparado.');
  };
  $('search').oninput=renderRows; $('start').oninput=updateReference;
  document.querySelectorAll('nav button').forEach(el=>el.onclick=()=>showPage(el.dataset.page));
  $('change-settings').onclick=()=>showPage('ajustes');
  function fillSettings() {
    const form=$('settings'); for(const [k,v] of Object.entries(state.config)) {const el=form.elements.namedItem(k);if(el){if(el.type==='checkbox')el.checked=v;else el.value=v;}}
  }
  $('settings').onsubmit=event=>{
    event.preventDefault();
    try {
      const data=Object.fromEntries(new FormData(event.target));data.normalizarEnie=event.target.elements.normalizarEnie.checked;
      C.validateConfig(data);state.config=data;persist();refreshCounter();renderSummary();message('Configuración guardada. Se aplicará al próximo TXT.');
    }catch(e){message(e.message,true);}
  };
  function renderCenters() {
    $('center-cards').innerHTML=state.centros.map(c=>{
      const errors=C.centerErrors(c);
      return `<article class="card center-card"><span class="badge ${errors.length?'pending':''}">${errors.length?'Pendiente de revisión':'Disponible'}</span><h2>${escape(c.nombreCentro)}</h2><p>${escape([c.nombre,c.apellido1,c.apellido2].filter(Boolean).join(' '))}<br>${escape(c.tipoVia+' '+c.via+' '+c.numero)}<br>${escape(c.cp+' '+c.localidad)}</p>${errors.length?`<p class="destination-warning">${errors.map(escape).join('<br>')}</p>`:''}<button class="secondary" data-edit="${escape(c.codigo)}">Editar centro</button></article>`;
    }).join('');
  }
  function editCenter(id) {
    editing=id;const c=state.centros.find(c=>c.codigo===id)||{codigo:'',nombreCentro:'',activo:true,validado:false};
    $('dialog-title').textContent=id?'Editar centro':'Añadir centro';
    $('center-fields').innerHTML=Object.entries(C.CENTER_FIELDS).map(([k,[label,max]])=>`<label>${escape(label)}${['codigo','nombreCentro'].includes(k)?' *':''}<input name="${k}" maxlength="${max}" value="${escape(c[k]||'')}" ${['codigo','nombreCentro'].includes(k)?'required':''} ${k==='codigo'&&id?'readonly':''} ${k==='cp'?'inputmode="numeric"':''}></label>`).join('');
    $('center-form').elements.activo.checked=c.activo;$('center-form').elements.validado.checked=c.validado;
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
  $('center-cards').onclick=e=>{const b=e.target.closest('[data-edit]');if(b)editCenter(b.dataset.edit);};
  $('add-center').onclick=()=>editCenter(null);
  $('close-dialog').onclick=$('cancel-center').onclick=()=>$('center-dialog').close();
  $('center-form').onsubmit=e=>{
    e.preventDefault();
    try {
      const c=Object.fromEntries(new FormData(e.target));
      for(const k of Object.keys(C.CENTER_FIELDS))c[k]=c[k].trim();
      c.activo=e.target.elements.activo.checked;c.validado=e.target.elements.validado.checked;
      const errors=C.centerErrors(c,false);if(errors.length)throw Error(errors.join('\n'));
      if(c.validado){const errors=C.centerErrors({...c,activo:true});if(errors.length)throw Error('No se puede marcar como validado:\n'+errors.join('\n'));}
      const list=editing?state.centros.map(old=>old.codigo===editing?c:old):[...state.centros,c];
      state.centros=C.validateCenters(list);if(C.centerErrors(c).length)state.draft[c.codigo]=0;
      persist();renderCenters();renderRows();$('center-dialog').close();message('Centro guardado.');
    }catch(err){$('center-error').textContent=err.message;}
  };
  function selectFile(action){fileAction=action;$('file-input').value='';$('file-input').click();}
  $('import-centers').onclick=()=>selectFile('centers');$('import-backup').onclick=()=>selectFile('backup');
  $('export-centers').onclick=()=>jsonDownload(state.centros,'centros.json');
  $('export-backup').onclick=()=>jsonDownload({...state,exportedAt:new Date().toISOString()},`VALIJAS_COPIA_${stamp()}.json`);
  $('file-input').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try {
      if(file.size>2000000)throw Error('El archivo supera 2 MB.');
      const raw=await file.text();
      if(fileAction==='centers') {
        const list=C.validateCenters(JSON.parse(raw));
        if(!confirm(`¿Sustituir la agenda por los ${list.length} centros de este archivo? Se vaciarán las cantidades. Los contadores se conservan.`))return;
        state.centros=list;state.draft={};
      } else {
        const restored=parseState(raw);
        if(!confirm('¿Restaurar centros, configuración y cantidades desde esta copia? Los contadores nunca se reducirán.'))return;
        restored.counters=C.mergeCounters(state.counters,restored.counters);state=restored;
        if(storageDamaged) {
          localStorage.setItem(KEY,JSON.stringify(state));
          storageDamaged=false;
        }
      }
      persist();renderRows();renderCenters();fillSettings();refreshCounter();message('Centros y datos importados.');
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
