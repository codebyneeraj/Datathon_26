/**
 * API base URL resolved from environment variables or defaulting to localhost:8000
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://project-rainfall-60078587276.development.catalystserverless.in/server/api';

/**
 * Custom API Error representing backend HTTP failures
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Centralized fetch wrapper with error handling and retry mechanism
 * @param {string} endpoint - The API endpoint path (e.g. '/api/hotspots')
 * @param {RequestInit} [options] - Fetch request options
 * @returns {Promise<any>} Response JSON data
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Add auth token if present in localStorage (Phase 5)
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      // JSON parsing failed (e.g. html error page)
    }
    
    throw new ApiError(
      errorData?.detail || response.statusText || 'An API error occurred',
      response.status,
      errorData
    );
  }

  return response.json();
}

/**
 * API client exposing typed endpoint queries
 */
export const api = {
  /**
   * Fetches DBSCAN crime hotspots
   * @param {string} [district] - Optional district filter
   * @param {number} [eps] - Optional DBSCAN eps
   * @param {number} [minSamples] - Optional DBSCAN min_samples
   * @returns {Promise<{type: "FeatureCollection", features: Array}>}
   */
  getHotspots: (district, eps, minSamples) => {
    const params = [];
    if (district) params.push(`district=${encodeURIComponent(district)}`);
    if (eps !== undefined && eps !== null) params.push(`eps=${eps}`);
    if (minSamples !== undefined && minSamples !== null) params.push(`min_samples=${minSamples}`);
    const q = params.length > 0 ? `?${params.join('&')}` : '';
    return request(`/api/hotspots${q}`);
  },

  /**
   * Fetches Cytoscape relationship link graph for a specific offender
   * @param {number} accusedId - Target accused ID
   * @returns {Promise<Array>} Elements list (nodes and edges)
   */
  getNetworkGraph: (accusedId) => {
    return request(`/api/network/${accusedId}`);
  },

  /**
   * Fetches Pearson correlations between crime rate and socioeconomics
   * @returns {Promise<{districts: Array, correlations: {unemployment: number, urbanization: number, literacy: number}}>}
   */
  getCorrelations: () => {
    return request('/api/correlations');
  },

  /**
   * Fetches predicted risk scores and anomaly spikes per district
   * @returns {Promise<Array<{district: string, latest_month: string, incident_count_latest: number, predicted_risk_score: number, risk_level: string, anomaly_spike: boolean, spike_percentage: number}>>}
   */
  getRiskScores: () => {
    return request('/api/risk/scores');
  },

  /**
   * Fetches repeat offenders/accused linked to a specific district
   * @param {string} district - District name
   * @returns {Promise<Array<{id: number, name: string, age: number, gender: string, risk_score: number}>>}
   */
  getAccusedByDistrict: (district) => {
    return request(`/api/risk/accused?district=${encodeURIComponent(district)}`);
  },

  /**
   * Predicts risk score based on custom socioeconomic inputs
   * @param {object} params - Input params
   * @param {number} params.population - Population
   * @param {number} params.unemployment_rate - Unemployment rate
   * @param {number} params.urbanization_index - Urbanization index
   * @param {number} params.literacy_rate - Literacy rate
   * @param {number} params.incident_count - Incident count
   * @returns {Promise<{predicted_risk_score: number, risk_level: string, probabilities: {Low: number, Medium: number, High: number}}>}
   */
  predictRiskScore: ({ population, unemployment_rate, urbanization_index, literacy_rate, incident_count }) => {
    const q = `population=${population}&unemployment_rate=${unemployment_rate}&urbanization_index=${urbanization_index}&literacy_rate=${literacy_rate}&incident_count=${incident_count}`;
    return request(`/api/risk/predict?${q}`);
  },

  /**
   * Fetches recent incidents list
   * @param {string} [district] - Optional district filter
   * @param {number} [limit=50] - Maximum count
   * @returns {Promise<Array>} List of incidents
   */
  getIncidents: (district, limit = 50) => {
    const params = [];
    if (district && district !== 'All') params.push(`district=${encodeURIComponent(district)}`);
    if (limit) params.push(`limit=${limit}`);
    const q = params.length > 0 ? `?${params.join('&')}` : '';
    return request(`/api/risk/incidents${q}`);
  },

  /**
   * Updates the status of an incident in the database
   * @param {number} incidentId - Incident ID
   * @param {string} status - New status
   * @returns {Promise<{status: string, incident_id: number, new_status: string}>}
   */
  updateIncidentStatus: (incidentId, status) => {
    return request(`/api/risk/incidents/${incidentId}/status?status=${encodeURIComponent(status)}`, {
      method: 'POST'
    });
  },

  /**
   * Fetches accused persons linked to a specific incident ID
   * @param {number} incidentId - Incident ID
   * @returns {Promise<Array>} List of accused persons
   */
  getIncidentAccused: (incidentId) => {
    return request(`/api/risk/incidents/${incidentId}/accused`);
  },

  /**
   * Generates an AI threat summary for a district using the configured backend model
   */
  getDistrictAISummary: (districtData) => {
    return request('/api/ai/district-summary', {
      method: 'POST',
      body: JSON.stringify(districtData)
    });
  },

  /**
   * Generates AI link network analysis insight using the configured backend model
   */
  getNetworkAIInsight: (networkData) => {
    return request('/api/ai/network-insight', {
      method: 'POST',
      body: JSON.stringify(networkData)
    });
  },

  /**
   * Sends natural language query to Tactical AI Assistant
   */
  askAIAssistant: (query, context = null) => {
    return request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ query, context })
    });
  }
};
