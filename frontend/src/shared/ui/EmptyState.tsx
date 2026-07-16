import type { ReactNode } from 'react';

interface EmptyStateProps {
	title: string;
	description?: string;
	action?: ReactNode;
	className?: string;
}

export function EmptyState({
	title,
	description,
	action,
	className = '',
}: EmptyStateProps) {
	return (
		<div
			className={`flex flex-col items-center justify-center text-center gap-2 p-8 text-black/70 ${className}`}
		>
			<p className="font-semibold text-base text-black">{title}</p>
			{description && <p className="text-sm max-w-xs">{description}</p>}
			{action && <div className="mt-2">{action}</div>}
		</div>
	);
}
