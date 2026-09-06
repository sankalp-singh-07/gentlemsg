import { useState } from 'react';
import { useSelector } from 'react-redux';
import { friendSelector } from '@/store/friends/friends.selector';
import { createGroup } from '@/shared/api/groups';
import { Avatar, Button, Modal } from '@/shared/ui';
import { toast } from 'react-toastify';
import { useContext } from 'react';
import { MessageContext } from '@/context/message.context';
import { useNavigate } from 'react-router-dom';
import { isMobileLayout } from '@/shared/lib/layout';

const CreateGroup = ({ open, onClose, onCreated }) => {
	const { setGroupId } = useContext(MessageContext);
	const navigate = useNavigate();
	const { friends } = useSelector(friendSelector);
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [selected, setSelected] = useState([]);
	const [loading, setLoading] = useState(false);

	const toggle = (id) => {
		setSelected((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
		);
	};

	const handleCreate = async () => {
		if (!name.trim()) {
			toast.error('Group name is required');
			return;
		}
		setLoading(true);
		try {
			const group = await createGroup({
				name: name.trim(),
				description: description.trim(),
				member_ids: selected,
			});
			toast.success('Group created');
			setName('');
			setDescription('');
			setSelected([]);
			setGroupId(group.id);
			if (isMobileLayout()) navigate('/chat');
			onCreated?.(group);
			onClose?.();
		} catch (e) {
			toast.error('Could not create group');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal open={open} onClose={onClose} title="New group">
			<div className="space-y-3">
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Group name"
					className="w-full bg-tertiary rounded-lg px-3 py-2 outline-none text-black"
					maxLength={80}
				/>
				<textarea
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Description (optional)"
					className="w-full bg-tertiary rounded-lg px-3 py-2 outline-none text-black text-sm min-h-[4rem]"
					maxLength={500}
				/>
				<p className="text-xs font-semibold text-black/50 uppercase">
					Add friends
				</p>
				<div className="max-h-48 overflow-y-auto space-y-1">
					{(friends || []).length === 0 && (
						<p className="text-sm text-black/50">No friends to add yet.</p>
					)}
					{(friends || []).map((f) => (
						<label
							key={f.id}
							className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-tertiary cursor-pointer"
						>
							<input
								type="checkbox"
								checked={selected.includes(f.id)}
								onChange={() => toggle(f.id)}
							/>
							<Avatar src={f.photoURL} alt={f.name} size={32} />
							<span className="text-sm text-black truncate">{f.name}</span>
						</label>
					))}
				</div>
				<div className="flex justify-end gap-2 pt-2">
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button loading={loading} onClick={handleCreate}>
						Create
					</Button>
				</div>
			</div>
		</Modal>
	);
};

export default CreateGroup;
