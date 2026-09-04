const character = document.getElementById('character');
const bodyButton = document.getElementById('bodyButton');
const musicButton = document.getElementById('musicButton');
const backgroundMusic = document.getElementById('backgroundMusic');
const chatForm = document.getElementById('chatForm');
const chatHistory = document.getElementById('chatHistory');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

const proxyUrl = 'https://game-ai.semakovasveta460.workers.dev/api/ai';
const characterAssets = {
  1: { normal: 'img/normal1.png', mouth: 'img/mouth1.png', blink: 'img/blink1.png' },
  2: { normal: 'img/normal2.png', mouth: 'img/mouth2.png', blink: 'img/blink2.png' }
};
const musicTracks = ['music/music1.mp3', 'music/music2.mp3', 'music/music3.mp3'];

const state = {
  body: 1,
  speaking: false,
  mouthTimer: null,
  musicTrack: -1
};

backgroundMusic.volume = 0.18;

function preloadCharacterAssets() {
  Object.values(characterAssets).forEach((assets) => {
    Object.values(assets).forEach((source) => {
      const image = new Image();
      image.src = source;
    });
  });
}

function setCharacterBody(body) {
  state.body = body;
  character.src = characterAssets[body].normal;
}

function blink() {
  if (state.speaking) return;

  const assets = characterAssets[state.body];
  character.src = assets.blink;
  window.setTimeout(() => {
    if (!state.speaking) character.src = assets.normal;
  }, 250);
}

function startBlinking() {
  window.setInterval(blink, 4000);
}

function speakForThreeSeconds() {
  if (state.speaking) return;

  state.speaking = true;
  let mouthOpen = true;
  const assets = characterAssets[state.body];
  character.src = assets.mouth;

  state.mouthTimer = window.setInterval(() => {
    mouthOpen = !mouthOpen;
    character.src = mouthOpen ? assets.mouth : assets.normal;
  }, 250);

  window.setTimeout(() => {
    window.clearInterval(state.mouthTimer);
    state.speaking = false;
    character.src = assets.normal;
  }, 3000);
}

function addMessage(type, text) {
  const message = document.createElement('div');
  message.className = `message ${type}`;
  message.textContent = text;
  chatHistory.appendChild(message);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function cleanPrompt(value) {
  return value.replace(/[<>]/g, '').trim();
}

async function requestAiReply(prompt) {
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, character: state.body })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Прокси вернул HTTP ${response.status}`);
  }

  if (!data.reply) throw new Error('Прокси не вернул текст ответа');
  return data.reply;
}

function updateMusicState(label, nextLabel, enabled) {
  musicButton.setAttribute('aria-label', label);
  musicButton.setAttribute('aria-pressed', String(enabled));
  musicButton.dataset.nextTrack = nextLabel;
}

async function switchMusic() {
  state.musicTrack += 1;

  if (state.musicTrack >= musicTracks.length) {
    backgroundMusic.pause();
    backgroundMusic.removeAttribute('src');
    state.musicTrack = -1;
    updateMusicState('Включить музыку 1', 'Музыка 1', false);
    return;
  }

  backgroundMusic.src = musicTracks[state.musicTrack];

  try {
    await backgroundMusic.play();
    const nextTrack = state.musicTrack === musicTracks.length - 1
      ? 'Выключить музыку'
      : `Переключить на музыку ${state.musicTrack + 2}`;
    updateMusicState(nextTrack, `Музыка ${state.musicTrack + 1}`, true);
  } catch (error) {
    updateMusicState(`Файл music${state.musicTrack + 1}.mp3 не найден`, 'Ошибка музыки', false);
  }
}

bodyButton.addEventListener('click', () => {
  setCharacterBody(state.body === 1 ? 2 : 1);
});

musicButton.addEventListener('click', switchMusic);

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const prompt = cleanPrompt(userInput.value);
  if (!prompt) return;

  addMessage('user', prompt);
  userInput.value = '';
  userInput.disabled = true;
  sendButton.disabled = true;
  speakForThreeSeconds();

  try {
    addMessage('ai', await requestAiReply(prompt));
  } catch (error) {
    addMessage('ai', `Упс, не удалось получить ответ от ИИ. ${error.message}`);
  } finally {
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
});

userInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') userInput.value = '';
});

preloadCharacterAssets();
setCharacterBody(1);
startBlinking();
