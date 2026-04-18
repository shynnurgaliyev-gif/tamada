/* ── MiniPicker ────────────────────────────────────────────────────────────────
   Bottom-sheet option picker.
   - Scrollable list with checkmarks
   - Optional "Свой вариант" that exposes a text input
   - Confirm button selects and closes
────────────────────────────────────────────────────────────────────────────── */

import { useState, useEffect, useRef } from 'react';

const CUSTOM_KEY = '__custom__';

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
  // If options list is empty, always start in custom mode
  const isCustomInit = (!!value && !options.includes(value)) || options.length === 0;
  const [sel,    setSel]    = useState(isCustomInit ? CUSTOM_KEY : value);
  const [custom, setCustom] = useState(isCustomInit ? value : '');
  const inputRef            = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sel === CUSTOM_KEY) {
      // Small delay so sheet animation finishes before keyboard opens
      const t = setTimeout(() => inputRef.current?.focus(), 180);
      return () => clearTimeout(t);
    }
  }, [sel]);

  function confirm() {
    const result = sel === CUSTOM_KEY ? custom.trim() : sel;
    if (result) onConfirm(result);
    else onClose();
  }

  return (
    <div className="mini-overlay" onClick={onClose}>
      <div className="mini-sheet mini-slideup" onClick={e => e.stopPropagation()}>
        <div className="mini-sheet-handle" />
        <div style={{ padding: '0 16px 24px' }}>

          {/* Title row */}
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>{title}</div>

          {/* Option list — hidden when no preset options */}
          {options.length > 0 && (
          <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12, borderRadius: 12, border: '1px solid rgba(0,0,0,.07)', overflow: 'hidden' }}>
            {options.map((opt, i) => (
              <button
                key={opt}
                className="mini-tap"
                onClick={() => setSel(opt)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '13px 16px',
                  border: 'none',
                  borderTop: i > 0 ? '1px solid rgba(0,0,0,.06)' : 'none',
                  background: sel === opt ? 'rgba(124,58,237,.07)' : 'var(--tg-theme-secondary-bg-color,#fff)',
                  color: sel === opt ? '#7c3aed' : 'var(--tg-theme-text-color,#0a0a0f)',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  fontWeight: sel === opt ? 700 : 400,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {opt}
                {sel === opt && <span style={{ fontSize: 16 }}>✓</span>}
              </button>
            ))}

            {allowCustom && (
              <button
                className="mini-tap"
                onClick={() => setSel(CUSTOM_KEY)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '13px 16px',
                  border: 'none',
                  borderTop: '1px solid rgba(0,0,0,.06)',
                  background: sel === CUSTOM_KEY ? 'rgba(124,58,237,.07)' : 'var(--tg-theme-secondary-bg-color,#fff)',
                  color: sel === CUSTOM_KEY ? '#7c3aed' : 'var(--tg-theme-hint-color,#6b7280)',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  fontWeight: sel === CUSTOM_KEY ? 700 : 400,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Свой вариант
                {sel === CUSTOM_KEY && <span style={{ fontSize: 16 }}>✓</span>}
              </button>
            )}
          </div>
          )}

          {/* Custom text input */}
          {sel === CUSTOM_KEY && (
            <input
              ref={inputRef}
              className="mini-input"
              value={custom}
              maxLength={80}
              placeholder="Введите вариант…"
              onChange={e => setCustom(e.target.value)}
              style={{ marginBottom: 12 }}
            />
          )}

          {/* Confirm */}
          <button
            className="mini-btn mini-btn-primary mini-tap"
            onClick={confirm}
            disabled={sel === CUSTOM_KEY ? !custom.trim() : !sel}
          >
            Выбрать
          </button>
        </div>
      </div>
    </div>
  );
}
