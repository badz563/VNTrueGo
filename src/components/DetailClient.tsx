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
import ReviewSection from "./ReviewSection";
import FavoriteButton from "./FavoriteButton";
import { googleMapsPlaceUrl, googleTranslateUrl } from "@/lib/externalLinks";
import { photoAlt } from "@/lib/photo";
const MapView=dynamic(()=>import("./MapView"),{ssr:false,loading:()=> <div className="map-empty skeleton"/>});
export default function DetailClient({initial}:{initial:Destination}){
  const {destinations,checkedAt,lang,addToTrip}=useApp();
  const [detail,setDetail]=useState(initial);const [feedback,setFeedback]=useState("");const [sent,setSent]=useState("");const [sending,setSending]=useState(false);
  const [addResult,setAddResult]=useState<"added"|"exists"|"unavailable"|null>(null);
  useEffect(()=>{fetch(`/api/destinations/${initial.slug}`,{cache:"no-store"}).then(r=>r.json()).then(data=>{if(data.destination)setDetail(data.destination);}).catch(()=>{});},[initial.slug,checkedAt]);
  const destination=detail;
  const recent=destination.statusUpdatedAt&&checkedAt&&new Date(checkedAt).getTime()-new Date(destination.statusUpdatedAt).getTime()<24*60*60*1000;
  const recentCrowd=destination.crowdUpdatedAt&&checkedAt&&new Date(checkedAt).getTime()-new Date(destination.crowdUpdatedAt).getTime()<24*60*60*1000;
  const status=recent?statusText(lang,destination.status):t(lang,"noFresh");
  const sourceLabel=destination.statusSource==="partner"?(lang==="vi"?"Tài khoản đối tác":"Partner account"):
    destination.statusSource==="partner-demo"?(lang==="vi"?"Trang quản lý thử nghiệm":"Test management page"):
    destination.statusSource==="visitor-simulation"?(lang==="vi"?"Tình huống trên thiết bị":"On-device scenario"):
    lang==="vi"?"Dữ liệu ban đầu":"Initial data";
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
    <div className="detail-hero"><div className="detail-image"><Image src={destination.image} alt={photoAlt(destination, lang)} fill loading="eager" fetchPriority="high" sizes="(max-width: 900px) 100vw, 70vw"/><span>{destination.photoCredit ? <>{destination.photoCredit.isActualPlace?(lang==="vi"?"Ảnh chụp địa điểm":"Place photograph"):(lang==="vi"?"Ảnh chụp món ăn":"Food photograph")} · <Link href={`/photo-credits#${destination.id}`}>{lang==="vi"?"Nguồn ảnh":"Photo credit"}</Link></> : (lang==="vi"?"Ảnh do đối tác cung cấp":"Partner-provided photo")}</span></div>
      <div className="detail-intro"><span className="section-kicker">{categoryText(lang,destination.category)}</span><h1>{lang==="en"&&destination.nameEn?destination.nameEn:destination.name}</h1><p><MapPin size={17}/>{destination.address}</p><div className="detail-status"><span className={destination.status==="closed"&&recent?"status-chip closed":"status-chip"}>{status}</span><small>{recent?destination.statusSource==="partner-demo"?(lang==="vi"?"Cập nhật từ trang quản lý":"Management update"):(lang==="vi"?"Cập nhật từ tài khoản đối tác":"Partner account update"):lang==="vi"?"Chưa có báo cáo đáng tin cậy gần đây":"No recent reliable report"}</small></div>{destination.category!=="Khách sạn"&&<button className="button" disabled={destination.status==="closed"||destination.status==="overloaded"} onClick={()=>setAddResult(addToTrip(destination))}><Plus size={18}/>{destination.status==="closed"||destination.status==="overloaded"?(lang==="vi"?"Hiện không thể thêm":"Currently unavailable"):addResult==="exists"?(lang==="vi"?"Đã có trong lịch trình":"Already in itinerary"):addResult==="added"?(lang==="vi"?"Đã thêm vào lịch trình":"Added to itinerary"):t(lang,"add")}</button>}{destination.category!=="Khách sạn"&&addResult&&addResult!=="unavailable"&&<Link href="/trip" className="detail-trip-link">{lang==="vi"?"Xem lịch trình":"View itinerary"}<ArrowRight size={15}/></Link>}</div>
    </div>
    <div className="detail-layout"><div className="detail-main">
      <section className="content-card"><span className="section-kicker">{lang==="vi"?"GIỚI THIỆU":"ABOUT"}</span><h2>{lang==="vi"?"Một điểm dừng đáng khám phá":"A place to explore"}</h2><p>{lang==="en"&&destination.descriptionEn?destination.descriptionEn:destination.description}</p><p><a className="text-link" href={googleTranslateUrl(lang==="en"&&destination.descriptionEn?destination.descriptionEn:destination.description,lang==="en"?"en-vi":"vi-en")} target="_blank" rel="noopener noreferrer">Dịch nhanh với Google Translate <ExternalLink size={14}/></a></p>{destination.sourceUrl&&<p><a className="text-link" href={destination.sourceUrl} target="_blank" rel="noopener noreferrer">{lang==="vi"?"Nguồn thông tin địa điểm":"Place information source"} <ExternalLink size={14}/></a></p>}<div className="notice-box"><Info size={19}/><span>{lang==="vi"?"Giờ mở cửa, chi phí và vị trí ghim chưa được xác minh. Hãy kiểm tra nguồn thông tin trước khi đi; ảnh món ăn có thể không chụp tại cơ sở.":"Hours, costs and map pins are unverified. Check the source before visiting; food photographs may not show the listed business."}</span></div></section>
      <section className="content-card"><span className="section-kicker">{lang==="vi"?"THÔNG TIN ĐỊA ĐIỂM":"PLACE INFORMATION"}</span><h2>{lang==="vi"?"Lên kế hoạch ghé thăm":"Plan your visit"}</h2><div className="fact-grid">
        <div><Clock3/><span>{lang==="vi"?"Giờ mở cửa dự kiến":"Expected opening hours"}</span><strong>{destination.category==="Khách sạn"?(lang==="vi"?"Xem nguồn chính thức":"See official site"):`${destination.opening.open} – ${destination.opening.close}`}</strong></div>
        <div><Ticket/><span>{lang==="vi"?"Chi phí dự kiến":"Estimated cost"}</span><strong>{destination.category==="Khách sạn"?(lang==="vi"?"Giá thay đổi theo ngày":"Rates vary by date"):`${destination.price.toLocaleString("vi-VN")} ₫`}</strong></div>
        <div><CalendarClock/><span>{lang==="vi"?"Thời gian gợi ý":"Suggested duration"}</span><strong>{destination.duration} {lang==="vi"?"phút":"min"}</strong></div>
        <div><UsersRound/><span>{lang==="vi"?"Mức đông":"Crowd level"}</span><strong>{recentCrowd&&destination.crowd!=="unknown"?t(lang,destination.crowd):t(lang,"noFresh")}</strong></div>
      </div><p className="muted small">{lang==="vi"?"Ngày nghỉ và dự báo theo giờ: chưa có dữ liệu xác minh.":"Closure days and hourly forecasts: no verified data available."}</p></section>
      <section className="content-card"><span className="section-kicker">{lang==="vi"?"VỊ TRÍ":"LOCATION"}</span><h2>{lang==="vi"?"Trên bản đồ":"On the map"}</h2><MapView points={[destination]}/><p className="muted small">{lang==="vi"?"Ghim vị trí gần đúng; kiểm tra địa chỉ trước khi đi.":"Approximate map pin; verify the address before visiting."} <a href={googleMapsPlaceUrl(destination)} target="_blank" rel="noopener noreferrer">Google Maps <ExternalLink size={13}/></a></p></section>
      <section className="content-card"><span className="section-kicker">{lang==="vi"?"CẬP NHẬT & TRẢI NGHIỆM":"UPDATES & EXPERIENCES"}</span><h2>{lang==="vi"?"Thông báo từ đơn vị quản lý":"Partner announcements"}</h2>{detail.announcements?.length?detail.announcements.map(a=><div className="announcement" key={a.id}><strong>{a.message}</strong><small>{new Date(a.createdAt).toLocaleString(lang==="vi"?"vi-VN":"en-US")} · {a.source==="partner-demo"?"thử nghiệm":"đối tác"}</small></div>):<p className="muted">{t(lang,"noFresh")}</p>}
        <form onSubmit={submitFeedback} className="feedback-form"><label htmlFor="feedback">{lang==="vi"?"Báo thông tin cần kiểm tra":"Report information to check"}</label><textarea id="feedback" value={feedback} onChange={e=>setFeedback(e.target.value)} minLength={10} maxLength={500} required placeholder={lang==="vi"?"Mô tả thông tin chưa chính xác...":"Describe a possible inaccuracy..."}/><button className="button button-outline" disabled={sending}><Send size={16}/>{lang==="vi"?"Gửi phản hồi":"Send feedback"}</button>{sent&&<p role="status" className="muted">{sent}</p>}</form>
      </section>
      <section className="content-card"><h2>Lưu điểm đến</h2><FavoriteButton destinationId={destination.id}/></section>
      <ReviewSection destination={destination} onChanged={async()=>{const result=await fetch(`/api/destinations/${initial.slug}`,{cache:"no-store"}).then(r=>r.json());if(result.destination)setDetail(result.destination);}}/>
      <section className="content-card"><span className="section-kicker">THÔNG TIN THEO THỜI GIAN</span><h2>Sự kiện và mùa vụ</h2>{destination.events?.length?destination.events.map(event=><div className="review-item" key={event.id}><h3>{event.title}</h3><p>{event.description}</p><small>{new Date(event.startsAt).toLocaleString("vi-VN")} → {new Date(event.endsAt).toLocaleString("vi-VN")}{event.ticketPrice!==null?` · Giá tham khảo ${event.ticketPrice.toLocaleString("vi-VN")} ₫`:""}</small></div>):<p className="muted">Chưa có sự kiện sắp tới được đối tác đăng.</p>}{destination.seasons?.map(item=><div className="review-item" key={item.id}><h3>{item.title}</h3><p>{item.body}</p><small>Nguồn: {item.source} · cập nhật {new Date(item.updatedAt).toLocaleDateString("vi-VN")}</small></div>)}</section>
      <section className="content-card"><span className="section-kicker">ĐỐI TÁC</span><h2>Ưu đãi đang áp dụng</h2>{destination.offers?.length?destination.offers.map(offer=><div className="review-item" key={offer.id}><h3>{offer.title}</h3><p>{offer.terms}</p>{offer.promoCode&&<p>Mã ưu đãi: <strong>{offer.promoCode}</strong></p>}<small>Đến {new Date(offer.endsAt).toLocaleDateString("vi-VN")} · Nội dung từ đối tác</small>{offer.bookingUrl&&<p><a className="text-link" href={offer.bookingUrl} target="_blank" rel="noopener noreferrer">Mở trang đặt dịch vụ <ExternalLink size={14}/></a></p>}</div>):<p className="muted">Hiện chưa có ưu đãi được đăng.</p>}</section>
    </div><aside className="detail-side"><div className="source-card"><ShieldCheck size={22}/><h3>{lang==="vi"?"Minh bạch dữ liệu":"Data transparency"}</h3><p>{lang==="vi"?"Trạng thái có ghi thời điểm cập nhật. Giá, giờ và mức đông chưa được xác minh.":"Status updates are timestamped. Prices, hours and crowd levels are unverified."}</p><dl><dt>{lang==="vi"?"Nguồn trạng thái":"Status source"}</dt><dd>{sourceLabel}</dd><dt>{lang==="vi"?"Cập nhật":"Updated"}</dt><dd>{destination.statusUpdatedAt?new Date(destination.statusUpdatedAt).toLocaleString(lang==="vi"?"vi-VN":"en-US"):t(lang,"noFresh")}</dd></dl></div></aside></div>
    {similar.length>0&&<section className="section-block similar-section"><div className="section-heading"><div><span className="section-kicker">{lang==="vi"?"TIẾP TỤC HÀNH TRÌNH":"KEEP EXPLORING"}</span><h2>{lang==="vi"?"Có thể bạn sẽ thích":"You may also like"}</h2></div><Link href="/" className="text-link">{t(lang,"seeAll")}<ArrowRight size={17}/></Link></div><div className="card-grid">{similar.map(d=><DestinationCard key={d.id} destination={d} compact/>)}</div></section>}
  </div>;
}

