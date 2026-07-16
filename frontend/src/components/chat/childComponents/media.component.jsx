import React, { useContext, useEffect, useState, useRef } from 'react';
import { DialogContext } from '../../../context/dialog.context';
import { MessageContext } from '../../../context/message.context';
import * as chatService from '../../../services/chatService';
import pdfIcon from '../../../assets/pdf-file.png';
import { X, Image as ImageIcon } from 'lucide-react';

const Media = () => {
	const { chatId } = useContext(MessageContext);
	const { setOpenMediaDialog } = useContext(DialogContext);
	const [mediaData, setMediaData] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const dialogRef = useRef(null);

	useEffect(() => {
		const fetchFiles = async () => {
			setIsLoading(true);
			try {
				const data = await chatService.getMedia(chatId);
				const API_URL =
					import.meta.env.VITE_API_URL || 'http://localhost:8000';

				setMediaData(
					Array.isArray(data)
						? data.map((item) => {
								const fullUrl = item.url?.startsWith('/uploads')
									? `${API_URL}${item.url}`
									: item.url;
								return {
									url: fullUrl,
									contentType: item.contentType || '',
									filename: item.filename || '',
								};
						  })
						: []
				);
			} catch (error) {
				console.error('Error fetching media files', error);
			} finally {
				setIsLoading(false);
			}
		};

		if (chatId) fetchFiles();
	}, [chatId]);

	useEffect(() => {
		const onKey = (e) => {
			if (e.key === 'Escape') setOpenMediaDialog(false);
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [setOpenMediaDialog]);

	return (
		<div
			className="fixed inset-0 z-[150] flex items-start justify-end p-3 sm:p-6"
			role="dialog"
			aria-modal="true"
			aria-label="Shared media"
		>
			{/* Backdrop */}
			<button
				type="button"
				className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
				aria-label="Close media"
				onClick={() => setOpenMediaDialog(false)}
			/>

			<div
				ref={dialogRef}
				className="relative z-10 w-full max-w-sm sm:w-96 max-h-[min(28rem,80vh)] flex flex-col bg-secondary text-black rounded-2xl shadow-2xl border border-black/10 overflow-hidden mt-12 sm:mt-16"
			>
				<div className="flex items-center justify-between px-4 py-3 border-b border-black/10 shrink-0">
					<div className="flex items-center gap-2 font-semibold text-sm">
						<ImageIcon size={16} className="text-primary" />
						Shared media
					</div>
					<button
						type="button"
						className="p-1.5 rounded-lg hover:bg-black/5"
						onClick={() => setOpenMediaDialog(false)}
						aria-label="Close"
					>
						<X size={16} />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-3 min-h-0">
					{isLoading && (
						<div className="flex justify-center items-center h-40 text-sm text-black/50">
							Loading…
						</div>
					)}
					{!isLoading && mediaData.length === 0 && (
						<p className="text-center text-sm text-black/50 py-12">
							No media in this chat yet.
						</p>
					)}
					{!isLoading && mediaData.length > 0 && (
						<div className="grid grid-cols-3 gap-2">
							{mediaData.map((media, index) => (
								<div
									key={index}
									className="relative aspect-square rounded-lg overflow-hidden bg-black/5"
								>
									{media.contentType.includes('image') ? (
										<img
											src={media.url}
											alt={media.filename || `media-${index}`}
											className="w-full h-full object-cover cursor-pointer hover:opacity-90"
											onClick={() =>
												window.open(media.url, '_blank')
											}
										/>
									) : media.contentType.includes('video') ? (
										<video
											controls
											className="w-full h-full object-cover"
										>
											<source
												src={media.url}
												type="video/mp4"
											/>
										</video>
									) : media.contentType === 'application/pdf' ||
									  media.contentType.includes('pdf') ? (
										<a
											href={media.url}
											target="_blank"
											rel="noopener noreferrer"
											className="flex flex-col items-center justify-center w-full h-full bg-primary/10 hover:bg-primary/15 gap-1"
										>
											<img
												src={pdfIcon}
												alt="PDF"
												className="w-8 h-8"
											/>
											<span className="text-[10px] text-black/60 px-1 truncate max-w-full">
												PDF
											</span>
										</a>
									) : (
										<a
											href={media.url}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center justify-center w-full h-full text-xs text-primary underline"
										>
											Open
										</a>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Media;
