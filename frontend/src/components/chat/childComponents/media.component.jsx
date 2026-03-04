import React, { useContext, useEffect, useState, useRef } from 'react';
import { DialogContext } from '../../../context/dialog.context';
import { MessageContext } from '../../../context/message.context';
import { getDownloadURL, getMetadata, listAll, ref } from 'firebase/storage';
import { storage } from '../../../utils/firebase';
import pdfIcon from '../../../assets/pdf-file.png';

const Media = () => {
	const { chatId } = useContext(MessageContext);
	const { setOpenMediaDialog } = useContext(DialogContext);
	const [mediaData, setMediaData] = useState([]);
	const [isLoading, setIsLoading] = useState(true); // Loading state
	const dialogRef = useRef(null);

	useEffect(() => {
		const fetchFiles = async () => {
			setIsLoading(true); // Start loading
			const listRef = ref(storage, `chats/${chatId}`);

			try {
				const res = await listAll(listRef);
				const data = await Promise.all(
					res.items.map(async (itemRef) => {
						const url = await getDownloadURL(itemRef);
						const metadata = await getMetadata(itemRef);
						return { url, contentType: metadata.contentType };
					})
				);
				setMediaData(data);
			} catch (error) {
				console.error('Error fetching media files', error);
			} finally {
				setIsLoading(false); // End loading
			}
		};

		fetchFiles();
	}, [chatId]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				dialogRef.current &&
				!dialogRef.current.contains(event.target)
			) {
				setOpenMediaDialog(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [setOpenMediaDialog]);

	return (
		<div
			ref={dialogRef}
			className="bg-secondary w-80 h-96 absolute top-4 right-4 overflow-scroll rounded-lg shadow-2xl"
		>
			{isLoading && (
				<div className="flex justify-center items-center h-full">
					<p>Loading...</p>
				</div>
			)}
			{!isLoading && (
				<div className="grid grid-cols-3 gap-2 p-4">
					{mediaData.map((media, index) => (
						<div key={index} className="relative">
							{media.contentType.includes('image') ? (
								<img
									src={media.url}
									alt={`media-${index}`}
									className="w-full h-full object-cover rounded"
									onClick={() =>
										window.open(media.url, '_blank')
									}
								/>
							) : media.contentType.includes('video') ? (
								<video
									controls
									className="w-full h-full object-cover rounded"
									onClick={() =>
										window.open(media.url, '_blank')
									}
								>
									<source src={media.url} type="video/mp4" />
								</video>
							) : media.contentType === 'application/pdf' ? (
								<a
									href={media.url}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center justify-center w-full h-full bg-gray-200 rounded"
								>
									<img
										src={pdfIcon}
										alt="PDF"
										className="w-8 h-8"
									/>
								</a>
							) : null}
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default Media;
