import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { photoService } from '@/services/photo.service'
import {
  Image,
  Upload,
  Trash2,
  X,
  Filter,
  Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { getFileUrl } from '@/lib/utils'
import type { Photo } from '@/types'

const projectId = () => Number(localStorage.getItem('selected_project_id') || 0)

export default function PhotosPage() {
  const queryClient = useQueryClient()
  const [area, setArea] = useState('all')
  const [page, setPage] = useState(1)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCaption, setUploadCaption] = useState('')
  const [uploadArea, setUploadArea] = useState('')
  const [uploadActivity, setUploadActivity] = useState('')
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0])

  const pid = projectId()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['photos', pid, page, area],
    queryFn: () =>
      photoService.list(pid, {
        page,
        size: 50,
        area: area !== 'all' ? area : undefined,
      }),
    enabled: !!pid,
  })

  const uploadMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData()
      if (uploadFile) formData.append('file', uploadFile)
      if (uploadCaption) formData.append('caption', uploadCaption)
      if (uploadArea) formData.append('area', uploadArea)
      if (uploadActivity) formData.append('activity', uploadActivity)
      if (uploadDate) formData.append('photo_date', uploadDate)
      return photoService.upload(pid, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] })
      toast.success('Photo uploaded successfully')
      setIsUploadOpen(false)
      resetUpload()
    },
    onError: () => toast.error('Failed to upload photo'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => photoService.delete(selectedPhoto!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] })
      toast.success('Photo deleted')
      setIsDeleteOpen(false)
      setIsViewOpen(false)
      setSelectedPhoto(null)
    },
    onError: () => toast.error('Failed to delete photo'),
  })

  const resetUpload = () => {
    setUploadFile(null)
    setUploadCaption('')
    setUploadArea('')
    setUploadActivity('')
    setUploadDate(new Date().toISOString().split('T')[0])
  }

  const photos = data?.items || []

  const uniqueAreas = [...new Set(photos.map((p: Photo) => p.area).filter(Boolean))] as string[]

  if (!pid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Photos</h1>
          <p className="text-muted-foreground">Project photo gallery</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <Image className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a project to view photos</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Photos</h1>
          <p className="text-muted-foreground">Project photo gallery</p>
        </div>
        <Button onClick={() => { resetUpload(); setIsUploadOpen(true) }}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Photo
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={area} onValueChange={(v) => { setArea(v); setPage(1) }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {uniqueAreas.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <PhotosSkeleton />
      ) : isError ? (
        <div className="text-center py-12 text-red-500">Failed to load photos</div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Image className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg mb-2">No photos yet</p>
          <Button onClick={() => { resetUpload(); setIsUploadOpen(true) }}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Photo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map((photo: Photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer"
              onClick={() => { setSelectedPhoto(photo); setIsViewOpen(true) }}
            >
              <img
                src={getFileUrl(photo.thumbnail_url || photo.file_url)}
                alt={photo.caption || 'Photo'}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {photo.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[700px]">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPhoto.caption || 'Photo'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden bg-muted">
                  <img
                    src={getFileUrl(selectedPhoto.file_url)}
                    alt={selectedPhoto.caption || 'Photo'}
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  {selectedPhoto.area && (
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary">{selectedPhoto.area}</Badge>
                    </div>
                  )}
                  {selectedPhoto.activity && (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">{selectedPhoto.activity}</Badge>
                    </div>
                  )}
                  {selectedPhoto.photo_date && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(selectedPhoto.photo_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                    <span>Uploaded: {new Date(selectedPhoto.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Photo
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Photo</DialogTitle>
            <DialogDescription>Add a photo to the project gallery.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                uploadFile
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onClick={() => document.getElementById('photo-upload')?.click()}
            >
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setUploadFile(file)
                }}
              />
              {uploadFile ? (
                <div className="space-y-2">
                  <Image className="h-8 w-8 mx-auto text-green-500" />
                  <p className="font-medium">{uploadFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setUploadFile(null)
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Image className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="font-medium">Click to select a photo</p>
                  <p className="text-sm text-muted-foreground">JPG, PNG, WebP accepted</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Area</label>
                <Input
                  value={uploadArea}
                  onChange={(e) => setUploadArea(e.target.value)}
                  placeholder="e.g. Foundation"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Activity</label>
                <Input
                  value={uploadActivity}
                  onChange={(e) => setUploadActivity(e.target.value)}
                  placeholder="e.g. Concrete pouring"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Caption</label>
              <Input
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="Photo caption..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input
                type="date"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
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
            <DialogTitle>Delete Photo</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this photo? This cannot be undone.
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

function PhotosSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  )
}
