import type { OperationResult } from '../types/operations';
import React, { useState } from 'react';
import type { MenuCategory, MenuItem } from '../types/menu';
import { compressImageFile } from '../utils/image';

export function CategoryPhotoField({category,items,onSave}: {category:MenuCategory;items:MenuItem[];onSave:(name:string,id?:string,imageUrl?:string|null)=>void|Promise<OperationResult>}) {
 const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 const image = category.imageUrl || items.find(item=>item.categoryId === category.id && item.imageUrl)?.imageUrl;
 return <div className="category-photo-field">
  {image && <img src={image} alt={`Ảnh danh mục ${category.name}`} referrerPolicy="no-referrer" />}
  <div><label>Ảnh danh mục {category.name}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async event=>{
    const input=event.currentTarget; const file=input.files?.[0]; if(!file)return; setBusy(true);setError('');
    try { const imageUrl=await compressImageFile(file,800,.75); const result = await onSave(category.name,category.id,imageUrl); if (result && !result.success) throw new Error(result.error || 'Không lưu được ảnh danh mục.'); }
    catch(error){setError(error instanceof Error?error.message:'Không xử lý được ảnh.');}
    finally {setBusy(false);input.value='';}
  }} /></label><p>{busy?'Đang xử lý ảnh…':'Gợi ý 1200 × 800 px (3:2), tối đa 5 MB. Chưa chọn ảnh sẽ dùng ảnh món.'}</p></div>
  {category.imageUrl && <button type="button" disabled={busy} onClick={async ()=>{setBusy(true);setError('');try{const result=await onSave(category.name,category.id,null);if(result && !result.success)setError(result.error || 'Không lưu được thay đổi.');}catch(error){setError(error instanceof Error?error.message:'Không lưu được thay đổi.');}finally{setBusy(false);}}}>Dùng ảnh món</button>}
  {error && <p role="alert">{error}</p>}
 </div>;
}
