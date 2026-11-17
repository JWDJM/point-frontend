import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { useCurrentUser } from '@/shared/auth/session';

export function usePointHistory() {
  const userId = useCurrentUser().id;
  return useQuery({
    queryKey: ['point', 'history', userId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/points/history');
      if (error) throw error;
      return data?.data ?? [];
    },
    refetchInterval: 2000,
  });
}
