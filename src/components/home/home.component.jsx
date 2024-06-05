import SignIn from "../auth/sign-in.component"
import '../../styles/home.css'

const Home = () => {
    return (
        <>

            <div>
                <h1 className="logo">Gentle<span>.</span>MSG</h1>
                <h1>CONTACT ME</h1>
            </div>

            <div>
                <h1>Message</h1>
                <h1>in Motion</h1>
            </div>

            <div>
                <h3>One Click Away</h3>
                <h3>Start Your Journey</h3>
            </div>

            <div>
                <h4>Here every word propels you forward into fast and secure network of connections.</h4>
            </div>

            <SignIn />
        </>
    )
}

export default Home