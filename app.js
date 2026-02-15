(function () {
  "use strict";

  const DIM = 240;
  const CARD_PORTRAIT_SIZE = 150;

  const userNameInput = document.getElementById("userName");
  const blessingSelect = document.getElementById("blessing");
  const previewText = document.getElementById("previewText");
  const previewBlessing = document.getElementById("previewBlessing");
  const uploadZone = document.getElementById("uploadZone");
  const photoInput = document.getElementById("photoInput");
  const uploadPlaceholder = document.getElementById("uploadPlaceholder");
  const cropArea = document.getElementById("cropArea");
  const cropImage = document.getElementById("cropImage");
  const scaleSlider = document.getElementById("scaleSlider");
  const scaleValue = document.getElementById("scaleValue");
  const confirmCropBtn = document.getElementById("confirmCrop");
  const cardBlessingText = document.getElementById("cardBlessingText");
  const cardPortrait = document.getElementById("cardPortrait");
  const portraitCanvas = document.getElementById("portraitCanvas");
  const headwear = document.getElementById("headwear");
  const cardBlessingBig = document.getElementById("cardBlessingBig");
  const generateCardBtn = document.getElementById("generateCard");
  const downloadCardBtn = document.getElementById("downloadCard");
  const card = document.getElementById("card");

  let currentImage = null;
  let cropScale = 1;
  let cropOffsetX = 0;
  let cropOffsetY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartOffsetX = 0;
  let dragStartOffsetY = 0;
  let croppedImageData = null;

  function updatePreview() {
    const name = (userNameInput.value || "").trim() || "xxx";
    const blessing = blessingSelect.value;
    previewText.textContent = name;
    previewBlessing.textContent = blessing;
  }

  userNameInput.addEventListener("input", updatePreview);
  userNameInput.addEventListener("change", updatePreview);
  blessingSelect.addEventListener("change", function () {
    previewBlessing.textContent = blessingSelect.value;
    if (cardBlessingText) {
      const name = (userNameInput.value || "").trim() || "好友";
      cardBlessingText.textContent = `${name}祝你新年${blessingSelect.value}`;
    }
    if (cardBlessingBig) cardBlessingBig.textContent = blessingSelect.value;
  });
  updatePreview();

  function showCropUI(file) {
    const url = URL.createObjectURL(file);
    cropImage.src = url;
    cropImage.onload = function () {
      URL.revokeObjectURL(url);
      cropScale = 1;
      cropOffsetX = 0;
      cropOffsetY = 0;
      scaleSlider.value = 100;
      scaleValue.textContent = 100;
      applyCropTransform();
      uploadPlaceholder.classList.add("hidden");
      cropArea.classList.remove("hidden");
      currentImage = cropImage;
    };
  }

  function applyCropTransform() {
    const s = cropScale;
    const x = cropOffsetX;
    const y = cropOffsetY;
    cropImage.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${s})`;
  }

  uploadZone.addEventListener("click", function (e) {
    if (e.target === photoInput) return;
    if (uploadPlaceholder.classList.contains("hidden")) return;
    photoInput.click();
  });

  uploadZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    uploadZone.classList.add("dragover");
  });

  uploadZone.addEventListener("dragleave", function () {
    uploadZone.classList.remove("dragover");
  });

  uploadZone.addEventListener("drop", function (e) {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) showCropUI(file);
  });

  photoInput.addEventListener("change", function () {
    const file = photoInput.files[0];
    if (file) showCropUI(file);
  });

  scaleSlider.addEventListener("input", function () {
    cropScale = this.value / 100;
    scaleValue.textContent = this.value;
    applyCropTransform();
  });

  function startDrag(clientX, clientY) {
    isDragging = true;
    dragStartX = clientX;
    dragStartY = clientY;
    dragStartOffsetX = cropOffsetX;
    dragStartOffsetY = cropOffsetY;
  }

  function moveDrag(clientX, clientY) {
    if (!isDragging) return;
    cropOffsetX = dragStartOffsetX + (clientX - dragStartX);
    cropOffsetY = dragStartOffsetY + (clientY - dragStartY);
    applyCropTransform();
  }

  function endDrag() {
    isDragging = false;
  }

  const cropWrapperEl = document.getElementById("cropWrapper");
  cropWrapperEl.addEventListener("mousedown", function (e) {
    if (e.target.id === "scaleSlider" || e.target.closest(".crop-controls")) return;
    if (e.button !== 0) return;
    startDrag(e.clientX, e.clientY);
  });
  cropWrapperEl.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  window.addEventListener("mousemove", function (e) {
    moveDrag(e.clientX, e.clientY);
  });
  window.addEventListener("touchmove", function (e) {
    if (isDragging && e.touches.length === 1) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener("mouseup", endDrag);
  window.addEventListener("touchend", endDrag);
  window.addEventListener("touchcancel", endDrag);

  function beautifyImageData(imageData) {
    const data = imageData.data;
    const len = data.length;
    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      const brightness = 1.08;
      const contrast = 1.05;
      const warmth = 1.02;
      r = Math.min(255, ((r / 255 - 0.5) * contrast + 0.5) * 255 * brightness * warmth);
      g = Math.min(255, ((g / 255 - 0.5) * contrast + 0.5) * 255 * brightness);
      b = Math.min(255, ((b / 255 - 0.5) * contrast + 0.5) * 255 * brightness / warmth);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
    return imageData;
  }

  function drawCircleToCanvas(sourceImg, destCanvas, size) {
    const s = size;
    destCanvas.width = s;
    destCanvas.height = s;
    const ctx = destCanvas.getContext("2d");
    const scale = cropScale;
    const half = DIM / 2;
    const imgW = sourceImg.naturalWidth;
    const imgH = sourceImg.naturalHeight;
    const imgAspect = imgW / imgH;
    let drawW = DIM;
    let drawH = DIM;
    if (imgAspect > 1) {
      drawW = DIM * imgAspect;
    } else {
      drawH = DIM / imgAspect;
    }
    const scaledW = drawW * scale;
    const scaledH = drawH * scale;
    const srcX = (-half - cropOffsetX + scaledW / 2) / scaledW * imgW;
    const srcY = (-half - cropOffsetY + scaledH / 2) / scaledH * imgH;
    const srcW = (DIM / scaledW) * imgW;
    const srcH = (DIM / scaledH) * imgH;

    ctx.save();
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(sourceImg, srcX, srcY, srcW, srcH, 0, 0, s, s);
    ctx.restore();

    const imageData = ctx.getImageData(0, 0, s, s);
    const beautified = beautifyImageData(imageData);
    ctx.putImageData(beautified, 0, 0);
  }

  confirmCropBtn.addEventListener("click", function () {
    if (!cropImage.src || !cropImage.complete) return;

    const tempCanvas = document.createElement("canvas");
    drawCircleToCanvas(cropImage, tempCanvas, 256);
    croppedImageData = tempCanvas;
    const ctx = portraitCanvas.getContext("2d");
    portraitCanvas.width = CARD_PORTRAIT_SIZE;
    portraitCanvas.height = CARD_PORTRAIT_SIZE;
    ctx.drawImage(tempCanvas, 0, 0, CARD_PORTRAIT_SIZE, CARD_PORTRAIT_SIZE);
    headwear.classList.add("visible");
    const name = (userNameInput.value || "").trim() || "好友";
    const blessing = blessingSelect.value;
    cardBlessingText.textContent = `${name}祝你新年${blessing}`;
    if (cardBlessingBig) cardBlessingBig.textContent = blessing;
    cropArea.classList.add("hidden");
    uploadPlaceholder.classList.remove("hidden");
    uploadPlaceholder.querySelector("span:last-of-type").textContent = "可重新上传更换照片";
    generateCardBtn.disabled = false;
    downloadCardBtn.disabled = false;
  });

  generateCardBtn.addEventListener("click", function () {
    if (croppedImageData) {
      const ctx = portraitCanvas.getContext("2d");
      portraitCanvas.width = CARD_PORTRAIT_SIZE;
      portraitCanvas.height = CARD_PORTRAIT_SIZE;
      ctx.drawImage(croppedImageData, 0, 0, CARD_PORTRAIT_SIZE, CARD_PORTRAIT_SIZE);
    }
    const name = (userNameInput.value || "").trim() || "好友";
    const blessing = blessingSelect.value;
    cardBlessingText.textContent = `${name}祝你新年${blessing}`;
    if (cardBlessingBig) cardBlessingBig.textContent = blessing;
    headwear.classList.add("visible");
  });

  function getCardBounds() {
    const rect = card.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: rect.top,
      left: rect.left
    };
  }

  downloadCardBtn.addEventListener("click", function () {
    const name = (userNameInput.value || "").trim() || "拜年卡片";
    const scale = 2;
    const w = 320 * scale;
    const h = 460 * scale;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#fce4ec");
    gradient.addColorStop(0.5, "#f8d7e4");
    gradient.addColorStop(1, "#f1b8cc");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(w * 0.3, h * 0.2, w * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(244, 194, 208, 0.4)";
    ctx.beginPath();
    ctx.arc(w * 0.75, h * 0.75, w * 0.3, 0, Math.PI * 2);
    ctx.fill();

    const padding = 28 * scale;
    const centerX = w / 2;
    ctx.fillStyle = "#8b4a5c";
    ctx.font = `bold ${22 * scale}px "ZCOOL KuaiLe", "Noto Serif SC", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const blessingLine = cardBlessingText.textContent;
    ctx.fillText(blessingLine, centerX, padding + 36 * scale, w - padding * 2);

    const portraitSize = 150 * scale;
    const portraitX = (w - portraitSize) / 2;
    const portraitY = padding + 56 * scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, portraitY + portraitSize / 2, portraitSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (croppedImageData) {
      ctx.drawImage(croppedImageData, portraitX, portraitY, portraitSize, portraitSize);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
    }
    ctx.restore();

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.arc(centerX, portraitY + portraitSize / 2, portraitSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    const bigBlessing = cardBlessingBig ? cardBlessingBig.textContent : blessingSelect.value;
    ctx.fillStyle = "#c41e3a";
    ctx.font = `800 ${32 * scale}px "ZCOOL KuaiLe", serif`;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3 * scale;
    ctx.strokeText(bigBlessing, centerX, portraitY + portraitSize + 38 * scale);
    ctx.fillText(bigBlessing, centerX, portraitY + portraitSize + 38 * scale);

    ctx.fillStyle = "#9a6b7a";
    ctx.font = `${16 * scale}px sans-serif`;
    ctx.strokeStyle = "transparent";
    ctx.fillText("新春快乐 · 马年吉祥", centerX, portraitY + portraitSize + 72 * scale);

    const link = document.createElement("a");
    link.download = `${name}-马年拜年卡片.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
})();
