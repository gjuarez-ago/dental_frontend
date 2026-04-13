export interface ApiResponse<T> {
  ok: boolean;
  result: T | null;
  errorCode: string | null;
  userMessage: string | null;
  timestamp: string;
}
