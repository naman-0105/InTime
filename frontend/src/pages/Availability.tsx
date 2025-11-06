import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { availabilityService } from '../services/availabilityService'
import { Plus, Trash2, Globe, Check, AlertCircle } from 'lucide-react'


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
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const loadAvailability = async () => {
      try {
        setLoading(true)
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
            intervals:
              defaultEnabled && rules.length === 0
                ? [{ startTime: '09:00', endTime: '17:00' }]
                : [{ startTime: '09:00', endTime: '17:00' }],
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
        setLoading(false)
      }
    }

    loadAvailability()
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

  const handleSave = async () => {
    setError('')
    setSuccessMessage('')
    setSaving(true)

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
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-neutral-500 text-sm">Loading availability...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
            Weekly Availability
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Set your recurring available hours for meetings throughout the week.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center space-x-2 h-9 px-4 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-md transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving ? (
            <span>Saving...</span>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </>
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
        <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

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
    </div>
  )
}
