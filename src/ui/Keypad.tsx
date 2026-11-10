const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", ".", "9", "0", "⌫"]

export function Keypad({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  function press(key: string) {
    if (key === "⌫") {
      onChange(value.slice(0, -1))
      return
    }
    if (key === "." && value.includes(".")) return
    const next = value === "0" && key !== "." ? key : `${value}${key}`
    const fraction = next.split(".")[1]
    if (fraction && fraction.length > 9) return
    onChange(next)
  }

  return (
    <div className="keys" role="group" aria-label="Amount">
      {KEYS.map((key) => (
        <button key={key} type="button" className="key" onClick={() => press(key)} aria-label={key === "⌫" ? "Delete" : key}>
          {key}
        </button>
      ))}
    </div>
  )
}
