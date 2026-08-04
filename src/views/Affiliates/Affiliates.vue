<script setup>
import { ref } from 'vue'
import { AFFILIATE_TABS } from './lib/tabs'
import OverviewTab from './OverviewTab.vue'
import MyAffiliatesTab from './MyAffiliatesTab.vue'
import CampaignsTab from './CampaignsTab.vue'

const activeTab = ref(AFFILIATE_TABS[0].key)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-slate-900">Afiliados</h1>
      <p class="mt-0.5 text-sm text-slate-500">TikTok Shop — funil de criadores afiliados</p>
    </div>

    <div class="relative isolate overflow-hidden border-b border-slate-200">
      <nav class="flex gap-1">
        <button
          v-for="tab in AFFILIATE_TABS"
          :key="tab.key"
          type="button"
          class="border-b-2 px-4 py-2.5 text-sm font-medium transition"
          :class="
            activeTab === tab.key
              ? 'border-indigo-500 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          "
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <section v-show="activeTab === 'overview'" class="space-y-6">
      <OverviewTab />
    </section>
    <section v-show="activeTab === 'my_affiliates'" class="space-y-6">
      <MyAffiliatesTab />
    </section>
    <section v-show="activeTab === 'campaigns'" class="space-y-6">
      <CampaignsTab />
    </section>
  </div>
</template>
