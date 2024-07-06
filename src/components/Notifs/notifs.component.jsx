import { useSelector } from 'react-redux';
import { friendSelector } from '../../store/friends/friends.selector';
import { useContext } from 'react';
import { DialogContext } from '../../context/dialog.context';

const Notifications = () => {
	const { notifs } = useSelector(friendSelector);
	console.log(notifs);
	const { setOpenNotifsDialog } = useContext(DialogContext);

	return (
		<div className="bg-secondary max-md:w-11/12 max-lg:w-9/12 w-6/12 h-3/5 absolute m-auto top-0 right-0 bottom-0 left-0 shadow-md">
			<div className="flex flex-1 justify-between items-center absolute bottom-0 left-0 right-0">
				<button
					className="py-1 px-2 text-base font-semibold text-tertiary bg-black hover:bg-tertiary w-full h-9"
					onClick={() => setOpenNotifsDialog(false)}
				>
					Close Notifications
				</button>
			</div>
		</div>
	);
};

export default Notifications;
