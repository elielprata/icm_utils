import { expect, test } from '@playwright/test'
import { pngSize } from './helpers'

// Professoras das turmas vêm da escala dos domingos (sugestões nos campos)
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    localStorage.setItem(
      'escala-professores:v1',
      JSON.stringify({
        config: { startMonth: '2026-10', months: 3, weekday: 0 },
        classes: [
          { id: 'bercario', name: '0 a 3 anos', emoji: '🍼', color: '#e8457f', people: ['Ana', 'Bia'] },
          { id: 'criancas', name: 'Crianças', emoji: '🎨', color: '#f2a20c', people: ['Divina', 'Manuelle'] },
          { id: 'intermediarios', name: 'Intermediários', emoji: '📖', color: '#1f6fd1', people: ['Rosangela'] },
          { id: 'adolescentes', name: 'Adolescentes', emoji: '🎧', color: '#e0392f', people: ['Marcos'] },
        ],
        overrides: {},
      }),
    )
  })
})

test('a tela inicial tem o Evento das CIAs', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('link', { name: /Evento das CIAs/ }).click()
  await expect(page.getByRole('heading', { name: /Evento das CIAs/ })).toBeVisible()
})

test('preenche o evento, cada turma com o seu horário, e gera uma imagem com todas as turmas', async ({ page }) => {
  await page.goto('./#/cias-evento')

  // Evento: nome, igreja, tema e arte (data e horário são de cada turma)
  // O nome não vem preenchido: só um exemplo no campo
  await expect(page.locator('#ev-name')).toHaveValue('')
  await expect(page.locator('#ev-name')).toHaveAttribute('placeholder', /Evangelização CIAs/)
  await page.locator('#ev-name').fill('Evangelização CIAs')
  await page.locator('#ev-church').fill('Itupiranga')
  await page.locator('#ev-tema').fill('Você sabe o que é Salvação?')

  // Arte do evento
  const art = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 1280
    c.height = 720
    const x = c.getContext('2d')!
    x.fillStyle = '#ffd34d'
    x.fillRect(0, 0, 1280, 720)
    return c.toDataURL('image/png')
  })
  await page.locator('#ev-image').setInputFiles({ name: 'arte.png', mimeType: 'image/png', buffer: Buffer.from(art.split(',')[1], 'base64') })
  await expect(page.locator('.event-form img.event-art')).toBeVisible()

  // Todas as turmas na mesma tela, sem abas; cada uma com o seu dia e horário
  await expect(page.locator('.page-tabs')).toHaveCount(0)
  const turmas = page.locator('.turma-row')
  await expect(turmas).toHaveCount(4)

  const fill = async (i: number, date: string, time: string, palavra: string, louvor: string) => {
    const row = turmas.nth(i)
    await row.getByLabel('Data').fill(date)
    await row.getByLabel('Horário').fill(time)
    await row.getByLabel('Palavra').fill(palavra)
    await row.getByLabel('Louvor').fill(louvor)
    await row.getByLabel('Louvor').blur()
  }
  await fill(0, '2026-10-18', '09:00', 'Ana', 'Bia')
  await fill(1, '2026-10-18', '09:00', 'divina', 'MANUELLE') // nomes ficam "Divina", "Manuelle"
  await fill(2, '2026-10-18', '09:00', 'Rosangela', 'Edson')
  await fill(3, '2026-10-17', '15:00', 'Marcos', 'Letícia') // adolescentes: outro dia e à tarde
  await expect(turmas.nth(1).getByLabel('Palavra')).toHaveValue('Divina')
  await expect(turmas.nth(1).getByLabel('Louvor')).toHaveValue('Manuelle')

  // As professoras da turma aparecem como sugestão
  await expect(page.locator('#sug-criancas option')).toHaveCount(2)

  // A imagem tem tudo: evento, igreja, tema e as 4 turmas, cada uma com o seu dia e horário
  const card = page.locator('.event-sheet:not(.export)')
  await expect(card).toContainText('Evangelização CIAs')
  await expect(card).toContainText('Itupiranga')
  await expect(card).toContainText('Você sabe o que é Salvação?')
  await expect(card.locator('.ev-turma')).toHaveCount(4)
  await expect(card.locator('.ev-turma').nth(0)).toContainText('Domingo, 18/10 · 09:00')
  await expect(card.locator('.ev-turma').nth(3)).toContainText('Sábado, 17/10 · 15:00')
  await expect(card.locator('.ev-turma').nth(3)).toContainText('Letícia')
  await expect(card.locator('.ev-turma').nth(1)).toContainText('Divina')

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'baixar' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('evento-cias.png')
  expect((await pngSize(file)).width).toBe(1440)

  // Fica salvo no aparelho
  await page.reload()
  await expect(page.locator('#ev-church')).toHaveValue('Itupiranga')
  await expect(turmas.nth(3).getByLabel('Horário')).toHaveValue('15:00')
  await expect(page.locator('.event-form img.event-art')).toBeVisible()
})

test('o checkbox "Mostrar na imagem" decide quais turmas aparecem; sem nenhuma, não compartilha', async ({ page }) => {
  await page.goto('./#/cias-evento')
  const card = page.locator('.event-sheet:not(.export)')
  const share = page.locator('.card-wrap .actions').getByRole('button', { name: /Compartilhar/ })
  const row = (i: number) => page.locator('.turma-row').nth(i)
  const show = (i: number) => row(i).getByRole('checkbox', { name: 'Mostrar na imagem' })

  // Nada marcado: nenhuma turma na imagem e compartilhar bloqueado
  await expect(card.locator('.ev-turma')).toHaveCount(0)
  await expect(share).toBeDisabled()
  await expect(page.locator('.share-blocked')).toContainText('Marque pelo menos uma turma')

  // Começar a preencher as Crianças marca o checkbox sozinho
  await row(1).getByLabel('Palavra').fill('Divina')
  await expect(show(1)).toBeChecked()
  await expect(card.locator('.ev-turma')).toHaveCount(1)
  await expect(card.locator('.ev-turma')).toContainText('Crianças')
  await expect(share).toBeEnabled()

  // Desmarcar esconde, mesmo preenchida; continuar editando não marca de novo
  await show(1).uncheck()
  await row(1).getByLabel('Louvor').fill('Manuelle')
  await expect(show(1)).not.toBeChecked()
  await expect(card.locator('.ev-turma')).toHaveCount(0)

  // Marcar uma turma sem nada também mostra (com "—")
  await show(3).check()
  await expect(card.locator('.ev-turma')).toHaveCount(1)
  await expect(card.locator('.ev-turma')).toContainText('Adolescentes')

  // A escolha fica salva
  await page.reload()
  await expect(show(1)).not.toBeChecked()
  await expect(show(3)).toBeChecked()
})
