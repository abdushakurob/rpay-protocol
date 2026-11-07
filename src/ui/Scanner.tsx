import { useEffect, useId, useRef, useState } from "react"

type QrInstance = {
  start: (
    constraints: { facingMode: string },
    config: { fps: number; qrbox: { width: number; height: number } },
    onSuccess: (value: string) => void,
    onError: () => void,
  ) => Promise<void>
  stop: () => Promise<void>
  clear: () => void
  getState: () => number
}

async function releaseScanner(scanner: QrInstance | null) {
  if (!scanner) return
  try {
    const state = scanner.getState()
    // 2 = SCANNING, 3 = PAUSED (html5-qrcode)
    if (state === 2 || state === 3) {
      await scanner.stop()
    }
  } catch {
    // Already stopped or never started — ignore.
  }
  try {
    scanner.clear()
  } catch {
    // ignore
  }
}

export function Scanner({ onCode }: { onCode: (value: string) => void }) {
  const rawId = useId()
  const regionId = `scan-${rawId.replace(/:/g, "")}`
  const seen = useRef(false)
  const onCodeRef = useRef(onCode)
  const [cameraError, setCameraError] = useState("")
  const [pasted, setPasted] = useState("")

  onCodeRef.current = onCode

  useEffect(() => {
    let disposed = false
    let scanner: QrInstance | null = null

    void import("html5-qrcode").then(async ({ Html5Qrcode }) => {
      if (disposed) return
      const instance = new Html5Qrcode(regionId) as unknown as QrInstance
      scanner = instance
      try {
        await instance.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (value) => {
            if (seen.current || disposed) return
            seen.current = true
            onCodeRef.current(value)
          },
          () => undefined,
        )
        if (disposed) {
          await releaseScanner(instance)
        }
      } catch {
        if (!disposed) setCameraError("The camera isn't available. Paste the code instead.")
        await releaseScanner(instance)
        scanner = null
      }
    })

    return () => {
      disposed = true
      void releaseScanner(scanner)
      scanner = null
    }
  }, [regionId])

  return (
    <div className="stack">
      <div id={regionId} className="reader" />
      {cameraError ? <p className="hint">{cameraError}</p> : null}
      <form
        className="paste"
        onSubmit={(event) => {
          event.preventDefault()
          const value = pasted.trim()
          if (!value || seen.current) return
          seen.current = true
          onCode(value)
        }}
      >
        <label>
          Or paste their code
          <input value={pasted} onChange={(event) => setPasted(event.target.value)} autoCapitalize="off" spellCheck={false} />
        </label>
        <button className="primary" type="submit">Use this code</button>
      </form>
    </div>
  )
}
