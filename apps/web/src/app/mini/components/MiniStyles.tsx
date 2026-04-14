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
        overflow-y: auto;
        overflow-x: hidden;
        padding: 16px;
        -webkit-overflow-scrolling: touch;
      }

      /* ── Bottom navigation ───────────────────────────────────── */
      .mini-nav {
        display: flex;
        align-items: stretch;
        background: var(--tg-theme-secondary-bg-color, #fff);
        border-top: 1px solid rgba(0,0,0,.07);
        padding-bottom: env(safe-area-inset-bottom, 6px);
        flex-shrink: 0;
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

      /* ── Calendar grid ────────────────────────────────────────── */
      .mini-cal-grid {
        display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;
      }
      .mini-cal-day {
        aspect-ratio: 1;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; border-radius: 8px;
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
      .mini-save-bar {
        position: sticky; bottom: 0;
        padding: 12px 0 0;
        background: linear-gradient(to bottom, transparent, var(--tg-theme-bg-color, #f7f6ff) 35%);
      }

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
