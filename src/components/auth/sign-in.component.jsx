import { auth, googleProvider, db } from "../../utils/firebase"
import { signInWithPopup } from "firebase/auth"
import { setDoc, doc, serverTimestamp } from "firebase/firestore"
import { setCookie } from "../../utils/cookies"

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

    return(
        <>
            <button onClick={handleClick}>Sign in with Google</button>
        </>
    )
}

export default SignIn