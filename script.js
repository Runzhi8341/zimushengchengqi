const elements = {
  imageInput: document.getElementById("imageInput"),
  fileName: document.getElementById("fileName"),
  lineHeight: document.getElementById("lineHeight"),
  fontSize: document.getElementById("fontSize"),
  textColor: document.getElementById("textColor"),
  textColorText: document.getElementById("textColorText"),
  strokeColor: document.getElementById("strokeColor"),
  strokeColorText: document.getElementById("strokeColorText"),
  barColor: document.getElementById("barColor"),
  barColorText: document.getElementById("barColorText"),
  barOpacity: document.getElementById("barOpacity"),
  fontFamily: document.getElementById("fontFamily"),
  fontWeight: document.getElementById("fontWeight"),
  subtitleText: document.getElementById("subtitleText"),
  generateButton: document.getElementById("generateButton"),
  saveButton: document.getElementById("saveButton"),
  statusMessage: document.getElementById("statusMessage"),
  previewMeta: document.getElementById("previewMeta"),
  previewCanvas: document.getElementById("previewCanvas"),
  emptyPreview: document.getElementById("emptyPreview")
};

const previewContext = elements.previewCanvas.getContext("2d");
const imageState = {
  source: null,
  fileName: "",
  objectUrl: "",
  hasGenerated: false
};

const numericRanges = {
  lineHeight: { min: 40, max: 160, fallback: 80 },
  fontSize: { min: 20, max: 96, fallback: 40 },
  barOpacity: { min: 0, max: 100, fallback: 55 }
};

function clampNumber(value, { min, max, fallback }) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numericValue));
}

function normalizeHexColor(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(trimmedValue)) {
    return trimmedValue.toUpperCase();
  }

  return fallback;
}

function syncColorInputs(colorInput, textInput, fallback) {
  const normalized = normalizeHexColor(textInput.value || colorInput.value, fallback);
  colorInput.value = normalized;
  textInput.value = normalized;
}

function rgbaFromHex(hex, opacityPercent) {
  const normalized = normalizeHexColor(hex, "#000000");
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  const alpha = clampNumber(opacityPercent, numericRanges.barOpacity) / 100;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function drawSubtitleStrip(stripY, stripHeight, canvasWidth, settings) {
  previewContext.fillStyle = rgbaFromHex(settings.barColor, settings.barOpacity);
  previewContext.fillRect(0, stripY, canvasWidth, stripHeight);

  const topGlow = previewContext.createLinearGradient(0, stripY, 0, stripY + Math.max(10, stripHeight * 0.24));
  topGlow.addColorStop(0, "rgba(255, 255, 255, 0.26)");
  topGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
  previewContext.fillStyle = topGlow;
  previewContext.fillRect(0, stripY, canvasWidth, Math.max(10, stripHeight * 0.24));

  const bottomShade = previewContext.createLinearGradient(0, stripY + stripHeight * 0.72, 0, stripY + stripHeight);
  bottomShade.addColorStop(0, "rgba(0, 0, 0, 0)");
  bottomShade.addColorStop(1, "rgba(0, 0, 0, 0.28)");
  previewContext.fillStyle = bottomShade;
  previewContext.fillRect(0, stripY + stripHeight * 0.72, canvasWidth, stripHeight * 0.28);

  previewContext.fillStyle = "rgba(255, 255, 255, 0.32)";
  previewContext.fillRect(0, stripY, canvasWidth, 1);

  previewContext.fillStyle = "rgba(0, 0, 0, 0.38)";
  previewContext.fillRect(0, stripY + stripHeight - 1, canvasWidth, 1);
}

function getSubtitleLines() {
  return elements.subtitleText.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function setStatus(message, tone = "success") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.remove("is-warning", "is-error");

  if (tone === "warning") {
    elements.statusMessage.classList.add("is-warning");
  }

  if (tone === "error") {
    elements.statusMessage.classList.add("is-error");
  }
}

function updateActionState() {
  const hasImage = Boolean(imageState.source);
  elements.generateButton.disabled = !hasImage;
  elements.saveButton.disabled = !hasImage || !imageState.hasGenerated;
}

function showCanvas() {
  elements.previewCanvas.style.display = "block";
  elements.emptyPreview.style.display = "none";
}

function showEmptyState() {
  elements.previewCanvas.style.display = "none";
  elements.emptyPreview.style.display = "flex";
}

function fitLineText(text, maxWidth, settings) {
  let activeSize = settings.fontSize;
  previewContext.font = `${settings.fontWeight} ${activeSize}px ${settings.fontFamily}`;

  while (previewContext.measureText(text).width > maxWidth && activeSize > 18) {
    activeSize -= 1;
    previewContext.font = `${settings.fontWeight} ${activeSize}px ${settings.fontFamily}`;
  }

  let displayText = text;

  if (previewContext.measureText(displayText).width > maxWidth) {
    while (displayText.length > 1 && previewContext.measureText(`${displayText}…`).width > maxWidth) {
      displayText = displayText.slice(0, -1);
    }
    displayText = `${displayText}…`;
  }

  return {
    fontSize: activeSize,
    text: displayText
  };
}

function readSettings() {
  const lineHeight = clampNumber(elements.lineHeight.value, numericRanges.lineHeight);
  const fontSize = clampNumber(elements.fontSize.value, numericRanges.fontSize);
  const barOpacity = clampNumber(elements.barOpacity.value, numericRanges.barOpacity);
  const textColor = normalizeHexColor(elements.textColorText.value || elements.textColor.value, "#FFFFFF");
  const strokeColor = normalizeHexColor(elements.strokeColorText.value || elements.strokeColor.value, "#000000");
  const barColor = normalizeHexColor(elements.barColorText.value || elements.barColor.value, "#000000");

  elements.lineHeight.value = String(lineHeight);
  elements.fontSize.value = String(fontSize);
  elements.barOpacity.value = String(barOpacity);
  elements.textColor.value = textColor;
  elements.textColorText.value = textColor;
  elements.strokeColor.value = strokeColor;
  elements.strokeColorText.value = strokeColor;
  elements.barColor.value = barColor;
  elements.barColorText.value = barColor;

  return {
    lineHeight,
    fontSize,
    barOpacity,
    textColor,
    strokeColor,
    barColor,
    fontFamily: elements.fontFamily.value,
    fontWeight: elements.fontWeight.value
  };
}

function drawPreview() {
  if (!imageState.source) {
    showEmptyState();
    imageState.hasGenerated = false;
    updateActionState();
    return;
  }

  const settings = readSettings();
  const lines = getSubtitleLines();
  const image = imageState.source;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  elements.previewCanvas.width = width;
  elements.previewCanvas.height = height;

  previewContext.clearRect(0, 0, width, height);
  previewContext.drawImage(image, 0, 0, width, height);

  const effectiveLines = lines.slice(0, Math.max(1, Math.floor(height / settings.lineHeight)));
  const textMaxWidth = width - 48;
  const layoutLineCount = Math.max(effectiveLines.length, 1);
  const splitGap = Math.max(4, Math.round(settings.lineHeight * 0.08));
  const reservedSlots = 4;
  const preferredRegionHeight =
    settings.lineHeight * reservedSlots +
    splitGap * Math.max(reservedSlots - 1, 0) +
    Math.round(settings.lineHeight * 0.35);
  const subtitleRegionHeight = Math.min(Math.max(preferredRegionHeight, 96), Math.round(height * 0.62));
  const startY = Math.max(0, height - subtitleRegionHeight);
  const totalGapHeight = splitGap * Math.max(layoutLineCount - 1, 0);
  const stripHeight = Math.max(18, Math.floor((subtitleRegionHeight - totalGapHeight) / layoutLineCount));
  const occupiedHeight = stripHeight * layoutLineCount + totalGapHeight;
  const topInset = Math.max(0, Math.floor((subtitleRegionHeight - occupiedHeight) / 2));

  previewContext.textAlign = "center";
  previewContext.textBaseline = "middle";
  previewContext.fillStyle = settings.textColor;
  previewContext.strokeStyle = settings.strokeColor;
  previewContext.lineJoin = "round";

  effectiveLines.forEach((line, index) => {
    const stripY = startY + topInset + index * (stripHeight + splitGap);

    drawSubtitleStrip(stripY, stripHeight, width, settings);

    const fitted = fitLineText(line, textMaxWidth, settings);
    previewContext.font = `${settings.fontWeight} ${fitted.fontSize}px ${settings.fontFamily}`;
    previewContext.lineWidth = Math.max(2, fitted.fontSize * 0.1);
    previewContext.strokeStyle = settings.strokeColor;
    previewContext.strokeText(fitted.text, width / 2, stripY + stripHeight / 2);
    previewContext.fillStyle = settings.textColor;
    previewContext.fillText(fitted.text, width / 2, stripY + stripHeight / 2);
  });

  showCanvas();
  imageState.hasGenerated = true;
  updateActionState();

  const hiddenLineCount = Math.max(0, lines.length - effectiveLines.length);

  if (hiddenLineCount > 0) {
    setStatus(`已生成预览，但有 ${hiddenLineCount} 行字幕因空间不足未显示`, "warning");
  } else if (lines.length === 0) {
    setStatus("已生成图片，当前未输入字幕内容");
  } else {
    setStatus("字幕图片生成成功！");
  }

  elements.previewMeta.textContent = `${width} × ${height} · ${effectiveLines.length} 行字幕`;
}

function triggerPreview() {
  if (imageState.source) {
    drawPreview();
  }
}

function handleImageUpload(file) {
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setStatus("请选择有效的图片文件", "error");
    return;
  }

  if (file.size > 15 * 1024 * 1024) {
    setStatus("图片大小不能超过 15MB", "error");
    return;
  }

  if (imageState.objectUrl) {
    URL.revokeObjectURL(imageState.objectUrl);
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    imageState.source = image;
    imageState.fileName = file.name;
    imageState.objectUrl = objectUrl;
    imageState.hasGenerated = false;
    elements.fileName.textContent = file.name;
    elements.previewMeta.textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
    updateActionState();
    drawPreview();
  };

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    setStatus("图片读取失败，请重新选择", "error");
  };

  image.src = objectUrl;
}

function downloadResult() {
  if (!imageState.hasGenerated || !imageState.source) {
    setStatus("请先生成图片后再保存", "warning");
    return;
  }

  const link = document.createElement("a");
  const sourceName = imageState.fileName.replace(/\.[^.]+$/, "") || "subtitle-image";
  link.download = `${sourceName}-subtitle.png`;
  link.href = elements.previewCanvas.toDataURL("image/png");
  link.click();
  setStatus("图片已保存到本地");
}

function bindColorPair(colorInput, textInput, fallback) {
  colorInput.addEventListener("input", () => {
    textInput.value = colorInput.value.toUpperCase();
    triggerPreview();
  });

  textInput.addEventListener("change", () => {
    syncColorInputs(colorInput, textInput, fallback);
    triggerPreview();
  });
}

elements.imageInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  handleImageUpload(file);
});

elements.generateButton.addEventListener("click", drawPreview);
elements.saveButton.addEventListener("click", downloadResult);

[
  elements.lineHeight,
  elements.fontSize,
  elements.barOpacity,
  elements.fontFamily,
  elements.fontWeight,
  elements.subtitleText
].forEach((input) => {
  input.addEventListener("input", triggerPreview);
  input.addEventListener("change", triggerPreview);
});

bindColorPair(elements.textColor, elements.textColorText, "#FFFFFF");
bindColorPair(elements.strokeColor, elements.strokeColorText, "#000000");
bindColorPair(elements.barColor, elements.barColorText, "#000000");

window.addEventListener("beforeunload", () => {
  if (imageState.objectUrl) {
    URL.revokeObjectURL(imageState.objectUrl);
  }
});

updateActionState();
showEmptyState();
