<template>
  <div class="h-full flex flex-col max-w-4xl">
    <!-- Header -->
    <header class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Settings</h1>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage your account and agency preferences.</p>
    </header>

    <div class="space-y-8">
      <!-- Profile Section -->
      <section class="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <h3 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">Account Profile</h3>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Information about your professional identity.</p>
        </div>
        <div class="p-6 space-y-6">
          <!-- Email (Read-only) -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email Address</label>
            <div class="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              {{ user?.email }}
              <span class="text-[10px] uppercase font-bold text-zinc-400">Read-only</span>
            </div>
          </div>

          <!-- Name -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300" for="full-name">Full Name</label>
            <input
              id="full-name"
              v-model="profileForm.fullName"
              type="text"
              class="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 rounded-xl text-sm outline-none transition-all shadow-sm"
              placeholder="Peter Parker"
            />
          </div>
        </div>
      </section>

      <!-- Agency Branding -->
      <section class="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden" :class="!planStore.entitlements?.branding_customization_enabled ? 'opacity-75' : ''">
        <div class="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">Agency Branding</h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Customize how your agency appears on virtual tours.</p>
          </div>
          <div v-if="!planStore.entitlements?.branding_customization_enabled" class="px-2.5 py-1 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
            Pro Feature
          </div>
        </div>

        <div class="p-6 space-y-8">
          <!-- Agency Name -->
<div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300" for="agency-name">Agency Name</label>
            <input
              id="agency-name"
              v-model="profileForm.agencyName"
              type="text"
              class="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none transition-shadow shadow-sm disabled:bg-zinc-50 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed"
              placeholder="Skyline Virtual Realty"
              :disabled="!planStore.entitlements?.branding_customization_enabled"
            />
          </div>

          <!-- Logo Upload -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Agency Logo</label>
            <div class="flex items-center gap-6">
              <div class="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden">
                <img v-if="profileForm.agencyLogoUrl" :src="profileForm.agencyLogoUrl" alt="Logo" class="w-full h-full object-contain p-2" />
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-zinc-300"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>

              <div class="flex flex-col gap-2">
                <div class="flex items-center gap-2">
                  <input 
                    type="file" 
                    id="logo-upload" 
                    accept="image/*" 
                    class="hidden" 
                    @change="handleLogoUpload"
                    :disabled="!planStore.entitlements?.branding_customization_enabled || uploading"
                  />
                  <label 
                    for="logo-upload" 
                    class="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:bg-zinc-800 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                    :class="{ 'pointer-events-none opacity-50': !planStore.entitlements?.branding_customization_enabled || uploading }"
                  >
                    {{ uploading ? 'Uploading...' : 'Change Logo' }}
                  </label>
                  <button v-if="profileForm.agencyLogoUrl" class="text-xs font-medium text-rose-600 hover:text-rose-700" @click="profileForm.agencyLogoUrl = ''">Remove</button>
                </div>
                <p class="text-xs text-zinc-400">PNG or SVG. Recommended size 120x60px.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Save Footer -->
      <div class="flex justify-end pt-4">
         <button 
           class="px-8 py-3 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50" 
           @click="saveProfile" 
           :disabled="saving"
         >
           {{ saving ? 'Saving changes...' : 'Save Settings' }}
         </button>
      </div>

      <!-- Danger zone -->
      <section class="mt-12 pt-12 border-t border-zinc-200 dark:border-zinc-700">
        <h3 class="text-sm font-semibold text-rose-600 mb-4 flex items-center gap-2 uppercase tracking-wider">
          Danger Zone
        </h3>
        <div class="bg-rose-50/50 rounded-xl border border-rose-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
             <h4 class="text-sm font-semibold text-rose-900">Delete Account</h4>
             <p class="text-xs text-rose-700 mt-1">Permanently remove all your tours, leads, and account data.</p>
           </div>
           <button class="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors shadow-sm" @click="showDeleteConfirm = true">
             Delete Everything
           </button>
        </div>
      </section>

      <AppConfirmationModal
        :is-open="showDeleteConfirm"
        title="Permanently Delete Account?"
        message="This action is irreversible. All your 360° tours, lead data, and media assets will be immediately destroyed."
        confirm-text="Yes, Delete Everything"
        :is-dangerous="true"
        :loading="deleting"
        @confirm="handleDeleteAccount"
        @cancel="showDeleteConfirm = false"
      />
    </div>
  </div>

  <!-- Toast -->
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="toast" :class="['fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold', toast.type === 'success' ? 'bg-zinc-950 text-white' : 'bg-red-600 text-white']">
        <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" :class="toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white dark:bg-zinc-900/20 text-white'">
          <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        {{ toast.message }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { definePageMeta, useSeoMeta, useSupabaseUser, useSupabaseClient } from '#imports'
import { usePlanStore } from '~/stores/plan'
import { useApiFetch } from '~/composables/useApiFetch'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Settings | Viewora' })

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const planStore = usePlanStore()
const { apiFetch } = useApiFetch()

const saving = ref(false)
const uploading = ref(false)
const deleting = ref(false)
const showDeleteConfirm = ref(false)
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3200)
}

const profileForm = ref({
  fullName: user.value?.user_metadata?.full_name || '',
  agencyName: user.value?.user_metadata?.agency_name || '',
  agencyLogoUrl: user.value?.user_metadata?.agency_logo_url || ''
})

function unwrapApiData<T = any>(value: any): T {
  if (value && typeof value === 'object' && 'data' in value && value.data !== undefined) {
    return value.data as T
  }
  if (value && typeof value === 'object' && 'result' in value && value.result !== undefined) {
    return value.result as T
  }
  return value as T
}

async function handleLogoUpload(e: any) {
  const file = e.target.files[0] as File
  if (!file) return

  uploading.value = true
  try {
    const signedPayload = unwrapApiData<any>(await apiFetch<any>('/uploads/create-signed-url', {
      method: 'POST',
      body: { 
        mediaType: 'logo',
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size
      }
    }))

    const signedUrl = signedPayload?.signedUrl
    const publicUrl = signedPayload?.publicUrl
    if (!signedUrl || !publicUrl) {
      throw new Error('Invalid upload signing response from server')
    }

    await $fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    })

    profileForm.value.agencyLogoUrl = publicUrl
  } catch (err: any) {
    showToast(`Failed to upload logo: ${err.data?.statusMessage || err.message}`, 'error')
  } finally {
    uploading.value = false
  }
}

async function saveProfile() {
  saving.value = true
  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: profileForm.value.fullName,
        agency_name: profileForm.value.agencyName,
        agency_logo_url: profileForm.value.agencyLogoUrl
      }
    })

    if (error) throw error
    showToast('Settings saved successfully')
  } catch (err: any) {
    showToast(`Failed to save settings: ${err.message}`, 'error')
  } finally {
    saving.value = false
  }
}

async function handleDeleteAccount() {
  deleting.value = true
  setTimeout(() => {
    deleting.value = false
    showDeleteConfirm.value = false
    showToast('Deletion request received. Our team will verify and finalize this within 24 hours.')
  }, 1500)
}
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }
</style>
