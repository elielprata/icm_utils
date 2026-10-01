import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Imagem dos motivos (ex.: arte recebida da igreja). Fica no próprio Firestore, já reduzida no aparelho
 * (`compressImage`): o Firebase Storage exigiria o plano pago.
 */
export { compressImage, dataUrlToBlob, fitWithin, IMAGE_MAX_CHARS, imageExtension } from './imageFile'

const imageRef = (periodId: string) => doc(db, 'periods', periodId, 'media', 'motivos')

export function watchMotivosImage(periodId: string, onChange: (image: string | null) => void): Unsubscribe {
  return onSnapshot(
    imageRef(periodId),
    (snap) => onChange((snap.data()?.image as string | undefined) ?? null),
    () => onChange(null),
  )
}

export const saveMotivosImage = (periodId: string, image: string) =>
  setDoc(imageRef(periodId), { image, updatedAt: serverTimestamp() })

export const removeMotivosImage = (periodId: string) => deleteDoc(imageRef(periodId))
