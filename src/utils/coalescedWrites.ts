type Enqueue = <T>(key: string, work: () => Promise<T>) => Promise<T>;

/** Reserve the original queue position, but keep only the latest draft before committing.
 * flush() closes the window BEFORE publish is enqueued, so later edits cannot cross it. */
export function createCoalescedWrites<T, R>(enqueue: Enqueue, delayMs = 600, maxWaitMs = 2000) {
  const windows = new Map<string, { value:T; started:number; timer:ReturnType<typeof setTimeout>; release:()=>void; promise:Promise<R> }>();
  function flush(key:string) {
    const entry=windows.get(key);
    if (!entry) return;
    clearTimeout(entry.timer); windows.delete(key); entry.release();
  }
  return {
    flush,
    schedule(key:string,value:T,commit:(value:T)=>Promise<R>):Promise<R> {
      const existing=windows.get(key);
      if(existing){
        existing.value=value;clearTimeout(existing.timer);
        existing.timer=setTimeout(()=>flush(key),Math.max(0,Math.min(delayMs,maxWaitMs-(Date.now()-existing.started))));
        return existing.promise;
      }
      let release!:()=>void;
      const gate=new Promise<void>(resolve=>{release=resolve;});
      const entry={value,started:Date.now(),release,timer:undefined as unknown as ReturnType<typeof setTimeout>,promise:undefined as unknown as Promise<R>};
      entry.promise=enqueue(key,async()=>{await gate;return commit(entry.value);});
      windows.set(key,entry);entry.timer=setTimeout(()=>flush(key),Math.min(delayMs,maxWaitMs));
      return entry.promise;
    },
  };
}
