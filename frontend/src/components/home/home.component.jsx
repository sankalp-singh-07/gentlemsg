import SignIn from '../auth/sign-in.component';
import '../../styles/components/home.css';
import { Link } from 'react-router-dom';
import DarkMode from '../darkMode/darkMode.component';
import { useContext } from 'react';
import { DarkModeContext } from '../../context/dark.context';
import fly1 from '../../assets/fly.svg';
import fly2 from '../../assets/fly2.svg';
import secure1 from '../../assets/secure.png';
import secure2 from '../../assets/secure2.png';
import secure3 from '../../assets/secure3.png';
import chat1 from '../../assets/chat-simple.png';
import chat2 from '../../assets/chat2.png';
import chat3 from '../../assets/chat3.png';
import chat4 from '../../assets/chat4.png';
import dl1 from '../../assets/DL.png';
import dl2 from '../../assets/DL2.png';
import dl3 from '../../assets/DL3.png';

const Home = () => {
	const { isDark } = useContext(DarkModeContext);

	return (
		<div className="w-full max-w-full overflow-x-hidden">
			<div className="container-1">
				<div className="w-fit flex justify-between items-center px-5 py-3">
					<DarkMode />
				</div>
				<p className="logo">
					Gentle<span className="dot">.</span>MSG
				</p>
				<Link className="contact" to="/contact-us">
					<span className="sm:hidden">CONTACT</span>
					<span className="hidden sm:inline">CONTACT US</span>
				</Link>
			</div>

			<div className="container mx-auto flex flex-col items-center text-center px-4">
				<div className="flex flex-wrap items-center justify-center gap-x-1 max-md:hidden mt-14 mb-7">
					<h1 className="heading text-7xl md:text-5xl lg:text-7xl text-black font-bold flex items-center">
						Message
						<span className="inline-flex items-center">
							{isDark ? (
								<img
									className="w-[8vw] max-w-[96px] px-2 h-auto"
									src={fly2}
									alt=""
								/>
							) : (
								<img
									className="w-[8vw] max-w-[96px] px-2 h-auto"
									src={fly1}
									alt=""
								/>
							)}
						</span>
						in{' '}
						<span className="relative text-primary border-[3px] border-primary px-4 ml-2">
							Motion
							<div className="w-3 h-3 bg-primary absolute -top-[4px] -left-[4px]" />
							<div className="w-3 h-3 bg-primary absolute -top-[4px] -right-[4px]" />
							<div className="w-3 h-3 bg-primary absolute -bottom-[4px] -right-[4px]" />
							<div className="w-3 h-3 bg-primary absolute -bottom-[4px] -left-[4px]" />
						</span>
					</h1>
				</div>
				<h1 className="heading text-4xl leading-tight md:hidden mt-6 mb-3 text-black font-bold text-center px-5">
					<span className="block">Message in</span>
					<span className="relative text-primary border-[3px] px-3 border-primary inline-block mt-2">
						Motion
						<div className="w-3 h-3 bg-primary absolute -top-[4px] -left-[4px]" />
						<div className="w-3 h-3 bg-primary absolute -top-[4px] -right-[4px]" />
						<div className="w-3 h-3 bg-primary absolute -bottom-[4px] -right-[4px]" />
						<div className="w-3 h-3 bg-primary absolute -bottom-[4px] -left-[4px]" />
					</span>
				</h1>
			</div>

			<div className="container mx-auto w-full flex flex-wrap items-center justify-center gap-3 px-4 text-center">
				<h3 className="heading text-4xl max-md:hidden md:text-2xl lg:text-4xl mb-6 md:mb-10 text-black font-semibold">
					One Click Away
				</h3>
				<div className="hidden md:block w-12 lg:w-16 h-1 mb-6 md:mb-9 bg-black shrink-0" />
				<h3 className="heading text-4xl max-md:hidden md:text-2xl lg:text-4xl mb-6 md:mb-10 text-primary font-semibold">
					Start Your Journey
				</h3>
				<h3 className="heading text-lg sm:text-2xl md:hidden w-full max-w-full px-4 mb-6 text-primary font-semibold leading-snug text-center break-words">
					<span className="text-black block sm:inline">
						One Click Away —
					</span>{' '}
					<span className="block sm:inline">Start Your Journey</span>
				</h3>
			</div>

			<div className="w-full flex justify-center px-4">
				<h4 className="sub-heading max-sm:!text-base">
					Here every word propels you forward into fast and secure
					network of connections.
				</h4>
			</div>

			<div className="home-cta">
				<SignIn />
			</div>

			<div className="flex w-full h-80 sm:h-52 gap-4 items-end px-4 sm:px-8 mb-6 max-lg:mt-6 min-w-0">
				<div className="flex-1 h-80 sm:h-52 bg-secondary rounded-lg overflow-hidden">
					<img
						className="w-full h-full  hidden lg:block"
						src={secure1}
						alt="secure1"
					/>
					<img
						className="w-full h-full hidden md:block lg:hidden"
						src={secure2}
						alt="secure2"
					/>
					<img
						className="w-full h-full hidden sm:block md:hidden lg:hidden"
						src={secure3}
						alt="secure3"
					/>
					<img
						className="w-full h-full block min-[640px]:hidden max-[400px]:hidden bg-red-100"
						src={chat4}
						alt="Chat 3"
					/>
					<img
						className="w-full h-full block min-[400px]:hidden"
						src={chat4}
						alt="Chat 3"
					/>
				</div>
				<div className="flex-1 max-sm:hidden h-44 mt-4 bg-secondary rounded-lg overflow-hidden">
					<img
						className="w-full h-full  hidden lg:block"
						src={chat1}
						alt="Chat Simple"
					/>
					<img
						className="w-full h-full hidden md:block lg:hidden"
						src={chat2}
						alt="Chat 2"
					/>
					<img
						className="w-full h-full hidden sm:block md:hidden lg:hidden"
						src={chat3}
						alt="Chat 3"
					/>
				</div>

				<div className="flex-1 max-sm:hidden overflow-hidden h-52 bg-secondary rounded-lg">
					<img
						className="w-full h-full  hidden lg:block"
						src={dl1}
						alt="dl"
					/>
					<img
						className="w-full h-full hidden md:block lg:hidden"
						src={dl2}
						alt="dl2"
					/>
					<img
						className="w-full h-full hidden sm:block md:hidden lg:hidden"
						src={dl3}
						alt="dl3"
					/>
				</div>
			</div>
		</div>
	);
};

export default Home;
