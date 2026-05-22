'use client';

import { useState, useEffect } from 'react';

/**
 * useNetworkStatus
 *
 * Returns true when the browser reports it has network access.
 *
 * Uses both navigator.onLine (fast, fires on NIC events) and a lightweight
 * server health-check poll (catches captive portals and DNS-only outages that
 * navigator.onLine misses).
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Sync with the browser's current state on mount
    setIsOnline(navigator.onLine);

    const markOnline  = () => setIsOnline(true);
    const markOffline = () => setIsOnline(false);

    window.addEventListener('online',  markOnline);
    window.addEventListener('offline', markOffline);

    // Optional: real connectivity check every 20 s.
    // Hits the prefetch route with no storeId — tiny response, no side-effects.
    const probe = setInterval(async () => {
      try {
        await fetch('/api/sync/prefetch', {
          method: 'HEAD',
          credentials: 'include',
          cache: 'no-store',
          signal: AbortSignal.timeout(5_000),
        });
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    }, 20_000);

    return () => {
      window.removeEventListener('online',  markOnline);
      window.removeEventListener('offline', markOffline);
      clearInterval(probe);
    };
  }, []);

  return isOnline;
}
