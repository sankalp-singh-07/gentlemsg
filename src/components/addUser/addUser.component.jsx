const AddUser = () => {
	return (
		<div className=" bg-secondary rounded-md absolute top-0 bottom-0 left-0 right-0 m-auto p-5 max-sm:w-4/5 w-max h-max ">
			<form className="flex gap-4">
				<input
					type="text"
					placeholder="Search New Users"
					name="username"
					className="bg-tertiary p-2 rounded-md w-full h-10 placeholder:text-sm placeholder:font-medium focus:placeholder-transparent focus:outline-none"
				/>
				<button
					type="submit"
					className="bg-primary border-2 rounded-md text-sm p-2 text-tertiary hover:bg-quatery cursor-pointer hover:border-3 hover:border-primary hover:text-primary font-medium "
				>
					Search
				</button>
			</form>
			<div className="flex mt-5 items-center justify-between">
				<div className="flex gap-3 items-center">
					<img
						src="src\assets\profile.jpg"
						alt="user"
						className="w-12 h-12 rounded-full object-cover border-tertiary border-2"
					/>
					<h4 className="text-tertiary font-medium">Sankalp Singh</h4>
				</div>
				<button className="bg-primary border-2 rounded-md text-sm p-2 text-tertiary hover:bg-quatery cursor-pointer hover:border-3 hover:border-primary hover:text-primary font-medium ">
					Add
				</button>
			</div>
		</div>
	);
};

export default AddUser;
