class HandBrightnessController {
  constructor() {
    this.video = document.getElementById("video");
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.ui = {
      cameraDot: document.getElementById("cameraDot"),
      cameraStatus: document.getElementById("cameraStatus"),
      gestureChip: document.getElementById("gestureChip"),
      turnChip: document.getElementById("turnChip"),
      brightnessValue: document.getElementById("brightnessValue"),
      brightnessText: document.getElementById("brightnessText"),
      brightnessFill: document.getElementById("brightnessFill"),
      angleValue: document.getElementById("angleValue"),
      deltaValue: document.getElementById("deltaValue"),
      directionValue: document.getElementById("directionValue"),
      pinchValue: document.getElementById("pinchValue"),
      stateBadge: document.getElementById("stateBadge"),
      bulbCaption: document.getElementById("bulbCaption"),
      bulb: document.getElementById("bulb"),
      bulbGlow: document.getElementById("bulbGlow"),
      roomLight: document.getElementById("roomLight"),
    };

    this.brightness = 50;
    this.prevAngle = null;
    this.smoothedAngle = null;
    this.currentAngle = 0;
    this.currentDelta = 0;
    this.direction = "—";

    this.pinchThreshold = 0.055;
    this.rotationDeadzone = 1.2;
    this.rotationSensitivity = 0.85;

    this.resizeCanvas = this.resizeCanvas.bind(this);
    window.addEventListener("resize", this.resizeCanvas);

    this.setupHands();
    this.startCamera();
    this.updateUI(false, false);
    this.applyDOMBrightness();
  }

  setupHands() {
    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.65,
    });

    this.hands.onResults((results) => this.onResults(results));
  }

  startCamera() {
    const camera = new Camera(this.video, {
      onFrame: async () => {
        await this.hands.send({ image: this.video });
      },
      width: 1280,
      height: 720,
    });

    this.video.addEventListener("loadedmetadata", () => {
      this.resizeCanvas();
    });

    camera.start()
      .then(() => {
        this.ui.cameraDot.classList.add("live");
        this.ui.cameraStatus.textContent = "Camera live";
      })
      .catch((err) => {
        console.error(err);
        this.ui.cameraStatus.textContent = "Camera failed";
      });
  }

  resizeCanvas() {
    const rect = this.video.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  getHandCenter(landmarks) {
    const sum = landmarks.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    return {
      x: sum.x / landmarks.length,
      y: sum.y / landmarks.length,
    };
  }

  getPinchAmount(landmarks) {
    return this.distance(landmarks[4], landmarks[8]);
  }

  isPinching(landmarks) {
    return this.getPinchAmount(landmarks) < this.pinchThreshold;
  }

  getRotationAngle(landmarks) {
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];
    const dx = middleMCP.x - wrist.x;
    const dy = middleMCP.y - wrist.y;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  normalizeAngleDiff(diff) {
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
  }

  smoothAngle(angle) {
    if (this.smoothedAngle === null) {
      this.smoothedAngle = angle;
      return angle;
    }

    const diff = this.normalizeAngleDiff(angle - this.smoothedAngle);
    this.smoothedAngle = this.smoothedAngle + diff * 0.35;
    return this.smoothedAngle;
  }

  applyRotation(angle, pinching) {
    const smooth = this.smoothAngle(angle);
    this.currentAngle = smooth;

    if (this.prevAngle === null) {
      this.prevAngle = smooth;
      this.currentDelta = 0;
      return;
    }

    let diff = this.normalizeAngleDiff(smooth - this.prevAngle);

    if (Math.abs(diff) < this.rotationDeadzone) {
      diff = 0;
    }

    this.currentDelta = diff;

    if (pinching && diff !== 0) {
      this.brightness -= diff * this.rotationSensitivity;
      this.brightness = Math.max(0, Math.min(100, this.brightness));
    }

    this.prevAngle = smooth;
  }

  applyDOMBrightness() {
    const b = this.brightness;
    const glow = Math.max(0.08, b / 100);
    const roomOpacity = 0.04 + glow * 0.34;

    document.documentElement.style.setProperty("--brightness", b);
    document.documentElement.style.setProperty("--bulb-glow", glow.toFixed(3));
    document.documentElement.style.setProperty("--room-opacity", roomOpacity.toFixed(3));

    if (b < 20) {
      document.documentElement.style.setProperty("--bulb-core", "hsl(38 100% 58%)");
      document.documentElement.style.setProperty("--bulb-glass", "hsl(42 80% 72%)");
      this.ui.bulbCaption.textContent = "Lamp output: dim";
    } else if (b < 50) {
      document.documentElement.style.setProperty("--bulb-core", "hsl(41 100% 62%)");
      document.documentElement.style.setProperty("--bulb-glass", "hsl(46 100% 78%)");
      this.ui.bulbCaption.textContent = "Lamp output: soft";
    } else if (b < 80) {
      document.documentElement.style.setProperty("--bulb-core", "hsl(43 100% 66%)");
      document.documentElement.style.setProperty("--bulb-glass", "hsl(48 100% 82%)");
      this.ui.bulbCaption.textContent = "Lamp output: balanced";
    } else {
      document.documentElement.style.setProperty("--bulb-core", "hsl(47 100% 72%)");
      document.documentElement.style.setProperty("--bulb-glass", "hsl(51 100% 86%)");
      this.ui.bulbCaption.textContent = "Lamp output: intense";
    }

    const scale = 1 + (b / 100) * 0.03;
    this.ui.bulb.style.transform = `scale(${scale})`;
  }

  drawKnobHUD(width, height) {
    const panelW = 190;
    const panelH = 190;
    const x = width - panelW - 20;
    const y = height - panelH - 20;
    const cx = x + panelW / 2;
    const cy = y + panelH / 2;
    const r = 62;

    this.ctx.save();

    this.roundRect(x, y, panelW, panelH, 20);
    this.ctx.fillStyle = "rgba(5, 12, 22, 0.55)";
    this.ctx.fill();
    this.ctx.strokeStyle = "rgba(87, 180, 255, 0.2)";
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.strokeStyle = "rgba(255,255,255,0.12)";
    this.ctx.lineWidth = 10;
    this.ctx.stroke();

    const start = -Math.PI / 2;
    const end = start + (this.brightness / 100) * Math.PI * 2;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, start, end);
    this.ctx.strokeStyle = "rgba(126,247,210,0.95)";
    this.ctx.lineWidth = 10;
    this.ctx.lineCap = "round";
    this.ctx.stroke();

    const ang = (this.currentAngle * Math.PI) / 180;
    const ix = cx + Math.cos(ang) * (r - 12);
    const iy = cy + Math.sin(ang) * (r - 12);

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(ix, iy);
    this.ctx.strokeStyle = "rgba(87,180,255,1)";
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = "rgba(87,180,255,1)";
    this.ctx.fill();

    this.ctx.fillStyle = "rgba(234,242,255,0.95)";
    this.ctx.font = "700 28px Inter, sans-serif";
    this.ctx.textAlign = "center";
    this.drawUnmirroredText(
      `${Math.round(this.brightness)}%`,
      cx,
      y + 38,
      (text, tx, ty) => this.ctx.fillText(text, tx, ty)
    );

    this.ctx.fillStyle = "rgba(147,164,191,0.95)";
    this.ctx.font = "600 12px Inter, sans-serif";
    this.ctx.textAlign = "center";
    this.drawUnmirroredText(
      "CONTROL",
      cx,
      y + 56,
      (text, tx, ty) => this.ctx.fillText(text, tx, ty)
    );

    this.ctx.restore();
  }

  drawHandFeedback(landmarks, pinching) {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const center = this.getHandCenter(landmarks);
    const cx = center.x * width;
    const cy = center.y * height;

    drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
      color: pinching ? "#7ef7d2" : "#57b4ff",
      lineWidth: 3,
    });

    drawLandmarks(this.ctx, landmarks, {
      color: "#d9ecff",
      fillColor: pinching ? "#7ef7d2" : "#57b4ff",
      radius: 4,
    });

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, pinching ? 42 : 30, 0, Math.PI * 2);
    this.ctx.strokeStyle = pinching
      ? "rgba(126,247,210,0.95)"
      : "rgba(255,255,255,0.3)";
    this.ctx.lineWidth = pinching ? 4 : 2;
    this.ctx.stroke();

    const thumb = landmarks[4];
    const index = landmarks[8];
    this.ctx.beginPath();
    this.ctx.moveTo(thumb.x * width, thumb.y * height);
    this.ctx.lineTo(index.x * width, index.y * height);
    this.ctx.strokeStyle = pinching
      ? "rgba(255, 189, 89, 0.95)"
      : "rgba(255,255,255,0.18)";
    this.ctx.lineWidth = pinching ? 4 : 2;
    this.ctx.stroke();

    if (pinching && this.direction !== "—") {
      this.ctx.fillStyle = "rgba(5, 12, 22, 0.84)";
      this.roundRect(cx - 38, cy - 74, 76, 30, 12);
      this.ctx.fill();

      this.ctx.strokeStyle = "rgba(126,247,210,0.4)";
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      this.ctx.fillStyle = "#eaf2ff";
      this.ctx.font = "700 13px Inter, sans-serif";
      this.ctx.textAlign = "center";
      this.drawUnmirroredText(
        this.direction,
        cx,
        cy - 54,
        (text, tx, ty) => this.ctx.fillText(text, tx, ty)
      );
    }
  }

  drawStatusText(foundHand, pinching) {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(255,255,255,0.92)";
    this.ctx.font = "600 14px Inter, sans-serif";
    this.ctx.textAlign = "left";

    let text = "Show your hand";
    if (foundHand && !pinching) text = "Pinch thumb + index to grab";
    if (foundHand && pinching) text = "Rotate hand while pinching";

    this.drawUnmirroredText(
      text,
      18,
      this.canvas.clientHeight - 20,
      (label, tx, ty) => this.ctx.fillText(label, tx, ty)
    );

    this.ctx.restore();
  }

  roundRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.arcTo(x + w, y, x + w, y + h, r);
    this.ctx.arcTo(x + w, y + h, x, y + h, r);
    this.ctx.arcTo(x, y + h, x, y, r);
    this.ctx.arcTo(x, y, x + w, y, r);
    this.ctx.closePath();
  }

  drawUnmirroredText(text, x, y, drawFn) {
    this.ctx.save();
    this.ctx.translate(this.canvas.clientWidth, 0);
    this.ctx.scale(-1, 1);
    drawFn(text, this.canvas.clientWidth - x, y);
    this.ctx.restore();
  }

  updateUI(foundHand, pinching) {
    const b = Math.round(this.brightness);

    this.ui.brightnessValue.textContent = b;
    this.ui.brightnessFill.style.width = `${b}%`;
    this.ui.angleValue.textContent = `${Math.round(this.currentAngle)}°`;
    this.ui.deltaValue.textContent = this.currentDelta.toFixed(1);
    this.ui.directionValue.textContent = this.direction;
    this.ui.pinchValue.textContent = pinching ? "Yes" : "No";

    if (b < 25) this.ui.brightnessText.textContent = "Low output";
    else if (b < 60) this.ui.brightnessText.textContent = "Balanced output";
    else if (b < 85) this.ui.brightnessText.textContent = "Bright output";
    else this.ui.brightnessText.textContent = "Maximum output";

    if (!foundHand) {
      this.ui.gestureChip.textContent = "Gesture: searching for hand";
      this.ui.turnChip.textContent = "Turn: —";
      this.ui.stateBadge.textContent = "Idle · no hand detected";
      this.ui.stateBadge.className = "state idle";
      return;
    }

    this.ui.gestureChip.textContent = pinching
      ? "Gesture: grabbed"
      : "Gesture: hand detected";

    this.ui.turnChip.textContent =
      this.direction === "—" ? "Turn: stable" : `Turn: ${this.direction}`;

    if (pinching) {
      this.ui.stateBadge.textContent = "Active · adjusting brightness";
      this.ui.stateBadge.className = "state active";
    } else {
      this.ui.stateBadge.textContent = "Idle · waiting for pinch";
      this.ui.stateBadge.className = "state idle";
    }
  }

  onResults(results) {
    this.resizeCanvas();
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.ctx.clearRect(0, 0, width, height);

    const hands = results.multiHandLandmarks || [];
    const foundHand = hands.length > 0;

    let pinching = false;

    if (foundHand) {
      const landmarks = hands[0];
      pinching = this.isPinching(landmarks);

      const angle = this.getRotationAngle(landmarks);
      this.applyRotation(angle, pinching);

      if (this.currentDelta > this.rotationDeadzone) this.direction = "CCW";
      else if (this.currentDelta < -this.rotationDeadzone) this.direction = "CW";
      else this.direction = "—";

      this.drawHandFeedback(landmarks, pinching);
    } else {
      this.prevAngle = null;
      this.smoothedAngle = null;
      this.currentDelta = 0;
      this.direction = "—";
    }

    this.drawKnobHUD(width, height);
    this.drawStatusText(foundHand, pinching);
    this.updateUI(foundHand, pinching);
    this.applyDOMBrightness();
  }
}

window.addEventListener("load", () => {
  new HandBrightnessController();
});
