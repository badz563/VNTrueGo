import type { Activity, Alert, Destination, PlanInput, Trip } from "./types";

const DAY_MS = 86_400_000;
const troublesome = new Set(["closed", "overloaded", "limited"]);
const pad = (n: number) => String(n).padStart(2, "0");
export const toMinutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
export const toClock = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
export const todayVietnam = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
const midnight = (date: string) => new Date(`${date}T00:00:00Z`).getTime();
export const dayCount = (start: string, end: string) => Math.round((midnight(end) - midnight(start)) / DAY_MS) + 1;
const dateAt = (start: string, offset: number) => new Date(midnight(start) + offset * DAY_MS).toISOString().slice(0, 10);

export function isOpenAt(destination: Destination, date: string, start: number, duration = destination.duration) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return !destination.closedDays.includes(weekday) &&
    start >= toMinutes(destination.opening.open) &&
    start + duration <= toMinutes(destination.opening.close) &&
    destination.status !== "closed";
}
export function distanceKm(a: Destination, b: Destination) {
  const radians = (n: number) => n * Math.PI / 180;
  const dLat = radians(b.lat - a.lat), dLng = radians(b.lng - a.lng);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}
export function travelMinutes(a: Destination | undefined, b: Destination, transport: PlanInput["transport"]) {
  if (!a) return 0;
  const speed = transport === "walk" ? 4.2 : transport === "bike" ? 10 : 18;
  return Math.max(5, Math.ceil((distanceKm(a, b) * 1.35 / speed) * 60 / 5) * 5);
}
export function scoreDestination(destination: Destination, input: PlanInput) {
  const notes = input.notes.toLocaleLowerCase();
  const inferred = ["lịch sử","văn hóa","nghệ thuật","thiên nhiên","nhiếp ảnh","yên tĩnh","ẩm thực"].filter(tag=>notes.includes(tag));
  const interests = [...new Set([...input.interests,...inferred])].filter(t => destination.tags.includes(t)).length;
  const avoid = input.avoid.toLocaleLowerCase();
  if (avoid && [destination.name, destination.category, ...destination.tags].some(t => avoid.includes(t.toLocaleLowerCase()))) return -100;
  if (destination.status === "closed" || destination.status === "overloaded") return -100;
  const avoidCrowds = /đông|crowd|busy/.test(avoid+" "+notes);
  return interests * 5 + (destination.price === 0 ? 1 : 0) + (destination.status === "limited" ? -4 : 0) + (destination.status === "busy" ? avoidCrowds ? -12 : -2 : 0);
}
export function recalculateTrip(trip: Trip, destinations: Destination[]): Trip {
  const lookup = new Map(destinations.map(d => [d.id, d]));
  const days = trip.days.map(day => {
    let clock = 9 * 60;
    let previous: Destination | undefined;
    const activities = day.activities.map(activity => {
      const destination = lookup.get(activity.destinationId);
      if (!destination) return null;
      const move = travelMinutes(previous, destination, trip.input.transport);
      clock += move;
      clock = Math.max(clock, toMinutes(destination.opening.open));
      const next: Activity = {
        ...activity, travelMinutes: move, start: toClock(clock),
        end: toClock(clock + destination.duration), duration: destination.duration,
        cost: destination.price * trip.input.people
      };
      clock += destination.duration + (trip.input.pace === "relaxed" ? 35 : 20);
      previous = destination;
      return next;
    }).filter((value): value is Activity => value !== null);
    return { ...day, activities };
  });
  return { ...trip, days, updatedAt: new Date().toISOString() };
}
export function tripCost(trip: Trip) {
  return trip.days.flatMap(day => day.activities).reduce((total, a) => total + a.cost, 0);
}
export function tripDuration(trip: Trip) {
  return trip.days.flatMap(day => day.activities).reduce((total, a) => total + a.duration + a.travelMinutes, 0);
}
export function makeTrip(input: PlanInput, destinations: Destination[]): Trip {
  const count = dayCount(input.startDate, input.endDate);
  if (!Number.isFinite(count) || count < 1 || count > 7) throw new Error("Chọn lịch trình từ 1 đến 7 ngày.");
  if (input.people < 1 || input.people > 20 || input.budget < 0) throw new Error("Thông tin đoàn hoặc ngân sách không hợp lệ.");
  const shortMoves = /bố mẹ|người lớn tuổi|ít di chuyển|không muốn di chuyển|elderly|short walk/i.test(input.notes);
  const perDay = shortMoves ? 2 : input.pace === "relaxed" ? 2 : input.pace === "balanced" ? 3 : 4;
  const used = new Set<string>();
  let spent = 0;
  const days = Array.from({ length: count }, (_, index) => {
    const date = dateAt(input.startDate, index);
    const activities: Activity[] = [];
    let current = 9 * 60;
    let previous: Destination | undefined;
    for (let slot = 0; slot < perDay; slot++) {
      const candidates = destinations.filter(d => !used.has(d.id) && d.category!=="Khách sạn").map(d => {
        const move = travelMinutes(previous, d, input.transport);
        const start = Math.max(current + move, toMinutes(d.opening.open));
        const cost = d.price * input.people;
        const remaining = input.budget - spent;
        const withinBudget = cost <= remaining;
        const score = scoreDestination(d, input) - move / (shortMoves ? 5 : 15);
        return { d, move, start, withinBudget, score };
      }).filter(c => c.score > -50 && c.withinBudget && isOpenAt(c.d, date, c.start))
        .sort((a, b) => b.score - a.score);
      const chosen = candidates[0];
      if (!chosen) break;
      activities.push({
        id: crypto.randomUUID(), destinationId: chosen.d.id, start: toClock(chosen.start),
        end: toClock(chosen.start + chosen.d.duration), travelMinutes: chosen.move,
        duration: chosen.d.duration, cost: chosen.d.price * input.people, locked: false,
        snapshotRev: chosen.d.statusRev,
        reason: input.interests.some(t => chosen.d.tags.includes(t))
          ? `Hợp sở thích ${input.interests.filter(t => chosen.d.tags.includes(t)).join(", ")}; phù hợp giờ mở cửa, nhịp độ và ngân sách.`
          : "Thuận đường, phù hợp giờ mở cửa và ngân sách."
      });
      spent += chosen.d.price * input.people;
      used.add(chosen.d.id);
      current = chosen.start + chosen.d.duration + (input.pace === "relaxed" ? 35 : 20);
      previous = chosen.d;
    }
    return { date, activities };
  });
  const trip: Trip = {
    id: crypto.randomUUID(), title: `Khám phá Hà Nội · ${count} ngày`,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    input, days, mode: "demo"
  };
  return recalculateTrip(trip, destinations);
}
export function replaceActivity(trip: Trip, activityId: string, replacement: Destination, destinations: Destination[]) {
  if (replacement.category === "Khách sạn") throw new Error("Khách sạn hiện chỉ hỗ trợ tra cứu, chưa thể xếp vào lịch trình theo giờ.");
  if (replacement.status === "closed" || replacement.status === "overloaded") throw new Error("Địa điểm thay thế hiện không phù hợp.");
  const days = trip.days.map(day => ({
    ...day, activities: day.activities.map(activity => {
      if (activity.id !== activityId) return activity;
      if (activity.locked) throw new Error("Mở khóa địa điểm trước khi thay.");
      return { ...activity, destinationId: replacement.id, snapshotRev: replacement.statusRev, reason: "Được bạn chọn làm phương án thay thế." };
    })
  }));
  return recalculateTrip({ ...trip, days }, destinations);
}
export function removeActivity(trip: Trip, activityId: string, destinations: Destination[]) {
  const days = trip.days.map(day => ({ ...day, activities: day.activities.filter(a => a.id !== activityId || a.locked) }));
  return recalculateTrip({ ...trip, days }, destinations);
}
export function moveActivity(trip: Trip, activityId: string, direction: -1 | 1, destinations: Destination[]) {
  const days = trip.days.map(day => {
    const activities = [...day.activities];
    const index = activities.findIndex(a => a.id === activityId);
    const target = index + direction;
    if (index >= 0 && target >= 0 && target < activities.length && !activities[index].locked && !activities[target].locked) {
      [activities[index], activities[target]] = [activities[target], activities[index]];
    }
    return { ...day, activities };
  });
  return recalculateTrip({ ...trip, days }, destinations);
}
export function toggleLock(trip: Trip, activityId: string) {
  return { ...trip, days: trip.days.map(day => ({
    ...day, activities: day.activities.map(a => a.id === activityId ? { ...a, locked: !a.locked } : a)
  })), updatedAt: new Date().toISOString() };
}
export function addActivity(trip: Trip, dayIndex: number, destination: Destination, destinations: Destination[]) {
  if (destination.category === "Khách sạn") throw new Error("Khách sạn hiện chỉ hỗ trợ tra cứu, chưa thể xếp vào lịch trình theo giờ.");
  if (destination.status === "closed" || destination.status === "overloaded") throw new Error("Địa điểm hiện không thể thêm vào lịch trình.");
  const days = trip.days.map((day, index) => index !== dayIndex ? day : ({
    ...day, activities: [...day.activities, {
      id: crypto.randomUUID(), destinationId: destination.id, start: "09:00", end: "09:00",
      travelMinutes: 0, duration: destination.duration, cost: destination.price * trip.input.people,
      locked: false, snapshotRev: destination.statusRev, reason: "Được bạn thêm vào lịch trình."
    }]
  }));
  return recalculateTrip({ ...trip, days }, destinations);
}
export function optimizeTrip(trip: Trip, destinations: Destination[]) {
  const lookup = new Map(destinations.map(d => [d.id, d]));
  let best = recalculateTrip(trip,destinations);
  const travel = (day:Trip["days"][number]) => day.activities.reduce((total,item)=>total+item.travelMinutes,0);
  // Try swaps only when every resulting stop still fits its opening hours.
  for (let dayIndex=0;dayIndex<best.days.length;dayIndex++) {
    let improved=true;
    while(improved){
      improved=false;
      const day=best.days[dayIndex];
      for(let left=0;left<day.activities.length&&!improved;left++)for(let right=left+1;right<day.activities.length;right++){
        if(day.activities[left].locked||day.activities[right].locked)continue;
        const reordered=[...day.activities];[reordered[left],reordered[right]]=[reordered[right],reordered[left]];
        const preview=recalculateTrip({...best,days:best.days.map((item,index)=>index===dayIndex?{...item,activities:reordered}:item)},destinations);
        const candidate=preview.days[dayIndex];
        const feasible=candidate.activities.every(activity=>{const destination=lookup.get(activity.destinationId);return !!destination&&destination.status!=="overloaded"&&
          isOpenAt(destination,candidate.date,toMinutes(activity.start),activity.duration);});
        if(feasible&&travel(candidate)<travel(day)){best=preview;improved=true;break;}
      }
    }
  }
  return best;
}
export function alternativesFor(destination: Destination, destinations: Destination[], trip?: Trip) {
  const used = new Set(trip?.days.flatMap(d => d.activities.map(a => a.destinationId)) || []);
  const remaining = trip ? trip.input.budget - tripCost(trip) : Infinity;
  const originalCost = trip?.days.flatMap(d => d.activities).find(a => a.destinationId === destination.id)?.cost || 0;
  return destinations.filter(d => d.id !== destination.id && !used.has(d.id) &&
    d.status !== "closed" && d.status !== "overloaded" && d.category !== "Khách sạn" &&
    (!trip || d.price * trip.input.people <= remaining + originalCost))
    .sort((a, b) =>
      (Number(b.category === destination.category) * 10 + (trip?.input.interests.filter(tag => b.tags.includes(tag)).length || 0) * 5 - distanceKm(destination, b)) -
      (Number(a.category === destination.category) * 10 + (trip?.input.interests.filter(tag => a.tags.includes(tag)).length || 0) * 5 - distanceKm(destination, a)))
    .slice(0, 8);
}
export type AlertAdjustment = "reschedule" | "move-earlier" | "move-later";
function affectedDay(trip: Trip, activityId: string) {
  return trip.days.find(day => day.activities.some(activity => activity.id === activityId));
}
function dayIsFeasible(trip: Trip, activityId: string, destinations: Destination[]) {
  const day = affectedDay(trip, activityId);
  const lookup = new Map(destinations.map(destination => [destination.id, destination]));
  return !!day && day.activities.every(activity => {
    const destination = lookup.get(activity.destinationId);
    return !!destination && destination.status !== "overloaded" &&
      isOpenAt(destination, day.date, toMinutes(activity.start), activity.duration);
  });
}
export function availableAlertAdjustments(alert: Alert, trip: Trip, destinations: Destination[]): AlertAdjustment[] {
  const day = affectedDay(trip, alert.activityId);
  const activity = day?.activities.find(item => item.id === alert.activityId);
  const destination = destinations.find(item => item.id === alert.destinationId);
  if (!day || !activity || !destination || activity.destinationId !== destination.id ||
      alert.decision !== "pending" || alert.revision !== destination.statusRev ||
      destination.status === "closed" || destination.status === "overloaded" ||
      isOpenAt(destination, day.date, toMinutes(activity.start), activity.duration)) return [];
  const options: AlertAdjustment[] = [];
  const shifted = recalculateTrip(trip, destinations);
  const shiftedActivity = affectedDay(shifted, activity.id)?.activities.find(item => item.id === activity.id);
  if (shiftedActivity?.start !== activity.start && dayIsFeasible(shifted, activity.id, destinations)) options.push("reschedule");
  for (const [direction, kind] of [[-1, "move-earlier"], [1, "move-later"]] as const) {
    const index = day.activities.findIndex(item => item.id === activity.id);
    const neighbor = day.activities[index + direction];
    if (activity.locked || !neighbor || neighbor.locked) continue;
    const moved = moveActivity(trip, activity.id, direction, destinations);
    if (dayIsFeasible(moved, activity.id, destinations)) options.push(kind);
  }
  return options;
}
export function resolveAlertAdjustment(alert: Alert, trip: Trip, adjustment: AlertAdjustment, destinations: Destination[]) {
  const allowed = availableAlertAdjustments(alert, trip, destinations);
  if (!allowed.includes(adjustment)) throw new Error("Phương án điều chỉnh không còn phù hợp. Hãy kiểm tra cập nhật mới.");
  const adjusted = adjustment === "reschedule" ? recalculateTrip(trip, destinations) :
    moveActivity(trip, alert.activityId, adjustment === "move-earlier" ? -1 : 1, destinations);
  const days = adjusted.days.map(day => ({ ...day, activities: day.activities.map(activity =>
    activity.id === alert.activityId ? { ...activity, snapshotRev: alert.revision } : activity) }));
  return { trip: { ...adjusted, days }, alert: { ...alert, decision: "accepted" as const } };
}
export function detectAlerts(trip: Trip, destinations: Destination[], existing: Alert[]): Alert[] {
  const lookup = new Map(destinations.map(d => [d.id, d]));
  const known = new Set(existing.map(a => a.id));
  const alerts: Alert[] = [];
  for (const day of trip.days) for (const activity of day.activities) {
    const destination = lookup.get(activity.destinationId);
    if (!destination || destination.statusRev <= activity.snapshotRev) continue;
    const hoursConflict = !isOpenAt(destination, day.date, toMinutes(activity.start), activity.duration);
    if (!troublesome.has(destination.status) && !hoursConflict) continue;
    const id = `${trip.id}:${activity.id}:${destination.statusRev}`;
    if (known.has(id)) continue;
    const reason = destination.status === "closed" ? "đã được báo tạm đóng cửa" :
      destination.status === "overloaded" ? "được báo quá tải" :
      destination.status === "limited" ? "đang hạn chế tiếp nhận" : "có giờ hoạt động mới không phù hợp";
    alerts.push({
      id, tripId: trip.id, activityId: activity.id, destinationId: destination.id,
      revision: destination.statusRev, status: destination.status,
      message: `${destination.name} ${reason} và ảnh hưởng đến lịch trình ngày ${day.date}.`,
      createdAt: new Date().toISOString(), decision: "pending",
      alternatives: alternativesFor(destination, destinations, trip)
        .filter(candidate => {
          const preview = { ...trip, days: trip.days.map(item => ({ ...item, activities: item.activities.map(stop =>
            stop.id === activity.id ? { ...stop, destinationId: candidate.id } : stop) })) };
          return dayIsFeasible(recalculateTrip(preview, destinations), activity.id, destinations);
        }).slice(0,3).map(candidate => candidate.id)
    });
  }
  return alerts;
}
export function resolveAlert(alert: Alert, trip: Trip, replacement: Destination | null, destinations: Destination[]) {
  if (alert.tripId !== trip.id || alert.decision !== "pending") throw new Error("Cảnh báo không còn hiệu lực.");
  if (!replacement) return { trip, alert: { ...alert, decision: "dismissed" as const } };
  if (!alert.alternatives.includes(replacement.id)) throw new Error("Địa điểm thay thế không hợp lệ.");
  if (!dayIsFeasible(replaceActivity(trip, alert.activityId, replacement, destinations), alert.activityId, destinations))
    throw new Error("Địa điểm thay thế không còn phù hợp với giờ tham quan.");
  return {
    trip: replaceActivity(trip, alert.activityId, replacement, destinations),
    alert: { ...alert, decision: "accepted" as const }
  };
}
