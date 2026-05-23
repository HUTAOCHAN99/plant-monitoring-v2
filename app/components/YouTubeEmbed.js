// app/components/YouTubeEmbed.js
'use client'

export default function YouTubeEmbed({ url }) {
  function getYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  const videoId = getYouTubeId(url)
  
  if (!videoId) {
    return <p className="text-red-500 text-sm">Invalid YouTube URL</p>
  }

  return (
    <div className="relative pb-[56.25%] h-0">
      <iframe
        className="absolute top-0 left-0 w-full h-full rounded-md"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&mute=0`}
        title="YouTube live stream"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}