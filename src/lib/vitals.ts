export type BpCategory = 'Normal' | 'Elevated' | 'Stage 1' | 'Stage 2' | 'Hypertensive Crisis';

export function computeBmi(weightKg: number, heightCm?: number): number | null {
	if (!heightCm || heightCm <= 0) return null;
	const h = heightCm / 100;
	const bmi = weightKg / (h * h);
	return Math.round(bmi * 10) / 10;
}

export function bmiCategory(bmi: number | null): string | null {
	if (bmi == null) return null;
	if (bmi < 18.5) return 'Underweight';
	if (bmi < 25) return 'Normal';
	if (bmi < 30) return 'Overweight';
	return 'Obese';
}

export function bpCategory(systolic: number, diastolic: number): BpCategory {
	if (systolic >= 180 || diastolic >= 120) return 'Hypertensive Crisis';
	if (systolic >= 140 || diastolic >= 90) return 'Stage 2';
	if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return 'Stage 1';
	if (systolic >= 120 && diastolic < 80) return 'Elevated';
	return 'Normal';
}

export function glucoseFlag(valueMgDl: number, type: 'fasting' | 'random'): 'Normal' | 'High' | 'Very High' {
	// Simple adult thresholds. Adjust per local guidelines later.
	if (type === 'fasting') {
		if (valueMgDl >= 200) return 'Very High';
		if (valueMgDl >= 126) return 'High';
		return 'Normal';
	} else {
		if (valueMgDl >= 300) return 'Very High';
		if (valueMgDl >= 200) return 'High';
		return 'Normal';
	}
}




