import { useEffect, useState, useContext } from 'react';
import { listGroups } from '@/shared/api/groups';
import { MessageContext } from '@/context/message.context';
import { Avatar, Skeleton } from '@/shared/ui';
import { formatDayLabel, previewLastMessage } from '@/shared/lib/messageDisplay';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GroupList = ({ refreshKey = 0 }) => {
	const [groups, setGroups] = useState([]);
	const [loading, setLoading] = useState(true);
	const { setGroupId, groupId } = useContext(MessageContext);
	const navigate = useNavigate();

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const data = await listGroups();
				if (!cancelled) setGroups(data || []);
			} catch {
				if (!cancelled) setGroups([]);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [refreshKey]);

	if (loading) {
		return (
			<div className="p-2 space-y-2">
				{[1, 2].map((i) => (
					<div key={i} className="flex gap-2 items-center">
						<Skeleton className="w-10 h-10 rounded-full" />
						<Skeleton className="h-3 flex-1" />
					</div>
				))}
			</div>
		);
	}

	if (!groups.length) {
		return (
			<p className="text-xs text-black/50 px-3 py-2">No groups yet</p>
		);
	}

	return (
		<div className="space-y-0.5">
			{groups.map((g) => {
				const active = groupId === g.id;
				return (
					<button
						key={g.id}
						type="button"
						className={`w-full flex items-center gap-2 px-2 py-2.5 rounded-xl text-left transition-colors border ${
							active
								? 'bg-primary/15 border-primary/40 ring-1 ring-primary/30'
								: 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5'
						}`}
						onClick={() => {
							setGroupId(g.id);
							if (window.innerWidth <= 600) navigate('/chat');
						}}
					>
						{g.avatarURL ? (
							<Avatar src={g.avatarURL} alt={g.name} size={40} />
						) : (
							<div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
								<Users size={18} />
							</div>
						)}
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-sm text-black truncate">
								{g.name}
							</p>
							<p className="text-xs text-black/60 truncate">
								{previewLastMessage(g.lastMessage, null) ||
									'Group chat'}
							</p>
						</div>
						<span className="text-[10px] text-black/40 shrink-0">
							{g.lastMessageAt ? formatDayLabel(g.lastMessageAt) : ''}
						</span>
					</button>
				);
			})}
		</div>
	);
};

export default GroupList;
