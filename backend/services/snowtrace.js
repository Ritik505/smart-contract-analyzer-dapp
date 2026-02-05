const axios = require('axios');

class SnowtraceService {
  constructor() {
    this.baseUrl = 'https://api-testnet.snowtrace.io/api';
    this.apiKey = process.env.SNOWTRACE_API_KEY || '';
  }

  async fetchContractFromSnowtrace(contractAddress) {
    try {
      console.log(`Fetching contract from Snowtrace: ${contractAddress}`);
      
      const sourceCodeUrl = `${this.baseUrl}?module=contract&action=getsourcecode&address=${contractAddress}`;
      const params = this.apiKey ? { apikey: this.apiKey } : {};
      
      const response = await axios.get(sourceCodeUrl, { params });
      
      if (response.data.status === '1' && response.data.result && response.data.result[0]) {
        const contract = response.data.result[0];
        
        if (contract.SourceCode && contract.SourceCode !== '') {
          console.log('Contract source code found');
          return contract.SourceCode;
        } else {
          console.log('Contract not verified or no source code available');
          return null;
        }
      } else {
        console.log('Contract not found on Snowtrace');
        return null;
      }
    } catch (error) {
      console.error('Error fetching from Snowtrace:', error.message);
      return null;
    }
  }

  async getContractInfo(contractAddress) {
    try {
      const url = `${this.baseUrl}?module=contract&action=getsourcecode&address=${contractAddress}`;
      const params = this.apiKey ? { apikey: this.apiKey } : {};
      
      const response = await axios.get(url, { params });
      
      if (response.data.status === '1' && response.data.result && response.data.result[0]) {
        const contract = response.data.result[0];
        return {
          contractName: contract.ContractName || 'Unknown',
          compilerVersion: contract.CompilerVersion || 'Unknown',
          optimizationUsed: contract.OptimizationUsed || 'Unknown',
          runs: contract.Runs || 'Unknown',
          constructorArguments: contract.ConstructorArguments || '',
          evmVersion: contract.EVMVersion || 'Unknown',
          licenseType: contract.LicenseType || 'Unknown',
          proxy: contract.Proxy === '1',
          implementation: contract.Implementation || '',
          swarmSource: contract.SwarmSource || ''
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching contract info:', error.message);
      return null;
    }
  }

  async getContractABI(contractAddress) {
    try {
      const url = `${this.baseUrl}?module=contract&action=getabi&address=${contractAddress}`;
      const params = this.apiKey ? { apikey: this.apiKey } : {};
      
      const response = await axios.get(url, { params });
      
      if (response.data.status === '1' && response.data.result) {
        return JSON.parse(response.data.result);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching contract ABI:', error.message);
      return null;
    }
  }

  async getContractBytecode(contractAddress) {
    try {
      const url = `${this.baseUrl}?module=proxy&action=eth_getCode&address=${contractAddress}&tag=latest`;
      const params = this.apiKey ? { apikey: this.apiKey } : {};
      
      const response = await axios.get(url, { params });
      
      if (response.data.status === '1' && response.data.result) {
        return response.data.result;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching contract bytecode:', error.message);
      return null;
    }
  }

  async verifyContractExists(contractAddress) {
    try {
      const bytecode = await this.getContractBytecode(contractAddress);
      return bytecode && bytecode !== '0x';
    } catch (error) {
      console.error('Error verifying contract existence:', error.message);
      return false;
    }
  }
}

module.exports = {
  fetchContractFromSnowtrace: async (contractAddress) => {
    const snowtrace = new SnowtraceService();
    return await snowtrace.fetchContractFromSnowtrace(contractAddress);
  },
  
  getContractInfo: async (contractAddress) => {
    const snowtrace = new SnowtraceService();
    return await snowtrace.getContractInfo(contractAddress);
  },
  
  getContractABI: async (contractAddress) => {
    const snowtrace = new SnowtraceService();
    return await snowtrace.getContractABI(contractAddress);
  },
  
  verifyContractExists: async (contractAddress) => {
    const snowtrace = new SnowtraceService();
    return await snowtrace.verifyContractExists(contractAddress);
  }
}; 