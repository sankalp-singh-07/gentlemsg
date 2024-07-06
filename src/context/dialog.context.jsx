import { createContext, useState } from 'react';

export const DialogContext = createContext({
	openFriendsDialog: false,
	setOpenFriendsDialog: () => {},
	openNotifsDialog: false,
	setOpenNotifsDialog: () => {},
});

export const DialogProvider = ({ children }) => {
	const [openFriendsDialog, setOpenFriendsDialog] = useState(false);
	const [openNotifsDialog, setOpenNotifsDialog] = useState(false);

	return (
		<DialogContext.Provider
			value={{
				openNotifsDialog,
				openFriendsDialog,
				setOpenFriendsDialog,
				setOpenNotifsDialog,
			}}
		>
			{children}
		</DialogContext.Provider>
	);
};
