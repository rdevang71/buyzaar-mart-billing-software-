'use client';

import { UserProvider } from '@/hooks/useUser';

/**
 * RootClientWrapper - Wraps the app with client-side providers
 * This is necessary because the root layout is a server component
 */
export function RootClientWrapper({ children }) {
  return <UserProvider>{children}</UserProvider>;
}
