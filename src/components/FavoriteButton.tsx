"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
export default function FavoriteButton({destinationId}:{destinationId:string}){
  const [signedIn,setSignedIn]=useState(false),[favorite,setFavorite]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  useEffect(()=>{fetch("/api/auth/me",{cache:"no-store"}).then(r=>r.json()).then(async data=>{if(data.user){setSignedIn(true);const result=await fetch("/api/me/favorites",{cache:"no-store"}).then(r=>r.json());setFavorite((result.favorites||[]).includes(destinationId));}}).catch(()=>{});},[destinationId]);
  async function toggle(){setBusy(true);setMessage("");try{const response=await fetch(`/api/me/favorites/${destinationId}`,{method:favorite?"DELETE":"PUT"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Không thể lưu yêu thích.");setFavorite(data.favorite);}catch(error){setMessage(error instanceof Error?error.message:"Có lỗi xảy ra.");}finally{setBusy(false);}}
  return <span className="favorite-control">{signedIn?<button type="button" className="button button-outline" disabled={busy} onClick={toggle} aria-pressed={favorite}><Heart size={17} fill={favorite?"currentColor":"none"}/>{favorite?"Đã yêu thích":"Yêu thích"}</button>:<Link className="button button-outline" href="/account"><Heart size={17}/>Đăng nhập để lưu yêu thích</Link>}{message&&<small role="status">{message}</small>}</span>;
}
