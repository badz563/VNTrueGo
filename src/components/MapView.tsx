"use client";
import { useEffect, useRef, useState } from "react";
import type { Destination } from "@/lib/types";
import { Expand, X } from "lucide-react";
export default function MapView({ points, height = 300 }: { points: Destination[]; height?: number }) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const [full,setFull] = useState(false);
  useEffect(() => {
    if (!holder.current || !points.length) return;
    let cancelled = false;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    import("leaflet").then(L => {
      if (cancelled || !holder.current) return;
      const map = L.map(holder.current,{scrollWheelZoom:false,zoomControl:true});
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom:19
      }).addTo(map);
      const coords = points.map(p => [p.lat,p.lng] as [number,number]);
      const icon = L.divIcon({className:"map-pin",html:'<span></span>',iconSize:[20,20]});
      points.forEach(p => L.marker([p.lat,p.lng],{icon}).addTo(map).bindPopup(p.name));
      if (coords.length > 1) L.polyline(coords,{color:"#245c4f",weight:4,dashArray:"7 8"}).addTo(map);
      map.fitBounds(L.latLngBounds(coords).pad(0.25),{maxZoom:14});
      resizeTimer = setTimeout(() => { if (!cancelled && mapRef.current === map) map.invalidateSize(); },100);
    });
    return () => { cancelled=true; clearTimeout(resizeTimer); mapRef.current?.remove(); mapRef.current=null; };
  },[points]);
  useEffect(() => { const timer=setTimeout(() => mapRef.current?.invalidateSize(),100); return () => clearTimeout(timer); },[full]);
  if (!points.length) return <div className="map-empty">Chưa có địa điểm để hiển thị bản đồ.</div>;
  return <div className={full ? "map-wrap map-full" : "map-wrap"} style={{height:full ? undefined : height}}>
    <div ref={holder} className="map-canvas" aria-label="Bản đồ các điểm tham quan" />
    <button className="map-expand icon-btn" onClick={() => setFull(!full)} aria-label={full ? "Thu nhỏ bản đồ" : "Xem bản đồ toàn màn hình"}>{full ? <X size={20}/> : <Expand size={20}/>}</button>
    {points.length > 1 && <div className="map-note">Đường nối minh họa · thời gian di chuyển ước tính</div>}
  </div>;
}

