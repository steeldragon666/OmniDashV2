import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BigQuery } from '@google-cloud/bigquery';
import { googleCloudConfig } from '@/lib/config';

// Initialize BigQuery client
function createBigQueryClient() {
  if (!googleCloudConfig.projectId || !googleCloudConfig.keyFilename) {
    throw new Error('BigQuery configuration missing. Please set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS');
  }

  return new BigQuery({
    projectId: googleCloudConfig.projectId,
    keyFilename: googleCloudConfig.keyFilename,
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || googleCloudConfig.projectId;
    const includeTables = searchParams.get('includeTables') === 'true';

    const bigquery = createBigQueryClient();

    // Get all datasets from BigQuery
    const [datasets] = await bigquery.getDatasets({ projectId });

    const datasetList = await Promise.all(
      datasets.map(async (dataset) => {
        const [metadata] = await dataset.getMetadata();
        const datasetInfo = {
          id: metadata.datasetReference.datasetId,
          friendlyName: metadata.friendlyName || metadata.datasetReference.datasetId,
          description: metadata.description || '',
          location: metadata.location,
          creationTime: new Date(parseInt(metadata.creationTime)).toISOString(),
          lastModifiedTime: new Date(parseInt(metadata.lastModifiedTime)).toISOString(),
          access: metadata.access || [],
          tables: [] as any[],
        };

        if (includeTables) {
          try {
            const [tables] = await dataset.getTables();
            datasetInfo.tables = await Promise.all(
              tables.map(async (table) => {
                const [tableMetadata] = await table.getMetadata();
                return {
                  id: tableMetadata.tableReference.tableId,
                  friendlyName: tableMetadata.friendlyName || tableMetadata.tableReference.tableId,
                  numRows: tableMetadata.numRows || '0',
                  numBytes: tableMetadata.numBytes || '0',
                  type: tableMetadata.type || 'TABLE',
                  schema: tableMetadata.schema,
                };
              })
            );
          } catch (tableError) {
            console.warn(`Failed to fetch tables for dataset ${datasetInfo.id}:`, tableError);
          }
        }

        return datasetInfo;
      })
    );

    const response = {
      projectId,
      datasets: datasetList,
      totalDatasets: datasetList.length,
      totalTables: datasetList.reduce((sum, dataset) => sum + dataset.tables.length, 0),
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('BigQuery Datasets error:', error);

    if (error instanceof Error) {
      if (error.message.includes('configuration missing')) {
        return NextResponse.json(
          {
            error: 'BigQuery not configured',
            message: 'Please configure Google Cloud credentials and project ID',
            requiredEnvVars: ['GOOGLE_CLOUD_PROJECT_ID', 'GOOGLE_APPLICATION_CREDENTIALS']
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch BigQuery datasets',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
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

    const bigquery = createBigQueryClient();
    const projectId = googleCloudConfig.projectId;

    // Check if dataset already exists
    try {
      const dataset = bigquery.dataset(datasetId);
      const [exists] = await dataset.exists();
      if (exists) {
        return NextResponse.json(
          { error: 'Dataset with this ID already exists' },
          { status: 409 }
        );
      }
    } catch (checkError) {
      console.warn('Error checking dataset existence:', checkError);
    }

    // Create the dataset
    const options = {
      location,
      friendlyName: friendlyName || datasetId,
      description: description || '',
      access: access.length > 0 ? access : [
        {
          role: 'OWNER',
          userByEmail: session.user?.email || 'unknown@example.com'
        },
      ],
    };

    const [dataset] = await bigquery.createDataset(datasetId, options);
    const [metadata] = await dataset.getMetadata();

    const newDataset = {
      id: metadata.datasetReference.datasetId,
      friendlyName: metadata.friendlyName || metadata.datasetReference.datasetId,
      description: metadata.description || '',
      location: metadata.location,
      creationTime: new Date(parseInt(metadata.creationTime)).toISOString(),
      lastModifiedTime: new Date(parseInt(metadata.lastModifiedTime)).toISOString(),
      access: metadata.access || [],
      tables: [],
    };

    return NextResponse.json(newDataset, { status: 201 });
  } catch (error) {
    console.error('BigQuery Dataset creation error:', error);

    if (error instanceof Error) {
      if (error.message.includes('configuration missing')) {
        return NextResponse.json(
          {
            error: 'BigQuery not configured',
            message: 'Please configure Google Cloud credentials and project ID'
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to create BigQuery dataset',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}