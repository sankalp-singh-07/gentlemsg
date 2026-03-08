import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import { useContext, useState } from 'react';
import { DialogContext } from '../../context/dialog.context';
import ProfilePicture from './profilePicture.component';
import { useDispatch } from 'react-redux';
import { setCurrentUser } from '../../store/user/user.reducer';
import * as userService from '../../services/userService';

const UpdateProfile = () => {
	const currentUser = useSelector((state) => state.user.currentUser);
	const dispatch = useDispatch();
	const [username, setUsername] = useState(currentUser.userName);
	const [profileName, setProfileName] = useState(currentUser.name);
	const [newProfilePic, setNewProfilePic] = useState(null);
	const { setOpenProfileDialog } = useContext(DialogContext);
	const [changePic, setChangePic] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const handleProfilePicChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			setNewProfilePic(file);
			setChangePic(true);
		}
	};

	const handleSaveChange = async () => {
		try {
			setIsSaving(true);
			await userService.updateProfile({
				name: profileName,
				user_name: username,
			});

			dispatch(
				setCurrentUser({
					...currentUser,
					userName: username,
					name: profileName,
				})
			);

			setOpenProfileDialog(false);
		} catch (error) {
			console.error('Error updating profile:', error);
			alert('Failed to update profile');
		} finally {
			setIsSaving(false);
		}
	};

	const handleExportData = async () => {
		try {
			const data = await userService.exportData();
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `gentlemsg-data-${currentUser.userName}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Error exporting data:', error);
			alert('Failed to export data');
		}
	};

	const handleDeleteAccount = async () => {
		if (window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone and all your messages will be lost.")) {
			try {
				await userService.deleteAccount();
				localStorage.removeItem('auth-token');
				window.location.href = '/';
			} catch (error) {
				console.error('Error deleting account:', error);
				alert('Failed to delete account');
			}
		}
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
					<div className="flex justify-center items-center gap-3 min-w-36 mr-1 ml-1 mt-2">
						<button
							className="bg-tertiary w-full flex-1 rounded-md px-4 text-sm font-medium text-black hover:bg-primary hover:text-white h-10 transition-colors"
							onClick={handleExportData}
							title="Download your personal data (GDPR)"
						>
							Export Data
						</button>
						<button
							className="bg-tertiary w-full flex-1 rounded-md px-4 text-sm font-medium text-red-600 hover:bg-red-600 hover:text-white h-10 transition-colors"
							onClick={handleDeleteAccount}
							title="Permanently delete your account"
						>
							Delete Account
						</button>
					</div>

					<div className="flex justify-center items-center gap-3 min-w-36 mr-1 ml-1 mt-4">
						<button
							className="bg-primary w-full rounded-md px-4 text-lg font-medium text-white hover:opacity-90 h-12 transition-opacity disabled:opacity-50"
							onClick={handleSaveChange}
							disabled={isSaving}
						>
							{isSaving ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				</div>
			</div>
			{changePic && <ProfilePicture file={newProfilePic} />}
		</>
	);
};

export default UpdateProfile;
