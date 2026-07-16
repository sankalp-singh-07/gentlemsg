import { Link } from 'react-router-dom';

const NotFound = () => {
	return (
		<div className="w-full h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
			<h1 className="text-3xl font-bold">404 — Page not found</h1>
			<p className="text-gray-600">That page does not exist.</p>
			<Link
				to="/"
				className="bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90"
			>
				Go home
			</Link>
		</div>
	);
};

export default NotFound;
