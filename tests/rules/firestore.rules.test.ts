import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'

let env: RulesTestEnvironment

const COORD = 'coord@gmail.com'
const KEY = 'k'.repeat(32)
const KEY2 = 'z'.repeat(32)
const WRONG = 'w'.repeat(32)

const coord = () => env.authenticatedContext('coord', { email: 'Coord@Gmail.com' }).firestore()
const intruder = () => env.authenticatedContext('intruso', { email: 'intruso@gmail.com' }).firestore()
const anon = () => env.unauthenticatedContext().firestore()

const period = (start = '2027-06-01', extra: Record<string, unknown> = {}) => ({
  motivo: 'Ministérios',
  start,
  end: '2027-12-31',
  churches: { pio: { name: 'Pioneira', color: '#e8892b', order: 0 }, itu: { name: 'Itupiranga', color: '#4f9a3c', order: 1 } },
  admins: [COORD],
  createdAt: serverTimestamp(),
  ...extra,
})
const entry = (slot: number, level: number, extra: Record<string, unknown> = {}) => ({
  slot,
  level,
  name: 'Ana',
  church: 'pio',
  createdAt: serverTimestamp(),
  ...extra,
})
const ref = (db: Firestore, col: string, id: string) => doc(db, 'periods', 'p1', col, id)

/** Inscrição pelo link: inscrição + chave secreta no mesmo lote (como o site faz). */
const signUp = (db: Firestore, slot: number, level: number, key = KEY) => {
  const batch = writeBatch(db)
  batch.set(ref(db, 'entries', `${slot}_${level}`), entry(slot, level))
  batch.set(ref(db, 'secrets', `${slot}_${level}`), { key })
  return batch.commit()
}

/** Libera a própria inscrição provando a chave. */
const release = (db: Firestore, id: string, key: string) => {
  const batch = writeBatch(db)
  batch.set(ref(db, 'releases', id), { key })
  batch.delete(ref(db, 'entries', id))
  batch.delete(ref(db, 'secrets', id))
  return batch
}

/** Cria dados ignorando as regras (preparação do cenário). */
const seed = (fn: (db: Firestore) => Promise<unknown>) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()).then(() => undefined))

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-icm-utils',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(() => env.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  await seed((db) => setDoc(doc(db, 'periods', 'p1'), period()))
})

describe('períodos', () => {
  it('coordenador cria período com o próprio e-mail', async () => {
    await assertSucceeds(setDoc(doc(coord(), 'periods', 'novo'), period()))
  })

  it('anônimo não cria período', async () => {
    await assertFails(setDoc(doc(anon(), 'periods', 'novo'), period()))
  })

  it('não cria período em que não é coordenador', async () => {
    await assertFails(setDoc(doc(intruder(), 'periods', 'novo'), period()))
  })

  it('qualquer um lê um período pelo link', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'periods', 'p1')))
  })

  it('só o coordenador lista os próprios períodos', async () => {
    await assertSucceeds(getDocs(query(collection(coord(), 'periods'), where('admins', 'array-contains', COORD))))
    await assertFails(getDocs(collection(anon(), 'periods')))
  })

  it('coordenador edita título e motivos', async () => {
    await assertSucceeds(updateDoc(doc(coord(), 'periods', 'p1'), { motivo: 'Novo título', motivos: 'Pela nação\nPelas famílias' }))
  })

  it('outra pessoa não edita o período', async () => {
    await assertFails(updateDoc(doc(intruder(), 'periods', 'p1'), { motivo: 'hack' }))
  })

  it('recusa campos desconhecidos (ex.: id)', async () => {
    await assertFails(updateDoc(doc(coord(), 'periods', 'p1'), { id: 'p1' }))
  })

  it('motivos até 2000 caracteres', async () => {
    await assertSucceeds(updateDoc(doc(coord(), 'periods', 'p1'), { motivos: 'x'.repeat(2000) }))
    await assertFails(updateDoc(doc(coord(), 'periods', 'p1'), { motivos: 'x'.repeat(2001) }))
  })
})

describe('inscrição pelo link', () => {
  it('qualquer um se inscreve na primeira posição', async () => {
    await assertSucceeds(signUp(anon(), 0, 0))
  })

  it('não pega vaga já ocupada', async () => {
    await signUp(anon(), 0, 0)
    await assertFails(signUp(anon(), 0, 0, KEY2))
  })

  it('não pula posição no horário', async () => {
    await assertFails(signUp(anon(), 5, 1))
    await signUp(anon(), 5, 0)
    await assertSucceeds(signUp(anon(), 5, 1, KEY2))
  })

  it('recusa igreja inexistente, id errado e nome grande demais', async () => {
    const db = anon()
    await assertFails(setDoc(ref(db, 'entries', '1_0'), entry(1, 0, { church: 'zzz' })))
    await assertFails(setDoc(ref(db, 'entries', '2_0'), entry(3, 0)))
    await assertFails(setDoc(ref(db, 'entries', '4_0'), entry(4, 0, { name: 'x'.repeat(41) })))
  })

  it('não apaga nem edita o nome dos outros', async () => {
    await signUp(anon(), 0, 0)
    await assertFails(deleteDoc(ref(anon(), 'entries', '0_0')))
    await assertFails(deleteDoc(ref(intruder(), 'entries', '0_0')))
    await assertFails(updateDoc(ref(anon(), 'entries', '0_0'), { name: 'X' }))
  })
})

describe('chave secreta: trocar ou cancelar sozinho', () => {
  beforeEach(() => signUp(anon(), 0, 0))

  it('ninguém lê a chave, nem o coordenador', async () => {
    await assertFails(getDoc(ref(anon(), 'secrets', '0_0')))
    await assertFails(getDoc(ref(coord(), 'secrets', '0_0')))
  })

  it('não sobrescreve nem apaga a chave enquanto a inscrição existe', async () => {
    await assertFails(setDoc(ref(intruder(), 'secrets', '0_0'), { key: WRONG }))
    await assertFails(deleteDoc(ref(intruder(), 'secrets', '0_0')))
  })

  it('chave errada não cancela', async () => {
    await assertFails(release(intruder(), '0_0', WRONG).commit())
  })

  it('o dono cancela com a chave', async () => {
    await assertSucceeds(release(anon(), '0_0', KEY).commit())
  })

  it('vaga liberada pode ser pega de novo, e a chave antiga não vale para o novo dono', async () => {
    await release(anon(), '0_0', KEY).commit()
    await assertSucceeds(signUp(anon(), 0, 0, KEY2))
    await assertFails(release(anon(), '0_0', KEY).commit())
  })

  it('o dono troca de horário num lote só', async () => {
    const db = anon()
    const batch = release(db, '0_0', KEY)
    batch.set(ref(db, 'entries', '5_0'), entry(5, 0))
    batch.set(ref(db, 'secrets', '5_0'), { key: KEY2 })
    await assertSucceeds(batch.commit())
  })

  it('período já começou: ainda pode nas primeiras 24 h depois da inscrição', async () => {
    await seed((db) => updateDoc(doc(db, 'periods', 'p1'), { start: '2020-01-01' }))
    await assertSucceeds(release(anon(), '0_0', KEY).commit())
  })

  it('período já começou e passaram 24 h: só com o coordenador', async () => {
    await seed(async (db) => {
      await updateDoc(doc(db, 'periods', 'p1'), { start: '2020-01-01' })
      await updateDoc(ref(db, 'entries', '0_0'), { createdAt: Timestamp.fromMillis(Date.now() - 2 * 24 * 60 * 60 * 1000) })
    })
    await assertFails(release(anon(), '0_0', KEY).commit())
    await assertSucceeds(deleteDoc(ref(coord(), 'entries', '0_0')))
  })
})

describe('imagem dos motivos', () => {
  const IMAGE = 'data:image/webp;base64,' + 'A'.repeat(1000) + '=='
  const media = (db: Firestore, name = 'motivos') => doc(db, 'periods', 'p1', 'media', name)
  const data = (image = IMAGE) => ({ image, updatedAt: serverTimestamp() })

  it('coordenador envia, troca e remove', async () => {
    await assertSucceeds(setDoc(media(coord()), data()))
    await assertSucceeds(setDoc(media(coord()), data('data:image/jpeg;base64,BBBB')))
    await assertSucceeds(deleteDoc(media(coord())))
  })

  it('qualquer um com o link vê a imagem', async () => {
    await seed((db) => setDoc(media(db), data()))
    await assertSucceeds(getDoc(media(anon())))
  })

  it('quem não é coordenador não envia nem remove', async () => {
    await assertFails(setDoc(media(anon()), data()))
    await assertFails(setDoc(media(intruder()), data()))
    await seed((db) => setDoc(media(db), data()))
    await assertFails(deleteDoc(media(intruder())))
  })

  it('recusa imagem grande demais, formato desconhecido ou outro nome', async () => {
    await assertFails(setDoc(media(coord()), data('data:image/webp;base64,' + 'A'.repeat(960_000))))
    await assertFails(setDoc(media(coord()), data('data:text/html;base64,AAAA')))
    await assertFails(setDoc(media(coord()), data('<script>alert(1)</script>')))
    await assertFails(setDoc(media(coord(), 'outra'), data()))
  })
})

describe('coordenador', () => {
  beforeEach(() => signUp(anon(), 7, 0))

  it('encaixa fora da regra (qualquer posição)', async () => {
    await assertSucceeds(setDoc(ref(coord(), 'entries', '9_3'), entry(9, 3)))
  })

  it('corrige nome e igreja, mas não muda o horário por edição', async () => {
    await assertSucceeds(updateDoc(ref(coord(), 'entries', '7_0'), { name: 'Ana Maria', church: 'itu' }))
    await assertFails(updateDoc(ref(coord(), 'entries', '7_0'), { slot: 8 }))
  })

  it('move (apaga e cria em outro horário num lote só)', async () => {
    const db = coord()
    const batch = writeBatch(db)
    batch.delete(ref(db, 'entries', '7_0'))
    batch.set(ref(db, 'entries', '9_2'), entry(9, 2))
    await assertSucceeds(batch.commit())
  })

  it('tira nome', async () => {
    await assertSucceeds(deleteDoc(ref(coord(), 'entries', '7_0')))
  })
})
