import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET: ESP32 membaca status relay
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('sensor_status')
      .select('soil_moisture_on')
      .eq('id', 1)
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ 
      status: data.soil_moisture_on,
      relay: data.soil_moisture_on === 'HIGH' ? 1 : 0 
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: ESP32 bisa mengupdate (opsional)
export async function POST(request) {
  try {
    const { status } = await request.json()
    
    const { data, error } = await supabase
      .from('sensor_status')
      .upsert({ 
        id: 1, 
        soil_moisture_on: status,
        updated_at: new Date()
      })
      .select()
    
    if (error) throw error
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}