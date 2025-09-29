export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage?: number
}

export class PerformanceMonitor {
  private frameCount = 0
  private lastTime = performance.now()
  private fps = 0
  private frameTime = 0

  public update(): PerformanceMetrics {
    const currentTime = performance.now()
    this.frameTime = currentTime - this.lastTime
    this.lastTime = currentTime

    this.frameCount++

    // 1초마다 FPS 계산
    if (this.frameCount % 60 === 0) {
      this.fps = Math.round(1000 / this.frameTime)
    }

    return {
      fps: this.fps,
      frameTime: this.frameTime,
      memoryUsage: this.getMemoryUsage()
    }
  }

  private getMemoryUsage(): number | undefined {
    // @ts-ignore - performance.memory는 Chrome에서만 지원
    if (typeof performance !== 'undefined' && performance.memory) {
      // @ts-ignore
      return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) // MB 단위
    }
    return undefined
  }

  public reset(): void {
    this.frameCount = 0
    this.lastTime = performance.now()
    this.fps = 0
    this.frameTime = 0
  }
}