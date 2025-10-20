export type InputSource = 'slider' | 'number' | 'keyboard' | 'unknown'

type MeasureTags = Record<string, string | number | boolean>

class PerfHelper {
  private lastInputSource: InputSource = 'unknown'
  private lastField: string | null = null

  setInputContext(source: InputSource, field?: string) {
    this.lastInputSource = source
    if (field) this.lastField = field
  }

  getInputSource() {
    return this.lastInputSource
  }

  getField() {
    return this.lastField
  }

  mark(name: string) {
    if (typeof performance !== 'undefined' && performance.mark) {
      try {
        performance.mark(name)
      } catch {}
    }
  }

  measureAndLog(metricName: string, startMark: string, endMark: string, tags: MeasureTags = {}) {
    if (typeof performance === 'undefined') return
    try {
      // Create measure
      performance.measure(metricName, startMark, endMark)
      const entries = performance.getEntriesByName(metricName, 'measure')
      const entry = entries[entries.length - 1]
      const value = entry?.duration ?? null
      const log = {
        metric: metricName,
        value_ms: value ? Math.round(value) : null,
        tags: {
          'ux:input-source': this.lastInputSource,
          field: this.lastField ?? undefined,
          ...tags,
        },
      }
      // Standard log output
      // eslint-disable-next-line no-console
      console.log('[perf]', log)
      // Cleanup marks/measures to prevent unbounded growth
      performance.clearMarks(startMark)
      performance.clearMarks(endMark)
      performance.clearMeasures(metricName)
    } catch {
      // ignore
    }
  }
}

export const perf = new PerfHelper()

