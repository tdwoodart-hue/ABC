import React, { useState } from 'react';
import { UserProfile, CoupleData, WakeUpLog } from '../types';
import { db, doc, setDoc, addDoc, collection, updateDoc } from '../lib/firebase';
import { Sun, Award, Clock, Sparkles, Coffee, CheckCircle2, ChevronRight, Trophy } from 'lucide-react';
import { formatDateShortVN } from '../utils/formatDate';

interface WakeUpChallengeCardProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  todayLog: WakeUpLog | null;
  allLogs?: WakeUpLog[];
  onNavigateToFinance?: () => void;
  compact?: boolean;
}

export const WakeUpChallengeCard: React.FC<WakeUpChallengeCardProps> = ({
  userProfile,
  coupleData,
  todayLog,
  allLogs = [],
  onNavigateToFinance,
  compact = false
}) => {
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Determine current partner vs me
  const currentUserIsUser1 =
    coupleData?.user1Uid === userProfile.uid ||
    coupleData?.user1Id === userProfile.uid ||
    userProfile.email?.toLowerCase().includes('duong');

  const myUid = userProfile.uid;
  const myName = userProfile.displayName || (currentUserIsUser1 ? 'Dương' : 'Chúc Gà');
  const partnerUid = coupleData
    ? currentUserIsUser1
      ? coupleData.user2Uid || coupleData.user2Id
      : coupleData.user1Uid || coupleData.user1Id
    : null;

  let rawPartnerName = coupleData
    ? currentUserIsUser1
      ? coupleData.user2Name || 'Chúc Gà'
      : coupleData.user1Name || 'Dương'
    : currentUserIsUser1
    ? 'Chúc Gà'
    : 'Dương';

  if (rawPartnerName.trim() === myName.trim()) {
    rawPartnerName = currentUserIsUser1 ? 'Chúc Gà' : 'Dương';
  }
  const partnerName = rawPartnerName;

  const todayStr = new Date().toISOString().split('T')[0];
  const currentTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // Handle checking in as the first person awake today
  const handleCheckInWakeUp = async () => {
    if (!userProfile.coupleId || loading) return;
    if (todayLog) return; // already checked in

    setLoading(true);
    try {
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const targetLoserUid = partnerUid || (currentUserIsUser1 ? 'user2' : 'user1');
      const targetLoserName = partnerName;

      // 1. Create a finance income transaction automatically (Loser pays 5k to the couple fund)
      const txRef = collection(db, 'couples', userProfile.coupleId, 'finances');
      const txDoc = await addDoc(txRef, {
        title: `Phạt dậy muộn ${formatDateShortVN(todayStr)} (${targetLoserName})`,
        amount: 5000,
        type: 'income',
        category: 'Đóng quỹ chung',
        paidByUid: targetLoserUid,
        paidByName: targetLoserName,
        date: todayStr,
        createdAt: new Date().toISOString(),
        note: `☀️ ${myName} dậy sớm lúc ${timeFormatted} nên ${targetLoserName} đóng phạt 5.000đ vào quỹ`
      });

      // 2. Create the wake-up log doc
      const logRef = doc(db, 'couples', userProfile.coupleId, 'wakeUpLogs', todayStr);
      await setDoc(logRef, {
        id: todayStr,
        date: todayStr,
        winnerUid: myUid,
        winnerName: myName,
        winnerTime: timeFormatted,
        loserUid: targetLoserUid,
        loserName: targetLoserName,
        fineAmount: 5000,
        finePaid: true,
        transactionId: txDoc.id,
        createdAt: new Date().toISOString()
      });

      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3500);
    } catch (err) {
      console.error('Lỗi điểm danh dậy sớm:', err);
      alert('Không thể ghi nhận điểm danh dậy sớm. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  // Handle second person confirming they woke up
  const handleSecondPersonWakeUp = async () => {
    if (!userProfile.coupleId || !todayLog || todayLog.loserWokeUpAt) return;
    try {
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const logRef = doc(db, 'couples', userProfile.coupleId, 'wakeUpLogs', todayStr);
      await updateDoc(logRef, {
        loserWokeUpAt: timeFormatted
      });
    } catch (err) {
      console.error('Lỗi xác nhận dậy muộn:', err);
    }
  };

  // Compute overall stats
  const myWins = allLogs.filter(l => l.winnerUid === myUid).length;
  const partnerWins = allLogs.filter(l => l.winnerUid === partnerUid || (partnerUid ? false : l.winnerUid !== myUid)).length;
  const totalFines = allLogs.length * 5000;

  const isWinnerToday = todayLog?.winnerUid === myUid;

  if (compact) {
    // Synchronized Clean White / Rose Widget for Home Screen
    return (
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-rose-300 transition-all shadow-xs relative overflow-hidden space-y-3">
        {showCelebration && (
          <div className="absolute inset-0 bg-rose-500/95 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 animate-fadeIn p-4 text-center">
            <Sparkles className="w-7 h-7 text-pink-200 animate-bounce mb-1" />
            <p className="font-bold text-sm">🎉 Bạn đã dậy sớm nhất hôm nay!</p>
            <p className="text-xs opacity-90">{partnerName} đã được ghi nhận đóng 5.000đ vào quỹ ☕</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <Sun className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">Ai Dậy Sớm Hơn?</span>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200/60 rounded-full text-[10px] font-semibold">
                  Phạt 5k/ngày
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Ai dậy trước bấm trước, người dậy sau đóng quỹ</p>
            </div>
          </div>

          {onNavigateToFinance && (
            <button
              type="button"
              onClick={onNavigateToFinance}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 cursor-pointer shrink-0"
            >
              <span>Xem quỹ</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {!todayLog ? (
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600 min-w-0">
              <p className="font-semibold text-slate-800 truncate">Hôm nay chưa ai điểm danh</p>
              <p className="text-[11px] text-slate-400 truncate">Bấm ngay để giành chiến thắng hôm nay!</p>
            </div>
            <button
              type="button"
              onClick={handleCheckInWakeUp}
              disabled={loading}
              className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>☀️ Tôi Đã Dậy Rồi!</span>
            </button>
          </div>
        ) : (
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-bold text-slate-800">
                  {isWinnerToday
                    ? `🏆 Bạn đã dậy trước lúc ${todayLog.winnerTime}`
                    : `🏆 ${todayLog.winnerName} đã dậy lúc ${todayLog.winnerTime}`}
                </span>
              </div>
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">
                +5.000đ vào quỹ
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isWinnerToday
                ? `👉 ${partnerName} dậy muộn hơn và đã tự động đóng 5.000đ vào quỹ chung!`
                : `👉 Bạn dậy muộn hơn nên đã đóng 5.000đ vào quỹ chung hôm nay.`}
            </p>
            {!isWinnerToday && !todayLog.loserWokeUpAt && (
              <button
                type="button"
                onClick={handleSecondPersonWakeUp}
                className="w-full mt-1 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
              >
                <Coffee className="w-3.5 h-3.5 text-rose-500" />
                <span>Tôi cũng vừa dậy lúc này ({currentTimeStr})</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full detailed card in Finance Tab (Clean white theme matching overall dashboard)
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 relative overflow-hidden">
      {showCelebration && (
        <div className="absolute inset-0 bg-rose-500/95 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 animate-fadeIn p-4 text-center">
          <Sparkles className="w-8 h-8 text-pink-200 animate-bounce mb-2" />
          <h3 className="font-bold text-base">🎉 Bạn đã dậy sớm nhất hôm nay!</h3>
          <p className="text-xs opacity-90 mt-1">
            Đã ghi nhận lúc {currentTimeStr} & cộng 5.000đ phạt từ {partnerName} vào quỹ chung!
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <Sun className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">Thử Thách Dậy Sớm</h3>
              <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200/60 rounded-full text-[10px] font-semibold">
                Phạt 5.000đ/ngày
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Ai dậy sớm bấm trước = Thắng 🏆 • Người dậy muộn = Đóng 5k vào quỹ
            </p>
          </div>
        </div>
      </div>

      {/* Scoreboard / Stats Bar */}
      <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-200/60">
        <div className="text-center">
          <p className="text-[10px] text-slate-400 font-medium">🏆 {myName}</p>
          <p className="text-sm sm:text-base font-bold text-slate-800">{myWins} <span className="text-[11px] font-normal text-slate-400">lần</span></p>
        </div>
        <div className="text-center border-x border-slate-200/60">
          <p className="text-[10px] text-slate-400 font-medium">🏆 {partnerName}</p>
          <p className="text-sm sm:text-base font-bold text-slate-800">{partnerWins} <span className="text-[11px] font-normal text-slate-400">lần</span></p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-400 font-medium">💰 Quỹ thu được</p>
          <p className="text-sm sm:text-base font-bold text-emerald-600">
            {totalFines.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-slate-400">đ</span>
          </p>
        </div>
      </div>

      {/* Today status & Action Button */}
      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Hôm nay: {formatDateShortVN(todayStr)}
          </span>
          <span className="text-slate-400 text-[11px]">Giờ hiện tại: {currentTimeStr}</span>
        </div>

        {!todayLog ? (
          <div className="space-y-2.5 text-center py-1">
            <p className="text-xs text-slate-600 font-medium">
              Chưa ai điểm danh hôm nay! Bấm nút bên dưới ngay khi vừa thức dậy để không bị phạt:
            </p>
            <button
              type="button"
              onClick={handleCheckInWakeUp}
              disabled={loading}
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Sun className="w-4 h-4" />
              <span>☀️ TÔI ĐÃ DẬY RỒI! (ĐIỂM DANH NGAY)</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isWinnerToday 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}>
              <div className="text-xl shrink-0">
                {isWinnerToday ? '🏆' : '😴'}
              </div>
              <div className="flex-1 text-xs">
                <p className="font-bold text-xs">
                  {isWinnerToday 
                    ? 'Bạn là người dậy sớm nhất hôm nay!' 
                    : `${todayLog.winnerName} đã dậy sớm trước bạn!`}
                </p>
                <p className="mt-0.5 opacity-90 text-[11px] leading-relaxed">
                  {isWinnerToday
                    ? `Bạn đã bấm dậy lúc ${todayLog.winnerTime}. ${partnerName} dậy muộn hơn và đã tự động đóng 5.000đ vào Quỹ chung.`
                    : `${todayLog.winnerName} đã điểm danh lúc ${todayLog.winnerTime}. Bạn đã đóng phạt 5.000đ vào Quỹ chung hôm nay.`}
                </p>
                {todayLog.loserWokeUpAt && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    (Người thứ 2 thức dậy lúc: {todayLog.loserWokeUpAt})
                  </p>
                )}
              </div>
            </div>

            {!isWinnerToday && !todayLog.loserWokeUpAt && (
              <button
                type="button"
                onClick={handleSecondPersonWakeUp}
                className="w-full py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Coffee className="w-3.5 h-3.5 text-rose-500" />
                <span>Xác nhận: Tôi cũng vừa dậy lúc này ({currentTimeStr})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recent wake up history */}
      {allLogs.length > 0 && (
        <div className="space-y-2 pt-1">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-rose-500" />
            Lịch sử dậy sớm gần đây ({allLogs.length} ngày)
          </h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {allLogs.slice(0, 10).map((log) => {
              const iWon = log.winnerUid === myUid;
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{iWon ? '🏆' : '⏰'}</span>
                    <div>
                      <span className="font-bold text-slate-800">
                        {iWon ? `${myName} (Bạn)` : log.winnerName} dậy sớm
                      </span>
                      <span className="text-slate-400 text-[11px] ml-1.5">
                        lúc {log.winnerTime}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      +5.000đ
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDateShortVN(log.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
