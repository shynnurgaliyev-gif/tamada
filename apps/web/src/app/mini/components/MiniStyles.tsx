/* ── MiniStyles ───────────────────────────────────────────────────────────────
   Injects all CSS needed by the Mini App shell as a single <style> tag.
   Kept as a component so it renders client-side and avoids SSR conflicts with
   the Telegram theme CSS variables (--tg-theme-*).
────────────────────────────────────────────────────────────────────────────── */

export function MiniStyles() {
  return (
    <style>{`
      html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
      body {
        background: var(--tg-theme-bg-color, #f7f6ff);
        overscroll-behavior: none;
        -webkit-user-select: none; user-select: none;
      }
      * { box-sizing: border-box; }

      /* ── Root container ───────────────────────────────────────── */
      .mini-root {
        height: 100dvh;
        display: flex;
        flex-direction: column;
        background: var(--tg-theme-bg-color, #f7f6ff);
        color: var(--tg-theme-text-color, #0a0a0f);
        font-family: system-ui, -apple-system, sans-serif;
        overflow: hidden;
      }

      /* ── Top bar ─────────────────────────────────────────────── */
      .mini-topbar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        background: var(--tg-theme-secondary-bg-color, #fff);
        border-bottom: 1px solid rgba(0,0,0,.07);
        flex-shrink: 0;
        min-height: 60px;
      }

      /* ── Scrollable content area ─────────────────────────────── */
      .mini-content {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 16px;
        padding-bottom: 32px;
        -webkit-overflow-scrolling: touch;
        scroll-padding-bottom: 80px;
      }

      /* Ensure focused inputs scroll into view above keyboard (iOS keyboard ~300px) */
      input:focus, textarea:focus, select:focus {
        scroll-margin-bottom: 280px;
      }

      /* ── Bottom navigation ───────────────────────────────────── */
      .mini-nav {
        display: flex;
        align-items: stretch;
        background: var(--tg-theme-secondary-bg-color, #fff);
        border-top: 1px solid rgba(0,0,0,.07);
        padding-bottom: env(safe-area-inset-bottom, 6px);
        flex-shrink: 0;
        z-index: 10;
      }
      .mini-nav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 8px 0 5px;
        border: none;
        background: transparent;
        color: var(--tg-theme-hint-color, #9ca3af);
        font-family: inherit;
      }
      .mini-nav-item[data-active=true] { color: #7c3aed; }
      .mini-nav-icon  { font-size: 20px; line-height: 1.1; }
      .mini-nav-label { font-size: 10px; font-weight: 600; letter-spacing: .01em; }
      .mini-nav-add {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        padding: 4px 0 5px;
        border: none;
        background: transparent;
        font-family: inherit;
        color: var(--tg-theme-hint-color, #9ca3af);
      }
      .mini-nav-add-pill {
        width: 44px; height: 28px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        border-radius: 9px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 900; color: #fff; line-height: 1;
        box-shadow: 0 2px 10px rgba(124,58,237,.38);
      }

      /* ── Cards ────────────────────────────────────────────────── */
      .mini-card {
        background: var(--tg-theme-secondary-bg-color, #fff);
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 12px;
      }

      /* ── Avatars ─────────────────────────────────────────────── */
      .mini-avatar {
        width: 44px; height: 44px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        border-radius: 13px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 800; color: #fff;
        flex-shrink: 0;
      }
      .mini-avatar-sm {
        width: 32px; height: 32px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        border-radius: 9px;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 800; color: #fff;
        flex-shrink: 0;
      }

      /* ── Buttons ─────────────────────────────────────────────── */
      .mini-btn {
        display: flex; align-items: center; justify-content: center;
        gap: 6px; padding: 13px; width: 100%;
        border: none; border-radius: 13px;
        font-family: inherit; font-size: 15px; font-weight: 700;
        cursor: pointer; text-decoration: none;
      }
      .mini-btn-primary {
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: #fff;
        box-shadow: 0 3px 12px rgba(124,58,237,.3);
      }
      .mini-btn-outline {
        background: transparent;
        color: #7c3aed;
        border: 1.5px solid rgba(124,58,237,.3);
      }
      .mini-btn-ghost {
        background: rgba(124,58,237,.07);
        color: #7c3aed;
        border: none;
      }

      /* ── Nav list rows ────────────────────────────────────────── */
      .mini-row {
        display: flex; align-items: center; gap: 12px;
        padding: 13px 14px;
        background: var(--tg-theme-secondary-bg-color, #fff);
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 13px;
        text-decoration: none;
        color: inherit;
        margin-bottom: 8px;
      }
      .mini-row-icon {
        width: 38px; height: 38px;
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; flex-shrink: 0;
      }
      .mini-row-chevron { margin-left: auto; font-size: 16px; color: rgba(0,0,0,.2); flex-shrink: 0; }

      /* ── Section label ────────────────────────────────────────── */
      .mini-section-label {
        font-size: 11px; font-weight: 700;
        text-transform: uppercase; letter-spacing: .1em;
        color: var(--tg-theme-hint-color, #9ca3af);
        margin: 16px 0 8px;
      }

      /* ── Stat cards grid ─────────────────────────────────────── */
      .mini-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-bottom: 12px;
      }
      .mini-stat {
        background: var(--tg-theme-secondary-bg-color, #fff);
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 14px;
        padding: 14px 12px;
      }

      /* ── Calendar month grid ─────────────────────────────────── */
      .mini-cal-grid {
        display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;
      }
      .mini-cal-day {
        aspect-ratio: 1;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; border-radius: 8px;
      }
      /* Full-featured month calendar */
      .mcal-nav {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 14px;
      }
      .mcal-nav-btn {
        width: 36px; height: 36px; border: none; border-radius: 10px;
        background: rgba(0,0,0,.06); font-size: 18px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-family: inherit;
      }
      .mcal-month-label { font-weight: 800; font-size: 17px; }
      .mcal-dow-row {
        display: grid; grid-template-columns: repeat(7, 1fr);
        gap: 3px; margin-bottom: 4px;
      }
      .mcal-dow {
        text-align: center; font-size: 11px; font-weight: 700;
        color: var(--tg-theme-hint-color, #9ca3af); padding: 2px 0;
      }
      .mcal-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; margin-bottom: 3px; }
      .mcal-cell {
        aspect-ratio: 1;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        border-radius: 10px; font-size: 13px; font-weight: 600; position: relative;
        cursor: pointer; transition: opacity .15s;
      }
      .mcal-cell:active { opacity: 0.6; }
      .mcal-cell[data-empty=true] { cursor: default; pointer-events: none; }
      .mcal-cell[data-today=true] { box-shadow: inset 0 0 0 2px #7c3aed; color: #7c3aed; font-weight: 800; }
      .mcal-cell[data-selected=true] { background: #7c3aed !important; color: #fff !important; box-shadow: none; }
      .mcal-dot {
        width: 5px; height: 5px; border-radius: 50%;
        position: absolute; bottom: 3px;
      }
      .mcal-legend {
        display: flex; flex-wrap: wrap; gap: 8px 16px;
        margin-top: 14px; padding-top: 12px;
        border-top: 1px solid rgba(0,0,0,.07);
      }
      .mcal-legend-item {
        display: flex; align-items: center; gap: 5px;
        font-size: 11px; color: var(--tg-theme-hint-color, #6b7280);
      }
      .mcal-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

      /* ── Day timeline ─────────────────────────────────────────── */
      .mcal-day-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 14px;
      }
      .mcal-day-title { font-weight: 800; font-size: 17px; }
      .mcal-day-add {
        width: 34px; height: 34px; border-radius: 10px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        border: none; color: #fff; font-size: 20px; font-weight: 700;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(124,58,237,.35);
      }
      .mcal-timeline { position: relative; }
      .mcal-hour-row {
        display: flex; align-items: flex-start; gap: 0;
        height: 56px; position: relative;
      }
      .mcal-hour-label {
        width: 44px; flex-shrink: 0;
        font-size: 11px; color: var(--tg-theme-hint-color, #9ca3af);
        padding-top: 0; text-align: right; padding-right: 8px;
        line-height: 1; margin-top: -6px;
      }
      .mcal-hour-line {
        flex: 1; border-top: 1px solid rgba(0,0,0,.07);
        height: 56px;
      }
      .mcal-hour-line[data-half=true] {
        border-top: 1px dashed rgba(0,0,0,.04);
        margin-top: 28px; height: 28px;
      }
      .mcal-entries-layer {
        position: absolute; left: 44px; right: 0; top: 0; bottom: 0;
        pointer-events: none;
      }
      .mcal-entry-block {
        position: absolute; left: 4px; right: 4px;
        border-radius: 8px; padding: 4px 8px;
        overflow: hidden; pointer-events: all; cursor: pointer;
        display: flex; flex-direction: column; justify-content: flex-start;
        min-height: 24px;
      }
      .mcal-entry-title { font-size: 11px; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .mcal-entry-time  { font-size: 10px; opacity: 0.8; margin-top: 1px; }
      .mcal-allday-bar {
        margin-bottom: 8px; border-radius: 8px;
        padding: 7px 10px;
        font-size: 12px; font-weight: 700;
        cursor: pointer;
      }
      .mcal-empty-day {
        text-align: center; padding: 32px 0;
        color: var(--tg-theme-hint-color, #9ca3af); font-size: 14px;
      }

      /* ── Entry form ───────────────────────────────────────────── */
      .mcal-form-section {
        font-size: 11px; font-weight: 700;
        text-transform: uppercase; letter-spacing: .08em;
        color: var(--tg-theme-hint-color, #9ca3af);
        margin: 16px 0 8px;
      }
      .mcal-status-grid {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px;
      }
      .mcal-status-btn {
        padding: 10px 8px; border-radius: 12px;
        border: 1.5px solid rgba(0,0,0,.08);
        background: var(--tg-theme-secondary-bg-color, #fff);
        font-family: inherit; font-size: 12px; font-weight: 700;
        cursor: pointer; text-align: center; display: flex;
        flex-direction: column; align-items: center; gap: 3px;
      }
      .mcal-status-btn[data-selected=true] { border-color: #7c3aed; background: rgba(124,58,237,.07); color: #7c3aed; }
      .mcal-delete-btn {
        width: 100%; padding: 13px; border: none;
        background: rgba(239,68,68,.08); border-radius: 13px;
        color: #ef4444; font-family: inherit; font-size: 15px; font-weight: 700;
        cursor: pointer; margin-top: 8px;
      }

      /* ── Sheet overlay ────────────────────────────────────────── */
      .mini-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,.45);
        z-index: 200;
        display: flex; align-items: flex-end;
      }
      .mini-sheet {
        width: 100%;
        background: var(--tg-theme-secondary-bg-color, #fff);
        border-radius: 20px 20px 0 0;
        padding: 8px 0 0;
        position: relative;
        z-index: 210;
      }
      .mini-sheet-handle {
        width: 36px; height: 4px;
        background: rgba(0,0,0,.12);
        border-radius: 2px;
        margin: 0 auto 16px;
      }

      /* ── Status dot ───────────────────────────────────────────── */
      .mini-status-dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      /* ── Interaction ─────────────────────────────────────────── */
      .mini-tap { -webkit-tap-highlight-color: transparent; cursor: pointer; }
      .mini-tap:active { opacity: 0.62; }

      /* ── Animations ──────────────────────────────────────────── */
      @keyframes mini-fadein {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .mini-fadein { animation: mini-fadein 0.2s ease both; }

      @keyframes mini-slideup {
        from { transform: translateY(100%); opacity: 0.5; }
        to   { transform: translateY(0); opacity: 1; }
      }
      .mini-slideup { animation: mini-slideup 0.28s cubic-bezier(.32,1.28,.64,1) both; }

      @keyframes mini-spin { to { transform: rotate(360deg); } }

      @keyframes mini-scalein {
        from { opacity: 0; transform: scale(0.86); }
        to   { opacity: 1; transform: scale(1); }
      }
      .mini-scalein { animation: mini-scalein 0.22s cubic-bezier(.34,1.56,.64,1) both; }

      /* ── Forms ───────────────────────────────────────────────── */
      .mini-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
      .mini-field label { font-size: 12px; font-weight: 700; color: var(--tg-theme-hint-color, #6b7280); text-transform: uppercase; letter-spacing: .06em; }
      .mini-input {
        width: 100%; padding: 12px 14px;
        background: var(--tg-theme-bg-color, #f7f6ff);
        border: 1.5px solid rgba(0,0,0,.1);
        border-radius: 12px;
        font-family: inherit; font-size: 15px;
        color: var(--tg-theme-text-color, #0a0a0f);
        outline: none;
        -webkit-user-select: text; user-select: text;
      }
      .mini-input:focus { border-color: #7c3aed; }
      .mini-input[data-error=true] { border-color: #ef4444; }
      textarea.mini-input { resize: none; line-height: 1.5; }
      .mini-toggle-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 14px;
        background: var(--tg-theme-secondary-bg-color, #fff);
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 12px;
        margin-bottom: 8px;
      }
      .mini-toggle {
        position: relative; width: 42px; height: 24px; cursor: pointer;
      }
      .mini-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
      .mini-toggle-track {
        position: absolute; inset: 0;
        background: rgba(0,0,0,.12); border-radius: 12px;
        transition: background .2s;
      }
      .mini-toggle input:checked ~ .mini-toggle-track { background: #7c3aed; }
      .mini-toggle-thumb {
        position: absolute; top: 3px; left: 3px;
        width: 18px; height: 18px;
        background: #fff; border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0,0,0,.2);
        transition: transform .2s;
      }
      .mini-toggle input:checked ~ .mini-toggle-thumb { transform: translateX(18px); }
      .mini-error-msg { font-size: 12px; color: #ef4444; margin-top: -10px; margin-bottom: 10px; }

      /* ── Photo grid ───────────────────────────────────────────── */
      .mini-photo-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 16px;
      }
      .mini-photo-cell {
        aspect-ratio: 1;
        border-radius: 12px;
        overflow: hidden;
        position: relative;
        background: rgba(0,0,0,.06);
      }
      .mini-photo-cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .mini-photo-del {
        position: absolute; top: 5px; right: 5px;
        width: 22px; height: 22px;
        background: rgba(0,0,0,.55); border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; color: #fff; cursor: pointer; border: none;
      }
      .mini-photo-cover-badge {
        position: absolute; bottom: 5px; left: 5px;
        background: #7c3aed; color: #fff;
        font-size: 9px; font-weight: 700; letter-spacing: .05em;
        padding: 2px 6px; border-radius: 5px;
      }
      .mini-photo-add {
        aspect-ratio: 1;
        border-radius: 12px;
        border: 1.5px dashed rgba(124,58,237,.35);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 4px; cursor: pointer;
        background: rgba(124,58,237,.04);
        color: #7c3aed;
        font-size: 11px; font-weight: 600;
      }
      .mini-photo-add-icon { font-size: 22px; }

      /* ── Link chips ───────────────────────────────────────────── */
      .mini-link-type-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 14px;
      }
      .mini-link-type-btn {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 4px; padding: 10px 6px;
        background: var(--tg-theme-secondary-bg-color, #fff);
        border: 1.5px solid rgba(0,0,0,.08);
        border-radius: 12px;
        font-family: inherit; font-size: 11px; font-weight: 600;
        cursor: pointer; color: inherit;
      }
      .mini-link-type-btn[data-selected=true] {
        border-color: #7c3aed;
        background: rgba(124,58,237,.07);
        color: #7c3aed;
      }
      .mini-link-type-icon { font-size: 20px; }
      .mini-link-row {
        display: flex; align-items: center; gap: 10px;
        padding: 11px 12px;
        background: var(--tg-theme-secondary-bg-color, #fff);
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 12px;
        margin-bottom: 8px;
      }
      .mini-link-row-icon { font-size: 18px; flex-shrink: 0; }
      .mini-link-row-url { flex: 1; font-size: 13px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--tg-theme-hint-color, #6b7280); }
      .mini-link-del {
        padding: 4px 8px; border: none; background: none;
        font-size: 16px; cursor: pointer; color: rgba(0,0,0,.3);
        flex-shrink: 0;
      }

      /* ── Wheel picker scrollbar hide ────────────────────────── */
      .mini-wheel-scroll::-webkit-scrollbar { display: none; }

      /* ── Skeleton shimmer ────────────────────────────────────── */
      @keyframes mini-shimmer {
        0%   { background-position: -300px 0; }
        100% { background-position:  300px 0; }
      }
      .mini-skeleton {
        background: linear-gradient(90deg,
          rgba(0,0,0,.05) 25%,
          rgba(0,0,0,.09) 50%,
          rgba(0,0,0,.05) 75%
        );
        background-size: 600px 100%;
        animation: mini-shimmer 1.4s infinite;
        border-radius: 10px;
      }
    `}</style>
  );
}
