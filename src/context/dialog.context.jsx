import { createContext, useState } from 'react';

export const DialogContext = createContext({
	openFriendsDialog: false,
	setOpenFriendsDialog: () => {},
	openNotifsDialog: false,
	setOpenNotifsDialog: () => {},
	openChatsDialog: false,
	setOpenChatsDialog: () => {},
});

export const DialogProvider = ({ children }) => {
	const [openFriendsDialog, setOpenFriendsDialog] = useState(false);
	const [openNotifsDialog, setOpenNotifsDialog] = useState(false);
	const [openChatsDialog, setOpenChatsDialog] = useState(false);

	return (
		<DialogContext.Provider
			value={{
				openNotifsDialog,
				openFriendsDialog,
				openChatsDialog,
				setOpenFriendsDialog,
				setOpenNotifsDialog,
				setOpenChatsDialog,
			}}
		>
			{children}
		</DialogContext.Provider>
	);
};
