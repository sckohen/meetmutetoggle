// global
let tabMuteStatus = true
let tabCamEnabled = true
let chatFocused = false

let macos = false;
let muteKeyCombo = {};
let camKeyCombo = {};


function setKeyCombos() {
  if (navigator.appVersion.indexOf("Mac")!=-1) macos = true;
  if (macos) {
    muteKeyCombo = {
      bubbles: true,
      cancelable: true,
      metaKey: true,
      keyCode: 68,
      code: "KeyD"
    }
    camKeyCombo = {
      bubbles: true,
      cancelable: true,
      metaKey: true,
      keyCode: 69,
      code: "KeyE"
    }
  } else {
    muteKeyCombo = {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      keyCode: 68,
      code: "KeyD"
    }
    camKeyCombo = {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      keyCode: 69,
      code: "KeyE"
    }
  }
}

// send mute toggle key combo based on OS
function toggleMute() {
  document.dispatchEvent(new KeyboardEvent("keydown", muteKeyCombo));
}

// send cam toggle key combo based on OS
function toggleCam() {
  document.dispatchEvent(new KeyboardEvent("keydown", camKeyCombo));
}

// send mute status to the background script for processing
function setMuteStatus(target) {
  muted = target.getAttribute('data-is-muted') == 'true'
  micProblem = target.getAttribute('aria-label') == 'Microphone problem. Show more info'
  if (tabMuteStatus !== muted) {
    tabMuteStatus = muted
    chrome.runtime.sendMessage({
      action: "update", 
      muted: micProblem ? 'unknown' : muted,
      camDisabled: tabCamDisabled
    }, function(response) {
      console.log(response.message);
      //return
    });
  }
}

function setCamStatus(target) {
  camDisabled = target.getAttribute('data-is-muted') == 'true'
  if (tabCamEnabled !== camDisabled) {
    tabCamEnabled = camDisabled
    // TODO: move this sendMessage to a generic function
    chrome.runtime.sendMessage({
      action: "update",
      muted: tabMuteStatus,
      camDisabled: camDisabled
    }, function(response) {
      console.log(response.message);
      //return
    });
  }
}

// observer callback - find mute button via attribute matching
function pageChanged(mutations, observer) {
  mutations.forEach( (m) => {
    if (m.type == 'attributes') {
      if (
        m.target.matches('div[data-tooltip*="microphone"]') 
        || m.target.matches('div[aria-label*="microphone"]')
        || m.target.matches('button[aria-label*="microphone"]')
      )  {
        setMuteStatus(m.target)
      }
      else if (
        m.target.matches('div[data-tooltip*="camera"]') 
        || m.target.matches('div[aria-label*="camera"]')
        || m.target.matches('button[aria-label*="camera"]')
      )  {
        setCamStatus(m.target)
      }
    }
  })
}

// full page mutation observer
const pageObserver = new MutationObserver(pageChanged)
pageObserver.observe(document.body, {
  subtree: true,
  childList: false,
  attributes: true,
  attributeFilter: ['data-is-muted']
})

// *************
// event handlers
// *************

function handleMessage(request, sender, sendResponse) {
  if (!sender.tab) { 
    switch (request.action) {
      case 'toggle-mute':
        toggleMute()
        sendResponse({updated: true, message: 'mute toggled'});
        console.log("toggling mute", request.action)
        break;
      case 'toggle-cam':
        toggleCam()
        sendResponse({updated: true, message: 'cam toggled'});
        console.log("toggling cam", request.action)
        break;
      default:
        sendResponse({updated: false, message: 'error'});
        console.log("unknown action:", request.action)
    }
  }
}

function handleMeetClosed(event) {
  chrome.runtime.sendMessage({
    muted: 'unknown',
    action: 'leaving'
  }, function (response) {
    return
  })
}

// *************
// event listeners
// *************

// background script message listener
chrome.runtime.onMessage.addListener(handleMessage)

// fires on domain change or tab close
window.addEventListener("beforeunload", handleMeetClosed)

// *************
// init
// *************

// determine os and configure mute key combo
setKeyCombos()
