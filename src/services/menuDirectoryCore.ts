import { Firestore, collection, query, where, orderBy, documentId, startAfter, limit,
  onSnapshot, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { validCountry } from '../utils/countries';
import { dataMetrics, type DataMetrics } from './dataMetrics';

export const DIRECTORY_PAGE_SIZE=12;
export interface DirectoryEntry { shopId:string; name:string; tagline:string; address:string; countryCode?:string; imageUrl?:string; publishedAt:string; active:boolean }
export interface DirectoryPage { entries:DirectoryEntry[]; cursor?:QueryDocumentSnapshot<DocumentData>; hasMore:boolean }
type Client={onPage:(page:DirectoryPage)=>void;onError:(error:Error)=>void;active:boolean};
type Connection={clients:Set<Client>;latest?:DirectoryPage;failure?:Error;stop?:()=>void;timer?:ReturnType<typeof setTimeout>;closed:boolean;started:number;receivedServer:boolean;idleAt:number};

/** Only active connections can replay data. No persistent result cache can revive a locked shop. */
export function createMenuDirectoryService(db:Firestore,options:{teardownMs?:number;metrics?:DataMetrics}={}) {
  const connections=new Map<string,Connection>(),metrics=options.metrics||dataMetrics;
  const grace=options.teardownMs??250;
  function call(client:Client,kind:'page'|'error',value:DirectoryPage|Error,entry:Connection){
    queueMicrotask(()=>{
      if(!client.active || (kind==='page'&&(entry.closed||entry.latest!==value)) || (kind==='error'&&entry.latest))return;
      try{if(kind==='page')client.onPage(value as DirectoryPage);else client.onError(value as Error);}
      catch{metrics.record({callbackErrors:1});}
    });
  }
  function close(key:string,entry:Connection){
    if(entry.closed)return;entry.closed=true;clearTimeout(entry.timer);entry.latest=undefined;
    if(connections.get(key)===entry)connections.delete(key);
    entry.stop?.();metrics.record({listenerStops:1,activeListeners:-1});
  }
  function fail(key:string,entry:Connection,error:Error){
    if(entry.closed)return;entry.failure=error;entry.latest=undefined;
    metrics.record({queryErrors:1});close(key,entry);
    for(const client of [...entry.clients])call(client,'error',error,entry);
  }
  return {
    subscribe(cursor:QueryDocumentSnapshot<DocumentData>|undefined,onPage:Client['onPage'],onError:Client['onError'],country='all'){
      if(country!=='all' && country!=='unknown' && (!country || !validCountry(country)))throw new Error('Bộ lọc quốc gia không hợp lệ.');
      metrics.record({subscribeRequests:1});
      const key=JSON.stringify([country,cursor?.ref?.path||cursor?.id||'',DIRECTORY_PAGE_SIZE]);
      let entry=connections.get(key);const client:Client={onPage,onError,active:true};
      if(entry){
        clearTimeout(entry.timer);entry.timer=undefined;entry.clients.add(client);metrics.record({sharedRequests:1});
        if(entry.latest)call(client,'page',entry.latest,entry);else if(entry.failure)call(client,'error',entry.failure,entry);
      }else{
        const created:Connection={clients:new Set([client]),closed:false,started:Date.now(),receivedServer:false,idleAt:0};
        entry=created;connections.set(key,created);metrics.record({listenerStarts:1,activeListeners:1});
        try{
          const request=query(collection(db,'menu_directory'),where('active','==',true),orderBy(documentId()),
            ...(country==='all'?[]:[where('countryCode','==',country==='unknown'?'':country)]),
            ...(cursor?[startAfter(cursor)]:[]),limit(DIRECTORY_PAGE_SIZE+1));
          created.stop=onSnapshot(request,{includeMetadataChanges:true},snapshot=>{
            if(created.closed)return;
            if(snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites){
              const hadTrusted=!!created.latest;created.latest=undefined;
              metrics.record({cacheSnapshotsIgnored:1});
              if(hadTrusted || (typeof navigator!=='undefined' && navigator.onLine===false)){
                const error=new Error('Cần kết nối với máy chủ để xác minh danh sách quán công khai.');created.failure=error;
                for(const subscriber of [...created.clients])call(subscriber,'error',error,created);
              }
              return;
            }
            const rows=snapshot.docs.slice(0,DIRECTORY_PAGE_SIZE);
            const page:DirectoryPage={entries:rows.map(row=>({...row.data(),shopId:row.id}) as DirectoryEntry),cursor:rows.at(-1),hasMore:snapshot.docs.length>DIRECTORY_PAGE_SIZE};
            for(const row of page.entries)Object.freeze(row);Object.freeze(page.entries);Object.freeze(page);
            if(metrics.enabled){
              const changes=snapshot.docChanges();
              const payload=created.receivedServer?changes.map(change=>change.doc.data()):snapshot.docs.map(row=>row.data());
              metrics.record({serverSnapshots:1,observedDocuments:snapshot.docs.length,changedDocuments:changes.length,observedJsonBytes:payload.length?new TextEncoder().encode(JSON.stringify(payload)).length:0,
                ...(!created.receivedServer?{firstServerCount:1,firstServerMsTotal:Date.now()-created.started}:{})});
            }
            created.receivedServer=true;created.latest=page;created.failure=undefined;
            for(const subscriber of [...created.clients])call(subscriber,'page',page,created);
          },error=>fail(key,created,error));
          // Test doubles can invoke error synchronously before returning the unsubscribe function.
          if(created.closed)created.stop();
        }catch(error){fail(key,created,error instanceof Error?error:new Error(String(error)));}
      }
      const current=entry;let subscribed=true;
      return()=>{
        if(!subscribed)return;subscribed=false;client.active=false;current.clients.delete(client);
        if(current.closed || current.clients.size)return;
        current.idleAt=Date.now();current.timer=setTimeout(()=>close(key,current),grace);
        // A rapid sequence of filters may retain at most two idle listeners during the grace window.
        const idle=[...connections.entries()].filter(([,value])=>!value.clients.size).sort((a,b)=>a[1].idleAt-b[1].idleAt);
        while(idle.length>2){const [oldKey,old]=idle.shift()!;close(oldKey,old);}
      };
    },
  };
}
