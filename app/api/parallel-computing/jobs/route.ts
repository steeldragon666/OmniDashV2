import { NextRequest, NextResponse } from 'next/server';

// Mock job data
let mockJobs = [
  {
    id: 'job-1',
    name: 'Transformer Training',
    type: 'training',
    priority: 'high',
    status: 'running',
    requiredGPUs: 4,
    progress: 65,
    assignedNodes: ['node-1'],
    startTime: new Date(Date.now() - 3600000).toISOString(),
    estimatedCompletion: new Date(Date.now() + 1800000).toISOString()
  },
  {
    id: 'job-2',
    name: 'Data Preprocessing',
    type: 'data-processing',
    priority: 'medium',
    status: 'running',
    requiredGPUs: 2,
    progress: 30,
    assignedNodes: ['node-1'],
    startTime: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'job-3',
    name: 'Model Inference',
    type: 'inference',
    priority: 'critical',
    status: 'running',
    requiredGPUs: 1,
    progress: 90,
    assignedNodes: ['node-2'],
    startTime: new Date(Date.now() - 900000).toISOString()
  },
  {
    id: 'job-4',
    name: 'CNN Training',
    type: 'training',
    priority: 'low',
    status: 'queued',
    requiredGPUs: 8,
    progress: 0,
    assignedNodes: []
  }
];

export async function GET(request: NextRequest) {
  try {
    // Simulate real-time progress updates
    mockJobs = mockJobs.map(job => {
      if (job.status === 'running') {
        const newProgress = Math.min(100, job.progress + Math.random() * 2);
        return {
          ...job,
          progress: newProgress,
          status: newProgress >= 100 ? 'completed' : 'running'
        };
      }
      return job;
    });

    const runningJobs = mockJobs.filter(job => job.status === 'running').length;
    const queuedJobs = mockJobs.filter(job => job.status === 'queued').length;
    const completedJobs = mockJobs.filter(job => job.status === 'completed').length;

    return NextResponse.json({
      success: true,
      jobs: mockJobs,
      stats: {
        total: mockJobs.length,
        running: runningJobs,
        queued: queuedJobs,
        completed: completedJobs
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const jobData = await request.json();
    
    // Create new job
    const newJob = {
      id: `job-${Date.now()}`,
      ...jobData,
      status: 'queued',
      progress: 0,
      assignedNodes: [],
      createdAt: new Date().toISOString()
    };

    mockJobs.push(newJob);

    return NextResponse.json({
      success: true,
      job: newJob
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { jobId, action } = await request.json();
    
    const jobIndex = mockJobs.findIndex(job => job.id === jobId);
    if (jobIndex === -1) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    switch (action) {
      case 'start':
        mockJobs[jobIndex].status = 'running';
        mockJobs[jobIndex].startTime = new Date().toISOString();
        break;
      case 'pause':
        mockJobs[jobIndex].status = 'paused';
        break;
      case 'cancel':
        mockJobs[jobIndex].status = 'cancelled';
        break;
      case 'complete':
        mockJobs[jobIndex].status = 'completed';
        mockJobs[jobIndex].progress = 100;
        break;
    }

    return NextResponse.json({
      success: true,
      job: mockJobs[jobIndex]
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}
