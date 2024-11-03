import React, { useContext, useEffect, useRef, useState } from 'react';
import { DialogContext } from '../../../context/dialog.context';
import BlockUser from '../../friends/blockUser.component';
import { MessageContext } from '../../../context/message.context';
import { useSelector } from 'react-redux';
import { friendSelector } from '../../../store/friends/friends.selector';
import { selectCurrentUser } from '../../../store/user/user.selector';

const ChatsDialog = () => {
	const [openChatsDialog, setOpenChatsDialog] = useState(false);
	const { chatId } = useContext(MessageContext);
	const { currentUser } = useSelector(selectCurrentUser);

	const [isUserBlocked, setIsUserBlocked] = useState(false);
	const [isUserBlockOther, setIsUserBlockOther] = useState(false);

	const { blocked } = useSelector(friendSelector);

	useEffect(() => {
		for (let id in blocked) {
			if (id === chatId) {
				setIsUserBlocked(true);
				if (blocked[id].blockedBy === currentUser.id)
					setIsUserBlockOther(true);
				break;
			}
		}
	}, [blocked, chatId]);

	console.log(isUserBlockOther);

	// console.log(isUserBlocked);

	const [blockId, setBlockId] = useState(null);

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
		setBlockId(chatId);
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
			{blockId && <BlockUser chatId={blockId} />}
		</>
	);
};

export default ChatsDialog;
