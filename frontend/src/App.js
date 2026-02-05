import React, { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaEthereum, 
  FaShieldAlt, 
  FaFileCode, 
  FaSearch, 
  FaDownload, 
  FaCog,
  FaEye,
  FaEyeSlash,
  FaFont,
  FaPalette
} from 'react-icons/fa';

import './App.css';

const CONTRACT_ADDRESS = '0x2C2977812AAb1F20cB8F53a8EB4D34140ddb534d';
const CONTRACT_ABI = [
  "function payToAnalyze() external payable",
  "function owner() external view returns (address)",
  "function FEE() external view returns (uint256)",
  "event Paid(address indexed user, uint256 amount)"
];



const AVALANCHE_FUJI = {
  chainId: '0xa869', 
  chainName: 'Avalanche Fuji Testnet',
  nativeCurrency: {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18
  },
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://testnet.snowtrace.io/']
};

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);

  const [sessionPaid, setSessionPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisMode, setAnalysisMode] = useState('code'); 
  const [sourceCode, setSourceCode] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [accessibilitySettings, setAccessibilitySettings] = useState({
    highContrast: false,
    fontSize: 'medium',
    fontFamily: 'Inter'
  });

  
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        
        const accounts = await provider.send("eth_requestAccounts", []);
        const account = accounts[0];
        
        
        const network = await provider.getNetwork();
        if (network.chainId !== parseInt(AVALANCHE_FUJI.chainId, 16)) {
          await switchToAvalancheFuji(provider);
        }
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        
        setProvider(provider);
        setAccount(account);
        setContract(contract);
        
        
        setSessionPaid(false);
        
        toast.success('Wallet connected successfully!');
      } else {
        toast.error('Please install MetaMask!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  
  const switchToAvalancheFuji = async (provider) => {
    try {
      await provider.send('wallet_addEthereumChain', [{
        chainId: AVALANCHE_FUJI.chainId,
        chainName: AVALANCHE_FUJI.chainName,
        nativeCurrency: AVALANCHE_FUJI.nativeCurrency,
        rpcUrls: AVALANCHE_FUJI.rpcUrls,
        blockExplorerUrls: AVALANCHE_FUJI.blockExplorerUrls
      }]);
      
      await provider.send('wallet_switchEthereumChain', [{
        chainId: AVALANCHE_FUJI.chainId
      }]);
    } catch (error) {
      console.error('Error switching network:', error);
      toast.error('Please switch to Avalanche Fuji testnet manually');
    }
  };

  
  const payForAnalysis = async () => {
    if (!contract || !account) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      const fee = await contract.FEE();
      
      const tx = await contractWithSigner.payToAnalyze({ value: fee });
      toast.info('Payment transaction submitted...');
      
      await tx.wait();
      
      setSessionPaid(true);
      toast.success('Payment successful! You can now analyze contracts.');
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  
  const analyzeContract = async () => {
    if (!sessionPaid) {
      toast.error('Please pay 0.1 AVAX to unlock analysis');
      return;
    }

    if (analysisMode === 'code' && !sourceCode.trim()) {
      toast.error('Please enter contract source code');
      return;
    }

    if (analysisMode === 'address' && !contractAddress.trim()) {
      toast.error('Please enter contract address');
      return;
    }

    try {
      setIsLoading(true);
      
      let response;
      if (analysisMode === 'code') {
        response = await axios.post('/api/analyze', {
          sourceCode: sourceCode.trim(),
          useOpenAI: true
        });
      } else {
        response = await axios.post('/api/analyze-address', {
          contractAddress: contractAddress.trim(),
          useOpenAI: true
        });
      }

      setAnalysis(response.data.analysis);
      toast.success('Analysis completed successfully!');
      
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  
  const generatePDF = async () => {
    if (!analysis) {
      toast.error('No analysis data available');
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await axios.post('/api/generate-pdf', {
        analysis,
        contractAddress: analysisMode === 'address' ? contractAddress : null,
        sourceCode: analysisMode === 'code' ? sourceCode : null
      }, {
        responseType: 'blob'
      });


      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'contract-analysis-report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('PDF report downloaded successfully!');
      
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF report');
    } finally {
      setIsLoading(false);
    }
  };

  
  const copyABI = () => {
    if (!analysis?.abi) {
      toast.error('No ABI available');
      return;
    }

    navigator.clipboard.writeText(JSON.stringify(analysis.abi, null, 2));
    toast.success('ABI copied to clipboard!');
  };

  
  const resetSession = () => {
    setSessionPaid(false);
    setAnalysis(null);
    setSourceCode('');
    setContractAddress('');
    toast.info('Session reset. Please pay 0.1 AVAX for new analysis.');
  };

  
  const toggleHighContrast = () => {
    setAccessibilitySettings(prev => ({
      ...prev,
      highContrast: !prev.highContrast
    }));
  };

  const changeFontSize = (size) => {
    setAccessibilitySettings(prev => ({
      ...prev,
      fontSize: size
    }));
  };

  const changeFontFamily = (family) => {
    setAccessibilitySettings(prev => ({
      ...prev,
      fontFamily: family
    }));
  };

  return (
    <div className={`App ${accessibilitySettings.highContrast ? 'high-contrast' : ''}`}>
      <ToastContainer position="top-right" />
      
      
      <motion.header 
        className="header"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="header-content">
          <h1 className="title">
            <FaShieldAlt className="title-icon" />
            Smart Contract Analyzer
          </h1>
          <p className="subtitle">Comprehensive Security Analysis for Solidity Contracts</p>
        </div>
        
        
        <div className="accessibility-menu">
          <button 
            className="accessibility-toggle"
            onClick={() => setShowAccessibility(!showAccessibility)}
          >
            <FaCog />
          </button>
          
          <AnimatePresence>
            {showAccessibility && (
              <motion.div 
                className="accessibility-panel"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="accessibility-option">
                  <label>
                    <FaPalette />
                    High Contrast
                  </label>
                  <button 
                    className={`toggle ${accessibilitySettings.highContrast ? 'active' : ''}`}
                    onClick={toggleHighContrast}
                  >
                    {accessibilitySettings.highContrast ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
                
                <div className="accessibility-option">
                  <label>
                    <FaFont />
                    Font Size
                  </label>
                  <select 
                    value={accessibilitySettings.fontSize}
                    onChange={(e) => changeFontSize(e.target.value)}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                
                <div className="accessibility-option">
                  <label>
                    <FaFont />
                    Font Family
                  </label>
                  <select 
                    value={accessibilitySettings.fontFamily}
                    onChange={(e) => changeFontFamily(e.target.value)}
                  >
                    <option value="Inter">Inter</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      
      <main className="main-content">
        
        <motion.section 
          className="wallet-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {!account ? (
            <button className="connect-button" onClick={connectWallet}>
              <FaEthereum />
              Connect MetaMask
            </button>
          ) : (
            <div className="wallet-info">
              <span className="account">Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
              <span className={`payment-status ${sessionPaid ? 'paid' : 'unpaid'}`}>
                {sessionPaid ? '✅ Analysis Unlocked' : '❌ Payment Required'}
              </span>
            </div>
          )}
        </motion.section>

        
        {account && !sessionPaid && (
          <motion.section 
            className="payment-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2>Unlock Analysis</h2>
            <p>Pay 0.1 AVAX to access the smart contract analyzer</p>
            <button 
              className="pay-button"
              onClick={payForAnalysis}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Pay 0.1 AVAX'}
            </button>
          </motion.section>
        )}

        
        {sessionPaid && (
          <motion.section 
            className="analysis-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2>Analyze Smart Contract</h2>
            
            
            <div className="mode-toggle">
              <button 
                className={`mode-button ${analysisMode === 'code' ? 'active' : ''}`}
                onClick={() => setAnalysisMode('code')}
              >
                <FaFileCode />
                Paste Code
              </button>
              <button 
                className={`mode-button ${analysisMode === 'address' ? 'active' : ''}`}
                onClick={() => setAnalysisMode('address')}
              >
                <FaSearch />
                Contract Address
              </button>
            </div>

            
            <div className="input-area">
              {analysisMode === 'code' ? (
                <textarea
                  placeholder="Paste your Solidity smart contract code here..."
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  className="code-input"
                />
              ) : (
                <input
                  type="text"
                  placeholder="Enter verified contract address (0x...)"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  className="address-input"
                />
              )}
            </div>

            <button 
              className="analyze-button"
              onClick={analyzeContract}
              disabled={isLoading}
            >
              {isLoading ? 'Analyzing...' : 'Analyze Contract'}
            </button>
          </motion.section>
        )}


        <AnimatePresence>
          {analysis && (
            <motion.section 
              className="results-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.5 }}
            >
              <h2>Analysis Results</h2>
              
              
              <div className="risk-assessment">
                <div className="risk-score">
                  <h3>Risk Score</h3>
                  <div className="score-display">
                    <span className="score">{analysis.riskScore}</span>
                    <span className="max-score">/100</span>
                  </div>
                  <div className="risk-bar">
                    <div 
                      className="risk-fill"
                      style={{ 
                        width: `${analysis.riskScore}%`,
                        backgroundColor: analysis.riskScore >= 70 ? '#dc3545' : 
                                        analysis.riskScore >= 40 ? '#ffc107' : '#28a745'
                      }}
                    />
                  </div>
                </div>
                
                <div className="audit-grade">
                  <h3>Audit Grade</h3>
                  <div className={`grade ${analysis.auditGrade}`}>
                    {analysis.auditGrade}
                  </div>
                </div>
              </div>

              
              <div className="contract-type">
                <h3>Contract Type</h3>
                <span className="type-badge">{analysis.tokenType}</span>
              </div>

              
              {analysis.bugs.length > 0 && (
                <div className="issues-section">
                  <h3>Security Issues ({analysis.bugs.length})</h3>
                  <div className="issues-list">
                    {analysis.bugs.map((bug, index) => (
                      <div key={index} className={`issue ${bug.severity.toLowerCase()}`}>
                        <div className="issue-header">
                          <span className="issue-name">{bug.name}</span>
                          <span className={`severity ${bug.severity.toLowerCase()}`}>
                            {bug.severity}
                          </span>
                        </div>
                        <p className="issue-description">{bug.description}</p>
                        <div className="issue-details">
                          <span>Function: {bug.function}</span>
                          <span>Line: {bug.line}</span>
                          <span>Confidence: {bug.confidence}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              
              <div className="contract-details">
                <h3>Contract Structure</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <h4>Functions ({analysis.contractDetails.functions.length})</h4>
                    <ul>
                      {analysis.contractDetails.functions.map((func, index) => (
                        <li key={index}>
                          {func.name} ({func.visibility}, {func.type})
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="detail-item">
                    <h4>State Variables ({analysis.contractDetails.stateVariables.length})</h4>
                    <ul>
                      {analysis.contractDetails.stateVariables.map((variable, index) => (
                        <li key={index}>
                          {variable.name} ({variable.type})
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="detail-item">
                    <h4>Events ({analysis.contractDetails.events.length})</h4>
                    <ul>
                      {analysis.contractDetails.events.map((event, index) => (
                        <li key={index}>{event.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              
              {analysis.unsafePatterns.length > 0 && (
                <div className="patterns-section">
                  <h3>Unsafe Patterns Detected</h3>
                  <ul className="patterns-list">
                    {analysis.unsafePatterns.map((pattern, index) => (
                      <li key={index} className="pattern-item">
                        ⚠️ {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              
              {analysis.deploymentWarnings.length > 0 && (
                <div className="warnings-section">
                  <h3>Deployment Warnings</h3>
                  <ul className="warnings-list">
                    {analysis.deploymentWarnings.map((warning, index) => (
                      <li key={index} className="warning-item">
                        🚨 {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              
              {analysis.aiSummary && (
                <div className="ai-summary">
                  <h3>AI-Generated Summary</h3>
                  <div className="summary-content">
                    {analysis.aiSummary}
                  </div>
                </div>
              )}

              
              <div className="action-buttons">
                <button className="action-button" onClick={copyABI}>
                  Copy ABI
                </button>
                <button className="action-button" onClick={generatePDF}>
                  <FaDownload />
                  Download PDF Report
                </button>
                <button className="action-button" onClick={resetSession} style={{ backgroundColor: '#6c757d' }}>
                  New Analysis
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      
      <footer className="footer">
        <p>Smart Contract Analyzer DApp - Powered by Avalanche Fuji Testnet</p>
          <div className="text-center text-gray-500 text-sm mt-6">
    <p>© {new Date().getFullYear()} Ritik Verma. All rights reserved.</p>
  </div>
       
      </footer>
    </div>

    
  );
}

export default App; 