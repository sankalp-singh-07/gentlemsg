import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import Home from '../home/home.component';
import Admin from '../admin/admin.component';
import NotFound from '../404/notfound.component';
import Chat from '../chat/chat.component';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import '../../styles/components/loader.css';

const Router = () => {
	const { currentUser, loading } = useSelector(selectCurrentUser);

	if (loading)
		return (
			<div className="w-full h-screen flex justify-center items-center">
				<div class="loader"></div>
			</div>
		);

	return (
		<BrowserRouter>
			<Routes>
				<Route
					path="/"
					element={currentUser ? <Navigate to="/admin" /> : <Home />}
				/>
				<Route
					path="/admin"
					element={currentUser ? <Admin /> : <Navigate to="/" />}
				/>
				<Route path="*" element={<NotFound />} />
				<Route path="/chat" element={<Chat inMobile="show" />} />
			</Routes>
		</BrowserRouter>
	);
};

export default Router;
