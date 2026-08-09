"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryTotal } from "@/lib/expenses/utils";
import { formatYen } from "@/lib/format";

export const PIE_COLORS = ["#22a06b", "#4ade80", "#f59e0b", "#f97316", "#38bdf8", "#a78bfa"];

export function CategoryPieChart({ data, total }: { data: CategoryTotal[]; total: number }) {
  return (
    <div className="relative" style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="label" innerRadius={48} outerRadius={80} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.categoryId} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatYen(Number(value))} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] text-ink-muted">合計</span>
        <span className="text-sm font-bold">{formatYen(total)}</span>
      </div>
    </div>
  );
}
