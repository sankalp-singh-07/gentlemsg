/** @type {import('tailwindcss').Config} */

export default {
	content: ['./src/**/*.{js,jsx, css}'],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
			},
			colors: {
				primary: 'var(--color-primary)',
				secondary: 'var(--color-secondary)',
				tertiary: 'var(--color-tertiary)',
				tertiaryHover: 'var(--color-tertiary-hover)',
				quatery: 'var(--color-quatery)',
				black: 'var(--color-black)',
			},
		},
	},

	plugins: [],
};
