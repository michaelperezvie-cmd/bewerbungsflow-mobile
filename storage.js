(function(root){
  'use strict';
  let dbPromise;
  function db(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('bewerbungsflow-mobile',1);r.onupgradeneeded=()=>r.result.createObjectStore('records',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{dbPromise=null;reject(Error('Der Browserspeicher ist nicht verfügbar. Bitte den privaten Modus beenden oder eine Sicherung herunterladen.'));};r.onblocked=()=>{dbPromise=null;reject(Error('Bitte andere BewerbungsFlow-Tabs schließen und erneut versuchen.'));};});return dbPromise;}
  async function transact(mode,work){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('records',mode);let value;try{value=work(tx.objectStore('records'));}catch(e){tx.abort();reject(e);return;}tx.oncomplete=()=>resolve(value?.result??value);tx.onerror=()=>reject(Error('Speichern fehlgeschlagen. Bitte eine Sicherung herunterladen und freien Gerätespeicher prüfen.'));tx.onabort=()=>reject(Error('Der Speichervorgang wurde abgebrochen. Deine Eingabe bleibt geöffnet.'));});}
  root.BFStore={all:()=>transact('readonly',s=>s.getAll()),save:record=>transact('readwrite',s=>s.put(structuredClone(record))),importMany:records=>transact('readwrite',s=>{for(const r of records)s.put(r);})};
})(globalThis);
