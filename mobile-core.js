(function(root){
  'use strict';
  const F=root.BewerbungsFlow||(typeof require==='function'?require('./core.js'):null);
  const names=['Anzeige verstehen','Relevanz herstellen','Anschreiben erstellen'];
  const limit=(s,n)=>typeof s==='string'?s.slice(0,n):'';
  function create(){return {version:2,id:crypto.randomUUID(),title:'Neue Bewerbung',company:'',job:'',notes:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),current:0,status:'draft',steps:F.STEPS.map(s=>({...s,output:'',draft:'',basis:null,phase:'pending'})),result:null,letter:'',importedFinal:false,archivedAt:null};}
  const basis=(s,i)=>JSON.stringify([s.job,s.notes,...s.steps.slice(0,i).map(x=>x.output)]);
  const stale=(s,i)=>!!s.steps[i].output&&s.steps[i].basis!==basis(s,i);
  const valid=(s,i)=>!!s.steps[i].output.trim()&&!stale(s,i);
  const unlocked=(s,i)=>s.job.trim().length>=30&&s.steps.slice(0,i).every((x,k)=>valid(s,k)&&x.draft.trim()===x.output.trim());
  function status(s){if(s.importedFinal&&s.letter)return 'done';if(valid(s,2)&&s.letter&&unlocked(s,2))return 'done';return s.job||s.steps.some(x=>x.output)?'draft':'empty';}
  function prompt(s,i){if(!unlocked(s,i))throw Error('Bitte zuerst die Stellenanzeige und die vorherigen Antworten übernehmen.');return F.prompt(s,i)+(i===2?'\nIm Feld closing nur die Grußformel, ohne Unterschrift oder Namen ausgeben.':'');}
  function parseFinal(raw){try{const result=F.validateResult(raw);return {result,letter:F.letterText(result)};}catch{return null;}}
  function setAnswer(s,i,text,{plain=false}={}){
    text=F.clean(text);if(text.length<10)throw Error('Bitte die vollständige Antwort aus ChatGPT einfügen.');if(text.length>150000)throw Error('Die Antwort ist zu lang (maximal 150.000 Zeichen).');
    if(!unlocked(s,i))throw Error('Bitte die vorherigen Schritte zuerst übernehmen.');
    if(i===2){const parsed=parseFinal(text);if(!parsed&&!plain)throw Error('Die Antwort ist kein vollständiges JSON. Bitte die gesamte Antwort kopieren oder „Als reinen Anschreibentext übernehmen“ wählen.');s.result=parsed?.result||null;s.letter=parsed?.letter||text;s.company=parsed?.result.company.company||s.company;s.importedFinal=false;}
    s.steps[i].output=text;s.steps[i].draft=text;s.steps[i].basis=basis(s,i);s.steps[i].phase='complete';s.current=Math.min(i+1,3);s.updatedAt=new Date().toISOString();s.status=status(s);return s;
  }
  function refresh(s){s.updatedAt=new Date().toISOString();s.status=status(s);return s;}
  function fromUnknown(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Ungültige Sicherungsdatei.');
    const s=create();
    if(typeof raw.id==='string'&&/^[A-Za-z0-9-]{8,80}$/.test(raw.id))s.id=raw.id;
    for(const k of ['createdAt','updatedAt'])if(typeof raw[k]==='string'&&Number.isFinite(Date.parse(raw[k])))s[k]=raw[k];
    s.title=limit(raw.title,200)||'Importierte Bewerbung';s.company=limit(raw.company,300);
    s.job=limit(raw.job||raw.jobText,100000);s.notes=limit(raw.notes,10000);
    if(Array.isArray(raw.steps)){s.steps.forEach((step,i)=>{const old=raw.steps[i];if(old&&typeof old==='object'){step.output=limit(old.output,150000);step.draft=typeof old.draft==='string'?limit(old.draft,150000):step.output;step.phase=step.output?'complete':'pending';step.basis=typeof old.basis==='string'?limit(old.basis,500000):basis(s,i);}});}
    const candidate=raw.result||((raw.bodyParagraphs&&raw.subject)?raw:null);
    if(candidate){const r=F.validateResult(candidate);s.result=r;s.letter=F.letterText(r);s.company=r.company.company;s.importedFinal=!!raw.importedFinal||!s.steps.slice(0,2).every(x=>x.output);if(!s.steps[2].output){s.steps[2].output=JSON.stringify(r,null,2);s.steps[2].draft=s.steps[2].output;s.steps[2].basis=basis(s,2);}}
    if(!s.result&&typeof raw.letter==='string'){s.letter=limit(raw.letter,150000);s.importedFinal=!!raw.importedFinal;}
    if(!s.result&&raw.subject&&typeof raw.bodyText==='string'){
      const r=F.validateResult({language:raw.language||'de',subject:raw.subject,salutation:raw.salutation||'Guten Tag,',bodyParagraphs:raw.bodyText.split(/\n{2,}/).filter(Boolean),closing:raw.closing||'Mit freundlichen Grüßen',company:raw.company||{company:'Unternehmen'},cvVariant:raw.cvVariant||'marketing-lead',cvReason:raw.cvLabel||'',folderSlug:raw.folderSlug||'Unternehmen',analysis:raw.analysis||'',questions:[]});s.result=r;s.letter=F.letterText(r);s.company=r.company.company;s.importedFinal=true;
    }
    if(!s.result&&s.steps[2].output){const p=parseFinal(s.steps[2].output);if(p){s.result=p.result;s.letter=p.letter;s.company=p.result.company.company;}}
    s.archivedAt=typeof raw.archivedAt==='string'?raw.archivedAt:null;s.current=Math.max(0,Math.min(3,Number(raw.current)||0));s.status=status(s);return s;
  }
  function parseBackup(raw){let data;try{data=JSON.parse(raw);}catch{throw Error('Die Datei enthält kein gültiges JSON.');}const records=Array.isArray(data)?data:Array.isArray(data?.records)?data.records:Array.isArray(data?.entries)?data.entries:[data];if(!records.length||records.length>200)throw Error('Eine Sicherung muss 1 bis 200 Bewerbungen enthalten.');return records.map(fromUnknown);}
  const exportBackup=records=>JSON.stringify({format:'bewerbungsflow-mobile',version:1,exportedAt:new Date().toISOString(),records},null,2);
  const label=s=>s.company||((s.title&&s.title!=='Neue Bewerbung')?s.title:s.job.split('\n').find(x=>x.trim())?.slice(0,90))||'Neue Bewerbung';
  root.BFMobile={create,basis,stale,valid,unlocked,status,prompt,setAnswer,refresh,fromUnknown,parseBackup,exportBackup,label,names};
  if(typeof module!=='undefined')module.exports=root.BFMobile;
})(globalThis);
