import { NextResponse } from 'next/server'

export async function GET() {
  const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL

  if (!streamUrl) {
    return NextResponse.json(
      { error: "STREAM_URL belum di-set" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    url: streamUrl,
  })
}