import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { Provider } from 'react-redux';
import { store } from './store/store.js';
import { FriendProvider } from './context/friend.context.jsx';
import { DialogProvider } from './context/dialog.context.jsx';
import { MessageProvider } from './context/message.context.jsx';
import { DarkModeProvider } from './context/dark.context.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<Provider store={store}>
			<DarkModeProvider>
				<DialogProvider>
					<FriendProvider>
						<MessageProvider>
							<App />
						</MessageProvider>
					</FriendProvider>
				</DialogProvider>
			</DarkModeProvider>
		</Provider>
	</React.StrictMode>
);
