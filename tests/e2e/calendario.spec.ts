import { expect, test } from '@playwright/test'
import { COORD, pngSize } from './helpers'

// Celular
test.use({ viewport: { width: 400, height: 860 } })

const signIn = async (page: import('@playwright/test').Page) => {
  await page.goto('./#/calendario')
  await page.waitForFunction(() => 'emulatorSignIn' in window)
  await page.evaluate((email) => (window as unknown as { emulatorSignIn: (e: string) => Promise<unknown> }).emulatorSignIn(email), COORD)
  await expect(page.getByText(`Conectado como ${COORD}`)).toBeVisible()
}

const todayIso = async (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })

test('sem entrar, a página explica para que serve e chama de secretário', async ({ page }) => {
  await page.goto('./#/calendario')
  const main = page.locator('.app')
  await expect(main).toContainText('link público de visualização')
  await expect(main.getByText('É secretário?')).toBeVisible()
  await expect(main.getByRole('button', { name: 'Entrar com Google' })).toBeVisible()
})

test.describe('secretário', () => {
  test('cria calendário, cadastra tipo, adiciona evento e compartilha a imagem', async ({ page }) => {
    await signIn(page)

    await page.getByRole('button', { name: '+ Novo calendário' }).click()
    await page.getByLabel('Nome').fill('Programação')
    await page.getByRole('button', { name: 'Criar calendário' }).click()
    await expect(page).toHaveURL(/#\/calendario\/admin\//)
    await expect(page.locator('.cg-title-row')).toContainText('Programação')

    // Tipos: já vêm 2 de exemplo ("Evento Geral", "Evento Local"); renomeia o primeiro
    await page.getByRole('tab', { name: 'Tipos' }).click()
    await expect(page.getByLabel('Nome do tipo')).toHaveCount(2)
    await page.getByLabel('Nome do tipo').first().fill('Confirmado')

    // Eventos: toca no dia de hoje e adiciona um evento
    await page.getByRole('tab', { name: 'Eventos' }).click()
    const today = await todayIso(page)
    await page.getByRole('button', { name: today }).click()
    await expect(page.locator('.sheet h3')).toBeVisible()
    await page.getByLabel('Hora (opcional)').fill('08:00')
    await page.getByLabel('Título').fill('Culto de Teste')
    await page.getByLabel('Nota (opcional)').fill('Sede')
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
    await expect(page.locator('.cg-sheet-event-row')).toContainText('Culto de Teste')
    await page.keyboard.press('Escape')
    await expect(page.locator(`button[aria-label="${today}"] .cg-dots i`)).toHaveCount(1)

    // Setas ‹ › trocam de mês sem precisar abrir o seletor; ida e volta mantém o evento visível
    const monthValue = () => page.locator('.cg-month-field input[type="month"]').inputValue()
    const before = await monthValue()
    await page.getByRole('button', { name: 'Mês seguinte' }).click()
    await expect.poll(monthValue).not.toBe(before)
    await page.getByRole('button', { name: 'Mês anterior' }).click()
    await expect.poll(monthValue).toBe(before)
    await expect(page.locator(`button[aria-label="${today}"] .cg-dots i`)).toHaveCount(1)

    // Compartilhar: a bolinha, a legenda e os detalhes do evento aparecem na imagem
    await page.getByRole('tab', { name: 'Compartilhar' }).click()
    const card = page.locator('.cg-sheet:not(.export)')
    await expect(card.locator('.cg-legend-item', { hasText: 'Confirmado' })).toBeVisible()
    await expect(card).toContainText('08:00')
    await expect(card).toContainText('Culto de Teste')
    await expect(card).toContainText('Sede')
    await expect(card.locator('button.cg-cell-btn')).toHaveCount(0) // a imagem não é clicável, só mostra

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'baixar' }).click()
    const file = await download
    expect(file.suggestedFilename()).toBe('calendario-de-eventos.png')
    expect((await pngSize(file)).width).toBe(1520) // 760px de largura × pixelRatio 2

    // O link público também fica na aba Compartilhar
    const link = await page.locator('.cg-link-text').textContent()
    expect(link).toMatch(/#\/calendario\/ver\//)
  })

  test('link público mostra o evento sem login e sem nada de editar', async ({ page }) => {
    await signIn(page)
    await page.getByRole('button', { name: '+ Novo calendário' }).click()
    await page.getByLabel('Nome').fill('Teste Público')
    await page.getByRole('button', { name: 'Criar calendário' }).click()
    await expect(page).toHaveURL(/#\/calendario\/admin\/(.+)/)
    const calendarId = new URL(page.url()).hash.split('/').pop()!

    await page.getByRole('tab', { name: 'Tipos' }).click()
    await page.getByLabel('Nome do tipo').first().fill('Geral')

    await page.getByRole('tab', { name: 'Eventos' }).click()
    const today = await todayIso(page)
    await page.getByRole('button', { name: today }).click()
    await page.getByLabel('Título').fill('Reunião Pública')
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
    await expect(page.locator('.cg-sheet-event-row')).toContainText('Reunião Pública')

    // Um segundo evento, ainda não confirmado: deve aparecer só pra quem administra
    await page.getByLabel('Título').fill('Ainda não combinado')
    await page.getByLabel(/^Confirmado/).uncheck()
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
    await expect(page.locator('.cg-sheet-event-row')).toHaveCount(2)
    await expect(page.locator('.cg-sheet-event-row', { hasText: 'Ainda não combinado' })).toContainText('não confirmado')
    await page.keyboard.press('Escape')
    await expect(page.locator(`button[aria-label="${today}"] .cg-dots i`)).toHaveCount(2)
    await expect(page.locator(`button[aria-label="${today}"] .cg-dots i.pending`)).toHaveCount(1)

    // Abre o link público, já sem a sessão (contexto novo)
    const context = await page.context().browser()!.newContext()
    const pub = await context.newPage()
    await pub.goto(`./#/calendario/ver/${calendarId}`)
    await expect(pub.getByText('Calendário público')).toBeVisible()
    await expect(pub.getByText('Teste Público')).toBeVisible()
    // Só o evento confirmado chega até o público, na bolinha e nos detalhes do dia
    await expect(pub.locator(`button[aria-label="${today}"] .cg-dots i`)).toHaveCount(1)
    await pub.getByRole('button', { name: today }).click()
    await expect(pub.locator('.cg-date-card')).toContainText('Reunião Pública')
    await expect(pub.locator('.cg-date-card')).not.toContainText('Ainda não combinado')

    // Só leitura: sem login, sem formulário, sem "Entrar com Google"
    await expect(pub.getByRole('button', { name: 'Entrar com Google' })).toHaveCount(0)
    await expect(pub.locator('.sheet-form')).toHaveCount(0)
    await expect(pub.getByRole('button', { name: 'Adicionar', exact: true })).toHaveCount(0)
    await context.close()
  })

  test('muda o dia do evento pelo campo de data e pelo botão Mover', async ({ page }) => {
    await signIn(page)
    await page.getByRole('button', { name: '+ Novo calendário' }).click()
    await page.getByLabel('Nome').fill('Teste Mover')
    await page.getByRole('button', { name: 'Criar calendário' }).click()

    await page.getByRole('tab', { name: 'Eventos' }).click()
    await page.locator('input[type="month"]').fill('2026-10')

    // Cria o evento no dia 5
    await page.getByRole('button', { name: '2026-10-05' }).click()
    await page.getByLabel('Título').fill('Reunião Móvel')
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
    await expect(page.locator('.cg-sheet-event-row')).toContainText('Reunião Móvel')
    await page.keyboard.press('Escape')
    await expect(page.locator('button[aria-label="2026-10-05"] .cg-dots i')).toHaveCount(1)

    // Campo de data: edita e troca para o dia 12
    await page.getByRole('button', { name: '2026-10-05' }).click()
    await page.getByRole('button', { name: 'Editar' }).click()
    await page.getByLabel('Data', { exact: true }).fill('2026-10-12')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await page.keyboard.press('Escape')
    await expect(page.locator('button[aria-label="2026-10-05"] .cg-dots i')).toHaveCount(0)
    await expect(page.locator('button[aria-label="2026-10-12"] .cg-dots i')).toHaveCount(1)

    // Botão Mover: toca no dia de destino na grade e confirma
    await page.getByRole('button', { name: '2026-10-12' }).click()
    await page.getByRole('button', { name: 'Mover', exact: true }).click()
    await expect(page.locator('.moving-banner')).toContainText('Movendo Reunião Móvel')
    await page.getByRole('button', { name: '2026-10-20' }).click()
    await expect(page.locator('.sheet h3')).toContainText('Mover Reunião Móvel para')
    await page.locator('.sheet .primary', { hasText: 'Mover' }).click()
    await expect(page.locator('button[aria-label="2026-10-12"] .cg-dots i')).toHaveCount(0)
    await expect(page.locator('button[aria-label="2026-10-20"] .cg-dots i')).toHaveCount(1)
  })
})
