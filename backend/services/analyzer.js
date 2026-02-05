const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const solc = require('solc');
const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

class ContractAnalyzer {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    await fs.ensureDir(this.tempDir);
  }

  async analyzeContract(sourceCode, useOpenAI = false) {
    try {
      console.log('Starting comprehensive contract analysis...');
      
      const contractFile = path.join(this.tempDir, 'contract.sol');
      await fs.writeFile(contractFile, sourceCode);

      const [slitherResults, solhintResults, contractDetails] = await Promise.all([
        this.runSlither(contractFile),
        this.runSolhint(contractFile),
        this.extractContractDetails(sourceCode)
      ]);

      let finalSlitherResults = slitherResults;
      let finalSolhintResults = solhintResults;
      
      if (slitherResults.length === 0) {
        console.log('Slither returned no results, using manual vulnerability detection...');
        finalSlitherResults = this.detectManualVulnerabilities(sourceCode);
      }
      
      if (solhintResults.length === 0) {
        console.log('Solhint returned no results, using basic linting checks...');
        finalSolhintResults = this.detectBasicLintingIssues(sourceCode);
      }

      const riskScore = this.computeRiskScore(finalSlitherResults, finalSolhintResults);
      const auditGrade = this.computeAuditGrade(riskScore, finalSlitherResults, finalSolhintResults);

      const tokenType = this.detectTokenType(sourceCode);

      let aiSummary = null;
      if (useOpenAI && openai) {
        try {
          aiSummary = await this.generateAISummary(sourceCode, slitherResults, solhintResults);
        } catch (error) {
          console.warn('OpenAI summary generation failed:', error.message);
        }
      }

      const abi = await this.generateABI(sourceCode);

      const analysis = {
        riskScore,
        auditGrade,
        tokenType,
        bugs: finalSlitherResults,
        linting: finalSolhintResults,
        contractDetails,
        aiSummary,
        abi,
        unsafePatterns: this.detectUnsafePatterns(sourceCode),
        deploymentWarnings: this.generateDeploymentWarnings(finalSlitherResults, finalSolhintResults),
        timestamp: new Date().toISOString()
      };

      await fs.remove(contractFile);

      return analysis;
    } catch (error) {
      console.error('Analysis failed:', error);
      throw error;
    }
  }

  async runSlither(contractFile) {
    return new Promise((resolve, reject) => {
      console.log('Starting Slither analysis...');
      exec(`slither ${contractFile} --json -`, { timeout: 30000 }, (error, stdout, stderr) => {
        console.log('Slither stdout:', stdout);
        console.log('Slither stderr:', stderr);
        
        if (error) {
          console.warn('Slither analysis failed:', error.message);
          console.log('This might be because Slither is not installed or the contract has compilation issues');
        }

        if (!stdout || stdout.trim() === '') {
          console.warn('Slither returned empty output');
          resolve([]);
          return;
        }

        try {
          const results = JSON.parse(stdout);
          const bugs = [];

          if (results.results && results.results.detectors) {
            results.results.detectors.forEach(detector => {
              if (detector.elements) {
                detector.elements.forEach(element => {
                  bugs.push({
                    name: detector.check,
                    description: detector.description,
                    severity: detector.impact,
                    confidence: detector.confidence,
                    line: element.line,
                    function: element.function_name || 'N/A',
                    file: element.filename || 'contract.sol'
                  });
                });
              }
            });
          }

          console.log(`Slither found ${bugs.length} issues`);
          resolve(bugs);
        } catch (parseError) {
          console.warn('Failed to parse Slither results:', parseError.message);
          console.log('Raw Slither output:', stdout);
          resolve([]);
        }
      });
    });
  }

  async runSolhint(contractFile) {
    return new Promise((resolve, reject) => {
      console.log('Starting Solhint analysis...');
      exec(`solhint ${contractFile} --format=json`, { timeout: 15000 }, (error, stdout, stderr) => {
        console.log('Solhint stdout:', stdout);
        console.log('Solhint stderr:', stderr);
        
        if (error) {
          console.warn('Solhint analysis failed:', error.message);
          console.log('This might be because Solhint is not installed');
        }

        if (!stdout || stdout.trim() === '') {
          console.warn('Solhint returned empty output');
          resolve([]);
          return;
        }

        try {
          const results = JSON.parse(stdout);
          const linting = [];

          if (results && results.length > 0) {
            results.forEach(file => {
              if (file.messages) {
                file.messages.forEach(message => {
                  linting.push({
                    rule: message.ruleId,
                    severity: message.severity,
                    message: message.message,
                    line: message.line,
                    column: message.column
                  });
                });
              }
            });
          }

          console.log(`Solhint found ${linting.length} issues`);
          resolve(linting);
        } catch (parseError) {
          console.warn('Failed to parse Solhint results:', parseError.message);
          console.log('Raw Solhint output:', stdout);
          resolve([]);
        }
      });
    });
  }

  extractContractDetails(sourceCode) {
    const details = {
      functions: [],
      modifiers: [],
      stateVariables: [],
      events: [],
      imports: []
    };

    const importRegex = /import\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(sourceCode)) !== null) {
      details.imports.push(match[1]);
    }

    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*(?:external|public|internal|private)?\s*(?:view|pure|payable)?\s*(?:returns\s*\([^)]*\))?\s*{/g;
    while ((match = functionRegex.exec(sourceCode)) !== null) {
      details.functions.push({
        name: match[1],
        visibility: this.extractVisibility(sourceCode, match.index),
        type: this.extractFunctionType(sourceCode, match.index)
      });
    }

    const modifierRegex = /modifier\s+(\w+)\s*\([^)]*\)\s*{/g;
    while ((match = modifierRegex.exec(sourceCode)) !== null) {
      details.modifiers.push({
        name: match[1]
      });
    }

    const stateVarRegex = /(?:uint|int|bool|address|string|bytes|mapping)\s+(?:public|private|internal|external)?\s*(\w+)\s*;/g;
    while ((match = stateVarRegex.exec(sourceCode)) !== null) {
      details.stateVariables.push({
        name: match[1],
        type: this.extractVariableType(sourceCode, match.index)
      });
    }

    const eventRegex = /event\s+(\w+)\s*\([^)]*\)/g;
    while ((match = eventRegex.exec(sourceCode)) !== null) {
      details.events.push({
        name: match[1]
      });
    }

    return details;
  }

  extractVisibility(sourceCode, index) {
    const beforeMatch = sourceCode.substring(Math.max(0, index - 50), index);
    if (beforeMatch.includes('public')) return 'public';
    if (beforeMatch.includes('private')) return 'private';
    if (beforeMatch.includes('internal')) return 'internal';
    if (beforeMatch.includes('external')) return 'external';
    return 'internal'; // default
  }

  extractFunctionType(sourceCode, index) {
    const beforeMatch = sourceCode.substring(Math.max(0, index - 50), index);
    if (beforeMatch.includes('view')) return 'view';
    if (beforeMatch.includes('pure')) return 'pure';
    if (beforeMatch.includes('payable')) return 'payable';
    return 'non-payable';
  }

  extractVariableType(sourceCode, index) {
    const beforeMatch = sourceCode.substring(Math.max(0, index - 100), index);
    const typeMatch = beforeMatch.match(/(uint|int|bool|address|string|bytes|mapping)\s*[^;]*$/);
    return typeMatch ? typeMatch[1] : 'unknown';
  }

  computeRiskScore(slitherResults, solhintResults) {
    let score = 0;
    
    slitherResults.forEach(bug => {
      const severity = (bug.severity || '').toLowerCase();
      console.log('Slither bug severity:', bug.severity); // Debug log
      switch (severity) {
        case 'high':
          score += 25;
          break;
        case 'medium':
          score += 15;
          break;
        case 'low':
          score += 5;
          break;
        case 'informational':
          score += 1;
          break;
      }
    });

    solhintResults.forEach(issue => {
      const severity = (issue.severity || '').toLowerCase();
      console.log('Solhint issue severity:', issue.severity); // Debug log
      if (severity === 'error') score += 3;
      else if (severity === 'warning') score += 1;
    });

    return Math.min(100, Math.max(0, score));
  }

  computeAuditGrade(riskScore, slitherResults, solhintResults) {
    const hasProxyUpgradeable = slitherResults.some(bug => 
      (bug.name || '').toLowerCase().includes('proxy') || (bug.name || '').toLowerCase().includes('upgradeable')
    );
    
    const hasUnrestrictedMint = slitherResults.some(bug => 
      (bug.name || '').toLowerCase().includes('mint') || (bug.name || '').toLowerCase().includes('unrestricted')
    );

    const hasKillSwitch = slitherResults.some(bug => 
      (bug.name || '').toLowerCase().includes('suicide') || (bug.name || '').toLowerCase().includes('selfdestruct')
    );

    slitherResults.forEach(bug => {
      console.log('Slither bug name:', bug.name);
    });

    if (hasProxyUpgradeable || hasUnrestrictedMint || hasKillSwitch || riskScore > 70) {
      return 'C';
    } else if (riskScore > 40) {
      return 'B';
    } else {
      return 'A';
    }
  }

  detectTokenType(sourceCode) {
    const lowerCode = sourceCode.toLowerCase();
    
    if (lowerCode.includes('erc20') || lowerCode.includes('ierc20')) {
      return 'ERC20';
    } else if (lowerCode.includes('erc721') || lowerCode.includes('ierc721')) {
      return 'ERC721';
    } else if (lowerCode.includes('erc1155') || lowerCode.includes('ierc1155')) {
      return 'ERC1155';
    } else if (lowerCode.includes('uniswap') || lowerCode.includes('pancakeswap') || lowerCode.includes('amm')) {
      return 'DeFi';
    } else if (lowerCode.includes('governance') || lowerCode.includes('dao')) {
      return 'Governance';
    } else if (lowerCode.includes('nft') || lowerCode.includes('token')) {
      return 'Token';
    } else {
      return 'Custom';
    }
  }

  detectUnsafePatterns(sourceCode) {
    const patterns = [];
    const lowerCode = sourceCode.toLowerCase();

    if (lowerCode.includes('selfdestruct') || lowerCode.includes('suicide')) {
      patterns.push('Kill Switch - Contract can be destroyed');
    }

    if (lowerCode.includes('delegatecall')) {
      patterns.push('Delegate Call - Potential for code injection');
    }

    if (lowerCode.includes('assembly')) {
      patterns.push('Assembly Code - Low-level operations');
    }

    if (lowerCode.includes('tx.origin')) {
      patterns.push('tx.origin Usage - Potential phishing vulnerability');
    }

    if (lowerCode.includes('block.timestamp')) {
      patterns.push('Block Timestamp - Time manipulation risk');
    }

    if (lowerCode.includes('block.number')) {
      patterns.push('Block Number - Block manipulation risk');
    }

    return patterns;
  }

  generateDeploymentWarnings(slitherResults, solhintResults) {
    const warnings = [];

    const highSeverityBugs = slitherResults.filter(bug => bug.severity === 'High');
    if (highSeverityBugs.length > 0) {
      warnings.push(`⚠️ ${highSeverityBugs.length} high severity issues found`);
    }

    const criticalBugs = slitherResults.filter(bug => 
      bug.name.includes('reentrancy') || 
      bug.name.includes('overflow') || 
      bug.name.includes('access-control')
    );
    
    if (criticalBugs.length > 0) {
      warnings.push('🚨 Critical security vulnerabilities detected');
    }

    return warnings;
  }

  async generateABI(sourceCode) {
    try {
      console.log('Starting ABI generation...');
      
      const input = {
        language: 'Solidity',
        sources: {
          'contract.sol': {
            content: sourceCode
          }
        },
        settings: {
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode']
            }
          }
        }
      };

      console.log('Compiling contract with solc...');
      const output = JSON.parse(solc.compile(JSON.stringify(input)));
      
      if (output.errors) {
        console.warn('Compilation warnings:', output.errors);
      }

      const contracts = output.contracts['contract.sol'];
      if (contracts) {
        const contractName = Object.keys(contracts)[0];
        const abi = contracts[contractName].abi;
        console.log(`ABI generated successfully with ${abi.length} functions`);
        return abi;
      }

      console.warn('No contracts found in compilation output, using manual ABI generation...');
      return this.generateManualABI(sourceCode);
      
    } catch (error) {
      console.warn('ABI generation failed with solc:', error.message);
      console.log('Falling back to manual ABI generation...');
      return this.generateManualABI(sourceCode);
    }
  }

  generateManualABI(sourceCode) {
    try {
      console.log('Generating manual ABI...');
      const abi = [];
      const lines = sourceCode.split('\n');
      
      const pragmaMatch = sourceCode.match(/pragma solidity\s+([^;]+);/);
      const pragmaVersion = pragmaMatch ? pragmaMatch[1] : '^0.8.0';

      const functionRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*(?:external|public|internal|private)?\s*(?:view|pure|payable)?\s*(?:returns\s*\(([^)]*)\))?/g;
      let match;
      
      while ((match = functionRegex.exec(sourceCode)) !== null) {
        const functionName = match[1];
        const params = match[2];
        const returns = match[3];
        
        if (functionName === 'constructor' || sourceCode.substring(match.index - 50, match.index).includes('internal')) {
          continue;
        }

        const inputs = this.parseFunctionParams(params);
        const outputs = returns ? this.parseFunctionParams(returns) : [];

        abi.push({
          type: 'function',
          name: functionName,
          inputs: inputs,
          outputs: outputs,
          stateMutability: this.getStateMutability(sourceCode, match.index)
        });
      }

      const eventRegex = /event\s+(\w+)\s*\(([^)]*)\)/g;
      while ((match = eventRegex.exec(sourceCode)) !== null) {
        const eventName = match[1];
        const params = match[2];
        const inputs = this.parseEventParams(params);

        abi.push({
          type: 'event',
          name: eventName,
          inputs: inputs,
          anonymous: false
        });
      }

      const stateVarRegex = /(?:uint|int|bool|address|string|bytes|mapping)\s+(?:public)\s*(\w+)\s*;/g;
      while ((match = stateVarRegex.exec(sourceCode)) !== null) {
        const varName = match[1];
        const varType = this.getVariableType(sourceCode, match.index);
        
        abi.push({
          type: 'function',
          name: varName,
          inputs: [],
          outputs: [{
            type: varType,
            name: '',
            internalType: varType
          }],
          stateMutability: 'view'
        });
      }

      console.log(`Manual ABI generated with ${abi.length} items`);
      return abi;
      
    } catch (error) {
      console.error('Manual ABI generation failed:', error.message);
      return [];
    }
  }

  parseFunctionParams(params) {
    if (!params || params.trim() === '') return [];
    
    return params.split(',').map(param => {
      const trimmed = param.trim();
      if (!trimmed) return null;
      
      const isIndexed = trimmed.includes('indexed');
      const cleanParam = trimmed.replace('indexed', '').trim();
      
      const parts = cleanParam.split(/\s+/);
      const type = parts[0];
      const name = parts[1] || '';
      
      return {
        type: type,
        name: name,
        internalType: type,
        indexed: isIndexed
      };
    }).filter(Boolean);
  }

  parseEventParams(params) {
    return this.parseFunctionParams(params);
  }

  getStateMutability(sourceCode, index) {
    const beforeMatch = sourceCode.substring(Math.max(0, index - 100), index);
    if (beforeMatch.includes('pure')) return 'pure';
    if (beforeMatch.includes('view')) return 'view';
    if (beforeMatch.includes('payable')) return 'payable';
    return 'nonpayable';
  }

  getVariableType(sourceCode, index) {
    const beforeMatch = sourceCode.substring(Math.max(0, index - 100), index);
    const typeMatch = beforeMatch.match(/(uint|int|bool|address|string|bytes|mapping)\s*[^;]*$/);
    return typeMatch ? typeMatch[1] : 'uint256';
  }

  async generateAISummary(sourceCode, slitherResults, solhintResults) {
    if (!openai) return null;

    try {
      const prompt = `
Analyze this Solidity smart contract and provide a comprehensive summary:

Contract Code:
${sourceCode.substring(0, 2000)}...

Security Issues Found:
${slitherResults.map(bug => `- ${bug.name}: ${bug.description} (${bug.severity})`).join('\n')}

Linting Issues:
${solhintResults.map(issue => `- ${issue.rule}: ${issue.message}`).join('\n')}

Please provide:
1. A brief overview of what this contract does
2. Key security concerns and their implications
3. Recommendations for improvement
4. Overall risk assessment

Keep the response concise and technical but accessible.
`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.warn('OpenAI summary generation failed:', error.message);
      return null;
    }
  }

  detectManualVulnerabilities(sourceCode) {
    const vulnerabilities = [];
    const lowerCode = sourceCode.toLowerCase();

    if (lowerCode.includes('call') && lowerCode.includes('external') && !lowerCode.includes('reentrancyguard')) {
      vulnerabilities.push({
        name: 'Potential Reentrancy',
        description: 'External calls without reentrancy protection detected',
        severity: 'High',
        confidence: 'Medium',
        line: 1,
        function: 'Multiple',
        file: 'contract.sol'
      });
    }

    if (lowerCode.includes('call') && !lowerCode.includes('require') && !lowerCode.includes('assert')) {
      vulnerabilities.push({
        name: 'Unchecked External Call',
        description: 'External calls without proper error handling',
        severity: 'Medium',
        confidence: 'Medium',
        line: 1,
        function: 'Multiple',
        file: 'contract.sol'
      });
    }

    if (lowerCode.includes('uint') && !lowerCode.includes('pragma solidity ^0.8') && !lowerCode.includes('pragma solidity 0.8')) {
      vulnerabilities.push({
        name: 'Potential Integer Overflow',
        description: 'Integer operations without overflow protection (pre-Solidity 0.8.0)',
        severity: 'Medium',
        confidence: 'High',
        line: 1,
        function: 'Multiple',
        file: 'contract.sol'
      });
    }

    if (lowerCode.includes('delegatecall')) {
      vulnerabilities.push({
        name: 'Dangerous Delegatecall',
        description: 'Delegatecall detected - potential for code injection',
        severity: 'High',
        confidence: 'High',
        line: 1,
        function: 'Multiple',
        file: 'contract.sol'
      });
    }

    if (lowerCode.includes('tx.origin')) {
      vulnerabilities.push({
        name: 'tx.origin Usage',
        description: 'tx.origin used instead of msg.sender - potential phishing vulnerability',
        severity: 'Medium',
        confidence: 'High',
        line: 1,
        function: 'Multiple',
        file: 'contract.sol'
      });
    }

    if (lowerCode.includes('block.timestamp')) {
      vulnerabilities.push({
        name: 'Block Timestamp Dependency',
        description: 'Block timestamp used - vulnerable to miner manipulation',
        severity: 'Low',
        confidence: 'High',
        line: 1,
        function: 'Multiple',
        file: 'contract.sol'
      });
    }

    if (lowerCode.includes('function') && lowerCode.includes('external') && !lowerCode.includes('modifier') && !lowerCode.includes('onlyowner')) {
      vulnerabilities.push({
        name: 'Potential Access Control Issue',
        description: 'External functions without access control modifiers',
        severity: 'Medium',
        confidence: 'Low',
        line: 1,
        function: 'Multiple',
        file: 'contract.sol'
      });
    }

    if (lowerCode.includes('selfdestruct') || lowerCode.includes('suicide')) {
      vulnerabilities.push({
        name: 'Self-Destruct Function',
        description: 'Contract can be destroyed - potential loss of funds',
        severity: 'High',
        confidence: 'High',
        line: 1,
        function: 'Multiple',
        file: 'contract.sol'
      });
    }

    return vulnerabilities;
  }

  detectBasicLintingIssues(sourceCode) {
    const issues = [];
    const lines = sourceCode.split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (index === 0 && !trimmedLine.includes('SPDX-License-Identifier')) {
        issues.push({
          rule: 'spdx-license-identifier',
          severity: 'warning',
          message: 'Missing SPDX license identifier',
          line: index + 1,
          column: 1
        });
      }

      if (trimmedLine.length > 120) {
        issues.push({
          rule: 'max-line-length',
          severity: 'warning',
          message: 'Line too long (max 120 characters)',
          line: index + 1,
          column: 1
        });
      }

      if (trimmedLine === '' && lines[index + 1] && lines[index + 1].trim() === '') {
        issues.push({
          rule: 'no-consecutive-blank-lines',
          severity: 'warning',
          message: 'Multiple consecutive blank lines',
          line: index + 1,
          column: 1
        });
      }

      if (line.endsWith(' ') || line.endsWith('\t')) {
        issues.push({
          rule: 'no-trailing-whitespace',
          severity: 'warning',
          message: 'Trailing whitespace',
          line: index + 1,
          column: line.length
        });
      }
    });

    return issues;
  }
}

module.exports = {
  analyzeContract: async (sourceCode, useOpenAI) => {
    const analyzer = new ContractAnalyzer();
    return await analyzer.analyzeContract(sourceCode, useOpenAI);
  }
}; 