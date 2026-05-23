import type { RealisasiItem, RealisasiTotals } from "@/types/realisasi";

export type RealisasiGroupTotals = Pick<
  RealisasiTotals,
  | "availableAfterRealisasi"
  | "blokir"
  | "draft"
  | "outstanding"
  | "pagu"
  | "realisasi"
  | "realisasiPct"
  | "rupiahUnit"
  | "selisihLs"
  | "sp2d"
  | "sp2dPct"
  | "draftPct"
>;

export type RealisasiROGroup = {
  roKey: string;
  roCode: string;
  roLabel: string;
  programCode?: string;
  activityCode?: string;
  outputCode?: string;
  suboutputCode?: string;
  componentCodes: string[];
  itemCount: number;
  items: RealisasiItem[];
  totals: RealisasiGroupTotals;
};

export type RealisasiJenisBelanjaGroup = {
  jenisKey: string;
  jenisCode: string;
  jenisLabel: string;
  itemCount: number;
  items: RealisasiItem[];
  totals: RealisasiGroupTotals;
};

export function buildRealisasiAggregates(items: RealisasiItem[]) {
  return {
    byRO: groupByRO(items),
    byJenisBelanja: groupByJenisBelanja(items),
    totals: summarizeRealisasiItems(items),
  };
}

export function groupByRO(items: RealisasiItem[]): RealisasiROGroup[] {
  const groups = new Map<string, Omit<RealisasiROGroup, "itemCount" | "totals">>();

  for (const item of items) {
    const ro = getRealisasiRO(item);
    const existing = groups.get(ro.roKey);
    if (existing) {
      existing.items.push(item);
      if (item.componentCode && !existing.componentCodes.includes(item.componentCode)) {
        existing.componentCodes.push(item.componentCode);
      }
      continue;
    }

    groups.set(ro.roKey, {
      ...ro,
      programCode: item.programCode,
      activityCode: item.activityCode,
      outputCode: item.outputCode,
      suboutputCode: item.suboutputCode,
      componentCodes: item.componentCode ? [item.componentCode] : [],
      items: [item],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      componentCodes: [...group.componentCodes].sort((left, right) => left.localeCompare(right)),
      itemCount: group.items.length,
      totals: summarizeRealisasiItems(group.items),
    }))
    .sort((left, right) => left.roCode.localeCompare(right.roCode));
}

export function groupByJenisBelanja(items: RealisasiItem[]): RealisasiJenisBelanjaGroup[] {
  const groups = new Map<string, Omit<RealisasiJenisBelanjaGroup, "itemCount" | "totals">>();

  for (const item of items) {
    const jenis = parseJenisBelanja(item.label);
    const existing = groups.get(jenis.jenisKey);
    if (existing) {
      existing.items.push(item);
      continue;
    }

    groups.set(jenis.jenisKey, {
      ...jenis,
      items: [item],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      itemCount: group.items.length,
      totals: summarizeRealisasiItems(group.items),
    }))
    .sort((left, right) => {
      if (left.jenisCode === "unknown") return 1;
      if (right.jenisCode === "unknown") return -1;
      return left.jenisCode.localeCompare(right.jenisCode);
    });
}

export function summarizeRealisasiItems(items: RealisasiItem[]): RealisasiGroupTotals {
  const totals = items.reduce(
    (summary, item) => ({
      pagu: summary.pagu + numberValue(item.pagu),
      rupiahUnit: summary.rupiahUnit + numberValue(item.rupiahUnit),
      blokir: summary.blokir + numberValue(item.blokir),
      draft: summary.draft + numberValue(item.draft),
      realisasi: summary.realisasi + numberValue(item.realisasi),
      sp2d: summary.sp2d + numberValue(item.sp2d),
      outstanding: summary.outstanding + numberValue(item.outstanding),
      selisihLs: summary.selisihLs + numberValue(item.selisihLs),
    }),
    {
      pagu: 0,
      rupiahUnit: 0,
      blokir: 0,
      draft: 0,
      realisasi: 0,
      sp2d: 0,
      outstanding: 0,
      selisihLs: 0,
    },
  );

  return {
    ...totals,
    availableAfterRealisasi: totals.pagu - totals.realisasi - totals.outstanding,
    realisasiPct: percent(totals.realisasi, totals.pagu),
    sp2dPct: percent(totals.sp2d, totals.pagu),
    draftPct: percent(totals.draft, totals.pagu),
  };
}

export function availableAfterRealisasi(item: Pick<RealisasiItem, "outstanding" | "pagu" | "realisasi">) {
  return numberValue(item.pagu) - numberValue(item.realisasi) - numberValue(item.outstanding);
}

export function getRealisasiRO(item: RealisasiItem) {
  const outputCode = cleanPart(item.outputCode);
  const suboutputCode = cleanPart(item.suboutputCode);
  const kdindexPrefix = cleanPart(item.kdindex?.split(/\s+/)[0]);

  if (outputCode && suboutputCode) {
    const roCode = `${outputCode}.${suboutputCode}`;
    return {
      roKey: roCode,
      roCode,
      roLabel: roCode,
    };
  }

  if (kdindexPrefix) {
    return {
      roKey: kdindexPrefix,
      roCode: kdindexPrefix,
      roLabel: kdindexPrefix,
    };
  }

  return {
    roKey: "unknown",
    roCode: "Tanpa RO",
    roLabel: "Tanpa RO",
  };
}

export function parseJenisBelanja(label?: string) {
  const text = cleanPart(label);
  const match = text.match(/^(\d+)\s*-\s*(.+)$/);
  if (match) {
    return {
      jenisKey: match[1],
      jenisCode: match[1],
      jenisLabel: match[2].trim(),
    };
  }

  if (text) {
    return {
      jenisKey: text,
      jenisCode: text,
      jenisLabel: text,
    };
  }

  return {
    jenisKey: "unknown",
    jenisCode: "unknown",
    jenisLabel: "Tanpa Jenis Belanja",
  };
}

function percent(value: number, total: number) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Number(((value || 0) / total * 100).toFixed(2));
}

function numberValue(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function cleanPart(value?: string) {
  return String(value || "").trim();
}
