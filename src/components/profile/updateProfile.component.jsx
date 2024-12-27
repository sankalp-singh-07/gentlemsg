import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import { useContext, useEffect, useState } from 'react';
import { DialogContext } from '../../context/dialog.context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import ProfilePicture from './profilePicture.component';
import { useDispatch } from 'react-redux';
import { setCurrentUser } from '../../store/user/user.reducer';

const UpdateProfile = () => {
	const currentUser = useSelector((state) => state.user.currentUser);
	const dispatch = useDispatch();
	const [username, setUsername] = useState(currentUser.userName);
	const [profileName, setProfileName] = useState(currentUser.name);
	const [newProfilePic, setNewProfilePic] = useState(null);
	const { setOpenProfileDialog } = useContext(DialogContext);
	const [changePic, setChangePic] = useState(false);
	const [isLoaded, setIsLoaded] = useState(false);

	const handleProfilePicChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			setNewProfilePic(file);
			setChangePic(true);
		}
	};

	const changeUserName = async () => {
		const userRef = doc(db, 'users', currentUser.id);
		await updateDoc(userRef, { userName: username });
		dispatch(setCurrentUser({ ...currentUser, userName: username }));
	};

	const changeProfileName = async () => {
		const userRef = doc(db, 'users', currentUser.id);
		await updateDoc(userRef, { name: profileName });
		dispatch(setCurrentUser({ ...currentUser, name: profileName }));
	};

	const handleSaveChange = async () => {
		await changeUserName();
		await changeProfileName();
		setOpenProfileDialog(false);
	};

	return (
		<>
			<div className="bg-secondary max-md:w-8/12 max-lg:w-6/12 w-3/12 h-fit max-h-3/5 absolute m-auto top-0 right-0 bottom-0 left-0 shadow-md rounded-lg">
				<div
					className="h-full overflow-scroll scrollbar-hide p-4 grid gap-4 grid-flow-row"
					style={{ gridTemplateColumns: '1fr', gridAutoRows: 'auto' }}
				>
					<div className="flex justify-center items-center gap-3 min-w-36 mr-1 ml-1">
						<img
							src={currentUser?.photoURL}
							className="w-16 h-16 rounded-full"
						/>
					</div>
					<div className="flex justify-center items-center gap-3 min-w-36 mr-1 ml-1">
						<input
							type="file"
							accept="image/*"
							onChange={handleProfilePicChange}
							className="hidden"
							id="profilePicInput"
						/>
						<label
							htmlFor="profilePicInput"
							className="text-sm text-start text-black cursor-pointer"
						>
							Change Profile Picture
						</label>
					</div>
					<div className="flex justify-center items-center gap-3 min-w-36 mr-1 ml-1">
						<label className="text-sm text-start text-black cursor-pointer">
							Username
						</label>
						<input
							type="text"
							placeholder="Enter username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="w-full outline-none py-1 px-3 bg-tertiary text-black"
						/>
					</div>
					<div className="flex justify-center items-center gap-3 min-w-36 mr-1 ml-1">
						<label className="text-sm text-start text-black cursor-pointer">
							Name
						</label>
						<input
							type="text"
							placeholder="Enter Name"
							value={profileName}
							onChange={(e) => setProfileName(e.target.value)}
							className="w-full outline-none py-1 px-3 bg-tertiary text-black"
						/>
					</div>
					<div className="flex justify-center items-center gap-3 min-w-36 mr-1 ml-1">
						<button
							className="bg-tertiary w-full rounded-md px-4 text-lg font-medium text-black hover:bg-primary hover:text-tertiary h-12 dark:hover:text-zinc-50"
							onClick={handleSaveChange}
						>
							Save Changes
						</button>
					</div>
				</div>
			</div>
			{changePic && <ProfilePicture file={newProfilePic} />}
		</>
	);
};

export default UpdateProfile;
