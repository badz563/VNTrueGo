import PartnerClient from "@/components/PartnerClient";
import { demoWritesAllowed } from "@/lib/db";
export const metadata={title:"Quản lý thông tin điểm đến"};
export default function Page(){return <PartnerClient writable={demoWritesAllowed()}/>;}
