// Referencias aos elementos principais da interface.
const game = document.getElementById("game");
const pet = document.getElementById("pet");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const messageEl = document.getElementById("message");
const petTypeInputs = document.querySelectorAll('input[name="petType"]');

// Constantes de fisica e progressao da dificuldade.
const GRAVITY = 0.58;
const JUMP_FORCE = 9.6;
const BASE_SPEED = 5.2;
const SPEED_GAIN = 0.005;

// Altura do solo visual (deve bater com o CSS).
const GROUND_Y = 44;

// Quantidade de obstaculos e espacamento minimo/maximo entre eles.
const OBSTACLE_COUNT = 3;
const MIN_GAP = 220;
const MAX_GAP = 360;

// Estado dinamico do personagem e da partida.
let petY = 0;
let velocityY = 0;
let score = 0;

// Recorde persistido no navegador.
let highScore = Number(localStorage.getItem("petHighScore") || 0);

// Flags de estado do jogo.
let gameOver = false;
let started = false;

// Detecta se eh dispositivo movel.
const isMobile = () => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || navigator.maxTouchPoints > 0
  );
};

// Vetor com todos os obstaculos atualmente em jogo.
const obstacles = [];

// Exibe o recorde inicial no HUD.
highScoreEl.textContent = highScore;

// Habilita/desabilita o seletor de personagem.
function setPetSelectorEnabled(enabled) {
  petTypeInputs.forEach((input) => {
    input.disabled = !enabled;
  });
}

// Retorna um espacamento aleatorio para distribuir obstaculos.
function randomGap() {
  return MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
}

// Atualiza a altura do pet no eixo Y e a animacao de corrida.
function updatePet() {
  // Posiciona o pet relativo ao chao.
  pet.style.bottom = `${GROUND_Y + petY}px`;

  // Correndo no chao: ativa animacao. Pulando/parado: remove.
  if (started && !gameOver && petY === 0) {
    pet.classList.add("running");
  } else {
    pet.classList.remove("running");
  }
}

// Atualiza a aparencia do personagem entre cachorro e gato.
function setPetType(type) {
  pet.classList.remove("dog", "cat");
  pet.classList.add(type);

  if (type === "cat") {
    pet.setAttribute("aria-label", "Gato");
  } else {
    pet.setAttribute("aria-label", "Cachorro");
  }
}

// Aplica posicao e tamanho atual em um obstaculo especifico.
function styleObstacle(obstacle) {
  obstacle.el.style.left = `${obstacle.x}px`;
  obstacle.el.style.width = `${obstacle.width}px`;
  obstacle.el.style.height = `${obstacle.height}px`;
}

// Cria um novo obstaculo DOM + objeto de controle.
function createObstacle(x) {
  // Elemento visual do obstaculo.
  const obstacleEl = document.createElement("div");
  obstacleEl.className = "obstacle";
  obstacleEl.setAttribute("aria-label", "Obstaculo");

  // Insere o obstaculo antes da mensagem para manter o overlay por cima.
  game.insertBefore(obstacleEl, messageEl);

  // Estado interno do obstaculo.
  const obstacle = {
    el: obstacleEl,
    x,
    width: 20 + Math.floor(Math.random() * 14),
    height: 30 + Math.floor(Math.random() * 24),
    passed: false,
  };

  // Renderiza o estado inicial do obstaculo.
  styleObstacle(obstacle);
  return obstacle;
}

// Recria a fila de obstaculos (inicio/restart/resize).
function resetObstacles() {
  // Remove obstaculos antigos do DOM.
  obstacles.forEach((obstacle) => obstacle.el.remove());

  // Limpa o array para gerar novamente do zero.
  obstacles.length = 0;

  // Comeca a desenhar os obstaculos um pouco fora da tela.
  let x = game.clientWidth + 140;

  // Cria a quantidade configurada, cada um com gap aleatorio.
  for (let i = 0; i < OBSTACLE_COUNT; i += 1) {
    const obstacle = createObstacle(x);
    obstacles.push(obstacle);
    x += randomGap();
  }
}

// Acao de pulo ou reinicio quando a partida terminou.
function jump() {
  // Se perdeu, o mesmo comando de pulo vira "reiniciar".
  if (gameOver) {
    restart();
    return;
  }

  // Ao primeiro toque/tecla, inicia a partida e esconde o overlay.
  if (!started) {
    started = true;
    setPetSelectorEnabled(false);
    hideMessage();
  }

  // Permite pulo somente quando o pet esta no solo.
  if (petY <= 0) {
    velocityY = JUMP_FORCE;
  }
}

// Mostra uma mensagem no overlay central.
function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.remove("hidden");
}

// Esconde o overlay central.
function hideMessage() {
  messageEl.classList.add("hidden");
}

// Reinicia os estados principais para nova partida.
function restart() {
  // Placar da rodada atual volta para zero.
  score = 0;
  scoreEl.textContent = 0;

  // Pet volta ao estado inicial no chao.
  petY = 0;
  velocityY = 0;

  // Reabre o loop de jogo em estado de pre-inicio.
  gameOver = false;
  started = false;
  setPetSelectorEnabled(true);

  // Regera obstaculos e atualiza visual.
  resetObstacles();
  updatePet();
  
  // Mensagem diferente para mobile e desktop.
  const instructionMessage = isMobile()
    ? "Escolha o animal e toque na tela para pular"
    : "Escolha o animal e aperte espaco ou seta para cima";
  showMessage(instructionMessage);
}

// Testa colisao entre o pet e qualquer obstaculo ativo.
function detectCollision() {
  // Caixa de colisao do pet na tela.
  const petRect = pet.getBoundingClientRect();

  // Se qualquer obstaculo encostar, retorna true.
  return obstacles.some((obstacle) => {
    const obstacleRect = obstacle.el.getBoundingClientRect();

    // Separacao de retangulos (AABB): se nao houver separacao, houve colisao.
    return !(
      petRect.top > obstacleRect.bottom ||
      petRect.bottom < obstacleRect.top ||
      petRect.right < obstacleRect.left ||
      petRect.left > obstacleRect.right
    );
  });
}

// Loop principal do jogo (executado a cada frame).
function loop() {
  // Enquanto nao iniciou ou se ja perdeu, mantem o loop aguardando input.
  if (!started || gameOver) {
    requestAnimationFrame(loop);
    return;
  }

  // Atualiza fisica vertical: gravidade reduz velocidade de subida.
  velocityY -= GRAVITY;

  // Soma velocidade na posicao atual do pet.
  petY += velocityY;

  // Impede atravessar o solo.
  if (petY <= 0) {
    petY = 0;
    velocityY = 0;
  }

  // Velocidade horizontal aumenta com a pontuacao.
  const speed = BASE_SPEED + score * SPEED_GAIN;

  // Guarda o obstaculo mais a frente para reciclagem ordenada.
  let farthestX = 0;

  // Atualiza posicao de todos os obstaculos.
  obstacles.forEach((obstacle) => {
    obstacle.x -= speed;
    farthestX = Math.max(farthestX, obstacle.x);

    // Conta ponto quando obstaculo passa pelo pet.
    if (!obstacle.passed && obstacle.x + obstacle.width < parseFloat(getComputedStyle(pet).left) + 24) {
      obstacle.passed = true;
      score += 1;
      scoreEl.textContent = score;
    }
  });

  // Recicla obstaculos que sairam da tela para gerar fluxo infinito.
  obstacles.forEach((obstacle) => {
    if (obstacle.x + obstacle.width < 0) {
      // Reposiciona apos o ultimo obstaculo existente.
      obstacle.x = farthestX + randomGap();

      // Varia tamanho para nao ficar repetitivo.
      obstacle.width = 20 + Math.floor(Math.random() * 14);
      obstacle.height = 30 + Math.floor(Math.random() * 24);
      obstacle.passed = false;
      farthestX = obstacle.x;
    }

    // Renderiza o estado final do frame.
    styleObstacle(obstacle);
  });

  // Se colidiu, encerra rodada e atualiza recorde se necessario.
  if (detectCollision()) {
    gameOver = true;
    started = false;
    setPetSelectorEnabled(true);

    // Persistencia de melhor pontuacao.
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("petHighScore", String(highScore));
      highScoreEl.textContent = highScore;
    }

    // Exibe instrucoes para reiniciar (diferente para mobile e desktop).
    const gameOverMessage = isMobile()
      ? "Game Over - escolha o animal e toque para continuar"
      : "Game Over - escolha o animal e aperte espaco ou seta para cima";
    showMessage(gameOverMessage);
  }

  // Atualiza posicao/animacao do pet e agenda proximo frame.
  updatePet();
  requestAnimationFrame(loop);
}

// Trata teclado para iniciar, pular e reiniciar.
function handleInput(event) {
  // Para teclado, filtra apenas as teclas permitidas.
  if (event.type === "keydown") {
    const validKey = event.code === "Space" || event.code === "ArrowUp";
    if (!validKey) {
      return;
    }

    // Evita scroll da pagina ao apertar espaco.
    event.preventDefault();
  }

  // Executa acao principal do input.
  jump();
}

// Controles: teclado no desktop, toque no mobile.
if (isMobile()) {
  // Toque na tela para pular em dispositivos moveis.
  game.addEventListener("touchstart", handleInput);
} else {
  // Teclado no desktop.
  window.addEventListener("keydown", handleInput);
}

// Em resize, reorganiza os obstaculos para manter proporcao.
window.addEventListener("resize", () => {
  resetObstacles();
});

// Troca o personagem quando o usuario escolhe outro pet.
petTypeInputs.forEach((input) => {
  input.addEventListener("change", (event) => {
    setPetType(event.target.value);
  });
});

// Inicializacao da partida: gera obstaculos e mostra mensagem inicial.
resetObstacles();
setPetType("dog");
setPetSelectorEnabled(true);
updatePet();

// Mensagem inicial diferente para mobile e desktop.
const initialMessage = isMobile()
  ? "Escolha o animal e toque na tela para pular"
  : "Escolha o animal e aperte espaco ou seta para cima";
showMessage(initialMessage);

// Inicia o loop de renderizacao.
requestAnimationFrame(loop);
