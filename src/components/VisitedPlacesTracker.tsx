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
  Sparkles, 
  Compass, 
  Map, 
  Star, 
  Heart, 
  Navigation,
  Layers,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Award
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
import { UserProfile, CoupleData, VisitedPlace, VisitedProvinceRecord } from '../types';

export interface ProvinceInfo {
  name: string;
  region: 'bac' | 'trung' | 'nam';
  regionLabel: string;
  highlightSpot?: string;
}

export const VIETNAM_PROVINCES: ProvinceInfo[] = [
  // Miền Bắc (25)
  { name: 'Hà Nội', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Hồ Hoàn Kiếm, Phố Cổ, Hoàng Thành Thăng Long' },
  { name: 'Hải Phòng', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Đồ Sơn, Đảo Cát Bà, Vịnh Lan Hạ' },
  { name: 'Quảng Ninh', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Vịnh Hạ Long, Cô Tô, Núi Yên Tử' },
  { name: 'Lào Cai', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Sa Pa, Đỉnh Fansipan, Đèo Ô Quy Hồ' },
  { name: 'Hà Giang', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Đèo Mã Pí Lèng, Cột cờ Lũng Cú, Đồng Văn' },
  { name: 'Cao Bằng', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Thác Bản Giốc, Hang Pác Bó' },
  { name: 'Bắc Kạn', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Hồ Ba Bể, Động Puông' },
  { name: 'Tuyên Quang', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Khu di tích Tân Trào, Hồ Na Hang' },
  { name: 'Lạng Sơn', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Đỉnh Mẫu Sơn, Chợ Đông Kinh, Ải Chi Lăng' },
  { name: 'Thái Nguyên', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Hồ Núi Cốc, Đồi chè Tân Cương' },
  { name: 'Bắc Giang', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Tây Yên Tử, Chùa Vĩnh Nghiêm' },
  { name: 'Bắc Ninh', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Chùa Dâu, Đền Đô, Làng tranh Đông Hồ' },
  { name: 'Phú Thọ', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Đền Hùng, Đầm Ao Châu' },
  { name: 'Vĩnh Phúc', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Tam Đảo, Thiền viện Trúc Lâm Tây Thiên' },
  { name: 'Hải Dương', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Côn Sơn - Kiếp Bạc, Đảo Cò' },
  { name: 'Hưng Yên', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Phố Hiến, Đền Chử Đồng Tử' },
  { name: 'Thái Bình', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Chùa Keo, Biển Đồng Châu' },
  { name: 'Hà Nam', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Chùa Tam Chúc, Bát Cảnh Sơn' },
  { name: 'Nam Định', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Đền Trần, Nhà thờ đổ Hải Lý' },
  { name: 'Ninh Bình', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Tràng An, Tam Cốc, Hang Múa, Bái Đính' },
  { name: 'Lai Châu', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Đèo Khau Phạ, Bản Sì Thâu Chải' },
  { name: 'Điện Biên', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Đồi A1, Hầm De Castries, Cánh đồng Mường Thanh' },
  { name: 'Sơn La', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Cao nguyên Mộc Châu, Thác Dải Yếm' },
  { name: 'Hòa Bình', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Thung lũng Mai Châu, Hồ Hòa Bình' },
  { name: 'Yên Bái', region: 'bac', regionLabel: 'Miền Bắc', highlightSpot: 'Ruộng bậc thang Mù Cang Chải, Hồ Thác Bà' },

  // Miền Trung & Tây Nguyên (19)
  { name: 'Thanh Hóa', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Biển Sầm Sơn, Khu bảo tồn Pù Luông, Thành nhà Hồ' },
  { name: 'Nghệ An', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Bãi biển Cửa Lò, Làng Sen Quê Bác, Đảo Chè' },
  { name: 'Hà Tĩnh', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Ngã ba Đồng Lộc, Biển Thiên Cầm' },
  { name: 'Quảng Bình', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Động Phong Nha, Động Thiên Đường, Sơn Đoòng' },
  { name: 'Quảng Trị', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Thành Cổ Quảng Trị, Địa đạo Vịnh Mốc' },
  { name: 'Thừa Thiên Huế', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Đại Nội Huế, Sông Hương, Đồi Thiên An, Chùa Thiên Mụ' },
  { name: 'Đà Nẵng', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Cầu Rồng, Bà Nà Hills, Bán đảo Sơn Trà, Bãi biển Mỹ Khê' },
  { name: 'Quảng Nam', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Phố cổ Hội An, Thánh địa Mỹ Sơn, Cù Lao Chàm' },
  { name: 'Quảng Ngãi', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Đảo Lý Sơn, Biển Sa Huỳnh' },
  { name: 'Bình Định', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Quy Nhơn, Kỳ Co, Eo Gió, Tháp Đôi' },
  { name: 'Phú Yên', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Gành Đá Đĩa, Mũi Điện - Bãi Môn, Tháp Nghinh Phong' },
  { name: 'Khánh Hòa', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Thành phố biển Nha Trang, Đảo Bình Ba, VinWonders' },
  { name: 'Ninh Thuận', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Vịnh Vĩnh Hy, Hang Rái, Đồi cát Nam Cương' },
  { name: 'Bình Thuận', region: 'trung', regionLabel: 'Miền Trung', highlightSpot: 'Phan Thiết, Mũi Né, Đồi Cát Bay, Đảo Phú Quý' },
  { name: 'Kon Tum', region: 'trung', regionLabel: 'Tây Nguyên', highlightSpot: 'Măng Đen, Nhà thờ gỗ Kon Tum, Cầu treo Kon Klor' },
  { name: 'Gia Lai', region: 'trung', regionLabel: 'Tây Nguyên', highlightSpot: 'Biển Hồ Pleiku, Núi lửa Chư Đăng Ya' },
  { name: 'Đắk Lắk', region: 'trung', regionLabel: 'Tây Nguyên', highlightSpot: 'Buôn Ma Thuột, Thác Dray Nur, Hồ Lắk' },
  { name: 'Đắk Nông', region: 'trung', regionLabel: 'Tây Nguyên', highlightSpot: 'Hồ Tà Đùng (Vịnh Hạ Long Tây Nguyên)' },
  { name: 'Lâm Đồng', region: 'trung', regionLabel: 'Tây Nguyên', highlightSpot: 'Đà Lạt, Thung Lũng Tình Yêu, Hồ Xuân Hương, Langbiang' },

  // Miền Nam (19)
  { name: 'TP. Hồ Chí Minh', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Phố đi bộ Nguyễn Huệ, Landmark 81, Chợ Bến Thành' },
  { name: 'Bà Rịa - Vũng Tàu', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Bãi Sau Vũng Tàu, Ngọn Hải Đăng, Đảo Côn Đảo' },
  { name: 'Bình Dương', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Chùa Bà Thiên Hậu, Lạc Cảnh Đại Nam Văn Hiến' },
  { name: 'Bình Phước', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Vườn quốc gia Bù Gia Mập, Trảng Cỏ Bù Lạch' },
  { name: 'Đồng Nai', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Thác Giang Điền, Khu du lịch Bửu Long, VQG Cát Tiên' },
  { name: 'Tây Ninh', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Núi Bà Đen, Tòa Thánh Tây Ninh, Hồ Dầu Tiếng' },
  { name: 'Long An', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Làng nổi Tân Lập, Cánh đồng bất tận' },
  { name: 'Tiền Giang', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Cù lao Thới Sơn, Chợ nổi Cái Bè, Chùa Vĩnh Tràng' },
  { name: 'Bến Tre', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Cồn Phụng Bến Tre, Miệt vườn Chợ Lách' },
  { name: 'Trà Vinh', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Ao Bà Om, Chùa Hang, Biển Ba Động' },
  { name: 'Vĩnh Long', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Cù lao An Bình, Cầu Mỹ Thuận' },
  { name: 'Đồng Tháp', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Vườn quốc gia Tràm Chim, Làng hoa Sa Đéc, Đồng Sen Tháp Mười' },
  { name: 'An Giang', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Rừng tràm Trà Sư, Miếu Bà Chúa Xứ Núi Sam' },
  { name: 'Kiên Giang', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Đảo Ngọc Phú Quốc, Quần đảo Nam Du, Hà Tiên' },
  { name: 'Cần Thơ', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Chợ nổi Cái Răng, Bến Ninh Kiều, Cồn Sơn' },
  { name: 'Hậu Giang', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Khu bảo tồn thiên nhiên Lung Ngọc Hoàng' },
  { name: 'Sóc Trăng', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Chùa Dơi, Chùa Chén Kiểu, Chùa Som Rong' },
  { name: 'Bạc Liêu', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Nhà Công tử Bạc Liêu, Cánh đồng Điện gió Bạc Liêu' },
  { name: 'Cà Mau', region: 'nam', regionLabel: 'Miền Nam', highlightSpot: 'Mốc tọa độ Mũi Cà Mau, Rừng đước U Minh Hạ' }
];

interface VisitedPlacesTrackerProps {
  coupleId: string;
  userProfile: UserProfile;
  coupleData: CoupleData | null;
}

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const VisitedPlacesTracker: React.FC<VisitedPlacesTrackerProps> = ({
  coupleId,
  userProfile,
  coupleData
}) => {
  const [visitedProvinces, setVisitedProvinces] = useState<Record<string, VisitedProvinceRecord>>({});
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [activeSubView, setActiveSubView] = useState<'provinces' | 'places'>('provinces');
  
  // Filter & Search
  const [regionFilter, setRegionFilter] = useState<'all' | 'bac' | 'trung' | 'nam' | 'visited'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Add/Edit Place Modal
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

  // Selected Province Detail Modal
  const [selectedProvince, setSelectedProvince] = useState<ProvinceInfo | null>(null);
  const [provinceNotesInput, setProvinceNotesInput] = useState('');
  const [provinceDateInput, setProvinceDateInput] = useState('');

  // Subscribe to visited provinces in Firestore
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

  // Toggle visited province
  const handleToggleProvince = async (province: ProvinceInfo) => {
    if (!coupleId) return;
    const isVisited = !!visitedProvinces[province.name];

    try {
      const provDocRef = doc(db, 'couples', coupleId, 'visited_provinces', province.name);
      if (isVisited) {
        // Remove
        await deleteDoc(provDocRef);
      } else {
        // Mark visited
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

  const handleOpenEditPlace = (place: VisitedPlace) => {
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
          imageUrl: placeImageUrl || undefined,
          addedByUid: userProfile.uid,
          addedByName: userProfile.displayName,
          createdAt: new Date().toISOString()
        };
        await addDoc(placesCol, newPlace);

        // Also automatically ensure this province is marked as visited!
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
    if (!window.confirm('Bạn có chắc muốn xóa địa điểm này khỏi hành trình?')) return;
    try {
      await deleteDoc(doc(db, 'couples', coupleId, 'visited_places', id));
    } catch (err) {
      console.error('Lỗi xóa địa điểm:', err);
    }
  };

  // Stats calculation
  const totalVisitedCount = Object.keys(visitedProvinces).length;
  const percentage = Math.round((totalVisitedCount / 63) * 100);

  const getMilestoneTitle = () => {
    if (totalVisitedCount >= 63) return '🏆 Chinh Phục Trọn Vẹn 63 Tỉnh Thành Việt Nam!';
    if (totalVisitedCount >= 45) return '👑 Đại Gia Đình Phượt Thủ Xuyên Việt';
    if (totalVisitedCount >= 30) return '🚀 Hành Trình Nửa Đất Nước Cùng Nhau';
    if (totalVisitedCount >= 15) return '🌟 Cặp Đôi Đam Mê Xê Dịch';
    if (totalVisitedCount >= 5) return '🌱 Dấu Chân Yêu Thương Đang Mở Rộng';
    return '🗺️ Bắt Đầu Hành Trình Khám Phá Việt Nam';
  };

  // Filtered provinces
  const filteredProvinces = useMemo(() => {
    return VIETNAM_PROVINCES.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.highlightSpot && p.highlightSpot.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchSearch) return false;

      if (regionFilter === 'all') return true;
      if (regionFilter === 'visited') return !!visitedProvinces[p.name];
      return p.region === regionFilter;
    });
  }, [searchTerm, regionFilter, visitedProvinces]);

  // Filtered places
  const filteredPlaces = useMemo(() => {
    return visitedPlaces.filter((place) => {
      const matchSearch = place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          place.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (place.note && place.note.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchSearch) return false;

      if (regionFilter === 'all' || regionFilter === 'visited') return true;
      return place.region === regionFilter;
    });
  }, [visitedPlaces, searchTerm, regionFilter]);

  // Group places by province count
  const placesCountByProvince = useMemo(() => {
    const counts: Record<string, number> = {};
    visitedPlaces.forEach((p) => {
      counts[p.province] = (counts[p.province] || 0) + 1;
    });
    return counts;
  }, [visitedPlaces]);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
      {/* Header & Milestone Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Hành Trình & Những Nơi Đã Đi
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                <span>Cùng nhau lưu lại từng dấu chân trên khắp mọi miền đất nước</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenAddPlace()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm địa điểm đã đi</span>
          </button>
        </div>
      </div>

      {/* Progress & Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 63 Tỉnh thành progress */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-rose-50/80 via-white to-pink-50/50 border border-rose-100/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold text-slate-700">Tiến độ chinh phục 63 Tỉnh Thành</span>
            </div>
            <span className="text-xs font-extrabold text-rose-600 bg-rose-100/80 px-2.5 py-0.5 rounded-full">
              {totalVisitedCount} / 63 Tỉnh ({percentage}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-rose-100">
            <div 
              className="h-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-600 rounded-full transition-all duration-700"
              style={{ width: `${Math.max(percentage, 2)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span className="font-semibold text-rose-700 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              {getMilestoneTitle()}
            </span>
            <span className="text-slate-400">Còn {63 - totalVisitedCount} tỉnh thành</span>
          </div>
        </div>

        {/* Card 2: Places Count */}
        <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Địa điểm đã ghé</span>
            <Navigation className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">
              {visitedPlaces.length} <span className="text-xs font-normal text-slate-500">nơi kỷ niệm</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Danh lam, quán quen & góc trời của hai đứa</p>
          </div>
        </div>
      </div>

      {/* Sub-view Navigation & Filters */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs switch */}
          <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveSubView('provinces')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubView === 'provinces'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Checklist 63 Tỉnh ({totalVisitedCount}/63)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('places')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubView === 'places'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Nơi Đã Ghé Thăm ({visitedPlaces.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm tỉnh thành, địa điểm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Region Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold mr-1 shrink-0">Lọc miền:</span>
          <button
            type="button"
            onClick={() => setRegionFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
              regionFilter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Tất cả (63)
          </button>
          <button
            type="button"
            onClick={() => setRegionFilter('visited')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 flex items-center gap-1 ${
              regionFilter === 'visited'
                ? 'bg-rose-500 text-white'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
            }`}
          >
            <Check className="w-3 h-3" />
            <span>Đã đi ({totalVisitedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setRegionFilter('bac')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
              regionFilter === 'bac'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
            }`}
          >
            Miền Bắc (25)
          </button>
          <button
            type="button"
            onClick={() => setRegionFilter('trung')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
              regionFilter === 'trung'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
            }`}
          >
            Miền Trung & Tây Nguyên (19)
          </button>
          <button
            type="button"
            onClick={() => setRegionFilter('nam')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
              regionFilter === 'nam'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
            }`}
          >
            Miền Nam (19)
          </button>
        </div>
      </div>

      {/* VIEW 1: CHECKLIST 63 TỈNH THÀNH */}
      {activeSubView === 'provinces' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Hiển thị {filteredProvinces.length} tỉnh thành (Bấm vào thẻ để đánh dấu hoặc thêm kỷ niệm)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProvinces.map((prov) => {
              const record = visitedProvinces[prov.name];
              const isVisited = !!record;
              const placeCount = placesCountByProvince[prov.name] || 0;

              return (
                <div
                  key={prov.name}
                  className={`p-3.5 rounded-2xl border transition relative group flex flex-col justify-between ${
                    isVisited
                      ? 'bg-rose-50/50 border-rose-200/90 shadow-xs'
                      : 'bg-slate-50/50 hover:bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold text-sm ${isVisited ? 'text-rose-900' : 'text-slate-800'}`}>
                          {prov.name}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                          prov.region === 'bac' ? 'bg-blue-100 text-blue-700' :
                          prov.region === 'trung' ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {prov.regionLabel}
                        </span>
                      </div>

                      {prov.highlightSpot && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                          ✨ {prov.highlightSpot}
                        </p>
                      )}

                      {isVisited && record?.visitedAt && (
                        <p className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-1.5">
                          <Calendar className="w-3 h-3 text-rose-400" />
                          <span>Đã đi: {record.visitedAt}</span>
                        </p>
                      )}
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleProvince(prov)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
                        isVisited
                          ? 'bg-rose-500 text-white shadow-xs hover:bg-rose-600'
                          : 'bg-white border border-slate-300 text-slate-300 hover:border-rose-400 hover:text-rose-500'
                      }`}
                      title={isVisited ? 'Đã ghé thăm (Bấm để hủy)' : 'Đánh dấu đã ghé thăm'}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Actions inside province card */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/50 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      <span>{placeCount} địa điểm</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAddPlace(prov.name)}
                        className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Thêm nơi ghé</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProvince(prov);
                          setProvinceNotesInput(record?.notes || '');
                          setProvinceDateInput(record?.visitedAt || new Date().toISOString().split('T')[0]);
                        }}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Ghi chú kỷ niệm"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: DETAILED VISITED PLACES (NƠI ĐÃ GHÉ THĂM) */}
      {activeSubView === 'places' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tổng cộng {filteredPlaces.length} địa điểm kỷ niệm</span>
            <button
              type="button"
              onClick={() => handleOpenAddPlace()}
              className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm mới</span>
            </button>
          </div>

          {filteredPlaces.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto">
                <Navigation className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">Chưa có địa điểm cụ thể nào</p>
                <p className="text-xs text-slate-500">
                  Hãy thêm những quán quen, danh lam, bãi biển hay đồi núi mà hai bạn đã cùng nhau đặt chân đến!
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAddPlace()}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm địa điểm đầu tiên</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlaces.map((place) => (
                <div
                  key={place.id}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group"
                >
                  {place.imageUrl && (
                    <div className="w-full h-40 bg-slate-100 overflow-hidden relative">
                      <img
                        src={place.imageUrl}
                        alt={place.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {place.province}
                      </span>
                    </div>
                  )}

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{place.name}</h4>
                          {!place.imageUrl && (
                            <span className="inline-block mt-0.5 bg-rose-100 text-rose-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                              {place.province}
                            </span>
                          )}
                        </div>
                        {place.rating && (
                          <div className="flex items-center gap-0.5 text-amber-500 text-xs font-bold shrink-0">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{place.rating}</span>
                          </div>
                        )}
                      </div>

                      {place.dateVisited && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3 text-rose-400" />
                          <span>{place.dateVisited}</span>
                        </p>
                      )}

                      {place.note && (
                        <p className="text-xs text-slate-600 mt-2 italic bg-slate-50 p-2 rounded-xl border border-slate-100 leading-snug">
                          "{place.note}"
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Bởi {place.addedByName || 'Thành viên'}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPlace(place)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                          title="Sửa địa điểm"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlace(place.id)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                          title="Xóa địa điểm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT PLACE */}
      {showPlaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Compass className="w-5 h-5 text-rose-500" />
                <span>{editingPlaceId ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm đã đi'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPlaceModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlace} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên địa điểm / Danh lam thắng cảnh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Thung Lũng Tình Yêu, Fansipan, Cầu Rồng, Biển Mỹ Khê..."
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thuộc tỉnh / thành phố
                  </label>
                  <select
                    value={placeProvince}
                    onChange={(e) => setPlaceProvince(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white font-medium"
                  >
                    {VIETNAM_PROVINCES.map((prov) => (
                      <option key={prov.name} value={prov.name}>
                        {prov.name} ({prov.regionLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày ghé thăm
                  </label>
                  <input
                    type="date"
                    value={placeDate}
                    onChange={(e) => setPlaceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đánh giá độ thích
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setPlaceRating(star)}
                      className="p-1 cursor-pointer transition hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= placeRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-slate-500 font-semibold ml-2">
                    {placeRating === 5 ? 'Tuyệt vời, cực kỳ thích!' : `${placeRating} sao`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kỷ niệm / Cảm xúc đáng nhớ
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Cùng nhau đón hoàng hôn thật đẹp, ăn lẩu gà lá é siêu ngon..."
                  value={placeNote}
                  onChange={(e) => setPlaceNote(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ảnh kỷ niệm tại đây
                </label>
                {placeImageUrl ? (
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-slate-200 group">
                    <img src={placeImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPlaceImageUrl('')}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-rose-600 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-rose-300 bg-slate-50 hover:bg-rose-50/50 rounded-2xl cursor-pointer transition">
                    <Camera className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-600 font-semibold">
                      {imageLoading ? 'Đang tải và tối ưu ảnh...' : 'Bấm để tải ảnh lên'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={imageLoading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPlaceModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingPlace || !placeName.trim()}
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition disabled:opacity-50"
                >
                  {savingPlace ? 'Đang lưu...' : 'Lưu địa điểm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROVINCE DETAILS / NOTE */}
      {selectedProvince && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-rose-500" />
                  <span>{selectedProvince.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400">{selectedProvince.regionLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProvince(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày hai đứa đến đây
                </label>
                <input
                  type="date"
                  value={provinceDateInput}
                  onChange={(e) => setProvinceDateInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú kỷ niệm tại {selectedProvince.name}
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi lại những điều đáng nhớ nhất ở tỉnh thành này..."
                  value={provinceNotesInput}
                  onChange={(e) => setProvinceNotesInput(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedProvince(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveProvinceDetails}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Lưu kỷ niệm tỉnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
