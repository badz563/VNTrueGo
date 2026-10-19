export type Status = "unknown" | "normal" | "busy" | "overloaded" | "limited" | "closed";
export type Crowd = "unknown" | "low" | "moderate" | "high";
export type Language = "vi" | "en";
export type Destination = {
  id: string; slug: string; name: string; nameEn: string | null; category: string;
  description: string; descriptionEn: string | null; sourceUrl?: string; lat: number; lng: number;
  address: string; image: string; tags: string[]; duration: number; price: number;
  opening: { open: string; close: string }; closedDays: number[];
  status: Status; statusRev: number; statusUpdatedAt: string | null;
  statusSource: string; crowd: Crowd; crowdUpdatedAt: string | null;
  updatedAt: string; announcements?: { id: number; message: string; createdAt: string; source: string }[];
  reviews?: { id: number; author: string; body: string; verification: string; ratingTenths: number }[];
  rating?: number | null; ratingCount?: number;
  events?: {id:string;title:string;description:string;startsAt:string;endsAt:string;ticketPrice:number|null}[];
  offers?: {id:string;title:string;terms:string;startsAt:string;endsAt:string;promoCode:string|null;bookingUrl:string|null}[];
  seasons?: {id:string;title:string;body:string;source:string;updatedAt:string}[];
};
export type PlanInput = {
  region: string; startDate: string; endDate: string; people: number; budget: number;
  transport: "walk" | "bike" | "car"; interests: string[]; pace: "relaxed" | "balanced" | "full";
  notes: string; avoid: string;
};
export type Activity = {
  id: string; destinationId: string; start: string; end: string;
  travelMinutes: number; duration: number; cost: number; locked: boolean;
  snapshotRev: number; reason: string;
};
export type TripDay = { date: string; activities: Activity[] };
export type Trip = { id: string; title: string; createdAt: string; updatedAt: string; input: PlanInput; days: TripDay[]; mode: "demo" | "ai" };
export type Alert = {
  id: string; tripId: string; activityId: string; destinationId: string;
  revision: number; status: Status; message: string; createdAt: string;
  decision: "pending" | "accepted" | "dismissed" | "superseded"; alternatives: string[];
};
