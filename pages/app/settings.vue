<template>
  <div class="space-y-12 pb-20">
    <!-- Header -->
    <div class="pb-6 border-b border-slate-200">
      <h1 class="text-3xl font-black tracking-tight text-zinc-950">Settings</h1>
      <p class="text-sm text-slate-500 font-medium">Manage your professional profile and agency branding.</p>
    </div>

    <div class="max-w-4xl space-y-12">
      <!-- Profile Section -->
      <section class="space-y-6">
        <h3 class="text-sm font-black uppercase tracking-widest text-zinc-400 px-2">Account Profile</h3>
        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          <!-- Email (Read-only) -->
          <div class="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors hover:bg-slate-50/50">
            <div class="space-y-1">
              <span class="text-sm font-bold text-zinc-950 block">Email Address</span>
              <span class="text-xs text-slate-500 block">Your login and notification email. Cannot be changed manually.</span>
            </div>
            <div class="px-4 py-2 bg-slate-100 rounded-xl text-zinc-500 text-sm font-mono border border-slate-200">
              {{ user?.email }}
            </div>
          </div>

          <!-- Name -->
          <div class="p-8 space-y-4">
             <div class="space-y-1">
                <label class="text-sm font-bold text-zinc-950 block">Full Name</label>
                <p class="text-xs text-slate-500">Displayed in your internal team communications.</p>
             </div>
             <input
                v-model="profileForm.fullName"
                type="text"
                class="w-full max-w-md px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 rounded-xl text-sm transition-all outline-none font-medium placeholder:text-slate-400"
                placeholder="Peter Parker"
              />
          </div>
        </div>
      </section>

      <!-- Agency Branding -->
      <section class="space-y-6">
         <div class="flex items-center justify-between px-2">
           <h3 class="text-sm font-black uppercase tracking-widest text-zinc-400">Agency Branding</h3>
           <div v-if="!planStore.entitlements?.branding_customization_enabled" class="px-2 py-1 rounded-md bg-zinc-950 text-white text-[9px] font-black uppercase tracking-widest">Upgrade to Pro</div>
         </div>

         <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8 space-y-10" :class="!planStore.entitlements?.branding_customization_enabled ? 'opacity-60 grayscale-[0.5]' : ''">
            <!-- Agency Name -->
            <div class="space-y-4">
               <div class="space-y-1">
                  <label class="text-sm font-bold text-zinc-950 block">Public Agency Name</label>
                  <p class="text-xs text-slate-500">This name will appear on the virtual tour interface.</p>
               </div>
               <input
                  v-model="profileForm.agencyName"
                  type="text"
                  class="w-full max-w-md px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 rounded-xl text-sm transition-all outline-none font-medium placeholder:text-slate-400 disabled:cursor-not-allowed"
                  placeholder="Skyline Virtual Realty"
                  :disabled="!planStore.entitlements?.branding_customization_enabled"
                />
            </div>

            <!-- Logo Upload -->
            <div class="space-y-4">
               <div class="space-y-1">
                  <label class="text-sm font-bold text-zinc-950 block">Agency Watermark / Logo</label>
                  <p class="text-xs text-slate-500">Replace the Viewora logo with your own branding.</p>
               </div>
               
               <div class="flex items-center gap-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  <div class="w-24 h-24 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner group">
                    <img v-if="profileForm.agencyLogoUrl" :src="profileForm.agencyLogoUrl" alt="Logo" class="w-full h-full object-contain p-2" />
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-slate-300"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>

                  <div class="space-y-3">
                    <input 
                      type="file" 
                      id="logo-upload" 
                      accept="image/*" 
                      class="hidden" 
                      @change="handleLogoUpload"
                      :disabled="!planStore.entitlements?.branding_customization_enabled || uploading"
                    />
                    <div class="flex items-center gap-3">
                      <label 
                        for="logo-upload" 
                        class="px-6 py-2.5 bg-zinc-950 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                        :class="{ 'pointer-events-none opacity-50': !planStore.entitlements?.branding_customization_enabled || uploading }"
                      >
                        {{ uploading ? 'Uploading...' : 'Upload Logo' }}
                      </label>
                      <button v-if="profileForm.agencyLogoUrl" class="text-xs font-bold text-red-500 hover:text-red-600 transition-colors" @click="profileForm.agencyLogoUrl = ''">Remove</button>
                    </div>
                    <p class="text-[10px] text-slate-400 font-medium italic">Supports transparent PNG/SVG. Best at 120x60px.</p>
                  </div>
               </div>
            </div>
         </div>
      </section>

      <!-- Save Footer -->
      <div class="pt-6 flex justify-end">
         <button 
           class="px-12 py-4 bg-zinc-950 text-white text-sm font-black rounded-2xl hover:bg-zinc-800 shadow-2xl shadow-zinc-950/20 active:scale-95 transition-all disabled:opacity-50" 
           @click="saveProfile" 
           :disabled="saving"
         >
           {{ saving ? 'Syncing...' : 'Save All Settings' }}
         </button>
      </div>

      <!-- Danger zone -->
      <section class="mt-20 pt-12 border-t border-slate-100 space-y-6">
        <h3 class="text-sm font-black uppercase tracking-widest text-red-500 px-2 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Critical Zone
        </h3>
        <div class="bg-red-50/30 rounded-3xl border border-red-100 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-red-50/50">
           <div class="space-y-1">
             <h4 class="text-sm font-bold text-red-600">Permanently Delete Account</h4>
             <p class="text-xs text-red-500/70">Wipes all your 360° spaces, leads, and assets. This cannot be undone.</p>
           </div>
           <button class="px-6 py-3 bg-white text-red-600 border border-red-200 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95" @click="handleDeleteAccount">
             Delete Everything
           </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

useSeoMeta({ title: 'Settings | Viewora' })

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const planStore = usePlanStore()
const { apiFetch } = useApiFetch()

const saving = ref(false)
const uploading = ref(false)

const profileForm = ref({
  fullName: user.value?.user_metadata?.full_name || '',
  agencyName: user.value?.user_metadata?.agency_name || '',
  agencyLogoUrl: user.value?.user_metadata?.agency_logo_url || ''
})

async function handleLogoUpload(e: any) {
  const file = e.target.files[0] as File
  if (!file) return

  uploading.value = true
  try {
    // 1. Get signed URL
    const { signedUrl, publicUrl } = await apiFetch<any>('/uploads/signed-url', {
      method: 'POST',
      body: { 
        fileName: `branding/${user.value?.id}/${Date.now()}-${file.name}`,
        contentType: file.type 
      }
    })

    // 2. Upload to R2
    await $fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    })

    profileForm.value.agencyLogoUrl = publicUrl
  } catch (err: any) {
    alert(`Failed to upload logo: ${err.data?.statusMessage || err.message}`)
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
    alert('Settings saved successfully!')
  } catch (err: any) {
    alert(`Failed to save settings: ${err.message}`)
  } finally {
    saving.value = false
  }
}

async function handleDeleteAccount() {
  if (!confirm('Are you absolutely sure? This will permanently delete your account and all your spaces. This action cannot be undone.')) {
    return
  }
  alert('Account deletion request flagged. Please contact support@viewora.software to finalize verification.')
}
</script>

</script>

<style scoped>
/* Any specific settings styles if needed */
</style>
