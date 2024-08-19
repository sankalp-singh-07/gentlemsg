import React, { useContext, useEffect, useState } from 'react';
import { MessageContext } from '../../context/message.context';
import { storage, db } from '../../utils/firebase';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { sendMessage } from './sendMessage';

const SendMedia = ({ files, currentUser, receiverData }) => {
	const [filesArr, setFilesArr] = useState([]);
	const [sending, setSending] = useState('Send');

	useEffect(() => {
		setFilesArr(files);
	}, [files]);

	const { chatId } = useContext(MessageContext);

	const uploadFile = async (file) => {
		const storageRef = ref(
			storage,
			`chats/${chatId}/${Date.now()}_${file.name}`
		);
		const uploadTask = uploadBytesResumable(storageRef, file);

		return new Promise((resolve, reject) => {
			uploadTask.on(
				'state_changed',
				(snapshot) => {},
				(error) => {
					console.log(error);
					reject(error);
				},
				async () => {
					const downloadURL = await getDownloadURL(
						uploadTask.snapshot.ref
					);
					resolve({
						url: downloadURL,
						type: file.type.includes('image')
							? 'image'
							: file.type.includes('video')
							? 'video'
							: file.type.includes('pdf')
							? 'document'
							: 'unknown',
					});
				}
			);
		});
	};

	const send = async () => {
		setSending('Sending...');
		const uploadedFiles = await Promise.all(filesArr.map(uploadFile));

		uploadedFiles.forEach(({ url, type }) => {
			sendMessage(currentUser, receiverData.id, [url], type);
		});

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
