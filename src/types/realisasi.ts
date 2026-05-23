export type RealisasiWarning = {
  stage: string;
  rowNo?: number;
  message: string;
};

export type RealisasiTotals = {
  pagu: number;
  rupiahUnit: number;
  blokir: number;
  draft: number;
  realisasi: number;
  sp2d: number;
  outstanding: number;
  selisihLs: number;
  availableAfterRealisasi: number;
  realisasiPct: number;
  sp2dPct: number;
  draftPct: number;
};

export type RealisasiItem = {
  rowNo: number;
  bagipaguId?: string;
  kdindex?: string;
  year?: string;
  programCode?: string;
  activityCode?: string;
  outputCode?: string;
  suboutputCode?: string;
  componentCode?: string;
  subcomponentCode?: string;
  accountCode?: string;
  accountName?: string;
  satkerCode?: string;
  satkerName?: string;
  unitCode?: string;
  unitId?: string;
  unitE2Code?: string;
  unitE2Name?: string;
  unitE3Code?: string;
  unitE3Name?: string;
  label?: string;
  pagu: number;
  rupiahUnit: number;
  blokir: number;
  draft: number;
  realisasi: number;
  sp2d: number;
  outstanding: number;
  selisihLs: number;
  availableAfterRealisasi: number;
  realisasiPct: number;
  sp2dPct: number;
  draftPct: number;
};

export type RealisasiPayload = {
  source: "bisma";
  year: string;
  syncedAt: string;
  obtainedAt?: string;
  publishedAt?: string;
  publicSnapshot?: boolean;
  count: number;
  recordsTotal?: number;
  recordsFiltered?: number;
  cacheHit?: boolean;
  totals: RealisasiTotals;
  items: RealisasiItem[];
  warnings: RealisasiWarning[];
};

export type RealisasiSyncResponse = {
  ok: true;
  count: number;
  recordsTotal: number;
  recordsFiltered: number;
  syncedAt: string;
  warnings: RealisasiWarning[];
};
