import type { MenuImageSources } from '../types/menu';
export function menuImageSource(url:string|undefined,sources:MenuImageSources|undefined,size:'thumbnail'|'card'|'detail') {
  return sources && sources.original===url && /^https:\/\//.test(sources[size]) ? sources[size] : url;
}
