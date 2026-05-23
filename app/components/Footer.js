// app/components/Footer.js
export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-xs text-gray-500">
          <p>Plant Monitoring System</p>
          <p className="mt-1">Powered by Next.js, Supabase, ESP32</p>
        </div>
      </div>
    </footer>
  )
}