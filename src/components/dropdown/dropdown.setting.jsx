import { useEffect, useState } from 'react';
import { useRef } from 'react';
import SignOutHandler from '../auth/handlers/sign-out-handler.component';
import { useContext } from 'react';
import { DialogContext } from '../../context/dialog.context';
import { DarkModeContext } from '../../context/dark.context';

const DropDownSetting = () => {
	const { isDark } = useContext(DarkModeContext);
	const [showDropDownSettings, setShowDropDownSettings] = useState(false);
	const [isRotated, setIsRotated] = useState(false);
	const imgRef = useRef();
	const menuRef = useRef();

	const { setOpenFriendsDialog, setOpenNotifsDialog, setOpenProfileDialog } =
		useContext(DialogContext);

	const handleIconClick = () => {
		setShowDropDownSettings(!showDropDownSettings);
		setIsRotated(!isRotated);
	};

	const handleLogOut = () => {
		setShowDropDownSettings(false);
		SignOutHandler();
	};

	const handleFriendsDialog = (e) => {
		e.stopPropagation();
		setShowDropDownSettings(false);
		setOpenFriendsDialog(true);
	};

	const handleProfileDialog = (e) => {
		e.stopPropagation();
		setShowDropDownSettings(false);
		setOpenProfileDialog(true);
	};

	const handleNotifsDialog = (e) => {
		e.stopPropagation();
		setShowDropDownSettings(false);
		setOpenNotifsDialog(true);
	};

	// const handleHelp = (e) => {
	// 	e.stopPropagation();
	// 	setShowDropDownSettings(false);
	// };

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (e.target !== imgRef.current && e.target !== menuRef.current) {
				setShowDropDownSettings(false);
				setIsRotated(false);
			}
		};

		window.addEventListener('click', handleClickOutside);

		return () => {
			window.removeEventListener('click', handleClickOutside);
		};
	}, []);

	return (
		<>
			{showDropDownSettings && (
				<div
					ref={menuRef}
					className="flex flex-col absolute bottom-8 right-4 text-start border-2 px-4 py-4 rounded-md bg-tertiary text-black"
				>
					<ul className="flex flex-col gap-3">
						<li
							className="hover:bg-quatery pr-12 pl-4 py-3 rounded-md cursor-pointer"
							onClick={(e) => handleProfileDialog(e)}
						>
							Profile
						</li>
						<li
							className="hover:bg-quatery pr-12 pl-4 py-3 rounded-md cursor-pointer"
							onClick={(e) => handleFriendsDialog(e)}
						>
							Friends
						</li>
						<li
							className="hover:bg-quatery pr-12 pl-4 py-3 rounded-md cursor-pointer"
							onClick={(e) => handleNotifsDialog(e)}
						>
							Notifications
						</li>
						<li
							className="hover:bg-red-500 hover:text-white pl-4 py-3 rounded-md cursor-pointer"
							onClick={handleLogOut}
						>
							Log Out
						</li>
						{/* <li
							className="hover:bg-quatery pr-12 pl-4 py-3 rounded-md cursor-pointer"
							onClick={handleHelp}
						>
							Help
						</li> */}
					</ul>
				</div>
			)}
			{isDark ? (
				<img
					src="src\assets\gearL.png"
					alt="settings"
					className={`w-full h-full cursor-pointer transform transition-transform duration-200 ${
						isRotated ? 'rotate-90' : ''
					}`}
					onClick={handleIconClick}
					ref={imgRef}
				/>
			) : (
				<img
					src="src\assets\gearD.png"
					alt="settings"
					className={`w-full h-full cursor-pointer transform transition-transform duration-200 ${
						isRotated ? 'rotate-90' : ''
					}`}
					onClick={handleIconClick}
					ref={imgRef}
				/>
			)}
		</>
	);
};

export default DropDownSetting;
