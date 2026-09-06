import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setToken } from '../../services/authService';

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            setToken(token);
            // Redirect to admin / dashboard after successful login using full window reload to reset Redux state
            window.location.href = '/admin';
        } else {
            console.error('No token found in response URL');
            navigate('/');
        }
    }, [searchParams, navigate]);

    return (
        <div className="w-full h-dvh flex justify-center items-center">
            <div className="loader"></div>
            <p className="ml-4">Authenticating...</p>
        </div>
    );
};

export default AuthCallback;
