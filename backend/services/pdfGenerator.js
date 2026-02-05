const PDFDocument = require('pdfkit');
const fs = require('fs-extra');

class PDFGenerator {
  constructor() {
    this.doc = null;
  }

  async generatePDFReport(analysis, contractAddress, sourceCode) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        this.doc = doc;
        this.generateReport(analysis, contractAddress, sourceCode);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  generateReport(analysis, contractAddress, sourceCode) {
    const doc = this.doc;

    this.addHeader();
    
    this.addExecutiveSummary(analysis);
    
    this.addRiskAssessment(analysis);
    
    this.addSecurityIssues(analysis);
    
    this.addContractDetails(analysis);
    
    this.addLintingIssues(analysis);
    
    this.addUnsafePatterns(analysis);
    
    this.addDeploymentWarnings(analysis);
    
    if (analysis.aiSummary) {
      this.addAISummary(analysis.aiSummary);
    }
    
    this.addSourceCode(sourceCode);
    
    this.addFooter(contractAddress);
  }

  addHeader() {
    const doc = this.doc;
    
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#2E86AB')
       .text('Smart Contract Security Analysis Report', { align: 'center' });
    
    doc.moveDown(0.5);
    
    doc.fontSize(14)
       .font('Helvetica')
       .fillColor('#666')
       .text('Comprehensive Security Audit & Risk Assessment', { align: 'center' });
    
    doc.moveDown(1);
    
    doc.fontSize(10)
       .fillColor('#999')
       .text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, { align: 'center' });
    
    doc.moveDown(2);
  }

  addExecutiveSummary(analysis) {
    const doc = this.doc;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2E86AB')
       .text('Executive Summary');
    
    doc.moveDown(0.5);
    
    const riskColor = this.getRiskColor(analysis.riskScore);
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(riskColor)
       .text(`Risk Score: ${analysis.riskScore}/100`);
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(riskColor)
       .text(`Audit Grade: ${analysis.auditGrade}`);

    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#333')
       .text(`Contract Type: ${analysis.tokenType}`);
    
    doc.moveDown(0.5);
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#333')
       .text(`This contract has been analyzed using advanced static analysis tools including Slither and Solhint. ` +
             `The analysis identified ${analysis.bugs.length} security issues and ${analysis.linting.length} code quality issues. ` +
             `Overall risk assessment indicates ${this.getRiskLevel(analysis.riskScore)} risk level.`);
    
    doc.moveDown(2);
  }

  addRiskAssessment(analysis) {
    const doc = this.doc;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2E86AB')
       .text('Risk Assessment');
    
    doc.moveDown(0.5);
    
    const riskPercentage = analysis.riskScore;
    const barWidth = 400;
    const barHeight = 20;
    const riskColor = this.getRiskColor(analysis.riskScore);
    
    doc.rect(50, doc.y, barWidth, barHeight)
       .strokeColor('#ddd')
       .stroke();
    
    doc.rect(50, doc.y, (barWidth * riskPercentage) / 100, barHeight)
       .fillColor(riskColor)
       .fill();
    
    doc.moveDown(1);
    
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#333')
       .text(`Risk Level: ${this.getRiskLevel(analysis.riskScore)}`);
    
    doc.fontSize(10)
       .fillColor('#666')
       .text(this.getRiskDescription(analysis.riskScore));
    
    doc.moveDown(2);
  }

  addSecurityIssues(analysis) {
    const doc = this.doc;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2E86AB')
       .text('Security Issues');
    
    doc.moveDown(0.5);
    
    if (analysis.bugs.length === 0) {
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#28a745')
         .text('✅ No security issues detected');
    } else {
      const highIssues = analysis.bugs.filter(bug => bug.severity === 'High');
      const mediumIssues = analysis.bugs.filter(bug => bug.severity === 'Medium');
      const lowIssues = analysis.bugs.filter(bug => bug.severity === 'Low');
      
      if (highIssues.length > 0) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#dc3545')
           .text(`High Severity Issues (${highIssues.length})`);
        
        highIssues.forEach((bug, index) => {
          this.addIssueDetails(bug, index + 1);
        });
      }
      
      if (mediumIssues.length > 0) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#ffc107')
           .text(`Medium Severity Issues (${mediumIssues.length})`);
        
        mediumIssues.forEach((bug, index) => {
          this.addIssueDetails(bug, index + 1);
        });
      }
      
      if (lowIssues.length > 0) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#17a2b8')
           .text(`Low Severity Issues (${lowIssues.length})`);
        
        lowIssues.forEach((bug, index) => {
          this.addIssueDetails(bug, index + 1);
        });
      }
    }
    
    doc.moveDown(2);
  }

  addIssueDetails(bug, index) {
    const doc = this.doc;
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#333')
       .text(`${index}. ${bug.name}`);
    
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#666')
       .text(`Description: ${bug.description}`);
    
    doc.fontSize(9)
       .fillColor('#666')
       .text(`Function: ${bug.function} | Line: ${bug.line} | Confidence: ${bug.confidence}`);
    
    doc.moveDown(0.5);
  }

  addContractDetails(analysis) {
    const doc = this.doc;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2E86AB')
       .text('Contract Structure');
    
    doc.moveDown(0.5);
    
    const details = analysis.contractDetails;
    
    if (details.functions.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#333')
         .text(`Functions (${details.functions.length})`);
      
      details.functions.forEach(func => {
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#666')
           .text(`• ${func.name} (${func.visibility}, ${func.type})`);
      });
      
      doc.moveDown(0.5);
    }
    
    if (details.stateVariables.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#333')
         .text(`State Variables (${details.stateVariables.length})`);
      
      details.stateVariables.forEach(variable => {
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#666')
           .text(`• ${variable.name} (${variable.type})`);
      });
      
      doc.moveDown(0.5);
    }
    
    if (details.events.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#333')
         .text(`Events (${details.events.length})`);
      
      details.events.forEach(event => {
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#666')
           .text(`• ${event.name}`);
      });
    }
    
    doc.moveDown(2);
  }

  addLintingIssues(analysis) {
    const doc = this.doc;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2E86AB')
       .text('Code Quality Issues');
    
    doc.moveDown(0.5);
    
    if (analysis.linting.length === 0) {
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#28a745')
         .text('✅ No code quality issues detected');
    } else {
      analysis.linting.forEach((issue, index) => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#333')
           .text(`${index + 1}. ${issue.rule}`);
        
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#666')
           .text(`Message: ${issue.message} | Line: ${issue.line} | Severity: ${issue.severity}`);
        
        doc.moveDown(0.5);
      });
    }
    
    doc.moveDown(2);
  }

  addUnsafePatterns(analysis) {
    const doc = this.doc;
    
    if (analysis.unsafePatterns.length > 0) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#2E86AB')
         .text('Unsafe Patterns Detected');
      
      doc.moveDown(0.5);
      
      analysis.unsafePatterns.forEach((pattern, index) => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#dc3545')
           .text(`${index + 1}. ${pattern}`);
        
        doc.moveDown(0.5);
      });
      
      doc.moveDown(2);
    }
  }

  addDeploymentWarnings(analysis) {
    const doc = this.doc;
    
    if (analysis.deploymentWarnings.length > 0) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#2E86AB')
         .text('Deployment Warnings');
      
      doc.moveDown(0.5);
      
      analysis.deploymentWarnings.forEach((warning, index) => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#ffc107')
           .text(`${index + 1}. ${warning}`);
        
        doc.moveDown(0.5);
      });
      
      doc.moveDown(2);
    }
  }

  addAISummary(aiSummary) {
    const doc = this.doc;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2E86AB')
       .text('AI-Generated Summary');
    
    doc.moveDown(0.5);
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#333')
       .text(aiSummary, { width: 500 });
    
    doc.moveDown(2);
  }

  addSourceCode(sourceCode) {
    const doc = this.doc;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2E86AB')
       .text('Contract Source Code');
    
    doc.moveDown(0.5);
    
    doc.fontSize(8)
       .font('Courier')
       .fillColor('#333')
       .text(sourceCode, { width: 500 });
    
    doc.moveDown(2);
  }

  addFooter(contractAddress) {
    const doc = this.doc;
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#999')
       .text(`Contract Address: ${contractAddress || 'N/A'}`, { align: 'center' });
    
    doc.moveDown(0.5);
    
    doc.fontSize(8)
       .fillColor('#999')
       .text('This report was generated by Smart Contract Analyzer DApp', { align: 'center' });
    
    doc.moveDown(0.5);
    
    doc.fontSize(8)
       .fillColor('#999')
       .text('For more information, visit the DApp interface', { align: 'center' });
  }

  getRiskColor(score) {
    if (score >= 70) return '#dc3545';
    if (score >= 40) return '#ffc107';
    return '#28a745';
  }

  getRiskLevel(score) {
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  getRiskDescription(score) {
    if (score >= 70) {
      return 'This contract has significant security vulnerabilities that should be addressed before deployment.';
    } else if (score >= 40) {
      return 'This contract has moderate security concerns that should be reviewed and potentially addressed.';
    } else {
      return 'This contract appears to have minimal security risks, but should still be thoroughly tested.';
    }
  }
}

module.exports = {
  generatePDFReport: async (analysis, contractAddress, sourceCode) => {
    const generator = new PDFGenerator();
    return await generator.generatePDFReport(analysis, contractAddress, sourceCode);
  }
}; 