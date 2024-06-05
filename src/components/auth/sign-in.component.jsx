import { auth, googleProvider, db } from "../../utils/firebase"
import { signInWithPopup } from "firebase/auth"
import { setDoc, doc, getDoc, serverTimestamp } from "firebase/firestore"
import { setCookie } from "../../utils/cookies"

const SignIn = () => {

    const handleClick = async () => {

        try {

            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const token = await user.getIdToken()
            setCookie(token)

            const userDocRef = doc(db, "users", user.uid)
            const userSnapshot = await getDoc(userDocRef)

            if(!userSnapshot.exists){
                await setDoc(userDocRef, {
                    name: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    lastActive: serverTimestamp(),
                    isOnline: true
                })
            }

            else{
                await setDoc(userDocRef, { isOnline: true, lastActive: serverTimestamp() }, { merge : true })
            }
            
        } catch (error) {
            alert("Error signing in with Google.", error)
        }
    }

    return(
        <>
            <button onClick={handleClick}>Sign in with Google</button>
        </>
    )
}

export default SignIn