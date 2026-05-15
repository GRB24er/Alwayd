import React, { useState } from 'react'
import styles from './RevealCard.module.css'
import {
  EyeIcon,
  EyeSlashIcon,
  ClipboardIcon,
} from '@heroicons/react/24/outline'

interface RevealCardProps {
  label: string
  value: string
  maskChar?: string
}

export const RevealCard: React.FC<RevealCardProps> = ({
  label,
  value,
  maskChar = '•',
}) => {
  const [revealed, setRevealed] = useState(false)

  const masked =
    maskChar.repeat(Math.max(0, value.length - 4)) + value.slice(-4)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value)
    alert(`${label} copied to clipboard`)
  }

  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.valueRow}>
        <span
          className={styles.value}
          title={revealed ? '' : 'Click eye to reveal'}
        >
          {revealed ? value : masked}
        </span>
        <div className={styles.buttons}>
          <button
            onClick={() => setRevealed((r) => !r)}
            title={revealed ? 'Hide value' : 'Show value'}
            className={styles.iconBtn}
          >
            {revealed ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
          <button
            onClick={copyToClipboard}
            title="Copy to clipboard"
            className={styles.iconBtn}
          >
            <ClipboardIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
