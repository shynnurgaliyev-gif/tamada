/* ── MiniPicker ────────────────────────────────────────────────────────────────
   iOS-style wheel picker — centered floating card (like native time picker).
   - Portal → always positioned relative to viewport
   - Frosted-glass card, all 4 corners rounded, scale-in animation
   - Action bar: [Отмена] [Title] [✓ circle]
   - "Свой вариант" at the end → exposes text input
────────────────────────────────────────────────────────────────────────────── */

import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getTelegramWebApp } from '@/lib/telegram';

/* ── Subcategory presets ───────────────────────────────────────────────────── */
export const SUBCATEGORIES: Record<string, string[]> = {
  'Тамада':    ['Ведущий праздников', 'Тамада на свадьбу', 'Корпоративный ведущий', 'Детский праздник', 'Развлекательная программа'],
  'Фотограф':  ['Свадебный фотограф', 'Семейный фотограф', 'Ньюборн', 'Портретная съёмка', 'Репортажная съёмка', 'Love story'],
  'Видеограф': ['Свадебный видеограф', 'Клипмейкер', 'Видеоотчёт', 'Аэросъёмка', 'Видеопродакшн'],
  'DJ':        ['DJ на свадьбу', 'DJ на корпоратив', 'DJ на день рождения', 'Club DJ', 'Sound-продюсер'],
  'Декоратор': ['Свадебный декор', 'Флористика', 'Оформление зала', 'Выездная церемония', 'Украшение авто'],
  'Флорист':   ['Свадебные букеты', 'Цветочные композиции', 'Оформление зала', 'Живые цветы', 'Флористика событий'],
  'Артист':    ['Певец / Певица', 'Музыкальная группа', 'Кавер-группа', 'Стендап', 'Живая музыка'],
  'Аниматор':  ['Детский аниматор', 'Клоун', 'Интерактивное шоу', 'Ростовые куклы', 'Игровая программа'],
};

/* ── Wheel constants ────────────────────────────────────────────────────────── */
const ITEM_H  = 50;
const VISIBLE = 5;
const HALF    = Math.floor(VISIBLE / 2);

const CUSTOM_LABEL = 'Свой вариант';

/* ── MiniPicker ────────────────────────────────────────────────────────────── */
export function MiniPicker({
  title,
  options,
  value,
  onConfirm,
  onClose,
  allowCustom = false,
}: {
  title:        string;
  options:      string[];
  value:        string;
  onConfirm:    (value: string) => void;
  onClose:      () => void;
  allowCustom?: boolean;
}) {
  const allOptions = allowCustom ? [...options, CUSTOM_LABEL] : options;

  const isCustomInit = !!value && !options.includes(value) && value !== CUSTOM_LABEL;
  const initSel = isCustomInit
    ? CUSTOM_LABEL
    : (value && allOptions.includes(value) ? value : (allOptions[0] ?? CUSTOM_LABEL));

  const [selected,   setSelected]   = useState(initSel);
  const [customText, setCustomText] = useState(isCustomInit ? value : '');

  const isCustom   = selected === CUSTOM_LABEL;
  const canConfirm = isCustom ? !!customText.trim() : !!selected;

  // Track visual viewport height — shrinks when keyboard opens on iOS/Android.
  // This keeps the card centered in the *visible* area, not the full screen.
  const [vpHeight, setVpHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 600
  );
  const [vpTop, setVpTop] = useState<number>(0);
  useEffect(() => {
    const vp = window.visualViewport;
    if (!vp) return;
    const update = () => { setVpHeight(vp.height); setVpTop(vp.offsetTop); };
    vp.addEventListener('resize', update);
    vp.addEventListener('scroll', update);
    update();
    return () => { vp.removeEventListener('resize', update); vp.removeEventListener('scroll', update); };
  }, []);

  // Semi-transparent background — required for backdrop-filter blur to be visible.
  // var(--tg-theme-secondary-bg-color) is fully opaque and would hide the blur.
  const isDark  = getTelegramWebApp()?.colorScheme !== 'light';
  const cardBg  = isDark ? 'rgba(28,28,30,0.40)'  : 'rgba(242,242,247,0.40)';
  const fadeBg  = isDark ? 'rgba(28,28,30,0.92)'  : 'rgba(242,242,247,0.92)';

  function confirm() {
    const result = isCustom ? customText.trim() : selected;
    if (result) onConfirm(result);
    else onClose();
  }

  const card = (
    /* ── Backdrop ───────────────────────────────────────────────────────── */
    <div
      className="mini-overlay"
      onClick={onClose}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        // Override inset:0 with visual viewport so card centers in visible area above keyboard
        top: vpTop,
        height: vpHeight,
        bottom: 'auto',
      }}
    >
      {/* ── Floating glass card ──────────────────────────────────────── */}
      <div
        className="mini-scalein"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 360,
          borderRadius: 16,
          overflow: 'hidden',
          background: cardBg,
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          boxShadow: '0 24px 60px rgba(0,0,0,.5)',
        } as React.CSSProperties}
      >
        {/* ── Action bar — TOP so keyboard never covers it ────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px 10px',
          borderBottom: '1px solid rgba(128,128,128,.15)',
        }}>
          {/* Cancel */}
          <button
            className="mini-tap"
            onClick={onClose}
            style={{
              border: 'none', background: 'none',
              fontFamily: 'inherit', fontSize: 16, fontWeight: 500,
              color: 'var(--tg-theme-hint-color,#8e8e93)',
              cursor: 'pointer', padding: '6px 0', minWidth: 72,
            }}
          >
            Отмена
          </button>

          {/* Title */}
          <span style={{
            flex: 1, textAlign: 'center',
            fontWeight: 700, fontSize: 15,
            color: 'var(--tg-theme-text-color,#fff)',
          }}>
            {title}
          </span>

          {/* Confirm circle */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', minWidth: 72 }}>
            <button
              className="mini-tap"
              onClick={confirm}
              disabled={!canConfirm}
              style={{
                width: 44, height: 44, borderRadius: 22, border: 'none',
                background: canConfirm
                  ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                  : 'rgba(124,58,237,.22)',
                cursor: canConfirm ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: canConfirm ? '0 3px 14px rgba(124,58,237,.5)' : 'none',
                flexShrink: 0,
                transition: 'background .15s, box-shadow .15s',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l5 5 7-9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Wheel ──────────────────────────────────────────────────── */}
        {allOptions.length > 0 && (
          <WheelScroll
            options={allOptions}
            value={selected}
            onChange={setSelected}
            fadeBg={fadeBg}
          />
        )}

        {/* ── Custom text input ──────────────────────────────────────── */}
        {isCustom && (
          <div style={{ padding: '12px 16px 16px' }}>
            <input
              autoFocus
              className="mini-input"
              value={customText}
              maxLength={80}
              placeholder="Введите вариант…"
              onChange={e => setCustomText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirm(); }}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (typeof window === 'undefined') return card;
  return createPortal(card, document.body);
}

/* ── WheelScroll ────────────────────────────────────────────────────────────── */
function WheelScroll({
  options,
  value,
  onChange,
  fadeBg,
}: {
  options:  string[];
  value:    string;
  onChange: (v: string) => void;
  fadeBg:   string;
}) {
  const ref        = useRef<HTMLDivElement>(null);
  const [scrollY,  setScrollY]  = useState(() => Math.max(0, options.indexOf(value)) * ITEM_H);
  const snapTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerH = ITEM_H * VISIBLE;

  useEffect(() => {
    const idx = Math.max(0, options.indexOf(value));
    const el  = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = idx * ITEM_H;
      setScrollY(idx * ITEM_H);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleScroll() {
    if (!ref.current) return;
    setScrollY(ref.current.scrollTop);
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = clamp(Math.round(ref.current.scrollTop / ITEM_H));
      onChange(options[idx]);
    }, 100);
  }

  function clamp(i: number) { return Math.max(0, Math.min(options.length - 1, i)); }

  function scrollToIdx(i: number) {
    const idx = clamp(i);
    onChange(options[idx]);
    ref.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
  }

  return (
    <div
      style={{
        position: 'relative',
        height: containerH,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      } as React.CSSProperties}
    >
      {/* Top fade */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: ITEM_H * HALF,
        background: `linear-gradient(to bottom, ${fadeBg} 20%, transparent 100%)`,
        pointerEvents: 'none', zIndex: 3,
      }} />

      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: ITEM_H * HALF,
        background: `linear-gradient(to top, ${fadeBg} 20%, transparent 100%)`,
        pointerEvents: 'none', zIndex: 3,
      }} />

      {/* Selection indicator */}
      <div style={{
        position: 'absolute',
        top: ITEM_H * HALF, height: ITEM_H,
        left: 16, right: 16,
        borderTop: '1px solid rgba(124,58,237,.5)',
        borderBottom: '1px solid rgba(124,58,237,.5)',
        pointerEvents: 'none', zIndex: 4,
      }} />

      {/* Scroll list */}
      <div
        ref={ref}
        onScroll={handleScroll}
        className="mini-wheel-scroll"
        style={{
          height: containerH,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          paddingTop: ITEM_H * HALF,
          paddingBottom: ITEM_H * HALF,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        {options.map((opt, i) => {
          const dist     = Math.abs(i * ITEM_H - scrollY) / ITEM_H;
          const opacity  = Math.max(0.18, 1 - dist * 0.45);
          const scale    = Math.max(0.70, 1 - dist * 0.12);
          const isCenter = Math.round(scrollY / ITEM_H) === i;

          return (
            <div
              key={opt}
              onClick={() => scrollToIdx(i)}
              style={{
                height: ITEM_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                scrollSnapAlign: 'center',
                paddingLeft: 24, paddingRight: 24,
                textAlign: 'center',
                fontSize: isCenter ? 22 : 16,
                fontWeight: isCenter ? 700 : 400,
                color: opt === CUSTOM_LABEL && !isCenter
                  ? 'var(--tg-theme-hint-color,#8e8e93)'
                  : 'var(--tg-theme-text-color,#fff)',
                opacity,
                transform: `scale(${scale})`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {opt}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── PickerRow ──────────────────────────────────────────────────────────────── */
export function PickerRow({ label, value, placeholder, onOpen, optional, disabled }: {
  label:       string;
  value:       string;
  placeholder: string;
  onOpen:      () => void;
  optional?:   boolean;
  disabled?:   boolean;
}) {
  return (
    <button
      className="mini-tap"
      onClick={onOpen}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '13px 16px',
        background: 'var(--tg-theme-secondary-bg-color,#fff)',
        border: '1px solid rgba(0,0,0,.09)',
        borderRadius: 12, marginBottom: 10,
        fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--tg-theme-hint-color,#6b7280)', marginBottom: 2 }}>
          {label}{optional ? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> — необязательно</span> : ''}
        </div>
        <div style={{ fontSize: 15, fontWeight: value ? 600 : 400, color: value ? 'var(--tg-theme-text-color,#0a0a0f)' : 'var(--tg-theme-hint-color,#9ca3af)' }}>
          {value || placeholder}
        </div>
      </div>
      <span style={{ fontSize: 16, color: 'rgba(0,0,0,.2)', marginLeft: 8 }}>›</span>
    </button>
  );
}
