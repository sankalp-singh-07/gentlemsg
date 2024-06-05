import { getCookie, removeCookie } from "../../utils/cookies"
import { useEffect } from "react"
import { signInWithCustomToken } from "firebase/auth"
import { auth, db } from "../../utils/firebase"
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore"

const AutoAuth = () => {
    useEffect(() => {
        const autoLogged = async () => {
            const token = getCookie()
            if(token){
                try{
                    await signInWithCustomToken(auth, token)
                    const user = auth.currentUser;
                    if(user){
                        const userRef = doc(db, 'users', user.uid)
                        const userSnapshot = await getDoc(userRef)
                        if(userSnapshot.exists()){
                            await updateDoc(userRef, {
                                isOnline: true,
                                lastActive: serverTimestamp()
                            })
                        }
                        else{
                            await setDoc(userDocRef, {
                                name: user.displayName,
                                email: user.email,
                                photoURL: user.photoURL,
                                lastActive: serverTimestamp(),
                                isOnline: true
                            })
                        }

                    }

                }
                catch (error) {
                    alert("Error with Auto Sign In.", error)
                    removeCookie()
                }
            }   
        }

        autoLogged();
    }, [])


    return null;
}

export default AutoAuth