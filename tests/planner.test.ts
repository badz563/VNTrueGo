import { describe, expect, it } from "vitest";
import type { Alert, Destination, PlanInput } from "../src/lib/types";
import { addActivity, alternativesFor, availableAlertAdjustments, detectAlerts, isOpenAt, makeTrip, moveActivity, optimizeTrip, replaceActivity, resolveAlert, resolveAlertAdjustment, toggleLock, travelMinutes, tripCost } from "../src/lib/planner";
import { exportBackup, importBackup, parseStored } from "../src/lib/storage";
const base:Destination={
  id:"a",slug:"a",name:"Museum A",nameEn:"Museum A",category:"Bảo tàng",
  description:"Demo",descriptionEn:"Demo",lat:21.03,lng:105.84,address:"Hà Nội",image:"/images/museum.webp",
  tags:["lịch sử"],duration:90,price:10000,opening:{open:"08:00",close:"17:00"},closedDays:[],
  status:"unknown",statusRev:1,statusUpdatedAt:null,statusSource:"demo",
  crowd:"unknown",crowdUpdatedAt:null,updatedAt:"2026-10-17"
};
const destinations:Destination[]=[
  base,{...base,id:"b",slug:"b",name:"Museum B",lat:21.04,lng:105.85,price:20000,tags:["văn hóa"]},
  {...base,id:"c",slug:"c",name:"Lake C",category:"Danh lam thắng cảnh",lat:21.05,lng:105.86,price:0,tags:["thiên nhiên"]},
  {...base,id:"d",slug:"d",name:"Museum D",lat:21.06,lng:105.87,price:0,tags:["lịch sử"]}
];
const input:PlanInput={
  region:"Hà Nội",startDate:"2026-10-20",endDate:"2026-10-21",people:2,budget:100000,
  transport:"walk",interests:["lịch sử","văn hóa"],pace:"balanced",notes:"",avoid:""
};
const create=()=>makeTrip(input,destinations);
describe("planner constraints and edits",()=>{
  it("creates a dated itinerary with unique destinations and reasons",()=>{
    const trip=create();expect(trip.days).toHaveLength(2);
    const all=trip.days.flatMap(d=>d.activities);
    expect(all.length).toBeGreaterThan(0);
    expect(new Set(all.map(a=>a.destinationId)).size).toBe(all.length);
    expect(all.every(a=>a.reason.length>0)).toBe(true);
  });
  it("checks opening hours and closed weekdays",()=>{
    expect(isOpenAt(base,"2026-10-20",8*60,90)).toBe(true);
    expect(isOpenAt(base,"2026-10-20",16*60,90)).toBe(false);
    const closed={...base,closedDays:[2]};
    expect(isOpenAt(closed,"2026-10-20",9*60,90)).toBe(false);
  });
  it("keeps total activity costs within the entire trip budget",()=>{
    const trip=makeTrip({...input,budget:0},destinations);
    expect(tripCost(trip)).toBe(0);
    expect(trip.days.flatMap(d=>d.activities).every(a=>a.cost===0)).toBe(true);
  });
  it("lists lodging without scheduling it as a timed sightseeing activity",()=>{
    const hotel:Destination={...base,id:"hotel",slug:"hotel",name:"Hotel",category:"Khách sạn",tags:["lưu trú"],price:0};
    const trip=makeTrip({...input,interests:["lưu trú"],budget:100000},[hotel,...destinations]);
    expect(trip.days.flatMap(day=>day.activities).some(activity=>activity.destinationId===hotel.id)).toBe(false);
    expect(()=>addActivity(trip,0,hotel,[hotel,...destinations])).toThrow(/Khách sạn/);
    expect(alternativesFor(base,[hotel,...destinations],trip).some(place=>place.id===hotel.id)).toBe(false);
  });
  it("replaces an activity and recalculates cost and travel",()=>{
    const trip=create();const first=trip.days[0].activities[0];
    const replacement=destinations.find(d=>!trip.days.flatMap(day=>day.activities).some(a=>a.destinationId===d.id))||destinations[2];
    const updated=replaceActivity(trip,first.id,replacement,destinations);
    expect(updated.days[0].activities[0].destinationId).toBe(replacement.id);
    expect(updated.days[0].activities[0].cost).toBe(replacement.price*input.people);
    expect(updated.days[0].activities[0].end).not.toBe("");
  });
  it("adds a place with recalculated start, end and travel",()=>{
    const trip=makeTrip({...input,endDate:input.startDate,pace:"relaxed"},destinations);
    const unused=destinations.find(d=>!trip.days[0].activities.some(a=>a.destinationId===d.id))!;
    const updated=addActivity(trip,0,unused,destinations);
    const added=updated.days[0].activities.at(-1)!;
    expect(added.destinationId).toBe(unused.id);
    expect(added.end).not.toBe("09:00");
    expect(added.travelMinutes).toBeGreaterThan(0);
  });
  it("protects locked activities from replacement",()=>{
    const trip=create();const activity=trip.days[0].activities[0];
    const locked=toggleLock(trip,activity.id);
    expect(locked.days[0].activities[0].locked).toBe(true);
    expect(()=>replaceActivity(locked,activity.id,destinations[3],destinations)).toThrow();
  });
  it("reorders activities and recalculates travel time",()=>{
    const trip=create();const day=trip.days.find(d=>d.activities.length>1)!;
    const first=day.activities[0];const moved=moveActivity(trip,first.id,1,destinations);
    const updatedDay=moved.days.find(d=>d.date===day.date)!;
    expect(updatedDay.activities[1].id).toBe(first.id);
    expect(updatedDay.activities[0].travelMinutes).toBe(0);
    expect(updatedDay.activities[1].travelMinutes).toBeGreaterThan(0);
    const optimized=optimizeTrip(moved,destinations);
    expect(optimized.days.flatMap(d=>d.activities)).toHaveLength(trip.days.flatMap(d=>d.activities).length);
    expect(optimized.days.flatMap(d=>d.activities).reduce((total,a)=>total+a.travelMinutes,0))
      .toBeLessThanOrEqual(moved.days.flatMap(d=>d.activities).reduce((total,a)=>total+a.travelMinutes,0));
    expect(optimized.days.every(day=>day.activities.every(activity=>isOpenAt(destinations.find(d=>d.id===activity.destinationId)!,day.date,Number(activity.start.slice(0,2))*60+Number(activity.start.slice(3)),activity.duration)))).toBe(true);
  });
  it("estimates longer travel for farther destinations",()=>{
    expect(travelMinutes(base,destinations[3],"walk")).toBeGreaterThan(travelMinutes(base,destinations[1],"walk"));
  });
});
describe("status impact and notifications",()=>{
  const affected=()=>{
    const trip=makeTrip({...input,endDate:input.startDate},destinations);const activity=trip.days[0].activities[0];
    const current=destinations.map(d=>d.id===activity.destinationId?{...d,status:"closed" as const,statusRev:2,statusUpdatedAt:new Date().toISOString()}:d);
    return {trip,activity,current};
  };
  it("detects impacted saved trips after a status revision",()=>{
    const {trip,current}=affected();
    expect(detectAlerts(trip,current,[])).toHaveLength(1);
    expect(detectAlerts(trip,destinations,[])).toHaveLength(0);
  });
  it("creates a clear alert once per revision",()=>{
    const {trip,current}=affected();const first=detectAlerts(trip,current,[]);
    expect(first[0].message).toContain("tạm đóng cửa");
    expect(detectAlerts(trip,current,first)).toHaveLength(0);
    const consecutive=current.map(d=>d.id===first[0].destinationId?{...d,statusRev:3}:d);
    expect(detectAlerts(trip,consecutive,first)).toHaveLength(1);
  });
  it("suggests similar open alternatives, never a closed place",()=>{
    const excluded={...destinations[1],status:"closed" as const};
    const choices=alternativesFor(base,[base,excluded,destinations[2],destinations[3]]);
    expect(choices.map(d=>d.id)).not.toContain(excluded.id);
    expect(choices[0].category).toBe(base.category);
  });
  it("accepts or declines an adjustment without silent trip edits",()=>{
    const {trip,current}=affected();const alert=detectAlerts(trip,current,[])[0];
    const declined=resolveAlert(alert,trip,null,current);
    expect(declined.alert.decision).toBe("dismissed");
    expect(declined.trip).toBe(trip);
    const alternative=current.find(d=>d.id===alert.alternatives[0])!;
    const accepted=resolveAlert(alert,trip,alternative,current);
    expect(accepted.alert.decision).toBe("accepted");
    expect(accepted.trip.days.flatMap(d=>d.activities).find(a=>a.id===alert.activityId)?.destinationId).toBe(alternative.id);
  });
  it("alerts when a new opening hour conflicts with an existing stop",()=>{
    const trip=create();const activity=trip.days[0].activities[0];
    const current=destinations.map(d=>d.id===activity.destinationId?{...d,opening:{open:"14:00",close:"15:00"},statusRev:2}:d);
    expect(detectAlerts(trip,current,[])).toHaveLength(1);
  });
  it("offers a feasible new visit time only after a changed opening hour",()=>{
    const original=create();
    const first=original.days[0].activities[0];
    const trip={...original,days:[{...original.days[0],activities:[first]}]};
    const current=destinations.map(d=>d.id===first.destinationId?{...d,opening:{open:"10:00",close:"17:00"},statusRev:2}:d);
    const alert=detectAlerts(trip,current,[])[0];
    expect(availableAlertAdjustments(alert,trip,current)).toContain("reschedule");
    const result=resolveAlertAdjustment(alert,trip,"reschedule",current);
    expect(result.trip.days[0].activities[0].start).toBe("10:00");
    expect(result.trip.days[0].activities[0].snapshotRev).toBe(2);
    expect(result.alert.decision).toBe("accepted");
    expect(detectAlerts(result.trip,current,[result.alert])).toHaveLength(0);
  });
  it("does not suggest keeping or reordering a closed destination",()=>{
    const {trip,current}=affected();const alert=detectAlerts(trip,current,[])[0];
    expect(availableAlertAdjustments(alert,trip,current)).toEqual([]);
    expect(()=>resolveAlertAdjustment(alert,trip,"reschedule",current)).toThrow();
  });
  it("can propose a feasible order change for new opening hours",()=>{
    const trip=makeTrip({...input,endDate:input.startDate,pace:"relaxed"},destinations);
    const first=trip.days[0].activities[0];
    const current=destinations.map(d=>d.id===first.destinationId?{...d,opening:{open:"11:00",close:"17:00"},statusRev:2}:d);
    const alert=detectAlerts(trip,current,[])[0];
    expect(availableAlertAdjustments(alert,trip,current)).toContain("move-later");
    const updated=resolveAlertAdjustment(alert,trip,"move-later",current).trip;
    expect(updated.days[0].activities[1].id).toBe(first.id);
    expect(updated.days[0].activities.every(a=>isOpenAt(current.find(d=>d.id===a.destinationId)!,updated.days[0].date,Number(a.start.slice(0,2))*60+Number(a.start.slice(3)),a.duration))).toBe(true);
  });
});
describe("local trip backup",()=>{
  it("exports and restores saved trips with the same structure",()=>{
    const trip=create();const backup=exportBackup([trip]);
    expect(importBackup(backup)).toEqual([trip]);
    const stored={trips:[trip],activeId:trip.id,alerts:[] as Alert[],lang:"vi" as const,preferences:["lịch sử"]};
    expect(parseStored(JSON.stringify(stored))).toEqual({...stored,simulations:[]});
    expect(parseStored(JSON.stringify({...stored,preferences:undefined})).preferences).toEqual([]);
  });
  it("rejects malformed imported trips",()=>{
    expect(()=>importBackup('{"version":1,"trips":[{"id":"bad"}]}')).toThrow();
    expect(parseStored("{")).toEqual({trips:[],activeId:null,alerts:[],lang:"vi",preferences:[],simulations:[]});
  });
});
