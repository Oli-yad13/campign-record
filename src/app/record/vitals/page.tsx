'use client';

import { useState } from 'react';
import { z } from 'zod';
import { COMMON_CONSULTATIONS } from '@/data/consultations';
import { bpCategory, bmiCategory, computeBmi } from '@/lib/vitals';
import styles from './vitals.module.css';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { useRouter } from 'next/navigation';

const VitalsSchema = z
	.object({
		bpSystolic: z
			.string()
			.min(1)
			.refine((v) => /^\d+$/.test(v), 'Number')
			.transform((v) => parseInt(v, 10))
			.refine((n) => n >= 70 && n <= 260),
		bpDiastolic: z
			.string()
			.min(1)
			.refine((v) => /^\d+$/.test(v), 'Number')
			.transform((v) => parseInt(v, 10))
			.refine((n) => n >= 40 && n <= 150),
		includeArmPreset: z.boolean().default(true),
		bpArm: z.enum(['Left', 'Right']).optional(),
		bpArmOther: z.string().optional(),
		bpPosition: z.enum(['Sitting', 'Standing']),
		bpTime: z.string().min(1),
		glucoseValue: z
			.string()
			.optional()
			.transform((v) => (v && v.trim().length ? Number(v) : undefined))
			.refine((n) => n === undefined || (typeof n === 'number' && n >= 30 && n <= 600), 'Glucose must be 30–600'),
		lastMealTime: z.string().optional(),
		pulseRate: z
			.string()
			.min(1)
			.refine((v) => /^\d+$/.test(v))
			.transform((v) => parseInt(v, 10))
			.refine((n) => n >= 30 && n <= 220),
		temperatureC: z
			.string()
			.min(1)
			.refine((v) => /^\d+(\.\d+)?$/.test(v))
			.transform((v) => Number(v))
			.refine((n) => n >= 30 && n <= 43),
		spo2: z
			.string()
			.min(1)
			.refine((v) => /^\d+$/.test(v))
			.transform((v) => parseInt(v, 10))
			.refine((n) => n >= 50 && n <= 100),
		heightCm: z
			.string()
			.optional()
			.transform((v) => (v && v.trim().length ? Number(v) : undefined))
			.refine((n) => n === undefined || (typeof n === 'number' && n >= 50 && n <= 250), 'Height must be 50–250'),
		weightKg: z
			.string()
			.min(1)
			.refine((v) => /^\d+(\.\d+)?$/.test(v))
			.transform((v) => Number(v))
			.refine((n) => n >= 2 && n <= 350),
        consultations: z.array(z.string()).optional().default([]),
	})
	.superRefine((val, ctx) => {
		if (val.includeArmPreset) {
			if (!val.bpArm) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bpArm'], message: 'Required' });
		} else {
			if (!val.bpArmOther || !val.bpArmOther.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bpArmOther'], message: 'Enter arm' });
		}
	});

type VitalsData = z.infer<typeof VitalsSchema> & {
	bmi: number | null;
	bmiCategory: string | null;
	bpCategory: string;
	glucoseFlag: string;
};

export default function VitalsPage() {
	const router = useRouter();
	const [form, setForm] = useState({
		bpSystolic: '',
		bpDiastolic: '',
		includeArmPreset: true,
		bpArm: 'Left' as 'Left' | 'Right' | undefined,
		bpArmOther: '',
		bpPosition: 'Sitting' as 'Sitting' | 'Standing',
		bpTime: '',
		glucoseValue: '',
		lastMealTime: '',
		pulseRate: '',
		temperatureC: '',
		spo2: '',
		heightCm: '',
		weightKg: '',
		consultations: [] as string[],
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [preview, setPreview] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	function formatPreview(payload: VitalsData, demo: any, session: any): string {
		const lines: string[] = [];
		lines.push('Vitals');
		lines.push(`- BP: ${payload.bpSystolic}/${payload.bpDiastolic} (${payload.bpPosition}) at ${payload.bpTime}`);
		lines.push(`- Arm: ${payload.includeArmPreset ? payload.bpArm : payload.bpArmOther}`);
		lines.push(`- Pulse: ${payload.pulseRate} bpm, Temp: ${payload.temperatureC} °C, SpO2: ${payload.spo2}%`);
		lines.push(`- Height: ${payload.heightCm ?? '—'} cm, Weight: ${payload.weightKg} kg, BMI: ${payload.bmi} (${payload.bmiCategory})`);
		lines.push(`- Glucose: ${payload.glucoseValue ?? '—'} mg/dL (${payload.glucoseFlag}), Last meal: ${payload.lastMealTime || '—'}`);
		if (payload.consultations?.length) lines.push(`- Consultations: ${payload.consultations.join(', ')}`);

		lines.push('Demographics');
		lines.push(`- Name: ${demo?.fullName ?? '—'} (${demo?.fatherName ?? '—'})`);
		lines.push(`- Sex/Age: ${demo?.sex ?? '—'} / ${demo?.ageYears ?? '—'}`);
		lines.push(`- DOB: ${demo?.dateOfBirth ?? '—'}`);
		lines.push(`- Region: ${demo?.region ?? '—'}, Subcity/Zone: ${demo?.subCityOrZone ?? '—'}, Woreda: ${demo?.woreda ?? '—'}`);
		lines.push(`- Phone: ${demo?.phone ?? '—'}`);

		lines.push('Session');
		lines.push(`- Site: ${session?.siteName ?? '—'} (${session?.siteId ?? '—'})`);
		lines.push(`- Campaign: ${session?.campaignId ?? '—'}`);
		lines.push(`- Location: ${session?.locationId ?? '—'}`);
		return lines.join('\n');
	}

	function handleChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

    function toggleConsultation(name: string) {
        setForm((f) => {
            const set = new Set(f.consultations);
            if (set.has(name)) set.delete(name); else set.add(name);
            return { ...f, consultations: Array.from(set) };
        });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (submitting) { console.log('[Vitals] ignored: already submitting'); return; }
        console.log('[Vitals] handleSubmit fired');
        setErrors({ form: 'Submitting…' });
        setPreview(null);
        setSubmitting(true);
		const parsed = VitalsSchema.safeParse(form);
        if (!parsed.success) {
			const zerr: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				zerr[issue.path.join('.')] = issue.message;
			}
            console.log('[Vitals] validation failed', zerr);
            setErrors(zerr);
            setSubmitting(false);
            return;
		}
		if (parsed.data.bpSystolic <= parsed.data.bpDiastolic) {
            console.log('[Vitals] systolic<=diastolic');
            setErrors({ bpSystolic: 'Systolic must be > diastolic' });
			setSubmitting(false);
			return;
		}
		const bmi = computeBmi(parsed.data.weightKg, parsed.data.heightCm as unknown as number | undefined);
		const gv = parsed.data.glucoseValue as unknown as number | undefined;
		const glucoseFlag = gv === undefined ? 'N/A' : gv >= 200 ? 'Very High' : gv >= 126 ? 'High' : 'Normal';
		const payload: VitalsData = {
			...parsed.data,
			bmi,
			bmiCategory: bmiCategory(bmi),
			bpCategory: bpCategory(parsed.data.bpSystolic, parsed.data.bpDiastolic),
			glucoseFlag,
		};

		// Merge with demographics from previous step
        const demoRaw = localStorage.getItem('campaignmrs:lastDemographics');
		if (!demoRaw) {
            console.log('[Vitals] no demographics in localStorage');
            setErrors({ form: 'Missing demographics. Please re-enter.' });
			setSubmitting(false);
			return;
		}
		let demo: any;
        try { demo = JSON.parse(demoRaw); } catch { console.log('[Vitals] bad demographics JSON'); setErrors({ form: 'Corrupted demographics data.' }); setSubmitting(false); return; }

        const session = getSession();
        if (!session) { console.log('[Vitals] no session'); setErrors({ form: 'Session expired. Log in again.' }); setSubmitting(false); return; }
        if (!session.campaignId || !session.locationId) {
            console.log('[Vitals] missing campaignId/locationId in session', session);
            setErrors({ form: 'Missing campaign or location. Please re-login.' });
            setSubmitting(false);
            return;
        }

		const insertRow: any = {
			campaign_id: session.campaignId,
			location_id: session.locationId,
			site_id: session.siteId,
			device_id: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
			created_by_site_account: session.supabaseUserId,

			full_name: demo.fullName,
			father_name: demo.fatherName,
			sex: demo.sex,
			age_years: demo.ageYears,
			date_of_birth: demo.dateOfBirth,
			region: demo.region,
			sub_city_zone: demo.subCityOrZone,
			woreda: demo.woreda,
			phone: demo.phone,

			bp_systolic: payload.bpSystolic,
			bp_diastolic: payload.bpDiastolic,
			bp_arm: payload.includeArmPreset ? payload.bpArm : payload.bpArmOther,
			bp_position: payload.bpPosition,
			bp_time: payload.bpTime,
			glucose_value: gv,
			last_meal_time: payload.lastMealTime || null,
			pulse_rate: payload.pulseRate,
			temperature_c: payload.temperatureC,
			spo2: payload.spo2,
			height_cm: payload.heightCm ?? null,
			weight_kg: payload.weightKg,

			bmi: payload.bmi,
			bmi_category: payload.bmiCategory,
			bp_category: payload.bpCategory,
			glucose_flag: payload.glucoseFlag,

			// store consultations as text array if column added later; ignored otherwise
			consultations: payload.consultations || null
		};

		// Preview computed payload in human-readable text
		try { setPreview(formatPreview(payload, demo, session)); } catch {}

        // Insert into visits
        try {
            console.log('[Vitals] inserting row');
            const { error: insErr } = await supabase.from('visits').insert(insertRow);
            if (insErr) {
                console.log('[Vitals] insert error', insErr);
                setErrors({ form: insErr.message });
                setSubmitting(false);
                return;
            }
        } catch (err: any) {
            console.log('[Vitals] insert threw', err);
            setErrors({ form: err?.message || 'Failed to save' });
            setSubmitting(false);
            return;
        }
		// Success: clear temp cache and go home
		try { localStorage.removeItem('campaignmrs:lastDemographics'); } catch {}
		setSubmitting(false);
		router.replace('/');
	}

	return (
		<div className={styles.wrap}>
			<div className={styles.card}>
				<h1 className={styles.title}>New Record – Vitals</h1>
				<p className={styles.subtitle}>All vitals required except height and glucose (optional).</p>
			<form noValidate onSubmit={handleSubmit}>
					<div className={styles.grid2}>
						<label className={styles.label}>
							BP Systolic
							<input className={styles.input} type="number" value={form.bpSystolic} onChange={(e) => handleChange('bpSystolic', e.target.value)} required />
							{errors.bpSystolic && <span className={styles.error}>{errors.bpSystolic}</span>}
						</label>
						<label className={styles.label}>
							BP Diastolic
							<input className={styles.input} type="number" value={form.bpDiastolic} onChange={(e) => handleChange('bpDiastolic', e.target.value)} required />
							{errors.bpDiastolic && <span className={styles.error}>{errors.bpDiastolic}</span>}
						</label>

						<label className={styles.label}>
							Arm
							<div className={styles.toggleRow}>
								<span style={{ color: '#9aa7d8', fontSize: 12 }}>Preset</span>
								<input
									type="checkbox"
									checked={form.includeArmPreset}
									onChange={(e) => handleChange('includeArmPreset', e.target.checked)}
								/>
							</div>
							{form.includeArmPreset ? (
								<select className={styles.select} value={form.bpArm ?? 'Left'} onChange={(e) => handleChange('bpArm', e.target.value as 'Left' | 'Right')}>
									<option>Left</option>
									<option>Right</option>
								</select>
							) : (
								<input className={styles.input} type="text" value={form.bpArmOther} onChange={(e) => handleChange('bpArmOther', e.target.value)} placeholder="Enter arm" />
							)}
							{errors.bpArm && <span className={styles.error}>{errors.bpArm}</span>}
							{errors.bpArmOther && <span className={styles.error}>{errors.bpArmOther}</span>}
						</label>

						<label className={styles.label}>
							Position
							<select className={styles.select} value={form.bpPosition} onChange={(e) => handleChange('bpPosition', e.target.value as 'Sitting' | 'Standing')}>
								<option>Sitting</option>
								<option>Standing</option>
							</select>
						</label>

						<label className={styles.label}>
							BP Time
							<input className={styles.input} type="time" value={form.bpTime} onChange={(e) => handleChange('bpTime', e.target.value)} required />
						</label>

						<label className={styles.label}>
							Glucose (mg/dL) – optional
							<input className={styles.input} type="number" inputMode="decimal" value={form.glucoseValue} onChange={(e) => handleChange('glucoseValue', e.target.value)} />
							{errors.glucoseValue && <span className={styles.error}>{errors.glucoseValue}</span>}
						</label>
						<label className={styles.label}>
							Last Meal Time (optional)
							<input className={styles.input} type="time" value={form.lastMealTime} onChange={(e) => handleChange('lastMealTime', e.target.value)} />
						</label>

						<label className={styles.label}>
							Pulse (bpm)
							<input className={styles.input} type="number" value={form.pulseRate} onChange={(e) => handleChange('pulseRate', e.target.value)} required />
						</label>
						<label className={styles.label}>
							Temperature (°C)
							<input className={styles.input} type="number" inputMode="decimal" value={form.temperatureC} onChange={(e) => handleChange('temperatureC', e.target.value)} required />
						</label>
						<label className={styles.label}>
							SpO₂ (%)
							<input className={styles.input} type="number" value={form.spo2} onChange={(e) => handleChange('spo2', e.target.value)} required />
						</label>
						<label className={styles.label}>
							Height (cm) – optional
							<input className={styles.input} type="number" inputMode="decimal" value={form.heightCm} onChange={(e) => handleChange('heightCm', e.target.value)} />
							{errors.heightCm && <span className={styles.error}>{errors.heightCm}</span>}
						</label>
						<label className={styles.label}>
							Weight (kg)
							<input className={styles.input} type="number" inputMode="decimal" value={form.weightKg} onChange={(e) => handleChange('weightKg', e.target.value)} required />
						</label>
					</div>

					<div className={styles.sectionTitle}>Consultations performed</div>
					<div className={styles.grid2}>
						<label className={styles.label}>
							<select className={styles.select} onChange={(e) => { if (e.target.value) toggleConsultation(e.target.value); }}>
								<option value="">Select to tick…</option>
								{COMMON_CONSULTATIONS.map((c) => (
									<option key={c} value={c}>{c}</option>
								))}
							</select>
						</label>
						<div>
							{form.consultations.map((c) => (
								<label key={c} className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									<input type="checkbox" className={styles.input} checked onChange={() => toggleConsultation(c)} /> {c}
								</label>
							))}
						</div>
					</div>

					{errors.form && (
						<p className={styles.error}>{errors.form}</p>
					)}
					<div className={styles.actions}>
						<button className={styles.primaryBtn} type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save Vitals'}</button>
						<button className={styles.secondaryBtn} type="button" onClick={() => history.back()}>Cancel</button>
					</div>
				</form>

				{preview && (
					<div className={styles.preview}>
						<h3>Computed</h3>
						<pre>{preview}</pre>
					</div>
				)}
			</div>
		</div>
	);
}


