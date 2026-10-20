import { z } from "zod";
import { isOpenAt, toClock, toMinutes, travelMinutes } from "./planner";
import type { Activity, Destination, Trip } from "./types";

const visitSchema=z.object({activityId:z.string(),destinationId:z.string(),decision:z.enum(["visited","skipped"]),at:z.string()});
const sessionSchema=z.object({tripId:z.string(),startedAt:z.string(),dayIndex:z.number().int().nonnegative(),delayMinutes:z.number().int().min(0).max(240),departureMinutes:z.number().int().min(0).max(1439).nullable(),visits:z.array(visitSchema).max(100)});
export type JourneySession=z.infer<typeof sessionSchema>;
export type JourneyLeg={activity:Activity;destination:Destination;start:string;end:string;travelMinutes:number;feasible:boolean;reason:string};

export function newJourney(trip:Trip):JourneySession{
  return {tripId:trip.id,startedAt:new Date().toISOString(),dayIndex:0,delayMinutes:0,departureMinutes:null,visits:[]};
}
export function parseJourney(raw:string|null,trip:Trip):JourneySession|null{
  if(!raw)return null;
  try{
    const parsed=sessionSchema.safeParse(JSON.parse(raw));
    if(!parsed.success||parsed.data.tripId!==trip.id)return null;
    const valid=new Map(trip.days.flatMap(day=>day.activities).map(activity=>[activity.id,activity.destinationId]));
    return {...parsed.data,dayIndex:Math.min(parsed.data.dayIndex,Math.max(0,trip.days.length-1)),
      visits:parsed.data.visits.filter(visit=>valid.get(visit.activityId)===visit.destinationId)};
  }catch{return null;}
}
export function markJourneyStop(session:JourneySession,activity:Activity,decision:"visited"|"skipped",at=new Date().toISOString()):JourneySession{
  return {...session,visits:[...session.visits.filter(visit=>visit.activityId!==activity.id),
    {activityId:activity.id,destinationId:activity.destinationId,decision,at}]};
}
export function undoJourneyStop(session:JourneySession,activityId:string):JourneySession{
  return {...session,visits:session.visits.filter(visit=>visit.activityId!==activityId)};
}
export function journeyDay(trip:Trip,session:JourneySession,destinations:Destination[]):JourneyLeg[]{
  const day=trip.days[session.dayIndex];if(!day)return [];
  const completed=new Set(session.visits.map(visit=>visit.activityId));
  const lookup=new Map(destinations.map(destination=>[destination.id,destination]));
  const pending=day.activities.filter(activity=>!completed.has(activity.id));
  const legs:JourneyLeg[]=[];
  let previous:Destination|undefined;
  let clock=0;
  for(const [index,activity] of pending.entries()){
    const destination=lookup.get(activity.destinationId);if(!destination)continue;
    const move=previous?travelMinutes(previous,destination,trip.input.transport):activity.travelMinutes;
    const planned=toMinutes(activity.start)+session.delayMinutes;
    clock=index===0?Math.max(planned,session.departureMinutes??0):Math.max(planned,clock+move);
    clock=Math.max(clock,toMinutes(destination.opening.open));
    const statusBlocked=destination.status==="closed"||destination.status==="overloaded";
    const feasible=!statusBlocked&&clock<1440&&isOpenAt(destination,day.date,clock,activity.duration);
    const reason=statusBlocked?"Điểm đến đang được báo không thể tiếp nhận; hãy xem cảnh báo hoặc chọn điểm khác.":
      !feasible?"Giờ dự kiến không còn phù hợp giờ mở cửa; hãy đổi điểm hoặc chuyển sang ngày khác.":
      destination.status==="limited"?"Điểm đến được báo hạn chế tiếp nhận; hãy kiểm tra trước khi đi.":"";
    legs.push({activity,destination,start:clock<1440?toClock(clock):"Sau 24:00",end:clock+activity.duration<1440?toClock(clock+activity.duration):"Sau 24:00",travelMinutes:move,feasible,reason});
    clock+=activity.duration+(trip.input.pace==="relaxed"?35:20);
    previous=destination;
  }
  return legs;
}
