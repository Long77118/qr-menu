/** Trusted operator only. Default is a read-only preview. Never bundle in the app. */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const config = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
const apply = process.argv.includes('--apply');
const project = config.projectId;
const database = config.firestoreDatabaseId || '(default)';
const base = `/v1/projects/${project}/databases/${database}/documents`;
const resource = base.slice(4);
const countryCodes = new Set(JSON.parse(readFileSync(new URL('../src/data/countryCodes.json', import.meta.url), 'utf8')));
const s = value => ({ stringValue: value });
try {
  if (require('firebase-tools/package.json').version !== '15.33.0') throw new Error('Cần firebase-tools 15.33.0.');
  const account = require('firebase-tools/lib/auth').getGlobalDefaultAccount();
  if (!account) throw new Error('Cần đăng nhập Firebase CLI trước.');
  await require('firebase-tools/lib/requireAuth').requireAuth({ project, user: account.user, tokens: account.tokens }, true);
  const { Client } = require('firebase-tools/lib/apiv2');
  const client = new Client({ urlPrefix: 'https://firestore.googleapis.com', auth: true });
  const read = async (name, transaction) => {
    try { return (await client.get(`/v1/${name}`, { queryParams: transaction ? { transaction } : {} })).body; }
    catch (error) { if (error.status === 404) return null; throw error; }
  };
  let token, total = 0, changed = 0, skipped = 0;
  console.log(`Project: ${project}\nDatabase: ${database}\nChế độ: ${apply ? 'ghi danh sách công khai' : 'xem trước, không ghi'}`);
  do {
    const page = (await client.get(`${base}/published_menus`, { queryParams: { pageSize: 100, ...(token ? { pageToken: token } : {}) } })).body;
    for (const entry of page.documents || []) {
      total++;
      let transaction;
      try {
        if (apply) transaction = (await client.post(`${base}:beginTransaction`, { options: { readWrite: {} } })).body.transaction;
        const published = await read(entry.name, transaction);
        const id = entry.name.split('/').at(-1);
        const shop = await read(`${resource}/shops/${id}`, transaction);
        const control = await read(`${resource}/shop_controls/${id}`, transaction);
        const existing = await read(`${resource}/menu_directory/${id}`, transaction);
        const fields = published?.fields;
        const info = fields?.shop?.mapValue?.fields;
        if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id) || !shop || fields?.ownerId?.stringValue !== shop.fields?.ownerId?.stringValue
          || fields?.shopId?.stringValue !== id || info?.id?.stringValue !== id
          || !info?.name?.stringValue || !fields?.publishedAt?.stringValue
          || (info.countryCode?.stringValue && !countryCodes.has(info.countryCode.stringValue))) {
          skipped++; continue;
        }
        const summary = { shopId: s(id), name: s(info.name.stringValue), tagline: s(info.tagline?.stringValue || ''),
          address: s(info.address?.stringValue || ''), publishedAt: s(fields.publishedAt.stringValue),
          countryCode: s(info.countryCode?.stringValue || ''),
          imageUrl: s(info.discoveryImageUrl?.stringValue || info.coverUrl?.stringValue || info.headerBackground?.mapValue?.fields?.imageUrl?.stringValue || info.logoUrl?.stringValue || ''),
          active: { booleanValue: control?.fields?.status?.stringValue !== 'suspended' } };
        const unchanged = existing && Object.keys(existing.fields).length === 8
          && Object.entries(summary).every(([key, value]) => JSON.stringify(existing.fields[key]) === JSON.stringify(value));
        if (unchanged) continue;
        changed++;
        if (apply) {
          await client.post(`${base}:commit`, { transaction, writes: [{ update: { name: `${resource}/menu_directory/${id}`, fields: summary } }] });
          transaction = undefined;
        }
      } finally {
        if (transaction) await client.post(`${base}:rollback`, { transaction });
      }
    }
    token = page.nextPageToken;
  } while (token);
  console.log(`Menu đã kiểm tra: ${total}\nBản ghi ${apply ? 'đã cập nhật' : 'sẽ cập nhật'}: ${changed}\nBỏ qua dữ liệu thiếu/sai liên kết: ${skipped}`);
  if (!apply) console.log('Thêm --apply để tạo/cập nhật danh sách từ phiên bản public hiện có; không đọc nội dung draft vào danh sách.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
