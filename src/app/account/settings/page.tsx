import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AccountSettings from "@/components/AccountSettings";
export const dynamic="force-dynamic";
export const metadata={title:"Cài đặt tài khoản"};
export default async function Page(){const user=await currentUser();if(!user)redirect("/account");return <AccountSettings user={user}/>;}
