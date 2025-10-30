'use client';

import { getSession, clearSession } from '@/lib/session';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './home.module.css';

export default function HomePage() {
	const router = useRouter();
	const session = typeof window !== 'undefined' ? getSession() : null;

	async function handleLogout() {
		try { await supabase.auth.signOut(); } catch {}
		clearSession();
		router.replace('/login');
	}

	return (
		<div className={styles.wrap}>
			<div className={styles.card}>
				<div className={styles.header}>
					<h1 className={styles.title}>Campaign Recorder</h1>
					<span className={styles.site}>
						{session ? (
							<>Active Site: <strong>{session.siteName}</strong></>
						) : (
							<>No active session</>
						)}
					</span>
				</div>
				<div className={styles.actions}>
					<button onClick={() => router.push('/record/new')} className={styles.primaryBtn}>
						New Record
					</button>
					<button onClick={() => router.push('/login')} className={styles.secondaryBtn}>
						Change Site
					</button>
					<button onClick={handleLogout} className={styles.secondaryBtn}>
						Logout
					</button>
				</div>
			</div>
		</div>
	);
}
