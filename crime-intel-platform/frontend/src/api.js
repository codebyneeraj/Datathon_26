/**
 * API base URL resolved from environment variables or defaulting to localhost:8000
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
   * @returns {Promise<{type: "FeatureCollection", features: Array}>}
   */
  getHotspots: (district) => {
    const q = district ? `?district=${encodeURIComponent(district)}` : '';
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
  }
};
