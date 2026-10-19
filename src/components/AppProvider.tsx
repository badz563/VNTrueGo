"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Alert, Destination, Language, Trip } from "@/lib/types";
import { addActivity, detectAlerts, resolveAlert, resolveAlertAdjustment, todayVietnam, type AlertAdjustment } from "@/lib/planner";
import { emptyStored, importBackup, parseStored, type StoredData } from "@/lib/storage";
type AppValue = {
  destinations: Destination[]; loading: boolean; error: string; checkedAt: string | null;
  trips: Trip[]; activeTrip: Trip | null; alerts: Alert[]; lang: Language; preferences: string[];
  setLang: (lang: Language) => void; setPreferences: (tags: string[]) => void;
  refresh: () => Promise<void>; saveTrip: (trip: Trip) => void;
  deleteTrip: (id: string) => void; selectTrip: (id: string) => void;
  addToTrip: (destination: Destination) => "added" | "exists" | "unavailable";
  acceptAlert: (id: string, replacementId: string) => string | null;
  acceptAdjustment: (id: string, adjustment: AlertAdjustment) => string | null;
  dismissAlert: (id: string) => void;
  importTrips: (file: File) => Promise<number>;
};
const Context = createContext<AppValue | null>(null);
const STORAGE = "truego:v1";
type Stored = StoredData;
const initial: Stored = emptyStored;
function readSaved(): Stored { return parseStored(localStorage.getItem(STORAGE)); }
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [destinations,setDestinations] = useState<Destination[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [checkedAt,setCheckedAt] = useState<string | null>(null);
  const [stored,setStored] = useState<Stored>(initial);
  const storedRef = useRef(stored);
  const ready = useRef(false);
  useEffect(() => { document.documentElement.lang = stored.lang; }, [stored.lang]);
  const update = useCallback((fn: (current: Stored) => Stored) => {
    const next = fn(storedRef.current);
    storedRef.current = next; setStored(next);
    if (ready.current) localStorage.setItem(STORAGE,JSON.stringify(next));
  },[]);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/destinations", { cache: "no-store" });
      if (!response.ok) throw new Error("Không tải được dữ liệu địa điểm.");
      const data = await response.json() as { destinations: Destination[]; checkedAt: string };
      setDestinations(data.destinations);
      setCheckedAt(data.checkedAt);
      setError("");
      update(current => {
        const additions = current.trips.flatMap(trip => detectAlerts(trip,data.destinations,current.alerts));
        const lookup = new Map(data.destinations.map(destination => [destination.id,destination]));
        const alerts = current.alerts.map(alert => {
          const activity = current.trips.flatMap(trip => trip.days.flatMap(day => day.activities))
            .find(item => item.id === alert.activityId);
          const destination = lookup.get(alert.destinationId);
          return alert.decision === "pending" && (!activity || activity.destinationId !== alert.destinationId ||
            (destination && destination.statusRev > alert.revision) || activity.snapshotRev >= alert.revision)
            ? { ...alert, decision: "superseded" as const } : alert;
        });
        return additions.length || alerts.some((alert,index) => alert !== current.alerts[index])
          ? { ...current, alerts: [...additions,...alerts] } : current;
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Lỗi tải dữ liệu."); }
    finally { setLoading(false); }
  },[update]);
  useEffect(() => {
    let active = true;
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
    queueMicrotask(() => {
      if (!active) return;
      const loaded = readSaved(); storedRef.current = loaded; setStored(loaded); ready.current = true;
      void refresh();
    });
    const poll = setInterval(() => void refresh(),15000);
    const focus = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange",focus);
    window.addEventListener("focus",focus);
    const sync = (event: StorageEvent) => { if (event.key === STORAGE) { const value = readSaved(); storedRef.current = value; setStored(value); } };
    window.addEventListener("storage",sync);
    return () => { active=false;clearInterval(poll); document.removeEventListener("visibilitychange",focus); window.removeEventListener("focus",focus); window.removeEventListener("storage",sync); };
  },[refresh]);
  const saveTrip = useCallback((trip: Trip) => update(current => ({
    ...current, trips: [trip,...current.trips.filter(t => t.id !== trip.id)], activeId: trip.id
  })),[update]);
  const deleteTrip = useCallback((id: string) => update(current => ({
    ...current, trips: current.trips.filter(t => t.id !== id),
    activeId: current.activeId === id ? current.trips.find(t => t.id !== id)?.id || null : current.activeId,
    alerts: current.alerts.filter(a => a.tripId !== id)
  })),[update]);
  const selectTrip = useCallback((id: string) => update(current => ({ ...current, activeId: id })),[update]);
  const setLang = useCallback((lang: Language) => update(current => ({ ...current, lang })),[update]);
  const setPreferences = useCallback((tags: string[]) => update(current => ({ ...current, preferences: tags })),[update]);
  const activeTrip = stored.trips.find(t => t.id === stored.activeId) || stored.trips[0] || null;
  const addToTrip = useCallback((destination: Destination) => {
    if (destination.status === "closed" || destination.status === "overloaded" || destination.category === "Khách sạn") return "unavailable" as const;
    const current = storedRef.current;
    const trip = current.trips.find(t => t.id === current.activeId) || current.trips[0];
    if (trip) {
      if (trip.days.some(day => day.activities.some(activity => activity.destinationId === destination.id))) return "exists" as const;
      saveTrip(addActivity(trip,0,destination,destinations));
    }
    else {
      const today = todayVietnam();
      const input: Trip["input"] = {
        region:"Hà Nội",startDate:today,endDate:today,people:1,budget:500000,
        transport:"walk",interests:[],pace:"relaxed",notes:"",avoid:""
      };
      const newTrip: Trip = {
        id:crypto.randomUUID(),title:"Một ngày ở Hà Nội",createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),input,days:[{date:today,activities:[]}],mode:"demo"
      };
      saveTrip(addActivity(newTrip,0,destination,destinations));
    }
    return "added" as const;
  },[destinations,saveTrip]);
  const applyAlert = useCallback((id: string, action: { replacementId: string } | { adjustment: AlertAdjustment }) => {
    try {
      update(current => {
        const alert = current.alerts.find(item => item.id === id);
        const trip = current.trips.find(item => item.id === alert?.tripId);
        const destination = destinations.find(item => item.id === alert?.destinationId);
        if (!alert || !trip || !destination || alert.revision !== destination.statusRev)
          throw new Error("Cảnh báo đã cũ. Hãy kiểm tra cập nhật mới.");
        const replacement = "replacementId" in action
          ? destinations.find(item => item.id === action.replacementId) : undefined;
        if ("replacementId" in action && !replacement) throw new Error("Địa điểm thay thế không còn khả dụng.");
        const result = "replacementId" in action
          ? resolveAlert(alert, trip, replacement!, destinations)
          : resolveAlertAdjustment(alert, trip, action.adjustment, destinations);
        return { ...current,
          trips: current.trips.map(item => item.id === trip.id ? result.trip : item),
          alerts: current.alerts.map(item => item.id === id ? result.alert : item)
        };
      });
      return null;
    } catch (cause) { return cause instanceof Error ? cause.message : "Không cập nhật được lịch trình."; }
  },[destinations,update]);
  const acceptAlert = useCallback((id: string, replacementId: string) => applyAlert(id,{replacementId}),[applyAlert]);
  const acceptAdjustment = useCallback((id: string, adjustment: AlertAdjustment) => applyAlert(id,{adjustment}),[applyAlert]);
  const dismissAlert = useCallback((id: string) => update(current => ({
    ...current, alerts: current.alerts.map(a => a.id === id ? { ...a,decision:"dismissed" } : a)
  })),[update]);
  const importTrips = useCallback(async (file: File) => {
    const trips = importBackup(await file.text());
    update(current => {
      const merged = [...trips,...current.trips];
      return { ...current, trips: [...new Map(merged.map(t => [t.id,t])).values()], activeId: trips[0]?.id || current.activeId };
    });
    return trips.length;
  },[update]);
  return <Context.Provider value={{ destinations,loading,error,checkedAt,trips:stored.trips,activeTrip,
    alerts:stored.alerts,lang:stored.lang,preferences:stored.preferences,setLang,setPreferences,refresh,saveTrip,deleteTrip,selectTrip,
    addToTrip,acceptAlert,acceptAdjustment,dismissAlert,importTrips }}>{children}</Context.Provider>;
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("AppProvider is required");
  return value;
}
