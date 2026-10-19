import { test, expect } from "@playwright/test";

test("home filters show matching places beside the controls on mobile",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await expect(page.getByRole("heading",{level:1})).toHaveText("Đi đúng để trải nghiệm thật.");
  await page.getByRole("button",{name:"Bộ lọc"}).click();
  const panel=page.locator("#home-filter-panel");
  await panel.getByRole("button",{name:"Nhà hàng"}).click();
  const results=page.getByRole("region",{name:"Kết quả lọc"});
  await expect(results.getByText("1 địa điểm phù hợp")).toBeVisible();
  await expect(results.locator(".destination-card")).toHaveCount(1);
  await expect(results.getByText("Pizza 4P’s Tràng Tiền")).toBeVisible();
  await panel.getByLabel("Giá minh họa tối đa").selectOption("50000");
  await expect(results.getByText("0 địa điểm phù hợp")).toBeVisible();
  await panel.getByRole("button",{name:"Xóa bộ lọc"}).click();
  await expect(results.getByText(/địa điểm phù hợp/)).not.toHaveText("0 địa điểm phù hợp");
  await panel.getByRole("button",{name:"Bảo tàng"}).click();
  await expect(results.getByText("6 địa điểm phù hợp")).toBeVisible();
  await panel.getByRole("button",{name:"Khách sạn"}).click();
  await expect(results.getByText("2 địa điểm phù hợp")).toBeVisible();
  await panel.getByLabel("Giá minh họa tối đa").selectOption("50000");
  await expect(results.getByText("0 địa điểm phù hợp")).toBeVisible();
});

test("itinerary map renders map tiles",async({page})=>{
  const loadedTiles:string[]=[];
  page.on("response",response=>{if(response.ok()&&response.url().includes("tiles.openfreemap.org/planet/"))loadedTiles.push(response.url());});
  await page.goto("/trip");
  await page.getByRole("button",{name:"Tạo lịch trình với AI"}).click();
  const map=page.locator(".map-wrap");
  await expect(map).toBeVisible();
  await expect(map.locator(".maplibregl-canvas")).toBeVisible();
  await expect.poll(()=>loadedTiles.length).toBeGreaterThan(0);
  await expect(map.locator(".maplibregl-ctrl-attrib")).toContainText("OpenMapTiles");
  await expect(map.locator(".map-fallback")).toHaveCount(0);
});
