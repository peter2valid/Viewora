<template>
  <div>
    <!-- Hero Section -->
    <section class="hero section-bg">
      <div class="container grid-2" style="align-items: center;">
        <div>
          <div class="badge">SaaS for Real Estate & Hospitality</div>
          <h1 class="hero-title">
            Win More Business with <span class="highlight">Interactive 360° Tours</span>
          </h1>
          <p class="hero-subtitle">
            Allow prospects to step inside your properties from anywhere. Upload panoramas, connect rooms, and share easily.
          </p>
          <div class="hero-actions">
            <NuxtLink to="/register" class="btn btn-primary btn-lg">Start Free Trial</NuxtLink>
            <NuxtLink to="/product" class="btn btn-outline btn-lg">See How It Works</NuxtLink>
          </div>
        </div>
        <div style="position: relative; height: 100%; min-height: 300px; display: flex; align-items: center; justify-content: center; padding: 1rem 0;">
          <!-- Background Glow Effect for Aesthetics -->
          <div style="position: absolute; top: 10%; bottom: 10%; left: 5%; right: 5%; background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); filter: blur(40px); opacity: 0.25; z-index: 0; border-radius: 2rem; transform: translateZ(0);"></div>
          
          <!-- Browser Window Frame -->
          <div class="card" style="padding: 0; position: relative; overflow: hidden; border-radius: 1rem; width: 100%; height: 300px; display: flex; flex-direction: column; background-color: var(--bg-surface); box-shadow: var(--shadow-xl), 0 0 0 1px rgba(0,0,0,0.05); z-index: 1; border: none;">
            
            <!-- Top Toolbar Fake Interface -->
            <div style="height: 40px; background-color: rgba(255, 255, 255, 0.9); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; padding: 0 1rem; gap: 0.5rem; backdrop-filter: blur(4px);">
              <div style="display: flex; gap: 0.4rem;">
                <div style="width: 11px; height: 11px; border-radius: 50%; background-color: #ff5f56; box-shadow: inset 0 0 2px rgba(0,0,0,0.1);"></div>
                <div style="width: 11px; height: 11px; border-radius: 50%; background-color: #ffbd2e; box-shadow: inset 0 0 2px rgba(0,0,0,0.1);"></div>
                <div style="width: 11px; height: 11px; border-radius: 50%; background-color: #27c93f; box-shadow: inset 0 0 2px rgba(0,0,0,0.1);"></div>
              </div>
              <div style="flex: 1; display: flex; justify-content: center;">
                <div style="font-size: 0.7rem; font-family: var(--font-sans); color: var(--text-secondary); background: var(--bg-base); padding: 0.2rem 1.5rem; border-radius: 6px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); display: flex; align-items: center; gap: 0.4rem;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  viewora.com/tours/demo
                </div>
              </div>
              <div style="width: 45px;"></div> <!-- Spacer to perfectly center the URL bar -->
            </div>
            
            <!-- The Actual Iframe -->
            <div style="flex: 1; width: 100%; height: 100%; position: relative;">
              <iframe src="https://www.marzipano.net/demos/sample-tour/" style="width: 100%; height: 100%; border: none;" allowfullscreen title="Sample 360 Virtual Tour" loading="lazy"></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">Create Tours in 3 Simple Steps</h2>
          <p class="section-subtitle">No coding or technical expertise required. Have your property online in minutes.</p>
        </div>
        
        <div class="grid-3">
          <div class="card text-center">
            <div style="background: var(--bg-surface-alt); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 1.5rem; font-weight: bold; color: var(--primary);">1</div>
            <h3 class="mb-4">Upload Panoramas</h3>
            <p class="text-muted">Take 360° images using any compatible camera and upload them directly to your Viewora dashboard.</p>
          </div>
          <div class="card text-center">
            <div style="background: var(--bg-surface-alt); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 1.5rem; font-weight: bold; color: var(--primary);">2</div>
            <h3 class="mb-4">Connect Rooms</h3>
            <p class="text-muted">Use our intuitive visual editor to link rooms together, creating a seamless walkthrough journey.</p>
          </div>
          <div class="card text-center">
            <div style="background: var(--bg-surface-alt); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 1.5rem; font-weight: bold; color: var(--primary);">3</div>
            <h3 class="mb-4">Publish & Share</h3>
            <p class="text-muted">Generate a unique public link instantly. Share it on your website, Airbnb listing, or social media.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Who It's For -->
    <section class="section section-bg">
      <div class="container grid-2" style="align-items: center;">
        <div>
          <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80" alt="Real Estate Professional showing property" class="card" style="padding: 0; width: 100%; object-fit: cover;" />
        </div>
        <div>
          <h2 class="section-title">Built for Property Professionals</h2>
          <div style="display: flex; flex-direction: column; gap: 1.5rem; margin-top: 2rem;">
            <div style="display: flex; gap: 1rem;">
              <div style="color: var(--primary);"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>
              <div>
                <h4 class="font-bold mb-1">Airbnb Hosts</h4>
                <p class="text-muted text-sm">Boost listing credibility and reduce guest queries about layout.</p>
              </div>
            </div>
            <div style="display: flex; gap: 1rem;">
              <div style="color: var(--primary);"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg></div>
              <div>
                <h4 class="font-bold mb-1">Real Estate Agents</h4>
                <p class="text-muted text-sm">Pre-qualify buyers and save time on unnecessary physical viewings.</p>
              </div>
            </div>
            <div style="display: flex; gap: 1rem;">
              <div style="color: var(--primary);"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
              <div>
                <h4 class="font-bold mb-1">Property Developers</h4>
                <p class="text-muted text-sm">Showcase show houses and model layouts to off-plan investors.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature Highlights -->
    <section class="section">
      <div class="container text-center">
        <h2 class="section-title mb-12">Everything You Need to Succeed</h2>
        <div class="grid-3" style="text-align: left;">
          <div class="card">
            <h4 class="font-bold mb-2">High-Resolution Support</h4>
            <p class="text-muted">Upload multi-megabyte 8K panos without losing quality on the viewer's device.</p>
          </div>
          <div class="card">
            <h4 class="font-bold mb-2">Mobile-First Viewer</h4>
            <p class="text-muted">Tours automatically scale and utilize gyroscopic magic on iOS and Android.</p>
          </div>
          <div class="card">
            <h4 class="font-bold mb-2">Custom Branding</h4>
            <p class="text-muted">Remove Viewora branding and add your own agency logo (Business plan).</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="section section-bg text-center">
      <div class="container" style="max-width: 600px;">
        <h2 class="section-title">Ready to Elevate Your Properties?</h2>
        <p class="text-muted mb-8">Join the growing community of professionals closing more deals with Viewora.</p>
        <NuxtLink to="/pricing" class="btn btn-primary btn-lg">View Pricing & Subscribe</NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Viewora | Premium 360° Virtual Tour SaaS for Real Estate',
  description: 'Create, host, and share interactive 360° virtual property tours in minutes. Join top Airbnb hosts, estate agents, and hotels leveraging Viewora.'
})
</script>