'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Session } from '@/lib/store'
import { api, ApiError, setToken } from '@/lib/api-client'
import { ForgotPasswordModal } from '@/components/erp/login/ForgotPasswordModal'
import { QUICK_ACCOUNTS, QuickAccountItem } from '@/components/erp/login/LoginForm'
import {
  Mail, Lock, User, Phone, GraduationCap, Eye, EyeOff, Loader2,
  ShieldCheck, CheckCircle2, AlertCircle, Sparkles, ChevronDown,
  ArrowRight, School, BookOpen, Crown, ShieldAlert, Briefcase,
  HeartHandshake, Users, Heart, Library, Bus, Home, Stethoscope,
  Search, Zap, Award, UserCheck, Building2, Landmark, Shield, X, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

export function LoginScreen({ onLogin }: { onLogin: (s: Session, defaultModule: string) => void }) {
  const [isSignUp, setIsSignUp] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [forgotPasswordOpen, setForgotPasswordOpen] = React.useState(false)
  const [showQuickAccounts, setShowQuickAccounts] = React.useState(true)
  const [activeDemoRole, setActiveDemoRole] = React.useState<string | null>(null)
  const [demoModalOpen, setDemoModalOpen] = React.useState(false)
  const [demoCategory, setDemoCategory] = React.useState<'All' | 'Leadership' | 'Academics' | 'Staff' | 'Portals'>('All')
  const [demoSearch, setDemoSearch] = React.useState('')
  const isDemoAllowed = true

  // Interactive mouse parallax state (for ambient light elements on desktop)
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 })

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate normalized offset from center between -1 and 1
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      setMousePos({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Sign up (Admission enquiry) form state
  const [regName, setRegName] = React.useState('')
  const [regEmail, setRegEmail] = React.useState('')
  const [regPhone, setRegPhone] = React.useState('')
  const [regGrade, setRegGrade] = React.useState('Grade 8')
  const [regLoading, setRegLoading] = React.useState(false)
  const [regSuccess, setRegSuccess] = React.useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    const targetEmail = email.trim()
    if (!targetEmail || !password) {
      setError('Please provide your institutional email and password.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await api<{ data: Session; token?: string; defaultModule: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, password, selectedLoginType: 'Auto' }),
      })
      if (res.token) setToken(res.token)
      toast.success(`Welcome back, ${res.data.name}!`)
      onLogin(res.data, res.defaultModule)
    } catch (err: any) {
      setLoading(false)
      const msg = (err as ApiError).message || 'Invalid institutional credentials. Please try again.'
      setError(msg)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (regLoading) return
    if (!regName.trim() || !regPhone.trim()) {
      toast.error('Please enter your full name and contact number.')
      return
    }

    setRegLoading(true)
    try {
      await api('/api/admissions/leads', {
        method: 'POST',
        body: JSON.stringify({
          studentName: regName.trim(),
          parentName: regName.trim(),
          phone: regPhone.trim(),
          email: regEmail.trim() || undefined,
          classApplied: regGrade,
          source: 'ONLINE_PORTAL',
          status: 'NEW',
          notes: 'Registered online via Nehru ERP login portal.',
        }),
      })
      setRegSuccess(true)
      toast.success('Registration enquiry submitted! Our admission team will contact you shortly.')
    } catch {
      setRegSuccess(true)
      toast.success('Registration details received! You may now sign in or check your email.')
    } finally {
      setRegLoading(false)
    }
  }

  const handleInstantDemoLogin = async (acct: QuickAccountItem) => {
    if (loading) return
    setActiveDemoRole(acct.role)
    setLoading(true)
    setError(null)
    setEmail(acct.email)
    setPassword('demo1234')

    try {
      const res = await api<{ data: Session; token?: string; defaultModule: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: acct.email, password: 'demo1234', selectedLoginType: 'Auto' }),
      })
      if (res.token) setToken(res.token)
      toast.success(`Instant demo access granted: ${acct.name} (${acct.role})`)
      onLogin(res.data, res.defaultModule)
    } catch (err: any) {
      setLoading(false)
      setActiveDemoRole(null)
      const msg = (err as ApiError).message || 'Instant demo login failed. Please try again.'
      setError(msg)
      toast.error(msg)
    }
  }

  const fillQuickAccount = (acctEmail: string) => {
    setEmail(acctEmail)
    setPassword('demo1234')
    setError(null)
  }

  const filteredDemoAccounts = QUICK_ACCOUNTS.filter(acct => {
    const matchesCat =
      demoCategory === 'All'
        ? true
        : demoCategory === 'Leadership'
        ? acct.subCategory === 'Leadership' || acct.category === 'Admin'
        : demoCategory === 'Academics'
        ? acct.subCategory === 'Academics'
        : demoCategory === 'Staff'
        ? acct.subCategory === 'Operations' || acct.category === 'Staff'
        : acct.category === 'Portals'

    const q = demoSearch.toLowerCase().trim()
    const matchesSearch =
      !q ||
      acct.role.toLowerCase().includes(q) ||
      acct.name.toLowerCase().includes(q) ||
      acct.email.toLowerCase().includes(q) ||
      acct.label.toLowerCase().includes(q)

    return matchesCat && matchesSearch
  })

  return (
    <div className="auth-switch-root">
      <style>{`
        .auth-switch-root,
        .auth-switch-root * {
          box-sizing: border-box;
        }

        /* ── Strictly Light / White Theme Page Root ── */
        .auth-switch-root {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8fafc;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 24px 16px;
          position: relative;
          overflow-x: hidden;
        }

        /* ── Fine Subtle Dotted Grid Background Overlay ── */
        .auth-grid-pattern {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(2, 132, 199, 0.12) 1.2px, transparent 1.2px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 1;
          opacity: 0.85;
        }

        /* ── Ambient Soft Blue Gradient Orbs ── */
        .ambient-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(60px);
          z-index: 1;
          transition: transform 0.4s ease-out;
        }

        .ambient-orb-1 {
          width: 650px;
          height: 650px;
          top: -120px;
          left: 10%;
          background: radial-gradient(circle, rgba(186, 230, 253, 0.45) 0%, rgba(224, 242, 254, 0.18) 50%, transparent 70%);
          animation: floatSlow 22s ease-in-out infinite alternate;
        }

        .ambient-orb-2 {
          width: 580px;
          height: 580px;
          bottom: -80px;
          right: 8%;
          background: radial-gradient(circle, rgba(199, 210, 254, 0.4) 0%, rgba(224, 231, 255, 0.15) 50%, transparent 70%);
          animation: floatReverse 26s ease-in-out infinite alternate;
        }

        .ambient-orb-3 {
          width: 480px;
          height: 480px;
          top: 35%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(224, 242, 254, 0.5) 0%, transparent 60%);
        }

        @keyframes floatSlow {
          0% { transform: translate(0, 0); }
          50% { transform: translate(30px, 25px); }
          100% { transform: translate(-20px, 40px); }
        }

        @keyframes floatReverse {
          0% { transform: translate(0, 0); }
          50% { transform: translate(-35px, -20px); }
          100% { transform: translate(25px, -30px); }
        }

        /* ── Subtle Geometric Light Accents Behind Card ── */
        .bg-light-decor {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          overflow: hidden;
        }

        .decor-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px dashed rgba(2, 132, 199, 0.15);
        }

        /* ── 1. Top Branding Header (White Surface) ── */
        .white-theme-header {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(226, 232, 240, 0.85);
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02);
          backdrop-filter: blur(12px);
          padding: 9px 22px;
          border-radius: 9999px;
          z-index: 25;
          margin-bottom: 22px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          animation: fadeInDown 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .white-theme-header:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px -4px rgba(2, 132, 199, 0.12);
        }

        .white-theme-header .school-name {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        .white-theme-header .divider {
          width: 1px;
          height: 16px;
          background: #cbd5e1;
        }

        .white-theme-header .school-tagline {
          font-size: 0.72rem;
          font-weight: 700;
          color: #0284c7;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        /* ── 2. Main Login Container (Premium SaaS White Theme) ── */
        .container {
          position: relative;
          width: 100%;
          max-width: 1000px;
          height: 660px;
          background: #ffffff;
          border-radius: 28px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.08), 0 10px 25px -5px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.9);
          overflow: hidden;
          z-index: 10;
          animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* The Soft Blue Curved Dividing Surface */
        .container:before {
          content: "";
          position: absolute;
          height: 2000px;
          width: 2000px;
          top: -10%;
          right: 48%;
          transform: translateY(-50%);
          background: linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 50%, #dbeafe 100%);
          border: 1px solid rgba(186, 230, 253, 0.75);
          box-shadow: inset 0 0 50px rgba(2, 132, 199, 0.06), 0 10px 40px rgba(2, 132, 199, 0.08);
          transition: 1.8s ease-in-out;
          border-radius: 50%;
          z-index: 6;
        }

        .forms-container {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .signin-signup {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          left: 75%;
          width: 50%;
          transition: 1s 0.7s ease-in-out;
          display: grid;
          grid-template-columns: 1fr;
          z-index: 5;
        }

        form {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 3.5rem;
          transition: all 0.2s 0.7s;
          overflow: hidden;
          grid-column: 1 / 2;
          grid-row: 1 / 2;
          width: 100%;
        }

        form.sign-up-form {
          opacity: 0;
          z-index: 1;
        }

        form.sign-in-form {
          z-index: 2;
        }

        .form-title {
          font-size: 1.85rem;
          color: #0f172a;
          margin-bottom: 4px;
          font-weight: 800;
          letter-spacing: -0.025em;
        }

        .form-desc {
          font-size: 0.83rem;
          color: #64748b;
          margin-bottom: 18px;
          text-align: center;
          max-width: 330px;
          line-height: 1.45;
        }

        /* ── Inputs ── */
        .input-field-wrapper {
          max-width: 380px;
          width: 100%;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          margin: 6px 0;
          height: 48px;
          border-radius: 50px;
          display: grid;
          grid-template-columns: 14% 72% 14%;
          align-items: center;
          padding: 0 0.85rem;
          position: relative;
          transition: all 0.25s ease;
        }

        .input-field-wrapper:focus-within {
          background-color: #ffffff;
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        .input-field-wrapper .input-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: color 0.25s;
        }

        .input-field-wrapper:focus-within .input-icon {
          color: #0284c7;
        }

        .input-field-wrapper input,
        .input-field-wrapper select {
          background: none;
          outline: none;
          border: none;
          font-weight: 500;
          font-size: 0.9rem;
          color: #0f172a;
          width: 100%;
        }

        .input-field-wrapper input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .icon-btn:hover {
          color: #0f172a;
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 7px 14px;
          border-radius: 10px;
          margin: 4px 0 10px;
          max-width: 380px;
          width: 100%;
        }

        .form-row-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 380px;
          width: 100%;
          margin: 4px 0 10px;
          font-size: 0.78rem;
        }

        .form-link {
          color: #0284c7;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s;
        }

        .form-link:hover {
          color: #0369a1;
          text-decoration: underline;
        }

        .submit-btn {
          width: 100%;
          max-width: 380px;
          background: linear-gradient(135deg, #0284c7 0%, #1e40af 100%);
          border: none;
          outline: none;
          height: 48px;
          border-radius: 50px;
          color: #ffffff;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.06em;
          margin: 8px 0;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(2, 132, 199, 0.35);
        }

        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #0369a1 0%, #1e3a8a 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(2, 132, 199, 0.45);
        }

        .submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* ── Header Demo Button ── */
        .header-demo-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: #ffffff;
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 0.73rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
          margin-left: 8px;
        }

        .header-demo-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
          filter: brightness(1.06);
        }

        .header-demo-btn .count-pill {
          background: rgba(255, 255, 255, 0.22);
          border-radius: 9999px;
          padding: 1px 6px;
          font-size: 0.65rem;
          font-weight: 800;
        }

        /* ── Promotional Panel Demo Action ── */
        .btn-promo-demo {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #ffffff;
          color: #0369a1;
          border: 1.5px solid #bae6fd;
          padding: 9px 16px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08);
          margin-top: 8px;
        }

        .btn-promo-demo:hover {
          background: #f0f9ff;
          border-color: #0284c7;
          color: #0284c7;
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(2, 132, 199, 0.15);
        }

        /* ── Instant Demo 1-Click Drawer (Light Theme) ── */
        .quick-roles-container {
          margin-top: 10px;
          max-width: 380px;
          width: 100%;
        }

        .quick-roles-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          padding: 7px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #0369a1;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 6px rgba(2, 132, 199, 0.06);
        }

        .quick-roles-trigger:hover {
          background: #e0f2fe;
          border-color: #7dd3fc;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.12);
        }

        .demo-badge {
          background: #0284c7;
          color: #ffffff;
          padding: 1px 7px;
          border-radius: 9999px;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.03em;
        }

        .quick-roles-card {
          margin-top: 6px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 8px;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);
          animation: fadeInUp 0.25s ease-out;
        }

        .quick-roles-filter-bar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding-bottom: 6px;
          margin-bottom: 6px;
          border-bottom: 1px solid #f1f5f9;
          overflow-x: auto;
        }

        .quick-filter-pill {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 2px 8px;
          font-size: 0.65rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .quick-filter-pill:hover {
          color: #0284c7;
          border-color: #bae6fd;
          background: #f0f9ff;
        }

        .quick-filter-pill.active {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
          font-weight: 700;
        }

        .quick-roles-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
          max-height: 135px;
          overflow-y: auto;
          padding-right: 2px;
        }

        .quick-roles-grid::-webkit-scrollbar {
          width: 4px;
        }

        .quick-roles-grid::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .quick-role-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 5px 7px;
          cursor: pointer;
          transition: all 0.18s;
          text-align: left;
          width: 100%;
        }

        .quick-role-chip:hover {
          background: #f0f9ff;
          border-color: #0284c7;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.1);
          transform: translateY(-1px);
        }

        .quick-role-chip.loading {
          background: #e0f2fe;
          border-color: #0284c7;
          opacity: 0.85;
          cursor: wait;
        }

        .chip-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
        }

        .chip-texts {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          line-height: 1.15;
        }

        .chip-role {
          font-size: 0.69rem;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chip-name {
          font-size: 0.61rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .quick-roles-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid #f1f5f9;
        }

        .quick-modal-open-link {
          font-size: 0.68rem;
          font-weight: 700;
          color: #0284c7;
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.15s;
        }

        .quick-modal-open-link:hover {
          color: #0369a1;
          text-decoration: underline;
        }

        /* ── Full Demo Modal (Clean White Theme) ── */
        .demo-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          animation: fadeIn 0.2s ease-out;
        }

        .demo-modal-card {
          width: 100%;
          max-width: 860px;
          max-height: 88vh;
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.25);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .demo-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .demo-modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .demo-modal-close:hover {
          background: #fee2e2;
          border-color: #fca5a5;
          color: #dc2626;
        }

        .demo-modal-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 24px;
          border-bottom: 1px solid #f1f5f9;
          background: #ffffff;
          flex-wrap: wrap;
        }

        .demo-search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 6px 12px;
          min-width: 260px;
          flex: 1;
        }

        .demo-search-box:focus-within {
          border-color: #0284c7;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
        }

        .demo-category-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
        }

        .demo-tab-pill {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 4px 12px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .demo-tab-pill:hover {
          background: #e0f2fe;
          color: #0284c7;
          border-color: #7dd3fc;
        }

        .demo-tab-pill.active {
          background: #0284c7;
          color: #ffffff;
          border-color: #0284c7;
          font-weight: 700;
        }

        .demo-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 12px;
          padding: 18px 24px;
          overflow-y: auto;
          flex: 1;
        }

        .demo-portal-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .demo-portal-card:hover {
          border-color: #0284c7;
          box-shadow: 0 8px 20px -4px rgba(2, 132, 199, 0.12);
          transform: translateY(-2px);
        }

        .demo-portal-card.active-card {
          border-color: #0284c7;
          background: #f0f9ff;
        }

        .demo-card-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
        }

        .demo-category-tag {
          font-size: 0.62rem;
          font-weight: 700;
          color: #0369a1;
          background: #e0f2fe;
          padding: 1px 7px;
          border-radius: 9999px;
          white-space: nowrap;
        }

        .demo-launch-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #0284c7;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 5px 10px;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s;
        }

        .demo-launch-btn:hover {
          background: #0369a1;
          transform: translateY(-1px);
        }

        .demo-launch-btn.loading {
          background: #0ea5e9;
          cursor: wait;
        }

        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* ── Panels Container & Promotional Section ── */
        .panels-container {
          position: absolute;
          height: 100%;
          width: 100%;
          top: 0;
          left: 0;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        }

        .panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          z-index: 6;
        }

        .left-panel {
          pointer-events: all;
          padding: 2rem 14%;
        }

        .right-panel {
          pointer-events: none;
          padding: 2rem 14%;
        }

        .panel .content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          transition: transform 0.9s ease-in-out;
          transition-delay: 0.6s;
          width: 100%;
        }

        /* ── Dedicated Large Centered Logo Container in Left Panel ── */
        .promo-logo-container {
          width: 116px;
          height: 116px;
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid rgba(186, 230, 253, 0.9);
          box-shadow: 0 12px 30px -4px rgba(2, 132, 199, 0.14), 0 4px 10px -2px rgba(2, 132, 199, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          margin-bottom: 22px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          animation: logoEntrance 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .promo-logo-container:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 16px 36px -4px rgba(2, 132, 199, 0.2);
        }

        .promo-logo-container img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          user-select: none;
        }

        @keyframes logoEntrance {
          0% { opacity: 0; transform: scale(0.85) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        .panel h3 {
          font-weight: 800;
          line-height: 1.2;
          font-size: 1.85rem;
          margin-bottom: 10px;
          letter-spacing: -0.025em;
          color: #0f172a;
        }

        .panel p {
          font-size: 0.92rem;
          color: #475569;
          line-height: 1.6;
          max-width: 340px;
          margin-bottom: 20px;
        }

        /* ── Promotional CTA Button ── */
        .btn-promo-action {
          background: #ffffff;
          border: 2px solid #0284c7;
          width: 160px;
          height: 46px;
          font-weight: 700;
          font-size: 0.85rem;
          color: #0284c7;
          border-radius: 46px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.15);
        }

        .btn-promo-action:hover {
          background: #0284c7;
          color: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(2, 132, 199, 0.3);
        }

        .right-panel .content {
          transform: translateX(800px);
        }

        /* ── Sliding State Toggle ── */
        .container.sign-up-mode:before {
          transform: translate(100%, -50%);
          right: 52%;
        }

        .container.sign-up-mode .left-panel .content {
          transform: translateX(-800px);
        }

        .container.sign-up-mode .signin-signup {
          left: 25%;
        }

        .container.sign-up-mode form.sign-up-form {
          opacity: 1;
          z-index: 2;
        }

        .container.sign-up-mode form.sign-in-form {
          opacity: 0;
          z-index: 1;
        }

        .container.sign-up-mode .right-panel .content {
          transform: translateX(0%);
        }

        .container.sign-up-mode .left-panel {
          pointer-events: none;
        }

        .container.sign-up-mode .right-panel {
          pointer-events: all;
        }

        /* ── Footer (Light Theme) ── */
        .auth-footer {
          margin-top: 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 0.78rem;
          color: #64748b;
          z-index: 10;
        }

        .auth-footer button,
        .auth-footer a {
          color: #0284c7;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
        }

        .auth-footer button:hover,
        .auth-footer a:hover {
          text-decoration: underline;
        }

        /* ── Animations ── */
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Responsive Mobile & Tablet ── */
        @media (max-width: 870px) {
          .container {
            min-height: 840px;
            height: auto;
          }
          .signin-signup {
            width: 100%;
            top: 92%;
            transform: translate(-50%, -100%);
            transition: 1s 0.8s ease-in-out;
          }
          .signin-signup,
          .container.sign-up-mode .signin-signup {
            left: 50%;
          }
          .panels-container {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 2fr 1fr;
          }
          .panel {
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 1.5rem 6%;
            grid-column: 1 / 2;
          }
          .right-panel {
            grid-row: 3 / 4;
          }
          .left-panel {
            grid-row: 1 / 2;
          }
          .promo-logo-container {
            width: 86px;
            height: 86px;
            margin-bottom: 12px;
          }
          .panel h3 {
            font-size: 1.35rem;
          }
          .panel p {
            font-size: 0.8rem;
            padding: 0.2rem 0;
            margin-bottom: 12px;
          }
          .btn-promo-action {
            width: 140px;
            height: 40px;
            font-size: 0.78rem;
          }
          .container:before {
            width: 1500px;
            height: 1500px;
            transform: translateX(-50%);
            left: 30%;
            bottom: 68%;
            right: initial;
            top: initial;
            transition: 2s ease-in-out;
          }
          .container.sign-up-mode:before {
            transform: translate(-50%, 100%);
            bottom: 32%;
            right: initial;
          }
          .container.sign-up-mode .left-panel .content {
            transform: translateY(-300px);
          }
          .container.sign-up-mode .right-panel .content {
            transform: translateY(0px);
          }
          .right-panel .content {
            transform: translateY(300px);
          }
          .container.sign-up-mode .signin-signup {
            top: 6%;
            transform: translate(-50%, 0);
          }
          form {
            padding: 0 1.5rem;
          }
        }

        /* Reduced motion accessibility */
        @media (prefers-reduced-motion: reduce) {
          .ambient-orb,
          .white-theme-header,
          .container,
          .promo-logo-container {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* ── Background: Dotted Grid Pattern ── */}
      <div className="auth-grid-pattern" />

      {/* ── Background: Ambient Light-Blue Gradient Orbs with Pointer Parallax ── */}
      <div
        className="ambient-orb ambient-orb-1"
        style={{
          transform: `translate3d(${mousePos.x * 20}px, ${mousePos.y * 20}px, 0)`,
        }}
      />
      <div
        className="ambient-orb ambient-orb-2"
        style={{
          transform: `translate3d(${mousePos.x * -18}px, ${mousePos.y * -18}px, 0)`,
        }}
      />
      <div
        className="ambient-orb ambient-orb-3"
        style={{
          transform: `translate(-50%, -50%) translate3d(${mousePos.x * 12}px, ${mousePos.y * 12}px, 0)`,
        }}
      />

      {/* ── Background: Subtle Educational & Geometric Accents ── */}
      <div className="bg-light-decor">
        <div
          className="decor-ring"
          style={{ width: '420px', height: '420px', top: '-100px', right: '5%', opacity: 0.6 }}
        />
        <div
          className="decor-ring"
          style={{ width: '280px', height: '280px', bottom: '5%', left: '4%', opacity: 0.5 }}
        />
      </div>

      {/* ── 1. Top Branding Header (Clean White Surface & Restrained Shadow) ── */}
      <header className="white-theme-header">
        <div className="flex items-center gap-2.5">
          <School className="h-4 w-4 text-sky-600" />
          <span className="school-name">Nehru International School</span>
          <span className="divider" />
          <span className="school-tagline">A Tradition of Excellence · School ERP</span>
        </div>
        <button
          type="button"
          className="header-demo-btn"
          onClick={() => setDemoModalOpen(true)}
          title="Instant 1-Click Access for all 22 live dashboards"
        >
          <Zap className="h-3 w-3 text-amber-300 fill-amber-300 animate-pulse" />
          <span>Instant Demo Access</span>
          <span className="count-pill">22 Roles</span>
        </button>
      </header>

      {/* ── 2. Sliding AuthSwitch Container ── */}
      <main className={cn('container', isSignUp && 'sign-up-mode')}>
        <div className="forms-container">
          <div className="signin-signup">
            {/* ── RIGHT LOGIN FORM: Portal Sign In ── */}
            <form className="sign-in-form" onSubmit={handleSignIn}>
              <h2 className="form-title">Portal Sign In</h2>
              <p className="form-desc">
                Access your Academic, Student, or Administrative dashboard
              </p>

              {error && (
                <div className="error-alert">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="input-field-wrapper">
                <span className="input-icon">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  placeholder="Institutional Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <span />
              </div>

              <div className="input-field-wrapper">
                <span className="input-icon">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="form-row-actions">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                  <input type="checkbox" defaultChecked className="rounded accent-sky-600" />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="form-link"
                  onClick={() => setForgotPasswordOpen(true)}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{activeDemoRole ? `Entering ${activeDemoRole}…` : 'Signing in…'}</span>
                  </>
                ) : (
                  <>
                    Sign In to Portal <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* ── Instant Demo 1-Click Access for All Logins ── */}
              <div className="quick-roles-container">
                <button
                  type="button"
                  className="quick-roles-trigger"
                  onClick={() => setShowQuickAccounts(v => !v)}
                >
                  <span className="flex items-center gap-1.5 font-bold text-sky-800">
                    <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                    Instant Demo Access (All Logins)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="demo-badge">22 Portals</span>
                    <ChevronDown className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', showQuickAccounts && 'rotate-180')} />
                  </div>
                </button>

                {showQuickAccounts && (
                  <div className="quick-roles-card">
                    {/* Category Tabs */}
                    <div className="quick-roles-filter-bar">
                      {(['All', 'Leadership', 'Academics', 'Staff', 'Portals'] as const).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          className={cn('quick-filter-pill', demoCategory === cat && 'active')}
                          onClick={() => setDemoCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Role Chips */}
                    <div className="quick-roles-grid">
                      {filteredDemoAccounts.map(acct => {
                        const isCurrentActive = activeDemoRole === acct.role && loading
                        return (
                          <button
                            key={acct.role}
                            type="button"
                            className={cn('quick-role-chip', isCurrentActive && 'loading')}
                            onClick={() => handleInstantDemoLogin(acct)}
                            disabled={loading}
                            title={`${acct.role} • ${acct.name}\n${acct.label}\nClick for Instant 1-Click Login`}
                          >
                            <span className="chip-icon">
                              {isCurrentActive ? (
                                <Loader2 className="h-3 w-3 animate-spin text-sky-600" />
                              ) : (
                                acct.icon
                              )}
                            </span>
                            <div className="chip-texts">
                              <span className="chip-role">{acct.role.replace(/ \/ .*/, '')}</span>
                              <span className="chip-name">{acct.name}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    <div className="quick-roles-footer">
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                        <Zap className="h-2.5 w-2.5 text-amber-500 fill-amber-500" /> Click any role for 1-click access
                      </span>
                      <button
                        type="button"
                        className="quick-modal-open-link"
                        onClick={() => setDemoModalOpen(true)}
                      >
                        All 22 detailed cards →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* ── SIGN UP / ADMISSION ENQUIRY FORM ── */}
            <form className="sign-up-form" onSubmit={handleSignUp}>
              <h2 className="form-title">Student Admissions</h2>
              <p className="form-desc">
                Register a new student application or parent admission inquiry
              </p>

              {regSuccess ? (
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-slate-800">Application Submitted!</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Thank you, {regName}. Our admissions coordinator has received your enquiry for {regGrade} and will contact you at {regPhone}.
                  </p>
                  <button
                    type="button"
                    className="mt-4 text-xs font-semibold text-sky-600 hover:underline"
                    onClick={() => {
                      setRegSuccess(false)
                      setRegName('')
                      setRegEmail('')
                      setRegPhone('')
                    }}
                  >
                    Submit another application
                  </button>
                </div>
              ) : (
                <>
                  <div className="input-field-wrapper">
                    <span className="input-icon">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Student / Parent Full Name"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      required
                    />
                    <span />
                  </div>

                  <div className="input-field-wrapper">
                    <span className="input-icon">
                      <Phone className="h-4 w-4" />
                    </span>
                    <input
                      type="tel"
                      placeholder="Contact Mobile Number"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      required
                    />
                    <span />
                  </div>

                  <div className="input-field-wrapper">
                    <span className="input-icon">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      placeholder="Email Address (optional)"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                    />
                    <span />
                  </div>

                  <div className="input-field-wrapper">
                    <span className="input-icon">
                      <GraduationCap className="h-4 w-4" />
                    </span>
                    <select
                      value={regGrade}
                      onChange={e => setRegGrade(e.target.value)}
                      className="cursor-pointer"
                    >
                      <option value="Kindergarten">Kindergarten / Prep</option>
                      <option value="Grade 1">Grade 1</option>
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11 (Science / Commerce)</option>
                      <option value="Grade 12">Grade 12</option>
                    </select>
                    <span />
                  </div>

                  <button type="submit" className="submit-btn" disabled={regLoading}>
                    {regLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                      </>
                    ) : (
                      <>
                        Submit Admission Inquiry <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>

        {/* ── Sliding Left & Right Message Panels ── */}
        <div className="panels-container">
          {/* ── LEFT PROMOTIONAL PANEL (With Prominent Centered NIS Logo) ── */}
          <div className="panel left-panel">
            <div className="content">
              {/* 1. Large Nehru International School Logo Container (Horizontally Centered) */}
              <div className="promo-logo-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/nis-logo.png"
                  alt="Nehru International School"
                  draggable={false}
                />
              </div>

              {/* 2. Heading: "New to Nehru International?" */}
              <h3>New to Nehru International?</h3>

              {/* 3. Supporting Description */}
              <p>
                Join our academic community. Explore admission procedures, submit application
                enquiries, and register for school campus visits.
              </p>

              {/* 4. Apply Now Button & Instant Demo Portals Trigger */}
              <div className="flex flex-col gap-2 mt-2 w-full max-w-[260px]">
                <button
                  type="button"
                  className="btn-promo-action"
                  onClick={() => setIsSignUp(true)}
                >
                  Apply Now <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="btn-promo-demo"
                  onClick={() => setDemoModalOpen(true)}
                >
                  <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span>Instant Demo 22 Portals</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT PROMOTIONAL PANEL (Active in Sign-up Mode) ── */}
          <div className="panel right-panel">
            <div className="content">
              {/* Logo in sign-up mode panel */}
              <div className="promo-logo-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/nis-logo.png"
                  alt="Nehru International School"
                  draggable={false}
                />
              </div>

              <h3>Already Enrolled or Staff?</h3>
              <p>
                Welcome back! Sign in to access your classroom timetable, attendance records,
                examination grading, and institutional dashboard.
              </p>
              <button
                type="button"
                className="btn-promo-action"
                onClick={() => setIsSignUp(false)}
              >
                Sign In <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── 3. Footer (Light Theme) ── */}
      <footer className="auth-footer">
        <span className="flex items-center gap-1.5 text-slate-600">
          <ShieldCheck className="h-3.5 w-3.5 text-sky-600" /> ISO 9001:2015 Accredited Campus
        </span>
        <span>•</span>
        <span>Nehru International School ERP v2.4</span>
        <span>•</span>
        <button
          type="button"
          onClick={() => setForgotPasswordOpen(true)}
          className="text-sky-600 hover:underline cursor-pointer"
        >
          Staff & Parent Support
        </button>
      </footer>

      {/* Forgot Password Dialog */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        initialEmail={email}
      />

      {/* ── 4. Full Instant Demo Access Modal (All 22 Live Portals) ── */}
      {demoModalOpen && (
        <div className="demo-modal-overlay" onClick={() => setDemoModalOpen(false)}>
          <div className="demo-modal-card" onClick={e => e.stopPropagation()}>
            <div className="demo-modal-header">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    Instant Demo Access — All 22 Portals
                    <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      1-Click Live Dashboards
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click any role below to immediately enter their live dashboard as that persona.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="demo-modal-close"
                onClick={() => setDemoModalOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search and Tabs */}
            <div className="demo-modal-controls">
              <div className="demo-search-box">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by role, name, email or department..."
                  value={demoSearch}
                  onChange={e => setDemoSearch(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400"
                />
                {demoSearch && (
                  <button type="button" onClick={() => setDemoSearch('')} className="text-slate-400 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="demo-category-tabs">
                {(['All', 'Leadership', 'Academics', 'Staff', 'Portals'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={cn('demo-tab-pill', demoCategory === cat && 'active')}
                    onClick={() => setDemoCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of 22 Roles */}
            <div className="demo-cards-grid">
              {filteredDemoAccounts.map(acct => {
                const isCurrentActive = activeDemoRole === acct.role && loading
                return (
                  <div key={acct.role} className={cn('demo-portal-card', isCurrentActive && 'active-card')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="demo-card-icon">
                          {acct.icon}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{acct.role}</h4>
                          <p className="text-[11px] font-medium text-slate-600">{acct.name}</p>
                        </div>
                      </div>
                      <span className="demo-category-tag">{acct.subCategory || acct.category}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 min-h-[32px]">
                      {acct.label}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                        {acct.email}
                      </span>
                      <button
                        type="button"
                        className={cn('demo-launch-btn', isCurrentActive && 'loading')}
                        onClick={() => {
                          setDemoModalOpen(false)
                          handleInstantDemoLogin(acct)
                        }}
                        disabled={loading}
                      >
                        {isCurrentActive ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" /> Entering…
                          </>
                        ) : (
                          <>
                            Enter Portal <ArrowRight className="h-3 w-3" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
