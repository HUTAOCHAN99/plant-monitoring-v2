'use client'

import { useEffect, useState } from 'react'

export default function CameraStream() {
  const [streamUrl, setStreamUrl] = useState(null)

  useEffect(() => {
    fetch('/api/stream')
      .then(res => res.json())
      .then(data => setStreamUrl(data.url))
      .catch(err => console.error(err))
  }, [])

  if (!streamUrl) {
    return <p className="text-sm text-gray-500">Loading stream...</p>
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