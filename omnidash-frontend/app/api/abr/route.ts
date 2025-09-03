import { NextRequest, NextResponse } from 'next/server';

const ABR_API_URL = 'https://abr.business.gov.au/json/';
const ABR_GUID = process.env.ABR_GUID || '';

export async function POST(request: NextRequest) {
  try {
    const { searchTerm, searchType = 'name' } = await request.json();

    if (!searchTerm) {
      return NextResponse.json({ error: 'Search term is required' }, { status: 400 });
    }

    if (!ABR_GUID) {
      return NextResponse.json({ 
        error: 'ABR API not configured',
        message: 'Please configure ABR_GUID environment variable'
      }, { status: 503 });
    }

    // Build ABR API URL based on search type
    let abrUrl: string;
    const encodedSearchTerm = encodeURIComponent(searchTerm);

    switch (searchType) {
      case 'abn':
        abrUrl = `${ABR_API_URL}AbnDetails.aspx?abn=${encodedSearchTerm}&guid=${ABR_GUID}`;
        break;
      case 'acn':
        abrUrl = `${ABR_API_URL}AcnDetails.aspx?acn=${encodedSearchTerm}&guid=${ABR_GUID}`;
        break;
      case 'name':
      default:
        abrUrl = `${ABR_API_URL}MatchingNames.aspx?name=${encodedSearchTerm}&legalName=Y&tradingName=Y&NSW=Y&SA=Y&ACT=Y&VIC=Y&WA=Y&NT=Y&QLD=Y&TAS=Y&guid=${ABR_GUID}`;
        break;
    }

    console.log('ABR API Request:', abrUrl);

    const response = await fetch(abrUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'OmniDash/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`ABR API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform ABR response to a consistent format
    let businesses = [];
    
    if (searchType === 'abn' || searchType === 'acn') {
      // Single business detail response
      if (data.Abn) {
        businesses = [{
          abn: data.Abn,
          acn: data.Acn || '',
          entityName: data.EntityName || '',
          entityTypeName: data.EntityTypeName || '',
          gstRegistered: data.GstStatusText === 'Registered for GST',
          abrEntryDate: data.AbrEntryDate,
          addressState: data.AddressState || '',
          addressPostcode: data.AddressPostcode || '',
          businessNames: data.BusinessName ? [data.BusinessName] : []
        }];
      }
    } else {
      // Name search response
      if (data.Names && Array.isArray(data.Names)) {
        businesses = data.Names.map((business: any) => ({
          abn: business.Abn || '',
          acn: business.Acn || '',
          entityName: business.Name || '',
          entityTypeName: business.EntityTypeName || '',
          gstRegistered: business.GstStatus === 'Registered for GST',
          score: business.Score || 0,
          isCurrentIndicator: business.IsCurrentIndicator === 'Y',
          statesList: business.StatesList || '',
          postcode: business.Postcode || ''
        }));
      }
    }

    return NextResponse.json({
      success: true,
      searchTerm,
      searchType,
      count: businesses.length,
      businesses
    });

  } catch (error) {
    console.error('ABR API Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch from ABR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const abn = searchParams.get('abn');
  const acn = searchParams.get('acn');
  const name = searchParams.get('name');

  if (!abn && !acn && !name) {
    return NextResponse.json({ error: 'ABN, ACN, or name parameter is required' }, { status: 400 });
  }

  const searchTerm = abn || acn || name;
  const searchType = abn ? 'abn' : acn ? 'acn' : 'name';

  // Reuse POST logic
  const mockRequest = {
    json: async () => ({ searchTerm, searchType })
  } as NextRequest;

  return POST(mockRequest);
}