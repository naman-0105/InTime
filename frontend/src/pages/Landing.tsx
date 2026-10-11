import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Clock,
  Calendar,
  ArrowRight,
  Check,
  CheckCircle2,
  Sliders,
  Link2,
  CalendarCheck,
  Mail,
  Video,
  Globe,
  Menu,
  X,
  Copy,
} from 'lucide-react'

export const Landing = () => {
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(1)

  const handleCopyDemoLink = () => {
    navigator.clipboard.writeText('https://intime.namangoyal.dev/book/naman/meeting')
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const demoSlots = ['09:30 AM', '11:00 AM', '02:00 PM', '04:30 PM']

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 flex flex-col font-sans">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-white shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <span className="font-semibold text-base tracking-tight text-neutral-950">
              InTime
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-neutral-600">
            <a
              href="#features"
              className="hover:text-neutral-950 transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-neutral-950 transition-colors"
            >
              How it works
            </a>
          </nav>

          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                <Link
                  to="/events"
                  className="text-xs font-medium text-neutral-600 hover:text-neutral-900 px-3 py-2"
                >
                  Dashboard ({user.name})
                </Link>
                <Link
                  to="/events"
                  className="h-9 px-4 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs"
                >
                  <span>Go to App</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="h-9 px-3.5 text-xs font-medium text-neutral-700 hover:text-neutral-950 transition-colors flex items-center"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="h-9 px-4 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs"
                >
                  <span>Get started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-b border-neutral-200 bg-white px-4 pt-2 pb-4 space-y-2 text-sm font-medium">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-neutral-700 hover:bg-neutral-50"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-neutral-700 hover:bg-neutral-50"
            >
              How it works
            </a>
            <div className="pt-2 border-t border-neutral-100 flex flex-col gap-2">
              {user ? (
                <Link
                  to="/events"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full h-9 rounded-md bg-neutral-900 text-white text-xs font-medium flex items-center justify-center space-x-1.5"
                >
                  <span>Go to App ({user.name})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full h-9 rounded-md border border-neutral-300 text-neutral-700 text-xs font-medium flex items-center justify-center hover:bg-neutral-50"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full h-9 rounded-md bg-neutral-900 text-white text-xs font-medium flex items-center justify-center space-x-1.5"
                  >
                    <span>Get started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 text-xs font-medium tracking-wide uppercase mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-900"></span>
                YOUR TIME, BETTER ORGANIZED
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-neutral-950 leading-[1.1] mb-5">
                Make time for what matters.
              </h1>

              <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-xl mb-8">
                Share your availability, let others choose a time that works, and keep
                every meeting organized — without the endless back-and-forth.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  to={user ? '/events' : '/register'}
                  className="h-11 px-6 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium inline-flex items-center justify-center space-x-2 transition-colors shadow-xs"
                >
                  <span>{user ? 'Go to your dashboard' : "Get started — it's free"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#how-it-works"
                  className="h-11 px-5 rounded-md border border-neutral-300 hover:bg-neutral-100 bg-white text-neutral-800 text-sm font-medium inline-flex items-center justify-center transition-colors shadow-2xs"
                >
                  <span>See how it works</span>
                </a>
              </div>

              <div className="mt-5 flex items-center space-x-2 text-xs text-neutral-500">
                <Check className="w-4 h-4 text-neutral-700" />
                <span>Simple scheduling. Fewer emails. More time for your work.</span>
              </div>
            </div>

            <div className="lg:col-span-5 w-full">
              <div className="bg-white border border-neutral-200 rounded-xl shadow-xs p-5 sm:p-6 relative">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-200"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-200"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-200"></span>
                  </div>
                  <span className="text-neutral-400 font-mono text-[11px]">
                    intime.namangoyal.dev/book/naman
                  </span>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-neutral-500">Naman Goyal</p>
                      <h3 className="text-base font-semibold text-neutral-950 mt-0.5">
                        Meeting
                      </h3>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700">
                      30 min
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      <span>30 minutes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Google Meet</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-neutral-400" />
                      <span>UTC</span>
                    </div>
                  </div>
                </div>

                {/* Date & Time Slot Grid Simulation */}
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 mb-3">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Select a Date & Time</span>
                    </span>
                    <span className="text-[11px] font-normal text-neutral-500">October 2026</span>
                  </div>

                  {/* Day Picker */}
                  <div className="grid grid-cols-5 gap-1.5 mb-3 text-center">
                    {[
                      { day: 'Mon', date: '12' },
                      { day: 'Tue', date: '13', active: true },
                      { day: 'Wed', date: '14' },
                      { day: 'Thu', date: '15' },
                      { day: 'Fri', date: '16' },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className={`py-1.5 rounded-md border text-xs transition-colors ${
                          item.active
                            ? 'bg-neutral-900 border-neutral-900 text-white font-medium'
                            : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                        }`}
                      >
                        <div className="text-[10px] opacity-75">{item.day}</div>
                        <div className="font-semibold text-xs">{item.date}</div>
                      </div>
                    ))}
                  </div>

                  {/* Available Time Slots */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-neutral-500">Available slots</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {demoSlots.map((slot, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedSlotIndex(idx)}
                          className={`h-8 px-2.5 rounded border text-xs font-medium flex items-center justify-between transition-colors ${
                            selectedSlotIndex === idx
                              ? 'bg-neutral-900 border-neutral-900 text-white'
                              : 'bg-white border-neutral-200 text-neutral-800 hover:border-neutral-300'
                          }`}
                        >
                          <span>{slot}</span>
                          {selectedSlotIndex === idx && <Check className="w-3 h-3 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Confirmation Footer Card */}
                <div className="mt-4 pt-3.5 border-t border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-900 leading-tight">
                        Instant Confirmation
                      </p>
                      <p className="text-[11px] text-neutral-500">Email invite with Google Calendar link</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDemoLink}
                    className="inline-flex items-center space-x-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded transition-colors"
                    title="Copy demo booking link"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedLink ? 'Copied' : 'Share link'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. PRODUCT VALUE SECTION
      ========================================================================== */}
      <section className="py-16 sm:py-20 bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 mb-3">
            Scheduling should be the easiest part of your day.
          </h2>
          <p className="text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            From sharing your availability to managing confirmed meetings, InTime keeps the
            process simple, reliable, and completely under your control.
          </p>

          <div className="mt-10 grid sm:grid-cols-2 gap-6 text-left">
            <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
              <div className="w-8 h-8 rounded-md bg-neutral-900 text-white flex items-center justify-center mb-3">
                <Clock className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-900 mb-1">
                No overlapping slots
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Slots are calculated in real time against your schedule, buffer times, and notice rules.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
              <div className="w-8 h-8 rounded-md bg-neutral-900 text-white flex items-center justify-center mb-3">
                <Mail className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-900 mb-1">
                Reliable notifications
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Built-in email confirmations with direct calendar links for both host and guest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. FEATURES SECTION
      ========================================================================== */}
      <section id="features" className="py-16 sm:py-24 bg-[#fafafa] border-b border-neutral-200 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold tracking-wider uppercase text-neutral-500 mb-2">
              Capabilities
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
              Everything you need to schedule with confidence.
            </h2>
            <p className="mt-3 text-base text-neutral-600">
              Straightforward features designed around your daily workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800 mb-4">
                  <Sliders className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-neutral-950 mb-2">
                  Your availability, your rules
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-6">
                  Set your weekly schedule, configure meeting durations, and control minimum notice
                  periods and buffer intervals before and after appointments.
                </p>
              </div>

              {/* Realistic mini preview */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3 text-xs space-y-2">
                <div className="flex items-center justify-between text-neutral-700">
                  <span className="font-medium">Monday – Friday</span>
                  <span className="text-neutral-500 font-mono text-[11px]">09:00 AM – 05:00 PM</span>
                </div>
                <div className="flex items-center justify-between text-neutral-700 pt-1.5 border-t border-neutral-200">
                  <span className="text-neutral-500">Buffer after meeting</span>
                  <span className="font-medium text-neutral-800">10 mins</span>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800 mb-4">
                  <Link2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-neutral-950 mb-2">
                  One link. Easy booking.
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-6">
                  Share a dedicated scheduling link with candidates, clients, or colleagues. Guests
                  pick an open slot without needing an account.
                </p>
              </div>

              {/* Realistic mini preview */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3 text-xs">
                <div className="flex items-center justify-between bg-white border border-neutral-200 rounded px-2.5 py-1.5">
                  <span className="font-mono text-[11px] text-neutral-600 truncate mr-2">
                    intime.namangoyal.dev/book/yourname/30min
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800 mb-4">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-neutral-950 mb-2">
                  Meetings that stay organized
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-6">
                  Keep track of upcoming bookings, cancellations, and rescheduling in your host
                  dashboard. Guests receive self-service links to manage their booking anytime.
                </p>
              </div>

              {/* Realistic mini preview */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-900">Weekly Catchup with Sarah</span>
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    Confirmed
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500">Tomorrow at 2:00 PM • Google Meet</div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800 mb-4">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-neutral-950 mb-2">
                  The details, handled
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-6">
                  Immediate confirmation emails are sent with Google Calendar buttons, event locations,
                  and custom questionnaire responses so everyone arrives prepared.
                </p>
              </div>

              {/* Realistic mini preview */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3 text-xs">
                <div className="flex items-center gap-2 text-neutral-700">
                  <Check className="w-3.5 h-3.5 text-neutral-900" />
                  <span>Automated confirmation & reschedule notifications</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-700 mt-1.5">
                  <Check className="w-3.5 h-3.5 text-neutral-900" />
                  <span>One-click Google Calendar button in emails</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16 sm:py-24 bg-white border-b border-neutral-200 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-semibold tracking-wider uppercase text-neutral-500 mb-2">
              Simple Workflow
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
              How InTime works
            </h2>
            <p className="mt-3 text-base text-neutral-600">
              Three straightforward steps to take control of your calendar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative flex flex-col">
              <div className="text-xs font-mono font-semibold text-neutral-400 mb-3">
                01
              </div>
              <h3 className="text-base font-semibold text-neutral-950 mb-2">
                Set your availability
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Configure your weekly hours and create event types with customized durations, buffer
                times, and optional guest questions.
              </p>
              <div className="mt-6 pt-4 border-t border-neutral-100 text-xs text-neutral-500 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                <span>Adjust schedule anytime</span>
              </div>
            </div>

            <div className="relative flex flex-col">
              <div className="text-xs font-mono font-semibold text-neutral-400 mb-3">
                02
              </div>
              <h3 className="text-base font-semibold text-neutral-950 mb-2">
                Share your link
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Send your public booking link via email, message, or website. Guests see only the
                times you are truly available.
              </p>
              <div className="mt-6 pt-4 border-t border-neutral-100 text-xs text-neutral-500 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Custom event slug per meeting</span>
              </div>
            </div>

            <div className="relative flex flex-col">
              <div className="text-xs font-mono font-semibold text-neutral-400 mb-3">
                03
              </div>
              <h3 className="text-base font-semibold text-neutral-950 mb-2">
                Meet without the back-and-forth
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Both parties receive instant email confirmations and calendar invites. Manage or
                reschedule bookings seamlessly from InTime.
              </p>
              <div className="mt-6 pt-4 border-t border-neutral-100 text-xs text-neutral-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>No double-bookings</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24 bg-[#fafafa] border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 mb-4">
            Your next meeting starts with one link.
          </h2>
          <p className="text-base text-neutral-600 max-w-xl mx-auto mb-6 leading-relaxed">
            Set up your schedule and make booking time together effortless.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={user ? '/events' : '/register'}
              className="h-11 px-7 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium inline-flex items-center justify-center space-x-2 transition-colors shadow-xs"
            >
              <span>{user ? 'Open InTime Dashboard' : 'Get started'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-neutral-100">
            <div>
              <Link to="/" className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-md bg-neutral-900 flex items-center justify-center text-white">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-base tracking-tight text-neutral-950">
                  InTime
                </span>
              </Link>
              <p className="text-xs text-neutral-500 mt-1.5 max-w-sm">
                A scheduling tool designed for effortless meeting booking.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-neutral-600">
              <a href="#features" className="hover:text-neutral-950 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-neutral-950 transition-colors">
                How it works
              </a>
              <Link to="/login" className="hover:text-neutral-950 transition-colors">
                Log in
              </Link>
              <Link to="/register" className="hover:text-neutral-950 transition-colors">
                Sign up
              </Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-4">
            <p>© {new Date().getFullYear()} InTime. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
