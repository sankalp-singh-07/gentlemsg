import React, { useState, useEffect, useRef } from 'react';
import './chat.css';
import Messages from './childComponents/messages.component';
import EmojiPicker from 'emoji-picker-react';
import { MessageContext } from '../../context/message.context';
import { useContext } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { sendMessage } from '../messages/sendMessage';
import { useNavigate, useLocation } from 'react-router-dom';
import ChatsDialog from './childComponents/chatsDialog.component';
import SendMedia from '../messages/sendMedia';
import { friendSelector } from '../../store/friends/friends.selector';
import { DarkModeContext } from '../../context/dark.context';
import profileImg from '../../assets/profile.png';
import active from '../../assets/active.png';
import offline from '../../assets/offline.png';
import happyL from '../../assets/happinessL.png';
import happyD from '../../assets/happinessD.png';
import folderL from '../../assets/folderL.png';
import folderD from '../../assets/folderD.png';
import sendL from '../../assets/sendL.png';
import sendD from '../../assets/sendD.png';
import { DialogContext } from '../../context/dialog.context';
import Media from './childComponents/media.component';

const Chat = ({ inMobile }) => {
	const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
	const [receiverData, setReceiverData] = useState([]);

	const { chatId, setMessages } = useContext(MessageContext);
	const { currentUser } = useSelector(selectCurrentUser);
	const { blocked } = useSelector(friendSelector);

	const [isUserBlocked, setIsUserBlocked] = useState(false);
	const [blockText, setBlockText] = useState('');

	const fileInputRef = useRef(null);
	const [files, setFiles] = useState([]);
	const { isDark } = useContext(DarkModeContext);

	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		if (location.pathname === '/chat') {
			navigate('/admin');
		}
	}, [location, navigate]);

	useEffect(() => {
		if (!blocked || !chatId || !currentUser) return;

		let blockedStatus = false;
		let textMessage = '';
		for (let id in blocked) {
			if (id === chatId) {
				blockedStatus = true;
				textMessage =
					blocked[id].blockedBy === currentUser.id
						? 'You have blocked this user'
						: 'You are blocked by this user';
				break;
			}
		}
		setIsUserBlocked(blockedStatus);
		setBlockText(textMessage);

		if (blockedStatus) setText('');
	}, [blocked, chatId, currentUser]);

	useEffect(() => {
		if (!currentUser) {
			navigate('/admin');
			return;
		}

		const receiverId = chatId
			.split('-')
			.filter((el) => el !== currentUser.id)[0];
		if (!receiverId) return;

		const receiverRef = doc(db, 'users', receiverId);
		const unsubscribe = onSnapshot(receiverRef, (doc) => {
			setReceiverData(doc.data());
		});

		return () => unsubscribe();
	}, [chatId, currentUser, navigate]);

	useEffect(() => {
		if (!chatId) return;

		const chatsRef = doc(db, 'chats', chatId);
		const unsub = onSnapshot(chatsRef, (doc) => {
			setMessages(doc.data());
		});

		return () => unsub();
	}, [chatId]);

	const [text, setText] = useState('');
	const textBoxRef = useRef(null);
	const lastMessageShowRef = useRef(null);

	useEffect(() => {
		if (!isUserBlocked) textBoxRef.current?.focus();
		lastMessageShowRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [isUserBlocked]);

	const handleEmoji = (e) => {
		setText((prevText) => prevText + e.emoji);
		setEmojiPickerOpen(false);
		textBoxRef.current.focus();
	};

	const handleSend = async () => {
		if (text.trim() === '' || isUserBlocked) return;

		await sendMessage(currentUser, receiverData.id, text, 'text');
		setText('');
	};

	const handleEnterSend = (e) => {
		if (e.key === 'Enter') handleSend();
	};

	const handleBack = () => navigate('/admin');
	const handeleUpload = () => fileInputRef.current.click();
	const handleFileUpload = (e) => setFiles(Array.from(e.target.files));

	const { openMediaDialog } = useContext(DialogContext);

	return (
		<div
			className={`chat ${
				inMobile === 'hidden' && 'max-[650px]:hidden'
			} relative`}
		>
			<div className="flex items-center justify-between h-16 w-full border-b-4 px-2 sm:px-4 border-[#B8D9FF]">
				<div className="userDetails">
					{inMobile !== 'hidden' && (
						<>
							<button
								className="sm:text-2xl text-xl"
								onClick={handleBack}
							>
								◀
							</button>
							<div className="w-1 h-full bg-[#B8D9FF] mx-3"></div>
						</>
					)}
					{receiverData.photoURL ? (
						<img
							src={receiverData.photoURL}
							alt="profile"
							className="w-8 h-8 sm:w-12 sm:h-12 rounded-full mr-4"
						/>
					) : (
						<img
							src={profileImg}
							alt="profile"
							className="w-8 h-8 sm:w-12 sm:h-12 rounded-full mr-4"
						/>
					)}

					<div className="currentStatus">
						<span className="text-black font-semibold text-sm sm:text-base">
							{receiverData.userName}
						</span>
						<p className="sub flex justify-between items-center bg-black sm:py-0.5 sm:px-2 px-1.5 py-0.5 rounded-xl">
							{receiverData.isOnline ? 'Active' : 'Offline'}
							<span>
								{receiverData.isOnline ? (
									<img
										src={active}
										className="w-2 h-2 ml-3"
									/>
								) : (
									<img
										src={offline}
										className="w-2 h-2 ml-3"
									/>
								)}
							</span>
						</p>
					</div>
				</div>
				<div className="icons">
					{/* <img
						src="src/assets/video.png"
						alt="video"
						className="w-6 h-6 mr-4 sm:w-8 sm:h-8 sm:mr-6"
					/> */}
					<ChatsDialog />
				</div>
				{openMediaDialog && <Media />}
			</div>
			<div className="middle scrollbar-hide">
				<Messages receiverImg={receiverData.photoURL} />
				<div ref={lastMessageShowRef} />
			</div>
			<div className="bottom mt-2">
				<div className="inputContainer">
					<div className="inputEl">
						<div className="relative">
							<img
								src={isDark ? happyL : happyD}
								alt="emoji"
								className="w-6 h-6 ml-2 cursor-pointer"
								onClick={() =>
									setEmojiPickerOpen(!emojiPickerOpen)
								}
							/>
							<div className="absolute bottom-14 -left-8">
								<EmojiPicker
									open={emojiPickerOpen}
									onEmojiClick={handleEmoji}
									width="93%"
								/>
							</div>
						</div>
						<input
							type="text"
							placeholder={
								isUserBlocked ? blockText : 'Type a message'
							}
							className="w-full h-full outline-none px-4 md:m-3 bg-quatery text-black"
							onChange={(e) => setText(e.target.value)}
							onKeyDown={handleEnterSend}
							value={text}
							disabled={isUserBlocked}
							ref={textBoxRef}
						/>
						<div>
							<img
								src={isDark ? folderL : folderD}
								alt="mic"
								className="w-6 h-6 mr-2 cursor-pointer"
								onClick={handeleUpload}
							/>
							<input
								type="file"
								multiple
								className="hidden"
								onChange={handleFileUpload}
								ref={fileInputRef}
								disabled={isUserBlocked}
							/>
						</div>
					</div>
					<button
						className="bg-quatery rounded-xl p-4 drop-shadow"
						onClick={handleSend}
						disabled={isUserBlocked}
					>
						<img
							src={isDark ? sendL : sendD}
							alt="send"
							className="w-8 h-8 cursor-pointer"
						/>
					</button>
				</div>
			</div>
			<SendMedia
				files={files}
				currentUser={currentUser}
				receiverData={receiverData}
				isUserBlocked={isUserBlocked}
			/>
		</div>
	);
};

export default Chat;
