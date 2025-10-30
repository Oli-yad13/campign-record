'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSession, saveSession, clearSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import styles from './login.module.css';

export default function LoginPage() {
    const router = useRouter();
    const [siteName, setSiteName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!email || !password) { setError('Enter email and password'); return; }
        setSubmitting(true);
        try {
            const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
            if (err || !data.session) { setError('Invalid credentials'); return; }

            // Fetch membership: get site_id only
            const { data: membership, error: mErr } = await supabase
                .from('site_members')
                .select('site_id')
                .eq('user_id', data.user.id)
                .maybeSingle();
            if (mErr || !membership || !membership.site_id) { setError('No site mapped to this account'); return; }

            // Fetch site name
            const { data: siteRow, error: sErr } = await supabase
                .from('sites')
                .select('name, location_id')
                .eq('id', membership.site_id)
                .maybeSingle();
            if (sErr || !siteRow) { setError('Site not found or not readable'); return; }

            // Fetch campaign from location
            let campaignId: string | undefined = undefined;
            if (siteRow.location_id) {
                const { data: locRow } = await supabase
                    .from('locations')
                    .select('campaign_id')
                    .eq('id', siteRow.location_id as string)
                    .maybeSingle();
                campaignId = (locRow?.campaign_id as string) || undefined;
            }

            const session = createSession(
                membership.site_id as string,
                siteName || (siteRow.name as string) || 'Site',
                campaignId,
                (siteRow.location_id as string) || undefined,
                data.user.id
            );
            saveSession(session);
            router.replace('/');
        } finally {
            setSubmitting(false);
        }
    }

    function handleClear() {
        clearSession();
    }

    return (
        <div className={styles.wrap}>
            <div className={styles.card}>
                <h1 className={styles.title}>Sign in to Site</h1>
                <p className={styles.subtitle}>Sign in with your Site account. Session lasts 12 hours.</p>
                <form onSubmit={handleLogin}>
                    <label className={styles.label}>Site Name (for reference only)</label>
                    <input
                        className={styles.input}
                        type="text"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        placeholder="e.g., Lafto Site 1"
                    />
                    <label className={styles.label}>Email</label>
                    <input
                        className={styles.input}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="site@example.com"
                    />
                    <label className={styles.label}>Password</label>
                    <input
                        className={styles.input}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter password"
                    />
                    {error && (
                        <p className={styles.error}>{error}</p>
                    )}
                    <div className={styles.actions}>
                        <button className={styles.primaryBtn} type="submit" disabled={submitting}>
                            {submitting ? 'Signing in…' : 'Sign In'}
                        </button>
                        <button className={styles.secondaryBtn} type="button" onClick={handleClear}>
                            Clear Session
                        </button>
                    </div>
                </form>
                <p className={styles.hint}>Tip: You can change Site later by logging out.</p>
            </div>
        </div>
    );
}


