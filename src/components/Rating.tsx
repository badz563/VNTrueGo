"use client";
import { Star } from "lucide-react";

export function RatingDisplay({value,large=false,count=5}:{value:number;large?:boolean;count?:number}){
  const clamped=Math.max(0,Math.min(5,value));
  return <span className={large?"rating-stars large":"rating-stars"} aria-label={`${clamped.toFixed(1)} trên 5 sao`} role="img">
    {Array.from({length:count},(_,index)=><span className="rating-star" key={index}><Star className="rating-empty"/><span className="rating-fill" style={{width:`${Math.max(0,Math.min(1,clamped-index))*100}%`}}><Star/></span></span>)}
  </span>;
}
export function RatingInput({value,onChange}:{value:number;onChange:(value:number)=>void}){
  return <div className="rating-input"><div className="rating-star-buttons" aria-label="Chọn số sao">
    {[1,2,3,4,5].map(index=><button type="button" key={index} onClick={()=>onChange(index)} aria-label={`${index} sao`}><RatingDisplay value={Math.max(0,Math.min(1,value-(index-1)))} count={1} large/></button>)}
    </div><input type="range" min="0" max="5" step="0.1" value={value} onChange={event=>onChange(Number(event.target.value))} aria-label="Điểm đánh giá từ 0 đến 5, bước 0,1"/><p>Đánh giá của bạn: <strong>{value.toFixed(1)}/5</strong></p></div>;
}
