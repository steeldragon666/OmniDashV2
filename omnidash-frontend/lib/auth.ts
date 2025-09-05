import { NextAuthOptions } from 'next-auth'
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { createClient } from '@supabase/supabase-js'

// Create Supabase client only if environment variables are provided
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/gmail.readonly'
        }
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    })
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account }) {
      try {
        // Skip Supabase operations if not configured
        if (supabase) {
          // Save user to Supabase
          const { error } = await supabase
            .from('users')
            .upsert({
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              provider: account?.provider,
              provider_id: account?.providerAccountId,
              access_token: account?.access_token,
              refresh_token: account?.refresh_token,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })

          if (error) {
            console.error('Error saving user to Supabase:', error)
            // Don't fail sign in if Supabase save fails
          }
        }

        // Always return true to allow sign in
        return true
      } catch (error) {
        console.error('SignIn callback error:', error)
        // Don't fail sign in due to callback errors
        return true
      }
    },
    async session({ session, token }) {
      // Add user ID and access token to session
      if (session.user) {
        session.user.id = token.sub!
        session.accessToken = token.accessToken as string
        session.refreshToken = token.refreshToken as string
        session.provider = token.provider as string
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.provider = account.provider
      }
      return token
    },
    async redirect({ url, baseUrl }) {
      // After successful sign in, redirect to dashboard
      if (url === baseUrl) return `${baseUrl}/dashboard`
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    }
  },
  session: {
    strategy: 'jwt'
  },
  secret: process.env.NEXTAUTH_SECRET,
}