let audioContext
let ringtoneTimer

function beep(frequency = 740, duration = 0.12) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.frequency.value = frequency
    gain.gain.value = 0.05
    oscillator.connect(gain).connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + duration)
  } catch { /* Audio may be blocked until the first user gesture. */ }
}

export const playNotificationTone = () => beep()
export function startRingtone() {
  stopRingtone()
  beep(620, 0.35)
  ringtoneTimer = window.setInterval(() => beep(620, 0.35), 1400)
}
export function stopRingtone() {
  if (ringtoneTimer) window.clearInterval(ringtoneTimer)
  ringtoneTimer = null
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.requestPermission()
}

export function showBrowserNotification({ title, body, link = '/', tag }) {
  if (!('Notification' in window) || Notification.permission !== 'granted' || document.visibilityState === 'visible') return
  const notification = new Notification(title, { body, tag })
  notification.onclick = () => {
    window.focus()
    window.location.assign(link)
    notification.close()
  }
}
