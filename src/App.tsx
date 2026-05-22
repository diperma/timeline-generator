import { useEffect, useMemo, useState } from "react";
import {
  AlertCircleIcon,
  CalendarDaysIcon,
  ChevronsUpDownIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
  SearchIcon,
  UsersIcon,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchTimeline, isStaticTimelineMode, syncTimeline } from "@/lib/bismaApi";
import type { TimelineAssignment, TimelinePayload } from "@/types/bisma";
import { buildTimeline } from "@/features/timeline/timelineEngine";
import { TimelineGrid } from "@/features/timeline/TimelineGrid";
import { AssignmentDetail } from "@/features/timeline/AssignmentDetail";
import { cn } from "@/lib/utils";

type LoadState = "idle" | "loading" | "refreshing" | "error" | "ready";
type TimelineTab = "assignments" | "employees" | "warnings";

const ALL = "__all__";
const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

export default function App() {
  const [payload, setPayload] = useState<TimelinePayload | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(ALL);
  const [assignmentNo, setAssignmentNo] = useState(ALL);
  const [member, setMember] = useState(ALL);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [activeTab, setActiveTab] = useState<TimelineTab>("assignments");
  const [selected, setSelected] = useState<TimelineAssignment | null>(null);

  async function load(force = false) {
    setLoadState(payload ? "refreshing" : "loading");
    setError("");
    try {
      const next = force ? await syncTimeline() : await fetchTimeline();
      setPayload(next);
      setLoadState("ready");
    } catch (loadError) {
      setLoadState("error");
      setError(loadError instanceof Error ? loadError.message : "Could not load timeline data.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filterOptions = useMemo(() => getFilterOptions(payload?.assignments ?? []), [payload]);
  useEffect(() => {
    if (month === ALL) return;
    if (!filterOptions.months.length) return;
    const hasSelectedMonth = filterOptions.months.some((option) => option.value === month);
    if (!hasSelectedMonth) setMonth(filterOptions.months[filterOptions.months.length - 1].value);
  }, [filterOptions.months, month]);

  const assignments = useMemo(
    () => filterAssignments(payload?.assignments ?? [], { assignmentNo, query, status, member, month }),
    [assignmentNo, payload, query, status, member, month],
  );
  const dateWindow = useMemo(() => monthToDateWindow(month), [month]);
  const model = useMemo(
    () =>
      buildTimeline(assignments, {
        ...dateWindow,
        includeAssignments: activeTab === "assignments",
        includeEmployees: activeTab === "employees",
        memberName: member === ALL ? undefined : member,
      }),
    [activeTab, assignments, dateWindow, member],
  );
  const stats = useMemo(() => getStats(assignments), [assignments]);
  const assignmentById = useMemo(
    () => new Map(assignments.map((assignment) => [assignment.costsheetId, assignment])),
    [assignments],
  );
  const filterControls = (
    <FilterControls
      filterOptions={filterOptions}
      assignmentNo={assignmentNo}
      member={member}
      month={month}
      query={query}
      setAssignmentNo={setAssignmentNo}
      setMember={setMember}
      setMonth={setMonth}
      setQuery={setQuery}
      setStatus={setStatus}
      status={status}
    />
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex max-w-[1800px] flex-col gap-4 p-4 lg:p-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              BISMA Timeline Generator
            </p>
            <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
              Kalender Penugasan dan Beban Pegawai
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {isStaticTimelineMode
                ? "Data bersumber dari snapshot publik Supabase yang diterbitkan oleh sinkronisasi lokal."
                : "Data bersumber dari backend BISMA adapter. Browser hanya membaca endpoint lokal aplikasi ini, tanpa kredensial atau cookie BISMA."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Tahun {payload?.year ?? "2026"}</Badge>
            <Badge variant="secondary">
              Data diperoleh {formatDateTime(payload?.obtainedAt || payload?.syncedAt)}
            </Badge>
            <Badge variant={payload?.warnings.length ? "outline" : "secondary"}>
              {payload?.warnings.length ?? 0} warnings
            </Badge>
            <Button disabled={loadState === "loading" || loadState === "refreshing"} onClick={() => load(true)}>
              <RefreshCwIcon data-icon="inline-start" />
              {isStaticTimelineMode ? "Reload" : "Sync"}
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Timeline belum bisa dimuat</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="grid gap-3 md:grid-cols-4">
          <Metric title="Penugasan" value={assignments.length} icon={<CalendarDaysIcon />} />
          <Metric title="Pegawai" value={stats.employeeCount} icon={<UsersIcon />} />
          <Metric title="Total HP" value={stats.totalHp} icon={<CheckCircle2Icon />} />
          <Metric title="Total Biaya" value={formatRupiah(stats.totalCost)} icon={<CalendarDaysIcon />} />
        </section>

        {loadState === "loading" && <TimelineSkeleton />}

        {payload && (
          <Tabs className="flex flex-col gap-3" value={activeTab} onValueChange={(value) => setActiveTab(value as TimelineTab)}>
            <TabsList className="w-fit">
              <TabsTrigger value="assignments">Penugasan</TabsTrigger>
              <TabsTrigger value="employees">Pegawai</TabsTrigger>
              <TabsTrigger value="warnings">Warnings</TabsTrigger>
            </TabsList>
            <TabsContent value="assignments">
              <TimelineGrid
                assignmentById={assignmentById}
                dates={model.dates}
                rows={model.assignmentRows}
                title="Penugasan"
                description={`${assignments.length} penugasan dari ${payload.count} data timeline`}
                controls={filterControls}
                onOpenAssignment={setSelected}
              />
            </TabsContent>
            <TabsContent value="employees">
              <TimelineGrid
                assignmentById={assignmentById}
                dates={model.dates}
                rows={model.employeeRows}
                title="Pegawai"
                description="Beban pegawai berdasarkan rentang tanggal anggota tim"
                controls={filterControls}
                onOpenAssignment={setSelected}
              />
            </TabsContent>
            <TabsContent value="warnings">
              <WarningsPanel warnings={[...payload.warnings, ...model.warnings]} />
            </TabsContent>
          </Tabs>
        )}
      </section>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{selected?.nomorSt || selected?.costsheetId}</SheetTitle>
            <SheetDescription>{selected?.description}</SheetDescription>
          </SheetHeader>
          {selected && <AssignmentDetail assignment={selected} />}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function Metric({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-80 w-full" />
      </CardContent>
    </Card>
  );
}

function FilterControls({
  assignmentNo,
  filterOptions,
  member,
  month,
  query,
  setAssignmentNo,
  setMember,
  setMonth,
  setQuery,
  setStatus,
  status,
}: {
  assignmentNo: string;
  filterOptions: ReturnType<typeof getFilterOptions>;
  member: string;
  month: string;
  query: string;
  setAssignmentNo: (value: string) => void;
  setMember: (value: string) => void;
  setMonth: (value: string) => void;
  setQuery: (value: string) => void;
  setStatus: (value: string) => void;
  status: string;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(150px,1fr))]">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Cari ST, costsheet, uraian, pegawai"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={ALL}>Semua status</SelectItem>
            {filterOptions.statuses.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <SearchableFilter
        allLabel="Semua penugasan"
        emptyText="Penugasan tidak ditemukan."
        options={filterOptions.assignments}
        placeholder="Cari penugasan"
        searchPlaceholder="Ketik nomor atau costsheet..."
        value={assignmentNo}
        onChange={setAssignmentNo}
      />
      <SearchableFilter
        allLabel="Semua pegawai"
        emptyText="Pegawai tidak ditemukan."
        options={filterOptions.members.map((name) => ({ label: name, value: name }))}
        placeholder="Cari pegawai"
        searchPlaceholder="Ketik nama pegawai..."
        value={member}
        onChange={setMember}
      />
      <Select value={month} onValueChange={setMonth}>
        <SelectTrigger>
          <SelectValue placeholder="Bulan" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={ALL}>Semua bulan</SelectItem>
            {filterOptions.months.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function SearchableFilter({
  allLabel,
  emptyText,
  options,
  placeholder,
  searchPlaceholder,
  value,
  onChange,
}: {
  allLabel: string;
  emptyText: string;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  searchPlaceholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = value === ALL ? allLabel : options.find((option) => option.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="justify-between overflow-hidden"
          role="combobox"
          variant="outline"
        >
          <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                data-checked={value === ALL}
                keywords={[allLabel]}
                value={allLabel}
                onSelect={() => {
                  onChange(ALL);
                  setOpen(false);
                }}
              >
                {allLabel}
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  data-checked={value === option.value}
                  key={option.value}
                  keywords={[option.value, option.label]}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function WarningsPanel({ warnings }: { warnings: TimelinePayload["warnings"] }) {
  if (!warnings.length) {
    return (
      <Alert>
        <CheckCircle2Icon />
        <AlertTitle>Tidak ada warning</AlertTitle>
        <AlertDescription>Data timeline siap dipakai.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Warnings</CardTitle>
        <CardDescription>{warnings.length} catatan perlu ditinjau.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {warnings.map((warning, index) => (
          <div key={`${warning.stage}-${warning.costsheetId}-${index}`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">{warning.stage}</Badge>
              {warning.costsheetId && <span className="font-medium">{warning.costsheetId}</span>}
              <span className="text-muted-foreground">{warning.message}</span>
            </div>
            {index < warnings.length - 1 && <Separator className="mt-3" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function getFilterOptions(assignments: TimelineAssignment[]) {
  const assignmentOptions = new Map<string, string>();
  const statuses = new Map<string, string>();
  const members = new Set<string>();
  const months = new Map<string, string>();

  for (const assignment of assignments) {
    assignmentOptions.set(String(assignment.no), `No. ${assignment.no} - ${assignment.costsheetId}`);
    if (assignment.statusCode) {
      statuses.set(
        assignment.statusCode,
        assignment.statusLabel
          ? `${assignment.statusCode} - ${assignment.statusLabel}`
          : assignment.statusCode,
      );
    }
    for (const member of assignment.members) {
      if (member.employeeName) members.add(member.employeeName);
      for (const date of [member.startDate, member.endDate, assignment.startDate, assignment.endDate]) {
        if (!date) continue;
        const value = date.slice(0, 7);
        months.set(value, monthLabel(value));
      }
    }
  }

  return {
    assignments: [...assignmentOptions.entries()]
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([value, label]) => ({ value, label })),
    statuses: [...statuses.entries()].map(([value, label]) => ({ value, label })),
    members: [...members].sort((a, b) => a.localeCompare(b)),
    months: [...months.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([value, label]) => ({ value, label })),
  };
}

function filterAssignments(
  assignments: TimelineAssignment[],
  filters: { assignmentNo: string; query: string; status: string; member: string; month: string },
) {
  const needle = filters.query.trim().toLowerCase();
  return assignments.filter((assignment) => {
    const searchable = [
      assignment.costsheetId,
      assignment.nomorSt,
      assignment.description,
      assignment.pkptId,
      ...assignment.members.flatMap((member) => [member.employeeName, member.nip, member.role]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesQuery = !needle || searchable.includes(needle);
    const matchesStatus = filters.status === ALL || assignment.statusCode === filters.status;
    const matchesAssignment = filters.assignmentNo === ALL || String(assignment.no) === filters.assignmentNo;
    const window = monthToDateWindow(filters.month);
    const relevantMembers = assignment.members.filter((assignmentMember) => {
      if (filters.member !== ALL && assignmentMember.employeeName !== filters.member) return false;
      if (filters.month !== ALL) {
        return hasTimelineHp(assignmentMember) &&
          overlapsWindow(assignmentMember.startDate, assignmentMember.endDate, window);
      }
      return filters.member === ALL || hasTimelineHp(assignmentMember);
    });
    const matchesMember = filters.member === ALL || relevantMembers.length > 0;
    const matchesMonth =
      filters.month === ALL ||
      relevantMembers.length > 0 ||
      (filters.member === ALL && overlapsWindow(assignment.startDate, assignment.endDate, window));

    return matchesQuery && matchesStatus && matchesAssignment && matchesMember && matchesMonth;
  });
}

function hasTimelineHp(member: { hp?: number }) {
  return Number.isFinite(member.hp) && Number(member.hp) > 0;
}

function getStats(assignments: TimelineAssignment[]) {
  const employees = new Set<string>();
  let totalHp = 0;
  let totalCost = 0;
  for (const assignment of assignments) {
    totalCost += assignment.totalCost || 0;
    for (const member of assignment.members) {
      if (member.employeeName) employees.add(member.employeeName);
      totalHp += member.hp || 0;
    }
  }
  return {
    employeeCount: employees.size,
    totalHp,
    totalCost,
  };
}

function monthLabel(value: string) {
  const date = new Date(`${value}-01T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(date);
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function monthToDateWindow(value: string) {
  if (value === ALL) return {};
  const [year, monthValue] = value.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !monthValue) return {};
  const start = new Date(year, monthValue - 1, 1);
  const end = new Date(year, monthValue, 0);
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

function overlapsWindow(
  startDate: string | undefined,
  endDate: string | undefined,
  window: { startDate?: string; endDate?: string },
) {
  if (!startDate || !endDate || !window.startDate || !window.endDate) return false;
  return startDate <= window.endDate && endDate >= window.startDate;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const monthValue = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${monthValue}-${day}`;
}
