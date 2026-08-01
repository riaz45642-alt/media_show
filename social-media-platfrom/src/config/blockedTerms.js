// Central policy vocabulary. Keep terms grouped so policy reviews and additions
// remain auditable. Matching is boundary-aware and performed after obfuscation
// normalization; do not duplicate normalization rules in UI components.
export const BLOCKED_TERM_GROUPS = Object.freeze({
  profanity: [
    'arse', 'arsehole', 'asshole', 'bastard', 'bitch', 'bloody hell', 'bollocks',
    'bullshit', 'cocksucker', 'crap', 'cunt', 'damn', 'dick', 'dickhead',
    'douche', 'douchebag', 'fck', 'fuck', 'fucker', 'fucking', 'goddamn', 'jackass',
    'motherfucker', 'piss off', 'prick', 'shit', 'shithead', 'son of a bitch',
    'twat', 'wanker', 'whore',
  ],
  sexual: [
    'anal sex', 'bareback', 'bdsm', 'blow job', 'blowjob', 'bondage', 'boob',
    'boobs', 'camgirl', 'cock', 'cumshot', 'deep throat', 'deepthroat', 'dildo',
    'doggy style', 'erotic', 'fetish', 'gang bang', 'gangbang', 'hand job',
    'handjob', 'hardcore porn', 'hentai', 'horny', 'jerk off', 'masturbate',
    'masturbation', 'milf', 'naked', 'nude', 'nudes', 'only fans', 'onlyfans',
    'oral sex', 'orgasm', 'penis', 'porn', 'pornhub', 'pornography', 'pussy',
    'sex', 'sex tape', 'sexy', 'sexting', 'sexual intercourse', 'stripper', 'vagina',
    'xxx', 'hot babe',
  ],
  abuse: [
    'bimbo', 'coward', 'dumbass', 'freak', 'idiot', 'imbecile', 'jerk', 'loser',
    'moron', 'piece of shit', 'scumbag', 'shut the fuck up', 'stupid bitch',
    'ugly bitch', 'useless idiot', 'worthless',
  ],
  threats: [
    'go die', 'go kill yourself', 'go to hell', 'hope you die', 'i will kill you', 'kill yourself',
    'kys', 'murder you', 'shoot you', 'slit your throat', 'unalive yourself',
  ],
  hateful: [
    'beaner', 'chink', 'coon', 'faggot', 'fag', 'gook', 'gypsy scum', 'heeb',
    'kike', 'nigga', 'nigger', 'paki', 'raghead', 'retard', 'retarded', 'spic',
    'tranny', 'wetback', 'white power',
  ],
  exploitation: [
    'child porn', 'child pornography', 'cp link', 'jailbait', 'revenge porn',
    'send nudes', 'trade nudes',
  ],
})

export const BLOCKED_TERMS = Object.freeze(
  [...new Set(Object.values(BLOCKED_TERM_GROUPS).flat())]
)

// These high-confidence stems are also prohibited when embedded in identifiers
// such as usernames. General prose continues to use boundary-aware matching.
export const EMBEDDED_IDENTIFIER_TERMS = Object.freeze([
  'sex', 'sexy', 'porn', 'fuck', 'fck', 'nude', 'nudes', 'xxx', 'hentai',
  'dildo', 'blowjob', 'handjob',
])

export const IDENTIFIER_FALSE_POSITIVE_ALLOWLIST = Object.freeze([
  'essex', 'sussex',
])

export const BLOCKED_TERM_MESSAGE =
  'Your post contains inappropriate language that is not allowed on this platform. Please modify the highlighted word(s) and try again.'

export function blockedTermAlertMessage(matches = []) {
  return `${BLOCKED_TERM_MESSAGE}\n\nPlease change: ${matches.join(', ')}`
}

export const BLOCKED_USERNAME_MESSAGE =
  'This username contains inappropriate language. Please choose another username.'
