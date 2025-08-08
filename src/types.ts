export type PropertyType = 'rent' | 'sale' | 'both';

export interface AppSettings {
  propertyType: PropertyType;
  zipCodes: string[];
  minBedrooms: number;
  maxPrice: number;
  redFlagDetection: boolean;
  dailyMessageLimit: number;
  messageWindow: [string, string];
  testMode: boolean;
  googleSheetUrl: string;
  zillowLogin?: { email: string; password: string };
}

export interface Listing {
  address: string;
  price: string;
  bedrooms: number;
  ownerName: string;
  link: string;
  type: 'rent' | 'sale';
  redFlagReason?: string;
}

export interface MessageResult {
  address: string;
  status: 'sent' | 'failed';
  reason?: string;
  test?: boolean;
  previewMessage?: string;
  timestamp?: string;
}

export interface LogRow {
  address: string;
  ownerName: string;
  type: 'rent' | 'sale';
  status: 'sent' | 'failed';
  timestamp: string;
  redFlags?: string;
}

export interface ScraperFilters {
  alreadyRented?: boolean;
  noAgents?: boolean;
  duplicatePhotos?: boolean;
}


