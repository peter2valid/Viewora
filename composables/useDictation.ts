// Voice typing for free-text quote fields, using the browser's own speech
// recognition (no upload, no dependency). Only offered where supported.
export function useDictation(lang = 'en-KE') {
  const recording = ref(false)
  const supported = ref(false)
  let recognition: any = null

  onMounted(() => {
    supported.value = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  })

  function toggle(onText: (text: string) => void) {
    if (recording.value) { recognition?.stop(); return }
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Ctor) return
    recognition = new Ctor()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.onresult = (e: any) => {
      const text = Array.from(e.results as ArrayLike<any>).map(r => r[0].transcript).join(' ').trim()
      if (text) onText(text)
    }
    recognition.onend = () => { recording.value = false }
    recognition.onerror = () => { recording.value = false }
    recording.value = true
    recognition.start()
  }

  onBeforeUnmount(() => recognition?.abort())
  return { recording, supported, toggle }
}
