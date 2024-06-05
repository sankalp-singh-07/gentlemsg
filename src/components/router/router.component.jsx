import { Routes, Route, Navigate } from "react-router-dom"
import Home from "../home/home.component"
import Admin from "../admin/admin.component"
import NotFound from "../404/notfound.component"
import { useAuthState } from 'react-firebase-hooks'
import { auth } from "../../utils/firebase"

const Router = () => {

    const [user, loading, error] = useAuthState(auth);

    if(loading) return(
        <>
            <h1>Loading</h1>
        </>
    )

    if(error) return(
        <>
            <h1>Error</h1>
        </>
    )

    return (
        <Routes>
            <Route path="/" element={user ? < Navigate to="/admin" /> : <Home />} />
            <Route path="/admin" element={!user ? <Admin /> : <Navigate to="/s" />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    )
}

export default Router