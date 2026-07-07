import { initializeApp, getApps } from 'firebase/app'
import { getAuth, sendPasswordResetEmail, confirmPasswordReset } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            'AIzaSyCf1AaAuiyqgx01xkRUqpY8tylqsNf4bLI',
  authDomain:        'studentasisstant.firebaseapp.com',
  projectId:         'studentasisstant',
  storageBucket:     'studentasisstant.firebasestorage.app',
  messagingSenderId: '115246792458',
  appId:             '1:115246792458:web:9947619d6fc77322b244f3',
  measurementId:     'G-BS2S0MF31H',
}

// Avoid re-initialising on hot-reload
const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)

export async function firebaseSendReset(email: string) {
  await sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/login`,
  })
}

export async function firebaseConfirmReset(oobCode: string, newPassword: string) {
  await confirmPasswordReset(auth, oobCode, newPassword)
}
