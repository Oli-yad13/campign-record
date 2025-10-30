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
			const { data } = await supabase.auth.getSession();
			const siteSession = getSession();
			if (!data.session || !siteSession) {
				router.replace('/login');
				return;
			}

			// Optional: soft reminder when < 30min left
			const remaining = getSessionRemainingMs();
			if (remaining <= 0) {
				router.replace('/login');
				return;
			}

			setReady(true);
		};

		run();
	}, [pathname, router]);

	if (!ready) return null;
	return <>{children}</>;
}


