// VimiOTP i18n - 国际化支持

const I18N = {
  zh: {
    // Header
    importBackup: '导入备份',
    exportBackup: '导出备份',
    addOTP: '添加 OTP',

    // Search
    searchPlaceholder: '搜索账户...',

    // Empty state
    emptyTitle: '暂无验证码',
    emptyHint: '点击右上角 <span class="badge">+</span> 添加你的第一个 OTP',

    // Add view
    addTitle: '添加 OTP',
    tabManual: '手动输入',
    tabQrcode: '扫描二维码',
    labelIssuer: '服务商',
    placeholderIssuer: '例如: GitHub, Google',
    labelAccount: '账户名称',
    placeholderAccount: '例如: user@email.com',
    labelSecret: '密钥 (Secret Key)',
    placeholderSecret: '输入 Base32 密钥',
    btnAdd: '添加',
    scanHint: '点击下方按钮，将自动识别当前网页上的二维码',
    btnScan: '扫描网页二维码',

    // Edit view
    editTitle: '编辑 OTP',
    labelEditIssuer: '服务商',
    placeholderEditIssuer: '服务商名称',
    labelEditName: '账户名称',
    placeholderEditName: '账户名称',
    btnSave: '保存',

    // Tooltips
    tipBack: '返回',
    tipEdit: '编辑',
    tipDelete: '删除',
    tipCopy: '点击复制',

    // Toast messages
    msgNameRequired: '请输入账户名称',
    msgInvalidSecret: '请输入有效的 Base32 密钥',
    msgDuplicateSecret: '该密钥已存在',
    msgAddSuccess: '添加成功',
    msgNameEmpty: '账户名称不能为空',
    msgSaveSuccess: '保存成功',
    msgConfirmDelete: '确定删除？',
    msgDeleted: '已删除',
    msgNoData: '没有可导出的数据',
    msgExportSuccess: '导出成功',
    msgInvalidFile: '无效的备份文件',
    msgImportSuccess: (added, skipped) => `导入成功 ${added} 个${skipped > 0 ? `，跳过 ${skipped} 个重复` : ''}`,
    msgAllSkipped: (skipped) => `全部 ${skipped} 个已存在，跳过`,
    msgNoValidData: '未找到有效数据',
    msgImportFailed: '导入失败：文件格式错误',
    msgCopied: '已复制到剪贴板',
    msgSaveFailed: '保存失败',
    msgScanning: '正在扫描...',
    msgCannotScan: '无法在此页面执行扫描',
    msgNoImages: '未找到图片',
    msgNoQR: '未找到有效的 OTP 二维码',
    msgSecretExists: '该密钥已存在',
    msgAdded: (name) => `已添加: ${name}`,
    msgFoundQR: (count) => `找到 ${count} 个 OTP，请选择:`,
    msgScanFailed: (err) => `扫描失败: ${err}`,
    msgNoMatch: '无匹配结果',

    // QR list
    qrBtnAdd: '添加',
    qrBtnExists: '已存在',
    qrBtnAdded: '已添加',

    // Language
    langLabel: 'EN',
  },

  en: {
    importBackup: 'Import Backup',
    exportBackup: 'Export Backup',
    addOTP: 'Add OTP',

    searchPlaceholder: 'Search accounts...',

    emptyTitle: 'No Codes Yet',
    emptyHint: 'Tap <span class="badge">+</span> to add your first OTP',

    addTitle: 'Add OTP',
    tabManual: 'Manual',
    tabQrcode: 'Scan QR',
    labelIssuer: 'Issuer',
    placeholderIssuer: 'e.g. GitHub, Google',
    labelAccount: 'Account',
    placeholderAccount: 'e.g. user@email.com',
    labelSecret: 'Secret Key',
    placeholderSecret: 'Enter Base32 secret',
    btnAdd: 'Add',
    scanHint: 'Click the button below to scan QR codes on the current page',
    btnScan: 'Scan Page QR Code',

    editTitle: 'Edit OTP',
    labelEditIssuer: 'Issuer',
    placeholderEditIssuer: 'Issuer name',
    labelEditName: 'Account',
    placeholderEditName: 'Account name',
    btnSave: 'Save',

    tipBack: 'Back',
    tipEdit: 'Edit',
    tipDelete: 'Delete',
    tipCopy: 'Click to copy',

    msgNameRequired: 'Please enter account name',
    msgInvalidSecret: 'Please enter a valid Base32 secret',
    msgDuplicateSecret: 'This secret already exists',
    msgAddSuccess: 'Added successfully',
    msgNameEmpty: 'Account name is required',
    msgSaveSuccess: 'Saved successfully',
    msgConfirmDelete: 'Confirm delete?',
    msgDeleted: 'Deleted',
    msgNoData: 'No data to export',
    msgExportSuccess: 'Export successful',
    msgInvalidFile: 'Invalid backup file',
    msgImportSuccess: (added, skipped) => `Imported ${added}${skipped > 0 ? `, skipped ${skipped} duplicates` : ''}`,
    msgAllSkipped: (skipped) => `All ${skipped} already exist, skipped`,
    msgNoValidData: 'No valid data found',
    msgImportFailed: 'Import failed: invalid file format',
    msgCopied: 'Copied to clipboard',
    msgSaveFailed: 'Save failed',
    msgScanning: 'Scanning...',
    msgCannotScan: 'Cannot scan on this page',
    msgNoImages: 'No images found',
    msgNoQR: 'No valid OTP QR code found',
    msgSecretExists: 'This secret already exists',
    msgAdded: (name) => `Added: ${name}`,
    msgFoundQR: (count) => `Found ${count} OTP codes, select:`,
    msgScanFailed: (err) => `Scan failed: ${err}`,
    msgNoMatch: 'No results',

    qrBtnAdd: 'Add',
    qrBtnExists: 'Exists',
    qrBtnAdded: 'Added',

    langLabel: '中',
  }
};

class I18n {
  constructor() {
    this.lang = this.detectLanguage();
  }

  detectLanguage() {
    // 优先使用用户手动设置的语言
    const saved = localStorage.getItem('vimiotp_lang');
    if (saved && I18N[saved]) return saved;
    // 自动检测浏览器语言
    const browserLang = navigator.language || navigator.userLanguage || 'en';
    return browserLang.startsWith('zh') ? 'zh' : 'en';
  }

  get(key) {
    return I18N[this.lang][key] || I18N['en'][key] || key;
  }

  t(key, ...args) {
    const val = this.get(key);
    return typeof val === 'function' ? val(...args) : val;
  }

  setLang(lang) {
    this.lang = lang;
    localStorage.setItem('vimiotp_lang', lang);
  }

  toggleLang() {
    this.setLang(this.lang === 'zh' ? 'en' : 'zh');
  }

  applyToDOM() {
    // data-i18n="key" -> textContent
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });
    // data-i18n-html="key" -> innerHTML
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = this.t(el.dataset.i18nHtml);
    });
    // data-i18n-placeholder="key" -> placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = this.t(el.dataset.i18nPlaceholder);
    });
    // data-i18n-title="key" -> title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = this.t(el.dataset.i18nTitle);
    });
    // Update html lang
    document.documentElement.lang = this.lang === 'zh' ? 'zh-CN' : 'en';
  }
}
