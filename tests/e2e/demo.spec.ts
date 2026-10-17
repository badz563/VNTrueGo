import { test, expect } from "@playwright/test";
test("visitor trip reacts to partner closure and accepts a replacement",async({browser,request})=>{
  await request.post("/api/partner/reset");
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const visitor=await context.newPage();
  await visitor.goto("/trip");
  await visitor.getByRole("button",{name:"Tạo lịch trình với AI"}).click();
  await expect(visitor.getByText("Đã tạo và lưu lịch trình")).toBeVisible();
  const original=await visitor.evaluate(()=>JSON.parse(localStorage.getItem("truego:v1")||"{}").trips[0]);
  const first=original.days[0].activities[0];
  const destinations=(await (await request.get("/api/destinations")).json()).destinations;
  const affected=destinations.find((d:{id:string})=>d.id===first.destinationId);
  const partner=await context.newPage();await partner.goto("/partner-demo");
  await partner.locator(".partner-item").filter({hasText:affected.name}).click();
  await partner.getByRole("button",{name:"Mô phỏng tạm đóng cửa"}).click();
  await expect(partner.getByText("Phiên du khách sẽ nhận thay đổi")).toBeVisible();
  await visitor.goto("/alerts");
  await expect(visitor.getByText("TẠM ĐÓNG CỬA",{exact:true})).toBeVisible();
  await visitor.locator(".alternative-row button").first().click();
  await expect(visitor.getByText("Đã điều chỉnh")).toBeVisible();
  const updated=await visitor.evaluate(()=>JSON.parse(localStorage.getItem("truego:v1")||"{}").trips[0]);
  const changed=updated.days.flatMap((d:{activities:unknown[]})=>d.activities).find((a:{id:string})=>a.id===first.id);
  expect(changed.destinationId).not.toBe(first.destinationId);
  expect(changed.start).toMatch(/^\d{2}:\d{2}$/);
  await context.close();
  await request.post("/api/partner/reset");
});
test("changed opening hours offer a time adjustment that updates the saved trip",async({browser,request})=>{
  await request.post("/api/partner/reset");
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const visitor=await context.newPage();
  await visitor.goto("/trip");
  await visitor.getByRole("button",{name:/Thư giãn/}).click();
  await visitor.getByRole("button",{name:"Tạo lịch trình với AI"}).click();
  await expect(visitor.getByText("Đã tạo và lưu lịch trình")).toBeVisible();
  const original=await visitor.evaluate(()=>JSON.parse(localStorage.getItem("truego:v1")||"{}").trips[0]);
  const first=original.days[0].activities[0];
  const destinations=(await (await request.get("/api/destinations")).json()).destinations;
  const affected=destinations.find((d:{id:string})=>d.id===first.destinationId);
  const [hours,minutes]=first.start.split(":").map(Number);
  const newOpen=String(hours+Math.floor((minutes+30)/60)).padStart(2,"0")+":"+String((minutes+30)%60).padStart(2,"0");
  const update=await request.patch(`/api/partner/destinations/${affected.id}`,{data:{opening:{open:newOpen,close:"23:00"}}});
  expect(update.ok()).toBe(true);
  await visitor.goto("/alerts");
  await visitor.getByRole("button",{name:"Đổi giờ tham quan"}).click();
  await expect(visitor.getByText("Đã điều chỉnh")).toBeVisible();
  const updated=await visitor.evaluate(()=>JSON.parse(localStorage.getItem("truego:v1")||"{}").trips[0]);
  const changed=updated.days[0].activities.find((activity:{id:string})=>activity.id===first.id);
  expect(changed.start).toBe(newOpen);
  expect(changed.snapshotRev).toBeGreaterThan(first.snapshotRev);
  await context.close();
  await request.post("/api/partner/reset");
});
test("saved interests survive reload and preselect a new itinerary",async({page})=>{
  await page.goto("/profile");
  const interest=page.getByRole("button",{name:"Thiên nhiên"});
  await interest.click();
  await page.reload();
  await expect(page.getByRole("button",{name:"Thiên nhiên"})).toHaveAttribute("aria-pressed","true");
  await page.goto("/trip");
  await expect(page.getByRole("button",{name:"Thiên nhiên"})).toHaveClass(/selected/);
});
test("adding a place twice does not duplicate it in the saved itinerary",async({page})=>{
  await page.goto("/");
  const first=page.locator(".destination-card").first();
  await first.locator(".card-plus").click();
  await expect(first.getByText("Đã thêm vào lịch trình")).toBeVisible();
  await first.locator(".card-plus").click();
  await expect(first.getByText("Đã có trong lịch trình")).toBeVisible();
  const activities=await page.evaluate(()=>JSON.parse(localStorage.getItem("truego:v1")||"{}").trips[0].days[0].activities);
  expect(activities).toHaveLength(1);
});
test("mobile and desktop layouts avoid horizontal overflow",async({page})=>{
  const pageErrors:string[]=[];
  page.on("pageerror",error=>pageErrors.push(error.message));
  for(const size of [{width:320,height:640},{width:375,height:812},{width:390,height:844},{width:430,height:932},{width:1440,height:900}]){
    await page.setViewportSize(size);
    for(const route of ["/","/trip","/alerts","/profile","/partner-demo","/destinations/van-mieu-quoc-tu-giam"]){
      await page.goto(route);
      await expect(page.getByRole("heading",{level:1})).toBeVisible();
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
      expect(overflow,`${route} at ${size.width}px`).toBeLessThanOrEqual(1);
    }
  }
  expect(pageErrors).toEqual([]);
});
