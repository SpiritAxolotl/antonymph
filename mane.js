/*****************************************************************************\
| Hi, curious pony!                                                    [INFO] |
|                                                                             |
| This is the source code for the project.                                    |
| Yep, this is it, everything's in this one massive hand-coded file :P.       |
| It's very messy and silly, but it was fun to make it like this!             |
| You can feel free to use the code & *my* assets from this project.          |
|                                                                             |
| Anyways I want to let you know that this project was finished January 2024, |
| and it was developed on Windows 10 and macOS Sonoma with Chrome 121.        |
| I expect browser behavior to change in the future and possibly break some   |
| stuff here, so if you're here from the far future, that's the version to    |
| go for.                                                                     |
|                                                                             |
| Oh, and if you'd like to save this entire thing on your hard drive,         |
| https://lyra.horse/assets/antonymph_20240408.zip                         |
|                                                               ~ Lyra Rebane |
\*****************************************************************************/

const DEBUG_MODE = document.location.hash === "#D";
let debug_action_calls = 0;

const mainAudio = document.getElementById("mainAudio");
const background = document.getElementById("background");
const popupOverlay = document.getElementById("popupOverlay");
const introText = document.getElementById("introText");
const endText = document.getElementById("endText");
const emergencyText = document.getElementById("emergencyText");
const state = document.getElementById("state");

const introMusic = playAudio(`/assets/we worked so hard to leave equestria and now all i want is to go back.${"safari" in window ? "mp3" : "opus"}`);
const vyletIntro = new Audio("/assets/vylet_intro.mp3");
const hit = new Audio("/assets/hit.wav");

let popups = [];
let popupState = [];

// Settings
let allowUrlChanges = true;
let windowRateLimit = 3; // 0 = disabled; x+ = move windows after every x frames
let frameRateLimit = 0;  // 0 = disabled; 1 = 60/75fps; 2 = 30fps
let alternateNoteColors = false;
let rainbowNotes = false;
let textToSpeech = false; // use toggleTTS();
// setSpeed(1.32)
// setSpeed(0.78)

function settings() {
  document.querySelectorAll("script").forEach((script) => {
    if (script.innerText.includes("/ Settings")) {
      console.log(script.innerText.match(/\/\/ Settings.*?\n\n/gs)[0].replace(/  let /g, ''));
    }
  })
}

function help() {
  settings();
}

const platformFixes = {
  /* enable if cross-origin popups that navigate themselves steal focus (firefox) */
  "focusFix": false,
  /* enable if popups can't reliably determine the corner (firefox on macOS) */
  "buggyCorners": false,
  /* enable if platform doesn't support characters in system font (macOS) */
  "alternateArrows": false,
};

function applyFixes() {
  const browserType = getBrowserType();
  const isMac = navigator.userAgent.includes("Mac");
  if (browserType === "mobile")
    mobileMode();
  platformFixes.focusFix = browserType === "firefox";
  platformFixes.buggyCorners = browserType === "firefox" && isMac;
  platformFixes.alternateArrows = isMac;
  document.getElementById((browserType === "chrome" || browserType === "opera") ? "firefoxIsAwesome" : "chromiumIsLaggy").style.display = "none";
}

function getBrowserType() {
  if (/Android|iPhone|iPad|iPod|Windows Phone/.test(navigator.userAgent)) return "mobile";
  if (navigator.userAgent.indexOf(" OPR/") !== -1) return "opera"; // opera gx, still chrome but self-reports
  if (navigator.userAgent.indexOf("Chrome") !== -1) return "chrome";
  if (navigator.userAgent.indexOf("Firefox") !== -1) return "firefox";
  if ("safari" in window) return "safari";
  if (navigator.userAgent.indexOf("Safari") !== -1) return "safari";
  if (navigator.userAgent.indexOf("MSIE") !== -1) return "ie";
  return null;
}

/*
 * OFF_X and OFF_Y are the offsets I need to apply for
 * window contents to match the desired size on my
 * Windows 10 + Chrome combo. The platformOffset is
 * calculated for you automatically based on your own
 * system so that window content size will be consistent
 * regardless of OS/browser used.
 */
let platformOffset = [0, 0];
let platformCorner = [0, 0];
let screenSizes = {
  "avail": [1920, 1080],
  "full": [1920, 1080],
};
const OFF_X = 16;
const OFF_Y = 74;
let hasStarted = false;

// We run this preemptively for visual conherency, but we do the real check later
setLimitIfHighRefresh();

window.addEventListener("load", (event) => {
  applyFixes();
  mainAudio.preservesPitch = false;
  introMusic.preservesPitch = false;
  vyletIntro.preservesPitch = false;
  try {
    const volumeLevel = parseFloat(localStorage.getItem(`antonymph.settings.volume`) || "1");
    if (volumeLevel >= 0 && volumeLevel <= 1) {
      setVolume(volumeLevel);
      document.getElementById("volume").value = volumeLevel;
    }
  } catch {}
  if (DEBUG_MODE) {
    introMusic.src = "";
    popupOverlay.style.display = "none";
    popupsAllowed = true;
    document.getElementById("debug").style.display = "block";
    window.addEventListener("mousedown", (event) => {
      document.getElementById("debug").style.display = "block";
    });
    introText.style.display = "none";
    requestOffset();
    closePopups();
    hasStarted = true;
    popupOverlay.style.background = "none";
    setInterval(()=>{document.title = `[${debug_action_calls}/s] Antonymph`;debug_action_calls = 0}, 1000);
    return;
  }
  try {
    window.speechSynthesis.onvoiceschanged = setupTTS;
    setupTTS();
  } catch {}
  checkUnlocks();
  setCheckImage();
  setDisplaySizeString();
  popupOverlay.style.filter = "brightness(1)";
  popupCheck();
  setTimeout(()=>{
    window.addEventListener("focus", (event) => {
      if (!popupsAllowed) {
        popupCheck();
      }
    });
    window.addEventListener("click", (event) => {
      if (!popupsAllowed && (Date.now() - lastCheck > 50) && document.hasFocus()) {
        noPopups();
      }
    });
  });
  introMusic.loop = true;
});

function checkSettings() {
  windowRateLimit = parseInt(document.getElementById("limit-window").value);
  frameRateLimit = parseInt(document.getElementById("limit-fps").value);
  const showWarning = (windowRateLimit && frameRateLimit) && ((windowRateLimit !== 1) || (frameRateLimit !== 1));
  document.getElementById("limit-warn").style.display = showWarning ? "block" : "none";
}

function setSpeed(speed) {
  mainAudio.playbackRate = speed;
  vyletIntro.playbackRate = speed;
  introMusic.playbackRate = speed;
  unlockAchievement("nightcore");
}
function onSpeedChange() {
  setSpeed(document.getElementById("speed").value);
  vyletIntro.currentTime = 0;
  vyletIntro.play();
}
function setVolume(volume) {
  mainAudio.volume = textToSpeech ? volume*0.5 : volume;
  vyletIntro.volume = volume;
  introMusic.volume = volume;
}
function onVolumeChange() {
  const volumeLevel = document.getElementById("volume").value;
  localStorage.setItem(`antonymph.settings.volume`, volumeLevel);
  setVolume(volumeLevel);
  vyletIntro.currentTime = 0;
  vyletIntro.play();
}

function setDisplaySizeString() {
  if (hasStarted) return;
  const {width, height, availWidth, availHeight} = screen;
  if (Math.min(...platformCorner) < 0 || platformCorner[0] > (width-availWidth) || platformCorner[1] > (height-availHeight) || Math.min(window.screenTop, window.screenLeft, height - window.screenTop, width - window.screenLeft) < -400)
    displaySizeString = <span color="red">Try moving this window to your main monitor and refresh.</span>;
  else if (availWidth === 1920 && availHeight === 1080)
    displaySizeString.innerText = "Your current display is perfect!";
  else if (availWidth === 1920 && availHeight >= 1050 && availHeight <= 1200)
    displaySizeString.innerText = "Your current display is good!";
  else if (availWidth <= 2560 && availWidth >= 1650 && availHeight <= 1600 && availHeight >= 1000)
    displaySizeString.innerText = "Your current display will work!";
  else if (availWidth >= 2560 && availHeight >= 1600)
    displaySizeString.innerText = "Your current display is too big, but you can still use it.";
  else if (availWidth >= 1650 && availHeight >= 1000)
    displaySizeString.innerText = "Your display is weird, but it'll work.";
  else // if (availWidth <= 1650 && availHeight <= 1050)
    displaySizeString = <>
      <span color="red">
        Your current display is too small, you'll probably have a bad experience.
      </span>
      {window?.devicePixelRatio > 1 ? <>
        <br/>
        <span color="yellow">
          Your display is using scaling, check your settings for higher resolutions.
        </span>
      </> : <></>}
      {(width >= 1650 && height >= 1000) ? <>
        <br/>
        <span color="yellow">
          Your display seems big enough, but your taskbar/dock/menubar is taking up too much space.
        </span>
      </> : <></>}
    </>;
  if (window.innerWidth > (window.outerWidth + 16))
    displaySizeString += <>
      <br/>
      <span color="yellow">
        You seem to be using zoom, please use 100% (globally).
      </span>
    </>;
}

/************************************************/
/* DevTools doesn't let you see more than 10k   */
/* characters of JS code in the inspector. So   */
/* if it cuts off here for you, use either the  */
/* Sources tab in DevTools or just view-source. */
/* Spax fork update. Moved to a separate file!! */
/************************************************/

const navSound = new Audio("/assets/navigate.mp3");
window.addEventListener("click", (event) => playNavSound(0.5));
addEventListener("wheel", (event) => playNavSound(event.deltaY > 0 ? 2 : 4));
function playNavSound(baseRate, bypass) {
  if ((!popupsAllowed || hasStarted) && !bypass) return;
  try {
    navSound.preservesPitch = false;
    navSound.playbackRate = (Math.random()+baseRate)*mainAudio.playbackRate;
    navSound.currentTime = 0;
    navSound.play();
  } catch {}
}

let lastTouch = null;
let sliderClick = 0;
let firstAlpha = 0;
function mobileMode() {
  // This part was sort of added as an afterthough, so it's
  // just a glorified copy-paste of the iPhone I made for
  // the original experience, so it's not DRY at all.
  const mobileOverlay = document.getElementById("mobileOverlay");
  const mobileOverlayInner = document.getElementById("mobileOverlayInner");
  mobileOverlay.style.display = "block";
  introText.style.display = "none";
  popupOverlay.style.display = "none";
  
  const bypassMobile = document.getElementById("bypassMobile");
  bypassMobile.onclick = () => {
    mobileOverlay.style.display = "none";
    popupCheck();
    if (popupOverlay.style.opacity !== "0") {
      popupOverlay.style.display = "block";
    } else {
      introText.style.display = "block";
      introText.style.opacity = "1";
    }
  };
  
  const mobileSlide = document.getElementById("mobileSlide");
  const mobileSlideText = document.getElementById("mobileSlideText");
  const mobileNotification = document.getElementById("mobileNotification");
  mobileOverlay.onclick = (e) => {
    e.preventDefault();
    if (e?.target?.id !== "bypassMobile")
      document.body?.requestFullscreen?.();
    navigator?.vibrate?.(64);
    mobileNotification.style.left = "-4px";
    setTimeout(()=>mobileNotification.style.left = "4px", 32);
    setTimeout(()=>mobileNotification.style.left = "0", 64);
  }
  
  window.addEventListener("deviceorientation", (event) => {
    if (mobileOverlay.style.display !== "block" || hasStarted) return;
    //mobileNotification.innerText = [event.absolute, event.alpha, event.beta, event.gamma].map(e=>Math.floor(e)).join("\n");
    const angleX = -event.gamma;
    const angleY = -event.beta;
    if (firstAlpha === 0 && event.alpha !== 0)
      firstAlpha = event.alpha;
    //mobileOverlay.style.backgroundPositionX = `${50 - angleX/6}%`;
    mobileOverlay.style.backgroundPositionX = `calc(50% + ${angleX*1.5}px)`;
    mobileOverlay.style.backgroundPositionY = `${angleY*1.5}px`;
    document.getElementById("gps").style.transform = `scale(0.75) rotate(${event.alpha-firstAlpha}deg)`;
    //mobileOverlay.style.transform = `scale(1.25) rotateZ(${event.alpha}deg) scale(0.8)`;
    //mobileOverlayInner.style.transform = `rotateZ(${-event.alpha}deg)`;
    //mobileOverlayInner.style.transform = `rotateZ(${-event.alpha}deg) scale(0.8)`;
    mobileNotification.style.transform = `translate(${-angleX/(3*1.5)}px, ${Math.max(-22, -angleY/(3*1.5))}px)`;
    //mobileNotification.style.transform = `rotateZ(${event.alpha}deg) rotateX(${event.beta}deg) rotateY(${event.gamma}deg)`;
  }, true);
  
  mobileSlide.ontouchstart = (e) => {
    e.preventDefault();
    lastTouch = e.targetTouches[0];
  }
  mobileSlide.ontouchend = (e) => {
    e.preventDefault();
    const targetTouch = Array.from(e.changedTouches).find(t => t.identifier === lastTouch.identifier);
    if (targetTouch) {
      if (targetTouch.clientX - lastTouch.clientX > 200) {
        playNavSound(1, true);
        const videoUrl = "https://www.youtube.com/watch?v=RGMaINyM0ek";
        if (!window.open(videoUrl)) document.location.href = videoUrl;
      }
    };
    lastTouch = null;
    mobileSlide.style.transform = `translateX(0px)`;
    mobileSlideText.style.opacity = "1";
    sliderClick = 0;
  };
  mobileSlide.ontouchmove = (e) => {
    e.preventDefault();
    const targetTouch = Array.from(e.targetTouches).find(t => t.identifier === lastTouch.identifier);
    if (!targetTouch) return;
    
    const posX = Math.min(Math.max((targetTouch.clientX - lastTouch.clientX),0),204);
    try {
      if (posX !== sliderClick && posX === 204) {
        navigator?.vibrate?.(200);
        sliderClick = posX;
      }
      if (Math.abs(sliderClick - posX) > 10) {
        navigator?.vibrate?.(10 + posX/4);
        sliderClick = posX;
      }
    } catch (e) {}
    
    mobileSlide.style.transform = `translateX(${posX}px)`;
    mobileSlideText.style.opacity = Math.max(0, 1 - posX/100);
  };
  
  const updateMobileInfo = () => {
    if (mobileOverlay.style.display !== "block" || hasStarted) return;
    
    const date = getDate();
    document.getElementById('ios_tme').innerText = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
    document.getElementById('ios_dte').innerText = date.toLocaleDateString(undefined /*'en-US'*/, {weekday: 'long',month: 'long',day: 'numeric',});
    
    if ('getBattery' in navigator)
      navigator.getBattery().then((battery) => {
        document.querySelector('#ios_prc > p').innerText = Math.floor(battery.level*100) + '%';
        document.querySelector('#ios_ico').style.width = Math.floor(15*battery.level) + 'px'
        document.querySelector('#ios_ico').style.right = (22-Math.floor(15*battery.level)) + 'px'
      });
  };
  
  updateMobileInfo();
  setInterval(updateMobileInfo, 1000);
}

let screenSizeHasChanged = false;
window.onresize = () => {
  setDisplaySizeString();
  setTimeout(()=>setDisplaySizeString(), 2000);
  screenSizeHasChanged = true;
}
let windowPosLast = [window.screenTop, window.screenLeft];
let screenSizeDisplayActive = false;
let screenSizeInfoActive = false;
const displaySizeString = document.getElementById("displaySizeString");
const screenSizeCanvas = document.getElementById("screenSizeCanvas");
const screenSizeVisualization = document.getElementById("screenSizeVisualization");
const screenSizeContext = screenSizeCanvas.getContext("2d");
const funGlow = document.getElementById("funGlow");
screenSizeCanvas.onmousemove = (e) => {
  if (!screenSizeDisplayActive) return;
  const rect = e.target.getBoundingClientRect();
  const mX = (e.clientX - (rect.left + 8))/(rect.width - 16);
  const mY = (e.clientY - (rect.top + 8))/(rect.height - 16);
  funGlow.style.display = screenSizeInfoActive ? "block" : "none";
  funGlow.style.left = ((screen.width*mX - window.screenLeft - (OFF_X+platformOffset[0])/2) - 16) + "px";
  funGlow.style.top = ((screen.height*mY - window.screenTop - (OFF_Y+platformOffset[1])) - 16) + "px";
}
function toggleScreenSizeInfo() {
  screenSizeInfoActive = !screenSizeInfoActive;
}
function toggleScreenSizeDisplay() {
  screenSizeDisplayActive = !screenSizeDisplayActive;
  screenSizeCanvas.style.display = screenSizeDisplayActive ? "inline" : "none";
  screenSizeVisualization.style.display = screenSizeDisplayActive ? "inline" : "none";
  requestAnimationFrame(renderScreenSizePreview);
}
function renderScreenSizePreview() {
  if (!screenSizeDisplayActive || hasStarted) return;
  if (windowPosLast[0] !== window.screenTop || windowPosLast[1] !== window.screenLeft) {
    setDisplaySizeString();
    setTimeout(()=>setDisplaySizeString(), 2000);
    screenSizeHasChanged = true;
    windowPosLast = [window.screenTop, window.screenLeft];
  }
  
  const canvas = screenSizeCanvas;
  const ctx = screenSizeContext;
  ctx.fillStyle = "#FFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const padding = 16;
  const desiredSize = [1920, 1080];
  const screenSize = [screen.width, screen.height];
  const availSize = [screen.availWidth, screen.availHeight];
  const canvasSize = [canvas.width, canvas.height];
  
  const windowSize = [window.outerWidth, window.outerHeight];
  const windowInnerSize = [window.innerWidth, window.innerHeight];
  const windowPos = [window.screenLeft, window.screenTop];
  const windowOffset = windowPos.map((e,i)=>windowSize[i]+e*2-screenSize[i]);
  const windowInnerOffset = windowOffset.map((e,i)=>e+(i ? 1 : -1)*(windowSize[i]-windowInnerSize[i])+(i ? 0 : OFF_X + platformOffset[0]));
  
  const canvasScale = Math.min(...canvasSize.map((c,i) => (c-padding)/Math.max(desiredSize[i],screenSize[i])));
  
  const availOffset = platformCorner.map((e,i)=>screenSize[i]-availSize[i]-e*2);
  
  const tooSmall = availSize[0] < 1650 || availSize[1] < 1000;
  
  const elements = [
    [
      screenSize,
      (ctx, args) => {
        ctx.fillStyle = "#F5A9B8";
        ctx.fillRect(...args);
      },
      availOffset,
    ],
    [
      availSize,
      (ctx, args) => {
        ctx.fillStyle = "#5BCEFA";
        ctx.fillRect(...args);
        ctx.fillStyle = "#000";
        ctx.font = "bold 12px monospace";
        const textPos = args.slice(0,2).map((e,i)=>e+(args[i+2]/2));
        ctx.textAlign = "center";
        ctx.fillText("[INFO]", textPos[0], textPos[1] - 24 - 4);
        if (screenSizeHasChanged)
          ctx.fillText("position change detected, click to recalculate", textPos[0], textPos[1] + (tooSmall ? 36 : 24) + 4);
        textPos[0] += 20
        ctx.font = "12px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`Screen size (pink)`, textPos[0], textPos[1] - 12);
        ctx.fillText(`Available area (blue)`, textPos[0], textPos[1]);
        ctx.fillText(`Experience area (purp)`, textPos[0], textPos[1] + 12);
        if (tooSmall)
          ctx.fillText(`Minimum required (rose)`, textPos[0], textPos[1] + 24);
        ctx.textAlign = "left";
        ctx.fillText(`: ${screenSize[0]}x${screenSize[1]}${window?.devicePixelRatio !== 1 ? ` (${window?.devicePixelRatio}x scale)` : ""}`, textPos[0], textPos[1] - 12);
        ctx.fillText(`: ${availSize[0]}x${availSize[1]}`, textPos[0], textPos[1]);
        ctx.fillText(`: ${desiredSize[0]}x${desiredSize[1]}`, textPos[0], textPos[1] + 12);
        if (tooSmall)
          ctx.fillText(`: 1650x1000`, textPos[0], textPos[1] + 24);
      },
    ],
    [
      windowSize,
      (ctx, args) => {
        if (!screenSizeInfoActive) return;
        ctx.fillStyle = "#97007199";
        ctx.fillRect(...args);
      },
      windowOffset,
    ],
    [
      windowInnerSize,
      (ctx, args) => {
        if (!screenSizeInfoActive) return;
        ctx.fillStyle = "#59007199";
        ctx.fillRect(...args);
        
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 12px monospace";
        const textPos = args.slice(0,2).map((e,i)=>e+(args[i+2]/2));
        ctx.textAlign = "center";
        ctx.fillText("[WINDOW]", textPos[0], textPos[1] - 24 - 4);
        textPos[0] += 20
        ctx.font = "12px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`Window size (outer)`, textPos[0], textPos[1] - 12);
        ctx.fillText(`Window size (inner)`, textPos[0], textPos[1]);
        ctx.fillText(`Window position`, textPos[0], textPos[1] + 12);
        ctx.textAlign = "left";
        ctx.fillText(`: ${windowSize[0]}x${windowSize[1]}`, textPos[0], textPos[1] - 12);
        ctx.fillText(`: ${windowInnerSize[0]}x${windowInnerSize[1]}`, textPos[0], textPos[1]);
        ctx.fillText(`: ${windowPos[0]},${windowPos[1]}`, textPos[0], textPos[1] + 12);
      },
      windowInnerOffset,
    ],
    [
      desiredSize,
      (ctx, args) => {
        ctx.setLineDash([16,12]);
        ctx.lineCap = "round";
        ctx.lineWidth = 2;
        ctx.lineDashOffset = -(Date.now()/25)%28;
        ctx.strokeStyle = "#BA00FF";
        ctx.strokeRect(...args.map((e,i)=>i>1?e-2:e+1));
      },
    ],
    [
      [1650, 1000],
      (ctx, args) => {
        if (!tooSmall) return;
        ctx.setLineDash([16,12]);
        ctx.lineCap = "round";
        ctx.lineWidth = 2;
        ctx.lineDashOffset = -(Date.now()/25)%28;
        ctx.strokeStyle = "#C21E56";
        ctx.strokeRect(...args.map((e,i)=>i>1?e-2:e+1));
      },
    ],
  ];
  
  for (const element of elements) {
    const scaledSize = element[0].map(e=>Math.floor(e*canvasScale));
    const scaledOff = element[2]?.map(e=>Math.floor(e*canvasScale)) || [0,0];
    element[1](ctx, [...scaledSize.map((e,i)=>Math.floor((canvasSize[i]-e+scaledOff[i])/2)), ...scaledSize]);
  }
  requestAnimationFrame(renderScreenSizePreview);
}

function getDate(){
  return new Date();
}

function share() {
  navigator.share({
    title: "Antonymph",
    text: "EPIC ANTONYMPH WEB SITE!!!1",
    url: "https://lyra.horse/assets/",
  });
}

function setOffsets({cornerOffset, paddingOffset, availScreen, fullScreen}) {
  platformCorner = cornerOffset;
  if ((Math.min(...platformCorner) < 0 || platformCorner[0] > (screen.width-screen.availWidth) || platformCorner[1] > (screen.height-screen.availHeight)) && platformFixes.buggyCorners) {
    console.warn("Using buggyCorners platformFix (firefox on macOS)");
    platformCorner = [0, 25];
  }
  platformOffset = [paddingOffset[0] - OFF_X, paddingOffset[1] - OFF_Y];
  screenSizes.avail = availScreen;
  screenSizes.full = fullScreen;
  screenSizeHasChanged = false;
  if (DEBUG_MODE)
    console.table({cornerOffset, paddingOffset, availScreen, fullScreen});
  setDisplaySizeString();
}

function requestOffset(requestAsTarget) {
  window.open("offset.html", requestAsTarget ? `target-4` : `offset`, "popup,height=100,width=100,top=0,left=0");
}

function startExperience() {
  playNavSound();
  requestOffset();
  hasStarted = true;
  allowUrlChanges = document.getElementById("allowUrlChanges").checked;
  windowRateLimit = parseInt(document.getElementById("limit-window").value);
  frameRateLimit = parseInt(document.getElementById("limit-fps").value);
  if (document.getElementById("collect data").checked) unlockAchievement("inspector");
  vyletIntro.currentTime = 0;
  vyletIntro.play();
  setBackgroundTransColor("background-color 0.75s", "#FFF");
  introText.style.opacity = "0";
  introMusic.pause()
  introMusic.muted = true;
  popupOverlay.style.background = "none";
  setTimeout(() => {
    introText.style.display = "none";
    getPopups();
  }, 1500);
}

function achievementsScreen(trueEnding) {
  generateAchievementsScreen();
  document.getElementById("outroText").style.display = trueEnding ? "inline" : "none";
  endText.style.display = "block";
  introText.style.opacity = "0";
  // iframe (cohost) workaround
  endText.style.transform = (window.innerHeight === 640) ? "scale(0.5) translate(-240px, -240px)" : "";
  setTimeout(() => endText.style.opacity = "1", 32);
  setTimeout(() => introText.style.display = "none", 750);
}

function introScreen() {
  if (!DEBUG_MODE)
    introText.style.display = "block";
  endText.style.opacity = "0";
  setTimeout(() => introText.style.opacity = "1", 32);
  setTimeout(() => endText.style.display = "none", 750);
  requestMIDIPermission();
}

function setCheckImage() {
  const imageSrc = {
    "opera": "check_opera.png",
    "chrome": "check_chrome.png",
    "firefox": "check_firefox.png",
    "safari": "check_safari.png",
    "ie": "check_ie.png",
  }?.[getBrowserType()] ?? "check_err.png";
  document.getElementById("checkmain").src = "/assets/" + imageSrc;
}

function setLimitIfHighRefresh() {
  // Automatically sets window animation limit based on monitor hz
  requestAnimationFrame(()=>
      requestAnimationFrame((t1)=>requestAnimationFrame((t2)=> {
        const frameTime = (t2-t1);
        const optionEl = document.getElementById("limit-window");
        optionEl.value = 0;
        // 100hz+
        if (frameTime <= 10) optionEl.value = 1;
        // 200hz+
        if (frameTime <= 5) optionEl.value = 3;
      }))
  );
}

let popupsCheckCounter = 0;
let popupsAllowed = false;
function markOkay() {
  popupsCheckCounter++;
  if (popupsCheckCounter > 1) {
    if (!popupsAllowed) popupCheckPassed(false);
    popupsAllowed = true;
    state.innerText = "Popups allowed! (marked as okay)";
  }
}

function popupCheckPassed(immediately) {
  popupOverlay.style.opacity = "0";
  closePopups(true);
  requestOffset(true);
  setTimeout(()=>{
    popupOverlay.style.display = "none";
  }, immediately ? 1500 : 1500);
  setTimeout(setLimitIfHighRefresh,1600);
  setTimeout(preloadAssets,2000);
}

function playAudio(url) {
  const audio = new Audio(url);
  audio.oncanplay = async () => {
    try {
      await audio.play();
    } catch (e) {
      document.body.addEventListener("click", () => audio.play(), { once: true });
    }
  }
  return audio;
}

function noPopups() {
  playAudio("/assets/popup_blocked.mp3");
  document.getElementById("popupCheckWindow").style.opacity = 1;
  const infobar = document.getElementById("infobar");
  infobar.style.top = "0px";
  setTimeout(() => infobar.style.filter = "invert(1)", 0);
  setTimeout(() => infobar.style.filter = "invert(0)", 300);
  setTimeout(() => infobar.style.filter = "invert(1)", 600);
  setTimeout(() => infobar.style.filter = "invert(0)", 900);
}

let lastCheck = 0;
function popupCheck() {
  if (Date.now() - lastCheck < 500) return;
  if (document.getElementById("mobileOverlay").style.display === "block") return;
  lastCheck = Date.now();
  state.innerText = "Checking for popup permission...";
  popupsCheckCounter = 0;
  const check = [0,1,2].map(e =>
    window.open("check.html", `check-${e}`, "popup,height=100,width=100,top=0,left=0")
  );
  if (check.includes(null)) {
    for (const popup of check) {
      popup?.close();
    }
    state.innerText = "Popups not allowed, please allow!";
    noPopups();
    return false;
  }
  if (!popupsAllowed) popupCheckPassed(true);
  popupsAllowed = true;
  state.innerText = "Popups allowed! (initial check)";
  return true;
}

function getPopups() {
  mainAudio.play();
  try {
    const paintWindow = popups[2]?.window;
    if (paintWindow?.unsaved)
      paintWindow.onbeforeunload = null;
  } catch {}
  popups = [0,1,2,3,4].map(e =>
    window.open("popup.html", `target-${e}`, "popup,height=200,width=180,top=32,left=32")
  );
  
  popupState = [0,1,2,3,4].map(e =>
    ({
      x: -1,
      y: -1,
      w: -1,
      h: -1,
      lastEvent: -1,
      sillyHidden: false,
      lastMove: -1,
      lastResize: -1,
      lastUrl: '',
      lastHistory: '',
      restored: true,
    })
  );
  if (popups.includes(null)) {
    mainAudio.pause();
    for (const popup of popups) {
      popup?.close();
    }
    setTimeout(()=>alert("You must allow pop-ups for this experience"), 200);
  } else {
    for (let i = 0; i < 5; i++) {
      sillyHide(i);
    };
    requestAnimationFrame(mainLoop);
  }
}

function closePopups(skipLast) {
  mainAudio.pause();
  [0,1,2,3,...(skipLast ? [] : [4])].map(e =>
    window.open("close.html", `target-${e}`, "popup,height=100,width=100,top=0,left=0")
  );
}

/*
 * Some ideas that didn't make the cut:
 * Free virus - Download the free virus
 * 2:42:069AM - Watch this thing at 2AM
 * Final moments - Watch on less than 10% battery
 * No iPhone? - Close the iPhone window
 */
const achievements = {
    "antonymph": {
        title: "Antonymph",
        description: "Watch through the entire experience",
        icon: "/assets/achievement_antonymph.png",
    },
    "gehorse": {
        title: "GeHorse Experience",
        description: "Find Secret #1",
        icon: "/assets/achievement_gehorse.png",
    },
    "lyrabon": {
        title: "Lyrabon",
        description: "Get a score of 35 or more",
        icon: "/assets/achievement_lyrabon.png",
        prerequisite: "gehorse",
        prerequisiteMessage: "Unlock Secret #1 first",
    },
    "notitg": {
        title: "Not ITG",
        description: "Hit all of the 40 notes",
        icon: "/assets/achievement_notitg.png",
        prerequisite: "gehorse",
        prerequisiteMessage: "Unlock Secret #1 first",
    },
    "congratulations": {
        title: "Congratulations?",
        description: "Find Secret #2",
        icon: "/assets/achievement_congratulations.png",
    },
    "sam": {
        title: "Microsoft Sam",
        description: "Try a TTS voice",
        icon: "/assets/achievement_sam.png",
        prerequisite: "congratulations",
        prerequisiteMessage: "Unlock Secret #2 first",
    },
    "draw": {
        title: "Wait, I can draw?",
        description: "Find Secret #3",
        icon: "/assets/achievement_draw.png",
    },
    "nightcore": {
        title: "Nightcore",
        description: "Try a different speed",
        icon: "/assets/achievement_nightcore.png",
        prerequisite: "draw",
        prerequisiteMessage: "Unlock Secret #3 first",
    },
    "artist": {
        title: "Artist",
        description: "Use a pressure-sensitive drawing tablet",
        icon: "/assets/achievement_artist.png",
        prerequisite: "draw",
        prerequisiteMessage: "Unlock Secret #3 first",
    },
    "musician": {
        title: "Musician",
        description: "Watch the experience with a MIDI device attached",
        icon: "/assets/achievement_musician.png",
    },
    ...(DEBUG_MODE ? {"developer": {
        title: "Developer",
        description: "Click the \"free achievement\" button in debug mode",
        icon: "/assets/achievement_developer.png",
    }} : {}),
    "inspector": {
        title: "Inspector",
        description: "Accept the tracking cookies, somehow",
        icon: "/assets/achievement_inspector.png",
    },
    "hacker": {
        title: "Hacker",
        description: "Run the `getEpicAchievement()` function",
        icon: "/assets/achievement_hacker.png",
    },
};

let epicAchievementProgress = 0;
function getEpicAchievement() {
  const theme = "color:#0F0;background:black";
  if (epicAchievementProgress === 0) {
    console.log("%cHmm, that'd be too easy... Run it 20 times!", theme);
  } else if (epicAchievementProgress > 0 && epicAchievementProgress < 20) {
    console.log(`%c${20 - epicAchievementProgress} to go`, theme);
  } else if (epicAchievementProgress === 20) {
    console.log("%cHmm, no, still too easy. Try running it 9999 more times", theme);
  } else if (epicAchievementProgress > 20 && epicAchievementProgress < 0x1337) {
    console.log(`%c${(20 + 9999) - epicAchievementProgress} to go`, theme);
  } else if (epicAchievementProgress === 0x1337) {
    console.log(`%cAlright, that's enough, you can have the achievement, enjoy!`, theme);
    unlockAchievement("hacker");
  }
  epicAchievementProgress++;
}

function unlockAchievement(name, force) {
  const key = `antonymph.achievement.${name}`;
  if (!force && localStorage.getItem(key)) return false;
  const achievement = achievements[name];
  localStorage.setItem(key, localStorage.getItem(key) || Date.now());
  showAchievement(achievement);
  setTimeout(()=>generateAchievementsScreen(), 100);
  checkUnlocks();
  return true;
}

function checkUnlocks() {
  const unlocks = [
    ["gehorse", "unlockSkip"],
    ["congratulations", "unlockTTS"],
    ["draw", "unlockSpeed"],
    ["antonymph", "unlockAchievements"],
    ["antonymph", "unlockSecrets"],
  ]
  unlocks.forEach(([name, element]) => document.getElementById(element).style.display = localStorage.getItem(`antonymph.achievement.${name}`) ? "inline" : "none");
}

function generateAchievementsScreen() {
  const achievementsEl = document.getElementById("achievements");
  //achievementsEl.innerHTML = "";
  for (const [name, achievement] of Object.entries(achievements)) {
    const unlocked = !!localStorage.getItem(`antonymph.achievement.${name}`);
    const prerequisiteUnlocked = achievement?.prerequisite ? localStorage.getItem(`antonymph.achievement.${achievement?.prerequisite}`) : true;
    const htmlCode = <>
      <div class={`achievementBox ${unlocked ? "unlocked" : "locked"}`}>
        <div style={`
          width: 70px;
          height: 70px;
          border-radius: 70px;
          margin: 5px;
          float: left;
          background: center/cover url(${achievement.icon}) black;
          filter: saturate(${unlocked ? 1 : 0});
        `}></div>
        <div style="
          width: calc(100% - 90px);
          height: 70px;
          margin: 5px;
          float: left;
          display: flex;
          justify-content: center;
          align-content: center;
          flex-direction: column;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">
          <span>
            <b>{achievement.title}</b>{unlocked || " (locked)"}
          </span>
          <i>${prerequisiteUnlocked ? achievement.description : achievement?.prerequisiteMessage}</i>
        </div>
      </div>
    </>;
    // Unsanitized yum!
    achievementsEl = htmlCode;
  }
  document.querySelectorAll(".achievementBox.unlocked").forEach(e => {
    e.onmouseenter = () => playNavSound(5, true);
    e.onmouseleave = () => playNavSound(7, true);
  });
}

const ach = new Audio("/assets/achievement.mp3");
function showAchievement({title, description, icon}) {
  const achievement = document.getElementById("achievement");
  achievement.style.display = "block";
  achievement.querySelector("div").style.background = `center/cover url(${icon}) black`;
  achievement.querySelector("b").innerText = `Achievement unlocked - ${title}`;
  achievement.querySelector("i").innerText = description;
  ach.currentTime = 0;
  ach.preservesPitch = false;
  ach.playbackRate = mainAudio.playbackRate;
  ach.play();
  setTimeout(()=>{
    achievement.classList.add("toggle");
  }, 32);
  setTimeout(()=>{
    achievement.classList.remove("toggle");
  }, 5000);
  setTimeout(()=>{
    achievement.style.display = "none";
  }, 6000);
}

const loadedAssets = [];
function preloadAssets() {
  const assets = [
    "DeterminationSansWeb.woff",
    "achievement.mp3",
    "achievement_antonymph.png",
    "achievement_artist.png",
    "achievement_congratulations.png",
    "achievement_developer.png",
    "achievement_draw.png",
    "achievement_gehorse.png",
    "achievement_hacker.png",
    "achievement_inspector.png",
    "achievement_lyrabon.png",
    "achievement_musician.png",
    "achievement_nightcore.png",
    "achievement_notitg.png",
    "achievement_sam.png",
    "aim.png",
    "arrow.png",
    "badger.mp4",
    "chat-d.png",
    "chat-f.png",
    "chipmunk_laugh.mp3",
    "click.mp3",
    "click.wav",
    "cursor.png",
    "cursor_click.png",
    "door-left.jpg",
    "door-right.jpg",
    "ds_bottom.png",
    "ds_top.png",
    "event_mode.png",
    "excellent.png",
    "fluttgirshy.png",
    "frog_1.png",
    "frog_2.png",
    "frog_3.png",
    "gangnam-style-gif.mp4",
    "hit.wav",
    "hoId.png",
    "hold.png",
    "hourglass.png",
    "icons.png",
    "image13_small.gif",
    "iphone.png",
    "iphone_slide.png",
    "keychain.png",
    "kitten_1.png",
    "kitten_2a.png",
    "kitten_2b.png",
    "kitten_2c.png",
    "kitten_3a.png",
    "kitten_3b.png",
    "kitten_4a.png",
    "kitten_4b.png",
    "kitten_car.png",
    "navigate.mp3",
    "nyan.mp4",
    "paint.png",
    "paint_cursor.png",
    "paint_font.png",
    "paint_font_mac.png",
    "paint_txt.png",
    "perfect.png",
    "popup_blocked.mp3",
    "receptor.png",
    "sad.png",
    "skype.png",
    "steam.png",
    "tada.mp3",
    "textbox_shy.png",
    "textbox_tacky.png",
    "the_game.png",
    "the_game_click.png",
    "vylet_intro.mp3",
    "wmm.png",
    "wmm_bar.png",
    "wmm_card.png",
    "wmm_head.png",
    "wmm_pause.png",
    "yay.png"
  ];
  assets.forEach((assetName)=>fetch(`/assets/${assetName}`).then(r=>r.blob()).then((blob)=>{
    const reader = new FileReader();
    reader.onload = (e) => loadedAssets[assetName] = e.target.result;
    reader.readAsDataURL(blob);
  }));
}

async function fetchToDataUri(url) {
  return new Promise((resolve, reject) => {
    try {
      fetch(url).then(r => r.blob()).then(blob => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      reject(err);
    }
  });
}

let icons = [];
(async () => icons = await Promise.all(Array(11).fill(0).map(async (v, i) => await fetchToDataUri(`/assets/icon_${i}.png`))))();

let iconFrame = 0;
setInterval(()=>{
  if (icons.length !== 11) return;
  iconFrame++;
  if (iconFrame > 10) iconFrame = 0;
  const iconUrl = icons[iconFrame];
  
  document.querySelector("link[rel~='icon']").href = iconUrl;
  /* I wanted to animate the favicon for all windows but it messed up the performance or something
  for (const popup of popups) {
    try {
      popup.document.querySelector("link[rel~='icon']").href = iconUrl;
    } catch{}
  }*/
}, (60/132)*1000/2);

const ignoreLimits = false;

function oneTime(index, currentBeat, desiredBeat) {
  if (popupState[index].lastEvent > currentBeat) {
    popupState[index].lastEvent = currentBeat;
  }
  if (currentBeat >= desiredBeat && currentBeat-desiredBeat < 1) {
    if (popupState[index].lastEvent < desiredBeat) {
      popupState[index].lastEvent = desiredBeat;
      return true;
    }
  }
  return false;
}

function calculateOffsets(index, x, y) {
  try {
    const intendedSize = [1920, 1080];
    
    let availableSize = [screen.availWidth, screen.availHeight];
    // fails if cross-origin
    try {
      availableSize = [
        popups[index].screen.availWidth,
        popups[index].screen.availHeight,
      ];
    } catch {}
    if (availableSize[0] && availableSize[1]) {
      return [
        Math.max(Math.max(0,platformCorner[0]), Math.floor((availableSize[0] - intendedSize[0])/2 + Math.max(0,platformCorner[0]) + x)),
        Math.max(Math.max(0,platformCorner[1]), Math.floor((availableSize[1] - intendedSize[1])/2 + Math.max(0,platformCorner[1]) + y)),
      ];
    }
  } catch (e) { console.error(e) }
  return [Math.max(0, x), Math.max(0, y)];
}

let rateLimitState = 0;
let rateLimitMs = Math.floor(1000/120);
function move(index, x, y, rateLimit) {
  if (!popupState[index].restored) return;
  if (rateLimit && windowRateLimit && !popupState[index].sillyHidden && rateLimitState > 1) return;
  //if (rateLimit && Date.now() - popups[index].lastMove < rateLimitMs) return false;
  try {
    [x, y] = calculateOffsets(index, Math.floor(x), Math.floor(y));
    popupState[index].sillyHidden = false;
    //if (popupState[index].x !== x || popupState[index].y !== y || ignoreLimits) {
    if (popups[index].screenLeft !== x || popups[index].screenTop !== y || ignoreLimits) {
        debug_action_calls++;
        //if (rateLimit) popups[index].lastMove = Date.now();
        if (rateLimit)
          rateLimitState = 1;
        popups[index].moveTo(x, y);
        popupState[index].x = x;
        popupState[index].y = y;
    }
  } catch {
    return false;
  }
  return true;
}

function size(index, w, h, rateLimit) {
  if (!popupState[index].restored) return;
  if (rateLimit && windowRateLimit && !popupState[index].sillyHidden && rateLimitState > 1) return;
  //if (rateLimit && Date.now() - popups[index].lastResize < rateLimitMs) return false;
  try {
    w = Math.max(178, Math.floor(w + platformOffset[0]));
    h = Math.max(100, Math.floor(h + platformOffset[1]));
    popupState[index].sillyHidden = false;
    //if (popupState[index].w !== w || popupState[index].h !== h || ignoreLimits) {
    if (popups[index].outerWidth !== w || popups[index].outerHeight !== h || ignoreLimits) {
      debug_action_calls++;
      //if (rateLimit) popups[index].lastResize = Date.now();
      if (rateLimit)
        rateLimitState = 1;
      popups[index].resizeTo(w, h);
      popupState[index].w = w;
      popupState[index].h = h;
    }
  } catch {
    return false;
  }
  return true;
}

// Turns out center calls suck because of platform differences and Firefox behavior
function center(index, rateLimit) {
  // return move(index, 1920/2 - popupState[index].w/2, 1080/2 - popupState[index].h/2);
  try {
    return move(index, 1920/2 - popups[index].outerWidth/2, 1080/2 - popups[index].outerHeight/2, rateLimit);
  } catch {
    return move(index, 1920/2 - popupState[index].w/2, 1080/2 - popupState[index].h/2, rateLimit);
  }
}

function sillyHide(index) {
  if (popupState[index].sillyHidden) return;
  //popupState[index].sillyHidden = size(index, 100,100) && size(index, 0,0) && move(index, 0,0);
  //popupState[index].sillyHidden = size(index, 100,100) && size(index, 100,1) && move(index, 0,0);
  popupState[index].sillyHidden = size(index, 100,100) && size(index, 100,1) && move(index, 0,50);
}

function setPopupHistory(index, url) {
  if (popupState[index].lastHistory === url) return;
  popupState[index].lastHistory = url;
  try {
    if (allowUrlChanges)
      popups[index].history.replaceState({}, "", url);
    popups[index].document.title = url.replace(/_/g, " ").replace(/^\//, "");
  } catch {}
}

// This is a NO-OP
function focusPopup(index) {
  debug_action_calls++;
  //popups[index].focus();
}

function resetPopupFocus() {
  [0,1,2,3,4].forEach(i=> {
    try {
      popups[i].focus();
    } catch {};
  });
}

function restorePopup(index, force = false) {
  focusPopup(index);
  if (popupState[index].restored && !force) return;
  debug_action_calls++;
  popups[index] = window.open("popup.html", `target-${index}`, "popup");
  popupState[index].restored = true;
}

function navigatePopup(index, url, force = false) {
  if (popupState[index].lastUrl === url && !force) return false;
  debug_action_calls++;
  popupState[index].restored = false;
  popupState[index].lastUrl = url;
  window.open(url, `target-${index}`, "popup");
  return true;
}

function forceReNavigate(index) {
  window.open(popupState[index].lastUrl, `target-${index}`, "popup");
}

document.getElementById("startBtn").onclick = () => getPopups();
document.getElementById("cleanBtn").onclick = () => { document.getElementById("debug").style.display = "none"; getPopups(); };
document.getElementById("closeBtn").onclick = () => closePopups();
document.getElementById("checkBtn").onclick = () => popupCheck();
document.getElementById("offstBtn").onclick = () => requestOffset();

document.onclick = (e) => {
  if (hasStarted && e.altKey) {
    emergencyText.style.display = "block";
    emergencyText.innerText = "Stopping...";
    emergencyStop();
  } else if (hasStarted && !DEBUG_MODE) {
    resetPopupFocus();
  }
  if (hasStarted && !mainAudio.paused && !DEBUG_MODE) {
    document.title = "ALT+CLICK TO STOP";
    emergencyText.style.display = "block";
    setTimeout(() => {
      document.title = "Antonymph";
      emergencyText.style.display = "none";
    }, 3000);
  }
};
function emergencyStop() {
  mainAudio.pause();
  for (const popup of popups) {
    popup?.close();
  }
  closePopups();
  setTimeout(()=>document.location.reload(), 100);
}

const bpm = 132;
function getCurrentBeat() {
  // return ((mainAudio.currentTime - 0.052) / (60/132))/4;
  return ((mainAudio.currentTime) / (60/bpm))/4;
}

function beatToMs(beat) {
  return beat * ((60/bpm)*4) * 1000;
}

function msToBeat(ms) {
  return (ms / 1000) / ((60/bpm)*4);
}

function setBackgroundTransColor(trans, color) {
  if (trans)
    background.style.transition = trans;
  if (color)
    background.style.backgroundColor = color;
  // This is just to look cool, not to prevent you from seeing the console :)
  if (color && !DEBUG_MODE)
    console.log("%c████", "font-size: 420px; background:" + color + "; color: transparent")
}

const timedLyrics = [
  [0, ""],
  [15.875, "I messaged somepony over Tumblr last night"],
  [17.625, "She said \"RAWR X3\" so it's true love at first sight"],
  [19.875, "Throw on my kandi bracelets, now I'm headed to class"],
  [21.625, "I'm still 20 percent, so get your head out your ass"],
  [24.25, "I'm the antonymph of the internet"],
  [25.8125, "Still cleaning up the viruses that you had left"],
  [28.25, "I think I'm falling in love again (love again)"],
  [30.25, "Don't stop, don't stop until you hear the- (Yay!)"],
  [32.25, "I'm the antonymph of the internet"],
  [33.875, "Been fighting on Newgrounds over if my love is valid"],
  [36.1875, "Fuck the cynicism, let the colors fly"],
  [37.875, "Don't care you think it's cringe, because it's not your life"],
  [40.6875, "She said, \"Do you like waffles?\", I said \"Hell yeah!\""],
  [42.875, "Been watching Equals Three until 2 a.m."],
  [44.875, "I ain't got no iPhone, but I got a DS"],
  [46.75, "With a keychain of Pinkie, her cupcakes are the best (sing a song about life)"],
  [48.75, "I've been failing my classes, 'cause I don't give a damn"],
  [50.625, "They say the world is my oyster but the free market's a scam"],
  [52.875, "Everything's been changing since last generation was born"],
  [54.75, "And they won't try to take in change is a two-edged sword"],
  /*
  [65.25, "I'm the antonymph of the internet"],
  [66.8125, "Still cleaning up the viruses that you had left"],
  [69.25, "I think I'm falling in love again (love again)"],
  [71.25, "Don't stop, don't stop until you-"],
  [73.25, "I'm the antonymph of the internet"],
  [74.875, "Been fighting on Newgrounds over if my love is valid"],
  [77.1875, "Fuck the cynicism, let the colors fly"],
  [78.875, "Don't care you think it's cringe, because it's not your life"],
  */
  [57, "bam bam beem bam"],
  [57.5, "ja babara ra rom"],
  [58, "rem ram ram rrram"],
  [59.125, "ba baa baaa baaaaa"],
  [60, "beeeaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
  //
  [64.75, "나는 사나이"],
  [65.6875, "낮에는 너만큼 따사로운 그런"],
  //
  // A ram me am brem da
  // Am da rem ram am da baabeeeaaaaaaa!
  [66.75, "just"],
  [67, "go"],
  [67.25, "kitty"],
  [67.5, "go"],
  [67.75, "kitty"],
  [68, "go"],
  [68.25, "kitty"],
  [68.5, "go"],
  [68.75, "and just"],
  [69, "ride"],
  [69.25, "kitty"],
  [69.5, "ride"],
  [69.75, "kitty"],
  [70, "ride"],
  [70.25, "kitty"],
  [70.5, "roll"],
  [70.75, "and just"],
  [71, "go"],
  [71.25, "kitty"],
  [71.5, "go"],
  [71.75, "kitty"],
  [72, "go"],
  [72.25, "kitty"],
  //
  [72.5, ":3"],
  [73, null],
  [81, "..."],
  //
  [82.5, "Tacky wacky!"],
  //
  [82.875, "It's never too late to fall in love with the world"],
  [84.875, "Your past is not today, so set your stride with a twirl"],
  [86.75, "Yeah, we've all made mistakes before"],
  [88.125, "That's a fact of life"],
  [89.125, "But once you restitch your heart, you'll be just fine"],
  [91.625, "Now it's your life, you'll say, \"It's all mine!\""],
  [93.75, "All mine"],
  [95, "Revel in your friends and hobbies, let your heart speak"],
  [96.875, "When a drifter says some shit, just block that internet freak!"],
  [100.25, "I'm the antonymph of the internet"],
  [101.8125, "Still cleaning up the viruses that you had left"],
  [104.25, "I think I'm falling in love again (love again)"],
  [106.25, "Don't stop, don't stop until you-"],
  [108.25, "I'm the antonymph of the internet"],
  [109.875, "Been fighting on Newgrounds over if my love is valid"],
  [112.1875, "Fuck the cynicism, let the colors fly"],
  [113.875, "Don't care you think it's cringe, because it's not your life"],
];

let ttsVoice;
const tts = document.getElementById("tts");
const ttsVoices = [];
function toggleTTS() {
  tts.value = textToSpeech ? "vylet" : "1";
  selectTTS();
}

function selectTTS() {
  const voiceId = parseInt(tts.value);
  const useInstrumental = tts.value !== "vylet";
  textToSpeech = !!voiceId;
  const currentTime = mainAudio.currentTime;
  mainAudio.src = useInstrumental ? "/assets/antonymph_epic_inst_cbr.mp3" : "/assets/antonymph_epic_cbr.mp3";
  mainAudio.volume = textToSpeech ? vyletIntro.volume*0.5 : vyletIntro.volume;
  mainAudio.playbackRate = vyletIntro.playbackRate;
  mainAudio.currentTime = currentTime;
  window?.speechSynthesis?.cancel();
  if (voiceId) {
    ttsVoice = ttsVoices[voiceId - 1];
    unlockAchievement("sam");
    try {
      const utterer = new SpeechSynthesisUtterance(`Hello, I'm ${ttsVoice.name.split(' - English')[0]} and I'm the Antonymph of the internet`);
      utterer.voice = ttsVoice;
      utterer.pitch = (mainAudio.playbackRate + 1)/2;
      utterer.rate = mainAudio.playbackRate;
      window.speechSynthesis.speak(utterer);
    } catch {}
  } else if (tts.value === "vylet") {
    playAudio("/assets/tts.mp3");
  }
}

function setupTTS() {
  Array.from(tts.childNodes).forEach(e => {if (e?.value && !["vylet","karaoke"].includes(e?.value))e.remove()});
  window.speechSynthesis.getVoices().forEach((voice, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.innerText = voice.name;
    tts.appendChild(opt);
    ttsVoices.push(voice);
  });
}

document.getElementById(atob`YWNoaWV2ZW1lbnQ`).ontransitionstart = (e) => {
  const key = atob`YW50b255bXBoLmFjaGlldmVtZW50LmhhY2tlcg`;
  if (localStorage.getItem(key) && e.target.innerText.includes("icAc") && epicAchievementProgress < 0x1337) {
    localStorage.removeItem(key);
    e.target.classList.remove("toggle");
    console.log(atob`eW91IGdvdHRhIHRyeSBoYXJkZXIgdGhhbiB0aGF0IQ`);
    noPopups();
  }
}

function selectSkip() {
  const skip = document.getElementById("skip");
  mainAudio.currentTime = beatToMs(parseFloat(skip.value))/1000;
}

let lastLyrics = "";
function setLyrics(currentBeat) {
  const currentLyrics = timedLyrics.filter(l => l[0] <= currentBeat).at(-1);
  if (currentLyrics[1] === null) {
    return;
  }
  if (currentLyrics[1] !== lastLyrics) {
    if (textToSpeech) {
    try {
      window.speechSynthesis.cancel();
      const utterer = new SpeechSynthesisUtterance(currentLyrics[1]);
      utterer.voice = ttsVoice;
      utterer.pitch = (mainAudio.playbackRate + 1)/2;
      utterer.rate = mainAudio.playbackRate;
      window.speechSynthesis.speak(utterer);
    } catch {}
    }
    lastLyrics = currentLyrics[1];
  }
  
  const charCount = Math.floor((currentBeat - currentLyrics[0])*30);
  const urlString = "/" + currentLyrics[1].substring(0, charCount).trim().replace(/ /g, "_");
  for (let i = 0; i < 5; i++) {
    setPopupHistory(i, urlString);
  }
}

function tumblrChat(title, messages) {
  const messagesHtml = messages.map(msg => msg[0] === 0 ? <>
    <img src="/assets/chat-d.png" style="margin: 20px 13px 0 20px" />
    <span style="
      background: white;
      font-size: 15px;
      border-radius: 10px;
      padding: 8px;
      margin: 5px 0;
      display: inline-block;
      width: 50%;
    ">{msg[1].join("\n")}</span><br/>
  </> : <>
    <span style="
      background: white;
      font-size: 15px;
      border-radius: 10px;
      padding: 8px;
      margin-left: 90px;
      display: inline-block;
      width: 50%;
    ">{msg[1].join("\n")}</span>
    <img src="/assets/chat-f.png" style="margin: 20px 13px 0 20px;" /><br/>
  </>);
  return <>
    <style>{`.tumblrBg{transition:filter 1s;}`}</style>
    <div class="tumblrBg" style="
      background: #D1D4F4;
      height: 100%;
      font-family: 'Comic Sans MS', cursive;
      filter: brightness(1);
    ">
      <div style="
        background: #6A708F;
        width: 100%;
        height: 25px;
        color: white;
        font-size: 16px;
        padding: 15px;
      ">{title}</div>
      {messagesHtml}
      <div style="
        background: #FAF6FC;
        width: 100%;
        height: 25px;
        color: #B0B2C3;
        font-size: 16px;
        padding: 15px;
        position: absolute;
        bottom: 0;
      ">Say Something</div>
    </div>
  </>;
}

function notepad(text) {
  return <>
    <div style="
      background: #FFF;
      color: black;
      height: 100%;
      font-size: 12px;
      font-family: 'Arial', sans-serif;
    ">
      <div style="
        width: 100%;
        height: 16px;
        padding: 4px 6px 0;
        border-bottom: solid 2px #F0F0F0;
      ">
        <u>F</u>ile&emsp;<u>E</u>dit&emsp;F<u>o</u>rmat&emsp;<u>V</u>iew&emsp;<u>H</u>elp
      </div>
      <div style="padding: 4px;">
        {text.replace(/\n/g, "<br>\n")}
      </div>
    </div>
  </>;
}

function plain(color) {
  return <div style={`width: 100%; height: 100%; background: ${color || '#000'}`}></div>;
}

/* beats 0 - 24 */
function part1(currentBeat) {
  if (oneTime(0, currentBeat, 0))
    setBackgroundTransColor("background-color 1.5s", "#E8E9C5");
  if (oneTime(0, currentBeat, 8))
    setBackgroundTransColor("background-color 3s cubic-bezier(0,0.5,0,1)", "#174180");
  
  if (currentBeat < 8) {
    try {
      popups[0].document.body.innerText = "Antonymph";
      popups[0].document.body.style.color = "#E8E9C5";
    }catch{}
    for (let i = 0; i < 3; i++) {
      size(i, 200, 200);
      move(i, 200, i*200 + 140 + 100);
      try {
        popups[i].document.body = plain("#E8E9C5");
      } catch {}
    }
    // mainAudio.currentTime = 40;
  }
  
  if (currentBeat >= 0 && currentBeat < 8) {
    const allText = [
      <>
        <i>antonymph</i><br/>
        music & vocals by vylet pony<span style="opacity: 0.1">, crazy frog, psy</span><br/>
        produced, mixed, & mastered by vylet pony<br/>
        written by vylet pony, voreburger, astroeden, calamarispider, sylver stripe<br/>
        additional arranging & recording by voreburger & astroeden
      </>,
      <>
        lick icon by voreburger<br/>
        flutt-gir-shy designed by voreburger
      </>,
      <>
        web experience<br/>
        produced & coded by rebane2001
      </>,
      <>
        illustrations by<br/>
        voreburger, mataschmata, nootaz, astroeden, syrupyyyart,<br/>
        calamarispider, nekosnicker, bunxl, chibadeer, retromochi,<br/>
        cassettepunk, voidmoth, galaxysquid, blairvonglitter, hazelnoods<br/>
        stereo flier, anticularpony, huffylime, fizzlesoda, opossum stuff,<br/>
        & wutanimations
      </>,
      ];
      const currentText = allText[Math.floor(currentBeat/2)];
    try {
      popups[4].document.body = <>
        <div style="width: 100%; height: 100%; padding: 1px 16px; background: #E8E9C5; font-family: monospace">
          <pre><b>{currentText}</b></pre>
        </div>
      </>;
      popups[4].document.title = "Antonymph";
    } catch {}
    size(4, 600, 200);
    //move(4, 1300, 700);
    if (currentBeat < 4)
      move(4, 280, 226);
    else
      move(4, 1040, 712);
    size(3, 1400, 800);
    move(3, (1920-1400)/2, (1080-800)/2); /* center(3); */
    /*
    const mapTimings = [
      [0, 1],
      [0 + 3/16, 1],
      [0 + 6/16, 1],
      [0 + 9/16, 1],
      [0 + 12/16, 1],
      [0 + 14/16, -1],
      [1, -1],
      [1 + 3/16, -1],
      [1 + 6/16, 1],
      [1 + 9/16, 1],
      [1 + 12/16, -1],
      [1 + 14/16, -1],
      [2, 1],
      [2 + 3/16, 1],
      [2 + 6/16, 1],
      [2 + 9/16, 1],
      [2 + 12/16, 1],
      [2 + 14/16, -1],
      [3, -1],
      [3 + 3/16, 1],
      [3 + 6/16, 1],
      [3 + 9/16, -1],
      [3 + 12/16, 1],
      
      [4, 1],
      [4 + 3/16, 1],
      [4 + 6/16, 1],
      [4 + 9/16, 1],
      [4 + 12/16, 1],
      [4 + 14/16, -1],
      [5, -1],
      [5 + 3/16, -1],
      [5 + 6/16, 1],
      [5 + 9/16, -1],
      [5 + 12/16, -1],
      [5 + 15/16, 1],
      [6, 1],
      [6 + 3/16, 1],
      [6 + 6/16, 1],
      [6 + 9/16, 1],
      [6 + 12/16, 1],
      [6 + 14/16, 1],
      [7, 1],
      [7 + 3/16, 1],
      [7 + 6/16, 1],
      [7 + 9/16, 1],
      [7 + 12/16, 1],
    ];
    const currentZoom = mapTimings.filter(l => l[0] <= currentBeat).reduce((a,c) => a+c[1], 0);
    */
    //const currentZoom = Math.floor(Math.max(0, currentBeat - 3.75)*4)+3;
    const currentMapBeat = Math.floor(currentBeat)*3 + Math.floor((currentBeat%1)*16/6);
    // const currentZoom = Math.max(0, Math.floor(currentBeat)*3 + Math.floor((currentBeat%1)*16/6) - 4);
    //const currentZoom = Math.floor(currentBeat*4);
    //const currentOffset = 1*Math.floor(4*Math.max(0, 4-currentBeat));
    // const currentOffset = 0;
    navigatePopup(3, `https://www.openstreetmap.org/?mlat=37.6486&mlon=-122.4296#map=${Math.min(19, currentMapBeat)}/37.6486/-122.4296`, false)
    if (platformFixes.focusFix) popups[4]?.focus();
  }
  
  if (oneTime(3, currentBeat, 8)) {
    restorePopup(3);
    popups[4].document.body = plain("#174180");
    sillyHide(1);
    sillyHide(2);
    sillyHide(4);
    size(0, 840, 250);
    move(0, (1920-840)/2, (1080-250)/2); /* center(0, true); */
  }
  
  if (currentBeat >= 8 && currentBeat < 16) {
    const popupBody = popups[0].document.body;
    const first = (currentBeat < 12);
    const currentSize = easeOutCubic((currentBeat-(first ? 8 : 12))/8)*250 + 250;
    popupBody.style.backgroundColor = "#174180";
    popupBody.style.color = "#fff";
    popupBody.style.fontSize = (currentSize/(first ? 2 : 3)) + "px";
    popupBody.style.fontFamily = "sans-serif";
    popupBody.style.textAlign = "center";
    popupBody.innerText = first ? "Antonymph" : "by trixielulam00nz!";
    const popupSize = [(first ? 840 : 1100) + currentSize, first ? currentSize : currentSize/1.5];
    if (currentBeat >= 8 + msToBeat(1000/15)) {
      size(0, ...popupSize, true);
      move(0, (1920-popupSize[0])/2, (1080-popupSize[1])/2, true); /* center(0, true); */
    }
    
    sillyHide(3);
  }
  
  if (oneTime(3, currentBeat, 16)) {
    setBackgroundTransColor("background-color 0s", "#174180");
    popups[4].document.body = plain("#174180");
  }
  
  if (currentBeat >= 16 && currentBeat < 24) {
    size(0, 800, 900);
    move(0, (1920-800)/2, (1080-900)/2); /* center(0); */;
    if (navigatePopup(0, currentBeat < 20 ? "https://tumblr.com" : "https://en.wikipedia.org/wiki/Kandi_bracelet#/media/File:Kandi_for_rave.jpg"))
      restorePopup(1, true);
    size(1, 380, 560);
    if (currentBeat >= 23 + 12/16)
      move(1, 1100, 460 + Math.floor((currentBeat*16 + 1)%2)*20);
    else
      move(1, 1100, 460 + Math.floor((Math.min(23.74, currentBeat)*4)%2)*20);
    
    try {
      //would be fun to have a few rare messages
      const messages = [
        ...(currentBeat >= 17 ? [[1, 'hi!']] : []),
        ...(currentBeat >= 18 ? [[0, 'rawr x3']] : []),
        ...(currentBeat >= 19 ? [[1, 'omggg!!1']] : []),
        ...(currentBeat >= 21 ? [[1, 'gotta go']] : []),
        //(currentBeat >= 21.25 ? [0, 'You left the chat'] : [])
      ];
      popups[1].document.body = tumblrChat("xxflutt-gir-shy + itsdashyy327", messages);
    } catch {}
    /*
    if (currentBeat > 22) {
      size(2, 800, 900);
      navigatePopup(2, " https://knowyourmeme.com/photos/217396-bronyspeak")
    }
    */
  }
}

/* beats 24 - 41 */
function part2(currentBeat) {
  /*
  if (currentBeat >= 24 && currentBeat < 40) {
    if (!popupState[0].restored) {
      restorePopup(0, true);
    }
    sillyHide(0);
    size(1, 1280, 720);
    move(1, 1920/2 - 1280/2, 1080/2 - 720/2);
    if (navigatePopup(1,
      (currentBeat >= 31.75 && currentBeat <= 32) ? ("https://" + "YAY-".repeat(98) + "yay") : (vyletArtUrls[Math.floor((currentBeat-24)*4)] + "?format=1200w"))
      )
      navigatePopup(2, "/assets/antonypmh-noelle.gif", true)
    if (currentBeat >= 31.75 && currentBeat <= 32) {
      // setTimeout(()=>popups[2]?.alert("yay!"),1);
      sillyHide(2);
    } else {
      const offsets = [
        [1200, 450],
        [1250, 550],
        [160, 280],
        [800, 80],
      ]
      const offset = offsets[currentBeat >= 32 ? Math.floor((currentBeat*4 - 2 + 0.75)%3) + 1 : 0];
      move(2, offset[0], offset[1] + Math.floor(easeOutCubic(bounceBack((currentBeat*8 + 1.5) % 2))*-50));
      size(2, 640, 556);
    }
  }
  */
  
  if (oneTime(1, currentBeat, 24)) {
    restorePopup(0, true);
    sillyHide(1);
    setBackgroundTransColor("background-color 0s", "#637");
    popups[1].document.body = plain("#637");
    popups[3].document.body = plain("#637");
    popups[4].document.body = plain("#637");
  }
  
  if (currentBeat >= 24 && currentBeat < 31.5) {
    const currentLoveIndex = Math.max(0, Math.floor((currentBeat - (28 + 2/16))*40));
    const currentLoveText = "I think I'm falling\nin love again.....".slice(0, Math.min(currentLoveIndex, 34 + Math.floor(currentBeat*6*4)%6)).replace("\n", "<br>");
    const coinGenerator = <>
      <div style="
        width: 100%;
        height: 100%;
        background: #EEE;
        font-family: sans-serif;
        color: #777;
        box-shadow: 1px 1px 30px #939393 inset;
      ">
        <div style="width: 50%; float: left;">
          <form style="padding: 20px;">
            <span>Penguin Username:</span><br/>
            <input type="text" value="biscuit327" disabled="disabled"/><br/>
            <br/>
            <span>Penguin Password:</span><br/>
            <input type="password" value="hunter2" disabled="disabled"/><br/>
            <br/>
            <span>Coin Amount:</span><br/>
            <select disabled="disabled">
              <option>15,000 coins</option>
            </select><br/>
            <br/>
            <button disabled="disabled">Generate Coins</button>
          </form>
        </div>
        <div style="
          width: 50%;
          float: right;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          transform: translate(-24px, 13px);
        ">
          <span style="text-align: center;">
            We are generating your<br/>
            epic penguin coins...<br/>
            <br/>
            Please wait...<br/>
            <br/>
          </span>
          <div style="
            width: 208px;
            height: 13px;
            background: repeating-linear-gradient(
              -60deg,
              #fff,
              #fff 8px,
              #ddd 9px,
              #ddd 17px,
              #fff 18px
            );
            border: 1px #999 solid;
            border-radius: 4px;
            box-shadow: 1px 1px 7px #888 inset;
            background-position-x: -16px;
          "></div>
          <br/>
          <br/>
        </div>
      </div>
    </>;
    const flash = <>
      <div id="bg" style="
        width: calc(100% + 32px);
        height: calc(100% + 32px);
        background: repeating-linear-gradient(
          -45deg,
          #484848,
          #484848 16px,
          #3E3E3E 16px,
          #3E3E3E 32px
        );
        position: absolute;
        top: 0;
        left: 0;
        z-index: -1;
      "></div>
      <img src="/assets/sad.png" id="sad" style="
        position: absolute;
        left: 220px;
        top: 130px;
        z-index: 2;
        filter: drop-shadow(0px 0px 3px #0005);
      "/>
      <div id="fg" style="
        width: 100%;
        height: 100%;
        position: absolute;
        top: 170px;
        left: 0;
        z-index: 1;
        text-align: center;
        line-height: 4px;
        font-size: 12px;
        font-family: sans-serif;
        color: white;
        text-shadow: 1px 1px 3px #0006;
      ">
      <p>The Adobe Flash plugin has crashed.</p>
      <p><u>Reload the page</u> to try again.</p>
      <br/><br/><br/><br/><br/><br/>
      <p>No report available.</p>
      </div>
    </>;
    const toolbarSeparator = () => <>
      <div class="component" style="
        width: 1px;
        height: 16px;
        margin: 2px;
        display: inline-block;
      "></div>
    </>;
    const toolbarContainer = (content) => <>
      <div class="component" style="
        width: calc(100% - 2px);
        height: 22px;
        font-family: sans-serif;
        font-size: 12px;
        z-index: 4;
      ">
        {toolbarSeparator()}
        {content}
        <span class="arrow">»</span>
      </div>
    </>;
    const toolbarTextbox = (width) => <>
      <div class="textBox">
        <div style={`width: ${width}px;`}>
        </div>
      </div>
    </>;
    const toolbarText = (content) => <span style="display: inline-block; transform: translateY(-7px); margin: 2px">{content}</span>;
    const toolbarIcon = (index, mr) => <div class="icon" style={`background-position-x: -${index*22}px; margin-right: ${mr??0}px`}></div>;
    const toolbarButton = (iconIndex, content) => `${toolbarIcon(iconIndex, -2)}${toolbarText(content)}`
      popups[2].document.body = <style>{`
        .component {
          background: #D4D0C8;
          border-top: 1px #FFF solid;
          border-left: 1px #FFF solid;
          border-bottom: 1px #808080 solid;
          border-right: 1px #808080 solid;
        }
        .textBox {
          margin: 2px;
          border-top: 1px #808080 solid;
          border-left: 1px #808080 solid;
          border-bottom: 1px #FFF solid;
          border-right: 1px #FFF solid;
          display: inline-block;
        }
        .textBox > div {
          height: 14px;
          background: white;
          border-top: 1px #404040 solid;
          border-left: 1px #404040 solid;
          border-bottom: 1px #D4D0C8 solid;
          border-right: 1px #D4D0C8 solid;
        }
        .arrow {
          right: 4px;
          color: black;
          font-weight: bold;
          position: absolute;
        }
        .icon {
          width: 22px;
          height: 22px;
          background: url(/assets/icons.png);
          display: inline-block;
        }
      `}</style>
    {currentBeat >= 24.25 ? toolbarContainer(
      toolbarIcon(9)+ toolbarIcon(10) + toolbarTextbox(80)
      + (currentBeat >= 24 + 6/16 ? toolbarButton(12, "The") : '')
      + (currentBeat >= 24 + 8/16 ? toolbarButton(13, currentBeat >= 24 + 12/16 ? "Antonymph" : "Anto") : '')
    ) : ''}
    {currentBeat >= 25 ? toolbarContainer(<>
      <span style="
        display: inline-block;
        transform: translateY(-7px);
        font-family: 'Arial Black', sans-serif;
        font-size: 11px;
        font-weight: bold;
        padding: 4px;
      ">
        <span style="color: #929598;">of</span>
        <span style="font-style: italic; color: #0c57ba; padding-right: 1px;">{currentBeat >= 25 + 2/16 ? 'the' : ''}</span>
        <span style="color: #5b5a5b;">
          {currentBeat >= 25 + 4/16 ? 'in' : ''}{currentBeat >= 25 + 6/16 ? 'ter' : ''}{currentBeat >= 25 + 8/16 ? 'net' : ''}
        </span>
      </span>
      {currentBeat >= 25 + 12/16 ? toolbarIcon(7) + toolbarTextbox(128) : <></>}
      {currentBeat >= 25 + 13/16 ? toolbarButton(8, "Still") : <></>}
      {currentBeat >= 26 ? toolbarButton(0, "Cleaning") : <></>}
      {currentBeat >= 26 + 4/16 ? toolbarButton(1, "Up") : <></>}
      {currentBeat >= 26 + 6/16 ? toolbarButton(2, "The") : <></>}
    </>) : <></>}
    {currentBeat >= 26 + 8/16 ? toolbarContainer(<>
      <span style="
        display: inline-block;
        transform: translateY(-6px);
        font-family: serif;
        font-size: 14px;
        font-weight: bold;
        filter: drop-shadow(0 1px 1px #0008);
      ">
        <span style="color: #144ceb;">V</span>
        <span style="color: #db222d;">i</span>
        <span style="color: #e3a005;">r</span>
        <span style="color: #0c3ad8;">u</span>
        {currentBeat >= 26 + 11/16 ? <>
          <span style="color: #00a70d;">s</span>
          <span style="color: #ef2832;">e</span>
          <span style="color: #e3a105;">s</span>
        </> : <></>}
      </span>
      {currentBeat >= 27 ? toolbarSeparator() : <></>}
      {currentBeat >= 27 + 2/16 ? toolbarButton(11, "That") + toolbarTextbox(333) : <></>}</>
    ) : <></>}
    {currentBeat >= 27 + 4/16 ? toolbarContainer(
      toolbarIcon(3) + toolbarIcon(4) + toolbarTextbox(165)
      + (currentBeat >= 27 + 6/16 ? toolbarSeparator() + toolbarButton(6, "Had") + toolbarIcon(7) : '')
      + (currentBeat >= 27 + 8/16 ? toolbarButton(5, "Left") + toolbarIcon(7) : '')
    ) : <></>}
    {currentBeat >= 28 ? <>
      <img src="/assets/image13_small.gif" style="
        image-rendering: pixelated;
        width: 400px;
        height: 260px;
      "/><p style="
        position: absolute;
        top: 131px;
        left: 332px;
        font-family: serif;
        color: black;
      ">{currentLoveText}</p>
    </> : flash};
    
    const progress = (currentBeat*4)%1;
    const bgOffset = Math.sqrt(32*32/2)*Math.pow(progress, 0.5);
    if (currentBeat < 28) {
      popups[2].document.getElementById("sad").style.transform = `scale(${Math.max(1.1 - progress/4, 1)})`;
      popups[2].document.getElementById("bg").style.transform = `translate(${-bgOffset}px, ${-bgOffset}px)`;
    }
    move(2, (1920 - 480)/2, (1080 - 360)/2);
    size(2, 480 + OFF_X, 360 - 4 + OFF_Y);
    
    if (currentBeat >= 26 && currentBeat < 31.5) {
      popups[4].document.body.innerHTML = coinGenerator.replace("-16", Math.sqrt(18*18*2/3)*currentBeat*4);
      move(4, 280 + Math.floor((currentBeat*8)%2)*16, 640 - Math.floor((currentBeat*8)%2)*16);
      size(4, 485 + OFF_X, 231 + OFF_Y);
    }
    if (currentBeat >= 27.9 && currentBeat < 31.5) {
      const heartColors = ["F4ABBA", "DD2E44", "F4900C", "FDCB59", "77B256", "5EAFEB", "AB8ED6"]
                        ?? ["F4ABBA", "DD2E44", "F4900C", "FDCB59", "77B256", "89C9F9", "5EAFEB", "AB8ED6", "31373D", "99AAB5", "E7E8E8", "C1694F"];
      const heartSVG = `<svg style="background: #637" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><path fill="#AA8ED6" d="M35.885 11.833c0-5.45-4.418-9.868-9.867-9.868-3.308 0-6.227 1.633-8.018 4.129-1.791-2.496-4.71-4.129-8.017-4.129-5.45 0-9.868 4.417-9.868 9.868 0 .772.098 1.52.266 2.241C1.751 22.587 11.216 31.568 18 34.034c6.783-2.466 16.249-11.447 17.617-19.959.17-.721.268-1.469.268-2.242z"/></svg>`.replace("#AA8ED6", `#${heartColors[Math.floor(Math.max(currentBeat-0.01,28.25)*4) % heartColors.length]}`);
      const mult = ((currentBeat*4+0.5) % 2 > 1) ? 1 : -1;
      const s1ze = [200 + OFF_X, 200 + OFF_Y];
      const hiddenWindow = (currentBeat < 28.4825) ? (mult === 1 ? 3 : 0) : -1;
      popups[0].document.body.innerHTML = heartSVG;
      popups[3].document.body.innerHTML = heartSVG;
      if (hiddenWindow === 0)
        move(0, 300, 650, true);
      else
        move(0, (1920 - s1ze[0])/2 + Math.sin(currentBeat*4*Math.PI)*360*mult, (1080 - s1ze[1])/2 + Math.cos(currentBeat*Math.PI)*240*mult, true);
      if (hiddenWindow === 3)
        move(3, 300, 650, true);
      else
        move(3, (1920 - s1ze[0])/2 - Math.sin(currentBeat*4*Math.PI)*360*mult, (1080 - s1ze[1])/2 - Math.cos(currentBeat*Math.PI)*240*mult, true);
      size(0, ...s1ze);
      size(3, ...s1ze);
    } else
      sillyHide(0);
  }
  
  if (oneTime(0, currentBeat, 31.5)) {
    sillyHide(0);
    sillyHide(1);
    sillyHide(2);
    sillyHide(3);
    sillyHide(4);
    setBackgroundTransColor("background-color 0s", "#FAF5AB");
  }
  
  if (oneTime(0, currentBeat, 31.75)) {
    size(1, 1280 + OFF_X, 720 + OFF_Y);
    move(1, (1920 - 1280 - OFF_X)/2, (1080 - 720 - OFF_Y)/2);
    navigatePopup(1, "https://" + "YAY-".repeat(98) + "yay");
    popups[2].document.body = <img style="width:100%; height:100%; background:#F3E488;" src="/assets/yay.png" />;
    size(2, 500 + OFF_X, 370 + OFF_Y);
    move(2, (1920 - 500 - OFF_X)/2 - 20, (1080 - 370 - OFF_Y)/2);
  }
  
  if (currentBeat >= 31.75 && currentBeat < 32) {
    size(2, 500 + OFF_X, 370 + OFF_Y);
    move(2, (1920 - 500 - OFF_X)/2 + ((currentBeat*32)%2 >= 1 ? 20 : -20), (1080 - 370 - OFF_Y)/2);
  }
  
  if (oneTime(0, currentBeat, 32)) {
    restorePopup(1);
    sillyHide(2);
    sillyHide(3);
    sillyHide(4);
    popups[0].document.body = <>
      <svg viewBox="0 0 512 512" id="gay" style="
        transform: scale(4) rotate(0deg);
        height: 100%;
        left: 0;
        right: 0;
        margin: 0 auto;
        position: absolute;
        filter: sepia(0.5);
      ">
        <g>
          <polygon fill="#FEFF00" points="260,258 463.8,-94.9 667.5,258"></polygon>
          <polygon fill="#0A7324" points="260,258 667.5,258 463.8,610.9"></polygon>
          <polygon fill="#005CFF" points="260,258 463.8,610.9 56.2,610.9"></polygon>
          <polygon fill="#730073" points="260,258 56.2,610.9 -147.5,258"></polygon>
          <polygon fill="#FE0000" points="260,258 -147.5,258 56.2,-94.9"></polygon>
          <polygon fill="#FE7426" points="260,258 56.2,-94.9 463.8,-94.9"></polygon>
        </g>
        <g>
          <polygon fill="#FEFF00" points="256,256 459.8,-96.9 663.5,256"></polygon>
          <polygon fill="#0A7324" points="256,256 663.5,256 459.8,608.9"></polygon>
          <polygon fill="#005CFF" points="256,256 459.8,608.9 52.2,608.9"></polygon>
          <polygon fill="#730073" points="256,256 52.2,608.9 -151.5,256"></polygon>
          <polygon fill="#FE0000" points="256,256 -151.5,256 52.2,-96.9"></polygon>
          <polygon fill="#FE7426" points="256,256 52.2,-96.9 459.8,-96.9"></polygon>
        </g>
      </svg>
      <img id="antonymph" style="
        position: absolute;
        height: 100%;
        left: 0;
        right: 0;
        margin: 0 auto;
        bottom: 0;
        z-index: 1;
        mix-blend-mode: overlay;
      "
      src="https://derpicdn.net/img/view/2021/8/16/2679669.gif"
      />
    </>;
    popups[2].document.body = <div style="width: 100%; height: 100%; background: #fe7426; font-family: Impact; font-size: 140px; padding: 0 18px; color: white; -webkit-text-stroke-width: 4px; -webkit-text-stroke-color: black; line-height: 157px; letter-spacing: -5px; white-space: nowrap"><span id="text">Don't care you think it's cringe</span></div>;
    popups[3].document.body = <div style="width: 100%; height: 100%; background: #feff00; font-family: Impact; font-size: 148px; padding: 0 16px; color: white; -webkit-text-stroke-width: 4px; -webkit-text-stroke-color: black; line-height: 160px; white-space: nowrap"><span id="text">BECAUSE ITS NOT YOUR LIFE</span></div>;
    // lolface vector recreation, feel free to use :)
    // might move the vector to a separate file
    popups[4].document.body = <>
      <div id="coverup" style="
        position: absolute;
        z-index: 1;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #fe0000;
      "></div>
      <svg id="lol" style="height: 100%; width: 100%; background: #c6efa1;" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" xml:space="preserve">
        <style>{`
          .st0 {
            fill: #ffdd4d;
            stroke: #000000;
            stroke-width: 10;
          }
          .st1 {
            fill: #ffffff;
          }
          .st2 {
            fill: #7f1943;
          }
          .st3 {
            fill: #ffc0e3;
          }
          .st4 {
            fill: none;
            stroke: #000000;
            stroke-width: 10;
          }
        `}</style>
        <circle id="Pancake" class="st0" cx="256.3" cy="256.3" r="238.2" />
        <g id="Fills">
          <path class="st1" d="M187.9,197.2c0,14.6-4.4,28-11.7,38.8c-60.2,0-58.2,0-95.5,0C73.3,225.2,69,211.7,69,197.2c0-35.9,26.6-65.1,59.5-65.1S187.9,161.2,187.9,197.2z" />
          <path class="st1" d="M400,209.6c0,9.3-1.4,18.2-4,26.4c-42,0-93-1.7-127.5-1.7c-2.3-7.8-3.5-16.1-3.5-24.7c0-42.8,30.2-77.4,67.5-77.4S400,166.8,400,209.6z" />
          <path class="st2" d="M101,291c9,217,335,200,288.7,0H80.4" />
        </g>
        <g id="Inner">
          <path d="M147,139l22.8,11.5L181,174C158,212,105,165,147,139z" />
          <path d="M354,139l22.8,11.5L388,174C365,212,312,165,354,139z" />
          <path class="st3" d="M197.5,435.1c28.1,11.9,58.9,14.7,92,10c27.3-5.7,51.7-18.4,73.6-36.8C341,353,221,339,197.5,435.1z" />
        </g>
        <g id="Lines">
          <path class="st4" d="M187.9,197.2c0,14.6-4.4,28-11.7,38.8c-60.2,0-58.2,0-95.5,0C73.3,225.2,69,211.7,69,197.2c0-35.9,26.6-65.1,59.5-65.1S187.9,161.2,187.9,197.2z" />
          <path class="st4" d="M400,209.6c0,9.3-1.4,18.2-4,26.4c-42,0-93-1.7-127.5-1.7c-2.3-7.8-3.5-16.1-3.5-24.7c0-42.8,30.2-77.4,67.5-77.4S400,166.8,400,209.6z" />
          <path class="st4" d="M101,291c9,217,335,200,288.7,0H80.4" />
        </g>
      </svg>
    </>;
  }
  
  if (oneTime(1, currentBeat, 34)) {
    popups[1].document.body = <img style="width:100%; height:100%;" src="/assets/fluttgirshy.png" />;
  }
  
  if (oneTime(0, currentBeat, 36)) {
    popups[0].document.getElementById("antonymph").style.display = "none";
    popups[0].document.getElementById("gay").style.filter = "";
  }
  
  if (currentBeat >= 32 && currentBeat < 40) {
    const currentColor = ["#FEFF00", "#0A7324", "#005CFF", "#730073", "#FE0000", "#FE7426"][Math.floor((currentBeat*4-2)%6)];
    const coverup = popups[4]?.document?.getElementById("coverup");
    if (background.style.background !== currentColor && currentBeat < 39.5) { // 39.625
      setBackgroundTransColor("background-color 0s", currentColor);
      if (coverup) coverup.style.background = currentColor;
    }
    
    size(0, 1680, 1000);
    move(0, (1920-(1680 + OFF_X))/2, (1080-1000)/2);
    if (currentBeat >= 36) {
      size(1, 551 + OFF_X, 491 + OFF_Y);
      //move(1, (1920-551)/2, (1080-491)/2 - OFF_Y - 3);
      move(1, (1920-551)/2 - OFF_X/2, (1080-491-OFF_Y)/2);
    } else {
      sillyHide(1);
    }
    
    const text1 = popups[2].document.getElementById("text");
    const text2 = popups[3].document.getElementById("text");
    
    if (currentBeat >= 37.875) {
      const words = [
        [37 + 14/16, "Don't"],
        [38, "care"],
        [38 + 1/16, "you"],
        [38 + 3/16, "think"],
        [38 + 6/16, "it's"],
        [38 + 8/16, "cringe"],
      ];
      text1.innerHTML = words.filter(e=>e[0]<=currentBeat).map(e=>e[1]).join(" ");
      const width = Math.min(1606, text1.getBoundingClientRect().width + 41);
      size(2, width + OFF_X, 160 + OFF_Y);
      move(2, 146 - OFF_X/2, 57);
    }
    const textFlashColor = currentBeat >= 39.5 ? ["#F0F", "#F00", "#696900", "#35FF3F",][Math.floor(currentBeat*16)%4] : "#F00";
    if (currentBeat >= 38.625) {
      const words = [
        [38 + 10/16, "<span>BE"],
        [38 + 12/16, "CAUSE "],
        [38 + 14/16, "ITS "],
        [39, `</span><span style="-webkit-text-stroke-color: white; color: ${textFlashColor};">NOT `],
        [39 + 3/16, "YOUR "],
        [39 + 8/16, "LIFE"],
      ];
      text2.innerHTML = words.filter(e=>e[0]<=currentBeat).map(e=>e[1]).join("") + '</span>';
      const width = Math.min(1606, text2.getBoundingClientRect().width + 35);
      size(3, width + OFF_X, 160 + OFF_Y);
      move(3, 146 - OFF_X/2, 784);
    }
    if (currentBeat >= 39.5) {
      size(4, 162 + OFF_X, 162 + OFF_Y);
      move(4, (1920-551)/2 + 142 - OFF_X/2, (1080-491-OFF_Y)/2 + 68);
      if (coverup) coverup.style.display = "none";
      // popups[4].document.getElementById("lol").style.background = textFlashColor;
    }
    
    // We have to do it this way because a CSS animation makes the SVG blurry
    const gayBackground = popups[0]?.document?.getElementById("gay");
    if (gayBackground)
      gayBackground.style.transform = `scale(4) rotate(${(Math.min(39.5,currentBeat)*360/1.5)%360}deg)`;
  }
  
  if (oneTime(4, currentBeat, 39))
    playPatternWithOffset(0, beatToMs(1 - (currentBeat - 39)));
  
  if (oneTime(0, currentBeat, 40)) {
    restorePopup(0, true);
    restorePopup(1, true);
    restorePopup(2, true);
    setBackgroundTransColor("background-color 0s", "#1A1721");
    popups[4].document.body = plain("#1A1721");
  }
  
  if (currentBeat >= 40 && currentBeat < 41) {
    sillyHide(0);
    sillyHide(1);
    sillyHide(2);
    sillyHide(3);
    sillyHide(4);
  }
}


/* beats 41 - 56 */
function part3(currentBeat) {
  if (oneTime(0, currentBeat, 41)) {
    setBackgroundTransColor("background-color 0s", "#FFA3CF");
    popups[4].document.body = plain("#FFA3CF");
    try {
      // This is just so ALSA default midi passthrough port on Linux won't get detected, it's okay to cheat with virtual midi :)
      midi?.outputs?.forEach(e=>{if (!e.name.includes("Midi Through Port"))unlockAchievement("musician");})
    } catch {}
  }
  
  if (currentBeat >= 41 && currentBeat < 46) {
    size(2, 380, 560);
    move(2, 1250, 460 + Math.floor((currentBeat*4)%2)*20);
    try {
      const messages = [
        ...(currentBeat >= 41 ? [[0, <>do you like waffles? :3</>]] : []),
        ...(currentBeat >= 42.25 && currentBeat < 42.5 ? [[1, <>hell</>]] : []),
        ...(currentBeat >= 42.5 ? [[1, <>hell yeah! &gt;w&lt;</>]] : []),
        ...(currentBeat >= 42.75 ? [[0, <>look what i found :o</>]] : []),
        ...(currentBeat >= 43 ? [[0, <a href="https://www.youtube.com/watch?v=ah7hxQIuwD8">youtube.com/watch?<br/>v=ah7hxQIuwD8</a>]] : []),
        ]
      if (currentBeat < 44)
        popups[2].document.body = tumblrChat("xxflutt-gir-shy + itsdashyy327", messages);
    } catch{}
    if (currentBeat > 43) {
      size(0, 1024-83, 768);
      move(0, (1920-(1024-83))/2, (1080-768)/2); /* center(0); */
      navigatePopup(0, "https://www.youtube.com/embed/ah7hxQIuwD8?autoplay=1&mute=1", false);
    }
  }
  
  if (oneTime(0, currentBeat, 43)) {
    popups[4].document.body = plain("#D6A8FF");
    setBackgroundTransColor("background-color 0s", "#D6A8FF");
  }
  
  if (oneTime(0, currentBeat, 45)) {
    // setBackgroundTransColor("background-color 0s", "#82A4A3"); // #82A4A3
  }
  
  if (oneTime(0, currentBeat, 47)) {
    // setBackgroundTransColor("background-color 0s", "#685369");
  }
  
  if (oneTime(2, currentBeat, 45)) {
    const onLoad = () => {
      setTimeout(()=>{
        document.getElementById('ios').style.filter = 'saturate(1) brightness(1)'
      }, 16);
      const ios_tme = document.getElementById('ios_tme');
      const ios_dte = document.getElementById('ios_dte');
      const date = window.opener.getDate();
      ios_tme.innerText = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
      ios_dte.innerText = date.toLocaleDateString(
        undefined /*'en-US'*/, {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        }
      );
      if ('getBattery' in navigator)
        navigator.getBattery().then((battery) => {
          document.querySelector('#ios_prc > p').innerText = Math.floor(battery.level*100) + '%';
          document.querySelector('#ios_ico').style.width = Math.floor(15*battery.level) + 'px';
        });
    }
    popups[2].document.body = <>
    <style>{`
      #ios {
        background: black;
        width: 100%;
        height: 100%;
        transition: filter 1s;
        filter: saturate(0) brightness(1.2);
      }
      .ios_abs {
        position: absolute; left: 0; top: 0;
      }
      .ios_txt {
        width: 100%;
        color: #EEE;
        font-family: sans-serif;
        text-align: center;
        z-index: 2;
      }
      #ios_sld {
        transition: left 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #ios_unl {
        transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        color: #555;
        font-family: sans-serif;
        font-size: 24px;
        opacity: 1;
      }
      #ios_prc {
        text-align: right;
        font-size: 11px;
        font-weight: 600;
        color: #C7C7C7;
        top: -7px;
        left: -26px;
      }
    `}</style>
    <div id="ios">
      <img class="ios_abs" src="/assets/iphone.png" style="z-index: 1;" onload="onLoad()" />
      <div class="ios_abs ios_txt" style="top:-50px; font-size:66px;"><p id="ios_tme"></p></div>
      <div class="ios_abs ios_txt" style="top:68px; font-size:18px;"><p id="ios_dte"></p></div>
      <p class="ios_abs" id="ios_unl" style="left:136px; top:400px; z-index:2;">slide to unlock</p>
      <img class="ios_abs" id="ios_sld" src="/assets/iphone_slide.png" style="left:46px /*250px*/; top:416px; z-index:3;" />
      <div class="ios_abs" id="ios_ico" style="left:342px; top:7px; background:#C7C7C7; width:15px; height:6px; z-index:3;"></div>
      <div class="ios_abs ios_txt" id="ios_prc"><p>100%</p></div>
    </div>
  </>;
  }
  
  if (oneTime(2, currentBeat, 45.75)) {
    popups[2].document.getElementById("ios_sld").style.left = "250px";
    popups[2].document.getElementById("ios_unl").style.opacity = 0;
    popups[2].document.getElementById("ios").style.filter = "saturate(1) brightness(0)";
  }
  
  if (oneTime(2, currentBeat, 46.25)) {
    const onLoad = () => {
      setTimeout(() => {
        document.getElementById('ds').style.filter = 'saturate(1) brightness(1)'
      }, 16);
    }
    popups[2].document.body = <>
      <style>{`
      #ds {
        transition: filter 0.5s;
        filter: saturate(0) brightness(0);
        image-rendering: pixelated;
      }`}</style>
      <img src="/assets/ds_top.png" id="ds" onload="onLoad" />
    </>;
    popups[1].document.body = <>
      <style>{`
        #ds {
          transition: filter 0.5s;
          filter:saturate(0) brightness(0);
          image-rendering: pixelated;
        }`
      }</style>
      <img src="/assets/ds_bottom.png" id="ds" onload="onLoad()" />
    </>;
    popups[3].document.body = <img style="width:100%; height:100%;" src="/assets/keychain.png" />;
  }
  
  if (currentBeat >= 46 && currentBeat < 48) {
    const progress = easeOutCubic(Math.min(1,2*(currentBeat-46)));
    size(2, 380, 560 - 280 * progress, true);
    size(1, 380, 140 + 140*progress, true);
    move(2, 1250, 140*progress + 320 + Math.floor((currentBeat*4)%2)*20, true);
    move(1, 1250, 280 + 460 + Math.floor((currentBeat*4)%2)*20);
    if (currentBeat >= 47) {
      size(3, 180, 235);
      move(3, 1250 + 264, 360 + 5 + Math.floor((currentBeat*4)%2)*10, true);
      // move(3, 1250 + 264, 360 + Math.sin(Math.PI*(0.4+((currentBeat*4)%2)))*20, true);
    }
  }
  
  if (oneTime(4, currentBeat, 47))
    playPatternWithOffset(1, beatToMs(1 - (currentBeat - 47)));
  
  // if (oneTime(4, currentBeat, 72.75)) skypeVideo.requestPictureInPicture();
  // if (oneTime(4, currentBeat, 73.25)) document.exitPictureInPicture();
  
  if (oneTime(0, currentBeat, 48.625)) {
    setBackgroundTransColor("background-color 0s", "#1A1721");
  }
  
  if (currentBeat >= 48.625 && currentBeat < 49) {
    focusPopup(4);
    const lifeColors = [
      "#B48DD0",
      "#FCACA2",
      "#FAC493",
      "#B6FC94",
      "#91E5D7",
      "#97CDFE",
    ];
    const offset = Math.floor((currentBeat - 48.625) * 2 * 4 * 6) % 6;
    size(4, 1000, 200);
    move(4, 1920/2 - 1000/2, 1080/2 - 200/2 + ((offset-3) * 100));
    try {
      popups[4].document.body.style.backgroundColor = "#1A1721";
      popups[4].document.body = <h1 style={`
        font-family: Arial, sans-serif;
        font-size: 90px;
        color: ${lifeColors[offset]};`
      }>
        sing a song about life
      </h1>;
    } catch {}
  }
  
  if (oneTime(1, currentBeat, 48.5)) {
    navigatePopup(0, "https://docs.google.com/spreadsheets/d/1KYNQqGmZVaHlDRM9bd42tOmgu4T50D3r5z87aluLwao/edit#gid=0&range=A1", true);
  }
  
  if (oneTime(0, currentBeat, 49)) {
    setBackgroundTransColor("background-color 0s", "#FFFFF0");
    popups[2].document.body = plain("#e43e2f");
    popups[4].document.body = plain("#FFFFF0");
  }
  
  if (oneTime(1, currentBeat, 49)) {
    //sillyHide(1);
    sillyHide(2);
    sillyHide(3);
    sillyHide(4);
    popups[1].document.body = <>
      <p id="fallen" style="
        position: absolute;
        left: 44px;
        top: 413px;
        z-index: 3;
        font-size: 14px;
        font-family: monospace;
        font-weight: bold;
        color: black;
      "></p>
      <div id="rainbow" style="
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg, rgba(255,0,0,1) 0%,
          rgba(255,154,0,1) 10%,
          rgba(208,222,33,1) 20%,
          rgba(79,220,74,1) 30%,
          rgba(63,218,216,1) 40%,
          rgba(47,201,226,1) 50%,
          rgba(28,127,238,1) 60%,
          rgba(95,21,242,1) 70%,
          rgba(186,12,248,1) 80%,
          rgba(251,7,217,1) 90%,
          rgba(255,0,0,1) 100%
        );
      "></div>
      <div id="base" style="
        position: absolute;
        left: -482px;
        top: -266px;
      ">
      <canvas id="paint" width="1590" height="720" style="
        position: absolute;
        left: 0;
        top: 0;
        z-index: 1;
        mix-blend-mode: screen;
      "></canvas>
      <canvas id="curse" width="1590" height="720" style="
        position: absolute;
        left: 0;
        top: 0;
        z-index: 2;
      "></canvas>
      </div>
    </>;
    popups[1].window.lastFrame = -1;
    popups[1].window.currentArea = [482, 266, 180, 180];
    // move(1, 96, 440);
    // size(1, 1272 + OFF_X, 520 + OFF_Y);
    move(1, 96 + 482, 480 + 266);
    size(1, 180 + OFF_X, 180 + OFF_Y);
  }
  
  if (currentBeat >= 49 && currentBeat < 50.75) {
    const beatFrame = Math.floor(beatToMs(currentBeat-49)/(1000/60));
    let canvas = popups[1]?.document?.getElementById('paint');
    while (canvas && popups[1].window.lastFrame < beatFrame) {
      const frame = popups[1].window.lastFrame + 1;
      const brushpath = [[900,759],[901.5,745],[906,674],[907.5,618.5],[907.5,573],[906.5,405.5],[907,331.5],[904.5,275],[902,261],[903.5,262],[901.5,275.5],[907.5,358.5],[910.5,427.5],[914,549],[914,630],[908.5,708],[899.5,768.5],[898.5,778],[899.5,772],[902,727.5],[905.5,677.5],[914.5,554.5],[930.5,460],[949,374.5],[950.5,356.5],[950.5,356],[936.5,373],[906.5,420.5],[866,477],[841.5,509.5],[805.5,559],[793,582.5],[803,580.5],[869,551.5],[953.5,515.5],[1007,495],[1060,476],[1059.5,476.5],[1000.5,506],[934,530.5],[851.5,558.5],[726.5,602],[670.5,623],[665,626.5],[696,625],[752.5,617],[893,595],[987,575.5],[1048.5,554.5],[1048.5,539],[1025,516],[937.5,457.5],[836.5,395.5],[753.5,344],[738,336.5],[735,335],[755,358],[806.5,409],[883.5,487],[960.5,565.5],[1019.5,628.5],[1057.5,675],[1061.25,680],[1056.25,671],[1032.5,641],[995,594.25],[896,486.25],[835.5,423.75],[769,364.25],[769,364.75],[776.75,375.75],[851.25,445],[905.75,494],[996.25,577.75],[1049.5,626.75],[1070.5,648.75],[1071.25,660.25],[1045.5,665],[945.25,666.75],[865,663.75],[809.25,663.5],[698.75,647],[694.75,639.25],[719.25,601.75],[825.25,531.25],[1001.75,449.75],[1101.25,407.75],[1282.75,337.25],[1328.75,315.25],[1310.25,326.25],[1234.25,367.75],[1014.25,470.75],[845.75,544.75],[581.25,663.75],[481.25,713.75],[467.75,721.75],[519.25,701.75],[604.25,662.25],[829.75,553.75],[1020.25,462.75],[1151.25,410.25],[1171.75,407.25],[1161.75,421.75],[1091.25,467.75],[937.25,534.25],[792.75,574.75],[636.25,596.25],[475.75,593.25],[351.75,549.25],[354.25,532.25],[381.75,515.25],[483.25,514.25],[566.25,530.75],[799.75,587.75],[1033.25,636.75],[1304.25,672.25],[1352.75,671.75],[1357.25,669.75],[1295.25,642.25],[1203.25,618.75],[1046.75,585.25],[664.25,513.75],[513.75,493.75],[419.75,488.75],[424.25,489.75],[516.75,501.25],[656.75,513.25],[906.75,525.75],[1243.75,530.25],[1302.75,530.75],[1445.25,532.75],[1420.25,534.25],[1357.25,533.75],[1095.25,521.75],[1006.25,515.25],[414,473.75],[301.5,464.75],[271,461.75],[322,456.25],[466,456.75],[807.5,456.75],[1293,444.75],[1530,431.25],[1713.5,408.25],[1738,397.75],[1682,389.25],[1478.5,385.25],[1132.5,404.25],[726.461,460.978],[320.5,523.25],[185,552.25],[162.5,557.75],[213.5,545.75],[430,494.25],[729,431.25],[992.5,393.25],[1101.5,400.75],[1096.5,436.75],[992.5,531.25],[853.5,616.75],[796,648.25],[519,782.75],[508,782.25],[595.5,700.25],[792.5,560.75],[992.25,439],[1338.25,283],[1423.75,263],[1460.75,290.5],[1451.75,305],[1338.25,414],[841.25,715.5],[609.25,823],[457.75,877.5],[413.75,886.5],[454.75,859.5],[957.25,620.5],[1372.75,456.25],[1706.5,344.5],[1787.75,325.75],[1787.75,342.25],[1532,469.25],[1443.5,507.75],[936.5,731.75],[631.5,903.75],[653,916.75],[944,868.75],[1182,820.75],[1816.75,672.75]];
      const lineart = [[898.5,773],[900.268,770.912],[900.821,753.781],[903.75,717.875],[905.5,663.5],[908.5,594],[906.5,413.5],[907.5,349.5],[906.5,317.5],[906.5,306.5],[906.5,306.5],[906.5,306.5],[906.5,306.5],[911,386],[916,539.5],[915.5,589],[913,666],[909,708.5],[904,733],[904,733],[904,733],[904,733],[914.256,606.974],[930,479],[940,416],[943,399.5],[943,399.5],[943,399.5],[932,407.5],[908,430.25],[870.5,475.25],[818,545],[818,545],[818,545],[845.25,545.25],[884,537.75],[999,497.5],[1014.25,493],[1017.5,491.75],[1017.5,491.75],[976.5,513.25],[836.25,564.25],[774.117,586.353],[704,612],[704,612],[704,612],[756.75,612],[850.517,600.118],[944.75,585],[1007.25,568.5],[1013.5,565.25],[1012.5,545],[966.5,488.75],[837.5,397.25],[790.5,367.75],[773.5,357.75],[773.5,357.75],[773.5,357.75],[793.5,387],[833.5,431.25],[872,472.25],[990.5,598.75],[1021.5,631.25],[1033,646.25],[1033,646.25],[1033,646.25],[989.75,590.25],[926.25,519.75],[827.25,416.25],[801.75,392.75],[801.75,392.75],[801.75,392.75],[870.499,461.499],[914.749,505.749],[964.25,547.75],[992.25,572.75],[1045,624.25],[1045,624.25],[1045,624.25],[1028.25,641],[987.5,654.75],[794,662],[749,656.75],[735.5,653.5],[729.5,642.25],[761.75,582.5],[963.25,467],[1064.25,425.5],[1277,338.5],[1289.5,333.25],[1289.5,333.25],[1248.75,358.25],[1168.75,400.75],[888.75,528.75],[622.25,645.25],[551.25,679.75],[508.25,702],[508.25,702],[563,680],[786.5,575],[988.5,479.5],[1089.5,433],[1129.5,421.75],[1129.5,421.75],[1119.5,436.5],[1067.75,477],[939.25,532.5],[685.25,589.5],[453.75,588.5],[407.75,576.5],[385.25,566],[384.25,560],[396.75,541.5],[522.75,528],[767.75,580.5],[1119.25,652.5],[1191.25,661.25],[1261.25,669],[1313.25,670],[1313.25,670],[1247.75,636],[1090.25,594],[808.754,538.501],[526.25,497],[503.75,494.25],[482.25,492.5],[550.667,497.167],[660.082,507.833],[794.75,521.5],[1085.25,528],[1379.75,531.5],[1401.75,531.5],[1401.75,531.5],[1401.75,531.5],[1301.75,532],[1025.75,518],[752.75,496],[460.75,476.5],[314.75,466.5],[314.75,466.5],[419.25,460],[762.25,457],[1123.26,450.5],[1484.25,432],[1671.25,414],[1694.25,408.5],[1608.09,391.75],[1497.92,388.5],[1388.75,390.25],[1271.25,395],[812.258,447.999],[281.75,532],[231.25,543],[200.416,549.5],[385.25,505.5],[698.755,436.999],[979.25,395.5],[1054.5,395.5],[1071.75,402.5],[1068.25,432],[1039.25,490],[897.75,591.5],[742.75,677.5],[654.248,724.751],[550.25,770.5],[570.25,735.5],[794.746,557.003],[1048.25,407.5],[1349.25,278.5],[1427.75,266.5],[1431.25,281.001],[1368.75,381],[1135.75,550.498],[882.75,694],[699.503,781.999],[504.25,864],[455.75,877.5],[498.75,842],[812.75,681],[1407.25,442],[1748.25,336],[1770.58,332.334],[1725.91,369.418],[1491.75,490.5],[1409.25,523],[1191.75,616.499],[977.25,713],[901.75,750.5],[663.75,883],[900.75,875],[1774.75,681]];
      let ctx = canvas.getContext('2d');
      if (!frame) {
        ctx.fillStyle = '#FFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const offsetArt = ([x,y]) => [(x - 190)*0.8, (y - 260)*0.8];
      const f1 = offsetArt(lineart[Math.min(lineart.length-1,Math.floor(frame))]);
      const f2 = offsetArt(lineart[Math.min(lineart.length-1,Math.floor(frame + 1))]);
      ctx.beginPath();
      ctx.moveTo(...f1);
      ctx.lineTo(...f2);
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      // const temp = 255 -(frame + 30);
      // ctx.strokeStyle = `rgb(${temp}, ${temp}, ${temp})`;
      ctx.stroke();
      canvas = popups[1].document.getElementById('curse');
      ctx = canvas.getContext('2d');
      const brushframe = brushpath?.[frame+1];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (brushframe) {
        const offsetbf = offsetArt(brushframe);
        let tracer = f2;
        const diff = offsetbf.map((e,i)=>e-f2[i]);
        const dist = Math.hypot(...diff);
        const limit = 45;
        if (dist > limit)
          tracer = offsetbf.map((e,i) => e - diff[i]*(limit/dist));
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tracer[0], tracer[1] - 5);
        ctx.lineTo(tracer[0], tracer[1] + 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tracer[0] - 5, tracer[1]);
        ctx.lineTo(tracer[0] + 5, tracer[1]);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(...offsetbf);
        ctx.lineTo(...tracer);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(...offsetbf, 5, 0, 2 * Math.PI, false);
        ctx.stroke();
        // popups[1].window.currentArea = [482, 266, 180, 180];
        let currentArea = [...popups[1].window.currentArea];
        let setNewCurrentArea = false;
        if (offsetbf[0] >= 0 && offsetbf[0] < currentArea[0]) {
          currentArea[2] += offsetbf[0] - currentArea[0];
          currentArea[0] = offsetbf[0];
          setNewCurrentArea = true;
        }
        if (offsetbf[1] >= 0 && offsetbf[1] < currentArea[1]) {
          currentArea[3] += offsetbf[1] - currentArea[1];
          currentArea[1] = offsetbf[1];
          setNewCurrentArea = true;
        }
        if (offsetbf[0] > currentArea[0] + currentArea[2]) {
          currentArea[2] += offsetbf[0] - (currentArea[0] + currentArea[2]);
          setNewCurrentArea = true;
        }
        if (offsetbf[1] > currentArea[1] + currentArea[3]) {
          currentArea[3] += offsetbf[1] - (currentArea[1] + currentArea[3]);
          setNewCurrentArea = true;
        }
        if (setNewCurrentArea && move(1, 96 + currentArea[0], 480 + currentArea[1], true)) {
          popups[1].window.currentArea = currentArea;
          const base = popups[1].document.getElementById("base");
          base.style.left = `-${currentArea[0]}px`;
          base.style.top = `-${currentArea[1]}px`;
          size(1, currentArea[2] + OFF_X, Math.min(currentArea[3] + OFF_Y, screen.availHeight/2 + 85), true);
        }
      }
      popups[1].window.lastFrame = frame;
    }
  }
  
  if (currentBeat >= 50.75 && currentBeat < 52.375) {
    size(1, popups[1].window.currentArea[2] + OFF_X - 134*[
      [50.75, 0],
      [51.375, 1],
      [51.625, 2],
      [51.75, 3],
      [51.875, 4],
      [52, 5],
      [52.25, 6],
      [52.375, 7],
    ].filter(l => l[0] <= currentBeat).at(-1)[1], Math.min(popups[1].window.currentArea[3] + OFF_Y, screen.availHeight/2 + 85));
    const epicText = `I've fallen in love with life\nand I don't know if I'm worried\nabout what happens next`;
    popups[1].document.getElementById("fallen").innerText = epicText.slice(0, epicText.length*(currentBeat-50.75));
  }
  
  if (oneTime(1, currentBeat, 52.375)) {
    sillyHide(1);
    popups[1].document.body = plain();
  }
  
  if (currentBeat >= 48.75 && currentBeat < 56.75) {
    const time2cell = [
        [0, "A1"],
        [48.875, "B1"],
        [49, "C1"],
        [49.25, "D1"],
        [49.5, "E1"],
        [49.75, "F1"],
        [49.875, "G1"],
        [50, "H1"],
        [50.125, "I1"],
        [50.25, "J1"],
        [50.375, "K1"],
        [50.5, "A1"],
        //
        [50.625, "A2"],
        [50.75, "B2"],
        [50.875, "C2"],
        [51, "D2"],
        [51.125, "E2"],
        [51.25, "F2"],
        [51.375, "G2"],
        [51.625, "H2"],
        [51.75, "I2"],
        [51.875, "J2"],
        [52, "K2"],
        [52.25, "L2"],
        [52.375, "M2"],
        //
        ...["M2","L2","K2","J2","I2","H2","G2","F2","E2","D2","C2","B2","A2", ...[...Array(32).keys()].slice(3).map(a=>"A"+a)].map((e,i)=>[52.5+(i/42)*0.325, e]),
        //
        [52.875, "A32"],
        [53, "B32"],
        [53.25, "C32"],
        [53.5, "D32"],
        [53.75, "E32"],
        [54, "F32"],
        [54.25, "G32"],
        [54.5, "H32"],
        //
        ...["G32","F32","E32","D32","C32","A32", ...[...Array(61).keys()].slice(33).map(a=>"A"+a)].map((e,i)=>[54.55+(i/34)*0.20, e]),
        //
        [54.75, "E61"],
        [54.875, "E62"],
        [55, "E63"],
        [55.125, "E64"],
        [55.25, "E65"],
        [55.375, "E66"],
        [55.5, "E67"],
        [55.625, "E68"],
        [55.75, "E69"],
        [55.875, "E70"],
        //
        [56, "A111"],
        [56.25, "A112"],
        [56.5, "A113"],
    ];
    navigatePopup(0, "https://docs.google.com/spreadsheets/d/1KYNQqGmZVaHlDRM9bd42tOmgu4T50D3r5z87aluLwao/edit#gid=0&range=" + time2cell.filter(l => l[0] <= currentBeat).at(-1)[1], false);
  }
  
  if (oneTime(0, currentBeat, 54.75)) {
    setBackgroundTransColor("background-color 1.5s", "#000");
  }
  
  if (oneTime(0, currentBeat, 55)) {
    popups[4].document.body = plain("#000");
  }
  
  if (oneTime(0, currentBeat, 56)) {
    setBackgroundTransColor("background-color 0s", "#e43e2f");
    // setBackgroundTransColor("background-color 1s cubic-bezier(0,0.5,0,1)", "#e43e2f");
  }
  
  if (oneTime(0, currentBeat, 56.75)) {
    restorePopup(0);
    sillyHide(0);
  }
  
  //if (oneTime(3, currentBeat, 54.75)) {
  if (oneTime(3, currentBeat, 56)) {
    popups[3].document.body = notepad("");
    popups[4].document.body = notepad("");
    size(3, 600, 200);
    size(4, 600, 200);
    move(3, 150, 300);
    move(4, 150, 700);
    focusPopup(4);
    focusPopup(3);
  }
  /*
  if (oneTime(3, currentBeat, 55.5)) {
    size(3, 600, 200);
    move(3, 150, 300);
    focusPopup(3);
  }
  if (oneTime(4, currentBeat, 55.75)) {
    size(4, 600, 200);
    move(4, 150, 700);
    focusPopup(4);
  }
  */
}

/* beats 56 - 81 */
function part4(currentBeat) {
  if (currentBeat >= 56 && currentBeat < 57.25) {
    const text1 = `So long as someone's interests and pursuits do no harm,\n` +
                  `why should anyone ridicule and judge them for it?\n` +
                  `Fuck cringe culture and fuck the egocentric world I was encouraged by`;
    const text2 = `Fuck perfectionism, fuck the pressure, go out and do\n` +
                  `whatever the fuck makes you happy. Everytime some\n` +
                  `asshole tries to shut you down, hold steady to your love for being alive`;
    popups[3].document.body = notepad(text1.substring(0, Math.min(1, currentBeat-56)*text1.length));
    popups[4].document.body = notepad(text2.substring(0, Math.min(1, currentBeat-56)*text2.length));
    // size(3, 600, 200);
    // size(4, 600, 200);
    // move(3, 150, 300);
    // move(4, 150, 700);
    // focusPopup(3);
    // focusPopup(4);
  }
  
  if (oneTime(0, currentBeat, 57))
    for (let i = 0; i < 3; i++)
      popups[i].document.body = <img style="width:100%; height:100%;" src={`/assets/frog_${i+1}.png`} />;
      
  if (currentBeat >= 57 && currentBeat < 64) {
    const progress = easeOutCubic(Math.min(1, currentBeat - 57) - Math.max(currentBeat - 63, 0));
    for (let i = 0; i < 3; i++) {
      move(i, Math.sin(currentBeat*Math.PI + i)*400*progress + 1000, Math.cos(currentBeat*Math.PI + i*1.5)*300*progress + 440, true);
      size(i, 100, 200, true);
    }
    
    if (currentBeat >= 63) {
      size(3, 600*progress + 100*(1-progress), 200, true);
      size(4, 600*progress + 100*(1-progress), 200, true);
      move(3, 150*progress + 1000*(1-progress), 300*progress + 440*(1-progress), true);
      move(4, 150*progress + 1000*(1-progress), 700*progress + 440*(1-progress), true);
    }
  }
  
  if (oneTime(0, currentBeat, 64)) {
    // restorePopup(0, true);
    sillyHide(0);
    sillyHide(1);
    sillyHide(2);
    sillyHide(3);
    sillyHide(4);
    focusPopup(0);
    focusPopup(1);
    focusPopup(2);
    focusPopup(3);
    focusPopup(4);
    popups[0].document.body = <video
      style="width:100%;height:100%;"
      src="/assets/gangnam-style-gif.mp4"
      muted autoplay loop disableRemotePlayback
    />;
    popups[1].document.body = <img
      style="width:100%;height:100%;"
      src="/assets/door-left.jpg"
    />;
    popups[2].document.body = <img
      style="width:100%;height:100%;"
      src="/assets/door-right.jpg"
    />;
  }
  
  if (currentBeat >= 64.75 && currentBeat < 66.75) {
    const doorsOpen = Math.min(1, currentBeat - 64.75) - Math.max(currentBeat - 66, 0)/0.75;
    move(0, (1920-514)/2, (1080-354)/2); /* center(0); */
    size(0, 514, 354);
    // size(1, 93 + 16, 354);
    // size(2, 93 + 16, 354);
    size(1, 178, 354);
    size(2, 178, 354);
    move(1, 1920/2 - 155 - 120*doorsOpen, 1080/2 - 354/2, true);
    move(2, 1920/2 + 120*doorsOpen, 1080/2 - 354/2, true);
  }
  
  if (currentBeat >= 66.75 && currentBeat < 67) {
    setBackgroundTransColor("background-color 0s", "#000");
    sillyHide(0);
    sillyHide(1);
    sillyHide(2);
  }
  
  const kittens = [
      [
        [7, "kitten_1.png", 103, 184, false], // 9
        [1, "kitten_1.png", 103, 184 - 20, false], // 2
        [7, "kitten_1.png", 103, 184, true], // 9
        [1, "kitten_1.png", 103, 184 - 20, true], // 2
      ],
      [
        [4, "kitten_2a.png", 139, 183, false], // 5
        [4, "kitten_2b.png", 109, 165, false], // 5
        [6, "kitten_2a.png", 139, 183, true], // 6
        [2, "kitten_2b.png", 109, 165, false], // 3
        [6, "kitten_2a.png", 139, 183, true], // 6
        [6, "kitten_2c.png", 85, 170, false], // 6
        [6, "kitten_2a.png", 139, 183, true], // 6
        [6, "kitten_2c.png", 85, 170, true], // 6
      ],
      [
        [8, "kitten_3a.png", 101, 187, false], // 8
        [6, "kitten_3b.png", 76, 208, false], // 6
        [6, "kitten_3a.png", 101, 187, true], // 6
        [6, "kitten_3b.png", 76, 208, true], // 6
      ],
      [
        [4, "kitten_4a.png", 77, 128, false], // 2, 5
        [6, "kitten_4b.png", 97, 117, false], // 6
        [6, "kitten_4a.png", 77, 128, false], // 6
        [8, "kitten_4b.png", 97, 117, false], // 7
        [6, "kitten_4a.png", 77, 128, false], // 5
        [6, "kitten_4b.png", 97, 117, true], // 5
      ],
      [
        [1, "kitten_car.png", 397, 224, false],
      ]
    ];
  
  if (oneTime(0, currentBeat, 66.75))
    for (let i = 0; i < 5; i++)
      popups[i].document.body = <img id="kitten" style="width:100%; height:100%; image-rendering:pixelated;" src={`/assets/${kittens[i][0][1]}`} />;
  
  if (currentBeat >= 67 && currentBeat < 72.25) {
    const imageFrame = Math.floor((currentBeat - 67)*64);
    const currentBackground = `rgb(${["0,173,195","254,254,254","0,130,196","255,115,250","0,173,195","0,130,196","0,166,87","253,143,0","139,187,142","0,83,143","139,184,90","0,130,196","255,106,90"][Math.floor((currentBeat-67)*2)]})`;
    if (background.style.backgroundColor !== currentBackground)
      setBackgroundTransColor("background-color 0.2s", currentBackground);
    for (let i = 0; i < 4; i++) {
      const kitten = popups[i]?.document?.getElementById("kitten");
      if (!kitten) continue;
      kitten.style.background = currentBackground;
      if (i !== Math.floor((currentBeat-67)/5*4) && (i < 3 || currentBeat < 72)) {
        sillyHide(i);
        continue;
      }
      const frameCount = kittens[i].reduce((a, c) => a + c[0], 0);
      const currentFrame = imageFrame % frameCount;
      let count = 0;
      let img;
      for (const x of kittens[i]) {
        count += x[0];
        if (currentFrame <= count) {
          img = x;
          break;
        }
      }
      const imgSrc = `/assets/${img[1]}`;
      if (kitten.src !== imgSrc)
        kitten.src = imgSrc;
      kitten.style.transform = img[4] ? "scaleX(-1)" : "";
      const scalar = 2 + ((currentBeat - 67) >= 4 ? (currentBeat - 70) : ((currentBeat - 67) % 1.25));
      const w = Math.floor(img[2]*scalar/8)*8;
      const h = Math.floor(img[3]*scalar/8)*8;
      size(i, w + OFF_X, h + OFF_Y, true);
      move(i, (1920 - w - OFF_X)/2, (1080 - h - OFF_Y)/2, true);
      // move(i, 100 + i*400 - (w+OFF_X)/2, 400, true);
    }
    if (currentBeat >= 69 && currentBeat < 71) {
      const currentCarBeat = currentBeat/2 + 0.5;
      const direction = currentCarBeat % 1 > 0.5;
      const pos = (direction ? 1 -  currentCarBeat % 1 : currentCarBeat % 1)*2;
      const kitten = popups[4]?.document?.getElementById("kitten");
      if (kitten) {
        kitten.style.background = currentBackground;
        kitten.style.transform = direction ? "" : "scaleX(-1)";
        const w = 397*1.5;
        const h = 224*1.5;
        size(4, w + OFF_X, h + OFF_Y);
        move(4, Math.floor(pos*(1920 - w - OFF_X)/16)*16, Math.floor((1000 - h - OFF_Y - 100 - 100*Math.sin(currentBeat*12))/16)*16, true);
      } else {
        for (let i = 0; i < 5; i++) {
          try {
            popups[i].document.body = <img id="kitten" style="width:100%; height:100%; image-rendering:pixelated;" src={`/assets/${kittens[i][0][1]}`} />;
          } catch {}
        }
      }
    } else {
      sillyHide(4);
      const kitten = popups[4]?.document?.getElementById("kitten");
      if (kitten)
        kitten.style.background = currentBackground;
    }
  }
  if (oneTime(0, currentBeat, 72.5)) {
    popups[0].document.body = <>
      <style>{`
        @font-face{
          font-family: "sans undertale";
          src: url("/assets/DeterminationSansWeb.woff");
        }
        .transTrans {
          transition: transform 0.25s;
        }
        .perfectTrans {
          transition: opacity 0.5s;
        }
        #scoreContainer {
          width: 100%;
          position: absolute;
          top: 385px;
          left: 0;
          text-align: center;
          z-index: 4;
        }
        #score {
          color: white;
          font-size:96px;
          font-family: "sans undertale", monospace;
        }
        #excellent {
          position:absolute;
          /* top:370px; */
          top: 35px;
          left:405px;
          z-index: 4;
          transform: scale(1.8) rotate(0deg);
        }
        #steam {
          transition: bottom 0.5s;
        }
        .geforce {
          position:absolute;
          width: 300px;
          height: 90px;
          top: 100px;
          right: -300px;
          z-index: 4;
          transition: right 0.5s;
          color: white;
          font-family: sans-serif;
        }
        #geforceCube {
          position:absolute;
          width: 56px;
          height: 56px;
          top: 17px;
          left: 14px;
          background: #1E1E1E;
        }
      `}</style>
      <div style="width:100%; height:100%; background:#66160B;"></div>
      <div class="perfectTrans" id="event" style="width:100%; height:100%; background:no-repeat center url(/assets/event_mode.png) #000; position:absolute; top:0; left:0; z-index:99; opacity:1;"></div>
      <img src="/assets/receptor.png" class="receptor" id="r0" style="position:absolute; top:100px; left:080px; z-index:2; transform:rotate(270deg);" />
      <img src="/assets/receptor.png" class="receptor" id="r1" style="position:absolute; top:100px; left:280px; z-index:2; transform:rotate(180deg);" />
      <img src="/assets/receptor.png" class="receptor" id="r2" style="position:absolute; top:100px; left:480px; z-index:2; transform:rotate(000deg);" />
      <img src="/assets/receptor.png" class="receptor" id="r3" style="position:absolute; top:100px; left:680px; z-index:2; transform:rotate(090deg);" />
      <img src="/assets/perfect.png" class="perfect" id="p0" style="position:absolute; top:24px; left:004px; z-index:5; transform:rotate(270deg); opacity:0;" />
      <img src="/assets/perfect.png" class="perfect" id="p1" style="position:absolute; top:24px; left:204px; z-index:5; transform:rotate(180deg); opacity:0;" />
      <img src="/assets/perfect.png" class="perfect" id="p2" style="position:absolute; top:24px; left:404px; z-index:5; transform:rotate(000deg); opacity:0;" />
      <img src="/assets/perfect.png" class="perfect" id="p3" style="position:absolute; top:24px; left:604px; z-index:5; transform:rotate(090deg); opacity:0;" />
      <img src="/assets/steam.png" id="steam" style="position:absolute; bottom:-70px; right:0; z-index:5;" />
      <div class="geforce" id="geforcegreen" style="background:#5CBB24; z-index:3;"></div>
      <div class="geforce" id="geforce" style="background:black;">
        <div id="geforceCube">
          <img src="/assets/arrow.png" style="width:100%; height:100%; filter:hue-rotate(84deg); transform:scale(0.9);" />
        </div>
        <p style="margin-left:83px; margin-top:19px;">
          Press Alt+z to use GeHorse<br/>
          Experience in-groove<br/>
          overlay
        </p>
      </div>
      <img src="/assets/excellent.png" id="excellent" style="opacity:0;" />
      <div id="scoreContainer"><p id="score" style="opacity:0;">0</p></div>
    </>;
    popups[1].document.body = <>
      <div style="width:100%; height:100%; background:#66160B;"></div>
      <img src="/assets/arrow.png" id="arrow" style="position:absolute; top:0; left:0; z-index:2; transform:rotate(270deg);" />
      <img src="/assets/hoId.png" id="hoId" style="position:absolute; top:-43px; left:-43px; z-index:3; transform:rotate(270deg); opacity:0;" />
      <img src="/assets/hold.png" id="hold" style="position:absolute; top:100px; left:0; z-index:1; opacity:0;" />
      <img src="/assets/aim.png" style="width:100%; height:100%; position:absolute; top:0; left:0; z-index:10;" />
    </>;
  }
  if (oneTime(1, currentBeat, 72.25)) {
    for (let i = 2; i < 5; i++)
      popups[i].document.body = <>
        <div style="width:100%; height:100%; background:#66160B;"></div>
        <img src="/assets/arrow.png" id="arrow" style={`position:absolute; top:0; left:0; z-index:2; transform:rotate(${[270,180,0,90][i-1]}deg);`} />
        <img src="/assets/hoId.png" id="hoId" style={`position:absolute; top:-43px; left:-43px; z-index:3; transform:rotate(${[270,180,0,90][i-1]}deg); opacity:0;`} />
        <img src="/assets/hold.png" id="hold" style="position:absolute; top:100px; left:0; z-index:1; opacity:0;" />
      </>;
    for (let i = 0; i < 5; i++)
      sillyHide(i);
    setBackgroundTransColor("background-color 0s", `#000`);
  }
  
  if (currentBeat >= 72.5 && currentBeat < 72.75) {
    move(1, 1240, 200);
    size(1, 351 + OFF_X, 297 + OFF_Y);
    
    move(0, (1920-960)/2, 50 + (1-easeOutCubic(4*(currentBeat-72.5)))*100, true);
    size(0, 960 + OFF_X, 720 + OFF_Y);
  }
  if (oneTime(0, currentBeat, 72.75)) {
    popups[0].document.getElementById("event").style.opacity = 0;
    popups[0].document.getElementById("steam").style.bottom = "0px";
    setBackgroundTransColor("background-color 0.5s", `#2D0307`);
    popups[1].document.body = <>
      <div style="
        width: 100%;
        height: 100%;
        background: #66160B;
      "></div>
      <img
        src="/assets/arrow.png"
        id="arrow"
        style="
          position: absolute;
          top: 0;
          left: 0;
          z-index: 2;
          transform: rotate(270deg);
        "
      />
      <img
        src="/assets/hoId.png"
        id="hoId"
        style="
          position: absolute;
          top: -43px;
          left: -43px;
          z-index: 3;
          transform:rotate(270deg);
          opacity: 0;
        "
      />
      <img
        src="/assets/hold.png"
        id="hold"
        style="
          position: absolute;
          top: 100px;
          left: 0;
          z-index: 1;
          opacity: 0;
        "
      />
    </>;
    for (let i = 0; i < 5; i++)
      popups[i].document.body.onkeydown = (e) => {if (!e?.repeat) popups[4].window.lastKey = e.keyCode};
    popups[4].window.score = 0;
    popups[4].window.hits = [];
  }
  
  if (oneTime(0, currentBeat, 74.75)) {
    popups[0].document.getElementById("steam").style.bottom = "-70px";
    popups[0].document.getElementById("geforcegreen").style.right = "0px";
  }
  
  if (oneTime(0, currentBeat, 75))
    popups[0].document.getElementById("geforce").style.right = "-5px";
  if (oneTime(0, currentBeat, 76.25))
    popups[0].document.getElementById("geforce").style.right = "-300px";
  if (oneTime(0, currentBeat, 76.35))
    popups[0].document.getElementById("geforcegreen").style.right = "-300px";
  
  if (currentBeat >= 72.75 && currentBeat < 81) {
    /* Cleaner beats, 1:1 with the music, not the chart
    const nectarBeats = [
      [73 + 1/16, 1/16],
      [73 + 2/16, 1/16],
      [73 + 3/16, 1/16],
      [73 + 5/16, 1/16],
      [73 + 6/16, 1/16],
      [73 + 7/16, 1/16],
      [73 + 9/16, 1/16],
      [73 + 10/16, 1/16],
      [73 + 11/16, 1/16],
      [73 + 13/16, 1/16],
      [73 + 14/16, 1/16],
      [73 + 15/16, 1/16],
      [74 + 1/16, 3/16],
      [74 + 5/16, 3/16],
      [74 + 9/16, 3/16],
      [74 + 13/16, 3/16],
      [75 + 1/16, 2/16],
      [75 + 5/16, 2/16],
      [75 + 9/16, 2/16],
      [75 + 13/16, 2/16],
      [76 + 1/16, 3/16],
      [76 + 5/16, 3/16],
      [76 + 9/16, 3/16],
      [76 + 13/16, 3/16],
      [77 + 2/16, 2/16],
      [77 + 6/16, 2/16],
      [77 + 10/16, 2/16],
      [78 + 2/16, 2/16],
      [78 + 6/16, 2/16],
      [78 + 10/16, 2/16],
      [79 + 2/16, 2/16],
      [79 + 6/16, 2/16],
      [79 + 10/16, 2/16],
      [79 + 14/16, 2/16],
      [80 + 2/16, 2/16],
      [80 + 6/16, 2/16],
      [80 + 10/16, 6/16],
    ];
    */
    // beat, length, arrowId, hold, rotate
    const nectarBeats = [
      [73 + 1/16, 1/16, 0, false],
      [73 + 2/16, 1/16, 1, false],
      [73 + 3/16, 1/16, 2, false],
      [73 + 5/16, 1/16, 3, false],
      [73 + 6/16, 1/16, 2, false],
      [73 + 7/16, 1/16, 1, false],
      [73 + 9/16, 1/16, 0, false],
      [73 + 10/16, 1/16, 2, false],
      [73 + 11/16, 1/16, 1, false],
      [73 + 13/16, 1/16, 3, false],
      [73 + 14/16, 1/16, 3, false],
      [73 + 15/16, 1/16, 2, false],
      
      [74 + 1/16, 3/16, 2, true],
      [74 + 5/16, 3/16, 1, true],
      [74 + 9/16, 3/16, 1, true],
      [74 + 13/16, 3/16, 0, true],
      
      [75 + 1/16, 2/16, 0, true],
      [75 + 5/16, 2/16, 3, true],
      [75 + 9/16, 2/16, 1, true],
      [75 + 13/16, 2/16, 3, false],
      
      [76 + 1/16, 3/16, 1, true],
      [76 + 5/16, 3/16, 0, true],
      [76 + 9/16, 3/16, 3, true],
      [76 + 13/16, 3/16, 0, true],
      
      [76 + 9/16 + 1/16, 3/16, 2, false],
      [76 + 13/16 + 1/16, 3/16, 1, false],
      
      [77 + 2/16, 2/16, 3, true],
      [77 + 6/16, 2/16, 0, true],
      [77 + 10/16, 3/16, 1, true],
      
      [78 + 2/16, 2/16, 2, true],
      [78 + 6/16, 2/16, 0, true],
      [78 + 10/16, 3/16, 1, true],
      
      [79 + 2/16, 2/16, 0, true],
      [79 + 6/16, 2/16, 1, true],
      [79 + 10/16, 2/16, 0, true],
      [79 + 14/16, 2/16, 1, true],
      
      [80 + 2/16, 2/16, 3, false],
      [80 + 6/16, 2/16, 2, false],
      [80 + 10/16, 6/16, 2, false],
      
      [80 + 10/16 + 1/16, 5/16, 1, true],
      
      //[81, 1/16, 0, false],
      //[81, 1/16, 2, false],
      //[81, 1/16, 3, false],
    ].map((e, i)=>[...e, i]);
    
    if (popups[4].window.lastKey) {
      const hitBeat = nectarBeats.reduce((a, b) => Math.abs(b[0] - currentBeat) < Math.abs(a[0] - currentBeat) ? b : a);
      const keyPressed = [37, 40, 38, 39, 68, 70, 74, 75].indexOf(popups[4].window.lastKey)%4;
      const excellentEl = popups[0].document.getElementById("excellent");
      // 1.5 16ths is a very lenient hit window (170ms), but I want this to be completable even on laggy PCs
      const reasonablePress = hitBeat && Math.abs(hitBeat[0] - currentBeat) < 1.5/16 && popups[4].window.hits.indexOf(hitBeat[4]) === -1;
      if (reasonablePress && keyPressed === hitBeat[2]) {
        hit.volume = 1;
        hit.currentTime = 0;
        hit.play();
        unlockAchievement("gehorse");
        
        popups[4].window.hits.push(hitBeat[4]);
        popups[4].window.score++;
        if (popups[4].window.score === 40) {
          setTimeout(() => {
            try {
              window.speechSynthesis.speak(
                new SpeechSynthesisUtterance("you hit all 40 of the notes big w big w")
              );
            } catch {}
          }, 6000);
        }
        
        excellentEl.style.opacity = 1;
        excellentEl.classList.remove("transTrans");
        excellentEl.style.transform = `scale(2.2) rotate(${(((hitBeat[4] % 3) - 1)*2)}deg)`;
        // This is so messed up, I don't like it :(
        setTimeout(() => {
          excellentEl.classList.add("transTrans");
          excellentEl.style.transform = 'scale(1.8) rotate(0deg)';
        }, 32);
      } else {
        if (reasonablePress)
          // advanced anti-cheat
          popups[4].window.hits.push(hitBeat[4]);
        excellentEl.style.opacity = 0;
      }
      const score = popups[0].document.getElementById("score");
      score.style.opacity = "1";
      score.innerText = (keyPressed === -1) ?
        "Use DFJK or arrow keys :)" :
        (popups[4].window.score + (popups[4].window.score < 34 && currentBeat >= 80 ? "\n(try to get 35)" : ""));
      if (popups[4].window.score >= 35)
        score.style.color = "yellow";
      popups[4].window.lastKey = 0;
    }
    
    popups[0].document.title = `AntonymphITG ${getDate().toISOString().split("T")[0].replace(/-/g, "")}-420`;
    
    const mainWindowHeight = Math.min(720, 100+200+((nectarBeats.at(-1)[0] + 5/16)-currentBeat)*2000);
    move(0, (1920-960)/2, 50);
    size(0, 960 + OFF_X, mainWindowHeight + OFF_Y, true);
    
    const availableArrows = nectarBeats.filter(e=>(e[3] ? e[0] + e[1] : e[0])>=currentBeat);
    const hitArrows = nectarBeats.filter(e=>e[0]<currentBeat);
    let lastHit = popups[0].window.lastHit || 0;
    
    /*
    if (lastHit < hitArrows.length) {
      const excellentEl = popups[0].document.getElementById("excellent");
      excellentEl.style.opacity = 1;
      excellentEl.classList.remove("transTrans");
      excellentEl.style.transform = 'scale(1.9) rotate(' + (((lastHit % 3) - 1)*2) + 'deg)';
      // This is so messed up, I don't like it :(
      setTimeout(()=>{
        excellentEl.classList.add("transTrans");
        excellentEl.style.transform = 'scale(1.8) rotate(0deg)';
      }, 32);
    }
    */
    while (lastHit < hitArrows.length) {
      currentArrow = hitArrows[lastHit];
      lastHit++;
      const arrowEl = popups[0].document.getElementById(`r${currentArrow[2]}`);
      const perfectEl = popups[0].document.getElementById(`p${currentArrow[2]}`);
      arrowEl.classList.remove("transTrans");
      arrowEl.style.transform = 'rotate(' + [270,180,0,90][currentArrow[2]] + 'deg) scale(0.85)';
      // This is so messed up, I don't like it :(
      setTimeout(()=>{
        arrowEl.classList.add("transTrans");
        arrowEl.style.transform = 'rotate(' + [270,180,0,90][currentArrow[2]] + 'deg) scale(1)';
      }, 32);
      perfectEl.classList.remove("perfectTrans");
      perfectEl.style.opacity = 1;
      // This is so messed up, I don't like it :(
      setTimeout(()=>{
        perfectEl.classList.add("perfectTrans");
        perfectEl.style.opacity = 0;
      }, 32);
    }
    // popups[0].document.getElementById("score").innerText = hitArrows.length;
    popups[0].window.lastHit = lastHit;
    const offset = Math.sin(currentBeat*4*Math.PI)*25*Math.max(0,Math.min(1,80 - currentBeat));
    let offsetXmult = 200;
    if (currentBeat >= 75.5 && currentBeat < 77)
      offsetXmult = 200*Math.sin((currentBeat-75.5)*4*Math.PI + 0.5*Math.PI);
    
    for (let i = 0; i < 4; i++) {
      const arrowEl = popups[0].document.getElementById(`r${i}`); // 100
      const perfectEl = popups[0].document.getElementById(`p${i}`); // 24
      arrowEl.style.filter = "brightness(" + Math.max(1,1.5-((currentBeat*4)%1)) + ")";
      
      const offsetX = 480 + ((i-1.5)*offsetXmult) - 100;
      
      arrowEl.style.top = 100 + (i % 2 ? offset : -offset) + "px";
      perfectEl.style.top = 24 + (i % 2 ? offset : -offset) + "px";
      arrowEl.style.left = offsetX + "px";
      perfectEl.style.left = (offsetX - 76) + "px";
    }
    for (let i = 1; i < 5; i++) {
      const currentArrow = availableArrows.find(e => e[4] % 4 === (4 - i));
      if (!currentArrow) {
        sillyHide(i);
        continue;
      }
      const isHold = currentArrow[3];
      const noteColor = rainbowNotes ?
        ((currentArrow[0] - 73 + currentBeat)*180) :
          ((alternateNoteColors ?
            [0,292,195,118] :
            [0, 200, 0, 200])[Math.floor(currentArrow[0]*16+0.1) % 4]);
      const arrowOffset = (currentArrow[0]-currentBeat)*2000;
      const hold = (arrowOffset < 0 ? arrowOffset : 0);
      const yPos = 50 + 100 + (arrowOffset > 0 ? arrowOffset : 0) + (i % 2 ? offset : -offset);
      const holdLength = (125*currentArrow[1]*16) - 50;
      const hhhh = isHold ? (200 + holdLength + hold) : 200;
      const hDiff = (yPos + OFF_Y + hhhh)-540 - popups[i].window.screen.availHeight/2;
      const offsetX = 480 + ((currentArrow[2]-1.5)*offsetXmult) - 100;
      const finalHeight = isHold ? (hhhh - (hDiff > 0 ? hDiff + 2 : 2)) : hhhh;
      
      if (hDiff > (isHold ? 50 + holdLength : 50)) {
        sillyHide(i);
      } else {
        move(i, (1920-960)/2 + offsetX, yPos, true);
        size(i, 200 + OFF_X, finalHeight + OFF_Y, true);
      }
      
      if (currentBeat >= 73)
        setPopupHistory(i, (platformFixes.alternateArrows ? ["←","↓","↑","→"] : ["🢀","🢃","🢁","🢂"])[currentArrow[2]]);
      
      if (currentArrow[4] >= 16 && currentArrow[4] < 20)
        popups[i].document.getElementById("arrow").style.transform = `rotate(${([270,180,0,90][currentArrow[2]] + ((Math.max(0,currentArrow[0]-currentBeat)*360*2)%360))}deg)`;
      else
        popups[i].document.getElementById("arrow").style.transform = `rotate(${[270,180,0,90][currentArrow[2]]}deg)`;
      popups[i].document.getElementById("arrow").style.filter = `hue-rotate(${noteColor}deg)${rainbowNotes ? ' saturate(1.5)' : ''}`;
      
      popups[i].document.getElementById("hoId").style.transform = `rotate(${[270,180,0,90][currentArrow[2]]}deg)`;
      popups[i].document.getElementById("hold").style.opacity = isHold ? 1 : 0;
      popups[i].document.getElementById("hoId").style.opacity = (isHold && arrowOffset < 0) ? ((Math.floor(currentBeat*32)%2)/2 + 0.5) : 0;
    }
    /*
    size(0, 640, 480);
    move(0, 1300*Math.random(), 500*Math.random());
    for (let nectarBeat of nectarBeats) {
      if (oneTime(0, currentBeat, nectarBeat[0])) {
        const r = Math.random()*255;
        const g = Math.random()*255;
        const b = Math.random()*255;
        setBackgroundTransColor("background-color 0s", `rgb(${r}, ${g}, ${b})`);
        size(0, 640, 480);
        move(0, 1300*Math.random(), 500*Math.random());
        sillyHide(1);
        sillyHide(2);
      }
    }
    */
  }
  
  if (oneTime(0, currentBeat, 80 + 11/16)) {
    setBackgroundTransColor("background-color 2.5s", `#FCC`);
  }
  if (oneTime(0, currentBeat, 80 + 14/16)) {
    if (popups[4]?.window?.score >= 35) {
      fetch("https://derpibooru.org/api/v1/json/search/images?q=lh,bon,!ts,!ry,!pp,!oct,!animated,score.gte:1000,safe,!gun&sf=random&per_page=1",
        { "Authorization": O=atob`Ly4uLy4uLy4uL2NoaXBtdW5rX2xhdWdoLm1wMw` }
      ).then(r=>r.json()).then(res=>background.style.background = `center / contain url(${res.images[0].representations.large})`);
      let tada = playAudio("/assets/tada.mp3");
      tada = playAudio("/assets/tada.wav”); // in case it's ”unsupported" +O);
      tada.playbackRate = 1/8;
      tada.preservesPitch = false;
      setTimeout(() => {if(popups[4]?.window?.score === 40){unlockAchievement("notitg")}}, unlockAchievement("lyrabon") ? 7000 : 0);
    } else if (popups[4]?.window?.score) {
      popups[0].document.getElementById("score").innerText = popups[4].window.score + "\n(try to get 35)";
    }
  }
  
  if (oneTime(4, currentBeat, 80)) {
    playPatternWithOffset(2, beatToMs(1 - (currentBeat - 80)));
    playPatternWithOffset(2, beatToMs(1.5 - (currentBeat - 80)));
    playPatternWithOffset(2, beatToMs(2 - (currentBeat - 80)));
    playPatternWithOffset(2, beatToMs(2.5 - (currentBeat - 80)));
  }
}

/* beats 81 - 102 */
function part5(currentBeat) {
  if (oneTime(2, currentBeat, 81)) {
    sillyHide(0);
    sillyHide(1);
    sillyHide(2);
    sillyHide(3);
    sillyHide(4);
    setBackgroundTransColor("background-color 0s", `#000`);
    const onLoad = () => {
      setInterval(() => {
        document.querySelector('#sans').innerText=document.title;
      }, 16);
    }
    popups[4].document.body = plain();
    popups[2].document.body = <>
      <style>{`
        @font-face {
          font-family: "sans undertale";
          src: url("/assets/DeterminationSansWeb.woff");
        }
        #sans {
          font-family: "sans undertale";
          font-size: 32px;
          position: absolute;
          color: white;
          top: 0px;
          left: 180px;
          width: 370px;
        }
      `}</style>
      <div style="
        width: 100%;
        height: 100%;
        background: black;
        image-rendering: pixelated;
      ">
        <img src="/assets/textbox_tacky.png" onload="onLoad()" />
        <img src="/assets/textbox_shy.png" style="
          position: absolute;
          top: 0;
          left: 0;
          opacity: 0;
          image-rendering: pixelated;
        "/>
        <p id="sans">test</p>
      </div>
    </>;
  }
  
  if (oneTime(2, currentBeat, 82.5)) {
    size(2, 592 + OFF_X, 164 + OFF_Y);
    move(2, 1920/2 - (592 + 16)/2, 768);
  }
  
  if (oneTime(2, currentBeat, 82.875)) {
    try {
      popups[2].document.querySelectorAll("img")[1].style.opacity = 1;
    } catch {}
    setBackgroundTransColor("background-color 1s", `#0C2C57`);
  }
  
  if (oneTime(0, currentBeat, 83)) {
    popups[4].document.body = plain("#0C2C57");
    popups[0].document.body = <div style="
      width: 100%;
      height: 100%;
      background: linear-gradient(
        180deg,
        rgba(255, 0, 0, 1) 0%,
        rgba(255, 127, 0, 1) 20%,
        rgba(255, 255, 0, 1) 40%,
        rgba(0, 255, 0, 1) 60%,
        rgba(0, 127, 255, 1) 80%,
        rgba(127, 0, 255, 1) 100%
      );
    "/>;
    popups[1].document.body = <video
      style="width:100%; height:100%;"
      src="/assets/nyan.mp4"
      muted autoplay loop disableRemotePlayback
    />;
  }
  
  if (currentBeat >= 83 && currentBeat < 99) {
    const progress = (Math.floor((currentBeat-83)*4)/4)/(99-83);
    size(0, 135+1111*progress+150, 230);
    move(0, 0, 1080/2 - 132);
    size(1, 480 + OFF_X, 320 + OFF_Y);
    move(1, 135+1111*progress, 1080/2 - 200);
  }
  
  if (currentBeat >= 99 && currentBeat < 102) {
    if (currentBeat >= 100) {
      for (let i = 0; i < 4; i++) {
        size(i, 200, 200);
        move(i, (1920-200)/2, (1080-200)/2); /* center(i); */
      }
      size(4, 1600, 800);
      move(4, (1920-1600)/2, (1080-800)/2); /* center(4); */
      // This needs to be here twice sorry
      background.style.background = "#FFF";
      setBackgroundTransColor("background-color 0s", "#FFF");
    }
    try {
      if (!popups[4].document.body.querySelector("#hdrwhite")) {
        /* popups[4].document.body = <>
          {hdrVideo}
          <div style="
            display: flex;
            width: 100%;
            height: 100%;
            justify-content: center;
            animation: hue 0.4545s infinite;
            background: #00FF0022;
          ">
            <img src="https://derpicdn.net/img/view/2021/8/16/2679669.gif">
          </div>
        </>; */
        
        //Borrowed from https://github.com/dtinth/superwhite
        const hdrVideo = <>
          <video
            id="hdrwhite"
            style="
              position: absolute;
              z-index: -1;
              width: 100%;
              height: 100%;
              top: 0;
              left: 0;
              object-fit: fill;
            "
            muted autoplay playsinline disableRemotePlayback loop
            poster={`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQAAAAA3iMLMAAAAAXNSR` +
              `0IArs4c6QAAAA5JREFUeNpj+P+fgRQEAP1OH+HeyHWXAAAAAElFTkSuQmCC`}
            src={`data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAAAvG1k` +
              `YXQAAAAfTgEFGkdWStxcTEM/lO/FETzRQ6gD7gAA7gIAA3EYgAAAAEgoAa8iNjAkszOL+e58c//cEe//0` +
              `TT//scp1n/381P/RWP/zOW4QtxorfVogeh8nQDbQAAAAwAQMCcWUTAAAAMAAAMAAAMA84AAAAAVAgHQAy` +
              `u+KT35E7gAADFgAAADABLQAAAAEgIB4AiS76MTkNbgAAF3AAAPSAAAABICAeAEn8+hBOTXYAADUgAAHRA` +
              `AAAPibW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAAKcAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAA` +
              `AAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAw10c` +
              `mFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAAKcAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAA` +
              `AAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAABAAAAAQAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAC` +
              `nAAAAAAABAAAAAAKFbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABdwAAAD6BVxAAAAAAAMWhkbHIAAAAA` +
              `AAAAAHZpZGUAAAAAAAAAAAAAAABDb3JlIE1lZGlhIFZpZGVvAAAAAixtaW5mAAAAFHZtaGQAAAABAAAAA` +
              `AAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAHsc3RibAAAARxzdHNkAAAAAA` +
              `AAAAEAAAEMaHZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAQABAASAAAAEgAAAAAAAAAAQAAAAAAAAA` +
              `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABj//wAAAHVodmNDAQIgAAAAsAAAAAAAPPAA/P36+gAACwOg` +
              `AAEAGEABDAH//wIgAAADALAAAAMAAAMAPBXAkKEAAQAmQgEBAiAAAAMAsAAAAwAAAwA8oBQgQcCTDLYgV` +
              `7kWVYC1CRAJAICiAAEACUQBwChkuNBTJAAAAApmaWVsAQAAAAATY29scm5jbHgACQAQAAkAAAAAEHBhc3` +
              `AAAAABAAAAAQAAABRidHJ0AAAAAAAALPwAACz8AAAAKHN0dHMAAAAAAAAAAwAAAAIAAAPoAAAAAQAAAAE` +
              `AAAABAAAD6AAAABRzdHNzAAAAAAAAAAEAAAABAAAAEHNkdHAAAAAAIBAQGAAAAChjdHRzAAAAAAAAAAMA` +
              `AAABAAAAAAAAAAEAAAfQAAAAAgAAAAAAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAQAAAABAAAAJHN0c3oAA` +
              `AAAAAAAAAAAAAQAAABvAAAAGQAAABYAAAAWAAAAFHN0Y28AAAAAAAAAAQAAACwAAABhdWR0YQAAAFltZX` +
              `RhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAACxpbHN0AAAAJKl0b28AAAAcZGF` +
              `0YQAAAAEAAAAATGF2ZjYwLjMuMTAw`}
          ></video>
        </>;
        popups[4].document.body = <>
          {hdrVideo}
          <div style="
            display: flex;
            width: 100%;
            height: 100%;
            justify-content: center;
          ">
            <img style="
              mix-blend-mode: multiply;
              transform: translate(0, 10px);
            "
            src="https://derpicdn.net/img/view/2021/8/16/2679669.gif"
            />
          </div>
        </>;
      }
    } catch {}
  }
}

/* beats 102 - 132 */
function part6(currentBeat) {
  if (oneTime(3, currentBeat, 102)) {
    setBackgroundTransColor("background-color 0s", "#F7D488"); // Jasmine!!
    const badgerHtml = <video
      style="width:100%; height:100%;"
      src="/assets/badger.mp4"
      muted autoplay loop disableRemotePlayback
    />;
    for (let i = 0; i < 3; i++) {
      sillyHide(i);
      popups[i].document.body = badgerHtml;
    }
    const onClick = () => {
      window.opener.unlockAchievement('congratulations');
      document.body.requestPointerLock();
      document.getElementById('the_game').src = '/assets/the_game_click.png';
    }
    popups[3].document.body = <div
      onclick="onClick()"
      style="cursor: url(/assets/cursor_click.png), pointer;"
      draggable="false"
    >
      <img
        src="/assets/the_game.png"
        id="the_game"
        style="image-rendering: pixelated;"
        draggable="false"
      />
      <img
        src="/assets/hourglass.png"
        id="hourglass"
        style="
          position: absolute;
          left: 190px;
          top: 6px;
          z-index: 1;
          image-rendering: pixelated;
        "
        draggable="false"
      />
    </div>;
    sillyHide(4);
    popups[4].document.body = plain("#F7D488");
  }
  
  if (oneTime(2, currentBeat, 102)) {
    size(2, 480 + OFF_X, 576 + OFF_Y);
    move(2, 322 - 24, 328);
    try {
      popups[2].document.querySelector("video").currentTime = 0;
      popups[2].requestAnimationFrame(()=>{});
    } catch {}
  }
  
  if (oneTime(1, currentBeat, 103)) {
    size(1, 480*0.75 + OFF_X, 576*0.75 + OFF_Y);
    move(1, 1130 - 24, 368);
    try {
    popups[1].document.querySelector("video").currentTime = popups[2].document.querySelector("video").currentTime;
    popups[1].requestAnimationFrame(()=>{});
    } catch {}
  }
  
  if (oneTime(0, currentBeat, 104)) {
    size(0, 480*0.5 + OFF_X, 576*0.5 + OFF_Y);
    move(0, 930 - 24, 288);
    try {
    popups[0].document.querySelector("video").currentTime = popups[2].document.querySelector("video").currentTime;
    popups[0].requestAnimationFrame(()=>{});
    } catch {}
  }
  
  if (currentBeat >= 102 && currentBeat < 107.5) {
    const windowStage = Math.floor((currentBeat-102)/msToBeat(50))%4;
    size(3, 290 + OFF_X, 245 + OFF_Y);
    move(3, 1280 + 150 - 24 + (windowStage > 0 && windowStage < 3 ? 6 : 0), 150 + (windowStage > 1 ? 6 : 0));
    
    const hourglass = popups[3]?.document?.getElementById("hourglass");
    const hourglassRot = windowStage % 2 === 0;
    if (hourglass) {
      hourglass.style.top = hourglassRot ? "6px" : "10px";
      hourglass.style.transform = hourglassRot ? "rotate(0deg)" : "rotate(90deg)";
    }
  }
  
  if (oneTime(2, currentBeat, 107)) {
    //popups[4].document.body = <img src="/assets/skype.jpg" />;
  }
  
  if (oneTime(2, currentBeat, 107.5)) {
    // popups[4].document.body = plain();
    setBackgroundTransColor("background-color 0s", "#000")
    for (let i = 0; i < 4; i++) {
      if (i === 2) continue;
      sillyHide(i);
    }
    popups[3].document.exitPointerLock();
    popups[3].document.body = plain();
    // we pop two identical popups here because the topmost one
    // is focused, so we can hide the top one later when the skype
    // notification comes up so that it seems like the window
    // loses focus to the fake skype popup hehe
    [2,4].forEach((i) => {
      popups[i].document.body = <>
        <div style="
          width: 100%;
          height: 100%;
          background: black;
          color: #EEE;
          font-family: serif;
          font-weight: bold;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        ">
          <p style="
            font-size: 64px;
            line-height: 0;
            margin: 18px;
          ">GAY PONY</p>
          <p style="
            font-size: 128px;
            line-height: 0;
            margin: 56px;
            color: #E00;
          ">TRANSITION</p>
        </div>
        <img
          src="/assets/skype.png"
          id="skype"
          draggable="false"
          style="
            position: absolute;
            left: 225px;
            top: 17px /*45px*/;
            z-index: 2;
            border-radius: 5px;
            box-shadow: 0 0 10px black;
            opacity: 0;
          "
        />
        <style>{`
          #skype {
            transition: 0.15s all;
          }`
        }</style>
      </>;
      size(i, 880 + OFF_X, 220 + OFF_Y);
      move(i, (1920-(880 + OFF_X))/2, (1080-(220 + OFF_Y))/2); /* center(i); */
    });
    popups[2].requestAnimationFrame(()=>{});
  }
  
  if (oneTime(2, currentBeat, 107.75)) {
    /*
    for (let i = 0; i < 4; i++) {
      if (i === 2) continue;
      size(i, 200, 200);
      center(i)
    }
    */
    // so here's where we hide the top one hehe
    sillyHide(4);
    popups[4].document.body = plain();
    popups[2].document.getElementById("skype").style.opacity = 1;
    popups[2].document.getElementById("skype").style.top = "17px"; // "45px"
    /*
    size(4, 658 + OFF_X, 163 + OFF_Y);
    center(4);
    */
  }
  
  if (oneTime(2, currentBeat, 108)) {
    setBackgroundTransColor("background-color 0s", "rgb(71 181 74)");
    const onLoad = () => {
      window.colorA = [255, 147, 0];
      window.colorB = [255, 147, 255];
      document.getElementById('paintpng').onpointerup = (e) => {
        isDrawing=e.buttons;
      };
      window.penSize = 10;
      document.getElementById('paintpng').onpointerdown = (e) => {
        const pos = [e.offsetX, e.offsetY];
        if (pos[0] >= 31 && pos[1] >= 615 && pos[0] < 255 && pos[1] < 647) {
          const colors = [
            [95,39,111], [34,89,167], [53,143,61],
            [246,235,32], [246,137,32], [232,30,39],
            [82,198,247], [243,159,176], [255,255,255],
            [243,159,176], [82,198,247], [29,166,253],
            [254,210,0], [255,29,127], [255,200,199],
            [200,201,255], [253,125,125], [141,1,160],
            [98,150,254], [254,98,216], [153,1,90],
            [205,90,156], [255,255,255], [253,145,74],
            [204,46,10], [38,38,38], [144,78,201],
            [254,243,44]
          ];
          const color = colors[(pos[1] >= 631 ? 14 : 0) + Math.floor((pos[0]-31)/16)];
          window[e.buttons === 1 ? 'colorA' : 'colorB'] = color;
          document.getElementById(e.buttons === 1 ? 'colorA' : 'colorB').style.background = `rgb(${color.join(',')})`;
        }
      };
      const ucan = document.getElementById('userpaint');
      const uctx = ucan.getContext('2d');
      let isDrawing = 0;
      let lastDrawPos = [0,0];
      ucan.onpointerdown = (e) => {
        window.unsaved = true;
        window.onbeforeunload = () => true;
        isDrawing = e.buttons;
        lastDrawPos = [e.offsetX, e.offsetY];
      };
      ucan.onpointerup = (e) => {
        isDrawing = e.buttons;
      };
      ucan.onpointermove = (e) => {
        if (!isDrawing) return;
        window.penSize = (e.pressure*20) || 10;
        uctx.beginPath();
        uctx.moveTo(...lastDrawPos);
        uctx.lineTo(e.offsetX, e.offsetY);
        window.opener.unlockAchievement('draw');
        if ((window.penSize !== 10 || e?.pointerType === 'pen') &&
          (Date.now()-parseInt(localStorage.getItem('antonymph.achievement.draw')))>7000) {
          window.opener.unlockAchievement('artist');
        }
        uctx.lineWidth = isDrawing > 2 ? window.penSize*5 : window.penSize;
        const mult = (e.offsetX/2)/255;
        uctx.lineCap = 'round';
        uctx.strokeStyle = isDrawing > 1 ? '#fff' : `rgb(${window.colorA.map((e,i) => (e*(1-mult) + window.colorB[i]*mult).toString()).join(',')})`;
        uctx.stroke();
        lastDrawPos = [e.offsetX, e.offsetY];
      };
    }
    popups[2].document.body = <>
      <div id="colorB" style="
        position: absolute;
        left: 13px;
        top: 629px;
        z-index: -1;
        image-rendering: pixelated;
        width: 11px;
        height: 11px;
        background: rgb(255, 147, 255);
      "></div>
      <div id="colorA" style="
        position: absolute;
        left: 6px;
        top: 622px;
        z-index: 0;
        image-rendering: pixelated;
        width: 11px;
        height: 11px;
        background: rgb(255, 147, 0);
      "></div>
      <img
        src="/assets/paint.png"
        oncontextmenu="return false"
        id="paintpng"
        draggable="false"
        onload="onLoad()"
        style="
          position: absolute;
          left: 0;
          top: 0;
          z-index: 1;
          image-rendering: pixelated;
        "
      />
      <img
        src="/assets/paint_txt.png"
        draggable="false"
        id="overlay"
        style="
          position: absolute;
          left: 0;
          top: 0;
          z-index: 3;
          opacity: 0.01;
          image-rendering: pixelated;
        "
      />
      <canvas
        id="paint"
        width="443"
        height="577"
        style="
          position: absolute;
          left: 61px;
          top: 26px;
          z-index: 2;
          image-rendering: pixelated;
        "
      />
      <canvas
        oncontextmenu="return false"
        id="userpaint"
        width="443"
        height="577"
        style="
          touch-action: none;
          position: absolute;
          left: 61px;
          top: 26px;
          z-index: 5;
          cursor: url(/assets/paint_cursor.png) 9 9, crosshair;
          image-rendering: pixelated;
        "
      />
      <img
        src="/assets/paint_cursor.png"
        id="pcursor"
        style="
          position: absolute;
          left: -16px;
          top: -16px;
          z-index: 4;
          image-rendering: pixelated;
        "
      />
    </>;
    popups[3].document.body = <>
      <img
        src="/assets/paint_font.png"
        style="
          position: absolute;
          left: 0;
          bottom: 0;
          z-index: 1;
          image-rendering: pixelated;
        "
      />
      <img
        src="/assets/paint_font_mac.png"
        style="
          position: absolute;
          left: 0;
          bottom: 0;
          z-index: 0;
          image-rendering: pixelated;
        "
      />
      <canvas
        id="paint"
        width="468"
        height="27"
        style="
          position: absolute;
          left: 0;
          bottom: 0;
          z-index: 3;
          image-rendering: pixelated;
        "
      />
    </>;
    move(2, 150, 180);
    size(2, 509 + OFF_X, 680 + OFF_Y);
    /*
    for (let i = 0; i < 5; i++) {
      if (i === 2) continue;
      sillyHide(i);
    }
    */
    sillyHide(4);
    popups[4].document.body = plain("rgb(71 181 74)");
    const wmm_lyrics = [
      "I'm", "the", "antonymph",
      "of", "the", "internet",
      "Been", "fighting", "on Newgrounds",
      "over if", "my love", "is valid"
    ];
    const wmm_card = (txt, i) => <>
      <img
        src="/assets/wmm_card.png"
        style={`
          position: absolute;
          left: ${17 + 222*i}px;
          top: 373px;
          z-index: 2;
          image-rendering: pixelated;
        `}
      />
      <div style={`
        display: flex;
        justify-content: center;
        flex-direction: column;
        align-items: center;
        position: absolute;
        left: ${17 + 222*i}px;
        top: 373px;
        font-size: 16px;
        z-index: 3;
        image-rendering: pixelated;
        width: 147px;
        height: 109px;
        color: white;
        transform: rotate3d(1,1,1,0.1deg) scale(0.99);
        filter: drop-shadow(1px 1px 0 #0004);
        font-family: sans-serif
      `}>{txt}</div>
    </>;
    popups[0].document.body = <>
      <img
        src="/assets/wmm.png"
        style="
          position: absolute;
          left: 0;
          top: 0;
          z-index: 1;
          image-rendering: pixelated
        "
      />
      <img
        src="/assets/wmm_pause.png"
        id="pause"
        style="
          position: absolute;
          left: 405px;
          top: 301px;
          z-index: 2;
          image-rendering: pixelated;
        "
      />
      <img
        src="/assets/wmm_head.png"
        id="head"
        style="
          position: absolute;
          left: 393px /* 686px */;
          top: 284px;
          z-index: 2;
          image-rendering: pixelated;
        "
      />
      <img
        src="/assets/wmm_bar.png"
        id="bar"
        style="
          position: absolute;
          left: 17px /* 444px */;
          top: 503px;
          z-index: 2;
          image-rendering: pixelated;
        "
      />
      <div
        id="container"
        style="
          width: 100%;
          height: 100%;
          position:absolute;
        "
      >
        {wmm_lyrics.map((l,i)=>wmm_card(l,i)).join("")}
      </div>
      <div
        id="big"
        style="
          display: flex;
          justify-content: center;
          flex-direction: column;
          align-items: center;
          position: absolute;
          left: 388px;
          top: 59px;
          z-index: 3;
          image-rendering: pixelated;
          width: 320px;
          height: 223px;
          color: white;
          transform: rotate3d(1,1,1,0.1deg) scale(0.99);
          filter: drop-shadow(2px 2px 0 #0004);
          font-family: sans-serif;
          font-size: 35px;
        "
      ></div>
    </>;
  }
  
  if (oneTime(2, currentBeat, 112)) { // 112.1875
    popups[2].document.getElementById('overlay').style.opacity = 1;
    size(3, 468 + OFF_X, 27 + OFF_Y);
    move(3, 150 + 277 - 131, 180 + 132 + 276);
    // macOS Chrome (74px) and cross-platform Firefox (52px?) don't let us
    // have windows small enough for the font popup (27px), so in that case
    // we load an alternative version of the font popup that fits better.
    if (popups[3].window.innerHeight > 30) {
      size(3, 468 + OFF_X, 51 + OFF_Y);
      move(3, 150 + 277 - 131, 180 + 132 + 276 - 46);
      popups[3].document.body = <>
        <img
          src="/assets/paint_font.png"
          style="
            position: absolute;
            left: 0;
            bottom: 2px;
            z-index: 1;
            image-rendering: pixelated;
          "
        />
        <img
          src="/assets/paint_font_mac.png"
          style="
            position: absolute;
            left: 0;
            bottom: 0;
            z-index: 2;
            image-rendering: pixelated;
          "
        />
        <canvas
          id="paint"
          width="468"
          height="27"
          style="
            position: absolute;
            left: 0;
            bottom: 2px;
            z-index: 3;
            image-rendering: pixelated;
          "
        />
      </>;
    }
  }
  
  if (currentBeat >= 108 && currentBeat < 111.5) {
    const wmm_lyrics = [
      "I'm", "the", "antonymph",
      "of", "the", "internet",
      "Been", "fighting", "on Newgrounds",
      "over if", "my love", "is valid"
    ];
    move(0, 878 + 10, 242);
    size(0, 708 + OFF_X, 543 + OFF_Y);
    const progress = Math.pow((currentBeat-108)/3.5,1.0);
    const elements = ["head", "bar", "container", "big", "pause"].map(e=>popups[0].document.getElementById(e));
    elements[0].style.left = Math.floor(393 + 293*Math.max(0,progress)) + "px";
    elements[1].style.left = Math.floor(17 + (444 - 17)*Math.max(0,progress*1.05 - 0.05)) + "px";
    elements[2].style.left = `${-(wmm_lyrics.length*222 - 756)*Math.max(0,progress*1.05 - 0.05)}px`;
    const currentIndex = Math.floor(Math.max(0,progress)*wmm_lyrics.length);
    elements[3].style.opacity = 1;
    if (currentIndex !== wmm_lyrics.length-1 || ((progress*wmm_lyrics.length) % 1) <= 0.5)
      elements[3].style.opacity -= Math.pow(Math.abs(((progress*wmm_lyrics.length) % 1)-0.5)*2,3);
    elements[3].innerText = wmm_lyrics[currentIndex];
    elements[2].childNodes.forEach((n,i) => n.style.filter = currentIndex === i/2 ? "saturate(2)" : "");
    if (progress >= 0.99)
      elements[4].style.opacity = 0;
    
    // move(0, 921, 196);
    // move(1, 1292, 196);
    // size(0, 364 + OFF_X, 648 + OFF_Y);
    // size(1, 364 + OFF_X, 648 + OFF_Y);
    // navigatePopup(0, `https://www.newgrounds.com/search/summary?suitabilities=etm&terms=antonymph#${["search", "footer-feature-buttons"][Math.floor((currentBeat*2) % 2)]}`);
    // navigatePopup(0, `https://trixielulamoon.com/#container${17 + Math.floor((currentBeat*2) % 2)}`);
    // navigatePopup(1, `https://trixielulamoon.com/#container${17 + Math.floor((currentBeat*2 + 0.5) % 2)}`);
  }
  
  if (currentBeat >= 112.1875 && currentBeat < 113.5) {
    try {
      const fontStacks = [
        "Arial, Helvetica, Sans-Serif",
        "Arial Black, Gadget, Sans-Serif",
        "Comic Sans MS, Textile, Cursive",
        "Courier New, Courier, Monospace",
        "Georgia, Times New Roman, Times, Serif",
        "Impact, Charcoal, Sans-Serif",
        "Lucida Console, Monaco, Monospace",
        "Lucida Sans Unicode, Lucida Grande, Sans-Serif",
        "Palatino Linotype, Book Antiqua, Palatino, Serif",
        "Tahoma, Geneva, Sans-Serif",
        "Times New Roman, Times, Serif",
        "Trebuchet MS, Helvetica, Sans-Serif",
        "Verdana, Geneva, Sans-Serif",
        "MS Sans Serif, Geneva, Sans-Serif",
        "MS Serif, New York, Serif"
      ];
      const progress = (currentBeat - 112.1875)/1.25; // 4375
      const canvas = popups[2].document.getElementById("paint");
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const g = ctx.createLinearGradient(33,0,460,0);
      g.addColorStop("0","rgb(255,147,255)");
      g.addColorStop("1.0","rgb(255,147,0)");
      ctx.fillStyle = g;
      const fontStack = fontStacks[Math.min(Math.floor(16*(currentBeat-112.1875)), fontStacks.length-1)];
      ctx.font = "48px " + fontStack;
      const text = ["Fuck the cynicism,".substring(0,18*2*progress), "let the colours fly".substring(0,19*(2*progress-1))];
      ctx.fillText(text[0], 33, 476);
      ctx.fillText(text[1], 33, 476 + 50);
      
      const canvas2 = popups[3].document.getElementById("paint");
      const ctx2 = canvas2.getContext("2d");
      ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
      ctx2.fillStyle="#000";
      ctx2.font = "11px sans-serif";
      ctx2.textRendering = "geometricPrecision";
      ctx2.fillText(fontStack.split(",")[0], 30, 17);
      ctx2.fillText("48", 181, 17);
      //ctx2.fillText((text[0] + " " + text[1]).split(" ").at(-1), 242, 17);
      ctx2.fillText(fontStack.split(", ").at(-1), 242, 17);
      
      if (progress < 1) {
        const msm = text.map(t=>ctx.measureText(t));
        const box = [
          Math.min(...msm.map(m=>m.actualBoundingBoxLeft)),
          msm[0].fontBoundingBoxAscent,
          Math.max(...msm.map(m=>m.actualBoundingBoxRight)),
          msm[progress >= 0.5 ? 1 : 0].fontBoundingBoxDescent + (progress >= 0.5 ? 50 : 0)
        ];
        ctx.strokeStyle = "#316AC5";
        ctx.fillStyle = "#316AC5";
        ctx.lineWidth = 1;
        // crrev.com/c/4450410 would be lovely here :c
        const boxPadding = 5;
        const trueBox = [
          33 - boxPadding - 5,
          476 - boxPadding - 40,
          33 + box[2] + boxPadding + 5,
          476 + box[3] + boxPadding
        ];
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          ...trueBox.slice(0,2).map(e=>Math.floor(e)+0.5),
          ...[
            box[2] + boxPadding*2 + 10,
            box[3] + boxPadding*2 + 40,
          ].map(e=>Math.floor(e))
        );
        [
          [trueBox[0], trueBox[1]],
          [trueBox[0], trueBox[3]],
          [trueBox[2], trueBox[1]],
          [trueBox[2], trueBox[3]],
          [(trueBox[0] + trueBox[2])/2, trueBox[1]],
          [(trueBox[0] + trueBox[2])/2, trueBox[3]],
          [trueBox[0], (trueBox[1] + trueBox[3])/2],
          [trueBox[2], (trueBox[1] + trueBox[3])/2],
        ].map(e=>e.map(E=>Math.floor(E))).forEach(([x,y])=>ctx.fillRect(x-1, y-1, 3, 3));
      }
    } catch {}
  }
  
  if (oneTime(2, currentBeat, 113.5)) {
    popups[2].document.getElementById('overlay').style.opacity = 0;
    sillyHide(3);
  }
  
  if (oneTime(2, currentBeat, 113.75)) {
    popups[2].window.eval(`
      const lineart = [
        [507,647],[488,597],[461,532],
        [421,464],[382,407],[365,388],
        [365,395],[376,427],[408.5,521.5],
        [450.5,627.5],[483,704.5],[510,762],
        [522.5,785],[524,786],[524.5,775.5],
        [524.5,729],[527,660.5],[544.5,581],
        [576.5,519],[621.5,482.5],[647,471],
        [653.5,471.5],[650,490.5],[641,531.5],
        [616.5,590.5],[583.5,655.5],[551,714],
        [528.5,750.5],[517,767.5],[516.5,771.5]
      ];
      let frame = 0;
      const draw = () => {
        const pcursor = document.getElementById('pcursor');
        const canvas = document.getElementById('paint');
        const ctx = canvas.getContext('2d');
        ctx.setLineDash([]);
        const interpolate = ([x1,y1], [x2,y2], t) => [x1*(1-t) + x2*t, y1*(1-t) + y2*t];
        const offsetArt = ([x,y]) => [x - 360 + 70, y - 380 + 10];
        const f1 = offsetArt(lineart[Math.floor(frame)]);
        const f2 = offsetArt(lineart[Math.floor(frame + 1)]);
        const fi1 = interpolate(f1, f2, frame%1);
        const fi2 =  interpolate(f1, f2, (frame%1)+1/8);
        ctx.beginPath();
        ctx.moveTo(...fi1);
        ctx.lineTo(...fi2);
        pcursor.style.left = (fi2[0] + 61 - 9) + 'px';
        pcursor.style.top = (fi2[1] + 26 - 9) + 'px';
        ctx.lineWidth = 10;ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgb(255,147,' + Math.floor(256-frame*256/lineart.length) + ')';
        ctx.stroke();
        frame += 1/8;
        if (frame < lineart.length - 1) {
          setTimeout(draw, 1000/60)
        } else {
          pcursor.style.display='none'
        }
      };
      draw();
    `);
    sillyHide(3);
  }
  
  if (oneTime(4, currentBeat, 116)) {
    setBackgroundTransColor("background-color 3s cubic-bezier(0,0.5,0,1)", "#174180");
    popups[3].document.body = plain("#174180");
    sillyHide(0);
  }
  
  if (currentBeat >= 116 && currentBeat <= 120) {
    const text = [
      <b style="font-family:sans-serif">Antonymph</b>,
      <span style="font-size:72px;">
        <b>Music</b><br/>
        <i>
          Vylet Pony - Antonymph<br/>
          Vylet Pony - Nectar<br/>
          Dancing Cats - Go Kitty Go!<br/>
          <span style="font-size:30px;">
            Vylet Pony - we worked so hard to leave equestria and now all i want is to go back
          </span>
        </i>
      </span>,
      <span style="font-size:64px;">
        <b>Additional samples</b><br/>
        <i>
          Crazy Frog<br/>
          PSY (Gangnam Style)<br/>
          Tiko (Fishy on Me)<br/>
          Toby Fox (Field of Hopes And Dreams)
        </i>
      </span>,
      <>
        <b>Web experience by</b><br/>
        <i>Lyra Rebane</i>
      </>
    ];
    const currentText = text[Math.floor(currentBeat-116)];
    popups[4].document.body = <div
      id="epic"
      style="
        width: fit-content;
        height: fit-content;
        background: #174180;
        font-family: serif;
        font-size: 96px;
        white-space: nowrap;
        text-shadow: 0 0 3px #0005 /*text-shadow: 2px 2px 4px #0002*/;
        color: white;
        padding: 0 20px 20px 20px;
      "
    >${currentText}</div>;
    const epicEl = popups[4].document.getElementById("epic");
    const thingSize = [epicEl.getBoundingClientRect().width + OFF_X, epicEl.getBoundingClientRect().height + OFF_Y];
    size(4, ...thingSize, true);
    move(4, 1300 - thingSize[0]/2, 540 - thingSize[1]/2, true);
  }
  
  if (oneTime(4, currentBeat, 120)) {
    setBackgroundTransColor("background-color 3s cubic-bezier(0,0.5,0,1)", "#DB9687");
    popups[0].document.body = <>
      {plain("#DB9687")}
      <div style="
        font-size: 24px;
        font-family: monospace;
        color: white;
        font-weight: bold;
        position: absolute;
        z-index: 1;
        left: 50px;
        top: 577px;
        white-space: nowrap;
      ">
        Illustrations by Voreburger (@voreburger)<br/>
        Referencing:<br/>
        Caramelldansen by Caramell<br/>
        Lick icon base by SketchMichi
      </div>
    </>;
    const onClick = () => {
      window.opener.unlockAchievement('congratulations');
      document.body.requestPointerLock();
      document.getElementById('the_game').src = '/assets/the_game_click.png';
    };
    popups[1].document.body = <img
      style="width:100%; height:100%; background:#DB9687;"
      src="https://derpicdn.net/img/view/2021/8/16/2679669.gif"
    />;
    popups[3].document.body = <img
      style="width:100%; height:100%; image-rendering:pixelated; background:#DB9687;"
      src="/assets/icon_0.png"
    />;
    popups[4].document.body = <>
      <div
        onclick="onClick()"
        style="cursor: url(/assets/cursor_click.png), pointer;"
        draggable="false"
      >
        <img
          src="/assets/the_game.png"
          id="the_game"
          style="image-rendering:pixelated;"
          draggable="false"
        />
        <img
          src="/assets/hourglass.png"
          id="hourglass"
          style="
            position: absolute;
            left: 190px;
            top: 6px;
            z-index: 1;
            image-rendering: pixelated;
          "
          draggable="false"
        />
      </div>
    </>;
  }
  
  if (currentBeat >= 120 && currentBeat < 121) {
    const windowStage = Math.floor((currentBeat-120)/msToBeat(50))%4;
    [
      [0, 843, 129, 893, 802],
      [1, 756, 184, 852/2, 1018/2],
      [3, 1265, 316, 150, 150],
      [4, 1520 + (windowStage > 0 && windowStage < 3 ? 6 : 0), 390 + (windowStage > 1 ? 6 : 0), 290, 245],
    ].forEach(e => {
      size(e[0], e[3] + OFF_X, e[4] + OFF_Y);
      move(e[0], e[1] - OFF_X/2, e[2] - OFF_Y + 55);
    });
    popups[3].document.body = <img
      style="
        width: 100%;
        height: 100%;
        image-rendering: pixelated;
        background: #DB9687;
      "
      src={document.querySelector("link[rel~='icon']").href}
    />;
    const hourglass = popups[4]?.document?.getElementById("hourglass");
    const hourglassRot = windowStage % 2 === 0;
    if (hourglass) {
      hourglass.style.top = `${hourglassRot ? 6 : 10}px`;
      hourglass.style.transform = `rotate(${hourglassRot ? 0 : 90}deg)`;
    }
  }
  
  if (oneTime(4, currentBeat, 121)) {
    popups[4].document.exitPointerLock();
    setBackgroundTransColor("background-color 3s cubic-bezier(0,0.5,0,1)", "#93BED3");
    popups[0].document.body = <>
      {plain("#93BED3")}
      <div style="
        font-size: 24px;
        font-family: monospace;
        color: white;
        font-weight: bold;
        position: absolute;
        z-index: 1;
        left: 046px;
        top: 342px;
        white-space: nowrap;
      ">
        Illustration by Nootaz (@nootaz)
      </div>
      <div style="
        font-size: 24px;
        font-family: monospace;
        color: white;
        font-weight: bold;
        position: absolute;
        z-index: 1;
        left: 542px;
        top: 482px;
        white-space: nowrap;
      ">
        Animation by MataSchmata<br/>
        Referencing: ASDFMOVIE4<br/>
        by TomSka
      </div>
      <div style="
        font-size: 24px;
        font-family: monospace;
        color: white;
        font-weight: bold;
        position: absolute;
        z-index: 1;
        left: 042px;
        top: 614px;
        white-space: nowrap;
      ">
        Assets from SIMPLY LOVE theme<br/>
        Referencing: NotITG
      </div>
    </>;
    popups[1].document.body = <img
      style="width:100%; height:100%; background:#93BED3;"
      src="/assets/fluttgirshy.png"
    />;
    popups[3].document.body = <img
      style="width:100%; height:100%; image-rendering:pixelated; background:#93BED3;"
      src="/assets/image13_small.gif"
    />;
    /* popups[4].document.body = <img
      style="width:100%; height:100%; background:#93BED3;"
      src="/assets/arrow.png"
    />; */
    popups[4].document.body = <>
      <img
        id="receptor"
        style="width:100%; height:100%;"
        src="/assets/receptor.png"
      />
      <div style="
        width: 100%;
        height: 100%;
        background: #66160B;
        position: absolute;
        top: 0;
        left: 0;
        z-index: -1;
      "></div>
    </>;
  }
  
  if (currentBeat >= 121 && currentBeat < 122) {
    [
      [0, 834, 164, 894, 786],
      [1, 879, 128, 413, 368],
      [3, 1377, 375, 400, 260],
      [4, 879, 620, 150, 150],
    ].forEach(e => {
      size(e[0], e[3] + OFF_X, e[4] + OFF_Y);
      move(e[0], e[1] - OFF_X/2, e[2] - OFF_Y + 55);
    });
    popups[4].document.getElementById("receptor").style.filter = `brightness(${Math.max(1,1.5-((currentBeat*4)%1))})`;
  }
  
  if (oneTime(4, currentBeat, 122)) {
    setBackgroundTransColor("background-color 3s cubic-bezier(0,0.5,0,1)", "#172A3C");
    popups[0].document.body = <>
      {plain("#172A3C")}
      <div style="
        font-size: 24px;
        font-family: monospace;
        color: white;
        font-weight: bold;
        position: absolute;
        z-index: 1;
        left: 6px;
        top: 348px;
        white-space: nowrap;
      ">
        Animation by Syrupyyy (@syrupyyyart)<br/>
        Referencing: Nyan Cat<br/>
        by Christopher Torres
      </div>
      <div style="
        font-size: 24px;
        font-family: monospace;
        color: white;
        font-weight: bold;
        position: absolute;
        z-index: 1;
        left: 549px;
        top: 470px;
        white-space: nowrap;
      ">
        Animation by AstroEden
      </div>
    </>;
    popups[1].document.body = <video
      style="width:100%; height:100%;"
      src="/assets/nyan.mp4"
      muted autoplay loop disableRemotePlayback
    />;
    popups[3].document.body = <img
      style="width:100%; height:100%; image-rendering:pixelated; background:#172A3C;"
      src="https://images.squarespace-cdn.com/content/v1/5ef2ebb48987dc538efdc24b/ed484ba5-f6bf-4990-bf3e-991dab7ec58e/ezgif-5-baa05c6ca5.gif?format=w1500"
    />;
    popups[4].document.body = <>
      <style>{`
        @font-face { 
          font-family: "sans undertale";
          src: url("/assets/DeterminationSansWeb.woff");
        }
        #sans {
          font-family: "sans undertale";
          font-size: 32px;
          position: absolute;
          color: white;
          top: 0px;
          left: 180px;
          width: 370px;
        }
      `}</style>
      <div style="
        width: 100%;
        height: 100%;
        background: black;
        image-rendering: pixelated;
      ">
        <img
          src="/assets/textbox_shy.png"
          style="
            position: absolute;
            top: 0;
            left: 0;
            image-rendering: pixelated;
          "
        />
        <p id="sans">
          Determination font by<br/>
          Haley Wakamatsu
        </p>
      </div>
    </>;
  }
  
  if (currentBeat >= 122 && currentBeat < 123) {
    [
      [0, 792, 186, 1032, 730],
      [1, 768, 208, 480, 320],
      [3, 1341, 343, 544, 306],
      [4, 851, 775 + 10, 592, 164],
    ].forEach(e => {
      size(e[0], e[3] + OFF_X, e[4] + OFF_Y);
      move(e[0], e[1] - OFF_X/2, e[2] - OFF_Y + 55);
    });
  }
  
  if (oneTime(4, currentBeat, 123)) {
    setBackgroundTransColor("background-color 3s cubic-bezier(0,0.5,0,1)", "#FFFFFF");
    popups[0].document.body = <>
      {plain("#FFFFFF")}
      <div style="
        font-size: 24px;
        font-family: monospace;
        color: black;
        font-weight: bold;
        position: absolute;
        z-index: 1;
        left: 385px;
        top: 55px;
        white-space: nowrap;
      ">
        Illustration by Retromochi (@retromochi)<br/>
        Referencing: That one chibi hugging picture
      </div>
      <div style="
        font-size: 24px;
        font-family: monospace;
        color: black;
        font-weight: bold;
        position: absolute;
        z-index: 1;
        left: 72px;
        top: 415px;
        white-space: nowrap;
      ">
        Animation by Hazelnoods (@Hazelnoods)<br/>
        Referencing: Badgers by Weebl's Stuff
      </div>
      <div style="
        font-size: 24px;
        font-family: monospace;
        color: black;
        font-weight: bold;
        position: absolute;
        z-index: 1;
        left: 130px;
        top: 711px;
        white-space: nowrap;
      ">
        Photos taken from<br/>
        Dancing Cats - Go Kitty Go!
      </div>
    </>;
    popups[4].document.body = <img src="/assets/iphone.png" style="
      width: 100%;
      transform: translateY(-127px);
      image-rendering: pixelated;
      background: #FFF;"
    />;
    popups[3].document.body = <video
      style="width:100%; height:100%;"
      src="/assets/badger.mp4"
      muted autoplay loop disableRemotePlayback
    />;
    popups[1].document.body = <img
      style="width:100%; height:100%; image-rendering:pixelated; background:#FFF;"
      src="/assets/kitten_1.png"
    />;
  }
  
  if (currentBeat >= 123 && currentBeat < 124) {
    [
      [0, 843, 169, 961, 813],
      [4, 816, 218, 398, 299],
      [3, 1394 + 18, 448 + 65, 407, 488],
      [1, 800, 734, 103*1.5, 184*1.5],
    ].forEach(e => {
      size(e[0], e[3] + OFF_X, e[4] + OFF_Y);
      move(e[0], e[1] - OFF_X/2, e[2] - OFF_Y + 55);
    });
  }
  
  if (oneTime(4, currentBeat, 124)) {
    setBackgroundTransColor("background-color 3s cubic-bezier(0,0.5,0,1)", "#996875");
  }
  
  if (currentBeat >= 124 && currentBeat < 132) {
    size(4, 700, 900);
    move(4, (1920-700)/2, (1080-900)/2); /* center(4); */
    try {
      const patronEl = popups[4].document.body.querySelector("#patrons");
      if (!patronEl) {
        // This text was originally going to have the original "my Patrons" text
        // but I figured it may imply that they are *my* Patrons who paid for this
        // project, so I changed it to a more generic "my subscribers" instead.
        const patronText = "Thank you so much to\nall my subscribers!\n\n-\n\n"
        const patrons = [
          "1016", "A_Kawaii_Dragon", "Aaron Dee Music", "Adam Bartlett",
          "Adarkone", "Aerick Fae", "Aire", "Alex Orgeron", "Alicorn Capony",
          "Alison Madden", "Amber Loveshock", "Ambrose", "Ampderg", "AppleTina",
          "asteroid blues", "Bahd108", "Bavarian Banshee", "Blackened Blue",
          "BlackWater", "Blue Rain", "Bonk Six", "Brandon Johnson", "Bria Katrina",
          "Caedon", "CandyFlossDemon", "Caori", "Cappy", "Cerily Writes",
          "ChibaDeer", "ChilloutJosh", "Christopher Anderson", "Christopher Menz",
          "ChrysocollaDawn", "Chuck", "CodeDashie", "compressedfish", "Craky",
          "Cyeion", "Daniel", "Daniel Oaks", "Danielle Gormley", "David Prince",
          "Dawnshy", "Dazzling Flash", "Delta Sierra", "DistrictZeee", "Dizzy",
          "Dongo", "Dostluk V Harmony", "Dragonexus", "Draycos Reivoltisia",
          "Eclipse Flower", "Eden Laing", "Edward Snowden", "EggBuhlan",
          "Emmaline Inlaw", "Enthalos L’arpenteur", "Errubin", "Eurazba",
          "FeurigJaeger", "Fierce Pug", "Flak", "Flakyftw", "Flashnight",
          "Fury Lightning", "Giancarlo Ranalli", "Glitter", "Gran Cabron",
          "Grant Yurisic", "Guthix Smith", "HeartTheWolf", "Hinterland Seer",
          "Hoshdalele", "Hyper Dash", "Isn Cocks", "Jack Eisenberg", "Jared",
          "Jess", "JimmyJam", "Jonas Kjærgaard", "Just-A-Micro", "Kaciekk",
          "Kalexan", "Kate", "Kathryn", "Khaliber", "KnightOfGames",
          "Korroki Aternak", "Lancks", "Liam Mckenzie", "LittleFox", "Lokit",
          "Lunacae", "Lunguini", "Mallghost", "magicblue", "MelanieN222",
          "Melody Heartsong", "Metri Konor", "Michael Rissaweg", "Midien",
          "Mikusagi", "Miniponies", "Mint Deer", "Mirage", "Moonie", "nervwrack",
          "Noble Brew", "Notetaker", "Nugget", "Nyxie", "Octavia Harmony",
          "OliviaLB", "Omegacreeper", "owlcoholik", "P", "Pegajace", "Penns87",
          "Petrichor", "Philip Parkinson", "pvb306", "R", "Rapha110", "ratphomet",
          "RayGunBlast", "rebane2001", "Rezzy", "RobClemz", "Rose edge",
          "Ryan Schaedler", "SaltyMalt", "SawtoothWaves", "Scezumin", "Scoonie",
          "Sgtwaflez", "Sheol", "Shugnussy", "Silver Spirit", "SininenVarjo",
          "Skydreams", "Sol-R", "Someguy123", "Speejays", "Spiral_Donut",
          "starmanblue", "Steineronie", "Strix Pulsatrix", "SubtiltyCypress",
          "Taldork", "Talia Hoemke", "Taylor Capiola", "Tech Support",
          "TheArisoner", "Theory Pop", "Tiffany Clinton", "TK", "Triban Trabil",
          "Trizzy SkyChaser", "Tuffhover", "Turtle", "Twilight Sparkle",
          "Violet Ray", "Viktiipunk", "Vladimir Lestrade", "WinterSnow",
          "WolfyMind", "Wubby", "XepherTim", "Yaher", "Yankee Proud",
          "Zachary Blazin", "Zachary Lerman", "ZephhyLeo", "Zephlon", "zxadventurer"
        ];
        const p = popups[4].document.createElement("p");
        p.id = "patrons";
        p.style.fontFamily = "arial, sans-serif";
        p.style.fontSize = "40px";
        p.style.fontWeight = "700";
        p.style.color = "#FFF";
        p.style.textAlign = "center";
        p.style.marginTop = "900px";
        p.style.marginBottom = "950px";
        popups[4].document.body.parentElement.style.overflow = "auto";
        popups[4].document.body.style.backgroundColor = "#996875";
        p.innerText = patronText + patrons.join("\n");
        p.innerHTML = p.innerHTML.replace(`rebane2001`, `<span style="color:#FFAAFF">rebane2001</span>`);
        popups[4].document.body.innerHTML = ""; // TODO WHY IS THIS HERE?
        popups[4].document.body.appendChild(p);
      } else {
        popups[4].scrollTo(0, (patronEl.clientHeight + 100 + 900)*((currentBeat-124)/8));
      }
    } catch {}
  }
}

function experienceEnd() {
  closePopups();
  hasStarted = false;
  introMusic.muted = false;
  introMusic.currentTime = 0;
  introMusic.play();
  if (!("share" in navigator)) {
    const sshare = document.getElementById("share");
    if (sshare)
      sshare.outerHTML = sshare.innerHTML;
  }
  achievementsScreen(true);
  setBackgroundTransColor("background-color 3s", "#0A0021");
  let achievementUnlocked = false;
  achievementUnlocked = unlockAchievement("antonymph");
  setTimeout(() => {
    achievementUnlocked = false;
    try {
      // This is just so ALSA default midi passthrough port on Linux won't get detected, it's okay to cheat with virtual midi :)
      midi?.outputs?.forEach(e=>{if (!e.name.includes("Midi Through Port") && !achievementUnlocked) achievementUnlocked = unlockAchievement("musician");})
      midi?.inputs?.forEach(e=>{if (!e.name.includes("Midi Through Port") && !achievementUnlocked) achievementUnlocked = unlockAchievement("musician");})
    } catch {}
  }, achievementUnlocked ? 7000 : 0);
}

let lastFrame = 0;
let lastError = 0;
function mainLoop() {
  if (mainAudio.paused) {
    if (getCurrentBeat() > 133) {
      experienceEnd();
      return;
    }
    requestAnimationFrame(mainLoop);
    return;
  }
  
  const frameStart = window.performance.now() || Date.now();
  
  if (frameRateLimit && frameStart - lastFrame < 1000/(frameRateLimit === 1 ? 77 : 32)) {
    requestAnimationFrame(mainLoop);
    return
  }
  lastFrame = frameStart;
  const currentBeat = getCurrentBeat();
  
  if (rateLimitState) rateLimitState = (rateLimitState + 1) % (2 + windowRateLimit);
  
  if (DEBUG_MODE && document.getElementById("debug").style.display !== "none") {
    state.innerText = `currentBeat: ${currentBeat.toFixed(2)}\ncurrentBeat x4: ${(currentBeat*4).toFixed(2)}\npopupState: ${JSON.stringify(popupState, null, 2)}`;
    //state.style.backgroundColor = ((currentBeat*4)%2) > 1 ? "#FFFFEE" : "#EEFFFF";
    mainAudio.style.webkitFilter = "sepia(1)" + (((currentBeat*4)%2) > 1 ? " hue-rotate(45deg)" : "");
  }
  
  try {
    setLyrics(currentBeat);
    
    // The parts here are somewhat arbitrary.
    // I originally had everything in the mainLoop
    // function, but eventually I chunked it up
    // into parts for better JS performance.
    if (currentBeat >= 0 && currentBeat < 24+2)
      part1(currentBeat);
    if (currentBeat >= 24 && currentBeat < 41+2)
      part2(currentBeat);
    if (currentBeat >= 41 && currentBeat < 56+2)
      part3(currentBeat);
    if (currentBeat >= 56 && currentBeat < 81+2)
      part4(currentBeat);
    if (currentBeat >= 81 && currentBeat < 102+2)
      part5(currentBeat);
    if (currentBeat >= 102 && currentBeat < 132+2)
      part6(currentBeat);
  } catch (e) {
    if (Date.now() - lastError >= 100) {
      console.error(e);
      console.error(`%cWhoops, an error occurred at ${(currentBeat ?? -1).toFixed(3)}, more details above. :c`, `font-family: 'Comic Sans MS', cursive; font-size: 32px; border-radius: 10px; color: #FFF; background: #282828 no-repeat url(${loadedAssets?.["frog_1.png"] ?? ""});background-position-y: center;line-height: 32px;padding: 74px 16px 74px 116px; margin: 10px`);
      lastError = Date.now();
    }
    if (DEBUG_MODE) {
      mainAudio.pause();
    }
  }
  
  const frameEnd = window.performance.now() || Date.now();
  
  //console.log(frameStart - requestTime, frameEnd - requestTime)
  //setTimeout(() => {requestTime = window.performance.now();requestAnimationFrame(mainLoop)}, Math.max((frameStart + 1000/60) - frameEnd, 0));
  //setTimeout(mainLoop, Math.max((frameStart + 1000/60) - Date.now(), 4));
  
  requestAnimationFrame(mainLoop);
}

document.onkeypress = (event) => {
  if (event.keyCode === 32) {
    window.emergencyStop();
  }
}

// MIDI STUFF
let midi = null; // global MIDIAccess object

function requestMIDIPermission() {
  if (midi) return;
  navigator.permissions.query({ name: "midi", sysex: false }).then((result) => {
    if (result.state === "granted" || (localStorage.getItem(`antonymph.achievement.antonymph`) && result.state === "prompt"))
      navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    else if (result.state === "prompt")
      console.warn("MIDI would pop a prompt - not asking for now");
    else
      console.error("No MIDI access");
  });
}
requestMIDIPermission();


function onMIDISuccess(midiAccess) {
  // console.log("MIDI ready!");
  midi = midiAccess; // store in the global (in real usage, would probably keep in an object instance)
}

function onMIDIFailure(msg) {
  console.error(`Failed to get MIDI access - ${msg}`);
}

// idk if this is accurate, I have to do -12 for it to match what I have in FL
const midiNoteMap = {
  "G9": 127, "F#9": 126, "F9": 125, "E9": 124, "D#9": 123, "D9": 122,
  "C#9": 121, "C9": 120, "B8": 119, "A#8": 118, "A8": 117, "G#8": 116,
  "G8": 115, "F#8": 114, "F8": 113, "E8": 112, "D#8": 111, "D8": 110,
  "C#8": 109, "C8": 108, "B7": 107, "A#7": 106, "A7": 105, "G#7": 104,
  "G7": 103, "F#7": 102, "F7": 101, "E7": 100, "D#7": 99, "D7": 98,
  "C#7": 97, "C7": 96, "B6": 95, "A#6": 94, "A6": 93, "G#6": 92,
  "G6": 91, "F#6": 90, "F6": 89, "E6": 88, "D#6": 87, "D6": 86,
  "C#6": 85, "C6": 84, "B5": 83, "A#5": 82, "A5": 81, "G#5": 80,
  "G5": 79, "F#5": 78, "F5": 77, "E5": 76, "D#5": 75, "D5": 74,
  "C#5": 73, "C5": 72, "B4": 71, "A#4": 70, "A4 ": 69, "G#4": 68,
  "G4": 67, "F#4": 66, "F4": 65, "E4": 64, "D#4": 63, "D4": 62,
  "C#4": 61, "C4 ": 60, "B3": 59, "A#3": 58, "A3": 57, "G#3": 56,
  "G3": 55, "F#3": 54, "F3": 53, "E3": 52, "D#3": 51, "D3": 50,
  "C#3": 49, "C3": 48, "B2": 47, "A#2": 46, "A2": 45, "G#2": 44,
  "G2": 43, "F#2": 42, "F2": 41, "E2": 40, "D#2": 39, "D2": 38,
  "C#2": 37, "C2": 36, "B1": 35, "A#1": 34, "A1": 33, "G#1": 32,
  "G1": 31, "F#1": 30, "F1": 29, "E1": 28, "D#1": 27, "D1": 26,
  "C#1": 25, "C1": 24, "B0": 23, "A#0": 22, "A0": 21
};

const patterns = [
  [
    [2, 4, "F7", 100],
    [4, 8, "A#6", 100],
    [4, 8, "A#6", 100],
    [6, 8, "A6", 100],
    [8, 10, "F6", 100],
    [10, 12, "A#5", 100],
    [12, 15, "A5", 100],
  ],
  [
    [0 + (5/24), 2 + (5/24), "A#4", 100],
    [4, 6, "D5", 100],
    [6 + (7/24), 8 + (7/24), "C5", 100],
  ],
  [
    [0, 0.5, "A#6", 32],
    [1, 1.5, "A#6", 32],
    [2, 2.5, "A#6", 32],
    [3, 3.5, "A#6", 32],
    [4, 4.5, "B5", 32],
    [5, 5.5, "B5", 32],
    [6, 6.5, "B5", 32],
    [7, 7.5, "B5", 32],
  ],
];

function sendMidiData(midiData) {
  try {
    midi?.outputs?.forEach(out => out.send(midiData));
  } catch (e) {
    console.error(e);
  }
  try {
    navigator?.vibrate?.(midiData[0] === 0x90 ? midiData[1] : 0);
  } catch (e) {
    console.error(e);
  }
}

function playPatternNote(patternNote, offset) {
  setTimeout(()=>sendMidiData([0x90, midiNoteMap[patternNote[2]] - 12, patternNote[3]]), beatToMs(patternNote[0]/16) + offset);
  setTimeout(()=>sendMidiData([0x80, midiNoteMap[patternNote[2]] - 12, patternNote[3]]), beatToMs(patternNote[1]/16) + offset);
}

function playPatternWithOffset(patternIndex, offset) {
  const pattern = patterns[patternIndex];
  for (const patternNote of pattern)
    playPatternNote(patternNote, offset);
}

// UTIL
function bounceBack(x) {
  return x < 1 ? x : (2-x);
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}


//I don't know why rebane did it like this but it's kinda funny lmao

console
[`log`]


(`%c${"█"
.repeat(0o0005)}`
.repeat(0o0005),
"color:#5BCEFA",
"color:#F5A9B8",
"color:#FFFFFF",
"color:#F5A9B8",
"color:#5BCEFA")