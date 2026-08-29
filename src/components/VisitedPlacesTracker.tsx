import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, 
  Plus, 
  Check, 
  Calendar, 
  Trash2, 
  Edit3, 
  Search, 
  Camera, 
  Compass, 
  Map, 
  Navigation,
  ChevronDown,
  ChevronUp,
  X,
  Award,
  Sparkles,
  BookOpen,
  ZoomIn,
  RefreshCw,
  ExternalLink,
  Star,
  Play
} from 'lucide-react';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from '../lib/firebase';
import { UserProfile, CoupleData, VisitedPlace, VisitedProvinceRecord, JournalEntry } from '../types';
import { isVideoUrl } from '../utils/mediaHelper';

const PlaceMediaThumbnail: React.FC<{
  url?: string;
  thumbnailUrl?: string;
  alt?: string;
  className?: string;
  showPlayBadge?: boolean;
}> = ({ url, thumbnailUrl, alt = 'Media preview', className = 'w-full h-full object-cover', showPlayBadge = true }) => {
  const [hasError, setHasError] = useState(false);
  const isVid = isVideoUrl(url || '');

  if (!url && !thumbnailUrl) return null;

  if (isVid) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-slate-900 flex items-center justify-center">
        {thumbnailUrl && !hasError ? (
          <img
            src={thumbnailUrl}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setHasError(true)}
            className={className}
          />
        ) : (
          <video
            src={url}
            className={`${className} pointer-events-none`}
            preload="metadata"
            muted
            playsInline
          />
        )}
        {showPlayBadge && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-white pointer-events-none">
            <div className="w-5 h-5 rounded-full bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
              <Play className="w-2.5 h-2.5 fill-white text-white translate-x-0.5" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
        <MapPin className="w-4 h-4" />
      </div>
    );
  }

  return (
    <img
      src={thumbnailUrl || url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};

export interface ProvinceInfo {
  name: string;
  region: 'bac' | 'trung' | 'nam';
  regionLabel: string;
  highlightSpot?: string;
}

export const VIETNAM_PROVINCES: ProvinceInfo[] = [
  // Miền Bắc (25)
  { name: 'Hà Nội', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Hồ Gươm, Phố Cổ, Ba Đình' },
  { name: 'Hải Phòng', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Đồ Sơn, Đảo Cát Bà, Vịnh Lan Hạ' },
  { name: 'Quảng Ninh', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Vịnh Hạ Long, Cô Tô, Yên Tử' },
  { name: 'Lào Cai', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Sa Pa, Fansipan, Ô Quy Hồ' },
  { name: 'Hà Giang', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Mã Pí Lèng, Lũng Cú, Đồng Văn' },
  { name: 'Cao Bằng', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Thác Bản Giốc, Pác Bó' },
  { name: 'Bắc Kạn', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Hồ Ba Bể, Động Puông' },
  { name: 'Tuyên Quang', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Tân Trào, Na Hang' },
  { name: 'Lạng Sơn', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Mẫu Sơn, Chợ Đông Kinh' },
  { name: 'Thái Nguyên', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Hồ Núi Cốc, Đồi chè Tân Cương' },
  { name: 'Bắc Giang', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Tây Yên Tử, Vĩnh Nghiêm' },
  { name: 'Bắc Ninh', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Chùa Dâu, Đền Đô, Đông Hồ' },
  { name: 'Phú Thọ', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Đền Hùng, Ao Châu' },
  { name: 'Vĩnh Phúc', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Tam Đảo, Tây Thiên' },
  { name: 'Hải Dương', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Côn Sơn - Kiếp Bạc, Đảo Cò' },
  { name: 'Hưng Yên', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Phố Hiến, Đền Chử Đồng Tử' },
  { name: 'Thái Bình', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Chùa Keo, Biển Đồng Châu' },
  { name: 'Hà Nam', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Chùa Tam Chúc, Bát Cảnh Sơn' },
  { name: 'Nam Định', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Đền Trần, Nhà thờ đổ' },
  { name: 'Ninh Bình', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Tràng An, Hang Múa, Bái Đính' },
  { name: 'Lai Châu', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Khau Phạ, Sì Thâu Chải' },
  { name: 'Điện Biên', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Đồi A1, Mường Thanh' },
  { name: 'Sơn La', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Mộc Châu, Thác Dải Yếm' },
  { name: 'Hòa Bình', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Mai Châu, Hồ Hòa Bình' },
  { name: 'Yên Bái', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Mù Cang Chải, Thác Bà' },

  // Miền Trung & Tây Nguyên (19)
  { name: 'Thanh Hóa', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Sầm Sơn, Pù Luông' },
  { name: 'Nghệ An', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Cửa Lò, Quê Bác' },
  { name: 'Hà Tĩnh', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Đồng Lộc, Thiên Cầm' },
  { name: 'Quảng Bình', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Phong Nha, Thiên Đường' },
  { name: 'Quảng Trị', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Thành Cổ, Vịnh Mốc' },
  { name: 'Thừa Thiên Huế', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Đại Nội, Sông Hương, Thiên Mụ' },
  { name: 'Đà Nẵng', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Cầu Rồng, Bà Nà Hills, Sơn Trà' },
  { name: 'Quảng Nam', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Phố Cổ Hội An, Mỹ Sơn' },
  { name: 'Quảng Ngãi', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Đảo Lý Sơn, Sa Huỳnh' },
  { name: 'Bình Định', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Quy Nhơn, Kỳ Co, Eo Gió' },
  { name: 'Phú Yên', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Gành Đá Đĩa, Mũi Điện' },
  { name: 'Khánh Hòa', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Nha Trang, Bình Ba' },
  { name: 'Ninh Thuận', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Vịnh Vĩnh Hy, Hang Rái' },
  { name: 'Bình Thuận', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Mũi Né, Đảo Phú Quý' },
  { name: 'Kon Tum', region: 'trung', regionLabel: 'Tây Nguyên', highlightSpot: 'Măng Đen, Nhà thờ gỗ' },
  { name: 'Gia Lai', region: 'trung', regionLabel: 'Tây Nguyên', highlightSpot: 'Biển Hồ, Chư Đăng Ya' },
  { name: 'Đắk Lắk', region: 'trung', regionLabel: 'Tây Nguyên', highlightSpot: 'Buôn Ma Thuột, Dray Nur' },
  { name: 'Đắk Nông', region: 'trung', regionLabel: 'Tây Nguyên', highlightSpot: 'Hồ Tà Đùng' },
  { name: 'Lâm Đồng', region: 'trung', regionLabel: 'Tây Nguyên', highlightSpot: 'Đà Lạt, Hồ Xuân Hương' },

  // Miền Nam (19)
  { name: 'TP. Hồ Chí Minh', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Nguyễn Huệ, Landmark 81' },
  { name: 'Bà Rịa - Vũng Tàu', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Bãi Sau, Côn Đảo' },
  { name: 'Bình Dương', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Chùa Bà, Đại Nam' },
  { name: 'Bình Phước', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Bù Gia Mập' },
  { name: 'Đồng Nai', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Giang Điền, Cát Tiên' },
  { name: 'Tây Ninh', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Núi Bà Đen, Tòa Thánh' },
  { name: 'Long An', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Tân Lập, Cánh đồng bất tận' },
  { name: 'Tiền Giang', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Thới Sơn, Cái Bè' },
  { name: 'Bến Tre', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Cồn Phụng, Cái Mơn' },
  { name: 'Trà Vinh', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Ao Bà Om, Chùa Hang' },
  { name: 'Vĩnh Long', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Cù lao An Bình' },
  { name: 'Đồng Tháp', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Làng hoa Sa Đéc, Tràm Chim' },
  { name: 'An Giang', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Rừng tràm Trà Sư, Núi Sam' },
  { name: 'Kiên Giang', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Phú Quốc, Nam Du' },
  { name: 'Cần Thơ', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Cái Răng, Ninh Kiều' },
  { name: 'Hậu Giang', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Ngã Bảy, Lung Ngọc Hoàng' },
  { name: 'Sóc Trăng', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Chùa Dơi, Som Rong' },
  { name: 'Bạc Liêu', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Nhà Công tử, Điện Gió' },
  { name: 'Cà Mau', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Mũi Cà Mau, U Minh Hạ' }
];

// Comprehensive keyword dictionary for detecting Vietnam provinces from location strings
const PROVINCE_ALIASES: Record<string, string[]> = {
  'Hà Nội': ['hà nội', 'ha noi', 'hanoi', 'hn', 'hồ gươm', 'ho guom', 'phố cổ', 'pho co', 'ba đình', 'hoàn kiếm', 'tây hồ', 'cầu giấy', 'mỹ đình', 'tràng tiền', 'long biên', 'thanh xuân', 'đống đa', 'hoàng mai', 'hà đông', 'hồ tây'],
  'TP. Hồ Chí Minh': ['hồ chí minh', 'ho chi minh', 'tp.hcm', 'tphcm', 'tp hcm', 'sài gòn', 'sai gon', 'sg', 'quận 1', 'quận 2', 'quận 3', 'quận 7', 'bình thạnh', 'thủ đức', 'bến thành', 'landmark 81', 'phố đi bộ nguyễn huệ', 'bùi viện', 'nhà thờ đức bà', 'suối tiên', 'đầm sen', 'tân bình', 'gò vấp', 'phú nhuận'],
  'Hải Phòng': ['hải phòng', 'hai phong', 'cát bà', 'cat ba', 'đồ sơn', 'do son', 'vịnh lan hạ', 'bạch long vĩ', 'đảo cát hải'],
  'Quảng Ninh': ['quảng ninh', 'quang ninh', 'hạ long', 'ha long', 'vịnh hạ long', 'cô tô', 'co to', 'yên tử', 'yen tu', 'quan lạn', 'móng cái', 'bãi cháy', 'tuần châu', 'cẩm phả', 'uông bí', 'vân đồn', 'ba chẽ', 'tiên yên'],
  'Lào Cai': ['lào cai', 'lao cai', 'sa pa', 'sapa', 'fansipan', 'fanxipan', 'ô quy hồ', 'o quy ho', 'bắc hà', 'y tý', 'y ty', 'bản cát cát', 'thác bạc', 'đèo ô quy hồ', 'hàm rồng'],
  'Hà Giang': ['hà giang', 'ha giang', 'mã pí lèng', 'ma pi leng', 'lũng cú', 'lung cu', 'đồng văn', 'dong van', 'mèo vạc', 'meo vac', 'yên minh', 'quản bạ', 'hoàng su phì', 'sông nho quế', 'dinh vua mèo', 'du già', 'cột cờ lũng cú', 'núi đôi quản bạ'],
  'Cao Bằng': ['cao bằng', 'cao bang', 'bản giốc', 'ban gioc', 'thác bản giốc', 'pác bó', 'pac bo', 'suối lê nin', 'trùng khánh', 'núi thủng', 'mắt thần núi'],
  'Bắc Kạn': ['bắc kạn', 'bac kan', 'bắc cạn', 'ba bể', 'hồ ba bể', 'ba be', 'động puông', 'thác đầu đẳng', 'chợ đồn'],
  'Tuyên Quang': ['tuyên quang', 'tuyen quang', 'na hang', 'nà hang', 'tân trào', 'tan trao', 'thác mơ', 'lâm bình'],
  'Lạng Sơn': ['lạng sơn', 'lang son', 'mẫu sơn', 'mau son', 'chợ đông kinh', 'tân thanh', 'tam thanh', 'hữu nghị', 'đồng đăng', 'ải chi lăng', 'chùa tam thanh'],
  'Thái Nguyên': ['thái nguyên', 'thai nguyen', 'hồ núi cốc', 'ho nui coc', 'tân cương', 'tan cuong', 'chè tân cương', 'hang phượng hoàng'],
  'Bắc Giang': ['bắc giang', 'bac giang', 'tây yên tử', 'vĩnh nghiêm', 'suối mỡ', 'lục ngạn'],
  'Bắc Ninh': ['bắc ninh', 'bac ninh', 'chùa dâu', 'đền đô', 'đông hồ', 'chùa phật tích', 'hội lim'],
  'Phú Thọ': ['phú thọ', 'phu tho', 'đền hùng', 'den hung', 'ao châu', 'vườn quốc gia xuân sơn', 'việt trì', 'thanh thủy'],
  'Vĩnh Phúc': ['vĩnh phúc', 'vinh phuc', 'tam đảo', 'tam dao', 'tây thiên', 'tay thien', 'đại lải', 'hồ đại lải', 'phúc yên'],
  'Hải Dương': ['hải dương', 'hai duong', 'côn sơn', 'kiếp bạc', 'đảo cò', 'thanh hà'],
  'Hưng Yên': ['hưng yên', 'hung yen', 'phố hiến', 'pho hien', 'chử đồng tử', 'nhãn lồng'],
  'Thái Bình': ['thái bình', 'thai binh', 'chùa keo', 'chua keo', 'đồng châu', 'cồn vành', 'cồn đen'],
  'Hà Nam': ['hà nam', 'ha nam', 'tam chúc', 'tam chuc', 'chùa tam chúc', 'phủ lý', 'bát cảnh sơn', 'địa tạng phi lai'],
  'Nam Định': ['nam định', 'nam dinh', 'đền trần', 'den tran', 'nhà thờ đổ', 'hải hậu', 'quất lâm', 'chùa cổ lễ', 'phủ dầy'],
  'Ninh Bình': ['ninh bình', 'ninh binh', 'tràng an', 'trang an', 'hang múa', 'hang mua', 'bái đính', 'bai dinh', 'tam cốc', 'bích động', 'tuyệt tình cốc', 'hoa lư', 'vườn quốc gia cúc phương', 'thung nham', 'đầm vân long'],
  'Lai Châu': ['lai châu', 'lai chau', 'khau phạ', 'sì thâu chải', 'si thau chai', 'bạch mộc lương tử', 'pusilung', 'đèo hoàng liên sơn'],
  'Điện Biên': ['điện biên', 'dien bien', 'đồi a1', 'mường thanh', 'mường phăng', 'pa khoang', 'apa chải'],
  'Sơn La': ['sơn la', 'son la', 'mộc châu', 'moc chau', 'tà xùa', 'ta xua', 'thác dải yếm', 'rừng thông bản áng', 'đồi chè trái tim'],
  'Hòa Bình': ['hòa bình', 'hoa binh', 'mai châu', 'mai chau', 'hồ hòa bình', 'thung khe', 'kim bôi', 'lương sơn'],
  'Yên Bái': ['yên bái', 'yen bai', 'mù cang chải', 'mu cang chai', 'tú lệ', 'tu le', 'hồ thác bà', 'trạm tấu', 'nghĩa lộ'],
  'Thanh Hóa': ['thanh hóa', 'thanh hoa', 'sầm sơn', 'sam son', 'pù luông', 'pu luong', 'hải tiến', 'bến en', 'lam kinh', 'thành nhà hồ'],
  'Nghệ An': ['nghệ an', 'nghe an', 'cửa lò', 'cua lo', 'nam đàn', 'quê bác', 'tp vinh', 'bãi lữ', 'đảo chè thanh chương'],
  'Hà Tĩnh': ['hà tĩnh', 'ha tinh', 'ngã ba đồng lộc', 'thiên cầm', 'thien cam', 'hồ kẻ gỗ', 'nguyễn du'],
  'Quảng Bình': ['quảng bình', 'quang binh', 'phong nha', 'kẻ bàng', 'động thiên đường', 'sơn đoòng', 'son doong', 'đồng hới', 'hang én', 'suối nước moọc', 'sông chày'],
  'Quảng Trị': ['quảng trị', 'quang tri', 'thành cổ', 'vịnh mốc', 'địa đạo vịnh mốc', 'cửa tùng', 'la vang', 'khe sanh'],
  'Thừa Thiên Huế': ['thừa thiên huế', 'thua thien hue', 'huế', 'hue', 'đại nội', 'dai noi', 'sông hương', 'song huong', 'chùa thiên mụ', 'lăng khải định', 'lăng tự đức', 'lăng minh mạng', 'phá tam giang', 'lăng cô', 'vịnh lăng cô', 'bạch mã'],
  'Đà Nẵng': ['đà nẵng', 'da nang', 'danang', 'cầu rồng', 'cau rong', 'bà nà', 'ba na', 'bana hills', 'sơn trà', 'bán đảo sơn trà', 'ngũ hành sơn', 'mỹ khê', 'biển mỹ khê', 'cầu vàng', 'cầu sông hàn', 'hải vân'],
  'Quảng Nam': ['quảng nam', 'quang nam', 'hội an', 'hoi an', 'phố cổ hội an', 'mỹ sơn', 'thánh địa mỹ sơn', 'cù lao chàm', 'tam kỳ', 'biển an bàng', 'làng gốm thanh hà'],
  'Quảng Ngãi': ['quảng ngãi', 'quang ngai', 'lý sơn', 'ly son', 'đảo lý sơn', 'sa huỳnh', 'mỹ khê quảng ngãi', 'ba tơ'],
  'Bình Định': ['bình định', 'binh dinh', 'quy nhơn', 'quy nhon', 'eo gió', 'eo gio', 'kỳ co', 'ky co', 'ghềnh ráng', 'cù lao xanh', 'hòn khô', 'tháp đôi'],
  'Phú Yên': ['phú yên', 'phu yen', 'tuy hòa', 'tuy hoa', 'gành đá đĩa', 'ghềnh đá đĩa', 'mũi điện', 'vũng rô', 'bãi xép', 'đầm ô loan', 'tháp nghinh phong'],
  'Khánh Hòa': ['khánh hòa', 'khanh hoa', 'nha trang', 'nhatrang', 'bình ba', 'bình hưng', 'bình lập', 'cam ranh', 'vịnh vân phong', 'điệp sơn', 'hòn tằm', 'hòn mun', 'vinpearl', 'tháp bà ponagar'],
  'Ninh Thuận': ['ninh thuận', 'ninh thuan', 'phan rang', 'vĩnh hy', 'vinh hy', 'hang rái', 'hang rai', 'mũi dinh', 'tháp chàm', 'đồi cát nam cương', 'vườn nho'],
  'Bình Thuận': ['bình thuận', 'binh thuan', 'phan thiết', 'phan thiet', 'mũi né', 'mui ne', 'phú quý', 'đảo phú quý', 'bàu trắng', 'hòn rơm', 'kê gà', 'hải đăng kê gà'],
  'Kon Tum': ['kon tum', 'kontum', 'măng đen', 'mang den', 'nhà thờ gỗ', 'cầu treo kon klor', 'ngã ba đông dương'],
  'Gia Lai': ['gia lai', 'pleiku', 'biển hồ', 'bien ho', 'chư đăng ya', 'chu dang ya', 'hồ t\'nưng', 'thác phú cường'],
  'Đắk Lắk': ['đắk lắk', 'dak lak', 'đắc lắc', 'buôn ma thuột', 'buon ma thuot', 'bmt', 'bản đôn', 'hồ lắk', 'dray nur', 'dray sap', 'bảo tàng cà phê'],
  'Đắk Nông': ['đắk nông', 'dak nong', 'tà đùng', 'ta dung', 'hồ tà đùng', 'gia nghĩa', 'thác dray sáp'],
  'Lâm Đồng': ['lâm đồng', 'lam dong', 'đà lạt', 'da lat', 'dalat', 'hồ xuân hương', 'langbiang', 'lang biang', 'bảo lộc', 'thung lũng tình yêu', 'hồ tuyền lâm', 'đồi chè cầu đất', 'thác datanla', 'chợ đêm đà lạt'],
  'Bà Rịa - Vũng Tàu': ['bà rịa', 'vũng tàu', 'vung tau', 'vt', 'côn đảo', 'con dao', 'hồ tràm', 'ho tram', 'long hải', 'xuyên mộc', 'bãi trước', 'bãi sau', 'tượng chúa kito', 'ngọn hải đăng vũng tàu'],
  'Bình Dương': ['bình dương', 'binh duong', 'thủ dầu một', 'dĩ an', 'thuận an', 'đại nam', 'lạc cảnh đại nam', 'chùa bà thiên hậu'],
  'Bình Phước': ['bình phước', 'binh phuoc', 'đồng xoài', 'bù gia mập', 'núi bà rá', 'thác mơ'],
  'Đồng Nai': ['đồng nai', 'dong nai', 'biên hòa', 'giang điền', 'thác giang điền', 'nam cát tiên', 'cát tiên', 'hồ trị an', 'bò cạp vàng'],
  'Tây Ninh': ['tây ninh', 'tay ninh', 'núi bà đen', 'nui ba den', 'tòa thánh', 'hồ dầu tiếng', 'ma thiên lãnh'],
  'Long An': ['long an', 'tân an', 'làng nổi tân lập', 'tân lập', 'cánh đồng bất tận', 'bến lức'],
  'Tiền Giang': ['tiền giang', 'tien giang', 'mỹ tho', 'my tho', 'cái bè', 'cù lao thới sơn', 'chợ nổi cái bè', 'trại rắn đồng tâm'],
  'Bến Tre': ['bến tre', 'ben tre', 'cồn phụng', 'mỏ cày', 'cái mơn', 'châu thành', 'sân chim vàm hồ'],
  'Trà Vinh': ['trà vinh', 'tra vinh', 'ao bà om', 'chùa hang', 'biển ba động', 'chùa âng'],
  'Vĩnh Long': ['vĩnh long', 'vinh long', 'cù lao an bình', 'chợ nổi trà ôn'],
  'Đồng Tháp': ['đồng tháp', 'dong thap', 'cao lãnh', 'sa đéc', 'sa dec', 'tràm chim', 'làng hoa sa đéc', 'xẻo quýt', 'gò tháp'],
  'An Giang': ['an giang', 'long xuyên', 'châu đốc', 'chau doc', 'trà sư', 'rừng tràm trà sư', 'núi sam', 'miếu bà chúa xứ', 'tri tôn', 'thất sơn'],
  'Kiên Giang': ['kiên giang', 'kien giang', 'phú quốc', 'phu quoc', 'nam du', 'đảo nam du', 'rạch giá', 'hà tiên', 'hòn thơm', 'hòn sơn', 'hòn mây rút', 'grand world', 'bãi sao', 'bãi khem'],
  'Cần Thơ': ['cần thơ', 'can tho', 'bến ninh kiều', 'ninh kiều', 'chợ nổi cái răng', 'cái răng', 'cồn sơn', 'nhà cổ bình thủy'],
  'Hậu Giang': ['hậu giang', 'hau giang', 'vị thanh', 'ngã bảy', 'chợ nổi ngã bảy', 'lung ngọc hoàng'],
  'Sóc Trăng': ['sóc trăng', 'soc trang', 'chùa dơi', 'chùa chén kiểu', 'som rong', 'chùa som rong', 'hồ nước ngọt'],
  'Bạc Liêu': ['bạc liêu', 'bac lieu', 'nhà công tử bạc liêu', 'công tử bạc liêu', 'cánh đồng điện gió', 'điện gió bạc liêu', 'nhà thờ tắc sậy', 'cha diệp'],
  'Cà Mau': ['cà mau', 'ca mau', 'đất mũi', 'mũi cà mau', 'u minh', 'rừng u minh hạ', 'hòn đá bạc', 'đầm thị tường']
};

/**
 * Normalizes string by removing accents and lowercasing for fuzzy matching
 */
const removeVietnameseTones = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

/**
 * Smart detector for finding matching province from location, title, or address
 */
export const detectProvince = (location?: string, title?: string, address?: string): ProvinceInfo | undefined => {
  const combinedRaw = `${location || ''} ${title || ''} ${address || ''}`.toLowerCase();
  const combinedNormalized = removeVietnameseTones(combinedRaw);

  if (!combinedRaw.trim()) return undefined;

  // 1. Direct name match
  for (const prov of VIETNAM_PROVINCES) {
    const provRaw = prov.name.toLowerCase();
    const provNorm = removeVietnameseTones(prov.name);

    if (combinedRaw.includes(provRaw) || combinedNormalized.includes(provNorm)) {
      return prov;
    }
  }

  // 2. Aliases & Landmark match
  for (const [provName, aliases] of Object.entries(PROVINCE_ALIASES)) {
    for (const alias of aliases) {
      const aliasRaw = alias.toLowerCase();
      const aliasNorm = removeVietnameseTones(alias);

      if (combinedRaw.includes(aliasRaw) || combinedNormalized.includes(aliasNorm)) {
        return VIETNAM_PROVINCES.find(p => p.name === provName);
      }
    }
  }

  return undefined;
};

export interface UnifiedPlaceItem {
  id: string;
  name: string;
  province: string;
  region: 'bac' | 'trung' | 'nam';
  dateVisited?: string;
  imageUrl?: string;
  images?: string[];
  thumbnailUrl?: string;
  isVideo?: boolean;
  note?: string;
  rating?: number;
  authorName?: string;
  authorUid?: string;
  isFromJournal: boolean;
  journalRef?: JournalEntry;
}

interface VisitedPlacesTrackerProps {
  coupleId: string;
  userProfile: UserProfile;
  coupleData?: CoupleData | null;
  journals?: JournalEntry[];
  defaultCollapsed?: boolean;
  onOpenJournalLightbox?: (journal: JournalEntry, imageIndex?: number) => void;
}

export const VisitedPlacesTracker: React.FC<VisitedPlacesTrackerProps> = ({
  coupleId,
  userProfile,
  coupleData,
  journals = [],
  defaultCollapsed = false,
  onOpenJournalLightbox
}) => {
  const [visitedProvinces, setVisitedProvinces] = useState<Record<string, VisitedProvinceRecord>>({});
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [activeSubView, setActiveSubView] = useState<'provinces' | 'places'>('provinces');
  const [placeOriginFilter, setPlaceOriginFilter] = useState<'all' | 'journal' | 'custom'>('all');
  const [regionFilter, setRegionFilter] = useState<'all' | 'visited' | 'bac' | 'trung' | 'nam'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Modal: Add / Edit Visited Place
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [placeProvince, setPlaceProvince] = useState(VIETNAM_PROVINCES[0].name);
  const [placeDate, setPlaceDate] = useState(new Date().toISOString().split('T')[0]);
  const [placeNote, setPlaceNote] = useState('');
  const [placeRating, setPlaceRating] = useState(5);
  const [placeImageUrl, setPlaceImageUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [savingPlace, setSavingPlace] = useState(false);

  // Modal: Province Details & Note & Associated Memories
  const [selectedProvince, setSelectedProvince] = useState<ProvinceInfo | null>(null);
  const [provinceNotesInput, setProvinceNotesInput] = useState('');
  const [provinceDateInput, setProvinceDateInput] = useState('');

  // Image compressor
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Real-time Firestore sync
  useEffect(() => {
    if (!coupleId) return;

    const provCol = collection(db, 'couples', coupleId, 'visited_provinces');
    const unsubProv = onSnapshot(provCol, (snapshot) => {
      const map: Record<string, VisitedProvinceRecord> = {};
      snapshot.forEach((d) => {
        map[d.id] = { id: d.id, ...d.data() } as VisitedProvinceRecord;
      });
      setVisitedProvinces(map);
    }, (err) => {
      if (err?.message?.includes('closing') || err?.message?.includes('hidden')) return;
      console.warn('Lỗi tải danh sách tỉnh thành đã đi:', err);
    });

    const placesCol = collection(db, 'couples', coupleId, 'visited_places');
    const placesQ = query(placesCol, orderBy('createdAt', 'desc'));
    const unsubPlaces = onSnapshot(placesQ, (snapshot) => {
      const list: VisitedPlace[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as VisitedPlace);
      });
      setVisitedPlaces(list);
    }, (err) => {
      if (err?.message?.includes('closing') || err?.message?.includes('hidden')) return;
      console.warn('Lỗi tải danh sách địa điểm đã đi:', err);
    });

    return () => {
      unsubProv();
      unsubPlaces();
    };
  }, [coupleId]);

  // Extract memory-based places from journals
  const journalPlaces = useMemo<UnifiedPlaceItem[]>(() => {
    return journals
      .filter((j) => (j.location && j.location.trim().length > 0) || (j.locationAddress && j.locationAddress.trim().length > 0))
      .map((j) => {
        const detected = detectProvince(j.location, j.title, j.locationAddress);
        const provinceName = detected ? detected.name : (j.location || 'Địa điểm kỷ niệm');
        const region = detected ? detected.region : 'bac';
        
        const allMedia = j.images && j.images.length > 0 ? j.images : (j.imageUrl ? [j.imageUrl] : []);
        const firstNonVideo = allMedia.find((m) => !isVideoUrl(m));
        const mainImg = j.images && j.images.length > 0 
          ? j.images[j.mainImageIndex || 0] || j.images[0]
          : j.imageUrl;
        
        const isVid = mainImg ? isVideoUrl(mainImg) : false;
        const thumb = mainImg && j.videoThumbnails?.[mainImg]
          ? j.videoThumbnails[mainImg]
          : firstNonVideo;

        return {
          id: `journal_${j.id}`,
          name: j.location || j.title,
          province: provinceName,
          region,
          dateVisited: j.date,
          imageUrl: mainImg,
          thumbnailUrl: thumb,
          isVideo: isVid,
          images: j.images,
          note: j.content || j.title,
          authorName: j.authorName,
          authorUid: j.authorUid,
          isFromJournal: true,
          journalRef: j
        };
      });
  }, [journals]);

  // Unified list of all places (Custom added + From Journals)
  const allUnifiedPlaces = useMemo<UnifiedPlaceItem[]>(() => {
    const custom: UnifiedPlaceItem[] = visitedPlaces.map((p) => {
      const isVid = p.imageUrl ? isVideoUrl(p.imageUrl) : false;
      return {
        id: p.id,
        name: p.name,
        province: p.province,
        region: p.region,
        dateVisited: p.dateVisited,
        imageUrl: p.imageUrl,
        thumbnailUrl: undefined,
        isVideo: isVid,
        note: p.note,
        rating: p.rating,
        authorName: p.addedByName,
        authorUid: p.addedByUid,
        isFromJournal: false
      };
    });

    return [...journalPlaces, ...custom];
  }, [visitedPlaces, journalPlaces]);

  // Group places & journals by province
  const provinceDetailsMap = useMemo(() => {
    const map: Record<string, {
      totalCount: number;
      journalCount: number;
      customCount: number;
      items: UnifiedPlaceItem[];
      latestDate?: string;
    }> = {};

    allUnifiedPlaces.forEach((item) => {
      if (!map[item.province]) {
        map[item.province] = {
          totalCount: 0,
          journalCount: 0,
          customCount: 0,
          items: []
        };
      }
      map[item.province].totalCount += 1;
      if (item.isFromJournal) {
        map[item.province].journalCount += 1;
      } else {
        map[item.province].customCount += 1;
      }
      map[item.province].items.push(item);
      if (item.dateVisited) {
        if (!map[item.province].latestDate || item.dateVisited > map[item.province].latestDate!) {
          map[item.province].latestDate = item.dateVisited;
        }
      }
    });

    return map;
  }, [allUnifiedPlaces]);

  // Auto-sync journal memories to 63 provinces in Firestore
  const handleSyncMemoriesToProvinces = async () => {
    if (!coupleId) return;
    setIsAutoSyncing(true);
    let newlyAddedCount = 0;

    try {
      for (const jPlace of journalPlaces) {
        const prov = VIETNAM_PROVINCES.find(p => p.name === jPlace.province);
        if (prov && !visitedProvinces[prov.name]) {
          const provDocRef = doc(db, 'couples', coupleId, 'visited_provinces', prov.name);
          const record: VisitedProvinceRecord = {
            id: prov.name,
            provinceName: prov.name,
            region: prov.region,
            visitedAt: jPlace.dateVisited || new Date().toISOString().split('T')[0],
            notes: `Kỷ niệm nhật ký: ${jPlace.name} (${jPlace.journalRef?.title || ''})`,
            addedByUid: jPlace.authorUid || userProfile.uid,
            addedByName: jPlace.authorName || userProfile.displayName,
            createdAt: new Date().toISOString()
          };
          await setDoc(provDocRef, record, { merge: true });
          newlyAddedCount++;
        }
      }

      setSyncSuccessMsg(
        newlyAddedCount > 0 
          ? `Đã cập nhật ${newlyAddedCount} tỉnh thành từ các bài viết kỷ niệm!` 
          : `Tất cả ${journalPlaces.length} kỷ niệm đã được đồng bộ chuẩn xác!`
      );
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Lỗi đồng bộ kỷ niệm:', err);
    } finally {
      setIsAutoSyncing(false);
    }
  };

  // Combined visited status: Province is visited if marked in Firestore OR present in journal/custom places
  const isProvinceVisited = (provName: string): boolean => {
    return !!visitedProvinces[provName] || !!provinceDetailsMap[provName];
  };

  // Stats calculation
  const totalVisitedProvincesCount = useMemo(() => {
    const visitedSet = new Set<string>();
    Object.keys(visitedProvinces).forEach(p => visitedSet.add(p));
    Object.keys(provinceDetailsMap).forEach(p => {
      if (VIETNAM_PROVINCES.some(vp => vp.name === p)) {
        visitedSet.add(p);
      }
    });
    return visitedSet.size;
  }, [visitedProvinces, provinceDetailsMap]);

  const percentage = Math.round((totalVisitedProvincesCount / 63) * 100);

  const getMilestoneTitle = () => {
    if (totalVisitedProvincesCount >= 63) return '🏆 Chinh phục 63 Tỉnh Thành!';
    if (totalVisitedProvincesCount >= 45) return '👑 Phượt thủ xuyên Việt';
    if (totalVisitedProvincesCount >= 30) return '🚀 Nửa dặm đất nước';
    if (totalVisitedProvincesCount >= 15) return '🌟 Đam mê xê dịch';
    if (totalVisitedProvincesCount >= 5) return '🌱 Dấu chân mở rộng';
    if (totalVisitedProvincesCount >= 1) return '✨ Những bước chân đầu tiên';
    return '🗺️ Bắt đầu hành trình';
  };

  // Toggle visited province
  const handleToggleProvince = async (province: ProvinceInfo) => {
    if (!coupleId) return;
    const isVisited = isProvinceVisited(province.name);

    try {
      const provDocRef = doc(db, 'couples', coupleId, 'visited_provinces', province.name);
      if (isVisited && visitedProvinces[province.name]) {
        await deleteDoc(provDocRef);
      } else {
        const record: VisitedProvinceRecord = {
          id: province.name,
          provinceName: province.name,
          region: province.region,
          visitedAt: new Date().toISOString().split('T')[0],
          notes: `Đã cùng nhau đặt chân đến ${province.name}!`,
          addedByUid: userProfile.uid,
          addedByName: userProfile.displayName,
          createdAt: new Date().toISOString()
        };
        await setDoc(provDocRef, record);
      }
    } catch (err) {
      console.error('Lỗi cập nhật tỉnh thành:', err);
    }
  };

  const handleOpenProvinceDetails = (province: ProvinceInfo) => {
    setSelectedProvince(province);
    const existing = visitedProvinces[province.name];
    const details = provinceDetailsMap[province.name];
    setProvinceNotesInput(existing?.notes || (details ? `Đã có ${details.totalCount} kỷ niệm gắn liền với ${province.name}` : ''));
    setProvinceDateInput(existing?.visitedAt || details?.latestDate || new Date().toISOString().split('T')[0]);
  };

  const handleSaveProvinceDetails = async () => {
    if (!coupleId || !selectedProvince) return;
    try {
      const provDocRef = doc(db, 'couples', coupleId, 'visited_provinces', selectedProvince.name);
      const record: VisitedProvinceRecord = {
        id: selectedProvince.name,
        provinceName: selectedProvince.name,
        region: selectedProvince.region,
        visitedAt: provinceDateInput || new Date().toISOString().split('T')[0],
        notes: provinceNotesInput.trim() || `Đã cùng nhau khám phá ${selectedProvince.name}!`,
        addedByUid: userProfile.uid,
        addedByName: userProfile.displayName,
        createdAt: new Date().toISOString()
      };
      await setDoc(provDocRef, record, { merge: true });
      setSelectedProvince(null);
    } catch (err) {
      console.error('Lỗi lưu thông tin tỉnh:', err);
    }
  };

  const handleOpenEditPlace = (place: UnifiedPlaceItem) => {
    if (place.isFromJournal) return;
    setEditingPlaceId(place.id);
    setPlaceName(place.name);
    setPlaceProvince(place.province);
    setPlaceDate(place.dateVisited || new Date().toISOString().split('T')[0]);
    setPlaceNote(place.note || '');
    setPlaceRating(place.rating || 5);
    setPlaceImageUrl(place.imageUrl || '');
    setShowPlaceModal(true);
  };

  const handleOpenAddPlace = (preselectedProvince?: string) => {
    setEditingPlaceId(null);
    setPlaceName('');
    setPlaceProvince(preselectedProvince || VIETNAM_PROVINCES[0].name);
    setPlaceDate(new Date().toISOString().split('T')[0]);
    setPlaceNote('');
    setPlaceRating(5);
    setPlaceImageUrl('');
    setShowPlaceModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageLoading(true);
    try {
      const base64 = await compressImage(file);
      setPlaceImageUrl(base64);
    } catch (err) {
      console.error('Lỗi tải ảnh:', err);
    } finally {
      setImageLoading(false);
    }
  };

  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleId || !placeName.trim()) return;

    setSavingPlace(true);
    try {
      const selectedProvObj = VIETNAM_PROVINCES.find(p => p.name === placeProvince);
      const region = selectedProvObj ? selectedProvObj.region : 'bac';

      if (editingPlaceId) {
        const placeDocRef = doc(db, 'couples', coupleId, 'visited_places', editingPlaceId);
        await updateDoc(placeDocRef, {
          name: placeName.trim(),
          province: placeProvince,
          region,
          dateVisited: placeDate,
          note: placeNote.trim(),
          rating: placeRating,
          imageUrl: placeImageUrl || null
        });
      } else {
        const placesCol = collection(db, 'couples', coupleId, 'visited_places');
        const newPlace: Omit<VisitedPlace, 'id'> = {
          name: placeName.trim(),
          province: placeProvince,
          region,
          dateVisited: placeDate,
          note: placeNote.trim(),
          rating: placeRating,
          imageUrl: placeImageUrl || null,
          addedByUid: userProfile.uid,
          addedByName: userProfile.displayName,
          createdAt: new Date().toISOString()
        };
        await addDoc(placesCol, newPlace);

        if (!visitedProvinces[placeProvince]) {
          const provDocRef = doc(db, 'couples', coupleId, 'visited_provinces', placeProvince);
          await setDoc(provDocRef, {
            id: placeProvince,
            provinceName: placeProvince,
            region,
            visitedAt: placeDate,
            notes: `Khám phá địa điểm: ${placeName.trim()}`,
            addedByUid: userProfile.uid,
            addedByName: userProfile.displayName,
            createdAt: new Date().toISOString()
          });
        }
      }

      setShowPlaceModal(false);
    } catch (err) {
      console.error('Lỗi lưu địa điểm:', err);
    } finally {
      setSavingPlace(false);
    }
  };

  const handleDeletePlace = async (id: string) => {
    if (!coupleId) return;
    if (!window.confirm('Bạn có chắc muốn xóa địa điểm này khỏi danh sách?')) return;
    try {
      await deleteDoc(doc(db, 'couples', coupleId, 'visited_places', id));
    } catch (err) {
      console.error('Lỗi xóa địa điểm:', err);
    }
  };

  // Filtered provinces
  const filteredProvinces = useMemo(() => {
    return VIETNAM_PROVINCES.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.highlightSpot && p.highlightSpot.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchSearch) return false;

      if (regionFilter === 'all') return true;
      if (regionFilter === 'visited') return isProvinceVisited(p.name);
      return p.region === regionFilter;
    });
  }, [searchTerm, regionFilter, visitedProvinces, provinceDetailsMap]);

  // Filtered places
  const filteredPlaces = useMemo(() => {
    return allUnifiedPlaces.filter((place) => {
      const matchSearch = place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          place.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (place.note && place.note.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchSearch) return false;

      if (placeOriginFilter === 'journal' && !place.isFromJournal) return false;
      if (placeOriginFilter === 'custom' && place.isFromJournal) return false;

      if (regionFilter === 'all' || regionFilter === 'visited') return true;
      return place.region === regionFilter;
    });
  }, [allUnifiedPlaces, searchTerm, placeOriginFilter, regionFilter]);

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">

      {/* Compact journey header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">
                  Hành trình Việt Nam
                </h3>
                <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-black border border-rose-100">
                  {totalVisitedProvincesCount}/63
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500 font-medium">
                {allUnifiedPlaces.length} địa điểm · {percentage}% Việt Nam
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSyncMemoriesToProvinces}
            disabled={isAutoSyncing}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-slate-200"
            title="Đồng bộ từ Nhật ký"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAutoSyncing ? 'animate-spin text-rose-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddPlace()}
            className="h-8 px-3 flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] font-bold shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm nơi</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer border border-slate-200"
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Compact progress */}
      <div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(percentage, totalVisitedProvincesCount > 0 ? 3 : 0)}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-500 font-medium truncate">
            {getMilestoneTitle()}
          </span>
          {journalPlaces.length > 0 && (
            <span className="text-[10px] text-rose-500 font-semibold shrink-0">
              {journalPlaces.length} từ Nhật ký
            </span>
          )}
        </div>
      </div>

      {syncSuccessMsg && (
        <div className="bg-emerald-50 text-emerald-700 text-[11px] px-3 py-2 rounded-xl border border-emerald-200 font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-200">

          {/* Main switch */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
            <button
              type="button"
              onClick={() => setActiveSubView('provinces')}
              className={`py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSubView === 'provinces'
                  ? 'bg-white text-rose-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Tỉnh thành
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('places')}
              className={`py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSubView === 'places'
                  ? 'bg-white text-rose-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              Địa điểm
            </button>
          </div>

          {/* Compact filters */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRegionFilter('all')}
              className={`h-8 px-2.5 rounded-xl text-[10px] font-bold transition shrink-0 cursor-pointer ${
                regionFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả
            </button>

            <button
              type="button"
              onClick={() => setRegionFilter('visited')}
              className={`h-8 px-2.5 rounded-xl text-[10px] font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                regionFilter === 'visited'
                  ? 'bg-rose-500 text-white'
                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
              }`}
            >
              <Check className="w-3 h-3" />
              Đã đi
            </button>

            <select
              value={regionFilter === 'bac' || regionFilter === 'trung' || regionFilter === 'nam' ? regionFilter : ''}
              onChange={(e) => {
                const value = e.target.value as 'bac' | 'trung' | 'nam' | '';
                setRegionFilter(value || 'all');
              }}
              className="h-8 min-w-0 rounded-xl bg-white border border-slate-200 px-2 text-[10px] font-semibold text-slate-600 outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
              aria-label="Lọc theo miền"
            >
              <option value="">Miền</option>
              <option value="bac">Miền Bắc</option>
              <option value="trung">Trung & Tây Nguyên</option>
              <option value="nam">Miền Nam</option>
            </select>

            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={activeSubView === 'provinces' ? 'Tìm tỉnh...' : 'Tìm địa điểm...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-full pl-8 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400 focus:bg-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Source filter only for places */}
          {activeSubView === 'places' && (
            <div className="flex items-center gap-1">
              {[
                { id: 'all', label: `Tất cả ${allUnifiedPlaces.length}` },
                { id: 'journal', label: `Nhật ký ${journalPlaces.length}` },
                { id: 'custom', label: `Tự thêm ${visitedPlaces.length}` },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPlaceOriginFilter(item.id as 'all' | 'journal' | 'custom')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                    placeOriginFilter === item.id
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* PROVINCES — no nested scroll */}
          {activeSubView === 'provinces' && (
            <div>
              {filteredProvinces.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Không tìm thấy tỉnh thành phù hợp.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredProvinces.map((prov) => {
                    const visited = isProvinceVisited(prov.name);
                    const details = provinceDetailsMap[prov.name];
                    const latestDate = visitedProvinces[prov.name]?.visitedAt || details?.latestDate;
                    const previewImages = details?.items
                      ?.filter((item) => !!item.imageUrl || !!item.thumbnailUrl)
                      .slice(0, 3) || [];

                    return (
                      <div
                        key={prov.name}
                        className={`rounded-2xl border transition overflow-hidden ${
                          visited
                            ? 'bg-white border-rose-200 shadow-2xs'
                            : 'bg-white border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="p-3 flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleOpenProvinceDetails(prov)}
                            className="min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4 className={`text-xs font-black truncate ${visited ? 'text-slate-900' : 'text-slate-800'}`}>
                                {prov.name}
                              </h4>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${
                                prov.region === 'bac'
                                  ? 'bg-blue-50 text-blue-600'
                                  : prov.region === 'trung'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {prov.region === 'bac' ? 'Bắc' : prov.region === 'trung' ? 'Trung' : 'Nam'}
                              </span>
                            </div>

                            {visited ? (
                              <div className="mt-1 space-y-1">
                                <p className="text-[10px] text-slate-500">
                                  {details
                                    ? `${details.journalCount} kỷ niệm${details.customCount > 0 ? ` · ${details.customCount} địa điểm` : ''}`
                                    : 'Đã đánh dấu từng ghé'}
                                </p>
                                {latestDate && (
                                  <p className="text-[9px] text-slate-400">
                                    Gần nhất · {latestDate}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="mt-1 text-[10px] text-slate-400 line-clamp-1">
                                {prov.highlightSpot || 'Chưa có kỷ niệm'}
                              </p>
                            )}
                          </button>

                          {visited ? (
                            <button
                              type="button"
                              onClick={() => handleOpenProvinceDetails(prov)}
                              className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                              title={`Xem hành trình ${prov.name}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleProvince(prov)}
                              className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center shrink-0 cursor-pointer transition"
                              title={`Đánh dấu đã đi ${prov.name}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {visited && previewImages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenProvinceDetails(prov)}
                            className="px-3 pb-3 w-full cursor-pointer"
                          >
                            <div className="flex gap-1.5">
                              {previewImages.map((item, idx) => (
                                <div
                                  key={`${item.id}_${idx}`}
                                  className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 shrink-0 bg-slate-100"
                                >
                                  <PlaceMediaThumbnail
                                    url={item.imageUrl}
                                    thumbnailUrl={item.thumbnailUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    showPlayBadge={true}
                                  />
                                </div>
                              ))}
                              {details && details.totalCount > previewImages.length && (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 text-[9px] font-bold flex items-center justify-center">
                                  +{details.totalCount - previewImages.length}
                                </div>
                              )}
                            </div>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PLACES — compact rows, no nested scroll */}
          {activeSubView === 'places' && (
            <div className="space-y-2">
              {filteredPlaces.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <p>Chưa có địa điểm hoặc kỷ niệm theo bộ lọc.</p>
                  <button
                    type="button"
                    onClick={() => handleOpenAddPlace()}
                    className="px-3 py-1.5 bg-rose-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Thêm nơi đã đi
                  </button>
                </div>
              ) : (
                filteredPlaces.map((place) => (
                  <div
                    key={place.id}
                    className={`p-2.5 rounded-2xl border bg-white transition flex items-center gap-2.5 ${
                      place.isFromJournal
                        ? 'border-rose-100 hover:border-rose-200'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {place.imageUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (place.journalRef && onOpenJournalLightbox) {
                            onOpenJournalLightbox(place.journalRef, place.journalRef.mainImageIndex || 0);
                          }
                        }}
                        className={`w-[68px] h-[68px] rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 ${
                          place.journalRef && onOpenJournalLightbox ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <PlaceMediaThumbnail
                          url={place.imageUrl}
                          thumbnailUrl={place.thumbnailUrl}
                          alt={place.name}
                          className="w-full h-full object-cover"
                          showPlayBadge={true}
                        />
                      </button>
                    ) : (
                      <div className="w-[54px] h-[54px] rounded-xl bg-slate-50 border border-slate-100 shrink-0 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-slate-300" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {place.name}
                        </h4>
                        {place.isFromJournal && (
                          <span className="shrink-0 text-[8px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
                            Nhật ký
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 min-w-0">
                        <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                        <span className="truncate">{place.province}</span>
                        {place.dateVisited && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="shrink-0">{place.dateVisited}</span>
                          </>
                        )}
                      </div>

                      {(place.authorName || place.note) && (
                        <p className="mt-1 text-[9px] text-slate-400 truncate">
                          {place.authorName ? `${place.authorName}` : ''}
                          {place.authorName && place.note ? ' · ' : ''}
                          {place.note || ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {place.isFromJournal ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (place.journalRef && onOpenJournalLightbox) {
                              onOpenJournalLightbox(place.journalRef, 0);
                            }
                          }}
                          className="h-8 px-2.5 rounded-xl text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="hidden sm:inline">Xem</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditPlace(place)}
                            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition flex items-center justify-center cursor-pointer"
                            title="Sửa địa điểm"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlace(place.id)}
                            className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition flex items-center justify-center cursor-pointer"
                            title="Xóa địa điểm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.province}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition flex items-center justify-center"
                        title="Chỉ đường"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: PROVINCE DETAILS & MEMORIES VIEWER */}
      {selectedProvince && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{selectedProvince.name}</h3>
                  <p className="text-[11px] text-slate-400">{selectedProvince.regionLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProvince(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedProvince.highlightSpot && (
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 text-xs text-amber-800">
                <span className="font-bold">✨ Điểm nổi tiếng: </span>
                <span>{selectedProvince.highlightSpot}</span>
              </div>
            )}

            {provinceDetailsMap[selectedProvince.name]?.items?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                  <span>Kỷ niệm & Địa điểm đã ghé ({provinceDetailsMap[selectedProvince.name].totalCount})</span>
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {provinceDetailsMap[selectedProvince.name].items.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        if (item.journalRef && onOpenJournalLightbox) {
                          onOpenJournalLightbox(item.journalRef, 0);
                        }
                      }}
                      className="p-2 bg-slate-50 hover:bg-rose-50/50 rounded-xl border border-slate-100 transition flex items-center gap-2.5 cursor-pointer"
                    >
                      {item.imageUrl && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 shrink-0 bg-slate-100">
                          <PlaceMediaThumbnail
                            url={item.imageUrl}
                            thumbnailUrl={item.thumbnailUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            showPlayBadge={true}
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{item.dateVisited}</span>
                          {item.isFromJournal && <span className="text-rose-500 font-semibold">• Nhật ký</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày ghé thăm gần nhất
                </label>
                <input
                  type="date"
                  value={provinceDateInput}
                  onChange={(e) => setProvinceDateInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú cảm xúc / Kỷ niệm đặc biệt
                </label>
                <textarea
                  rows={2}
                  value={provinceNotesInput}
                  onChange={(e) => setProvinceNotesInput(e.target.value)}
                  placeholder={`Ví dụ: Lần đầu cùng nhau đi ngắm hoàng hôn tại ${selectedProvince.name}...`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedProvince(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveProvinceDetails}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT VISITED PLACE */}
      {showPlaceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form 
            onSubmit={handleSavePlace}
            className="bg-white rounded-3xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>{editingPlaceId ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm kỷ niệm'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPlaceModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên địa điểm / Quán xá / Điểm check-in <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đồi chè Cầu Đất, Thung lũng tình yêu..."
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tỉnh / Thành phố
                  </label>
                  <select
                    value={placeProvince}
                    onChange={(e) => setPlaceProvince(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400 focus:bg-white"
                  >
                    {VIETNAM_PROVINCES.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.regionLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày đi
                  </label>
                  <input
                    type="date"
                    value={placeDate}
                    onChange={(e) => setPlaceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ảnh kỷ niệm tại địa điểm
                </label>
                <div className="flex items-center gap-3">
                  {placeImageUrl ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                      <PlaceMediaThumbnail
                        url={placeImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        showPlayBadge={true}
                      />
                      <button
                        type="button"
                        onClick={() => setPlaceImageUrl('')}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-rose-500 transition cursor-pointer z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : null}

                  <label className="flex-1 border border-dashed border-slate-300 hover:border-rose-400 rounded-xl p-3 text-center cursor-pointer transition bg-slate-50/50 hover:bg-rose-50/20">
                    <Camera className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                    <span className="text-[11px] text-slate-600 font-semibold block">
                      {imageLoading ? 'Đang nén ảnh...' : 'Chọn ảnh chụp tại đây'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={imageLoading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú kỷ niệm
                </label>
                <textarea
                  rows={2}
                  placeholder="Kỷ niệm đáng nhớ ở đây..."
                  value={placeNote}
                  onChange={(e) => setPlaceNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400 focus:bg-white resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPlaceModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingPlace || imageLoading}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {savingPlace ? 'Đang lưu...' : 'Lưu địa điểm'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};