import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import type { JournalEntry } from '../../types';
import { formatDateVN } from '../../utils/formatDate';
import { isVideoUrl } from '../../utils/mediaHelper';

export function MemoryCarousel({ journals, onOpenJournal, onCreateJournal }: {
  journals: JournalEntry[];
  onOpenJournal: (journal: JournalEntry) => void;
  onCreateJournal: () => void;
}) {
  const memories = React.useMemo(() => [...journals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6), [journals]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [direction, setDirection] = React.useState(1);
  const reduced = useReducedMotion();
  const wasDragging = React.useRef(false);
  const index = Math.max(0, memories.findIndex(item => item.id === selectedId));
  const memory = memories[index];
  const move = (delta: number) => {
    setDirection(delta);
    setSelectedId(memories[(index + delta + memories.length) % memories.length].id);
  };
  const media = memory?.images?.length ? memory.images : memory?.imageUrl ? [memory.imageUrl] : [];
  const preferred = media[memory?.mainImageIndex ?? 0] || media[0];
  const cover = preferred && isVideoUrl(preferred) ? memory?.videoThumbnails?.[preferred] || media.find(url => !isVideoUrl(url)) : preferred;

  return <section className="home-memories" aria-label="Kỷ niệm gần đây" aria-roledescription="băng chuyền">
    <div className="home-section-heading">
      <div><h2>Những ngày đáng nhớ</h2></div>
      {memories.length > 1 && <div className="memory-arrows">
        <button type="button" onClick={() => move(-1)} aria-label="Kỷ niệm trước"><ChevronLeft size={18} /></button>
        <button type="button" onClick={() => move(1)} aria-label="Kỷ niệm tiếp theo"><ChevronRight size={18} /></button>
      </div>}
    </div>
    {memory ? <div className="memory-viewport">
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div key={memory.id} custom={direction}
          variants={{ enter: d => ({ opacity: 0, x: reduced ? 0 : d * 36 }), center: { opacity: 1, x: 0 }, exit: d => ({ opacity: 0, x: reduced ? 0 : -d * 36 }) }}
          initial="enter" animate="center" exit="exit" transition={{ duration: reduced ? 0 : .24, ease: [.22, 1, .36, 1] }}
          drag={!reduced && memories.length > 1 ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={.15}
          onPointerDown={() => { wasDragging.current = false; }}
          onDragStart={() => { wasDragging.current = true; }}
          onDragEnd={(_, info) => {
            const distance = Math.abs(info.offset.x) > 48 ? info.offset.x : Math.abs(info.velocity.x) > 500 ? info.velocity.x : 0;
            if (distance) move(distance < 0 ? 1 : -1);
          }}
          className="memory-slide" style={{ touchAction: 'pan-y' }}>
          <button type="button" className={`memory-open ${cover ? '' : 'memory-no-photo'}`} onClick={() => { if (!wasDragging.current) onOpenJournal(memory); }} aria-label={`Mở kỷ niệm: ${memory.title || 'Một ngày bên nhau'}`}>
            {cover ? <img src={cover} alt="" draggable={false} loading="lazy" /> : <BookOpen className="memory-placeholder" size={64} aria-hidden="true" />}
            <span className="memory-date">{formatDateVN(memory.date)}</span>
            <span className="memory-caption"><span>{memory.location && <span className="memory-location"><MapPin size={13} />{memory.location}</span>}<strong>{memory.title || 'Một ngày bên nhau'}</strong></span><span className="memory-open-icon"><ArrowUpRight size={21} /></span></span>
          </button>
        </motion.div>
      </AnimatePresence>
      <div className="memory-pagination">
        <span aria-live="polite" aria-atomic="true">{index + 1} / {memories.length} kỷ niệm</span>
        <div>{memories.map((item, i) => <button type="button" key={item.id} aria-label={`Xem kỷ niệm ${i + 1}`} aria-pressed={i === index} onClick={() => { setDirection(i >= index ? 1 : -1); setSelectedId(item.id); }}><span /></button>)}</div>
      </div>
    </div> : <div className="memory-empty">
      <span className="memory-empty-icon"><BookOpen size={32} strokeWidth={1.5} /></span>
      <h3>Kỷ niệm đầu tiên đang chờ</h3>
      <p>Chọn một tấm ảnh, viết vài dòng.<br />Để những ngày bình thường cũng được nhớ.</p>
      <button type="button" className="home-primary" onClick={onCreateJournal}>Viết trang đầu tiên <ArrowUpRight size={17} /></button>
    </div>}
  </section>;
}
