export interface DataCounters {
  subscribeRequests:number; sharedRequests:number; listenerStarts:number; listenerStops:number;
  activeListeners:number; peakListeners:number; serverSnapshots:number; cacheSnapshotsIgnored:number;
  queryErrors:number; callbackErrors:number; observedDocuments:number; changedDocuments:number;
  observedJsonBytes:number; firstServerCount:number; firstServerMsTotal:number;
  resourcesObserved:number; imageResourcesObserved:number; visibleTransferBytes:number;
  resourceSizesUnavailable:number;
  draftSaveRequests:number; draftWriteAcks:number; unchangedDraftWrites:number; publishWriteAcks:number; syncFailures:number;
}
const initial=():DataCounters=>({subscribeRequests:0,sharedRequests:0,listenerStarts:0,listenerStops:0,activeListeners:0,peakListeners:0,serverSnapshots:0,cacheSnapshotsIgnored:0,queryErrors:0,callbackErrors:0,observedDocuments:0,changedDocuments:0,observedJsonBytes:0,firstServerCount:0,firstServerMsTotal:0,resourcesObserved:0,imageResourcesObserved:0,visibleTransferBytes:0,resourceSizesUnavailable:0,draftSaveRequests:0,draftWriteAcks:0,unchangedDraftWrites:0,publishWriteAcks:0,syncFailures:0});
export function createDataMetrics(enabled=true,now=()=>Date.now()) {
  let state={startedAt:now(),...initial()},scheduled=false;
  const subscribers=new Set<()=>void>();
  function notify(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;for(const fn of subscribers)fn();});}
  return {
    enabled,
    getSnapshot:()=>state,
    subscribe:(fn:()=>void)=>{subscribers.add(fn);return()=>{subscribers.delete(fn);};},
    record(delta:Partial<DataCounters>){
      if(!enabled)return;
      const next={...state};
      for(const key of Object.keys(delta) as Array<keyof DataCounters>)next[key]=Math.max(0,next[key]+(delta[key]||0));
      next.peakListeners=Math.max(next.peakListeners,next.activeListeners);state=next;notify();
    },
    reset(){state={startedAt:now(),...initial(),activeListeners:state.activeListeners,peakListeners:state.activeListeners};notify();},
    export(){return{schema:'qr-menu.data-metrics.v1',scope:'current-tab-memory',capturedAt:now(),...state,notes:['SDK listener registrations and observed JSON; not Firebase billed reads or wire bytes.','Resource transfer size can be unavailable due to CORS or browser cache.','No document contents, shop IDs, URLs or user identifiers are collected.']};},
  };
}
export type DataMetrics=ReturnType<typeof createDataMetrics>;
export const dataDiagnosticsEnabled=import.meta.env.DEV || import.meta.env.VITE_DATA_DIAGNOSTICS==='true';
export const dataMetrics=createDataMetrics(dataDiagnosticsEnabled);

let resourceUsers=0,observer:PerformanceObserver|undefined;
const seenResources=new Set<string>();
export function observeResourceMetrics(){
  if(!dataDiagnosticsEnabled||typeof PerformanceObserver==='undefined')return()=>{};
  resourceUsers++;
  if(!observer){
    observer=new PerformanceObserver(list=>{
      for(const value of list.getEntries()){
        const entry=value as PerformanceResourceTiming;
        const key=`${entry.startTime}:${entry.duration}:${entry.initiatorType}`;
        if(seenResources.has(key))continue;seenResources.add(key);
        if(seenResources.size>2000)seenResources.delete(seenResources.values().next().value!);
        const bytes=Number.isFinite(entry.transferSize)?entry.transferSize:0;
        dataMetrics.record({resourcesObserved:1,imageResourcesObserved:entry.initiatorType==='img'?1:0,visibleTransferBytes:Math.max(0,bytes),resourceSizesUnavailable:bytes===0&&entry.encodedBodySize===0?1:0});
      }
    });
    try{observer.observe({type:'resource',buffered:true});}catch{observer.disconnect();observer=undefined;}
  }
  let active=true;return()=>{if(!active)return;active=false;resourceUsers--;if(resourceUsers===0){observer?.disconnect();observer=undefined;}};
}
