import React, { useContext, useEffect, useState } from 'react';
import { MessageContext } from '../../context/message.context';
import * as chatService from '../../services/chatService';

const SendMedia = ({ files, currentUser, receiverData, isUserBlocked }) => {
	const [filesArr, setFilesArr] = useState([]);
	const [sending, setSending] = useState('Send');

	useEffect(() => {
		setFilesArr(files);
	}, [files]);

	const { chatId, setMessages } = useContext(MessageContext);

	const send = async () => {
		if (isUserBlocked) {
			console.log("User Blocked. Can't upload file");
			return;
		}

		const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
		const oversized = filesArr.filter((f) => f.size > MAX_FILE_SIZE);
		if (oversized.length > 0) {
			alert('One or more files are too large. Maximum size is 25MB.');
			setSending('Send');
			return;
		}

		setSending('Sending...');

		try {
			for (const file of filesArr) {
				const result = await chatService.uploadMedia(chatId, file);
				if (result?.message_id && setMessages) {
					setMessages((prev) => {
						const existingMessages = prev?.messages || [];
						if (existingMessages.some((m) => m.id === result.message_id)) {
							return prev;
						}
						return {
							messages: [
								...existingMessages,
								{
									id: result.message_id,
									senderId: currentUser?.id,
									message: result.url,
									type: result.type,
									sentAt: result.sent_at || new Date().toISOString(),
								},
							],
						};
					});
				}
			}
		} catch (error) {
			console.error('Error uploading media:', error);
		}

		setFilesArr([]);
		setSending('Send');
	};

	return (
		<>
			{filesArr.length > 0 && (
				<div className="bg-secondary md:w-6/12 h-fit w-10/12 max-h-96 absolute m-auto top-0 right-0 bottom-0 left-0 shadow-md overflow-scroll">
					<div className="w-full h-fit">
						<div>
							<p className="text-tertiary">Preview</p>
							{filesArr.map((file, index) => (
								<div key={index}>
									{file.type.startsWith('image/') && (
										<img
											src={URL.createObjectURL(file)}
											alt="media"
											className="w-6/12 h-fit m-auto"
										/>
									)}
									{file.type.startsWith('video/') && (
										<video
											controls
											className="w-6/12 h-fit m-auto"
										>
											<source
												src={URL.createObjectURL(file)}
												type={file.type}
											/>
										</video>
									)}
									{file.type === 'application/pdf' && (
										<embed
											src={URL.createObjectURL(file)}
											type="application/pdf"
											className="w-6/12 h-fit m-auto"
										/>
									)}
								</div>
							))}
						</div>
					</div>
					<div className="flex justify-evenly mt-2 h-fit">
						<button
							onClick={send}
							className="bg-tertiary text-primary font-bold px-4 py-2   flex-1 rounded-none shadow-none border-none"
						>
							{sending}
						</button>
						<button
							onClick={() => setFilesArr([])}
							className="bg-red-500 text-white font-bold px-4 py-2   flex-1 rounded-none shadow-none border-none"
						>
							Cancel
						</button>
					</div>
				</div>
			)}
		</>
	);
};

export default SendMedia;
