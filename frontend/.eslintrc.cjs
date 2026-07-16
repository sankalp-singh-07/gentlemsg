module.exports = {
	root: true,
	env: { browser: true, es2020: true },
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:react/jsx-runtime',
		'plugin:react-hooks/recommended',
	],
	ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		ecmaFeatures: { jsx: true },
	},
	settings: { react: { version: '18.2' } },
	plugins: ['react-refresh'],
	rules: {
		'react/jsx-no-target-blank': 'off',
		'react/prop-types': 'off',
		'no-unused-vars': [
			'warn',
			{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
		],
		'react-refresh/only-export-components': [
			'warn',
			{ allowConstantExport: true },
		],
	},
	overrides: [
		{
			files: ['**/*.{ts,tsx}'],
			parser: '@typescript-eslint/parser',
			plugins: ['@typescript-eslint'],
			extends: ['plugin:@typescript-eslint/recommended'],
			rules: {
				'@typescript-eslint/no-explicit-any': 'off',
				'@typescript-eslint/no-unused-vars': [
					'warn',
					{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
				],
			},
		},
	],
};
