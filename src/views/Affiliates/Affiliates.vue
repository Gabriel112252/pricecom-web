<script setup>
import { ref } from 'vue'
import { AFFILIATE_TABS } from './lib/tabs'
import PageHeader from '@/components/PageHeader.vue'
import TabNav from '@/components/TabNav.vue'
import OverviewTab from './OverviewTab.vue'
import MyAffiliatesTab from './MyAffiliatesTab.vue'
import CampaignsTab from './CampaignsTab.vue'

const activeTab = ref(AFFILIATE_TABS[0].key)
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <PageHeader title="Afiliados" subtitle="TikTok Shop — funil de criadores afiliados" />

    <TabNav :tabs="AFFILIATE_TABS" v-model="activeTab" />

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
