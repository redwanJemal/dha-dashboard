"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface BarChartProps {
  data: Array<{ name: string; value: number }>;
  color?: string;
  layout?: "vertical" | "horizontal";
}

function truncate(str: string, maxLen: number): string {
  if (!str) return "";
  return str.length > maxLen ? str.slice(0, maxLen) + "..." : str;
}

export function BarChart({
  data,
  color = "#3b82f6",
  layout = "vertical",
}: BarChartProps) {
  const isHorizontal = layout === "horizontal";

  return (
    <ResponsiveContainer width="100%" height={isHorizontal ? Math.max(280, data.length * 36) : 280}>
      <RechartsBarChart
        data={data}
        layout={isHorizontal ? "vertical" : "horizontal"}
        margin={
          isHorizontal
            ? { top: 4, right: 24, left: 8, bottom: 4 }
            : { top: 4, right: 8, left: 8, bottom: 4 }
        }
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          opacity={0.5}
        />
        {isHorizontal ? (
          <>
            <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: string) => truncate(v, 22)}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="name"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: string) => truncate(v, 12)}
            />
            <YAxis fontSize={12} tickLine={false} axisLine={false} />
          </>
        )}
        <Tooltip
          formatter={(value: number) => [value.toLocaleString(), "Count"]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid hsl(var(--border))",
            backgroundColor: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
            fontSize: "13px",
          }}
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
        />
        <Bar
          dataKey="value"
          fill={color}
          radius={[4, 4, 4, 4]}
          maxBarSize={32}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
