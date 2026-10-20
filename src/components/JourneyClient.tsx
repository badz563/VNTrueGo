"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock3, MapPin, Navigation, RotateCcw } from "lucide-react";
import type { Destination, Trip } from "@/lib/types";
import { journeyDay, markJourneyStop, newJourney, parseJourney, undoJourneyStop, type JourneySession } from "@/lib/journey";
import { todayVietnam } from "@/lib/planner";
import { googleMapsNavigateUrl } from "@/lib/externalLinks";

export default function JourneyClient({trip,destinations,onReplace}:{trip:Trip;destinations:Destination[];onReplace:(activityId:string,dayIndex:number)=>void}){
  const key=`truego:journey:${trip.id}`;
  const [saved,setSaved]=useState<JourneySession|null>(null);
  useEffect(()=>{
    let active=true;
    queueMicrotask(()=>{if(active)setSaved(parseJourney(localStorage.getItem(key),trip));});
    const sync=(event:StorageEvent)=>{if(event.key===key)setSaved(parseJourney(event.newValue,trip));};
    window.addEventListener("storage",sync);
    return()=>{active=false;window.removeEventListener("storage",sync);};
  },[key,trip]);
  const session=saved?.tripId===trip.id?saved:null;
  const dayIndex=session?.dayIndex||0;
  const day=trip.days[dayIndex];
  const visits=session?.visits||[];
  const visitById=new Map(visits.map(visit=>[visit.activityId,visit]));
  const legs=session?journeyDay(trip,session,destinations):[];
  const next=legs[0];
  const total=trip.days.flatMap(item=>item.activities).length;
  const visited=visits.filter(item=>item.decision==="visited").length;
  const skipped=visits.filter(item=>item.decision==="skipped").length;
  const remaining=Math.max(0,total-visited-skipped);
  const matched=trip.input.interests.length?trip.input.interests.join(", "):"điểm gần và phù hợp ngân sách";
  function persist(nextSession:JourneySession|null){setSaved(nextSession);if(nextSession)localStorage.setItem(key,JSON.stringify(nextSession));else localStorage.removeItem(key);}
  function change(fn:(current:JourneySession)=>JourneySession){if(session)persist(fn(session));}
  function useCurrentTime(){const time=new Date().toLocaleTimeString("en-GB",{timeZone:"Asia/Ho_Chi_Minh",hour:"2-digit",minute:"2-digit",hour12:false});change(current=>({...current,departureMinutes:(Number(time.slice(0,2))%24)*60+Number(time.slice(3,5))}));}
  const past=trip.input.endDate<todayVietnam();
  return <section className="journey-shell content-card" aria-label="Đồng hành chuyến đi">
    <div className="journey-heading"><div><span className="section-kicker">TỪ KẾ HOẠCH ĐẾN CHUYẾN ĐI</span><h3>Đồng hành cùng lịch trình</h3><p>TrueGo đã chọn các điểm theo sở thích <strong>{matched}</strong>, giờ mở cửa, khoảng cách và ngân sách. {trip.mode==="ai"?"AI đã diễn giải lý do chọn từng điểm.":"Lịch trình được xếp bằng thuật toán cá nhân hóa; AI trực tuyến chưa được bật."}</p></div><span className="journey-mode">{trip.mode==="ai"?"AI hỗ trợ":"Gợi ý cá nhân hóa"}</span></div>
    {past&&<div className="activity-warning">Ngày của lịch trình này đã qua. Bạn vẫn có thể thử chế độ đồng hành; để đi thực tế, hãy tạo lịch trình mới với ngày sắp tới.</div>}
    {!session?<><div className="journey-steps"><div><span>01</span><strong>Mở chỉ đường</strong><small>Tới điểm sắp ghé bằng Google Maps.</small></div><div><span>02</span><strong>Đánh dấu tiến độ</strong><small>Ghi đã ghé hoặc bỏ qua từng điểm.</small></div><div><span>03</span><strong>Điều chỉnh giờ</strong><small>Tính lại các điểm còn lại nếu khởi hành trễ.</small></div></div><button type="button" className="button journey-start" onClick={()=>persist(newJourney(trip))}><Navigation size={18}/>Bắt đầu dùng lịch trình <ArrowRight size={17}/></button><p className="muted small">Tiến độ chỉ lưu trên trình duyệt này. Google Maps cần mạng và có thể dùng vị trí hiện tại trên thiết bị của bạn.</p></>:<>
      <div className="journey-progress"><div><strong>{visited}/{total} điểm đã ghé</strong><span>{skipped} bỏ qua · {remaining} còn lại</span></div><progress max={Math.max(total,1)} value={visited+skipped} aria-label="Tiến độ chuyến đi"/></div>
      <div className="journey-days" role="group" aria-label="Chọn ngày đi">{trip.days.map((item,index)=><button key={item.date} type="button" className={index===dayIndex?"active":""} aria-pressed={index===dayIndex} onClick={()=>change(current=>({...current,dayIndex:index,delayMinutes:0,departureMinutes:null}))}>Ngày {index+1}<small>{item.date}</small></button>)}</div>
      {day&&<><div className="journey-controls"><span><Clock3 size={16}/> {session.departureMinutes===null?"Theo giờ kế hoạch":"Tính từ giờ khởi hành bạn chọn"}{session.delayMinutes?` · trễ ${session.delayMinutes} phút`:""}</span><button type="button" onClick={()=>change(current=>({...current,delayMinutes:Math.max(0,current.delayMinutes-30)}))} disabled={session.delayMinutes===0}>−30 phút</button><button type="button" onClick={()=>change(current=>({...current,delayMinutes:Math.min(240,current.delayMinutes+30)}))} disabled={session.delayMinutes===240}>Trễ +30 phút</button>{day.date===todayVietnam()&&<button type="button" onClick={useCurrentTime}>Khởi hành bây giờ</button>}</div><p className="muted small">Giờ, chi phí và trạng thái vẫn là dữ liệu tham khảo. Giờ mới chỉ để cân nhắc, chưa thay đổi lịch trình gốc; hãy xác minh thông tin trước khi đi.</p>
        {next?<div className="journey-next"><div className="journey-next-image"><Image src={next.destination.image} alt="" fill sizes="(max-width:600px) 100px, 150px"/></div><div className="journey-next-body"><span className="section-kicker">ĐIỂM SẮP ĐẾN · {next.start}–{next.end}</span><h4>{next.destination.name}</h4><p><MapPin size={15}/>{next.destination.address}</p><p>{next.travelMinutes} phút di chuyển ước tính · {next.activity.cost.toLocaleString("vi-VN")} ₫ tham khảo</p>{next.reason&&<div className="activity-warning">{next.reason}</div>}<div className="journey-actions"><a className="button" href={googleMapsNavigateUrl(next.destination,trip.input.transport)} target="_blank" rel="noopener noreferrer"><Navigation size={17}/>Mở chỉ đường</a><button type="button" onClick={()=>change(current=>markJourneyStop(current,next.activity,"visited"))}><Check size={17}/>Đã ghé</button><button type="button" onClick={()=>change(current=>markJourneyStop(current,next.activity,"skipped"))}>Bỏ qua</button>{!next.feasible&&<button type="button" onClick={()=>onReplace(next.activity.id,dayIndex)}>Đổi điểm</button>}</div></div></div>:<div className="journey-done"><Check size={22}/><strong>Đã xử lý xong các điểm trong ngày {dayIndex+1}.</strong>{dayIndex<trip.days.length-1&&<button type="button" className="button button-outline" onClick={()=>change(current=>({...current,dayIndex:dayIndex+1,delayMinutes:0,departureMinutes:null}))}>Đi đến ngày tiếp theo <ArrowRight size={16}/></button>}</div>}
        <div className="journey-stop-list"><strong>Các điểm trong ngày</strong>{day.activities.map(activity=>{const destination=destinations.find(item=>item.id===activity.destinationId);const visit=visitById.get(activity.id);const preview=legs.find(item=>item.activity.id===activity.id);return <div key={activity.id} className="journey-stop"><span className={visit?`journey-stop-state ${visit.decision}`:"journey-stop-state"}>{visit?.decision==="visited"?"Đã ghé":visit?.decision==="skipped"?"Bỏ qua":"Sắp đi"}</span><span><b>{destination?.name||activity.destinationId}</b><small>{preview?`${preview.start}–${preview.end}`:`Giờ gốc ${activity.start}–${activity.end}`}</small></span>{visit?.decision==="visited"&&destination&&<Link href={`/destinations/${destination.slug}#reviews`}>Đánh giá</Link>}{visit&&<button type="button" onClick={()=>change(current=>undoJourneyStop(current,activity.id))}>Hoàn tác</button>}</div>;})}</div>
      </>}
      <div className="journey-footer"><Link href="/alerts">Xem cảnh báo điểm đến <ArrowRight size={15}/></Link><button type="button" onClick={()=>{if(window.confirm("Đặt lại toàn bộ tiến độ chuyến đi trên thiết bị này?"))persist(null);}}><RotateCcw size={15}/>Làm lại tiến độ</button></div>
    </>}
  </section>;
}
