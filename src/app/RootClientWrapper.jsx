'use client';

import { UserProvider }         from '@/hooks/useUser';
import { OfflineSyncProvider }  from '@/contexts/OfflineSyncContext';
import OfflineIndicator         from '@/components/OfflineIndicator';

export function RootClientWrapper({ children }) {
  return (
    <UserProvider>
      <OfflineSyncProvider>
        {children}
        <OfflineIndicator />
      </OfflineSyncProvider>
    </UserProvider>
  );
}
