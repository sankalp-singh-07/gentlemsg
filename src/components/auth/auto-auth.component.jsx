import { getCookie } from "../../utils/cookies"
import { useEffect } from "react"
import { signInWithCustomToken } from "firebase/auth"
import { auth, db } from "../../utils/firebase"
import { doc, serverTimestamp, updateDoc } from "firebase/firestore"

const AutoAuth = () => {
    useEffect(() => {
        const autoLogged = async () => {
            try {
                const token = getCookie()
                if(token){
                    await signInWithCustomToken(auth, token)
                    const user = auth.currentUser;
                    if(user){
                        const userRef = doc(db, 'users', user.uid)
                        await updateDoc(userRef, {
                            isOnline: true,
                            lastActive: serverTimestamp()
                        })
                    }

                }
            } catch (error) {
                
            }
        }

        autoLogged();
    }, [])


    return(
        <>
            
        </>
    )
}

export default AutoAuth