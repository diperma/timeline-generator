import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TimelineAssignment } from "@/types/bisma";

export function AssignmentDetail({ assignment }: { assignment: TimelineAssignment }) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <div className="flex flex-wrap gap-2">
        <Badge>{assignment.costsheetId}</Badge>
        {assignment.statusLabel && <Badge variant="secondary">{assignment.statusLabel}</Badge>}
        {assignment.sourceType && <Badge variant="outline">{assignment.sourceType}</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <DetailLine label="Nomor ST" value={assignment.nomorSt} />
          <DetailLine label="PKPT" value={assignment.pkptId} />
          <DetailLine label="Tanggal mulai" value={assignment.startDate} />
          <DetailLine label="Tanggal selesai" value={assignment.endDate} />
          <DetailLine label="MAK" value={assignment.mak} />
          <DetailLine label="Akun" value={assignment.kdakun} />
          <DetailLine label="Beban" value={assignment.bebanAnggaran} />
          <DetailLine label="Total biaya" value={formatRupiah(assignment.totalCost || 0)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anggota Tim</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-56">Nama</TableHead>
                <TableHead className="min-w-72">Peran</TableHead>
                <TableHead className="min-w-40">Tanggal</TableHead>
                <TableHead>HP</TableHead>
                <TableHead className="min-w-44">Kota</TableHead>
                <TableHead className="min-w-32 text-right">UANG HARIAN</TableHead>
                <TableHead className="min-w-32 text-right">PENGINAPAN</TableHead>
                <TableHead className="min-w-32 text-right">Taxi Bandara</TableHead>
                <TableHead className="min-w-32 text-right">Angkutan Laut</TableHead>
                <TableHead className="min-w-36 text-right">Transportasi Udara</TableHead>
                <TableHead className="min-w-36 text-right">Transportasi Darat</TableHead>
                <TableHead className="min-w-24 text-right">DLL</TableHead>
                <TableHead className="min-w-32 text-right">REPRESENTASI</TableHead>
                <TableHead className="min-w-32 text-right">JUMLAH</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignment.members.map((member) => (
                <TableRow key={`${member.employeeName}-${member.startDate}-${member.endDate}`}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.employeeName}</span>
                      <span className="text-xs text-muted-foreground">{member.nip}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{member.role || "-"}</span>
                      <span className="text-xs text-muted-foreground">{member.grade || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {member.startDate} - {member.endDate}
                  </TableCell>
                  <TableCell>{member.hp}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{member.originCity || "-"}</span>
                      <span className="text-xs text-muted-foreground">{member.destinationCity || "-"}</span>
                    </div>
                  </TableCell>
                  <MoneyCell value={member.costBreakdown?.dailyAllowance} />
                  <MoneyCell value={member.costBreakdown?.lodging} />
                  <MoneyCell value={member.costBreakdown?.airportTaxi} />
                  <MoneyCell value={member.costBreakdown?.seaTransport} />
                  <MoneyCell value={member.costBreakdown?.airTransport} />
                  <MoneyCell value={member.costBreakdown?.groundTransport} />
                  <MoneyCell value={member.costBreakdown?.other} />
                  <MoneyCell value={member.costBreakdown?.representation} />
                  <MoneyCell value={member.costBreakdown?.total ?? member.totalCost} className="font-medium" />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MoneyCell({ value, className = "" }: { value?: number; className?: string }) {
  return (
    <TableCell className={`whitespace-nowrap text-right tabular-nums ${className}`}>
      {formatRupiah(value || 0)}
    </TableCell>
  );
}

function DetailLine({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span>{value || "-"}</span>
    </div>
  );
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
