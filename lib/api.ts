export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const body = isJson ? await response.json() : null;
  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join("\n")
      : body?.message || "ไม่สามารถเชื่อมต่อระบบได้";
    throw new ApiError(message, response.status);
  }
  return body as T;
}

export const jsonBody = (value: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(value),
});
