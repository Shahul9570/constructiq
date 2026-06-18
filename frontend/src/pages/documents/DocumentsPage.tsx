import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService } from '@/services/document.service'
import {
  FileText,
  Upload,
  Trash2,
  FileIcon,
  Download,
  Filter,
  FileSpreadsheet,
  FileImage,
  FileArchive,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const projectId = () => Number(localStorage.getItem('selected_project_id') || 0)

function getFileIcon(fileType?: string) {
  if (!fileType) return <FileText className="h-4 w-4" />
  if (fileType.startsWith('image/')) return <FileImage className="h-4 w-4" />
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv'))
    return <FileSpreadsheet className="h-4 w-4" />
  if (fileType.includes('zip') || fileType.includes('rar'))
    return <FileArchive className="h-4 w-4" />
  return <FileText className="h-4 w-4" />
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const queryClient = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')

  const pid = projectId()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['documents', pid, page, categoryFilter, search],
    queryFn: () =>
      documentService.list(pid, {
        page,
        size: 50,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: search || undefined,
      }),
    enabled: !!pid,
  })

  const uploadMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData()
      if (uploadFile) formData.append('file', uploadFile)
      if (uploadCategory) formData.append('category', uploadCategory)
      if (uploadDescription) formData.append('description', uploadDescription)
      return documentService.upload(pid, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document uploaded successfully')
      setIsUploadOpen(false)
      setUploadFile(null)
      setUploadCategory('')
      setUploadDescription('')
    },
    onError: () => toast.error('Failed to upload document'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => documentService.delete(selectedDoc!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document deleted')
      setIsDeleteOpen(false)
      setSelectedDoc(null)
    },
    onError: () => toast.error('Failed to delete document'),
  })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) setUploadFile(file)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setUploadFile(file)
  }

  const documents = data?.items || []

  if (!pid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Manage project documents and files</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a project to view documents</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Manage project documents and files</p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="drawing">Drawing</SelectItem>
            <SelectItem value="report">Report</SelectItem>
            <SelectItem value="specification">Specification</SelectItem>
            <SelectItem value="invoice">Invoice</SelectItem>
            <SelectItem value="permit">Permit</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <DocumentsSkeleton />
      ) : isError ? (
        <div className="text-center py-12 text-red-500">Failed to load documents</div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg mb-2">No documents found</p>
          <Button onClick={() => setIsUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Version</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc: any) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getFileIcon(doc.file_type)}
                      <span className="truncate max-w-[250px]">{doc.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {doc.category || 'Uncategorized'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">v{doc.version || 1}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatFileSize(doc.file_size)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {doc.file_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedDoc(doc); setIsDeleteOpen(true) }}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a file to the project documents.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : uploadFile
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
              {uploadFile ? (
                <div className="space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-green-500" />
                  <p className="font-medium">{uploadFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(uploadFile.size)}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="font-medium">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Supported files: PDF, Images, Spreadsheets, Documents
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="doc-category">Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger id="doc-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="drawing">Drawing</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="specification">Specification</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="permit">Permit</SelectItem>
                  <SelectItem value="client_vault">Client Vault (Visible to Homeowner)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doc-desc">Description (optional)</Label>
              <Input
                id="doc-desc"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => uploadMutation.mutate()} disabled={!uploadFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedDoc?.name}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DocumentsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
