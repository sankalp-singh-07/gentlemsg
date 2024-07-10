const StartChat = () => {
	return (
		<div
			className={`flex-grow-[3] md:flex-grow-[11] lg:flex-grow-[3] flex-shrink basis-0 bg-tertiary h-screen w-full max-[650px]:hidden
			`}
		>
			<div className="flex justify-center items-center h-full">
				<p className="lg:text-3xl text-xl font-bold text-gray-500">
					Select a chat to start messaging
				</p>
			</div>
		</div>
	);
};

export default StartChat;
