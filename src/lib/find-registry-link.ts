/** Parse a registry address without sending users to a different website. */
export function findRegistryDestination(input:string,origin:string):string|null {
  const value=input.trim();if(!value||value.length>2048)return null;
  if(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value)&&value.length<=128)return `/r/${value}`;
  try {
    const url=new URL(value,origin);if(url.origin!==origin||url.username||url.password)return null;
    const match=url.pathname.match(/^\/(?:ht\/|fr\/|en\/)?r\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/i);
    if(!match||match[1].length>128)return null;
    const share=url.searchParams.get('share');
    if(share!==null&&!/^[A-Za-z0-9_-]{1,128}$/.test(share))return null;
    return `/r/${match[1]}${share?`?share=${encodeURIComponent(share)}`:''}`;
  } catch {return null;}
}
