import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { aiService } from '@/services/ai.service'
import {
  Brain,
  Send,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Package,
  ShieldAlert,
  Loader2,
  Bot,
  User,
  FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import type { CompletionPrediction, MaterialForecast, RiskDetection, AIReport } from '@/types'

const projectId = () => Number(localStorage.getItem('selected_project_id') || 0)

export default function AIAssistantPage() {
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([])

  const pid = projectId()

  const { data: prediction, isLoading: predictionLoading, refetch: refetchPrediction } = useQuery({
    queryKey: ['ai-prediction', pid],
    queryFn: () => aiService.predictCompletion(pid),
    enabled: false,
  })

  const { data: forecast, isLoading: forecastLoading, refetch: refetchForecast } = useQuery({
    queryKey: ['ai-forecast', pid],
    queryFn: () => aiService.forecastMaterials(pid),
    enabled: false,
  })

  const { data: riskData, isLoading: riskLoading, refetch: refetchRisks } = useQuery({
    queryKey: ['ai-risks', pid],
    queryFn: () => aiService.detectRisks(pid),
    enabled: false,
  })

  const chatMutation = useMutation({
    mutationFn: (question: string) => aiService.askQuestion(question, pid),
    onSuccess: (data) => {
      setChatHistory((prev) => [...prev, { role: 'ai', content: data.answer }])
    },
    onError: () => toast.error('Failed to get AI response'),
  })

  const reportMutation = useMutation({
    mutationFn: () => aiService.generateReport(pid),
    onSuccess: () => {
      toast.success('Report generated successfully')
    },
    onError: () => toast.error('Failed to generate report'),
  })

  const handleSend = () => {
    if (!chatInput.trim()) return
    setChatHistory((prev) => [...prev, { role: 'user', content: chatInput }])
    chatMutation.mutate(chatInput)
    setChatInput('')
  }

  const handleGenerateReport = () => {
    reportMutation.mutate()
  }

  if (!pid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-muted-foreground">AI-powered project insights and predictions</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <Brain className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a project to use AI features</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground">AI-powered project insights and predictions</p>
      </div>

      <Tabs defaultValue="chat">
        <TabsList className="flex-wrap">
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="report">Report Generator</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="risks">Risk Detection</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4">
                {chatHistory.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Ask a question about your project...
                  </p>
                )}
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {msg.role === 'ai' && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Brain className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[80%] ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <div className="rounded-lg px-4 py-2 bg-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button onClick={handleSend} disabled={!chatInput.trim() || chatMutation.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AI Report Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a comprehensive AI-powered report for this project.
              </p>
              <Button onClick={handleGenerateReport} disabled={reportMutation.isPending}>
                {reportMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate AI Report
                  </>
                )}
              </Button>
              {reportMutation.data && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                      {reportMutation.data.report}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Completion Prediction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => refetchPrediction()} disabled={predictionLoading}>
                {predictionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Load Prediction
                  </>
                )}
              </Button>
              {prediction && <PredictionCard data={prediction} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Material Forecasts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => refetchForecast()} disabled={forecastLoading}>
                {forecastLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Load Forecast
                  </>
                )}
              </Button>
              {forecast && <ForecastCard data={forecast} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Risk Detection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => refetchRisks()} disabled={riskLoading}>
                {riskLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Detect Risks
                  </>
                )}
              </Button>
              {riskData && <RiskCard data={riskData} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PredictionCard({ data }: { data: CompletionPrediction }) {
  const delayPercent = Math.min(100, (data.delay_probability || 0) * 100)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">Predicted Completion</p>
          <p className="text-xl font-bold mt-1">
            {data.predicted_completion_date
              ? new Date(data.predicted_completion_date).toLocaleDateString()
              : '-'}
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">Days Remaining</p>
          <p className="text-xl font-bold mt-1">{data.estimated_days_remaining || 0}</p>
        </div>
        <div className="p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">Current Progress</p>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={data.current_progress || 0} className="flex-1" />
            <span className="text-xl font-bold">{(data.current_progress || 0).toFixed(1)}%</span>
          </div>
        </div>
        <div className="p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">Delay Status</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={data.on_track ? 'default' : 'destructive'}>
              {data.on_track ? 'On Track' : `Delayed by ${data.delay_days || 0} days`}
            </Badge>
          </div>
        </div>
      </div>
      <div className="p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">Delay Probability</p>
          <span className="text-sm font-bold">{delayPercent.toFixed(1)}%</span>
        </div>
        <Progress value={delayPercent} />
      </div>
    </div>
  )
}

function ForecastCard({ data }: { data: MaterialForecast }) {
  return (
    <div className="space-y-4">
      {data.materials_at_risk > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">{data.materials_at_risk} material(s) at risk</span>
        </div>
      )}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Material</th>
              <th className="text-right p-3 font-medium">Stock</th>
              <th className="text-right p-3 font-medium">Daily Avg</th>
              <th className="text-right p-3 font-medium">Days Left</th>
              <th className="text-right p-3 font-medium">Reorder By</th>
            </tr>
          </thead>
          <tbody>
            {data.forecasts?.map((item, i) => (
              <tr key={i} className={`border-b ${item.is_low_stock ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                <td className="p-3 font-medium">
                  <div className="flex items-center gap-2">
                    {item.material_name}
                    {item.is_low_stock && <AlertTriangle className="h-3 w-3 text-red-500" />}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <span className={item.is_low_stock ? 'text-red-600 font-medium' : ''}>
                    {item.current_stock} {item.unit}
                  </span>
                </td>
                <td className="p-3 text-right">{item.daily_avg_consumption?.toFixed(1) || 0}</td>
                <td className="p-3 text-right">{item.days_until_reorder || 0}</td>
                <td className="p-3 text-right">
                  {item.recommended_reorder_date
                    ? new Date(item.recommended_reorder_date).toLocaleDateString()
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RiskCard({ data }: { data: RiskDetection }) {
  const severityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive' as const
      case 'warning':
        return 'secondary' as const
      default:
        return 'outline' as const
    }
  }

  const overallColor = data.overall_health === 'good' ? 'text-green-600' : data.overall_health === 'warning' ? 'text-orange-600' : 'text-red-600'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Badge variant={data.has_critical_risks ? 'destructive' : 'default'} className="text-sm px-3 py-1">
          {data.risk_count} Risk{data.risk_count !== 1 ? 's' : ''} Detected
        </Badge>
        <span className={`text-sm font-medium capitalize ${overallColor}`}>
          Overall: {data.overall_health}
        </span>
      </div>
      <div className="grid gap-3">
        {data.risks?.map((risk, i) => (
          <Card
            key={i}
            className={`border-l-4 ${
              risk.severity === 'critical'
                ? 'border-l-red-500'
                : risk.severity === 'warning'
                  ? 'border-l-orange-500'
                  : 'border-l-green-500'
            }`}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <ShieldAlert className={`h-5 w-5 mt-0.5 ${
                risk.severity === 'critical' ? 'text-red-500' : risk.severity === 'warning' ? 'text-orange-500' : 'text-green-500'
              }`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={severityVariant(risk.severity)} className="capitalize">
                    {risk.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground capitalize">{risk.type}</span>
                </div>
                <p className="text-sm">{risk.message}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
