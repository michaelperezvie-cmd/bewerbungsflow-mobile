(()=>{
  'use strict';
  const F=globalThis.BewerbungsFlow,M=globalThis.BFMobile,S=globalThis.BFStore,$=id=>document.getElementById(id);
  let records=[],session=M.create(),activeStep=0,showResult=false,query='',archived=false,saveTimer,toastTimer,saveQueue=Promise.resolve(),saving=0,outputError='',swRegistration,updateRequested=false;
  const show=(id,yes)=>{$(id).hidden=!yes;};
  const date=s=>new Intl.DateTimeFormat('de-AT',{dateStyle:'medium'}).format(new Date(s));
  function toast(text){$('toast').textContent=text;show('toast',true);clearTimeout(toastTimer);toastTimer=setTimeout(()=>show('toast',false),4500);}
  function report(error){$('storage-error').textContent=error.message||String(error);show('storage-error',true);$('save-state').textContent='Noch nicht gesichert';}
  const hasData=s=>!!(s.job.trim()||s.company.trim()||s.notes.trim()||(s.title&&s.title!=='Neue Bewerbung')||s.steps.some(x=>x.output||x.draft)||s.letter);
  function remember(){try{localStorage.setItem('bf-mobile-current',session.id);}catch{}}
  function persist(){
    clearTimeout(saveTimer);if(!hasData(session))return Promise.resolve();
    const snapshot=structuredClone(session);saving++;$('save-state').textContent='Wird auf dem Gerät gespeichert …';
    const pending=saveQueue.then(()=>S.save(snapshot)).then(()=>{const i=records.findIndex(x=>x.id===snapshot.id);if(i<0)records.push(snapshot);else records[i]=snapshot;records.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));if(session.id===snapshot.id){remember();show('storage-error',false);$('save-state').textContent='Auf diesem Gerät gesichert';}renderHistory();});
    saveQueue=pending.catch(()=>{});return pending.catch(e=>{report(e);throw e;}).finally(()=>{saving--;});
  }
  function schedule(){clearTimeout(saveTimer);$('save-state').textContent='Änderungen noch nicht gesichert';saveTimer=setTimeout(()=>persist().catch(()=>{}),400);}
  async function flush(){clearTimeout(saveTimer);await persist();await saveQueue;}
  function setFields(){for(const [id,key] of [['application-title','title'],['company','company'],['job','job'],['notes','notes']])$(id).value=key==='title'&&session.title==='Neue Bewerbung'?'':session[key];}
  function renderHistory(){
    const list=records.filter(s=>archived?!!s.archivedAt:!s.archivedAt).filter(s=>!query||[M.label(s),s.title,s.company,s.job.slice(0,500)].join(' ').toLocaleLowerCase('de').includes(query));
    for(const container of document.querySelectorAll('[data-history-list]')){
      container.replaceChildren();if(!list.length){const p=document.createElement('p');p.className='history-empty';p.textContent=query?'Keine passende Bewerbung gefunden.':archived?'Dein Archiv ist leer.':'Hier erscheinen deine Entwürfe und fertigen Bewerbungen.';container.append(p);continue;}
      for(const s of list){const row=document.createElement('div');row.className='history-row';const b=document.createElement('button');b.className='history-item'+(s.id===session.id?' selected':'');b.dataset.recordId=s.id;const title=document.createElement('strong');title.textContent=M.label(s);const meta=document.createElement('small');const dot=document.createElement('span');dot.className='history-dot'+(M.status(s)==='done'?' done':'');meta.append(dot,document.createTextNode((M.status(s)==='done'?'Fertig':'Entwurf')+' · '+date(s.updatedAt)));b.append(title,meta);const archive=document.createElement('button');archive.className='archive-record';archive.dataset.archiveId=s.id;archive.textContent=s.archivedAt?'↶':'⌑';archive.setAttribute('aria-label',s.archivedAt?'Bewerbung wiederherstellen':'Bewerbung archivieren');row.append(b,archive);container.append(row);}
    }
  }
  function renderStatus(){
    const done=session.importedFinal&&session.letter?3:session.steps.filter((x,i)=>M.valid(session,i)&&M.unlocked(session,i)&&x.draft.trim()===x.output.trim()).length;
    const complete=M.status(session)==='done';const step=session.steps[activeStep];
    $('step-count').textContent=done+'/3';$('progress').setAttribute('aria-valuenow',String(done));$('progress-fill').style.width=(done/3*100)+'%';
    $('status-dot').className='status-dot'+(complete?' done':step.phase==='awaiting'||step.phase==='copied'?' waiting':'');
    $('status-title').textContent=complete?'Dein Anschreiben ist bereit':!session.job?'Bereit für deine nächste Bewerbung':'Schritt '+(activeStep+1)+' von 3 · '+M.names[activeStep];
    $('status-description').textContent=complete?'Du kannst es prüfen, bearbeiten, teilen und speichern.':!session.job?'Füge zuerst eine Stellenanzeige ein.':session.job.trim().length<30?'Bitte die vollständige Stellenanzeige einfügen (mindestens 30 Zeichen).':step.draft!==step.output?'Deine eingefügte Antwort ist als Entwurf gesichert. Bitte noch übernehmen.':step.phase==='awaiting'?'Warte auf deine Antwort aus ChatGPT. Danach hier einfügen.':step.phase==='copied'?'Prompt kopiert. Öffne jetzt das passende Plugin in ChatGPT.':'Kopiere den Prompt und öffne das passende Plugin in ChatGPT.';
    $('job-count').textContent=session.job.length.toLocaleString('de-AT')+' Zeichen';
    const canStart=complete||M.unlocked(session,0),hasAnswers=session.steps.some(x=>x.output);
    $('start-flow').disabled=!canStart;
    $('start-flow').textContent=complete?'Anschreiben ansehen →':hasAnswers?'Bewerbung fortsetzen →':'Bewerbung starten →';
    $('start-hint').textContent=complete?'Dein Anschreiben ist fertig. Öffne es zum Prüfen und Speichern.':!canStart?'Füge eine vollständige Stellenanzeige ein (mindestens 30 Zeichen). Dann kannst du starten.':'Der Start kopiert den Prompt für den nächsten offenen Schritt. Öffne danach ChatGPT und füge ihn dort in einen neuen Chat ein.';
    show('changed-warning',session.steps.some((_,i)=>M.stale(session,i)));
    for(let i=0;i<3;i++){
      const b=$('step-'+i),ok=M.valid(session,i),old=M.stale(session,i);b.disabled=i>0&&!M.unlocked(session,i)&&!session.steps[i].output;
      b.classList.toggle('complete',ok);b.classList.toggle('stale',old);if(activeStep===i&&!showResult)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
      b.querySelector('.step-number').textContent=ok?'✓':'0'+(i+1);
      $('step-status-'+i).textContent=old?'Bitte abgleichen':ok?'Übernommen':M.unlocked(session,i)?'Bereit':'Wartet';
    }
  }
  function renderStep(){
    const i=activeStep,step=session.steps[i],can=M.unlocked(session,i);
    $('step-eyebrow').textContent='SCHRITT '+(i+1)+' VON 3';$('step-heading').textContent=M.names[i];$('plugin-name').textContent=F.STEPS[i].name;
    $('step-description').textContent=['Die fünf wichtigsten Anforderungen der Stelle herausarbeiten.','Die Anforderungen mit deinem im Plugin hinterlegten Lebenslauf abgleichen.','Aus dem CV-Abgleich ein passendes Anschreiben erstellen lassen.'][i];
    $('generated-prompt').value=can?M.prompt(session,i):'Füge zuerst eine vollständige Stellenanzeige ein und übernimm die vorherigen Antworten.';
    $('copy-prompt').disabled=!can;$('open-plugin').href='https://chatgpt.com/plugins/'+F.STEPS[i].id;$('open-plugin').setAttribute('aria-disabled',String(!can));
    $('answer').value=typeof step.draft==='string'?step.draft:step.output;$('save-answer').disabled=!can;show('save-plain',i===2);$('save-plain').disabled=!can;
    $('save-answer').textContent=i===2?'Anschreiben übernehmen ✓':'Antwort übernehmen & weiter →';
    $('answer-error').textContent=outputError;show('answer-error',!!outputError);
  }
  function renderResult(){
    const r=session.result;const ready=M.status(session)==='done';
    show('result-panel',ready);show('step-panel',!ready||!showResult);if(!ready)return;
    $('letter').textContent=session.letter;$('result-company').textContent=session.company||r?.company.company||M.label(session);
    const text=r?r.bodyParagraphs.join(' '):session.letter;const words=text.trim().split(/\s+/).filter(Boolean).length;$('word-count').textContent=words+' Wörter'+(words>320?' · bitte prüfen':'');
    $('questions').textContent=(r?.questions||[]).join('\n');show('questions',!!r?.questions?.length);$('download-json').disabled=!r;$('download-json').title=r?'':'Für diesen reinen Text liegt kein strukturiertes JSON vor. Nutze Text oder Sicherung.';
    show('share-letter',typeof navigator.share==='function');show('structured-edit',!!r);show('plain-edit',!r);
    if(r){$('edit-subject').value=r.subject;$('edit-salutation').value=r.salutation;$('edit-body').value=r.bodyParagraphs.join('\n\n');$('edit-closing').value=r.closing;}else $('edit-plain').value=session.letter;
  }
  function render(){setFields();renderStatus();renderStep();renderResult();renderHistory();}
  function scrollTo(id){try{$(id).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}catch{}}
  async function choose(id){await flush();const found=records.find(x=>x.id===id);if(!found)return;session=structuredClone(found);activeStep=Math.min(session.current,2);showResult=M.status(session)==='done';outputError='';remember();render();$('history-drawer').close();scrollTo('main');}
  async function newApplication(){await flush();session=M.create();activeStep=0;showResult=false;outputError='';render();$('save-state').textContent='Noch kein Entwurf';$('history-drawer').close();scrollTo('job-heading');$('job').focus();}
  async function copy(text,field){
    if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return;}catch{}}
    const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.top='0';t.style.opacity='0';document.body.append(t);t.focus();t.select();let ok=false;try{ok=document.execCommand('copy');}catch{}t.remove();
    if(!ok){if(field){$('prompt-details').open=true;field.focus();field.select();}throw Error('Bitte den Text markieren und über das iPhone-Menü kopieren.');}
  }
  function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  const filename=()=>session.result?.folderSlug||M.label(session).replace(/[^\p{L}\p{N}_-]+/gu,'_').slice(0,70)||'Bewerbung';
  const on=(id,fn)=>$(id).addEventListener('click',async e=>{try{await fn(e);}catch(err){toast(err.message||String(err));}});
  on('menu-button',()=>{$('history-drawer').showModal();$('mobile-search').value=query;});on('close-menu',()=>$('history-drawer').close());
  on('home-help',()=>$('help-dialog').showModal());on('close-help',()=>$('help-dialog').close());
  for(const id of ['desktop-search','mobile-search'])$(id).addEventListener('input',e=>{query=e.target.value.toLocaleLowerCase('de');renderHistory();});
  $('show-archived').addEventListener('change',e=>{archived=e.target.checked;renderHistory();});
  for(const c of document.querySelectorAll('[data-history-list]'))c.addEventListener('click',async e=>{
    const item=e.target.closest('[data-record-id]');if(item){choose(item.dataset.recordId).catch(report);return;}
    const b=e.target.closest('[data-archive-id]');if(b){try{await flush();const r=records.find(x=>x.id===b.dataset.archiveId);if(!r)return;r.archivedAt=r.archivedAt?null:new Date().toISOString();r.updatedAt=new Date().toISOString();await S.save(r);if(r.id===session.id){session=structuredClone(r);}renderHistory();toast(r.archivedAt?'Im Archiv abgelegt. Über „Archivierte anzeigen“ wiederherstellbar.':'Bewerbung wiederhergestellt.');}catch(err){report(err);}}
  });
  for(const [id,key] of [['application-title','title'],['company','company'],['job','job'],['notes','notes']])$(id).addEventListener('input',()=>{session[key]=$(id).value;if(key==='job'||key==='notes')session.importedFinal=false;M.refresh(session);showResult=false;renderStatus();renderResult();$('copy-prompt').disabled=!M.unlocked(session,activeStep);$('save-answer').disabled=!M.unlocked(session,activeStep);$('save-plain').disabled=!M.unlocked(session,activeStep);$('open-plugin').setAttribute('aria-disabled',String(!M.unlocked(session,activeStep)));$('generated-prompt').value=M.unlocked(session,activeStep)?M.prompt(session,activeStep):'Bitte zuerst die vorherigen Schritte übernehmen.';schedule();});
  $('answer').addEventListener('input',()=>{session.steps[activeStep].draft=$('answer').value;M.refresh(session);outputError='';show('answer-error',false);renderStatus();schedule();});
  for(const b of document.querySelectorAll('[data-step]'))b.addEventListener('click',async()=>{try{await flush();activeStep=Number(b.dataset.step);session.current=activeStep;showResult=false;outputError='';renderStatus();renderStep();renderResult();scrollTo('step-panel');}catch(e){report(e);}});
  async function copyCurrentPrompt(){
    const id=session.id,index=activeStep,previous=session.steps[index].output,basis=M.basis(session,index),text=M.prompt(session,index);
    await copy(text,$('generated-prompt'));
    if(session.id!==id||activeStep!==index||M.basis(session,index)!==basis||session.steps[index].output!==previous)return false;
    session.steps[index].phase='copied';session.current=index;M.refresh(session);await persist();renderStatus();
    toast('Prompt kopiert. Tippe jetzt auf „ChatGPT öffnen“ und füge ihn dort ein.');return true;
  }
  on('copy-prompt',copyCurrentPrompt);
  on('start-flow',async()=>{
    if(M.status(session)==='done'){showResult=true;renderStatus();renderResult();scrollTo('result-panel');$('result-heading').focus({preventScroll:true});return;}
    if(!M.unlocked(session,0)){toast('Bitte die vollständige Stellenanzeige einfügen (mindestens 30 Zeichen).');return;}
    activeStep=session.steps.findIndex((x,i)=>!M.valid(session,i)||x.draft.trim()!==x.output.trim());if(activeStep<0)activeStep=2;
    session.current=activeStep;showResult=false;outputError='';render();scrollTo('step-panel');$('step-heading').focus({preventScroll:true});
    if(await copyCurrentPrompt())$('open-plugin').focus({preventScroll:true});
  });
  $('open-plugin').addEventListener('click',e=>{if(!M.unlocked(session,activeStep)){e.preventDefault();toast('Bitte zuerst die vorherigen Schritte übernehmen.');return;}session.steps[activeStep].phase='awaiting';session.current=activeStep;M.refresh(session);renderStatus();persist().catch(()=>{});});
  on('paste-answer',async()=>{if(!navigator.clipboard?.readText){$('answer').focus();toast('Im Antwortfeld gedrückt halten und „Einfügen“ wählen.');return;}try{$('answer').value=await navigator.clipboard.readText();$('answer').dispatchEvent(new Event('input',{bubbles:true}));toast('Antwort eingefügt. Bitte noch übernehmen.');}catch{$('answer').focus();toast('Bitte im Antwortfeld gedrückt halten und „Einfügen“ wählen.');}});
  async function accept(plain=false){
    try{const next=M.setAnswer(structuredClone(session),activeStep,$('answer').value,{plain});session=next;await persist();showResult=M.status(session)==='done';activeStep=Math.min(session.current,2);outputError='';render();scrollTo(showResult?'result-panel':'step-panel');toast(showResult?'Anschreiben übernommen und auf diesem Gerät gesichert.':'Antwort übernommen. Der nächste Schritt ist bereit.');}
    catch(e){outputError=e.message;$('answer-error').textContent=outputError;show('answer-error',true);}
  }
  on('save-answer',()=>accept(false));on('save-plain',()=>accept(true));
  on('copy-letter',async()=>{await copy(session.letter);toast('Anschreiben kopiert.');});
  on('share-letter',()=>navigator.share({title:session.result?.subject||M.label(session),text:session.letter}).catch(e=>{if(e.name!=='AbortError')throw e;}));
  on('download-txt',()=>download(session.letter,'Anschreiben_'+filename()+'.txt','text/plain;charset=utf-8'));
  on('download-json',()=>{if(!session.result)throw Error('Für diesen Text liegt kein strukturiertes JSON vor.');download(JSON.stringify(session.result,null,2),'Anschreiben_'+filename()+'.json','application/json');});
  on('edit-letter',()=>{$('letter-edit').open=true;scrollTo('letter-edit');});on('show-steps',()=>{showResult=false;renderResult();scrollTo('step-panel');});
  on('save-letter-edits',async()=>{
    if(session.result){const r=F.validateResult({...session.result,subject:$('edit-subject').value,salutation:$('edit-salutation').value,bodyParagraphs:$('edit-body').value.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean),closing:$('edit-closing').value});session.result=r;session.letter=F.letterText(r);session.steps[2].output=JSON.stringify(r,null,2);session.steps[2].draft=session.steps[2].output;session.steps[2].basis=M.basis(session,2);}
    else {const text=F.clean($('edit-plain').value);if(text.length<10)throw Error('Bitte ein vollständiges Anschreiben eingeben.');session.letter=text;session.steps[2].output=text;session.steps[2].draft=text;session.steps[2].basis=M.basis(session,2);}
    M.refresh(session);await persist();renderResult();$('letter-edit').open=false;toast('Änderungen gesichert.');
  });
  for(const b of document.querySelectorAll('[data-action]'))b.addEventListener('click',async()=>{try{
    if(b.dataset.action==='new')await newApplication();
    if(b.dataset.action==='help'){$('history-drawer').close();$('help-dialog').showModal();}
    if(b.dataset.action==='backup'){const list=records.filter(x=>x.id!==session.id);if(hasData(session))list.unshift(structuredClone(session));if(!list.length)throw Error('Es gibt noch keine Bewerbung zum Sichern.');download(M.exportBackup(list),'BewerbungsFlow_Sicherung_'+new Date().toISOString().slice(0,10)+'.json','application/json');toast('Sicherungsdatei erstellt. Bewahre sie an einem sicheren Ort auf.');}
    if(b.dataset.action==='import')$('import-file').click();
  }catch(e){toast(e.message);}});
  $('import-file').addEventListener('change',async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>10*1024*1024)throw Error('Die Sicherung ist zu groß (maximal 10 MB).');await flush();const imported=M.parseBackup(await file.text());let count=0;for(const r of imported){const old=records.find(x=>x.id===r.id);if(!old||Date.parse(r.updatedAt)>=Date.parse(old.updatedAt)){await S.save(r);const i=records.findIndex(x=>x.id===r.id);if(i<0)records.push(r);else records[i]=r;count++;}}records.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));renderHistory();if(imported.length===1)await choose(imported[0].id);toast(count+' Bewerbung'+(count===1?'':'en')+' importiert.');}catch(err){report(err);toast(err.message);}finally{e.target.value='';}});
  on('share-site',async()=>{const url=new URL('./',location.href).href;if(navigator.share){try{await navigator.share({title:'BewerbungsFlow',url});return;}catch(e){if(e.name==='AbortError')return;}}await copy(url);toast('Link kopiert. Du kannst ihn an dein iPhone weiterleiten.');});
  on('reload-app',async()=>{await flush();updateRequested=true;if(swRegistration?.waiting)swRegistration.waiting.postMessage({type:'SKIP_WAITING'});else location.reload();});
  function network(){const online=navigator.onLine;$('network-state').textContent=online?'Ohne Modell-API':'Offline · Entwürfe verfügbar';}window.addEventListener('online',network);window.addEventListener('offline',network);network();
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&hasData(session))persist().catch(()=>{});});
  window.addEventListener('beforeunload',e=>{if(saving){e.preventDefault();e.returnValue='';}});
  async function init(){try{records=await S.all();records.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));let id;try{id=localStorage.getItem('bf-mobile-current');}catch{}const saved=records.find(x=>x.id===id&&!x.archivedAt);if(saved){session=structuredClone(saved);activeStep=Math.min(session.current,2);showResult=M.status(session)==='done';$('save-state').textContent='Auf diesem Gerät gesichert';}render();}catch(e){render();report(e);}}
  init();
  if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(reg=>{swRegistration=reg;if(reg.waiting)show('update-banner',true);reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)show('update-banner',true);});});}).catch(()=>{});
  let reloading=false;navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(updateRequested&&!reloading){reloading=true;location.reload();}});
})();
