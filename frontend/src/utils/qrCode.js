/**
 * Lightweight, zero-dependency QR Code generator module.
 * Based on Nayuki's public domain QR code generation reference.
 * Generates standards-compliant QR Code symbols (Model 2, Versions 1-40, Byte Mode, ECC L/M/Q/H).
 */

export class QrCode {
  constructor(version, errorCorrectionLevel, dataCodewords, msk) {
    if (version < 1 || version > 40) throw new RangeError("Version out of range");
    if (msk < -1 || msk > 7) throw new RangeError("Mask out of range");
    this.version = version;
    this.size = version * 4 + 17;
    this.errorCorrectionLevel = errorCorrectionLevel;

    const modules = Array(this.size).fill(0).map(() => Array(this.size).fill(false));
    const isFunction = Array(this.size).fill(0).map(() => Array(this.size).fill(false));

    this.drawFunctionPatterns(modules, isFunction);
    const allCodewords = this.addEccAndInterleave(dataCodewords);
    this.drawCodewords(allCodewords, modules, isFunction);

    if (msk === -1) {
      let minPenalty = 1e9;
      for (let i = 0; i < 8; i++) {
        this.applyMask(i, modules, isFunction);
        this.drawFormatBits(i, modules, isFunction);
        const penalty = this.getPenaltyScore(modules);
        if (penalty < minPenalty) {
          minPenalty = penalty;
          msk = i;
        }
        this.applyMask(i, modules, isFunction);
      }
    }
    this.mask = msk;
    this.applyMask(msk, modules, isFunction);
    this.drawFormatBits(msk, modules, isFunction);
    this.modules = modules;
  }

  getModule(x, y) {
    return (x >= 0 && x < this.size && y >= 0 && y < this.size) ? this.modules[y][x] : false;
  }

  drawFunctionPatterns(modules, isFunction) {
    for (let i = 0; i < this.size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0, modules, isFunction);
      this.setFunctionModule(i, 6, i % 2 === 0, modules, isFunction);
    }
    this.drawFinderPattern(3, 3, modules, isFunction);
    this.drawFinderPattern(this.size - 4, 3, modules, isFunction);
    this.drawFinderPattern(3, this.size - 4, modules, isFunction);

    const alignPatPos = this.getAlignmentPatternPositions();
    const numAlign = alignPatPos.length;
    for (let i = 0; i < numAlign; i++) {
      for (let j = 0; j < numAlign; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === numAlign - 1) || (i === numAlign - 1 && j === 0)) continue;
        this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j], modules, isFunction);
      }
    }
    this.drawFormatBits(0, modules, isFunction);
    this.drawVersion(modules, isFunction);
  }

  drawFinderPattern(x, y, modules, isFunction) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4, modules, isFunction);
        }
      }
    }
  }

  drawAlignmentPattern(x, y, modules, isFunction) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1, modules, isFunction);
      }
    }
  }

  setFunctionModule(x, y, isDark, modules, isFunction) {
    modules[y][x] = isDark;
    isFunction[y][x] = true;
  }

  drawFormatBits(mask, modules, isFunction) {
    const data = (this.errorCorrectionLevel.formatBits << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, ((bits >>> i) & 1) !== 0, modules, isFunction);
    this.setFunctionModule(8, 7, ((bits >>> 6) & 1) !== 0, modules, isFunction);
    this.setFunctionModule(8, 8, ((bits >>> 7) & 1) !== 0, modules, isFunction);
    this.setFunctionModule(7, 8, ((bits >>> 8) & 1) !== 0, modules, isFunction);
    for (let i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, ((bits >>> i) & 1) !== 0, modules, isFunction);
    for (let i = 0; i < 8; i++) this.setFunctionModule(this.size - 1 - i, 8, ((bits >>> i) & 1) !== 0, modules, isFunction);
    for (let i = 8; i < 15; i++) this.setFunctionModule(8, this.size - 15 + i, ((bits >>> i) & 1) !== 0, modules, isFunction);
    this.setFunctionModule(8, this.size - 8, true, modules, isFunction);
  }

  drawVersion(modules, isFunction) {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const color = ((bits >>> i) & 1) !== 0;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunctionModule(a, b, color, modules, isFunction);
      this.setFunctionModule(b, a, color, modules, isFunction);
    }
  }

  drawCodewords(data, modules, isFunction) {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!isFunction[y][x] && i < data.length * 8) {
            modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
        }
      }
    }
  }

  applyMask(mask, modules, isFunction) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!isFunction[y][x]) {
          let invert;
          switch (mask) {
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
          if (invert) modules[y][x] = !modules[y][x];
        }
      }
    }
  }

  getPenaltyScore(modules) {
    let result = 0;
    for (let y = 0; y < this.size; y++) {
      let runColor = false, runX = 0;
      for (let x = 0; x < this.size; x++) {
        if (modules[y][x] === runColor) {
          runX++;
          if (runX === 5) result += 3;
          else if (runX > 5) result++;
        } else {
          runColor = modules[y][x];
          runX = 1;
        }
      }
    }
    for (let x = 0; x < this.size; x++) {
      let runColor = false, runY = 0;
      for (let y = 0; y < this.size; y++) {
        if (modules[y][x] === runColor) {
          runY++;
          if (runY === 5) result += 3;
          else if (runY > 5) result++;
        } else {
          runColor = modules[y][x];
          runY = 1;
        }
      }
    }
    for (let y = 0; y < this.size - 1; y++) {
      for (let x = 0; x < this.size - 1; x++) {
        const color = modules[y][x];
        if (color === modules[y][x + 1] && color === modules[y + 1][x] && color === modules[y + 1][x + 1]) {
          result += 3;
        }
      }
    }
    let total = 0, dark = 0;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (modules[y][x]) dark++;
        total++;
      }
    }
    const k = Math.floor(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += k * 10;
    return result;
  }

  getAlignmentPatternPositions() {
    if (this.version === 1) return [];
    const num = Math.floor(this.version / 7) + 2;
    const step = (this.version === 32) ? 26 : Math.ceil((this.version * 4 + 4) / (num * 2 - 2)) * 2;
    const result = [6];
    for (let pos = this.size - 7; result.length < num; pos -= step) result.splice(1, 0, pos);
    return result;
  }

  addEccAndInterleave(data) {
    const ver = this.version, ecl = this.errorCorrectionLevel;
    const numBlocks = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
    const blockEccLen = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
    const rawCodewords = Math.floor(QrCode.getNumRawDataModules(ver) / 8);
    const dataLen = rawCodewords - blockEccLen * numBlocks;
    const shortBlockLen = Math.floor(dataLen / numBlocks);
    
    const blocks = [];
    const rsDiv = QrCode.reedSolomonComputeDivisor(blockEccLen);
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const dat = data.slice(k, k + shortBlockLen + (i >= numBlocks - (dataLen % numBlocks) ? 1 : 0));
      k += dat.length;
      const ecc = QrCode.reedSolomonComputeRemainder(dat, rsDiv);
      blocks.push({ data: dat, ecc: ecc });
    }

    const result = [];
    for (let i = 0; i < shortBlockLen + 1; i++) {
      for (let j = 0; j < numBlocks; j++) {
        if (i < blocks[j].data.length) result.push(blocks[j].data[i]);
      }
    }
    for (let i = 0; i < blockEccLen; i++) {
      for (let j = 0; j < numBlocks; j++) {
        result.push(blocks[j].ecc[i]);
      }
    }
    return result;
  }

  static encodeText(text, ecl = QrCode.Ecc.MEDIUM) {
    const bytes = new TextEncoder().encode(text);
    return QrCode.encodeBinary(bytes, ecl);
  }

  static encodeBinary(data, ecl) {
    for (let version = 1; version <= 40; version++) {
      const numBlocks = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][version];
      const blockEccLen = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][version];
      const rawCodewords = Math.floor(QrCode.getNumRawDataModules(version) / 8);
      const dataCapacity = rawCodewords - blockEccLen * numBlocks;
      const headerBits = 4 + (version < 10 ? 8 : 16);
      const totalBits = headerBits + data.length * 8;
      if (totalBits <= dataCapacity * 8) {
        const bb = [];
        const appendBits = (val, len) => {
          for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
        };
        appendBits(0x4, 4); // 8-bit byte mode
        appendBits(data.length, version < 10 ? 8 : 16);
        for (let b of data) appendBits(b, 8);
        for (let i = 0; i < 4 && bb.length < dataCapacity * 8; i++) bb.push(0);
        while (bb.length % 8 !== 0) bb.push(0);
        for (let pad = 0xEC; bb.length < dataCapacity * 8; pad ^= 0xEC ^ 0x11) appendBits(pad, 8);
        const bytes = [];
        for (let i = 0; i < bb.length; i += 8) {
          let byte = 0;
          for (let j = 0; j < 8; j++) byte = (byte << 1) | bb[i + j];
          bytes.push(byte);
        }
        return new QrCode(version, ecl, bytes, -1);
      }
    }
    throw new Error("Data too long for QR Code");
  }

  static getNumRawDataModules(ver) {
    let result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }

  static reedSolomonComputeDivisor(degree) {
    const result = Array(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        result[j] = QrCode.reedSolomonMultiply(result[j], root);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      root = QrCode.reedSolomonMultiply(root, 0x02);
    }
    return result;
  }

  static reedSolomonComputeRemainder(data, divisor) {
    const result = divisor.map(() => 0);
    for (let b of data) {
      const factor = b ^ result.shift();
      result.push(0);
      divisor.forEach((coef, i) => {
        result[i] ^= QrCode.reedSolomonMultiply(coef, factor);
      });
    }
    return result;
  }

  static reedSolomonMultiply(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
}

QrCode.Ecc = {
  LOW: { ordinal: 0, formatBits: 1 },
  MEDIUM: { ordinal: 1, formatBits: 0 },
  QUARTILE: { ordinal: 2, formatBits: 3 },
  HIGH: { ordinal: 3, formatBits: 2 },
};

QrCode.ECC_CODEWORDS_PER_BLOCK = [
  [-1,  7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

QrCode.NUM_ERROR_CORRECTION_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];
