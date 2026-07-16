import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store/store';
import { DarkModeProvider } from '@/context/dark.context';
import { DialogProvider } from '@/context/dialog.context';
import { MessageProvider } from '@/context/message.context';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 2,
			retry: 1,
			refetchOnWindowFocus: false,
		},
	},
});

interface ProvidersProps {
	children: ReactNode;
}

/**
 * App-wide providers. FriendContext removed — search uses local state.
 * MessageContext remains until Phase 3 migrates messages to React Query.
 */
export function Providers({ children }: ProvidersProps) {
	return (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>
				<DarkModeProvider>
					<DialogProvider>
						<MessageProvider>{children}</MessageProvider>
					</DialogProvider>
				</DarkModeProvider>
			</Provider>
		</QueryClientProvider>
	);
}
