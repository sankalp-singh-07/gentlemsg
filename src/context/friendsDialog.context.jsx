import { createContext, useState } from 'react';

export const FriendsDialogContext = createContext({
	openDialog: false,
	setOpenDialog: () => {},
});

export const FriendsDialogProvider = ({ children }) => {
	const [openDialog, setOpenDialog] = useState(false);

	return (
		<FriendsDialogContext.Provider value={{ openDialog, setOpenDialog }}>
			{children}
		</FriendsDialogContext.Provider>
	);
};
