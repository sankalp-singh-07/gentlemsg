import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
	children: ReactNode;
	loading?: boolean;
}

const variantClass: Record<Variant, string> = {
	primary: 'bg-primary text-white hover:opacity-90',
	secondary: 'bg-quatery text-black hover:opacity-90',
	ghost: 'bg-transparent text-black hover:bg-black/5',
	danger: 'bg-red-500 text-white hover:bg-red-600',
};

const sizeClass: Record<Size, string> = {
	sm: 'px-2 py-1 text-sm',
	md: 'px-3 py-2 text-sm',
	lg: 'px-4 py-3 text-base',
};

export function Button({
	variant = 'primary',
	size = 'md',
	children,
	loading,
	disabled,
	className = '',
	...rest
}: ButtonProps) {
	return (
		<button
			type="button"
			className={`rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${variantClass[variant]} ${sizeClass[size]} ${className}`}
			disabled={disabled || loading}
			{...rest}
		>
			{loading ? '…' : children}
		</button>
	);
}
