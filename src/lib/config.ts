export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "",
  r2BaseUrl: import.meta.env.VITE_R2_BASE_URL?.replace(/\/$/, "") ?? "",
} as const;
