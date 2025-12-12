// VimiOTP - Main popup script

class VimiOTP {
  constructor() {
    this.otpList = [];
    this.timerInterval = null;
    this.init();
  }

  async init() {
    await this.loadOTPList();
    this.bindEvents();
    this.startTimer();
  }

  // Load OTP list from storage
  async loadOTPList() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['otpList'], (result) => {
        this.otpList = result.otpList || [];
        this.renderOTPList();
        resolve();
      });
    });
  }

  // Save OTP list to storage
  async saveOTPList() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ otpList: this.otpList }, resolve);
    });
  }

  // Bind UI events
  bindEvents() {
    // Add button
    document.getElementById('addBtn').addEventListener('click', () => {
      this.showModal();
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportKeys();
    });

    // Close modal
    document.getElementById('closeModal').addEventListener('click', () => {
      this.hideModal();
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Manual add
    document.getElementById('addManual').addEventListener('click', () => {
      this.addManualOTP();
    });

    // Scan QR
    document.getElementById('scanQR').addEventListener('click', () => {
      this.scanQRCode();
    });

    // Click outside modal to close
    document.getElementById('addModal').addEventListener('click', (e) => {
      if (e.target.id === 'addModal') {
        this.hideModal();
      }
    });
  }

  // Export keys to file
  exportKeys() {
    if (this.otpList.length === 0) {
      alert('没有可导出的密钥');
      return;
    }

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts: this.otpList.map(otp => ({
        name: otp.name,
        secret: otp.secret,
        issuer: otp.issuer || ''
      }))
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `vimiotp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Show add modal
  showModal() {
    document.getElementById('mainView').classList.add('hidden');
    document.getElementById('addModal').classList.remove('hidden');
    document.getElementById('accountName').value = '';
    document.getElementById('secretKey').value = '';
    document.getElementById('scanResult').className = 'scan-result';
    document.getElementById('scanResult').textContent = '';
  }

  // Hide add modal
  hideModal() {
    document.getElementById('addModal').classList.add('hidden');
    document.getElementById('mainView').classList.remove('hidden');
  }

  // Switch tabs
  switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
  }

  // Add OTP manually
  async addManualOTP() {
    const name = document.getElementById('accountName').value.trim();
    const secret = document.getElementById('secretKey').value.trim().replace(/\s/g, '').toUpperCase();

    if (!name) {
      alert('请输入账户名称');
      return;
    }

    if (!secret || !this.isValidBase32(secret)) {
      alert('请输入有效的 Base32 密钥');
      return;
    }

    await this.addOTP(name, secret);
    this.hideModal();
  }

  // Validate Base32
  isValidBase32(str) {
    return /^[A-Z2-7]+=*$/i.test(str);
  }

  // Add OTP to list
  async addOTP(name, secret, issuer = '') {
    const otp = {
      id: Date.now().toString(),
      name: name,
      secret: secret,
      issuer: issuer,
      createdAt: new Date().toISOString()
    };

    this.otpList.push(otp);
    await this.saveOTPList();
    this.renderOTPList();
  }

  // Delete OTP
  async deleteOTP(id) {
    if (!confirm('确定要删除这个 OTP 吗？')) return;
    
    this.otpList = this.otpList.filter(otp => otp.id !== id);
    await this.saveOTPList();
    this.renderOTPList();
  }

  // Render OTP list
  renderOTPList() {
    const listEl = document.getElementById('otpList');
    const emptyEl = document.getElementById('emptyState');

    if (this.otpList.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    
    listEl.innerHTML = this.otpList.map(otp => {
      const code = this.generateTOTP(otp.secret);
      const displayCode = code.slice(0, 3) + ' ' + code.slice(3);
      
      return `
        <div class="otp-item" data-id="${otp.id}">
          <div class="otp-account">
            <span>${this.escapeHtml(otp.issuer ? `${otp.issuer} (${otp.name})` : otp.name)}</span>
            <button class="icon-btn delete-btn" data-id="${otp.id}" title="删除">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
          <div class="otp-code" data-secret="${otp.secret}" title="点击复制">${displayCode}</div>
          <div class="otp-timer">
            <div class="timer-bar">
              <div class="timer-progress" data-secret="${otp.secret}"></div>
            </div>
            <span class="timer-text" data-secret="${otp.secret}">30</span>
          </div>
        </div>
      `;
    }).join('');

    // Bind delete events
    listEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteOTP(btn.dataset.id);
      });
    });

    // Bind copy events
    listEl.querySelectorAll('.otp-code').forEach(codeEl => {
      codeEl.addEventListener('click', () => {
        this.copyCode(codeEl);
      });
    });

    this.updateTimers();
  }

  // Copy code to clipboard
  async copyCode(codeEl) {
    const code = codeEl.textContent.replace(/\s/g, '');
    try {
      await navigator.clipboard.writeText(code);
      codeEl.classList.add('copied');
      const originalText = codeEl.textContent;
      codeEl.textContent = '已复制';
      setTimeout(() => {
        codeEl.classList.remove('copied');
        codeEl.textContent = originalText;
      }, 1000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  // Start timer
  startTimer() {
    this.timerInterval = setInterval(() => {
      this.updateTimers();
    }, 1000);
  }

  // Update timers
  updateTimers() {
    const now = Math.floor(Date.now() / 1000);
    const remaining = 30 - (now % 30);
    const progress = (remaining / 30) * 100;

    // Update all timer bars
    document.querySelectorAll('.timer-progress').forEach(bar => {
      bar.style.width = `${progress}%`;
      bar.classList.remove('warning', 'danger');
      if (remaining <= 5) {
        bar.classList.add('danger');
      } else if (remaining <= 10) {
        bar.classList.add('warning');
      }
    });

    // Update all timer texts
    document.querySelectorAll('.timer-text').forEach(text => {
      text.textContent = remaining;
    });

    // Refresh codes when timer resets
    if (remaining === 30) {
      this.refreshCodes();
    }
  }

  // Refresh all OTP codes
  refreshCodes() {
    document.querySelectorAll('.otp-code').forEach(codeEl => {
      const secret = codeEl.dataset.secret;
      const code = this.generateTOTP(secret);
      const displayCode = code.slice(0, 3) + ' ' + code.slice(3);
      codeEl.textContent = displayCode;
    });
  }

  // Generate TOTP
  generateTOTP(secret, period = 30, digits = 6) {
    try {
      const key = this.base32ToBytes(secret);
      const time = Math.floor(Date.now() / 1000 / period);
      const timeBytes = this.intToBytes(time);
      
      const hmac = new jsSHA('SHA-1', 'UINT8ARRAY');
      hmac.setHMACKey(key, 'UINT8ARRAY');
      hmac.update(timeBytes);
      const hash = hmac.getHMAC('UINT8ARRAY');
      
      const offset = hash[hash.length - 1] & 0x0f;
      const binary = ((hash[offset] & 0x7f) << 24) |
                     ((hash[offset + 1] & 0xff) << 16) |
                     ((hash[offset + 2] & 0xff) << 8) |
                     (hash[offset + 3] & 0xff);
      
      const otp = binary % Math.pow(10, digits);
      return otp.toString().padStart(digits, '0');
    } catch (e) {
      console.error('TOTP generation error:', e);
      return '------';
    }
  }

  // Base32 to bytes
  base32ToBytes(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    const cleanedBase32 = base32.replace(/=+$/, '').toUpperCase();
    
    for (let i = 0; i < cleanedBase32.length; i++) {
      const val = alphabet.indexOf(cleanedBase32[i]);
      if (val === -1) throw new Error('Invalid base32 character');
      bits += val.toString(2).padStart(5, '0');
    }
    
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    }
    
    return bytes;
  }

  // Int to bytes (8 bytes, big-endian)
  intToBytes(num) {
    const bytes = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
      bytes[i] = num & 0xff;
      num = Math.floor(num / 256);
    }
    return bytes;
  }

  // Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Scan QR code from current page
  async scanQRCode() {
    const resultEl = document.getElementById('scanResult');
    const qrListEl = document.getElementById('qrList');
    resultEl.className = 'scan-result';
    resultEl.textContent = '正在扫描...';
    resultEl.style.display = 'block';
    qrListEl.classList.add('hidden');
    qrListEl.innerHTML = '';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Inject content script to get images
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const images = [];
          // 获取所有 img 标签
          document.querySelectorAll('img').forEach(img => {
            if (img.src && img.naturalWidth >= 20 && img.naturalHeight >= 20) {
              images.push(img.src);
            }
          });
          // 获取所有 canvas 元素
          document.querySelectorAll('canvas').forEach(canvas => {
            if (canvas.width >= 20 && canvas.height >= 20) {
              try {
                const dataUrl = canvas.toDataURL('image/png');
                images.push(dataUrl);
              } catch (e) {
                // CORS error, skip
              }
            }
          });
          // 获取 SVG 元素
          document.querySelectorAll('svg').forEach(svg => {
            if (svg.clientWidth >= 20 && svg.clientHeight >= 20) {
              try {
                const svgData = new XMLSerializer().serializeToString(svg);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                images.push(url);
              } catch (e) {
                // skip
              }
            }
          });
          return images;
        }
      });

      const images = results[0].result;
      
      if (!images || images.length === 0) {
        resultEl.className = 'scan-result error';
        resultEl.textContent = '未找到图片';
        return;
      }

      // Try to decode QR codes from all images
      const foundOTPs = [];
      for (const imgSrc of images) {
        const otpUri = await this.decodeQRFromImage(imgSrc);
        if (otpUri) {
          const parsed = this.parseOTPUri(otpUri);
          if (parsed) {
            // 避免重复
            const exists = foundOTPs.some(o => o.secret === parsed.secret);
            if (!exists) {
              foundOTPs.push(parsed);
            }
          }
        }
      }

      if (foundOTPs.length === 0) {
        resultEl.className = 'scan-result error';
        resultEl.textContent = '未找到有效的 OTP 二维码';
        return;
      }

      if (foundOTPs.length === 1) {
        // 只有一个，直接添加
        const otp = foundOTPs[0];
        await this.addOTP(otp.name, otp.secret, otp.issuer);
        resultEl.className = 'scan-result success';
        resultEl.textContent = `成功添加: ${otp.issuer || otp.name}`;
        setTimeout(() => this.hideModal(), 1500);
        return;
      }

      // 多个二维码，显示列表让用户选择
      resultEl.className = 'scan-result success';
      resultEl.textContent = `找到 ${foundOTPs.length} 个 OTP 二维码，请选择要添加的:`;
      
      qrListEl.classList.remove('hidden');
      qrListEl.innerHTML = foundOTPs.map((otp, index) => `
        <div class="qr-item" data-index="${index}">
          <div class="qr-item-info">
            <div class="qr-item-name">${this.escapeHtml(otp.name)}</div>
            ${otp.issuer ? `<div class="qr-item-issuer">${this.escapeHtml(otp.issuer)}</div>` : ''}
          </div>
          <button class="qr-item-btn" data-index="${index}">添加</button>
        </div>
      `).join('');

      // 绑定添加按钮事件
      qrListEl.querySelectorAll('.qr-item-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const idx = parseInt(e.target.dataset.index);
          const otp = foundOTPs[idx];
          await this.addOTP(otp.name, otp.secret, otp.issuer);
          e.target.textContent = '已添加';
          e.target.classList.add('added');
          e.target.disabled = true;
        });
      });

    } catch (err) {
      console.error('Scan error:', err);
      resultEl.className = 'scan-result error';
      resultEl.textContent = '扫描失败: ' + err.message;
    }
  }

  // Decode QR from image URL
  async decodeQRFromImage(imgSrc) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code && code.data.startsWith('otpauth://')) {
            resolve(code.data);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      };
      
      img.onerror = () => resolve(null);
      img.src = imgSrc;
    });
  }

  // Parse OTP URI
  parseOTPUri(uri) {
    try {
      const url = new URL(uri);
      if (url.protocol !== 'otpauth:') return null;
      
      const type = url.hostname; // totp or hotp
      if (type !== 'totp') return null; // Only support TOTP for now
      
      const path = decodeURIComponent(url.pathname.slice(1));
      const secret = url.searchParams.get('secret');
      const issuer = url.searchParams.get('issuer') || '';
      
      if (!secret) return null;
      
      // Parse name from path (format: issuer:account or just account)
      let name = path;
      if (path.includes(':')) {
        name = path.split(':')[1];
      }
      
      return { name, secret: secret.toUpperCase(), issuer };
    } catch (e) {
      return null;
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new VimiOTP();
});
