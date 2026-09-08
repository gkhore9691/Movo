import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Plus, ChevronRight, Clock, Play, Pencil, Trash2, MessageSquare, Bell, Gift, CalendarCheck } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Card, CardHeader, Button, Badge, Stat, Toggle } from '@/components/ui'
import { formatRelativeDate } from '@/utils/format'

const presetTemplates = [
  {
    name: 'Post-Delivery Review',
    description: 'Request reviews after job completion',
    icon: <CalendarCheck className="w-5 h-5" />,
    trigger: 'Job delivered',
    actions: ['Wait 1 day', 'Send review request'],
  },
  {
    name: 'Maintenance Reminder',
    description: 'Remind customers about maintenance',
    icon: <Clock className="w-5 h-5" />,
    trigger: '60 days since service',
    actions: ['Send reminder', 'Follow up in 3 days'],
  },
  {
    name: 'Lead Follow-up',
    description: 'Chase unresponsive quotes',
    icon: <MessageSquare className="w-5 h-5" />,
    trigger: 'Quote sent, no response',
    actions: ['Wait 3 days', 'Send follow-up'],
  },
  {
    name: 'Birthday Greeting',
    description: 'Send personalized greetings with offers',
    icon: <Gift className="w-5 h-5" />,
    trigger: 'Customer birthday',
    actions: ['Send greeting', 'Include discount'],
  },
]

const actionTypeColors: Record<string, string> = {
  wait: 'bg-slate-100 text-slate-700 border-slate-200',
  message: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  condition: 'bg-amber-50 text-amber-700 border-amber-200',
  notification: 'bg-blue-50 text-blue-700 border-blue-200',
}

export default function Automations() {
  const { automations, updateAutomationEnabled, addAutomation, deleteAutomation } = useApp()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const activeCount = automations.filter(a => a.enabled).length
  const totalRuns = automations.reduce((sum, a) => sum + a.runsCount, 0)
  const lastTriggered = automations
    .filter(a => a.lastRun)
    .sort((a, b) => new Date(b.lastRun!).getTime() - new Date(a.lastRun!).getTime())[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Automations</h1>
          <p className="text-sm text-slate-500 mt-1">Let Movo handle repetitive tasks automatically</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => alert('Select a template below to create a new automation')}>Create Automation</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          label="Active Automations"
          value={activeCount}
          icon={<Zap className="w-5 h-5" />}
        />
        <Stat
          label="Total Runs"
          value={totalRuns.toLocaleString()}
          icon={<Play className="w-5 h-5" />}
        />
        <Stat
          label="Last Triggered"
          value={lastTriggered?.lastRun ? formatRelativeDate(lastTriggered.lastRun) : 'Never'}
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      <div className="space-y-4">
        {automations.map((automation, idx) => (
          <motion.div
            key={automation.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card
              className={`transition-opacity duration-200 ${!automation.enabled ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="pt-0.5">
                  <Toggle
                    checked={automation.enabled}
                    onChange={(val) => updateAutomationEnabled(automation.id, val)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{automation.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{automation.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => alert('Edit automation: ' + automation.name)} />
                      <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => { if (confirm('Delete "' + automation.name + '"?')) deleteAutomation(automation.id) }} />
                    </div>
                  </div>

                  {/* Workflow visualization */}
                  <div className="mt-4">
                    <button
                      onClick={() => setExpandedId(expandedId === automation.id ? null : automation.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          expandedId === automation.id ? 'rotate-90' : ''
                        }`}
                      />
                      View workflow
                    </button>

                    {expandedId === automation.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 overflow-hidden"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {/* WHEN trigger */}
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-500">When</span>
                            {automation.trigger}
                          </div>

                          {/* Conditions */}
                          {automation.conditions.length > 0 && (
                            <>
                              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-500">If</span>
                                {automation.conditions.join(' & ')}
                              </div>
                            </>
                          )}

                          {/* Actions */}
                          {automation.actions.map((action, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                              <div
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                                  actionTypeColors[action.type] || 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {action.delay && (
                                  <Clock className="w-3 h-3 opacity-60" />
                                )}
                                {action.label}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                    {automation.lastRun && (
                      <span>Last run: {formatRelativeDate(automation.lastRun)}</span>
                    )}
                    <span>{automation.runsCount} total runs</span>
                    {automation.enabled && (
                      <Badge variant="success" size="sm">Active</Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Preset templates */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Popular Automations</h2>
        <p className="text-sm text-slate-500 mb-4">Start with a template and customize to your needs</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {presetTemplates.map((template, idx) => (
            <motion.div
              key={template.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.05 }}
            >
              <Card className="h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    {template.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{template.name}</h4>
                    <p className="text-xs text-slate-500">{template.description}</p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-500 w-10">When</span>
                    <span className="text-xs text-slate-600">{template.trigger}</span>
                  </div>
                  {template.actions.map((action, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-500 w-10">Then</span>
                      <span className="text-xs text-slate-600">{action}</span>
                    </div>
                  ))}
                </div>

                <Button variant="secondary" size="sm" className="w-full" onClick={() => {
                  addAutomation({
                    id: 'auto-' + Date.now(),
                    name: template.name,
                    description: template.description,
                    trigger: template.trigger,
                    conditions: [],
                    actions: template.actions.map((a, i) => ({ type: i === 0 ? 'wait' : 'message', label: a, delay: i === 0 ? '3 days' : undefined })),
                    enabled: true,
                    lastRun: undefined,
                    runsCount: 0,
                  })
                }}>
                  Use Template
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
