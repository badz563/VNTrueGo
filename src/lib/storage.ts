import { z } from "zod";
import type { Alert, Language, Trip } from "./types";
const input = z.object({
  region:z.string(),startDate:z.string(),endDate:z.string(),people:z.number(),
  budget:z.number(),transport:z.enum(["walk","bike","car"]),interests:z.array(z.string()),
  pace:z.enum(["relaxed","balanced","full"]),notes:z.string(),avoid:z.string()
});
const activity = z.object({
  id:z.string(),destinationId:z.string(),start:z.string(),end:z.string(),
  travelMinutes:z.number(),duration:z.number(),cost:z.number(),locked:z.boolean(),
  snapshotRev:z.number(),reason:z.string()
});
const trip = z.object({
  id:z.string(),title:z.string(),createdAt:z.string(),updatedAt:z.string(),input,
  days:z.array(z.object({date:z.string(),activities:z.array(activity)})),
  mode:z.enum(["demo","ai"])
});
const alert = z.object({
  id:z.string(),tripId:z.string(),activityId:z.string(),destinationId:z.string(),
  revision:z.number(),status:z.enum(["unknown","normal","busy","overloaded","limited","closed"]),
  message:z.string(),createdAt:z.string(),decision:z.enum(["pending","accepted","dismissed","superseded"]),
  alternatives:z.array(z.string())
});
export type StatusSimulation = { destinationId:string; revision:number };
export type StoredData = { trips:Trip[]; activeId:string|null; alerts:Alert[]; lang:Language; preferences:string[]; simulations:StatusSimulation[] };
export const emptyStored:StoredData={trips:[],activeId:null,alerts:[],lang:"vi",preferences:[],simulations:[]};
export function parseStored(raw:string|null):StoredData {
  if(!raw)return emptyStored;
  try {
    const parsed=z.object({
      trips:z.array(trip).max(100),activeId:z.string().nullable(),
      alerts:z.array(alert).max(1000),lang:z.enum(["vi","en"]),
      preferences:z.array(z.string()).max(12).default([]),
      simulations:z.array(z.object({destinationId:z.string(),revision:z.number().int().positive()})).max(30).default([])
    }).safeParse(JSON.parse(raw));
    return parsed.success?parsed.data:emptyStored;
  }catch{return emptyStored;}
}
export function importBackup(raw:string):Trip[]{
  const parsed=z.object({version:z.literal(1),trips:z.array(trip).max(100)}).safeParse(JSON.parse(raw));
  if(!parsed.success)throw new Error("Dữ liệu lịch trình không hợp lệ.");
  return parsed.data.trips;
}
export function exportBackup(trips:Trip[]):string{return JSON.stringify({version:1,trips},null,2);}
export function parseTrip(value:unknown):Trip|null{const result=trip.safeParse(value);return result.success?result.data:null;}
