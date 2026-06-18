import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { projectService } from '@/services/project.service'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2 } from 'lucide-react'

export function ProjectSwitcher() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => projectService.list({ page: 1, size: 100 }),
  })

  useEffect(() => {
    const saved = localStorage.getItem('selected_project_id')
    if (saved) {
      setSelectedProjectId(saved)
    } else if (projectsData?.items?.length) {
      const firstId = String(projectsData.items[0].id)
      setSelectedProjectId(firstId)
      localStorage.setItem('selected_project_id', firstId)
      window.dispatchEvent(new Event('storage'))
    }
  }, [projectsData])

  const handleProjectChange = (val: string) => {
    setSelectedProjectId(val)
    localStorage.setItem('selected_project_id', val)
    window.dispatchEvent(new Event('storage'))
    // Force a reload of the page to refresh context
    window.location.reload()
  }

  if (isLoading || !projectsData?.items?.length) return null

  return (
    <div className="flex items-center gap-2 border-r border-white/10 pr-4 mr-2 hidden md:flex">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
        <Building2 className="h-4 w-4" />
      </div>
      <Select value={selectedProjectId} onValueChange={handleProjectChange}>
        <SelectTrigger className="w-[220px] border-none bg-transparent hover:bg-white/5 shadow-none focus:ring-0 font-semibold tracking-tight">
          <SelectValue placeholder="Select Project" />
        </SelectTrigger>
        <SelectContent>
          {projectsData.items.map((project) => (
            <SelectItem key={project.id} value={String(project.id)}>
              <span className="font-medium">{project.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
