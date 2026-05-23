'use client';

import { UserProvider } from '@/hooks/useUser';
import { OfflineSyncProvider } from '@/contexts/OfflineSyncContext';
import OfflineIndicator from '@/components/OfflineIndicator';
import PWARegister from '@/components/PWARegister';

export default function AppProviders({ children }) {
  return (
    <UserProvider>
      <OfflineSyncProvider>
        {children}
        <OfflineIndicator />
        <PWARegister />
      </OfflineSyncProvider>
    </UserProvider>
  );
}
