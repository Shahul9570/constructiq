import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage platform users and roles.</p>
      </div>

      <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
        <CardContent className="pt-6">
          <EmptyState
            icon={Users}
            title="User Management Coming Soon"
            description="The full user administration table is being built. For now, users can register themselves on the main page."
          />
        </CardContent>
      </Card>
    </div>
  )
}
