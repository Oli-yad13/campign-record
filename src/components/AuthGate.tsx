'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, getSessionRemainingMs } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export default function AuthGate({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const run = async () => {
			// Public routes
			if (pathname?.startsWith('/login')) {
				setReady(true);
				return;
			}

			// Require both a Supabase auth session and our 12h-capped site session
			try {
				const { data, error: sessionError } = await supabase.auth.getSession();
				
				// If there's a refresh token error, clear everything and redirect to login
				if (sessionError) {
					console.warn('Session check failed:', sessionError.message);
					await supabase.auth.signOut();
					localStorage.removeItem('campaignmrs:siteSession');
					router.replace('/login');
					return;
				}

				const siteSession = getSession();
				if (!data.session || !siteSession) {
					router.replace('/login');
					return;
				}

				// Optional: soft reminder when < 30min left
				const remaining = getSessionRemainingMs();
				if (remaining <= 0) {
					await supabase.auth.signOut();
					router.replace('/login');
					return;
				}

				setReady(true);
			} catch (err: any) {
				// Handle refresh token errors gracefully
				if (err?.message?.includes('Refresh Token') || err?.message?.includes('refresh')) {
					console.warn('Refresh token error, clearing session:', err.message);
					await supabase.auth.signOut().catch(() => {});
					localStorage.removeItem('campaignmrs:siteSession');
					router.replace('/login');
					return;
				}
				// For other errors, still redirect to login
				console.error('Auth check error:', err);
				router.replace('/login');
			}
		};

		run();
	}, [pathname, router]);

	if (!ready) return null;
	return <>{children}</>;
}


