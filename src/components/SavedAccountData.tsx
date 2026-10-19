"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Trip } from "@/lib/types";
import { useApp } from "./AppProvider";
type CloudTrip={id:string;title:string;trip:Trip;updatedAt:string};
export default function SavedAccountData(){
  const {trips,saveTrip,destinations}=useApp();
  const [signedIn,setSignedIn]=useState(false),[cloud,setCloud]=useState<CloudTrip[]>([]),[favorites,setFavorites]=useState<string[]>([]),[message,setMessage]=useState("");
  async function refresh(){const [a,b]=await Promise.all([fetch("/api/me/trips",{cache:"no-store"}).then(r=>r.json()),fetch("/api/me/favorites",{cache:"no-store"}).then(r=>r.json())]);setCloud(a.trips||[]);setFavorites(b.favorites||[]);}
  useEffect(()=>{fetch("/api/auth/me",{cache:"no-store"}).then(r=>r.json()).then(data=>{if(data.user){setSignedIn(true);void refresh();}}).catch(()=>{});},[]);
  async function upload(trip:Trip){const response=await fetch(`/api/me/trips/${trip.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(trip)});const data=await response.json();setMessage(response.ok?"Đã lưu lịch trình vào tài khoản.":data.error||"Không lưu được.");if(response.ok)void refresh();}
  async function remove(id:string){if(!confirm("Xóa bản lưu trên tài khoản? Bản trên thiết bị không bị xóa."))return;const response=await fetch(`/api/me/trips/${id}`,{method:"DELETE"});setMessage(response.ok?"Đã xóa bản lưu trên tài khoản.":"Không xóa được.");if(response.ok)void refresh();}
  return <section className="content-card account-data"><span className="section-kicker">ĐỒNG BỘ TÀI KHOẢN</span><h2>Lịch trình và yêu thích</h2>{!signedIn?<p><Link href="/account" className="text-link">Đăng nhập để lưu dữ liệu trên tài khoản</Link></p>:<><p className="muted">Lịch trình trên thiết bị vẫn hoạt động ngoại tuyến. Chọn “Lưu lên tài khoản” để có bản sao trên database.</p><h3>Trên thiết bị</h3>{trips.length?trips.map(trip=><div className="saved-trip" key={trip.id}><strong>{trip.title}</strong><button className="button button-outline" onClick={()=>void upload(trip)}>Lưu lên tài khoản</button></div>):<p className="muted">Chưa có lịch trình trên thiết bị.</p>}<h3>Trên tài khoản</h3>{cloud.length?cloud.map(item=><div className="saved-trip" key={item.id}><strong>{item.title}</strong><button className="button button-outline" onClick={()=>{saveTrip(item.trip);setMessage("Đã mở lịch trình trên thiết bị.");}}>Mở</button><button className="button button-outline" onClick={()=>void remove(item.id)}>Xóa bản lưu</button></div>):<p className="muted">Chưa có lịch trình trên tài khoản.</p>}<h3>Địa điểm yêu thích</h3>{favorites.length?favorites.map(id=>{const place=destinations.find(d=>d.id===id);return place?<p key={id}><Link className="text-link" href={`/destinations/${place.slug}`}>{place.name}</Link></p>:null;}):<p className="muted">Chưa có địa điểm yêu thích.</p>}{message&&<p role="status" className="inline-message">{message}</p>}</>}</section>;
}
