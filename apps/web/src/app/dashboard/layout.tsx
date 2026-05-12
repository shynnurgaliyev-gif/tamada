'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { clearSessionToken, isSessionExpired, redirectToLogin } from '@/lib/auth';
import { MoveToMiniBanner } from '@/components/MoveToMiniBanner';

// 2 hours idle timeout — OWASP recommendation for standard web apps
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Skip the migration banner on the onboarding flow — it's the only place
  // where a brand-new web user is mid-setup and a parallel-channel nudge
  // would just confuse. Everywhere else: gentle Telegram-first guidance.
  const showBanner = !pathname?.startsWith('/dashboard/onboarding');

  useEffect(() => {
    // 1. Check absolute session expiry stored at login time
    if (isSessionExpired()) {
      clearSessionToken();
      redirectToLogin('expired');
      return;
    }

    // 2. Idle timeout — redirect after 2 hours of inactivity
    let timer: ReturnType<typeof setTimeout>;

    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        clearSessionToken();
        redirectToLogin('idle');
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

  return (
    <>
      {showBanner && <MoveToMiniBanner />}
      {children}
    </>
  );
}
