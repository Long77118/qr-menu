import React, { useEffect, useRef, useState } from 'react';
import { FirebaseAuthService } from '../services/firebase';
import { AuthSession } from '../services/authSession';
import { AdminStorageService } from '../services/adminStorage';
import { AdminDashboard } from './AdminDashboard';

export function AdminPortal() {
  const [state, setState] = useState<'checking' | 'anonymous' | 'denied' | 'admin'>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    setState('checking'); setError('');
    const unsubscribe = FirebaseAuthService.onAuthStateChanged(async user => {
      const ticket = ++generation.current;
      if (!user) { setState('anonymous'); return; }
      try {
        const token = await user.getIdTokenResult(true);
        if (ticket !== generation.current || FirebaseAuthService.getCurrentUser()?.uid !== user.uid) return;
        setEmail(user.email || user.uid);
        setState(token.claims.qrAdmin === true ? 'admin' : 'denied');
      } catch (error) {
        if (ticket === generation.current) { setState('denied'); setError(error instanceof Error ? error.message : String(error)); }
      }
    });
    return () => { generation.current++; unsubscribe(); };
  }, [retry]);
  async function login(google: boolean) {
    if (busy) return;
    setBusy(true); setError(''); AuthSession.invalidate();
    try {
      if (google) await FirebaseAuthService.signInWithGoogle();
      else await FirebaseAuthService.signInWithEmail(email.trim(), password);
      setPassword('');
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  async function logout() { AuthSession.invalidate(); await FirebaseAuthService.signOut(); }
  if (state === 'admin') return <AdminDashboard service={AdminStorageService} email={email} onLogout={logout} />;
  return <main className="min-h-screen bg-[#FFF9F3] flex items-center justify-center p-4"><section className="bg-white border border-[#EFE5D9] rounded-3xl p-6 w-full max-w-md">
    <p className="font-bold text-[#FF5A36]">QR MENU</p><h1 className="font-black text-2xl my-2">Quản trị hệ thống</h1>
    {error && <p role="alert" className="text-rose-700 my-3">{error}</p>}
    {state === 'checking' && <p role="status">Đang xác minh quyền quản trị…</p>}
    {state === 'denied' && <><p role="alert" className="my-4">Tài khoản chưa có quyền quản trị hoặc chưa xác minh được quyền.</p><button className="underline mr-4" disabled={busy} onClick={() => setRetry(v => v + 1)}>Kiểm tra lại quyền</button><button className="underline" onClick={() => void logout().catch(e => setError(e.message))}>Đăng xuất</button></>}
    {state === 'anonymous' && <form onSubmit={e => { e.preventDefault(); void login(false); }} className="space-y-4 my-4">
      <label className="block">Email<input type="email" autoComplete="username" required disabled={busy} value={email} onChange={e => setEmail(e.target.value)} className="block border rounded-xl p-3 w-full mt-1" /></label>
      <label className="block">Mật khẩu<input type="password" autoComplete="current-password" required disabled={busy} value={password} onChange={e => setPassword(e.target.value)} className="block border rounded-xl p-3 w-full mt-1" /></label>
      <button disabled={busy} className="bg-[#241E35] text-white rounded-xl p-3 w-full">{busy ? 'Đang đăng nhập…' : 'Đăng nhập quản trị'}</button>
      <button type="button" disabled={busy} className="border rounded-xl p-3 w-full" onClick={() => void login(true)}>Đăng nhập bằng Google</button>
      <p className="text-sm text-slate-500">Chỉ tài khoản được cấp quyền quản trị mới truy cập được.</p>
    </form>}
    <a href="#/" className="inline-block underline text-sm mt-4">Về trang chủ</a>
  </section></main>;
}
