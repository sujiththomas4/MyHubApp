import { useEffect, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'

/**
 * Reads the live computed values of the theme CSS variables so charts recolor
 * whenever the accent preset or color scheme changes. Returns hex/rgb strings
 * that ApexCharts understands.
 */
export function useChartColors() {
  const { settings } = useTheme()
  const [colors, setColors] = useState({
    primary: '#0ab39c',
    text: '#878a99',
    grid: '#e9ebec',
  })

  useEffect(() => {
    const css = getComputedStyle(document.documentElement)
    const read = (name, fallback) => (css.getPropertyValue(name) || fallback).trim()
    setColors({
      primary: read('--bs-primary', '#0ab39c'),
      secondary: '#f7b84b',
      text: read('--hub-muted', '#878a99'),
      grid: read('--hub-border', '#e9ebec'),
    })
    // Re-read whenever any theme setting changes.
  }, [settings.preset, settings.colorScheme])

  return colors
}
