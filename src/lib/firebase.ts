import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { firebaseConfig } from '../firebase-config'

/** `npm run dev:emulador` usa os emuladores locais do Firebase em vez do projeto real. */
const useEmulators = import.meta.env.VITE_FIREBASE_EMULATORS === 'true'

export const firebaseReady = useEmulators || !firebaseConfig.apiKey.startsWith('COLE_AQUI')

const app = initializeApp(useEmulators ? { apiKey: 'demo', projectId: 'demo-icm-utils', authDomain: 'localhost' } : firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)

if (useEmulators) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  // Só nos emuladores: entra como um coordenador de teste sem a janela do Google.
  Object.assign(window, {
    emulatorSignIn: (email: string) =>
      signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true }))),
  })
}
