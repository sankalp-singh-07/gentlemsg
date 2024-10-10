import { createContext, useState } from 'react';

export const BlockContext = createContext({
	blockByUser: [],
	setBlockByUser: () => {},
	blockedTheUser: [],
	setBlockedTheUser: () => {},
});

export const BlockProvider = ({ children }) => {
	const [blockByUser, setBlockByUser] = useState([]);
	const [blockedTheUser, setBlockedTheUser] = useState([]);

	return (
		<BlockContext.Provider
			value={{
				blockByUser,
				setBlockByUser,
				blockedTheUser,
				setBlockedTheUser,
			}}
		>
			{children}
		</BlockContext.Provider>
	);
};
