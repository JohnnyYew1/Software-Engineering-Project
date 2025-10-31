
'use client'
export const dynamic = 'force-dynamic'
// 现有代码保持不变
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

export default function UploadPage() {
  const [mounted, setMounted] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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
    const validTypes = ['image/jpeg', 'image/png', 'model/gltf-binary', 'application/octet-stream']
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const validExtensions = ['jpg', 'jpeg', 'png', 'glb', 'obj', 'fbx']
    
    if (validTypes.includes(file.type) || validExtensions.includes(fileExtension || '')) {
      setSelectedFile(file)
      setMessage(null)
    } else {
      setMessage({
        type: 'error',
        text: 'Please upload photos (JPG, PNG) or 3D models (GLB, OBJ, FBX)'
      })
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    
    setUploading(true)
    setTimeout(() => {
      setUploading(false)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setMessage({
        type: 'success',
        text: `${selectedFile.name} has been uploaded successfully`
      })
    }, 2000)
  }

  const handleClear = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setMessage(null)
  }

  if (!mounted) {
    return (
      <VStack align="stretch" gap={6}>
        <Heading>Upload Asset</Heading>
        <Text>Loading...</Text>
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
            Supports: JPG, PNG, GLB, OBJ, FBX
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
          accept=".jpg,.jpeg,.png,.glb,.obj,.fbx"
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
              Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </Text>
          </Box>

          <VStack align="stretch" gap={3}>
            <Box>
              <Text fontWeight="medium" mb={2}>Asset Name</Text>
              <Input placeholder="Enter asset name" />
            </Box>

            <Box>
              <Text fontWeight="medium" mb={2}>Description</Text>
              <Textarea placeholder="Describe this asset..." rows={4} />
            </Box>

            <Box>
              <Text fontWeight="medium" mb={2}>Tags</Text>
              <Input placeholder="Add tags (comma separated)" />
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