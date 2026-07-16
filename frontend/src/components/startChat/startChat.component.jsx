import { EmptyState } from '@/shared/ui';
import { MessageCircle } from 'lucide-react';

const StartChat = () => {
	return (
		<div className="flex-grow-[3] md:flex-grow-[11] lg:flex-grow-[3] flex-shrink basis-0 bg-tertiary h-screen w-full max-[650px]:hidden">
			<div className="flex justify-center items-center h-full flex-col gap-4">
				<div className="text-primary opacity-60">
					<MessageCircle size={64} strokeWidth={1.25} />
				</div>
				<EmptyState
					title="Select a chat"
					description="Pick a conversation from the sidebar, or find friends to start messaging."
				/>
			</div>
		</div>
	);
};

export default StartChat;
