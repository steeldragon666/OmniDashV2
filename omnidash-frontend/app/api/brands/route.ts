import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/brands - Get user's brands
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: brands, error } = await supabase
      .from('brands')
      .select('*')
      .eq('user_id', session.user.email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ brands: brands || [] });
  } catch (error) {
    console.error('GET /api/brands error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/brands - Create a new brand
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, connectedPlatforms } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
    }

    // First, create the brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .insert([
        {
          user_id: session.user.email,
          name: name.trim(),
          description: description || null,
          settings: {
            connectedPlatforms: connectedPlatforms || []
          }
        }
      ])
      .select()
      .single();

    if (brandError) {
      console.error('Brand creation error:', brandError);
      return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
    }

    // If there are connected platforms, we would typically save those connections here
    // For now, we'll just return success

    return NextResponse.json({ 
      brand, 
      message: 'Brand created successfully' 
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/brands error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}