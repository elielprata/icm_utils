import { expect, test } from '@playwright/test'
import { pngSize } from './helpers'

test('tela inicial mostra as três ferramentas', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Utilidades da Igreja' })).toBeVisible()
  for (const name of ['Escala das CIAs', 'Escala do Trabalho de Senhoras', 'Oração Ininterrupta']) {
    await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible()
  }
})

test('CIAs: rodízio continua entre os meses e a imagem sai com 1440 px', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'escala-professores:v1',
      JSON.stringify({
        config: { startMonth: '2026-10', months: 3, weekday: 0 },
        classes: [{ id: 'criancas', name: 'Crianças', emoji: '🎨', color: '#f2a20c', enabled: true, people: ['Divina', 'Manuelle', 'Vanessa'] }],
        overrides: {},
      }),
    )
  })
  await page.goto('./#/cias')
  const card = page.locator('.card-wrap').first()
  const rows = card.locator('.class-sheet:not(.export) .cs-row')
  // Outubro: 04 Divina, 11 Manuelle, 18 Vanessa, 25 Divina → Novembro começa em Manuelle
  await expect(rows.nth(0)).toContainText('04/10')
  await expect(rows.nth(0)).toContainText('Divina')
  await expect(rows.nth(3)).toContainText('Divina')
  await expect(rows.nth(4)).toContainText('01/11')
  await expect(rows.nth(4)).toContainText('Manuelle')

  const download = page.waitForEvent('download')
  await card.getByRole('button', { name: 'baixar' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('escala-criancas.png')
  expect((await pngSize(file)).width).toBe(1440)
})

test('Senhoras: 5ª quarta aparece sem escala e o rodízio continua no mês seguinte', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'escala-senhoras:v1',
      JSON.stringify({
        startMonth: '2026-10',
        months: 3,
        anchor: '2026-10-07',
        showRoundsInImage: true,
        people: ['Ana', 'Bia', 'Cida', 'Dora', 'Eva', 'Fátima', 'Gil', 'Helena', 'Iris'],
        overrides: {},
      }),
    )
  })
  await page.goto('./#/senhoras')
  await expect(page.getByText('✓ Usando a tabela oficial para 9 servas.')).toBeVisible()
  const sheet = page.locator('.senhoras-sheet:not(.export)')
  await expect(sheet.locator('.ss-skip')).toContainText('Sem escala')
  await expect(sheet.locator('.ss-date.skipped')).toHaveText('30/12')
  await expect(page.locator('.cycle-body')).toContainText('O próximo começa em 09/12/2026')

  // Trocar o mês para janeiro: o rodízio continua (06/01 é o 4º, porque 30/12 não conta)
  await page.locator('#start-month').fill('2027-01')
  await expect(page.locator('.calc').last()).toContainText('cai no 4º rodízio')

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'baixar' }).click()
  expect((await pngSize(await download)).width).toBe(1440)
})

test('Senhoras: o seletor do 1º rodízio só oferece quartas válidas', async ({ page }) => {
  await page.goto('./#/senhoras')
  await page.locator('#anchor-month').fill('2026-12')
  const options = await page.locator('#anchor option').allTextContents()
  expect(options).toEqual(['1ª quarta · 02/12', '2ª quarta · 09/12', '3ª quarta · 16/12', '4ª quarta · 23/12'])
})
