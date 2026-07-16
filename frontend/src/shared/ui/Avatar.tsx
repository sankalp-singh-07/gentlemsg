import profileFallback from '@/assets/profile.png';

interface AvatarProps {
	src?: string | null;
	alt?: string;
	size?: number;
	className?: string;
}

export function Avatar({
	src,
	alt = 'Avatar',
	size = 40,
	className = '',
}: AvatarProps) {
	const dim = `${size}px`;
	return (
		<img
			src={src || profileFallback}
			alt={alt}
			referrerPolicy="no-referrer"
			width={size}
			height={size}
			className={`rounded-full object-cover shrink-0 ${className}`}
			style={{ width: dim, height: dim }}
		/>
	);
}
