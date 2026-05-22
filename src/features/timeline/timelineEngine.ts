import type { TimelineAssignment } from "@/types/bisma";

export type TimelineCell = {
  date: string;
  markers: string[];
  assignmentIds: string[];
  hasConflict: boolean;
};

export type TimelineRow = {
  id: string;
  label: string;
  detail: string;
  hp: number;
  expectedHp: number;
  cells: TimelineCell[];
  warnings: { stage: string; costsheetId?: string; message: string }[];
  assignment?: TimelineAssignment;
};

export type TimelineModel = {
  dates: string[];
  assignmentRows: TimelineRow[];
  employeeRows: TimelineRow[];
  warnings: { stage: string; costsheetId?: string; message: string }[];
};

export type BuildTimelineOptions = {
  startDate?: string;
  endDate?: string;
  includeAssignments?: boolean;
  includeEmployees?: boolean;
  memberName?: string;
};

export function buildTimeline(
  assignments: TimelineAssignment[],
  options: BuildTimelineOptions = {},
): TimelineModel {
  const dates = getTimelineDates(assignments, options);
  const dateSet = new Set(dates);
  const includeAssignments = options.includeAssignments ?? true;
  const includeEmployees = options.includeEmployees ?? true;

  const assignmentRows = includeAssignments ? assignments.map((assignment) => {
    const markersByDate = new Map<string, string[]>();
    const assignmentIdsByDate = new Map<string, string[]>();
    const marker = markerForAssignment(assignment.no);
    const members = timelineMembers(assignment, options.memberName);

    for (const member of members) {
      for (const date of expandDates(member.startDate, member.endDate)) {
        if (!dateSet.has(date)) continue;
        pushUnique(markersByDate, date, marker);
        pushUnique(assignmentIdsByDate, date, assignment.costsheetId);
      }
    }

    const expectedHp = members.reduce(
      (maxHp, member) => Math.max(maxHp, member.hp || 0),
      0,
    );
    return makeRow({
      id: `assignment-${assignment.costsheetId}`,
      label: `No. ${assignment.no}`,
      detail: `${assignment.costsheetId} - ${assignment.description}`,
      expectedHp,
      dates,
      markersByDate,
      assignmentIdsByDate,
      assignment,
    });
  }) : [];

  const employeeRows = includeEmployees
    ? buildEmployeeRows(assignments, dates, dateSet, options.memberName)
    : [];
  const warnings = [...assignmentRows, ...employeeRows].flatMap((row) => row.warnings);

  return {
    dates,
    assignmentRows,
    employeeRows,
    warnings,
  };
}

export function markerForAssignment(no: number): string {
  return String(no);
}

export function expandDates(startDate?: string, endDate?: string): string[] {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function buildEmployeeRows(
  assignments: TimelineAssignment[],
  dates: string[],
  dateSet: Set<string>,
  memberName?: string,
): TimelineRow[] {
  const employeeMaps = new Map<string, Map<string, string[]>>();
  const employeeAssignments = new Map<string, Map<string, string[]>>();
  const employeeHp = new Map<string, number>();

  for (const assignment of assignments) {
    const marker = markerForAssignment(assignment.no);
    for (const member of timelineMembers(assignment, memberName)) {
      const name = member.employeeName || "Tanpa nama";
      const markersByDate = employeeMaps.get(name) ?? new Map<string, string[]>();
      const assignmentIdsByDate = employeeAssignments.get(name) ?? new Map<string, string[]>();
      for (const date of expandDates(member.startDate, member.endDate)) {
        if (!dateSet.has(date)) continue;
        push(markersByDate, date, marker);
        pushUnique(assignmentIdsByDate, date, assignment.costsheetId);
      }
      employeeMaps.set(name, markersByDate);
      employeeAssignments.set(name, assignmentIdsByDate);
      employeeHp.set(name, (employeeHp.get(name) ?? 0) + (member.hp || 0));
    }
  }

  return [...employeeMaps.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([employeeName, markersByDate]) =>
      makeRow({
        id: `employee-${employeeName}`,
        label: employeeName,
        detail: "Pegawai",
        expectedHp: employeeHp.get(employeeName) ?? 0,
        dates,
        markersByDate,
        assignmentIdsByDate: employeeAssignments.get(employeeName) ?? new Map<string, string[]>(),
      }),
    );
}

function makeRow({
  id,
  label,
  detail,
  expectedHp,
  dates,
  markersByDate,
  assignmentIdsByDate,
  assignment,
}: {
  id: string;
  label: string;
  detail: string;
  expectedHp: number;
  dates: string[];
  markersByDate: Map<string, string[]>;
  assignmentIdsByDate: Map<string, string[]>;
  assignment?: TimelineAssignment;
}): TimelineRow {
  const cells = dates.map((date) => {
    const markers = markersByDate.get(date) ?? [];
    const assignmentIds = assignmentIdsByDate.get(date) ?? [];
    return {
      date,
      markers,
      assignmentIds,
      hasConflict: new Set(assignmentIds).size > 1,
    };
  });
  const hp = cells.filter((cell) => cell.markers.length > 0).length;
  const warnings =
    expectedHp > 0 && hp !== expectedHp
      ? [
          {
            stage: "hp-check",
            costsheetId: assignment?.costsheetId,
            message: `${label}: marker count ${hp} differs from HP ${expectedHp}.`,
          },
        ]
      : [];

  return {
    id,
    label,
    detail,
    hp,
    expectedHp,
    cells,
    warnings,
    assignment,
  };
}

function getTimelineDates(assignments: TimelineAssignment[], options: BuildTimelineOptions) {
  if (options.startDate && options.endDate) return expandDates(options.startDate, options.endDate);

  const allDates = assignments.flatMap((assignment) => [
    assignment.startDate,
    assignment.endDate,
    ...assignment.members.flatMap((member) => [member.startDate, member.endDate]),
  ]);
  const validDates = allDates.filter(isIsoDate).sort();
  if (!validDates.length) return [];
  return expandDates(validDates[0], validDates[validDates.length - 1]);
}

function timelineMembers(assignment: TimelineAssignment, memberName?: string) {
  return assignment.members.filter((member) => {
    if (memberName && member.employeeName !== memberName) return false;
    return Number.isFinite(member.hp) && member.hp > 0;
  });
}

function push(map: Map<string, string[]>, key: string, value: string) {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}

function pushUnique(map: Map<string, string[]>, key: string, value: string) {
  const values = map.get(key) ?? [];
  if (!values.includes(value)) values.push(value);
  map.set(key, values);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
