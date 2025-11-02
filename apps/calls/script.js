var voice = new roturVoice()
const statusEl = document.getElementById('status')

document.getElementById('connectBtn').onclick = async () => {
  const name = document.getElementById('peerName').value
  await voice.connect({ NAME: name })
  statusEl.textContent = voice.getStatus()
}

document.getElementById('callBtn').onclick = async () => {
  const target = document.getElementById('targetPeer').value
  await voice.callPeer({ NAME: target, WAIT: 'wait' })
  statusEl.textContent = voice.getCallStatus()
}

document.getElementById('answerBtn').onclick = () => {
  voice.answerCall()
  statusEl.textContent = 'Answering...'
}

document.getElementById('hangupBtn').onclick = () => {
  voice.hangup()
  statusEl.textContent = 'Idle'
}

setInterval(() => {
  statusEl.textContent = `Connection: ${voice.getStatus()} | Call: ${voice.getCallStatus()}`
}, 1000)