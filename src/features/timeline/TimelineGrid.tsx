import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { TimelineAssignment } from "@/types/bisma";
import type { TimelineRow } from "./timelineEngine";

const MARKER_COLORS = [
  "bg-chart-1 text-white",
  "bg-chart-2 text-white",
  "bg-chart-3 text-white",
  "bg-chart-4 text-white",
  "bg-chart-5 text-white",
  "bg-primary text-primary-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-foreground",
];

type MonthGroup = {
  label: string;
  count: number;
  monthIndex: number;
};

export function TimelineGrid({
  assignmentById,
  title,
  description,
  dates,
  rows,
  controls,
  onOpenAssignment,
}: {
  assignmentById: Map<string, TimelineAssignment>;
  title: string;
  description: string;
  dates: string[];
  rows: TimelineRow[];
  controls?: ReactNode;
  onOpenAssignment: (assignment: TimelineAssignment) => void;
}) {
  const monthGroups = groupDatesByMonth(dates);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="secondary">{rows.length} baris</Badge>
        </div>
        {controls}
      </CardHeader>
      <CardContent>
        {!dates.length || !rows.length ? (
          <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Tidak ada data sesuai filter.
          </div>
        ) : (
          <ScrollArea className="w-full rounded-md border">
            <div
              className="timeline-grid"
              style={{ gridTemplateColumns: `240px 64px repeat(${dates.length}, 36px)` }}
            >
              <div className="timeline-sticky timeline-head-cell" />
              <div className="timeline-head-cell" />
              {monthGroups.map((group) => (
                <div
                  key={`${group.label}-${group.count}`}
                  className="timeline-month-band"
                  style={{ gridColumn: `span ${group.count}` }}
                >
                  {group.label}
                </div>
              ))}

              <div className="timeline-sticky timeline-head-cell">Nama</div>
              <div className="timeline-head-cell">HP</div>
              {dates.map((date) => (
                <div className={`timeline-head-cell ${isWeekend(date) ? "is-weekend" : ""}`} key={date}>
                  <span>{new Date(`${date}T00:00:00`).getDate()}</span>
                  <small>{shortMonth(date)}</small>
                </div>
              ))}

              {rows.map((row) => (
                <TimelineDataRow
                  assignmentById={assignmentById}
                  key={row.id}
                  row={row}
                  onOpenAssignment={onOpenAssignment}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function TimelineDataRow({
  assignmentById,
  row,
  onOpenAssignment,
}: {
  assignmentById: Map<string, TimelineAssignment>;
  row: TimelineRow;
  onOpenAssignment: (assignment: TimelineAssignment) => void;
}) {
  return (
    <>
      <button
        className="timeline-sticky timeline-label text-left"
        disabled={!row.assignment}
        onClick={() => row.assignment && onOpenAssignment(row.assignment)}
        title={row.detail}
      >
        <strong>{row.label}</strong>
        <small>{row.detail}</small>
      </button>
      <div className={row.hp === row.expectedHp ? "timeline-hp" : "timeline-hp is-warning"}>
        {row.hp}
      </div>
      {row.cells.map((cell) => (
        <button
          className={[
            "timeline-cell",
            cell.assignmentIds.length ? "is-clickable" : "",
            cell.hasConflict ? "is-conflict" : "",
            isWeekend(cell.date) ? "is-weekend" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={!cell.assignmentIds.length}
          key={`${row.id}-${cell.date}`}
          onClick={() => {
            const assignment = assignmentById.get(cell.assignmentIds[0]);
            if (assignment) onOpenAssignment(assignment);
          }}
          title={cell.assignmentIds.length ? `Buka detail ${cell.assignmentIds[0]}` : undefined}
        >
          {cell.markers.slice(0, 2).map((marker) => (
            <span className={markerClass(marker)} key={`${cell.date}-${marker}`}>
              {marker}
            </span>
          ))}
          {cell.markers.length > 2 && <span className="bg-destructive text-destructive-foreground">+</span>}
        </button>
      ))}
    </>
  );
}

function groupDatesByMonth(dates: string[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let current: MonthGroup | null = null;
  for (const date of dates) {
    const parsed = new Date(`${date}T00:00:00`);
    const monthIndex = parsed.getMonth();
    const label = new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit" }).format(parsed);
    if (current && current.monthIndex === monthIndex) {
      current.count += 1;
    } else {
      current = { label, count: 1, monthIndex };
      groups.push(current);
    }
  }
  return groups;
}

function isWeekend(date: string) {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

function shortMonth(date: string) {
  return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(`${date}T00:00:00`));
}

function markerClass(marker: string) {
  const index = (Number.parseInt(marker, 10) - 1) % MARKER_COLORS.length;
  return MARKER_COLORS[index] ?? MARKER_COLORS[0];
}
