'use client'

export default function CameraStream() {
  const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL

  if (!streamUrl) {
    return (
      <p className="text-red-500 text-sm">
        NEXT_PUBLIC_STREAM_URL belum di-set
      </p>
    )
  }

  return (
    <div className="aspect-video w-full">
      <iframe
        className="w-full h-full rounded-md"
        src={`${streamUrl}/stream.html?src=tapo_kamera&mode=webrtc`}
        title="Camera Stream"
        frameBorder="0"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    </div>
  )
}