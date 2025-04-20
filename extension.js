// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

  const disposable1 = vscode.commands.registerCommand('markdown-table-assistant.format_table', format_table_command);
  context.subscriptions.push(disposable1);

  const disposable2 = vscode.commands.registerCommand('markdown-table-assistant.generate_table', generate_table_command);
  context.subscriptions.push(disposable2);
}

async function generate_table_command () {

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('No editor');
    return;
  }

  const rowsInput = await vscode.window.showInputBox({
    prompt: 'row number',
    placeHolder: '2'
  });

  const colsInput = await vscode.window.showInputBox({
    prompt: 'column number',
    placeHolder: '2'
  });

  const alignInput = await vscode.window.showInputBox({
    prompt: 'alignment: l r c',
    placeHolder: 'c'
  });

  const table = generateMarkdownTable(rowsInput, colsInput, alignInput);

  editor.edit(editBuilder => {
    editBuilder.insert(editor.selection.active, table);
  });
}

/**
 * Generate a Markdown table string
 * @param {number} rows - Number of rows (default: 2)
 * @param {number} cols - Number of columns (default: 2)
 * @param {string} alignment - Text alignment in cells ('left', 'center', 'right') (default: 'center')
 * @returns {string} - Generated Markdown table string
 */
function generateMarkdownTable(rows = 2, cols = 2, alignment = 'center') {
  // Validate input parameters
  rows = Math.max(1, parseInt(rows) || 2);
  cols = Math.max(1, parseInt(cols) || 2);

  // Validate and set alignment characters
  let alignChar;
  switch (alignment.toLowerCase()) {
    case 'left':
      alignChar = ':---';
      break;
    case 'right':
      alignChar = '---:';
      break;
    case 'center':
    default:
      alignChar = ':---:';
      break;
  }

  // Initialize table string
  let table = '';

  // Generate header row
  table += '|';
  for (let i = 0; i < cols; i++) {
    table += ` |`;
  }
  table += '\n';

  // Generate alignment row
  table += '|';
  for (let i = 0; i < cols; i++) {
    table += ` ${alignChar} |`;
  }
  table += '\n';

  // Generate data rows
  for (let i = 1; i < rows; i++) { // Start from 1 since row 0 is the header
    table += '|';
    for (let j = 0; j < cols; j++) {
      table += ` |`;
    }
    table += '\n';
  }

  return table;
}

function format_table_command () {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showInformationMessage('No editor');
    return;
  }

  const selection = editor.selection;
  const text = editor.document.getText(selection);

  if (!text) {
    vscode.window.showInformationMessage('No selected text');
    return;
  }

  const formatted = formatMarkdownTable(text);

  // replace text
  editor.edit(editBuilder => {
    editBuilder.replace(selection, formatted);
  }).then(success => {
    if (success) {
      vscode.window.showInformationMessage('Formatted.');
    } else {
      vscode.window.showErrorMessage('Format failed');
    }
  });
}

/**
 * Format a Markdown table for better readability.
 * This function aligns all columns based on the maximum cell width in each column.
 * It preserves alignment indicators and uses center alignment with space padding.
 * If the table has inconsistent row/column lengths, it returns the original input with a warning.
 *
 * @param {string} markdown - The original markdown table as a string
 * @returns {string} - The formatted markdown table
 */
function formatMarkdownTable(markdown) {
  const lines = markdown.trim().split('\n');
  if (lines.length < 2) return markdown;

  // Parse rows into array of arrays
  const rows = lines.map(line => line.trim().split('|').map(cell => cell.trim()));

  // Remove leading and trailing empty elements caused by pipes
  const cleanedRows = rows.map(row => {
    if (row[0] === '') row.shift();
    if (row[row.length - 1] === '') row.pop();
    return row;
  });

  // Check if all rows have the same number of columns
  const colCount = cleanedRows[0].length;
  const isValid = cleanedRows.every(row => row.length === colCount);
  if (!isValid) {
    console.log('⚠️ Please only select markdown table: inconsistent column counts.');
    return markdown;
  }

  // Determine column alignment from the second row (alignment row)
  const alignments = cleanedRows[1].map(cell => {
    if (/^:-+:$/.test(cell)) return 'center';
    if (/^:-+$/.test(cell)) return 'left';
    if (/^-+:$/.test(cell)) return 'right';
    return 'left';
  });

  // Calculate max width for each column
  const colWidths = [];
  for (let col = 0; col < colCount; col++) {
    const maxLen = Math.max(...cleanedRows.map(row => row[col].length));
    colWidths.push(maxLen);
  }

  // Helper to pad a string to center align
  const padCell = (text, width) => {
    const space = width - text.length;
    const left = Math.floor(space / 2);
    const right = space - left;
    return ' '.repeat(left) + text + ' '.repeat(right);
  };

  // Rebuild each row with padded cells
  const formattedRows = cleanedRows.map((row, rowIndex) => {
    return '| ' + row.map((cell, i) => {
      if (rowIndex === 1) {
        // alignment row: use '-' instead of ' '
        const len = colWidths[i];
        let left = alignments[i] === 'right' ? len - 1 : alignments[i] === 'center' ? Math.floor((len - 1) / 2) : 0;
        let right = len - 1 - left;
        return (alignments[i] === 'left' ? ':' : '-') +
               '-'.repeat(left) +
               (alignments[i] === 'right' ? ':' : '-') +
               '-'.repeat(right);
      } else {
        return padCell(cell, colWidths[i]);
      }
    }).join(' | ') + ' |';
  });

  return formattedRows.join('\n');
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
