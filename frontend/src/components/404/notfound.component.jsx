import { Link } from "react-router-dom"
import SignOutHandler from "../auth/handlers/sign-out-handler.component"

const NotFound = () => {
    return(
        <>
            <h1>404! Page not found</h1>
            <h3>What The Heck R U Searching For??? 🫤</h3>
            <button onClick={SignOutHandler}><Link to='/'>Go To 🏠</Link></button>
        </>
    )
}

export default NotFound