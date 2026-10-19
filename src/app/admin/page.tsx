import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AdminClient from "@/components/AdminClient";
export const dynamic="force-dynamic";
export const metadata={title:"Quản trị"};
export default async function Page(){const user=await currentUser();if(user?.role!=="admin")redirect("/account");return <AdminClient/>;}
