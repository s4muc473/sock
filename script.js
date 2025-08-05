document.addEventListener('DOMContentLoaded', () => {
    const Game = {
        boardSize: 8,
        grid: [],
        ownerGrid: [],
        gameStarted: false,
        currentPlayer: null,
        playerBase: null,
        player2Base: null,
        aiBases: {},
        playersInGame: [],
        currentMode: null,
        basesEstablishedCount: 0,
        aiColors: ['ai1', 'ai2', 'ai3', 'ai4', 'ai5'],

        elements: {
            board: document.getElementById('board'),
            messageBox: document.getElementById('message-box'),
            modePvAI: document.getElementById('mode-pvai'),
            modePvP: document.getElementById('mode-pvp'),
            modePvAIAI: document.getElementById('mode-pvai-ai'),
            modePv5AI: document.getElementById('mode-pv5ai'),
            gameModesContainer: document.getElementById('game-modes'),
            playersStatus: document.getElementById('players-status')
        },
        directions: [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ],

        init() {
            this.setupModeSelection();
            this.resetGame();
            this.updateMessage('Escolha um modo de jogo para começar.');
            this.elements.board.style.pointerEvents = 'none';
            this.setBoardBackground('none');
        },

        setupModeSelection() {
            this.elements.modePvAI.addEventListener('click', () => this.selectMode('pvai'));
            this.elements.modePvP.addEventListener('click', () => this.selectMode('pvp'));
            this.elements.modePvAIAI.addEventListener('click', () => this.selectMode('pvai-ai'));
            this.elements.modePv5AI.addEventListener('click', () => this.selectMode('pv5ai'));
        },

        selectMode(mode) {
            this.currentMode = mode;
            this.elements.gameModesContainer.style.display = 'none';
            this.resetGame();

            if (mode === 'pvai') {
                this.playersInGame = ["player", "ai1"];
                this.updateMessage('Modo: Jogador vs. IA. Jogador 1: clique em um quadrado para iniciar sua base.');
            } else if (mode === 'pvp') {
                this.playersInGame = ["player", "player2"];
                this.updateMessage('Modo: Jogador vs. Jogador. Jogador 1: clique para iniciar sua base.');
            } else if (mode === 'pvai-ai') {
                this.playersInGame = ["player", "ai1", "ai2"];
                this.updateMessage('Modo: Jogador vs IA vs IA. Jogador 1: clique para iniciar sua base.');
            } else if (mode === 'pv5ai') {
                this.playersInGame = ["player", "ai1", "ai2", "ai3", "ai4", "ai5"];
                this.updateMessage('Modo: Jogador vs 5 IAs. Jogador 1: clique para iniciar sua base.');
            }
            
            this.elements.board.style.pointerEvents = 'auto';
            this.setBoardBackground('none');
        },

        resetGame() {
            this.setupGrid();
            this.createBoardElements();
            this.gameStarted = false;
            this.currentPlayer = null;
            this.playerBase = null;
            this.player2Base = null;
            this.aiBases = {};
            this.basesEstablishedCount = 0;
            this.elements.board.classList.remove('game-over');
            this.updateMessage('');
            this.setBoardBackground('none');
            this.elements.playersStatus.innerHTML = '';
        },

        setupGrid() {
            this.grid = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(0));
            this.ownerGrid = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill('none'));
        },

        createBoardElements() {
            this.elements.board.innerHTML = '';
            for (let i = 0; i < this.boardSize; i++) {
                for (let j = 0; j < this.boardSize; j++) {
                    const cell = document.createElement('div');
                    cell.classList.add('cell');
                    cell.dataset.row = i;
                    cell.dataset.col = j;
                    cell.addEventListener('click', this.handleCellClick.bind(this));
                    this.elements.board.appendChild(cell);
                }
            }
        },

        updateCellDisplay(row, col) {
            const cell = this.elements.board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                const points = this.grid[row][col];
                const owner = this.ownerGrid[row][col];

                cell.textContent = points > 0 ? points : '';

                cell.classList.remove('active', 'player2-cell', 'base', 'player2-base');
                this.aiColors.forEach(aiColor => {
                    cell.classList.remove(`${aiColor}-cell`, `${aiColor}-base`);
                });

                if (points > 0) {
                    if (owner === 'player') {
                        cell.classList.add('active');
                        if (this.playerBase && this.playerBase.row === row && this.playerBase.col === col) {
                            cell.classList.add('base');
                        }
                    } else if (owner === 'player2') {
                        cell.classList.add('player2-cell');
                        if (this.player2Base && this.player2Base.row === row && this.player2Base.col === col) {
                            cell.classList.add('player2-base');
                        }
                    } else if (owner.startsWith('ai')) {
                        cell.classList.add(`${owner}-cell`);
                        if (this.aiBases[owner] && this.aiBases[owner].row === row && this.aiBases[owner].col === col) {
                            cell.classList.add(`${owner}-base`);
                        }
                    }
                }
            }
        },

        updateMessage(message) {
            this.elements.messageBox.textContent = message;
        },

        getManhattanDistance(r1, c1, r2, c2) {
            return Math.abs(r1 - r2) + Math.abs(c1 - c2);
        },

        startTurnsSequence() {
            this.playersInGame.forEach(player => {
                if (player.startsWith('ai')) {
                    this.placeEntityBase(player);
                }
            });

            this.currentPlayer = this.playersInGame[Math.floor(Math.random() * this.playersInGame.length)];
            
            let message = 'Bases estabelecidas! ';
            if (this.playersInGame.length > 2) {
                message += `${this.playersInGame.length} jogadores competindo. `;
            }
            message += `É a vez de ${this.getPlayerDisplayName(this.currentPlayer)}.`;
            
            this.updateMessage(message);
            this.gameStarted = true;
            this.setBoardBackground(this.currentPlayer);
            this.updatePlayersStatus();

            if (this.currentPlayer.startsWith("ai")) {
                setTimeout(() => this.aiTurn(), 1000);
            }
        },

        getPlayerDisplayName(playerType) {
            switch (playerType) {
                case 'player': return 'Jogador 1';
                case 'player2': return 'Jogador 2';
                case 'ai1': return 'IA Vermelha';
                case 'ai2': return 'IA Azul';
                case 'ai3': return 'IA Verde';
                case 'ai4': return 'IA Amarela';
                case 'ai5': return 'IA Roxa';
                default: return 'Desconhecido';
            }
        },

        placeEntityBase(entityType) {
            const minDistance = 4;
            let row, col;
            let validPlacement = false;

            while (!validPlacement) {
                row = Math.floor(Math.random() * this.boardSize);
                col = Math.floor(Math.random() * this.boardSize);

                if (this.ownerGrid[row][col] !== 'none') {
                    continue;
                }

                let isFarEnough = true;
                
                if (this.playerBase) {
                    const dist = this.getManhattanDistance(this.playerBase.row, this.playerBase.col, row, col);
                    if (dist < minDistance) isFarEnough = false;
                }
                
                if (this.player2Base) {
                    const dist = this.getManhattanDistance(this.player2Base.row, this.player2Base.col, row, col);
                    if (dist < minDistance) isFarEnough = false;
                }
                
                for (const aiType in this.aiBases) {
                    const base = this.aiBases[aiType];
                    const dist = this.getManhattanDistance(base.row, base.col, row, col);
                    if (dist < minDistance) isFarEnough = false;
                }

                if (isFarEnough) {
                    validPlacement = true;
                }
            }

            this.grid[row][col] = 1;
            this.ownerGrid[row][col] = entityType;

            if (entityType.startsWith('ai')) {
                this.aiBases[entityType] = { row: row, col: col };
            } else if (entityType === 'player2') {
                this.player2Base = { row: row, col: col };
            }

            const cellElement = this.elements.board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cellElement) {
                cellElement.classList.add(`${entityType}-base`);
            }
            this.updateCellDisplay(row, col);
        },

        nextTurn() {
            const activePlayers = this.playersInGame.filter(player =>
                !this.isPlayerDefeated(player)
            );

            if (activePlayers.length === 1) {
                this.endGame(activePlayers[0]);
                return;
            }

            let nextIndex = this.playersInGame.indexOf(this.currentPlayer);
            let attempts = 0;
            const maxAttempts = this.playersInGame.length;

            do {
                nextIndex = (nextIndex + 1) % this.playersInGame.length;
                this.currentPlayer = this.playersInGame[nextIndex];
                attempts++;
            } while (this.isPlayerDefeated(this.currentPlayer) && attempts < maxAttempts);

            if (attempts >= maxAttempts) {
                this.endGame(null);
                return;
            }

            this.updateMessage(`É a vez de ${this.getPlayerDisplayName(this.currentPlayer)}.`);
            this.setBoardBackground(this.currentPlayer);
            this.updatePlayersStatus();

            if (this.currentPlayer.startsWith("ai")) {
                setTimeout(() => this.aiTurn(), 1000);
            }
        },

        setBoardBackground(playerType) {
            this.elements.board.classList.remove('board-player-turn', 'board-player2-turn');
            this.aiColors.forEach(aiColor => {
                this.elements.board.classList.remove(`board-${aiColor}-turn`);
            });

            if (playerType === 'player') {
                this.elements.board.classList.add('board-player-turn');
            } else if (playerType === 'player2') {
                this.elements.board.classList.add('board-player2-turn');
            } else if (playerType.startsWith('ai')) {
                this.elements.board.classList.add(`board-${playerType}-turn`);
            }
        },

        handleCellClick(event) {
            if (!this.gameStarted || this.elements.board.classList.contains('game-over')) {
                return;
            }

            if (this.currentPlayer.startsWith("ai")) {
                this.updateMessage("Aguarde sua vez!");
                return;
            }

            const row = parseInt(event.target.dataset.row);
            const col = parseInt(event.target.dataset.col);

            if (this.isPlayerDefeated(this.currentPlayer)) {
                this.updateMessage(`Você foi eliminado! Aguarde o fim do jogo.`);
                this.nextTurn();
                return;
            }

            if (this.grid[row][col] > 0 && this.ownerGrid[row][col] === this.currentPlayer) {
                this.playTurn(row, col, this.currentPlayer);
            } else if (this.ownerGrid[row][col] !== this.currentPlayer && this.ownerGrid[row][col] !== 'none') {
                this.updateMessage(`Essa célula pertence a ${this.getPlayerDisplayName(this.ownerGrid[row][col])}!`);
            } else {
                this.updateMessage(`Você só pode interagir com suas células ativas.`);
            }
        },

        playTurn(row, col, playerType) {
            this.grid[row][col]++;
            this.updateCellDisplay(row, col);

            if (this.grid[row][col] >= 4) {
                setTimeout(() => this.initiateMultiplication(row, col, playerType), 100);
            } else {
                this.updateMessage(`${this.getPlayerDisplayName(playerType)} clicou em (${row},${col}). Pontos: ${this.grid[row][col]}.`);
                this.nextTurn();
            }
        },

        initiateMultiplication(startRow, startCol, playerType) {
            const multiplicationQueue = [];
            const processedCells = new Set();
            let totalAffectedCells = 0;

            multiplicationQueue.push({ row: startRow, col: startCol, owner: playerType });
            processedCells.add(`${startRow},${startCol}`);

            const processNextMultiplication = () => {
                if (multiplicationQueue.length === 0) {
                    this.updateMessage(`${this.getPlayerDisplayName(playerType)} completou a explosão em cadeia.`);

                    const activePlayers = this.playersInGame.filter(player =>
                        !this.isPlayerDefeated(player)
                    );

                    if (activePlayers.length === 1) {
                        this.endGame(activePlayers[0]);
                        return;
                    }

                    this.nextTurn();
                    return;
                }

                const currentCell = multiplicationQueue.shift();
                const row = currentCell.row;
                const col = currentCell.col;
                const owner = currentCell.owner;

                this.grid[row][col] = 0;
                this.updateCellDisplay(row, col);

                const baseMap = {
                    'player': this.playerBase,
                    'player2': this.player2Base,
                    ...this.aiBases
                };
                const currentBase = baseMap[owner];
                if (currentBase && currentBase.row === row && currentBase.col === col) {
                    const baseCellElement = this.elements.board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                    if (baseCellElement) {
                        baseCellElement.classList.remove(`${owner}-base`);
                    }
                }

                this.directions.forEach(dir => {
                    const newRow = row + dir[0];
                    const newCol = col + dir[1];
                    const cellKey = `${newRow},${newCol}`;

                    if (newRow >= 0 && newRow < this.boardSize && newCol >= 0 && newCol < this.boardSize) {
                        totalAffectedCells++;

                        if (this.grid[newRow][newCol] > 0) {
                            this.grid[newRow][newCol]++;
                            if (this.ownerGrid[newRow][newCol] !== owner) {
                                this.ownerGrid[newRow][newCol] = owner;
                            }
                        } else {
                            this.grid[newRow][newCol] = 1;
                            this.ownerGrid[newRow][newCol] = owner;
                        }
                        this.updateCellDisplay(newRow, newCol);

                        if (this.grid[newRow][newCol] >= 4 && !processedCells.has(cellKey)) {
                            multiplicationQueue.push({ row: newRow, col: newCol, owner: owner });
                            processedCells.add(cellKey);
                        }
                    }
                });

                setTimeout(processNextMultiplication, 200);
            };

            processNextMultiplication();
        },

        aiTurn() {
            const aiPlayerType = this.currentPlayer;
            this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} está pensando...`);

            let aiCells = [];
            let enemyCells = [];

            for (let r = 0; r < this.boardSize; r++) {
                for (let c = 0; c < this.boardSize; c++) {
                    const points = this.grid[r][c];
                    const owner = this.ownerGrid[r][c];

                    if (owner === aiPlayerType && points > 0) {
                        aiCells.push({ row: r, col: c, points: points });
                    } else if (owner !== 'none' && owner !== aiPlayerType && points > 0) {
                        enemyCells.push({ row: r, col: c, owner: owner, points: points });
                    }
                }
            }

            const potentialMultipliers = aiCells.filter(cell => cell.points === 3);
            if (potentialMultipliers.length > 0) {
                const aiMove = potentialMultipliers[Math.floor(Math.random() * potentialMultipliers.length)];
                this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} está multiplicando em (${aiMove.row},${aiMove.col}).`);
                this.playTurn(aiMove.row, aiMove.col, aiPlayerType);
                return;
            }

            const vulnerableEnemies = enemyCells.filter(cell => cell.points === 3);
            if (vulnerableEnemies.length > 0) {
                const target = vulnerableEnemies[Math.floor(Math.random() * vulnerableEnemies.length)];
                const adjacentCells = this.getAdjacentCells(target.row, target.col);
                const adjacentAiCells = adjacentCells.filter(cell =>
                    this.ownerGrid[cell.row][cell.col] === aiPlayerType &&
                    this.grid[cell.row][cell.col] > 0
                );

                if (adjacentAiCells.length > 0) {
                    const attackFrom = adjacentAiCells[0];
                    this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} está atacando ${this.getPlayerDisplayName(target.owner)} em (${target.row},${target.col}).`);
                    this.playTurn(attackFrom.row, attackFrom.col, aiPlayerType);
                    return;
                }
            }

            if (aiCells.length > 0) {
                aiCells.sort((a, b) => b.points - a.points);
                const aiMove = aiCells[0];
                this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} está expandindo em (${aiMove.row},${aiMove.col}).`);
                this.playTurn(aiMove.row, aiMove.col, aiPlayerType);
                return;
            }

            const emptyCells = [];
            for (let r = 0; r < this.boardSize; r++) {
                for (let c = 0; c < this.boardSize; c++) {
                    if (this.ownerGrid[r][c] === 'none') {
                        emptyCells.push({ row: r, col: c });
                    }
                }
            }

            if (emptyCells.length > 0) {
                const strategicCells = emptyCells.filter(cell => {
                    return this.directions.some(dir => {
                        const adjRow = cell.row + dir[0];
                        const adjCol = cell.col + dir[1];
                        return adjRow >= 0 && adjRow < this.boardSize &&
                            adjCol >= 0 && adjCol < this.boardSize &&
                            this.ownerGrid[adjRow][adjCol] !== 'none' &&
                            this.ownerGrid[adjRow][adjCol] !== aiPlayerType;
                    });
                });

                const targetCells = strategicCells.length > 0 ? strategicCells : emptyCells;
                const aiMove = targetCells[Math.floor(Math.random() * targetCells.length)];

                this.grid[aiMove.row][aiMove.col] = 1;
                this.ownerGrid[aiMove.row][aiMove.col] = aiPlayerType;
                this.updateCellDisplay(aiMove.row, aiMove.col);
                this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} iniciou nova célula em (${aiMove.row},${aiMove.col}).`);
                this.nextTurn();
                return;
            }

            this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} não encontrou movimentos válidos. Passando o turno.`);
            this.nextTurn();
        },

        getAdjacentCells(row, col) {
            const cells = [];
            this.directions.forEach(dir => {
                const newRow = row + dir[0];
                const newCol = col + dir[1];
                if (newRow >= 0 && newRow < this.boardSize && newCol >= 0 && newCol < this.boardSize) {
                    cells.push({ row: newRow, col: newCol });
                }
            });
            return cells;
        },

        isPlayerDefeated(playerType) {
            for (let r = 0; r < this.boardSize; r++) {
                for (let c = 0; c < this.boardSize; c++) {
                    if (this.ownerGrid[r][c] === playerType && this.grid[r][c] > 0) {
                        return false;
                    }
                }
            }
            return true;
        },

        updatePlayersStatus() {
            this.elements.playersStatus.innerHTML = '';

            this.playersInGame.forEach(player => {
                const isDefeated = this.isPlayerDefeated(player);
                const playerStatus = document.createElement('div');
                playerStatus.className = `player-status ${player} ${isDefeated ? 'defeated' : 'active'}`;
                playerStatus.textContent = `${this.getPlayerDisplayName(player)}: ${isDefeated ? 'Eliminado' : 'Ativo'}`;
                this.elements.playersStatus.appendChild(playerStatus);
            });
        },

        endGame(winner) {
            this.gameStarted = false;
            this.elements.board.classList.add('game-over');

            if (winner) {
                if (winner === 'player') {
                    this.updateMessage('🎉 Parabéns! Você venceu o jogo! 🎉');
                } else {
                    this.updateMessage(`🏆 ${this.getPlayerDisplayName(winner)} venceu o jogo!`);
                }
            } else {
                this.updateMessage('O jogo terminou sem vencedores!');
            }

            const restartBtn = document.createElement('button');
            restartBtn.textContent = 'Jogar Novamente';
            restartBtn.classList.add('restart-btn');
            restartBtn.addEventListener('click', () => {
                this.resetGame();
                this.elements.gameModesContainer.style.display = 'flex';
                this.elements.messageBox.innerHTML = 'Escolha um modo de jogo para começar.';
            });

            this.elements.messageBox.appendChild(restartBtn);
            this.updatePlayersStatus();
        },

        countTerritory(playerType) {
            let count = 0;
            for (let r = 0; r < this.boardSize; r++) {
                for (let c = 0; c < this.boardSize; c++) {
                    if (this.ownerGrid[r][c] === playerType) {
                        count++;
                    }
                }
            }
            return count;
        }
    };

    Game.init();
});
