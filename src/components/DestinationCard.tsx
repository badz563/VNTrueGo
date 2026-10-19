"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, MapPin, Plus } from "lucide-react";
import { useState } from "react";
import type { Destination } from "@/lib/types";
import { useApp } from "./AppProvider";
import { categoryText, statusText, t } from "@/lib/i18n";
import { RatingDisplay } from "./Rating";
export default function DestinationCard({destination,compact=false,eager=false}:{destination:Destination;compact?:boolean;eager?:boolean}) {
  const {lang,addToTrip,checkedAt}=useApp();
  const [addResult,setAddResult]=useState<"added"|"exists"|"unavailable"|null>(null);
  const recent=destination.statusUpdatedAt&&checkedAt&&new Date(checkedAt).getTime()-new Date(destination.statusUpdatedAt).getTime()<24*60*60*1000;
  function add(){setAddResult(addToTrip(destination));setTimeout(()=>setAddResult(null),2200);}
  return <article className={compact?"destination-card compact":"destination-card"}>
    <Link href={`/destinations/${destination.slug}`} className="card-image-link" aria-label={`${t(lang,"detail")}: ${destination.name}`}>
      <Image src={destination.image} alt={destination.category==="Khách sạn"?"Ảnh minh họa không gian khách sạn":destination.sourceUrl?"Ảnh minh họa ẩm thực Hà Nội":`Ảnh minh họa ${destination.name}`} fill loading={eager?"eager":"lazy"} sizes="(max-width: 650px) 85vw, (max-width: 1100px) 45vw, 310px" className="card-image" />
      <span className="image-label">{t(lang,"demo")}</span>
    </Link>
    <div className="card-content">
      <div className="card-topline"><span>{categoryText(lang,destination.category)}</span><span className={destination.status==="closed"&&recent?"status-chip closed":"status-chip"}>{recent?statusText(lang,destination.status):t(lang,"noFresh")}</span></div>
      <Link href={`/destinations/${destination.slug}`} className="card-title">{lang==="en"&&destination.nameEn?destination.nameEn:destination.name}</Link>
      <p className="card-location"><MapPin size={14}/>{destination.address}</p>
      {!!destination.ratingCount&&destination.rating!==null&&destination.rating!==undefined&&<p className="card-rating"><RatingDisplay value={destination.rating}/><strong>{destination.rating.toFixed(2)}</strong><small>({destination.ratingCount})</small></p>}
      <div className="card-footer"><span>{destination.category==="Khách sạn"?(lang==="vi"?"Giá phòng: xem nguồn chính thức":"Room rate: see official site"):destination.price===0?(lang==="vi"?"Giá minh họa: 0 ₫":"Demo price: 0 ₫"):`${t(lang,"estimated")} · ${destination.price.toLocaleString("vi-VN")} ₫`}</span>
        <div><Link className="card-arrow" href={`/destinations/${destination.slug}`} aria-label={t(lang,"detail")}><ArrowUpRight size={18}/></Link>
        {destination.category!=="Khách sạn"&&<button className="card-plus" disabled={destination.status==="closed"||destination.status==="overloaded"} onClick={add} aria-label={destination.status==="closed"||destination.status==="overloaded"?(lang==="vi"?"Hiện không thể thêm":"Currently unavailable"):addResult==="exists"?(lang==="vi"?"Đã có trong lịch trình":"Already in itinerary"):addResult==="added"?(lang==="vi"?"Đã thêm":"Added"):`${t(lang,"add")} ${destination.name}`}>{addResult?<Check size={18}/>:<Plus size={18}/>}</button>}</div>
      </div>
      {addResult&&<p className="card-add-note" role="status">{addResult==="exists"?(lang==="vi"?"Đã có trong lịch trình":"Already in itinerary"):(lang==="vi"?"Đã thêm vào lịch trình":"Added to itinerary")}</p>}
    </div>
  </article>;
}
