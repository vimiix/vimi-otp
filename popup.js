// VimiOTP - Main popup script

class VimiOTP {
  constructor() {
    this.otpList = [];
    this.secretMap = new Map(); // id -> secret，避免 DOM 泄露
    this.timerInterval = null;
    this.searchQuery = '';
    this._lastPeriod = null;
    this.init();
  }

  async init() {
    await this.loadOTPList();
    this.bindEvents();
    this.startTimer();
  }

  // ==================== Storage ====================

  async loadOTPList() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['otpList'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Storage read error:', chrome.runtime.lastError);
          this.otpList = [];
        } else {
          this.otpList = Array.isArray(result.otpList) ? result.otpList : [];
        }
        this.renderOTPList();
        resolve();
      });
    });
  }

  async saveOTPList() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ otpList: this.otpList }, () => {
        if (chrome.runtime.lastError) {
          console.error('Storage write error:', chrome.runtime.lastError);
          this.showToast('保存失败');
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  // ==================== Events ====================

  bindEvents() {
    document.getElementById('addBtn').addEventListener('click', () => this.showView('addView'));
    document.getElementById('backBtn').addEventListener('click', () => this.showView('mainView'));
    document.getElementById('editBackBtn').addEventListener('click', () => this.showView('mainView'));
    document.getElementById('exportBtn').addEventListener('click', () => this.exportKeys());
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', (e) => this.importKeys(e));
    document.getElementById('addManual').addEventListener('click', () => this.addManualOTP());
    document.getElementById('scanQR').addEventListener('click', () => this.scanQRCode());
    document.getElementById('saveEdit').addEventListener('click', () => this.saveEditOTP());

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderOTPList();
    });
  }

  // ==================== Navigation ====================

  showView(viewId) {
    ['mainView', 'addView', 'editView'].forEach(id => {
      document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');

    if (viewId === 'addView') {
      document.getElementById('issuerName').value = '';
      document.getElementById('accountName').value = '';
      document.getElementById('secretKey').value = '';
      document.getElementById('scanResult').className = 'scan-result';
      document.getElementById('scanResult').textContent = '';
      document.getElementById('qrList').classList.add('hidden');
    }
    if (viewId === 'mainView') {
      this.renderOTPList();
    }
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
  }

  // ==================== Toast ====================

  showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 300);
    }, duration);
  }

  // ==================== Add OTP ====================

  async addManualOTP() {
    const issuer = document.getElementById('issuerName').value.trim();
    const name = document.getElementById('accountName').value.trim();
    const secret = document.getElementById('secretKey').value.trim().replace(/\s/g, '').toUpperCase();

    if (!name) {
      this.showToast('请输入账户名称');
      return;
    }
    if (!secret || !this.isValidBase32(secret)) {
      this.showToast('请输入有效的 Base32 密钥');
      return;
    }
    if (this.isDuplicateSecret(secret)) {
      this.showToast('该密钥已存在');
      return;
    }

    await this.addOTP(name, secret, issuer);
    this.showView('mainView');
    this.showToast('添加成功');
  }

  isValidBase32(str) {
    if (!str || str.length === 0) return false;
    const cleaned = str.replace(/=+$/, '');
    return /^[A-Z2-7]+$/i.test(cleaned) && cleaned.length > 0;
  }

  isDuplicateSecret(secret) {
    return this.otpList.some(otp => otp.secret === secret);
  }

  async addOTP(name, secret, issuer = '') {
    const otp = {
      id: crypto.randomUUID(),
      name,
      secret,
      issuer,
      order: this.otpList.length,
      createdAt: new Date().toISOString()
    };
    this.otpList.push(otp);
    await this.saveOTPList();
    this.renderOTPList();
  }

  // ==================== Edit OTP ====================

  showEditOTP(id) {
    const otp = this.otpList.find(o => o.id === id);
    if (!otp) return;
    document.getElementById('editIssuer').value = otp.issuer || '';
    document.getElementById('editName').value = otp.name || '';
    document.getElementById('editId').value = otp.id;
    this.showView('editView');
  }

  async saveEditOTP() {
    const id = document.getElementById('editId').value;
    const issuer = document.getElementById('editIssuer').value.trim();
    const name = document.getElementById('editName').value.trim();

    if (!name) {
      this.showToast('账户名称不能为空');
      return;
    }

    const otp = this.otpList.find(o => o.id === id);
    if (otp) {
      otp.issuer = issuer;
      otp.name = name;
      await this.saveOTPList();
      this.showView('mainView');
      this.showToast('保存成功');
    }
  }

  // ==================== Delete OTP ====================

  async deleteOTP(id) {
    if (!confirm('确定删除？')) return;
    this.otpList = this.otpList.filter(otp => otp.id !== id);
    await this.saveOTPList();
    this.renderOTPList();
    this.showToast('已删除');
  }

  // ==================== Export / Import ====================

  exportKeys() {
    if (this.otpList.length === 0) {
      this.showToast('没有可导出的数据');
      return;
    }
    const exportData = {
      version: 1,
      app: 'VimiOTP',
      exportedAt: new Date().toISOString(),
      accounts: this.otpList.map(otp => ({
        name: otp.name,
        secret: otp.secret,
        issuer: otp.issuer || ''
      }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vimiotp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('导出成功');
  }

  async importKeys(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.accounts || !Array.isArray(data.accounts)) {
        this.showToast('无效的备份文件');
        return;
      }

      let added = 0;
      let skipped = 0;
      for (const account of data.accounts) {
        if (!account.secret || !account.name) continue;
        const secret = account.secret.replace(/\s/g, '').toUpperCase();
        if (!this.isValidBase32(secret)) continue;

        if (this.isDuplicateSecret(secret)) {
          skipped++;
          continue;
        }
        await this.addOTP(account.name, secret, account.issuer || '');
        added++;
      }

      if (added > 0) {
        this.showToast(`导入成功 ${added} 个${skipped > 0 ? `，跳过 ${skipped} 个重复` : ''}`);
      } else if (skipped > 0) {
        this.showToast(`全部 ${skipped} 个已存在，跳过`);
      } else {
        this.showToast('未找到有效数据');
      }
    } catch (e) {
      this.showToast('导入失败：文件格式错误');
    }

    // Reset file input
    event.target.value = '';
  }

  // ==================== Render ====================

  renderOTPList() {
    const listEl = document.getElementById('otpList');
    const emptyEl = document.getElementById('emptyState');
    const searchBar = document.getElementById('searchBar');

    // Show/hide search bar
    if (this.otpList.length >= 3) {
      searchBar.classList.remove('hidden');
    } else {
      searchBar.classList.add('hidden');
    }

    if (this.otpList.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');

    // Filter by search
    let filtered = this.otpList;
    if (this.searchQuery) {
      filtered = this.otpList.filter(otp =>
        otp.name.toLowerCase().includes(this.searchQuery) ||
        (otp.issuer && otp.issuer.toLowerCase().includes(this.searchQuery))
      );
    }

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="empty-state" style="padding:20px"><p class="empty-hint">无匹配结果</p></div>';
      return;
    }

    // 构建 secret 映射
    this.secretMap.clear();
    filtered.forEach(otp => this.secretMap.set(otp.id, otp.secret));

    listEl.innerHTML = filtered.map(otp => {
      const code = this.generateTOTP(otp.secret);
      const displayCode = code.slice(0, 3) + ' ' + code.slice(3);
      const label = otp.issuer ? `${this.escapeHtml(otp.issuer)} · ${this.escapeHtml(otp.name)}` : this.escapeHtml(otp.name);

      return `
        <div class="otp-item" data-id="${otp.id}">
          <div class="otp-account">
            <span class="otp-account-name">${label}</span>
            <div class="otp-actions">
              <button class="icon-btn edit-btn" data-id="${otp.id}" title="编辑">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="icon-btn delete-btn" data-id="${otp.id}" title="删除">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="otp-code" data-id="${otp.id}" title="点击复制">${displayCode}</div>
          <div class="otp-timer">
            <div class="timer-bar">
              <div class="timer-progress" data-id="${otp.id}"></div>
            </div>
            <span class="timer-text" data-id="${otp.id}">30</span>
          </div>
        </div>
      `;
    }).join('');

    // Bind events
    listEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteOTP(btn.dataset.id);
      });
    });

    listEl.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showEditOTP(btn.dataset.id);
      });
    });

    listEl.querySelectorAll('.otp-code').forEach(codeEl => {
      codeEl.addEventListener('click', () => this.copyCode(codeEl));
    });

    this.updateTimers();
  }

  // ==================== Copy ====================

  async copyCode(codeEl) {
    const code = codeEl.textContent.replace(/\s/g, '');
    try {
      await navigator.clipboard.writeText(code);
      codeEl.classList.add('copied');
      this.showToast('已复制到剪贴板');
      setTimeout(() => codeEl.classList.remove('copied'), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  // ==================== Timer ====================

  startTimer() {
    this.timerInterval = setInterval(() => this.updateTimers(), 1000);
  }

  updateTimers() {
    const now = Math.floor(Date.now() / 1000);
    const remaining = 30 - (now % 30);
    const progress = (remaining / 30) * 100;

    // 检测周期变化，可靠地触发刷新
    const currentPeriod = Math.floor(now / 30);
    if (this._lastPeriod !== null && currentPeriod !== this._lastPeriod) {
      this.refreshCodes();
    }
    this._lastPeriod = currentPeriod;

    // Update bar timers
    document.querySelectorAll('.timer-progress').forEach(bar => {
      bar.style.width = `${progress}%`;
      bar.classList.remove('warning', 'danger');
      if (remaining <= 5) bar.classList.add('danger');
      else if (remaining <= 10) bar.classList.add('warning');
    });

    // Update texts
    document.querySelectorAll('.timer-text').forEach(text => {
      text.textContent = remaining;
    });
  }

  refreshCodes() {
    document.querySelectorAll('.otp-code').forEach(codeEl => {
      const id = codeEl.dataset.id;
      const secret = this.secretMap.get(id);
      if (!secret) return;
      const code = this.generateTOTP(secret);
      codeEl.textContent = code.slice(0, 3) + ' ' + code.slice(3);
    });
  }

  // ==================== TOTP ====================

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

      return (binary % Math.pow(10, digits)).toString().padStart(digits, '0');
    } catch (e) {
      console.error('TOTP generation error:', e);
      return '------';
    }
  }

  base32ToBytes(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    const cleaned = base32.replace(/=+$/, '').toUpperCase();
    for (let i = 0; i < cleaned.length; i++) {
      const val = alphabet.indexOf(cleaned[i]);
      if (val === -1) throw new Error('Invalid base32 character');
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    }
    return bytes;
  }

  intToBytes(num) {
    const bytes = new Uint8Array(8);
    let bigNum = BigInt(num);
    for (let i = 7; i >= 0; i--) {
      bytes[i] = Number(bigNum & 0xffn);
      bigNum = bigNum >> 8n;
    }
    return bytes;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== QR Scan ====================

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

      // 检测无法扫描的特殊页面
      if (!tab || !tab.url || tab.url.startsWith('chrome://') ||
          tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:') ||
          tab.url.startsWith('edge://') || tab.url.startsWith('brave://')) {
        resultEl.className = 'scan-result error';
        resultEl.textContent = '无法在此页面执行扫描';
        return;
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const images = [];
          document.querySelectorAll('img').forEach(img => {
            if (img.src && img.naturalWidth >= 20 && img.naturalHeight >= 20) {
              images.push(img.src);
            }
          });
          document.querySelectorAll('canvas').forEach(canvas => {
            if (canvas.width >= 20 && canvas.height >= 20) {
              try { images.push(canvas.toDataURL('image/png')); } catch (e) {}
            }
          });
          document.querySelectorAll('svg').forEach(svg => {
            if (svg.clientWidth >= 20 && svg.clientHeight >= 20) {
              try {
                const data = new XMLSerializer().serializeToString(svg);
                images.push(URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' })));
              } catch (e) {}
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

      const foundOTPs = [];
      for (const imgSrc of images) {
        const otpUri = await this.decodeQRFromImage(imgSrc);
        if (otpUri) {
          const parsed = this.parseOTPUri(otpUri);
          if (parsed && !foundOTPs.some(o => o.secret === parsed.secret)) {
            foundOTPs.push(parsed);
          }
        }
      }

      if (foundOTPs.length === 0) {
        resultEl.className = 'scan-result error';
        resultEl.textContent = '未找到有效的 OTP 二维码';
        return;
      }

      if (foundOTPs.length === 1) {
        const otp = foundOTPs[0];
        if (this.isDuplicateSecret(otp.secret)) {
          resultEl.className = 'scan-result error';
          resultEl.textContent = '该密钥已存在';
          return;
        }
        await this.addOTP(otp.name, otp.secret, otp.issuer);
        resultEl.className = 'scan-result success';
        resultEl.textContent = `已添加: ${otp.issuer || otp.name}`;
        setTimeout(() => this.showView('mainView'), 1200);
        return;
      }

      resultEl.className = 'scan-result success';
      resultEl.textContent = `找到 ${foundOTPs.length} 个 OTP，请选择:`;

      qrListEl.classList.remove('hidden');
      qrListEl.innerHTML = foundOTPs.map((otp, i) => `
        <div class="qr-item">
          <div class="qr-item-info">
            <div class="qr-item-name">${this.escapeHtml(otp.name)}</div>
            ${otp.issuer ? `<div class="qr-item-issuer">${this.escapeHtml(otp.issuer)}</div>` : ''}
          </div>
          <button class="qr-item-btn" data-index="${i}">${this.isDuplicateSecret(otp.secret) ? '已存在' : '添加'}</button>
        </div>
      `).join('');

      qrListEl.querySelectorAll('.qr-item-btn').forEach(btn => {
        if (btn.textContent === '已存在') {
          btn.classList.add('added');
          btn.disabled = true;
          return;
        }
        btn.addEventListener('click', async (e) => {
          const otp = foundOTPs[parseInt(e.target.dataset.index)];
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
          resolve(code && code.data.startsWith('otpauth://') ? code.data : null);
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = imgSrc;
    });
  }

  parseOTPUri(uri) {
    try {
      const url = new URL(uri);
      if (url.protocol !== 'otpauth:') return null;
      if (url.hostname !== 'totp') return null;

      const path = decodeURIComponent(url.pathname.slice(1));
      const secret = url.searchParams.get('secret');
      const issuer = url.searchParams.get('issuer') || '';
      if (!secret) return null;

      let name = path;
      if (path.includes(':')) name = path.split(':')[1];

      return { name, secret: secret.toUpperCase(), issuer };
    } catch (e) { return null; }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => new VimiOTP());
