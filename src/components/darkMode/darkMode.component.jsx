import React, { useContext, useEffect, useState } from 'react';
import { DarkModeContext } from '../../context/dark.context';

const DarkMode = () => {
	const { isDark, setIsDark } = useContext(DarkModeContext);

	const toggleDarkMode = () => {
		setIsDark(!isDark);
	};

	return (
		<button onClick={toggleDarkMode} className="darkEl">
			{isDark ? (
				<img src="src\assets\light.svg" />
			) : (
				<img src="src\assets\dark.svg" />
			)}
		</button>
	);
};

export default DarkMode;
