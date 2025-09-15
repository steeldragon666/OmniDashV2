import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { VertexAI } from '@google-cloud/vertexai';
import { googleCloudConfig } from '@/lib/config';

// Initialize Vertex AI client
function createVertexAIClient() {
  if (!googleCloudConfig.projectId || !googleCloudConfig.location) {
    throw new Error('Vertex AI configuration missing. Please set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_LOCATION');
  }

  return new VertexAI({
    project: googleCloudConfig.projectId,
    location: googleCloudConfig.location,
  });
}

// Create content type-specific prompts
function createContentTypePrompt(prompt: string, contentType: string, context: any = {}) {
  const systemPrompts = {
    blog_post: `You are a professional content writer. Generate a comprehensive blog post based on the following topic. Include a compelling title, well-structured sections with headings, and engaging content. Make it informative and reader-friendly.`,
    social_media: `You are a social media expert. Create engaging social media content optimized for different platforms. Consider character limits, hashtag usage, and platform-specific best practices.`,
    email: `You are a professional communication expert. Write a well-structured email that is clear, concise, and appropriate for business communication.`,
    code: `You are a senior software engineer. Generate clean, well-commented, production-ready code that follows best practices and includes proper error handling.`,
    marketing: `You are a marketing copywriter. Create compelling marketing content that engages the target audience and drives action.`,
  };

  const systemPrompt = systemPrompts[contentType as keyof typeof systemPrompts] ||
    'You are a helpful AI assistant. Generate high-quality content based on the user\'s request.';

  return `${systemPrompt}\n\nUser request: ${prompt}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      prompt,
      contentType = 'text',
      model = 'gemini-1.5-flash',
      parameters = {},
      context = {}
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const vertexAI = createVertexAIClient();
    const generativeModel = vertexAI.getGenerativeModel({
      model: model,
      generationConfig: {
        maxOutputTokens: parameters.maxOutputTokens || 8192,
        temperature: parameters.temperature || 0.7,
        topP: parameters.topP || 0.95,
        topK: parameters.topK || 40,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    });

    const enhancedPrompt = createContentTypePrompt(prompt, contentType, context);
    const startTime = Date.now();

    const result = await generativeModel.generateContent(enhancedPrompt);
    const response = await result.response;
    const generatedText = response.text();

    const processingTime = (Date.now() - startTime) / 1000;
    const contentId = `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Process content based on type
    let processedContent;
    switch (contentType) {
      case 'blog_post':
        const lines = generatedText.split('\n');
        const title = lines.find(line => line.trim().startsWith('#')) || lines[0] || 'Generated Blog Post';
        processedContent = {
          title: title.replace(/^#+\s*/, ''),
          content: generatedText,
          wordCount: generatedText.split(/\s+/).length,
          estimatedReadTime: `${Math.ceil(generatedText.split(/\s+/).length / 200)} min`,
          sections: lines.filter(line => line.startsWith('#')).map(h => h.replace(/^#+\s*/, '')),
        };
        break;

      case 'social_media':
        // Split content for different platforms
        const platforms = ['twitter', 'linkedin', 'facebook', 'instagram'];
        processedContent = {
          posts: platforms.map(platform => {
            let platformContent = generatedText;
            const maxLength = platform === 'twitter' ? 280 : platform === 'linkedin' ? 3000 : 2200;

            if (platformContent.length > maxLength) {
              platformContent = platformContent.substring(0, maxLength - 3) + '...';
            }

            return {
              platform,
              content: platformContent,
              characterCount: platformContent.length,
              hashtags: (platformContent.match(/#\w+/g) || []).slice(0, 5),
            };
          }),
        };
        break;

      case 'email':
        const emailLines = generatedText.split('\n');
        const subject = emailLines[0] || 'Generated Email Subject';
        processedContent = {
          subject: subject.replace(/^(Subject:|Re:|Regarding:)\s*/i, ''),
          content: generatedText,
          tone: parameters.tone || 'professional',
          estimatedLength: generatedText.length < 500 ? 'short' : generatedText.length < 1500 ? 'medium' : 'long',
        };
        break;

      case 'code':
        processedContent = {
          language: parameters.language || 'javascript',
          code: generatedText,
          explanation: `Code generated based on: "${prompt}"`,
          hasComments: generatedText.includes('//') || generatedText.includes('/*') || generatedText.includes('#'),
        };
        break;

      default:
        processedContent = {
          content: generatedText,
          type: contentType,
          length: generatedText.length,
          wordCount: generatedText.split(/\s+/).length,
        };
    }

    const responseData = {
      id: contentId,
      prompt,
      contentType,
      model,
      content: processedContent,
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime,
        tokensUsed: response.usageMetadata?.totalTokenCount || 0,
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
        finishReason: response.candidates?.[0]?.finishReason || 'STOP',
      },
      parameters,
      context,
      status: 'completed',
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error('Vertex AI Content Generation error:', error);

    if (error instanceof Error) {
      if (error.message.includes('configuration missing')) {
        return NextResponse.json(
          {
            error: 'Vertex AI not configured',
            message: 'Please configure Google Cloud project and location',
            requiredEnvVars: ['GOOGLE_CLOUD_PROJECT_ID', 'GOOGLE_CLOUD_LOCATION']
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to generate content',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
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

    // Return information about available Vertex AI models and capabilities
    const availableModels = [
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast and efficient for most content generation tasks',
        maxTokens: 8192,
        supportedTypes: ['text', 'blog_post', 'email', 'social_media', 'marketing']
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Most capable model for complex content generation',
        maxTokens: 32768,
        supportedTypes: ['text', 'blog_post', 'email', 'social_media', 'code', 'marketing', 'technical']
      },
      {
        id: 'gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        description: 'Reliable model for general content generation',
        maxTokens: 8192,
        supportedTypes: ['text', 'blog_post', 'email', 'social_media']
      }
    ];

    const contentTypes = [
      { id: 'text', name: 'General Text', description: 'General purpose text generation' },
      { id: 'blog_post', name: 'Blog Post', description: 'Structured blog post with headings and sections' },
      { id: 'social_media', name: 'Social Media', description: 'Platform-optimized social media content' },
      { id: 'email', name: 'Email', description: 'Professional email communication' },
      { id: 'code', name: 'Code', description: 'Programming code generation' },
      { id: 'marketing', name: 'Marketing Copy', description: 'Marketing and advertising content' },
    ];

    return NextResponse.json({
      service: 'Vertex AI Content Generation',
      status: 'available',
      models: availableModels,
      contentTypes,
      defaultModel: 'gemini-1.5-flash',
      capabilities: [
        'Multi-turn conversations',
        'Code generation',
        'Creative writing',
        'Content optimization',
        'Multiple content formats'
      ]
    });
  } catch (error) {
    console.error('Vertex AI info retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve Vertex AI information' },
      { status: 500 }
    );
  }
}