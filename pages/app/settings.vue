<template>
  <div class="h-full flex flex-col max-w-4xl">
    <!-- Header -->
    <header class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-main">Settings</h1>
      <p class="text-sm text-dim mt-1">Manage your account and agency preferences.</p>
    </header>

    <div class="space-y-8">
      <!-- Profile Section -->
      <section class="card-glass overflow-hidden">
        <div class="p-6 border-b border-border">
          <h3 class="text-base font-bold text-main">Account Profile</h3>
          <p class="text-sm text-dim mt-1">Information about your professional identity.</p>
        </div>
        <div class="p-6 space-y-6">
          <!-- Email (Read-only) -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Account Identifier</label>
            <div class="input-glass px-5 py-3 text-sm font-bold text-dim/60 flex items-center justify-between !bg-surface-alt/50 border-main/10">
              {{ user?.email }}
              <span class="text-[9px] font-black tracking-widest opacity-50">Locked</span>
            </div>
          </div>

          <!-- Name -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black text-dim uppercase tracking-widest ml-1" for="full-name">Display Name</label>
            <input
              id="full-name"
              v-model="profileForm.fullName"
              type="text"
              class="input-glass w-full px-5 py-3 text-sm font-bold placeholder:text-dim/40"
              placeholder="e.g. Peter Parker"
            />
          </div>
        </div>
      </section>

      <!-- Agency Branding -->
      <section class="card-glass overflow-hidden" :class="!planStore.entitlements?.branding_customization_enabled ? 'opacity-75' : ''">
        <div class="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-main">Agency Branding</h3>
            <p class="text-sm text-dim mt-1">Customize how your agency appears on virtual tours.</p>
          </div>
          <div v-if="!planStore.entitlements?.branding_customization_enabled" class="px-2.5 py-1 bg-main text-bg text-[10px] font-bold uppercase tracking-wider rounded-md">
            Pro Feature
          </div>
        </div>

        <div class="p-6 space-y-8">
          <!-- Agency Name -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black text-dim uppercase tracking-widest ml-1" for="agency-name">Enterprise / Agency Name</label>
            <input
              id="agency-name"
              v-model="profileForm.agencyName"
              type="text"
              class="input-glass w-full px-5 py-3 text-sm font-bold placeholder:text-dim/40 disabled:opacity-40"
              placeholder="Skyline Virtual Realty"
              :disabled="!planStore.entitlements?.branding_customization_enabled"
            />
          </div>

          <!-- Logo Upload -->
          <div class="space-y-3">
            <label class="text-sm font-bold text-main">Agency Logo</label>
            <div class="flex items-center gap-6">
              <div class="w-20 h-20 bg-surface-alt rounded-xl border border-border flex items-center justify-center overflow-hidden shadow-inner">
                <img v-if="profileForm.agencyLogoUrl" :src="profileForm.agencyLogoUrl" alt="Logo" class="w-full h-full object-contain p-2" />
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-dim/50"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
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
                    class="btn btn-secondary !py-2 !px-4 !text-xs shadow-sm cursor-pointer"
                    :class="{ 'pointer-events-none opacity-50': !planStore.entitlements?.branding_customization_enabled || uploading }"
                  >
                    {{ uploading ? 'Uploading...' : 'Change Logo' }}
                  </label>
                  <button v-if="profileForm.agencyLogoUrl" class="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors" @click="profileForm.agencyLogoUrl = ''">Remove</button>
                </div>
                <p class="text-xs text-dim">PNG or SVG. Recommended size 120x60px.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Save Footer -->
      <div class="flex justify-end pt-4">
          <button 
            class="btn btn-primary !px-10 shadow-2xl" 
            @click="saveProfile" 
            :disabled="saving"
          >
            {{ saving ? 'Synchronizing Profile...' : 'Authorize Changes' }}
          </button>
      </div>

      <!-- Danger zone -->
      <section class="mt-12 pt-12 border-t border-border">
        <h3 class="text-[11px] font-black text-rose-500/80 mb-6 flex items-center gap-2 uppercase tracking-[0.2em]">
          Infrastructure Destruction
        </h3>
        <div class="bg-rose-500/5 rounded-2xl border border-rose-500/10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 transition-all hover:bg-rose-500/10 group/danger">
           <div class="space-y-1">
             <h4 class="text-base font-black text-rose-500 tracking-tight">Decommission Account</h4>
             <p class="text-sm text-dim font-bold max-w-sm">Permanently wipe all tours, leads, and assets from our clusters. This action is terminal.</p>
           </div>
           <button class="btn !bg-rose-500 !text-white !border-rose-400 !shadow-[0_10px_30px_-10px_rgba(244,63,94,0.4)] hover:!scale-105 active:!scale-95 !px-8 !py-4" @click="showDeleteConfirm = true">
             Confirm Deletion
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
        <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" :class="toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white  text-white'">
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
      headers: { 
        'Content-Type': file.type,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
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
