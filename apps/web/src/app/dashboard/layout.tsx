'use client';
import { useEffect } from 'react';
import { clearSessionToken, isSessionExpired } from '@/lib/auth';

// 2 hours idle timeout — OWASP recommendation for standard web apps
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Check absolute session expiry stored at login time
    if (isSessionExpired()) {
      clearSessionToken();
      window.location.href = '/login?reason=expired';
      return;
    }

    // 2. Idle timeout — redirect after 2 hours of inactivity
    let timer: ReturnType<typeof setTimeout>;

    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        clearSessionToken();
        window.location.href = '/login?reason=idle';
      }, IDLE_TIMEOUT_MS);
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, []);

  return <>{children}</>;
}
