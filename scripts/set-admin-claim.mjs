/** Trusted operator CLI only. Never import this script into the browser bundle. */
import { createRequire } from 'node:module';
const options = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
  const separator = arg.indexOf('='); return [arg.slice(2, separator), arg.slice(separator + 1)];
}));
const args = new Set(process.argv.slice(2));
const project = options.get('project');
const email = options.get('email');
const grant = args.has('--grant');
const revoke = args.has('--revoke');
if (!project || !email || grant === revoke || !/^[a-z0-9-]+$/.test(project)) {
  console.error('Usage: node scripts/set-admin-claim.mjs --project=PROJECT --email=EMAIL --grant|--revoke [--apply]');
  process.exit(1);
}
const credential = process.env.QR_ADMIN_ACCESS_TOKEN;
let cli;
async function request(method, body) {
  if (!credential) {
    if (!cli) {
      const require = createRequire(import.meta.url);
      if (require('firebase-tools/package.json').version !== '15.33.0') throw new Error('CLI bridge cần firebase-tools 15.33.0; hãy dùng QR_ADMIN_ACCESS_TOKEN nếu phiên bản khác.');
      const account = require('firebase-tools/lib/auth').getGlobalDefaultAccount();
      if (!account) throw new Error('Chưa đăng nhập Firebase CLI. Chạy bun run --bun firebase login bằng tài khoản quản lý project.');
      await require('firebase-tools/lib/requireAuth').requireAuth({ project, user: account.user, tokens: account.tokens }, true);
      const { Client } = require('firebase-tools/lib/apiv2');
      cli = new Client({ urlPrefix: 'https://identitytoolkit.googleapis.com', auth: true });
    }
    return (await cli.post(`/v1/projects/${encodeURIComponent(project)}/accounts:${method}`, body)).body;
  }
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(project)}/accounts:${method}`, {
    method: 'POST', headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Firebase request failed (${response.status}): ${result.error?.message || 'unknown error'}`);
  return result;
}
try {
  const result = await request('lookup', { email: [email] });
  if (result.users?.length !== 1 || result.users[0].email?.toLowerCase() !== email.toLowerCase()) throw new Error('Không tìm thấy đúng một tài khoản khớp email trong project.');
  const user = result.users[0];
  if (grant && (user.disabled || user.emailVerified !== true)) throw new Error('Chỉ cấp quyền cho tài khoản đang hoạt động và đã xác minh email.');
  const claims = JSON.parse(user.customAttributes || '{}');
  if (grant) claims.qrAdmin = true;
  else delete claims.qrAdmin;
  const payload = JSON.stringify(claims);
  if (Buffer.byteLength(payload, 'utf8') > 1000) throw new Error('Custom claims vượt giới hạn 1000 bytes.');
  console.log(`Project: ${project}\nTài khoản: ${email}\nUID: ${user.localId}\nThao tác: ${grant ? 'cấp' : 'thu hồi'} qrAdmin`);
  if (!args.has('--apply')) console.log('Đang xem trước. Thêm --apply để thực hiện thay đổi.');
  else {
    await request('update', { localId: user.localId, customAttributes: payload });
    const verified = await request('lookup', { localId: [user.localId] });
    const actual = JSON.parse(verified.users?.[0]?.customAttributes || '{}');
    if ((actual.qrAdmin === true) !== grant) throw new Error('Chưa xác minh được kết quả cấp/thu hồi quyền.');
    console.log('Đã xác minh custom claim. Đăng nhập lại hoặc kiểm tra lại quyền trong trang admin để lấy token mới.');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
