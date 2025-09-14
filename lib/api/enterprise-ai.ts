// Enterprise AI Training Hub API client
export class EnterpriseAIAPI {
  private baseURL: string;

  constructor(baseURL = '/api/training') {
    this.baseURL = baseURL;
  }

  // Optimize configuration
  async optimizeConfiguration(config: any) {
    const response = await fetch(`${this.baseURL}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return response.json();
  }

  // Start training
  async startTraining(config: any) {
    const response = await fetch(`${this.baseURL}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return response.json();
  }

  // Get training status
  async getTrainingStatus(jobId: string) {
    const response = await fetch(`${this.baseURL}/status/${jobId}`);
    return response.json();
  }

  // Connect to real-time updates
  connectToTrainingUpdates(jobId: string, onUpdate: (data: any) => void) {
    const ws = new WebSocket(`ws://localhost:3001/api/training/ws/${jobId}`);
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      onUpdate(update);
    };
    return ws;
  }
}

export const useEnterpriseAI = () => {
  const api = new EnterpriseAIAPI();
  
  const startTrainingWithRealtime = async (config: any, onUpdate: (data: any) => void) => {
    try {
      const result = await api.startTraining(config);
      const ws = api.connectToTrainingUpdates(result.jobId, onUpdate);
      return { jobId: result.jobId, websocket: ws };
    } catch (error) {
      console.error('Training failed:', error);
      throw error;
    }
  };

  return { api, startTrainingWithRealtime };
};
