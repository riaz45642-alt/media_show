// Conversational assistant backed by Gemini. Separate from geminiService.js
// (which only does moderation scoring) because this makes free-form
// generateContent calls with chat history instead of a fixed JSON schema.

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const SYSTEM_INSTRUCTION = `You are "SafeZone AI", a friendly in-app assistant for a safety-focused social
media platform used by teens and adults. Keep replies short, warm, and helpful.
You can help with: using the app, digital wellbeing, online safety tips, and
general questions. Never provide instructions for self-harm, violence, illegal
activity, or generating harmful content. If a user seems distressed or unsafe,
gently encourage them to reach out to a trusted adult or local support service.`

const MAX_HISTORY_TURNS = 10

export async function generateChatReply(message, history = []) {
  if (!GEMINI_API_KEY) {
    return {
      available: false,
      reply: "SafeZone AI isn't configured yet — ask an admin to add a GEMINI_API_KEY to the backend .env file.",
    }
  }

  const trimmedHistory = history.slice(-MAX_HISTORY_TURNS).map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(turn.text || '').slice(0, 2000) }],
  }))

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [...trimmedHistory, { role: 'user', parts: [{ text: message }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
      }),
    })

    if (!res.ok) {
      return { available: false, reply: "SafeZone AI is temporarily unavailable. Please try again shortly." }
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
    if (!text.trim()) {
      return { available: false, reply: "I couldn't come up with a reply to that — could you rephrase?" }
    }
    return { available: true, reply: text.trim() }
  } catch (err) {
    return {
      available: false,
      reply: err.name === 'AbortError'
        ? 'SafeZone AI took too long to respond. Please try again.'
        : 'SafeZone AI is temporarily unavailable. Please try again shortly.',
    }
  } finally {
    clearTimeout(timer)
  }
}
