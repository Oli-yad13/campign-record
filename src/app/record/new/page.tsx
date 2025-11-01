'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { ADDIS_SUB_CITIES, ETHIOPIA_REGIONS } from '@/data/regions';
import styles from './new.module.css';
// consultations are handled on the vitals page

const DemographicsSchema = z.object({
	clientName: z.string().min(1, 'Client name is required'),
	fatherName: z.string().min(1, 'Father name is required'),
	grandfatherName: z.string().min(1, 'Grandfather name is required'),
	sex: z.enum(['Male', 'Female']),
	ageYears: z
		.string()
		.min(1, 'Age is required')
		.refine((v) => /^\d+$/.test(v), 'Enter whole years')
		.transform((v) => parseInt(v, 10))
		.refine((n) => n >= 0 && n <= 120, 'Age must be between 0 and 120'),
    
	region: z.enum(ETHIOPIA_REGIONS as unknown as [string, ...string[]]),
	subCityOrZone: z.string().optional(),
	woreda: z.string().min(1, 'Woreda is required'),
    phone: z
        .string()
        .optional()
        .transform((v) => (v && v.trim().length ? v.trim() : undefined))
        .refine((v) => !v || /^[0-9+\-\s]{7,20}$/.test(v), 'Phone must be 7–20 digits'),
});

type DemographicsData = z.infer<typeof DemographicsSchema> & {
	dateOfBirth: string; // YYYY-01-01 derived
};

function computeDobFromAge(ageYears: number): string {
	const now = new Date();
	const year = now.getFullYear() - ageYears;
	return `${year}-01-01`;
}

export default function NewRecordPage() {
    const router = useRouter();
	const [form, setForm] = useState({
		clientName: '',
		fatherName: '',
		grandfatherName: '',
		sex: '' as 'Male' | 'Female' | '',
		ageYears: '',
		region: 'Addis Ababa' as (typeof ETHIOPIA_REGIONS)[number],
		subCityOrZone: 'Nifas Silk-Lafto',
		woreda: '',
        phone: '',
	});

	const isAddis = form.region === 'Addis Ababa';

	useEffect(() => {
		if (!isAddis) {
			setForm((f) => ({ ...f, subCityOrZone: '' }));
		} else if (!form.subCityOrZone) {
			setForm((f) => ({ ...f, subCityOrZone: 'Nifas Silk-Lafto' }));
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [form.region]);

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [savedPayload, setSavedPayload] = useState<DemographicsData | null>(null);

	function handleChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setErrors({});
		setSavedPayload(null);

        const parsed = DemographicsSchema.safeParse(form);

		if (!parsed.success) {
			const zerr: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const path = issue.path.join('.') || 'form';
				zerr[path] = issue.message;
			}
			setErrors(zerr);
			return;
		}

		const dob = computeDobFromAge(parsed.data.ageYears);
		const payload: DemographicsData = { ...parsed.data, dateOfBirth: dob };

		// Temporarily store preview in memory/localStorage; Dexie integration later
        try {
            const key = 'campaignmrs:lastDemographics';
            localStorage.setItem(key, JSON.stringify(payload));
            setSavedPayload(payload);
            // Navigate to vitals after saving demographics
            router.replace('/record/vitals');
        } catch {}
	}

	const regionOptions = useMemo(() => ETHIOPIA_REGIONS, []);

	return (
        <div className={styles.wrap}>
            <div className={styles.card}>
                <h1 className={styles.title}>New Record – Demographics & Address</h1>
                <p className={styles.subtitle}>Enter minimal details quickly. Defaults set for Addis Ababa.</p>
                <form onSubmit={handleSubmit}>
                    <div className={styles.grid2}>
                        <label className={styles.label}>
                            Client Name
                            <input
                                className={styles.input}
                                type="text"
                                value={form.clientName}
                                onChange={(e) => handleChange('clientName', e.target.value)}
                                required
                            />
                            {errors.clientName && <span className={styles.error}>{errors.clientName}</span>}
                        </label>

					<label className={styles.label}>
						Father's Name
						<input
							className={styles.input}
							type="text"
							value={form.fatherName}
							onChange={(e) => handleChange('fatherName', e.target.value)}
							required
						/>
						{errors.fatherName && <span className={styles.error}>{errors.fatherName}</span>}
					</label>

					<label className={styles.label}>
						Grandfather's Name
						<input
							className={styles.input}
							type="text"
							value={form.grandfatherName}
							onChange={(e) => handleChange('grandfatherName', e.target.value)}
							required
						/>
						{errors.grandfatherName && <span className={styles.error}>{errors.grandfatherName}</span>}
					</label>

					<label className={styles.label}>
                            Sex
                            <select
                                className={styles.select}
                                value={form.sex}
                                onChange={(e) => handleChange('sex', e.target.value as 'Male' | 'Female')}
                                required
                            >
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                            {errors.sex && <span className={styles.error}>{errors.sex}</span>}
                        </label>

                        <label className={styles.label}>
                            Age (years)
                            <input
                                className={styles.input}
                                type="number"
                                inputMode="numeric"
                                value={form.ageYears}
                                onChange={(e) => handleChange('ageYears', e.target.value)}
                                required
                            />
                            {errors.ageYears && <span className={styles.error}>{errors.ageYears}</span>}
                        </label>

                        
                    </div>

					<div className={styles.sectionTitle}>Address (Ethiopia)</div>
                    <div className={styles.grid2}>
                        <label className={styles.label}>
                            Region
                            <select
                                className={styles.select}
                                value={form.region}
                                onChange={(e) => handleChange('region', e.target.value as (typeof ETHIOPIA_REGIONS)[number])}
                            >
                                {regionOptions.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </label>

                        <label className={styles.label}>
                            Sub-city / Zone
                            {isAddis ? (
                                <select
                                    className={styles.select}
                                    value={form.subCityOrZone}
                                    onChange={(e) => handleChange('subCityOrZone', e.target.value)}
                                >
                                    {ADDIS_SUB_CITIES.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    className={styles.input}
                                    type="text"
                                    value={form.subCityOrZone || ''}
                                    onChange={(e) => handleChange('subCityOrZone', e.target.value)}
                                    placeholder="Enter sub-city or zone"
                                />
                            )}
                        </label>

                        <label className={styles.label}>
                            Woreda
                            <input
                                className={styles.input}
                                type="text"
                                value={form.woreda}
                                onChange={(e) => handleChange('woreda', e.target.value)}
                                required
                            />
                            {errors.woreda && <span className={styles.error}>{errors.woreda}</span>}
                        </label>

					<label className={styles.label}>
							Phone (optional)
							<input
								className={styles.input}
								type="tel"
								value={form.phone}
								onChange={(e) => handleChange('phone', e.target.value)}
								placeholder="e.g., +2519XXXXXXX"
							/>
							{errors.phone && <span className={styles.error}>{errors.phone}</span>}
						</label>
                    </div>

                    {/* Consultation moved to vitals page */}

                    <div className={styles.actions}>
                        <button className={styles.primaryBtn} type="submit">Save Demographics</button>
                        <button className={styles.secondaryBtn} type="button" onClick={() => history.back()}>Cancel</button>
                    </div>
                </form>

				{savedPayload && (
					<div className={styles.preview}>
						<div><strong>Name:</strong> {savedPayload.clientName} {savedPayload.fatherName} {savedPayload.grandfatherName}</div>
						<div><strong>Sex:</strong> {savedPayload.sex}</div>
						<div><strong>Age:</strong> {savedPayload.ageYears} (DOB {savedPayload.dateOfBirth})</div>
                        
						<div><strong>Region:</strong> {savedPayload.region}</div>
						<div><strong>Sub-city/Zone:</strong> {savedPayload.subCityOrZone || '—'}</div>
						<div><strong>Woreda:</strong> {savedPayload.woreda}</div>
						<div><strong>Phone:</strong> {savedPayload.phone || '—'}</div>
					</div>
				)}
            </div>
        </div>
    );
}


