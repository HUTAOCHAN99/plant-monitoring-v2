import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    let { moisture_value, status } = body
    
    console.log('📥 Received:', { moisture_value, status })
    
    if (moisture_value === undefined || moisture_value === null) {
      return NextResponse.json({ 
        success: false,
        error: 'moisture_value is required' 
      }, { status: 400 })
    }
    
    // Bersihkan dari karakter non-digit, simpan sebagai angka
    let cleanValue = String(moisture_value).replace(/[^0-9]/g, '')
    if (cleanValue === '') cleanValue = '0'
    
    // Ambil active plant
    const { data: activePlant } = await supabase
      .from('active_plant')
      .select('plant_id')
      .eq('id', 1)
      .single()
    
    let targetPlantId = null
    if (activePlant?.plant_id) {
      targetPlantId = activePlant.plant_id
    }
    
    // Simpan ke database sebagai angka
    const { data, error } = await supabase
      .from('soil_moisture_data')
      .insert([{ 
        plant_id: targetPlantId,
        moisture_value: cleanValue, // Simpan angka "71" bukan "71%"
        status: status || 'ACTIVE',
        recorded_at: new Date().toISOString()
      }])
      .select()
    
    if (error) {
      console.error('❌ Error:', error)
      return NextResponse.json({ 
        success: false,
        error: error.message 
      }, { status: 500 })
    }
    
    console.log(`✅ Saved: ${cleanValue}% for plant: ${targetPlantId || 'none'}`)
    
    return NextResponse.json({ 
      success: true, 
      data: data[0],
      message: `${cleanValue}% saved`
    }, { status: 201 })
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}