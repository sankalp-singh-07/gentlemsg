import '../../styles/signInGoogle.css'
import SignInHandler from './handlers/sign-in-handler.component';

const SignIn = () => {

    return (
        <button onClick={SignInHandler} className="sign-in-button group">
          SIGN IN WITH GOOGLE
          <svg
            className="arrow"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l-1.41 1.41L16.17 9H4v2h12.17l-5.58 5.59L12 18l8-8-8-8z" />
          </svg>
        </button>
      );
}

export default SignIn