import { useState } from 'react'
import { moderateContent } from '../services/moderationService'

export default function useModeration() {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null)

  const check = async ({ text, image }) => {
    setChecking(true)
    const res = await moderateContent({ text, image })
    setResult(res)
    setChecking(false)
    return res
  }

  return { checking, result, check }
}
