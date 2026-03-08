import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { Provider } from 'react-redux';
import { store } from './store/store.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FriendProvider } from './context/friend.context.jsx';
import { DialogProvider } from './context/dialog.context.jsx';
import { MessageProvider } from './context/message.context.jsx';
import { DarkModeProvider } from './context/dark.context.jsx';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 2, // 2 minutes
			retry: 1,
			refetchOnWindowFocus: false,
		},
	},
});

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
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
		</QueryClientProvider>
	</React.StrictMode>
);
