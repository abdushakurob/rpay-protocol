import { useRef, useState } from "react"
import { IconArrow } from "./Icons"

export function Slide({ onConfirm, enabled = true }: { onConfirm: () => void; enabled?: boolean }) {
  const track = useRef<HTMLDivElement>(null)
  const done = useRef(false)
  const [x, setX] = useState(0)

  function finish() {
    if (!enabled || done.current) return
    done.current = true
    onConfirm()
  }

  function move(clientX: number) {
    const rect = track.current?.getBoundingClientRect()
    if (!rect) return
    const max = rect.width - 58
    const next = Math.min(max, Math.max(0, clientX - rect.left - 29))
    setX(next)
    if (next > max * 0.9) finish()
  }

  return (
    <div className="slide-row">
      <div className="slide" ref={track}>
        <span className="slide-label">Slide to continue</span>
        <button
          type="button"
          className="knob"
          style={{ transform: `translateX(${x}px)` }}
          aria-label="Slide to continue"
          onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event.clientX)
          }}
          onPointerUp={() => {
            if (!done.current) setX(0)
          }}
        >
          <IconArrow />
        </button>
      </div>
      <button className="primary narrow" type="button" onClick={finish}>Continue</button>
    </div>
  )
}
