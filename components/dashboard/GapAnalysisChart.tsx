'use client';

import type { Chart } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { wrapSectionLabel } from '@/lib/dashboard/chartLabels';
import { getGapAnalysis } from '@/lib/dashboard/insights';
import {
  BRAND_DARK,
  getGapColors,
  getGapStatusColor,
  GRID_LINE,
} from '@/lib/dashboard/theme';
import type { DashboardData } from '@/lib/dashboard/types';
import { ChartCard } from './Card';
import { DeltaIndicator } from './DeltaIndicator';
import './chartRegister';

function formatDelta(delta: number) {
  if (delta > 0) return `+${delta}%`;
  return `${delta}%`;
}

const gapValueLabelsPlugin = {
  id: 'gapValueLabels',
  afterDatasetsDraw(chart: Chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const values = chart.data.datasets[0]?.data as number[] | undefined;
    if (!values) return;

    ctx.save();
    ctx.fillStyle = BRAND_DARK;
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    meta.data.forEach((bar, i) => {
      const value = values[i];
      if (typeof value !== 'number' || !bar) return;

      const { x, y, base } = bar.getProps(['x', 'y', 'base'], true);
      const labelY = value >= 0 ? y - 4 : Math.min(y, base) - 4;
      ctx.fillText(formatDelta(value), x, labelY);
    });

    ctx.restore();
  },
};

const tickFont = { size: 8, weight: 'bold' as const };

export function GapAnalysisChart({ data }: { data: DashboardData }) {
  const gaps = getGapAnalysis(data);

  const chartData = {
    labels: gaps.map((g) => wrapSectionLabel(g.section.fullName)),
    datasets: [
      {
        label: 'Variance from Overall',
        data: gaps.map((g) => g.delta),
        backgroundColor: gaps.map((g) => getGapColors(g.delta).bg),
        borderColor: gaps.map((g) => getGapColors(g.delta).border),
        borderWidth: 2,
        borderRadius: 4,
        minBarLength: 8,
      },
    ],
  };

  return (
    <ChartCard
      title="Satisfaction Gap Analysis"
      subtitle={`Variance of each section vs overall score (${data.overall}%)`}
    >
      <div className="relative mb-4 h-[300px]">
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 20, bottom: 8 } },
            plugins: { legend: { display: false } },
            scales: {
              y: {
                grid: { color: GRID_LINE },
                ticks: {
                  color: BRAND_DARK,
                  callback: (v) => {
                    const n = Number(v);
                    return `${n > 0 ? '+' : ''}${n}%`;
                  },
                  font: tickFont,
                },
              },
              x: {
                grid: { display: false },
                ticks: {
                  color: BRAND_DARK,
                  font: tickFont,
                  maxRotation: 0,
                  minRotation: 0,
                  autoSkip: false,
                },
              },
            },
          }}
          plugins={[gapValueLabelsPlugin]}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="dash-table-head border-b border-[#E5EAF2] text-left">
              <th className="px-2 py-2 font-semibold">Section</th>
              <th className="px-2 py-2 font-semibold">Score</th>
              <th className="px-2 py-2 font-semibold">Variance</th>
              <th className="px-2 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((g) => {
              const status =
                g.delta > 0
                  ? 'Above Average'
                  : g.delta < 0
                    ? 'Below Average'
                    : 'At Average';
              const statusColor = getGapStatusColor(g.delta);

              return (
                <tr
                  key={g.section.id}
                  className="dash-table-row-alt border-b border-[#E5EAF2]"
                >
                  <td className="px-2 py-2 font-medium" style={{ color: BRAND_DARK }}>
                    Section {g.section.label} — {g.section.fullName}
                  </td>
                  <td className="px-2 py-2">{g.score}%</td>
                  <td className="px-2 py-2">
                    <DeltaIndicator delta={g.delta} />
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: statusColor + '22',
                        color: statusColor,
                      }}
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
