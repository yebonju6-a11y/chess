import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';

export type AIDifficulty = 1 | 2 | 3;

export interface ThreatAnalysis {
  attackedSquares: Square[];
  hangingPieces: Square[]; // Attacked and not defended
  checks: Square[];
}

export interface CoachHint {
  from: Square;
  to: Square;
  san: string;
  advice: string;
  concept: string; // e.g. "중앙 장악", "기물 구출", "공짜 기물 획득", "체크메이트", "캐슬링"
}

// Piece values in standard chess centipawns
export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

export const KOREAN_PIECE_NAMES: Record<PieceSymbol, string> = {
  p: '폰(Pawn)',
  n: '나이트(Knight)',
  b: '비숍(Bishop)',
  r: '룩(Rook)',
  q: '퀸(Queen)',
  k: '킹(King)',
};

// Positional bonuses encouraging center control and piece development
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

function squareToIndex(sq: Square, color: Color): number {
  const file = sq.charCodeAt(0) - 97; // a=0, h=7
  const rank = parseInt(sq[1], 10) - 1; // 1=0, 8=7
  const r = color === 'w' ? 7 - rank : rank;
  return r * 8 + file;
}

// Evaluate board position from White's perspective
export function evaluateBoard(chess: Chess): number {
  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const sq = (String.fromCharCode(97 + c) + (8 - r)) as Square;
      let val = PIECE_VALUES[piece.type];

      // Positional table
      if (piece.type === 'p') {
        val += PAWN_TABLE[squareToIndex(sq, piece.color)];
      } else if (piece.type === 'n') {
        val += KNIGHT_TABLE[squareToIndex(sq, piece.color)];
      }

      if (piece.color === 'w') {
        score += val;
      } else {
        score -= val;
      }
    }
  }

  return score;
}

// Find threats against the given player's color
export function analyzeThreats(chess: Chess, targetColor: Color): ThreatAnalysis {
  const opponentColor: Color = targetColor === 'w' ? 'b' : 'w';
  const attackedSquares = new Set<Square>();
  const hangingPieces: Square[] = [];
  const checks: Square[] = [];

  // Generate all opponent legal moves
  const currentTurn = chess.turn();

  // If it's opponent's turn, we can inspect their legal moves directly
  let opponentMoves: Move[] = [];
  if (currentTurn === opponentColor) {
    opponentMoves = chess.moves({ verbose: true });
  } else {
    // Clone chess and switch turn safely to test opponent attack lines
    try {
      const fen = chess.fen();
      const fenTokens = fen.split(' ');
      fenTokens[1] = opponentColor;
      // Reset en-passant square if switching turn arbitrarily to avoid invalid FEN
      fenTokens[3] = '-';
      const sim = new Chess(fenTokens.join(' '));
      opponentMoves = sim.moves({ verbose: true });
    } catch {
      opponentMoves = [];
    }
  }

  opponentMoves.forEach((m) => {
    attackedSquares.add(m.to);
    if (m.captured) {
      // An attacked piece
      const targetPiece = chess.get(m.to);
      if (targetPiece && targetPiece.color === targetColor) {
        if (!hangingPieces.includes(m.to)) {
          hangingPieces.push(m.to);
        }
      }
    }
  });

  if (chess.inCheck() && chess.turn() === targetColor) {
    // Find king's square
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === targetColor) {
          checks.push((String.fromCharCode(97 + c) + (8 - r)) as Square);
        }
      }
    }
  }

  return {
    attackedSquares: Array.from(attackedSquares),
    hangingPieces,
    checks,
  };
}

// Beginner Coach Hint Generator
export function getCoachHint(chess: Chess): CoachHint | null {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  const currentTurn = chess.turn();
  const isWhite = currentTurn === 'w';

  // 1. Check for immediate checkmate (1수 체크메이트)
  for (const move of moves) {
    chess.move(move);
    const isMate = chess.isCheckmate();
    chess.undo();
    if (isMate) {
      return {
        from: move.from,
        to: move.to,
        san: move.san,
        advice: `상대 킹을 외통수(체크메이트)로 몰아 즉시 승리할 수 있는 결정적인 수입니다!`,
        concept: '체크메이트',
      };
    }
  }

  // 2. Escape check if currently checked
  if (chess.inCheck()) {
    // Choose move that protects or moves king out of danger
    const move = moves[0];
    return {
      from: move.from,
      to: move.to,
      san: move.san,
      advice: `킹이 체크 상태입니다! 공격선상에서 피하거나 말을 막아서 킹을 지키세요.`,
      concept: '킹 보호',
    };
  }

  // 3. Capture high-value hanging piece (상대 무방비 기물 포획)
  const captureMoves = moves.filter((m) => m.captured);
  if (captureMoves.length > 0) {
    // Sort by captured piece value
    captureMoves.sort((a, b) => {
      const valA = a.captured ? PIECE_VALUES[a.captured] : 0;
      const valB = b.captured ? PIECE_VALUES[b.captured] : 0;
      return valB - valA;
    });

    const bestCap = captureMoves[0];
    const capName = bestCap.captured ? KOREAN_PIECE_NAMES[bestCap.captured] : '기물';
    return {
      from: bestCap.from,
      to: bestCap.to,
      san: bestCap.san,
      advice: `상대의 ${capName}을(를) 무료 또는 이득으로 잡을 수 있는 절호의 찬스입니다!`,
      concept: '기물 이득',
    };
  }

  // 4. Castling recommendation (킹의 안전 확보)
  const castleMove = moves.find((m) => m.san.includes('O-O'));
  if (castleMove) {
    return {
      from: castleMove.from,
      to: castleMove.to,
      san: castleMove.san,
      advice: `캐슬링을 실행하여 킹을 안전한 구석으로 피신시키고 룩을 중앙으로 연결하세요.`,
      concept: '캐슬링',
    };
  }

  // 5. Opening development (나이트, 비숍 전개 & 중앙 폰)
  if (chess.history().length < 12) {
    const centerPawns = moves.filter(
      (m) => m.piece === 'p' && (m.to === 'e4' || m.to === 'd4' || m.to === 'e5' || m.to === 'd5')
    );
    if (centerPawns.length > 0) {
      return {
        from: centerPawns[0].from,
        to: centerPawns[0].to,
        san: centerPawns[0].san,
        advice: `중앙(d/e열) 폰을 전진시켜 보드의 중심을 장악하고 다른 기물의 길을 열어주세요.`,
        concept: '중앙 장악',
      };
    }

    const minorMoves = moves.filter(
      (m) => (m.piece === 'n' || m.piece === 'b') && !['a3', 'h3', 'a6', 'h6'].includes(m.to)
    );
    if (minorMoves.length > 0) {
      const pick = minorMoves[0];
      const pName = KOREAN_PIECE_NAMES[pick.piece];
      return {
        from: pick.from,
        to: pick.to,
        san: pick.san,
        advice: `${pName}을(를) 중앙 쪽으로 전개하여 활동성을 극대화하세요.`,
        concept: '기물 전개',
      };
    }
  }

  // 6. Best general positional move via minimax
  let bestMove = moves[0];
  let bestScore = isWhite ? -Infinity : Infinity;

  for (const move of moves) {
    chess.move(move);
    const score = evaluateBoard(chess);
    chess.undo();

    if (isWhite ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return {
    from: bestMove.from,
    to: bestMove.to,
    san: bestMove.san,
    advice: `기물의 위치를 개선하고 상대의 침투를 방어하기에 가장 안정적인 수입니다.`,
    concept: '포지션 개선',
  };
}

// AI Move Selector for the 3 Beginner Difficulties
export function getAIMove(chess: Chess, difficulty: AIDifficulty): Move | null {
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  const aiColor = chess.turn();
  const isWhite = aiColor === 'w';

  // Level 1: Novice Bot (새싹 비기너)
  // Prone to gentle blunders so beginner can practice capturing and winning!
  if (difficulty === 1) {
    // 40% chance of random legal move (creates beginner openings & chances)
    if (Math.random() < 0.4) {
      const randIdx = Math.floor(Math.random() * legalMoves.length);
      return legalMoves[randIdx];
    }

    // Otherwise prefer captures or simple forward moves
    const captures = legalMoves.filter((m) => m.captured);
    if (captures.length > 0 && Math.random() < 0.7) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  // Level 2: Casual Bot (초보자 봇)
  // Plays sensible moves: takes free pieces, defends when checked, checks when possible
  if (difficulty === 2) {
    // Checkmate if possible
    for (const move of legalMoves) {
      chess.move(move);
      const isMate = chess.isCheckmate();
      chess.undo();
      if (isMate) return move;
    }

    // Best immediate capture
    const captureMoves = legalMoves.filter((m) => m.captured);
    if (captureMoves.length > 0) {
      captureMoves.sort((a, b) => {
        const valA = a.captured ? PIECE_VALUES[a.captured] : 0;
        const valB = b.captured ? PIECE_VALUES[b.captured] : 0;
        return valB - valA;
      });
      // 80% pick the best capture
      if (Math.random() < 0.8) {
        return captureMoves[0];
      }
    }

    // Evaluate 1 ply
    let best = legalMoves[0];
    let bestScore = isWhite ? -Infinity : Infinity;

    for (const move of legalMoves) {
      chess.move(move);
      const score = evaluateBoard(chess);
      chess.undo();

      if (isWhite ? score > bestScore : score < bestScore) {
        bestScore = score;
        best = move;
      }
    }
    return best;
  }

  // Level 3: Intermediate Bot (체스 동아리 선배)
  // 2-ply minimax with alpha-beta pruning
  let best = legalMoves[0];
  let bestScore = isWhite ? -Infinity : Infinity;

  for (const move of legalMoves) {
    chess.move(move);
    let worstReplyScore = isWhite ? Infinity : -Infinity;
    const replies = chess.moves({ verbose: true });

    if (replies.length === 0) {
      if (chess.isCheckmate()) {
        worstReplyScore = isWhite ? 50000 : -50000;
      } else {
        worstReplyScore = 0; // Stalemate
      }
    } else {
      for (const reply of replies) {
        chess.move(reply);
        const score = evaluateBoard(chess);
        chess.undo();

        if (isWhite) {
          if (score < worstReplyScore) worstReplyScore = score;
        } else {
          if (score > worstReplyScore) worstReplyScore = score;
        }
      }
    }

    chess.undo();

    if (isWhite) {
      if (worstReplyScore > bestScore) {
        bestScore = worstReplyScore;
        best = move;
      }
    } else {
      if (worstReplyScore < bestScore) {
        bestScore = worstReplyScore;
        best = move;
      }
    }
  }

  return best;
}

// Material advantage calculator & captured pieces breakdown
export interface MaterialBreakdown {
  whiteScore: number;
  blackScore: number;
  diff: number; // >0 means white leads, <0 means black leads
  capturedByWhite: PieceSymbol[]; // Black pieces taken by white
  capturedByBlack: PieceSymbol[]; // White pieces taken by black
}

export function calculateMaterial(chess: Chess): MaterialBreakdown {
  const STARTING_COUNT: Record<PieceSymbol, number> = {
    p: 8,
    n: 2,
    b: 2,
    r: 2,
    q: 1,
    k: 1,
  };

  const currentWhite: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const currentBlack: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        if (piece.color === 'w') {
          currentWhite[piece.type]++;
        } else {
          currentBlack[piece.type]++;
        }
      }
    }
  }

  const capturedByWhite: PieceSymbol[] = [];
  const capturedByBlack: PieceSymbol[] = [];

  const pieceOrder: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p'];

  pieceOrder.forEach((type) => {
    // White took black pieces
    const blackLost = STARTING_COUNT[type] - currentBlack[type];
    for (let i = 0; i < blackLost; i++) {
      capturedByWhite.push(type);
    }

    // Black took white pieces
    const whiteLost = STARTING_COUNT[type] - currentWhite[type];
    for (let i = 0; i < whiteLost; i++) {
      capturedByBlack.push(type);
    }
  });

  const pieceWeights: Record<PieceSymbol, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
  };

  let whiteScore = 0;
  let blackScore = 0;

  capturedByWhite.forEach((t) => (whiteScore += pieceWeights[t]));
  capturedByBlack.forEach((t) => (blackScore += pieceWeights[t]));

  return {
    whiteScore,
    blackScore,
    diff: whiteScore - blackScore,
    capturedByWhite,
    capturedByBlack,
  };
}
