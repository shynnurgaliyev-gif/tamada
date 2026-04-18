/* ── MiniPicker ────────────────────────────────────────────────────────────────
   iOS-style wheel picker in a bottom sheet.
   - Scroll-snap wheel with fade + scale effect
   - "Свой вариант" at the end → exposes text input
   - Subcategory suggestions per category via SUBCATEGORIES map
────────────────────────────────────────────────────────────────────────────── */

import { useRef, useState, useEffect } from 'react';

/* ── Subcategory presets (used by edit + create forms) ─────────────────────── */
export const SUBCATEGORIES: Record<string, string[]> = {
  'Тамада':     ['Ведущий праздников', 'Тамада на свадьбу', 'Корпоративный ведущий', 'Детский праздник', 'Развлекательная программа'],
  'Фотограф':   ['Свадебный фотограф', 'Семейный фотограф', 'Ньюборн', 'Портретная съёмка', 'Репортажная съёмка', 'Love story'],
  'Видеограф':  ['Свадебный видеограф', 'Клипмейкер', 'Видеоотчёт', 'Аэросъёмка', 'Видеопродакшн'],
  'DJ':         ['DJ на свадьбу', 'DJ на корпоратив', 'DJ на день рождения', 'Club DJ', 'Sound-продюсер'],
  'Декоратор':  ['Свадебный декор', 'Флористика', 'Оформление зала', 'Выездная церемония', 'Украшение авто'],
  'Флорист':    ['Свадебные букеты', 'Цветочные композиции', 'Оформление зала', 'Живые цветы', 'Флористика событий'],
  'Артист':     ['Певец / Певица', 'Музыкальная группа', 'Кавер-группа', 'Стендап', 'Живая музыка'],
  'Аниматор':   ['Детский аниматор', 'Клоун', 'Интерактивное шоу', 'Ростовые куклы', 'Игровая программа'],
};

/* ── Wheel constants ────────────────────────────────────────────────────────── */
const ITEM_H   = 44;  // px per item
const VISIBLE  = 5;   // items visible (must be odd)
const HALF     = Math.floor(VISIBLE / 2);  // items above/below center = 2

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

  // Detect if initial value is a custom (not in options list)
  const isCustomInit = !!value && !options.includes(value) && value !== CUSTOM_LABEL;
  const initSel = isCustomInit
    ? CUSTOM_LABEL
    : (value && allOptions.includes(value) ? value : (allOptions[0] ?? CUSTOM_LABEL));

  const [selected,   setSelected]   = useState(initSel);
  const [customText, setCustomText] = useState(isCustomInit ? value : '');

  const isCustom = selected === CUSTOM_LABEL;

  function confirm() {
    const result = isCustom ? customText.trim() : selected;
    if (result) onConfirm(result);
    else onClose();
  }

  return (
    <div className="mini-overlay" onClick={onClose}>
      <div className="mini-sheet mini-slideup" onClick={e => e.stopPropagation()}>
        <div className="mini-sheet-handle" />
        <div style={{ padding: '0 0 24px' }}>

          {/* Title */}
          <div style={{ fontWeight: 800, fontSize: 17, textAlign: 'center', padding: '0 16px 12px' }}>
            {title}
          </div>

          {/* Wheel — always shown when there are options */}
          {allOptions.length > 0 && (
            <WheelScroll
              options={allOptions}
              value={selected}
              onChange={setSelected}
            />
          )}

          {/* Custom text input */}
          {isCustom && (
            <div style={{ padding: '12px 16px 0' }}>
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

          {/* Confirm */}
          <div style={{ padding: '14px 16px 0' }}>
            <button
              className="mini-btn mini-btn-primary mini-tap"
              onClick={confirm}
              disabled={isCustom ? !customText.trim() : !selected}
            >
              Выбрать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── WheelScroll ────────────────────────────────────────────────────────────── */
function WheelScroll({
  options,
  value,
  onChange,
}: {
  options:  string[];
  value:    string;
  onChange: (v: string) => void;
}) {
  const ref       = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(() => Math.max(0, options.indexOf(value)) * ITEM_H);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerH = ITEM_H * VISIBLE;

  // Init scroll position on mount — rAF ensures layout is ready after slideup animation
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
    const st = ref.current.scrollTop;
    setScrollY(st);

    // Debounce: commit selection after wheel settles
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = clampIdx(Math.round(ref.current.scrollTop / ITEM_H));
      onChange(options[idx]);
    }, 100);
  }

  function clampIdx(i: number) {
    return Math.max(0, Math.min(options.length - 1, i));
  }

  function scrollToIdx(i: number) {
    const idx = clampIdx(i);
    onChange(options[idx]);
    ref.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
  }

  return (
    <div
      style={{
        position: 'relative',
        height: containerH,
        background: 'var(--tg-theme-secondary-bg-color, #fff)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      } as React.CSSProperties}
    >
      {/* ── Top fade ───────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: ITEM_H * HALF,
        background: 'linear-gradient(to bottom, var(--tg-theme-secondary-bg-color,#fff) 15%, transparent 100%)',
        pointerEvents: 'none', zIndex: 3,
      }} />

      {/* ── Bottom fade ────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: ITEM_H * HALF,
        background: 'linear-gradient(to top, var(--tg-theme-secondary-bg-color,#fff) 15%, transparent 100%)',
        pointerEvents: 'none', zIndex: 3,
      }} />

      {/* ── Center selection indicator ─────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: ITEM_H * HALF,
        height: ITEM_H,
        left: 20, right: 20,
        borderTop: '1px solid rgba(124,58,237,.35)',
        borderBottom: '1px solid rgba(124,58,237,.35)',
        pointerEvents: 'none', zIndex: 4,
      }} />

      {/* ── Scroll list ────────────────────────────────────────── */}
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
          /* hide scrollbar */
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        {options.map((opt, i) => {
          // distance in item-heights from current center
          const dist     = Math.abs(i * ITEM_H - scrollY) / ITEM_H;
          const opacity  = Math.max(0.20, 1 - dist * 0.40);
          const scale    = Math.max(0.78, 1 - dist * 0.09);
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
                fontSize: 17,
                fontWeight: isCenter ? 600 : 400,
                color: isCenter
                  ? 'var(--tg-theme-text-color,#0a0a0f)'
                  : (opt === CUSTOM_LABEL ? 'var(--tg-theme-hint-color,#6b7280)' : 'var(--tg-theme-text-color,#0a0a0f)'),
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
