// Minimal test version of App to isolate rendering errors
import React from 'react';

function AppTest() {
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 50%, #4CAF50 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '24px',
      fontWeight: 'bold'
    }}>
      <div>
        <h1>SMLGPT V2.0 - React Test</h1>
        <p>If you can see this, React is working!</p>
        <button onClick={() => alert('React is functional!')}>
          Test Click
        </button>
      </div>
    </div>
  );
}

export default AppTest;
