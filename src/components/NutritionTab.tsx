import React, { useState, useEffect } from 'react';
import { UserProfile, CoupleData, NutritionMeal, NutritionRecipe } from '../types';
import { formatDateVN, formatDateShortVN } from '../utils/formatDate';
import { 
  db, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc 
} from '../lib/firebase';
import { 
  Utensils, 
  Apple, 
  Plus, 
  Trash2, 
  Calendar, 
  BookOpen, 
  Sparkles, 
  X, 
  Camera, 
  Flame, 
  Send,
  Loader2,
  CheckCircle2,
  Brain,
  Info
} from 'lucide-react';

interface NutritionTabProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
}

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Bữa sáng', icon: '🌅', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'lunch', label: 'Bữa trưa', icon: '☀️', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'dinner', label: 'Bữa tối', icon: '🌙', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'snack', label: 'Bữa phụ', icon: '🍎', color: 'bg-pink-50 text-pink-700 border-pink-200' },
] as const;

export const NutritionTab: React.FC<NutritionTabProps> = ({ userProfile, coupleData }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [meals, setMeals] = useState<NutritionMeal[]>([]);
  const [recipes, setRecipes] = useState<NutritionRecipe[]>([]);
  
  const [activeSubTab, setActiveSubTab] = useState<'log' | 'recipes'>('log');

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImage, setAiImage] = useState<string>('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiResultSuccess, setAiResultSuccess] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Manual Add Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualFoodName, setManualFoodName] = useState('');
  const [manualMealType, setManualMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [manualCalories, setManualCalories] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualImage, setManualImage] = useState<string>('');
  const [addingManual, setAddingManual] = useState(false);

  // Form state - Add Recipe
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState('');
  const [recipeInstructions, setRecipeInstructions] = useState('');
  const [recipeCalories, setRecipeCalories] = useState('');
  const [recipeImage, setRecipeImage] = useState('');
  const [addingRecipe, setAddingRecipe] = useState(false);

  // Sync with Firestore
  useEffect(() => {
    if (!userProfile.coupleId) return;

    // Meals sync
    const mealsRef = collection(db, 'couples', userProfile.coupleId, 'nutrition_meals');
    const qMeals = query(mealsRef, orderBy('createdAt', 'desc'));
    const unsubMeals = onSnapshot(qMeals, (snapshot) => {
      const list: NutritionMeal[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as NutritionMeal));
      setMeals(list);
    });

    // Recipes sync
    const recipesRef = collection(db, 'couples', userProfile.coupleId, 'nutrition_recipes');
    const qRecipes = query(recipesRef, orderBy('createdAt', 'desc'));
    const unsubRecipes = onSnapshot(qRecipes, (snapshot) => {
      const list: NutritionRecipe[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as NutritionRecipe));
      setRecipes(list);
    });

    return () => {
      unsubMeals();
      unsubRecipes();
    };
  }, [userProfile.coupleId]);

  // Image compressor
  const handleImageUpload = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 600;
        let w = img.width;
        let h = img.height;
        if (w > h && w > MAX) {
          h *= MAX / w;
          w = MAX;
        } else if (h > MAX) {
          w *= MAX / h;
          h = MAX;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', 0.65));
      };
    };
  };

  // Filter meals for selectedDate
  const todaysMeals = meals.filter((m) => m.date === selectedDate);
  const totalCaloriesToday = todaysMeals.reduce((acc, curr) => acc + (curr.calories || 0), 0);
  const CALORIE_GOAL = 2200; // 2200 kcal

  // AI Analyze and Save
  const handleAiAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() && !aiImage) {
      setAiError('Vui lòng nhập tin nhắn hoặc tải ảnh món ăn.');
      return;
    }

    if (!userProfile.coupleId) {
      setAiError('Chưa kết nối tài khoản đôi.');
      return;
    }

    setIsAiAnalyzing(true);
    setAiError(null);
    setAiResultSuccess(null);

    try {
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiPrompt.trim(),
          imageBase64: aiImage || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi phân tích món ăn bằng AI');
      }

      const analyzed = data.data;

      // Build note with breakdown
      let finalNote = analyzed.notes || '';
      if (analyzed.breakdown) {
        finalNote = finalNote ? `${finalNote} (${analyzed.breakdown})` : analyzed.breakdown;
      }

      // Save directly to Firestore
      const mealsRef = collection(db, 'couples', userProfile.coupleId, 'nutrition_meals');

      const mealData: Record<string, any> = {
        foodName: analyzed.foodName,
        mealType: analyzed.mealType,
        calories: analyzed.calories,
        date: selectedDate,
        loggedByUid: userProfile.uid,
        loggedByName: userProfile.displayName || 'Bạn',
        createdAt: new Date().toISOString(),
      };
      if (aiImage) mealData.imageUrl = aiImage;
      if (finalNote) mealData.notes = finalNote;

      await addDoc(mealsRef, mealData);

      const mealTypeName = MEAL_TYPES.find((t) => t.id === analyzed.mealType)?.label || 'bữa ăn';
      setAiResultSuccess(
        `✨ AI đã ghi nhận: "${analyzed.foodName}" (~${analyzed.calories} kcal) cho ${mealTypeName}!`
      );
      setAiPrompt('');
      setAiImage('');
    } catch (err: any) {
      console.error('Lỗi AI Phân Tích Bữa Ăn:', err);
      setAiError(err.message || 'Không thể phân tích bữa ăn. Vui lòng thử lại.');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Manual Add Meal
  const handleAddManualMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId || !manualFoodName.trim()) return;

    setAddingManual(true);
    try {
       const mealsRef = collection(db, 'couples', userProfile.coupleId, 'nutrition_meals');

      const mealData: Record<string, any> = {
        foodName: manualFoodName.trim(),
        mealType: manualMealType,
        calories: parseInt(manualCalories) || 0,
        date: selectedDate,
        loggedByUid: userProfile.uid,
        loggedByName: userProfile.displayName || 'Bạn',
        createdAt: new Date().toISOString(),
      };
      if (manualImage) mealData.imageUrl = manualImage;
      if (manualNotes.trim()) mealData.notes = manualNotes.trim();

      await addDoc(mealsRef, mealData);
      setManualFoodName('');
      setManualCalories('');
      setManualNotes('');
      setManualImage('');
      setShowManualModal(false);
    } catch (err) {
      console.error('Lỗi thêm thủ công:', err);
    } finally {
      setAddingManual(false);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    if (!userProfile.coupleId) return;
    try {
      await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'nutrition_meals', id));
    } catch (err) {
      console.error('Lỗi xóa bữa ăn:', err);
    }
  };

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId || !recipeTitle.trim()) return;

    setAddingRecipe(true);
    try {
      const recipesRef = collection(db, 'couples', userProfile.coupleId, 'nutrition_recipes');
      const recipeData: Record<string, any> = {
        title: recipeTitle.trim(),
        ingredients: recipeIngredients.trim(),
        createdByUid: userProfile.uid,
        createdByName: userProfile.displayName || 'Bạn',
        createdAt: new Date().toISOString(),
      };
      if (recipeInstructions.trim()) recipeData.instructions = recipeInstructions.trim();
      if (recipeCalories) recipeData.calories = parseInt(recipeCalories) || 0;
      if (recipeImage) recipeData.imageUrl = recipeImage;

      await addDoc(recipesRef, recipeData);
      setRecipeTitle('');
      setRecipeIngredients('');
      setRecipeInstructions('');
      setRecipeCalories('');
      setRecipeImage('');
      setShowAddRecipe(false);
    } catch (err) {
      console.error('Lỗi thêm công thức:', err);
    } finally {
      setAddingRecipe(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!userProfile.coupleId) return;
    try {
      await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'nutrition_recipes', id));
    } catch (err) {
      console.error('Lỗi xóa công thức:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-100/80 via-pink-50 to-rose-50 p-6 rounded-3xl border border-rose-100 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
              <Apple className="w-4 h-4 text-rose-500" />
              Góc Dinh Dưỡng & Sức Khỏe Đôi 💕
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800">
              Nhật Ký Dinh Dưỡng AI Smart 🤖
            </h2>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center text-2xl shrink-0 shadow-inner">
            🥗
          </div>
        </div>

        {/* Subtab Toggle */}
        <div className="mt-4 pt-3 border-t border-rose-200/60 flex gap-2">
          <button
            onClick={() => setActiveSubTab('log')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'log'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white/80 hover:bg-white text-slate-600'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>AI Ghi Nhận Món Ăn</span>
          </button>
          <button
            onClick={() => setActiveSubTab('recipes')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'recipes'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white/80 hover:bg-white text-slate-600'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Thực đơn yêu thích ({recipes.length})</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'log' && (
        <>
          {/* AI Smart Input Card */}
          <div className="bg-white rounded-3xl p-5 border border-rose-200/80 shadow-xs space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Ghi Nhận Món Ăn Nhanh Bằng AI
                  </h3>
                </div>
              </div>
            </div>

            <form onSubmit={handleAiAnalyze} className="space-y-3">
              <div className="relative">
                <textarea
                  rows={2}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Nhập những gì hai đứa vừa ăn (VD: Trưa nay ăn cơm tấm sườn nướng trứng ốp la, 1 cốc trà đá)..."
                  className="w-full pl-3.5 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition resize-none"
                />

                <div className="absolute right-2 bottom-2.5 flex items-center gap-1.5">
                  <label
                    title="Tải ảnh món ăn"
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, setAiImage);
                      }}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isAiAnalyzing || (!aiPrompt.trim() && !aiImage)}
                    className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isAiAnalyzing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang tính...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Phân Tích</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Image Preview if uploaded */}
              {aiImage && (
                <div className="relative inline-block w-20 h-20 rounded-2xl overflow-hidden border border-rose-200 shadow-2xs">
                  <img src={aiImage} alt="Món ăn" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAiImage('')}
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </form>

            {/* AI Success Banner */}
            {aiResultSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{aiResultSuccess}</span>
                </div>
                <button onClick={() => setAiResultSuccess(null)} className="p-1 text-emerald-500 hover:text-emerald-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* AI Error Alert */}
            {aiError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{aiError}</span>
                </div>
                <button onClick={() => setAiError(null)} className="p-1 text-rose-500 hover:text-rose-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Date Picker & Calories Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-700 font-bold text-xs sm:text-sm">
                <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Ngày theo dõi:</span>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 hover:bg-rose-50/50 border border-slate-300 focus:border-rose-400 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer shadow-2xs transition"
              />
            </div>

            {/* Calories Summary Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Tổng Năng Lượng Đã Nạp
                </span>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                  {totalCaloriesToday} / {CALORIE_GOAL} kcal
                </span>
              </div>
              
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-amber-400 to-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalCaloriesToday / CALORIE_GOAL) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {todaysMeals.length} món ăn được AI & bạn ghi nhận trong {formatDateShortVN(selectedDate)}
              </p>
            </div>
          </div>

          {/* Meals List Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-rose-500" />
                  Bữa Ăn Trong Ngày ({formatDateShortVN(selectedDate)})
                </h3>
                <p className="text-xs text-slate-500">Danh sách các món ăn đã ghi nhận</p>
              </div>

              <button
                onClick={() => setShowManualModal(!showManualModal)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                <span>Thêm thủ công</span>
              </button>
            </div>

            {/* Manual Form Optional */}
            {showManualModal && (
              <form onSubmit={handleAddManualMeal} className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                    Thêm bữa ăn thủ công
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tên món ăn *</label>
                    <input
                      type="text"
                      required
                      value={manualFoodName}
                      onChange={(e) => setManualFoodName(e.target.value)}
                      placeholder="VD: Salads ức gà, Bún bò..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bữa ăn *</label>
                    <select
                      value={manualMealType}
                      onChange={(e) => setManualMealType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                    >
                      {MEAL_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.icon} {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ước tính Calo (kcal)</label>
                    <input
                      type="number"
                      value={manualCalories}
                      onChange={(e) => setManualCalories(e.target.value)}
                      placeholder="VD: 350"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ảnh món ăn</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, setManualImage);
                      }}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200 cursor-pointer"
                    />
                  </div>
                </div>

                {manualImage && (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-rose-200 shadow-2xs">
                    <img src={manualImage} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setManualImage('')}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú</label>
                  <input
                    type="text"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="Ghi chú thêm..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={addingManual}
                    className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    {addingManual ? 'Đang lưu...' : 'Lưu món ăn'}
                  </button>
                </div>
              </form>
            )}

            {/* Meal Items List */}
            {todaysMeals.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Apple className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  Chưa có bữa ăn nào được ghi nhận cho {formatDateVN(selectedDate)}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysMeals.map((meal) => {
                  const mealMeta = MEAL_TYPES.find((t) => t.id === meal.mealType) || MEAL_TYPES[0];
                  return (
                    <div
                      key={meal.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-rose-200 transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {meal.imageUrl ? (
                          <img
                            src={meal.imageUrl}
                            alt={meal.foodName}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 border ${mealMeta.color}`}>
                            {mealMeta.icon}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                              {meal.foodName}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${mealMeta.color}`}>
                              {mealMeta.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-1 flex-wrap">
                            {meal.calories > 0 && (
                              <span className="font-bold text-amber-600 flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Flame className="w-3 h-3 text-amber-500" />
                                {meal.calories} kcal
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <span>Ghi bởi:</span>
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                meal.loggedByUid === userProfile.uid
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {meal.loggedByUid === userProfile.uid ? 'Bạn' : (meal.loggedByName || 'Nửa kia')}
                              </span>
                            </div>
                            <span>• {formatDateShortVN(meal.date)}</span>
                          </div>

                          {meal.notes && (
                            <p className="text-[11px] text-slate-600 italic mt-0.5 break-words">
                              "{meal.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteMeal(meal.id)}
                        title="Xóa bữa ăn này"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer opacity-70 group-hover:opacity-100 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* SUBTAB 2: RECIPES */}
      {activeSubTab === 'recipes' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-rose-500" />
                Thực Đơn & Công Thức Yêu Thích Của Hai Đứa 🍲
              </h3>
            </div>
            <button
              onClick={() => setShowAddRecipe(true)}
              className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm công thức mới</span>
            </button>
          </div>

          {/* Form Add Recipe */}
          {showAddRecipe && (
            <form onSubmit={handleAddRecipe} className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  Thêm công thức món ăn mới
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddRecipe(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tên món ăn / Công thức *</label>
                  <input
                    type="text"
                    required
                    value={recipeTitle}
                    onChange={(e) => setRecipeTitle(e.target.value)}
                    placeholder="VD: Cơm tấm sườn nướng mật ong, Canh chua cá lóc..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ước tính Calo (kcal)</label>
                  <input
                    type="number"
                    value={recipeCalories}
                    onChange={(e) => setRecipeCalories(e.target.value)}
                    placeholder="VD: 550"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nguyên liệu cần chuẩn bị *</label>
                <textarea
                  rows={2}
                  required
                  value={recipeIngredients}
                  onChange={(e) => setRecipeIngredients(e.target.value)}
                  placeholder="VD: 300g ức gà, 1 củ cà rốt, 2 thìa mật ong, xà lách..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cách chế biến / Các bước thực hiện</label>
                <textarea
                  rows={3}
                  value={recipeInstructions}
                  onChange={(e) => setRecipeInstructions(e.target.value)}
                  placeholder="VD: Bước 1: Sơ chế... Bước 2: Ướp gia vị trong 20 phút..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ảnh minh họa công thức</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, setRecipeImage);
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200 cursor-pointer"
                />
              </div>

              {recipeImage && (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-rose-200 shadow-2xs">
                  <img src={recipeImage} alt="Recipe preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setRecipeImage('')}
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddRecipe(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addingRecipe}
                  className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {addingRecipe ? 'Đang lưu...' : 'Lưu công thức'}
                </button>
              </div>
            </form>
          )}

          {/* Recipes List */}
          {recipes.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Chưa có công thức món ăn nào trong thực đơn.</p>
              <button
                onClick={() => setShowAddRecipe(true)}
                className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
              >
                + Nhấp vào đây để thêm công thức đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3 relative group"
                >
                  {recipe.imageUrl && (
                    <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-200 mb-1">
                      <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-800 text-sm">{recipe.title}</h4>
                      <button
                        onClick={() => handleDeleteRecipe(recipe.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Xóa công thức"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {recipe.calories && (
                      <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold">
                        🔥 {recipe.calories} kcal
                      </span>
                    )}

                    <div className="pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nguyên liệu</span>
                      <p className="text-xs text-slate-700 whitespace-pre-line bg-white p-2 rounded-xl border border-slate-200/60 mt-0.5">
                        {recipe.ingredients}
                      </p>
                    </div>

                    {recipe.instructions && (
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cách làm</span>
                        <p className="text-xs text-slate-600 whitespace-pre-line bg-white p-2 rounded-xl border border-slate-200/60 mt-0.5">
                          {recipe.instructions}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Tạo bởi: {recipe.createdByName}</span>
                    <span>{formatDateVN(recipe.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
