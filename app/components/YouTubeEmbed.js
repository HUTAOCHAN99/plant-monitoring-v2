'use client'

import { useEffect } from 'react'

export default function YouTubeEmbed({ url }) {
  const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL

  useEffect(() => {
    console.log('=== DEBUG STREAM ===')
    console.log('streamUrl:', streamUrl)
    console.log(
      'iframe src:',
      `${streamUrl}/stream.html?src=tapo_kamera&mode=webrtc`
    )

    setTimeout(() => {
      console.log(
        'iframe count:',
        document.querySelectorAll('iframe').length
      )

      console.log(
        'iframe list:',
        [...document.querySelectorAll('iframe')].map(i => ({
          src: i.src,
          width: i.clientWidth,
          height: i.clientHeight
        }))
      )
    }, 1000)
  }, [streamUrl])

  return (
    <div
      className="relative pb-[56.25%] h-0 border-4 border-red-500"
      style={{ minHeight: '450px' }}
    >
      <iframe
        className="absolute top-0 left-0 w-full h-full rounded-md"
        src={`${streamUrl}/stream.html?src=tapo_kamera&mode=webrtc`}
        title="Camera Stream"
        onLoad={() => {
          console.log('iframe loaded')
        }}
      />
    </div>
  )
}