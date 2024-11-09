import React, { createContext, useState, useEffect } from 'react';

export const DarkModeContext = createContext();

export const DarkModeProvider = ({ children }) => {
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

	return (
		<DarkModeContext.Provider value={{ isDark, setIsDark }}>
			{children}
		</DarkModeContext.Provider>
	);
};
