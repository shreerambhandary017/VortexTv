import React, { useState } from 'react';
import { login } from '../api/backendApi';

// Simple test component for diagnosing auth issues
const AuthTest = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await login({ username, password });
      setResult({
        status: response.status,
        data: response.data
      });
      console.log('Login successful:', response);
    } catch (err) {
      setError({
        message: err.message,
        response: err.response ? {
          status: err.response.status,
          data: err.response.data
        } : null
      });
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Auth Test Page</h1>
      <p>Use this page to test the authentication API directly</p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Username:
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label>
            Password:
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {loading ? 'Testing...' : 'Test Login'}
        </button>
      </form>
      
      {error && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#ffeeee', border: '1px solid #ffcccc' }}>
          <h3>Error:</h3>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      
      {result && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#eeffee', border: '1px solid #ccffcc' }}>
          <h3>Success:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default AuthTest; 