import type { Language, Status } from "./types";
const words = {
  vi: {
    explore:"Khám phá", trips:"Lịch trình", alerts:"Thông báo", profile:"Cá nhân",
    search:"Tìm địa điểm, trải nghiệm...", heroEyebrow:"KHÁM PHÁ HÀ NỘI THEO CÁCH CỦA BẠN",
    heroTitle:"Đi thật xa. Hiểu thật sâu.", heroBody:"Những hành trình ý nghĩa bắt đầu từ một nơi chốn phù hợp với bạn.",
    create:"Tạo lịch trình với AI", featured:"Điểm đến nổi bật", seeAll:"Xem tất cả",
    discover:"Khám phá điểm đến", all:"Tất cả", add:"Thêm vào lịch trình",
    detail:"Xem chi tiết", demo:"DỮ LIỆU DEMO", noFresh:"Chưa có thông tin mới",
    status:"Trạng thái", estimated:"Tham khảo", saved:"Đã lưu",
    emptyTrip:"Chưa có lịch trình nào", emptyAlerts:"Chưa có cảnh báo mới",
    noResults:"Không tìm thấy địa điểm phù hợp", createTrip:"Lên kế hoạch chuyến đi",
    tryAgain:"Thử lại", loading:"Đang tải...", map:"Bản đồ", fullscreen:"Toàn màn hình",
    normal:"Báo bình thường", busy:"Báo đông khách", overloaded:"Báo quá tải",
    limited:"Hạn chế tiếp nhận", closed:"Tạm đóng cửa", unknown:"Chưa có thông tin mới",
    low:"Thấp (dự báo demo)", moderate:"Vừa (dự báo demo)", high:"Cao (dự báo demo)"
  },
  en: {
    explore:"Explore", trips:"Itinerary", alerts:"Alerts", profile:"Profile",
    search:"Search places and experiences...", heroEyebrow:"EXPLORE HANOI YOUR WAY",
    heroTitle:"Go further. Feel deeper.", heroBody:"Meaningful journeys begin with places that fit you.",
    create:"Create a smart itinerary", featured:"Featured places", seeAll:"View all",
    discover:"Discover places", all:"All", add:"Add to itinerary",
    detail:"View details", demo:"DEMO DATA", noFresh:"No recent information",
    status:"Status", estimated:"Illustrative", saved:"Saved",
    emptyTrip:"No itinerary yet", emptyAlerts:"No new alerts",
    noResults:"No matching places found", createTrip:"Plan your trip",
    tryAgain:"Try again", loading:"Loading...", map:"Map", fullscreen:"Full screen",
    normal:"Reported normal", busy:"Reported busy", overloaded:"Reported overcrowded",
    limited:"Limited entry", closed:"Temporarily closed", unknown:"No recent information",
    low:"Low (demo forecast)", moderate:"Moderate (demo forecast)", high:"High (demo forecast)"
  }
} as const;
export type WordKey = keyof typeof words.vi;
export function t(lang: Language, key: WordKey) { return words[lang][key]; }
export function statusText(lang: Language, status: Status) { return t(lang, status); }
const categories:Record<string,string>={
  "Bảo tàng":"Museum","Di tích lịch sử":"Historic site","Di sản văn hóa":"Cultural heritage",
  "Công trình kiến trúc":"Architecture","Danh lam thắng cảnh":"Scenic place"
};
const interests:Record<string,string>={
  "lịch sử":"History","văn hóa":"Culture","nghệ thuật":"Art","thiên nhiên":"Nature",
  "nhiếp ảnh":"Photography","yên tĩnh":"Quiet places"
};
export function categoryText(lang:Language,value:string){return lang==="en"?categories[value]||value:value;}
export function interestText(lang:Language,value:string){return lang==="en"?interests[value]||value:value;}
export function localizeError(lang:Language,message:string){
  if(lang==="vi")return message;
  if(message.includes("Hà Nội"))return "This demo currently supports Hanoi only.";
  if(message.includes("Không tìm được"))return "No places match your interests, hours and budget.";
  if(message.includes("1 đến 7 ngày"))return "Choose a trip lasting 1 to 7 days.";
  if(message.includes("Giờ đóng cửa"))return "Closing time must be after opening time.";
  if(message.includes("Phản hồi"))return "Feedback must be 10 to 500 characters.";
  if(message.includes("lịch trình"))return "Please check your itinerary details and try again.";
  return "Something went wrong. Please try again.";
}
