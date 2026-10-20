import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/auth";
import { allDestinations } from "@/lib/db";
import { distanceKm } from "@/lib/planner";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
const schema = z.object({
  destinationId:z.string().min(1).max(100),candidateIds:z.array(z.string().min(1).max(100)).min(1).max(3),
  interests:z.array(z.string().max(40)).max(10),people:z.number().int().min(1).max(20),budget:z.number().int().min(0).max(50_000_000)
});

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const limited=rateLimit(request,"alert-suggest",30);if(limited)return limited;
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Cảnh báo không hợp lệ."},{status:400});
  const input=parsed.data;
  const destinations=await allDestinations();
  const original=destinations.find(item=>item.id===input.destinationId);
  const candidates=destinations.filter(item=>input.candidateIds.includes(item.id)&&item.status!=="closed"&&item.status!=="overloaded"&&item.category!=="Khách sạn");
  if(!original||!candidates.length)return NextResponse.json({error:"Không có địa điểm thay thế khả dụng."},{status:404});
  const ranked=candidates.sort((a,b)=>{
    const score=(item:typeof a)=>input.interests.filter(tag=>item.tags.includes(tag)).length*5+
      Number(item.category===original.category)*4-distanceKm(original,item)-
      (item.price*input.people>input.budget?20:0);
    return score(b)-score(a);
  });
  const preferred=ranked[0];
  const matched=input.interests.filter(tag=>preferred.tags.includes(tag));
  const fallback=`${preferred.name} ${matched.length?`hợp sở thích ${matched.join(", ")}, `:""}gần điểm ban đầu khoảng ${distanceKm(original,preferred).toFixed(1)} km và có chi phí tham khảo ${preferred.price.toLocaleString("vi-VN")} ₫/người. Kiểm tra giờ mở cửa trước khi đi.`;
  const key=process.env.AI_API_KEY;
  if(!key)return NextResponse.json({destinationId:preferred.id,reason:fallback,mode:"demo"},{headers:{"Cache-Control":"no-store"}});
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),7000);
  try{
    const response=await fetch(process.env.AI_PROVIDER_URL||"https://api.openai.com/v1/chat/completions",{
      method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},
      body:JSON.stringify({model:process.env.AI_MODEL||"gpt-4o-mini",temperature:0.2,messages:[
        {role:"system",content:"Choose one candidate ID and explain briefly in Vietnamese for a travel itinerary. Return ONLY JSON {\"destinationId\":string,\"reason\":string}. Use only supplied facts; never claim real-time verified status, real payment, or actual routing."},
        {role:"user",content:JSON.stringify({interests:input.interests,people:input.people,budget:input.budget,original:{id:original.id,name:original.name},candidates:ranked.map(item=>({id:item.id,name:item.name,category:item.category,tags:item.tags,price:item.price,distanceKm:Number(distanceKm(original,item).toFixed(1))}))})}
      ]})
    });
    if(!response.ok)throw new Error("AI unavailable");
    const json=await response.json();
    const suggestion=JSON.parse(json?.choices?.[0]?.message?.content||"null");
    if(!suggestion||!ranked.some(item=>item.id===suggestion.destinationId)||typeof suggestion.reason!=="string"||suggestion.reason.length>300||suggestion.reason.length<10)throw new Error("Invalid AI suggestion");
    return NextResponse.json({destinationId:suggestion.destinationId,reason:suggestion.reason,mode:"ai"},{headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({destinationId:preferred.id,reason:fallback,mode:"demo"},{headers:{"Cache-Control":"no-store"}});}
  finally{clearTimeout(timeout);}
}
