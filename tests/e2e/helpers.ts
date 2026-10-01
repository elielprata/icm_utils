import { readFileSync } from 'node:fs'
import type { Download } from '@playwright/test'
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore'

export const COORD = 'coord@gmail.com'

/** Firestore do emulador, logado como coordenador (para preparar os cenários). */
export async function coordinatorDb() {
  const app = initializeApp({ apiKey: 'demo', projectId: 'demo-icm-utils', authDomain: 'localhost' }, `e2e-${Date.now()}`)
  const db = getFirestore(app)
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: 'coord', email: COORD, email_verified: true })))
  return db
}

export const CHURCHES = {
  pio: { name: 'Pioneira', color: '#e8892b', order: 0 },
  caj: { name: 'Cajazeiras', color: '#1f1f1f', order: 1 },
  itu: { name: 'Itupiranga', color: '#4f9a3c', order: 2 },
}

/** Cria um período com algumas pessoas inscritas e devolve o id. */
export async function seedPeriod(db: Awaited<ReturnType<typeof coordinatorDb>>, filled: number[] = []) {
  const id = `e2e${Date.now()}`
  await setDoc(doc(db, 'periods', id), {
    motivo: 'Ministérios',
    motivos: '* Pela nossa Pátria e pela nossa Nação\n* Pelas autoridades constituídas\n* Pelas eleições que se aproximam',
    start: '2030-06-01',
    end: '2030-06-30',
    churches: CHURCHES,
    admins: [COORD],
    createdAt: serverTimestamp(),
  })
  const names = ['Penha', 'Bia', 'Cleber', 'Rosangela', 'André', 'Adria', 'Edson', 'Kedma']
  for (const slot of filled) {
    await setDoc(doc(db, 'periods', id, 'entries', `${slot}_0`), {
      slot,
      level: 0,
      name: names[slot % names.length],
      church: ['pio', 'caj', 'itu'][slot % 3],
      createdAt: serverTimestamp(),
    })
  }
  return id
}

/** Largura e altura de um PNG baixado. */
export async function pngSize(download: Download) {
  const buf = readFileSync((await download.path())!)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

export async function fileHead(download: Download, bytes = 5) {
  return readFileSync((await download.path())!).subarray(0, bytes).toString('latin1')
}
