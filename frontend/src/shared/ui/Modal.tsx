import { useEffect, type ReactNode } from 'react';

interface ModalProps {
	open: boolean;
	onClose: () => void;
	title?: string;
	children: ReactNode;
	className?: string;
}

export function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			onClick={onClose}
		>
			<div
				className={`bg-secondary rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto p-4 ${className}`}
				onClick={(e) => e.stopPropagation()}
			>
				{title && (
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-lg font-semibold text-black">{title}</h2>
						<button
							type="button"
							onClick={onClose}
							className="text-black/60 hover:text-black text-xl leading-none px-2"
							aria-label="Close"
						>
							×
						</button>
					</div>
				)}
				{children}
			</div>
		</div>
	);
}
