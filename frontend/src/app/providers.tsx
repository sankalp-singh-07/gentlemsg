import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store/store';
import { DarkModeProvider } from '@/context/dark.context';
import { DialogProvider } from '@/context/dialog.context';
import { MessageProvider } from '@/context/message.context';
import { CallProvider } from '@/features/calls';

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

export function Providers({ children }: ProvidersProps) {
	return (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>
				<DarkModeProvider>
					<DialogProvider>
						<MessageProvider>
							<CallProvider>{children}</CallProvider>
						</MessageProvider>
					</DialogProvider>
				</DarkModeProvider>
			</Provider>
		</QueryClientProvider>
	);
}
