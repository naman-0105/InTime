import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { availabilityService } from '../services/availabilityService'
import type { AvailabilityOverride } from '../types'
import { Plus, Trash2, Globe, Check, AlertCircle, Calendar as CalendarIcon, Clock } from 'lucide-react'

interface TimeInterval {
  startTime: string
  endTime: string
}

interface DaySchedule {
  dayOfWeek: number
  dayName: string
  isEnabled: boolean
  intervals: TimeInterval[]
}

const DAYS_CONFIG = [
  { dayOfWeek: 1, dayName: 'Monday' },
  { dayOfWeek: 2, dayName: 'Tuesday' },
  { dayOfWeek: 3, dayName: 'Wednesday' },
  { dayOfWeek: 4, dayName: 'Thursday' },
  { dayOfWeek: 5, dayName: 'Friday' },
  { dayOfWeek: 6, dayName: 'Saturday' },
  { dayOfWeek: 0, dayName: 'Sunday' },
]

export const Availability = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'weekly' | 'overrides'>('weekly')

  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [savingSchedule, setSavingSchedule] = useState(false)

  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([])
  const [loadingOverrides, setLoadingOverrides] = useState(true)
  const [addingOverride, setAddingOverride] = useState(false)

  const [overrideDate, setOverrideDate] = useState('')
  const [overrideIsAvailable, setOverrideIsAvailable] = useState(false)
  const [overrideStart, setOverrideStart] = useState('09:00')
  const [overrideEnd, setOverrideEnd] = useState('17:00')

  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadWeeklyAvailability = async () => {
    try {
      setLoadingSchedule(true)
      const rules = await availabilityService.getAvailability()

      const initialSchedule: DaySchedule[] = DAYS_CONFIG.map(({ dayOfWeek, dayName }) => {
        const dayRules = rules
          .filter((r) => r.dayOfWeek === dayOfWeek)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))

        if (dayRules.length > 0) {
          return {
            dayOfWeek,
            dayName,
            isEnabled: true,
            intervals: dayRules.map((r) => ({ startTime: r.startTime, endTime: r.endTime })),
          }
        }

        const defaultEnabled = dayOfWeek >= 1 && dayOfWeek <= 5
        return {
          dayOfWeek,
          dayName,
          isEnabled: defaultEnabled && rules.length === 0,
          intervals: [{ startTime: '09:00', endTime: '17:00' }],
        }
      })

      setSchedule(initialSchedule)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to load availability rules')
      }
    } finally {
      setLoadingSchedule(false)
    }
  }

  const loadOverrides = async () => {
    try {
      setLoadingOverrides(true)
      const data = await availabilityService.getOverrides()
      setOverrides(data)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to load overrides')
      }
    } finally {
      setLoadingOverrides(false)
    }
  }

  useEffect(() => {
    loadWeeklyAvailability()
    loadOverrides()
  }, [])

  const toggleDay = (dayOfWeek: number) => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d
        const nextEnabled = !d.isEnabled
        return {
          ...d,
          isEnabled: nextEnabled,
          intervals:
            d.intervals.length === 0
              ? [{ startTime: '09:00', endTime: '17:00' }]
              : d.intervals,
        }
      })
    )
  }

  const addInterval = (dayOfWeek: number) => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d
        const lastInterval = d.intervals[d.intervals.length - 1]
        let newStart = '17:00'
        let newEnd = '18:00'
        if (lastInterval) {
          newStart = lastInterval.endTime
          const [h, m] = newStart.split(':').map(Number)
          const endH = Math.min(23, h + 1)
          newEnd = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        }
        return {
          ...d,
          intervals: [...d.intervals, { startTime: newStart, endTime: newEnd }],
        }
      })
    )
  }

  const removeInterval = (dayOfWeek: number, index: number) => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d
        const updated = d.intervals.filter((_, i) => i !== index)
        return {
          ...d,
          isEnabled: updated.length > 0,
          intervals: updated.length > 0 ? updated : [{ startTime: '09:00', endTime: '17:00' }],
        }
      })
    )
  }

  const updateInterval = (
    dayOfWeek: number,
    index: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d
        const updated = d.intervals.map((inv, i) => {
          if (i !== index) return inv
          return { ...inv, [field]: value }
        })
        return { ...d, intervals: updated }
      })
    )
  }

  const handleSaveWeekly = async () => {
    setError('')
    setSuccessMessage('')
    setSavingSchedule(true)

    try {
      const flattenedRules: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = []

      for (const day of schedule) {
        if (day.isEnabled) {
          for (const interval of day.intervals) {
            flattenedRules.push({
              dayOfWeek: day.dayOfWeek,
              startTime: interval.startTime,
              endTime: interval.endTime,
            })
          }
        }
      }

      await availabilityService.setAvailability(flattenedRules)
      setSuccessMessage('Weekly availability saved successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to save availability')
      }
    } finally {
      setSavingSchedule(false)
    }
  }

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!overrideDate) {
      setError('Please select a date for the override')
      return
    }

    setError('')
    setSuccessMessage('')
    setAddingOverride(true)

    try {
      const result = await availabilityService.setOverride({
        date: overrideDate,
        isAvailable: overrideIsAvailable,
        startTime: overrideIsAvailable ? overrideStart : undefined,
        endTime: overrideIsAvailable ? overrideEnd : undefined,
      })

      setOverrides((prev) => {
        const filtered = prev.filter((o) => o.id !== result.id && !o.date.startsWith(overrideDate))
        return [...filtered, result].sort((a, b) => a.date.localeCompare(b.date))
      })

      setOverrideDate('')
      setOverrideIsAvailable(false)
      setSuccessMessage('Date override added successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to add override')
      }
    } finally {
      setAddingOverride(false)
    }
  }

  const handleDeleteOverride = async (id: string, dateStr: string) => {
    if (!window.confirm(`Delete override for ${formatDisplayDate(dateStr)}?`)) {
      return
    }

    try {
      await availabilityService.deleteOverride(id)
      setOverrides((prev) => prev.filter((o) => o.id !== id))
      setSuccessMessage('Date override removed')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to delete override')
      }
    }
  }

  const formatDisplayDate = (dateStr: string) => {
    try {
      const cleanDate = dateStr.split('T')[0]
      const [year, month, day] = cleanDate.split('-').map(Number)
      const d = new Date(Date.UTC(year, month - 1, day))
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
            Availability
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Configure your standard weekly schedule and date-specific overrides.
          </p>
        </div>

        {activeTab === 'weekly' && (
          <button
            onClick={handleSaveWeekly}
            disabled={savingSchedule || loadingSchedule}
            className="inline-flex items-center justify-center space-x-2 h-9 px-4 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-md transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {savingSchedule ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => {
            setActiveTab('weekly')
            setError('')
          }}
          className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === 'weekly'
              ? 'border-neutral-900 text-neutral-900 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Weekly Hours</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('overrides')
            setError('')
          }}
          className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer flex items-center space-x-2 ${
            activeTab === 'overrides'
              ? 'border-neutral-900 text-neutral-900 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Date Overrides</span>
          {overrides.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-100 text-neutral-700 font-mono">
              {overrides.length}
            </span>
          )}
        </button>
      </div>

      {user && (
        <div className="p-3.5 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-neutral-500" />
            <span>
              Time zone: <strong className="text-neutral-900 font-medium">{user.timezone}</strong>
            </span>
          </div>
          <span className="text-[11px] text-neutral-500">Slots will be calculated in this timezone</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-md border border-red-200 text-red-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-md border border-emerald-200 text-gray-800 text-xs flex items-center space-x-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {activeTab === 'weekly' && (
        <>
          {loadingSchedule ? (
            <div className="py-12 text-center text-neutral-500 text-sm">Loading availability...</div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-200 shadow-xs">
              {schedule.map((day) => (
                <div key={day.dayOfWeek} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-32 flex items-center space-x-3 shrink-0 pt-1.5">
                    <input
                      type="checkbox"
                      id={`day-${day.dayOfWeek}`}
                      checked={day.isEnabled}
                      onChange={() => toggleDay(day.dayOfWeek)}
                      className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                    />
                    <label
                      htmlFor={`day-${day.dayOfWeek}`}
                      className={`text-xs font-semibold cursor-pointer ${
                        day.isEnabled ? 'text-neutral-900' : 'text-neutral-400'
                      }`}
                    >
                      {day.dayName}
                    </label>
                  </div>

                  <div className="flex-1">
                    {!day.isEnabled ? (
                      <p className="text-xs text-neutral-400 italic pt-1.5">Unavailable</p>
                    ) : (
                      <div className="space-y-2.5">
                        {day.intervals.map((interval, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <input
                                  type="time"
                                  value={interval.startTime}
                                  onChange={(e) =>
                                    updateInterval(day.dayOfWeek, idx, 'startTime', e.target.value)
                                  }
                                  className="h-9 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 font-mono"
                                />
                              </div>

                              <span className="text-neutral-400 text-xs">-</span>

                              <div className="relative">
                                <input
                                  type="time"
                                  value={interval.endTime}
                                  onChange={(e) =>
                                    updateInterval(day.dayOfWeek, idx, 'endTime', e.target.value)
                                  }
                                  className="h-9 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 font-mono"
                                />
                              </div>
                            </div>

                            {day.intervals.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeInterval(day.dayOfWeek, idx)}
                                className="w-8 h-8 rounded border border-neutral-200 text-neutral-500 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                                title="Remove interval"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {idx === day.intervals.length - 1 && (
                              <button
                                type="button"
                                onClick={() => addInterval(day.dayOfWeek)}
                                className="h-8 px-2 rounded border border-neutral-200 hover:bg-neutral-50 text-neutral-600 text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                                title="Add another time interval"
                              >
                                <Plus className="w-3 h-3" />
                                <span className="text-[11px]">Add</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'overrides' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 mb-3">
              Add Date Override
            </h3>
            <form onSubmit={handleAddOverride} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Select Date
                  </label>
                  <input
                    type="date"
                    required
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="w-full px-3 h-9 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Availability Status
                  </label>
                  <div className="flex items-center space-x-4 h-9">
                    <label className="flex items-center space-x-2 text-xs text-neutral-700 cursor-pointer">
                      <input
                        type="radio"
                        name="overrideType"
                        checked={!overrideIsAvailable}
                        onChange={() => setOverrideIsAvailable(false)}
                        className="text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                      />
                      <span>Unavailable (all day)</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs text-neutral-700 cursor-pointer">
                      <input
                        type="radio"
                        name="overrideType"
                        checked={overrideIsAvailable}
                        onChange={() => setOverrideIsAvailable(true)}
                        className="text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                      />
                      <span>Custom hours</span>
                    </label>
                  </div>
                </div>
              </div>

              {overrideIsAvailable && (
                <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 flex items-center space-x-3">
                  <span className="text-xs font-medium text-neutral-700">Available from:</span>
                  <input
                    type="time"
                    required
                    value={overrideStart}
                    onChange={(e) => setOverrideStart(e.target.value)}
                    className="h-8 px-2 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 font-mono"
                  />
                  <span className="text-neutral-400 text-xs">to</span>
                  <input
                    type="time"
                    required
                    value={overrideEnd}
                    onChange={(e) => setOverrideEnd(e.target.value)}
                    className="h-8 px-2 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 font-mono"
                  />
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={addingOverride}
                  className="h-8 px-3.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {addingOverride ? 'Adding...' : 'Add Date Override'}
                </button>
              </div>
            </form>
          </div>

          <div>
            <div className="mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
                Configured Overrides
              </h3>
            </div>

            {loadingOverrides ? (
              <div className="py-8 text-center text-neutral-500 text-xs">Loading overrides...</div>
            ) : overrides.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center shadow-xs">
                <CalendarIcon className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
                <p className="text-xs text-neutral-500">No date-specific overrides added yet.</p>
              </div>
            ) : (
              <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100 shadow-xs">
                {overrides.map((override) => (
                  <div
                    key={override.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-600">
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-900">
                          {formatDisplayDate(override.date)}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          {override.isAvailable ? (
                            <span className="text-emerald-700 font-medium">
                              Custom hours: {override.startTime} - {override.endTime}
                            </span>
                          ) : (
                            <span className="text-red-700 font-medium">Unavailable</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteOverride(override.id, override.date)}
                      className="w-8 h-8 rounded border border-neutral-200 hover:border-red-200 text-neutral-500 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete override"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
