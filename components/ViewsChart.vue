<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js'
import { useTheme } from '~/composables/useTheme'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const props = defineProps<{
  chartDays: Array<{ label: string; views: number }>
  maxY: number
}>()

const { isDark } = useTheme()

// Re-key the chart whenever the theme flips so colours fully refresh
const chartKey = computed(() => (isDark.value ? 'dark' : 'light'))

const chartData = computed(() => ({
  labels: props.chartDays.map(d => d.label),
  datasets: [
    {
      data: props.chartDays.map(d => d.views),
      // Active bars: semi-transparent text-main; empty bars: subtle surface-alt
      backgroundColor: props.chartDays.map(d =>
        d.views > 0
          ? isDark.value ? 'rgba(255,255,255,0.28)' : 'rgba(10,10,10,0.28)'
          : isDark.value ? 'rgba(53,53,57,0.9)' : 'rgba(228,228,231,0.9)'
      ),
      hoverBackgroundColor: props.chartDays.map(d =>
        d.views > 0
          ? isDark.value ? 'rgba(255,255,255,0.9)' : 'rgba(10,10,10,0.85)'
          : isDark.value ? 'rgba(53,53,57,0.9)' : 'rgba(228,228,231,0.9)'
      ),
      borderRadius: 4,        // rounded tops
      borderSkipped: 'bottom' as const, // flat bottoms, rounded tops only
      minBarLength: 3,        // always show at least 3 px so 0-view days have a baseline
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: isDark.value ? '#ffffff' : '#0a0a0a',
      titleColor: isDark.value ? '#111114' : '#ffffff',
      bodyColor: isDark.value ? '#111114' : '#ffffff',
      padding: { x: 10, y: 7 },
      cornerRadius: 6,
      displayColors: false,
      callbacks: {
        title: () => '',
        label: (ctx: any) =>
          `${ctx.parsed.y} view${ctx.parsed.y !== 1 ? 's' : ''}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: '#71717a',
        font: { size: 10, weight: '700' as const },
        maxRotation: 0,
        padding: 4,
      },
    },
    y: {
      min: 0,
      max: props.maxY,
      grid: {
        color: isDark.value ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        drawBorder: false,
      },
      border: { display: false },
      ticks: {
        color: '#71717a',
        font: { size: 10, weight: '700' as const },
        padding: 8,
        // Only show the 0 and maxY labels, skip everything in between
        callback: function (value: number | string) {
          return value === 0 || value === props.maxY ? value : ''
        },
        stepSize: props.maxY,
      },
    },
  },
  animation: {
    duration: 400,
    easing: 'easeInOutQuart' as const,
  },
}))
</script>

<template>
  <Bar :key="chartKey" :data="chartData" :options="chartOptions" />
</template>
