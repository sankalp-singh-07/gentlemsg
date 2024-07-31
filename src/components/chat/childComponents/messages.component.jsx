import { useContext } from 'react';
import { MessageContext } from '../../../context/message.context';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../store/user/user.selector';

const Messages = () => {
	const { messages, chatId } = useContext(MessageContext);
	// console.log(messages);
	const { currentUser } = useSelector(selectCurrentUser);
	const receiverId = chatId
		.split('-')
		.filter((el) => el !== currentUser.id)[0];

	return (
		<>
			<div className="message">
				<img
					src="src\assets\profile.jpg"
					className="w-8 h-8 m-3 rounded-full"
				/>
				<div className="texts">
					<span className="textContent text-left">
						shefhk jhsbfjk ejhfbjh jheefbjhs fvvfwh fwfewe fb fbwjf
						jw fweevfnew efvewf jewf jwf jwef hweef hwfi whfhwvfj
						wefhu
					</span>
					<span className="flex self-end text-sm font-normal">
						1 min ago
					</span>
				</div>
			</div>
			<div className="message own">
				<div className="texts">
					<p className="textContent text-right">
						shefhk jhsbfjk ejhfbjh jheefbjhs fvvfwh fwfewe fb fbwjf
						jw fweevfnew efvewf jewf jwf jwef hweef hwfi whfhwvfj
						wefhu
					</p>
					<span className="flex self-end text-sm font-normal">
						1 min ago
					</span>
				</div>
			</div>
		</>
	);
};

export default Messages;
