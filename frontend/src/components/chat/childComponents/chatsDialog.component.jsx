import React, { useContext, useEffect, useRef, useState } from 'react';
import { DialogContext } from '../../../context/dialog.context';
import BlockUser from '../../friends/blockUser.component';
import { MessageContext } from '../../../context/message.context';
import { useSelector } from 'react-redux';
import { friendSelector } from '../../../store/friends/friends.selector';
import { selectCurrentUser } from '../../../store/user/user.selector';
import UnblockUser from '../../friends/unblockUser.component';
import dots1 from '../../../assets/dots1.png';
import dots2 from '../../../assets/dots.png';
import { DarkModeContext } from '../../../context/dark.context';

const ChatsDialog = () => {
	const [openChatsDialog, setOpenChatsDialog] = useState(false);
	const { chatId } = useContext(MessageContext);
	const { currentUser } = useSelector(selectCurrentUser);
	const { blocked } = useSelector(friendSelector);
	const { setOpenMediaDialog } = useContext(DialogContext);
	const { isDark } = useContext(DarkModeContext);

	const [isUserBlocked, setIsUserBlocked] = useState(false);
	const [isUserBlockOther, setIsUserBlockOther] = useState(false);
	const [blockAction, setBlockAction] = useState(null);

	const menuRef = useRef(null);

	useEffect(() => {
		if (blocked && chatId) {
			const data = blocked[chatId];
			if (data) {
				setIsUserBlocked(true);
				if (data.blockedBy === currentUser.id)
					setIsUserBlockOther(true);
			} else {
				setIsUserBlocked(false);
				setIsUserBlockOther(false);
			}
		}
	}, [blocked, chatId, currentUser.id]);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target)) {
				setOpenChatsDialog(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleBlockUser = () => {
		setBlockAction(isUserBlocked && isUserBlockOther ? 'unblock' : 'block');
	};

	return (
		<div className="relative">
			{openChatsDialog && (
				<div
					className="absolute top-16 right-4 bg-tertiary border-2 rounded-md shadow-md px-4 py-3 text-black text-left"
					ref={menuRef}
				>
					<ul className="flex flex-col gap-3">
						<li
							className="hover:bg-quatery px-4 py-2 rounded cursor-pointer"
							onClick={() => setOpenMediaDialog(true)}
						>
							Media
						</li>
						{(isUserBlocked && isUserBlockOther) ||
						!isUserBlocked ? (
							<li
								className="hover:bg-red-600 hover:text-white px-4 py-2 rounded cursor-pointer"
								onClick={handleBlockUser}
							>
								{isUserBlocked && isUserBlockOther
									? 'Unblock'
									: 'Block'}
							</li>
						) : null}
					</ul>
				</div>
			)}

			<img
				src={isDark ? dots1 : dots2}
				alt="menu"
				className="cursor-pointer w-6 h-6"
				onClick={() => setOpenChatsDialog(!openChatsDialog)}
			/>

			{blockAction === 'block' && <BlockUser chatId={chatId} />}
			{blockAction === 'unblock' && <UnblockUser chatId={chatId} />}
		</div>
	);
};

export default ChatsDialog;
