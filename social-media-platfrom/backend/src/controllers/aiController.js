import { generateChatReply } from '../services/aiChatService.js'
import { moderate } from '../services/moderationService.js'

// POST /api/ai/chat
// Moderates the user's message first (reusing the same hybrid pipeline as
// posts/comments/messages) so the assistant is never used to launder abusive
// or unsafe content, then forwards it to Gemini for a reply.
export async function chat(req, res, next) {
  try {
    const { message, history } = req.body

    const modResult = await moderate({ text: message, userId: req.user?.id, contentType: 'message' })
    if (modResult.status === 'rejected') {
      return res.json({
        reply: "I can't help with that message — it looks like it may go against SafeZone's community guidelines.",
        moderated: true,
      })
    }

    const { reply } = await generateChatReply(message, Array.isArray(history) ? history : [])
    res.json({ reply, moderated: false })
  } catch (err) {
    next(err)
  }
}
