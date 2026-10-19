import { NextResponse } from "next/server";
import { endSession, sameOrigin } from "@/lib/auth";
export const runtime="nodejs";
export async function POST(request:Request){if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});await endSession();return NextResponse.json({ok:true});}
