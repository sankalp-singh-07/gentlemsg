import { auth, googleProvider, db } from "../../utils/firebase"
import { signInWithPopup } from "firebase/auth"
import { setDoc, doc, serverTimestamp } from "firebase/firestore"
import { setCookie } from "../../utils/cookies"
import '../../styles/signInGoogle.css'

const SignIn = () => {

    const handleClick = async () => {

        try {

            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const token = await user.getIdToken()
            setCookie(token)

            const userDocRef = doc(db, "users", user.uid)

            await setDoc(doc(db, 'users', user.uid), {
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                lastActive: serverTimestamp(),
                isOnline: true
              }, { merge: true });
            
        } catch (error) {
            console.error("Error signing in with Google.", error)
        }
    }

    return (
        <button onClick={handleClick} className="sign-in-button group">
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