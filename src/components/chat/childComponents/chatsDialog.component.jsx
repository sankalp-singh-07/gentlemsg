import React, { useContext, useEffect, useRef, useState } from 'react';
import { DialogContext } from '../../../context/dialog.context';

const ChatsDialog = () => {
	const [openChatsDialog, setOpenChatsDialog] = useState(false);

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
						<li className="hover:bg-red-600 hover:text-tertiary pr-12 pl-4 py-3 rounded-md cursor-pointer">
							Block
						</li>
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
		</>
	);
};

export default ChatsDialog;
