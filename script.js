document.addEventListener('DOMContentLoaded', () => {
    // Objeto principal do jogo para encapsular toda a lógica
    const Game = {
        boardSize: 8,
        grid: [], // O tabuleiro do jogo, armazenará os pontos das células
        ownerGrid: [], // Armazena o proprietário de cada célula ('player', 'ai', 'ai2', 'none', 'player2')
        gameStarted: false,
        currentPlayer: null, // "player", "ai", "ai2", ou "player2"
        playerBase: null, // Armazena a posição da base do jogador 1 {row, col}
        player2Base: null, // Armazena a posição da base do jogador 2 {row, col}
        ai1Base: null, // Armazena a posição da base da primeira IA {row, col}
        ai2Base: null, // Armazena a posição da base da segunda IA {row, col}
        playersInGame: [], // Lista dos jogadores ativos no modo atual (ex: ["player", "ai"])
        currentMode: null, // "pvai", "pvp", "pvai-ai"
        basesEstablishedCount: 0, // Conta quantas bases foram estabelecidas (para PvP)

        elements: {
            board: document.getElementById('board'),
            messageBox: document.getElementById('message-box'),
            modePvAI: document.getElementById('mode-pvai'),
            modePvP: document.getElementById('mode-pvp'),
            modePvAIAI: document.getElementById('mode-pvai-ai'),
            gameModesContainer: document.getElementById('game-modes')
        },
        // Direções para verificar células adjacentes (Cima, Baixo, Esquerda, Direita)
        directions: [
            [-1, 0], // Cima
            [1, 0],  // Baixo
            [0, -1], // Esquerda
            [0, 1]   // Direita
        ],

        /**
         * Inicializa o jogo.
         */
        init() {
            this.setupModeSelection();
            this.resetGame(); // Prepara o tabuleiro para o início
            this.updateMessage('Escolha um modo de jogo para começar.');
            this.elements.board.style.pointerEvents = 'none'; // Desabilita cliques no tabuleiro inicialmente
            this.setBoardBackground('none'); // Garante que o tabuleiro esteja neutro no início
        },

        /**
         * Configura os event listeners para os botões de seleção de modo de jogo.
         */
        setupModeSelection() {
            this.elements.modePvAI.addEventListener('click', () => this.selectMode('pvai'));
            this.elements.modePvP.addEventListener('click', () => this.selectMode('pvp'));
            this.elements.modePvAIAI.addEventListener('click', () => this.selectMode('pvai-ai'));
        },

        /**
         * Seleciona o modo de jogo e inicia o setup.
         * @param {string} mode - O modo de jogo selecionado ("pvai", "pvp", "pvai-ai").
         */
        selectMode(mode) {
            this.currentMode = mode;
            this.elements.gameModesContainer.style.display = 'none'; // Esconde os botões de modo
            this.resetGame(); // Reseta o jogo para o novo modo

            if (mode === 'pvai') {
                this.playersInGame = ["player", "ai"];
                this.updateMessage('Modo: Jogador vs. IA. Jogador 1: clique em um quadrado para iniciar sua base.');
            } else if (mode === 'pvp') {
                this.playersInGame = ["player", "player2"];
                this.updateMessage('Modo: Jogador vs. Jogador. Jogador 1: clique para iniciar sua base.');
            } else if (mode === 'pvai-ai') {
                this.playersInGame = ["player", "ai", "ai2"];
                this.updateMessage('Modo: Jogador vs IA vs IA. Jogador 1: clique para iniciar sua base.');
            }
            this.elements.board.style.pointerEvents = 'auto'; // Habilita cliques no tabuleiro
            this.setBoardBackground('none'); // Limpa a cor de fundo enquanto as bases são estabelecidas
        },

        // ---------------------------------------------------------------------------------------------
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
        },

        /**
         * Reseta o estado do jogo para um novo início.
         */
        resetGame() {
            this.setupGrid(); // Reinicia os grids de pontos e proprietários
            this.createBoardElements(); // Recria os elementos visuais do tabuleiro
            this.gameStarted = false;
            this.currentPlayer = null;
            this.playerBase = null;
            this.player2Base = null;
            this.ai1Base = null;
            this.ai2Base = null;
            this.basesEstablishedCount = 0;
            this.elements.board.classList.remove('game-over');
            this.updateMessage('');
            this.setBoardBackground('none'); // Garante que o fundo esteja limpo ao resetar
        },

        /**
         * Configura o array 2D que representa o tabuleiro e o grid de proprietários.
         */
        setupGrid() {
            this.grid = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(0));
            this.ownerGrid = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill('none'));
        },

        /**
         * Cria os elementos HTML do tabuleiro (as células).
         */
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

        /**
         * Atualiza a exibição visual de uma célula no tabuleiro.
         * @param {number} row - A linha da célula.
         * @param {number} col - A coluna da célula.
         */
        updateCellDisplay(row, col) {
            const cell = this.elements.board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                const points = this.grid[row][col];
                const owner = this.ownerGrid[row][col];

                cell.textContent = points > 0 ? points : '';

                // Remove todas as classes de estado antes de adicionar as corretas
                cell.classList.remove('active', 'ai-cell', 'ai2-cell', 'base', 'ai-base', 'ai2-base', 'player2-cell', 'player2-base');

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
                    } else if (owner === 'ai') {
                        cell.classList.add('ai-cell');
                        if (this.ai1Base && this.ai1Base.row === row && this.ai1Base.col === col) {
                            cell.classList.add('ai-base');
                        }
                    } else if (owner === 'ai2') {
                        cell.classList.add('ai2-cell');
                        if (this.ai2Base && this.ai2Base.row === row && this.ai2Base.col === col) {
                            cell.classList.add('ai2-base');
                        }
                    }
                }
            }
        },

        /**
         * Atualiza a mensagem exibida ao jogador.
         * @param {string} message - A mensagem a ser exibida.
         */
        updateMessage(message) {
            this.elements.messageBox.textContent = message;
        },

        /**
         * Calcula a distância de Manhattan entre duas células.
         * @param {number} r1 - Linha da primeira célula.
         * @param {number} c1 - Coluna da primeira célula.
         * @param {number} r2 - Linha da segunda célula.
         * @param {number} c2 - Coluna da segunda célula.
         * @returns {number} - A distância de Manhattan.
         */
        getManhattanDistance(r1, c1, r2, c2) {
            return Math.abs(r1 - r2) + Math.abs(c1 - c2);
        },

        /**
         * Inicia a sequência de turnos após todas as bases serem estabelecidas.
         */
        startTurnsSequence() {
            // Posiciona bases da IA se aplicável
            if (this.playersInGame.includes('ai')) {
                this.placeEntityBase('ai');
            }
            if (this.playersInGame.includes('ai2')) {
                this.placeEntityBase('ai2');
            }

            // Escolhe aleatoriamente quem começa entre os jogadores ativos
            this.currentPlayer = this.playersInGame[Math.floor(Math.random() * this.playersInGame.length)];
            this.updateMessage(`Bases estabelecidas! Três jogadores competindo. É a vez de ${this.getPlayerDisplayName(this.currentPlayer)}.`);
            this.gameStarted = true;
            this.setBoardBackground(this.currentPlayer); // Define a cor de fundo para o primeiro jogador

            // Inicia o turno se for de uma IA
            if (this.currentPlayer.startsWith("ai")) {
                setTimeout(() => this.aiTurn(), 1000);
            }
        },

        /**
         * Retorna o nome de exibição para um tipo de jogador.
         * @param {string} playerType - O tipo de jogador ("player", "ai", "ai2", "player2").
         * @returns {string} O nome de exibição.
         */
        getPlayerDisplayName(playerType) {
            switch (playerType) {
                case 'player': return 'Jogador 1';
                case 'player2': return 'Jogador 2';
                case 'ai': return 'IA Vermelha';
                case 'ai2': return 'IA Azul';
                default: return 'Desconhecido';
            }
        },

        /**
         * Posiciona a base inicial de uma entidade (IA ou Player 2 no PvP) a uma distância mínima.
         * @param {string} entityType - "ai", "ai2" ou "player2"
         */
        placeEntityBase(entityType) {
            const minDistance = 4;
            let row, col;
            let validPlacement = false;

            while (!validPlacement) {
                row = Math.floor(Math.random() * this.boardSize);
                col = Math.floor(Math.random() * this.boardSize);

                // Verifica se a posição está vazia
                if (this.ownerGrid[row][col] !== 'none') {
                    continue;
                }

                // Verifica distância de todas as bases já estabelecidas
                let isFarEnough = true;
                if (this.playerBase) {
                    const dist = this.getManhattanDistance(this.playerBase.row, this.playerBase.col, row, col);
                    if (dist < minDistance) isFarEnough = false;
                }
                if (this.player2Base) { // Considera a base do player 2 para IAs também
                    const dist = this.getManhattanDistance(this.player2Base.row, this.player2Base.col, row, col);
                    if (dist < minDistance) isFarEnough = false;
                }
                if (this.ai1Base) {
                    const dist = this.getManhattanDistance(this.ai1Base.row, this.ai1Base.col, row, col);
                    if (dist < minDistance) isFarEnough = false;
                }
                // Não precisa verificar this.ai2Base aqui para 'ai', pois 'ai2' é posterior

                if (isFarEnough) {
                    validPlacement = true;
                }
            }

            this.grid[row][col] = 1;
            this.ownerGrid[row][col] = entityType; // Define o proprietário

            if (entityType === 'ai') {
                this.ai1Base = { row: row, col: col };
            } else if (entityType === 'ai2') {
                this.ai2Base = { row: row, col: col };
            } else if (entityType === 'player2') { // Caso raro se player 2 fosse gerado por AI
                this.player2Base = { row: row, col: col };
            }


            const cellElement = this.elements.board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cellElement) {
                cellElement.classList.add(`${entityType}-base`); // Adiciona classe específica para base
            }
            this.updateCellDisplay(row, col);
        },

        /**
         * Troca o turno para o próximo jogador na sequência e atualiza a cor do tabuleiro.
         */
        nextTurn() {
            let currentIndex = this.playersInGame.indexOf(this.currentPlayer);
            let nextIndex = (currentIndex + 1) % this.playersInGame.length;
            this.currentPlayer = this.playersInGame[nextIndex];

            this.updateMessage(`É a vez de ${this.getPlayerDisplayName(this.currentPlayer)}.`);
            this.setBoardBackground(this.currentPlayer); // Define a cor de fundo para o próximo jogador

            if (this.currentPlayer.startsWith("ai")) {
                setTimeout(() => this.aiTurn(), 1000);
            }
        },

        /**
         * Define a cor de fundo do tabuleiro com base no jogador atual.
         * @param {string} playerType - O tipo de jogador ("player", "player2", "ai", "ai2", "none").
         */
        setBoardBackground(playerType) {
            // Remove todas as classes de turno anteriores
            this.elements.board.classList.remove('board-player-turn', 'board-player2-turn', 'board-ai-turn', 'board-ai2-turn');

            // Adiciona a classe correspondente ao jogador atual
            if (playerType === 'player') {
                this.elements.board.classList.add('board-player-turn');
            } else if (playerType === 'player2') {
                this.elements.board.classList.add('board-player2-turn');
            } else if (playerType === 'ai') {
                this.elements.board.classList.add('board-ai-turn');
            } else if (playerType === 'ai2') {
                this.elements.board.classList.add('board-ai2-turn');
            }
            // Se playerType for 'none' (início do jogo), nenhuma classe é adicionada,
            // e o background padrão #f0f0f0 (definido no CSS) prevalece.
        },


        /**
         * Lida com o evento de clique em uma célula.
         * @param {Event} event - O objeto do evento de clique.
         */
        handleCellClick(event) {
            const row = parseInt(event.target.dataset.row);
            const col = parseInt(event.target.dataset.col);

            if (!this.gameStarted) {
                // FASE DE ESTABELECIMENTO DE BASES
                if (this.currentMode === 'pvp') {
                    if (this.basesEstablishedCount === 0) { // Jogador 1 estabelece base
                        this.grid[row][col] = 1;
                        this.ownerGrid[row][col] = 'player';
                        this.playerBase = { row, col };
                        event.target.classList.add('base');
                        this.updateCellDisplay(row, col);
                        this.basesEstablishedCount++;
                        this.updateMessage('Jogador 2: clique para iniciar sua base.');
                        return; // Não inicia a sequência de turnos ainda
                    } else if (this.basesEstablishedCount === 1) { // Jogador 2 estabelece base
                        if (this.ownerGrid[row][col] !== 'none') { // Não pode iniciar em cima do player 1
                            this.updateMessage('Escolha um quadrado vazio para sua base, Jogador 2.');
                            return;
                        }
                        // Verifica distância mínima para player 2
                        const dist = this.getManhattanDistance(this.playerBase.row, this.playerBase.col, row, col);
                        if (dist < 4) { // DISTÂNCIA MÍNIMA DE 4 BLOCOS TAMBÉM PARA PvP
                            this.updateMessage('Sua base deve estar a pelo menos 4 blocos da base do Jogador 1. Escolha outro lugar.');
                            return;
                        }

                        this.grid[row][col] = 1;
                        this.ownerGrid[row][col] = 'player2';
                        this.player2Base = { row, col };
                        event.target.classList.add('player2-base'); // Adiciona classe visual para Player 2
                        this.updateCellDisplay(row, col);
                        this.basesEstablishedCount++;
                        this.startTurnsSequence(); // Agora sim, inicia a sequência de turnos
                        return;
                    }
                } else { // Modos PvAI e PvAIAI: Jogador 1 estabelece base
                    this.grid[row][col] = 1;
                    this.ownerGrid[row][col] = 'player';
                    this.playerBase = { row, col };
                    event.target.classList.add('base');
                    this.updateCellDisplay(row, col);
                    this.startTurnsSequence(); // Inicia a sequência de turnos
                    return;
                }
            } else {
                // JOGO EM ANDAMENTO
                if (this.currentPlayer.startsWith("ai")) { // Não permite clique se for turno da IA
                    this.updateMessage("Não é sua vez! Espere a IA jogar.");
                    return;
                }

                // Verifica se o clique é na própria célula do jogador atual
                if (this.grid[row][col] > 0 && this.ownerGrid[row][col] === this.currentPlayer) {
                    this.playTurn(row, col, this.currentPlayer);
                } else if (this.ownerGrid[row][col] !== this.currentPlayer && this.ownerGrid[row][col] !== 'none') {
                    this.updateMessage(`Essa célula pertence a ${this.getPlayerDisplayName(this.ownerGrid[row][col])}!`);
                } else {
                    this.updateMessage(`Você só pode interagir com suas células ativas, ${this.getPlayerDisplayName(this.currentPlayer)}.`);
                }
            }
        },

        /**
         * Executa a jogada (seja do jogador ou da IA).
         * @param {number} row - A linha da célula clicada/escolhida.
         * @param {number} col - A coluna da célula clicada/escolhida.
         * @param {string} playerType - "player", "player2", "ai", ou "ai2"
         */
        playTurn(row, col, playerType) {
            this.grid[row][col]++; // Incrementa os pontos
            this.updateCellDisplay(row, col);

            // Regra: se o bloco atingiu 4 pontos, ele se multiplica automaticamente
            // Usa setTimeout para dar um pequeno delay e permitir que a atualização visual seja renderizada
            // antes da explosão, tornando a animação mais visível.
            if (this.grid[row][col] >= 4) {
                setTimeout(() => this.initiateMultiplication(row, col, playerType), 100);
            } else {
                this.updateMessage(`${this.getPlayerDisplayName(playerType)} clicou em (${row},${col}). Pontos: ${this.grid[row][col]}.`);
                this.nextTurn(); // Passa o turno APENAS SE NÃO HOUVER MULTIPLICAÇÃO
            }
        },

        /**
         * Inicia o processo de multiplicação, que pode gerar reações em cadeia.
         * Utiliza uma fila para processar as multiplicações em sequência.
         * @param {number} startRow - A linha da célula que iniciou a multiplicação.
         * @param {number} startCol - A coluna da célula que iniciou a multiplicação.
         * @param {string} playerType - O tipo de jogador que está multiplicando.
         */
        initiateMultiplication(startRow, startCol, playerType) {
            const multiplicationQueue = []; // Fila de células que precisam multiplicar
            const processedCells = new Set(); // Para evitar processar a mesma célula múltiplas vezes na mesma explosão
            let totalAffectedCells = 0; // Para a mensagem final

            // Adiciona a célula inicial à fila
            multiplicationQueue.push({ row: startRow, col: startCol, owner: playerType });
            processedCells.add(`${startRow},${startCol}`);

            // Processa a fila
            const processNextMultiplication = () => {
                if (multiplicationQueue.length === 0) {
                    // Todas as multiplicações em cadeia foram processadas
                    this.updateMessage(`${this.getPlayerDisplayName(playerType)} completou a explosão em cadeia, afetando ${totalAffectedCells} células.`);
                    this.nextTurn(); // Somente passa o turno após todas as explosões terminarem
                    return;
                }

                const currentCell = multiplicationQueue.shift(); // Pega a próxima célula da fila
                const row = currentCell.row;
                const col = currentCell.col;
                const owner = currentCell.owner;

                // Zera os pontos da célula que está se multiplicando
                this.grid[row][col] = 0;
                this.updateCellDisplay(row, col); // Atualiza para mostrar 0

                // Remove a classe 'base' se a célula que multiplicou não for mais a base inicial
                const baseMap = {
                    'player': this.playerBase,
                    'player2': this.player2Base,
                    'ai': this.ai1Base,
                    'ai2': this.ai2Base
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
                        totalAffectedCells++; // Conta cada célula afetada

                        if (this.grid[newRow][newCol] > 0) {
                            // Se a célula adjacente já tem pontos, incrementa E MUDA O DONO SE NECESSÁRIO
                            this.grid[newRow][newCol]++;
                            if (this.ownerGrid[newRow][newCol] !== owner) {
                                this.ownerGrid[newRow][newCol] = owner; // Conquista a célula
                            }
                        } else {
                            // Se a célula adjacente está vazia, cria uma nova com 1 ponto e define o dono
                            this.grid[newRow][newCol] = 1;
                            this.ownerGrid[newRow][newCol] = owner;
                        }
                        this.updateCellDisplay(newRow, newCol);

                        // Se a célula adjacente agora atingiu 4 pontos E AINDA NÃO FOI PROCESSADA nesta cadeia, adicione-a à fila
                        if (this.grid[newRow][newCol] >= 4 && !processedCells.has(cellKey)) {
                            multiplicationQueue.push({ row: newRow, col: newCol, owner: owner });
                            processedCells.add(cellKey); // Marca como processada para evitar loops e duplicações
                        }
                    }
                });

                // Pequeno atraso para visualizar cada "explosão" na cadeia
                setTimeout(processNextMultiplication, 200); // Ajuste este valor para controlar a velocidade da cadeia
            };

            // Inicia o processamento da fila
            processNextMultiplication();
        },


        /**
         * Lógica da jogada da IA.
         * A IA busca uma célula para multiplicar (>=3 pontos) ou para iniciar uma nova cadeia (1 ou 2 pontos).
         * @param {string} aiPlayerType - O tipo de IA ("ai" ou "ai2").
         */
        aiTurn() {
            const aiPlayerType = this.currentPlayer;
            this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} está pensando...`);

            // Encontrar células da IA atual
            let aiCells = [];
            // Encontrar células de todos os oponentes (incluindo outras IAs)
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

            // Prioridade 1: Multiplicar células próprias com 3 pontos
            const potentialMultipliers = aiCells.filter(cell => cell.points === 3);
            if (potentialMultipliers.length > 0) {
                const aiMove = potentialMultipliers[Math.floor(Math.random() * potentialMultipliers.length)];
                this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} está multiplicando em (${aiMove.row},${aiMove.col}).`);
                this.playTurn(aiMove.row, aiMove.col, aiPlayerType);
                return;
            }

            // Prioridade 2: Atacar células inimigas vulneráveis (com 3 pontos)
            const vulnerableEnemies = enemyCells.filter(cell => cell.points === 3);
            if (vulnerableEnemies.length > 0) {
                // Escolher aleatoriamente qual inimigo atacar
                const target = vulnerableEnemies[Math.floor(Math.random() * vulnerableEnemies.length)];

                // Encontrar células próprias adjacentes ao alvo
                const adjacentCells = this.getAdjacentCells(target.row, target.col);
                const adjacentAiCells = adjacentCells.filter(cell =>
                    this.ownerGrid[cell.row][cell.col] === aiPlayerType &&
                    this.grid[cell.row][cell.col] > 0
                );

                if (adjacentAiCells.length > 0) {
                    // Atacar a partir de uma célula adjacente própria
                    const attackFrom = adjacentAiCells[0];
                    this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} está atacando ${this.getPlayerDisplayName(target.owner)} em (${target.row},${target.col}).`);
                    this.playTurn(attackFrom.row, attackFrom.col, aiPlayerType);
                    return;
                }
            }

            // Prioridade 3: Expandir células próprias existentes
            if (aiCells.length > 0) {
                // Ordenar por pontos (mais pontos primeiro)
                aiCells.sort((a, b) => b.points - a.points);
                const aiMove = aiCells[0];
                this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} está expandindo em (${aiMove.row},${aiMove.col}).`);
                this.playTurn(aiMove.row, aiMove.col, aiPlayerType);
                return;
            }

            // Prioridade 4: Iniciar nova célula em posição estratégica
            const emptyCells = [];
            for (let r = 0; r < this.boardSize; r++) {
                for (let c = 0; c < this.boardSize; c++) {
                    if (this.ownerGrid[r][c] === 'none') {
                        emptyCells.push({ row: r, col: c });
                    }
                }
            }

            if (emptyCells.length > 0) {
                // Preferir células próximas a inimigos (para criar conflito entre IAs)
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

            // Se não houver jogadas possíveis
            this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} não encontrou movimentos válidos. Passando o turno.`);
            this.nextTurn();
        },

        // Adicionar esta nova função auxiliar
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

            // Se não há jogadas possíveis, a IA simplesmente passa o turno
            this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} não encontrou movimentos válidos. Passando o turno.`);
            this.nextTurn();
        }
    };

    // Inicia o jogo quando o DOM estiver completamente carregado
    Game.init();
});



css: document.addEventListener('DOMContentLoaded', () => {
    // Objeto principal do jogo para encapsular toda a lógica
    const Game = {
        boardSize: 8,
        grid: [], // O tabuleiro do jogo, armazenará os pontos das células
        ownerGrid: [], // Armazena o proprietário de cada célula ('player', 'ai', 'ai2', 'none', 'player2')
        gameStarted: false,
        currentPlayer: null, // "player", "ai", "ai2", ou "player2"
        playerBase: null, // Armazena a posição da base do jogador 1 {row, col}
        player2Base: null, // Armazena a posição da base do jogador 2 {row, col}
        ai1Base: null, // Armazena a posição da base da primeira IA {row, col}
        ai2Base: null, // Armazena a posição da base da segunda IA {row, col}
        playersInGame: [], // Lista dos jogadores ativos no modo atual (ex: ["player", "ai"])
        currentMode: null, // "pvai", "pvp", "pvai-ai"
        basesEstablishedCount: 0, // Conta quantas bases foram estabelecidas (para PvP)

        elements: {
            board: document.getElementById('board'),
            messageBox: document.getElementById('message-box'),
            modePvAI: document.getElementById('mode-pvai'),
            modePvP: document.getElementById('mode-pvp'),
            modePvAIAI: document.getElementById('mode-pvai-ai'),
            gameModesContainer: document.getElementById('game-modes')
        },
        // Direções para verificar células adjacentes (Cima, Baixo, Esquerda, Direita)
        directions: [
            [-1, 0], // Cima
            [1, 0],  // Baixo
            [0, -1], // Esquerda
            [0, 1]   // Direita
        ],

        /**
         * Inicializa o jogo.
         */
        init() {
            this.setupModeSelection();
            this.resetGame(); // Prepara o tabuleiro para o início
            this.updateMessage('Escolha um modo de jogo para começar.');
            this.elements.board.style.pointerEvents = 'none'; // Desabilita cliques no tabuleiro inicialmente
            this.setBoardBackground('none'); // Garante que o tabuleiro esteja neutro no início
        },

        /**
         * Configura os event listeners para os botões de seleção de modo de jogo.
         */
        setupModeSelection() {
            this.elements.modePvAI.addEventListener('click', () => this.selectMode('pvai'));
            this.elements.modePvP.addEventListener('click', () => this.selectMode('pvp'));
            this.elements.modePvAIAI.addEventListener('click', () => this.selectMode('pvai-ai'));
        },

        /**
         * Seleciona o modo de jogo e inicia o setup.
         * @param {string} mode - O modo de jogo selecionado ("pvai", "pvp", "pvai-ai").
         */
        selectMode(mode) {
            this.currentMode = mode;
            this.elements.gameModesContainer.style.display = 'none'; // Esconde os botões de modo
            this.resetGame(); // Reseta o jogo para o novo modo

            if (mode === 'pvai') {
                this.playersInGame = ["player", "ai"];
                this.updateMessage('Modo: Jogador vs. IA. Jogador 1: clique em um quadrado para iniciar sua base.');
            } else if (mode === 'pvp') {
                this.playersInGame = ["player", "player2"];
                this.updateMessage('Modo: Jogador vs. Jogador. Jogador 1: clique para iniciar sua base.');
            } else if (mode === 'pvai-ai') {
                this.playersInGame = ["player", "ai", "ai2"];
                this.updateMessage('Modo: Jogador vs. IA + IA. Jogador 1: clique para iniciar sua base.');
            }
            this.elements.board.style.pointerEvents = 'auto'; // Habilita cliques no tabuleiro
            this.setBoardBackground('none'); // Limpa a cor de fundo enquanto as bases são estabelecidas
        },

        /**
         * Reseta o estado do jogo para um novo início.
         */
        resetGame() {
            this.setupGrid(); // Reinicia os grids de pontos e proprietários
            this.createBoardElements(); // Recria os elementos visuais do tabuleiro
            this.gameStarted = false;
            this.currentPlayer = null;
            this.playerBase = null;
            this.player2Base = null;
            this.ai1Base = null;
            this.ai2Base = null;
            this.basesEstablishedCount = 0;
            this.elements.board.classList.remove('game-over');
            this.updateMessage('');
            this.setBoardBackground('none'); // Garante que o fundo esteja limpo ao resetar
        },

        /**
         * Configura o array 2D que representa o tabuleiro e o grid de proprietários.
         */
        setupGrid() {
            this.grid = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(0));
            this.ownerGrid = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill('none'));
        },

        /**
         * Cria os elementos HTML do tabuleiro (as células).
         */
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

        /**
         * Atualiza a exibição visual de uma célula no tabuleiro.
         * @param {number} row - A linha da célula.
         * @param {number} col - A coluna da célula.
         */
        updateCellDisplay(row, col) {
            const cell = this.elements.board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                const points = this.grid[row][col];
                const owner = this.ownerGrid[row][col];

                cell.textContent = points > 0 ? points : '';

                // Remove todas as classes de estado antes de adicionar as corretas
                cell.classList.remove('active', 'ai-cell', 'ai2-cell', 'base', 'ai-base', 'ai2-base', 'player2-cell', 'player2-base');

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
                    } else if (owner === 'ai') {
                        cell.classList.add('ai-cell');
                        if (this.ai1Base && this.ai1Base.row === row && this.ai1Base.col === col) {
                            cell.classList.add('ai-base');
                        }
                    } else if (owner === 'ai2') {
                        cell.classList.add('ai2-cell');
                        if (this.ai2Base && this.ai2Base.row === row && this.ai2Base.col === col) {
                            cell.classList.add('ai2-base');
                        }
                    }
                }
            }
        },

        /**
         * Atualiza a mensagem exibida ao jogador.
         * @param {string} message - A mensagem a ser exibida.
         */
        updateMessage(message) {
            this.elements.messageBox.textContent = message;
        },

        /**
         * Calcula a distância de Manhattan entre duas células.
         * @param {number} r1 - Linha da primeira célula.
         * @param {number} c1 - Coluna da primeira célula.
         * @param {number} r2 - Linha da segunda célula.
         * @param {number} c2 - Coluna da segunda célula.
         * @returns {number} - A distância de Manhattan.
         */
        getManhattanDistance(r1, c1, r2, c2) {
            return Math.abs(r1 - r2) + Math.abs(c1 - c2);
        },

        /**
         * Inicia a sequência de turnos após todas as bases serem estabelecidas.
         */
        startTurnsSequence() {
            // Posiciona bases da IA se aplicável
            if (this.playersInGame.includes('ai')) {
                this.placeEntityBase('ai');
            }
            if (this.playersInGame.includes('ai2')) {
                this.placeEntityBase('ai2');
            }

            // Escolhe aleatoriamente quem começa entre os jogadores ativos
            this.currentPlayer = this.playersInGame[Math.floor(Math.random() * this.playersInGame.length)];
            this.updateMessage(`Bases estabelecidas! É a vez de ${this.getPlayerDisplayName(this.currentPlayer)}.`);
            this.gameStarted = true;
            this.setBoardBackground(this.currentPlayer); // Define a cor de fundo para o primeiro jogador

            // Inicia o turno se for de uma IA
            if (this.currentPlayer.startsWith("ai")) {
                setTimeout(() => this.aiTurn(), 1000);
            }
        },

        /**
         * Retorna o nome de exibição para um tipo de jogador.
         * @param {string} playerType - O tipo de jogador ("player", "ai", "ai2", "player2").
         * @returns {string} O nome de exibição.
         */
        getPlayerDisplayName(playerType) {
            switch (playerType) {
                case 'player': return 'Jogador 1';
                case 'player2': return 'Jogador 2';
                case 'ai': return 'IA 1';
                case 'ai2': return 'IA 2';
                default: return 'Desconhecido';
            }
        },

        /**
         * Posiciona a base inicial de uma entidade (IA ou Player 2 no PvP) a uma distância mínima.
         * @param {string} entityType - "ai", "ai2" ou "player2"
         */
        placeEntityBase(entityType) {
            const minDistance = 4;
            let row, col;
            let validPlacement = false;

            while (!validPlacement) {
                row = Math.floor(Math.random() * this.boardSize);
                col = Math.floor(Math.random() * this.boardSize);

                // Verifica se a posição está vazia
                if (this.ownerGrid[row][col] !== 'none') {
                    continue;
                }

                // Verifica distância de todas as bases já estabelecidas
                let isFarEnough = true;
                if (this.playerBase) {
                    const dist = this.getManhattanDistance(this.playerBase.row, this.playerBase.col, row, col);
                    if (dist < minDistance) isFarEnough = false;
                }
                if (this.player2Base) { // Considera a base do player 2 para IAs também
                    const dist = this.getManhattanDistance(this.player2Base.row, this.player2Base.col, row, col);
                    if (dist < minDistance) isFarEnough = false;
                }
                if (this.ai1Base) {
                    const dist = this.getManhattanDistance(this.ai1Base.row, this.ai1Base.col, row, col);
                    if (dist < minDistance) isFarEnough = false;
                }
                // Não precisa verificar this.ai2Base aqui para 'ai', pois 'ai2' é posterior

                if (isFarEnough) {
                    validPlacement = true;
                }
            }

            this.grid[row][col] = 1;
            this.ownerGrid[row][col] = entityType; // Define o proprietário

            if (entityType === 'ai') {
                this.ai1Base = { row: row, col: col };
            } else if (entityType === 'ai2') {
                this.ai2Base = { row: row, col: col };
            } else if (entityType === 'player2') { // Caso raro se player 2 fosse gerado por AI
                this.player2Base = { row: row, col: col };
            }


            const cellElement = this.elements.board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cellElement) {
                cellElement.classList.add(`${entityType}-base`); // Adiciona classe específica para base
            }
            this.updateCellDisplay(row, col);
        },

        /**
         * Troca o turno para o próximo jogador na sequência e atualiza a cor do tabuleiro.
         */
        nextTurn() {
            let currentIndex = this.playersInGame.indexOf(this.currentPlayer);
            let nextIndex = (currentIndex + 1) % this.playersInGame.length;
            this.currentPlayer = this.playersInGame[nextIndex];

            this.updateMessage(`É a vez de ${this.getPlayerDisplayName(this.currentPlayer)}.`);
            this.setBoardBackground(this.currentPlayer); // Define a cor de fundo para o próximo jogador

            if (this.currentPlayer.startsWith("ai")) {
                setTimeout(() => this.aiTurn(), 1000);
            }
        },

        /**
         * Define a cor de fundo do tabuleiro com base no jogador atual.
         * @param {string} playerType - O tipo de jogador ("player", "player2", "ai", "ai2", "none").
         */
        setBoardBackground(playerType) {
            // Remove todas as classes de turno anteriores
            this.elements.board.classList.remove('board-player-turn', 'board-player2-turn', 'board-ai-turn', 'board-ai2-turn');

            // Adiciona a classe correspondente ao jogador atual
            if (playerType === 'player') {
                this.elements.board.classList.add('board-player-turn');
            } else if (playerType === 'player2') {
                this.elements.board.classList.add('board-player2-turn');
            } else if (playerType === 'ai') {
                this.elements.board.classList.add('board-ai-turn');
            } else if (playerType === 'ai2') {
                this.elements.board.classList.add('board-ai2-turn');
            }
            // Se playerType for 'none' (início do jogo), nenhuma classe é adicionada,
            // e o background padrão #f0f0f0 (definido no CSS) prevalece.
        },


        /**
         * Lida com o evento de clique em uma célula.
         * @param {Event} event - O objeto do evento de clique.
         */
        handleCellClick(event) {
            const row = parseInt(event.target.dataset.row);
            const col = parseInt(event.target.dataset.col);

            if (!this.gameStarted) {
                // FASE DE ESTABELECIMENTO DE BASES
                if (this.currentMode === 'pvp') {
                    if (this.basesEstablishedCount === 0) { // Jogador 1 estabelece base
                        this.grid[row][col] = 1;
                        this.ownerGrid[row][col] = 'player';
                        this.playerBase = { row, col };
                        event.target.classList.add('base');
                        this.updateCellDisplay(row, col);
                        this.basesEstablishedCount++;
                        this.updateMessage('Jogador 2: clique para iniciar sua base.');
                        return; // Não inicia a sequência de turnos ainda
                    } else if (this.basesEstablishedCount === 1) { // Jogador 2 estabelece base
                        if (this.ownerGrid[row][col] !== 'none') { // Não pode iniciar em cima do player 1
                            this.updateMessage('Escolha um quadrado vazio para sua base, Jogador 2.');
                            return;
                        }
                        // Verifica distância mínima para player 2
                        const dist = this.getManhattanDistance(this.playerBase.row, this.playerBase.col, row, col);
                        if (dist < 4) { // DISTÂNCIA MÍNIMA DE 4 BLOCOS TAMBÉM PARA PvP
                            this.updateMessage('Sua base deve estar a pelo menos 4 blocos da base do Jogador 1. Escolha outro lugar.');
                            return;
                        }

                        this.grid[row][col] = 1;
                        this.ownerGrid[row][col] = 'player2';
                        this.player2Base = { row, col };
                        event.target.classList.add('player2-base'); // Adiciona classe visual para Player 2
                        this.updateCellDisplay(row, col);
                        this.basesEstablishedCount++;
                        this.startTurnsSequence(); // Agora sim, inicia a sequência de turnos
                        return;
                    }
                } else { // Modos PvAI e PvAIAI: Jogador 1 estabelece base
                    this.grid[row][col] = 1;
                    this.ownerGrid[row][col] = 'player';
                    this.playerBase = { row, col };
                    event.target.classList.add('base');
                    this.updateCellDisplay(row, col);
                    this.startTurnsSequence(); // Inicia a sequência de turnos
                    return;
                }
            } else {
                // JOGO EM ANDAMENTO
                if (this.currentPlayer.startsWith("ai")) { // Não permite clique se for turno da IA
                    this.updateMessage("Não é sua vez! Espere a IA jogar.");
                    return;
                }

                // Verifica se o clique é na própria célula do jogador atual
                if (this.grid[row][col] > 0 && this.ownerGrid[row][col] === this.currentPlayer) {
                    this.playTurn(row, col, this.currentPlayer);
                } else if (this.ownerGrid[row][col] !== this.currentPlayer && this.ownerGrid[row][col] !== 'none') {
                    this.updateMessage(`Essa célula pertence a ${this.getPlayerDisplayName(this.ownerGrid[row][col])}!`);
                } else {
                    this.updateMessage(`Você só pode interagir com suas células ativas, ${this.getPlayerDisplayName(this.currentPlayer)}.`);
                }
            }
        },

        /**
         * Executa a jogada (seja do jogador ou da IA).
         * @param {number} row - A linha da célula clicada/escolhida.
         * @param {number} col - A coluna da célula clicada/escolhida.
         * @param {string} playerType - "player", "player2", "ai", ou "ai2"
         */
        playTurn(row, col, playerType) {
            this.grid[row][col]++; // Incrementa os pontos
            this.updateCellDisplay(row, col);

            // Regra: se o bloco atingiu 4 pontos, ele se multiplica automaticamente
            // Usa setTimeout para dar um pequeno delay e permitir que a atualização visual seja renderizada
            // antes da explosão, tornando a animação mais visível.
            if (this.grid[row][col] >= 4) {
                setTimeout(() => this.initiateMultiplication(row, col, playerType), 100);
            } else {
                this.updateMessage(`${this.getPlayerDisplayName(playerType)} clicou em (${row},${col}). Pontos: ${this.grid[row][col]}.`);
                this.nextTurn(); // Passa o turno APENAS SE NÃO HOUVER MULTIPLICAÇÃO
            }
        },

        /**
         * Inicia o processo de multiplicação, que pode gerar reações em cadeia.
         * Utiliza uma fila para processar as multiplicações em sequência.
         * @param {number} startRow - A linha da célula que iniciou a multiplicação.
         * @param {number} startCol - A coluna da célula que iniciou a multiplicação.
         * @param {string} playerType - O tipo de jogador que está multiplicando.
         */
        initiateMultiplication(startRow, startCol, playerType) {
            const multiplicationQueue = []; // Fila de células que precisam multiplicar
            const processedCells = new Set(); // Para evitar processar a mesma célula múltiplas vezes na mesma explosão
            let totalAffectedCells = 0; // Para a mensagem final

            // Adiciona a célula inicial à fila
            multiplicationQueue.push({ row: startRow, col: startCol, owner: playerType });
            processedCells.add(`${startRow},${startCol}`);

            // Processa a fila
            const processNextMultiplication = () => {
                if (multiplicationQueue.length === 0) {
                    // Todas as multiplicações em cadeia foram processadas
                    this.updateMessage(`${this.getPlayerDisplayName(playerType)} completou a explosão em cadeia, afetando ${totalAffectedCells} células.`);
                    this.nextTurn(); // Somente passa o turno após todas as explosões terminarem
                    return;
                }

                const currentCell = multiplicationQueue.shift(); // Pega a próxima célula da fila
                const row = currentCell.row;
                const col = currentCell.col;
                const owner = currentCell.owner;

                // Zera os pontos da célula que está se multiplicando
                this.grid[row][col] = 0;
                this.updateCellDisplay(row, col); // Atualiza para mostrar 0

                // Remove a classe 'base' se a célula que multiplicou não for mais a base inicial
                const baseMap = {
                    'player': this.playerBase,
                    'player2': this.player2Base,
                    'ai': this.ai1Base,
                    'ai2': this.ai2Base
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
                        totalAffectedCells++; // Conta cada célula afetada

                        if (this.grid[newRow][newCol] > 0) {
                            // Se a célula adjacente já tem pontos, incrementa E MUDA O DONO SE NECESSÁRIO
                            this.grid[newRow][newCol]++;
                            if (this.ownerGrid[newRow][newCol] !== owner) {
                                this.ownerGrid[newRow][newCol] = owner; // Conquista a célula
                            }
                        } else {
                            // Se a célula adjacente está vazia, cria uma nova com 1 ponto e define o dono
                            this.grid[newRow][newCol] = 1;
                            this.ownerGrid[newRow][newCol] = owner;
                        }
                        this.updateCellDisplay(newRow, newCol);

                        // Se a célula adjacente agora atingiu 4 pontos E AINDA NÃO FOI PROCESSADA nesta cadeia, adicione-a à fila
                        if (this.grid[newRow][newCol] >= 4 && !processedCells.has(cellKey)) {
                            multiplicationQueue.push({ row: newRow, col: newCol, owner: owner });
                            processedCells.add(cellKey); // Marca como processada para evitar loops e duplicações
                        }
                    }
                });

                // Pequeno atraso para visualizar cada "explosão" na cadeia
                setTimeout(processNextMultiplication, 200); // Ajuste este valor para controlar a velocidade da cadeia
            };

            // Inicia o processamento da fila
            processNextMultiplication();
        },


        /**
         * Lógica da jogada da IA.
         * A IA busca uma célula para multiplicar (>=3 pontos) ou para iniciar uma nova cadeia (1 ou 2 pontos).
         * @param {string} aiPlayerType - O tipo de IA ("ai" ou "ai2").
         */
        aiTurn() {
            const aiPlayerType = this.currentPlayer;
            this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} está pensando...`);

            let cellsOwnedByAI = [];
            let emptyCells = [];

            for (let r = 0; r < this.boardSize; r++) {
                for (let c = 0; c < this.boardSize; c++) {
                    const points = this.grid[r][c];
                    const owner = this.ownerGrid[r][c];

                    if (owner === aiPlayerType) {
                        if (points > 0) {
                            cellsOwnedByAI.push({ row: r, col: c, points: points });
                        }
                    } else if (owner === 'none') {
                        emptyCells.push({ row: r, col: c });
                    }
                }
            }

            let aiMove = null;

            // Prioridade 1: Multiplicar uma célula (que tenha 3 pontos) da IA
            const potentialMultipliers = cellsOwnedByAI.filter(cell => cell.points === 3);
            if (potentialMultipliers.length > 0) {
                aiMove = potentialMultipliers[Math.floor(Math.random() * potentialMultipliers.length)];
                this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} clicou em (${aiMove.row},${aiMove.col}) para multiplicar.`);
                this.playTurn(aiMove.row, aiMove.col, aiPlayerType);
                return;
            }

            // Prioridade 2: Expandir uma célula existente (com 1 ou 2 pontos) da IA
            if (cellsOwnedByAI.length > 0) {
                cellsOwnedByAI.sort((a, b) => b.points - a.points);
                aiMove = cellsOwnedByAI[0];
                this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} clicou em (${aiMove.row},${aiMove.col}) para expandir.`);
                this.playTurn(aiMove.row, aiMove.col, aiPlayerType);
                return;
            }

            // Prioridade 3: Se não há células para expandir, a IA tenta iniciar uma nova em um espaço vazio estratégico
            let strategicEmptyCells = emptyCells.filter(cell => {
                return this.directions.some(dir => {
                    const adjRow = cell.row + dir[0];
                    const adjCol = cell.col + dir[1];
                    return adjRow >= 0 && adjRow < this.boardSize && adjCol >= 0 && adjCol < this.boardSize && this.ownerGrid[adjRow][adjCol] !== 'none';
                });
            });

            if (strategicEmptyCells.length > 0) {
                aiMove = strategicEmptyCells[Math.floor(Math.random() * strategicEmptyCells.length)];
                this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} iniciou um novo foco em (${aiMove.row},${aiMove.col}).`);
                this.grid[aiMove.row][aiMove.col] = 1;
                this.ownerGrid[aiMove.row][aiMove.col] = aiPlayerType;
                this.updateCellDisplay(aiMove.row, aiMove.col);
                this.nextTurn();
                return;
            } else if (emptyCells.length > 0) { // Se não houver espaços estratégicos, escolhe qualquer vazio
                aiMove = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} iniciou um novo foco em (${aiMove.row},${aiMove.col}).`);
                this.grid[aiMove.row][aiMove.col] = 1;
                this.ownerGrid[aiMove.row][aiMove.col] = aiPlayerType;
                this.updateCellDisplay(aiMove.row, aiMove.col);
                this.nextTurn();
                return;
            }

            // Se não há jogadas possíveis, a IA simplesmente passa o turno
            this.updateMessage(`${this.getPlayerDisplayName(aiPlayerType)} não encontrou movimentos válidos. Passando o turno.`);
            this.nextTurn();
        }
    };

    // Inicia o jogo quando o DOM estiver completamente carregado
    Game.init();
});
