import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir:"./tests/e2e",timeout:60000,expect:{timeout:20000},
  use:{baseURL:"http://127.0.0.1:3101",trace:"retain-on-failure",screenshot:"only-on-failure"},
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],
  webServer:{command:"node scripts/playwright-server.mjs",url:"http://127.0.0.1:3101",reuseExistingServer:false,timeout:120000}
});
