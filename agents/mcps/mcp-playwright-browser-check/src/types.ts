export type PageResult = {
  url: string;
  title: string;
  httpStatus: number | null;
  ok: boolean;
  error?: string;
};

export type BaselineFile = {
  uris: string[];
  lastUpdated: string;
};

export type ScanReport = {
  status: "ok" | "auth_required" | "error";
  message: string;
  entryUrl: string;
  finalUrl?: string;
  title?: string;
  httpStatus?: number | null;
  authType?: string;
  scannedAt: string;
  reportDir?: string;
  pagesScanned: number;
  allUris: PageResult[];
  newFeatureUris: string[];
  summary: string;
  runNumber?: number;
  bugReport?: {
    runNumber: number;
    bugCount: number;
    status: "no_bugs" | "has_bugs";
    summary: string;
  };
};
