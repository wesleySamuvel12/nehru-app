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
    'rgba(168, 85, 247, ',   // Purple #A855F7
    'rgba(245, 158, 11, ',   // Amber #F59E0B
    'rgba(217, 70, 239, ',   // Fuchsia #D946EF
  ],
  PRINCIPAL: [
    'rgba(234, 179, 8, ',    // Gold #EAB308
    'rgba(99, 102, 241, ',   // Indigo #6366F1
    'rgba(245, 158, 11, ',   // Amber #F59E0B
  ],
  TEACHER: [
    'rgba(16, 185, 129, ',   // Emerald #10B981
    'rgba(56, 189, 248, ',   // Sky #38BDF8
    'rgba(52, 211, 153, ',   // Mint #34D399
  ],
  ACCOUNTANT: [
    'rgba(20, 184, 166, ',   // Teal #14B8A6
    'rgba(6, 182, 212, ',    // Cyan #06B6D4
    'rgba(16, 185, 129, ',   // Emerald #10B981
  ],
  PARENT: [
    'rgba(244, 63, 94, ',    // Rose #F43F5E
    'rgba(251, 146, 60, ',   // Orange #FB923C
    'rgba(236, 72, 153, ',   // Pink #EC4899
  ],
  STUDENT: [
    'rgba(99, 102, 241, ',   // Indigo #6366F1
    'rgba(14, 165, 233, ',   // Sky #0EA5E9
    'rgba(168, 85, 247, ',   // Purple #A855F7
  ],
}

export function CursorFlowCanvas({ activeRole = 'DEFAULT' }: { activeRole?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const paletteRef = React.useRef<string[]>(ROLE_PALETTES.DEFAULT)

  React.useEffect(() => {
    paletteRef.current = ROLE_PALETTES[activeRole] || ROLE_PALETTES.DEFAULT
  }, [activeRole])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

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

    const nodeCount = Math.min(Math.floor((width * height) / 22000), 45)
    for (let i = 0; i < nodeCount; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const palette = paletteRef.current
      ambientNodes.push({
        x,
        y,
        baseX: x,
        baseY: y,
        size: Math.random() * 2 + 1,
        color: palette[i % palette.length],
        alpha: Math.random() * 0.4 + 0.15,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      })
    }

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
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
      mouse.speed = Math.sqrt(dx * dx + dy * dy)

      const palette = paletteRef.current
      const particleCount = Math.min(Math.floor(mouse.speed / 4) + 1, 6)
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.2
        const speed = Math.random() * mouse.speed * 0.15 + 0.5
        const color = palette[Math.floor(Math.random() * palette.length)]
        const maxLife = Math.floor(Math.random() * 35 + 25)

        trailParticles.push({
          x: clientX + (Math.random() - 0.5) * 8,
          y: clientY + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.8,
          vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 0.8,
          size: Math.random() * 4 + 2,
          color,
          alpha: 0.85,
          life: 0,
          maxLife,
        })
      }

      mouse.lastX = clientX
      mouse.lastY = clientY

      const target = e.target as HTMLElement | null
      if (target && (target.closest('button, input, a, [role="button"]') || target.tagName === 'BUTTON' || target.tagName === 'INPUT')) {
        mouse.isHoveringClickable = true
      } else {
        mouse.isHoveringClickable = false
      }
    }

    window.addEventListener('mousemove', handlePointerMove, { passive: true })
    window.addEventListener('touchmove', handlePointerMove, { passive: true })

    const render = () => {
      mouse.x += (mouse.targetX - mouse.x) * 0.18
      mouse.y += (mouse.targetY - mouse.y) * 0.18

      ctx.clearRect(0, 0, width, height)

      // 1. Ambient Nodes
      for (let i = 0; i < ambientNodes.length; i++) {
        const node = ambientNodes[i]
        node.x += node.vx
        node.y += node.vy

        if (node.x < 0 || node.x > width) node.vx *= -1
        if (node.y < 0 || node.y > height) node.vy *= -1

        const dx = mouse.x - node.x
        const dy = mouse.y - node.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = 180

        if (dist < maxDist) {
          const factor = (1 - dist / maxDist)
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(mouse.x, mouse.y)
          ctx.strokeStyle = `${node.color}${0.25 * factor})`
          ctx.lineWidth = 1
          ctx.stroke()
        }

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
        p.vx *= 0.96
        p.vy *= 0.96
        p.size *= 0.96

        const progress = p.life / p.maxLife
        p.alpha = Math.max(0, 1 - progress)

        if (p.life >= p.maxLife || p.size < 0.2) {
          trailParticles.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${(p.alpha * 0.25).toFixed(2)})`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${p.alpha.toFixed(2)})`
        ctx.fill()
      }

      // 3. Fluid Flow Ribbon Line
      if (trailParticles.length > 3) {
        ctx.beginPath()
        ctx.moveTo(trailParticles[0].x, trailParticles[0].y)
        for (let i = 1; i < trailParticles.length - 1; i += 2) {
          const xc = (trailParticles[i].x + trailParticles[i + 1].x) / 2
          const yc = (trailParticles[i].y + trailParticles[i + 1].y) / 2
          ctx.quadraticCurveTo(trailParticles[i].x, trailParticles[i].y, xc, yc)
        }
        const activePalette = paletteRef.current
        const strokeColor = activePalette[0] || 'rgba(56, 189, 248, '
        ctx.strokeStyle = `${strokeColor}0.18)`
        ctx.lineWidth = 3
        ctx.stroke()
      }

      // 4. Pointer Spotlight Ring
      const activePalette = paletteRef.current
      const primaryColor = activePalette[0] || 'rgba(19, 141, 206, '
      const secondaryColor = activePalette[1] || 'rgba(231, 101, 7, '
      const ringRadius = mouse.isHoveringClickable ? 26 : 14

      ctx.beginPath()
      ctx.arc(mouse.x, mouse.y, ringRadius, 0, Math.PI * 2)
      ctx.strokeStyle = mouse.isHoveringClickable
        ? `${secondaryColor}0.8)`
        : `${primaryColor}0.6)`
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = mouse.isHoveringClickable ? `${secondaryColor}1)` : `${primaryColor}1)`
      ctx.fill()

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('touchmove', handlePointerMove)
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
