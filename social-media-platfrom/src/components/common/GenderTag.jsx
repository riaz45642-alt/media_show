const LABEL = { male: 'Man', female: 'Woman', other: 'Non-binary' }

// Purely displays what the person themselves selected at signup/profile
// edit — never derived from their face or any biometric analysis.
export default function GenderTag({ gender, className = '' }) {
  if (!gender || !LABEL[gender]) return null
  return (
    <span className={`text-gray-400 dark:text-gray-500 ${className}`}>
      · {LABEL[gender]}
    </span>
  )
}
