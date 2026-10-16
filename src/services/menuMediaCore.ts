import type { ShopData, MenuImageSources } from '../types/menu';
import { sanitizeShopData } from '../utils/sanitizeShopData';
export type UploadMenuImage=(source:string,ownerId:string)=>Promise<MenuImageSources>;
export const inlineMenuImage=(value:unknown):value is string=>typeof value==='string' && /^data:image\/(jpeg|png|webp);base64,/i.test(value);

/** Runs only at the cloud boundary. The caller's draft and local pending copy stay intact on failure. */
export async function externalizeMenuImages(input:ShopData,ownerId:string,upload:UploadMenuImage):Promise<ShopData> {
  const draft=sanitizeShopData(input);
  const seen=new Map<string,Promise<MenuImageSources>>();
  async function image(url:string|undefined,sources?:MenuImageSources) {
    if(url?.startsWith('data:') && !inlineMenuImage(url))throw new Error('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.');
    if(!inlineMenuImage(url))return{url,sources:sources?.original===url?sources:undefined};
    let pending=seen.get(url);if(!pending){pending=upload(url,ownerId);seen.set(url,pending);}
    const result=await pending;
    if(![result.original,result.thumbnail,result.card,result.detail].every(x=>/^https:\/\//.test(x)))throw new Error('Kho ảnh trả về URL không hợp lệ.');
    return{url:result.original,sources:result};
  }
  for(const item of draft.items){const result=await image(item.imageUrl,item.imageSources);item.imageUrl=result.url;item.imageSources=result.sources;}
  for(const cat of draft.categories){const result=await image(cat.imageUrl,cat.imageSources);cat.imageUrl=result.url;cat.imageSources=result.sources;}
  const cover=await image(draft.shop.coverUrl,draft.shop.coverSources);draft.shop.coverUrl=cover.url;draft.shop.coverSources=cover.sources;
  const logo=await image(draft.shop.logoUrl,draft.shop.logoSources);draft.shop.logoUrl=logo.url;draft.shop.logoSources=logo.sources;
  if(draft.shop.headerBackground){const bg=draft.shop.headerBackground,result=await image(bg.imageUrl,bg.imageSources);bg.imageUrl=result.url;bg.imageSources=result.sources;}
  // Directory is an allowlisted small summary: its image is already a thumbnail URL, not a new schema field.
  const discovery=await image(draft.shop.discoveryImageUrl);draft.shop.discoveryImageUrl=discovery.sources?.thumbnail || discovery.url;
  if(!draft.shop.discoveryImageUrl){const src=draft.shop.coverSources||draft.shop.headerBackground?.imageSources||draft.shop.logoSources;if(src)draft.shop.discoveryImageUrl=src.thumbnail;}
  return sanitizeShopData(draft);
}
export function draftSignature(draft:ShopData):string {
  const sort=(v:any):any=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;
  return JSON.stringify(sort(draft));
}
export function assertDraftBudget(draft:ShopData) {
  if(new TextEncoder().encode(JSON.stringify(draft)).length>750*1024)throw new Error('Bản nháp quá lớn để lưu an toàn. Bật kho ảnh tối ưu hoặc giảm dung lượng ảnh; nháp trên thiết bị được giữ lại.');
}
