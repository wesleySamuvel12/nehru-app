'use client'

import * as React from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadialBarChart, RadialBar,
} from 'recharts'
import { useTheme } from 'next-themes'

export const CHART_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#f43f5e', '#14b8a6', '#eab308', '#6366f1']

function useAxisColor() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  return { grid: isDark ? '#27272a' : '#e4e4e7', tick: isDark ? '#a1a1aa' : '#71717a' }
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))',
  borderRadius: 10, fontSize: 12, color: 'hsl(var(--popover-foreground))',
}

export function TrendArea({ data, xKey, yKey, height = 260, color = CHART_COLORS[0], yFormatter, xFormatter }: {
  data: any[]; xKey: string; yKey: string; height?: number; color?: string
  yFormatter?: (v: number) => string; xFormatter?: (v: string) => string
}) {
  const { grid, tick } = useAxisColor()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false}
          tickFormatter={xFormatter as any} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} tickFormatter={yFormatter as any} width={54} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => (yFormatter ? [yFormatter(Number(v)), ''] : v)} />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#grad-${yKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function BarsChart({ data, xKey, series, height = 260, stacked, yFormatter, layout = 'horizontal' }: {
  data: any[]; xKey: string; series: { key: string; label: string; color?: string }[]
  height?: number; stacked?: boolean; yFormatter?: (v: number) => string
  layout?: 'horizontal' | 'vertical'
}) {
  const { grid, tick } = useAxisColor()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 8, right: 8, left: layout === 'vertical' ? 24 : -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={layout === 'vertical'} horizontal={layout === 'horizontal'} />
        {layout === 'horizontal' ? (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} interval={0} angle={data.length > 8 ? -25 : 0} textAnchor={data.length > 8 ? 'end' : 'middle'} height={data.length > 8 ? 54 : 30} />
            <YAxis tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} tickFormatter={yFormatter as any} width={54} />
          </>
        ) : (
          <>
            <XAxis type="number" tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} tickFormatter={yFormatter as any} />
            <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} width={110} />
          </>
        )}
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} formatter={(v: any, n: any) => (yFormatter ? [yFormatter(Number(v)), n] : v)} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId={stacked ? 'a' : undefined}
            fill={s.color || CHART_COLORS[i % CHART_COLORS.length]} radius={layout === 'vertical' ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            maxBarSize={layout === 'vertical' ? 18 : 42} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LineTrend({ data, xKey, series, height = 260, yFormatter }: {
  data: any[]; xKey: string; series: { key: string; label: string; color?: string }[]
  height?: number; yFormatter?: (v: number) => string
}) {
  const { grid, tick } = useAxisColor()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: tick }} axisLine={false} tickLine={false} tickFormatter={yFormatter as any} width={54} />
        <Tooltip contentStyle={tooltipStyle} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color || CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function DonutChart({ data, nameKey, valueKey, height = 260, colors = CHART_COLORS, centerLabel, colorMap }: {
  data: any[]; nameKey: string; valueKey: string; height?: number; colors?: string[]
  centerLabel?: string; colorMap?: Record<string, string>
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="58%" outerRadius="82%" paddingAngle={2} strokeWidth={0}>
          {data.map((entry, i) => <Cell key={i} fill={colorMap?.[entry[nameKey]] || colors[i % colors.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        {centerLabel && (
          <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-lg font-bold">{centerLabel}</text>
        )}
      </PieChart>
    </ResponsiveContainer>
  )
}

export function GaugeChart({ value, max = 100, label, height = 180, color = CHART_COLORS[0] }: {
  value: number; max?: number; label?: string; height?: number; color?: string
}) {
  const data = [{ name: label || '', value: Math.min(100, Math.round((value / max) * 100)), fill: color }]
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart data={data} innerRadius="70%" outerRadius="100%" startAngle={220} endAngle={-40}>
          <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={10} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-6">
        <span className="text-2xl font-bold">{Math.round(value)}%</span>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}
