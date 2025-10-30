'use client';

import { useEffect } from 'react';

export default function SwRegister() {
	useEffect(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/sw.js')
				.catch(() => {
					// noop for now; can add logging later
				});
		}
	}, []);

	return null;
}



