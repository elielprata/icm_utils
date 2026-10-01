import { expect, test, type Page } from '@playwright/test'
import { doc, getDoc, getDocs, collection } from 'firebase/firestore'
import { COORD, coordinatorDb, fileHead, pngSize, seedPeriod } from './helpers'

// Celular
test.use({ viewport: { width: 400, height: 860 } })

const cell = (page: Page, time: string) => page.locator(`.sg-cell[aria-label^="${time}"]`).first()

test.describe('inscrição pelo link da igreja', () => {
  test('agendar, trocar e cancelar o próprio horário', async ({ page }) => {
    const db = await coordinatorDb()
    // Madrugada quase cheia: só 00:00 e 00:15 livres
    const pid = await seedPeriod(db, Array.from({ length: 22 }, (_, i) => i + 2))
    await page.goto(`./#/oracao/${pid}/itu`)

    await expect(page.locator('.church-pill')).toContainText('Itupiranga')
    await expect(page.locator('.page-tabs')).toHaveText(/Horários.*Motivos.*Lista/)
    await expect(page.locator('.shift-tabs button').first()).toContainText('2')

    // Agendar 00:15 (o nome começa vazio)
    await cell(page, '00:15').click()
    await expect(page.locator('#nome')).toHaveValue('')
    await page.locator('#nome').fill('Maria')
    await page.getByRole('button', { name: 'Confirmar horário' }).click()
    await expect(page.locator('.my-slot')).toContainText('Seu horário: 00:15 – 00:30')

    // Um novo horário não vem com o nome anterior
    await cell(page, '00:00').click()
    await expect(page.locator('#nome')).toHaveValue('')
    await page.getByRole('button', { name: 'Voltar' }).click()

    // Trocar para 00:00
    await page.getByRole('button', { name: 'Trocar horário' }).click()
    await expect(page.locator('.moving-banner')).toBeVisible()
    await cell(page, '00:00').click()
    await page.getByRole('button', { name: 'Trocar para este horário' }).click()
    await expect(page.locator('.my-slot')).toContainText('Seu horário: 00:00 – 00:15')
    const ids = (await getDocs(collection(db, 'periods', pid, 'entries'))).docs.map((d) => d.id)
    expect(ids).toContain('0_0')
    expect(ids).not.toContain('1_0')

    // Cancelar
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.getByRole('button', { name: 'Sim, cancelar' }).click()
    await expect(page.locator('.status.ok')).toContainText('cancelado')
    await expect(page.locator('.my-slot')).toHaveCount(0)
  })

  test('horário ocupado mostra quem está e não deixa agendar enquanto há vagas', async ({ page }) => {
    const db = await coordinatorDb()
    const pid = await seedPeriod(db, [2])
    await page.goto(`./#/oracao/${pid}/pio`)
    await cell(page, '00:30').click()
    await expect(page.locator('.people-list')).toContainText('Cleber')
    await expect(page.getByRole('button', { name: 'Confirmar horário' })).toHaveCount(0)
    await expect(page.locator('.sheet-note')).toContainText('Abre de novo quando todos os horários tiverem 1 pessoa')
  })

  test('motivos (só imagem) e lista (PDF e imagem) são compartilhados separados', async ({ page }) => {
    const db = await coordinatorDb()
    const pid = await seedPeriod(db, [0, 1, 2, 50])
    await page.goto(`./#/oracao/${pid}/caj`)
    await page.getByRole('tab', { name: 'Motivos' }).click()
    const motivos = page.locator('.motivos-sheet:not(.export)')
    await expect(motivos.locator('h4')).toHaveText(['MOTIVOS PESSOAIS', 'MOTIVOS GERAIS'])
    await expect(motivos.locator('li')).toHaveCount(3)
    await expect(page.getByRole('button', { name: /PDF/ })).toHaveCount(0)
    const motivosImage = page.waitForEvent('download')
    await page.getByRole('button', { name: 'baixar', exact: true }).click()
    expect((await motivosImage).suggestedFilename()).toBe('motivos-de-oracao.png')

    // A lista não repete os motivos
    await page.getByRole('tab', { name: 'Lista' }).click()
    await expect(page.locator('.oracao-sheet:not(.export)')).not.toContainText('MOTIVOS GERAIS')
    const pdf = page.waitForEvent('download')
    await page.getByRole('button', { name: 'baixar PDF' }).click()
    const pdfFile = await pdf
    expect(pdfFile.suggestedFilename()).toBe('oracao-ininterrupta.pdf')
    expect(await fileHead(pdfFile)).toBe('%PDF-')

    const png = page.waitForEvent('download')
    await page.getByRole('button', { name: 'baixar', exact: true }).click()
    expect((await pngSize(await png)).width).toBe(1800)
  })

  test('link com igreja errada avisa', async ({ page }) => {
    const db = await coordinatorDb()
    const pid = await seedPeriod(db)
    await page.goto(`./#/oracao/${pid}/naoexiste`)
    await expect(page.getByText('Link inválido')).toBeVisible()
  })
})

test.describe('coordenador', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./#/oracao')
    await page.waitForFunction(() => 'emulatorSignIn' in window)
    await page.evaluate((email) => (window as unknown as { emulatorSignIn: (e: string) => Promise<unknown> }).emulatorSignIn(email), COORD)
    await expect(page.getByText(`Conectado como ${COORD}`)).toBeVisible()
  })

  test('cria um período com duas igrejas', async ({ page }) => {
    await page.getByRole('button', { name: '+ Novo período' }).click()
    await page.locator('#motivo').fill('Ministérios')
    await page.locator('#motivos').fill('Pela nação\nPelas famílias')
    await page.getByRole('button', { name: '+ Adicionar igreja' }).click()
    await page.getByRole('button', { name: '+ Adicionar igreja' }).click()
    await page.getByLabel('Nome da igreja').nth(0).fill('Pioneira')
    await page.getByLabel('Nome da igreja').nth(1).fill('Itupiranga')
    await page.getByRole('button', { name: 'Criar período' }).click()
    await expect(page).toHaveURL(/#\/oracao\/admin\//)
    await page.getByRole('tab', { name: 'Links' }).click()
    await expect(page.locator('.link-row')).toHaveCount(2)
  })

  test('edita título e motivos de um período existente', async ({ page }) => {
    const db = await coordinatorDb()
    const pid = await seedPeriod(db)
    await page.goto(`./#/oracao/admin/${pid}`)
    await page.getByRole('tab', { name: 'Configurar' }).click()
    await page.locator('#motivo').fill('Campanha de oração')
    await page.locator('#motivos').fill('Pelas famílias')
    // A prévia abre numa janela (não ocupa a página)
    await page.getByRole('button', { name: '👁 Ver como vai ficar' }).click()
    const preview = page.getByRole('dialog', { name: 'Como os motivos vão aparecer' })
    await expect(preview).toContainText('Pelas famílias')
    await preview.getByRole('button', { name: '✕ Fechar' }).click()
    await expect(preview).toHaveCount(0)
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect.poll(async () => (await getDoc(doc(db, 'periods', pid))).data()?.motivo).toBe('Campanha de oração')
    expect((await getDoc(doc(db, 'periods', pid))).data()?.motivos).toBe('Pelas famílias')
  })

  test('corrige o nome e move alguém de horário', async ({ page }) => {
    const db = await coordinatorDb()
    const pid = await seedPeriod(db, [12])
    await page.goto(`./#/oracao/admin/${pid}`)
    await expect(page.getByText('1 de 96 horários preenchidos')).toBeVisible()

    await cell(page, '03:00').click()
    await page.getByRole('button', { name: 'Editar' }).click()
    await page.locator('.sheet-form input').first().fill('Paulo Sérgio')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect.poll(async () => (await getDoc(doc(db, 'periods', pid, 'entries', '12_0'))).data()?.name).toBe('Paulo Sérgio')

    await page.getByRole('button', { name: 'Mover' }).click()
    await expect(page.locator('.moving-banner')).toContainText('Movendo Paulo Sérgio')
    await cell(page, '00:00').click()
    await page.locator('.sheet .primary', { hasText: 'Mover' }).click()
    await expect.poll(async () => (await getDocs(collection(db, 'periods', pid, 'entries'))).docs.map((d) => d.id)).toEqual(['0_0'])
  })

  test('envia a imagem dos motivos (reduzida) e ela aparece para quem se inscreve', async ({ page }) => {
    const db = await coordinatorDb()
    const pid = await seedPeriod(db)
    await page.goto(`./#/oracao/admin/${pid}`)
    await page.getByRole('tab', { name: 'Configurar' }).click()

    // Uma "arte" grande (1600 × 2400) gerada no próprio navegador
    const dataUrl = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 1600
      canvas.height = 2400
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#f4f1ee'
      ctx.fillRect(0, 0, 1600, 2400)
      ctx.fillStyle = '#8a1c24'
      ctx.font = 'bold 140px sans-serif'
      ctx.fillText('MOTIVOS DE ORAÇÃO', 80, 400)
      return canvas.toDataURL('image/png')
    })
    await page.locator('#motivos-image').setInputFiles({
      name: 'motivos.png',
      mimeType: 'image/png',
      buffer: Buffer.from(dataUrl.split(',')[1], 'base64'),
    })
    await expect(page.locator('.panel img.motivos-image')).toBeVisible()
    // A tela mostra a imagem antes de o servidor confirmar; espera chegar no banco.
    const stored = async () => (await getDoc(doc(db, 'periods', pid, 'media', 'motivos'))).data()?.image as string | undefined
    await expect.poll(stored).toMatch(/^data:image\/webp;base64,/)
    const saved = (await stored())!
    expect(saved.length).toBeLessThan(950_000)
    const size = await page.evaluate(async (src) => {
      const img = new Image()
      img.src = src
      await img.decode()
      return [img.naturalWidth, img.naturalHeight]
    }, saved)
    expect(size).toEqual([1080, 1620])

    // Quem se inscreve vê e baixa a imagem na aba Motivos
    await page.goto(`./#/oracao/${pid}/pio`)
    await page.getByRole('tab', { name: 'Motivos' }).click()
    await expect(page.locator('.card-wrap img.motivos-image')).toBeVisible()
    // Com imagem, o texto dos motivos não aparece (é uma coisa ou outra)
    await expect(page.locator('.motivos-sheet')).toHaveCount(0)
    await page.getByRole('button', { name: 'Ampliar a imagem' }).click()
    await expect(page.locator('.zoom-view img')).toBeVisible()
    await page.getByRole('button', { name: '✕ Fechar' }).click()
    await expect(page.locator('.zoom-view')).toHaveCount(0)
    const download = page.waitForEvent('download')
    await page.locator('.card-wrap', { has: page.locator('img.motivos-image') }).getByRole('button', { name: 'baixar' }).click()
    expect((await download).suggestedFilename()).toBe('motivos-de-oracao.webp')
  })

  test('Compartilhar tem duas opções, cada uma abre sua janela', async ({ page }) => {
    const db = await coordinatorDb()
    const pid = await seedPeriod(db, [0, 1])
    await page.goto(`./#/oracao/admin/${pid}`)
    await page.getByRole('tab', { name: 'Compartilhar' }).click()

    // Só as duas opções; nada de prévia enorme na página
    await expect(page.locator('.share-option')).toHaveCount(2)
    await expect(page.locator('.oracao-sheet, .motivos-sheet')).toHaveCount(0)

    await page.getByRole('button', { name: /Lista de horários/ }).click()
    const lista = page.getByRole('dialog', { name: 'Lista de horários' })
    await expect(lista.locator('.oracao-sheet:not(.export)')).toBeVisible()
    await expect(lista.getByRole('button', { name: /PDF da lista/ })).toBeVisible()
    await lista.getByRole('button', { name: '✕ Fechar' }).click()

    await page.getByRole('button', { name: /Motivos de oração/ }).click()
    const motivos = page.getByRole('dialog', { name: 'Motivos de oração' })
    await expect(motivos.locator('.motivos-sheet:not(.export)')).toContainText('MOTIVOS GERAIS')
    await expect(motivos.getByRole('button', { name: /PDF/ })).toHaveCount(0)
  })

  test('volta para a lista de períodos', async ({ page }) => {
    const db = await coordinatorDb()
    const pid = await seedPeriod(db)
    await page.goto(`./#/oracao/admin/${pid}`)
    await page.getByRole('link', { name: '← Meus períodos' }).click()
    await expect(page.getByRole('heading', { name: 'Seus períodos de oração' })).toBeVisible()
  })
})
