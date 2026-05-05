/* ── onboarding/_shared ──────────────────────────────────────────────────────
   Pure helpers + tiny components shared across Step1..5 in page.tsx.
   No state, no API calls — extracted to keep page.tsx readable.
────────────────────────────────────────────────────────────────────────────── */

'use client';
import type { ReactNode } from 'react';
import { FaWhatsapp, FaTelegram, FaInstagram, FaGlobe, FaPhone } from 'react-icons/fa';
import type { RefCategory } from '@octiqa/types';

export function getToken(): string {
  return localStorage.getItem('session_token') ?? '';
}

export const STEPS = [
  { n: 1, label: 'Основное',   icon: '👤' },
  { n: 2, label: 'Фото',       icon: '📷' },
  { n: 3, label: 'Контакты',   icon: '📲' },
  { n: 4, label: 'Telegram',   icon: '✈️' },
  { n: 5, label: 'Календарь',  icon: '📅' },
];
export const TOTAL_STEPS = STEPS.length;

export const FALLBACK_CATEGORIES: RefCategory[] = [
  { id: 'tamada',       code: 'tamada',       name_ru: 'Тамада',    icon: '🎤' },
  { id: 'photographer', code: 'photographer', name_ru: 'Фотограф',  icon: '📸' },
  { id: 'videographer', code: 'videographer', name_ru: 'Видеограф', icon: '🎬' },
  { id: 'dj',           code: 'dj',           name_ru: 'Диджей',    icon: '🎧' },
  { id: 'musician',     code: 'musician',     name_ru: 'Музыкант',  icon: '🎵' },
  { id: 'dancer',       code: 'dancer',       name_ru: 'Танцор',    icon: '💃' },
  { id: 'makeup_artist',code: 'makeup_artist',name_ru: 'Визажист',  icon: '💄' },
  { id: 'animator',     code: 'animator',     name_ru: 'Аниматор',  icon: '🎪' },
  { id: 'host',         code: 'host',         name_ru: 'Ведущий',   icon: '🎙️' },
  { id: 'decorator',    code: 'decorator',    name_ru: 'Декоратор', icon: '🎨' },
  { id: 'baker',        code: 'baker',        name_ru: 'Кондитер',  icon: '🎂' },
  { id: 'other',        code: 'other',        name_ru: 'Другое',    icon: null },
];

export const CONTACT_OPTS = [
  { value: 'whatsapp',  label: 'WhatsApp',  Icon: FaWhatsapp,  placeholder: 'https://wa.me/77001234567' },
  { value: 'telegram',  label: 'Telegram',  Icon: FaTelegram,  placeholder: 'https://t.me/username' },
  { value: 'instagram', label: 'Instagram', Icon: FaInstagram, placeholder: 'https://instagram.com/username' },
  { value: 'phone',     label: 'Телефон',   Icon: FaPhone,     placeholder: 'tel:+77001234567' },
  { value: 'website',   label: 'Сайт',      Icon: FaGlobe,     placeholder: 'https://example.com' },
];

export { toSlug } from './slug';

export function StepHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>
      <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5 }}>{sub}</p>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: 'var(--ink-4)', marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export function NavButtons({ onBack, onNext, nextLabel, nextVariant }: {
  onBack: () => void; onNext: () => void; nextLabel: string; nextVariant: 'brand' | 'ghost';
}) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
      <button onClick={onBack} className="btn btn-outline btn-full">← Назад</button>
      <button onClick={onNext} className={`btn ${nextVariant === 'brand' ? 'btn-brand' : 'btn-ghost'} btn-full`}>{nextLabel}</button>
    </div>
  );
}
