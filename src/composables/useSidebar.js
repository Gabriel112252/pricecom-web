import { ref, watch } from 'vue'

const STORAGE_KEY = 'pricecom_sidebar_collapsed'

export const SIDEBAR_WIDTH_EXPANDED = 240
export const SIDEBAR_WIDTH_COLLAPSED = 64

function loadCollapsed() {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

// Module-level singleton: one sidebar per app, state shared across every
// component that calls useSidebar() without prop-drilling.
const collapsed = ref(loadCollapsed())
const mobileOpen = ref(false)

watch(collapsed, (value) => {
  localStorage.setItem(STORAGE_KEY, String(value))
})

export function useSidebar() {
  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function openMobile() {
    mobileOpen.value = true
  }

  function closeMobile() {
    mobileOpen.value = false
  }

  return { collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile }
}
