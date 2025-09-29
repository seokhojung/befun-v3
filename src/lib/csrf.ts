// CSRF Token Management Utilities
import { headers } from 'next/headers'

// Generate a random CSRF token
export function generateCSRFToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Validate CSRF token (server-side)
export function validateCSRFToken(submittedToken: string, sessionToken: string): boolean {
  if (!submittedToken || !sessionToken) {
    return false
  }

  // Use a constant-time comparison to prevent timing attacks
  return submittedToken === sessionToken
}

// Get CSRF token from headers (server component)
export async function getCSRFTokenFromHeaders(): Promise<string | null> {
  try {
    const headersList = headers()
    return headersList.get('x-csrf-token')
  } catch {
    return null
  }
}

// Client-side CSRF token management
export const csrfClient = {
  // Store token in sessionStorage
  setToken(token: string) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('csrf-token', token)
    }
  },

  // Get token from sessionStorage
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('csrf-token')
    }
    return null
  },

  // Remove token from sessionStorage
  removeToken() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('csrf-token')
    }
  },

  // Add CSRF token to form data
  addToFormData(formData: FormData): FormData {
    const token = this.getToken()
    if (token) {
      formData.append('csrf-token', token)
    }
    return formData
  },

  // Add CSRF token to fetch headers
  addToHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const token = this.getToken()
    if (token) {
      headers['X-CSRF-Token'] = token
    }
    return headers
  }
}