'use client'

export default function CameraStream() {
  const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL

  return (
    <div className="relative pb-[56.25%] h-0">
      <iframe
        className="absolute top-0 left-0 w-full h-full rounded-md"
        src={`${streamUrl}/stream.html?src=tapo_kamera&mode=webrtc`}
        title="Camera Stream"
        frameBorder="0"
        allowFullScreen
      />
    </div>
  )
}