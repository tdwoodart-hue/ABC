// Exact coordinates for all 63 Provinces & Major Landmarks across Vietnam

export interface LocationGeoPoint {
  title: string;
  aliases: string[];
  lat: number;
  lng: number;
  province?: string;
  category?: 'cafe' | 'date' | 'travel' | 'food' | 'special' | 'landmark';
}

// 63 Provinces & Centroids
export const PROVINCE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Miền Bắc
  'Hà Nội': { lat: 21.0285, lng: 105.8542 },
  'Hải Phòng': { lat: 20.8449, lng: 106.6881 },
  'Quảng Ninh': { lat: 20.9505, lng: 107.0734 },
  'Lào Cai': { lat: 22.4856, lng: 103.9707 },
  'Hà Giang': { lat: 22.8233, lng: 104.9839 },
  'Cao Bằng': { lat: 22.6663, lng: 106.2576 },
  'Bắc Kạn': { lat: 22.1471, lng: 105.8348 },
  'Tuyên Quang': { lat: 21.8234, lng: 105.2180 },
  'Lạng Sơn': { lat: 21.8537, lng: 106.7624 },
  'Thái Nguyên': { lat: 21.5942, lng: 105.8481 },
  'Bắc Giang': { lat: 21.2731, lng: 106.1946 },
  'Bắc Ninh': { lat: 21.1861, lng: 106.0763 },
  'Phú Thọ': { lat: 21.3228, lng: 105.2280 },
  'Vĩnh Phúc': { lat: 21.3609, lng: 105.5474 },
  'Hải Dương': { lat: 20.9373, lng: 106.3146 },
  'Hưng Yên': { lat: 20.6464, lng: 106.0511 },
  'Thái Bình': { lat: 20.4463, lng: 106.3365 },
  'Hà Nam': { lat: 20.5453, lng: 105.9122 },
  'Nam Định': { lat: 20.4345, lng: 106.1683 },
  'Ninh Bình': { lat: 20.2506, lng: 105.9744 },
  'Lai Châu': { lat: 22.3963, lng: 103.4684 },
  'Điện Biên': { lat: 21.3853, lng: 103.0205 },
  'Sơn La': { lat: 21.3278, lng: 103.9188 },
  'Hòa Bình': { lat: 20.8171, lng: 105.3376 },
  'Yên Bái': { lat: 21.7168, lng: 104.8974 },

  // Miền Trung & Tây Nguyên
  'Thanh Hóa': { lat: 19.8067, lng: 105.7852 },
  'Nghệ An': { lat: 18.6734, lng: 105.6813 },
  'Hà Tĩnh': { lat: 18.3560, lng: 105.9058 },
  'Quảng Bình': { lat: 17.4690, lng: 106.6223 },
  'Quảng Trị': { lat: 16.7454, lng: 107.1855 },
  'Thừa Thiên Huế': { lat: 16.4637, lng: 107.5909 },
  'Đà Nẵng': { lat: 16.0544, lng: 108.2022 },
  'Quảng Nam': { lat: 15.5394, lng: 108.0195 },
  'Quảng Ngãi': { lat: 15.1205, lng: 108.7923 },
  'Bình Định': { lat: 13.7830, lng: 109.2197 },
  'Phú Yên': { lat: 13.0882, lng: 109.3090 },
  'Khánh Hòa': { lat: 12.2388, lng: 109.1967 },
  'Ninh Thuận': { lat: 11.5659, lng: 108.9882 },
  'Bình Thuận': { lat: 10.9333, lng: 108.1000 },
  'Kon Tum': { lat: 14.3497, lng: 108.0005 },
  'Gia Lai': { lat: 13.9833, lng: 108.0000 },
  'Đắk Lắk': { lat: 12.6667, lng: 108.0333 },
  'Đắk Nông': { lat: 12.0000, lng: 107.6833 },
  'Lâm Đồng': { lat: 11.9404, lng: 108.4583 },

  // Miền Nam
  'TP. Hồ Chí Minh': { lat: 10.8231, lng: 106.6297 },
  'Bà Rịa - Vũng Tàu': { lat: 10.3460, lng: 107.0843 },
  'Bình Dương': { lat: 11.1667, lng: 106.6667 },
  'Bình Phước': { lat: 11.7500, lng: 106.9000 },
  'Đồng Nai': { lat: 10.9574, lng: 106.8427 },
  'Tây Ninh': { lat: 11.3100, lng: 106.0983 },
  'Long An': { lat: 10.5333, lng: 106.4167 },
  'Tiền Giang': { lat: 10.3500, lng: 106.3500 },
  'Bến Tre': { lat: 10.2333, lng: 106.3833 },
  'Trà Vinh': { lat: 9.9347, lng: 106.3455 },
  'Vĩnh Long': { lat: 10.2537, lng: 105.9722 },
  'Đồng Tháp': { lat: 10.4578, lng: 105.6328 },
  'An Giang': { lat: 10.3833, lng: 105.4167 },
  'Kiên Giang': { lat: 10.0125, lng: 105.0809 },
  'Cần Thơ': { lat: 10.0452, lng: 105.7469 },
  'Hậu Giang': { lat: 9.7844, lng: 105.4706 },
  'Sóc Trăng': { lat: 9.6033, lng: 105.9800 },
  'Bạc Liêu': { lat: 9.2941, lng: 105.7278 },
  'Cà Mau': { lat: 9.1769, lng: 105.1524 }
};

// Rich catalog of famous dating, travel & romantic spots in Vietnam
export const FAMOUS_DATE_SPOTS: LocationGeoPoint[] = [
  // Hà Nội & Vùng lân cận
  { title: 'Hồ Hoàn Kiếm (Hồ Gươm)', aliases: ['hồ gươm', 'ho guom', 'hồ hoàn kiếm', 'hoan kiem', 'tháp rùa', 'cầu thê húc', 'đền ngọc sơn', 'tràng tiền'], lat: 21.0285, lng: 105.8542, province: 'Hà Nội', category: 'date' },
  { title: 'Hồ Tây (Lộng gió & Hoàng hôn)', aliases: ['hồ tây', 'ho tay', 'đường thanh niên', 'phủ tây hồ', 'bến hàn quốc', 'bến nhật bản', 'trích sài', 'quảng an', 'thung lũng hoa hồ tây'], lat: 21.0583, lng: 105.8236, province: 'Hà Nội', category: 'date' },
  { title: 'Phố Cổ Hà Nội', aliases: ['phố cổ', 'pho co', 'hàng ngang', 'hàng đào', 'tạ hiện', 'hàng mã', 'chợ đồng xuân', 'ô quan chưởng'], lat: 21.0352, lng: 105.8497, province: 'Hà Nội', category: 'date' },
  { title: 'Nhà Thờ Lớn Hà Nội', aliases: ['nhà thờ lớn', 'nha tho lon', 'nhà thờ chính tòa', 'trà chanh nhà thờ', 'phố nhà chung'], lat: 21.0288, lng: 105.8490, province: 'Hà Nội', category: 'cafe' },
  { title: 'Khu di tích danh thắng Yên Tử', aliases: ['yên tử', 'yen tu', 'chùa đồng yên tử', 'uông bí', 'ngọa vân'], lat: 21.1578, lng: 106.7196, province: 'Quảng Ninh', category: 'travel' },
  { title: 'Vườn quốc gia Ba Vì', aliases: ['ba vì', 'ba vi', 'vườn quốc gia ba vì', 'rừng thông ba vì', 'nhà thờ đổ ba vì'], lat: 21.0827, lng: 105.3619, province: 'Hà Nội', category: 'travel' },
  { title: 'Tam Đảo (Thị trấn trong mây)', aliases: ['tam đảo', 'tam dao', 'quảng trường tam đảo', 'quán gió tam đảo', 'cầu mây tam đảo', 'nhà thờ đá tam đảo'], lat: 21.4589, lng: 105.6469, province: 'Vĩnh Phúc', category: 'travel' },

  // Quảng Ninh & Hải Phòng
  { title: 'Vịnh Hạ Long', aliases: ['vịnh hạ long', 'vinh ha long', 'hạ long', 'ha long', 'bãi cháy', 'tuần châu', 'hòn trống mái'], lat: 20.9101, lng: 107.1839, province: 'Quảng Ninh', category: 'travel' },
  { title: 'Đảo Cô Tô', aliases: ['cô tô', 'co to', 'đảo cô tô', 'bãi đá móng rồng', 'bãi biển hồng vàn', 'bãi biển vàn chảy'], lat: 20.9856, lng: 107.7656, province: 'Quảng Ninh', category: 'travel' },
  { title: 'Đảo Cát Bà & Vịnh Lan Hạ', aliases: ['cát bà', 'cat ba', 'vịnh lan hạ', 'vinh lan ha', 'vườn quốc gia cát bà', 'bãi tắm cát cò'], lat: 20.7258, lng: 107.0494, province: 'Hải Phòng', category: 'travel' },

  // Tây Bắc & Đông Bắc
  { title: 'Thị trấn Sa Pa & Đỉnh Fansipan', aliases: ['sa pa', 'sapa', 'fansipan', 'fanxipan', 'bản cát cát', 'thác bạc', 'đèo ô quy hồ', 'nhà thờ đá sapa'], lat: 22.3364, lng: 103.8438, province: 'Lào Cai', category: 'travel' },
  { title: 'Hà Giang & Đèo Mã Pí Lèng', aliases: ['mã pí lèng', 'ma pi leng', 'hà giang', 'lũng cú', 'đồng văn', 'sông nho quế', 'hẻm tu sản'], lat: 23.2389, lng: 105.4197, province: 'Hà Giang', category: 'travel' },
  { title: 'Thác Bản Giốc', aliases: ['bản giốc', 'thác bản giốc', 'ban gioc', 'trùng khánh', 'pác bó'], lat: 22.8544, lng: 106.7236, province: 'Cao Bằng', category: 'travel' },
  { title: 'Mộc Châu (Đồi chè & Thung lũng mận)', aliases: ['mộc châu', 'moc chau', 'tà xùa', 'ta xua', 'thác dải yếm', 'rừng thông bản áng', 'đồi chè trái tim'], lat: 20.8433, lng: 104.6469, province: 'Sơn La', category: 'travel' },
  { title: 'Mai Châu (Hòa Bình)', aliases: ['mai châu', 'mai chau', 'bản lác', 'đèo thung khe', 'hồ hòa bình'], lat: 20.6689, lng: 105.0847, province: 'Hòa Bình', category: 'travel' },
  { title: 'Mù Cang Chải (Ruộng bậc thang)', aliases: ['mù cang chải', 'mu cang chai', 'đèo khau phạ', 'đồi mâm xôi', 'la pán tẩn'], lat: 21.8497, lng: 104.0847, province: 'Yên Bái', category: 'travel' },

  // Ninh Bình
  { title: 'Quần thể danh thắng Tràng An & Hang Múa', aliases: ['tràng an', 'trang an', 'hang múa', 'hang mua', 'bái đính', 'tam cốc', 'tuyệt tình cốc ninh bình', 'vườn chim thung nham'], lat: 20.2506, lng: 105.9144, province: 'Ninh Bình', category: 'travel' },

  // Huế - Đà Nẵng - Hội An
  { title: 'Đại Nội Huế & Cố Đô Huế', aliases: ['đại nội huế', 'đại nội', 'dai noi', 'chùa thiên mụ', 'sông hương', 'lăng khải định', 'lăng tự đức', 'cầu tràng tiền', 'vịnh lăng cô'], lat: 16.4699, lng: 107.5796, province: 'Thừa Thiên Huế', category: 'special' },
  { title: 'Bà Nà Hills & Cầu Vàng (Đà Nẵng)', aliases: ['bà nà', 'bana hills', 'cầu vàng', 'cầu rồng', 'bán đảo sơn trà', 'biển mỹ khê', 'ngũ hành sơn', 'cầu tình yêu đà nẵng'], lat: 15.9989, lng: 107.9961, province: 'Đà Nẵng', category: 'date' },
  { title: 'Phố Cổ Hội An (Đèn lồng lung linh)', aliases: ['hội an', 'hoi an', 'phố cổ hội an', 'chùa cầu', 'sông hoài', 'thả hoa đăng hội an', 'rừng dừa bảy mẫu', 'biển an bàng'], lat: 15.8801, lng: 108.3380, province: 'Quảng Nam', category: 'date' },

  // Nha Trang - Phú Yên - Quy Nhơn
  { title: 'Quy Nhơn (Kỳ Co & Eo Gió)', aliases: ['quy nhơn', 'quy nhon', 'eo gió', 'eo gio', 'kỳ co', 'ky co', 'hòn khô', 'ghềnh ráng tiên sa', 'cù lao xanh'], lat: 13.9214, lng: 109.2847, province: 'Bình Định', category: 'travel' },
  { title: 'Phú Yên (Gành Đá Đĩa & Mũi Điện)', aliases: ['phú yên', 'phu yen', 'gành đá đĩa', 'ghềnh đá đĩa', 'mũi điện', 'bãi xép', 'vũng rô', 'tháp nghinh phong'], lat: 13.3556, lng: 109.2978, province: 'Phú Yên', category: 'travel' },
  { title: 'Nha Trang (Biển xanh & Vinpearl)', aliases: ['nha trang', 'nhatrang', 'vinpearl nha trang', 'vịnh nha trang', 'hòn tằm', 'hòn mun', 'bình ba', 'bình hưng', 'bình lập', 'tháp bà ponagar'], lat: 12.2388, lng: 109.1967, province: 'Khánh Hòa', category: 'travel' },

  // Đà Lạt & Tây Nguyên
  { title: 'Đà Lạt (Thành phố ngàn hoa & Tình yêu)', aliases: ['đà lạt', 'da lat', 'dalat', 'hồ xuân hương', 'thung lũng tình yêu', 'hồ tuyền lâm', 'đồi chè cầu đất', 'quảng trường lâm viên', 'chợ đêm đà lạt', 'núi langbiang', 'tiệm cafe túi mơ to', 'thác datanla'], lat: 11.9404, lng: 108.4507, province: 'Lâm Đồng', category: 'date' },
  { title: 'Măng Đen (Kon Tum - Nàng thơ Tây Nguyên)', aliases: ['măng đen', 'mang den', 'hồ đak ke', 'thác pa sỹ', 'tượng đức mẹ măng đen'], lat: 14.6014, lng: 108.2917, province: 'Kon Tum', category: 'travel' },
  { title: 'Hồ Tà Đùng (Vịnh Hạ Long Tây Nguyên)', aliases: ['tà đùng', 'ta dung', 'hồ tà đùng', 'đắk nông'], lat: 11.8547, lng: 107.9622, province: 'Đắk Nông', category: 'travel' },

  // Phan Thiết & Vũng Tàu
  { title: 'Mũi Né & Đảo Phú Quý', aliases: ['mũi né', 'mui ne', 'phú quý', 'đảo phú quý', 'phan thiết', 'bàu trắng', 'đồi cát bay'], lat: 10.9422, lng: 108.2872, province: 'Bình Thuận', category: 'travel' },
  { title: 'Vũng Tàu (Biển & Ngọn Hải Đăng)', aliases: ['vũng tàu', 'vung tau', 'bãi trước', 'bãi sau', 'hải đăng vũng tàu', 'tượng chúa kito', 'hồ tràm', 'côn đảo'], lat: 10.3460, lng: 107.0843, province: 'Bà Rịa - Vũng Tàu', category: 'travel' },

  // TP. Hồ Chí Minh
  { title: 'Phố Đi Bộ Nguyễn Huệ & Bến Bạch Đằng', aliases: ['nguyễn huệ', 'nguyen hue', 'phố đi bộ nguyễn huệ', 'bến bạch đằng', 'bến thành', 'chợ bến thành', 'nhà thờ đức bà', 'bưu điện trung tâm sài gòn'], lat: 10.7743, lng: 106.7036, province: 'TP. Hồ Chí Minh', category: 'date' },
  { title: 'Landmark 81 (Nóc nhà Việt Nam)', aliases: ['landmark 81', 'landmark', 'vinhomes central park', 'bình thạnh'], lat: 10.7951, lng: 106.7219, province: 'TP. Hồ Chí Minh', category: 'special' },

  // Miền Tây & Phú Quốc
  { title: 'Cần Thơ (Bến Ninh Kiều & Chợ nổi Cái Răng)', aliases: ['cần thơ', 'can tho', 'bến ninh kiều', 'ninh kiều', 'chợ nổi cái răng', 'cồn sơn'], lat: 10.0342, lng: 105.7878, province: 'Cần Thơ', category: 'travel' },
  { title: 'Đảo Ngọc Phú Quốc', aliases: ['phú quốc', 'phu quoc', 'đảo ngọc', 'sunset sanato', 'grand world phú quốc', 'bãi sao', 'bãi khem', 'hòn thơm', 'thị trấn hoàng hôn sunset town'], lat: 10.2899, lng: 103.9840, province: 'Kiên Giang', category: 'date' }
];

/**
 * Normalizes string for fast matching
 */
export const normalizeLocationText = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

/**
 * Resolves best-fit coordinates from location string, title or address
 */
export const resolveCoordinates = (
  location?: string,
  address?: string,
  title?: string
): { lat: number; lng: number; spotName: string; isApproximate: boolean } | null => {
  const combinedRaw = `${location || ''} ${address || ''} ${title || ''}`.toLowerCase().trim();
  if (!combinedRaw) return null;

  const combinedNorm = normalizeLocationText(combinedRaw);

  // 1. Check famous date spots & landmarks
  for (const spot of FAMOUS_DATE_SPOTS) {
    const spotTitleNorm = normalizeLocationText(spot.title);
    if (combinedRaw.includes(spot.title.toLowerCase()) || combinedNorm.includes(spotTitleNorm)) {
      return { lat: spot.lat, lng: spot.lng, spotName: spot.title, isApproximate: false };
    }
    for (const alias of spot.aliases) {
      const aliasNorm = normalizeLocationText(alias);
      if (combinedRaw.includes(alias.toLowerCase()) || combinedNorm.includes(aliasNorm)) {
        return { lat: spot.lat, lng: spot.lng, spotName: spot.title, isApproximate: false };
      }
    }
  }

  // 2. Check 63 province centroids
  for (const [provName, coords] of Object.entries(PROVINCE_COORDINATES)) {
    const provNorm = normalizeLocationText(provName);
    if (combinedRaw.includes(provName.toLowerCase()) || combinedNorm.includes(provNorm)) {
      return { lat: coords.lat, lng: coords.lng, spotName: provName, isApproximate: true };
    }
  }

  return null;
};
