import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Mock BigQuery datasets
const mockDatasets = [
  {
    id: 'analytics_data',
    friendlyName: 'Analytics Data',
    description: 'Web analytics and user behavior data',
    location: 'australia-southeast2',
    creationTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastModifiedTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    access: [
      { role: 'OWNER', userByEmail: 'admin@example.com' },
      { role: 'READER', userByEmail: 'analyst@example.com' },
    ],
    tables: [
      {
        id: 'user_events',
        friendlyName: 'User Events',
        numRows: '2456789',
        numBytes: '15678900000',
        type: 'TABLE',
        schema: {
          fields: [
            { name: 'user_id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'event_name', type: 'STRING', mode: 'REQUIRED' },
            { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
            { name: 'properties', type: 'JSON', mode: 'NULLABLE' },
          ],
        },
      },
      {
        id: 'page_views',
        friendlyName: 'Page Views',
        numRows: '8901234',
        numBytes: '45678900000',
        type: 'TABLE',
        schema: {
          fields: [
            { name: 'session_id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'page_url', type: 'STRING', mode: 'REQUIRED' },
            { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
            { name: 'user_agent', type: 'STRING', mode: 'NULLABLE' },
          ],
        },
      },
    ],
  },
  {
    id: 'sales_data',
    friendlyName: 'Sales Data',
    description: 'Sales transactions and customer data',
    location: 'australia-southeast2',
    creationTime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    lastModifiedTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    access: [
      { role: 'OWNER', userByEmail: 'admin@example.com' },
      { role: 'WRITER', userByEmail: 'sales-team@example.com' },
      { role: 'READER', userByEmail: 'reporting@example.com' },
    ],
    tables: [
      {
        id: 'transactions',
        friendlyName: 'Transactions',
        numRows: '567890',
        numBytes: '8901234000',
        type: 'TABLE',
        schema: {
          fields: [
            { name: 'transaction_id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'customer_id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'amount', type: 'NUMERIC', mode: 'REQUIRED' },
            { name: 'currency', type: 'STRING', mode: 'REQUIRED' },
            { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
          ],
        },
      },
    ],
  },
  {
    id: 'ml_models',
    friendlyName: 'ML Models',
    description: 'Machine learning model training and prediction data',
    location: 'australia-southeast2',
    creationTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    lastModifiedTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    access: [
      { role: 'OWNER', userByEmail: 'admin@example.com' },
      { role: 'WRITER', userByEmail: 'ml-team@example.com' },
    ],
    tables: [
      {
        id: 'training_data',
        friendlyName: 'Training Data',
        numRows: '1234567',
        numBytes: '23456780000',
        type: 'TABLE',
        schema: {
          fields: [
            { name: 'feature_1', type: 'FLOAT', mode: 'REQUIRED' },
            { name: 'feature_2', type: 'FLOAT', mode: 'REQUIRED' },
            { name: 'target', type: 'FLOAT', mode: 'REQUIRED' },
            { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
          ],
        },
      },
    ],
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'default-project';
    const includeTables = searchParams.get('includeTables') === 'true';

    let datasets = [...mockDatasets];

    if (!includeTables) {
      datasets = datasets.map(dataset => ({
        ...dataset,
        tables: undefined,
      }));
    }

    const response = {
      projectId,
      datasets,
      totalDatasets: datasets.length,
      totalTables: mockDatasets.reduce((sum, dataset) => sum + dataset.tables.length, 0),
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('BigQuery Datasets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BigQuery datasets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      datasetId,
      friendlyName,
      description,
      location = 'australia-southeast2',
      access = [],
    } = body;

    if (!datasetId) {
      return NextResponse.json({ error: 'Dataset ID is required' }, { status: 400 });
    }

    // Check if dataset already exists
    const existingDataset = mockDatasets.find(ds => ds.id === datasetId);
    if (existingDataset) {
      return NextResponse.json(
        { error: 'Dataset with this ID already exists' },
        { status: 409 }
      );
    }

    const newDataset = {
      id: datasetId,
      friendlyName: friendlyName || datasetId,
      description: description || '',
      location,
      creationTime: new Date().toISOString(),
      lastModifiedTime: new Date().toISOString(),
      access: access.length > 0 ? access : [
        { role: 'OWNER', userByEmail: session.user?.email || 'user@example.com' },
      ],
      tables: [],
    };

    return NextResponse.json(newDataset, { status: 201 });
  } catch (error) {
    console.error('BigQuery Dataset creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create BigQuery dataset' },
      { status: 500 }
    );
  }
}