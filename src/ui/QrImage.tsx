import { useEffect, useState } from "react"

export function QrImage({ text }: { text: string }) {
  const [src, setSrc] = useState("")
  useEffect(() => {
    let cancel = false
    void import("qrcode").then((QR) =>
      QR.toDataURL(text, {
        margin: 1,
        width: 280,
        color: { dark: "#2A211C", light: "#FBF7F2" },
      }),
    ).then((url) => {
      if (!cancel) setSrc(url)
    })
    return () => {
      cancel = true
    }
  }, [text])
  if (!src) return <div className="qr" />
  return <img className="qr" alt="" src={src} />
}
