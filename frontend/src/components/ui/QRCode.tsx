type QRCodeProps = {
  size?: number
  value: string
}

export default function QRCode({ size = 110, value }: QRCodeProps) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=0&data=${encodeURIComponent(value)}`
  return <img src={src} alt="QR code" width={size} height={size} style={{ display: 'block' }} />
}
