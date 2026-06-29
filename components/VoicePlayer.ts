let currentAudio: HTMLAudioElement | null = null;
export let isVoiceEnabled = true;

export const setVoiceEnabled = (enabled: boolean) => {
  isVoiceEnabled = enabled;
  if (!enabled && currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
};

export const playVoice = async (
  text: string, 
  lang?: string
): Promise<void> => {
  if (!isVoiceEnabled || typeof window === 'undefined') 
    return

  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }

  try {
    const audioUrl = `/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang || '')}`

    // Create audio element
    const audio = new Audio()
    currentAudio = audio

    audio.addEventListener('ended', () => {
      if (currentAudio === audio) currentAudio = null
    })

    audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e)
    })

    // Wait for audio to be ready before playing
    await new Promise<void>((resolve, reject) => {
      audio.addEventListener('canplaythrough', () => {
        resolve()
      }, { once: true })

      audio.addEventListener('error', (e) => {
        reject(new Error(
          `Audio load error: ${audio.error?.message ?? 'unknown'}`
        ))
      }, { once: true })

      // Set timeout in case canplaythrough never fires
      setTimeout(() => resolve(), 3000)

      audio.src = audioUrl
      audio.load()
    })

    // Only play if this is still the current audio
    // (user might have requested new audio while loading)
    if (currentAudio === audio) {
      await audio.play()
    }

  } catch (err: any) {
    console.error('TTS Playback Error:', err.message ?? err)
    // Silently fail — TTS is an enhancement, not critical
  }
}
