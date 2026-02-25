<template>
  <div>
    <!-- Hero Section -->
    <section class="hero section-bg">
      <div class="container grid-2" style="align-items: center;">
        <div>
          <div class="badge">↗ The #1 Virtual Tour Platform</div>
          <h1 class="hero-title">
            Win More Business with <span class="highlight">Interactive 360° Tours</span>
          </h1>
          <p class="hero-subtitle">
            Upload panoramas, connect rooms, and share a stunning virtual tour in minutes. No coding. No app required. Works on every device.
          </p>
          <div class="hero-actions">
            <NuxtLink to="/register" class="btn btn-primary btn-lg btn-float">Start Free — No Card Needed</NuxtLink>
            <NuxtLink to="/product" class="btn btn-outline btn-lg">See How It Works →</NuxtLink>
          </div>
          <p style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">✓ Free forever plan &nbsp;&nbsp; ✓ No credit card &nbsp;&nbsp; ✓ Publish in 5 minutes</p>
        </div>
        <div style="position: relative; height: 100%; min-height: 300px; display: flex; align-items: center; justify-content: center; padding: 1rem 0;">
          <!-- Background Glow Effect -->
          <div style="position: absolute; top: 10%; bottom: 10%; left: 5%; right: 5%; background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); filter: blur(40px); opacity: 0.25; z-index: 0; border-radius: 2rem; transform: translateZ(0);"></div>
          
          <!-- Browser Window Frame -->
          <div class="card" style="padding: 0; position: relative; overflow: hidden; border-radius: 1rem; width: 100%; height: 300px; display: flex; flex-direction: column; background-color: var(--bg-surface); box-shadow: var(--shadow-xl), 0 0 0 1px rgba(0,0,0,0.05); z-index: 1; border: none;">
            <!-- Top Toolbar -->
            <div style="height: 40px; background-color: rgba(255, 255, 255, 0.9); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; padding: 0 1rem; gap: 0.5rem; backdrop-filter: blur(4px);">
              <div style="display: flex; gap: 0.4rem;">
                <div style="width: 11px; height: 11px; border-radius: 50%; background-color: #ff5f56;"></div>
                <div style="width: 11px; height: 11px; border-radius: 50%; background-color: #ffbd2e;"></div>
                <div style="width: 11px; height: 11px; border-radius: 50%; background-color: #27c93f;"></div>
              </div>
              <div style="flex: 1; display: flex; justify-content: center;">
                <div style="font-size: 0.7rem; font-family: var(--font-sans); color: var(--text-secondary); background: var(--bg-base); padding: 0.2rem 1.5rem; border-radius: 6px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.4rem;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  viewora.software/tours/demo
                </div>
              </div>
              <div style="width: 45px;"></div>
            </div>
            <!-- Iframe -->
            <div style="flex: 1; width: 100%; height: 100%; position: relative;">
              <iframe src="https://www.marzipano.net/demos/sample-tour/" style="width: 100%; height: 100%; border: none;" allowfullscreen title="Sample 360 Virtual Tour" loading="lazy"></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Bar -->
    <section style="background: var(--ink); padding: 2.5rem 0; border-top: 1px solid var(--border-dark); border-bottom: 1px solid var(--border-dark);">
      <div class="container">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; text-align: center;">
          <div style="color: var(--paper);">
            <div style="font-size: 2.25rem; font-weight: 900; font-family: var(--font-display); letter-spacing: -0.04em;">500+</div>
            <div style="font-size: 0.7rem; opacity: 0.6; margin-top: 0.25rem; font-family: var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase;">Tours Published</div>
          </div>
          <div style="color: var(--paper);">
            <div style="font-size: 2.25rem; font-weight: 900; font-family: var(--font-display); letter-spacing: -0.04em;">30+</div>
            <div style="font-size: 0.7rem; opacity: 0.6; margin-top: 0.25rem; font-family: var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase;">Countries</div>
          </div>
          <div style="color: var(--paper);">
            <div style="font-size: 2.25rem; font-weight: 900; font-family: var(--font-display); letter-spacing: -0.04em;">4.8/5</div>
            <div style="font-size: 0.7rem; opacity: 0.6; margin-top: 0.25rem; font-family: var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase;">Rating</div>
          </div>
          <div style="color: var(--paper);">
            <div style="font-size: 2.25rem; font-weight: 900; font-family: var(--font-display); letter-spacing: -0.04em;">Free</div>
            <div style="font-size: 0.7rem; opacity: 0.6; margin-top: 0.25rem; font-family: var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase;">To Start</div>
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
        
        <div class="grid-3" style="align-items: start;">
          <div class="card text-center">
            <div style="background: var(--paper-dim); padding: 1.25rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border); height: 180px; display: flex; align-items: center; justify-content: center;">
              <img src="/images/home/hardware-setup.png" loading="lazy" alt="Photography Hardware" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 0.25rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));" />
            </div>
            <div style="background: var(--bg-surface-alt); width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 1.25rem; font-weight: bold; color: var(--primary);">1</div>
            <h3 class="mb-4">Upload Panoramas</h3>
            <p class="text-muted">Take 360° photos using any compatible camera and upload them directly to your Viewora dashboard.</p>
          </div>
          <div class="card text-center">
            <div style="background: var(--paper-dim); padding: 1.25rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border); height: 180px; display: flex; align-items: center; justify-content: center;">
              <img src="/images/home/white-label-editor.png" loading="lazy" alt="Tour Editor Interface" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 0.25rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));" />
            </div>
            <div style="background: var(--bg-surface-alt); width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 1.25rem; font-weight: bold; color: var(--primary);">2</div>
            <h3 class="mb-4">Connect Rooms</h3>
            <p class="text-muted">Use our intuitive visual editor to link rooms together, creating a seamless walkthrough experience.</p>
          </div>
          <div class="card text-center">
            <div style="background: var(--paper-dim); padding: 1.25rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border); height: 180px; display: flex; align-items: center; justify-content: center;">
              <img src="/images/home/tiny-planet-vr.png" loading="lazy" alt="VR 360 Tiny Planet View" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 0.25rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));" />
            </div>
            <div style="background: var(--bg-surface-alt); width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 1.25rem; font-weight: bold; color: var(--primary);">3</div>
            <h3 class="mb-4">Publish & Share</h3>
            <p class="text-muted">Get a shareable link instantly. Embed on your website, add to Airbnb, or share on social media.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Industry Use Cases (FeaturesSection) -->
    <FeaturesSection />

    <!-- Platform Features -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">Everything You Need to Sell Properties Faster</h2>
          <p class="section-subtitle">Professional-grade tools that used to cost thousands — now available to everyone.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
          <div class="card" style="display: flex; gap: 1rem; align-items: flex-start;">
            <div style="font-size: 1.75rem; flex-shrink: 0;">🧭</div>
            <div>
              <h4 class="font-bold mb-2">Hotspot Navigation</h4>
              <p class="text-muted text-sm">Place clickable hotspots to guide viewers from room to room with smooth transitions.</p>
            </div>
          </div>
          <div class="card" style="display: flex; gap: 1rem; align-items: flex-start;">
            <div style="font-size: 1.75rem; flex-shrink: 0;">📱</div>
            <div>
              <h4 class="font-bold mb-2">Mobile & Gyroscope</h4>
              <p class="text-muted text-sm">Tours automatically scale and use gyroscopic sensors for immersive navigation on iOS and Android.</p>
            </div>
          </div>
          <div class="card" style="display: flex; gap: 1rem; align-items: flex-start;">
            <div style="font-size: 1.75rem; flex-shrink: 0;">🎨</div>
            <div>
              <h4 class="font-bold mb-2">White-Label & Branding</h4>
              <p class="text-muted text-sm">Remove Viewora branding and replace with your own agency logo for a fully branded experience.</p>
            </div>
          </div>
          <div class="card" style="display: flex; gap: 1rem; align-items: flex-start;">
            <div style="font-size: 1.75rem; flex-shrink: 0;">📋</div>
            <div>
              <h4 class="font-bold mb-2">Lead Capture Forms</h4>
              <p class="text-muted text-sm">Collect buyer and renter enquiries directly inside the tour — turn viewers into leads automatically.</p>
            </div>
          </div>
          <div class="card" style="display: flex; gap: 1rem; align-items: flex-start;">
            <div style="font-size: 1.75rem; flex-shrink: 0;">🔗</div>
            <div>
              <h4 class="font-bold mb-2">Instant Public Link</h4>
              <p class="text-muted text-sm">No app needed for viewers. Share a simple URL via WhatsApp, email, or social media — it just works.</p>
            </div>
          </div>
          <div class="card" style="display: flex; gap: 1rem; align-items: flex-start;">
            <div style="font-size: 1.75rem; flex-shrink: 0;">🖼️</div>
            <div>
              <h4 class="font-bold mb-2">8K High-Resolution</h4>
              <p class="text-muted text-sm">Upload multi-megapixel panoramas without quality loss. Every tile, fixture, and finish stays crystal clear.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="section section-bg">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">Property Professionals Love Viewora</h2>
          <p class="section-subtitle">Join hundreds of real estate agents, hosts, and developers growing their business with virtual tours.</p>
        </div>
        <div class="grid-3">
          <div class="card">
            <div style="display: flex; gap: 0.25rem; margin-bottom: 1rem;">
              <span style="color: #f59e0b;">★★★★★</span>
            </div>
            <p class="text-muted" style="line-height: 1.7; margin-bottom: 1.5rem;">"Since adding Viewora tours to my listings, I've had 40% fewer calls asking about the layout. Buyers come pre-qualified and ready to make an offer."</p>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.9rem;">SN</div>
              <div>
                <div class="font-bold" style="font-size: 0.9rem;">Sarah Ngugi</div>
                <div class="text-muted" style="font-size: 0.8rem;">Real Estate Agent, Nairobi</div>
              </div>
            </div>
          </div>
          <div class="card" style="border: 2px solid var(--primary);">
            <div style="display: flex; gap: 0.25rem; margin-bottom: 1rem;">
              <span style="color: #f59e0b;">★★★★★</span>
            </div>
            <p class="text-muted" style="line-height: 1.7; margin-bottom: 1.5rem;">"My Airbnb bookings went up the week I added a virtual tour to my listing. Guests feel like they already know the place before they arrive."</p>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.9rem;">JO</div>
              <div>
                <div class="font-bold" style="font-size: 0.9rem;">James Omondi</div>
                <div class="text-muted" style="font-size: 0.8rem;">Airbnb Superhost, Mombasa</div>
              </div>
            </div>
          </div>
          <div class="card">
            <div style="display: flex; gap: 0.25rem; margin-bottom: 1rem;">
              <span style="color: #f59e0b;">★★★★★</span>
            </div>
            <p class="text-muted" style="line-height: 1.7; margin-bottom: 1.5rem;">"We use Viewora to show off-plan apartments to international investors. The white-label feature keeps our brand front and center. Absolutely worth it."</p>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.9rem;">AK</div>
              <div>
                <div class="font-bold" style="font-size: 0.9rem;">Amina Kamau</div>
                <div class="text-muted" style="font-size: 0.8rem;">Property Developer, Kampala</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Who It's For -->
    <section class="section">
      <div class="container grid-2" style="align-items: center;">
        <div style="position: relative;">
          <!-- blueprint subtle backdrop -->
          <div style="position: absolute; inset: -2rem; background: radial-gradient(circle, var(--accent-dim) 0%, transparent 70%); z-index: 0; pointer-events: none;"></div>
          <img src="/images/home/cross-platform-hero.png" alt="Viewora on all devices" class="img-fluid" style="width: 100%; position: relative; z-index: 1; transform: scale(1.1);" />
        </div>
        <div>
          <h2 class="section-title">Built for Property Professionals</h2>
          <div style="display: flex; flex-direction: column; gap: 1.5rem; margin-top: 2rem;">
            <div style="display: flex; gap: 1rem;">
              <div style="color: var(--primary); flex-shrink: 0;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>
              <div>
                <h4 class="font-bold mb-1">Airbnb Hosts</h4>
                <p class="text-muted text-sm">Boost listing credibility and reduce guest queries about layout.</p>
              </div>
            </div>
            <div style="display: flex; gap: 1rem;">
              <div style="color: var(--primary); flex-shrink: 0;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg></div>
              <div>
                <h4 class="font-bold mb-1">Real Estate Agents</h4>
                <p class="text-muted text-sm">Pre-qualify buyers and save time on unnecessary physical viewings.</p>
              </div>
            </div>
            <div style="display: flex; gap: 1rem;">
              <div style="color: var(--primary); flex-shrink: 0;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg></div>
              <div>
                <h4 class="font-bold mb-1">Property Developers</h4>
                <p class="text-muted text-sm">Showcase show houses and model layouts to off-plan investors.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section style="background: var(--ink); padding: 6rem 0; text-align: center; border-top: 1px solid var(--border-dark); position: relative; overflow: hidden;">
      <!-- blueprint grid overlay for dark section -->
      <div style="position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none;"></div>
      <div class="container" style="max-width: 650px; position: relative;">
        <div class="mono" style="color: var(--accent); margin-bottom: 1.25rem;">↗ Start today</div>
        <h2 style="font-size: 3rem; font-weight: 900; color: var(--paper); margin-bottom: 1rem; letter-spacing: -0.04em; line-height: 1.0;">Ready to Elevate<br>Your Properties?</h2>
        <p style="color: #6b7280; font-size: 1.05rem; margin-bottom: 3rem; line-height: 1.7;">Join the growing community of professionals closing more deals with Viewora. Your first tour is on us.</p>
        <NuxtLink to="/register" class="btn btn-primary btn-lg btn-float">
          Start Your Free Tour Now →
        </NuxtLink>
        <p style="color: #4b5563; font-size: 0.8rem; margin-top: 1.5rem; font-family: var(--font-mono); letter-spacing: 0.04em;">✓ No credit card required &nbsp; ✓ Free forever plan &nbsp; ✓ Live in 5 min</p>
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