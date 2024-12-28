import React, { useContext, useEffect, useState } from 'react';
import { DarkModeContext } from '../../context/dark.context';
import lightImg from '../../assets/light.svg';
import darkImg from '../../assets/dark.svg';

const DarkMode = () => {
	const { isDark, setIsDark } = useContext(DarkModeContext);

	const toggleDarkMode = () => {
		setIsDark(!isDark);
	};

	return (
		<button onClick={toggleDarkMode} className="darkEl">
			{isDark ? <img src={lightImg} /> : <img src={darkImg} />}
		</button>
	);
};

export default DarkMode;
