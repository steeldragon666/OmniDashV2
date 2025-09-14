import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      visibility = 'private',
      language,
      template,
      gitignoreTemplate,
      licenseTemplate,
      includeReadme = true,
      autoInit = true,
      organization,
      topics = [],
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Repository name is required' }, { status: 400 });
    }

    // Validate repository name
    const nameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!nameRegex.test(name)) {
      return NextResponse.json(
        { error: 'Repository name can only contain letters, numbers, periods, hyphens, and underscores' },
        { status: 400 }
      );
    }

    if (name.length < 1 || name.length > 100) {
      return NextResponse.json(
        { error: 'Repository name must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    // Mock repository creation
    const repositoryId = `repo-${Date.now()}`;
    const fullName = organization ? `${organization}/${name}` : `user/${name}`;

    const newRepository = {
      id: repositoryId,
      name,
      fullName,
      description: description || '',
      language: language || null,
      visibility,
      url: `https://github.com/${fullName}`,
      cloneUrl: `https://github.com/${fullName}.git`,
      sshUrl: `git@github.com:${fullName}.git`,
      stars: 0,
      forks: 0,
      watchers: 1,
      openIssues: 0,
      size: 0,
      defaultBranch: 'main',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      topics,
      status: 'active',
      owner: {
        login: organization || 'user',
        type: organization ? 'Organization' : 'User',
      },
      permissions: {
        admin: true,
        maintain: true,
        push: true,
        triage: true,
        pull: true,
      },
      template: template || null,
      autoInit,
      gitignoreTemplate: gitignoreTemplate || null,
      licenseTemplate: licenseTemplate || null,
      includeReadme,
      initialFiles: [],
    };

    // Add initial files based on configuration
    if (includeReadme) {
      newRepository.initialFiles.push({
        name: 'README.md',
        content: `# ${name}\n\n${description || 'A new repository created via OmniDash'}\n\n## Getting Started\n\nAdd your project documentation here.\n`,
      });
    }

    if (gitignoreTemplate) {
      newRepository.initialFiles.push({
        name: '.gitignore',
        content: `# ${gitignoreTemplate} specific files\n# Add your gitignore patterns here\n`,
      });
    }

    if (licenseTemplate) {
      newRepository.initialFiles.push({
        name: 'LICENSE',
        content: `# ${licenseTemplate} License\n\n# License content will be populated based on template\n`,
      });
    }

    // If using a template, add template-specific files
    if (template) {
      switch (template) {
        case 'nextjs':
          newRepository.initialFiles.push(
            {
              name: 'package.json',
              content: JSON.stringify({
                name: name.toLowerCase(),
                version: '0.1.0',
                private: true,
                scripts: {
                  dev: 'next dev',
                  build: 'next build',
                  start: 'next start',
                  lint: 'next lint',
                },
                dependencies: {
                  next: 'latest',
                  react: 'latest',
                  'react-dom': 'latest',
                },
              }, null, 2),
            },
            {
              name: 'app/page.tsx',
              content: 'export default function Home() {\n  return (\n    <main>\n      <h1>Welcome to ' + name + '</h1>\n    </main>\n  )\n}\n',
            }
          );
          break;
        case 'nodejs':
          newRepository.initialFiles.push({
            name: 'package.json',
            content: JSON.stringify({
              name: name.toLowerCase(),
              version: '1.0.0',
              description: description || '',
              main: 'index.js',
              scripts: {
                start: 'node index.js',
                test: 'echo "Error: no test specified" && exit 1',
              },
              keywords: topics,
            }, null, 2),
          });
          break;
      }
    }

    return NextResponse.json(newRepository, { status: 201 });
  } catch (error) {
    console.error('Repository creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create repository' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return available templates and options for repository creation
    const creationOptions = {
      templates: [
        {
          id: 'blank',
          name: 'Blank Repository',
          description: 'Start with an empty repository',
          language: null,
        },
        {
          id: 'nextjs',
          name: 'Next.js',
          description: 'React framework for production',
          language: 'TypeScript',
          features: ['SSR', 'API Routes', 'TypeScript support'],
        },
        {
          id: 'nodejs',
          name: 'Node.js',
          description: 'JavaScript runtime for server-side development',
          language: 'JavaScript',
          features: ['Express.js', 'REST API', 'Package.json'],
        },
        {
          id: 'python',
          name: 'Python',
          description: 'Python application template',
          language: 'Python',
          features: ['Virtual environment', 'Requirements.txt', 'Flask/FastAPI'],
        },
        {
          id: 'react',
          name: 'React',
          description: 'JavaScript library for building user interfaces',
          language: 'JavaScript',
          features: ['Create React App', 'Modern toolchain', 'Hot reloading'],
        },
      ],
      gitignoreTemplates: [
        'Node',
        'Python',
        'Java',
        'Go',
        'Rust',
        'C++',
        'C#',
        'PHP',
        'Ruby',
        'Swift',
        'Kotlin',
        'Scala',
        'R',
        'MATLAB',
        'Unity',
        'Android',
        'iOS',
        'macOS',
        'Windows',
        'Linux',
      ],
      licenseTemplates: [
        { id: 'mit', name: 'MIT License' },
        { id: 'apache-2.0', name: 'Apache License 2.0' },
        { id: 'gpl-3.0', name: 'GNU General Public License v3.0' },
        { id: 'bsd-3-clause', name: 'BSD 3-Clause "New" or "Revised" License' },
        { id: 'bsd-2-clause', name: 'BSD 2-Clause "Simplified" License' },
        { id: 'lgpl-2.1', name: 'GNU Lesser General Public License v2.1' },
        { id: 'mpl-2.0', name: 'Mozilla Public License 2.0' },
        { id: 'unlicense', name: 'The Unlicense' },
      ],
      languages: [
        'JavaScript',
        'TypeScript',
        'Python',
        'Java',
        'Go',
        'Rust',
        'C++',
        'C#',
        'PHP',
        'Ruby',
        'Swift',
        'Kotlin',
      ],
      visibilityOptions: [
        {
          id: 'public',
          name: 'Public',
          description: 'Anyone on the internet can see this repository',
        },
        {
          id: 'private',
          name: 'Private',
          description: 'You choose who can see and commit to this repository',
        },
      ],
    };

    return NextResponse.json(creationOptions);
  } catch (error) {
    console.error('Repository creation options error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creation options' },
      { status: 500 }
    );
  }
}