import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Phone, Mail } from "lucide-react";
import { CsvDownloadButton } from "./csv-download-button";

interface ContactsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const { q } = await searchParams;
  const search = q?.trim() || "";

  const where = {
    hasContact: true,
    ...(search
      ? { name: { contains: search } }
      : {}),
  };

  const contacts = await prisma.professional.findMany({
    where,
    select: {
      id: true,
      name: true,
      category: true,
      categoryGroup: true,
      currentFacility: true,
      mobileNumber: true,
      personalEmail: true,
      workEmail: true,
    },
    orderBy: { name: "asc" },
  });

  const totalContactable = await prisma.professional.count({
    where: { hasContact: true },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground">
          Outreach-ready contact list for Ethiopian healthcare professionals
        </p>
      </div>

      {/* Header Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">Contactable Professionals</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {totalContactable.toLocaleString()} professionals with phone or email
              information available for outreach.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Phone className="h-5 w-5 text-muted-foreground" />
              {totalContactable.toLocaleString()}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search + Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="flex-1">
          <Input
            name="q"
            placeholder="Search by name..."
            defaultValue={search}
            className="max-w-sm"
          />
        </form>
        <CsvDownloadButton />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Facility</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Personal Email</TableHead>
                  <TableHead>Work Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {search
                        ? `No contacts found matching "${search}"`
                        : "No contactable professionals found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px]">
                          {c.categoryGroup}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {c.currentFacility || "—"}
                      </TableCell>
                      <TableCell>
                        {c.mobileNumber ? (
                          <a
                            href={`tel:${c.mobileNumber}`}
                            className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3" />
                            {c.mobileNumber}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.personalEmail ? (
                          <a
                            href={`mailto:${c.personalEmail}`}
                            className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
                          >
                            <Mail className="h-3 w-3" />
                            {c.personalEmail}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.workEmail ? (
                          <a
                            href={`mailto:${c.workEmail}`}
                            className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
                          >
                            <Mail className="h-3 w-3" />
                            {c.workEmail}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {contacts.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4">
              Showing {contacts.length.toLocaleString()} results
              {search ? ` for "${search}"` : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
