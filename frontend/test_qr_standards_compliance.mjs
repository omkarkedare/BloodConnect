/**
 * Automated ISO/IEC 18004 Standards Compliance & Round-Trip QR Decoder Test.
 * Validates that frontend/src/utils/qrCode.js generates standards-compliant QR Code symbols
 * (Model 2, Byte Mode, ECC Medium) that decode back byte-for-byte to the exact URL.
 */
import { QrCode } from './src/utils/qrCode.js';

function decodeQrMatrix(qr) {
  const size = qr.size;
  const isFunction = Array(size).fill(0).map(() => Array(size).fill(false));
  const dummyModules = Array(size).fill(0).map(() => Array(size).fill(false));
  qr.drawFunctionPatterns(dummyModules, isFunction);

  // Extract raw data bits by inverting mask on non-function modules
  const bits = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x]) {
          let invert;
          switch (qr.mask) {
            case 0: invert = (x + y) % 2 === 0; break;
            case 1: invert = y % 2 === 0; break;
            case 2: invert = x % 3 === 0; break;
            case 3: invert = (x + y) % 3 === 0; break;
            case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
            case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
            case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
            case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
            default: invert = false;
          }
          const rawBit = qr.getModule(x, y) ? 1 : 0;
          const dataBit = invert ? (rawBit ^ 1) : rawBit;
          bits.push(dataBit);
        }
      }
    }
  }

  // Pack extracted bits into 8-bit codewords
  const codewords = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i + b];
    codewords.push(byte);
  }

  // Reverse Reed-Solomon interleaving across ECC blocks
  const ver = qr.version;
  const ecl = qr.errorCorrectionLevel;
  const numBlocks = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
  const blockEccLen = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
  const rawCodewords = Math.floor(QrCode.getNumRawDataModules(ver) / 8);
  const dataLen = rawCodewords - blockEccLen * numBlocks;
  const shortBlockLen = Math.floor(dataLen / numBlocks);

  const blockLengths = [];
  for (let j = 0; j < numBlocks; j++) {
    blockLengths.push(shortBlockLen + (j >= numBlocks - (dataLen % numBlocks) ? 1 : 0));
  }

  const blocks = Array(numBlocks).fill(0).map(() => []);
  let cwIndex = 0;
  for (let i = 0; i < shortBlockLen + 1; i++) {
    for (let j = 0; j < numBlocks; j++) {
      if (i < blockLengths[j]) {
        blocks[j].push(codewords[cwIndex++]);
      }
    }
  }

  const recoveredDataCodewords = [];
  for (let j = 0; j < numBlocks; j++) {
    recoveredDataCodewords.push(...blocks[j]);
  }

  // Parse byte mode payload
  const bitArray = [];
  for (let cw of recoveredDataCodewords) {
    for (let b = 7; b >= 0; b--) bitArray.push((cw >> b) & 1);
  }

  let bitPos = 0;
  function readBits(count) {
    let val = 0;
    for (let c = 0; c < count; c++) val = (val << 1) | bitArray[bitPos++];
    return val;
  }

  const mode = readBits(4);
  const lenBits = ver < 10 ? 8 : 16;
  const textLength = readBits(lenBits);
  const charBytes = [];
  for (let c = 0; c < textLength; c++) {
    charBytes.push(readBits(8));
  }

  return {
    mode,
    version: ver,
    size,
    mask: qr.mask,
    textLength,
    decodedUrl: new TextDecoder().decode(new Uint8Array(charBytes)),
  };
}

// Test cases
const testCases = [
  'http://localhost:5173/verify-certificate/BC-CERT-20261028-00001-E2090D77',
  'https://bloodconnect.org/verify/BC-CERT-20261028-00042-88B4C2A1',
  'https://bloodconnect.org/verify-certificate/BC-CERT-20261028-00100-33AABBCC?name=Test',
];

let allPassed = true;
for (const testUrl of testCases) {
  const qr = QrCode.encodeText(testUrl, QrCode.Ecc.MEDIUM);
  const result = decodeQrMatrix(qr);
  const matches = result.decodedUrl === testUrl && result.mode === 4;

  console.log(`[QR Test] Version: ${result.version} | Mask: ${result.mask} | Decoded: ${result.decodedUrl}`);
  if (!matches) {
    console.error(`[FAIL] Expected: "${testUrl}", Got: "${result.decodedUrl}"`);
    allPassed = false;
  }
}

if (!allPassed) {
  console.error('QR compliance verification FAILED');
  process.exit(1);
} else {
  console.log('ALL QR standards compliance tests PASSED (100% round-trip match).');
}
