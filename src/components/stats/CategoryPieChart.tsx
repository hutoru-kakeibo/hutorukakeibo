"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryTotal } from "@/lib/expenses/utils";
import { formatYen } from "@/lib/format";

export const PIE_COLORS = ["#22a06b", "#4ade80", "#f59e0b", "#f97316", "#38bdf8", "#a78bfa"];

export function CategoryPieChart({ data }: { data: CategoryTotal[] }) {
  return (
    <div style={{ width: "100%", height: 200 }}>
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
    </div>
  );
}
