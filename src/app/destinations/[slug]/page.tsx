import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { destinationBySlug } from "@/lib/db";
import DetailClient from "@/components/DetailClient";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;const d=await destinationBySlug(slug);
  return {title:d?.name||"Địa điểm",description:d?.description};
}
export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const destination=await destinationBySlug(slug);
  if(!destination) notFound();
  return <DetailClient initial={destination}/>;
}
