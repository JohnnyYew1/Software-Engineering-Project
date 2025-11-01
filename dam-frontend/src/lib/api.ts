export async function apiRequest<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const baseURL = 'http://127.0.0.1:8000/api';
  const url = `${baseURL}${endpoint}`;
  
  console.log(`🔄 API Request: ${url}`);

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    console.log(`📡 Response Status: ${response.status}`);
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`❌ API Error ${response.status}:`, text);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ API Success:', data);
    return data;
  } catch (error) {
    console.error('❌ API Request Failed:', error);
    throw error;
  }
}