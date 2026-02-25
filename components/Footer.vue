<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="footer-logo">Viewora</div>
          <p class="footer-desc">
            The ultimate immersive showcase platform for real estate, hospitality, automotive, and retail spaces. Create interactive 360° experiences that drive bookings and sales.
          </p>
        </div>
        
        <div>
          <h4 class="footer-heading">Platform</h4>
          <ul class="footer-links">
            <li><NuxtLink to="/product">How it works</NuxtLink></li>
            <li><NuxtLink to="/pricing">Pricing</NuxtLink></li>
            <li><NuxtLink to="/login">Sign in</NuxtLink></li>
            <li><NuxtLink to="/register">Create Account</NuxtLink></li>
          </ul>
        </div>
        
        <div>
          <h4 class="footer-heading">Company</h4>
          <ul class="footer-links">
            <li><NuxtLink to="/about">About Us</NuxtLink></li>
            <li><NuxtLink to="/contact">Contact</NuxtLink></li>
          </ul>
        </div>
        
        <div>
          <h4 class="footer-heading">Legal</h4>
          <ul class="footer-links">
            <li><NuxtLink to="/legal/terms">Terms of Service</NuxtLink></li>
            <li><NuxtLink to="/legal/privacy">Privacy Policy</NuxtLink></li>
            <li><NuxtLink to="/legal/refund">Refund Policy</NuxtLink></li>
          </ul>
        </div>
      </div>
      
      <div class="footer-bottom">
        <div class="footer-copyright">
          &copy; {{ new Date().getFullYear() }} Viewora. All rights reserved.
        </div>
        <div style="font-size: 0.875rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
          Payments securely processed by Paystack
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
// Footer Component
</script>