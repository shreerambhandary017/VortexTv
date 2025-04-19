import React, { useState, useEffect } from 'react';
import { checkApiHealth } from '../api/backendApi';
import config from '../config/env';

const ConnectionTest = () => {
  const [status, setStatus] = useState('checking');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [manualTestResult, setManualTestResult] = useState(null);

  // Run health check on component mount
  useEffect(() => {
    runHealthCheck();
  }, []);

  const runHealthCheck = async () => {
    setStatus('checking');
    setError(null);
    
    try {
      const result = await checkApiHealth();
      setResults(result);
      setStatus(result.status === 'success' ? 'connected' : 'error');
      
      if (result.status !== 'success') {
        setError(result);
      }
    } catch (err) {
      setStatus('error');
      setError({
        message: err.message,
        stack: err.stack
      });
    }
  };
  
  const runManualFetch = async () => {
    try {
      setManualTestResult({status: 'checking'});
      
      // Use the fetch API for a different implementation than axios
      const response = await fetch(`${config.API_URL}/health`);
      const data = await response.json();
      
      setManualTestResult({
        status: 'success',
        statusCode: response.status,
        data
      });
    } catch (err) {
      setManualTestResult({
        status: 'error',
        message: err.message
      });
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>API Connection Test</h1>
      <p>This page tests the connection to the backend API server</p>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Connection Status: {status === 'connected' ? 
          <span style={{color: 'green'}}>Connected</span> : 
          <span style={{color: 'red'}}>Disconnected</span>}
        </h2>
        
        <button 
          onClick={runHealthCheck}
          style={{
            padding: '10px 20px',
            background: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px'
          }}
        >
          Test Connection
        </button>
        
        <button 
          onClick={runManualFetch}
          style={{
            padding: '10px 20px',
            background: '#009933',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Manual Fetch Test
        </button>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Configuration:</h3>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify({
            API_URL: config.API_URL,
            ENV: config.ENV
          }, null, 2)}
        </pre>
      </div>
      
      {results && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Test Results:</h3>
          <pre style={{ 
            background: results.status === 'success' ? '#eeffee' : '#ffeeee', 
            padding: '10px', 
            borderRadius: '4px' 
          }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
      
      {manualTestResult && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Manual Fetch Results:</h3>
          <pre style={{ 
            background: manualTestResult.status === 'success' ? '#eeffee' : '#ffeeee', 
            padding: '10px', 
            borderRadius: '4px' 
          }}>
            {JSON.stringify(manualTestResult, null, 2)}
          </pre>
        </div>
      )}
      
      {error && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Error Details:</h3>
          <pre style={{ background: '#ffeeee', padding: '10px', borderRadius: '4px' }}>
            {JSON.stringify(error, null, 2)}
          </pre>
          
          <div style={{ marginTop: '15px' }}>
            <h4>Troubleshooting Steps:</h4>
            <ol>
              <li>Make sure your backend server is running</li>
              <li>Check that the API URL is correct: <code>{config.API_URL}</code></li>
              <li>Ensure your backend has CORS properly configured</li>
              <li>Check for any network issues or firewalls blocking connections</li>
              <li>Look at the backend server logs for errors</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionTest; 