'use client'
import { 
  Heading, 
  VStack, 
  Box, 
  Button, 
  Input, 
  Textarea,
  Text,
  HStack
} from '@chakra-ui/react'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { permissions } from '@/utils/permissions'

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [assetData, setAssetData] = useState({
    name: '',
    description: '',
    tags: '',
    brand: '',
    assetNo: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // 权限检查
  useEffect(() => {
    if (!permissions.canUpload()) {
      setMessage({
        type: 'error',
        text: 'Access denied. You do not have permission to upload assets. Redirecting to assets page...'
      })
      // 3秒后重定向到资产页面
      setTimeout(() => {
        router.push('/dashboard/assets')
      }, 3000)
    }
  }, [router])

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    // 支持的文件类型：图片(JPG, PNG), 3D模型(GLB), 视频(MP4)
    const validExtensions = ['jpg', 'jpeg', 'png', 'glb', 'mp4']
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    if (fileExtension && validExtensions.includes(fileExtension)) {
      setSelectedFile(file)
      
      // 自动填充资产名称（使用文件名去掉扩展名）
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
      setAssetData(prev => ({
        ...prev,
        name: prev.name || fileNameWithoutExt
      }))
      
      setMessage(null)
    } else {
      setMessage({
        type: 'error',
        text: 'Please upload supported file types: JPG, PNG, GLB (3D models), or MP4 (videos)'
      })
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setAssetData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({
        type: 'error',
        text: 'Please select a file to upload'
      })
      return
    }

    if (!assetData.name.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter an asset name'
      })
      return
    }

    setUploading(true)
    
    try {
      // 这里将连接到真实的后端 API
      // 暂时保持模拟上传
      setTimeout(() => {
        setUploading(false)
        setSelectedFile(null)
        setAssetData({
          name: '',
          description: '',
          tags: '',
          brand: '',
          assetNo: ''
        })
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        setMessage({
          type: 'success',
          text: `${selectedFile.name} has been uploaded successfully`
        })
      }, 2000)
    } catch (error) {
      setUploading(false)
      setMessage({
        type: 'error',
        text: 'Upload failed. Please try again.'
      })
    }
  }

  const handleClear = () => {
    setSelectedFile(null)
    setAssetData({
      name: '',
      description: '',
      tags: '',
      brand: '',
      assetNo: ''
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setMessage(null)
  }

  // 获取文件类型显示名称
  const getFileTypeDisplay = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) return 'Image'
    if (ext === 'glb') return '3D Model'
    if (ext === 'mp4') return 'Video'
    return 'File'
  }

  // 如果用户没有上传权限，显示错误信息
  if (!permissions.canUpload()) {
    return (
      <VStack align="stretch" gap={6}>
        <Heading>Upload Asset</Heading>
        <Box 
          bg="red.50" 
          color="red.800"
          p={4} 
          borderRadius="md" 
          borderWidth="1px"
          borderColor="red.200"
          textAlign="center"
        >
          <Text fontWeight="bold" mb={2}>Access Denied</Text>
          <Text>
            You do not have permission to upload assets. Only Editor role can upload assets. 
            Redirecting to assets page...
          </Text>
        </Box>
      </VStack>
    )
  }

  return (
    <VStack align="stretch" gap={6}>
      <Heading>Upload Asset</Heading>

      {message && (
        <Box 
          bg={message.type === 'error' ? 'red.50' : 'green.50'} 
          color={message.type === 'error' ? 'red.800' : 'green.800'}
          p={3} 
          borderRadius="md" 
          borderWidth="1px"
          borderColor={message.type === 'error' ? 'red.200' : 'green.200'}
        >
          {message.text}
        </Box>
      )}

      <Box 
        border="2px dashed" 
        borderColor={dragOver ? "blue.400" : "gray.300"}
        borderRadius="lg" 
        p={8} 
        textAlign="center"
        bg={dragOver ? "blue.50" : "gray.50"}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        cursor="pointer"
        transition="all 0.2s"
        onClick={() => fileInputRef.current?.click()}
      >
        <VStack gap={4}>
          <Text fontSize="xl" fontWeight="bold">
            {selectedFile ? 'File Selected' : 'Drag & Drop Files Here'}
          </Text>
          <Text color="gray.600">
            {selectedFile 
              ? selectedFile.name 
              : 'or click to select files from your computer'
            }
          </Text>
          <Text fontSize="sm" color="gray.500">
            Supports: JPG, PNG (Images), GLB (3D Models), MP4 (Videos)
          </Text>
          {!selectedFile && (
            <Button colorScheme="blue">
              Select Files
            </Button>
          )}
        </VStack>
        
        <Input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept=".jpg,.jpeg,.png,.glb,.mp4"
          display="none"
        />
      </Box>

      {selectedFile && (
        <VStack align="stretch" gap={4} p={6} borderWidth="1px" borderRadius="lg" bg="white">
          <Heading size="md">File Information</Heading>
          
          <Box>
            <Text fontWeight="medium" mb={2}>Selected File:</Text>
            <Text color="gray.600">{selectedFile.name}</Text>
            <Text fontSize="sm" color="gray.500">
              Type: {getFileTypeDisplay(selectedFile.name)} | 
              Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </Text>
          </Box>

          <VStack align="stretch" gap={3}>
            <Box>
              <Text fontWeight="medium" mb={2}>Asset Name *</Text>
              <Input 
                placeholder="Enter asset name" 
                value={assetData.name}
                onChange={handleInputChange('name')}
              />
            </Box>

            <HStack gap={4}>
              <Box flex={1}>
                <Text fontWeight="medium" mb={2}>Asset Number</Text>
                <Input 
                  placeholder="Enter asset number" 
                  value={assetData.assetNo}
                  onChange={handleInputChange('assetNo')}
                />
              </Box>
              <Box flex={1}>
                <Text fontWeight="medium" mb={2}>Brand</Text>
                <Input 
                  placeholder="Enter brand" 
                  value={assetData.brand}
                  onChange={handleInputChange('brand')}
                />
              </Box>
            </HStack>

            <Box>
              <Text fontWeight="medium" mb={2}>Description</Text>
              <Textarea 
                placeholder="Describe this asset..." 
                rows={4}
                value={assetData.description}
                onChange={handleInputChange('description')}
              />
            </Box>

            <Box>
              <Text fontWeight="medium" mb={2}>Tags</Text>
              <Input 
                placeholder="Add tags (comma separated)" 
                value={assetData.tags}
                onChange={handleInputChange('tags')}
              />
            </Box>

            <HStack gap={4} mt={4}>
              <Button 
                colorScheme="blue" 
                onClick={handleUpload}
                loading={uploading}
                loadingText="Uploading..."
              >
                Upload Asset
              </Button>
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
            </HStack>
          </VStack>
        </VStack>
      )}
    </VStack>
  )
}