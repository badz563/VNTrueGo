"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronRight, Compass, MapPin, Search, Sparkles, SlidersHorizontal, X } from "lucide-react";
import { useApp } from "./AppProvider";
import DestinationCard from "./DestinationCard";
import { categoryText, interestText, t } from "@/lib/i18n";
const categories=["Tất cả","Bảo tàng","Di tích lịch sử","Di sản văn hóa","Công trình kiến trúc","Danh lam thắng cảnh","Quán ăn","Cà phê","Nhà hàng","Khách sạn"];
const interests=["lịch sử","văn hóa","nghệ thuật","thiên nhiên","nhiếp ảnh","yên tĩnh","ẩm thực"];
export default function HomeClient(){
  const {destinations,loading,error,refresh,lang,activeTrip,preferences,checkedAt}=useApp();
  const [query,setQuery]=useState("");const [category,setCategory]=useState("Tất cả");const [interest,setInterest]=useState("");const [filters,setFilters]=useState(false);const [maxPrice,setMaxPrice]=useState(0);const [sort,setSort]=useState<"relevance"|"rating"|"price">("relevance");const [visibleCount,setVisibleCount]=useState(12);
  const [content,setContent]=useState<{events:{id:string;title:string;startsAt:string;destinationName:string;slug:string}[];offers:{id:string;title:string;endsAt:string;destinationName:string;slug:string}[]}>({events:[],offers:[]});
  useEffect(()=>{fetch("/api/content",{cache:"no-store"}).then(r=>r.json()).then(data=>setContent({events:data.events||[],offers:data.offers||[]})).catch(()=>{});},[]);
  const filtered=useMemo(()=>destinations.filter(d=>(category==="Tất cả"||d.category===category)&&(!interest||d.tags.includes(interest))&&(!maxPrice||d.price<=maxPrice)&&
    (!query||[d.name,d.nameEn||"",d.address,...d.tags].join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase())))
    .sort((a,b)=>sort==="rating"?(b.rating??-1)-(a.rating??-1)||(b.ratingCount||0)-(a.ratingCount||0):sort==="price"?a.price-b.price:0),[destinations,category,interest,query,maxPrice,sort]);
  const active=destinations.filter(d=>d.status==="normal"&&["partner-demo","partner"].includes(d.statusSource)&&d.statusUpdatedAt&&checkedAt&&new Date(checkedAt).getTime()-new Date(d.statusUpdatedAt).getTime()<24*60*60*1000);
  const featured=destinations.slice(0,4);
  const preferredTags=preferences.length?preferences:activeTrip?.input.interests||[];
  const suggested=preferredTags.length?destinations.filter(d=>d.status!=="closed"&&d.status!=="overloaded"&&preferredTags.some(tag=>d.tags.includes(tag))).slice(0,4):[];
  return <div className="home-page">
    <section className="hero container">
      <Image src="/images/hero.webp" alt="Ảnh minh họa Hồ Hoàn Kiếm lúc bình minh" fill loading="eager" fetchPriority="high" sizes="(max-width: 800px) 100vw, 1200px" className="hero-image"/>
      <div className="hero-shade"/>
      <div className="hero-content">
        <div className="eyebrow"><span className="eyebrow-line"/>{t(lang,"heroEyebrow")}</div>
        <h1>{t(lang,"heroTitle")}</h1>
        <p>{t(lang,"heroBody")}</p>
        <Link href="/trip" className="button button-light"><Sparkles size={18}/>{t(lang,"create")}<ArrowRight size={18}/></Link>
      </div>
      <span className="hero-caption">{lang==="vi"?"Hà Nội · Ảnh minh họa tạo bởi AI":"Hanoi · AI-generated illustration"}</span>
    </section>
    <div className="container search-section">
      <div className="search-box"><Search size={21}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t(lang,"search")} aria-label={t(lang,"search")}/>
        {query&&<button className="clear-search" onClick={()=>setQuery("")} aria-label="Xóa tìm kiếm"><X size={18}/></button>}
        <button className={filters?"filter-button active":"filter-button"} onClick={()=>setFilters(!filters)} aria-label="Bộ lọc"><SlidersHorizontal size={19}/><span>{lang==="vi"?"Bộ lọc":"Filters"}</span></button>
      </div>
      {filters&&<div className="filter-panel"><strong>{lang==="vi"?"Sở thích":"Interests"}</strong><div className="chip-row">{interests.map(item=><button key={item} className={interest===item?"filter-chip selected":"filter-chip"} onClick={()=>{setInterest(interest===item?"":item);setVisibleCount(12);}}>{interestText(lang,item)}</button>)}</div><div className="filter-selects"><label>Giá minh họa tối đa<select value={maxPrice} onChange={e=>{setMaxPrice(Number(e.target.value));setVisibleCount(12);}}><option value={0}>Tất cả</option><option value={50000}>50.000 ₫</option><option value={100000}>100.000 ₫</option><option value={200000}>200.000 ₫</option></select></label><label>Sắp xếp<select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="relevance">Mặc định</option><option value="rating">Đánh giá đã duyệt</option><option value="price">Giá minh họa thấp trước</option></select></label></div></div>}
    </div>
    <section className="container intro-strip" aria-label="Giá trị TrueGo"><div><Compass size={21}/><span>{lang==="vi"?"Khám phá theo sở thích":"Explore your interests"}</span></div><div><CheckCircle2 size={21}/><span>{lang==="vi"?"Thông tin có nguồn rõ ràng":"Clearly labeled data"}</span></div><div><MapPin size={21}/><span>{lang==="vi"?"Điều chỉnh khi kế hoạch thay đổi":"Adapt when plans change"}</span></div></section>
    <section className="container section-block">
      <div className="section-heading"><div><span className="section-kicker">{lang==="vi"?"BẮT ĐẦU HÀNH TRÌNH":"START EXPLORING"}</span><h2>{t(lang,"featured")}</h2><p>{lang==="vi"?"Những điểm đến gợi mở một Hà Nội nhiều lớp văn hóa.":"Places that reveal the many layers of Hanoi."}</p></div><a href="#all-places" className="text-link">{t(lang,"seeAll")}<ChevronRight size={17}/></a></div>
      {loading?<div className="card-grid">{[1,2,3,4].map(i=><div key={i} className="skeleton-card skeleton"/>)}</div>:error?<div className="empty-state"><p>{error}</p><button className="button" onClick={()=>void refresh()}>{t(lang,"tryAgain")}</button></div>:<div className="card-grid">{featured.map((d,index)=><DestinationCard key={d.id} destination={d} eager={index<2}/>)}</div>}
    </section>
    <section className="container planner-banner"><div className="banner-orbit"><Sparkles size={30}/></div><div><span className="section-kicker">{lang==="vi"?"HÀNH TRÌNH THÔNG MINH":"SMARTER JOURNEYS"}</span><h2>{lang==="vi"?"Mỗi chuyến đi, một câu chuyện riêng.":"Every trip has its own story."}</h2><p>{lang==="vi"?"Chọn ngày, sở thích và nhịp độ. TrueGo sẽ sắp xếp một lịch trình có thể thay đổi cùng bạn.":"Choose your dates, interests and pace. TrueGo builds a plan that can adapt with you."}</p></div><Link href="/trip" className="button button-cream"><Sparkles size={17}/>{t(lang,"create")}<ArrowRight size={17}/></Link></section>
    {(content.events.length>0||content.offers.length>0)&&<section className="container section-block"><div className="section-heading"><div><span className="section-kicker">TỪ ĐỐI TÁC</span><h2>Sự kiện và ưu đãi</h2><p>Nội dung do tài khoản đối tác được phân quyền đăng.</p></div></div><div className="card-grid">{content.events.map(item=><Link className="content-card" href={`/destinations/${item.slug}`} key={item.id}><span className="section-kicker">SỰ KIỆN</span><h3>{item.title}</h3><p>{item.destinationName}</p><small>{new Date(item.startsAt).toLocaleDateString("vi-VN")}</small></Link>)}{content.offers.map(item=><Link className="content-card" href={`/destinations/${item.slug}`} key={item.id}><span className="section-kicker">ƯU ĐÃI</span><h3>{item.title}</h3><p>{item.destinationName}</p><small>Đến {new Date(item.endsAt).toLocaleDateString("vi-VN")}</small></Link>)}</div></section>}
    {active.length>0&&<section className="container section-block"><div className="section-heading"><div><span className="section-kicker">{lang==="vi"?"CẬP NHẬT TỪ ĐỐI TÁC DEMO":"PARTNER DEMO UPDATES"}</span><h2>{lang==="vi"?"Đã báo hoạt động":"Reported open"}</h2><p>{lang==="vi"?"Trạng thái thử nghiệm, hãy kiểm tra nguồn chính thức trước khi đi.":"Demo status reports; verify official sources before visiting."}</p></div></div><div className="card-grid">{active.slice(0,4).map(d=><DestinationCard key={d.id} destination={d}/>)}</div></section>}
    {suggested.length>0&&<section className="container section-block"><div className="section-heading"><div><span className="section-kicker">{lang==="vi"?"THEO SỞ THÍCH CỦA BẠN":"BASED ON YOUR INTERESTS"}</span><h2>{lang==="vi"?"Dành cho bạn":"Picked for you"}</h2><p>{lang==="vi"?"Gợi ý theo sở thích bạn đã chọn.":"Suggestions matching your selected interests."}</p></div></div><div className="card-grid">{suggested.map(d=><DestinationCard key={d.id} destination={d}/>)}</div></section>}
    <section className="container section-block" id="all-places">
      <div className="section-heading"><div><span className="section-kicker">{lang==="vi"?`${destinations.length} ĐIỂM ĐẾN MINH HỌA`:`${destinations.length} DEMO PLACES`}</span><h2>{t(lang,"discover")}</h2><p>{active.length?lang==="vi"?`${active.length} địa điểm đã được đối tác demo báo hoạt động.`:`${active.length} places reported open in partner demo.`:lang==="vi"?"Chưa có địa điểm nào có trạng thái mới từ đối tác demo.":"No recent partner demo status reports yet."}</p></div></div>
      <div className="category-scroll" role="group" aria-label="Lọc theo loại hình">{categories.map(item=><button key={item} className={category===item?"category-pill active":"category-pill"} onClick={()=>setCategory(item)}>{item==="Tất cả"?t(lang,"all"):categoryText(lang,item)}</button>)}</div>
      {loading?<div className="card-grid">{[1,2,3,4].map(i=><div key={i} className="skeleton-card skeleton"/>)}</div>:filtered.length?<><div className="card-grid">{filtered.slice(0,visibleCount).map(d=><DestinationCard key={d.id} destination={d}/>)}</div>{filtered.length>visibleCount&&<button className="button button-outline load-more" onClick={()=>setVisibleCount(count=>count+12)}>Xem thêm {filtered.length-visibleCount} địa điểm</button>}</>:<div className="empty-state"><Search size={28}/><p>{t(lang,"noResults")}</p><button onClick={()=>{setQuery("");setCategory("Tất cả");setInterest("");setMaxPrice(0);}}>{lang==="vi"?"Xóa bộ lọc":"Clear filters"}</button></div>}
    </section>
    <footer className="container site-footer"><Image src="/brand-logo.png" alt="VietNam TrueGo - biểu tượng du lịch sinh thái Việt Nam" width={140} height={140} className="footer-logo"/><span>{lang==="vi"?"Bản demo · Kiểm tra thông tin chính thức trước khi đi.":"Demo · Verify official details before visiting."}</span><Link href="/partner-demo">Partner demo <ArrowRight size={14}/></Link></footer>
  </div>;
}

