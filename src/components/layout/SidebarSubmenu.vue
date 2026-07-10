<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronDown, Lock } from '@lucide/vue'
import { useSidebar } from '@/composables/useSidebar'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  label: { type: String, required: true },
  icon: { type: [Object, Function], required: true },
  // items: [{ label, to, restricted? }] — `restricted` items stay visible
  // but show a lock icon (and are still bounced by the router guard) for
  // non-admin users, rather than being hidden outright.
  items: { type: Array, required: true },
})

const emit = defineEmits(['navigate'])

const route = useRoute()
const { collapsed } = useSidebar()
const auth = useAuthStore()

const hasActiveChild = computed(() => props.items.some((item) => route.name === item.to.name))

// Opens automatically when the current route is one of its children;
// otherwise starts closed and is toggled manually.
const open = ref(hasActiveChild.value)
const flyoutOpen = ref(false)

function toggle() {
  if (collapsed.value) return
  open.value = !open.value
}

function handleItemClick() {
  emit('navigate')
  flyoutOpen.value = false
}
</script>

<template>
  <div class="relative" @mouseenter="collapsed && (flyoutOpen = true)" @mouseleave="collapsed && (flyoutOpen = false)">
    <button
      type="button"
      class="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition"
      :class="hasActiveChild ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-300 hover:bg-white/5 hover:text-white'"
      @click="toggle"
    >
      <component :is="icon" class="h-5 w-5 shrink-0" />
      <span v-if="!collapsed" class="flex-1 truncate">{{ label }}</span>
      <ChevronDown v-if="!collapsed" class="h-4 w-4 shrink-0 transition-transform" :class="{ 'rotate-180': open }" />

      <span
        v-if="collapsed"
        class="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
      >
        {{ label }}
      </span>
    </button>

    <div
      v-if="!collapsed"
      class="grid overflow-hidden transition-[grid-template-rows] duration-200"
      :style="{ gridTemplateRows: open ? '1fr' : '0fr' }"
    >
      <div class="min-h-0">
        <div class="mt-1 ml-4 space-y-0.5 border-l border-white/10 pl-4">
          <RouterLink
            v-for="item in items"
            :key="item.label"
            :to="item.to"
            :title="item.restricted && !auth.isAdmin ? 'Acesso restrito a administradores' : undefined"
            class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            active-class="font-medium text-indigo-300"
            @click="handleItemClick"
          >
            <span class="truncate">{{ item.label }}</span>
            <Lock v-if="item.restricted && !auth.isAdmin" class="h-3 w-3 shrink-0 text-slate-500" />
          </RouterLink>
        </div>
      </div>
    </div>

    <div
      v-if="collapsed && flyoutOpen"
      class="absolute left-full top-0 z-50 ml-2 w-48 rounded-lg border border-slate-700 bg-slate-900 p-1.5 shadow-lg"
    >
      <p class="px-2 py-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{{ label }}</p>
      <RouterLink
        v-for="item in items"
        :key="item.label"
        :to="item.to"
        :title="item.restricted && !auth.isAdmin ? 'Acesso restrito a administradores' : undefined"
        class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
        active-class="font-medium text-indigo-300"
        @click="handleItemClick"
      >
        <span class="truncate">{{ item.label }}</span>
        <Lock v-if="item.restricted && !auth.isAdmin" class="h-3 w-3 shrink-0 text-slate-500" />
      </RouterLink>
    </div>
  </div>
</template>
