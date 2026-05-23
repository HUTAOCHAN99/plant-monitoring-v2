import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test fetch research
    const { data: research, error: researchError } = await supabase
      .from('research')
      .select('*')
      .limit(5)
    
    if (researchError) {
      return NextResponse.json({ 
        success: false, 
        error: researchError.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: research,
      count: research?.length || 0
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}