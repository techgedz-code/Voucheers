// Server-side request helpers for silent (no-prompt) abuse signals.

/** Best-effort client IP from proxy headers. */
export function getClientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    null
  );
}

/**
 * Coarse "city, region, country" lookup via ipinfo (optional).
 * Returns null when no token is configured or the call fails — never throws.
 */
export async function resolveGeo(ip: string | null): Promise<string | null> {
  const token = process.env.IPINFO_TOKEN;
  if (!ip || !token) return null;
  // Skip private/loopback ranges.
  if (/^(127\.|10\.|192\.168\.|::1|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) {
    return null;
  }
  try {
    const res = await fetch(`https://ipinfo.io/${ip}?token=${token}`, {
      // brief cache to avoid hammering on repeated scans
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      city?: string;
      region?: string;
      country?: string;
    };
    return [d.city, d.region, d.country].filter(Boolean).join(", ") || null;
  } catch {
    return null;
  }
}
