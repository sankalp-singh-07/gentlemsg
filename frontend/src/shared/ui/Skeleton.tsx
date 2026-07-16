interface SkeletonProps {
	className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
	return (
		<div
			className={`animate-pulse rounded-md bg-black/10 dark:bg-white/10 ${className}`}
			aria-hidden
		/>
	);
}

export function ChatListSkeleton({ count = 5 }: { count?: number }) {
	return (
		<div className="flex flex-col gap-3 p-3">
			{Array.from({ length: count }).map((_, i) => (
				<div key={i} className="flex items-center gap-3">
					<Skeleton className="w-11 h-11 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-3 w-1/2" />
						<Skeleton className="h-3 w-3/4" />
					</div>
				</div>
			))}
		</div>
	);
}
