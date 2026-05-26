import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    let { moisture_value, status } = body
    
    console.log('📥 Received:', { moisture_value, status })
    
    if (!moisture_value) {
      return NextResponse.json({ 
        success: false,
        error: 'moisture_value is required' 
      }, { status: 400 })
    }
    
    // Hanya bersihkan dari karakter % jika ada, tapi tetap simpan sebagai persen
    let cleanValue = String(moisture_value).replace('%', '')
    
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
    
    // Simpan ke database (nilai sudah dalam bentuk persen)
    const { data, error } = await supabase
      .from('soil_moisture_data')
      .insert([{ 
        plant_id: targetPlantId,
        moisture_value: cleanValue, // Simpan sebagai angka persen
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