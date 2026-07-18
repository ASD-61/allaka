import { useAdminAuth } from '@/context/admin-context';

export function useAdminRequest() {
  const { token } = useAdminAuth();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers };
}
