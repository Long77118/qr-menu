import React,{useState,useSyncExternalStore} from 'react';
import {dataMetrics} from '../services/dataMetrics';
import './dataDiagnostics.css';
const kb=(bytes:number)=>`${(bytes/1024).toFixed(1)} KiB`;
export function DataDiagnostics(){
  const [open,setOpen]=useState(false),[message,setMessage]=useState('');
  const state=useSyncExternalStore(dataMetrics.subscribe,dataMetrics.getSnapshot,dataMetrics.getSnapshot);
  function download(){
    const url=URL.createObjectURL(new Blob([JSON.stringify(dataMetrics.export(),null,2)],{type:'application/json'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download='qr-menu-data-metrics.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Đã tạo file số liệu của tab này.');
  }
  return <aside className="data-diagnostics" aria-label="Chẩn đoán dữ liệu"><button type="button" className="data-diagnostics-toggle" aria-expanded={open} aria-controls="data-diagnostics-panel" onClick={()=>setOpen(!open)}>Đo dữ liệu <span>{state.activeListeners} kết nối</span></button>
    {open&&<section id="data-diagnostics-panel"><h2>Khám phá · Số liệu trong tab</h2><p>Chỉ lưu trong bộ nhớ, không gửi Firebase hay dịch vụ phân tích.</p><dl>
      <div><dt>Yêu cầu đăng ký / dùng chung</dt><dd>{state.subscribeRequests} / {state.sharedRequests}</dd></div>
      <div><dt>Listener tạo / dừng</dt><dd>{state.listenerStarts} / {state.listenerStops}</dd></div>
      <div><dt>Đang mở / cao nhất</dt><dd>{state.activeListeners} / {state.peakListeners}</dd></div>
      <div><dt>Snapshot server / cache bỏ qua</dt><dd>{state.serverSnapshots} / {state.cacheSnapshotsIgnored}</dd></div>
      <div><dt>Document quan sát / thay đổi</dt><dd>{state.observedDocuments} / {state.changedDocuments}</dd></div>
      <div><dt>JSON ứng dụng xử lý</dt><dd>{kb(state.observedJsonBytes)}</dd></div>
      <div><dt>Chờ server lần đầu (trung bình)</dt><dd>{state.firstServerCount?`${Math.round(state.firstServerMsTotal/state.firstServerCount)} ms`:'Chưa có mẫu'}</dd></div>
      <div><dt>Tài nguyên / lượt tải ảnh</dt><dd>{state.resourcesObserved} / {state.imageResourcesObserved}</dd></div>
      <div><dt>Transfer size đo được</dt><dd>{kb(state.visibleTransferBytes)}</dd></div>
      <div><dt>Tài nguyên không rõ kích thước</dt><dd>{state.resourceSizesUnavailable}</dd></div>
      <div><dt>Lỗi truy vấn / callback</dt><dd>{state.queryErrors} / {state.callbackErrors}</dd></div>
      <div><dt>Yêu cầu lưu nháp / ghi được xác nhận</dt><dd>{state.draftSaveRequests} / {state.draftWriteAcks}</dd></div>
      <div><dt>Ghi nháp trùng bỏ qua</dt><dd>{state.unchangedDraftWrites}</dd></div>
      <div><dt>Ghi document xuất bản được xác nhận</dt><dd>{state.publishWriteAcks}</dd></div>
      <div><dt>Lỗi đồng bộ nháp / xuất bản</dt><dd>{state.syncFailures}</dd></div>
    </dl><p>Không phải số read tính phí. JSON không phải byte trên mạng. Transfer size có thể thiếu do CORS/cache.</p><div className="data-diagnostics-actions"><button type="button" onClick={download}>Xuất JSON</button><button type="button" onClick={()=>{dataMetrics.reset();setMessage('Đã đặt lại bộ đếm; giữ số kết nối đang mở.');}}>Đặt lại</button><button type="button" onClick={()=>setOpen(false)}>Đóng</button></div><span role="status">{message}</span></section>}
  </aside>;
}
