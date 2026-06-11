import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { analyticsApi, aiApi } from '../../lib/api'
import { getCurrentCompanyId } from '../../lib/company'

type AnalyticsTrend = {
  month: string
  processed: number
  exceptions: number
}

type AIInsight = {
  id: string
  title: string
  description: string
  confidence: number
  severity: string
}

type AnalyticsMetrics = {
  auto_reconciliation_rate?: string
  average_match_time?: string
  manual_intervention_rate?: string
  cost_savings_estimated?: number
}

export function AnalyticsPage() {
  const [companyId, setCompanyId] = useState('')
  useEffect(() => { getCurrentCompanyId().then(setCompanyId) }, [])

  const { data: metrics } = useQuery<AnalyticsMetrics>({
    queryKey: ['analytics-metrics', companyId],
    queryFn: () => analyticsApi.getPerformanceMetrics(companyId),
    enabled: !!companyId,
  })

  const { data: trends } = useQuery<AnalyticsTrend[]>({
    queryKey: ['analytics-trends', companyId],
    queryFn: () => analyticsApi.getTrendData(companyId),
    enabled: !!companyId,
  })

  const { data: aiInsights } = useQuery<AIInsight[]>({
    queryKey: ['ai-insights', companyId],
    queryFn: () => aiApi.getInsights(companyId),
    enabled: !!companyId,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics & AI Insights</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Performance tracking and AI-driven anomaly detection.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Auto-Match Rate</p>
          <p className="text-2xl font-bold text-blue-600">{metrics?.auto_reconciliation_rate ?? '0%'}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Match Time</p>
          <p className="text-2xl font-bold text-green-600">{metrics?.average_match_time ?? '0h'}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manual Effort</p>
          <p className="text-2xl font-bold text-orange-600">{metrics?.manual_intervention_rate ?? '0%'}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">Est. Savings</p>
          <p className="text-2xl font-bold text-indigo-600">${metrics?.cost_savings_estimated ?? 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Processing Trends">
          <div className="h-64 flex items-end justify-between gap-2 px-4 pb-2 border-b border-l border-gray-200 dark:border-gray-800">
            {trends?.map((item) => (
              <div key={item.month} className="flex flex-col items-center flex-1 group">
                <div 
                  className="w-full bg-blue-500 rounded-t transition-all group-hover:bg-blue-600" 
                  style={{ height: `${(item.processed / 10)}%` }}
                />
                <div 
                  className="w-full bg-red-400 rounded-t transition-all group-hover:bg-red-500" 
                  style={{ height: `${(item.exceptions)}%` }}
                />
                <span className="text-[10px] mt-2 text-gray-500 dark:text-gray-400 uppercase">{item.month}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="AI Intelligence Hub">
          <div className="space-y-4">
            {aiInsights?.map((insight) => (
              <div key={insight.id} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{insight.title}</h3>
                  <Badge variant={insight.severity === 'high' ? 'danger' : 'warning'}>
                    {Math.round(insight.confidence * 100)}% Conf.
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{insight.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}