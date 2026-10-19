import { spawn } from "node:child_process";
import path from "node:path";

const child=spawn(process.execPath,[path.join(process.cwd(),"node_modules","next","dist","bin","next"),"dev","--hostname","127.0.0.1","--port","3101"],{
  stdio:"inherit",
  env:{...process.env,DATABASE_PATH:path.join(process.cwd(),"data","truego-e2e.sqlite"),TURSO_DATABASE_URL:"",TURSO_AUTH_TOKEN:""}
});
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>child.kill(signal));
child.on("exit",code=>process.exit(code??0));
