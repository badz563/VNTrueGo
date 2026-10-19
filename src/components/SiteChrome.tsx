"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell, Compass, MapPinned, Plus, UserRound } from "lucide-react";
import { useApp } from "./AppProvider";
import { t } from "@/lib/i18n";
export default function SiteChrome({children}:{children:React.ReactNode}) {
  const path=usePathname();
  const {lang,setLang,alerts}=useApp();
  const unread=alerts.filter(a=>a.decision==="pending").length;
  const links=[
    {href:"/",key:"explore" as const,icon:Compass},
    {href:"/trip",key:"trips" as const,icon:MapPinned},
    {href:"/alerts",key:"alerts" as const,icon:Bell},
    {href:"/profile",key:"profile" as const,icon:UserRound}
  ];
  return <>
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="VietNam TrueGo trang chủ"><span className="brand-symbol"><Image src="/brand-logo.png" alt="" width={96} height={96} priority/></span><span>True<span className="brand-accent">Go</span><small>VIETNAM</small></span></Link>
        <nav className="desktop-nav" aria-label="Điều hướng chính">
          {links.map(({href,key})=><Link key={href} href={href} className={path===href?"nav-link active":"nav-link"}>{t(lang,key)}{key==="alerts"&&unread>0&&<span className="nav-dot"/>}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="account-link" href="/translate" aria-label="Dịch nhanh">VI↔EN</Link>
          <Link className="account-link" href="/account" aria-label="Tài khoản"><UserRound size={19}/></Link>
          <button className="language-switch" onClick={()=>setLang(lang==="vi"?"en":"vi")} aria-label={lang==="vi"?"Switch to English":"Chuyển sang tiếng Việt"}>{lang==="vi"?"EN":"VI"}</button>
          <Link className="header-plan" href="/trip"><Plus size={17}/>{t(lang,"create")}</Link>
        </div>
      </div>
    </header>
    <main id="main-content">{children}</main>
    <nav className="bottom-nav" aria-label="Điều hướng chính trên điện thoại">
      {links.map(({href,key,icon:Icon})=><Link key={href} href={href} className={path===href?"bottom-link active":"bottom-link"}>
        <span className="bottom-icon"><Icon size={21} strokeWidth={path===href?2.3:1.8}/>{key==="alerts"&&unread>0&&<i/>}</span><span>{t(lang,key)}</span>
      </Link>)}
    </nav>
  </>;
}
