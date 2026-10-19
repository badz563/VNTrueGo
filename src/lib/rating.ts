import { z } from "zod";

export const ratingSchema=z.number().min(0).max(5).refine(value=>Number.isInteger(Math.round(value*10))&&Math.abs(value*10-Math.round(value*10))<1e-8,"Điểm phải theo bước 0,1.");
export function ratingToTenths(value:number){return Math.round(value*10);}
export function averageTenths(values:number[]){return values.length?values.reduce((sum,value)=>sum+value,0)/values.length/10:null;}
