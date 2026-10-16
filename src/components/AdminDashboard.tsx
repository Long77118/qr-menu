import React, { useState, useEffect, useRef } from 'react';
import type { AdminRow, AdminPage, ShopStatus, createAdminStorageService } from '../services/adminStorageCore';

type Service = ReturnType<typeof createAdminStorageService>;
const statusName = (status: ShopStatus) => status === 'suspended' ? 'Tạm ngưng' : 'Hoạt động';
function date(value: any) { return value?.toDate ? value.toDate().toLocaleString('vi-VN') : '—'; }
export function AdminDashboard({ service, email, onLogout }: { service: Service; email: string; onLogout(): Promise<void> }) {
  const [tab, setTab] = useState<'shops' | 'users' | 'admin_logs'>('shops');
  const [stats, setStats] = useState<Awaited<ReturnType<Service['overview']>> | null>(null);
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [page, setPage] = useState<AdminPage | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ShopStatus>>({});
  const [search, setSearch] = useState('');
  const [lookup, setLookup] = useState('');
  const [selected, setSelected] = useState<AdminRow | null>(null);
  const [target, setTarget] = useState<ShopStatus>('suspended');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const request = useRef(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const ticket = ++request.current;
    setRows([]); setPage(null); setSelected(null); setSearch(''); setError(''); setLoading(true);
    void Promise.all([service.list(tab), service.overview()]).then(async ([next, totals]) => {
      const states = tab === 'shops' ? await service.statuses(next.rows.map(row => row.id)) : {};
      if (request.current !== ticket) return;
      setRows(next.rows); setPage(next); setStats(totals); setStatuses(states);
    }).catch(error => { if (request.current === ticket) setError(error.message || 'Không tải được dữ liệu quản trị.'); })
      .finally(() => { if (request.current === ticket) setLoading(false); });
    return () => { request.current++; };
  }, [service, tab, revision]);

  async function loadMore() {
    if (!page?.hasMore || loading) return;
    const ticket = request.current;
    setLoading(true); setError('');
    try {
      const next = await service.list(tab, page.cursor);
      const states = tab === 'shops' ? await service.statuses(next.rows.map(row => row.id)) : {};
      if (request.current !== ticket) return;
      setRows(current => [...current, ...next.rows]); setPage(next); setStatuses(current => ({ ...current, ...states }));
    } catch (error) { if (request.current === ticket) setError(error instanceof Error ? error.message : String(error)); }
    finally { if (request.current === ticket) setLoading(false); }
  }
  async function openShop(id: string) {
    if (busyRef.current || loading) return;
    busyRef.current = true; setBusy(true); setError(''); setSelected(null); setNotice('');
    const ticket = request.current;
    try {
      const [shop, states] = await Promise.all([service.getShop(id), service.statuses([id])]);
      if (request.current !== ticket) return;
      setStatuses(current => ({ ...current, ...states }));
      setSelected(shop); setReason(''); setTarget(states[id] === 'suspended' ? 'active' : 'suspended');
    } catch (error) { if (request.current === ticket) setError(error instanceof Error ? error.message : String(error)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function changeStatus(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await service.setShopStatus(selected.id, target, reason);
      setNotice(result.changed ? 'Đã đổi trạng thái quán và ghi nhật ký.' : 'Quán đã ở trạng thái này; không phát sinh thay đổi.');
      setRevision(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  const visible = rows.filter(row => `${row.id} ${row.data.name || ''} ${row.data.displayName || ''} ${row.data.email || ''} ${row.data.ownerId || ''} ${row.data.shopId || ''} ${row.data.reason || ''}`.toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN')));
  const tabs = [{ id: 'shops', label: 'Quán' }, { id: 'users', label: 'Người dùng' }, { id: 'admin_logs', label: 'Nhật ký' }] as const;
  return <div className="min-h-screen bg-[#FFF9F3] text-[#241E35] p-4 md:p-8">
    <header className="flex flex-wrap justify-between gap-4 items-center mb-6">
      <div><p className="text-sm font-bold text-[#FF5A36]">QR MENU · QUẢN TRỊ HỆ THỐNG</p><h1 className="text-2xl font-black">Điều hành nền tảng</h1><p className="text-sm text-slate-600">{email}</p></div>
      <div className="flex gap-4"><a href="#/" className="underline">Trang chủ</a><button onClick={() => void onLogout().catch(e => setError(e.message))}>Đăng xuất</button></div>
    </header>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[['Quán', stats?.shops], ['Hồ sơ người dùng', stats?.users], ['Quán đã xuất bản', stats?.published], ['Quán tạm ngưng', stats?.suspended]].map(([label, count]) => <div key={label} className="bg-white border border-[#EFE5D9] rounded-2xl p-4"><p className="text-sm text-slate-600">{label}</p><p className="text-3xl font-black mt-2">{count ?? '—'}</p></div>)}
    </div>
    <nav className="flex gap-2 mb-4" aria-label="Quản trị hệ thống">{tabs.map(item => <button key={item.id} disabled={busy} aria-pressed={tab === item.id} onClick={() => setTab(item.id)} className={`px-4 py-2 rounded-xl font-bold ${tab === item.id ? 'bg-[#241E35] text-white' : 'bg-white border'}`}>{item.label}</button>)}<button disabled={busy || loading} onClick={() => setRevision(v => v + 1)} className="ml-auto underline">Tải lại</button></nav>
    {notice && <p role="status" className="p-3 bg-emerald-50 text-emerald-800 mb-3 rounded-xl">{notice}</p>}
    {error && <p role="alert" className="p-3 bg-rose-50 text-rose-800 mb-3 rounded-xl">{error}</p>}
    {tab === 'users' && <p className="text-sm text-slate-600 mb-3">Danh sách hồ sơ đã lưu trong Firestore. Đây không phải danh sách toàn bộ tài khoản Firebase Authentication.</p>}
    <label className="block text-sm mb-4">Tìm trong danh sách đã tải<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên, email hoặc mã" className="block border rounded-xl p-3 bg-white w-full mt-1" /></label>
    {tab === 'shops' && <form onSubmit={e => { e.preventDefault(); if (lookup.trim()) void openShop(lookup.trim()); }} className="flex gap-2 mb-4"><input aria-label="Mã quán cần mở" value={lookup} onChange={e => setLookup(e.target.value)} placeholder="Mở quán bằng mã chính xác" className="border rounded-xl p-3 min-w-0 flex-1 bg-white" /><button disabled={busy || !lookup.trim()} className="bg-[#FF5A36] text-white rounded-xl px-4">Mở quán</button></form>}
    <div className="bg-white border rounded-2xl overflow-x-auto">
      <table className="w-full text-sm"><caption className="p-3 text-left text-slate-600">Đã tải {rows.length} bản ghi · Hiển thị {visible.length}</caption>
        <thead className="bg-slate-50 text-left"><tr><th className="p-3">{tab === 'shops' ? 'Quán' : tab === 'users' ? 'Người dùng' : 'Thao tác'}</th><th className="p-3">Thông tin</th><th className="p-3">{tab === 'shops' ? 'Trạng thái' : 'Chi tiết'}</th></tr></thead>
        <tbody>{visible.map(row => <tr key={row.id} className="border-t align-top">
          <td className="p-3 break-all">{tab === 'shops' ? <button disabled={busy} className="text-[#FF5A36] font-bold text-left underline" onClick={() => void openShop(row.id)}>{row.data.name || row.id}</button> : <strong>{tab === 'users' ? row.data.displayName || row.id : statusName(row.data.status)}</strong>}<p className="text-xs text-slate-500">{tab === 'admin_logs' ? date(row.data.createdAt) : row.id}</p></td>
          <td className="p-3 break-all">{tab === 'shops' ? row.data.ownerId : tab === 'users' ? row.data.email || 'Chưa có email' : `Quán: ${row.data.shopId}`} {tab === 'admin_logs' && <p>Quản trị viên: {row.data.actorId}</p>}</td>
          <td className="p-3">{tab === 'shops' ? <><span>{statusName(statuses[row.id] || 'active')}</span><p className="text-xs text-slate-500">{row.data.hasPublished ? 'Đã có bản xuất bản' : 'Chưa xuất bản'}</p></> : tab === 'users' ? row.data.activeShopId || 'Chưa liên kết quán' : <>{statusName(row.data.previousStatus)} → {statusName(row.data.status)}<p className="whitespace-pre-wrap">{row.data.reason}</p></>}</td>
        </tr>)}</tbody>
      </table>
      {!loading && !visible.length && <p className="p-5 text-slate-500">Không có bản ghi phù hợp.</p>}
    </div>
    {loading && <p role="status" className="py-3">Đang tải dữ liệu…</p>}
    {page?.hasMore && <button disabled={loading || busy} className="mt-4 border rounded-xl p-3 bg-white" onClick={() => void loadMore()}>Tải thêm 50 bản ghi</button>}
    {selected && <section className="mt-6 border bg-white p-5 rounded-2xl" aria-label="Chi tiết quán">
      <div className="flex justify-between gap-3"><h2 className="text-xl font-bold">{selected.data.name || selected.id}</h2><button disabled={busy} onClick={() => setSelected(null)}>Đóng chi tiết</button></div>
      <dl className="text-sm my-3 space-y-1"><div><dt className="inline font-bold">Mã quán: </dt><dd className="inline">{selected.id}</dd></div><div><dt className="inline font-bold">Chủ quán: </dt><dd className="inline">{selected.data.ownerId}</dd></div><div><dt className="inline font-bold">Địa chỉ: </dt><dd className="inline">{selected.data.draft?.shop?.address || 'Chưa có'}</dd></div><div><dt className="inline font-bold">Hotline: </dt><dd className="inline">{selected.data.draft?.shop?.phone || 'Chưa có'}</dd></div></dl>
      <p className="text-sm">Nháp: {selected.data.draft?.items?.length || 0} món · {selected.data.draft?.categories?.length || 0} nhóm. Trạng thái: {statusName(statuses[selected.id] || 'active')}.</p>
      <form onSubmit={changeStatus} className="mt-4 space-y-3 border-t pt-4">
        <label className="block font-bold">Trạng thái mới<select disabled={busy} value={target} onChange={e => setTarget(e.target.value as ShopStatus)} className="ml-3 border rounded-lg p-2"><option value="active">Hoạt động</option><option value="suspended">Tạm ngưng</option></select></label>
        <p className="text-sm text-slate-600">Tạm ngưng chặn menu khách và xuất bản mới. Bản nháp của chủ quán được giữ lại.</p>
        <label className="block">Lý do<textarea required maxLength={500} disabled={busy} value={reason} onChange={e => setReason(e.target.value)} className="block border rounded-xl p-3 mt-1 w-full" /></label>
        <button disabled={busy || !reason.trim()} className="bg-[#241E35] text-white px-4 py-3 rounded-xl disabled:opacity-50">{busy ? 'Đang ghi…' : 'Xác nhận đổi trạng thái & ghi nhật ký'}</button>
      </form>
    </section>}
  </div>;
}
