'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface MiniPieChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  size?: number;
  showTooltip?: boolean;
}

export function MiniPieChart({ data, size = 100, showTooltip = false }: MiniPieChartProps) {
  // Filter out zero values
  const filteredData = data.filter((item) => item.value > 0);

  if (filteredData.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-gray-500 dark:text-gray-500">No data</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width={size} height={size}>
      <PieChart>
        <Pie
          data={filteredData}
          cx="50%"
          cy="50%"
          innerRadius={size * 0.45}
          outerRadius={size * 0.5}
          paddingAngle={2}
          dataKey="value"
        >
          {filteredData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
