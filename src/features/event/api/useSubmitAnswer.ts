import { useMutation } from '@tanstack/react-query';
import { apiClient, ERROR_CODES } from '@/shared/api/client';

export type AnswerResult = 'WON' | 'LOST' | 'DUPLICATE' | 'CLOSED' | 'MAINTENANCE';

/** HTTP 상태 → 화면 상태. 202 당첨은 "지급 예정" (Kafka → 정산 대기열 → 이벤트 종료 후 일괄 정산, ADR-0017) */
export function toAnswerResult(status: number, errorCode?: string): AnswerResult {
  switch (status) {
    case 202:
      return 'WON';
    case 200:
      return 'LOST';
    case 409:
      return 'DUPLICATE';
    case 410:
      return 'CLOSED';
    case 503:
      if (errorCode === ERROR_CODES.EVENT_MAINTENANCE) return 'MAINTENANCE';
      throw new Error('SERVICE_UNAVAILABLE');
    default:
      throw new Error(`UNEXPECTED_${status}`);
  }
}

export function useSubmitAnswer(eventId: string) {
  return useMutation({
    mutationFn: async (answer: string): Promise<AnswerResult> => {
      const { response, error } = await apiClient.POST('/api/events/{eventId}/answers', {
        params: { path: { eventId } },
        body: { answer },
      });
      const code = error && 'code' in error ? (error.code as string | undefined) : undefined;
      return toAnswerResult(response.status, code);
    },
  });
}
