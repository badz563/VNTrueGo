const STATIC_CACHE="truego-static-v2";
const PAGE_CACHE="truego-pages-v2";
const STATIC=["/","/offline.html","/brand-logo.png","/images/hero.webp","/images/temple.webp","/images/bridge.webp","/images/museum.webp"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.addAll(STATIC)));self.skipWaiting();});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>![STATIC_CACHE,PAGE_CACHE].includes(key)).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith("/api/"))return;
  if(["/account","/admin","/partner","/profile"].some(path=>url.pathname===path||url.pathname.startsWith(`${path}/`)))return;
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(PAGE_CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(async()=>await caches.match(request)||await caches.match("/offline.html")));
    return;
  }
  if(url.pathname.startsWith("/images/")||url.pathname==="/brand-logo.png")event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(STATIC_CACHE).then(cache=>cache.put(request,copy));}return response;})));
});
