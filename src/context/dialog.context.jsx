import { createContext, useState } from 'react';

export const DialogContext = createContext({
	openFriendsDialog: false,
	setOpenFriendsDialog: () => {},
	openNotifsDialog: false,
	setOpenNotifsDialog: () => {},
	openMediaDialog: false,
	setOpenMediaDialog: () => {},
});

export const DialogProvider = ({ children }) => {
	const [openFriendsDialog, setOpenFriendsDialog] = useState(false);
	const [openNotifsDialog, setOpenNotifsDialog] = useState(false);
	const [openMediaDialog, setOpenMediaDialog] = useState(false);

	return (
		<DialogContext.Provider
			value={{
				openNotifsDialog,
				openFriendsDialog,
				openMediaDialog,
				setOpenFriendsDialog,
				setOpenNotifsDialog,
				setOpenMediaDialog,
			}}
		>
			{children}
		</DialogContext.Provider>
	);
};
