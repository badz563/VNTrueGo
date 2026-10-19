import Image from "next/image";
import Link from "next/link";
import credits from "../../../data/photo-credits.json";

export const metadata = { title: "Nguồn và giấy phép ảnh" };

export default function PhotoCreditsPage() {
  return <div className="container photo-credits-page">
    <Link href="/" className="text-link">← Khám phá địa điểm</Link>
    <h1>Nguồn và giấy phép ảnh</h1>
    <p>Ảnh chụp thật từ Wikimedia Commons. Ảnh đã được thu nhỏ và chuyển sang WebP để dùng trong ứng dụng; nội dung ảnh không được thêm chi tiết mới. Tên tác giả và giấy phép của từng ảnh được ghi bên dưới.</p>
    <p>Ảnh món phở cho Phở 10 Lý Quốc Sư và ảnh pizza cho Pizza 4P’s Tràng Tiền chỉ minh họa món ăn, không phải ảnh chụp tại hai cơ sở.</p>
    <ol className="photo-credit-list">
      {credits.map(credit => <li id={credit.id} key={credit.id} className="content-card photo-credit-item">
        <Image src={credit.image} alt={credit.photoRole === "actual place" ? `Ảnh chụp ${credit.name}` : `Ảnh món ăn minh họa cho ${credit.name}`} width={160} height={105} sizes="160px"/>
        <div>
          <h2>{credit.name}</h2>
          <p>Tác giả: {credit.creator} · <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">{credit.license}</a></p>
          {credit.photoRole !== "actual place" && <p>Ảnh món ăn minh họa, không chụp tại cơ sở.</p>}
          <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">Xem ảnh gốc trên Wikimedia Commons ↗</a>
        </div>
      </li>)}
    </ol>
  </div>;
}
