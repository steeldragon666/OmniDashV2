import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/database/supabase';
import { googleCloudConfig } from '@/lib/config';
import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage for asset management
function createStorageClient() {
  if (!googleCloudConfig.projectId || !googleCloudConfig.keyFilename) {
    console.warn('Google Cloud Storage not configured, using local fallback');
    return null;
  }

  return new Storage({
    projectId: googleCloudConfig.projectId,
    keyFilename: googleCloudConfig.keyFilename,
  });
}

// Asset management service
class AssetManager {
  private storage: Storage | null;
  private bucketName: string;

  constructor() {
    this.storage = createStorageClient();
    this.bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'omnidash-assets';
  }

  async uploadIcon(file: Buffer, filename: string, contentType: string, userId: string): Promise<string> {
    if (!this.storage) {
      throw new Error('Google Cloud Storage not configured');
    }

    const bucket = this.storage.bucket(this.bucketName);
    const gcsFile = bucket.file(`icons/${userId}/${filename}`);

    await gcsFile.save(file, {
      metadata: {
        contentType,
      },
      public: true,
    });

    // Make the file publicly accessible
    await gcsFile.makePublic();

    return `https://storage.googleapis.com/${this.bucketName}/icons/${userId}/${filename}`;
  }

  async listIcons(userId?: string): Promise<any[]> {
    let query = supabaseAdmin
      .from('user_assets')
      .select('*')
      .eq('type', 'icon')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: icons, error } = await query;

    if (error) {
      throw error;
    }

    return icons || [];
  }

  async saveIconMetadata(iconData: {
    filename: string;
    url: string;
    category: string;
    tags: string[];
    userId: string;
    size: number;
    contentType: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from('user_assets')
      .insert({
        user_id: iconData.userId,
        filename: iconData.filename,
        url: iconData.url,
        type: 'icon',
        category: iconData.category,
        tags: iconData.tags,
        file_size: iconData.size,
        content_type: iconData.contentType,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async deleteIcon(iconId: string, userId: string): Promise<void> {
    // Mark as deleted in database
    const { error } = await supabaseAdmin
      .from('user_assets')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('id', iconId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  getSystemIcons() {
    // Default system icons that are always available
    return {
      dashboard: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>`,
      brand: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
      social: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 4c0-1.11-.89-2-2-2s-2 .89-2 2 .89 2 2 2 2-.89 2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.5 8H16c-.8 0-1.54.37-2 1l-3.58 5.07c-.14.2-.22.45-.22.71 0 .68.55 1.22 1.22 1.22.28 0 .55-.11.75-.31L16 13v9h4z"/></svg>`,
      content: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
      analytics: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>`,
      workflow: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      ai: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>`,
      users: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 7c0-2.21-1.79-4-4-4S8 4.79 8 7s1.79 4 4 4 4-1.79 4-4zm-4 6c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/></svg>`,
      posts: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>`,
      engagement: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
      revenue: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>`,
      omnidash: `<svg viewBox="0 0 120 120" fill="currentColor"><circle cx="60" cy="60" r="50" fill="#4A7B2A"/><path d="M40 45h40v30H40z" fill="white"/></svg>`,
    };
  }
}

const assetManager = new AssetManager();

// System icon categories
const systemCategories = {
  brand: ['omnidash', 'brand'],
  social: ['social', 'users', 'engagement'],
  features: ['dashboard', 'analytics', 'ai'],
  navigation: ['content', 'workflow'],
  actions: ['posts', 'revenue'],
  status: [],
  utility: [],
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeUser = searchParams.get('includeUser') === 'true';

    // Get system icons
    const systemIcons = assetManager.getSystemIcons();
    let icons: Record<string, string> = { ...systemIcons };

    // Add user-uploaded icons if authenticated and requested
    if (session?.user && includeUser) {
      try {
        const userIcons = await assetManager.listIcons(session.user.id);
        userIcons.forEach(icon => {
          icons[icon.filename.replace(/\.[^/.]+$/, '')] = icon.url; // Remove extension for key
        });
      } catch (error) {
        console.warn('Failed to fetch user icons:', error);
      }
    }

    // Filter by category if specified
    if (category && systemCategories[category as keyof typeof systemCategories]) {
      const categoryIcons = systemCategories[category as keyof typeof systemCategories];
      const filteredIcons: Record<string, string> = {};
      categoryIcons.forEach((iconName) => {
        if (icons[iconName]) {
          filteredIcons[iconName] = icons[iconName];
        }
      });
      icons = filteredIcons;
    }

    return NextResponse.json({
      success: true,
      icons,
      categories: systemCategories,
      totalIcons: Object.keys(icons).length,
      systemIconsCount: Object.keys(systemIcons).length,
      userIconsCount: includeUser && session ? Object.keys(icons).length - Object.keys(systemIcons).length : 0,
      hasCloudStorage: assetManager.storage !== null,
    });
  } catch (error) {
    console.error('Error fetching icons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch icons' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || 'utility';
    const tags = (formData.get('tags') as string || '').split(',').map(t => t.trim()).filter(Boolean);

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Only SVG, PNG, JPEG, GIF, and WebP are allowed.'
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 5MB.'
      }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    try {
      // Upload to cloud storage
      const url = await assetManager.uploadIcon(
        buffer,
        filename,
        file.type,
        session.user.id
      );

      // Save metadata to database
      const iconRecord = await assetManager.saveIconMetadata({
        filename,
        url,
        category,
        tags,
        userId: session.user.id,
        size: file.size,
        contentType: file.type,
      });

      return NextResponse.json({
        success: true,
        icon: {
          id: iconRecord.id,
          filename,
          url,
          category,
          tags,
          size: file.size,
          contentType: file.type,
          uploadedAt: iconRecord.created_at,
        },
        message: 'Icon uploaded successfully'
      }, { status: 201 });

    } catch (uploadError) {
      console.error('Icon upload error:', uploadError);

      if (uploadError instanceof Error && uploadError.message.includes('not configured')) {
        return NextResponse.json({
          error: 'Cloud storage not configured',
          message: 'Please configure Google Cloud Storage for icon uploads',
          fallback: 'System icons are still available'
        }, { status: 503 });
      }

      return NextResponse.json({
        error: 'Upload failed',
        message: uploadError instanceof Error ? uploadError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error uploading icon:', error);
    return NextResponse.json(
      { error: 'Failed to upload icon' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const iconId = searchParams.get('id');

    if (!iconId) {
      return NextResponse.json({ error: 'Icon ID is required' }, { status: 400 });
    }

    await assetManager.deleteIcon(iconId, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Icon deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting icon:', error);
    return NextResponse.json(
      { error: 'Failed to delete icon' },
      { status: 500 }
    );
  }
}