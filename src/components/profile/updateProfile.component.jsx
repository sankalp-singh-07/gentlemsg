const UpdateProfile = () => {
	return (
		<div className="bg-secondary max-md:w-11/12 max-lg:w-9/12 w-6/12 h-fit max-h-3/5 absolute m-auto top-0 right-0 bottom-0 left-0 shadow-md">
			<div
				className="h-full overflow-scroll scrollbar-hide p-4 grid gap-4 grid-flow-row "
				style={{ gridTemplateColumns: '1fr', gridAutoRows: 'auto' }}
			>
				<div className="flex bg-tertiary px-4 py-2 justify-between items-center gap-2 rounded-md w-full h-fit">
					<div className="flex justify-self-start items-center gap-3 min-w-36 mr-3">
						<p className="text-md text-start">ABZYS</p>
					</div>
					<div className="flex gap-2 items-center text-end ">
						<p className="text-sm">ABXYZ</p>
						<button>X</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default UpdateProfile;
