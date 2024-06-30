import { createContext, useState } from 'react';

export const FriendContext = createContext({
	friend: [],
	setFriend: () => {},
});

export const FriendProvider = ({ children }) => {
	const [friend, setFriend] = useState([]);

	return (
		<FriendContext.Provider value={{ friend, setFriend }}>
			{children}
		</FriendContext.Provider>
	);
};
