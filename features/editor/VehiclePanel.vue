<template>
  <div ref="rootEl" class="vp" :class="{ 'is-preview': preview, 'has-side': !preview && !!current }" @dragover.prevent @drop.prevent="onRootDrop">
    <input ref="oneInput" type="file" accept="image/jpeg,image/png,image/webp" class="vp-hidden" @change="onOne" />
    <input ref="manyInput" type="file" accept="image/jpeg,image/png,image/webp" multiple class="vp-hidden" @change="onMany" />
    <input ref="videoInput" type="file" accept="video/*" class="vp-hidden" @change="onVideoPicked" />
    <input ref="videoCamInput" type="file" accept="video/*" capture="environment" class="vp-hidden" @change="onVideoPicked" />

    <!-- Tools: a floating glass rail, the same style as the 360° editor's. On phones, one row. -->
    <nav v-if="!preview" class="vp-rail editor-glass" aria-label="Exterior tools">
      <button class="vp-tool" :disabled="busy" title="Turn a walk-around video into a smooth spin" @click="openSpinModal">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/></svg>
        <span>Video</span>
      </button>
      <button class="vp-tool" :disabled="busy || views.length >= VEHICLE_MAX_VIEWS" title="Add photos of the outside" @click="manyInput?.click()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>
        <span>Photos</span>
      </button>
      <span class="vp-rail__div" aria-hidden="true" />
      <button class="vp-tool" :class="{ 'is-on': placing }" :disabled="!current" :aria-pressed="placing" title="Pin a feature or a mark (H)" @click="togglePlacing">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
        <span>{{ placing ? 'Tap car' : 'Hotspot' }}</span>
      </button>
      <button class="vp-tool" :disabled="!current || aiBusy === 'hotspots'" title="AI suggests hotspots for this frame. You check them first." @click="runAiHotspots">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z"/></svg>
        <span>{{ aiBusy === 'hotspots' ? 'Looking' : 'Suggest' }}</span>
      </button>
      <button v-if="!isSpin" class="vp-tool" :disabled="views.length < 2 || aiBusy === 'sort'" title="AI puts your photos in walk-around order" @click="runAiSort">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h13M3 12h9M3 17h5M17 10v10M14 17l3 3 3-3"/></svg>
        <span>{{ aiBusy === 'sort' ? 'Sorting' : 'Sort' }}</span>
      </button>
    </nav>

    <!-- The car -->
    <section class="vp-stage" aria-label="The car">
      <p v-if="setupError" class="vp-alert vp-alert--error" role="alert">
        <span class="vp-alert__t">{{ setupError }}</span>
        <button class="vp-linkbtn" @click="init">Try again</button>
      </p>
      <p v-else-if="notice" class="vp-alert" role="status">
        <span class="vp-alert__t">{{ notice }}</span>
        <button v-if="noticeAction" class="vp-linkbtn" @click="noticeAction.run()">{{ noticeAction.label }}</button>
        <button class="vp-linkbtn" aria-label="Dismiss" @click="clearNotice">OK</button>
      </p>

      <button v-if="preview" class="vp-back-edit editor-glass" @click="togglePreview">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
        Back to editing
      </button>

      <div class="vp-canvas">
        <div v-if="!loaded && !setupError" class="vp-skeleton" aria-busy="true" aria-label="Loading the car"><span class="vp-spin" /></div>

        <div v-else-if="!views.length" class="vp-empty">
          <template v-if="spins.length > 1 && activeSpinId !== spins[0]?.id">
            <p class="vp-empty__title">{{ activeSpin?.title }}</p>
            <p class="vp-empty__text">Set the car up this way, then walk around it once more, the same as the first spin.</p>
          </template>
          <template v-else>
            <p class="vp-empty__title">Walk around the car</p>
            <p class="vp-empty__text">Record one slow walk around it. We turn the video into a spin buyers can drag.</p>
          </template>
          <div class="vp-row vp-row--center">
            <button class="vp-btn vp-btn--primary" :disabled="busy" @click="openSpinModal">Use a video</button>
            <button class="vp-btn" :disabled="busy" @click="manyInput?.click()">Add photos</button>
          </div>
        </div>

        <VehicleSpinViewer
          v-else
          :views="views"
          :index="viewerIndex"
          :fit="preview ? 'auto' : 'contain'"
          :start-angle="activeSpin?.start_angle ?? 0"
          :editable="!preview"
          :placing="placing && !preview"
          :hide-bar="!preview"
          :selected-hotspot-id="selectedHotspotId"
          @update:index="onViewerIndex"
          @place="onPlace"
          @select-hotspot="onSelectHotspot"
          @move-hotspot="onMoveHotspot"
        />
      </div>
    </section>

    <!-- Dock: the spins, then every frame in walk-around order. Drop a photo on a slot to fill it, drag one onto another to swap. -->
    <div v-if="!preview" class="vp-dockbar editor-glass">
      <div v-if="loaded && (spins.length > 1 || views.length)" class="vp-spins" role="tablist" aria-label="Spins of this car">
        <button
          v-for="sp in spinChips"
          :key="sp.id"
          type="button"
          role="tab"
          class="vp-spinchip"
          :class="{ 'is-on': sp.id === activeSpinId, 'is-row': !!sp.row_of }"
          :aria-selected="sp.id === activeSpinId"
          :aria-label="sp.row_of ? `${sp.title}, camera ${(sp.elevation ?? 0) > 0 ? 'higher' : 'lower'}` : undefined"
          :disabled="busy && sp.id !== activeSpinId"
          @click="onSelectSpin(sp.id)"
        >
          <svg v-if="sp.row_of" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path v-if="(sp.elevation ?? 0) > 0" d="M12 19V5M6 11l6-6 6 6"/><path v-else d="M12 5v14M6 13l6 6 6-6"/></svg>
          {{ sp.title }} <span class="vp-spinchip__n vp-num">{{ frameCounts[sp.id] || 0 }}</span>
        </button>
        <button
          type="button"
          class="vp-spinchip vp-spinchip--add"
          :disabled="busy || !spinsReady || spins.length >= VEHICLE_MAX_SPINS"
          :title="!spinsReady ? 'Needs a one-off database update (migration-vehicle-spins.sql)' : spins.length >= VEHICLE_MAX_SPINS ? `Up to ${VEHICLE_MAX_SPINS} spins` : 'Another walk around the car: roof down, doors open...'"
          @click="openAddSpin"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          Spin
        </button>
      </div>

      <ul class="vp-dock" aria-label="Frames">
        <template v-if="!loaded">
          <li v-for="n in 8" :key="n" class="vp-dock__item"><div class="vp-thumb vp-thumb--skeleton" /></li>
        </template>
        <li v-for="item in dockItems" v-else :key="item.key" class="vp-dock__item">
          <button
            v-if="item.view"
            class="vp-thumb"
            :class="{ 'is-active': item.view.id === selectedId, 'is-dragover': dragOverKey === item.key }"
            draggable="true"
            :aria-label="`${viewLabel(item.view)}, ${item.view.angle} degrees${(item.view.hotspots?.length ?? 0) ? ', ' + item.view.hotspots!.length + ' hotspots' : ''}`"
            :aria-current="item.view.id === selectedId ? 'true' : undefined"
            @click="selectView(item.view.id)"
            @dragstart="onDragStart($event, item.view.id)"
            @dragend="dragOverKey = ''"
            @dragover.prevent="dragOverKey = item.key"
            @dragleave="dragOverKey = ''"
            @drop.prevent.stop="onDropOn($event, item)"
          >
            <img :src="item.view.image_url" :alt="''" loading="lazy" draggable="false" />
            <span v-if="pendingAngles.has(item.view.angle)" class="vp-thumb__busy"><span class="vp-spin vp-spin--sm" /></span>
            <span v-if="item.view.hotspots?.length" class="vp-thumb__count vp-num">{{ item.view.hotspots.length }}</span>
            <span class="vp-thumb__label vp-num">{{ isSpin ? `${Math.round(item.view.angle)}°` : viewLabel(item.view) }}</span>
          </button>
          <button
            v-else
            class="vp-thumb vp-thumb--empty"
            :class="{ 'is-dragover': dragOverKey === item.key }"
            :disabled="busy"
            :aria-label="`Add ${item.slot!.label} photo`"
            @click="pick(item.slot!.angle)"
            @dragover.prevent="dragOverKey = item.key"
            @dragleave="dragOverKey = ''"
            @drop.prevent.stop="onDropOn($event, item)"
          >
            <span v-if="pendingAngles.has(item.slot!.angle)" class="vp-spin vp-spin--sm" />
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            <span class="vp-thumb__label">{{ item.slot!.label }}</span>
          </button>
        </li>
      </ul>
    </div>

    <!-- The selected frame: only what can be changed on it. -->
    <aside v-if="!preview && current" class="vp-side editor-glass" aria-label="Selected frame">
      <section class="vp-sec">
        <div class="vp-sec__head">
          <h2 class="vp-h2">{{ viewLabel(current) }}</h2>
          <span class="vp-muted vp-num">{{ Math.round(current.angle) }}°</span>
        </div>
        <template v-if="!isSpin">
          <label class="vp-label" for="vp-pos">Position</label>
          <select id="vp-pos" class="vp-select" :value="current.angle" :disabled="busy" @change="onPositionChange(Number(($event.target as HTMLSelectElement).value))">
            <option v-for="o in positionOptions" :key="o.angle" :value="o.angle">{{ o.text }}</option>
          </select>
        </template>
        <div class="vp-row">
          <button v-if="activeSpin && spinsReady" class="vp-btn" :disabled="busy || current.angle === activeSpin.start_angle" :title="current.angle === activeSpin.start_angle ? 'Buyers start on this frame' : 'Buyers see this frame first'" @click="setStartFrame">
            {{ current.angle === activeSpin.start_angle ? 'First frame' : 'Make first' }}
          </button>
          <button v-if="isSpin" class="vp-btn" :disabled="busy" title="The car turns the wrong way, or the sides are named wrong" @click="flipSpinDirection">Flip direction</button>
          <button v-if="!isSpin" class="vp-btn" :disabled="busy" @click="pick(current.angle, current.id)">Replace</button>
          <button class="vp-btn vp-btn--danger" :disabled="busy" @click="confirmRemove">{{ removeArmed ? 'Tap again' : 'Remove' }}</button>
        </div>
      </section>

      <!-- Studio finish: one grade for every frame of the spin (done on the server, originals kept). -->
      <section v-if="views.length && finish.available.value" class="vp-sec" aria-label="Studio finish">
        <div class="vp-sec__head">
          <h2 class="vp-h2">Studio finish</h2>
          <span class="vp-muted vp-num" aria-live="polite">{{ finishRunning ? progressText(finish.status.value?.progress) : '' }}</span>
        </div>
        <p class="vp-muted">Cleaner light and richer paint, matched on every frame so the car doesn't flicker as it turns. Your recording is kept.</p>
        <fieldset class="vp-seg vp-seg--3" aria-label="Look of this spin">
          <button
            v-for="o in SPIN_LOOK_OPTIONS"
            :key="o.look"
            type="button"
            class="vp-seg__btn"
            :class="{ 'is-on': finishLook === o.look, 'is-pending': finishRunning && finish.status.value?.progress?.look === o.look }"
            :aria-pressed="finishLook === o.look"
            :disabled="finishRunning || finish.asking.value || !finish.status.value"
            :title="o.hint"
            @click="applyFinish(o.look)"
          >{{ o.label }}</button>
        </fieldset>
        <p v-if="!finishRunning && finishLook !== 'original' && finish.status.value?.behind" class="vp-muted">
          {{ finish.status.value.behind }} {{ finish.status.value.behind === 1 ? 'frame was' : 'frames were' }} added after the finish.
          <button class="vp-linkbtn" @click="applyFinish(finishLook, true)">Finish them too</button>
        </p>
        <p v-if="finishFailed" class="vp-error" role="alert">{{ finishFailed }}</p>
        <figure v-if="current && lookOfUrl(current.image_url) !== 'original'" class="vp-compare" :style="{ '--split': `${compareSplit}%` }">
          <img :src="current.image_url" alt="" class="vp-compare__img" />
          <img :src="originalUrl(current.image_url)" alt="" class="vp-compare__img vp-compare__before" />
          <span class="vp-compare__tag" aria-hidden="true">Before</span>
          <span class="vp-compare__tag vp-compare__tag--r" aria-hidden="true">After</span>
          <figcaption class="vp-hidden-text">This frame before and after the studio finish</figcaption>
        </figure>
        <input
          v-if="current && lookOfUrl(current.image_url) !== 'original'"
          v-model.number="compareSplit"
          type="range" min="0" max="100" step="1"
          class="vp-compare__range"
          aria-label="Before and after: drag to compare"
        />
      </section>

      <section class="vp-sec">
        <div class="vp-sec__head">
          <h2 class="vp-h2">Hotspots</h2>
          <span class="vp-muted vp-num">{{ currentHotspots.length }} / {{ MAX_HOTSPOTS_PER_VIEW }}</span>
        </div>
        <p v-if="!currentHotspots.length && !aiDrafts.length" class="vp-muted">Tap <strong>Hotspot</strong>, then the part of the car: wheels, roof rails, a scratch.</p>
        <ul v-if="currentHotspots.length" class="vp-hlist">
          <li v-for="h in currentHotspots" :key="h.id">
            <button class="vp-hitem" :class="{ 'is-active': h.id === selectedHotspotId }" @click="selectedHotspotId = h.id">
              <span class="vp-kind" :class="`vp-kind--${h.kind}`" aria-hidden="true">{{ h.kind === 'damage' ? '!' : h.kind === 'link' ? '↗' : h.kind === 'info' ? 'i' : '+' }}</span>
              <span class="vp-hitem__t">{{ h.title }}</span>
              <span class="vp-hitem__k">{{ hotspotKindLabel(h.kind) }}</span>
            </button>
          </li>
        </ul>

        <!-- AI suggestions: review, then add. Nothing is saved until you do. -->
        <div v-if="aiDrafts.length" class="vp-drafts">
          <p class="vp-label">Suggested. Check them against the photo.</p>
          <ul class="vp-hlist">
            <li v-for="(d, i) in aiDrafts" :key="i" class="vp-draft">
              <label class="vp-check">
                <input v-model="d.on" type="checkbox" />
                <span><strong>{{ d.title }}</strong> <span class="vp-muted">· {{ hotspotKindLabel(d.kind) }}</span><br /><span class="vp-muted">{{ d.body }}</span></span>
              </label>
            </li>
          </ul>
          <div class="vp-row">
            <button class="vp-btn vp-btn--primary" :disabled="busy || !aiDrafts.some(d => d.on)" @click="addDrafts">Add selected</button>
            <button class="vp-btn" @click="aiDrafts = []">Discard</button>
          </div>
        </div>
      </section>

      <section v-if="selectedHotspot" class="vp-sec" aria-label="Edit hotspot">
        <div class="vp-sec__head">
          <h2 class="vp-h2">Edit hotspot</h2>
          <span class="vp-muted" aria-live="polite">{{ saveState }}</span>
        </div>
        <p v-if="trackNote" class="vp-muted vp-track" aria-live="polite">{{ trackNote }}</p>
        <fieldset class="vp-seg" aria-label="Hotspot type">
          <button v-for="k in HOTSPOT_KINDS" :key="k.kind" type="button" class="vp-seg__btn" :class="{ 'is-on': selectedHotspot.kind === k.kind }" :aria-pressed="selectedHotspot.kind === k.kind" :title="k.hint" @click="editHotspot({ kind: k.kind })">{{ k.label }}</button>
        </fieldset>

        <label class="vp-label" for="vp-h-title">Title</label>
        <input id="vp-h-title" ref="titleInput" class="vp-input" maxlength="60" :value="selectedHotspot.title" @input="editHotspot({ title: ($event.target as HTMLInputElement).value })" />

        <label class="vp-label" for="vp-h-body">Note <span class="vp-muted">optional</span></label>
        <textarea id="vp-h-body" class="vp-input vp-textarea" maxlength="400" rows="3" :value="selectedHotspot.body ?? ''" @input="editHotspot({ body: ($event.target as HTMLTextAreaElement).value })" />

        <label class="vp-label" for="vp-h-url">Link <span class="vp-muted">optional</span></label>
        <input id="vp-h-url" class="vp-input" type="url" inputmode="url" placeholder="https://" :value="selectedHotspot.url ?? ''" @input="editHotspot({ url: ($event.target as HTMLInputElement).value })" />
        <p v-if="urlError" class="vp-error">{{ urlError }}</p>

        <span class="vp-label" id="vp-h-photo">Photo <span class="vp-muted">optional · opens from the pin</span></span>
        <div v-if="selectedHotspot.image_url" class="vp-hphoto">
          <img :src="selectedHotspot.image_url" alt="" />
          <div class="vp-row">
            <button class="vp-btn" :disabled="photoBusy" @click="pickHotspotPhoto">{{ photoBusy ? 'Uploading…' : 'Replace' }}</button>
            <button class="vp-btn" :disabled="photoBusy" @click="editHotspot({ image_url: null })">Remove</button>
          </div>
        </div>
        <button v-else class="vp-btn vp-hphoto-add" aria-describedby="vp-h-photo" :disabled="photoBusy" @click="pickHotspotPhoto">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-9 8"/></svg>
          {{ photoBusy ? 'Uploading…' : 'Add a photo' }}
        </button>
        <input ref="hotspotPhotoInput" type="file" accept="image/jpeg,image/png,image/webp" class="vp-hidden" @change="onHotspotPhoto" />

        <div class="vp-row">
          <button class="vp-btn vp-btn--danger" @click="removeSelectedHotspot">Delete</button>
          <button class="vp-btn" @click="selectedHotspotId = null">Done</button>
        </div>
      </section>

      <section v-if="activeSpin && spinsReady && spins.length > 1" class="vp-sec" aria-label="This spin">
        <label class="vp-label" for="vp-spin-title">Spin name</label>
        <input
          id="vp-spin-title"
          class="vp-input"
          maxlength="40"
          :value="activeSpin.title"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
          @change="renameSpin(($event.target as HTMLInputElement).value)"
        />
        <div class="vp-row">
          <button class="vp-btn vp-btn--danger" :disabled="busy" @click="confirmRemoveSpin">
            {{ removeSpinArmed ? 'Tap again to delete' : 'Delete spin' }}
          </button>
        </div>
      </section>

      <p v-if="gapText" class="vp-gap">{{ gapText }}</p>
    </aside>

    <!-- Smooth spin from a video -->
    <div v-if="spinOpen" class="vp-modal" role="dialog" aria-modal="true" aria-labelledby="vp-spin-title" @keydown.esc="closeSpinModal">
      <div class="vp-modal__box">
        <h2 id="vp-spin-title" class="vp-h2">Smooth spin from a video<template v-if="spins.length > 1">: {{ activeSpin?.title }}</template></h2>

        <template v-if="!spinRun">
          <ol class="vp-steps">
            <li>Park with room to walk all the way round.</li>
            <li>Hold your phone sideways and stand back far enough to see the whole car.</li>
            <li>Start recording at the front of the car.</li>
            <li>Walk slowly once around it, same distance, car in the middle of the frame.</li>
            <li>Stop when you are back at the front. 20 to 30 seconds is ideal.</li>
          </ol>

          <fieldset class="vp-fieldset">
            <legend class="vp-label">Which side did you walk to first?</legend>
            <label class="vp-radio"><input v-model="spinRightFirst" type="radio" :value="true" /> The car's right side (driver's side on a Kenyan car)</label>
            <label class="vp-radio"><input v-model="spinRightFirst" type="radio" :value="false" /> The car's left side (passenger side)</label>
            <p class="vp-hint">Not sure? Pick either. If the car turns the wrong way afterwards, tap <strong>Flip direction</strong>.</p>
          </fieldset>

          <fieldset class="vp-fieldset">
            <legend class="vp-label">Smoothness</legend>
            <label class="vp-radio"><input v-model.number="spinCount" type="radio" :value="64" /> 64 frames: smoothest, studio quality (recommended)</label>
            <label class="vp-radio"><input v-model.number="spinCount" type="radio" :value="36" /> 36 frames: smooth, loads faster on slow data</label>
          </fieldset>

          <p v-if="views.length" class="vp-gap">This replaces your {{ views.length }} current photo{{ views.length === 1 ? '' : 's' }} and their hotspots.</p>
          <p v-if="spinError" class="vp-error" role="alert">{{ spinError }}</p>

          <div class="vp-row">
            <button class="vp-btn vp-btn--primary" @click="videoCamInput?.click()">Record video</button>
            <button class="vp-btn" @click="videoInput?.click()">Choose a video</button>
            <button class="vp-btn" @click="closeSpinModal">Cancel</button>
          </div>
        </template>

        <template v-else>
          <p class="vp-muted" aria-live="polite">{{ SPIN_PHASE_TEXT[spinRun.phase] }}: <span class="vp-num">{{ spinRun.done }} of {{ spinRun.total }}</span></p>
          <div class="vp-meter" role="progressbar" :aria-valuenow="spinRun.done" :aria-valuemax="spinRun.total" aria-label="Spin progress"><span :style="{ width: (spinRun.total ? (spinRun.done / spinRun.total) * 100 : 0) + '%' }" /></div>
          <p class="vp-hint">Keep this tab open. It takes a minute or two (up to four on an older phone).</p>
          <div class="vp-row"><button class="vp-btn" @click="cancelSpin">Cancel</button></div>
        </template>
      </div>
    </div>

    <!-- Add a spin -->
    <div v-if="addSpinOpen" class="vp-modal" role="dialog" aria-modal="true" aria-labelledby="vp-addspin-title" @keydown.esc="addSpinOpen = false">
      <div class="vp-modal__box">
        <h2 id="vp-addspin-title" class="vp-h2">Add a spin</h2>
        <p class="vp-muted">Another walk around the same car. What is different this time?</p>
        <fieldset class="vp-seg" aria-label="What is different">
          <button type="button" class="vp-seg__btn" :class="{ 'is-on': newSpinKind === 'look' }" :aria-pressed="newSpinKind === 'look'" @click="setNewSpinKind('look')">The car (roof, doors…)</button>
          <button type="button" class="vp-seg__btn" :class="{ 'is-on': newSpinKind === 'height' }" :aria-pressed="newSpinKind === 'height'" :disabled="!heightParents.length" @click="setNewSpinKind('height')">Camera height</button>
        </fieldset>
        <template v-if="newSpinKind === 'look'">
          <p class="vp-hint">Buyers switch between spins with chips in the tour.</p>
          <div class="vp-presets">
            <button v-for="pr in spinPresets" :key="pr" type="button" class="vp-spinchip" :class="{ 'is-on': newSpinTitle === pr }" @click="newSpinTitle = pr">{{ pr }}</button>
          </div>
        </template>
        <template v-else>
          <p class="vp-hint">Same car, same walk, the camera higher or lower. Buyers drag up and down to change height at the same angle.</p>
          <label class="vp-label" for="vp-rowof">Height of</label>
          <select id="vp-rowof" v-model="newRowOf" class="vp-input" @change="suggestRowTitle">
            <option v-for="sp in heightParents" :key="sp.id" :value="sp.id">{{ sp.title }}</option>
          </select>
          <div class="vp-presets">
            <button v-for="h in SPIN_HEIGHTS" :key="h.elevation" type="button" class="vp-spinchip" :class="{ 'is-on': newElevation === h.elevation }" :title="h.hint" @click="newElevation = h.elevation; suggestRowTitle()">{{ h.label }}</button>
          </div>
          <p class="vp-hint">{{ SPIN_HEIGHTS.find(h => h.elevation === newElevation)?.hint }}</p>
        </template>
        <label class="vp-label" for="vp-newspin">Name</label>
        <input id="vp-newspin" v-model="newSpinTitle" class="vp-input" maxlength="40" placeholder="e.g. Roof down" @keydown.enter="createSpin" />
        <div class="vp-row">
          <button class="vp-btn vp-btn--primary" :disabled="busy || !newSpinTitle.trim()" @click="createSpin">Add spin, then record it</button>
          <button class="vp-btn" @click="addSpinOpen = false">Cancel</button>
        </div>
      </div>
    </div>

    <!-- AI sort review -->
    <div v-if="sortReview" class="vp-modal" role="dialog" aria-modal="true" aria-label="Review AI sort" @keydown.esc="sortReview = null">
      <div class="vp-modal__box">
        <h2 class="vp-h2">AI sorted your photos</h2>
        <p class="vp-muted">
          {{ sortChanges.length ? `${sortChanges.length} photo${sortChanges.length === 1 ? '' : 's'} would move. Check them, then apply.` : 'Everything is already in the right place.' }}
        </p>
        <ul class="vp-sortlist">
          <li v-for="r in sortReview" :key="r.id" class="vp-sortrow">
            <img :src="r.image_url" alt="" />
            <span class="vp-sortrow__t">
              <template v-if="r.suggested === null">Not an outside shot. Left as is.</template>
              <template v-else-if="r.suggested === r.current"><strong>{{ r.name }}</strong> · stays</template>
              <template v-else><strong>{{ r.name }}</strong> · {{ r.current }}° → {{ r.suggested }}°</template>
            </span>
          </li>
        </ul>
        <div class="vp-row">
          <button class="vp-btn vp-btn--primary" :disabled="busy || !sortChanges.length" @click="applySort">Apply {{ sortChanges.length }} change{{ sortChanges.length === 1 ? '' : 's' }}</button>
          <button class="vp-btn" @click="sortReview = null">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import VehicleSpinViewer from '~/features/viewer/car/VehicleSpinViewer.vue'
import { useCarSetup } from '~/features/vehicle/useCarSetup'
import { useVehicleViews, type AngleSuggestion } from '~/features/vehicle/useVehicleViews'
import { followPin } from '~/features/vehicle/pinTracker'
import { TRACK_VERSION } from '~/features/vehicle/pinTrack'
import {
  VEHICLE_SLOTS, VEHICLE_MAX_VIEWS, MAX_HOTSPOTS_PER_VIEW, HOTSPOT_KINDS, VEHICLE_MAX_SPINS, SPIN_PRESETS, SPIN_HEIGHTS,
  viewLabel, nearestSlot, hotspotKindLabel, slotGaps, swapAngles, isSpinSet, spinAngles,
  type VehicleView, type VehicleSlot, type VehicleHotspotKind,
} from '~/shared/utils/vehicleViews'
import { extractSpinFrames, validateSpinVideo, type SpinPhase } from '~/shared/utils/videoFrames'
import { useSpinFinish } from '~/features/vehicle/useSpinFinish'
import { SPIN_LOOK_OPTIONS, isRunning, lookOfUrl, originalUrl, progressText, type SpinLook } from '~/shared/utils/spinFinish'
import { preloadCarDetector, releaseCarDetector } from '~/shared/utils/carDetector'

const props = defineProps<{ spaceId: string }>()

const {
  views, loaded, load, addView, removeView, replaceView, applyAngles,
  createHotspot, updateHotspot, deleteHotspot, uploadHotspotPhoto, aiSortSuggestions, aiHotspotSuggestions,
  spins, spinsReady, activeSpinId, activeSpin, frameCounts, selectSpin, addSpin, updateSpin, removeSpin,
} = useVehicleViews(props.spaceId)

const rootEl = ref<HTMLElement | null>(null)
const oneInput = ref<HTMLInputElement | null>(null)
const manyInput = ref<HTMLInputElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)

const setupError = ref('')
const busy = ref(false)
const pendingAngles = ref<Set<number>>(new Set())
const preview = ref(false)
const placing = ref(false)
const selectedId = ref<string | null>(null)
const selectedHotspotId = ref<string | null>(null)
const dragOverKey = ref('')
const removeArmed = ref(false)
let removeTimer: ReturnType<typeof setTimeout> | undefined

// ── Notices ──
const notice = ref('')
const noticeAction = ref<{ label: string; run: () => void } | null>(null)
function setNotice(text: string, action?: { label: string; run: () => void }) { notice.value = text; noticeAction.value = action ?? null }
function clearNotice() { notice.value = ''; noticeAction.value = null }

function errMsg(e: any, fallback: string) {
  return e?.data?.statusMessage || e?.response?._data?.statusMessage || e?.message || fallback
}

// ── Load ──
async function init() {
  setupError.value = ''
  try {
    await load()
    if (!selectedId.value && views.value.length) selectedId.value = views.value[0].id
  } catch (e: any) {
    // The server says exactly what the database answered (missing table, stale schema cache...).
    const m = errMsg(e, '')
    setupError.value = m && !/^Failed to fetch$/i.test(m)
      ? m
      : 'Could not reach the server. Check your connection and try again.'
  }
}
onMounted(() => { init(); window.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); if (removeTimer) clearTimeout(removeTimer); releaseCarDetector() })

// ── Derived ──
const slotAngles = new Set(VEHICLE_SLOTS.map(s => s.angle))
const current = computed<VehicleView | null>(() => views.value.find(v => v.id === selectedId.value) ?? null)
const currentHotspots = computed(() => current.value?.hotspots ?? [])
const selectedHotspot = computed(() => currentHotspots.value.find(h => h.id === selectedHotspotId.value)
  ?? (selectedHotspotId.value ? findHotspot(selectedHotspotId.value)?.h ?? null : null))
const viewerIndex = computed(() => Math.max(0, views.value.findIndex(v => v.id === selectedId.value)))

// 12+ evenly spaced frames: a smooth spin, so the eight main angles are no longer a checklist.
const isSpin = computed(() => isSpinSet(views.value.length))

interface DockItem { key: string; angle: number; view?: VehicleView; slot?: VehicleSlot }
const dockItems = computed<DockItem[]>(() => {
  const items: DockItem[] = views.value.map(v => ({ key: v.id, angle: v.angle, view: v }))
  if (!isSpin.value) for (const s of VEHICLE_SLOTS) if (!views.value.some(v => v.angle === s.angle)) items.push({ key: `slot-${s.key}`, angle: s.angle, slot: s })
  return items.sort((a, b) => a.angle - b.angle || (a.view ? -1 : 1))
})

const positionOptions = computed(() => {
  const taken = new Map(views.value.map(v => [v.angle, v]))
  const out: Array<{ angle: number; text: string }> = []
  const seen = new Set<number>()
  const add = (angle: number) => {
    if (seen.has(angle)) return
    seen.add(angle)
    const t = taken.get(angle)
    const slot = VEHICLE_SLOTS.find(s => s.angle === angle)
    const name = slot ? slot.label : `${angle}° near ${nearestSlot(angle).label.toLowerCase()}`
    out.push({ angle, text: `${name}${t && t.id !== current.value?.id ? ' (swap with that photo)' : ''}` })
  }
  VEHICLE_SLOTS.forEach(s => add(s.angle))
  for (let a = 0; a < 360; a += 15) add(a)
  if (current.value) add(current.value.angle)
  return out.sort((x, y) => x.angle - y.angle)
})

const gapText = computed(() => {
  if (!loaded.value || !views.value.length) return ''
  const { missing, duplicates } = slotGaps(views.value)
  const bits: string[] = []
  if (missing.length && !isSpin.value) bits.push(`Still missing: ${missing.map(m => m.label.toLowerCase()).join(', ')}. The car still turns without them, just less smoothly.`)
  if (duplicates.length) bits.push(`Two photos share ${duplicates.map(d => `${d}°`).join(', ')}. Move one to a free position.`)
  return bits.join(' ')
})

// ── Selection / viewer sync ──
watch(views, (list) => {
  if (!list.length) { selectedId.value = null; return }
  if (!list.some(v => v.id === selectedId.value)) selectedId.value = list[0].id
})
function selectView(id: string) { selectedId.value = id; selectedHotspotId.value = null; removeArmed.value = false }
function onViewerIndex(i: number) {
  const v = views.value[i]
  if (v && v.id !== selectedId.value) { selectedId.value = v.id; selectedHotspotId.value = null; removeArmed.value = false }
}

// ── Busy wrapper ──
async function withBusy(angle: number | null, fn: () => Promise<unknown>, fail = 'Something went wrong') {
  busy.value = true
  if (angle !== null) pendingAngles.value = new Set(pendingAngles.value).add(angle)
  try {
    await fn()
    return true
  } catch (e: any) {
    const m = errMsg(e, fail)
    setNotice(`${m}. Nothing was lost; try again.`)
    toast.error(m)
    return false
  } finally {
    if (angle !== null) { const n = new Set(pendingAngles.value); n.delete(angle); pendingAngles.value = n }
    busy.value = false
  }
}

// ── Uploading ──
let pickAngle = 0
let pickReplaceId: string | undefined
function pick(angle: number, replaceId?: string) {
  pickAngle = angle
  pickReplaceId = replaceId
  if (oneInput.value) { oneInput.value.value = ''; oneInput.value.click() }
}

async function onOne(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  await uploadOne(file, pickAngle, pickReplaceId)
}

async function uploadOne(file: File, angle: number, replaceId?: string) {
  const ok = await withBusy(angle, async () => {
    if (replaceId) {
      await replaceView(replaceId, file)
    } else {
      const created = await addView(file, angle)
      selectedId.value = created.id
    }
  }, 'Upload failed')
  if (ok && replaceId) selectedId.value = views.value.find(v => v.angle === angle)?.id ?? selectedId.value
}

/** Free angles in the order new photos should take them: empty main slots first, then spare 15° steps. */
function freeAngles(): number[] {
  const used = new Set(views.value.map(v => v.angle))
  const main = VEHICLE_SLOTS.map(s => s.angle).filter(a => !used.has(a))
  const spare: number[] = []
  for (let a = 15; a < 360; a += 15) if (!slotAngles.has(a) && !used.has(a)) spare.push(a)
  return [...main, ...spare]
}

async function addMany(files: File[]) {
  const free = freeAngles()
  const room = Math.min(free.length, VEHICLE_MAX_VIEWS - views.value.length)
  const take = files.slice(0, room)
  if (files.length > take.length) setNotice(`Only room for ${take.length} more photo${take.length === 1 ? '' : 's'} (up to ${VEHICLE_MAX_VIEWS}). The rest were skipped.`)
  let added = 0
  for (let i = 0; i < take.length; i++) {
    const ok = await withBusy(free[i], async () => {
      const created = await addView(take[i], free[i])
      if (!selectedId.value || i === 0) selectedId.value = created.id
    }, 'Upload failed')
    if (!ok) break
    added++
  }
  if (added > 1 && views.value.length > 1) {
    setNotice(`Added ${added} photos in the order you picked them. Not in the right order?`, { label: 'Sort with AI', run: runAiSort })
  }
}

async function onMany(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  ;(e.target as HTMLInputElement).value = ''
  if (files.length) await addMany(files)
}

function imageFiles(dt: DataTransfer | null): File[] {
  return Array.from(dt?.files ?? []).filter(f => f.type.startsWith('image/'))
}

async function onRootDrop(e: DragEvent) {
  const files = imageFiles(e.dataTransfer)
  if (files.length) await addMany(files)
}

// ── Dock drag: drop a photo file on a slot, or drag one photo onto another to swap ──
function onDragStart(e: DragEvent, id: string) {
  e.dataTransfer?.setData('text/x-vehicle-view', id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

async function onDropOn(e: DragEvent, target: DockItem) {
  dragOverKey.value = ''
  const files = imageFiles(e.dataTransfer)
  if (files.length) {
    // A file dropped on a slot fills that slot (or replaces the photo there).
    await uploadOne(files[0], target.angle, target.view?.id)
    return
  }
  const fromId = e.dataTransfer?.getData('text/x-vehicle-view')
  const from = views.value.find(v => v.id === fromId)
  if (!from || from.angle === target.angle) return
  if (target.view) await moveTo(from, target.angle, target.view)
  else await moveTo(from, target.angle)
}

async function moveTo(view: VehicleView, angle: number, occupant?: VehicleView) {
  const items = (occupant ? swapAngles(view, occupant) : [{ id: view.id, angle }]).map(i => ({ ...i, label: null }))
  await withBusy(null, () => applyAngles(items), 'Could not move the photo')
}

function onPositionChange(angle: number) {
  const v = current.value
  if (!v || v.angle === angle) return
  const occupant = views.value.find(x => x.angle === angle && x.id !== v.id)
  moveTo(v, angle, occupant)
}

function confirmRemove() {
  const v = current.value
  if (!v) return
  if (!removeArmed.value) {
    removeArmed.value = true
    removeTimer = setTimeout(() => { removeArmed.value = false }, 4000)
    return
  }
  removeArmed.value = false
  withBusy(v.angle, () => removeView(v.id), 'Could not remove the photo')
}

// ── Hotspots ──
function togglePlacing() {
  if (!current.value || preview.value) return
  placing.value = !placing.value
  if (placing.value) selectedHotspotId.value = null
}
function togglePreview() {
  preview.value = !preview.value
  placing.value = false
  selectedHotspotId.value = null
}

const DEFAULT_TITLES: Record<VehicleHotspotKind, string> = { feature: 'New feature', damage: 'Mark', info: 'Note', link: 'Link' }

async function onPlace({ viewId, x, y }: { viewId: string; x: number; y: number }) {
  placing.value = false
  const v = views.value.find(i => i.id === viewId)
  if ((v?.hotspots?.length ?? 0) >= MAX_HOTSPOTS_PER_VIEW) { setNotice(`Up to ${MAX_HOTSPOTS_PER_VIEW} hotspots per photo.`); return }
  // A pin already shows here (placed on this frame, or followed onto it): open that one, never a twin.
  const near = pinNear(viewId, x, y)
  if (near) {
    selectedHotspotId.value = near.id
    setNotice(`“${near.title || 'This pin'}” is already here. Edit it, or drag it to move it.`)
    return
  }
  let id = ''
  const ok = await withBusy(null, async () => {
    const h = await createHotspot(viewId, { kind: 'feature', x, y, title: DEFAULT_TITLES.feature })
    id = h.id
  }, 'Could not add the hotspot')
  if (ok && id) void follow(id)
  if (ok && id) {
    selectedHotspotId.value = id
    await nextTick()
    titleInput.value?.focus()
    titleInput.value?.select()
  }
}

/** How close (share of the photo's width) a new pin may come to one already showing on the frame. */
const PIN_TWIN = 0.05
function pinNear(viewId: string, x: number, y: number) {
  const v = views.value.find(i => i.id === viewId)
  const aspect = v?.width && v?.height ? v.height / v.width : 9 / 16
  let best: { id: string; title: string; d: number } | null = null
  for (const w of views.value) {
    for (const h of w.hotspots ?? []) {
      const p = w.id === viewId ? [h.x, h.y] : h.track?.pts[viewId]
      if (!p) continue
      const d = Math.hypot(p[0] - x, (p[1] - y) * aspect)
      if (d < PIN_TWIN && (!best || d < best.d)) best = { id: h.id, title: h.title, d }
    }
  }
  return best
}

function onSelectHotspot({ viewId, id }: { viewId: string; id: string }) {
  // A followed pin can be picked on any frame it shows on: stay on that frame.
  const shownHere = !!selectedId.value && !!findHotspot(id)?.h.track?.pts[selectedId.value]
  if (viewId !== selectedId.value && !shownHere) selectedId.value = viewId
  selectedHotspotId.value = id
  placing.value = false
}

async function onMoveHotspot({ viewId, id, x, y }: { viewId: string; id: string; x: number; y: number }) {
  selectedHotspotId.value = id
  const found = findHotspot(id)
  if (found && found.view.id !== viewId) {
    // Dragged on another frame of the spin: a correction there. Keep the earlier ones and follow again.
    const t = found.h.track
    const fixed: Record<string, [number, number]> = {}
    for (const f of t?.fixed ?? []) if (t?.pts[f]) fixed[f] = t.pts[f]
    fixed[viewId] = [x, y]
    if (t) found.h.track = { ...t, pts: { ...t.pts, [viewId]: [x, y] } }
    await follow(id, fixed)
    return
  }
  // Moved on its own frame: the pin starts over from here (earlier corrections were for the old spot).
  const ok = await withBusy(null, () => updateHotspot(viewId, id, { x, y }), 'Could not move the hotspot')
  if (ok) void follow(id)
}

// ── Following a pin round the car ──
// In a smooth spin, a pin is followed frame by frame from where it is placed, so it stays on the
// bonnet as the car turns and hides when the bonnet is out of sight. Runs here, once per change.
const tracking = ref<Record<string, 'running' | 'failed'>>({})
const trackRuns = new Map<string, number>()
function findHotspot(id: string) {
  for (const v of views.value) {
    const h = v.hotspots?.find(x => x.id === id)
    if (h) return { view: v, h }
  }
  return null
}
async function follow(id: string, fixed: Record<string, [number, number]> = {}, quiet = false): Promise<boolean> {
  const found = findHotspot(id)
  if (!found || !isSpin.value) return false
  const run = (trackRuns.get(id) ?? 0) + 1
  trackRuns.set(id, run)
  tracking.value = { ...tracking.value, [id]: 'running' }
  try {
    const track = await followPin(views.value, found.view.id, [found.h.x, found.h.y], fixed)
    if (trackRuns.get(id) !== run) return false
    await updateHotspot(found.view.id, id, { track })
    const { [id]: _, ...rest } = tracking.value
    tracking.value = rest
    return true
  } catch (e: any) {
    if (trackRuns.get(id) !== run) return false
    tracking.value = { ...tracking.value, [id]: 'failed' }
    if (!quiet) setNotice(`${errMsg(e, 'Could not follow the pin round the car')}. It shows near this frame only.`)
    return false
  }
}

// Pins placed before following existed (or before the database could keep a track) are followed
// once, one after another, when their spin opens. The first failure (such as the database update
// not having run yet) stops it quietly; the pins keep working as before.
const backfilledSpins = new Set<string>()
watch(() => [loaded.value, activeSpinId.value, views.value.length] as const, async () => {
  if (!loaded.value || !isSpin.value) return
  const key = activeSpinId.value ?? ''
  if (backfilledSpins.has(key)) return
  backfilledSpins.add(key)
  // Pins never followed, or followed by an older tracker (redone, keeping the seller's corrections).
  const todo = views.value.flatMap(v => (v.hotspots ?? []).filter(h => (h.track?.v ?? 0) < TRACK_VERSION))
  for (const h of todo) {
    const fixed: Record<string, [number, number]> = {}
    for (const f of h.track?.fixed ?? []) if (h.track?.pts[f]) fixed[f] = h.track.pts[f]
    if (!(await follow(h.id, fixed, true))) break
  }
}, { immediate: true })
const trackNote = computed(() => {
  const h = selectedHotspot.value
  if (!h || !isSpin.value) return ''
  const state = tracking.value[h.id]
  if (state === 'running') return 'Following the part round the car…'
  if (state === 'failed') return 'Shows near this frame only.'
  const n = h.track ? Object.keys(h.track.pts).length : 0
  if (!h.track) return ''
  if (n <= 1) return 'Shows on this frame only: this spot could not be followed. Try a spot with more detail.'
  return `Follows the car on ${n} of ${views.value.length} frames. Turn the car and drag the pin to correct a frame.`
})

// Edits are saved shortly after typing stops, so there is no Save button to forget.
const saveState = ref('')
const urlError = ref('')
let saveTimer: ReturnType<typeof setTimeout> | undefined
let pendingPatch: Record<string, any> = {}

function editHotspot(patch: Record<string, any>) {
  const h = selectedHotspot.value
  // The pin belongs to the frame it was placed on, even when it is being edited from another frame.
  const v = h ? findHotspot(h.id)?.view ?? current.value : null
  if (!h || !v) return
  if ('url' in patch) {
    const u = String(patch.url ?? '').trim()
    if (u && !/^https?:\/\/\S+$/i.test(u)) { urlError.value = 'Start the link with https://'; delete patch.url }
    else { urlError.value = ''; patch.url = u || null }
  }
  if ('title' in patch && !String(patch.title).trim()) { saveState.value = 'Title is needed'; delete patch.title }
  if ('body' in patch) patch.body = String(patch.body).trim() || null
  if (!Object.keys(patch).length) return

  // Show it at once; send it after a pause.
  v.hotspots = (v.hotspots ?? []).map(x => (x.id === h.id ? { ...x, ...patch } : x))
  pendingPatch = { ...pendingPatch, ...patch }
  saveState.value = 'Saving…'
  if (saveTimer) clearTimeout(saveTimer)
  const viewId = v.id
  const id = h.id
  saveTimer = setTimeout(async () => {
    const send = pendingPatch
    pendingPatch = {}
    try {
      await updateHotspot(viewId, id, send)
      saveState.value = 'Saved'
    } catch (e: any) {
      saveState.value = 'Not saved'
      setNotice(`${errMsg(e, 'Could not save the hotspot')}. Try again.`)
    }
  }, 500)
}

// A photo on the pin: buyers tap the bonnet and see the engine.
const hotspotPhotoInput = ref<HTMLInputElement | null>(null)
const photoBusy = ref(false)
function pickHotspotPhoto() { hotspotPhotoInput.value?.click() }
async function onHotspotPhoto(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const h = selectedHotspot.value
  if (!file || !h) return
  photoBusy.value = true
  try {
    const url = await uploadHotspotPhoto(file)
    if (selectedHotspot.value?.id === h.id) editHotspot({ image_url: url })
  } catch (err: any) {
    setNotice(`${errMsg(err, 'Could not add the photo')}. Try again.`)
  } finally {
    photoBusy.value = false
  }
}

function removeSelectedHotspot() {
  const h = selectedHotspot.value
  const v = h ? findHotspot(h.id)?.view ?? current.value : null
  if (!h || !v) return
  selectedHotspotId.value = null
  withBusy(null, () => deleteHotspot(v.id, h.id), 'Could not delete the hotspot')
}

// ── AI ──
const aiBusy = ref<'' | 'sort' | 'hotspots'>('')
interface SortRow { id: string; image_url: string; name: string; current: number; suggested: number | null; label: string | null }
const sortReview = ref<SortRow[] | null>(null)
const sortChanges = computed(() => (sortReview.value ?? []).filter(r => r.suggested !== null && r.suggested !== r.current))

async function runAiSort() {
  clearNotice()
  aiBusy.value = 'sort'
  try {
    const suggestions: AngleSuggestion[] = await aiSortSuggestions()
    const byId = new Map(suggestions.map(s => [s.id, s]))
    sortReview.value = views.value.map((v) => {
      const s = byId.get(v.id)
      const suggested = s ? s.angle : v.angle
      return { id: v.id, image_url: v.image_url, name: s?.label || viewLabel(v), current: v.angle, suggested, label: s?.label ?? null }
    })
  } catch (e: any) {
    setNotice(errMsg(e, 'AI could not sort the photos right now. You can still order them by hand.'))
  } finally {
    aiBusy.value = ''
  }
}

async function applySort() {
  const rows = sortChanges.value
  if (!rows.length) return
  const ok = await withBusy(null, () => applyAngles(rows.map(r => ({ id: r.id, angle: r.suggested as number, label: r.label }))), 'Could not apply the new order')
  if (ok) {
    sortReview.value = null
    const dup = slotGaps(views.value).duplicates
    setNotice(dup.length
      ? `Sorted. Two photos ended up at ${dup.map(d => `${d}°`).join(', ')}; move one to a free position.`
      : 'Sorted. Check the order by dragging the car around.')
  }
}

interface Draft { kind: VehicleHotspotKind; x: number; y: number; title: string; body: string | null; on: boolean }
const aiDrafts = ref<Draft[]>([])

async function runAiHotspots() {
  const v = current.value
  if (!v) return
  clearNotice()
  aiBusy.value = 'hotspots'
  try {
    const s = await aiHotspotSuggestions(v.id)
    aiDrafts.value = s.map(d => ({ ...d, on: true }))
    if (!s.length) setNotice('AI found nothing worth pinning on this photo. Add hotspots by hand if you like.')
  } catch (e: any) {
    setNotice(errMsg(e, 'AI could not look at this photo right now. Try again shortly.'))
  } finally {
    aiBusy.value = ''
  }
}

async function addDrafts() {
  const v = current.value
  if (!v) return
  const picked = aiDrafts.value.filter(d => d.on)
  const room = MAX_HOTSPOTS_PER_VIEW - (v.hotspots?.length ?? 0)
  const ok = await withBusy(null, async () => {
    for (const d of picked.slice(0, Math.max(0, room))) {
      const h = await createHotspot(v.id, { kind: d.kind, x: d.x, y: d.y, title: d.title, body: d.body })
      void follow(h.id)
    }
  }, 'Could not add the hotspots')
  if (ok) {
    aiDrafts.value = []
    setNotice('Added. AI pins can be a little off: drag any pin onto the exact spot.')
  }
}
// Suggestions belong to one photo.
watch(selectedId, () => { aiDrafts.value = [] })

// ── Smooth spin from a video ──
const videoInput = ref<HTMLInputElement | null>(null)
const videoCamInput = ref<HTMLInputElement | null>(null)
const spinOpen = ref(false)
const spinRightFirst = ref(true)
const spinCount = ref(64)
const spinError = ref('')
const spinRun = ref<{ phase: SpinPhase | 'clearing' | 'uploading'; done: number; total: number } | null>(null)
const SPIN_PHASE_TEXT: Record<SpinPhase | 'clearing' | 'uploading', string> = {
  reading: 'Reading frames from your video',
  preparing: 'Getting the car finder ready (first time only)',
  finding: 'Finding the car in each frame',
  centring: 'Centring the car',
  saving: 'Saving the frames',
  clearing: 'Clearing the old photos',
  uploading: 'Uploading frames',
}
let spinSignal = { cancelled: false }

function openSpinModal() {
  spinError.value = ''
  spinRun.value = null
  spinOpen.value = true
  // Download the car finder while the owner picks or records the video.
  preloadCarDetector()
}
function closeSpinModal() { if (!spinRun.value) spinOpen.value = false }
function cancelSpin() { spinSignal.cancelled = true }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const isRateLimited = (e: any) => (e?.status ?? e?.statusCode ?? e?.response?.status) === 429

async function onVideoPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const invalid = validateSpinVideo(file)
  if (invalid) { spinError.value = invalid; return }
  await makeSpin(file)
}

async function makeSpin(file: File) {
  spinError.value = ''
  spinSignal = { cancelled: false }
  const signal = spinSignal
  const count = spinCount.value
  busy.value = true
  selectedHotspotId.value = null
  // Set once the old photos start to go: before that, a failure leaves the current spin as it was.
  let changed = false
  try {
    // 1. Read every frame first, so a bad video never costs you your current photos.
    spinRun.value = { phase: 'reading', done: 0, total: count }
    const { frames, report } = await extractSpinFrames(file, count, (done, total, phase) => { spinRun.value = { phase, done, total } }, signal)

    // 2. Clear the old set (a spin needs the whole 360° to itself).
    const old = [...views.value]
    changed = true
    if (old.length) {
      spinRun.value = { phase: 'clearing', done: 0, total: old.length }
      // Four at a time, like the upload below.
      let cleared = 0
      let at = 0
      const clear = async () => {
        while (at < old.length) {
          if (signal.cancelled) throw new Error('Cancelled')
          await removeView(old[at++].id)
          spinRun.value = { phase: 'clearing', done: ++cleared, total: old.length }
        }
      }
      await Promise.all([clear(), clear(), clear(), clear()])
    }

    // 3. Upload, four at a time. The server allows a burst; if it asks us to slow down we wait and retry.
    const angles = spinAngles(count, spinRightFirst.value)
    spinRun.value = { phase: 'uploading', done: 0, total: count }
    let next = 0
    let done = 0
    let firstError: any = null
    const worker = async () => {
      while (next < frames.length && !signal.cancelled && !firstError) {
        const i = next++
        for (let tries = 0; ; tries++) {
          try { await addView(frames[i].file, angles[i]); break } catch (err: any) {
            if (isRateLimited(err) && tries < 4) { await sleep(2500 * (tries + 1)); continue }
            firstError = firstError ?? err
            return
          }
        }
        spinRun.value = { phase: 'uploading', done: ++done, total: count }
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()])
    if (firstError) throw firstError
    if (signal.cancelled) throw new Error('Cancelled')

    spinOpen.value = false
    if (views.value.length) selectedId.value = views.value[0].id
    const centred = report.centred ? ' The car is centred and the same size in every frame.' : ''
    setNotice(`Smooth spin ready: ${views.value.length} frames.${centred} Drag the car to try it, then pin hotspots on any frame.${report.tips.length ? ` ${report.tips.length > 1 ? 'Tips' : 'Tip'}: ${report.tips.slice(0, 2).join(' ')}` : ''}`)
  } catch (e: any) {
    const m = errMsg(e, 'Something went wrong')
    if (m === 'Cancelled') {
      if (!changed) setNotice('Stopped. Your current photos were not changed.')
      else setNotice(views.value.length ? `Stopped. ${views.value.length} frame${views.value.length === 1 ? ' was' : 's were'} saved. Run it again to finish the spin.` : 'Stopped.')
      spinOpen.value = false
    } else {
      spinError.value = !changed
        ? `${m}${views.value.length ? ' Your current photos were not changed.' : ''}`
        : `${m}${views.value.length ? ` ${views.value.length} frames were saved; run it again to replace them.` : ''}`
    }
  } finally {
    spinRun.value = null
    busy.value = false
  }
}

// The step bar ticks off the exterior from the frame count: re-check it once a change has settled.
// ── Studio finish ──
// Set on the main spin; its camera heights are finished with it.
const finishSpinId = computed(() => (spinsReady.value ? (activeSpin.value?.row_of ?? activeSpin.value?.id ?? null) : null))
const finish = useSpinFinish(finishSpinId, async () => {
  await load()
  toast.success(finishLook.value === 'original' ? 'Back to your original frames' : 'Studio finish is on. Drag the slider to compare.')
})
const finishLook = computed<SpinLook>(() => finish.status.value?.look ?? 'original')
const finishRunning = computed(() => isRunning(finish.status.value?.progress))
const finishFailed = computed(() => finish.error.value || (finish.status.value?.progress?.state === 'failed' ? progressText(finish.status.value.progress) : ''))
const compareSplit = ref(50)
function applyFinish(look: SpinLook, again = false) {
  if (look === finishLook.value && !again) return
  finish.apply(look)
}
// New frames from a video or uploads change the spin: read its look again.
watch(() => views.value.length, () => { if (!finishRunning.value) finish.refresh() })

const carSetup = useCarSetup(props.spaceId)
let checklistTimer: ReturnType<typeof setTimeout> | undefined
watch(() => `${views.value.length}|${spins.value.length}|${busy.value}`, () => {
  if (busy.value) return
  if (checklistTimer) clearTimeout(checklistTimer)
  checklistTimer = setTimeout(() => carSetup.refresh(), 400)
})

// ── Spins ──
function onSelectSpin(id: string) {
  if (id === activeSpinId.value) return
  selectSpin(id)
  selectedHotspotId.value = null
  placing.value = false
  aiDrafts.value = []
  clearNotice()
}

const addSpinOpen = ref(false)
const newSpinTitle = ref('')
const spinPresets = computed(() => SPIN_PRESETS.filter(p => !spins.value.some(s => s.title.toLowerCase() === p.toLowerCase())))
/** Main spins first, each followed by its camera-height rows. */
const spinChips = computed(() => {
  const mains = spins.value.filter(s => !s.row_of)
  const out = mains.flatMap(m => [m, ...spins.value.filter(r => r.row_of === m.id).sort((a, b) => (b.elevation ?? 0) - (a.elevation ?? 0))])
  // Rows whose main spin is gone (should not happen) still show.
  return [...out, ...spins.value.filter(s => !out.includes(s))]
})
// A height row needs a main spin that already has frames (it is matched to it angle by angle).
const heightParents = computed(() => spins.value.filter(s => !s.row_of && (frameCounts.value[s.id] || 0) > 0))
const newSpinKind = ref<'look' | 'height'>('look')
const newRowOf = ref('')
const newElevation = ref<number>(SPIN_HEIGHTS[0].elevation)
function suggestRowTitle() {
  const parent = spins.value.find(s => s.id === newRowOf.value)
  const h = SPIN_HEIGHTS.find(x => x.elevation === newElevation.value)
  if (parent && h) newSpinTitle.value = `${parent.title} · ${h.suffix}`.slice(0, 40)
}
function setNewSpinKind(kind: 'look' | 'height') {
  newSpinKind.value = kind
  if (kind === 'height') {
    const active = spins.value.find(s => s.id === activeSpinId.value)
    newRowOf.value = (active?.row_of ? active.row_of : active?.id) && heightParents.value.some(p => p.id === (active?.row_of || active?.id))
      ? (active!.row_of || active!.id)
      : heightParents.value[0]?.id ?? ''
    suggestRowTitle()
  } else {
    newSpinTitle.value = spinPresets.value[0] ?? ''
  }
}
function openAddSpin() { newSpinKind.value = 'look'; newSpinTitle.value = spinPresets.value[0] ?? ''; addSpinOpen.value = true }

async function createSpin() {
  const title = newSpinTitle.value.trim()
  if (!title) return
  const height = newSpinKind.value === 'height' && newRowOf.value ? { row_of: newRowOf.value, elevation: newElevation.value } : undefined
  const ok = await withBusy(null, () => addSpin(title, height), 'Could not add the spin')
  if (!ok) return
  addSpinOpen.value = false
  selectedHotspotId.value = null
  // Straight on to recording it: the next thing this spin needs.
  openSpinModal()
}

async function renameSpin(raw: string) {
  const sp = activeSpin.value
  const title = raw.trim()
  if (!sp || !title || title === sp.title) return
  await withBusy(null, () => updateSpin(sp.id, { title }), 'Could not rename the spin')
}

async function setStartFrame() {
  const sp = activeSpin.value
  const v = current.value
  if (!sp || !v) return
  const ok = await withBusy(null, () => updateSpin(sp.id, { start_angle: v.angle }), 'Could not save the first frame')
  if (ok) toast.success('Buyers will start on this frame')
}

// A spin recorded walking the other way round: mirror every frame's angle (front stays at 0°).
// Fixes the side names and the drag direction without recording again; hotspots stay on their photos.
async function flipSpinDirection() {
  const items = views.value.map(v => ({ id: v.id, angle: (360 - v.angle) % 360, label: null }))
  if (!items.length) return
  const keep = current.value?.id
  const ok = await withBusy(null, () => applyAngles(items), 'Could not flip the spin')
  if (!ok) return
  const sp = activeSpin.value
  if (sp && spinsReady.value && sp.start_angle) await updateSpin(sp.id, { start_angle: (360 - sp.start_angle) % 360 }).catch(() => {})
  if (keep) selectedId.value = keep
  toast.success('Flipped. Drag the car to check it turns the right way.')
}

const removeSpinArmed = ref(false)
let removeSpinTimer: ReturnType<typeof setTimeout> | undefined
function confirmRemoveSpin() {
  const sp = activeSpin.value
  if (!sp) return
  if (!removeSpinArmed.value) {
    removeSpinArmed.value = true
    removeSpinTimer = setTimeout(() => { removeSpinArmed.value = false }, 4000)
    return
  }
  removeSpinArmed.value = false
  if (removeSpinTimer) clearTimeout(removeSpinTimer)
  withBusy(null, () => removeSpin(sp.id), 'Could not delete the spin')
}

// ── Keyboard ──
function typing(t: EventTarget | null) {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}
function onKey(e: KeyboardEvent) {
  // Only while this tab is on screen (the panel stays mounted when you switch tabs).
  if (!rootEl.value || rootEl.value.offsetParent === null || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === 'h' || e.key === 'H') { e.preventDefault(); togglePlacing() }
  else if (e.key === 'Escape') { placing.value = false; selectedHotspotId.value = null }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedHotspot.value) { e.preventDefault(); removeSelectedHotspot() }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const list = views.value
    if (list.length < 2) return
    const i = list.findIndex(v => v.id === selectedId.value)
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length
    selectView(list[n].id)
    e.preventDefault()
  }
}

/** The top bar's Preview, before the car is live: the spin as buyers will see it. */
function showBuyerView() {
  if (!views.value.length) { setNotice('Add the outside of the car first, then preview it.'); return }
  if (!preview.value) togglePreview()
}

defineExpose({ reload: init, showBuyerView })
</script>

<style scoped>
.vp-seg.vp-seg--3 { grid-template-columns: repeat(3, 1fr); }
.vp-seg__btn.is-pending { border-style: dashed; border-color: #fff; }
.vp-compare { position: relative; margin: 4px 0 0; border-radius: 10px; overflow: hidden; aspect-ratio: 16 / 9; background: #000; }
.vp-compare__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.vp-compare__before { clip-path: inset(0 calc(100% - var(--split, 50%)) 0 0); }
.vp-compare::after { content: ''; position: absolute; top: 0; bottom: 0; left: var(--split, 50%); width: 2px; margin-left: -1px; background: #fff; pointer-events: none; }
.vp-compare__tag { position: absolute; top: 6px; left: 6px; padding: 2px 6px; border-radius: 6px; background: rgba(0,0,0,0.6); color: #fff; font-size: 11px; font-weight: 700; }
.vp-compare__tag--r { left: auto; right: 6px; }
.vp-compare__range { width: 100%; min-height: 44px; accent-color: #fff; cursor: ew-resize; }
.vp-compare__range:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.vp-hidden-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.vp {
  /* --vp-top clears the floating top bar and the step bar above this panel. */
  --vp-top: 132px; --vp-gap: 16px; --vp-rail: 76px; --vp-side: 320px; --vp-dock: 128px;
  position: absolute; inset: 0; overflow: hidden; background: #0b0b0c; color: #f2f2f3;
}
.vp-hidden { display: none; }
.vp-num { font-variant-numeric: tabular-nums; }

/* Tool rail: icon + one word, like the 360° editor's left toolbar. */
.vp-rail {
  position: absolute; z-index: 5; left: var(--vp-gap); top: 50%; transform: translateY(-50%);
  width: var(--vp-rail); padding: 8px 6px; border-radius: 16px; display: flex; flex-direction: column; align-items: stretch; gap: 4px;
}
.vp-rail__div { height: 1px; margin: 4px 8px; background: rgba(255,255,255,0.12); }
.vp-tool {
  min-height: 56px; border-radius: 11px; border: 0; background: transparent; color: rgba(255,255,255,0.72); cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.01em; transition: background 120ms, color 120ms;
}
.vp-tool:hover:not(:disabled) { background: rgba(255,255,255,0.09); color: #fff; }
.vp-tool:active:not(:disabled) { background: rgba(255,255,255,0.16); }
.vp-tool:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.vp-tool:disabled { opacity: 0.35; cursor: not-allowed; }
.vp-tool.is-on { background: #fff; color: #0e0e10; }

.vp-stage {
  position: absolute; top: var(--vp-top); bottom: calc(var(--vp-dock) + var(--vp-gap) * 2);
  left: calc(var(--vp-rail) + var(--vp-gap) * 2); right: calc(var(--vp-side) + var(--vp-gap) * 2);
  display: flex; flex-direction: column;
}
/* Nothing selected (no photos yet), or the buyer's view: the car takes the room. */
.vp:not(.has-side) .vp-stage { right: calc(var(--vp-rail) + var(--vp-gap) * 2); }
.vp.is-preview .vp-stage { inset: var(--vp-top) var(--vp-gap) var(--vp-gap); }

.vp-dockbar {
  position: absolute; z-index: 5; bottom: var(--vp-gap);
  left: calc(var(--vp-rail) + var(--vp-gap) * 2); right: calc(var(--vp-side) + var(--vp-gap) * 2);
  padding: 8px 10px; border-radius: 16px; display: flex; flex-direction: column; gap: 8px; min-width: 0;
}
.vp:not(.has-side) .vp-dockbar { right: calc(var(--vp-rail) + var(--vp-gap) * 2); }
.vp-back-edit {
  position: absolute; z-index: 6; top: 10px; left: 10px; min-height: 44px; padding: 0 14px; border-radius: 12px;
  display: inline-flex; align-items: center; gap: 8px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
}
.vp-back-edit:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }


.vp-btn {
  min-height: 44px; padding: 0 14px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer;
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.09); color: #fff; border: 1px solid rgba(255,255,255,0.12);
  transition: background 120ms;
}
.vp-btn:hover:not(:disabled) { background: rgba(255,255,255,0.17); }
.vp-btn:active:not(:disabled) { background: rgba(255,255,255,0.25); }
.vp-btn:focus-visible, .vp-thumb:focus-visible, .vp-hitem:focus-visible, .vp-seg__btn:focus-visible, .vp-select:focus-visible, .vp-input:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.vp-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.vp-btn.is-on { background: #fff; color: #0e0e10; border-color: #fff; }
.vp-btn--primary { background: #fff; color: #0e0e10; border-color: #fff; }
.vp-btn--primary:hover:not(:disabled) { background: #e6e6e8; }
.vp-btn--danger { color: #ff9b9b; }
.vp-linkbtn { background: none; border: 0; padding: 0 6px; min-height: 44px; color: #fff; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; font-size: 13px; }

/* Notices float over the top of the car, so the layout never jumps. */
.vp-alert {
  position: absolute; z-index: 6; top: 10px; left: 10px; right: 10px; margin: 0; padding: 4px 6px 4px 14px; border-radius: 12px;
  font-size: 13px; line-height: 1.45; display: flex; align-items: center; gap: 4px 8px;
  background: rgba(20,20,23,0.92); border: 1px solid rgba(255,255,255,0.14); backdrop-filter: blur(16px);
}
.vp-alert__t { flex: 1; min-width: 0; padding: 8px 0; }
.vp-alert--error { background: rgba(60,18,18,0.94); color: #ffc9c9; border-color: rgba(255,120,120,0.3); }
@media (max-width: 999px) { .vp-alert { flex-wrap: wrap; } }

.vp-spinchip.is-row { font-style: normal; opacity: 0.92; }
.vp-spins { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 2px; }
.vp-spinchip {
  flex: none; min-height: 32px; padding: 0 12px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.12);
}
.vp-spinchip:hover:not(:disabled) { background: rgba(255,255,255,0.14); }
.vp-spinchip.is-on { background: #fff; color: #0e0e10; border-color: #fff; }
.vp-spinchip:disabled { opacity: 0.45; cursor: not-allowed; }
.vp-spinchip:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.vp-spinchip__n { font-size: 11px; opacity: 0.65; }
.vp-spinchip--add { border-style: dashed; background: transparent; }
.vp-presets { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 4px; }
.vp-canvas { position: relative; flex: 1; min-height: 0; border-radius: 14px; overflow: hidden; background: #0b0b0c; }
.vp-skeleton { position: absolute; inset: 0; display: grid; place-items: center; background: linear-gradient(90deg, #111 0, #17171a 50%, #111 100%); background-size: 200% 100%; animation: vp-shimmer 1.4s linear infinite; }
@keyframes vp-shimmer { to { background-position: -200% 0; } }

.vp-empty { position: absolute; inset: 0; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; overflow-y: auto; }
.vp-empty__title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
.vp-empty__text { margin: 0 0 6px; font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.65); max-width: 38ch; }
.vp-row--center { justify-content: center; }

.vp-dock { list-style: none; margin: 0; padding: 2px; display: flex; gap: 6px; overflow-x: auto; scrollbar-width: thin; }
.vp-dock__item { flex: none; }
.vp-thumb {
  position: relative; display: block; width: 80px; aspect-ratio: 4 / 3; padding: 0; border-radius: 9px; overflow: hidden; cursor: pointer;
  border: 2px solid rgba(255,255,255,0.12); background: #161619; color: #fff;
}
.vp-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.vp-thumb.is-active { border-color: #fff; }
.vp-thumb.is-dragover { border-color: #fff; border-style: dashed; transform: scale(1.04); }
.vp-thumb--skeleton { border-color: transparent; background: linear-gradient(90deg, #131316 0, #1b1b1f 50%, #131316 100%); background-size: 200% 100%; animation: vp-shimmer 1.4s linear infinite; }
.vp-thumb--empty { border-style: dashed; display: grid; place-items: center; align-content: center; gap: 4px; color: rgba(255,255,255,0.6); background: transparent; }
.vp-thumb--empty:hover:not(:disabled) { border-color: rgba(255,255,255,0.5); color: #fff; }
.vp-thumb__label {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 4px 3px; font-size: 10px; font-weight: 700; text-align: center;
  background: linear-gradient(transparent, rgba(0,0,0,0.75)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.vp-thumb--empty .vp-thumb__label { position: static; background: none; padding: 0; color: inherit; }
.vp-thumb__count { position: absolute; top: 4px; right: 4px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px; background: #fff; color: #0e0e10; font-size: 11px; font-weight: 800; display: grid; place-items: center; }
.vp-thumb__busy { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,0.55); }

.vp-side {
  position: absolute; z-index: 5; top: var(--vp-top); right: var(--vp-gap); bottom: var(--vp-gap); width: var(--vp-side);
  border-radius: 16px; overflow-y: auto; display: flex; flex-direction: column;
}
/* Sections are divided by a line, not boxed: no cards inside the glass card. */
.vp-sec { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
.vp-sec + .vp-sec { border-top: 1px solid rgba(255,255,255,0.1); }
.vp-side .vp-gap { margin: 4px 16px 16px; }
.vp-sec__head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.vp-h2 { margin: 0; font-size: 14px; font-weight: 800; }
.vp-muted { margin: 0; font-size: 12px; line-height: 1.45; color: rgba(255,255,255,0.6); }
.vp-track { margin: -2px 0 2px; }
.vp-hint { margin: 0; font-size: 12px; line-height: 1.45; color: rgba(255,255,255,0.55); }
.vp-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.8); margin-top: 4px; }
.vp-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.vp-error { margin: 0; font-size: 12px; color: #ffb4b4; }
.vp-select, .vp-input {
  min-height: 44px; padding: 0 10px; border-radius: 10px; background: rgba(0,0,0,0.35); color: #fff; border: 1px solid rgba(255,255,255,0.18); font-size: 14px; width: 100%;
}
.vp-textarea { padding: 10px; min-height: 76px; resize: vertical; font-family: inherit; line-height: 1.4; }

.vp-hlist { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.vp-hphoto { display: flex; flex-direction: column; gap: 8px; }
.vp-hphoto img { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 10px; background: rgba(255,255,255,0.06); }
.vp-hphoto-add { justify-content: center; gap: 8px; border-style: dashed; }
.vp-hitem { width: 100%; min-height: 44px; display: flex; align-items: center; gap: 10px; padding: 0 10px; border-radius: 10px; border: 1px solid transparent; background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; text-align: left; font-size: 13px; }
.vp-hitem:hover { background: rgba(255,255,255,0.1); }
.vp-hitem.is-active { border-color: #fff; }
.vp-hitem__t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
.vp-hitem__k { font-size: 11px; color: rgba(255,255,255,0.55); }
.vp-kind { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: #fff; color: #0e0e10; font-weight: 800; font-size: 13px; flex: none; }
.vp-kind--damage { background: #ffb020; }

.vp-seg { border: 0; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.vp-seg__btn { min-height: 44px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.16); background: transparent; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.vp-seg__btn.is-on { background: #fff; color: #0e0e10; border-color: #fff; }

.vp-drafts { margin-top: 6px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 8px; }
.vp-check { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; line-height: 1.4; min-height: 44px; padding: 6px 0; cursor: pointer; }
.vp-check input { width: 20px; height: 20px; margin-top: 2px; flex: none; accent-color: #fff; }

.vp-fieldset { border: 0; padding: 0; margin: 4px 0 0; display: grid; gap: 2px; }
.vp-radio { display: flex; align-items: center; gap: 10px; min-height: 44px; font-size: 13px; cursor: pointer; }
.vp-radio input { width: 20px; height: 20px; accent-color: #fff; flex: none; }
.vp-meter { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.12); overflow: hidden; }
.vp-meter > span { display: block; height: 100%; background: #fff; transition: width 160ms; }
@media (prefers-reduced-motion: reduce) { .vp-meter > span { transition: none; } }
.vp-steps { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.75); }
.vp-gap { margin: 0; padding: 10px 12px; border-radius: 10px; background: rgba(255,176,32,0.1); color: #ffd48a; font-size: 12px; line-height: 1.5; }
.vp-next { display: flex; gap: 8px 18px; flex-wrap: wrap; }
.vp-link { color: #fff; font-size: 13px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; min-height: 44px; display: inline-flex; align-items: center; }

.vp-modal { position: fixed; inset: 0; z-index: 80; background: rgba(0,0,0,0.7); display: grid; place-items: center; padding: 16px; }
.vp-modal__box { width: 100%; max-width: 520px; max-height: 86vh; overflow-y: auto; padding: 18px; border-radius: 14px; background: #17171a; border: 1px solid rgba(255,255,255,0.12); display: flex; flex-direction: column; gap: 10px; }
.vp-sortlist { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.vp-sortrow { display: flex; align-items: center; gap: 12px; font-size: 13px; }
.vp-sortrow img { width: 64px; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 6px; flex: none; }
.vp-sortrow__t { min-width: 0; }

.vp-spin { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff; border-radius: 50%; animation: vp-rot 0.8s linear infinite; display: inline-block; }
.vp-spin--sm { width: 16px; height: 16px; }
@keyframes vp-rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .vp-spin { animation-duration: 2s; }
  .vp-skeleton, .vp-thumb--skeleton { animation: none; }
  .vp-btn, .vp-thumb { transition: none; }
}

/* Last, so it wins over the desktop layout above. Phones and narrow windows: one column that scrolls: tools, the car, the frames, the panel. */
@media (max-width: 999px) {
  .vp {
    --vp-top: 104px; --vp-gap: 12px;
    overflow-y: auto; padding: var(--vp-top) var(--vp-gap) 32px; display: flex; flex-direction: column; gap: 10px;
  }
  .vp-rail, .vp-stage, .vp-dockbar, .vp-side, .vp.is-preview .vp-stage { position: static; inset: auto; transform: none; width: auto; }
  .vp > * { flex: none; }
  /* The car first, then its frames, then the tools within thumb reach, then the selected frame. */
  .vp-stage { order: 1; } .vp-dockbar { order: 2; } .vp-rail { order: 3; } .vp-side { order: 4; }
  .vp-rail { flex-direction: row; padding: 4px; overflow-x: auto; scrollbar-width: none; }
  .vp-rail__div { width: 1px; height: auto; margin: 8px 2px; }
  .vp-tool { flex: 1 0 64px; min-height: 52px; }
  .vp-stage { height: 56vh; min-height: 280px; }
  .vp.is-preview .vp-stage { height: calc(100vh - var(--vp-top) - 24px); }
}
</style>
