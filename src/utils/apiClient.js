import { API_BASE_URL } from '../config/api.config';

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

export async function apiJson(path, options = {}) {
  let response;
  try {
    response = await apiFetch(path, options);
  } catch (networkError) {
    const err = new Error(
      `Cannot reach API (${API_BASE_URL}). Make sure API is running on port 5308 and phone is on the same Wi-Fi.`
    );
    err.status = 0;
    err.cause = networkError;
    throw err;
  }

  const rawText = await response.text();
  let data = {};

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (error) {
    data = { raw: rawText };
  }

  if (!response.ok) {
    const message = data.error || data.message || `Request failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}
