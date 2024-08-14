import React, { useState, useEffect, useRef } from 'react';
import Web3 from 'web3';
import { Interface } from 'ethers';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { FiCopy } from 'react-icons/fi';
import ConnectForm from './components/ConnectForm';

function App() {
  const [web3, setWeb3] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [decodedData, setDecodedData] = useState('');
  const [loading, setLoading] = useState(false);

  const intervalRef = useRef(null);

  const hardcodedPrivateKey = '';  

  useEffect(() => {
    if (web3 && subscription) {
      startMatrixEffect();
    } else {
      stopMatrixEffect();
    }
    return () => stopMatrixEffect();
  }, [web3, subscription]);

  const startMatrixEffect = () => {
    const canvas = document.getElementById("matrixCanvas");
    const ctx = canvas.getContext("2d");

    const width = canvas.width = window.innerWidth;
    const height = canvas.height = window.innerHeight;

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const fontSize = 16;
    const columns = width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
      ctx.font = `${fontSize}px monospace`;

      drops.forEach((y, x) => {
        const text = letters.charAt(Math.floor(Math.random() * letters.length));
        ctx.fillText(text, x * fontSize, y * fontSize);

        if (y * fontSize > height && Math.random() > 0.975) drops[x] = 0;
        drops[x]++;
      });
    };

    intervalRef.current = setInterval(draw, 33);
  };

  const stopMatrixEffect = () => {
    const canvas = document.getElementById("matrixCanvas");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    clearInterval(intervalRef.current);
  };

  const connectToWebSocket = async (contractAddress, rpcUrl) => {
    if (subscription) {
      await unsubscribeFromWebSocket();
      return;
    }

    setLoading(true);

    try {
      const web3Instance = new Web3(new Web3.providers.WebsocketProvider(rpcUrl));
      setWeb3(web3Instance);

      const newSubscription = await web3Instance.eth.subscribe('pendingTransactions');

      newSubscription.on('data', async (txHash) => {

        try {
          const transaction = await web3Instance.eth.getTransaction(txHash);
          console.log(transaction)
          if (transaction && transaction.to && transaction.to.toLowerCase() === contractAddress.toLowerCase()) {
            setTransactions((prev) => [...prev, transaction]);

            const decoded = decodeTransactionData(transaction.input);
            setDecodedData(decoded || transaction.input);
          }
        } catch (err) {
          console.error('Transaction not found:', txHash, err.message);
        }
      });

      setSubscription(newSubscription);
    } catch (err) {
      console.error('Failed to connect to WebSocket or subscribe to transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromWebSocket = async () => {
    if (subscription) {
      try {
        await subscription.unsubscribe();
        setSubscription(null);
        setWeb3(null);
        setTransactions([]);
      } catch (err) {
        console.error('Failed to unsubscribe:', err);
      }
    }
  };

  const decodeTransactionData = (inputData) => {
    try {
      if (!inputData || inputData === '0x') {
        return 'No data';
      }

      let result = inputData;

      let asciiData = web3.utils.hexToAscii(inputData);
      if (asciiData && !asciiData.includes('�')) {
        result = asciiData;
      }

      try {
        const iface = new Interface([]);
        const decodedData = iface.parseTransaction({ data: inputData });
        if (decodedData) {
          result = JSON.stringify(decodedData, null, 2);
        }
      } catch (e) {
        console.log('Decoding with ethers.js failed, returning hex string');
      }

      return result;
    } catch (error) {
      console.error('Decoding error:', error);
      return inputData;
    }
  };

  const sendFrontrunTransaction = async (transaction) => {
    if (!transaction || !web3) return;

    try {
      let key = hardcodedPrivateKey;

      const wallet = web3.eth.accounts.privateKeyToAccount(key);
      web3.eth.accounts.wallet.add(wallet);

      const tx = {
        from: wallet.address,
        to: transaction.to,
        data: transaction.input,
        value: transaction.value,
        gas: transaction.gas,
        gasPrice: web3.utils.toHex(parseInt(transaction.gasPrice) * 2),
        nonce: await web3.eth.getTransactionCount(wallet.address),
      };

      const signedTx = await wallet.signTransaction(tx);
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log('Transaction sent:', receipt);
    } catch (err) {
      console.error('Failed to send frontrun transaction:', err);
    }
  };

  const truncateText = (text, startChars = 6, endChars = 4) => {
    if (text.length <= startChars + endChars + 5) return text;
    return `${text.slice(0, startChars)}...${text.slice(-endChars)}`;
  };

  return (
    <div className="relative min-h-screen bg-black text-green-500 p-4 font-mono flex justify-center items-center">
      <canvas id="matrixCanvas" className="absolute top-0 left-0 w-full h-full z-0"></canvas>
      <div className="w-full max-w-lg relative z-10">
        <h1 className="text-2xl mb-4 border-b border-green-500 pb-2 text-center">Transaction Monitor</h1>

        <ConnectForm onConnect={connectToWebSocket} isConnected={!!subscription} />

        <div className="mt-4 p-4 bg-black rounded border border-green-500">
          <h2 className="text-lg mb-2">Pending Transactions</h2>
          {transactions.length > 0 ? (
            <ul className="pl-4">
              {transactions.map((tx) => (
                <li key={tx.hash} className="mb-2 p-2 bg-black rounded border border-green-500">
                  <div className="flex items-center justify-between">
                    <p><span className="text-green-400">Hash:</span> {truncateText(tx.hash)}</p>
                    <CopyToClipboard text={tx.hash}>
                      <button className="ml-2">
                        <FiCopy className="text-green-500" />
                      </button>
                    </CopyToClipboard>
                  </div>
                  <div className="flex items-center justify-between">
                    <p><span className="text-green-400">From:</span> {truncateText(tx.from)}</p>
                    <CopyToClipboard text={tx.from}>
                      <button className="ml-2">
                        <FiCopy className="text-green-500" />
                      </button>
                    </CopyToClipboard>
                  </div>
                  <div className="flex items-center justify-between">
                    <p><span className="text-green-400">To:</span> {truncateText(tx.to)}</p>
                    <CopyToClipboard text={tx.to}>
                      <button className="ml-2">
                        <FiCopy className="text-green-500" />
                      </button>
                    </CopyToClipboard>
                  </div>
                  <p><span className="text-green-400">Value:</span> {tx.value}</p>
                  <p><span className="text-green-400">Gas Price:</span> {tx.gasPrice}</p>
                  <div className="flex items-center justify-between">
                    <p><span className="text-green-400">Data:</span> {truncateText(decodedData)}</p>
                    <CopyToClipboard text={decodedData}>
                      <button className="ml-2">
                        <FiCopy className="text-green-500" />
                      </button>
                    </CopyToClipboard>
                  </div>
                  <button 
                    className="mt-2 p-2 bg-green-600 text-black rounded w-full hover:bg-green-700"
                    onClick={() => sendFrontrunTransaction(tx)}
                  >
                    [Select & Send]
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-green-300">No pending transactions found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
