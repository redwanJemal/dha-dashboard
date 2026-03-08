"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";

export function CsvDownloadButton() {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();

      const headers = [
        "DHA ID",
        "Name",
        "Category",
        "Current Facility",
        "Mobile Number",
        "Office Number",
        "Personal Email",
        "Work Email",
      ];

      const escape = (val: string | null | undefined) => {
        if (!val) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = data.map(
        (row: {
          dhaUniqueId: string;
          name: string;
          category: string;
          currentFacility: string | null;
          mobileNumber: string | null;
          officeNumber: string | null;
          personalEmail: string | null;
          workEmail: string | null;
        }) =>
          [
            row.dhaUniqueId,
            row.name,
            row.category,
            row.currentFacility,
            row.mobileNumber,
            row.officeNumber,
            row.personalEmail,
            row.workEmail,
          ]
            .map(escape)
            .join(",")
      );

      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dha-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error("Failed to download CSV");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      disabled={loading}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {loading ? "Downloading..." : "Download CSV"}
    </Button>
  );
}
