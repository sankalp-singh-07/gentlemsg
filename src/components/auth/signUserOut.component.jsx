import { auth, db } from "../../utils/firebase"
import { doc, serverTimestamp, updateDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { removeCookie } from "../../utils/cookies"

const SignUserOut = async () => {
    try {

        const user = auth.currentUser;
        if(user){
            const userRef = doc(db, 'users', user.uid)
            await updateDoc(userRef, {
                isOnline: false,
                lastActive: serverTimestamp()
            })
        }
     
        await signOut(auth);
        removeCookie()

    } catch (error) {
        console.error('Sign Out Error', error)
    }
}

export default SignUserOut