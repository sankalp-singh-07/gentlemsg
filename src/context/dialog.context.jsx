import { createContext, useState } from 'react';

export const DialogContext = createContext({
	openFriendsDialog: false,
	setOpenFriendsDialog: () => {},
	openNotifsDialog: false,
	setOpenNotifsDialog: () => {},
	openMediaDialog: false,
	setOpenMediaDialog: () => {},
	openProfileDialog: false,
	setOpenProfileDialog: () => {},
});

export const DialogProvider = ({ children }) => {
	const [openFriendsDialog, setOpenFriendsDialog] = useState(false);
	const [openNotifsDialog, setOpenNotifsDialog] = useState(false);
	const [openMediaDialog, setOpenMediaDialog] = useState(false);
	const [openProfileDialog, setOpenProfileDialog] = useState(false);

	return (
		<DialogContext.Provider
			value={{
				openNotifsDialog,
				openFriendsDialog,
				openMediaDialog,
				openProfileDialog,
				setOpenFriendsDialog,
				setOpenNotifsDialog,
				setOpenMediaDialog,
				setOpenProfileDialog,
			}}
		>
			{children}
		</DialogContext.Provider>
	);
};
