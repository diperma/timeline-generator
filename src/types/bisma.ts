export type TimelineWarning = {
  costsheetId?: string;
  stage: string;
  rowNo?: number;
  message: string;
};

export type TimelineMember = {
  employeeName: string;
  nip?: string;
  role?: string;
  grade?: string;
  startDate: string;
  endDate: string;
  hp: number;
  isActive?: boolean;
  noSpd?: string;
  originCity?: string;
  destinationCity?: string;
  costBreakdown?: TimelineCostBreakdown;
  totalCost?: number;
};

export type TimelineCostBreakdown = {
  dailyAllowance?: number;
  lodging?: number;
  airportTaxi?: number;
  seaTransport?: number;
  airTransport?: number;
  groundTransport?: number;
  other?: number;
  representation?: number;
  total?: number;
};

export type TimelineAssignment = {
  no: number;
  source: "bisma";
  costsheetId: string;
  stId?: string;
  nomorSt?: string;
  pkptId?: string;
  sourceType?: string;
  statusCode?: string;
  statusLabel?: string;
  description: string;
  startDate?: string;
  endDate?: string;
  mak?: string;
  kdakun?: string;
  bebanAnggaran?: string;
  totalCost?: number;
  members: TimelineMember[];
};

export type TimelinePayload = {
  source: "bisma";
  year: string;
  syncedAt: string;
  obtainedAt?: string;
  publishedAt?: string;
  dataStartDate?: string;
  dataEndDate?: string;
  publicSnapshot?: boolean;
  count: number;
  listCount?: number;
  detailParsed?: number;
  detailFailed?: number;
  cacheHit?: boolean;
  assignments: TimelineAssignment[];
  warnings: TimelineWarning[];
};

export type SyncResponse = {
  ok: true;
  listCount: number;
  detailParsed: number;
  detailFailed: number;
  syncedAt: string;
  warnings: TimelineWarning[];
};
