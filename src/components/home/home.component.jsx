import SignIn from "../auth/sign-in.component"
import '../../styles/home.css'
import { Link } from "react-router-dom"

const Home = () => {
    return (
        <>

            <div className="container-1">
                <p className="logo">Gentle<span className="dot">.</span>MSG</p>
                <Link className="contact" to='/s'>CONTACT ME</Link>
            </div>

            <div className="container">
                <h1 className="heading text-7xl md:text-5xl lg:text-7xl pr-14 mt-24 mb-8 text-black font-bold">Message</h1>
                <h1 className="heading text-7xl md:text-5xl lg:text-7xl pl-14 mt-24 mb-8 text-black font-bold">in <span className="text-primary px-5">Motion</span></h1>
            </div>

            <div className="container">
                <h3 className="heading text-4xl md:text-2xl lg:text-4xl pr-10 mb-10 text-black font-semibold">One Click Away</h3>
                <h3 className="heading text-4xl md:text-2xl lg:text-4xl pl-10 mb-10 text-primary font-semibold">Start Your Journey</h3>
            </div>

            <div>
                <h4 className="sub-heading">Here every word propels you forward into fast and secure network of connections.</h4>
            </div>

            <SignIn />

            <div className="flex w-full h-52 space-x-6 items-end px-8">
                <div className="flex-1 h-52 bg-secondary rounded-lg"></div>
                <div className="flex-1 h-44 mt-4 bg-secondary rounded-lg"></div>
                <div className="flex-1 h-52 bg-secondary rounded-lg"></div>
            </div>
        </>
    )
}

export default Home