const fs = require('fs');
const pdfjs = require('pdfjs-dist/build/pdf.js');

async function run() {
  console.log("pdfjs version:", pdfjs.version);
}
run();
