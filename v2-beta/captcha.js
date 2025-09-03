export class Check {
  static human = null; // 人間判定結果: null（未チェック）、true（人間）、false（非人間）

  constructor(config = {}) {
    this.config = config.captchaData || [
      { id: 1, url: 'https://via.placeholder.com/100?text=猫', label: '猫', isCorrect: true },
      { id: 2, url: 'https://via.placeholder.com/100?text=犬', label: '犬', isCorrect: false },
      { id: 3, url: 'https://via.placeholder.com/100?text=車', label: '車', isCorrect: false }
    ];
    this.container = null;
    this.resultInput = null;
    this.messageDiv = null;
    this.processingOverlay = document.createElement('div');
    this.processingOverlay.id = 'captcha-processing';
    this.processingOverlay.innerText = '処理中...';
    document.body.appendChild(this.processingOverlay);
  }


  block() {
    const container = document.createElement('div');
    container.id = 'captcha-container';
    this.container = container;
    this.resultInput = document.createElement('input');
    this.resultInput.type = 'hidden';
    this.resultInput.id = 'captchaResult';
    this.resultInput.name = 'captchaResult';
    container.appendChild(this.resultInput);
    container.innerHTML += `
      <label class="captcha-checkbox-label">
        <input type="checkbox" id="human-checkbox" onchange="window.captchaInstance.showCaptcha(this)">
        あなたは人間ですか？
      </label>
      <div id="captcha-content"></div>
    `;
    window.captchaInstance = this; 
    this.applyStyles();
    return container;
  }


  showCaptcha(checkbox) {
    if (!checkbox.checked) {
      Check.human = null;
      this.resultInput.value = '';
      document.getElementById('captcha-content').innerHTML = '';
      return;
    }
    const randomIndex = Math.floor(Math.random() * this.config.length);
    const correctLabel = this.config[randomIndex].label;
    document.getElementById('captcha-content').innerHTML = `
      <p>「${correctLabel}」の画像を選んでください</p>
      <div id="captcha-images">
        ${this.config
          .sort(() => Math.random() - 0.5)
          .map(item => `
            <img src="${item.url}" data-label="${item.label}" onclick="window.captchaInstance.selectImage(this)">
          `).join('')}
      </div>
      <div id="captcha-message"></div>
      <button type="button" onclick="window.captchaInstance.verify()">確認</button>
    `;
    this.messageDiv = document.getElementById('captcha-message');
  }

 
  selectImage(img) {
    document.querySelectorAll('#captcha-images img').forEach(i => i.classList.remove('selected'));
    img.classList.add('selected');
  }

 
  verify() {
    this.showProcessing();
    setTimeout(() => {
      this.hideProcessing();
      const selectedImg = document.querySelector('#captcha-images img.selected');
      if (!selectedImg) {
        this.messageDiv.innerHTML = '<p class="error">画像を選択してください！</p>';
        Check.human = null;
        return;
      }
      const selectedLabel = selectedImg.getAttribute('data-label');
      const correct = this.config.find(item => item.isCorrect && item.label === selectedLabel);
      if (correct) {
        this.messageDiv.innerHTML = '<p class="success">認証成功！</p>';
        this.resultInput.value = 'passed';
        Check.human = true;
      } else {
        this.messageDiv.innerHTML = '<p class="error">間違っています。もう一度試してください。</p>';
        this.resultInput.value = '';
        Check.human = false;
        this.showCaptcha({ checked: true });
      }
    }, 1000); 
  }


  showProcessing() {
    this.processingOverlay.style.display = 'block';
  }

  hideProcessing() {
    this.processingOverlay.style.display = 'none';
  }


  applyStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      #captcha-container { max-width: 300px; margin: 20px; font-family: Arial, sans-serif; }
      .captcha-checkbox-label {
        display: flex;
        align-items: center;
        font-size: 16px;
        cursor: pointer;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        background: #f9f9f9;
        transition: background 0.3s;
      }
      .captcha-checkbox-label:hover { background: #e0e0e0; }
      .captcha-checkbox-label input[type="checkbox"] {
        width: 20px;
        height: 20px;
        margin-right: 10px;
        accent-color: #4CAF50;
      }
      #captcha-content { margin-top: 10px; }
      #captcha-images img { width: 100px; margin: 10px; cursor: pointer; }
      #captcha-images img.selected { border: 2px solid #4CAF50; }
      #captcha-message { margin: 10px 0; }
      .error { color: #D32F2F; }
      .success { color: #4CAF50; }
      #captcha-processing {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        font-size: 24px;
        text-align: center;
        line-height: 100vh;
        z-index: 1000;
      }
      button {
        padding: 8px 16px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background 0.3s;
      }
      button:hover { background: #45a049; }
    `;
    document.head.appendChild(style);
  }
}
