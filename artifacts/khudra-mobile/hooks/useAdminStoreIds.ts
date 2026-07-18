import { useMemo } from 'react';
import { useListAllStores } from '@workspace/api-client-react';
import { useAdminRequest } from '@/hooks/useAdminRequest';

// The set of store ids owned by the platform admin (owner_phone === 'admin').
// Used to scope the admin dashboard tabs to the admin's own store so a
// merchant's data never mixes into the admin's views.
export function useAdminStoreIds(): Set<number> {
  const adminRequest = useAdminRequest();
  const storesQuery = useListAllStores({ request: adminRequest });
  return useMemo(
    () =>
      new Set(
        (storesQuery.data ?? [])
          .filter((s) => s.ownerPhone === 'admin')
          .map((s) => s.id),
      ),
    [storesQuery.data],
  );
}

// The admin's single own store id (there's normally exactly one), or
// undefined while loading / if none exists yet.
export function useAdminStoreId(): number | undefined {
  const adminStoreIds = useAdminStoreIds();
  return useMemo(() => adminStoreIds.values().next().value, [adminStoreIds]);
}

// True when a record belonging to `storeId` is the admin's own (or legacy data
// with no store attached).
export function isAdminOwned(
  storeId: number | null | undefined,
  adminStoreIds: Set<number>,
): boolean {
  return storeId == null || adminStoreIds.has(storeId);
}
