<script setup>
import iconColor from '@/assets/pricecom-icon.png'
import iconWhite from '@/assets/pricecom-icon-white.png'

// Ícone recortado de src/assets/pricecom.webp (marca completa em fundo
// branco) — sem o wordmark "PRICECOM", que já aparece por extenso ao lado
// deste componente. Ver DESIGN_SYSTEM.md § Logo para o porquê da variante
// "white": o traçado navy do ícone original é ilegível sobre o navy da
// sidebar, então "white" é uma silhueta sólida gerada a partir do alfa do
// recorte — não um arquivo à parte enviado pelo design.
const props = defineProps({
  size: { type: Number, default: 32 },
  variant: { type: String, default: 'white' }, // 'white' (fundo escuro) | 'color' (fundo claro)
})
</script>

<template>
  <img
    :src="variant === 'white' ? iconWhite : iconColor"
    :style="{ height: `${size}px`, width: 'auto' }"
    class="shrink-0 object-contain"
    alt="Pricecom"
  />
</template>
