interface SpinnerProps {
	className?: string;
	label?: string;
}

export function Spinner({ className = '', label = 'Loading' }: SpinnerProps) {
	return (
		<div
			className={`w-full h-full min-h-[8rem] flex justify-center items-center ${className}`}
			role="status"
			aria-label={label}
		>
			<div className="loader" />
		</div>
	);
}
