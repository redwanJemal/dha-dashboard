import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProfessionalsFilters } from "@/components/professionals/filters";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 25;

export default async function ProfessionalsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const category = typeof params.category === "string" ? params.category : "";
  const contact = typeof params.contact === "string" ? params.contact : "";
  const page = Math.max(1, parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);

  const where: Record<string, unknown> = {};

  if (search) {
    where.name = { contains: search };
  }
  if (category && category !== "all") {
    where.categoryGroup = category;
  }
  if (contact === "yes") {
    where.hasContact = true;
  } else if (contact === "no") {
    where.hasContact = false;
  }

  const [professionals, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      include: {
        experiences: { select: { id: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.professional.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildPageUrl(p: number) {
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    if (category) sp.set("category", category);
    if (contact) sp.set("contact", contact);
    sp.set("page", String(p));
    return `/professionals?${sp.toString()}`;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Professionals Directory</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} professional{total !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      <ProfessionalsFilters />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden md:table-cell">Speciality</TableHead>
                <TableHead className="hidden lg:table-cell">Current Facility</TableHead>
                <TableHead className="text-center">Contact</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Exp.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {professionals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No professionals found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                professionals.map((p) => (
                  <TableRow key={p.id} className="group">
                    <TableCell className="pl-6 font-medium">
                      <Link
                        href={`/professionals/${p.dhaUniqueId}`}
                        className="text-foreground hover:text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {p.categoryGroup}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {p.speciality}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground max-w-[200px] truncate">
                      {p.currentFacility || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.hasContact ? (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" title="Has contact info" />
                      ) : (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" title="No contact info" />
                      )}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell text-muted-foreground">
                      {p.experiences.length}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildPageUrl(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            )}

            <span className="text-sm text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>

            {page < totalPages ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildPageUrl(page + 1)}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
