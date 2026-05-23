// app/components/ToggleSwitch.js
'use client'

export default function ToggleSwitch({ isOn, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`
        relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
        ${isOn ? 'bg-green-600' : 'bg-gray-400'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow
          ${isOn ? 'translate-x-9' : 'translate-x-1'}
        `}
      />
    </button>
  )
}