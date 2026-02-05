const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const { analyzeContract } = require('./services/analyzer');
const { fetchContractFromSnowtrace } = require('./services/snowtrace');
const { generatePDFReport } = require('./services/pdfGenerator');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

const CONTRACT_ADDRESS = '0xb48A35A53F4C926A926B43DA810aBC474F12EE2b';

app.get('/', (req, res) => {
  res.json({ 
    message: 'Smart Contract Analyzer Backend',
    contractAddress: CONTRACT_ADDRESS,
    status: 'running'
  });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { sourceCode, useOpenAI = false } = req.body;
    
    if (!sourceCode) {
      return res.status(400).json({ error: 'Source code is required' });
    }

    console.log('Starting contract analysis...');
    const analysis = await analyzeContract(sourceCode, useOpenAI);
    
    res.json({
      success: true,
      analysis,
      contractAddress: CONTRACT_ADDRESS
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error.message 
    });
  }
});

app.post('/api/analyze-address', async (req, res) => {
  try {
    const { contractAddress, useOpenAI = false } = req.body;
    
    if (!contractAddress) {
      return res.status(400).json({ error: 'Contract address is required' });
    }

    console.log(`Fetching contract from address: ${contractAddress}`);
    const sourceCode = await fetchContractFromSnowtrace(contractAddress);
    
    if (!sourceCode) {
      return res.status(404).json({ error: 'Contract not found or not verified' });
    }

    console.log('Starting contract analysis...');
    const analysis = await analyzeContract(sourceCode, useOpenAI);
    
    res.json({
      success: true,
      analysis,
      contractAddress: CONTRACT_ADDRESS,
      analyzedAddress: contractAddress
    });
  } catch (error) {
    console.error('Address analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error.message 
    });
  }
});

app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { analysis, contractAddress, sourceCode } = req.body;
    
    if (!analysis) {
      return res.status(400).json({ error: 'Analysis data is required' });
    }

    console.log('Generating PDF report...');
    const pdfBuffer = await generatePDFReport(analysis, contractAddress, sourceCode);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=contract-analysis-report.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: 'PDF generation failed', 
      details: error.message 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    contractAddress: CONTRACT_ADDRESS
  });
});
  
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Smart Contract Analyzer Backend running on port ${PORT}`);
  console.log(`📋 Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
}); 