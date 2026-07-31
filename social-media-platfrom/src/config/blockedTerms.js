// Keep moderation vocabulary centralized so policy updates do not require UI changes.
// Terms are matched as whole words/phrases after common obfuscation is normalized.
export const BLOCKED_TERMS = [
  'asshole', 'bastard', 'bitch', 'bullshit', 'cocksucker', 'cunt', 'damn',
  'dick', 'douchebag', 'fuck', 'fucker', 'fucking', 'motherfucker', 'piss',
  'prick', 'shit', 'slut', 'whore',
  'blowjob', 'deepthroat', 'dildo', 'gangbang', 'handjob', 'hentai', 'horny',
  'masturbate', 'naked', 'nudes', 'onlyfans', 'orgasm', 'porn', 'pornography',
  'sex tape', 'sexting', 'sexual intercourse',
  'go kill yourself', 'kill yourself', 'kys', 'piece of shit', 'son of a bitch',
]

export const BLOCKED_TERM_MESSAGE =
  'Your text contains inappropriate language. Please remove or replace the highlighted word(s) before submitting.'
