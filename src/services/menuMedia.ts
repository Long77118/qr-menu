import { getStorage, ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { getApp } from 'firebase/app';
import type { MenuImageSources, ShopData } from '../types/menu';
import { auth } from './firebase';
import { externalizeMenuImages, inlineMenuImage } from './menuMediaCore';

export const optimizedMediaEnabled=import.meta.env.VITE_MENU_MEDIA_STORAGE==='true';
const jobs=new Map<string,Promise<MenuImageSources>>();
const profiles=[{name:'thumbnail',max:360,bytes:48*1024},{name:'card',max:800,bytes:110*1024},{name:'detail',max:1400,bytes:240*1024}] as const;
const algorithm='v1';
function assertOwner(uid:string){if(auth.currentUser?.uid!==uid)throw new Error('Phiên đăng nhập đã thay đổi. Ảnh chưa được gắn vào bản nháp cloud.');}
async function resized(image:HTMLImageElement,max:number,budget:number) {
  let scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
  for(let pass=0;pass<5;pass++){
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Không xử lý được ảnh trên thiết bị này.');ctx.drawImage(image,0,0,canvas.width,canvas.height);
    for(const quality of [.82,.7,.58,.46]){
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error('Không tạo được ảnh.')),'image/webp',quality));
      if(blob.size<=budget && ['image/webp','image/png','image/jpeg'].includes(blob.type))return blob;
    }
    scale*=.78;
  }
  throw new Error('Ảnh quá phức tạp để tối ưu. Hãy chọn ảnh nhẹ hơn.');
}
async function upload(source:string,uid:string):Promise<MenuImageSources>{
  if(!inlineMenuImage(source)||source.length>8*1024*1024)throw new Error('Ảnh không hợp lệ hoặc quá 5 MB.');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const key=`${uid}:${algorithm}:${digest}`;const existing=jobs.get(key);if(existing)return existing;
  const task=(async()=>{
    assertOwner(uid);
    const image=new Image();image.decoding='async';image.src=source;await image.decode();
    if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>40_000_000)throw new Error('Ảnh vượt quá kích thước xử lý.');
    const storage=getStorage(getApp());const urls={} as Record<typeof profiles[number]['name'],string>;
    const encodedVariants=new Map<string,string>();
    for(const profile of profiles){
      assertOwner(uid);const blob=await resized(image,profile.max,profile.bytes);
      const encodedHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
      const reused=encodedVariants.get(encodedHash);if(reused){urls[profile.name]=reused;continue;}
      const extension=blob.type==='image/webp'?'webp':blob.type==='image/png'?'png':'jpg';
      const target=ref(storage,`menu-media/${uid}/${algorithm}/${digest}/${profile.name}.${extension}`);
      try{urls[profile.name]=await getDownloadURL(target);}
      catch(error){
        if((error as {code?:string}).code!=='storage/object-not-found')throw error;
        assertOwner(uid);
        try{await uploadBytes(target,blob,{contentType:blob.type,cacheControl:'public,max-age=31536000,immutable',customMetadata:{ownerId:uid,algorithm}});}
        catch(uploadError){
          // Another tab may have created this same immutable object after our lookup.
          try{urls[profile.name]=await getDownloadURL(target);encodedVariants.set(encodedHash,urls[profile.name]);continue;}catch{throw uploadError;}
        }
        assertOwner(uid);urls[profile.name]=await getDownloadURL(target);
      }
      encodedVariants.set(encodedHash,urls[profile.name]);
    }
    assertOwner(uid);return{...urls,original:urls.detail};
  })();
  jobs.set(key,task);task.catch(()=>jobs.delete(key));
  // Bound memory; a later retry still reuses content-addressed objects in Storage.
  if(jobs.size>80)jobs.delete(jobs.keys().next().value!);
  return task;
}
export async function prepareMenuMedia(draft:ShopData,uid:string) {
  if(!optimizedMediaEnabled)return draft;
  try{return await externalizeMenuImages(draft,uid,upload);}
  catch(error){throw new Error('Chưa chuyển được ảnh sang kho lưu trữ. '+(error instanceof Error?error.message:'Kiểm tra kết nối và quyền Storage.'));}
}
