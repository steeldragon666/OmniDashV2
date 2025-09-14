import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Mock repository data
const mockRepositories = [
  {
    id: 'repo-001',
    name: 'omnidash-frontend',
    fullName: 'organization/omnidash-frontend',
    description: 'Modern dashboard frontend built with Next.js and TypeScript',
    language: 'TypeScript',
    visibility: 'private',
    url: 'https://github.com/organization/omnidash-frontend',
    cloneUrl: 'https://github.com/organization/omnidash-frontend.git',
    sshUrl: 'git@github.com:organization/omnidash-frontend.git',
    stars: 42,
    forks: 8,
    watchers: 15,
    openIssues: 7,
    size: 15420,
    defaultBranch: 'main',
    lastCommit: {
      sha: 'abc123def456',
      message: 'feat: add repository management dashboard',
      author: 'developer@example.com',
      date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    topics: ['nextjs', 'typescript', 'dashboard', 'react'],
    status: 'active',
  },
  {
    id: 'repo-002',
    name: 'omnidash-backend',
    fullName: 'organization/omnidash-backend',
    description: 'Backend API for OmniDash built with Node.js and Express',
    language: 'JavaScript',
    visibility: 'private',
    url: 'https://github.com/organization/omnidash-backend',
    cloneUrl: 'https://github.com/organization/omnidash-backend.git',
    sshUrl: 'git@github.com:organization/omnidash-backend.git',
    stars: 28,
    forks: 5,
    watchers: 12,
    openIssues: 4,
    size: 8750,
    defaultBranch: 'main',
    lastCommit: {
      sha: 'def789ghi012',
      message: 'fix: improve API error handling',
      author: 'backend-dev@example.com',
      date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    topics: ['nodejs', 'express', 'api', 'backend'],
    status: 'active',
  },
  {
    id: 'repo-003',
    name: 'ai-content-generator',
    fullName: 'organization/ai-content-generator',
    description: 'AI-powered content generation service using Vertex AI',
    language: 'Python',
    visibility: 'public',
    url: 'https://github.com/organization/ai-content-generator',
    cloneUrl: 'https://github.com/organization/ai-content-generator.git',
    sshUrl: 'git@github.com:organization/ai-content-generator.git',
    stars: 156,
    forks: 32,
    watchers: 67,
    openIssues: 12,
    size: 5420,
    defaultBranch: 'main',
    lastCommit: {
      sha: 'ghi345jkl678',
      message: 'docs: update API documentation',
      author: 'ai-dev@example.com',
      date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    topics: ['python', 'ai', 'vertex-ai', 'content-generation'],
    status: 'active',
  },
  {
    id: 'repo-004',
    name: 'legacy-system',
    fullName: 'organization/legacy-system',
    description: 'Legacy system scheduled for migration',
    language: 'Java',
    visibility: 'private',
    url: 'https://github.com/organization/legacy-system',
    cloneUrl: 'https://github.com/organization/legacy-system.git',
    sshUrl: 'git@github.com:organization/legacy-system.git',
    stars: 3,
    forks: 1,
    watchers: 2,
    openIssues: 23,
    size: 45600,
    defaultBranch: 'master',
    lastCommit: {
      sha: 'jkl901mno234',
      message: 'fix: critical security patch',
      author: 'legacy-maintainer@example.com',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    topics: ['java', 'legacy', 'deprecated'],
    status: 'deprecated',
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const visibility = searchParams.get('visibility');
    const language = searchParams.get('language');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'updated';
    const order = searchParams.get('order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = parseInt(searchParams.get('per_page') || '30');

    let filteredRepos = [...mockRepositories];

    // Apply filters
    if (visibility) {
      filteredRepos = filteredRepos.filter(repo => repo.visibility === visibility);
    }

    if (language) {
      filteredRepos = filteredRepos.filter(repo =>
        repo.language?.toLowerCase() === language.toLowerCase()
      );
    }

    if (status) {
      filteredRepos = filteredRepos.filter(repo => repo.status === status);
    }

    // Apply sorting
    filteredRepos.sort((a, b) => {
      let comparison = 0;
      switch (sort) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updated':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'stars':
          comparison = a.stars - b.stars;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        default:
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return order === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const startIndex = (page - 1) * per_page;
    const endIndex = startIndex + per_page;
    const paginatedRepos = filteredRepos.slice(startIndex, endIndex);

    return NextResponse.json({
      repositories: paginatedRepos,
      pagination: {
        page,
        per_page,
        total: filteredRepos.length,
        total_pages: Math.ceil(filteredRepos.length / per_page),
      },
      filters: {
        visibility,
        language,
        status,
        sort,
        order,
      },
    });
  } catch (error) {
    console.error('Repository list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}