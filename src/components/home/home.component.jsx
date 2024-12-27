import SignIn from '../auth/sign-in.component';
import '../../styles/components/home.css';
import { Link } from 'react-router-dom';
import DarkMode from '../darkMode/darkMode.component';
import { useContext } from 'react';
import { DarkModeContext } from '../../context/dark.context';

const Home = () => {
	const { isDark } = useContext(DarkModeContext);

	return (
		<>
			<div className="container-1">
				<div className="w-fit flex justify-between items-center px-5 py-3">
					<DarkMode />
				</div>
				<p className="logo">
					Gentle<span className="dot">.</span>MSG
				</p>
				<Link className="contact" to="/contact-us">
					CONTACT US
				</Link>
			</div>

			<div className="container mx-auto">
				<h1 className="heading text-7xl md:text-5xl lg:text-7xl max-md:hidden pr-1  mt-14 mb-7 text-black font-bold flex items-center">
					Message
					<div>
						{isDark ? (
							<img
								className="w-[8vw] px-3 h-[15vh]"
								src="src\assets\fly2.svg"
							/>
						) : (
							<img
								className="w-[8vw] px-3 h-[15vh]"
								src="src\assets\fly.svg"
							/>
						)}
					</div>
				</h1>
				<h1 className="heading text-7xl md:text-5xl lg:text-7xl max-md:hidden  mt-14 mb-7 text-black font-bold pl-1">
					in{' '}
					<span className="relative text-primary border-[3px] border-primary px-4">
						Motion
						<div className="w-3 h-3 bg-primary absolute -top-[4px] -left-[4px]"></div>
						<div className="w-3 h-3 bg-primary absolute -top-[4px] -right-[4px]"></div>
						<div className="w-3 h-3 bg-primary absolute -bottom-[4px] -right-[4px]"></div>
						<div className="w-3 h-3 bg-primary absolute -bottom-[4px] -left-[4px]"></div>
					</span>
				</h1>
				<h1 className="heading text-6xl !leading-[140%] md:text-5xl lg:text-7xl px-5 md:hidden mt-6 sm:mt-24 mb-3 sm:mb-8 text-black font-bold ">
					Message in{' '}
					<span className="relative text-primary py-[-5px] border-[3px] px-3 border-primary">
						Motion
						<div className="w-3 h-3 bg-primary absolute -top-[4px] -left-[4px]"></div>
						<div className="w-3 h-3 bg-primary absolute -top-[4px] -right-[4px]"></div>
						<div className="w-3 h-3 bg-primary absolute -bottom-[4px] -right-[4px]"></div>
						<div className="w-3 h-3 bg-primary absolute -bottom-[4px] -left-[4px]"></div>
					</span>
				</h1>
			</div>

			<div className="container mx-auto w-fit flex h-fit content-center relative">
				<h3 className="heading text-4xl w-fit max-md:hidden md:text-2xl lg:text-4xl pr-4 mb-10 text-black font-semibold flex">
					One Click Away
				</h3>
				<div
					className={`hidden md:block md:w-16 h-1 mb-9 ${
						isDark ? `bg-black` : `bg-black`
					}`}
				></div>
				<h3 className="heading text-4xl max-md:hidden md:text-2xl lg:text-4xl pl-4 mb-10 text-primary font-semibold">
					Start Your Journey
				</h3>
				<h3 className="heading text-2xl max-sm:text-xl md:hidden md:text-2xl lg:text-4xl px-3 mb-6 text-primary font-semibold !leading-7">
					<span className="text-black">One Click Away -</span> Start
					Your Journey
				</h3>
			</div>

			<div>
				<h4 className="sub-heading px-3 max-sm:!text-base">
					Here every word propels you forward into fast and secure
					network of connections.
				</h4>
			</div>

			<SignIn />

			<div className="flex w-full h-36 sm:h-52 space-x-6 items-end px-8 mb-6 max-lg:mt-6">
				<div className="flex-1 h-36 sm:h-52 bg-secondary rounded-lg overflow-hidden">
					<img
						className="w-full h-full  hidden lg:block"
						src="src/assets/secure.png"
						alt="secure"
					/>
					<img
						className="w-full h-full hidden md:block lg:hidden"
						src="src/assets/secure2.png"
						alt="secure"
					/>
					<img
						className="w-full h-full hidden sm:block md:hidden lg:hidden"
						src="src/assets/secure3.png"
						alt="secure"
					/>
					<img
						className="w-full h-full block min-[640px]:hidden max-[400px]:hidden"
						src="src/assets/chat2.png"
						alt="Chat 3"
					/>
					<img
						className="w-full h-full block min-[400px]:hidden"
						src="src/assets/chat2.png"
						alt="Chat 3"
					/>
				</div>
				<div className="flex-1 max-sm:hidden h-44 mt-4 bg-secondary rounded-lg overflow-hidden">
					<img
						className="w-full h-full  hidden lg:block"
						src="src/assets/chat-simple.png"
						alt="Chat Simple"
					/>
					<img
						className="w-full h-full hidden md:block lg:hidden"
						src="src/assets/chat2.png"
						alt="Chat 2"
					/>
					<img
						className="w-full h-full hidden sm:block md:hidden lg:hidden"
						src="src/assets/chat3.png"
						alt="Chat 3"
					/>
				</div>

				<div className="flex-1 max-sm:hidden overflow-hidden h-52 bg-secondary rounded-lg">
					<img
						className="w-full h-full  hidden lg:block"
						src="src/assets/DL.png"
						alt="dl"
					/>
					<img
						className="w-full h-full hidden md:block lg:hidden"
						src="src/assets/DL2.png"
						alt="dl2"
					/>
					<img
						className="w-full h-full hidden sm:block md:hidden lg:hidden"
						src="src/assets/DL3.png"
						alt="dl3"
					/>
				</div>
			</div>
		</>
	);
};

export default Home;
