import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
	src: string | null;
	type?: 'image' | 'video';
	onClose: () => void;
}

export function MediaLightbox({ src, type = 'image', onClose }: Props) {
	useEffect(() => {
		if (!src) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [src, onClose]);

	if (!src) return null;

	return (
		<div
			className="fixed inset-0 z-[90] bg-black/90 flex items-center justify-center p-4"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Media viewer"
		>
			<button
				type="button"
				className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/10"
				onClick={onClose}
				aria-label="Close"
			>
				<X size={24} />
			</button>
			<div
				className="max-w-[95vw] max-h-[90vh]"
				onClick={(e) => e.stopPropagation()}
			>
				{type === 'video' ? (
					<video
						src={src}
						controls
						autoPlay
						className="max-w-full max-h-[90vh] rounded-lg"
					/>
				) : (
					<img
						src={src}
						alt="Full size"
						className="max-w-full max-h-[90vh] object-contain rounded-lg"
					/>
				)}
			</div>
		</div>
	);
}
