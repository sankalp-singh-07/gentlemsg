/** @type {import('tailwindcss').Config} */

const flowbite = require('flowbite-react/tailwind');

export default {
	content: ['./src/**/*.{js,jsx, css}', flowbite.content()],
	darkMode: false,
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
			},
			colors: {
				primary: '#0077B6',
				secondary: '#0081A7',
				tertiary: '#F4F9FF',
				quatery: '#DBEBFF',
				black: '#01161E',
			},
		},
	},

	plugins: [flowbite.plugin()],
};
