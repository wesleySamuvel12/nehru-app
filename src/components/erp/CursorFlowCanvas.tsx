'use client'

import * as React from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
  life: number
  maxLife: number
}

interface NodeParticle {
  x: number
  y: number
  baseX: number
  baseY: number
  size: number
  color: string
  alpha: number
  vx: number
  vy: number
}

const ROLE_PALETTES: Record<string, string[]> = {
  DEFAULT: [
    'rgba(19, 141, 206, ',   // Sky blue #138DCE
    'rgba(231, 101, 7, ',    // Emblem orange #E76507
    'rgba(56, 189, 248, ',   // Sky light #38BDF8
    'rgba(45, 212, 191, ',   // Teal bright #2DD4BF
  ],
  SUPER_ADMIN: [
    'rgba(168, 85, 247, ',
    'rgba(245, 158, 11, ',
    'rgba(217, 70, 239, ',
  ],
  TEACHER: [
    'rgba(16, 185, 129, ',
    'rgba(56, 189, 248, ',
    'rgba(52, 211, 153, ',
  ],
  STUDENT: [
    'rgba(99, 102, 241, ',
    'rgba(14, 165, 233, ',
    'rgba(168, 85, 247, ',
  ],
}

export function CursorFlowCanvas({ activeRole = 'DEFAULT' }: { activeRole?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const paletteRef = React.useRef<string[]>(ROLE_PALETTES.DEFAULT)

  React.useEffect(() => {
    paletteRef.current = ROLE_PALETTES[activeRole] || ROLE_PALETTES.DEFAULT
  }, [activeRole])

  React.useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    let isTabVisible = !document.hidden

    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      lastX: width / 2,
      lastY: height / 2,
      speed: 0,
      isHoveringClickable: false,
    }

    const trailParticles: Particle[] = []
    const ambientNodes: NodeParticle[] = []

    // Lightweight node count (max 14 nodes)
    const nodeCount = Math.min(Math.floor((width * height) / 80000), 14)
    for (let i = 0; i < nodeCount; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const palette = paletteRef.current
      ambientNodes.push({
        x,
        y,
        baseX: x,
        baseY: y,
        size: Math.random() * 1.5 + 1,
        color: palette[i % palette.length],
        alpha: Math.random() * 0.3 + 0.1,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      })
    }

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    const handleVisibility = () => {
      isTabVisible = !document.hidden
      if (isTabVisible && !animationFrameId) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    window.addEventListener('resize', handleResize, { passive: true })
    document.addEventListener('visibilitychange', handleVisibility)

    let lastMoveTime = 0
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const now = performance.now()
      if (now - lastMoveTime < 16) return // Throttle to ~60fps input sampling
      lastMoveTime = now

      let clientX = 0
      let clientY = 0

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else if ('clientX' in e) {
        clientX = e.clientX
        clientY = e.clientY
      }

      mouse.targetX = clientX
      mouse.targetY = clientY

      const dx = clientX - mouse.lastX
      const dy = clientY - mouse.lastY
      mouse.speed = Math.min(Math.sqrt(dx * dx + dy * dy), 30)

      if (trailParticles.length < 20 && mouse.speed > 2) {
        const palette = paletteRef.current
        const color = palette[Math.floor(Math.random() * palette.length)]
        trailParticles.push({
          x: clientX,
          y: clientY,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2.5 + 1.5,
          color,
          alpha: 0.6,
          life: 0,
          maxLife: 24,
        })
      }

      mouse.lastX = clientX
      mouse.lastY = clientY
    }

    window.addEventListener('mousemove', handlePointerMove, { passive: true })

    const render = () => {
      if (!isTabVisible) {
        animationFrameId = 0
        return
      }

      mouse.x += (mouse.targetX - mouse.x) * 0.15
      mouse.y += (mouse.targetY - mouse.y) * 0.15

      ctx.clearRect(0, 0, width, height)

      // 1. Ambient Nodes
      for (let i = 0; i < ambientNodes.length; i++) {
        const node = ambientNodes[i]
        node.x += node.vx
        node.y += node.vy

        if (node.x < 0 || node.x > width) node.vx *= -1
        if (node.y < 0 || node.y > height) node.vy *= -1

        ctx.beginPath()
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2)
        ctx.fillStyle = `${node.color}${node.alpha})`
        ctx.fill()
      }

      // 2. Cursor Flow Particles
      for (let i = trailParticles.length - 1; i >= 0; i--) {
        const p = trailParticles[i]
        p.life++
        p.x += p.vx
        p.y += p.vy

        const progress = p.life / p.maxLife
        p.alpha = Math.max(0, 0.6 * (1 - progress))

        if (p.life >= p.maxLife) {
          trailParticles.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${p.alpha.toFixed(2)})`
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('mousemove', handlePointerMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-10 h-full w-full"
      aria-hidden="true"
    />
  )
}
