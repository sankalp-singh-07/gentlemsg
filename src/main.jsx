import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { Provider } from 'react-redux';
import { store } from './store/store.js';
import { FriendProvider } from './context/friend.context.jsx';
import { FriendsDialogProvider } from './context/friendsDialog.context.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<Provider store={store}>
			<FriendsDialogProvider>
				<FriendProvider>
					<App />
				</FriendProvider>
			</FriendsDialogProvider>
		</Provider>
	</React.StrictMode>
);
