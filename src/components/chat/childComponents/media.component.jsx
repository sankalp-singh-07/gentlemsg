import React, { useContext, useEffect, useState } from 'react';
import { DialogContext } from '../../../context/dialog.context';
import { MessageContext } from '../../../context/message.context';
import { getDownloadURL, getMetadata, listAll, ref } from 'firebase/storage';
import { storage } from '../../../utils/firebase';
import pdfIcon from '../../../assets/pdf-file.png';

const Media = () => {
	const { chatId } = useContext(MessageContext);
	const { setOpenMediaDialog } = useContext(DialogContext);
	const [mediaData, setMediaData] = useState([]);

	useEffect(() => {
		const fetchFiles = async () => {
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
				console.log('Error fetching media files', error);
			}
		};

		fetchFiles();
	}, [chatId]);

	return (
		<div className="bg-secondary max-md:w-11/12 max-lg:w-9/12 w-6/12 md:h-5/6 h-3/6  m-auto top-0 right-0 bottom-0 left-0 overflow-scroll rounded-lg absolute shadow-2xl">
			<div className="grid grid-cols-3 grid-rows-3">
				{mediaData.map((media, index) => {
					return (
						<div key={index}>
							{media.contentType.includes('image') ? (
								<img
									src={media.url}
									alt={`media-${index}`}
									className="w-10/12 h-10/12 m-5"
									onClick={() => window.open(media.url)}
								/>
							) : media.contentType.includes('video') ? (
								<video controls>
									<source src={media.url} type="video/mp4" />
								</video>
							) : media.contentType === 'application/pdf' ? (
								<a
									href={media.url}
									target="_blank"
									rel="noopener noreferrer"
									className="media-pdf text-inherit w-full h-full flex justify-center items-center"
									style={{
										backgroundImage: `url(${pdfIcon})`,
										backgroundRepeat: 'no-repeat',
										backgroundPosition: 'center',
										backgroundSize: 'contain',
									}}
								>
									...
								</a>
							) : (
								<a></a>
							)}
						</div>
					);
				})}
			</div>
			<div className="flex justify-center items-baseline ">
				<button
					className="w-full h-14 bg-quatery text-secondary font-semibold"
					onClick={() => setOpenMediaDialog(false)}
				>
					Close
				</button>
			</div>
		</div>
	);
};

export default Media;
