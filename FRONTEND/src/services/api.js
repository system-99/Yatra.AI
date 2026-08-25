export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const DEV_API_KEY = import.meta.env.VITE_DEV_API_KEY || '';

export const getStoredAuth = () => {
  try {
    const raw = localStorage.getItem('yatra-auth');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveAuth = (session) => {
  if (!session) {
    localStorage.removeItem('yatra-auth');
    return;
  }
  localStorage.setItem('yatra-auth', JSON.stringify(session));
};

const authHeaders = (json = false, includeToken = true) => {
  const session = getStoredAuth();
  const headers = {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(DEV_API_KEY ? { 'X-API-Key': DEV_API_KEY } : {}),
  };

  if (includeToken && session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  return headers;
};

async function handleResponse(response) {
  if (!response.ok) {
    let errorDetail = 'API call failed';
    try {
      const data = await response.json();
      errorDetail = data.detail || JSON.stringify(data);
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export const api = {
  async registerUser(payload) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: authHeaders(true, false),
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async loginUser(payload) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: authHeaders(true, false),
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders() });
    return handleResponse(response);
  },

  // Create a trip
  async createTrip(tripData) {
    const response = await fetch(`${API_BASE_URL}/api/trips/`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(tripData),
    });
    return handleResponse(response);
  },

  // Generate itinerary for a trip
  async generateItinerary(tripId) {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/generate`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return handleResponse(response);
  },

  // Get trip detail (includes days/itinerary, disruptions)
  async getTripDetail(tripId) {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}`, { headers: authHeaders() });
    return handleResponse(response);
  },

  // Get only itinerary
  async getItinerary(tripId) {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/itinerary`, { headers: authHeaders() });
    return handleResponse(response);
  },

  // Trigger manual replan
  async replanTrip(tripId, disruptionData) {
    // disruptionData: { disruption_type, description, affected_day }
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/disruptions/replan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(disruptionData),
    });
    return handleResponse(response);
  },

  // Check weather and auto replan
  async checkWeather(tripId, dayNumber) {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/disruptions/check-weather`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ day_number: dayNumber }),
    });
    return handleResponse(response);
  },

  // Get disruption history for a trip
  async getDisruptions(tripId) {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/disruptions`);
    return handleResponse(response);
  },

  async geocodePlace(query) {
    const response = await fetch(`${API_BASE_URL}/api/maps/geocode?query=${encodeURIComponent(query)}`);
    return handleResponse(response);
  },

  async calculateRoute(points, traffic = true) {
    const response = await fetch(`${API_BASE_URL}/api/maps/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points, traffic }),
    });
    return handleResponse(response);
  },
};

export default api;
