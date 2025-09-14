'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  Image, 
  Video, 
  Mic, 
  Type, 
  Sparkles,
  Download,
  Copy,
  Share,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Zap,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  Filter,
  Search,
  BarChart3,
  Layers,
  Cpu,
  Database
} from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  provider: 'google' | 'huggingface' | 'anthropic' | 'openai';
  type: 'text' | 'image' | 'video' | 'audio' | 'multimodal';
  capabilities: string[];
  maxTokens?: number;
  costPerToken?: number;
}

interface GenerationRequest {
  prompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  width?: number;
  height?: number;
  duration?: number;
  resolution?: string;
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  format?: string;
  images?: string[];
  audio?: string;
  video?: string;
}

interface GenerationResponse {
  id: string;
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: any;
  safetyRatings?: any[];
}

export default function AIContentGenerationDashboard() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [generationType, setGenerationType] = useState<'text' | 'image' | 'video' | 'audio' | 'multimodal'>('text');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [generationHistory, setGenerationHistory] = useState<GenerationResponse[]>([]);

  // Generation form state
  const [generationForm, setGenerationForm] = useState<GenerationRequest>({
    prompt: '',
    model: '',
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxTokens: 1000,
    width: 1024,
    height: 1024,
    duration: 5,
    resolution: '1080p',
    voice: 'en-US-Wavenet-D',
    language: 'en-US',
    speed: 1.0,
    pitch: 0.0,
    format: 'mp3',
  });

  // File uploads
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedAudio, setUploadedAudio] = useState<string>('');
  const [uploadedVideo, setUploadedVideo] = useState<string>('');

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (generationType) {
      const typeModels = models.filter(model => model.type === generationType);
      if (typeModels.length > 0 && !selectedModel) {
        setSelectedModel(typeModels[0]);
        setGenerationForm(prev => ({ ...prev, model: typeModels[0].id }));
      }
    }
  }, [generationType, models, selectedModel]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai-models');
      if (response.ok) {
        const data = await response.json();
        setModels(data.data || []);
      }
    } catch (error) {
      console.error('Error loading AI models:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async () => {
    if (!generationForm.prompt.trim() || !generationForm.model) return;

    try {
      setGenerating(true);
      const endpoint = `/api/ai-models/generate/${generationType}`;
      
      const requestBody = {
        ...generationForm,
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
        audio: uploadedAudio || undefined,
        video: uploadedVideo || undefined,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        setGenerationHistory(prev => [data.data, ...prev]);
        
        // Reset form for next generation
        setGenerationForm(prev => ({ ...prev, prompt: '' }));
        setUploadedImages([]);
        setUploadedAudio('');
        setUploadedVideo('');
      }
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const downloadContent = (content: string, filename: string) => {
    const link = document.createElement('a');
    link.href = content;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setUploadedImages(prev => [...prev, e.target.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedAudio(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedVideo(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return <div className="w-4 h-4 bg-blue-500 rounded" />;
      case 'huggingface':
        return <div className="w-4 h-4 bg-yellow-500 rounded" />;
      case 'anthropic':
        return <div className="w-4 h-4 bg-orange-500 rounded" />;
      case 'openai':
        return <div className="w-4 h-4 bg-green-500 rounded" />;
      default:
        return <div className="w-4 h-4 bg-gray-500 rounded" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <Type className="h-4 w-4" />;
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Mic className="h-4 w-4" />;
      case 'multimodal':
        return <Layers className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'google':
        return 'bg-blue-100 text-blue-800';
      case 'huggingface':
        return 'bg-yellow-100 text-yellow-800';
      case 'anthropic':
        return 'bg-orange-100 text-orange-800';
      case 'openai':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Content Generation</h1>
          <p className="text-muted-foreground">
            Generate text, images, videos, and audio using advanced AI models
          </p>
        </div>
        <Button onClick={loadModels} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Models
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Generation Form */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Content Generation</CardTitle>
                  <CardDescription>
                    Create content using advanced AI models
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Generation Type Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Content Type</label>
                    <div className="grid grid-cols-5 gap-2">
                      {(['text', 'image', 'video', 'audio', 'multimodal'] as const).map((type) => (
                        <Button
                          key={type}
                          variant={generationType === type ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setGenerationType(type)}
                          className="flex flex-col items-center space-y-1 h-16"
                        >
                          {getTypeIcon(type)}
                          <span className="text-xs capitalize">{type}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">AI Model</label>
                    <Select
                      value={generationForm.model}
                      onValueChange={(value) => {
                        setGenerationForm(prev => ({ ...prev, model: value }));
                        const model = models.find(m => m.id === value);
                        setSelectedModel(model || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models
                          .filter(model => model.type === generationType)
                          .map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex items-center space-x-2">
                                {getProviderIcon(model.provider)}
                                <span>{model.name}</span>
                                <Badge className={getProviderColor(model.provider)}>
                                  {model.provider}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Prompt Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prompt</label>
                    <Textarea
                      placeholder="Describe what you want to generate..."
                      value={generationForm.prompt}
                      onChange={(e) => setGenerationForm(prev => ({ ...prev, prompt: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  {/* File Uploads for Multimodal */}
                  {generationType === 'multimodal' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Upload Images</label>
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                        />
                        {uploadedImages.length > 0 && (
                          <div className="flex space-x-2">
                            {uploadedImages.map((img, index) => (
                              <img
                                key={index}
                                src={img}
                                alt={`Uploaded ${index}`}
                                className="w-16 h-16 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Upload Audio</label>
                        <Input
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioUpload}
                        />
                        {uploadedAudio && (
                          <audio controls className="w-full">
                            <source src={uploadedAudio} />
                          </audio>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Upload Video</label>
                        <Input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                        />
                        {uploadedVideo && (
                          <video controls className="w-full max-w-md">
                            <source src={uploadedVideo} />
                          </video>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Advanced Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span className="text-sm font-medium">Advanced Settings</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {generationType === 'text' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Temperature</label>
                            <Input
                              type="number"
                              min="0"
                              max="2"
                              step="0.1"
                              value={generationForm.temperature}
                              onChange={(e) => setGenerationForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Max Tokens</label>
                            <Input
                              type="number"
                              min="1"
                              max="100000"
                              value={generationForm.maxTokens}
                              onChange={(e) => setGenerationForm(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Top P</label>
                            <Input
                              type="number"
                              min="0"
                              max="1"
                              step="0.1"
                              value={generationForm.topP}
                              onChange={(e) => setGenerationForm(prev => ({ ...prev, topP: parseFloat(e.target.value) }))}
                            />
                          </div>
                        </>
                      )}

                      {generationType === 'image' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Width</label>
                            <Input
                              type="number"
                              min="256"
                              max="2048"
                              value={generationForm.width}
                              onChange={(e) => setGenerationForm(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Height</label>
                            <Input
                              type="number"
                              min="256"
                              max="2048"
                              value={generationForm.height}
                              onChange={(e) => setGenerationForm(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                            />
                          </div>
                        </>
                      )}

                      {generationType === 'video' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Duration (seconds)</label>
                            <Input
                              type="number"
                              min="1"
                              max="60"
                              value={generationForm.duration}
                              onChange={(e) => setGenerationForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Resolution</label>
                            <Select
                              value={generationForm.resolution}
                              onValueChange={(value) => setGenerationForm(prev => ({ ...prev, resolution: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="720p">720p</SelectItem>
                                <SelectItem value="1080p">1080p</SelectItem>
                                <SelectItem value="4k">4K</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {generationType === 'audio' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Voice</label>
                            <Select
                              value={generationForm.voice}
                              onValueChange={(value) => setGenerationForm(prev => ({ ...prev, voice: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en-US-Wavenet-D">Male (US)</SelectItem>
                                <SelectItem value="en-US-Wavenet-F">Female (US)</SelectItem>
                                <SelectItem value="en-GB-Wavenet-A">Male (UK)</SelectItem>
                                <SelectItem value="en-GB-Wavenet-B">Female (UK)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Speed</label>
                            <Input
                              type="number"
                              min="0.25"
                              max="4.0"
                              step="0.1"
                              value={generationForm.speed}
                              onChange={(e) => setGenerationForm(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Format</label>
                            <Select
                              value={generationForm.format}
                              onValueChange={(value) => setGenerationForm(prev => ({ ...prev, format: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mp3">MP3</SelectItem>
                                <SelectItem value="wav">WAV</SelectItem>
                                <SelectItem value="ogg">OGG</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Button 
                    onClick={generateContent} 
                    className="w-full"
                    disabled={!generationForm.prompt.trim() || !generationForm.model || generating}
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate {generationType.charAt(0).toUpperCase() + generationType.slice(1)}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Model Information */}
            <div className="space-y-4">
              {selectedModel && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {getTypeIcon(selectedModel.type)}
                      <span>{selectedModel.name}</span>
                    </CardTitle>
                    <CardDescription>
                      <Badge className={getProviderColor(selectedModel.provider)}>
                        {selectedModel.provider}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Capabilities</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedModel.capabilities.map((capability) => (
                          <Badge key={capability} variant="outline" className="text-xs">
                            {capability.replace('-', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {selectedModel.maxTokens && (
                      <div>
                        <h4 className="font-medium mb-1">Max Tokens</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedModel.maxTokens.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {selectedModel.costPerToken && (
                      <div>
                        <h4 className="font-medium mb-1">Cost per Token</h4>
                        <p className="text-sm text-muted-foreground">
                          ${selectedModel.costPerToken.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{models.length}</div>
                      <div className="text-xs text-muted-foreground">Total Models</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {models.filter(m => m.type === generationType).length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {generationType} Models
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => (
              <Card key={model.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(model.type)}
                      <CardTitle className="text-sm">{model.name}</CardTitle>
                    </div>
                    <Badge className={getProviderColor(model.provider)}>
                      {model.provider}
                    </Badge>
                  </div>
                  <CardDescription>
                    {model.type.charAt(0).toUpperCase() + model.type.slice(1)} Generation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Capabilities</h4>
                      <div className="flex flex-wrap gap-1">
                        {model.capabilities.slice(0, 3).map((capability) => (
                          <Badge key={capability} variant="outline" className="text-xs">
                            {capability.replace('-', ' ')}
                          </Badge>
                        ))}
                        {model.capabilities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{model.capabilities.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {model.maxTokens && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Max Tokens:</span>
                        <span className="font-medium">{model.maxTokens.toLocaleString()}</span>
                      </div>
                    )}

                    {model.costPerToken && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Cost:</span>
                        <span className="font-medium">${model.costPerToken.toFixed(6)}/token</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generation History</CardTitle>
              <CardDescription>
                Your recent AI content generations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generationHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No generations yet</p>
                  </div>
                ) : (
                  generationHistory.map((generation) => (
                    <div key={generation.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        {getTypeIcon(models.find(m => m.id === generation.model)?.type || 'text')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {models.find(m => m.id === generation.model)?.name || generation.model}
                            </span>
                            <Badge className={getProviderColor(models.find(m => m.id === generation.model)?.provider || 'google')}>
                              {models.find(m => m.id === generation.model)?.provider || 'google'}
                            </Badge>
                          </div>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(generation.content)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => downloadContent(generation.content, `generation-${generation.id}`)}>
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-2">
                          Tokens: {generation.usage.totalTokens} • 
                          Cost: ${((generation.usage.totalTokens * 0.00001) || 0).toFixed(4)}
                        </div>

                        <div className="text-sm">
                          {generation.content.length > 200 
                            ? `${generation.content.substring(0, 200)}...`
                            : generation.content
                          }
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{generationHistory.length}</div>
                <p className="text-xs text-muted-foreground">
                  All time generations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {generationHistory.reduce((sum, gen) => sum + gen.usage.totalTokens, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tokens consumed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(generationHistory.reduce((sum, gen) => sum + gen.usage.totalTokens, 0) * 0.00001).toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total estimated cost
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Models Used</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(generationHistory.map(gen => gen.model)).size}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique models
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage by Model</CardTitle>
              <CardDescription>
                Token usage breakdown by AI model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(
                  generationHistory.reduce((acc, gen) => {
                    acc[gen.model] = (acc[gen.model] || 0) + gen.usage.totalTokens;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([model, tokens]) => (
                  <div key={model} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(models.find(m => m.id === model)?.type || 'text')}
                        <span className="font-medium">
                          {models.find(m => m.id === model)?.name || model}
                        </span>
                        <Badge className={getProviderColor(models.find(m => m.id === model)?.provider || 'google')}>
                          {models.find(m => m.id === model)?.provider || 'google'}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {tokens.toLocaleString()} tokens
                      </span>
                    </div>
                    <Progress 
                      value={(tokens / Math.max(...Object.values(
                        generationHistory.reduce((acc, gen) => {
                          acc[gen.model] = (acc[gen.model] || 0) + gen.usage.totalTokens;
                          return acc;
                        }, {} as Record<string, number>)
                      ))) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
