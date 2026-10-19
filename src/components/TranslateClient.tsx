"use client";
import { useState } from "react";
import { googleTranslateUrl } from "@/lib/externalLinks";
export default function TranslateClient(){
  const [text,setText]=useState(""),[direction,setDirection]=useState<"vi-en"|"en-vi">("vi-en");
  return <div className="container account-page"><div className="page-heading"><div><span className="section-kicker">CÔNG CỤ DU LỊCH</span><h1>Dịch nhanh</h1><p>Nhập nội dung rồi mở Google Translate trong tab mới.</p></div></div><form className="content-card account-card account-form" onSubmit={event=>{event.preventDefault();if(text.trim())window.open(googleTranslateUrl(text.trim(),direction),"_blank","noopener,noreferrer");}}><label>Chiều dịch<select value={direction} onChange={event=>setDirection(event.target.value as "vi-en"|"en-vi")}><option value="vi-en">Tiếng Việt → Tiếng Anh</option><option value="en-vi">Tiếng Anh → Tiếng Việt</option></select></label><label>Nội dung<textarea required maxLength={3000} value={text} onChange={event=>setText(event.target.value)}/></label><button className="button" disabled={!text.trim()}>Mở Google Translate</button></form></div>;
}
