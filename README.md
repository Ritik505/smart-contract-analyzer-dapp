# Smart Contract Analyzer DApp

A comprehensive full-stack DApp for analyzing Solidity smart contracts with advanced security tools, deployed on Avalanche Fuji testnet.

## 🚀 Features

- **Smart Contract Analysis**: Paste code or enter verified contract address
- **Payment System**: Pay 0.1 AVAX to unlock analysis (Avalanche Fuji testnet)
- **Security Tools**: Integration with Slither and Solhint for vulnerability detection
- **Risk Assessment**: Automated risk scoring (0-100) and audit grading (A/B/C)
- **AI Integration**: Optional OpenAI-powered contract summaries
- **PDF Reports**: Generate downloadable analysis reports
- **Modern UI**: Responsive design with accessibility features
- **MetaMask Integration**: Seamless wallet connection

## 🏗️ Architecture

### Smart Contract (Solidity)
- **File**: `AnalyzerAccess.sol`
- **Network**: Avalanche Fuji Testnet (C-Chain)
- **Address**: `0xb48A35A53F4C926A926B43DA810aBC474F12EE2b`
- **Functions**:
  - `payToAnalyze()` - Accept 0.1 AVAX payment
  - `hasUserPaid(address)` - Check payment status
  - `owner()` - Get contract owner
  - `FEE()` - Get payment amount

### Backend (Node.js + Express)
- **Analysis Engine**: Slither + Solhint integration
- **API Endpoints**: Contract analysis, PDF generation
- **External APIs**: Snowtrace, OpenAI (optional)
- **Features**: Risk scoring, audit grading, ABI generation

### Frontend (React + Ethers.js)
- **Wallet Integration**: MetaMask with Avalanche Fuji
- **UI Framework**: React with Framer Motion animations
- **Styling**: Modern CSS with gradients and accessibility
- **Features**: Payment flow, analysis display, PDF download

## 📋 Prerequisites

### Required Software
- Node.js (v16 or higher)
- npm or yarn
- MetaMask browser extension
- Python 3.7+ (for Slither and Solhint)

### Python Dependencies
```bash
pip install slither-analyzer solhint
```


## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd "Smart contract Analyze DApp"
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create environment file:
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
SNOWTRACE_API_KEY=your_snowtrace_api_key_here
CONTRACT_ADDRESS=0xb48A35A53F4C926A926B43DA810aBC474F12EE2b
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Install Analysis Tools
```bash

pip install slither-analyzer

npm install -g solhint
```

## 🚀 Running the Application

### Development Mode

1. **Start Backend**:
```bash
cd backend
npm run dev
```
Backend will run on `http://localhost:3001`

2. **Start Frontend**:
```bash
cd frontend
npm start
```
Frontend will run on `http://localhost:3000`

### Production Build

1. **Build Frontend**:
```bash
cd frontend
npm run build
```

2. **Start Backend**:
```bash
cd backend
npm start
```

## 🌐 Deployment

### Smart Contract Deployment
The smart contract is already deployed on Avalanche Fuji testnet:
- **Address**: `0xb48A35A53F4C926A926B43DA810aBC474F12EE2b`
- **Owner**: `0x4550Ac76DC759A4F9AA71b8552582b96D06F516d`

### Backend Deployment
Deploy to your preferred platform (Render, Vercel, Heroku, etc.):

1. **Environment Variables**:
   - Set all variables from `.env` file
   - Ensure `PORT` is set correctly for your platform

2. **Build Commands**:
   - Install: `npm install`
   - Start: `npm start`

### Frontend Deployment
Deploy the built frontend to static hosting (Netlify, Vercel, etc.):

1. **Build**: `npm run build`
2. **Deploy**: Upload `build/` folder to your hosting service

## 💰 Getting Test AVAX

To test the DApp, you need AVAX tokens on Fuji testnet:

1. **Fuji Faucet**: Visit [Avalanche Faucet](https://faucet.avax.network/)
2. **Request Tokens**: Enter your wallet address
3. **Wait**: Tokens will be sent to your wallet

## 🔧 Configuration

### MetaMask Setup
1. **Add Avalanche Fuji Testnet**:
   - Network Name: `Avalanche Fuji Testnet`
   - RPC URL: `https://api.avax-test.network/ext/bc/C/rpc`
   - Chain ID: `43113`
   - Currency Symbol: `AVAX`
   - Explorer: `https://testnet.snowtrace.io/`

### API Configuration
- **OpenAI**: Set `OPENAI_API_KEY` for AI summaries
- **Snowtrace**: Set `SNOWTRACE_API_KEY` for enhanced contract fetching

## 📖 Usage

### 1. Connect Wallet
- Click "Connect MetaMask"
- Ensure you're on Avalanche Fuji testnet
- Approve the connection

### 2. Pay for Analysis
- Click "Pay 0.1 AVAX" to unlock analysis
- Confirm the transaction in MetaMask
- Wait for confirmation

### 3. Analyze Contract
Choose one of two methods:

**Method A: Paste Code**
- Select "Paste Code" mode
- Paste your Solidity contract code
- Click "Analyze Contract"

**Method B: Contract Address**
- Select "Contract Address" mode
- Enter verified contract address
- Click "Analyze Contract"

### 4. Review Results
- **Risk Score**: 0-100 scale with visual indicator
- **Audit Grade**: A (safe) to C (high risk)
- **Security Issues**: Detailed vulnerability list
- **Contract Structure**: Functions, variables, events
- **AI Summary**: Plain English explanation (if enabled)

### 5. Generate Reports
- **Copy ABI**: Copy contract interface to clipboard
- **Download PDF**: Generate comprehensive report

## 🔍 Analysis Features

### Security Analysis
- **Slither Integration**: Advanced vulnerability detection
- **Solhint Integration**: Code quality and best practices
- **Risk Scoring**: Automated risk assessment
- **Audit Grading**: A/B/C grading system

### Contract Analysis
- **Function Extraction**: All public/external functions
- **State Variables**: Contract storage analysis
- **Events**: Event definitions and usage
- **Token Detection**: ERC20/ERC721/ERC1155 identification

### Report Generation
- **PDF Reports**: Professional analysis reports
- **ABI Generation**: Contract interface extraction
- **Deployment Warnings**: Pre-deployment risk alerts

## 🎨 UI Features

### Accessibility
- **High Contrast Mode**: Toggle for better visibility
- **Font Size Control**: Small/Medium/Large options
- **Font Family Selection**: Multiple font options
- **Keyboard Navigation**: Full keyboard support

### Responsive Design
- **Mobile Optimized**: Works on all screen sizes
- **Touch Friendly**: Optimized for touch devices
- **Progressive Enhancement**: Graceful degradation

### Visual Enhancements
- **Parallax Scrolling**: Modern header effects
- **Gradient Themes**: Beautiful color schemes
- **Smooth Animations**: Framer Motion integration
- **Loading States**: Clear feedback during operations

## 🔧 Troubleshooting

### Common Issues

1. **MetaMask Connection Failed**
   - Ensure MetaMask is installed
   - Check if you're on Avalanche Fuji testnet
   - Try refreshing the page

2. **Analysis Tools Not Found**
   - Install Slither: `pip install slither-analyzer`
   - Install Solhint: `npm install -g solhint`
   - Ensure Python and Node.js are in PATH

3. **Payment Transaction Failed**
   - Check if you have enough AVAX (0.1 + gas fees)
   - Ensure you're on the correct network
   - Try increasing gas limit

4. **Backend Connection Error**
   - Verify backend is running on port 3001
   - Check CORS configuration
   - Ensure all dependencies are installed

### Debug Mode
Enable debug logging by setting:
```env
LOG_LEVEL=debug
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Slither**: Trail of Bits for the security analysis tool
- **Solhint**: Solidity linting framework
- **Avalanche**: For the testnet infrastructure

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the documentation

---

**Note**: This DApp is designed for educational and testing purposes. Always conduct thorough audits before deploying contracts to mainnet. 