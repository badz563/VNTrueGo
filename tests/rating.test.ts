import { describe, expect, it } from "vitest";
import { averageTenths, ratingSchema, ratingToTenths } from "../src/lib/rating";
import { googleMapsDayRoutes, googleMapsPlaceUrl, googleTranslateUrl } from "../src/lib/externalLinks";

describe("review rating",()=>{
  it.each([0,0.1,0.5,1,1.2,2.5,3.7,4.2,4.9,5])("accepts and stores %s exactly",value=>{
    expect(ratingSchema.safeParse(value).success).toBe(true);
    expect(ratingToTenths(value)/10).toBe(value);
  });
  it("rejects out-of-range and non-tenth values",()=>{
    for(const value of [-0.1,5.1,1.25,Number.NaN])expect(ratingSchema.safeParse(value).success).toBe(false);
  });
  it("counts zero in the average",()=>{
    expect(averageTenths([0,42,50])).toBeCloseTo(3.0666667);
    expect(averageTenths([])).toBeNull();
  });
});

describe("external links",()=>{
  const places=Array.from({length:18},(_,i)=>({lat:21+i/100,lng:105+i/100}));
  it("opens a place and divides long Google Maps routes with a shared endpoint",()=>{
    expect(googleMapsPlaceUrl(places[0])).toContain("api=1");
    const routes=googleMapsDayRoutes(places);
    expect(routes).toHaveLength(3);
    expect(new URL(routes[0]).searchParams.get("destination")).toBe("21.08,105.08");
    expect(new URL(routes[1]).searchParams.get("origin")).toBe("21.08,105.08");
  });
  it("restricts translation to the selected language pair",()=>{
    const url=new URL(googleTranslateUrl("Xin chào & cảm ơn","vi-en"));
    expect(url.searchParams.get("sl")).toBe("vi");
    expect(url.searchParams.get("tl")).toBe("en");
    expect(url.searchParams.get("text")).toBe("Xin chào & cảm ơn");
  });
});
