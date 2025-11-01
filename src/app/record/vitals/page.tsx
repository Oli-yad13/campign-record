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
			.optional()
			.transform((v) => (v && v.trim().length ? parseInt(v, 10) : undefined))
			.refine((n) => n === undefined || (typeof n === 'number' && n >= 50 && n <= 100), 'SpO₂ must be 50–100'),
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
	const [computed, setComputed] = useState<any | null>(null);
	const [submitting, setSubmitting] = useState(false);

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
        setComputed(null);
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

			client_name: demo.clientName,
			father_name: demo.fatherName,
			grandfather_name: demo.grandfatherName,
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
			glucose_value: gv,
			last_meal_time: payload.lastMealTime || null,
			pulse_rate: payload.pulseRate,
			temperature_c: payload.temperatureC,
			spo2: payload.spo2 ?? null,
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
		try { setComputed({ ...payload, demo, session }); } catch {}

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
				<p className={styles.subtitle}>All vitals required except height, glucose, and SpO₂ (optional).</p>
			<form noValidate onSubmit={handleSubmit}>
					<div className={styles.grid2}>
			<label className={styles.label}>
				BP Systolic (70–260)
				<input className={`${styles.input} ${errors.bpSystolic ? styles.inputError : ''}`} type="number" placeholder="e.g., 120" value={form.bpSystolic} onChange={(e) => handleChange('bpSystolic', e.target.value)} required />
				{errors.bpSystolic && <span className={styles.error}>{errors.bpSystolic}</span>}
			</label>
			<label className={styles.label}>
				BP Diastolic (40–150)
				<input className={`${styles.input} ${errors.bpDiastolic ? styles.inputError : ''}`} type="number" placeholder="e.g., 80" value={form.bpDiastolic} onChange={(e) => handleChange('bpDiastolic', e.target.value)} required />
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
				Glucose (mg/dL) – optional (30–600)
				<input className={`${styles.input} ${errors.glucoseValue ? styles.inputError : ''}`} type="number" inputMode="decimal" placeholder="e.g., 110" value={form.glucoseValue} onChange={(e) => handleChange('glucoseValue', e.target.value)} />
				{errors.glucoseValue && <span className={styles.error}>{errors.glucoseValue}</span>}
			</label>
						<label className={styles.label}>
							Last Meal Time (optional)
							<input className={styles.input} type="time" value={form.lastMealTime} onChange={(e) => handleChange('lastMealTime', e.target.value)} />
						</label>

			<label className={styles.label}>
				Pulse (bpm) (30–220)
				<input className={`${styles.input} ${errors.pulseRate ? styles.inputError : ''}`} type="number" placeholder="e.g., 72" value={form.pulseRate} onChange={(e) => handleChange('pulseRate', e.target.value)} required />
				{errors.pulseRate && <span className={styles.error}>{errors.pulseRate}</span>}
			</label>
			<label className={styles.label}>
				Temperature (°C) (30–43)
				<input className={`${styles.input} ${errors.temperatureC ? styles.inputError : ''}`} type="number" inputMode="decimal" placeholder="e.g., 36.6" value={form.temperatureC} onChange={(e) => handleChange('temperatureC', e.target.value)} required />
				{errors.temperatureC && <span className={styles.error}>{errors.temperatureC}</span>}
			</label>
			<label className={styles.label}>
				SpO₂ (%) – optional (50–100)
				<input className={`${styles.input} ${errors.spo2 ? styles.inputError : ''}`} type="number" placeholder="e.g., 98" value={form.spo2} onChange={(e) => handleChange('spo2', e.target.value)} />
				{errors.spo2 && <span className={styles.error}>{errors.spo2}</span>}
			</label>
			<label className={styles.label}>
				Height (cm) – optional (50–250)
				<input className={`${styles.input} ${errors.heightCm ? styles.inputError : ''}`} type="number" inputMode="decimal" placeholder="e.g., 170" value={form.heightCm} onChange={(e) => handleChange('heightCm', e.target.value)} />
				{errors.heightCm && <span className={styles.error}>{errors.heightCm}</span>}
			</label>

          {/* BMI result appears between Height/Weight if both are present and valid */}
          {(Number(form.heightCm) > 0 && Number(form.weightKg) > 0) && (() => {
            const bmi = computeBmi(Number(form.weightKg), Number(form.heightCm));
            return (
              <div className={styles.bmiResult}>
                BMI: {bmi !== null ? bmi.toFixed(1) : '--'} — {bmi !== null ? bmiCategory(bmi) : 'Not computable'}
              </div>
            );
          })()}
			<label className={styles.label}>
				Weight (kg) (2–350)
				<input className={`${styles.input} ${errors.weightKg ? styles.inputError : ''}`} type="number" inputMode="decimal" placeholder="e.g., 60" value={form.weightKg} onChange={(e) => handleChange('weightKg', e.target.value)} required />
				{errors.weightKg && <span className={styles.error}>{errors.weightKg}</span>}
			</label>
					</div>

					{/* Consultation dropdown and ticked list */}
					<div className={styles.consultContainer}>
						<div className={styles.sectionTitle}>Consultations performed</div>
						<label className={styles.label}>
							<select className={styles.select} onChange={(e) => { if (e.target.value) toggleConsultation(e.target.value); }}>
								<option value="">Select to tick…</option>
								{COMMON_CONSULTATIONS.map((c) => (
									<option key={c} value={c}>{c}</option>
								))}
							</select>
						</label>
						<div className={styles.consultList}>
							{form.consultations.length === 0 && (
								<span className={styles.label} style={{ opacity: 0.7 }}>No consultations selected yet.</span>
							)}
							{form.consultations.map((c) => (
								<label key={c} className={styles.consultItem}>
									<input type="checkbox" checked onChange={() => toggleConsultation(c)} />
									<span>{c}</span>
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

				{computed && (
					<div className={styles.computedCard}>
						<div className={styles.computedSection}>
							<div className={styles.computedSectionTitle}>Vitals</div>
							<div className={styles.computedGrid}>
								<span className={styles.computedLabel}>BP</span><span className={styles.computedValue}>{computed?.bpSystolic}/{computed?.bpDiastolic} ({computed?.bpPosition})</span>
								<span className={styles.computedLabel}>Arm</span><span className={styles.computedValue}>{computed?.includeArmPreset ? computed?.bpArm : computed?.bpArmOther}</span>
								<span className={styles.computedLabel}>Pulse (bpm)</span><span className={styles.computedValue}>{computed?.pulseRate}</span>
								<span className={styles.computedLabel}>Temp (°C)</span><span className={styles.computedValue}>{computed?.temperatureC}</span>
								<span className={styles.computedLabel}>SpO₂ (%)</span><span className={styles.computedValue}>{computed?.spo2 ?? '—'}</span>
								<span className={styles.computedLabel}>Height (cm)</span><span className={styles.computedValue}>{computed?.heightCm ?? '—'}</span>
								<span className={styles.computedLabel}>Weight (kg)</span><span className={styles.computedValue}>{computed?.weightKg ?? '—'}</span>
								<span className={styles.computedLabel}>BMI</span>
								<span className={styles.computedValue}>
									{computed?.bmi ? `${computed?.bmi} ` : ''}
									<span style={{ color: '#22cf70', background: '#123521', borderRadius: 6, padding: '2px 6px', marginLeft: 4, fontSize: 12 }}>{computed?.bmiCategory ?? ''}</span>
								</span>
								<span className={styles.computedLabel}>BP Category</span>
								<span className={styles.computedValue}><span style={{ color: '#35d4f5', background: '#18293b', borderRadius: 6, padding: '2px 6px', fontSize: 12 }}>{computed?.bpCategory}</span></span>
								<span className={styles.computedLabel}>Glucose</span>
								<span className={styles.computedValue}>{computed?.glucoseValue ?? '—'} mg/dL <span style={{ color: '#bf8cff', background: '#332259', borderRadius: 6, padding: '2px 6px', fontSize: 12 }}>{computed?.glucoseFlag}</span></span>
								<span className={styles.computedLabel}>Last meal</span><span className={styles.computedValue}>{computed?.lastMealTime ?? '—'}</span>
								<span className={styles.computedLabel}>Consultations</span>
								<span className={styles.computedValue}>{computed?.consultations && computed.consultations.length ? computed.consultations.join(', ') : '—'}</span>
							</div>
						</div>
						<div className={styles.computedSection}>
							<div className={styles.computedSectionTitle}>Demographics</div>
							<div className={styles.computedGrid}>
								<span className={styles.computedLabel}>Name</span><span className={styles.computedValue}>{computed?.demo?.clientName} {computed?.demo?.fatherName} {computed?.demo?.grandfatherName}</span>
								<span className={styles.computedLabel}>Sex/Age</span><span className={styles.computedValue}>{computed?.demo?.sex} / {computed?.demo?.ageYears}</span>
								<span className={styles.computedLabel}>DOB</span><span className={styles.computedValue}>{computed?.demo?.dateOfBirth}</span>
								<span className={styles.computedLabel}>Region</span><span className={styles.computedValue}>{computed?.demo?.region}, {computed?.demo?.subCityOrZone} ({computed?.demo?.woreda})</span>
								<span className={styles.computedLabel}>Phone</span><span className={styles.computedValue}>{computed?.demo?.phone ?? '—'}</span>
							</div>
						</div>
						<div className={styles.computedSection}>
							<div className={styles.computedSectionTitle}>Session</div>
							<div className={styles.computedGrid}>
								<span className={styles.computedLabel}>Site</span><span className={styles.computedValue}>{computed?.session?.siteName} ({computed?.session?.siteId})</span>
								<span className={styles.computedLabel}>Campaign</span><span className={styles.computedValue}>{computed?.session?.campaignId}</span>
								<span className={styles.computedLabel}>Location</span><span className={styles.computedValue}>{computed?.session?.locationId}</span>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}


