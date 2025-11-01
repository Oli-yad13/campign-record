'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './admin.module.css';

type Visit = {
  id: string;
  created_at?: string;
  full_name?: string | null;
  father_name?: string | null;
  sex?: string | null;
  age_years?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  pulse_rate?: number | null;
  temperature_c?: number | null;
  spo2?: number | null;
  glucose_value?: number | null;
  bmi?: number | null;
  bmi_category?: string | null;
  bp_category?: string | null;
  site_id?: string | null;
  campaign_id?: string | null;
  location_id?: string | null;
};

export default function AdminPage() {
  const [rows, setRows] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from('visits')
        .select('id,created_at,full_name,father_name,sex,age_years,bp_systolic,bp_diastolic,pulse_rate,temperature_c,spo2,glucose_value,bmi,bmi_category,bp_category,site_id,campaign_id,location_id', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (q.trim()) {
        // Basic ILIKE filter on full_name or father_name
        query = query.ilike('full_name', `%${q}%`);
      }

      const { data, error: err } = await query;
      if (err) { setError(err.message); return; }
      setRows(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page]);

  function exportCsv() {
    const headers = ['Created At','Full Name','Father Name','Sex','Age','BP','Pulse','Temp C','SpO2','Glucose','BMI','BMI Cat','BP Cat','Site','Campaign','Location'];
    const lines = rows.map(r => [
      r.created_at || '',
      r.full_name || '',
      r.father_name || '',
      r.sex || '',
      r.age_years ?? '',
      r.bp_systolic != null && r.bp_diastolic != null ? `${r.bp_systolic}/${r.bp_diastolic}` : '',
      r.pulse_rate ?? '',
      r.temperature_c ?? '',
      r.spo2 ?? '',
      r.glucose_value ?? '',
      r.bmi ?? '',
      r.bmi_category || '',
      r.bp_category || '',
      r.site_id || '',
      r.campaign_id || '',
      r.location_id || ''
    ]);
    const csv = [headers, ...lines].map(r => r.map(v => String(v).replaceAll('"', '""')).map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visits_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.titleRow}>
        <div className={styles.title}>Admin – Visits</div>
        <div className={styles.controls}>
          <input className={styles.input} placeholder="Search name…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className={styles.button} onClick={() => { setPage(0); load(); }} disabled={loading}>Search</button>
          <button className={styles.button} onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
        </div>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>Created</th>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Sex/Age</th>
              <th className={styles.th}>BP</th>
              <th className={styles.th}>Pulse</th>
              <th className={styles.th}>Temp</th>
              <th className={styles.th}>SpO₂</th>
              <th className={styles.th}>Glucose</th>
              <th className={styles.th}>BMI</th>
              <th className={styles.th}>Categories</th>
              <th className={styles.th}>Site</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={styles.td}>{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</td>
                <td className={styles.td}>{r.full_name} {r.father_name ? `(${r.father_name})` : ''}</td>
                <td className={styles.td}>{r.sex} / {r.age_years ?? ''}</td>
                <td className={styles.td}>{r.bp_systolic != null && r.bp_diastolic != null ? `${r.bp_systolic}/${r.bp_diastolic}` : ''}</td>
                <td className={styles.td}>{r.pulse_rate ?? ''}</td>
                <td className={styles.td}>{r.temperature_c ?? ''}</td>
                <td className={styles.td}>{r.spo2 ?? ''}</td>
                <td className={styles.td}>{r.glucose_value ?? ''}</td>
                <td className={styles.td}>{r.bmi ?? ''} {r.bmi_category ? `(${r.bmi_category})` : ''}</td>
                <td className={styles.td}>{[r.bp_category].filter(Boolean).join(' / ')}</td>
                <td className={styles.td}>{r.site_id}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td className={styles.td} colSpan={11}>No data</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className={styles.pagination}>
          <button className={styles.button} onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={loading || page === 0}>Prev</button>
          <button className={styles.button} onClick={() => setPage((p) => p + 1)} disabled={loading}>Next</button>
        </div>
      </div>

      {error && <div style={{ marginTop: 12, color: '#d33' }}>{error}</div>}
    </div>
  );
}




