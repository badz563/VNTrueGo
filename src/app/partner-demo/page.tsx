import PartnerClient from "@/components/PartnerClient";
import { demoWritesAllowed } from "@/lib/db";
export const metadata={title:"Partner demo dashboard"};
export default function Page(){return <PartnerClient writable={demoWritesAllowed()}/>;}
