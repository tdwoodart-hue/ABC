import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Apple,
  Beef,
  ChevronLeft,
  ChevronRight,
  Database,
  Flame,
  Footprints,
  Pencil,
  Plus,
  Scale,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  Wheat,
  X,
} from 'lucide-react';
import type { CoupleData, NutritionMeal, NutritionRecipe, UserProfile } from '../types';
import {
  addDoc,
  collection,
  db,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from '../lib/firebase';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type NutritionSex = 'male' | 'female';
type NutritionGoal = 'recomp' | 'cut' | 'maintain' | 'gain';
type ActivityLevel = 'sedentary' | 'desk_training' | 'moderate' | 'active';

interface NutritionTabProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
}

interface NutritionProfileSettings {
  sex: NutritionSex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  stepTarget: number;
  bmrOverride?: number;
  tdeeOverride?: number;
}

interface NutritionMetric {
  id: string;
  date: string;
  steps?: number;
  weightKg?: number;
  loggedByUid: string;
  updatedAt: string;
}

type NutritionMealExtended = NutritionMeal & {
  protein?: number;
  carbs?: number;
  fat?: number;
  servingLabel?: string;
  amount?: number;
  unit?: string;
};

type NutritionRecipeExtended = NutritionRecipe & {
  protein?: number;
  carbs?: number;
  fat?: number;
  servingLabel?: string;
};

interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealPayload {
  foodName: string;
  mealType: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingLabel?: string;
  notes?: string;
}

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Bữa sáng',
  lunch: 'Bữa trưa',
  dinner: 'Bữa tối',
  snack: 'Ăn nhẹ',
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Ngồi nhiều, không tập luyện',
  desk_training: 'Ngồi nhiều + tập 4–6 buổi/tuần',
  moderate: 'Đi lại vừa phải + tập đều',
  active: 'Vận động nhiều / công việc thể lực',
};

const GOAL_LABELS: Record<NutritionGoal, string> = {
  recomp: 'Tăng cơ giảm mỡ',
  cut: 'Giảm mỡ',
  maintain: 'Giữ cân',
  gain: 'Tăng cân / tăng cơ',
};

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  desk_training: 1.375,
  moderate: 1.55,
  active: 1.725,
};

const GOAL_ADJUSTMENT: Record<NutritionGoal, number> = {
  recomp: -100,
  cut: -350,
  maintain: 0,
  gain: 200,
};

const DEFAULT_PROFILE: NutritionProfileSettings = {
  sex: 'male',
  age: 22,
  heightCm: 169,
  weightKg: 65.5,
  activityLevel: 'desk_training',
  goal: 'recomp',
  calorieTarget: 2100,
  proteinTarget: 130,
  carbTarget: 270,
  fatTarget: 55,
  stepTarget: 8000,
};

const toIso = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const fromIso = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDateLong = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

const formatDateShort = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);

const calculateBmr = (profile: NutritionProfileSettings) => {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return base + (profile.sex === 'male' ? 5 : -161);
};

const calculateTdee = (profile: NutritionProfileSettings) =>
  calculateBmr(profile) * ACTIVITY_FACTORS[profile.activityLevel];

const effectiveBmr = (profile: NutritionProfileSettings) =>
  typeof profile.bmrOverride === 'number' && Number.isFinite(profile.bmrOverride)
    ? profile.bmrOverride
    : calculateBmr(profile);

const effectiveTdee = (profile: NutritionProfileSettings) =>
  typeof profile.tdeeOverride === 'number' && Number.isFinite(profile.tdeeOverride)
    ? profile.tdeeOverride
    : calculateTdee(profile);

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

const recommendedTargets = (profile: NutritionProfileSettings) => {
  const calorieTarget = Math.max(
    1200,
    roundTo(effectiveTdee(profile) + GOAL_ADJUSTMENT[profile.goal], 50),
  );
  const proteinTarget = Math.max(60, roundTo(profile.weightKg * 2, 5));
  const fatTarget = Math.max(40, roundTo(profile.weightKg * 0.85, 5));
  const remaining = Math.max(0, calorieTarget - proteinTarget * 4 - fatTarget * 9);
  const carbTarget = Math.max(50, roundTo(remaining / 4, 5));
  return { calorieTarget, proteinTarget, carbTarget, fatTarget };
};

const clampPercent = (value: number, target: number) => {
  if (!target) return 0;
  return Math.min(100, Math.max(0, (value / target) * 100));
};

const macroValue = (value?: number) => (Number.isFinite(value) ? Number(value) : 0);

const getTotals = (entries: NutritionMealExtended[]): Totals =>
  entries.reduce<Totals>(
    (sum, entry) => ({
      calories: sum.calories + macroValue(entry.calories),
      protein: sum.protein + macroValue(entry.protein),
      carbs: sum.carbs + macroValue(entry.carbs),
      fat: sum.fat + macroValue(entry.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

const getWeekDates = (anchor: Date) => {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const weekday = start.getDay();
  start.setDate(start.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

const buildDefaultProfile = (user: UserProfile): NutritionProfileSettings => {
  let age = DEFAULT_PROFILE.age;
  if (user.birthday) {
    const birthday = new Date(user.birthday);
    if (!Number.isNaN(birthday.getTime())) {
      const now = new Date();
      age = now.getFullYear() - birthday.getFullYear();
      const beforeBirthday =
        now.getMonth() < birthday.getMonth() ||
        (now.getMonth() === birthday.getMonth() && now.getDate() < birthday.getDate());
      if (beforeBirthday) age -= 1;
    }
  }
  return {
    ...DEFAULT_PROFILE,
    sex: user.gender === 'female' ? 'female' : 'male',
    age: Math.max(14, age),
  };
};

interface ProgressRowProps {
  label: string;
  value: number;
  target: number;
  icon: React.ComponentType<{ className?: string }>;
}

const ProgressRow: React.FC<ProgressRowProps> = ({ label, value, target, icon: Icon }) => (
  <div>
    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
        <Icon className="h-3.5 w-3.5 text-rose-400" />
        {label}
      </span>
      <span className="font-medium tabular-nums text-slate-500">
        {decimal.format(value)} / {number.format(target)} g
      </span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-rose-500 transition-all duration-300"
        style={{ width: `${clampPercent(value, target)}%` }}
      />
    </div>
  </div>
);

interface DailyMetricsCardProps {
  metric?: NutritionMetric;
  previousWeight?: number;
  stepTarget: number;
  onSave: (updates: { steps?: number; weightKg?: number }) => void;
}

const DailyMetricsCard: React.FC<DailyMetricsCardProps> = ({
  metric,
  previousWeight,
  stepTarget,
  onSave,
}) => {
  const [steps, setSteps] = useState(metric?.steps === undefined ? '' : String(metric.steps));
  const [weight, setWeight] = useState(metric?.weightKg === undefined ? '' : String(metric.weightKg));

  useEffect(() => {
    setSteps(metric?.steps === undefined ? '' : String(metric.steps));
    setWeight(metric?.weightKg === undefined ? '' : String(metric.weightKg));
  }, [metric?.date, metric?.steps, metric?.weightKg]);

  const stepsValue = Number(steps) || 0;
  const weightValue = weight === '' ? undefined : Number(weight);
  const weightDelta =
    weightValue !== undefined && Number.isFinite(weightValue) && previousWeight !== undefined
      ? weightValue - previousWeight
      : null;

  return (
    <section className="rounded-[24px] border border-rose-100/80 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Hoạt động & cơ thể</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">Nhập nhanh mỗi ngày · dữ liệu đồng bộ</p>
        </div>
        <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-500">Mỗi ngày</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-rose-100/70 bg-rose-50/25 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-rose-500 shadow-xs">
                <Footprints className="h-4 w-4" />
              </span>
              Số bước
            </span>
            <span className="text-[10px] font-semibold text-slate-400">Mục tiêu {number.format(stepTarget)}</span>
          </div>
          <div className="flex items-end gap-2">
            <input
              type="number"
              min="0"
              step="100"
              inputMode="numeric"
              value={steps}
              onChange={(event) => setSteps(event.target.value)}
              onBlur={() => onSave({ steps: steps === '' ? undefined : Math.max(0, Number(steps) || 0) })}
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 outline-none placeholder:text-slate-300"
            />
            <span className="pb-1 text-xs font-semibold text-slate-400">bước</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-rose-100/80">
            <div
              className="h-full rounded-full bg-rose-500 transition-all duration-300"
              style={{ width: `${clampPercent(stepsValue, stepTarget)}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] font-medium text-slate-400">
            {stepsValue >= stepTarget
              ? 'Đã đạt mục tiêu vận động hôm nay'
              : `Còn ${number.format(Math.max(0, stepTarget - stepsValue))} bước`}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-100/70 bg-rose-50/25 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-rose-500 shadow-xs">
                <Scale className="h-4 w-4" />
              </span>
              Cân nặng
            </span>
            <span className="text-[10px] font-semibold text-slate-400">Buổi sáng</span>
          </div>
          <div className="flex items-end gap-2">
            <input
              type="number"
              min="20"
              max="300"
              step="0.1"
              inputMode="decimal"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              onBlur={() => onSave({ weightKg: weight === '' ? undefined : Math.max(0, Number(weight) || 0) })}
              placeholder="65.5"
              className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 outline-none placeholder:text-slate-300"
            />
            <span className="pb-1 text-xs font-semibold text-slate-400">kg</span>
          </div>
          <p
            className={`mt-3 text-[10px] font-semibold ${
              weightDelta === null
                ? 'text-slate-400'
                : Math.abs(weightDelta) < 0.05
                  ? 'text-slate-500'
                  : weightDelta < 0
                    ? 'text-emerald-600'
                    : 'text-amber-600'
            }`}
          >
            {weightDelta === null
              ? 'Chưa có lần cân trước để so sánh'
              : `${weightDelta > 0 ? '+' : ''}${decimal.format(weightDelta)} kg so với lần cân trước`}
          </p>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
            TDEE dùng cân nặng trong mục tiêu để tránh dao động nước làm thay đổi calories mỗi ngày.
          </p>
        </div>
      </div>
    </section>
  );
};

interface SettingsModalProps {
  profile: NutritionProfileSettings;
  onClose: () => void;
  onSave: (profile: NutritionProfileSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ profile, onClose, onSave }) => {
  const [draft, setDraft] = useState(profile);
  const suggestedBmr = calculateBmr(draft);
  const suggestedTdee = calculateTdee(draft);
  const displayedBmr = effectiveBmr(draft);
  const displayedTdee = effectiveTdee(draft);

  const setNumber = (key: keyof NutritionProfileSettings, raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    setDraft((current) => ({ ...current, [key]: Math.max(0, value) }));
  };

  const setOverride = (key: 'bmrOverride' | 'tdeeOverride', raw: string) => {
    if (raw.trim() === '') {
      setDraft((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    setDraft((current) => ({ ...current, [key]: Math.max(0, value) }));
  };

  const resetOverride = (key: 'bmrOverride' | 'tdeeOverride') => {
    setDraft((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const applySuggestion = () => {
    setDraft((current) => ({ ...current, ...recommendedTargets(current) }));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-rose-100 bg-white p-4 shadow-2xl sm:rounded-[28px] sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Mục tiêu dinh dưỡng</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">TDEE, macro và mục tiêu vận động của riêng tài khoản đang đăng nhập.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="rounded-xl border border-slate-200 p-3">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Giới tính</span>
            <select
              value={draft.sex}
              onChange={(event) => setDraft((current) => ({ ...current, sex: event.target.value as NutritionSex }))}
              className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
            >
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </label>
          <label className="rounded-xl border border-slate-200 p-3">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Tuổi</span>
            <input type="number" min="14" max="100" value={draft.age} onChange={(event) => setNumber('age', event.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none" />
          </label>
          <label className="rounded-xl border border-slate-200 p-3">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Chiều cao</span>
            <div className="flex items-center gap-1.5">
              <input type="number" min="120" max="230" value={draft.heightCm} onChange={(event) => setNumber('heightCm', event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none" />
              <span className="text-[11px] font-semibold text-slate-400">cm</span>
            </div>
          </label>
          <label className="rounded-xl border border-slate-200 p-3">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Cân nặng mục tiêu tính TDEE</span>
            <div className="flex items-center gap-1.5">
              <input type="number" min="20" max="300" step="0.1" value={draft.weightKg} onChange={(event) => setNumber('weightKg', event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none" />
              <span className="text-[11px] font-semibold text-slate-400">kg</span>
            </div>
          </label>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block rounded-xl border border-slate-200 p-3">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Mức vận động</span>
            <select
              value={draft.activityLevel}
              onChange={(event) => setDraft((current) => ({ ...current, activityLevel: event.target.value as ActivityLevel }))}
              className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
            >
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block rounded-xl border border-slate-200 p-3">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Mục tiêu</span>
            <select
              value={draft.goal}
              onChange={(event) => setDraft((current) => ({ ...current, goal: event.target.value as NutritionGoal }))}
              className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
            >
              {Object.entries(GOAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/80 bg-white/75 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-rose-400">BMR</p>
              <button type="button" onClick={() => resetOverride('bmrOverride')} className="text-[9px] font-bold text-rose-500 hover:text-rose-600">Tự động</button>
            </div>
            <div className="flex items-end gap-1.5">
              <input
                type="number"
                min="0"
                step="10"
                value={Math.round(displayedBmr)}
                onChange={(event) => setOverride('bmrOverride', event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-xl font-extrabold tabular-nums text-slate-900 outline-none"
              />
              <span className="pb-1 text-[10px] font-semibold text-slate-400">kcal</span>
            </div>
            <p className="mt-1 text-[9px] text-slate-400">Công thức: {number.format(Math.round(suggestedBmr))} · {draft.bmrOverride === undefined ? 'đang tự động' : 'đang sửa tay'}</p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/75 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-rose-400">TDEE</p>
              <button type="button" onClick={() => resetOverride('tdeeOverride')} className="text-[9px] font-bold text-rose-500 hover:text-rose-600">Tự động</button>
            </div>
            <div className="flex items-end gap-1.5">
              <input
                type="number"
                min="0"
                step="10"
                value={Math.round(displayedTdee)}
                onChange={(event) => setOverride('tdeeOverride', event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-xl font-extrabold tabular-nums text-rose-600 outline-none"
              />
              <span className="pb-1 text-[10px] font-semibold text-slate-400">kcal</span>
            </div>
            <p className="mt-1 text-[9px] text-slate-400">Công thức: {number.format(Math.round(suggestedTdee / 10) * 10)} · {draft.tdeeOverride === undefined ? 'đang tự động' : 'đang sửa tay'}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-700">Mục tiêu theo dõi</p>
            <button type="button" onClick={applySuggestion} className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100">
              Tính lại gợi ý
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Calories', 'calorieTarget', 'kcal'],
              ['Protein', 'proteinTarget', 'g'],
              ['Carb', 'carbTarget', 'g'],
              ['Fat', 'fatTarget', 'g'],
              ['Steps', 'stepTarget', 'bước'],
            ].map(([label, key, unit]) => (
              <label key={key} className="block rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={draft[key as keyof NutritionProfileSettings] as number}
                    onChange={(event) => setNumber(key as keyof NutritionProfileSettings, event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-base font-bold tabular-nums text-slate-900 outline-none"
                  />
                  <span className="text-[11px] font-semibold text-slate-400">{unit}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onClose} className="h-11 rounded-xl bg-slate-100 text-sm font-bold text-slate-600">Hủy</button>
          <button type="button" onClick={() => onSave(draft)} className="h-11 rounded-xl bg-rose-500 text-sm font-bold text-white shadow-xs hover:bg-rose-600">Lưu mục tiêu</button>
        </div>
      </div>
    </div>
  );
};

interface MealModalProps {
  date: string;
  editing?: NutritionMealExtended | null;
  preset?: Partial<MealPayload> | null;
  onClose: () => void;
  onSave: (payload: MealPayload) => Promise<void>;
  onOpenLibrary: () => void;
}

const MealModal: React.FC<MealModalProps> = ({ date, editing, preset, onClose, onSave, onOpenLibrary }) => {
  const [foodName, setFoodName] = useState(editing?.foodName || preset?.foodName || '');
  const [mealType, setMealType] = useState<MealType>((editing?.mealType as MealType) || preset?.mealType || 'lunch');
  const [calories, setCalories] = useState(String(editing?.calories ?? preset?.calories ?? ''));
  const [protein, setProtein] = useState(String(editing?.protein ?? preset?.protein ?? ''));
  const [carbs, setCarbs] = useState(String(editing?.carbs ?? preset?.carbs ?? ''));
  const [fat, setFat] = useState(String(editing?.fat ?? preset?.fat ?? ''));
  const [servingLabel, setServingLabel] = useState(editing?.servingLabel || preset?.servingLabel || '');
  const [notes, setNotes] = useState(editing?.notes || preset?.notes || '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const analyze = async () => {
    if (!aiPrompt.trim()) return;
    setAnalyzing(true);
    setError('');
    try {
      const response = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiPrompt.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể phân tích món.');
      const result = data.data || {};
      setFoodName(result.foodName || aiPrompt.trim());
      setMealType((['breakfast', 'lunch', 'dinner', 'snack'].includes(result.mealType) ? result.mealType : 'lunch') as MealType);
      setCalories(String(result.calories ?? ''));
      setProtein(String(result.protein ?? 0));
      setCarbs(String(result.carbs ?? 0));
      setFat(String(result.fat ?? 0));
      if (result.notes || result.breakdown) setNotes([result.notes, result.breakdown].filter(Boolean).join(' · '));
    } catch (err: any) {
      setError(err?.message || 'Không thể phân tích món.');
    } finally {
      setAnalyzing(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const kcal = Number(calories);
    if (!foodName.trim()) {
      setError('Nhập tên món.');
      return;
    }
    if (!Number.isFinite(kcal) || kcal < 0) {
      setError('Calories không hợp lệ.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        foodName: foodName.trim(),
        mealType,
        calories: Math.max(0, kcal),
        protein: Math.max(0, Number(protein) || 0),
        carbs: Math.max(0, Number(carbs) || 0),
        fat: Math.max(0, Number(fat) || 0),
        servingLabel: servingLabel.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu món ăn.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <form onSubmit={submit} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-rose-100 bg-white p-4 shadow-2xl sm:rounded-[28px] sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">{editing ? 'Sửa món đã ghi' : 'Thêm bữa ăn'}</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">{formatDateShort(fromIso(date))}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500"><X className="h-4 w-4" /></button>
        </div>

        {!editing && (
          <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50/35 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-rose-600">
              <Sparkles className="h-4 w-4" /> AI tính nhanh
            </div>
            <div className="flex gap-2">
              <input value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="VD: 300g ức gà áp chảo..." className="h-10 min-w-0 flex-1 rounded-xl border border-rose-100 bg-white px-3 text-xs text-slate-800 outline-none focus:border-rose-300" />
              <button type="button" onClick={analyze} disabled={analyzing || !aiPrompt.trim()} className="h-10 shrink-0 rounded-xl bg-rose-500 px-3 text-[11px] font-bold text-white disabled:bg-slate-200">
                {analyzing ? 'Đang tính...' : 'Phân tích'}
              </button>
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center gap-2">
          <select value={mealType} onChange={(event) => setMealType(event.target.value as MealType)} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-rose-300">
            {Object.entries(MEAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {!editing && (
            <button type="button" onClick={onOpenLibrary} className="flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600">
              <Database className="h-3.5 w-3.5" /> Kho món
            </button>
          )}
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Tên món</span>
            <input value={foodName} onChange={(event) => setFoodName(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-rose-300" placeholder="Ức gà áp chảo" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Khẩu phần</span>
            <input value={servingLabel} onChange={(event) => setServingLabel(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-rose-300" placeholder="VD: 180 g, 2 quả, 1 bát" />
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              ['Calories', calories, setCalories, 'kcal'],
              ['Protein', protein, setProtein, 'g'],
              ['Carb', carbs, setCarbs, 'g'],
              ['Fat', fat, setFat, 'g'],
            ].map(([label, value, setter, unit]) => (
              <label key={label as string} className="rounded-xl border border-slate-200 px-3 py-2">
                <span className="block text-[10px] font-semibold text-slate-400">{label as string}</span>
                <div className="mt-1 flex items-center gap-1">
                  <input type="number" min="0" step="0.1" value={value as string} onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-bold tabular-nums text-slate-800 outline-none" />
                  <span className="text-[10px] font-semibold text-slate-400">{unit as string}</span>
                </div>
              </label>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Ghi chú</span>
            <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-rose-300" placeholder="Ghi chú thêm..." />
          </label>
          {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onClose} className="h-11 rounded-xl bg-slate-100 text-sm font-bold text-slate-600">Hủy</button>
          <button type="submit" disabled={saving} className="h-11 rounded-xl bg-rose-500 text-sm font-bold text-white shadow-xs hover:bg-rose-600 disabled:bg-rose-300">
            {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm vào bữa'}
          </button>
        </div>
      </form>
    </div>
  );
};

interface FoodLibraryModalProps {
  recipes: NutritionRecipeExtended[];
  onClose: () => void;
  onUse: (recipe: NutritionRecipeExtended) => void;
  onAdd: (payload: Omit<NutritionRecipeExtended, 'id' | 'createdByUid' | 'createdByName' | 'createdAt'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const FoodLibraryModal: React.FC<FoodLibraryModalProps> = ({ recipes, onClose, onUse, onAdd, onDelete }) => {
  const [queryText, setQueryText] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [serving, setServing] = useState('1 phần');
  const [saving, setSaving] = useState(false);

  const filtered = recipes.filter((item) => item.title.toLowerCase().includes(queryText.trim().toLowerCase()));

  const saveRecipe = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        title: title.trim(),
        ingredients: 'Món lưu nhanh',
        calories: Math.max(0, Number(calories) || 0),
        protein: Math.max(0, Number(protein) || 0),
        carbs: Math.max(0, Number(carbs) || 0),
        fat: Math.max(0, Number(fat) || 0),
        servingLabel: serving.trim() || '1 phần',
      });
      setTitle(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); setServing('1 phần'); setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-rose-100 bg-white p-4 shadow-2xl sm:rounded-[28px] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Kho món</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Món hay ăn để thêm nhanh lần sau.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-3 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={queryText} onChange={(event) => setQueryText(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-rose-300" placeholder="Tìm món..." />
          </div>
          <button type="button" onClick={() => setShowAdd((value) => !value)} className="flex h-10 items-center gap-1 rounded-xl bg-rose-500 px-3 text-[11px] font-bold text-white"><Plus className="h-3.5 w-3.5" /> Thêm món</button>
        </div>

        {showAdd && (
          <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50/35 p-3">
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="mb-2 h-10 w-full rounded-xl border border-rose-100 bg-white px-3 text-xs font-semibold outline-none" placeholder="Tên món" />
            <input value={serving} onChange={(event) => setServing(event.target.value)} className="mb-2 h-10 w-full rounded-xl border border-rose-100 bg-white px-3 text-xs outline-none" placeholder="Khẩu phần" />
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Kcal', calories, setCalories],
                ['Protein', protein, setProtein],
                ['Carb', carbs, setCarbs],
                ['Fat', fat, setFat],
              ].map(([label, value, setter]) => (
                <label key={label as string} className="rounded-xl border border-rose-100 bg-white px-2.5 py-2">
                  <span className="text-[9px] font-semibold text-slate-400">{label as string}</span>
                  <input type="number" min="0" step="0.1" value={value as string} onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)} className="mt-0.5 w-full bg-transparent text-sm font-bold outline-none" />
                </label>
              ))}
            </div>
            <button type="button" onClick={saveRecipe} disabled={saving || !title.trim()} className="mt-2 h-10 w-full rounded-xl bg-rose-500 text-xs font-bold text-white disabled:bg-slate-200">{saving ? 'Đang lưu...' : 'Lưu vào kho'}</button>
          </div>
        )}

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center text-xs text-slate-400">Chưa có món trong kho.</div>
          ) : filtered.map((recipe) => (
            <div key={recipe.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-rose-500 shadow-xs"><Apple className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800">{recipe.title}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{recipe.servingLabel || '1 phần'} · {number.format(recipe.calories || 0)} kcal · P {decimal.format(recipe.protein || 0)} · C {decimal.format(recipe.carbs || 0)} · F {decimal.format(recipe.fat || 0)}</p>
              </div>
              <button type="button" onClick={() => onUse(recipe)} className="h-8 rounded-lg bg-rose-500 px-2.5 text-[10px] font-bold text-white">Dùng</button>
              <button type="button" onClick={() => void onDelete(recipe.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const NutritionTab: React.FC<NutritionTabProps> = ({ userProfile, coupleData }) => {
  void coupleData;
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [selectedDate, setSelectedDate] = useState(() => toIso(new Date()));
  const [meals, setMeals] = useState<NutritionMealExtended[]>([]);
  const [recipes, setRecipes] = useState<NutritionRecipeExtended[]>([]);
  const [metrics, setMetrics] = useState<NutritionMetric[]>([]);
  const [profile, setProfile] = useState<NutritionProfileSettings>(() => buildDefaultProfile(userProfile));
  const [addOpen, setAddOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<NutritionMealExtended | null>(null);
  const [presetMeal, setPresetMeal] = useState<Partial<MealPayload> | null>(null);

  // Nutrition is intentionally isolated per authenticated account.
  // Dương and Chúc may share the same coupleId, but they never read/write the same nutrition collections.
  useEffect(() => {
    setMeals([]);
    setRecipes([]);
    setMetrics([]);
    setProfile(buildDefaultProfile(userProfile));
    setEditingMeal(null);
    setPresetMeal(null);
    setAddOpen(false);
    setLibraryOpen(false);
    setSettingsOpen(false);
  }, [userProfile.coupleId, userProfile.uid]);

  useEffect(() => {
    if (!userProfile.coupleId || !userProfile.uid) return;
    const mealsRef = collection(
      db,
      'couples',
      userProfile.coupleId,
      'nutrition_users',
      userProfile.uid,
      'meals',
    );
    const unsubscribe = onSnapshot(query(mealsRef, orderBy('createdAt', 'desc')), (snapshot) => {
      const items: NutritionMealExtended[] = [];
      snapshot.forEach((item) => items.push({ ...(item.data() as NutritionMealExtended), id: item.id }));
      setMeals(items);
    });
    return unsubscribe;
  }, [userProfile.coupleId, userProfile.uid]);

  useEffect(() => {
    if (!userProfile.coupleId || !userProfile.uid) return;
    const recipesRef = collection(
      db,
      'couples',
      userProfile.coupleId,
      'nutrition_users',
      userProfile.uid,
      'recipes',
    );
    const unsubscribe = onSnapshot(query(recipesRef, orderBy('createdAt', 'desc')), (snapshot) => {
      const items: NutritionRecipeExtended[] = [];
      snapshot.forEach((item) => items.push({ ...(item.data() as NutritionRecipeExtended), id: item.id }));
      setRecipes(items);
    });
    return unsubscribe;
  }, [userProfile.coupleId, userProfile.uid]);

  useEffect(() => {
    if (!userProfile.coupleId || !userProfile.uid) return;
    const metricsRef = collection(
      db,
      'couples',
      userProfile.coupleId,
      'nutrition_users',
      userProfile.uid,
      'metrics',
    );
    const unsubscribe = onSnapshot(query(metricsRef, orderBy('date', 'asc')), (snapshot) => {
      const items: NutritionMetric[] = [];
      snapshot.forEach((item) => items.push({ ...(item.data() as NutritionMetric), id: item.id }));
      setMetrics(items);
    });
    return unsubscribe;
  }, [userProfile.coupleId, userProfile.uid]);

  useEffect(() => {
    if (!userProfile.coupleId || !userProfile.uid) return;
    const profileRef = doc(
      db,
      'couples',
      userProfile.coupleId,
      'nutrition_users',
      userProfile.uid,
      'settings',
      'profile',
    );
    const unsubscribe = onSnapshot(profileRef, (snapshot) => {
      if (!snapshot.exists()) {
        setProfile(buildDefaultProfile(userProfile));
        return;
      }
      setProfile({ ...buildDefaultProfile(userProfile), ...(snapshot.data() as Partial<NutritionProfileSettings>) });
    });
    return unsubscribe;
  }, [userProfile.coupleId, userProfile.uid, userProfile.gender, userProfile.birthday]);

  const selectedDateObject = fromIso(selectedDate);
  const isToday = selectedDate === toIso(new Date());
  const tdee = Math.round(effectiveTdee(profile) / 10) * 10;
  const bmr = Math.round(effectiveBmr(profile));
  const dayEntries = useMemo(() => meals.filter((meal) => meal.date === selectedDate), [meals, selectedDate]);
  const dayTotals = useMemo(() => getTotals(dayEntries), [dayEntries]);
  const caloriePercent = clampPercent(dayTotals.calories, profile.calorieTarget);
  const caloriesLeft = profile.calorieTarget - dayTotals.calories;
  const mealGroups = useMemo(
    () => (Object.keys(MEAL_LABELS) as MealType[])
      .map((mealType) => {
        const entries = dayEntries.filter((entry) => entry.mealType === mealType);
        return { mealType, entries, totals: getTotals(entries) };
      })
      .filter((group) => group.entries.length > 0),
    [dayEntries],
  );

  const dayMetric = metrics.find((metric) => metric.date === selectedDate);
  const previousWeight = [...metrics]
    .filter((metric) => metric.date < selectedDate && typeof metric.weightKg === 'number')
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.weightKg;

  const weekDates = useMemo(() => getWeekDates(selectedDateObject), [selectedDate]);
  const weekRows = useMemo(() => weekDates.map((date) => {
    const key = toIso(date);
    const entries = meals.filter((meal) => meal.date === key);
    return {
      date,
      key,
      entries,
      totals: getTotals(entries),
      metric: metrics.find((metric) => metric.date === key),
    };
  }), [weekDates, meals, metrics]);
  const loggedWeekRows = weekRows.filter((row) => row.entries.length > 0);
  const weekTotals = getTotals(loggedWeekRows.flatMap((row) => row.entries));
  const loggedDays = loggedWeekRows.length;
  const avgCalories = loggedDays ? weekTotals.calories / loggedDays : 0;
  const avgProtein = loggedDays ? weekTotals.protein / loggedDays : 0;
  const stepRows = weekRows.filter((row) => typeof row.metric?.steps === 'number');
  const weightRows = weekRows.filter((row) => typeof row.metric?.weightKg === 'number');
  const avgSteps = stepRows.length ? stepRows.reduce((sum, row) => sum + (row.metric?.steps || 0), 0) / stepRows.length : 0;
  const avgWeight = weightRows.length ? weightRows.reduce((sum, row) => sum + (row.metric?.weightKg || 0), 0) / weightRows.length : 0;

  const moveDate = (amount: number) => {
    const date = fromIso(selectedDate);
    date.setDate(date.getDate() + amount);
    setSelectedDate(toIso(date));
  };

  const saveProfile = async (nextProfile: NutritionProfileSettings) => {
    if (!userProfile.coupleId) return;
    setProfile(nextProfile);
    await setDoc(doc(db, 'couples', userProfile.coupleId, 'nutrition_users', userProfile.uid, 'settings', 'profile'), {
      ...nextProfile,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    setSettingsOpen(false);
  };

  const saveMetric = async (updates: { steps?: number; weightKg?: number }) => {
    if (!userProfile.coupleId) return;
    const id = selectedDate;
    const current = metrics.find((metric) => metric.date === selectedDate);
    setMetrics((items) => {
      const next = {
        id,
        date: selectedDate,
        loggedByUid: userProfile.uid,
        updatedAt: new Date().toISOString(),
        ...(current || {}),
        ...updates,
      } as NutritionMetric;
      return items.some((item) => item.date === selectedDate)
        ? items.map((item) => item.date === selectedDate ? next : item)
        : [...items, next];
    });
    const payload: Record<string, any> = {
      date: selectedDate,
      loggedByUid: userProfile.uid,
      updatedAt: new Date().toISOString(),
    };
    if ('steps' in updates) payload.steps = updates.steps === undefined ? deleteField() : updates.steps;
    if ('weightKg' in updates) payload.weightKg = updates.weightKg === undefined ? deleteField() : updates.weightKg;
    await setDoc(doc(db, 'couples', userProfile.coupleId, 'nutrition_users', userProfile.uid, 'metrics', selectedDate), payload, { merge: true });
  };

  const saveMeal = async (payload: MealPayload) => {
    if (!userProfile.coupleId) return;
    const baseData = {
      ...payload,
      date: selectedDate,
      loggedByUid: userProfile.uid,
      loggedByName: userProfile.displayName || 'Bạn',
    };
    if (editingMeal) {
      await updateDoc(doc(db, 'couples', userProfile.coupleId, 'nutrition_users', userProfile.uid, 'meals', editingMeal.id), {
        ...baseData,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await addDoc(collection(db, 'couples', userProfile.coupleId, 'nutrition_users', userProfile.uid, 'meals'), {
        ...baseData,
        createdAt: new Date().toISOString(),
      });
    }
    setEditingMeal(null);
    setPresetMeal(null);
  };

  const removeMeal = async (id: string) => {
    if (!userProfile.coupleId) return;
    await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'nutrition_users', userProfile.uid, 'meals', id));
  };

  const addRecipe = async (payload: Omit<NutritionRecipeExtended, 'id' | 'createdByUid' | 'createdByName' | 'createdAt'>) => {
    if (!userProfile.coupleId) return;
    await addDoc(collection(db, 'couples', userProfile.coupleId, 'nutrition_users', userProfile.uid, 'recipes'), {
      ...payload,
      createdByUid: userProfile.uid,
      createdByName: userProfile.displayName || 'Bạn',
      createdAt: new Date().toISOString(),
    });
  };

  const deleteRecipe = async (id: string) => {
    if (!userProfile.coupleId) return;
    await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'nutrition_users', userProfile.uid, 'recipes', id));
  };

  return (
    <div className="mx-auto min-w-0 w-full max-w-3xl overflow-x-hidden pb-16">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-rose-100/70 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dinh dưỡng</h1>
          <p className="mt-1 text-xs text-slate-400">Dữ liệu riêng của {userProfile.displayName || 'tài khoản này'} · không dùng chung với tài khoản còn lại.</p>
        </div>
        <button type="button" onClick={() => setSettingsOpen(true)} className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-100 bg-white text-slate-600 shadow-xs transition hover:bg-rose-50 active:scale-95" aria-label="Cài đặt chỉ số dinh dưỡng" title="Sửa mục tiêu, TDEE, BMR và macro">
          <Settings2 className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-2xl border border-rose-100 bg-white p-1 shadow-xs">
        <button type="button" onClick={() => setMode('day')} className={`h-10 rounded-xl text-xs font-bold transition ${mode === 'day' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-500 hover:bg-rose-50'}`}>Trong ngày</button>
        <button type="button" onClick={() => setMode('week')} className={`h-10 rounded-xl text-xs font-bold transition ${mode === 'week' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-500 hover:bg-rose-50'}`}>Trong tuần</button>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-rose-100 bg-white p-2 shadow-xs">
        <button type="button" onClick={() => moveDate(mode === 'day' ? -1 : -7)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" onClick={() => setSelectedDate(toIso(new Date()))} className="min-w-0 rounded-xl px-3 py-1 text-center hover:bg-rose-50/50">
          {mode === 'day' ? (
            <>
              <p className="truncate text-sm font-bold capitalize text-slate-900">{formatDateLong(selectedDateObject)}</p>
              {!isToday && <span className="text-[11px] font-semibold text-rose-500">Về hôm nay</span>}
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-900">{formatDateShort(weekDates[0])} – {formatDateShort(weekDates[6])}</p>
              <span className="text-[11px] font-medium text-slate-400">Theo dõi 7 ngày</span>
            </>
          )}
        </button>
        <button type="button" onClick={() => moveDate(mode === 'day' ? 1 : 7)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><ChevronRight className="h-5 w-5" /></button>
      </div>

      {mode === 'day' ? (
        <div className="space-y-4">
          <section className="overflow-hidden rounded-[24px] border border-rose-100/80 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-center gap-5">
              <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full p-2" style={{ background: `conic-gradient(rgb(244 63 94) ${caloriePercent * 3.6}deg, rgb(255 228 230) 0deg)` }}>
                <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
                  <div>
                    <p className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900">{number.format(dayTotals.calories)}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">đã ăn</p>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1 rounded-2xl p-2">
                <p className="text-xs font-semibold text-rose-300">Mục tiêu hôm nay</p>
                <div className="mt-1 flex items-end gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">{number.format(profile.calorieTarget)}</span>
                  <span className="pb-1 text-xs font-semibold text-slate-400">kcal</span>
                </div>
                <p className={`mt-2 text-xs font-semibold ${caloriesLeft >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{caloriesLeft >= 0 ? `Còn ${number.format(caloriesLeft)} kcal` : `Vượt ${number.format(Math.abs(caloriesLeft))} kcal`}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-rose-50 pt-4">
              <div className="rounded-xl bg-rose-50/45 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-300">TDEE</p>
                <p className="mt-1 text-base font-bold tabular-nums text-slate-800">{number.format(tdee)} kcal</p>
                <p className="mt-0.5 text-[9px] text-slate-400">{profile.tdeeOverride === undefined ? 'Tự động' : 'Tùy chỉnh trong Cài đặt'}</p>
              </div>
              <div className="rounded-xl bg-rose-50/45 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-300">BMR</p>
                <p className="mt-1 text-base font-bold tabular-nums text-slate-800">{number.format(bmr)} kcal</p>
                <p className="mt-0.5 text-[9px] text-slate-400">{profile.bmrOverride === undefined ? 'Tự động' : 'Tùy chỉnh trong Cài đặt'}</p>
              </div>
            </div>
          </section>

          <DailyMetricsCard
            metric={dayMetric}
            previousWeight={previousWeight}
            stepTarget={profile.stepTarget}
            onSave={(updates) => void saveMetric(updates)}
          />

          <section className="rounded-[24px] border border-rose-100/80 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Macro</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Theo mục tiêu {GOAL_LABELS[profile.goal].toLowerCase()}</p>
              </div>
              <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-600">
                {profile.proteinTarget}P · {profile.carbTarget}C · {profile.fatTarget}F
              </span>
            </div>
            <div className="space-y-4">
              <ProgressRow label="Protein" value={dayTotals.protein} target={profile.proteinTarget} icon={Beef} />
              <ProgressRow label="Carb" value={dayTotals.carbs} target={profile.carbTarget} icon={Wheat} />
              <ProgressRow label="Fat" value={dayTotals.fat} target={profile.fatTarget} icon={Flame} />
            </div>
          </section>

          <section className="rounded-[24px] border border-rose-100/80 bg-white p-4 shadow-xs sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Bữa ăn</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">{dayEntries.length} mục đã ghi</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setLibraryOpen(true)} className="flex h-9 items-center gap-1.5 rounded-xl border border-rose-100 bg-white px-3 text-[11px] font-bold text-slate-600 hover:bg-rose-50"><Database className="h-3.5 w-3.5" /> Kho món</button>
                <button type="button" onClick={() => { setPresetMeal(null); setEditingMeal(null); setAddOpen(true); }} className="flex h-9 items-center gap-1.5 rounded-xl bg-rose-500 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-rose-600 active:scale-95"><Plus className="h-4 w-4" /> Thêm</button>
              </div>
            </div>

            {dayEntries.length === 0 ? (
              <button type="button" onClick={() => setAddOpen(true)} className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-rose-100 bg-rose-50/20 px-4 py-8 text-center hover:bg-rose-50/40">
                <span className="mb-2 grid h-10 w-10 place-items-center rounded-2xl bg-white text-rose-400 shadow-xs"><UtensilsCrossed className="h-4.5 w-4.5" /></span>
                <span className="text-xs font-bold text-slate-600">Chưa ghi bữa ăn nào</span>
                <span className="mt-1 text-[11px] text-slate-400">Thêm calories và macro để bắt đầu theo dõi.</span>
              </button>
            ) : (
              <div className="space-y-3">
                {mealGroups.map((group) => (
                  <div key={group.mealType} className="overflow-hidden rounded-2xl border border-rose-100/70 bg-rose-50/20">
                    <div className="flex items-center justify-between gap-3 border-b border-rose-50 bg-white/80 px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-50 text-rose-500"><UtensilsCrossed className="h-3.5 w-3.5" /></span>
                        <div>
                          <p className="text-[11px] font-extrabold text-slate-800">{MEAL_LABELS[group.mealType]}</p>
                          <p className="text-[9px] font-medium text-slate-400">{group.entries.length} món</p>
                        </div>
                      </div>
                      <p className="text-[11px] font-extrabold tabular-nums text-slate-700">{number.format(Math.round(group.totals.calories))} kcal</p>
                    </div>
                    <div className="divide-y divide-rose-50">
                      {group.entries.map((entry) => (
                        <div key={entry.id} className="flex min-w-0 items-center gap-3 px-3.5 py-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <p className="truncate text-[11px] font-bold text-slate-700">{entry.foodName}</p>
                              {entry.servingLabel && <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500">{entry.servingLabel}</span>}
                            </div>
                            <p className="mt-0.5 text-[9px] font-medium text-slate-400">{number.format(Math.round(entry.calories || 0))} kcal · P {decimal.format(entry.protein || 0)}g · C {decimal.format(entry.carbs || 0)}g · F {decimal.format(entry.fat || 0)}g</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <button type="button" onClick={() => { setEditingMeal(entry); setPresetMeal(null); setAddOpen(true); }} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Pencil className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => void removeMeal(entry.id)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ['TB calories', number.format(Math.round(avgCalories)), 'kcal/ngày'],
              ['TB protein', number.format(Math.round(avgProtein)), 'g/ngày'],
              ['TB steps', stepRows.length ? number.format(Math.round(avgSteps)) : '—', 'bước/ngày'],
              ['TB cân nặng', weightRows.length ? decimal.format(avgWeight) : '—', 'kg'],
              ['Ngày ghi ăn', `${loggedDays}/7`, 'ngày'],
              ['Mục tiêu', number.format(profile.calorieTarget), 'kcal/ngày'],
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-2xl border border-rose-100/80 bg-white p-3.5 text-left shadow-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-300">{label}</p>
                <p className="mt-1.5 text-xl font-extrabold tabular-nums text-slate-900">{value}</p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-400">{sub}</p>
              </div>
            ))}
          </section>

          <section className="rounded-[24px] border border-rose-100/80 bg-white p-5 shadow-xs">
            <div className="mb-5">
              <h2 className="text-sm font-bold text-slate-900">Calories 7 ngày</h2>
              <p className="mt-0.5 text-[11px] text-slate-400">Mục tiêu {number.format(profile.calorieTarget)} kcal/ngày</p>
            </div>
            <div className="flex h-44 items-end gap-2 sm:gap-3">
              {weekRows.map((row) => {
                const hasData = row.entries.length > 0;
                const barPercent = hasData ? Math.min(100, Math.max(8, (row.totals.calories / profile.calorieTarget) * 78)) : 4;
                const selected = row.key === selectedDate;
                return (
                  <button key={row.key} type="button" onClick={() => { setSelectedDate(row.key); setMode('day'); }} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 rounded-xl px-0.5 hover:bg-rose-50/40">
                    <span className="text-[9px] font-semibold tabular-nums text-slate-400">{hasData ? number.format(row.totals.calories) : '—'}</span>
                    <span className="flex h-28 w-full max-w-8 items-end overflow-hidden rounded-lg bg-rose-50">
                      <span className={`w-full rounded-lg transition-all ${selected ? 'bg-rose-600' : hasData ? 'bg-rose-400' : 'bg-rose-100'}`} style={{ height: `${barPercent}%` }} />
                    </span>
                    <span className={`text-[10px] font-bold ${selected ? 'text-rose-600' : 'text-slate-500'}`}>{new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(row.date).replace('Th ', 'T')}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[24px] border border-rose-100/80 bg-white p-5 shadow-xs">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900">Steps & cân nặng 7 ngày</h2>
              <p className="mt-0.5 text-[11px] text-slate-400">Theo dõi mức vận động và xu hướng cân mỗi ngày.</p>
            </div>
            <div className="space-y-2">
              {weekRows.map((row) => (
                <button key={row.key} type="button" onClick={() => { setSelectedDate(row.key); setMode('day'); }} className="grid w-full grid-cols-[56px_1fr_72px] items-center gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-rose-50/40 sm:grid-cols-[64px_1fr_92px]">
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">{new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(row.date)}</p>
                    <p className="text-[10px] text-slate-400">{formatDateShort(row.date)}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500"><Footprints className="h-3 w-3 text-rose-400" />{typeof row.metric?.steps === 'number' ? number.format(row.metric.steps) : '—'}</span>
                      <span className="text-[9px] text-slate-400">/{number.format(profile.stepTarget)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-rose-50"><div className="h-full rounded-full bg-rose-500" style={{ width: `${clampPercent(row.metric?.steps || 0, profile.stepTarget)}%` }} /></div>
                  </div>
                  <p className="flex items-center justify-end gap-1 text-[11px] font-bold tabular-nums text-slate-700"><Scale className="h-3 w-3 text-rose-300" />{typeof row.metric?.weightKg === 'number' ? `${decimal.format(row.metric.weightKg)} kg` : '—'}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-rose-100/80 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Macro trung bình</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Chỉ tính các ngày đã ghi dữ liệu.</p>
              </div>
              <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-500">TDEE {number.format(tdee)}</span>
            </div>
            <div className="space-y-4">
              <ProgressRow label="Protein" value={loggedDays ? weekTotals.protein / loggedDays : 0} target={profile.proteinTarget} icon={Beef} />
              <ProgressRow label="Carb" value={loggedDays ? weekTotals.carbs / loggedDays : 0} target={profile.carbTarget} icon={Wheat} />
              <ProgressRow label="Fat" value={loggedDays ? weekTotals.fat / loggedDays : 0} target={profile.fatTarget} icon={Flame} />
            </div>
          </section>
        </div>
      )}

      {addOpen && (
        <MealModal
          key={`${editingMeal?.id || 'new'}-${presetMeal?.foodName || ''}`}
          date={selectedDate}
          editing={editingMeal}
          preset={presetMeal}
          onClose={() => { setAddOpen(false); setEditingMeal(null); setPresetMeal(null); }}
          onOpenLibrary={() => { setAddOpen(false); setLibraryOpen(true); }}
          onSave={saveMeal}
        />
      )}

      {libraryOpen && (
        <FoodLibraryModal
          recipes={recipes}
          onClose={() => setLibraryOpen(false)}
          onAdd={addRecipe}
          onDelete={deleteRecipe}
          onUse={(recipe) => {
            setPresetMeal({
              foodName: recipe.title,
              calories: recipe.calories || 0,
              protein: recipe.protein || 0,
              carbs: recipe.carbs || 0,
              fat: recipe.fat || 0,
              servingLabel: recipe.servingLabel || '1 phần',
            });
            setEditingMeal(null);
            setLibraryOpen(false);
            setAddOpen(true);
          }}
        />
      )}

      {settingsOpen && <SettingsModal profile={profile} onClose={() => setSettingsOpen(false)} onSave={(next) => void saveProfile(next)} />}
    </div>
  );
};
