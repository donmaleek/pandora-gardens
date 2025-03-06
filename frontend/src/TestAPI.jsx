/**
 * @module TestAPI
 * @description Component for testing backend API connectivity and logging detailed diagnostics
 * @requires react
 * @requires axios
 * @requires vite/client/env
 */

// ----------------------------
// Section 1: Core Dependencies
// ----------------------------
import { useEffect, useState } from 'react';
import axios from 'axios';

// ----------------------------
// Section 2: Component Constants
// ----------------------------
/**
 * API test configuration constants
 * @constant {Object}
 * @property {string} TEST_ENDPOINT - API test endpoint from environment variables
 * @property {number} TIMEOUT - Request timeout in milliseconds
 * @property {boolean} DEBUG_MODE - Detailed logging flag
 */
const API_TEST_CONFIG = {
  TEST_ENDPOINT: `${import.meta.env.VITE_API_URL}/test`,
  TIMEOUT: 8000,
  DEBUG_MODE: import.meta.env.DEV
};

// ----------------------------
// Section 3: Helper Components
// ----------------------------
const TestStatusBadge = ({ status }) => (
  <span 
    className={`px-3 py-1 rounded-full text-sm ${
      status === 'success' ? 'bg-green-100 text-green-800' :
      status === 'error' ? 'bg-red-100 text-red-800' :
      'bg-blue-100 text-blue-800'
    }`}
    role="status"
  >
    {status?.toUpperCase()}
  </span>
);

// ----------------------------
// Section 4: Main Component
// ----------------------------
const TestAPI = () => {
  // ----------------------------
  // Section 4a: State Management
  // ----------------------------
  const [testResult, setTestResult] = useState(null);
  const [diagnostics, setDiagnostics] = useState({});
  const [isTesting, setIsTesting] = useState(true);

  // ----------------------------
  // Section 4b: Test Execution
  // ----------------------------
  useEffect(() => {
    const controller = new AbortController();
    
    const executeAPITest = async () => {
      try {
        const startTime = performance.now();
        const response = await axios.get(API_TEST_CONFIG.TEST_ENDPOINT, {
          timeout: API_TEST_CONFIG.TIMEOUT,
          signal: controller.signal
        });
        const latency = performance.now() - startTime;

        setTestResult('success');
        setDiagnostics({
          status: response.status,
          latency: `${latency.toFixed(2)}ms`,
          timestamp: new Date().toISOString()
        });

        if (API_TEST_CONFIG.DEBUG_MODE) {
          console.info('✅ API Test Successful:', {
            data: response.data,
            config: response.config,
            latency
          });
        }
      } catch (error) {
        setTestResult('error');
        const errorData = {
          message: error.message,
          code: error.code,
          stack: API_TEST_CONFIG.DEBUG_MODE ? error.stack : undefined
        };

        if (axios.isAxiosError(error)) {
          errorData.response = {
            status: error.response?.status,
            headers: error.response?.headers,
            data: error.response?.data
          };
        }

        setDiagnostics(errorData);
        
        if (API_TEST_CONFIG.DEBUG_MODE) {
          console.error('❌ API Test Failed:', errorData);
          console.debug('Error Context:', {
            config: error.config,
            request: error.request
          });
        }
      } finally {
        setIsTesting(false);
      }
    };

    executeAPITest();
    return () => controller.abort();
  }, []);

  // ----------------------------
  // Section 4c: Render
  // ----------------------------
  return (
    <div 
      className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto mt-8"
      role="region"
      aria-live="polite"
      aria-label="API Connection Test"
    >
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        API Connection Test
        {testResult && <TestStatusBadge status={testResult} />}
      </h2>

      {isTesting ? (
        <div className="text-gray-600">
          <span className="animate-pulse">🔍 Testing connection...</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Test Result:</p>
              <p className="text-sm">{testResult === 'success' ? '✅ Connected successfully' : '❌ Connection failed'}</p>
            </div>
            
            {diagnostics.latency && (
              <div>
                <p className="text-sm font-medium">Latency:</p>
                <p className="text-sm">{diagnostics.latency}</p>
              </div>
            )}
          </div>

          {API_TEST_CONFIG.DEBUG_MODE && (
            <details className="mt-4 border rounded-lg p-3">
              <summary className="cursor-pointer font-medium">Diagnostic Details</summary>
              <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default TestAPI;