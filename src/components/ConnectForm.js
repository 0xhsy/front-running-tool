import React, { useState } from 'react';

function ConnectForm({ onConnect, isConnected }) {
  const [contractAddress, setContractAddress] = useState('');
  const [rpcUrl, setRpcUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConnect(contractAddress, rpcUrl);
  };

  return (
    <div className="p-4 bg-black text-green-500 border border-green-500 rounded">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm mb-2">Contract Address:</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-black border border-green-500 text-green-500"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="Enter Contract Address"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-2">RPC URL:</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-black border border-green-500 text-green-500"
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
            placeholder="Enter RPC URL"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-green-600 p-2 rounded text-black hover:bg-green-700"
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </form>
    </div>
  );
}

export default ConnectForm;
