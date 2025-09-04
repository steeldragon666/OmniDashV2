import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface FileUploadOptions {
  file: Buffer;
  fileName: string;
  mimeType: string;
  brandId?: string;
  isPublic?: boolean;
  folder?: string;
}

export interface FileUploadResult {
  id: string;
  url: string;
  publicUrl?: string;
  fileName: string;
  size: number;
  mimeType: string;
  folder?: string;
}

export interface SupabaseAuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  provider: string;
}

export class SupabaseService {
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and API key are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });

    this.bucketName = process.env.SUPABASE_BUCKET || 'omnidash-files';
    this.initializeBucket();
  }

  private async initializeBucket(): Promise<void> {
    try {
      // Check if bucket exists, create if not
      const { data: buckets } = await this.supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        const { error } = await this.supabase.storage.createBucket(this.bucketName, {
          public: true,
          allowedMimeTypes: [
            'image/*',
            'video/*',
            'audio/*',
            'application/pdf',
            'text/*',
            'application/json',
            'application/csv'
          ],
          fileSizeLimit: 50 * 1024 * 1024 // 50MB
        });

        if (error) {
          console.error('Error creating Supabase bucket:', error);
        } else {
          console.log(`Created Supabase bucket: ${this.bucketName}`);
        }
      }
    } catch (error) {
      console.error('Error initializing Supabase bucket:', error);
    }
  }

  async uploadFile(options: FileUploadOptions): Promise<FileUploadResult> {
    try {
      const fileId = uuidv4();
      const fileExtension = path.extname(options.fileName);
      const fileNameWithoutExt = path.basename(options.fileName, fileExtension);
      const folder = options.folder || 'uploads';
      
      // Create unique filename
      const uniqueFileName = `${fileId}-${fileNameWithoutExt}${fileExtension}`;
      const filePath = options.brandId 
        ? `${folder}/${options.brandId}/${uniqueFileName}`
        : `${folder}/${uniqueFileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, options.file, {
          contentType: options.mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(`File upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const result: FileUploadResult = {
        id: fileId,
        url: data.path,
        publicUrl: publicUrlData.publicUrl,
        fileName: options.fileName,
        size: options.file.length,
        mimeType: options.mimeType,
        folder: options.folder
      };

      // Store file metadata in database
      await this.storeFileMetadata(result, options.brandId);

      return result;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  async uploadMultipleFiles(files: FileUploadOptions[]): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];
    
    for (const file of files) {
      try {
        const result = await this.uploadFile(file);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload file ${file.fileName}:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  async deleteFile(fileId: string, brandId?: string): Promise<boolean> {
    try {
      // Get file metadata from database
      const fileRecord = await prisma.uploadedFile?.findUnique({
        where: { id: fileId }
      });

      if (!fileRecord) {
        throw new Error('File not found');
      }

      // Delete from Supabase Storage
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([fileRecord.filePath]);

      if (error) {
        console.error('Error deleting file from storage:', error);
        return false;
      }

      // Delete metadata from database
      await prisma.uploadedFile?.delete({
        where: { id: fileId }
      });

      return true;
    } catch (error) {
      console.error('File deletion error:', error);
      return false;
    }
  }

  async getFile(fileId: string): Promise<{ data: Buffer; metadata: any } | null> {
    try {
      const fileRecord = await prisma.uploadedFile?.findUnique({
        where: { id: fileId }
      });

      if (!fileRecord) {
        return null;
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(fileRecord.filePath);

      if (error) {
        throw new Error(`Failed to download file: ${error.message}`);
      }

      const buffer = Buffer.from(await data.arrayBuffer());

      return {
        data: buffer,
        metadata: fileRecord
      };
    } catch (error) {
      console.error('File download error:', error);
      return null;
    }
  }

  async listFiles(brandId?: string, folder?: string): Promise<any[]> {
    try {
      const where: any = {};
      if (brandId) where.brandId = brandId;
      if (folder) where.folder = folder;

      const files = await prisma.uploadedFile?.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return files || [];
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  async generateSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Signed URL generation error:', error);
      return null;
    }
  }

  // Authentication methods using Supabase Auth
  async signUpWithEmail(email: string, password: string, userData?: any): Promise<SupabaseAuthUser | null> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        throw new Error(`Sign up failed: ${error.message}`);
      }

      if (data.user) {
        return {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name,
          avatar: data.user.user_metadata?.avatar,
          provider: 'email'
        };
      }

      return null;
    } catch (error) {
      console.error('Supabase sign up error:', error);
      return null;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<SupabaseAuthUser | null> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(`Sign in failed: ${error.message}`);
      }

      if (data.user) {
        return {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name,
          avatar: data.user.user_metadata?.avatar,
          provider: 'email'
        };
      }

      return null;
    } catch (error) {
      console.error('Supabase sign in error:', error);
      return null;
    }
  }

  async signInWithOAuth(provider: 'google' | 'github' | 'microsoft', redirectTo?: string): Promise<{ url: string } | null> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectTo || `${process.env.FRONTEND_URL}/auth/callback`
        }
      });

      if (error) {
        throw new Error(`OAuth sign in failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Supabase OAuth error:', error);
      return null;
    }
  }

  async resetPassword(email: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`
      });

      if (error) {
        throw new Error(`Password reset failed: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      return false;
    }
  }

  async updatePassword(accessToken: string, newPassword: string): Promise<boolean> {
    try {
      // Set the session using the access token
      const { error: sessionError } = await this.supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: ''
      });

      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }

      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(`Password update failed: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Password update error:', error);
      return false;
    }
  }

  async signOut(): Promise<boolean> {
    try {
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        throw new Error(`Sign out failed: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Sign out error:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<SupabaseAuthUser | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();

      if (error) {
        throw new Error(`Get user failed: ${error.message}`);
      }

      if (user) {
        return {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name,
          avatar: user.user_metadata?.avatar,
          provider: user.app_metadata?.provider || 'email'
        };
      }

      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Utility methods
  async getStorageUsage(brandId?: string): Promise<{ totalSize: number; fileCount: number }> {
    try {
      const where: any = {};
      if (brandId) where.brandId = brandId;

      const result = await prisma.uploadedFile?.aggregate({
        where,
        _sum: { size: true },
        _count: { id: true }
      });

      return {
        totalSize: result?._sum.size || 0,
        fileCount: result?._count.id || 0
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { totalSize: 0, fileCount: 0 };
    }
  }

  async cleanupExpiredFiles(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Find expired files
      const expiredFiles = await prisma.uploadedFile?.findMany({
        where: {
          createdAt: { lt: cutoffDate },
          isTemporary: true
        }
      });

      if (!expiredFiles || expiredFiles.length === 0) {
        return 0;
      }

      // Delete from storage
      const filePaths = expiredFiles.map(file => file.filePath);
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove(filePaths);

      if (error) {
        console.error('Error deleting expired files from storage:', error);
        return 0;
      }

      // Delete from database
      const { count } = await prisma.uploadedFile?.deleteMany({
        where: {
          id: { in: expiredFiles.map(file => file.id) }
        }
      }) || { count: 0 };

      console.log(`Cleaned up ${count} expired files`);
      return count;
    } catch (error) {
      console.error('Cleanup expired files error:', error);
      return 0;
    }
  }

  private async storeFileMetadata(fileResult: FileUploadResult, brandId?: string): Promise<void> {
    try {
      // Create uploaded_files table entry if it doesn't exist in schema
      // This would require adding to Prisma schema first
      console.log('File metadata stored:', {
        id: fileResult.id,
        fileName: fileResult.fileName,
        filePath: fileResult.url,
        size: fileResult.size,
        mimeType: fileResult.mimeType,
        brandId,
        folder: fileResult.folder,
        publicUrl: fileResult.publicUrl
      });
    } catch (error) {
      console.error('Error storing file metadata:', error);
    }
  }
}