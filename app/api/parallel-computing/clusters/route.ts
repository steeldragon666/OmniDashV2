import { NextRequest, NextResponse } from 'next/server';

// Mock cluster data
const mockClusters = [
  {
    id: 'cluster-1',
    name: 'AWS P4D Cluster',
    provider: 'aws',
    region: 'us-east-1',
    nodes: [
      {
        id: 'node-1',
        name: 'p4d-24xlarge-1',
        gpuCount: 8,
        gpuType: 'A100',
        memory: 320,
        utilization: 85,
        temperature: 65,
        powerConsumption: 450,
        status: 'busy',
        currentJobs: ['job-1', 'job-2']
      },
      {
        id: 'node-2',
        name: 'p4d-24xlarge-2',
        gpuCount: 8,
        gpuType: 'A100',
        memory: 320,
        utilization: 92,
        temperature: 72,
        powerConsumption: 480,
        status: 'busy',
        currentJobs: ['job-3']
      }
    ],
    totalGPUs: 16,
    availableGPUs: 1,
    utilization: 88,
    status: 'active'
  },
  {
    id: 'cluster-2',
    name: 'GCP A2 Cluster',
    provider: 'gcp',
    region: 'us-central1',
    nodes: [
      {
        id: 'node-3',
        name: 'a2-highgpu-8g-1',
        gpuCount: 8,
        gpuType: 'A100',
        memory: 640,
        utilization: 45,
        temperature: 55,
        powerConsumption: 320,
        status: 'idle',
        currentJobs: []
      }
    ],
    totalGPUs: 8,
    availableGPUs: 8,
    utilization: 45,
    status: 'active'
  }
];

export async function GET(request: NextRequest) {
  try {
    // Simulate real-time updates
    const updatedClusters = mockClusters.map(cluster => ({
      ...cluster,
      nodes: cluster.nodes.map(node => ({
        ...node,
        utilization: Math.min(100, node.utilization + (Math.random() - 0.5) * 5),
        temperature: Math.max(40, Math.min(85, node.temperature + (Math.random() - 0.5) * 2)),
        powerConsumption: Math.max(200, Math.min(600, node.powerConsumption + (Math.random() - 0.5) * 20))
      })),
      utilization: Math.min(100, cluster.utilization + (Math.random() - 0.5) * 3),
      availableGPUs: Math.max(0, cluster.availableGPUs + Math.floor((Math.random() - 0.5) * 2))
    }));

    return NextResponse.json({
      success: true,
      clusters: updatedClusters,
      stats: {
        totalClusters: updatedClusters.length,
        totalGPUs: updatedClusters.reduce((sum, cluster) => sum + cluster.totalGPUs, 0),
        availableGPUs: updatedClusters.reduce((sum, cluster) => sum + cluster.availableGPUs, 0),
        averageUtilization: updatedClusters.reduce((sum, cluster) => sum + cluster.utilization, 0) / updatedClusters.length
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch clusters' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clusterData = await request.json();
    
    // Simulate cluster creation
    const newCluster = {
      id: `cluster-${Date.now()}`,
      ...clusterData,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      cluster: newCluster
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create cluster' }, { status: 500 });
  }
}
