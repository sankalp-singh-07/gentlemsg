import { createContext, useState } from 'react';

export const BlockContext = createContext({
	blockUsers: [],
	setBlockUsers: () => {},
});

export const BlockProvider = ({ children }) => {
	const [blockUsers, setBlockUsers] = useState([]);

	return (
		<BlockContext.Provider value={{ blockUsers, setBlockUsers }}>
			{children}
		</BlockContext.Provider>
	);
};
