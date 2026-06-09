'use client'

import { useEffect } from 'react'

export default function YouTubeEmbed({ url }) {
  const streamUrl = 'https://swiftness-undecided-empower.ngrok-free.dev/stream.html?src=tapo_kamera&mode=webrtc'

  useEffect(() => {
    console.log('=== DEBUG STREAM ===')
    console.log('streamUrl:', streamUrl)
    console.log(
      'iframe src:',
      `${streamUrl}/ `
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
      className="relative pb-[56.25%] h-0 border"
      style={{ minHeight: '450px' }}
    >
      <iframe
        className="absolute top-0 left-0 w-full h-full rounded-md"
        src={`${streamUrl}/ `}
        title="Camera Stream"
        onLoad={() => {
          console.log('iframe loaded')
        }}
      />
    </div>
  )
}