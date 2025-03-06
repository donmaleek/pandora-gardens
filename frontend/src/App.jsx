/**
 * @module App
 * @description Root React component for Pandora Gardens frontend
 * @requires react
 * @requires axios
 * @requires vite/client/env
 * @requires PropTypes
 */

// ----------------------------
// Section 1: Core Dependencies
// ----------------------------
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import PropTypes from 'prop-types';

// ----------------------------
// Section 2: Component Constants
// ----------------------------
/**
 * API configuration constants
 * @constant {Object}
 * @property {string} API_BASE_URL - Base URL from environment variables
 * @property {number} REQUEST_TIMEOUT - API request timeout in milliseconds
 */
const API_CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_URL,
  REQUEST_TIMEOUT: 10000
};

// ----------------------------
// Section 3: Helper Components
// ----------------------------
const Loader = () => (
  <div 
    className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
    role="status"
    aria-label="Loading"
  />
);

const ErrorDisplay = ({ message }) => (
  <div 
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" 
    role="alert"
    aria-live="assertive"
  >
    <strong>Error:</strong> {message}
  </div>
);

// ----------------------------
// Section 4: Main Component
// ----------------------------
function App() {
  // ----------------------------
  // Section 4a: State Management
  // ----------------------------
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ----------------------------
  // Section 4b: API Handling
  // ----------------------------
  /**
   * Fetches initial data from backend API with error handling
   * @function fetchInitialData
   * @async
   * @returns {Promise<void>}
   */
  const fetchInitialData = useCallback(async (signal) => {
    try {
      if (!API_CONFIG.API_BASE_URL) {
        throw new Error('Missing API base URL configuration');
      }

      const response = await axios.get(API_CONFIG.API_BASE_URL, {
        timeout: API_CONFIG.REQUEST_TIMEOUT,
        signal
      });

      setMessage(response.data);
      setError(null);
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error('❌ API Error:', err);
        setError(err.message || 'Failed to communicate with server');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ----------------------------
  // Section 4c: Side Effects
  // ----------------------------
  useEffect(() => {
    const controller = new AbortController();
    
    if (API_CONFIG.API_BASE_URL) {
      fetchInitialData(controller.signal);
    } else {
      setError('Configuration error - missing API endpoint');
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [fetchInitialData]);

  // ----------------------------
  // Section 4d: Render
  // ----------------------------
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-blue-900 text-white text-center p-10"
      role="main"
    >
      <h1 className="text-4xl mb-4 font-semibold transition-opacity duration-300">
        Pandora Gardens
      </h1>

      <div className="min-h-[60px] flex items-center justify-center">
        {isLoading ? (
          <Loader />
        ) : error ? (
          <ErrorDisplay message={error} />
        ) : (
          <p 
            className="text-lg animate-fade-in"
            aria-live="polite"
          >
            {message || '🌿 Welcome to our garden'}
          </p>
        )}
      </div>
    </div>
  );
}

// ----------------------------
// Section 5: PropTypes & Exports
// ----------------------------
App.propTypes = {
  /** Example prop if needed later */
  // initialProp: PropTypes.string
};

export default App;