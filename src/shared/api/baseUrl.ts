/** 비어 있으면 같은 origin → 로컬은 Vite proxy, 운영은 ALB/Gateway 경로 라우팅 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || window.location.origin;
