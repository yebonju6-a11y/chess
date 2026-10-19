import React, { useState } from 'react';
import { Chess, Square, Move, PieceSymbol } from 'chess.js';
import { ChessPiece } from './ChessPiece';
import { ThreatAnalysis } from '../utils/chessEngine';

export type BoardTheme = 'wood' | 'emerald' | 'slate';

interface ChessBoardProps {
  game: Chess;
  threats: ThreatAnalysis;
  showThreats: boolean;
  showLegalMoves: boolean;
  theme: BoardTheme;
  isFlipped: boolean;
  lastMove: { from: Square; to: Square } | null;
  hintSquare: { from: Square; to: Square } | null;
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => void;
  disabled?: boolean;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  game,
  threats,
  showThreats,
  showLegalMoves,
  theme,
  isFlipped,
  lastMove,
  hintSquare,
  onMove,
  disabled = false,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Theme color palettes
  const themeColors = {
    wood: {
      light: 'bg-[#F0D9B5]',
      dark: 'bg-[#B58863]',
      lastMove: 'bg-amber-300/40',
      hint: 'bg-blue-400/35 ring-3 ring-blue-500',
    },
    emerald: {
      light: 'bg-[#EEEED2]',
      dark: 'bg-[#769656]',
      lastMove: 'bg-emerald-300/40',
      hint: 'bg-sky-400/35 ring-3 ring-sky-500',
    },
    slate: {
      light: 'bg-[#E2E8F0]',
      dark: 'bg-[#64748B]',
      lastMove: 'bg-indigo-300/40',
      hint: 'bg-cyan-400/35 ring-3 ring-cyan-500',
    },
  }[theme];

  const handleSquareClick = (square: Square) => {
    if (disabled || pendingPromotion) return;

    const piece = game.get(square);
    const currentTurn = game.turn();

    // If a piece is already selected, try to move to clicked square
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      const availableMoves = game.moves({ square: selectedSquare, verbose: true });
      const moveCandidate = availableMoves.find((m) => m.to === square);

      if (moveCandidate) {
        // Check if pawn promotion
        const selectedPiece = game.get(selectedSquare);
        const isPromotion =
          selectedPiece?.type === 'p' &&
          ((selectedPiece.color === 'w' && square[1] === '8') ||
            (selectedPiece.color === 'b' && square[1] === '1'));

        if (isPromotion) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }

        // Standard move
        onMove(selectedSquare, square);
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
    }

    // Select piece if it belongs to current player's turn
    if (piece && piece.color === currentTurn) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true }).map((m) => m.to as Square);
      setLegalMoves(moves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const handlePromotionSelect = (promotedPiece: PieceSymbol) => {
    if (!pendingPromotion) return;
    onMove(pendingPromotion.from, pendingPromotion.to, promotedPiece);
    setPendingPromotion(null);
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  const board = game.board();

  // Create 8x8 squares based on flipped status
  const rows = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="relative w-full max-w-[520px] aspect-square select-none rounded-xl overflow-hidden shadow-lg border-4 border-slate-800/10 bg-slate-900">
      {/* 8x8 Chess Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {rows.map((rIdx) =>
          cols.map((cIdx) => {
            const squareName = (String.fromCharCode(97 + cIdx) + (8 - rIdx)) as Square;
            const piece = board[rIdx][cIdx];
            const isDark = (rIdx + cIdx) % 2 === 1;

            const isSelected = selectedSquare === squareName;
            const isLegalTarget = showLegalMoves && legalMoves.includes(squareName);
            const isLegalCapture = isLegalTarget && piece !== null;
            const isLastMove = lastMove && (lastMove.from === squareName || lastMove.to === squareName);
            const isHint = hintSquare && (hintSquare.from === squareName || hintSquare.to === squareName);
            const isCheckedKing = threats.checks.includes(squareName);
            const isHanging = showThreats && threats.hangingPieces.includes(squareName);

            return (
              <button
                key={squareName}
                onClick={() => handleSquareClick(squareName)}
                disabled={disabled}
                aria-label={squareName}
                className={`relative w-full h-full flex items-center justify-center p-0.5 transition-colors ${
                  isDark ? themeColors.dark : themeColors.light
                } ${isLastMove ? themeColors.lastMove : ''} ${
                  isSelected ? 'ring-3 ring-amber-400/90 z-20 shadow-inner' : ''
                } ${isCheckedKing ? 'bg-red-500/50 ring-4 ring-red-600 animate-pulse' : ''} ${
                  isHint ? themeColors.hint : ''
                }`}
              >
                {/* Edge Coordinate labels */}
                {((!isFlipped && cIdx === 0) || (isFlipped && cIdx === 7)) && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] font-bold leading-none pointer-events-none select-none ${
                      isDark ? 'text-white/60' : 'text-slate-800/60'
                    }`}
                  >
                    {8 - rIdx}
                  </span>
                )}
                {((!isFlipped && rIdx === 7) || (isFlipped && rIdx === 0)) && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] font-bold leading-none pointer-events-none select-none ${
                      isDark ? 'text-white/60' : 'text-slate-800/60'
                    }`}
                  >
                    {String.fromCharCode(97 + cIdx)}
                  </span>
                )}

                {/* Threat / Hanging Radar Highlight for Beginners */}
                {isHanging && (
                  <div
                    className="absolute inset-0.5 rounded-lg border-2 border-rose-500 bg-rose-500/20 pointer-events-none z-10 animate-pulse"
                    title="상대의 공격선상에 노출된 무방비 기물입니다!"
                  />
                )}

                {/* Piece Rendering */}
                {piece && (
                  <div className="w-full h-full flex items-center justify-center transform active:scale-95 transition-transform z-15">
                    <ChessPiece type={piece.type} color={piece.color} />
                  </div>
                )}

                {/* Legal Move indicator (dot for empty, ring for capture) */}
                {isLegalTarget && !isLegalCapture && (
                  <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-600/80 pointer-events-none z-20 ring-2 ring-emerald-300/80 shadow-xs" />
                )}
                {isLegalCapture && (
                  <div className="absolute inset-1 rounded-full border-2 border-rose-500 bg-rose-500/25 pointer-events-none z-20 shadow-xs" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Pawn Promotion Modal Overlay */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 shadow-2xl border border-slate-200 text-center space-y-4 max-w-xs w-full animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h4 className="font-bold text-slate-900 text-base">폰 승급 (Promotion)</h4>
              <p className="text-xs text-slate-500 mt-1">
                폰이 상대 끝선에 도달했습니다! 변신할 기물을 선택하세요.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((pieceType) => {
                const turnColor = game.turn();
                return (
                  <button
                    key={pieceType}
                    onClick={() => handlePromotionSelect(pieceType)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all group"
                  >
                    <div className="w-10 h-10 group-hover:scale-110 transition-transform">
                      <ChessPiece type={pieceType} color={turnColor} />
                    </div>
                    <span className="text-[10px] font-medium text-slate-600 mt-1">
                      {pieceType === 'q' ? '퀸' : pieceType === 'r' ? '룩' : pieceType === 'b' ? '비숍' : '나이트'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
