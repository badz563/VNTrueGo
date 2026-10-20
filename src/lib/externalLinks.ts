import type { Destination } from "./types";
export function googleMapsPlaceUrl(place:Pick<Destination,"lat"|"lng">){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.lat},${place.lng}`)}`;}
export function googleMapsNavigateUrl(place:Pick<Destination,"lat"|"lng">,transport:"walk"|"bike"|"car"="walk"){
  const travelmode=transport==="car"?"driving":transport==="bike"?"bicycling":"walking";
  return `https://www.google.com/maps/dir/?${new URLSearchParams({api:"1",destination:`${place.lat},${place.lng}`,travelmode}).toString()}`;
}
export function googleMapsDayRoutes(places:Pick<Destination,"lat"|"lng">[],transport:"walk"|"bike"|"car"="walk"){
  if(!places.length)return [];
  const mode=transport==="car"?"driving":transport==="bike"?"bicycling":"walking";
  const point=(place:Pick<Destination,"lat"|"lng">)=>`${place.lat},${place.lng}`;
  const routes:string[]=[];
  for(let start=0;start<places.length-(places.length>1?1:0);start+=8){
    const group=places.slice(start,start+9);
    if(group.length===1){routes.push(googleMapsPlaceUrl(group[0]));continue;}
    const params=new URLSearchParams({api:"1",origin:point(group[0]),destination:point(group[group.length-1]),travelmode:mode});
    if(group.length>2)params.set("waypoints",group.slice(1,-1).map(point).join("|"));
    routes.push(`https://www.google.com/maps/dir/?${params.toString()}`);
  }
  return routes;
}
export function googleTranslateUrl(text:string,direction:"vi-en"|"en-vi"){
  const [source,target]=direction.split("-");
  return `https://translate.google.com/?sl=${source}&tl=${target}&text=${encodeURIComponent(text)}&op=translate`;
}
