import { describe, expect, it } from "vitest";
import { journeyDay, markJourneyStop, newJourney, parseJourney, undoJourneyStop } from "../src/lib/journey";
import { googleMapsNavigateUrl } from "../src/lib/externalLinks";
import type { Destination, Trip } from "../src/lib/types";

const place:Destination={id:"a",slug:"a",name:"Điểm A",nameEn:null,category:"Di tích lịch sử",description:"",descriptionEn:null,lat:21.03,lng:105.85,address:"Hà Nội",image:"/a.webp",tags:["lịch sử"],duration:60,price:20000,opening:{open:"08:00",close:"17:00"},closedDays:[],status:"normal",statusRev:1,statusUpdatedAt:null,statusSource:"demo",crowd:"unknown",crowdUpdatedAt:null,updatedAt:"2026-10-21"};
const places=[place,{...place,id:"b",slug:"b",name:"Điểm B",lat:21.032,lng:105.852}];
const trip:Trip={id:"trip-1",title:"Hà Nội",createdAt:"2026-10-21T00:00:00Z",updatedAt:"2026-10-21T00:00:00Z",mode:"demo",input:{region:"Hà Nội",startDate:"2026-10-22",endDate:"2026-10-22",people:1,budget:200000,transport:"walk",interests:["lịch sử"],pace:"relaxed",notes:"",avoid:""},days:[{date:"2026-10-22",activities:[
  {id:"stop-a",destinationId:"a",start:"09:00",end:"10:00",duration:60,travelMinutes:0,cost:20000,locked:false,snapshotRev:1,reason:"Hợp sở thích"},
  {id:"stop-b",destinationId:"b",start:"11:00",end:"12:00",duration:60,travelMinutes:10,cost:20000,locked:false,snapshotRev:1,reason:"Gần điểm A"}
]}]};

describe("travel companion",()=>{
  it("keeps progress for this trip and removes obsolete visits after a replacement",()=>{
    const started=newJourney(trip);
    const visited=markJourneyStop(started,trip.days[0].activities[0],"visited","2026-10-22T02:00:00Z");
    expect(journeyDay(trip,visited,places).map(leg=>leg.activity.id)).toEqual(["stop-b"]);
    expect(parseJourney(JSON.stringify(visited),trip)?.visits).toHaveLength(1);
    const replaced={...trip,days:[{...trip.days[0],activities:[{...trip.days[0].activities[0],destinationId:"b"},trip.days[0].activities[1]]}]};
    expect(parseJourney(JSON.stringify(visited),replaced)?.visits).toEqual([]);
    expect(undoJourneyStop(visited,"stop-a").visits).toEqual([]);
  });
  it("moves remaining stops when delayed and exposes opening-hour conflicts",()=>{
    const started=newJourney(trip);
    const original=journeyDay(trip,started,places);
    const late=journeyDay(trip,{...started,delayMinutes:180},places);
    expect(original[0].start).toBe("09:00");
    expect(late[0].start).toBe("12:00");
    const closedEarly=places.map(item=>item.id==="b"?{...item,opening:{open:"08:00",close:"14:00"}}:item);
    const warning=journeyDay(trip,{...started,delayMinutes:240},closedEarly);
    expect(warning[1].feasible).toBe(false);
    expect(warning[1].reason).toMatch(/giờ mở cửa/);
  });
  it("keeps progress by activity while switching between travel days",()=>{
    const second={...trip.days[0],date:"2026-10-23",activities:[{...trip.days[0].activities[0],id:"stop-c"}]};
    const multi={...trip,days:[trip.days[0],second]};
    const session={...newJourney(multi),dayIndex:1};
    expect(journeyDay(multi,session,places).map(item=>item.activity.id)).toEqual(["stop-c"]);
    expect(parseJourney(JSON.stringify(session),multi)?.dayIndex).toBe(1);
  });
  it("opens directions to the next place without sending the user's location to TrueGo",()=>{
    const link=new URL(googleMapsNavigateUrl(place,"walk"));
    expect(link.hostname).toBe("www.google.com");
    expect(link.searchParams.get("destination")).toBe("21.03,105.85");
    expect(link.searchParams.has("origin")).toBe(false);
  });
});
