import { USERS } from './users'

let sequence = 0
export function nextMessageId() {
  sequence += 1
  return `message-${Date.now()}-${sequence}`
}

export function findUser(userId) {
  return USERS.find((user) => user.id === userId)
}
