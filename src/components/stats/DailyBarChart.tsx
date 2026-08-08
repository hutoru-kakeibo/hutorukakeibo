"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyTotal } from "@/lib/expenses/utils";
import { formatYen } from "@/lib/format";

export function DailyBarChart({ data, color = "#22a06b" }: { data: DailyTotal[]; color?: string }) {
  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="day" interval={4} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip formatter={(value) => formatYen(Number(value))} labelFormatter={(day) => `${day}日`} />
          <Bar dataKey="total" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
