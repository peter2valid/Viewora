<template>
  <NuxtLayout name="app">
    <div class="users-page">

      <!-- Header -->
      <div class="users-header">
        <div>
          <h1 class="users-title">Team & Users</h1>
          <p class="users-sub">Manage who has access to your Viewora workspace.</p>
        </div>
        <button class="btn btn-dark" @click="showInvite = true">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.4rem;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Invite Member
        </button>
      </div>

      <!-- Plan notice -->
      <div class="plan-notice">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>Team collaboration is available on the <strong>Pro</strong> and <strong>Elite</strong> plans. <NuxtLink to="/app/billing">Upgrade your plan →</NuxtLink></span>
      </div>

      <!-- Members table -->
      <div class="members-section">
        <div class="members-head">
          <span class="members-count">{{ members.length }} member{{ members.length !== 1 ? 's' : '' }}</span>
        </div>
        <table class="members-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in members" :key="member.id">
              <td>
                <div class="member-cell">
                  <div class="member-avatar">{{ member.initials }}</div>
                  <div>
                    <div class="member-name">{{ member.name }}</div>
                    <div class="member-email">{{ member.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span :class="['role-badge', `role-badge--${member.role.toLowerCase()}`]">{{ member.role }}</span>
              </td>
              <td class="member-date">{{ member.joined }}</td>
              <td>
                <span class="status-dot status-dot--active"></span>
                <span class="status-text">Active</span>
              </td>
              <td>
                <span class="member-you" v-if="member.isYou">You</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Roles explanation -->
      <div class="roles-section">
        <h2 class="roles-title">Role Permissions</h2>
        <div class="roles-grid">
          <div class="role-card" v-for="role in roleDescriptions" :key="role.name">
            <div class="role-card-header">
              <span :class="['role-badge', `role-badge--${role.name.toLowerCase()}`]">{{ role.name }}</span>
            </div>
            <ul class="role-perms">
              <li v-for="perm in role.permissions" :key="perm" class="role-perm">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent);flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>
                {{ perm }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Invite modal -->
      <Teleport to="body">
        <Transition name="modal">
          <div v-if="showInvite" class="modal-backdrop" @click.self="showInvite = false">
            <div class="modal-card" style="max-width:440px;">
              <div class="modal-header">
                <h3 class="modal-title">Invite Team Member</h3>
                <button class="modal-close" @click="showInvite = false" aria-label="Close">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div class="modal-body">
                <div class="upgrade-gate">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--border-sharp);margin-bottom:1rem;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <h4>Upgrade Required</h4>
                  <p>Team invitations are available on the Pro and Elite plans. Upgrade to collaborate with your team.</p>
                  <NuxtLink to="/app/billing" class="btn btn-primary" style="margin-top:0.5rem;" @click="showInvite = false">View Plans</NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Users | Viewora' })

const user = useSupabaseUser()
const showInvite = ref(false)

const members = computed(() => {
  const u = user.value as any
  if (!u) return []
  const name = u.user_metadata?.full_name || u.name || u.email?.split('@')[0] || 'You'
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  return [{
    id: u.id || u.sub,
    name,
    email: u.email || '',
    initials,
    role: 'Owner',
    joined: new Date(u.created_at || Date.now()).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
    isYou: true,
  }]
})

const roleDescriptions = [
  {
    name: 'Owner',
    permissions: [
      'Full workspace access',
      'Manage billing & plans',
      'Invite & remove members',
      'Create, edit & delete tours',
      'Publish & unpublish tours',
    ],
  },
  {
    name: 'Editor',
    permissions: [
      'Create & edit assigned tours',
      'Upload scenes & hotspots',
      'Publish tours',
      'View analytics',
      'Cannot manage billing',
    ],
  },
  {
    name: 'Viewer',
    permissions: [
      'View all tours',
      'View analytics',
      'Cannot create or edit tours',
      'Cannot publish tours',
      'Cannot manage billing',
    ],
  },
]
</script>

<style scoped>
.users-page { padding: 2rem; max-width: 1000px; margin: 0 auto; }

.users-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.users-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.03em;
  margin: 0 0 0.25rem;
}
.users-sub { color: var(--slate); font-size: 0.95rem; margin: 0; }

.plan-notice {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  background: #fefce8;
  border: 1px solid #fde68a;
  color: #92400e;
  border-radius: 0.625rem;
  padding: 0.75rem 1rem;
  font-size: 0.825rem;
  margin-bottom: 1.5rem;
}
.plan-notice a { color: #b45309; font-weight: 600; text-decoration: underline; }

.members-section {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
  margin-bottom: 2rem;
}
.members-head {
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.members-count { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

.members-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.members-table th {
  padding: 0.75rem 1.25rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  background: var(--paper-dim);
}
.members-table td { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); color: var(--ink); }
.members-table tbody tr:last-child td { border-bottom: none; }

.member-cell { display: flex; align-items: center; gap: 0.75rem; }
.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #0099ff);
  color: var(--ink);
  font-weight: 700;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.member-name { font-weight: 600; color: var(--ink); font-size: 0.875rem; }
.member-email { font-size: 0.78rem; color: var(--text-muted); }
.member-date { color: var(--slate); font-size: 0.825rem; }
.member-you { font-size: 0.72rem; font-weight: 700; background: var(--border); color: var(--slate); padding: 0.15rem 0.5rem; border-radius: 99px; }

.role-badge {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.2rem 0.55rem;
  border-radius: 99px;
}
.role-badge--owner { background: #faf5ff; color: #7c3aed; }
.role-badge--editor { background: #eff6ff; color: #2563eb; }
.role-badge--viewer { background: var(--paper-alt); color: var(--slate); }

.status-dot {
  display: inline-block;
  width: 7px; height: 7px;
  border-radius: 50%;
  margin-right: 0.35rem;
  vertical-align: middle;
}
.status-dot--active { background: var(--accent); }
.status-text { font-size: 0.825rem; color: var(--slate); vertical-align: middle; }

/* Roles grid */
.roles-section { margin-top: 1rem; }
.roles-title { font-size: 1rem; font-weight: 700; color: var(--ink); margin: 0 0 1rem; }
.roles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.role-card {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.25rem;
}
.role-card-header { margin-bottom: 1rem; }
.role-perms { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.role-perm { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.825rem; color: var(--slate); line-height: 1.4; }

/* Upgrade gate */
.upgrade-gate { text-align: center; padding: 1rem 0.5rem; }
.upgrade-gate h4 { font-size: 1.1rem; font-weight: 700; color: var(--ink); margin: 0 0 0.5rem; }
.upgrade-gate p { font-size: 0.875rem; color: var(--slate); line-height: 1.5; max-width: 300px; margin: 0 auto; }

@media (max-width: 700px) {
  .users-page { padding: 1rem; }
  .roles-grid { grid-template-columns: 1fr; }
  .members-table th:nth-child(3), .members-table td:nth-child(3),
  .members-table th:nth-child(4), .members-table td:nth-child(4) { display: none; }
}
</style>
