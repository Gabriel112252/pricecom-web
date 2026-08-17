import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RealSkusSoldChannelTable from '../RealSkusSoldChannelTable.vue'

// Mesmo dado de Idworks::DashboardStatsService#real_skus_sold — este
// componente só achata channel_breakdown em linhas, não recalcula nada.
function mountTable(products) {
  return mount(RealSkusSoldChannelTable, { props: { products } })
}

describe('RealSkusSoldChannelTable', () => {
  it('renders one row per (product, channel) pair, with avulso/em kit/total/receita all visible directly — no hover needed', () => {
    const wrapper = mountTable([
      {
        sku: '2080',
        name: 'PROTETOR SOLAR FACIAL FPS 70 CLAREADOR',
        total_qty: 350560,
        direct_qty: 300000,
        kit_qty: 50560,
        channel_breakdown: [
          { channel: 'TikTok Shop', direct_qty: 200000, kit_qty: 48698, quantity: 248698, revenue: 6295569.1 },
          { channel: 'Yampi/Shopify', direct_qty: 83395, kit_qty: 0, quantity: 83395, revenue: 2214177.46 },
          { channel: 'Shopee', direct_qty: 16600, kit_qty: 1862, quantity: 18462, revenue: 549840.76 },
        ],
      },
    ])

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)

    const first = rows[0].text()
    expect(first).toContain('2080')
    expect(first).toContain('PROTETOR SOLAR FACIAL FPS 70 CLAREADOR')
    expect(first).toContain('TikTok Shop')
    expect(first).toContain('200000') // avulso
    expect(first).toContain('48698') // em kit
    expect(first).toContain('248698') // total
    expect(first).toMatch(/R\$\s*6\.295\.569,10/) // receita aproximada

    expect(rows[1].text()).toContain('Yampi/Shopify')
    expect(rows[2].text()).toContain('Shopee')
  })

  it('lists every product in order, one contiguous group of rows each', () => {
    const wrapper = mountTable([
      { sku: '2080', name: 'Protetor', total_qty: 10, direct_qty: 10, kit_qty: 0, channel_breakdown: [{ channel: 'TikTok Shop', direct_qty: 10, kit_qty: 0, quantity: 10, revenue: 100 }] },
      { sku: '0107', name: 'Sabonete', total_qty: 5, direct_qty: 5, kit_qty: 0, channel_breakdown: [{ channel: 'Shopee', direct_qty: 5, kit_qty: 0, quantity: 5, revenue: 50 }] },
    ])

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('2080')
    expect(rows[1].text()).toContain('0107')
  })

  it('falls back to a single "Não identificado" row (using the product totals) when a product has no channel_breakdown', () => {
    const wrapper = mountTable([
      { sku: 'HID-1', name: 'Produto sem canal', total_qty: 7, direct_qty: 5, kit_qty: 2, channel_breakdown: [] },
    ])

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(1)
    const text = rows[0].text()
    expect(text).toContain('Não identificado')
    expect(text).toContain('5') // avulso
    expect(text).toContain('2') // em kit
    expect(text).toContain('7') // total
  })

  it('shows the empty-state message and no table when there are no products', () => {
    const wrapper = mountTable([])

    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.text()).toContain('Sem dados no período.')
  })
})
