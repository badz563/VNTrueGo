"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarClock, Clock3, ExternalLink, Info, MapPin, Plus, Send, ShieldCheck, Ticket, UsersRound } from "lucide-react";
import type { Destination } from "@/lib/types";
import { useApp } from "./AppProvider";
import { categoryText, localizeError, statusText, t } from "@/lib/i18n";
import DestinationCard from "./DestinationCard";
const MapView=dynamic(()=>import("./MapView"),{ssr:false,loading:()=> <div className="map-empty skeleton"/>});
export default function DetailClient({initial}:{initial:Destination}){
  const {destinations,checkedAt,lang,addToTrip}=useApp();
  const [detail,setDetail]=useState(initial);const [feedback,setFeedback]=useState("");const [sent,setSent]=useState("");const [sending,setSending]=useState(false);
  const [addResult,setAddResult]=useState<"added"|"exists"|"unavailable"|null>(null);
  useEffect(()=>{fetch(`/api/destinations/${initial.slug}`,{cache:"no-store"}).then(r=>r.json()).then(data=>{if(data.destination)setDetail(data.destination);}).catch(()=>{});},[initial.slug,checkedAt]);
  const destination=destinations.find(d=>d.id===initial.id)||detail;
  const recent=destination.statusUpdatedAt&&Date.now()-new Date(destination.statusUpdatedAt).getTime()<24*60*60*1000;
  const recentCrowd=destination.crowdUpdatedAt&&Date.now()-new Date(destination.crowdUpdatedAt).getTime()<24*60*60*1000;
  const status=recent?statusText(lang,destination.status):t(lang,"noFresh");
  const similar=destinations.filter(d=>d.id!==destination.id&&d.category===destination.category).slice(0,3);
  async function submitFeedback(e:React.FormEvent){
    e.preventDefault();setSending(true);setSent("");
    try{const response=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({destinationId:destination.id,message:feedback})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Không gửi được phản hồi.");
      setFeedback("");setSent(lang==="vi"?"Đã ghi nhận phản hồi chưa xác minh.":"Unverified feedback saved.");
    }catch(error){setSent(localizeError(lang,error instanceof Error?error.message:"Error"));}finally{setSending(false);}
  }
  return <div className="detail-page container">
    <div className="breadcrumb"><Link href="/"><ArrowLeft size={16}/>{t(lang,"explore")}</Link><span>/</span><span>{lang==="en"&&destination.nameEn?destination.nameEn:destination.name}</span></div>
    <div className="detail-hero"><div className="detail-image"><Image src={destination.image} alt={`Ảnh minh họa ${destination.name}`} fill loading="eager" fetchPriority="high" sizes="(max-width: 900px) 100vw, 70vw"/><span>{lang==="vi"?"Ảnh minh họa tạo bởi AI":"AI-generated illustration"}</span></div>
      <div className="detail-intro"><span className="section-kicker">{categoryText(lang,destination.category)}</span><h1>{lang==="en"&&destination.nameEn?destination.nameEn:destination.name}</h1><p><MapPin size={17}/>{destination.address}</p><div className="detail-status"><span className={destination.status==="closed"&&recent?"status-chip closed":"status-chip"}>{status}</span><small>{recent?lang==="vi"?"Báo cáo từ dashboard demo":"Partner demo report":lang==="vi"?"Chưa có báo cáo đáng tin cậy gần đây":"No recent reliable report"}</small></div><button className="button" disabled={destination.status==="closed"||destination.status==="overloaded"} onClick={()=>setAddResult(addToTrip(destination))}><Plus size={18}/>{destination.status==="closed"||destination.status==="overloaded"?(lang==="vi"?"Hiện không thể thêm":"Currently unavailable"):addResult==="exists"?(lang==="vi"?"Đã có trong lịch trình":"Already in itinerary"):addResult==="added"?(lang==="vi"?"Đã thêm vào lịch trình":"Added to itinerary"):t(lang,"add")}</button>{addResult&&addResult!=="unavailable"&&<Link href="/trip" className="detail-trip-link">{lang==="vi"?"Xem lịch trình":"View itinerary"}<ArrowRight size={15}/></Link>}</div>
    </div>
    <div className="detail-layout"><div className="detail-main">
      <section className="content-card"><span className="section-kicker">{lang==="vi"?"GIỚI THIỆU":"ABOUT"}</span><h2>{lang==="vi"?"Một điểm dừng đáng khám phá":"A place to explore"}</h2><p>{lang==="en"&&destination.descriptionEn?destination.descriptionEn:destination.description}</p><div className="notice-box"><Info size={19}/><span>{lang==="vi"?"Thông tin giờ, giá, vị trí và ảnh ở đây là dữ liệu minh họa. Hãy xác nhận với nguồn chính thức trước chuyến đi.":"Hours, prices, location and imagery are illustrative. Confirm with official sources before travel."}</span></div></section>
      <section className="content-card"><span className="section-kicker">{lang==="vi"?"THÔNG TIN THAM QUAN":"VISIT INFORMATION"}</span><h2>{lang==="vi"?"Lên kế hoạch ghé thăm":"Plan your visit"}</h2><div className="fact-grid">
        <div><Clock3/><span>{lang==="vi"?"Giờ minh họa":"Illustrative hours"}</span><strong>{destination.opening.open} – {destination.opening.close}</strong></div>
        <div><Ticket/><span>{lang==="vi"?"Giá vé minh họa":"Illustrative price"}</span><strong>{destination.price.toLocaleString("vi-VN")} ₫</strong></div>
        <div><CalendarClock/><span>{lang==="vi"?"Thời gian gợi ý":"Suggested duration"}</span><strong>{destination.duration} {lang==="vi"?"phút":"min"}</strong></div>
        <div><UsersRound/><span>{lang==="vi"?"Mức đông":"Crowd level"}</span><strong>{recentCrowd&&destination.crowd!=="unknown"?t(lang,destination.crowd):t(lang,"noFresh")}</strong></div>
      </div><p className="muted small">{lang==="vi"?"Ngày nghỉ và dự báo theo giờ: chưa có dữ liệu xác minh.":"Closure days and hourly forecasts: no verified data available."}</p></section>
      <section className="content-card"><span className="section-kicker">{lang==="vi"?"VỊ TRÍ":"LOCATION"}</span><h2>{lang==="vi"?"Trên bản đồ":"On the map"}</h2><MapView points={[destination]}/><p className="muted small">{lang==="vi"?"Tọa độ gần đúng cho mục đích minh họa.":"Approximate coordinates for demo purposes."} <a href={`https://www.openstreetmap.org/?mlat=${destination.lat}&mlon=${destination.lng}#map=15/${destination.lat}/${destination.lng}`} target="_blank" rel="noreferrer">OpenStreetMap <ExternalLink size={13}/></a></p></section>
      <section className="content-card"><span className="section-kicker">{lang==="vi"?"CẬP NHẬT & TRẢI NGHIỆM":"UPDATES & EXPERIENCES"}</span><h2>{lang==="vi"?"Thông báo từ đơn vị quản lý":"Partner announcements"}</h2>{detail.announcements?.length?detail.announcements.map(a=><div className="announcement" key={a.id}><strong>{a.message}</strong><small>{new Date(a.createdAt).toLocaleString(lang==="vi"?"vi-VN":"en-US")} · partner demo</small></div>):<p className="muted">{t(lang,"noFresh")}</p>}
        <h3>{lang==="vi"?"Đánh giá trải nghiệm":"Experience reviews"}</h3>{detail.reviews?.length?detail.reviews.map(r=><p key={r.id}>{r.body} <small>· {r.verification}</small></p>):<p className="muted">{lang==="vi"?"Chưa có đánh giá đã xác minh.":"No verified reviews yet."}</p>}
        <form onSubmit={submitFeedback} className="feedback-form"><label htmlFor="feedback">{lang==="vi"?"Báo thông tin cần kiểm tra":"Report information to check"}</label><textarea id="feedback" value={feedback} onChange={e=>setFeedback(e.target.value)} minLength={10} maxLength={500} required placeholder={lang==="vi"?"Mô tả thông tin chưa chính xác...":"Describe a possible inaccuracy..."}/><button className="button button-outline" disabled={sending}><Send size={16}/>{lang==="vi"?"Gửi phản hồi":"Send feedback"}</button>{sent&&<p role="status" className="muted">{sent}</p>}</form>
      </section>
    </div><aside className="detail-side"><div className="source-card"><ShieldCheck size={22}/><h3>{lang==="vi"?"Minh bạch dữ liệu":"Data transparency"}</h3><p>{lang==="vi"?"Trạng thái từ đơn vị demo được ghi thời điểm cập nhật. Giá, giờ và mức đông chưa được xác minh.":"Partner demo status is timestamped. Prices, hours and crowd levels are unverified."}</p><dl><dt>{lang==="vi"?"Nguồn trạng thái":"Status source"}</dt><dd>{destination.statusSource}</dd><dt>{lang==="vi"?"Cập nhật":"Updated"}</dt><dd>{destination.statusUpdatedAt?new Date(destination.statusUpdatedAt).toLocaleString(lang==="vi"?"vi-VN":"en-US"):t(lang,"noFresh")}</dd></dl></div></aside></div>
    {similar.length>0&&<section className="section-block similar-section"><div className="section-heading"><div><span className="section-kicker">{lang==="vi"?"TIẾP TỤC HÀNH TRÌNH":"KEEP EXPLORING"}</span><h2>{lang==="vi"?"Có thể bạn sẽ thích":"You may also like"}</h2></div><Link href="/" className="text-link">{t(lang,"seeAll")}<ArrowRight size={17}/></Link></div><div className="card-grid">{similar.map(d=><DestinationCard key={d.id} destination={d} compact/>)}</div></section>}
  </div>;
}

