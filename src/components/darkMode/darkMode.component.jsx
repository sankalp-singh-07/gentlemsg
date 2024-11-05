import React, { useEffect, useState } from 'react';

const DarkMode = () => {
	const [isDark, setIsDark] = useState(
		() => localStorage.getItem('theme') === 'dark'
	);

	useEffect(() => {
		if (isDark) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}, [isDark]);

	const toggleDarkMode = () => {
		setIsDark(!isDark);
	};

	return (
		<button onClick={toggleDarkMode} className="darkEl">
			{isDark ? 'Light' : 'Dark'}
		</button>
	);
};

export default DarkMode;
