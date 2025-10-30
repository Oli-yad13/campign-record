export type SiteSession = {
	siteId: string;
	siteName: string;
	supabaseUserId?: string;
	campaignId?: string;
	locationId?: string;
	issuedAtMs: number;
	expiresAtMs: number; // 12h from issue
};

const STORAGE_KEY = 'campaignmrs:siteSession';
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export function createSession(siteId: string, siteName: string, campaignId?: string, locationId?: string, supabaseUserId?: string): SiteSession {
	const now = Date.now();
	return {
		siteId,
		siteName,
		supabaseUserId,
		campaignId,
		locationId,
		issuedAtMs: now,
		expiresAtMs: now + TWELVE_HOURS_MS,
	};
}

export function saveSession(session: SiteSession): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): SiteSession | null {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as SiteSession;
		if (!parsed.expiresAtMs || Date.now() > parsed.expiresAtMs) {
			clearSession();
			return null;
		}
		return parsed;
	} catch {
		clearSession();
		return null;
	}
}

export function clearSession(): void {
	if (typeof window === 'undefined') return;
	localStorage.removeItem(STORAGE_KEY);
}

export function getSessionRemainingMs(): number {
	const s = getSession();
	if (!s) return 0;
	return Math.max(0, s.expiresAtMs - Date.now());
}


