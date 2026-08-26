export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

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
  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders() });
    return handleResponse(response);
  },

  async updateProfile(payload) {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },
  async createTrip(tripData) {
    const response = await fetch(`${API_BASE_URL}/api/trips/`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(tripData),
    });
    return handleResponse(response);
  },
  async generateItinerary(tripId) {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/generate`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return handleResponse(response);
  },
  async getTripDetail(tripId) {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}`, { headers: authHeaders() });
    return handleResponse(response);
  },
  async listTrips() {
    const response = await fetch(`${API_BASE_URL}/api/trips/`, { headers: authHeaders() });
    return handleResponse(response);
  },
  async deleteTrip(tripId) {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handleResponse(response);
  },
  async getItinerary(tripId) {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/itinerary`, { headers: authHeaders() });
    return handleResponse(response);
  },
  async getGeocodedDays(tripId) {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/geocoded-days`, { headers: authHeaders() });
    return handleResponse(response);
  },
  async replanTrip(tripId, disruptionData) {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/disruptions/replan`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(disruptionData),
    });
    return handleResponse(response);
  },
  async checkWeather(tripId, dayNumber) {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/disruptions/check-weather`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ day_number: dayNumber }),
    });
    return handleResponse(response);
  },
  async getDisruptions(tripId) {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/disruptions`, { headers: authHeaders() });
    return handleResponse(response);
  },

  async geocodePlace(query) {
    const response = await fetch(`${API_BASE_URL}/api/maps/geocode?query=${encodeURIComponent(query)}`, { headers: authHeaders() });
    return handleResponse(response);
  },

  async calculateRoute(points, traffic = true) {
    const response = await fetch(`${API_BASE_URL}/api/maps/route`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ points, traffic }),
    });
    return handleResponse(response);
  },
};

export default api;
