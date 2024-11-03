import React, { useContext, useEffect, useRef, useState } from 'react';
import { DialogContext } from '../../../context/dialog.context';
import BlockUser from '../../friends/blockUser.component';
import { MessageContext } from '../../../context/message.context';
import { useSelector } from 'react-redux';
import { friendSelector } from '../../../store/friends/friends.selector';
import { selectCurrentUser } from '../../../store/user/user.selector';
import UnblockUser from '../../friends/unblockUser.component';

const ChatsDialog = () => {
	const [openChatsDialog, setOpenChatsDialog] = useState(false);
	const { chatId } = useContext(MessageContext);
	const { currentUser } = useSelector(selectCurrentUser);

	const [isUserBlocked, setIsUserBlocked] = useState(false);
	const [isUserBlockOther, setIsUserBlockOther] = useState(false);
	const [blockAction, setBlockAction] = useState(null);

	const { blocked } = useSelector(friendSelector);

	useEffect(() => {
		const data = blocked[chatId];
		if (data) {
			setIsUserBlocked(true);
			if (data.blockedBy === currentUser.id) setIsUserBlockOther(true);
		} else {
			setIsUserBlocked(false);
			setIsUserBlockOther(false);
		}
	}, [blocked, chatId, currentUser.id]);

	const menuRef = useRef(null);

	const { setOpenMediaDialog } = useContext(DialogContext);

	useEffect(() => {
		const handleClick = (e) => {
			if (menuRef.current !== e.target) setOpenChatsDialog(false);
		};

		window.addEventListener('click', handleClick);

		return () => {
			window.removeEventListener('click', handleClick);
		};
	});

	const handleBlockUserId = (chatId) => {
		setBlockAction(isUserBlocked && isUserBlockOther ? 'unblock' : 'block');
	};

	return (
		<>
			{openChatsDialog && (
				<div className="flex flex-col absolute top-20 bottom-8 right-6 text-start border-2 px-4 py-4 rounded-md bg-tertiary h-fit">
					<ul className="flex flex-col gap-3">
						<li
							className="hover:bg-quatery pr-12 pl-4 py-3 rounded-md cursor-pointer"
							onClick={() => setOpenMediaDialog(true)}
						>
							Media
						</li>
						{(isUserBlocked && isUserBlockOther) ||
						!isUserBlocked ? (
							<li
								className="hover:bg-red-600 hover:text-tertiary pr-12 pl-4 py-3 rounded-md cursor-pointer"
								onClick={() => handleBlockUserId(chatId)}
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
				src="src\assets\dots.png"
				alt="video"
				className="w-5 h-5 mr-3 sm:w-6 sm:h-6 sm:mr-4 cursor-pointer"
				onClick={() => setOpenChatsDialog(!openChatsDialog)}
				ref={menuRef}
			/>
			{blockAction === 'block' && <BlockUser chatId={chatId} />}
			{blockAction === 'unblock' && <UnblockUser chatId={chatId} />}
		</>
	);
};

export default ChatsDialog;
