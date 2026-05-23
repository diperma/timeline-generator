import { useEffect, useMemo, useState } from "react";
import {
  AlertCircleIcon,
  BanknoteIcon,
  RefreshCwIcon,
  SearchIcon,
  WalletCardsIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchRealisasi, isStaticRealisasiMode, syncRealisasi } from "@/lib/bismaApi";
import type { RealisasiItem, RealisasiPayload } from "@/types/realisasi";

type LoadState = "idle" | "loading" | "refreshing" | "error" | "ready";

const ALL = "__all__";

export function RealisasiPage() {
  const [payload, setPayload] = useState<RealisasiPayload | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [account, setAccount] = useState(ALL);
  const [program, setProgram] = useState(ALL);
  const [label, setLabel] = useState(ALL);
  const [selected, setSelected] = useState<RealisasiItem | null>(null);

  async function load(force = false) {
    setLoadState(payload ? "refreshing" : "loading");
    setError("");
    try {
      const next = force ? await syncRealisasi() : await fetchRealisasi();
      setPayload(next);
      setLoadState("ready");
    } catch (loadError) {
      setLoadState("error");
      setError(loadError instanceof Error ? loadError.message : "Data realisasi belum bisa dimuat.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const options = useMemo(() => getFilterOptions(payload?.items ?? []), [payload]);
  const items = useMemo(
    () => filterItems(payload?.items ?? [], { account, label, program, query }),
    [account, label, payload, program, query],
  );
  const totals = useMemo(() => summarizeItems(items), [items]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">Anggaran dan Realisasi</h2>
          <p className="text-sm text-muted-foreground">
            {isStaticRealisasiMode
              ? "Data bersumber dari snapshot publik Supabase realisasi."
              : "Data bersumber dari backend BISMA adapter endpoint Anggaran/Realisasi."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Tahun {payload?.year ?? "2026"}</Badge>
          <Badge variant="secondary">Data diperoleh {formatDateTime(payload?.obtainedAt || payload?.syncedAt)}</Badge>
          <Badge variant={payload?.warnings.length ? "outline" : "secondary"}>
            {payload?.warnings.length ?? 0} warnings
          </Badge>
          <Button disabled={loadState === "loading" || loadState === "refreshing"} onClick={() => load(true)}>
            <RefreshCwIcon data-icon="inline-start" />
            {isStaticRealisasiMode ? "Reload" : "Sync"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Realisasi belum bisa dimuat</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loadState === "loading" && <RealisasiSkeleton />}

      {payload && (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <Metric title="Pagu" value={formatRupiah(totals.pagu)} icon={<WalletCardsIcon />} />
            <Metric title="Realisasi" value={formatRupiah(totals.realisasi)} icon={<BanknoteIcon />} />
            <Metric title="Outstanding" value={formatRupiah(totals.outstanding)} icon={<BanknoteIcon />} />
            <Metric title="Sisa Pagu" value={formatRupiah(totals.availableAfterRealisasi)} icon={<WalletCardsIcon />} />
          </section>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>Rincian Realisasi</CardTitle>
                  <CardDescription>
                    {items.length} baris dari {payload.count} data anggaran
                  </CardDescription>
                </div>
                <div className="grid gap-2 md:grid-cols-4">
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Cari akun, kode, unit"
                      value={query}
                    />
                  </div>
                  <FilterSelect label="Akun" options={options.accounts} value={account} onChange={setAccount} />
                  <FilterSelect label="Program" options={options.programs} value={program} onChange={setProgram} />
                  <FilterSelect label="Jenis" options={options.labels} value={label} onChange={setLabel} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-64">Akun</TableHead>
                    <TableHead className="min-w-56">Program/Kegiatan</TableHead>
                    <TableHead className="min-w-48">Komponen</TableHead>
                    <TableHead className="min-w-32 text-right">Pagu</TableHead>
                    <TableHead className="min-w-32 text-right">Draft</TableHead>
                    <TableHead className="min-w-32 text-right">Realisasi</TableHead>
                    <TableHead className="min-w-32 text-right">Outstanding</TableHead>
                    <TableHead className="min-w-32 text-right">SP2D</TableHead>
                    <TableHead className="min-w-32 text-right">Sisa</TableHead>
                    <TableHead className="min-w-24 text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      className="cursor-pointer"
                      key={item.bagipaguId || item.kdindex || item.rowNo}
                      onClick={() => setSelected(item)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.accountCode || "-"}</span>
                          <span className="text-xs text-muted-foreground">{item.accountName || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{joinCodes(item.programCode, item.activityCode, item.outputCode)}</TableCell>
                      <TableCell>{joinCodes(item.suboutputCode, item.componentCode, item.subcomponentCode)}</TableCell>
                      <MoneyCell value={item.pagu} />
                      <MoneyCell value={item.draft} />
                      <MoneyCell value={item.realisasi} />
                      <MoneyCell value={item.outstanding} />
                      <MoneyCell value={item.sp2d} />
                      <MoneyCell value={availableAfterRealisasi(item)} />
                      <TableCell className="text-right tabular-nums">{item.realisasiPct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!items.length && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Tidak ada data realisasi yang cocok dengan filter.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[min(760px,100vw)]">
          <SheetHeader>
            <SheetTitle>{selected?.accountCode || "Rincian Realisasi"}</SheetTitle>
            <SheetDescription>{selected?.accountName}</SheetDescription>
          </SheetHeader>
          {selected && <RealisasiDetail item={selected} />}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={ALL}>{label}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function RealisasiDetail({ item }: { item: RealisasiItem }) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <div className="flex flex-wrap gap-2">
        {item.label && <Badge>{item.label}</Badge>}
        {item.unitCode && <Badge variant="secondary">{item.unitCode}</Badge>}
        {item.year && <Badge variant="outline">{item.year}</Badge>}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Klasifikasi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <DetailLine label="Bagipagu ID" value={item.bagipaguId} />
          <DetailLine label="KD Index" value={item.kdindex} />
          <DetailLine label="Program" value={item.programCode} />
          <DetailLine label="Kegiatan" value={item.activityCode} />
          <DetailLine label="Output" value={item.outputCode} />
          <DetailLine label="Suboutput" value={item.suboutputCode} />
          <DetailLine label="Komponen" value={item.componentCode} />
          <DetailLine label="Subkomponen" value={item.subcomponentCode} />
          <DetailLine label="Satker" value={item.satkerName} />
          <DetailLine label="Unit E2" value={item.unitE2Name} />
          <DetailLine label="Unit E3" value={item.unitE3Name} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Nilai</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <DetailLine label="Pagu" value={formatRupiah(item.pagu)} />
          <DetailLine label="Rupiah Unit" value={formatRupiah(item.rupiahUnit)} />
          <DetailLine label="Blokir" value={formatRupiah(item.blokir)} />
          <DetailLine label="Draft" value={formatRupiah(item.draft)} />
          <DetailLine label="Realisasi" value={formatRupiah(item.realisasi)} />
          <DetailLine label="SP2D" value={formatRupiah(item.sp2d)} />
          <DetailLine label="Outstanding" value={formatRupiah(item.outstanding)} />
          <DetailLine label="Selisih LS" value={formatRupiah(item.selisihLs)} />
          <DetailLine label="Sisa Pagu" value={formatRupiah(availableAfterRealisasi(item))} />
          <DetailLine label="Persentase Realisasi" value={`${item.realisasiPct}%`} />
        </CardContent>
      </Card>
    </div>
  );
}

function MoneyCell({ value }: { value: number }) {
  return <TableCell className="whitespace-nowrap text-right tabular-nums">{formatRupiah(value)}</TableCell>;
}

function DetailLine({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span>{value || "-"}</span>
    </div>
  );
}

function RealisasiSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </CardContent>
    </Card>
  );
}

function getFilterOptions(items: RealisasiItem[]) {
  return {
    accounts: uniqueOptions(items, (item) => item.accountCode, (item) => `${item.accountCode} - ${item.accountName}`),
    programs: uniqueOptions(items, (item) => item.programCode, (item) => item.programCode || ""),
    labels: uniqueOptions(items, (item) => item.label, (item) => item.label || ""),
  };
}

function uniqueOptions(
  items: RealisasiItem[],
  valueGetter: (item: RealisasiItem) => string | undefined,
  labelGetter: (item: RealisasiItem) => string,
) {
  const options = new Map<string, string>();
  for (const item of items) {
    const value = valueGetter(item);
    if (value && !options.has(value)) options.set(value, labelGetter(item));
  }
  return [...options.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([value, optionLabel]) => ({ value, label: optionLabel }));
}

function filterItems(
  items: RealisasiItem[],
  filters: { account: string; label: string; program: string; query: string },
) {
  const query = filters.query.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.account !== ALL && item.accountCode !== filters.account) return false;
    if (filters.program !== ALL && item.programCode !== filters.program) return false;
    if (filters.label !== ALL && item.label !== filters.label) return false;
    if (!query) return true;
    return [
      item.accountCode,
      item.accountName,
      item.kdindex,
      item.programCode,
      item.activityCode,
      item.outputCode,
      item.unitE2Name,
      item.unitE3Name,
      item.label,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
}

function summarizeItems(items: RealisasiItem[]) {
  const totals = items.reduce(
    (summary, item) => ({
      pagu: summary.pagu + item.pagu,
      rupiahUnit: summary.rupiahUnit + item.rupiahUnit,
      blokir: summary.blokir + item.blokir,
      draft: summary.draft + item.draft,
      realisasi: summary.realisasi + item.realisasi,
      sp2d: summary.sp2d + item.sp2d,
      outstanding: summary.outstanding + item.outstanding,
      selisihLs: summary.selisihLs + item.selisihLs,
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

function availableAfterRealisasi(item: Pick<RealisasiItem, "outstanding" | "pagu" | "realisasi">) {
  return item.pagu - item.realisasi - item.outstanding;
}

function percent(value: number, total: number) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Number(((value || 0) / total * 100).toFixed(2));
}

function joinCodes(...values: (string | undefined)[]) {
  const text = values.filter(Boolean).join(" / ");
  return text || "-";
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
