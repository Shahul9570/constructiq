export interface User {
  id: number
  email: string
  username: string
  full_name: string
  phone?: string
  role: UserRole
  company_name?: string
  is_active: boolean
  is_verified: boolean
  avatar_url?: string
  created_at: string
  updated_at: string
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  COMPANY_OWNER = 'company_owner',
  PROJECT_MANAGER = 'project_manager',
  SITE_ENGINEER = 'site_engineer',
  CONTRACTOR = 'contractor',
  ACCOUNTANT = 'accountant',
  CLIENT = 'client',
}

export interface Project {
  id: number
  name: string
  client_name?: string
  client_id?: number
  location: string
  description?: string
  start_date: string
  expected_end_date: string
  actual_end_date?: string
  budget: number
  status: ProjectStatus
  project_type: string
  progress_percentage: number
  is_archived: boolean
  created_by: number
  created_at: string
  updated_at: string
  blocks: ProjectBlock[]
  structures: ProjectStructure[]
}

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived',
}

export interface ProjectBlock {
  id: number
  project_id: number
  name: string
  block_type: string
  description?: string
  progress_percentage: number
  start_date?: string
  end_date?: string
}

export interface ProjectStructure {
  id: number
  project_id: number
  parent_id?: number
  name: string
  level: number
  sort_order: number
  children: ProjectStructure[]
}

export interface Worker {
  id: number
  worker_id: string
  name: string
  phone?: string
  trade: string
  daily_wage: number
  contractor_id?: number
  project_id: number
  is_active: boolean
  join_date?: string
  bank_account?: string
  aadhar_number?: string
  address?: string
}

export interface Attendance {
  id: number
  worker_id: number
  project_id: number
  date: string
  status: AttendanceStatus
  hours_worked: number
  overtime_hours: number
  amount_earned: number
  remarks?: string
  worker_name?: string
  worker_trade?: string
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  HALF_DAY = 'half_day',
  OVERTIME = 'overtime',
  LEAVE = 'leave',
}

export interface Contractor {
  id: number
  name: string
  company_name?: string
  phone: string
  email?: string
  address?: string
  trade?: string
  team_size: number
  contract_amount: number
  paid_amount: number
  pending_amount: number
  rating: number
  project_id: number
  payments: ContractorPayment[]
}

export interface ContractorPayment {
  id: number
  contractor_id: number
  amount: number
  payment_date: string
  payment_method?: string
  status: string
  notes?: string
}

export interface Material {
  id: number
  project_id: number
  name: string
  material_type: string
  unit: string
  current_stock: number
  reorder_level: number
  unit_price: number
  supplier_name?: string
  is_active: boolean
  is_low_stock: boolean
  arrivals: MaterialArrival[]
  consumptions: MaterialConsumption[]
}

export interface MaterialArrival {
  id: number
  material_id: number
  quantity: number
  supplier_name?: string
  invoice_number?: string
  invoice_amount: number
  paid_amount: number
  arrival_date: string
  received_by: number
  notes?: string
  created_at: string
}

export interface MaterialConsumption {
  id: number
  material_id: number
  quantity: number
  area?: string
  work_area?: string
  consumption_date: string
  notes?: string
}

export interface Equipment {
  id: number
  project_id: number
  name: string
  equipment_type: string
  model_number?: string
  status: string
  total_hours_used: number
  total_fuel_used: number
  last_maintenance_date?: string
  next_maintenance_date?: string
  hourly_rate: number
  operator_name?: string
}

export interface DailyWorkLog {
  id: number
  project_id: number
  block_id?: number
  task_id?: number
  date: string
  area: string
  activity: string
  planned_quantity: number
  completed_quantity: number
  unit: string
  labour_hours: number
  workers_count: number
  progress_percentage: number
  remarks?: string
  weather_condition?: string
  verification_status: 'pending' | 'approved' | 'rejected'
  verified_by_id?: number
  verified_at?: string
  verification_remarks?: string
}

export interface CostRecord {
  id: number
  project_id: number
  category: string
  description?: string
  amount: number
  date: string
  status: 'pending' | 'approved' | 'rejected'
}

export interface Invoice {
  id: number
  project_id: number
  invoice_number: string
  invoice_type: string
  vendor_name?: string
  amount: number
  tax_amount: number
  total_amount: number
  status: string
  issue_date: string
  due_date?: string
  paid_date?: string
}

export interface Document {
  id: number
  project_id: number
  name: string
  file_url: string
  file_type?: string
  category?: string
  tags?: string
  version: number
  description?: string
  uploaded_by: number
  created_at: string
}

export interface Photo {
  id: number
  project_id: number
  file_url: string
  thumbnail_url?: string
  caption?: string
  area?: string
  activity?: string
  photo_date?: string
  is_video: boolean
  created_at: string
}

export interface DashboardClient {
  id: number
  progress_percentage: number
  budget: number
  status: string
  recent_photos: Array<{url: string, caption: string}>
  recent_activities: Array<{date: string, activity: string, progress: number}>
  documents: Array<{name: string, url: string, date: string, size: number}>
  invoices: Array<{invoice_number: string, amount: number, status: string, due_date: string | null, url: string}>
  total_paid: number
  total_pending: number
}

export interface DashboardSiteEngineer {
  date: string
  total_labour_today: number
  labour_cost_today: number
  today_material_consumption: number
  today_progress: {
    total_activities: number
    planned_quantity: number
    completed_quantity: number
    progress_percentage: number
  }
  low_stock_alerts: number
}

export interface DashboardProjectManager {
  project_status: string
  progress_percentage: number
  delays_days: number
  total_cost: number
  budget: number
  budget_utilization: number
  is_over_budget: boolean
  weekly_progress: number
  total_workers: number
}

export interface DashboardOwner {
  total_projects: number
  active_projects: number
  completed_projects: number
  total_budget: number
  total_spent: number
  remaining_budget: number
  budget_health_percentage: number
  overall_progress: number
  projects_at_risk: number
}

export interface AIReport {
  report: string
}

export interface AIAnswer {
  answer: string
}

export interface CompletionPrediction {
  predicted_completion_date: string
  estimated_days_remaining: number
  delay_days: number
  delay_probability: number
  current_progress: number
  on_track: boolean
}

export interface MaterialForecast {
  forecasts: {
    material_name: string
    current_stock: number
    unit: string
    daily_avg_consumption: number
    days_until_reorder: number
    recommended_reorder_date: string
    is_low_stock: boolean
  }[]
  materials_at_risk: number
}

export interface CostForecast {
  total_budget: number
  current_spent: number
  current_progress: number
  estimated_final_cost: number
  estimated_overrun: number
  estimated_under_budget: number
  confidence_level: number
  is_over_budget: boolean
}

export interface RiskDetection {
  risks: {
    type: string
    severity: string
    message: string
  }[]
  risk_count: number
  has_critical_risks: boolean
  overall_health: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}
