import { useEffect, useState } from 'react';

/**
 * Tracks `window.visualViewport` size — shrinks when the on-screen keyboard
 * opens on iOS/Android. Use it to position overlays/cards inside the *visible*
 * area, above the keyboard.
 *
 * Returns initial (`offsetTop = 0`, `height = innerHeight`) on the server
 * or in browsers without `visualViewport` support.
 */
export function useVisibleViewport(): { height: number; offsetTop: number } {
  const [height, setHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 600,
  );
  const [offsetTop, setOffsetTop] = useState<number>(0);

  useEffect(() => {
    const vp = window.visualViewport;
    if (!vp) return;
    const update = () => {
      setHeight(vp.height);
      setOffsetTop(vp.offsetTop);
    };
    vp.addEventListener('resize', update);
    vp.addEventListener('scroll', update);
    update();
    return () => {
      vp.removeEventListener('resize', update);
      vp.removeEventListener('scroll', update);
    };
  }, []);

  return { height, offsetTop };
}
