// app/components/ResearchCard.js
import Link from 'next/link'

export default function ResearchCard({ research }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition">
      <h2 className="text-base font-semibold text-gray-900 mb-2 line-clamp-1">
        {research.title}
      </h2>
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
        {research.description || 'No description'}
      </p>
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">
          {new Date(research.created_at).toLocaleDateString()}
        </span>
        <Link
          href={`/research/${research.id}`}
          className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 transition"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}