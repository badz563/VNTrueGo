"use client";
import { useEffect, useRef, useState } from "react";
import type { Destination } from "@/lib/types";
import { Expand, X } from "lucide-react";

export default function MapView({ points, height = 300 }: { points: Destination[]; height?: number }) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [full,setFull] = useState(false);
  const [mapFailed,setMapFailed] = useState(false);

  useEffect(() => {
    if (!holder.current || !points.length) return;
    let cancelled = false;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    setMapFailed(false);
    import("maplibre-gl").then(({Map,Marker,Popup,NavigationControl,setWorkerUrl}) => {
      if (cancelled || !holder.current) return;
      setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs",import.meta.url).toString());
      const map = new Map({
        container:holder.current,
        style:"https://tiles.openfreemap.org/styles/liberty",
        center:[points[0].lng,points[0].lat],
        zoom:13,
        scrollZoom:false
      });
      mapRef.current = map;
      map.addControl(new NavigationControl({showCompass:false}),"top-left");
      points.forEach(point => {
        const pin = document.createElement("div");
        pin.className = "map-pin";
        new Marker({element:pin}).setLngLat([point.lng,point.lat]).setPopup(new Popup().setText(point.name)).addTo(map);
      });
      map.on("load",() => {
        if (cancelled) return;
        if (points.length > 1) {
          map.addSource("route",{type:"geojson",data:{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:points.map(point=>[point.lng,point.lat])}}});
          map.addLayer({id:"route",type:"line",source:"route",layout:{"line-join":"round","line-cap":"round"},paint:{"line-color":"#245c4f","line-width":4,"line-dasharray":[2,2]}});
          const lngs=points.map(point=>point.lng),lats=points.map(point=>point.lat);
          map.fitBounds([[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]],{padding:44,maxZoom:14,duration:0});
        }
      });
      map.on("idle",() => { clearTimeout(loadTimer); if (!cancelled) setMapFailed(false); });
      loadTimer=setTimeout(() => { if (!cancelled) setMapFailed(true); },12000);
    }).catch(() => { if (!cancelled) setMapFailed(true); });
    return () => { cancelled=true; clearTimeout(loadTimer); mapRef.current?.remove(); mapRef.current=null; };
  },[points]);

  useEffect(() => { const timer=setTimeout(() => mapRef.current?.resize(),100); return () => clearTimeout(timer); },[full]);
  if (!points.length) return <div className="map-empty">Chưa có địa điểm để hiển thị bản đồ.</div>;
  return <div className={full ? "map-wrap map-full" : "map-wrap"} style={{height:full ? undefined : height}}>
    <div ref={holder} className="map-canvas" aria-label="Bản đồ các địa điểm" />
    <button className="map-expand icon-btn" onClick={() => setFull(!full)} aria-label={full ? "Thu nhỏ bản đồ" : "Xem bản đồ toàn màn hình"}>{full ? <X size={20}/> : <Expand size={20}/>}</button>
    {mapFailed && <div className="map-fallback" role="status">Không tải được nền bản đồ trên mạng này. <a href={`https://www.google.com/maps/search/?api=1&query=${points[0].lat},${points[0].lng}`} target="_blank" rel="noreferrer">Mở vị trí trên Google Maps</a>.</div>}
  </div>;
}
