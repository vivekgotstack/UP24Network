import { cms, csrfHeaders, type Account } from '@/lib/cms';

export type MediaAsset={ id:string;url:string;name:string;bytes:number;originalBytes:number;width:number;height:number;createdAt:string };
export type MediaPage={ items:MediaAsset[];total:number;page:number;size:number;pages:number;storedBytes:number };
export async function uploadPhotograph(file:File):Promise<MediaAsset> {
  await cms<Account>('auth/me');
  const data=new FormData(); data.set('file',file);
  const response=await fetch('/api/media',{ method:'POST',headers:await csrfHeaders(),body:data,cache:'no-store' });
  const result=await response.json();
  if(!response.ok) throw new Error(result.detail ?? 'The image could not be uploaded.');
  return result;
}
